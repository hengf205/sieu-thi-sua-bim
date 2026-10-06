const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const PORT = 5000;
const PUBLIC_DIR = __dirname;
const DB_FILE = path.join(PUBLIC_DIR, 'db.json');

let sseClients = [];
let onlineUrl = '';

// Helper to get local Wi-Fi / LAN IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const LOCAL_IP = getLocalIp();

function updateNetworkConfig() {
  const networkConfig = `
    window.POS_NETWORK_IP = "${LOCAL_IP}";
    window.POS_NETWORK_PORT = ${PORT};
    window.POS_ONLINE_URL = "${onlineUrl}";
  `;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'js', 'network-config.js'), networkConfig);
}

updateNetworkConfig();

// Initialize db.json if not exists
if (!fs.existsSync(DB_FILE)) {
  const initialDb = {
    cat: [],
    prod: [],
    ord: [],
    set: {
      name: 'Siêu thị Sữa Bỉm Hoàng Nam',
      addr: '123 Đường Bán Hàng, Q.1, TP.HCM',
      phone: '0987 654 321',
      footer: 'Cảm ơn quý khách và hẹn gặp lại!',
      adminPass: '1234'
    },
    seq: {}
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
}

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch (e) { return {}; }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    notifySseClients();
  } catch (e) { console.error('Error writing DB:', e); }
}

function notifySseClients() {
  const payload = `data: ${JSON.stringify({ type: 'sync', timestamp: Date.now() })}\n\n`;
  sseClients.forEach(res => res.write(payload));
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- API ENDPOINTS ---
  if (reqUrl === '/api/data' && req.method === 'GET') {
    const data = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(data));
  }

  if (reqUrl === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        writeDb(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', updated: Date.now() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  if (reqUrl === '/api/sync-stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 2000\n\n');
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
    return;
  }

  // --- STATIC FILES ---
  if (reqUrl === '/') reqUrl = '/index.html';
  let filePath = path.join(PUBLIC_DIR, decodeURIComponent(reqUrl));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404 Not Found</h1>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`HOÀNG NAM POS CENTRAL API SERVER STARTED!`);
  console.log(`- PC Desktop App: http://localhost:${PORT}`);
  console.log(`- Wi-Fi Network:  http://${LOCAL_IP}:${PORT}`);
  console.log(`====================================================`);

  // Start localtunnel for 4G/5G / Internet Access anywhere
  try {
    const lt = spawn('npx', ['--yes', 'localtunnel', '--port', PORT], { shell: true });
    lt.stdout.on('data', (data) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
      if (match) {
        onlineUrl = match[0];
        console.log(`- 4G/5G Internet Link: ${onlineUrl}/quan-tri.html`);
        updateNetworkConfig();
        notifySseClients();
      }
    });
  } catch (e) {
    console.log('[Tunnel] Could not start localtunnel automatically');
  }

  const appUrl = `http://localhost:${PORT}`;
  const chromeWin = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app="${appUrl}" --start-maximized`;
  const chromeX86 = `"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --app="${appUrl}" --start-maximized`;
  const edgeWin = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --app="${appUrl}" --start-maximized`;

  exec(chromeWin, (err) => {
    if (err) {
      exec(chromeX86, (err2) => {
        if (err2) {
          exec(edgeWin, (err3) => {
            if (err3) {
              exec(`start "" "${appUrl}"`);
            }
          });
        }
      });
    }
  });
});

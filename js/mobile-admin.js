/* ====================================================
   MOBILE ADMIN LOGIC – MOBILE-ADMIN.JS
   ==================================================== */

let editProdId = null;
let mImgData = '';
let mWChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await DB.fetchFromServer();
  DB.seed();

  initMobileNav();
  initMobileAuth();
  initMobileCamera();

  // Listen for real-time changes from PC or other phones
  DB.initRealtimeSync(() => {
    toast('⚡ Đã đồng bộ dữ liệu mới nhất với Máy tính!', 'i');
    refreshMobileUI();
  });

  refreshMobileUI();
});

/* ---- Navigation ---- */
function initMobileNav() {
  document.querySelectorAll('.m-nav-item').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.m-nav-item').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.m-page').forEach(x => x.classList.remove('active'));

      btn.classList.add('active');
      const pageId = `mpage-${btn.dataset.mp}`;
      document.getElementById(pageId).classList.add('active');

      if (btn.dataset.mp === 'dash') renderMDash();
      if (btn.dataset.mp === 'prods') renderMProds();
      if (btn.dataset.mp === 'orders') renderMOrders();
      if (btn.dataset.mp === 'settings') loadMSettings();
    };
  });
}

/* ---- Auth Gate ---- */
function initMobileAuth() {
  const gate = document.getElementById('mGateOverlay');
  if (sessionStorage.getItem('pos_m_auth')) {
    gate.style.display = 'none';
  } else {
    gate.style.display = 'flex';
  }

  document.getElementById('btnMGateUnlock').onclick = () => {
    const val = document.getElementById('mGatePass').value;
    let stored = '1234';
    try {
      const s = DB.getSet();
      if (s?.adminPass) stored = s.adminPass;
    } catch {}

    if (val === stored) {
      sessionStorage.setItem('pos_m_auth', 'ok');
      gate.style.display = 'none';
      toast('Đăng nhập thành công!', 's');
      refreshMobileUI();
    } else {
      document.getElementById('mGateErr').textContent = '❌ Mật khẩu không đúng!';
      document.getElementById('mGatePass').value = '';
    }
  };
}

/* ---- Camera Photo Upload ---- */
function initMobileCamera() {
  const imgFile = document.getElementById('mImgFile');
  imgFile.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast('Ảnh quá lớn! Tối đa 2MB', 'e'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      mImgData = ev.target.result;
      showMImgPrev(mImgData);
    };
    reader.readAsDataURL(f);
  };
}

function showMImgPrev(src) {
  const prev = document.getElementById('mImgPreview');
  if (src) {
    prev.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover"/>`;
  } else {
    prev.innerHTML = `<i class="fas fa-camera" style="font-size:2rem;color:#94a3b8"></i><p style="font-size:.75rem">Chụp ảnh / Chọn ảnh</p>`;
  }
}

/* ---- UI Refresh ---- */
function refreshMobileUI() {
  renderMDash();
  renderMProds();
  renderMOrders();
  loadMSettings();
}

/* ---- Dashboard ---- */
function renderMDash() {
  const ords = DB.getOrds();
  const td = new Date().toISOString().slice(0, 10);
  const nm = new Date();
  const ym = `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`;

  const todayOrds = ords.filter(o => o.at.slice(0, 10) === td);
  document.getElementById('mdToday').textContent = fmt(todayOrds.reduce((s, o) => s + o.total, 0));
  document.getElementById('mdOrders').textContent = todayOrds.length;
  document.getElementById('mdMonth').textContent = fmt(ords.filter(o => o.at.startsWith(ym)).reduce((s, o) => s + o.total, 0));
  document.getElementById('mdProds').textContent = DB.getProds().length;

  // Render recent 5 orders
  const recEl = document.getElementById('mRecentOrders');
  const recent = ords.slice().reverse().slice(0, 5);
  recEl.innerHTML = !recent.length ? '<p style="color:#94a3b8;font-size:.8rem;text-align:center">Chưa có đơn hàng</p>' :
    recent.map(o => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.8rem">
        <div><strong>${o.code}</strong> <small style="color:#94a3b8">${dtStr(o.at)}</small></div>
        <div style="font-weight:800;color:#34d399">${fmt(o.total)}</div>
      </div>
    `).join('');

  // Weekly Chart
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
    data.push(ords.filter(o => o.at.slice(0, 10) === ds).reduce((s, o) => s + o.total, 0));
  }
  const ctx = document.getElementById('mChartWeekly').getContext('2d');
  if (mWChart) mWChart.destroy();
  mWChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Doanh thu', data, backgroundColor: 'rgba(96,165,250,.8)', borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8', callback: v => fmtSh(v) } }, x: { ticks: { color: '#94a3b8' } } } } });
}

/* ---- Products ---- */
function renderMProds() {
  const q = (document.getElementById('mProdSearch')?.value || '').toLowerCase();
  let prods = DB.getProds();

  if (q) {
    prods = prods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }

  const list = document.getElementById('mProdList');
  list.innerHTML = !prods.length ? '<p style="text-align:center;color:#94a3b8;padding:20px">Không tìm thấy sản phẩm nào</p>' :
    prods.map(p => {
      const imgSrc = p.img || '';
      const thumb = imgSrc ? `<img src="${imgSrc}"/>` : `<i class="fas fa-box"></i>`;
      return `
        <div class="m-prod-item" onclick="openMProdModal(${p.id})">
          <div class="m-prod-thumb">${thumb}</div>
          <div class="m-prod-info">
            <div class="m-prod-name">${p.name}</div>
            <div class="m-prod-sub">
              <span>Tồn: <strong>${p.stock || 0} ${p.unit || ''}</strong></span>
              <span>Mã vạch: ${p.barcode || '—'}</span>
            </div>
          </div>
          <div class="m-prod-price">${fmt(p.price)}</div>
        </div>
      `;
    }).join('');

  document.getElementById('mProdSearch').oninput = renderMProds;
}

function openMProdModal(id = null) {
  editProdId = id;
  mImgData = '';
  document.getElementById('mProdModalTitle').textContent = id ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới';

  if (id) {
    const p = DB.getProd(id); if (!p) return;
    document.getElementById('mfName').value = p.name;
    document.getElementById('mfBarcode').value = p.barcode || '';
    document.getElementById('mfCost').value = p.cost || 0;
    document.getElementById('mfPrice').value = p.price;
    document.getElementById('mfStock').value = p.stock || 0;
    document.getElementById('mfUnit').value = p.unit || '';
    mImgData = p.img || '';
    showMImgPrev(mImgData);
  } else {
    document.getElementById('mfName').value = '';
    document.getElementById('mfBarcode').value = '';
    document.getElementById('mfCost').value = 0;
    document.getElementById('mfPrice').value = 0;
    document.getElementById('mfStock').value = 0;
    document.getElementById('mfUnit').value = '';
    showMImgPrev('');
  }

  document.getElementById('modalMProd').classList.add('open');
}

function saveMProd() {
  const name = document.getElementById('mfName').value.trim();
  const price = parseFloat(document.getElementById('mfPrice').value) || 0;
  if (!name) { toast('Nhập tên sản phẩm!', 'e'); return; }
  if (!price) { toast('Nhập giá bán!', 'e'); return; }

  const cats = DB.getCats();
  const defaultCatId = cats.length ? cats[0].id : 1;

  const data = {
    name,
    barcode: document.getElementById('mfBarcode').value.trim(),
    cost: parseFloat(document.getElementById('mfCost').value) || 0,
    price,
    stock: parseInt(document.getElementById('mfStock').value) || 0,
    unit: document.getElementById('mfUnit').value.trim(),
    img: mImgData,
    catId: defaultCatId,
    status: 'active'
  };

  if (editProdId) {
    const existing = DB.getProd(editProdId);
    data.code = existing.code;
    data.catId = existing.catId;
    DB.updProd(editProdId, data);
    toast('✅ Cập nhật & Đã đồng bộ lên Máy tính!', 's');
  } else {
    DB.addProd(data);
    toast('✅ Thêm sản phẩm & Đã đồng bộ lên Máy tính!', 's');
  }

  document.getElementById('modalMProd').classList.remove('open');
  renderMProds();
}

/* ---- Orders ---- */
function renderMOrders() {
  const ords = DB.getOrds().slice().reverse();
  const list = document.getElementById('mOrderList');
  list.innerHTML = !ords.length ? '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có đơn hàng</p>' :
    ords.map(o => `
      <div class="m-card" style="margin-bottom:10px">
        <div class="m-card-title">
          <span>${o.code}</span>
          <span style="color:#34d399">${fmt(o.total)}</span>
        </div>
        <div style="font-size:.78rem;color:#94a3b8">
          ${dtStr(o.at)} • ${o.items.length} SP (${o.items.reduce((s, i) => s + i.qty, 0)} cái)
        </div>
      </div>
    `).join('');
}

/* ---- Settings ---- */
function loadMSettings() {
  const s = DB.getSet();
  document.getElementById('msTen').value = s.name || '';
  document.getElementById('msDiaChi').value = s.addr || '';
  document.getElementById('msDT').value = s.phone || '';
  document.getElementById('msPass').value = s.adminPass || '1234';
}

function saveMSettings() {
  const s = DB.getSet();
  s.name = document.getElementById('msTen').value.trim();
  s.addr = document.getElementById('msDiaChi').value.trim();
  s.phone = document.getElementById('msDT').value.trim();
  DB.saveSet(s);
  toast('Đã lưu & đồng bộ lên máy tính!', 's');
}

function saveMPass() {
  const pass = document.getElementById('msPass').value.trim();
  if (!pass) { toast('Nhập mật khẩu mới!', 'e'); return; }
  const s = DB.getSet();
  s.adminPass = pass;
  DB.saveSet(s);
  toast('Đã đổi mật khẩu & đồng bộ!', 's');
}

/* ---- Helpers ---- */
function toast(msg, type = 's', ms = 2500) {
  const w = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-txt">${msg}</span>`;
  w.appendChild(t);
  setTimeout(() => { t.style.animation = 'tIn .25s ease reverse'; setTimeout(() => t.remove(), 250); }, ms);
}

const fmt = n => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const fmtSh = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'tr' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : n;
const dtStr = iso => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

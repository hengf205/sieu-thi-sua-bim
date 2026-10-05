const fs = require('fs');
const path = require('path');

// Simple PNG generator for POS Icon (blue background with gold/white store symbol)
function createSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#1e293b"/>
    <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.2}" fill="none" stroke="#2563eb" stroke-width="${size * 0.03}"/>
    <circle cx="${size * 0.5}" cy="${size * 0.42}" r="${size * 0.26}" fill="#2563eb"/>
    <path d="M${size * 0.35} ${size * 0.38} L${size * 0.45} ${size * 0.48} L${size * 0.65} ${size * 0.3}" fill="none" stroke="#ffffff" stroke-width="${size * 0.06}" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${size * 0.5}" y="${size * 0.8}" font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.13}" fill="#60a5fa" text-anchor="middle">HOÀNG NAM POS</text>
  </svg>`;
}

const dir = 'd:/Users/ASUS/Downloads/Siêu thị sữa bỉm Hoàng Nam/icons';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'icon.svg'), createSvgIcon(512));
console.log('SVG Icon created!');

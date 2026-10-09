/* PWA setup and platform-specific Home Screen install guidance. */
let deferredInstallPrompt = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const installStyles = document.createElement('style');
installStyles.textContent = `
  .ios-install-floating{position:fixed;z-index:9990;right:14px;bottom:calc(18px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:9px;padding:12px 16px;border:0;border-radius:999px;background:#2563eb;color:#fff;font:600 14px system-ui,-apple-system,sans-serif;box-shadow:0 8px 24px #0f172a55}
  .ios-install-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:#0f172a99;backdrop-filter:blur(5px)}
  .ios-install-card{position:relative;width:min(100%,440px);max-height:88vh;overflow:auto;padding:28px 24px 22px;border-radius:22px;background:#fff;color:#172033;font:16px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 24px 70px #0004}
  .ios-install-card h2{padding-right:20px;margin:0 0 10px;font-size:22px;line-height:1.25}
  .ios-install-card p{margin:10px 0;color:#526174}
  .ios-install-card ol{padding-left:23px;margin:16px 0}
  .ios-install-card li{padding:5px 0}
  .ios-install-icon{display:grid;place-items:center;width:48px;height:48px;margin-bottom:14px;border-radius:14px;background:#eaf1ff;color:#2563eb;font-size:32px;font-weight:500}
  .ios-install-close{position:absolute;top:14px;right:16px;border:0;background:transparent;color:#64748b;font-size:28px;line-height:1}
  .ios-share-symbol{display:inline-grid;place-items:center;width:22px;height:22px;margin:0 3px;border:2px solid #2563eb;border-radius:6px;color:#2563eb;font-weight:700;line-height:1}
  .ios-install-card .ios-install-note{padding:10px 12px;border-radius:10px;background:#f1f5f9;font-size:14px}
  .ios-install-done{width:100%;margin-top:8px;padding:13px;border:0;border-radius:12px;background:#2563eb;color:#fff;font:700 16px system-ui,-apple-system,sans-serif}
  @media(min-width:700px){.ios-install-floating{right:24px;bottom:24px}}
`;
document.head.appendChild(installStyles);

if ('serviceWorker' in navigator) {
  if (window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] ServiceWorker registered:', reg.scope))
        .catch((err) => console.log('[PWA] ServiceWorker registration failed:', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}

function showIOSInstallHelp() {
  let dialog = document.getElementById('iosInstallHelp');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'iosInstallHelp';
    dialog.innerHTML = `
      <div class="ios-install-backdrop" data-ios-install-close>
        <section class="ios-install-card" role="dialog" aria-modal="true" aria-labelledby="iosInstallTitle">
          <button class="ios-install-close" type="button" aria-label="Đóng" data-ios-install-close>×</button>
          <div class="ios-install-icon">＋</div>
          <h2 id="iosInstallTitle">Thêm Hoàng Nam POS vào màn hình chính</h2>
          <p>iPhone cần thao tác xác nhận trong Safari. Làm lần lượt như sau:</p>
          <ol>
            <li>Mở trang này bằng <strong>Safari</strong> trên iPhone.</li>
            <li>Chạm nút <strong>Chia sẻ</strong> <span class="ios-share-symbol" aria-label="Chia sẻ">↑</span> trên thanh công cụ.</li>
            <li>Cuộn danh sách, chọn <strong>Thêm vào Màn hình chính</strong>.</li>
            <li>Bật <strong>Mở dưới dạng ứng dụng web</strong> nếu thấy tùy chọn, rồi chạm <strong>Thêm</strong>.</li>
          </ol>
          <p class="ios-install-note">Nếu chưa thấy mục này, cuộn xuống cuối bảng chia sẻ và chọn “Sửa tác vụ”.</p>
          <button class="ios-install-done" type="button" data-ios-install-close>Đã hiểu</button>
        </section>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-ios-install-close]')) dialog.remove();
    });
  }
}

function addIOSInstallButton() {
  if (!isIOS || isStandalone) return;
  const existing = document.getElementById('btnPwaInstall');
  if (existing) {
    existing.style.display = 'inline-flex';
    existing.innerHTML = '<i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i> Thêm vào màn hình chính';
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ios-install-floating';
  button.innerHTML = '<i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i><span>Thêm vào màn hình chính</span>';
  button.addEventListener('click', showIOSInstallHelp);
  document.body.appendChild(button);
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const button = document.getElementById('btnPwaInstall');
  if (button) button.style.display = 'inline-flex';
});

function triggerPwaInstall() {
  if (isIOS) {
    showIOSInstallHelp();
  } else if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => {
      deferredInstallPrompt = null;
      const button = document.getElementById('btnPwaInstall');
      if (button) button.style.display = 'none';
    });
  } else {
    alert('Để thêm ứng dụng, hãy mở menu của trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addIOSInstallButton, { once: true });
} else {
  addIOSInstallButton();
}

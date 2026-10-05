/* ====================================================
   PWA REGISTER & FULLSCREEN LOGIC (SAFE FILE:// & HTTP://)
   ==================================================== */

let deferredInstallPrompt = null;

// Only register Service Worker on http:// or https:// protocol (not file:///)
if ('serviceWorker' in navigator) {
  if (window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] ServiceWorker registered:', reg.scope))
        .catch((err) => console.log('[PWA] ServiceWorker registration failed:', err));
    });
  } else {
    // If running from file:///, unregister any leftover service workers immediately
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister().then(() => {
          console.log('[PWA] Cleared service worker on file:///');
        });
      }
    });
  }
}

// Capture Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btnInstall = document.getElementById('btnPwaInstall');
  if (btnInstall) {
    btnInstall.style.display = 'inline-flex';
  }
});

function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      }
      deferredInstallPrompt = null;
      const btnInstall = document.getElementById('btnPwaInstall');
      if (btnInstall) btnInstall.style.display = 'none';
    });
  } else {
    alert('Hướng dẫn cài đặt App:\n- Trình duyệt Chrome/Edge/Cốc Cốc: Nhấn vào biểu tượng ⊕ (hoặc ba chấm ⋮) ở góc trên bên phải thanh địa chỉ -> Chọn "Cài đặt ứng dụng" (Install App).\n- Điện thoại Android / iPhone: Chọn Thêm vào Màn hình chính (Add to Home Screen).');
  }
}

// Fullscreen Toggle
function toggleFullScreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

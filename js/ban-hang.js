/* ====================================================
   POS CASHIER LOGIC – BAN-HANG.JS
   ==================================================== */

let cart = [];
let payMethod = 'cash';
let confirmCb = null;

document.addEventListener('DOMContentLoaded', () => {
  DB.seed();
  initClock();
  loadStoreInfo();
  refreshCatBar();
  renderProdGrid();
  initScannerAndSearch();
  initCartListeners();
  initModals();
  DB.fetchFromServer().then(loaded => {
    if (!loaded) return;
    refreshCatBar();
    renderProdGrid();
  });
  DB.initRealtimeSync(() => {
    loadStoreInfo();
    refreshCatBar();
    renderProdGrid();
  });
});

/* ---- Clock ---- */
function initClock() {
  const el = document.getElementById('posClock');
  const update = () => {
    el.textContent = new Date().toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };
  update();
  setInterval(update, 1000);
}

/* ---- Store Info ---- */
function loadStoreInfo() {
  const s = DB.getSet();
  if (s && s.name) {
    document.getElementById('storeNameTag').textContent = s.name;
  }
}

/* ---- Barcode Scanner & Search Input ---- */
function initScannerAndSearch() {
  const inp = document.getElementById('barcodeInput');
  const btnClear = document.getElementById('btnClearScan');

  inp.focus();
  document.addEventListener('click', (e) => {
    const isInteractive = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) || e.target.closest('.modal');
    if (!isInteractive) {
      inp.focus();
    }
  });

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = inp.value.trim();
      if (!query) return;

      const matched = DB.findProdByBarcodeOrCode(query);
      if (matched) {
        if ((matched.stock || 0) <= 0) {
          toast(`Sản phẩm "${matched.name}" đã HẾT HÀNG!`, 'w');
        } else {
          addToCart(matched.id);
          playBeep();
        }
        inp.value = '';
        renderProdGrid();
        return;
      }

      const currentProds = getFilteredProducts(query);
      if (currentProds.length === 1) {
        const single = currentProds[0];
        if ((single.stock || 0) <= 0) {
          toast(`Sản phẩm "${single.name}" đã HẾT HÀNG!`, 'w');
        } else {
          addToCart(single.id);
          playBeep();
        }
        inp.value = '';
        renderProdGrid();
        return;
      }

      renderProdGrid();
    }
  });

  inp.addEventListener('input', () => {
    renderProdGrid();
  });

  btnClear.addEventListener('click', () => {
    inp.value = '';
    inp.focus();
    renderProdGrid();
  });
}

function playBeep() {
  try {
    const audio = document.getElementById('beepSound');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch (e) {}
}

/* ---- Category Bar ---- */
function refreshCatBar() {
  const bar = document.getElementById('catBar');
  const active = bar.querySelector('.cat-btn.active')?.dataset?.cat || 'all';
  bar.innerHTML = `<button class="cat-btn ${active === 'all' ? 'active' : ''}" data-cat="all">Tất cả sản phẩm</button>`;
  DB.getCats().forEach(c => {
    const b = document.createElement('button');
    b.className = `cat-btn ${String(active) === String(c.id) ? 'active' : ''}`;
    b.dataset.cat = c.id;
    b.textContent = c.name;
    bar.appendChild(b);
  });
  bar.querySelectorAll('.cat-btn').forEach(b => {
    b.onclick = () => {
      bar.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderProdGrid();
    };
  });
}

/* ---- Filter & Render Product Grid ---- */
function getFilteredProducts(qSearch = null) {
  const q = (qSearch !== null ? qSearch : document.getElementById('barcodeInput').value).trim().toLowerCase();
  const cat = document.querySelector('.cat-btn.active')?.dataset?.cat;
  let prods = DB.getProds().filter(p => p.status === 'active');

  if (cat && cat !== 'all') prods = prods.filter(p => String(p.catId) === cat);
  if (q) {
    prods = prods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }
  return prods;
}

function renderProdGrid() {
  const prods = getFilteredProducts();
  const grid = document.getElementById('productGrid');

  if (!prods.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><p>Không tìm thấy sản phẩm nào</p></div>';
    return;
  }

  grid.innerHTML = prods.map(p => {
    const oos = (p.stock || 0) <= 0;
    const imgSrc = p.img || '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fas fa-box\\'></i>'"/>`
      : `<i class="fas fa-box"></i>`;

    return `<div class="prod-card${oos ? ' oos' : ''}" ${oos ? '' : `onclick="addToCart(${p.id})"`}>
      <div class="p-img">${imgHtml}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <div class="p-barcode"><i class="fas fa-barcode"></i> ${p.barcode || p.code || ''}</div>
      <div class="p-stock">Tồn kho: ${p.stock || 0} ${p.unit || ''}</div>
      ${oos ? '<div class="oos-badge">Hết hàng</div>' : ''}
    </div>`;
  }).join('');
}

/* ---- Cart Functions ---- */
function addToCart(id) {
  const p = DB.getProd(id);
  if (!p) return;
  const ex = cart.find(i => i.pid === id);
  if (ex) {
    if (ex.qty >= (p.stock || 0)) {
      toast(`Sản phẩm "${p.name}" chỉ còn tồn ${p.stock}`, 'w');
      return;
    }
    ex.qty++;
  } else {
    cart.push({ pid: id, name: p.name, price: p.price, qty: 1, maxQty: p.stock || 999, unit: p.unit || '' });
  }
  renderCart();
  toast(`Đã thêm: ${p.name}`, 's', 1400);
}

function renderCart() {
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-barcode"></i>
        <p>Quét mã vạch hoặc nhấn chọn sản phẩm để thêm vào giỏ</p>
      </div>`;
    calcCart();
    return;
  }

  body.innerHTML = cart.map((it, i) => `
    <div class="c-item">
      <div class="c-info">
        <div class="c-name">${it.name}</div>
        <div class="c-price">${fmt(it.price)} / ${it.unit || 'cái'}</div>
        <div class="c-sub">${fmt(it.price * it.qty)}</div>
      </div>
      <div class="c-ctrl">
        <button class="q-btn" onclick="chgQty(${i},-1)">−</button>
        <span class="q-val">${it.qty}</span>
        <button class="q-btn" onclick="chgQty(${i},1)">+</button>
        <button class="q-del" onclick="delItem(${i})"><i class="fas fa-times"></i></button>
      </div>
    </div>`).join('');

  calcCart();
}

function chgQty(i, d) {
  const it = cart[i];
  if (!it) return;
  const nq = it.qty + d;
  if (nq <= 0) { delItem(i); return; }
  if (nq > it.maxQty) { toast('Đã đạt số lượng tồn kho tối đa!', 'w'); return; }
  it.qty = nq;
  renderCart();
}

function delItem(i) {
  cart.splice(i, 1);
  renderCart();
}

/* ---- Payment & Change Calculation ---- */
function getCurrentTotal() {
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const dv = parseFloat(document.getElementById('discAmt').value) || 0;
  const dt = document.getElementById('discType').value;
  const disc = dt === 'percent' ? Math.round(sub * dv / 100) : Math.min(dv, sub);
  return Math.max(0, sub - disc);
}

function calcCart() {
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const dv = parseFloat(document.getElementById('discAmt').value) || 0;
  const dt = document.getElementById('discType').value;
  const disc = dt === 'percent' ? Math.round(sub * dv / 100) : Math.min(dv, sub);
  const total = Math.max(0, sub - disc);
  const cash = parseFloat(document.getElementById('cashIn').value) || 0;
  const change = Math.max(0, cash - total);

  document.getElementById('sumSubtotal').textContent = fmt(sub);
  document.getElementById('sumTotal').textContent = fmt(total);
  document.getElementById('sumChange').textContent = fmt(change);
  document.getElementById('transferAmtDisplay').textContent = fmt(total);
}

function setExactCash() {
  const total = getCurrentTotal();
  document.getElementById('cashIn').value = total;
  calcCart();
}

function addPresetCash(amount) {
  const cur = parseFloat(document.getElementById('cashIn').value) || 0;
  document.getElementById('cashIn').value = cur + amount;
  calcCart();
}

function initCartListeners() {
  document.getElementById('discAmt').addEventListener('input', calcCart);
  document.getElementById('discType').addEventListener('change', calcCart);
  document.getElementById('cashIn').addEventListener('input', calcCart);

  document.getElementById('clearCartBtn').onclick = () => {
    if (!cart.length) return;
    doConfirm('Bạn có chắc muốn XÓA HẾT giỏ hàng?', () => { cart = []; renderCart(); });
  };

  document.getElementById('checkoutBtn').onclick = checkout;
  document.getElementById('debtBtn').onclick = openDebtModal;

  // Switch between Cash & Bank Transfer
  document.querySelectorAll('.pay-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.pay-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      payMethod = b.dataset.m;

      const cashSec = document.getElementById('cashCalcSection');
      const transferSec = document.getElementById('transferInfoSection');

      if (payMethod === 'cash') {
        cashSec.classList.remove('hidden');
        transferSec.classList.add('hidden');
      } else {
        cashSec.classList.add('hidden');
        transferSec.classList.remove('hidden');
      }
      calcCart();
    };
  });
}

function checkout() {
  if (!cart.length) { toast('Giỏ hàng chưa có sản phẩm nào!', 'w'); return; }
  const total = getCurrentTotal();
  const cash = parseFloat(document.getElementById('cashIn').value) || 0;

  if (payMethod === 'cash' && cash > 0 && cash < total) {
    toast(`Khách đưa ${fmt(cash)} chưa đủ tổng tiền ${fmt(total)}!`, 'w');
    return;
  }

  const ord = DB.addOrd({
    items: cart.map(i => ({ pid: i.pid, name: i.name, price: i.price, qty: i.qty, unit: i.unit })),
    sub: cart.reduce((s, i) => s + i.price * i.qty, 0),
    disc: cart.reduce((s, i) => s + i.price * i.qty, 0) - total,
    discT: document.getElementById('discType').value,
    total,
    pay: payMethod,
    cashIn: payMethod === 'cash' ? cash : total,
    change: payMethod === 'cash' ? Math.max(0, cash - total) : 0,
  });

  toast(`✅ Thanh toán thành công! Mã đơn: ${ord.code}`, 's', 4000);
  showReceipt(ord);

  cart = [];
  renderCart();
  document.getElementById('discAmt').value = 0;
  document.getElementById('cashIn').value = '';
  calcCart();
  renderProdGrid();

  document.getElementById('barcodeInput').focus();
}

/* ---- Receipt ---- */
function showReceipt(ord) {
  const s = DB.getSet();
  document.getElementById('receiptEl').innerHTML = `
    <div class="r-h">
      <h2>${s.name}</h2>
      ${s.addr ? `<p>${s.addr}</p>` : ''}
      ${s.phone ? `<p>ĐT: ${s.phone}</p>` : ''}
      <p style="margin-top:6px;font-weight:700;font-size:13px">HÓA ĐƠN BÁN HÀNG</p>
      <p>Mã: <strong>${ord.code}</strong></p>
      <p>${dtStr(ord.at)}</p>
    </div>
    <hr class="r-div"/>
    ${ord.items.map(it => `
      <div class="r-row"><span style="flex:1">${it.name}</span></div>
      <div class="r-row"><span>${it.qty} x ${fmt(it.price)}</span><span>${fmt(it.qty * it.price)}</span></div>
    `).join('')}
    <hr class="r-div"/>
    <div class="r-row"><span>Tạm tính</span><span>${fmt(ord.sub)}</span></div>
    ${ord.disc > 0 ? `<div class="r-row"><span>Giảm giá</span><span>-${fmt(ord.disc)}</span></div>` : ''}
    <div class="r-row big"><span>TỔNG CỘNG</span><span>${fmt(ord.total)}</span></div>
    <div class="r-row"><span>${payLbl(ord.pay)}</span><span>${fmt(ord.cashIn)}</span></div>
    ${ord.pay === 'cash' ? `<div class="r-row big" style="color:var(--success)"><span>TIỀN THỪA TRẢ KHÁCH</span><span>${fmt(ord.change)}</span></div>` : ''}
    <hr class="r-div"/>
    <div class="r-footer"><p>${s.footer || 'Cảm ơn quý khách!'}</p></div>`;
  openM('modalReceipt');
}

/* ---- Helpers & Modals ---- */
function initModals() {
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeM(b.dataset.close));
  document.querySelectorAll('.overlay').forEach(o => o.onclick = e => { if (e.target === o) closeM(o.id) });
  document.getElementById('confirmNo').onclick = () => closeM('modalConfirm');
  document.getElementById('confirmYes').onclick = () => { closeM('modalConfirm'); if (confirmCb) { confirmCb(); confirmCb = null; } };
  document.getElementById('btnConfirmDebt').onclick = confirmDebt;
}

/* ---- Debt (Ghi nợ) ---- */
function openDebtModal() {
  if (!cart.length) { toast('Giỏ hàng chưa có sản phẩm nào!', 'w'); return; }
  const total = getCurrentTotal();
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const disc = sub - total;

  // Build order summary
  document.getElementById('debtOrderSummary').innerHTML = `
    <div class="debt-sum-box">
      <div class="debt-sum-title"><i class="fas fa-shopping-basket"></i> Tóm tắt đơn hàng nợ</div>
      <div class="debt-sum-items">
        ${cart.map(it => `<div class="debt-sum-row"><span>${it.name} × ${it.qty}</span><span>${fmt(it.price * it.qty)}</span></div>`).join('')}
      </div>
      ${disc > 0 ? `<div class="debt-sum-row" style="color:var(--success)"><span>Giảm giá</span><span>-${fmt(disc)}</span></div>` : ''}
      <div class="debt-sum-total"><span>TỔNG NỢ</span><span>${fmt(total)}</span></div>
    </div>`;

  // Reset form
  document.getElementById('debtName').value = '';
  document.getElementById('debtPhone').value = '';
  document.getElementById('debtMemo').value = '';

  openM('modalDebt');
  setTimeout(() => document.getElementById('debtName').focus(), 150);
}

function confirmDebt() {
  const name = document.getElementById('debtName').value.trim();
  const phone = document.getElementById('debtPhone').value.trim();
  const memo = document.getElementById('debtMemo').value.trim();

  if (!name) { toast('Vui lòng nhập họ tên khách hàng!', 'e'); document.getElementById('debtName').focus(); return; }
  if (!phone) { toast('Vui lòng nhập số điện thoại!', 'e'); document.getElementById('debtPhone').focus(); return; }
  if (!memo) { toast('Vui lòng nhập đặc điểm để ghi nhớ khách hàng!', 'e'); document.getElementById('debtMemo').focus(); return; }

  const total = getCurrentTotal();
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const debt = DB.addDebt({
    customerName: name,
    customerPhone: phone,
    customerMemo: memo,
    items: cart.map(i => ({ pid: i.pid, name: i.name, price: i.price, qty: i.qty, unit: i.unit })),
    sub,
    disc: sub - total,
    discT: document.getElementById('discType').value,
    total,
  });

  // Deduct stock
  cart.forEach(it => {
    const p = DB.getProd(it.pid);
    if (p) DB.updProd(p.id, { stock: Math.max(0, (p.stock || 0) - it.qty) });
  });

  closeM('modalDebt');
  toast(`✅ Đã ghi nợ: ${name} – ${fmt(total)} | Mã: ${debt.code}`, 's', 5000);

  // Reset cart
  cart = [];
  renderCart();
  document.getElementById('discAmt').value = 0;
  document.getElementById('cashIn').value = '';
  calcCart();
  renderProdGrid();
  document.getElementById('barcodeInput').focus();
}

function openM(id) { document.getElementById(id).classList.add('open') }
function closeM(id) { document.getElementById(id).classList.remove('open') }
function doConfirm(msg, cb) {
  document.getElementById('confirmMsg').textContent = msg;
  confirmCb = cb;
  openM('modalConfirm');
}

function toast(msg, type = 's', ms = 2800) {
  const icons = { s: 'fa-check-circle', e: 'fa-times-circle', w: 'fa-exclamation-triangle', i: 'fa-info-circle' };
  const w = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}"></i><span class="toast-txt">${msg}</span>`;
  w.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'tIn .25s ease reverse';
    setTimeout(() => t.remove(), 250);
  }, ms);
}

const fmt = n => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const dtStr = iso => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const payLbl = m => ({ cash: 'Tiền mặt', transfer: 'Chuyển khoản' }[m] || m);

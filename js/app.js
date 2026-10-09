/* ====================================================
   APP LOGIC  –  POS Hoàng Nam v2
   ==================================================== */

/* ---------- globals ---------- */
let cart = [];
let payMethod = 'cash';
let editProdId = null;
let editCatId  = null;
let confirmCb  = null;
let prodImgData = '';   // base64 của ảnh upload
let rChart = null, wChart = null, tpChart = null;

/* ====================================================
   BOOT
   ==================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await DB.seed();
  clock();
  sidebar();
  modals();
  loadSettings();
  initPOS();
  initProducts();
  initCategories();
  initOrders();
  initReports();
  initSettings();
  navigate('pos');
});

/* ====================================================
   UTILS
   ==================================================== */
const fmt   = n => Number(n||0).toLocaleString('vi-VN') + ' ₫';
const fmtSh = n => n>=1e9?(n/1e9).toFixed(1)+' tỷ ₫' : n>=1e6?(n/1e6).toFixed(1)+' tr ₫' : n>=1e3?(n/1e3).toFixed(0)+'K ₫' : fmt(n);
const dtStr = iso => new Date(iso).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const today = () => new Date().toISOString().slice(0,10);
const payLbl= m => ({cash:'Tiền mặt',card:'Thẻ',transfer:'Chuyển khoản'}[m]||m);
const catName=id => DB.getCats().find(c=>c.id===id)?.name||'—';
const wkNum = d => { const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dn=u.getUTCDay()||7; u.setUTCDate(u.getUTCDate()+4-dn); const ys=new Date(Date.UTC(u.getUTCFullYear(),0,1)); return Math.ceil((((u-ys)/86400000)+1)/7) };

/* ====================================================
   CLOCK
   ==================================================== */
function clock(){
  const el=document.getElementById('clock');
  const upd=()=>{el.textContent=new Date().toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'})};
  upd(); setInterval(upd,1000);
}

/* ====================================================
   SIDEBAR / NAVIGATION
   ==================================================== */
function sidebar(){
  const sb=document.getElementById('sidebar'), mc=document.getElementById('mainContent');
  const tog=()=>{ sb.classList.toggle('collapsed'); mc.classList.toggle('expanded') };
  document.getElementById('sidebarToggle').onclick=tog;
  document.getElementById('menuBtn').onclick=tog;
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.onclick=()=>navigate(el.dataset.page);
  });
}

function navigate(page){
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  const ni=document.querySelector(`.nav-item[data-page="${page}"]`);
  if(ni) ni.classList.add('active');
  const pg=document.getElementById(`page-${page}`);
  if(pg) pg.classList.add('active');
  const titles={pos:'Bán hàng',dashboard:'Thống kê',products:'Sản phẩm',categories:'Danh mục',orders:'Đơn hàng',reports:'Báo cáo',settings:'Cài đặt'};
  document.getElementById('pageTitle').textContent=titles[page]||'';
  if(page==='dashboard') refreshDash();
  if(page==='products')  renderProdTable();
  if(page==='categories')renderCatTable();
  if(page==='orders')    renderOrdTable();
  if(page==='pos')       refreshCatBar();
}

/* ====================================================
   MODALS
   ==================================================== */
function modals(){
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeM(b.dataset.close));
  document.querySelectorAll('.overlay').forEach(o=>o.onclick=e=>{ if(e.target===o) closeM(o.id) });
  document.getElementById('confirmNo').onclick =()=>closeM('modalConfirm');
  document.getElementById('confirmYes').onclick=()=>{ closeM('modalConfirm'); if(confirmCb){confirmCb();confirmCb=null} };
}
function openM(id){document.getElementById(id).classList.add('open')}
function closeM(id){document.getElementById(id).classList.remove('open')}
function doConfirm(msg,cb){ document.getElementById('confirmMsg').textContent=msg; confirmCb=cb; openM('modalConfirm') }

/* ====================================================
   TOAST
   ==================================================== */
function toast(msg, type='s', ms=2800){
  const icons={s:'fa-check-circle',e:'fa-times-circle',w:'fa-exclamation-triangle',i:'fa-info-circle'};
  const w=document.getElementById('toastWrap');
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.innerHTML=`<i class="fas ${icons[type]}"></i><span class="toast-txt">${msg}</span>`;
  w.appendChild(t);
  setTimeout(()=>{t.style.animation='tIn .25s ease reverse'; setTimeout(()=>t.remove(),250)},ms);
}

/* ====================================================
   POS  –  Bán hàng
   ==================================================== */
function initPOS(){
  refreshCatBar(); renderProdGrid();
  document.getElementById('posSearch').addEventListener('input', renderProdGrid);
  document.getElementById('discAmt').addEventListener('input', calcCart);
  document.getElementById('discType').addEventListener('change', calcCart);
  document.getElementById('cashIn').addEventListener('input', calcCart);
  document.getElementById('clearCartBtn').onclick=()=>{
    if(!cart.length) return;
    doConfirm('Xóa tất cả sản phẩm trong giỏ?',()=>{ cart=[]; renderCart() });
  };
  document.getElementById('checkoutBtn').onclick=checkout;
  document.querySelectorAll('.pay-btn').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.pay-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); payMethod=b.dataset.m;
  });
}

function refreshCatBar(){
  const bar=document.getElementById('catBar');
  const active=bar.querySelector('.cat-btn.active')?.dataset?.cat||'all';
  bar.innerHTML=`<button class="cat-btn ${active==='all'?'active':''}" data-cat="all">Tất cả</button>`;
  DB.getCats().forEach(c=>{
    const b=document.createElement('button');
    b.className=`cat-btn ${String(active)===String(c.id)?'active':''}`;
    b.dataset.cat=c.id; b.textContent=c.name;
    bar.appendChild(b);
  });
  bar.querySelectorAll('.cat-btn').forEach(b=>b.onclick=()=>{
    bar.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); renderProdGrid();
  });
}

function renderProdGrid(){
  const q=document.getElementById('posSearch').value.toLowerCase();
  const cat=document.querySelector('.cat-btn.active')?.dataset?.cat;
  let prods=DB.getProds().filter(p=>p.status==='active');
  if(cat&&cat!=='all') prods=prods.filter(p=>String(p.catId)===cat);
  if(q) prods=prods.filter(p=>p.name.toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q));

  const grid=document.getElementById('productGrid');
  if(!prods.length){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><p>Không tìm thấy sản phẩm</p></div>';
    return;
  }
  grid.innerHTML=prods.map(p=>{
    const oos=(p.stock||0)<=0;
    const imgSrc=p.img||'';
    const imgHtml=imgSrc
      ? `<img src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fas fa-box\\'></i>'"/>`
      : `<i class="fas fa-box"></i>`;
    return `<div class="prod-card${oos?' oos':''}" ${oos?'':` onclick="addToCart(${p.id})"`}>
      <div class="p-img">${imgHtml}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <div class="p-stock">Tồn: ${p.stock||0} ${p.unit||''}</div>
      ${oos?'<div class="oos-badge">Hết hàng</div>':''}
    </div>`;
  }).join('');
}

function addToCart(id){
  const p=DB.getProd(id); if(!p) return;
  const ex=cart.find(i=>i.pid===id);
  if(ex){
    if(ex.qty>=(p.stock||0)){ toast(`Không đủ hàng! Tồn: ${p.stock}`,'w'); return }
    ex.qty++;
  } else {
    cart.push({pid:id,name:p.name,price:p.price,qty:1,maxQty:p.stock||999,unit:p.unit||''});
  }
  renderCart();
  toast(`Thêm: ${p.name}`,'s',1400);
}

function renderCart(){
  const body=document.getElementById('cartBody');
  if(!cart.length){
    body.innerHTML='<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p>Chưa có sản phẩm</p></div>';
    calcCart(); return;
  }
  body.innerHTML=cart.map((it,i)=>`
    <div class="c-item">
      <div class="c-info">
        <div class="c-name">${it.name}</div>
        <div class="c-price">${fmt(it.price)} / ${it.unit||'cái'}</div>
        <div class="c-sub">${fmt(it.price*it.qty)}</div>
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

function chgQty(i,d){
  const it=cart[i]; if(!it) return;
  const nq=it.qty+d;
  if(nq<=0){ delItem(i); return }
  if(nq>it.maxQty){ toast('Không đủ hàng!','w'); return }
  it.qty=nq; renderCart();
}
function delItem(i){ cart.splice(i,1); renderCart() }

function calcCart(){
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const dv=parseFloat(document.getElementById('discAmt').value)||0;
  const dt=document.getElementById('discType').value;
  const disc=dt==='percent'?Math.round(sub*dv/100):Math.min(dv,sub);
  const total=Math.max(0,sub-disc);
  const cash=parseFloat(document.getElementById('cashIn').value)||0;
  document.getElementById('sumSubtotal').textContent=fmt(sub);
  document.getElementById('sumTotal').textContent=fmt(total);
  document.getElementById('sumChange').textContent=fmt(Math.max(0,cash-total));
}

function checkout(){
  if(!cart.length){ toast('Giỏ hàng trống!','w'); return }
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const dv=parseFloat(document.getElementById('discAmt').value)||0;
  const dt=document.getElementById('discType').value;
  const disc=dt==='percent'?Math.round(sub*dv/100):Math.min(dv,sub);
  const total=Math.max(0,sub-disc);
  const cash=parseFloat(document.getElementById('cashIn').value)||0;
  if(payMethod==='cash'&&cash>0&&cash<total){ toast('Tiền khách đưa không đủ!','w'); return }

  const ord=DB.addOrd({
    items:cart.map(i=>({pid:i.pid,name:i.name,price:i.price,qty:i.qty,unit:i.unit})),
    sub,disc,discT:dt,total,pay:payMethod,
    cashIn:payMethod==='cash'?cash:total,
    change:payMethod==='cash'?Math.max(0,cash-total):0,
  });

  toast(`✅ Thanh toán thành công! ${ord.code}`,'s',4000);
  showReceipt(ord);
  cart=[]; renderCart();
  document.getElementById('discAmt').value=0;
  document.getElementById('cashIn').value='';
  calcCart(); renderProdGrid();
}

/* ====================================================
   RECEIPT
   ==================================================== */
function showReceipt(ord){
  const s=DB.getSet();
  document.getElementById('receiptEl').innerHTML=`
    <div class="r-h">
      <h2>${s.name}</h2>
      ${s.addr?`<p>${s.addr}</p>`:''}
      ${s.phone?`<p>ĐT: ${s.phone}</p>`:''}
      <p style="margin-top:6px;font-weight:700;font-size:13px">HÓA ĐƠN BÁN HÀNG</p>
      <p>Mã: <strong>${ord.code}</strong></p>
      <p>${dtStr(ord.at)}</p>
    </div>
    <hr class="r-div"/>
    ${ord.items.map(it=>`
      <div class="r-row"><span style="flex:1">${it.name}</span></div>
      <div class="r-row"><span>${it.qty} x ${fmt(it.price)}</span><span>${fmt(it.qty*it.price)}</span></div>
    `).join('')}
    <hr class="r-div"/>
    <div class="r-row"><span>Tạm tính</span><span>${fmt(ord.sub)}</span></div>
    ${ord.disc>0?`<div class="r-row"><span>Giảm giá</span><span>-${fmt(ord.disc)}</span></div>`:''}
    <div class="r-row big"><span>TỔNG CỘNG</span><span>${fmt(ord.total)}</span></div>
    <div class="r-row"><span>${payLbl(ord.pay)}</span><span>${fmt(ord.cashIn)}</span></div>
    ${ord.pay==='cash'?`<div class="r-row"><span>Tiền thừa</span><span>${fmt(ord.change)}</span></div>`:''}
    <hr class="r-div"/>
    <div class="r-foot"><p>${s.footer||'Cảm ơn quý khách!'}</p></div>`;
  openM('modalReceipt');
}

/* ====================================================
   DASHBOARD
   ==================================================== */
function refreshDash(){
  const ords=DB.getOrds();
  const td=today();
  const nm=new Date(); const ym=`${nm.getFullYear()}-${String(nm.getMonth()+1).padStart(2,'0')}`;
  const todayOrds=ords.filter(o=>o.at.slice(0,10)===td);
  document.getElementById('dToday').textContent=fmt(todayOrds.reduce((s,o)=>s+o.total,0));
  document.getElementById('dOrdersToday').textContent=todayOrds.length;
  document.getElementById('dProducts').textContent=DB.getProds().length;
  document.getElementById('dMonth').textContent=fmt(ords.filter(o=>o.at.startsWith(ym)).reduce((s,o)=>s+o.total,0));
  buildWeekly(ords);
  buildTopProd(ords);
  buildRecent(ords.slice().reverse().slice(0,8));
}

function buildWeekly(ords){
  const labels=[],data=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    labels.push(d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}));
    data.push(ords.filter(o=>o.at.slice(0,10)===ds).reduce((s,o)=>s+o.total,0));
  }
  const ctx=document.getElementById('chartWeekly').getContext('2d');
  if(wChart) wChart.destroy();
  wChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Doanh thu',data,backgroundColor:'rgba(37,99,235,.72)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmtSh(v)}}}}});
}

function buildTopProd(ords){
  const map={};
  ords.forEach(o=>o.items.forEach(i=>{ map[i.name]=(map[i.name]||0)+i.qty }));
  const top=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const ctx=document.getElementById('chartTopProd').getContext('2d');
  if(tpChart) tpChart.destroy();
  if(!top.length){
    document.getElementById('chartTopProd').style.display='none'; return;
  }
  document.getElementById('chartTopProd').style.display='';
  tpChart=new Chart(ctx,{type:'doughnut',data:{labels:top.map(t=>t[0].substring(0,18)+'…'),datasets:[{data:top.map(t=>t[1]),backgroundColor:['#2563eb','#16a34a','#d97706','#7c3aed','#0891b2']}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}}}});
}

function buildRecent(ords){
  const tb=document.getElementById('recentBody');
  tb.innerHTML=!ords.length?'<tr><td colspan="5" class="empty-state">Chưa có đơn hàng</td></tr>':
    ords.map(o=>`<tr>
      <td><strong>${o.code}</strong></td>
      <td>${dtStr(o.at)}</td>
      <td>${o.items.reduce((s,i)=>s+i.qty,0)} SP</td>
      <td style="font-weight:700;color:var(--primary)">${fmt(o.total)}</td>
      <td><span class="badge b-blue">${payLbl(o.pay)}</span></td>
    </tr>`).join('');
}

/* ====================================================
   PRODUCTS
   ==================================================== */
function initProducts(){
  document.getElementById('btnAddProd').onclick=()=>openProdModal();
  document.getElementById('btnSaveProd').onclick=saveProd;
  document.getElementById('prodSearch').addEventListener('input',renderProdTable);
  document.getElementById('prodCatFilter').addEventListener('change',renderProdTable);

  // image upload
  const imgPrev=document.getElementById('imgPreview');
  const imgFile=document.getElementById('imgFile');
  const urlInp =document.getElementById('prodImgUrl');

  document.getElementById('btnPickImg').onclick=()=>imgFile.click();
  document.getElementById('imgUploadArea').querySelector('.img-preview').onclick=()=>imgFile.click();

  imgFile.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>2*1024*1024){ toast('Ảnh quá lớn! Tối đa 2MB','e'); return }
    const reader=new FileReader();
    reader.onload=ev=>{ prodImgData=ev.target.result; urlInp.value=''; showImgPrev(prodImgData) };
    reader.readAsDataURL(f);
  };
  urlInp.addEventListener('input',()=>{
    if(urlInp.value){ prodImgData=''; showImgPrev(urlInp.value) }
    else if(!prodImgData){ showImgPrev('') }
  });
  document.getElementById('btnClearImg').onclick=()=>{
    prodImgData=''; urlInp.value=''; imgFile.value=''; showImgPrev('');
  };
}

function showImgPrev(src){
  const prev=document.getElementById('imgPreview');
  if(src){
    prev.classList.add('has-img');
    prev.innerHTML=`<img src="${src}" style="width:100%;height:100%;object-fit:cover" onerror="showImgPrev('')"/>`;
  } else {
    prev.classList.remove('has-img');
    prev.innerHTML=`<i class="fas fa-image"></i><p>Nhấn để chọn ảnh</p><small>JPG, PNG, WEBP – tối đa 2MB</small>`;
  }
}

function openProdModal(id=null){
  editProdId=id; prodImgData='';
  document.getElementById('modalProdTitle').textContent=id?'Sửa sản phẩm':'Thêm sản phẩm';
  const cats=DB.getCats();
  document.getElementById('fCat').innerHTML=cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

  if(id){
    const p=DB.getProd(id); if(!p) return;
    document.getElementById('fCode').value=p.code||'';
    document.getElementById('fName').value=p.name;
    document.getElementById('fCat').value=p.catId;
    document.getElementById('fUnit').value=p.unit||'';
    document.getElementById('fCost').value=p.cost||0;
    document.getElementById('fPrice').value=p.price;
    document.getElementById('fStock').value=p.stock||0;
    document.getElementById('fMinStock').value=p.min||5;
    document.getElementById('fDesc').value=p.desc||'';
    document.getElementById('fStatus').value=p.status||'active';
    const imgSrc=p.img||'';
    if(imgSrc.startsWith('data:')) prodImgData=imgSrc;
    document.getElementById('prodImgUrl').value=imgSrc.startsWith('data:')?'':imgSrc;
    showImgPrev(imgSrc);
  } else {
    ['fCode','fName','fUnit','fDesc'].forEach(f=>document.getElementById(f).value='');
    ['fCost','fPrice','fStock'].forEach(f=>document.getElementById(f).value=0);
    document.getElementById('fMinStock').value=5;
    document.getElementById('fStatus').value='active';
    document.getElementById('prodImgUrl').value='';
    document.getElementById('imgFile').value='';
    showImgPrev('');
  }
  openM('modalProd');
}

function saveProd(){
  const name=document.getElementById('fName').value.trim();
  const price=parseFloat(document.getElementById('fPrice').value)||0;
  if(!name){ toast('Vui lòng nhập tên sản phẩm!','e'); return }
  if(!price){ toast('Vui lòng nhập giá bán!','e'); return }

  const urlVal=document.getElementById('prodImgUrl').value.trim();
  const img=prodImgData||urlVal;

  const data={
    code:document.getElementById('fCode').value.trim(),
    name,
    catId:parseInt(document.getElementById('fCat').value),
    unit:document.getElementById('fUnit').value.trim(),
    cost:parseFloat(document.getElementById('fCost').value)||0,
    price,
    stock:parseInt(document.getElementById('fStock').value)||0,
    min:parseInt(document.getElementById('fMinStock').value)||5,
    desc:document.getElementById('fDesc').value.trim(),
    img,
    status:document.getElementById('fStatus').value,
  };

  if(editProdId){ DB.updProd(editProdId,data); toast('Đã cập nhật sản phẩm!','s') }
  else          { DB.addProd(data);            toast('Đã thêm sản phẩm!','s') }

  closeM('modalProd');
  renderProdTable();
  renderProdGrid();
  refreshCatBar();
}

function renderProdTable(){
  const q=document.getElementById('prodSearch').value.toLowerCase();
  const cf=document.getElementById('prodCatFilter').value;
  const cats=DB.getCats();

  // refresh filter dropdown
  const sel=document.getElementById('prodCatFilter');
  const cv=sel.value;
  sel.innerHTML='<option value="">Tất cả danh mục</option>'+cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  sel.value=cv;

  let prods=DB.getProds();
  if(q) prods=prods.filter(p=>p.name.toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q));
  if(cf) prods=prods.filter(p=>String(p.catId)===cf);

  const tb=document.getElementById('prodTbody');
  tb.innerHTML=!prods.length?`<tr><td colspan="8" class="empty-state"><i class="fas fa-box-open"></i><p>Không có sản phẩm</p></td></tr>`:
    prods.map(p=>{
      const sc=(p.stock||0)===0?'no-stock':(p.stock<=(p.min||5)?'low-stock':'');
      const imgSrc=p.img||'';
      const thumbHtml=imgSrc
        ?`<div class="thumb"><img src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fas fa-box\\'></i>'"/></div>`
        :`<div class="thumb"><i class="fas fa-box"></i></div>`;
      return `<tr>
        <td>${thumbHtml}</td>
        <td><code>${p.code||'—'}</code></td>
        <td><strong>${p.name}</strong><br><small style="color:var(--muted)">${p.unit||''}</small></td>
        <td>${catName(p.catId)}</td>
        <td style="font-weight:700;color:var(--primary)">${fmt(p.price)}</td>
        <td class="${sc}">${p.stock||0} ${p.unit||''}</td>
        <td><span class="badge ${p.status==='active'?'b-green':'b-red'}">${p.status==='active'?'Đang bán':'Ngừng bán'}</span></td>
        <td><div class="act-btns">
          <button class="act-btn edit" onclick="openProdModal(${p.id})" title="Sửa"><i class="fas fa-edit"></i></button>
          <button class="act-btn del"  onclick="deleteProd(${p.id})"    title="Xóa"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('');
}

function deleteProd(id){
  doConfirm('Xóa sản phẩm này?',()=>{ DB.delProd(id); renderProdTable(); renderProdGrid(); toast('Đã xóa!','s') });
}

/* ====================================================
   CATEGORIES
   ==================================================== */
function initCategories(){
  document.getElementById('btnAddCat').onclick=()=>openCatModal();
  document.getElementById('btnSaveCat').onclick=saveCat;
}
function openCatModal(id=null){
  editCatId=id;
  document.getElementById('modalCatTitle').textContent=id?'Sửa danh mục':'Thêm danh mục';
  if(id){
    const c=DB.getCats().find(x=>x.id===id);
    document.getElementById('cName').value=c?.name||'';
    document.getElementById('cDesc').value=c?.desc||'';
  } else {
    document.getElementById('cName').value='';
    document.getElementById('cDesc').value='';
  }
  openM('modalCat');
}
function saveCat(){
  const name=document.getElementById('cName').value.trim();
  if(!name){ toast('Vui lòng nhập tên danh mục!','e'); return }
  const d={name,desc:document.getElementById('cDesc').value.trim()};
  if(editCatId){ DB.updCat(editCatId,d); toast('Đã cập nhật!','s') }
  else          { DB.addCat(d);          toast('Đã thêm danh mục!','s') }
  closeM('modalCat'); renderCatTable(); refreshCatBar();
}
function renderCatTable(){
  const prods=DB.getProds();
  const tb=document.getElementById('catTbody');
  const cats=DB.getCats();
  tb.innerHTML=!cats.length?`<tr><td colspan="5" class="empty-state">Chưa có danh mục</td></tr>`:
    cats.map((c,i)=>{
      const cnt=prods.filter(p=>p.catId===c.id).length;
      return `<tr>
        <td>${i+1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.desc||'—'}</td>
        <td><span class="badge b-blue">${cnt} SP</span></td>
        <td><div class="act-btns">
          <button class="act-btn edit" onclick="openCatModal(${c.id})"><i class="fas fa-edit"></i></button>
          <button class="act-btn del"  onclick="deleteCat(${c.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('');
}
function deleteCat(id){
  const cnt=DB.getProds().filter(p=>p.catId===id).length;
  if(cnt){ toast(`Không thể xóa! Danh mục có ${cnt} sản phẩm.`,'w'); return }
  doConfirm('Xóa danh mục này?',()=>{ DB.delCat(id); renderCatTable(); refreshCatBar(); toast('Đã xóa!','s') });
}

/* ====================================================
   ORDERS
   ==================================================== */
function initOrders(){
  document.getElementById('btnOrdFilter').onclick=renderOrdTable;
  document.getElementById('ordSearch').addEventListener('input',renderOrdTable);
}
function renderOrdTable(){
  const q=document.getElementById('ordSearch').value.toLowerCase();
  const from=document.getElementById('ordFrom').value;
  const to  =document.getElementById('ordTo').value;
  let ords=DB.getOrds().slice().reverse();
  if(q)    ords=ords.filter(o=>o.code.toLowerCase().includes(q));
  if(from) ords=ords.filter(o=>o.at.slice(0,10)>=from);
  if(to)   ords=ords.filter(o=>o.at.slice(0,10)<=to);
  const tb=document.getElementById('ordTbody');
  tb.innerHTML=!ords.length?`<tr><td colspan="6" class="empty-state">Không có đơn hàng</td></tr>`:
    ords.map(o=>`<tr>
      <td><strong>${o.code}</strong></td>
      <td>${dtStr(o.at)}</td>
      <td>${o.items.reduce((s,i)=>s+i.qty,0)} SP</td>
      <td style="font-weight:700;color:var(--primary)">${fmt(o.total)}</td>
      <td><span class="badge b-blue">${payLbl(o.pay)}</span></td>
      <td><div class="act-btns">
        <button class="act-btn view" onclick="viewOrd(${o.id})" title="Xem"><i class="fas fa-eye"></i></button>
        <button class="act-btn view" onclick="printOrd(${o.id})" title="In"><i class="fas fa-print"></i></button>
      </div></td>
    </tr>`).join('');
}
function viewOrd(id){
  const o=DB.getOrd(id); if(!o) return;
  document.getElementById('detailCode').textContent=o.code;
  document.getElementById('detailBody').innerHTML=`
    <div class="ord-meta">
      <div class="ord-meta-item"><label>Mã đơn hàng</label><strong>${o.code}</strong></div>
      <div class="ord-meta-item"><label>Thời gian</label><strong>${dtStr(o.at)}</strong></div>
      <div class="ord-meta-item"><label>Thanh toán</label><strong>${payLbl(o.pay)}</strong></div>
      <div class="ord-meta-item"><label>Tổng tiền</label><strong style="color:var(--primary)">${fmt(o.total)}</strong></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
      <tbody>
        ${o.items.map(i=>`<tr><td>${i.name}</td><td>${i.unit||''}</td><td>${fmt(i.price)}</td><td>${i.qty}</td><td style="font-weight:700">${fmt(i.price*i.qty)}</td></tr>`).join('')}
      </tbody>
      <tfoot>
        <tr><td colspan="4" style="text-align:right;font-weight:600">Tạm tính:</td><td>${fmt(o.sub)}</td></tr>
        ${o.disc?`<tr><td colspan="4" style="text-align:right;font-weight:600">Giảm giá:</td><td style="color:var(--danger)">-${fmt(o.disc)}</td></tr>`:''}
        <tr style="background:var(--primary-lt)"><td colspan="4" style="text-align:right;font-weight:800;font-size:1rem">Tổng cộng:</td><td style="font-weight:800;color:var(--primary)">${fmt(o.total)}</td></tr>
      </tfoot>
    </table>`;
  openM('modalOrdDetail');
}
function printOrd(id){ const o=DB.getOrd(id); if(o) showReceipt(o) }

/* ====================================================
   REPORTS
   ==================================================== */
function initReports(){
  document.getElementById('rDay').value=today();
  const nm=new Date();
  document.getElementById('rMonth').value=`${nm.getFullYear()}-${String(nm.getMonth()+1).padStart(2,'0')}`;
  const yrSel=document.getElementById('rYear');
  for(let y=nm.getFullYear();y>=2020;y--) yrSel.innerHTML+=`<option value="${y}">${y}</option>`;
  document.getElementById('rWeek').value=`${nm.getFullYear()}-W${String(wkNum(nm)).padStart(2,'0')}`;

  document.querySelectorAll('.rtab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.rtab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    ['rfDay','rfWeek','rfMonth','rfYear'].forEach(id=>document.getElementById(id).classList.add('hidden'));
    const map={day:'rfDay',week:'rfWeek',month:'rfMonth',year:'rfYear'};
    document.getElementById(map[t.dataset.r]).classList.remove('hidden');
  });
  document.getElementById('btnGenReport').onclick=genReport;
  document.getElementById('btnExportCSV').onclick=exportCSV;
  genReport();
}

function genReport(){
  const tab=document.querySelector('.rtab.active').dataset.r;
  const ords=DB.getOrds();
  let filtered=[],labels=[],data=[];

  if(tab==='day'){
    const day=document.getElementById('rDay').value;
    filtered=ords.filter(o=>o.at.slice(0,10)===day);
    document.getElementById('rChartTitle').textContent=`Theo giờ – ${day.split('-').reverse().join('/')}`;
    for(let h=0;h<24;h++){
      labels.push(`${String(h).padStart(2,'0')}h`);
      data.push(filtered.filter(o=>new Date(o.at).getHours()===h).reduce((s,o)=>s+o.total,0));
    }
  } else if(tab==='week'){
    const wv=document.getElementById('rWeek').value;
    if(!wv) return;
    const [yr,w]=wv.split('-W');
    const jan4=new Date(parseInt(yr),0,4);
    const sow=new Date(jan4); sow.setDate(jan4.getDate()-(jan4.getDay()||7)+1+(parseInt(w)-1)*7);
    const days=[]; for(let d=0;d<7;d++){const dd=new Date(sow);dd.setDate(sow.getDate()+d);days.push(dd)}
    filtered=ords.filter(o=>{ const od=new Date(o.at); return od>=days[0]&&od<=new Date(days[6].getTime()+86399999) });
    labels=days.map(d=>d.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'}));
    data=days.map(d=>{ const ds=d.toISOString().slice(0,10); return filtered.filter(o=>o.at.slice(0,10)===ds).reduce((s,o)=>s+o.total,0) });
    document.getElementById('rChartTitle').textContent=`Tuần ${w} / ${yr}`;
  } else if(tab==='month'){
    const mv=document.getElementById('rMonth').value;
    const [yr,mo]=mv.split('-');
    filtered=ords.filter(o=>o.at.startsWith(`${yr}-${mo}`));
    const dim=new Date(parseInt(yr),parseInt(mo),0).getDate();
    for(let d=1;d<=dim;d++){
      const ds=`${yr}-${mo}-${String(d).padStart(2,'0')}`;
      labels.push(`${d}/${mo}`);
      data.push(filtered.filter(o=>o.at.slice(0,10)===ds).reduce((s,o)=>s+o.total,0));
    }
    document.getElementById('rChartTitle').textContent=`Tháng ${mo}/${yr}`;
  } else {
    const yr=document.getElementById('rYear').value;
    filtered=ords.filter(o=>o.at.startsWith(yr));
    for(let m=1;m<=12;m++){
      const ms=String(m).padStart(2,'0');
      labels.push(`Tháng ${m}`);
      data.push(filtered.filter(o=>o.at.startsWith(`${yr}-${ms}`)).reduce((s,o)=>s+o.total,0));
    }
    document.getElementById('rChartTitle').textContent=`Năm ${yr}`;
  }

  const rev=filtered.reduce((s,o)=>s+o.total,0);
  const items=filtered.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.qty,0),0);
  document.getElementById('rRev').textContent=fmt(rev);
  document.getElementById('rOrd').textContent=filtered.length;
  document.getElementById('rItems').textContent=items;
  document.getElementById('rAvg').textContent=filtered.length?fmt(Math.round(rev/filtered.length)):'0 ₫';

  const ctx=document.getElementById('rChart').getContext('2d');
  if(rChart) rChart.destroy();
  rChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Doanh thu',data,backgroundColor:'rgba(37,99,235,.72)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.raw)}}},scales:{y:{ticks:{callback:v=>fmtSh(v)}}}}});

  const tb=document.getElementById('rOrdBody');
  tb.innerHTML=!filtered.length?`<tr><td colspan="5" class="empty-state">Không có đơn hàng</td></tr>`:
    filtered.slice().reverse().map(o=>`<tr>
      <td><strong>${o.code}</strong></td>
      <td>${dtStr(o.at)}</td>
      <td>${o.items.reduce((s,i)=>s+i.qty,0)} SP</td>
      <td style="font-weight:700;color:var(--primary)">${fmt(o.total)}</td>
      <td><span class="badge b-blue">${payLbl(o.pay)}</span></td>
    </tr>`).join('');
}

function exportCSV(){
  const tab=document.querySelector('.rtab.active').dataset.r;
  const ords=DB.getOrds();
  let filtered=ords;
  if(tab==='day')  { const d=document.getElementById('rDay').value; filtered=ords.filter(o=>o.at.slice(0,10)===d) }
  if(tab==='month'){ const m=document.getElementById('rMonth').value; filtered=ords.filter(o=>o.at.startsWith(m)) }
  if(tab==='year') { const y=document.getElementById('rYear').value; filtered=ords.filter(o=>o.at.startsWith(y)) }
  const hdr='Mã ĐH,Thời gian,Số SP,Tổng tiền,Thanh toán\n';
  const rows=filtered.map(o=>`${o.code},"${dtStr(o.at)}",${o.items.reduce((s,i)=>s+i.qty,0)},${o.total},"${payLbl(o.pay)}"`).join('\n');
  const blob=new Blob(['\uFEFF'+hdr+rows],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`bao-cao-${tab}-${today()}.csv`; a.click();
  toast('Xuất CSV thành công!','s');
}

/* ====================================================
   SETTINGS
   ==================================================== */
function initSettings(){
  document.getElementById('btnSaveSettings').onclick=saveSettings;
  document.getElementById('btnExportData').onclick=()=>{
    const b=new Blob([JSON.stringify(DB.export(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`hoannam-data-${today()}.json`; a.click();
    toast('Xuất dữ liệu thành công!','s');
  };
  document.getElementById('btnImportData').onclick=()=>document.getElementById('importFile').click();
  document.getElementById('importFile').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        doConfirm('Nhập dữ liệu sẽ GHI ĐÈ dữ liệu hiện tại. Tiếp tục?',()=>{ DB.import(d); location.reload() });
      }catch{ toast('File không hợp lệ!','e') }
    }; r.readAsText(f); e.target.value='';
  };
  document.getElementById('btnReset').onclick=()=>doConfirm('⚠️ XÓA TOÀN BỘ dữ liệu? Hành động không thể hoàn tác!',()=>{ DB.reset(); location.reload() });
}
function loadSettings(){
  const s=DB.getSet();
  document.getElementById('sTenCH').value=s.name||'';
  document.getElementById('sDiaChi').value=s.addr||'';
  document.getElementById('sDT').value=s.phone||'';
  document.getElementById('sFooter').value=s.footer||'';
  document.getElementById('storeNameDisplay').textContent=s.name||'Hoàng Nam';
}
function saveSettings(){
  const d={
    name:document.getElementById('sTenCH').value.trim(),
    addr:document.getElementById('sDiaChi').value.trim(),
    phone:document.getElementById('sDT').value.trim(),
    footer:document.getElementById('sFooter').value.trim(),
  };
  DB.saveSet(d);
  document.getElementById('storeNameDisplay').textContent=d.name||'Hoàng Nam';
  toast('Đã lưu cài đặt!','s');
}

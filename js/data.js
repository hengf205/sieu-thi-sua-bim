/* ====================================================
   DATA LAYER – CENTRALIZED SYNC WITH PC SERVER (DB.JSON)
   ==================================================== */

const DB = {
  K: {
    CAT: 'pos_cat',
    PROD: 'pos_prod',
    ORD: 'pos_ord',
    SET: 'pos_set',
    SEQ: 'pos_seq'
  },

  _cache: null,
  _syncListeners: [],

  _g(k) {
    if (this._cache && this._cache[k]) return this._cache[k];
    try { return JSON.parse(localStorage.getItem(k)) } catch { return null }
  },

  _s(k, v) {
    if (!this._cache) this._cache = {};
    this._cache[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
    this.pushToServer();
  },

  // Push local changes to Central PC Server API
  pushToServer() {
    const fullData = {
      cat: this.getCats(),
      prod: this.getProds(),
      ord: this.getOrds(),
      set: this.getSet(),
      seq: this._g(this.K.SEQ) || {}
    };

    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullData)
    }).catch(err => console.log('[DB Sync] Offline or local save fallback:', err));
  },

  // Fetch central database from PC server
  async fetchFromServer() {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.prod || data.cat)) {
          this._cache = {};
          if (data.cat) { this._cache[this.K.CAT] = data.cat; localStorage.setItem(this.K.CAT, JSON.stringify(data.cat)); }
          if (data.prod) { this._cache[this.K.PROD] = data.prod; localStorage.setItem(this.K.PROD, JSON.stringify(data.prod)); }
          if (data.ord) { this._cache[this.K.ORD] = data.ord; localStorage.setItem(this.K.ORD, JSON.stringify(data.ord)); }
          if (data.set) { this._cache[this.K.SET] = data.set; localStorage.setItem(this.K.SET, JSON.stringify(data.set)); }
          if (data.seq) { this._cache[this.K.SEQ] = data.seq; localStorage.setItem(this.K.SEQ, JSON.stringify(data.seq)); }
          return true;
        }
      }
    } catch (e) {
      console.log('[DB] Fetch from server error, using local fallback:', e);
    }
    return false;
  },

  // Connect to real-time Server-Sent Events stream
  initRealtimeSync(onUpdateCallback) {
    if (onUpdateCallback) this._syncListeners.push(onUpdateCallback);

    if (window.EventSource) {
      const evtSource = new EventSource('/api/sync-stream');
      evtSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'sync') {
          console.log('[DB] Real-time sync update received from another device!');
          await this.fetchFromServer();
          this._syncListeners.forEach(fn => fn());
        }
      };
    }
  },

  nextId(e) {
    const s = this._g(this.K.SEQ) || {};
    s[e] = (s[e] || 0) + 1;
    this._s(this.K.SEQ, s);
    return s[e];
  },

  generateProdCode() {
    const seq = this.nextId('prod_code_seq');
    return `SP${String(seq).padStart(5, '0')}`;
  },

  /* ---- Categories ---- */
  getCats() { return this._g(this.K.CAT) || [] },
  addCat(d) { const l = this.getCats(); d.id = this.nextId('c'); l.push(d); this._s(this.K.CAT, l); return d },
  updCat(id, d) { this._s(this.K.CAT, this.getCats().map(c => c.id === id ? { ...c, ...d } : c)) },
  delCat(id) { this._s(this.K.CAT, this.getCats().filter(c => c.id !== id)) },

  /* ---- Products ---- */
  getProds() { return this._g(this.K.PROD) || [] },
  addProd(d) {
    const l = this.getProds();
    d.id = this.nextId('p');
    if (!d.code) d.code = this.generateProdCode();
    if (!d.barcode) d.barcode = '';
    l.push(d);
    this._s(this.K.PROD, l);
    return d;
  },
  updProd(id, d) {
    this._s(this.K.PROD, this.getProds().map(p => p.id === id ? { ...p, ...d } : p));
  },
  delProd(id) { this._s(this.K.PROD, this.getProds().filter(p => p.id !== id)) },
  getProd(id) { return this.getProds().find(p => p.id === id) || null },
  findProdByBarcodeOrCode(query) {
    if (!query) return null;
    const q = query.trim().toLowerCase();
    const prods = this.getProds().filter(p => p.status === 'active');
    let found = prods.find(p => p.barcode && p.barcode.toLowerCase() === q);
    if (found) return found;
    found = prods.find(p => p.code && p.code.toLowerCase() === q);
    return found || null;
  },

  /* ---- Orders ---- */
  getOrds() { return this._g(this.K.ORD) || [] },
  addOrd(d) {
    const l = this.getOrds();
    const seq = this.nextId('o');
    d.id = seq;
    d.code = `HD${String(seq).padStart(5, '0')}`;
    d.at = new Date().toISOString();
    l.push(d);
    this._s(this.K.ORD, l);
    d.items.forEach(i => {
      const p = this.getProd(i.pid);
      if (p) this.updProd(p.id, { stock: Math.max(0, (p.stock || 0) - i.qty) });
    });
    return d;
  },
  getOrd(id) { return this.getOrds().find(o => o.id === id) || null },

  /* ---- Settings ---- */
  getSet() {
    return this._g(this.K.SET) || {
      name: 'Siêu thị Sữa Bỉm Hoàng Nam',
      addr: 'Trung Lạc-Yên Trung-Bắc Ninh',
      phone: '0833 398 3281',
      footer: 'Cảm ơn quý khách và hẹn gặp lại!',
      adminPass: '1234'
    };
  },
  saveSet(d) { this._s(this.K.SET, d) },

  /* ---- Seed Demo Data ---- */
  seed() {
    this.fetchFromServer();
    if (this.getCats().length) return;

    ['Sữa bột', 'Tã bỉm', 'Sữa nước', 'Ăn dặm', 'Đồ dùng cho bé'].forEach(n => this.addCat({ name: n, desc: '' }));
    const cats = this.getCats();

    const sampleProds = [
    ];

    sampleProds.forEach(p => this.addProd(p));

    const prods = this.getProds();
    [[0, 3], [1, 6], [2, 8]].forEach(([pi, di]) => {
      const p = prods[pi];
      const d = new Date();
      d.setDate(d.getDate() - di);
      const items = [{ pid: p.id, name: p.name, price: p.price, qty: 2, unit: p.unit }];
      const sub = items.reduce((s, x) => s + x.price * x.qty, 0);
      const ord = { items, sub, disc: 0, discT: 'amount', total: sub, pay: 'cash', cashIn: sub, change: 0 };
      const l = this.getOrds();
      const seq = this.nextId('o');
      ord.id = seq;
      ord.code = `HD${String(seq).padStart(5, '0')}`;
      ord.at = d.toISOString();
      l.push(ord);
      this._s(this.K.ORD, l);
    });
  }
};

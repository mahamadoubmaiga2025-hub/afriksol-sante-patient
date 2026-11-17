/* AfrikSol Santé — branchement au backend Supabase partagé avec AfrikSol Pro.
   Lit, sans connexion requise : l'annuaire des établissements, le catalogue
   pharmacie (produits, prix, stocks) et les formules d'assurance.
   Les données lues REMPLACENT les données locales équivalentes de data.js
   (mêmes noms dans la démo). En cas d'échec réseau ou hors-ligne, les
   données locales restent affichées : repli intégral, aucune casse.
   Lecture seule — aucune écriture depuis cette couche. */
(function () {
  var SB_URL = 'https://cytpkgaifapsoyfukrpb.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dHBrZ2FpZmFwc295ZnVrcnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTI2NDAsImV4cCI6MjEwNzU4ODY0MH0.uhzOUbWIHqs3My_L82zHTX2F-Mb9FGQn4BS8xFEwYPw';
  var D = window.DATA;
  if (!D || !window.fetch) return;

  function call(path, opts) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
    var o = opts || {};
    o.headers = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };
    if (ctrl) o.signal = ctrl.signal;
    return fetch(SB_URL + path, o).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  Promise.all([
    call('/rest/v1/rpc/directory_organizations', { method: 'POST', body: '{}' }),
    call('/rest/v1/pharmacy_stock?select=org_id,price_fcfa,quantity,products(name,description,unit,requires_prescription)&quantity=gt.0'),
    call('/rest/v1/insurance_plans?select=code,name,price_fcfa,installments&is_active=eq.true')
  ]).then(function (res) {
    var directory = res[0], stock = res[1], plans = res[2];
    if (!Array.isArray(directory) || !Array.isArray(stock) || !stock.length) return;

    /* Pharmacies du backend appariées aux pharmacies locales (par nom) */
    var slugByOrg = {}, matchedSlugs = {};
    directory.filter(function (o) { return o.kind === 'pharmacy'; }).forEach(function (o) {
      var local = D.PHARMACIES.find(function (p) { return p.name === o.name; });
      if (local) { slugByOrg[o.id] = local.id; matchedSlugs[local.id] = true; }
    });
    if (!Object.keys(slugByOrg).length) return;

    /* Nombre d'autres pharmacies proposant le même produit */
    var byProduct = {};
    stock.forEach(function (s) {
      if (!s.products || !slugByOrg[s.org_id]) return;
      (byProduct[s.products.name] = byProduct[s.products.name] || {})[s.org_id] = true;
    });

    /* Médicaments : ceux des pharmacies appariées viennent du backend,
       ceux des autres pharmacies restent locaux */
    var kept = D.MEDICINES.filter(function (m) { return !matchedSlugs[m.ph]; });
    var fromBackend = stock.filter(function (s) { return s.products && slugByOrg[s.org_id]; }).map(function (s) {
      var slug = slugByOrg[s.org_id], name = s.products.name;
      var local = D.MEDICINES.find(function (m) { return m.name === name && m.ph === slug; });
      var others = Object.keys(byProduct[name] || {}).filter(function (k) { return k !== s.org_id; }).length;
      if (local) {
        var clone = Object.assign({}, local);
        clone.price = s.price_fcfa;
        clone.rx = !!s.products.requires_prescription;
        clone.more = others;
        clone.fromBackend = true;
        return clone;
      }
      var label = ((s.products.description || '') + (s.products.unit ? ' · ' + s.products.unit : '')).trim();
      return {
        id: 'sb-' + Math.abs(name.split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) >>> 0; }, 7)).toString(36) + '-' + slug,
        name: name, cls: { fr: label, en: label, ar: label },
        price: s.price_fcfa, ph: slug, more: others,
        rx: !!s.products.requires_prescription, fromBackend: true
      };
    });
    D.MEDICINES.length = 0;
    kept.concat(fromBackend).forEach(function (m) { D.MEDICINES.push(m); });

    /* Assurance : la formule complémentaire du backend fait foi */
    var comp = (plans || []).find(function (p) { return p.code === 'COMPLEMENTAIRE'; });
    if (comp && comp.price_fcfa > 0 && Array.isArray(comp.installments)) {
      var plansMap = {};
      comp.installments.forEach(function (n) {
        var base = Math.floor(comp.price_fcfa / n), arr = [];
        for (var i = 0; i < n; i++) arr.push(i === n - 1 ? comp.price_fcfa - base * (n - 1) : base);
        plansMap[n] = arr;
      });
      D.INSURANCE.annual = comp.price_fcfa;
      D.INSURANCE.plans = plansMap;
    }

    window.AFK_BACKEND = { connected: true, source: 'supabase', pharmacies: Object.keys(slugByOrg).length, produits: fromBackend.length };
    if (window.console) console.info('[AfrikSol] Catalogue chargé depuis le backend partagé :', window.AFK_BACKEND);

    /* Si l'écran pharmacie est déjà affiché, le rafraîchir avec les données du backend */
    var h = (window.location && window.location.hash) || '';
    if ((h.indexOf('#/pharmacy') === 0 || h.indexOf('#/pharmacies') === 0) && typeof window.route === 'function') {
      try { window.route(); } catch (e) { /* l'écran se mettra à jour à la prochaine navigation */ }
    }
  }).catch(function () {
    window.AFK_BACKEND = { connected: false };
    /* Repli : les données locales de démonstration restent affichées. */
  });
})();

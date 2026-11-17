/* AfrikSol Santé — branchement au backend Supabase partagé avec AfrikSol Pro.
   Deux couches, sans aucune dépendance externe :
   1. AFK : authentification e-mail (Supabase Auth), dossier patient lié,
      et synchronisation des écritures (commandes, rendez-vous, assurance)
      vers la base partagée quand un compte est connecté.
   2. Catalogue : annuaire, produits/prix/stocks des pharmacies et formules
      d'assurance lus depuis le backend (même sans connexion) ; ils
      remplacent les données locales équivalentes de data.js.
   Repli intégral : hors-ligne ou en échec, l'app fonctionne sur ses
   données locales de démonstration, comme avant. */
(function () {
  var SB_URL = 'https://cytpkgaifapsoyfukrpb.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dHBrZ2FpZmFwc295ZnVrcnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTI2NDAsImV4cCI6MjEwNzU4ODY0MH0.uhzOUbWIHqs3My_L82zHTX2F-Mb9FGQn4BS8xFEwYPw';
  var SKEY = 'afk2_session', PKEY = 'afk2_patient';

  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch (e) {} }
  function first(d) { return Array.isArray(d) ? d[0] : d; }
  function normalizeName(n) { return String(n || '').split('—')[0].trim().toLowerCase(); }
  var PROVIDERS = { 'Orange Money': 'orange_money', 'Moov Money': 'moov_money', 'Telecel Money': 'telecel_money' };
  function mapOp(opName) { return PROVIDERS[opName] || 'simulated'; }

  var AFK = {
    orgByName: {},
    plansByCode: {},
    session: function () { return lsGet(SKEY); },
    patient: function () { return lsGet(PKEY); },
    connected: function () { var s = lsGet(SKEY); return !!(s && s.access_token && s.user); }
  };
  window.AFK = AFK;

  function saveAuth(data, email) {
    if (!data || !data.access_token || !data.user) return null;
    var s = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      user: { id: data.user.id, email: data.user.email || email, name: (data.user.user_metadata && data.user.user_metadata.full_name) || '' }
    };
    lsSet(SKEY, s);
    return s;
  }

  function fresh() {
    var s = AFK.session();
    if (!s || !s.refresh_token || !s.expires_at || s.expires_at > Date.now() + 60000) return Promise.resolve();
    return fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.access_token) saveAuth(d, s.user.email);
    }).catch(function () {});
  }

  function call(path, opts, auth) {
    var run = function () {
      var o = opts || {};
      var s = AFK.session();
      o.headers = { apikey: SB_ANON, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (auth && s ? s.access_token : SB_ANON) };
      if (o.prefer) { o.headers.Prefer = o.prefer; delete o.prefer; }
      if (o.body && typeof o.body !== 'string') o.body = JSON.stringify(o.body);
      return fetch(SB_URL + path, o).then(function (r) {
        return r.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
          if (!r.ok) {
            var msg = (data && (data.message || data.msg || data.error_description || data.error)) || ('HTTP ' + r.status);
            var err = new Error(msg); err.status = r.status; err.data = data; throw err;
          }
          return data;
        });
      });
    };
    return auth ? fresh().then(run) : run();
  }
  function rest(path, opts) { return call('/rest/v1' + path, opts, true); }
  function rpc(name, args) { return call('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} }, true); }
  AFK.rest = rest; AFK.rpc = rpc;

  /* ---------------- Authentification e-mail ---------------- */
  AFK.signUp = function (email, password, fullName) {
    return call('/auth/v1/signup', { method: 'POST', body: { email: email, password: password, data: { full_name: fullName } } }, false)
      .then(function (data) {
        var s = saveAuth(data, email);
        if (!s) throw new Error('Compte créé, mais la session n\'a pas démarré. Essayez de vous connecter.');
        return AFK.ensurePatient(fullName);
      });
  };
  AFK.signIn = function (email, password) {
    return call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }, false)
      .then(function (data) {
        var s = saveAuth(data, email);
        if (!s) throw new Error('Connexion impossible.');
        return AFK.loadPatient().then(function (p) {
          if (p) return p;
          var fallback = s.user.name || String(email).split('@')[0];
          return AFK.ensurePatient(fallback);
        });
      });
  };
  AFK.signOut = function () {
    lsSet(SKEY, null); lsSet(PKEY, null);
    return call('/auth/v1/logout', { method: 'POST' }, true).catch(function () {});
  };
  AFK.loadPatient = function () {
    var s = AFK.session();
    if (!s) return Promise.resolve(null);
    var cached = AFK.patient();
    if (cached && cached.user_id === s.user.id) return Promise.resolve(cached);
    return rest('/patients?user_id=eq.' + s.user.id + '&select=*').then(function (rows) {
      var p = first(rows) || null;
      if (p) lsSet(PKEY, p);
      return p;
    });
  };
  AFK.ensurePatient = function (fullName) {
    return rpc('register_patient', { p_full_name: fullName }).then(function (p) {
      p = first(p);
      if (p) lsSet(PKEY, p);
      return p;
    });
  };

  /* ---------------- Écritures vers la base partagée ---------------- */
  function payFor(purpose, refId, amount, providerName, extra) {
    var s = AFK.session(), p = AFK.patient();
    var body = { user_id: s.user.id, patient_id: p.id, purpose: purpose, reference_id: refId, provider: mapOp(providerName), amount_fcfa: amount };
    if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
    return rest('/payments', { method: 'POST', prefer: 'return=representation', body: body }).then(function (pay) {
      pay = first(pay);
      return rpc('confirm_payment_simulated', { p_payment_id: pay.id }).then(function () { return pay; });
    });
  }

  /* Commande du panier : une commande backend par pharmacie concernée
     (les articles purement locaux, sans orgId, restent locaux). */
  AFK.syncOrder = function (o) {
    if (!AFK.connected() || !AFK.patient() || !o) return Promise.resolve(null);
    var D = window.DATA || {};
    var groups = {};
    Object.keys(o.items || {}).forEach(function (mid) {
      var m = (D.MEDICINES || []).find(function (x) { return x.id === mid; });
      if (!m || !m.orgId) return;
      (groups[m.orgId] = groups[m.orgId] || []).push({ med: m, qty: o.items[mid] });
    });
    var orgIds = Object.keys(groups);
    if (!orgIds.length) return Promise.resolve(null);
    var s = AFK.session(), p = AFK.patient(), feeGiven = false, receipts = [];
    return orgIds.reduce(function (chain, orgId) {
      return chain.then(function () {
        var items = groups[orgId];
        var sub = items.reduce(function (a, it) { return a + it.med.price * it.qty; }, 0);
        var fee = (o.mode === 'delivery' && !feeGiven) ? 1000 : 0;
        feeGiven = true;
        var body = {
          patient_id: p.id, ordered_by: s.user.id, pharmacy_org_id: orgId,
          status: 'pending_payment', fulfillment: o.mode === 'delivery' ? 'delivery' : 'pickup',
          subtotal_fcfa: sub, delivery_fee_fcfa: fee, total_fcfa: sub + fee,
          delivery_address: o.addr || null, contact_phone: (o.pay && o.pay.tel) || null
        };
        return rest('/orders', { method: 'POST', prefer: 'return=representation', body: body }).then(function (ord) {
          ord = first(ord);
          var lines = items.map(function (it) {
            return { order_id: ord.id, product_id: it.med.productId || null, product_name: it.med.name, unit_price_fcfa: it.med.price, quantity: it.qty };
          });
          return rest('/order_items', { method: 'POST', body: lines }).then(function () {
            return payFor('order', ord.id, sub + fee, o.pay && o.pay.op, { order_id: ord.id });
          }).then(function (pay) {
            return rest('/receipts?payment_id=eq.' + pay.id + '&select=number').then(function (rc) {
              var r = first(rc);
              receipts.push({ order: ord.id, receipt: r ? r.number : null });
            }).catch(function () { receipts.push({ order: ord.id, receipt: null }); });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (window.console) console.info('[AfrikSol] Commande(s) enregistrée(s) dans la base partagée :', receipts);
      return receipts;
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Synchronisation de la commande en échec (commande locale conservée) :', e.message);
      return null;
    });
  };

  /* Rendez-vous : réservation réelle + paiement des frais si payé en mobile */
  AFK.syncAppt = function (a) {
    if (!AFK.connected() || !AFK.patient() || !a) return Promise.resolve(null);
    var orgId = AFK.orgByName[normalizeName(a.facility)];
    if (!orgId) return Promise.resolve(null);
    var note = (a.doctor || '') + (a.spec ? ' · ' + a.spec : '');
    return rpc('book_appointment', { p_org_id: orgId, p_scheduled_at: new Date(a.when).toISOString(), p_note: note })
      .then(function (appt) {
        appt = first(appt);
        if (appt && a.pay) {
          return payFor('appointment', appt.id, a.fee, a.pay.op, { appointment_id: appt.id }).then(function () { return appt; });
        }
        return appt;
      }).then(function (appt) {
        if (window.console) console.info('[AfrikSol] Rendez-vous enregistré dans la base partagée :', appt && appt.id);
        return appt;
      }).catch(function (e) {
        if (window.console) console.warn('[AfrikSol] Synchronisation du rendez-vous en échec (rendez-vous local conservé) :', e.message);
        return null;
      });
  };

  /* Assurance : souscription + échéances */
  AFK.syncInsurance = function (planN, amount, pay) {
    if (!AFK.connected() || !AFK.patient()) return Promise.resolve(null);
    var plan = AFK.plansByCode['COMPLEMENTAIRE'];
    if (!plan) return Promise.resolve(null);
    var s = AFK.session(), p = AFK.patient();
    var total = plan.price_fcfa;
    return rest('/insurance_subscriptions', {
      method: 'POST', prefer: 'return=representation',
      body: { patient_id: p.id, plan_id: plan.id, status: 'pending_payment', total_fcfa: total, installments_total: planN, installments_paid: 0, created_by: s.user.id }
    }).then(function (sub) {
      sub = first(sub);
      return payFor('insurance', sub.id, amount, pay && pay.op).then(function () { return sub; });
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Synchronisation de l\'assurance en échec (locale conservée) :', e.message);
      return null;
    });
  };
  AFK.syncInstallment = function (subId, amount) {
    if (!AFK.connected() || !AFK.patient() || !subId) return Promise.resolve(null);
    return payFor('insurance', subId, amount, null).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Échéance assurance non synchronisée :', e.message);
      return null;
    });
  };

  /* ---------------- Catalogue depuis le backend ---------------- */
  var D = window.DATA;
  if (!D || !window.fetch) return;

  function pub(path, opts) {
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
    pub('/rest/v1/rpc/directory_organizations', { method: 'POST', body: '{}' }),
    pub('/rest/v1/pharmacy_stock?select=org_id,price_fcfa,quantity,products(id,name,description,unit,requires_prescription)&quantity=gt.0'),
    pub('/rest/v1/insurance_plans?select=id,code,name,price_fcfa,installments&is_active=eq.true')
  ]).then(function (res) {
    var directory = res[0], stock = res[1], plans = res[2];

    /* Annuaire complet (sert aussi à relier les rendez-vous aux établissements) */
    if (Array.isArray(directory)) {
      directory.forEach(function (o) { AFK.orgByName[normalizeName(o.name)] = o.id; });
    }
    /* Formules d'assurance par code */
    if (Array.isArray(plans)) {
      plans.forEach(function (pl) { AFK.plansByCode[pl.code] = pl; });
    }
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
        clone.orgId = s.org_id;
        clone.productId = s.products.id;
        clone.fromBackend = true;
        return clone;
      }
      var label = ((s.products.description || '') + (s.products.unit ? ' · ' + s.products.unit : '')).trim();
      return {
        id: 'sb-' + Math.abs(name.split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) >>> 0; }, 7)).toString(36) + '-' + slug,
        name: name, cls: { fr: label, en: label, ar: label },
        price: s.price_fcfa, ph: slug, more: others,
        rx: !!s.products.requires_prescription,
        orgId: s.org_id, productId: s.products.id, fromBackend: true
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

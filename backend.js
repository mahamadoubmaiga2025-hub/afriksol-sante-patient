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
  /* Messages traduits : backend.js n'a pas accès au t() d'app.js — on lit
     la langue mémorisée (afk2_lang) et le dictionnaire global window.I18N. */
  function msg(key) {
    var lang = 'fr';
    try { lang = JSON.parse(localStorage.getItem('afk2_lang')) || 'fr'; } catch (e) {}
    var d = window.I18N || {};
    return (d[lang] && d[lang][key]) || (d.fr && d.fr[key]) || key;
  }
  var PROVIDERS = { 'Orange Money': 'orange_money', 'Moov Money': 'moov_money', 'Telecel Money': 'telecel_money' };
  function mapOp(opName) { return PROVIDERS[opName] || 'simulated'; }

  var FKEY = 'afk2_family';
  var AFK = {
    orgByName: {},
    nameByOrg: {},
    slugByOrg: {},
    plansByCode: {},
    session: function () { return lsGet(SKEY); },
    patient: function () { return lsGet(PKEY); },
    familyMap: function () { return lsGet(FKEY) || {}; },
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
        if (!s) throw new Error(msg('err_session'));
        return AFK.ensurePatient(fullName);
      });
  };
  AFK.signIn = function (email, password) {
    return call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }, false)
      .then(function (data) {
        var s = saveAuth(data, email);
        if (!s) throw new Error(msg('err_signin'));
        return AFK.loadPatient().then(function (p) {
          if (p) return p;
          var fallback = s.user.name || String(email).split('@')[0];
          return AFK.ensurePatient(fallback);
        }).then(function (p) {
          AFK.pullHistory();
          return p;
        });
      });
  };
  AFK.signOut = function () {
    lsSet(SKEY, null); lsSet(PKEY, null); lsSet(FKEY, null);
    return call('/auth/v1/logout', { method: 'POST' }, true).catch(function () {});
  };
  /* Mot de passe oublié : Supabase envoie le lien de réinitialisation
     par e-mail (endpoint /auth/v1/recover). redirect_to explicite vers
     l'origine courante du site : sans lui, Supabase retombe sur la
     Site URL du projet (restée sur localhost en développement). */
  AFK.resetPassword = function (email) {
    return call('/auth/v1/recover', { method: 'POST', body: { email: email, redirect_to: window.location.origin + '/' } }, false);
  };
  /* Nouveau mot de passe après clic sur le lien de réinitialisation :
     PUT /auth/v1/user avec le jeton de récupération reçu dans le lien
     (en-tête Authorization dédié — ce n'est pas la session stockée). */
  AFK.setRecoveredPassword = function (token, password) {
    return fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: SB_ANON, 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ password: password })
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) {
          var m = (data && (data.message || data.msg || data.error_description || data.error)) || ('HTTP ' + r.status);
          var err = new Error(m); err.status = r.status; err.data = data; throw err;
        }
        return data;
      });
    });
  };
  AFK.loadPatient = function () {
    var s = AFK.session();
    if (!s) return Promise.resolve(null);
    var cached = AFK.patient();
    if (cached && cached.user_id === s.user.id) { AFK.applyRealProfile(cached); return Promise.resolve(cached); }
    return rest('/patients?user_id=eq.' + s.user.id + '&select=*').then(function (rows) {
      var p = first(rows) || null;
      if (p) { lsSet(PKEY, p); AFK.applyRealProfile(p); }
      return p;
    });
  };
  AFK.ensurePatient = function (fullName) {
    return rpc('register_patient', { p_full_name: fullName }).then(function (p) {
      p = first(p);
      if (p) { lsSet(PKEY, p); AFK.applyRealProfile(p); }
      return p;
    });
  };
  /* Identité réelle : quand un compte est connecté, le profil local « me »
     lu par prof()/cur() (accueil, carte santé + QR, SOS, dossier, famille)
     est alimenté par le dossier patient du backend — nom, numéro de carte
     santé, date de naissance, groupe sanguin et allergie si connus — au
     lieu du profil de démonstration. Point d'injection unique : appelé par
     loadPatient/ensurePatient et au démarrage (dossier en cache local). */
  AFK.applyRealProfile = function (p) {
    var D = window.DATA;
    if (!D || !D.PROFILES || !p) return;
    var me = null;
    D.PROFILES.forEach(function (x) { if (x.id === 'me') me = x; });
    if (!me) return;
    var fn = p.first_name || '', ln = p.last_name || '';
    if (!fn && !ln && p.full_name) {
      var parts = String(p.full_name).trim().split(/\s+/);
      fn = parts[0] || ''; ln = parts.slice(1).join(' ');
    }
    if (fn) me.first = fn;
    if (ln) me.last = ln;
    if (p.health_id) me.num = p.health_id;
    var born = p.birth_date || p.date_of_birth || p.born;
    if (born) me.born = String(born).slice(0, 10);
    if (p.sex) me.sex = p.sex;
    var blood = p.blood_group || p.blood;
    if (blood) me.blood = blood;
    me.real = true;
    /* Allergie connue la plus récente (affichée notamment sur l'écran SOS) */
    rest('/allergies?patient_id=eq.' + p.id + '&select=label&order=recorded_at.desc&limit=1').then(function (rows) {
      var a = first(rows);
      if (a && a.label) me.allergy = { fr: a.label, en: a.label, ar: a.label };
    }).catch(function () {});
  };
  /* Démarrage : session + dossier déjà en cache local → identité réelle
     injectée immédiatement, avant le premier écran. */
  (function () {
    var cachedP = AFK.patient();
    if (AFK.connected() && cachedP) AFK.applyRealProfile(cachedP);
  })();
  /* Membre de famille : créé dans la base à la première synchronisation
     le concernant, relié au titulaire (patient_family_members). */
  AFK.ensureFamilyMember = function (profile) {
    var fam = AFK.familyMap();
    if (fam[profile.id]) return Promise.resolve(fam[profile.id]);
    return rpc('register_family_member', {
      p_full_name: (profile.first + ' ' + profile.last).trim(),
      p_relationship: 'child',
      p_birth_date: profile.born || null,
      p_sex: profile.sex || null
    }).then(function (m) {
      m = first(m);
      if (m) { fam[profile.id] = m; lsSet(FKEY, fam); }
      return m;
    });
  };
  /* Résout le dossier backend correspondant à un profil local de l'app */
  AFK.patientFor = function (pid) {
    if (!pid || pid === 'me') return AFK.loadPatient();
    var fam = AFK.familyMap();
    if (fam[pid]) return Promise.resolve(fam[pid]);
    var prof = ((window.DATA || {}).PROFILES || []).find(function (x) { return x.id === pid; });
    if (!prof) return Promise.resolve(null);
    return AFK.ensureFamilyMember(prof);
  };

  /* ---------------- Écritures vers la base partagée ---------------- */
  function payFor(purpose, refId, amount, providerName, extra, beneficiary) {
    var s = AFK.session(), p = beneficiary || AFK.patient();
    var body = { user_id: s.user.id, patient_id: p.id, purpose: purpose, reference_id: refId, provider: mapOp(providerName), amount_fcfa: amount };
    if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
    return rest('/payments', { method: 'POST', prefer: 'return=representation', body: body }).then(function (pay) {
      pay = first(pay);
      return rpc('confirm_payment_simulated', { p_payment_id: pay.id }).then(function () { return pay; });
    });
  }

  /* Échec de synchronisation : app.js est prévenu (événement
     « afk-sync-fail ») pour marquer l'élément « en attente », afficher un
     message discret et réessayer au retour du réseau. */
  function syncFailed(kind, ref) {
    try { window.dispatchEvent(new CustomEvent('afk-sync-fail', { detail: { kind: kind, ref: ref || null } })); } catch (e) {}
  }

  /* Commande du panier : une commande backend par pharmacie concernée
     (les articles purement locaux, sans orgId, restent locaux).
     Le bénéficiaire est le profil de la commande (moi ou un membre). */
  AFK.syncOrder = function (o) {
    if (!AFK.connected() || !o) return Promise.resolve(null);
    return AFK.patientFor(o.pid).then(function (p) {
      if (!p) return null;
      return syncOrderFor(o, p);
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Commande non synchronisée :', e.message);
      syncFailed('order', o && o.id);
      return null;
    });
  };
  function syncOrderFor(o, p) {
    var D = window.DATA || {};
    var groups = {};
    Object.keys(o.items || {}).forEach(function (mid) {
      var m = (D.MEDICINES || []).find(function (x) { return x.id === mid; });
      if (!m || !m.orgId) return;
      (groups[m.orgId] = groups[m.orgId] || []).push({ med: m, qty: o.items[mid] });
    });
    var orgIds = Object.keys(groups);
    if (!orgIds.length) return Promise.resolve(null);
    var s = AFK.session(), feeGiven = false, receipts = [];
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
            return payFor('order', ord.id, sub + fee, o.pay && o.pay.op, { order_id: ord.id }, p);
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
      syncFailed('order', o && o.id);
      return null;
    });
  };

  /* Rendez-vous : réservation réelle + paiement des frais si payé en mobile */
  AFK.syncAppt = function (a) {
    if (!AFK.connected() || !a) return Promise.resolve(null);
    var orgId = AFK.orgByName[normalizeName(a.facility)];
    if (!orgId) return Promise.resolve(null);
    var note = (a.doctor || '') + (a.spec ? ' · ' + a.spec : '');
    return AFK.patientFor(a.pid).then(function (p) {
      if (!p) return null;
      var args = { p_org_id: orgId, p_scheduled_at: new Date(a.when).toISOString(), p_note: note };
      var book = (a.pid && a.pid !== 'me')
        ? rpc('book_appointment_for', Object.assign({ p_patient_id: p.id }, args))
        : rpc('book_appointment', args);
      return book.then(function (appt) {
        appt = first(appt);
        if (appt && a.pay) {
          return payFor('appointment', appt.id, a.fee, a.pay.op, { appointment_id: appt.id }, p).then(function () { return appt; });
        }
        return appt;
      });
    }).then(function (appt) {
      if (appt && window.console) console.info('[AfrikSol] Rendez-vous enregistré dans la base partagée :', appt.id);
      return appt;
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Synchronisation du rendez-vous en échec (rendez-vous local conservé) :', e.message);
      syncFailed('appt', a && a.id);
      return null;
    });
  };

  /* Annuaire réel : médecins d'un établissement (RPC directory_doctors,
     réservée aux comptes connectés). Échec doux : liste vide. */
  AFK.directoryDoctors = function (orgId) {
    if (!orgId) return Promise.resolve([]);
    return rpc('directory_doctors', { p_org_id: orgId }).then(function (rows) {
      return Array.isArray(rows) ? rows : [];
    }).catch(function () { return []; });
  };
  /* Créneaux d'un médecin pour un jour (RPC get_free_slots) : lignes
     { slot_at, is_free }. Les erreurs sont propagées : l'appelant s'en sert
     pour décider de retomber sur le flux de démonstration. */
  AFK.freeSlots = function (patientId, doctorId, dayISO) {
    if (!patientId || !doctorId || !dayISO) return Promise.reject(new Error('Paramètres manquants'));
    return rpc('get_free_slots', { p_patient_id: patientId, p_doctor_id: doctorId, p_day: dayISO })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  };

  /* Assurance : souscription + échéances (pour le profil concerné) */
  AFK.syncInsurance = function (planN, amount, pay, pid) {
    if (!AFK.connected()) return Promise.resolve(null);
    var plan = AFK.plansByCode['COMPLEMENTAIRE'];
    if (!plan) return Promise.resolve(null);
    var s = AFK.session();
    return AFK.patientFor(pid || 'me').then(function (p) {
      if (!p) return null;
      return rest('/insurance_subscriptions', {
        method: 'POST', prefer: 'return=representation',
        body: { patient_id: p.id, plan_id: plan.id, status: 'pending_payment', total_fcfa: plan.price_fcfa, installments_total: planN, installments_paid: 0, created_by: s.user.id }
      }).then(function (sub) {
        sub = first(sub);
        return payFor('insurance', sub.id, amount, pay && pay.op, null, p).then(function () { return sub; });
      });
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Synchronisation de l\'assurance en échec (locale conservée) :', e.message);
      syncFailed('insurance', pid || 'me');
      return null;
    });
  };
  AFK.syncInstallment = function (subId, amount, pid) {
    if (!AFK.connected() || !subId) return Promise.resolve(null);
    return AFK.patientFor(pid || 'me').then(function (p) {
      if (!p) return null;
      return payFor('insurance', subId, amount, null, null, p);
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Échéance assurance non synchronisée :', e.message);
      syncFailed('insurance', pid || 'me');
      return null;
    });
  };

  /* ---------------- Historique relu depuis la base partagée ----------------
     Commandes, rendez-vous, assurance et notifications du compte (moi +
     membres de famille connus) convertis dans les formats locaux de l'app
     et fusionnés via window.AFK_MERGE (défini par app.js). */
  AFK.pullHistory = function () {
    if (!AFK.connected()) return Promise.resolve(null);
    return AFK.loadPatient().then(function (me) {
      if (!me) return null;
      var fam = AFK.familyMap();
      var localByPatient = {};
      localByPatient[me.id] = 'me';
      Object.keys(fam).forEach(function (lid) { if (fam[lid] && fam[lid].id) localByPatient[fam[lid].id] = lid; });
      var inList = Object.keys(localByPatient).join(',');
      var s = AFK.session();
      return Promise.all([
        rest('/orders?patient_id=in.(' + inList + ')&select=*,order_items(*)&order=created_at.desc&limit=50'),
        rest('/payments?user_id=eq.' + s.user.id + '&select=*'),
        rest('/receipts?select=number,payment_id'),
        rest('/appointments?patient_id=in.(' + inList + ')&select=*&order=scheduled_at.desc&limit=50'),
        rest('/insurance_subscriptions?patient_id=in.(' + inList + ')&select=*&order=created_at.desc'),
        rest('/notifications?user_id=eq.' + s.user.id + '&select=*&order=created_at.desc&limit=30')
      ]).then(function (res) {
        var orders = res[0] || [], payments = res[1] || [], receipts = res[2] || [],
            appts = res[3] || [], subs = res[4] || [], notifs = res[5] || [];
        var payByOrder = {}, payByAppt = {}, rcByPay = {};
        payments.forEach(function (p) { if (p.order_id) payByOrder[p.order_id] = p; if (p.appointment_id) payByAppt[p.appointment_id] = p; });
        receipts.forEach(function (r) { rcByPay[r.payment_id] = r.number; });
        var D = window.DATA || { MEDICINES: [], PHARMACIES: [], SPECIALTIES: [] };
        var OP_NAMES = { orange_money: 'Orange Money', moov_money: 'Moov Money', telecel_money: 'Telecel Money', simulated: 'Paiement simulé' };
        function medFor(item, orgId) {
          var m = (D.MEDICINES || []).find(function (x) { return x.productId && item.product_id && x.productId === item.product_id; });
          if (m) return m;
          var nm = {
            id: 'sbp-' + String(item.product_id || item.id || '').slice(0, 8),
            name: item.product_name, cls: { fr: '', en: '', ar: '' },
            price: item.unit_price_fcfa, ph: AFK.slugByOrg[orgId] || (D.PHARMACIES[0] && D.PHARMACIES[0].id) || 'etoile',
            more: 0, orgId: orgId, productId: item.product_id || null, fromBackend: true
          };
          D.MEDICINES.push(nm);
          return nm;
        }
        var mOrders = orders.filter(function (o) { return o.status !== 'cancelled'; }).map(function (o) {
          var items = {};
          (o.order_items || []).forEach(function (it) { var m = medFor(it, o.pharmacy_org_id); items[m.id] = (items[m.id] || 0) + it.quantity; });
          var pay = payByOrder[o.id];
          var out = {
            id: 'CMD-' + o.id.replace(/-/g, '').slice(-6).toUpperCase(),
            pid: localByPatient[o.patient_id] || 'me', items: items,
            total: o.total_fcfa, mode: o.fulfillment, at: new Date(o.created_at).getTime(),
            addr: o.delivery_address || '', ns: 0,
            pay: pay ? { ref: rcByPay[pay.id] || ('PAY-' + pay.id.slice(0, 8).toUpperCase()), op: OP_NAMES[pay.provider] || pay.provider, paid: o.total_fcfa, tel: o.contact_phone || '' } : null,
            sb: true, sbId: o.id, sbStatus: o.status
          };
          if (o.status === 'delivered') { out.done = new Date(o.updated_at).getTime(); out.ns = 99; }
          return out;
        });
        var mAppts = appts.map(function (a) {
          var parts = String(a.note || '').split(' · ');
          var spec = (parts.length > 1 && (D.SPECIALTIES || []).indexOf(parts[1]) >= 0) ? parts[1] : 'gen';
          var pay = payByAppt[a.id];
          var fee = pay ? pay.amount_fcfa : 0;
          return {
            id: 'SB-' + a.id.slice(0, 8).toUpperCase(), pid: localByPatient[a.patient_id] || 'me',
            doctor: parts[0] || '—', spec: spec, facility: AFK.nameByOrg[a.org_id] || 'Établissement',
            when: new Date(a.scheduled_at).getTime(), fee: fee,
            mode: a.paid ? 'mobile' : 'onsite',
            pay: (a.paid && pay) ? { ref: rcByPay[pay.id] || ('PAY-' + pay.id.slice(0, 8).toUpperCase()), op: OP_NAMES[pay.provider] || pay.provider, paid: fee, tel: '' } : null,
            payAt: pay ? new Date(pay.created_at).getTime() : null,
            status: a.status === 'cancelled' ? 'cx' : 'ok',
            created: new Date(a.created_at).getTime(), sb: true, sbId: a.id
          };
        });
        var insByProfile = {};
        subs.forEach(function (sb) {
          var lid = localByPatient[sb.patient_id];
          if (!lid || insByProfile[lid] || sb.status === 'cancelled') return;
          insByProfile[lid] = {
            plan: sb.installments_total, paid: sb.installments_paid,
            start: sb.start_date ? new Date(sb.start_date).getTime() : new Date(sb.created_at).getTime(),
            ref: 'SB-' + sb.id.slice(0, 6).toUpperCase(), sbSub: sb.id, sb: true
          };
        });
        var ICONS = { payment: 'receipt', order: 'bag', appointment: 'calendar', insurance: 'shield', system: 'bell' };
        var mNotifs = notifs.map(function (n) {
          return { icon: ICONS[n.kind] || 'bell', title: n.title, body: n.body || '', at: new Date(n.created_at).getTime(), read: !!n.read_at, sbId: n.id };
        });
        if (window.AFK_MERGE) window.AFK_MERGE({ orders: mOrders, appts: mAppts, insByProfile: insByProfile, notifs: mNotifs });
        if (window.console) console.info('[AfrikSol] Historique relu depuis la base partagée :', mOrders.length, 'commande(s),', mAppts.length, 'rendez-vous,', mNotifs.length, 'notification(s)');
        AFK.pullRecords(localByPatient);
        return { orders: mOrders.length, appts: mAppts.length };
      });
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Historique non chargé :', e.message);
      return null;
    });
  };

  /* ---------------- Dossier médical relu depuis la base partagée ----------------
     Consultations, ordonnances, vaccins, allergies, maladies chroniques et
     constantes des dossiers accessibles (moi + famille), injectés dans les
     rubriques du Dossier de l'app (DATA.RECORDS, lus en direct par l'écran). */
  AFK.pullRecords = function (localByPatient) {
    var D = window.DATA;
    if (!D || !D.RECORDS || !localByPatient) return Promise.resolve(null);
    var ids = Object.keys(localByPatient);
    if (!ids.length) return Promise.resolve(null);
    var inList = ids.join(',');
    return Promise.all([
      rest('/consultations?patient_id=in.(' + inList + ')&select=*&order=created_at.desc&limit=50'),
      rest('/vaccinations?patient_id=in.(' + inList + ')&select=*&order=administered_at.desc&limit=50'),
      rest('/allergies?patient_id=in.(' + inList + ')&select=*&order=recorded_at.desc&limit=50'),
      rest('/chronic_conditions?patient_id=in.(' + inList + ')&select=*&order=recorded_at.desc&limit=50'),
      rest('/vital_signs?patient_id=in.(' + inList + ')&select=*&order=measured_at.desc&limit=50')
    ]).then(function (res) {
      var cons = res[0] || [];
      var consIds = cons.map(function (c) { return c.id; });
      var rxPromise = consIds.length
        ? rest('/prescriptions?consultation_id=in.(' + consIds.join(',') + ')&select=*,prescription_items(*)')
        : Promise.resolve([]);
      return rxPromise.then(function (rxs) {
        var consById = {};
        cons.forEach(function (c) { consById[c.id] = c; });
        var SECTIONS = ['reports', 'rx', 'vacc', 'allergy', 'chronic', 'vitals'];
        Object.keys(localByPatient).forEach(function (uuid) {
          var pid = localByPatient[uuid], R = D.RECORDS[pid];
          if (!R) return;
          SECTIONS.forEach(function (s) { if (R[s]) R[s] = R[s].filter(function (x) { return !x.sb; }); });
        });
        function push(pid, section, item) {
          var R = D.RECORDS[pid] = D.RECORDS[pid] || {};
          var arr = R[section] = R[section] || [];
          if (!arr.some(function (x) { return x.sbId === item.sbId; })) arr.unshift(item);
        }
        function dstr(ts) {
          try { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
        }
        function orgName(orgId) { return AFK.nameByOrg[orgId] || 'AfrikSol'; }
        var DONE = { fr: 'Terminé', en: 'Completed', ar: 'مكتمل' };
        var OKL = { fr: 'Normal', en: 'Normal', ar: 'طبيعي' };
        cons.forEach(function (c) {
          var pid = localByPatient[c.patient_id];
          if (!pid) return;
          push(pid, 'reports', {
            t: { fr: c.motif || 'Consultation' },
            s: { fr: orgName(c.org_id) + ' · ' + dstr(c.created_at) + (c.notes ? ' · ' + c.notes : '') },
            b: ['green', DONE], sb: true, sbId: 'cons-' + c.id
          });
        });
        (rxs || []).forEach(function (rx) {
          var c = consById[rx.consultation_id];
          if (!c) return;
          var pid = localByPatient[c.patient_id];
          if (!pid) return;
          (rx.prescription_items || []).forEach(function (it) {
            push(pid, 'rx', {
              t: { fr: it.drug_name },
              s: { fr: [it.dosage, it.frequency, it.duration].filter(Boolean).join(' · ') + (rx.created_at ? ' — ' + dstr(rx.created_at) : '') },
              b: ['green', OKL], sb: true, sbId: 'rx-' + it.id
            });
          });
        });
        (res[1] || []).forEach(function (v) {
          var pid = localByPatient[v.patient_id];
          if (!pid) return;
          push(pid, 'vacc', {
            t: { fr: v.vaccine_name },
            s: { fr: orgName(v.org_id) + ' · ' + dstr(v.administered_at) + (v.dose_label ? ' · ' + v.dose_label : '') },
            b: ['green', { fr: 'À jour', en: 'Up to date', ar: 'محدّث' }], sb: true, sbId: 'vacc-' + v.id
          });
        });
        (res[2] || []).forEach(function (a) {
          var pid = localByPatient[a.patient_id];
          if (!pid) return;
          push(pid, 'allergy', {
            t: { fr: a.label },
            s: { fr: (a.severity ? 'Sévérité : ' + a.severity + ' · ' : '') + dstr(a.recorded_at) },
            b: [a.severity === 'severe' ? 'red' : 'orange', { fr: 'Allergie', en: 'Allergy', ar: 'حساسية' }],
            sb: true, sbId: 'alg-' + a.id
          });
        });
        (res[3] || []).forEach(function (c) {
          var pid = localByPatient[c.patient_id];
          if (!pid) return;
          push(pid, 'chronic', {
            t: { fr: c.label },
            s: { fr: c.diagnosed_at ? 'Depuis le ' + dstr(c.diagnosed_at) : '' },
            b: ['orange', { fr: 'En cours', en: 'Ongoing', ar: 'جارٍ' }],
            sb: true, sbId: 'chr-' + c.id
          });
        });
        (res[4] || []).forEach(function (v) {
          var pid = localByPatient[v.patient_id];
          if (!pid) return;
          var parts = [];
          if (v.systolic) parts.push('TA ' + v.systolic + '/' + v.diastolic);
          if (v.pulse) parts.push('Pouls ' + v.pulse);
          if (v.temperature_c) parts.push('T° ' + v.temperature_c + ' °C');
          if (v.weight_kg) parts.push(v.weight_kg + ' kg');
          push(pid, 'vitals', {
            t: { fr: 'Constantes' },
            s: { fr: orgName(v.org_id) + ' · ' + dstr(v.measured_at) + (parts.length ? ' · ' + parts.join(' · ') : '') },
            b: ['green', OKL], sb: true, sbId: 'vit-' + v.id
          });
        });
        if (window.console) console.info('[AfrikSol] Dossier médical relu depuis la base partagée');
        return true;
      });
    }).catch(function (e) {
      if (window.console) console.warn('[AfrikSol] Dossier médical non chargé :', e.message);
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
      directory.forEach(function (o) {
        AFK.orgByName[normalizeName(o.name)] = o.id;
        AFK.nameByOrg[o.id] = o.name;
      });
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
    AFK.slugByOrg = slugByOrg;
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
    if (AFK.connected()) AFK.pullHistory();

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

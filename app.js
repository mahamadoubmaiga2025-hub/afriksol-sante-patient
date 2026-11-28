(function(){
'use strict';
const D = window.DATA;
const $app = document.getElementById('app');

/* ---------- storage ---------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem('afk2_'+k); return v===null? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('afk2_'+k, JSON.stringify(v)); }catch(e){} }
};
const S = {
  lang: store.get('lang', null),
  acctSeen: store.get('acctSeen', 0),
  who: store.get('who', 'me'),
  appts: store.get('appts', null),
  cart: store.get('cart', {}),
  orders: store.get('orders', []),
  ins: store.get('ins', {comp:{}, link:null}),
  notifs: store.get('notifs', null),
  pos: null, posState: 'unknown'
};
/* Validation de forme de l'état persisté : un état corrompu (ancienne
   version, écriture interrompue…) retombe proprement sur des valeurs
   sûres au lieu de casser des écrans en chaîne. */
if(!Array.isArray(S.appts)) S.appts = null;
if(!Array.isArray(S.orders)) S.orders = [];
if(!S.cart || typeof S.cart!=='object' || Array.isArray(S.cart)) S.cart = {};
if(!S.ins || typeof S.ins!=='object') S.ins = {comp:{}, link:null};
else if(!S.ins.comp || typeof S.ins.comp!=='object' || Array.isArray(S.ins.comp)) S.ins = {comp:{}, link:S.ins.link||null};
if(S.notifs!=null && !Array.isArray(S.notifs)) S.notifs = null;
if(typeof S.who!=='string' || !S.who) S.who = 'me';
function save(){ ['who','appts','cart','orders','ins','notifs','acctSeen'].forEach(k=>store.set(k,S[k])); }

/* ---------- i18n ---------- */
function L(){ return S.lang || 'fr'; }
function t(k, vars){
  const d = window.I18N;
  let s = (d[L()] && d[L()][k]) || d.fr[k] || k;
  if(vars) for(const v in vars) s = s.split('{'+v+'}').join(vars[v]);
  return s;
}
function tx(o){ if(!o) return ''; if(typeof o==='string') return o; return o[L()] || o.fr || o.en || ''; }
const ISO = x => '⁦'+x+'⁩';
function money(n){ return ISO(Math.round(n).toLocaleString('fr-FR').replace(/ | /g,' ') + ' FCFA'); }
function nm(s){ return L()==='ar'?ISO(esc(s)):esc(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const LOCALE = {fr:'fr-FR', en:'en-GB', ar:'ar-u-nu-latn', fon:'fr-FR', dendi:'fr-FR'};
function fmtDate(d, opt){ return new Date(d).toLocaleDateString(LOCALE[L()]||'fr-FR', opt||{weekday:'short',day:'numeric',month:'short'}); }
function fmtTime(d){ return new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
function fmtDT(d){ return fmtDate(d,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' · '+ISO(fmtTime(d)); }
function applyDir(){ document.documentElement.lang = L()==='dendi'?'ddn':L(); document.documentElement.dir = L()==='ar'?'rtl':'ltr'; }

/* ---------- profiles ---------- */
function prof(id){ return D.PROFILES.find(p=>p.id===id) || D.PROFILES[0]; }
function cur(){ return prof(S.who); }
function fullName(p){ return p.first+' '+p.last; }
function ageOf(p){ const b=new Date(p.born), n=new Date(); let a=n.getFullYear()-b.getFullYear(); if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate())) a--; return a; }
function initials(p){ return (((p.first||'')[0]||'')+((p.last||'')[0]||'')).toUpperCase(); }
/* URL de photo acceptée en attribut src : http(s), data:image ou chemin
   relatif simple du site — tout le reste (schéma injecté, data:text/html…)
   retombe sur les initiales. */
function safePhoto(u){ if(!u || typeof u!=='string') return '';
  if(/^https?:\/\//i.test(u) || /^data:image\//i.test(u)) return esc(u);
  if(/^[\w.\/-]+$/.test(u) && u.charAt(0)!=='.' && u.indexOf('..')<0) return esc(u);
  return ''; }
function avatar(p, size){ size=size||44; const st='width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.34)+'px';
  const ph = safePhoto(p.photo);
  return ph ? '<span class="av ph" style="'+st+'"><img src="'+ph+'" alt=""></span>' : '<span class="av" style="'+st+'">'+initials(p)+'</span>'; }
function setWho(id, silent){ S.who=id; save(); if(!silent && id!=='me') toast(t('switched',{name:prof(id).first})); }

/* ---------- icons ---------- */
const P = {
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  stetho:'<path d="M5 3v5a5 5 0 0 0 10 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
  calplus:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18M12 13v5M9.5 15.5h5"/>',
  calendar:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2"/>',
  hospital:'<path d="M3 21V8l9-5 9 5v13"/><path d="M12 9v6M9 12h6M3 21h18"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
  users2:'<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0"/>',
  family:'<circle cx="7" cy="6.5" r="2.6"/><circle cx="17" cy="6.5" r="2.6"/><circle cx="12" cy="13" r="2"/><path d="M2.5 20v-3.5A4.5 4.5 0 0 1 7 12h.5M21.5 20v-3.5A4.5 4.5 0 0 0 17 12h-.5M8.5 21v-1.5a3.5 3.5 0 0 1 7 0V21"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  back:'<path d="m15 18-6-6 6-6"/>', chev:'<path d="m9 18 6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  siren:'<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21h14v-3H5zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M2 12h2M20 12h2"/>',
  pin:'<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  flask:'<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7 15h10"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  receipt:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  pill:'<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
  pulse:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  syringe:'<path d="m18 2 4 4M15 5l4 4M11 7l6 6-8 8H3v-6zM7 11l3 3M9 9l2 2"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 15h4"/>',
  trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  bed:'<path d="M2 20V6M2 16h20v4M22 16v-4a3 3 0 0 0-3-3h-8v7"/><circle cx="6.5" cy="11.5" r="2"/>',
  scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
  drop:'<path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3z"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  award:'<circle cx="12" cy="9" r="6"/><path d="m8.2 13.8-1.2 8.2 5-3 5 3-1.2-8.2"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>',
  bag:'<path d="M5 7h14l-1 14H6z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  store:'<path d="M3 9 5 3h14l2 6M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  swap:'<path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/>',
  wifi:'<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a14.5 14.5 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1"/>'
};
function I(n, cls){ return '<svg class="i '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(P[n]||'')+'</svg>'; }
const FLAG = '<span class="flag"><i style="width:40%;background:#008751"></i><span style="display:flex;flex-direction:column;flex:1"><i style="flex:1;background:#fcd116"></i><i style="flex:1;background:#e8112d"></i></span></span>';

/* ---------- ui helpers ---------- */
function topbar(title, sub, opts){
  opts = opts||{};
  return '<div class="topbar">'+(opts.noBack?'':'<button class="back" data-back aria-label="'+t('back')+'">'+I('back','sm chev')+'</button>')+
    '<div class="t"><h1>'+title+'</h1>'+(sub?'<small>'+sub+'</small>':'')+'</div>'+(opts.right||'')+'</div>';
}
function brandbar(){
  const unread = (S.notifs||[]).filter(n=>!n.read).length;
  return '<div class="topbar"><div class="brand"><img src="assets/logo-mark.png" alt=""><b>AfrikSol Santé</b></div>'+
    '<button class="iconbtn" data-go="#/notifs" aria-label="'+t('notifications')+'">'+I('bell','sm')+(unread?'<span class="dot">'+unread+'</span>':'')+'</button>'+
    '<button class="iconbtn" data-go="#/profile" aria-label="'+t('profile')+'">'+I('user','sm')+'</button></div>';
}
function nav(active){
  const it = [['home','home','#/home'],['record','file','#/record'],['appt','calplus','#/book'],['family','family','#/family'],['profile','user','#/profile']];
  return '<nav class="nav">'+it.map(([k,ic,h])=> k==='appt'
    ? '<button class="fab '+(active===k?'on':'')+'" data-go="'+h+'"><span class="c">'+I(ic)+'</span>'+t('nav_appt')+'</button>'
    : '<button class="'+(active===k?'on':'')+'" data-go="'+h+'">'+I(ic)+t('nav_'+k)+'</button>').join('')+'</nav>';
}
function screen(html, navKey, extra){
  $app.innerHTML = '<div class="screen fade '+(navKey?'has-nav':'')+'">'+html+(navKey?nav(navKey):'')+(extra||'')+'</div><div class="toast" id="toast"></div>';
  const sc = $app.querySelector('.scroll'); if(sc) sc.scrollTop = 0;
  if(typeof fitCards==='function') fitCards();
}
let toastTimer;
function toast(msg){ const el=document.getElementById('toast'); if(!el) return; el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }
function sheet(html, onMount){
  closeSheet();
  const bg = document.createElement('div'); bg.className='sheet-bg'; bg.id='sheet';
  bg.innerHTML = '<div class="sheet"><div class="grab"></div>'+html+'</div>';
  bg.addEventListener('click', e=>{ if(e.target===bg) closeSheet(); });
  $app.querySelector('.screen').appendChild(bg);
  if(onMount) onMount(bg);
  return bg;
}
function closeSheet(){ const s=document.getElementById('sheet'); if(s) s.remove(); }
function go(h){ if(location.hash===h) route(); else location.hash = h; }
function badge(cls, txt){ return '<span class="badge '+cls+'">'+txt+'</span>'; }
function addNotif(icon, title, body){ S.notifs = S.notifs||[]; S.notifs.unshift({id:Date.now(), icon, title, body, read:false, at:Date.now()}); save(); }

/* acting-for banner and profile chips */
function actingBanner(){
  if(S.who==='me') return '';
  const p=cur();
  return '<div class="acting">'+avatar(p,30)+'<span>'+t('acting_for',{name:'<b>'+nm(p.first)+'</b>'})+'</span><button data-me>'+t('back_to_me')+'</button></div>';
}
function whoChips(){
  return '<div class="who">'+D.PROFILES.map(p=>'<button class="'+(S.who===p.id?'on':'')+'" data-who="'+p.id+'">'+avatar(p,26)+'<span>'+(p.id==='me'?t('you'):esc(p.first))+'</span></button>').join('')+'</div>';
}
function bindWho(after){
  $app.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{ setWho(b.dataset.who); after?after():route(); });
  $app.querySelectorAll('[data-me]').forEach(b=>b.onclick=()=>{ setWho('me',true); route(); });
}

/* ---------- geo ---------- */
function km(a,b){ const R=6371, r=x=>x*Math.PI/180; const dl=r(b.lat-a.lat), dn=r(b.lng-a.lng); const h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function fmtKm(d){ return ISO(d<1? Math.round(d*1000)+' m' : d.toFixed(d<10?1:0).replace('.',',')+' km'); }
function locate(cb){
  if(!navigator.geolocation){ S.posState='unsupported'; cb&&cb(); return; }
  S.posState='asking'; cb&&cb();
  navigator.geolocation.getCurrentPosition(p=>{ S.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}; S.posState='on'; cb&&cb(); },
    err=>{ S.posState = err.code===1?'denied':'error'; cb&&cb(); }, {enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}
function checkPerm(cb){
  try{ if(navigator.permissions&&navigator.permissions.query){ navigator.permissions.query({name:'geolocation'}).then(r=>{ if(r.state==='granted') locate(cb); else { S.posState = r.state==='denied'?'denied':'off'; cb&&cb(); } }).catch(()=>{S.posState='off';cb&&cb();}); return; } }catch(e){}
  S.posState='off'; cb&&cb();
}
function mapsUrl(lat,lng){ return 'https://www.google.com/maps/search/?api=1&query='+lat+','+lng; }
function hospByDistance(){ const o=S.pos||D.OUAGA; return D.ER_HOSPITALS.map(h=>Object.assign({d:km(o,h)},h)).sort((a,b)=>a.d-b.d); }

/* ---------- demo seed ---------- */
function at(days, hh, mm){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+days); if(d.getDay()===0) d.setDate(d.getDate()+1); d.setHours(hh,mm||0); return d.getTime(); }
function seed(){
  if(!S.appts){
    S.appts=[
      {id:'A1', pid:'me', doctor:'Dr Seydou Ouédraogo', spec:'gen', facility:'CHU Yalgado', when:at(3,9,30), fee:2000, mode:'mobile', pay:{op:'Orange Money', paid:2025, ref:'PAY-41827730'}, status:'ok', created:Date.now()},
      {id:'A2', pid:'kevin', doctor:'Dr Aminata Sawadogo', spec:'ped', facility:'CHU Pédiatrique Charles de Gaulle', when:at(5,10,0), fee:2000, mode:'mobile', pay:{op:'Moov Money', paid:2025, ref:'PAY-41829154'}, status:'ok', created:Date.now()}
    ];
  }
  if(!S.notifs){
    S.notifs=[
      {id:1, icon:'shield', title:t('n_welcome_t'), body:t('n_welcome_b'), read:false, at:Date.now()},
      {id:2, icon:'syringe', title:t('n_vacc_t'), body:t('n_vacc_b'), read:false, at:Date.now()-36e5}
    ];
  }
  save();
}

/* ======================================================
   SCREENS
   ====================================================== */
function vSplash(){
  $app.innerHTML = '<div class="screen splash"><img src="assets/logo-mark.png" alt="" class="splash-mark"><h2>AfrikSol <span>Santé</span></h2><div class="loader"><b></b></div></div>';
  setTimeout(()=>{ go(!S.lang ? '#/lang' : '#/home'); }, 2200);
}

function vLang(fromProfile){
  const langs = [['fr','Français'],['en','English'],['ar','العربية']];
  let sel = ['fr','en','ar'].includes(S.lang) ? S.lang : 'fr';
  const draw = ()=>{
    screen((fromProfile?topbar((window.I18N[sel].language||window.I18N.fr.language),''):'')+'<div class="scroll"><div class="lang-head">'+(fromProfile?'':'<div class="lang-logo"><img src="assets/logo-mark.png" alt=""><b>AfrikSol <span>Santé</span></b></div>')+'<h2>'+(window.I18N[sel].choose_lang||window.I18N.fr.choose_lang)+'</h2><p>'+(window.I18N[sel].choose_lang_sub||window.I18N.fr.choose_lang_sub)+'</p></div>'+
      langs.map(([k,n])=>'<button class="opt '+(sel===k?'on':'')+'" data-l="'+k+'"><span><b>'+n+'</b></span><span class="ck">'+I('check')+'</span></button>').join('')+
      '<div class="sticky"><button class="btn" id="cont">'+(window.I18N[sel].continue||window.I18N.fr.continue)+'</button></div></div>');
    document.documentElement.dir = sel==='ar'?'rtl':'ltr'; document.documentElement.lang = sel==='dendi'?'ddn':sel;
    $app.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{ sel=b.dataset.l; draw(); });
    document.getElementById('cont').onclick=()=>{ S.lang=sel; store.set('lang',sel); applyDir(); seed(); go(fromProfile?'#/profile':'#/home'); };
  };
  draw();
}

/* ---------- appointments helpers ---------- */
function upcoming(pid){ const now=Date.now(); return S.appts.filter(a=>a.status==='ok' && a.when>now && (!pid||a.pid===pid)).sort((a,b)=>a.when-b.when); }
function apptCard(a, full){
  const p=prof(a.pid||'me');
  return '<div class="card appt"><div class="row" style="align-items:flex-start"><div class="tx">'+(a.pid&&a.pid!=='me'?'<span class="forwho">'+avatar(p,20)+t('appt_for',{name:nm(p.first)})+'</span>':'')+'<b>'+esc(a.doctor)+'</b><div class="meta">'+fmtDT(a.when)+' · '+esc(a.facility)+'</div><div class="meta">'+t('spec_'+a.spec)+'</div></div>'+
    (a.status==='ok'?badge('green',t('confirmed')):badge('gray',t('cancelled')))+(a.pendingSync?badge('orange',t('sync_badge')):'')+'</div>'+
    /* Annulation proposée seulement pour un rendez-vous à venir : un
       rendez-vous passé ne peut plus être annulé. */
    (a.status==='ok'&&a.when>Date.now()?'<div class="appt acts"><button class="lnk" data-cancel="'+a.id+'">'+t('cancel_appt')+'</button>'+(full?'':'<button class="lnk" data-go="#/appts">'+t('details')+'</button>')+'</div>':'')+'</div>';
}
function bindCancel(){
  $app.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.cancel;
    sheet('<h3>'+t('cancel_q')+'</h3><p>'+t('cancel_q_sub')+'</p><button class="btn" id="y">'+t('cancel_yes')+'</button><div style="height:10px"></div><button class="btn ghost" id="n">'+t('keep')+'</button>', s=>{
      s.querySelector('#n').onclick=closeSheet;
      s.querySelector('#y').onclick=()=>{ const a=S.appts.find(x=>x.id===id); if(a){ a.status='cx'; addNotif('calendar',t('n_cx_t'),a.doctor+' · '+fmtDT(a.when));
        /* Rendez-vous synchronisé : l'annulation est propagée au backend
           (RPC cancel_own_appointment) — sinon la relecture d'historique
           le ferait « ressusciter ». Un échec laisse cancelPending, repris
           par retryPendingSync, et émet le toast de synchronisation. */
        if(a.sbId && window.AFK && AFK.cancelAppt){ a.cancelPending=true; AFK.cancelAppt(a); } }
        save(); closeSheet(); toast(t('appt_cancelled')); route(); };
    });
  });
}
function greetKey(){ const h=new Date().getHours(); return h<12?'good_morning':h<18?'good_afternoon':'good_evening'; }

/* ---------- HOME ---------- */
function vHome(){
  const me=prof('me'), a=upcoming()[0];
  const tiles=[['record','file','#/record'],['pharmacy','pill','#/pharmacy'],['appts','calendar','#/appts'],['card','card','#/card']];
  const kids=D.PROFILES.filter(p=>p.child);
  const near=hospByDistance()[0];
  screen(brandbar()+'<div class="scroll">'+actingBanner()+
    '<div class="hello"><small>'+t(greetKey())+'</small><h2>'+esc(fullName(me))+'</h2><p>'+t('how_help')+'</p></div>'+
    '<div class="sos" role="button" data-go="#/sos"><span class="ic">'+I('siren','lg')+'</span><span class="sx"><b>'+t('emergencies')+'</b><small>'+t('sos_sub')+'</small></span><a class="call" href="tel:15" onclick="event.stopPropagation()">'+I('phone','sm')+'15</a></div>'+
    '<div class="offline"><i></i>'+t('offline_ok')+'</div>'+
    ((window.AFK && !AFK.connected()) ? '<button class="trkcard" data-go="#/account"><span class="ic">'+I('shield')+'</span><span class="tx"><small>'+t('account')+'</small><b>'+t('account_off')+'</b></span>'+I('chev','sm chev')+'</button>' : '')+
    activeOrders().slice(0,2).map(o=>'<button class="trkcard" data-go="#/order/'+o.id+'"><span class="ic">'+I(o.mode==='delivery'?'pin':'store')+'</span><span class="tx"><small>'+t('trk_follow')+' · '+o.id+'</small><b>'+orderStatusLine(o)+'</b></span>'+I('chev','sm chev')+'</button>').join('')+
    '<div class="sec">'+t('what_do')+'</div><div class="grid2">'+
    tiles.map(([k,ic,h])=>'<button class="tile" data-go="'+h+'"><span class="ic">'+I(ic)+'</span><b>'+t('tile_'+k)+'</b><small>'+t('tile_'+k+'_s')+'</small></button>').join('')+'</div>'+
    '<div class="sec">'+t('next_appt')+'</div>'+(a?apptCard(a):'<div class="card empty">'+t('no_appt')+'<div style="margin-top:12px"><button class="btn sm" data-go="#/book">'+I('calplus','sm')+t('book_now')+'</button></div></div>')+
    '<div class="sec">'+t('my_family')+'<button data-go="#/family">'+t('details')+'</button></div>'+
    '<div class="famstrip">'+kids.map(k=>'<button data-act="'+k.id+'">'+avatar(k,52)+'<b>'+esc(k.first)+'</b><small>'+t('yrs',{n:ageOf(k)})+'</small></button>').join('')+'<button data-go="#/family">'+'<span class="av add">'+I('plus')+'</span><b>'+t('add_child')+'</b></button></div>'+
    '<div class="sec">'+t('near_you')+(S.posState==='on'?'':'<span style="font-size:12px;color:var(--mute);font-weight:500">'+t('from_cotonou')+'</span>')+'</div><div class="list">'+
    '<div class="row hrow"><span class="ic">'+I('hospital')+'</span><span class="tx"><b>'+esc(near.name)+'</b><small>≈ '+fmtKm(near.d)+' · '+t('open_24')+'</small></span><a class="mini call" href="tel:'+near.tel+'" aria-label="'+t('call')+'">'+I('phone','sm')+'</a></div>'+
    [['hospital','tile_hosp','tile_hosp_s','#/hospitals'],['store','tile_garde','tile_garde_s','#/pharmacies']].map(([ic,k,s,h])=>'<button class="row" data-go="'+h+'"><span class="ic">'+I(ic)+'</span><span class="tx"><b>'+t(k)+'</b><small>'+t(s)+'</small></span>'+I('chev','sm chev')+'</button>').join('')+'</div>'+
    '<form class="search" id="sf">'+I('search','sm')+'<input id="q" placeholder="'+t('search_ph')+'"></form>'+
    '</div>','home');
  document.getElementById('sf').onsubmit=e=>{ e.preventDefault(); const q=document.getElementById('q').value.trim(); if(q) go('#/search/'+encodeURIComponent(q)); };
  $app.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{ setWho(b.dataset.act); go('#/family'); });
  bindCancel(); bindWho();
}

/* ---------- SOS / emergencies ---------- */
function vSos(){
  const draw = ()=>{
    const pos=S.pos, list=hospByDistance(), p=cur();
    let locHtml;
    if(S.posState==='on') locHtml = '<div class="loc"><div class="row"><span class="ic">'+I('pin')+'</span><span class="tx"><b>'+t('loc_on')+'</b><small style="color:var(--green)">'+ISO(pos.lat.toFixed(4)+'° · '+pos.lng.toFixed(4)+'° (±'+pos.acc+' m)')+'</small></span></div>'+
      '<div style="display:flex;gap:8px;margin-top:12px"><a class="btn ghost sm" style="flex:1" href="sms:?&body='+encodeURIComponent(t('sms_body')+' '+mapsUrl(pos.lat,pos.lng))+'">'+I('share','sm')+t('share_sms')+'</a><button class="btn ghost sm" style="flex:none" id="relocate">'+I('refresh','sm')+'</button></div></div>';
    else if(S.posState==='asking') locHtml = '<div class="loc off"><div class="row"><span class="ic">'+I('pin')+'</span><span class="tx"><b>'+t('loc_asking')+'</b><small>'+t('loc_asking_s')+'</small></span></div></div>';
    else if(S.posState==='denied') locHtml = '<div class="loc off"><div class="row"><span class="ic">'+I('pin')+'</span><span class="tx"><b>'+t('loc_denied')+'</b><small>'+t('loc_denied_s')+'</small></span></div><button class="btn sm" style="width:100%;margin-top:12px" id="enable">'+t('retry')+'</button></div>';
    else locHtml = '<div class="loc off"><div class="row"><span class="ic">'+I('pin')+'</span><span class="tx"><b>'+t('loc_off')+'</b><small>'+t('loc_off_s')+'</small></span></div><button class="btn sm" style="width:100%;margin-top:12px" id="enable">'+I('pin','sm')+t('enable_loc')+'</button></div>';
    /* Profil réel : tant que le vrai contact d'urgence n'est pas connu
       (p.contact === null, posé par backend.js), on n'affiche PAS le
       contact fictif de démonstration sur l'écran SOS. */
    const contact = p.child ? [t('em_contact_child'), D.GUARDIAN.name+' · '+D.GUARDIAN.tel]
      : (p.contact ? [t('em_contact'), p.contact.name+(p.contact.rel?' ('+t(p.contact.rel)+')':'')+(p.contact.tel?' · '+p.contact.tel:'')]
                    : [t('em_contact'), t('em_contact_none')]);
    screen(topbar(t('emergencies'), t('sos_top'))+'<div class="scroll">'+
      '<div class="samu"><span class="tag">SAMU BURKINA FASO</span><div class="n">15</div><b>'+t('samu_title')+'</b><small>'+t('samu_sub')+'</small><a class="btn" href="tel:15">'+I('phone')+t('call_112')+'</a></div>'+
      '<div class="nums"><a href="tel:18"><b>18</b><small>'+t('firemen')+'</small></a><a href="tel:17"><b>17</b><small>'+t('police')+'</small></a><a href="tel:16"><b>16</b><small>'+t('gendarmerie')+'</small></a><a href="tel:'+D.SAMU_DIRECT+'"><b style="font-size:13px;line-height:1.85;white-space:nowrap">'+ISO('25 30 68 88')+'</b><small>'+t('samu_direct')+'</small></a></div>'+
      locHtml+
      '<div class="sec">'+t('nearest_hosp')+'<span style="font-size:12px;color:var(--mute);font-weight:500">'+(S.posState==='on'?t('from_you'):t('from_cotonou'))+'</span></div>'+
      list.map(h=>'<div class="hosp"><div class="top"><span class="row" style="width:auto;flex:1"><span class="ic" style="width:40px;height:40px">'+I(h.type==='pub'?'hospital':'building','sm')+'</span><span class="tx"><b>'+esc(h.name)+'</b><small>'+esc(h.area)+' · '+t('open_24')+'</small></span></span><span class="km">≈ '+fmtKm(h.d)+'</span></div>'+
        '<div class="acts"><a class="a-call" href="tel:'+h.tel+'">'+I('phone','sm')+t('call')+' · '+ISO(h.telLabel)+'</a><a class="a-map" href="https://www.google.com/maps/dir/?api=1&destination='+h.lat+','+h.lng+'" target="_blank" rel="noopener" aria-label="map">'+I('map','sm')+'</a></div></div>').join('')+
      '<div class="vital"><div class="h">'+t('vital_info')+'</div>'+
      '<div class="kv"><span>'+t('patient')+'</span><b>'+esc(fullName(p))+' ('+ageOf(p)+')</b></div><div class="kv"><span>'+t('blood_group')+'</span><b>'+p.blood+'</b></div><div class="kv"><span>'+t('allergies')+'</span><b>'+(p.allergy?tx(p.allergy):t('none_known'))+'</b></div><div class="kv"><span>'+contact[0]+'</span><b>'+esc(contact[1])+'</b></div><div class="kv" style="padding-bottom:12px"><span>'+t('health_no')+'</span><b>'+ISO(p.num)+'</b></div></div>'+
      '<p class="demo">'+t('sos_source')+'</p></div>','home');
    const en=document.getElementById('enable'); if(en) en.onclick=()=>locate(draw);
    const rl=document.getElementById('relocate'); if(rl) rl.onclick=()=>locate(draw);
  };
  if(S.posState==='unknown') checkPerm(draw); else draw();
}

/* ---------- Medical record ---------- */
const ALWAYS = ['appts','bills','vacc','allergy','monthly','blood','contacts','insurance','docs'];
function recItems(pid, id){ return ((D.RECORDS[pid]||{})[id])||[]; }
function vRecord(){
  const p=cur();
  const rubrics = D.RECORD.filter(r=> p.id==='me' || ALWAYS.includes(r.id) || recItems(p.id,r.id).length);
  screen(topbar(t('tile_record'), t('record_of',{name:nm(fullName(p))})+' · '+ISO(p.num), {noBack:true})+'<div class="scroll">'+whoChips()+demoNotice('login_see_record')+'<div class="rgrid">'+
    rubrics.map(r=>{ const n = r.id==='appts'? upcoming(p.id).length : r.id==='bills'? allPayments().filter(x=>x.pid===p.id).length : r.id==='monthly'||r.id==='insurance'? 0 : recItems(p.id,r.id).length;
      const label = r.id==='monthly' && p.child ? t('growth') : r.id==='insurance' ? t('insurance') : t('r_'+r.id);
      return '<button class="rc" data-go="'+(r.id==='insurance'?'#/insurance':'#/record/'+r.id)+'"><span class="ic">'+I(r.icon,'sm')+'</span>'+(n?'<span class="n">'+n+'</span>':'')+'<b>'+label+'</b></button>'; }).join('')+
    '</div></div>','record');
  bindWho();
}
function vRecordItem(id){
  const r = D.RECORD.find(x=>x.id===id); if(!r) return go('#/record');
  if(id==='insurance') return go('#/insurance');
  if(id==='bills') return vPayments(cur().id);
  const p=cur(); let body='';
  if(id==='appts'){
    const list=S.appts.filter(a=>a.pid===p.id).sort((a,b)=>b.when-a.when);
    body = (list.length? list.map(a=>apptCard(a,true)).join('') : '<div class="card empty">'+t('no_appt')+'</div>')+'<div style="margin-top:14px"><button class="btn" data-go="#/book">'+I('calplus','sm')+t('book_now')+'</button></div>';
  } else if(id==='monthly'){
    const w=D.WEIGHTS[p.id], m=D.MONTHS[L()]||D.MONTHS.fr, mx=Math.max(...w), mn=Math.min(...w)-1;
    body = '<div class="card"><b style="font-size:14.5px">'+t('weight_kg')+'</b><div class="bars" style="margin-bottom:20px">'+w.map((v,i)=>'<div style="height:'+(20+80*(v-mn)/(mx-mn))+'%"><em>'+String(v).replace('.',',')+'</em><span>'+m[i]+'</span></div>').join('')+'</div></div>'+
      recItems(p.id,'vitals').map(itemHtml).join('');
  } else {
    body = recItems(p.id,id).map(itemHtml).join('') || '<div class="card empty">'+t('nothing')+'</div>';
  }
  const label = id==='monthly' && p.child ? t('growth') : t('r_'+id);
  screen(topbar(label, t('record_of',{name:nm(fullName(p))}))+'<div class="scroll">'+actingBanner()+demoNotice('login_see_record')+body+'</div>','record');
  bindCancel(); bindWho();
}
function itemHtml(it){ return '<div class="item"><div class="h"><b>'+esc(tx(it.t))+'</b>'+(it.b?badge(it.b[0],tx(it.b[1])):'')+'</div>'+(tx(it.s)?'<small>'+esc(tx(it.s))+'</small>':'')+'</div>'; }

/* ---------- appointments list ---------- */
function vAppts(){
  const up=upcoming();
  /* Sections séparées : les rendez-vous passés (confirmés, déjà honorés)
     ne sont plus mélangés aux annulés sous l'en-tête « Annulé ». */
  const pastOk=S.appts.filter(a=>a.status==='ok'&&a.when<=Date.now()).sort((a,b)=>b.when-a.when);
  const cx=S.appts.filter(a=>a.status!=='ok').sort((a,b)=>b.when-a.when);
  screen(topbar(t('tile_appts'), t('family_appts'))+'<div class="scroll">'+
    (up.length?up.map(a=>apptCard(a,true)).join(''):'<div class="card empty">'+t('no_appt')+'</div>')+
    '<div style="margin:14px 0"><button class="btn" data-go="#/book">'+I('calplus','sm')+t('book_now')+'</button></div>'+
    (pastOk.length?'<div class="sec">'+t('past_appts')+'</div>'+pastOk.map(a=>apptCard(a,true)).join(''):'')+
    (cx.length?'<div class="sec">'+t('cancelled')+'</div>'+cx.map(a=>apptCard(a,true)).join(''):'')+'</div>','home');
  bindCancel();
}

/* ---------- hospitals & pharmacies lists ---------- */
function vHospitals(){
  const er=hospByDistance();
  const others=[].concat(D.FACILITIES.pub.map(f=>Object.assign({tp:'pub'},f)), D.FACILITIES.clin.map(f=>Object.assign({tp:'clin'},f)), D.FACILITIES.cab.map(f=>Object.assign({tp:'cab'},f))).filter(f=>!D.ER_HOSPITALS.find(h=>h.id===f.id)).sort((a,b)=>a.km-b.km);
  const tpOf=id=>D.FACILITIES.pub.find(f=>f.id===id)?'pub':D.FACILITIES.clin.find(f=>f.id===id)?'clin':null;
  screen(topbar(t('hosp_cs'), t('hosp_cs_s'))+'<div class="scroll">'+
    er.map(h=>{ const tp=tpOf(h.id); return '<div class="hosp"><div class="top"><span class="tx" style="flex:1"><b>'+esc(h.name)+'</b><small>'+esc(h.area)+' · '+t('open_24')+'</small></span><span class="km">≈ '+fmtKm(h.d)+'</span></div><div class="acts">'+
      '<a class="a-call" href="tel:'+h.tel+'">'+I('phone','sm')+ISO(h.telLabel)+'</a>'+(tp?'<a class="a-map" href="#/book/fac/'+tp+'/'+h.id+'">'+I('calplus','sm')+t('book_short')+'</a>':'')+'<a class="a-map" href="https://www.google.com/maps/dir/?api=1&destination='+h.lat+','+h.lng+'" target="_blank" rel="noopener" aria-label="map">'+I('map','sm')+'</a></div></div>'; }).join('')+
    others.map(f=>'<div class="hosp"><div class="top"><span class="tx" style="flex:1"><b>'+esc(f.name)+'</b><small>'+esc(f.area)+' · '+t('type_'+f.tp)+' · '+t('n_docs',{n:f.docs})+'</small></span><span class="km">'+fmtKm(f.km)+'</span></div><div class="acts"><a class="a-map" href="#/book/fac/'+f.tp+'/'+f.id+'">'+I('calplus','sm')+t('book_short')+'</a></div></div>').join('')+
    '<p class="demo">'+t('sos_source')+'</p></div>','home');
}
function vPharmacies(){
  screen(topbar(t('pharmacies'), t('pharmacies_s'))+'<div class="scroll">'+D.PHARMACIES.map(p=>'<div class="hosp"><div class="top"><span class="tx" style="flex:1"><b>'+esc(p.name)+'</b><small>'+esc(p.area)+' · '+ISO(p.hours)+'</small></span>'+(p.garde?badge('green',t('on_duty')):badge('gray',t('day')))+'</div><div class="acts"><a class="a-map" href="#/pharmacy">'+I('pill','sm')+t('see_stock')+'</a><a class="a-map" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.area+' Burkina Faso')+'" target="_blank" rel="noopener">'+I('map','sm')+fmtKm(p.km)+'</a></div></div>').join('')+
    '<p class="demo">'+t('garde_src')+'</p></div>','home');
}

/* ---------- Booking ---------- */
let B = {};
let bkBusy = false; /* garde anti-double-tap : une seule réservation à la fois */
function bookTop(step, sub){ return topbar(t('book_appt'), t('step_x',{n:step})+' — '+sub)+'<div class="scroll">'+actingBanner()+'<div class="prog"><div class="l"><span>'+t('step_of',{n:step})+'</span><span>'+(step*20)+'%</span></div><div class="b"><i style="width:'+(step*20)+'%"></i></div></div>'; }
function vBook(args){
  if(args[0]==='fac'){
    /* Lien direct vers un établissement : type et établissement doivent
       exister, sinon retour propre au début du parcours. */
    if(!D.FACILITY_TYPES.some(f=>f.id===args[1]) || !(D.FACILITIES[args[1]]||[]).some(f=>f.id===args[2])) return go('#/book');
    B={type:args[1], fac:args[2], pid:S.who}; return go('#/book/2');
  }
  if(args[0] && D.SPECIALTIES.includes(args[0])){ B={spec:args[0], pid:S.who}; }
  else if(!args[0]){ B={pid:S.who}; }
  const step = /^\d$/.test(args[0]||'')? +args[0] : 1;
  if(step<1 || step>5) return go('#/book'); /* #/book/9 et autres étapes inconnues */
  B.pid = S.who;
  if(step===1) return bStep1();
  if(step===2) return bStep2();
  if(step===3) return bStep3();
  if(step===4) return bStep4();
  if(step===5) return bStep5();
}
function bStep1(){
  const total = D.FACILITIES.pub.length+D.FACILITIES.clin.length+D.FACILITIES.cab.length, p=cur();
  screen(topbar(t('nav_appt'), t('appt_head',{n:total}), {noBack:true})+'<div class="scroll">'+
    '<div class="sec" style="margin-top:4px">'+t('for_whom_appt')+'</div>'+whoChips()+
    (p.child && B.spec!=='ped'?'<div class="alert blue" style="margin-top:0;margin-bottom:12px">'+I('info','sm')+'<span>'+t('ped_hint')+' <button class="lnk" style="margin-top:6px;background:#fff" id="ped">'+t('choose_ped')+'</button></span></div>':'')+
    '<div class="prog"><div class="l"><span>'+t('step_of',{n:1})+'</span><span>20%</span></div><div class="b"><i style="width:20%"></i></div></div><div class="sec" style="margin-top:6px">'+t('which_type')+'</div><div class="list">'+
    D.FACILITY_TYPES.map(f=>{ const L2=D.FACILITIES[f.id]; const mn=Math.min(...L2.map(x=>x.km)); return '<button class="row" data-ty="'+f.id+'"><span class="ic">'+I(f.icon)+'</span><span class="tx"><b>'+t('type_'+f.id)+'</b><small>'+t('type_'+f.id+'_s',{n:L2.length})+' · '+t('from_km',{km:fmtKm(mn)})+' · '+money(f.fee)+'</small></span>'+I('chev','sm chev')+'</button>'; }).join('')+
    '</div>'+(B.spec?'<div class="alert blue">'+I('info','sm')+'<span>'+t('preset_spec')+' : <b>'+t('spec_'+B.spec)+'</b></span></div>':'')+'</div>','appt');
  $app.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{ B.type=b.dataset.ty; B.fac=null; go(B.spec?'#/book/3':'#/book/2'); });
  const pd=document.getElementById('ped'); if(pd) pd.onclick=()=>{ B.spec='ped'; bStep1(); };
  $app.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{ setWho(b.dataset.who); B.pid=S.who; if(!cur().child && B.spec==='ped') B.spec=null; bStep1(); });
  $app.querySelectorAll('[data-me]').forEach(b=>b.onclick=()=>{ setWho('me',true); B.pid='me'; bStep1(); });
}
function bStep2(){
  if(!B.type) return go('#/book');
  const draw=(q)=>{
    q=(q||'').toLowerCase();
    let list=D.SPECIALTIES.filter(s=>t('spec_'+s).toLowerCase().includes(q));
    if(cur().child) list=['ped'].concat(list.filter(s=>s!=='ped')).filter(s=>t('spec_'+s).toLowerCase().includes(q));
    const html = list.map(s=>{ const ds=D.doctorsFor('x',s); const n=12+(s.length*7)%30; return '<button class="row" data-sp="'+s+'"><span class="tx"><b>'+t('spec_'+s)+'</b><small>'+t('n_docs',{n})+' · '+ds[0].name+'</small></span>'+I('chev','sm chev')+'</button>'; }).join('') || '<div class="empty">'+t('nothing')+'</div>';
    const box=$app.querySelector('#sl');
    if(box){ box.innerHTML=html; bind(); return; }
    screen(bookTop(2,t('specialty'))+'<div class="search" style="margin:0 0 12px">'+I('search','sm')+'<input id="sq" placeholder="'+t('search_spec')+'"></div><div class="list" id="sl">'+html+'</div></div>','appt');
    document.getElementById('sq').oninput=e=>draw(e.target.value);
    bindWho(()=>{ B.pid=S.who; go('#/book'); });
    bind();
  };
  const bind=()=> $app.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{ B.spec=b.dataset.sp; go(B.fac?'#/book/4':'#/book/3'); });
  draw('');
}
function bStep3(){
  if(!B.type||!B.spec||!D.FACILITIES[B.type]) return go('#/book');
  const L3=[...D.FACILITIES[B.type]].sort((a,b)=>a.km-b.km);
  screen(bookTop(3,t('facility'))+'<div class="list">'+L3.map(f=>'<button class="row" data-f="'+f.id+'"><span class="tx"><b>'+esc(f.name)+'</b><small>'+esc(f.area)+' · '+fmtKm(f.km)+' · '+t('n_docs',{n:f.docs})+'</small></span>'+I('chev','sm chev')+'</button>').join('')+'</div></div>','appt');
  $app.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ B.fac=b.dataset.f; go('#/book/4'); });
  bindWho(()=>go('#/book'));
}
function slotsFor(docId){
  const out=[]; const base=new Date(); base.setHours(0,0,0,0);
  for(let d=1; d<=3; d++){ const day=new Date(base.getTime()+d*864e5); if(day.getDay()===0) continue;
    const hrs=['08:00','08:30','09:00','10:00','11:30','14:00','15:30','16:30'];
    let h=0; for(const c of docId+d) h=(h*31+c.charCodeAt(0))>>>0;
    const pick=hrs.filter((_,i)=>((h>>i)&1)===1).slice(0,4); (pick.length?pick:['09:00','14:00']).forEach(x=>{ const [hh,mm]=x.split(':'); const dt=new Date(day); dt.setHours(+hh,+mm); out.push(dt.getTime()); }); }
  return out;
}
function bStep4(){
  if(!B.type||!B.spec||!B.fac) return go('#/book');
  const fac=D.FACILITIES[B.type].find(f=>f.id===B.fac); if(!fac) return go('#/book');
  const fee=D.FACILITY_TYPES.find(f=>f.id===B.type).fee;
  let keepScroll=0;
  const draw=(docs, slotsOf)=>{
    screen(bookTop(4,t('doctor'))+'<div style="font-size:13px;color:var(--mute);margin-bottom:10px">'+esc(fac.name)+' · '+t('spec_'+B.spec)+'</div>'+
      docs.map(d=>{ const sl=slotsOf(d); return '<div class="doc"><div class="h"><span class="av">'+d.ini+'</span><span><b>'+esc(d.name)+'</b><small>'+esc(d.specLabel||t('spec_'+B.spec))+'</small>'+(d.rating?'<div class="star">★ '+d.rating+' <span style="color:var(--mute);font-weight:500">('+d.reviews+')</span></div>':'')+'</span></div>'+
        '<div class="info">'+esc(fac.name)+(d.exp?' · '+t('years_exp',{n:d.exp}):'')+' · '+fmtKm(fac.km)+'</div><div class="slots">'+
        (sl.length?sl.map(s=>'<button class="slot '+(B.doc===d.id&&B.when===s?'on':'')+'" data-d="'+d.id+'" data-s="'+s+'">'+fmtDate(s,{weekday:'short',day:'numeric'})+' · '+ISO(fmtTime(s))+'</button>').join(''):'<span style="font-size:13px;color:var(--mute)">'+t('no_slots')+'</span>')+
        '</div><button class="btn" data-pick="'+d.id+'" '+(B.doc===d.id&&B.when?'':'disabled')+'>'+t('choose_doc')+' · '+money(fee)+'</button></div>'; }).join('')+'</div>','appt');
    const sc=$app.querySelector('.scroll'); sc.scrollTop=keepScroll;
    $app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ keepScroll=sc.scrollTop; B.doc=b.dataset.d; B.when=+b.dataset.s; draw(docs, slotsOf); });
    $app.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ const d=docs.find(x=>x.id===b.dataset.pick); B.docName=d.name; B.fee=fee; B.facName=fac.name; go('#/book/5'); });
    bindWho(()=>go('#/book'));
  };
  const drawDemo=()=>draw(D.doctorsFor(B.fac,B.spec), d=>slotsFor(d.id));
  /* Mode réel gardé : compte connecté + établissement apparié à l'annuaire
     backend (par nom) + médecins renvoyés par directory_doctors → médecins
     réels et créneaux libres get_free_slots (3 prochains jours). Au moindre
     écart ou échec, retour exact au flux de démonstration ci-dessus. */
  const orgId=(window.AFK && AFK.connected() && AFK.patient() && AFK.orgByName)
    ? AFK.orgByName[String(fac.name||'').split('—')[0].trim().toLowerCase()] : null;
  if(!orgId || !AFK.directoryDoctors || !AFK.freeSlots){ drawDemo(); return; }
  screen(bookTop(4,t('doctor'))+'<div class="card empty" style="margin-top:10px"><div class="spin" style="margin:0 auto"></div><p style="margin-top:10px">'+t('loading_doctors')+'</p></div></div>','appt');
  const isoDay=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  AFK.patientFor(B.pid||'me').then(pat=>{
    if(!pat || !pat.id) throw new Error('no-patient');
    return AFK.directoryDoctors(orgId).then(realDocs=>{
      if(!realDocs.length) throw new Error('no-doctors');
      const base=new Date(); base.setHours(0,0,0,0);
      const days=[1,2,3].map(x=>new Date(base.getTime()+x*864e5));
      return Promise.all(realDocs.map(rd=>Promise.all(days.map(d=>AFK.freeSlots(pat.id, rd.doctor_id, isoDay(d))))
        .then(per=>{
          const slots=per.flat().filter(s=>s && s.is_free).map(s=>Date.parse(s.slot_at)).filter(x=>x>Date.now()).sort((a,b)=>a-b);
          const nm=String(rd.full_name||'').trim();
          const parts=nm.replace(/^Dr\.?\s+/i,'').split(/\s+/);
          return { doc:{id:rd.doctor_id, name:/^Dr/i.test(nm)?nm:'Dr '+nm, ini:((parts[0]||'?')[0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase(), specLabel:rd.specialty||null}, slots };
        }))).then(list=>{
          if(location.hash.indexOf('#/book/4')!==0) return;
          const byId={}; list.forEach(x=>{ byId[x.doc.id]=x.slots; });
          draw(list.map(x=>x.doc), d=>byId[d.id]||[]);
        });
    });
  }).catch(()=>{ if(location.hash.indexOf('#/book/4')===0) drawDemo(); });
}
function bStep5(){
  if(!B.docName) return go('#/book');
  bkBusy = false;
  const p=prof(B.pid||'me');
  /* Total pré-paiement : les frais de transaction (1,25 %, mêmes que
     payFlow) sont affichés AVANT le paiement — le montant annoncé est
     le montant qui sera débité, et le reçu reste cohérent. */
  const txFee=Math.round(B.fee*0.0125), grandTotal=B.fee+txFee;
  screen(topbar(t('appt_summary'),'')+'<div class="scroll"><div class="card sum"><div class="h">'+t('consult_details')+'</div>'+
    '<div class="kv"><span>'+t('patient')+'</span><b>'+esc(fullName(p))+'</b></div><div class="kv"><span>'+t('health_no')+'</span><b>'+ISO(p.num)+'</b></div>'+
    '<div class="kv"><span>'+t('doctor')+'</span><b>'+esc(B.docName)+'</b></div><div class="kv"><span>'+t('specialty')+'</span><b>'+t('spec_'+B.spec)+'</b></div><div class="kv"><span>'+t('facility')+'</span><b>'+esc(B.facName)+'</b></div><div class="kv"><span>'+t('date_time')+'</span><b>'+fmtDT(B.when)+'</b></div></div>'+
    '<div class="card" style="margin-top:12px"><div class="kv"><span>'+t('consult_fee')+'</span><b>'+money(B.fee)+'</b></div><div class="kv"><span>'+t('tx_fee')+'</span><b>'+money(txFee)+'</b></div><div class="kv total"><span style="color:var(--ink);font-weight:700">'+t('total')+'</span><b>'+money(grandTotal)+'</b></div></div>'+
    '<div class="alert green">'+I('shield','sm')+'<span>'+t('arch_note')+'</span></div>'+
    '<div style="margin-top:16px"><button class="btn blue" id="pm">'+t('pay_mobile')+' ('+money(grandTotal)+')</button><div style="height:10px"></div><button class="btn ghost" id="pc">'+t('pay_at_desk')+'</button><p class="demo" style="margin-top:10px">'+t('online_only')+'</p></div></div>','appt');
  const lockBtns=()=>{ ['pm','pc'].forEach(id=>{ const b=document.getElementById(id); if(b) b.disabled=true; }); };
  document.getElementById('pm').onclick=()=>{ if(!requireLogin('#/book/5','login_required_text')) return; lockBtns(); payFlow(B.fee, ref=>finishBooking('mobile',ref)); };
  document.getElementById('pc').onclick=()=>{ if(!requireLogin('#/book/5','login_required_text')) return; lockBtns(); finishBooking('onsite', null); };
}
/* Téléphone du compte si connu (dossier backend, sinon dernier paiement) —
   jamais de numéro fictif pré-rempli. */
function accountPhone(){
  try{ const p = window.AFK && AFK.patient && AFK.patient(); if(p && (p.phone || p.phone_number)) return String(p.phone || p.phone_number); }catch(e){}
  const ap=(S.appts||[]).find(a=>a.pay && a.pay.tel); if(ap) return ap.pay.tel;
  const or=(S.orders||[]).find(o=>o.pay && o.pay.tel); if(or) return or.pay.tel;
  return '';
}
/* Badge « PAIEMENT SIMULÉ — aucun débit réel » : affiché tant que le
   backend est en mode simulation (réglage public lu par backend.js,
   AFK.simulationMode). Sans réponse du backend, la simulation est
   considérée active — les paiements de cette app sont alors de toute
   façon simulés. Le badge disparaît tout seul, sans changement de
   code, quand la simulation sera coupée côté backend. */
function simOn(){ try{ return !(window.AFK && AFK.simulationMode && AFK.simulationMode()===false); }catch(e){ return true; } }
function simBadge(){
  if(!simOn()) return '';
  return '<div class="alert orange" style="margin-top:12px">'+I('alert','sm')+'<span><b>'+t('sim_banner')+'</b></span></div>';
}
function payFlow(amount, done){
  let op='orange';
  const fee=Math.round(amount*0.0125);
  const draw=s=>{
    s.querySelector('.sheet').innerHTML='<div class="grab"></div><h3>'+t('mobile_pay')+'</h3><p>'+t('choose_op')+'</p><div class="ops">'+D.OPERATORS.map(o=>'<button class="op '+(op===o.id?'on':'')+'" data-op="'+o.id+'"><i style="background:'+o.c+';color:'+o.fg+'">'+o.ini+'</i>'+o.name+'</button>').join('')+'</div>'+
      '<div class="f"><label>'+t('phone_no')+'</label><input id="pn" inputmode="tel" dir="ltr" placeholder="70 XX XX XX XX" value="'+esc(accountPhone())+'"><div class="hint">'+t('phone_hint')+'</div></div>'+
      '<div class="kv"><span>'+t('amount')+'</span><b>'+money(amount)+'</b></div><div class="kv"><span>'+t('tx_fee')+'</span><b>'+money(fee)+'</b></div><div class="kv total"><span style="color:var(--ink);font-weight:700">'+t('total')+'</span><b>'+money(amount+fee)+'</b></div>'+
      simBadge()+
      '<div style="height:14px"></div><button class="btn blue" id="pv">'+t('pay')+' '+money(amount+fee)+'</button>';
    s.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{ const v=s.querySelector('#pn').value; op=b.dataset.op; draw(s); s.querySelector('#pn').value=v; });
    s.querySelector('#pv').onclick=()=>{
      let v=s.querySelector('#pn').value.replace(/\D/g,'');
      if(v.length===11 && v.indexOf('226')===0) v=v.slice(3);
      if(!/^[567]\d{7}$/.test(v)){ s.querySelector('.f').classList.add('err'); toast(t('phone_invalid')); return; }
      const opName=D.OPERATORS.find(o=>o.id===op).name;
      s.querySelector('.sheet').innerHTML='<div class="grab"></div><div style="text-align:center;padding:20px 0"><div class="spin"></div><h3 style="margin-top:14px">'+t('confirm_on_phone')+'</h3><p>'+t('confirm_on_phone_s',{op:opName})+'</p></div>'+simBadge()+'<button class="btn ghost" id="pcx" style="margin-top:12px">'+t('pay_cancel')+'</button>';
      /* Annulation pendant l'attente : le minuteur est annulé et done()
         n'est jamais exécuté — bouton Annuler ou fermeture de la feuille. */
      let obs=null;
      function stopWatch(){ if(obs){ obs.disconnect(); obs=null; } }
      const timer=setTimeout(()=>{ stopWatch(); closeSheet(); done({op:opName, paid:amount+fee, ref:'PAY-'+String(Date.now()).slice(-8), tel:v}); }, 2200);
      if(window.MutationObserver){
        obs=new MutationObserver(()=>{ if(!document.getElementById('sheet')){ clearTimeout(timer); stopWatch(); } });
        obs.observe(document.body,{childList:true,subtree:true});
      }
      const cx=s.querySelector('#pcx'); if(cx) cx.onclick=()=>{ clearTimeout(timer); stopWatch(); closeSheet(); toast(t('pay_cancelled')); };
    };
  };
  sheet('', draw);
}
function finishBooking(mode, pay){
  if(bkBusy) return; /* un seul rendez-vous créé par réservation */
  bkBusy = true;
  const a={id:'A'+Date.now(), pid:B.pid||'me', doctor:B.docName, spec:B.spec, facility:B.facName, when:B.when, fee:B.fee, mode, pay:pay||null, payAt:Date.now(), status:'ok', created:Date.now()};
  S.appts.push(a); addNotif('calendar', t('n_appt_t'), (a.pid!=='me'?prof(a.pid).first+' · ':'')+a.doctor+' · '+fmtDT(a.when)); save(); if(window.AFK) AFK.syncAppt(a).then(r=>{ if(r) save(); }); B={}; go('#/booked/'+a.id);
}
function vBooked(id){
  const a=S.appts.find(x=>x.id===id); if(!a) return go('#/home');
  const p=prof(a.pid);
  screen('<div class="scroll"><div class="ok"><div class="c">'+I('check','lg')+'</div><h2>'+t('appt_confirmed')+'</h2><p>'+(a.pid!=='me'?'<b>'+t('appt_for',{name:nm(fullName(p))})+'</b><br>':'')+t('appt_confirmed_s',{doc:esc(a.doctor),date:fmtDT(a.when),fac:esc(a.facility)})+'</p></div>'+
    '<div class="receipt"><div class="t">'+(a.mode==='mobile'?t('pay_receipt'):t('booking_receipt'))+'</div><div class="d">'+fmtDate(a.created,{day:'numeric',month:'short',year:'numeric'})+'</div>'+
    (a.mode==='mobile'?'<div class="kv"><span>'+t('reference')+'</span><b>'+esc(a.pay.ref)+'</b></div><div class="kv"><span>'+t('amount_paid')+'</span><b>'+money(a.pay.paid)+'</b></div><div class="kv"><span>'+t('method')+'</span><b>'+esc(a.pay.op)+'</b></div>'
      :'<div class="kv"><span>'+t('reference')+'</span><b>RDV-'+a.id.slice(-6)+'</b></div><div class="kv"><span>'+t('to_pay_site')+'</span><b>'+money(a.fee)+'</b></div><div class="kv"><span>'+t('method')+'</span><b>'+t('on_site')+'</b></div>')+'</div>'+
    (a.mode==='mobile'?simBadge():'')+
    '<div class="alert">'+I('bell','sm')+'<span>'+t('sms_reminder')+'</span></div>'+
    '<div style="margin-top:18px"><button class="btn" data-go="#/home">'+t('back_home')+'</button><div style="height:10px"></div><button class="btn ghost" data-go="#/appts">'+t('see_appts')+'</button></div></div>','appt');
}

/* ---------- Pharmacy ---------- */
function cartCount(){ return Object.values(S.cart).reduce((a,b)=>a+b,0); }
function cartTotal(){ return Object.entries(S.cart).reduce((s,[id,q])=>s+(D.MEDICINES.find(m=>m.id===id)||{price:0}).price*q,0); }
function vPharmacy(){
  let q='';
  const draw=()=>{
    const list=D.MEDICINES.filter(m=>(m.name+' '+tx(m.cls)).toLowerCase().includes(q.toLowerCase()));
    const html=list.map(m=>{ const ph=D.PHARMACIES.find(p=>p.id===m.ph); const n=S.cart[m.id]||0;
      return '<div class="med"><div class="h"><span><b>'+esc(m.name)+'</b><small>'+esc(tx(m.cls))+'</small>'+(m.rx?'<span class="badge orange" style="margin-top:6px">Rx</span>':'')+'</span><span class="p">'+money(m.price)+'</span></div><div class="f2"><span class="st">'+t('in_stock_at')+' <b>'+esc(ph.name)+'</b> ('+fmtKm(ph.km)+')<br><em>+'+m.more+' '+t('other_pharma')+'</em></span>'+
      (n?'<span class="qty"><button data-m="'+m.id+'" data-d="-1">−</button>'+n+'<button data-m="'+m.id+'" data-d="1">+</button></span>':'<button class="add" data-m="'+m.id+'" data-d="1">'+t('add')+'</button>')+'</div></div>'; }).join('')||'<div class="empty">'+t('nothing')+'</div>';
    const box=document.getElementById('ml');
    if(box){ box.innerHTML=html; bind(); bar(); return; }
    screen(topbar(t('tile_pharmacy'), t('pharma_sub'), {right:'<button class="iconbtn" data-go="#/cart">'+I('bag','sm')+'<span class="dot" id="cc" style="'+(cartCount()?'':'display:none')+'">'+cartCount()+'</span></button>'})+
      '<div class="scroll" style="padding-bottom:170px"><div class="search" style="margin:0 0 12px">'+I('search','sm')+'<input id="mq" placeholder="'+t('search_med')+'"></div><div id="ml">'+html+'</div></div><div id="cb"></div>','home');
    document.getElementById('mq').oninput=e=>{ q=e.target.value; draw(); };
    bind(); bar();
  };
  const bind=()=> $app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const id=b.dataset.m; S.cart[id]=Math.max(0,(S.cart[id]||0)+(+b.dataset.d)); if(!S.cart[id]) delete S.cart[id]; save(); draw(); });
  const bar=()=>{ const n=cartCount(); const cb=document.getElementById('cb'); const cc=document.getElementById('cc'); if(cc){cc.textContent=n; cc.style.display=n?'':'none';}
    cb.innerHTML = n? '<button class="cartbar" data-go="#/cart"><span>'+I('bag','sm')+' '+t('cart_n',{n})+'</span><span>'+money(cartTotal())+' '+I('chev','sm chev')+'</span></button>':''; };
  draw();
}
function vCart(){
  let mode='pickup', addr=''; /* Pilote BF : livraison masquée (delivery.enabled=false) — retrait en pharmacie seul */
  const draw=()=>{
    const items=Object.entries(S.cart);
    if(!items.length){ screen(topbar(t('my_cart'),'')+'<div class="scroll"><div class="card empty" style="margin-top:10px">'+t('cart_empty')+'</div><div style="margin-top:14px"><button class="btn" data-go="#/pharmacy">'+t('see_meds')+'</button></div></div>','home'); return; }
    const sub=cartTotal(), del=mode==='delivery'?1000:0, hasRx=items.some(([id])=>(D.MEDICINES.find(m=>m.id===id)||{}).rx);
    /* Frais de transaction (1,25 %, mêmes que payFlow) affichés AVANT le
       paiement : le montant annoncé sur le bouton est le montant débité. */
    const txFee=Math.round((sub+del)*0.0125), grandTotal=sub+del+txFee;
    screen(topbar(t('my_cart'), t('cart_n',{n:cartCount()}))+'<div class="scroll">'+
      /* Article retiré du catalogue : ligne « produit indisponible » avec
         retrait du panier, au lieu d'une exception qui casse l'écran. */
      items.map(([id,q])=>{ const m=D.MEDICINES.find(x=>x.id===id);
        if(!m) return '<div class="med"><div class="h"><span><b>'+t('item_unavailable')+'</b><small>'+t('cart_n',{n:q})+'</small></span><button class="lnk" data-rm="'+id+'">'+t('remove_item')+'</button></div></div>';
        return '<div class="med"><div class="h"><span><b>'+esc(m.name)+'</b><small>'+money(m.price)+' × '+q+'</small></span><span class="qty"><button data-m="'+id+'" data-d="-1">−</button>'+q+'<button data-m="'+id+'" data-d="1">+</button></span></div></div>'; }).join('')+
      '<div class="sec">'+t('receive')+'</div><div class="chips"><button class="chip on" data-mo="pickup">'+t('pickup')+'</button></div>'+
      (mode==='delivery'?'<div class="f" style="margin-top:12px"><label>'+t('address')+'</label><input id="ad" placeholder="'+t('address_ph')+'" value="'+esc(addr)+'"></div>':'<div class="alert green" style="margin-top:12px">'+I('store','sm')+'<span>'+t('pickup_note')+'</span></div>')+
      '<div class="card" style="margin-top:12px"><div class="kv"><span>'+t('subtotal')+'</span><b>'+money(sub)+'</b></div>'+(del?'<div class="kv"><span>'+t('delivery')+'</span><b>'+money(del)+'</b></div>':'')+'<div class="kv"><span>'+t('tx_fee')+'</span><b>'+money(txFee)+'</b></div><div class="kv total"><span style="color:var(--ink);font-weight:700">'+t('total')+'</span><b>'+money(grandTotal)+'</b></div></div>'+
      (hasRx?'<div class="alert orange">'+I('alert','sm')+'<span>'+t('rx_note')+'</span></div>':'')+
      '<div style="margin-top:16px"><button class="btn blue" id="pm">'+t('pay_mobile')+' ('+money(grandTotal)+')</button><p class="demo" style="margin-top:10px">'+t('online_only')+'</p></div></div>','home');
    const ad=document.getElementById('ad'); if(ad) ad.oninput=()=>{ addr=ad.value; ad.parentNode.classList.remove('err'); };
    $app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const id=b.dataset.m; S.cart[id]=Math.max(0,(S.cart[id]||0)+(+b.dataset.d)); if(!S.cart[id]) delete S.cart[id]; save(); draw(); });
    $app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ delete S.cart[b.dataset.rm]; save(); draw(); });
    $app.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{ mode=b.dataset.mo; draw(); });
    const check=()=>{ if(mode==='delivery' && !addr.trim()){ const a=document.getElementById('ad'); a.parentNode.classList.add('err'); toast(t('address_req')); return false; } return true; };
    const place=(pay)=>{ const o={id:'CMD-'+String(Date.now()).slice(-6), pid:S.who, items:{...S.cart}, total:sub+del, mode, pay:pay||null, at:Date.now(), addr:mode==='delivery'?addr:'', ns:0}; S.orders.unshift(o); S.cart={}; addNotif('bag',t('n_order_t'),o.id+' · '+money(o.total)); save(); if(window.AFK) AFK.syncOrder(o).then(r=>{ if(r) save(); }); go('#/ordered/'+o.id); };
    document.getElementById('pm').onclick=()=>{ if(!requireLogin('#/cart','login_required_text')) return; if(check()) payFlow(sub+del, p=>place(p)); };
  };
  draw();
}

/* ---------- PAYMENTS HISTORY (receipts) ---------- */
function dAgo(days,h,m){ const d=new Date(); d.setDate(d.getDate()-days); d.setHours(h,m||0,0,0); return d.getTime(); }
function seedPayments(){ return [
  {id:'PAY-38114502', kind:'consult', pid:'me', at:dAgo(25,9,42), place:'CHU Yalgado', area:'Secteur 4 · Ouagadougou', title:{fr:'Consultation · Médecine générale',en:'Consultation · General medicine',ar:'استشارة · الطب العام'}, doc:'Dr Seydou Ouédraogo', lines:[['consult_fee',2000]], fee:25, op:'Orange Money', tel:'70752002'},
  {id:'PAY-38114977', kind:'pharmacy', pid:'me', at:dAgo(25,11,15), place:'Pharmacie de l\'Hôpital', area:'Pissy · Ouagadougou', title:{fr:'Pharmacie · 2 médicaments',en:'Pharmacy · 2 medicines',ar:'صيدلية · دواءان'}, lines:[['Amlodipine 5 mg × 1',1800],['Paracétamol 500 mg × 1',500],['delivery',1000]], fee:41, op:'Orange Money', tel:'70752002'},
  {id:'PAY-37720318', kind:'consult', pid:'kevin', at:dAgo(64,8,20), place:'CHU Pédiatrique Charles de Gaulle', area:'Paspanga · Ouagadougou', title:{fr:'Consultation · Pédiatrie',en:'Consultation · Paediatrics',ar:'استشارة · طب الأطفال'}, doc:'Dr Aminata Sawadogo', lines:[['consult_fee',2000]], fee:25, op:'Moov Money', tel:'76611420'},
  {id:'PAY-37720655', kind:'pharmacy', pid:'kevin', at:dAgo(64,10,5), place:'Pharmacie Saint-Camille', area:'Centre-ville · Ouagadougou', title:{fr:'Pharmacie · 1 médicament',en:'Pharmacy · 1 medicine',ar:'صيدلية · دواء واحد'}, lines:[['Amoxicilline sirop 250 mg × 1',2300]], fee:29, op:'Moov Money', tel:'76611420'},
  {id:'PAY-36902241', kind:'consult', pid:'grace', at:dAgo(97,15,30), place:'Polyclinique Notre Dame de la Paix', area:'Koulouba · Ouagadougou', title:{fr:'Consultation · Pédiatrie',en:'Consultation · Paediatrics',ar:'استشارة · طب الأطفال'}, doc:'Dr Aminata Sawadogo', lines:[['consult_fee',5000]], fee:63, op:'Telecel Money', tel:'71612034'}
]; }
function allPayments(){
  /* Compte réel connecté : l'historique et les totaux ne contiennent
     que des opérations réelles — les 5 paiements fictifs du seed ne
     servent qu'au mode invité/démonstration (comme demoNotice). */
  const out=(window.AFK && AFK.connected()) ? [] : seedPayments().map(p=>Object.assign({amount:p.lines.reduce((a,l)=>a+l[1],0)},p));
  (S.appts||[]).forEach(a=>{ if(!a.pay||a.mode!=='mobile') return;
    out.push({id:a.pay.ref, kind:'consult', pid:a.pid||'me', at:a.payAt||a.created, place:a.facility, area:'', title:{fr:'Consultation · '+t('spec_'+a.spec),en:'Consultation · '+t('spec_'+a.spec),ar:'استشارة · '+t('spec_'+a.spec)}, doc:a.doctor, visit:a.when, lines:[['consult_fee',a.fee]], amount:a.fee, fee:Math.max(0,(a.pay.paid||a.fee)-a.fee), op:a.pay.op, tel:a.pay.tel||''}); });
  (S.orders||[]).forEach(o=>{ if(!o.pay) return; const ph=orderPh(o);
    const lines=Object.entries(o.items).map(([id,q])=>{ const m=D.MEDICINES.find(x=>x.id===id); return m?[m.name+' × '+q, m.price*q]:null; }).filter(Boolean);
    if(o.mode==='delivery') lines.push(['delivery',1000]);
    const n=Object.values(o.items).reduce((a,b)=>a+b,0);
    out.push({id:o.pay.ref, kind:'pharmacy', pid:o.pid||'me', at:o.at, place:ph.name, area:ph.area, title:{fr:'Pharmacie · '+n+' médicament'+(n>1?'s':''),en:'Pharmacy · '+n+' medicine'+(n>1?'s':''),ar:'صيدلية · '+n}, order:o.id, lines, amount:o.total, fee:Math.max(0,(o.pay.paid||o.total)-o.total), op:o.pay.op, tel:o.pay.tel||''}); });
  return out.sort((a,b)=>b.at-a.at);
}
function lineLabel(l){ return (l==='consult_fee'||l==='delivery')?t(l):esc(l); }
function maskTel(v){ v=String(v||'').replace(/\D/g,''); if(v.length===11 && v.indexOf('226')===0) v=v.slice(3);
  /* Numéros BF à 8 chiffres : deux premiers et deux derniers visibles.
     L'ancien format à 10 chiffres reste accepté. */
  if(v.length===8) return v.slice(0,2)+' •• •• '+v.slice(6);
  return v.length===10? v.slice(0,2)+' '+v.slice(2,4)+' •• •• '+v.slice(8):''; }
function payRows(list){
  return '<div class="list">'+list.map(p=>{ const pr=prof(p.pid);
    return '<button class="row payrow" data-go="#/payment/'+p.id+'"><span class="ic '+p.kind+'">'+I(p.kind==='pharmacy'?'pill':'stetho')+'</span><span class="tx"><b>'+esc(tx(p.title))+'</b><small>'+esc(p.place)+'</small><small>'+fmtDT(p.at)+(p.pid!=='me'?' · '+t('for_x',{name:nm(pr.first)}):'')+'</small></span><span class="amt"><b>'+money(p.amount+p.fee)+'</b><small>'+esc(p.op)+'</small></span></button>'; }).join('')+'</div>';
}
function vPayments(pidFilter){
  let kind='all';
  const draw=()=>{
    const all=allPayments().filter(p=>!pidFilter||p.pid===pidFilter);
    const list=all.filter(p=>kind==='all'||p.kind===kind);
    const year=new Date().getFullYear(), yr=all.filter(p=>new Date(p.at).getFullYear()===year);
    const tot=yr.reduce((a,p)=>a+p.amount+p.fee,0), totC=yr.filter(p=>p.kind==='consult').reduce((a,p)=>a+p.amount+p.fee,0), totP=tot-totC;
    screen(topbar(pidFilter?t('r_bills'):t('my_payments'), pidFilter?t('record_of',{name:nm(fullName(prof(pidFilter)))}):t('payments_sub'))+'<div class="scroll">'+
      '<div class="paysum"><small>'+t('paid_in_year',{y:year})+'</small><b>'+money(tot)+'</b><div class="split"><span>'+I('stetho','sm')+t('consultations')+'<em>'+money(totC)+'</em></span><span>'+I('pill','sm')+t('tile_pharmacy')+'<em>'+money(totP)+'</em></span></div></div>'+
      '<div class="chips" style="margin:14px 0 4px">'+[['all','all'],['consult','consultations'],['pharmacy','tile_pharmacy']].map(([k,l])=>'<button class="chip '+(kind===k?'on':'')+'" data-k="'+k+'">'+t(l)+'</button>').join('')+'</div>'+
      (list.length?payRows(list):'<div class="card empty">'+t('nothing')+'</div>')+
      '<p class="demo">'+t('payments_note')+'</p></div>', pidFilter?'record':'profile');
    $app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ kind=b.dataset.k; draw(); });
  };
  draw();
}
function vPayment(id){
  const p=allPayments().find(x=>x.id===id); if(!p) return go('#/payments');
  const pr=prof(p.pid), me=prof('me');
  screen(topbar(t('receipt'), p.id)+'<div class="scroll"><div class="rcpt" id="rcpt">'+
    '<div class="rh"><div class="lang-logo"><img src="assets/logo-mark.png" alt=""><b>AfrikSol <span>Santé</span></b></div><span class="badge green">'+I('check','sm')+t('paid')+'</span></div>'+
    simBadge()+
    '<div class="rt">'+t('pay_receipt')+'</div><div class="ra">'+money(p.amount+p.fee)+'</div><div class="rd">'+fmtDT(p.at)+'</div>'+
    '<div class="rsec">'+t('where')+'</div><div class="kv"><span>'+(p.kind==='pharmacy'?t('trk_from'):t('facility'))+'</span><b>'+esc(p.place)+'</b></div>'+(p.area?'<div class="kv"><span>'+t('place_addr')+'</span><b>'+esc(p.area)+'</b></div>':'')+
    (p.doc?'<div class="kv"><span>'+t('doctor')+'</span><b>'+esc(p.doc)+'</b></div>':'')+(p.visit?'<div class="kv"><span>'+t('date_time')+'</span><b>'+fmtDT(p.visit)+'</b></div>':'')+(p.order?'<div class="kv"><span>'+t('order')+'</span><b>'+p.order+'</b></div>':'')+
    '<div class="rsec">'+t('details')+'</div>'+p.lines.map(l=>'<div class="kv"><span>'+lineLabel(l[0])+'</span><b>'+money(l[1])+'</b></div>').join('')+
    '<div class="kv"><span>'+t('tx_fee')+'</span><b>'+money(p.fee)+'</b></div><div class="kv total"><span style="color:var(--ink);font-weight:700">'+t('amount_paid')+'</span><b>'+money(p.amount+p.fee)+'</b></div>'+
    '<div class="rsec">'+t('payment')+'</div><div class="kv"><span>'+t('method')+'</span><b>'+esc(p.op)+(maskTel(p.tel)?' · '+ISO(maskTel(p.tel)):'')+'</b></div><div class="kv"><span>'+t('reference')+'</span><b>'+p.id+'</b></div>'+
    '<div class="kv"><span>'+t('patient')+'</span><b>'+esc(fullName(pr))+'</b></div><div class="kv"><span>'+t('health_no')+'</span><b>'+ISO(pr.num)+'</b></div>'+(p.pid!=='me'?'<div class="kv"><span>'+t('paid_by')+'</span><b>'+esc(fullName(me))+'</b></div>':'')+
    '<div class="rq">'+qrCode(p.id, p.id)+'<small>'+t('receipt_qr')+'</small></div></div>'+
    '<div class="noprint" style="margin-top:14px"><button class="btn" id="dl">'+I('file','sm')+t('download_receipt')+'</button><div style="height:10px"></div><button class="btn ghost" id="sh">'+I('share','sm')+t('share')+'</button></div></div>','profile');
  document.getElementById('dl').onclick=()=>window.print();
  document.getElementById('sh').onclick=()=>{
    const txt=(simOn()?t('sim_banner')+'\n':'')+t('pay_receipt')+' '+p.id+'\n'+tx(p.title)+'\n'+p.place+'\n'+fmtDT(p.at).replace(/[⁦-⁩]/g,'')+'\n'+t('amount_paid')+' : '+money(p.amount+p.fee).replace(/[⁦-⁩]/g,'')+' · '+p.op;
    if(navigator.share) navigator.share({title:t('pay_receipt'), text:txt}).catch(()=>{});
    else { try{ navigator.clipboard.writeText(txt); toast(t('copied')); }catch(e){ toast(t('copied')); } }
  };
}

/* ---------- ORDER TRACKING (demo: accelerated timeline) ---------- */
const RIDERS=[{n:'Rodrigue',v:'Moto · BF 4521 RB'},{n:'Fabrice',v:'Moto · BF 7714 RC'},{n:'Arnaud',v:'Moto · BF 2096 RA'}];
const TRK_DEL=[0,8,20,28,75], TRK_PICK=[0,8,25];
function trk(o){
  const del=o.mode==='delivery';
  if(o.sb){
    /* Commande du backend : les étapes suivent le statut réel renvoyé
       (sbStatus) — la chronologie accélérée ne concerne que la démo. */
    const keys=del?['trk_confirmed','trk_preparing','trk_picked','trk_onway','trk_arrived','trk_delivered']:['trk_confirmed','trk_preparing','trk_ready','trk_collected'];
    const MAP={pending_payment:0,paid:1,confirmed:1,preparing:1,ready:2,out_for_delivery:3,in_transit:3,arrived:4,delivered:keys.length-1,collected:keys.length-1,completed:keys.length-1};
    let st = MAP[o.sbStatus]!=null ? MAP[o.sbStatus] : 0;
    if(o.done) st=keys.length-1;
    const prog = del ? (st>=5?1:st===4?0.92:st===3?0.55:st===2?0.3:0.08) : 0;
    return {st, keys, prog, eta:null, del, T:keys.map(()=>0), sb:true};
  }
  const el=(Date.now()-o.at)/1000, T=del?TRK_DEL:TRK_PICK;
  let st=0; T.forEach((x,i)=>{ if(el>=x) st=i; });
  if(o.done) st=T.length;
  const keys=del?['trk_confirmed','trk_preparing','trk_picked','trk_onway','trk_arrived','trk_delivered']:['trk_confirmed','trk_preparing','trk_ready','trk_collected'];
  let prog=0, eta=null;
  if(del){
    if(st>=4) prog=1; else if(st===3) prog=Math.min(1,(el-T[3])/(T[4]-T[3]));
    if(st<3) eta=25-Math.min(13,Math.round(el/2)); else if(st===3) eta=Math.max(1,Math.round(12*(1-prog)));
  } else if(st<2) eta=Math.max(5,15-Math.round(el/2));
  return {st, keys, prog, eta, del, T};
}
function orderPh(o){ const id=Object.keys(o.items||{})[0]; const m=D.MEDICINES.find(x=>x.id===id); return D.PHARMACIES.find(p=>p.id===(m&&m.ph))||D.PHARMACIES[0]; }
function orderRider(o){ return RIDERS[(parseInt(String(o.id).replace(/\D/g,''),10)||0)%RIDERS.length]; }
function orderCode(o){ return String(((parseInt(String(o.id).replace(/\D/g,''),10)||1234)*7)%9000+1000); }
function trkMap(r){
  return '<div class="trkmap notr"><svg viewBox="0 0 340 170" aria-hidden="true">'+
    '<rect width="340" height="170" fill="#eef1f4"/>'+
    '<path d="M0 40H340M0 118H340M70 0V170M190 0V170M285 0V170" stroke="#fff" stroke-width="10"/>'+
    '<path d="M0 80H340M130 0V170M240 0V170" stroke="#fff" stroke-width="5"/>'+
    '<rect x="150" y="52" width="70" height="52" rx="6" fill="#dfe9dc"/>'+
    '<path id="rt" d="M40 134 C 70 134, 70 118, 110 118 S 190 118, 190 80 S 240 40, 300 40" fill="none" stroke="#c9cfd8" stroke-width="5" stroke-linecap="round"/>'+
    '<path id="rtd" d="M40 134 C 70 134, 70 118, 110 118 S 190 118, 190 80 S 240 40, 300 40" fill="none" stroke="var(--blue)" stroke-width="5" stroke-linecap="round"/>'+
    '<g transform="translate(40 134)"><circle r="13" fill="#fff" stroke="var(--green)" stroke-width="3"/><path d="M-5 0h10M0 -5v10" stroke="var(--green)" stroke-width="3"/></g>'+
    '<g transform="translate(300 40)"><circle r="13" fill="#fff" stroke="var(--red)" stroke-width="3"/><path d="M-6 1 0 -5l6 6v5h-12z" fill="var(--red)"/></g>'+
    '<g id="rider" transform="translate(40 134)"><circle r="15" fill="var(--blue)"/><g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="-5.5" cy="4" r="3.5"/><circle cx="6" cy="4" r="3.5"/><path d="M-5.5 4 0 -3h4l2 7M-1 -3l-2-3h-2"/></g></g>'+
    '</svg></div>';
}
function placeRider(prog){
  const p=document.getElementById('rt'), r=document.getElementById('rider'), d=document.getElementById('rtd'); if(!p||!r) return;
  const L=p.getTotalLength(), pt=p.getPointAtLength(L*prog);
  r.setAttribute('transform','translate('+pt.x.toFixed(1)+' '+pt.y.toFixed(1)+')');
  if(d){ d.style.strokeDasharray=L; d.style.strokeDashoffset=L*(1-prog); }
  const m=document.querySelector('.trkmap.notr'); if(m) requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.remove('notr')));
}
function trkBody(o){
  const k=trk(o), ph=orderPh(o), rd=orderRider(o);
  const head = k.del
    ? (k.st>=5?['green','check',t('trk_h_delivered'),fmtDT(o.done)]:k.st===4?['green','pin',t('trk_h_arrived'),t('trk_h_arrived_s',{n:rd.n})]:k.st===3?['blue','pin',t('trk_h_onway',{n:rd.n}),k.eta!=null?t('trk_eta',{n:k.eta}):ph.name+' · '+ph.area]:['orange','store',t(k.keys[k.st]),k.eta!=null?t('trk_eta_total',{n:k.eta}):ph.name+' · '+ph.area])
    : (k.st>=3?['green','check',t('trk_h_collected'),fmtDT(o.done)]:k.st===2?['green','store',t('trk_ready'),ph.name+' · '+ph.area]:['orange','store',t(k.keys[k.st]),k.eta!=null?t('trk_ready_in',{n:k.eta}):ph.name+' · '+ph.area]);
  let h='<div class="trkhead '+head[0]+'"><span class="ic">'+I(head[1])+'</span><span><b>'+head[2]+'</b><small>'+head[3]+'</small></span></div>';
  if(k.del && k.st<5) h+=trkMap();
  if(k.del && k.st>=2 && k.st<5) h+='<div class="rider"><span class="av" style="background:var(--blue-50);color:var(--blue)">'+rd.n[0]+'</span><span class="tx"><b>'+rd.n+'</b><small>'+t('trk_rider')+' · '+rd.v+'</small></span><button class="mini call" id="callr" aria-label="'+t('call')+'">'+I('phone','sm')+'</button></div>';
  if(k.st<k.keys.length-1) h+='<div class="trkcode"><span>'+(k.del?t('trk_code'):t('trk_code_pick'))+'</span><b>'+ISO(orderCode(o))+'</b></div>';
  if((k.del && k.st===4) || (!k.del && k.st===2)){
    if(!o.pay) h+='<div class="alert orange">'+I('info','sm')+'<span>'+t(k.del?'trk_cod_due':'trk_pick_due',{m:money(o.total)})+'</span></div>';
    h+='<button class="btn green" id="rcv">'+I('check','sm')+(k.del?t('trk_received'):t('trk_collected_btn'))+'</button>';
  }
  h+='<div class="sec">'+t('trk_steps')+'</div><div class="tl">'+k.keys.map((key,i)=>{
      const when = o.sb ? (i===k.keys.length-1 && o.done ? fmtTime(o.done) : '') : (i<=k.st ? (i===k.keys.length-1 ? (o.done?fmtTime(o.done):'') : fmtTime(o.at+(k.T[i]||0)*1000)) : '');
      return '<div class="'+(i<=k.st?'done':i===k.st+1?'cur':'')+'">'+t(key)+(when?'<small>'+ISO(when)+'</small>':'')+'</div>'; }).join('')+'</div>';
  h+='<div class="receipt" style="margin-top:6px"><div class="t">'+t('order')+'</div><div class="d">'+o.id+'</div>'+
    Object.entries(o.items).map(([id,q])=>{ const m=D.MEDICINES.find(x=>x.id===id); return m?'<div class="kv"><span>'+esc(m.name)+' × '+q+'</span><b>'+money(m.price*q)+'</b></div>':''; }).join('')+
    '<div class="kv total"><span>'+t('total')+'</span><b>'+money(o.total)+'</b></div>'+
    '<div class="kv"><span>'+t('method')+'</span><b>'+(o.pay?o.pay.op+' · '+t('trk_paid'):(o.mode==='delivery'?t('cod'):t('at_pharmacy')))+'</b></div>'+
    '<div class="kv"><span>'+t('trk_from')+'</span><b>'+esc(ph.name)+'</b></div>'+
    (o.addr?'<div class="kv"><span>'+t('address')+'</span><b>'+esc(o.addr)+'</b></div>':'')+'</div>'+
    (o.pay?simBadge():'')+
    '<p class="demo">'+t('trk_demo')+'</p>';
  return {html:h, k};
}
let trkTimer=null;
function vTrack(id, fresh){
  const o=S.orders.find(x=>x.id===id); if(!o) return go('#/home');
  const first=trkBody(o);
  screen(topbar(t('trk_title'), o.id, fresh?{noBack:true}:null)+'<div class="scroll">'+
    (fresh?'<div class="ok" style="padding-top:8px"><div class="c">'+I('check','lg')+'</div><h2>'+t('order_ok')+'</h2><p>'+(o.pay?t('trk_paid_ok',{op:o.pay.op}):(o.mode==='delivery'?t('order_ok_del'):t('order_ok_pick')))+'</p></div>':'')+
    '<div id="trk">'+first.html+'</div>'+
    '<div style="margin-top:12px"><button class="btn ghost" data-go="#/home">'+t('back_home')+'</button></div></div>','home');
  const bind=()=>{
    const c=document.getElementById('callr'); if(c) c.onclick=()=>toast(t('trk_call_demo'));
    const r=document.getElementById('rcv'); if(r) r.onclick=()=>{ o.done=Date.now(); o.ns=99; addNotif('check', o.mode==='delivery'?t('trk_h_delivered'):t('trk_h_collected'), o.id); save(); draw(); };
  };
  const draw=()=>{ const box=document.getElementById('trk'); if(!box){ clearInterval(trkTimer); return; } const b=trkBody(o); box.innerHTML=b.html; bind(); placeRider(b.k.prog); };
  bind(); placeRider(first.k.prog);
  clearInterval(trkTimer);
  trkTimer=setInterval(()=>{ if(!document.getElementById('trk')){ clearInterval(trkTimer); return; } const b=trk(o); if(b.st!==draw.last || (b.del&&b.st===3)){ if(b.st!==draw.last) draw(); else { placeRider(b.prog); const e=document.querySelector('.trkhead small'); if(e&&b.eta) e.textContent=t('trk_eta',{n:b.eta}); } draw.last=b.st; } }, 1000);
  draw.last=first.k.st;
}
function activeOrders(){ return (S.orders||[]).filter(o=>!o.done); }
function orderStatusLine(o){ const k=trk(o); return t(k.keys[Math.min(k.st,k.keys.length-1)])+(k.eta&&k.st<(k.del?4:2)?' · '+ISO('~'+k.eta+' min'):''); }
function vOrders(){
  const list=S.orders||[];
  screen(topbar(t('my_orders'),'')+'<div class="scroll">'+(list.length?'<div class="list">'+list.map(o=>'<button class="row" data-go="#/order/'+o.id+'"><span class="ic">'+I('bag')+'</span><span class="tx"><b>'+o.id+' · '+money(o.total)+'</b><small>'+(o.done?(o.mode==='delivery'?t('trk_delivered'):t('trk_collected'))+' · '+fmtDT(o.done):orderStatusLine(o))+(o.pendingSync?' · '+t('sync_badge'):'')+'</small></span>'+I('chev','sm chev')+'</button>').join('')+'</div>':'<div class="card empty">'+t('nothing')+'<div style="margin-top:12px"><button class="btn sm" data-go="#/pharmacy">'+t('see_meds')+'</button></div></div>')+'</div>','profile');
}
/* background watcher: notify each step even when the tracking screen is closed */
setInterval(()=>{
  let ch=false;
  (S.orders||[]).forEach(o=>{ if(o.done || o.sb) return; const k=trk(o); const prev=o.ns||0;
    if(k.st>prev){ o.ns=k.st; ch=true; const key=k.keys[k.st];
      const notify = k.del ? (k.st>=2) : (k.st===2);
      if(notify){ const body=k.del&&k.st===4?t('trk_h_arrived_s',{n:orderRider(o).n}):o.id; addNotif(k.st===4||(!k.del&&k.st===2)?'pin':'bag', t(key), body); if(!document.getElementById('trk')) toast(t(key)); }
    } });
  if(ch) save();
}, 2000);

/* ---------- FAMILY ---------- */
function vFamily(){
  const me=prof('me'), kids=D.PROFILES.filter(p=>p.child);
  const kidCard=k=>{ const nx=upcoming(k.id)[0], due=recItems(k.id,'vacc').some(v=>v.b&&v.b[0]==='orange');
    return '<div class="kid'+(S.who===k.id?' on':'')+'"><div class="kh">'+avatar(k,56)+'<div class="tx"><b>'+esc(fullName(k))+'</b><small>'+t('yrs',{n:ageOf(k)})+' · '+ISO(k.num)+'</small>'+
      '<div class="bdg">'+(k.ownLogin?badge('blue',t('own_login')):badge('green',t('managed_by_you')))+(due?badge('orange',t('n_vacc_t')):'')+'</div></div></div>'+
      (nx?'<div class="kn">'+I('calendar','sm')+'<span>'+esc(nx.doctor)+' · '+fmtDT(nx.when)+'</span></div>':'')+
      '<div class="ka"><button data-k="'+k.id+'" data-to="#/record">'+I('file','sm')+t('f_record')+'</button><button data-k="'+k.id+'" data-to="#/book">'+I('calplus','sm')+t('f_book')+'</button><button data-k="'+k.id+'" data-to="#/card">'+I('card','sm')+t('f_card')+'</button></div>'+
      (S.who===k.id?'<div class="kact">'+I('check','sm')+t('acting_for',{name:nm(k.first)})+'</div>':'<button class="btn ghost sm kbtn" data-k="'+k.id+'" data-to="">'+I('swap','sm')+t('act_for',{name:nm(k.first)})+'</button>')+'</div>'; };
  screen(topbar(t('my_family'), t('family_sub'), {noBack:true})+'<div class="scroll">'+
    '<div class="card holder"><div class="row">'+avatar(me,48)+'<span class="tx"><b>'+esc(fullName(me))+' · '+t('you')+'</b><small>'+t('account_holder')+' · '+ISO(me.num)+'</small></span>'+(S.who!=='me'?'<button class="lnk" data-me>'+t('back_to_me')+'</button>':badge('red',t('active')))+'</div></div>'+
    '<div class="sec">'+t('nav_family')+' · '+kids.length+'</div>'+kids.map(kidCard).join('')+
    '<button class="addkid" id="addk">'+I('plus')+'<span><b>'+t('add_child')+'</b><small>'+t('add_child_l2')+'</small></span></button>'+
    '<div class="sec">'+t('shared_access')+'</div><div class="card"><div class="row"><span class="av">RA</span><span class="tx"><b>'+t('co_parent')+'</b><small>'+t('co_parent_s')+'</small></span>'+badge('green',t('active'))+'</div></div>'+
    '<div class="sec">'+t('age_rules')+'</div><div class="rules"><div><b>'+t('rule1_t')+'</b><span>'+t('rule1')+'</span></div><div><b>'+t('rule2_t')+'</b><span>'+t('rule2')+'</span></div><div><b>'+t('rule3_t')+'</b><span>'+t('rule3')+'</span></div></div>'+'<p class="demo">'+t('family_shared_note')+'</p>'+
    '</div>','family');
  $app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ setWho(b.dataset.k, !!b.dataset.to); if(b.dataset.to) go(b.dataset.to); else route(); });
  bindWho();
  document.getElementById('addk').onclick=()=>sheet('<h3>'+t('add_child_t')+'</h3><p>'+t('add_child_p')+'</p><div class="tl" style="margin:0 0 12px"><div class="done">'+t('add_child_l1')+'</div><div class="done">'+t('add_child_l2')+'</div><div class="done">'+t('add_child_l3')+'</div></div><div class="alert blue" style="margin-bottom:14px">'+I('shield','sm')+'<span>'+t('add_child_after')+'</span></div><button class="btn" id="fp">'+I('hospital','sm')+t('find_point')+'</button><div style="height:10px"></div><button class="btn ghost" id="cl">'+t('close')+'</button>', s=>{
    s.querySelector('#cl').onclick=closeSheet; s.querySelector('#fp').onclick=()=>{ closeSheet(); go('#/hospitals'); };
  });
}

/* ---------- HEALTH CARD ---------- */
function qrSvg(seed){
  const n=21; let h=0; for(const c of seed) h=(h*131+c.charCodeAt(0))>>>0;
  const rnd=()=>{ h^=h<<13; h>>>=0; h^=h>>>17; h^=h<<5; h>>>=0; return h/4294967296; };
  let r='';
  const finder=(x,y)=>{ r+='<rect x="'+x+'" y="'+y+'" width="7" height="7"/><rect x="'+(x+1)+'" y="'+(y+1)+'" width="5" height="5" fill="#fff"/><rect x="'+(x+2)+'" y="'+(y+2)+'" width="3" height="3"/>'; };
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const inF=(x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12); if(!inF && rnd()>.52) r+='<rect x="'+x+'" y="'+y+'" width="1" height="1"/>'; }
  finder(0,0); finder(14,0); finder(0,14);
  return '<svg viewBox="-1 -1 23 23" class="qrc"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/>'+r+'</svg>';
}
/* Vrai QR scannable (bibliothèque qrcode-generator 1.4.4, MIT) : encode le
   texte donné, rendu SVG construit module par module. En cas d'échec ou si
   la bibliothèque est absente, repli silencieux sur l'ancien motif qrSvg. */
function qrCode(text, seed){
  try{
    if(typeof qrcode==='function'){
      const qr=qrcode(0,'M'); qr.addData(String(text)); qr.make();
      const n=qr.getModuleCount(); let d='';
      for(let r2=0;r2<n;r2++) for(let c2=0;c2<n;c2++) if(qr.isDark(r2,c2)) d+='M'+c2+' '+r2+'h1v1h-1z';
      return '<svg viewBox="-2 -2 '+(n+4)+' '+(n+4)+'" class="qrc"><rect x="-2" y="-2" width="'+(n+4)+'" height="'+(n+4)+'" fill="#fff"/><path d="'+d+'"/></svg>';
    }
  }catch(e){}
  return qrSvg(seed||String(text));
}
/* national health card — Burkina Faso design (548 x 345, scaled to fit) */
const BF_FLAG='<svg viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="3" height="1" fill="#EF2B2D"/><rect y="1" width="3" height="1" fill="#009A44"/><polygon fill="#FCD116" points="1.5,0.55 1.606,0.854 1.928,0.861 1.671,1.056 1.765,1.364 1.5,1.18 1.235,1.364 1.329,1.056 1.072,0.861 1.394,0.854"/></svg>';
const SILH='<svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice"><rect width="100" height="150" fill="#dfe5e8"/><circle cx="50" cy="58" r="22" fill="#a9b6be"/><path d="M10 150C12 105 30 90 50 90s38 15 40 60z" fill="#a9b6be"/></svg>';
function ncWaves(){
  const cols=['#0f3550','#008751','#f4ecdc','#fcd116','#e8112d']; let o='';
  cols.forEach((c,k)=>{ const f=k*9; o+='<path d="M0 '+(78-f)+' Q '+(12-f*.2)+' '+(18-f*.2)+' '+(104-f)+' 0" stroke="'+c+'" stroke-width="9.5" fill="none"/><path d="M548 '+(262+f)+' Q '+(536+f*.2)+' '+(327+f*.2)+' '+(444+f)+' 345" stroke="'+c+'" stroke-width="9.5" fill="none"/>'; });
  return '<svg class="nc-waves" viewBox="0 0 548 345">'+o+'</svg>';
}
function cardLang(){ return L()==='en'?'en':'fr'; }
function CL(fr,en){ return cardLang()==='en'?en:fr; }
function ncDate(d){ return d.split('/').join(' / '); }
function healthCard(p){
  /* Photo spécimen uniquement pour le profil de démonstration : un
     profil réel sans photo connue affiche la silhouette, jamais la
     photo d'une autre personne. URL validée par safePhoto (S8). */
  const ph = safePhoto(p.photo);
  const photo = (p.id==='me' && !p.real) ? '<img src="assets/specimen-adult.png" alt="">' : ph ? '<img src="'+ph+'" alt="">' : SILH;
  return '<div class="ncw"><div class="nc">'+ncWaves()+
    '<div class="nc-head"><div class="nc-ttl"><b>'+CL('CARTE NATIONALE DE SANTÉ','NATIONAL HEALTH CARD')+'</b><i>'+CL('RÉPUBLIQUE DU BURKINA FASO','REPUBLIC OF BURKINA FASO')+'</i></div><div class="nc-min">'+CL('MINISTÈRE DE LA SANTÉ','MINISTRY OF HEALTH')+'<br>'+CL('UNITÉ · PROGRÈS · JUSTICE','UNITY · PROGRESS · JUSTICE')+'</div><div class="nc-flag">'+BF_FLAG+'</div></div>'+
    '<div class="nc-photo">'+photo+'</div>'+
    '<div class="nc-fields"><div><s>'+CL('NOM','SURNAME')+'</s><b>'+esc(p.last.toUpperCase())+'</b></div><div><s>'+CL('PRÉNOM','GIVEN NAME')+'</s><b>'+esc(p.first)+'</b></div>'+
    '<div><s>'+CL('NATIONALITÉ','NATIONALITY')+'</s><b>'+CL('Burkinabè','Burkinabè')+'</b></div><div><s>'+CL('LIEU DE NAISSANCE','PLACE OF BIRTH')+'</s><b>'+esc(p.city)+'</b></div>'+
    '<div class="nc-wide"><s>'+CL('AUTORITÉ DE DÉLIVRANCE','ISSUING AUTHORITY')+'</s><em>'+CL('Ministère de la Santé','Ministry of Health')+'</em></div>'+
    '<div><s>'+CL('DATE DE DÉLIVRANCE','DATE OF ISSUE')+'</s><u>'+ncDate(p.issued)+'</u></div><div><s>'+CL('VALABLE JUSQU’AU','EXPIRY DATE')+'</s><u>'+ncDate(p.expires)+'</u></div></div>'+
    '<div class="nc-hr"></div><div class="nc-qr">'+qrCode('AFKS:'+String(p.num).replace(/\s+/g,''), p.num)+'</div>'+(p.child?'<div class="nc-minor">'+CL('MINEUR','MINOR')+'</div>':'')+
    '<div class="nc-num"><s>'+CL('NUMÉRO DE CARTE','CARD NUMBER')+'</s>'+esc(p.num)+'</div></div></div>';
}
function healthCardBack(p){
  /* Verso : contact d'urgence réel seulement — jamais le contact fictif
     de démonstration à côté du vrai numéro de carte d'un profil réel. */
  const c = p.child ? [CL('RESPONSABLE LÉGAL','LEGAL GUARDIAN'), D.GUARDIAN.name+' — '+D.GUARDIAN.tel]
    : (p.contact ? [CL('CONTACT D’URGENCE','EMERGENCY CONTACT'), p.contact.name+' — '+p.contact.tel]
                 : [CL('CONTACT D’URGENCE','EMERGENCY CONTACT'), t('em_contact_none')]);
  let bars=''; let h=7; for(const ch of String(p.num||'')) h=(h*31+ch.charCodeAt(0))>>>0; for(let i=0;i<70;i++){ h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0; bars+='<i style="width:'+(1+(h%3))+'px;margin-right:'+(1+((h>>3)%2))+'px"></i>'; }
  const rule=['#0f3550','#008751','#fcd116','#e8112d','#1e8ea3'].map(c=>'<i style="background:'+c+'"></i>').join('');
  return '<div class="ncw"><div class="nc">'+ncWaves()+
    '<div class="nc-vhead"><div class="nc-vttl"><b>'+CL('CARTE NATIONALE DE SANTÉ','NATIONAL HEALTH CARD')+'</b><i>'+CL('UNITÉ · PROGRÈS · JUSTICE','UNITY · PROGRESS · JUSTICE')+'</i></div><img class="nc-logo nc-mark" src="assets/logo-mark.png" alt=""></div>'+
    '<div class="nc-rule">'+rule+'</div>'+
    '<div class="nc-vrow"><div><s>'+c[0]+'</s><b>'+esc(c[1])+'</b></div><div><s>'+CL('SERVICES','EMERGENCY SERVICES')+'</s><b>'+CL('Pompiers 18 · SAMU 15 · Police 17 · Gendarmerie 16','Fire 18 · SAMU 15 · Police 17 · Gendarmerie 16')+'</b></div><div class="nc-perso">'+CL('Strictement personnelle<br>et incessible','Strictly personal<br>and non-transferable')+'</div></div>'+
    '<div class="nc-bar"><div class="nc-bars">'+bars+'</div><span>'+esc(p.num)+'</span></div>'+
    '<div class="nc-foot"><span>'+CL('PROPRIÉTÉ DE L’ÉTAT','PROPERTY OF THE STATE')+'</span><span>'+CL('« LA PATRIE OU LA MORT, NOUS VAINCRONS »','“HOMELAND OR DEATH, WE SHALL OVERCOME”')+'</span></div></div></div>';
}
function fitCards(){ document.querySelectorAll('.ncw').forEach(w=>{ const c=w.firstChild; if(c) c.style.transform='scale('+(w.clientWidth/548)+')'; }); }
window.addEventListener('resize', fitCards);
function vCard(){
  const p=cur();
  let side='front';
  const draw=()=>{
    screen(topbar(t('tile_card'), esc(fullName(p))+' · '+ISO(p.num))+'<div class="scroll">'+whoChips()+demoNotice('login_see_card')+
      '<div class="seg"><button class="'+(side==='front'?'on':'')+'" data-sd="front">'+t('card_front')+'</button><button class="'+(side==='back'?'on':'')+'" data-sd="back">'+t('card_back')+'</button></div>'+
      (side==='front'?healthCard(p):healthCardBack(p))+
      (p.child?'<div class="alert blue">'+I('info','sm')+'<span>'+t('card_child_note')+'</span></div>':'')+
      '<div class="sec">'+t('ins_title')+'</div>'+insSummary(p)+
      '<div class="alert green">'+I('shield','sm')+'<span>'+t('card_note')+'</span></div></div>', p.id==='me'&&S.who==='me'?'profile':'family');
    $app.querySelectorAll('[data-sd]').forEach(b=>b.onclick=()=>{ side=b.dataset.sd; draw(); });
    bindWho(()=>vCard());
  };
  draw();
}

/* ---------- INSURANCE ---------- */
function insSummary(p){
  /* Badge « Actif » seulement si une affiliation est connue active
     (souscription enregistrée) ; sinon statut à confirmer. */
  return '<button class="card insrow" data-go="#/insurance"><div class="row"><span class="ic">'+I('shield')+'</span><span class="tx"><b>'+t('ins_arch')+'</b><small>'+(p.child?t('ins_arch_child',{name:fullName(prof('me'))}):t('ins_arch_s'))+'</small></span>'+(S.ins.comp[p.id]?badge('green',t('active')):badge('gray',t('ins_status_unknown')))+'</div>'+'</button>';
}
function vInsurance(){
  const p=cur();
  const draw=()=>{
    const c=S.ins.comp[p.id], link=S.ins.link;
    const linkHtml = p.id==='me' ? (link ? '<div class="card"><div class="row"><span class="ic">'+I('shield')+'</span><span class="tx"><b>'+t('linked_ins')+' · '+esc(link.name)+'</b><small>'+t('ins_t_'+link.type)+' · '+ISO(esc(link.no))+'</small></span>'+badge('orange',t('pending'))+'</div></div>'
      : '<button class="btn ghost" id="lk">'+I('shield','sm')+t('link_ins')+'</button>') : '';
    screen(topbar(t('ins_title'), t('ins_sub'))+'<div class="scroll">'+actingBanner()+
      '<div class="card"><div class="row"><span class="ic">'+I('shield')+'</span><span class="tx"><b>'+t('ins_arch')+'</b><small>'+(p.child?t('ins_arch_child',{name:fullName(prof('me'))}):t('ins_arch_s'))+' · '+ISO(p.num)+'</small></span>'+(c?badge('green',t('active')):badge('gray',t('ins_status_unknown')))+'</div></div>'+
      linkHtml+
      (p.child?'<button class="btn ghost" id="holder" style="margin-top:12px">'+I('swap','sm')+t('ins_see_holder')+'</button>':'')+
      '<p class="demo">'+t('ins_demo')+'</p></div>', S.who==='me'?'profile':'family');
    bindWho();
    const hd=document.getElementById('holder'); if(hd) hd.onclick=()=>{ setWho('me',true); vInsurance(); };
    const lk=document.getElementById('lk'); if(lk) lk.onclick=()=>linkSheet(draw);
    /* Saisie interrompue par l'écran de connexion : la feuille se rouvre
       avec les valeurs déjà tapées (patron de reprise de la réservation). */
    if(linkDraft){ const d=linkDraft; linkDraft=null; linkSheet(draw, d); }
  };
  draw();
}
let linkDraft = null;
function linkSheet(after, prefill){
  let type=(prefill&&prefill.type)||'emp';
  let name=(prefill&&prefill.name!=null)?prefill.name:(type==='arch'?'RAMU':'');
  let no=(prefill&&prefill.no)||'';
  sheet('',s=>{
    const capture=()=>{ const i1=s.querySelector('#inn'), i2=s.querySelector('#ino'); if(i1) name=i1.value; if(i2) no=i2.value; };
    const draw=()=>{ s.querySelector('.sheet').innerHTML='<div class="grab"></div><h3>'+t('link_ins')+'</h3><p>'+t('link_ins_p')+'</p>'+
      '<div class="f"><label>'+t('ins_type')+'</label><div class="chips">'+['arch','emp','mut','priv'].map(k=>'<button class="chip '+(type===k?'on':'')+'" data-ty="'+k+'">'+t('ins_t_'+k)+'</button>').join('')+'</div></div>'+
      '<div class="f"><label>'+t('insurer_name')+'</label><input id="inn" value="'+esc(name)+'"></div><div class="f"><label>'+t('ins_no')+'</label><input id="ino" dir="ltr" value="'+esc(no)+'"></div>'+
      '<button class="btn" id="ls">'+t('link_send')+'</button>';
      s.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{ capture(); type=b.dataset.ty; if(type==='arch' && !name) name='RAMU'; draw(); });
      s.querySelector('#ls').onclick=()=>{ capture(); const n=name.trim(), num=no.trim();
        /* La saisie est lue et conservée AVANT le garde de connexion :
           si l'écran compte s'interpose, linkDraft la restitue au retour. */
        if(!requireLogin('#/insurance','login_required_text')){ linkDraft={type, name:n, no:num}; return; }
        let ok=true;
        if(!n){ s.querySelector('#inn').parentNode.classList.add('err'); ok=false; } if(!num){ s.querySelector('#ino').parentNode.classList.add('err'); ok=false; }
        if(!ok){ toast(t('fill_required')); return; }
        S.ins.link={type, name:n, no:num, at:Date.now()}; addNotif('shield',t('n_ins_t'),t('link_ok')); save(); closeSheet(); toast(t('link_ok')); after(); };
    };
    draw();
  });
}

/* ---------- Profile, notifs, about, search ---------- */
/* ---------- Compte AfrikSol (connexion e-mail, base partagée) ---------- */
/* Pont de fusion : backend.js y dépose l'historique relu de la base partagée
   (commandes, rendez-vous, assurance, notifications) au format local. */
window.AFK_MERGE = function(h){
  if(!h) return;
  S.ins = S.ins || {comp:{}, link:null};
  S.ins.comp = S.ins.comp || {};
  /* Déduplication sur l'identifiant backend : un élément local déjà
     synchronisé (sb, ou porteur de sbId/sbIds) ne coexiste jamais avec
     sa copie relue de la base — sinon chaque relecture d'historique
     créerait un doublon visible (et un double paiement affiché). */
  if(h.orders){
    const oIds = new Set(); h.orders.forEach(o=>{ if(o.sbId) oIds.add(o.sbId); (o.sbIds||[]).forEach(i=>oIds.add(i)); });
    S.orders = (S.orders||[]).filter(o=>!o.sb && !(o.sbId && oIds.has(o.sbId)) && !(o.sbIds||[]).some(i=>oIds.has(i))).concat(h.orders).sort((a,b)=>b.at-a.at);
  }
  if(h.appts){
    const aIds = new Set(h.appts.map(a=>a.sbId).filter(Boolean));
    S.appts = (S.appts||[]).filter(a=>!a.sb && !(a.sbId && aIds.has(a.sbId))).concat(h.appts);
  }
  if(h.insByProfile) for(const pid in h.insByProfile) S.ins.comp[pid] = h.insByProfile[pid];
  if(h.notifs && h.notifs.length){
    const seen = new Set((S.notifs||[]).map(n=>n.sbId).filter(Boolean));
    const add = h.notifs.filter(n=>!seen.has(n.sbId));
    if(add.length) S.notifs = add.concat(S.notifs||[]);
  }
  save();
};
/* backend.js signale chaque synchronisation réussie (« afk-synced ») :
   persister aussitôt les identifiants backend rattachés à l'élément
   local (sbId, sbDone…) — un rechargement avant le prochain save()
   les perdrait et la relecture d'historique recréerait un doublon. */
window.addEventListener('afk-synced', ()=>{ save(); });
/* ---------- Synchronisation différée ----------
   backend.js signale chaque échec d'écriture par l'événement
   « afk-sync-fail » : l'élément reste enregistré sur l'appareil (succès
   local inchangé), il est marqué « en attente » et réessayé au retour du
   réseau et au chargement de l'app. */
window.addEventListener('afk-sync-fail', e=>{
  const d=(e&&e.detail)||{}; let marked=false;
  if(d.kind==='appt'){ const a=(S.appts||[]).find(x=>x.id===d.ref); if(a && !a.sb){ a.pendingSync=true; marked=true; } }
  if(d.kind==='order'){ const o=(S.orders||[]).find(x=>x.id===d.ref); if(o && !o.sb){ o.pendingSync=true; marked=true; } }
  if(marked) save();
  toast(t('sync_pending'));
});
function retryPendingSync(){
  if(!(window.AFK && AFK.connected())) return;
  /* Créations : uniquement les éléments NON marqués sb (idempotence —
     un élément marqué est déjà en base ; syncAppt/syncOrder reprennent
     en interne le seul paiement manquant grâce à sbId/sbDone). */
  (S.appts||[]).filter(a=>a.pendingSync && !a.sb).forEach(a=>{ AFK.syncAppt(a).then(r=>{ if(r){ a.pendingSync=false; save(); } }); });
  (S.orders||[]).filter(o=>o.pendingSync && !o.sb).forEach(o=>{ AFK.syncOrder(o).then(r=>{ if(r){ o.pendingSync=false; save(); } }); });
  /* Annulations non propagées : reprises ici jusqu'à confirmation. */
  (S.appts||[]).filter(a=>a.cancelPending && a.sbId).forEach(a=>{ AFK.cancelAppt(a); });
}
window.addEventListener('online', retryPendingSync);
function accountRow(){
  const on = window.AFK && AFK.connected();
  const s = on ? AFK.session() : null, p = on ? AFK.patient() : null;
  return '<button class="row" data-go="#/account"><span class="ic">'+I('shield','sm')+'</span><span class="tx"><b>'+t('account')+'</b><small>'+(on ? esc(s.user.email)+(p ? ' · '+ISO(p.health_id) : '') : t('account_off'))+'</small></span>'+I('chev','sm chev')+'</button>';
}
function authErr(e){
  /* Erreurs d'authentification traduites — jamais le message brut du
     serveur (en anglais) ; message générique traduit en dernier recours. */
  const m = (e && e.message) || '';
  if(/Invalid login credentials/i.test(m)) return t('err_credentials');
  if(/already registered/i.test(m)) return t('err_exists');
  if(/not confirmed/i.test(m)) return t('err_unconfirmed');
  if(/invalid.*email|email.*invalid/i.test(m)) return t('err_email');
  if(/failed to fetch|network|load failed/i.test(m)) return t('err_network');
  if(/password/i.test(m)) return t('err_password');
  return t('err_generic');
}
/* Déconnexion : les éléments synchronisés du compte (rendez-vous et
   commandes « sb », souscriptions relues) sont purgés de l'état local
   pour ne pas être montrés à l'utilisateur suivant sur l'appareil. */
function purgeAccountData(){
  S.appts=(S.appts||[]).filter(a=>!a.sb);
  S.orders=(S.orders||[]).filter(o=>!o.sb);
  S.notifs=(S.notifs||[]).filter(n=>!n.sbId);
  if(S.ins && S.ins.comp) for(const pid in S.ins.comp){ if(S.ins.comp[pid] && S.ins.comp[pid].sb) delete S.ins.comp[pid]; }
  /* Mémoire aussi : le profil réel injecté dans DATA (nom, numéro de
     carte, contact d'urgence, dossier relu) est restauré à l'état de
     démonstration capturé au démarrage — sans rechargement, aucun écran
     (accueil, carte, SOS, dossier) ne montre encore les données du
     compte précédent. */
  if(window.AFK && AFK.resetDemoData) AFK.resetDemoData();
  S.who='me'; save();
}
/* Écran de bienvenue après connexion réussie (cahier P8) : « Bienvenue,
   Prénom ! » affiché ~3 s, avec bouton Continuer ; la redirection
   automatique ne part que si l'écran est toujours affiché. */
function vWelcome(next){
  next = next || '#/home';
  const pat = (window.AFK && AFK.patient()) || {};
  const ses = (window.AFK && AFK.session()) || {};
  const first = pat.first_name || (ses.user && ses.user.name ? String(ses.user.name).split(' ')[0] : '') || (ses.user && ses.user.email ? String(ses.user.email).split('@')[0] : '');
  screen('<div class="scroll" id="welcomeScr"><div class="ok" style="padding-top:38px"><div class="c">'+I('check','lg')+'</div><h2>'+t('welcome_name',{name:esc(first)})+'</h2><p>'+t('welcome_sub')+'</p></div>'+
    '<div style="margin-top:22px"><button class="btn" id="wgo">'+t('continue')+'</button></div></div>','profile');
  document.getElementById('wgo').onclick=()=>go(next);
  setTimeout(()=>{ if(document.getElementById('welcomeScr')) go(next); }, 3000);
}
function vAccount(){
  if(!window.AFK){
    screen(topbar(t('account'),'')+'<div class="scroll"><div class="card empty">'+t('err_generic')+'</div></div>','profile');
    return;
  }
  if(AFK.connected()){
    const s = AFK.session(), p = AFK.patient();
    screen(topbar(t('account'),'')+'<div class="scroll">'+
      '<div class="card"><div class="kv"><span>'+t('email')+'</span><b>'+esc(s.user.email)+'</b></div>'+
      (p ? '<div class="kv"><span>'+t('patient')+'</span><b>'+esc(p.first_name+' '+p.last_name)+'</b></div><div class="kv"><span>'+t('health_no')+'</span><b>'+ISO(p.health_id)+'</b></div>'
         : '<div class="alert orange" style="margin-top:10px">'+I('info','sm')+'<span>'+t('account_nopat')+'</span></div>')+
      '</div>'+
      '<div class="alert green" style="margin-top:12px">'+I('check','sm')+'<span>'+t('account_on_note')+'</span></div>'+
      '<div style="margin-top:16px"><button class="btn ghost" id="so">'+t('sign_out')+'</button></div></div>','profile');
    document.getElementById('so').onclick = ()=>{ purgeAccountData(); AFK.signOut(); toast(t('signed_out')); route(); };
    if(!p) AFK.loadPatient().then(q=>{ if(q) route(); }).catch(()=>{});
    return;
  }
  let mode = 'in';
  const draw = ()=>{
    screen(topbar(t('account'),'')+'<div class="scroll">'+
      ((pendingLogin && pendingLogin.msg) ? '<div class="alert blue">'+I('info','sm')+'<span>'+t(pendingLogin.msg)+'</span></div>' : '<div class="alert blue">'+I('info','sm')+'<span>'+t('demo_mode_note')+'</span></div>')+
      '<div class="chips" style="margin:12px 0"><button class="chip '+(mode==='in'?'on':'')+'" data-m="in">'+t('sign_in')+'</button><button class="chip '+(mode==='up'?'on':'')+'" data-m="up">'+t('sign_up')+'</button></div>'+
      (mode==='up' ? '<div class="f"><label>'+t('full_name')+'</label><input id="an" autocomplete="name" placeholder="'+t('ph_full_name')+'"></div>' : '')+
      '<div class="f"><label>'+t('email')+'</label><input id="ae" type="email" autocomplete="email" placeholder="'+t('ph_email')+'"></div>'+
      '<div class="f"><label>'+t('password')+'</label><input id="ap" type="password" autocomplete="'+(mode==='up'?'new-password':'current-password')+'"'+(mode==='up'?' minlength="8"':'')+' placeholder="••••••••"></div>'+
      '<div id="aerr"></div>'+
      '<div style="margin-top:14px"><button class="btn blue" id="ago">'+(mode==='up' ? t('sign_up') : t('sign_in'))+'</button></div>'+
      (mode==='in' ? '<div style="margin-top:10px;text-align:center"><button class="lnk" id="afp">'+t('forgot_password')+'</button></div>' : '')+
      '<div style="margin-top:10px"><button class="btn ghost" id="ademo">'+t('demo_continue')+'</button></div>'+
      '<p class="demo" style="margin-top:12px">'+t('account_note')+'</p></div>','profile');
    document.getElementById('ademo').onclick = ()=>{ pendingLogin = null; S.acctSeen = 1; save(); go('#/home'); };
    $app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ mode=b.dataset.m; draw(); });
    document.getElementById('ago').onclick = ()=>{
      const email = document.getElementById('ae').value.trim(), pw = document.getElementById('ap').value;
      const name = mode==='up' ? document.getElementById('an').value.trim() : '';
      const err = m => { document.getElementById('aerr').innerHTML = '<div class="alert orange" style="margin-top:10px">'+I('alert','sm')+'<span>'+esc(m)+'</span></div>'; };
      if(!email || !pw || (mode==='up' && !name)){ err(t('fill_required')); return; }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err(t('err_email')); return; }
      /* Inscription : mot de passe d'au moins 8 caractères, comme la
         réinitialisation — rejeté côté client avant tout appel réseau. */
      if(mode==='up' && pw.length<8){ err(t('err_password')); return; }
      const btn = document.getElementById('ago'); btn.disabled = true;
      const act = mode==='up' ? AFK.signUp(email, pw, name) : AFK.signIn(email, pw);
      act.then(()=>{ S.acctSeen = 1; save(); const resume = pendingLogin ? pendingLogin.next : null; pendingLogin = null; vWelcome(resume); }).catch(e=>{ btn.disabled = false; err(authErr(e)); });
    };
    const afp=document.getElementById('afp');
    if(afp) afp.onclick = ()=>{
      const email = document.getElementById('ae').value.trim();
      const err = m => { document.getElementById('aerr').innerHTML = '<div class="alert orange" style="margin-top:10px">'+I('alert','sm')+'<span>'+esc(m)+'</span></div>'; };
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err(t('err_email')); return; }
      afp.disabled = true;
      AFK.resetPassword(email).then(()=>{ toast(t('reset_sent')); }).catch(e=>{ afp.disabled = false; err(authErr(e)); });
    };
  };
  draw();
}
function vProfile(){
  const me=prof('me');
  const menu=[['receipt','my_payments','#/payments'],['card','tile_card','#/card'],['shield','ins_title','#/insurance'],['calendar','tile_appts','#/appts'],['bag','my_orders','#/orders'],['file','tile_record','#/record'],['family','my_family','#/family'],['bell','notifications','#/notifs'],['globe','language','#/language'],['phone','em_contacts','#/record/contacts'],['info','about','#/about']];
  screen(topbar(t('profile'),'',{noBack:true})+'<div class="scroll"><div class="prof">'+avatar(me,62)+'<span><b>'+esc(fullName(me))+'</b><small>'+ISO(me.num)+' · '+me.city+'</small></span></div>'+
    '<div style="margin:14px 0">'+healthCard(me)+'</div><div class="menu">'+accountRow()+(window.AFK && AFK.connected() ? '<button class="row" id="lgo"><span class="ic">'+I('logout','sm')+'</span><span class="tx"><b>'+t('sign_out')+'</b><small>'+esc(AFK.session().user.email)+'</small></span></button>' : '')+menu.map(([ic,k,h])=>'<button class="row" data-go="'+h+'" data-mine="1"><span class="ic">'+I(ic,'sm')+'</span><span class="tx"><b>'+t(k)+'</b>'+(k==='language'?'<small>'+t('lang_note')+'</small>':'')+'</span>'+I('chev','sm chev')+'</button>').join('')+
    '<button class="row" id="rs"><span class="ic">'+I('refresh','sm')+'</span><span class="tx"><b>'+t('reset_demo')+'</b><small>'+t('reset_demo_s')+'</small></span></button></div><p class="demo">AfrikSol Santé · v2.0 · '+t('demo_note')+'</p></div>','profile');
  $app.querySelectorAll('[data-mine]').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.go!=='#/family'){ S.who='me'; save(); } }, true));
  const lgo=document.getElementById('lgo'); if(lgo) lgo.onclick=()=>{ purgeAccountData(); AFK.signOut(); toast(t('signed_out')); route(); };
  document.getElementById('rs').onclick=()=>sheet('<h3>'+t('reset_demo')+'</h3><p>'+t('reset_q')+'</p><button class="btn" id="y">'+t('reset_yes')+'</button>',s=>s.querySelector('#y').onclick=()=>{ try{ Object.keys(localStorage).filter(k=>k.startsWith('afk2_')&&k!=='afk2_lang').forEach(k=>localStorage.removeItem(k)); }catch(e){} location.hash='#/home'; location.reload(); });
}
function vNotifs(){
  const list=S.notifs||[];
  screen(topbar(t('notifications'),'')+'<div class="scroll">'+(list.length?list.map(n=>'<div class="notif '+(n.read?'':'unread')+'"><span class="ic">'+I(n.icon,'sm')+'</span><span><b>'+esc(n.title)+'</b><small>'+esc(n.body)+'</small><small>'+fmtDT(n.at)+'</small></span></div>').join(''):'<div class="card empty">'+t('nothing')+'</div>')+'</div>','home');
  list.forEach(n=>n.read=true); save();
}
function vAbout(){
  screen(topbar(t('about'),'')+'<div class="scroll"><div class="lang-logo" style="padding:20px 0"><img src="assets/logo-mark.png" alt=""><b>AfrikSol <span>Santé</span></b></div><div class="card" style="font-size:14px;line-height:1.6;color:var(--ink-2)">'+t('about_text')+'</div><div class="alert orange">'+I('info','sm')+'<span>'+t('demo_long')+'</span></div></div>','profile');
}
function vSearch(q){
  q=decodeURIComponent(q||''); const s=q.toLowerCase();
  const specs=D.SPECIALTIES.filter(x=>t('spec_'+x).toLowerCase().includes(s));
  const meds=D.MEDICINES.filter(m=>(m.name+' '+tx(m.cls)).toLowerCase().includes(s));
  const facs=[].concat(D.FACILITIES.pub,D.FACILITIES.clin,D.FACILITIES.cab).filter(f=>(f.name+f.area).toLowerCase().includes(s));
  const docs=[]; ['pub','clin','cab'].forEach(tp=>D.FACILITIES[tp].forEach(f=>D.SPECIALTIES.forEach(sp=>D.doctorsFor(f.id,sp).forEach(d=>{ if(d.name.toLowerCase().includes(s)&&docs.length<6) docs.push({d,f,sp,tp}); }))));
  const sec=(title,html)=>html?'<div class="sec">'+title+'</div><div class="list">'+html+'</div>':'';
  const html = sec(t('specialties'), specs.map(x=>'<button class="row" data-go="#/book/'+x+'"><span class="ic">'+I('stetho','sm')+'</span><span class="tx"><b>'+t('spec_'+x)+'</b></span>'+I('chev','sm chev')+'</button>').join(''))+
    sec(t('doctors_l'), docs.map(o=>'<button class="row" data-go="#/book/fac/'+o.tp+'/'+o.f.id+'"><span class="av" style="width:40px;height:40px;font-size:13px">'+o.d.ini+'</span><span class="tx"><b>'+esc(o.d.name)+'</b><small>'+t('spec_'+o.sp)+' · '+esc(o.f.name)+'</small></span>'+I('chev','sm chev')+'</button>').join(''))+
    sec(t('medicines'), meds.map(m=>'<button class="row" data-go="#/pharmacy"><span class="ic">'+I('pill','sm')+'</span><span class="tx"><b>'+esc(m.name)+'</b><small>'+money(m.price)+'</small></span>'+I('chev','sm chev')+'</button>').join(''))+
    sec(t('hosp_cs'), facs.map(f=>'<button class="row" data-go="#/hospitals"><span class="ic">'+I('hospital','sm')+'</span><span class="tx"><b>'+esc(f.name)+'</b><small>'+esc(f.area)+'</small></span>'+I('chev','sm chev')+'</button>').join(''));
  screen(topbar(t('results'), '« '+esc(q)+' »')+'<div class="scroll"><form class="search" id="sf" style="margin-top:0">'+I('search','sm')+'<input id="q" value="'+esc(q)+'"></form>'+(html||'<div class="card empty" style="margin-top:14px">'+t('no_result')+'</div>')+'</div>','home');
  document.getElementById('sf').onsubmit=e=>{ e.preventDefault(); const v=document.getElementById('q').value.trim(); if(v) go('#/search/'+encodeURIComponent(v)); };
}

/* ---------- Réception du lien de réinitialisation ----------
   Le lien envoyé par Supabase arrive en fragment d'URL :
   #access_token=…&type=recovery (ou #error=… si le lien a expiré).
   À intercepter AVANT le routeur, qui lirait ce fragment comme une
   route inconnue : le jeton est gardé en session (éphémère), le
   fragment est nettoyé sans recharger, et l'écran « Nouveau mot de
   passe » (vReset) est affiché par le code de démarrage, plus bas. */
let recovery = null;
(function catchRecovery(){
  const parse = h => { const q={}; String(h||'').replace(/^#\/?/,'').split('&').forEach(pv=>{ const i=pv.indexOf('='); if(i>0){ try{ q[decodeURIComponent(pv.slice(0,i))]=decodeURIComponent(pv.slice(i+1)); }catch(e){} } }); return q; };
  const q = parse(location.hash);
  if(q.type==='recovery' && q.access_token){
    recovery = { token:q.access_token };
    try{ sessionStorage.setItem('afk2_recovery', JSON.stringify({token:q.access_token, at:Date.now()})); }catch(e){}
  } else if(q.error || q.error_code){
    recovery = { error:true };
  }
  if(recovery){
    try{ history.replaceState(null,'', location.pathname + location.search + '#/home'); }catch(e){}
  } else if(!location.hash || location.hash==='#/' || location.hash==='#/home'){
    /* Rechargement de la page pendant l'écran de réinitialisation :
       le jeton gardé en session (moins d'une heure) rouvre le formulaire. */
    try{ const s=JSON.parse(sessionStorage.getItem('afk2_recovery')||'null'); if(s && s.token && Date.now()-s.at < 36e5) recovery={token:s.token}; }catch(e){}
  }
})();
function clearRecovery(){ recovery = null; try{ sessionStorage.removeItem('afk2_recovery'); }catch(e){} }
function vReset(){
  const drawError = ()=>{
    screen(topbar(t('reset_title'),'')+'<div class="scroll">'+
      '<div class="alert orange">'+I('alert','sm')+'<span>'+t('reset_link_invalid')+'</span></div>'+
      '<div style="margin-top:14px"><button class="btn" id="rnew">'+t('reset_ask_new')+'</button></div></div>','profile');
    document.getElementById('rnew').onclick=()=>{ clearRecovery(); go('#/account'); };
  };
  const drawForm = ()=>{
    screen(topbar(t('reset_title'),'')+'<div class="scroll">'+
      '<p style="font-size:14px;color:var(--ink-2);line-height:1.55;margin:2px 0 14px">'+t('reset_intro')+'</p>'+
      '<div class="f"><label>'+t('new_password')+'</label><input id="rp1" type="password" autocomplete="new-password" placeholder="••••••••"></div>'+
      '<div class="f"><label>'+t('confirm_password')+'</label><input id="rp2" type="password" autocomplete="new-password" placeholder="••••••••"></div>'+
      '<div id="rerr"></div>'+
      '<div style="margin-top:14px"><button class="btn blue" id="rgo">'+t('reset_validate')+'</button></div>'+
      '<div style="margin-top:10px;text-align:center"><button class="lnk" id="rcx">'+t('reset_cancel')+'</button></div></div>','profile');
    document.getElementById('rcx').onclick=()=>{ clearRecovery(); go('#/account'); };
    document.getElementById('rgo').onclick=()=>{
      const p1=document.getElementById('rp1').value, p2=document.getElementById('rp2').value;
      const show=m=>{ document.getElementById('rerr').innerHTML='<div class="alert orange" style="margin-top:10px">'+I('alert','sm')+'<span>'+esc(m)+'</span></div>'; };
      if(p1.length<8){ show(t('reset_too_short')); return; }
      if(p1!==p2){ show(t('reset_mismatch')); return; }
      const btn=document.getElementById('rgo'); btn.disabled=true;
      AFK.setRecoveredPassword(recovery.token, p1).then(()=>{
        clearRecovery();
        toast(t('reset_done'));
        go('#/account');
      }).catch(()=>{ drawError(); });
    };
  };
  if(!window.AFK || (recovery && recovery.error)) drawError(); else drawForm();
}

/* ---------- Connexion exigée au moment de l'action ----------
   L'application est libre sans compte ; la connexion n'est demandée
   qu'au moment d'une action engageante (transmettre une réservation,
   valider une commande, rattacher une assurance). L'écran compte
   s'ouvre en mode connexion avec un bandeau d'explication, et après
   connexion réussie le flux interrompu reprend où il s'était arrêté
   (le brouillon de réservation B est conservé en mémoire). */
let pendingLogin = null;
function requireLogin(next, msgKey){
  if(window.AFK && AFK.connected()) return true;
  pendingLogin = { next: next || '#/home', msg: msgKey || 'login_required_text', armed: true };
  go('#/account');
  return false;
}
/* Étiquette « Démonstration » pour la carte et le dossier sans compte :
   les données affichées sont fictives tant qu'on n'est pas connecté. */
function demoNotice(btnKey){
  if(window.AFK && AFK.connected()) return '';
  return '<div class="alert orange" style="margin-top:0;margin-bottom:10px">'+I('info','sm')+'<span>'+badge('orange',t('demo_label'))+' '+t('demo_data_note')+'</span></div>'+
    '<button class="btn ghost" data-go="#/account" style="margin-bottom:14px">'+t(btnKey)+'</button>';
}

/* ---------- router ---------- */
function route(){
  closeSheet();
  /* Quitter l'écran de réinitialisation autrement que par « Valider »
     (navigation, retour…) efface le jeton de récupération : il ne doit
     pas rester utilisable en session après coup. */
  if(recovery) clearRecovery();
  if(!S.lang && location.hash!=='#/lang'){ return vSplash(); }
  seed();
  const h=(location.hash||'#/home').replace(/^#\/?/,''); const [p,...a]=h.split('/');
  /* Action en attente de connexion : conservée tant qu'on est sur
     l'écran compte (ou qu'on vient d'y être envoyé par requireLogin),
     abandonnée si l'utilisateur repart naviguer ailleurs. */
  if(pendingLogin){ if(p!=='account' && !pendingLogin.armed) pendingLogin=null; else pendingLogin.armed=false; }
  switch(p){
    case '': case 'home': return vHome();
    case 'lang': return vLang(false);
    case 'language': return vLang(true);
    case 'sos': return vSos();
    case 'record': return a[0]?vRecordItem(a[0]):vRecord();
    case 'appts': return vAppts();
    case 'hospitals': return vHospitals();
    case 'pharmacies': return vPharmacies();
    case 'book': return vBook(a);
    case 'booked': return vBooked(a[0]);
    case 'pharmacy': return vPharmacy();
    case 'cart': return vCart();
    case 'ordered': return vTrack(a[0], true);
    case 'order': return vTrack(a[0], false);
    case 'orders': return vOrders();
    case 'payments': return vPayments();
    case 'payment': return vPayment(a[0]);
    case 'family': return vFamily();
    case 'card': return vCard();
    case 'insurance': return vInsurance();
    case 'profile': return vProfile();
    case 'account': return vAccount();
    case 'notifs': return vNotifs();
    case 'about': return vAbout();
    case 'search': return vSearch(a.join('/'));
    default: return vHome();
  }
}
document.addEventListener('click', e=>{
  const g=e.target.closest('[data-go]'); if(g){ e.preventDefault(); go(g.dataset.go); return; }
  const b=e.target.closest('[data-back]'); if(b){ e.preventDefault(); if(history.length>1) history.back(); else go('#/home'); }
});
/* Hook de rafraîchissement pour backend.js : re-rendre la vue courante
   quand le catalogue backend arrive (le routeur reste interne). */
window.AFK_REFRESH = route;
window.addEventListener('hashchange', route);
applyDir();
if(recovery){ vReset(); }
else if(S.lang){ if(!location.hash||location.hash==='#/'){ vSplash(); } else route(); }
else vSplash();
setTimeout(retryPendingSync, 1500); /* éléments en attente de synchronisation */
})();

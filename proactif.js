/* =========================================================
   ATLAS — il parle le premier, au bon moment
   - Une file d'annonces : chacune attend qu'il se taise, que personne ne parle, et qu'il y ait quelqu'un
     dans la pièce (vu ou entendu depuis peu) ; la nuit (22 h 30 – 7 h), seulement l'urgent.
     Chaque annonce n'est dite qu'une fois ; passé son heure, elle est oubliée.
   - Le briefing du matin : la première fois qu'il te reconnaît le matin (voix ou visage) — météo et pluie,
     rappels et rendez-vous du jour, agenda, ce qui t'attend sur les marchés.
   - La pluie qui arrive (dans 15 à 45 minutes), l'ordinateur de la maison qui chauffe ou se remplit.
   - Les alertes des marchés viennent de marche.js. Réglage : « Il me prévient de lui-même ».
   ========================================================= */
'use strict';

const PROACTIF = (() => {
  const file = [];
  let dits = {};
  try { dits = JSON.parse(localStorage.getItem('atlas-dits') || '{}') || {}; } catch (e) { dits = {}; }
  const garde = () => { const lim = Date.now() - 3 * 86400000; Object.keys(dits).forEach(k => { if (dits[k] < lim) delete dits[k]; }); try { localStorage.setItem('atlas-dits', JSON.stringify(dits)); } catch (e) { /* rien */ } };
  function annonce(cle, texte, { urgent = false, expire = Date.now() + 30 * 60000, enchaine = false, lumiere = '' } = {}) {
    if (dits[cle] || file.some(x => x.cle === cle)) return false;
    file.push({ cle, texte, urgent, expire, enchaine, lumiere, depuis: Date.now() });
    return true;
  }
  // les lumières qui parlent : pendant qu'il le dit, une lampe de la pièce bouge au rythme de sa voix, dans la teinte du message
  // (« message » : blanc froid bleuté, un message de son fils ; « marche » : blanc chaud ambré ; « alerte » : des éclairs) — puis elle revient comme avant
  async function avecLumiere(motif, t, fn) {
    const r0 = VOIXMAISON.root(), on = !!(r0 && motif && t && S.settings.lumieresParlent !== false && !window.__BANC);
    const post = corps => fetch(`${r0}/maison/lumiere-parle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), cache: 'no-store' }).catch(() => {});
    if (on) post({ motif, role: typeof CONSTELLATION !== 'undefined' ? CONSTELLATION.role : '', duree: Math.min(45, 3 + String(t).length / 13) });
    try { return await fn(); } finally { if (on) post({ stop: true }); }
  }
  const nuit = () => { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return h >= 22.5 || h < 7; };
  const quelquun = () => Date.now() - Math.max(ARRIVEE.dernier(), dlg.lastActive || 0, CONV.dernier()) < 20 * 60000;
  let parle = false;
  async function tic() {
    for (let i = file.length - 1; i >= 0; i--) if (file[i].expire < Date.now()) file.splice(i, 1);
    if (!file.length || parle || !dlg.started || voice.endormi || dlg.state === 'off' || dlg.busy || voice.occupe() || OREILLES.hearing()) return;
    // Atlas le suit : les annonces non urgentes ne sont dites que sur l'appareil où il est (les urgentes, partout)
    const ici = typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal();
    if (!ici) for (let i = file.length - 1; i >= 0; i--) if (!file[i].urgent) { dits[file[i].cle] = Date.now(); file.splice(i, 1); }
    const x = file.find(y => (y.urgent || (!nuit() && quelquun())) && (S.settings.proactif !== false || /^(eco|ny|alerte)-/.test(y.cle)));
    if (!x || Date.now() - (voice.endedAt || 0) < (x.enchaine ? 700 : 6000)) return;
    file.splice(file.indexOf(x), 1);
    dits[x.cle] = Date.now(); garde();
    parle = true; dlg.busy = true;
    try {
      const t = typeof x.texte === 'function' ? await x.texte() : x.texte;
      if (t && !voice.endormi) {
        if (!x.enchaine) fx.tone([[660, 0.06], [990, 0.09]]); // un petit signal : c'est lui qui prend la parole
        CONV.note('Atlas', t); face.flash('happy', 1000);
        await avecLumiere(x.lumiere, t, () => say(t));
        dlg.state = 'talk'; dlg.silence = 0; dlg.lastActive = Date.now(); // on peut lui répondre sans redire son nom
      }
    } catch (e) { console.warn('annonce', e); } finally { parle = false; dlg.busy = false; dlg.repondu = Date.now(); }
  }
  setInterval(tic, 2000);

  /* ---------- le briefing du matin ---------- */
  // ses souvenirs sont écrits à la 3e personne (« Il doit rendre… ») : à l'oral, on le tutoie
  const VERBES = { a: 'as', est: 'es', doit: 'dois', va: 'vas', fait: 'fais', peut: 'peux', veut: 'veux', part: 'pars', prend: 'prends', voit: 'vois', sait: 'sais', vient: 'viens', reçoit: 'reçois' };
  const tu = t => String(t).replace(/^(Il|Elle) (\S+)/, (m, p, v) => `tu ${VERBES[v] || (/e$/.test(v) ? `${v}s` : v)}`).replace(/^Son /, 'ton ').replace(/^Sa /, 'ta ').replace(/^Ses /, 'tes ');
  const matin = () => { const h = new Date().getHours(); return h >= 5 && h < 12; };
  const fait = () => S.matinFait === dayKey();
  async function briefMatin() {
    const parts = [];
    try {
      const v = S.settings.ville;
      if (v) {
        const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`)).json();
        const h = new Date().getHours(), pluie = w.hourly.time.map((t, i) => [+t.slice(11, 13), w.hourly.precipitation_probability[i]]).filter(([hh, p]) => hh >= h && hh <= 21 && p >= 50);
        parts.push(`Dehors, ${Math.round(w.current.temperature_2m)} degrés, jusqu'à ${Math.round(w.daily.temperature_2m_max[0])} cet après-midi${pluie.length ? `, de la pluie probable vers ${pluie[0][0]} heures` : ', sans pluie prévue'}`);
      }
    } catch (e) { /* pas de météo */ }
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const rap = (S.minuteurs || []).filter(t => t.type === 'rappel' && t.fin <= +fin).sort((a, b) => a.fin - b.fin);
    if (rap.length) parts.push(`Tes rappels du jour : ${rap.slice(0, 3).map(t => `${t.nom} à ${hhmm(new Date(t.fin))}`).join(', ')}`);
    const mem = MEMOIRE.aujourdhui();
    if (mem.length) parts.push(`Et n'oublie pas : ${mem.slice(0, 2).map(x => tu(x.texte.replace(/\.$/, ''))).join(', ')}`);
    const up = LIEN.upcoming(1).slice(0, 2);
    if (up.length) parts.push(`Agenda de la famille : ${up.map(x => `${x.e.text} ${x.days === 0 ? "aujourd'hui" : 'demain'}`).join(', ')}`);
    if (S.settings.marches !== false) { const m = await MARCHE.resumeMatin(); if (m) parts.push(m); }
    return parts.length ? `${parts.join('. ')}.` : '';
  }
  // il vient de reconnaître quelqu'un de la maison (pas l'enfant), le matin : le briefing suit l'accueil
  function reconnu(nom) {
    if (!nom || /^invité/.test(nom) || nom === 'Atlas' || !matin() || fait() || S.settings.proactif === false) return;
    if (LIEN.prenom() && nom.toLowerCase() === LIEN.prenom().toLowerCase()) return;
    S.matinFait = dayKey(); save();
    annonce(`matin-${dayKey()}`, briefMatin, { urgent: true, enchaine: true, expire: Date.now() + 5 * 60000 });
  }
  // au démarrage le matin : le briefing remplace le simple bonjour
  async function auDemarrage() {
    if (!matin() || fait() || S.settings.proactif === false) return '';
    S.matinFait = dayKey(); save();
    return briefMatin();
  }

  /* ---------- la pluie qui arrive ---------- */
  async function pluie() {
    const v = S.settings.ville;
    if (!v || S.settings.proactif === false || navigator.onLine === false || !dlg.started) return;
    try {
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&minutely_15=precipitation&forecast_minutely_15=6&past_minutely_15=1&timezone=auto`)).json();
      const p = w.minutely_15.precipitation, t = w.minutely_15.time, maint = Date.now();
      const idx = t.map((x, i) => [new Date(x).getTime(), p[i]]);
      const sec = idx.filter(([tt]) => tt <= maint).every(([, q]) => q < 0.1);
      const arrive = idx.find(([tt, q]) => tt > maint + 10 * 60000 && tt < maint + 50 * 60000 && q >= 0.3);
      if (sec && arrive) {
        const min = Math.max(10, Math.round((arrive[0] - maint) / 300000) * 5);
        annonce(`pluie-${dayKey()}-${new Date().getHours() >> 2}`, `Petite info : la pluie arrive à ${v.name} dans environ ${min} minutes. Si du linge sèche dehors, c'est le moment.`, { expire: arrive[0] });
      }
    } catch (e) { /* plus tard */ }
  }
  setInterval(pluie, 10 * 60000); setTimeout(pluie, 90000);

  /* ---------- l'ordinateur de la maison ---------- */
  async function ordinateur() {
    const root = VOIXMAISON.root();
    if (!root || S.settings.proactif === false || !dlg.started) return;
    try {
      const e = await (await fetch(`${root}/shadow/pc`, { cache: 'no-store' })).json();
      const q = Math.floor(Date.now() / (6 * 3600000)); // au plus une fois toutes les 6 heures
      if (e.temp_cpu >= 88 || e.temp_gpu >= 88) annonce(`pc-chaud-${q}`, `Ton ordinateur chauffe : ${Math.max(e.temp_cpu || 0, e.temp_gpu || 0)} degrés. Un calcul lourd tourne peut-être.`);
      if (e.disque_pct >= 92) annonce(`pc-disque-${q}`, `Le disque de ton ordinateur est presque plein : il reste ${e.disque_libre_go} gigas.`);
    } catch (e) { /* éteint */ }
  }
  setInterval(ordinateur, 15 * 60000); setTimeout(ordinateur, 120000);

  return { annonce, avecLumiere, reconnu, auDemarrage, briefMatin, _file: file, _tic: tic };
})();

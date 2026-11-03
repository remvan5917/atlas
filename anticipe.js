/* =========================================================
   ATLAS — les anticipations : il voit venir la situation, et il fait la chose utile sans qu'on le lui demande
   - Le repas au retour : papa rentre à l'heure d'un repas (11 h – 14 h, 18 h – 21 h) → le menu du jour à l'écran, et le repas du moment dit.
   - La pluie avant l'école : 10 à 25 minutes avant d'aller chercher son fils, s'il va pleuvoir ou faire très froid à cette heure-là, il le dit
     (sinon il se tait).
   - Le goûter au retour : papa rentre avec son fils l'après-midi (juste après « Récupérer … à l'école ») → le goûter, et la suite de la journée.
   La règle : la première fois, il le fait une fois puis demande « je le fais à chaque fois ? » — oui : toujours ; non : plus jamais.
   Il ne fait que montrer et dire (jamais d'appel, de message, d'achat ni de lumière). Les réponses sont gardées sur l'ordinateur
   (routines.json → anticipations), pour tous les Atlas. « Tes anticipations », « arrête de m'afficher le menu quand je rentre ».
   ========================================================= */
'use strict';

const ANTICIPE = (() => {
  const root = () => VOIXMAISON.root();
  const enfant = () => (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
  const CAT = {
    'repas-retour': { nom: 'le repas au retour', dit: () => "quand tu rentres à l'heure d'un repas, je t'affiche le menu du jour", mots: /\b(repas|menu|manger)\b/ },
    'pluie-ecole': { nom: "la météo avant l'école", dit: () => `avant d'aller chercher ${enfant()} à l'école, je te préviens s'il va pleuvoir ou faire très froid`, mots: /\b(pluie|pleut|parapluie|froid|meteo)\b/ },
    'gouter-retour': { nom: 'le goûter au retour', dit: () => `quand tu rentres avec ${enfant()} l'après-midi, je te dis le goûter et la suite de la journée`, mots: /\b(gouter|collation)\b/ },
  };
  let etat = {}, lu = 0, offre = null;
  async function relis() {
    if (!root()) return;
    try { etat = (await (await fetch(`${root()}/maison/habitudes`, { cache: 'no-store' })).json()).anticipations || {}; lu = Date.now(); } catch (e) { /* plus tard */ }
  }
  const statut = k => (etat[k] ? (etat[k].oui ? 'oui' : 'non') : '');
  async function enregistre(k, oui) {
    await fetch(`${root()}/maison/habitudes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anticipation: k, oui }), cache: 'no-store' });
    await relis();
  }
  const principal = () => dlg.started && !window.__BANC && (typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal());
  const absent = () => typeof SECURITE !== 'undefined' && SECURITE.absent && SECURITE.absent();
  const minus = s => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);

  // le moteur : « oui » → il le fait ; « non » → rien ; pas encore de réponse → il le fait, puis il demande (une fois par jour)
  function joue(k, cle, action) {
    if (!root() || !principal()) return;
    const st = statut(k); if (st === 'non') return;
    if (!st) { S.antiDemande = S.antiDemande || {}; if (S.antiDemande[k] === dayKey()) return; }
    PROACTIF.annonce(`anticipe-${k}-${cle}`, async () => {
      if (Date.now() - lu > 10 * 60000) await relis();
      if (statut(k) === 'non') return '';
      const txt = await action().catch(() => ''); if (!txt) return '';
      if (statut(k) === 'oui') return txt;
      S.antiDemande = S.antiDemande || {}; S.antiDemande[k] = dayKey(); save();
      offre = { k, jusqua: Date.now() + 120000 }; dlg.attendReponse = Date.now() + 120000;
      return `${txt} Je l'ai fait de moi-même : ${CAT[k].dit()}. Je le fais à chaque fois ? Dis oui, ou non merci.`;
    }, { expire: Date.now() + 20 * 60000 });
  }

  /* ---------- les données : le menu du jour, l'agenda, la météo ---------- */
  async function menuAuj() {
    if (typeof CUISINE === 'undefined' || !CUISINE._charge) return null;
    try { return ((await CUISINE._charge(true)).menus || []).find(x => x.date === dayKey()) || null; } catch (e) { return null; }
  }
  async function agendaAuj() {
    try { return ((await (await fetch(`${root()}/maison/agenda?jours=1`, { cache: 'no-store' })).json()).evenements || []).filter(e => !e.eco); } catch (e) { return []; }
  }
  const estEcole = e => /\b(recuperer|chercher|deposer|amener)\b/.test(N(e.titre || '')) && (/\b(ecole|fils|cantine|creche)\b/.test(N(e.titre || '')) || N(e.titre || '').includes(N(enfant())));
  function tableauRepas(m, cle) {
    const L = [['matin', 'Petit-déjeuner'], ['midi', 'Déjeuner'], ['collation', 'Goûter'], ['plat', 'Dîner']].filter(([k]) => m[k]);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,520px)"><small style="letter-spacing:.3em;color:#fcd34d">AU MENU AUJOURD'HUI</small>${L.map(([k, nom]) => `<div style="display:flex;gap:12px;padding:9px 12px;margin-top:6px;border-radius:12px;${k === cle ? 'background:rgba(252,211,77,.14);border:1px solid rgba(252,211,77,.5)' : 'background:rgba(255,255,255,.04)'}"><b style="flex:0 0 120px;font-size:13px;letter-spacing:.08em;color:${k === cle ? '#fcd34d' : '#94a3b8'};text-transform:uppercase;padding-top:2px">${nom}</b><span style="font-size:${k === cle ? 20 : 16}px;color:#e2e8f0">${esc(m[k])}</span></div>`).join('')}</div>`);
  }

  /* ---------- 1. le repas au retour ---------- */
  async function repas(cle) {
    const m = await menuAuj(); if (!m || !m[cle]) return '';
    tableauRepas(m, cle);
    return `${cle === 'midi' ? 'Ce midi' : 'Ce soir'}, au menu : ${minus(m[cle])}.${cle === 'plat' && m.double ? ' Fais-en double : le reste sera ton déjeuner de demain.' : ''}`;
  }

  /* ---------- 3. le goûter au retour, avec son fils ---------- */
  async function gouter() {
    const m = await menuAuj();
    const now = Date.now() / 1000, ens = (await agendaAuj()).filter(e => !e.journee && e.debut > now && new Date(e.debut * 1000).toDateString() === new Date().toDateString()).sort((a, b) => a.debut - b.debut);
    const g = m && m.collation ? `Le goûter : ${minus(m.collation)}.` : '';
    const suite = ens.length ? ` Ensuite : ${ens.slice(0, 2).map(e => `${String(e.titre).replace(/\s*\(pro\)$/, '')} à ${hhmm(new Date(e.debut * 1000))}`).join(', puis ')}.` : '';
    if (m && m.collation) tableauRepas(m, 'collation');
    return (g + suite).trim();
  }

  // papa (ou son fils) vient d'être accueilli à la maison (securite.js → l'alerte « accueil »)
  async function retour(a) {
    const qui = ((a && a.data) || {}).qui || [];
    if (!qui.includes('papa') || !principal()) return;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 11 && h < 14) return joue('repas-retour', `${dayKey()}-midi`, () => repas('midi'));
    if (h >= 18 && h < 21) return joue('repas-retour', `${dayKey()}-soir`, () => repas('plat'));
    if (h >= 15.5 && h < 18) {
      const now = Date.now() / 1000;
      const ecole = (await agendaAuj()).some(e => estEcole(e) && e.debut < now && now - e.debut < 2 * 3600);
      if (ecole || qui.includes('enfant')) joue('gouter-retour', dayKey(), gouter);
    }
  }

  /* ---------- 2. la pluie (ou le grand froid) avant d'aller chercher son fils ---------- */
  async function meteoA(t) {
    const v = S.settings.ville; if (!v || v.lat == null) return null;
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&hourly=precipitation_probability,precipitation,temperature_2m&timezone=auto&forecast_days=2`)).json();
    const cible = new Date(t * 1000); cible.setMinutes(0, 0, 0);
    const iso = `${dayKey(cible)}T${deux2(cible.getHours())}:00`;
    const i = (w.hourly.time || []).indexOf(iso); if (i < 0) return null;
    return { proba: w.hourly.precipitation_probability[i], pluie: w.hourly.precipitation[i], temp: Math.round(w.hourly.temperature_2m[i]) };
  }
  async function veilleEcole() {
    if (!root() || !principal() || absent() || statut('pluie-ecole') === 'non') return;
    const now = Date.now() / 1000;
    const e = (await agendaAuj()).find(x => !x.journee && estEcole(x) && x.debut - now >= 10 * 60 && x.debut - now <= 25 * 60);
    if (!e) return;
    joue('pluie-ecole', `${e.debut}`, async () => {
      const m = await meteoA(e.debut).catch(() => null); if (!m) return '';
      const h = hhmm(new Date(e.debut * 1000)), p = enfant();
      if (m.pluie >= 0.3 || m.proba >= 60) return `Tu vas chercher ${p} à ${h} : il risque de pleuvoir à ce moment-là${m.proba ? `, ${m.proba} % de chances` : ''}. Prends un parapluie, et son imperméable.`;
      if (m.temp <= 3) return `Tu vas chercher ${p} à ${h} : il fera ${m.temp} degrés. Prends-lui un manteau chaud, un bonnet et des gants.`;
      return ''; // beau temps : il se tait (et ne demande rien)
    });
  }
  setTimeout(relis, 15000); setInterval(() => { veilleEcole().catch(() => {}); }, 3 * 60000);

  /* ---------- ce qu'il anticipe, et le changer de vive voix ---------- */
  async function liste() {
    await relis();
    const L = Object.entries(CAT).map(([k, c]) => [c.nom.charAt(0).toUpperCase() + c.nom.slice(1), c.dit(), statut(k) === 'oui' ? 'ok' : statut(k) === 'non' ? 'alerte' : 'attente']);
    if (typeof SCIFI !== 'undefined' && SCIFI.hud) SCIFI.hud('Anticipations', L, []);
    else showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,560px)"><small style="letter-spacing:.3em;color:#a5b4fc">CE QUE J'ANTICIPE</small>${L.map(([n, d, s]) => `<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)"><b>${esc(n)}</b> <small style="color:${s === 'ok' ? '#86efac' : s === 'alerte' ? '#fca5a5' : '#94a3b8'}">${s === 'ok' ? 'à chaque fois' : s === 'alerte' ? 'jamais' : 'je te le proposerai'}</small><div style="font-size:14px;color:#cbd5e1">${esc(d)}</div></div>`).join('')}</div>`);
    const oui = Object.keys(CAT).filter(k => statut(k) === 'oui').map(k => CAT[k].dit());
    const att = Object.keys(CAT).filter(k => !statut(k)).map(k => CAT[k].nom);
    return say(`${oui.length ? `Je le fais tout seul : ${oui.join(' ; ')}.` : "Je n'anticipe encore rien tout seul."}${att.length ? ` Je te proposerai aussi, le moment venu : ${att.join(', ')}.` : ''} Pour en arrêter une, dis par exemple « arrête de m'afficher le menu quand je rentre ».`);
  }
  async function change(k, oui) {
    try { await enregistre(k, oui); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok();
    return say(oui ? `C'est noté : désormais, ${CAT[k].dit()}.` : `D'accord, je ne le fais plus : ${CAT[k].nom}.`);
  }
  function routeFixe(t, n) {
    if (offre && Date.now() < offre.jusqua) { // sa réponse à « je le fais à chaque fois ? »
      const o = offre, m = n.replace(/^atlas /, '');
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|volontiers|carrement|allez|go|je veux bien|a chaque fois|toujours|c est super|super|parfait|top)\b/.test(m)) { offre = null; dlg.attendReponse = 0; return () => change(o.k, true); }
      if (/^(non|pas la peine|laisse|surtout pas|non merci|jamais|pas besoin)\b/.test(m)) { offre = null; dlg.attendReponse = 0; return () => change(o.k, false); }
      if (/^(plus tard|on verra|je reflechis|pas maintenant)\b/.test(m)) { offre = null; dlg.attendReponse = 0; return () => say('D\'accord, je te le redemanderai une prochaine fois.'); }
    }
    if (/\b(tes|mes|les) anticipations\b|\bqu est ce que tu anticipes\b|\btu anticipes quoi\b/.test(n)) return liste;
    const k = Object.keys(CAT).find(x => CAT[x].mots.test(n));
    if (k && /\b(quand je rentre|en rentrant|a mon retour|avant (d aller chercher|l ecole)|anticip)/.test(n)) {
      if (/\b(arrete|n affiche plus|ne (me )?(dis|montre|fais) plus|plus besoin|desactive|stop|ne le fais plus)\b/.test(n)) return () => change(k, false);
      if (/\b(remets|reactive|active|fais le|affiche moi|dis moi)\b/.test(n)) return () => change(k, true);
    }
    return null;
  }
  return { routeFixe, retour, relis, _joue: joue, _etat: () => etat, _offre: o => { offre = o; }, _veilleEcole: veilleEcole };
})();

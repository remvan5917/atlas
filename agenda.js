/* =========================================================
   ATLAS — ton Google Agenda (lecture seule, par l'adresse iCal secrète gardée sur l'ordinateur de la maison)
   - « qu'est-ce que j'ai aujourd'hui / demain / cette semaine ? », « mon prochain rendez-vous », « mon agenda »
   - L'ordinateur prévient 1 heure et 15 minutes avant chaque rendez-vous (notification + voix), même Atlas fermé.
   - Les rendez-vous du jour s'affichent dans la salle de commandement du matin, et à l'accueil quand tu rentres.
   ========================================================= */
'use strict';

const AGENDA = (() => {
  async function appel(chemin, ms = 15000) {
    const r0 = VOIXMAISON.root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const hm = s => { const d = new Date(s * 1000); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`.replace(' h 00', ' h'); };
  const jourDe = s => new Date(s * 1000).toDateString();
  const nomJour = s => { const d = new Date(s * 1000), auj = new Date(), dem = new Date(Date.now() + 86400000); return d.toDateString() === auj.toDateString() ? "aujourd'hui" : d.toDateString() === dem.toDateString() ? 'demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }); };
  const propre = t => String(t || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim(); // sans emoji : la voix les lirait
  const un = e => (e.journee ? `${propre(e.titre)}, toute la journée` : `${propre(e.titre)} à ${hm(e.debut)}${e.lieu ? `, ${e.lieu.split(',')[0]}` : ''}`);
  async function lire(jours = 7) { return appel(`/maison/agenda?jours=${jours}`, 12000); }

  // pour la salle de commandement et l'accueil : les rendez-vous qui restent aujourd'hui
  async function aujourdhui() {
    try {
      const r = await lire(1); const now = Date.now() / 1000, auj = new Date().toDateString();
      return (r.evenements || []).filter(e => jourDe(e.debut) === auj && (e.journee || e.fin > now));
    } catch (e) { return []; }
  }
  async function prochain() {
    try { const r = await lire(7); return (r.evenements || []).find(e => !e.journee && e.debut > Date.now() / 1000) || null; } catch (e) { return null; }
  }

  async function dire(n) {
    let r; try { r = await lire(/\bsemaine\b/.test(n) ? 7 : 2); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.relie) return say("Ton agenda n'est pas encore relié. Sur l'ordinateur, lance le petit script agenda-connecter, et colle l'adresse secrète iCal de ton Google Agenda.");
    if (r.erreur) return say("Je n'arrive pas à lire ton agenda en ce moment. Je réessaie dans quelques minutes.");
    const now = Date.now() / 1000, l = (r.evenements || []).filter(e => e.journee ? e.fin > now : e.fin > now);
    if (/\bprochain\b/.test(n)) {
      const p = l.find(e => !e.journee && e.debut > now);
      return say(p ? `Ton prochain rendez-vous : ${propre(p.titre)}, ${nomJour(p.debut)} à ${hm(p.debut)}${p.lieu ? `, à ${p.lieu.split(',')[0]}` : ''}.` : 'Aucun rendez-vous prévu dans les sept prochains jours.');
    }
    const quand = /\bdemain\b/.test(n) ? 'demain' : /\bsemaine\b/.test(n) ? 'semaine' : 'aujourd hui';
    const dem = new Date(Date.now() + 86400000).toDateString(), auj = new Date().toDateString();
    const sel = quand === 'semaine' ? l : l.filter(e => jourDe(e.debut) === (quand === 'demain' ? dem : auj));
    try { SCIFI.hud(quand === 'semaine' ? 'Agenda · 7 jours' : `Agenda · ${quand === 'demain' ? 'demain' : "aujourd'hui"}`, sel.slice(0, 12).map(e => [quand === 'semaine' ? `${nomJour(e.debut)} ${e.journee ? '' : hm(e.debut)}` : e.journee ? 'journée' : hm(e.debut).replace(' h ', ':'), e.titre.slice(0, 40), 'ok'])); } catch (e) { /* pas d'écran */ }
    const lib = quand === 'semaine' ? 'Cette semaine' : quand === 'demain' ? 'Demain' : "Aujourd'hui";
    if (!sel.length) return say(`${lib}, rien dans ton agenda.`);
    if (quand === 'semaine') return say(`${lib}, ${sel.length} rendez-vous : ${sel.slice(0, 8).map(e => `${nomJour(e.debut)}, ${un(e)}`).join(' ; ')}.`);
    return say(`${lib}, tu as ${sel.length > 1 ? `${sel.length} rendez-vous` : 'un rendez-vous'} : ${sel.map(un).join(' ; ')}.`);
  }

  /* ---------- le planning de la semaine, à la voix : il dicte (pro et perso), Atlas range, relit, et écrit dans l'agenda ---------- */
  const JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cleSemaine = () => { const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 1 - d.getDay())); return dJ(d); }; // le lundi de la semaine planifiée
  function semaineCible() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 2)); // le week-end : la semaine qui vient
    const l = []; const x = new Date(d); do { l.push(new Date(x)); x.setDate(x.getDate() + 1); } while (x.getDay() !== 1 && l.length < 8);
    return l;
  }
  const libJour = d => `${JS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()}`;
  async function post(corps) {
    const r0 = VOIXMAISON.root(); if (!r0) throw new Error('pas de maison');
    const r = await fetch(`${r0}/maison/agenda/ecris`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), cache: 'no-store' });
    if (!r.ok) throw new Error(`maison ${r.status}`); return r.json();
  }
  // le cerveau range la dictée en rendez-vous (sans rien inventer)
  async function analyse(texte, jours, existants, actuels) {
    const table = jours.map(d => `${libJour(d)} = ${dJ(d)}`).join(' ; ');
    const consigne = `Tu es le secrétaire d'un père (entrepreneur, sportif : gymnastique, krav maga ; un fils). Il dicte ses rendez-vous. Range-les en événements d'agenda, SANS RIEN INVENTER.
Les jours : ${table}. Aujourd'hui : ${libJour(new Date())} ${dJ(new Date())}. Un jour cité sans date = le prochain dans cette liste ; « demain » = le jour suivant aujourd'hui.
Pour chaque événement : "titre" court et clair, avec une majuscule, sans date ni heure dedans (ex. « Réunion client Dupont », « Dentiste », « Krav maga ») ; "date" AAAA-MM-JJ ; "debut" et "fin" en HH:MM (24 h).
Sans heure de fin, une durée normale (réunion ou rendez-vous 1 h, appel 30 min, dentiste ou médecin 45 min, sport 1 h 30, repas 1 h 30). Sans heure du tout pour une chose qui en demande une : "debut" vide. Une journée entière (congé, salon, déplacement) : "journee": true.
« Tous les jours », « chaque matin », « du lundi au vendredi » : un événement par jour concerné. "pro" : true pour le travail (clients, réunions, appels pro, rendez-vous professionnels, comptable, banque pro, chantier, prospection, formation), false pour le personnel (famille, son fils, sport, santé, maison, amis, loisirs). "lieu" seulement s'il le dit. "rappel" en minutes seulement s'il en demande un.
${actuels ? `Voici la liste ACTUELLE, à corriger selon ce qu'il dit (enlever, déplacer, ajouter, changer) ; renvoie la liste complète corrigée : ${JSON.stringify(actuels)}` : ''}
Réponds UNIQUEMENT en JSON : {"evenements": [{"titre": "…", "date": "AAAA-MM-JJ", "debut": "09:00", "fin": "10:00", "journee": false, "pro": true, "lieu": "", "rappel": 0}]}`;
    const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: `${existants.length ? `Déjà dans son agenda (ne pas les recréer) : ${existants.slice(0, 40).map(e => `${libJour(new Date(e.debut * 1000))} ${e.journee ? '' : hm(e.debut)} ${propre(e.titre)}`).join(' ; ')}.\n` : ''}Ce qu'il dit : ${texte}` }], { maxTokens: 2500, temperature: 0.1, json: true }));
    const o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return (o.evenements || []).filter(x => x && x.titre && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')).slice(0, 60).map(x => ({ titre: String(x.titre).slice(0, 120), date: x.date, debut: /^\d{1,2}:\d{2}$/.test(x.debut || '') ? x.debut.padStart(5, '0') : '', fin: /^\d{1,2}:\d{2}$/.test(x.fin || '') ? x.fin.padStart(5, '0') : '', journee: !!x.journee, pro: !!x.pro, lieu: String(x.lieu || '').slice(0, 120), rappel: Math.max(0, Math.min(1440, +x.rappel || 0)) }));
  }
  const epoque = (date, h) => Math.floor(new Date(`${date}T${h || '00:00'}:00`).getTime() / 1000);
  const enEvt = x => { const deb = x.journee ? epoque(x.date) : epoque(x.date, x.debut); let fin = x.journee ? deb + 86400 : x.fin ? epoque(x.date, x.fin) : deb + 3600; if (fin <= deb) fin = deb + 3600; return { titre: x.titre, debut: deb, fin, journee: x.journee, pro: x.pro, lieu: x.lieu, rappel: x.rappel }; };
  const chevauche = (x, existants) => { if (x.journee || !x.debut) return null; const e = enEvt(x); return existants.find(y => !y.journee && y.debut < e.fin && y.fin > e.debut) || null; };
  // les moments de la journée : le matin (avant midi), le midi (12 h – 14 h), l'après-midi (14 h – 18 h), le soir
  const MOMENTS = [['journee', 'Toute la journée'], ['matin', 'Matin'], ['midi', 'Midi'], ['aprem', 'Après-midi'], ['soir', 'Soir']];
  const momentH = h => (h < 12 ? 'matin' : h < 14 ? 'midi' : h < 18 ? 'aprem' : 'soir');
  const momentDe = x => (x.journee ? 'journee' : x.debut ? momentH(+x.debut.split(':')[0] + (+x.debut.split(':')[1] || 0) / 60) : 'journee');
  const momentEco = e => { const d = new Date(e.debut * 1000); return momentH(d.getHours() + d.getMinutes() / 60); };
  function montre(l, existants, titre) {
    const ecoDe = j => (existants || []).filter(e => e.eco && dJ(new Date(e.debut * 1000)) === j);
    const jours = [...new Set(l.map(x => x.date).concat((existants || []).filter(e => e.eco).map(e => dJ(new Date(e.debut * 1000)))))].sort();
    const ligneRdv = x => { const c = chevauche(x, existants); return `<div style="display:flex;gap:10px;align-items:baseline;padding:4px 0 4px 14px;border-bottom:1px solid rgba(255,255,255,.05);font-size:17px"><span style="flex:0 0 96px;color:#cbd5e1;font-variant-numeric:tabular-nums">${x.journee ? 'journée' : x.debut ? `${x.debut}${x.fin ? `–${x.fin}` : ''}` : '<span style="color:#fca5a5">heure ?</span>'}</span><span style="flex:1">${esc(x.titre)}${x.lieu ? ` <span style="color:#94a3b8;font-size:14px">· ${esc(x.lieu)}</span>` : ''}${c ? `<div style="color:#fbbf24;font-size:13px">⚠ en même temps que ${esc(propre(c.titre))}</div>` : ''}</span><span style="font-size:12px;letter-spacing:.1em;padding:2px 7px;border-radius:999px;background:${x.pro ? 'rgba(96,165,250,.18);color:#93c5fd' : 'rgba(134,239,172,.16);color:#86efac'}">${x.pro ? 'PRO' : 'PERSO'}</span></div>`; };
    const ligneEco = e => `<div style="display:flex;gap:10px;align-items:baseline;padding:3px 0 3px 14px;font-size:15px;color:#fcd34d"><span style="flex:0 0 96px;font-variant-numeric:tabular-nums">${hm(e.debut).replace(' h ', ':').replace(' h', ':00')}</span><span style="flex:1">${esc(e.titre.charAt(0).toUpperCase() + e.titre.slice(1))}</span><span style="font-size:12px;letter-spacing:.1em;padding:2px 7px;border-radius:999px;background:rgba(251,191,36,.16)">MARCHÉ</span></div>`;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,620px)"><small style="letter-spacing:.3em;color:#a5b4fc">${esc(titre)} · ${l.length} RENDEZ-VOUS · <span style="color:#93c5fd">PRO</span> / <span style="color:#86efac">PERSO</span> · <span style="color:#fcd34d">MARCHÉ</span></small>${jours.map(j => {
      const d = new Date(`${j}T12:00:00`), rdv = l.filter(x => x.date === j), eco = ecoDe(j);
      const blocs = MOMENTS.map(([k, lab]) => { const r = rdv.filter(x => momentDe(x) === k).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')), e = eco.filter(x => momentEco(x) === k); return r.length || e.length ? `<div style="margin-top:3px;color:#a5b4fc;font-size:12px;letter-spacing:.18em;text-transform:uppercase">${lab}</div>${e.map(ligneEco).join('')}${r.map(ligneRdv).join('')}` : ''; }).join('');
      return `<div style="margin-top:12px"><b style="color:#fde68a;font-size:16px;text-transform:capitalize">${esc(libJour(d))}</b>${blocs}</div>`; }).join('')}${boutonOk()}</div>`);
  }
  const hDit = h => { const [a, b] = h.split(':').map(Number); return a === 12 && !b ? 'midi' : `${a} heure${a > 1 ? 's' : ''}${b ? ` ${b}` : ''}`; };
  // à voix haute : jour par jour, et dans chaque jour, le matin, le midi, l'après-midi, le soir
  const resume = l => { const par = {}; l.forEach(x => { (par[x.date] = par[x.date] || []).push(x); }); const dit = { journee: 'toute la journée', matin: 'le matin', midi: 'à midi', aprem: "l'après-midi", soir: 'le soir' }; return Object.keys(par).sort().map(j => `${libJour(new Date(`${j}T12:00:00`))} : ${MOMENTS.map(([m]) => { const r = par[j].filter(x => momentDe(x) === m).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')); return r.length ? `${dit[m]}, ${r.map(x => `${x.titre}${x.debut && !x.journee ? ` à ${hDit(x.debut)}` : ''}`).join(' et ')}` : ''; }).filter(Boolean).join(' ; ')}`).join('. '); };
  // il manque une heure : on la demande (« à quelle heure, le dentiste mardi ? »)
  async function heures(l) {
    for (const x of l.filter(y => !y.journee && !y.debut).slice(0, 5)) {
      const a = N(await ask(`À quelle heure, ${x.titre}, ${libJour(new Date(`${x.date}T12:00:00`))} ?`, { wait: 15000 }));
      const m = a.match(/\b(\d{1,2}) ?(?:h|heures?)(?: ?(\d{1,2}))?\b/) || (/\bmidi\b/.test(a) ? [0, '12', '0'] : null);
      if (m) { const h = Math.min(23, +m[1] + (/\b(de l apres midi|du soir)\b/.test(a) && +m[1] < 12 ? 12 : 0)); x.debut = `${String(h).padStart(2, '0')}:${String(+(m[2] || 0)).padStart(2, '0')}`; } else x.journee = true;
    }
  }
  async function ecrire(l, existants, titre, avant = '') {
    let r; try { r = await post({ evenements: l.map(enEvt) }); } catch (e) { await say("Je n'arrive pas à joindre l'ordinateur de la maison : rien n'est noté. Redis-le-moi dans un instant."); return { statut: 'erreur', l }; }
    S.planningSemaine = cleSemaine(); save(); fx.ok();
    const ok = document.getElementById('ok-board'); if (ok) { ok.textContent = '✔ Écrit dans ton agenda'; ok.disabled = true; ok.style.background = '#15803d'; }
    await say(`${avant ? `${avant} ` : ''}${r.google ? `C'est dans ton Google Agenda : ${r.n} rendez-vous` : `C'est noté : ${r.n} rendez-vous`}, et je te préviendrai avant chacun.${r.google === false ? " Google Agenda n'a pas répondu : je réessaierai." : ''}`);
    if (!rituel) hideBoard();
    if (titre === 'TON PLANNING' && !rituel) await apres();
    return { statut: 'ecrit', l };
  }
  // le planning à l'écran, lu à voix haute ; « c'est bon » (dit ou touché) : il se tait et l'écrit ; une correction : il la fait et remontre
  async function valideEtEcris(l, existants, titre) {
    let silences = 0;
    for (let tour = 0; tour < 6; tour++) {
      if (!l.length) { await say("Je n'ai trouvé aucun rendez-vous à noter."); return { statut: 'rien', l }; }
      await heures(l);
      montre(l, existants, titre);
      const conf = l.map(x => [x, chevauche(x, existants)]).filter(([, c]) => c);
      const lu = silences ? "C'est bon ? Dis « c'est bon », ou ce qu'il faut changer."
        : `${tour ? "Voilà, c'est corrigé. " : ''}${l.length > 1 ? `${l.length} rendez-vous. ` : ''}${resume(l)}.${conf.length ? ` Attention : ${conf.slice(0, 2).map(([x, c]) => `${x.titre} tombe en même temps que ${propre(c.titre)}`).join(', et ')}.` : ''} Dis « c'est bon » dès que c'est niquel, ou ce qu'il faut changer.`;
      const a = await valideVisuel(lu, { wait: 20000 });
      if (a === 'ok') return ecrire(l, existants, titre);
      if (a === 'non') { hideBoard(); await say("D'accord, je ne note rien."); return { statut: 'annule', l }; }
      if (!a) { if (++silences < 2) continue; return ecrire(l, existants, titre, "Pas de réponse : c'est ce que tu m'as dicté, je l'écris."); }
      silences = 0;
      const avant = l;
      try { face.set('think'); l = await analyse(a, semaineCible(), existants, l); } catch (e) { l = avant; await say("Je n'ai pas compris la correction. Redis-la autrement."); } finally { face.set('idle'); }
      l.forEach(x => { if (!x.debut && !x.journee) { const y = avant.find(z => N(z.titre) === N(x.titre) && z.date === x.date && z.debut); if (y) { x.debut = y.debut; x.fin = x.fin || y.fin; } } }); // une heure déjà donnée ne se reperd pas
    }
    return ecrire(l, existants, titre);
  }
  // après le planning de la semaine : la feuille imprimée, et les menus qui s'adaptent aux jours chargés
  async function imprimePlanning() {
    const j = semaineCible(); const r0 = VOIXMAISON.root(); if (!r0) return false;
    try { const r = await fetch(`${r0}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'planning', du: dJ(j[0]), au: dJ(j[j.length - 1]) }) }); return r.ok; } catch (e) { return false; }
  }
  async function apres() {
    const imp = S.settings.imprimePlanning !== false && await imprimePlanning();
    if (imp) await say("Je l'imprime sur l'imprimante du bureau.");
    if (typeof CUISINE === 'undefined' || !CUISINE.semaineValidee) return;
    await say('Maintenant, les repas de la semaine.');
    return CUISINE.semaineValidee({ debut: dJ(semaineCible()[0]), imprime: true });
  }
  let rituel = false;
  async function planifie(o = {}) {
    rituel = !!o.rituel;
    if (!AI.ready()) return say("Pour ranger ton planning, il me faut mon cerveau en ligne.");
    planningOffre = null; dlg.attendReponse = 0;
    const jours = semaineCible(), d0 = jours[0], d1 = jours[jours.length - 1];
    let ex = []; try { const r = await lire(10); ex = (r.evenements || []).filter(e => e.debut >= d0.getTime() / 1000 && e.debut < d1.getTime() / 1000 + 86400); } catch (e) { ex = []; }
    let eco = []; try { eco = ((await (await fetch(`${VOIXMAISON.root()}/maison/calendrier-eco?du=${dJ(d0)}&au=${dJ(d1)}`, { cache: 'no-store' })).json()).annonces || []).map(a => ({ titre: a.titre, debut: a.debut, fin: a.fin, journee: false, eco: true })); } catch (e) { eco = []; }
    const ecoDit = (() => { const par = {}; eco.forEach(a => { const k = libJour(new Date(a.debut * 1000)); (par[k] = par[k] || []).push(`${a.titre} à ${hm(a.debut)}`); }); return Object.entries(par).slice(0, 4).map(([k, v]) => `${k}, ${v.slice(0, 2).join(' et ')}`).join(' ; '); })();
    ex = ex.concat(eco);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,600px)"><small style="letter-spacing:.3em;color:#a5b4fc">TON PLANNING · DU ${esc(libJour(d0).toUpperCase())} AU ${esc(libJour(d1).toUpperCase())} · JE T'ÉCOUTE</small><div id="pl-dicte" style="margin-top:10px;font-size:18px;line-height:1.5;color:#e2e8f0"></div><p style="color:#94a3b8;font-size:14px">Dis « c'est tout » quand tu as fini.</p></div>`);
    const exRdv = ex.filter(e => !e.eco);
    await say(`C'est parti pour ta semaine, du ${libJour(d0)} au ${libJour(d1)}.${exRdv.length ? ` Tu as déjà ${exRdv.length} rendez-vous, dont ${exRdv.slice(0, 3).map(e => `${propre(e.titre)} ${nomJour(e.debut)}`).join(', ')}.` : ''}${ecoDit ? ` Côté marchés : ${ecoDit}.` : ''} Dis-moi tout, le pro et le perso, jour par jour, à ton rythme. Dis « c'est tout » quand tu as fini.`);
    const dicte = []; let vides = 0;
    for (let i = 0; i < 30; i++) {
      const a = await hear({ maxWait: 30000, prompt: "Un père dicte son planning de la semaine en français : jours, heures, réunions, clients, rendez-vous médicaux, sport (gymnastique, krav maga), son fils, l'école." });
      const n = N(a || '');
      if (!n) { vides++; if (vides >= 3) break; if (vides === 2) await say("Tu as fini ? Dis « c'est tout », ou continue."); continue; }
      vides = 0;
      if (/^(c est tout|c est bon|termine|j ai fini|fini|rien d autre|stop|voila c est tout|c est fini|ca sera tout)\b/.test(n) || (/\b(c est tout|j ai fini|c est fini)$/.test(n) && n.split(' ').length <= 5)) break;
      if (/^(annule|laisse tomber|on arrete)\b/.test(n)) { hideBoard(); return say("D'accord, on le fera plus tard."); }
      dicte.push(a); const z = document.getElementById('pl-dicte'); if (z) z.innerHTML = dicte.map(x => `<div>• ${esc(x)}</div>`).join('');
      try { fx.tone([[988, 0.06]]); } catch (e) { /* rien */ }
    }
    if (!dicte.length) { hideBoard(); await say(rituel ? "Je n'ai rien entendu de ton planning." : "Je n'ai rien entendu. On le fera quand tu veux : dis « on fait mon planning »."); return { statut: 'rien', l: [] }; }
    face.set('think'); await say('Je range tout.');
    let l; try { l = await analyse(dicte.join('. '), jours, ex); } catch (e) { l = null; } finally { face.set('idle'); }
    if (!l) { await say("Je n'ai pas réussi à ranger ton planning. Redis-le-moi dans un instant."); return { statut: 'rien', l: [] }; }
    return valideEtEcris(l, ex, 'TON PLANNING');
  }
  // un seul rendez-vous : « ajoute à mon agenda dentiste jeudi à 15 h »
  async function ajoute(t) {
    if (!AI.ready()) return say("Pour noter ton rendez-vous, il me faut mon cerveau en ligne.");
    const jours = Array.from({ length: 21 }, (v, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
    let ex = []; try { ex = (await lire(21)).evenements || []; } catch (e) { ex = []; }
    face.set('think'); let l; try { l = await analyse(t, jours, ex); } catch (e) { l = null; } finally { face.set('idle'); }
    if (!l || !l.length) return say("Je n'ai pas compris le rendez-vous. Dis par exemple : ajoute à mon agenda dentiste jeudi à 15 heures.");
    return valideEtEcris(l, ex, 'À AJOUTER');
  }
  // enlever un rendez-vous qu'Atlas a noté : « enlève le dentiste de mon agenda »
  async function enleve(n) {
    let r; try { const r0 = VOIXMAISON.root(); r = await (await fetch(`${r0}/maison/agenda/ecris`, { cache: 'no-store' })).json(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const mots = n.split(' ').filter(w => w.length > 3 && !/^(enleve|retire|supprime|annule|efface|agenda|rendez|vous|planning|mon|dans|de|du)$/.test(w));
    const c = (r.atlas || []).filter(x => mots.some(w => N(x.titre).includes(w)));
    if (!c.length) return say("Je ne trouve pas ce rendez-vous parmi ceux que j'ai notés. Ceux que tu as mis toi-même dans Google Agenda, enlève-les dans l'application.");
    const x = c[0];
    if (!(await askYesNo(`J'enlève ${x.titre}, ${nomJour(x.debut)}${x.journee ? '' : ` à ${hm(x.debut)}`} ?`))) return say("D'accord, je le laisse.");
    try { await post({ supprime: [x.uid] }); } catch (e) { return say("Je n'ai pas réussi à l'enlever."); }
    fx.ok(); return say("C'est enlevé.");
  }
  // le dimanche soir, il propose
  let planningOffre = null;
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (d.getDay() !== 0 || h < 17.5 || h > 21.5 || !dlg.started || S.settings.planningAuto === false || S.planningSemaine === cleSemaine()) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    PROACTIF.annonce(`planning-${cleSemaine()}`, () => { planningOffre = { at: Date.now() }; dlg.attendReponse = Date.now() + 150000; return typeof SECRETAIRE !== 'undefined' ? "C'est dimanche soir : on prépare ta semaine ? D'abord ton planning, puis les repas faits pour ton planning, les courses et le drive pour lundi, et je t'imprime ta Gazette." : "C'est dimanche soir : on fait ton planning de la semaine ? Tu me dictes le pro et le perso, je range tout dans ton agenda."; }, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);
  // avant tout le reste (sinon « planifie ma semaine » partirait vers les menus)
  function routePlanning(t, n) {
    if (planningOffre && Date.now() - planningOffre.at < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|carrement|go|on y va|c est parti)\b/.test(n)) return typeof SECRETAIRE !== 'undefined' ? () => { planningOffre = null; dlg.attendReponse = 0; return SECRETAIRE.semaine(); } : planifie;
      if (/^(non|pas ce soir|pas maintenant|plus tard|laisse)\b/.test(n)) return () => { planningOffre = null; dlg.attendReponse = 0; S.planningSemaine = cleSemaine(); save(); return say("D'accord. Dis « on fait mon planning » quand tu veux."); };
    }
    if (/\b(ne me propose plus|arrete de me proposer)\b.*\bplanning\b/.test(n)) return () => { S.settings.planningAuto = false; save(); return say("D'accord, je ne te propose plus le planning le dimanche. Dis « on fait mon planning » quand tu veux."); };
    if (/\b(on fait|faisons|fais|faire|prepare|preparer|lance|commence|planifie|organise|organiser)( moi)? (mon|le|ton|un|ma|la)? ?(planning|programme|emploi du temps|agenda)( de la semaine| de ma semaine| pour la semaine)?\b|\b(planifie|organise|planifier|organiser)( moi)? (ma|la) semaine\b/.test(n) && !/\b(menus?|repas|courses|cuisine)\b/.test(n)) return planifie;
    if (/\b(ajoute|mets|note|inscris|cale|programme|rajoute)\b.*\b(a|dans|sur) (mon|l) agenda\b|\b(ajoute|note|cale|rajoute|prends)\b (un |le |mon )?(rendez vous|rdv|une reunion|un appel)\b/.test(n)) return () => ajoute(t);
    if (/\b(enleve|retire|supprime|annule|efface)\b.*\b(de|dans) (mon|l) (agenda|planning)\b/.test(n)) return () => enleve(n);
    if (/\b(imprime|imprimer)\b.*\b(planning|agenda|semaine pro|emploi du temps)\b/.test(n) && !/\bmenus?\b/.test(n)) return async () => { const ok = await imprimePlanning(); return say(ok ? "C'est parti : ton planning de la semaine s'imprime sur l'imprimante du bureau." : "Je n'arrive pas à joindre l'ordinateur pour imprimer."); };
    if (/\b(arrete|n imprime plus|ne plus imprimer)\b.*\bplanning\b/.test(n)) return () => { S.settings.imprimePlanning = false; save(); return say("D'accord, je n'imprime plus le planning tout seul. Dis « imprime mon planning » quand tu en veux un."); };
    if (/\b(adapte|ajuste|cale)\b.*\bmenus?\b.*\b(planning|agenda|semaine)\b/.test(n)) return async () => { const a = await CUISINE.adapte(); if (!a) return say("Je n'ai pas pu adapter les menus pour le moment."); if (a.rien) return say("Tu n'as pas de menus en cours. Dis « fais les menus de la semaine » : ils suivront ton agenda."); return say(a.changes.length ? `J'ai adapté : ${a.changes.join(' ; ')}.` : 'Tes menus collent déjà à ton agenda.'); };
    return null;
  }

  function route(t, n) {
    if (/\b(ouvre|lance|affiche sur l ordi)\b/.test(n)) return null; // « ouvre mon agenda » : le site, sur l'ordinateur (pc.js)
    if (/\b(mon agenda|mes rendez vous|mes rdv|mon planning|mon programme|mon emploi du temps|mon prochain (rendez vous|rdv)|qu est ce que j ai (de prevu )?(aujourd hui|demain|cette semaine|ce matin|cet apres midi|ce soir)|j ai quoi (de prevu )?(aujourd hui|demain|cette semaine)|j ai (un|des) (rendez vous|rdv)|c est quand mon (rendez vous|rdv))\b/.test(n)) return () => dire(n);
    return null;
  }
  return { route, routePlanning, planifie, _lire: lire, aujourdhui, prochain, un, hm, propre, _analyse: analyse, _semaine: semaineCible };
})();

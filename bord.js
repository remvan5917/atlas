/* =========================================================
   ATLAS — l'ordinateur de bord
   - Le flux de pensée : pendant qu'il réfléchit, un petit écran de film montre ce qu'il consulte VRAIMENT
     (l'état de la maison qui concerne la question, sa mémoire, ses proches, son cerveau), puis s'efface quand il parle.
     « cache ton analyse » / « montre ton analyse ».
   - Le journal de bord : « journal de bord » — la journée de la maison racontée comme le journal d'un vaisseau
     (« Journal de bord, date stellaire 2026.296… »), avec seulement les vrais faits du jour : les caméras, les alertes,
     les allées et venues, l'énergie, la journée de son fils avec Shadow, le trading, ce qu'Atlas a appris, demain.
     Archivé sur l'ordinateur de la maison (30 jours) : « le journal de bord d'hier ». Le soir, il propose de l'écouter.
   ========================================================= */
'use strict';

const BORD = (() => {
  async function appel(chemin, corps, ms = 15000) {
    const r0 = VOIXMAISON.root(); if (!r0 || window.__BANC) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const dateStellaire = (d = new Date()) => `${d.getFullYear()}.${String(Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)).padStart(3, '0')}`;

  /* ---------- le flux de pensée ---------- */
  const SOURCES = [
    [/\b(alarme|verisure)\b/, 'ALARME', 'Alarme'],
    [/\b(camera|cameras|jardin|cour|facade|toit|toiture|plateau|quelqu un|bruit|devant|dehors|rue)\b/, 'CAMÉRAS', 'Caméras EZVIZ'],
    [/\b(lumiere|lumieres|lampe|lampes|allume|allumee|eteint|eteins|noir|sombre|eclairage)\b/, 'ÉCLAIRAGE', 'Allumé'],
    [/\b(rendez vous|rdv|agenda|demain|programme|aujourd hui|planning)\b/, 'AGENDA', 'Agenda'],
    [/\b(trading|gagne|perdu|resultat|resultats|session|pnl)\b/, 'TRADING', 'Trading'],
    [/\b(maison|qui est la|personne|presence|seul|absent)\b/, 'PRÉSENCE', 'Présence'],
    [/\b(shadow|fils|petit|robot)\b/, 'SHADOW', 'Shadow'],
    [/\b(alerte|alertes|incident|probleme|securite|passe quoi)\b/, 'ALERTES', 'Dernières alertes'],
  ];
  let hud = null, hudT = null;
  function pensee(text) {
    if (S.settings.pensee === false || !document.body) return () => {};
    const n = N(text), lignes = [['SIGNAL', `« ${String(text).replace(/^\s*atlas[\s,]*/i, '').slice(0, 70)} »`]];
    const vrai = (VRAI.texte() || '').split('\n');
    for (const [re, nom, debut] of SOURCES) {
      if (!re.test(n)) continue;
      const l = vrai.find(x => x.startsWith(debut));
      lignes.push([nom, l ? l.replace(/^[^:]+:\s*/, '').replace(/\.$/, '').slice(0, 86) : 'aucune donnée']);
    }
    const mots = n.split(' ').filter(w => w.length >= 5);
    const mem = (S.memoire || []).filter(x => mots.some(w => N(x.texte).includes(w))).slice(-3);
    if (mem.length) lignes.push(['MÉMOIRE', `${mem.length} souvenir${mem.length > 1 ? 's' : ''} lié${mem.length > 1 ? 's' : ''}`]);
    const pro = (S.proches || []).filter(p => n.includes(N(p.nom)) || (p.lien && n.includes(N(p.lien))));
    if (pro.length) lignes.push(['PROCHES', pro.map(p => p.nom).join(', ')]);
    const c = AI.cfg();
    const mi = AI.mistralPret && AI.mistralPret();
    lignes.push(['CERVEAU', mi ? String(AI.mistralModele()).toUpperCase() : c.local ? 'cerveau de la maison' : String(c.model || '').replace(/^.*\//, '').toUpperCase()]);
    clearTimeout(hudT); if (hud) hud.remove();
    hud = document.createElement('div'); hud.id = 'pensee';
    hud.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:85;width:min(440px,calc(100vw - 28px));padding:10px 12px 8px;border:1px solid rgba(56,189,248,.45);border-radius:10px;background:rgba(2,11,20,.88);box-shadow:0 0 24px rgba(56,189,248,.25);font:11px/1.55 ui-monospace,Menlo,monospace;color:#bae6fd;pointer-events:none;opacity:0;transition:opacity .25s;backdrop-filter:blur(3px)';
    hud.innerHTML = `<style>@keyframes pBar{from{width:0}to{width:100%}}@keyframes pClig{50%{opacity:.3}}</style><div style="display:flex;justify-content:space-between;letter-spacing:.24em;color:#7dd3fc;margin-bottom:5px"><span>◢ ANALYSE EN COURS</span><span style="animation:pClig 1s steps(2) infinite">●</span></div>${lignes.map(([k, v], i) => `<div data-l="${i}" style="display:grid;grid-template-columns:86px 1fr;gap:8px;opacity:0;transition:opacity .2s"><span style="color:#38bdf8;letter-spacing:.14em">${esc(k)}</span><span style="color:#e0f2fe;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v)}</span></div>`).join('')}<div style="height:2px;margin-top:6px;background:rgba(56,189,248,.15);overflow:hidden"><i style="display:block;height:100%;background:#38bdf8;animation:pBar 1.6s ease-out forwards"></i></div>`;
    document.body.appendChild(hud);
    const h = hud; requestAnimationFrame(() => { h.style.opacity = '1'; });
    h.querySelectorAll('[data-l]').forEach((el, i) => setTimeout(() => { el.style.opacity = '1'; }, 90 + i * 140));
    let fini = false;
    return () => { if (fini) return; fini = true; hudT = setTimeout(() => { h.style.opacity = '0'; setTimeout(() => h.remove(), 300); if (hud === h) hud = null; }, 1400); };
  }

  /* ---------- le journal de bord ---------- */
  async function meteoDemain() {
    const v = S.settings.ville; if (!v) return '';
    try {
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`)).json();
      return `Météo de demain à ${v.name || 'la maison'} : ${Math.round(w.daily.temperature_2m_min[1])} à ${Math.round(w.daily.temperature_2m_max[1])} degrés, ${w.daily.precipitation_probability_max[1]} % de risque de pluie.`;
    } catch (e) { return ''; }
  }
  function panneau(titre) {
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:radial-gradient(120% 90% at 50% 0%,#0a2540,#020b14 70%);border:1px solid #1e6a8a;border-radius:14px;padding:16px 18px;box-shadow:0 0 34px rgba(56,189,248,.25);text-align:left;max-width:760px">
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;letter-spacing:.24em;color:#7dd3fc"><span>◢ ${esc(titre)}</span><span>ATLAS · ORDINATEUR DE BORD</span></div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:9px 0 12px"></div>
      <div id="bord-texte" style="font:400 clamp(16px,2.3vw,22px)/1.55 system-ui,sans-serif;color:#e0f2fe;text-shadow:0 0 10px rgba(125,211,252,.35)"></div></div>`, 'graphe-board');
  }
  async function dire(texte, titre) {
    panneau(titre);
    fx.tone([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]]);
    await wait(600);
    const phrases = String(texte).split(/(?<=[.!?…])\s+/).filter(Boolean); // « 2026.296 » reste entier
    for (const p of phrases) {
      if (dlg.interrupt) break;
      const el = document.getElementById('bord-texte'); if (el) { const s = document.createElement('span'); s.textContent = `${p} `; s.style.cssText = 'opacity:0;transition:opacity .5s'; el.appendChild(s); requestAnimationFrame(() => { s.style.opacity = '1'; }); }
      await say(p.trim());
    }
    setTimeout(() => { const el = document.getElementById('bord-texte'); if (el) hideBoard(); }, 90000);
  }
  async function journal() {
    face.set('think');
    let j; try { j = await appel('/atlas/journal', null, 12000); } catch (e) { face.set('idle'); return say("L'ordinateur de la maison ne répond pas : pas de journal de bord ce soir."); }
    const auj = new Date().toDateString();
    const appris = (S.memoire || []).filter(x => new Date(x.at).toDateString() === auj).slice(-4).map(x => x.texte);
    const faits = [j.faits, (/pas encore la m[ée]moire|doit être allumé/i.test(LIEN.journee()) ? '' : `La journée de son fils avec Shadow : ${LIEN.journee()}`), appris.length ? `Ce qu'Atlas a appris aujourd'hui : ${appris.join(' ')}` : '', await meteoDemain()].filter(Boolean).join('\n');
    const sd = dateStellaire();
    let texte = '';
    if (AI.ready()) {
      try {
        texte = String(await AI.chat([{ role: 'system', content: `Tu es Atlas, l'ordinateur de bord de la maison : une IA de film, calme, précise, un brin pince-sans-rire. Rédige le JOURNAL DE BORD de la journée, comme celui d'un vaisseau, à dire à voix haute. Commence exactement par « Journal de bord, date stellaire ${sd}. ». Ensuite six à neuf phrases courtes, sans liste ni symbole. Utilise UNIQUEMENT les faits fournis : n'invente aucun événement, aucun chiffre, aucune personne ; s'il ne s'est rien passé, dis-le avec élégance. Tu t'adresses à lui (« tu »). Garde les vraies valeurs. Termine par le programme et la météo de demain, puis exactement « Fin du journal. »` }, { role: 'user', content: faits }], { maxTokens: 600, temperature: 0.5 }) || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/[*#`]/g, '').trim();
      } catch (e) { texte = ''; }
    }
    if (!/^Journal de bord/i.test(texte)) texte = `Journal de bord, date stellaire ${sd}. ${faits.replace(/\n/g, ' ')} Fin du journal.`;
    face.set('idle');
    appel('/atlas/journal', { texte }, 10000).catch(() => {});
    S.bordDit = auj; save();
    return dire(texte, `JOURNAL DE BORD · DATE STELLAIRE ${sd}`);
  }
  async function hier() {
    let j; try { j = await appel('/atlas/journal', null, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!j.hier) return say("Je n'ai pas de journal de bord pour hier.");
    return dire(j.hier, `JOURNAL DE BORD · DATE STELLAIRE ${dateStellaire(new Date(Date.now() - 86400000))}`);
  }
  // le soir, s'il est là : il propose le journal (une fois)
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h < 21.5 || h >= 23 || S.bordDit === d.toDateString() || S.bordPropose === d.toDateString() || !dlg.started || Date.now() - (dlg.lastActive || 0) > 15 * 60000) return;
    S.bordPropose = d.toDateString(); save();
    PROACTIF.annonce(`bord-${d.toDateString()}`, 'Le journal de bord du jour est prêt. Dis « journal de bord » quand tu veux l\'entendre.', { expire: Date.now() + 90 * 60000 });
  }, 60000);

  /* ---------- la facture du mois : ce que coûtent le cerveau et la voix (estimation) ---------- */
  // prix publics approximatifs (dollars par million de jetons : lus, écrits) ; Groq et la maison : gratuits ici
  const PRIX = [[/mistral-large/, 2, 6], [/mistral-medium/, 0.4, 2], [/mistral-small|ministral/, 0.1, 0.3], [/magistral-medium/, 2, 5]];
  const USD_EUR = 0.92;
  function envoieFacture() { if (!S.facture || !VOIXMAISON.root() || window.__BANC) return; appel('/atlas/facture', { id: monId, role: typeof CONSTELLATION !== 'undefined' ? CONSTELLATION.role : '', facture: S.facture }, 8000).catch(() => {}); }
  setInterval(envoieFacture, 10 * 60000); setTimeout(envoieFacture, 20000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) envoieFacture(); });
  const euros = x => x < 0.01 ? 'moins d\'un centime' : x < 1 ? `${Math.round(x * 100)} centimes` : `${x.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
  async function facture() {
    envoieFacture(); await wait(800);
    let f; try { f = await appel('/atlas/facture', null, 8000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    let mistral = 0, jetons = 0, req = { mistral: 0, groq: 0, maison: 0 };
    for (const [k, v] of Object.entries(f.cerveaux || {})) {
      const [fo, mo] = k.split('|'); req[fo] = (req[fo] || 0) + v.req;
      if (fo === 'mistral' && /voxtral/.test(mo)) mistral += v.in / 60 * 0.001 * USD_EUR; // les oreilles : des secondes de voix (environ 0,001 $ la minute)
      else if (fo === 'mistral') { const p = PRIX.find(([re]) => re.test(mo)) || [0, 2, 6]; mistral += (v.in * p[1] + v.out * p[2]) / 1e6 * USD_EUR; jetons += v.in + v.out; }
    }
    const quota = +S.settings.elevenQuota || 100000, car = f.eleven || 0;
    const jour = new Date().getDate(), finMois = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projMistral = mistral / Math.max(1, jour) * finMois, projCar = Math.round(car / Math.max(1, jour) * finMois);
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:14px 16px;color:#e0f2fe;min-width:min(520px,86vw);text-align:left"><div style="font-size:11px;letter-spacing:.24em;color:#7dd3fc">◢ FACTURE DU MOIS · ${esc(f.mois)} · ${f.appareils} APPAREIL${f.appareils > 1 ? 'S' : ''}</div><div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:9px 0 12px"></div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px 16px;font-size:15px"><span>Mistral (${req.mistral || 0} réponses)</span><b>${esc(euros(mistral))}</b><span style="color:#93c5fd">→ à ce rythme, fin du mois</span><b style="color:#93c5fd">${esc(euros(projMistral))}</b>
      <span>Groq, en secours (${req.groq || 0})</span><b>gratuit</b><span>Cerveau de la maison (${req.maison || 0})</span><b>gratuit</b>
      <span>Voix ElevenLabs</span><b>${car.toLocaleString('fr-FR')} / ${quota.toLocaleString('fr-FR')} car.</b><span style="color:#93c5fd">→ à ce rythme, fin du mois</span><b style="color:${projCar > quota ? '#fca5a5' : '#93c5fd'}">${projCar.toLocaleString('fr-FR')} car.</b></div>
      <div style="margin-top:10px;font-size:11px;color:#64748b">Estimation d'après les prix publics ; ta vraie facture est sur les sites de Mistral et d'ElevenLabs.</div></div>`, 'graphe-board');
    const t = [`Ce mois-ci, le cerveau Mistral a coûté environ ${euros(mistral)}${jour >= 3 ? `, soit à peu près ${euros(projMistral)} sur le mois à ce rythme` : ''}.`,
      `La voix a utilisé ${car.toLocaleString('fr-FR')} caractères sur ${quota.toLocaleString('fr-FR')}${projCar > quota && jour >= 3 ? ' : à ce rythme, tu dépasseras ton forfait avant la fin du mois' : ''}.`];
    if (!req.mistral && !S.settings.mistralKey) t.unshift("Mistral n'est pas encore branché sur cet appareil.");
    return say(t.join(' '));
  }

  /* ---------- Radio Atlas : l'émission du matin, faite pour lui (les vraies infos du jour, sa voix, des jingles, puis la musique) ---------- */
  const jingle = (fin = false) => fx.tone(fin ? [[784, 0.1], [659, 0.1], [523, 0.1], [392, 0.3]] : [[523, 0.07], [784, 0.07], [1047, 0.07], [1568, 0.16]]);
  async function titres(q) { try { const r0 = VOIXMAISON.root(); const j = await (await fetch(`${r0}/shadow/web?${new URLSearchParams({ q, mode: 'actus' })}`)).json(); return (j.actus || []).slice(0, 4).map(a => `${a.titre} (${a.source})`); } catch (e) { return []; } }
  function antenne(seg, i, texte) {
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:radial-gradient(120% 90% at 50% 0%,#1b0a2e,#05030c 70%);border:1px solid #7c3aed;border-radius:14px;padding:14px 18px;box-shadow:0 0 34px rgba(124,58,237,.3);text-align:left;max-width:780px;color:#ede9fe">
      <style>@keyframes onAir{50%{opacity:.35}}</style>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.24em;color:#c4b5fd"><span>◢ RADIO ATLAS · ${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase())}</span><span style="color:#f87171;animation:onAir 1.2s steps(2) infinite">● ON AIR</span></div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#a78bfa,transparent);margin:9px 0 10px"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${seg.map((x, k) => `<span style="font-size:10px;letter-spacing:.14em;padding:4px 8px;border-radius:999px;border:1px solid ${k === i ? '#f0abfc' : 'rgba(167,139,250,.35)'};color:${k === i ? '#fdf4ff' : k < i ? '#a78bfa' : '#6b7280'};background:${k === i ? 'rgba(217,70,239,.25)' : 'transparent'}">${esc(x.titre)}</span>`).join('')}</div>
      <div id="emission-texte" style="font:400 clamp(16px,2.3vw,21px)/1.55 system-ui,sans-serif;color:#f5f3ff">${esc(texte || '')}</div></div>`, 'graphe-board');
  }
  let pretee = null; // l'émission du jour, écrite en avance
  async function emission(longue = false) {
    if (!AI.ready()) return say("Pour faire Radio Atlas, il me faut mon cerveau.");
    if (!longue && pretee && Date.now() - pretee.at < 3 * 3600000) { const seg = pretee.seg; pretee = null; return diffuse(seg); }
    face.set('think');
    const prep = say(pick(['Radio Atlas : je prépare ton émission.', "Une seconde, je prépare l'antenne."]));
    const seg = await ecrit(longue);
    await prep; face.set('idle');
    if (!seg || !seg.length) return say("Mon cerveau n'a pas réussi à écrire l'émission ce matin. Réessaie dans un instant.");
    return diffuse(seg);
  }
  // vers 6 h 45, sur la tablette : l'émission du jour s'écrit en silence (elle sera prête au réveil)
  setInterval(async () => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h < 6.7 || h > 7.2 || (pretee && Date.now() - pretee.at < 3 * 3600000) || !AI.ready() || !VOIXMAISON.root() || window.__BANC) return;
    if (typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role !== 'tablette') return;
    const seg = await ecrit(false); if (seg && seg.length) pretee = { seg, at: Date.now() };
  }, 5 * 60000);
  async function ecrit(longue) {
    const sujets = S.settings.emissionSujets || ['', 'géopolitique', 'bourse marchés pétrole or', 'Lille'];
    const v = S.settings.ville, ac = typeof AbortController !== 'undefined';
    const [actus, ag, w, msg, tr] = await Promise.all([
      Promise.all(sujets.map(titres)),
      (async () => { try { const r0 = VOIXMAISON.root(); return ((await (await fetch(`${r0}/maison/agenda?jours=1`, { cache: 'no-store' })).json()).evenements || []).filter(e => !/\b(MYM|MNQ|MGC|M6E|Open US|Fen[êe]tre active|Impact)\b/i.test(e.titre)); } catch (e) { return []; } })(),
      v ? fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=1`).then(r => r.json()).catch(() => null) : null,
      (async () => { try { const r0 = VOIXMAISON.root(); return ((await (await fetch(`${r0}/maison/messages?pour=papa`, { cache: 'no-store' })).json()).messages || []).slice(-2); } catch (e) { return []; } })(),
      (async () => { try { const r0 = VOIXMAISON.root(); return await (await fetch(`${r0}/maison/trading`, { cache: 'no-store' })).json(); } catch (e) { return null; } })(),
    ]);
    const vus = new Set(); const net = l => l.filter(t => { const k = N(t).slice(0, 40); if (vus.has(k)) return false; vus.add(k); return true; });
    const now = Date.now() / 1000;
    const faits = [
      `Date : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${hhmm()}.`,
      `À la une (titres d'actualité) : ${net(actus[0]).join(' ; ') || 'rien'}.`,
      `Géopolitique (titres) : ${net(actus[1] || []).join(' ; ') || 'rien'}.`,
      `Marchés (titres) : ${net(actus[2] || []).join(' ; ') || 'rien'}. ${MARCHE.contexte() || ''}`,
      (tr && (tr.annonces || []).length) ? `Annonces économiques importantes du jour : ${(tr.annonces || []).filter(a => a.at > now).slice(0, 4).map(a => `${hhmm(new Date(a.at * 1000))} ${a.titre}`).join(' ; ')}.` : '',
      `Lille (titres) : ${net(actus[3] || []).join(' ; ') || 'rien'}.`,
      `Son agenda aujourd'hui : ${ag.filter(e => e.fin > now).slice(0, 6).map(e => `${e.journee ? 'toute la journée' : hhmm(new Date(e.debut * 1000))} « ${e.titre} »`).join(' ; ') || 'rien de prévu'}.`,
      w ? `Météo à ${v.name || 'la maison'} : de ${Math.round(w.daily.temperature_2m_min[0])} à ${Math.round(w.daily.temperature_2m_max[0])} degrés, ${w.daily.precipitation_probability_max[0]} % de risque de pluie.` : '',
      `Son fils avec Shadow (hier et aujourd'hui) : ${/pas encore la m[ée]moire|doit être allumé/i.test(LIEN.journee()) ? 'rien de noté' : LIEN.journee()}.`,
      msg.length ? `Messages de son fils pour lui : ${msg.map(m => `« ${m.texte} »`).join(' ; ')}.` : '',
    ].filter(Boolean).join('\n');
    const musique = S.settings.emissionMusique || 'FIP';
    let seg = null;
    try {
      const r = String(await AI.chat([{ role: 'system', content: `Tu es Atlas, l'animateur de « Radio Atlas », l'émission personnelle de ${S.nom || 'papa'} (il trade les marchés et s'intéresse à la géopolitique). Ton style : une IA de film, chaleureuse, vive, élégante, un brin pince-sans-rire. Écris le script d'une émission parlée d'environ ${longue ? '4 minutes (550 mots)' : '2 minutes (250 mots)'}, pour être dite à voix haute. Tu le tutoies, toujours.
Réponds UNIQUEMENT en JSON : {"segments": [{"titre": "OUVERTURE", "texte": "…"}, {"titre": "LE MONDE", …}, {"titre": "LES MARCHÉS", …}, {"titre": "LILLE", …}, {"titre": "TA JOURNÉE", …}, {"titre": "LA MÉTÉO", …}, {"titre": "LE MOT DE SHADOW", …}, {"titre": "FIN", …}]}. Supprime un segment s'il n'y a rien à dire.
Utilise UNIQUEMENT les faits fournis : reformule les titres sans inventer de détails ni de chiffres, cite parfois la source à l'oral (« d'après Les Échos »). Jamais de conseil d'achat ou de vente. Le segment FIN annonce la musique : ${musique}. Pas de symbole, pas d'astérisque, pas d'indication de jeu.` }, { role: 'user', content: faits }], { maxTokens: longue ? 1500 : 900, temperature: 0.6 }) || '');
      const j = JSON.parse(r.slice(r.indexOf('{'), r.lastIndexOf('}') + 1)); seg = (j.segments || []).filter(x => x && x.texte).map(x => ({ titre: String(x.titre || '').toUpperCase().slice(0, 20), texte: sansJeu(String(x.texte)).replace(/[*`#]/g, '').trim() }));
    } catch (e) { seg = null; }
    return seg;
  }
  async function diffuse(seg) {
    const musique = S.settings.emissionMusique || 'FIP';
    for (const [i, x] of seg.entries()) {
      if (dlg.interrupt) break;
      antenne(seg, i, ''); jingle(); await wait(650);
      const phrases = x.texte.split(/(?<=[.!?…])\s+/).filter(Boolean);
      for (const ph of phrases) {
        if (dlg.interrupt) break;
        const el = document.getElementById('emission-texte'); if (el) el.textContent = `${el.textContent} ${ph}`.trim();
        await say(ph);
      }
      await wait(250);
    }
    jingle(true); await wait(900);
    setTimeout(() => { if (document.getElementById('emission-texte')) hideBoard(); }, 60000);
    if (!dlg.interrupt && musique && !/^aucune?$/i.test(musique) && typeof handle === 'function') { window.__ordreDuCerveau = true; try { await handle(`mets ${musique}`); } finally { window.__ordreDuCerveau = false; } }
  }

  /* ---------- qui est où : « où est mon fils ? », « qui est à la maison ? », « préviens-moi quand il se réveille » ---------- */
  async function presences() { const r0 = VOIXMAISON.root(); return (await fetch(`${r0}/atlas/presences`, { cache: 'no-store' })).json(); }
  const hm = ts => { const d = new Date(ts * 1000); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };
  function dirEnfant(e, p) {
    if (!e) return `${p} n'est pas à la maison : son téléphone n'est pas sur le Wi-Fi, il est sans doute chez sa maman.`;
    if (e.etat === 'dort') return `${p} dort${e.depuis ? ` depuis ${hm(e.depuis)}` : ''}, dans son lit${e.sur ? '' : ' — enfin, je le crois : c\'est la nuit et il est à la maison'}.`;
    return `${p} est ${e.ou}${e.sur ? '' : ', je crois'} : ${e.pourquoi}.`;
  }
  async function presence(quoi) {
    let r; try { r = await presences(); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); }
    const p = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'Ton fils';
    if (quoi === 'enfant') return say(dirEnfant(r.enfant, p));
    const pa = r.papa || {};
    const toi = pa.ou === 'dehors' ? 'Toi, tu es sorti' : `Toi, tu es ${/^(au |dans |sur |à )/.test(pa.ou) ? pa.ou : `dans la pièce ${pa.ou}`}`;
    return say(`${toi}. ${dirEnfant(r.enfant, p)}`);
  }
  async function veilleReveil() {
    let r; try { const r0 = VOIXMAISON.root(); r = await (await fetch(`${r0}/atlas/presences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ veille: 'reveil' }) })).json(); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); }
    const p = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    return say(r.dort ? `D'accord. ${p} dort : je te préviens sur ton téléphone dès qu'il se réveille.` : `D'accord. ${p} n'a pas l'air de dormir en ce moment : je te préviens dès qu'il se sera endormi puis réveillé.`);
  }

  /* ---------- le film du mois : les beaux moments gardés par Shadow, racontés par Atlas ---------- */
  const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  async function filmDuMois(n) {
    const r0 = VOIXMAISON.root(); if (!r0) return say("Il me faut l'ordinateur de la maison pour le film.");
    const d = new Date(); let m = d.getMonth(), a = d.getFullYear();
    const im = MOIS_FR.findIndex(x => n.includes(N(x))); if (im >= 0) { m = im; if (im > d.getMonth()) a--; } else if (/\b(dernier|precedent|passe)\b/.test(n)) { m = (m + 11) % 12; if (m === 11) a--; }
    const cle = `${a}-${String(m + 1).padStart(2, '0')}`, p = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    let l = []; try { l = (await (await fetch(`${r0}/maison/souvenirs?mois=${cle}`, { cache: 'no-store' })).json()).souvenirs || []; } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); }
    if (l.length < 3) return say(`Pas encore assez de souvenirs pour le film de ${MOIS_FR[m]} : ${l.length ? `j'en ai ${l.length}` : "je n'en ai aucun"}. Shadow en garde un à chaque mission réussie, ou quand ${p} lui dit « Shadow, prends une photo souvenir ».`);
    l = l.slice(-24);
    const imgs = await Promise.all(l.map(async x => { try { const b = await (await fetch(`${r0}/maison/souvenirs/image?id=${x.id}`, { cache: 'no-store' })).blob(); return URL.createObjectURL(b); } catch (e) { return ''; } }));
    // le commentaire : Mistral l'écrit à partir des moments (sinon, une phrase simple par photo)
    const jour = x => new Date(x.at * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    let txt = [];
    try {
      const rep = await AI.chat([{ role: 'system', content: `Tu es Atlas. Tu racontes à papa « le film de ${MOIS_FR[m]} » : les beaux moments de son fils ${p} avec Shadow, son robot. Une phrase courte et chaleureuse par moment (moins de 20 mots), au présent, tu tutoies papa, jamais inventer ce qui n'est pas écrit. Réponds en JSON : {"intro": "…", "phrases": ["…", …], "fin": "…"}, autant de phrases que de moments, dans l'ordre.` },
        { role: 'user', content: l.map((x, i) => `${i + 1}. ${jour(x)} — ${x.type} — ${x.texte}`).join('\n') }], { maxTokens: 900, temperature: 0.6, json: true });
      const j = JSON.parse(String(rep).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      txt = [j.intro, ...(j.phrases || []), j.fin];
    } catch (e) { txt = []; }
    if (txt.length < l.length + 2) txt = [`Le film de ${MOIS_FR[m]}, avec ${p} et Shadow.`, ...l.map(x => `${jour(x)} : ${x.texte}.`), `C'était le mois de ${MOIS_FR[m]}. À très vite pour le prochain film.`];
    // l'écran : le titre, puis chaque photo qui glisse doucement (en fondu), la date et le moment en bas
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:75;background:#000;overflow:hidden;font-family:system-ui,sans-serif;color:#fff';
    el.innerHTML = `<style>@keyframes kb0{from{transform:scale(1.02) translate(0,0)}to{transform:scale(1.14) translate(-2%,-1.5%)}}@keyframes kb1{from{transform:scale(1.14) translate(2%,1%)}to{transform:scale(1.03) translate(0,0)}}
      .fd-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 1.2s}.fd-img.on{opacity:1}
      .fd-bas{position:absolute;left:0;right:0;bottom:0;padding:22px 28px 26px;background:linear-gradient(transparent,rgba(0,0,0,.75));font:500 clamp(16px,2.4vw,24px)/1.4 system-ui}
      .fd-titre{position:absolute;inset:0;display:grid;place-items:center;text-align:center;transition:opacity 1s}</style>
      <div class="fd-titre"><div><div style="font:600 13px ui-monospace,monospace;letter-spacing:.4em;color:#7dd3fc">ATLAS PRÉSENTE</div><div style="font:800 clamp(34px,7vw,76px) system-ui;margin-top:12px">Le film de ${MOIS_FR[m]}</div><div style="margin-top:10px;font-size:18px;opacity:.8">${p} &amp; Shadow · ${l.length} souvenirs</div></div></div>
      <div class="fd-bas" style="opacity:0"></div>`;
    document.body.appendChild(el);
    let fini = false; el.onclick = () => { fini = true; dlg.interrupt = true; try { voice.stop(); } catch (e) { /* rien */ } };
    jingle(false);
    await say(txt[0]);
    el.querySelector('.fd-titre').style.opacity = '0';
    const bas = el.querySelector('.fd-bas');
    for (let i = 0; i < l.length && !fini; i++) {
      if (!imgs[i]) continue;
      const im = document.createElement('img'); im.className = 'fd-img'; im.src = imgs[i]; im.style.animation = `kb${i % 2} 9s ease-out forwards`;
      el.insertBefore(im, bas); await wait(60); im.classList.add('on');
      const prec = el.querySelectorAll('.fd-img'); if (prec.length > 2) prec[0].remove();
      bas.style.opacity = '1'; bas.innerHTML = `<div style="font:600 12px ui-monospace,monospace;letter-spacing:.25em;color:#7dd3fc;text-transform:uppercase">${esc(jour(l[i]))}</div><div style="margin-top:4px">${esc(l[i].texte)}</div>`;
      const t0 = Date.now(); await say(txt[i + 1] || ''); const reste = 4500 - (Date.now() - t0); if (reste > 0) await wait(reste);
    }
    if (!fini) { bas.style.opacity = '0'; const fin = el.querySelector('.fd-titre'); fin.innerHTML = `<div><div style="font:800 clamp(30px,6vw,64px) system-ui">Fin</div><div style="margin-top:10px;opacity:.8">Le film de ${MOIS_FR[m]}</div></div>`; fin.style.opacity = '1'; jingle(true); await say(txt[txt.length - 1]); await wait(3000); }
    el.remove(); imgs.forEach(u => u && URL.revokeObjectURL(u)); dlg.interrupt = false;
  }

  /* ---------- le film des caméras : la journée vue par les caméras en 30 secondes, façon bande de surveillance ----------
     Les photos d'alerte (un passage, un livreur, un bruit) et les images que la sentinelle garde du flux toutes les 20 minutes (48 h). */
  const camNom = c => { const x = String(c || '').toLowerCase(); return /plateau/.test(x) ? 'Plateau' : /facade/.test(N(x)) ? 'Façade' : /cour/.test(x) ? 'Cour' : /toit/.test(x) ? 'Toiture' : c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Caméra'; };
  function legende(x) {
    const a = x.a || {}, t = String(x.texte || '');
    if (a.livreur || a.transporteur) return `un livreur${a.transporteur ? ` ${a.transporteur}` : ''}${a.colis ? ', avec un colis' : ''}`;
    if (a.vehicule) return `un véhicule${a.vehicule_type ? ` (${a.vehicule_type}${a.vehicule_couleur ? ` ${a.vehicule_couleur}` : ''})` : ''}`;
    if (/bruit fort/i.test(t)) return 'un bruit fort';
    const d = t.match(/«[^»]+»[^:]*:\s*(.+)$/); if (d) { const p_ = d[1].replace(/^(je vois|on voit|il y a)\s+/i, '').split(/[.;]/)[0].trim(); if (p_) return p_.length > 64 ? p_.slice(0, 64).replace(/[\s,;:]+\S*$/, '') : p_; }
    if (/human|personne|quelqu/i.test(t)) return "quelqu'un";
    if (/détection|mouvement|motion/i.test(t)) return 'un mouvement';
    return x.alerte ? 'une alerte' : 'tout est calme';
  }
  async function filmCameras(n) {
    const r0 = VOIXMAISON.root(); if (!r0) return say("Il me faut l'ordinateur de la maison pour le film des caméras.");
    let heures = /\b(semaine|7 jours|sept jours)\b/.test(n) ? 168 : /\b(hier|48 heures|deux jours)\b/.test(n) ? 48 : 24;
    const charge = async h => (await (await fetch(`${r0}/maison/film?heures=${h}`, { cache: 'no-store' })).json()).images || [];
    let l = []; try { l = await charge(heures); if (l.length < 4 && heures < 168) { heures = 168; l = await charge(heures); } } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); } // une journée trop calme : la semaine
    if (!l.length) return say("Les caméras n'ont gardé aucune image depuis hier. La sentinelle en garde une toutes les 20 minutes quand elle surveille, le soir et quand tu es absent, et une photo à chaque passage.");
    // les moments : toutes les alertes avec photo, complétées par des images du flux bien réparties (12 au plus, dans l'ordre)
    const al = l.filter(x => x.alerte), fl = l.filter(x => !x.alerte), place = Math.max(0, 12 - al.length);
    const pris = fl.length <= place ? fl : Array.from({ length: place }, (v, i) => fl[Math.round((i * (fl.length - 1)) / Math.max(1, place - 1))]);
    const choix = [...new Set(al.slice(-12).concat(pris))].sort((a, b) => a.at - b.at);
    const imgs = await Promise.all(choix.map(async x => { try { const b = await (await fetch(`${r0}/maison/film/image?id=${encodeURIComponent(x.id)}`, { cache: 'no-store' })).blob(); return b.type.startsWith('image') ? URL.createObjectURL(b) : ''; } catch (e) { return ''; } }));
    const hm = x => { const d = new Date(x.at * 1000); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };
    const hms = x => new Date(x.at * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const jourTxt = heures > 48 ? 'les 7 derniers jours' : heures > 24 ? 'les dernières 48 heures' : new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const hmJ = x => `${heures > 24 ? `${new Date(x.at * 1000).toLocaleDateString('fr-FR', { weekday: 'long' })}, ` : ''}${hm(x)}`;
    const nbAl = choix.filter(x => x.alerte).length;
    // la narration : Mistral la rend vivante à partir des faits (sinon : l'heure, la caméra, ce qu'elle a vu)
    let txt = [];
    try {
      const rep = await AI.chat([{ role: 'system', content: 'Tu es Atlas, l\'IA de la maison. Tu racontes « le film des caméras » à papa : une bande de surveillance de la journée. Une phrase très courte par image (moins de 12 mots), qui commence par l\'heure, style « 14 h 12, le livreur. » ou « 16 h 40, le plateau, calme. ». Ton de film, un brin pince-sans-rire, tu tutoies, n\'invente rien qui n\'est pas écrit. Réponds en JSON : {"intro": "...", "phrases": ["..."], "fin": "..."} avec exactement une phrase par image.' },
        { role: 'user', content: choix.map((x, i) => `${i + 1}. ${hmJ(x)} — caméra ${camNom(x.camera)} — ${x.alerte ? legende(x) : 'image de routine, rien de signalé'}`).join('\n') }], { maxTokens: 700, temperature: 0.6, json: true });
      const j = JSON.parse(String(rep).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      txt = [j.intro, ...(j.phrases || []), j.fin];
    } catch (e) { txt = []; }
    if (txt.length < choix.length + 2 || txt.some(x => !x)) txt = [`Le film des caméras${heures > 48 ? ' de la semaine' : heures > 24 ? ' des deux derniers jours' : ''}. ${choix.length} image${choix.length > 1 ? 's' : ''}${nbAl ? `, dont ${nbAl} détection${nbAl > 1 ? 's' : ''}` : ', rien que du calme'}.`, ...choix.map(x => `${hmJ(x)}, ${camNom(x.camera).toLowerCase() === 'plateau' ? 'le plateau' : `la ${camNom(x.camera).toLowerCase()}`} : ${legende(x)}.`), 'Fin de la bande. Rien d\'autre à signaler.'];
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:75;background:#000;overflow:hidden;font-family:ui-monospace,Menlo,monospace;color:#d1fae5';
    el.innerHTML = `<style>@keyframes fcR{50%{opacity:.15}}@keyframes fcG{0%{opacity:.9;transform:translateX(-3%)}100%{opacity:0;transform:none}}@keyframes fcZ{from{transform:scale(1)}to{transform:scale(1.06)}}
      .fc-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:saturate(.75) contrast(1.12) brightness(1.02);animation:fcZ 4s linear forwards}
      .fc-lig{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 3px),radial-gradient(80% 70% at 50% 50%,transparent 55%,rgba(0,0,0,.6))}
      .fc-coupe{position:absolute;inset:0;background:linear-gradient(90deg,rgba(110,240,184,.35),rgba(255,255,255,.12),rgba(95,211,255,.3));animation:fcG .35s ease-out forwards;pointer-events:none}
      .fc-h{position:absolute;left:22px;top:18px;font-size:clamp(12px,1.6vw,17px);letter-spacing:.2em;text-shadow:0 0 6px #000}.fc-rec{position:absolute;right:22px;top:18px;font-size:clamp(12px,1.6vw,17px);letter-spacing:.2em;color:#ff6b4a;text-shadow:0 0 6px #000}
      .fc-rec b{animation:fcR 1s steps(2) infinite;font-weight:400}.fc-bas{position:absolute;left:0;right:0;bottom:0;padding:18px 24px 22px;background:linear-gradient(transparent,rgba(0,0,0,.8));font:500 clamp(15px,2.2vw,22px)/1.4 system-ui,sans-serif;color:#fff}
      .fc-titre{position:absolute;inset:0;display:grid;place-items:center;text-align:center;transition:opacity .6s}</style>
      <div class="fc-titre"><div><div style="font-size:13px;letter-spacing:.45em;color:#6ef0b8">ATLAS · ARCHIVES DE SURVEILLANCE</div><div style="font:800 clamp(30px,6vw,68px) system-ui;margin-top:12px;color:#fff">Le film des caméras</div><div style="margin-top:12px;font-size:15px;letter-spacing:.2em;opacity:.75;text-transform:uppercase">${esc(jourTxt)} · ${choix.length} séquence${choix.length > 1 ? 's' : ''}</div></div></div>
      <div class="fc-lig"></div><div class="fc-h" style="opacity:0"></div><div class="fc-rec" style="opacity:0"><b>●</b> REC <span></span></div><div class="fc-bas" style="opacity:0"></div>`;
    document.body.appendChild(el);
    let fini = false; el.onclick = () => { fini = true; dlg.interrupt = true; try { voice.stop(); } catch (e) { /* rien */ } };
    try { VISIO.sfx('scan'); } catch (e) { /* pas de son */ }
    await say(txt[0]);
    el.querySelector('.fc-titre').style.opacity = '0';
    const h = el.querySelector('.fc-h'), rec = el.querySelector('.fc-rec'), bas = el.querySelector('.fc-bas'), lig = el.querySelector('.fc-lig');
    for (let i = 0; i < choix.length && !fini; i++) {
      if (!imgs[i]) continue;
      const x = choix[i], im = document.createElement('img'); im.className = 'fc-img'; im.src = imgs[i];
      el.insertBefore(im, lig); const prec = el.querySelectorAll('.fc-img'); if (prec.length > 1) prec[0].remove();
      const cp = document.createElement('div'); cp.className = 'fc-coupe'; el.appendChild(cp); setTimeout(() => cp.remove(), 400);
      try { fx.tone([[x.alerte ? 880 : 660, 0.03]]); } catch (e) { /* pas de son */ }
      h.style.opacity = '1'; h.textContent = `CAM ${String(i + 1).padStart(2, '0')} · ${camNom(x.camera).toUpperCase()}${x.alerte ? ' · DÉTECTION' : ''}`; h.style.color = x.alerte ? '#ffb547' : '#d1fae5';
      rec.style.opacity = '1'; rec.querySelector('span').textContent = `${heures > 24 ? `${new Date(x.at * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ` : ''}${hms(x)}`;
      bas.style.opacity = '1'; bas.textContent = txt[i + 1] || '';
      const t0 = Date.now(); await say(txt[i + 1] || ''); const reste = 2300 - (Date.now() - t0); if (reste > 0) await wait(reste);
    }
    if (!fini) {
      [h, rec, bas].forEach(e => { e.style.opacity = '0'; }); el.querySelectorAll('.fc-img').forEach(e => e.remove());
      const fin = el.querySelector('.fc-titre'); fin.innerHTML = '<div><div style="font-size:13px;letter-spacing:.45em;color:#6ef0b8">FIN DE LA BANDE</div><div style="font:800 clamp(26px,5vw,56px) system-ui;margin-top:12px;color:#fff">Périmètre sous surveillance</div></div>'; fin.style.opacity = '1';
      try { VISIO.sfx('final'); } catch (e) { /* pas de son */ }
      await say(txt[txt.length - 1]); await wait(1500);
    }
    el.remove(); imgs.forEach(u => u && URL.revokeObjectURL(u)); dlg.interrupt = false;
  }

  /* ---------- la maison qui sent ton humeur (maison/voix.py) : ta voix ce soir comparée à ta voix habituelle ----------
     Seulement ta voix, seulement des nombres (l'énergie, la hauteur, le rythme, les pauses) ; jamais le son ni les mots.
     Le soir, si tu as l'air épuisé ou tendu, il te le dit doucement et PROPOSE une ambiance calme : rien ne change sans ton « oui ». */
  const humeurLire = async () => { const r0 = VOIXMAISON.root(); if (!r0) return null; try { return await (await fetch(`${r0}/maison/voix/humeur`, { cache: 'no-store' })).json(); } catch (e) { return null; } };
  const liste_ = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  let humeurOffre = null;
  async function humeurSoir() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h < 19.5 || h >= 22.4 || S.settings.humeur === false || S.humeurDit === dayKey() || !dlg.started) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return; // seulement l'appareil où tu es
    const r = await humeurLire(); if (!r || !r.pret || !['fatigue', 'tendu'].includes(r.etat)) return;
    PROACTIF.annonce(`humeur-${dayKey()}`, async () => {
      S.humeurDit = dayKey(); save();
      humeurOffre = { at: Date.now(), etat: r.etat }; dlg.attendReponse = Date.now() + 90000;
      const d = (r.details || []).slice(0, 3);
      return r.etat === 'fatigue'
        ? `Tu as l'air fatigué ce soir${d.length ? ` : ta voix est ${liste_(d)} que d'habitude` : ''}. Tu veux que je mette une ambiance calme, lumière douce et musique tranquille ?`
        : `Tu as l'air un peu tendu ce soir${d.length ? ` : ta voix est ${liste_(d)} que d'habitude` : ''}. Tu veux que je mette une ambiance calme pour souffler ?`;
    }, { expire: Date.now() + 40 * 60000 });
  }
  setInterval(() => { humeurSoir().catch(() => {}); }, 10 * 60000);
  async function ambianceCalme() {
    humeurOffre = null; dlg.attendReponse = 0;
    const r0 = VOIXMAISON.root();
    let l = []; try { l = (await (await fetch(`${r0}/maison/appareils`, { cache: 'no-store' })).json()).appareils || []; } catch (e) { /* rien */ }
    const ids = l.filter(a => a.type === 'lampe' && a.allume && !/\bchambres?\b/.test(N(a.nom))).map(a => a.id);
    if (ids.length) { try { await fetch(`${r0}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, allume: true, lum: 25, teinte: 0 }) }); } catch (e) { /* rien */ } }
    fx.ok();
    await say(`${ids.length ? 'Lumière douce' : 'La lumière reste comme elle est'}. Je mets FIP, tranquillement. Repose-toi bien.`);
    return handle('mets FIP');
  }
  async function humeurDis() {
    const r = await humeurLire();
    if (!r) return say("Je n'arrive pas à joindre l'ordinateur de la maison.");
    if (S.settings.humeur === false) return say("J'ai arrêté d'écouter ton humeur. Dis « écoute de nouveau mon humeur » pour reprendre.");
    if (!r.pret) return say(r.base ? `J'apprends encore ta voix habituelle : ${r.base} phrases sur ${r.jours} jour${r.jours > 1 ? 's' : ''} pour l'instant, il m'en faut au moins 40, sur trois jours. Continue de me parler normalement.` : "Pour sentir ton humeur, je dois d'abord reconnaître ta voix. Dis « Atlas, apprends ma voix », puis parle-moi normalement pendant quelques jours.");
    if (r.etat === 'inconnu') return say(`Tu ne m'as pas encore assez parlé ${new Date().getHours() >= 17 ? 'depuis 17 heures' : "aujourd'hui"} pour que je compare avec ta voix habituelle.`);
    const d = (r.details || []).slice(0, 3);
    if (r.etat === 'normal') return say("Ta voix est comme d'habitude. Rien à signaler de ce côté-là.");
    return say(`Ta voix est ${d.length ? liste_(d) : 'différente'} que d'habitude : tu as l'air ${r.etat === 'fatigue' ? 'fatigué' : 'un peu tendu'}. Ce n'est qu'une impression de ma part, pas un diagnostic.`);
  }

  function route(t, n) {
    if (humeurOffre && Date.now() - humeurOffre.at < 120000) {
      if (/^(oui|ouais|ok|d accord|vas y|volontiers|bonne idee|carrement|je veux bien|avec plaisir)\b/.test(n)) return ambianceCalme;
      if (/^(non|non merci|pas la peine|ca va|laisse|c est bon)\b/.test(n)) return () => { humeurOffre = null; dlg.attendReponse = 0; return say("D'accord. Je suis là si tu as besoin."); };
    }
    if (/\bhumeur\b/.test(n) && /\b(oublie|efface|supprime)\b/.test(n)) return async () => { const r0 = VOIXMAISON.root(); try { await fetch(`${r0}/maison/voix/humeur`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ efface: true }) }); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); } return say("C'est oublié : je n'ai plus aucune mesure de ta voix. Je recommence à zéro."); };
    if (/\bhumeur\b/.test(n) && /\b(arrete|coupe|desactive|n ecoute plus|stop)\b/.test(n)) return () => { S.settings.humeur = false; save(); return say("D'accord : je n'écoute plus ton humeur. Je ne garde plus aucune mesure."); };
    if (/\bhumeur\b/.test(n) && /\b(ecoute de nouveau|reactive|remets|active|reprends)\b/.test(n)) return () => { S.settings.humeur = true; save(); return say("J'écoute de nouveau ton humeur, seulement des mesures de ta voix, jamais tes mots."); };
    if (/\b(comment je vais|j ai l air (comment|fatigue|stresse|tendu|creve|epuise)|mon humeur|comment est ma voix|est ce que je suis (fatigue|stresse|tendu)|tu me trouves (fatigue|stresse|tendu|comment)|je suis comment ce soir)\b/.test(n)) return humeurDis;
    if (/\b(film|video|bande|resume|montage)s? (des |de (la |ma )?)?(cameras?|surveillance|videosurveillance)\b|\b(la journee|ma journee|aujourd hui|hier) (vue )?(par|des|aux) (les )?cameras\b/.test(n)) return () => filmCameras(n);
    if (/\b(le |notre |mon )?film (du mois|de (ce mois|octobre|novembre|decembre|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre)|des souvenirs)\b|\bnos souvenirs du mois\b/.test(n)) return () => filmDuMois(n);
    const pr = typeof LIEN !== 'undefined' && LIEN.prenom() ? N(LIEN.prenom()) : '', FILS = new RegExp(`\\b(mon fils|le petit|mon garcon|fiston${pr ? `|${pr}` : ''})\\b`);
    if (FILS.test(n) && /\b(previens|dis|alerte|appelle|reveille|avertis) moi (quand|des que|lorsqu)\b/.test(n) && /\b(reveill?e|leve|debout|reveil)\b/.test(n)) return veilleReveil;
    if (FILS.test(n) && /\b(ou est|ou se trouve|il est ou|il est dans quelle|il fait quoi|qu est ce qu il fait|il dort|il est reveille|il est la|il est a la maison)\b/.test(n)) return () => presence('enfant');
    if (/\b(qui est (a la maison|la|ici|present|dans la maison)|il y a qui|y a qui|y a t il quelqu un|qui est rentre)\b/.test(n)) return () => presence('tous');
    // le précepteur : le bilan scolaire de son fils (ses exercices avec Shadow)
    if (FILS.test(n) && /\b(bilan|progres|il s en sort|ecole|scolaire|ses notes|exercices|devoirs de la semaine)\b/.test(n) || /\b(bilan scolaire|bilan de l ecole)\b/.test(n)) return async () => {
      let r; try { const r0 = VOIXMAISON.root(); r = await (await fetch(`${r0}/atlas/ecole`, { cache: 'no-store' })).json(); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); }
      return say(r.texte.replace(/ton fils/g, (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils'));
    };
    // le coach de trading : des constats sur ses trades (la boîte noire + Silver Terminal), jamais un conseil
    if (/\b(mon coach|coach de trading|analyse mes trades|mes habitudes (de trading|de trader)|rapport de trading|qu est ce que disent mes trades|mes points faibles en trading)\b/.test(n)) return async () => {
      let r; try { const r0 = VOIXMAISON.root(); r = await (await fetch(`${r0}/atlas/coach`, { cache: 'no-store' })).json(); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison."); }
      return say(r.texte);
    };
    if (/\b(radio atlas|mon emission|ton emission|l emission du matin|mon journal radio)\b/.test(n) && !/\b(arrete|coupe|stop)\b/.test(n)) return () => emission(/\b(longue|complete|5 minutes|cinq minutes)\b/.test(n));
    const mus = n.match(/\b(?:musique|radio) (?:de fin |a la fin )?(?:de |pour )?(?:l emission|radio atlas)\b.*?\b(?:mets|ce sera|c est|avec) (.+)$/); if (mus) return () => { S.settings.emissionMusique = mus[1]; save(); return say(`Noté : Radio Atlas finira avec ${mus[1]}.`); };
    const fq = n.match(/\bforfait (?:eleven ?labs|elevenlabs|de (?:la )?voix|voix)\b.*?(\d[\d ]*\d|\d+)\s*(mille|k)?/);
    if (fq) return () => { const v = parseInt(fq[1].replace(/\s/g, ''), 10) * (fq[2] ? 1000 : 1); if (!(v >= 1000)) return say("Dis par exemple : mon forfait ElevenLabs est de 100 000 caractères."); S.settings.elevenQuota = v; save(); return say(`Noté : ${v.toLocaleString('fr-FR')} caractères par mois pour la voix.`); };
    if (/\b(ma facture|la facture|combien (je depense|ca coute|ca me coute|tu me coutes|tu coutes)|ma consommation|mon budget (ia|atlas)?|ce que tu me coutes)\b/.test(n)) return facture;
    if (/\b(cerveau|mode) (economique|eco|moins cher)\b/.test(n)) return () => { S.settings.mistralModel = 'mistral-medium-latest'; save(); return say('Cerveau économique : Mistral Medium. Toujours très bon, environ cinq fois moins cher.'); };
    if (/\b(cerveau|mode) (maximum|max|premium|le plus intelligent|puissant)\b/.test(n)) return () => { S.settings.mistralModel = 'mistral-large-latest'; save(); return say('Cerveau maximum : Mistral Large, le plus intelligent.'); };
    if (/\b(cache|masque|enleve|coupe|arrete) (ton|l|le|ta) (analyse|flux de pensee|hud)\b/.test(n)) return () => { S.settings.pensee = false; save(); return say('Analyse masquée.'); };
    if (/\b(montre|affiche|remets|active) (ton|l|le|ta) (analyse|flux de pensee|hud)\b|^mode analyse$/.test(n)) return () => { S.settings.pensee = true; save(); return say("Analyse affichée : tu verras ce que je consulte avant de répondre."); };
    if (/\b(journal de bord|journal du bord|carnet de bord)\b/.test(n) && /\bhier\b/.test(n)) return hier;
    if (/\b(journal de bord|journal du bord|carnet de bord|journal du jour|rapport de la journee|bilan de (la|ma|ta) journee|resume de la journee|comment s est passee la journee)\b/.test(n)) return journal;
    return null;
  }
  return { route, pensee, journal, _dire: dire, _dateStellaire: dateStellaire };
})();

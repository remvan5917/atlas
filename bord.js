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

  function route(t, n) {
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

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
      if (fo === 'mistral') { const p = PRIX.find(([re]) => re.test(mo)) || [0, 2, 6]; mistral += (v.in * p[1] + v.out * p[2]) / 1e6 * USD_EUR; jetons += v.in + v.out; }
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

  function route(t, n) {
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

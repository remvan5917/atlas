/* =========================================================
   ATLAS — le spectacle : le coach holographique, les gestes, le jeu télévisé, le traducteur universel
   - « coach-moi : 20 pompes » (squats, abdos, jumping jacks, gainage) : la caméra suit le corps (sur l'appareil),
     compte les répétitions, dit « descends plus bas ! », garde les records ; « défi squats avec mon fils » : 30 s chacun.
   - « active les gestes » : ✋ pause / lecture, ✌️ morceau suivant, 👍 / 👎 le volume, ✊ éteins la pièce, ☝️ allume-la.
   - « lance le jeu télévisé » : générique, lumières de plateau, questions adaptées à chacun (l'enfant, les grands),
     deux manches et une finale, Shadow en co-animateur s'il est réveillé, le champion couronné.
   - « traduis avec mon invité en anglais » : chacun parle sa langue, Atlas traduit à voix haute, sous-titres à l'écran ;
     « fin de la traduction ».
   ========================================================= */
'use strict';

const SCENE = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const regle = (ids, allume, lum, teinte) => appel('/maison/commande', Object.assign({ ids, allume, source: 'routine' }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}), 20000);
  const pc = d => appel('/maison/pc', d, 20000);
  const sfx = q => { try { VISIO.sfx(q); } catch (e) { /* pas de son */ } };
  const enfant = () => (typeof LIEN !== 'undefined' && LIEN.prenom()) || '';
  const pareil = (x, y) => N(x || '').replace(/y/g, 'i') === N(y || '').replace(/y/g, 'i');
  async function camera() {
    if (typeof VISION === 'undefined' || !VISION.supported) return false;
    if (VISION.isOn()) return true;
    try { await VISION.start($('#cam'), { objects: false }); return true; } catch (e) { return false; }
  }
  // un petit air d'émission de télé, fabriqué sur place
  function jingle(type = 'generique') {
    if (!S.settings.sound) return;
    try {
      const c = fx.audio(), t0 = c.currentTime, out = c.createGain(); out.gain.value = 0.18; out.connect(c.destination);
      const note = (f, d, l, ty = 'square', v = 0.5) => { const o = c.createOscillator(), g = c.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(v, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + l); o.connect(g); g.connect(out); o.start(t0 + d); o.stop(t0 + d + l + 0.05); };
      if (type === 'generique') [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.75], [1047, 0.9], [1319, 1.05]].forEach(([f, d]) => { note(f, d, 0.28); note(f / 2, d, 0.28, 'triangle', 0.35); });
      else if (type === 'bonne') [[784, 0], [988, 0.1], [1319, 0.2]].forEach(([f, d]) => note(f, d, 0.25, 'triangle'));
      else if (type === 'fausse') { note(196, 0, 0.5, 'sawtooth', 0.4); note(185, 0.05, 0.5, 'sawtooth', 0.3); }
      else if (type === 'champion') [[523, 0], [523, 0.2], [523, 0.4], [659, 0.6], [784, 1.0], [659, 1.3], [784, 1.5], [1047, 1.8]].forEach(([f, d]) => { note(f, d, 0.35); note(f * 1.5, d, 0.35, 'triangle', 0.25); });
      else if (type === 'tic') note(1760, 0, 0.05, 'sine', 0.4);
    } catch (e) { /* pas de son */ }
  }
  const panneau = (titre, corps, couleur = '#38bdf8') => `<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid ${couleur}66;border-radius:14px;padding:12px 14px;color:#e0f2fe"><div style="font-size:11px;letter-spacing:.2em;color:${couleur}">◢ ${esc(titre)}</div><div style="height:1px;background:linear-gradient(90deg,transparent,${couleur},transparent);margin:8px 0"></div>${corps}</div>`;

  /* ---------- le coach holographique ---------- */
  const ang = (a, b, c) => { if (!a || !b || !c) return null; const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y]; const d = Math.hypot(...v1) * Math.hypot(...v2); return d ? Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180 / Math.PI : null; };
  const vu = (lm, ...ids) => ids.every(i => lm[i] && (lm[i].visibility === undefined || lm[i].visibility > 0.5));
  const meilleur = (lm, g, d) => { const a = vu(lm, ...g) ? ang(lm[g[0]], lm[g[1]], lm[g[2]]) : null, b = vu(lm, ...d) ? ang(lm[d[0]], lm[d[1]], lm[d[2]]) : null; return a == null ? b : b == null ? a : Math.min(a, b); };
  const EXOS = {
    pompes: { nom: 'pompes', mesure: lm => meilleur(lm, [11, 13, 15], [12, 14, 16]), bas: 95, haut: 150, conseil: 'Descends plus bas !' },
    squats: { nom: 'squats', mesure: lm => meilleur(lm, [23, 25, 27], [24, 26, 28]), bas: 105, haut: 160, conseil: 'Plie plus les genoux !' },
    abdos: { nom: 'abdos', mesure: lm => meilleur(lm, [11, 23, 25], [12, 24, 26]), bas: 75, haut: 110, conseil: 'Remonte plus haut !' },
    jacks: { nom: 'jumping jacks', mesure: lm => { if (!vu(lm, 0, 15, 16, 27, 28, 11, 12)) return null; const sw = Math.abs(lm[11].x - lm[12].x) || 0.1; const ouvert = lm[15].y < lm[0].y && lm[16].y < lm[0].y && Math.abs(lm[27].x - lm[28].x) > sw * 1.3; const ferme = lm[15].y > lm[11].y && lm[16].y > lm[12].y; return ouvert ? 60 : ferme ? 170 : 120; }, bas: 90, haut: 150, conseil: 'Les bras bien en haut !' },
  };
  const MOTS_EXO = [[/\bpompes?\b/, 'pompes'], [/\bsquats?\b|\bflexions?\b/, 'squats'], [/\babdos?\b|\bredressements?\b|\bcrunch\w*\b/, 'abdos'], [/\bjumping jacks?\b|\bsauts? (en etoile|ecart)\b|\bjacks?\b/, 'jacks'], [/\bgainage\b|\bplanche\b/, 'gainage']];
  function ecranCoach(titre, couleur = '#22d3ee') {
    showBoard(panneau(titre, `<div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center"><canvas id="co-c" width="360" height="300" style="width:100%;max-height:52vh;background:radial-gradient(circle at 50% 40%,#06223a,#020b14);border-radius:12px"></canvas>
      <div style="text-align:center;min-width:130px"><div id="co-n" style="font:700 clamp(54px,10vw,110px)/1 system-ui;color:#f0f9ff;text-shadow:0 0 24px ${couleur}">0</div><div id="co-o" style="font-size:12px;color:#93c5fd;letter-spacing:.15em"></div><div id="co-t" style="margin-top:10px;font-size:18px;color:#5eead4">0:00</div><div id="co-r" style="margin-top:6px;font-size:12px;color:#fbbf24"></div><div id="co-m" style="margin-top:8px;font-size:13px;color:#fca5a5;min-height:18px"></div></div></div>`, couleur), 'graphe-board');
    clearTimeout(effaceT);
  }
  const OS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
  function dessine(lm, couleur) {
    const cv = document.getElementById('co-c'); if (!cv || !lm) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    g.strokeStyle = couleur; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = couleur; g.shadowBlur = 16;
    for (const [a, b] of OS) if (vu(lm, a, b)) { g.beginPath(); g.moveTo(lm[a].x * W, lm[a].y * H); g.lineTo(lm[b].x * W, lm[b].y * H); g.stroke(); }
    if (vu(lm, 0)) { g.beginPath(); g.arc(lm[0].x * W, lm[0].y * H, 16, 0, 7); g.stroke(); }
  }
  const txt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const chrono = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  // une série : renvoie le nombre de répétitions (ou de secondes pour le gainage)
  async function serie(exo, { cible = 0, duree = 0, qui = '', couleur = '#22d3ee' } = {}) {
    if (!(await camera())) { await say("Il me faut ma caméra pour te coacher."); return -1; }
    const gain = exo === 'gainage', E = EXOS[exo];
    const cle = `${exo}${qui ? `-${N(qui)}` : ''}`, record = ((S.coach || {})[cle]) || 0;
    ecranCoach(`COACH · ${(gain ? 'GAINAGE' : E.nom.toUpperCase())}${qui ? ` · ${qui.toUpperCase()}` : ''}`, couleur);
    txt('co-o', gain ? 'SECONDES' : cible ? `/ ${cible}` : 'RÉPÉTITIONS'); if (record) txt('co-r', `RECORD : ${record}`);
    await say(gain ? `Gainage${cible ? ` : ${cible} secondes` : ''}. Mets-toi en planche, de profil devant la caméra.` : `${E.nom}${cible ? `, ${cible}` : ''}. Mets-toi de profil, bien visible. Trois, deux, un… c'est parti !`);
    let n = 0, phase = 'haut', minAng = 999, dernierRep = Date.now(), vuAt = Date.now(), t0 = Date.now(), tenu = 0, horsPose = 0, conseilAt = 0, stop = false, encourage = false;
    const ecoute = (async () => { while (!stop) { const a = N(await hear({ maxWait: 8000 }) || ''); if (/\b(stop|arrete|fini|j en peux plus|termine)\b/.test(a)) stop = true; } })();
    while (!stop) {
      const lm = await VISION.pose().catch(() => null);
      const now = Date.now();
      txt('co-t', chrono(now - t0));
      if (duree && now - t0 >= duree * 1000) break;
      if (!lm) { if (now - vuAt > 25000) { await say("Je ne te vois plus. Fin de la série."); break; } await wait(150); continue; }
      vuAt = now; dessine(lm, couleur);
      if (gain) {
        const ok = vu(lm, 11, 23, 27) && Math.abs(ang(lm[11], lm[23], lm[27]) - 180) < 25 && Math.abs(lm[11].y - lm[27].y) < 0.25;
        if (ok) { tenu += 0.15; horsPose = 0; const s = Math.floor(tenu); txt('co-n', String(s)); if (s && s % 10 === 0 && Math.abs(tenu - s) < 0.16 && !voice.occupe()) say(String(s)); if (cible && s >= cible) break; }
        else if (tenu > 2 && ++horsPose > 14) break;
        await wait(150); continue;
      }
      const a = E.mesure(lm);
      if (a != null) {
        if (phase === 'haut') {
          if (a < E.bas) phase = 'bas';
          else if (a < E.haut - 25) minAng = Math.min(minAng, a); // il descend… mais pas assez ?
          else if (a > E.haut) { if (minAng < 999 && now - conseilAt > 4000) { conseilAt = now; txt('co-m', E.conseil); if (!voice.occupe()) say(E.conseil); } minAng = 999; }
        }
        else if (a > E.haut) {
          phase = 'haut'; minAng = 999; n++; dernierRep = now; txt('co-n', String(n)); txt('co-m', ''); jingle('tic');
          if (!voice.occupe()) say(cible && n === cible ? `${n} ! Série terminée !` : String(n));
          if (cible && !encourage && cible - n === 3 && cible >= 8) { encourage = true; setTimeout(() => { if (!voice.occupe()) say('Allez, encore trois !'); }, 600); }
          if (cible && n >= cible) break;
        }
      }
      if (n && now - dernierRep > 15000) break;
      await wait(110);
    }
    stop = true; ecoute.catch(() => {}); try { OREILLES.cancel(); } catch (e) { /* rien */ }
    const score = gain ? Math.floor(tenu) : n;
    if (score > record) { S.coach = Object.assign(S.coach || {}, { [cle]: score }); save(); }
    return score;
  }
  async function coach(t, n) {
    const ex = (MOTS_EXO.find(([re]) => re.test(n)) || [null, 'squats'])[1];
    const cible = +((n.match(/\b(\d{1,3})\s*(?:pompes?|squats?|flexions?|abdos?|jumping|jacks?|sauts?|secondes?|s)\b/) || [])[1] || 0) || (/\b(une|1) minute\b/.test(n) ? 60 : +((n.match(/\b(\d) minutes\b/) || [])[1] || 0) * 60);
    const qui = dlg.qui && !/^invit/.test(dlg.qui) ? dlg.qui : '';
    const cle = `${ex}${qui ? `-${N(qui)}` : ''}`, avant = ((S.coach || {})[cle]) || 0;
    const s = await serie(ex, { cible, qui });
    if (s < 0) return;
    sfx('final');
    const unite = ex === 'gainage' ? 'secondes' : EXOS[ex].nom;
    setTimeout(cacheEcran, 15000);
    return say(`${s} ${unite}.${s > avant && avant ? ` Nouveau record ! L'ancien était de ${avant}.` : s > avant ? ' C\'est ton premier record, je le garde.' : ` Ton record reste ${avant}.`} ${s >= (cible || 10) ? pick(['Excellent travail.', 'Bravo, machine de guerre.', 'Impressionnant.']) : 'Bien joué, on continue la prochaine fois.'}`);
  }
  async function defi(t, n) {
    const ex = (MOTS_EXO.find(([re]) => re.test(n)) || [null, 'squats'])[1], p = enfant() || 'le petit', papa = S.nom || 'Papa';
    jingle('generique');
    await say(`Défi ${ex === 'gainage' ? 'gainage' : EXOS[ex].nom} ! ${ex === 'gainage' ? 'Le plus long gagne' : 'Trente secondes chacun, le plus de répétitions gagne'}. ${papa} commence.`);
    const a = await serie(ex, { duree: ex === 'gainage' ? 0 : 30, qui: papa, couleur: '#38bdf8' });
    if (a < 0) return;
    await say(`${papa} : ${a}. À toi, ${p} ! Prépare-toi.`); await wait(3000);
    const b = await serie(ex, { duree: ex === 'gainage' ? 0 : 30, qui: p, couleur: '#f472b6' });
    const gagnant = b > a ? p : a > b ? papa : '';
    jingle('champion');
    try { DUO._holo({ titre: gagnant || 'Égalité !', sous: gagnant ? 'CHAMPION DU DÉFI' : 'MATCH NUL', couleur: '#fbbf24', lignes: [[papa, String(a)], [p, String(b)]] }); } catch (e) { /* pas d'écran */ }
    await wait(2500);
    return say(gagnant ? `${gagnant} gagne, ${Math.max(a, b)} contre ${Math.min(a, b)} ! ${gagnant === p ? `Bravo ${p}, tu as battu ton papa !` : `Bien essayé ${p}, la revanche quand tu veux !`}` : `Égalité parfaite, ${a} partout ! Revanche ?`);
  }

  /* ---------- les gestes ---------- */
  let gestes = null;
  const GESTES = {
    Open_Palm: ['✋', 'Pause / lecture', () => pc({ action: 'musique', quoi: 'bascule' })],
    Victory: ['✌️', 'Morceau suivant', () => pc({ action: 'musique', quoi: 'suivant' })],
    Thumb_Up: ['👍', 'Volume +', () => pc({ action: 'volume', delta: 10 })],
    Thumb_Down: ['👎', 'Volume −', () => pc({ action: 'volume', delta: -10 })],
    Closed_Fist: ['✊', 'Lumière éteinte', () => pieceLumiere(false)],
    Pointing_Up: ['☝️', 'Lumière allumée', () => pieceLumiere(true)],
  };
  async function pieceLumiere(on) {
    const piece = N(S.settings.piece || '').split(' ').filter(w => w.length > 2); if (!piece.length) return;
    const l = ((await appel('/maison/appareils', null, 10000)).appareils || []).filter(a => a.type === 'lampe' && N(a.nom).split(' ').some(w => piece.includes(w)));
    if (l.length) await regle(l.map(a => a.id), on, on ? 80 : undefined);
  }
  function bulle(icone, texte) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;right:18px;top:18px;z-index:58;padding:14px 18px;border-radius:16px;background:rgba(4,18,31,.9);border:1px solid #38bdf8;box-shadow:0 0 24px rgba(56,189,248,.5);color:#e0f2fe;font:600 16px system-ui;display:flex;gap:12px;align-items:center;transform:scale(.6);opacity:0;transition:all .25s';
    el.innerHTML = `<span style="font-size:38px">${icone}</span><span>${esc(texte)}</span>`;
    document.body.appendChild(el); requestAnimationFrame(() => { el.style.transform = 'scale(1)'; el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 1600);
  }
  async function gestesOn(on) {
    if (!on) { if (gestes) gestes.stop = true; gestes = null; return say('Gestes désactivés.'); }
    if (gestes) return say('Les gestes sont déjà actifs.');
    if (!(await camera())) return say("Il me faut ma caméra pour voir tes gestes.");
    gestes = { stop: false }; const g = gestes;
    showBoard(panneau('CONTRÔLE GESTUEL · ACTIF', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:15px">${Object.values(GESTES).map(([i, t]) => `<div style="padding:8px;border:1px solid #1e6a8a;border-radius:10px"><span style="font-size:26px">${i}</span> ${esc(t)}</div>`).join('')}</div>`), 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 20000);
    (async () => {
      let der = '', compte = 0, apres = 0;
      while (!g.stop) {
        let h = []; try { h = await VISION.hands(); } catch (e) { h = []; }
        const x = h.find(m => m.score > 0.6 && GESTES[m.gesture]);
        const k = x ? x.gesture : '';
        if (k && k === der) compte++; else { der = k; compte = k ? 1 : 0; }
        if (k && compte === 3 && Date.now() > apres) { apres = Date.now() + 1800; const [i, t, f] = GESTES[k]; bulle(i, t); jingle('tic'); f().catch(() => {}); }
        await wait(220);
      }
    })();
    return say('Contrôle gestuel activé. Main ouverte : pause. Deux doigts : morceau suivant. Pouce levé ou baissé : le volume. Poing fermé : j\'éteins la pièce.');
  }

  /* ---------- le jeu télévisé ---------- */
  const COULEURS = ['#3b82f6', '#f97316', '#22c55e', '#e11d48'];
  async function versShadow(msg) { try { await appel('/maison/canal/shadow', Object.assign({ de: 'atlas' }, msg), 8000); } catch (e) { /* tant pis */ } }
  async function jeu(t, n) {
    if (!AI.ready()) return say("Pour le jeu, il me faut mon cerveau en ligne.");
    // Shadow, co-animateur s'il est réveillé
    let shadow = false;
    try { DUO.vide(); await versShadow({ type: 'duo-pret' }); shadow = !!(await DUO.attends('duo-ok', 6000)); } catch (e) { shadow = false; }
    if (shadow) await versShadow({ type: 'duo-debut' });
    const reaction = async (bonne, nom) => {
      if (!shadow) return;
      const l = bonne ? [`Bip bip ! Bravo ${nom} !`, 'Wouhou ! Mes circuits applaudissent !', `${nom}, tu es un génie !`, 'Bonne réponse ! Bip bip bip !'] : ['Oh non ! Même mon grille-pain le savait !', 'Bip… raté ! La prochaine sera la bonne !', 'Aïe aïe aïe ! Courage !'];
      await versShadow({ type: 'replique', texte: pick(l), id: String(Date.now()) }); await DUO.attends('replique-ok', 9000);
    };
    try {
      let salon = []; try { salon = ((await appel('/maison/appareils', null, 10000)).appareils || []).filter(a => a.type === 'lampe' && /\bsalon\b/.test(N(a.nom))).map(a => a.id); } catch (e) { salon = []; }
      const flash = async l => { if (!salon.length) return; for (const v of l) { regle(salon, true, v, 100).catch(() => {}); await wait(260); } };
      jingle('generique'); flash([100, 20, 100, 20, 80]);
      showBoard(panneau('LE GRAND JEU DE LA MAISON', '<div style="font:800 clamp(30px,6vw,60px) system-ui;text-align:center;padding:24px 0;background:linear-gradient(90deg,#fbbf24,#f472b6,#38bdf8);-webkit-background-clip:text;color:transparent">LE GRAND JEU</div>', '#fbbf24'), 'graphe-board');
      clearTimeout(effaceT);
      await say(`Mesdames et messieurs, bonsoir, et bienvenue dans… le Grand Jeu de la maison ! Je suis Atlas, votre présentateur${shadow ? ', et voici mon co-animateur… Shadow !' : '.'}`);
      if (shadow) { await versShadow({ type: 'replique', texte: 'Bip bip ! Bonsoir tout le monde ! Que le meilleur gagne !', id: 'h' }); await DUO.attends('replique-ok', 9000); }
      // les joueurs
      const VIDE = /^(bonjour|bonsoir|salut|merci|oui|non|atlas|moi|toi|nous|lui|elle|on|est|la|le|les|et|avec|joue|jouent|c|ca|aussi|y|a|il|ya|ma|mon|papa|maman)$/i;
      const rep = await ask('Qui joue ce soir ? Dites vos prénoms.', { wait: 15000 });
      let noms = [...new Set(String(rep || '').replace(/\b(je m['’]appelle|je suis|moi c['’]est|c['’]est|on est|il y a)\b/gi, ' ').split(/[\s,.;!?]+/).map(x => x.replace(/[^A-Za-zÀ-ÿ-]/g, '')).filter(x => x.length >= 2 && !VIDE.test(N(x))))].slice(0, 6).map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase());
      if (/\bpapa\b|\bmoi\b/.test(N(rep || '')) && S.nom && !noms.some(x => pareil(x, S.nom))) noms.unshift(S.nom);
      if (!noms.length) noms = [S.nom || 'Papa'].concat(enfant() ? [enfant()] : []);
      const joueurs = noms.map(x => ({ nom: x, enfant: !!enfant() && pareil(x, enfant()), score: 0 }));
      await say(`Ce soir, sur le plateau : ${joueurs.map(j => j.nom).join(', ')} ! Deux manches, puis la grande finale. Répondez par A, B, C ou D.`);
      // les questions (adaptées à chacun)
      let qs = [];
      try {
        const raw = String(await AI.chat([{ role: 'system', content: 'Tu écris les questions d\'un jeu télévisé familial, en français. Réponds UNIQUEMENT en JSON : {"questions":[{"joueur":"…","q":"…","choix":["…","…","…","…"],"bonne":0}]}. Pour un enfant : très facile et amusante (animaux, dessins animés, nature, corps humain, espace). Pour un adulte : culture générale de difficulté moyenne. Réponses exactes et sûres, choix courts, une seule bonne réponse, la bonne réponse placée au hasard.' }, { role: 'user', content: `Joueurs : ${joueurs.map(j => `${j.nom} (${j.enfant ? 'enfant' : 'adulte'})`).join(', ')}. Écris 3 questions par joueur (deux manches et la finale), dans l'ordre des joueurs.` }], { maxTokens: 1800, temperature: 0.9 }) || '');
        qs = (JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).questions || []).filter(q => q && q.q && Array.isArray(q.choix) && q.choix.length === 4 && q.bonne >= 0 && q.bonne < 4);
      } catch (e) { qs = []; }
      if (qs.length < joueurs.length) return say("Les questions se sont perdues dans les coulisses. On rejoue dans un instant ?");
      const pour = j => { const i = qs.findIndex(q => pareil(q.joueur, j.nom)); return i >= 0 ? qs.splice(i, 1)[0] : qs.shift(); };
      const tableau = (q, j, manche, rev) => {
        showBoard(panneau(`${manche} · ${j.nom.toUpperCase()}`, `<div style="font:600 clamp(20px,3.4vw,34px)/1.3 system-ui;color:#f0f9ff;margin:6px 0 12px">${esc(q.q)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${q.choix.map((c, i) => `<div style="padding:12px;border-radius:12px;font:600 clamp(15px,2.2vw,22px) system-ui;background:${rev == null ? COULEURS[i] + '33' : i === q.bonne ? '#16a34a' : i === rev ? '#b91c1c' : '#1e293b'};border:2px solid ${COULEURS[i]}">${'ABCD'[i]} · ${esc(c)}</div>`).join('')}</div>
          <div style="margin-top:12px;display:flex;gap:14px;flex-wrap:wrap;font-size:14px">${joueurs.map(x => `<span style="color:${x === j ? '#fbbf24' : '#93c5fd'}">${esc(x.nom)} : ${x.score}</span>`).join('')}</div>`, '#fbbf24'), 'graphe-board');
        clearTimeout(effaceT);
      };
      const lit = (a, q) => { const m = N(a); const l = (m.match(/\b(a|b|c|d)\b/) || [])[1]; if (l) return 'abcd'.indexOf(l); const k = ['un', 'deux', 'trois', 'quatre'].findIndex(w => new RegExp(`\\b${w}\\b`).test(m)); if (k >= 0) return k; return q.choix.findIndex(c => N(c).length > 2 && m.includes(N(c))); };
      const manche = async (titre, points) => {
        jingle('generique'); await say(titre);
        for (const j of joueurs) {
          const q = pour(j); if (!q) continue;
          tableau(q, j, titre.toUpperCase());
          let r = -1;
          for (let essai = 0; essai < 2 && r < 0; essai++) { const a = await ask(essai ? 'A, B, C ou D ?' : `${j.nom}, à vous. ${q.q} ${q.choix.map((c, i) => `${'ABCD'[i]} : ${c}`).join('. ')}.`, { wait: 20000 }); r = lit(a || '', q); }
          tableau(q, j, titre.toUpperCase(), r);
          if (r === q.bonne) { j.score += points; jingle('bonne'); flash([100, 40, 100]); await say(pick([`Bonne réponse ! ${points} point${points > 1 ? 's' : ''} pour ${j.nom}.`, `Exact ! Bravo ${j.nom} !`])); await reaction(true, j.nom); }
          else { jingle('fausse'); await say(`${r < 0 ? 'Le temps est écoulé' : 'Dommage'} ! La bonne réponse était ${'ABCD'[q.bonne]} : ${q.choix[q.bonne]}.`); await reaction(false, j.nom); }
          await wait(600);
        }
        await say(`Les scores : ${joueurs.map(j => `${j.nom}, ${j.score}`).join(' ; ')}.`);
      };
      await manche('Première manche', 1);
      await manche('Deuxième manche', 1);
      await manche('La grande finale ! Chaque bonne réponse vaut deux points', 2);
      const max = Math.max(...joueurs.map(j => j.score)), gagnants = joueurs.filter(j => j.score === max);
      jingle('champion'); flash([100, 20, 100, 20, 100, 20, 100]);
      try { DUO._holo({ titre: gagnants.map(j => j.nom).join(' & '), sous: gagnants.length > 1 ? 'CHAMPIONS EX ÆQUO' : 'CHAMPION DE LA SOIRÉE', couleur: '#fbbf24', lignes: joueurs.slice().sort((a, b) => b.score - a.score).map(j => [j.nom, `${j.score} pt${j.score > 1 ? 's' : ''}`]) }); } catch (e) { /* pas d'écran */ }
      await wait(2600);
      if (shadow) { await versShadow({ type: 'replique', texte: `Bip bip bip ! Bravo ${gagnants.map(j => j.nom).join(' et ')} ! Tout le monde applaudit !`, id: 'f' }); await DUO.attends('replique-ok', 9000); }
      return say(`Et le champion de la soirée est… ${gagnants.map(j => j.nom).join(' et ')}, avec ${max} point${max > 1 ? 's' : ''} ! Bravo à tous. C'était le Grand Jeu de la maison. Bonne soirée !`);
    } finally { if (shadow) versShadow({ type: 'duo-fin' }); }
  }

  /* ---------- le traducteur universel ---------- */
  const LANGUES = { anglais: ['en', 'anglais'], espagnol: ['es', 'espagnol'], italien: ['it', 'italien'], allemand: ['de', 'allemand'], portugais: ['pt', 'portugais'], arabe: ['ar', 'arabe'], neerlandais: ['nl', 'néerlandais'], hollandais: ['nl', 'néerlandais'], polonais: ['pl', 'polonais'], roumain: ['ro', 'roumain'], turc: ['tr', 'turc'], russe: ['ru', 'russe'], chinois: ['zh', 'chinois'], japonais: ['ja', 'japonais'], ukrainien: ['uk', 'ukrainien'], grec: ['el', 'grec'] };
  async function traducteur(t, n) {
    if (!AI.ready()) return say("Pour traduire, il me faut mon cerveau en ligne.");
    const k = Object.keys(LANGUES).find(x => new RegExp(`\\b${x}\\b`).test(n));
    const [code, nom] = k ? LANGUES[k] : ['en', 'anglais'];
    const lignes = [];
    const ecran = () => { showBoard(panneau(`TRADUCTEUR UNIVERSEL · FRANÇAIS ⇄ ${nom.toUpperCase()}`, `<div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto">${lignes.slice(-8).map(l => `<div style="padding:8px 10px;border-radius:10px;border:1px solid ${l.fr ? '#38bdf8' : '#a78bfa'};background:${l.fr ? 'rgba(14,116,144,.2)' : 'rgba(91,33,182,.2)'}"><div style="font-size:13px;color:#93c5fd">${esc(l.de)}</div><div style="font:600 clamp(16px,2.6vw,24px) system-ui;color:#f0f9ff">${esc(l.vers)}</div></div>`).join('') || '<div style="color:#93c5fd">Parlez, chacun dans sa langue…</div>'}</div>`, '#a78bfa'), 'graphe-board'); clearTimeout(effaceT); };
    ecran(); sfx('demarrage');
    await say(`Traducteur universel activé : français et ${nom}. Parlez chacun dans votre langue, je traduis. Dites « fin de la traduction » pour arrêter.`);
    window.ATLAS_LANGUE = 'auto';
    let silence = 0;
    try {
      for (;;) {
        const a = await hear({ maxWait: 60000, prompt: 'Conversation entre deux personnes, en français et dans une autre langue.' });
        if (!a) { if (++silence >= 4) break; continue; }
        silence = 0;
        if (/\b(fin de la traduction|arrete (de traduire|la traduction)|stop traduction|end translation|stop translating)\b/.test(N(a))) break;
        let r = null;
        try {
          const raw = String(await AI.chat([{ role: 'system', content: `Tu es un interprète. Si le texte est en français, traduis-le en ${nom} ; sinon, traduis-le en français. Traduction naturelle, fidèle, sans commentaire. Réponds UNIQUEMENT en JSON : {"source":"fr" ou le code de la langue,"traduction":"…"}` }, { role: 'user', content: a }], { maxTokens: 400, temperature: 0.2 }) || '');
          r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
        } catch (e) { r = null; }
        if (!r || !r.traduction) continue;
        const fr = r.source === 'fr';
        lignes.push({ de: a, vers: r.traduction, fr }); ecran();
        await say(r.traduction);
      }
    } finally { window.ATLAS_LANGUE = ''; }
    setTimeout(cacheEcran, 30000);
    return say('Fin de la traduction.');
  }

  function route(t, n) {
    if (/\b(defi|duel|challenge)\b/.test(n) && MOTS_EXO.some(([re]) => re.test(n))) return () => defi(t, n);
    if ((/\b(coach|coache|entraine|entrainement|compte mes|on fait)\b/.test(n) && MOTS_EXO.some(([re]) => re.test(n))) || /\b(coach moi|mode coach|seance de sport)\b/.test(n) || /\b(\d+|une) (minutes?|secondes?) de (gainage|planche|pompes|squats|abdos)\b/.test(n)) return () => coach(t, n);
    if (/\b(desactive|arrete|coupe|stop)\b.*\bgestes?\b|\bfin des gestes\b/.test(n)) return () => gestesOn(false);
    if (/\b(active|lance|mode)\b.*\b(gestes?|gestuel|minority report)\b|\bcontrole gestuel\b/.test(n)) return () => gestesOn(true);
    if (/\b(jeu televise|grand jeu|lance le jeu|jeu de la maison|on fait un quiz|quiz televise)\b/.test(n) && !/\bshadow\b.*\bseul\b/.test(n)) return () => jeu(t, n);
    if (/\b(traduis|traduit|traducteur|traduction|interprete)\b/.test(n) && /\b(avec|pour|mode|universel|conversation|invite|lui|elle|eux)\b/.test(n) && !/\b(fin de la traduction)\b/.test(n)) return () => traducteur(t, n);
    return null;
  }
  return { route, gestesActifs: () => !!gestes };
})();

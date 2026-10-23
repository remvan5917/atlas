/* =========================================================
   LE JUMEAU HOLOGRAPHIQUE — la maison en 3D dans le cockpit
   - les pièces sont des volumes de verre ; elles s'allument comme les vraies lampes (la vraie intensité) ;
   - les caméras projettent leur cône de vision, avec leur dernière image qui flotte au bout ;
   - une détection = une onde qui part de la caméra ;
   - le curseur du temps : on fait glisser, et on revoit la journée (les lumières, les détections, les ordres, Shadow).
   Dessiné à la main sur un canevas (aucune bibliothèque) : léger pour la tablette. Lit les variables du cockpit
   (appareils, cams, urls, alertesRecentes, appel, bascule).
   ========================================================= */
'use strict';

const JUMEAU = (() => {
  const L = 10, D = 6, H = 2.6;              // la maison : 10 m de long (de la rue à la cour), 6 de profondeur, 2,6 m par étage
  const VU = /détection «|quelqu|personne|mouvement|bruit|véhicule|human|motion/i, PAS_VU = /activée|désactivée|hors ligne|en ligne|offline/i;
  let actif = false, cv = null, ctx = null, boite = null, W = 0, Hc = 0, dpr = 1;
  let yaw = -0.55, pitch = 0.5, auto = true, glisse = null, repriseAuto = 0, anime = 0, dernierT = 0;
  let donnees = null, chargeA = 0, curseur = null, lecture = false, scan = 0; // curseur : null = en direct ; sinon un instant (s)
  const images = {}, photosAl = {};
  let lastPs = []; // les pièces du dernier dessin (pour savoir laquelle on touche)
  try { actif = localStorage.getItem('cockpit-vue') === '3d'; } catch (e) { /* rien */ }

  /* ---------- la géométrie ---------- */
  const etage = a => /\b(chambres?|salle de bains?|premier etage|etage|bureau|grenier)\b/.test(N(a.nom));
  function pieces(T) {
    const lampes = appareils.filter(a => a.type === 'lampe');
    const niv = [lampes.filter(a => !etage(a)), lampes.filter(etage)];
    const l = [];
    niv.forEach((ls, k) => {
      const n = Math.max(1, ls.length), w = L / n;
      ls.forEach((a, i) => {
        const e = T == null ? { allume: a.allume, lum: a.lum, sur: true } : etatA(a, T);
        l.push({ a, x0: -L / 2 + i * w, x1: -L / 2 + (i + 1) * w, y0: k * H, y1: (k + 1) * H, ...e });
      });
      if (!ls.length) l.push({ a: null, x0: -L / 2, x1: L / 2, y0: k * H, y1: (k + 1) * H, allume: false });
    });
    return l;
  }
  // où est chaque caméra, et où elle regarde (comme sur le plan : la rue à gauche, la cour derrière à droite)
  function placeCam(c, ps) {
    const n = N(c.nom);
    if (/toit/.test(n)) { const p = ps.find(x => x.a && /papa/.test(N(x.a.nom))); return { p: [p ? (p.x0 + p.x1) / 2 : 0, 2 * H + 2.1, 0], d: [0.55, 0.55, 0.62] }; }
    if (/cour|jardin/.test(n)) return { p: [L / 2 + 0.15, 1.6, -1.2], d: [1, -0.25, 0.15] };
    if (/plateau/.test(n)) return { p: [L / 2 + 0.15, H + 1.6, 1.2], d: [1, -0.35, -0.1] };
    if (/facade|rue|portail/.test(n)) return { p: [-L / 2 - 0.15, H + 0.3, -1.4], d: [-1, -0.35, -0.2] };
    return { p: [0, 1.6, -D / 2 - 0.15], d: [0, -0.2, -1] };
  }

  /* ---------- la journée : l'état des lampes à un instant donné ---------- */
  function etatA(a, T) {
    const ev = donnees ? donnees.lumieres.filter(e => e.ids.includes(a.id)) : [];
    let avant = null, apres = null;
    for (const e of ev) { if (e.t <= T) avant = e; else { apres = e; break; } }
    if (avant) return { allume: avant.allume, lum: avant.allume ? avant.lum : null, sur: true };
    if (apres) return { allume: !apres.allume, lum: null, sur: false };
    return { allume: a.allume, lum: a.lum, sur: false };
  }
  const detections = (c, T) => {
    if (T == null) return alertesRecentes.filter(x => x.texte.includes(`« ${c.nom} »`) && Date.now() - x.at < 10 * 60000 && VU.test(x.texte) && !PAS_VU.test(x.texte));
    return (donnees ? donnees.cameras : []).filter(x => N(x.texte).includes(N(c.nom)) && Math.abs(x.t - T) < 8 * 60 && VU.test(x.texte) && !PAS_VU.test(x.texte)).map(x => Object.assign({}, x, { at: x.t * 1000 }));
  };
  async function charge(force) {
    if (!force && donnees && Date.now() - chargeA < 120000) return;
    chargeA = Date.now();
    try { donnees = await appel('/atlas/jumeau?heures=24'); donnees.lumieres.sort((a, b) => a.t - b.t); } catch (e) { /* on garde l'ancien */ }
    piste();
  }

  /* ---------- la projection 3D → écran ---------- */
  function proj(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let X = x * cy - z * sy, Z = x * sy + z * cy, Y = y - 3.1;
    const Y2 = Y * cp - Z * sp, Z2 = Y * sp + Z * cp;
    const dist = 17, f = Math.min(W * 0.85, Hc * 1.6), k = f / (dist + Z2);
    return [W / 2 + X * k, Hc * 0.5 - Y2 * k, Z2, k];
  }
  const ligne = (pts, col, lw = 1, ferme = false) => {
    ctx.beginPath(); pts.forEach((p, i) => { const q = proj(...p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    if (ferme) ctx.closePath(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  };
  const face = (pts, col) => { ctx.beginPath(); pts.forEach((p, i) => { const q = proj(...p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  function cube(x0, x1, y0, y1, z0, z1) {
    return { bas: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], haut: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] };
  }

  /* ---------- le dessin ---------- */
  function dessine(t) {
    if (!ctx) return;
    const T = curseur, ps = pieces(T); lastPs = ps;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hc);
    ctx.globalCompositeOperation = 'lighter'; // un hologramme : la lumière s'additionne, pas besoin de trier les faces
    // le sol : des anneaux et des rayons, et l'onde du scanner
    for (let r = 2; r <= 9; r += 1.75) { const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([Math.cos(a) * r, 0, Math.sin(a) * r * 0.8]); } ligne(pts, `rgba(95,211,255,${r > 8 ? 0.16 : 0.07})`); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ligne([[Math.cos(a) * 2, 0, Math.sin(a) * 1.6], [Math.cos(a) * 9, 0, Math.sin(a) * 7.2]], 'rgba(95,211,255,.05)'); }
    scan = (t / 2600) % 1; { const r = 1 + scan * 8, pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([Math.cos(a) * r, 0.01, Math.sin(a) * r * 0.8]); } ligne(pts, `rgba(95,211,255,${(0.35 * (1 - scan)).toFixed(3)})`, 1.5); }
    // les pièces
    for (const p of ps) {
      const c = cube(p.x0 + 0.06, p.x1 - 0.06, p.y0 + 0.04, p.y1 - 0.04, -D / 2, D / 2), on = !!p.allume, hs = p.a && p.allume == null;
      const lum = on ? (p.lum != null ? p.lum : 100) / 100 : 0;
      if (on) {
        const al = (0.05 + lum * 0.13) * (p.sur ? 1 : 0.6);
        face(c.bas, `rgba(255,181,71,${(al * 1.6).toFixed(3)})`); face(c.haut, `rgba(255,181,71,${(al * 0.7).toFixed(3)})`);
        face([c.bas[0], c.bas[1], c.haut[1], c.haut[0]], `rgba(255,181,71,${al.toFixed(3)})`); face([c.bas[3], c.bas[2], c.haut[2], c.haut[3]], `rgba(255,181,71,${al.toFixed(3)})`);
        face([c.bas[0], c.bas[3], c.haut[3], c.haut[0]], `rgba(255,181,71,${al.toFixed(3)})`); face([c.bas[1], c.bas[2], c.haut[2], c.haut[1]], `rgba(255,181,71,${al.toFixed(3)})`);
      } else face(c.bas, 'rgba(95,211,255,.035)');
      const col = hs ? 'rgba(255,107,74,.6)' : on ? `rgba(255,190,90,${(0.55 + lum * 0.4).toFixed(2)})` : 'rgba(95,211,255,.32)';
      ctx.shadowColor = on ? '#ffb547' : '#5fd3ff'; ctx.shadowBlur = on ? 14 : 4;
      ligne(c.bas, col, on ? 1.6 : 1, true); ligne(c.haut, col, on ? 1.6 : 1, true);
      for (let i = 0; i < 4; i++) ligne([c.bas[i], c.haut[i]], col, on ? 1.4 : 1);
      ctx.shadowBlur = 0;
      p.centre = proj((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0);
      p.coins = c.bas.concat(c.haut).map(q => proj(...q));
    }
    // le toit (deux pans) et l'arête
    const toit = 2 * H, faite = 2 * H + 1.9;
    ligne([[-L / 2, toit, -D / 2], [-L / 2, faite, 0], [-L / 2, toit, D / 2]], 'rgba(95,211,255,.45)', 1.2);
    ligne([[L / 2, toit, -D / 2], [L / 2, faite, 0], [L / 2, toit, D / 2]], 'rgba(95,211,255,.45)', 1.2);
    ligne([[-L / 2, faite, 0], [L / 2, faite, 0]], 'rgba(95,211,255,.55)', 1.4);
    face([[-L / 2, toit, -D / 2], [L / 2, toit, -D / 2], [L / 2, faite, 0], [-L / 2, faite, 0]], 'rgba(95,211,255,.025)');
    face([[-L / 2, toit, D / 2], [L / 2, toit, D / 2], [L / 2, faite, 0], [-L / 2, faite, 0]], 'rgba(95,211,255,.025)');
    // les caméras : le cône de vision, la dernière image au bout, l'onde quand elle voit quelqu'un
    for (const c of cams) {
      const { p, d } = placeCam(c, ps), det = detections(c, T), vue = det.length > 0, hors = !c.en_ligne;
      const n = Math.hypot(...d), u = d.map(v => v / n), lg = 3.6;
      const bout = p.map((v, i) => v + u[i] * lg);
      // deux vecteurs perpendiculaires (la base du cône)
      let a1 = [u[1], -u[0], 0]; if (Math.hypot(...a1) < 0.1) a1 = [0, u[2], -u[1]];
      const na = Math.hypot(...a1); a1 = a1.map(v => v / na);
      const a2 = [u[1] * a1[2] - u[2] * a1[1], u[2] * a1[0] - u[0] * a1[2], u[0] * a1[1] - u[1] * a1[0]];
      const r1 = 1.9, r2 = 1.25, base = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s1, s2]) => bout.map((v, i) => v + a1[i] * r1 * s1 + a2[i] * r2 * s2));
      const col = hors ? '255,107,74' : vue ? '255,107,74' : (typeof arme === 'function' && arme(c)) ? '110,240,184' : '95,211,255';
      const clig = vue ? 0.5 + 0.5 * Math.sin(t / 140) : 1;
      base.forEach(b => ligne([p, b], `rgba(${col},${(0.22 * clig + 0.08).toFixed(3)})`));
      ligne(base, `rgba(${col},${(0.4 * clig + 0.1).toFixed(3)})`, 1.2, true);
      if (vue) face([p, base[0], base[1]], `rgba(${col},${(0.06 * clig).toFixed(3)})`), face([p, base[2], base[3]], `rgba(${col},${(0.06 * clig).toFixed(3)})`);
      const q = proj(...p);
      ctx.beginPath(); ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2); ctx.fillStyle = `rgb(${col})`; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      if (vue) { const ph = (t / 1400) % 1; ctx.beginPath(); ctx.arc(q[0], q[1], 6 + ph * 30, 0, Math.PI * 2); ctx.strokeStyle = `rgba(${col},${(1 - ph).toFixed(2)})`; ctx.lineWidth = 2; ctx.stroke(); }
      // ce qu'elle voit : en direct sa dernière image ; dans le passé, la photo de la détection (si elle en a gardé une)
      const img = imageDe(c, T, det);
      const qb = proj(...bout), taille = Math.max(46, Math.min(120, qb[3] * 2.3));
      if (img && img.complete && img.naturalWidth) {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.82;
        const w = taille * 1.6, h = taille;
        ctx.drawImage(img, qb[0] - w / 2, qb[1] - h / 2, w, h);
        ctx.globalAlpha = 1; ctx.strokeStyle = `rgba(${col},.8)`; ctx.lineWidth = 1; ctx.strokeRect(qb[0] - w / 2, qb[1] - h / 2, w, h);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = qb[1] - h / 2; y < qb[1] + h / 2; y += 3) ctx.fillRect(qb[0] - w / 2, y, w, 1); // les lignes d'un hologramme
        ctx.globalCompositeOperation = 'lighter';
      }
      texte(c.nom.toUpperCase() + (hors ? ' · HORS LIGNE' : vue ? ' · DÉTECTION' : ''), q[0], q[1] - 12, `rgba(${col},.95)`, 10);
    }
    // les noms des pièces
    ctx.globalCompositeOperation = 'source-over';
    for (const p of ps) if (p.a) { const lg = Math.hypot(p.coins[1][0] - p.coins[0][0], p.coins[1][1] - p.coins[0][1]); texte(p.a.nom.toUpperCase(), p.centre[0], p.centre[1] + 4, p.allume ? '#fff4e0' : 'rgba(238,243,248,.62)', W > 700 ? 11 : 9.5, p.allume ? (p.lum != null ? `${p.lum} %` : 'ALLUMÉE') + (p.sur ? '' : ' ?') : p.a.allume == null && T == null ? 'SANS COURANT' : '', lg * 0.95); }
    entete(T);
  }
  function texte(t, x, y, col, taille, sous, large) {
    ctx.font = `${taille}px ui-monospace, 'DejaVu Sans Mono', monospace`; ctx.textAlign = 'center'; ctx.fillStyle = col;
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4;
    // un nom trop long pour la pièce : sur deux lignes
    const mots = String(t).split(' '); let l1 = t, l2 = '';
    if (large && ctx.measureText(t).width > large && mots.length > 1) { const m = Math.ceil(mots.length / 2); l1 = mots.slice(0, m).join(' '); l2 = mots.slice(m).join(' '); }
    ctx.fillText(l1, x, l2 ? y - taille * 0.55 : y); if (l2) ctx.fillText(l2, x, y + taille * 0.55);
    if (sous) { ctx.font = `${taille - 2}px ui-monospace, monospace`; ctx.fillStyle = 'rgba(255,217,160,.85)'; ctx.fillText(sous, x, y + taille * (l2 ? 1.7 : 1) + 2); }
    ctx.shadowBlur = 0;
  }
  function entete(T) {
    ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(95,211,255,.55)';
    ctx.fillText(T == null ? '● JUMEAU · EN DIRECT' : '◷ JUMEAU · RELECTURE', 10, 16);
    ctx.textAlign = 'right'; ctx.fillText('LA RUE ◂            ▸ LA COUR', W - 10, 16);
  }
  function imageDe(c, T, det) {
    if (T == null) {
      const u = urls[c.nom]; if (!u) return null;
      if (!images[c.nom] || images[c.nom]._u !== u) { const im = new Image(); im._u = u; im.src = u; images[c.nom] = im; }
      return images[c.nom];
    }
    const a = det.find(x => x.image);
    if (!a) return null;
    if (!photosAl[a.id]) { photosAl[a.id] = new Image(); appel(`/maison/alerte/image?id=${a.id}`).then(b => { if (b instanceof Blob) photosAl[a.id].src = URL.createObjectURL(b); }).catch(() => {}); }
    return photosAl[a.id];
  }

  /* ---------- la boucle ---------- */
  function boucle(t) {
    anime = 0;
    if (!actif || document.hidden || !cv || !cv.isConnected) return;
    const dt = Math.min(100, t - (dernierT || t)); dernierT = t;
    if (auto && !glisse && Date.now() > repriseAuto) yaw += dt * 0.00011; // un tour toutes les minutes environ
    if (lecture && curseur != null && donnees) { curseur += dt * 0.6; if (curseur >= donnees.maintenant) { curseur = null; lecture = false; } majCurseur(); } // une heure en 6 secondes
    dessine(t);
    anime = requestAnimationFrame(boucle);
  }
  const lance = () => { if (!anime && actif) anime = requestAnimationFrame(boucle); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { dernierT = 0; lance(); } });

  /* ---------- le curseur du temps ---------- */
  const fmt = s => { const d = new Date(s * 1000), auj = new Date().toDateString() === d.toDateString(); return `${auj ? "AUJOURD'HUI" : 'HIER'} ${hh(d)}`; };
  function majCurseur() {
    const r = boite.querySelector('#j-temps'), lab = boite.querySelector('#j-lab'), dir = boite.querySelector('#j-direct'), fil = boite.querySelector('#j-fil');
    if (!r || !donnees) return;
    const v = curseur == null ? donnees.maintenant : curseur;
    r.value = String(Math.round(((v - donnees.depuis) / (donnees.maintenant - donnees.depuis)) * 1000));
    lab.textContent = curseur == null ? 'EN DIRECT' : fmt(curseur);
    dir.classList.toggle('on', curseur == null);
    boite.querySelector('#j-play').textContent = lecture ? '❚❚' : '▶';
    // ce qui s'est passé autour de ce moment
    if (curseur == null) { fil.textContent = 'FAIS GLISSER LE CURSEUR POUR REVOIR LA JOURNÉE'; return; }
    const ev = [];
    donnees.lumieres.forEach(e => { if (Math.abs(e.t - curseur) < 15 * 60) { const noms = e.ids.map(id => (appareils.find(a => a.id === id) || {}).nom).filter(Boolean).join(', '); if (noms) ev.push([e.t, `${noms} ${e.allume ? 'allumé' : 'éteint'}${e.par ? ` (${e.par.split(' · ')[0]})` : ''}`]); } });
    donnees.cameras.forEach(e => { if (Math.abs(e.t - curseur) < 15 * 60) ev.push([e.t, propre(e.texte)]); });
    donnees.ordres.forEach(e => { if (Math.abs(e.t - curseur) < 15 * 60) ev.push([e.t, `« ${e.phrase} »`]); });
    donnees.shadow.forEach(e => { if (Math.abs(e.t - curseur) < 15 * 60) ev.push([e.t, `Shadow : ${e.type}`]); });
    ev.sort((a, b) => Math.abs(a[0] - curseur) - Math.abs(b[0] - curseur));
    fil.textContent = ev.length ? ev.slice(0, 2).sort((a, b) => a[0] - b[0]).map(([t, x]) => `${hh(new Date(t * 1000))}  ${x}`).join('   ·   ') : 'RIEN DE NOTÉ À CE MOMENT-LÀ';
  }
  // les repères sur la piste : ambre = lumières, rouge = détections, cyan = ordres, violet = Shadow
  function piste() {
    const c = boite && boite.querySelector('#j-piste'); if (!c || !donnees) return;
    const w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
    const x = t => ((t - donnees.depuis) / (donnees.maintenant - donnees.depuis)) * w;
    const tr = (l, col, y0, y1) => { g.fillStyle = col; l.forEach(e => { if (e.t >= donnees.depuis) g.fillRect(x(e.t), y0, 1.5, y1 - y0); }); };
    tr(donnees.lumieres, 'rgba(255,181,71,.8)', 2, h * 0.45);
    tr(donnees.cameras.filter(e => VU.test(e.texte) && !PAS_VU.test(e.texte)), 'rgba(255,107,74,.95)', h * 0.5, h - 2);
    tr(donnees.ordres, 'rgba(95,211,255,.8)', h * 0.3, h * 0.7);
    tr(donnees.shadow, 'rgba(180,140,255,.85)', h * 0.15, h * 0.55);
    g.fillStyle = 'rgba(95,211,255,.35)'; // les heures
    for (let t = Math.ceil(donnees.depuis / 3600) * 3600; t < donnees.maintenant; t += 3600) { const hr = new Date(t * 1000).getHours(); g.fillRect(x(t), h - (hr % 6 ? 3 : 7), 1, hr % 6 ? 3 : 7); }
  }

  /* ---------- l'interface ---------- */
  const CSS = `#jumeau { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
    #jumeau canvas.j3d { flex: 1; min-height: 0; width: 100%; touch-action: none; cursor: grab; }
    .j-barre { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; margin-top: 6px; }
    .j-barre button { font: 600 10px ui-monospace, monospace; letter-spacing: .14em; color: var(--cyan); background: rgba(95,211,255,.06); border: 1px solid var(--ligne); border-radius: 4px; padding: 6px 9px; cursor: pointer; }
    .j-barre button.on { color: var(--ok); border-color: rgba(110,240,184,.5); }
    .j-rail { position: relative; height: 30px; } .j-rail canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .j-rail input { position: absolute; inset: 0; width: 100%; margin: 0; opacity: 1; background: transparent; -webkit-appearance: none; appearance: none; }
    .j-rail input::-webkit-slider-runnable-track { height: 30px; background: linear-gradient(transparent 14px, rgba(95,211,255,.18) 14px 16px, transparent 16px); }
    .j-rail input::-webkit-slider-thumb { -webkit-appearance: none; width: 4px; height: 30px; background: var(--ambre); box-shadow: 0 0 10px var(--ambre); }
    .j-rail input::-moz-range-thumb { width: 4px; height: 30px; border: 0; border-radius: 0; background: var(--ambre); box-shadow: 0 0 10px var(--ambre); }
    .j-rail input::-moz-range-track { height: 2px; background: rgba(95,211,255,.18); }
    #j-lab { font: 600 11px ui-monospace, monospace; letter-spacing: .14em; color: var(--ambre2); min-width: 128px; text-align: right; }
    #j-fil { font: 10.5px ui-monospace, monospace; letter-spacing: .06em; color: var(--doux); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 14px; }
    button.vue { font: 600 9.5px ui-monospace, monospace; letter-spacing: .18em; color: var(--ambre); background: rgba(255,181,71,.07); border: 1px solid var(--ligneA); border-radius: 4px; padding: 4px 8px; cursor: pointer; }`;
  function monte(el) {
    if (!document.getElementById('j-css')) { const st = document.createElement('style'); st.id = 'j-css'; st.textContent = CSS; document.head.appendChild(st); }
    el.innerHTML = `<div id="jumeau"><canvas class="j3d"></canvas>
      <div class="j-barre"><button id="j-play" title="Rejouer la journée">▶</button>
        <div class="j-rail"><canvas id="j-piste"></canvas><input id="j-temps" type="range" min="0" max="1000" value="1000" aria-label="Revoir la journée"></div>
        <span id="j-lab">EN DIRECT</span><button id="j-direct" class="on">DIRECT</button></div>
      <div id="j-fil"></div></div>`;
    boite = el.querySelector('#jumeau'); cv = boite.querySelector('canvas.j3d'); ctx = cv.getContext('2d');
    const taille = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; Hc = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr); piste(); };
    new ResizeObserver(taille).observe(cv); taille();
    // la faire tourner du doigt ; toucher une pièce (en direct) : l'allumer ou l'éteindre
    cv.addEventListener('pointerdown', e => { glisse = { x: e.clientX, y: e.clientY, yaw, pitch, bouge: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!glisse) return;
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) glisse.bouge = true;
      yaw = glisse.yaw + dx * 0.008; pitch = Math.max(0.12, Math.min(1.1, glisse.pitch + dy * 0.004));
    });
    cv.addEventListener('pointerup', e => {
      const g = glisse; glisse = null; repriseAuto = Date.now() + 8000;
      if (!g || g.bouge || curseur != null) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let mieux = null, aire = Infinity;
      for (const p of lastPs) { if (!p.a || !p.coins) continue; const xs = p.coins.map(c => c[0]), ys = p.coins.map(c => c[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && (x1 - x0) * (y1 - y0) < aire) { aire = (x1 - x0) * (y1 - y0); mieux = p; } }
      if (mieux) bascule(mieux.a.id);
    });
    const r = boite.querySelector('#j-temps');
    r.addEventListener('input', () => { if (!donnees) return; lecture = false; const v = donnees.depuis + (+r.value / 1000) * (donnees.maintenant - donnees.depuis); curseur = +r.value >= 998 ? null : v; majCurseur(); });
    boite.querySelector('#j-direct').onclick = () => { curseur = null; lecture = false; charge(true); majCurseur(); };
    boite.querySelector('#j-play').onclick = () => {
      if (!donnees) return;
      if (lecture) { lecture = false; majCurseur(); return; }
      if (curseur == null) curseur = Math.max(donnees.depuis, donnees.maintenant - 12 * 3600); // relancer : les 12 dernières heures
      lecture = true; majCurseur();
    };
    charge(true).then(majCurseur);
  }
  function maj() {
    const el = document.getElementById('plan'); if (!el) return;
    if (!boite || !boite.isConnected) monte(el);
    charge(false); lance();
  }
  function bascule3d(on) {
    actif = on; try { localStorage.setItem('cockpit-vue', on ? '3d' : '2d'); } catch (e) { /* rien */ }
    const b = document.getElementById('vue3d'); if (b) b.textContent = on ? 'PLAN 2D' : 'JUMEAU 3D';
    const el = document.getElementById('plan'); if (el) { el._svg = ''; el.innerHTML = ''; }
    boite = null; cv = null; ctx = null;
    if (on) maj(); else if (typeof plan === 'function') plan();
  }
  return { actif: () => actif, maj, bascule: bascule3d, rejoue: h => { if (!donnees) return; curseur = donnees.maintenant - (h || 12) * 3600; lecture = true; majCurseur(); } };
})();

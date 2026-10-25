/* =========================================================
   LE JUMEAU HOLOGRAPHIQUE — la maison en 3D dans le cockpit
   - la maison naît sous tes yeux (les étages montent du sol, les arêtes se tracent) ;
   - chaque pièce s'allume comme la vraie lampe (sa vraie intensité, en fondu) : un halo, des fenêtres qui brillent,
     la lumière qui déborde sur le sol ; un scanner balaie les étages ;
   - au-dessus du toit, le cœur d'Atlas (il pulse quand Atlas parle), relié à la maison par des flux de données ;
   - les caméras projettent leur cône et leur dernière image ; quelqu'un de vu = un hologramme de personne, rouge ;
   - les habitants en hologramme : papa là où il utilise Atlas, son fils quand Shadow le voit ;
   - Shadow, en violet, dans la chambre du petit quand il est en ligne ;
   - le ciel et la météo de la ville, vrais, à l'heure affichée (même en relecture) : nuit étoilée, soleil, lune,
     pluie, neige, orage, brouillard ;
   - le curseur du temps : on revoit la journée, et les événements surgissent là où ils ont eu lieu.
   Dessiné à la main sur un canevas (aucune bibliothèque), limité à 30 images par seconde : léger pour la tablette.
   Lit les variables du cockpit (appareils, cams, urls, alertesRecentes, diag, absent, appel, bascule, reglages).
   ========================================================= */
'use strict';

const JUMEAU = (() => {
  // la maison, d'après le plan dessiné par papa : une maison de ville tout en longueur, de la rue (x < 0) à la cour (x > 0),
  // trois niveaux (rez-de-chaussée, 1er, 2e), un toit à deux pans avec un velux, la cour derrière et le plateau au niveau du 1er
  const L = 10, D = 5, H = 2.6, TOIT = 3 * H, FAITE = TOIT + 1.9, COUR = 3.6, CX = 1.7, ECART = 0.55, CYV = 4.7 + 1.5 * 0.55, MANS = 1.4; // MANS : la mansarde (le mur du 2e côté cour, en pente)
  // la vue éclatée : chaque niveau est séparé du suivant par un petit vide (sinon les étages transparents se mélangent)
  const niveauDe = y => clamp(Math.floor((y + 1e-6) / H), 0, 3);
  const VU = /détection «|quelqu|personne|mouvement|bruit|véhicule|human|motion/i, PAS_VU = /activée|désactivée|hors ligne|en ligne|offline/i;
  const CY = '95,211,255', AM = '255,181,71', RO = '255,107,74', VE = '110,240,184', VI = '180,140,255';
  let actif = false, cv = null, ctx = null, boite = null, W = 0, Hc = 0, dpr = 1;
  let yaw = 0.5, pitch = 0.36, zoom = 1, base = 0.5, phase = 0, vyaw = 0, glisse = null, repriseAuto = 0, anime = 0, dernierT = 0, dernierDessin = 0, naissance = 0;
  let donnees = null, chargeA = 0, curseur = null, lecture = false, precedent = null; // curseur : null = en direct ; sinon un instant (s)
  let meteo = null, meteoA = 0, eclair = 0;
  const images = {}, photosAl = {}, etats = new Map(), cartes = [], doigts = new Map();
  let lastPs = []; // les pièces du dernier dessin (pour savoir laquelle on touche)
  try { actif = localStorage.getItem('cockpit-vue') === '3d'; } catch (e) { /* rien */ }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const alea = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const ETOILES = Array.from({ length: 90 }, () => [alea(), alea() * 0.62, 0.3 + alea() * 0.7, alea() * 6.28]);
  const MOTES = Array.from({ length: 46 }, () => ({ x: (alea() - 0.5) * 16, y: alea() * 9, z: (alea() - 0.5) * 12, v: 0.2 + alea() * 0.5 }));
  const GOUTTES = Array.from({ length: 110 }, () => ({ x: (alea() - 0.5) * 22, y: alea() * 14, z: (alea() - 0.5) * 18, v: 0.7 + alea() * 0.6 }));

  /* ---------- la géométrie ---------- */
  const PLAN = [ // [motif du nom, niveau, x0, x1, z0, z1, genre]
    [/cuisine/, 0, -5, -1.7, -2.5, 2.5], [/lingerie|buanderie/, 0, -1.7, 1.3, -2.5, 2.5], [/salon|sejour/, 0, 1.3, 5, -2.5, 2.5],
    [/escalier (premier|1er|du 1er|etage)|escalier.*etage/, 1, 1.4, 4.7, -2.5, -1.5, 'escalier'], [/escalier/, 0, -1.6, 1.6, -2.5, -1.5, 'escalier'], // le long du mur gauche : au milieu (vers le 1er), côté cour (vers le 2e)
    [/toilettes?|wc/, 1, -1.0, 1.2, 0.6, 2.5], [/salle de bains?|salle d eau/, 1, 3.0, 5, 0.6, 2.5], [/chambre papa|chambre de papa|parents/, 2, -5, 5, -2.5, 2.5, 'mansarde'],
    [/chambre/, 1, -5, -1.0, -2.5, 2.5], // l'autre chambre : celle du petit, au 1er, côté rue, sur toute la largeur
  ];
  // les pièces sans lampe connectée (on les dessine quand même, éteintes) : les toilettes, entre la chambre du petit et la salle de bain
  const SANS_LAMPE = [['TOILETTES', /toilettes?|wc/, 1, -1.0, 1.2, 0.6, 2.5]];
  function pieces(T) {
    const lampes = appareils.filter(a => a.type === 'lampe'), l = [], pris = new Set(), libres = [];
    for (const a of lampes) {
      const n = N(a.nom), r = PLAN.find(x => x[0].test(n) && !(x[6] !== 'escalier' && /escalier/.test(n)) && !pris.has(x));
      const e = T == null ? { allume: a.allume, lum: a.lum, sur: true } : etatA(a, T);
      if (!r) { libres.push([a, e]); continue; }
      pris.add(r);
      l.push({ a, k: r[1], x0: r[2], x1: r[3], y0: r[1] * H, y1: (r[1] + 1) * H, z0: r[4], z1: r[5], genre: r[6] === 'escalier' ? 'escalier' : 'piece', mansarde: r[6] === 'mansarde', ...e });
    }
    // une lampe qu'on ne sait pas placer : sur le palier du 1er, côte à côte
    libres.forEach(([a, e], i) => { const w = 2.4 / libres.length; l.push({ a, k: 1, x0: -1.0 + i * w, x1: -1.0 + (i + 1) * w, y0: H, y1: 2 * H, z0: -1.3, z1: 0.5, genre: 'piece', ...e }); });
    for (const [nom, re, k, x0, x1, z0, z1] of SANS_LAMPE) if (!lampes.some(a => re.test(N(a.nom)))) l.push({ a: null, nomFixe: nom, k, x0, x1, y0: k * H, y1: (k + 1) * H, z0, z1, genre: 'piece', allume: false });
    return l;
  }
  // où est chaque caméra, et où elle regarde (d'après le plan de papa)
  function placeCam(c) {
    const n = N(c.nom);
    if (/toit/.test(n)) return { p: [-L / 2 + 0.1, TOIT + 0.25, -D / 2 + 0.2], d: [0.85, 0.12, 0.45] };      // l'angle avant du toit, tournée vers le velux
    if (/cour|jardin/.test(n)) return { p: [L / 2 + COUR - 0.1, 2.4, -D / 2 + 0.3], d: [-1, -0.45, 0.35] }; // au fond de la cour, elle regarde la maison
    if (/plateau/.test(n)) return { p: [L / 2 + 0.12, H + 1.2, 0.6], d: [1, -0.35, -0.05] };                // le mur arrière du 1er, au-dessus du plateau
    if (/facade|rue|portail/.test(n)) return { p: [-L / 2 - 0.12, H + 0.35, -1.7], d: [-1, -0.45, 0.2] }; // au 1er, juste au-dessus de la porte d'entrée
    return { p: [-L / 2 - 0.12, 1.6, 0], d: [-1, -0.2, 0] };
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
  // la vraie météo de la ville, heure par heure (hier et aujourd'hui), pour le ciel du jumeau
  async function chargeMeteo() {
    if (meteo && Date.now() - meteoA < 30 * 60000) return;
    meteoA = Date.now();
    const v = (typeof reglages !== 'undefined' && reglages.ville && reglages.ville.lat) ? reglages.ville : { lat: 50.63, lon: 3.06 };
    try {
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&hourly=temperature_2m,precipitation,weather_code,cloud_cover&daily=sunrise,sunset&timezone=auto&past_days=1&forecast_days=1&timeformat=unixtime`)).json();
      meteo = j;
    } catch (e) { /* le ciel reste calme */ }
  }
  function ciel(T) { // l'heure, le soleil, la pluie… à l'instant T (en secondes)
    const t = T == null ? Date.now() / 1000 : T, d = new Date(t * 1000), h = d.getHours() + d.getMinutes() / 60;
    let lever = 7.5, coucher = 19, pluie = 0, code = 0, temp = null, nuages = 30;
    if (meteo && meteo.hourly) {
      const hr = meteo.hourly, i = hr.time.findIndex((x, k) => x <= t && (hr.time[k + 1] || Infinity) > t);
      if (i >= 0) { pluie = hr.precipitation[i] || 0; code = hr.weather_code[i] || 0; temp = hr.temperature_2m[i]; nuages = hr.cloud_cover ? hr.cloud_cover[i] : 30; }
      const j = meteo.daily && meteo.daily.time ? meteo.daily.time.findIndex((x, k) => x <= t && (meteo.daily.time[k + 1] || Infinity) > t) : -1;
      if (j >= 0) { const l = new Date(meteo.daily.sunrise[j] * 1000), c = new Date(meteo.daily.sunset[j] * 1000); lever = l.getHours() + l.getMinutes() / 60; coucher = c.getHours() + c.getMinutes() / 60; }
    }
    const jour = h >= lever && h <= coucher;
    const neige = (code >= 71 && code <= 77) || code === 85 || code === 86, orage = code >= 95, brume = code === 45 || code === 48;
    const pluieF = neige ? 0 : clamp(pluie > 0 ? 0.25 + pluie / 3 : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? 0.3 : 0, 0, 1);
    return { h, d, lever, coucher, jour, pluie: pluieF, neige: neige ? 0.6 : 0, orage, brume, temp, nuages, code };
  }
  const LIBELLE = c => c >= 95 ? 'ORAGE' : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'NEIGE' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? 'PLUIE' : c === 45 || c === 48 ? 'BROUILLARD' : c >= 2 ? 'NUAGEUX' : 'DÉGAGÉ';

  /* ---------- la projection 3D → écran ---------- */
  // le cadrage automatique : à chaque image, la maison (avec la cour, le toit et le cœur d'Atlas) remplit le cadre,
  // en laissant la place du tableau de bord en haut et en bas ; en douceur (pas de saut quand elle tourne)
  let cy_ = 1, sy_ = 0, cp_ = 1, sp_ = 0, f_ = 0, ox_ = 0, oy_ = 0;
  const BOITE = []; // les vrais points de la maison : ses murs, le faîte, la cour et son plateau, le cœur d'Atlas, le bord de la rue
  for (const z of [-D / 2, D / 2]) {
    for (const x of [-L / 2, L / 2]) for (const y of [0, TOIT]) BOITE.push([x, y, z]);
    BOITE.push([0, FAITE, z], [L / 2 + COUR, 0, z], [L / 2 + COUR, H, z], [-L / 2 - 1.4, 0, z]);
  }
  BOITE.push([0, FAITE + 2.2, 0]);
  function brut(x, y, z) {
    z = -z; // l'écran est un repère « main gauche » : sans ça, la gauche du plan de papa sortait à droite (la maison en miroir)
    const xx = x - CX, X = xx * cy_ - z * sy_, Z = xx * sy_ + z * cy_, Y = y + niveauDe(y) * ECART - CYV;
    const Y2 = Y * cp_ - Z * sp_, Z2 = Y * sp_ + Z * cp_, k = 1 / (19 + Z2);
    return [X * k, -Y2 * k, Z2, k];
  }
  function prepare() {
    cy_ = Math.cos(yaw); sy_ = Math.sin(yaw); cp_ = Math.cos(pitch); sp_ = Math.sin(pitch);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of BOITE) { const q = brut(...b); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const petit = Hc < 330, haut = petit ? 22 : 44, bas = petit ? 24 : 50, f = Math.min((W * 0.92) / (x1 - x0), (Hc - haut - bas) / (y1 - y0)) * zoom;
    const ox = W / 2 - f * (x0 + x1) / 2, oy = haut + (Hc - haut - bas) / 2 - f * (y0 + y1) / 2;
    if (!f_ || glisse) { f_ = f; ox_ = ox; oy_ = oy; } else { f_ += (f - f_) * 0.12; ox_ += (ox - ox_) * 0.12; oy_ += (oy - oy_) * 0.12; }
  }
  function proj(x, y, z) { const q = brut(x, y, z); return [ox_ + q[0] * f_, oy_ + q[1] * f_, q[2], q[3] * f_]; }
  const prof = z => clamp(0.6 - z / 12, 0.2, 1); // le côté loin est plus pâle : la profondeur
  // un trait lumineux : un halo large et doux, puis le trait fin (sans shadowBlur, trop lent sur tablette)
  function trait(a, b, rgb, al, lw = 1, halo = false) {
    const p = proj(...a), q = proj(...b), f = prof((p[2] + q[2]) / 2) * al;
    if (f < 0.01) return;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    if (halo) { ctx.strokeStyle = `rgba(${rgb},${(f * 0.16).toFixed(3)})`; ctx.lineWidth = lw * 5; ctx.stroke(); }
    ctx.strokeStyle = `rgba(${rgb},${f.toFixed(3)})`; ctx.lineWidth = lw; ctx.stroke();
  }
  function poly(pts, rgb, al, lw = 1, ferme = true, halo = false) { for (let i = 0; i < pts.length - (ferme ? 0 : 1); i++) trait(pts[i], pts[(i + 1) % pts.length], rgb, al, lw, halo); }
  function face(pts, rgb, al) {
    const q = pts.map(p => proj(...p)), f = prof(q.reduce((s, x) => s + x[2], 0) / q.length) * al;
    ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = `rgba(${rgb},${f.toFixed(3)})`; ctx.fill();
  }
  function halo(x, y, r, rgb, al) {
    if (r < 1 || al < 0.005) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${al.toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const cube = (x0, x1, y0, y1, z0, z1) => ({ bas: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], haut: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] });

  /* ---------- le dessin ---------- */
  function dessine(t, dt) {
    if (!ctx || !W || !Hc) return;
    const T = curseur, ps = pieces(T), C = ciel(T), nuit = C.jour ? 0 : 1;
    const age = (t - naissance) / 2600, nait = ease(age); // la naissance de la maison (2,6 s)
    lastPs = ps; prepare();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    fond(C, t);
    ctx.globalCompositeOperation = 'lighter'; // un hologramme : la lumière s'additionne
    sol(t, nait);
    // les pièces : la lumière en fondu vers son vrai état
    for (const p of ps) {
      if (!p.a) continue;
      const cible = p.allume ? clamp((p.lum != null ? p.lum : 100) / 100, 0.3, 1) : 0;
      let e = etats.get(p.a.id); if (!e) { e = { v: cible, flash: 0, cible }; etats.set(p.a.id, e); }
      if (Math.abs(cible - e.cible) > 0.05) { e.flash = 1; carte(((p.x0 + p.x1) / 2), p.y1 + 0.3, (p.z0 + p.z1) / 2, `${p.a.nom.toUpperCase()} · ${p.allume ? 'ALLUMÉE' : 'ÉTEINTE'}`, p.allume ? AM : CY); }
      e.cible = cible; e.v += (cible - e.v) * clamp(dt * 0.006, 0, 1); e.flash = Math.max(0, e.flash - dt * 0.0012);
      p.v = e.v; p.flash = e.flash;
    }
    const monte = k => ease(age * 1.7 - k * 0.38); // chaque niveau monte du sol, l'un après l'autre
    coquille(monte, age, t);
    for (const p of ps) piece(p, monte(p.k), t, nuit);
    prises(ps, t, nait);
    // le toit : deux pans (l'un sur la rue, l'autre sur la cour), l'arête parallèle à la rue, le velux
    const mt = ease(age * 1.7 - 1.15);
    if (mt > 0) {
      const y0 = TOIT, yf = y0 + (FAITE - TOIT) * mt;
      const xb = L / 2 - MANS; // le pan de la cour commence en haut de la mansarde
      [-D / 2, D / 2].forEach(z => poly([[-L / 2, y0, z], [0, yf, z], [xb, y0, z]], CY, 0.5 * mt, 1.2, false, true)); // les pignons
      trait([0, yf, -D / 2], [0, yf, D / 2], CY, 0.7 * mt, 1.4, true);
      for (let i = 1; i < 6; i++) { const z = -D / 2 + (D * i) / 6; trait([-L / 2, y0, z], [0, yf, z], CY, 0.1 * mt); trait([xb, y0, z], [0, yf, z], CY, 0.1 * mt); } // les chevrons
      face([[-L / 2, y0, -D / 2], [-L / 2, y0, D / 2], [0, yf, D / 2], [0, yf, -D / 2]], CY, 0.035 * mt);
      face([[xb, y0, -D / 2], [xb, y0, D / 2], [0, yf, D / 2], [0, yf, -D / 2]], CY, 0.035 * mt);
      // le velux, sur le pan de la rue, près du faîte (une fenêtre de toit : il brille si la chambre de papa est allumée)
      const pp = ps.find(p => p.a && p.k === 2), lv = pp ? pp.v || 0 : 0, f = (u, w) => [-L / 2 + (L / 2) * u, y0 + (yf - y0) * u, w];
      const vel = [f(0.55, 0.3), f(0.55, 1.3), f(0.8, 1.3), f(0.8, 0.3)];
      if (lv > 0.02) face(vel, '255,214,150', 0.15 + lv * 0.35);
      poly(vel, lv > 0.02 ? AM : CY, 0.65 * mt, 1.2, true, true);
      if (mt > 0.9) { const q = proj(...f(0.68, 0.8)); ctx.globalCompositeOperation = 'source-over'; texte('VELUX', q[0], q[1] - 10, `rgba(${CY},.6)`, 8.5); ctx.globalCompositeOperation = 'lighter'; }
    }
    // le scanner : un plan qui monte et descend, et souligne la maison là où il passe
    if (nait > 0.9) {
      const s = (t / 6200) % 1, ys = (s < 0.5 ? s * 2 : 2 - s * 2) * (FAITE - 0.2) + 0.1, lz = D / 2;
      const u = ys > TOIT ? 1 - (ys - TOIT) / (FAITE - TOIT) : 1, xa = -L / 2 * u, xb = ys > TOIT ? (L / 2 - MANS) * u : ys > 2 * H ? L / 2 - MANS * (ys - 2 * H) / H : L / 2;
      poly([[xa, ys, -lz], [xb, ys, -lz], [xb, ys, lz], [xa, ys, lz]], CY, 0.55, 1.2, true, true);
      face([[xa - 1, ys, -lz - 1], [xb + 1, ys, -lz - 1], [xb + 1, ys, lz + 1], [xa - 1, ys, lz + 1]], CY, 0.022);
    }
    if (nait > 0.75) { cameras(ps, T, t, ease((age - 0.75) * 4)); coeur(ps, T, t, ease((age - 0.8) * 4)); shadowOrbe(ps, T, t); habitants(ps, T, t); bandeauGarde = null; bouclier(ps, T, t, ease((age - 0.9) * 4)); }
    meteoDessin(C, t, dt);
    motes(t, dt);
    cartesDessin(t);
    // les noms des pièces
    ctx.globalCompositeOperation = 'source-over';
    if (nait > 0.9) for (const p of ps) if (p.a && p.centre) etiquette(p, T, (age - 0.9) * 8); else if (p.nomFixe && p.lab) texte(p.nomFixe, p.lab[0], p.lab[1], `rgba(238,243,248,${(0.5 * prof(p.lab[2])).toFixed(2)})`, W > 700 ? 10 : 9);
    poseTextes();
    hud(C, T, ps, t, age);
  }

  function fond(C, t) {
    // le ciel selon l'heure : nuit profonde, aube et crépuscule (une lueur à l'horizon), jour (un bleu sombre plus clair)
    const h = C.h, aube = Math.max(0, 1 - Math.abs(h - C.lever) / 1.2), crep = Math.max(0, 1 - Math.abs(h - C.coucher) / 1.2);
    const g = ctx.createLinearGradient(0, 0, 0, Hc);
    if (C.jour) { g.addColorStop(0, '#04121d'); g.addColorStop(1, '#0a2433'); } else { g.addColorStop(0, '#010309'); g.addColorStop(1, '#050d1c'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hc);
    const lueur = Math.max(aube, crep);
    if (lueur > 0) { const g2 = ctx.createLinearGradient(0, Hc * 0.35, 0, Hc); g2.addColorStop(0, 'rgba(255,120,60,0)'); g2.addColorStop(1, `rgba(255,120,60,${(0.16 * lueur).toFixed(3)})`); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, Hc); }
    // les étoiles (la nuit, par ciel pas trop couvert)
    const vis = (C.jour ? 0 : 1) * clamp(1 - C.nuages / 110, 0.15, 1);
    if (vis > 0) for (const [x, y, a, ph] of ETOILES) { const al = vis * a * (0.55 + 0.45 * Math.sin(t / 900 + ph)); ctx.fillStyle = `rgba(220,235,255,${(al * 0.8).toFixed(3)})`; ctx.fillRect(x * W, y * Hc, 1.4, 1.4); }
    // le soleil ou la lune, sur leur arc
    const fr = C.jour ? (h - C.lever) / (C.coucher - C.lever) : ((h < C.lever ? h + 24 : h) - C.coucher) / (24 - C.coucher + C.lever);
    const sx = W * (0.08 + 0.84 * clamp(fr, 0, 1)), sy = Hc * 0.36 - Math.sin(Math.PI * clamp(fr, 0, 1)) * Hc * 0.26, r = Math.max(7, Hc * 0.028);
    ctx.globalCompositeOperation = 'lighter';
    if (C.jour) { halo(sx, sy, r * 7, '255,190,110', 0.16 * clamp(1 - C.nuages / 130, 0.2, 1)); halo(sx, sy, r * 1.4, '255,230,170', 0.55); }
    else { halo(sx, sy, r * 5, '170,200,255', 0.08); ctx.fillStyle = 'rgba(210,225,255,.55)'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.8, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = C.jour ? '#04121d' : '#020610'; ctx.beginPath(); ctx.arc(sx + r * 0.38, sy - r * 0.18, r * 0.72, 0, 6.283); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function sol(t, nait) {
    const R = 9.5 * nait;
    for (let r = 2; r <= R; r += 1.75) { const pts = []; for (let i = 0; i < 56; i++) { const a = (i / 56) * 6.283; pts.push([CX + Math.cos(a) * r, 0, Math.sin(a) * r * 0.8]); } poly(pts, CY, r > 8 ? 0.2 : 0.07, 1); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; trait([CX + Math.cos(a) * 2, 0, Math.sin(a) * 1.6], [CX + Math.cos(a) * R, 0, Math.sin(a) * R * 0.8], CY, 0.05); }
    // l'anneau gradué qui tourne doucement, et les repères de la rue et de la cour
    if (nait > 0.5) {
      const rr = 9.6, rot = t / 40000;
      for (let i = 0; i < 72; i++) { const a = (i / 72) * 6.283 + rot, l = i % 6 ? 0.18 : 0.5; trait([CX + Math.cos(a) * rr, 0, Math.sin(a) * rr * 0.8], [CX + Math.cos(a) * (rr + l), 0, Math.sin(a) * (rr + l) * 0.8], CY, i % 6 ? 0.18 : 0.4); }
      const ondeR = 1 + ((t / 2600) % 1) * 8; const pts = []; for (let i = 0; i < 56; i++) { const a = (i / 56) * 6.283; pts.push([CX + Math.cos(a) * ondeR, 0.01, Math.sin(a) * ondeR * 0.8]); }
      poly(pts, CY, 0.32 * (1 - ((t / 2600) % 1)), 1.4);
      // le mode absent : un périmètre vert, armé
      if (typeof absent !== 'undefined' && absent) { const pa = []; for (let i = 0; i < 56; i++) { const a = (i / 56) * 6.283; pa.push([CX + Math.cos(a) * 8.4, 0.02, Math.sin(a) * 6.7]); } poly(pa, VE, 0.35 + 0.2 * Math.sin(t / 400), 1.6, true, true); }
    }
  }

  // la coquille de la maison : les planchers des trois niveaux, les angles, les noms des niveaux ; la cour et le plateau derrière
  function coquille(monte, age, t) {
    const niv = ['RDC', '1ER', '2E'];
    for (let k = 0; k < 3; k++) {
      const m = monte(k); if (m <= 0) continue;
      const y0 = k * H, y1 = y0 + H * m - 0.002;
      poly([[-L / 2, y0, -D / 2], [L / 2, y0, -D / 2], [L / 2, y0, D / 2], [-L / 2, y0, D / 2]], CY, 0.4, 1.1, true, true);
      for (const [x, z] of [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]]) trait([x, y0, z], [k === 2 && x > 0 ? x - MANS * m : x, y1, z], CY, 0.38, 1.1, true);
      if (m > 0.95) { const q = proj(-L / 2 - 0.5, y0 + H / 2, -D / 2 - 0.3); ctx.globalCompositeOperation = 'source-over'; texte(niv[k], q[0], q[1], `rgba(${CY},.55)`, 9); ctx.globalCompositeOperation = 'lighter'; }
    }
    if (monte(2) > 0.98) poly([[-L / 2, TOIT, -D / 2], [L / 2 - MANS, TOIT, -D / 2], [L / 2 - MANS, TOIT, D / 2], [-L / 2, TOIT, D / 2]], CY, 0.4, 1.1, true, true);
    // la porte d'entrée : au rez-de-chaussée, sur la rue, à gauche
    if (monte(0) > 0.95) {
      const x = -L / 2 - 0.02, za = -2.15, zb = -1.25, ph = 2.15;
      poly([[x, 0, za], [x, 0, zb], [x, ph, zb], [x, ph, za]], AM, 0.75, 1.3, true, true);
      face([[x, 0, za], [x, 0, zb], [x, ph, zb], [x, ph, za]], AM, 0.05);
      trait([x - 0.01, 1.05, zb - 0.15], [x - 0.01, 1.05, zb - 0.28], AM, 0.9, 2); // la poignée
      trait([x - 0.5, 0.02, za - 0.1], [x - 0.5, 0.02, zb + 0.1], AM, 0.4); trait([x - 0.5, 0.02, za - 0.1], [x, 0.02, za - 0.1], AM, 0.4); trait([x - 0.5, 0.02, zb + 0.1], [x, 0.02, zb + 0.1], AM, 0.4); // la marche
      const q = proj(x - 0.3, ph + 0.35, (za + zb) / 2); texte('ENTRÉE', q[0], q[1], `rgba(${AM},.8)`, 9, '', 0, 2);
      // la porte de la cour : à l'arrière, à gauche
      const xc = L / 2 + 0.02;
      poly([[xc, 0, za], [xc, 0, zb], [xc, ph, zb], [xc, ph, za]], VE, 0.65, 1.2, true, true);
      face([[xc, 0, za], [xc, 0, zb], [xc, ph, zb], [xc, ph, za]], VE, 0.04);
      trait([xc + 0.01, 1.05, zb - 0.15], [xc + 0.01, 1.05, zb - 0.28], VE, 0.9, 2);
      const qc = proj(xc + 0.3, ph + 0.35, (za + zb) / 2); texte('PORTE DE LA COUR', qc[0], qc[1], `rgba(${VE},.75)`, 8.5, '', 0, 1.8);
      // l'ordinateur : au rez-de-chaussée, côté cour, à droite ; son écran brille quand il est utilisé
      const pc = typeof ou !== 'undefined' && ou && ou.role === 'ordinateur' && ou.pourquoi === 'actif' && curseur == null;
      const bx0 = 4.2, bx1 = 4.9, bz0 = 0.3, bz1 = 2.4, by = 0.75;
      poly([[bx0, by, bz0], [bx1, by, bz0], [bx1, by, bz1], [bx0, by, bz1]], CY, 0.55, 1.1, true, pc); // le bureau
      [[bx0, bz0], [bx0, bz1], [bx1, bz0], [bx1, bz1]].forEach(([x, z]) => trait([x, 0, z], [x, by, z], CY, 0.3));
      // ses quatre écrans, en arc ; quand il les utilise, des courbes de marché y défilent
      [0.62, 1.15, 1.68, 2.21].forEach((zc, i) => {
        const ang = (i - 1.5) * 0.12, w = 0.25, xa = 4.72 - Math.abs(i - 1.5) * 0.09, ya = 0.88, yb = 1.24;
        const ec = [[xa + ang * w, ya, zc - w], [xa - ang * w, ya, zc + w], [xa - ang * w, yb, zc + w], [xa + ang * w, yb, zc - w]];
        face(ec, pc ? '120,220,255' : CY, pc ? 0.28 : 0.06); poly(ec, CY, pc ? 0.95 : 0.42, 1.1, true, pc);
        if (pc) { // la courbe
          const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10, v = 0.5 + 0.32 * Math.sin(u * 6 + i * 1.7 + t / 900) * Math.cos(u * 3.1 + i); pts.push([xa - 0.01, ya + 0.05 + (yb - ya - 0.1) * v, zc - w * 0.85 + w * 1.7 * u]); }
          poly(pts, i % 2 ? VE : AM, 0.85, 1, false);
        }
      });
      trait([4.85, by, 1.4], [4.85, 0.88, 1.4], CY, 0.4); // le pied des écrans
      if (pc) { const qe = proj(4.7, 1.05, 1.4); halo(qe[0], qe[1], qe[3] * 2.2, CY, 0.28); }
      const qo = proj(4.6, 1.6, 1.4); texte('ORDINATEUR', qo[0], qo[1], `rgba(${CY},.7)`, 8.5, '', 0, 1.6);
      // la tablette : dans la lingerie, au mur de droite ; elle s'allume quand on l'utilise
      const tb = typeof ou !== 'undefined' && ou && ou.role === 'tablette' && ou.pourquoi === 'actif' && curseur == null, zt = D / 2 - 0.04;
      const ta = [[-0.6, 1.15, zt], [0.2, 1.15, zt], [0.2, 1.65, zt], [-0.6, 1.65, zt]];
      face(ta, tb ? '120,220,255' : CY, tb ? 0.35 : 0.07); poly(ta, CY, tb ? 0.95 : 0.5, 1.2, true, tb);
      if (tb) { const qt = proj(-0.2, 1.4, zt); halo(qt[0], qt[1], qt[3] * 1.4, CY, 0.3); }
      const qt2 = proj(-0.2, 1.95, zt); texte('TABLETTE', qt2[0], qt2[1], `rgba(${CY},.7)`, 8.5, '', 0, 1.6);
    }
    // la cour (au sol) et le plateau (au niveau du 1er), derrière la maison
    const mc = ease(age * 1.7 - 0.6); if (mc <= 0) return;
    const x0 = L / 2, x1 = L / 2 + COUR * mc, z0 = -D / 2, z1 = D / 2;
    poly([[x0, 0.01, z0], [x1, 0.01, z0], [x1, 0.01, z1], [x0, 0.01, z1]], VE, 0.35, 1, true, true);
    for (let i = 1; i < 6; i++) { const x = x0 + ((x1 - x0) * i) / 6; trait([x, 0.01, z0], [x, 0.01, z1], VE, 0.08); } // les pavés
    face([[x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1]], CY, 0.035);
    poly([[x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1]], CY, 0.45, 1.1, true, true);
    [[x1, z0], [x1, z1]].forEach(([x, z]) => trait([x, 0, z], [x, H, z], CY, 0.2));
    if (mc > 0.95) {
      ctx.globalCompositeOperation = 'source-over';
      const qc = proj((x0 + x1) / 2, 0.05, 0), qp = proj((x0 + x1) / 2, H + 0.05, 0), qr = proj(-L / 2 - 1.6, 0.05, 0);
      texte('COUR', qc[0], qc[1] + 4, `rgba(${VE},.7)`, 10); texte('PLATEAU', qp[0], qp[1] - 4, `rgba(${CY},.7)`, 10); texte('LA RUE', qr[0], qr[1] + 4, `rgba(${CY},.6)`, 10);
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  function piece(p, m, t, nuit) {
    if (m <= 0) return;
    const esc = p.genre === 'escalier', y1 = p.y0 + (p.y1 - p.y0) * m;
    const v = p.v || 0, hs = p.a && p.allume == null && curseur == null, fl = p.flash || 0, on = v > 0.02;
    const c = cube(p.x0 + 0.06, p.x1 - 0.06, p.y0 + 0.04, y1 - 0.04, p.z0 + 0.05, p.z1 - 0.05), zm = (p.z0 + p.z1) / 2, xm = (p.x0 + p.x1) / 2;
    if (p.mansarde) { const r = MANS * ((y1 - p.y0) / H); c.haut[1][0] -= r; c.haut[2][0] -= r; } // le plafond recule côté cour : la pente de la mansarde
    p.centre = proj(xm, (p.y0 + y1) / 2, zm); p.lab = proj(xm, p.y0 + Math.min(1, (y1 - p.y0) * 0.4), zm);
    p.coins = c.bas.concat(c.haut).map(q => proj(...q));
    if (esc) { escalier(p, m, v, hs); if (fl > 0) halo(p.centre[0], p.centre[1], p.centre[3] * 2.5 * (1.4 - fl), on ? AM : CY, 0.35 * fl); return; }
    if (on) {
      // le volume rempli de lumière, le halo au cœur de la pièce, la lumière qui sort par les fenêtres et déborde sur le sol
      const al = (0.022 + v * 0.05) * (p.sur === false ? 0.6 : 1);
      face(c.bas, AM, al * 2.2); face(c.haut, AM, al * 0.7);
      face([c.bas[0], c.bas[1], c.haut[1], c.haut[0]], AM, al); face([c.bas[3], c.bas[2], c.haut[2], c.haut[3]], AM, al);
      face([c.bas[0], c.bas[3], c.haut[3], c.haut[0]], AM, al * 0.8); face([c.bas[1], c.bas[2], c.haut[2], c.haut[1]], AM, al * 0.8);
      halo(p.centre[0], p.centre[1], p.centre[3] * Math.max(p.x1 - p.x0, p.z1 - p.z0) * 0.55, AM, (0.11 + 0.07 * nuit) * v);
    } else face(c.bas, CY, 0.035);
    const col = hs ? RO : on ? AM : CY, a0 = hs ? 0.6 : on ? 0.5 + v * 0.45 : 0.28;
    poly(c.bas, col, a0, on ? 1.5 : 1, true, on); poly(c.haut, col, a0, on ? 1.5 : 1, true, on);
    for (let i = 0; i < 4; i++) trait(c.bas[i], c.haut[i], col, a0, on ? 1.3 : 1, on);
    // les fenêtres : seulement sur la rue et sur la cour (les côtés sont des murs mitoyens)
    if (m > 0.95 && !p.mansarde) for (const [xf, s] of [[-L / 2, -1], [L / 2, 1]]) { // (la chambre de papa n'a pas de fenêtre : seulement le velux)
      if (Math.abs(p.x0 - xf) > 0.01 && Math.abs(p.x1 - xf) > 0.01) continue;
      const x = xf + s * 0.01, w = Math.min(0.75, (p.z1 - p.z0) * 0.2), ya = p.y0 + 0.9, yb = p.y0 + 1.95;
      const petit = p.k === 1 && /chambre/.test(N(p.a ? p.a.nom : '')); // la chambre du petit : une seule fenêtre, sur la rue, à droite
      if (petit && s > 0) continue;
      for (const zc of (petit ? [1.3] : p.z1 - p.z0 > 3.5 ? [zm - 1.1, zm + 1.1] : [zm])) {
        const f = [[x, ya, zc - w], [x, ya, zc + w], [x, yb, zc + w], [x, yb, zc - w]];
        if (on) { face(f, '255,214,150', 0.1 + v * 0.22); poly(f, AM, 0.5 + v * 0.4, 1, true, true); } else poly(f, CY, 0.22, 1);
        trait([x, ya, zc], [x, yb, zc], on ? AM : CY, on ? 0.35 : 0.12);
        if (on && p.k === 0) face([[xf, 0.01, zc - w], [xf, 0.01, zc + w], [xf + s * 2.4 * v, 0.01, zc + w * 1.8], [xf + s * 2.4 * v, 0.01, zc - w * 1.8]], AM, (0.05 + 0.06 * nuit) * v); // la lumière sur le trottoir, sur la cour
        if (on && p.k > 0) halo(...proj(x + s * 0.4, (ya + yb) / 2, zc).slice(0, 2), proj(x, ya, zc)[3] * 1.4, AM, 0.12 * v);
      }
    }
    if (fl > 0) halo(p.centre[0], p.centre[1], p.centre[3] * 3.5 * (1.4 - fl), on ? AM : CY, 0.35 * fl); // le flash quand elle change d'état
  }
  // l'escalier : des marches le long du mur, d'un niveau à l'autre ; elles s'allument avec sa lampe
  function escalier(p, m, v, hs) { // les marches montent du côté cour vers le côté rue
    const n = 11, on = v > 0.02, col = hs ? RO : on ? AM : CY, al = hs ? 0.6 : on ? 0.45 + v * 0.5 : 0.3;
    const z0 = p.z0 + 0.08, z1 = p.z1 - 0.08, dx = (p.x1 - p.x0) / n, dy = (p.y1 - p.y0) / n;
    for (let i = 0; i < n * m; i++) {
      const x = p.x1 - i * dx, y = p.y0 + i * dy, xe = x - dx;
      trait([x, y, z0], [x, y + dy, z0], col, al * 0.8); trait([x, y + dy, z0], [xe, y + dy, z0], col, al, 1.1, on);
      trait([x, y + dy, z1], [xe, y + dy, z1], col, al * 0.6); trait([xe, y + dy, z0], [xe, y + dy, z1], col, al * 0.7);
      if (on) face([[x, y + dy, z0], [xe, y + dy, z0], [xe, y + dy, z1], [x, y + dy, z1]], AM, 0.06 + v * 0.1);
    }
    trait([p.x1, p.y0 + 0.9, z1], [p.x1 - (p.x1 - p.x0) * m, p.y0 + 0.9 + (p.y1 - p.y0) * m, z1], col, al * 0.7, 1, on); // la rampe
    if (on) halo(p.centre[0], p.centre[1], p.centre[3] * 1.8, AM, 0.16 * v);
  }
  // les prises qui ont une place : la Fusée dans la chambre du petit, la télévision au salon
  function prises(ps, t, nait) {
    if (nait < 0.9) return;
    const ch = ps.find(p => p.a && p.genre === 'piece' && p.k === 1 && /chambre/.test(N(p.a.nom))), sa = ps.find(p => p.a && /salon|sejour/.test(N(p.a.nom)));
    for (const a of appareils.filter(x => x.type !== 'lampe')) {
      const n = N(a.nom); let pos = null, rgb = AM, nom = '';
      if (/fusee/.test(n) && ch) { pos = [ch.x0 + 0.4, ch.y0 + 0.7, ch.z1 - 0.5]; rgb = VI; nom = 'FUSÉE'; }
      else if (/tele|tv/.test(n) && sa) { pos = [sa.x1 - 0.4, sa.y0 + 1, 0]; rgb = CY; nom = 'TÉLÉ'; }
      else if (/musique/.test(n) && ch) { pos = [ch.x0 + 1.6, ch.y0 + 0.9, ch.z1 - 0.4]; rgb = VI; nom = 'MUSIQUE'; }
      if (!pos) continue;
      const q = proj(...pos), on = !!a.allume && curseur == null;
      halo(q[0], q[1], q[3] * (on ? 0.9 : 0.35), rgb, on ? 0.45 + 0.15 * Math.sin(t / 500) : 0.12);
      if (/musique/.test(n)) { const o = pos, on2 = !!a.allume && curseur == null, b = Math.sin(t / 300) * 0.04; trait([o[0], o[1] + b, o[2]], [o[0], o[1] + 0.45 + b, o[2]], rgb, on2 ? 0.9 : 0.35, 1.3, on2); trait([o[0], o[1] + 0.45 + b, o[2]], [o[0] + 0.2, o[1] + 0.38 + b, o[2]], rgb, on2 ? 0.9 : 0.35, 1.3, on2); const qq = proj(o[0] - 0.07, o[1] + b, o[2]); ctx.strokeStyle = `rgba(${rgb},${on2 ? 0.9 : 0.35})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(qq[0], qq[1], Math.max(2, qq[3] * 0.07), 0, 6.283); ctx.stroke(); }
      else if (/fusee/.test(n)) poly([[pos[0], pos[1] + 0.55, pos[2]], [pos[0] - 0.14, pos[1], pos[2]], [pos[0] + 0.14, pos[1], pos[2]]], rgb, on ? 0.9 : 0.35, 1.2, true, on);
      else poly([[pos[0], pos[1], pos[2] - 0.5], [pos[0], pos[1], pos[2] + 0.5], [pos[0], pos[1] + 0.55, pos[2] + 0.5], [pos[0], pos[1] + 0.55, pos[2] - 0.5]], rgb, on ? 0.9 : 0.35, 1.1, true, on);
      if (on) { ctx.globalCompositeOperation = 'source-over'; texte(nom, q[0], q[1] - q[3] * 0.4, `rgba(${rgb},.85)`, 8.5); ctx.globalCompositeOperation = 'lighter'; }
    }
  }

  // le suivi : quand une caméra voit quelqu'un, la personne marche dans sa zone et le cône pivote pour la suivre
  // (comme le suivi automatique des EZVIZ) ; sans personne, il revient doucement à sa position de garde.
  // Ce n'est que le dessin : les vraies caméras gardent leurs propres réglages.
  const suivi = new Map();
  function cible(c, p, d, t) {
    const n = N(c.nom), h = Math.hypot(d[0], d[2]) || 1, fx = d[0] / h, fz = d[2] / h, graine = c.nom.length * 1.7;
    const loin = (/toit/.test(n) ? 4.5 : 7) + Math.cos(t / 3700 + graine) * 1.3, cote = Math.sin(t / 2600 + graine) * 2.4;
    let x = p[0] + fx * loin - fz * cote, z = p[2] + fz * loin + fx * cote, y = 0;
    if (/plateau/.test(n)) { x = clamp(x, L / 2 + 0.4, L / 2 + COUR - 0.3); z = clamp(z, -D / 2 + 0.3, D / 2 - 0.3); y = H; } // sur le plateau
    else if (/toit/.test(n)) { x = clamp(x, -L / 2 + 0.6, -0.6); z = clamp(z, -D / 2 + 0.4, D / 2 - 0.4); y = TOIT + (FAITE - TOIT) * ((x + L / 2) / (L / 2)); } // sur le pan du toit
    else if (/cour|jardin/.test(n)) { x = clamp(x, L / 2 + 0.3, L / 2 + COUR - 0.3); z = clamp(z, -D / 2 + 0.3, D / 2 - 0.3); } // dans la cour
    return [x, y, z];
  }
  function cameras(ps, T, t, m) {
    for (const c of cams) {
      const { p, d } = placeCam(c), det = detections(c, T), vue = det.length > 0, hors = !c.en_ligne;
      const n0 = Math.hypot(...d), garde_ = d.map(v => v / n0), quelqu = vue ? cible(c, p, d, t) : null;
      let vise = garde_;
      if (quelqu) { const dd = [quelqu[0] - p[0], quelqu[1] + 1.1 - p[1], quelqu[2] - p[2]], l = Math.hypot(...dd); vise = dd.map(v => v / l); }
      let u = suivi.get(c.nom) || garde_; u = u.map((v, i) => v + (vise[i] - v) * 0.08); const nu = Math.hypot(...u); u = u.map(v => v / nu); suivi.set(c.nom, u);
      const lg = 4.4 * m;
      const bout = p.map((v, i) => v + u[i] * lg);
      let a1 = [u[1], -u[0], 0]; if (Math.hypot(...a1) < 0.1) a1 = [0, u[2], -u[1]];
      const na = Math.hypot(...a1); a1 = a1.map(v => v / na);
      const a2 = [u[1] * a1[2] - u[2] * a1[1], u[2] * a1[0] - u[0] * a1[2], u[0] * a1[1] - u[1] * a1[0]];
      const r1 = 1.9 * m, r2 = 1.25 * m, base = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s1, s2]) => bout.map((v, i) => v + a1[i] * r1 * s1 + a2[i] * r2 * s2));
      const col = hors || vue ? RO : (typeof arme === 'function' && arme(c)) ? VE : CY;
      const clig = vue ? 0.55 + 0.45 * Math.sin(t / 140) : 1;
      base.forEach(b => trait(p, b, col, 0.25 * clig + 0.08));
      poly(base, col, 0.42 * clig + 0.1, 1.2, true, true);
      // la vraie portée : 25 m pour les EZVIZ, 15 m pour la caméra branchée ; les rayons s'arrêtent où ils touchent le sol
      // (on voit la zone vraiment couverte, dans la rue, dans la cour) ; le cône s'efface avec la distance
      const portee = c.ezviz ? 25 : 15, sol0 = 0;
      const loin = base.map(b => { const dir = b.map((v, i) => v - p[i]), l = Math.hypot(...dir), e = dir.map(v => (v / l) * portee * m); let q = p.map((v, i) => v + e[i]); if (q[1] < sol0) { const k = (p[1] - sol0) / (p[1] - q[1]); q = p.map((v, i) => v + (q[i] - v) * k); q[1] = sol0 + 0.01; } return q; });
      loin.forEach((q, k) => { const b = base[k]; for (let sgm = 0; sgm < 3; sgm++) { const f0 = sgm / 3, f1 = (sgm + 1) / 3, A = b.map((v, i) => v + (q[i] - v) * f0), B = b.map((v, i) => v + (q[i] - v) * f1); trait(A, B, col, (0.2 - sgm * 0.06) * clig); } });
      poly(loin, col, 0.12 * clig, 1, true);
      if (loin.filter(q => q[1] < 0.05).length >= 2) face(loin, col, 0.025 * clig); // la zone couverte au sol
      if (m > 0.9) { const mz = loin.reduce((a, q) => a.map((v, i) => v + q[i] / 4), [0, 0, 0]), qm = proj(...mz); texte(`${portee} M`, qm[0], qm[1], `rgba(${col},.55)`, 8.5, '', 0, 0.8); }
      // le balayage : une ligne qui parcourt le cône
      const s = (t / 1800 + c.nom.length * 0.13) % 1, bal = base.map(b => p.map((v, i) => v + (b[i] - v) * s));
      poly(bal, col, 0.3 * (1 - s), 1);
      if (vue) { face([p, base[0], base[1]], col, 0.07 * clig); face([p, base[2], base[3]], col, 0.07 * clig); face(base, col, 0.05 * clig); personne(quelqu[0], quelqu[1], quelqu[2], RO, 1.75, 'QUELQU\'UN', t, 4.5); }
      const q = proj(...p);
      halo(q[0], q[1], 16, col, 0.5); ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(q[0], q[1], 3.4, 0, 6.283); ctx.fill();
      if (vue) { const ph = (t / 1400) % 1; ctx.beginPath(); ctx.arc(q[0], q[1], 6 + ph * 34, 0, 6.283); ctx.strokeStyle = `rgba(${col},${(1 - ph).toFixed(2)})`; ctx.lineWidth = 2; ctx.stroke(); }
      // ce qu'elle voit : en direct sa dernière image ; dans le passé, la photo de la détection (si elle en a gardé une)
      const img = imageDe(c, T, det), qb = proj(...bout), taille = Math.max(40, Math.min(90, qb[3] * 1.9)) * m;
      if (img && img.complete && img.naturalWidth && m > 0.5) {
        const w = taille * 1.6, h = taille, x = qb[0] - w / 2, y = qb[1] - h / 2;
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.85;
        ctx.drawImage(img, x, y, w, h); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,10,20,.22)'; for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1); // les lignes d'un hologramme
        const sl = y + ((t / 18) % h); ctx.fillStyle = `rgba(${col},.18)`; ctx.fillRect(x, sl, w, 2); // la ligne qui défile
        ctx.globalCompositeOperation = 'lighter';
        coinsCadre(x, y, w, h, col, 0.9);
        ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(${col},.9)`;
        ctx.fillText(T == null ? `● ${c.at || 'DIRECT'}` : '◷ IMAGE DE LA DÉTECTION', x + 4, y + h - 4);
      }
      ctx.globalCompositeOperation = 'source-over';
      texte(c.nom.toUpperCase() + (hors ? ' · HORS LIGNE' : vue ? ' · DÉTECTION' : ''), q[0], q[1] - 12, `rgba(${col},.95)`, 9.5, '', 0, vue ? 5 : 2.5);
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  // une personne en hologramme : un corps de lumière, des anneaux qui la parcourent de bas en haut, un socle qui tourne, son nom
  function personne(x, y0, z, rgb, taille, nom, t, prio = 3, a = 1) {
    if (a < 0.03) return;
    const tl = (p, q, c, al, ...r) => trait(p, q, c, al * a, ...r), fc = (pp, c, al) => face(pp, c, al * a), pl = (pp, c, al, ...r) => poly(pp, c, al * a, ...r); // tout s'efface avec a
    const k = taille / 1.75, bob = Math.sin(t / 420 + x) * 0.025, Y = h => y0 + h * k + bob;
    // le faisceau de lumière qui la projette, depuis le sol
    fc([[x - 0.35, y0 + 0.01, z - 0.35], [x + 0.35, y0 + 0.01, z - 0.35], [x + 0.35, y0 + 0.01, z + 0.35], [x - 0.35, y0 + 0.01, z + 0.35]], rgb, 0.12);
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) tl([x + dx, y0, z + dz], [x + dx * 0.2, Y(1.95), z + dz * 0.2], rgb, 0.08);
    // le corps
    const tete = proj(x, Y(1.6), z), r = tete[3] * 0.13 * k;
    halo(tete[0], tete[1], r * 5, rgb, 0.3 * a);
    ctx.strokeStyle = `rgba(${rgb},${(0.9 * a).toFixed(2)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tete[0], tete[1], Math.max(2, r), 0, 6.283); ctx.stroke();
    const ep = 0.23 * k, ha = 0.15 * k;
    pl([[x - ep, Y(1.4), z], [x + ep, Y(1.4), z], [x + ha, Y(0.88), z], [x - ha, Y(0.88), z]], rgb, 0.85, 1.4, true, true); // le buste
    fc([[x - ep, Y(1.4), z], [x + ep, Y(1.4), z], [x + ha, Y(0.88), z], [x - ha, Y(0.88), z]], rgb, 0.12);
    const bras = Math.sin(t / 700 + z) * 0.05;
    tl([x - ep, Y(1.38), z], [x - ep - 0.08, Y(0.9 + bras), z + 0.05], rgb, 0.8, 1.3, true); tl([x + ep, Y(1.38), z], [x + ep + 0.08, Y(0.9 - bras), z - 0.05], rgb, 0.8, 1.3, true);
    tl([x - ha * 0.6, Y(0.88), z], [x - ha * 0.8, y0 + 0.02, z], rgb, 0.8, 1.4, true); tl([x + ha * 0.6, Y(0.88), z], [x + ha * 0.8, y0 + 0.02, z], rgb, 0.8, 1.4, true);
    tl([x, Y(1.47), z], [x, Y(1.4), z], rgb, 0.8, 1.2);
    // les anneaux qui la parcourent (le scan de l'hologramme)
    for (const off of [0, 0.5]) { const h = ((t / 1600 + off) % 1) * 1.75, pts = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283; pts.push([x + Math.cos(a) * 0.32 * k, Y(h), z + Math.sin(a) * 0.32 * k]); } pl(pts, rgb, 0.45 * Math.sin(Math.PI * h / 1.75), 1); }
    // le socle qui tourne
    const rot = t / 900; for (let i = 0; i < 28; i += 2) { const a = (i / 28) * 6.283 + rot, b = ((i + 1) / 28) * 6.283 + rot; tl([x + Math.cos(a) * 0.55, y0 + 0.02, z + Math.sin(a) * 0.55], [x + Math.cos(b) * 0.55, y0 + 0.02, z + Math.sin(b) * 0.55], rgb, 0.75, 1.3); }
    const q = proj(x, Y(2.0), z); texte(nom, q[0], q[1], `rgba(${rgb},${(0.95 * a).toFixed(2)})`, 9.5, '', 0, prio);
  }
  // qui est à la maison, et où : papa là où un de ses Atlas est actif (la pièce de l'appareil), son fils quand Shadow le voit
  let ou = null, ouA = 0;
  async function chargeOu() { if (Date.now() - ouA < 20000) return; ouA = Date.now(); try { ou = await appel('/atlas/ou'); } catch (e) { /* rien */ } }
  let enfantMaison = true, coucher = false, enfantA = 0;
  async function chargeEnfant() { if (Date.now() - enfantA < 60000) return; enfantA = Date.now(); try { const r = await appel('/maison/shadow'); enfantMaison = r.a_la_maison !== false; coucher = !!r.coucher; } catch (e) { /* on suppose */ } }
  const prenomEnfant = ps => { const ch = ps.find(p => p.a && p.genre === 'piece' && p.k === 1 && /chambre/.test(N(p.a.nom))); const n = ch ? ch.a.nom.replace(/chambre\s*(de\s*|d['’]\s*)?/i, '').trim() : ''; return n && n.length < 16 ? n.toUpperCase() : 'TON FILS'; };

  const flane = (p, graine, t) => { const w = (p.x1 - p.x0) * 0.22, d = (p.z1 - p.z0) * 0.22; return [(p.x0 + p.x1) / 2 + Math.sin(t / 9000 + graine) * w, p.y0, (p.z0 + p.z1) / 2 + Math.cos(t / 11000 + graine * 1.7) * d]; }; // il marche doucement dans la pièce
  // il dort : son lit en hauteur (une mezzanine), contre le mur de droite, la tête vers le mur des toilettes et les pieds
  // vers la Fusée, avec son échelle côté chambre ; lui allongé dessus, la couverture qui respire, des « z » qui montent
  function lit(p, on) {
    const y = p.y0, hl = 1.45, xt = p.x1 - 0.08, xp = p.x1 - 2.15, zm = p.z1 - 0.08, zc_ = p.z1 - 1.0, col = on ? VI : CY, al = on ? 0.6 : 0.35; // xt : la tête (côté toilettes), xp : les pieds (côté Fusée)
    poly([[xp, y + hl, zc_], [xt, y + hl, zc_], [xt, y + hl, zm], [xp, y + hl, zm]], col, al, 1.1, true, on); // le sommier
    [[xp, zc_], [xt, zc_], [xp, zm], [xt, zm]].forEach(([x, z]) => trait([x, y, z], [x, y + hl + 0.35, z], col, al * 0.7)); // les montants
    trait([xp + 0.7, y + hl + 0.35, zc_], [xt, y + hl + 0.35, zc_], col, al * 0.8); trait([xp, y + hl + 0.35, zm], [xt, y + hl + 0.35, zm], col, al * 0.6); // la barrière
    trait([xp, y + hl + 0.35, zc_], [xp, y + hl + 0.35, zm], col, al * 0.6); trait([xt, y + hl + 0.35, zc_], [xt, y + hl + 0.35, zm], col, al * 0.6);
    const xe = xp + 0.15, xe2 = xp + 0.55; // l'échelle, côté chambre, au pied du lit
    trait([xe, y, zc_ - 0.05], [xe, y + hl + 0.35, zc_ - 0.05], col, al); trait([xe2, y, zc_ - 0.05], [xe2, y + hl + 0.35, zc_ - 0.05], col, al);
    for (let k = 1; k <= 5; k++) { const yy = y + (hl * k) / 5.5; trait([xe, yy, zc_ - 0.05], [xe2, yy, zc_ - 0.05], col, al * 0.8); }
    return { y: y + hl, xt, xp, za: zc_, zb: zm };
  }
  function dort(p, prenom, t) {
    const B = lit(p, true), zm = (B.za + B.zb) / 2, souffle = 0.03 * Math.sin(t / 900), yc = B.y + 0.14 + souffle;
    const tete = proj(B.xt - 0.35, B.y + 0.16, zm), r = tete[3] * 0.12; // la tête vers le mur des toilettes
    halo(tete[0], tete[1], r * 6, VI, 0.35);
    ctx.strokeStyle = `rgba(${VI},.9)`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(tete[0], tete[1], Math.max(2, r), 0, 6.283); ctx.stroke();
    const cv_ = [[B.xt - 0.65, yc, B.za + 0.1], [B.xp + 0.15, yc - 0.03, B.za + 0.1], [B.xp + 0.15, yc - 0.03, B.zb - 0.1], [B.xt - 0.65, yc, B.zb - 0.1]]; // la couverture, jusqu'aux pieds
    face(cv_, VI, 0.18); poly(cv_, VI, 0.75, 1.2, true, true);
    for (let i = 0; i < 3; i++) { const ph = (t / 2400 + i / 3) % 1, q = proj(B.xt - 0.35 - ph * 0.2, B.y + 0.45 + ph * 1.0, zm - ph * 0.3); texte(i === 2 ? 'Z' : 'z', q[0], q[1], `rgba(${VI},${(0.9 * (1 - ph)).toFixed(2)})`, 9 + i * 2 + ph * 4, '', 0, 0.5); }
    const q = proj((B.xt + B.xp) / 2, B.y + 1.25, zm); texte(`${prenom} · DORT`, q[0], q[1], `rgba(${VI},.95)`, 9.5, '', 0, 4.5);
  }
  const AUTO = /sentinelle|routine|programme|planif|habitude|reveil|oracle|dissuasion|aventure|soiree/; // une lumière allumée par la maison elle-même n'est pas un indice
  function derniereMain(id, T) { // la dernière fois qu'une main (pas un automatisme) l'a allumée, et il y a combien de minutes
    if (!donnees) return null; const now = T == null ? Date.now() / 1000 : T; let der = null;
    for (const e of donnees.lumieres) { if (e.t > now) break; if (e.ids.includes(id) && e.allume && !AUTO.test(N(e.par || ''))) der = e; }
    return der ? (now - der.t) / 60 : null;
  }
  function habitants(ps, T, t) {
    const monteOk = (performance.now() - naissance) > 2400;
    const now = T == null ? Date.now() / 1000 : T, d = new Date(now * 1000), h = d.getHours() + d.getMinutes() / 60, soir = h >= 19.5 || h < 9;
    const chEnfant = ps.find(p => p.a && p.genre === 'piece' && p.k === 1 && /chambre/.test(N(p.a.nom)));
    const prenom = prenomEnfant(ps), marche = a => !!a && (T == null ? !!a.allume : !!etatA(a, T).allume);
    const fus = appareils.find(a => a.type !== 'lampe' && /fusee/.test(N(a.nom))), mus = appareils.find(a => a.type !== 'lampe' && /musique/.test(N(a.nom)));
    const tele = appareils.find(a => a.type !== 'lampe' && /tele|tv/.test(N(a.nom))), sa = ps.find(p => p.a && /salon|sejour/.test(N(p.a.nom)));
    const centre = p => [(p.x0 + p.x1) / 2, p.y0, (p.z0 + p.z1) / 2];
    // ---- son fils : dès qu'il est chez papa (son téléphone, Shadow, est sur le Wi-Fi de la maison), on le montre,
    // à l'endroit le plus probable : le lit (sa veilleuse le soir), là où un Atlas a entendu sa voix, sa chambre allumée,
    // avec Shadow quand Shadow parle ; sans aucun indice : dans son lit la nuit, et « ? » dans sa chambre le jour
    let enfant = null;
    if (enfantMaison && chEnfant) {
      const sig = T == null && ou && ou.enfant ? ou.enfant : {};
      let vuShadow = false;
      if (T == null) { try { const sh = Object.entries(diag || {}).find(([k]) => /^shadow/.test(k)); vuShadow = !!(sh && recent(sh[1]) && sh[1].enfantVu); } catch (e) { /* rien */ } }
      const joue = T == null ? (sig.shadow_il_y_a != null && sig.shadow_il_y_a < 600) : !!donnees && donnees.shadow.some(e => Math.abs(e.t - T) < 15 * 60);
      const voix = sig.voix && sig.voix.il_y_a < 600 ? sig.voix : null;
      const veilleuse = marche(fus) || marche(mus), allumee = (chEnfant.v || 0) > 0.05, nuit = h >= 21 || h < 8;
      if (veilleuse && (soir || (T == null && coucher)) && !allumee) enfant = { dort: true };
      else if (voix) {
        const n = N(voix.piece || ''), p = n ? ps.find(x => x.a && x.genre === 'piece' && N(x.a.nom).includes(n)) : null;
        enfant = { nom: prenom, pos: voix.role === 'tablette' && !p ? [0.5, 0, 0.9] : voix.role === 'ordinateur' && !p ? [3.1, 0, 0.6] : p ? [(p.x0 + p.x1) / 2 + 0.7, p.y0, (p.z0 + p.z1) / 2 - 0.5] : null };
      }
      else if (vuShadow) enfant = { nom: `${prenom} · AVEC SHADOW` };
      else if (allumee) enfant = { nom: prenom };
      else if (joue) enfant = { nom: `${prenom} · AVEC SHADOW` };
      else if (veilleuse) enfant = { nom: prenom };
      else if (nuit) enfant = { dort: true };
      else enfant = { nom: `${prenom} ?`, a: 0.6 };
    }
    if (chEnfant && !(enfant && enfant.dort) && monteOk) lit(chEnfant, false); // son lit, discret quand il n'y dort pas
    if (enfant && enfant.dort) dort(chEnfant, prenom, t);
    else if (enfant && enfant.pos) personne(enfant.pos[0], enfant.pos[1], enfant.pos[2], VI, 1.3, enfant.nom, t, 4);
    else if (enfant) { const [x, y, z] = flane(chEnfant, 4.1, t); personne(x, y, z, VI, 1.3, enfant.nom, t, 4, enfant.a || 1); }
    // ---- papa : le lieu le plus probable
    if (T == null && ou && ou.pourquoi === 'dehors') return; // il est sorti (son téléphone n'est plus à la maison)
    const lieux = []; // [score, x, y, z, comment le dessiner]
    if (T == null && ou && ou.pourquoi === 'actif' && (ou.depuis || 0) < 600) { // il utilise un Atlas : le plus sûr
      const fr = 100 - (ou.depuis || 0) / 12, n = N(ou.piece || ''), p = n ? ps.find(x => x.a && x.genre === 'piece' && N(x.a.nom).includes(n)) : null;
      if (ou.role === 'ordinateur' && !p) lieux.push([fr, 3.75, 0, 1.55]); // devant l'ordinateur (rez-de-chaussée, côté cour, à droite)
      else if (ou.role === 'tablette' && !p) lieux.push([fr, -0.2, 0, 1.45]); // devant la tablette (la lingerie, mur de droite)
      else if (p) lieux.push([fr, ...centre(p), p]);
    }
    for (const p of ps) {
      if (!p.a || (p.v || 0) <= 0.05 || (p === chEnfant && enfant)) continue;
      const m = derniereMain(p.a.id, T); // allumée à la main il y a m minutes : plus c'est récent, plus il y est
      let sc = m == null ? 8 : m < 180 ? 70 * Math.exp(-m / 25) + 8 : 3;
      if (p.genre === 'escalier') sc = m != null && m < 2 ? 40 : 2; // l'escalier : on ne fait qu'y passer
      if ((p.k === 2 || /papa/.test(N(p.a.nom))) && soir) sc += 25; // sa chambre, le soir
      if (p === chEnfant) sc *= 0.3; // la chambre du petit : papa n'y est pas d'habitude
      lieux.push([sc, ...centre(p), p]);
    }
    if (marche(tele) && sa) lieux.push([45, sa.x0 + 1.2, 0, 0.3]); // la télé allumée : il la regarde
    lieux.sort((a, b) => b[0] - a[0]);
    const best = lieux[0];
    if (!best || best[0] < 15) return; // on ne sait pas où il est : on ne l'invente pas
    let [sc, x, y, z, p] = best;
    if (p && p.genre === 'escalier') { const u = 0.5, x2 = p.x1 - (p.x1 - p.x0) * u; personne(x2, p.y0 + (p.y1 - p.y0) * u, (p.z0 + p.z1) / 2, AM, 1.8, sc >= 60 ? 'PAPA' : 'PAPA ?', t, 4); return; }
    if (p) [x, y, z] = flane(p, 1.3, t);
    personne(x, y, z, AM, 1.8, sc >= 60 ? 'PAPA' : 'PAPA ?', t, 4, clamp(sc / 40, 0.5, 1));
  }
  // la maison sous garde : la sentinelle (la nuit, le mode absent) et l'alarme Verisure (quand elle sera reliée)
  let alarme = null, alarmeA = 0;
  async function chargeAlarme() { if (Date.now() - alarmeA < 5 * 60000) return; alarmeA = Date.now(); try { alarme = await appel('/maison/alarme'); } catch (e) { /* rien */ } }
  function garde() {
    const sentinelle = (typeof surveillancePlateau !== 'undefined' && surveillancePlateau) || (typeof absent !== 'undefined' && absent);
    const vs = !!(alarme && alarme.pret && alarme.libelle && !/desarm|désarm|desactiv|désactiv|off|disarm|non arm/i.test(alarme.libelle));
    return { sentinelle, verisure: vs, libelle: vs ? alarme.libelle : '' };
  }
  function bouclier(ps, T, t, m) {
    if (T != null || m <= 0) return; // (en relecture, on ne sait pas si elle veillait)
    const g = garde(); if (!g.sentinelle && !g.verisure) return;
    const alerte = cams.some(c => detections(c, null).length), rgb = alerte || g.verisure ? RO : VE;
    const cxd = (-L / 2 - 1.3 + L / 2 + COUR + 0.3) / 2, rx = (L + COUR + 1.6) / 2 + 0.6, rz = D / 2 + 1.4, ry = FAITE + 1.0;
    const pulse = alerte ? 0.6 + 0.4 * Math.sin(t / 120) : 0.75 + 0.25 * Math.sin(t / 1400);
    // le dôme : au calme, rien qu'un anneau de lumière qui monte de temps en temps (le bouclier qui « respire ») ;
    // en cas de détection seulement, le dôme entier apparaît, en rouge (sinon, avec le reste, c'était trop chargé)
    const onde = (t / 7000) % 1, ondeOn = alerte || onde < 0.55, fo = alerte ? (t / 2200) % 1 : onde / 0.55;
    if (ondeOn) {
      const la = fo * (Math.PI / 2) * 0.92, y = ry * Math.sin(la), r = Math.cos(la), pts = [];
      for (let k = 0; k < 44; k++) { const a = (k / 44) * 6.283; pts.push([cxd + Math.cos(a) * rx * r, y, Math.sin(a) * rz * r]); }
      poly(pts, rgb, (alerte ? 0.5 : 0.32) * Math.sin(Math.PI * fo) * m, 1.2, true, true);
    }
    if (alerte) {
      for (let i = 1; i <= 4; i++) { const la = (i / 5) * (Math.PI / 2), y = ry * Math.sin(la), r = Math.cos(la), pts = []; for (let k = 0; k < 40; k++) { const a = (k / 40) * 6.283; pts.push([cxd + Math.cos(a) * rx * r, y, Math.sin(a) * rz * r]); } poly(pts, rgb, 0.1 * pulse * m, 1); }
      const rot = t / 30000;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283 + rot, pts = []; for (let i = 0; i <= 8; i++) { const la = (i / 8) * (Math.PI / 2); pts.push([cxd + Math.cos(a) * rx * Math.cos(la), ry * Math.sin(la), Math.sin(a) * rz * Math.cos(la)]); } poly(pts, rgb, 0.08 * pulse * m, 1, false); }
    }
    // la barrière laser autour du terrain, et la lumière qui en fait le tour
    const x0 = -L / 2 - 1.3, x1 = L / 2 + COUR + 0.3, z0 = -D / 2 - 0.6, z1 = D / 2 + 0.6, tour = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    for (const hy of (alerte ? [0.35, 0.8] : [0.4])) poly(tour.map(([x, z]) => [x, hy, z]), rgb, (alerte ? 0.45 : 0.28) * pulse * m, 1, true, alerte);
    tour.forEach(([x, z]) => trait([x, 0, z], [x, alerte ? 1.0 : 0.6, z], rgb, 0.45 * m, 1.2, alerte));
    const per = 2 * (x1 - x0 + z1 - z0); let u = ((t / 6000) % 1) * per, pt;
    for (let k = 0; k < 4 && !pt; k++) { const [ax, az] = tour[k], [bx, bz] = tour[(k + 1) % 4], l = Math.hypot(bx - ax, bz - az); if (u <= l) pt = [ax + (bx - ax) * u / l, 0.58, az + (bz - az) * u / l]; else u -= l; }
    if (pt) { const q = proj(...pt); halo(q[0], q[1], 14, rgb, 0.8 * m); }
    // le bandeau
    const txt = g.verisure ? `● ALARME VERISURE ARMÉE${g.libelle ? ` · ${String(g.libelle).toUpperCase()}` : ''}${g.sentinelle ? ' · SENTINELLE' : ''}` : `● SENTINELLE EN GARDE${typeof absent !== 'undefined' && absent ? ' · MODE ABSENT' : ' · NUIT'}`;
    bandeauGarde = { txt: alerte ? `${txt} · DÉTECTION` : txt, rgb };
  }
  let bandeauGarde = null;

  // le cœur d'Atlas : une sphère d'anneaux au-dessus du toit, reliée par des flux aux caméras et aux pièces allumées
  function coeur(ps, T, t, m) {
    if (m <= 0) return;
    let parle = false; try { parle = !!(window.parent !== window && window.parent.voice && window.parent.voice.occupe && window.parent.voice.occupe()); } catch (e) { /* rien */ }
    const pulse = parle ? 0.5 + 0.5 * Math.sin(t / 90) : 0.5 + 0.5 * Math.sin(t / 900), c = [0, FAITE + 1.3 + Math.sin(t / 1300) * 0.12, 0], q = proj(...c), r = 0.62 * m;
    halo(q[0], q[1], q[3] * r * (3.2 + pulse * (parle ? 2 : 0.6)), CY, 0.22 + pulse * 0.18);
    halo(q[0], q[1], q[3] * r * 0.9, '210,245,255', 0.6);
    const anneaux = [[t / 2100, 0.35], [-t / 1700, 1.15], [t / 2600, 2.05]];
    for (const [rot, inc] of anneaux) {
      const pts = [];
      for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283 + rot; const x = Math.cos(a) * r * 1.5, y0 = Math.sin(a) * r * 1.5; pts.push([c[0] + x, c[1] + y0 * Math.cos(inc), c[2] + y0 * Math.sin(inc)]); }
      poly(pts, CY, 0.55 * m, 1, true, true);
    }
    ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(${CY},${(0.7 * m).toFixed(2)})`; ctx.fillText(parle ? 'ATLAS · PARLE' : 'ATLAS', q[0], q[1] - q[3] * r * 2.1);
    // les flux : de petits paquets de lumière qui voyagent vers la maison
    const cibles = cams.map(cm => [placeCam(cm).p, CY]).concat(ps.filter(p => p.a && p.v > 0.05).map(p => [[(p.x0 + p.x1) / 2, p.y1 - 0.2, (p.z0 + p.z1) / 2], AM]));
    cibles.forEach(([b, col], i) => {
      trait(c, b, col, 0.06 * m);
      for (const off of [0, 0.5]) { const f = (t / 2400 + i * 0.17 + off) % 1, x = c.map((v, k) => v + (b[k] - v) * f), pp = proj(...x); halo(pp[0], pp[1], 5, col, 0.7 * m * Math.sin(Math.PI * f)); }
    });
  }
  // Shadow : une petite lumière violette dans la chambre du petit, quand il est en ligne (ou, dans le passé, quand ils jouaient)
  function shadowOrbe(ps, T, t) {
    const ch = ps.find(p => p.a && p.genre === 'piece' && p.k === 1 && /chambre/.test(N(p.a.nom)));
    if (!ch) return;
    let la = false;
    if (T == null) { try { const sh = Object.entries(diag || {}).find(([k]) => /^shadow/.test(k)); la = !!(sh && recent(sh[1])); } catch (e) { /* rien */ } }
    else la = !!donnees && donnees.shadow.some(e => Math.abs(e.t - T) < 20 * 60);
    if (!la) return;
    const x = (ch.x0 + ch.x1) / 2 + Math.cos(t / 1500) * 0.5, y = ch.y0 + 1.3 + Math.sin(t / 700) * 0.15, z = (ch.z0 + ch.z1) / 2 + Math.sin(t / 1500) * 0.5, q = proj(x, y, z);
    halo(q[0], q[1], q[3] * 1.4, VI, 0.45); halo(q[0], q[1], q[3] * 0.35, '235,220,255', 0.8);
    ctx.globalCompositeOperation = 'source-over'; texte('SHADOW', q[0], q[1] - q[3] * 0.6, `rgba(${VI},.95)`, 9, '', 0, 3.5); ctx.globalCompositeOperation = 'lighter';
  }

  function meteoDessin(C, t, dt) {
    if (C.pluie > 0 || C.neige > 0) {
      const n = Math.round(GOUTTES.length * Math.max(C.pluie, C.neige));
      for (let i = 0; i < n; i++) {
        const g = GOUTTES[i];
        g.y -= dt * 0.012 * g.v * (C.neige ? 0.12 : 1); if (g.y < 0) g.y += 14;
        if (C.neige) { const p = proj(g.x + Math.sin(t / 900 + i) * 0.3, g.y, g.z); ctx.fillStyle = `rgba(230,240,255,${(0.5 * prof(p[2])).toFixed(2)})`; ctx.fillRect(p[0], p[1], 1.8, 1.8); }
        else trait([g.x, g.y, g.z], [g.x - 0.05, g.y + 0.5, g.z], '150,200,255', 0.35);
      }
    }
    if (C.orage) { if (eclair <= 0 && Math.random() < dt / 7000) eclair = 1; }
    if (eclair > 0) { ctx.fillStyle = `rgba(200,220,255,${(0.22 * eclair).toFixed(3)})`; ctx.fillRect(0, 0, W, Hc); eclair -= dt * 0.006; }
    if (C.brume) { const g = ctx.createLinearGradient(0, Hc * 0.45, 0, Hc); g.addColorStop(0, 'rgba(160,190,210,0)'); g.addColorStop(1, 'rgba(160,190,210,.12)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hc); }
  }
  function motes(t, dt) { // des poussières de lumière qui montent doucement autour de la maison
    for (const m of MOTES) {
      m.y += dt * 0.0004 * m.v; if (m.y > 9) m.y = 0;
      const p = proj(m.x + Math.sin(t / 3000 + m.v * 9) * 0.3, m.y, m.z), a = 0.35 * Math.sin((m.y / 9) * Math.PI) * prof(p[2]);
      if (a > 0.02) { ctx.fillStyle = `rgba(${CY},${a.toFixed(3)})`; ctx.fillRect(p[0], p[1], 1.6, 1.6); }
    }
  }
  // les événements qui surgissent là où ils ont eu lieu (une lampe qui change, une détection…), puis s'envolent
  function carte(x, y, z, texte_, rgb) { cartes.push({ x, y, z, texte: texte_, rgb, t0: performance.now() }); if (cartes.length > 8) cartes.shift(); }
  function cartesDessin(t) {
    ctx.globalCompositeOperation = 'source-over';
    for (let i = cartes.length - 1; i >= 0; i--) {
      const c = cartes[i], a = (t - c.t0) / 2600;
      if (a >= 1) { cartes.splice(i, 1); continue; }
      const p = proj(c.x, c.y + a * 1.4, c.z), al = a < 0.15 ? a / 0.15 : 1 - (a - 0.15) / 0.85;
      ctx.font = '600 10px ui-monospace, monospace'; const w = ctx.measureText(c.texte).width + 14;
      ctx.fillStyle = `rgba(4,8,14,${(0.75 * al).toFixed(2)})`; ctx.fillRect(p[0] - w / 2, p[1] - 11, w, 17);
      ctx.strokeStyle = `rgba(${c.rgb},${(0.8 * al).toFixed(2)})`; ctx.lineWidth = 1; ctx.strokeRect(p[0] - w / 2 + 0.5, p[1] - 10.5, w - 1, 16);
      ctx.fillStyle = `rgba(${c.rgb},${al.toFixed(2)})`; ctx.textAlign = 'center'; ctx.fillText(c.texte, p[0], p[1] + 1);
    }
    ctx.globalCompositeOperation = 'lighter';
  }
  function etiquette(p, T, m) {
    const q = p.lab || p.centre, lg = Math.hypot(p.coins[1][0] - p.coins[0][0], p.coins[1][1] - p.coins[0][1]), al = clamp(m, 0, 1) * prof(q[2]) * 1.4;
    const on = p.v > 0.05;
    texte(p.a.nom.toUpperCase(), q[0], q[1], on ? `rgba(255,244,224,${clamp(al, 0, 1).toFixed(2)})` : `rgba(238,243,248,${clamp(al * 0.62, 0, 1).toFixed(2)})`, W > 700 ? 10.5 : 9.5,
      on ? (p.lum != null ? `${p.lum} %` : 'ALLUMÉE') + (p.sur === false ? ' ?' : '') : p.a.allume == null && T == null ? 'SANS COURANT' : '', lg * 0.95, on ? 3 : 1.5 - q[2] / 40);
  }
  // les textes vont dans une file, puis sont posés à la fin, du plus important au moins important :
  // un texte qui en chevaucherait un autre se décale un peu, ou s'efface (rien ne se mange)
  const file = [];
  function texte(t, x, y, col, taille, sous, large, prio = 1) { file.push({ t: String(t), x, y, col, taille, sous, large, prio }); }
  function poseTextes() {
    ctx.globalCompositeOperation = 'source-over';
    const places = [], chevauche = b => places.some(a => b[0] < a[0] + a[2] && b[0] + b[2] > a[0] && b[1] < a[1] + a[3] && b[1] + b[3] > a[1]);
    file.sort((a, b) => b.prio - a.prio);
    for (const e of file) {
      ctx.font = `${e.taille}px ui-monospace, 'DejaVu Sans Mono', monospace`;
      const mots = e.t.split(' '); let l1 = e.t, l2 = ''; // un nom trop long pour la pièce : sur deux lignes
      if (e.large && ctx.measureText(e.t).width > e.large && mots.length > 1) { const m = Math.ceil(mots.length / 2); l1 = mots.slice(0, m).join(' '); l2 = mots.slice(m).join(' '); }
      let w = Math.max(ctx.measureText(l1).width, l2 ? ctx.measureText(l2).width : 0);
      if (e.sous) { ctx.font = `${e.taille - 2}px ui-monospace, monospace`; w = Math.max(w, ctx.measureText(e.sous).width); }
      const h = e.taille * ((l2 ? 2.1 : 1.1) + (e.sous ? 1.1 : 0)) + 4;
      let y = e.y, b = [e.x - w / 2 - 4, y - e.taille - 2, w + 8, h];
      if (chevauche(b)) { for (const d of [-h, h, -2 * h]) { const b2 = [b[0], b[1] + d, b[2], b[3]]; if (!chevauche(b2)) { b = b2; y += d; break; } } }
      if (chevauche(b) && e.prio < 4) continue; // pas de place : on l'efface plutôt que de le superposer
      places.push(b);
      ctx.font = `${e.taille}px ui-monospace, 'DejaVu Sans Mono', monospace`; ctx.textAlign = 'center'; ctx.fillStyle = e.col;
      ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 4;
      ctx.fillText(l1, e.x, l2 ? y - e.taille * 0.55 : y); if (l2) ctx.fillText(l2, e.x, y + e.taille * 0.55);
      if (e.sous) { ctx.font = `${e.taille - 2}px ui-monospace, monospace`; ctx.fillStyle = 'rgba(255,217,160,.85)'; ctx.fillText(e.sous, e.x, y + e.taille * (l2 ? 1.7 : 1) + 2); }
      ctx.shadowBlur = 0;
    }
    file.length = 0;
  }
  function coinsCadre(x, y, w, h, rgb, al) {
    const l = Math.min(14, w / 5); ctx.strokeStyle = `rgba(${rgb},${al})`; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(x, y + l); ctx.lineTo(x, y); ctx.lineTo(x + l, y); ctx.moveTo(x + w - l, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + l);
    ctx.moveTo(x + w, y + h - l); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - l, y + h); ctx.moveTo(x + l, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - l); ctx.stroke();
  }
  // le tableau de bord par-dessus : l'heure affichée, la météo, les compteurs, l'azimut
  function hud(C, T, ps, t, age) {
    ctx.globalCompositeOperation = 'source-over';
    coinsCadre(6, 6, W - 12, Hc - 12, CY, 0.35);
    ctx.font = '600 10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = T == null ? `rgba(${VE},.85)` : `rgba(${AM},.9)`;
    ctx.fillText(T == null ? `● JUMEAU · EN DIRECT${(t / 600) % 2 < 1 ? '' : ' ▮'}` : '◷ JUMEAU · RELECTURE', 16, 22);
    if (Hc >= 330) { ctx.font = '9.5px ui-monospace, monospace'; ctx.fillStyle = `rgba(${CY},.5)`; ctx.fillText(`AZIMUT ${String(Math.round(((yaw * 180) / Math.PI % 360 + 360) % 360)).padStart(3, '0')}° · ZOOM ${zoom.toFixed(1)}×`, 16, 36); }
    // l'heure et le temps qu'il fait
    ctx.textAlign = 'right'; ctx.font = `200 ${Hc < 330 ? 16 : W > 700 ? 26 : 20}px ui-monospace, monospace`; ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillText(hh(C.d), W - 16, Hc < 330 ? 26 : 36);
    ctx.font = '9.5px ui-monospace, monospace'; ctx.fillStyle = `rgba(${CY},.6)`;
    ctx.fillText(`${C.temp != null ? `${Math.round(C.temp)}° · ` : ''}${LIBELLE(C.code)} · ${C.jour ? 'JOUR' : 'NUIT'}`, W - 16, Hc < 330 ? 38 : 50);
    // les compteurs
    const on = ps.filter(p => p.a && p.v > 0.05).length, tot = ps.filter(p => p.a).length;
    const watts = T == null ? appareils.reduce((s, a) => s + (a.allume && a.watts ? a.watts : 0), 0) : null;
    const camsOk = cams.filter(c => c.en_ligne).length, vues = cams.filter(c => detections(c, T).length).length;
    ctx.textAlign = 'left'; ctx.font = '9.5px ui-monospace, monospace';
    const lignes = [[`LUMIÈRES ${on}/${tot}`, on ? AM : CY], [watts != null ? `ÉNERGIE ${Math.round(watts)} W` : 'ÉNERGIE —', CY], [`CAMÉRAS ${camsOk}/${cams.length}${vues ? ` · ${vues} DÉTECTION${vues > 1 ? 'S' : ''}` : ''}`, vues ? RO : VE]];
    lignes.forEach(([x, col], i) => { ctx.fillStyle = `rgba(${col},.75)`; ctx.fillText(x, 16, Hc - 16 - (lignes.length - 1 - i) * 13); });
    if (bandeauGarde) { ctx.textAlign = 'center'; ctx.font = '600 10.5px ui-monospace, monospace'; const w = ctx.measureText(bandeauGarde.txt).width + 22, y = Hc < 330 ? 12 : 16; ctx.fillStyle = 'rgba(2,8,6,.75)'; ctx.fillRect(W / 2 - w / 2, y, w, 18); ctx.strokeStyle = `rgba(${bandeauGarde.rgb},.8)`; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - w / 2 + 0.5, y + 0.5, w - 1, 17); ctx.fillStyle = `rgba(${bandeauGarde.rgb},${(0.75 + 0.25 * Math.sin(t / 500)).toFixed(2)})`; ctx.fillText(bandeauGarde.txt, W / 2, y + 13); }
    // la naissance
    if (age < 1.05) {
      ctx.textAlign = 'center'; ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = `rgba(${CY},${clamp(1.1 - age, 0, 1).toFixed(2)})`;
      ctx.fillText(`INITIALISATION DU JUMEAU · ${Math.min(100, Math.round(age * 100))} %`, W / 2, Hc - 18);
    }
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

  /* ---------- la relecture : les événements surgissent quand le curseur passe dessus ---------- */
  function surgit(de, a) {
    if (!donnees || de == null || a == null || a <= de || a - de > 1800) return;
    const ps = lastPs;
    donnees.cameras.forEach(e => { if (e.t > de && e.t <= a && VU.test(e.texte) && !PAS_VU.test(e.texte)) { const c = cams.find(x => N(e.texte).includes(N(x.nom))); const p = c ? placeCam(c).p : [0, 1, 0]; carte(p[0], p[1] + 0.6, p[2], `${hh(new Date(e.t * 1000))} · ${c ? c.nom.toUpperCase() : 'CAMÉRA'} · DÉTECTION`, RO); } });
    donnees.ordres.forEach(e => { if (e.t > de && e.t <= a) carte(0, FAITE + 0.8, 0, `« ${e.phrase.slice(0, 34)} »`, CY); });
    donnees.shadow.forEach(e => { if (e.t > de && e.t <= a) { const ch = ps.find(p => p.a && p.genre === 'piece' && p.k === 1 && /chambre/.test(N(p.a.nom))); carte(ch ? (ch.x0 + ch.x1) / 2 : 0, ch ? ch.y1 : H * 2, ch ? (ch.z0 + ch.z1) / 2 : 0, `SHADOW · ${String(e.type).toUpperCase()}`, VI); } });
  }

  /* ---------- la boucle (30 images par seconde au plus) ---------- */
  function boucle(t) {
    anime = 0;
    if (!actif || document.hidden || !cv || !cv.isConnected) return;
    anime = requestAnimationFrame(boucle);
    if (t - dernierDessin < 31) return;
    const dt = Math.min(100, t - (dernierT || t)); dernierT = t; dernierDessin = t;
    if (!glisse) {
      yaw += vyaw * dt; vyaw *= Math.pow(0.94, dt / 16); // l'élan du doigt
      if (Date.now() > repriseAuto && Math.abs(vyaw) < 0.0001) { phase += dt / 15000; yaw = base + 0.42 * Math.sin(phase); } // un lent balancement de trois quarts : la maison reste lisible
      else base = yaw - 0.42 * Math.sin(phase);
    }
    if (lecture && curseur != null && donnees) { curseur += dt * 0.6; if (curseur >= donnees.maintenant) { curseur = null; lecture = false; } majCurseur(); } // une heure en 6 secondes
    if (curseur !== precedent) { surgit(precedent, curseur); precedent = curseur; }
    dessine(t, dt);
  }
  const lance = () => { if (!anime && actif) anime = requestAnimationFrame(boucle); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { dernierT = 0; lance(); } });

  /* ---------- le curseur du temps ---------- */
  const fmt = s => { const d = new Date(s * 1000), auj = new Date().toDateString() === d.toDateString(); return `${auj ? "AUJOURD'HUI" : 'HIER'} ${hh(d)}`; };
  function majCurseur() {
    if (!boite) return;
    const r = boite.querySelector('#j-temps'), lab = boite.querySelector('#j-lab'), dir = boite.querySelector('#j-direct'), fil = boite.querySelector('#j-fil');
    if (!r || !donnees) return;
    const v = curseur == null ? donnees.maintenant : curseur;
    r.value = String(Math.round(((v - donnees.depuis) / (donnees.maintenant - donnees.depuis)) * 1000));
    lab.textContent = curseur == null ? 'EN DIRECT' : fmt(curseur);
    dir.classList.toggle('on', curseur == null);
    boite.querySelector('#j-play').textContent = lecture ? '❚❚' : '▶';
    if (curseur == null) { fil.textContent = 'FAIS GLISSER LE CURSEUR POUR REVOIR LA JOURNÉE · DEUX DOIGTS POUR ZOOMER'; return; }
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
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = t => ((t - donnees.depuis) / (donnees.maintenant - donnees.depuis)) * w;
    // la nuit sur la piste : une bande plus sombre
    for (let t = Math.floor(donnees.depuis / 3600) * 3600; t < donnees.maintenant; t += 3600) { const hr = new Date(t * 1000).getHours(); if (hr >= 22 || hr < 7) { g.fillStyle = 'rgba(40,60,120,.18)'; g.fillRect(x(t), 0, x(t + 3600) - x(t), h); } }
    const tr = (l, col, y0, y1) => { g.fillStyle = col; l.forEach(e => { if (e.t >= donnees.depuis) g.fillRect(x(e.t), y0, 1.5, y1 - y0); }); };
    tr(donnees.lumieres, 'rgba(255,181,71,.8)', 2, h * 0.45);
    tr(donnees.cameras.filter(e => VU.test(e.texte) && !PAS_VU.test(e.texte)), 'rgba(255,107,74,.95)', h * 0.5, h - 2);
    tr(donnees.ordres, 'rgba(95,211,255,.8)', h * 0.3, h * 0.7);
    tr(donnees.shadow, 'rgba(180,140,255,.85)', h * 0.15, h * 0.55);
    g.fillStyle = 'rgba(95,211,255,.35)'; g.font = '8px ui-monospace, monospace'; g.textAlign = 'center';
    for (let t = Math.ceil(donnees.depuis / 3600) * 3600; t < donnees.maintenant; t += 3600) { const hr = new Date(t * 1000).getHours(); g.fillRect(x(t), h - (hr % 6 ? 3 : 7), 1, hr % 6 ? 3 : 7); if (!(hr % 6) && x(t) > 10 && x(t) < w - 10) g.fillText(`${hr}h`, x(t), 8); }
  }

  /* ---------- l'interface ---------- */
  const CSS = `#jumeau { position: relative; flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; }
    #jumeau .j-scene { position: relative; flex: 1; min-height: 0; }
    #jumeau.plein { position: fixed; inset: 0; z-index: 40; padding: 10px 14px 12px; background: #02050b; }
    #jumeau canvas.j3d { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; border-radius: 4px; }
    .j-barre { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 8px; align-items: center; margin-top: 6px; }
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
    button.vue { font: 600 9.5px ui-monospace, monospace; letter-spacing: .18em; color: var(--ambre); background: rgba(255,181,71,.07); border: 1px solid var(--ligneA); border-radius: 4px; padding: 4px 8px; cursor: pointer; }
    @media (max-width: 699px) { .j-barre { grid-template-columns: auto minmax(0, 1fr) auto auto; } .j-rail { order: -1; grid-column: 1 / -1; } #j-lab { min-width: 0; text-align: left; } }`;
  function monte(el) {
    if (!document.getElementById('j-css')) { const st = document.createElement('style'); st.id = 'j-css'; st.textContent = CSS; document.head.appendChild(st); }
    el.innerHTML = `<div id="jumeau"><div class="j-scene"><canvas class="j3d"></canvas></div>
      <div class="j-barre"><button id="j-play" title="Rejouer la journée">▶</button>
        <div class="j-rail"><canvas id="j-piste"></canvas><input id="j-temps" type="range" min="0" max="1000" value="1000" aria-label="Revoir la journée"></div>
        <span id="j-lab">EN DIRECT</span><button id="j-direct" class="on">DIRECT</button><button id="j-plein" title="Plein écran">⛶</button></div>
      <div id="j-fil"></div></div>`;
    boite = el.querySelector('#jumeau'); cv = boite.querySelector('canvas.j3d'); ctx = cv.getContext('2d');
    naissance = performance.now(); etats.clear(); cartes.length = 0;
    // la taille vient du cadre (pas du canevas lui-même : sinon, sur un écran très fin, il grandissait sans fin)
    const scene = boite.querySelector('.j-scene');
    const taille = () => { if (!cv || !scene.isConnected) return; dpr = Math.min(2, window.devicePixelRatio || 1); W = scene.clientWidth; Hc = scene.clientHeight; f_ = 0; cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr); piste(); };
    new ResizeObserver(taille).observe(scene); taille();
    // un doigt : tourner (avec de l'élan) ; deux doigts ou la molette : zoomer ; toucher une pièce (en direct) : l'allumer ou l'éteindre ; double toucher : la vue de départ
    let dernierTap = 0;
    cv.addEventListener('pointerdown', e => {
      doigts.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId);
      if (doigts.size === 2) { const [a, b] = [...doigts.values()]; glisse = { pince: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom, bouge: true }; return; }
      glisse = { x: e.clientX, y: e.clientY, yaw, pitch, bouge: false, t: performance.now(), lx: e.clientX };
    });
    cv.addEventListener('pointermove', e => {
      if (!doigts.has(e.pointerId)) return;
      doigts.set(e.pointerId, [e.clientX, e.clientY]);
      if (!glisse) return;
      if (glisse.pince) { const [a, b] = [...doigts.values()]; if (a && b) zoom = clamp(glisse.zoom * Math.hypot(a[0] - b[0], a[1] - b[1]) / glisse.pince, 0.6, 2.2); return; }
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y, now = performance.now();
      if (Math.abs(dx) + Math.abs(dy) > 6) glisse.bouge = true;
      vyaw = (e.clientX - glisse.lx) * 0.008 / Math.max(8, now - glisse.t); glisse.lx = e.clientX; glisse.t = now;
      yaw = glisse.yaw + dx * 0.008; pitch = clamp(glisse.pitch + dy * 0.004, 0.12, 1.1);
    });
    const fin = e => {
      doigts.delete(e.pointerId);
      const g = glisse; if (doigts.size) return; glisse = null; repriseAuto = Date.now() + 8000;
      if (!g || g.bouge || g.pince) return;
      vyaw = 0;
      const now = performance.now(); if (now - dernierTap < 320) { yaw = base = 0.5; pitch = 0.36; zoom = 1; phase = 0; dernierTap = 0; return; } dernierTap = now;
      if (curseur != null || e.type !== 'pointerup') return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let mieux = null, aire = Infinity;
      for (const p of lastPs) { if (!p.a || !p.coins) continue; const xs = p.coins.map(c => c[0]), ys = p.coins.map(c => c[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && (x1 - x0) * (y1 - y0) < aire) { aire = (x1 - x0) * (y1 - y0); mieux = p; } }
      if (mieux && mieux.a.allume != null) { const st = etats.get(mieux.a.id); if (st) st.flash = 1; bascule(mieux.a.id); }
    };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
    cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.08 : 0.93), 0.6, 2.2); repriseAuto = Date.now() + 8000; }, { passive: false });
    const r = boite.querySelector('#j-temps');
    r.addEventListener('input', () => { if (!donnees) return; lecture = false; const v = donnees.depuis + (+r.value / 1000) * (donnees.maintenant - donnees.depuis); curseur = +r.value >= 998 ? null : v; majCurseur(); });
    boite.querySelector('#j-direct').onclick = () => { curseur = null; lecture = false; charge(true); majCurseur(); };
    boite.querySelector('#j-plein').onclick = () => { const on = boite.classList.toggle('plein'); boite.querySelector('#j-plein').textContent = on ? '✕' : '⛶'; f_ = 0; };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && boite && boite.classList.contains('plein')) boite.querySelector('#j-plein').click(); });
    boite.querySelector('#j-play').onclick = () => {
      if (!donnees) return;
      if (lecture) { lecture = false; majCurseur(); return; }
      if (curseur == null) curseur = Math.max(donnees.depuis, donnees.maintenant - 12 * 3600); // relancer : les 12 dernières heures
      precedent = curseur; lecture = true; majCurseur();
    };
    charge(true).then(majCurseur); chargeMeteo(); chargeOu();
  }
  function maj() {
    const el = document.getElementById('plan'); if (!el) return;
    if (!boite || !boite.isConnected) monte(el);
    charge(false); chargeMeteo(); chargeOu(); chargeEnfant(); chargeAlarme(); lance();
  }
  function bascule3d(on) {
    actif = on; try { localStorage.setItem('cockpit-vue', on ? '3d' : '2d'); } catch (e) { /* rien */ }
    const b = document.getElementById('vue3d'); if (b) b.textContent = on ? 'PLAN 2D' : 'JUMEAU 3D';
    const el = document.getElementById('plan'); if (el) { el._svg = ''; el.innerHTML = ''; }
    boite = null; cv = null; ctx = null;
    if (on) maj(); else if (typeof plan === 'function') plan();
  }
  return { actif: () => actif, maj, bascule: bascule3d, _vue: () => ({ yaw, pitch, base, phase, f: f_ }), rejoue: h => { if (!donnees) return; curseur = donnees.maintenant - (h || 12) * 3600; precedent = curseur; lecture = true; majCurseur(); } };
})();

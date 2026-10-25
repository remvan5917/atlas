// La veille intérieure, et le « rayon X » de la maison.
//
// Quand la sentinelle est armée (la nuit, ou la maison en mode absent), l'appareil où Atlas tourne (l'ordinateur, la tablette,
// le téléphone) écoute et regarde la pièce où il est posé, en plus des caméras de la maison :
//   - le micro : seulement le niveau sonore. Un bruit bien plus fort que le fond de la pièce → un événement. Le son n'est
//     jamais enregistré ni transcrit.
//   - la caméra : une petite image grise par seconde, comparée à la précédente. Quelque chose bouge, ou une lumière s'allume
//     → un événement, avec UNE photo de ce moment-là.
// Les événements vont à la sentinelle sur l'ordinateur de la maison, qui regarde la photo avec sa propre vision (l'image ne
// sort jamais de la maison) et décide : en mode absent, une personne ou un bruit fort = alerte urgente ; la nuit, la famille
// est là : tout est noté pour le rapport de nuit, seul un très gros bruit réveille.
// Un petit œil rouge s'allume en haut de l'écran tant que cet appareil écoute et regarde.
//
// « Rayon X » : toutes les caméras de la maison et tous les appareils d'un coup, en vue radiographie, avec le niveau
// sonore de chaque pièce.
const VEILLE = (() => {
  const root = () => VOIXMAISON.root();
  const nomAppareil = () => (S.settings.nomAppareil || '').trim() || (/Android/.test(navigator.userAgent) ? (/Mobile/.test(navigator.userAgent) ? 'téléphone' : 'tablette') : 'ordinateur');
  const actif = () => S.settings.veilleInterieure !== false && !(typeof voice !== 'undefined' && voice.endormi);
  let etat = { arme: false, rayon: false }, aStream = null, aCtx = null, proc = null, vStream = null, vid = null, petit = null, pctx = null;
  let fond = null, fort = 0, dbNow = null, prec = null, plum = null, bouge = 0, camDepuis = 0, dernier = {}, dernierBattement = 0, derniereImage = 0, mouv = 0;

  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl.signal });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return /image/.test(r.headers.get('Content-Type') || '') ? r.blob() : r.json();
    } finally { clearTimeout(tm); }
  }

  /* ---------- l'œil rouge : on voit toujours que l'appareil écoute et regarde ---------- */
  function oeil(on) {
    let e = document.getElementById('veille-oeil');
    if (!e) {
      e = document.createElement('div'); e.id = 'veille-oeil';
      e.title = 'Sentinelle : cet appareil écoute le niveau sonore et regarde la pièce (rien n’est enregistré en continu)';
      e.style.cssText = 'position:fixed;top:10px;left:10px;width:14px;height:14px;border-radius:50%;background:#ff2d2d;box-shadow:0 0 10px 3px rgba(255,45,45,.65);z-index:9999;pointer-events:none;animation:veillePouls 2.4s ease-in-out infinite';
      const st = document.createElement('style'); st.textContent = '@keyframes veillePouls{0%,100%{opacity:.35}50%{opacity:1}}'; document.head.appendChild(st);
      document.body.appendChild(e);
    }
    e.style.display = on ? 'block' : 'none';
  }

  /* ---------- le micro : le niveau sonore seulement ---------- */
  async function ouvreMicro() {
    if (aStream) return;
    aStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    aCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = aCtx.createMediaStreamSource(aStream);
    proc = aCtx.createScriptProcessor(4096, 1, 1);  // ce rappel tourne même quand l'onglet est en arrière-plan (les minuteurs, eux, ralentissent)
    const muet = aCtx.createGain(); muet.gain.value = 0;
    src.connect(proc); proc.connect(muet); muet.connect(aCtx.destination);
    proc.onaudioprocess = ev => {
      const x = ev.inputBuffer.getChannelData(0); let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i];
      const db = 20 * Math.log10(Math.max(1e-6, Math.sqrt(s / x.length))); dbNow = db;
      const parle = typeof voice !== 'undefined' && (voice.speaking || Date.now() - (voice.endedAt || 0) < 1500);  // sa propre voix ne compte pas
      if (fond === null) fond = db;
      else if (!parle && db < fond + 10) fond = fond * 0.995 + db * 0.005;  // le fond de la pièce, appris doucement
      if (!parle && etat.arme && db > Math.max(fond + 22, -42)) { if (++fort === 2) evenement('bruit', db); } else fort = 0;
      regardeSiBesoin();  // la caméra est regardée depuis ici aussi : pas de minuteur qui dort en arrière-plan
    };
  }
  function fermeMicro() {
    if (proc) { proc.onaudioprocess = null; try { proc.disconnect(); } catch (e) { /* rien */ } }
    if (aCtx) aCtx.close().catch(() => {});
    if (aStream) aStream.getTracks().forEach(t => t.stop());
    aStream = aCtx = proc = null; dbNow = null; fort = 0;
  }

  /* ---------- la caméra : une petite image grise par seconde ---------- */
  async function ouvreCamera() {
    if (vStream) return;
    vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    vid = document.createElement('video'); vid.muted = true; vid.playsInline = true; vid.srcObject = vStream;
    vid.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-10px;top:-10px';
    document.body.appendChild(vid); await vid.play().catch(() => {});
    petit = document.createElement('canvas'); petit.width = 96; petit.height = 72; pctx = petit.getContext('2d', { willReadFrequently: true });
    camDepuis = Date.now(); prec = null; plum = null; bouge = 0;
  }
  function fermeCamera() {
    if (vStream) vStream.getTracks().forEach(t => t.stop());
    if (vid) vid.remove();
    vStream = vid = null; prec = null;
  }
  let derniereVue = 0;
  function regardeSiBesoin() {
    const now = Date.now();
    if (!vid || vid.readyState < 2 || now - derniereVue < 1000) return;
    derniereVue = now;
    pctx.drawImage(vid, 0, 0, 96, 72);
    const px = pctx.getImageData(0, 0, 96, 72).data, g = new Uint8Array(96 * 72);
    let lum = 0; for (let i = 0; i < g.length; i++) { g[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) | 0; lum += g[i]; }
    lum /= g.length;
    if (prec && now - camDepuis > 8000) {  // la caméra règle sa lumière les premières secondes
      let n = 0; for (let i = 0; i < g.length; i++) if (Math.abs(g[i] - prec[i]) > 28) n++;
      mouv = n / g.length;
      if (etat.arme) {
        if (plum !== null && lum - plum > 40) evenement('lumiere', null);
        else { bouge = mouv > 0.05 ? bouge + 1 : 0; if (bouge === 2) evenement('mouvement', mouv); }
      }
    }
    prec = g; plum = lum;
    if (now - dernierBattement > (etat.rayon ? 2500 : 20000)) battement();
  }

  function photo(max = 640) {
    if (!vid || vid.readyState < 2) return null;
    const w = vid.videoWidth || 640, h = vid.videoHeight || 480, k = Math.min(1, max / w);
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(vid, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.75);
  }

  function evenement(genre, niveau) {
    const now = Date.now();
    if (now - (dernier[genre] || 0) < (genre === 'bruit' ? 45000 : 30000)) return;
    dernier[genre] = now;
    appel('/maison/interieur', { appareil: nomAppareil(), piece: S.settings.pieceAppareil || '', micro: !!aStream, camera: !!vStream, db: dbNow, base: fond, mouvement: mouv,
      evenement: { genre, niveau }, image: photo() }).catch(() => {});
  }

  function battement() {
    dernierBattement = Date.now();
    const img = etat.rayon ? photo(320) : null;
    appel('/maison/interieur', { appareil: nomAppareil(), piece: S.settings.pieceAppareil || '', micro: !!aStream, camera: !!vStream, db: dbNow, base: fond, mouvement: mouv, image: img })
      .then(e => { if (e && typeof e.arme === 'boolean') etat = e; }).catch(() => {});
  }

  /* ---------- la boucle : on demande à la sentinelle si elle est armée ---------- */
  async function boucle() {
    for (;;) {
      try {
        if (root()) {
          const e = await appel('/maison/interieur');
          if (e && typeof e.arme === 'boolean') etat = e;
          const doit = actif() && (etat.arme || etat.rayon);
          if (doit) {
            try { await ouvreMicro(); } catch (er) { /* pas de micro ici */ }
            try { await ouvreCamera(); } catch (er) { /* pas de caméra ici */ }
            if (!aStream) regardeSiBesoin();
            if (Date.now() - dernierBattement > (etat.rayon ? 2500 : 20000)) battement();
          } else if (aStream || vStream) { fermeMicro(); fermeCamera(); }
          oeil(doit && !!(aStream || vStream));
        }
      } catch (e) { /* l'ordinateur de la maison ne répond pas : on réessaie */ }
      await new Promise(r => setTimeout(r, etat.rayon || rayonOuvert ? 2000 : 8000));
    }
  }

  /* ---------- le rayon X ---------- */
  let rayonOuvert = false, rayonFin = 0, camsMaison = [], photosEz = {};
  const FILTRE = 'grayscale(1) invert(1) contrast(1.35) brightness(.95) sepia(1) hue-rotate(165deg) saturate(2.4)';
  function cadre() {
    let o = document.getElementById('rayonx');
    if (o) return o;
    o = document.createElement('div'); o.id = 'rayonx';
    o.innerHTML = `<style>
      #rayonx{position:fixed;inset:0;z-index:9000;background:radial-gradient(ellipse at 50% 40%,#06223a 0%,#020b16 70%);color:#9fe7ff;font-family:Inter,system-ui,sans-serif;overflow:auto;
        background-image:linear-gradient(rgba(80,190,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(80,190,255,.06) 1px,transparent 1px);background-size:40px 40px}
      #rayonx h1{margin:18px 0 4px;text-align:center;letter-spacing:.5em;font-weight:800;font-size:22px;color:#c8f4ff;text-shadow:0 0 14px rgba(90,210,255,.8)}
      #rayonx .sous{text-align:center;font-size:12px;letter-spacing:.3em;color:#5fb7d6;margin-bottom:14px}
      #rayonx .grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:0 18px 24px}
      #rayonx .t{position:relative;border:1px solid rgba(110,210,255,.35);border-radius:10px;overflow:hidden;background:#031424;box-shadow:0 0 18px rgba(60,180,255,.15) inset}
      #rayonx .t img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;filter:${FILTRE}}
      #rayonx .t .vide{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#3f88a6;font-size:13px;letter-spacing:.2em}
      #rayonx .t .n{position:absolute;left:10px;top:8px;font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#d8f7ff;text-shadow:0 0 6px #000}
      #rayonx .t .m{padding:8px 10px;font-size:12px;color:#7fd3f0;display:flex;align-items:center;gap:8px}
      #rayonx .barre{flex:1;height:8px;border-radius:4px;background:rgba(80,190,255,.15);overflow:hidden}
      #rayonx .barre i{display:block;height:100%;background:linear-gradient(90deg,#3fd0ff,#b6f3ff);box-shadow:0 0 8px #5ad8ff}
      #rayonx .scan{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#8ff0ff,transparent);box-shadow:0 0 14px #6be4ff;animation:rayonScan 2.6s linear infinite;pointer-events:none}
      #rayonx .alerte{border-color:#ff5a5a;box-shadow:0 0 22px rgba(255,80,80,.45)}
      @keyframes rayonScan{0%{top:0}100%{top:100%}}
    </style><h1>RAYON X</h1><div class="sous" id="rayonx-sous">ANALYSE DE LA MAISON</div><div class="grille" id="rayonx-grille"></div>`;
    o.addEventListener('click', fermeRayon);
    document.body.appendChild(o);
    return o;
  }
  const tuile = (nom, src, meta, alerte) => `<div class="t${alerte ? ' alerte' : ''}">${src ? `<img src="${src}" alt="">` : '<div class="vide">SIGNAL…</div>'}<div class="scan"></div><div class="n">${nom}</div>${meta ? `<div class="m">${meta}</div>` : ''}</div>`;
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function niveau(db) {
    if (typeof db !== 'number') return 'MICRO —';
    const k = Math.max(0, Math.min(1, (db + 70) / 60));
    return `MICRO <span class="barre"><i style="width:${(k * 100).toFixed(0)}%"></i></span> ${db.toFixed(0)} dB`;
  }
  async function dessine() {
    if (!rayonOuvert) return;
    let e; try { e = await appel('/maison/interieur'); } catch (er) { e = null; }
    const g = document.getElementById('rayonx-grille'); if (!g) return;
    const recents = (e && e.evenements || []).filter(x => Date.now() - x.at < 3600e3);
    const html = [];
    for (const a of (e && e.appareils) || []) {
      const alerte = recents.some(x => x.appareil === a.nom && Date.now() - x.at < 120e3);
      html.push(tuile(esc(a.nom + (a.piece ? ' · ' + a.piece : '')), a.image ? `data:image/jpeg;base64,${a.image}` : null, `${niveau(a.db)}${typeof a.mouvement === 'number' ? ` · MOUV ${(a.mouvement * 100).toFixed(0)} %` : ''}`, alerte));
    }
    for (const c of camsMaison) html.push(tuile(esc(c.nom), c.src, c.meta || 'CAMÉRA DE LA MAISON', false));
    g.innerHTML = html.join('') || tuile('MAISON', null, "Aucun appareil ne répond pour l'instant.", false);
    const sous = document.getElementById('rayonx-sous');
    if (sous) sous.textContent = `${(e && e.appareils || []).length} APPAREILS · ${camsMaison.length} CAMÉRAS · SENTINELLE ${e && e.arme ? 'ARMÉE' : 'EN VEILLE'}`;
  }
  async function camerasMaison() {
    camsMaison = [];
    let noms = [];
    try { const j = await appel('/maison/cameras', null, 10000); noms = (j.cameras || []).map(c => ({ nom: c.nom, type: 'lsc' })); } catch (e) { /* rien */ }
    try { const j = await appel('/maison/ezviz', null, 10000); noms = noms.concat((j.cameras || []).map(c => ({ nom: c.nom, type: 'ez', enLigne: c.en_ligne !== false }))); } catch (e) { /* rien */ }
    camsMaison = noms.map(c => ({ ...c, src: photosEz[c.nom] || null, meta: c.type === 'ez' ? 'CAMÉRA EXTÉRIEURE · RÉVEIL…' : 'CAMÉRA DE LA MAISON' }));
    dessine();
    // une photo de chaque caméra, une par une (les caméras sur batterie mettent quelques secondes à se réveiller)
    for (const c of camsMaison) {
      if (!rayonOuvert) return;
      try {
        const b = await appel(c.type === 'ez' ? `/maison/ezviz/photo?nom=${encodeURIComponent(c.nom)}` : `/maison/camera?nom=${encodeURIComponent(c.nom)}`, null, c.type === 'ez' ? 70000 : 20000);
        if (b instanceof Blob) { c.src = URL.createObjectURL(b); if (c.type === 'ez') photosEz[c.nom] = c.src; c.meta = c.type === 'ez' ? 'CAMÉRA EXTÉRIEURE' : 'CAMÉRA DE LA MAISON'; }
      } catch (e) { c.meta = 'HORS DE PORTÉE'; }
      dessine();
    }
  }
  async function rayonX() {
    if (!root()) return say("L'ordinateur de la maison ne répond pas : pas de rayon X sans lui.");
    rayonOuvert = true; rayonFin = Date.now() + 90000; cadre();
    try { await appel('/maison/interieur', { rayon: true, duree: 90 }); } catch (e) { /* rien */ }
    battement();
    say('Rayon X sur toute la maison.');
    camerasMaison();
    const tic = async () => {
      if (!rayonOuvert) return;
      if (Date.now() > rayonFin) return fermeRayon();
      await dessine(); setTimeout(tic, 2500);
    };
    setTimeout(tic, 1500);
    setTimeout(async () => {
      if (!rayonOuvert) return;
      let e; try { e = await appel('/maison/interieur'); } catch (er) { return; }
      const n = (e.appareils || []).length, recents = (e.evenements || []).filter(x => Date.now() - x.at < 3600e3);
      const fortes = (e.appareils || []).filter(a => typeof a.db === 'number' && typeof a.base === 'number' && a.db > a.base + 15);
      say(`${n ? `${n} appareil${n > 1 ? 's' : ''} écoute${n > 1 ? 'nt' : ''} et regarde${n > 1 ? 'nt' : ''} l'intérieur` : "Aucun appareil d'Atlas ne répond à l'intérieur"}, ${camsMaison.length} caméra${camsMaison.length > 1 ? 's' : ''} de la maison. `
        + (fortes.length ? `Ça fait du bruit en ce moment près de : ${fortes.map(a => a.nom).join(', ')}. ` : '')
        + (recents.length ? `${recents.length} événement${recents.length > 1 ? 's' : ''} à l'intérieur dans la dernière heure.` : "Rien d'anormal à l'intérieur dans la dernière heure."));
    }, 7000);
  }
  function fermeRayon() {
    rayonOuvert = false;
    const o = document.getElementById('rayonx'); if (o) o.remove();
    appel('/maison/interieur', { rayon: true, duree: 10 }).catch(() => {});  // la fin, sans attendre les 90 secondes
  }

  function route(t, n) {
    if (/\b(ferme|arrete|quitte|stop|coupe)\b.*\b(rayon|rayons|radiographie)\b/.test(n)) return () => { fermeRayon(); return say("J'arrête le rayon X."); };
    if (/\b(rayon x|rayons x|rayonx|radiographie|radiographier|radio de la maison|vois a travers|voir a travers|scanne l interieur|scan de l interieur)\b/.test(n)) return rayonX;
    if (/\b(arrete|coupe|desactive)\b.*\b(veille interieure|ecoute de la maison|micros de la maison)\b/.test(n)) return () => { S.settings.veilleInterieure = false; save(); fermeMicro(); fermeCamera(); oeil(false); return say("D'accord : cet appareil n'écoute plus et ne regarde plus la maison quand la sentinelle est armée."); };
    if (/\b(active|remets|rallume|reprends)\b.*\b(veille interieure|ecoute de la maison|micros de la maison)\b/.test(n)) return () => { S.settings.veilleInterieure = true; save(); return say("C'est reparti : quand la sentinelle est armée, cet appareil écoute le niveau sonore et regarde la pièce. Le petit œil rouge te le montre."); };
    return null;
  }

  setTimeout(boucle, 6000);
  return { route, rayonX, fermeRayon, _etat: () => etat };
})();

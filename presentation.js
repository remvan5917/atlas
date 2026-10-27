/* =========================================================
   ATLAS — la présentation : il filme, Atlas fait tout
   « Atlas, lance la présentation » (ou « mode présentation », « présente-toi à la caméra », « moteur, action ») :
   Atlas mène seul tout le film, chapitre par chapitre, plein écran, avec sa voix — le réveil, qui il est (construit seul, en France),
   le bureau, la compta, le trading, la maison (les vraies lumières baissent puis se rallument), ses appareils, sa règle, le robot de demain,
   et la carte de fin. AUCUNE donnée réelle : il ne lit ni les mails, ni la compta, ni le trading (c'est confidentiel) — il montre ce qu'il SAIT faire.
   « Stop » ou « coupez » : il s'arrête, les lumières reviennent comme avant. Le reste du temps, il ne change rien.
   ========================================================= */
const PRESENTATION = (() => {
  try { localStorage.removeItem('atlas-demo'); } catch (e) { /* l'ancien mode démo n'existe plus */ }
  const root = () => VOIXMAISON.root();
  const prenom = () => S.nom || 'Rémy';
  let scene = 0, enCours = false, lumieres = [];
  const attends = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- le décor ---------- */
  const CSS = `
#pres{position:fixed;inset:0;z-index:99990;background:radial-gradient(ellipse at center,#06121f 0%,#010409 72%);display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden;font-family:ui-monospace,Menlo,monospace;color:#a5f3fc;transition:opacity 1s}
#pres .anneaux{position:relative;width:min(54vmin,520px);height:min(54vmin,520px);flex:none}
#pres .anneaux svg{position:absolute;inset:0;width:100%;height:100%}
#pres .r1{animation:pr-tourne 14s linear infinite}#pres .r2{animation:pr-tourne 9s linear infinite reverse}#pres .r3{animation:pr-tourne 22s linear infinite}
#pres .nom{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:200 clamp(34px,8vmin,78px) system-ui;letter-spacing:.5em;padding-left:.5em;color:#e0f2fe;text-shadow:0 0 24px #22d3ee,0 0 60px #0891b2;opacity:0;animation:pr-nom 2.4s .6s forwards}
#pres .journal{margin-top:2.5vh;width:min(92vw,700px);font-size:clamp(12px,1.9vmin,15px);line-height:1.75;min-height:12em}
#pres .journal div{opacity:0;animation:pr-ligne .35s forwards;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pres .ok{color:#4ade80}
#pres .fin{margin-top:2vh;font:700 clamp(14px,2.6vmin,22px) system-ui;letter-spacing:.45em;color:#4ade80;text-shadow:0 0 18px #22c55e;opacity:0}
#pres .balayage{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);box-shadow:0 0 18px #22d3ee;animation:pr-balaye 3.2s ease-in-out infinite;opacity:.55}
#pres .grille{position:absolute;left:0;right:0;bottom:0;width:100%;height:42%}
#pres .chap{position:absolute;top:6vh;left:6vw;font-size:clamp(11px,1.8vmin,14px);letter-spacing:.35em;color:#67e8f9;opacity:.85}
#pres .chap b{color:#e0f2fe;font-weight:700;text-transform:uppercase}
#pres .titre{font:200 clamp(28px,7vmin,72px) system-ui;letter-spacing:.22em;text-transform:uppercase;color:#e0f2fe;text-shadow:0 0 22px #0891b2;text-align:center;padding:0 16px;opacity:0;animation:pr-nom 1.4s forwards}
#pres .tuiles{display:flex;gap:min(3vw,28px);flex-wrap:wrap;justify-content:center;margin-top:5vh;padding:0 16px}
#pres .tuile{min-width:min(26vw,220px);padding:2.2vmin 2.6vmin;border:1px solid rgba(34,211,238,.35);border-radius:14px;background:rgba(2,16,28,.6);box-shadow:0 0 30px rgba(8,145,178,.18) inset;opacity:0;transform:translateY(14px);animation:pr-monte .7s forwards;text-align:left}
#pres .tuile .v{font:700 clamp(20px,4vmin,40px) system-ui;color:#e0f2fe;text-shadow:0 0 18px #22d3ee}
#pres .tuile .l{margin-top:.6vmin;font-size:clamp(11px,1.8vmin,14px);letter-spacing:.12em;color:#7dd3fc;text-transform:uppercase}
#pres .phrase{position:absolute;bottom:7vh;left:0;right:0;text-align:center;font:300 clamp(16px,3vmin,28px) system-ui;color:#e0f2fe;letter-spacing:.04em;padding:0 16px;text-shadow:0 0 14px #0891b2;transition:opacity .5s}
#pres .robot{height:min(62vh,540px);width:auto;filter:drop-shadow(0 0 8px #22d3ee) drop-shadow(0 0 22px #0891b2)}
#pres .robot *{fill:none;stroke:#67e8f9;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:var(--l);stroke-dashoffset:var(--l);animation:pr-trace 2.2s forwards}
#pres .etapes{position:absolute;top:7vh;left:6vw;font-size:clamp(11px,1.9vmin,15px);line-height:1.9;text-align:left;padding:10px 14px;border:1px solid rgba(34,211,238,.25);border-radius:10px;background:rgba(2,12,20,.5)}
#pres .etapes div{opacity:0;animation:pr-ligne .5s forwards}
#pres .coin{position:absolute;top:7vh;right:6vw;text-align:right;font-size:clamp(10px,1.6vmin,13px);letter-spacing:.25em;line-height:1.8;color:#67e8f9;opacity:.8}
#pres .regle{font:800 clamp(30px,8vmin,86px) system-ui;letter-spacing:.06em;color:#fff;text-align:center;padding:0 16px;text-shadow:0 0 30px #22d3ee;opacity:0;animation:pr-nom 1.6s forwards}
#pres .france{width:min(60vw,420px);height:3px;margin:3vh auto 0;background:linear-gradient(90deg,#1d4ed8 0 33%,#f8fafc 33% 66%,#dc2626 66%);box-shadow:0 0 16px rgba(248,250,252,.4);transform:scaleX(0);animation:pr-trait 1.4s 1s forwards}
#pres .signe{margin-top:2.4vh;font:300 clamp(14px,2.6vmin,22px) system-ui;letter-spacing:.3em;color:#cbd5e1;text-align:center;opacity:0;animation:pr-ligne 1s 1.8s forwards}
@keyframes pr-tourne{to{transform:rotate(360deg)}}@keyframes pr-nom{0%{opacity:0;letter-spacing:1.2em;filter:blur(8px)}100%{opacity:1;filter:none}}
@keyframes pr-ligne{to{opacity:1}}@keyframes pr-balaye{0%{top:8%}50%{top:92%}100%{top:8%}}@keyframes pr-trace{to{stroke-dashoffset:0}}
@keyframes pr-monte{to{opacity:1;transform:none}}@keyframes pr-trait{to{transform:scaleX(1)}}@keyframes pr-clignote{0%,100%{opacity:1}50%{opacity:.25}}`;
  function ecran(html) {
    if (!document.getElementById('pres-css')) { const s = document.createElement('style'); s.id = 'pres-css'; s.textContent = CSS; document.head.appendChild(s); }
    let d = document.getElementById('pres');
    if (!d) { d = document.createElement('div'); d.id = 'pres'; d.style.opacity = '0'; document.body.appendChild(d); requestAnimationFrame(() => { d.style.opacity = '1'; }); }
    d.innerHTML = html;
    return d;
  }
  async function fermeEcran() { const d = document.getElementById('pres'); if (!d) return; d.style.opacity = '0'; await attends(1000); d.remove(); }
  const anneaux = (nom = 'ATLAS') => `<div class="anneaux">
<svg class="r1" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="#22d3ee" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="2 5"/><circle cx="100" cy="100" r="86" fill="none" stroke="#0e7490" stroke-width="2.5" stroke-dasharray="60 18 8 18"/></svg>
<svg class="r2" viewBox="0 0 200 200"><circle cx="100" cy="100" r="74" fill="none" stroke="#67e8f9" stroke-width="1.2" stroke-dasharray="120 40 10 40"/><circle cx="100" cy="100" r="68" fill="none" stroke="#155e75" stroke-width="5" stroke-dasharray="3 9"/></svg>
<svg class="r3" viewBox="0 0 200 200"><circle cx="100" cy="100" r="56" fill="none" stroke="#a5f3fc" stroke-opacity=".7" stroke-width=".6"/><path d="M100 30 L104 40 L96 40 Z M100 170 L104 160 L96 160 Z" fill="#22d3ee"/></svg>
<div class="nom">${nom}</div></div>`;
  function sol() { // une grille de hangar en perspective, dessinée à plat
    const L = [];
    for (let i = 0; i <= 12; i++) { const y = 100 * Math.pow(i / 12, 1.8); L.push(`<line vector-effect="non-scaling-stroke" x1="0" y1="${y.toFixed(1)}" x2="1000" y2="${y.toFixed(1)}" stroke-opacity="${(0.05 + 0.25 * i / 12).toFixed(2)}"/>`); }
    for (let i = -14; i <= 14; i++) L.push(`<line vector-effect="non-scaling-stroke" x1="${500 + i * 12}" y1="0" x2="${500 + i * 95}" y2="100" stroke-opacity=".18"/>`);
    return `<svg class="grille" viewBox="0 0 1000 100" preserveAspectRatio="none" stroke="#22d3ee" stroke-width=".6">${L.join('')}</svg>`;
  }
  const bip = seq => { try { fx.tone(seq); } catch (e) { /* sans son */ } };
  // une phrase à l'écran, dite de sa voix
  async function dit(d, t) { const ph = d.querySelector('.phrase'); if (ph) { ph.style.opacity = '0'; await attends(250); ph.textContent = t; ph.style.opacity = '1'; } await say(t); await attends(250); }
  const tuile = (v, l, i) => `<div class="tuile" style="animation-delay:${0.25 + i * 0.25}s"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`;
  const chapitre = (n, nom, tuiles) => `${sol()}<div class="chap">${String(n).padStart(2, '0')} · <b>${esc(nom)}</b></div><div class="titre">${esc(nom)}</div><div class="tuiles">${tuiles.join('')}</div><div class="phrase" style="opacity:0"></div>`;

  /* ---------- les vraies lumières : elles baissent au début, se rallument pour « la maison », reviennent comme avant à la fin ---------- */
  async function lampes() {
    try { await MAISON.liste(true); } catch (e) { return []; }
    return (MAISON._appareils() || []).filter(a => a.allume === true && a.lum != null);
  }
  async function eclaire(l, lum, teinte) {
    if (!l.length || !root()) return;
    try { await fetch(`${root()}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: l.map(a => a.id), allume: true, lum, teinte, source: 'auto' }) }); } catch (e) { /* tant pis */ }
  }
  async function rends() { // chacune retrouve son intensité et sa teinte d'avant
    const l = lumieres; lumieres = [];
    for (const a of l) { try { await fetch(`${root()}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [a.id], allume: true, lum: a.lum, teinte: a.teinte == null ? undefined : a.teinte, source: 'auto' }) }); } catch (e) { /* tant pis */ } }
  }

  /* ---------- le film ---------- */
  async function film() {
    const moi = ++scene, fini = () => moi !== scene;
    enCours = true; const discret = dlg.discret; dlg.discret = true; // pendant le film, il ne répond qu'à son nom (et à « stop »)
    try { hideBoard(); } catch (e) { /* rien */ }
    try {
      lumieres = await lampes();
      const avant = lumieres.map(a => ({ id: a.id, lum: a.lum, teinte: a.teinte }));
      lumieres = avant;

      // 00 · le réveil : la maison s'éteint, Atlas s'allume
      eclaire(avant, 8, 0);
      let d = ecran(`<div class="balayage"></div>${anneaux()}<div class="journal"></div><div class="fin">SYSTÈMES OPÉRATIONNELS</div>`);
      const j = d.querySelector('.journal');
      const lignes = [['Noyau neuronal', 'en ligne'], ['Voix', 'synthèse active'], ['Vision', 'active'], ['Mémoire', 'chargée'], ['Bureau', 'prêt'], ['Comptabilité', 'prête'],
        ['Copilote de trading', 'en veille'], ['Maison', 'connectée'], ['Ordinateur · tablette · iPhone', 'synchronisés'], ['Protocole de confiance', 'rien ne part sans son oui']];
      bip([[220, 0.25], [330, 0.25], [440, 0.4]]);
      await attends(2600);
      for (const [k, v] of lignes) {
        if (fini()) return;
        const el = document.createElement('div'); el.innerHTML = `<span class="ok">[ OK ]</span> ${esc(k)} ${'·'.repeat(Math.max(3, 34 - k.length))} ${esc(v)}`;
        j.appendChild(el); bip([[1320, 0.03]]); await attends(360);
      }
      d.querySelector('.fin').style.cssText = 'opacity:1;animation:pr-clignote 1s 3';
      bip([[660, 0.12], [990, 0.12], [1320, 0.3]]); await attends(2200);
      if (fini()) return;

      // 01 · qui je suis
      d = ecran(`${sol()}${anneaux('')}<div class="phrase" style="opacity:0"></div>`);
      for (const t of ['Bonjour. Je suis Atlas.', "Je suis l'intelligence artificielle de cette maison.",
        `Je n'ai pas été conçu dans la Silicon Valley. ${prenom()} m'a construit lui-même. Seul. Ici, en France.`,
        'Laissez-moi vous montrer ce que je fais pour lui. Chaque jour.']) { if (fini()) return; await dit(d, t); }

      // 02 · le bureau
      d = ecran(chapitre(1, 'Le bureau', [tuile('Ses mails', 'lus chaque matin', 0, true), tuile('Les réponses', 'écrites dans son style', 1, true), tuile('L’envoi', 'après son oui', 2, true)]));
      for (const t of ["Chaque matin, je lis ses mails : ceux de sa société, et les siens.", "Je comprends ce qu'il faut faire, et j'écris les réponses. Dans son style.",
        'Il relit. Il dit oui. C’est envoyé.']) { if (fini()) return; await dit(d, t); }

      // 03 · la comptabilité
      d = ecran(chapitre(2, 'La comptabilité', [tuile('Les factures', 'retrouvées chez les fournisseurs', 0, true), tuile('Le tableau', 'rempli seul', 1, true), tuile('La réponse', 'prête à valider', 2, true)]));
      for (const t of ['Quand son cabinet comptable demande des pièces, je vais chercher les vraies factures, chez les fournisseurs.', 'Je remplis le tableau. Je prépare la réponse. Il n’a plus qu’à valider.']) { if (fini()) return; await dit(d, t); }

      // 04 · le trading
      d = ecran(chapitre(3, 'Le trading', [tuile('Le journal', 'tenu tout seul', 0, true), tuile('Les limites', 'surveillées en direct', 1, true), tuile('Les conseils', 'jamais', 2, true)]));
      for (const t of [`${prenom()} est trader. Pendant ses séances, je tiens son journal tout seul, trade par trade.`, 'Je surveille ses limites, en temps réel.', 'Jamais un conseil. Un miroir.']) { if (fini()) return; await dit(d, t); }

      // 05 · la maison : les vraies lumières se rallument
      d = ecran(chapitre(4, 'La maison', [tuile('Les lumières', 'à la voix', 0, true), tuile('Les caméras', 'et l’alarme', 1, true), tuile('L’imprimante', 'et l’ordinateur', 2, true)]));
      if (fini()) return;
      await dit(d, 'Et je vis dans sa maison.');
      bip([[523, 0.08], [784, 0.12]]); await eclaire(avant, 100, 100); await attends(900);
      for (const t of ["Les lumières, les caméras, l'alarme, l'imprimante… La maison m'écoute."]) { if (fini()) return; await dit(d, t); }

      // 06 · partout
      d = ecran(chapitre(5, 'Partout', [tuile('Ordinateur', 'synchronisé', 0, true), tuile('Tablette', 'synchronisée', 1, true), tuile('iPhone', 'synchronisé', 2, true)]));
      for (const t of ['Je suis sur son ordinateur, sa tablette, son iPhone.', 'Une seule mémoire. Une seule voix.']) { if (fini()) return; await dit(d, t); }

      // 07 · la règle
      d = ecran(`${sol()}<div class="regle">RIEN NE PART<br>SANS SON OUI.</div>`);
      bip([[392, 0.3]]);
      for (const t of ['Et une seule règle.', 'Rien ne part sans son oui.']) { if (fini()) return; await dit(d, t); }

      // 08 · demain : le robot se dessine
      d = ecran(`${sol()}<svg class="robot" viewBox="80 20 240 380">${ROBOT.map((p, i) => `<path d="${p}" style="--l:700;animation-delay:${0.12 * i}s"/>`).join('')}<path d="M172 74 q28 -9 56 0" style="--l:120;animation-delay:3.4s;stroke:#e0f2fe;stroke-width:4;filter:blur(1px)"/></svg>
<div class="etapes"></div><div class="coin">PROJET ATLAS<br>CORPS · V0.1<br><span style="color:#fbbf24">EN CONSTRUCTION</span></div><div class="phrase" style="opacity:0"></div>`);
      const e = d.querySelector('.etapes');
      bip([[110, 0.6], [165, 0.6]]); await attends(1600);
      for (const [a, b, c] of [['PHASE 1', 'LA VOIX', '✓'], ['PHASE 2', 'LES YEUX', '✓'], ['PHASE 3', 'LE CERVEAU', '✓'], ['PHASE 4', 'LE CORPS', 'EN CONSTRUCTION']]) {
        if (fini()) return;
        const el = document.createElement('div'); el.innerHTML = `<span style="color:#64748b">${a}</span> · ${b} <span style="color:${c === '✓' ? '#4ade80' : '#fbbf24'};${c === '✓' ? '' : 'animation:pr-clignote 1.2s infinite'}">${c}</span>`;
        e.appendChild(el); bip([[c === '✓' ? 1175 : 587, 0.06]]); await attends(800);
      }
      for (const t of ["Aujourd'hui, j'ai une voix. Des yeux. Un cerveau.", 'Mais tout ça tient encore dans un écran.', 'La prochaine étape, c’est un corps.']) { if (fini()) return; await dit(d, t); }

      // 09 · la carte de fin
      d = ecran(`<div class="balayage"></div>${anneaux()}<div class="france"></div><div class="signe">CONÇU ET CONSTRUIT SEUL · EN FRANCE<br><span style="color:#e0f2fe;letter-spacing:.35em">${esc(prenom().toUpperCase())} VANCOPPENOLLE</span></div><div class="phrase" style="opacity:0"></div>`);
      bip([[440, 0.2], [554, 0.2], [659, 0.5]]); await attends(1800);
      for (const t of ['Je suis Atlas.', "Construit par un seul homme, chez lui, en France. Et ce n'est que le début."]) { if (fini()) return; await dit(d, t); }
      await attends(3500);
      if (!fini()) await fermeEcran();
    } finally {
      if (moi === scene) { enCours = false; dlg.discret = discret; await rends(); }
    }
  }
  async function arrete() {
    scene++; enCours = false;
    try { voice.stop(); } catch (e) { /* rien */ }
    await fermeEcran(); await rends();
    dlg.discret = false;
    return say('Coupé.');
  }
  // pendant le film, il ne s'interrompt pas pour une annonce
  setTimeout(() => { if (typeof PROACTIF !== 'undefined' && PROACTIF.annonce) { const a = PROACTIF.annonce.bind(PROACTIF); PROACTIF.annonce = (...x) => (enCours ? null : a(...x)); } }, 1500);

  const ROBOT = [
    'M200 30 c26 0 40 16 40 40 v14 c0 22 -16 36 -40 36 s-40 -14 -40 -36 v-14 c0 -24 14 -40 40 -40 z', 'M168 72 q32 -12 64 0 q-2 16 -32 18 q-30 -2 -32 -18 z', 'M188 120 l4 14 h16 l4 -14',
    'M150 140 q50 -14 100 0 l-10 70 q-40 22 -80 0 z', 'M188 172 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 'M164 192 q36 10 72 0', 'M168 222 h64 l-6 30 h-52 z',
    'M133 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', 'M249 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
    'M136 156 l-20 58', 'M110 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M116 220 l-6 48', 'M110 268 l-6 14 m6 -14 l0 15 m0 -15 l6 13',
    'M264 156 l20 58', 'M278 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M284 220 l6 48', 'M290 268 l6 14 m-6 -14 l0 15 m0 -15 l-6 13',
    'M180 252 l-8 64', 'M166 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M172 328 l-4 52', 'M156 384 h24',
    'M220 252 l8 64', 'M222 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M228 328 l4 52', 'M220 384 h24',
  ];

  function route(t, n) {
    if (enCours && /^(stop|coupez|coupe|arrete|arrete la presentation|on arrete|c est bon stop)\b/.test(n)) return arrete;
    if (/\b(lance la presentation|mode presentation|presente toi a la camera|presente toi aux gens|moteur action|lance le film|fais ta presentation|on tourne)\b/.test(n)) return film;
    return null;
  }
  return { route, film, arrete, enCours: () => enCours };
})();

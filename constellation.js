/* =========================================================
   ATLAS — la constellation : la tablette, l'ordinateur et le téléphone travaillent ensemble
   - Un rôle par appareil : la tablette = le poste de commandement (le cockpit au démarrage, la voix de la maison),
     l'ordinateur = le poste de travail (le cockpit « travail » : la session de trading, la boîte noire, les marchés),
     le téléphone = la télécommande de poche.
   - « Envoie ça sur mon téléphone / l'ordi / la tablette » : l'écran affiché (ou la dernière réponse) passe sur l'autre appareil ;
     « montre les caméras sur l'ordi », « mode cockpit sur la tablette » : l'ordre s'exécute là-bas.
   - Une seule mémoire : ce qu'il a demandé à un appareil (30 dernières minutes), les autres le savent.
   - Atlas le suit : l'appareil qu'il vient de toucher, de taper ou de parler répond ; les annonces non urgentes ne sont dites
     que là où il est (les alertes urgentes, partout).
   ========================================================= */
'use strict';

const CONSTELLATION = (() => {
  const UA = navigator.userAgent;
  const role = /iPhone/.test(UA) || (/Android/.test(UA) && /Mobile/.test(UA)) ? 'telephone' : /iPad/.test(UA) || /Android/.test(UA) ? 'tablette' : 'ordinateur';
  const NOMS = { tablette: 'la tablette', ordinateur: "l'ordinateur", telephone: 'le téléphone' };
  async function appel(chemin, corps, ms = 15000) {
    const r0 = VOIXMAISON.root(); if (!r0 || window.__BANC) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }

  /* ---------- où il est : le dernier appareil touché, tapé, ou à qui il a parlé ---------- */
  let actifAt = 0, pingAt = 0, ou = null, ouAt = 0;
  function actif() {
    actifAt = Date.now();
    if (Date.now() - pingAt < 15000) return;
    pingAt = Date.now();
    appel('/atlas/actif', { id: monId, role, piece: S.settings.piece || '' }, 8000).then(r => { ou = r; ouAt = Date.now(); }).catch(() => {});
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, actif, { passive: true, capture: true }));
  async function majOu() { try { ou = await appel('/atlas/ou', null, 8000); ouAt = Date.now(); } catch (e) { /* plus tard */ } }
  setInterval(majOu, 20000); setTimeout(majOu, 4000);
  // cet appareil est-il celui où il est ? (sans nouvelles de la maison : oui, par prudence)
  function principal() {
    if (!ou || Date.now() - ouAt > 90000) return true;
    return ou.id ? ou.id === monId : ou.role === role;
  }

  /* ---------- une seule mémoire : le fil commun ---------- */
  const aEnvoyer = []; let filT = null;
  function note(qui, texte) {
    const t = String(texte || '').trim(); if (!t || window.__BANC) return;
    aEnvoyer.push({ qui, texte: t.slice(0, 600) });
    clearTimeout(filT); filT = setTimeout(() => { const l = aEnvoyer.splice(0); if (l.length) appel('/atlas/fil', { id: monId, role, l }, 8000).catch(() => {}); }, qui === 'atlas' ? 0 : 2500); // sa propre voix : tout de suite (les autres appareils ne la prendront pas pour un ordre)
  }
  async function contexte() {
    try {
      const r = await Promise.race([appel(`/atlas/fil?sauf=${encodeURIComponent(monId)}`, null, 3000), wait(1500).then(() => null)]);
      const l = (r && r.fil) || [];
      if (!l.length) return '';
      return `Ce qui vient de se dire sur les autres appareils de la maison (c'est la même conversation, tu peux t'y référer) :\n${l.map(x => `${hhmm(new Date(x.at * 1000))}, ${NOMS[x.role] || x.role} — ${x.qui === 'atlas' ? 'toi' : 'lui'} : ${x.texte}`).join('\n')}`;
    } catch (e) { return ''; }
  }

  /* ---------- les écrans qui passent d'un appareil à l'autre ---------- */
  const lireData = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => res(''); f.readAsDataURL(b); })).catch(() => '');
  async function capture() {
    const b = document.getElementById('board');
    if (b && !b.hidden && b.innerHTML.trim()) {
      const c = b.cloneNode(true), vrais = [...b.querySelectorAll('canvas')];
      [...c.querySelectorAll('canvas')].forEach((x, i) => { try { const im = document.createElement('img'); im.src = vrais[i].toDataURL('image/png'); im.style.width = '100%'; x.replaceWith(im); } catch (e) { x.remove(); } });
      for (const im of c.querySelectorAll('img')) if (/^blob:/.test(im.src)) im.src = await lireData(im.src);
      c.querySelectorAll('video,script,iframe').forEach(x => x.remove());
      return { html: c.innerHTML, titre: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) };
    }
    const t = (typeof lastSaid === 'string' && lastSaid) || '';
    if (!t) return null;
    return { html: `<div style="font:500 clamp(17px,2.4vw,24px)/1.5 system-ui;padding:14px;border:1px solid #1e6a8a;border-radius:12px;background:#04121f;color:#e0f2fe">${esc(t)}</div>`, titre: t.slice(0, 60) };
  }
  async function envoie(cible) {
    if (cible === role) return say('Tu es déjà dessus.');
    const x = await capture();
    if (!x) return say("Je n'ai rien à l'écran à envoyer.");
    if (x.html.length > 2700000) return say("C'est trop lourd à envoyer, désolé.");
    try { await appel(`/atlas/ecran/${cible}`, { type: 'ecran', html: x.html, titre: x.titre, de: NOMS[role] }, 30000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.tone([[880, 0.06], [1319, 0.1]]);
    return say(`Envoyé sur ${NOMS[cible]}.`);
  }
  async function commande(cible, texte) {
    try { await appel(`/atlas/ecran/${cible}`, { type: 'commande', texte, titre: texte, de: NOMS[role] }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.tone([[880, 0.06], [1319, 0.1]]);
    return say(`C'est parti, sur ${NOMS[cible]}.`);
  }
  function recoit(m) {
    fx.tone([[1319, 0.06], [880, 0.1]]);
    if (m.type === 'commande') { if (m.texte && typeof handle === 'function') handle(m.texte); return; }
    showBoard(`<div style="font:11px ui-monospace,monospace;letter-spacing:.25em;color:#7dd3fc;margin-bottom:8px">◢ REÇU DEPUIS ${esc(String(m.de || '').toUpperCase())} · ${esc(hhmm(new Date(m.at * 1000)))}</div>${m.html || esc(m.texte || '')}`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 5 * 60000);
  }
  async function boucle() {
    for (;;) {
      if (!VOIXMAISON.root() || window.__BANC) { await wait(10000); continue; }
      try { const r = await appel(`/atlas/ecran/${role}?attente=25`, null, 35000); (r.messages || []).forEach(recoit); }
      catch (e) { await wait(15000); }
    }
  }
  setTimeout(boucle, 3000);

  /* ---------- le rôle de chaque appareil ---------- */
  // la tablette s'ouvre d'elle-même sur le cockpit (la première fois ; ensuite, elle se souvient)
  setTimeout(() => { try { if (role === 'tablette' && localStorage.getItem('atlas-cockpit') === null && typeof SCIFI !== 'undefined') SCIFI.modeCockpit(true); } catch (e) { /* rien */ } }, 2500);

  const CIBLE = /\b(?:sur|a|vers|dans) (?:mon |ma |le |la |l )?(telephone|portable|tel|ordi|ordinateur|pc|tablette)\s*$/;
  const quelle = w => (/^(telephone|portable|tel)$/.test(w) ? 'telephone' : /^(ordi|ordinateur|pc)$/.test(w) ? 'ordinateur' : 'tablette');
  function route(t, n) {
    const m = n.match(CIBLE);
    if (!m) return null;
    const cible = quelle(m[1]);
    const reste = n.slice(0, m.index).trim();
    if (/^(envoie|envoi|transfere|passe|balance|mets|affiche|montre)( moi)?( (ca|ceci|cela|tout ca|l ecran|ce que tu (montres|affiches)|la reponse|la recette|le resultat))?$/.test(reste)) return () => envoie(cible);
    if (reste.split(' ').length < 2) return null;
    if (cible === role) return typeof handle === 'function' ? () => handle(String(t).replace(/\s*(?:sur|à|a|vers|dans)\s+(?:mon |ma |le |la |l['’]\s*)?(?:téléphone|telephone|portable|tel|ordi|ordinateur|pc|tablette)\s*[.!?]*$/i, '')) : null;
    return () => commande(cible, String(t).replace(/^\s*atlas[\s,]*/i, '').replace(/\s*(?:sur|à|a|vers|dans)\s+(?:mon |ma |le |la |l['’]\s*)?(?:téléphone|telephone|portable|tel|ordi|ordinateur|pc|tablette)\s*[.!?]*$/i, ''));
  }
  return { route, role, actif, principal, note, contexte, actifDepuis: () => (actifAt ? Math.round((Date.now() - actifAt) / 1000) : 99999), ou: () => ou };
})();

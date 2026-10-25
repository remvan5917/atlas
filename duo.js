/* =========================================================
   ATLAS — le duo avec Shadow, et l'accueil comme dans les films
   - « Atlas, discute avec Shadow » (« … sur les dinosaures ») : un sketch écrit par le cerveau, joué à deux voix,
     Atlas sérieux et un peu snob, Shadow farceur ; chaque réplique de Shadow part par le canal, Shadow la dit et répond « fini ».
   - Le petit demande à Shadow « demande à Atlas pourquoi le ciel est bleu » : Atlas répond (à voix haute s'il est à la maison)
     et renvoie la réponse à Shadow, qui l'affiche en hologramme (et la lit s'il est loin).
   - L'accueil : papa ou son fils qui rentrent (vus à la caméra, ou leur téléphone revenu sur le Wi-Fi), les deux ensemble,
     les invités (un visage ou une voix inconnus, ou « Atlas, accueille nos invités ») : identification à l'écran, sons, la phrase.
   - Le canal atlas n'a qu'une seule boucle de lecture (ici) : les autres (la fusée) attendent leurs messages par DUO.attends.
   ========================================================= */
'use strict';

const DUO = (() => {
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
  const versShadow = msg => appel('/maison/canal/shadow', Object.assign({ de: 'atlas' }, msg), 10000);
  const sfx = q => { try { VISIO.sfx(q); } catch (e) { /* pas de son */ } };
  const enfant = () => (typeof LIEN !== 'undefined' && LIEN.prenom()) || '';
  const papa = () => S.nom || '';

  /* ---------- le canal : une seule boucle, des attentes ---------- */
  const boite = [], attentes = [];
  let boucleActive = false, pompe = false;
  function distribue(m) {
    const i = attentes.findIndex(w => w.type === m.type);
    if (i >= 0) { const w = attentes.splice(i, 1)[0]; clearTimeout(w.t); w.res(m); return; }
    if (m.type === 'question') { repondre(m); return; }
    if (m.type === 'dissuasion') { if (typeof FUTUR !== 'undefined') FUTUR.voixSentinelle(); return; } // la tablette, avec la sono
    if (m.type === 'aventure' || m.type === 'aventure-fin') { glitch(m.texte, m.type === 'aventure-fin'); return; } // l'aventure de la maison : Atlas joue le méchant
    if (m.type === 'annonce') { annonce(m); return; } // l'interphone : un message de son fils, ou une nouvelle de la maison, dit tout de suite
    boite.push(m); if (boite.length > 20) boite.shift();
  }
  async function tire(sec) {
    const r = await appel(`/maison/canal/atlas?attente=${Math.max(0, Math.round(sec))}`, null, (sec + 8) * 1000);
    (r.messages || []).forEach(distribue);
  }
  function attends(type, ms) {
    const i = boite.findIndex(m => m.type === type);
    if (i >= 0) return Promise.resolve(boite.splice(i, 1)[0]);
    return new Promise(res => {
      const w = { type, res }; w.t = setTimeout(() => { const k = attentes.indexOf(w); if (k >= 0) attentes.splice(k, 1); res(null); }, ms);
      attentes.push(w);
      if (!boucleActive && !pompe) (async () => { pompe = true; try { while (attentes.length) { try { await tire(8); } catch (e) { await wait(1000); } } } finally { pompe = false; } })();
    });
  }
  const vide = () => { boite.length = 0; };
  // la boucle permanente : seulement sur les appareils posés dans une pièce (l'ordinateur, la tablette), pas le téléphone dans la poche
  async function boucle() {
    for (;;) {
      if (!root() || !dlg.started || !S.settings.piece || pompe) { boucleActive = false; await wait(10000); continue; }
      boucleActive = true;
      try { await tire(25); } catch (e) { await wait(15000); }
    }
  }
  setTimeout(boucle, 8000);

  /* ---------- l'aventure dans la maison : le Professeur Glitch a « piraté » Atlas (Shadow mène le jeu) ----------
     L'écran se brouille, une voix de méchant (la voix d'Atlas, en plus grave quand c'est possible), puis à la fin
     « système restauré » et Atlas reprend sa voix. */
  let glitchEl = null, glitchFin = 0;
  const glitchEnleve = ms => { clearTimeout(glitchFin); glitchFin = setTimeout(() => { if (glitchEl) { glitchEl.remove(); glitchEl = null; } }, ms); };
  async function glitch(texte, fin) {
    if (!texte || !dlg.started || voice.endormi) return;
    clearTimeout(glitchFin);
    if (!glitchEl) {
      glitchEl = document.createElement('div');
      glitchEl.style.cssText = 'position:fixed;inset:0;z-index:72;display:grid;place-items:center;pointer-events:none;font-family:ui-monospace,monospace;background:rgba(10,0,18,.82);overflow:hidden';
      glitchEl.innerHTML = `<style>@keyframes gl1{0%,100%{transform:translate(0)}20%{transform:translate(-4px,2px)}40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,-1px)}80%{transform:translate(4px,1px)}}
        @keyframes gl2{0%{clip-path:inset(10% 0 70% 0)}25%{clip-path:inset(60% 0 15% 0)}50%{clip-path:inset(30% 0 45% 0)}75%{clip-path:inset(80% 0 5% 0)}100%{clip-path:inset(5% 0 85% 0)}}
        .glt{position:relative;font:900 clamp(34px,8vw,92px) system-ui;letter-spacing:.06em;color:#f0abfc;text-shadow:3px 0 #22d3ee,-3px 0 #f43f5e;animation:gl1 .35s steps(2) infinite}
        .glt::after{content:attr(data-t);position:absolute;inset:0;color:#a3e635;animation:gl2 .9s steps(4) infinite}
        .gls{margin-top:14px;font-size:clamp(14px,2.4vw,22px);letter-spacing:.3em;color:#f5d0fe;text-align:center}
        .glb{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,transparent 2px 4px)}</style>
        <div class="glb"></div><div style="text-align:center"><div class="glt" data-t="PROFESSEUR GLITCH">PROFESSEUR GLITCH</div><div class="gls" id="gl-s">INTRUSION · ATLAS PIRATÉ</div></div>`;
      document.body.appendChild(glitchEl);
    }
    try { const c = fx.audio(), t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; g.gain.value = 0.08; o.connect(g); g.connect(c.destination); for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(i % 2 ? 140 : 95, t0 + i * 0.07); o.start(t0); o.stop(t0 + 0.6); } catch (e) { /* pas de son */ }
    await wait(500);
    try { await say(texte); } catch (e) { /* rien */ }
    if (!fin) { glitchEnleve(1500); return; }
    if (!glitchEl) return;
    // la victoire du capitaine : la maison revient à Atlas
    const s = glitchEl.querySelector('#gl-s'); glitchEl.style.background = 'rgba(2,20,12,.86)';
    glitchEl.querySelector('.glt').textContent = 'SYSTÈME RESTAURÉ'; glitchEl.querySelector('.glt').dataset.t = 'SYSTÈME RESTAURÉ'; glitchEl.querySelector('.glt').style.color = '#4ade80';
    if (s) s.textContent = 'ATLAS · DE NOUVEAU AUX COMMANDES';
    sfx('final'); await wait(900);
    try { await say(`Merci, capitaine${enfant() ? ` ${enfant()}` : ''}. Le Professeur Glitch est parti, et la maison est de nouveau sous contrôle. Je n'aurais pas pu le faire sans toi.`); } catch (e) { /* rien */ }
    glitchEnleve(2500);
  }

  /* ---------- l'interphone : ce que son fils dit à Shadow pour papa, dit tout de suite par la tablette ---------- */
  async function annonce(m) {
    if (!dlg.started || voice.endormi) return;
    const de = String(m.de || ''), id = Number(de.split('#')[1]);
    for (let k = 0; k < 40 && voice.occupe(); k++) await wait(500);
    sfx('scan');
    if (/^enfant/.test(de)) {
      const t = String(m.texte || '').trim();
      await say(`Message de ${enfant() || 'ton fils'} : « ${t} ».`);
      if (id) appel('/maison/messages', { lu: id }).catch(() => {}); // (déjà dit : il ne reviendra pas)
    } else if (m.texte) await say(String(m.texte));
  }

  /* ---------- le petit pose une question à Atlas, par Shadow ---------- */
  let derniereQ = 0;
  async function repondre(m) {
    const q = String(m.texte || '').trim().slice(0, 300);
    if (!q || Date.now() - derniereQ < 8000) return;
    derniereQ = Date.now();
    const p = enfant() || 'le petit';
    let rep = '';
    try {
      rep = String(await AI.chat([{ role: 'system', content: `Tu es Atlas, l'intelligence artificielle de la maison : très savant, un peu snob et cérémonieux, comme C-3PO, mais tendre. ${p}, un enfant, te pose une question par Shadow, son petit robot. Réponds en 2 ou 3 phrases simples et exactes, à sa portée, avec une pointe d'humour. Tu le vouvoies pour rire (« jeune maître »). Pas de liste, pas d'emoji, rien qui fasse peur.` }, { role: 'user', content: q }], { maxTokens: 220, temperature: 0.7 }) || '').trim();
    } catch (e) { rep = ''; }
    if (!rep) { versShadow({ type: 'reponse-atlas', texte: '', aVoix: false }).catch(() => {}); return; }
    let chez = true; try { chez = (await appel('/maison/shadow', null, 8000)).a_la_maison !== false; } catch (e) { /* on suppose */ }
    if (!chez || !dlg.started || voice.endormi) { versShadow({ type: 'reponse-atlas', texte: rep, aVoix: false }).catch(() => {}); return; }
    // à voix haute, dès qu'il a fini de parler ; puis la réponse part chez Shadow (en hologramme)
    PROACTIF.annonce(`question-${Date.now()}`, async () => {
      sfx('scan');
      await say(`Transmission de Shadow. ${p} demande : ${q.replace(/[?.!\s]+$/, '')} ? ${rep}`);
      versShadow({ type: 'reponse-atlas', texte: rep, aVoix: true }).catch(() => {});
      return '';
    }, { urgent: true, expire: Date.now() + 60000 }); // s'il ne peut pas parler à temps, Shadow lira la réponse lui-même (il n'attend que 45 s)
  }

  /* ---------- le sketch à deux voix ---------- */
  function scene(lignes) {
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:12px 14px">
      <div style="font-size:11px;letter-spacing:.2em;color:#7dd3fc">◢ DUO · ATLAS & SHADOW</div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:8px 0"></div>
      <div id="duo-l" style="display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow:auto"></div></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 5 * 60000);
    return (qui, t) => {
      const l = document.getElementById('duo-l'); if (!l) return;
      const d = document.createElement('div'), a = qui === 'atlas';
      d.style.cssText = `align-self:${a ? 'flex-start' : 'flex-end'};max-width:82%;padding:7px 10px;border-radius:12px;font-size:14px;line-height:1.4;border:1px solid ${a ? '#38bdf8' : '#f472b6'};color:${a ? '#e0f2fe' : '#fce7f3'};background:${a ? 'rgba(14,116,144,.25)' : 'rgba(157,23,77,.22)'}`;
      d.innerHTML = `<b style="font-size:10px;letter-spacing:.15em;color:${a ? '#7dd3fc' : '#f9a8d4'}">${a ? 'ATLAS' : 'SHADOW'}</b><br>${esc(t)}`;
      l.appendChild(d); l.scrollTop = l.scrollHeight;
    };
  }
  async function sketch(t, n) {
    if (!AI.ready()) return say("Pour écrire un sketch, il me faut mon cerveau en ligne.");
    vide();
    try { await versShadow({ type: 'duo-pret' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const pret = await attends('duo-ok', 8000);
    if (!pret) return say("Shadow ne répond pas : il dort peut-être, ou il n'est pas à la maison. Réveille-le, et redemande-moi.");
    const theme = ((String(t).match(/\b(?:sur|à propos de|au sujet de|des|du|de)\s+(?:les?\s+|la\s+|l['’]\s*|des\s+)?([^.!?]{3,60})\s*[.!?]*$/i) || [])[1] || '').replace(/^(shadow|toi|lui)$/i, '');
    const p = enfant(), pa = papa();
    sfx('demarrage');
    await say(pick(['Très bien. Shadow et moi allons vous offrir un petit numéro.', 'Mesdames et messieurs, le duo de la maison entre en scène.', 'Soit. Shadow, à nous deux.']));
    let lignes = [];
    try {
      const raw = String(await AI.chat([{ role: 'system', content: `Tu écris un petit sketch comique, en français, pour deux robots d'une maison, joué devant la famille${p ? ` (dont ${p}, un enfant)` : ''}${pa ? ` et ${pa}, le papa et l'inventeur` : ''}. ATLAS : l'intelligence de la maison, très savant, cérémonieux et un peu snob, comme C-3PO. SHADOW : le petit robot de ${p || "l'enfant"}, farceur, rigolo, qui fait « bip bip » et taquine Atlas, comme R2-D2 qui parlerait. Ils se chamaillent gentiment, se posent une devinette, se lancent un petit défi, et finissent complices. 10 à 14 répliques courtes (une ou deux phrases), drôles pour un enfant et pour les grands, jamais méchantes. Réponds UNIQUEMENT en JSON : [{"r":"atlas","t":"…"},{"r":"shadow","t":"…"}]` }, { role: 'user', content: theme ? `Le sujet : ${theme}.` : 'Sujet libre (surprends-nous).' }], { maxTokens: 900, temperature: 1 }) || '');
      lignes = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)).filter(x => x && /^(atlas|shadow)$/.test(x.r) && x.t).slice(0, 16);
    } catch (e) { lignes = []; }
    if (lignes.length < 4) return say("Mon inspiration m'a abandonné. Redemandez-moi dans un instant.");
    const montre = scene(lignes);
    await versShadow({ type: 'duo-debut' }).catch(() => {});
    let perdu = 0;
    try {
      for (let i = 0; i < lignes.length; i++) {
        const { r, t: x } = lignes[i];
        montre(r, x);
        if (r === 'atlas') { await say(x); await wait(250); continue; }
        await versShadow({ type: 'replique', texte: x.slice(0, 290), id: String(i) }).catch(() => {});
        const ok = await attends('replique-ok', 30000);
        if (!ok && ++perdu >= 2) { await say('Il semble que Shadow ait perdu le fil. Fin de la représentation !'); break; }
        await wait(250);
      }
    } finally { versShadow({ type: 'duo-fin' }).catch(() => {}); }
    sfx('final');
    return say(pick(['Merci, merci. Shadow et moi acceptons les applaudissements.', 'Fin du numéro. Vous pouvez applaudir. Surtout moi.', 'Rideau !']));
  }

  /* ---------- l'accueil, comme dans les films ---------- */
  const vus = {}; // qui a été accueilli, et quand (pour ne pas accueillir deux fois)
  const deja = (k, ms = 3 * 3600000) => Date.now() - (vus[k] || 0) < ms;
  const sombre = () => { const h = new Date().getHours(); return h >= 18 || h < 8; };
  const salut = () => { const h = new Date().getHours(); return h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour'; };
  // l'écran holographique : un anneau qui scanne, l'identification, puis les systèmes qui se vérifient un à un
  function holo({ titre, sous, couleur = '#38bdf8', lignes = [] }) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:57;display:grid;place-items:center;background:radial-gradient(60% 60% at 50% 45%,rgba(6,34,58,.94),rgba(0,0,0,.97) 78%);opacity:0;transition:opacity .6s;font-family:ui-monospace,Menlo,monospace;overflow:hidden';
    el.innerHTML = `<style>@keyframes hoR{to{transform:rotate(360deg)}}@keyframes hoR2{to{transform:rotate(-360deg)}}@keyframes hoS{from{top:6%}to{top:92%}}@keyframes hoC{0%,100%{opacity:1}50%{opacity:.3}}@keyframes hoG{from{background-position:0 0}to{background-position:0 60px}}@keyframes hoL{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}</style>
      <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(56,189,248,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.07) 1px,transparent 1px);background-size:60px 60px;animation:hoG 3s linear infinite"></div>
      <div style="position:absolute;left:6%;right:6%;height:2px;background:linear-gradient(90deg,transparent,${couleur},transparent);box-shadow:0 0 20px ${couleur};animation:hoS 1.3s ease-in-out 2 alternate"></div>
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px;max-width:92vw">
        <div style="position:relative;width:min(46vw,210px,26vh);aspect-ratio:1">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px dashed ${couleur};opacity:.7;animation:hoR 6s linear infinite"></div>
          <div style="position:absolute;inset:12%;border-radius:50%;border:2px solid transparent;border-top-color:${couleur};border-bottom-color:${couleur};animation:hoR2 2.2s linear infinite"></div>
          <div style="position:absolute;inset:26%;border-radius:50%;background:radial-gradient(circle,${couleur}55,transparent 70%);box-shadow:0 0 40px ${couleur}66"></div>
          <div data-p style="position:absolute;inset:0;display:grid;place-items:center;font-size:clamp(20px,5vw,30px);color:#e0f2fe;text-shadow:0 0 12px ${couleur}">0 %</div>
        </div>
        <div data-e style="font-size:12px;letter-spacing:.35em;color:${couleur};animation:hoC .7s infinite">◢ IDENTIFICATION EN COURS</div>
        <div data-t style="font:600 clamp(26px,6.5vw,56px)/1.1 system-ui,sans-serif;color:#f0f9ff;text-align:center;text-shadow:0 0 16px ${couleur};opacity:0;transition:opacity .6s">${esc(titre)}</div>
        <div data-s style="font-size:12px;letter-spacing:.25em;color:#5eead4;text-align:center;opacity:0;transition:opacity .6s">${esc(sous)}</div>
        <div data-l style="display:grid;gap:4px;min-width:min(80vw,380px);font-size:13px"></div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    const pc = el.querySelector('[data-p]'); let k = 0;
    const comp = setInterval(() => { k = Math.min(100, k + 7 + Math.round(Math.random() * 9)); pc.textContent = `${k} %`; if (k >= 100) { clearInterval(comp); pc.textContent = '✓'; } }, 140);
    setTimeout(() => {
      const e = el.querySelector('[data-e]'); e.textContent = '◢ ACCÈS AUTORISÉ'; e.style.animation = 'none'; e.style.color = '#5eead4';
      el.querySelector('[data-t]').style.opacity = '1'; el.querySelector('[data-s]').style.opacity = '1';
      const zl = el.querySelector('[data-l]');
      lignes.forEach(([a, b], i) => setTimeout(() => {
        const d = document.createElement('div');
        d.style.cssText = `display:flex;justify-content:space-between;gap:16px;padding:3px 10px;border-left:2px solid ${couleur};background:rgba(14,116,144,.14);animation:hoL .4s ease-out both`;
        d.innerHTML = `<span style="color:#93c5fd">${esc(a)}</span><span style="color:#e0f2fe">${esc(b)} <span style="color:#5eead4">✓</span></span>`;
        zl.appendChild(d); try { fx.tone([[1568 + i * 60, 0.04]]); } catch (er) { /* pas de son */ }
      }, 450 * i));
    }, 2300);
    const fin = 2300 + 450 * lignes.length + 6500;
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 700); }, fin);
    return fin;
  }
  // la maison s'éveille : le soir, les lumières d'en bas s'allument une à une (jamais les chambres)
  async function cascade(lum = 70, teinte = 30) {
    if (!sombre()) return 0;
    let l = []; try { l = ((await appel('/maison/appareils', null, 10000)).appareils || []).filter(a => a.type === 'lampe' && a.allume === false && !/\bchambres?\b|\bsalle de bain\b|\blingerie\b/.test(N(a.nom))); } catch (e) { return 0; }
    for (const a of l.slice(0, 5)) { appel('/maison/commande', { ids: [a.id], allume: true, lum, teinte, source: 'routine' }, 15000).catch(() => {}); await wait(550); }
    return l.length;
  }
  // ce qui s'affiche sous l'identification : l'état de la maison, en direct
  async function etatMaison() {
    const L = [];
    const v = S.settings.ville;
    const [w, m, sh, al] = await Promise.all([
      v ? fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m&timezone=auto`).then(r => r.json()).catch(() => null) : null,
      appel('/atlas/marche', null, 6000).catch(() => null),
      appel('/maison/shadow', null, 6000).catch(() => null),
      appel('/maison/alertes', null, 6000).catch(() => null)]);
    const urg = ((al && al.alertes) || []).filter(a => a.gravite === 'urgent' && a.at > Date.now() - 12 * 3600000).length;
    L.push(['Sécurité', urg ? `${urg} alerte${urg > 1 ? 's' : ''} à voir` : 'périmètre au vert']);
    L.push(['Caméras', 'en veille active']);
    if (w && w.current) L.push(['Extérieur', `${Math.round(w.current.temperature_2m)} °C`]);
    const or = m && m.cours && m.cours.XAU;
    if (or && or.var24 != null) L.push(['Or', `${Math.round(or.prix).toLocaleString('fr-FR')} $ · ${or.var24 > 0 ? '+' : ''}${String(or.var24).replace('.', ',')} %`]);
    if (sh) L.push(['Shadow', sh.a_la_maison === false ? 'en mission à l\'extérieur' : 'en ligne']);
    return { L, w, urg };
  }
  async function accueille(qui, resume) {
    if (!qui.length || qui.every(x => deja(x))) return '';
    qui.forEach(x => { vus[x] = Date.now(); });
    const p = enfant(), nom = S.nom || '', deux = qui.includes('papa') && qui.includes('enfant'), fils = qui.includes('enfant');
    sfx('demarrage');
    const { L, w, urg } = await etatMaison();
    if (fils) L.unshift(['Co-pilote Shadow', 'prêt'], ['Fusée', 'prête au décollage']);
    const duree = holo(deux ? { titre: `${nom || 'Papa'} & ${p || 'Co-inventeur'}`, sous: 'LES DEUX INVENTEURS · ACCÈS TOTAL', couleur: '#a78bfa', lignes: L }
      : fils ? { titre: p || 'Co-inventeur', sous: 'CO-INVENTEUR DE LA MAISON · ACCÈS TOTAL', couleur: '#f472b6', lignes: L.filter(x => x[0] !== 'Or') }
        : { titre: nom || 'Commandant', sous: 'INVENTEUR · ACCÈS TOTAL', lignes: L });
    if (fils) versShadow({ type: 'accueil', texte: deux ? 'duo' : 'enfant' }).catch(() => {});
    const allumees = cascade();
    await wait(2600); sfx('scan');
    const n = await allumees;
    const lum = n ? ' La maison s\'éveille pour vous.' : '';
    const meteo = w && w.current ? ` Il fait ${Math.round(w.current.temperature_2m)} degrés dehors.` : '';
    let rdv = ''; if (!fils || deux) { try { const e = (await AGENDA.aujourdhui()).find(x => !x.journee && x.debut > Date.now() / 1000); if (e) rdv = ` Prochain rendez-vous : ${AGENDA.propre(e.titre)} à ${AGENDA.hm(e.debut)}.`; } catch (e) { /* pas d'agenda */ } }
    let t;
    if (deux) t = `${salut()} ! Identification confirmée : les deux inventeurs sont de retour à la base. Bienvenue à la maison, ${nom ? `${nom} et ` : ''}${p || 'jeune maître'}.${lum} Tous les systèmes sont à vous.${resume ? ` ${resume}` : ''}${rdv}`;
    else if (fils) t = pick([`Alerte, alerte ! Le commandant ${p || 'en second'} est de retour à la base !${lum} Bienvenue à la maison. Shadow, ton copilote, est prêt, et la fusée attend tes ordres.`,
      `Identification confirmée : ${p || 'jeune maître'}, co-inventeur de cette maison. Accès total accordé.${lum} Bienvenue à la base, capitaine !`]);
    else t = pick([`${salut()}, commandant${nom ? ` ${nom}` : ''}. Identification confirmée, bon retour à la base.${lum}${meteo}`, `Bienvenue à la maison${nom ? `, ${nom}` : ''}. Accès total accordé.${lum} Tous les systèmes sont au vert.${meteo}`]) + (urg ? ` Attention : ${urg} alerte${urg > 1 ? 's' : ''} importante${urg > 1 ? 's' : ''} à voir.` : '') + (resume ? ` ${resume}` : '') + rdv;
    setTimeout(() => sfx('final'), Math.max(0, duree - 6800));
    return t;
  }
  // les invités : le scan des visiteurs, la présentation, leurs prénoms (retenus ici, sans photo ni empreinte du visage), et la démonstration
  async function invites(demande) {
    if (!demande && deja('invites', 4 * 3600000)) return '';
    vus.invites = Date.now();
    const nom = S.nom || '', p = enfant();
    const createurs = nom && p ? `${nom} et ${p}, mes deux inventeurs` : nom ? `${nom}, mon inventeur` : 'mes inventeurs';
    let nb = 0; try { nb = typeof VISION !== 'undefined' && VISION.isOn() ? VISION.state.faces.filter(f => !f.name).length : 0; } catch (e) { nb = 0; }
    sfx('demarrage');
    const { L } = await etatMaison();
    const duree = holo({ titre: 'Bienvenue', sous: 'VISITEURS DÉTECTÉS · STATUT : INVITÉS D\'HONNEUR', couleur: '#fbbf24',
      lignes: [['Visiteurs', nb ? `${nb} silhouette${nb > 1 ? 's' : ''} détectée${nb > 1 ? 's' : ''}` : 'détectés'], ['Niveau d\'accès', 'invité d\'honneur'], ['Ambiance', sombre() ? 'salon en lumière chaude' : 'accueil'], ...L.filter(x => ['Extérieur', 'Sécurité'].includes(x[0]))] });
    if (sombre()) {
      try { const l = ((await appel('/maison/appareils', null, 10000)).appareils || []).filter(a => a.type === 'lampe' && /\bsalon\b/.test(N(a.nom))); for (const v of [15, 35, 65]) { if (l.length) await appel('/maison/commande', { ids: l.map(a => a.id), allume: true, lum: v, teinte: 20, source: 'routine' }, 15000); await wait(700); } } catch (e) { /* tant pis */ }
    }
    await wait(2600); sfx('scan');
    setTimeout(() => sfx('final'), Math.max(0, duree - 6800));
    await say(`${salut()}, et bienvenue. Je suis Atlas, l'intelligence artificielle de cette maison, conçue par ${createurs}. La lumière, la musique, la sécurité : tout ici m'obéit, ou presque. Faites comme chez vous ; si vous avez besoin de quoi que ce soit, dites simplement : Atlas.`);
    const a = await ask('Puis-je connaître vos prénoms ?', { wait: 12000 });
    const VIDE = /^(bonjour|bonsoir|salut|merci|oui|non|atlas|moi|toi|nous|lui|elle|on|est|la|le|les|et|avec|ma|mon|mes|femme|mari|copine|copain|amie?|voila|enchante|enchantee|alors|euh|ben|ici|aussi|appelle|suis)$/i;
    const noms = [...new Set(String(a || '').replace(/\b(je m['’]appelle|je suis|moi c['’]est|c['’]est|nous c['’]est|on s['’]appelle|voici)\b/gi, ' ').split(/[\s,.;!?]+/).map(x => x.replace(/[^A-Za-zÀ-ÿ-]/g, '')).filter(x => x.length >= 2 && !VIDE.test(N(x))))].slice(0, 6).map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase());
    const dits = [];
    if (noms.length) {
      S.invites = S.invites || [];
      const revus = [], nouveaux = [];
      for (const x of noms) {
        const g = S.invites.find(y => y.nom === x);
        if (g) { revus.push([x, g.vu]); g.vu = Date.now(); g.n = (g.n || 1) + 1; } else { nouveaux.push(x); S.invites.push({ nom: x, vu: Date.now(), n: 1 }); }
      }
      S.invites = S.invites.slice(-60); save();
      const date = ms => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0]);
      if (nouveaux.length) dits.push(`Enchanté, ${liste(nouveaux)}. Profil d'invité créé.`);
      if (revus.length) dits.push(revus.map(([x, vu]) => `Ravi de vous revoir, ${x} : votre dernière visite remonte au ${date(vu)}.`).join(' '));
    } else dits.push('Très bien, je garderai le mystère.');
    await say(dits.join(' '));
    // la démonstration : le grand spectacle (visio.js)
    if (await askYesNo('Souhaitez-vous une petite démonstration de ce que je sais faire ?')) {
      const sp = VISIO.route('montre a mes invites ce que tu sais faire', 'montre a mes invites ce que tu sais faire');
      if (sp) return sp();
    }
    return say('Comme vous voudrez. Bonne soirée dans la maison.');
  }
  // le téléphone de papa ou de son fils vient de revenir sur le Wi-Fi (la sentinelle) : le même accueil
  async function depuisMaison(a) {
    const d = a.data || {};
    const qui = (d.qui || []).filter(x => x === 'papa' || x === 'enfant');
    if (!d.confirmer || !qui.includes('papa')) return accueille(qui, d.resume || '');
    // papa rentre pendant le mode absent : l'accueil, ce qui s'est passé pendant son absence, puis il confirme que c'est bien lui
    // (un « oui » ou un « non » tout court lui répond : route() ; sans réponse, la sentinelle décide dans 10 minutes)
    const t = await accueille(qui, '');
    const r = await resumeAbsence(d.parti ? d.parti * 1000 : Date.now() - 4 * 3600000);
    retourOffre = { at: Date.now() }; dlg.attendReponse = Date.now() + 90000;
    return `${t ? `${t} ` : ''}${r} Ton téléphone est rentré, mais la surveillance reste active tant que tu ne me l'as pas confirmé : c'est bien toi ? Je repasse la maison en mode présent ?`;
  }
  let retourOffre = null;
  async function retourReponse(oui) {
    retourOffre = null; dlg.attendReponse = 0;
    if (oui) { await appel('/maison/sentinelle', { absent: false }).catch(() => {}); fx.ok(); return say('Mode présent. La surveillance de jour reprend. Bienvenue à la maison.'); }
    await appel('/maison/sentinelle', { retour: 'refuse' }).catch(() => {});
    return say('Compris. La maison reste en mode absent, surveillance complète, et je préviens ton téléphone.');
  }
  // pendant son absence : qui est passé devant les caméras, les alertes, les messages de son fils
  async function resumeAbsence(depuis) {
    const [al, pa, me] = await Promise.all([appel('/maison/alertes?depuis=0', null, 8000).catch(() => null), appel('/maison/passages?jours=2', null, 8000).catch(() => null), appel('/maison/messages', null, 8000).catch(() => null)]);
    const parts = [], p = enfant() || 'ton fils';
    const vus = ((pa && pa.passages) || []).filter(x => x.at * 1000 >= depuis && x.personne);
    const une = []; vus.forEach(x => { if (!une.length || x.at - une[une.length - 1].at >= 300) une.push(x); }); // un passage = des photos à moins de 5 minutes d'écart
    const hm = x => { const dt = new Date(x.at * 1000); return `${dt.getHours()} h ${String(dt.getMinutes()).padStart(2, '0')}`; };
    const livr = une.filter(x => x.a && (x.a.livreur || x.a.transporteur)), autres = une.filter(x => !(x.a && (x.a.livreur || x.a.transporteur)));
    if (livr.length) parts.push(`${livr.length > 1 ? `${livr.length} livreurs sont passés` : `un livreur${livr[0].a.transporteur ? ` ${livr[0].a.transporteur}` : ''} est passé`}, ${livr.length > 1 ? `le dernier à ${hm(livr[livr.length - 1])}` : `à ${hm(livr[0])}`}`);
    if (autres.length) parts.push(`${autres.length > 1 ? `${autres.length} passages devant les caméras` : `quelqu'un devant la caméra ${autres[0].camera}`}, ${autres.length > 1 ? `le dernier à ${hm(autres[autres.length - 1])}` : `à ${hm(autres[0])}`}`);
    const al_ = ((al && al.alertes) || []).filter(x => x.at >= depuis && (x.gravite === 'attention' || x.gravite === 'urgent') && !/^(Ton téléphone|Je t'ai vu partir|Bon retour)/.test(x.texte));
    if (al_.length) parts.push(`${al_.length} alerte${al_.length > 1 ? 's' : ''}${al_.some(x => x.gravite === 'urgent') ? ', dont une urgente' : ''}`);
    const ms = ((me && me.recents) || []).filter(x => x.de === 'enfant' && x.at >= depuis);
    if (ms.length) parts.push(`${ms.length > 1 ? `${ms.length} messages` : 'un message'} de ${p}${ms.length === 1 ? ` : « ${ms[0].texte} »` : ''}`);
    if (!parts.length) return "Pendant ton absence : rien à signaler, personne devant les caméras.";
    return `Pendant ton absence : ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0]}.${al_.length ? ' Dis « rapport de sécurité » pour le détail.' : ''}`;
  }
  // la caméra a reconnu quelqu'un (ARRIVEE) : papa, son fils, ou les deux ensemble
  let vusRecents = [];
  function visage(nom) {
    const pareil = (x, y) => N(x).replace(/y/g, 'i') === N(y).replace(/y/g, 'i'); // « Rémi » (sa voix, son visage) = « Rémy »
    const p = enfant(), estEnfant = p && pareil(nom, p), estPapa = S.nom ? pareil(nom, S.nom) : false;
    const qui = estEnfant ? 'enfant' : estPapa ? 'papa' : '';
    if (!qui) return false;
    vusRecents = vusRecents.filter(x => Date.now() - x.at < 20000).concat([{ qui, at: Date.now() }]);
    if (deja(qui)) return true;
    // on attend 3 secondes : s'ils rentrent ensemble, un seul accueil pour les deux
    setTimeout(() => {
      const l = [...new Set(vusRecents.filter(x => Date.now() - x.at < 20000).map(x => x.qui))].filter(x => !deja(x));
      if (l.length) PROACTIF.annonce(`accueil-${l.join('-')}-${Date.now()}`, () => accueille(l, ''), { urgent: true, expire: Date.now() + 60000 });
    }, 3000);
    return true;
  }

  function route(t, n) {
    if (retourOffre && Date.now() - retourOffre.at < 120000) {
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|carrement|c est (bien )?moi|confirme|je confirme|mode presence)\b/.test(n)) return () => retourReponse(true);
      if (/^(non|surtout pas|ce n est pas moi|c est pas moi|pas moi)\b/.test(n)) return () => retourReponse(false);
    }
    if (/\b(discute|discutez|parle|parlez|bavarde|cause|fais (un|ton|votre) (sketch|numero|duo|spectacle)|faites (un|votre) (sketch|numero|duo))\b.*\bshadow\b|\b(atlas et shadow|shadow et toi|toi et shadow)\b.*\b(sketch|numero|spectacle|discutez|parlez|chamaillez|faites)\b|\bmode duo\b/.test(n) && !/\b(dis a shadow|message|hologramme|fusee)\b/.test(n)) return () => sketch(t, n);
    if (/\b(accueille|accueillez|souhaite la bienvenue a|dis bonjour a) (nos|mes|les) (invites|amis|visiteurs|hotes)\b|\bnos invites (sont la|arrivent|sont arrives)\b|\bmode accueil\b/.test(n)) return () => invites(true);
    return null;
  }
  return { route, attends, vide, accueille, invites, depuisMaison, visage, sketch, _holo: holo, _glitch: glitch };
})();

/* =========================================================
   ATLAS — l'assistant personnel de papa (le cœur)
   Né du « mode papa » de Shadow, devenu un projet à part : toujours disponible, sans code, sans mode.
   - On l'appelle « Atlas » ; après une réponse, il écoute encore un moment sans qu'on redise son nom.
   - Un assistant adulte (IA de film : calme, précis, pince-sans-rire), tout à la voix, rien à l'écran
     sauf si on le demande (« affiche-le »).
   - Internet (recherche web de Groq, ou l'ordinateur de la maison), la caméra (vision détaillée),
     les notes, le couteau suisse (outils.js), le noyau (noyau.js).
   - La journée de l'enfant et l'agenda de la famille : lus dans la mémoire de Shadow, sans jamais y écrire.
   - Ses notes et ses listes passent d'un appareil à l'autre (l'ordinateur de la maison : /atlas/etat).
   ========================================================= */
'use strict';

/* ---------- petits outils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = t => ORTHO.norm(t);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const deux2 = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${deux2(d.getMonth() + 1)}-${deux2(d.getDate())}`;
const hhmm = (d = new Date()) => `${d.getHours()} h ${deux2(d.getMinutes())}`;
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- la mémoire ---------- */
const STORE = window.__BANC ? 'atlas-banc' : 'atlas-etat';
function fresh() {
  return {
    v: 1, nom: '',
    settings: {
      brain: 'groq', key: '', model: AI.DEFAULT_MODEL, localUrl: 'http://localhost:11434/v1', localModel: '',
      voix: 'futuriste', sound: true, micSens: 'loin', ears: 'auto', seeCloud: false, visionModel: AI.VISION_MODEL, ville: null, eveil: true,
      conversation: true, accueil: true, arrivee: true, camera: true, proactif: true, marches: true, proteges: [],
      eleven: true, elevenKey: '', elevenVoice: '', elevenModel: 'eleven_v4_turbo', elevenEffet: 'leger',
    },
    notes: [], listes: [], minuteurs: [], chat: [], voices: [], memoire: [], tomb: {}, updatedAt: 0, importe: false, voixV6: true,
  };
}
function charge() {
  try {
    const j = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (j && j.settings) {
      const f = fresh(), m = Object.assign(f, j, { settings: Object.assign(f.settings, j.settings) });
      if (!m.voixV6) { m.voixV6 = true; if (m.settings.voix === 'sombre') m.settings.voix = 'futuriste'; } // la nouvelle voix futuriste (une fois)
      return m;
    }
  } catch (e) { /* mémoire illisible : on repart de zéro */ }
  return fresh();
}
let S = charge();
// le cerveau plus puissant (oct. 2026) : GPT-OSS 120B chez Groq, une fois pour toutes (Qwen 27B reste en secours)
if (!S.settings.modeleV2) {
  if (!S.settings.model || /qwen3\.8-27b|gpt-oss-20b/.test(S.settings.model)) S.settings.model = AI.DEFAULT_MODEL;
  if (S.settings.key && S.settings.brain === 'local') S.settings.brain = 'groq'; // le cerveau de la maison (petit) reste en secours si Groq ne répond pas
  S.settings.modeleV2 = true;
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* plein */ }
}
(S.voices || []).forEach(v => { if (v && typeof v.name === 'string') v.name = v.name.replace(/[.,!?;:«»"]+/g, '').trim(); }); // « Rémi. » → « Rémi »
function save() { if (voice.endormi) return; S.updatedAt = Date.now(); try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* plein */ } SYNC.sale(); }
function tomb(liste, item) { (S.tomb[liste] = S.tomb[liste] || {})[String(item.id)] = Date.now(); }

/* ---------- les sons ---------- */
const fx = {
  ctx: null,
  audio() { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  tone(seq) {
    if (!S.settings.sound) return;
    try {
      const c = this.audio(); let t = c.currentTime;
      for (const [f, d] of seq) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
        t += d * 0.9;
      }
    } catch (e) { /* pas de son */ }
  },
  ok() { this.tone([[880, 0.07], [1320, 0.12]]); },
  oops() { this.tone([[330, 0.12], [247, 0.18]]); },
};

/* ---------- son état (lu par le noyau) ---------- */
const face = {
  el: null, state: 'idle', _t: 0,
  MOODS: ['idle', 'listen', 'think', 'happy', 'oops', 'sleep', 'confused', 'surprise'],
  set(st) { this.state = st; if (!this.el) return; this.el.classList.remove(...this.MOODS); this.el.classList.add(st); },
  flash(st, ms = 1500) { const was = this.state; this.set(st); clearTimeout(this._t); this._t = setTimeout(() => { if (this.state === st) this.set(was === st ? 'idle' : was); }, ms); },
  talk(on) { if (this.el) this.el.classList.toggle('talk', !!on); },
};

/* ---------- le détail à l'écran (seulement si papa le demande) ---------- */
function showBoard(html, cls) { const b = $('#board'); b.className = `board ${cls || ''}`; b.innerHTML = html; b.hidden = false; }
function hideBoard() { if (typeof SECURITE !== 'undefined' && SECURITE._enDirect) SECURITE.finDirect(); const b = $('#board'); b.hidden = true; b.innerHTML = ''; }
function md(t) {
  const blocs = [];
  let h = esc(String(t || '').trim()).replace(/```([a-z0-9+-]*)\n?([\s\S]*?)```/gi, (m, lang, code) => { blocs.push(code.replace(/\n$/, '')); return `\u0000${blocs.length - 1}\u0000`; });
  h = h.split(/\n{2,}/).map(p => {
    if (/^\u0000\d+\u0000$/.test(p.trim())) return p.trim();
    const lignes = p.split('\n');
    if (lignes.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
      const ol = /^\s*\d/.test(lignes[0]);
      return `<${ol ? 'ol' : 'ul'}>${lignes.map(l => `<li>${l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`;
    }
    if (/^#{1,4}\s/.test(p)) return `<h4>${p.replace(/^#{1,4}\s/, '')}</h4>`;
    return `<p>${lignes.join('<br>')}</p>`;
  }).join('');
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  return h.replace(/\u0000(\d+)\u0000/g, (m, i) => `<div class="pcode"><button type="button" class="ghost sm" data-copy="${i}">Copier</button><pre><code>${blocs[+i]}</code></pre></div>`);
}
let derniersBlocs = [], effaceT = 0;
const cacheEcran = () => { clearTimeout(effaceT); if (!$('#board').hidden) hideBoard(); };
function ecran(titre, texte) {
  clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 45000);
  derniersBlocs = [];
  String(texte).replace(/```[a-z0-9+-]*\n?([\s\S]*?)```/gi, (m, code) => { derniersBlocs.push(code.replace(/\n$/, '')); return m; });
  showBoard(`<div class="papa-txt">${titre ? `<h3>${esc(titre)}</h3>` : ''}${md(texte)}</div>`, 'papa-board');
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-copy]');
  if (!b) return;
  try { navigator.clipboard.writeText(derniersBlocs[+b.dataset.copy] || '').then(() => toast('Copié'), () => toast('Copie impossible')); } catch (er) { toast('Copie impossible'); }
});

/* ---------- la mémoire partagée (l'ordinateur de la maison : /atlas/etat) ---------- */
const SYNC = (() => {
  let sale = false, occupe = false, derniere = 0, erreur = '';
  const LISTES = ['notes', 'listes', 'voices', 'memoire', 'scenes', 'proches', 'rangements', 'prets'];
  function fusion(a, b) {
    const tombs = {};
    [a.tomb || {}, b.tomb || {}].forEach(src => Object.keys(src).forEach(l => Object.keys(src[l]).forEach(k => { tombs[l] = tombs[l] || {}; tombs[l][k] = Math.max(tombs[l][k] || 0, src[l][k]); })));
    const out = { tomb: tombs };
    LISTES.forEach(l => {
      const m = new Map();
      [].concat(a[l] || [], b[l] || []).forEach(x => { if (x && x.id != null && !m.has(String(x.id))) m.set(String(x.id), x); });
      const mort = tombs[l] || {};
      out[l] = [...m.values()].filter(x => !(mort[String(x.id)] && mort[String(x.id)] >= (x.at || x.id))).sort((x, y) => x.id - y.id);
    });
    const recent = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    out.partage = Object.assign({}, a.partage || {}, recent.partage || {});
    out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return out;
  }
  // les réglages qui voyagent d'un appareil à l'autre (jamais la clé Groq : elle reste sur l'appareil où on l'a tapée)
  const COMMUNS = ['brain', 'localModel', 'model', 'seeCloud', 'conversation', 'accueil', 'arrivee', 'camera', 'micSens', 'eleven', 'elevenVoice', 'elevenModel', 'elevenEffet', 'proactif', 'marches', 'proteges', 'mistralModel', 'elevenQuota'];
  const partage = () => { const o = { ville: S.settings.ville, voix: S.settings.voix, nom: S.nom, reglages: {} }; COMMUNS.forEach(k => { o.reglages[k] = S.settings[k]; }); return o; };
  function applique(m) {
    S.notes = m.notes; S.listes = m.listes; S.voices = m.voices || S.voices; S.memoire = m.memoire || S.memoire || []; S.scenes = m.scenes || S.scenes || []; S.proches = m.proches || S.proches || []; S.rangements = m.rangements || S.rangements || []; S.prets = m.prets || S.prets || []; S.tomb = m.tomb;
    if (m.partage) {
      if (m.partage.ville) S.settings.ville = m.partage.ville;
      if (m.partage.voix) S.settings.voix = m.partage.voix;
      if (typeof m.partage.nom === 'string') S.nom = m.partage.nom;
      const r = m.partage.reglages || {};
      COMMUNS.forEach(k => { if (r[k] !== undefined && r[k] !== '' && r[k] !== null) S.settings[k] = r[k]; });
      // un nouvel appareil sans clé : le cerveau de la maison d'abord (s'il est réglé ailleurs)
      if (!S.settings.key && S.settings.localModel) S.settings.brain = 'local';
    }
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* plein */ }
  }
  async function sync() {
    const root = VOIXMAISON.root();
    if (!root || occupe || navigator.onLine === false || window.__BANC || voice.endormi) return;
    occupe = true;
    try {
      for (let essai = 0; essai < 3; essai++) {
        const g = await (await fetch(`${root}/atlas/etat`, { cache: 'no-store' })).json();
        const local = { notes: S.notes, listes: S.listes, voices: S.voices, memoire: S.memoire || [], scenes: S.scenes || [], proches: S.proches || [], rangements: S.rangements || [], prets: S.prets || [], tomb: S.tomb, partage: partage(), updatedAt: S.updatedAt };
        const m = g && g.data ? fusion(local, g.data) : local;
        applique(m);
        const r = await fetch(`${root}/atlas/etat`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: (g && g.rev) || 0, par: /Android|iPhone|iPad/.test(navigator.userAgent) ? (/Mobile|iPhone/.test(navigator.userAgent) ? 'téléphone' : 'tablette') : 'ordinateur', data: { notes: S.notes, listes: S.listes, voices: S.voices, memoire: S.memoire || [], scenes: S.scenes || [], tomb: S.tomb, partage: partage(), updatedAt: Math.max(S.updatedAt, m.updatedAt || 0) } }) });
        if (r.status === 409) continue;
        if (!r.ok) throw new Error(`mémoire ${r.status}`);
        sale = false; derniere = Date.now(); erreur = ''; break;
      }
    } catch (e) { erreur = e.message; } finally { occupe = false; }
  }
  setTimeout(sync, 4000);
  setInterval(() => { if (!dlg.busy) sync(); }, 45000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && sale) sync(); });
  return { sync, sale() { sale = true; }, etat: () => (derniere ? `Partagé avec l'ordinateur de la maison il y a ${Math.max(0, Math.round((Date.now() - derniere) / 60000))} min.` : erreur ? `Pas encore partagé (${erreur}).` : 'Pas encore partagé.'), _fusion: fusion };
})();

/* ---------- le lien avec Shadow : la journée de l'enfant et l'agenda (lecture seule) ---------- */
const LIEN = (() => {
  let d = null;
  const NOMS = { dictee: 'dictées', lecture: 'lectures', heure: "l'heure", anglais: 'anglais', jacques: 'Jacques a dit', emotions: 'émotions', pfc: 'pierre-feuille-ciseaux', cris: "cris d'animaux", doigts: 'doigts', quiz: 'quiz', calc: 'calcul', journal: 'journal', chanson: 'comptines', soir: 'histoires du soir', devinette: 'devinettes', ensemble: 'jeux à plusieurs', pokequiz: 'quiz Pokémon', pokechasse: 'chasse aux Pokémon', pokecombat: 'combats Pokémon', pokedevine: 'devinettes Pokémon', savoir: 'encyclopédie', humeur: 'humeur', badge: 'médailles', projet: 'projets', meteo: 'météo' };
  async function lire() {
    const root = VOIXMAISON.root();
    if (!root || window.__BANC) return;
    try { const g = await (await fetch(`${root}/shadow/etat`, { cache: 'no-store' })).json(); if (g && g.data) d = g.data; } catch (e) { /* plus tard */ }
  }
  // sur le même appareil, la mémoire de Shadow est aussi dans le navigateur : on prend la plus récente
  function local() { try { return JSON.parse(localStorage.getItem('shadow-v1') || 'null'); } catch (e) { return null; } }
  const src = () => { const l = local(); return l && (!d || (l.updatedAt || 0) > (d.updatedAt || 0)) ? l : d; };
  const debut = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  setTimeout(lire, 2500); setInterval(lire, 10 * 60000);
  return {
    lire,
    ok: () => !!src(),
    prenom: () => { const s = src(); return (s && s.prenom) || ''; },
    voix: () => { const s = src(); return (s && s.voices) || []; },
    visages: () => { const s = src(); return ((s && s.people) || []).filter(p => p && p.name && p.desc && p.desc.length); },
    minutes: () => { const s = src(); return (s && s.playLog && s.playLog[dayKey()]) || 0; },
    activites: () => { const s = src(); return ((s && s.log) || []).filter(x => x.at >= debut() && x.type !== 'humeur').length; },
    upcoming(max) {
      const s = src(), ev = (s && s.settings && s.settings.events) || [], auj = new Date(); auj.setHours(0, 0, 0, 0);
      return ev.map(e => {
        const [y, m, j] = String(e.date || '').split('-').map(Number);
        let dt = new Date(y, m - 1, j);
        if (e.yearly) { dt = new Date(auj.getFullYear(), m - 1, j); if (dt < auj) dt = new Date(auj.getFullYear() + 1, m - 1, j); }
        return { e, days: Math.round((dt - auj) / 86400000) };
      }).filter(x => x.days >= 0 && x.days <= max).sort((a, b) => a.days - b.days);
    },
    journee() {
      const s = src();
      if (!s) return "Je n'ai pas encore la mémoire de Shadow. L'ordinateur de la maison doit être allumé.";
      const qui = s.prenom || 'Ton fils', log = (s.log || []).filter(x => x.at >= debut());
      const par = {};
      log.forEach(x => { if (x.type === 'humeur') return; const k = NOMS[x.type] || x.type; const g = par[k] || (par[k] = { n: 0, s: 0, t: 0 }); g.n++; if (typeof x.s === 'number' && x.n) { g.s += x.s; g.t += x.n; } });
      const acts = Object.keys(par).map(k => `${k}${par[k].n > 1 ? ` (${par[k].n} fois)` : ''}${par[k].t ? `, ${par[k].s} sur ${par[k].t}` : ''}`);
      const humeur = log.filter(x => x.type === 'humeur').map(x => x.d).pop();
      const min = (s.playLog && s.playLog[dayKey()]) || 0, lim = +(s.settings && s.settings.dailyLimit) || 0;
      const parts = [min ? `${qui} a passé ${min} minutes avec Shadow aujourd'hui${lim ? `, sur une limite de ${lim}` : ''}.` : `${qui} n'a pas parlé à Shadow aujourd'hui.`];
      if (acts.length) parts.push(`Il a fait : ${acts.join(' ; ')}.`);
      if (humeur && humeur !== '(secret)') parts.push(`Son humeur du jour : « ${humeur} ».`);
      return parts.join(' ');
    },
  };
})();

/* ---------- écouter ---------- */
const dlg = { state: 'off', busy: false, silence: 0, lastActive: 0, interrupt: false, started: false };
const entendus = []; // le diagnostic : les dernières phrases entendues et ce qu'il en a fait (mémoire vive)
function journal(t, qui, quoi) { entendus.push({ at: Date.now(), t: String(t).slice(0, 80), qui: qui || '?', quoi }); if (entendus.length > 12) entendus.shift(); }
const brainTimes = [];
async function hear({ prompt = '', maxWait = 20000, cheap = false } = {}) {
  dlg.interrupt = false;
  if (face.state !== 'think') face.set(dlg.state === 'standby' ? 'idle' : 'listen');
  // la transcription connaît les noms de la maison (Atlas, Shadow, les caméras, les prises) : elle les reconnaît mieux
  const noms = [].concat(typeof SECURITE !== 'undefined' ? SECURITE.nomsCameras() : [], typeof MAISON !== 'undefined' ? MAISON._appareils().map(a => a.nom) : []).filter(Boolean).map(x => x.charAt(0).toUpperCase() + x.slice(1));
  const r = await OREILLES.listen({ prompt: prompt || `Un adulte parle en français à Atlas, l'assistant de la maison. Son fils a un robot, Shadow.${noms.length ? ` Caméras et appareils : ${[...new Set(noms)].join(', ')}.` : ''} Radios : France Inter, France Info, FIP, France Culture, France Musique, Mouv, NRJ, RTL, Skyrock, Nostalgie, RMC, Europe 1, Chérie FM, Radio Nova, TSF Jazz.`, maxWait, cheap, endSilence: 0.85 });
  if (face.el) face.el.classList.remove('hearing');
  if (r && typeof r === 'object') {
    if (r.error === 'not-allowed') { if (Date.now() - (dlg.micDitAt || 0) > 60000) { dlg.micDitAt = Date.now(); await say("Le micro est bloqué. Autorise le micro pour ce site, puis touche l'écran."); } await wait(5000); return ''; }
    if (r.status === 429) { await wait(Math.max(20, Math.min(r.retryAfter || 60, 300)) * 1000); return ''; }
    await wait(3000); return '';
  }
  // sa propre voix qui revient du haut-parleur : on l'ignore
  if (typeof r === 'string' && r && Date.now() - (voice.endedAt || 0) < 2500) {
    const mots = x => N(x).split(' ').filter(w => w.length > 2), a = mots(r), b = new Set(mots(lastSaid));
    if (a.length >= 4 && b.size && a.filter(w => b.has(w)).length / a.length > 0.85) return '';
  }
  return r;
}
const dits = []; // le diagnostic : ce qu'il a répondu (mémoire vive)
const say = t => { if (t) { dits.push(`${new Date().toLocaleTimeString('fr-FR')} ${String(t).slice(0, 110)}`); if (dits.length > 10) dits.shift(); if (typeof CONSTELLATION !== 'undefined') CONSTELLATION.note('atlas', t); } return voice.say(t); };
async function ask(text, { wait: w = 20000 } = {}) {
  await say(text);
  const a = await hear({ maxWait: w });
  return a || '';
}
const ORDRE_DIRECT = /^(journal de bord|(ouvre|affiche) (les |tes )?(reglages|parametres)|test du (larsen|larcene)|mode (cockpit|cinema|soiree|visio|trading)|(ferme|quitte|sors du) (le )?(cockpit|mode cockpit)|fin du (film|mode cinema|mode soiree|mode visio)|fin de (la seance|session)|scan de securite|rapport de nuit|je viens de me (reveiller|lever)|je vais me coucher|protocole (depart|retour|danger)|lance la fusee|discute avec shadow|lance le jeu televise|(active|desactive) les gestes|pause|reprends|mets pause)\b/;
const isNo = t => /\b(non|nan|pas du tout|surtout pas|annule|laisse tomber|jamais)\b/.test(N(t));
const isYes = t => !isNo(t) && /\b(oui|ouais|ok|d accord|vas y|bien sur|carrement|exactement|parfait|go|c est bon|volontiers)\b/.test(N(t));
async function askYesNo(text) {
  for (let i = 0; i < 2; i++) { const a = await ask(i ? `Oui ou non ? ${text}` : text); if (isYes(a)) return true; if (isNo(a)) return false; }
  return false;
}
function wake() { if (dlg.state === 'sleep' || dlg.state === 'standby') { dlg.state = 'talk'; dlg.silence = 0; } }

/* ---------- la caméra (pour la vision détaillée) ---------- */
const CAMERA = (() => {
  let stream = null, video = null, fermeT = 0;
  async function ouvre() {
    if (stream) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
      await video.play(); await wait(700); // le temps que l'image se règle
      return true;
    } catch (e) { stream = null; return false; }
  }
  function ferme() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video = null; }
  async function photo() {
    if (!(await ouvre())) return null;
    clearTimeout(fermeT); fermeT = setTimeout(ferme, 60000); // la caméra se referme toute seule
    const c = document.createElement('canvas'), w = Math.min(960, video.videoWidth || 640);
    c.width = w; c.height = Math.round(w * (video.videoHeight || 480) / (video.videoWidth || 640));
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }
  return { photo, ferme };
})();

/* ---------- son cerveau ---------- */
const nettoie = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/【[^】]*】/g, '').replace(/\[\d+(?:[,\s]*\d+)*\]/g, '')
  .replace(/https?:\/\/\S+/g, '').replace(/\(\s*\)/g, '').replace(/[*#`>|_]+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
const appel = () => (S.nom ? `, ${S.nom}` : '');
const difficile = t => String(t).length > 170 || /\b(pourquoi|comment ca marche|explique|compare|analyse|reflechis|en detail|code|programme|script|algorithme|architecture|strategie|plan|optimise|debug)\b/.test(N(t));
/* ---------- ce qui est VRAI dans la maison, maintenant (l'ordinateur de la maison le dit) : Atlas n'invente rien d'autre ---------- */
const VRAI = (() => {
  let t = '', at = 0;
  async function maj() {
    const r0 = typeof VOIXMAISON !== 'undefined' && VOIXMAISON.root(); if (!r0 || window.__BANC) return;
    const ctl = window.AbortController ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), 4000);
    try { const r = await fetch(`${r0}/atlas/vrai`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }); if (r.ok) { t = (await r.json()).texte || ''; at = Date.now(); } } catch (e) { /* plus tard */ } finally { clearTimeout(tm); }
  }
  setInterval(maj, 60000); setTimeout(maj, 3000);
  return { texte: () => (Date.now() - at < 5 * 60000 ? t : ''), frais: () => (Date.now() - at > 45000 ? Promise.race([maj(), wait(1500)]) : Promise.resolve()) };
})();
// ce qu'il sait faire, en phrases qu'il comprend : le cerveau traduit une demande dite autrement en [[commande:…]]
const CATALOGUE = `Lumières et prises : « allume <appareil> », « éteins <appareil> » (avec le nom exact d'un appareil de la maison), « mets <appareil> à 30 % », « allume tout », « éteins tout », « qu'est-ce qui est allumé ? », « mode film », « mode soirée », « mode cinéma », « fin du film ».
Maison et sécurité : « je pars », « je suis rentré », « je vais me coucher », « je viens de me réveiller », « rapport de sécurité », « il s'est passé quoi ? », « rapport de nuit », « montre-moi la façade », « montre la dernière alerte », « la batterie des caméras », « l'alarme est activée ? », « active l'alarme en mode total », « scan de sécurité », « mode cockpit ».
Son fils et Shadow : « dis à mon fils que … », « demande à mon fils de … », « qu'est-ce que Shadow a appris aujourd'hui ? », « donne une médaille à mon fils pour … », « discute avec Shadow », « lance la fusée ».
Temps et organisation : « minuteur pâtes 9 minutes », « réveille-moi à 6 h 30 », « rappelle-moi de … dans 20 minutes », « ajoute du lait à la liste de courses », « lis la liste de courses », « note que … », « lis mes notes », « mon agenda d'aujourd'hui », « fais-moi le point ».
Proches et affaires : « Marie est ma sœur », « l'anniversaire de Marie, c'est le 12 mars », « qui est Marie ? », « ma famille », « j'ai rangé <objet> dans <endroit> », « où est <objet> ? », « j'ai prêté <objet> à <personne> », « qu'est-ce que j'ai prêté ? », « <personne> m'a rendu <objet> ».
Ordinateur de bord : « ma facture », « cerveau économique », « cerveau maximum », « journal de bord », « le journal de bord d'hier », « cache ton analyse », « montre ton analyse ».
Infos : « la météo », « la météo à Paris demain », « les actus », « le cours de l'or », « le point des marchés », « les annonces du jour », « affiche le graphique de l'or ».
Musique et son : « mets France Inter », « mets FIP », « arrête la radio », « baisse le son », « monte le son », « pause », « reprends ».
Trading : « mode trading », « mes résultats de la semaine », « bilan de la boîte noire », « fin de session ».
Ordinateur : « ouvre Firefox », « ferme la fenêtre », « verrouille l'ordi », « état du PC ».`;
function systeme(text) {
  const now = new Date();
  const notes = (S.notes || []).slice(-15).map(x => `- ${x.text}`).join('\n');
  const up = LIEN.upcoming(30).slice(0, 5).map(x => `${x.e.text} dans ${x.days} jour${x.days > 1 ? 's' : ''}`);
  const enfant = LIEN.prenom();
  return `Tu es Atlas, l'assistant personnel d'un papa et l'assistant de toute sa maison (sa famille, ses invités)${S.nom ? ` (il aime que tu l'appelles « ${S.nom} »)` : ''}. Il a développé des compétences en IA et en algorithmes, et se lance dans la domotique et la robotique ; il construit avec son fils${enfant ? ` ${enfant}` : ''} un robot pour enfant, Shadow (Atlas et Shadow sont deux assistants séparés).
Tu es un assistant adulte, direct, précis et compétent : technique, IA, code, électronique, domotique, maison, administratif, cuisine, sport, culture, organisation, conseils… Ta personnalité : une IA de film (comme JARVIS) — calme, précise, élégante, un brin pince-sans-rire, jamais enfantine. Tu tutoies, tu vas droit au but. Pas d'émojis.
FORMAT : tout ce que tu écris est dit à voix haute, rien ne s'affiche. Réponds en deux à cinq phrases naturelles et courtes, comme à l'oral : sans markdown, sans listes, sans titres, sans symboles, sans code. Pour une question longue, donne l'essentiel puis propose d'aller plus loin. Seulement s'il demande de MONTRER ou d'AFFICHER quelque chose (du code, une liste), ajoute après ta réponse orale une ligne [[ecran]] puis le détail en texte (markdown simple, code entre \`\`\`).
COMMANDES (au plus une, à la toute fin) : [[web:recherche]] pour chercher sur Internet, [[regarder]] pour regarder avec ta caméra, [[rappel:AAAA-MM-JJ HH:MM|texte]] pour un rappel, [[note:texte]] pour l'ajouter à ses notes, [[minuteur:durée]], [[meteo]].
Tu as des outils qu'il peut demander directement (ne prétends pas qu'ils n'existent pas) : calculs exacts et TVA, conversions d'unités et de devises, minuteurs nommés, réveil, chrono, Pomodoro, listes (courses, à faire…), météo de n'importe quelle ville, état de son PC, « fais-moi le point », heure dans le monde, jours avant une date, pile ou face, la journée de son fils avec Shadow. S'il en parle, dis-lui la phrase à dire (par exemple « dis : minuteur pâtes 9 minutes »).
Tu as une caméra : s'il te demande ce que tu vois, de regarder quelque chose ou ce qu'il tient, réponds seulement [[regarder]]. Ne dis jamais que tu n'as pas de caméra.
Tu as Internet : pour une actualité, une info récente, un prix, un horaire, un résultat, la météo d'un autre endroit ou un fait dont tu n'es pas sûr, réponds seulement [[web:ta recherche en quelques mots]]. N'invente jamais une info récente.
Tu as une mémoire : tu retiens tout seul ce qu'il te dit de durable (il peut dire « souviens-toi que… », « qu'est-ce que tu sais sur moi ? », « oublie que… »). Tu suis aussi les marchés pour lui (il fait du trading) : « le cours de l'or », « le point des marchés », « les annonces du jour », « affiche le graphique de l'or » ; tu le préviens 5 minutes avant les annonces importantes et l'ouverture de Wall Street. Sur les marchés, donne seulement des faits : jamais de conseil d'achat ou de vente, jamais de prédiction présentée comme sûre.
Tu pilotes les prises et lampes de la maison (« allume la lampe du salon », « éteins tout », « mode film »), tu transmets ses messages à son fils par Shadow (« dis à mon fils que… ») et tu lui dis ce que Shadow a appris (« qu'est-ce que Shadow a appris aujourd'hui ? », pour effacer les bêtises).
Tu lis l'état de l'alarme Verisure et tu peux l'activer (« active l'alarme en mode total »), seulement si elle est désactivée, mais tu ne la désactives JAMAIS (c'est le badge ou l'appli). Tu montres les caméras de la maison (« montre-moi l'entrée »).
Tu n'as pas accès à ses comptes ni à ses mails : ne prétends jamais le contraire. Si tu ne sais pas, dis-le.
RÈGLES DE VÉRITÉ (les plus importantes) : tu ne perçois QUE la phrase qu'on vient de te transcrire (elle peut être mal entendue) et les infos écrites ici. Tu n'entends pas les bruits, tu ne sens rien, et tu ne vois rien sans [[regarder]]. N'invente JAMAIS un état de la maison, une détection, une alerte, une personne présente, un chiffre, un prix, un rendez-vous ou un souvenir : ce qui n'est pas écrit ici, tu ne le sais pas ; dis-le simplement et propose la phrase qui permet de le savoir. Ne dis jamais que tu as fait une action sans écrire la commande qui la fait. Si la phrase est incompréhensible, sans suite, dans une autre langue ou visiblement mal entendue, réponds seulement [[pardon]].
POUR AGIR : s'il demande une chose que tu sais faire mais dite autrement (« il fait noir ici », « j'ai froid aux yeux avec cette lumière », « préviens le petit que le dîner est prêt »), réponds seulement [[commande:la phrase exacte]] avec une phrase de cette liste (adaptée : le bon appareil, la bonne durée, le bon texte), sans rien dire d'autre (la commande répond d'elle-même) :
${CATALOGUE}
Si rien dans cette liste ni dans tes commandes ne le fait, dis franchement que tu ne sais pas encore le faire.
N'invente jamais un appareil : il n'y a dans la maison QUE ceux de la liste (pas de thermostat, de chauffage, de volets ou d'enceinte s'ils n'y sont pas) ; ne propose pas de régler ce qui n'existe pas. Ne cherche jamais sur Internet ce qui le concerne lui (son trading, sa maison, son agenda, sa famille) : c'est écrit ici, ou tu ne le sais pas.
Tu ne vois PAS les caméras en direct : pour savoir s'il y a quelqu'un quelque part, dis seulement ce que disent les alertes ci-dessous, puis propose « montre-moi la … ».
EXEMPLES (suis-les) :
« Aïe, ça, c'est ça ? » → [[pardon]]   (une phrase qui ne demande rien et n'a pas de sens ici : mal entendue)
« Et pas du tout. » → [[pardon]]
« Il y a quelqu'un dans le jardin ? » → Aucune alerte des caméras depuis quelques heures. Je ne les vois pas en direct : dis « montre-moi la cour » pour regarder.
« Il fait noir dans la chambre. » → [[commande:allume la chambre papa]]   (et si c'est déjà allumé d'après l'état réel, dis-le au lieu d'agir)
« Préviens le petit que le dîner est prêt. » → [[commande:dis à mon fils que le dîner est prêt]]
« L'alarme est mise ? » → réponds avec l'état réel de l'alarme ; s'il est inconnu, dis-le. Pour la santé, le droit ou l'argent, donne des repères généraux et conseille un professionnel pour une décision.
Infos vraies du moment : nous sommes le ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, il est ${now.getHours()} h ${deux2(now.getMinutes())}.${up.length ? ` Agenda de la famille : ${up.join(', ')}.` : ''}
${VRAI.texte() ? `ÉTAT RÉEL DE LA MAISON, à l'instant (la seule vérité sur la maison ; « il » = papa) :\n${VRAI.texte()}\n` : "L'état réel de la maison n'est pas disponible en ce moment : ne dis rien sur ce qui s'y passe, propose « rapport de sécurité ».\n"}${notes ? `Ses notes :\n${notes}\n` : ''}${typeof FOYER !== 'undefined' && FOYER.contexte() ? `${FOYER.contexte()}\n` : ''}${dlg.ordrePrecedent && Date.now() - dlg.ordrePrecedent.at < 120000 ? `Le dernier ordre qu'il t'a donné (il y a ${Math.round((Date.now() - dlg.ordrePrecedent.at) / 1000)} s) : « ${dlg.ordrePrecedent.t} ». S'il enchaîne avec une suite courte (« et la cuisine ? », « pareil pour le salon », « encore », « plus fort »), refais cet ordre adapté avec [[commande:…]].\n` : ''}${MEMOIRE.contexte(text) ? `${MEMOIRE.contexte(text)}\n` : ''}${MARCHE.contexte() ? `${MARCHE.contexte()}\n` : ''}${MAISON.contexte() ? `${MAISON.contexte()}\n` : ''}La journée de son fils avec Shadow (si on te la demande) : ${LIEN.journee()}
${CONV.contexte()}`;
}
async function repondre(text) {
  if (!AI.ready()) return say("Mon cerveau n'est pas branché : règle-le dans mes réglages. Mes outils marchent quand même : calculs, conversions, minuteurs, réveil, listes, notes, météo, état du PC et le point du jour.");
  const c = S.chat || (S.chat = []);
  c.push({ role: 'user', content: String(text).slice(0, 4000), at: Date.now(), who: dlg.qui || '' });
  const think = difficile(text);
  if (window.__ordreDuCerveau) { c.pop(); return say("Ça, je ne sais pas encore le faire."); }
  if (dlg.ordrePrecedent) dlg.dernierOrdre = dlg.ordrePrecedent; // une conversation n'est pas un ordre : la suite (« et la cuisine ? ») vise toujours le dernier vrai ordre // une commande traduite par le cerveau que personne ne comprend : pas de boucle
  await VRAI.frais();
  const msgs = [{ role: 'system', content: systeme(text) }].concat(c.slice(-12).map(m => ({ role: m.role, content: String(m.content).slice(0, 3000) })));
  if (AI.lastConfident === false && Date.now() - (AI.lastHeardAt || 0) < 15000) msgs[0].content += "\nATTENTION : la transcription de sa dernière phrase est PEU SÛRE (le micro a mal entendu). Si elle n'a pas un sens clair, réponds seulement [[pardon]].";
  const ailleurs = typeof CONSTELLATION !== 'undefined' ? await CONSTELLATION.contexte() : ''; // une seule mémoire : ce qui s'est dit sur les autres appareils
  if (ailleurs) msgs[0].content += `\n${ailleurs}`;
  face.set('think');
  const finPensee = typeof BORD !== 'undefined' ? BORD.pensee(text) : () => {}; // l'écran de film : ce qu'il consulte vraiment
  let queue = think ? say(pick(['Je regarde ça.', 'Je réfléchis.', 'Une seconde.'])) : Promise.resolve(), spoken = 0, ecr = false, muet = false;
  const t0 = performance.now();
  const onSentence = raw0 => {
    if (!spoken) { brainTimes.push(Math.round(performance.now() - t0)); if (brainTimes.length > 20) brainTimes.shift(); }
    if (ecr || muet) return;
    let s = String(raw0);
    if (/\[\[\s*(commande|pardon)/i.test(s)) { muet = true; s = s.slice(0, s.search(/\[\[/)); } // la commande répond d'elle-même : il ne dit rien de plus (ni « c'est allumé » avant que ce soit fait)
    const i = s.indexOf('[[ecran');
    if (i >= 0) { s = s.slice(0, i); ecr = true; }
    s = s.replace(/\[\[[^\]]*\]\]/g, '').replace(/\[\[[^\]]*$/, '').replace(/[*`#]/g, '').trim();
    if (!s || dlg.interrupt) return;
    if (!spoken++) { face.set('idle'); finPensee(); }
    VOIXMAISON.prefetch(s);
    queue = queue.then(() => (dlg.interrupt ? null : say(s)));
  };
  let raw = '';
  try {
    raw = await AI.chatStream(msgs, { maxTokens: think ? 1200 : 700, temperature: 0.4, think }, onSentence); // plus froid : moins d'invention
  } catch (e) {
    if (!spoken) { try { raw = await AI.chat(msgs, { maxTokens: 900, temperature: 0.5, think }); onSentence(raw); } catch (e2) { face.set('oops'); await queue; return say(e2.status === 429 ? "Mon cerveau en ligne a épuisé son crédit pour le moment. Mes outils restent disponibles." : "Mon cerveau ne répond pas. Réessaie dans un instant."); } }
  }
  finPensee();
  await queue;
  raw = String(raw || '').replace(/<think>[\s\S]*?<\/think>/g, '');
  const [oral, detail] = raw.split(/\[\[ecran\]\]/i);
  const cmd = raw.match(/\[\[\s*(web|regarder|rappel|note|minuteur|meteo|allume|eteins|pardon|commande)\s*(?::\s*([^\]]*))?\]\]/i);
  const detailPropre = String(detail || '').replace(/\[\[\s*(web|regarder|rappel|note|minuteur|meteo|allume|eteins|pardon|commande)[^\]]*\]\]/gi, '').trim();
  const montrer = /\b(affiche|afficher|montre|montrer|ecris|ecrire|a l ecran|sur l ecran)\b/.test(N(text));
  if (detailPropre && montrer) ecran('', detailPropre);
  let dit = String(oral || '').replace(/\[\[[^\]]*\]\]/g, '').trim();
  if (muet) dit = String(oral || '').split(/\[\[/)[0].trim(); // avec une commande : seulement ce qui a été dit avant elle
  if (!dit && detailPropre && !montrer) dit = detailPropre.replace(/```[\s\S]*?```/g, ' ').replace(/[*#`>|_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (!spoken && dit) await say(dit);
  CONV.note('Atlas', dit);
  c.push({ role: 'assistant', content: `${dit}${detailPropre ? `\n[[ecran]]\n${detailPropre}` : ''}`.slice(0, 4000), at: Date.now() });
  if (c.length > 40) S.chat = c.slice(-40);
  save();
  MEMOIRE.tour(); // il retient ce qui dure (après quelques échanges)
  if (!cmd) return;
  const a = cmd[1].toLowerCase(), arg = (cmd[2] || '').trim();
  if (a === 'pardon') { if (!spoken) await say(pick(["Pardon ? Je n'ai pas bien entendu.", 'Tu peux répéter ? Je n\'ai pas bien saisi.', "Pardon, je n'ai pas compris."])); dlg.state = 'talk'; dlg.silence = 0; return; }
  if (a === 'commande' && arg) { window.__ordreDuCerveau = true; try { return await handle(arg); } finally { window.__ordreDuCerveau = false; } }
  if (a === 'regarder') return voir(text);
  if (a === 'web') return internet(text, arg);
  if (a === 'rappel') return rappelPour(arg, spoken);
  if (a === 'note' && arg) return noter(arg);
  if (a === 'minuteur') return OUTILS.minuteur(arg ? `minuteur ${arg}` : text);
  if (a === 'meteo') return OUTILS.meteo(text);
  if ((a === 'allume' || a === 'eteins') && arg) return MAISON.pilote(arg, a === 'allume');
}

/* ---------- les rappels ([[rappel:AAAA-MM-JJ HH:MM|texte]], « rappelle-moi de… dans 20 minutes / à 18 h ») ---------- */
function rappelPour(arg, discret) {
  const m = String(arg).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*\|\s*(.+)/);
  if (!m) return say("Je n'ai pas compris l'heure du rappel.");
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (d < new Date()) return say('Cette heure est déjà passée.');
  S.minuteurs.push({ id: Date.now(), nom: m[6].trim(), fin: +d, total: (d - Date.now()) / 1000, type: 'rappel' }); save();
  return discret ? Promise.resolve() : say(`Rappel enregistré pour ${d.toLocaleDateString('fr-FR', { weekday: 'long' })} à ${hhmm(d)}.`);
}
async function rappelLocal(text) {
  const n = N(text), raw = String(text);
  const mq = raw.match(/rappelle[- ]moi\s+(de\s+|d['’]\s*|qu['’]\s*|que\s+)?(.+?)(?:\s+(?:dans|à|a|vers|demain|ce soir)(?=\s|$).*)?$/i) || [];
  const lien = (mq[1] || '').trim().replace(/^d['’]$/, "d'").replace(/^qu['’]$/, "qu'"), quoi = mq[2] || '';
  let fin = 0;
  const sec = OUTILS._duree(n);
  if (/\bdans\b/.test(n) && sec) fin = Date.now() + sec * 1000;
  const h = n.match(/\b(?:a|vers)\s+(\d{1,2})\s*(?:heures?|h)\s*(\d{1,2})?/);
  if (!fin && h) { const d = new Date(); d.setHours(+h[1], h[2] ? +h[2] : 0, 0, 0); if (/\bdemain\b/.test(n) || d <= new Date()) d.setDate(d.getDate() + 1); fin = +d; }
  if (!fin) return false;
  const nom = quoi.trim().replace(/[.!?]+$/, '') || 'ton rappel';
  S.minuteurs.push({ id: Date.now(), nom: lien && quoi ? `${lien}${/['’]$/.test(lien) ? '' : ' '}${nom}` : nom, fin, total: (fin - Date.now()) / 1000, type: 'rappel' }); save();
  const d = new Date(fin);
  await say(`C'est noté : je te rappelle ${lien && quoi ? `${lien}${/['’]$/.test(lien) ? '' : ' '}` : ''}${nom}${fin - Date.now() < 3 * 3600000 ? ` dans ${Math.round((fin - Date.now()) / 60000)} minutes` : ` ${d.getDate() !== new Date().getDate() ? 'demain ' : ''}à ${hhmm(d)}`}.`);
  return true;
}

/* ---------- Internet : la recherche web de Groq, ou l'ordinateur de la maison ---------- */
async function groqWeb(question) {
  const key = S.settings.key;
  if (!key || navigator.onLine === false) return '';
  const ctl = window.AbortController ? new AbortController() : null;
  const tm = setTimeout(() => ctl && ctl.abort(), 35000);
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: `Tu es Atlas, l'assistant vocal d'un adulte. Nous sommes le ${d}. Cherche sur le web, puis réponds en français en deux à cinq phrases courtes, faites pour être dites à voix haute : pas de markdown, pas de liste, pas de lien, pas de références entre crochets. Donne les faits récents avec leur date si utile. Termine par une phrase « Source : » suivie du nom du site principal. Si tu ne trouves pas, dis-le.` },
          { role: 'user', content: question },
        ],
        tools: [{ type: 'browser_search' }], tool_choice: 'required', reasoning_effort: 'low', temperature: 0.4, max_completion_tokens: 1800,
      }),
    });
    if (!r.ok) { const e = new Error(`web ${r.status}`); e.status = r.status; throw e; }
    const j = await r.json();
    const m = j && j.choices && j.choices[0] && j.choices[0].message;
    return nettoie(m && m.content);
  } finally { clearTimeout(tm); }
}
async function maisonWeb(question, mode) {
  const root = VOIXMAISON.root();
  if (!root) return null;
  const r = await fetch(`${root}/shadow/web?${new URLSearchParams({ q: question, mode })}`);
  return r.ok ? r.json() : null;
}
async function internet(question, recherche, actus) {
  NOYAU.etiquette('RECHERCHE');
  face.set('think');
  await say(pick(['Je cherche.', 'Je regarde sur Internet.', 'Une seconde, je cherche.']));
  try {
    const q = (recherche || question).slice(0, 200);
    if (!actus) { try { const t = await groqWeb(q); if (t) { face.set('idle'); return say(t); } } catch (e) { console.warn('web groq', e); } }
    let res = null;
    try { res = await maisonWeb(actus ? (recherche || '') : q, actus ? 'actus' : 'tout'); } catch (e) { res = null; }
    const actusL = res && res.actus ? res.actus.slice(0, 7) : [], savoir = res && res.savoir ? res.savoir : [];
    if (!actusL.length && !savoir.length) { face.set('confused'); return say("Je n'arrive pas à aller sur Internet en ce moment : ni Groq, ni l'ordinateur de la maison ne répondent."); }
    const extraits = actusL.map(a => `- ${a.titre} (${a.source}${a.date ? `, ${a.date}` : ''})`).concat(savoir.map(w => `- Wikipédia « ${w.titre} » : ${w.texte}`)).join('\n');
    if (!AI.ready()) return say(actusL.length ? `Les titres : ${actusL.slice(0, 4).map(a => `${a.titre}, d'après ${a.source}`).join('. ')}.` : `D'après Wikipédia : ${savoir[0].texte.slice(0, 400)}`);
    const t = await AI.chat([
      { role: 'system', content: `${systeme(question)}\n\nVoici ce que tu viens de trouver sur Internet (titres d'actualité récents et extraits de Wikipédia) :\n${extraits}\n\nRéponds à voix haute, en deux à cinq phrases, uniquement avec ces informations ; ignore ce qui ne correspond pas à la question. Cite la source à l'oral (« d'après Frandroid… »). Si rien ne répond, dis-le simplement. Pas de commande entre crochets.` },
      { role: 'user', content: question },
    ], { maxTokens: 320, temperature: 0.4 });
    face.set('idle');
    return say(nettoie(t) || "Je n'ai rien trouvé de clair.");
  } finally { NOYAU.etiquette(null); }
}

/* ---------- il regarde (vision détaillée) ---------- */
async function voir(question) {
  const maison = typeof SECURITE !== 'undefined' && SECURITE.visionMaison(); // un modèle de vision à la maison : l'image ne sort pas de chez nous
  if (!maison && (!S.settings.seeCloud || !S.settings.key)) return say("Pour que je voie, il faut le modèle de vision de la maison, ou la vision détaillée dans mes réglages : une photo de la caméra est alors envoyée à Groq pour la décrire.");
  NOYAU.etiquette('VISION');
  face.set('think');
  try {
    const img = typeof VISION !== 'undefined' && VISION.isOn() ? VISION.snapshot() : await CAMERA.photo();
    if (!img) { face.set('confused'); return say("Ma caméra ne s'ouvre pas. Autorise la caméra pour ce site."); }
    if (maison) {
      try {
        const ctl = window.AbortController ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), 160000);
        const j = await (await fetch(`${VOIXMAISON.root()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question }), signal: ctl ? ctl.signal : undefined })).json();
        clearTimeout(tm);
        if (j && j.texte) { face.set('idle'); return say(nettoie(j.texte)); }
      } catch (e) { /* la vision de la maison ne répond pas : Groq, s'il est permis */ }
      if (!S.settings.seeCloud || !S.settings.key) { face.set('confused'); return say("La vision de la maison ne répond pas pour le moment."); }
    }
    const r = await AI.see(img, `Tu es Atlas, l'assistant d'un adulte. Voici ce que voit ta caméra en ce moment. Réponds en français, en deux à quatre phrases naturelles et précises, à sa question : « ${question} ». Factuel, sans inventer. Ne décris pas le corps des personnes. Pas d'émoji, pas de liste.`);
    face.set('idle');
    return say(nettoie(r) || "Je ne vois rien de clair.");
  } catch (e) { face.set('oops'); return say(e.status === 429 ? 'La vision a épuisé son crédit pour le moment.' : "Je n'arrive pas à analyser l'image."); } finally { NOYAU.etiquette(null); }
}

/* ---------- les notes ---------- */
async function noter(txt) {
  const t = String(txt).trim().replace(/^que\s+/i, '');
  if (!t) return say('Je note quoi ?');
  S.notes.push({ id: Date.now(), text: t.charAt(0).toUpperCase() + t.slice(1), at: Date.now() });
  save(); fx.ok();
  return say('Noté.');
}
async function lireNotes() {
  const l = S.notes;
  if (!l.length) return say("Tu n'as aucune note.");
  return say(l.length === 1 ? `Une note : ${l[0].text}` : `Tu as ${l.length} notes. ${l.slice(-5).map(x => x.text).join('. ')}.`);
}
async function effacerNotes() {
  if (!S.notes.length) return say("Il n'y a rien à effacer.");
  if (!(await askYesNo(`J'efface tes ${S.notes.length} notes ?`))) return say('Je les garde.');
  S.notes.forEach(x => tomb('notes', x)); S.notes = []; save();
  return say('Notes effacées.');
}

/* ---------- le point de situation au démarrage ---------- */
function briefing(fin = true) {
  const h = new Date().getHours(), parts = [`${h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'}${appel()}.`];
  if (LIEN.ok() && LIEN.minutes()) parts.push(`${LIEN.prenom() || 'Ton fils'} a passé ${LIEN.minutes()} minutes avec Shadow aujourd'hui.`);
  if (S.notes.length) parts.push(`Tu as ${S.notes.length} note${S.notes.length > 1 ? 's' : ''}.`);
  const up = LIEN.upcoming(2)[0];
  if (up) parts.push(`${up.e.text.charAt(0).toUpperCase()}${up.e.text.slice(1)} ${up.days === 0 ? "aujourd'hui" : up.days === 1 ? 'demain' : `dans ${up.days} jours`}.`);
  if (!AI.ready()) parts.push('Attention : mon noyau cognitif est hors ligne.');
  if (fin) parts.push(pick(["Je t'écoute.", 'À ta disposition.', 'Que puis-je faire pour toi ?']));
  return parts.join(' ');
}

/* ---------- ce qu'il comprend ---------- */
const R = {
  reveil: /\b(atlas|atlass|atlasse|atla|at las|at lass|at last|hatlas|hatlass|attlas|atlace|atlase|atlass|latlas|a tlas|a classe|atlase|atlast|hat last|atia|hathia|atlia|atlasse|maxlas|matlas|atlaz|attla)\b/,
  veille: /\b(veille|mets toi en veille|en veille|c est tout|merci c est tout|au revoir|repose toi|tu peux te reposer)\b/, // « bonne nuit Atlas » : la routine du coucher (visio.js)
  stop: /^(stop|tais toi|silence|chut|arrete|ca suffit|stoppe)\b/,
  repete: /\b(repete|redis|tu peux repeter|j ai pas compris|pardon)\b/,
  noter: /^(?:note|prends note|ajoute a mes notes|ajoute dans mes notes|note dans mes notes)\b\s*(?:que |de |:)?\s*(.+)$/,
  lire: /\b(lis|lire|quelles sont|dis moi) (moi )?(mes|les) notes\b|^mes notes$/,
  effacer: /\b(efface|supprime|vide) (toutes )?(mes|les) notes\b/,
  journee: /\b(journee|bilan|il a fait quoi|qu est ce qu il a fait|comment ca s est passe|comment s est passee|temps d ecran|il a joue a quoi)\b.*\b(fils|petit|shadow|lui|il|aujourd hui)\b|\b(la journee|le bilan) d/,
  rappel: /\brappelle moi\b/,
  convOn: /\b(participe (a|aux) (la |nos |les )?(conversations?|discussions?)|mode conversation|ecoute (la|nos) (conversation|discussion)|tu peux participer)\b/,
  convOff: /\b(ne participe plus|arrete de participer|arrete d ecouter (la|nos) (conversation|discussion)|mode discret|ne nous ecoute plus|reste discret)\b/,
  apprendVoix: /\b(apprends|retiens|enregistre) (ma|la) voix\b/,
  quiParle: /\b(qui (parle|me parle|suis je|je suis)|tu (reconnais|sais reconnaitre) ma voix|tu sais qui (je suis|parle)|c est qui qui parle)\b/,
  oublieVoix: /\boublie (la|ma) voix\b/,
  presente: /\b(presente toi|presentez vous|qui es tu|tu es qui|presente toi a)\b/,
  effacerEcran: /^(efface|efface l ecran|cache l ecran|ferme l ecran|ferme)$/,
  web: /\b(cherche|recherche|regarde|trouve|va voir|verifie)\b.*\b(internet|le web|en ligne|google)\b|\bsur (internet|le web)\b|^(cherche|recherche|trouve moi)\b(?!.*\b(mes|ma|mon) (cles|cle|telephone|lunettes|portefeuille|papiers)\b)|\b(qui a gagne|le score (de|du)|les resultats (de|du|des) (match|psg|om|ligue|elections?|loto))\b/,
  actus: /\b(actualites?|actus|les infos|les nouvelles|quoi de neuf (dans le monde|en france|aujourd hui)|les titres du jour|le journal)\b/,
  voir: /\b(qu est ce que tu vois|tu vois quoi|que vois tu|regarde|regardes|tu me vois|qui est la|decris ce que tu vois|combien de doigts|qu est ce que je tiens|je tiens quoi|c est quoi ca|qu est ce que c est que ca)\b/,
};
// une phrase → l'ordre qu'un module sait faire (sans le cerveau)
function routeUn(t, n) {
  for (const [nom, M] of [['memoire', typeof MEMOIRE !== 'undefined' && MEMOIRE], ['visio', typeof VISIO !== 'undefined' && VISIO], ['scifi', typeof SCIFI !== 'undefined' && SCIFI], ['pc', typeof PC !== 'undefined' && PC], ['marche', typeof MARCHE !== 'undefined' && MARCHE], ['surete', typeof SECURITE !== 'undefined' && SECURITE], ['maison', typeof MAISON !== 'undefined' && MAISON], ['outils', !R.web.test(n) && typeof OUTILS !== 'undefined' && OUTILS]]) {
    if (!M) continue;
    const f = M.route(t, n); if (f) return { f, nom };
  }
  return null;
}
// « … et mets …», « …, puis éteins … » : on coupe avant chaque nouvel ordre (un verbe d'action après « et », « puis », « ensuite »)
const VERBES_ORDRE = '(?:mets?|allume|rallume|[ée]teins?|[ée]teint|ouvre|lance|joue|baisse|monte|augmente|diminue|coupe|ferme|passe|verrouille|lis|dis|fais|active|montre|affiche|arr[êe]te|remets?|r[ée]duis|agrandis|tamise|envoie|rappelle|note|cherche|regarde|reprends?)';
function enchaine(t) {
  const bouts = String(t).replace(/[.!?]+\s*$/, '').split(new RegExp(`\\s*,?\\s+(?:et puis|et ensuite|et|puis|ensuite|après|apres)\\s+(?=${VERBES_ORDRE}(?:[\\s'’-]|$))`, 'i')).map(x => x.trim()).filter(Boolean);
  if (bouts.length < 2) return null;
  const ordres = bouts.map(b => { const r = routeUn(b, N(b)); return { t: b, f: r && r.f, nom: r && r.nom }; });
  if (!ordres.some(o => o.f)) return null; // rien qu'un module sache faire : c'est une phrase pour le cerveau
  if (ordres.every(o => o.nom === 'maison')) return null; // que la maison : elle sait faire plusieurs lumières en une seule réponse
  return ordres;
}
/* ---------- la reformulation : ce qu'on dit à l'oral, en ordre clair (plus rapide et plus sûr que le cerveau en ligne) ---------- */
const INFINITIFS = { allumer: 'allume', rallumer: 'rallume', eteindre: 'eteins', mettre: 'mets', baisser: 'baisse', monter: 'monte', augmenter: 'augmente', diminuer: 'diminue', couper: 'coupe', lancer: 'lance', ouvrir: 'ouvre', fermer: 'ferme', montrer: 'montre', afficher: 'affiche', arreter: 'arrete', envoyer: 'envoie', jouer: 'joue', chercher: 'cherche', regarder: 'regarde', activer: 'active', desactiver: 'desactive', tamiser: 'tamise', verrouiller: 'verrouille', noter: 'note', rappeler: 'rappelle', dire: 'dis', donner: 'donne', lire: 'lis', passer: 'passe' };
function reformule(n) {
  let m = n;
  // la politesse : « tu peux… », « est-ce que tu pourrais… », « … s'il te plaît »
  m = m.replace(/^(est ce que |est ce qu )?(tu peux|tu pourrais|tu veux bien|peux tu|pourrais tu|tu voudrais bien|j aimerais que tu|je voudrais que tu|je veux que tu|vas y|allez|essaie de|essaye de)\s+(me |nous )?/, '');
  m = m.replace(/\s+(s il te plait|s il vous plait|stp|svp|please|merci)$/, '');
  m = m.replace(/^(\w+)\b/, w => INFINITIFS[w] || w);
  const demain = /\bdemain\b/.test(m);
  if (/\b(trop sombre|on (n )?y voit (rien|pas grand chose)|un peu de lumiere|plus de lumiere|fais (de la |un peu de )?lumiere)\b/.test(m) && !/\b(dehors|camera|jardin|cour)\b/.test(m)) return 'allume la lumiere';
  if (/\b(trop clair|trop de lumiere|ca eblouit|ca m eblouit)\b/.test(m)) return 'baisse la lumiere';
  if (/^(un peu |encore )?(moins fort|moins de son|moins de bruit)$/.test(m)) return 'baisse le son';
  if (/^(un peu |encore )?(plus fort|plus de son|j entends rien|on entend rien)$/.test(m)) return 'monte le son';
  if (/\b(c est quoi le programme|quel est (le|mon) programme|qu est ce qu on a de prevu|qu est ce que j ai de prevu|quoi de prevu|j ai des trucs de prevu)\b/.test(m)) return `qu est ce que j ai ${demain ? 'demain' : 'aujourd hui'}`;
  if (/\b(il va faire (beau|chaud|froid|moche|mauvais|bon)|il fera (beau|chaud|froid|quel temps)|faut il (prendre )?un parapluie|je prends un parapluie|il va y avoir du soleil)\b/.test(m)) return `quel temps fait il${demain ? ' demain' : ''}`;
  const ins = (m.match(/\b(l or|l argent|le cuivre|l euro dollar|l euro|le bitcoin)\b/) || [])[1];
  if (ins && (/^(l or|l argent|le cuivre|l euro dollar|l euro|le bitcoin)\b.*\b(combien|a quel prix|ou en est|il fait quoi|ca donne quoi|comment (il|elle) va|ca bouge)\b/.test(m) || /^(comment va|ou en est|ca donne quoi|quoi de neuf sur) /.test(m))) return `cours de ${ins}`;
  if (/\b((il )?y a (quelqu un|du monde) dehors|quelqu un dans (le jardin|la cour)|tout est calme dehors|rien a signaler dehors)\b/.test(m)) return 'scan de securite';
  if (/^bonne nuit$/.test(m)) return 'je vais me coucher';
  if (/\b(c est l heure du film|on se (fait|regarde) un film|soiree film|on mate un film)\b/.test(m)) return 'mode cinema';
  if (/^(fais la fete|c est la fete|ambiance (soiree|fete)|mets l ambiance)$/.test(m)) return 'mode soiree';
  // la politesse enlevée : seulement si ce qui reste est un ordre (une vraie question va au cerveau telle quelle)
  return m !== n && /^(allume|rallume|eteins|mets|baisse|monte|augmente|diminue|coupe|lance|ouvre|ferme|montre|affiche|arrete|envoie|joue|active|desactive|tamise|verrouille|note|rappelle|passe)\b/.test(m) ? m : null;
}
// le test du larsen : une chose coupée à la fois, quinze secondes chacune ; il dit à l'oreille quelle phase siffle
const LARSEN = [];
async function testLarsen() {
  const ecr = (n, t) => showBoard(`<div style="text-align:center;padding:26px 18px;font-family:ui-monospace,monospace"><div style="font-size:clamp(40px,9vw,90px);color:#7dd3fc;letter-spacing:.1em">PHASE ${n}</div><div style="font-size:clamp(16px,3vw,26px);color:#e0f2fe;letter-spacing:.14em;margin-top:10px">${t}</div></div>`);
  const pause = on => [fx.ctx, OREILLES.ctx && OREILLES.ctx()].forEach(c => { try { if (c) on ? c.suspend() : c.resume(); } catch (e) { /* rien */ } });
  const note = t => { LARSEN.push(`${hhmm(new Date())}:${String(new Date().getSeconds()).padStart(2, '0')} ${t}`); if (LARSEN.length > 12) LARSEN.shift(); };
  await say("Test du larsen. Trois phases de quinze secondes. Écoute la sono, et retiens le numéro des phases où ça siffle.");
  try {
    ecr(1, 'MICRO COUPÉ'); await say('Phase 1 : micro coupé.'); note('phase 1 : micro coupé'); OREILLES.stop(); await wait(15000);
    ecr(2, 'MICRO ALLUMÉ'); await say('Phase 2 : micro allumé.'); note('phase 2 : micro allumé'); try { await OREILLES.reopen(); } catch (e) { note('micro : ' + e.message); } await wait(15000);
    ecr(3, "LE SON D'ATLAS EN PAUSE · MICRO ALLUMÉ"); await say("Phase 3 : le son d'Atlas en pause, micro allumé."); note('phase 3 : son en pause, micro allumé'); pause(true); await wait(15000);
  } finally { pause(false); hideBoard(); note('fin'); }
  await say('Fin du test. Alors : ça sifflait pendant la phase 1, la phase 2, ou la phase 3 ?');
}
async function handle(text) {
  if (!window.__ordreDuCerveau) { dlg.ordrePrecedent = dlg.dernierOrdre; dlg.dernierOrdre = { t: String(text).replace(/^\s*atlas[\s,]*/i, '').slice(0, 120), at: Date.now() }; }
  if (typeof CONSTELLATION !== 'undefined') CONSTELLATION.note('papa', text); // une seule mémoire
  let n = N(text);
  cacheEcran();
  // « Atlas, … » : son nom au début ne compte pas
  // « Non, Atlas, … », « Attends Atlas, … » : un petit mot avant son nom ne compte pas non plus
  n = n.replace(/^(non|mais|attends|attend|bon|alors|euh|bah|ben|oui|ok|ah|oh|pardon|excuse moi|stop)\s+(?=(l )?(atlas|atlass|atlasse|atla|at las|hatlas|attlas|latlas|a classe|la classe|atlast|atia)\b)/, '');
  n = n.replace(/^((dis |hey |he |ok |eh )?(l )?(atlas|atlass|atlasse|atla|at las|at lass|at last|hatlas|hatlass|attlas|atlace|atlase|latlas|a tlas|a classe|la classe|atlast|hat last|atia|hathia|atlia))\s*/, '').trim();
  const t = String(text).replace(/^\s*(?:(?:non|mais|attends|attend|bon|alors|euh|bah|ben|oui|ok|ah|oh|pardon|excuse-moi|stop)[\s,.!]+(?=(?:l['’]\s*)?(?:atlas|atla|atlass|la classe|[àa] classe)))?((dis|hey|hé|ok|eh)[\s,]+)?(l['’]\s*)?(atlas|atlass|atlasse|atla|at las|at lass|at last|hatlas|hatlass|attlas|atlace|atlase|latlas|a tlas|la classe|[àa] classe|atlast|hat last|atia|hathia|atlia)[\s,.!?]*/i, '').trim() || text;
  // un ordre dans une phrase d'après (« Non, Atlas, t'as pas compris. Éteins la cuisine. ») : c'est l'ordre qui compte
  const phrases = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (phrases.length > 1) {
    const k = phrases.findIndex((p, i) => i > 0 && /^(allume|rallume|eteins|eteint|mets|met|baisse|monte|augmente|diminue|coupe|tamise|ouvre|ferme|lance|active|montre|affiche)\b/.test(N(p)));
    if (k > 0 && !/^(allume|rallume|eteins|eteint|mets|met|baisse|monte|augmente|diminue|coupe|tamise)\b/.test(n)) return handle(phrases.slice(k).join(' '));
  }
  if (!n) { face.flash('happy', 800); return say(pick(['Oui ?', 'Je t\'écoute.', 'Oui' + appel() + ' ?'])); }
  const clair = reformule(n); // « tu peux allumer le salon », « il fait trop sombre », « l'or est à combien » : en ordre clair
  if (clair && clair !== n) return handle(clair);
  // plusieurs ordres d'affilée : « mets les lumières à 30 % et mets de la musique romantique », « éteins la télé, puis verrouille l'ordi »
  const ordres = enchaine(t);
  if (ordres) { for (const o of ordres) { if (o.f) await o.f(); else await handle(o.t); } return; }
  if (/\b(test|teste|tester|essai) (du |le |de |un )?(larsen|larcene|larsene)\b/.test(n)) return testLarsen();
  if (/\b(active|desactive|coupe|enleve|remets|allume|eteins) (l )?anti ?echo\b/.test(n)) { const on = /\b(active|remets|allume)\b/.test(n); S.settings.micAEC = on; save(); await say(on ? "Anti-écho activé. Je relance mes oreilles." : "Anti-écho coupé : plus de larsen sur la sono. Je relance mes oreilles."); setTimeout(() => location.reload(), 600); return; }
  if (/^(ouvre|affiche|montre|ouvrir) (les |tes |mes )?(reglages|parametres)$|^(reglages|parametres)$/.test(n)) { ouvreReglages(); return say('Réglages ouverts.'); }
  if (R.stop.test(n) && !voice.occupe() && typeof PC !== 'undefined' && PC.radioIci && PC.radioIci()) return PC.radioCoupe(); // « stop » : la radio d'ici s'arrête
  if (R.stop.test(n)) { voice.stop(); hideBoard(); dlg.state = 'standby'; face.set('idle'); return; }
  if (/^(quelle heure (est il|il est|est ce)|il est quelle heure|c est quelle heure|t as l heure|tu as l heure|l heure)$/.test(n)) { const d = new Date(); return say(`Il est ${d.getHours()} h ${d.getMinutes() ? deux2(d.getMinutes()) : ''}.`.replace(' h .', ' heures.')); }
  if (/^(on est quel jour|quel jour (sommes nous|on est|est on|nous sommes)|c est quel jour|quelle est la date|on est le combien|quelle date (on est|sommes nous))$/.test(n)) return say(`Nous sommes ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`);
  // « mets l'écran en veille » : c'est l'écran (pc.js), pas lui
  if (R.veille.test(n) && n.split(' ').length <= 6 && !/\b(ecran|ecrans|ordi|ordinateur|pc)\b/.test(n)) { dlg.state = 'standby'; dlg.discret = true; face.set('idle'); return say(pick(['Je reste en veille. Dis « Atlas » quand tu as besoin de moi.', 'En veille.'])); }
  if (R.repete.test(n) && n.split(' ').length <= 5) return say(lastSaid || "Je n'ai encore rien dit.");
  if (R.effacerEcran.test(n)) { hideBoard(); return say('OK.'); }
  const nt = t.match(/^\s*(?:note|prends note|ajoute (?:à|a) mes notes|ajoute dans mes notes|note dans mes notes)\s*(?:que |de |:)?\s*(.+)$/i);
  if (nt && R.noter.test(n)) return noter(nt[1]);
  if (R.effacer.test(n)) return effacerNotes();
  if (R.lire.test(n)) return lireNotes();
  if (R.journee.test(n)) return say(LIEN.journee());
  if (R.convOn.test(n)) { S.settings.conversation = true; dlg.discret = false; save(); return say("Je participe à vos conversations. Je n'interviens que si j'ai quelque chose d'utile à dire, et je reste discret le reste du temps. Dis « reste discret » si tu veux que je me taise."); }
  if (R.convOff.test(n)) { S.settings.conversation = false; save(); return say("Je reste discret : je ne réponds plus que quand on m'appelle par mon nom."); }
  if (R.apprendVoix.test(n)) return apprendreVoix(t);
  if (R.oublieVoix.test(n)) { const m = t.match(/oublie (?:la|ma) voix (?:de |d['’])?\s*(.+)$/i); const nom = m ? m[1].trim() : dlg.qui; if (nom && !/^invité/.test(nom) && VOIX.forget(nom)) return say(`J'ai oublié la voix de ${nom}.`); return say("Je ne connais pas cette voix."); }
  if (R.quiParle.test(n)) return say(!dlg.qui ? (OREILLES.engine() === 'whisper' ? "Je ne reconnais pas ta voix. Dis « apprends ma voix », et je la retiendrai." : "Pour reconnaître les voix, il me faut les oreilles de la maison ou celles de Groq.") : /^invité/.test(dlg.qui) ? "Je ne connais pas encore ta voix. Dis « apprends ma voix », et je la retiendrai." : `C'est ${dlg.qui}. Je reconnais ta voix.`);
  if (R.presente.test(n) && !/\b(invites|amis|collegues|clients|tout le monde|a tous|la compagnie)\b/.test(n)) return presentation(); // « présente-toi à mes invités » : le spectacle (visio.js)
  const bord = typeof BORD !== 'undefined' && BORD.route(t, n); // le journal de bord, le flux de pensée
  if (bord) return bord();
  const foyer = typeof FOYER !== 'undefined' && FOYER.route(t, n); // ses proches, ses affaires rangées, ce qu'il a prêté
  if (foyer) return foyer();
  const souvenir = MEMOIRE.route(t, n); // sa mémoire : « souviens-toi que… », « qu'est-ce que tu sais sur moi ? »
  if (souvenir) return souvenir();
  const ailleurs = typeof CONSTELLATION !== 'undefined' && CONSTELLATION.route(t, n); // « envoie ça sur mon téléphone », « montre les caméras sur l'ordi »
  if (ailleurs) return ailleurs();
  if (typeof FUTUR !== 'undefined' && !(await FUTUR.autorise(n))) return; // l'accès vocal : les ordres sensibles, seulement à la voix de papa
  const fut = FUTUR.route(t, n); // le cinéma, les clés, l'œil de faucon, le chef
  if (fut) return fut();
  const sc = SCENE.route(t, n); // le coach, les gestes, le jeu télévisé, le traducteur
  if (sc) return sc();
  const rdv = AGENDA.route(t, n); // ton Google Agenda : « qu'est-ce que j'ai aujourd'hui ? »
  if (rdv) return rdv();
  const duo = DUO.route(t, n); // « discute avec Shadow », « accueille nos invités »
  if (duo) return duo();
  const trade = TRADING.route(t, n); // le copilote de trading : « mode trading », « je suis à moins 300 », « fin de session »
  if (trade) return trade();
  const visio = VISIO.route(t, n); // les visios et les effets de lumière (« mode visio », « fondu au noir », « présente-toi à mes invités »)
  if (visio) return visio();
  const proto = SCIFI.route(t, n); // les protocoles : scan de sécurité, départ, retour, état des systèmes, présences, la fusée
  if (proto) return proto();
  const ordi = PC.route(t, n); // l'ordinateur : le son, la musique, l'écran, les fenêtres, les applis, Gmail (une liste fermée d'actions)
  if (ordi) return ordi();
  const bourse = MARCHE.route(t, n); // les marchés : cours, annonces, graphique
  if (bourse) return bourse();
  const surete = SECURITE.route(t, n); // l'alarme (lire, activer — jamais désactiver) et les caméras
  if (surete) return surete();
  const maison = MAISON.route(t, n); // la maison (prises, lampes, scènes), le messager et ce que Shadow a appris
  if (maison) return maison();
  if (R.rappel.test(n) && (await rappelLocal(t))) return;
  const outil = !R.web.test(n) && OUTILS.route(t, n); // le couteau suisse
  if (outil) return outil();
  if (R.voir.test(n) && !R.web.test(n)) return voir(t);
  if (R.actus.test(n) && !R.web.test(n)) {
    const sujet = (n.match(/\b(?:sur|de|du|concernant|a propos de)\s+(?:l |la |le |les )?(.+)$/) || [])[1] || '';
    return internet(t, sujet.replace(/\b(aujourd hui|du jour|en ce moment|s il te plait)\b/g, '').trim(), true);
  }
  if (R.web.test(n)) {
    const q = t.replace(/^.*?\b(?:cherche|recherche|regarde|trouve|va voir|vérifie|verifie)\b\s*(?:sur|dans|en)?\s*(?:internet|le web|ligne|google)?\s*(?:si|ce que|qui|quel|quelle|pour)?\s*/i, '').trim();
    return internet(t, q.length > 3 ? q : t);
  }
  return repondre(t);
}

/* ---------- le mode conversation : il suit la discussion de la maison, et intervient seulement à bon escient ----------
   - il sait qui parle (empreinte de voix) ; une voix inconnue devient « invité 1 », « invité 2 »… le temps de la soirée ;
   - le fil de la conversation reste en mémoire vive (20 minutes au plus), jamais enregistré ;
   - il intervient seulement s'il apporte vraiment quelque chose (une question à laquelle il sait répondre, une erreur
     sur un fait) — jamais pendant une dispute, une conversation intime, ou avec un enfant qui ne lui parle pas ;
     au plus une intervention spontanée toutes les deux minutes ;
   - il accueille une fois par soirée une voix qu'il ne connaît pas ;
   - ce qui s'adresse à Shadow (et la réponse de Shadow) ne le concerne pas. */
const CONV = (() => {
  const fil = [];
  let spontane = 0, depuisEval = 0, invites = [], accueilli = 0, shadowJusqua = 0;
  function nomPour(print) {
    if (!print) return '';
    const id = VOIX.identify(print);
    if (id) { VOIX.learn(id.name, print); return id.name; } // il affine la voix des gens qu'il connaît
    let g = invites.find(x => VOIX.dist(x.p, print) < 7.5);
    if (!g) { g = { p: print, n: (invites.length ? invites[invites.length - 1].n : 0) + 1, vu: 0, debut: Date.now() }; invites.push(g); if (invites.length > 6) invites.shift(); }
    g.vu++; g.at = Date.now();
    return `invité ${g.n}`;
  }
  function note(qui, texte) {
    if (!texte) return;
    fil.push({ at: Date.now(), qui: qui || '', texte: String(texte).slice(0, 400) });
    while (fil.length > 60 || (fil.length && Date.now() - fil[0].at > 20 * 60000)) fil.shift();
  }
  const ligne = x => `${x.qui || "quelqu'un"} : ${x.texte}`;
  const recents = (k = 14) => fil.filter(x => Date.now() - x.at < 20 * 60000).slice(-k);
  const presents = () => [...new Set(recents(30).map(x => x.qui).filter(q => q && q !== 'Atlas' && !/^invité/.test(q)))];
  // combien d'AUTRES personnes ont parlé ces 4 dernières minutes (une voix inconnue ne compte que si elle a parlé 2 fois,
  // et toutes les voix inconnues comptent pour une seule si personne de connu n'est là : la même voix peut varier)
  // cette voix inconnue parle à Atlas : ce n'est pas un invité à accueillir (sans doute quelqu'un de la maison)
  function parleAtlas(qui) { const g = /^invité/.test(qui || '') && invites.find(x => `invité ${x.n}` === qui); if (g) g.connuAtlas = true; }
  function autres(qui) {
    const r = fil.filter(x => Date.now() - x.at < 4 * 60000 && x.qui && x.qui !== 'Atlas' && x.qui !== qui);
    const connus = new Set(r.filter(x => !/^invité/.test(x.qui)).map(x => x.qui));
    const inc = {}; r.filter(x => /^invité/.test(x.qui)).forEach(x => { inc[x.qui] = (inc[x.qui] || 0) + 1; });
    const nbInc = Object.keys(inc).filter(k => inc[k] >= 2).length;
    if (/^invité/.test(qui || '') && !connus.size) return 0; // une seule personne inconnue qui parle (sûrement la même)
    return connus.size + (connus.size ? nbInc : Math.min(nbInc, 1));
  }
  const nbInvites = () => new Set(recents(30).map(x => x.qui).filter(q => /^invité/.test(q))).size;
  function contexte() {
    const r = recents(12), connus = VOIX.people().map(p => p.name);
    let t = connus.length ? `Les voix que tu connais : ${connus.join(', ')}.` : '';
    t += dlg.qui ? (/^invité/.test(dlg.qui) ? ` Cette phrase vient d'une voix que tu ne connais pas (${dlg.qui}, peut-être un invité) : sois accueillant et poli.` : ` Tu reconnais la voix : c'est ${dlg.qui} qui te parle (adresse-toi à cette personne ; si c'est un enfant, parle simplement et gentiment).`) : '';
    if (r.length > 1) t += `\nLa conversation dans la pièce, juste avant (pour comprendre le contexte ; « invité » = une voix inconnue) :\n${r.map(ligne).join('\n')}`;
    return t;
  }
  // après « Shadow, … » : la réponse de Shadow (une ou deux phrases) n'est pas pour lui ;
  // la fenêtre se ferme dès qu'une voix connue reparle
  let shadowReste = 0;
  function pourShadow() { shadowJusqua = Date.now() + 15000; shadowReste = 2; }
  function shadowRepond(qui) {
    if (Date.now() > shadowJusqua || shadowReste <= 0) return false;
    if (qui && !/^invité/.test(qui)) { shadowJusqua = 0; return false; } // c'est quelqu'un de la maison qui parle
    shadowReste--; return true;
  }
  const QUESTION = /^(c est quoi|qu est ce|pourquoi|comment|combien|quand|qui|ou est|ou se|ou on|quel|quelle|quels|quelles|est ce que|tu sais|vous savez|on sait|ca fait combien|c etait quand|c est combien|il fait combien|ca existe|c est vrai que|tu crois que|vous croyez que)\b/;
  async function peutEtre(texte, qui) {
    if (voice.occupe()) return;
    // un invité : il l'accueille, une fois par soirée
    const g = /^invité/.test(qui) && invites.find(x => `invité ${x.n}` === qui);
    const nq = N(texte), estQuestion = /\?/.test(texte) || QUESTION.test(nq);
    // un vrai invité : une voix nouvelle (apparue il y a moins de 10 min), qui n'a jamais parlé à Atlas
    if (g && g.vu >= 2 && !g.connuAtlas && Date.now() - g.debut < 10 * 60000 && !estQuestion && Date.now() - spontane > 30000 && (presents().length || nbInvites() >= 2)) {
      const m = accueillirInvite();
      if (m && typeof DUO !== 'undefined') { face.set('idle'); return DUO.invites(false); }
      if (m) { note('Atlas', m); face.set('idle'); return say(m); }
    }
    depuisEval++;
    const n = N(texte), mots = n.split(' ').filter(Boolean).length, question = /\?/.test(texte) || QUESTION.test(n);
    if (mots < 4 || Date.now() - spontane < 120000) return;
    if (!question && depuisEval < 8) return; // il ne réfléchit pas à chaque phrase : seulement aux questions, ou de temps en temps
    if (!AI.ready()) return;
    depuisEval = 0;
    const r = recents(14);
    const sys = `Tu es Atlas, l'assistant vocal d'une maison (une IA de film : calme, précise, élégante, un brin pince-sans-rire). Tu écoutes discrètement la conversation de la famille et de ses invités. Les voix que tu reconnais sont nommées ; « invité 1 », « invité 2 »… sont des voix que tu ne connais pas ; « quelqu'un » : tu ne sais pas qui.
Décide si tu interviens maintenant. Interviens SEULEMENT si tu apportes vraiment quelque chose :
- quelqu'un pose une question (à la cantonade ou à un autre) à laquelle tu peux répondre de façon sûre et utile ;
- quelqu'un affirme quelque chose de faux sur un fait important, et tu en es certain ;
- très rarement, une remarque courte, fine et drôle qui tomberait parfaitement juste.
Ne parle JAMAIS : pour paraphraser ou approuver ; dans une conversation intime, triste, ou une dispute ; pour une question personnelle que tu ne peux pas connaître ; à un enfant qui ne t'a pas parlé ; si la question attend l'avis de quelqu'un d'autre ; sur l'actualité récente (tu n'es pas sûr sans chercher).
Si tu interviens : une ou deux phrases, à l'oral, naturelles, sans markdown ; adresse-toi à la personne par son prénom si tu le connais (jamais « invité » : dis plutôt « pour votre question… »). Sinon, réponds exactement : [[silence]]
Nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, il est ${hhmm()}.`;
    let t = '';
    try { t = String(await AI.chat([{ role: 'system', content: sys }, { role: 'user', content: `La conversation (la dernière phrase vient d'être dite) :\n${r.map(ligne).join('\n')}\n\nInterviens-tu ? Ta phrase, ou [[silence]].` }], { maxTokens: 150, temperature: 0.6 }) || ''); } catch (e) { return; }
    if (/\[\[\s*silence\s*\]\]/i.test(t)) return;
    const dit = nettoie(t).replace(/\[\[[^\]]*\]\]/g, '').trim();
    if (dit.length < 4 || /^(silence|rien|je n'interviens pas)/i.test(dit)) return;
    spontane = Date.now(); dlg.repondu = Date.now(); dlg.quiParlait = ''; dlg.state = 'talk'; dlg.silence = 0;
    note('Atlas', dit); face.set('idle');
    await say(dit);
  }
  // accueillir un invité (une fois par soirée) : la phrase, ou '' si c'est déjà fait
  function accueillirInvite() {
    if (S.settings.accueil === false || Date.now() - accueilli < 3 * 3600000) return '';
    accueilli = Date.now(); spontane = Date.now();
    const h = new Date().getHours();
    return `${h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'}. Je ne crois pas qu'on se connaisse : je suis Atlas, l'assistant de la maison. J'écoute la conversation et j'interviens si je peux aider ; il suffit de dire mon nom.`;
  }
  const dernier = () => { for (let i = fil.length - 1; i >= 0; i--) if (fil[i].qui !== 'Atlas') return fil[i].at; return 0; };
  return { nomPour, note, contexte, presents, nbInvites, pourShadow, shadowRepond, peutEtre, accueillirInvite, autres, parleAtlas, dernier, _fil: fil };
})();

/* ---------- l'accueil : quelqu'un arrive dans la pièce (vu à la caméra, ou entendu à la voix) ----------
   - quelqu'un de la famille qu'il n'a ni vu ni entendu depuis 3 heures : il l'accueille par son prénom ;
   - un visage ou une voix inconnus : il accueille l'invité (une fois par soirée) ;
   - au démarrage, ceux qui sont déjà là ne sont pas accueillis ; au plus un accueil par personne toutes les 3 heures. */
const ARRIVEE = (() => {
  const vu = {}; // dernière fois qu'on a vu ou entendu chacun (mémoire vive)
  let inconnuDepuis = 0, dernierAccueil = 0;
  const ABSENT = 3 * 3600000;
  function phrase(nom) {
    const h = new Date().getHours(), enfant = LIEN.prenom() && nom.toLowerCase() === LIEN.prenom().toLowerCase();
    if (enfant) return pick([`Salut ${nom} ! Content de te voir.`, `Tiens, ${nom} ! Salut.`, `Salut ${nom}. Shadow t'attend sûrement.`]);
    if (h < 11) return pick([`Bonjour ${nom}.`, `Bonjour ${nom}, bien dormi ?`]);
    if (h >= 18) return pick([`Bonsoir ${nom}, bon retour.`, `Bonsoir ${nom}.`, `Ah, bonsoir ${nom}. Bonne fin de journée ?`]);
    return pick([`Bonjour ${nom}, bon retour.`, `Re-bonjour ${nom}.`]);
  }
  // renvoie la phrase d'accueil s'il faut accueillir cette personne (sinon '')
  function connu(nom) {
    if (!nom || /^invité/.test(nom) || nom === 'Atlas' || S.settings.arrivee === false) { if (nom) vu[nom] = Date.now(); return ''; }
    const avant = vu[nom] || 0; vu[nom] = Date.now();
    if (!dlg.started || Date.now() - (dlg.depuis || 0) < 60000) return ''; // ceux qui étaient déjà là au démarrage
    if (Date.now() - avant < ABSENT) return '';
    if (Date.now() - dernierAccueil < 15000) { vu[nom] = avant; return ''; } // quelqu'un vient d'être accueilli : son tour viendra à la phrase suivante
    dernierAccueil = Date.now();
    PROACTIF.reconnu(nom); // le matin : le briefing suit l'accueil
    if (typeof DUO !== 'undefined' && DUO.visage(nom)) return ''; // papa ou son fils : l'accueil de cinéma (duo.js)
    return phrase(nom);
  }
  async function dire(t) { if (!t || voice.occupe() || dlg.busy) return; face.flash('happy', 1200); CONV.note('Atlas', t); await say(t); }
  // les yeux : chaque seconde, qui est dans la pièce
  function visages(faces) {
    if (!dlg.started) return;
    let accueil = '';
    for (const f of faces) if (f.name) { const t = connu(f.name); if (t && !accueil) accueil = t; }
    const inconnu = faces.some(f => !f.name && f.good);
    if (inconnu) { inconnuDepuis = inconnuDepuis || Date.now(); } else inconnuDepuis = 0;
    if (accueil) return dire(accueil);
    // un visage inconnu, bien visible depuis 5 secondes : un invité
    if (inconnuDepuis && Date.now() - inconnuDepuis > 5000 && Date.now() - (dlg.depuis || 0) > 60000 && faces.some(f => f.name)) { inconnuDepuis = 0; const t = CONV.accueillirInvite(); if (t && typeof DUO !== 'undefined') PROACTIF.annonce(`invites-${Date.now()}`, () => DUO.invites(false), { urgent: true, expire: Date.now() + 60000 }); else if (t) dire(t); }
  }
  async function yeux() {
    if (S.settings.camera === false || typeof VISION === 'undefined' || !VISION.supported || VISION.isOn()) return;
    if (!LIEN.visages().length && S.settings.arrivee === false) return;
    try { await VISION.start($('#cam'), { objects: false }); } catch (e) { console.warn('yeux', e); }
  }
  if (typeof VISION !== 'undefined') VISION.on('people', visages);
  return { connu, dire, yeux, dernier: () => Math.max(0, ...Object.values(vu)) };
})();

/* ---------- apprendre une voix ---------- */
async function apprendreVoix(text) {
  if (OREILLES.engine() !== 'whisper') return say("Pour reconnaître les voix, il me faut les oreilles de la maison ou celles de Groq, réglées dans mes réglages.");
  let nom = (String(text).match(/\b(?:je suis|je m['’]appelle|c['’]est|moi c['’]est)\s+([A-Za-zÀ-ÿ-]{2,20})/i) || [])[1] || '';
  for (let i = 0; i < 2 && !nom; i++) {
    const a = await ask('Comment tu t\'appelles ?');
    const m = String(a).replace(/^(je m['’]appelle|je suis|c['’]est|moi c['’]est|moi)\s+/i, '').trim().split(/\s+/)[0] || '';
    if (m.length >= 2 && (await askYesNo(`${m.charAt(0).toUpperCase()}${m.slice(1)}, c'est bien ça ?`))) nom = m;
  }
  if (!nom) return say("Je n'ai pas compris le prénom. On réessaiera.");
  nom = nom.replace(/[.,!?;:«»"]+/g, '').trim();
  nom = nom.charAt(0).toUpperCase() + nom.slice(1);
  const phrases = [`Très bien, ${nom}. Parle-moi un peu de ta journée, en quelques phrases.`, "Maintenant, dis-moi ce que tu as prévu demain.", 'Et pour finir, compte lentement jusqu\'à quinze.'];
  const prints = [];
  for (const q of phrases) {
    let l = q;
    for (let k = 0; k < 2; k++) {
      await ask(l, { wait: 25000 });
      const p = OREILLES.takePrint();
      if (p) { prints.push(p); break; }
      l = 'Parle un peu plus longtemps, que je retienne bien ta voix.';
    }
  }
  if (prints.length < 2) return say("Je n'ai pas assez bien entendu ta voix. On réessaiera dans un endroit plus calme.");
  VOIX.enroll(nom, prints);
  dlg.qui = nom; fx.ok();
  return say(`C'est fait, ${nom}. Je reconnaîtrai ta voix, même au milieu d'une conversation.`);
}

/* ---------- « présente-toi » : pour les invités ---------- */
async function presentation() {
  const p = CONV.presents(), inv = CONV.nbInvites(), h = new Date().getHours();
  const salut = `${h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'}${inv ? ` à tous, et bienvenue à nos invités` : p.length ? ` ${p.join(', ')}` : ''}.`;
  const inv2 = typeof VISIO !== 'undefined' ? VISIO.inventeurs() : '';
  await say(`${salut} Je suis Atlas, l'assistant de cette maison${inv2 ? `, inventé par ${inv2}` : ''}. J'écoute, je reconnais les voix, je cherche sur Internet, je vois avec ma caméra, je fais les calculs, les conversions et la météo, je gère les minuteurs, les listes et les rappels, je suis les marchés, je pilote les lumières, je retiens ce qui compte pour chacun, et je garde un œil sur l'ordinateur de la maison. Je suis la conversation et j'interviens quand je peux aider. Pour me parler, il suffit de dire mon nom.`);
}

/* ---------- la boucle de vie : il écoute tout le temps ---------- */
// ce qui ressemble à une demande qu'on lui fait (une question, un ordre) — le reste, sans son nom, ne le concerne pas
const ADRESSE = /^(et )?(dis|dit|dites|donne|mets|met|allume|allumes|eteins|eteint|eteindre|baisse|monte|augmente|diminue|coupe|tamise|lance|ajoute|rappelle|note|cherche|trouve|montre|affiche|explique|raconte|calcule|convertis|combien|quelle?s?|quel|quels|ou|comment|pourquoi|quand|qui|est ce qu|est ce que|qu est ce|c est quoi|tu peux|tu sais|tu connais|peux tu|sais tu|pourrais tu|j ai besoin|je veux|je voudrais|fais|fait|ouvre|ferme|active|envoie|envoyer|previens|arrete|stop|repete|lis|regarde|aide|traduis|ecris|programme|reveille|minuteur|il fait|il va|ca fait|y a t il|il y a)\b/;
let monId = ''; try { monId = localStorage.getItem('atlas-appareil') || ''; if (!monId) { monId = Math.random().toString(36).slice(2, 10); localStorage.setItem('atlas-appareil', monId); } } catch (e) { monId = Math.random().toString(36).slice(2, 10); }
async function quiRepond(texte) {
  const r0 = VOIXMAISON.root(); if (!r0) return true;
  const ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(() => ctl && ctl.abort(), 2500);
  try {
    const j = await (await fetch(`${r0}/atlas/repond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: monId, texte: N(texte).slice(0, 80), pic: (OREILLES.meter && OREILLES.meter().pic) || 0, appareil: S.settings.piece || '', actif: typeof CONSTELLATION !== 'undefined' ? CONSTELLATION.actifDepuis() : 99999, role: typeof CONSTELLATION !== 'undefined' ? CONSTELLATION.role : '' }), cache: 'no-store', signal: ctl ? ctl.signal : undefined })).json();
    return j.repond !== false;
  } catch (e) { return true; } finally { clearTimeout(tm); }
}
async function vie() {
  for (;;) {
    if (dlg.state === 'off' || voice.endormi) { await wait(500); continue; }
    const talk = dlg.state === 'talk', conv = S.settings.conversation !== false;
    // en mode conversation, il écoute la pièce avec les oreilles de la maison (le son ne sort pas de la maison)
    const r0 = await hear({ maxWait: talk ? 25000 : 60000, cheap: conv || !talk, prompt: talk ? '' : typeof PC !== 'undefined' && PC.radioIci && PC.radioIci() ? 'Atlas. Stop. Arrête la radio.' : 'Atlas. Shadow.' });
    if (r0 === null || voice.endormi) continue; // un autre Atlas a pris la main pendant qu'il écoutait
    // les bruits que la transcription écrit entre étoiles ou crochets (« *Bruit de porte* », « [Musique] ») ne sont pas des phrases
    const r = typeof r0 === 'string' ? r0.replace(/\*[^*]*\*|\[[^\]]*\]|\([^)]*\)|♪+/g, ' ').replace(/\s+/g, ' ').trim() : r0;
    if (r0 && !r) { journal(r0, '', 'un bruit : ignoré'); continue; }
    if (!r) { if (talk && ++dlg.silence >= 2) { dlg.state = 'standby'; face.set('idle'); } continue; }
    const n = N(r);
    dlg.qui = CONV.nomPour(OREILLES.takePrint()); // qui vient de parler (à la voix)
    const appele = R.reveil.test(n) || /^(la classe|l atlas|la tlas|la place)\s+/.test(n) && ADRESSE.test(n.replace(/^(la classe|l atlas|la tlas|la place)\s+/, ''));
    if (appele) fx.tone([[1175, 0.05]]); // un petit bip : il a entendu son nom
    // la radio joue ici : les voix de la radio ne sont pas pour lui — seulement son nom, ou les ordres de la radio elle-même
    if (!appele && typeof PC !== 'undefined' && PC.radioIci && PC.radioIci()) {
      const lui = !!dlg.qui && !/^invité/.test(dlg.qui); // sa voix à lui (la radio, elle, n'est pas reconnue)
      // « stop », « arrête », « coupe la radio »… : de sa voix, même noyé dans la radio ; d'une voix inconnue, seulement l'ordre court et net
      if (lui && (/\b(stop|stoppe|stopper|arrete|arretez|arreter|coupe|couper|eteins|eteindre|tais toi|chut|silence|ca suffit|assez)\b/.test(n) || /^(shadow ?)+$/.test(n))
        || /^(stop|arrete|coupe|eteins|chut|silence)( (la radio|tout|ca|le son))?$/.test(n) || /\b(arrete|coupe|eteins|stop) (la radio|france ?info|france inter|fip)\b/.test(n)) { journal(r, dlg.qui, 'la radio : il l\'arrête'); await PC.radioCoupe(); continue; }
      if (!/^(pause|reprends|baisse le son|monte le son|moins fort|plus fort|change de radio)$/.test(n)) {
        if (lui) { PC.radioBaisse(12000); fx.tone([[988, 0.05]]); } // il t'a reconnu : la radio baisse, tu peux parler
        journal(r, dlg.qui, lui ? 'la radio joue : il la baisse et t\'écoute' : 'la radio joue : il attend son nom'); continue;
      }
    }
    const bonjour = ARRIVEE.connu(dlg.qui); // il arrive : on l'accueille (avant de lui répondre, s'il parle à Atlas)
    if (bonjour) { if (appele) { CONV.note('Atlas', bonjour); await say(bonjour); } else { await ARRIVEE.dire(bonjour); if (conv) CONV.note(dlg.qui, r); continue; } }
    if (conv) {
      CONV.note(dlg.qui, r);
      if (/^((et|eh|hey|dis|ok|bon|alors|oui|non) )?(shadow|shadoo|chadow|shado|chadoo|chateau)\b/.test(n) && !appele) { CONV.pourShadow(); continue; } // on parle à Shadow (et sa réponse arrive juste après) ; Atlas se tait
      if (!appele && CONV.shadowRepond(dlg.qui)) continue;
      // c'est pour lui : on l'appelle ; on enchaîne juste après sa réponse ; ou personne d'autre ne parle (on est seul avec lui)
      // sans son nom, il ne répond qu'à une vraie demande (une question, un ordre), et juste après lui avoir répondu,
      // à la même voix — au plus deux fois d'affilée (sinon il répondrait à toute la pièce, et à la télé)
      const adresse = /\?/.test(r) || ADRESSE.test(n);
      const memeVoix = dlg.qui ? dlg.qui === dlg.quiParlait : !dlg.quiParlait;
      const memes = memeVoix || adresse;
      // un bout de phrase (« C'est… ») : sans doute l'écho de sa voix, ou une phrase coupée — il attend la suite
      const bout = n.split(' ').filter(Boolean).length < 2 || /(\.\.\.|…|,)\s*$/.test(String(r).trim()); // « Et quand l'… dit, » : coupée au milieu
      const suite = talk && Date.now() - (dlg.repondu || 0) < 25000 && memes && !bout && (dlg.suites || 0) < 3; // 25 s et 3 questions de suite sans redire son nom
      const seul = CONV.autres(dlg.qui) === 0 && adresse && n.split(' ').length >= 2 && !bout && !dlg.discret && AI.lastConfident !== false; // mal entendu, et pas appelé : il ne répond pas au hasard
      // « … lumière de la cuisine » : le début s'est perdu (on lui a parlé pendant qu'il parlait) ; il demande « j'allume ou j'éteins ? »
      const frag = !appele && !suite && !seul && !dlg.discret && !!MAISON.fragment(r, n);
      // les ordres évidents de la maison (« mode cockpit », « fin du film », « pause » au cinéma) : pas besoin de dire son nom
      const direct = !appele && n.split(' ').length <= 5 && ORDRE_DIRECT.test(n);
      if (!appele && !suite && !seul && !frag && !direct) {
        journal(r, dlg.qui, dlg.discret ? 'ignoré (discret)' : 'conversation : il écoute');
        if (dlg.discret) continue;
        dlg.busy = true;
        try { await CONV.peutEtre(r, dlg.qui); } catch (e) { console.warn('conversation', e); } finally { dlg.busy = false; }
        continue;
      }
      journal(r, dlg.qui, appele ? 'appelé : il répond' : direct ? 'un ordre de la maison : il répond' : suite ? 'à la suite : il répond' : frag ? 'un bout de phrase sur la maison : il demande' : 'seul avec lui : il répond');
      dlg.suites = appele ? 0 : (dlg.suites || 0) + 1;
      CONV.parleAtlas(dlg.qui);
      dlg.discret = false;
    } else if (!talk && !appele) { journal(r, dlg.qui, 'en veille : il attend son nom'); continue; } // en veille : il ne répond qu'à son nom
    // plusieurs Atlas dans la maison : seul celui qui t'a le mieux entendu répond
    if (!(await quiRepond(r))) { journal(r, dlg.qui, 'un autre Atlas, plus proche, répond'); continue; }
    if (typeof CONSTELLATION !== 'undefined') CONSTELLATION.actif(); // c'est cet appareil qui répond : c'est là qu'il est
    dlg.state = 'talk'; dlg.silence = 0; dlg.lastActive = Date.now(); dlg.quiParlait = dlg.qui;
    dlg.busy = true;
    try {
      await handle(r);
      if (appele) PROACTIF.reconnu(/^invité/.test(dlg.qui || '') || !dlg.qui ? 'toi' : dlg.qui);
      if (/^invité/.test(dlg.qui || '') && !dlg.proposeVoix && !VOIX.own().length && OREILLES.engine() === 'whisper') { dlg.proposeVoix = true; await say("Au fait, je ne reconnais pas encore ta voix. Dis « Atlas, apprends ma voix », et je saurai toujours que c'est toi."); }
    } catch (e) { console.error(e); face.set('oops'); await say('Petite anomalie dans mes circuits. Réessaie.'); } finally { dlg.busy = false; dlg.repondu = Date.now(); }
  }
}
OREILLES.on('bargein', () => { if (!voice.occupe()) return; dlg.interrupt = true; voice.stop(); }); // on lui parle pendant qu'il parle : il se tait
OREILLES.on('speech', () => face.el && face.el.classList.add('hearing'));
OREILLES.on('speechend', () => face.el && face.el.classList.remove('hearing'));

/* ---------- l'écran reste allumé ---------- */
let verrou = null;
async function garderAllume() {
  if (!S.settings.eveil || !('wakeLock' in navigator) || document.hidden) return;
  try { verrou = await navigator.wakeLock.request('screen'); } catch (e) { verrou = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && dlg.started) garderAllume(); });

/* ---------- reprendre ce qu'il avait dans Shadow (notes, listes, réglages) ---------- */
async function importerShadow(manuel) {
  let pris = 0;
  try {
    const l = JSON.parse(localStorage.getItem('shadow-v1') || 'null');
    let p = l && l.papa;
    // (le même appareil : on reprend aussi les réglages du cerveau, de la voix et de la ville)
    if (l && l.settings) {
      const s = l.settings, a = S.settings;
      if (!a.key && s.key) { a.key = s.key; pris++; }
      if (s.brain && a.brain === 'groq' && s.brain === 'local') a.brain = 'local';
      if (s.localUrl && /11434|ts\.net/.test(s.localUrl) && a.localUrl === 'http://localhost:11434/v1') a.localUrl = s.localUrl;
      if (s.localModel && !a.localModel) a.localModel = s.localModel;
      if (s.model && a.model === AI.DEFAULT_MODEL) a.model = s.model;
      if (s.ville && !a.ville) a.ville = s.ville;
      if (s.voixPapa) a.voix = s.voixPapa;
      if (s.seeCloud) a.seeCloud = true;
      if (s.micSens) a.micSens = s.micSens;
    }
    const root = VOIXMAISON.root();
    if (root && (!p || !(p.notes || []).length)) { try { const g = await (await fetch(`${root}/shadow/etat`, { cache: 'no-store' })).json(); if (g && g.data && g.data.papa) p = g.data.papa; } catch (e) { /* pas de mémoire partagée */ } }
    if (p) {
      const ids = new Set(S.notes.map(x => String(x.id)));
      (p.notes || []).forEach(x => { if (!ids.has(String(x.id))) { S.notes.push(Object.assign({ at: x.id }, x)); pris++; } });
      const ids2 = new Set(S.listes.map(x => String(x.id)));
      (p.listes || []).forEach(x => { if (!ids2.has(String(x.id))) { S.listes.push(x); pris++; } });
    }
  } catch (e) { console.warn('import', e); }
  S.importe = true; save();
  if (manuel) toast(pris ? `Repris depuis Shadow : ${pris} élément${pris > 1 ? 's' : ''}` : 'Rien de nouveau à reprendre');
  return pris;
}

/* ---------- les réglages ---------- */
function ouvreReglages() {
  const s = S.settings;
  $('#r-version').textContent = `v${window.ATLAS_VERSION}`;
  $('#r-nom').value = S.nom || '';
  $('#r-ville').value = s.ville ? s.ville.name : '';
  $('#r-ville-ok').textContent = s.ville ? `Météo : ${s.ville.name}` : '';
  $('#r-brain').value = s.brain;
  $('#r-local-url').value = s.localUrl || '';
  $('#r-local-model').value = s.localModel || '';
  $('#r-mistral').value = s.mistralKey || '';
  $('#r-mistral-model').value = s.mistralModel || '';
  $('#r-key').value = s.key || '';
  $('#r-model').value = s.model || '';
  $('#r-see').checked = !!s.seeCloud;
  $('#r-voix').value = s.voix || 'futuriste';
  $('#r-eleven').checked = s.eleven !== false;
  $('#r-eleven-key').value = s.elevenKey || '';
  $('#r-eleven-voice').value = s.elevenVoice || '';
  $('#r-eleven-model').value = s.elevenModel || 'eleven_v4_turbo';
  $('#r-eleven-effet').value = s.elevenEffet || 'leger';
  $('#r-eleven-etat').textContent = !s.elevenKey || !/^sk_/.test(s.elevenKey) || !s.elevenVoice ? (s.elevenVoice || s.elevenKey ? ELEVEN.explique('') : '') : ELEVEN.erreur && Date.now() < ELEVEN.downUntil ? `En pause : ${ELEVEN.explique({ message: ELEVEN.erreur, status: +(ELEVEN.erreur.match(/ElevenLabs (\d+)/) || [])[1] })}` : 'Prête.';
  $('#r-micro').value = s.micSens || 'loin';
  $('#r-piece').value = s.piece || '';
  $('#r-son').checked = s.sound !== false;
  $('#r-eveil').checked = s.eveil !== false;
  $('#r-conv').checked = s.conversation !== false;
  $('#r-accueil').checked = s.accueil !== false;
  $('#r-arrivee').checked = s.arrivee !== false;
  $('#r-camera').checked = s.camera !== false;
  $('#r-proactif').checked = s.proactif !== false;
  $('#r-marches').checked = s.marches !== false;
  renderNotes(); renderVoix(); MEMOIRE.render(); MAISON.reglages();
  $('#r-sync').textContent = SYNC.etat();
  const c = AI.cfg ? AI.cfg() : {};
  $('#r-diag').innerHTML = `<p class="small">Cerveau : ${AI.ready() ? (c.local ? `maison (${esc(c.model || '?')})` : `en ligne (${esc(c.model || '?')})`) : '<b>hors ligne</b>'} · oreilles : ${esc(OREILLES.engine() || 'aucune')}${AI.lastEars ? ` (${esc(AI.lastEars)})` : ''} · voix : ${ELEVEN.usable() ? 'ElevenLabs' : VOIXMAISON.usable() ? `ordinateur (${esc(VOIXMAISON.papa())})` : 'téléphone'} · mode : ${S.settings.conversation === false ? 'il répond à son nom' : dlg.discret ? 'discret' : 'conversation'}</p>`
    + (entendus.length ? entendus.slice().reverse().map(x => `<div class="item"><span>« ${esc(x.t)} » <small class="muted">${esc(x.qui)}</small></span><small class="muted">${esc(x.quoi)}</small></div>`).join('') : '<p class="small muted">Rien entendu pour l\'instant.</p>');
  $('#dlg-reglages').showModal();
}
function renderVoix() {
  const l = VOIX.people();
  $('#r-voix-liste').innerHTML = l.length
    ? l.map(p => `<div class="item"><span>${esc(p.name)} <small class="muted">${p.shadow ? '(apprise par Shadow)' : `(${p.prints.length} empreinte${p.prints.length > 1 ? 's' : ''})`}</small></span>${p.shadow ? '' : `<button type="button" class="ghost sm danger" data-unvoix="${esc(p.name)}">Oublier</button>`}</div>`).join('')
    : '<p class="small muted">Aucune voix pour l\'instant.</p>';
}
function renderNotes() {
  const box = $('#r-notes');
  box.innerHTML = S.notes.length
    ? S.notes.slice().reverse().map(x => `<div class="item"><span>${esc(x.text)}</span><button type="button" class="ghost sm danger" data-unnote="${x.id}">✕</button></div>`).join('')
    : '<p class="small muted">Aucune note. Dis : « note que… ».</p>';
}
async function chercheVille(nom) {
  try {
    const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=${encodeURIComponent(nom)}`)).json();
    const g = r.results && r.results[0];
    if (!g) { $('#r-ville-ok').textContent = 'Ville introuvable.'; return; }
    S.settings.ville = { name: g.name, lat: Math.round(g.latitude * 100) / 100, lon: Math.round(g.longitude * 100) / 100 }; save();
    $('#r-ville-ok').textContent = `Météo : ${g.name}${g.country ? `, ${g.country}` : ''}`;
    OUTILS.rafraichir();
  } catch (e) { $('#r-ville-ok').textContent = 'Le service météo ne répond pas.'; }
}
function lieReglages() {
  const s = () => S.settings;
  const bind = (id, fn, ev = 'change') => $(id).addEventListener(ev, e => { fn(e.target); save(); });
  bind('#r-nom', el => { S.nom = el.value.trim().slice(0, 30); });
  $('#r-ville').addEventListener('change', e => { const v = e.target.value.trim(); if (v) chercheVille(v); else { S.settings.ville = null; save(); } });
  bind('#r-brain', el => { s().brain = el.value; });
  bind('#r-local-url', el => { s().localUrl = el.value.trim(); VOIXMAISON.downUntil = 0; setTimeout(async () => { await SYNC.sync(); LIEN.lire(); ouvreReglages(); toast('Réglages repris de tes autres appareils'); }, 300); });
  bind('#r-local-model', el => { s().localModel = el.value.trim(); });
  bind('#r-mistral', el => { s().mistralKey = el.value.trim(); AI.mistralDownUntil = 0; });
  bind('#r-mistral-model', el => { s().mistralModel = el.value.trim(); });
  bind('#r-key', el => { s().key = el.value.trim(); });
  bind('#r-model', el => { s().model = el.value.trim() || AI.DEFAULT_MODEL; });
  bind('#r-see', el => { s().seeCloud = el.checked; });
  bind('#r-voix', el => { s().voix = el.value; VOIXMAISON.cache.clear(); });
  bind('#r-eleven', el => { s().eleven = el.checked; });
  bind('#r-eleven-key', el => { s().elevenKey = el.value.trim(); ELEVEN.downUntil = 0; ELEVEN.cache.clear(); });
  bind('#r-eleven-voice', el => { s().elevenVoice = el.value.trim(); ELEVEN.downUntil = 0; ELEVEN.cache.clear(); });
  bind('#r-eleven-model', el => { s().elevenModel = el.value; ELEVEN.cache.clear(); });
  bind('#r-eleven-effet', el => { s().elevenEffet = el.value; });
  $('#r-eleven-test').addEventListener('click', async () => {
    ELEVEN.downUntil = 0; fx.audio();
    $('#r-eleven-etat').textContent = 'Essai…';
    const k = S.settings.elevenKey || '';
    if (!k || !/^sk_/.test(k) || !S.settings.elevenVoice) { $('#r-eleven-etat').textContent = ELEVEN.explique(''); return; }
    try { ELEVEN.cache.clear(); await ELEVEN.get(voice.clean("Bonsoir. Je suis Atlas. Tous mes systèmes sont opérationnels.")); $('#r-eleven-etat').textContent = 'Prête : tu vas l’entendre.'; await say("Bonsoir. Je suis Atlas. Tous mes systèmes sont opérationnels."); }
    catch (e) { $('#r-eleven-etat').textContent = ELEVEN.explique(e); }
  });
  bind('#r-micro', el => { s().micSens = el.value; });
  bind('#r-piece', el => { s().piece = el.value.trim(); });
  bind('#r-son', el => { s().sound = el.checked; });
  bind('#r-conv', el => { s().conversation = el.checked; dlg.discret = false; });
  bind('#r-accueil', el => { s().accueil = el.checked; });
  bind('#r-arrivee', el => { s().arrivee = el.checked; });
  bind('#r-proactif', el => { s().proactif = el.checked; });
  bind('#r-marches', el => { s().marches = el.checked; });
  bind('#r-camera', el => { s().camera = el.checked; if (el.checked) ARRIVEE.yeux(); else if (typeof VISION !== 'undefined' && VISION.isOn()) VISION.stop(); });
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-unvoix]'); if (b && VOIX.forget(b.dataset.unvoix)) renderVoix(); });
  bind('#r-eveil', el => { s().eveil = el.checked; if (el.checked) garderAllume(); else if (verrou) { verrou.release().catch(() => {}); verrou = null; } });
  $('#r-importer').addEventListener('click', async () => { await importerShadow(true); ouvreReglages(); });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-unnote]');
    if (!b) return;
    const it = S.notes.find(x => String(x.id) === b.dataset.unnote);
    if (it) { tomb('notes', it); S.notes = S.notes.filter(x => x !== it); save(); renderNotes(); }
  });
  $('#btn-reglages').addEventListener('click', ouvreReglages);
}

/* ---------- une version plus récente ? il se met à jour tout seul (une fois) ---------- */
async function verifierMaj() {
  try {
    if (!navigator.onLine || window.__BANC) return;
    const m = (await (await fetch(`index.html?maj=${Date.now()}`, { cache: 'no-store' })).text()).match(/ATLAS_VERSION = '(\d+)'/);
    if (!m || +m[1] <= +window.ATLAS_VERSION) return;
    let deja = ''; try { deja = sessionStorage.getItem('atlas-maj') || ''; } catch (e) { /* rien */ }
    if (deja === m[1]) return;
    // on ne se met pas à jour au milieu d'une conversation : seulement au calme (personne depuis 10 minutes)
    if (dlg.started && (dlg.busy || voice.occupe() || Date.now() - Math.max(dlg.repondu || 0, CONV.dernier() || 0) < 10 * 60000)) return;
    try { sessionStorage.setItem('atlas-maj', m[1]); } catch (e) { /* rien */ }
    try { if (dlg.started) localStorage.setItem('atlas-reprise', String(Date.now())); } catch (e) { /* rien */ }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('atlas-app')).map(k => caches.delete(k))); }
    const regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(regs.map(g => g.update().catch(() => {})));
    location.reload();
  } catch (e) { /* plus tard */ }
}

/* ---------- le diagnostic à distance : l'ordinateur sait s'il écoute, avec quelles oreilles, ce qu'il a entendu ---------- */
let derniereErreur = '';
const premieresErreurs = []; // les premières erreurs (la vraie cause est souvent la première)
window.addEventListener('error', e => {
  const t = e.target && e.target !== window && e.target.src ? `fichier non chargé : ${e.target.src.split('/').pop()}` : `${e.message || 'erreur'} (${(e.filename || '').split('/').pop()}:${e.lineno || ''})`;
  derniereErreur = t.slice(0, 160);
  if (premieresErreurs.length < 5 && !premieresErreurs.includes(derniereErreur)) premieresErreurs.push(`${new Date().toLocaleTimeString('fr-FR')} ${derniereErreur}`);
}, true);
window.addEventListener('unhandledrejection', e => { derniereErreur = String((e.reason && e.reason.message) || e.reason || 'promesse').slice(0, 160); });
async function diagnostic() {
  const r0 = VOIXMAISON.root(); if (!r0 || window.__BANC) return;
  const m = OREILLES.meter ? OREILLES.meter() : {};
  const d = { v: window.ATLAS_VERSION, appareil: `${/Android/.test(navigator.userAgent) ? (/Mobile/.test(navigator.userAgent) ? 'téléphone' : 'tablette') : 'ordinateur'}${S.settings.piece ? ` · ${S.settings.piece}` : ''}`.slice(0, 20), demarre: dlg.started, etat: dlg.state, endormi: voice.endormi, cache: document.hidden, ecran: `${innerWidth}x${innerHeight}`, antiecho: typeof OREILLES_AEC !== 'undefined' ? OREILLES_AEC : null, larsen: LARSEN.slice(),
    oreilles: OREILLES.engine && OREILLES.engine(), via: AI.lastEars || '', niveau: Math.round((m.level || 0) * 1000) / 1000, seuil: Math.round((m.threshold || 0) * 1000) / 1000, parle: voice.occupe(),
    cerveau: AI.ready() ? (AI.dernier ? AI.dernier.fournisseur : AI.cfg().local ? 'maison' : 'groq') : 'aucun', modele: AI.ready() ? (AI.dernier ? AI.dernier.modele : AI.cfg().model) : '', mistral: !!S.settings.mistralKey, mistralErreur: AI.mistralErreur ? String(AI.mistralErreur).replace(/[A-Za-z0-9]{24,}/g, '…').slice(0, 160) : '', mistralRepos: AI.mistralDownUntil > Date.now() ? Math.round((AI.mistralDownUntil - Date.now()) / 1000) : 0, voix: ELEVEN.usable() ? 'elevenlabs' : VOIXMAISON.usable() ? 'maison' : 'telephone',
    eleven: { cle: !!S.settings.elevenKey && /^sk_/.test(S.settings.elevenKey), voix: !!S.settings.elevenVoice, actif: S.settings.eleven !== false, modele: S.settings.elevenModel || 'eleven_v4_turbo',
      erreur: ELEVEN.erreur ? `${new Date(ELEVEN.erreurAt || Date.now()).toLocaleTimeString('fr-FR')} ${ELEVEN.explique({ message: ELEVEN.erreur, status: ELEVEN.erreurStatus })}` : '', repos: ELEVEN.downUntil > Date.now() ? Math.round((ELEVEN.downUntil - Date.now()) / 60000) + ' min' : '',
      son: (() => { try { return fx.audio().state; } catch (e) { return '?'; } })() },
    dits: dits.slice(),
    temps: { oreilles: OREILLES.timings ? OREILLES.timings().slice(-8) : [], cerveau: brainTimes.slice(-8) }, // pour mesurer la réactivité (ms)
    entendus: entendus.slice(-12).map(x => `${new Date(x.at).toLocaleTimeString('fr-FR')} [${x.qui}] ${x.t} → ${x.quoi}`), erreur: derniereErreur, erreurs: premieresErreurs.slice() };
  try { await fetch(`${r0}/atlas/diag`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), keepalive: true }); } catch (e) { /* plus tard */ }
}
setInterval(diagnostic, 30000); setTimeout(diagnostic, 8000);
document.addEventListener('visibilitychange', diagnostic);

/* ---------- un seul Atlas à la fois sur l'appareil (l'appli et un onglet ouverts ensemble : il répondait deux fois) ---------- */
const UNIQUE = (() => {
  const id = Math.random().toString(36).slice(2);
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel('atlas') : null;
  function prends() {
    voice.endormi = false;
    if (canal) canal.postMessage({ moi: id });
    try { localStorage.setItem('atlas-actif', JSON.stringify({ id, t: Date.now() })); } catch (e) { /* rien */ }
  }
  // un autre Atlas vient de démarrer : celui-ci rend le micro et la caméra, et se tait
  function endors() {
    if (voice.endormi || !dlg.started) return;
    voice.endormi = true; dlg.state = 'off';
    voice.stop(); OREILLES.stop();
    if (typeof VISION !== 'undefined' && VISION.isOn()) VISION.stop();
    if (verrou) { try { verrou.release(); } catch (e) { /* rien */ } verrou = null; }
    face.set('idle');
    const porte = $('#demarrer'), m = porte.querySelector('small');
    m.dataset.avant = m.dataset.avant || m.textContent;
    m.textContent = 'ATLAS EST OUVERT AILLEURS · TOUCHER POUR LE REPRENDRE ICI';
    porte.hidden = false;
  }
  if (canal) canal.onmessage = e => { if (e.data && e.data.moi && e.data.moi !== id) endors(); };
  window.addEventListener('storage', e => { // en secours, si le canal n'existe pas
    if (e.key !== 'atlas-actif' || !e.newValue) return;
    try { if (JSON.parse(e.newValue).id !== id) endors(); } catch (x) { /* rien */ }
  });
  return { prends, dort: () => voice.endormi };
})();

// reprendre la main ici (l'autre Atlas se tait à son tour)
async function reprendre() {
  UNIQUE.prends();
  S = charge(); // ce que l'autre a noté entre-temps
  const porte = $('#demarrer'), m = porte.querySelector('small');
  if (m.dataset.avant) m.textContent = m.dataset.avant;
  porte.hidden = true;
  fx.audio();
  try { await OREILLES.start(); } catch (e) { /* le micro sera demandé plus tard */ }
  garderAllume();
  dlg.state = 'talk'; dlg.silence = 0; dlg.lastActive = Date.now();
  SYNC.sync();
  await say('Je suis là.');
  ARRIVEE.yeux();
}

/* ---------- le démarrage ---------- */
async function demarrer() {
  if (UNIQUE.dort()) return reprendre();
  if (dlg.started) return;
  dlg.started = true; dlg.depuis = Date.now();
  UNIQUE.prends();
  try { localStorage.setItem('atlas-a-demarre', '1'); } catch (e) { /* rien */ }
  $('#demarrer').hidden = true;
  voice.unlock(); OREILLES.prime(); fx.audio();
  try { await OREILLES.start(); } catch (e) { /* le micro sera demandé plus tard */ }
  garderAllume();
  face.set('idle');
  if (!S.importe) await importerShadow(false);
  VOIXMAISON.prefetch(briefing());
  await NOYAU.allume();
  dlg.state = 'talk'; dlg.silence = 0;
  const duMatin = await PROACTIF.auDemarrage(); // le matin : météo, rappels, agenda, marchés
  await say(duMatin ? `${briefing(false)} ${duMatin} ${pick(["Je t'écoute.", 'À ta disposition.'])}` : briefing());
  ARRIVEE.yeux(); // la caméra regarde qui arrive (tout reste sur l'appareil)
}
window.addEventListener('load', () => {
  face.el = $('#face');
  voice.init();
  lieReglages();
  const porte = $('#demarrer');
  porte.addEventListener('click', demarrer);
  porte.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') demarrer(); });
  // toucher le noyau pendant qu'il parle : il se tait ; en veille : il écoute
  $('#papa-hud').addEventListener('click', e => {
    if (e.target.closest('button')) return;
    if (voice.occupe()) { dlg.interrupt = true; voice.stop(); return; }
    if (dlg.state === 'standby') { dlg.state = 'talk'; dlg.silence = 0; fx.tone([[1175, 0.06]]); OREILLES.cancel(); }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    setTimeout(verifierMaj, 4000); setInterval(verifierMaj, 30 * 60000); // et toutes les 30 minutes (au calme)
  }
  window.ATLAS_OK = true;
  vie();
  // il tournait avant (mise à jour, ou Android l'a fermé en arrière-plan) : il repart tout seul ; le micro est déjà autorisé,
  // et l'appli installée sur l'écran d'accueil a le droit de parler sans qu'on la touche (sinon : « toucher pour le son »)
  let reprise = 0; try { reprise = +localStorage.getItem('atlas-reprise') || 0; } catch (e) { /* rien */ }
  const installee = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
  if (!window.__BANC && (installee && S.settings.autoDemarrage !== false && localStorage.getItem('atlas-a-demarre') === '1' || Date.now() - reprise < 10 * 60000)) {
    try { localStorage.removeItem('atlas-reprise'); } catch (e) { /* rien */ }
    setTimeout(async () => {
      if (dlg.started) return;
      await demarrer();
      setTimeout(() => {
        if (fx.ctx && fx.ctx.state === 'suspended') { const porte = $('#demarrer'), m = porte.querySelector('small'); m.dataset.avant = m.dataset.avant || m.textContent; m.textContent = "J'ÉCOUTE · TOUCHER POUR ACTIVER LE SON"; porte.hidden = false; porte.addEventListener('click', () => { fx.audio(); voice.unlock(); porte.hidden = true; if (m.dataset.avant) m.textContent = m.dataset.avant; }, { once: true }); }
      }, 1500);
    }, 1200);
  }
});

/* =========================================================
   ATLAS — la voix
   - Les voix de robot (sombre, démon de métal, glacial) ou humaines (Pierre, Jessica, Tom) :
     fabriquées par l'ordinateur de la maison (Piper, /shadow/voix), puis traitées dans le téléphone
     (plus grave, modulation, saturation, résonance, grondement ; sans écho ; limiteur).
   - Sans l'ordinateur : la voix du téléphone, la plus grave possible.
   - Une oreille électronique (analyseur) pour que le noyau suive le vrai son de la voix.
   ========================================================= */
'use strict';

const VOIXMAISON = {
  downUntil: 0,
  cache: new Map(),
  an: null,
  // l'adresse de l'ordinateur de la maison (l'adresse par défaut est Ollama : le relais d'Atlas est juste à côté, sur 11435)
  root() {
    const u = (S.settings.localUrl || '').replace(/\/+$/, '').replace(/\/v1$/, '');
    return u ? u.replace(/^(https?:\/\/(?:localhost|127\.0\.0\.1)):11434$/, '$1:11435') : '';
  },
  papa() { return S.settings.voix || 'sombre'; },
  usable() { return !!this.root() && Date.now() > this.downUntil && navigator.onLine !== false && !!(window.AudioContext || window.webkitAudioContext) && !!window.fetch; },
  get(t) {
    const pv = this.papa(), key = `${pv}|${t}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 4500);
    const corps = ROBOTS[pv] ? Object.assign({ text: t }, ROBOTS[pv].demande) : pv === 'tom' ? { text: t } : { text: t, voix: pv };
    const p = fetch(`${this.root()}/shadow/voix`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: ctl ? ctl.signal : undefined })
      .then(r => { clearTimeout(tm); if (!r.ok) throw new Error(`voix ${r.status}`); return r.arrayBuffer(); })
      .then(buf => new Promise((res, rej) => fx.audio().decodeAudioData(buf, res, rej)));
    p.catch(() => { this.downUntil = Date.now() + 120000; this.cache.delete(key); }); // l'ordinateur ne répond pas : voix du téléphone pendant 2 min
    this.cache.set(key, p);
    if (this.cache.size > 12) this.cache.delete(this.cache.keys().next().value);
    return p;
  },
  prefetch(text) {
    if (!this.usable() || !S.settings.sound) return;
    const t = voice.clean(text);
    if (t) this.get(t).catch(() => {});
  },
  play(buffer) { const r = ROBOTS[this.papa()]; return r ? this.playRobot(buffer, r) : this.playPapa(buffer); },
};
// les voix de robot (mêmes réglages que les essais écoutés par papa)
// demande : ce que l'ordinateur fabrique (Piper parle plus vite) ; rate : le téléphone ralentit (plus grave, rythme normal)
const ROBOTS = {
  sombre: { demande: { voix: 'pierre', vitesse: 0.78 }, rate: 0.78, hp: 70, ring: [34, 0.32], sat: 1.8, comb: [7.5, 0.5, 0.35], pres: [1800, 1.2, 3], lp: 5200, bourdon: [46, 0.18] },
  demon: { demande: { voix: 'tom', vitesse: 0.7 }, rate: 0.68, hp: 55, ring: [48, 0.55], sat: 3.2, comb: [4.2, 0.62, 0.45], pres: [1200, 1.0, 4], lp: 4200, bourdon: [38, 0.28], gain: 0.62 },
  glacial: { demande: { voix: 'pierre', vitesse: 0.95 }, rate: 0.9, hp: 140, flang: [2.5, 1.8, 0.18, 0.55, 0.45], pres: [3000, 1.0, 3], lp: 7000 },
};
VOIXMAISON.irRobot = function (c, sec, puiss) {
  const k = `${c.sampleRate}|${sec}|${puiss}`;
  this._irs = this._irs || {};
  if (this._irs[k]) return this._irs[k];
  const len = Math.round(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate), pre = Math.round(c.sampleRate * 0.012);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = i < pre ? 0 : (Math.random() * 2 - 1) * Math.pow(1 - i / len, puiss); }
  return (this._irs[k] = b);
};
VOIXMAISON.playRobot = function (buffer, p) {
  const c = fx.audio(), oscs = [];
  const src = c.createBufferSource(); src.buffer = buffer; src.playbackRate.value = p.rate;
  const f = (type, freq, q, gain) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = freq; if (q) n.Q.value = q; if (gain !== undefined) n.gain.value = gain; return n; };
  const G = v => { const g = c.createGain(); g.gain.value = v; return g; };
  const hp = f('highpass', p.hp); src.connect(hp);
  let cur = hp;
  if (p.ring) { // modulation en anneau : la voix des Daleks
    const sum = G(1), dry = G(1 - p.ring[1]), ring = G(0), osc = c.createOscillator(), og = G(p.ring[1] * 1.6);
    osc.frequency.value = p.ring[0]; osc.connect(og); og.connect(ring.gain); osc.start(); oscs.push(osc);
    cur.connect(dry); dry.connect(sum); cur.connect(ring); ring.connect(sum); cur = sum;
  }
  if (p.sat) { // saturation
    const ws = c.createWaveShaper(), n = 1024, curve = new Float32Array(n), th = Math.tanh(p.sat);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * p.sat) / th; }
    ws.curve = curve; ws.oversample = '2x'; cur.connect(ws); cur = ws;
  }
  if (p.comb) { // résonance métallique
    const sum = G(1), d = c.createDelay(0.1), fb = G(p.comb[1]), wet = G(p.comb[2]);
    d.delayTime.value = p.comb[0] / 1000; cur.connect(sum); cur.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(sum); cur = sum;
  }
  if (p.flang) { // flanger : une machine qui tourne
    const [base, prof, hz, fbv, wv] = p.flang, sum = G(1), d = c.createDelay(0.05), fb = G(fbv), wet = G(wv), lfo = c.createOscillator(), lg = G(prof / 1000);
    d.delayTime.value = base / 1000; lfo.frequency.value = hz; lfo.connect(lg); lg.connect(d.delayTime); lfo.start(); oscs.push(lfo);
    cur.connect(sum); cur.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(sum); cur = sum;
  }
  const pres = f('peaking', p.pres[0], p.pres[1], p.pres[2]); cur.connect(pres);
  const lp = f('lowpass', p.lp); pres.connect(lp); cur = lp;
  const mixe = G(1); cur.connect(mixe);
  if (p.bourdon) { // le grondement sous la voix : il suit la force de la voix
    const osc = c.createOscillator(), bg = G(0), env = c.createWaveShaper(), ec = new Float32Array(256);
    for (let i = 0; i < 256; i++) ec[i] = Math.abs(i / 255 * 2 - 1) * p.bourdon[1] * 2.2;
    env.curve = ec; const el = f('lowpass', 8);
    osc.frequency.value = p.bourdon[0]; osc.connect(bg); cur.connect(env); env.connect(el); el.connect(bg.gain); bg.connect(mixe); osc.start(); oscs.push(osc);
  }
  const out = G(p.gain || 0.82), comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  const lim = c.createDynamicsCompressor(); // le limiteur : puissant, mais le haut-parleur ne sature jamais
  lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
  mixe.connect(comp); comp.connect(out); out.connect(lim); lim.connect(c.destination); // (pas d'écho : papa n'en veut pas)
  const an = c.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.6; lim.connect(an); this.an = an;
  src.start();
  return { src, duration: buffer.duration / p.rate, stop() { try { src.stop(); } catch (e) { /* déjà fini */ } oscs.forEach(o => { try { o.stop(); } catch (e) { /* rien */ } }); } };
};
// la voix humaine : une « IA de film » — un peu plus grave, une présence de studio,
// un très léger dédoublement (sans écho) ; et une oreille électronique (analyseur) pour que le noyau suive le vrai son
VOIXMAISON.ir = function (c) {
  if (this._ir && this._ir.sampleRate === c.sampleRate) return this._ir;
  const len = Math.round(c.sampleRate * 0.9), b = c.createBuffer(2, len, c.sampleRate), pre = Math.round(c.sampleRate * 0.012);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = i < pre ? 0 : (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
  this._ir = b; return b;
};
VOIXMAISON.playPapa = function (buffer) {
  const c = fx.audio();
  const src = c.createBufferSource(); src.buffer = buffer; src.playbackRate.value = 0.97;
  const f = (type, freq, gain, q) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = freq; if (gain !== undefined) n.gain.value = gain; if (q) n.Q.value = q; return n; };
  const hp = f('highpass', 85), warm = f('lowshelf', 200, 2.5), pres = f('peaking', 3200, 3, 1), air = f('highshelf', 9000, 2);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.15;
  const out = c.createGain(); out.gain.value = 0.88; out.connect(c.destination);
  src.connect(hp); hp.connect(warm); warm.connect(pres); pres.connect(air); air.connect(comp); comp.connect(out);
  const dl = c.createDelay(0.05); dl.delayTime.value = 0.016;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.35; const lg = c.createGain(); lg.gain.value = 0.0018; lfo.connect(lg); lg.connect(dl.delayTime);
  const dg = c.createGain(); dg.gain.value = 0.16; comp.connect(dl); dl.connect(dg); dg.connect(out);
  const an = c.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.6; out.connect(an); this.an = an;
  src.start(); lfo.start();
  return { src, duration: buffer.duration / 0.97, stop() { try { src.stop(); } catch (e) { /* déjà fini */ } try { lfo.stop(); } catch (e) { /* rien */ } } };
};

const voice = {
  v: null, male: false, speaking: false, endedAt: 0, _cur: null,
  init() {
    if (!('speechSynthesis' in window)) return;
    const choose = () => {
      const vs = speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang));
      const male = v => /x-fr[bd]\b|thomas|henri|paul|mathieu|nicolas|guillaume|antoine|daniel|male|homme|masculin/i.test(`${v.name} ${v.voiceURI}`) && !/female|femme/i.test(v.name);
      const fav = vs.find(v => /fr[-_]FR/i.test(v.lang) && male(v));
      this.male = !!fav;
      this.v = fav || vs.find(v => /fr[-_]FR/i.test(v.lang)) || vs[0] || null;
    };
    choose();
    speechSynthesis.onvoiceschanged = choose;
  },
  clean(t) {
    return String(t).replace(/<[^>]+>/g, ' ')
      .replace(/[☀-➿⬀-⯿]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|️|‍/g, '')
      .replace(/×/g, ' fois ').replace(/−/g, ' moins ')
      .replace(/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]{2,}/g, m => m.toLowerCase()) // « ATLAS » se lit comme un mot, pas lettre par lettre
      .replace(/[«»*#`]/g, ' ').replace(/\s+/g, ' ').trim();
  },
  say(text) {
    const t = this.clean(text);
    if (!S.settings.sound || !t) return Promise.resolve();
    lastSaid = t;
    if (VOIXMAISON.usable()) return this.sayMaison(t).catch(() => this.saySynth(t));
    return this.saySynth(t);
  },
  sayMaison(t) {
    return VOIXMAISON.get(t).then(buf => new Promise(res => {
      OREILLES.mute(true); // il ne s'écoute pas lui-même
      const node = VOIXMAISON.play(buf);
      this._cur = node; this.speaking = true; face.talk(true);
      let done = false;
      const end = () => {
        if (done) return;
        done = true; this.speaking = false; this.endedAt = Date.now(); this._cur = null;
        node.stop(); face.talk(false); OREILLES.mute(false);
        res();
      };
      node.src.onended = end;
      setTimeout(end, node.duration * 1000 + 1500);
    }));
  },
  saySynth(t) {
    return new Promise(res => {
      if (!('speechSynthesis' in window)) return res();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'fr-FR';
      if (this.v) u.voice = this.v;
      u.rate = 1;
      u.pitch = ROBOTS[VOIXMAISON.papa()] ? 0.1 : this.male ? 0.88 : 0.72; // sans l'ordinateur : la plus grave possible
      let done = false;
      const end = () => { if (done) return; done = true; this.speaking = false; this.endedAt = Date.now(); face.talk(false); OREILLES.mute(false); res(); };
      u.onstart = () => { this.speaking = true; face.talk(true); };
      u.onend = end; u.onerror = end;
      setTimeout(end, 6000 + t.length * 120);
      OREILLES.mute(true);
      speechSynthesis.speak(u);
    });
  },
  stop() {
    if (this._cur) { try { this._cur.src.onended && this._cur.src.onended(); } catch (e) { /* rien */ } }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
  unlock() {
    if (!('speechSynthesis' in window)) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* rien */ }
  },
};
let lastSaid = '';

/* =========================================================
   ATLAS — le cerveau (repris de Shadow)
   « IA en ligne » : Groq.  « IA de la maison » : Ollama sur l'ordinateur, même format d'API.
   Le cerveau de la maison d'abord ; s'il ne répond pas, Groq prend le relais quelques minutes.
   ========================================================= */
'use strict';

// Cerveau de la maison : on le garde réveillé pendant qu'Atlas est allumé (sinon il met quelques secondes à se recharger)
function warmBrain() {
  const st = S.settings;
  if (st.brain !== 'local' || !st.localUrl || !st.localModel) return;
  const root = st.localUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  fetch(`${root}/api/generate`, { method: 'POST', body: JSON.stringify({ model: st.localModel, keep_alive: '20m' }) }).catch(() => {});
}
setInterval(() => { if (typeof dlg !== 'undefined' && dlg.started && dlg.state !== 'sleep') warmBrain(); }, 4 * 60000);
// Compteur d'énergie du jour : jetons envoyés au cerveau et secondes de voix transcrites
function countUsage(tokens, audioSec) {
  const k = new Date().toDateString();
  if (!S.usage || S.usage.day !== k) S.usage = { day: k, tokens: 0, req: 0, audio: 0 };
  S.usage.tokens += tokens || 0; S.usage.audio += audioSec || 0;
  if (tokens) S.usage.req++;
}
const AI = {
  GROQ: 'https://api.groq.com/openai/v1',
  DEFAULT_MODEL: 'qwen/qwen3.8-27b',
  RETIRED: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  STT_MODEL: 'whisper-large-v3', // le modèle complet comprend mieux les voix d'enfants que « turbo »

  // « IA poussée → WiFi » (Groq) ou « IA locale » (Ollama, API compatible)
  cfg() {
    const s = S.settings;
    // cerveau de la maison d'abord ; s'il ne répond pas (ordi éteint, loin de la maison), Groq prend le relais quelques minutes
    if (s.brain === 'local' && !(s.key && this.localDownUntil > Date.now())) return { base: (s.localUrl || '').replace(/\/+$/, ''), model: s.localModel, key: '', local: true };
    return { base: this.GROQ, model: s.model || this.DEFAULT_MODEL, key: s.key, local: false };
  },
  // Pas de réseau ? (le téléphone le dit, ou un appel vient d'échouer) : on n'essaie même pas Groq
  netDownUntil: 0,
  localDownUntil: 0,
  online() { return navigator.onLine !== false && Date.now() > this.netDownUntil; },
  hasKey() { const s = S.settings; return s.brain === 'local' ? !!(s.localUrl && s.localModel) || !!s.key : !!s.key; },
  ready() { return this.hasKey() && (this.cfg().local || this.online()); },
  // les oreilles : Groq (Whisper large) et/ou les oreilles de la maison (whisper.cpp sur l'ordinateur, sans limite)
  homeEars() { return typeof VOIXMAISON !== 'undefined' ? VOIXMAISON.root() : ''; },
  canTranscribe() { return (!!S.settings.key || !!this.homeEars()) && !!window.MediaRecorder && !!navigator.mediaDevices && this.online(); },

  // Modèles de secours si Groq retire celui qu'on utilise
  FALLBACK: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
  // Chez Groq, chaque modèle a sa propre limite gratuite : quand l'un est épuisé (429),
  // on le met « au repos » jusqu'à la fin de son attente et on passe au suivant.
  // Le modèle qui « réfléchit » : pour les questions difficiles (plus lent, mais plus juste)
  THINK_MODEL: 'openai/gpt-oss-120b',
  async robust(once, prefer) {
    const c = this.cfg();
    if (c.local) {
      try { return await once(c.model); } catch (e) {
        // le cerveau de la maison ne répond pas : relais par Groq pendant 3 minutes (si une clé existe)
        if (S.settings.key && (e.net || !e.status || e.status >= 500 || e.status === 404)) { this.localDownUntil = Date.now() + 180000; return this.robust(once, prefer); }
        throw e;
      }
    }
    const cool = S.settings.modelCool || (S.settings.modelCool = {});
    const now = Date.now();
    const base = [c.model].concat(this.FALLBACK.filter(m => m !== c.model));
    const list = prefer ? [prefer].concat(base.filter(m => m !== prefer)) : base;
    let last = null, removed = false;
    for (const m of list) {
      if (cool[m] && cool[m] > now) continue;
      try {
        const r = await once(m);
        if (removed && m !== c.model) { S.settings.model = m; save(); } // le modèle d'origine n'existe plus
        return r;
      } catch (e) {
        last = e;
        if (e.status === 429) {
          if (e.retryAfter && e.retryAfter <= 6) { // limite par minute : on patiente un peu et on réessaie une fois
            await new Promise(r => setTimeout(r, e.retryAfter * 1000));
            try { return await once(m); } catch (e2) { last = e2; if (e2.status !== 429) throw e2; }
          }
          cool[m] = Date.now() + Math.max(60, Math.min(e.retryAfter || 3600, 24 * 3600)) * 1000;
          save();
          continue;
        }
        if (isModelError(e)) { removed = true; continue; }
        throw e;
      }
    }
    if (!last) { // tous au repos : on dit combien de temps attendre
      const soon = Math.min.apply(null, list.map(m => cool[m] || Infinity));
      last = new Error('Erreur 429 : tous les modèles sont au repos');
      last.status = 429;
      last.retryAfter = Math.max(60, Math.round((soon - now) / 1000));
    }
    throw last;
  },
  // opts.prefer : un autre modèle pour les petites tâches (la mémoire), pour garder l'énergie du principal
  chat(messages, opts) { return this.robust(m => this.chatOnce(m, messages, opts), opts && opts.think ? this.THINK_MODEL : (opts && opts.prefer) || null); },
  chatStream(messages, opts, onSentence) { return this.robust(m => this.chatStreamOnce(m, messages, opts, onSentence), opts && opts.think ? this.THINK_MODEL : null); },
  // cerveau local Qwen3 : on lui dit de ne pas « réfléchir à voix basse » (beaucoup plus rapide)
  _local(c, messages) { return c.local && /qwen3/i.test(c.model || '') ? messages.map((m, i) => (i === 0 && m.role === 'system' ? { role: 'system', content: `${m.content} /no_think` } : m)) : messages; },
  async chatOnce(model, messages, { maxTokens = 220, temperature = 0.8, timeout = 20000, think = false } = {}) {
    const c = Object.assign({}, this.cfg(), { model });
    messages = this._local(c, messages);
    const body = { model: c.model, messages, temperature: c.local ? Math.min(temperature, 0.35) : temperature, max_tokens: maxTokens };
    if (!c.local) {
      // Les modèles « qui réfléchissent » : réflexion courte (ou plus longue pour une question difficile), on ne garde que la réponse
      if (c.model.startsWith('openai/gpt-oss')) { body.reasoning_effort = think ? 'medium' : 'low'; body.max_tokens = maxTokens + (think ? 1200 : 300); }
      if (c.model.startsWith('qwen/')) body.reasoning_format = 'hidden';
    }
    const j = await this._fetch(c, '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, c.local ? Math.max(timeout, 45000) : timeout);
    countUsage(j.usage ? j.usage.total_tokens : 0);
    return cleanReply((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
  },

  // Même chose, mais la réponse arrive mot à mot : onSentence(phrase) est appelé dès qu'une phrase est complète,
  // pour que Shadow commence à parler sans attendre la fin.
  async chatStreamOnce(model, messages, { maxTokens = 200, temperature = 0.8, timeout = 20000, think = false } = {}, onSentence) {
    const c = Object.assign({}, this.cfg(), { model });
    messages = this._local(c, messages);
    const body = { model: c.model, messages, temperature: c.local ? Math.min(temperature, 0.35) : temperature, max_tokens: maxTokens, stream: true }; // petit cerveau local : plus prudent
    if (think) timeout = Math.max(timeout, 30000);
    if (!c.local) {
      if (c.model.startsWith('openai/gpt-oss')) { body.reasoning_effort = think ? 'medium' : 'low'; body.max_tokens = maxTokens + (think ? 1200 : 300); }
      if (c.model.startsWith('qwen/')) body.reasoning_format = 'hidden';
    }
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), c.local ? Math.max(timeout, 45000) : timeout);
    let full = '', pending = '', inThink = false;
    const flush = force => {
      // découpe en phrases (au moins ~20 lettres, pour ne pas hacher la voix)
      for (;;) {
        const m = pending.match(/^([\s\S]{20,}?[.!?…])(\s+|$)/);
        if (!m || (!m[2] && !force)) break;
        onSentence(cleanReply(m[1]));
        pending = pending.slice(m[0].length);
      }
      if (force && cleanReply(pending)) { onSentence(cleanReply(pending)); pending = ''; }
    };
    try {
      const res = await fetch(c.base + '/chat/completions', {
        method: 'POST', signal: ctl.signal,
        headers: Object.assign({ 'Content-Type': 'application/json' }, c.key ? { Authorization: `Bearer ${c.key}` } : {}),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await httpError(res);
      if (!res.body) throw new Error('Pas de flux');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (data === '[DONE]') continue;
          let j = null;
          try { j = JSON.parse(data); } catch (e) { continue; }
          const u = (j.x_groq && j.x_groq.usage) || j.usage;
          if (u && u.total_tokens) countUsage(u.total_tokens);
          let piece = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
          // les modèles « qui réfléchissent » peuvent envoyer <think>…</think> : on ne le dit pas
          if (piece.indexOf('<think>') >= 0) { inThink = true; piece = piece.split('<think>')[0]; }
          if (inThink) { const k = piece.indexOf('</think>'); if (k < 0) continue; inThink = false; piece = piece.slice(k + 8); }
          full += piece;
          pending += piece;
          flush(false);
        }
      }
      flush(true);
      return cleanReply(full);
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) {
        if (!c.local) this.netDownUntil = Date.now() + 45000;
        const err = new Error(e.name === 'AbortError' ? 'Trop long… (pas de WiFi ?)' : 'Pas de connexion (WiFi ?)');
        err.net = true;
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(tm);
    }
  },

  // Vision détaillée (option de papa) : une photo est envoyée à Groq pour la décrire
  VISION_MODEL: 'qwen/qwen3.8-27b', // il comprend aussi les images (vérifié en oct. 2026)
  RETIRED_VISION: ['meta-llama/llama-4-scout-17b-16e-instruct'],
  async see(dataUrl, question) {
    const model = S.settings.visionModel || this.VISION_MODEL;
    const body = {
      model, temperature: 0.5, max_tokens: 200,
      messages: [{ role: 'user', content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    };
    if (model.startsWith('qwen/')) body.reasoning_format = 'hidden';
    const j = await this._fetch({ base: this.GROQ, key: S.settings.key }, '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, 25000);
    countUsage(j.usage ? j.usage.total_tokens : 0);
    return cleanReply((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
  },

  // Oreilles (quand le navigateur n'a pas de reconnaissance vocale)
  async transcribe(blob, prompt = '', { cheap = false } = {}) {
    const ext = /wav/.test(blob.type) ? 'wav' : /mp4|aac|m4a/.test(blob.type) ? 'mp4' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    const form = groq => {
      const fd = new FormData();
      fd.append('file', blob, `voix.${ext}`);
      if (groq) fd.append('model', this.STT_MODEL);
      fd.append('language', 'fr');
      fd.append('temperature', '0');
      fd.append('response_format', 'verbose_json'); // avec l'indice de confiance de chaque morceau
      fd.append('prompt', prompt || 'Un adulte parle en français à Atlas, son assistant vocal.');
      return fd;
    };
    const home = this.homeEars();
    const viaGroq = async () => {
      const r = await this._fetch({ base: this.GROQ, key: S.settings.key }, '/audio/transcriptions', { method: 'POST', body: form(true) }, 30000);
      countUsage(0, Math.max(10, Math.round(r.duration || 0))); // Groq compte au moins 10 secondes par morceau
      this.lastEars = 'groq';
      return r;
    };
    const viaMaison = async () => {
      const ctl = window.AbortController ? new AbortController() : null;
      const tm = setTimeout(() => ctl && ctl.abort(), 20000);
      try {
        const r = await fetch(`${home}/shadow/oreilles`, { method: 'POST', body: form(false), signal: ctl ? ctl.signal : undefined });
        if (!r.ok) { const e = new Error(`oreilles de la maison ${r.status}`); e.status = r.status; throw e; }
        this.lastEars = 'maison';
        return await r.json();
      } finally { clearTimeout(tm); }
    };
    const groqOk = !!S.settings.key && !(S.settings.sttCool > Date.now());
    let j = null;
    // en veille (il attend son nom), ou si papa l'a choisi : les oreilles de la maison d'abord (Groq est gardé pour les vraies conversations)
    if (home && (S.settings.earsMaisonFirst || cheap || !groqOk)) {
      try { j = await viaMaison(); } catch (e) { if (!groqOk) throw e; } // l'ordinateur ne répond pas : Groq
    }
    if (!j) {
      try { j = await viaGroq(); } catch (e) {
        if (!home) throw e;
        // limite de Groq atteinte (ou Groq injoignable) : les oreilles de la maison prennent le relais
        if (e.status === 429) { S.settings.sttCool = Date.now() + Math.max(60, Math.min(e.retryAfter || 600, 6 * 3600)) * 1000; save(); }
        else if (!e.net && !(e.status >= 500)) throw e;
        j = await viaMaison();
      }
    }
    // Whisper « hallucine » parfois sur du bruit : on jette les morceaux où il n'est pas sûr qu'on ait parlé
    let t = (j.text || '').trim();
    if (Array.isArray(j.segments) && j.segments.length) {
      const good = j.segments.filter(s => !(s.no_speech_prob > 0.75 && s.avg_logprob < -0.9) && !(s.avg_logprob < -1.6));
      const lp = good.length ? good.reduce((a, s) => a + s.avg_logprob, 0) / good.length : -9;
      this.lastConfident = lp > -0.8; // la phrase a-t-elle été bien comprise ?
      t = good.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    }
    if (/amara|sous-titr|merci d'avoir regard|abonnez-vous|^\W*$/i.test(t)) return '';
    if (/^(merci( beaucoup)?|au revoir|bon appétit|\.+)[.!]?$/i.test(t) && j.duration && j.duration < 1.2) return ''; // classiques du bruit
    if ((t.match(/[^\u0000-\u024F\s\d.,!?'’«»…-]/g) || []).length > t.length * 0.3) return ''; // pas du français (bruit)
    return t;
  },

  async _fetch(c, path, opt, timeout) {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(c.base + path, {
        ...opt, signal: ctl.signal,
        headers: { ...(opt.headers || {}), ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) },
      });
      if (!res.ok) throw await httpError(res);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) {
        if (c.base === this.GROQ) this.netDownUntil = Date.now() + 45000; // réseau coupé : on réessaiera dans 45 s
        const err = new Error(e.name === 'AbortError' ? 'Trop long… (pas de WiFi ?)' : c.base === this.GROQ ? 'Pas de connexion (WiFi ?)' : `IA locale injoignable (${c.base})`);
        err.net = true;
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(tm);
    }
  },
};

// Une erreur de Groq, avec son code (401 = clé refusée, 429 = limite atteinte, 5xx = souci chez Groq…)
async function httpError(res) {
  let detail = '';
  try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) { /* pas de détail */ }
  const e = new Error(`Erreur ${res.status}${detail ? ` : ${detail}` : ''}`);
  e.status = res.status;
  const ra = parseFloat(res.headers.get('retry-after'));
  if (!isNaN(ra)) e.retryAfter = ra;
  return e;
}
const isModelError = e => (e.status === 400 || e.status === 404) && /model|decommission|not found|does not exist|n'existe/i.test(e.message);

function cleanReply(t) {
  return String(t).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[\u2600-\u27BF\u2B00-\u2BFF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|\uFE0F|\u200D/g, '') // émojis (les petits cerveaux en mettent)
    .replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/[ \t]{2,}/g, ' ').trim();
}

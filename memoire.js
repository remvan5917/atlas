/* =========================================================
   ATLAS — sa mémoire de toi (et de la maison)
   - Après quelques échanges, le cerveau relit la conversation et retient tout seul ce qui dure :
     goûts, habitudes, projets, les gens de ta vie, les dates à venir (« jeudi, dentiste »).
   - « Souviens-toi que… », « qu'est-ce que tu sais sur moi ? », « oublie que… », « oublie tout ».
   - Rien de secret : jamais de mot de passe, de code, de numéro de carte ou de compte.
   - Gardée sur tes appareils et sur l'ordinateur de la maison (/atlas/etat), jamais ailleurs ;
     tout se voit et s'efface dans les réglages (« Ce qu'il sait de toi »).
   ========================================================= */
'use strict';

const MEMOIRE = (() => {
  const L = () => (S.memoire = S.memoire || []);
  const MAX = 250;
  const SECRET = /\b(mot de passe|mdp|password|code (pin|secret|de la carte|d acces|wifi)|iban|rib|numero de (carte|compte|securite sociale)|cle (api|secrete)|cryptogramme)\b|\b(sk|gsk)_[a-z0-9]{6,}|\d[\d .-]{9,}\d/i;
  const VIDES = new Set('avec dans pour sont etait cette plus fait faire tout tous aussi mais donc alors chez vers sous entre leur leurs notre votre elle elles quoi quel quelle comment pourquoi combien atlas peux veux veut sais savoir parle dire moi toi nous vous'.split(' '));
  const mots = t => new Set(N(t).split(' ').filter(w => w.length >= 4 && !VIDES.has(w)));
  const proche = (a, b) => { const x = mots(a), y = mots(b); if (!x.size || !y.size) return 0; let c = 0; x.forEach(w => { if (y.has(w)) c++; }); return c / Math.min(x.size, y.size); };
  const qui0 = () => S.nom || 'lui';

  function ajoute(texte, qui, src = 'auto', date = '') {
    let t = String(texte || '').replace(/\s+/g, ' ').trim().replace(/^que\s+/i, '');
    if (t.length < 6 || t.length > 220 || SECRET.test(N(t)) || SECRET.test(t)) return null;
    if (/^(a|est|aime|adore|deteste|prefere|travaille|fait|va|veut|doit|habite|vit|joue|apprend|utilise|possede|connait|cherche|prevoit|construit|developpe)\b/.test(N(t))) t = `Il ${t.charAt(0).toLowerCase()}${t.slice(1)}`; // « A commencé… » → « Il a commencé… »
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]$/.test(t)) t += '.';
    const l = L(), deja = l.find(x => proche(x.texte, t) >= 0.85);
    if (deja) { if (src === 'dit') { deja.texte = t; deja.at = Date.now(); save(); } return deja; }
    const it = { id: Date.now() + Math.floor(Math.random() * 1000), texte: t, qui: String(qui || qui0()).slice(0, 30), at: Date.now(), src };
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) it.date = date;
    l.push(it);
    // trop de souvenirs : on oublie d'abord les plus vieux souvenirs automatiques (jamais ceux qu'il t'a promis de retenir)
    while (l.length > MAX) { const i = l.findIndex(x => x.src !== 'dit'); const v = l.splice(i >= 0 ? i : 0, 1)[0]; tomb('memoire', v); }
    save();
    return it;
  }
  function retire(it) { tomb('memoire', it); S.memoire = L().filter(x => x !== it); save(); }

  // ce qui est utile pour répondre à cette phrase : les souvenirs qui en parlent, les plus récents, ce qui arrive bientôt
  function pertinents(text, k = 24) {
    const l = L(), auj = dayKey(), dans7 = dayKey(new Date(Date.now() + 7 * 86400000));
    const notes = l.map((x, i) => ({ x, s: proche(x.texte, text) * 3 + (x.date && x.date >= auj && x.date <= dans7 ? 2 : 0) + i / l.length }));
    return notes.sort((a, b) => b.s - a.s).slice(0, k).map(o => o.x).sort((a, b) => a.at - b.at);
  }
  const quand = d => { const j = Math.round((new Date(`${d}T12:00`) - new Date(`${dayKey()}T12:00`)) / 86400000); return j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : j === -1 ? 'hier' : j > 1 && j < 7 ? new Date(`${d}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long' }) : new Date(`${d}T12:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); };
  function contexte(text) {
    const p = pertinents(text);
    if (!p.length) return '';
    return `Ce que tu sais de lui et de sa maison (tes souvenirs : utilise-les naturellement quand c'est utile, fais des liens — « la dernière fois, tu disais que… » —, ne les récite jamais en bloc, et ne mélange pas les personnes) :\n${p.map(x => `- ${x.qui && x.qui !== qui0() ? `(${x.qui}) ` : ''}${x.texte}${x.date ? ` [${quand(x.date)}]` : ''}`).join('\n')}`;
  }
  const aujourdhui = () => L().filter(x => x.date === dayKey());

  /* ---------- il retient tout seul : après quelques échanges, ou après un moment de calme ---------- */
  let attente = 0, occupe = false;
  function tour() { attente++; if (attente >= 4) consolide(); }
  setInterval(() => { if (attente && !dlg.busy && Date.now() - (dlg.repondu || 0) > 3 * 60000) consolide(); }, 60000);
  async function consolide() {
    if (occupe || !AI.ready() || voice.endormi) return;
    const depuis = S.memAt || 0;
    const msgs = (S.chat || []).filter(m => (m.at || 0) > depuis);
    if (!msgs.some(m => m.role === 'user')) { attente = 0; return; }
    occupe = true; attente = 0;
    try {
      const qui = m => (m.role === 'user' ? (m.who && !/^invité/.test(m.who) ? m.who : S.nom || 'lui') : 'Atlas');
      const conv = msgs.map(m => `${qui(m)} : ${String(m.content).split('[[ecran]]')[0].slice(0, 600)}`).join('\n');
      const connus = L().slice(-60).map(x => `#${x.id} (${x.qui}) ${x.texte}${x.date ? ` [${x.date}]` : ''}`).join('\n') || '(rien encore)';
      // le calendrier tout prêt : les petits cerveaux se trompent en comptant les jours
      const jours = Array.from({ length: 15 }, (x, i) => { const d = new Date(Date.now() + i * 86400000); return `${i === 0 ? "aujourd'hui " : i === 1 ? 'demain ' : ''}${d.toLocaleDateString('fr-FR', { weekday: 'long' })}${i >= 7 ? ' de la semaine prochaine' : ''} = ${dayKey(d)}`; }).join(', ');
      const sys = `Tu es la mémoire d'Atlas, l'assistant personnel d'un papa (appelé ici « ${S.nom || 'lui'} »). Les dates : ${jours}.
Lis la conversation et réponds UNIQUEMENT avec ce JSON : {"nouveaux": [{"qui": "…", "fait": "…", "date": "AAAA-MM-JJ ou vide"}], "perimes": [ids]}
"nouveaux" : de 0 à 5 choses NOUVELLES et DURABLES qu'une personne a dites elle-même (jamais ce qu'Atlas a dit ou supposé) : ses goûts, ses habitudes, son travail et ses projets, ses outils, les gens de sa vie (prénoms, liens), ses objectifs, ce qui compte pour lui, et les choses prévues à un jour précis : rendez-vous (médecin, dentiste, garage, réunion — retiens le rendez-vous, sans détail médical), visites, anniversaires, voyages, échéances. "date" : SEULEMENT pour une chose prévue à un jour précis, prise dans la liste des dates ci-dessus (« jeudi » → la date du jeudi) ; sinon "". Une phrase courte à la 3e personne, avec le prénom si on le connaît, et l'heure si elle est dite. "qui" : la personne dont parle le fait.
Ne retiens JAMAIS : mot de passe, code, numéro de carte ou de compte, clé, adresse précise, détail de santé, ni rien de gênant ou d'intime ; rien sur les invités ; rien de passager (« j'ai faim », « il pleut »), ni les simples questions qu'il a posées.
"perimes" : les numéros (#) des souvenirs déjà connus que la conversation rend faux ou dépassés (il a changé d'avis, c'est fini, c'est passé). Si rien : [].
Ne répète pas ce qui est déjà connu.`;
      const raw = await AI.chat([{ role: 'system', content: sys }, { role: 'user', content: `Déjà connu :\n${connus}\n\nConversation :\n${conv}` }], { maxTokens: 500, temperature: 0.2, timeout: 30000, prefer: 'openai/gpt-oss-20b' });
      let j = null;
      try { const s = String(raw || ''); j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch (e) { j = null; }
      if (j && Array.isArray(j.perimes)) j.perimes.slice(0, 5).forEach(id => { const it = L().find(x => String(x.id) === String(id).replace('#', '') && x.src !== 'dit'); if (it) retire(it); });
      // une date seulement si la phrase parle vraiment d'un jour (les petits cerveaux en mettent partout)
      const JOUR = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|apres demain|ce soir|ce week end|le \d{1,2}|\d{1,2} (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)|la semaine prochaine|anniversaire)\b/;
      if (j && Array.isArray(j.nouveaux)) j.nouveaux.slice(0, 5).forEach(f => f && ajoute(f.fait, typeof f.qui === 'string' && f.qui.length < 30 ? f.qui : '', 'auto', JOUR.test(N(f.fait || '')) ? f.date : ''));
      S.memAt = Math.max(...msgs.map(m => m.at || 0)); save();
    } catch (e) { console.warn('mémoire', e); attente = 1; } finally { occupe = false; }
  }

  /* ---------- ce qu'on lui dit directement ---------- */
  const R = {
    retiens: /^(?:souviens toi|rappelle toi|retiens|n oublie pas|memorise|garde en memoire|enregistre dans ta memoire)\b/,
    sais: /\b(qu est ce que tu sais|que sais tu|tu sais quoi|qu est ce que tu connais|qu est ce que tu as retenu|tu te souviens de quoi|qu est ce que tu retiens) (sur|de|a propos de) (moi|nous|la maison|la famille|ma vie|[a-z]+)\b|\bqu est ce que tu as retenu( aujourd hui)?\b/,
    oublieTout: /\boublie tout (ce que tu sais|sur moi|de moi|sur nous|ce que tu as retenu)\b|\b(efface|vide) (toute )?ta memoire\b/,
    oublie: /^(?:oublie|efface de ta memoire|ne retiens pas)\s+(?:que |qu |le fait que |ce que je t ai dit sur )(.+)$/,
  };
  function route(t, n) {
    if (R.oublieTout.test(n)) return oublieTout;
    if (R.retiens.test(n) && !/\b(ma|la) voix\b/.test(n) && !/\bou (je|j)\b.*\b(pose|range|mets|met|laisse|ai pose|ai mis|ai range)\b/.test(n) && !/\b(dans \d+|dans (une|deux|trois|cinq|dix|quinze|vingt|trente) |a \d{1,2} ?(h|heures?)\b|demain matin|ce soir a)/.test(n)) {
      const m = String(t).match(/^\s*(?:souviens[- ]toi|rappelle[- ]toi|retiens|n['’]oublie pas|mémorise|memorise|garde en mémoire|garde en memoire|enregistre dans ta mémoire)\s*(?:bien\s*)?(?:que |qu['’]\s*|de |d['’]\s*|:)?\s*(.+)$/i);
      if (m && m[1].trim().length > 3) return () => retiens(m[1]);
    }
    if (R.sais.test(n)) return () => raconte(t, n);
    const o = n.match(R.oublie);
    if (o && !/\b(la|ma) voix\b|\bles? notes?\b|\bminuteur|\breveil\b/.test(n)) return () => oublie(o[1]);
    return null;
  }
  async function retiens(txt) {
    if (SECRET.test(N(txt)) || SECRET.test(txt)) return say("Ça, je préfère ne pas le garder : je ne retiens jamais de mot de passe, de code ou de numéro.");
    let t = String(txt).trim();
    // « je m'appelle… / ma femme s'appelle… » : à la 3e personne, pour ne jamais se tromper de personne
    if (AI.ready() && /\b(je|j|mon|ma|mes|moi)\b/i.test(t)) {
      try { const r = await AI.chat([{ role: 'system', content: `Réécris cette information à la 3e personne, en une phrase courte, pour la mémoire d'un assistant. La personne qui parle s'appelle « ${dlg.qui && !/^invité/.test(dlg.qui) ? dlg.qui : S.nom || 'lui'} ». Réponds seulement la phrase.` }, { role: 'user', content: t }], { maxTokens: 80, temperature: 0.1, prefer: 'openai/gpt-oss-20b' }); const p = nettoie(r).replace(/^["«\s]+|["»\s]+$/g, ''); if (p.length > 5 && p.length < 220) t = p; } catch (e) { /* tel quel */ }
    }
    const it = ajoute(t, dlg.qui && !/^invité/.test(dlg.qui) ? dlg.qui : '', 'dit');
    if (!it) return say("Je n'ai pas pu le retenir. Dis-le autrement ?");
    fx.ok();
    return say(pick(['Retenu.', "C'est gravé.", 'Noté dans ma mémoire.', 'Je ne l’oublierai pas.']));
  }
  async function raconte(t, n) {
    const l = L();
    if (!l.length) return say("Je ne sais encore presque rien. Parle-moi de toi, je retiens au fil des conversations. Tu peux aussi dire : souviens-toi que…");
    const aujd = /\baujourd hui\b/.test(n), debut = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const choix = aujd ? l.filter(x => x.at >= debut) : l.slice(-40);
    if (aujd && !choix.length) return say("Rien de nouveau aujourd'hui.");
    if (!AI.ready()) return say(`${choix.length} souvenirs. Les derniers : ${choix.slice(-4).map(x => x.texte).join(' ')}`);
    const r = await AI.chat([{ role: 'system', content: `Tu es Atlas (une IA de film : calme, précise, un brin pince-sans-rire). Voici tes souvenirs :\n${choix.map(x => `- (${x.qui}) ${x.texte}${x.date ? ` [${quand(x.date)}]` : ''}`).join('\n')}\n\nRéponds à sa question à l'oral, en trois à cinq phrases naturelles, en regroupant par thème (pas une liste). Tutoie-le. Termine en rappelant qu'il peut dire « oublie que… » ou tout voir dans les réglages.` }, { role: 'user', content: t }], { maxTokens: 320, temperature: 0.5 });
    return say(nettoie(r) || 'Je ne sais pas encore grand-chose.');
  }
  async function oublie(quoi) {
    const l = L(); if (!l.length) return say("Ma mémoire est vide.");
    const best = l.map(x => ({ x, s: proche(x.texte, quoi) })).sort((a, b) => b.s - a.s)[0];
    if (!best || best.s < 0.34) return say("Je ne trouve pas ce souvenir. Tu peux tout voir dans mes réglages, à « Ce qu'il sait de toi ».");
    if (!(await askYesNo(`J'oublie : ${best.x.texte}`))) return say('Je le garde.');
    retire(best.x);
    return say('Oublié.');
  }
  async function oublieTout() {
    const l = L(); if (!l.length) return say("Ma mémoire est déjà vide.");
    if (!(await askYesNo(`J'efface les ${l.length} choses que je sais de toi et de la maison ? C'est définitif.`))) return say('Je garde tout.');
    l.forEach(x => tomb('memoire', x)); S.memoire = []; S.memAt = Date.now(); save();
    return say("C'est fait. Je repars d'une page blanche.");
  }

  /* ---------- les réglages : « Ce qu'il sait de toi » ---------- */
  function render() {
    const box = document.getElementById('r-memoire');
    if (!box) return;
    const l = L();
    box.innerHTML = l.length
      ? l.slice().reverse().map(x => `<div class="item"><span>${esc(x.texte)} <small class="muted">${x.date ? `${esc(quand(x.date))} · ` : ''}${x.src === 'dit' ? 'tu me l’as demandé' : new Date(x.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small></span><button type="button" class="ghost sm danger" data-unmem="${x.id}">✕</button></div>`).join('')
      : '<p class="small muted">Rien pour l\'instant. Il retient au fil des conversations, ou quand tu dis « souviens-toi que… ».</p>';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-unmem]');
    if (!b) return;
    const it = L().find(x => String(x.id) === b.dataset.unmem);
    if (it) { retire(it); render(); }
  });

  return { route, ajoute, contexte, aujourdhui, pertinents, tour, consolide, render, quand, _secret: SECRET };
})();

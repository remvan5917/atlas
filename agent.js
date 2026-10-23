/* =========================================================
   ATLAS — l'agent : il comprend une demande compliquée, la découpe en étapes et les fait lui-même
   - « Ce soir on regarde un film avec mon fils : prépare le salon, préviens-le à 20 h, et coupe tout à 22 h 30 »
     → Mistral choisit les outils (une commande d'Atlas, une commande programmée pour plus tard, l'état réel de la maison),
     Atlas les exécute, lit leurs vrais résultats, puis dit en une phrase ce qui a été fait.
   - Les ordres simples (« allume la cuisine ») ne passent pas par ici : ils restent instantanés.
   - Les commandes programmées sont gardées sur l'ordinateur de la maison (/atlas/planifs) et exécutées à l'heure
     par un Atlas allumé (la tablette d'abord). « Qu'est-ce que tu as programmé ? », « annule les programmes ».
   - Sans clé Mistral (ou si Mistral ne répond pas) : Atlas répond comme avant.
   ========================================================= */
'use strict';

const AGENT = (() => {
  async function appel(chemin, corps, ms = 10000) {
    const r0 = VOIXMAISON.root(); if (!r0 || window.__BANC) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }

  /* ---------- quand passer par l'agent : plusieurs actions, une heure, ou « prépare… » ---------- */
  const VERBES = /\b(allume|allumer|eteins|eteindre|mets|mettre|lance|lancer|prepare|preparer|previens|prevenir|rappelle|rappeler|programme|programmer|coupe|couper|ferme|fermer|active|activer|envoie|envoyer|dis a|demande a|baisse|baisser|monte|monter|regle|regler|arrete|arreter|note|noter|ajoute|ajouter|joue|reveille|verrouille|tamise|eteint)\b/g;
  const TEMPS = /\b(tous les (jours|matins|soirs)|chaque (jour|matin|soir)|le week end|a chaque fois|a \d{1,2} ?h|\d{1,2} h \d{2}|a midi|a minuit|dans \d+ (min|minutes?|heures?|h)|dans (une|deux|trois) heures?|dans un quart d heure|dans une demi heure|ce soir|cette nuit|demain|tout a l heure|apres|puis|ensuite|en meme temps|pendant que)\b/;
  function agentique(text) {
    const n = N(text); if (n.split(' ').length < 5) return false;
    const v = (n.match(VERBES) || []).length;
    return v >= 2 || (v >= 1 && TEMPS.test(n)) || /\b(prepare|organise|occupe toi de|fais en sorte|planifie|programme moi|scenario)\b/.test(n) || /\b(cree|creer|enregistre|invente|nouveau|ajoute)\b.*\bprotocole\b/.test(n);
  }
  const pret = () => typeof AI !== 'undefined' && AI.mistralPret && AI.mistralPret();

  /* ---------- les outils ---------- */
  const OUTILS = [
    { type: 'function', function: { name: 'commande', description: "Exécute tout de suite UNE commande d'Atlas. « phrase » : une phrase de la liste des commandes, adaptée (le nom exact de l'appareil, le bon texte). Le résultat est ce qu'Atlas a vraiment répondu.", parameters: { type: 'object', properties: { phrase: { type: 'string', description: 'la commande, par exemple « mets le salon à 40 % »' } }, required: ['phrase'] } } },
    { type: 'function', function: { name: 'programmer', description: "Programme UNE commande d'Atlas pour plus tard. Donne « heure » (HH:MM ; demain si l'heure est déjà passée, ou jour = demain), ou « dans_minutes ».", parameters: { type: 'object', properties: { phrase: { type: 'string' }, heure: { type: 'string', description: 'HH:MM' }, jour: { type: 'string', enum: ['aujourd_hui', 'demain'] }, dans_minutes: { type: 'number' } }, required: ['phrase'] } } },
    { type: 'function', function: { name: 'automatiser', description: "Crée une habitude durable que la maison fera toute seule : soit chaque jour à une heure (« heure » HH:MM et « jours » : 0 = lundi … 6 = dimanche ; tous les jours par défaut), soit juste après une phrase (« apres », par exemple « je viens de me réveiller »). « phrase » : la commande d'Atlas à faire.", parameters: { type: 'object', properties: { phrase: { type: 'string' }, heure: { type: 'string', description: 'HH:MM' }, jours: { type: 'array', items: { type: 'integer' } }, apres: { type: 'string' } }, required: ['phrase'] } } },
    { type: 'function', function: { name: 'creer_protocole', description: "Enregistre un protocole (une scène à son nom, qu'il lancera plus tard en disant « protocole <nom> »). « etapes » : les commandes d'Atlas, dans l'ordre ; une étape peut avoir « heure » (HH:MM) ou « dans_minutes » si elle doit se faire plus tard une fois le protocole lancé.", parameters: { type: 'object', properties: { nom: { type: 'string' }, etapes: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, heure: { type: 'string' }, dans_minutes: { type: 'number' } }, required: ['phrase'] } } }, required: ['nom', 'etapes'] } } },
    { type: 'function', function: { name: 'etat_maison', description: "L'état réel de la maison à l'instant : présence, lumières allumées, caméras, alertes, alarme, agenda.", parameters: { type: 'object', properties: {} } } },
  ];
  const REGLES = `
MODE AGENT : tu as des outils, et tu agis toi-même. Pour chaque action, appelle « commande » avec une phrase de la liste (une action par appel ; s'il y a plusieurs étapes, fais-les toutes, dans l'ordre). Créer un protocole (« crée le protocole soirée jeux : … ») : « creer_protocole » avec ses étapes (ne les exécute pas maintenant). Une habitude qui revient (« tous les matins », « chaque soir », « le week-end », « à chaque fois que je dis… ») : « automatiser ». Une action demandée pour plus tard (« à 22 h 30 », « dans 20 minutes », « ce soir ») : appelle SEULEMENT « programmer », jamais « commande » maintenant pour cette action. « Baisse le son » concerne le volume ; pour une lumière, « mets <appareil> à N % ». Pour connaître la maison, « etat_maison ».
Fais TOUTES les demandes, une par une (un réveil, un rappel, un message : chacun son appel). Lis le résultat de chaque outil : s'il dit que ça n'a pas marché ou qu'Atlas ne sait pas faire, dis-le franchement. Ne dis JAMAIS qu'une chose est faite si un outil ne l'a pas faite. N'écris pas de commande entre crochets [[…]] dans ce mode.
À la fin, réponds en une ou deux phrases courtes, à l'oral : ce qui est fait, et ce qui est programmé (avec l'heure).`;

  function dansHud(t) { const h = document.getElementById('pensee'); if (!h) return; const d = document.createElement('div'); d.style.cssText = 'display:grid;grid-template-columns:86px 1fr;gap:8px'; d.innerHTML = `<span style="color:#fbbf24;letter-spacing:.14em">ÉTAPE</span><span style="color:#e0f2fe;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t)}</span>`; h.insertBefore(d, h.lastElementChild); }
  const hm = d => `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`.replace(' h 00', ' h');
  async function execute(nom, a, etapes) {
    if (nom === 'commande') {
      const ph = String(a.phrase || '').trim().slice(0, 200); if (!ph) return 'phrase vide';
      // le son : seulement s'il en a parlé (« baisse la lumière » n'est pas « baisse le son »)
      if (/\b(le son|volume|plus fort|moins fort)\b/.test(N(ph)) && !/\b(son|volume|fort|bruit|ecoute|entends)\b/.test(N(etapes.demande || ''))) return "pas fait : il n'a pas parlé du son";
      dansHud(ph); etapes.push(ph);
      const cap = []; window.__agentCapture = cap; window.__ordreDuCerveau = true;
      try { await Promise.race([handle(ph), wait(15000)]); } catch (e) { cap.push(`erreur : ${e.message}`); } finally { window.__agentCapture = null; window.__ordreDuCerveau = false; }
      const rep = cap.join(' ').slice(0, 600) || 'fait (Atlas n\'a rien répondu)';
      (etapes.resultats = etapes.resultats || []).push(cap.join(' ').replace(/\s+/g, ' ').trim().slice(0, 160) || `${ph} : fait.`);
      return rep;
    }
    if (nom === 'programmer') {
      const ph = String(a.phrase || '').trim().slice(0, 200); if (!ph) return 'phrase vide';
      // un réveil, un rappel, un minuteur ont déjà leur heure : ils se règlent tout de suite
      if (/\b(reveille|reveil|rappelle|rappel|minuteur)\b/.test(N(ph))) return execute('commande', { phrase: /\b(a|dans|demain)\b/.test(N(ph)) ? ph : `${ph} ${a.heure ? `à ${a.heure.replace(':', ' h ')}` : `dans ${a.dans_minutes} minutes`}` }, etapes);
      let at = 0;
      if (a.dans_minutes) at = Date.now() + Math.max(1, Math.min(8 * 1440, +a.dans_minutes)) * 60000;
      else if (/^\d{1,2}[:h]\d{2}$/.test(String(a.heure || '').trim())) {
        const [h, m] = String(a.heure).trim().split(/[:h]/).map(Number), d = new Date(); d.setHours(h, m, 0, 0);
        if (a.jour === 'demain' || d <= new Date()) d.setDate(d.getDate() + 1);
        at = +d;
      }
      if (!at) return "heure manquante : donne « heure » (HH:MM) ou « dans_minutes »";
      try { const r = await appel('/atlas/planifs', { ajoute: { phrase: ph, at, par: typeof monId !== 'undefined' ? monId : '' } }); if (!r.ok) return `pas programmé : ${r.raison || 'refus'}`; }
      catch (e) { return "pas programmé : l'ordinateur de la maison ne répond pas"; }
      const d = new Date(at), demain = d.toDateString() !== new Date().toDateString();
      dansHud(`${hm(d)} · ${ph}`); etapes.push(`${ph} à ${hm(d)}`); (etapes.programmes = etapes.programmes || []).push(`${demain ? 'demain ' : ''}à ${hm(d)}, ${ph}`);
      return `programmé ${demain ? 'demain ' : ''}à ${hm(d)} : ${ph}`;
    }
    if (nom === 'automatiser') {
      const ph = String(a.phrase || '').trim().slice(0, 160); if (!ph) return 'phrase vide';
      const corps = a.apres ? { phrase: ph, apres: N(a.apres) } : { phrase: ph, heure: String(a.heure || '').replace('h', ':'), jours: Array.isArray(a.jours) && a.jours.length ? a.jours : [0, 1, 2, 3, 4, 5, 6] };
      if (!corps.apres && !/^\d{1,2}:\d{2}$/.test(corps.heure)) return "il manque l'heure (HH:MM) ou la phrase « apres »";
      try { await appel('/maison/habitudes', { ajoute: corps }); } catch (e) { return "pas enregistré : l'ordinateur de la maison ne répond pas"; }
      const j = corps.jours ? (corps.jours.length === 7 ? 'tous les jours' : corps.jours.join() === '0,1,2,3,4' ? 'du lundi au vendredi' : corps.jours.join() === '5,6' ? 'le week-end' : 'certains jours') : '';
      const t = corps.apres ? `après « ${a.apres} », ${ph}` : `${j} à ${corps.heure.replace(/^0/, '').replace(':', ' h ').replace(' h 00', ' h')}, ${ph}`;
      dansHud(`habitude · ${t}`); (etapes.programmes = etapes.programmes || []).push(`désormais ${t}`);
      return `habitude créée : ${t}`;
    }
    if (nom === 'creer_protocole') {
      const p = enregistre(a.nom, a.etapes);
      if (!p) return 'protocole vide ou sans nom';
      dansHud(`protocole ${p.nom} · ${p.etapes.length} étapes`); (etapes.programmes = etapes.programmes || []).push(`le protocole « ${p.nom} » est prêt, avec ${p.etapes.length} étape${p.etapes.length > 1 ? 's' : ''} ; dis « protocole ${p.nom} » pour le lancer`);
      return `protocole « ${p.nom} » enregistré : ${p.etapes.map(e => e.phrase + (e.heure ? ` (à ${e.heure})` : e.dans_minutes ? ` (dans ${e.dans_minutes} min)` : '')).join(' ; ')}`;
    }
    if (nom === 'etat_maison') { await VRAI.frais(); dansHud('état de la maison'); return VRAI.texte() || "l'état de la maison n'est pas disponible"; }
    return 'outil inconnu';
  }
  // Mistral veut des tours qui alternent, sans message vide
  function historique(c, text) {
    const out = [];
    for (const m of c.slice(-9, -1)) {
      const t = String(m.content || '').replace(/\[\[[\s\S]*$/, '').trim().slice(0, 1500); if (!t || !/^(user|assistant)$/.test(m.role)) continue;
      if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += `\n${t}`; else out.push({ role: m.role, content: t });
    }
    while (out.length && out[0].role !== 'user') out.shift();
    if (out.length && out[out.length - 1].role === 'user') out.pop(); // la phrase d'aujourd'hui vient après
    return out.concat([{ role: 'user', content: text }]);
  }
  async function mistral(msgs) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(`${AI.MISTRAL}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${S.settings.mistralKey}` },
        body: JSON.stringify({ model: AI.mistralModele(), messages: msgs, tools: OUTILS, tool_choice: 'auto', temperature: 0.3, max_tokens: 700 }) });
      if (!r.ok) throw await httpError(r);
      const j = await r.json();
      if (j.usage && typeof compteMois === 'function') compteMois('mistral', AI.mistralModele(), j.usage.prompt_tokens, j.usage.completion_tokens);
      return j;
    } finally { clearTimeout(tm); }
  }

  /* ---------- l'agent ---------- */
  async function lance(text) {
    if (!pret() || !agentique(text)) return false;
    const c = S.chat || (S.chat = []);
    await VRAI.frais();
    const msgs = [{ role: 'system', content: systeme(text) + REGLES }].concat(historique(c, text));
    face.set('think');
    const fin = typeof BORD !== 'undefined' ? BORD.pensee(text) : () => {};
    const ack = say(pick(["Je m'en occupe.", "C'est parti.", 'Entendu, je prépare ça.']));
    const etapes = []; etapes.demande = text; let final = '';
    try {
      for (let tour = 0; tour < 6; tour++) {
        const j = await mistral(msgs);
        const m = (j.choices && j.choices[0] && j.choices[0].message) || {};
        const appels = m.tool_calls || [];
        if (!appels.length) { final = Array.isArray(m.content) ? m.content.filter(x => x.type === 'text').map(x => x.text).join(' ') : String(m.content || ''); break; }
        msgs.push({ role: 'assistant', content: typeof m.content === 'string' ? m.content : '', tool_calls: appels });
        const args = appels.map(tc => { try { return JSON.parse((tc.function && tc.function.arguments) || '{}'); } catch (e) { return {}; } });
        // la même action demandée maintenant ET programmée pour plus tard : seulement plus tard (« éteins la cuisine dans 20 minutes »)
        const plusTard = new Set(appels.map((tc, i) => (tc.function && tc.function.name === 'programmer' ? N(args[i].phrase) : null)).filter(Boolean));
        for (const [i, tc] of appels.entries()) {
          const a = args[i];
          const nom = tc.function && tc.function.name;
          const out = nom === 'commande' && plusTard.has(N(a.phrase)) ? 'pas fait maintenant : cette action est programmée pour plus tard' : await execute(nom, a, etapes);
          msgs.push({ role: 'tool', tool_call_id: tc.id, name: tc.function && tc.function.name, content: String(out) });
        }
      }
    } catch (e) {
      fin(); await ack;
      if (!etapes.length) return false; // rien n'a été fait : Atlas répond comme avant
      final = `J'ai fait : ${etapes.join(', ')}. Puis mon cerveau a décroché.`;
    }
    fin(); await ack; face.set('idle');
    const vrai = [...new Set(etapes.resultats || [])].filter(x => !/^fait \(/.test(x));
    if (vrai.length || (etapes.programmes || []).length) {
      // le résumé vient des vraies réponses de chaque action : il ne peut pas annoncer ce qui n'a pas eu lieu
      final = `${vrai.length ? `C'est fait. ${vrai.join(' ')}` : ''}${(etapes.programmes || []).length ? ` ${vrai.length ? 'Et je m\'occupe du reste' : 'C\'est noté'} : ${etapes.programmes.join(' ; ')}.` : ''}`.replace(/\s+/g, ' ').trim();
    } else final = sansJeu(String(final || '').replace(/\[\[[^\]]*\]\]/g, '')).replace(/[*`#]/g, '').trim() || "Je n'ai rien eu à faire.";
    c.push({ role: 'user', content: String(text).slice(0, 4000), at: Date.now(), who: dlg.qui || '' });
    c.push({ role: 'assistant', content: final.slice(0, 2000), at: Date.now() });
    if (c.length > 40) S.chat = c.slice(-40);
    save(); CONV.note('Atlas', final); MEMOIRE.tour();
    await say(final);
    dlg.state = 'talk'; dlg.silence = 0;
    return true;
  }

  /* ---------- les protocoles : une scène à ton nom (« protocole soirée jeux »), créée à la voix ---------- */
  const PL = () => (S.protocoles = S.protocoles || []);
  const nomPropre = t => String(t || '').replace(/^\s*(le |la |les |l['’]|un |une )?(protocole|mode|scene|scène)\s+/i, '').replace(/[«»"“”.!?]/g, '').trim().slice(0, 40);
  function enregistre(nom0, etapes0) {
    const nom = nomPropre(nom0); const l = (Array.isArray(etapes0) ? etapes0 : []).map(e => (typeof e === 'string' ? { phrase: e } : e)).filter(e => e && String(e.phrase || '').trim()).slice(0, 12)
      .map(e => ({ phrase: String(e.phrase).trim().slice(0, 160), ...(/^\d{1,2}[:h]\d{2}$/.test(String(e.heure || '')) ? { heure: String(e.heure).replace('h', ':') } : {}), ...(+e.dans_minutes > 0 ? { dans_minutes: Math.min(1440, +e.dans_minutes) } : {}) }));
    if (!nom || !l.length) return null;
    PL().filter(p => N(p.nom) === N(nom)).forEach(p => tomb('protocoles', p));
    S.protocoles = PL().filter(p => N(p.nom) !== N(nom)).concat([{ id: Date.now(), nom, etapes: l, at: Date.now() }]); save();
    return S.protocoles[S.protocoles.length - 1];
  }
  const trouve = n => { const q = N(nomPropre(n)); return PL().find(p => N(p.nom) === q) || PL().find(p => q.length > 3 && (N(p.nom).includes(q) || q.includes(N(p.nom)))); };
  async function lanceProtocole(p) {
    const titre = `PROTOCOLE ${p.nom.toUpperCase()}`;
    const lignes = p.etapes.map(e => ({ t: e.phrase + (e.heure ? ` · à ${e.heure.replace(':', ' h ')}` : e.dans_minutes ? ` · dans ${e.dans_minutes} min` : ''), etat: 'en attente' }));
    const dessine = () => showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:14px 16px;color:#e0f2fe;min-width:min(520px,86vw);text-align:left">
      <div style="font-size:11px;letter-spacing:.24em;color:#7dd3fc">◢ ${esc(titre)} · ACTIVATION</div><div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:9px 0 12px"></div>
      ${lignes.map((l, i) => `<div style="display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:5px 0;font-size:15px"><span style="color:#38bdf8">${String(i + 1).padStart(2, '0')}</span><span>${esc(l.t)}</span><span style="color:${l.etat === 'fait' || l.etat === 'programmé' ? '#6ef0b8' : l.etat === 'en cours' ? '#fbbf24' : l.etat === 'échec' ? '#fca5a5' : '#64748b'};letter-spacing:.12em;font-size:11px">${esc(l.etat.toUpperCase())}</span></div>`).join('')}</div>`, 'graphe-board');
    fx.tone([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.18]]); dessine();
    await say(`Protocole ${p.nom} : activation.`);
    const rep = [];
    for (const [i, e] of p.etapes.entries()) {
      lignes[i].etat = 'en cours'; dessine();
      if (e.heure || e.dans_minutes) {
        const out = await execute('programmer', e, []);
        lignes[i].etat = /^programmé/.test(out) ? 'programmé' : 'échec';
        if (lignes[i].etat === 'programmé') rep.push(out.replace(/^programmé /, '').replace(' : ', ', '));
      } else {
        const out = await execute('commande', e, []);
        lignes[i].etat = /ne répond pas|je ne sais pas|pas fait|erreur|introuvable|je ne trouve pas/i.test(out) ? 'échec' : 'fait';
      }
      dessine(); await wait(250);
    }
    const ko = lignes.filter(l => l.etat === 'échec').length;
    fx.ok();
    return say(`Protocole ${p.nom} : ${ko ? `terminé, mais ${ko} étape${ko > 1 ? 's' : ''} n'${ko > 1 ? 'ont' : 'a'} pas marché` : 'terminé'}.${rep.length ? ` Programmé : ${rep.join(' ; ')}.` : ''}`);
  }
  // sans Mistral : « crée le protocole soirée jeux : mets le salon à 40 %, mets Radio Nova et préviens mon fils »
  function creationSimple(t) {
    const m = String(t).match(/protocole\s+([^:]{2,40}?)\s*(?::|avec|qui fait|pour)\s*(.+)$/i); if (!m) return null;
    const etapes = m[2].split(/\s*(?:,|;|\bpuis\b|\bet\b(?! (?:la|le|les) (?:cuisine|salle)))\s*/i).map(x => x.trim()).filter(x => x.length > 3);
    const p = enregistre(m[1], etapes); if (!p) return null;
    return say(`Protocole ${p.nom} enregistré, avec ${p.etapes.length} étape${p.etapes.length > 1 ? 's' : ''}. Dis « protocole ${p.nom} » pour le lancer.`);
  }

  /* ---------- « Atlas, rembobine » : la mémoire de la maison (tout ce qui s'est passé, sur l'ordinateur) ---------- */
  const PASSE = /\b(rembobine|qui a (allume|eteint|laisse|mis|lance|ouvert|ferme|fait|eteint|touche|programme)|quand est ce que (j ai|tu as|on a|il a|elle a|mon fils a|le petit a)|a quelle heure (j ai|tu as|on a|il a|est ce que|mon fils|le petit)|il s est passe quoi (pendant|quand|hier|ce matin|cette nuit|cet apres midi|ce soir|avant)|qu est ce qui s est passe (pendant|quand|hier|ce matin|cette nuit|cet apres midi|ce soir|a la maison|avant)|depuis quand (la|le|les|est ce que)|la derniere fois (que|qu)|qu est ce que (j ai|on a|mon fils a|le petit a|il a|tu as) fait (hier|ce matin|cet apres midi|aujourd hui|ce soir|cette nuit)|combien de fois (j ai|on a|tu as|il a|mon fils))\b/;
  const fenetre = n => /\b(semaine|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|derniers jours)\b/.test(n) ? 7 : /\bhier|avant hier\b/.test(n) ? 3 : /\b(ce matin|aujourd hui|cette nuit|tout a l heure|ce soir|cet apres midi)\b/.test(n) ? 1 : 3;
  async function rembobine(t, n) {
    face.set('think');
    const fin = typeof BORD !== 'undefined' ? BORD.pensee(t) : () => {};
    let j; try { j = await appel(`/atlas/rembobine?jours=${fenetre(n)}`, null, 12000); } catch (e) { fin(); return say("L'ordinateur de la maison ne répond pas : je n'ai pas accès à la mémoire de la maison."); }
    dansHud(`mémoire de la maison · ${j.n} événements`);
    if (!AI.ready()) { fin(); return say("Pour fouiller la mémoire de la maison, il me faut mon cerveau."); }
    let r = '';
    try {
      r = String(await AI.chat([{ role: 'system', content: `Tu es Atlas, l'assistant de la maison (une IA de film : calme, précise). Voici le journal de la maison, ligne par ligne (jour, heure de Paris, type, ce qui s'est passé). « par atlas · téléphone » veut dire : commandé par la voix ou à l'écran d'Atlas sur le téléphone ; « par cockpit · tablette » : un doigt sur le cockpit de la tablette. « Shadow et son fils » : ce que son fils a fait avec Shadow. Nous sommes ${new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
Réponds à sa question UNIQUEMENT d'après ce journal, en trois phrases courtes au plus, à voix haute : donne le jour et l'heure ; s'il y a beaucoup d'événements, résume (pas d'énumération heure par heure). Si le journal ne contient pas la réponse, dis simplement que tu n'en as pas de trace (n'invente rien, ne devine pas). Pas de symbole, pas de liste.
JOURNAL :
${j.texte || '(vide)'}` }, { role: 'user', content: t }], { maxTokens: 260, temperature: 0.2 }) || '');
    } catch (e) { fin(); return say("Mon cerveau ne répond pas pour fouiller la mémoire de la maison. Réessaie dans un instant."); }
    fin(); face.set('idle');
    return say(r.replace(/\[\[[^\]]*\]\]/g, '').replace(/[*_`#]/g, '').replace(/\s*\n+\s*/g, ' ').trim() || "Je n'en ai pas de trace.");
  }

  /* ---------- l'oracle : il anticipe (ton agenda, la météo, la maison, tes habitudes) et te propose de préparer à ta place ---------- */
  let oracleOffre = null;
  async function oracle() {
    const d = new Date(), h = d.getHours();
    if (S.settings.oracle === false || !pret() || !dlg.started || dlg.busy || voice.endormi || h < 7 || h >= 22 || window.__BANC) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return; // seulement là où il est
    const jour = d.toDateString(); S.oracle = S.oracle && S.oracle.jour === jour ? S.oracle : { jour, n: 0, vus: [], at: 0 };
    if (S.oracle.n >= 4 || Date.now() - S.oracle.at < 40 * 60000) return; // au plus 4 fois par jour, pas plus d'une fois par 40 minutes
    let ev = []; try { ev = (await appel('/maison/agenda?jours=1', null, 8000)).evenements || []; } catch (e) { return; }
    const now = Date.now() / 1000;
    const proche = ev.find(e => !e.journee && e.debut - now >= 15 * 60 && e.debut - now <= 50 * 60 && !S.oracle.vus.includes(`${e.titre}|${e.debut}`) && !/\b(MYM|MNQ|MGC|M6E|Open US|Fen[êe]tre active|Impact|PMI|CPI|NFP|FOMC|Journal performance)\b/i.test(e.titre));
    if (!proche) return;
    S.oracle.vus.push(`${proche.titre}|${proche.debut}`); save();
    let meteo = '';
    try { const v = S.settings.ville; if (v) { const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&hourly=precipitation_probability,temperature_2m&forecast_hours=4&timezone=auto`)).json(); meteo = `Pluie dans les 3 prochaines heures : ${Math.max(...w.hourly.precipitation_probability.slice(0, 3))} % ; température ${Math.round(w.hourly.temperature_2m[1])} °C.`; } } catch (e) { meteo = ''; }
    await VRAI.frais();
    const dans = Math.round((proche.debut - now) / 60);
    const ctx = `Il est ${hhmm()}. Dans ${dans} minutes : « ${proche.titre} »${proche.lieu ? ` (lieu : ${proche.lieu})` : ''}.
${meteo}
État réel de la maison :
${VRAI.texte()}
Ses protocoles : ${(S.protocoles || []).map(p => p.nom).join(', ') || 'aucun'}.
Ce qu'Atlas sait faire (phrases de commande) :
${CATALOGUE}`;
    let j;
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(`${AI.MISTRAL}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${S.settings.mistralKey}` },
        body: JSON.stringify({ model: 'mistral-medium-latest', temperature: 0.3, max_tokens: 400, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: `Tu es Atlas, l'assistant de la maison d'un papa (une IA de film, attentionnée, jamais envahissante). Un événement de son agenda approche. Décide si tu peux lui proposer UNE aide vraiment utile pour s'y préparer (prévenir son fils s'il part, éteindre en bas à l'heure du départ, un rappel pour un objet à prendre s'il pleut, lancer un protocole…), avec les commandes d'Atlas. Si rien n'est vraiment utile, ne propose rien.
Réponds en JSON : {"proposer": true ou false, "question": "ce que tu lui dis : une ou deux phrases courtes qui finissent par une question oui ou non", "actions": [{"phrase": "une commande d'Atlas", "heure": "HH:MM (facultatif)", "dans_minutes": 0}]}. N'invente aucun fait ; pas de symbole dans la question. Ne touche jamais aux chambres, à la Fusée (la veilleuse de son fils) ni à ce qui doit rester allumé ; pour éteindre au départ, dis plutôt « éteins tout » ou nomme les pièces du bas.` }, { role: 'user', content: ctx }] }) });
      clearTimeout(tm); if (!r.ok) return;
      const x = await r.json(); if (x.usage && typeof compteMois === 'function') compteMois('mistral', 'mistral-medium-latest', x.usage.prompt_tokens, x.usage.completion_tokens);
      j = JSON.parse(x.choices[0].message.content);
    } catch (e) { return; }
    if (!j || !j.proposer || !j.question || !Array.isArray(j.actions) || !j.actions.length) return;
    S.oracle.n++; S.oracle.at = Date.now(); save();
    PROACTIF.annonce(`oracle-${proche.debut}`, async () => { oracleOffre = { actions: j.actions.slice(0, 5), at: Date.now() }; dlg.attendReponse = Date.now() + 90000; const q = sansJeu(String(j.question)).replace(/[*`#]/g, '').trim(); return /[?]$/.test(q) ? q : `${q} ?`; }, { expire: Date.now() + 15 * 60000 });
  }
  setInterval(oracle, 5 * 60000); setTimeout(oracle, 90000);
  async function oracleOui() {
    const o = oracleOffre; oracleOffre = null; dlg.attendReponse = 0;
    const etapes = [];
    for (const a of o.actions) await execute(a.heure || a.dans_minutes ? 'programmer' : 'commande', a, etapes);
    const vrai = [...new Set(etapes.resultats || [])].filter(x => !/^fait \(/.test(x));
    return say(`${vrai.length ? `C'est fait. ${vrai.join(' ')}` : ''}${(etapes.programmes || []).length ? ` ${vrai.length ? 'Et' : "C'est noté"} : ${etapes.programmes.join(' ; ')}.` : ''}`.replace(/\s+/g, ' ').trim() || "C'est fait.");
  }

  /* ---------- les commandes programmées : à l'heure, par un Atlas allumé (la tablette d'abord) ---------- */
  const faits = new Set();
  async function veille() {
    if (!dlg.started || voice.endormi || !VOIXMAISON.root() || window.__BANC) return;
    let l; try { l = (await appel('/atlas/planifs', null, 8000)).planifs || []; } catch (e) { return; }
    const role = typeof CONSTELLATION !== 'undefined' ? CONSTELLATION.role : '';
    for (const x of l) {
      if (faits.has(x.id) || x.at > Date.now()) continue;
      if (role !== 'tablette' && Date.now() < x.at + 45000) continue; // la tablette d'abord (elle est toujours allumée) ; sinon, les autres prennent le relais
      let r; try { r = await appel('/atlas/planifs', { prendre: x.id, par: typeof monId !== 'undefined' ? monId : '' }, 8000); } catch (e) { continue; }
      faits.add(x.id);
      if (!r.ok) continue; // un autre Atlas l'a déjà fait
      while (dlg.busy || voice.occupe()) await wait(800);
      dlg.busy = true;
      try { fx.tone([[784, 0.08], [1047, 0.12]]); window.__ordreDuCerveau = true; await handle(x.phrase); } catch (e) { console.warn('programme', e); } finally { window.__ordreDuCerveau = false; dlg.busy = false; }
    }
  }
  setInterval(veille, 20000); setTimeout(veille, 8000);

  async function liste() {
    let l; try { l = (await appel('/atlas/planifs')).planifs || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!l.length) return say("Rien n'est programmé.");
    return say(`J'ai programmé : ${l.slice(0, 6).map(x => { const d = new Date(x.at); return `${d.toDateString() !== new Date().toDateString() ? 'demain ' : ''}à ${hm(d)}, ${x.phrase}`; }).join(' ; ')}.`);
  }
  async function annule() {
    let r; try { r = await appel('/atlas/planifs', { annule: 'tout' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    return say(r.annulees ? `C'est annulé : ${r.annulees} action${r.annulees > 1 ? 's' : ''} programmée${r.annulees > 1 ? 's' : ''}.` : "Il n'y avait rien de programmé.");
  }
  function route(t, n) {
    if (oracleOffre && Date.now() - oracleOffre.at < 5 * 60000) {
      if (/^(oui|ouais|ok|d accord|vas y|carrement|bien sur|fais le|oui merci|volontiers|avec plaisir|go)\b/.test(n)) return oracleOui;
      if (/^(non|non merci|pas la peine|laisse|c est bon|ca ira)\b/.test(n)) return () => { oracleOffre = null; dlg.attendReponse = 0; return say(pick(["D'accord.", 'Très bien, je ne touche à rien.'])); };
    }
    if (/\b(coupe|desactive|arrete) (l oracle|tes propositions|d anticiper)\b/.test(n)) return () => { S.settings.oracle = false; save(); return say("D'accord, je n'anticipe plus. Dis « active l'oracle » pour reprendre."); };
    if (/\b(active|remets|reactive) (l oracle|tes propositions)\b/.test(n)) return () => { S.settings.oracle = true; save(); return say("Oracle activé : je te proposerai de préparer ce qui arrive."); };
    if (PASSE.test(n)) return () => rembobine(t, n);
    if (/\b(quels sont mes|mes|la liste des|tu connais quels) protocoles\b|^mes protocoles$/.test(n)) return () => say(PL().length ? `Tes protocoles : ${PL().map(p => p.nom).join(', ')}. Dis « protocole » et son nom pour en lancer un.` : "Tu n'as pas encore de protocole. Dis par exemple : « crée le protocole soirée jeux : le salon à 40 %, Radio Nova, et préviens mon fils ».");
    const sup = n.match(/\b(supprime|efface|oublie|retire) (le |la )?protocole (.+)$/); if (sup) { const p = trouve(sup[3]); if (p) return () => { S.protocoles = PL().filter(x => x !== p); tomb('protocoles', p); save(); return say(`Protocole ${p.nom} supprimé.`); }; }
    const voir = n.match(/\b(montre|lis|dis moi|c est quoi) (le )?protocole (.+)$/); if (voir) { const p = trouve(voir[3]); if (p) return () => say(`Protocole ${p.nom} : ${p.etapes.map(e => e.phrase + (e.heure ? ` à ${e.heure.replace(':', ' h ')}` : e.dans_minutes ? ` dans ${e.dans_minutes} minutes` : '')).join(' ; ')}.`); }
    if (/\b(cree|creer|enregistre|invente|nouveau|ajoute)\b.*\bprotocole\b/.test(n) && !pret()) return () => creationSimple(t) || say("Dis-le comme ça : « crée le protocole soirée jeux : mets le salon à 40 %, mets Radio Nova, et préviens mon fils ».");
    const go = n.match(/^(?:(?:lance|active|demarre|declenche|enclenche) )?(?:le )?(?:protocole|mode|scene) (.+)$/); if (go && !/\b(cree|creer|enregistre|supprime|efface)\b/.test(n)) { const p = trouve(go[1]); if (p) return () => lanceProtocole(p); }
    if (/\b(qu est ce que tu as|qu as tu|ce que tu as|quels sont les|les) (programme|planifie|prevu)s?\b|^(mes|les) programmes?$/.test(n)) return liste;
    if (/\b(annule|supprime|efface|enleve)\b.*\b(programmes?|programme|planifications?|ce que tu as programme|tout ce qui est programme)\b/.test(n)) return annule;
    return null;
  }
  return { route, lance, agentique, pret, _execute: execute };
})();

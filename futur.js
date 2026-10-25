/* =========================================================
   ATLAS — la maison du futur, au quotidien
   - « mode cinéma » : la télé s'allume, le salon descend à 5 %, l'escalier en veilleuse, le reste d'en bas s'éteint,
     Atlas se tait ; « pause » (salon à 30 %), « reprends », « fin du film » (tout revient comme avant).
   - L'accès vocal : les ordres sensibles (la sirène, éteindre l'ordinateur, couper la surveillance, la dissuasion, sortir du mode absent)
     n'obéissent qu'à la voix de papa ; sinon « Accès refusé », ou son code d'accès (« mon code d'accès est … »).
   - « retiens où je pose mes clés » : une photo de l'endroit (gardée sur l'ordinateur de la maison) ; « où sont mes clés ? »
   - « regarde mon graphique » (l'œil de faucon) : une capture de l'écran, décrite (la structure du prix, jamais un conseil).
   - Le chef : « on fait des crêpes pour 4 » : la recette en grand, étape par étape, à la voix (« suivant », « répète »,
     « précédent », « les ingrédients », « fin de la recette »), avec un minuteur pour les étapes qui en ont un.
   ========================================================= */
'use strict';

const FUTUR = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return /image/.test(r.headers.get('Content-Type') || '') ? r.blob() : r.json();
    } finally { clearTimeout(tm); }
  }
  const regle = (ids, allume, lum, teinte) => appel('/maison/commande', Object.assign({ ids, allume, source: 'routine' }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}), 20000);
  const pc = d => appel('/maison/pc', d, 20000);
  const sfx = q => { try { VISIO.sfx(q); } catch (e) { /* pas de son */ } };
  const pareil = (x, y) => N(x || '').replace(/y/g, 'i') === N(y || '').replace(/y/g, 'i');
  const appareils = async () => ((await appel('/maison/appareils', null, 15000)).appareils || []);
  const panneau = (titre, corps, couleur = '#38bdf8') => `<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid ${couleur}66;border-radius:14px;padding:12px 14px;color:#e0f2fe"><div style="font-size:11px;letter-spacing:.2em;color:${couleur}">◢ ${esc(titre)}</div><div style="height:1px;background:linear-gradient(90deg,transparent,${couleur},transparent);margin:8px 0"></div>${corps}</div>`;

  /* ---------- le mode cinéma ---------- */
  let cine = null; // { avant: [{id, allume, lum, teinte}], salon: [ids], proactif }
  async function cinema(on) {
    if (on) {
      let l; try { l = await appareils(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
      const bas = l.filter(a => a.type === 'lampe' && !/\bchambres?\b|\bsalle de bain\b/.test(N(a.nom)));
      const salon = bas.filter(a => /\bsalon\b/.test(N(a.nom))), esc2 = bas.filter(a => /\bescalier\b/.test(N(a.nom))), autres = bas.filter(a => !salon.includes(a) && !esc2.includes(a));
      const tele = l.filter(a => /\b(tele|television|tv)\b/.test(N(a.nom)));
      cine = { avant: bas.map(a => ({ id: a.id, allume: a.allume, lum: a.lum, teinte: a.teinte })), salon: salon.map(a => a.id), proactif: S.settings.proactif };
      sfx('demarrage');
      if (tele.length) regle(tele.map(a => a.id), true).catch(() => {});
      pc({ action: 'musique', quoi: 'pause' }).catch(() => {});
      for (const v of [40, 20, 5]) { if (salon.length) regle(salon.map(a => a.id), true, v, 0).catch(() => {}); await wait(700); }
      if (esc2.length) regle(esc2.map(a => a.id), true, 8, 0).catch(() => {});
      const allumes = autres.filter(a => a.allume); if (allumes.length) regle(allumes.map(a => a.id), false).catch(() => {});
      showBoard(panneau('MODE CINÉMA', '<div style="font:600 34px system-ui;text-align:center;padding:18px 0">🎬 Bonne séance</div><div style="text-align:center;font-size:12px;color:#93c5fd">« pause » · « reprends » · « fin du film »</div>', '#f59e0b'), 'graphe-board');
      clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 20000);
      await say(pick(['Mode cinéma. Silence dans la salle… Bon film.', 'Les lumières s\'éteignent. La séance commence. Bon film.']));
      S.settings.proactif = false; dlg.discret = true; dlg.state = 'standby'; // il se tait (les alertes urgentes passent toujours)
      return;
    }
    if (!cine) return say("Le mode cinéma n'est pas lancé.");
    const c = cine; cine = null;
    S.settings.proactif = c.proactif; dlg.discret = false;
    for (const a of c.avant) { try { await regle([a.id], a.allume, a.allume ? a.lum : undefined, a.allume ? a.teinte : undefined); } catch (e) { /* tant pis */ } await wait(200); }
    sfx('final');
    return say('Fin de la séance. La lumière revient comme avant. Alors, ce film ?');
  }
  async function cinePause(pause) {
    if (!cine) return;
    if (cine.salon.length) regle(cine.salon, true, pause ? 30 : 5, 0).catch(() => {});
    pc({ action: 'musique', quoi: pause ? 'pause' : 'lecture' }).catch(() => {});
    fx.tone(pause ? [[660, 0.08], [440, 0.12]] : [[440, 0.08], [660, 0.12]]);
  }

  /* ---------- l'accès vocal ---------- */
  // le protocole danger reste ouvert à tous (une urgence ne se refuse pas) ; ce qui pourrait servir à un intrus, ou faire des bêtises, est gardé
  const SENSIBLE = /\bsirenes?\b.*\b(declenche|active|lance|sonner|allume|arrete|coupe|stop|eteins|desactive)\b|\b(declenche|active|lance|fais sonner|allume|arrete|coupe|eteins|desactive)\b.*\bsirenes?\b|\b(eteins|arrete|redemarre|coupe)\b.*\b(l ordi|l ordinateur|le pc)\b|\bdissuasion\b|\bdissuade\b|\b(desactive|coupe|arrete|eteins)\b.*\b(surveillance|sentinelle|cameras?|detection|fantome)\b/;
  const SENSIBLE_ABSENT = /\b(protocole retour|je suis (rentre|de retour|a la maison)|on est (rentres?|de retour)|fin du mode absent|mode presence|me revoila)\b/;
  const papaVoix = () => (typeof VOIX !== 'undefined' ? VOIX.people() : []).find(p => pareil(p.name, S.nom));
  function refusEcran() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:57;display:grid;place-items:center;background:radial-gradient(60% 60% at 50% 50%,rgba(60,6,10,.92),rgba(0,0,0,.95) 75%);font-family:ui-monospace,Menlo,monospace;opacity:0;transition:opacity .4s';
    el.innerHTML = '<div style="text-align:center"><div style="font-size:64px">⛔</div><div style="margin-top:10px;font:600 clamp(24px,5vw,44px) system-ui;color:#fecaca;text-shadow:0 0 14px #ef4444">ACCÈS REFUSÉ</div><div style="margin-top:8px;font-size:12px;letter-spacing:.3em;color:#fca5a5">VOIX NON RECONNUE</div></div>';
    document.body.appendChild(el); requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 3500);
  }
  // renvoie true si l'ordre peut passer ; sinon il refuse (ou demande le code) et renvoie false
  async function autorise(n) {
    const absent = typeof SECURITE !== 'undefined' && SECURITE.absent && SECURITE.absent();
    if (!(SENSIBLE.test(n) || (absent && SENSIBLE_ABSENT.test(n))) || !papaVoix() || S.settings.accesVocal === false) return true; // pas d'empreinte de papa : on ne peut pas vérifier
    if (dlg.qui && pareil(dlg.qui, S.nom)) return true;
    refusEcran(); fx.tone([[220, 0.2], [180, 0.35]]);
    if (!S.codeAcces) { await say("Accès refusé : voix non reconnue. Seul mon inventeur peut donner cet ordre."); return false; }
    const a = await ask('Voix non reconnue. Code d\'accès ?', { wait: 10000 });
    if (a && N(a).includes(S.codeAcces)) { fx.ok(); await say('Code accepté.'); return true; }
    await say('Accès refusé.'); return false;
  }
  async function code(t) {
    if (!(dlg.qui && pareil(dlg.qui, S.nom)) && papaVoix()) { refusEcran(); return say('Accès refusé : seul mon inventeur peut changer le code.'); }
    const m = String(t).match(/code d['’]acc[eè]s (?:est|sera|c['’]est)\s*:?\s*(.{3,40}?)\s*[.!]*$/i);
    if (!m) return say("Dis par exemple : « mon code d'accès est soleil rouge ».");
    S.codeAcces = N(m[1]); save();
    return say("Code d'accès enregistré sur cet appareil. Il servira si je ne reconnais pas ta voix.");
  }

  /* ---------- où sont mes clés ? ---------- */
  const OBJET = /\b(?:mes|ma|mon|les|la|le|l)\s+([a-zà-ÿ' -]{3,30}?)(?:\s+(?:ici|la|là|dessus|dedans|sur|dans|a|à)\b.*)?$/i;
  const objetDe = t => { const m = String(t).replace(/^.*?\b(?:retiens|souviens-toi|rappelle-toi|note|regarde)\b\s*(?:où|ou)\s*(?:je\s+)?(?:pose|range|mets|met|laisse|ai posé|ai mis|ai rangé)\s*/i, '').replace(/^.*?\b(?:où|ou)\s+(?:sont|est|j['’]ai mis|j['’]ai posé|j['’]ai rangé)\s*/i, '').trim().replace(/[?.!]+$/, '').match(OBJET); return m ? m[1].trim().toLowerCase() : ''; };
  async function retiens(t) {
    const nom = objetDe(t); if (!nom) return say("Quel objet ? Dis par exemple : « retiens où je pose mes clés ».");
    if (typeof VISION === 'undefined' || !VISION.supported) return say("Il me faut ma caméra pour ça.");
    let ouvert = VISION.isOn();
    try { if (!ouvert) await VISION.start($('#cam'), { objects: false }); } catch (e) { return say("Ma caméra ne s'ouvre pas."); }
    await say(`Montre-moi l'endroit, je photographie dans trois secondes.`);
    await wait(2200); fx.tone([[1319, 0.05]]); await wait(400); fx.tone([[1319, 0.05]]); await wait(400); fx.tone([[1760, 0.12]]);
    const img = VISION.snapshot(800);
    if (!ouvert && S.settings.arrivee === false) VISION.stop();
    try { const r = await appel('/maison/objets', { nom, image: img, piece: S.settings.piece || '' }, 20000); if (!r.ok) throw new Error('refus'); } catch (e) { return say("Je n'ai pas réussi à garder la photo."); }
    showBoard(panneau(`MÉMOIRE · ${nom.toUpperCase()}`, `<img src="${img}" style="width:100%;border-radius:10px">`), 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 30000);
    return say(`Enregistré : ${nom}${S.settings.piece ? `, ${S.settings.piece.toLowerCase()}` : ''}. Demande-moi « où sont mes ${nom.replace(/^(clé|clef)s?$/, 'clés')} » quand tu les cherches.`);
  }
  async function ouSont(t) {
    const nom = objetDe(t);
    let l; try { l = (await appel('/maison/objets')).objets || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const o = l.slice().reverse().find(x => nom && (x.nom === nom || N(x.nom).includes(N(nom)) || N(nom).includes(N(x.nom)))) || (!nom ? l[l.length - 1] : null);
    if (!o) return say(nom ? `Je n'ai pas de souvenir de ${nom}. La prochaine fois, dis « retiens où je pose ${/s$/.test(nom) ? 'mes' : 'mon'} ${nom} ».` : "Je n'ai aucun objet en mémoire.");
    let url = ''; try { const b = await appel(`/maison/objets/image?id=${o.id}`, null, 15000); if (b instanceof Blob) url = URL.createObjectURL(b); } catch (e) { /* pas de photo */ }
    const quand = new Date(o.at * 1000), jour = quand.toDateString() === new Date().toDateString() ? "aujourd'hui" : quand.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
    showBoard(panneau(`MÉMOIRE · ${o.nom.toUpperCase()}`, `${url ? `<img src="${url}" style="width:100%;border-radius:10px">` : ''}<div id="obj-d" style="margin-top:6px;font-size:13px;color:#93c5fd">${esc(jour)} · ${esc(hhmm(quand))}${o.piece ? ` · ${esc(o.piece)}` : ''}</div>`), 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 60000);
    await say(`Voilà où tu as posé ${o.nom}, ${jour} à ${hhmm(quand)}${o.piece ? `, ${o.piece.toLowerCase()}` : ''}.`);
    // la vision de la maison décrit l'endroit (elle prend son temps : il le dit quand c'est prêt)
    appel('/maison/objets/decris', { id: o.id, nom: o.nom }, 160000).then(r => { if (r && r.texte) { const d = document.getElementById('obj-d'); if (d) d.textContent += ` — ${r.texte}`; PROACTIF.annonce(`objet-${o.id}-${Date.now()}`, r.texte, { urgent: true, expire: Date.now() + 120000 }); } }).catch(() => {});
  }

  /* ---------- l'œil de faucon ---------- */
  async function faucon(t) {
    if (!S.settings.key && !(typeof SECURITE !== 'undefined' && SECURITE.visionMaison())) return say("Pour lire ton graphique, il me faut la vision : Groq ou le modèle de la maison.");
    NOYAU.etiquette('ŒIL DE FAUCON'); face.set('think'); sfx('scan');
    let blob; try { blob = await appel('/maison/pc/capture', null, 20000); } catch (e) { blob = null; }
    if (!(blob instanceof Blob)) { face.set('idle'); return say("Je n'arrive pas à voir l'écran de l'ordinateur."); }
    const img = await new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 1600 / im.width); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); res(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = () => res(''); im.src = URL.createObjectURL(blob); });
    if (!img) { face.set('idle'); return say("La capture est illisible."); }
    showBoard(panneau('ŒIL DE FAUCON · ANALYSE', `<img src="${img}" style="width:100%;border-radius:10px;filter:saturate(1.1)"><div id="faucon-t" style="margin-top:8px;font-size:13px;color:#93c5fd">Analyse en cours…</div>`, '#22d3ee'), 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 3 * 60000);
    const q = `Tu regardes une capture d'écran d'un graphique de trading (TradingView). Décris en français, en 3 à 5 phrases courtes, UNIQUEMENT ce qui est visible : l'instrument et l'unité de temps si elles sont écrites, la tendance récente, les zones où le prix a réagi (supports, résistances, range), les grandes mèches, le volume s'il est affiché, et où se trouve le prix maintenant par rapport à ces zones. Donne les niveaux de prix lisibles sur l'axe. Ne donne AUCUN conseil (ni achat, ni vente, ni prévision). ${String(t).length > 30 ? `Question de papa : « ${t} ».` : ''}`;
    let rep = '';
    try { rep = S.settings.key ? await AI.see(img, q) : ''; } catch (e) { rep = ''; }
    if (!rep && typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { try { rep = (await appel('/maison/vision', { image: img, question: q }, 160000)).texte || ''; } catch (e) { rep = ''; } }
    face.set('idle');
    const el = document.getElementById('faucon-t'); if (el) el.textContent = rep || 'Analyse impossible.';
    return say(rep ? `${rep} C'est une lecture, pas un conseil.` : "Je n'ai pas réussi à lire le graphique.");
  }

  /* ---------- le chef holographique ---------- */
  let minuteursChef = [];
  async function chef(t, n) {
    if (!AI.ready()) return say("Pour la recette, il me faut mon cerveau en ligne.");
    const pers = +((n.match(/\bpour (\d{1,2})\b/) || [])[1] || 0) || ({ deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, huit: 8 }[(n.match(/\bpour (deux|trois|quatre|cinq|six|huit)\b/) || [])[1]] || 4);
    const plat = String(t).replace(/^.*?\b(?:on fait|on va faire|je fais|je vais faire|recette (?:de|des|du|d['’])?|prépare|cuisine|apprends-moi à faire|comment (?:on )?fai[st]-?(?:on)?)\s*/i, '').replace(/\s*pour\s+\S+(\s+personnes?)?\s*[.!?]*$/i, '').replace(/[.!?]+$/, '').trim();
    if (plat.length < 3) return say('Quel plat ? Dis par exemple : « on fait des crêpes pour 4 ».');
    face.set('think'); NOYAU.etiquette('CHEF');
    let r = null;
    try {
      const raw = String(await AI.chat([{ role: 'system', content: 'Tu es un chef cuisinier pour une famille sportive qui mange le moins transformé possible : uniquement des ingrédients bruts (légumes, fruits, légumineuses, céréales complètes, œufs, viandes et poissons frais, laitages nature, huile d\'olive, épices), aucun produit industriel (pas de cube de bouillon, pas de sauce toute prête, pas de pâte industrielle : on la fait). Donne une recette simple, fiable, savoureuse, en français. Réponds UNIQUEMENT en JSON : {"titre":"…","portions":4,"ingredients":["250 g de farine",…],"etapes":[{"texte":"phrase courte et claire","minutes":0}]} — 5 à 10 étapes ; "minutes" seulement si l\'étape a une durée à surveiller (cuisson, repos), sinon 0.' }, { role: 'user', content: `${plat}, pour ${pers} personnes.` }], { maxTokens: 900, temperature: 0.4 }) || '');
      r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    } catch (e) { r = null; }
    face.set('idle');
    if (!r || !Array.isArray(r.etapes) || !r.etapes.length) return say("Je n'ai pas trouvé de recette fiable. Redemande-moi autrement.");
    const ing = (r.ingredients || []).slice(0, 18), et = r.etapes.slice(0, 14);
    const ecran = (i, mode) => {
      const e = et[i];
      showBoard(panneau(`${(r.titre || plat).toUpperCase()} · ${pers} PERS.`, mode === 'ing'
        ? `<div style="font-size:clamp(16px,2.4vw,22px);line-height:1.6">${ing.map(x => `• ${esc(x)}`).join('<br>')}</div>`
        : `<div style="font-size:12px;color:#93c5fd;letter-spacing:.2em">ÉTAPE ${i + 1} / ${et.length}${e.minutes ? ` · ⏱ ${e.minutes} MIN` : ''}</div><div style="margin-top:10px;font:600 clamp(22px,3.6vw,40px)/1.3 system-ui;color:#f0f9ff">${esc(e.texte)}</div><div style="margin-top:14px;height:6px;border-radius:3px;background:#0c4a6e"><div style="height:6px;border-radius:3px;width:${Math.round((i + 1) / et.length * 100)}%;background:linear-gradient(90deg,#22d3ee,#a78bfa)"></div></div><div style="margin-top:10px;font-size:12px;color:#64748b">« suivant » · « répète » · « précédent » · « les ingrédients » · « fin de la recette »</div>`, '#fbbf24'), 'graphe-board');
      clearTimeout(effaceT);
    };
    ecran(0, 'ing');
    await say(`${r.titre || plat}, pour ${pers}. Il te faut : ${ing.join(', ')}. Dis « on commence » quand tu es prêt.`);
    let i = -1, silence = 0;
    for (;;) {
      const brut = (await hear({ maxWait: 90000 })) || '', a = N(brut);
      if (!a) { if (++silence > 12) break; continue; }
      silence = 0;
      if (/\b(fin de la recette|on arrete|arrete la recette|j ai fini|c est fini|termine|stop)\b/.test(a)) break;
      if (/\b(ingredients?|il faut quoi|qu est ce qu il faut)\b/.test(a)) { ecran(Math.max(0, i), 'ing'); await say(`Les ingrédients : ${ing.join(', ')}.`); continue; }
      if (/\b(repete|redis|j ai pas compris|pardon|quoi)\b/.test(a) && i >= 0) { await say(et[i].texte); continue; }
      if (/\b(precedent|precedente|retour|avant)\b/.test(a)) i = Math.max(0, i - 1);
      else if (/\b(suivant|suivante|apres|ensuite|on commence|c est parti|go|vas y|c est fait|ok|fait|continue)\b/.test(a)) i++;
      else {
        // en pleine recette : un minuteur, une conversion, un calcul (les outils) ; une question de cuisine (le chef répond, puis on reprend)
        const outil = typeof OUTILS !== 'undefined' && /\b(minuteur|chrono|combien (de|font|fait)|convertis|en grammes|en cuillere|en ml|en litre|fois)\b/.test(a) && OUTILS.route(brut, a);
        if (outil) { await outil(); continue; }
        if (a.split(' ').length >= 3 && (/\?/.test(brut) || /\b(combien|comment|par quoi|remplacer|remplace|je peux|on peut|c est normal|pourquoi|quelle (temperature|cuisson|taille)|a quelle|est ce que|ca se|ca va|trop|pas assez|il faut|quoi faire)\b/.test(a))) {
          face.set('think');
          let rep = ''; try { rep = String(await AI.chat([{ role: 'system', content: `Tu es un chef qui aide en direct, pendant la recette « ${r.titre || plat} » (ingrédients : ${ing.join(', ')}). L'étape en cours : ${i >= 0 ? et[i].texte : 'pas encore commencé'}. Réponds en une ou deux phrases courtes, à l'oral, concrètes. Ingrédients bruts seulement si tu proposes un remplacement. Pas d'émojis.` }, { role: 'user', content: brut }], { maxTokens: 160, temperature: 0.4 })); } catch (e) { rep = ''; }
          face.set('idle');
          await say(rep ? `${rep.replace(/[*#_]/g, '').trim()} Dis « suivant » quand tu veux.` : "Je n'ai pas de réponse sûre. Dis « suivant » pour continuer.");
          continue;
        }
        await say('En cuisine : dis « suivant », « répète », « précédent », « les ingrédients », pose-moi une question, ou « fin de la recette ».'); continue;
      }
      if (i >= et.length) { await say('Et voilà, c\'est prêt ! Bon appétit !'); sfx('final'); if (typeof CUISINE !== 'undefined') { try { await CUISINE.apresRecette(r.titre || plat, ing); } catch (e) { /* rien */ } } break; }
      ecran(i);
      const e = et[i];
      await say(`Étape ${i + 1}. ${e.texte}`);
      if (e.minutes > 0 && e.minutes <= 240) {
        const fin = Date.now() + e.minutes * 60000, txt = e.texte;
        const tm = setTimeout(() => PROACTIF.annonce(`chef-${fin}`, async () => { fx.tone([[1047, 0.15], [1319, 0.15], [1568, 0.3]]); return `Minuteur de cuisine : ${e.minutes} minute${e.minutes > 1 ? 's' : ''} écoulée${e.minutes > 1 ? 's' : ''}. ${txt.slice(0, 80)}`; }, { urgent: true, expire: fin + 10 * 60000 }), e.minutes * 60000);
        minuteursChef.push(tm);
        await say(`Je lance un minuteur de ${e.minutes} minute${e.minutes > 1 ? 's' : ''}.`);
      }
    }
    setTimeout(cacheEcran, 20000);
    return say(i >= et.length ? '' : 'Recette fermée. Les minuteurs lancés continuent.');
  }

  /* ---------- les missions galactiques de son fils (Shadow les valide) ---------- */
  const enfant = () => (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
  async function missions(t, n) {
    const p = enfant();
    let r;
    try {
      if (/\b(ajoute|nouvelle|cree)\b.*\bmission\b/.test(n)) {
        const nom = String(t).replace(/^.*?\bmission\b\s*(?:pour\s+\S+\s*)?(?:[:,-]\s*)?/i, '').replace(/\s*[,(]?\s*\d+\s*points?\)?\s*[.!]*$/i, '').replace(/[.!]+$/, '').trim();
        if (nom.length < 3) return say('Quelle mission ? Dis par exemple : « ajoute une mission pour mon fils : nourrir le chat ».');
        r = await appel('/maison/missions', { ajoute: { nom, points: +((n.match(/\b(\d{1,2}) points?\b/) || [])[1] || 15) } });
        return say(`Mission ajoutée pour ${p} : ${nom}. Shadow la lui proposera.`);
      }
      if (/\b(retire|supprime|enleve)\b.*\bmission\b/.test(n)) {
        r = await appel('/maison/missions');
        const x = r.missions.find(m => N(t).includes(N(m.nom)) || N(m.nom).split(' ').filter(w => w.length > 3).some(w => N(t).includes(w)));
        if (!x) return say(`Je ne trouve pas cette mission. Ses missions : ${r.missions.map(m => m.nom).join(', ')}.`);
        await appel('/maison/missions', { retire: x.id });
        return say(`Mission retirée : ${x.nom}.`);
      }
      if (/\bmedaille\b/.test(n)) {
        const pour = (String(t).match(/\bpour\s+(.{3,60}?)\s*[.!]*$/i) || [])[1] || '';
        r = await appel('/maison/missions', { medaille: pour ? `pour ${pour}` : 'Bravo champion' });
        sfx('final');
        return say(`Médaille envoyée${pour ? ` pour ${pour}` : ''}. Shadow va faire la cérémonie à ${p}. Plus 25 points.`);
      }
      r = await appel('/maison/missions');
    } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const faites = r.missions.filter(m => r.faites.includes(m.id)), reste = r.missions.filter(m => !r.faites.includes(m.id));
    try { SCIFI.hud(`Missions · ${p}`, [['Grade', `${r.grade} · ${r.points} pts`, 'ok'], ...r.missions.map(m => [m.nom, r.faites.includes(m.id) ? 'accomplie' : `+${m.points}`, r.faites.includes(m.id) ? 'ok' : 'attente']), ['Cette semaine', `${r.semaine} missions`, 'ok']]); } catch (e) { /* pas d'écran */ }
    return say(`${p} est ${r.grade}, avec ${r.points} points. Aujourd'hui : ${faites.length ? `${faites.length} mission${faites.length > 1 ? 's' : ''} accomplie${faites.length > 1 ? 's' : ''}` : 'aucune mission accomplie pour l\'instant'}${reste.length ? `, il reste ${reste.map(m => m.nom).join(', ')}` : ''}. ${r.semaine} missions cette semaine.`);
  }
  async function depart(t, n) {
    const m = n.match(/\b(\d{1,2}) h(?:eures?)? ?(\d{2})?\b/);
    if (!m) return say("À quelle heure ? Dis par exemple : « le départ pour l'école est à 8 h 15 ».");
    const h = `${m[1].padStart(2, '0')}:${m[2] || '00'}`;
    try { await appel('/maison/reveils', { ecole_depart: h }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    return say(`Noté : départ pour l'école à ${m[1]} h ${m[2] || ''}. Les matins d'école, Shadow fera le compte à rebours.`);
  }

  /* ---------- la voix de la sentinelle : dissuader un intrus ---------- */
  // sur le téléphone : le bouton « Dissuader » (ou « Atlas, dissuasion ») demande à la maison ; la tablette (avec la sono) parle
  async function dissuade() {
    try { const r = await appel('/maison/dissuasion', {}, 20000); return say(`Dissuasion lancée : ${r.lumieres} lumières allumées, et la voix de la maison prévient l'intrus.`); }
    catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
  }
  let dissuasionAt = 0;
  async function voixSentinelle() {
    if (Date.now() - dissuasionAt < 60000) return; dissuasionAt = Date.now();
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:70;display:grid;place-items:center;font-family:ui-monospace,monospace;background:#300';
    el.innerHTML = '<div style="text-align:center;color:#fee2e2"><div style="font:800 clamp(30px,8vw,80px) system-ui;text-shadow:0 0 30px #ef4444">ZONE SOUS SURVEILLANCE</div><div style="margin-top:12px;font-size:clamp(14px,2.5vw,22px);letter-spacing:.3em">VOUS ÊTES FILMÉS · IMAGES ENREGISTRÉES</div></div>';
    document.body.appendChild(el);
    let k = 0; const clig = setInterval(() => { el.style.background = k++ % 2 ? '#300' : '#b91c1c'; }, 400);
    try {
      try { const c = fx.audio(), t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; g.gain.value = 0.25; o.connect(g); g.connect(c.destination); for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(650, t0 + i * 0.5); o.frequency.linearRampToValueAtTime(1050, t0 + i * 0.5 + 0.45); } o.start(t0); o.stop(t0 + 3); } catch (e) { /* pas de son */ }
      await wait(3100);
      for (let i = 0; i < 2; i++) { await say('Attention. Vous êtes sur une propriété privée sous surveillance. Vous êtes filmés, les images sont enregistrées et transmises. La police est prévenue. Quittez les lieux immédiatement.'); await wait(1200); }
    } finally { clearInterval(clig); setTimeout(() => el.remove(), 20000); el.onclick = () => el.remove(); }
  }
  // le téléphone a été ouvert par le bouton « Dissuader » de la notification
  try {
    if (/[?&]dissuader=/.test(location.search)) { history.replaceState(null, '', location.pathname); setTimeout(() => dissuade(), 2500); }
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', ev => { if (ev.data && ev.data.dissuader) dissuade(); });
  } catch (e) { /* rien */ }

  function route(t, n) {
    if (cine) {
      if (/^(pause|mets (sur )?pause|on fait (une )?pause|stop pause)$/.test(n)) return () => cinePause(true);
      if (/^(reprends|reprise|lecture|play|on reprend|relance)$/.test(n)) return () => cinePause(false);
    }
    if (/\b(fin du film|fin de la seance|le film est fini|sors du mode cinema|arrete le mode cinema|fin du mode cinema)\b/.test(n)) return () => cinema(false);
    if (/\b(mode cinema|lance le cinema|on regarde un film|seance de cinema|ambiance cinema)\b/.test(n)) return () => cinema(true);
    if (/\b(missions?)\b/.test(n) && /\b(mon fils|du petit|de mon fils|pour mon fils|le petit|galactiques?)\b/.test(n) || /\bmedaille\b.*\b(mon fils|au petit|a mon fils)\b|\b(donne|decerne|envoie)\b.*\bmedaille\b/.test(n)) return () => missions(t, n);
    if (/\b(depart|on part|il part)\b.*\b(ecole)\b.*\b\d{1,2} h/.test(n)) return () => depart(t, n);
    if (/\b(dissuasion|dissuade|fais fuir|fais peur a l intrus|protocole dissuasion)\b/.test(n)) return dissuade;
    if (/\b(protocole )?fantome\b/.test(n)) return async () => {
      const on = /\b(active|remets|reactive|lance|allume)\b/.test(n) ? true : /\b(desactive|coupe|arrete|stop|eteins)\b/.test(n) ? false : null;
      let r; try { r = await appel('/maison/reveils', on == null ? undefined : { fantome: on }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
      return say(r.fantome ? 'Protocole fantôme actif : quand tu es absent, le soir, la maison fera comme si tu étais là. Les lumières suivent tes habitudes, jamais à la même minute, et parfois la radio.' : 'Protocole fantôme désactivé.');
    };
    if (/\bcode d acces\b/.test(n) && /\b(est|sera|c est)\b/.test(n)) return () => code(t);
    if (/\b(retiens|souviens toi|rappelle toi|note|memorise)\b.*\b(ou|endroit)\b.*\b(je pose|je range|je mets|je met|je laisse|j ai pose|j ai mis|j ai range)\b/.test(n)) return () => retiens(t);
    if (/\bou (sont|est|j ai mis|j ai pose|j ai range) (mes|ma|mon|les|la|le|l)\b/.test(n) && !/\b(shadow|camera|alarme|fils|le petit|il)\b/.test(n)) return () => ouSont(t);
    if (/\b(regarde|analyse|lis|decris|qu est ce que tu vois sur|que penses tu de)\b.*\b(mon |le |ce )?(graphique|chart|ecran de trading|tradingview|bougies)\b|\boeil de faucon\b/.test(n)) return () => faucon(t);
    if (/\b(on fait|on va faire|je fais|je vais faire|recette (de|des|du|d)|apprends moi a faire|comment (on )?fai(t|s) (on )?(des|du|de la|un|une))\b/.test(n) && /\b(crepes?|gateau|gaufres?|pates?|soupe|tarte|cookies?|omelette|pizza|quiche|risotto|salade|poulet|boeuf|poisson|riz|cake|muffins?|brownies?|sauce|puree|gratin|lasagnes?|burger|recette|dessert|diner|dejeuner|petit dej|pain|clafoutis|mousse|tiramisu|couscous|curry|tajine|ratatouille|frites|legumes|blanquette|bourguignon|pancakes?)\b/.test(n)) return () => chef(t, n);
    return null;
  }
  return { route, autorise, voixSentinelle, cinemaActif: () => !!cine };
})();

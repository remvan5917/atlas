/* =========================================================
   ATLAS — la maison, et le lien avec Shadow
   - Les prises et lampes (Tuya / Smart Life) : l'ordinateur de la maison les pilote en direct
     (/maison/appareils, /maison/commande) ; les clés restent sur l'ordinateur.
     « Allume la lampe du salon », « éteins tout », « qu'est-ce qui est allumé ? »,
     « enregistre la scène film » (l'état de la maison en ce moment), puis « mode film ».
   - Les ampoules réglables : « mets le salon à 30 % », « baisse la lumière », « lumière chaude »,
     et les ambiances (« ambiance tamisée », « mode cinéma », « lumière de lecture », « veilleuse »).
   - Le messager : « dis à mon fils que je rentre à 19 h » → Shadow le lui dit dès qu'il est là ;
     sa réponse (« Shadow, dis à papa que… ») arrive ici (/maison/messages).
   - Ce que Shadow a appris aujourd'hui, et l'effacer à la voix : c'est le seul cas où Atlas écrit
     dans la mémoire de Shadow, et seulement pour oublier (une « pierre tombale » qui voyage
     vers tous les appareils de Shadow).
   ========================================================= */
'use strict';

const MAISON = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 9000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return await r.json();
    } finally { clearTimeout(tm); }
  }
  const enfant = () => LIEN.prenom() || 'ton fils';

  /* =================== les appareils =================== */
  let appareils = [], vusAt = 0, pret = false;
  async function liste(frais) {
    if (!frais && Date.now() - vusAt < 20000) return appareils;
    const j = await appel('/maison/appareils', null, 15000);
    appareils = j.appareils || []; pret = !!j.pret; vusAt = Date.now();
    return appareils;
  }
  setTimeout(() => { if (root()) liste().catch(() => {}); }, 6000);
  const VIDES = new Set(['la', 'le', 'les', 'l', 'de', 'du', 'des', 'd', 'mon', 'ma', 'mes', 'prise', 'lampe', 'lumiere', 'lumieres', 'appareil', 'dans', 'en', 'a', 'au', 'et']);
  const mots = t => N(t).split(' ').filter(w => w.length > 1 && !VIDES.has(w));
  // une prise peut alimenter n'importe quoi : ce qui doit rester allumé n'est jamais coupé par « tout »
  // (le congélateur, la box, l'ordinateur de la maison — sans lui, plus de maison du tout), et ce qui chauffe
  // n'est jamais allumé par « tout » ; on ne les pilote que si on les nomme
  const PROTEGE = /\b(frigo|refrigerateur|congelateur|cave a vin|box|routeur|modem|wifi|repeteur|pc|ordinateur|ordi|serveur|nas|aquarium|pompe|chaudiere|ballon|cumulus|alarme|camera|cameras|freebox|livebox|bbox|onduleur|imprimante 3d|station de trading|trading|poste de travail|bureau pc|ecran pc|ecrans)\b/;
  const CHAUD = /\b(radiateur|chauffage|chauffe|chauffant|chauffante|bouilloire|fer|four|plaque|grille pain|friteuse|seche|cafetiere|machine|perceuse|outil|outils|soudure|fer a souder|plancha|appareil a raclette|couverture chauffante|bain d huile)\b/;
  const protege = a => PROTEGE.test(N(a.nom)) || (S.settings.proteges || []).includes(a.id);
  const chaud = a => CHAUD.test(N(a.nom));
  const lumineux = a => a.type === 'lampe' || /\b(lumi\w*|lamp\w*|led|leds|veilleuse|guirlande|lampadaire|spot|spots|applique|suspension|plafonnier)\b/.test(N(a.nom));
  // les appareils dont parle la phrase : par leur nom (« salon », « télé du salon »), « les lumières », ou tout
  function trouve(cible, allume) {
    const c = N(cible);
    if (/\b(tout|toutes les lumieres|toute la maison|tous les appareils|partout)\b/.test(c)) return (/lumieres?/.test(c) ? appareils.filter(lumineux) : appareils.slice()).filter(a => (allume ? !chaud(a) : !protege(a)));
    const m = mots(c);
    const notes = appareils.map(a => { const n = mots(a.nom); const k = m.filter(w => n.some(x => x === w || (w.length > 3 && x.startsWith(w.slice(0, -1))))).length; return { a, k, tout: k && k === n.length } }).filter(o => o.k);
    if (!notes.length) return /\b(lumieres?|lampes?)\b/.test(c) && (/\b(les|toutes)\b/.test(c) || appareils.filter(lumineux).length === 1) ? appareils.filter(a => lumineux(a) && !protege(a)) : [];
    const best = Math.max(...notes.map(o => o.k));
    return notes.filter(o => o.k === best).map(o => o.a);
  }
  const lesNoms = l => (l.length === 1 ? l[0].nom : `${l.slice(0, -1).map(a => a.nom).join(', ')} et ${l[l.length - 1].nom}`);
  async function pilote(cible, allume) {
    try { await liste(!pret || !appareils.length); } catch (e) { return say("L'ordinateur de la maison ne répond pas : je ne peux pas piloter les appareils."); }
    if (!pret || !appareils.length) return say("Je n'ai encore aucun appareil de la maison. Branche tes prises, ajoute-les dans Smart Life, puis relance l'assistant de connexion sur l'ordinateur : je les trouverai toutes.");
    const l = trouve(cible, allume), tout = /\b(tout|toute la maison|tous les appareils|partout)\b/.test(N(cible));
    const gardes = tout ? appareils.filter(a => !l.includes(a) && (allume ? chaud(a) && a.allume === false : protege(a) && a.allume !== false)) : [];
    // couper par son nom ce qui doit rester allumé : on confirme d'abord
    const sensibles = !tout && !allume ? l.filter(protege) : [];
    if (sensibles.length && !(await askYesNo(`${lesNoms(sensibles)} doit normalement rester allumé. Je coupe quand même ?`))) return say("D'accord, je n'y touche pas.");
    if (!l.length) return say(`Je ne trouve pas « ${cible} ». Tes appareils : ${lesNoms(appareils)}.`);
    face.set('think');
    let r;
    try { r = await appel('/maison/commande', { ids: l.map(a => a.id), allume }, 20000); } catch (e) { face.set('oops'); return say("La commande n'est pas passée : l'ordinateur ne répond pas."); }
    face.set('idle'); vusAt = 0;
    const nomDe = x => Object.assign({}, x, { nom: (appareils.find(a => a.id === x.id) || x).nom });
    const ok = (r.resultats || []).filter(x => x.ok).map(nomDe), ko = (r.resultats || []).filter(x => !x.ok).map(nomDe);
    if (!ok.length) return say(`${lesNoms(l)} ne répond pas. ${l.length > 1 ? 'Ils sont' : 'Il est'} peut-être débranché${l.length > 1 ? 's' : ''}.`);
    fx.tone(allume ? [[660, 0.05], [990, 0.07]] : [[990, 0.05], [660, 0.07]]);
    const sauf = gardes.length ? ` Sauf ${lesNoms(gardes)} : je n'y touche que si tu me le demandes par son nom.` : '';
    return say(`${tout && ok.length > 1 ? (allume ? 'Tout est allumé' : 'Tout est éteint') : `${lesNoms(ok)} : ${allume ? 'allumé' : 'éteint'}${ok.length > 1 ? 's' : ''}`}.${sauf}${ko.length ? ` ${lesNoms(ko)} ne répond pas.` : ''}`);
  }
  async function etat(cible) {
    try { await liste(true); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!pret || !appareils.length) return say("Je n'ai encore aucun appareil de la maison.");
    const l = cible ? trouve(cible, false) : appareils;
    if (cible && l.length) return say(l.map(a => `${a.nom} : ${a.allume == null ? 'injoignable' : a.allume ? 'allumé' : 'éteint'}`).join('. ') + '.');
    const on = appareils.filter(a => a.allume), hors = appareils.filter(a => a.allume == null);
    return say(`${on.length ? `Allumé${on.length > 1 ? 's' : ''} : ${lesNoms(on)}.` : 'Tout est éteint.'}${hors.length ? ` Injoignable${hors.length > 1 ? 's' : ''} : ${lesNoms(hors)}.` : ''}`);
  }
  /* =================== l'intensité, la teinte et les ambiances (les ampoules réglables) =================== */
  // lum : 1 à 100 % ; teinte : 0 = blanc chaud (jaune, le soir), 100 = blanc froid (bleuté, pour travailler)
  const reglable = a => a.lum != null || a.teinte != null;
  const AMBIANCES = [
    { re: /\b(tamise|tamisee|tamisees|tamiser|tamisez)\b/, nom: 'tamisée', lum: 25, teinte: 0 },
    { re: /\b(cosy|cocooning|douce|doux|chaleureuse|chaleureux|soiree|romantique|detente|relax|zen|calme|apero)\b/, nom: 'douce', lum: 45, teinte: 0 },
    { re: /\b(cinema|film|films|serie|netflix)\b/, nom: 'cinéma', lum: 8, teinte: 0 },
    { re: /\b(lecture|lire|travail|travailler|concentration|devoirs)\b/, nom: 'lecture', lum: 100, teinte: 65 },
    { re: /\b(nuit|veilleuse|dodo)\b/, nom: 'nuit', lum: 2, teinte: 0 },
    { re: /\b(reveil|matin|energie|dynamique|tonique)\b/, nom: 'réveil', lum: 85, teinte: 90 },
    { re: /\b(pleine lumiere|a fond|au maximum|au max|plein pot|grand jour)\b/, nom: 'pleine lumière', lum: 100, teinte: 50 },
  ];
  const COULEUR = /\b(bleu|bleue|rouge|vert|verte|violet|violette|rose|jaune|orange|turquoise|multicolore|couleur|couleurs|arc en ciel|disco)\b/;
  // ce que la phrase veut : une ambiance, un pourcentage, plus ou moins fort, plus chaud ou plus froid
  function lecture(t, n) {
    const o = {};
    const amb = /\b(ambiance|mode|lumiere|lumieres|eclairage|lampes?|mets|met|fais|passe)\b/.test(n) || /\btamis/.test(n) ? AMBIANCES.find(x => x.re.test(n)) : null;
    if (amb) Object.assign(o, { lum: amb.lum, teinte: amb.teinte, amb: amb.nom });
    const pc = String(t).match(/(\d{1,3})\s*(?:%|pour\s?cents?|pourcent)/i) || n.match(/\b(?:mets|met|regle|passe|baisse|monte)\b.*\ba (\d{1,3})\b/);
    if (pc) o.lum = Math.max(1, Math.min(100, +pc[1]));
    else if (/\ba (la )?moitie\b/.test(n)) o.lum = 50;
    else if (/\b(au minimum|au plus bas|tout doucement)\b/.test(n)) o.lum = 1;
    else if (!amb && /\b(au maximum|au max|a fond|plein pot)\b/.test(n)) o.lum = 100;
    if (o.lum == null && /\b(baisse|diminue|reduis|attenue|moins fort|moins forte|moins lumineux|moins lumineuse|moins de lumiere|trop fort|trop forte|trop lumineux|eblouit)\b/.test(n)) o.delta = /\b(un peu|legerement|un poil|un chouia)\b/.test(n) ? -15 : -30;
    if (o.lum == null && /\b(augmente|remonte|monte|plus fort|plus forte|plus lumineux|plus lumineuse|plus de lumiere|pas assez|trop sombre|on voit rien|on y voit rien)\b/.test(n)) o.delta = /\b(un peu|legerement|un poil|un chouia)\b/.test(n) ? 15 : 30;
    if (!amb) {
      if (/\b(plus chaud|plus chaude|plus jaune|moins froid|moins froide|moins blanc|moins bleu)\b/.test(n)) o.dTeinte = -35;
      else if (/\b(plus froid|plus froide|plus blanc|plus blanche|moins chaud|moins chaude|moins jaune)\b/.test(n)) o.dTeinte = 35;
      else if (/\b(blanc |lumiere |en |couleur )?(chaud|chaude|chaleureuse|jaune)\b/.test(n) && /\b(blanc|lumiere|eclairage|mets|met|passe|en)\b/.test(n)) o.teinte = 0;
      else if (/\b(blanc |lumiere |en )?(froid|froide|bleute|bleutee)\b/.test(n) && /\b(blanc|lumiere|eclairage|mets|met|passe|en)\b/.test(n)) o.teinte = 100;
      else if (/\b(neutre|naturel|naturelle|blanc normal)\b/.test(n)) o.teinte = 50;
    }
    return Object.keys(o).length ? o : null;
  }
  async function regle(t, n, o) {
    try { await liste(true); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const lampes = appareils.filter(a => reglable(a) && a.allume != null);
    if (!lampes.length) return say("Je n'ai pas d'ampoule réglable joignable en ce moment.");
    // lesquelles : celles qu'on nomme ; sinon celles qui sont allumées ; sinon on demande
    let l = trouve(t, true).filter(reglable);
    const pre = LIEN.prenom() ? N(LIEN.prenom()) : '';
    if (l.length > 1 && !(pre && n.split(' ').includes(pre))) { const moi = l.filter(a => /\bpapa\b/.test(N(a.nom))); if (moi.length) l = moi; } // « la chambre », « ma chambre » : celle de papa
    if (/\b(toute la maison|partout|toutes les lumieres|tout)\b/.test(n)) l = lampes;
    if (!l.length) l = lampes.filter(a => a.allume);
    if (!l.length) {
      const p = await ask(o.amb ? `Dans quelle pièce, l'ambiance ${o.amb} ?` : 'Quelle lumière ?');
      l = p ? trouve(p, true).filter(reglable) : [];
      if (!l.length) return say(`Je ne trouve pas cette lumière. J'ai : ${lesNoms(lampes)}.`);
    }
    const cible = a => {
      const lum = o.lum != null ? o.lum : o.delta ? Math.max(2, Math.min(100, (a.allume ? a.lum || 100 : 50) + o.delta)) : undefined;
      const teinte = o.teinte != null ? o.teinte : o.dTeinte ? Math.max(0, Math.min(100, (a.teinte == null ? 50 : a.teinte) + o.dTeinte)) : undefined;
      return { lum: lum == null && teinte != null ? (a.allume && a.lum ? a.lum : 100) : lum, teinte };
    };
    const groupes = {};
    for (const a of l) { const c = cible(a); const k = JSON.stringify(c); (groupes[k] = groupes[k] || { c, ids: [] }).ids.push(a.id); }
    face.set('think');
    let ok = [];
    try {
      for (const g of Object.values(groupes)) { const r = await appel('/maison/commande', Object.assign({ ids: g.ids, allume: true }, g.c), 20000); ok = ok.concat((r.resultats || []).filter(x => x.ok).map(x => x.id)); }
    } catch (e) { face.set('oops'); return say("La commande n'est pas passée : l'ordinateur ne répond pas."); }
    face.set('idle'); vusAt = 0;
    if (!ok.length) return say(`${lesNoms(l)} ne répond pas.`);
    fx.ok();
    const qui = lesNoms(l.filter(a => ok.includes(a.id)));
    if (o.amb) return say(pick([`Ambiance ${o.amb} : ${qui}.`, `C'est fait, ambiance ${o.amb}.`]));
    const c = cible(l[0]), dits = [];
    if (o.lum != null || o.delta) dits.push(`${c.lum} %`);
    if (o.dTeinte) dits.push(o.dTeinte < 0 ? 'plus chaud' : 'plus froid');
    else if (c.teinte != null) dits.push(c.teinte <= 20 ? 'blanc chaud' : c.teinte >= 80 ? 'blanc froid' : 'blanc neutre');
    return say(`${qui} : ${dits.join(', en ') || 'réglé'}.`);
  }
  /* =================== plusieurs lumières dans une phrase =================== */
  // « allume le salon et la cuisine », « mets le salon à 30 % et la cuisine à 80 % », « allume l'escalier et éteins la lingerie »,
  // « ambiance tamisée dans le salon et lecture dans la cuisine » : chaque morceau garde sa consigne, ou reprend celle d'avant
  const VERBE = /^(allume|rallume|eteins|eteint|coupe|active|desactive|mets|met|baisse|monte|augmente|diminue|tamise|passe|regle|fais)\b/;
  function morceaux(t) {
    const p = String(t).replace(/[.!?]+$/, '').split(/\s*(?:,|;|\bet\b|\bpuis\b|\bensuite\b|\bainsi que\b)\s*/i).map(x => x.trim()).filter(Boolean);
    return p.length > 1 ? p : null;
  }
  function plan(t) {
    const p = morceaux(t); if (!p) return null;
    const out = []; let action = null, reglage = null;
    for (const m of p) {
      const n = N(m);
      const v = n.match(VERBE);
      if (v) { action = /^(eteins|eteint|coupe|desactive)$/.test(v[1]) ? 'off' : 'on'; reglage = null; }
      const amb = AMBIANCES.find(x => x.re.test(n));
      const o = action === 'off' ? null : lecture(m, n) || (amb ? { lum: amb.lum, teinte: amb.teinte, amb: amb.nom } : null);
      if (o) reglage = o;
      const l = trouve(m, action !== 'off');
      if (!l.length) { if (!out.length) continue; return null; } // un morceau sans appareil : ce n'est pas une liste d'appareils
      out.push({ l: /\b(ma|mon)\b/.test(n) && l.length > 1 && l.some(a => /\bpapa\b/.test(N(a.nom))) ? l.filter(a => /\bpapa\b/.test(N(a.nom))) : l, action: action || 'on', o: reglage });
    }
    return out.length > 1 ? out : null;
  }
  async function plusieurs(t) {
    try { await liste(true); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const pl = plan(t); if (!pl) return null;
    const sensibles = pl.filter(x => x.action === 'off').flatMap(x => x.l).filter(protege);
    if (sensibles.length && !(await askYesNo(`${lesNoms(sensibles)} doit normalement rester allumé. Je coupe quand même ?`))) return say("D'accord, je n'y touche pas.");
    const groupes = {}, quoi = new Map(); // un appareil, une consigne (la dernière dite) ; ceux réglés pareil partent ensemble
    for (const x of pl) for (const a of x.l) {
      let c = { allume: x.action !== 'off' };
      if (c.allume && x.o && reglable(a)) {
        const o = x.o;
        const lum = o.lum != null ? o.lum : o.delta ? Math.max(2, Math.min(100, (a.allume ? a.lum || 100 : 50) + o.delta)) : undefined;
        const teinte = o.teinte != null ? o.teinte : o.dTeinte ? Math.max(0, Math.min(100, (a.teinte == null ? 50 : a.teinte) + o.dTeinte)) : undefined;
        c = Object.assign(c, { lum: lum == null && teinte != null ? (a.allume && a.lum ? a.lum : 100) : lum, teinte });
      }
      quoi.set(a.id, { a, c, o: x.o });
    }
    for (const { a, c, o } of quoi.values()) { const k = JSON.stringify(c); (groupes[k] = groupes[k] || { c, o, ids: [], noms: [] }).ids.push(a.id); groupes[k].noms.push(a); }
    face.set('think');
    const bons = new Set();
    try {
      for (const g of Object.values(groupes)) { const r = await appel('/maison/commande', Object.assign({ ids: g.ids }, g.c), 20000); (r.resultats || []).filter(x => x.ok).forEach(x => bons.add(x.id)); }
    } catch (e) { face.set('oops'); return say("La commande n'est pas passée : l'ordinateur ne répond pas."); }
    face.set('idle'); vusAt = 0;
    if (!bons.size) return say(`${lesNoms([...quoi.values()].map(x => x.a))} ne répond pas.`);
    fx.ok();
    const phrase = g => {
      const l = g.noms.filter(a => bons.has(a.id)); if (!l.length) return '';
      const c = g.c, o = g.o || {}, pl = l.length > 1 ? 's' : '';
      const tx = c.teinte == null ? '' : o.dTeinte ? (o.dTeinte < 0 ? 'plus chaud' : 'plus froid') : c.teinte <= 20 ? 'blanc chaud' : c.teinte >= 80 ? 'blanc froid' : 'blanc neutre';
      const d = !c.allume ? `éteint${pl}` : o.amb ? `ambiance ${o.amb}` : [o.lum != null || o.delta ? `${c.lum} %` : '', tx].filter(Boolean).join(', ') || `allumé${pl}`;
      return `${lesNoms(l)} : ${d}`;
    };
    const ko = [...quoi.values()].map(x => x.a).filter(a => !bons.has(a.id));
    return say(`${Object.values(groupes).map(phrase).filter(Boolean).join('. ')}.${ko.length ? ` ${lesNoms(ko)} ne répond pas.` : ''}`);
  }
  // les scènes : l'état de la maison à un moment, rejoué d'un mot (« mode film », « bonne nuit »)
  const SC = () => (S.scenes = S.scenes || []);
  async function enregistreScene(nom) {
    try { await liste(true); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!appareils.length) return say("Je n'ai encore aucun appareil à mettre dans une scène.");
    const n = nom.trim().replace(/^(la |le |l )/i, '');
    const sc = { id: Date.now(), nom: n, etats: appareils.filter(a => a.allume != null).map(a => Object.assign({ id: a.id, allume: a.allume }, a.allume && reglable(a) ? { lum: a.lum, teinte: a.teinte } : {})), at: Date.now() };
    const old = SC().find(x => N(x.nom) === N(n)); if (old) { tomb('scenes', old); S.scenes = SC().filter(x => x !== old); }
    SC().push(sc); save(); fx.ok();
    return say(`Scène « ${n} » enregistrée : ${sc.etats.filter(e => e.allume).length} allumé${sc.etats.filter(e => e.allume).length > 1 ? 's' : ''}, le reste éteint. Dis « mode ${n} » pour la relancer.`);
  }
  async function scene(sc) {
    const garde = id => { const a = appareils.find(x => x.id === id); return a && protege(a); }; // une scène ne coupe jamais ce qui doit rester allumé
    const off = sc.etats.filter(e => !e.allume && !garde(e.id)).map(e => e.id);
    try {
      const simples = sc.etats.filter(e => e.allume && e.lum == null && e.teinte == null).map(e => e.id);
      if (simples.length) await appel('/maison/commande', { ids: simples, allume: true }, 20000);
      for (const e of sc.etats.filter(x => x.allume && (x.lum != null || x.teinte != null))) await appel('/maison/commande', { ids: [e.id], allume: true, lum: e.lum, teinte: e.teinte }, 20000);
      if (off.length) await appel('/maison/commande', { ids: off, allume: false }, 20000);
    } catch (e) { return say("La scène n'est pas passée : l'ordinateur ne répond pas."); }
    vusAt = 0; fx.ok();
    return say(pick([`Mode ${sc.nom}.`, `Scène ${sc.nom} : c'est fait.`]));
  }

  /* =================== ce que Shadow a le droit de piloter (vérifié par l'ordinateur) =================== */
  const regles = () => appel('/maison/shadow', null, 15000);
  const ecrisRegles = d => appel('/maison/shadow/regles', d);
  async function autorise(cible, oui) {
    try { await liste(!pret || !appareils.length); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!appareils.length) return say("Je n'ai encore aucun appareil. Relie d'abord tes prises, puis dis-moi ce que Shadow peut piloter.");
    const l = trouve(cible);
    if (!l.length) return say(`Je ne trouve pas « ${cible} ». Tes appareils : ${lesNoms(appareils)}.`);
    const risque = oui ? l.filter(a => chaud(a) || protege(a)) : [];
    if (risque.length && !(await askYesNo(`Attention : ${lesNoms(risque)}, ${risque.some(chaud) ? "ça chauffe" : 'ça doit rester allumé'}. Tu es sûr que Shadow peut ${risque.some(chaud) ? "l'allumer" : "l'éteindre"} ?`))) return say("D'accord, je ne lui donne pas.");
    let r; try { r = await regles(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const ids = new Set(r.ids || []);
    l.forEach(a => (oui ? ids.add(a.id) : ids.delete(a.id)));
    try { await ecrisRegles({ ids: [...ids], ...(oui ? { actif: true } : {}) }); } catch (e) { return say("Je n'ai pas pu enregistrer."); }
    fx.ok();
    return say(oui ? `C'est fait : Shadow peut allumer et éteindre ${lesNoms(l)}. Rien d'autre.` : `Shadow ne peut plus toucher à ${lesNoms(l)}.`);
  }
  async function bascule(actif) {
    try { await ecrisRegles({ actif }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    return say(actif ? 'Shadow a de nouveau le droit de piloter ses lumières.' : "C'est coupé : Shadow ne peut plus rien allumer ni éteindre, jusqu'à ce que tu le lui rendes.");
  }
  async function droitsShadow() {
    let r; try { r = await regles(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!(r.ids || []).length) return say("Shadow ne peut rien piloter pour l'instant. Dis par exemple : autorise Shadow à allumer la lampe de la chambre.");
    const noms = (r.appareils || []).map(a => a.nom);
    return say(`${r.actif ? 'Shadow peut piloter' : "C'est coupé pour l'instant, mais Shadow pourrait piloter"} : ${noms.length ? noms.join(', ') : `${r.ids.length} appareil${r.ids.length > 1 ? 's' : ''}`}.${r.coucher ? " Et il éteint tout ça à la fin de l'histoire du soir." : ''}`);
  }

  /* =================== le messager papa ↔ l'enfant =================== */
  async function envoie(texte) {
    let t = String(texte).trim().replace(/[.!?]+$/, '').replace(/[\s,.]+(ok|okay|merci|s il te plait|s'il te plaît|stp)[.!]*$/i, '').replace(/[.!?]+$/, '').trim();
    if (!t) return say('Je lui dis quoi ?');
    // s'il parle déjà à son fils (« je rentre à 19 h »), on garde ses mots
    // « de ranger sa chambre » → « Papa te demande de ranger ta chambre » (une règle fixe : le message ne change pas de sens)
    const tu = x => x.replace(/\b(sa)\b/gi, 'ta').replace(/\b(son)\b/gi, 'ton').replace(/\b(ses)\b/gi, 'tes').replace(/\bse\b/gi, 'te').replace(/\bs['’]/gi, "t'").replace(/\blui\b/gi, 'toi');
    const brut = String(texte).trim();
    if (/^(de |d['’])/i.test(brut)) { const x = t.replace(/^(de |d['’])\s*/i, ''); t = `Papa te demande ${/^[aeéèêiouyh]/i.test(x) ? "d'" : 'de '}${tu(x)}`; }
    else if (/^(je|j['’]|on|maman|papa|nous)\b/i.test(t)) { // « que je l'aime » : papa parle de son fils → à son fils
      t = t.replace(/\b(je|on|nous|maman|papa|mamie|papy|il|elle|ils|elles)(\s+(?:ne\s+)?)l['’](?=[aeéèêiîoôuyh])/gi, "$1$2t'").replace(/\b(je|j['’]|on|nous) le\b/gi, '$1 te').replace(/\b(je|on|nous) lui\b/gi, '$1 te').replace(/\bavec lui\b/gi, 'avec toi').replace(/\bpour lui\b/gi, 'pour toi');
    } else if (/^(il |qu['’]il |que il )/i.test(t) && AI.ready()) { // « qu'il doit… » : à la 2e personne, sans rien ajouter
      try {
        const r = await AI.chat([{ role: 'system', content: 'Mets cette phrase à la 2e personne du singulier (tutoiement), en changeant le moins de mots possible. Ne rajoute rien. Réponds seulement la phrase.' }, { role: 'user', content: t }], { maxTokens: 60, temperature: 0, prefer: 'openai/gpt-oss-20b' });
        const p = nettoie(r).replace(/^["«\s]+|["»\s]+$/g, ''); if (p.length > 2 && p.length < t.length * 1.4 + 10) t = p;
      } catch (e) { /* tel quel */ }
    }
    t = t.charAt(0).toUpperCase() + t.slice(1);
    try { await appel('/maison/messages', { de: 'papa', pour: 'enfant', texte: t }); } catch (e) { return say("Je n'arrive pas à joindre l'ordinateur de la maison : le message n'est pas parti."); }
    fx.ok();
    return say(`C'est transmis. Shadow dira à ${enfant()} : « ${t} », dès qu'il le verra.`);
  }
  const annonceMsg = m => `Message de ${enfant()} : « ${m.texte} ».`;
  async function lus(ms) { for (const m of ms) { try { await appel('/maison/messages', { lu: m.id }); } catch (e) { /* plus tard */ } } }
  async function releve() {
    if (!root() || !dlg.started || voice.endormi) return;
    let j; try { j = await appel('/maison/messages?pour=papa'); } catch (e) { return; }
    (j.messages || []).forEach(m => PROACTIF.annonce(`msg-${m.id}`, async () => { await lus([m]); return annonceMsg(m); }, { expire: Date.now() + 6 * 3600000 }));
  }
  setInterval(releve, 30000);
  async function suiviMessage() {
    let j; try { j = await appel('/maison/messages'); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const m = (j.recents || []).filter(x => x.de === 'papa').pop();
    if (!m) return say("Je n'ai pas de message de toi en attente.");
    if (m.lu) return say(`Oui : Shadow a dit à ${enfant()} « ${m.texte} », à ${hhmm(new Date(m.lu))}.`);
    return say(`Pas encore. Shadow le dira à ${enfant()} dès qu'il le verra devant lui, ou dès qu'il lui parlera.`);
  }
  async function mesMessages() {
    let j; try { j = await appel('/maison/messages?pour=papa'); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const l = j.messages || [];
    const envoyes = (j.recents || []).filter(m => m.de === 'papa').slice(-1)[0];
    if (!l.length) return say(`Pas de nouveau message.${envoyes ? ` Ton dernier message à ${enfant()} ${envoyes.lu ? 'lui a été dit' : "attend qu'il passe devant Shadow"}.` : ''}`);
    await lus(l);
    return say(l.map(annonceMsg).join(' '));
  }

  /* =================== ce que Shadow a appris (et l'oublier) =================== */
  const normS = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); // la même clé que Shadow (sync.js)
  const SOURCES = [
    { path: 'memory.facts', get: d => (d.memory && d.memory.facts) || [], cle: x => x.id, quand: x => x.at, dire: x => String(x.text).replace(/[.\s]+$/, ''), quoi: 'souvenir' },
    { path: 'memory.rules', get: d => (d.memory && d.memory.rules) || [], cle: x => normS(x.text), quand: x => x.at, dire: x => `la consigne « ${String(x.text).replace(/[.\s]+$/, '')} »${x.who ? `, de ${x.who}` : ''}`, quoi: 'consigne' },
    { path: 'jeuxAppris', get: d => d.jeuxAppris || [], cle: x => x.id, quand: x => x.at || x.id, dire: x => `le jeu « ${x.nom} »${x.par ? `, appris par ${x.par}` : ''}`, quoi: 'jeu' },
    { path: 'devAppris', get: d => d.devAppris || [], cle: x => x.id, quand: x => x.id, dire: x => `la devinette « ${x.q} »`, quoi: 'devinette' },
  ];
  let derniers = []; // la dernière liste lue à voix haute (« efface le deux »)
  async function memoireShadow() {
    await LIEN.lire();
    const r0 = root(); if (!r0) return null;
    return (await (await fetch(`${r0}/shadow/etat`, { cache: 'no-store' })).json()) || null;
  }
  async function appris(n) {
    let g; try { g = await memoireShadow(); } catch (e) { g = null; }
    if (!g || !g.data) return say("Je n'arrive pas à lire la mémoire de Shadow : l'ordinateur de la maison doit être allumé.");
    const semaine = /\bsemaine\b/.test(n), debut = semaine ? Date.now() - 7 * 86400000 : new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    derniers = [];
    SOURCES.forEach(s => s.get(g.data).filter(x => (s.quand(x) || 0) >= debut).forEach(x => derniers.push({ s, x })));
    derniers.sort((a, b) => (a.s.quand(a.x) || 0) - (b.s.quand(b.x) || 0));
    if (!derniers.length) return say(`Shadow n'a rien appris de nouveau ${semaine ? 'cette semaine' : "aujourd'hui"}.`);
    const NUM = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit'];
    const l = derniers.slice(0, 8);
    return say(`${semaine ? 'Cette semaine' : "Aujourd'hui"}, Shadow a retenu ${derniers.length} chose${derniers.length > 1 ? 's' : ''}. ${l.map((d, i) => `${NUM[i]} : ${d.s.dire(d.x)}`).join('. ')}.${derniers.length > 8 ? ` Et ${derniers.length - 8} autres.` : ''} Pour en effacer, dis par exemple « efface le deux », ou « efface tout ce que Shadow a appris aujourd'hui ».`);
  }
  // l'oubli : on retire de la mémoire centrale de Shadow, avec une pierre tombale (ses appareils oublient à leur tour)
  async function oublie(items) {
    const r0 = root(); if (!r0 || !items.length) return false;
    for (let essai = 0; essai < 3; essai++) {
      const g = await (await fetch(`${r0}/shadow/etat`, { cache: 'no-store' })).json();
      if (!g || !g.data) return false;
      const d = g.data, now = Date.now();
      d.tomb = d.tomb || {};
      items.forEach(({ s, x }) => {
        const k = String(s.cle(x));
        (d.tomb[s.path] = d.tomb[s.path] || {})[k] = now;
        const parts = s.path.split('.'), parent = parts.length > 1 ? d[parts[0]] : d, nom = parts[parts.length - 1];
        if (parent && Array.isArray(parent[nom])) parent[nom] = parent[nom].filter(y => String(s.cle(y)) !== k);
      });
      d.updatedAt = now;
      const r = await fetch(`${r0}/shadow/etat`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: g.rev || 0, par: 'Atlas (oubli demandé par papa)', data: d }) });
      if (r.status === 409) continue;
      if (r.ok) { LIEN.lire(); return true; }
      return false;
    }
    return false;
  }
  const NUMS = { un: 1, une: 1, premier: 1, premiere: 1, deux: 2, deuxieme: 2, second: 2, seconde: 2, trois: 3, troisieme: 3, quatre: 4, quatrieme: 4, cinq: 5, cinquieme: 5, six: 6, sixieme: 6, sept: 7, septieme: 7, huit: 8, huitieme: 8 };
  async function efface(t, n) {
    if (/\btout\b/.test(n)) {
      if (!derniers.length) { await appris(n); if (!derniers.length) return; }
      if (!(await askYesNo(`J'efface les ${derniers.length} choses que Shadow a apprises ${/\bsemaine\b/.test(n) ? 'cette semaine' : "aujourd'hui"} ?`))) return say('Je ne touche à rien.');
      const ok = await oublie(derniers).catch(() => false); derniers = [];
      return say(ok ? "C'est effacé. Shadow oubliera sur tous ses appareils d'ici une minute." : "Je n'ai pas réussi à écrire dans la mémoire de Shadow.");
    }
    const num = (n.match(/\b(\d|un|une|premier|premiere|deux|deuxieme|second|seconde|trois|troisieme|quatre|quatrieme|cinq|cinquieme|six|sixieme|sept|septieme|huit|huitieme)\b/) || [])[1];
    let cible = null;
    if (num && derniers.length) cible = derniers[(+num || NUMS[num]) - 1];
    if (!cible) { // « dis à Shadow d'oublier que le guépard est rose » : on cherche dans toute sa mémoire
      const quoi = (t.match(/(?:oublier|oublie|efface|supprime)\s+(?:que |qu['’]|la consigne |le jeu |la devinette |le souvenir )?(.+)$/i) || [])[1] || '';
      let g; try { g = await memoireShadow(); } catch (e) { g = null; }
      if (!g || !g.data || !quoi) return say("Dis-moi ce que Shadow doit oublier, ou demande d'abord « qu'est-ce que Shadow a appris aujourd'hui ? ».");
      const m = new Set(N(quoi).split(' ').filter(w => w.length > 3));
      const tous = []; SOURCES.forEach(s => s.get(g.data).forEach(x => tous.push({ s, x })));
      const best = tous.map(d => ({ d, k: N(d.s.dire(d.x)).split(' ').filter(w => m.has(w)).length })).sort((a, b) => b.k - a.k)[0];
      if (!best || best.k < Math.min(2, m.size)) return say("Je ne trouve pas ça dans la mémoire de Shadow.");
      cible = best.d;
    }
    if (!(await askYesNo(`Shadow oublie ${cible.s.dire(cible.x)} ?`))) return say('Je ne touche à rien.');
    const ok = await oublie([cible]).catch(() => false);
    derniers = derniers.filter(d => d !== cible);
    return say(ok ? 'Effacé. Shadow oubliera sur tous ses appareils.' : "Je n'ai pas réussi à écrire dans la mémoire de Shadow.");
  }

  /* =================== ce qu'on lui dit =================== */
  const R = {
    autorise: /^(?:autorise|permets a|laisse) shadow (?:a |d )?(?:allumer|eteindre|piloter|utiliser|gerer|controler|toucher a)?\s*(?:et (?:a |d )?(?:allumer|eteindre))?\s*(.+)$/,
    interditUn: /^(?:interdis|retire|enleve) (.+?) a shadow$|^shadow ne (?:peut|doit) plus (?:allumer|toucher a|piloter) (.+)$/,
    coupe: /\b(interdis (les lumieres|la maison|tout) a shadow|coupe (les lumieres|la maison) (de|a) shadow|shadow n a plus le droit|enleve les lumieres a shadow)\b/,
    rends: /\b(rends (les lumieres|la maison) a shadow|shadow (peut|a) de nouveau|redonne (les lumieres|la maison) a shadow)\b/,
    droits: /\b(qu est ce que shadow (peut|a le droit d) (allumer|piloter|eteindre)|les droits de shadow|shadow a le droit de quoi)\b/,
    pilote: /^(?:allume|eteins|eteint|coupe|active|desactive|mets en marche|rallume)\s+(?!toi\b)(.+)$/,
    etat: /\b(qu est ce qui est allume|qu est ce qui est (encore )?(branche|en marche)|c est allume ou|est ce que (la |le |les |l )?.+ est (allume|eteint|allumee|eteinte)|etat de la maison|les appareils de la maison)\b/,
    sceneRec: /\b(enregistre|retiens|memorise|cree|sauvegarde) (la |une |cette )?(scene|ambiance)\b|\b(retiens|enregistre) cet etat comme\b/,
    sceneGo: /^(?:mode|scene|ambiance|lance la scene|lance le mode|active le mode|passe en mode)\s+(.+)$/,
    message: /^(?:dis|dit|dites|previens|rappelle|explique|demande) (?:a |au )?(?:mon fils|mon garcon|mon petit|mon bonhomme|[a-z]+) (?:que |qu |de |d )(.+)$|^(?:laisse|envoie|transmets?) (?:un |le )?(?:message|mot) (?:a |au )?(?:mon fils|mon garcon|mon petit|[a-z]+)\s*(?:que |qu |de |pour lui dire que |:)?\s*(.+)$/,
    suiviMsg: /\b(shadow|il|mon fils|[a-z]+) a (bien )?(eu|recu|dit|transmis|lu|entendu|le|mon) (le |mon )?message\b|\ble message (est|a ete) (bien )?(passe|arrive|transmis|dit)\b|\bil l a eu\b/,
    mesMsg: /\b(j ai (des|un) (nouveaux? )?messages?|des messages pour moi|il m a laisse un message|il a repondu|mes messages)\b/,
    appris: /\b(qu est ce que|qu|ce que) (shadow|mon fils|il|on) (a|lui a) (appris|retenu)\b|\bshadow a appris quoi\b|\bce que shadow a (appris|retenu)\b/,
    efface: /\b(efface|supprime|enleve|retire)\b.*\b(shadow|le \d|la \d|le (un|deux|trois|quatre|cinq|six|sept|huit)|la (premiere|deuxieme|troisieme|quatrieme|cinquieme))\b|\b(dis|demande) a shadow d oublier\b|\bfais oublier a shadow\b/,
  };
  const POLI = /^(ok |bon |alors |et |eh )?(est ce que )?(tu peux|tu pourrais|peux tu|pourrais tu|tu veux bien|tu voudrais bien|sois gentil et|s il te plait) /;
  function route(t, n) {
    if (POLI.test(n)) n = n.replace(POLI, '').replace(/^dire /, 'dis ').replace(/^transmettre /, 'transmets ').replace(/^envoyer /, 'envoie ');
    if (R.coupe.test(n)) return () => bascule(false);
    if (R.rends.test(n)) return () => bascule(true);
    if (R.droits.test(n)) return droitsShadow;
    const au = n.match(R.autorise); if (au && au[1]) return () => autorise(au[1], true);
    const it = n.match(R.interditUn); if (it && (it[1] || it[2])) return () => autorise(it[1] || it[2], false);
    if (R.appris.test(n)) return () => appris(n);
    if (R.efface.test(n) && (derniers.length || /shadow/.test(n))) return () => efface(t, n);
    if (R.mesMsg.test(n)) return mesMessages;
    if (R.suiviMsg.test(n)) return suiviMessage;
    const pre = LIEN.prenom() ? N(LIEN.prenom()) : '';
    const mm = n.match(R.message);
    const pourLui = /\b(mon fils|mon garcon|mon petit|mon bonhomme|fils|shadow)\b/.test(n) || (/\b(message|mot)\b/.test(n) && /\b(chateau|chado|shado|chadow)\b/.test(n)) || (pre && new RegExp(`\\b${pre}\\b`).test(n)); // « Château » : Shadow mal transcrit
    // « tu peux envoyer un message à Shadow / à mon fils ? » (sans le message) : il demande quoi
    if (!mm && pourLui && /\b(envoie|envoies|envoyer|transmets|transmettre|laisse|laisser|passe|passer)\b.*\b(message|mot)\b/.test(n)) {
      const apres = String(t).match(/(?:message|mot)\b[^:]*?(?:\s(?:que|qu['’]|de|d['’])\s*|:\s*)(.+)$/i);
      return async () => { if (apres && apres[1].trim().length > 2) return envoie(apres[1]); const a = await ask('Je lui dis quoi ?'); return a ? envoie(a) : say("Je n'ai rien entendu. Redis-moi le message quand tu veux."); };
    }
    if (mm && pourLui) {
      const raw = String(t).match(/(?:fils|garçon|garcon|petit|bonhomme|message|mot|[A-Za-zÀ-ÿ]+)(?:\s*,?\s+(pour lui dire que(?=\s)|que(?=\s)|qu['’]|de(?=\s)|d['’])|\s*(:))\s*(.+)$/i);
      const sep = raw ? raw[1] || raw[2] || '' : '';
      return () => envoie(raw ? `${/^d/i.test(sep) ? `${sep}${/['’]$/.test(sep) ? '' : ' '}` : ''}${raw[3]}` : (mm[1] || mm[2])); // « de… » : c'est une demande
    }
    if (R.sceneRec.test(n)) { const m = String(t).match(/(?:sc[eè]ne|ambiance|comme)\s+(?:«\s*)?([^»]+?)\s*»?\s*[.!]?$/i); return () => (m ? enregistreScene(m[1]) : say('Quel nom pour cette scène ? Dis par exemple : enregistre la scène film.')); }
    const sg = n.match(R.sceneGo);
    if (sg) { const sc = SC().find(x => N(x.nom) === sg[1].trim() || N(sg[1]).includes(N(x.nom))); if (sc) return () => scene(sc); }
    if (R.etat.test(n)) { const m = n.match(/est ce que (?:la |le |les |l )?(.+?) est (allume|eteint)/); return () => etat(m ? m[1] : ''); }
    // plusieurs appareils, chacun sa consigne : « allume le salon et éteins la cuisine », « le salon à 30 % et la cuisine à 80 % »
    if ((VERBE.test(n) || /\b(ambiance|lumiere|mode)\b/.test(n)) && morceaux(t) && !/\b(son|volume|musique de|radio|chauffage|temperature|camera|cameras|alarme|message|dis|dit)\b/.test(n) && appareils.length && plan(t)) return async () => { const r = await plusieurs(t); if (r === null) return pilote(String(t).replace(/^\s*\S+\s+/, ''), !/^(eteins|eteint|coupe|desactive)\b/.test(n)); return r; };
    // l'intensité, la teinte, les ambiances : seulement s'il parle de lumière (ou nomme une ampoule réglable)
    const lumiere = /\b(lumiere|lumieres|lampe|lampes|eclairage|ampoule|ampoules|ambiance|veilleuse|tamis\w*)\b/.test(n) || (/\bmode\b/.test(n) && AMBIANCES.some(x => x.re.test(n))) || appareils.some(a => reglable(a) && trouve(t, true).includes(a));
    if (lumiere && !/^(eteins|eteint|coupe|desactive)\b/.test(n) && !/\b(son|volume|musique|radio|enceinte|chauffage|temperature|thermostat|store|stores|volet|volets|camera|cameras|alarme)\b/.test(n)) {
      if (COULEUR.test(n) && /\b(mets|met|passe|en|couleur|lumiere|ambiance|disco)\b/.test(n)) return () => say("Tes ampoules ne font que du blanc : du blanc chaud, jaune, au blanc froid, bleuté. Dis par exemple « lumière chaude dans le salon ».");
      const o = lecture(t, n);
      if (o) return () => regle(t, n, o);
    }
    const p = n.match(R.pilote);
    if (p) {
      const allume = !/^(eteins|eteint|coupe|desactive)\b/.test(n);
      const cible = String(t).replace(/^\s*(allume|éteins|eteins|éteint|eteint|coupe|active|désactive|desactive|mets en marche|rallume)\s+/i, '').replace(/[.!?]+$/, '').trim();
      return () => pilote(cible, allume);
    }
    return null;
  }
  // pour le cerveau : ce qu'il y a dans la maison
  function contexte() {
    if (!appareils.length) return '';
    return `Les appareils de la maison, branchés sur des prises (pas forcément des lampes ; tu peux les piloter : réponds [[allume:nom]] ou [[eteins:nom]], ou « tout » ; ne coupe jamais de toi-même ce qui doit rester allumé, et n'allume jamais de toi-même ce qui chauffe) : ${appareils.map(a => `${a.nom} (${a.allume == null ? 'injoignable' : a.allume ? 'allumé' : 'éteint'}${a.allume && a.lum != null ? `, ${a.lum} %` : ''}${protege(a) ? ', doit rester allumé' : ''}${chaud(a) ? ', chauffe' : ''})`).join(', ')}.${SC().length ? ` Ses scènes : ${SC().map(x => x.nom).join(', ')}.` : ''}`;
  }
  // les réglages : la liste des appareils (ou comment les connecter)
  async function reglages() {
    const box = document.getElementById('r-maison'); if (!box) return;
    box.innerHTML = '<p class="small muted">Je regarde la maison…</p>';
    try { await liste(true); } catch (e) { box.innerHTML = '<p class="small muted">L\'ordinateur de la maison ne répond pas.</p>'; return; }
    let r = { ids: [], actif: true, coucher: false }; try { r = await regles(); } catch (e) { /* tant pis */ }
    box.innerHTML = appareils.length
      ? appareils.map(a => `<div class="item"><span>${esc(a.nom)} <small class="muted">${a.allume == null ? 'injoignable' : a.allume ? 'allumé' : 'éteint'}${chaud(a) ? ' · chauffe' : ''}</small></span><span class="ligne" style="margin:0;gap:12px"><label class="check small" style="margin:0" title="Jamais coupé par « éteins tout » ni par une scène"><input type="checkbox" data-protege="${esc(a.id)}"${protege(a) ? ' checked' : ''}${PROTEGE.test(N(a.nom)) ? ' disabled' : ''}> Toujours allumé</label><label class="check small" style="margin:0"><input type="checkbox" data-shadow-ok="${esc(a.id)}"${(r.ids || []).includes(a.id) ? ' checked' : ''}> Shadow</label></span></div>`).join('')
        + '<p class="small muted">« Toujours allumé » : jamais coupé par « éteins tout » ni par une scène (le congélateur, la box, l\'ordinateur… sont reconnus tout seuls). Ce qui chauffe n\'est jamais allumé par « allume tout ».</p>'
        + `<label class="check small"><input type="checkbox" id="r-shadow-actif"${r.actif ? ' checked' : ''}> Shadow peut piloter les appareils cochés (« Shadow, allume ma lampe »). L'ordinateur refuse tout le reste.</label>`
        + `<label class="check small"><input type="checkbox" id="r-shadow-coucher"${r.coucher ? ' checked' : ''}> À la fin de l'histoire du soir, Shadow éteint ce qu'il a le droit de piloter.</label>`
        + (SC().length ? `<p class="small muted">Scènes : ${SC().map(x => esc(x.nom)).join(', ')}</p>` : '')
      : '<p class="small muted">Aucun appareil pour l\'instant : branche tes prises, ajoute-les dans Smart Life, puis lance l\'assistant de connexion sur l\'ordinateur (voir LISEZMOI). Atlas les trouvera toutes.</p>';
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches && t.matches('[data-shadow-ok]')) { const ids = [...document.querySelectorAll('[data-shadow-ok]')].filter(x => x.checked).map(x => x.dataset.shadowOk); ecrisRegles({ ids }).then(() => toast('Enregistré'), () => toast("L'ordinateur ne répond pas")); }
    if (t.matches && t.matches('[data-protege]')) { S.settings.proteges = [...document.querySelectorAll('[data-protege]')].filter(x => x.checked && !x.disabled).map(x => x.dataset.protege); save(); toast('Enregistré'); }
    if (t.id === 'r-shadow-actif') ecrisRegles({ actif: t.checked }).then(() => toast('Enregistré'), () => toast("L'ordinateur ne répond pas"));
    if (t.id === 'r-shadow-coucher') ecrisRegles({ coucher: t.checked }).then(() => toast('Enregistré'), () => toast("L'ordinateur ne répond pas"));
  });
  return { route, pilote, etat, envoie, reglages, autorise, bascule, mesMessages, appris, efface, contexte, liste, _releve: releve, _trouve: trouve, _appareils: () => appareils, _set: l => { appareils = l; pret = true; vusAt = Date.now(); } };
})();

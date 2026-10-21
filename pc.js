/* =========================================================
   ATLAS — l'ordinateur de la maison, à la voix (une liste fermée d'actions, jamais une commande quelconque)
   - Le son : « monte le son », « baisse un peu le son », « son à 30 % », « coupe le son », « remets le son ».
   - La musique en cours (Chrome/YouTube compris) : « pause », « reprends », « chanson suivante », « qu'est-ce qui joue ? ».
   - L'écran : « verrouille l'ordi », « mets l'écran en veille », « montre-moi l'écran de l'ordi » (une capture),
     « éteins l'ordi », « redémarre l'ordi » (il demande d'abord : sans l'ordi, plus de maison).
   - Les fenêtres : « ferme cette fenêtre », « réduis tout », « agrandis la fenêtre », « passe sur Chrome »,
     « quelles fenêtres sont ouvertes ? » (par la petite extension GNOME « atlas-fenetres@maison »).
   ========================================================= */
'use strict';

const PC = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`ordi ${r.status}`);
      return /image/.test(r.headers.get('Content-Type') || '') ? r.blob() : r.json();
    } finally { clearTimeout(tm); }
  }
  const pc = d => appel('/maison/pc', d);
  const injoignable = () => say("L'ordinateur ne répond pas.");
  const sansExtension = "Pour les fenêtres, il faut que l'extension Atlas soit chargée : ferme ta session sur l'ordi et rouvre-la, une fois.";

  /* ---------- le son ---------- */
  async function son(o) {
    let r; try { r = await pc(Object.assign({ action: 'volume' }, o)); } catch (e) { return injoignable(); }
    if (!r.ok) return say("Je n'arrive pas à régler le son de l'ordi.");
    fx.ok();
    if (o.muet === true) return say("Son de l'ordi coupé.");
    if (r.muet) return say("Le son de l'ordi est coupé.");
    return say(`Son de l'ordi à ${r.niveau} %.`);
  }
  /* ---------- la musique ---------- */
  async function musique(quoi) {
    let r; try { r = await pc({ action: 'musique', quoi }); } catch (e) { return injoignable(); }
    if (!r.ok) return say(r.raison === 'aucun lecteur' ? "Rien ne joue sur l'ordi." : "Le lecteur ne répond pas.");
    const titre = r.titre ? `« ${r.titre} »${r.artiste ? `, de ${r.artiste}` : ''}` : '';
    if (quoi === 'quoi') return say(titre ? `${r.joue ? "En ce moment sur l'ordi" : "En pause sur l'ordi"} : ${titre}.` : "Je ne sais pas ce qui joue.");
    fx.ok();
    if (quoi === 'pause') return say('Pause.');
    if (quoi === 'lecture') return say(titre ? `C'est reparti : ${titre}.` : "C'est reparti.");
    return say(titre ? `${titre}.` : quoi === 'suivant' ? 'Suivant.' : 'Précédent.');
  }
  /* ---------- l'écran, la session ---------- */
  async function simple(action, dit) {
    let r; try { r = await pc({ action }); } catch (e) { return injoignable(); }
    if (!r.ok) return say("L'ordi n'a pas voulu.");
    fx.ok(); return say(dit);
  }
  async function alimentation(action) {
    const quoi = action === 'eteindre' ? "J'éteins l'ordi" : 'Je redémarre l\'ordi';
    const avert = action === 'eteindre' ? " Sans lui, plus de maison : ni lumières, ni caméras, ni sentinelle, et Shadow perd son cerveau, jusqu'à ce que tu le rallumes." : ' Pendant une ou deux minutes, plus de maison.';
    if (!(await askYesNo(`${quoi} ?${avert} Tu confirmes ?`))) return say("D'accord, je n'y touche pas.");
    let r; try { r = await pc({ action, confirme: true }); } catch (e) { return injoignable(); }
    if (!r.ok) return say("L'ordi n'a pas voulu.");
    return say(action === 'eteindre' ? "C'est noté : l'ordi s'éteint dans quelques secondes." : "L'ordi redémarre dans quelques secondes. À tout de suite.");
  }
  let urlCapture = '';
  async function capture(question) {
    face.set('think');
    let img; try { img = await appel('/maison/pc/capture', null, 15000); } catch (e) { img = null; }
    face.set('idle');
    if (!(img instanceof Blob)) return say(sansExtension.replace('Pour les fenêtres', 'Pour la capture'));
    if (urlCapture) URL.revokeObjectURL(urlCapture);
    urlCapture = URL.createObjectURL(img);
    showBoard(`<div class="graphe"><small>L'ÉCRAN DE L'ORDI · ${hhmm().replace(' h ', ':')}</small><img src="${urlCapture}" alt="" style="width:100%;border-radius:12px;display:block"></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 60000);
    if (!question || !SECURITE.visionMaison()) return say("Voilà l'écran de l'ordi. La capture est aussi rangée dans Images, Captures.");
    face.set('think');
    try {
      const data = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(img); });
      const j = await appel('/maison/vision', { image: data, question, camera: "l'écran de l'ordinateur" }, 160000);
      if (j && j.texte) return say(nettoie(j.texte));
    } catch (e) { /* plus bas */ } finally { face.set('idle'); }
    return say("Voilà l'écran de l'ordi.");
  }
  /* ---------- les fenêtres ---------- */
  async function liste() {
    let r; try { r = await pc({ action: 'fenetres' }); } catch (e) { return null; }
    return r.ok ? r.fenetres || [] : r.raison === 'extension absente' ? 'sans' : null;
  }
  const appliDe = f => (f.appli || f.classe || 'une fenêtre').replace(/^Google /, '');
  // la fenêtre dont on parle : par le nom de l'appli ou un mot du titre (« passe sur Chrome », « va sur TradingView »)
  function cherche(l, cible) {
    const mots = N(cible).split(' ').filter(w => w.length > 2 && !['fenetre', 'appli', 'application', 'page', 'onglet', 'sur', 'les', 'des'].includes(w));
    if (!mots.length) return [];
    const score = f => { const a = N(`${f.appli} ${f.classe}`), t = N(f.titre); return mots.reduce((s, w) => s + (a.split(' ').includes(w) ? 3 : a.includes(w) ? 2 : t.includes(w) ? 1 : 0), 0); };
    const best = Math.max(0, ...l.map(score));
    return best ? l.filter(f => score(f) === best) : [];
  }
  async function fenetre(quoi, cible) {
    const l = await liste();
    if (l === 'sans') return say(sansExtension);
    if (!l) return injoignable();
    if (quoi === 'liste') {
      if (!l.length) return say("Aucune fenêtre n'est ouverte sur l'ordi.");
      const apps = [...new Set(l.map(appliDe))];
      const devant = l.find(f => f.premierPlan);
      return say(`${l.length} fenêtre${l.length > 1 ? 's' : ''} : ${apps.join(', ')}.${devant ? ` Devant : ${appliDe(devant)}.` : ''}`);
    }
    if (quoi === 'reduistout') {
      let r; try { r = await pc({ action: 'fenetre', quoi: 'reduistout' }); } catch (e) { return injoignable(); }
      fx.ok(); return say(r.n ? 'Tout est réduit : le bureau est dégagé.' : 'Il n\'y avait rien à réduire.');
    }
    let f = null;
    if (cible) {
      const t = cherche(l, cible);
      if (!t.length) return say(`Je ne trouve pas de fenêtre « ${cible} ». Ouvertes : ${[...new Set(l.map(appliDe))].join(', ')}.`);
      f = t.find(x => !x.premierPlan && quoi === 'active') || t[0];
    } else f = l.find(x => x.premierPlan) || null;
    if (!f) return say("Aucune fenêtre n'est au premier plan.");
    if (quoi === 'ferme' && /^atlas\b/i.test(f.titre || '')) return say("Ça, c'est moi : je ne me ferme pas tout seul. Ferme-moi avec la croix si tu veux.");
    if (quoi === 'ferme' && cible && !(await askYesNo(`Je ferme ${appliDe(f)}${f.titre && f.titre !== f.appli ? ` (${f.titre.slice(0, 50)})` : ''} ?`))) return say("D'accord, je la laisse.");
    let r; try { r = await pc({ action: 'fenetre', quoi, id: f.id }); } catch (e) { return injoignable(); }
    if (!r.ok) return say("Cette fenêtre n'a pas voulu.");
    fx.ok();
    return say({ active: `Voilà ${appliDe(f)}.`, reduis: `${appliDe(f)} : réduite.`, agrandis: `${appliDe(f)} : en grand.`, ferme: `${appliDe(f)} : fermée.` }[quoi]);
  }

  /* ---------- ce qu'on lui dit ---------- */
  const PEU = /\b(un peu|legerement|un poil|un chouia)\b/, BCP = /\b(beaucoup|a fond|fort)\b/;
  function route(t, n) {
    const ordi = /\b(ordi|ordinateur|pc)\b/.test(n);
    // le son
    if (/\b(son|volume)\b/.test(n) && !/\b(lumiere|lampe|camera|alarme|shadow)\b/.test(n)) {
      const pc100 = String(t).match(/(\d{1,3})\s*(?:%|pour\s?cents?)/i) || n.match(/\b(?:son|volume)\b.*\ba (\d{1,3})\b/);
      if (pc100) return () => son({ niveau: +pc100[1] });
      if (/\b(coupe|couper|enleve|mute|muet|eteins)\b/.test(n)) return () => son({ muet: true });
      if (/\b(remets|rallume|reactive|remet)\b/.test(n)) return () => son({ muet: false });
      if (/\b(monte|augmente|plus fort|hausse|plus de son)\b/.test(n)) return () => son({ delta: PEU.test(n) ? 5 : /\b(beaucoup|a fond)\b/.test(n) ? 25 : 10 });
      if (/\b(baisse|diminue|moins fort|moins de son|trop fort)\b/.test(n)) return () => son({ delta: PEU.test(n) ? -5 : /\bbeaucoup\b/.test(n) ? -25 : -10 });
      if (/\b(au max|au maximum|a fond)\b/.test(n)) return () => son({ niveau: 100 });
      if (/\b(combien|quel|niveau|a combien)\b/.test(n)) return () => son({});
    }
    if (/^(mets |met )?(le )?(muet|mode muet)$|^silence sur l ordi/.test(n)) return () => son({ muet: true });
    // la musique
    if (/^(mets |met |fais )?(pause|stop)( la musique| la video| le son| s il te plait)?$|\b(mets|met) (la musique|la video|youtube|spotify) en pause\b|\barrete la (musique|video)\b/.test(n)) return () => musique('pause');
    if (/^(reprends|relance|continue|remets)( la musique| la video| la lecture| s il te plait)?$|^(mets |met )?(lecture|play)$|\b(remets|relance) (la musique|la video)\b/.test(n)) return () => musique('lecture');
    if (/\b(chanson|musique|morceau|video|titre|piste) (suivante?|d apres)\b|^(suivant|suivante|next)$|\bpasse (a la )?(chanson|musique|video) suivante\b/.test(n)) return () => musique('suivant');
    if (/\b(chanson|musique|morceau|video|titre|piste) (precedente?|d avant)\b|^(precedent|precedente)$|\b(reviens|retourne) (a la )?(chanson|musique|video) (precedente|d avant)\b/.test(n)) return () => musique('precedent');
    if (/\b(qu est ce qui (joue|passe)|c est quoi (cette|la) (chanson|musique|video)|quelle est (cette|la) (chanson|musique)|c est qui qui chante)\b/.test(n)) return () => musique('quoi');
    // l'écran, la session
    if (/\b(verrouille|bloque)\b/.test(n) && (ordi || /\b(ecran|session)\b/.test(n))) return () => simple('verrouille', "L'ordi est verrouillé.");
    if (/\b(mets|met) (l |le )?ecran (de l ordi |du pc )?en veille\b|\beteins (l |le )?ecran\b|\bveille (de )?l ecran\b/.test(n)) return () => simple('ecran', "Écran en veille.");
    if (ordi && /^(eteins|eteint|arrete|eteindre)\b/.test(n)) return () => alimentation('eteindre');
    if (ordi && /\b(redemarre|redemarrer|relance)\b/.test(n)) return () => alimentation('redemarrer');
    if (/\b(capture d ecran|fais une capture|screenshot|montre moi l ecran|montre l ecran|l ecran de l ordi|qu est ce qu il y a sur l ecran|qu est ce qui est (affiche|ouvert) sur l ecran)\b/.test(n)) return () => capture(/\b(qu est ce|quoi|decris|explique|lis)\b/.test(n) ? t : '');
    // les fenêtres
    if (/\b(quelles? fenetres?|les fenetres (ouvertes|de l ordi)|qu est ce qui est ouvert sur l ordi)\b/.test(n)) return () => fenetre('liste');
    if (/\b(reduis|cache|minimise) (tout|toutes les fenetres)\b|\bmontre (moi )?le bureau\b/.test(n)) return () => fenetre('reduistout');
    if (/\b(reduis|minimise|cache) (cette |la )?fenetre\b/.test(n)) return () => fenetre('reduis');
    if (/\b(agrandis|maximise) (cette |la )?fenetre\b|\bmets (la fenetre |ca )?en (grand|plein ecran)\b/.test(n)) return () => fenetre('agrandis');
    if (/\bferme (cette |la )?fenetre\b$|^ferme ca$/.test(n)) return () => fenetre('ferme');
    const fe = String(t).match(/^\s*ferme\s+(?:la fen[eê]tre (?:de |d['’]|du )?|l['’]appli(?:cation)? )?(.+?)[.!?]*\s*$/i);
    if (fe && (ordi || /\b(fenetre|appli|application)\b/.test(n))) return () => fenetre('ferme', fe[1].replace(/\b(sur l['’]ordi(nateur)?|du pc)\b/i, '').trim());
    const va = String(t).match(/^\s*(?:passe|va|bascule|reviens|retourne|affiche|montre(?:-moi)?)\s+(?:sur|à|a|dans|vers)?\s*(?:la fen[eê]tre (?:de |d['’]|du )?|l['’]appli(?:cation)? )?(.+?)[.!?]*\s*$/i);
    if (va && /^(passe|va|bascule|reviens|retourne)\b/.test(n) && !/\b(chanson|musique|video|suivante?|precedente?)\b/.test(n)) return () => fenetre('active', va[1].replace(/\b(sur l['’]ordi(nateur)?|du pc)\b/i, '').trim());
    return null;
  }
  return { route };
})();

/* =========================================================
   ATLAS — l'ordinateur de la maison, à la voix (une liste fermée d'actions, jamais une commande quelconque)
   - Le son : « monte le son », « baisse un peu le son », « son à 30 % », « coupe le son », « remets le son ».
   - La musique en cours (Chrome/YouTube compris) : « pause », « reprends », « chanson suivante », « qu'est-ce qui joue ? ».
   - L'écran : « verrouille l'ordi », « mets l'écran en veille », « montre-moi l'écran de l'ordi » (une capture),
     « éteins l'ordi », « redémarre l'ordi » (il demande d'abord : sans l'ordi, plus de maison).
   - Les fenêtres : « ferme cette fenêtre », « réduis tout », « agrandis la fenêtre », « passe sur Chrome »,
     « quelles fenêtres sont ouvertes ? » (par la petite extension GNOME « atlas-fenetres@maison »).
   - Ouvrir : « ouvre feedsniffer », « lance TopstepX », « ouvre YouTube », « ouvre leboncoin point fr » (les applis installées, des sites).
   - La musique : « mets du Daft Punk », « joue Bohemian Rhapsody » (YouTube, qui enchaîne) ; la radio : « mets France Info »,
     « mets les infos », « mets FIP », « arrête la radio ».
   - Gmail, en lecture seule : « j'ai des mails ? », « des mails de Topstep ? », « lis le premier » (rien n'est effacé ni envoyé),
     « qu'est-ce qu'il y a d'important dans mes mails ? » (trié par le cerveau de la maison, refait toutes les 20 minutes).
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

  /* ---------- la radio ici : sur l'appareil où Atlas tourne (la tablette et sa sono, le téléphone) ; sur l'ordinateur, le lecteur de l'ordi ---------- */
  const ici = () => typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role !== 'ordinateur';
  let lecteur = null, lecteurNom = '', lecteurVol = 0.8;
  // quand Atlas parle, la radio baisse (puis remonte doucement)
  setInterval(() => { if (!lecteur) return; const cible = voice.occupe() ? lecteurVol * 0.2 : lecteurVol; lecteur.volume = Math.max(0, Math.min(1, lecteur.volume + (cible - lecteur.volume) * 0.5)); }, 200);
  async function radioIci(cle, nom) {
    if (lecteur) { lecteur.pause(); lecteur = null; }
    const a = new Audio(`https://icecast.radiofrance.fr/${cle}-midfi.mp3`); a.preload = 'none'; a.volume = 0.15;
    lecteur = a; lecteurNom = nom;
    await say(`${nom}.`);
    try { await a.play(); } catch (e) { if (lecteur === a) lecteur = null; return say(`${nom} ne passe pas.`); }
    a.onerror = () => { if (lecteur === a) lecteur = null; };
  }
  function lecteurSon(o) {
    if (o.muet === true) lecteurVol = 0; else if (o.muet === false) lecteurVol = lecteurVol || 0.6;
    else if (o.niveau != null) lecteurVol = Math.max(0, Math.min(1, o.niveau / 100));
    else if (o.delta != null) lecteurVol = Math.max(0, Math.min(1, lecteurVol + o.delta / 100));
    fx.ok(); return say(lecteurVol ? `Radio à ${Math.round(lecteurVol * 100)} %.` : 'Radio coupée.');
  }

  /* ---------- le son ---------- */
  async function son(o) {
    if (lecteur && ici()) return lecteurSon(o); // la radio d'ici : son volume à elle
    let r; try { r = await pc(Object.assign({ action: 'volume' }, o)); } catch (e) { return injoignable(); }
    if (!r.ok) return say("Je n'arrive pas à régler le son de l'ordi.");
    fx.ok();
    if (o.muet === true) return say("Son de l'ordi coupé.");
    if (r.muet) return say("Le son de l'ordi est coupé.");
    return say(`Son de l'ordi à ${r.niveau} %.`);
  }
  /* ---------- la musique ---------- */
  async function musique(quoi) {
    if (lecteur) { // la radio d'ici
      if (quoi === 'pause' || quoi === 'stop' || (quoi === 'bascule' && !lecteur.paused)) { lecteur.pause(); fx.ok(); return quoi === 'stop' ? (lecteur = null, say(`${lecteurNom} : arrêtée.`)) : say('Pause.'); }
      if (quoi === 'lecture' || quoi === 'bascule') { try { await lecteur.play(); } catch (e) { /* rien */ } fx.ok(); return say(`${lecteurNom}.`); }
      if (quoi === 'quoi') return say(`${lecteurNom}, ici.`);
    }
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

  /* ---------- ouvrir une appli ou un site ---------- */
  let applis = [];
  const charge = () => pc({ action: 'applis' }).then(r => { applis = (r && r.applis) || []; }).catch(() => {});
  setTimeout(() => { if (root()) charge(); }, 7000); setInterval(() => { if (root()) charge(); }, 10 * 60000);
  // les applis de GNOME ont souvent un nom anglais : ce qu'on dit en français
  const ALIAS = { calculatrice: 'calculator', calculette: 'calculator', fichiers: 'files', explorateur: 'files', parametres: 'settings', reglages: 'settings',
    'editeur de texte': 'text editor', 'bloc notes': 'text editor', horloge: 'clocks', horloges: 'clocks', 'visionneuse': 'image viewer', 'lecteur pdf': 'document viewer',
    'moniteur systeme': 'resources', ressources: 'resources', 'tableur': 'libreoffice 26 2 calc', calc: 'libreoffice 26 2 calc', 'traitement de texte': 'libreoffice 26 2 writer', word: 'libreoffice 26 2 writer', excel: 'libreoffice 26 2 calc', vlc: 'lecteur multimedia vlc', whatsapp: 'whatsie', drive: 'google drive', 'la rue du financement': 'la rue du financement', lrf: 'la rue du financement', topstep: 'topstepx', 'pro real time': 'prorealtime web', prorealtime: 'prorealtime web', 'feed sniffer': 'feedsniffer', fidsniffer: 'feedsniffer', 'feed sniper': 'feedsniffer', ibkr: 'trader workstation', tws: 'trader workstation', chicku: 'chicku espace de travail' };
  const SITES = { youtube: 'https://www.youtube.com', gmail: 'https://mail.google.com', 'mes mails': 'https://mail.google.com', google: 'https://www.google.fr', netflix: 'https://www.netflix.com', wikipedia: 'https://fr.wikipedia.org',
    amazon: 'https://www.amazon.fr', leboncoin: 'https://www.leboncoin.fr', 'google maps': 'https://maps.google.com', maps: 'https://maps.google.com', 'la meteo': 'https://meteofrance.com', meteo: 'https://meteofrance.com', twitter: 'https://x.com', x: 'https://x.com', chatgpt: 'https://chatgpt.com', claude: 'https://claude.ai', 'youtube music': 'https://music.youtube.com', deezer: 'https://www.deezer.com', spotify: 'https://open.spotify.com', 'google agenda': 'https://calendar.google.com', agenda: 'https://calendar.google.com', 'forex factory': 'https://www.forexfactory.com', investing: 'https://fr.investing.com' };
  function trouveAppli(cible) {
    let c = N(cible).replace(/^(l |la |le |les |mon |ma |mes |l appli |l application |le logiciel |le programme )+/, '').replace(/\b(sur l ordi|sur le pc|de l ordi|stp|s il te plait)\b/g, '').trim();
    if (!c) return null;
    c = ALIAS[c] || c;
    const nom = a => N(a.nom);
    return applis.find(a => nom(a) === c) || applis.find(a => nom(a).startsWith(c + ' ') || c.startsWith(nom(a) + ' ')) || (c.length >= 5 ? applis.find(a => nom(a).includes(c)) : null) || null;
  }
  function trouveSite(cible) {
    const c = N(cible).replace(/^(le site( de)? |la page( de)? |l |la |le |les |le site internet )+/, '').replace(/\b(sur l ordi|sur le pc|stp)\b/g, '').trim();
    if (SITES[c]) return { url: SITES[c], nom: cible.replace(/^(le site( de)? |la page( de)? )/i, '') };
    const dom = c.match(/^([a-z0-9-]+(?: [a-z0-9-]+)?) point (com|fr|org|net|io|ai|eu|be|ch|tv)$/);
    if (dom) return { url: `https://${dom[1].replace(/ /g, '')}.${dom[2]}`, nom: `${dom[1].replace(/ /g, '')}.${dom[2]}` };
    const d2 = String(cible).match(/\b([a-z0-9-]+\.(?:com|fr|org|net|io|ai|eu|be|ch|tv))\b/i);
    if (d2) return { url: `https://${d2[1].toLowerCase()}`, nom: d2[1].toLowerCase() };
    return null;
  }
  async function ouvre(a, site) {
    let r; try { r = await pc(a ? { action: 'lance', id: a.id } : { action: 'site', url: site.url }); } catch (e) { return injoignable(); }
    if (!r.ok) return say(`${a ? a.nom : site.nom} ne s'ouvre pas.`);
    fx.ok(); return say(`J'ouvre ${a ? a.nom.replace(/ /g, ' ') : site.nom}.`);
  }
  /* ---------- la musique : YouTube, et la radio ---------- */
  async function youtube(q) {
    face.set('think');
    let r; try { r = await pc({ action: 'youtube', q }); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r) return injoignable();
    if (!r.ok) return say(r.raison === 'rien trouvé' ? `Je ne trouve rien pour « ${q} » sur YouTube.` : 'YouTube ne répond pas.');
    fx.ok(); return say(r.titre ? `Je mets « ${r.titre.slice(0, 80)} », sur l'ordi.` : `Je mets ${q}, sur l'ordi.`);
  }
  const RADIOS = [[/\b(france ?info|les infos|les informations|info en continu)\b/, 'franceinfo', 'France Info'], [/\bfrance inter\b|^(mets |met |allume |lance )?la radio$/, 'franceinter', 'France Inter'], [/\bfip\b/, 'fip', 'FIP'],
    [/\bfrance culture\b/, 'franceculture', 'France Culture'], [/\bfrance musique\b/, 'francemusique', 'France Musique'], [/\bmouv\b/, 'mouv', 'Mouv']];
  async function radio(cle, nom) {
    if (ici()) return radioIci(cle, nom); // ici : la tablette (et sa sono), le téléphone
    let r; try { r = await pc({ action: 'radio', cle }); } catch (e) { return injoignable(); }
    if (!r.ok) return say(`${nom} ne passe pas.`);
    fx.ok(); return say(`${nom}, sur l'ordi.`);
  }
  async function radioStop() {
    if (lecteur) { lecteur.pause(); lecteur = null; fx.ok(); return say(`${lecteurNom} : arrêtée.`); }
    let r; try { r = await pc({ action: 'radio_stop' }); } catch (e) { return injoignable(); }
    return say(r.nom ? `${r.nom} : arrêtée.` : "Il n'y avait pas de radio.");
  }
  /* ---------- Gmail (lecture seule) ---------- */
  let derniersMails = [];
  const quandMail = d => { const t = Date.parse(d); if (!t) return ''; const j = new Date(t), auj = new Date(); return j.toDateString() === auj.toDateString() ? `à ${j.getHours()} h ${String(j.getMinutes()).padStart(2, '0')}` : `le ${j.getDate()}/${j.getMonth() + 1}`; };
  async function mails(o) {
    face.set('think');
    let r; try { r = await pc(Object.assign({ action: 'mails' }, o)); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r) return injoignable();
    if (!r.ok) return say(r.raison === 'pas relié' ? "Gmail n'est pas encore relié. Sur l'ordi, lance le script de connexion à Gmail : je ne fais que lire, rien d'autre." : `${r.raison}.`);
    if (r.mail) {
      const m = r.mail;
      return say(`Mail de ${m.de}, « ${m.sujet} ». ${m.texte ? m.texte.slice(0, 450) + (m.texte.length > 450 ? '… La suite est dans Gmail.' : '') : '(sans texte)'}`);
    }
    derniersMails = r.mails || [];
    if (!r.total) return say(o.de ? `Aucun mail${o.quoi === 'nonlus' ? ' non lu' : ''} de ${o.de}.` : 'Aucun nouveau mail depuis hier.');
    const l = derniersMails.slice(0, 3).map((m, i) => `${i ? '' : ''}${m.de}, ${quandMail(m.date)} : « ${m.sujet.slice(0, 70)} »`).join('. ');
    return say(`${r.total} ${o.quoi === 'nonlus' ? `mail${r.total > 1 ? 's' : ''} non lu${r.total > 1 ? 's' : ''}` : `mail${r.total > 1 ? 's' : ''}`}${o.de ? ` de ${o.de}` : ' depuis hier'}. ${l}.${r.total > 1 ? ' Dis « lis le premier » ou « lis le deuxième ».' : ' Dis « lis-le » pour l\'entendre.'}`);
  }
  // le tri : « qu'est-ce qu'il y a d'important dans mes mails ? » (le cerveau de la maison, sur l'ordi ; refait toutes les 20 minutes)
  async function importants(frais) {
    face.set('think');
    let r; try { r = await appel('/maison/pc', { action: 'mails_importants', frais }, 120000); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r) return injoignable();
    if (!r.ok) return say(r.raison === 'pas relié' ? "Gmail n'est pas encore relié." : `${r.raison}.`);
    const l = r.importants || [];
    derniersMails = l.map(x => ({ id: x.id, de: x.de, sujet: x.sujet, date: x.date }));
    if (!r.tous) return say('Aucun nouveau mail depuis hier.');
    if (!l.length) return say(`${r.tous} nouveau${r.tous > 1 ? 'x' : ''} mail${r.tous > 1 ? 's' : ''}, mais rien d'important : de la pub et des notifications.`);
    if (typeof SCIFI !== 'undefined') SCIFI.hud('Mails importants', l.slice(0, 8).map(x => [x.de.slice(0, 22), x.resume.slice(0, 70), 'attente']), []);
    return say(`Sur ${r.tous} nouveaux mails, ${l.length} compte${l.length > 1 ? 'nt' : ''}. ${l.slice(0, 5).map((x, i) => `${i ? '' : ''}${x.de} : ${x.resume.replace(/\.$/, '')}`).join('. ')}. Le reste, c'est de la pub et des notifications.${l.length ? ' Dis « lis le premier » pour l\'entendre en entier.' : ''}`);
  }
  const RANG = { premier: 0, '1er': 0, un: 0, dernier: 0, deuxieme: 1, second: 1, deux: 1, troisieme: 2, trois: 2 };

  /* ---------- ce qu'on lui dit ---------- */
  const PEU = /\b(un peu|legerement|un poil|un chouia)\b/, BCP = /\b(beaucoup|a fond|fort)\b/;
  function route(t, n) {
    const ordi = /\b(ordi|ordinateur|pc)\b/.test(n);
    // Gmail (lecture seule)
    if (/\b(mails?|e mails?|emails?|courriels?|boite mail)\b/.test(n) && /\b(important|importants|importantes|qui compte|trie|tri|urgent|urgents|a faire|ce qui compte)\b/.test(n)) return () => importants(/\b(maintenant|a jour|refais|relance)\b/.test(n));
    if (/\b(mails?|e mails?|emails?|courriels?|gmail|boite mail|boite de reception)\b/.test(n) && !/^(ouvre|lance|affiche)\b/.test(n)) {
      const de = (String(t).match(/\b(?:mails?|e-?mails?|courriels?)\s+(?:de|d['’]|du|venant de)\s+(.+?)[?.!]*\s*$/i) || [])[1];
      const rang = n.match(/\b(premier|1er|dernier|deuxieme|second|troisieme)\b/);
      if (/\b(lis|lire|relis|ouvre|c est quoi|que dit|qu est ce que dit)\b/.test(n) && (rang || /\b(le dernier|ce mail|le mail)\b/.test(n)) && !de) {
        return async () => { if (!derniersMails.length) { await mails({ quoi: /\bnon lus?\b|\bnouveaux?\b/.test(n) ? 'nonlus' : 'tous', n: 3 }); if (!derniersMails.length) return; }
          const m = derniersMails[rang ? RANG[rang[1]] : 0]; return m ? mails({ id: m.id }) : say("Je n'ai pas ce mail-là."); };
      }
      if (de && /\b(lis|lire)\b/.test(n)) return async () => { await mails({ quoi: 'tous', de: de.trim(), n: 1 }); if (derniersMails[0]) return mails({ id: derniersMails[0].id }); };
      return () => mails({ quoi: /\b(tous|derniers|recus aujourd hui|recents?)\b/.test(n) && !/\bnon lus?\b/.test(n) ? 'tous' : 'nonlus', de: de ? de.trim() : '', n: 5 });
    }
    if (/^(lis le|lis la|lis-le|lis le moi|lis moi le|lis moi la)\b|^(lis le|lis)\s+(premier|deuxieme|troisieme|dernier)$/.test(n) && derniersMails.length) {
      const rang = n.match(/\b(premier|1er|dernier|deuxieme|second|troisieme)\b/);
      return () => mails({ id: derniersMails[rang ? RANG[rang[1]] : 0].id });
    }
    // la radio
    if (/\b(arrete|coupe|eteins|stop) (la radio|france ?info|france inter|fip|les infos)\b/.test(n)) return radioStop;
    if (/^(mets|met|allume|lance|joue|fais moi ecouter|branche)\b/.test(n)) {
      const ra = RADIOS.find(([re]) => re.test(n));
      if (ra) return () => radio(ra[1], ra[2]);
    }
    // la musique par YouTube : « mets du Daft Punk », « joue Bohemian Rhapsody », « mets la chanson X », « mets X sur YouTube »
    const yt = String(t).match(/^\s*(?:mets|met|joue|lance|fais[- ]moi écouter|fais moi ecouter|passe)\s+(?:moi\s+)?(?:(?:de la |la |une )?(?:musique|chanson|vidéo|video)\s+(?:de\s+|d['’]\s*)?|du\s+|de la\s+|des\s+|de\s+l['’])?(.+?)\s*(?:sur youtube|sur l['’]ordi(?:nateur)?)?[.!?]*\s*$/i);
    if (yt && (/\b(sur youtube|musique|chanson|video|joue|fais moi ecouter)\b/.test(n) || /^(mets|met) (du|des|de la|de l) /.test(n))
        && !/\b(lumiere|lampe|ambiance|salon|cuisine|chambre|escalier|lingerie|son|volume|ecran|alarme|camera|veilleuse|chauffage|minuteur|rappel|pause|lecture|fenetre)\b/.test(N(yt[1]))) {
      let q = yt[1].trim();
      // « de la musique romantique », « une musique pour dormir », « du jazz » : une ambiance ou un genre → une longue playlist variée
      const genre = /^(?:de la |une |la )?(?:musique|chanson)s?\s+(?!de\b|d['’])(.+)$/i.exec(String(t).replace(/^\s*\S+\s+(moi\s+)?/i, '').replace(/\s*(sur youtube|sur l['’]ordi(nateur)?)\s*[.!?]*$/i, '').trim());
      if (genre) q = `musique ${genre[1]} playlist`;
      else if (/^(jazz|rock|rap|reggae|classique|lofi|lo fi|lounge|blues|soul|funk|disco|techno|house|electro|pop|variete francaise|chansons francaises|piano|zen|relaxante?|romantique|annees? \d0|80s|90s)$/i.test(N(q))) q = `${q} playlist`;
      if (/^(de la )?musique$|^une chanson$/i.test(q) || !q) return async () => { const a = await ask('Quelle musique ?'); return a ? youtube(a) : say("D'accord, pas de musique."); };
      return () => youtube(q);
    }
    // ouvrir une appli ou un site
    const ov = String(t).match(/^\s*(?:ouvre|lance|démarre|demarre|affiche|ouvrir)\s+(.+?)[.!?]*\s*$/i);
    if (ov) {
      const a = trouveAppli(ov[1]); if (a) return () => ouvre(a);
      const si = trouveSite(ov[1]); if (si) return () => ouvre(null, si);
    }
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
  return { route, _charge: charge };
})();

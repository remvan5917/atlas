/* =========================================================
   ATLAS — la sécurité : l'alarme Verisure et les caméras EZVIZ
   - L'alarme (par le service shadow-verisure de l'ordinateur) : « l'alarme est activée ? »,
     « active l'alarme en mode total / partiel ». Il ne l'active que si elle est désactivée
     (chez nous, on désactive toujours avant de changer de mode) et il ne la désactive JAMAIS :
     ça reste le badge, le clavier ou l'appli Verisure. Un enfant ne peut pas l'activer.
   - Les caméras : « montre-moi l'entrée » (l'image s'affiche une minute), « qu'est-ce qui se passe
     dans le jardin ? » (il la décrit, seulement si la vision détaillée est activée). Rien n'est enregistré.
   ========================================================= */
'use strict';

const SECURITE = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 95000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return /image/.test(r.headers.get('Content-Type') || '') ? r.blob() : r.json();
    } finally { clearTimeout(tm); }
  }
  const PAS_RELIE = "L'alarme n'est pas encore reliée. Sur l'ordinateur, lance le script de connexion Verisure : tu y tapes ton identifiant, ton mot de passe et le code SMS, puis c'est fini.";

  /* =================== l'alarme =================== */
  async function etatAlarme() {
    face.set('think');
    let e; try { e = await appel('/maison/alarme?frais=1', null, 40000); } catch (er) { face.set('idle'); return say("L'ordinateur de la maison ne répond pas."); }
    face.set('idle');
    if (!e.pret) return say(/pas encore reli/.test(e.raison || '') ? PAS_RELIE : `Je n'arrive pas à joindre Verisure : ${e.raison || 'pas de réponse'}.`);
    return say(`L'alarme est ${e.libelle}.`);
  }
  async function activer(mode, qui) {
    const enfant = LIEN.prenom() && qui && N(qui) === N(LIEN.prenom());
    if (enfant) return say("L'alarme, c'est papa ou maman qui s'en occupent.");
    // d'abord l'état : déjà activée, il faudrait la désactiver avant, ce qu'il ne fait jamais
    try {
      const e = await appel('/maison/alarme?frais=1', null, 40000);
      if (!e.pret) return say(/pas encore reli/.test(e.raison || '') ? PAS_RELIE : `Je n'arrive pas à joindre Verisure : ${e.raison || 'pas de réponse'}.`);
      if (e.code && e.code !== 'D') return say(`L'alarme est déjà ${e.libelle}. Pour changer de mode, désactive-la d'abord avec ton badge ou l'appli Verisure : moi, je ne la désactive jamais.`);
    } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!mode) {
      const a = N(await ask('En mode partiel, ou en mode total ?'));
      mode = /\btotal/.test(a) ? 'total' : /\bpartiel/.test(a) ? 'partiel' : '';
      if (!mode) return say("Je n'ai pas compris le mode. Je ne touche à rien.");
    }
    const ok = await askYesNo(mode === 'total' ? "J'active l'alarme en mode total : personne ne doit rester dans la maison. Je confirme ?" : "J'active l'alarme en mode partiel. Je confirme ?");
    if (!ok) return say("D'accord, je n'active rien.");
    face.set('think'); NOYAU.etiquette('ALARME');
    await say(pick(['Je contacte la centrale.', 'Activation en cours.']));
    let r; try { r = await appel('/maison/alarme/activer', { mode }); } catch (er) { face.set('oops'); NOYAU.etiquette(null); return say("Je n'ai pas réussi à joindre l'alarme. Vérifie dans l'appli Verisure."); }
    face.set('idle'); NOYAU.etiquette(null);
    if (r.ok) { fx.ok(); return say(`C'est fait : l'alarme est ${r.libelle || `activée en mode ${mode}`}.`); }
    if (r.raison === 'deja') return say(`L'alarme est déjà ${r.libelle}. Pour changer de mode, désactive-la d'abord avec ton badge ou l'appli Verisure : moi, je ne la désactive jamais.`);
    if (r.raison === 'ouvert') return say(`Je ne peux pas l'activer, quelque chose est ouvert${r.zones && r.zones.length ? ` : ${r.zones.join(', ')}` : ', une porte ou une fenêtre'}. Ferme, puis redemande-moi.`);
    if (r.raison === 'trop') return say("J'ai déjà essayé plusieurs fois. Attends quelques minutes, ou passe par l'appli Verisure.");
    if (/pas encore reli/.test(r.raison || '')) return say(PAS_RELIE);
    return say("L'alarme n'a pas accepté. Vérifie dans l'appli Verisure.");
  }

  /* =================== les caméras =================== */
  let cams = [], camsAt = 0;
  async function listeCams() {
    if (Date.now() - camsAt < 60000) return cams;
    const j = await appel('/maison/cameras', null, 10000); cams = j.cameras || []; camsAt = Date.now(); return cams;
  }
  const relit = () => { if (root()) { camsAt = 0; listeCams().catch(() => {}); } };
  setTimeout(relit, 7000); setInterval(relit, 5 * 60000); // une caméra ajoutée est reconnue dans les 5 minutes
  const motsCam = t => N(t).split(' ').filter(w => w.length > 2 && !['camera', 'cameras', 'dans', 'devant', 'les', 'des', 'qui', 'quoi', 'passe', 'montre', 'moi'].includes(w));
  const blobVersData = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(b); });
  let urlImage = '';
  async function regarde(cible, question) {
    let l; try { l = await listeCams(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!l.length) return say("Je n'ai encore aucune caméra. Sur l'ordinateur, installe ffmpeg, active le flux local dans l'appli EZVIZ, puis lance le script des caméras : je les trouverai.");
    const m = motsCam(cible);
    const c = l.find(x => motsCam(x.nom).some(w => m.includes(w))) || (l.length === 1 ? l[0] : null);
    if (!c) return say(`Quelle caméra ? J'ai : ${l.map(x => x.nom).join(', ')}.`);
    face.set('think');
    let img; try { img = await appel(`/maison/camera?nom=${encodeURIComponent(c.nom)}`, null, 20000); } catch (e) { img = null; }
    face.set('idle');
    if (!(img instanceof Blob)) return say(`La caméra ${c.nom} ne répond pas.`);
    if (urlImage) URL.revokeObjectURL(urlImage);
    urlImage = URL.createObjectURL(img);
    showBoard(`<div class="graphe"><small>${esc(c.nom.toUpperCase())} · ${hhmm().replace(' h ', ':')}</small><img src="${urlImage}" alt="" style="width:100%;border-radius:12px;display:block"></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 60000);
    if (!question) return say(`Voilà ${/^[aeiouyhé]/i.test(c.nom) ? "l'" : 'la caméra '}${c.nom}.`);
    if (!S.settings.seeCloud || !S.settings.key) return say("Voilà l'image. Pour que je la décrive, active la vision détaillée dans mes réglages : l'image partirait alors chez Groq.");
    try {
      const r = await AI.see(await blobVersData(img), `Tu es Atlas, l'assistant d'une maison. Voici l'image de la caméra « ${c.nom} » de la maison, à l'instant. Réponds en français, en deux ou trois phrases naturelles, à la question : « ${question} ». Factuel : dis s'il y a quelqu'un, un animal, un véhicule, un colis, ou rien de particulier. Ne décris pas le corps des personnes. Pas d'émoji, pas de liste.`);
      return say(nettoie(r) || "Je ne vois rien de particulier.");
    } catch (e) { return say("Voilà l'image, mais je n'arrive pas à l'analyser."); }
  }

  /* =================== ce qu'on lui dit =================== */
  const R = {
    desactive: /\b(desactive|desactiver|eteins|eteint|coupe|arrete|enleve|retire|debranche) (l |de l )?alarme\b/,
    active: /^(?:active|activer|mets|met|enclenche|branche|lance|allume|arme)\s+(?:l |de l )?alarme\b(.*)$|^(?:mets |passe )?(?:l alarme )?en mode (total|totale|partiel|partielle)$|^alarme (totale?|partielle?)$/,
    etat: /\b(l alarme|alarme) (est|est elle|elle est|c est|tu peux me dire si) .*\b(activee|active|allumee|mise|en marche|branchee|desactivee|coupee)\b|\b(etat de l alarme|est ce que l alarme|elle est mise l alarme|l alarme elle est)\b|^(et )?l alarme( \?)?$/,
    camera: /\b(montre|affiche|fais voir|regarde)\b.*\b(camera|entree|jardin|garage|porte|terrasse|portail|salon|allee|devant)\b|\b(qu est ce qui se passe|qu est ce qu il se passe|il y a quelqu un|y a quelqu un|qui est la|qui sonne|il se passe quoi)\b.*\b(dans|devant|a l|au|sur)\b/,
  };
  function route(t, n) {
    if (R.desactive.test(n)) return () => say("Je ne désactive jamais l'alarme : c'est ton badge, le clavier ou l'appli Verisure. Comme ça, personne ne peut la couper en parlant.");
    const a = n.match(R.active);
    if (a) { const reste = (a[1] || a[2] || a[3] || ''); const mode = /\btotal/.test(reste) ? 'total' : /\bpartiel/.test(reste) ? 'partiel' : ''; return () => activer(mode, dlg.qui); }
    if (R.etat.test(n)) return etatAlarme;
    // une caméra : seulement si on dit « caméra » ou le nom d'une de nos caméras (« qu'est-ce qui se passe dans le monde » n'en est pas une)
    const nomme = /\bcameras?\b/.test(n) || cams.some(x => motsCam(x.nom).some(w => new RegExp(`\\b${w}\\b`).test(n)));
    if (R.camera.test(n) && nomme) {
      const question = /\b(qu est ce|il y a|y a|qui est|qui sonne|il se passe)\b/.test(n) ? t : '';
      const cible = n.replace(/^.*?\b(?:camera|dans|devant|a l|au|sur|montre moi|montre|affiche|fais voir|regarde)\b/, '');
      return () => regarde(cible || n, question);
    }
    return null;
  }
  return { route, etatAlarme, activer, regarde, _relit: () => { camsAt = 0; return listeCams(); } };
})();

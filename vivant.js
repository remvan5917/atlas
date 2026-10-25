/* =========================================================
   ATLAS — le vivant de la maison : les cochons d'Inde et le potager
   - Les cochons d'Inde : « mes cochons d'Inde s'appellent … et … », « Caramel pèse 980 grammes » (la courbe de poids :
     il prévient s'il maigrit), « j'ai donné du foin / changé l'eau / nettoyé la cage », « comment vont les cochons d'Inde ? » ;
     le soir, s'ils n'ont rien eu, il le rappelle ; le dimanche, la pesée de la semaine. Son fils les soigne aussi avec Shadow.
   - Le potager (la serre : 4 carrés ; le grand carré dans la cour) : « j'ai planté des tomates dans le carré 2 »,
     « j'ai semé des radis dans le grand carré », « j'ai récolté les radis », « j'ai arrosé la serre »,
     « qu'est-ce qui pousse dans le potager ? », « quoi semer ce mois-ci ? », « quand récolter les carottes ? » ;
     il prévient quand une récolte devrait être prête. La météo du jardinier (gel, chaleur, arrosage) : la sentinelle.
   - Le docteur des plantes : « qu'est-ce qu'elle a ma tomate ? » — il regarde la feuille à la caméra.
   Tout est dans le carnet du vivant, sur l'ordinateur de la maison (maison/vivant.json).
   ========================================================= */
'use strict';

const VIVANT = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(corps) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const r = await fetch(`${r0}/maison/vivant`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`vivant ${r.status}`);
    return r.json();
  }
  const injoignable = () => say("Je n'arrive pas à joindre l'ordinateur de la maison.");
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const jours = at => Math.floor((Date.now() / 1000 - at) / 86400);
  const date = at => new Date(at * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  /* ---------- le calendrier du potager (nord de la France, climat frais ; la serre gagne environ un mois) ----------
     semisAbri : semis au chaud ou sous serre ; semis : en pleine terre ; plant : plantation ; recolte : les mois ; j : jours du semis à la récolte ; jp : de la plantation */
  const CAL = [
    ['tomate', /tomates?/, { semisAbri: [2, 3, 4], plant: [5, 6], recolte: [7, 8, 9, 10], j: 120, jp: 70 }],
    ['courgette', /courgettes?/, { semisAbri: [4, 5], semis: [5, 6], plant: [5, 6], recolte: [7, 8, 9], j: 60, jp: 45 }],
    ['concombre', /concombres?|cornichons?/, { semisAbri: [3, 4, 5], plant: [5, 6], recolte: [7, 8, 9], j: 70, jp: 50 }],
    ['poivron', /poivrons?|piments?/, { semisAbri: [2, 3], plant: [5, 6], recolte: [8, 9, 10], j: 140, jp: 80 }],
    ['aubergine', /aubergines?/, { semisAbri: [2, 3], plant: [5, 6], recolte: [8, 9], j: 140, jp: 80 }],
    ['salade', /salades?|laitues?|batavias?|feuilles de chene|romaines?/, { semisAbri: [2, 3, 9, 10], semis: [3, 4, 5, 6, 7, 8], plant: [3, 4, 5, 6, 7, 8, 9], recolte: [4, 5, 6, 7, 8, 9, 10, 11], j: 60, jp: 40 }],
    ['mâche', /mache/, { semis: [7, 8, 9], recolte: [10, 11, 12, 1, 2, 3], j: 70 }],
    ['roquette', /roquette|mesclun/, { semis: [3, 4, 5, 6, 7, 8, 9], recolte: [4, 5, 6, 7, 8, 9, 10], j: 35 }],
    ['radis', /radis/, { semisAbri: [2, 10], semis: [3, 4, 5, 6, 7, 8, 9], recolte: [4, 5, 6, 7, 8, 9, 10], j: 28 }],
    ['carotte', /carottes?/, { semis: [3, 4, 5, 6, 7], recolte: [6, 7, 8, 9, 10, 11], j: 100 }],
    ['haricot', /haricots?/, { semis: [5, 6, 7], recolte: [7, 8, 9], j: 70 }],
    ['petit pois', /petits? pois/, { semis: [2, 3, 4, 10, 11], recolte: [5, 6, 7], j: 90 }],
    ['fève', /feves?/, { semis: [2, 3, 11], recolte: [5, 6, 7], j: 110 }],
    ['pomme de terre', /pommes? de terre|patates?/, { plant: [3, 4, 5], recolte: [6, 7, 8, 9], jp: 100 }],
    ['oignon', /oignons?/, { semis: [2, 3, 8, 9], plant: [3, 4], recolte: [7, 8], j: 150, jp: 120 }],
    ['ail', /\bail\b|aulx/, { plant: [10, 11, 2, 3], recolte: [6, 7], jp: 240 }],
    ['échalote', /echalotes?/, { plant: [10, 11, 2, 3], recolte: [6, 7], jp: 200 }],
    ['épinard', /epinards?/, { semis: [3, 4, 8, 9], recolte: [4, 5, 6, 10, 11, 12], j: 50 }],
    ['betterave', /betteraves?/, { semis: [4, 5, 6], recolte: [7, 8, 9, 10], j: 90 }],
    ['poireau', /poireaux?/, { semisAbri: [2, 3], plant: [5, 6, 7], recolte: [9, 10, 11, 12, 1, 2, 3], jp: 120 }],
    ['chou', /choux?(?! fleur)|brocolis?|choux? fleurs?|chou fleur/, { semisAbri: [3, 4], plant: [5, 6, 7], recolte: [8, 9, 10, 11, 12, 1, 2], jp: 100 }],
    ['navet', /navets?/, { semis: [3, 4, 8, 9], recolte: [5, 6, 10, 11], j: 55 }],
    ['fraise', /fraises?|fraisiers?/, { plant: [3, 4, 8, 9], recolte: [5, 6, 7], jp: 90 }],
    ['courge', /courges?|potirons?|potimarrons?|citrouilles?|butternut/, { semisAbri: [4, 5], plant: [5, 6], recolte: [9, 10], j: 140, jp: 100 }],
    ['basilic', /basilic/, { semisAbri: [3, 4, 5], plant: [5, 6], recolte: [6, 7, 8, 9], j: 60, jp: 30 }],
    ['persil', /persil/, { semis: [3, 4, 5, 6, 7], recolte: [5, 6, 7, 8, 9, 10, 11], j: 75 }],
    ['ciboulette', /ciboulette/, { semis: [3, 4, 5], plant: [3, 4, 9, 10], recolte: [5, 6, 7, 8, 9, 10], j: 60, jp: 30 }],
  ];
  const cal = plante => CAL.find(([, re]) => re.test(N(plante)));
  const INVAR = ['ail', 'persil', 'basilic', 'ciboulette', 'mâche', 'roquette', 'radis'];
  const pluriel = x => (INVAR.includes(x) ? x : { 'petit pois': 'petits pois', 'pomme de terre': 'pommes de terre', chou: 'choux', poireau: 'poireaux' }[x] || `${x}s`);
  const Maj = x => String(x).charAt(0).toUpperCase() + String(x).slice(1);
  const SAISON = { // ce qui compte ce mois-ci au potager, en plus des semis
    1: 'Le potager se repose : on prépare les semis de février, et on protège du gel.', 2: 'Premiers semis au chaud : tomates, poivrons, aubergines.',
    3: 'Le grand départ : semis de radis, carottes et salades ; on plante les pommes de terre en fin de mois.', 4: "On sème et on repique ; attention aux gelées tardives jusqu'à mi-mai.",
    5: 'Après les Saints de glace (mi-mai), on plante tomates, courgettes et courges.', 6: 'On arrose le matin, on paille, on tuteure les tomates.',
    7: "Récoltes et arrosage : la serre doit rester bien aérée.", 8: 'On sème la mâche et les épinards pour l’hiver.',
    9: 'Dernières récoltes d’été ; on sème les salades d’hiver sous la serre.', 10: "On plante l'ail et les échalotes, on paille pour l'hiver.",
    11: "On plante l'ail et les échalotes, on sème les fèves, et on protège le grand carré du gel avec un voile.", 12: 'Le potager se repose ; on paille et on protège du gel.',
  };

  /* ---------- les lieux du potager ---------- */
  const CHIF = { un: 1, premier: 1, 1: 1, deux: 2, deuxieme: 2, second: 2, 2: 2, trois: 3, troisieme: 3, 3: 3, quatre: 4, quatrieme: 4, 4: 4 };
  function lieuDe(n) {
    const m = n.match(/\bcarre (?:numero |n )?(un|deux|trois|quatre|premier|deuxieme|second|troisieme|quatrieme|[1-4])\b|\b(premier|deuxieme|second|troisieme|quatrieme) carre\b/);
    if (m) return `carre ${CHIF[m[1] || m[2]]}`;
    if (/\b(grand carre|gros carre|carre de la cour|carre dehors|dans la cour|dehors)\b/.test(n)) return 'grand carre';
    if (/\bserre\b/.test(n)) return 'serre';
    return '';
  }
  const lieuDit = l => (l === 'grand carre' ? 'le grand carré de la cour' : l === 'serre' ? 'la serre' : l ? `le carré ${l.split(' ')[1]} de la serre` : '');

  /* ---------- les cochons d'Inde ---------- */
  let noms = [], vivantAt = 0, dernier = null;
  async function charge(force) { if (!force && dernier && Date.now() - vivantAt < 60000) return dernier; dernier = await appel(); vivantAt = Date.now(); noms = (dernier.animaux || {}).noms || []; return dernier; }
  setTimeout(() => { charge().catch(() => {}); synchroVille(); }, 6000);
  async function synchroVille() { // la sentinelle a besoin de la ville pour la météo du jardinier
    const v = S.settings.ville; if (!v || !v.lat || S.vivantVille === `${v.lat},${v.lon}`) return;
    try { await appel({ action: 'ville', lat: +v.lat, lon: +v.lon, nom: v.nom || '' }); S.vivantVille = `${v.lat},${v.lon}`; save(); } catch (e) { /* plus tard */ }
  }
  async function missionSoigneur() { // la mission de Shadow pour son fils : soigner les cochons d'Inde
    try {
      const r0 = root(), m = await (await fetch(`${r0}/maison/missions`, { cache: 'no-store' })).json();
      if ((m.missions || []).some(x => /cochon/i.test(x.nom))) return false;
      await fetch(`${r0}/maison/missions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ajoute: { nom: "Soigneur des cochons d'Inde : foin, eau et légumes", points: 15 } }) });
      return true;
    } catch (e) { return false; }
  }
  async function nommer(t) {
    const m = String(t).match(/s['’]appellent\s+(.+?)\s*[.!]*$/i) || String(t).match(/(?:ce sont|c['’]est)\s+(.+?)\s*[.!]*$/i);
    const l = m ? m[1].split(/\s*(?:,|\bet\b)\s*/).map(x => x.replace(/^(la|le|les|l['’])\s+/i, '').trim()).filter(Boolean).map(x => x.charAt(0).toUpperCase() + x.slice(1)).slice(0, 6) : [];
    if (!l.length) return say("Comment s'appellent-ils ? Dis par exemple : mes cochons d'Inde s'appellent Caramel et Noisette.");
    try { await appel({ action: 'noms', noms: l }); } catch (e) { return injoignable(); }
    noms = l; vivantAt = 0;
    const ajoutee = await missionSoigneur();
    fx.ok();
    return say(`Enchanté, ${liste(l)} ! Je tiens leur carnet de santé : dis-moi leur poids de temps en temps, par exemple « ${l[0]} pèse 950 grammes », et ce que tu leur donnes. Je préviendrai s'il fait trop chaud pour eux.${ajoutee ? " Et j'ai ajouté une mission à Shadow : ton fils devient soigneur des cochons d'Inde." : ''}`);
  }
  async function pesee(nom, g) {
    let r; try { r = await appel({ action: 'pesee', nom, g }); } catch (e) { return injoignable(); }
    if (r.erreur) return say("Ce poids me paraît impossible pour un cochon d'Inde. Redis-le en grammes, par exemple 950 grammes.");
    const l = (r.animaux.pesees || []).filter(x => x.nom === nom); const avant = l.length > 1 ? l[l.length - 2] : null;
    fx.ok();
    if (!avant) return say(`C'est noté : ${nom}, ${g} grammes, aujourd'hui. Je ferai la courbe au fil des pesées.`);
    const d = g - avant.g, pct = Math.round((d / avant.g) * 1000) / 10;
    if (pct <= -5) return say(`Attention : ${nom} pèse ${g} grammes, ${-d} grammes de moins que le ${date(avant.at)}, soit ${String(-pct).replace('.', ',')} pour cent. Chez le cochon d'Inde, une perte de poids est souvent le premier signe d'un souci : surveille qu'il mange bien, et s'il perd encore à la prochaine pesée, montre-le au vétérinaire.`);
    return say(`C'est noté : ${nom}, ${g} grammes, ${d === 0 ? 'stable' : d > 0 ? `${d} grammes de plus` : `${-d} grammes de moins`} depuis le ${date(avant.at)}. ${pct > -5 ? 'Tout va bien.' : ''}`);
  }
  const SOINS = [['foin', /\bfoin\b/], ['eau', /\b(eau|biberon|abreuvoir)\b/], ['legumes', /\b(legumes?|salade|carotte|concombre|poivron|persil|endive|fenouil)\b/], ['granules', /\b(granules?|croquettes?)\b/], ['cage', /\b(cage|litiere|enclos)\b/], ['vitamine', /\bvitamine\b/]];
  const SOIN_DIT = { foin: 'le foin', eau: "l'eau fraîche", legumes: 'les légumes', granules: 'les granulés', cage: 'la cage propre', vitamine: 'la vitamine C', nourri: 'à manger' };
  async function soin(n) {
    const quoi = SOINS.filter(([, re]) => re.test(n)).map(([k]) => k); if (!quoi.length) quoi.push('nourri');
    try { for (const q of quoi) await appel({ action: 'soin', quoi: q, de: 'papa' }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`C'est noté : ${liste(quoi.map(q => SOIN_DIT[q]))}, aujourd'hui.`);
  }
  async function bilanAnimaux() {
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    const a = r.animaux || {}; if (!(a.noms || []).length) return say("Je ne connais pas encore tes cochons d'Inde. Dis : mes cochons d'Inde s'appellent… et donne-moi leurs noms.");
    const auj = new Date().toDateString(), so = (a.soins || []).filter(x => new Date(x.at * 1000).toDateString() === auj);
    const parts = a.noms.map(nm => { const l = (a.pesees || []).filter(x => x.nom === nm); if (!l.length) return `${nm} : pas encore de pesée`; const d = l[l.length - 1], p0 = l.length > 1 ? l[l.length - 2] : null; return `${nm} : ${d.g} grammes le ${date(d.at)}${p0 ? (d.g - p0.g < 0 ? `, en baisse de ${p0.g - d.g} grammes` : d.g - p0.g > 0 ? `, en hausse de ${d.g - p0.g} grammes` : ', stable') : ''}`; });
    const faits = [...new Set(so.map(x => x.quoi))], parQui = so.some(x => x.de === 'enfant');
    return say(`${parts.join('. ')}. Aujourd'hui : ${faits.length ? `${liste(faits.map(q => SOIN_DIT[q] || q))}${parQui ? ', en partie par ton fils' : ''}` : 'rien de noté pour l’instant'}.`);
  }
  // le soir : ils n'ont rien eu ? ; le dimanche : la pesée
  async function veille() {
    if (!dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    let r; try { r = await charge(); } catch (e) { return; }
    const a = r.animaux || {}; if (!(a.noms || []).length) return;
    const d = new Date(), h = d.getHours(), auj = d.toDateString(), k = dayKey();
    const so = (a.soins || []).filter(x => new Date(x.at * 1000).toDateString() === auj);
    if (h >= 19 && h < 21 && S.vivantSoir !== k && !so.some(x => ['nourri', 'legumes', 'foin'].includes(x.quoi)))
      PROACTIF.annonce(`cochons-${k}`, () => { S.vivantSoir = k; save(); return `${liste(a.noms)} n'ont encore rien eu de noté aujourd'hui. Un peu de foin et des légumes frais ? Dis « j'ai donné les légumes » quand c'est fait.`; }, { expire: Date.now() + 90 * 60000 });
    const der = Math.max(0, ...(a.pesees || []).map(x => x.at));
    if (d.getDay() === 0 && h >= 11 && h < 19 && S.vivantPesee !== k && Date.now() / 1000 - der > 6 * 86400)
      PROACTIF.annonce(`pesee-${k}`, () => { S.vivantPesee = k; save(); return `C'est dimanche : on pèse ${liste(a.noms)} ? La pesée de la semaine, c'est le meilleur moyen de voir tout de suite si l'un d'eux ne va pas bien.`; }, { expire: Date.now() + 4 * 3600000 });
    // les récoltes qui devraient être prêtes
    if ((h >= 9 && h < 12) || (h >= 17 && h < 20)) {
      S.vivantRecolte = S.vivantRecolte || [];
      const prete = ((r.potager || {}).cultures || []).filter(c => !c.fin && !S.vivantRecolte.includes(c.id)).find(c => { const e = cal(c.plante); const j = e && (c.type === 'plant' ? e[2].jp : e[2].j); return j && jours(c.at) >= j; });
      if (prete) PROACTIF.annonce(`recolte-${prete.id}`, () => { S.vivantRecolte = S.vivantRecolte.concat(prete.id).slice(-80); save(); return `Au potager : les ${prete.plante} ${prete.type === 'plant' ? 'plantées' : 'semées'} dans ${lieuDit(prete.lieu)} il y a ${jours(prete.at)} jours devraient être bonnes à récolter. Va jeter un œil, et dis « j'ai récolté les ${prete.plante} » quand c'est fait.`; }, { expire: Date.now() + 3 * 3600000 });
    }
  }
  setInterval(() => { veille().catch(() => {}); }, 10 * 60000);

  /* ---------- le potager ---------- */
  async function planter(t, n, type) {
    const lieu = lieuDe(n);
    const brut = String(t).toLowerCase().replace(/[’]/g, "'");
    const m = brut.match(/(?:planté|semé|mis|repiqué|installé)\s+(?:des |du |de la |de l'|les |un |une |quelques |deux |trois |\d+ )?(.+?)(?:\s+(?:dans|au|en|sous)\s+.*)?$/);
    const plante = m ? m[1].replace(/\s+(?:pieds?|plants?|graines?)\s+de\s+/, ' ').replace(/^(pieds?|plants?|graines?)\s+(de |d')/, '').trim() : '';
    if (!plante) return say("Qu'est-ce que tu as planté, et où ? Dis par exemple : j'ai planté des tomates dans le carré 2.");
    if (!lieu) return say(`Dans quel carré as-tu mis les ${plante} ? Les carrés 1 à 4 de la serre, ou le grand carré de la cour ?`);
    try { await appel({ action: 'plante', lieu, plante, type }); } catch (e) { return injoignable(); }
    vivantAt = 0; fx.ok();
    const e = cal(plante), j = e && (type === 'plant' ? e[2].jp : e[2].j), mois = new Date().getMonth() + 1;
    const hors = e && !(e[2][type === 'plant' ? 'plant' : 'semis'] || []).concat(lieu !== 'grand carre' ? e[2].semisAbri || [] : []).includes(mois);
    return say(`C'est noté : des ${plante} dans ${lieuDit(lieu)}.${j ? ` Récolte vers le ${date(Date.now() / 1000 + j * 86400)}, je te préviendrai.` : ''}${hors ? ` Attention, ${MOIS[mois - 1]} n'est pas la saison idéale pour ça ici${lieu !== 'grand carre' ? ', même si la serre aide' : ''}.` : ''}`);
  }
  async function recolter(t, n, fin) {
    const lieu = lieuDe(n), brut = String(t).toLowerCase().replace(/[’]/g, "'");
    const m = brut.match(/(?:récolté|recolté|cueilli|ramassé|arraché|enlevé|retiré)\s+(?:les |des |du |de la |de l'|mes |nos )?(.+?)(?:\s+(?:du|dans le|dans la|de la|au|en)\s+.*)?$/);
    const plante = m ? m[1].trim() : '';
    let r; try { r = await appel({ action: fin, lieu, plante }); } catch (e) { return injoignable(); }
    vivantAt = 0;
    if (!r.n) return say(plante ? `Je n'avais pas de ${plante} dans mon carnet${lieu ? ` pour ${lieuDit(lieu)}` : ''}. C'est noté quand même.` : "Qu'est-ce que tu as récolté ?");
    fx.ok(); return say(fin === 'recolte' ? `Bonne récolte ! Les ${plante} sont sorties du carnet. ${(r.potager.cultures || []).filter(c => !c.fin).length ? '' : 'Ton potager est vide : dis « quoi semer ce mois-ci » pour la suite.'}` : `C'est noté : plus de ${plante}${lieu ? ` dans ${lieuDit(lieu)}` : ''}.`);
  }
  async function arroser(n) {
    const lieu = lieuDe(n) || 'tout';
    try { await appel({ action: 'arrose', lieu, de: 'papa' }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`C'est noté : ${lieu === 'tout' ? 'tout le potager' : lieuDit(lieu)} arrosé${lieu === 'serre' ? 'e' : ''}. Je ne te rappellerai pas d'arroser avant deux jours, sauf grosse chaleur.`);
  }
  async function potager(n) {
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    const lieu = lieuDe(n), c = ((r.potager || {}).cultures || []).filter(x => !x.fin && (!lieu || x.lieu === lieu || (lieu === 'serre' && x.lieu !== 'grand carre')));
    const vides = (lieu && lieu !== 'serre' ? [lieu] : LIEUX.filter(l => lieu !== 'serre' || l !== 'grand carre')).map(l => [l, etatLieu(l, r)]).filter(([, e]) => e.etat !== 'cultive');
    const EDIT = { vide: 'vide', 'a preparer': 'à remettre à neuf', preparation: 'en préparation', pret: 'prêt à planter' };
    const vd = vides.length ? ` ${Maj(liste(vides.map(([l, e]) => `${lieuDit(l)} : ${EDIT[e.etat]}`)))}.` : '';
    if (!c.length) return say(`${lieu ? `Rien ne pousse dans ${lieuDit(lieu)}` : 'Rien ne pousse en ce moment dans mon carnet'}.${vd} Dis « remets le potager à neuf » pour les étapes, ou « j'ai planté des salades dans le carré 1 ».`);
    const par = {}; c.forEach(x => { (par[x.lieu] = par[x.lieu] || []).push(x); });
    const ordre = ['carre 1', 'carre 2', 'carre 3', 'carre 4', 'serre', 'grand carre'];
    const L = ordre.filter(k => par[k]).map(k => `${k === 'grand carre' ? 'Le grand carré' : k === 'serre' ? 'La serre' : `Le carré ${k.split(' ')[1]}`} : ${liste(par[k].map(x => { const e = cal(x.plante), j = e && (x.type === 'plant' ? e[2].jp : e[2].j), reste = j ? j - jours(x.at) : null; return `${x.plante}${reste == null ? '' : reste <= 0 ? ' (bonnes à récolter)' : ` (récolte dans ${reste} jours environ)`}`; }))}`);
    const ar = ((r.potager || {}).arrosages || []).sort((a, b) => b.at - a.at)[0];
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(86vw,520px)"><small style="letter-spacing:.3em;color:#86efac">LE POTAGER</small>${L.map(x => `<p style="margin:8px 0;font-size:17px">${esc(x)}</p>`).join('')}${ar ? `<small style="color:#94a3b8">Dernier arrosage : ${esc(date(ar.at))}</small>` : ''}</div>`);
    return say(`${L.join('. ')}.${vd}${ar ? ` Dernier arrosage noté : il y a ${jours(ar.at) || 'moins d’un'} jour${jours(ar.at) > 1 ? 's' : ''}.` : ''}`);
  }
  function quoiSemer(n) {
    const im = MOIS.findIndex(x => n.includes(N(x))), m = im >= 0 ? im + 1 : new Date().getMonth() + 1, dans = im >= 0 ? `en ${MOIS[m - 1]}` : 'ce mois-ci';
    const nom = e => pluriel(e[0]);
    const abri = CAL.filter(e => (e[2].semisAbri || []).includes(m)).map(nom), terre = CAL.filter(e => (e[2].semis || []).includes(m)).map(nom), plant = CAL.filter(e => (e[2].plant || []).includes(m)).map(nom), rec = CAL.filter(e => (e[2].recolte || []).includes(m)).map(nom);
    const p = [];
    if (abri.length) p.push(`sous la serre ou au chaud, tu peux semer : ${liste(abri)}`);
    if (terre.length) p.push(`en pleine terre : ${liste(terre)}`);
    if (plant.length) p.push(`à planter : ${liste(plant)}`);
    if (rec.length) p.push(`à récolter : ${liste(rec.slice(0, 8))}${rec.length > 8 ? ', entre autres' : ''}`);
    return say(`${dans.charAt(0).toUpperCase() + dans.slice(1)}, ${p.length ? p.join(' ; ') : 'pas grand-chose à semer'}. ${SAISON[m]}`);
  }
  function quand(t, n) {
    const e = CAL.find(([, re]) => re.test(n)); if (!e) return say("Je ne connais pas encore cette plante dans mon calendrier. Demande-moi pour les tomates, les radis, les carottes, les salades…");
    const c = e[2], mm = l => liste((l || []).map(x => MOIS[x - 1]));
    const p = [];
    if (c.semisAbri) p.push(`semis au chaud ou sous serre en ${mm(c.semisAbri)}`);
    if (c.semis) p.push(`semis en pleine terre en ${mm(c.semis)}`);
    if (c.plant) p.push(`plantation en ${mm(c.plant)}`);
    if (c.recolte) p.push(`récolte en ${mm(c.recolte)}`);
    const j = c.j || c.jp;
    const pl = { radis: 'les radis', 'petit pois': 'les petits pois', 'pomme de terre': 'les pommes de terre', ail: "l'ail", 'mâche': 'la mâche', roquette: 'la roquette', persil: 'le persil', basilic: 'le basilic', ciboulette: 'la ciboulette', chou: 'les choux', poireau: 'les poireaux' }[e[0]] || `les ${e[0]}s`;
    return say(`Pour ${pl}, chez nous : ${p.join(' ; ')}.${j ? ` Il faut compter environ ${j} jours ${c.j ? 'du semis' : 'de la plantation'} à la récolte.` : ''}`);
  }
  // le docteur des plantes : il regarde la feuille à la caméra
  function docteur(t) {
    return voir(`Tu es un jardinier expert du potager bio, dans le nord de la France. Sur la photo, identifie la plante, puis dis s'il y a une maladie, un ravageur, une carence, un coup de chaleur ou un manque d'eau, et ce qu'il faut faire, simplement et sans produits chimiques si possible. S'il n'y a pas de plante nette sur la photo, dis de la rapprocher de la caméra. Sa question : « ${String(t).slice(0, 200)} »`);
  }

  /* ---------- le cycle de chaque carré : cultivé → dernière récolte → remise à neuf (étape par étape) → prêt → la culture suivante ----------
     la rotation : jamais la même famille au même endroit deux fois de suite ; après les gourmands (tomates, courges, choux), une légumineuse ou des racines */
  const FAMILLE = { tomate: 'sol', poivron: 'sol', aubergine: 'sol', 'pomme de terre': 'sol', courgette: 'cuc', concombre: 'cuc', courge: 'cuc', oignon: 'all', ail: 'all', échalote: 'all', poireau: 'all', ciboulette: 'all',
    chou: 'bra', radis: 'bra', navet: 'bra', roquette: 'bra', haricot: 'leg', 'petit pois': 'leg', fève: 'leg', carotte: 'api', persil: 'api', betterave: 'che', épinard: 'che', salade: 'ast', mâche: 'val', fraise: 'ros', basilic: 'lam' };
  const NOM_FAM = { sol: 'les solanacées (tomates, poivrons, pommes de terre)', cuc: 'les cucurbitacées (courgettes, courges)', all: "l'ail et les oignons", bra: 'les choux et les radis', leg: 'les légumineuses (haricots, pois, fèves)', api: 'les carottes et le persil', che: 'les betteraves et les épinards', ast: 'les salades', val: 'la mâche', ros: 'les fraisiers', lam: 'le basilic' };
  const GOURMANDS = ['sol', 'cuc', 'bra'];
  const famDe = plante => { const e = cal(plante); return e ? FAMILLE[e[0]] : ''; };
  const ETAPES = [ // la remise à neuf, dans l'ordre
    ['nettoye', /\b(nettoye|vide|debarrasse|enleve les (restes|tiges|plants|vieux)|arrache les (restes|vieux|plants|pieds)|desherbe|arrache les mauvaises herbes)\b/, 'enlever les restes de culture et les mauvaises herbes (les plants malades, pas au compost)'],
    ['aere', /\b(aere|grelinette|beche|retourne|decompacte|griffe|ameubli|travaille la terre)\b/, 'aérer la terre à la grelinette, sans la retourner'],
    ['compost', /\b(compost|fumier|terreau|amende|amendement|engrais organique|corne broyee|cendres?)\b/, 'apporter 2 à 3 centimètres de compost bien mûr'],
    ['couvert', /\b(paille|paillage|paillis|broyat|feuilles mortes|mulch|engrais vert|phacelie|moutarde|seigle|vesce|trefle|voile)\b/, "couvrir la terre : un paillage épais, ou un engrais vert si elle reste vide jusqu'au printemps"],
  ];
  function etatLieu(lieu, r) {
    const P = r.potager || {}, cs = (P.cultures || []).filter(c => c.lieu === lieu);
    const actives = cs.filter(c => !c.fin); if (actives.length) return { etat: 'cultive', actives };
    const fins = cs.filter(c => c.fin).sort((a, b) => b.fin - a.fin), depuis = fins.length ? fins[0].fin : 0;
    const faits = [...new Set((P.travaux || []).filter(x => x.lieu === lieu && x.at >= depuis - 3600).map(x => x.quoi))];
    const reste = ETAPES.filter(([k]) => !faits.includes(k));
    const pret = faits.includes('compost') || (!fins.length && faits.length >= 2);
    return { etat: !fins.length && !faits.length ? 'vide' : pret ? 'pret' : faits.length ? 'preparation' : 'a preparer', faits, reste, avant: fins.slice(0, 2) };
  }
  // quoi planter maintenant à cet endroit : la saison (la serre gagne un mois), et la rotation
  function propositions(lieu, r, m = new Date().getMonth() + 1) {
    const e = etatLieu(lieu, r), deja = (e.avant || []).map(c => famDe(c.plante)).filter(Boolean), serre = lieu !== 'grand carre';
    const ok = c => { const x = c[2]; return (x.semis || []).includes(m) || (x.plant || []).includes(m) || (serre && ((x.semisAbri || []).includes(m) || (x.semis || []).includes(m === 12 ? 1 : m + 1))); };
    let l = CAL.filter(c => ok(c) && !deja.includes(FAMILLE[c[0]]));
    if (deja.length && GOURMANDS.includes(deja[0])) l.sort((a, b) => (FAMILLE[b[0]] === 'leg' || FAMILLE[b[0]] === 'api') - (FAMILLE[a[0]] === 'leg' || FAMILLE[a[0]] === 'api'));
    return { liste: l.slice(0, 4).map(c => pluriel(c[0])), evite: deja[0] ? NOM_FAM[deja[0]] : '' };
  }
  const LIEUX = ['carre 1', 'carre 2', 'carre 3', 'carre 4', 'grand carre'];
  const etapeDit = k => (ETAPES.find(x => x[0] === k) || [, , k])[2];
  async function remiseANeuf(lieu, intro = '') {
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    const cibles = lieu && lieu !== 'serre' ? [lieu] : LIEUX.filter(l => (lieu !== 'serre' || l !== 'grand carre') && etatLieu(l, r).etat !== 'cultive');
    if (!cibles.length) return say(`${intro}Tous tes carrés sont en culture : rien à remettre à neuf pour l'instant.`);
    const mois = new Date().getMonth() + 1, hiver = [10, 11, 12, 1, 2].includes(mois);
    const lignes = cibles.map(l => { const e = etatLieu(l, r); if (e.etat === 'cultive') return { l, t: `${Maj(lieuDit(l))} : encore en culture (${liste(e.actives.map(c => c.plante))})` }; const p = propositions(l, r); return { l, e, p, t: `${Maj(lieuDit(l))} : ${e.etat === 'pret' ? 'prêt' : e.etat === 'vide' ? `vide${p.liste.length ? `, tu peux y mettre ${liste(p.liste)}` : ''}` : e.reste.length ? `à faire : ${etapeDit(e.reste[0][0])}` : 'prêt'}` }; });
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(88vw,560px)"><small style="letter-spacing:.3em;color:#86efac">REMISE À NEUF DU POTAGER</small>${lignes.map(x => `<div style="margin:10px 0"><b style="font-size:16px">${esc(lieuDit(x.l).replace(/^le /, '').replace(/^./, c => c.toUpperCase()))}</b>${x.e && x.e.etat !== 'vide' ? `<div style="font-size:14px;color:#cbd5e1">${ETAPES.map(([k, , d]) => `${x.e.faits.includes(k) ? '✅' : '⬜'} ${esc(d)}`).join('<br>')}</div>${x.p.liste.length ? `<div style="font-size:14px;color:#86efac;margin-top:4px">Ensuite : ${esc(liste(x.p.liste))}</div>` : ''}` : `<div style="font-size:14px;color:#cbd5e1">${esc(x.t)}</div>`}</div>`).join('')}</div>`);
    if (cibles.length === 1 && lignes[0].e) {
      const { e, p } = lignes[0];
      if (e.etat === 'pret' || e.etat === 'vide') return say(`${intro}${lieuDit(cibles[0]).replace(/^./, c => c.toUpperCase())} est prêt. ${p.liste.length ? `En ${MOIS[mois - 1]}, tu peux y mettre : ${liste(p.liste)}.` : hiver ? "Rien à semer dehors en ce moment : couvre-le d'un paillage épais ou d'un engrais vert jusqu'au printemps." : ''}${p.evite ? ` J'évite ${p.evite}, qui y étaient juste avant.` : ''}`);
      return say(`${intro}Pour remettre à neuf ${lieuDit(cibles[0])} : ${liste(e.reste.map(x => x[2]))}. Dis-moi chaque étape quand c'est fait, par exemple « j'ai mis du compost dans le ${cibles[0].replace('carre', 'carré')} ».${p.liste.length ? ` Ensuite, je te proposerai : ${liste(p.liste)}${p.evite ? `, pour ne pas remettre ${p.evite} au même endroit` : ''}.` : ''}`);
    }
    return say(`${intro}${lignes.map(x => x.t).join('. ')}. Le détail est à l'écran. Dis-moi chaque étape quand c'est fait.`);
  }
  async function derniereRecolte(n) {
    const lieu = lieuDe(n);
    let r; try { r = await appel({ action: 'recolte', lieu, plante: '' }); } catch (e) { return injoignable(); }
    vivantAt = 0; fx.ok();
    return remiseANeuf(lieu, `${r.n ? 'Dernière récolte notée' : 'C’est noté'}${lieu ? ` pour ${lieuDit(lieu)}` : ' pour tout le potager'}. `);
  }
  async function travail(n) {
    const quoi = ETAPES.filter(([, re]) => re.test(n)).map(([k]) => k);
    let lieu = lieuDe(n);
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    const cibles = lieu && lieu !== 'serre' ? [lieu] : LIEUX.filter(l => (lieu !== 'serre' || l !== 'grand carre') && etatLieu(l, r).etat !== 'cultive');
    if (!cibles.length) return say('Dans quel carré ? Les carrés 1 à 4 de la serre, ou le grand carré de la cour ?');
    try { for (const l of cibles) for (const q of quoi) await appel({ action: 'travail', lieu: l, quoi: q }); } catch (e) { return injoignable(); }
    vivantAt = 0; fx.ok();
    r = await charge(true);
    const un = cibles.length === 1 ? cibles[0] : null, e = un && etatLieu(un, r);
    if (!un) return say(`C'est noté pour ${cibles.length} carrés : ${liste(quoi.map(etapeDit))}.`);
    if (e.etat === 'pret') { const p = propositions(un, r); return say(`C'est noté. ${lieuDit(un).replace(/^./, c => c.toUpperCase())} est prêt !${p.liste.length ? ` Tu peux y mettre : ${liste(p.liste)}.` : " Rien à semer en ce moment : laisse-le sous son paillage jusqu'au printemps."}${e.reste.some(x => x[0] === 'couvert') && [10, 11, 12, 1, 2].includes(new Date().getMonth() + 1) ? ' Et pense à le couvrir pour l’hiver.' : ''}`); }
    return say(`C'est noté. Prochaine étape pour ${lieuDit(un)} : ${etapeDit(e.reste[0][0])}.`);
  }
  async function quoiPlanter(n) {
    const lieu = lieuDe(n);
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    if (!lieu || lieu === 'serre') return remiseANeuf(lieu);
    const e = etatLieu(lieu, r), p = propositions(lieu, r);
    if (e.etat === 'cultive') return say(`${lieuDit(lieu).replace(/^./, c => c.toUpperCase())} a encore ${liste(e.actives.map(c => c.plante))}. Quand ce sera fini, dis « j'ai fait la dernière récolte du ${lieu.replace('carre', 'carré')} » : je te guiderai pour la suite.`);
    const prep = e.etat === 'pret' || e.etat === 'vide' ? '' : ` Mais d'abord : ${liste(e.reste.map(x => x[2]))}.`;
    return say(`${p.liste.length ? `Dans ${lieuDit(lieu)}, en ${MOIS[new Date().getMonth()]}, tu peux mettre : ${liste(p.liste)}.` : "Rien à semer à cet endroit en ce moment : un paillage ou un engrais vert, et je te proposerai la suite au printemps."}${p.evite ? ` J'évite ${p.evite}, qui y étaient avant.` : ''}${prep}`);
  }

  /* ---------- ce qu'on lui dit ---------- */
  function route(t, n) {
    const ANIM = noms.length ? new RegExp(`\\b(cochons? d ?indes?|${noms.map(N).join('|')})\\b`) : /\bcochons? d ?indes?\b/;
    if (/\bcochons? d ?indes?\b/.test(n) && /\b(s appellent|ce sont|c est|il y a)\b/.test(n) && /\b(mes|nos|les)\b/.test(n) && !/\?/.test(t)) return () => nommer(t);
    // « Caramel pèse 980 grammes », « Noisette fait 1,1 kilo »
    const pm = n.match(/^(?:le cochon d inde |la |le )?([a-z]+) (?:pese|fait) (\d+)(?: (\d+))? ?(grammes?|g|kilos?|kg)?\b/);
    if (pm && noms.some(x => N(x) === pm[1])) { const v = pm[3] && /kilo|kg/.test(pm[4] || '') ? parseFloat(`${pm[2]}.${pm[3]}`) : +pm[2]; const g = /kilo|kg/.test(pm[4] || '') || v < 10 ? Math.round(v * 1000) : Math.round(v); return () => pesee(noms.find(x => N(x) === pm[1]), g); }
    if (/\b(j ai|on a|je viens de|il a)\s+(donne|mis|change|nettoye|nourri|rempli|remis|refait)\b/.test(n) && ANIM.test(n) || /\b(j ai|on a|je viens de)\s+(donne|mis|change|nettoye|rempli|remis|refait)\b.*\b(foin|biberon|abreuvoir|cage|litiere|granules)\b/.test(n)) return () => soin(n);
    if (ANIM.test(n) && /\b(comment (vont|va)|nouvelles|poids|pese|courbe|ont mange|a mange|en forme|sante|carnet)\b/.test(n)) return bilanAnimaux;
    // le potager : le cycle des carrés
    if (/\b(derniere recolte|dernieres recoltes|tout recolte|fini (de recolter|les recoltes|le carre)|le carre \w+ est (vide|fini|termine)|plus rien (dans|au))\b/.test(n)) return () => derniereRecolte(n);
    if (/\b(j ai|on a|je viens de|c est fait)\b/.test(n) && ETAPES.some(([, re]) => re.test(n)) && (lieuDe(n) || /\b(potager|carres|tout)\b/.test(n)) && !/\b(plante|repique)\b/.test(n)) return () => travail(n);
    if (/\b(remets?|remettre|remise) (le potager |les carres |le carre \w+ |la serre )?a neuf\b|\bprepare (le potager|les carres|le carre|la serre)\b|\b(potager|serre|carre) (pour l hiver|a remettre)\b/.test(n)) return () => remiseANeuf(lieuDe(n));
    if (/\b(qu est ce que je (plante|seme|mets)|quoi (planter|semer|mettre)|que (planter|semer|mettre)|je plante quoi|je mets quoi)\b.*\b(carre|grand carre|serre|cour)\b|\bplanter apres\b/.test(n)) return () => quoiPlanter(n);
    // le potager
    if (/\b(j ai|on a|je viens de)\s+(plante|repique|installe)\b/.test(n) && !ANIM.test(n)) return () => planter(t, n, 'plant');
    if (/\b(j ai|on a|je viens de)\s+(seme|mis des graines|mis des semis)\b/.test(n) || /\b(j ai|on a)\s+mis\b.*\b(dans|au) (le |la )?(carre|grand carre|serre)\b/.test(n)) return () => planter(t, n, /\bseme|graines|semis\b/.test(n) ? 'semis' : 'plant');
    if (/\b(j ai|on a|je viens de)\s+(recolte|cueilli|ramasse|arrache)\b/.test(n)) return () => recolter(t, n, 'recolte');
    if (/\b(j ai|on a|je viens de)\s+(enleve|retire)\b.*\b(carre|serre|potager|grand carre)\b/.test(n)) return () => recolter(t, n, 'retire');
    if (/\b(j ai|on a|je viens d|il a)\s*(arrose|arroser)\b/.test(n)) return () => arroser(n);
    if (/\b(qu est ce qui pousse|qu est ce qu il y a|quoi dans|ce qui pousse|etat du potager|mon potager|le potager|ma serre|la serre)\b/.test(n) && /\b(potager|serre|carre|jardin)\b/.test(n) && !/\b(seme|semer|planter|quand)\b/.test(n)) return () => potager(n);
    if (/\b(quoi|qu est ce qu on|qu est ce que je (peux|dois))\s+(semer|planter|seme|plante)\b|\b(que semer|que planter|calendrier du potager|au potager ce mois)\b/.test(n)) return () => quoiSemer(n);
    if (/\b(quand)\b.*\b(semer|planter|recolter|cueillir|ramasser)\b/.test(n) && CAL.some(([, re]) => re.test(n))) return () => quand(t, n);
    // le docteur des plantes
    if ((/\b(qu est ce qu (elle|il) a|qu est ce qu elles ont|qu est ce qu ils ont|elle est malade|il est malade|maladie|pourquoi (les feuilles|elle|il|mes)|feuilles? (jaun|tache|seche|trou|blanc|noir|enroul)|pucerons?|limaces?|chenilles?|oidium|mildiou)\b/.test(n) && /\b(plante|plantes|tomate|tomates|courgette|salade|feuille|feuilles|potager|semis|fraisier|basilic|plant)\b/.test(n)) || /\b(regarde|docteur des plantes)\b.*\b(ma plante|mes plantes|ma tomate|mes tomates|cette plante|cette feuille|mes semis)\b/.test(n)) return () => docteur(t);
    return null;
  }
  return { route, _charge: charge, _cal: cal, _lieu: lieuDe };
})();

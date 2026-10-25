/* =========================================================
   ATLAS — l'assistant de cuisine : l'alimentation la moins transformée possible, pour des sportifs
   - Le garde-manger (frigo, placard, congélateur) : « j'ai acheté du poulet, des œufs et des brocolis »,
     « j'ai mis le saumon au congélateur », « il n'y a plus de lait » (il passe aux courses),
     « le poulet est à consommer avant jeudi », « qu'est-ce qu'il y a dans le frigo ? », « fais l'inventaire du frigo » (la caméra).
     Les produits ultra-transformés sont repérés : il propose une alternative brute, sans faire la morale.
   - « Qu'est-ce qu'on mange ce soir ? » : trois idées avec ce qu'il y a (d'abord ce qui va se perdre), les légumes prêts au
     potager, et ses entraînements (agenda : la gym, le krav maga…) : avant (énergie), après (récupération), repos ;
     une version pour son fils sportif quand il est là. « La deuxième » → le chef la dicte étape par étape.
   - « Les menus de la semaine » : sept dîners, et la liste de courses qui va avec (rangée seulement s'il dit oui).
   - Après une recette : ce qui a servi sort du garde-manger. Tous les jours vers 17 h : ce qu'il faut finir vite.
   Rien de médical : des repères de nutrition du sportif, des aliments bruts.
   ========================================================= */
'use strict';

const CUISINE = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(corps) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const r = await fetch(`${r0}/maison/cuisine`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`cuisine ${r.status}`);
    return r.json();
  }
  const injoignable = () => say("Je n'arrive pas à joindre l'ordinateur de la maison.");
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const JOUR = 86400;
  const JOURS_SEM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  /* ---------- les aliments : où ils vont, combien de temps ils tiennent, et les ultra-transformés ---------- */
  const SORTES = [ // [motif, lieu, jours de conservation (frigo)]
    [/\b(poulet|dinde|boeuf|steak|veau|porc|agneau|canard|viande|hache|escalope|cuisse|filet mignon|roti)\b/, 'frigo', 3],
    [/\b(saumon|cabillaud|thon frais|maquereau|sardines? fraiches?|poisson|crevettes?|moules|truite|merlu|colin)\b/, 'frigo', 2],
    [/\b(oeufs?)\b/, 'frigo', 21], [/\b(lait|kefir)\b/, 'frigo', 6], [/\b(yaourts?|skyr|fromage blanc|faisselle)\b/, 'frigo', 15],
    [/\b(fromages?|comte|emmental|chevre|feta|mozzarella|parmesan)\b/, 'frigo', 14], [/\b(beurre|creme)\b/, 'frigo', 21],
    [/\b(salades?|epinards? frais|roquette|mache|champignons?|herbes|persil|basilic|coriandre)\b/, 'frigo', 4],
    [/\b(bananes?|fraises?|framboises?|myrtilles?|peches?|abricots?|raisin)\b/, 'frigo', 5],
    [/\b(pommes?|poires?|oranges?|citrons?|kiwis?|clementines?)\b/, 'frigo', 14],
    [/\b(tomates?|courgettes?|poivrons?|aubergines?|brocolis?|chou|choux|haricots? verts?|concombres?|poireaux?|carottes?|betteraves?|navets?|legumes?|avocats?)\b/, 'frigo', 7],
    [/\b(pain|baguette)\b/, 'placard', 3],
    [/\b(pates|riz|quinoa|boulgour|semoule|flocons d avoine|avoine|lentilles|pois chiches|haricots secs|haricots rouges|farine|sarrasin|millet|polenta|epeautre)\b/, 'placard', 365],
    [/\b(huile|vinaigre|miel|sel|epices|cafe|the|chocolat noir|noix|amandes|noisettes|graines|cacahuetes|oleagineux|conserves?|tomates? pelees|coulis)\b/, 'placard', 365],
    [/\b(pommes? de terre|patates?|patates douces?|oignons?|ail|echalotes?|courges?|potirons?)\b/, 'placard', 30],
  ];
  const ULTRA = [ // l'ultra-transformé repéré, et une alternative brute
    [/\b(chips)\b/, 'des amandes ou des pois chiches grillés au four'], [/\b(sodas?|coca|limonade|boissons? energisantes?|ice tea)\b/, "de l'eau pétillante avec un citron pressé"],
    [/\b(nuggets?|cordons? bleus?|panes? industriels?)\b/, 'des aiguillettes de poulet panées maison, à la chapelure et au four'], [/\b(pate a tartiner|nutella)\b/, 'une purée de noisette ou d’amande sans sucre ajouté'],
    [/\b(cereales? (sucrees|chocolatees|du petit dejeuner)|chocapic|miel pops|corn flakes)\b/, "des flocons d'avoine avec un fruit"], [/\b(biscuits?|gateaux industriels|madeleines|brioches? industrielles?|barres? chocolatees|bonbons)\b/, 'un fruit et une poignée d’oléagineux'],
    [/\b(plats? prepares?|lasagnes? surgelees?|pizzas? surgelees?|pizzas? industrielles?|quiches? industrielles?|nouilles instantanees|soupes? en brique)\b/, 'un plat simple maison : une omelette aux légumes se fait en dix minutes'],
    [/\b(knackis?|saucisses? de strasbourg|surimi|jambon reconstitue|charcuterie industrielle|lardons industriels)\b/, 'des œufs, du poulet ou un poisson en conserve au naturel'],
    [/\b(sirops?|jus a base de concentre|nectars?|creme dessert|danette|yaourts? aromatises?|yaourts? sucres?)\b/, 'un yaourt nature avec un fruit frais'],
    [/\b(ketchup|mayonnaise industrielle|sauce industrielle|vinaigrette industrielle)\b/, 'une sauce maison : yaourt, citron et herbes'], [/\b(frites surgelees|pommes noisettes)\b/, 'des pommes de terre rôties au four avec la peau'],
  ];
  const sorte = nom => { const n = N(nom); return SORTES.find(([re]) => re.test(n)) || (ULTRA.some(([re]) => re.test(n)) && !/\b(nuggets?|cordons?|knackis?|saucisses?|surimi|jambon|yaourts?|creme dessert|danette|pizzas? surgelees?|lasagnes? surgelees?|frites surgelees)\b/.test(n) ? [null, 'placard', 365] : null); };
  const min1 = x => String(x || '').replace(/^\p{Lu}(?=\p{Ll})/u, c => c.toLowerCase()); // un plat au milieu d'une phrase
  const Maj = x => String(x).charAt(0).toUpperCase() + String(x).slice(1);
  const ultra = nom => { const n = N(nom); return ULTRA.find(([re]) => re.test(n)); };
  const articles = txt => String(txt).split(/\s*(?:,|\bet\b|\bpuis\b|\bainsi que\b)\s*/i).map(x => x.trim().replace(/^(du|de la|de l'|de l’|des|un|une|le|la|les|l'|l’|quelques|deux|trois|quatre|cinq|six|\d+)\s+/i, '').replace(/\s+(au|dans le|dans la)\s+(frigo|placard|congelateur|congélateur|freezer)$/i, '').trim()).filter(x => x.length > 1).slice(0, 25);

  /* ---------- le garde-manger ---------- */
  let cache = null, cacheAt = 0;
  async function charge(force) { if (!force && cache && Date.now() - cacheAt < 60000) return cache; cache = await appel(); cacheAt = Date.now(); return cache; }
  async function achete(t, n) {
    const m = String(t).match(/(?:acheté|achete|rapporté|ramené|reçu|mis|rangé|ajouté)\s+(.+?)\s*[.!]*$/i);
    const items = articles(m ? m[1] : '');
    if (!items.length) return say("Qu'est-ce que tu as acheté ? Dis par exemple : j'ai acheté du poulet, des œufs et des brocolis.");
    const congel = /\b(congelateur|freezer|surgele)\b/.test(n);
    const now = Date.now() / 1000;
    const L = items.map(nom => { const s = sorte(nom), u = ultra(nom); const lieu = congel ? 'congelateur' : s ? s[1] : 'frigo'; return { nom, lieu, perime: lieu === 'congelateur' ? Math.round(now + 90 * JOUR) : s && s[2] < 60 ? Math.round(now + s[2] * JOUR) : null, ultra: !!u, alt: u ? u[1] : '' }; });
    try { await appel({ action: 'ajoute', items: L }); } catch (e) { return injoignable(); }
    cacheAt = 0; fx.ok();
    // ce qui était sur la liste de courses en sort
    const achetes = L.map(x => N(x.nom)); const avant = (S.listes || []).length;
    const rayes = (S.listes || []).filter(x => x.liste === 'courses' && achetes.some(a => N(x.text).replace(/ \(.*\)$/, '').includes(a) || a.includes(N(x.text).replace(/ \(.*\)$/, ''))));
    rayes.forEach(x => tomb('listes', x)); S.listes = (S.listes || []).filter(x => !rayes.includes(x)); if (S.listes.length !== avant) save(); // (rayés partout : les autres appareils aussi)
    const u = L.filter(x => x.ultra);
    return say(`C'est rangé : ${liste(L.map(x => `${x.nom}${x.lieu === 'congelateur' ? ' au congélateur' : x.lieu === 'placard' ? ' au placard' : ''}`))}.${u.length ? ` Petite remarque de coach : ${u[0].nom}, c'est ultra-transformé. La prochaine fois, ${u[0].alt}.` : ''}${S.listes.length !== avant ? ' Je les ai rayés de la liste de courses.' : ''}`);
  }
  async function fini(t, n) {
    const m = String(t).match(/(?:plus de|plus d['’]|fini|terminé|utilisé|mangé|jeté|manque)\s+(?:le |la |les |l['’]|du |de la |des |mes )?(.+?)\s*[.!]*$/i);
    const items = articles(m ? m[1] : '');
    if (!items.length) return say("Qu'est-ce qui est fini ?");
    let r; try { r = await appel({ action: 'retire', noms: items }); } catch (e) { return injoignable(); }
    cacheAt = 0;
    const manque = /\b(plus de|plus d|manque|fini|termine)\b/.test(n) && !/\b(mange|utilise|jete)\b/.test(n);
    if (manque) {
      const deja = (S.listes || []).filter(x => x.liste === 'courses').map(x => N(x.text)), neufs = items.filter(i => !deja.includes(N(i)));
      S.listes = (S.listes || []).concat(neufs.map((x, k) => ({ id: Date.now() + k, liste: 'courses', text: x, at: Date.now() }))); save();
      fx.ok(); return say(`C'est noté. ${neufs.length ? `J'ajoute ${liste(neufs)} aux courses.` : "C'était déjà sur la liste de courses."}`);
    }
    fx.ok(); return say(`C'est sorti du garde-manger : ${liste(items)}.`);
  }
  async function peremption(t, n) {
    const m = String(t).match(/^(?:le |la |les |l['’])?(.+?)\s+(?:est |sont )?(?:à consommer avant|a consommer avant|périme|perime|périment|expire|est bon jusqu['’]à|jusqu['’]au?)\s+(.+?)\s*[.!]*$/i);
    if (!m) return null;
    const quand = N(m[2]), d = new Date(); d.setHours(20, 0, 0, 0);
    const jj = JOURS_SEM.findIndex(x => quand.includes(x));
    if (/\baujourd hui\b/.test(quand)) { /* rien */ } else if (/\bapres demain\b/.test(quand)) d.setDate(d.getDate() + 2); else if (/\bdemain\b/.test(quand)) d.setDate(d.getDate() + 1);
    else if (jj >= 0) d.setDate(d.getDate() + (((jj - d.getDay()) % 7) + 7) % 7 || 7);
    else { const dm = quand.match(/\b(\d{1,2})\b/); if (!dm) return say("Je n'ai pas compris la date. Dis par exemple : le poulet est à consommer avant jeudi."); d.setDate(+dm[1]); if (d < new Date()) d.setMonth(d.getMonth() + 1); }
    let r; try { r = await appel({ action: 'perime', nom: m[1], at: Math.round(d / 1000) }); } catch (e) { return injoignable(); }
    cacheAt = 0;
    if (!r.n) { try { await appel({ action: 'ajoute', items: [{ nom: m[1], lieu: (sorte(m[1]) || [, 'frigo'])[1], perime: Math.round(d / 1000) }] }); } catch (e) { return injoignable(); } }
    fx.ok(); return say(`C'est noté : ${m[1]}, à finir avant ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}. Je te le rappellerai.`);
  }
  async function contenu(n) {
    let r; try { r = await charge(true); } catch (e) { return injoignable(); }
    const lieu = /\bcongel/.test(n) ? 'congelateur' : /\bplacard\b/.test(n) ? 'placard' : /\bfrigo|refrigerateur\b/.test(n) ? 'frigo' : '';
    const st = (r.stock || []).filter(x => !lieu || x.lieu === lieu);
    if (!st.length) return say(`${lieu ? `Rien de noté dans le ${lieu === 'congelateur' ? 'congélateur' : lieu}` : 'Ton garde-manger est vide dans mon carnet'}. Dis « j'ai acheté… », ou « fais l'inventaire du frigo » devant le frigo ouvert.`);
    const now = Date.now() / 1000, vite = st.filter(x => x.perime && x.perime - now < 2 * JOUR).sort((a, b) => a.perime - b.perime);
    const par = l => st.filter(x => x.lieu === l).map(x => x.nom);
    const parts = ['frigo', 'placard', 'congelateur'].filter(l => par(l).length).map(l => `${l === 'congelateur' ? 'au congélateur' : l === 'placard' ? 'au placard' : 'au frigo'} : ${liste(par(l))}`);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(88vw,520px)"><small style="letter-spacing:.3em;color:#fcd34d">LE GARDE-MANGER</small>${['frigo', 'placard', 'congelateur'].filter(l => par(l).length).map(l => `<p style="margin:8px 0;font-size:16px"><b>${l === 'congelateur' ? 'Congélateur' : l === 'placard' ? 'Placard' : 'Frigo'}</b> · ${esc(liste(par(l)))}</p>`).join('')}${vite.length ? `<p style="color:#fca5a5;font-size:15px">À finir vite : ${esc(liste(vite.map(x => x.nom)))}</p>` : ''}</div>`);
    return say(`${Maj(parts.join(' ; '))}.${vite.length ? ` À finir vite : ${liste(vite.map(x => x.nom))}.` : ''}`);
  }
  // l'inventaire à la caméra : il regarde le frigo ouvert (ou le placard), et propose la liste
  let inventaireOffre = null;
  async function inventaire(n) {
    const lieu = /\bcongel/.test(n) ? 'congelateur' : /\bplacard\b/.test(n) ? 'placard' : 'frigo';
    await say(`Ouvre ${lieu === 'congelateur' ? 'le congélateur' : lieu === 'placard' ? 'le placard' : 'le frigo'} devant ma caméra. Je regarde dans trois secondes.`);
    await wait(3200); face.set('think');
    const img = typeof VISION !== 'undefined' && VISION.isOn() ? VISION.snapshot() : await CAMERA.photo().catch(() => null);
    if (!img) { face.set('idle'); return say("Ma caméra ne s'ouvre pas sur cet appareil."); }
    const q = 'Liste les aliments que tu vois sur cette photo de réfrigérateur ou de placard, en français, au pluriel si plusieurs, sans marque. Réponds UNIQUEMENT en JSON : {"aliments": ["œufs", "lait", "brocolis"]}. Si tu ne vois pas d\'aliments, {"aliments": []}.';
    let txt = '';
    try {
      if (typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { const j = await (await fetch(`${root()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question: q }) })).json(); txt = j && j.texte; }
      if (!txt && S.settings.seeCloud && S.settings.key) txt = await AI.see(img, q);
    } catch (e) { txt = ''; }
    face.set('idle');
    let l = []; try { l = (JSON.parse(String(txt).slice(String(txt).indexOf('{'), String(txt).lastIndexOf('}') + 1)).aliments || []).map(x => String(x).trim()).filter(Boolean).slice(0, 25); } catch (e) { l = []; }
    if (!txt) return say("Je n'ai pas de vision disponible en ce moment. Dicte-moi plutôt ce qu'il y a : « j'ai acheté… ».");
    if (!l.length) return say("Je ne vois pas bien d'aliments. Rapproche-moi, ou dicte-moi ce qu'il y a.");
    inventaireOffre = { at: Date.now(), lieu, l }; dlg.attendReponse = Date.now() + 90000;
    return say(`Je vois : ${liste(l)}. Je range tout ça dans le ${lieu === 'congelateur' ? 'congélateur' : lieu} de mon carnet ?`);
  }

  /* ---------- le contexte du repas : ce qu'il y a, le potager, les entraînements, qui mange ---------- */
  const SPORT = /\b(gym|gymnastique|krav|muscu|musculation|sport|course|footing|running|velo|natation|piscine|foot|basket|boxe|judo|crossfit|entrainement|seance|match|yoga|escalade|tennis|apc)\b/;
  async function contexte() {
    const r0 = root(), now = Date.now() / 1000;
    const [c, ag, pr, viv] = await Promise.all([charge(true).catch(() => null), fetch(`${r0}/maison/agenda?jours=2`, { cache: 'no-store' }).then(x => x.json()).catch(() => null), fetch(`${r0}/atlas/presences`, { cache: 'no-store' }).then(x => x.json()).catch(() => null), typeof VIVANT !== 'undefined' ? VIVANT._charge().catch(() => null) : null]);
    const st = (c && c.stock) || [];
    const vite = st.filter(x => x.perime && x.perime - now < 2.5 * JOUR).map(x => x.nom);
    const sport = ((ag && ag.evenements) || []).filter(e => !e.journee && SPORT.test(N(e.titre)) && !/\bpas de\b/.test(N(e.titre)) && e.fin > now - 6 * 3600 && e.debut < now + 30 * 3600)
      .map(e => ({ titre: String(e.titre).replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu, '').trim(), debut: e.debut, fin: e.fin, enfant: !!(typeof LIEN !== 'undefined' && LIEN.prenom() && N(e.titre).includes(N(LIEN.prenom()))) }));
    const enfant = !!(pr && pr.enfant), potager = [];
    if (viv) ((viv.potager || {}).cultures || []).filter(x => !x.fin).forEach(x => { const e = VIVANT._cal(x.plante); const j = e && (x.type === 'plant' ? e[2].jp : e[2].j); if (j && (now - x.at) / JOUR >= j - 5) potager.push(x.plante); });
    return { st, vite, sport, enfant, potager, repas: ((c && c.repas) || []).slice(-8).map(x => x.plat) };
  }
  const hh = s => { const d = new Date(s * 1000); return `${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, '0')}` : ''}`; };
  function texteSport(sport) {
    const now = Date.now() / 1000;
    return sport.map(e => `${e.titre}${e.enfant ? ' (son fils)' : ''} : ${e.fin < now ? `fini à ${hh(e.fin)} (récupération)` : e.debut > now ? `à ${hh(e.debut)}${new Date(e.debut * 1000).getDate() !== new Date().getDate() ? ' demain' : ''}` : 'en ce moment'}`).join(' ; ') || "pas d'entraînement prévu (jour de repos)";
  }
  const REGLES = "Règles absolues : uniquement des aliments bruts ou très peu transformés (légumes, fruits, légumineuses, céréales complètes, œufs, viandes et poissons frais, laitages nature, oléagineux, huile d'olive), aucun produit industriel, aucun complément ni poudre. Repères du sportif (pas de conseil médical) : des protéines à chaque repas (environ 25 à 40 g pour un adulte sportif), des légumes à chaque repas, des glucides complexes plus présents la veille et après un entraînement, un repas plus léger juste avant ; pour un enfant sportif, des portions d'enfant, simples et gourmandes, jamais de régime.";

  /* ---------- « qu'est-ce qu'on mange ce soir ? » ---------- */
  let idees = null, menuOffre = null;
  async function quoiManger(t, n) {
    if (!/\b(autre chose|autre idee|d autres idees|pas envie|change|idees?)\b/.test(n) && /\b(ce soir|demain soir|diner|demain)\b/.test(n) || /^(qu est ce qu on mange|on mange quoi)$/.test(n)) {
      const m = await menuDuJour(n);
      if (m) { menuOffre = { at: Date.now(), m }; dlg.attendReponse = Date.now() + 120000; return say(`${/\bdemain\b/.test(n) ? 'Demain soir' : 'Ce soir'}, au menu : ${min1(m.plat)}${m.note ? `, ${m.note}` : ''}.${m.double ? ' Fais-en double : le reste sera ton déjeuner de demain.' : ''} On le lance ? Ou dis « autre chose ».`); }
    }
    if (!AI.ready()) return say('Pour les idées de repas, il me faut mon cerveau en ligne.');
    face.set('think'); NOYAU.etiquette('CUISINE');
    const cx = await contexte(), h = new Date().getHours();
    const moment = /\b(midi|dejeuner)\b/.test(n) ? 'le déjeuner' : /\b(petit dej|petit dejeuner|matin)\b/.test(n) ? 'le petit-déjeuner' : /\b(collation|gouter|encas)\b/.test(n) ? 'une collation' : /\bapres (l |mon |la )?(entrainement|seance|sport|gym|krav)\b/.test(n) ? 'le repas de récupération après l’entraînement' : h < 11 ? 'le petit-déjeuner' : h < 15 ? 'le déjeuner' : 'le dîner';
    const temps = +((n.match(/\ben (\d{1,3}) ?min/) || [])[1] || 0) || (/\b(vite|rapide|rapidement|pas le temps)\b/.test(n) ? 20 : 0);
    const pers = +((n.match(/\bpour (\d{1,2})\b/) || [])[1] || 0) || (cx.enfant ? 2 : 1);
    const consigne = `Tu es le coach nutrition et le chef d'un père sportif (gymnastique, krav maga) qui veut l'alimentation la moins transformée possible. ${REGLES} Propose 3 idées pour ${moment}, pour ${pers} personne${pers > 1 ? 's' : ''}${cx.enfant ? ' dont son fils (enfant sportif)' : ''}${temps ? `, prêtes en ${temps} minutes au plus` : ''}. Utilise d'abord ce qu'il a, et surtout ce qui va se perdre ; ajoute les légumes prêts au potager ; varie par rapport aux derniers repas. Réponds UNIQUEMENT en JSON : {"idees": [{"plat": "nom court", "pourquoi": "moins de 18 mots : le lien avec son entraînement et ce qu'il a", "minutes": 25, "manque": ["ingrédients à acheter, s'il en faut"]}]}`;
    const donnees = `Garde-manger : ${cx.st.map(x => x.nom).join(', ') || 'inconnu (rien de noté)'}.\nÀ finir vite : ${cx.vite.join(', ') || 'rien'}.\nPrêt au potager : ${cx.potager.join(', ') || 'rien'}.\nEntraînements : ${texteSport(cx.sport)}.\nDerniers repas : ${cx.repas.join(', ') || 'inconnus'}.`;
    let r = null;
    try { const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: donnees }], { maxTokens: 700, temperature: 0.7, json: true })); r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { r = null; }
    face.set('idle'); NOYAU.etiquette(null);
    const l = ((r && r.idees) || []).filter(x => x && x.plat).slice(0, 3);
    if (!l.length) return say("Je n'arrive pas à trouver d'idées pour le moment. Réessaie dans un instant.");
    idees = { at: Date.now(), l, pers }; dlg.attendReponse = Date.now() + 120000;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,600px)"><small style="letter-spacing:.3em;color:#fcd34d">${esc(moment.toUpperCase())} · ${pers} PERS. · ${esc(texteSport(cx.sport).toUpperCase().slice(0, 70))}</small>${l.map((x, i) => `<div style="margin:12px 0;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.05)"><b style="font-size:18px">${i + 1}. ${esc(x.plat)}</b>${x.minutes ? ` <span style="color:#94a3b8">· ${+x.minutes} min</span>` : ''}<div style="font-size:15px;color:#cbd5e1;margin-top:4px">${esc(x.pourquoi || '')}</div>${(x.manque || []).length ? `<div style="font-size:14px;color:#fca5a5;margin-top:4px">À acheter : ${esc(liste(x.manque))}</div>` : ''}</div>`).join('')}</div>`);
    const e0 = cx.sport[0], now0 = Date.now() / 1000, dem = e0 && new Date(e0.debut * 1000).getDate() !== new Date().getDate();
    const intro = !e0 ? 'Jour de repos : ' : e0.fin < now0 ? `Après ${e0.enfant ? 'la séance de ton fils' : 'ta séance'}, pour récupérer : ` : `Avant ${e0.enfant ? 'la séance de ton fils' : 'ta séance'}${dem ? ' demain' : ''} à ${hh(e0.debut)} : `;
    return say(`${intro}je te propose ${l.map((x, i) => `${['un', 'deux', 'trois'][i]}, ${min1(x.plat)}`).join(' ; ')}. Laquelle on fait ? Dis « la deuxième », par exemple.`);
  }
  async function choisis(k) {
    const x = idees.l[k]; const pers = idees.pers; idees = null; dlg.attendReponse = 0;
    if ((x.manque || []).length) {
      const deja = (S.listes || []).filter(y => y.liste === 'courses').map(y => N(y.text)), neufs = x.manque.filter(i => !deja.includes(N(i)));
      if (neufs.length) { S.listes = (S.listes || []).concat(neufs.map((t, i) => ({ id: Date.now() + i, liste: 'courses', text: t, at: Date.now() }))); save(); await say(`Il te manque ${liste(neufs)} : je l'ajoute aux courses.`); }
    }
    try { await appel({ action: 'repas', plat: x.plat }); } catch (e) { /* tant pis */ }
    return handle(`on fait la recette de ${x.plat} pour ${pers}`); // le chef, étape par étape
  }

  let menusOffre = null;
  /* ---------- les menus de la semaine : gardés, avec les décongélations, les restes du midi et le batch cooking du dimanche ---------- */
  const RAYONS = ['fruits et légumes', 'boucherie et poisson', 'crèmerie et œufs', 'épicerie', 'boulangerie', 'surgelés', 'autre'];
  const rayonDe = nom => { const n = N(nom); return /\b(poulet|dinde|boeuf|steak|veau|porc|agneau|viande|hache|saumon|cabillaud|poisson|crevettes|maquereau|sardines|thon|truite|moules|merlu|colin)\b/.test(n) ? 'boucherie et poisson' : /\b(oeufs?|lait|yaourts?|skyr|fromages?|beurre|creme|kefir|comte|feta|mozzarella|chevre|fromage blanc)\b/.test(n) ? 'crèmerie et œufs' : /\b(pain|baguette)\b/.test(n) ? 'boulangerie' : /\b(surgele|congele)\b/.test(n) ? 'surgelés' : /\b(pates|riz|quinoa|boulgour|semoule|avoine|lentilles|pois chiches|haricots secs|haricots rouges|farine|huile|vinaigre|miel|epices|noix|amandes|noisettes|graines|conserves?|coulis|sarrasin|cafe|the|chocolat|sel|poivre|moutarde|sauce soja|levure)\b/.test(n) ? 'épicerie' : /\b(tomates?|courgettes?|poivrons?|aubergines?|brocolis?|chou|choux|haricots? verts?|concombres?|poireaux?|carottes?|betteraves?|navets?|legumes?|avocats?|salades?|epinards?|champignons?|oignons?|ail|echalotes?|pommes? de terre|patates?|courges?|potiron|citrons?|bananes?|pommes?|poires?|oranges?|kiwis?|fruits?|herbes|persil|basilic|coriandre|gingembre|menthe|fraises?|framboises?|myrtilles?|raisin|clementines?)\b/.test(n) ? 'fruits et légumes' : 'autre'; };
  const ajouteCourses = items => { const deja = (S.listes || []).filter(y => y.liste === 'courses').map(y => N(y.text)); const neufs = items.filter(i => i && !deja.includes(N(i))); S.listes = (S.listes || []).concat(neufs.map((x, i) => ({ id: Date.now() + i, liste: 'courses', text: x, at: Date.now() }))); if (neufs.length) save(); return neufs; };
  const dateJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const auj = () => dateJ(new Date());
  async function menus(auto) {
    if (!AI.ready()) { await say('Pour les menus, il me faut mon cerveau en ligne.'); return null; }
    face.set('think'); NOYAU.etiquette('CUISINE'); await say(auto ? 'Je prépare toute ta semaine : les menus, les courses et le drive. Ça prend une petite minute.' : 'Je prépare les menus de la semaine, avec tes entraînements et ce que tu as déjà.');
    const cx = await contexte();
    let ag = null; try { ag = await (await fetch(`${root()}/maison/agenda?jours=8`, { cache: 'no-store' })).json(); } catch (e) { /* rien */ }
    const dates = Array.from({ length: 7 }, (v, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
    const sem = dates.map(d => { const ev = ((ag && ag.evenements) || []).filter(e => !e.journee && SPORT.test(N(e.titre)) && !/\bpas de\b/.test(N(e.titre)) && dateJ(new Date(e.debut * 1000)) === dateJ(d)); return `${JOURS_SEM[d.getDay()]} ${d.getDate()} : ${ev.map(e => `${hh(e.debut)} ${String(e.titre).replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu, '').trim()}`).join(', ') || 'repos'}`; });
    const congel = cx.st.filter(x => x.lieu === 'congelateur').map(x => x.nom);
    const consigne = `Tu es le coach nutrition et le chef d'un père sportif (gymnastique, krav maga ; son fils fait aussi de la gym) qui veut l'alimentation la moins transformée possible. ${REGLES}
Prépare les DÎNERS des 7 jours donnés, dans l'ordre : variés sur la semaine (poisson deux fois, légumineuses deux fois, œufs, viande blanche, un plat végétarien), légumes de saison du nord de la France, et d'abord ce qu'il a déjà (surtout ce qui va se perdre et le congélateur). En semaine, des plats prêts en 30 minutes ; le week-end, plus généreux. Adapte chaque jour à ses entraînements (après : récupération, protéines et glucides ; la veille d'un gros effort : glucides complexes ; repos : plus léger). Quand c'est malin, cuisine double pour le midi du lendemain ("double": true). "decongeler" : ce qu'il doit sortir du congélateur le matin même. Puis la liste de courses de ce qui MANQUE (pas ce qu'il a), avec une quantité simple et le rayon. Puis le batch cooking du dimanche : 5 à 9 étapes pour préparer en avance les bases de la semaine (céréales, légumineuses, légumes rôtis, sauces maison), avec la durée de chaque étape ; les étapes qui tournent seules (cuisson) laissent faire la suivante en même temps.
Réponds UNIQUEMENT en JSON : {"jours": [{"plat": "…", "note": "moins de 10 mots", "double": false, "decongeler": []}], "courses": [{"article": "…", "quantite": "…", "rayon": "fruits et légumes|boucherie et poisson|crèmerie et œufs|épicerie|boulangerie|surgelés"}], "batch": [{"texte": "phrase courte", "minutes": 0}]}`;
    const donnees = `Les 7 jours et ses entraînements : ${sem.join(' ; ')}.\nGarde-manger : ${cx.st.map(x => x.nom).join(', ') || 'rien de noté'}.\nCongélateur : ${congel.join(', ') || 'rien'}.\nÀ finir vite : ${cx.vite.join(', ') || 'rien'}.\nPrêt au potager : ${cx.potager.join(', ') || 'rien'}.\nDerniers repas : ${cx.repas.join(', ') || 'inconnus'}.${cx.enfant ? '\nSon fils est là en ce moment.' : ''}`;
    let r = null;
    try { const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: donnees }], { maxTokens: 1800, temperature: 0.6, json: true })); r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { r = null; }
    face.set('idle'); NOYAU.etiquette(null);
    const j = ((r && r.jours) || []).filter(x => x && x.plat).slice(0, 7).map((x, i) => ({ date: dateJ(dates[i]), plat: String(x.plat), note: String(x.note || ''), double: !!x.double, decongeler: (x.decongeler || []).map(String) }));
    const co = ((r && r.courses) || []).filter(x => x && x.article).slice(0, 45).map(x => `${x.article}${x.quantite ? ` (${x.quantite})` : ''}`);
    const batch = ((r && r.batch) || []).filter(x => x && x.texte).slice(0, 12).map(x => ({ texte: String(x.texte), minutes: Math.max(0, Math.min(240, +x.minutes || 0)) }));
    if (!j.length) { await say("Je n'arrive pas à faire les menus pour le moment. Réessaie dans un instant."); return null; }
    try { await appel({ action: 'menus', jours: j, batch }); } catch (e) { /* on les a quand même ici */ }
    cacheAt = 0;
    if (auto) return { j, dates, co, ajoutes: ajouteCourses(co), batch }; // la semaine complète : les courses vont directement sur la liste
    menusOffre = { at: Date.now(), co }; dlg.attendReponse = Date.now() + 150000;
    tableauMenus(j, co);
    return say(`Voici les dîners : ${j.map((x, i) => `${JOURS_SEM[dates[i].getDay()]}, ${min1(x.plat)}`).join(' ; ')}.${batch.length ? ` J'ai aussi préparé le batch cooking du dimanche : dis « on lance le batch cooking » quand tu veux.` : ''}${co.length ? ` Il manque ${co.length} articles : je les ajoute à ta liste de courses, rangée par rayon ?` : ''}`);
  }
  function tableauMenus(j, co) {
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,660px)"><small style="letter-spacing:.3em;color:#fcd34d">LES DÎNERS DE LA SEMAINE · ALIMENTATION BRUTE · SPORTIF</small>${j.map(x => { const d = new Date(`${x.date}T12:00:00`); return `<p style="margin:7px 0;font-size:16px"><b style="color:#fde68a">${JOURS_SEM[d.getDay()]} ${d.getDate()}</b> · ${esc(x.plat)}${x.note ? ` <span style="color:#94a3b8">— ${esc(x.note)}</span>` : ''}${x.double ? ' <span style="color:#86efac">· ×2 pour le midi</span>' : ''}${(x.decongeler || []).length ? ` <span style="color:#7dd3fc">· sortir ${esc(liste(x.decongeler))} le matin</span>` : ''}</p>`; }).join('')}${co && co.length ? `<small style="letter-spacing:.3em;color:#86efac">À ACHETER</small><p style="font-size:14px;color:#cbd5e1">${esc(co.join(' · '))}</p>` : ''}</div>`);
  }
  async function menuDuJour(n) {
    let c; try { c = await charge(true); } catch (e) { return null; }
    const d = new Date(); if (/\bdemain\b/.test(n)) d.setDate(d.getDate() + 1);
    const m = (c.menus || []).find(x => x.date === dateJ(d));
    return m || null;
  }
  async function changeJour(t, n) {
    const jj = JOURS_SEM.findIndex(x => n.includes(x)); let c; try { c = await charge(true); } catch (e) { return injoignable(); }
    const cible = (c.menus || []).find(x => (jj >= 0 ? new Date(`${x.date}T12:00:00`).getDay() === jj : /\bdemain\b/.test(n) ? x.date === dateJ(new Date(Date.now() + JOUR * 1000)) : x.date === auj()));
    if (!cible) return say("Je n'ai pas de menu pour ce jour-là. Dis « fais les menus de la semaine ».");
    const envie = (String(t).match(/\b(?:par|en|avec|mets|plutôt)\s+(?:des |du |de la |un |une )?(.+?)\s*[.!?]*$/i) || [])[1] || '';
    face.set('think');
    let r = null;
    try { const raw = String(await AI.chat([{ role: 'system', content: `Tu es le chef d'un père sportif qui mange le moins transformé possible. ${REGLES} Remplace ce dîner par un autre plat${envie ? ` (son envie : ${envie})` : ''}, différent des autres jours. JSON UNIQUEMENT : {"plat": "…", "note": "moins de 10 mots", "decongeler": []}` }, { role: 'user', content: `Plat actuel : ${cible.plat}. Autres jours : ${(c.menus || []).map(x => x.plat).join(', ')}. Garde-manger : ${(c.stock || []).map(x => x.nom).join(', ')}.` }], { maxTokens: 300, temperature: 0.8, json: true })); r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { r = null; }
    face.set('idle');
    if (!r || !r.plat) return say("Je n'ai pas trouvé d'autre idée. Réessaie dans un instant.");
    try { await appel({ action: 'menu_jour', date: cible.date, plat: r.plat, note: r.note || '', decongeler: r.decongeler || [] }); } catch (e) { return injoignable(); }
    cacheAt = 0; fx.ok();
    return say(`C'est changé : ${JOURS_SEM[new Date(`${cible.date}T12:00:00`).getDay()]}, ${min1(r.plat)} à la place de ${min1(cible.plat)}.`);
  }

  /* ---------- la liste de courses par rayon, et le mode magasin (on coche, ça passe au garde-manger) ---------- */
  function courses(magasin, enseigne) {
    const tout = (S.listes || []).filter(x => x.liste === 'courses');
    const l = enseigne && typeof PRIX !== 'undefined' && S.coursesPlan ? tout.filter(x => !PRIX.magasinDe(x.id) || PRIX.magasinDe(x.id) === enseigne) : tout; // le partage entre magasins (« où faire mes courses ? »)
    if (!l.length) return say(tout.length ? `Rien à prendre chez ${enseigne.charAt(0).toUpperCase() + enseigne.slice(1)} dans ton partage : tout est pour l'autre magasin.` : 'Ta liste de courses est vide. Dis « fais les menus de la semaine », ou « ajoute du lait aux courses ».');
    const par = {}; l.forEach(x => { (par[rayonDe(x.text)] = par[rayonDe(x.text)] || []).push(x); });
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,560px)"><small style="letter-spacing:.3em;color:#86efac">LISTE DE COURSES${enseigne ? ` · ${enseigne.toUpperCase()}` : ''} · ${l.length} ARTICLES${magasin ? ' · TOUCHE CE QUE TU PRENDS' : ''}</small>${RAYONS.filter(r => par[r]).map(r => `<div style="margin-top:10px"><b style="color:#fde68a;font-size:14px;letter-spacing:.12em;text-transform:uppercase">${esc(r)}</b>${par[r].map(x => `<label data-cr="${x.id}" style="display:flex;gap:10px;align-items:center;font-size:18px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)"><input type="checkbox" style="width:22px;height:22px"> ${esc(x.text)}</label>`).join('')}</div>`).join('')}</div>`);
    document.querySelectorAll('#board [data-cr] input').forEach(inp => inp.addEventListener('change', () => { if (inp.checked) { const id = +inp.closest('[data-cr]').dataset.cr; const x = (S.listes || []).find(y => y.id === id); if (x) pris([x.text], true); inp.closest('[data-cr]').style.opacity = '.35'; } }));
    if (magasin) return say(`Bonnes courses ! ${l.length} articles, rangés par rayon. Touche chaque article quand il est dans ton panier, ou dis « j'ai pris les tomates ».`);
    return say(`${l.length} articles : ${RAYONS.filter(r => par[r]).map(r => `${r}, ${liste(par[r].map(x => x.text.replace(/\s*\(.*\)$/, '')))}`).join(' ; ')}.`);
  }
  async function pris(items, silencieux) {
    const sortent = (S.listes || []).filter(x => x.liste === 'courses' && items.some(i => N(x.text).includes(N(i)) || N(i).includes(N(x.text).replace(/ \(.*\)$/, ''))));
    if (!sortent.length) return silencieux ? null : say("Ce n'était pas sur la liste, mais je le range au garde-manger.");
    sortent.forEach(x => tomb('listes', x)); S.listes = (S.listes || []).filter(x => !sortent.includes(x)); save();
    const now = Date.now() / 1000;
    try { await appel({ action: 'ajoute', items: sortent.map(x => { const nom = x.text.replace(/\s*\(.*\)$/, ''); const s = sorte(nom); return { nom, lieu: s ? s[1] : 'frigo', perime: s && s[2] < 60 ? Math.round(now + s[2] * JOUR) : null, ultra: !!ultra(nom) }; }) }); cacheAt = 0; } catch (e) { /* plus tard */ }
    const reste = (S.listes || []).filter(x => x.liste === 'courses').length;
    if (silencieux) { if (!reste) await say('Tout est dans le panier ! Bravo.'); return; }
    fx.ok(); return say(reste ? `Coché. Encore ${reste} article${reste > 1 ? 's' : ''}.` : 'Coché. Tout est dans le panier !');
  }

  /* ---------- le batch cooking du dimanche : les bases de la semaine, étape par étape, à la voix ---------- */
  async function batchCooking() {
    let c; try { c = await charge(true); } catch (e) { return injoignable(); }
    const et = c.batch || [];
    if (!et.length) return say("Je n'ai pas encore de batch cooking : dis d'abord « fais les menus de la semaine ».");
    const total = et.reduce((s_, x) => s_ + (x.minutes || 0), 0);
    const ecran = i => showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,620px)"><small style="letter-spacing:.3em;color:#fcd34d">BATCH COOKING · ÉTAPE ${i + 1} / ${et.length}${et[i].minutes ? ` · ⏱ ${et[i].minutes} MIN` : ''}</small><div style="margin-top:10px;font:600 clamp(22px,3.4vw,38px)/1.3 system-ui;color:#fff7ed">${esc(et[i].texte)}</div><div style="margin-top:12px;font-size:14px;color:#94a3b8">${et.slice(i + 1, i + 3).map(x => `Ensuite : ${esc(x.texte)}`).join('<br>')}</div></div>`);
    await say(`Le batch cooking de la semaine : ${et.length} étapes, environ ${Math.round(total / 5) * 5} minutes de cuisson en tout, souvent en même temps. Dis « suivant » pour avancer, « répète », ou « fin du batch ».`);
    let i = -1, silence = 0;
    for (;;) {
      const a = N(await hear({ maxWait: 90000 }) || '');
      if (!a) { if (++silence > 15) break; continue; }
      silence = 0;
      if (/\b(fin du batch|on arrete|stop|j ai fini|termine)\b/.test(a)) break;
      if (/\b(repete|redis|pardon)\b/.test(a) && i >= 0) { await say(et[i].texte); continue; }
      if (/\b(precedent|precedente|retour)\b/.test(a)) i = Math.max(0, i - 1);
      else if (/\b(suivant|suivante|apres|ensuite|on commence|c est parti|go|vas y|c est fait|ok|continue)\b/.test(a)) i++;
      else { await say('Dis « suivant », « répète », « précédent » ou « fin du batch ».'); continue; }
      if (i >= et.length) { await say('Le batch cooking est fini : ta semaine est prête. Range les boîtes au frigo, elles tiennent trois à quatre jours.'); fx.ok(); break; }
      ecran(i); await say(`Étape ${i + 1}. ${et[i].texte}`);
      if (et[i].minutes >= 3) { const fin = Date.now() + et[i].minutes * 60000, txt = et[i].texte; setTimeout(() => PROACTIF.annonce(`batch-${fin}`, async () => { fx.tone([[1047, 0.15], [1319, 0.15], [1568, 0.3]]); return `Minuteur du batch : ${txt.slice(0, 90)}, c'est prêt.`; }, { urgent: true, expire: fin + 10 * 60000 }), et[i].minutes * 60000); await say(`Minuteur de ${et[i].minutes} minutes lancé. Tu peux passer à l'étape suivante en attendant.`); }
    }
    setTimeout(() => { try { hideBoard(); } catch (e) { /* rien */ } }, 20000);
  }

  /* ---------- le bilan de la semaine en cuisine ---------- */
  async function bilan() {
    let c; try { c = await charge(true); } catch (e) { return injoignable(); }
    const sem = Date.now() / 1000 - 7 * JOUR, achats = (c.stock || []).filter(x => x.at > sem), ul = achats.filter(x => x.ultra);
    const rep = (c.repas || []).filter(x => x.at > sem).map(x => N(x.plat));
    const compte = re => rep.filter(x => re.test(x)).length;
    const poisson = compte(/\b(saumon|cabillaud|poisson|maquereau|sardine|thon|truite|merlu|colin|crevette|moules)\b/), leg = compte(/\b(lentilles?|pois chiches?|haricots? (rouges|blancs|secs)|feves?|dahl|houmous)\b/);
    const p = [];
    p.push(achats.length ? `sur ${achats.length} produits rangés cette semaine, ${ul.length ? `${ul.length} ultra-transformé${ul.length > 1 ? 's' : ''} (${liste(ul.slice(0, 3).map(x => x.nom))})` : 'aucun ultra-transformé, bravo'}` : 'Pas de courses notées cette semaine');
    p.push(rep.length ? `${rep.length} repas cuisiné${rep.length > 1 ? 's' : ''} avec moi, dont ${poisson} avec du poisson et ${leg} avec des légumineuses` : 'pas de repas cuisiné avec moi');
    if (rep.length && poisson < 2) p.push('vise deux poissons la semaine prochaine, pour les oméga-3 et la récupération');
    if (rep.length && leg < 2) p.push('et deux repas de légumineuses');
    return say(`Ta semaine en cuisine : ${p.join(' ; ')}.`.replace(': Pas de', ': pas de'));
  }

  /* ---------- la semaine complète : les menus, les courses (sans ce qu'il a déjà), le drive d'abord, le panier prêt à valider ---------- */
  let semaineOffre = null;
  async function semaine() {
    semaineOffre = null;
    const r = await menus(true); if (!r) return;
    let p = null; if (typeof PRIX !== 'undefined') { try { p = await PRIX.planDrive(); } catch (e) { p = null; } }
    const nb = (S.listes || []).filter(x => x.liste === 'courses').length;
    const nDrive = typeof PRIX !== 'undefined' ? PRIX.drive(true) : 0; // l'écran : un lien par article pour le panier drive
    S.semainePrete = { at: Date.now() }; save();
    const eu = v => (typeof PRIX !== 'undefined' ? PRIX.euros(v) : `${Math.round(v)} €`);
    const plats = r.j.slice(0, 7).map((x, i) => `${JOURS_SEM[r.dates[i].getDay()]}, ${min1(x.plat)}`);
    const prixTxt = p && p.connus ? ` Pour ${p.connus} articles dont je connais le prix au Leclerc, compte environ ${eu(p.totalDrive)}.` : '';
    const autreTxt = p && p.autre ? ` Pour économiser ${eu(p.autre.eco)}, prends ${liste(p.autre.items.slice(0, 3).map(x => x.text.replace(/\s*\(.*\)$/, '')))}${p.autre.items.length > 3 ? '…' : ''} chez ${p.MAG[p.autre.m]} : je l'ai mis de côté.` : '';
    fx.ok();
    return say(`C'est prêt. Les dîners : ${plats.join(' ; ')}. J'ai mis ${r.ajoutes.length} article${r.ajoutes.length > 1 ? 's' : ''} sur ta liste, sans ce que tu as déjà : ${nb} en tout. Au drive Leclerc : ${nDrive} article${nDrive > 1 ? 's' : ''}.${prixTxt}${autreTxt} À l'écran, touche chaque article pour le mettre dans ton panier, puis valide et choisis ton créneau. Dis-moi ensuite « j'ai commandé le drive pour samedi 10 heures » : je te rappellerai le retrait.`);
  }
  // « j'ai commandé le drive pour samedi 10 h » : le rappel du retrait (45 minutes avant)
  function quandDe(n) {
    const d = new Date(); const jj = JOURS_SEM.findIndex(x => new RegExp(`\\b${x}\\b`).test(n));
    if (/\bapres demain\b/.test(n)) d.setDate(d.getDate() + 2); else if (/\bdemain\b/.test(n)) d.setDate(d.getDate() + 1); else if (jj >= 0) d.setDate(d.getDate() + (((jj - d.getDay()) % 7) + 7) % 7);
    const h = n.match(/\b(\d{1,2}) ?(?:h|heures?)(?: ?(\d{1,2}))?\b/); if (!h) return null;
    d.setHours(+h[1], h[2] ? +h[2] : 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 7);
    return d;
  }
  async function driveCommande(n) {
    const d = quandDe(n);
    S.driveCommande = { at: Date.now(), retrait: d ? +d : 0 }; save();
    if (!d) return say("C'est noté. À quel moment tu le récupères ? Dis par exemple : je récupère le drive samedi à 10 heures.");
    const fin = +d - 45 * 60000;
    if (fin > Date.now()) { S.minuteurs = S.minuteurs || []; S.minuteurs.push({ id: Date.now(), nom: `récupérer le drive Leclerc à ${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, '0')}` : ''}`, fin, total: (fin - Date.now()) / 1000, type: 'rappel' }); save(); }
    fx.ok();
    return say(`Parfait. Retrait ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })} à ${d.getHours()} heures${d.getMinutes() ? ` ${d.getMinutes()}` : ''} : je te le rappelle trois quarts d'heure avant. Quand tu l'as récupéré, dis « j'ai récupéré le drive » : je range tout au garde-manger.`);
  }
  async function driveRecupere() {
    const l = (S.listes || []).filter(x => x.liste === 'courses' && (!S.coursesPlan || !S.coursesPlan[x.id] || S.coursesPlan[x.id] === 'leclerc'));
    if (!l.length) return say("Ta liste ne contient plus rien pour le drive. Si tu as des produits à ranger, dis « j'ai acheté… ».");
    await pris(l.map(x => x.text.replace(/\s*\(.*\)$/, '')), true);
    S.driveCommande = null; save();
    const reste = (S.listes || []).filter(x => x.liste === 'courses');
    fx.ok();
    return say(`C'est rangé : ${l.length} produits du drive au garde-manger.${reste.length ? ` Il reste ${reste.length} article${reste.length > 1 ? 's' : ''} à prendre ${S.coursesPlan && reste.some(x => S.coursesPlan[x.id] && S.coursesPlan[x.id] !== 'leclerc') ? 'dans l\'autre magasin' : 'ailleurs'}.` : ''} Pense à photographier le ticket, ou la facture du drive, pour que je retienne les prix.`);
  }

  /* ---------- après une recette (le chef le demande) : ce qui a servi sort du garde-manger ---------- */
  async function apresRecette(titre, ingredients) {
    let c; try { c = await charge(true); } catch (e) { return; }
    const ing = (ingredients || []).map(N), servis = (c.stock || []).filter(x => ing.some(i => i.includes(N(x.nom)) || N(x.nom).split(' ').some(w => w.length > 3 && i.includes(w)))).map(x => x.nom);
    try { await appel({ action: 'repas', plat: titre }); } catch (e) { /* rien */ }
    if (!servis.length) return;
    if (await askYesNo(`J'enlève du garde-manger ce que tu as utilisé : ${liste(servis)} ?`)) { try { await appel({ action: 'retire', noms: servis }); cacheAt = 0; } catch (e) { /* rien */ } await say("C'est fait. Bon appétit !"); }
  }

  /* ---------- tous les jours vers 17 h : ce qui va se perdre ---------- */
  async function veille() {
    const h0 = new Date().getHours();
    if (h0 >= 7 && h0 < 11 && S.cuisineMatin !== dayKey() && dlg.started && (typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal())) {
      const m = await menuDuJour('').catch(() => null);
      if (m && (m.decongeler || []).length) PROACTIF.annonce(`decongeler-${dayKey()}`, () => { S.cuisineMatin = dayKey(); save(); return `Ce soir, c'est ${m.plat} : sors ${liste(m.decongeler)} du congélateur maintenant, et mets-le au frigo. Il sera prêt pour le dîner.`; }, { expire: Date.now() + 3 * 3600000 });
    }
    if (new Date().getDay() === 0 && h0 >= 13 && h0 < 16 && S.cuisineBatch !== dayKey() && dlg.started) {
      const c = await charge().catch(() => null);
      if (c && (c.batch || []).length) PROACTIF.annonce(`batch-${dayKey()}`, () => { S.cuisineBatch = dayKey(); save(); return "C'est dimanche après la gym : on prépare les bases de la semaine ? Dis « on lance le batch cooking », c'est une heure à peu près, et ta semaine sera prête."; }, { expire: Date.now() + 3 * 3600000 });
    }
    if (new Date().getDay() === 5 && h0 >= 18 && h0 < 21 && S.cuisineSemaine !== dayKey() && dlg.started && S.settings.semaineAuto !== false && (typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal())) {
      PROACTIF.annonce(`semaine-${dayKey()}`, () => { S.cuisineSemaine = dayKey(); save(); semaineOffre = { at: Date.now() }; dlg.attendReponse = Date.now() + 120000; return "C'est vendredi : je prépare la semaine prochaine ? Les menus, les courses, et ton panier drive prêt à valider."; }, { expire: Date.now() + 3 * 3600000 });
    }
    const h = new Date().getHours(); if (h < 17 || h >= 19 || S.cuisineDit === dayKey() || !dlg.started) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    let c; try { c = await charge(true); } catch (e) { return; }
    const now = Date.now() / 1000, vite = (c.stock || []).filter(x => x.perime && x.lieu !== 'congelateur' && x.perime - now < 1.5 * JOUR);
    if (!vite.length) return;
    PROACTIF.annonce(`cuisine-${dayKey()}`, () => { S.cuisineDit = dayKey(); save(); return `Anti-gaspi : ${liste(vite.map(x => x.nom))} ${vite.length > 1 ? 'sont' : 'est'} à finir d'ici demain. Dis « qu'est-ce qu'on mange ce soir ? » et je te propose un plat avec.`; }, { expire: Date.now() + 2 * 3600000 });
  }
  setInterval(() => { veille().catch(() => {}); }, 15 * 60000);

  /* ---------- ce qu'on lui dit ---------- */
  function route(t, n) {
    if (idees && Date.now() - idees.at < 180000) {
      const k = /\b(la premiere|la 1|le premier|la une|numero un|premiere)\b/.test(n) ? 0 : /\b(la deuxieme|la seconde|la 2|le deuxieme|numero deux|deuxieme)\b/.test(n) ? 1 : /\b(la troisieme|la 3|le troisieme|numero trois|troisieme|la derniere)\b/.test(n) ? 2 : idees.l.findIndex(x => N(x.plat).split(' ').some(w => w.length > 4 && n.includes(w)));
      if (k >= 0 && idees.l[k] && n.split(' ').length <= 8) return () => choisis(k);
    }
    if (menusOffre && Date.now() - menusOffre.at < 180000 && /^(oui|ouais|ok|d accord|vas y|ajoute|ajoute les|bien sur)\b/.test(n)) return () => { const co = menusOffre.co; menusOffre = null; dlg.attendReponse = 0; const neufs = ajouteCourses(co); fx.ok(); return say(`C'est fait : ${neufs.length} article${neufs.length > 1 ? 's' : ''} sur ta liste de courses, rangée par rayon. Dis « mode magasin » au supermarché.`); };
    if (semaineOffre && Date.now() - semaineOffre.at < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|carrement|go|prepare)\b/.test(n)) return semaine;
      if (/^(non|pas la peine|pas cette semaine|laisse)\b/.test(n)) return () => { semaineOffre = null; dlg.attendReponse = 0; return say("D'accord. Dis « prépare ma semaine » quand tu veux."); };
    }
    if (/\b(prepare|organise|fais|planifie)( moi)? (toute |tout |ma |la )?(ma )?semaine\b|\bfais tout pour la semaine\b|\b(menus?|repas) et (les )?courses de la semaine\b|\bla semaine complete\b/.test(n)) return semaine;
    if (/\b(j ai|on a)\s+(commande|valide|passe commande|reserve)\b.*\bdrive\b|\b(je recupere|je vais chercher|retrait) (le |mon )?drive\b/.test(n)) return () => driveCommande(n);
    if (/\b(j ai|on a)\s+(recupere|recu|ramene|ete chercher)\s+(le |mon )?drive\b|\bdrive recupere\b/.test(n)) return driveRecupere;
    if (/\b(arrete|ne|plus)\b.*\b(propose|proposer)\b.*\bsemaine\b/.test(n)) return () => { S.settings.semaineAuto = false; save(); return say("D'accord, je ne te proposerai plus de préparer la semaine le vendredi. Dis « prépare ma semaine » quand tu veux."); };
    if (menuOffre && Date.now() - menuOffre.at < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|on le lance|lance|c est parti|go)\b/.test(n)) return () => { const m = menuOffre.m; menuOffre = null; dlg.attendReponse = 0; appel({ action: 'repas', plat: m.plat }).catch(() => {}); return handle(`on fait la recette de ${m.plat} pour ${m.double ? 4 : 2}`); };
      if (/\b(autre chose|autre idee|pas envie|non)\b/.test(n)) return () => { menuOffre = null; dlg.attendReponse = 0; return quoiManger('autre chose', 'autre chose'); };
    }
    if (inventaireOffre && Date.now() - inventaireOffre.at < 120000) {
      if (/^(oui|ouais|ok|d accord|vas y|range|bien sur)\b/.test(n)) return async () => { const o = inventaireOffre; inventaireOffre = null; dlg.attendReponse = 0; const now = Date.now() / 1000; try { await appel({ action: 'ajoute', items: o.l.map(nom => { const s = sorte(nom); return { nom, lieu: o.lieu, perime: o.lieu === 'congelateur' ? Math.round(now + 90 * JOUR) : s && s[2] < 60 ? Math.round(now + s[2] * JOUR) : null, ultra: !!ultra(nom) }; }) }); } catch (e) { return injoignable(); } cacheAt = 0; fx.ok(); return say(`C'est rangé : ${o.l.length} produits.`); };
      if (/^(non|pas la peine|laisse)\b/.test(n)) return () => { inventaireOffre = null; dlg.attendReponse = 0; return say("D'accord, je ne range rien."); };
    }
    if (/\b(j ai|on a|je viens d)\s*(achete|rapporte|ramene|recu|fait les courses)\b/.test(n) && !/\b(cochons? d ?inde|carre|potager|serre)\b/.test(n)) return () => achete(t, n);
    if (/\b(j ai|on a)\s+(mis|range|ajoute)\b.*\b(frigo|placard|congelateur|freezer)\b/.test(n)) return () => achete(t, n);
    if (/\b(il n y a plus|il y a plus|plus de|on n a plus|j ai plus|y a plus)\b.*\b\w+/.test(n) && !/\b(batterie|reseau|wifi|internet|son|lumiere|courant)\b/.test(n) && /^(il n y a plus|il y a plus|y a plus|on n a plus|j ai plus|plus de)\b/.test(n)) return () => fini(t, n);
    if (/\b(j ai|on a)\s+(fini|termine|utilise|mange|jete)\s+(le|la|les|l|du|de la|des|mes)\b/.test(n) && !/\b(recette|plat|entrainement|seance|travail)\b/.test(n)) return () => fini(t, n);
    if (/\b(a consommer avant|perime|periment|expire|bon jusqu)\b/.test(n)) return () => peremption(t, n);
    if (/\b(qu est ce qu il y a|qu y a t il|quoi)\b.*\b(frigo|refrigerateur|placard|congelateur|garde manger)\b|\b(mon|le) garde manger\b/.test(n) && !/\b(inventaire|regarde)\b/.test(n)) return () => contenu(n);
    if (/\b(inventaire|regarde|scanne)\b.*\b(frigo|refrigerateur|placard|congelateur)\b/.test(n)) return () => inventaire(n);
    if (/\b(change|remplace|modifie)\b.*\b(menu|diner|repas|plat)\b/.test(n) && (JOURS_SEM.some(x => n.includes(x)) || /\b(demain|ce soir|aujourd hui)\b/.test(n))) return () => changeJour(t, n);
    if (/\b(quels? (sont les )?menus|les menus de la semaine|nos menus|mes menus)\b/.test(n) && !/\b(fais|prepare|genere|cree|refais|nouveaux)\b/.test(n)) return async () => { let c; try { c = await charge(true); } catch (e) { return injoignable(); } const j = (c.menus || []).filter(x => x.date >= auj()); if (!j.length) return menus(); tableauMenus(j, []); return say(`Au menu : ${j.map(x => `${JOURS_SEM[new Date(`${x.date}T12:00:00`).getDay()]}, ${x.plat}`).join(' ; ')}.`); };
    if (/\b(menus? de la semaine|menus? pour la semaine|planning des repas|les repas de la semaine|organise les repas|fais (les|mes|nos) menus|prepare (les|mes|nos) menus)\b/.test(n)) return menus;
    if (/\b(batch cooking|batch|preparation de la semaine|on prepare la semaine|cuisine de la semaine)\b/.test(n) && /\b(lance|on lance|commence|on fait|demarre|c est parti|on y va|batch cooking)\b/.test(n)) return batchCooking;
    if (/\b(mode magasin|je (pars|vais) faire (les|des) courses|je suis (au|chez) (supermarche|magasin|marche|aldi|leclerc|lidl)|on fait les courses)\b/.test(n)) return () => courses(true, (n.match(/\b(aldi|leclerc|lidl)\b/) || [])[1] || '');
    if (/\b(liste de courses|la liste des courses|mes courses)\b/.test(n) && /\b(par rayon|rayons|lis|montre|affiche|qu est ce qu il y a|quoi)\b/.test(n)) return () => courses(false);
    if (/^(j ai pris|c est pris|j ai trouve|dans le panier)\b/.test(n)) return () => pris(String(t).replace(/^.*?(?:pris|trouvé|trouve|panier)\s*:?\s*/i, '').split(/\s*(?:,|\bet\b)\s*/).map(x => x.replace(/^(les|le|la|l'|l’|des|du|de la)\s+/i, '').trim()).filter(Boolean));
    if (/\b(bilan|point)\b.*\b(cuisine|alimentation|nutrition|repas|ce que je mange)\b/.test(n)) return bilan;
    if (/\b(qu est ce qu on mange|on mange quoi|qu est ce que je mange|je mange quoi|idees? de (repas|plat|diner|dejeuner)|quoi manger|que manger|quoi cuisiner|qu est ce que je (fais|cuisine|prepare) (a manger|ce soir|ce midi|pour le diner)|repas (apres|avant) (l |mon |la )?(entrainement|seance|sport|gym|krav))\b/.test(n)) return () => quoiManger(t, n);
    return null;
  }
  // des produits à ranger d'un coup (un ticket de caisse) : chacun à sa place, avec sa date limite estimée
  async function ajouteStock(noms) {
    const now = Date.now() / 1000;
    const items = (noms || []).map(x => String(x).trim()).filter(Boolean).slice(0, 60).map(nom => { const s_ = sorte(nom); return { nom, lieu: s_ ? s_[1] : 'frigo', perime: s_ && s_[2] < 60 ? Math.round(now + s_[2] * JOUR) : null, ultra: !!ultra(nom) }; });
    if (items.length) { await appel({ action: 'ajoute', items }); cacheAt = 0; }
    return items.length;
  }
  return { route, apresRecette, ajouteStock, _charge: charge };
})();

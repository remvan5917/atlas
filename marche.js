/* =========================================================
   ATLAS — le tableau de bord du trading (des infos, jamais des conseils)
   - Les cours relevés par l'ordinateur de la maison (/atlas/marche) : or et argent au comptant, cuivre,
     euro-dollar (gold-api.com, toutes les 2 minutes) ; pas de source gratuite fiable pour les indices.
   - Le calendrier économique de la semaine (ForexFactory) : les annonces importantes des États-Unis
     et de la zone euro, avec la prévision et le chiffre précédent.
   - Les alertes : 5 minutes avant une annonce à fort impact, et avant l'ouverture de Wall Street.
   - « Affiche le graphique de l'or » : un graphique minimal (zigzag et canal), rien d'autre.
   ========================================================= */
'use strict';

const MARCHE = (() => {
  const INSTR = {
    XAU: { nom: "l'or", court: 'OR', unite: 'dollars', dec: 1, re: /\b(l or|or|gold|xau|mgc)\b/ },
    XAG: { nom: "l'argent", court: 'ARGENT', unite: 'dollars', dec: 2, re: /\b(argent metal|l argent|silver|xag|sil)\b/ },
    HG: { nom: 'le cuivre', court: 'CUIVRE', unite: 'dollars la livre', dec: 3, re: /\b(cuivre|copper)\b/ },
    EURUSD: { nom: "l'euro-dollar", court: 'EUR/USD', unite: '', dec: 4, re: /\b(euro dollar|eur usd|eurusd|l euro|m6e|6e)\b/ },
  };
  const fr = (x, d) => Number(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  let etat = null, etatAt = 0;
  async function lire(serie = '', h = 24) {
    const root = VOIXMAISON.root();
    if (!root) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 6000);
    try {
      const r = await fetch(`${root}/atlas/marche?serie=${encodeURIComponent(serie)}&h=${h}`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`marché ${r.status}`);
      const j = await r.json();
      if (!serie) { etat = j; etatAt = Date.now(); }
      return j;
    } finally { clearTimeout(tm); }
  }
  const frais = async () => (etat && Date.now() - etatAt < 60000 ? etat : lire());

  /* ---------- les annonces : en français, à l'oral (sans sigles, que la voix lirait mal) ---------- */
  const TITRES = [
    [/^ADP Non-Farm/i, "l'emploi privé"], [/Non-Farm Employment Change/i, "les chiffres de l'emploi"], [/^Unemployment Rate/i, 'le taux de chômage'],
    [/^Unemployment Claims/i, 'les inscriptions hebdomadaires au chômage'], [/JOLTS/i, "les offres d'emploi"], [/Average Hourly Earnings/i, 'les salaires horaires'],
    [/Prelim CPI|Flash CPI/i, "l'inflation provisoire"], [/^Core CPI/i, "l'inflation sous-jacente"], [/CPI/i, "l'inflation"], [/^Core PPI/i, 'les prix à la production hors énergie'], [/PPI/i, 'les prix à la production'],
    [/Core PCE/i, "l'inflation préférée de la Fed, les dépenses de consommation"], [/Federal Funds Rate/i, 'la décision de taux de la Fed'],
    [/FOMC Statement/i, 'le communiqué de la Fed'], [/FOMC Press Conference/i, 'la conférence de presse de la Fed'], [/FOMC (Meeting )?Minutes/i, 'le compte rendu de la Fed'],
    [/(Fed Chair|Powell).*Speaks/i, 'un discours du président de la Fed'], [/GDP/i, 'la croissance du produit intérieur brut'],
    [/^Core Retail Sales/i, 'les ventes au détail hors automobile'], [/Retail Sales/i, 'les ventes au détail'], [/ISM Manufacturing/i, "l'indice des directeurs d'achat de l'industrie"],
    [/ISM Services/i, "l'indice des directeurs d'achat des services"], [/Flash Manufacturing PMI/i, "l'indice d'activité de l'industrie"], [/Flash Services PMI/i, "l'indice d'activité des services"],
    [/Consumer Confidence|Consumer Sentiment/i, 'la confiance des consommateurs'], [/Durable Goods/i, 'les commandes de biens durables'], [/Crude Oil Inventories/i, 'les stocks de pétrole'],
    [/Main Refinancing Rate/i, 'la décision de taux de la B.C.E.'], [/ECB Press Conference/i, 'la conférence de presse de la B.C.E.'], [/Monetary Policy Statement/i, 'le communiqué de la B.C.E.'],
    [/(ECB President|Lagarde).*Speaks/i, 'un discours de la présidente de la B.C.E.'], [/ZEW/i, 'le moral des investisseurs allemands'], [/Ifo/i, 'le climat des affaires allemand'],
    [/Inflation Expectations/i, "les anticipations d'inflation"], [/Bank Holiday/i, 'un jour férié'],
  ];
  const PAYS = { USD: 'États-Unis', EUR: 'Zone euro' };
  const titre = a => { const t = TITRES.find(([re]) => re.test(a.titre)); let s = t ? t[1] : a.titre; if (t && /^German/i.test(a.titre)) s += ' allemand'; else if (t && /^French/i.test(a.titre)) s += ' français'; return s; };
  const chiffre = v => String(v || '').replace('%', ' %').replace('.', ',').replace(/^-/, 'moins ').replace(/K$/, ' mille').replace(/M$/, ' millions').replace(/B$/, ' milliards');
  const suivies = a => (a.pays === 'USD' || a.pays === 'EUR') && a.date && !/Bank Holiday/i.test(a.titre);
  const heure = d => `${d.getHours()} h ${deux2(d.getMinutes())}`;
  function dire1(a, avecHeure = true) {
    const d = new Date(a.date);
    return `${avecHeure ? `à ${heure(d)}, ` : ''}${PAYS[a.pays] || a.pays} : ${titre(a)}${a.prevu ? `, prévu ${chiffre(a.prevu)}` : ''}${a.avant ? `, précédent ${chiffre(a.avant)}` : ''}`;
  }

  /* ---------- ce qu'on lui demande ---------- */
  const R = {
    cours: /\b(cours|prix|combien (vaut|coute|fait|est)|ou en est|a combien|niveau|cote)\b.*\b(l or|or|gold|argent|silver|cuivre|euro dollar|eur usd|eurusd|l euro|mgc|m6e)\b|^(et )?(l or|l argent|le cuivre|l euro dollar)( \?)?$/,
    point: /\b(point|resume|etat|tour) (des |du |sur les |sur le )?(marches?|bourse)\b|\b(les marches|le marche) (aujourd hui|ce matin|en ce moment)\b|^(les )?marches?$/,
    annonces: /\b(annonces?|calendrier economique|statistiques? economiques?|stats eco|chiffres? economiques?|news eco|publications? economiques?)\b|\bqu est ce qui (sort|tombe) (aujourd hui|cette semaine|demain)\b/,
    graph: /\b(graphique|graph|courbe|chart)\b/,
    indices: /\b(s and p|s p 500|sp 500|nasdaq|dow jones|dax|cac 40|cac quarante|mes|mnq|e mini|indices?)\b/,
  };
  const instrDe = n => Object.keys(INSTR).find(k => INSTR[k].re.test(n));
  function route(t, n) {
    if (R.graph.test(n) && (instrDe(n) || /\bmarches?\b/.test(n))) return () => graphique(instrDe(n) || 'XAU', /\b(3|trois) jours|semaine|72\b/.test(n) ? 72 : 24);
    if (R.annonces.test(n)) return () => annonces(n);
    if (R.indices.test(n) && /\b(cours|prix|combien|ou en est|niveau|graphique|marche|point)\b/.test(n)) return () => say("Pour les indices, je n'ai pas de source gratuite fiable : je suis l'or, l'argent, le cuivre et l'euro-dollar. Pour le reste, ta plateforme fait foi.");
    if (R.point.test(n)) return () => point();
    if (R.cours.test(n) && instrDe(n)) return () => cours(instrDe(n));
    return null;
  }
  function phraseCours(k, c) {
    const I = INSTR[k];
    let s = `${I.nom.charAt(0).toUpperCase()}${I.nom.slice(1)} : ${fr(c.prix, I.dec)}${I.unite ? ` ${I.unite}` : ''}`;
    if (c.var24 != null) s += `, ${c.var24 > 0.005 ? 'en hausse' : c.var24 < -0.005 ? 'en baisse' : 'stable'}${Math.abs(c.var24) > 0.005 ? ` de ${fr(Math.abs(c.var24), 2)} %` : ''} sur 24 heures`;
    const age = Date.now() / 1000 - c.at;
    if (age > 1800) s += `, dernier cours relevé ${new Date(c.at * 1000).toLocaleDateString('fr-FR', { weekday: 'long' })} à ${heure(new Date(c.at * 1000))}`;
    return s;
  }
  const horsMaison = () => say("Les cours passent par l'ordinateur de la maison, et il ne répond pas. Il est peut-être éteint.");
  async function cours(k) {
    let e; try { e = await frais(); } catch (er) { return horsMaison(); }
    const c = e.cours && e.cours[k];
    if (!c) return say("Je n'ai pas encore de cours pour ça. L'ordinateur de la maison commence à peine à les relever.");
    return say(`${phraseCours(k, c)}.${k === 'XAU' ? ' C’est le cours au comptant : le contrat à terme cote un peu au-dessus.' : ''}`);
  }
  async function point() {
    let e; try { e = await frais(); } catch (er) { return horsMaison(); }
    const parts = ['XAU', 'XAG', 'EURUSD'].filter(k => e.cours && e.cours[k]).map(k => phraseCours(k, e.cours[k]));
    const auj = (e.annonces || []).filter(suivies).filter(a => a.impact === 'High' && dayKey(new Date(a.date)) === dayKey() && new Date(a.date) > Date.now() - 3600000);
    parts.push(auj.length ? `Annonces importantes aujourd'hui : ${auj.map(a => dire1(a)).join(' ; ')}` : "Pas d'annonce à fort impact aujourd'hui pour les États-Unis et la zone euro");
    const ny = wallStreet(); if (ny.ouvert) parts.push('Wall Street est ouverte'); else if (ny.dans != null && ny.dans < 180) parts.push(`Wall Street ouvre dans ${ny.dans} minutes`);
    return say(`${parts.join('. ')}.`);
  }
  async function annonces(n) {
    let e; try { e = await frais(); } catch (er) { return horsMaison(); }
    const semaine = /\bsemaine\b/.test(n), demain = /\bdemain\b/.test(n);
    const jour = dayKey(new Date(Date.now() + (demain ? 86400000 : 0)));
    let l = (e.annonces || []).filter(suivies).filter(a => new Date(a.date) > Date.now() - 1800000);
    if (!semaine) l = l.filter(a => dayKey(new Date(a.date)) === jour);
    l.sort((a, b) => new Date(a.date) - new Date(b.date));
    const jourDe = a => new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long' });
    if (semaine && !l.some(a => a.impact === 'High')) {
      if (!l.length) return say("Plus aucune annonce cette semaine pour les États-Unis et la zone euro.");
      return say(`Pas d'annonce à fort impact cette semaine pour les États-Unis et la zone euro. ${l.length} annonces d'impact moyen, dont ${l.filter(a => a.pays === 'USD').slice(0, 3).concat(l.filter(a => a.pays !== 'USD').slice(0, l.some(a => a.pays === 'USD') ? 0 : 2)).map(a => `${jourDe(a)} ${dire1(a)}`).join(' ; ')}.`);
    }
    if (semaine) l = l.filter(a => a.impact === 'High');
    if (!l.length) return say(`Rien d'important ${demain ? 'demain' : "aujourd'hui"} pour les États-Unis et la zone euro.`);
    const fort = l.filter(a => a.impact === 'High'), autres = l.length - fort.length;
    const dits = (fort.length ? fort : l).slice(0, 6).map(a => (semaine ? `${jourDe(a)} ${dire1(a)}` : dire1(a)));
    return say(`${semaine ? 'Cette semaine' : demain ? 'Demain' : "Aujourd'hui"} : ${dits.join(' ; ')}.${!semaine && fort.length && autres ? ` Et ${autres} annonce${autres > 1 ? 's' : ''} d'impact moyen.` : ''}`);
  }

  /* ---------- Wall Street (9 h 30 à New York, l'heure d'été américaine comprise) ---------- */
  function wallStreet() {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
      if (/Sat|Sun/.test(p.weekday)) return { ouvert: false };
      const m = +p.hour * 60 + +p.minute;
      return { ouvert: m >= 570 && m < 960, dans: m < 570 ? 570 - m : null };
    } catch (e) { return { ouvert: false }; }
  }

  /* ---------- le graphique : un zigzag et un canal tracés à la main, rien d'autre ---------- */
  function zigzag(pts, seuil) {
    if (pts.length < 3) return pts.slice();
    const z = [pts[0]]; let dir = 0, hi = pts[0], lo = pts[0];
    for (const p of pts) {
      if (dir === 0) { // avant le premier retournement : on suit le plus haut et le plus bas
        if (p[1] > hi[1]) hi = p;
        if (p[1] < lo[1]) lo = p;
        if ((hi[1] - lo[1]) / lo[1] >= seuil) { dir = hi[0] > lo[0] ? 1 : -1; const piv = dir === 1 ? lo : hi; if (piv !== pts[0]) z.push(piv); }
      } else if (dir === 1) {
        if (p[1] >= hi[1]) hi = p; else if ((hi[1] - p[1]) / hi[1] >= seuil) { z.push(hi); dir = -1; lo = p; }
      } else if (p[1] <= lo[1]) lo = p; else if ((p[1] - lo[1]) / lo[1] >= seuil) { z.push(lo); dir = 1; hi = p; }
    }
    const der = dir === 1 ? hi : dir === -1 ? lo : pts[pts.length - 1];
    if (der !== z[z.length - 1]) z.push(der);
    if (z[z.length - 1] !== pts[pts.length - 1]) z.push(pts[pts.length - 1]);
    return z;
  }
  function canal(z) {
    const n = z.length; if (n < 3) return null;
    const mx = z.reduce((s, p) => s + p[0], 0) / n, my = z.reduce((s, p) => s + p[1], 0) / n;
    const pente = z.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / (z.reduce((s, p) => s + (p[0] - mx) ** 2, 0) || 1);
    const r = z.map(p => p[1] - (my + pente * (p[0] - mx)));
    return { pente, mx, my, haut: Math.max(...r), bas: Math.min(...r) };
  }
  async function graphique(k, h) {
    let e; try { e = await lire(k, h); } catch (er) { return horsMaison(); }
    const pts = (e.serie || []).map(([t, v]) => [t, v]);
    if (pts.length < 12) return say("Je n'ai pas encore assez de cours enregistrés pour un graphique : l'ordinateur de la maison les relève depuis peu. Redemande-moi dans quelques heures.");
    const I = INSTR[k];
    showBoard(`<div class="graphe"><small>${esc(I.court)} · ${h} H</small><canvas width="1200" height="640"></canvas></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 120000);
    const cv = $('#board canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height, m = 30;
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
    const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])), pad = (hi - lo) * 0.12 || hi * 0.001;
    const X = t => m + (t - t0) / (t1 - t0 || 1) * (W - 2 * m), Y = v => H - m - (v - (lo - pad)) / (hi - lo + 2 * pad) * (H - 2 * m);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255, 217, 160, .18)'; g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.stroke();
    const z = zigzag(pts, Math.max(0.0008, (hi - lo) / ((hi + lo) / 2) / 7));
    const c = canal(z);
    // le canal, comme au crayon : deux traits légèrement irréguliers
    if (c) {
      const trait = dy => { g.beginPath(); for (let i = 0; i <= 24; i++) { const t = t0 + (t1 - t0) * i / 24, v = c.my + c.pente * (t - c.mx) + dy; const x = X(t), y = Y(v) + Math.sin(i * 1.7 + dy) * 1.6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      g.strokeStyle = 'rgba(244, 236, 224, .55)'; g.lineWidth = 2.2; trait(c.haut); trait(c.bas);
    }
    g.strokeStyle = '#ffb547'; g.lineWidth = 4; g.shadowColor = 'rgba(255, 181, 71, .5)'; g.shadowBlur = 10;
    g.beginPath(); z.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.stroke();
    const der = e.cours && e.cours[k];
    return say(der ? `${phraseCours(k, der)}. Voilà le graphique.` : 'Voilà le graphique.');
  }

  /* ---------- les alertes (par la file d'annonces : elles attendent qu'il se taise) ---------- */
  async function veille() {
    if (S.settings.marches === false || !dlg.started || voice.endormi) return;
    let e; try { e = await lire(); } catch (er) { return; }
    const now = Date.now();
    (e.annonces || []).filter(suivies).filter(a => a.impact === 'High').forEach(a => {
      const t = +new Date(a.date), avant = t - now;
      if (avant > 0 && avant <= 6 * 60000) PROACTIF.annonce(`eco-${a.pays}-${a.titre}-${a.date}`, () => `Dans ${Math.max(1, Math.round((t - Date.now()) / 60000))} minutes, ${dire1(a, false)}.`, { urgent: true, expire: t, lumiere: 'marche' });
    });
    const ny = wallStreet();
    if (ny.dans != null && ny.dans <= 5 && ny.dans > 0) PROACTIF.annonce(`ny-${dayKey()}`, () => { const w = wallStreet(); return w.ouvert ? '' : `Ouverture de Wall Street dans ${w.dans || 1} minute${(w.dans || 1) > 1 ? 's' : ''}.`; }, { urgent: true, lumiere: 'marche', expire: now + 6 * 60000 });
  }
  setInterval(veille, 45000);

  // pour le briefing du matin et le cerveau
  async function resumeMatin() {
    try {
      const e = await frais();
      const auj = (e.annonces || []).filter(suivies).filter(a => a.impact === 'High' && dayKey(new Date(a.date)) === dayKey() && new Date(a.date) > Date.now());
      const or = e.cours && e.cours.XAU;
      return [or ? phraseCours('XAU', or) : '', auj.length ? `Côté marchés, à surveiller aujourd'hui : ${auj.slice(0, 3).map(a => dire1(a)).join(' ; ')}` : ''].filter(Boolean).join('. ');
    } catch (er) { return ''; }
  }
  function contexte() {
    if (!etat || Date.now() - etatAt > 30 * 60000) return '';
    const c = Object.keys(INSTR).filter(k => etat.cours && etat.cours[k]).map(k => `${INSTR[k].court} ${etat.cours[k].prix}${etat.cours[k].var24 != null ? ` (${etat.cours[k].var24 > 0 ? '+' : ''}${etat.cours[k].var24} % sur 24 h)` : ''}`).join(', ');
    return c ? `Les cours relevés il y a peu (au comptant, informatifs) : ${c}.` : '';
  }
  setTimeout(() => { if (VOIXMAISON.root()) lire().catch(() => {}); }, 5000);

  return { route, cours, point, annonces, graphique, veille, resumeMatin, contexte, wallStreet, _titre: titre, _zigzag: zigzag };
})();

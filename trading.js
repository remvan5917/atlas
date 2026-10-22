/* =========================================================
   ATLAS — le copilote de trading (de la discipline, jamais des conseils : il ne dit jamais quoi acheter ni vendre)
   - « mode trading » / « je commence ma session » : ne pas déranger sur l'ordinateur, le graphique (l'euro-dollar,
     ou « mode trading sur le Nasdaq »), la lumière de la pièce en blanc net, et le briefing : les annonces à fort impact
     du jour, l'ouverture de Wall Street, l'heure où tout doit être à plat chez Topstep (15 h 10 à Chicago), tes limites.
   - Pendant la session, l'ordinateur prévient (notification + voix, même Atlas fermé) 10 minutes avant chaque annonce
     à fort impact, puis 10 et 2 minutes avant l'heure limite Topstep.
   - « je suis à moins 600 » (le total du jour), « j'ai perdu 200 sur ce trade » (ajouté au jour) : il garde le résultat
     et dit la marge avant ta limite ; à la moitié il propose une pause de 15 minutes, à 80 % il rappelle ta règle : on arrête.
   - « fin de session » / « j'arrête de trader » : tout revient comme avant, il demande ton résultat et le garde.
   - « mes résultats de la semaine », « mes limites », « ma limite du jour est de 800 dollars », « ma perte max est de 2 000 ».
   ========================================================= */
'use strict';

const TRADING = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const pc = d => appel('/maison/pc', d);
  const dollars = x => `${Math.round(Math.abs(x)).toLocaleString('fr-FR')} dollar${Math.round(Math.abs(x)) > 1 ? 's' : ''}`;
  const signe = x => (x > 0 ? `plus ${dollars(x)}` : x < 0 ? `moins ${dollars(x)}` : "à l'équilibre");
  const hm = s => { const d = new Date(s * 1000); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };
  const semaine = () => ![0, 6].includes(new Date().getDay());
  const GRAPHES = [[/\b(nasdaq|mnq)\b/, 'mnq'], [/\b(l or|or|gold|mgc)\b/, 'mgc'], [/\b(argent|silver|sil)\b/, 'sil'], [/\b(dow|mym)\b/, 'mym'], [/\b(petrole|mcl)\b/, 'mcl'], [/\b(euro|eur usd|m6e)\b/, 'm6e']];
  let actif = false, lampes = [], pauseAt = 0;
  appel('/maison/trading').then(e => { actif = !!e.actif; }).catch(() => {});

  // les lampes de la pièce où est Atlas (réglée dans ses paramètres)
  async function lampesIci() {
    const piece = N(S.settings.piece || '').split(' ').filter(w => w.length > 2);
    if (!piece.length) return [];
    const l = (await appel('/maison/appareils', null, 15000)).appareils || [];
    return l.filter(a => a.type === 'lampe' && N(a.nom).split(' ').some(w => piece.includes(w))).map(a => a.id);
  }

  function marge(e) {
    const p = e.pnl, lim = e.limites.jour;
    if (p == null) return '';
    if (p >= 0) return `Tu es à ${signe(p)} aujourd'hui.`;
    const u = -p / lim, reste = lim + p;
    if (u >= 1) return `Tu es à ${signe(p)} : ta limite du jour est atteinte. Ta règle : la session est finie pour aujourd'hui. On coupe.`;
    if (u >= 0.8) return `Tu es à ${signe(p)}, soit ${Math.round(u * 100)} % de ta limite du jour. Ta règle : on arrête pour aujourd'hui. Il ne reste que ${dollars(reste)}.`;
    if (u >= 0.5) {
      if (Date.now() - pauseAt > 20 * 60000) { pauseAt = Date.now(); setTimeout(() => PROACTIF.annonce(`pause-${Date.now()}`, "Les quinze minutes de pause sont passées. Si tu reprends : le stop d'abord, la taille ensuite.", { urgent: true, expire: Date.now() + 15 * 60000 }), 15 * 60000); }
      return `Tu es à ${signe(p)} : la moitié de ta limite du jour. Il reste ${dollars(reste)}. C'est le moment d'une pause de quinze minutes, loin de l'écran : je te préviens quand elle est finie.`;
    }
    return `Tu es à ${signe(p)}. Il te reste ${dollars(reste)} avant ta limite du jour.`;
  }

  async function debut(n) {
    let e; try { e = await appel('/maison/trading', { session: true }); } catch (er) { return say("L'ordinateur de la maison ne répond pas : je ne peux pas lancer le copilote."); }
    actif = true;
    pc({ action: 'nepasderanger', oui: true }).catch(() => {});
    const g = GRAPHES.find(([re]) => re.test(n));
    if (g) pc({ action: 'graphique', cle: g[1] }).catch(() => {});
    try { lampes = await lampesIci(); if (lampes.length) await appel('/maison/commande', { ids: lampes, allume: true, lum: 90, teinte: 70, source: 'routine' }, 20000); } catch (er) { lampes = []; }
    const now = Date.now() / 1000, ann = (e.annonces || []).filter(a => a.at > now);
    const L = [['Annonces fort impact', ann.length ? ann.map(a => `${hm(a.at).replace(' h ', ':')} ${a.titre}`).join(' · ') : 'aucune aujourd\'hui', ann.length ? 'attente' : 'ok'],
      ['Wall Street', e.ouverture_ny > now ? `ouvre à ${hm(e.ouverture_ny).replace(' h ', ':')}` : 'ouvert', 'ok'],
      ['À plat Topstep', hm(e.plat_a).replace(' h ', ':'), e.plat_a - now < 3600 ? 'alerte' : 'ok'],
      ['Limite du jour', `${Math.round(e.limites.jour).toLocaleString('fr-FR')} $`, 'ok'],
      ['Perte max du compte', `${Math.round(e.limites.compte).toLocaleString('fr-FR')} $`, 'ok']];
    if (e.pnl != null) L.push(['Aujourd\'hui', `${e.pnl > 0 ? '+' : ''}${e.pnl} $`, e.pnl < 0 ? 'alerte' : 'ok']);
    try { SCIFI.hud('Copilote de trading', L); } catch (er) { /* pas d'écran */ }
    const dits = [`Mode trading. Notifications coupées${g ? ', graphique ouvert' : ''}${lampes.length ? ', lumière de concentration' : ''}.`];
    if (!semaine()) dits.push("C'est le week-end : les marchés à terme sont fermés.");
    else {
      dits.push(ann.length ? `Annonces à fort impact aujourd'hui : ${ann.map(a => `à ${hm(a.at)}, ${a.titre}`).join(' ; ')}. Je te préviens dix minutes avant.` : "Pas d'annonce à fort impact aujourd'hui pour les États-Unis et la zone euro.");
      if (e.ouverture_ny > now) dits.push(`Wall Street ouvre à ${hm(e.ouverture_ny)}.`);
      dits.push(`Tout doit être à plat à ${hm(e.plat_a)}. Ta limite du jour : ${dollars(e.limites.jour)}.`);
    }
    if (e.pnl != null) dits.push(marge(e));
    dits.push('Le stop avant d\'entrer. Bonne session.');
    return say(dits.join(' '));
  }

  async function fin() {
    actif = false;
    try { await appel('/maison/trading', { session: false }); } catch (er) { /* tant pis */ }
    pc({ action: 'nepasderanger', oui: false }).catch(() => {});
    if (lampes.length) { appel('/maison/commande', { ids: lampes, allume: true, lum: 70, source: 'routine' }, 20000).catch(() => {}); lampes = []; } // la teinte revient à celle de l'heure
    const a = await ask('Session terminée, notifications rétablies. Ton résultat du jour ?', { wait: 20000 });
    const v = a ? montant(a) : null;
    if (v == null) return say("D'accord. Tu me le diras plus tard : « je suis à plus 300 », par exemple.");
    return resultat(v, true);
  }

  // « moins 600 », « plus 250 », « j'ai perdu 1 200 dollars », « zéro »
  function montant(t) {
    const n = N(t);
    if (/\b(zero|rien|a l equilibre|break even|ni gagne ni perdu)\b/.test(n)) return 0;
    const m = String(t).replace(/(\d)[\s .](?=\d{3}\b)/g, '$1').match(/([-−+]|moins|plus)?\s*(\d+(?:[.,]\d+)?)/i);
    if (!m) return null;
    const v = parseFloat(m[2].replace(',', '.'));
    const neg = /^[-−]|^moins/i.test(m[1] || '') || /\b(perdu|perte|perds|negatif|dans le rouge|en moins|stoppe|stop touche|stop pris)\b/.test(n);
    return neg ? -v : v;
  }
  async function resultat(v, total) {
    let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const p = total ? v : (e.pnl || 0) + v;
    try { e = await appel('/maison/trading', { pnl: p }); } catch (er) { return say("Je n'ai pas réussi à le noter."); }
    const sem = e.semaine_jours > 1 ? ` Sur la semaine : ${signe(e.semaine)}.` : '';
    return say(`${total ? 'Noté. ' : `Noté : ${signe(v)} sur ce trade. `}${marge(e)}${sem}`);
  }

  async function bilan() {
    let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const j = Object.entries(e.jours || {}).filter(([k]) => k >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
    if (!j.length) return say("Je n'ai aucun résultat noté cette semaine. Dis-moi « je suis à plus 300 » ou « je suis à moins 200 » en fin de session.");
    const g = j.filter(([, x]) => x > 0).length, pe = j.filter(([, x]) => x < 0).length;
    const pire = j.reduce((a, b) => (b[1] < a[1] ? b : a)), mieux = j.reduce((a, b) => (b[1] > a[1] ? b : a));
    const jour = k => new Date(`${k}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' });
    try { SCIFI.hud('Résultats · 7 jours', j.map(([k, x]) => [jour(k), `${x > 0 ? '+' : ''}${x} $`, x < 0 ? 'alerte' : 'ok']).concat([['Total', `${e.semaine > 0 ? '+' : ''}${e.semaine} $`, e.semaine < 0 ? 'alerte' : 'ok']])); } catch (er) { /* pas d'écran */ }
    return say(`Sur sept jours : ${signe(e.semaine)}, en ${j.length} séance${j.length > 1 ? 's' : ''} : ${g} positive${g > 1 ? 's' : ''}, ${pe} négative${pe > 1 ? 's' : ''}.${mieux[1] > 0 ? ` Meilleure : ${jour(mieux[0])}, ${signe(mieux[1])}.` : ''}${pire[1] < 0 ? ` Plus dure : ${jour(pire[0])}, ${signe(pire[1])}.` : ''}`);
  }

  async function limites(t, n) {
    const v = montant(t.replace(/[-−]/g, ''));
    const k = /\b(compte|totale?|max(imum)? du compte|drawdown|perte max(imale)?(?! du jour| journaliere))\b/.test(n) && !/\b(du jour|journaliere|par jour|quotidienne)\b/.test(n) ? 'compte' : 'jour';
    let e;
    try { e = await appel('/maison/trading', v ? { limites: { [k]: Math.abs(v) } } : undefined); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    return say(`${v ? 'Noté. ' : ''}Ta limite du jour : ${dollars(e.limites.jour)}. Ta perte maximale sur le compte : ${dollars(e.limites.compte)}.`);
  }

  function route(t, n) {
    if (/\b(fin (de (la |ma )?)?(session|trading)|j arrete (de trader|le trading|ma session|la session)|je coupe (le trading|ma session)|session terminee|je termine (ma session|le trading)|fin du mode trading)\b/.test(n)) return fin;
    if (/\b(mode trading|session de trading|copilote de trading|je (commence|lance|demarre|attaque) (ma |la )?(session|journee de trading)|je vais trader|on va trader)\b/.test(n)) return () => debut(n);
    if (/\b(mes resultats|mon bilan (de trading|de la semaine)|resultats? (de la |cette )?semaine|combien j ai (gagne|perdu) cette semaine|mes performances)\b/.test(n) && !/\b(foot|match|ecole)\b/.test(n)) return bilan;
    if (/\b(ma limite|mes limites|limite (du jour|journaliere|de perte)|ma perte max(imale)?)\b/.test(n)) return () => limites(t, n);
    const trade = /\b(dollars?|trade|trading|session|topstep)\b|\$/.test(n + t) || actif;
    if (trade && /\b(je suis (a |en )?(plus|moins|perte|gain|zero|l equilibre)|mon resultat (du jour )?(est|c est)|je termine (a|en)|je finis (a|en))\b/.test(n) && montant(t) != null) return () => resultat(montant(t), true);
    if (trade && /\b(j ai (perdu|gagne|pris|encaisse)|je perds|je gagne|stop (touche|pris)|j ai ete stoppe)\b/.test(n) && /\d/.test(t)) return () => resultat(montant(t), false);
    return null;
  }
  return { route, actif: () => actif, _montant: montant };
})();

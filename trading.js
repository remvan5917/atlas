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
    // TopstepX relié : il connaît déjà les trades et le résultat ; il montre la séance face à tes règles
    let e0 = null; try { e0 = await appel('/maison/trading'); } catch (er) { e0 = null; }
    if (e0 && e0.topstepx && e0.topstepx.relie && (e0.trades || []).some(x => x.auto && x.fin && new Date(x.fin * 1000).toDateString() === new Date().toDateString())) {
      const r = await bilanSeance(e0);
      if (typeof VIE !== 'undefined' && S.settings.debriefTrading !== false && r) return VIE.debrief(r.total);
      return;
    }
    const a = await ask('Session terminée, notifications rétablies. Ton résultat du jour ?', { wait: 20000 });
    const v = a ? montant(a) : null;
    if (v == null) return say("D'accord. Tu me le diras plus tard : « je suis à plus 300 », par exemple.");
    await resultat(v, true);
    if (typeof VIE !== 'undefined' && S.settings.debriefTrading !== false) return VIE.debrief(v); // le miroir : trois questions
  }

  /* ---------- le journal automatique (TopstepX) : la séance face à tes règles — un miroir, jamais un conseil ---------- */
  const hm2 = ts => { const d = new Date(ts * 1000); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function controle(x, e, n) {
    const r = e.regles || {}, pb = [];
    if (!x.stop_ticks) pb.push('sans stop');
    if (x.stop_elargi) pb.push(`stop éloigné (${x.stop_ticks} → ${x.stop_ticks_fin} ticks)`);
    if (x.risque && x.pnl != null && x.pnl < -x.risque * 1.15) pb.push('perte plus grande que le stop');
    if (r.risque_max && x.risque && x.risque > r.risque_max * 1.05) pb.push(`risque ${Math.round(x.risque)} $ (> ${r.risque_max} $)`);
    if (r.max_trades && n > r.max_trades) pb.push(`trade n° ${n} (max ${r.max_trades})`);
    if ((e.annonces_jour || e.annonces || []).some(a => Math.abs(a.at - x.at) <= 120)) pb.push('pendant une annonce');
    if (e.plat_a && x.fin && x.fin > e.plat_a) pb.push('après l’heure limite Topstep');
    return pb;
  }
  async function bilanSeance(e) {
    if (!e) { try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); } }
    if (!e.topstepx || !e.topstepx.relie) { await say("TopstepX n'est pas encore relié. Sur l'ordinateur, lance « topstepx-connecter.sh » et colle ta clé API : ensuite je note tes trades tout seul."); return null; }
    const auj = new Date().toDateString();
    const l = (e.trades || []).filter(x => x.auto && new Date(x.at * 1000).toDateString() === auj).sort((a, b) => a.at - b.at);
    if (!l.length) { await say(e.topstepx.erreur ? `TopstepX ne répond pas : ${e.topstepx.erreur}.` : "Aucun trade aujourd'hui sur TopstepX."); return null; }
    const fermes = l.filter(x => x.fin), tot = fermes.reduce((s_, x) => s_ + (x.pnl || 0), 0);
    const lignes = l.map((x, i) => ({ x, pb: controle(x, e, i + 1) }));
    const ok = lignes.filter(y => !y.pb.length).length;
    const lim = e.limites && e.limites.jour, depasse = lim && tot < -lim;
    const ligne = ({ x, pb }) => `<tr style="border-bottom:1px solid rgba(255,255,255,.08)"><td>${hm2(x.at)}</td><td><b>${esc(x.instr)}</b> ${x.sens === 'long' ? '▲' : '▼'}${x.lots > 1 ? ` ×${x.lots}` : ''}</td><td>${x.prix}</td><td>${x.stop_ticks ? `${x.stop_ticks} t` : '—'}</td><td>${x.fin ? x.sortie : 'ouvert'}</td><td style="color:${(x.pnl || 0) >= 0 ? '#86efac' : '#fca5a5'};text-align:right">${x.fin ? `${x.pnl > 0 ? '+' : ''}${Math.round(x.pnl)} $` : ''}</td><td style="font-size:13px;color:${pb.length ? '#fcd34d' : '#86efac'}">${pb.length ? `⚠ ${esc(pb.join(' · '))}` : '✓ dans ton plan'}</td></tr>`;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,860px)"><small style="letter-spacing:.3em;color:#a5b4fc">LA SÉANCE · TOPSTEPX · ${l.length} TRADE${l.length > 1 ? 'S' : ''} · ${tot > 0 ? '+' : ''}${Math.round(tot)} $</small><table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:15px;line-height:1.9"><tr style="color:#94a3b8;font-size:12px;text-align:left"><th>HEURE</th><th>CONTRAT</th><th>ENTRÉE</th><th>STOP</th><th>SORTIE</th><th style="text-align:right">RÉSULTAT</th><th>TES RÈGLES</th></tr>${lignes.map(ligne).join('')}</table><p style="color:#94a3b8;font-size:13px;margin-top:10px">Un miroir de ta séance, jamais un conseil. Tes règles : ${e.regles && Object.keys(e.regles).length ? esc([e.regles.max_trades ? `${e.regles.max_trades} trades max` : '', e.regles.risque_max ? `${e.regles.risque_max} $ de risque max par trade` : ''].filter(Boolean).join(', ')) : 'dis-les-moi (« ma règle : 3 trades maximum, 100 dollars de risque par trade »)'} · stop toujours posé, jamais éloigné.</p></div>`);
    const mal = lignes.filter(y => y.pb.length);
    const dits = [`Ta séance : ${l.length} trade${l.length > 1 ? 's' : ''}, ${signe(tot)}.`, mal.length ? `${ok} sur ${l.length} dans ton plan.` : 'Tous dans ton plan.'];
    mal.slice(0, 2).forEach(({ x, pb }) => dits.push(`À ${hm2(x.at)}, ${x.instr} : ${pb.join(', ')}.`));
    if (depasse) dits.push(`Ta limite du jour de ${dollars(lim)} est dépassée.`);
    await say(dits.join(' '));
    return { total: tot, l };
  }
  // le payout Topstep : quand, combien — d'après les règles officielles et les vrais trades (TopstepX)
  const jourDit = k => new Date(`${k}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
  async function payout() {
    let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const p = e.payout;
    if (!p || p.erreur) return say(e.topstepx && e.topstepx.relie ? "Je n'arrive pas à calculer ton payout pour le moment." : "Relie d'abord TopstepX : je calculerai ton payout tout seul.");
    const L = [['Solde du compte', `${Math.round(p.solde).toLocaleString('fr-FR')} $`, 'ok'], ['Jours gagnants (150 $ et +)', `${p.gagnants.length} / 5`, p.std_ok ? 'ok' : 'alerte'],
      ['Profit depuis le dernier payout', `${Math.round(p.net_cycle).toLocaleString('fr-FR')} $`, p.net_cycle > 0 ? 'ok' : 'alerte'], ['Meilleur jour', `${Math.round(p.meilleur)} $ · ${p.part_meilleur ?? '—'} % du profit (≤ 40 % pour la voie consistance)`, p.cons_ok ? 'ok' : 'alerte'],
      ['Payout possible', p.eligible ? `${Math.round(p.montant).toLocaleString('fr-FR')} $ → ${Math.round(p.net_pour_toi).toLocaleString('fr-FR')} $ pour toi` : 'pas encore', p.eligible ? 'ok' : 'alerte'],
      ['Marge avant la MLL', `${Math.round(p.marge_mll).toLocaleString('fr-FR')} $`, p.marge_mll < 1000 ? 'alerte' : 'ok'], ['Limite du jour', `${p.dll} $ · aujourd'hui ${p.pnl_jour > 0 ? '+' : ''}${Math.round(p.pnl_jour)} $`, p.pnl_jour < -p.dll / 2 ? 'alerte' : 'ok']];
    try { SCIFI.hud(`Payout Topstep · ${p.taille / 1000}K`, L); } catch (er) { /* pas d'écran */ }
    const d = [];
    if (p.eligible) d.push(`Tu as droit à un payout ${p.cons_ok && !p.std_ok ? 'par la voie consistance' : ''} : tu peux demander jusqu'à ${dollars(p.montant)}, soit ${dollars(p.net_pour_toi)} pour toi${p.net_pour_toi >= p.montant ? ' : tes 10 000 premiers dollars sont à 100 %' : ', après la part de Topstep'}. Une fois la demande faite, dis-moi « j'ai demandé mon payout ».`);
    else {
      d.push(`Pas encore de payout. Tu as ${p.gagnants.length} jour${p.gagnants.length > 1 ? 's' : ''} gagnant${p.gagnants.length > 1 ? 's' : ''} de 150 dollars ou plus${p.gagnants.length ? `, ${p.gagnants.slice(-4).map(jourDit).join(', ')}` : ''} : il en faut 5${p.manque_std ? `, encore ${p.manque_std}` : ''}.`);
      if (p.net_cycle <= 0) d.push("Il faut aussi que ton profit depuis le dernier payout soit positif.");
      else if (p.profit_pour_consistance && !p.cons_ok) d.push(`L'autre voie, la consistance, demande que ton meilleur jour, ${dollars(p.meilleur)}, pèse 40 % au plus de ton profit : il faudrait environ ${dollars(p.profit_pour_consistance)} de profit au total.`);
      const possible = Math.min(p.solde / 2, p.plafond);
      if (possible >= 125) d.push(`Le jour où tu y as droit, avec le solde d'aujourd'hui, ce serait jusqu'à ${dollars(possible)} : la moitié de ton solde, ton plafond étant de ${dollars(p.plafond)}. Et tu le gardes à 100 %, tant que tu n'as pas retiré 10 000 dollars au total.`);
    }
    d.push(`Il te reste ${dollars(p.marge_mll)} avant ta perte maximale.`);
    return say(d.join(' '));
  }
  async function payoutFait(t) {
    const m = String(t).replace(/(\d)[\s .](?=\d{3}\b)/g, '$1').match(/(\d+(?:[.,]\d+)?)\s*(?:\$|dollars?)/i);
    try { await appel('/maison/trading', { payout_fait: { montant: m ? parseFloat(m[1].replace(',', '.')) : null } }); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok(); return say(`C'est noté${m ? ` : un payout de ${dollars(parseFloat(m[1].replace(',', '.')))}` : ''}. Le compte des jours gagnants repart de zéro à partir de demain, et ta perte maximale passe à zéro. Je te dirai quand le prochain sera possible.`);
  }
  async function monCompte(t, n) {
    const v = +((String(t).replace(/(\d)[\s .](?=\d{3}\b)/g, '$1').match(/(\d{3,6})/) || [])[1] || 0);
    if (!v) return say("Dis par exemple : « mon plafond de payout est de 6 000 dollars ».");
    const k = /\b(plafond|cap)\b.*\bconsistance\b/.test(n) ? 'cons' : /\b(plafond|cap)\b/.test(n) ? 'std' : /\blimite (du jour|journaliere)\b/.test(n) ? 'dll' : /\b(perte max|mll)\b/.test(n) ? 'mll' : null;
    if (!k) return say("Je n'ai pas compris quel réglage changer : le plafond de payout, la limite du jour, ou la perte maximale ?");
    try { await appel('/maison/trading', { compte_tsx: { [k]: v } }); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok(); return say(`C'est noté : ${{ std: 'ton plafond de payout', cons: 'ton plafond de payout en voie consistance', dll: 'ta limite du jour', mll: 'ta perte maximale' }[k]}, ${dollars(v)}.`);
  }
  async function regles(t, n) {
    const mt = +((n.match(/\b(\d{1,2}) trades?\b/) || [])[1] || 0);
    const rm = +((String(t).replace(/(\d)[\s .](?=\d{3}\b)/g, '$1').match(/(\d+)\s*(?:\$|dollars?)\s*(?:de )?(?:risque|par trade|maximum par trade)/i) || String(t).match(/risque (?:maximum |max )?(?:de )?(\d+)/i) || [])[1] || 0);
    if (!mt && !rm) { let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); } const r = e.regles || {}; return say(r.max_trades || r.risque_max ? `Tes règles : ${[r.max_trades ? `${r.max_trades} trades maximum par jour` : '', r.risque_max ? `${dollars(r.risque_max)} de risque maximum par trade` : ''].filter(Boolean).join(', ')}, un stop toujours posé et jamais éloigné.` : "Dis-moi tes règles, par exemple : « ma règle : 3 trades maximum par jour, 100 dollars de risque par trade »."); }
    try { await appel('/maison/trading', { regles: Object.assign(mt ? { max_trades: mt } : {}, rm ? { risque_max: rm } : {}) }); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok(); return say(`C'est noté${mt ? ` : ${mt} trades maximum par jour` : ''}${rm ? `${mt ? ',' : ' :'} ${dollars(rm)} de risque maximum par trade` : ''}. Je le vérifierai à chaque bilan de séance.`);
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

  /* ---------- la boîte noire : les trades dictés, et le bilan chiffré (jamais un conseil) ---------- */
  const SPECS = { M6E: [0.0001, 1.25, 4], MNQ: [0.25, 0.5, 2], MES: [0.25, 1.25, 2], MGC: [0.1, 1, 1], MYM: [1, 0.5, 0], MCL: [0.01, 1, 2], SIL: [0.005, 5, 3] };
  const NOMS_I = [[/\b(m6e|6e|euro dollar|eur usd|eurusd|l euro)\b/, 'M6E'], [/\b(mnq|nasdaq)\b/, 'MNQ'], [/\b(mes|s p 500|sp500)\b/, 'MES'], [/\b(mgc|l or|gold)\b/, 'MGC'], [/\b(mym|dow)\b/, 'MYM'], [/\b(mcl|petrole)\b/, 'MCL'], [/\b(sil|silver|l argent)\b/, 'SIL']];
  let dernierInstr = 'M6E';
  const nombre = s => { const x = String(s).replace(/\s+(?=\d{3}\b)/g, '').replace(',', '.'); const v = parseFloat(x); return isFinite(v) ? v : null; };
  const prixApres = (t, mot) => { const m = String(t).match(new RegExp(`${mot}\\s*(?:à|a|de|au)?\\s*(\\d[\\d\\s]*(?:[.,]\\d+)?)`, 'i')); return m ? nombre(m[1]) : null; };
  const fmtP = (v, i) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: SPECS[i][2], maximumFractionDigits: SPECS[i][2] });
  async function entree(t, n) {
    const sens = /\b(long|achat|achete|acheteur|buy)\b/.test(n) ? 'long' : /\b(short|vente|vendu|vendeur|sell)\b/.test(n) ? 'short' : null;
    const ins = (NOMS_I.find(([re]) => re.test(n)) || [null, dernierInstr])[1]; dernierInstr = ins;
    const prix = prixApres(t, '(?:entrée|entree|long|short|achat|vente|acheté|vendu|' + ins + ')') || prixApres(t, ' à');
    if (!sens || prix == null) return say("Dis par exemple : « entrée long M6E à 1,1650, stop 20 ticks ».");
    const [pas, val] = SPECS[ins];
    const lots = +((n.match(/\b(\d{1,2}) (contrats?|lots?|micros?)\b/) || [])[1] || 1);
    let ticks = +((n.match(/\bstop (?:de |a )?(\d{1,4}) ticks?\b/) || [])[1] || 0), stopPrix = null;
    if (!ticks) { stopPrix = prixApres(t, 'stop'); if (stopPrix != null) ticks = Math.round(Math.abs(prix - stopPrix) / pas); }
    if (ticks && stopPrix == null) stopPrix = +(sens === 'long' ? prix - ticks * pas : prix + ticks * pas).toFixed(6);
    const objectif = prixApres(t, '(?:objectif|cible|target|tp)');
    const risque = ticks ? +(ticks * val * lots).toFixed(2) : null;
    let e; try { e = await appel('/maison/trading', { trade: { sens, instr: ins, prix, stop_ticks: ticks || null, stop_prix: stopPrix, lots, risque, objectif } }); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const part = risque && e.limites ? Math.round(risque / e.limites.jour * 100) : 0;
    return say(`Boîte noire : ${sens} ${ins} à ${fmtP(prix, ins)}${lots > 1 ? `, ${lots} contrats` : ''}${ticks ? `, stop ${ticks} ticks. Risque : ${dollars(risque)}${part >= 25 ? `, soit ${part} % de ta limite du jour` : ''}` : ". Pas de stop noté : quel est ton stop ?"}.`);
  }
  async function sortie(t, n, pnlDit) {
    let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const o = (e.trades || []).filter(x => x.fin == null).pop();
    if (!o) return pnlDit != null ? resultat(pnlDit, false) : say("Aucun trade ouvert dans la boîte noire.");
    const [pas, val] = SPECS[o.instr] || [1, 1];
    const pnlDe = px => +(((px - o.prix) * (o.sens === 'long' ? 1 : -1)) / pas * val * (o.lots || 1)).toFixed(2);
    let px = null, pnl = pnlDit, motif = 'sortie';
    if (pnl == null && /\b(stoppe|stop touche|stop pris|touche mon stop|au stop)\b/.test(n)) { motif = 'stop'; px = o.stop_prix; pnl = px != null ? pnlDe(px) : (o.risque != null ? -o.risque : null); }
    else if (pnl == null && /\b(objectif|cible|target|tp) (atteint|touche)\b/.test(n) && o.objectif != null) { motif = 'objectif'; px = o.objectif; pnl = pnlDe(px); }
    else if (pnl == null) { px = prixApres(t, '(?:sortie|sorti|sors|clôturé|cloture|fermé|ferme|coupé|coupe)') || prixApres(t, ' à'); if (px != null) pnl = pnlDe(px); }
    if (pnl == null) return say("À quel prix es-tu sorti ? Ou dis le résultat : « sortie à plus 40 dollars ».");
    try { await appel('/maison/trading', { cloture: { sortie: px, pnl, motif } }); } catch (er) { return say("Je n'ai pas réussi à le noter."); }
    await say(`Trade clôturé : ${signe(pnl)}${o.risque && pnl < -o.risque * 1.15 ? ` : plus que le risque prévu de ${dollars(o.risque)}` : o.risque && pnl > 0 ? `, soit ${(pnl / o.risque).toFixed(1).replace('.', ',')} fois le risque` : ''}.`);
    return resultat(pnl, false);
  }
  async function bilanNoire() {
    let e; try { e = await appel('/maison/trading'); } catch (er) { return say("L'ordinateur de la maison ne répond pas."); }
    const l = (e.trades || []).filter(x => x.fin != null && x.pnl != null && x.at > Date.now() / 1000 - 7 * 86400);
    if (!l.length) return say("La boîte noire est vide cette semaine. Pendant ta session, dicte tes trades : « entrée long M6E à 1,1650, stop 20 ticks », puis « sortie à 1,1672 ».");
    const g = l.filter(x => x.pnl > 0), p = l.filter(x => x.pnl < 0), tot = l.reduce((a, x) => a + x.pnl, 0);
    const moy = a => (a.length ? a.reduce((s2, x) => s2 + x.pnl, 0) / a.length : 0);
    const gm = moy(g), pm = moy(p), taux = Math.round(g.length / l.length * 100);
    const heures = {}; l.forEach(x => { const h = new Date(x.at * 1000).getHours(); (heures[h] = heures[h] || []).push(x.pnl); });
    const hs = Object.entries(heures).filter(([, v]) => v.length >= 2).map(([h, v]) => [+h, v.reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1]);
    const depasse = l.filter(x => x.risque && x.pnl < -x.risque * 1.15).length;
    const instr = {}; l.forEach(x => { instr[x.instr] = (instr[x.instr] || 0) + x.pnl; });
    const L = [['Trades', `${l.length} · ${taux} % gagnants`, 'ok'], ['Total', `${tot > 0 ? '+' : ''}${tot.toFixed(0)} $`, tot < 0 ? 'alerte' : 'ok'], ['Gain moyen', `+${gm.toFixed(0)} $`, 'ok'], ['Perte moyenne', `${pm.toFixed(0)} $`, 'alerte'], ['Gain / perte', pm ? (gm / -pm).toFixed(2).replace('.', ',') : '—', gm > -pm ? 'ok' : 'attente']];
    if (hs.length) L.push(['Meilleure heure', `${hs[0][0]} h (${hs[0][1] > 0 ? '+' : ''}${hs[0][1].toFixed(0)} $)`, 'ok']);
    if (hs.length > 1) L.push(['Heure la plus dure', `${hs[hs.length - 1][0]} h (${hs[hs.length - 1][1].toFixed(0)} $)`, 'alerte']);
    L.push(['Stops dépassés', String(depasse), depasse ? 'alerte' : 'ok']);
    Object.entries(instr).forEach(([k, v]) => L.push([k, `${v > 0 ? '+' : ''}${v.toFixed(0)} $`, v < 0 ? 'alerte' : 'ok']));
    try { SCIFI.hud('Boîte noire · 7 jours', L); } catch (er) { /* pas d'écran */ }
    const dits = [`Bilan de la boîte noire, sur sept jours : ${l.length} trade${l.length > 1 ? 's' : ''}, ${taux} % de gagnants, total ${signe(tot)}.`];
    if (g.length && p.length) dits.push(`Gain moyen ${dollars(gm)}, perte moyenne ${dollars(pm)} : un rapport de ${(gm / -pm).toFixed(2).replace('.', ',')}.`);
    if (hs.length > 1) dits.push(`Ta meilleure heure : ${hs[0][0]} heures. La plus dure : ${hs[hs.length - 1][0]} heures.`);
    dits.push(depasse ? `${depasse} trade${depasse > 1 ? 's ont' : ' a'} perdu plus que le stop prévu.` : 'Tous tes stops ont été respectés.');
    return say(dits.join(' '));
  }

  function route(t, n) {
    if (/\b(fin (de (la |ma )?)?(session|trading)|j arrete (de trader|le trading|ma session|la session)|je coupe (le trading|ma session)|session terminee|je termine (ma session|le trading)|fin du mode trading)\b/.test(n)) return fin;
    if (/\b(mode trading|session de trading|copilote de trading|je (commence|lance|demarre|attaque) (ma |la )?(session|journee de trading)|je vais trader|on va trader)\b/.test(n)) return () => debut(n);
    if (/\b(mes resultats|mon bilan (de trading|de la semaine)|resultats? (de la |cette )?semaine|combien j ai (gagne|perdu) cette semaine|mes performances)\b/.test(n) && !/\b(foot|match|ecole)\b/.test(n)) return bilan;
    if (/\b(ma limite|mes limites|limite (du jour|journaliere|de perte)|ma perte max(imale)?)\b/.test(n)) return () => limites(t, n);
    if (/\b(bilan|resume|recap)\b.*\b(seance|session du jour|mes trades du jour|trades d aujourd hui|journee de trading)\b|\bmes trades (du jour|d aujourd hui)\b/.test(n)) return () => bilanSeance();
    if (/\b(j ai (demande|fait|recu|eu) (mon|un|le) (payout|retrait|paiement topstep))\b/.test(n)) return () => payoutFait(t);
    if (/\b(payout|retrait topstep)\b/.test(n) && /\b(plafond|cap)\b/.test(n) && /\d/.test(t)) return () => monCompte(t, n);
    if (/\b(ma limite du jour|ma limite journaliere|ma perte max(imale)?|ma mll)\b.*\b(est|de|c est)\b.*\d/.test(n)) return () => monCompte(t, n);
    if (/\b(payout|retrait topstep|combien je peux retirer|quand (est ce que )?(je peux|j ai le droit de) (retirer|me payer)|droit (a|au) (un )?(payout|retrait))\b/.test(n)) return payout;
    if (/\b(ma|mes) regles? (de trading|de trade)?\b|\bregle de trading\b/.test(n) && !/\b(jeu|ecole)\b/.test(n)) return () => regles(t, n);
    if (/\b(relie|connecte|branche)\b.*\btopstep\s?x?\b/.test(n)) return () => say("Sur l'ordinateur, lance le script « topstepx-connecter.sh », dans le dossier de la maison : colle ton nom d'utilisateur TopstepX et ta clé API. Ensuite, je note tes trades tout seul, sans jamais passer d'ordre.");
    if (/\b(bilan|stats|statistiques)\b.*\b(boite noire|mes trades|de trading)\b|\bboite noire\b.*\bbilan\b/.test(n)) return bilanNoire;
    if (/\b(efface|supprime|annule|enleve|retire)\b.*\b(resultat|gain|perte|pnl)\b/.test(n)) return async () => { try { await appel('/maison/trading', { efface: 'jour' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } return say("Résultat du jour effacé. Tu me rediras ton vrai résultat en fin de session."); };
    if (/\b(entree|je rentre|je prends|j entre|ouvert|ouverture)\b.*\b(long|short|achat|vente)\b|\b(long|short)\b.*\b(m6e|mnq|mes|mgc|mym|mcl|sil|euro|nasdaq)\b.*\b(a|stop)\b/.test(n) && /\d/.test(t)) return () => entree(t, n);
    if (/\b(sortie|je sors|sorti|je coupe|cloture|je ferme|stoppe|stop touche|stop pris|objectif (atteint|touche)|tp touche)\b/.test(n) && !/\b(sortie de|sors de|mode|session|television|tele)\b/.test(n)) {
      const d = /\b(dollars?)\b|\$/.test(n + t) ? montant(t) : null;
      return () => sortie(t, n, d);
    }
    const trade = /\b(dollars?|trade|trading|session|topstep)\b|\$/.test(n + t) || actif;
    if (trade && /\b(je suis (a |en )?(plus|moins|perte|gain|zero|l equilibre)|mon resultat (du jour )?(est|c est)|je termine (a|en)|je finis (a|en))\b/.test(n) && montant(t) != null) return () => resultat(montant(t), true);
    if (trade && /\b(j ai (perdu|gagne|pris|encaisse)|je perds|je gagne|stop (touche|pris)|j ai ete stoppe)\b/.test(n) && /\d/.test(t)) return () => sortie(t, n, montant(t)); // un trade ouvert dans la boîte noire : il le clôture
    return null;
  }
  return { route, actif: () => actif, bilanNoire, bilanSeance, payout, _controle: controle, _montant: montant, _prixApres: prixApres };
})();

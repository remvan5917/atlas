/* =========================================================
   ATLAS — la vie (après l'avenir)
   - La forme : chaque jour, le sommeil (« je vais me coucher », « je viens de me réveiller »), le sport (l'agenda,
     « j'ai fait ma séance »), l'humeur d'après sa voix, le résultat de trading ; « mon tableau de bord » croise tout
     (ce qui lui réussit vraiment), à l'écran et imprimé (« imprime ma forme du mois »).
   - Le débrief de trading : après « fin de session », trois questions (le meilleur trade, le pire, le plan) ;
     « mon miroir de trading » : les schémas qui coûtent (les heures, la revanche, les stops trop larges en ticks).
     Jamais quoi trader : un miroir de la discipline.
   - Les semaines avec son fils : le calendrier de garde (« on règle mon calendrier de garde ») ; les menus pour un ou deux,
     les sorties seulement sur ses week-ends, la Gazette qui le dit.
   - Le carnet de santé de la famille : le dentiste, le médecin, les vaccins (le calendrier officiel, à vérifier avec le médecin),
     les ordonnances photographiées ; l'ordinateur prévient un mois, une semaine avant et le jour même. Jamais d'avis médical.
   - Le prof particulier de 10 minutes : chaque matin, une leçon à la voix, avec des révisions espacées.
   Rien de personnel dans ce fichier : tout est sur l'ordinateur de la maison.
   ========================================================= */
'use strict';

const VIE = (() => {
  const r0 = () => VOIXMAISON.root();
  const carnet = (nom, corps) => SECRETAIRE._carnet(nom, corps);
  const injoignable = () => say("L'ordinateur de la maison ne répond pas. Réessaie dans un instant.");
  const dJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const auj = () => dJ(new Date());
  const plusJours = (n, d0) => { const d = d0 ? new Date(`${d0}T12:00:00`) : new Date(); d.setDate(d.getDate() + n); return dJ(d); };
  const JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dLong = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, String(iso).slice(0, 4) !== String(new Date().getFullYear()) ? { year: 'numeric' } : {})).replace(/ 1 /, ' 1er ');
  const json = raw => { const s = String(raw || ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); };
  const dol = v => `${Math.round(Math.abs(v)).toLocaleString('fr-FR')} $`;
  const sgn = v => `${v >= 0 ? '+' : '−'}${dol(v)}`;
  const moy = l => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);
  const prenom = () => LIEN.prenom() || 'ton fils';
  const carte = (titre, couleur, corps) => `<div style="text-align:left;font-family:system-ui;min-width:min(92vw,660px)"><small style="letter-spacing:.3em;color:${couleur}">${esc(titre)}</small>${corps}</div>`;
  const lire = async u => { try { return await (await fetch(`${r0()}${u}`, { cache: 'no-store' })).json(); } catch (e) { return null; } };

  /* =================== 1. LA FORME : le journal de chaque jour =================== */
  const SPORT = /\b(gym|gymnastique|krav|sport|muscu|musculation|fitness|footing|course a pied|running|natation|piscine|velo|salle|seance)\b/;
  async function note(champs, date) { // un jour du journal : maison/carnet-forme.json, clé « jours »
    let f; try { f = await carnet('forme'); } catch (e) { return; }
    const jours = Object.assign({}, f.jours || {}), k = date || auj();
    jours[k] = Object.assign({}, jours[k] || {}, champs);
    const garde = Object.keys(jours).sort().slice(-120); const out = {}; garde.forEach(x => { out[x] = jours[x]; });
    try { await carnet('forme', { action: 'cle', cle: 'jours', valeur: out }); } catch (e) { /* tant pis */ }
  }
  // ce qu'il dit, sans le prendre : le coucher, le lever, le sport (appelé au début de chaque phrase)
  function ecoute(n) {
    const h = new Date().getHours();
    if (/^(je vais me coucher|bonne nuit|je vais dormir|je vais au lit)\b/.test(n) && (h >= 19 || h < 5)) {
      const d = new Date(); if (h < 5) d.setDate(d.getDate() - 1);
      S.formeCoucher = Date.now(); save(); note({ coucher: Math.floor(Date.now() / 1000) }, plusJours(1, dJ(d))).catch(() => {}); // la nuit compte pour le jour du réveil
    }
    if (/^(je viens de me (reveiller|lever)|bonjour atlas|je suis reveille)\b/.test(n) && h >= 4 && h < 13) {
      const c = S.formeCoucher || 0, dur = (Date.now() - c) / 3600000;
      note(Object.assign({ lever: Math.floor(Date.now() / 1000) }, c && dur >= 2 && dur <= 14 ? { sommeil: Math.round(dur * 10) / 10 } : {})).catch(() => {});
    }
    if (/\bj ai (fait|termine|fini) (ma |mon |une |un |la )?(seance|sport|entrainement|muscu|footing|course|gym|krav)\b/.test(n)) note({ sport: true, sport_matin: h < 12 }).catch(() => {});
  }
  // chaque soir vers 21 h : l'humeur de sa voix, le sport de l'agenda, le résultat du jour
  async function cloture() {
    const [hu, ag, tr] = await Promise.all([lire('/maison/voix/humeur'), lire('/maison/agenda?jours=1'), lire('/maison/trading')]);
    const now = Date.now() / 1000, d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const sp = ((ag && ag.evenements) || []).filter(e => e.debut >= d0 / 1000 && e.debut < now && SPORT.test(N(e.titre)) && !/\b(pas de|annule|sans)\b/.test(N(e.titre)));
    const ch = {};
    if (hu && hu.pret && hu.etat) ch.humeur = hu.etat;
    if (sp.length) { ch.sport = true; ch.sport_matin = sp.some(e => new Date(e.debut * 1000).getHours() < 12); }
    const p = tr && tr.jours ? tr.jours[auj()] : null; if (p != null) ch.pnl = +p;
    if (Object.keys(ch).length) await note(ch);
  }
  // le tableau de bord : ce qui lui réussit (seulement quand il y a assez de jours pour le dire)
  async function tableau(imprimer) {
    let f; try { f = await carnet('forme'); } catch (e) { return injoignable(); }
    const tr = await lire('/maison/trading'); const jours = Object.assign({}, f.jours || {});
    Object.entries((tr && tr.jours) || {}).forEach(([k, v]) => { jours[k] = Object.assign({}, jours[k] || {}, { pnl: +v }); });
    const lim = ((tr && tr.limites) || {}).jour || 0;
    const debut = plusJours(-30), l = Object.keys(jours).filter(k => k >= debut).sort().map(k => Object.assign({ d: k }, jours[k]));
    if (l.length < 3) return say("Ton tableau de bord se remplit : dis-moi « je vais me coucher » et « je viens de me réveiller », et ton résultat en fin de session. Dans une ou deux semaines, je te montrerai ce qui te réussit.");
    const som = l.filter(x => x.sommeil), avecP = l.filter(x => x.pnl != null), constats = [];
    if (som.length) constats.push(`Tu dors en moyenne ${moy(som.map(x => x.sommeil)).toFixed(1).replace('.', ',')} h par nuit (${som.filter(x => x.sommeil < 6).length} nuit${som.filter(x => x.sommeil < 6).length > 1 ? 's' : ''} sous 6 h).`);
    const court = avecP.filter(x => x.sommeil && x.sommeil < 6), long = avecP.filter(x => x.sommeil && x.sommeil >= 6);
    if (court.length >= 3 && long.length >= 3) constats.push(`Les jours après moins de 6 h de sommeil, ton résultat moyen est de ${sgn(moy(court.map(x => x.pnl)))}, contre ${sgn(moy(long.map(x => x.pnl)))} après une bonne nuit.`);
    const sm = avecP.filter(x => x.sport_matin), ss = avecP.filter(x => !x.sport_matin);
    if (sm.length >= 3 && ss.length >= 3) { const tenu = x => !lim || x.pnl > -lim * 0.8, a_ = Math.round(100 * sm.filter(tenu).length / sm.length), b_ = Math.round(100 * ss.filter(tenu).length / ss.length); if (Math.abs(a_ - b_) >= 10) constats.push(`Après du sport le matin, tu tiens tes limites ${a_} % du temps, contre ${b_} % les autres jours.`); }
    const deb = (f.items || []).filter(x => x.type === 'debrief' && x.date >= debut);
    if (deb.length >= 3) { const ok = deb.filter(x => x.plan && x.plan.respecte), rp = avecP.filter(x => deb.find(y => y.date === x.d && y.plan && y.plan.respecte)), rn = avecP.filter(x => deb.find(y => y.date === x.d && y.plan && y.plan.respecte === false)); constats.push(`Tu as respecté ton plan ${ok.length} jour${ok.length > 1 ? 's' : ''} sur ${deb.length}${rp.length >= 2 && rn.length >= 2 ? ` : ${sgn(moy(rp.map(x => x.pnl)))} en moyenne ces jours-là, ${sgn(moy(rn.map(x => x.pnl)))} les autres` : ''}.`); }
    const hu = {}; avecP.filter(x => x.humeur).forEach(x => { (hu[x.humeur] = hu[x.humeur] || []).push(x.pnl); });
    const hk = Object.entries(hu).filter(([, v]) => v.length >= 3).sort((a, b) => moy(a[1]) - moy(b[1]));
    if (hk.length >= 2) constats.push(`Ton humeur compte : les jours « ${hk[0][0]} », ${sgn(moy(hk[0][1]))} en moyenne ; les jours « ${hk[hk.length - 1][0]} », ${sgn(moy(hk[hk.length - 1][1]))}.`);
    if (constats.length < 2) constats.push("Il me faut encore quelques jours de données pour comparer : continue à me dire ton coucher, ton lever et ton résultat.");
    const mois = MOIS[new Date().getMonth()];
    const W = 640, H = 140, n = l.length, cw = (W - 20) / n, smax = Math.max(9, ...som.map(x => x.sommeil)), pm = Math.max(100, ...avecP.map(x => Math.abs(x.pnl)));
    const barres = l.map((x, i) => `${x.sommeil ? `<rect x="${10 + i * cw + cw * .15}" y="${10 + 60 * (1 - x.sommeil / smax)}" width="${cw * .7}" height="${60 * x.sommeil / smax}" fill="none" stroke="#60a5fa" stroke-width="1.5"/>` : ''}${x.pnl != null ? `<rect x="${10 + i * cw + cw * .15}" y="${x.pnl >= 0 ? 105 - 30 * x.pnl / pm : 105}" width="${cw * .7}" height="${Math.max(1, 30 * Math.abs(x.pnl) / pm)}" fill="none" stroke="${x.pnl >= 0 ? '#4ade80' : '#f87171'}" stroke-width="1.5"/>` : ''}${x.sport ? `<circle cx="${10 + i * cw + cw / 2}" cy="${H - 4}" r="2.5" fill="none" stroke="#fbbf24"/>` : ''}`).join('');
    showBoard(carte(`TA FORME · ${l.length} JOURS`, '#93c5fd', `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin-top:8px"><line x1="10" x2="${W - 10}" y1="${10 + 60 * (1 - 6 / smax)}" y2="${10 + 60 * (1 - 6 / smax)}" stroke="#475569" stroke-dasharray="3 3"/><line x1="10" x2="${W - 10}" y1="105" y2="105" stroke="#334155"/>${barres}</svg><div style="font-size:12px;color:#94a3b8">Bleu : le sommeil (pointillé à 6 h) · vert/rouge : le trading · jaune : le sport</div>${constats.map(c => `<div style="font-size:16px;margin-top:8px;line-height:1.4">• ${esc(c)}</div>`).join('')}`));
    if (imprimer) { try { await fetch(`${r0()}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'forme', titre: `Ta forme · ${mois} ${new Date().getFullYear()}`, jours: l.map(x => ({ d: x.d, sommeil: x.sommeil, pnl: x.pnl, sport: !!x.sport, humeur: x.humeur || '', plan: (deb.find(y => y.date === x.d) || {}).plan ? (deb.find(y => y.date === x.d).plan.respecte) : null })), constats }) }); } catch (e) { /* tant pis */ } }
    return say(`${constats.slice(0, 3).join(' ')}${imprimer ? " Je l'imprime sur l'imprimante du bureau." : ''} Ce sont des tendances, pas des certitudes.`);
  }

  /* =================== 2. LE DÉBRIEF DE TRADING (après « fin de session ») =================== */
  async function debrief(pnl) {
    if (!AI.ready()) return;
    const q1 = await ask("Trois questions pour ton miroir. Ton meilleur trade aujourd'hui : le marché, le résultat, et ce qui a marché ?", { wait: 30000 });
    if (!q1 || /^(non|pas maintenant|plus tard|stop|laisse)\b/.test(N(q1))) return say("D'accord, pas de débrief aujourd'hui.");
    const q2 = await ask('Et ton pire trade : le résultat, ton stop en ticks, à quelle heure à peu près, et ce qui s’est passé ?', { wait: 30000 });
    const q3 = await ask('Tu as respecté ton plan aujourd’hui ? Oui ou non, et pourquoi.', { wait: 25000 });
    let tr = null; try { tr = await (await fetch(`${r0()}/maison/trading`, { cache: 'no-store' })).json(); } catch (e) { tr = null; }
    const trades = ((tr && tr.trades) || []).filter(x => !x.at || new Date(x.at * 1000).toDateString() === new Date().toDateString()).slice(-20);
    face.set('think');
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu ranges le débrief d'un day trader (micro futures, il compte ses stops en TICKS). Pas d'avis, pas de conseil : tu ranges ce qu'il dit, sans rien inventer. JSON UNIQUEMENT : {"meilleur": {"marche": "", "pnl": 0, "heure": "HH:MM ou vide", "pourquoi": "court"}, "pire": {"marche": "", "pnl": 0, "stop_ticks": 0, "heure": "HH:MM ou vide", "apres_une_perte": false, "pourquoi": "court"}, "plan": {"respecte": true, "pourquoi": "court"}}` }, { role: 'user', content: `Meilleur : ${q1}\nPire : ${q2}\nPlan : ${q3}\nTrades notés aujourd'hui : ${JSON.stringify(trades)}` }], { maxTokens: 500, temperature: 0, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r) return say("Je n'ai pas réussi à ranger le débrief, mais j'ai ton résultat.");
    try { await carnet('forme', { action: 'ajoute', item: Object.assign({ type: 'debrief', date: auj(), pnl: pnl == null ? null : +pnl, trades }, r) }); } catch (e) { return injoignable(); }
    await note({ plan: r.plan ? !!r.plan.respecte : null });
    fx.ok();
    return say(`C'est rangé dans ton miroir.${r.plan && r.plan.respecte === false ? ' Demain, une seule chose : ton plan, rien que ton plan.' : r.plan && r.plan.respecte ? ' Plan respecté : c’est ça, la discipline.' : ''} Dis « mon miroir de trading » pour voir tes schémas.`);
  }
  async function miroir() {
    let f; try { f = await carnet('forme'); } catch (e) { return injoignable(); }
    const deb = (f.items || []).filter(x => x.type === 'debrief' && x.date >= plusJours(-35));
    if (deb.length < 3) return say(`J'ai ${deb.length} débrief${deb.length > 1 ? 's' : ''}. Il m'en faut au moins trois, en fin de session, pour voir tes schémas.`);
    const pires = deb.map(x => x.pire || {}).filter(x => x.pnl);
    const parH = {}; pires.filter(x => /^\d{1,2}:\d{2}$/.test(x.heure || '')).forEach(x => { const h = +x.heure.split(':')[0]; (parH[h] = parH[h] || []).push(+x.pnl); });
    const hPire = Object.entries(parH).sort((a, b) => moy(a[1]) - moy(b[1]))[0];
    const rev = pires.filter(x => x.apres_une_perte).length;
    const stops = deb.map(x => (x.pire || {}).stop_ticks).filter(v => +v > 0).map(Number), med = stops.slice().sort((a, b) => a - b)[Math.floor(stops.length / 2)] || 0;
    const larges = stops.filter(v => med && v > med * 1.5).length;
    const plan = deb.filter(x => x.plan && x.plan.respecte).length;
    const l = [];
    if (hPire && hPire[1].length >= 2) l.push(`Tes pires trades arrivent surtout vers ${hPire[0]} h (${hPire[1].length} fois, ${sgn(moy(hPire[1]))} en moyenne).`);
    if (rev) l.push(`${rev} de tes pires trades sont venus juste après une perte : la revanche te coûte.`);
    if (larges) l.push(`${larges} fois, ton stop était bien plus large que d'habitude (plus de ${Math.round(med * 1.5)} ticks, pour ${med} habituellement).`);
    l.push(`Plan respecté ${plan} jour${plan > 1 ? 's' : ''} sur ${deb.length}.`);
    showBoard(carte('TON MIROIR DE TRADING · DISCIPLINE, PAS DE CONSEIL', '#fcd34d', l.map(x => `<div style="font-size:17px;margin-top:9px;line-height:1.4">• ${esc(x)}</div>`).join('') + `<div style="margin-top:12px;font-size:13px;color:#94a3b8">D'après tes ${deb.length} derniers débriefs.</div>`));
    return say(`${l.join(' ')} Ce n'est pas un conseil de trading : c'est ce que tes propres débriefs racontent.`);
  }

  /* =================== 3. LES SEMAINES AVEC SON FILS (le calendrier de garde) =================== */
  let garde = null, gardeAt = 0;
  async function chargeGarde() { if (Date.now() - gardeAt < 10 * 60000 && garde) return garde; try { garde = ((await carnet('famille')).garde) || null; gardeAt = Date.now(); } catch (e) { /* le précédent */ } return garde; }
  function avec(iso, g) { // son fils est-il avec lui ce jour-là ?
    g = g || garde; if (!g || !g.cycle) return null;
    if (g.exceptions && g.exceptions[iso] != null) return !!g.exceptions[iso];
    const d = Math.round((new Date(`${iso}T12:00:00`) - new Date(`${g.ref}T12:00:00`)) / 86400000);
    return !!g.cycle[((d % g.cycle.length) + g.cycle.length) % g.cycle.length];
  }
  function phraseSemaine(dates) { // « Cette semaine, il est avec toi du mercredi au dimanche. »
    if (!garde || !garde.cycle) return '';
    const l = dates.map(d => [d, avec(d)]); if (!l.some(([, v]) => v)) return `Cette semaine, ${prenom()} est chez sa maman.`;
    if (l.every(([, v]) => v)) return `Cette semaine, ${prenom()} est avec toi tous les jours.`;
    const blocs = []; let cur = null; l.forEach(([d, v]) => { if (v) { if (!cur) { cur = [d, d]; blocs.push(cur); } else cur[1] = d; } else cur = null; });
    const j = d => JS[new Date(`${d}T12:00:00`).getDay()];
    return `Cette semaine, ${prenom()} est avec toi ${blocs.map(([a, b]) => (a === b ? `le ${j(a)}` : `du ${j(a)} au ${j(b)}`)).join(' et ')}.`;
  }
  async function regleGarde() {
    if (!AI.ready()) return say('Pour régler ton calendrier, il me faut mon cerveau en ligne.');
    const a = await ask(`Comment ça se passe pour ${prenom()} : une semaine sur deux, un week-end sur deux, ou autrement ? Dis aussi les jours fixes, comme le mercredi, et les heures de changement.`, { wait: 30000 });
    if (!a) return say("D'accord, on le fera plus tard. Dis « on règle mon calendrier de garde ».");
    const b = await ask(`Et en ce moment : ${prenom()} est avec toi cette semaine, ou ce week-end ? Dis par exemple : il arrive vendredi.`, { wait: 25000 });
    face.set('think');
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu traduis un calendrier de garde alternée en un cycle. Aujourd'hui : ${JS[new Date().getDay()]} ${auj()}. Rends un cycle de 14 jours (ou 7 si c'est pareil chaque semaine) qui commence le lundi "ref" (AAAA-MM-JJ, un lundi proche d'aujourd'hui), avec true les jours où l'enfant dort chez son père. Un week-end = vendredi, samedi, dimanche si l'échange est le vendredi soir et le retour le dimanche soir ou le lundi matin (compte le dimanche comme chez le père). JSON UNIQUEMENT : {"ref": "AAAA-MM-JJ", "cycle": [true, false, …], "resume": "en une phrase claire"}` }, { role: 'user', content: `Le rythme : ${a}\nEn ce moment : ${b}` }], { maxTokens: 400, temperature: 0, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r || !Array.isArray(r.cycle) || ![7, 14].includes(r.cycle.length) || !/^\d{4}-\d{2}-\d{2}$/.test(r.ref || '')) return say("Je n'ai pas compris le rythme. Redis-le-moi autrement, par exemple : un week-end sur deux, du vendredi soir au dimanche soir, et tous les mercredis.");
    const g = { ref: r.ref, cycle: r.cycle.map(Boolean), resume: r.resume || '', exceptions: (garde && garde.exceptions) || {} };
    const dates = Array.from({ length: 14 }, (v, i) => plusJours(i));
    const prochains = dates.filter(d => avec(d, g)).slice(0, 6).map(d => `${JS[new Date(`${d}T12:00:00`).getDay()]} ${new Date(`${d}T12:00:00`).getDate()}`);
    if (!(await askYesNo(`J'ai compris : ${g.resume} Donc ${prenom()} est avec toi ${prochains.join(', ')}. C'est bien ça ?`))) return say("D'accord, on recommence quand tu veux : dis « on règle mon calendrier de garde ».");
    try { await carnet('famille', { action: 'cle', cle: 'garde', valeur: g }); } catch (e) { return injoignable(); }
    garde = g; gardeAt = Date.now(); fx.ok();
    return say("C'est réglé. Les menus, les sorties et ta Gazette suivront ton calendrier. S'il y a un changement, dis-moi par exemple « exceptionnellement, il reste avec moi jusqu'à mardi ».");
  }
  async function exception(t) {
    await chargeGarde(); if (!garde) return say("Règle d'abord ton calendrier : dis « on règle mon calendrier de garde ».");
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Aujourd'hui : ${JS[new Date().getDay()]} ${auj()}. Un changement exceptionnel de garde : quels jours (AAAA-MM-JJ) l'enfant est avec son père (true) ou pas (false). JSON UNIQUEMENT : {"jours": {"AAAA-MM-JJ": true}}` }, { role: 'user', content: t }], { maxTokens: 300, temperature: 0, json: true })); } catch (e) { r = null; }
    const j = (r && r.jours) || {}; const k = Object.keys(j).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)); if (!k.length) return say("Je n'ai pas compris quels jours. Dis par exemple : il reste avec moi jusqu'à mardi.");
    const ex = Object.assign({}, garde.exceptions || {}); k.forEach(x => { ex[x] = !!j[x]; });
    garde = Object.assign({}, garde, { exceptions: ex });
    try { await carnet('famille', { action: 'cle', cle: 'garde', valeur: garde }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`C'est noté : ${k.map(x => `${JS[new Date(`${x}T12:00:00`).getDay()]} ${new Date(`${x}T12:00:00`).getDate()}, ${j[x] ? 'avec toi' : 'chez sa maman'}`).join(' ; ')}.`);
  }
  async function quandFils(n) {
    await chargeGarde(); if (!garde) return say("Je ne connais pas encore ton calendrier de garde. Dis « on règle mon calendrier de garde ».");
    if (/\bce week end\b/.test(n)) { const d = new Date(); const s = dJ(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getDay() === 0 ? 0 : (6 - d.getDay() + 7) % 7))); /* le dimanche : aujourd'hui */ return say(avec(s) ? `Oui, ${prenom()} est avec toi ce week-end.` : `Non, ce week-end ${prenom()} est chez sa maman.`); }
    const dates = Array.from({ length: 7 }, (v, i) => plusJours(i));
    const p = dates.find(d => avec(d));
    return say(`${phraseSemaine(dates)}${!dates.some(d => avec(d)) ? '' : ''}${!p ? (() => { const q = Array.from({ length: 21 }, (v, i) => plusJours(i)).find(d => avec(d)); return q ? ` Tu le retrouves ${dLong(q)}.` : ''; })() : ''}`);
  }

  /* =================== 4. LE CARNET DE SANTÉ DE LA FAMILLE =================== */
  async function sante() {
    let c; try { c = await carnet('sante'); } catch (e) { return injoignable(); }
    const l = (c.items || []).filter(x => !x.fait && x.prochaine).sort((a, b) => a.prochaine.localeCompare(b.prochaine));
    showBoard(carte('LE CARNET DE SANTÉ · RAPPELS, JAMAIS D’AVIS MÉDICAL', '#f9a8d4', l.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:16px"><span>${esc(x.nom)} <span style="color:#94a3b8;font-size:13px">${x.qui === 'fils' ? esc(prenom()) : 'toi'}</span></span><b style="color:${x.prochaine <= plusJours(30) ? '#fca5a5' : '#e2e8f0'}">${esc(dLong(x.prochaine))}</b></div>`).join('') || '<p style="color:#94a3b8">Vide. Dis « on remplit le carnet de santé ».</p>'));
    if (!l.length) return say("Ton carnet de santé est vide. Dis « on remplit le carnet de santé » : deux minutes, et je te rappelle tout au bon moment.");
    return say(`Les prochains : ${l.slice(0, 4).map(x => `${x.nom} ${x.qui === 'fils' ? `pour ${prenom()}` : 'pour toi'}, ${dLong(x.prochaine)}`).join(' ; ')}.`);
  }
  async function ajouteSante(item) { try { await carnet('sante', { action: 'ajoute', item }); } catch (e) { /* tant pis */ } }
  async function remplitSante() {
    let c; try { c = await carnet('sante'); } catch (e) { return injoignable(); }
    const deja = n => (c.items || []).some(x => N(x.nom) === N(n));
    await say("On remplit le carnet de santé. Dis « je ne sais pas » si tu ne sais pas : je te le rappellerai pour vérifier.");
    const Q = [['moi', 'dentiste', 'Contrôle chez le dentiste', 'Ton dernier rendez-vous chez le dentiste, c’était quand ?', 365], ['fils', 'dentiste', 'Contrôle chez le dentiste', `Et pour ${prenom()}, le dernier dentiste ?`, 365], ['fils', 'medecin', 'Visite chez le médecin', `La dernière visite de ${prenom()} chez son médecin ?`, 365], ['moi', 'medecin', 'Visite chez le médecin', 'Et toi, ta dernière visite chez le médecin ?', 365]];
    for (const [qui, type, nom, q, jours] of Q) {
      if (deja(nom) && (c.items || []).some(x => N(x.nom) === N(nom) && x.qui === qui)) continue;
      const a = await ask(q, { wait: 15000 }); if (/^(stop|arrete|on arrete|ca suffit)\b/.test(N(a))) break;
      const d = /\b(sais pas|aucune idee|jamais)\b/.test(N(a)) ? '' : await SECRETAIRE._date(a);
      await ajouteSante({ qui, type, nom, derniere: d, prochaine: d ? (plusJours(jours, d) < auj() ? plusJours(14) : plusJours(jours, d)) : plusJours(14) });
    }
    // les vaccins : le carnet de santé de son fils (la page des vaccinations), lu en photo
    const v = await ask(`Pour les vaccins de ${prenom()}, tu peux photographier la page des vaccinations de son carnet de santé. Tu veux le faire maintenant ?`, { wait: 15000 });
    if (isYes(v)) return photoSante('vaccins');
    return say("C'est rempli. Je te préviens un mois avant chaque rendez-vous, une semaine avant, et le jour même. Dis-moi « on a vu le dentiste aujourd'hui » quand c'est fait.");
  }
  function photoSante(quoi) {
    showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,460px)"><small style="letter-spacing:.3em;color:#f9a8d4">${quoi === 'vaccins' ? 'LA PAGE DES VACCINATIONS' : "L'ORDONNANCE"}</small><p style="font-size:16px;color:#e2e8f0">Bien à plat, avec de la lumière.</p><label style="display:inline-block;margin-top:6px;padding:16px 26px;border-radius:14px;background:#db2777;color:#fff;font:700 20px system-ui;cursor:pointer">📷 Photographier<input id="vi-sa" type="file" accept="image/*" capture="environment" style="display:none"></label></div>`);
    const inp = document.getElementById('vi-sa');
    if (inp) inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) lisSante(f, quoi).catch(() => say("Je n'ai pas réussi à lire la photo.")); });
    return say(quoi === 'vaccins' ? 'Prends la page des vaccinations en photo.' : "Prends l'ordonnance en photo : je note la fin du traitement et je te rappelle de la renouveler.");
  }
  const reduit = f => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { const k = Math.min(1, 2000 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = ko; im.src = URL.createObjectURL(f); });
  async function lisSante(f, quoi) {
    const img = await reduit(f); face.set('think');
    const q = quoi === 'vaccins'
      ? `Ceci est la page des vaccinations d'un carnet de santé français d'enfant. Liste les vaccins faits avec leur date. Pas d'invention. JSON UNIQUEMENT : {"vaccins": [{"nom": "tel qu'écrit (ex. DTCaP, ROR, Hépatite B…)", "date": "AAAA-MM-JJ ou vide"}], "naissance": "AAAA-MM-JJ si lisible, sinon vide"}`
      : `Ceci est une ordonnance médicale française. Aujourd'hui : ${auj()}. Relève seulement : le médecin, la date, la durée du traitement, si elle est renouvelable. Ne donne AUCUN avis médical. JSON UNIQUEMENT : {"medecin": "", "date": "AAAA-MM-JJ", "duree_jours": 0, "renouvelable": false, "pour": "moi|fils|vide", "resume": "une phrase neutre, sans conseil"}`;
    let txt = ''; try { if (S.settings.seeCloud && S.settings.key) txt = await AI.see(img, q); if (!txt && typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { const j = await (await fetch(`${r0()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question: q }) })).json(); txt = j && j.texte; } } catch (e) { txt = ''; }
    face.set('idle');
    let r = null; try { r = json(txt); } catch (e) { r = null; }
    if (!txt || !r) { hideBoard(); return say("Je n'arrive pas à lire la photo. Reprends-la bien à plat, avec plus de lumière."); }
    const id = ('00000000' + Math.random().toString(16).slice(2, 10)).slice(-8);
    try { await carnet('papiers', { action: 'ajoute', item: { id, type: quoi === 'vaccins' ? 'carnet de santé' : 'ordonnance', categorie: 'sante', objet: quoi === 'vaccins' ? `Vaccinations de ${prenom()}` : `Ordonnance${r.medecin ? ` du ${r.medecin}` : ''}`, date_doc: r.date || '', a_faire: 'garder' } }); await carnet('papiers', { action: 'image', id, image: img }); } catch (e) { /* la photo n'est pas gardée */ }
    hideBoard();
    if (quoi === 'vaccins') {
      const l = (r.vaccins || []).filter(x => x && x.nom);
      try { await carnet('famille', { action: 'cle', cle: 'vaccins_fils', valeur: { at: auj(), liste: l, naissance: r.naissance || '' } }); } catch (e) { /* tant pis */ }
      // le calendrier vaccinal officiel (France) : le prochain grand rendez-vous d'un enfant de cet âge est le rappel de 11-13 ans
      const nais = /^\d{4}-\d{2}-\d{2}$/.test(r.naissance || '') ? r.naissance : '';
      if (nais) await ajouteSante({ qui: 'fils', type: 'vaccin', nom: 'Rappel de vaccins prévu vers 11 ans (calendrier officiel : à confirmer avec son médecin)', prochaine: plusJours(Math.round(11 * 365.25), nais) });
      fx.ok(); return say(`J'ai relevé ${l.length} vaccin${l.length > 1 ? 's' : ''}${nais ? ", et je te rappellerai le prochain rendez-vous du calendrier officiel, vers ses 11 ans" : ''}. Pour savoir exactement ce qu'il lui faut, c'est son médecin qui décide : je ne fais que ranger et rappeler.`);
    }
    const fin = r.date && +r.duree_jours > 0 ? plusJours(+r.duree_jours, r.date) : '';
    if (fin) await ajouteSante({ qui: r.pour === 'fils' ? 'fils' : 'moi', type: 'ordonnance', nom: `Fin du traitement${r.medecin ? ` (ordonnance du ${r.medecin})` : ''}${r.renouvelable ? ' : ordonnance renouvelable' : ''}`, prochaine: plusJours(-7, fin), papier: id });
    fx.ok(); return say(`C'est rangé.${fin ? ` Le traitement se termine vers le ${dLong(fin)} : je te le rappelle une semaine avant${r.renouvelable ? ', pour le renouveler' : ''}.` : ''} Je ne donne aucun avis médical : pour toute question, c'est ton médecin ou ton pharmacien.`);
  }
  async function vuSante(n) { // « on a vu le dentiste aujourd'hui », « mon fils a vu le médecin »
    let c; try { c = await carnet('sante'); } catch (e) { return injoignable(); }
    const qui = /\b(mon fils|le petit|avec mon fils|pour mon fils)\b/.test(n) || (LIEN.prenom() && n.includes(N(LIEN.prenom()))) ? 'fils' : 'moi';
    const type = /\bdentiste\b/.test(n) ? 'dentiste' : /\b(ophtalmo|ophtalmologue|yeux)\b/.test(n) ? 'ophtalmo' : 'medecin';
    const l = (c.items || []).filter(x => x.type === type && (x.qui === qui || /\bon a\b/.test(n)));
    for (const x of l) { try { await carnet('sante', { action: 'modifie', id: x.id, champs: { derniere: auj(), prochaine: plusJours(type === 'ophtalmo' ? 730 : 365) } }); } catch (e) { /* tant pis */ } }
    if (!l.length) await ajouteSante({ qui, type, nom: type === 'dentiste' ? 'Contrôle chez le dentiste' : type === 'ophtalmo' ? "Contrôle chez l'ophtalmologue" : 'Visite chez le médecin', derniere: auj(), prochaine: plusJours(type === 'ophtalmo' ? 730 : 365) });
    fx.ok(); return say(`C'est noté. Le prochain contrôle : dans un an${type === 'ophtalmo' ? ' ou deux' : ''}, je te le rappellerai un mois avant.`);
  }

  /* =================== 5. LE PROF PARTICULIER DE 10 MINUTES =================== */
  let profOffre = 0;
  async function lecon() {
    profOffre = 0; dlg.attendReponse = 0;
    if (!AI.ready()) return say('Pour la leçon, il me faut mon cerveau en ligne.');
    let p; try { p = await carnet('prof'); } catch (e) { return injoignable(); }
    let sujet = p.sujet;
    if (!sujet) { const a = await ask("Qu'est-ce que tu veux apprendre, dix minutes par jour ? Par exemple : l'anglais des affaires, la psychologie du trader, la comptabilité.", { wait: 20000 }); if (!a) return say("D'accord, une autre fois."); sujet = a.trim(); try { await carnet('prof', { action: 'cle', cle: 'sujet', valeur: sujet }); } catch (e) { /* tant pis */ } }
    const cartes = (p.cartes || []).slice(), due = cartes.filter(c => (c.due || '') <= auj()).slice(0, 5);
    await say(`Ta leçon du jour : ${sujet}. ${due.length ? `D'abord ${due.length} révision${due.length > 1 ? 's' : ''}.` : 'On commence.'}`);
    let ok = 0;
    for (const c of due) {
      const a = await ask(c.q, { wait: 25000 });
      if (/^(stop|on arrete|fin de la lecon)\b/.test(N(a))) break;
      let v = null; try { v = json(await AI.chat([{ role: 'system', content: 'Tu corriges une réponse orale, avec bienveillance. JSON UNIQUEMENT : {"juste": true, "correction": "une phrase courte, la bonne réponse si besoin"}' }, { role: 'user', content: `Question : ${c.q}\nBonne réponse : ${c.r}\nSa réponse : ${a || '(rien)'}` }], { maxTokens: 120, temperature: 0, json: true })); } catch (e) { v = null; }
      const juste = !!(v && v.juste);
      c.intervalle = juste ? Math.min(120, Math.round((c.intervalle || 1) * 2.5)) : 1; c.due = plusJours(c.intervalle); if (juste) ok++;
      await say(juste ? pick(['Exact.', 'Parfait.', 'Bien joué.']) + (v.correction && !/^(exact|correct|bravo)/i.test(v.correction) ? ` ${v.correction}` : '') : `Pas tout à fait. ${v && v.correction ? v.correction : c.r}`);
    }
    // trois notions nouvelles
    let nv = null;
    try { nv = json(await AI.chat([{ role: 'system', content: `Tu es un excellent professeur particulier. Sujet : ${sujet}. Donne 3 notions NOUVELLES et utiles, différentes de celles déjà vues, pour un adulte motivé, en français ; chacune expliquée à l'oral en 2 phrases maximum, avec un exemple concret ; puis une question de révision courte et sa réponse. JSON UNIQUEMENT : {"notions": [{"explication": "…", "q": "…", "r": "…"}]}` }, { role: 'user', content: `Déjà vues : ${cartes.slice(-40).map(c => c.q).join(' | ') || 'rien'}` }], { maxTokens: 900, temperature: 0.6, json: true })); } catch (e) { nv = null; }
    const nouv = ((nv && nv.notions) || []).filter(x => x && x.explication && x.q).slice(0, 3);
    for (const x of nouv) { await say(x.explication); cartes.push({ id: Math.random().toString(16).slice(2, 10), q: x.q, r: x.r, intervalle: 1, due: plusJours(1), at: auj() }); }
    try { await carnet('prof', { action: 'cle', cle: 'cartes', valeur: cartes.slice(-300) }); await carnet('prof', { action: 'cle', cle: 'derniere', valeur: auj() }); } catch (e) { /* tant pis */ }
    S.profFait = auj(); save(); fx.ok();
    return say(`C'est tout pour aujourd'hui${due.length ? ` : ${ok} sur ${due.length} en révision` : ''}. Je te repose ces questions demain.`);
  }

  /* =================== les moments de la journée =================== */
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (!dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    if (h >= 21 && h < 22.5 && S.formeCloture !== auj()) { S.formeCloture = auj(); save(); cloture().catch(() => {}); }
    if (h >= 7.5 && h < 10.5 && S.settings.prof !== false && S.profFait !== auj() && S.profPropose !== auj() && d.getDay() !== 0) {
      PROACTIF.annonce(`prof-${auj()}`, () => { S.profPropose = auj(); save(); profOffre = Date.now(); dlg.attendReponse = Date.now() + 120000; return 'Ta leçon du jour, dix minutes ? Dis oui quand tu es prêt.'; }, { expire: Date.now() + 2 * 3600000 });
    }
  }, 5 * 60000);
  setTimeout(() => { chargeGarde().catch(() => {}); }, 15000);

  /* =================== les phrases =================== */
  function route(t, n) {
    if (profOffre && Date.now() - profOffre < 120000) {
      if (/^(oui|ouais|ok|d accord|vas y|go|on y va|c est parti)\b/.test(n)) return lecon;
      if (/^(non|pas maintenant|plus tard|pas aujourd hui)\b/.test(n)) return () => { profOffre = 0; dlg.attendReponse = 0; return say("D'accord. Dis « ma leçon du jour » quand tu veux."); };
    }
    // la forme
    if (/\b(mon tableau de bord|ma forme|tableau de bord de ma forme|ce qui me reussit)\b/.test(n)) return () => tableau(/\b(imprime|imprimer)\b/.test(n));
    if (/\b(imprime|imprimer)\b.*\b(ma forme|tableau de bord)\b/.test(n)) return () => tableau(true);
    if (/\bj ai dormi (\d{1,2})( ?h| heures?)\b/.test(n)) { const m = n.match(/\bj ai dormi (\d{1,2})/); return async () => { await note({ sommeil: +m[1] }); fx.ok(); return say(`Noté : ${m[1]} heures de sommeil.`); }; }
    // le trading
    if (/\b(mon miroir de trading|mon miroir|mes schemas de trading|mes erreurs de trading|ce qui me coute en trading)\b/.test(n)) return miroir;
    if (/\b(debrief|debriefing)\b/.test(n) && /\b(trading|session|trade)\b/.test(n)) return () => debrief(null);
    // la garde
    if (/\b(regle|reglons|configure|on fait)\b.*\bcalendrier de garde\b|\bmon calendrier de garde\b/.test(n)) return regleGarde;
    if (/\b(exceptionnellement|exception|il reste avec moi|elle le garde|il part chez sa mere|il va chez sa maman)\b/.test(n) && /\b(jusqu|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|semaine|week end)\b/.test(n)) return () => exception(t);
    if (/\b(quand est ce que j ai|quand j ai|il est avec moi|j ai mon fils|mon fils est avec moi|c est ma semaine|semaine avec mon fils)\b/.test(n)) return () => quandFils(n);
    // la santé
    if (/\b(on remplit|remplis|remplir)\b.*\bcarnet de sante\b/.test(n)) return remplitSante;
    if (/\b(mon|le|notre) carnet de sante\b|\bprochains? rendez vous (de sante|medicaux)\b|\bprochain vaccin\b/.test(n)) return sante;
    if (/\b(range|photographie|scanne|lis)\b.*\b(ordonnance)\b/.test(n)) return () => photoSante('ordonnance');
    if (/\b(range|photographie|scanne|lis)\b.*\b(vaccins|carnet de sante|page des vaccinations)\b/.test(n)) return () => photoSante('vaccins');
    if (/\b(on a|j ai|mon fils a|il a) (vu|ete chez) (le |la |l )?(dentiste|medecin|docteur|pediatre|ophtalmo|ophtalmologue)\b/.test(n)) return () => vuSante(n);
    // le prof
    if (/\b(ma lecon du jour|ma lecon|le prof|lecon du jour|une lecon)\b/.test(n)) return lecon;
    if (/\b(change|changer)\b.*\b(sujet|matiere)\b.*\b(lecon|prof|apprendre)?\b/.test(n) && /\b(lecon|prof|apprendre|sujet)\b/.test(n)) { const s = String(t).replace(/^.*?\b(?:sujet|matière|matiere)\s*(?:de la leçon|de la lecon)?\s*[:,]?\s*/i, '').trim(); return async () => { if (s.length < 3) return say('Quel sujet ? Dis par exemple : change de sujet, la psychologie du trader.'); try { await carnet('prof', { action: 'cle', cle: 'sujet', valeur: s }); } catch (e) { return injoignable(); } fx.ok(); return say(`C'est noté : à partir de demain, ${s}.`); }; }
    if (/\b(arrete|plus de|stop)\b.*\b(lecons?|prof)\b/.test(n)) return () => { S.settings.prof = false; save(); return say("D'accord, plus de leçon le matin. Dis « ma leçon du jour » quand tu veux."); };
    return null;
  }
  return { route, ecoute, debrief, avec, chargeGarde, phraseSemaine, _tableau: tableau, _cloture: cloture };
})();

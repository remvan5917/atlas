/* ---------- la compta en pilote automatique ----------
   L'ordinateur de la maison lit chaque matin les mails financiers des deux boîtes et les classe, avec le cerveau de la maison
   (rien ne sort d'ici) : la boîte perso → le perso et la micro-entreprise ; la boîte pro → La Rue du financement (SAS, TVA, cabinet comptable, Tiime). Jamais mélangées.
   - « point compta » : l'écran, avec un bouton par pièce (au livre des recettes, déposée dans Tiime, à mes tâches, ignorer, changer d'activité) ;
   - « mon livre des recettes », « imprime mon livre des recettes » ; « qu'est-ce que le comptable m'a demandé ? » ;
   - le matin, s'il y a du nouveau : une phrase, une fois par jour, sur l'ordinateur.
   Le chiffre d'affaires validé nourrit le rappel URSSAF du 1er et du 25 (le montant à déclarer). Jamais de conseil fiscal : des chiffres et des rappels. */
const COMPTA = (() => {
  const root = () => VOIXMAISON.root();
  const eu = v => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const euDit = v => `${Math.round(Number(v || 0)).toLocaleString('fr-FR')} euros`;
  async function api(corps) {
    const r = await fetch(`${root()}/maison/compta`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  async function carnetBudget() { try { return ((await (await fetch(`${root()}/maison/carnet/budget`, { cache: 'no-store' })).json()).doc) || {}; } catch (e) { return {}; } }
  const moisCle = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const BOUTON = { micro: '✓ Au livre des recettes', achat: '✓ Déposée dans Tiime', demande_comptable: '✓ À mes tâches', echeance: '✓ À mes tâches', vente: '✓ Vu', encaissement: '✓ Vu', info: '✓ Vu' };
  const NOM = { micro: 'Micro', lrf: 'La Rue', perso: 'Perso' };
  const btn = (txt, act, id, extra = '', fond = 'rgba(255,255,255,.08)') => `<button type="button" data-cpt="${act}" data-id="${esc(id)}" ${extra} style="padding:7px 11px;margin:3px 4px 0 0;border:0;border-radius:10px;background:${fond};color:#e2e8f0;font:600 13px system-ui;cursor:pointer">${txt}</button>`;
  function carte(x) {
    const val = x.entite === 'micro' ? BOUTON.micro : BOUTON[x.type] || '✓ Vu';
    // les deux boîtes séparées : la boîte pro, c'est La Rue du financement ; la boîte perso, le perso et la micro-entreprise
    const autres = (x.compte === 'pro' ? [] : ['micro', 'perso'].filter(k => k !== x.entite)).map(k => btn(`→ ${NOM[k]}`, 'entite', x.id, `data-ent="${k}"`)).join('');
    return `<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)"><div style="display:flex;gap:10px;align-items:baseline"><b style="flex:1;font-size:15px">${esc(x.tiers || '—')}</b>${x.montant != null ? `<b style="font-size:15px;color:#fde68a">${x.devise && x.devise !== 'EUR' ? `${x.montant} ${esc(x.devise)}` : eu(x.montant)}</b>` : ''}</div><div style="font-size:13px;color:#cbd5e1;margin-top:2px">${esc(x.date)} · ${esc(x.resume || '')}${x.tva ? ` · TVA ${eu(x.tva)}` : ''}${x.echeance ? ` · <b style="color:#fca5a5">avant le ${esc(x.echeance)}</b>` : ''}${(x.pj || []).length ? ` · 📎 ${esc(x.pj.join(', ').slice(0, 60))}` : ''}</div><div>${btn(val, 'valide', x.id, '', 'rgba(22,163,74,.55)')}${btn('✗ Ignorer', 'ignore', x.id)}${autres}</div></div>`;
  }
  async function ecran(r) {
    const b = await carnetBudget(), m = moisCle(), mp = moisCle(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const ca = k => (b.items || []).filter(x => x.type === 'ca' && String(x.date).startsWith(k)).reduce((s_, x) => s_ + +x.montant, 0);
    const sec = (t, l, vide) => `<div style="margin-top:14px"><small style="letter-spacing:.25em;color:#a5b4fc">${t}</small>${l.length ? l.map(carte).join('') : `<div style="color:#64748b;font-size:14px;margin-top:6px">${vide}</div>`}</div>`;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,760px)"><small style="letter-spacing:.3em;color:#fcd34d">LA COMPTA · ${r.en_cours ? `JE LIS TES MAILS… ${r.progres[0]}/${r.progres[1]}` : `LUE ${r.scan_at ? `LE ${new Date(r.scan_at * 1000).toLocaleDateString('fr-FR')}` : ''}`}</small>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><div style="flex:1 1 200px;padding:10px 12px;border-radius:12px;background:rgba(253,230,138,.08)"><small style="color:#94a3b8">MICRO · CA ${MOIS[+mp.slice(5) - 1].toUpperCase()}</small><div style="font:700 22px system-ui;color:#fde68a">${eu(ca(mp))}</div><small style="color:#94a3b8">${MOIS[+m.slice(5) - 1]} : ${eu(ca(m))}</small></div><div style="flex:1 1 200px;padding:10px 12px;border-radius:12px;background:rgba(165,180,252,.08)"><small style="color:#94a3b8">LA RUE DU FINANCEMENT · CE MOIS</small><div style="font:700 18px system-ui;color:#c7d2fe">achats ${eu(r.lrf_mois.achats_ttc)}</div><small style="color:#94a3b8">TVA déductible notée : ${eu(r.lrf_mois.tva_deductible)} · indicatif, le cabinet tranche</small></div></div>
${sec('MICRO-ENTREPRISE · À METTRE AU LIVRE DES RECETTES', r.a_valider_micro, 'Rien de nouveau.')}
${sec('LA RUE DU FINANCEMENT · CE QUE LE CABINET DEMANDE, LES ÉCHÉANCES', r.lrf_demandes, 'Aucune demande en attente.')}
${sec('LA RUE DU FINANCEMENT · FACTURES ET REÇUS À DÉPOSER DANS TIIME', r.lrf_achats, 'Rien à déposer.')}
${(r.lrf_ventes || []).length ? sec('LA RUE DU FINANCEMENT · VENTES ET PAIEMENTS REÇUS (POUR INFO)', r.lrf_ventes, '') : ''}
<p style="color:#64748b;font-size:12px;margin-top:12px">Lu à la maison par le cerveau local : il peut se tromper de montant ou d'activité, d'où les boutons. Jamais de conseil fiscal : ton cabinet valide.</p></div>`);
  }
  // un clic sur un bouton de l'écran
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-cpt]'); if (!b) return;
    b.disabled = true; b.textContent = '…';
    try { const r = await api({ action: b.dataset.cpt, id: b.dataset.id, entite: b.dataset.ent }); fx.ok(); await ecran(r); } catch (e) { b.textContent = 'hors ligne'; }
  });
  async function point() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    await ecran(r);
    const n1 = r.a_valider_micro.length, n2 = r.lrf_demandes.length, n3 = r.lrf_achats.length;
    if (r.en_cours) return say(`Je suis encore en train de lire tes mails : ${r.progres[0]} sur ${r.progres[1]}. Ce que j'ai déjà trouvé est à l'écran.`);
    if (!n1 && !n2 && !n3) return say("Ta compta est à jour : rien de nouveau dans tes mails.");
    const p = [];
    if (n1) p.push(`${n1} encaissement${n1 > 1 ? 's' : ''} pour ta micro-entreprise, à mettre au livre des recettes`);
    if (n2) p.push(`${n2} demande${n2 > 1 ? 's' : ''} ou échéance${n2 > 1 ? 's' : ''} pour La Rue du financement`);
    if (n3) p.push(`${n3} facture${n3 > 1 ? 's' : ''} à déposer dans Tiime`);
    return say(`À l'écran : ${p.join(' ; ')}. Touche « valider » sur chaque ligne, ou corrige l'activité si je me suis trompé.`);
  }
  async function livre(n) {
    const b = await carnetBudget(); const an = String(new Date().getFullYear());
    const per = /\bmois dernier\b/.test(n) ? moisCle(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)) : /\bce mois\b/.test(n) ? moisCle() : an;
    const l = (b.items || []).filter(x => x.type === 'ca' && String(x.date).startsWith(per)).sort((a, c) => String(a.date).localeCompare(String(c.date)));
    const tot = l.reduce((s_, x) => s_ + +x.montant, 0);
    if (/\bimprime\b/.test(n)) {
      try { await fetch(`${root()}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'recettes', periode: per }) }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
      return say(`J'imprime ton livre des recettes ${per.length === 4 ? `de l'année ${per}` : `de ${MOIS[+per.slice(5) - 1]}`} : ${l.length} recette${l.length > 1 ? 's' : ''}, ${euDit(tot)}.`);
    }
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,720px)"><small style="letter-spacing:.3em;color:#fcd34d">LIVRE DES RECETTES · ${per.length === 4 ? `ANNÉE ${per}` : MOIS[+per.slice(5) - 1].toUpperCase()} · ${eu(tot)}</small><table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:15px;line-height:1.8">${l.map(x => `<tr style="border-bottom:1px solid rgba(255,255,255,.08)"><td>${esc(String(x.date).split('-').reverse().join('/'))}</td><td>${esc(x.client || x.libelle || '')}</td><td style="color:#94a3b8">${esc(x.nature || '')}</td><td style="text-align:right">${eu(x.montant)}</td></tr>`).join('') || '<tr><td style="color:#64748b">Aucune recette notée.</td></tr>'}</table><p style="color:#94a3b8;font-size:13px">Dis « imprime mon livre des recettes » pour la feuille officielle.</p></div>`);
    return say(l.length ? `Ton livre des recettes ${per.length === 4 ? 'de l’année' : `de ${MOIS[+per.slice(5) - 1]}`} : ${l.length} recette${l.length > 1 ? 's' : ''}, ${euDit(tot)}.` : "Ton livre des recettes est vide pour cette période.");
  }
  async function demandes() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    await ecran(r);
    const l = r.lrf_demandes;
    return say(l.length ? `Pour La Rue du financement : ${l.slice(0, 3).map(x => `${x.tiers}, ${x.resume}${x.echeance ? `, avant le ${new Date(`${x.echeance}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}`).join(' ; ')}.` : "Le cabinet ne t'a rien demandé de nouveau.");
  }
  /* ---------- le dossier du comptable (La Rue du financement) : préparé seul, il ne reste qu'à vérifier et envoyer ---------- */
  async function dossierApi(corps) {
    const r = await fetch(`${root()}/maison/compta/dossier`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  const prenomPapa = () => String(S.nom || 'Rémy').split(' ')[0];
  function aFaire(d) {
    const l = [];
    (d.banque || []).forEach(b => l.push({ t: `La banque : ${b.toLowerCase().replace(/^transmettre/, 'transmettre')}`, aide: `Télécharge les relevés en PDF depuis ta banque, puis mets-les dans le dossier ${d.dossier} : je les joindrai à la réponse.` }));
    (d.ventes || []).forEach((v, i) => {
      const manque = v.factures.filter(n => !v.jointes[n]);
      if (v.ecart > 0.5) l.push({ t: `${v.client} : ${v.n_factures} facture${v.n_factures > 1 ? 's' : ''} (${eu(v.facture)}) pour ${v.n_reglements} règlement${v.n_reglements > 1 ? 's' : ''} (${eu(v.regle)}) : ${eu(v.ecart)} reçus sans facture.`, vente: i, rep: v.reponse });
      else if (v.ecart < -0.5) l.push({ t: `${v.client} : ${eu(-v.ecart)} facturés et pas encore payés (${v.factures.map(n => `F${n}`).join(', ')}). Une relance du client à prévoir.`, vente: i, rep: v.reponse });
      if (manque.length) l.push({ t: `${v.client} : je n'ai pas trouvé ${manque.map(n => `F${n}`).join(', ')} dans tes mails. Télécharge-les dans Tiime et mets-les dans le dossier.` });
    });
    return l;
  }
  async function dossierEcran(d) {
    const ok = d.achats.filter(a => a.fichiers.length), jointes = d.ventes.reduce((s_, v) => s_ + Object.keys(v.jointes).length, 0);
    const lAch = d.achats.map(a => `<div style="display:flex;gap:8px;font-size:14px;padding:3px 0;border-bottom:1px dotted rgba(255,255,255,.1)"><span style="flex:0 0 86px;color:#94a3b8">${esc(a.date.split('-').reverse().join('/'))}</span><span style="flex:1">${esc(a.fournisseur)}</span><span style="flex:0 0 70px;text-align:right">${eu(Math.abs(a.montant))}</span><span style="flex:0 0 150px;color:${a.fichiers.length ? (a.sur ? '#86efac' : '#fcd34d') : '#fca5a5'}">${a.fichiers.length ? (a.sur ? '✓ facture jointe' : '≈ jointe, à vérifier') : '✗ introuvable'}</span></div>`).join('');
    const todo = aFaire(d).map(x => `<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(253,230,138,.07)"><div style="font-size:15px">${esc(x.t)}</div>${x.aide ? `<div style="font-size:13px;color:#94a3b8;margin-top:3px">${esc(x.aide)}</div>` : ''}${x.vente != null ? `<div style="font-size:13px;color:#86efac;margin-top:3px">${x.rep ? `Ta réponse : ${esc(x.rep)}` : ''}</div><button type="button" data-dos="repond" data-id="${esc(d.id)}" data-vente="${x.vente}" style="margin-top:6px;padding:7px 12px;border:0;border-radius:10px;background:rgba(255,255,255,.1);color:#e2e8f0;font:600 13px system-ui;cursor:pointer">🎙 ${x.rep ? 'Changer ma réponse' : 'Je réponds'}</button>` : ''}</div>`).join('');
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,780px)"><small style="letter-spacing:.3em;color:#fcd34d">LE DOSSIER DU COMPTABLE · LA RUE DU FINANCEMENT</small>
<div style="font-size:15px;color:#cbd5e1;margin-top:6px">« ${esc(d.sujet)} », de ${esc(String(d.de).replace(/<.*$/, '').trim())}, reçu le ${esc(d.recu.split('-').reverse().join('/'))}</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${[[`${ok.length}/${d.achats.length}`, "factures d'achats retrouvées"], [String(jointes), 'factures de vente jointes'], ['✓', 'tableau complété (commentaires)']].map(([v, t]) => `<div style="flex:1 1 150px;padding:10px 12px;border-radius:12px;background:rgba(134,239,172,.08)"><div style="font:700 22px system-ui;color:#86efac">${v}</div><small style="color:#94a3b8">${t}</small></div>`).join('')}</div>
<div style="margin-top:14px"><small style="letter-spacing:.25em;color:#a5b4fc">CE QU'IL TE RESTE (LUI SEUL NE PEUT PAS)</small>${todo || '<div style="color:#64748b">Rien : tout est prêt.</div>'}</div>
<details style="margin-top:12px"><summary style="cursor:pointer;color:#a5b4fc;letter-spacing:.2em;font-size:12px">LES ${d.achats.length} DÉPENSES DU TABLEAU</summary>${lAch}</details>
<div style="position:sticky;bottom:0;padding-top:10px;background:linear-gradient(transparent,rgba(5,10,20,.94) 30%)">${d.envoye ? '<div style="text-align:center;color:#86efac;font-weight:700;margin-bottom:8px">✔ Envoyée au cabinet</div>' : `<button type="button" data-dos="envoie" data-id="${esc(d.id)}" style="width:100%;padding:16px;margin-bottom:8px;border:0;border-radius:16px;background:#2563eb;color:#fff;font:800 18px system-ui;cursor:pointer">✉ Envoyer à ${esc(((String(d.de).match(/<([^>]+)>/) || [])[1] || d.de))} avec toutes les pièces</button>`}<button type="button" data-dos="brouillon" data-id="${esc(d.id)}" style="width:100%;padding:16px;border:0;border-radius:16px;background:${d.brouillon ? '#15803d' : '#2563eb'};color:#fff;font:800 18px system-ui;cursor:pointer">${d.brouillon ? '✔ Brouillon prêt dans Gmail — refaire' : '✉ Préparer la réponse (brouillon dans Gmail)'}</button><div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:6px">Atlas n'envoie rien : tu relis le brouillon dans ta boîte pro, et c'est toi qui cliques sur « Envoyer ». Dossier : ${esc(d.dossier)}</div></div></div>`);
  }
  function corpsReponse(d) {
    const ok = d.achats.filter(a => a.fichiers.length), non = d.achats.filter(a => !a.fichiers.length);
    const jointes = d.ventes.flatMap(v => Object.keys(v.jointes).map(n => `F${n}`));
    const lignes = [`Bonjour ${String(d.de).replace(/<.*$/, '').trim().split(' ')[0] || ''},`, '', `Veuillez trouver ci-joint les éléments demandés pour le point dossier du ${d.recu.split('-').reverse().join('/')} :`,
      `- le tableau complété (colonne Commentaires) ;`, `- ${ok.length} factures d'achats sur ${d.achats.length}${non.length ? ` ; pour les ${non.length} autres, la nature de la charge est indiquée dans le tableau` : ''} ;`];
    if (jointes.length) lignes.push(`- les factures de vente ${jointes.join(', ')}.`);
    d.ventes.filter(v => v.reponse).forEach(v => lignes.push('', `${v.client} : ${v.reponse}`));
    if ((d.banque || []).length) lignes.push('', 'Les relevés bancaires suivront dans un prochain envoi.');
    lignes.push('', 'Bien cordialement,', prenomPapa());
    return lignes.join('\n');
  }
  async function dossier() {
    let r; try { r = await dossierApi(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const d = (r.dossiers || []).slice(-1)[0];
    if (!d) return say(r.en_cours ? "Je prépare le dossier du comptable : une minute." : "Le cabinet ne t'a envoyé aucun tableau à compléter ces deux derniers mois.");
    await dossierEcran(d);
    const ok = d.achats.filter(a => a.fichiers.length).length, todo = aFaire(d);
    return say(`J'ai préparé la réponse au cabinet : ${ok} factures d'achats sur ${d.achats.length} retrouvées dans tes mails, les factures de vente jointes, et le tableau complété. ${todo.length ? `Il te reste ${todo.length} point${todo.length > 1 ? 's' : ''}, à l'écran : ${todo.slice(0, 2).map(x => x.t.split(':')[0].trim()).join(', ')}.` : ''} Touche « préparer la réponse » : le brouillon sera dans ta boîte pro, tu n'auras qu'à le relire et l'envoyer.`);
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-dos]'); if (!b) return;
    let r; try { r = await dossierApi(); } catch (e) { return; }
    const d = (r.dossiers || []).find(x => x.id === b.dataset.id); if (!d) return;
    if (b.dataset.dos === 'repond') {
      const v = d.ventes[+b.dataset.vente];
      const a = await ask(`Pour ${v.client}, qu'est-ce que je réponds au cabinet ?`, { wait: 30000 });
      if (!a) return say("D'accord, plus tard.");
      try { await dossierApi({ action: 'repond', id: d.id, vente: +b.dataset.vente, texte: a.charAt(0).toUpperCase() + a.slice(1) }); } catch (e) { return say("Je n'ai pas réussi à le noter."); }
      fx.ok(); await say("C'est noté dans le tableau."); r = await dossierApi(); return dossierEcran(r.dossiers.find(x => x.id === d.id));
    }
    if (b.dataset.dos === 'envoie') {
      const a_ = ((String(d.de).match(/<([^>]+)>/) || [])[1] || d.de).trim();
      b.disabled = true; b.textContent = '…';
      let x; try { x = await dossierApi({ action: 'envoie', id: d.id, corps: corpsReponse(d), a: a_ }); } catch (e) { x = null; }
      if (!x || !x.ok) { b.disabled = false; return say(`La réponse n'est pas partie${x && x.raison ? ` : ${x.raison}` : ''}.`); }
      fx.ok(); r = await dossierApi(); await dossierEcran(r.dossiers.find(y => y.id === d.id));
      return say(`C'est envoyé à ${a_}, avec ${x.pieces} pièces jointes, depuis ta boîte pro.`);
    }
    if (b.dataset.dos === 'brouillon') {
      b.disabled = true; b.textContent = '…';
      let x; try { x = await dossierApi({ action: 'brouillon', id: d.id, corps: corpsReponse(d) }); } catch (e) { x = null; }
      if (!x || !x.ok) { b.disabled = false; return say(`Je n'ai pas pu préparer le brouillon${x && x.raison ? ` : ${x.raison}` : ''}.`); }
      fx.ok(); r = await dossierApi(); await dossierEcran(r.dossiers.find(y => y.id === d.id));
      return say(`Le brouillon est prêt dans ta boîte pro, avec ${x.pieces} pièces jointes. Relis-le dans Gmail, onglet Brouillons, et envoie-le quand c'est bon.`);
    }
  });
  async function relance() { try { await api({ action: 'scan', jours: 7 }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } return say("Je relis tes mails des sept derniers jours. Dis « point compta » dans quelques minutes."); }

  // le matin : du nouveau à valider → une phrase, une fois par jour, sur l'ordinateur
  setInterval(async () => {
    const h = new Date().getHours(); if (h < 9 || h >= 12 || !dlg.started || voice.occupe()) return;
    if (typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role && CONSTELLATION.role !== 'ordinateur') return;
    const j = new Date().toDateString(); if (S.comptaDit === j) return;
    let r; try { r = await api(); } catch (e) { return; }
    const n = r.a_valider_micro.length + r.lrf_demandes.length + r.lrf_achats.length; if (!n || r.en_cours) return;
    S.comptaDit = j; save();
    PROACTIF.annonce(`compta-${j}`, `Compta : ${n} pièce${n > 1 ? 's' : ''} à regarder dans tes mails${r.lrf_demandes.length ? `, dont ${r.lrf_demandes.length} demande${r.lrf_demandes.length > 1 ? 's' : ''} du cabinet` : ''}. Dis « point compta ».`, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);

  function route(t, n) {
    if (/\b(point compta|fais (ma|la) compta|ma compta|la compta|on fait la compta|ou en est (ma|la) compta)\b/.test(n)) return point;
    if (/\blivre (des|de) recettes?\b/.test(n)) return () => livre(n);
    if (/\b(dossier (du|pour le|de la) (comptable|cabinet)|point dossier|demande du (comptable|cabinet)|ce que (le comptable|le cabinet) (demande|attend))\b/.test(n)) return dossier;
    if (/\b(le|mon|du) (comptable|cabinet)\b.*\b(demande|veut|attend)\b|\bqu est ce que (le comptable|le cabinet) (m a demande|veut|attend)\b/.test(n)) return demandes;
    if (/\b(relis|relit|reverifie|scanne)\b.*\b(mails?|factures)\b.*\bcompta\b|\brelance la compta\b/.test(n)) return relance;
    return null;
  }
  return { route, point, dossier, _api: api, _dossierApi: dossierApi, _corpsReponse: corpsReponse };
})();

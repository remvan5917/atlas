/* =========================================================
   ATLAS — le secrétaire de la maison
   - Les papiers : « range ce papier » (une photo) → ce que c'est, la date limite, le montant ; rangé, et l'échéance dans l'agenda.
     « où est mon attestation d'assurance ? », « qu'est-ce que je dois payer ce mois-ci ? », « j'ai payé la facture d'énergie ».
   - La micro-entreprise : « j'ai facturé 1 800 € à … » → le chiffre d'affaires du mois ; la déclaration URSSAF (mensuelle)
     rappelée par l'ordinateur le 1er et le 25 ; « c'est déclaré ».
   - Le carnet d'entretien (maison, voiture, cochons d'Inde, garanties) : « on remplit le carnet d'entretien »,
     « j'ai fait la vidange », « est-ce que le lave-linge est encore sous garantie ? », « qu'est-ce qu'il y a à faire dans la maison ? ».
   - Le budget : son plan du mois (les charges, les comptes, les virements du jour, rappelés à 9 h par l'ordinateur),
     « mon budget », « mes abonnements », « combien j'ai dépensé ce mois-ci ? », « j'ai dépensé 45 € chez Decathlon »,
     « mets à jour mon budget » (le fichier déposé dans ~/Atlas-budget sur l'ordinateur).
   - Les week-ends avec son fils : le jeudi soir, trois sorties selon la météo ; la choisie va dans l'agenda (Shadow l'annonce),
     avec le pique-nique au menu.
   - « On prépare la semaine » : le planning, les menus, les courses, la maison, son fils, les papiers — puis la Gazette imprimée.
   Tout est rangé sur l'ordinateur de la maison (rien sur le site public).
   ========================================================= */
'use strict';

const SECRETAIRE = (() => {
  const r0 = () => VOIXMAISON.root();
  async function carnet(nom, corps) {
    const r = await fetch(`${r0()}/maison/carnet/${nom}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`carnet ${r.status}`);
    const j = await r.json(); return Object.assign({ items: [] }, j.doc || {}, { _id: j.id });
  }
  const injoignable = () => say("L'ordinateur de la maison ne répond pas. Réessaie dans un instant.");
  const eu = v => (typeof PRIX !== 'undefined' ? PRIX.euros(v) : `${Math.round(v * 100) / 100} €`);
  const dJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const auj = () => dJ(new Date());
  const plusJours = (n, d0) => { const d = d0 ? new Date(`${d0}T12:00:00`) : new Date(); d.setDate(d.getDate() + n); return dJ(d); };
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dateDit = iso => { if (!iso) return ''; const d = new Date(`${iso}T12:00:00`); return `${JS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`; };
  const deMois = i => (/^[aeiouy]/.test(MOIS[i]) ? `d'${MOIS[i]}` : `de ${MOIS[i]}`);
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const motsDe = n => N(n).split(' ').filter(w => w.length > 2 && !/^(mon|ma|mes|le|la|les|des|une|est|sont|quoi|ou|dans|pour|avec|qui|que|encore|toujours|derniere|dernier|papier|papiers|courrier|document|montre|moi|trouve|cherche|retrouve)$/.test(w));
  const json = raw => { const s = String(raw || ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); };
  async function agenda(evts) { const r = await fetch(`${r0()}/maison/agenda/ecris`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evenements: evts }) }); return r.json(); }
  const journee = (iso, titre, o = {}) => ({ titre, debut: Math.floor(new Date(`${iso}T00:00:00`).getTime() / 1000), fin: Math.floor(new Date(`${iso}T00:00:00`).getTime() / 1000) + 86400, journee: true, pro: !!o.pro, rappel: o.rappel || 0 });
  // une date dite (« en mars 2025 », « le 12 mars », « il y a six mois », « l'année dernière ») → AAAA-MM-JJ, par le cerveau
  async function dateDe(t) {
    if (!t || !AI.ready()) return '';
    try { const r = json(await AI.chat([{ role: 'system', content: `Aujourd'hui : ${auj()}. Transforme la date dite en AAAA-MM-JJ (le 1er du mois si seul le mois est dit, le 1er janvier si seule l'année). Si aucune date : vide. JSON UNIQUEMENT : {"date": "AAAA-MM-JJ"}` }, { role: 'user', content: t }], { maxTokens: 40, temperature: 0, json: true })); return /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : ''; } catch (e) { return ''; }
  }
  // la vue : le cerveau en ligne (vision détaillée), sinon la vision de la maison
  async function voir(img, q) {
    let txt = '';
    try {
      if (S.settings.seeCloud && S.settings.key) txt = await AI.see(img, q);
      if (!txt && typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { const j = await (await fetch(`${r0()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question: q }) })).json(); txt = j && j.texte; }
    } catch (e) { txt = ''; }
    return txt;
  }
  const reduit = (f, max = 2000) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', 0.82)); }; im.onerror = ko; im.src = URL.createObjectURL(f); });
  const carte = (titre, couleur, corps) => `<div style="text-align:left;font-family:system-ui;min-width:min(92vw,600px)"><small style="letter-spacing:.3em;color:${couleur}">${esc(titre)}</small>${corps}</div>`;

  /* =================== 1. LES PAPIERS =================== */
  let papierOffre = null;
  function scanne() {
    showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,460px)"><small style="letter-spacing:.3em;color:#a5b4fc">LE SECRÉTAIRE · UN PAPIER</small>
      <p style="font-size:16px;color:#e2e8f0">Un courrier, une facture, un avis, une attestation : pose-le à plat, bien éclairé, et prends-le en photo en entier.</p>
      <label style="display:inline-block;margin-top:6px;padding:16px 26px;border-radius:14px;background:#4f46e5;color:#fff;font:700 20px system-ui;cursor:pointer">📷 Photographier le papier<input id="sc-pa" type="file" accept="image/*" capture="environment" style="display:none"></label></div>`);
    const inp = document.getElementById('sc-pa');
    if (inp) inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) lisPapier(f).catch(() => say("Je n'ai pas réussi à lire ce papier.")); });
    return say('Prends le papier en photo avec le bouton. Je le lis, je te dis ce que c’est, et je le range.');
  }
  async function lisPapier(f) {
    const img = await reduit(f);
    showBoard('<div style="font-family:system-ui;text-align:center;color:#e2e8f0;font-size:18px">Je lis le papier…</div>'); face.set('think');
    const q = `Ceci est un papier administratif français (courrier, facture, avis, attestation, contrat, relevé, amende, école, santé). Aujourd'hui : ${auj()}. Lis-le et réponds UNIQUEMENT en JSON :
{"type": "facture|avis d'imposition|courrier URSSAF|attestation|contrat|relevé|amende|courrier école|santé|garantie|devis|autre", "categorie": "impots|urssaf|assurance|energie|eau|telecom|banque|sante|ecole|logement|voiture|maison|travail|autre", "emetteur": "qui l'envoie", "objet": "en 3 à 6 mots", "montant": 0, "echeance": "AAAA-MM-JJ (date limite de paiement, de réponse ou de déclaration) ou vide", "date_doc": "AAAA-MM-JJ ou vide", "reference": "numéro de contrat, de client ou fiscal, ou vide", "a_faire": "payer|declarer|repondre|signer|envoyer|garder|rien", "deja_paye": false, "garantie_jusqua": "AAAA-MM-JJ ou vide (si c'est la facture d'un appareil, sa garantie : en général 2 ans après l'achat)", "appareil": "l'appareil acheté s'il y en a un, ou vide", "facture_emise": false, "pro": false, "expire_le": "AAAA-MM-JJ ou vide (la date de fin de validité d'une pièce d'identité, d'un permis, d'une carte, d'une assurance)", "resume": "une phrase claire pour lui dire ce que c'est et ce qu'il doit faire"}
"facture_emise" : true seulement si c'est une facture faite PAR lui (sa micro-entreprise) à un client. "pro" : true si c'est pour sa société ou sa micro-entreprise. Pas d'invention : vide si tu ne lis pas.`;
    const txt = await voir(img, q); face.set('idle');
    if (!txt) { hideBoard(); return say("Je n'ai pas de vision disponible pour lire le papier. Active la vision détaillée dans mes réglages."); }
    let p; try { p = json(txt); } catch (e) { p = null; }
    if (!p || !p.objet) { hideBoard(); return say("Je n'arrive pas à lire ce papier. Reprends la photo bien à plat, avec plus de lumière."); }
    p.montant = Math.max(0, +p.montant || 0);
    ['echeance', 'date_doc', 'garantie_jusqua', 'expire_le'].forEach(k => { if (!/^\d{4}-\d{2}-\d{2}$/.test(p[k] || '')) p[k] = ''; });
    papierOffre = { at: Date.now(), p, img }; dlg.attendReponse = Date.now() + 150000;
    showBoard(carte(`PAPIER · ${String(p.type || '').toUpperCase()}${p.pro ? ' · PRO' : ''}`, '#a5b4fc', `<div style="display:flex;gap:14px;margin-top:10px;align-items:flex-start"><img src="${img}" style="width:120px;max-height:170px;object-fit:cover;border-radius:8px"><div style="font-size:17px;line-height:1.45"><b>${esc(p.emetteur || '')}</b> — ${esc(p.objet)}${p.montant ? `<div style="color:#fde68a;font-size:20px;margin-top:4px">${eu(p.montant)}</div>` : ''}${p.echeance ? `<div style="color:#fca5a5">À faire avant le ${esc(dateDit(p.echeance))}</div>` : ''}${p.garantie_jusqua ? `<div style="color:#86efac">Garantie jusqu'au ${esc(dateDit(p.garantie_jusqua))}</div>` : ''}<div style="color:#cbd5e1;font-size:15px;margin-top:6px">${esc(p.resume || '')}</div></div></div>`));
    const agir = p.echeance && /^(payer|declarer|repondre|signer|envoyer)$/.test(p.a_faire) && !p.deja_paye;
    return say(`${p.resume || `${p.type} de ${p.emetteur}`}${p.montant && !String(p.resume).includes(String(Math.round(p.montant))) ? ` Montant : ${eu(p.montant)}.` : ''} Je le range${agir ? ` et je mets la date limite du ${dateDit(p.echeance)} dans ton agenda, avec un rappel trois jours avant` : ''}${p.garantie_jusqua ? ', et je note la garantie' : ''} ?`);
  }
  async function rangePapier() {
    const o = papierOffre; papierOffre = null; dlg.attendReponse = 0; if (!o) return;
    const p = o.p, id = ('00000000' + Math.random().toString(16).slice(2, 10)).slice(-8);
    try {
      await carnet('papiers', { action: 'ajoute', item: Object.assign({ id, fait: !!p.deja_paye }, p) });
      await carnet('papiers', { action: 'image', id, image: o.img });
    } catch (e) { return injoignable(); }
    const dits = [];
    if (p.echeance && /^(payer|declarer|repondre|signer|envoyer)$/.test(p.a_faire) && !p.deja_paye) {
      const verbe = { payer: 'À payer', declarer: 'À déclarer', repondre: 'Répondre', signer: 'À signer', envoyer: 'À envoyer' }[p.a_faire];
      try { await agenda([journee(p.echeance, `${verbe} : ${p.objet}${p.emetteur ? ` (${p.emetteur})` : ''}${p.montant ? ` — ${eu(p.montant)}` : ''}`, { pro: p.pro, rappel: 3 * 1440 })]); dits.push(`la date limite est dans ton agenda, le ${dateDit(p.echeance)}`); } catch (e) { /* tant pis */ }
    }
    if (p.expire_le) dits.push(`je te préviendrai deux mois avant son expiration, le ${dateDit(p.expire_le)}`);
    if (p.garantie_jusqua) { try { await carnet('entretien', { action: 'ajoute', item: { nom: p.appareil || p.objet, categorie: 'garantie', garantie_jusqua: p.garantie_jusqua, papier: id } }); dits.push(`la garantie court jusqu'au ${dateDit(p.garantie_jusqua)}`); } catch (e) { /* tant pis */ } }
    if (p.facture_emise && p.montant) { try { await carnet('budget', { action: 'ajoute', item: { type: 'ca', date: p.date_doc || auj(), montant: p.montant, libelle: `Facture ${p.reference || ''} ${p.emetteur || ''}`.trim(), source: 'papier' } }); dits.push(`j'ajoute ${eu(p.montant)} à ton chiffre d'affaires`); } catch (e) { /* tant pis */ } }
    fx.ok(); hideBoard();
    return say(`C'est rangé${dits.length ? ` : ${liste(dits)}` : ''}. Demande-le-moi quand tu veux.`);
  }
  async function cherchePapier(n, t) {
    let c; try { c = await carnet('papiers'); } catch (e) { return injoignable(); }
    const mots = motsDe(n).map(w => w.replace(/s$/, ''));
    const score = x => { const t = N([x.type, x.categorie, x.emetteur, x.objet, x.reference, x.resume, x.appareil].join(' ')); return mots.filter(w => t.includes(w)).length; };
    const l = (c.items || []).map(x => [x, score(x)]).filter(([, s_]) => s_ > 0).sort((a, b) => b[1] - a[1] || (b[0].at || 0) - (a[0].at || 0)).map(([x]) => x);
    if (!l.length && t) { const f = typeof FOYER !== 'undefined' && FOYER.route(t, n); if (f) return f(); }
    if (!l.length) return say((c.items || []).length ? "Je ne trouve pas ce papier parmi ceux que tu m'as montrés. Montre-le-moi : dis « range ce papier »." : "Tu ne m'as encore montré aucun papier. Dis « range ce papier » et prends-le en photo.");
    const x = l[0];
    showBoard(carte(`PAPIER · ${String(x.type || '').toUpperCase()}`, '#a5b4fc', `<div style="display:flex;gap:14px;margin-top:10px"><img src="${r0()}/maison/carnet/papiers/image/${esc(x.id)}.jpg" style="max-width:min(60vw,420px);max-height:70vh;border-radius:8px;object-fit:contain"><div style="font-size:16px;line-height:1.5"><b>${esc(x.emetteur || '')}</b><br>${esc(x.objet || '')}${x.montant ? `<br>${eu(x.montant)}` : ''}${x.reference ? `<br><span style="color:#94a3b8">Réf. ${esc(x.reference)}</span>` : ''}${x.date_doc ? `<br><span style="color:#94a3b8">du ${esc(dateDit(x.date_doc))}</span>` : ''}${l.length > 1 ? `<p style="color:#94a3b8;font-size:13px">Aussi : ${esc(l.slice(1, 4).map(y => y.objet).join(' · '))}</p>` : ''}</div></div>`));
    return say(`Voilà : ${x.objet}${x.emetteur ? `, de ${x.emetteur}` : ''}${x.date_doc ? `, du ${dateDit(x.date_doc)}` : ''}. Il est à l'écran.${x.reference ? ` La référence : ${x.reference}.` : ''}`);
  }
  async function aPayer(n) {
    let c, b; try { [c, b] = await Promise.all([carnet('papiers'), carnet('budget')]); } catch (e) { return injoignable(); }
    const sem = /\bsemaine\b/.test(n), fin = sem ? plusJours(7) : (() => { const d = new Date(), f = dJ(new Date(d.getFullYear(), d.getMonth() + 1, 0)), p3 = plusJours(21); return f > p3 ? f : p3; })(); // en fin de mois : les trois semaines qui viennent
    const l = (c.items || []).filter(x => !x.fait && x.echeance && x.echeance <= fin && /^(payer|declarer|repondre|signer|envoyer)$/.test(x.a_faire)).sort((a, b_) => a.echeance.localeCompare(b_.echeance));
    const jour = new Date().getDate(), finJ = sem ? jour + 7 : 31;
    const acts = (b.actions || []).filter(a => a.jour >= jour && a.jour <= finJ && (!a.jusqua || auj() <= a.jusqua));
    const total = l.reduce((s_, x) => s_ + (x.a_faire === 'payer' ? +x.montant || 0 : 0), 0);
    showBoard(carte(sem ? 'CETTE SEMAINE' : 'CE MOIS-CI', '#fca5a5', `${l.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:17px"><span><b style="color:#fde68a">${esc(dateDit(x.echeance))}</b> · ${esc(x.objet)}${x.emetteur ? ` <span style="color:#94a3b8">(${esc(x.emetteur)})</span>` : ''}</span><b>${x.montant ? eu(x.montant) : esc(x.a_faire)}</b></div>`).join('') || '<p style="color:#94a3b8">Aucun papier à régler.</p>'}${acts.length ? `<div style="margin-top:12px;color:#a5b4fc;font-size:13px;letter-spacing:.2em">TON PLAN DU MOIS</div>${acts.map(a => `<div style="font-size:15px;padding:4px 0;color:#e2e8f0">le ${a.jour === 1 ? '1er' : a.jour} : ${esc(a.texte)}</div>`).join('')}` : ''}`));
    if (!l.length && !acts.length) return say(`Rien à régler ${sem ? 'cette semaine' : 'ce mois-ci'} dans tes papiers. Tes prélèvements, eux, partent tout seuls.`);
    return say(`${l.length ? `${sem ? 'Cette semaine' : 'Bientôt'}, ${l.length} papier${l.length > 1 ? 's' : ''} à régler${total ? `, ${eu(total)} à payer` : ''} : ${l.slice(0, 5).map(x => `${x.objet} avant le ${dateDit(x.echeance)}`).join(' ; ')}.` : 'Aucun papier à régler.'}${acts.length ? ` ${l.length ? 'Et dans' : 'Dans'} ton plan : ${acts.slice(0, 3).map(a => `le ${a.jour === 1 ? '1er' : a.jour}, ${a.texte}`).join(' ; ')}.` : ''}`);
  }
  async function papierFait(n) {
    let c; try { c = await carnet('papiers'); } catch (e) { return injoignable(); }
    const mots = motsDe(n.replace(/\b(j ai|paye|payee|regle|reglee|envoye|signe|repondu|fait)\b/g, ''));
    const x = (c.items || []).filter(y => !y.fait).find(y => mots.some(w => N([y.objet, y.emetteur, y.type].join(' ')).includes(w)));
    if (!x) return say("Je ne trouve pas ce papier parmi ceux qui restent à régler.");
    try { await carnet('papiers', { action: 'modifie', id: x.id, champs: { fait: true, fait_le: auj() } }); } catch (e) { return injoignable(); }
    if (x.a_faire === 'payer' && x.montant) { try { await carnet('budget', { action: 'ajoute', item: { type: 'depense', date: auj(), montant: x.montant, libelle: x.objet, categorie: x.categorie || 'autre', source: 'papier' } }); } catch (e) { /* tant pis */ } }
    fx.ok(); return say(`C'est noté : ${x.objet}, réglé.`);
  }

  /* =================== 2. LA MICRO-ENTREPRISE : le chiffre d'affaires, l'URSSAF =================== */
  async function facture(t, n) {
    const m = String(t).match(/(\d[\d  .]*(?:[,.]\d{1,2})?)\s*(?:€|euros?)/i); if (!m) return say("Combien ? Dis par exemple : j'ai facturé 1 800 euros à ma société.");
    const v = parseFloat(m[1].replace(/[\s  .](?=\d{3}\b)/g, '').replace(',', '.'));
    const qui = (String(t).match(/(?:^|\s)(?:à|a|pour)\s+([^\d].+?)\s*[.!?]*$/i) || [])[1] || '';
    let date = auj(); const mm = MOIS.findIndex(x => n.includes(N(x))); if (mm >= 0 && /\b(en|de|pour|du mois de)\b/.test(n)) { const d = new Date(); date = dJ(new Date(d.getFullYear() - (mm > d.getMonth() ? 1 : 0), mm, 15)); }
    try { await carnet('budget', { action: 'ajoute', item: { type: 'ca', date, montant: v, libelle: qui ? `Facture ${qui.replace(/\d.*$/, '').trim()}` : 'Facture', source: 'dit' } }); } catch (e) { return injoignable(); }
    let b; try { b = await carnet('budget'); } catch (e) { b = { items: [] }; }
    const mois = date.slice(0, 7), ca = (b.items || []).filter(x => x.type === 'ca' && String(x.date).startsWith(mois)).reduce((s_, x) => s_ + +x.montant, 0);
    fx.ok(); return say(`C'est noté : ${eu(v)}. Ton chiffre d'affaires ${deMois(+mois.slice(5) - 1)} : ${eu(ca)}. Je te le rappellerai pour la déclaration URSSAF.`);
  }
  async function ca(n) {
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const d = new Date(), an = /\b(annee|an)\b/.test(n), prec = /\b(dernier|precedent)\b/.test(n);
    const cle = an ? String(d.getFullYear()) : dJ(new Date(d.getFullYear(), d.getMonth() - (prec ? 1 : 0), 1)).slice(0, 7);
    const l = (b.items || []).filter(x => x.type === 'ca' && String(x.date).startsWith(cle)), tot = l.reduce((s_, x) => s_ + +x.montant, 0);
    return say(l.length ? `Ton chiffre d'affaires ${an ? 'de l’année' : deMois(+cle.slice(5) - 1)} : ${eu(tot)}, en ${l.length} facture${l.length > 1 ? 's' : ''}.` : `Je n'ai aucune facture pour ${an ? 'cette année' : `${MOIS[+cle.slice(5) - 1]}`}. Dis-moi « j'ai facturé … euros à … », ou montre-moi la facture.`);
  }
  async function declare() {
    const d = new Date(), cle = dJ(new Date(d.getFullYear(), d.getMonth() - 1, 1)).slice(0, 7);
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const f = [...new Set([...(b.urssaf_fait || []), cle])].slice(-24);
    try { await carnet('budget', { action: 'cle', cle: 'urssaf_fait', valeur: f }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`Parfait : la déclaration URSSAF ${deMois(+cle.slice(5) - 1)} est faite. Je ne t'en reparle plus avant le mois prochain.`);
  }

  /* =================== 3. LE CARNET D'ENTRETIEN =================== */
  const MODELES = [
    { nom: 'Révision de la chaudière', categorie: 'maison', jours: 365, q: 'La dernière révision de la chaudière, c’était quand ?' },
    { nom: 'Test des détecteurs de fumée', categorie: 'maison', jours: 30 },
    { nom: 'Nettoyage des bouches de VMC', categorie: 'maison', jours: 180 },
    { nom: 'Filtre de la hotte', categorie: 'maison', jours: 90 },
    { nom: 'Filtre du lave-vaisselle', categorie: 'maison', jours: 30 },
    { nom: 'Contrôle technique de la voiture', categorie: 'voiture', jours: 730, q: 'Le dernier contrôle technique de la voiture, c’était quand ?' },
    { nom: 'Vidange de la voiture', categorie: 'voiture', jours: 365, q: 'La dernière vidange de la voiture ?' },
    { nom: 'Pression des pneus', categorie: 'voiture', jours: 60 },
    { nom: 'Litière des cochons d’Inde', categorie: 'animaux', jours: 7 },
    { nom: 'Griffes des cochons d’Inde', categorie: 'animaux', jours: 45 },
    { nom: 'Visite chez le vétérinaire des cochons d’Inde', categorie: 'animaux', jours: 365, q: 'La dernière visite des cochons d’Inde chez le vétérinaire ?' },
  ];
  async function remplit() {
    let c; try { c = await carnet('entretien'); } catch (e) { return injoignable(); }
    await say("On remplit ton carnet d'entretien. Je te pose quelques questions ; dis « je ne sais pas » si tu ne sais pas, je te le rappellerai pour vérifier.");
    for (const m of MODELES) {
      if ((c.items || []).some(x => N(x.nom) === N(m.nom))) continue;
      let derniere = '';
      if (m.q) { const a = await ask(m.q, { wait: 15000 }); if (/^(stop|arrete|on arrete|c est bon|ca suffit)\b/.test(N(a))) break; derniere = /\b(sais pas|aucune idee|jamais)\b/.test(N(a)) ? '' : await dateDe(a); }
      const prochaine = derniere ? plusJours(m.jours, derniere) : plusJours(m.q ? 14 : Math.min(m.jours, 7));
      try { await carnet('entretien', { action: 'ajoute', item: { nom: m.nom, categorie: m.categorie, jours: m.jours, derniere, prochaine: prochaine < auj() ? plusJours(7) : prochaine } }); } catch (e) { return injoignable(); }
    }
    let n2; try { n2 = await carnet('entretien'); } catch (e) { n2 = { items: [] }; }
    montreEntretien(n2.items || []);
    return say(`C'est rempli : ${(n2.items || []).length} choses à suivre. Je te préviens une semaine avant, la veille et le jour même. Dis-moi « j'ai fait la vidange » quand c'est fait, et pour une garantie, montre-moi la facture de l'appareil.`);
  }
  function montreEntretien(l) {
    const tri = l.slice().sort((a, b) => String(a.prochaine || a.garantie_jusqua || '9').localeCompare(String(b.prochaine || b.garantie_jusqua || '9')));
    showBoard(carte("CARNET D'ENTRETIEN", '#86efac', tri.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:16px"><span>${esc(x.nom)} <span style="color:#94a3b8;font-size:13px">${esc(x.categorie || '')}</span></span><b style="color:${x.prochaine && x.prochaine <= plusJours(7) ? '#fca5a5' : '#e2e8f0'}">${x.categorie === 'garantie' ? `garantie → ${esc(dateDit(x.garantie_jusqua))}` : x.prochaine ? esc(dateDit(x.prochaine)) : ''}</b></div>`).join('') || '<p style="color:#94a3b8">Vide. Dis « on remplit le carnet d’entretien ».</p>'));
  }
  async function aFaireMaison(n) {
    let c; try { c = await carnet('entretien'); } catch (e) { return injoignable(); }
    const lim = plusJours(/\bsemaine\b/.test(n) ? 7 : 31), l = (c.items || []).filter(x => x.prochaine && x.prochaine <= lim).sort((a, b) => a.prochaine.localeCompare(b.prochaine));
    montreEntretien(c.items || []);
    if (!(c.items || []).length) return say("Ton carnet d'entretien est vide. Dis « on remplit le carnet d'entretien » : deux minutes, et je m'occupe de tout te rappeler.");
    return say(l.length ? `À faire bientôt : ${l.slice(0, 6).map(x => `${x.nom}, ${x.prochaine <= auj() ? 'maintenant' : dateDit(x.prochaine)}`).join(' ; ')}.` : 'Rien à faire dans la maison ce mois-ci. Tout est à jour.');
  }
  async function entretienFait(t, n) {
    let c; try { c = await carnet('entretien'); } catch (e) { return injoignable(); }
    const mots = motsDe(n.replace(/\b(j ai|on a|fait|faite|faits|change|changee|nettoye|nettoyee|teste|passe|aujourd hui|hier|ce matin)\b/g, '')).map(w => w.replace(/s$/, ''));
    const x = (c.items || []).filter(y => y.categorie !== 'garantie').map(y => [y, mots.filter(w => N(y.nom).includes(w)).length]).filter(([, s_]) => s_ > 0).sort((a, b) => b[1] - a[1]).map(([y]) => y)[0];
    if (!x) return null;
    const quand = /\bhier\b/.test(n) ? plusJours(-1) : auj();
    const prochaine = x.jours ? plusJours(x.jours, quand) : '';
    try { await carnet('entretien', { action: 'modifie', id: x.id, champs: { derniere: quand, prochaine } }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`C'est noté : ${x.nom.charAt(0).toLowerCase() + x.nom.slice(1)}, fait.${prochaine ? ` La prochaine fois : ${dateDit(prochaine)}. Je te le rappellerai.` : ''}`);
  }
  async function dateEntretien(t, n) { // « le contrôle technique, c'est le 12 mars »
    let c; try { c = await carnet('entretien'); } catch (e) { return injoignable(); }
    const mots = motsDe(n).map(w => w.replace(/s$/, ''));
    const x = (c.items || []).filter(y => y.categorie !== 'garantie').find(y => mots.filter(w => N(y.nom).includes(w)).length >= 1);
    const d = await dateDe(t); if (!d) return say('À quelle date ? Dis par exemple : le contrôle technique, c’est le 12 mars.');
    if (x) { try { await carnet('entretien', { action: 'modifie', id: x.id, champs: { prochaine: d } }); } catch (e) { return injoignable(); } }
    else { try { await carnet('entretien', { action: 'ajoute', item: { nom: String(t).replace(/\s*,?\s*c['’]est\s+.*$/i, '').replace(/^(le|la|les|l['’])\s*/i, '').trim().slice(0, 60) || 'Entretien', categorie: 'maison', prochaine: d } }); } catch (e) { return injoignable(); } }
    try { await agenda([journee(d, x ? x.nom : String(t).slice(0, 60), { rappel: 1440 })]); } catch (e) { /* tant pis */ }
    fx.ok(); return say(`C'est noté pour le ${dateDit(d)}, et c'est dans ton agenda.`);
  }
  async function garantie(t, n) {
    let c; try { c = await carnet('entretien'); } catch (e) { return injoignable(); }
    if (/\b(jusqu|jusqu a|jusqu en)\b/.test(n) && /\b(garantie|garanti)\b/.test(n) && !/\b(est ce|encore|toujours)\b/.test(n)) { // « le lave-linge est garanti jusqu'en mars 2028 »
      const nom = String(t).replace(/\s+(est|sont)\s+(sous\s+)?garanti.*$/i, '').replace(/^(la garantie d[eu]s?|la garantie de la|le|la|les|l['’]|mon|ma|mes)\s*/i, '').trim();
      const d = await dateDe(t); if (!d || !nom) return say("Je n'ai pas compris. Dis par exemple : le lave-linge est garanti jusqu'en mars 2028.");
      try { await carnet('entretien', { action: 'ajoute', item: { nom, categorie: 'garantie', garantie_jusqua: d } }); } catch (e) { return injoignable(); }
      fx.ok(); return say(`C'est noté : ${nom}, garanti jusqu'au ${dateDit(d)}.`);
    }
    const mots = motsDe(n.replace(/\b(garantie|garanti|sous|encore|toujours|est ce que)\b/g, ''));
    const x = (c.items || []).filter(y => y.garantie_jusqua).find(y => mots.some(w => N(y.nom).includes(w)));
    if (!x) return say("Je n'ai pas la garantie de cet appareil. Montre-moi sa facture (« range ce papier »), ou dis « le lave-linge est garanti jusqu'en mars 2028 ».");
    const ok = x.garantie_jusqua >= auj();
    if (x.papier) showBoard(carte('LA FACTURE', '#86efac', `<img src="${r0()}/maison/carnet/papiers/image/${esc(x.papier)}.jpg" style="margin-top:10px;max-width:min(80vw,460px);max-height:70vh;border-radius:8px">`));
    return say(ok ? `Oui : ${x.nom} est sous garantie jusqu'au ${dateDit(x.garantie_jusqua)}.${x.papier ? ' La facture est à l’écran.' : ''}` : `Non : la garantie de ${x.nom} s'est terminée le ${dateDit(x.garantie_jusqua)}.`);
  }

  /* =================== 4. LE BUDGET =================== */
  const moisCle = () => auj().slice(0, 7);
  const actives = b => (b.charges || []).filter(x => !x.jusqua || auj() <= x.jusqua);
  async function budget() {
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    if (!(b.charges || []).length) return say("Je n'ai pas encore ton budget. Dépose ton fichier de dépenses dans le dossier Atlas-budget de l'ordinateur, puis dis « mets à jour mon budget ».");
    const ch = actives(b), perso = ch.filter(x => x.type !== 'pro'), pro = ch.filter(x => x.type === 'pro');
    const tP = perso.reduce((s_, x) => s_ + x.montant, 0), tPr = pro.reduce((s_, x) => s_ + x.montant, 0), rev = (b.revenus || []).reduce((s_, x) => s_ + x.montant, 0);
    const dep = (b.items || []).filter(x => x.type === 'depense' && String(x.date).startsWith(moisCle()));
    const par = {}; dep.forEach(x => { par[x.categorie || 'autre'] = (par[x.categorie || 'autre'] || 0) + +x.montant; });
    const ali = (ch.find(x => x.categorie === 'alimentation') || {}).montant || 0;
    showBoard(carte('TON BUDGET DU MOIS', '#fde68a', `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px">${[['Revenus', rev, '#86efac'], ['Charges perso', tP, '#fca5a5'], ['Charges pro', tPr, '#93c5fd']].map(([k, v, c_]) => `<div style="background:rgba(255,255,255,.05);border-radius:12px;padding:10px"><small style="color:#94a3b8">${k}</small><div style="font-size:22px;font-weight:800;color:${c_}">${eu(v)}</div></div>`).join('')}</div><div style="margin-top:10px;font-size:16px">Il te reste <b style="color:${rev - tP - tPr >= 0 ? '#86efac' : '#fca5a5'}">${eu(rev - tP - tPr)}</b> par mois, une fois les charges payées.</div>${Object.keys(par).length ? `<div style="margin-top:10px;color:#a5b4fc;font-size:13px;letter-spacing:.2em">DÉPENSES NOTÉES CE MOIS-CI</div>${Object.entries(par).sort((a, b_) => b_[1] - a[1]).map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:15px;padding:3px 0"><span>${esc(k)}</span><b>${eu(v)}</b></div>`).join('')}` : ''}${ali && par.alimentation ? `<div style="margin-top:6px;font-size:14px;color:${par.alimentation > ali ? '#fca5a5' : '#86efac'}">Courses : ${eu(par.alimentation)} sur ${eu(ali)} prévus</div>` : ''}`));
    return say(`Chaque mois : ${eu(rev)} qui rentrent, ${eu(tP)} de charges perso et ${eu(tPr)} de charges pro. Il te reste ${eu(rev - tP - tPr)}.${ali && par.alimentation ? ` Pour les courses, tu en es à ${eu(par.alimentation)} sur ${eu(ali)}.` : ''}`);
  }
  async function abonnements() {
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const l = actives(b).filter(x => x.abonnement).concat(((b.societe || {}).depenses || []).filter(x => x.abonnement).map(x => Object.assign({ type: 'société' }, x)));
    if (!l.length) return say("Je n'ai pas encore la liste de tes abonnements. Dis « mets à jour mon budget ».");
    const tot = l.reduce((s_, x) => s_ + x.montant, 0), gros = l.slice().sort((a, b_) => b_.montant - a.montant);
    showBoard(carte(`TES ABONNEMENTS · ${eu(tot)} PAR MOIS · ${eu(tot * 12)} PAR AN`, '#fde68a', gros.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:16px"><span>${esc(x.nom)} <span style="color:#94a3b8;font-size:13px">${esc(x.type || '')}${x.jusqua ? ` · jusqu'au ${esc(dateDit(x.jusqua))}` : ''}</span></span><b>${eu(x.montant)}</b></div>`).join('')));
    return say(`${l.length} abonnements, ${eu(tot)} par mois, soit ${eu(tot * 12)} par an. Les plus chers : ${gros.slice(0, 3).map(x => `${x.nom}, ${eu(x.montant)}`).join(' ; ')}. Dis-moi si l'un d'eux ne te sert plus : je te rappellerai de le résilier.`);
  }
  async function depense(t, n) {
    const m = String(t).match(/(\d+(?:[,.]\d{1,2})?)\s*(?:€|euros?)/i); if (!m) return null;
    const v = parseFloat(m[1].replace(',', '.'));
    const ou = (String(t).match(/(?:^|\s)(?:chez|à|au|pour|en)\s+([^\d].+?)\s*[.!?]*$/i) || [])[1] || '';
    const cat = /\b(courses|supermarche|aldi|lidl|leclerc|carrefour|auchan|boulangerie|marche|nourriture)\b/.test(n) ? 'alimentation' : /\b(essence|carburant|gasoil|peage|parking|garage)\b/.test(n) ? 'voiture' : /\b(restaurant|resto|cafe|bar|mcdo)\b/.test(n) ? 'sorties' : /\b(pharmacie|medecin|dentiste|kine)\b/.test(n) ? 'santé' : /\b(decathlon|vetements|habits|chaussures)\b/.test(n) ? 'achats' : /\b(cadeau)\b/.test(n) ? 'cadeaux' : 'autre';
    return ajouteDepense({ montant: v, libelle: ou || 'dépense', categorie: cat, source: 'dit' }, true);
  }
  async function ajouteDepense(x, parle) {
    try { await carnet('budget', { action: 'ajoute', item: Object.assign({ type: 'depense', date: auj() }, x) }); } catch (e) { return parle ? injoignable() : null; }
    let b; try { b = await carnet('budget'); } catch (e) { return null; }
    const tot = (b.items || []).filter(y => y.type === 'depense' && y.categorie === x.categorie && String(y.date).startsWith(moisCle())).reduce((s_, y) => s_ + +y.montant, 0);
    const prevu = x.categorie === 'alimentation' ? ((actives(b).find(y => y.categorie === 'alimentation') || {}).montant || 0) : 0;
    const alerte = prevu && tot > prevu ? ` Attention : ce mois-ci, tu en es à ${eu(tot)} de courses, pour ${eu(prevu)} prévus.` : prevu && tot > prevu * 0.8 ? ` Tu en es à ${eu(tot)} de courses sur ${eu(prevu)} prévus ce mois-ci.` : '';
    if (!parle) { if (alerte) PROACTIF.annonce(`budget-ali-${moisCle()}-${Math.floor(tot / 25)}`, alerte.trim(), { expire: Date.now() + 6 * 3600000 }); return null; }
    fx.ok(); return say(`C'est noté : ${eu(x.montant)}, ${x.libelle}.${alerte}`);
  }
  async function depenses(n) {
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const cat = /\b(courses|nourriture|alimentation)\b/.test(n) ? 'alimentation' : '';
    const l = (b.items || []).filter(x => x.type === 'depense' && String(x.date).startsWith(moisCle()) && (!cat || x.categorie === cat));
    const tot = l.reduce((s_, x) => s_ + +x.montant, 0);
    return say(l.length ? `Ce mois-ci, ${cat ? 'en courses, ' : ''}tu as dépensé ${eu(tot)}, d'après ${l.length} ticket${l.length > 1 ? 's' : ''} ou dépense${l.length > 1 ? 's' : ''} notée${l.length > 1 ? 's' : ''}. Tes charges fixes, elles, partent en prélèvement.` : "Je n'ai aucune dépense notée ce mois-ci. Photographie tes tickets, ou dis-moi « j'ai dépensé 45 euros chez Decathlon ».");
  }
  async function majBudget() {
    if (!AI.ready()) return say('Pour relire ton budget, il me faut mon cerveau en ligne.');
    let f; try { f = await (await fetch(`${r0()}/maison/carnet/budget/fichier`, { cache: 'no-store' })).json(); } catch (e) { return injoignable(); }
    if (!f.ok) return say("Je ne trouve pas de fichier. Sur l'ordinateur, dépose ton fichier de dépenses, en Excel ou en CSV, dans le dossier Atlas-budget de ton dossier personnel, puis redis-le-moi.");
    face.set('think'); await say(`Je relis ${f.fichier}.`);
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu lis le fichier de budget d'un père (perso, pro, sa société). Extrais-le en JSON, SANS RIEN INVENTER (montants en nombres, jour du mois 1 à 31) :
{"charges": [{"nom": "…", "beneficiaire": "…", "montant": 0, "jour": 1, "compte": "…", "categorie": "logement|famille|alimentation|banque|assurance|énergie|eau|maison|sport|soins|abonnements pro|télécom|transport|autre", "type": "perso|pro", "abonnement": true, "jusqua": "AAAA-MM-JJ ou vide"}], "revenus": [{"nom": "…", "montant": 0, "compte": "…"}], "comptes": [{"compte": "…", "montant": 0, "avant": 1, "couvre": "…"}], "actions": [{"jour": 1, "texte": "à l'impératif, en tutoyant (ex. vire 700 € de loyer à …)", "montant": 0, "jusqua": "AAAA-MM-JJ ou vide"}], "taches": [{"texte": "…", "date": "AAAA-MM-JJ ou vide"}], "societe": {"compte": "…", "revenus": [{"nom": "…", "montant": 0}], "depenses": [{"nom": "…", "montant": 0, "abonnement": false}]}}` }, { role: 'user', content: f.texte.slice(0, 30000) }], { maxTokens: 6000, temperature: 0, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r || !(r.charges || []).length) return say("Je n'ai pas réussi à lire ce fichier. Vérifie qu'il ressemble à ton tableau de dépenses mensuelles.");
    const tot = r.charges.reduce((s_, x) => s_ + (+x.montant || 0), 0);
    if (!(await askYesNo(`J'ai lu ${r.charges.length} charges, ${eu(tot)} par mois, ${(r.revenus || []).length} revenus et ${(r.actions || []).length} actions dans ton plan. Je remplace ton budget par celui-ci ?`))) return say("D'accord, je garde l'ancien.");
    try {
      for (const k of ['charges', 'revenus', 'comptes', 'actions', 'societe']) if (r[k]) await carnet('budget', { action: 'cle', cle: k, valeur: r[k] });
      await carnet('budget', { action: 'cle', cle: 'source', valeur: `${f.fichier}, relu le ${new Date().toLocaleDateString('fr-FR')}` });
      for (const t of (r.taches || []).slice(0, 10)) await carnet('taches', { action: 'ajoute', item: { texte: t.texte, date: /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? t.date : '', categorie: 'budget' } });
    } catch (e) { return injoignable(); }
    fx.ok(); return say("C'est à jour. Je te rappelle chaque action du mois le jour même, à 9 heures.");
  }
  async function resilier(t) { // « rappelle-moi de résilier Kittl avant la fin du mois »
    const d = (await dateDe(t)) || plusJours(7);
    const quoi = String(t).replace(/^.*?\b(résilier|resilier|arrêter|arreter)\s+/i, '').replace(/\s+(avant|d'ici|le|pour)\b.*$/i, '').trim();
    try { await carnet('taches', { action: 'ajoute', item: { texte: `résilier ${quoi}`, date: d, categorie: 'budget' } }); } catch (e) { return injoignable(); }
    fx.ok(); return say(`C'est noté : résilier ${quoi}, je te le rappelle le ${dateDit(d)}, et une semaine avant.`);
  }

  /* =================== 5. LES WEEK-ENDS AVEC SON FILS =================== */
  let weekendOffre = null;
  async function meteoWeekend() {
    const v = S.settings.ville || { lat: 50.63, lon: 3.06 };
    try { const m = (await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&daily=weathercode,temperature_2m_max,precipitation_probability_max&forecast_days=8&timezone=Europe%2FParis`)).json()).daily; return m.time.map((d, i) => ({ d, code: m.weathercode[i], tmax: Math.round(m.temperature_2m_max[i]), pluie: m.precipitation_probability_max[i] })).filter(x => [0, 6].includes(new Date(`${x.d}T12:00:00`).getDay())).slice(0, 2); } catch (e) { return []; }
  }
  async function weekend() {
    if (!AI.ready()) return say('Pour te proposer des sorties, il me faut mon cerveau en ligne.');
    weekendOffre = null; face.set('think');
    const met = await meteoWeekend(), prenom = LIEN.prenom() || 'ton fils';
    let deja = []; try { deja = ((await carnet('weekends')).items || []).slice(-12).map(x => x.titre); } catch (e) { deja = []; }
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu proposes des sorties de week-end pour un père et son fils de 7 ans (CE1, il aime l'espace, les robots, les sciences, la gym ; un robot à la maison s'appelle Shadow), autour de Lille (métropole lilloise, à moins de 45 minutes). Des lieux RÉELS et connus (parcs, musées, forêts, fermes pédagogiques, bases de loisirs, médiathèques, piscines, planétarium…), sans inventer d'horaires ni de prix précis. Gratuit ou pas cher en priorité. Adapte à la météo (pluie → intérieur). Varie par rapport aux sorties déjà faites. 3 idées. JSON UNIQUEMENT : {"sorties": [{"titre": "court", "lieu": "nom du lieu, ville", "jour": "samedi|dimanche", "debut": "14:00", "fin": "17:00", "pourquoi": "moins de 20 mots", "prix": "gratuit|petit prix|à vérifier", "pique_nique": true, "mission": "une phrase de mission spatiale pour l'annoncer à l'enfant"}]}` }, { role: 'user', content: `Météo : ${met.map(x => `${JS[new Date(`${x.d}T12:00:00`).getDay()]} ${x.tmax} °C, pluie ${x.pluie} %`).join(' ; ') || 'inconnue'}. Déjà faites : ${deja.join(', ') || 'aucune'}.` }], { maxTokens: 1200, temperature: 0.8, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    const l = ((r && r.sorties) || []).filter(x => x && x.titre).slice(0, 3);
    if (!l.length) return say("Je n'ai pas trouvé d'idée pour le moment. Redemande-moi dans un instant.");
    weekendOffre = { at: Date.now(), l, met }; dlg.attendReponse = Date.now() + 180000;
    showBoard(carte(`LE WEEK-END AVEC ${prenom.toUpperCase()}${met.length ? ` · ${met.map(x => `${JS[new Date(`${x.d}T12:00:00`).getDay()]} ${x.tmax}° ${x.pluie > 50 ? '🌧' : '☀'}`).join(' · ')}` : ''}`, '#7dd3fc', l.map((x, i) => `<div style="margin:10px 0;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.05)"><b style="font-size:18px">${i + 1}. ${esc(x.titre)}</b> <span style="color:#94a3b8">· ${esc(x.jour)} ${esc(x.debut || '')}</span><div style="color:#cbd5e1;font-size:15px">${esc(x.lieu || '')} — ${esc(x.pourquoi || '')}</div><div style="color:#86efac;font-size:13px">${esc(x.prix || '')}${x.pique_nique ? ' · pique-nique' : ''}</div></div>`).join('') + '<p style="color:#94a3b8;font-size:13px">Vérifie les horaires sur place ou sur leur site avant de partir.</p>'));
    return say(`Pour le week-end avec ${prenom}, je te propose : ${l.map((x, i) => `${['un', 'deux', 'trois'][i]}, ${x.titre}, ${x.jour}`).join(' ; ')}. Laquelle ? Dis « la deuxième », par exemple.`);
  }
  async function choisitSortie(k) {
    const o = weekendOffre; weekendOffre = null; dlg.attendReponse = 0; const x = o && o.l[k]; if (!x) return;
    const prenom = LIEN.prenom() || '';
    const d = new Date(); const cible = x.jour === 'dimanche' ? 0 : 6; d.setDate(d.getDate() + ((cible - d.getDay() + 7) % 7 || 7)); const iso = dJ(d);
    const deb = /^\d{1,2}:\d{2}$/.test(x.debut || '') ? x.debut : '14:00', fin = /^\d{1,2}:\d{2}$/.test(x.fin || '') ? x.fin : '17:00';
    const evt = { titre: `${x.titre}${prenom ? ` avec ${prenom}` : ''}`, debut: Math.floor(new Date(`${iso}T${deb.padStart(5, '0')}:00`).getTime() / 1000), fin: Math.floor(new Date(`${iso}T${fin.padStart(5, '0')}:00`).getTime() / 1000), lieu: x.lieu || '', pro: false };
    const dits = [];
    try { await agenda([evt]); dits.push(`c'est dans ton agenda, ${x.jour} à ${deb.replace(':00', ' heures').replace(':', ' h ')}`); } catch (e) { /* tant pis */ }
    try { await carnet('weekends', { action: 'ajoute', item: { titre: x.titre, lieu: x.lieu, date: iso } }); } catch (e) { /* rien */ }
    // le pique-nique au menu du midi (si l'heure s'y prête)
    if (x.pique_nique && +deb.split(':')[0] <= 13 && typeof CUISINE !== 'undefined') { try { const r = await fetch(`${r0()}/maison/cuisine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'menu_jour', date: iso, repas: 'midi', plat: 'Pique-nique : wraps poulet crudités, fruits et eau' }) }); if (r.ok) dits.push('le pique-nique est au menu du midi'); } catch (e) { /* rien */ } }
    // Shadow l'annonce à son fils (tout de suite s'il est allumé ; et le matin même, dans son briefing, par l'agenda)
    try { await fetch(`${r0()}/maison/canal/shadow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de: 'atlas', type: 'annonce', texte: x.mission || `Mission spéciale du week-end : ${x.titre}, ${x.jour} avec papa !` }) }); dits.push('Shadow va lui annoncer la mission'); } catch (e) { /* rien */ }
    fx.ok(); hideBoard();
    return say(`Super choix : ${x.titre}. ${(l2 => l2.charAt(0).toUpperCase() + l2.slice(1))(liste(dits))}.`.replace(/\.\.$/, '.'));
  }

  /* =================== 6. « ON PRÉPARE LA SEMAINE » : tout, puis la Gazette =================== */
  async function semaine(o = {}) {
    window.__RITUEL = true;
    try {
      if (o.seul) await say("Je prépare ta semaine tout seul, d'après ton agenda : les menus, les courses, et ta Gazette imprimée.");
      else await say("On prépare ta semaine. D'abord ton planning, ensuite les repas et les courses, et je termine par ta Gazette imprimée.");
      // 1. le planning (dicté), sans l'imprimer à part ; tout seul (le dimanche soir sans lui) : l'agenda tel qu'il est
      if (!o.seul) { try { await AGENDA.planifie({ rituel: true }); } catch (e) { /* on continue */ } }
      // 2. les menus : adaptés s'ils existent, sinon faits (menus, courses, drive)
      // les menus faits APRÈS le planning, du lundi au dimanche ; s'il y en a déjà pour cette semaine-là, ils s'adaptent seulement
      let menus = [];
      const sem0 = AGENDA._semaine ? AGENDA._semaine() : [new Date()], du0 = dJ(sem0[0]);
      try {
        const deja = ((await CUISINE._charge(true)).menus || []).filter(x => x.date >= du0 && x.date <= dJ(sem0[sem0.length - 1]));
        if (deja.length >= 5) { const a = await CUISINE.adapte(); if (a && a.changes && a.changes.length) await say(`Les menus : ${a.changes.slice(0, 3).join(' ; ')}.`); }
        else { await say('Maintenant, les repas, faits pour ton planning.'); await CUISINE.semaine({ debut: du0, avantDrive: new Date().getDay() === 0 }); }
        menus = ((await CUISINE._charge(true)).menus || []);
      } catch (e) { /* on continue */ }
      // 3. le reste : la maison, son fils, les papiers, l'argent, les proches
      const [pa, en, ta, bu] = await Promise.all(['papiers', 'entretien', 'taches', 'budget'].map(k => carnet(k).catch(() => ({ items: [] }))));
      const j0 = (AGENDA._semaine ? AGENDA._semaine() : [new Date()]), du = dJ(j0[0]), au = dJ(j0[j0.length - 1]);
      const dans = iso => iso && iso >= du && iso <= au;
      const afaire = [];
      (pa.items || []).filter(x => !x.fait && x.echeance && x.echeance <= au && /^(payer|declarer|repondre|signer|envoyer)$/.test(x.a_faire)).forEach(x => afaire.push({ t: `${x.a_faire === 'payer' ? 'Payer' : x.a_faire === 'declarer' ? 'Déclarer' : 'Répondre à'} : ${x.objet}${x.montant ? ` (${eu(x.montant)})` : ''}`, d: x.echeance, g: 'papiers' }));
      (en.items || []).filter(x => x.prochaine && x.prochaine <= au).forEach(x => afaire.push({ t: x.nom, d: x.prochaine < du ? du : x.prochaine, g: 'maison' }));
      (ta.items || []).filter(x => !x.fait && (!x.date || x.date <= plusJours(14, au))).forEach(x => afaire.push({ t: x.texte.charAt(0).toUpperCase() + x.texte.slice(1), d: dans(x.date) ? x.date : '', g: 'à ne pas oublier' }));
      const fin = new Date(`${au}T12:00:00`).getDate(), debJ = new Date(`${du}T12:00:00`).getDate();
      (bu.actions || []).filter(a => (!a.jusqua || du <= a.jusqua) && (debJ <= fin ? a.jour >= debJ && a.jour <= fin : a.jour >= debJ || a.jour <= fin)).forEach(a => { const d = new Date(`${du}T12:00:00`); while (d.getDate() !== Math.min(a.jour, 28 + 3) && dJ(d) <= au) d.setDate(d.getDate() + 1); afaire.push({ t: a.texte.charAt(0).toUpperCase() + a.texte.slice(1), d: dJ(d) <= au ? dJ(d) : '', g: 'argent' }); });
      const d0 = new Date(`${du}T12:00:00`), d1 = new Date(`${au}T12:00:00`);
      (S.proches || []).filter(p => p.anniv).forEach(p => { const [m, j] = p.anniv.split('-').map(Number); let d = new Date(d0.getFullYear(), m - 1, j, 12); if (d < d0) d = new Date(d0.getFullYear() + 1, m - 1, j, 12); if (d <= new Date(d1.getTime() + 7 * 86400000)) afaire.push({ t: `Anniversaire de ${p.nom}${(p.idees || []).length ? ` — idée : ${p.idees[p.idees.length - 1]}` : ''}`, d: dJ(d) <= au ? dJ(d) : '', g: 'proches' }); });
      if (typeof AVENIR !== 'undefined') { (await AVENIR.devoirsAfaire()).filter(x => x.d >= du && x.d <= au).forEach(x => afaire.push(x)); (await AVENIR.expirantsAfaire(au)).forEach(x => afaire.push(x)); }
      let bilan = null; if (typeof AVENIR !== 'undefined') { try { bilan = await AVENIR.bilan(); } catch (e) { bilan = null; } }
      // 4. la Gazette
      let imp = false;
      try { const r = await fetch(`${r0()}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'gazette', du, au, jours: menus.filter(x => x.date >= du && x.date <= au), afaire: afaire.slice(0, 40), courses: coursesGroupees(), bilan, garde: typeof VIE !== 'undefined' ? VIE.phraseSemaine(Array.from({ length: 7 }, (v, i) => plusJours(i, du))) : '' }) }); imp = r.ok; } catch (e) { imp = false; }
      const n = afaire.length;
      S.semaineFaite = (AGENDA._semaine ? dJ(AGENDA._semaine()[0]) : auj()); save();
      if (o.seul) { S.semaineSansLui = S.semaineFaite; save(); return say(`Ta semaine est prête, et ta Gazette s'imprime sur l'imprimante du bureau. Demain matin, dis-moi « on fait mon planning » pour ajouter tes rendez-vous.`); }
      return say(`Ta semaine est prête.${n ? ` À ne pas oublier : ${afaire.filter(x => x.g !== 'argent').slice(0, 4).map(x => x.t).join(' ; ')}${n > 4 ? ', et le reste sur la feuille' : ''}.` : ''}${imp ? ` Ta Gazette de la semaine s'imprime sur l'imprimante du bureau : une page pour le planning, une pour le menu, une pour les courses, et une pour les choses à ne pas oublier.${bilan && bilan.conseil ? ` Mon conseil pour la semaine : ${bilan.conseil}` : ''}` : ''} Bonne semaine !`);
    } finally { window.__RITUEL = false; }
  }
  function coursesGroupees() {
    const RAY = ['fruits et légumes', 'boucherie et poisson', 'crèmerie et œufs', 'épicerie', 'boulangerie', 'surgelés', 'autre'];
    const l = (S.listes || []).filter(x => x.liste === 'courses');
    const g = {}; l.forEach(x => { const r = typeof CUISINE !== 'undefined' && CUISINE.rayonDe ? CUISINE.rayonDe(x.text) : 'autre'; const m = typeof PRIX !== 'undefined' ? PRIX.magasinDe(x.id) : ''; (g[r] = g[r] || []).push({ t: x.text, m: m ? m.charAt(0).toUpperCase() + m.slice(1) : '' }); });
    return RAY.filter(r => g[r]).map(r => ({ rayon: r, items: g[r] }));
  }

  /* =================== les rendez-vous de la semaine (le jeudi, les week-ends) =================== */
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (!dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    const sam = dJ(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2)), dim = dJ(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3));
    const avecLui = typeof VIE === 'undefined' ? null : (VIE.avec(sam) === null ? null : VIE.avec(sam) || VIE.avec(dim));
    if (d.getDay() === 4 && h >= 17.5 && h <= 21 && S.settings.weekendAuto !== false && S.weekendPropose !== dJ(d) && avecLui !== false) {
      PROACTIF.annonce(`weekend-${dJ(d)}`, () => { S.weekendPropose = dJ(new Date()); save(); weekendDemande = Date.now(); dlg.attendReponse = Date.now() + 150000; return avecLui ? `Ce week-end, ${LIEN.prenom() || 'ton fils'} est avec toi. Je te propose des sorties selon la météo ?` : `Le week-end arrive. Tu es avec ${LIEN.prenom() || 'ton fils'} ? Je te propose des sorties selon la météo ?`; }, { expire: Date.now() + 3 * 3600000 });
    }
  }, 10 * 60000);
  let weekendDemande = 0;
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (d.getDay() !== 0 || h < 21.5 || h > 21.95 || !dlg.started || S.settings.semaineSeule === false) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    const lundi = AGENDA._semaine ? dJ(AGENDA._semaine()[0]) : '';
    if (!lundi || S.semaineFaite === lundi || S.semaineEssai === lundi) return;
    S.semaineEssai = lundi; save();
    semaine({ seul: true }).catch(() => {});
  }, 5 * 60000);
  // le lundi matin : s'il l'a préparée seul, il propose de dicter le planning
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (d.getDay() !== 1 || h < 7.5 || h > 11 || !dlg.started || !S.semaineSansLui || S.semaineSansLuiDit === S.semaineSansLui) return;
    PROACTIF.annonce(`semaine-seul-${S.semaineSansLui}`, () => { S.semaineSansLuiDit = S.semaineSansLui; save(); return "Hier soir, j'ai préparé ta semaine tout seul : la Gazette est sur l'imprimante. Si tu as des rendez-vous à ajouter, dis « on fait mon planning »."; }, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);

  /* =================== les phrases =================== */
  function route(t, n) {
    if (papierOffre && Date.now() - papierOffre.at < 180000) {
      if (/^(oui|ouais|ok|d accord|vas y|range|range le|bien sur|c est bon)\b/.test(n)) return rangePapier;
      if (/^(non|pas la peine|laisse|annule)\b/.test(n)) return () => { papierOffre = null; dlg.attendReponse = 0; hideBoard(); return say("D'accord, je ne le garde pas."); };
    }
    if (weekendOffre && Date.now() - weekendOffre.at < 240000) {
      const k = /\b(la premiere|la 1|le premier|la une|numero un|premiere)\b/.test(n) ? 0 : /\b(la deuxieme|la seconde|la 2|le deuxieme|numero deux|deuxieme)\b/.test(n) ? 1 : /\b(la troisieme|la 3|le troisieme|numero trois|troisieme|la derniere)\b/.test(n) ? 2 : weekendOffre.l.findIndex(x => N(x.titre).split(' ').some(w => w.length > 4 && n.includes(w)));
      if (k >= 0 && weekendOffre.l[k] && n.split(' ').length <= 8) return () => choisitSortie(k);
      if (/^(non|aucune|pas la peine|laisse)\b/.test(n)) return () => { weekendOffre = null; dlg.attendReponse = 0; hideBoard(); return say("D'accord. Redemande-moi « des idées de sortie pour le week-end » quand tu veux."); };
    }
    if (weekendDemande && Date.now() - weekendDemande < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|carrement|go)\b/.test(n)) { weekendDemande = 0; return weekend; }
      if (/^(non|pas ce week end|il n est pas la|pas la peine|laisse)\b/.test(n)) return () => { weekendDemande = 0; dlg.attendReponse = 0; return say("D'accord. Bon week-end !"); };
    }
    // le rituel du dimanche
    if (/\b(on prepare|prepare|preparons|prepare moi)( toute| tout)? (la|ma) semaine\b|\bfais tout pour la semaine\b|\bla gazette de la semaine\b/.test(n) && !/\b(menus?|repas|courses|cuisine)\b/.test(n)) return semaine;
    // les papiers
    if (/\b(range|scanne|scan|photographie|lis|enregistre|garde|classe)\b.*\b(ce |mon |le |un )?(papier|courrier|document|facture|lettre|avis|attestation|contrat)\b/.test(n) && !/\b(ticket)\b/.test(n)) return scanne;
    if (/\b(ou est|ou sont|retrouve|trouve moi|montre moi|cherche|ressors)\b.*\b(attestation|facture|contrat|avis|courrier|papier|document|releve|quittance|bulletin|carte grise|lettre|taxe|impots?|assurance|mutuelle|ordonnance|fiche de paie|garantie|devis|amende|certificat)\b/.test(n)) return () => cherchePapier(n, t);
    if (/\b(qu est ce que|qu est ce qu|quoi|combien)\b.*\b(je dois|j ai a|a) (payer|regler)\b|\b(mes factures|les papiers) a (payer|regler)\b|\bce que je dois payer\b/.test(n)) return () => aPayer(n);
    if (/\bj ai (paye|regle|envoye|signe|repondu a)\b/.test(n) && !/\b(courses|ticket)\b/.test(n)) return () => papierFait(n);
    // la micro-entreprise
    if (/\bj ai (facture|emis une facture|envoye une facture)\b|\b(nouvelle facture|une facture) de \d/.test(n)) return () => facture(t, n);
    if (/\b(mon|le) chiffre d affaires?\b|\bmon ca\b/.test(n)) return () => ca(n);
    if (/\b(c est declare|j ai declare|declaration (urssaf )?faite|j ai fait (la|ma) declaration)\b/.test(n)) return declare;
    // l'entretien
    if (/\b(on remplit|remplis|remplir|commence|fais)\b.*\bcarnet d entretien\b|\bcarnet d entretien\b.*\b(remplir|vide)\b/.test(n)) return remplit;
    if (/\b(mon|le) carnet d entretien\b|\bqu est ce qu il y a a faire (dans la maison|a la maison|sur la voiture)\b|\bl entretien (de la maison|de la voiture)\b/.test(n)) return () => aFaireMaison(n);
    if (/\b(sous garantie|garantie|garanti)\b/.test(n)) return () => garantie(t, n);
    if (/\b(c est|ce sera|est prevu|est prevue)\b.*\b(le|en) (\d{1,2}|premier)\b/.test(n) && /\b(controle technique|vidange|chaudiere|ramonage|revision|veterinaire|pneus)\b/.test(n)) return () => dateEntretien(t, n);
    if (/\b(j ai|on a)\b.*\b(fait|change|nettoye|teste|passe)\b/.test(n) && /\b(vidange|controle technique|chaudiere|detecteurs?|vmc|hotte|filtre|lave vaisselle|pneus|litiere|griffes|veterinaire|revision|ramonage)\b/.test(n)) return () => entretienFait(t, n).then(r => r === null ? say("Je n'ai pas trouvé cette tâche dans ton carnet d'entretien.") : r);
    // le budget
    if (/\b(mets a jour|actualise|relis|importe)\b.*\bbudget\b/.test(n)) return majBudget;
    if (/\b(mes|les) abonnements\b/.test(n)) return abonnements;
    if (/\b(combien|qu est ce que) j ai depense\b|\bmes depenses\b/.test(n)) return () => depenses(n);
    if (/\bj ai depense\b.*\d/.test(n)) return () => depense(t, n);
    if (/\b(mon|le) budget\b|\bmes comptes\b|\bmon cash flow\b|\bil me reste combien\b/.test(n)) return budget;
    if (/\b(rappelle moi de |faut que je |je dois )?(resilier|arreter mon abonnement)\b/.test(n)) return () => resilier(t);
    // les week-ends
    if (/\b(idees? de sortie|on fait quoi ce week end|une sortie|sortir)\b.*\b(week end|samedi|dimanche|avec mon fils|avec le petit)\b|\bqu est ce qu on fait ce week end\b/.test(n)) return weekend;
    return null;
  }
  return { route, semaine, ajouteDepense, _carnet: carnet, _date: dateDe };
})();

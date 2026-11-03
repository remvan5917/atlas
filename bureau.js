/* ---------- le bureau : tout son travail, préparé seul — il vérifie et valide ----------
   L'ordinateur de la maison lit les nouveaux mails des deux boîtes toutes les 30 minutes, comprend ce qu'il faut faire
   (répondre, envoyer un document, relancer, payer, prendre rendez-vous, une tâche), rédige les réponses dans son style,
   prépare les relances des factures impayées. Ici : « mon bureau » montre tout, avec un bouton par action :
   valider (un BROUILLON dans Gmail, ou une tâche datée), modifier (il dit quoi changer), ignorer, déjà fait.
   Atlas n'envoie jamais rien : il relit le brouillon dans Gmail et l'envoie lui-même. */
const BUREAU = (() => {
  const root = () => VOIXMAISON.root();
  let dernier = { a_valider: [] };
  async function api(corps) {
    const r = await fetch(`${root()}/maison/bureau`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  const ENT = { lrf: 'La Rue', micro: 'Micro', perso: 'Perso' };
  const TYPE = { repondre: 'Répondre', envoyer_document: 'Envoyer un document', relancer: 'Relancer', payer: 'Payer', rendez_vous: 'Rendez-vous', tache: 'À faire' };
  const avecTexte = x => ['repondre', 'envoyer_document', 'relancer'].includes(x.type) && x.brouillon_texte;
  const b_ = (txt, act, id, fond = 'rgba(255,255,255,.08)') => `<button type="button" data-bur="${act}" data-id="${esc(id)}" style="padding:8px 12px;margin:4px 5px 0 0;border:0;border-radius:10px;background:${fond};color:#e2e8f0;font:600 13px system-ui;cursor:pointer">${txt}</button>`;
  function carte(x, i) {
    const urg = x.urgence === 'haute';
    const ech = x.echeance ? ` · <b style="color:#fca5a5">avant le ${esc(x.echeance.split('-').reverse().join('/'))}</b>` : '';
    const btns = avecTexte(x) ? (x.adresse ? b_(`✉ Envoyer à ${esc(x.adresse)}`, 'envoie', x.id, 'rgba(37,99,235,.8)') : '') + b_(`📝 Brouillon (boîte ${x.entite === 'lrf' ? 'pro' : 'perso'})`, 'valide', x.id, 'rgba(22,163,74,.5)') + b_('✏ Modifier', 'modifie', x.id) : b_('✓ À mes tâches', 'valide', x.id, 'rgba(22,163,74,.6)');
    return `<div style="margin:9px 0;padding:11px 13px;border-radius:13px;background:${urg ? 'rgba(248,113,113,.09)' : 'rgba(255,255,255,.05)'};border-left:3px solid ${urg ? '#f87171' : '#475569'}">
<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap"><small style="padding:2px 8px;border-radius:999px;background:rgba(165,180,252,.15);color:#c7d2fe">${esc(TYPE[x.type] || x.type)}</small><small style="color:#94a3b8">${esc(ENT[x.entite] || '')} · ${x.entite === 'lrf' ? '📁 boîte pro' : '📁 boîte perso'}</small><b style="flex:1;font-size:15px">${esc(x.de)}</b>${urg ? '<small style="color:#fca5a5">URGENT</small>' : ''}</div>
<div style="font-size:15px;margin-top:4px">${esc(x.resume)}${ech}</div>
${x.a_faire ? `<div style="font-size:13px;color:#fde68a;margin-top:2px">→ ${esc(x.a_faire)}</div>` : ''}
${x.note ? `<div style="font-size:13px;color:#fca5a5">⚠ ${esc(x.note)}</div>` : ''}
${x.livrable ? `<div>${b_(`📄 Lire « ${esc(x.livrable_titre || 'le document')} » (fait par Atlas)`, 'lire', x.id, 'rgba(234,179,8,.25)')}</div>` : ''}
${x.seul_toi ? `<div style="font-size:13px;color:#93c5fd;margin-top:2px">👤 À toi : ${esc(x.seul_toi)}</div>` : ''}
${x.document ? `<div style="font-size:13px;color:#94a3b8">Pièce demandée : ${esc(x.document)} — ajoute-la au brouillon dans Gmail.</div>` : ''}
${x.type === 'relancer' && !x.adresse ? `<div style="display:flex;gap:6px;margin-top:6px"><input type="email" id="adr-${esc(x.id)}" placeholder="l'adresse mail du client" style="flex:1;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#e2e8f0;font:14px system-ui">${b_('Rédiger la relance', 'adresse', x.id, 'rgba(37,99,235,.7)')}</div>` : ''}
${avecTexte(x) ? `<details ${i < 2 ? 'open' : ''} style="margin-top:6px"><summary style="cursor:pointer;color:#a5b4fc;font-size:13px">La réponse que j'ai rédigée${x.adresse ? ` (à ${esc(x.adresse)})` : ''}</summary><div style="white-space:pre-wrap;font-size:14px;color:#e2e8f0;background:rgba(0,0,0,.25);padding:9px 11px;border-radius:9px;margin-top:5px">${esc(x.brouillon_texte)}</div></details>` : ''}
<div>${btns}${b_('✓ Déjà fait', 'fait', x.id)}${b_('✗ Ignorer', 'ignore', x.id)}</div></div>`;
  }
  async function dossierCabinet() {
    try { const r = await (await fetch(`${root()}/maison/compta/dossier`, { cache: 'no-store' })).json(); return (r.dossiers || []).filter(d => !d.brouillon).slice(-1)[0] || null; } catch (e) { return null; }
  }
  async function ecran(r) {
    dernier = r;
    const dos = await dossierCabinet(), l = r.a_valider || [], urg = l.filter(x => x.urgence === 'haute').length;
    const f = S.bureauFiltre || 'tout', estPro = x => x.entite === 'lrf' || x.entite === 'micro';
    const nPro = l.filter(estPro).length, nPerso = l.length - nPro;
    const onglet = (k, t, coul) => `<button type="button" data-bur="filtre" data-id="${k}" style="padding:7px 14px;margin:8px 6px 0 0;border-radius:999px;border:1px solid ${f === k ? coul : 'rgba(255,255,255,.15)'};background:${f === k ? coul + '33' : 'transparent'};color:${f === k ? '#fff' : '#94a3b8'};font:600 13px system-ui;cursor:pointer">${t}</button>`;
    const titre = (t, coul, n) => `<div style="margin:16px 0 4px;padding-bottom:4px;border-bottom:2px solid ${coul};display:flex;justify-content:space-between;align-items:baseline"><b style="letter-spacing:.18em;font-size:13px;color:${coul}">${t}</b><small style="color:#94a3b8">${n} à valider</small></div>`;
    const sousTitre = t => `<div style="margin:10px 0 0;font-size:12px;letter-spacing:.12em;color:#93c5fd;text-transform:uppercase">${t}</div>`;
    const lrf = l.filter(x => x.entite === 'lrf'), micro = l.filter(x => x.entite === 'micro'), perso = l.filter(x => !estPro(x));
    const espacePro = (f === 'perso' || !nPro) ? '' : titre('PRO', '#60a5fa', nPro) + (lrf.length ? (micro.length ? sousTitre('La rue du financement') : '') + lrf.map(carte).join('') : '') + (micro.length ? sousTitre('Micro-entreprise') + micro.map(carte).join('') : '');
    const espacePerso = (f === 'pro' || !nPerso) ? '' : titre('PERSO', '#4ade80', nPerso) + perso.map(carte).join('');
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,800px)"><small style="letter-spacing:.3em;color:#fcd34d">MON BUREAU · ${l.length} À VALIDER${urg ? ` · ${urg} URGENT${urg > 1 ? 'S' : ''}` : ''}${r.en_cours ? ' · JE LIS TES MAILS…' : ''}</small>
<div style="font-size:13px;color:#94a3b8;margin-top:4px">J'ai lu tes mails et préparé ce qu'il faut. Tu vérifies, tu valides : je range en brouillon dans Gmail (tu envoies toi-même) ou dans tes tâches.${r.faits_semaine ? ` Cette semaine : ${r.faits_semaine} chose${r.faits_semaine > 1 ? 's' : ''} validée${r.faits_semaine > 1 ? 's' : ''}.` : ''}</div>
<div>${b_('📜 Tout ce que j’ai fait', 'activite', 'x', 'rgba(252,211,77,.15)')}</div>
<div>${onglet('tout', `Tout · ${l.length}`, '#fcd34d')}${onglet('pro', `Pro · ${nPro}`, '#60a5fa')}${onglet('perso', `Perso · ${nPerso}`, '#4ade80')}</div>
${dos && f !== 'perso' ? `<div style="margin:10px 0;padding:11px 13px;border-radius:13px;background:rgba(253,230,138,.08);border-left:3px solid #fcd34d"><b>Le cabinet comptable attend ta réponse</b><div style="font-size:14px;color:#cbd5e1">« ${esc(dos.sujet)} » : ${dos.achats.filter(a => a.fichiers.length).length}/${dos.achats.length} factures déjà retrouvées, le tableau complété.</div>${b_('Ouvrir le dossier', 'dossier', dos.id, 'rgba(253,230,138,.25)')}</div>` : ''}
${(espacePro + espacePerso) || `<div style="color:#64748b;margin-top:10px">${l.length ? 'Rien de ce côté-là.' : 'Rien à faire : ton bureau est à jour.'}</div>`}
${(r.journal || []).length ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#a5b4fc;letter-spacing:.2em;font-size:12px">CE QUE J'AI FAIT</summary>${r.journal.map(j => `<div style="font-size:13px;padding:3px 0;color:#cbd5e1"><span style="color:#64748b">${new Date(j.at * 1000).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span> · ${esc(j.t)}</div>`).join('')}</details>` : ''}</div>`);
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-bur]'); if (!b) return;
    const act = b.dataset.bur, id = b.dataset.id;
    if (act === 'filtre') { S.bureauFiltre = id; save(); return ecran(dernier); }
    if (act === 'actf') { S.actFiltre = id; save(); return ecranActivite(); }
    if (act === 'actg') { S.actGenre = id; save(); return ecranActivite(); }
    if (act === 'activite') return activite();
    if (act === 'actd') { const x = affichee[+id]; return x ? detailActivite(x) : null; }
    if (act === 'actretour') return ecranActivite();
    if (act === 'piece') { const w = window.open('', '_blank'); return ouvrePdf(`${root()}/maison/bureau/piece?nom=${encodeURIComponent(id)}`, id, w); }
    if (act === 'dossier') return typeof COMPTA !== 'undefined' && COMPTA.dossier ? COMPTA.dossier() : null;
    if (act === 'lire') { // le document de l'atelier : demandé PAR Atlas (l'ordinateur de la maison ne répond qu'à lui), puis ouvert
      const w = window.open('', '_blank'); const xl = (dernier.a_valider || []).find(y => y.id === id) || {};
      try {
        const r = await fetch(`${root()}/maison/bureau/livrable?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!r.ok || !/pdf|word/.test(r.headers.get('Content-Type') || '')) throw new Error('livrable');
        const u = URL.createObjectURL(await r.blob());
        if (w) w.location.href = u; else { const a = document.createElement('a'); a.href = u; a.download = `${xl.livrable_titre || 'document'}.pdf`; document.body.appendChild(a); a.click(); a.remove(); }
        setTimeout(() => URL.revokeObjectURL(u), 10 * 60000);
      } catch (e) { if (w) w.close(); say("Je n'arrive pas à ouvrir ce document : l'ordinateur de la maison ne répond pas."); }
      return;
    }
    let corps = { action: act, id };
    const x0 = (dernier.a_valider || []).find(y => y.id === id);
    if (act === 'envoie') { if (!x0 || !x0.adresse) return say("Je n'ai pas l'adresse du destinataire."); corps.a = x0.adresse; }
    if (act === 'adresse') { const el = document.getElementById(`adr-${id}`); corps.adresse = el ? el.value.trim() : ''; if (!corps.adresse) return say("Tape d'abord l'adresse mail du client."); patiente('Je rédige la relance…', corps.adresse); }
    if (act === 'modifie') {
      const a = await ask("Qu'est-ce que je change dans la réponse ?", { wait: 30000 });
      if (!a) return say("D'accord, je ne change rien.");
      corps.consigne = a; patiente('Je réécris la réponse…', a.slice(0, 80));
    } else if (act !== 'adresse') { b.disabled = true; b.textContent = '…'; }
    let r; try { r = await api(corps); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (r.ok === false) { await ecran(await api()); return say(`Je n'ai pas pu : ${r.raison || 'erreur'}.`); }
    fx.ok(); await ecran(r);
    if (act === 'envoie') return say(`C'est parti, à ${x0.adresse}, depuis ta boîte ${x0.entite === 'lrf' ? 'pro' : 'perso'}.`);
    if (act === 'valide') { return say(r.fait === 'brouillon' ? `C'est dans les brouillons de ta boîte ${x0 && x0.entite !== 'lrf' ? 'perso' : 'pro'} : relis et envoie quand c'est bon.` : "C'est dans tes tâches, avec la date."); }
    if (act === 'modifie') return say("Voilà la nouvelle version, à l'écran.");
    if (act === 'adresse') return say("La relance est rédigée, à l'écran : valide-la pour la ranger en brouillon.");
  });
  async function ficheClient(q) {
    let r; try { r = await api({ action: 'client', q }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(`${r.raison || 'Je ne trouve pas ce contact'}.`);
    const f = r.fiche || {}, l = f.echanges || [];
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,700px)"><small style="letter-spacing:.3em;color:#fcd34d">FICHE CLIENT · ${esc((f.entreprise || (f.noms || [f.cle])[0] || '').toUpperCase())}</small>
<div style="font-size:14px;color:#94a3b8;margin-top:4px">${esc((f.noms || []).join(', '))}${f.adresses && f.adresses.length ? ` · ${esc(f.adresses.join(', '))}` : ''}${f.entite === 'lrf' ? ' · La Rue du financement' : ''}</div>
${l.slice().reverse().map(e => `<div style="margin:7px 0;padding:8px 11px;border-radius:10px;background:rgba(255,255,255,.05);border-left:3px solid ${e.sens === 'recu' ? '#38bdf8' : '#4ade80'}"><small style="color:#94a3b8">${new Date(e.at * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${e.sens === 'recu' ? 'reçu' : 'envoyé'}</small><div style="font-size:14px">${esc(e.resume || e.sujet)}</div></div>`).join('')}</div>`);
    return say(r.texte);
  }
  async function bureau() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    await ecran(r);
    const f = S.bureauFiltre || 'tout', tous = r.a_valider || [], pro_ = x => x.entite === 'lrf' || x.entite === 'micro';
    const l = f === 'pro' ? tous.filter(pro_) : f === 'perso' ? tous.filter(x => !pro_(x)) : tous, urg = l.filter(x => x.urgence === 'haute'), rep = l.filter(avecTexte).length;
    const part = f === 'tout' && tous.length ? ` (${tous.filter(pro_).length} en pro, ${tous.filter(x => !pro_(x)).length} en perso)` : f === 'pro' ? ' en pro' : f === 'perso' ? ' en perso' : '';
    if (!l.length) return say(r.en_cours ? "Je suis en train de lire tes mails ; reviens dans quelques minutes." : "Ton bureau est à jour : rien à faire pour le moment.");
    return say(`Ton bureau : ${l.length} chose${l.length > 1 ? 's' : ''} à valider${part}${urg.length ? `, dont ${urg.length} urgente${urg.length > 1 ? 's' : ''} : ${urg.slice(0, 2).map(x => x.resume).join(' ; ')}` : ''}. ${rep ? `J'ai déjà rédigé ${rep} réponse${rep > 1 ? 's' : ''}. ` : ''}Tout est à l'écran : valide, modifie ou ignore.`);
  }
  // le matin, sur l'ordinateur : une phrase, une fois par jour
  setInterval(async () => {
    const h = new Date().getHours(); if (h < 9 || h >= 12 || !dlg.started || voice.occupe()) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return; // l'appareil où il est (l'ordi, la tablette ou l'iPhone)
    const j = new Date().toDateString(); if (S.bureauDit === j) return;
    let r; try { r = await api(); } catch (e) { return; }
    const l = r.a_valider || []; if (!l.length || r.en_cours) return;
    S.bureauDit = j; save();
    const urg = l.filter(x => x.urgence === 'haute').length;
    PROACTIF.annonce(`bureau-${j}`, `Ton bureau : ${l.length} chose${l.length > 1 ? 's' : ''} préparée${l.length > 1 ? 's' : ''}${urg ? `, dont ${urg} urgente${urg > 1 ? 's' : ''}` : ''}. Dis « on valide le bureau ».`, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);
  /* ---------- « on valide le bureau » : il lit chaque chose préparée, il répond oui / non / déjà fait / plus tard / « change : … » ---------- */
  const coeur = t => String(t || '').split('\n').filter(l => l.trim() && !/^(bonjour|bonsoir|cher|chère|hello)\b/i.test(l.trim())).join(' ')
    .replace(/\b(bien cordialement|cordialement|bien à vous|belle journée|à bientôt)\b[\s\S]*$/i, '').replace(/\s+/g, ' ').trim().replace(/[.!\s]+$/, '');
  const PASSE = /^(plus tard|passe|suivant|la suivante|on verra|apres|pas maintenant)\b/, STOP = /^(stop|arrete|on arrete|c est tout|fin|termine|ca suffit)\b/, FAIT = /\b(deja fait|c est fait|je l ai fait|deja repondu|deja envoye)\b/;
  async function valideVoix() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const items = (r.a_valider || []).map(x => ({ k: 'bureau', x }));
    try { const c = await COMPTA._api(); (c.a_valider_micro || []).filter(x => x.montant).forEach(x => items.push({ k: 'micro', x })); } catch (e) { /* sans la compta */ }
    try { const d = (((await COMPTA._dossierApi()).dossiers) || []).filter(y => !y.brouillon).slice(-1)[0]; if (d) items.unshift({ k: 'dossier', x: d }); } catch (e) { /* sans le dossier */ }
    if (!items.length) return say("Ton bureau est à jour : rien à valider.");
    const bilan = { envoye: 0, brouillon: 0, tache: 0, micro: 0, ignore: 0, plus_tard: 0, fait: 0 };
    await say(`${items.length} chose${items.length > 1 ? 's' : ''} à valider. Réponds oui, non, déjà fait, plus tard, ou dis ce qu'il faut changer. Dis « stop » pour arrêter.`);
    for (let i = 0; i < items.length; i++) {
      const { k, x } = items[i], tete = `${i + 1} sur ${items.length}. `;
      let q;
      if (k === 'dossier') { if (COMPTA.dossier) { /* l'écran du dossier */ } q = `${tete}Le cabinet comptable attend ta réponse : ${x.achats.filter(a => a.fichiers.length).length} factures sur ${x.achats.length} retrouvées et le tableau complété. Je l'envoie à ${adrDe(x.de)} avec toutes les pièces ?`; }
      else if (k === 'micro') q = `${tete}Ta micro-entreprise : ${eu2(x.montant)} de ${x.tiers}, le ${new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}. Je le mets au livre des recettes ?`;
      else {
        await ecran(Object.assign({}, r, { a_valider: [x] }));
        q = `${tete}${x.de} : ${x.resume}.${x.note ? ` Attention : ${x.note}.` : ''} ${avecTexte(x) ? `Je propose de répondre : ${coeur(x.brouillon_texte)}. ${x.adresse ? `Je l'envoie à ${x.adresse} ?` : 'Je la range en brouillon ?'}` : x.type === 'relancer' && !x.adresse ? "Je n'ai pas l'adresse du client : je le garde pour plus tard." : `${x.a_faire || 'Je le mets dans tes tâches'}. Dans tes tâches ?`}`;
        if (x.type === 'relancer' && !x.adresse) { await say(q); bilan.plus_tard++; continue; }
      }
      for (let essai = 0; essai < 3; essai++) {
        const a = await valideVisuel(q, { wait: 20000 }), n = N(a || '');
        if (STOP.test(n)) { i = items.length; break; }
        if (!a) { if (essai) { bilan.plus_tard++; break; } q = 'Oui, non, ou plus tard ?'; continue; }
        if (PASSE.test(n)) { bilan.plus_tard++; break; }
        if (k === 'bureau' && FAIT.test(n)) { await api({ action: 'fait', id: x.id }); bilan.fait++; break; }
        if (a === 'non' || isNo(a) && n.split(' ').length <= 4) { if (k === 'bureau') await api({ action: 'ignore', id: x.id }); else if (k === 'micro') await COMPTA._api({ action: 'ignore', id: x.id }); bilan.ignore++; break; }
        if (a === 'ok') {
          if (k === 'dossier') { const rr = await COMPTA._dossierApi({ action: 'envoie', id: x.id, corps: COMPTA._corpsReponse(x), a: adrDe(x.de) }); if (rr && rr.ok) bilan.envoye++; else await say(`La réponse au cabinet n'est pas partie${rr && rr.raison ? ` : ${rr.raison}` : ''}.`); }
          else if (k === 'micro') { await COMPTA._api({ action: 'valide', id: x.id }); bilan.micro++; }
          else if (avecTexte(x) && x.adresse) { const rr = await api({ action: 'envoie', id: x.id, a: x.adresse }); if (rr.ok === false) await say(`Je n'ai pas pu l'envoyer : ${rr.raison}.`); else bilan.envoye++; }
          else { const rr = await api({ action: 'valide', id: x.id }); if (rr.ok === false) await say(`Je n'ai pas pu : ${rr.raison}.`); else bilan[rr.fait === 'tache' ? 'tache' : 'brouillon']++; }
          fx.ok(); break;
        }
        // une correction : il réécrit, et relit
        if (k === 'bureau' && avecTexte(x)) {
          patiente('Je réécris la réponse…', a.slice(0, 80));
          const rr = await api({ action: 'modifie', id: x.id, consigne: a });
          const nx = (rr.a_valider || []).find(y => y.id === x.id);
          if (nx && nx.brouillon_texte) { items[i].x = nx; await ecran(Object.assign({}, rr, { a_valider: [nx] })); q = `Nouvelle version : ${coeur(nx.brouillon_texte)}. C'est bon ?`; continue; }
          await say("Je n'ai pas réussi à la réécrire : je la garde pour plus tard."); bilan.plus_tard++; break;
        }
        q = 'Oui, non, ou plus tard ?';
      }
    }
    hideBoard();
    const p = [];
    if (bilan.envoye) p.push(`${bilan.envoye} mail${bilan.envoye > 1 ? 's' : ''} envoyé${bilan.envoye > 1 ? 's' : ''}`);
    if (bilan.brouillon) p.push(`${bilan.brouillon} brouillon${bilan.brouillon > 1 ? 's' : ''} rangé${bilan.brouillon > 1 ? 's' : ''}, à envoyer depuis Gmail`);
    if (bilan.tache) p.push(`${bilan.tache} dans tes tâches`);
    if (bilan.micro) p.push(`${bilan.micro} recette${bilan.micro > 1 ? 's' : ''} au livre`);
    if (bilan.fait) p.push(`${bilan.fait} déjà fait${bilan.fait > 1 ? 's' : ''}`);
    if (bilan.ignore) p.push(`${bilan.ignore} ignoré${bilan.ignore > 1 ? 's' : ''}`);
    if (bilan.plus_tard) p.push(`${bilan.plus_tard} pour plus tard`);
    return say(`C'est fait : ${p.join(', ') || 'rien de changé'}.`);
  }
  const adrDe = de => ((String(de).match(/<([^>]+)>/) || [])[1] || String(de)).trim();
  const eu2 = v => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} euros`;
  // ---------- tout ce que fait Atlas, au même endroit : les mails, l'atelier, la compta et Tiime, l'agenda, ce que tu as fait, la plateforme ----------
  const GENRES_ACT = { mails: ['✉', 'Mails'], atelier: ['📄', 'Atelier'], compta: ['🧾', 'Compta et Tiime'], agenda: ['📅', 'Agenda'], toi: ['✓', 'Fait par toi'], plateforme: ['💻', 'Plateforme'], bureau: ['•', 'Bureau'] };
  let derniereAct = [], affichee = [];
  async function ouvrePdf(url, nom, w) { // un PDF de l'ordinateur de la maison : demandé par Atlas (il ne répond qu'à lui), puis ouvert
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok || !/pdf|word/.test(r.headers.get('Content-Type') || '')) throw new Error('pdf');
      const u = URL.createObjectURL(await r.blob());
      if (w) w.location.href = u; else { const a = document.createElement('a'); a.href = u; a.download = nom || 'document.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(u), 10 * 60000);
    } catch (e) { if (w) w.close(); say("Je n'arrive pas à ouvrir ce document."); }
  }
  async function detailActivite(x) {
    if (x.dossier && typeof COMPTA !== 'undefined' && COMPTA.dossier) return COMPTA.dossier();
    let r; try { r = await api(Object.assign({ action: 'detail' }, x.carte ? { carte: x.carte } : x.rapport ? { rapport: x.rapport } : { fichiers: x.fichiers })); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(`${(r.raison || 'je ne peux pas le montrer').replace(/^./, c => c.toUpperCase())}.`);
    const retour = b_('← Retour', 'actretour', 'x');
    const bloc = (titre, contenu) => contenu ? `<div style="margin-top:10px"><small style="letter-spacing:.14em;color:#94a3b8;text-transform:uppercase">${titre}</small><div style="white-space:pre-wrap;font-size:14px;color:#e2e8f0;background:rgba(0,0,0,.25);padding:9px 11px;border-radius:9px;margin-top:4px">${esc(contenu)}</div></div>` : '';
    let corps = '';
    if (r.carte) {
      const c = r.carte, ST = { a_valider: 'à valider', brouillon: 'en brouillon dans Gmail', envoye: 'envoyé', fait: 'fait', tache: 'dans tes tâches', ignore: 'ignoré' };
      corps = `<div style="font-size:17px;margin-top:6px"><b>${esc(c.de || '')}</b> <small style="color:#94a3b8">${esc(c.adresse || '')}</small></div>
<div style="font-size:13px;color:#94a3b8">${esc(c.sujet || '')} · ${c.entite === 'lrf' || c.entite === 'micro' ? 'pro' : 'perso'} · ${esc(ST[c.statut] || c.statut || '')}${c.fait_par ? ` (${esc(c.fait_par)})` : ''}${c.echeance ? ` · avant le ${esc(c.echeance.split('-').reverse().join('/'))}` : ''}</div>`
        + bloc('Ce que dit le mail', c.resume) + bloc('Ce qu’il faut faire', c.a_faire) + bloc('Pourquoi / la consigne', c.consigne) + bloc('La réponse que j’ai préparée', c.brouillon_texte)
        + (c.seul_toi ? bloc('À toi', c.seul_toi) : '') + (c.pj && c.pj.length ? bloc('Pièces jointes du mail', c.pj.join('\n')) : '')
        + (c.livrable ? `<div style="margin-top:10px">${b_(`📄 Lire « ${esc(c.livrable_titre || 'le document')} »`, 'lire', c.id, 'rgba(234,179,8,.25)')}</div>` : '');
    } else if (r.texte) corps = bloc('Le rapport de la nuit', r.texte);
    else if (r.fichiers) corps = `<div style="margin-top:8px">${r.fichiers.map(f => f.ok ? b_(`🧾 ${esc(f.nom)}`, 'piece', f.nom) : `<div style="color:#64748b;font-size:13px">${esc(f.nom)} (plus sur l'ordinateur)</div>`).join('')}</div>`;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,780px)">${retour}<div style="margin-top:6px"><small style="letter-spacing:.2em;color:#fcd34d">${esc(new Date(x.at * 1000).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</small></div><div style="font-size:15px;margin-top:4px">${esc(x.t)}</div>${corps}</div>`);
  }
  function ecranActivite() {
    const f = S.actFiltre || 'tout', g = S.actGenre || 'tous';
    const l = derniereAct.filter(x => (f === 'tout' || (f === 'pro') === !!x.pro) && (g === 'tous' || x.genre === g)); affichee = l;
    const puce = (k, t, actif, quoi) => `<button type="button" data-bur="${quoi}" data-id="${k}" style="padding:6px 12px;margin:6px 6px 0 0;border-radius:999px;border:1px solid ${actif ? '#fcd34d' : 'rgba(255,255,255,.15)'};background:${actif ? 'rgba(252,211,77,.18)' : 'transparent'};color:${actif ? '#fff' : '#94a3b8'};font:600 12px system-ui;cursor:pointer">${t}</button>`;
    const jour = at => { const d = new Date(at * 1000), a = new Date(); const diff = Math.round((new Date(a.toDateString()) - new Date(d.toDateString())) / 86400000); return diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
    let html = '', dernierJour = '';
    for (const x of l) {
      const j = jour(x.at);
      if (j !== dernierJour) { html += `<div style="margin:14px 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#fcd34d">${esc(j)}</div>`; dernierJour = j; }
      const [ic] = GENRES_ACT[x.genre] || ['•'];
      const ouvrable = x.carte || x.rapport || x.fichiers || x.dossier;
      html += `<div ${ouvrable ? `data-bur="actd" data-id="${l.indexOf(x)}"` : ''} style="display:flex;gap:10px;padding:6px 8px;border-left:3px solid ${x.pro ? '#60a5fa' : '#4ade80'};margin:3px 0;background:rgba(255,255,255,.03);border-radius:0 8px 8px 0;${ouvrable ? 'cursor:pointer' : ''}"><span style="flex:0 0 44px;color:#64748b;font-size:12px;padding-top:2px">${new Date(x.at * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span><span style="flex:0 0 18px">${ic}</span><span style="font-size:14px;color:#e2e8f0;flex:1">${esc(x.t)}</span>${ouvrable ? '<span style="color:#fcd34d;font-size:12px;padding-top:2px">voir ›</span>' : ''}</div>`;
    }
    const nPro = derniereAct.filter(x => x.pro).length;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,820px)"><small style="letter-spacing:.3em;color:#fcd34d">TOUT CE QUE FAIT ATLAS · 14 DERNIERS JOURS · ${derniereAct.length}</small>
<div style="font-size:13px;color:#94a3b8;margin-top:4px">Tout ce que j'ai fait pour toi : les mails lus et préparés, les documents de l'atelier, la compta et Tiime, l'agenda, ce que tu as fait toi-même, et la plateforme la nuit. Bleu : pro · vert : perso.</div>
<div>${puce('tout', `Tout · ${derniereAct.length}`, f === 'tout', 'actf')}${puce('pro', `Pro · ${nPro}`, f === 'pro', 'actf')}${puce('perso', `Perso · ${derniereAct.length - nPro}`, f === 'perso', 'actf')}</div>
<div>${puce('tous', 'Tous', g === 'tous', 'actg')}${Object.entries(GENRES_ACT).filter(([k]) => derniereAct.some(x => x.genre === k)).map(([k, [ic, t]]) => puce(k, `${ic} ${t}`, g === k, 'actg')).join('')}</div>
${html || '<div style="color:#64748b;margin-top:12px">Rien de ce côté-là ces 14 derniers jours.</div>'}</div>`);
  }
  async function activite() {
    let r; try { r = await api({ action: 'activite' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    derniereAct = r.activite || []; ecranActivite();
    const auj = derniereAct.filter(x => new Date(x.at * 1000).toDateString() === new Date().toDateString());
    const compte = k => auj.filter(x => x.genre === k).length;
    return say(derniereAct.length ? `Ces quatorze derniers jours, ${derniereAct.length} choses. Aujourd'hui : ${[['mails', 'mails traités'], ['atelier', 'documents faits'], ['compta', 'actions de compta'], ['agenda', 'dates ajoutées à ton agenda'], ['toi', 'choses que tu as faites toi-même']].filter(([k]) => compte(k)).map(([k, t]) => `${compte(k)} ${t}`).join(', ') || 'rien de nouveau'}. Tout est à l'écran.` : "Je n'ai encore rien noté ces quatorze derniers jours.");
  }
  async function journal() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const j = (r.journal || []).filter(x => Date.now() / 1000 - x.at < 86400);
    await ecran(r);
    return say(j.length ? `Depuis hier : ${j.slice(0, 4).map(x => x.t).join(' ; ')}${j.length > 4 ? ', et le reste à l’écran' : ''}.` : "Je n'ai rien fait de nouveau depuis hier : ton bureau est à jour.");
  }
  // ce qu'il a fait lui-même : « c'est fait pour Frédéric Baille », « j'ai déjà envoyé la facture à C3J » → la carte sort de sa liste
  let derniersFaits = null;
  async function faitTexte(q) {
    let r; try { r = await api({ action: 'fait_texte', q }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(`${r.raison.charAt(0).toUpperCase()}${r.raison.slice(1)}. Dis par exemple « c'est fait pour Frédéric Baille ».`);
    derniersFaits = { ids: r.faits.map(x => x.id), at: Date.now() }; fx.ok();
    return say(`C'est noté, je l'enlève de ta liste : ${r.faits.map(x => `${x.de}, ${x.resume.charAt(0).toLowerCase()}${x.resume.slice(1)}`).join(' ; ')}. Si je me suis trompé de carte, dis « annule ».`);
  }
  async function annuleFait() {
    const ids = derniersFaits.ids; derniersFaits = null;
    for (const id of ids) { try { await api({ action: 'defait', id }); } catch (e) { /* tant pis */ } }
    return say("D'accord, je la remets dans ton bureau.");
  }
  function route(t, n) {
    const fb = n.match(/\bbureau (pro|perso|professionnel|personnel)\b|\b(?:le |mon )?(pro|perso) (?:du|de mon) bureau\b/);
    if (fb) return () => { S.bureauFiltre = /^pro/.test(fb[1] || fb[2]) ? 'pro' : 'perso'; save(); return bureau(); };
    if (derniersFaits && Date.now() - derniersFaits.at < 120000 && /^(atlas )?(annule|non (c est|pas) (pas )?(celle|celui) la|tu t es trompe|pas celle la|pas celui la)\b/.test(n)) return annuleFait;
    if (typeof COMPTA !== 'undefined' && COMPTA.clientDuDossier && COMPTA.clientDuDossier(n)) { const c = COMPTA.route(t, n); if (c) return c; } // un client du dossier du cabinet : la compta s'en charge
    const mf = n.match(/^(?:atlas )?(?:c est (?:deja )?(?:fait|regle|envoye)|je l ai deja (?:fait|envoye|regle)|j ai deja (?:fait|envoye|repondu|regle|paye|relance|appele|traite)|j ai (?:envoye|repondu|regle|paye|relance|traite))\b\s*(.*)$/);
    if (mf && /[a-z]{3,}/.test(mf[1].replace(/\b(le|la|les|un|une|a|au|aux|pour|de|du|des|ca|tout)\b/g, ''))) return () => faitTexte(mf[1]);
    // la mémoire des clients : « où en est le dossier Nexa ? », « fiche client Euridis », « qu'est-ce que j'ai avec Atelier Brume ? »
    const mc = n.match(/\b(?:ou en est (?:le dossier|le client|mon client|l affaire|avec)|fiche (?:du )?client|parle moi du client|qu est ce que j ai (?:en cours )?avec|historique (?:avec|du client))\s+(.{2,60})$/);
    if (mc) return () => ficheClient(mc[1]);
    if (/\b(on valide|valide|valider|on fait) (le|mon) bureau\b|\bon valide tout\b|\bon traite (le bureau|mes mails)\b/.test(n)) return valideVoix;
    if (/\b(tout ce que tu (as )?fai[st]|tout ce que fait atlas|ton activite|ton journal|journal d atlas|journal du bureau|qu est ce que tu (as fait|fais) (pour moi|aujourd hui|cette semaine|ces derniers jours)|tu as fait quoi (pour moi|aujourd hui|cette semaine)|qu as tu fait (pour moi|aujourd hui)|ce que tu fais pour moi|espace activite)\b/.test(n)) return activite;
    if (/\b(qu est ce que tu as fait|tu as fait quoi|qu as tu fait)\b.*\b(bureau|travail|mails)\b/.test(n)) return journal;
    if (/\b(mon bureau|le bureau|mod(?:e|es)? bureau|mot bureau|(?:ouvre|affiche|montre)(?: moi)? (?:ton|ce) bureau|bureau d atlas|(?:mon|ton|l) atelier(?: d atlas)?|ce que l atelier a fait|qu est ce que j ai a faire (au travail|au boulot|pour le travail|pour la rue du financement)|point (travail|boulot)|fais le point (du|sur le) (travail|boulot)|mes mails a traiter|qu est ce qu il faut que je fasse)\b/.test(n)) return () => { S.bureauFiltre = 'tout'; save(); return bureau(); };
    if (/\b(relis|regarde|verifie)\b.*\b(mes )?mails\b.*\b(maintenant|tout de suite)\b/.test(n)) return async () => { try { await api({ action: 'tour' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } return say("Je relis tes mails. Dis « mon bureau » dans quelques minutes."); };
    return null;
  }
  return { route, bureau, valideVoix };
})();

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
  // les boutons et la carte : la mise en page commune (style.css, « bx- »)
  const bb = (txt, act, id, cls = '') => `<button type="button" class="bx-btn ${cls}" data-bur="${act}" data-id="${esc(id)}">${txt}</button>`;
  const estPro_ = x => x.entite === 'lrf' || x.entite === 'micro';
  const couleur = x => estPro_(x) ? '#60a5fa' : '#4ade80';
  const initiales = t => String(t || '?').replace(/[<"].*$/, '').trim().split(/\s+/).filter(w => /^[A-Za-zÀ-ÿ0-9]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const dateFr = iso => iso ? iso.split('-').reverse().slice(0, 2).join('/') : '';
  function carte(x, i) {
    const urg = x.urgence === 'haute', c = couleur(x);
    const principal = avecTexte(x) ? (x.adresse ? bb(`✉ Envoyer à ${esc(x.adresse.split('@')[0])}…`, 'envoie', x.id, 'prim') : '') + bb(`📝 En brouillon (boîte ${x.entite === 'lrf' ? 'pro' : 'perso'})`, 'valide', x.id, 'vert') + bb('✏ Modifier', 'modifie', x.id)
      : bb('✓ Dans mes tâches', 'valide', x.id, 'vert');
    return `<div class="bx-carte${urg ? ' urgent' : ''}" style="--c:${c}">
<div class="bx-ligne1"><div class="bx-avatar" style="--c:${c}">${esc(initiales(x.de))}</div><div class="bx-qui">${esc(x.de)}<small>${esc(x.sujet || '')}</small></div>
<div class="bx-tags"><span class="bx-tag">${esc(TYPE[x.type] || x.type)}</span>${urg ? '<span class="bx-tag urgent">urgent</span>' : ''}${x.echeance ? `<span class="bx-tag date">avant le ${esc(dateFr(x.echeance))}</span>` : ''}${x.livrable ? '<span class="bx-tag atlas">fait par Atlas</span>' : ''}</div></div>
<div class="bx-resume">${esc(x.resume)}</div>
${x.a_faire ? `<div class="bx-afaire">${esc(x.a_faire)}</div>` : ''}
${x.note ? `<div class="bx-info alerte">⚠ ${esc(x.note)}</div>` : ''}
${x.seul_toi ? `<div class="bx-info toi">👤 À toi : ${esc(x.seul_toi)}</div>` : ''}
${x.document ? `<div class="bx-info">Pièce demandée : ${esc(x.document)} — ajoute-la au brouillon dans Gmail.</div>` : ''}
${x.type === 'relancer' && !x.adresse ? `<div style="display:flex;gap:6px;margin-top:8px"><input type="email" id="adr-${esc(x.id)}" placeholder="l'adresse mail du client" style="flex:1;padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#e2e8f0;font:14px system-ui">${bb('Rédiger la relance', 'adresse', x.id, 'prim')}</div>` : ''}
${avecTexte(x) ? `<details ${i < 2 ? 'open' : ''}><summary>La réponse que j'ai rédigée${x.adresse ? ` · à ${esc(x.adresse)}` : ''}</summary><div class="bx-texte">${esc(x.brouillon_texte)}</div></details>` : ''}
<div class="bx-actions">${x.livrable ? bb(`📄 Lire « ${esc(x.livrable_titre || 'le document')} »`, 'lire', x.id, 'ambre') : ''}${principal}<span class="bx-espace"></span>${bb('✓ Déjà fait', 'fait', x.id, 'fantome')}${bb('✗ Ignorer', 'ignore', x.id, 'fantome')}</div></div>`;
  }
  async function dossierCabinet() {
    try { const r = await (await fetch(`${root()}/maison/compta/dossier`, { cache: 'no-store' })).json(); return (r.dossiers || []).filter(d => !d.brouillon).slice(-1)[0] || null; } catch (e) { return null; }
  }
  async function ecran(r) {
    dernier = r;
    const dos = await dossierCabinet(), l = r.a_valider || [], urg = l.filter(x => x.urgence === 'haute').length;
    const f = S.bureauFiltre || 'tout', estPro = estPro_;
    const nPro = l.filter(estPro).length, nPerso = l.length - nPro;
    const ordre = a => a.slice().sort((x, y) => (y.urgence === 'haute') - (x.urgence === 'haute') || String(x.echeance || '9').localeCompare(String(y.echeance || '9')));
    const section = (t, c, n) => `<div class="bx-section" style="--c:${c}"><i></i><b>${t}</b><small>${n} à valider</small></div>`;
    const lrf = ordre(l.filter(x => x.entite === 'lrf')), micro = ordre(l.filter(x => x.entite === 'micro')), perso = ordre(l.filter(x => !estPro(x)));
    let k = 0; const cartes = a => a.map(x => carte(x, k++)).join('');
    const espacePro = (f === 'perso' || !nPro) ? '' : section('Pro', '#60a5fa', nPro) + (lrf.length ? (micro.length ? '<div class="bx-sous-section">La rue du financement</div>' : '') + cartes(lrf) : '') + (micro.length ? '<div class="bx-sous-section">Micro-entreprise</div>' + cartes(micro) : '');
    const espacePerso = (f === 'pro' || !nPerso) ? '' : section('Perso', '#4ade80', nPerso) + cartes(perso);
    const seg = (k_, t, cls) => `<button type="button" class="${f === k_ ? 'on ' : ''}${cls}" data-bur="filtre" data-id="${k_}">${t}</button>`;
    const auj = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    showBoard(`<div class="bx-in">
<div class="bx-tete"><div><div class="bx-sur">Atlas · ${esc(auj)}${r.en_cours ? ' · je lis tes mails…' : ''}</div><div class="bx-titre">Mon bureau</div><div class="bx-sous">J'ai lu tes mails et préparé le travail. Tu vérifies, tu valides : rien ne part sans toi.</div></div>${bb('📜 Tout ce que j’ai fait', 'activite', 'x', 'ambre')}</div>
<div class="bx-stats"><div class="bx-stat"><b>${l.length}</b><span>à valider</span></div><div class="bx-stat urgent"><b>${urg}</b><span>urgent${urg > 1 ? 's' : ''}</span></div><div class="bx-stat"><b style="color:#60a5fa">${nPro}</b><span>pro</span></div><div class="bx-stat"><b style="color:#4ade80">${nPerso}</b><span>perso</span></div><div class="bx-stat ok"><b>${r.faits_semaine || 0}</b><span>validé${(r.faits_semaine || 0) > 1 ? 's' : ''} cette semaine</span></div></div>
<div class="bx-barre"><div class="bx-seg">${seg('tout', `Tout · ${l.length}`, '')}${seg('pro', `Pro · ${nPro}`, 'pro')}${seg('perso', `Perso · ${nPerso}`, 'perso')}</div></div>
${dos && f !== 'perso' ? `<div class="bx-bandeau"><div><b>Le cabinet comptable attend ta réponse</b><span>« ${esc(dos.sujet)} » · ${dos.achats.filter(a => a.fichiers.length).length}/${dos.achats.length} factures retrouvées · réponses sur les ventes ${(dos.ventes || []).filter(v => v.reponse).length}/${(dos.ventes || []).length}</span></div>${bb('Ouvrir le dossier', 'dossier', dos.id, 'ambre')}</div>` : ''}
${(espacePro + espacePerso) || `<div class="bx-vide">${l.length ? 'Rien de ce côté-là.' : '✓ Ton bureau est à jour : rien à valider.'}</div>`}
</div>`, 'bx');
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-bur]'); if (!b) return;
    const act = b.dataset.bur, id = b.dataset.id;
    if (act === 'filtre') { S.bureauFiltre = id; save(); return ecran(dernier); }
    if (act === 'actf') { S.actFiltre = id; save(); return ecranActivite(); }
    if (act === 'actg') { S.actGenre = id; save(); return ecranActivite(); }
    if (act === 'activite') return activite();
    if (act === 'bureau') return bureau();
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
    const bloc = (titre, contenu) => contenu ? `<div class="bx-bloc"><h4>${titre}</h4><div class="bx-texte">${esc(contenu)}</div></div>` : '';
    const [ic, nomG] = GENRES_ACT[x.genre] || ['•', ''];
    let corps = '', titre = esc(lisible(x.t, '').texte);
    if (r.carte) {
      const c = r.carte, ST = { a_valider: 'à valider', brouillon: 'en brouillon dans Gmail', envoye: 'envoyé', fait: 'fait', tache: 'dans tes tâches', ignore: 'ignoré' };
      const col = c.entite === 'lrf' || c.entite === 'micro' ? '#60a5fa' : '#4ade80';
      titre = esc(c.resume || x.t);
      corps = `<div class="bx-carte" style="--c:${col};margin-top:14px"><div class="bx-ligne1"><div class="bx-avatar" style="--c:${col}">${esc(initiales(c.de))}</div><div class="bx-qui">${esc(c.de || '')}<small>${esc(c.adresse || '')}</small></div>
<div class="bx-tags"><span class="bx-tag">${esc(TYPE[c.type] || c.type || '')}</span><span class="bx-tag" style="background:${col}22;color:${col}">${c.entite === 'lrf' || c.entite === 'micro' ? 'pro' : 'perso'}</span><span class="bx-tag date">${esc(ST[c.statut] || c.statut || '')}${c.fait_par ? ` · ${esc(c.fait_par)}` : ''}</span></div></div>
${[c.sujet, c.echeance ? `avant le ${dateFr(c.echeance)}` : ''].filter(Boolean).length ? `<div class="bx-meta" style="margin-top:8px">${esc([c.sujet, c.echeance ? `avant le ${dateFr(c.echeance)}` : ''].filter(Boolean).join(' · '))}</div>` : ''}</div>`
        // (le résumé du mail est déjà le titre) + bloc('Ce qu’il faut faire', c.a_faire) + bloc('La consigne pour la réponse', c.consigne) + bloc('La réponse que j’ai préparée', c.brouillon_texte)
        + (c.seul_toi ? bloc('À toi', c.seul_toi) : '') + (c.pj && c.pj.length ? bloc('Pièces jointes du mail', c.pj.join('\n')) : '')
        + (c.livrable ? `<div class="bx-actions">${bb(`📄 Lire « ${esc(c.livrable_titre || 'le document')} »`, 'lire', c.id, 'ambre')}</div>` : '');
    } else if (r.texte) corps = bloc('Le rapport de la nuit', r.texte);
    else if (r.fichiers) corps = `<div class="bx-bloc"><h4>Les factures déposées</h4>${r.fichiers.map(f => f.ok ? `<div class="bx-evt ouvre" data-bur="piece" data-id="${esc(f.nom)}"><div class="bx-ic">🧾</div><div class="bx-evt-corps"><div>${esc(f.nom)}</div></div><div class="bx-chevron">›</div></div>` : `<div class="bx-evt"><div class="bx-ic">🧾</div><div class="bx-evt-corps"><div style="color:#78716c">${esc(f.nom)} (plus sur l'ordinateur)</div></div></div>`).join('')}</div>`;
    showBoard(`<div class="bx-in"><div class="bx-barre" style="margin-top:-18px">${bb('← Retour', 'actretour', 'x', 'fantome')}<span class="bx-sur" style="margin-left:auto">${ic} ${esc(nomG)}</span></div>
<div class="bx-sur" style="margin-top:14px">${esc(new Date(x.at * 1000).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</div><div class="bx-titre" style="font-size:20px">${titre}</div>${corps}</div>`, 'bx');
  }
  // « Déjà fait par toi : la réponse pour X (vu dans…) » → l'action en petit (« Déjà fait par toi »), le contenu en grand, sans les adresses ni les dates à l'anglaise
  function lisible(t, defaut) {
    const m = String(t).match(/^([^:]{3,48}) : (.+)$/s);
    let texte = (m ? m[2] : String(t)).replace(/\s*<[^<>@\s]+@[^<>\s]+>/g, '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1').replace(/^—\s*/, '').trim();
    texte = texte.charAt(0).toUpperCase() + texte.slice(1);
    return { label: m ? m[1] : defaut, texte };
  }
  function ecranActivite() {
    const f = S.actFiltre || 'tout', g = S.actGenre || 'tous';
    const l = derniereAct.filter(x => (f === 'tout' || (f === 'pro') === !!x.pro) && (g === 'tous' || x.genre === g)); affichee = l;
    const COUL = { mails: '#a5b4fc', atelier: '#fcd34d', compta: '#fdba74', agenda: '#67e8f9', toi: '#86efac', plateforme: '#c4b5fd', bureau: '#94a3b8' };
    const jour = at => { const d = new Date(at * 1000), a = new Date(); const diff = Math.round((new Date(a.toDateString()) - new Date(d.toDateString())) / 86400000); return diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
    let html = '', dernierJour = '';
    l.forEach((x, k) => {
      const j = jour(x.at);
      if (j !== dernierJour) { html += `<div class="bx-jour">${esc(j)}</div>`; dernierJour = j; }
      const [ic, nomG] = GENRES_ACT[x.genre] || ['•', ''];
      const ouvrable = x.carte || x.rapport || x.fichiers || x.dossier;
      const { label, texte } = lisible(x.t, nomG);
      html += `<div class="bx-evt${ouvrable ? ' ouvre' : ''}" ${ouvrable ? `data-bur="actd" data-id="${k}"` : ''}><div class="bx-ic" style="--c:${COUL[x.genre] || '#94a3b8'}">${ic}</div><div class="bx-evt-corps"><div>${esc(texte)}</div><div class="bx-meta">${new Date(x.at * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${esc(label)} · <span class="${x.pro ? 'p' : 'q'}">${x.pro ? 'pro' : 'perso'}</span></div></div>${ouvrable ? '<div class="bx-chevron">›</div>' : ''}</div>`;
    });
    const nPro = derniereAct.filter(x => x.pro).length;
    const auj = derniereAct.filter(x => new Date(x.at * 1000).toDateString() === new Date().toDateString()).length;
    const seg = (k_, t, cls) => `<button type="button" class="${f === k_ ? 'on ' : ''}${cls}" data-bur="actf" data-id="${k_}">${t}</button>`;
    const puce = (k_, t) => `<button type="button" class="bx-puce${g === k_ ? ' on' : ''}" data-bur="actg" data-id="${k_}">${t}</button>`;
    const nG = k_ => derniereAct.filter(x => x.genre === k_).length;
    showBoard(`<div class="bx-in">
<div class="bx-tete"><div><div class="bx-sur">Atlas · les 14 derniers jours</div><div class="bx-titre">Tout ce que fait Atlas</div><div class="bx-sous">Les mails lus et préparés, les documents de l'atelier, la compta et Tiime, l'agenda, ce que tu as fait toi-même, la plateforme la nuit. Touche une ligne pour revoir son contenu.</div></div>${bb('← Mon bureau', 'bureau', 'x', 'fantome')}</div>
<div class="bx-stats"><div class="bx-stat"><b>${derniereAct.length}</b><span>actions en 14 jours</span></div><div class="bx-stat"><b>${auj}</b><span>aujourd'hui</span></div><div class="bx-stat"><b style="color:#fcd34d">${nG('atelier')}</b><span>documents faits</span></div><div class="bx-stat"><b style="color:#fdba74">${nG('compta')}</b><span>compta et Tiime</span></div><div class="bx-stat ok"><b>${nG('toi')}</b><span>faits par toi</span></div></div>
<div class="bx-barre"><div class="bx-seg">${seg('tout', `Tout · ${derniereAct.length}`, '')}${seg('pro', `Pro · ${nPro}`, 'pro')}${seg('perso', `Perso · ${derniereAct.length - nPro}`, 'perso')}</div>${puce('tous', 'Tous')}${Object.entries(GENRES_ACT).filter(([k_]) => nG(k_)).map(([k_, [ic, t]]) => puce(k_, `${ic} ${t} · ${nG(k_)}`)).join('')}</div>
${html || '<div class="bx-vide">Rien de ce côté-là ces 14 derniers jours.</div>'}</div>`, 'bx');
  }
  async function activite() {
    let r; try { r = await api({ action: 'activite' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    derniereAct = r.activite || []; ecranActivite();
    const auj = derniereAct.filter(x => new Date(x.at * 1000).toDateString() === new Date().toDateString());
    const compte = k => auj.filter(x => x.genre === k).length;
    return say(derniereAct.length ? `Ces quatorze derniers jours, ${derniereAct.length} choses. Aujourd'hui : ${[['mails', 'mails traités'], ['atelier', 'documents faits'], ['compta', 'actions de compta'], ['agenda', 'dates ajoutées à ton agenda'], ['toi', 'choses que tu as faites toi-même']].filter(([k]) => compte(k)).map(([k, t]) => `${compte(k)} ${t}`).join(', ') || 'rien de nouveau'}. Tout est à l'écran.` : "Je n'ai encore rien noté ces quatorze derniers jours.");
  }
  // ---------- la revue de la semaine : une page pour tout piloter (le dimanche soir, ou à la demande) ----------
  async function revue() {
    let r; try { r = await (await fetch(`${root()}/maison/revue`, { cache: 'no-store' })).json(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const eur = x => `${Math.round(Number(x || 0)).toLocaleString('fr-FR')} €`;
    const sec = (t, c, n) => `<div class="bx-section" style="--c:${c}"><i></i><b>${t}</b><small>${n || ''}</small></div>`;
    const ligne = (ic, t, meta) => `<div class="bx-evt"><div class="bx-ic">${ic}</div><div class="bx-evt-corps"><div>${esc(t)}</div>${meta ? `<div class="bx-meta">${esc(meta)}</div>` : ''}</div></div>`;
    const p = r.plateforme || {}, s = r.sopam || {}, g = r.gazette || {}, a = r.argent || {}, b = r.bureau || {}, tr = r.trading || {};
    const fr = iso => String(iso || '').split('-').reverse().slice(0, 2).join('/');
    showBoard(`<div class="bx-in">
<div class="bx-tete"><div><div class="bx-sur">Atlas · du ${esc(fr(r.du))} au ${esc(fr(r.au))}</div><div class="bx-titre">La revue de la semaine</div><div class="bx-sous">Tout piloter en cinq minutes : La rue du financement, SOPAM, la Gazette, l'argent, ton bureau et ton trading en chiffres.</div></div>${bb('← Mon bureau', 'bureau', 'x', 'fantome')}</div>
<div class="bx-stats"><div class="bx-stat"><b style="color:#c4b5fd">${p.faits || 0}/${p.total || 0}</b><span>sujets plateforme faits</span></div><div class="bx-stat"><b style="color:#fdba74">${s.faits || 0}/${s.total || 0}</b><span>étapes SOPAM faites</span></div><div class="bx-stat"><b style="color:#4ade80">${g.total || 0}</b><span>lecteurs-testeurs${g.semaine ? ` (+${g.semaine})` : ''}</span></div><div class="bx-stat urgent"><b>${eur(a.total_impayes)}</b><span>impayés</span></div><div class="bx-stat"><b>${b.a_valider || 0}</b><span>à valider au bureau</span></div></div>
${sec('La rue du financement · la plateforme', '#c4b5fd', `${(p.nuits || []).length} nuit${(p.nuits || []).length > 1 ? 's' : ''} de travail`)}
${(p.nuits || []).map(n => ligne('💻', n.resume || 'rapport écrit', `nuit du ${fr(n.nuit)}`)).join('') || '<div class="bx-info" style="padding:0 4px">Pas encore de nuit de travail cette semaine.</div>'}
${(p.a_valider || []).length ? `<div class="bx-info" style="padding:4px 4px 0">À valider : ${esc(p.a_valider.join(' · '))}</div>` : ''}
${sec('SOPAM · vers le financement', '#fdba74', `${(s.documents_semaine || []).length} document${(s.documents_semaine || []).length > 1 ? 's' : ''} cette semaine`)}
${(s.documents_semaine || []).map(d => ligne('📄', d.replace(/^Claude - \d{4}-\d{2}-\d{2} - /, '').replace(/\.pdf$/, ''), 'fait par Claude, à relire dans ton bureau')).join('') || '<div class="bx-info" style="padding:0 4px">Pas encore de document cette semaine.</div>'}
${(s.attend_equipe || []).length ? `<div class="bx-info" style="padding:4px 4px 0">Attend SOPAM / l'équipe : ${esc(s.attend_equipe.join(' · '))}</div>` : ''}
${sec('La Gazette · les futurs abonnés', '#4ade80', `${g.total || 0} inscrits`)}
${g.semaine ? ligne('✉', `${g.semaine} nouveau${g.semaine > 1 ? 'x' : ''} lecteur${g.semaine > 1 ? 's' : ''}-testeur${g.semaine > 1 ? 's' : ''} : ${(g.nouveaux || []).join(', ')}`) : '<div class="bx-info" style="padding:0 4px">Aucune inscription cette semaine : partage la Gazette sur LinkedIn.</div>'}
${sec("L'argent", '#f87171', a.total_impayes ? `${eur(a.total_impayes)} d'impayés` : '')}
${(a.impayes || []).map(x => ligne('⏳', `${x.client} : ${eur(x.montant)} (${x.factures.join(', ')})`, x.note)).join('') || '<div class="bx-info" style="padding:0 4px">Aucun impayé.</div>'}
${a.banque ? '' : '<div class="bx-info" style="padding:4px 4px 0">Exporte ton relevé Tiime dans Téléchargements pour voir l’argent vraiment encaissé.</div>'}
${sec('Ton bureau', '#a5b4fc', `${b.valides_semaine || 0} validé${(b.valides_semaine || 0) > 1 ? 's' : ''}, ${b.faits_par_toi || 0} fait${(b.faits_par_toi || 0) > 1 ? 's' : ''} par toi`)}
${(b.vieux || []).map(v => ligne('⚠', v, 'attend depuis plus de 5 jours')).join('') || '<div class="bx-info" style="padding:0 4px">Rien ne traîne.</div>'}
${sec('Ton trading · tes chiffres', '#fcd34d', 'statistiques de ton journal, pas un conseil')}
<div class="bx-stats"><div class="bx-stat"><b>${tr.trades || 0}</b><span>trades clôturés</span></div><div class="bx-stat"><b style="color:${(tr.pnl || 0) >= 0 ? '#86efac' : '#f87171'}">${(tr.pnl || 0) >= 0 ? '+' : ''}${eur(tr.pnl)}</b><span>résultat</span></div><div class="bx-stat"><b>${tr.gagnants || 0} / ${tr.perdants || 0}</b><span>gagnants / perdants</span></div><div class="bx-stat"><b>${eur(tr.gain_moyen)} / ${eur(tr.perte_moyenne)}</b><span>gain / perte moyens</span></div><div class="bx-stat ${tr.stops_elargis ? 'urgent' : 'ok'}"><b>${tr.stops_elargis || 0}</b><span>stop${(tr.stops_elargis || 0) > 1 ? 's' : ''} élargi${(tr.stops_elargis || 0) > 1 ? 's' : ''}</span></div></div>
</div>`, 'bx');
    return say(`La revue de la semaine. Plateforme : ${p.faits || 0} sujets faits sur ${p.total || 0}. SOPAM : ${(s.documents_semaine || []).length} documents à relire. Gazette : ${g.total || 0} lecteurs-testeurs. ${a.total_impayes ? `Impayés : ${eur(a.total_impayes)}. ` : ''}${b.a_valider ? `${b.a_valider} choses attendent ton oui au bureau. ` : ''}Trading : ${tr.trades || 0} trades, ${(tr.pnl || 0) >= 0 ? 'plus' : 'moins'} ${eur(Math.abs(tr.pnl || 0))}${tr.stops_elargis ? `, et ${tr.stops_elargis} stop élargi` : ''}. Le détail est à l'écran.`);
  }
  // le dimanche, vers 19 h : « ta revue de la semaine est prête » (une fois)
  setInterval(() => {
    const d = new Date(); if (d.getDay() !== 0 || d.getHours() < 19 || d.getHours() >= 22 || !dlg.started) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    if (typeof PROACTIF !== 'undefined') PROACTIF.annonce(`revue-${d.toDateString()}`, async () => { await revue(); return ''; }, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);
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
    if (/\b(revue (de la |de ma )?semaine|rapport du dimanche|le point de la semaine|mon (tableau de )?pilotage|bilan de ma semaine de travail)\b/.test(n)) return revue;
    if (/\b(tout ce que tu (as )?fai[st]|tout ce que fait atlas|ton activite|ton journal|journal d atlas|journal du bureau|qu est ce que tu (as fait|fais) (pour moi|aujourd hui|cette semaine|ces derniers jours)|tu as fait quoi (pour moi|aujourd hui|cette semaine)|qu as tu fait (pour moi|aujourd hui)|ce que tu fais pour moi|espace activite)\b/.test(n)) return activite;
    if (/\b(qu est ce que tu as fait|tu as fait quoi|qu as tu fait)\b.*\b(bureau|travail|mails)\b/.test(n)) return journal;
    if (/\b(mon bureau|le bureau|mod(?:e|es)? bureau|mot bureau|(?:ouvre|affiche|montre)(?: moi)? (?:ton|ce) bureau|bureau d atlas|(?:mon|ton|l) atelier(?: d atlas)?|ce que l atelier a fait|qu est ce que j ai a faire (au travail|au boulot|pour le travail|pour la rue du financement)|point (travail|boulot)|fais le point (du|sur le) (travail|boulot)|mes mails a traiter|qu est ce qu il faut que je fasse)\b/.test(n)) return () => { S.bureauFiltre = 'tout'; save(); return bureau(); };
    if (/\b(relis|regarde|verifie)\b.*\b(mes )?mails\b.*\b(maintenant|tout de suite)\b/.test(n)) return async () => { try { await api({ action: 'tour' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } return say("Je relis tes mails. Dis « mon bureau » dans quelques minutes."); };
    return null;
  }
  return { route, bureau, valideVoix };
})();

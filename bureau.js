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
    const btns = avecTexte(x) ? b_(`✓ Brouillon (boîte ${x.entite === 'lrf' ? 'pro' : 'perso'})`, 'valide', x.id, 'rgba(22,163,74,.6)') + b_('✏ Modifier', 'modifie', x.id) : b_('✓ À mes tâches', 'valide', x.id, 'rgba(22,163,74,.6)');
    return `<div style="margin:9px 0;padding:11px 13px;border-radius:13px;background:${urg ? 'rgba(248,113,113,.09)' : 'rgba(255,255,255,.05)'};border-left:3px solid ${urg ? '#f87171' : '#475569'}">
<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap"><small style="padding:2px 8px;border-radius:999px;background:rgba(165,180,252,.15);color:#c7d2fe">${esc(TYPE[x.type] || x.type)}</small><small style="color:#94a3b8">${esc(ENT[x.entite] || '')} · ${x.entite === 'lrf' ? '📁 boîte pro' : '📁 boîte perso'}</small><b style="flex:1;font-size:15px">${esc(x.de)}</b>${urg ? '<small style="color:#fca5a5">URGENT</small>' : ''}</div>
<div style="font-size:15px;margin-top:4px">${esc(x.resume)}${ech}</div>
${x.a_faire ? `<div style="font-size:13px;color:#fde68a;margin-top:2px">→ ${esc(x.a_faire)}</div>` : ''}
${x.note ? `<div style="font-size:13px;color:#fca5a5">⚠ ${esc(x.note)}</div>` : ''}
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
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,800px)"><small style="letter-spacing:.3em;color:#fcd34d">MON BUREAU · ${l.length} À VALIDER${urg ? ` · ${urg} URGENT${urg > 1 ? 'S' : ''}` : ''}${r.en_cours ? ' · JE LIS TES MAILS…' : ''}</small>
<div style="font-size:13px;color:#94a3b8;margin-top:4px">J'ai lu tes mails et préparé ce qu'il faut. Tu vérifies, tu valides : je range en brouillon dans Gmail (tu envoies toi-même) ou dans tes tâches.${r.faits_semaine ? ` Cette semaine : ${r.faits_semaine} chose${r.faits_semaine > 1 ? 's' : ''} validée${r.faits_semaine > 1 ? 's' : ''}.` : ''}</div>
${dos ? `<div style="margin:10px 0;padding:11px 13px;border-radius:13px;background:rgba(253,230,138,.08);border-left:3px solid #fcd34d"><b>Le cabinet comptable attend ta réponse</b><div style="font-size:14px;color:#cbd5e1">« ${esc(dos.sujet)} » : ${dos.achats.filter(a => a.fichiers.length).length}/${dos.achats.length} factures déjà retrouvées, le tableau complété.</div>${b_('Ouvrir le dossier', 'dossier', dos.id, 'rgba(253,230,138,.25)')}</div>` : ''}
${l.map(carte).join('') || '<div style="color:#64748b;margin-top:10px">Rien à faire : ton bureau est à jour.</div>'}
${(r.journal || []).length ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#a5b4fc;letter-spacing:.2em;font-size:12px">CE QUE J'AI FAIT</summary>${r.journal.map(j => `<div style="font-size:13px;padding:3px 0;color:#cbd5e1"><span style="color:#64748b">${new Date(j.at * 1000).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span> · ${esc(j.t)}</div>`).join('')}</details>` : ''}</div>`);
  }
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-bur]'); if (!b) return;
    const act = b.dataset.bur, id = b.dataset.id;
    if (act === 'dossier') return typeof COMPTA !== 'undefined' && COMPTA.dossier ? COMPTA.dossier() : null;
    let corps = { action: act, id };
    const x0 = (dernier.a_valider || []).find(y => y.id === id);
    if (act === 'adresse') { const el = document.getElementById(`adr-${id}`); corps.adresse = el ? el.value.trim() : ''; if (!corps.adresse) return say("Tape d'abord l'adresse mail du client."); patiente('Je rédige la relance…', corps.adresse); }
    if (act === 'modifie') {
      const a = await ask("Qu'est-ce que je change dans la réponse ?", { wait: 30000 });
      if (!a) return say("D'accord, je ne change rien.");
      corps.consigne = a; patiente('Je réécris la réponse…', a.slice(0, 80));
    } else if (act !== 'adresse') { b.disabled = true; b.textContent = '…'; }
    let r; try { r = await api(corps); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (r.ok === false) { await ecran(await api()); return say(`Je n'ai pas pu : ${r.raison || 'erreur'}.`); }
    fx.ok(); await ecran(r);
    if (act === 'valide') { return say(r.fait === 'brouillon' ? `C'est dans les brouillons de ta boîte ${x0 && x0.entite !== 'lrf' ? 'perso' : 'pro'} : relis et envoie quand c'est bon.` : "C'est dans tes tâches, avec la date."); }
    if (act === 'modifie') return say("Voilà la nouvelle version, à l'écran.");
    if (act === 'adresse') return say("La relance est rédigée, à l'écran : valide-la pour la ranger en brouillon.");
  });
  async function bureau() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    await ecran(r);
    const l = r.a_valider || [], urg = l.filter(x => x.urgence === 'haute'), rep = l.filter(avecTexte).length;
    if (!l.length) return say(r.en_cours ? "Je suis en train de lire tes mails ; reviens dans quelques minutes." : "Ton bureau est à jour : rien à faire pour le moment.");
    return say(`Ton bureau : ${l.length} chose${l.length > 1 ? 's' : ''} à valider${urg.length ? `, dont ${urg.length} urgente${urg.length > 1 ? 's' : ''} : ${urg.slice(0, 2).map(x => x.resume).join(' ; ')}` : ''}. ${rep ? `J'ai déjà rédigé ${rep} réponse${rep > 1 ? 's' : ''}. ` : ''}Tout est à l'écran : valide, modifie ou ignore.`);
  }
  // le matin, sur l'ordinateur : une phrase, une fois par jour
  setInterval(async () => {
    const h = new Date().getHours(); if (h < 9 || h >= 12 || !dlg.started || voice.occupe()) return;
    if (typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role && CONSTELLATION.role !== 'ordinateur') return;
    const j = new Date().toDateString(); if (S.bureauDit === j) return;
    let r; try { r = await api(); } catch (e) { return; }
    const l = r.a_valider || []; if (!l.length || r.en_cours) return;
    S.bureauDit = j; save();
    const urg = l.filter(x => x.urgence === 'haute').length;
    PROACTIF.annonce(`bureau-${j}`, `Ton bureau : ${l.length} chose${l.length > 1 ? 's' : ''} préparée${l.length > 1 ? 's' : ''}${urg ? `, dont ${urg} urgente${urg > 1 ? 's' : ''}` : ''}. Dis « on valide le bureau ».`, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);
  /* ---------- « on valide le bureau » : il lit chaque chose préparée, il répond oui / non / déjà fait / plus tard / « change : … » ---------- */
  const coeur = t => String(t || '').split('\n').filter(l => l.trim() && !/^(bonjour|bonsoir|cher|chère|hello)\b/i.test(l.trim())).join(' ')
    .replace(/\b(bien cordialement|cordialement|bien à vous|belle journée|à bientôt)\b[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
  const PASSE = /^(plus tard|passe|suivant|la suivante|on verra|apres|pas maintenant)\b/, STOP = /^(stop|arrete|on arrete|c est tout|fin|termine|ca suffit)\b/, FAIT = /\b(deja fait|c est fait|je l ai fait|deja repondu|deja envoye)\b/;
  async function valideVoix() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const items = (r.a_valider || []).map(x => ({ k: 'bureau', x }));
    try { const c = await COMPTA._api(); (c.a_valider_micro || []).filter(x => x.montant).forEach(x => items.push({ k: 'micro', x })); } catch (e) { /* sans la compta */ }
    try { const d = (((await COMPTA._dossierApi()).dossiers) || []).filter(y => !y.brouillon).slice(-1)[0]; if (d) items.unshift({ k: 'dossier', x: d }); } catch (e) { /* sans le dossier */ }
    if (!items.length) return say("Ton bureau est à jour : rien à valider.");
    const bilan = { brouillon: 0, tache: 0, micro: 0, ignore: 0, plus_tard: 0, fait: 0 };
    await say(`${items.length} chose${items.length > 1 ? 's' : ''} à valider. Réponds oui, non, déjà fait, plus tard, ou dis ce qu'il faut changer. Dis « stop » pour arrêter.`);
    for (let i = 0; i < items.length; i++) {
      const { k, x } = items[i], tete = `${i + 1} sur ${items.length}. `;
      let q;
      if (k === 'dossier') { if (COMPTA.dossier) { /* l'écran du dossier */ } q = `${tete}Le cabinet comptable attend ta réponse : ${x.achats.filter(a => a.fichiers.length).length} factures sur ${x.achats.length} retrouvées et le tableau complété. Je prépare le brouillon avec toutes les pièces ?`; }
      else if (k === 'micro') q = `${tete}Ta micro-entreprise : ${eu2(x.montant)} de ${x.tiers}, le ${new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}. Je le mets au livre des recettes ?`;
      else {
        await ecran(Object.assign({}, r, { a_valider: [x] }));
        q = `${tete}${x.de} : ${x.resume}.${x.note ? ` Attention : ${x.note}.` : ''} ${avecTexte(x) ? `Je propose de répondre : ${coeur(x.brouillon_texte)}. Je la range en brouillon ?` : x.type === 'relancer' && !x.adresse ? "Je n'ai pas l'adresse du client : je le garde pour plus tard." : `${x.a_faire || 'Je le mets dans tes tâches'}. Dans tes tâches ?`}`;
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
          if (k === 'dossier') { const rr = await COMPTA._dossierApi({ action: 'brouillon', id: x.id, corps: COMPTA._corpsReponse(x) }); if (rr && rr.ok) bilan.brouillon++; else await say("Le brouillon du dossier n'a pas pu être créé."); }
          else if (k === 'micro') { await COMPTA._api({ action: 'valide', id: x.id }); bilan.micro++; }
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
    if (bilan.brouillon) p.push(`${bilan.brouillon} brouillon${bilan.brouillon > 1 ? 's' : ''} rangé${bilan.brouillon > 1 ? 's' : ''}, à envoyer depuis Gmail`);
    if (bilan.tache) p.push(`${bilan.tache} dans tes tâches`);
    if (bilan.micro) p.push(`${bilan.micro} recette${bilan.micro > 1 ? 's' : ''} au livre`);
    if (bilan.fait) p.push(`${bilan.fait} déjà fait${bilan.fait > 1 ? 's' : ''}`);
    if (bilan.ignore) p.push(`${bilan.ignore} ignoré${bilan.ignore > 1 ? 's' : ''}`);
    if (bilan.plus_tard) p.push(`${bilan.plus_tard} pour plus tard`);
    return say(`C'est fait : ${p.join(', ') || 'rien de changé'}.`);
  }
  const eu2 = v => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} euros`;
  async function journal() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const j = (r.journal || []).filter(x => Date.now() / 1000 - x.at < 86400);
    await ecran(r);
    return say(j.length ? `Depuis hier : ${j.slice(0, 4).map(x => x.t).join(' ; ')}${j.length > 4 ? ', et le reste à l’écran' : ''}.` : "Je n'ai rien fait de nouveau depuis hier : ton bureau est à jour.");
  }
  function route(t, n) {
    if (/\b(on valide|valide|valider|on fait) (le|mon) bureau\b|\bon valide tout\b|\bon traite (le bureau|mes mails)\b/.test(n)) return valideVoix;
    if (/\b(qu est ce que tu as fait|tu as fait quoi|qu as tu fait)\b.*\b(bureau|travail|mails|aujourd hui|pour moi)\b|\bjournal du bureau\b/.test(n)) return journal;
    if (/\b(mon bureau|le bureau|qu est ce que j ai a faire (au travail|au boulot|pour le travail|pour la rue du financement)|point (travail|boulot)|fais le point (du|sur le) (travail|boulot)|mes mails a traiter|qu est ce qu il faut que je fasse)\b/.test(n)) return bureau;
    if (/\b(relis|regarde|verifie)\b.*\b(mes )?mails\b.*\b(maintenant|tout de suite)\b/.test(n)) return async () => { try { await api({ action: 'tour' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } return say("Je relis tes mails. Dis « mon bureau » dans quelques minutes."); };
    return null;
  }
  return { route, bureau, valideVoix };
})();

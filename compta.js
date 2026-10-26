/* ---------- la compta en pilote automatique ----------
   L'ordinateur de la maison lit chaque matin les mails financiers des deux boîtes et les classe, avec le cerveau de la maison
   (rien ne sort d'ici) : la boîte perso → la micro-entreprise ; la boîte pro → La Rue du financement (SAS, TVA, cabinet comptable, Tiime).
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
    const autres = ['micro', 'lrf', 'perso'].filter(k => k !== x.entite).map(k => btn(`→ ${NOM[k]}`, 'entite', x.id, `data-ent="${k}"`)).join('');
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
${(r.lrf_ventes || []).length ? sec('LA RUE DU FINANCEMENT · VENTES ET PAIEMENTS REÇUS (POUR INFO — SI C’EST TA MICRO, TOUCHE « → MICRO »)', r.lrf_ventes, '') : ''}
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
    if (/\b(le|mon|du) (comptable|cabinet)\b.*\b(demande|veut|attend)\b|\bqu est ce que (le comptable|le cabinet|laurence) (m a demande|veut|attend)\b/.test(n)) return demandes;
    if (/\b(relis|relit|reverifie|scanne)\b.*\b(mails?|factures)\b.*\bcompta\b|\brelance la compta\b/.test(n)) return relance;
    return null;
  }
  return { route, point };
})();

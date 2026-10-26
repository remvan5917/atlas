/* =========================================================
   ATLAS — le mode tournage (pour filmer Atlas sans montrer sa vie)
   - « mode tournage » : les VRAIS écrans d'Atlas (le bureau, la compta, le dossier du comptable, la séance de trading, le payout,
     l'agenda, le téléphone) avec des DONNÉES FICTIVES ; rien ne sort (ni mail, ni SMS, ni agenda, ni appel) ; les annonces
     spontanées se taisent ; un petit badge « démo » le rappelle. « Remets la démo à zéro » : tout recommence (pour une 2e prise).
   - « séquence de démarrage » : le réveil d'Atlas, façon film (les anneaux, les systèmes qui s'allument, puis sa voix).
   - « et demain ? » : la fin de la vidéo — le plan du robot qui se dessine, et ce qu'il deviendra.
   - « fin du mode tournage » (ou « coupez ! ») : tout redevient normal.
   ========================================================= */
const DEMO = (() => {
  let on = false; try { on = localStorage.getItem('atlas-demo') === '1'; } catch (e) { /* sans */ }
  const vraiFetch = window.fetch.bind(window);
  const maintenant = () => Math.floor(Date.now() / 1000);
  const jourISO = (dj = 0) => { const d = new Date(Date.now() + dj * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const aujourdhui = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return Math.floor(d / 1000); };
  const dans = (dj, h, m = 0) => { const d = new Date(Date.now() + dj * 86400000); d.setHours(h, m, 0, 0); return Math.floor(d / 1000); };
  const prenom = () => S.nom || 'Rémy';
  let D = null; // les données fictives, refaites à chaque prise

  function fraiches() {
    const bureau = {
      en_cours: false, tour_at: maintenant() - 600, faits_semaine: 14, envoyes_semaine: 9,
      journal: [
        { at: maintenant() - 3600 * 9, t: 'Lu 37 nouveaux mails dans tes deux boîtes, trié par entreprise' },
        { at: maintenant() - 3600 * 8, t: "Rangé 3 factures fournisseurs dans le dossier du comptable" },
        { at: maintenant() - 3600 * 7, t: 'Préparé 5 réponses dans ton style, à valider' },
      ],
      a_valider: [
        { id: 'd1', source: 'mail', compte: 'pro', entite: 'lrf', de: 'Claire Martin — Nexa Conseil', adresse: 'claire.martin@nexa-conseil.fr', sujet: 'Accompagnement financement — 3 startups', type: 'repondre', urgence: 'haute', echeance: null,
          resume: 'Nexa Conseil veut te confier 3 startups à accompagner vers un financement BPI, et demande ton offre', a_faire: "Répondre avec l'offre et deux créneaux d'appel", pj: [], statut: 'a_valider',
          brouillon_texte: `Bonjour Claire,\n\nMerci pour votre confiance. Avec plaisir pour accompagner vos trois startups : notre offre couvre le diagnostic de financement, le montage du dossier BPI et le suivi jusqu'à la décision.\n\nJe vous propose un appel jeudi à 10 h ou vendredi à 14 h pour en parler.\n\nBien cordialement,\n${prenom()} Vancoppenolle` },
        { id: 'd2', source: 'mail', compte: 'pro', entite: 'lrf', de: 'Région — Appels à projets', adresse: '', sujet: 'Appel à projets Innovation 2027', type: 'tache', urgence: 'haute', echeance: jourISO(5),
          resume: "L'appel à projets « Innovation 2027 » de la Région est ouvert : 40 000 € par projet", a_faire: "J'ai préparé la liste des 6 pièces du dossier", pj: [], statut: 'a_valider' },
        { id: 'd3', source: 'mail', compte: 'pro', entite: 'lrf', de: 'Ton conseiller bancaire', adresse: '', sujet: "Prêt d'amorçage — rendez-vous", type: 'rendez_vous', urgence: 'normale', echeance: jourISO(3),
          resume: "Ton conseiller propose un rendez-vous jeudi à 9 h pour le prêt d'amorçage", a_faire: "L'ajouter à ton agenda (tu es libre)", pj: [], statut: 'a_valider' },
        { id: 'd4', source: 'mail', compte: 'pro', entite: 'lrf', de: 'Atelier Brume', adresse: 'contact@atelier-brume.fr', sujet: 'Attestation de fin de mission', type: 'envoyer_document', urgence: 'normale', echeance: null,
          resume: "Atelier Brume demande l'attestation de fin de mission pour son financeur", a_faire: "Envoyer l'attestation (je l'ai préparée)", document: 'Attestation de fin de mission', pj: [], statut: 'a_valider',
          brouillon_texte: `Bonjour,\n\nVous trouverez ci-joint l'attestation de fin de mission, signée. N'hésitez pas si votre financeur a besoin d'autre chose.\n\nBien cordialement,\n${prenom()} Vancoppenolle` },
        { id: 'd5', source: 'mail', compte: 'perso', entite: 'micro', de: 'Revue Horizons', adresse: 'redaction@revue-horizons.fr', sujet: 'Republication de votre analyse', type: 'repondre', urgence: 'basse', echeance: null,
          resume: 'Une revue veut republier ton analyse sur la mer Rouge, contre 250 €', a_faire: 'Accepter et envoyer la facture de la micro-entreprise', pj: [], statut: 'a_valider',
          brouillon_texte: `Bonjour,\n\nAvec plaisir pour la republication. Je vous envoie la facture de 250 € dans la journée.\n\nBien à vous,\n${prenom()} Vancoppenolle` },
      ],
    };
    const F = (dj, four, mt) => ({ date: jourISO(dj), libelle: four.toUpperCase(), montant: -mt, fournisseur: four, fichiers: [`${jourISO(dj)} ${four} ${mt.toFixed(2).replace('.', ',')}.pdf`], sur: true, nature: '', lien: '' });
    const dossier = {
      id: 'demo-cabinet', compte: 'pro', uid: '1', de: 'Cabinet comptable <dossiers@cabinet-expert.fr>', sujet: 'POINT DOSSIER — LA RUE DU FINANCEMENT', recu: jourISO(-1), dossier: '', banque: [],
      achats: [F(-62, 'Wix', 38.88), F(-58, 'Microsoft', 11.47), F(-55, 'Anthropic', 18), F(-52, 'ElevenLabs', 19.6), F(-50, 'Cursor', 17.58), F(-47, 'Gamma', 20), F(-45, 'Orange', 41.99), F(-40, 'OpenAI', 23),
        F(-33, 'Wix', 38.88), F(-30, 'Microsoft', 11.47), F(-27, 'Anthropic', 18), F(-24, 'ElevenLabs', 19.6), F(-22, 'Cursor', 17.58), F(-19, 'Gamma', 20), F(-16, 'Orange', 41.99), F(-12, 'OpenAI', 23),
        F(-9, 'Wix', 38.88), F(-7, 'Anthropic', 18), F(-6, 'ElevenLabs', 19.6), F(-4, 'Microsoft', 11.47), F(-2, 'OpenAI', 23)],
      ventes: [{ client: 'NEXA CONSEIL', question: 'ÉTAT DU COMPTE NEXA CONSEIL', factures: [31, 34], jointes: { 31: 'Facture F31.pdf', 34: 'Facture F34.pdf' }, n_factures: 2, n_reglements: 2, facture: 2400, regle: 2400, ecart: 0, reponse: '' },
        { client: 'ATELIER BRUME', question: 'ÉTAT DU COMPTE ATELIER BRUME', factures: [33], jointes: { 33: 'Facture F33.pdf' }, n_factures: 1, n_reglements: 1, facture: 1800, regle: 1800, ecart: 0, reponse: '' }],
      prepare_at: maintenant() - 3600 * 6, brouillon: null, envoye: null,
    };
    const C = (id, entite, compte, type, tiers, montant, dj, resume) => ({ id, compte, entite, type, tiers, montant, tva: entite === 'lrf' && montant ? +(montant / 6).toFixed(2) : 0, devise: 'EUR', date: jourISO(dj), echeance: null, reference: null, resume, pj: [], statut: 'a_valider' });
    const compta = {
      en_cours: false, progres: [37, 37], erreur: '', scan_at: maintenant() - 1800,
      a_valider_micro: [C('m1', 'micro', 'perso', 'micro', 'Revue Horizons', 250, -1, 'Republication d’une analyse — paiement reçu'), C('m2', 'micro', 'perso', 'micro', 'Conférence Géopolitique Lille', 400, -3, 'Intervention du 12 — virement reçu')],
      lrf_demandes: [C('l1', 'lrf', 'pro', 'echeance', 'Impôts — TVA', null, 9, 'Déclaration de TVA du mois : à déposer avant le 19 (tout est prêt)')],
      lrf_achats: [],
      lrf_ventes: [C('l2', 'lrf', 'pro', 'encaissement', 'Nexa Conseil', 2400, -2, 'Facture F34 payée'), C('l3', 'lrf', 'pro', 'encaissement', 'Atelier Brume', 1800, -5, 'Facture F33 payée')],
      lrf_mois: { achats_ttc: 612, tva_deductible: 102, ventes_ttc: 8640 },
    };
    const budget = { items: [{ type: 'ca', date: jourISO(-35), montant: 1450 }, { type: 'ca', date: jourISO(-6), montant: 650 }] };
    const t0 = (h, m, sens, instr, prix, lots, ticks, risque, pnl, source = 'topstepx', sortie = prix) => ({ id: `t${h}${m}`, source, compte: source === 'ftmo' ? 'FTMO 100K' : '50K', sens, instr, contrat: instr, prix, lots, stop_prix: null, stop_ticks: ticks, stop_elargi: false, stop_ticks_fin: ticks, risque, at: aujourdhui(h, m), fin: aujourdhui(h, m + 9), sortie, pnl, motif: '', auto: true });
    const trading = {
      trades: [t0(15, 34, 'long', 'MNQ', 21450.25, 2, 40, 100, 162, 'topstepx', 21490.75), t0(16, 5, 'short', 'MGC', 2665.4, 1, 30, 90, -88, 'topstepx', 2674.2), t0(16, 48, 'long', 'MNQ', 21478.5, 1, 40, 80, 131, 'topstepx', 21544), t0(17, 12, 'long', 'EURUSD', 1.0842, 1, 12, 60, 54, 'ftmo', 1.08474)],
      actif: false, session: { jour: jourISO(), debut: aujourdhui(15, 25), fin: aujourdhui(17, 40) }, pnl: null, limites: { jour: 1000, compte: 2000 }, semaine: 1240, semaine_jours: 4,
      topstepx: { relie: true, erreur: '', vu_at: maintenant(), comptes: ['50K'] }, ftmo: { compte: 'FTMO Challenge 100K', taille: 100000, equity: 104380, equity_debut_jour: 104326, at: maintenant() },
      payout: { taille: 50000, solde: 51240, net_cycle: 1240, jours_cycle: 7, gagnants: [jourISO(-6), jourISO(-5), jourISO(-2), jourISO()], manque_std: 1, meilleur: 412, part_meilleur: 33, profit_pour_consistance: 0, std_ok: false, cons_ok: true,
        eligible: true, montant: 620, net_pour_toi: 620, plafond: 2000, deja_retire: 0, mll: 49000, marge_mll: 2240, dll: 1000, pnl_jour: 259, dernier_payout: null, jour: jourISO() },
      annonces_jour: [], regles: { max_trades: 4, risque_max: 120 }, plat_a: aujourdhui(22, 10), ouverture_ny: aujourdhui(15, 30), annonces: [],
      jours: { [jourISO(-6)]: 310, [jourISO(-5)]: 412, [jourISO(-4)]: -140, [jourISO(-3)]: 95, [jourISO(-2)]: 304, [jourISO()]: 259 },
    };
    const agenda = { relie: true, erreur: '', evenements: [
      { debut: dans(0, 9, 30), fin: dans(0, 10, 30), journee: false, titre: 'Appel — Nexa Conseil', lieu: '', uid: 'a1' },
      { debut: dans(0, 15, 25), fin: dans(0, 17, 40), journee: false, titre: 'Session de trading', lieu: '', uid: 'a2' },
      { debut: dans(1, 12, 0), fin: dans(1, 13, 0), journee: false, titre: 'Déjeuner partenaires', lieu: 'Lille', uid: 'a3' },
      { debut: dans(3, 9, 0), fin: dans(3, 10, 0), journee: false, titre: "Banque — prêt d'amorçage", lieu: '', uid: 'a4' },
      { debut: dans(4, 18, 30), fin: dans(4, 20, 0), journee: false, titre: 'Sport', lieu: '', uid: 'a5' }] };
    const telephone = { cle: true, voix: true, agent: true, numero: '+33300000000', pret: true, sms: true,
      derniers: [{ at: maintenant() - 86400, a: '', qui: 'La Table de Paul', statut: 'terminé', resume: 'Table réservée pour 4 personnes samedi à 20 h, en terrasse.' }] };
    return { bureau, dossier, compta, budget, trading, agenda, telephone };
  }

  const json = o => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const etatDossier = () => ({ en_cours: null, dossiers: [D.dossier] });
  // les écrans d'Atlas demandent leurs données à la maison : en tournage, c'est ici qu'on répond (et rien ne part)
  window.fetch = async (u, o) => {
    if (!on) return vraiFetch(u, o);
    const url = String((u && u.url) || u), m = url.match(/\/maison\/[a-z/_-]+/), p = m ? m[0].replace(/\/+$/, '') : '';
    if (!p) return vraiFetch(u, o);
    if (!D) D = fraiches();
    let c = null; try { c = o && o.body ? JSON.parse(o.body) : null; } catch (e) { c = null; }
    const post = !!(o && o.method === 'POST');
    if (p === '/maison/bureau') {
      if (post && c && c.id) {
        const x = D.bureau.a_valider.find(y => y.id === c.id);
        if (c.action === 'modifie' && x) { x.brouillon_texte = x.brouillon_texte.replace(/\n\nBien/, `\n\n(${c.consigne})\n\nBien`); return json(D.bureau); }
        if (x) { D.bureau.a_valider = D.bureau.a_valider.filter(y => y !== x); D.bureau.journal.unshift({ at: maintenant(), t: c.action === 'envoie' ? `Envoyé après ton oui : ${x.sujet}` : `Validé : ${x.sujet}` }); if (c.action === 'envoie') D.bureau.envoyes_semaine++; D.bureau.faits_semaine++; }
        return json(Object.assign({}, D.bureau, { fait: x && x.type === 'repondre' ? 'brouillon' : 'tache' }));
      }
      return json(D.bureau);
    }
    if (p === '/maison/compta/dossier') {
      if (post && c && c.action === 'envoie') { D.dossier.envoye = maintenant(); return json({ ok: true, pieces: D.dossier.achats.length + 3, a: 'dossiers@cabinet-expert.fr' }); }
      if (post && c && c.action === 'brouillon') { D.dossier.brouillon = maintenant(); return json({ ok: true, pieces: D.dossier.achats.length + 3 }); }
      if (post && c && c.action === 'repond') { const v = D.dossier.ventes[c.vente]; if (v) v.reponse = c.texte; return json({ ok: true }); }
      return json(Object.assign(etatDossier(), { ranges: [] }));
    }
    if (p === '/maison/compta') {
      if (post && c && c.id) { for (const k of ['a_valider_micro', 'lrf_demandes', 'lrf_achats', 'lrf_ventes']) D.compta[k] = D.compta[k].filter(x => x.id !== c.id); }
      return json(D.compta);
    }
    if (p === '/maison/carnet/budget') return json({ ok: true, doc: D.budget });
    if (p === '/maison/carnet/contacts') return json({ ok: true, doc: { items: [{ nom: 'Julie', tel: '0600000000' }, { nom: 'Paul', tel: '0600000001' }] } });
    if (p === '/maison/trading') return json(D.trading);
    if (p === '/maison/telephone' || p === '/maison/appels') return json(Object.assign({ ok: true, numero: '0600000000', nom: c && c.qui }, D.telephone));
    if (p === '/maison/agenda') return json(D.agenda);
    if (p.startsWith('/maison/agenda/') || p === '/maison/calendrier') return json({ ok: true });
    if (p === '/maison/alertes') return json({ alertes: [] });
    if (p === '/maison/jumelage') return json({ ok: true, demandes: [] });
    return vraiFetch(u, o); // le reste (les lumières, l'imprimante, l'écran de l'ordi) : pour de vrai
  };

  /* ---------- le badge (honnête : ce sont des données de démonstration) ---------- */
  function badge() {
    let b = document.getElementById('demo-badge');
    if (!on) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('div'); b.id = 'demo-badge';
    b.style.cssText = 'position:fixed;left:12px;bottom:10px;z-index:99999;font:600 11px system-ui;letter-spacing:.12em;color:rgba(226,232,240,.55);pointer-events:none';
    b.textContent = '● DÉMO · DONNÉES FICTIVES';
    document.body.appendChild(b);
  }
  setTimeout(() => {
    badge();
    if (typeof PROACTIF !== 'undefined' && PROACTIF.annonce) { const a = PROACTIF.annonce.bind(PROACTIF); PROACTIF.annonce = (...x) => (on ? null : a(...x)); } // en tournage, il ne parle pas tout seul
  }, 1500);

  function regle(v) { on = v; D = v ? fraiches() : null; try { localStorage.setItem('atlas-demo', v ? '1' : '0'); } catch (e) { /* sans */ } badge(); }

  /* ---------- le décor des scènes de cinéma ---------- */
  const CSS = `
#demo-cine{position:fixed;inset:0;z-index:99990;background:radial-gradient(ellipse at center,#06121f 0%,#010409 70%);display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden;font-family:ui-monospace,Menlo,monospace;color:#a5f3fc;transition:opacity 1.2s}
#demo-cine .anneaux{position:relative;width:min(56vmin,520px);height:min(56vmin,520px);flex:none}
#demo-cine .anneaux svg{position:absolute;inset:0;width:100%;height:100%}
#demo-cine .r1{animation:dc-tourne 14s linear infinite}#demo-cine .r2{animation:dc-tourne 9s linear infinite reverse}#demo-cine .r3{animation:dc-tourne 22s linear infinite}
#demo-cine .nom{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:200 clamp(34px,8vmin,78px) system-ui;letter-spacing:.5em;padding-left:.5em;color:#e0f2fe;text-shadow:0 0 24px #22d3ee,0 0 60px #0891b2;opacity:0;animation:dc-nom 2.4s 0.6s forwards}
#demo-cine .journal{margin-top:2.5vh;width:min(92vw,700px);font-size:clamp(12px,1.9vmin,15px);line-height:1.75;min-height:12em}
#demo-cine .journal div{opacity:0;animation:dc-ligne .35s forwards;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#demo-cine .ok{color:#4ade80}#demo-cine .fin{margin-top:2vh;font:700 clamp(14px,2.6vmin,22px) system-ui;letter-spacing:.45em;color:#4ade80;text-shadow:0 0 18px #22c55e;opacity:0}
#demo-cine .balayage{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);box-shadow:0 0 18px #22d3ee;animation:dc-balaye 3.2s ease-in-out infinite;opacity:.6}
#demo-cine .grille{position:absolute;left:0;right:0;bottom:0;width:100%;height:42%}
#demo-cine .robot{height:min(62vh,540px);width:auto;filter:drop-shadow(0 0 8px #22d3ee) drop-shadow(0 0 22px #0891b2)}
#demo-cine .robot *{fill:none;stroke:#67e8f9;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:var(--l);stroke-dashoffset:var(--l);animation:dc-trace 2.2s forwards}
#demo-cine .etapes{position:absolute;top:7vh;left:6vw;font-size:clamp(11px,1.9vmin,15px);line-height:1.9;text-align:left;padding:10px 14px;border:1px solid rgba(34,211,238,.25);border-radius:10px;background:rgba(2,12,20,.5)}
#demo-cine .coin{position:absolute;top:7vh;right:6vw;text-align:right;font-size:clamp(10px,1.6vmin,13px);letter-spacing:.25em;line-height:1.8;color:#67e8f9;opacity:.8}
#demo-cine .etapes div{opacity:0;animation:dc-ligne .5s forwards}
#demo-cine .phrase{position:absolute;bottom:7vh;left:0;right:0;text-align:center;font:300 clamp(16px,3vmin,26px) system-ui;color:#e0f2fe;letter-spacing:.05em;padding:0 16px;text-shadow:0 0 14px #0891b2;transition:opacity .6s}
@keyframes dc-tourne{to{transform:rotate(360deg)}}@keyframes dc-nom{0%{opacity:0;letter-spacing:1.4em;filter:blur(8px)}100%{opacity:1;letter-spacing:.5em;filter:none}}
@keyframes dc-ligne{to{opacity:1}}@keyframes dc-balaye{0%{top:8%}50%{top:92%}100%{top:8%}}@keyframes dc-avance{to{background-position:0 60px}}@keyframes dc-trace{to{stroke-dashoffset:0}}
@keyframes dc-clignote{0%,100%{opacity:1}50%{opacity:.25}}`;
  function decor() {
    if (!document.getElementById('demo-css')) { const s = document.createElement('style'); s.id = 'demo-css'; s.textContent = CSS; document.head.appendChild(s); }
    let d = document.getElementById('demo-cine'); if (d) d.remove();
    d = document.createElement('div'); d.id = 'demo-cine'; d.style.opacity = '0'; document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = '1'; });
    return d;
  }
  let scene = 0; // une seule scène à la fois : la nouvelle arrête l'ancienne
  const attends = ms => new Promise(r => setTimeout(r, ms));
  async function fermeDecor(moi) { if (moi != null && moi !== scene) return; const d = document.getElementById('demo-cine'); if (!d) return; d.style.opacity = '0'; await attends(1200); d.remove(); }
  const anneaux = () => `<div class="anneaux">
<svg class="r1" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="#22d3ee" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="2 5"/><circle cx="100" cy="100" r="86" fill="none" stroke="#0e7490" stroke-width="2.5" stroke-dasharray="60 18 8 18"/></svg>
<svg class="r2" viewBox="0 0 200 200"><circle cx="100" cy="100" r="74" fill="none" stroke="#67e8f9" stroke-width="1.2" stroke-dasharray="120 40 10 40"/><circle cx="100" cy="100" r="68" fill="none" stroke="#155e75" stroke-width="5" stroke-dasharray="3 9"/></svg>
<svg class="r3" viewBox="0 0 200 200"><circle cx="100" cy="100" r="56" fill="none" stroke="#a5f3fc" stroke-opacity=".7" stroke-width=".6"/><path d="M100 30 L104 40 L96 40 Z M100 170 L104 160 L96 160 Z" fill="#22d3ee"/></svg>
<div class="nom">ATLAS</div></div>`;

  /* ---------- « séquence de démarrage » : le réveil, façon film ---------- */
  async function demarrage() {
    if (!D) D = fraiches();
    const moi = ++scene, fini = () => moi !== scene;
    try { hideBoard(); } catch (e) { /* rien */ }
    const d = decor();
    d.innerHTML = `<div class="balayage"></div>${anneaux()}<div class="journal"></div><div class="fin">SYSTÈMES OPÉRATIONNELS</div>`;
    const j = d.querySelector('.journal');
    const nb = D.bureau.a_valider.length, fac = D.dossier.achats.length;
    const lignes = [['Noyau neuronal', 'en ligne'], ['Voix', 'synthèse active'], ['Yeux · caméras de la maison', '4 / 4'], ['Mémoire', 'chargée'], ['Boîtes mail · pro et perso', '37 mails lus'],
      ['Bureau', `${nb} actions préparées`], ['Comptabilité', `${fac} / ${fac} factures retrouvées`], ['Marchés · CME', 'surveillance active'], ['Appareils · ordinateur, iPhone, tablette', 'synchronisés'], ['Protocole de confiance', 'rien ne part sans ton oui']];
    try { fx.tone([[220, 0.25], [330, 0.25], [440, 0.4]]); } catch (e) { /* sans son */ }
    await attends(2600);
    for (const [k, v] of lignes) {
      if (fini()) return;
      const el = document.createElement('div');
      el.innerHTML = `<span class="ok">[ OK ]</span> ${esc(k)} ${'·'.repeat(Math.max(3, 34 - k.length))} ${esc(v)}`;
      j.appendChild(el);
      try { fx.tone([[1320, 0.03]]); } catch (e) { /* sans son */ }
      await attends(380);
    }
    await attends(400);
    const fin = d.querySelector('.fin'); fin.style.cssText = 'opacity:1;animation:dc-clignote 1s 3';
    try { fx.tone([[660, 0.12], [990, 0.12], [1320, 0.3]]); } catch (e) { /* sans son */ }
    await attends(2200);
    if (fini()) return;
    await fermeDecor(moi);
    return say(`Bonjour ${prenom()}. Pendant que tu dormais, j'ai lu tes deux boîtes mail, préparé ${nb} réponses et actions, retrouvé les ${fac} factures du comptable, et surveillé les marchés. Ta journée est prête. Je t'écoute.`);
  }

  /* ---------- « et demain ? » : le plan du robot qui se dessine ---------- */
  const ROBOT = [
    'M200 30 c26 0 40 16 40 40 v14 c0 22 -16 36 -40 36 s-40 -14 -40 -36 v-14 c0 -24 14 -40 40 -40 z', // la tête
    'M168 72 q32 -12 64 0 q-2 16 -32 18 q-30 -2 -32 -18 z', // la visière
    'M188 120 l4 14 h16 l4 -14', // le cou
    'M150 140 q50 -14 100 0 l-10 70 q-40 22 -80 0 z', // le torse
    'M188 172 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', // le cœur
    'M164 192 q36 10 72 0', 'M168 222 h64 l-6 30 h-52 z', // le ventre, les hanches
    'M133 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', 'M249 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', // les épaules
    'M136 156 l-20 58', 'M110 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M116 220 l-6 48', 'M110 268 l-6 14 m6 -14 l0 15 m0 -15 l6 13', // le bras gauche
    'M264 156 l20 58', 'M278 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M284 220 l6 48', 'M290 268 l6 14 m-6 -14 l0 15 m0 -15 l-6 13', // le bras droit
    'M180 252 l-8 64', 'M166 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M172 328 l-4 52', 'M156 384 h24', // la jambe gauche
    'M220 252 l8 64', 'M222 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M228 328 l4 52', 'M220 384 h24', // la jambe droite
  ];
  // le sol du hangar : une grille en perspective (dessinée à plat : rien à calculer pour la carte graphique)
  function sol() {
    const L = [];
    for (let i = 0; i <= 12; i++) { const y = 100 * Math.pow(i / 12, 1.8); L.push(`<line vector-effect="non-scaling-stroke" x1="0" y1="${y.toFixed(1)}" x2="1000" y2="${y.toFixed(1)}" stroke-opacity="${(0.05 + 0.25 * i / 12).toFixed(2)}"/>`); }
    for (let i = -14; i <= 14; i++) L.push(`<line vector-effect="non-scaling-stroke" x1="${500 + i * 12}" y1="0" x2="${500 + i * 95}" y2="100" stroke-opacity=".18"/>`);
    return `<svg class="grille" viewBox="0 0 1000 100" preserveAspectRatio="none" stroke="#22d3ee" stroke-width=".6" vector-effect="non-scaling-stroke">${L.join('')}</svg>`;
  }
  async function demain() {
    const moi = ++scene, fini = () => moi !== scene;
    try { hideBoard(); } catch (e) { /* rien */ }
    const d = decor();
    d.innerHTML = `${sol()}<svg class="robot" viewBox="80 20 240 380">${ROBOT.map((p, i) => `<path d="${p}" style="--l:700;animation-delay:${0.12 * i}s"/>`).join('')}<path d="M172 74 q28 -9 56 0" style="--l:120;animation-delay:3.4s;stroke:#e0f2fe;stroke-width:4;filter:blur(1px)"/></svg>
<div class="etapes"></div><div class="coin">PROJET ATLAS<br>CORPS · V0.1<br><span style="color:#fbbf24">EN CONSTRUCTION</span></div><div class="phrase" style="opacity:0"></div>`;
    const e = d.querySelector('.etapes'), ph = d.querySelector('.phrase');
    try { fx.tone([[110, 0.6], [165, 0.6]]); } catch (er) { /* sans son */ }
    const etapes = [['PHASE 1', 'LA VOIX', '✓'], ['PHASE 2', 'LES YEUX', '✓'], ['PHASE 3', 'LE CERVEAU', '✓'], ['PHASE 4', 'LE CORPS', 'EN CONSTRUCTION']];
    await attends(1800);
    for (const [a, b, c] of etapes) {
      if (fini()) return;
      const el = document.createElement('div');
      el.innerHTML = `<span style="color:#64748b">${a}</span> · ${b} <span style="color:${c === '✓' ? '#4ade80' : '#fbbf24'};${c === '✓' ? '' : 'animation:dc-clignote 1.2s infinite'}">${c}</span>`;
      e.appendChild(el); try { fx.tone([[c === '✓' ? 1175 : 587, 0.06]]); } catch (er) { /* sans son */ }
      await attends(900);
    }
    const texte = [
      "Aujourd'hui, j'ai une voix. J'ai des yeux.",
      "Je lis, j'écris, je compte, je surveille. Et je n'agis jamais sans ton accord.",
      "Mais tout ça tient encore dans un écran.",
      "La prochaine étape, c'est un corps.",
      `Je ne suis pas la fin de l'histoire, ${prenom()}. Je suis le début.`,
    ];
    for (const t of texte) { if (fini()) return; ph.textContent = t; ph.style.opacity = '1'; await say(t); await attends(350); }
    await attends(1200);
    ph.style.opacity = '0'; await attends(700);
    return fermeDecor(moi);
  }

  /* ---------- le téléphone, en tournage : l'écran du message, l'appel (aperçu) ---------- */
  const initiales = n => String(n || '?').replace(/^(le|la|les|l['’])\s+/i, '').trim().slice(0, 2).toUpperCase();
  async function message(qui, texte, canal, groupe) {
    texte = String(texte || '').charAt(0).toUpperCase() + String(texte || '').slice(1); qui = String(qui || '').charAt(0).toUpperCase() + String(qui || '').slice(1);
    const vert = canal === 'WhatsApp';
    showBoard(`<div style="font-family:system-ui;width:min(86vw,360px);margin:auto;border-radius:34px;padding:14px;background:#0b0f14;border:2px solid #334155;box-shadow:0 0 40px rgba(34,211,238,.15)">
<div style="display:flex;align-items:center;gap:10px;padding:6px 6px 12px;border-bottom:1px solid #1e293b"><div style="width:38px;height:38px;border-radius:50%;background:${vert ? '#128c7e' : '#2563eb'};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${esc(groupe ? '👥' : initiales(qui))}</div><div style="text-align:left"><b style="color:#f1f5f9">${esc(qui)}</b><div style="font-size:12px;color:#94a3b8">${esc(canal)}${groupe ? ' · groupe' : ''}</div></div></div>
<div id="demo-fil" style="min-height:230px;padding:14px 4px;display:flex;flex-direction:column;gap:8px;background:${vert ? 'rgba(18,140,126,.06)' : 'transparent'}"></div></div>`);
    const fil = document.getElementById('demo-fil');
    const bulle = (t, moi) => { const b = document.createElement('div'); b.style.cssText = `max-width:80%;align-self:${moi ? 'flex-end' : 'flex-start'};padding:9px 12px;border-radius:16px;font-size:15px;line-height:1.35;text-align:left;color:#f8fafc;background:${moi ? (vert ? '#056162' : '#2563eb') : '#1e293b'};opacity:0;transform:translateY(8px);transition:all .35s`; b.innerHTML = t; fil.appendChild(b); requestAnimationFrame(() => { b.style.opacity = '1'; b.style.transform = 'none'; }); return b; };
    await attends(500);
    const b = bulle(`${esc(texte)} <span id="demo-coche" style="font-size:12px;color:#94a3b8;margin-left:6px">✓</span>`, true);
    try { fx.tone([[1568, 0.05]]); } catch (e) { /* sans son */ }
    await attends(900); const co = b.querySelector('#demo-coche'); if (co) { co.textContent = '✓✓'; co.style.color = vert ? '#53bdeb' : '#bfdbfe'; }
    const dit = say(`C'est envoyé à ${qui}.`);
    await attends(1800);
    const tape = bulle('<span style="letter-spacing:3px;color:#94a3b8">•••</span>', false);
    await attends(1500); tape.innerHTML = groupe ? 'Top, merci ! 👍' : 'Parfait, merci ! 👍';
    try { fx.tone([[1046, 0.05], [1318, 0.07]]); } catch (e) { /* sans son */ }
    await dit;
    await attends(2500); hideBoard();
  }
  function scenario(mission) {
    const m = N(mission);
    if (/reserv|table|restaurant|diner|dejeuner/.test(m)) return { lignes: [
      ['eux', 'La Table de Paul, bonjour !'],
      ['atlas', `Bonjour, je suis Atlas, le robot personnel de ${prenom()} Vancoppenolle, une intelligence artificielle. J'appelle pour réserver une table, s'il vous plaît.`],
      ['eux', 'Ah… bonjour ! Oui, bien sûr. Pour combien de personnes, et quand ?'],
      ['atlas', 'Quatre personnes, samedi soir à vingt heures, en terrasse si possible.'],
      ['eux', "Samedi vingt heures, quatre personnes… c'est bon, j'ai une table en terrasse."],
      ['atlas', `Parfait. C'est au nom de Vancoppenolle. Merci beaucoup, bonne journée !`]], fin: 'Table réservée : 4 personnes, samedi à 20 h, en terrasse. Je l’ai mis dans ton agenda.' };
    return { lignes: [
      ['eux', 'Bonjour !'],
      ['atlas', `Bonjour, je suis Atlas, le robot personnel de ${prenom()} Vancoppenolle, une intelligence artificielle. J'appelle pour ${mission}.`],
      ['eux', "Très bien… Oui, c'est possible. Jeudi matin, ça lui irait ?"],
      ['atlas', "Jeudi matin, il est libre à partir de dix heures. Dix heures, c'est parfait ?"],
      ['eux', "Dix heures, c'est noté."],
      ['atlas', 'Merci beaucoup, je le mets dans son agenda. Bonne journée !']], fin: `C'est fait : ${mission}, jeudi à 10 h. Je l’ai mis dans ton agenda.` };
  }
  function voixEux(t) {
    return new Promise(res => {
      try {
        const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.05; u.pitch = 1.15;
        const v = speechSynthesis.getVoices().filter(x => /^fr/i.test(x.lang)); if (v.length) u.voice = v[v.length > 1 ? 1 : 0];
        u.onend = res; u.onerror = res; speechSynthesis.speak(u); setTimeout(res, 2500 + 70 * t.length);
      } catch (e) { setTimeout(res, 1200 + 50 * t.length); }
    });
  }
  async function appel(qui, mission) {
    if (!(await askYesNo(`J'appelle ${qui}, avec ma voix, en me présentant comme ton robot personnel, pour : ${mission}. J'appelle ?`))) return say("D'accord, je n'appelle pas.");
    const sc = scenario(mission), t0 = Date.now();
    if (/^(le |la |l['’])?(restaurant|resto)$/i.test(String(qui).trim()) && /table|r[ée]serv/i.test(mission)) qui = 'La Table de Paul';
    showBoard(`<div style="font-family:system-ui;width:min(92vw,560px);text-align:left">
<div style="display:flex;align-items:center;gap:12px"><div style="width:46px;height:46px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:22px">📞</div><div style="flex:1"><small style="letter-spacing:.3em;color:#86efac">APPEL EN COURS</small><div style="font:700 19px system-ui;color:#f1f5f9">${esc(qui)}</div></div><div id="demo-chrono" style="font:600 18px ui-monospace,monospace;color:#86efac">0:00</div></div>
<div style="display:flex;gap:3px;align-items:center;height:36px;margin:12px 0">${Array.from({ length: 40 }, (_, i) => `<span class="demo-onde" style="flex:1;height:20%;border-radius:2px;background:#22d3ee;opacity:.75;transition:height .12s" data-i="${i}"></span>`).join('')}</div>
<div id="demo-transcrit" style="display:flex;flex-direction:column;gap:7px;max-height:44vh;overflow:auto"></div>
<div style="margin-top:8px;font-size:11px;letter-spacing:.15em;color:#64748b">APERÇU — LES VRAIS APPELS PARTENT AVEC LE NUMÉRO D'ATLAS</div></div>`);
    const ch = document.getElementById('demo-chrono'), tr = document.getElementById('demo-transcrit');
    let parle = false;
    const anim = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000); if (ch) ch.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      document.querySelectorAll('.demo-onde').forEach(b => { b.style.height = `${parle ? 15 + Math.random() * 85 : 8 + Math.random() * 10}%`; });
    }, 120);
    try { fx.tone([[440, 0.4], [0, 0.2], [440, 0.4]]); } catch (e) { /* sans son */ }
    await attends(1800);
    for (const [qui_, t] of sc.lignes) {
      const el = document.createElement('div');
      el.style.cssText = `padding:8px 11px;border-radius:12px;font-size:15px;line-height:1.4;background:${qui_ === 'atlas' ? 'rgba(34,211,238,.10)' : 'rgba(255,255,255,.05)'};border-left:3px solid ${qui_ === 'atlas' ? '#22d3ee' : '#64748b'}`;
      el.innerHTML = `<small style="color:${qui_ === 'atlas' ? '#67e8f9' : '#94a3b8'};letter-spacing:.15em">${qui_ === 'atlas' ? 'ATLAS' : esc(qui.toUpperCase())}</small><div>${esc(t)}</div>`;
      tr.appendChild(el); tr.scrollTop = tr.scrollHeight;
      parle = true; if (qui_ === 'atlas') await say(t); else await voixEux(t); parle = false;
      await attends(300);
    }
    clearInterval(anim);
    const f = document.createElement('div'); f.style.cssText = 'margin-top:8px;padding:12px;border-radius:12px;background:rgba(74,222,128,.12);color:#bbf7d0;font-weight:700'; f.textContent = `✔ ${sc.fin}`; tr.appendChild(f);
    try { fx.ok(); } catch (e) { /* sans son */ }
    await say(sc.fin);
    await attends(2500); hideBoard();
  }

  function route(t, n) {
    if (/\b(fin du mode (tournage|demo|demonstration)|(arrete|quitte|coupe|sors du) (le )?mode (tournage|demo|demonstration)|repasse en mode normal)\b/.test(n) || (on && /^(coupez|coupe coupe)\b/.test(n))) {
      return async () => { regle(false); fx.ok(); return say("Coupé. Fin du mode tournage : je retrouve tes vraies données."); };
    }
    if (/\b(mode (tournage|demo|demonstration|video)|on tourne|moteur ca tourne|lance le mode (tournage|demo))\b/.test(n)) {
      return async () => { regle(true); fx.ok(); return say("Mode tournage. À l'écran, uniquement des données fictives ; rien ne part, ni mail, ni message. Dis « séquence de démarrage » pour l'ouverture, et « coupez » quand c'est fini."); };
    }
    if (!on) return null;
    if (/\b(remets? (la demo|tout) a zero|on la refait|nouvelle prise|on recommence la (demo|scene))\b/.test(n)) return async () => { D = fraiches(); fx.ok(); return say('Tout est remis à zéro. Prêt pour la prise suivante.'); };
    if (/\b(sequence de demarrage|demarre la sequence|lance la sequence|initialise toi|lance la demo|reveille toi)\b/.test(n)) return demarrage;
    if (/\b(et demain|quelle est la suite|c est quoi la suite|ton avenir|tu seras quoi demain|qu est ce que tu deviendras)\b/.test(n)) return demain;
    return null;
  }
  return { on: () => on, route, message, appel, demarrage, demain, regle };
})();

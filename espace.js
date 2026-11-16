/* ---------- l'espace bureau : un vrai poste de travail, plein écran (16/11) ----------
   À gauche, où regarder : aujourd'hui (le plan du jour), à traiter, les décisions, les documents, chaque projet, le journal, la revue.
   Au milieu, la liste. À droite, la chose ouverte, en grand : le mail et la réponse préparée (modifiable sur place),
   le document lu dans la page, la décision avec ses choix. Rien ne part sans son clic. Atlas écoute toujours (« ferme le bureau »). */
const ESPACE = (() => {
  const B = () => BUREAU._;
  const root = () => VOIXMAISON.root();
  let el = null, data = { a_valider: [] }, decs = [], plan = null, act = [], dos = null, revueR = null;
  let vue = 'traiter', sel = null, cherche = '', actGenre = 'tous', pdfs = {}, majT = 0, charge = false, retouches = {}; // retouches : ses corrections du mail, gardées tant qu'il n'a pas validé
  const ouvert = () => !!el && !el.hidden;
  const filtre = () => S.bureauFiltre || 'tout';
  const isoJ = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pro = x => B().estPro_(x) || B().projetDe(x) === 'sopam';
  const okFiltre = x => filtre() === 'tout' || (filtre() === 'pro') === pro(x);
  const decG = d => B().DEC_PROJET[d.projet] || 'outils';
  const okDec = d => filtre() === 'tout' || (filtre() === 'pro') === B().GROUPES[decG(d)].pro;
  const presse = x => x.urgence === 'haute' || (x.echeance && x.echeance < isoJ());
  const ordre = a => a.slice().sort((x, y) => presse(y) - presse(x) || (y.urgence === 'haute') - (x.urgence === 'haute') || String(x.echeance || '9').localeCompare(String(y.echeance || '9')));
  const cartes = () => (data.a_valider || []).filter(okFiltre);
  const lesDecs = () => decs.filter(okDec);
  const quand = at => { if (!at) return ''; const s = Date.now() / 1000 - at; return s < 3600 ? `il y a ${Math.max(1, Math.round(s / 60))} min` : s < 86400 ? `il y a ${Math.round(s / 3600)} h` : new Date(at * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); };
  const btn = (txt, act_, id = '', cls = '', extra = '') => `<button type="button" class="eb-btn ${cls}" data-eb="${act_}" data-id="${esc(id)}" ${extra}>${txt}</button>`;

  // ---------- les données : tout d'un coup, puis le bureau toutes les 90 s tant qu'il est ouvert ----------
  async function json(u, corps) { const r = await fetch(`${root()}${u}`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' }); return r.json(); }
  async function charger(r) {
    charge = true;
    const [b, d, p, a, o] = await Promise.allSettled([r ? Promise.resolve(r) : B().api(), B().decApi(), json('/maison/plan'), B().api({ action: 'activite' }), B().dossierCabinet()]);
    if (b.status === 'fulfilled' && b.value) data = b.value;
    decs = d.status === 'fulfilled' ? (d.value.a_prendre || []) : decs;
    plan = p.status === 'fulfilled' ? (p.value.plan || null) : plan;
    act = a.status === 'fulfilled' ? (a.value.activite || []) : act;
    dos = o.status === 'fulfilled' ? o.value : dos;
    charge = false;
  }

  // ---------- les vues ----------
  const VUES_HAUT = [['jour', '☀️', "Aujourd'hui"], ['traiter', '📥', 'À traiter'], ['urgent', '⏰', 'Urgent et en retard'], ['decisions', '🗳️', 'Décisions'], ['documents', '📄', 'Documents']];
  function planDuJour() { return plan && plan.date === isoJ() ? plan : null; }
  function documents() { // les documents de l'atelier (14 jours) : ceux à relire d'abord
    const vus = new Set(), l = [];
    (data.a_valider || []).filter(x => x.livrable && okFiltre(x)).forEach(x => { vus.add(x.id); l.push({ k: 'carte', id: x.id, x, doc: true }); });
    act.filter(e => e.genre === 'atelier' && e.carte && !vus.has(e.carte) && (filtre() === 'tout' || (filtre() === 'pro') === !!e.pro)).forEach(e => { vus.add(e.carte); l.push({ k: 'act', id: `a${e.at}${e.carte}`, x: e, doc: true }); });
    return l;
  }
  function journal() { return act.filter(e => (filtre() === 'tout' || (filtre() === 'pro') === !!e.pro) && (actGenre === 'tous' || e.genre === actGenre)).map(e => ({ k: 'act', id: `a${e.at}${e.carte || ''}${N(e.t).slice(0, 20)}`, x: e })); }
  function items(v = vue) {
    const C = cartes(), D = lesDecs();
    const asC = a => a.map(x => ({ k: 'carte', id: x.id, x, sec: presse(x) ? 'retard' : 'carte' })), asD = a => a.map(x => ({ k: 'dec', id: `d${x.id}`, x, sec: 'dec' }));
    let l = [];
    if (v === 'jour') l = planDuJour() ? (planDuJour().actions || []).map(a => ({ k: 'plan', id: `p${a.id}`, x: a })) : [];
    else if (v === 'traiter') { const o = ordre(C); l = [...asC(o.filter(presse)), ...asD(D), ...asC(o.filter(x => !presse(x)))]; }
    else if (v === 'urgent') l = asC(ordre(C.filter(presse)));
    else if (v === 'decisions') l = asD(D);
    else if (v === 'documents') l = documents();
    else if (v === 'journal') l = journal();
    else if (v.startsWith('p:')) { const g = v.slice(2); l = [...asD(D.filter(d => decG(d) === g)), ...asC(ordre(C.filter(x => B().projetDe(x) === g)))]; }
    if (cherche) { const q = N(cherche); l = l.filter(it => N(JSON.stringify(it.x)).includes(q)); }
    return l;
  }
  function compte(v) {
    if (v === 'jour') { const p = planDuJour(); return p ? (p.actions || []).filter(a => a.etat === 'a_faire').length : 0; }
    if (v === 'journal') return act.filter(e => new Date(e.at * 1000).toDateString() === new Date().toDateString()).length;
    if (v === 'documents') return documents().filter(it => it.k === 'carte').length;
    const l = items(v); return l.length;
  }

  // ---------- le dessin ----------
  function nav() {
    const lien = (v, ic, t, n, c = '') => `<button type="button" class="eb-nav-l${vue === v ? ' on' : ''}" data-eb="vue" data-id="${v}" ${c ? `style="--c:${c}"` : ''}><span class="eb-nav-ic">${ic}</span><span class="eb-nav-t">${t}</span>${n ? `<span class="eb-nb${v === 'urgent' ? ' rouge' : v === 'decisions' ? ' ambre' : ''}">${n}</span>` : ''}</button>`;
    const G = B().GROUPES;
    const projets = Object.keys(G).filter(g => filtre() === 'tout' || (filtre() === 'pro') === G[g].pro).map(g => [g, items(`p:${g}`).length]).filter(([, n]) => n);
    return `<nav class="eb-nav">
<div class="eb-nav-bloc">${VUES_HAUT.map(([v, ic, t]) => lien(v, ic, t, compte(v))).join('')}</div>
${projets.length ? `<div class="eb-nav-titre">Projets</div><div class="eb-nav-bloc">${projets.map(([g, n]) => lien(`p:${g}`, `<i class="eb-pt" style="background:${G[g].c}"></i>`, G[g].n, n, G[g].c)).join('')}</div>` : ''}
<div class="eb-nav-titre">Suivi</div><div class="eb-nav-bloc">${lien('journal', '📜', "Ce qu'a fait Atlas", compte('journal'))}${lien('revue', '📊', 'Revue de la semaine', '')}${dos && filtre() !== 'perso' ? `<button type="button" class="eb-nav-l" data-eb="dossier"><span class="eb-nav-ic">🧾</span><span class="eb-nav-t">Dossier du cabinet</span><span class="eb-nb ambre">!</span></button>` : ''}</div>
<div class="eb-nav-pied">${data.faits_semaine ? `<b>${data.faits_semaine}</b> validé${data.faits_semaine > 1 ? 's' : ''} cette semaine` : ''}${data.en_cours ? '<div class="eb-lit">● je lis tes mails…</div>' : ''}</div></nav>`;
  }
  function ligne(it) {
    const on = sel === it.id ? ' on' : '';
    if (it.k === 'carte') {
      const x = it.x, g = B().GROUPES[B().projetDe(x)], urg = presse(x);
      return `<div class="eb-row${on}${urg ? ' urg' : ''}" data-eb="sel" data-id="${esc(it.id)}" style="--c:${g.c}"><div class="eb-av" style="--c:${g.c}">${esc(B().initiales(x.de))}</div><div class="eb-row-c">
<div class="eb-row-1"><b>${esc(String(x.de || '').replace(/\s*<.*$/, ''))}</b><span>${esc(quand(x.cree_at))}</span></div>
<div class="eb-row-2">${esc(x.resume || x.sujet || '')}</div>
<div class="eb-row-3"><span class="eb-chip">${esc(B().TYPE[x.type] || x.type || '')}</span>${x.urgence === 'haute' ? '<span class="eb-chip rouge">urgent</span>' : ''}${x.echeance ? `<span class="eb-chip ${x.echeance < isoJ() ? 'rouge' : 'jaune'}">${x.echeance < isoJ() ? 'en retard · ' : ''}avant le ${esc(B().dateFr(x.echeance))}</span>` : ''}${x.livrable ? '<span class="eb-chip ambre">📄 document</span>' : ''}${B().avecTexte(x) ? '<span class="eb-chip bleu">✉ réponse prête</span>' : ''}</div></div></div>`;
    }
    if (it.k === 'dec') {
      const d = it.x, g = B().GROUPES[decG(d)];
      return `<div class="eb-row${on}" data-eb="sel" data-id="${esc(it.id)}" style="--c:#fcd34d"><div class="eb-av" style="--c:#fcd34d">?</div><div class="eb-row-c"><div class="eb-row-1"><b>Décision · ${esc(g.n)}</b><span>${esc(d.source || '')}</span></div><div class="eb-row-2">${esc(d.question)}</div><div class="eb-row-3"><span class="eb-chip jaune">★ ${esc(String((d.options || [])[0] || '').slice(0, 48))}</span></div></div></div>`;
    }
    if (it.k === 'plan') {
      const a = it.x, EM = { envoyer: '✉️', valider: '✅', decider: '🗳️', toi: '👤', lire: '📄' }, fini = a.etat !== 'a_faire';
      return `<div class="eb-row${on}${fini ? ' fini' : ''}" data-eb="sel" data-id="${esc(it.id)}" style="--c:#fcd34d"><div class="eb-av eb-av-ic">${EM[a.type] || '•'}</div><div class="eb-row-c"><div class="eb-row-1"><b>${esc(a.titre || '')}</b><span>${fini ? ({ fait: '✓ fait', plus_tard: '→ demain', non: '✕ non' })[a.etat] || '' : a.minutes ? `${a.minutes} min` : ''}</span></div>${a.pourquoi ? `<div class="eb-row-2">${esc(a.pourquoi)}</div>` : ''}</div></div>`;
    }
    const e = it.x, [ic, nomG] = B().GENRES_ACT[e.genre] || ['•', ''], { texte } = B().lisible(e.t, nomG);
    const COUL = { mails: '#a5b4fc', atelier: '#fcd34d', compta: '#fdba74', agenda: '#67e8f9', toi: '#86efac', plateforme: '#c4b5fd', bureau: '#94a3b8' };
    const ouvrable = e.carte || e.rapport || e.fichiers || e.dossier;
    return `<div class="eb-row${on}${ouvrable ? '' : ' plat'}" ${ouvrable ? `data-eb="sel" data-id="${esc(it.id)}"` : ''} style="--c:${COUL[e.genre] || '#94a3b8'}"><div class="eb-av eb-av-ic" style="--c:${COUL[e.genre] || '#94a3b8'}">${ic}</div><div class="eb-row-c"><div class="eb-row-1"><b>${esc(nomG)}</b><span>${new Date(e.at * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div><div class="eb-row-2">${esc(texte)}</div></div></div>`;
  }
  function titreVue() {
    const h = VUES_HAUT.find(([v]) => v === vue);
    if (h) return [h[1], h[2]];
    if (vue === 'journal') return ['📜', "Ce qu'a fait Atlas · 14 jours"];
    if (vue === 'revue') return ['📊', 'La revue de la semaine'];
    const g = B().GROUPES[vue.slice(2)]; return g ? [g.e, g.n] : ['', ''];
  }
  function liste() {
    const l = items(), [ic, t] = titreVue();
    let corps = '', jour = '', sec = '';
    const SEC = { retard: '⏰ En retard ou urgent', dec: '🗳️ Décisions à prendre', carte: '📥 À valider' };
    const avecSec = vue === 'traiter' || vue.startsWith('p:');
    l.forEach(it => {
      if (avecSec && it.sec && it.sec !== sec) { sec = it.sec; corps += `<div class="eb-jour${sec === 'retard' ? ' rouge' : ''}">${SEC[sec]} · ${l.filter(y => y.sec === sec).length}</div>`; }
      if (it.k === 'act' && vue === 'journal') { const d = new Date(it.x.at * 1000), j = d.toDateString() === new Date().toDateString() ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); if (j !== jour) { corps += `<div class="eb-jour">${esc(j)}</div>`; jour = j; } }
      corps += ligne(it);
    });
    const puces = vue === 'journal' ? `<div class="eb-puces">${[['tous', 'Tous'], ...Object.entries(B().GENRES_ACT).map(([k, [i_, t_]]) => [k, `${i_} ${t_}`])].filter(([k]) => k === 'tous' || act.some(e => e.genre === k)).map(([k, t_]) => `<button type="button" class="eb-puce${actGenre === k ? ' on' : ''}" data-eb="genre" data-id="${k}">${t_}</button>`).join('')}</div>` : '';
    const vide = vue === 'jour' ? (plan && plan.date !== isoJ() ? "Le plan d'aujourd'hui n'est pas encore prêt : il arrive vers 7 h 30." : "Pas de plan du jour pour l'instant.") : cherche ? 'Rien ne correspond à ta recherche.' : vue === 'traiter' ? '✓ Ton bureau est à jour : rien à traiter.' : 'Rien ici pour le moment.';
    return `<section class="eb-liste"><div class="eb-liste-t"><span>${ic}</span><b>${esc(t)}</b><small>${l.length}</small></div>${vue === 'jour' && planDuJour() && planDuJour().mot ? `<div class="eb-mot">${esc(planDuJour().mot)}</div>` : ''}${puces}<div class="eb-liste-c">${corps || `<div class="eb-vide">${vide}</div>`}</div></section>`;
  }
  function accueil() { // rien d'ouvert : le résumé de la journée
    const C = cartes(), p = planDuJour(), docs = documents().filter(it => it.k === 'carte').length;
    const reste = p ? (p.actions || []).filter(a => a.etat === 'a_faire') : [];
    const tuile = (n, t, v, c) => `<button type="button" class="eb-tuile" data-eb="vue" data-id="${v}" style="--c:${c}"><b>${n}</b><span>${t}</span></button>`;
    return `<div class="eb-accueil"><div class="eb-sur">${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h2>${reste.length ? `${reste.length} action${reste.length > 1 ? 's' : ''} dans ton plan du jour, environ ${reste.reduce((s, a) => s + (+a.minutes || 0), 0)} min.` : C.length ? 'Tout est préparé : tu vérifies, tu valides.' : 'Ton bureau est à jour. Va trader tranquille.'}</h2>
<div class="eb-tuiles">${tuile(reste.length, 'au plan du jour', 'jour', '#fcd34d')}${tuile(C.length, 'à traiter', 'traiter', '#60a5fa')}${tuile(C.filter(presse).length, 'urgent ou en retard', 'urgent', '#f87171')}${tuile(lesDecs().length, 'décisions', 'decisions', '#fcd34d')}${tuile(docs, 'documents à relire', 'documents', '#ffb547')}</div>
<p class="eb-aide">Touche une ligne pour l'ouvrir ici. Flèches ↑ ↓ pour passer d'une ligne à l'autre, Échap pour fermer. Tu peux aussi parler : « on valide le bureau », « ferme le bureau ».</p></div>`;
  }
  // un document de l'atelier : lu ICI (le PDF demandé par Atlas à l'ordinateur de la maison, puis affiché dans la page)
  function cadreDoc(idCarte, titre) {
    return `<div class="eb-doc" data-doc="${esc(idCarte)}"><div class="eb-doc-barre"><span>📄 ${esc(titre || 'Le document')}</span>${btn('⤢ En grand', 'grand', idCarte, 'fantome')}</div><div class="eb-doc-zone"><div class="eb-vide">J'ouvre le document…</div></div></div>`;
  }
  // les pages du PDF dessinées dans la page (pdf.js) : pareil sur l'ordi, la tablette et l'iPhone ; sinon le lecteur de l'appareil
  let pdfjs = null;
  function chargePdfjs() {
    if (pdfjs) return pdfjs;
    pdfjs = new Promise((ok, ko) => {
      if (window.pdfjsLib) return ok(window.pdfjsLib);
      const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); };
      sc.onerror = () => { pdfjs = null; ko(new Error('pdfjs')); }; document.head.appendChild(sc);
    });
    return pdfjs;
  }
  async function pages(zone, id) {
    const lib = await chargePdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await pdfs[id].blob.arrayBuffer()) }).promise;
    zone.innerHTML = `<div class="eb-pages"></div>`; const box = zone.firstChild;
    const bar = zone.closest('.eb-doc').querySelector('.eb-doc-barre span'); if (bar && !/pages/.test(bar.textContent)) bar.textContent += ` · ${doc.numPages} page${doc.numPages > 1 ? 's' : ''}`;
    for (let n = 1; n <= doc.numPages; n++) {
      if (!zone.isConnected) return;
      const pg = await doc.getPage(n), l = Math.max(320, box.clientWidth - 24), v1 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: l / v1.width * (window.devicePixelRatio || 1) });
      const c = document.createElement('canvas'); c.width = v.width; c.height = v.height; c.style.width = `${l}px`; box.appendChild(c);
      await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
    }
  }
  async function remplitDoc() {
    const z = el && el.querySelector('[data-doc]'); if (!z) return;
    const id = z.dataset.doc;
    try {
      if (!pdfs[id]) {
        const r = await fetch(`${root()}/maison/bureau/livrable?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const ty = r.headers.get('Content-Type') || '';
        if (!r.ok || !/pdf|word/.test(ty)) throw new Error('livrable');
        const bl = await r.blob(); pdfs[id] = { url: URL.createObjectURL(bl), blob: bl, pdf: /pdf/.test(ty) };
      }
      const zone = el.querySelector(`[data-doc="${CSS.escape(id)}"] .eb-doc-zone`); if (!zone) return;
      if (!pdfs[id].pdf) { zone.innerHTML = `<div class="eb-vide">C'est un document Word : ${btn('Le télécharger', 'grand', id, 'ambre')}</div>`; return; }
      try { await pages(zone, id); } catch (e) { zone.innerHTML = `<iframe src="${pdfs[id].url}#view=FitH" title="document"></iframe>`; }
    } catch (e) { const zone = z.querySelector('.eb-doc-zone'); if (zone) zone.innerHTML = '<div class="eb-vide">Je n\'arrive pas à ouvrir ce document (l\'ordinateur de la maison ne répond pas, ou le fichier a bougé).</div>'; }
  }
  function lectureCarte(x, lecture = false) {
    const g = B().GROUPES[B().projetDe(x)], adr = x.adresse || '', boite = x.entite === 'lrf' ? 'pro' : 'perso';
    const ST = { a_valider: 'à valider', brouillon: 'en brouillon dans Gmail', envoye: 'envoyé', fait: 'fait', tache: 'dans tes tâches', ignore: 'ignoré' };
    const actif = !lecture && (x.statut || 'a_valider') === 'a_valider';
    let h = `<div class="eb-lec-tete"><div class="eb-av gros" style="--c:${g.c}">${esc(B().initiales(x.de))}</div><div class="eb-lec-qui"><b>${esc(String(x.de || '').replace(/\s*<.*$/, ''))}</b><span>${esc(adr)}</span></div>
<div class="eb-lec-chips"><span class="eb-chip" style="background:${g.c}22;color:${g.c}">${g.e} ${esc(g.n)}</span><span class="eb-chip">${esc(B().TYPE[x.type] || x.type || '')}</span>${x.urgence === 'haute' ? '<span class="eb-chip rouge">urgent</span>' : ''}${x.echeance ? `<span class="eb-chip jaune">avant le ${esc(B().dateFr(x.echeance))}</span>` : ''}${!actif && x.statut ? `<span class="eb-chip vert">${esc(ST[x.statut] || x.statut)}${x.fait_par ? ` · ${esc(x.fait_par)}` : ''}</span>` : ''}</div></div>
<h2 class="eb-lec-titre">${esc(x.resume || x.sujet || '')}</h2>${x.sujet ? `<div class="eb-lec-objet">Objet : ${esc(x.sujet)}</div>` : ''}`;
    if (x.a_faire) h += `<div class="eb-bloc afaire"><h4>Ce qu'il faut faire</h4><p>${esc(x.a_faire)}</p></div>`;
    if (x.note) h += `<div class="eb-bloc alerte"><h4>Attention</h4><p>${esc(x.note)}</p></div>`;
    if (x.seul_toi) h += `<div class="eb-bloc toi"><h4>👤 Seulement toi</h4><p>${esc(x.seul_toi)}</p></div>`;
    if (x.document) h += `<div class="eb-bloc"><h4>Pièce demandée</h4><p>${esc(x.document)} — à joindre au brouillon dans Gmail.</p></div>`;
    if (x.pj && x.pj.length) h += `<div class="eb-bloc"><h4>Pièces jointes du mail</h4><p>${esc(x.pj.join(' · '))}</p></div>`;
    if (x.livrable && !B().avecTexte(x)) h += cadreDoc(x.id, x.livrable_titre);
    if (x.type === 'relancer' && !x.adresse && actif) h += `<div class="eb-bloc"><h4>L'adresse du client</h4><div class="eb-ligne-in"><input type="email" id="eb-adr" placeholder="adresse mail du client">${btn('Rédiger la relance', 'adresse', x.id, 'prim')}</div></div>`;
    if (B().avecTexte(x)) h += `<div class="eb-bloc mail"><h4>${actif ? 'La réponse préparée — modifiable ici' : 'La réponse'}${adr ? ` · à ${esc(adr)}` : ''}</h4><textarea id="eb-texte" data-carte="${esc(x.id)}" ${actif ? '' : 'readonly'} spellcheck="true">${esc(actif && retouches[x.id] != null ? retouches[x.id] : x.brouillon_texte)}</textarea>
${actif ? `<div class="eb-ligne-in"><input type="text" id="eb-consigne" placeholder="Ou dis à Atlas quoi changer : « plus court », « propose jeudi 14 h »…">${btn('↻ Réécrire', 'modifie', x.id)}</div>` : ''}</div>`;
    if (x.livrable && B().avecTexte(x)) h += cadreDoc(x.id, x.livrable_titre); // le mail d'abord, le document dessous
    if (actif) {
      const doc = x.livrable && !B().avecTexte(x);
      const princ = B().avecTexte(x) ? (adr ? btn(`✉ Envoyer à ${esc(adr.split('@')[0])}`, 'envoie', x.id, 'prim') : '') + btn(`📝 Brouillon (boîte ${boite})`, 'valide', x.id, 'vert')
        : doc ? btn("✓ Relu, c'est bon", 'fait', x.id, 'vert') + btn('📌 À relire plus tard (tâches)', 'valide', x.id) : btn('✓ Dans mes tâches', 'valide', x.id, 'vert');
      h += `<div class="eb-actions">${princ}<span class="eb-espace"></span>${doc ? '' : btn('✓ Déjà fait', 'fait', x.id, 'fantome')}${btn('✗ Ignorer', 'ignore', x.id, 'fantome')}</div>`;
    }
    return h;
  }
  function lectureDec(d) {
    const g = B().GROUPES[decG(d)];
    return `<div class="eb-lec-tete"><div class="eb-av gros" style="--c:#fcd34d">?</div><div class="eb-lec-qui"><b>Une décision à prendre</b><span>${esc(g.n)}${d.source ? ` · ${esc(d.source)}` : ''}</span></div></div>
<h2 class="eb-lec-titre">${esc(d.question)}</h2>
${d.contexte ? `<div class="eb-bloc"><h4>Le contexte</h4><p class="pre">${esc(d.contexte)}</p></div>` : ''}
<div class="eb-bloc"><h4>Ton choix</h4><div class="eb-choix">${(d.options || []).map((o, i) => `<button type="button" class="eb-opt${i === 0 ? ' reco' : ''}" data-eb="decide" data-id="${esc(d.id)}" data-opt="${i}">${i === 0 ? '<small>★ recommandé</small>' : ''}${esc(o)}</button>`).join('')}</div>
<div class="eb-ligne-in"><input type="text" id="eb-libre" placeholder="Ou ta propre réponse…">${btn('Répondre', 'decide-libre', d.id)}</div></div>`;
  }
  function lecturePlan(a) {
    const fini = a.etat !== 'a_faire';
    let h = `<div class="eb-lec-tete"><div class="eb-av gros eb-av-ic">${({ envoyer: '✉️', valider: '✅', decider: '🗳️', toi: '👤', lire: '📄' })[a.type] || '•'}</div><div class="eb-lec-qui"><b>Plan du jour</b><span>${a.minutes ? `${a.minutes} min` : ''}${fini ? ` · ${({ fait: 'fait', plus_tard: 'reporté à demain', non: 'non' })[a.etat] || ''}` : ''}</span></div></div><h2 class="eb-lec-titre">${esc(a.titre || '')}</h2>`;
    if (a.pourquoi) h += `<div class="eb-bloc"><h4>Pourquoi</h4><p>${esc(a.pourquoi)}</p></div>`;
    if (a.etapes && a.etapes.length) h += `<div class="eb-bloc"><h4>Les étapes</h4><ol>${a.etapes.map(e => `<li>${esc(e)}</li>`).join('')}</ol></div>`;
    if (a.type === 'envoyer' && a.apercu) h += `<div class="eb-bloc mail"><h4>Le mail · à ${esc(a.apercu.a)}</h4><p class="pre">${esc(a.apercu.texte)}</p></div>`;
    const carte = a.carte && (data.a_valider || []).find(x => x.id === a.carte);
    if (carte && carte.livrable) h += cadreDoc(carte.id, carte.livrable_titre);
    if (!fini) {
      const b = a.type === 'decider' ? (a.options || []).map((o, k) => btn(`${k === 0 ? '★ ' : ''}${esc(String(o).slice(0, 70))}`, 'plan', a.id, k === 0 ? 'vert' : '', `data-rep="choix:${k}"`)).join('')
        : btn(a.type === 'envoyer' ? '✉ Oui, envoie' : a.type === 'toi' ? "✓ C'est fait" : '✓ Oui', 'plan', a.id, a.type === 'envoyer' ? 'prim' : 'vert', 'data-rep="oui"');
      h += `<div class="eb-actions">${b}<span class="eb-espace"></span>${btn('→ Plus tard', 'plan', a.id, 'fantome', 'data-rep="plus_tard"')}${btn('✕ Non', 'plan', a.id, 'fantome', 'data-rep="non"')}</div>`;
    }
    return h;
  }
  async function lectureAct(e) {
    const [ic, nomG] = B().GENRES_ACT[e.genre] || ['•', ''];
    const tete = `<div class="eb-sur">${ic} ${esc(nomG)} · ${esc(new Date(e.at * 1000).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</div>`;
    if (e.dossier) return `${tete}<h2 class="eb-lec-titre">${esc(B().lisible(e.t, '').texte)}</h2><div class="eb-actions">${btn('🧾 Ouvrir le dossier du cabinet', 'dossier', '', 'ambre')}</div>`;
    let r; try { r = await B().api(Object.assign({ action: 'detail' }, e.carte ? { carte: e.carte } : e.rapport ? { rapport: e.rapport } : { fichiers: e.fichiers })); } catch (err) { return `${tete}<div class="eb-vide">L'ordinateur de la maison ne répond pas.</div>`; }
    if (!r.ok) return `${tete}<h2 class="eb-lec-titre">${esc(B().lisible(e.t, '').texte)}</h2><div class="eb-vide">${esc(r.raison || 'rien à montrer')}</div>`;
    if (r.carte) { const vivante = (data.a_valider || []).find(x => x.id === r.carte.id); return tete + lectureCarte(vivante || r.carte, !vivante); }
    if (r.texte) return `${tete}<h2 class="eb-lec-titre">${esc(B().lisible(e.t, '').texte)}</h2><div class="eb-bloc">${B().mdLisible(r.texte)}</div>`;
    if (r.fichiers) return `${tete}<h2 class="eb-lec-titre">${esc(B().lisible(e.t, '').texte)}</h2><div class="eb-bloc"><h4>Les factures déposées</h4>${r.fichiers.map(f => f.ok ? `<button type="button" class="eb-fic" data-eb="piece" data-id="${esc(f.nom)}">🧾 ${esc(f.nom)} <span>›</span></button>` : `<div class="eb-fic off">🧾 ${esc(f.nom)} (plus sur l'ordinateur)</div>`).join('')}</div>`;
    return tete;
  }
  async function lecture() {
    const z = el.querySelector('.eb-lecture'); if (!z) return;
    if (vue === 'revue') {
      z.innerHTML = '<div class="eb-vide">Je prépare la revue…</div>';
      try { revueR = await (await fetch(`${root()}/maison/revue`, { cache: 'no-store' })).json(); z.innerHTML = `<div class="eb-revue">${B().revueHtml(revueR, false)}</div>`; } catch (e) { z.innerHTML = '<div class="eb-vide">L\'ordinateur de la maison ne répond pas.</div>'; }
      return;
    }
    const it = items().find(i => i.id === sel);
    if (!it) { z.innerHTML = accueil(); return; }
    const retour = `<button type="button" class="eb-retour" data-eb="retour">← ${esc(titreVue()[1])}</button>`;
    let h = '';
    if (it.k === 'carte') h = lectureCarte(it.x);
    else if (it.k === 'dec') h = lectureDec(it.x);
    else if (it.k === 'plan') h = lecturePlan(it.x);
    else { z.innerHTML = `${retour}<div class="eb-vide">J'ouvre…</div>`; h = await lectureAct(it.x); if (sel !== it.id) return; }
    z.innerHTML = `${retour}<div class="eb-lec">${h}</div>`; z.scrollTop = 0;
    remplitDoc();
  }
  function dessine() {
    if (!el) return;
    const f = filtre(), C = data.a_valider || [], nPro = C.filter(pro).length;
    const seg = (k, t) => `<button type="button" class="${f === k ? 'on ' + k : ''}" data-eb="filtre" data-id="${k}">${t}</button>`;
    const garde = document.activeElement && el.contains(document.activeElement) && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName) ? document.activeElement.id : '';
    const valeurs = {}; el.querySelectorAll('textarea[id],input[id]').forEach(i => { valeurs[i.id] = i.value; });
    el.className = `eb${vue === 'revue' ? ' large' : ''}${sel ? ' lit' : ''}`;
    el.innerHTML = `<header class="eb-haut"><div class="eb-marque"><span>ATLAS</span><b>Mon bureau</b></div>
<div class="eb-seg">${seg('tout', `Tout · ${C.length}`)}${seg('pro', `Pro · ${nPro}`)}${seg('perso', `Perso · ${C.length - nPro}`)}</div>
<label class="eb-cherche"><span>⌕</span><input type="search" id="eb-q" placeholder="Chercher un nom, un sujet…" value="${esc(cherche)}"></label>
<div class="eb-haut-d">${btn('🎙 Valider à la voix', 'voix', '', 'fantome')}${btn('↻', 'maj', '', 'fantome', 'title="Relire mes mails maintenant"')}<button type="button" class="eb-fermer" data-eb="ferme" title="Fermer (Échap)">✕</button></div></header>
<div class="eb-corps">${nav()}${vue === 'revue' ? '' : liste()}<main class="eb-lecture"></main></div>`;
    Object.entries(valeurs).forEach(([k, v]) => { const i = el.querySelector(`#${k}`); if (i && k !== 'eb-texte') i.value = v; });
    if (garde) { const i = el.querySelector(`#${garde}`); if (i) { i.focus(); if (i.setSelectionRange && i.type !== 'email') try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* rien */ } } }
    const r = el.querySelector('.eb-row.on'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
    lecture();
  }

  // ---------- ouvrir, fermer ----------
  async function ouvre(v, r) {
    if (!el) { el = document.createElement('div'); el.id = 'espace-bureau'; document.body.appendChild(el); el.addEventListener('click', clic); el.addEventListener('input', saisie); }
    if (v) { vue = v; sel = null; } else if (!ouvert()) { vue = S.espaceVue || 'traiter'; sel = null; }
    S.espaceVue = vue; save();
    el.hidden = false; document.body.classList.add('eb-ouvert');
    if (typeof hideBoard === 'function' && !$('#board').hidden) hideBoard();
    if (!el.innerHTML) el.innerHTML = '<div class="eb-vide" style="padding-top:40vh">J\'ouvre ton bureau…</div>';
    await charger(r);
    if (!sel && window.innerWidth >= 900) { const l = items(); if (l.length && vue !== 'journal' && vue !== 'revue') sel = l[0].id; }
    dessine();
    clearInterval(majT); majT = setInterval(rafraichit, 90000);
  }
  function ferme() {
    if (!el) return; el.hidden = true; document.body.classList.remove('eb-ouvert'); clearInterval(majT);
    Object.values(pdfs).forEach(p => URL.revokeObjectURL(p.url)); pdfs = {};
  }
  async function rafraichit() {
    if (!ouvert() || charge) return;
    const a = document.activeElement; if (a && el.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName) && a.value) return; // il écrit : on ne touche à rien
    await charger(); dessine();
  }
  function suivant(apres) { // après une action : la ligne d'après (comme une boîte de réception)
    const l = items(), i = apres >= 0 ? Math.min(apres, l.length - 1) : -1;
    sel = i >= 0 && l[i] ? l[i].id : null;
  }
  const saisie = ev => { if (ev.target.id === 'eb-texte' && ev.target.dataset.carte) retouches[ev.target.dataset.carte] = ev.target.value; if (ev.target.id === 'eb-q') { cherche = ev.target.value; const z = el.querySelector('.eb-liste'); if (z) { z.outerHTML = liste(); } } };

  // ---------- les clics ----------
  async function clic(ev) {
    const b = ev.target.closest('[data-eb]'); if (!b) return;
    const a = b.dataset.eb, id = b.dataset.id || '';
    if (a === 'ferme') return ferme();
    if (a === 'vue') { vue = id; sel = null; S.espaceVue = vue; save(); if (window.innerWidth >= 900 && vue !== 'journal') { const l = items(); if (l.length) sel = l[0].id; } return dessine(); }
    if (a === 'sel') { sel = id; el.querySelectorAll('.eb-row.on').forEach(r => r.classList.remove('on')); b.classList.add('on'); el.classList.add('lit'); return lecture(); }
    if (a === 'retour') { sel = null; el.classList.remove('lit'); return dessine(); }
    if (a === 'filtre') { S.bureauFiltre = id; save(); sel = null; return dessine(); }
    if (a === 'genre') { actGenre = id; sel = null; return dessine(); }
    if (a === 'maj') { try { await B().api({ action: 'tour' }); } catch (e) { return toast("L'ordinateur de la maison ne répond pas"); } toast('Je relis tes mails : les nouveautés arrivent dans quelques minutes'); return; }
    if (a === 'voix') { await BUREAU.valideVoix(); if (ouvert()) { await charger(); dessine(); } return; }
    if (a === 'dossier') return typeof COMPTA !== 'undefined' && COMPTA.dossier ? COMPTA.dossier() : null;
    if (a === 'piece') { const w = window.open('', '_blank'); return B().ouvrePdf(`${root()}/maison/bureau/piece?nom=${encodeURIComponent(id)}`, id, w); }
    if (a === 'grand') { const p = pdfs[id]; if (p) { const w = window.open(p.url, '_blank'); if (!w) { const l = document.createElement('a'); l.href = p.url; l.download = 'document'; document.body.appendChild(l); l.click(); l.remove(); } } return; }
    const pos = items().findIndex(i => i.id === sel);
    if (a === 'decide' || a === 'decide-libre') {
      const d = decs.find(y => y.id === id); if (!d) return;
      const rep = a === 'decide' ? (d.options || [])[+b.dataset.opt] : (el.querySelector('#eb-libre') || {}).value;
      if (!rep || !rep.trim()) return toast('Écris ta réponse d’abord');
      b.disabled = true;
      try { await B().decApi({ action: 'repond', id, reponse: rep.trim() }); } catch (e) { b.disabled = false; return toast("L'ordinateur de la maison ne répond pas"); }
      fx.ok(); toast(`Noté : ${rep.trim().slice(0, 60)}`);
      decs = decs.filter(y => y.id !== id); suivant(pos); return dessine();
    }
    if (a === 'plan') {
      const ac = (plan.actions || []).find(x => x.id === id); if (!ac) return;
      const rep = b.dataset.rep, corps = { action: 'repond', id };
      if (rep.startsWith('choix:')) { corps.reponse = 'oui'; corps.choix = (ac.options || [])[+rep.split(':')[1]]; } else corps.reponse = rep;
      b.disabled = true;
      let r; try { r = await json('/maison/plan', corps); } catch (e) { b.disabled = false; return toast("L'ordinateur de la maison ne répond pas"); }
      if (!r.ok) { b.disabled = false; return toast(r.raison ? `Ça n'a pas marché : ${r.raison}` : "Ça n'a pas marché"); }
      plan = r.plan; fx.ok(); toast(r.fait === 'envoyé' ? 'Envoyé' : rep === 'plus_tard' ? 'Reporté à demain' : 'Noté');
      await charger(); const l = items(), k = l.findIndex((x, j) => j > pos && x.x.etat === 'a_faire'); sel = k >= 0 ? l[k].id : sel; return dessine();
    }
    // une carte du bureau : envoyer, ranger en brouillon, dans mes tâches, réécrire, déjà fait, ignorer
    const x = (data.a_valider || []).find(y => y.id === id); if (!x) return;
    const corps = { action: a, id }, ta = el.querySelector('#eb-texte');
    const texte = ta && ta.value.trim() && ta.value.trim() !== String(x.brouillon_texte || '').trim() ? ta.value.trim() : '';
    if (texte && (a === 'envoie' || a === 'valide')) corps.texte = texte;
    if (a === 'envoie') { if (!x.adresse) return toast("Je n'ai pas l'adresse du destinataire"); corps.a = x.adresse; }
    if (a === 'adresse') { corps.adresse = ((el.querySelector('#eb-adr') || {}).value || '').trim(); if (!corps.adresse) return toast("Tape d'abord l'adresse mail du client"); }
    if (a === 'modifie') { corps.consigne = ((el.querySelector('#eb-consigne') || {}).value || '').trim(); if (!corps.consigne) return toast('Écris ce qu’il faut changer'); }
    const lent = a === 'modifie' || a === 'adresse';
    b.disabled = true; const avant = b.innerHTML; b.innerHTML = lent ? 'J’écris…' : '…';
    let r; try { r = await B().api(corps); } catch (e) { b.disabled = false; b.innerHTML = avant; return toast("L'ordinateur de la maison ne répond pas"); }
    if (r.ok === false) { b.disabled = false; b.innerHTML = avant; return toast(`Je n'ai pas pu : ${r.raison || 'erreur'}`); }
    data = r; fx.ok(); if (a === 'modifie') delete retouches[id];
    if (lent) { toast(a === 'modifie' ? 'Nouvelle version, à relire' : 'Relance rédigée, à relire'); return dessine(); }
    toast(a === 'envoie' ? `Parti, à ${x.adresse}` : a === 'valide' ? (r.fait === 'brouillon' ? `Dans les brouillons de ta boîte ${x.entite === 'lrf' ? 'pro' : 'perso'}` : 'Dans tes tâches, avec la date') : a === 'fait' ? (x.livrable && !B().avecTexte(x) ? 'Relu : rangé' : 'Marqué comme fait') : 'Ignoré');
    delete retouches[id]; suivant(pos); dessine();
  }
  // le clavier : ↑ ↓ pour passer d'une ligne à l'autre, Échap pour fermer (pas pendant qu'il écrit)
  document.addEventListener('keydown', ev => {
    if (!ouvert()) return;
    const t = ev.target, ecrit = t && /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName);
    if (ev.key === 'Escape') { if (ecrit) { t.blur(); return; } if (!$('#board').hidden) return; ev.preventDefault(); return ferme(); }
    if (ecrit || !/^(ArrowDown|ArrowUp|j|k)$/.test(ev.key)) return;
    const l = items(); if (!l.length) return;
    let i = l.findIndex(x => x.id === sel); i = /ArrowDown|j/.test(ev.key) ? Math.min(l.length - 1, i + 1) : Math.max(0, i - 1);
    ev.preventDefault(); sel = l[i].id; dessine();
  });
  return { ouvre, ferme, ouvert };
})();

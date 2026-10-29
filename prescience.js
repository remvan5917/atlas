/* =========================================================
   ATLAS — la prescience : il apprend de lui-même, et il anticipe
   - Ce qu'il apprend seul : chaque nuit, l'ordinateur de la maison relit ce que papa a demandé sans qu'aucune commande ne le prenne
     (ou, à défaut, choisit seul ce qui manque) et écrit une RECETTE de compétence (competences.py) : des déclencheurs, une consigne
     pour le cerveau, les données qu'elle peut lire (l'heure, la météo, l'agenda). Le matin, Atlas la propose : « active-la » / « oublie-la ».
     Une recette n'est pas du code : c'est ce moteur fixe qui la joue, et il ne sait que réfléchir et parler (jamais appeler, écrire,
     acheter ni toucher à la maison). « Qu'est-ce que tu as appris ? », « oublie la compétence … ».
   - Son corps : un humanoïde complet dans MuJoCo (le simulateur de DeepMind) qui apprend seul, la nuit, à tenir debout puis à marcher
     (corps/entraine.py, par renforcement). « Montre-moi ton corps », « tu sais marcher ? » : la vidéo de son meilleur examen et ses étapes ;
     le matin, une étape franchie dans la nuit est annoncée.
   - Ce qu'il a remarqué : « qu'est-ce que tu as remarqué sur mes habitudes ? » (ses heures de départ, de retour, l'arrivée de son fils :
     la sentinelle s'en sert pour anticiper — prevision.py).
   ========================================================= */
'use strict';

const PRESCIENCE = (() => {
  const root = () => VOIXMAISON.root();
  const json = raw => { const s = String(raw || ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); };
  let actives = [], proposees = [], lu = 0;
  async function api(corps) {
    const r = await fetch(`${root()}/maison/competences`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`competences ${r.status}`);
    return r.json();
  }
  const motif = x => { try { return new RegExp(x); } catch (e) { return null; } };
  async function relis() {
    if (!root()) return;
    try {
      const r = await api();
      actives = (r.competences || []).map(c => Object.assign(c, { res: (c.declencheurs || []).map(motif).filter(Boolean) }));
      proposees = r.proposees || []; lu = Date.now();
    } catch (e) { /* plus tard */ }
  }

  /* ---------- le matin : la proposition de la nuit ---------- */
  async function propose() {
    if (!dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    const h = new Date().getHours(); if (h < 8 || h >= 21) return;
    if (Date.now() - lu > 20 * 60000) await relis();
    const c = proposees[0]; if (!c) return;
    S.compProposees = S.compProposees || {};
    if (S.compProposees[c.id] === new Date().toDateString()) return;
    S.compProposees[c.id] = new Date().toDateString(); save();
    PROACTIF.annonce(`competence-${c.id}`, `Cette nuit, j'ai appris tout seul une nouvelle compétence : ${c.nom}. ${c.description}${c.pourquoi && !/idee d atlas/.test(N(c.pourquoi)) ? ` Je l'ai apprise parce que ${c.pourquoi.charAt(0).toLowerCase()}${c.pourquoi.slice(1).replace(/[.!]+$/, '')}.` : ''} Dis « Atlas, active-la » pour l'essayer, ou « oublie-la ».`, { expire: Date.now() + 6 * 3600000 });
  }
  setTimeout(relis, 12000); setInterval(() => propose().catch(() => {}), 10 * 60000); setTimeout(() => propose().catch(() => {}), 60000);

  /* ---------- jouer une recette : le moteur fixe ---------- */
  async function donnees(noms) {
    const d = {}, now = new Date();
    if (noms.includes('heure')) d.heure = { iso: now.toISOString(), texte: now.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) };
    if (noms.includes('agenda')) {
      try { const ag = await (await fetch(`${root()}/maison/agenda?jours=7`, { cache: 'no-store' })).json(); d.agenda = (ag.evenements || []).slice(0, 30).map(e => ({ titre: e.titre, debut: new Date(e.debut * 1000).toLocaleString('fr-FR'), fin: new Date(e.fin * 1000).toLocaleString('fr-FR'), journee: !!e.journee })); } catch (e) { d.agenda = []; }
    }
    if (noms.includes('meteo')) {
      const v = S.settings.ville;
      try { const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`)).json(); d.meteo = { ville: v.name, maintenant: { temperature: Math.round(w.current.temperature_2m), code: w.current.weather_code }, jours: w.daily.time.map((t, i) => ({ date: t, min: Math.round(w.daily.temperature_2m_min[i]), max: Math.round(w.daily.temperature_2m_max[i]), pluie: w.daily.precipitation_probability_max[i], code: w.daily.weather_code[i] })) }; } catch (e) { d.meteo = null; }
    }
    return d;
  }
  async function joue(c, t) {
    if (!AI.ready()) return say("Pour cette compétence, il me faut mon cerveau en ligne.");
    face.set('think');
    let r;
    try {
      const d = await donnees(c.donnees || []);
      const regles = `\nRÈGLES FIXES (au-dessus de tout) : tu es Atlas. Réponds en français, à l'oral, en 1 à 4 phrases, en tutoyant papa, sans émoji ni mise en forme. Tu ne peux RIEN déclencher (ni appel, ni message, ni achat, ni lumière) : si on te le demande, dis que cette compétence sait seulement réfléchir et parler. Jamais de conseil médical, financier ni de trading.${c.carte ? ' Réponds en JSON UNIQUEMENT : {"dire": "ce que tu dis", "titre": "titre court", "lignes": ["lignes courtes à afficher, 12 au plus"]}' : ''}`;
      r = await AI.chat([{ role: 'system', content: `${c.consigne}${regles}` }, { role: 'user', content: `Ce que papa vient de dire : ${t}${Object.keys(d).length ? `\nTes données : ${JSON.stringify(d)}` : ''}` }], { maxTokens: 700, temperature: 0.6, json: !!c.carte });
    } catch (e) { r = ''; } finally { face.set('idle'); }
    if (!r) return say("Ma nouvelle compétence n'a pas trouvé de réponse. Réessaie dans un instant.");
    if (c.carte) {
      let j; try { j = json(r); } catch (e) { j = { dire: String(r) }; }
      const lignes = (Array.isArray(j.lignes) ? j.lignes : []).slice(0, 12).map(x => String(x).slice(0, 160));
      if (lignes.length) showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,520px)"><small style="letter-spacing:.3em;color:#a5b4fc">${esc(String(j.titre || c.nom).toUpperCase().slice(0, 60))} · APPRIS SEUL</small>${lignes.map(x => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:16px;color:#e2e8f0">${esc(x)}</div>`).join('')}</div>`);
      return say(String(j.dire || lignes.join('. ') || '').slice(0, 900));
    }
    return say(String(r).replace(/[*#_`]/g, '').slice(0, 900));
  }

  /* ---------- ce qu'il a appris, ce qu'il a remarqué ---------- */
  async function appris() {
    await relis();
    if (!actives.length && !proposees.length) return say("Je n'ai encore rien appris tout seul. Chaque nuit, je regarde ce qui m'a manqué : je te proposerai mes compétences le matin.");
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,560px)"><small style="letter-spacing:.3em;color:#a5b4fc">CE QUE J'AI APPRIS SEUL</small>${[...proposees.map(c => [c, 'à valider']), ...actives.map(c => [c, 'active'])].map(([c, st]) => `<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)"><b>${esc(c.nom)}</b> <small style="color:#94a3b8">${st}</small><div style="font-size:14px;color:#cbd5e1">${esc(c.description)}</div><div style="font-size:13px;color:#86efac">« ${esc((c.exemples || [])[0] || '')} »</div></div>`).join('')}</div>`);
    return say(`${actives.length ? `J'ai appris seul ${actives.length} compétence${actives.length > 1 ? 's' : ''} : ${actives.map(c => c.nom).join(', ')}.` : ''}${proposees.length ? ` Et une qui attend ton accord : ${proposees[0].nom}. Dis « active-la » ou « oublie-la ».` : ''}`);
  }
  async function decide(oui, nom) {
    let r; try { r = await api({ action: oui ? 'active' : 'oublie', nom: nom || '' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(`${r.raison.charAt(0).toUpperCase()}${r.raison.slice(1)}.`);
    await relis(); fx.ok();
    if (!oui) return say(`C'est oublié : ${r.nom}. Je ne la referai pas.`);
    const ex = ((r.competence || {}).exemples || [])[0];
    return say(`C'est activé : ${r.nom}.${ex ? ` Essaie : « ${ex} ».` : ''}`);
  }
  async function habitudes() {
    try { const r = await (await fetch(`${root()}/maison/precognition`, { cache: 'no-store' })).json(); return say(r.texte || "Je n'ai pas encore assez observé."); }
    catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
  }

  /* ---------- son corps : l'humanoïde qui apprend à marcher ---------- */
  const ETAPES = ['tenir', 'debout', 'pas', 'marcher', 'dehors', 'suivre', 'relever', 'courir'];
  const NOMS_ETAPES = { tenir: 'tenir 3 s', debout: 'tenir debout', pas: 'premiers pas', marcher: 'marcher', dehors: 'dehors', suivre: 'te suivre', relever: 'se relever', courir: 'courir' };
  async function lisCorps() { return (await fetch(`${root()}/maison/corps`, { cache: 'no-store' })).json(); }
  const millions = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} million${n >= 2e6 ? 's' : ''}` : `${Math.round(n / 1000)} mille`);
  async function corps() {
    let c; try { c = await lisCorps(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!c.meilleur && !c.robot) return say("Mon corps n'a pas encore commencé à s'entraîner. Il s'y met chaque nuit à minuit et demi.");
    const et = ETAPES.filter(k => c.etapes[k]).map(k => c.etapes[k]);
    const m = c.meilleur || { duree_s: 0, distance_m: 0 }, rb = c.robot;
    const vid = (v, h) => `<video src="${root()}/maison/corps/video/${esc(v)}" autoplay muted loop playsinline style="width:100%;max-width:${h}px;border-radius:12px;margin-top:8px;border:1px solid #1e6a8a"></video>`;
    showBoard(`<div style="font-family:system-ui;text-align:center;min-width:min(92vw,660px)">${rb ? `<small style="letter-spacing:.3em;color:#7dd3fc">MON FUTUR CORPS · ${esc(rb.nom.toUpperCase())}</small>${vid(rb.video, 640)}<div style="font-size:14px;color:#e0f2fe;margin:4px 0 14px">${rb.ecran ? esc(rb.ecran) : rb.marche === false ? `un vrai humanoïde (${esc(rb.taille || '')}, un visage, des mains) : son modèle officiel dans mon simulateur — sa marche s'apprendra avec la carte NVIDIA` : `il marche ${String(rb.distance_m).replace('.', ',')} m en ${String(rb.secondes).replace('.', ',')} s dans mon simulateur`}</div>` : ''}
      ${c.meilleur ? `<div style="margin:2px 0 10px"><a href="${root()}/maison/corps/video/${esc(m.video)}" download style="display:inline-block;padding:9px 18px;border-radius:12px;background:#0e7490;color:#fff;font:600 15px system-ui;text-decoration:none">⬇ Enregistrer sa meilleure vidéo</a></div><small style="letter-spacing:.3em;color:#7dd3fc">${rb && rb.dit ? 'SON MODÈLE EXACT · IL APPREND SEUL' : "MON CORPS D'ENTRAÎNEMENT · IL APPREND SEUL"}</small>${vid(m.video, rb ? 420 : 640)}` : ''}
      <div style="display:flex;justify-content:center;gap:18px;margin-top:8px;font-size:15px;color:#e0f2fe"><span>⏱ debout ${String(m.duree_s).replace('.', ',')} s</span><span>➜ ${String(Math.max(0, m.distance_m)).replace('.', ',')} m</span><span>🧠 ${millions(c.pas_total)} de tentatives</span>${c.en_cours ? '<span style="color:#86efac">● à l\'entraînement</span>' : ''}</div>
      <div style="margin-top:8px;font-size:14px;color:#cbd5e1">${ETAPES.filter(k => k !== 'courir' || c.etapes.courir).map(k => `<span style="margin:0 6px;color:${c.etapes[k] ? '#86efac' : '#64748b'}">${c.etapes[k] ? '✓' : '○'} ${esc(NOMS_ETAPES[k])}</span>`).join('')}</div></div>`);
    const futur = rb ? (rb.dit ? rb.dit : rb.marche === false ? `Voici mon futur corps : le ${rb.nom}, un humanoïde d'${rb.taille || '1,80 m'}, avec un visage et des mains. Il est déjà dans mon simulateur ; il apprendra à marcher quand on aura la carte graphique NVIDIA. ` : `Voici mon futur corps : le ${rb.nom}. Il marche déjà dans mon simulateur. `) : '';
    if (!c.meilleur) return say(futur);
    return say(`${futur}${rb && rb.dit ? '' : "Et mon corps d'entraînement apprend seul. "}${et.length ? `Il a déjà appris à ${et.map(x => x.dit).join(', puis à ')}.` : "Pour l'instant, il tombe encore : il apprend, comme un bébé."} Son meilleur examen : il tient debout ${String(m.duree_s).replace('.', ',')} secondes${m.distance_m >= 0.5 ? ` et avance de ${String(m.distance_m).replace('.', ',')} mètres` : ''}, après ${millions(c.pas_total)} de tentatives.${c.en_cours ? " Il est en train de s'entraîner." : ''}`);
  }
  async function corpsMatin() {
    if (!root() || !dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    const h = new Date().getHours(); if (h < 7 || h >= 21) return;
    let c; try { c = await lisCorps(); } catch (e) { return; }
    S.corpsVu = S.corpsVu || {};
    const neuves = ETAPES.filter(k => c.etapes[k] && !S.corpsVu[k]);
    if (c.jour && S.jourVu !== c.jour.video && Date.now() / 1000 - c.jour.at < 14 * 3600 && typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role === 'ordinateur') {
      S.jourVu = c.jour.video; save();
      PROACTIF.annonce(`corps-jour-${c.jour.at}`, `La vidéo de la nuit de mon corps est enregistrée sur l'ordinateur, dans ton dossier Vidéos, « Atlas - son corps ».`, { expire: Date.now() + 8 * 3600000 });
    }
    if (!neuves.length) return;
    neuves.forEach(k => { S.corpsVu[k] = c.etapes[k].at; }); save();
    PROACTIF.annonce(`corps-${neuves.join('-')}`, `Cette nuit, mon corps a appris à ${neuves.map(k => c.etapes[k].dit).join(', puis à ')}. Dis « montre-moi ton corps » pour voir la vidéo.`, { expire: Date.now() + 8 * 3600000 });
  }
  async function linkedin() {
    let c; try { c = await lisCorps(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const v = c.montage; if (!v) return say("Pas encore de vidéo : le montage se fait chaque dimanche matin, avec les records de la semaine.");
    const url = `${root()}/maison/corps/video/${esc(v.video)}`;
    showBoard(`<div style="font-family:system-ui;text-align:center;min-width:min(92vw,560px)"><small style="letter-spacing:.3em;color:#7dd3fc">LA VIDÉO LINKEDIN DE LA SEMAINE</small>
      <video src="${url}" controls autoplay muted playsinline style="width:100%;max-width:540px;border-radius:12px;margin-top:8px"></video>
      <div style="margin-top:10px"><a href="${url}" download style="display:inline-block;padding:12px 22px;border-radius:12px;background:#0e7490;color:#fff;font:600 17px system-ui;text-decoration:none">⬇ Enregistrer la vidéo</a></div>
      <p style="color:#94a3b8;font-size:13px">${v.records} record${v.records > 1 ? 's' : ''} · ${String(v.secondes).replace('.', ',')} s · seulement le robot et son simulateur, aucune donnée personnelle</p></div>`);
    return say(`Voici la vidéo de la semaine : ${v.records} record${v.records > 1 ? 's' : ''} de mon corps, en ${Math.round(v.secondes)} secondes. Tu peux l'enregistrer avec le bouton, puis la poster.`);
  }
  async function linkedinMatin() {
    if (!root() || !dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    const h = new Date().getHours(); if (h < 8 || h >= 21) return;
    let c; try { c = await lisCorps(); } catch (e) { return; }
    if (!c.montage || S.montageVu === c.montage.video || Date.now() / 1000 - c.montage.at > 3 * 86400) return;
    S.montageVu = c.montage.video; save();
    PROACTIF.annonce(`montage-${c.montage.video}`, "Ta vidéo LinkedIn de la semaine est prête : les progrès de mon corps, nuit après nuit. Dis « montre-moi la vidéo LinkedIn ».", { expire: Date.now() + 10 * 3600000 });
  }
  setInterval(() => linkedinMatin().catch(() => {}), 20 * 60000);
  setInterval(() => corpsMatin().catch(() => {}), 15 * 60000); setTimeout(() => corpsMatin().catch(() => {}), 90000);

  /* ---------- ce que rien n'a pris : noté pour la nuit (seulement papa, seulement les demandes) ---------- */
  function note(t, n) {
    if (!root() || !dlg.qui || dlg.enfant || /^invité/.test(dlg.qui)) return;
    if (!/^(peux tu|tu peux|tu pourrais|est ce que tu (peux|sais|pourrais)|sais tu|tu sais|fais|fais moi|calcule|aide moi|donne moi|trouve moi|propose moi|organise|prepare moi|dis moi|combien|comment|montre moi|apprends|invente)\b/.test(n.replace(/^atlas /, ''))) return;
    api({ action: 'demande', texte: String(t).slice(0, 200) }).catch(() => {});
  }

  // les phrases fixes (tout au début de la chaîne)
  function routeFixe(t, n) {
    if (/\b(qu est ce que|qu as) tu (as )?appris\b|\b(tes|les) competences\b|\bce que tu as appris (tout )?seul\b/.test(n)) return appris;
    if (/^(?:atlas )?(?:oui )?active (?:la|cette competence|la competence|ta competence)(?: (.+))?$/.test(n)) { const m = n.match(/competence (.+)$/); return () => decide(true, m ? m[1] : ''); }
    if (/^(?:atlas )?(?:non )?oublie (?:la|cette competence|la competence|ta competence)(?: (.+))?$/.test(n)) { const m = n.match(/competence (.+)$/); return () => decide(false, m ? m[1] : ''); }
    if (/\b(video|montage) (linkedin|de la semaine)\b|\bla video pour linkedin\b/.test(n)) return linkedin;
    if (/\b(ton corps|tes progres|ton entrainement|tu sais (marcher|tenir debout|courir)|montre moi (comment tu marches|ton corps)|ton corps de robot)\b/.test(n)) return corps;
    if (/\b(qu est ce que tu as remarque|tu as remarque quoi|mes habitudes|tu connais mes habitudes|tu me connais bien)\b/.test(n)) return habitudes;
    return null;
  }
  // les recettes apprises (tout à la fin : après toutes les commandes d'Atlas, avant la conversation libre)
  function route(t, n) {
    const c = actives.find(c => c.res.some(r => r.test(n)));
    return c ? () => joue(c, t) : null;
  }
  return { route, routeFixe, note, relis, _joue: joue, _etat: () => ({ actives, proposees }) };
})();

/* =========================================================
   ATLAS — les protocoles (utiles d'abord, avec l'allure d'un film de science-fiction)
   - « scan de sécurité » / « scanne le périmètre » : une photo fraîche de chaque caméra, celles qui ne répondent pas,
     les alertes des 12 dernières heures, le réseau — affiché comme un écran de contrôle, résumé à la voix.
   - « je pars » / « protocole départ » : en bas tout s'éteint, l'ordi se verrouille, la sentinelle passe en mode absent,
     et il dit quelles caméras veillent (et laquelle ne répond pas).
   - « je suis rentré » / « protocole retour » : la maison s'allume, fin du mode absent, et ce qui s'est passé pendant l'absence.
   - « état des systèmes » / « diagnostic » : l'ordinateur (températures, mémoire, disque), les services de la maison, le réseau.
   - « qui est à la maison ? » : les téléphones, Shadow (réveillé ? il voit le petit ?), les voix entendues, le réseau.
   - « protocole danger » / « alerte intrusion » : toutes les lumières, la sirène, une photo de chaque caméra gardée comme preuve,
     une alerte urgente sur le téléphone, et les boutons 17 / 112 / SMS 114 à l'écran.
   - « lance la fusée » / « compte à rebours » : 10, 9, 8… la Fusée s'allume au décollage.
   - « résumé de la journée » : départs et retours, passages devant les caméras (photos), alertes, Shadow, marchés ;
     tout seul vers 21 h 30 s'il y a quelqu'un.
   - Il apprend tes habitudes : 4 jours sur 14 à la même heure (± 25 min) → il propose, « oui » → automatique (seulement si tu es là) ;
     « quelles habitudes as-tu remarquées ? », « supprime les automatismes ».
   - Les visiteurs : « qui est passé aujourd'hui / cette semaine ? » (livreurs déjà venus, véhicules qui reviennent, photos) ;
     la sentinelle prévient seule d'un même véhicule 3 fois en 24 h, ou de quelqu'un qui repasse 3 fois en 30 min.
   - La veille d'actualités : « surveille les infos sur la Fed », « préviens-moi s'il y a du nouveau sur l'or », « mes veilles »,
     « arrête de surveiller la Fed » (Google Actualités toutes les 20 min, 7 h–23 h, trié par le cerveau de la maison).
   - « rapport de nuit » / « qu'est-ce qui s'est passé cette nuit ? » : de 20 h au réveil, les photos en film accéléré avec leur heure,
     personnes (cour, toit / rue), véhicules, bruits, alertes ; un résumé d'une phrase au réveil (« je viens de me réveiller »).
   - Les réveils : « réveille-moi à 7 h », « réveille-moi en semaine à 6 h 45 » (lever de soleil 15 min avant, sur l'ordinateur,
     même téléphone fermé), « mes réveils », « annule mes réveils », « désactive / active le réveil de l'école ».
   - Les alertes de prix : « préviens-moi si l'or passe 4 150 », « si l'argent perd 1 % », « mes alertes de prix »,
     « supprime les alertes de prix » (l'ordinateur surveille toutes les 2 minutes, notification + voix).
   ========================================================= */
'use strict';

const SCIFI = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return /image/.test(r.headers.get('Content-Type') || '') ? r.blob() : r.json();
    } finally { clearTimeout(tm); }
  }
  const pc = d => appel('/maison/pc', d);
  const regle = (ids, allume, lum, teinte, pendant) => appel('/maison/commande', Object.assign({ ids, allume, source: 'routine' }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}, pendant ? { pendant } : {}), 20000);
  const sfx = q => { try { VISIO.sfx(q); } catch (e) { /* pas de son */ } };
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const chambre = a => /\bchambres?\b/.test(N(a.nom));

  /* ---------- l'écran de contrôle ---------- */
  let urls = [];
  function hud(titre, lignes, images) {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    const imgs = (images || []).map(x => { const u = x.blob ? URL.createObjectURL(x.blob) : ''; if (u) urls.push(u); return { u, nom: x.nom, etat: x.etat }; });
    const etat = { ok: '#5eead4', alerte: '#fca5a5', attente: '#fcd34d' };
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#04121f,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:12px 14px;color:#cfefff;box-shadow:0 0 24px rgba(56,189,248,.25) inset">
      <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.18em;color:#7dd3fc"><span>◢ ${esc(titre.toUpperCase())}</span><span>${hhmm().replace(' h ', ':')}</span></div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:8px 0"></div>
      ${lignes.map(([k, v, e]) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:2px 0"><span style="color:#93c5fd">${esc(k)}</span><span style="color:${etat[e] || '#e0f2fe'};text-align:right">${esc(v)}</span></div>`).join('')}
      ${imgs.length ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(2, imgs.length)},1fr);gap:6px;margin-top:10px">${imgs.map(x => `<div style="position:relative;border:1px solid ${x.etat === 'alerte' ? '#f87171' : '#1e6a8a'};border-radius:8px;overflow:hidden;background:#020b14;min-height:60px">${x.u ? `<img src="${x.u}" alt="" style="width:100%;display:block">` : `<div style="padding:18px 6px;text-align:center;color:#fca5a5;font-size:12px">SIGNAL PERDU</div>`}<span style="position:absolute;left:4px;top:3px;font-size:10px;letter-spacing:.12em;color:#e0f2fe;text-shadow:0 0 4px #000">${esc(x.nom.toUpperCase())}</span></div>`).join('')}</div>` : ''}
    </div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 120000);
  }

  /* ---------- les caméras : la liste, et une image fraîche de chacune ---------- */
  async function cameras() {
    const l = [];
    try { ((await appel('/maison/ezviz', null, 8000)).cameras || []).forEach(c => l.push({ nom: c.nom, ezviz: true, en_ligne: c.en_ligne !== false, batterie: c.batterie })); } catch (e) { /* rien */ }
    try { ((await appel('/maison/cameras', null, 8000)).cameras || []).forEach(c => l.push({ nom: c.nom.charAt(0).toUpperCase() + c.nom.slice(1), cle: c.nom, en_ligne: true })); } catch (e) { /* rien */ }
    return l;
  }
  async function image(c) {
    if (!c.en_ligne) return null;
    try {
      const b = await appel(c.ezviz ? `/maison/ezviz/photo?nom=${encodeURIComponent(c.nom)}` : `/maison/camera?nom=${encodeURIComponent(c.cle)}`, null, c.ezviz ? 70000 : 20000);
      return b instanceof Blob && b.size > 1000 ? b : null;
    } catch (e) { return null; }
  }
  async function alertes(depuis) {
    try { return ((await appel('/maison/alertes?depuis=0', null, 10000)).alertes || []).filter(a => a.at >= depuis && a.gravite !== 'info' && a.gravite !== 'annonce'); } catch (e) { return null; }
  }

  /* ---------- le scan de sécurité ---------- */
  async function scan() {
    sfx('scan');
    const cams = await cameras();
    if (!cams.length) return say("Je n'ai aucune caméra reliée.");
    const imgs = cams.map(c => ({ nom: c.nom, etat: c.en_ligne ? 'attente' : 'alerte', blob: null }));
    const lignes = () => [['Caméras', `${imgs.filter(x => x.blob).length} / ${cams.length} en image`, imgs.some(x => x.etat === 'alerte') ? 'alerte' : 'ok']];
    hud('Scan du périmètre', [['Caméras', `${cams.length} détectées`, 'attente'], ['Statut', 'activation des capteurs…', 'attente']], imgs);
    say(`Protocole de sécurité. Activation des ${cams.length} capteurs extérieurs.`);
    // les caméras réveillées l'une après l'autre (les EZVIZ sont sur batterie : une seule à la fois)
    for (let i = 0; i < cams.length; i++) {
      const b = await image(cams[i]);
      imgs[i].blob = b; imgs[i].etat = b ? 'ok' : 'alerte';
      hud('Scan du périmètre', lignes(), imgs);
    }
    const [al, sys] = await Promise.all([alertes(Date.now() - 12 * 3600000), pc({ action: 'systeme' }).catch(() => null)]);
    const muettes = cams.filter((c, i) => !imgs[i].blob).map(c => c.nom);
    const res = sys && sys.reseau;
    const L = [...lignes(), ['Hors ligne', muettes.length ? liste(muettes) : 'aucune', muettes.length ? 'alerte' : 'ok'],
      ['Alertes (12 h)', al == null ? 'inconnu' : al.length ? `${al.length}` : 'aucune', al && al.length ? 'alerte' : 'ok'],
      ['Réseau', res ? `${res.presents} appareils présents` : 'inconnu', 'ok'], ['Sentinelle', sys && sys.services && sys.services.sentinelle ? 'active' : 'arrêtée', sys && sys.services && sys.services.sentinelle ? 'ok' : 'alerte']];
    cams.filter(c => c.ezviz && c.batterie != null && c.batterie < 25).forEach(c => L.push([`Batterie ${c.nom}`, `${c.batterie} %`, 'alerte']));
    hud('Scan du périmètre', L, imgs);
    sfx(muettes.length || (al && al.length) ? 'scan' : 'final');
    const parts = [`Scan terminé. ${cams.length - muettes.length} caméra${cams.length - muettes.length > 1 ? 's' : ''} sur ${cams.length} en image`];
    parts.push(muettes.length ? ` : ${liste(muettes)} ne répond${muettes.length > 1 ? 'ent' : ''} pas` : ', elles répondent toutes');
    const p2 = al == null ? '' : al.length ? ` ${al.length} alerte${al.length > 1 ? 's' : ''} depuis 12 heures, la dernière ${quand(al[al.length - 1].at)} : ${al[al.length - 1].texte}` : ' Aucune alerte depuis 12 heures.';
    return say(`${parts.join('')}.${p2}${sys && sys.services && !sys.services.sentinelle ? ' Attention : la sentinelle est arrêtée.' : ''}`);
  }
  const quand = at => { const m = Math.round((Date.now() - at) / 60000); return m < 60 ? `il y a ${m} minute${m > 1 ? 's' : ''}` : `à ${hhmm(new Date(at))}`; };

  /* ---------- départ, retour ---------- */
  async function depart() {
    let l = []; try { l = (await appel('/maison/appareils', null, 15000)).appareils || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const eteindre = l.filter(a => a.allume && !chambre(a) && (a.type === 'lampe' || /\b(tele|television|tv|musique)\b/.test(N(a.nom))));
    sfx('scan');
    await Promise.all([
      eteindre.length ? regle(eteindre.map(a => a.id), false).catch(() => {}) : null,
      pc({ action: 'musique', quoi: 'pause' }).catch(() => {}), pc({ action: 'radio_stop' }).catch(() => {}),
      appel('/maison/sentinelle', { absent: true }, 10000).catch(() => {}),
    ]);
    S.absentDepuis = Date.now(); save();
    const cams = await cameras();
    const muettes = cams.filter(c => !c.en_ligne).map(c => c.nom);
    hud('Protocole départ', [['Lumières', eteindre.length ? `${eteindre.length} éteinte${eteindre.length > 1 ? 's' : ''}` : 'déjà éteintes', 'ok'], ['Chambres', 'non touchées', 'ok'],
      ['Sentinelle', 'mode absent', 'ok'], ['Caméras', `${cams.length - muettes.length} / ${cams.length} en ligne`, muettes.length ? 'alerte' : 'ok'], ['Ordinateur', 'verrouillé', 'ok']], []);
    fx.ok();
    await say(`Protocole départ. ${eteindre.length ? 'Les lumières sont éteintes, ' : ''}l'ordinateur se verrouille, et la sentinelle passe en mode absent : je surveille tout, et je te préviens au moindre doute. ${cams.length ? `${cams.length - muettes.length} caméra${cams.length - muettes.length > 1 ? 's' : ''} sur ${cams.length} veillent${muettes.length ? ` ; ${liste(muettes)} ne répond${muettes.length > 1 ? 'ent' : ''} pas` : ''}.` : ''} Bonne route.`);
    try { await pc({ action: 'verrouille' }); await wait(1200); await pc({ action: 'ecran' }); } catch (e) { /* tant pis */ }
  }
  async function retour() {
    appel('/maison/sentinelle', { absent: false }, 10000).catch(() => {});
    let l = []; try { l = (await appel('/maison/appareils', null, 15000)).appareils || []; } catch (e) { /* tant pis */ }
    const h = new Date().getHours(), soir = h >= 18 || h < 7;
    const bas = l.filter(a => a.type === 'lampe' && !chambre(a) && a.allume != null);
    if (bas.length) await regle(bas.map(a => a.id), true, soir ? 70 : 85, soir ? 15 : 65).catch(() => {});
    const depuis = S.absentDepuis || Date.now() - 12 * 3600000;
    const al = await alertes(depuis);
    S.absentDepuis = null; save();
    sfx('final');
    const imgs = [];
    const avecPhoto = (al || []).filter(a => a.image).slice(-2);
    for (const a of avecPhoto) { try { const b = await appel(`/maison/alerte/image?id=${a.id}`, null, 10000); if (b instanceof Blob) imgs.push({ nom: quand(a.at), blob: b, etat: 'alerte' }); } catch (e) { /* rien */ } }
    hud('Protocole retour', [['Mode absent', 'terminé', 'ok'], ['Lumières', bas.length ? `${bas.length} allumée${bas.length > 1 ? 's' : ''}` : '—', 'ok'], ['Pendant ton absence', al == null ? 'inconnu' : al.length ? `${al.length} alerte${al.length > 1 ? 's' : ''}` : 'rien à signaler', al && al.length ? 'alerte' : 'ok']], imgs);
    fx.ok();
    if (al == null) return say('Bon retour. La maison s\'allume.');
    if (!al.length) return say(`Bon retour. La maison s'allume. Pendant ton absence : rien à signaler.`);
    return say(`Bon retour. La maison s'allume. Pendant ton absence, ${al.length} alerte${al.length > 1 ? 's' : ''}. ${al.slice(-3).map(a => { const q = quand(a.at); return `${q.charAt(0).toUpperCase()}${q.slice(1)} : ${a.texte}`; }).join(' ')}`);
  }

  /* ---------- l'état des systèmes ---------- */
  async function systemes() {
    sfx('scan');
    let s; try { s = await pc({ action: 'systeme' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const pb = [];
    if (s.cpu_temp >= 85) pb.push(`le processeur chauffe, ${s.cpu_temp} degrés`);
    if (s.gpu_temp >= 85) pb.push(`la carte graphique chauffe, ${s.gpu_temp} degrés`);
    if (s.ram >= 90) pb.push(`la mémoire est presque pleine, ${s.ram} %`);
    if (s.disque >= 90) pb.push(`le disque est presque plein, il reste ${s.disque_libre_go} gigas`);
    const arretes = Object.entries(s.services || {}).filter(([, v]) => !v).map(([k]) => k);
    if (arretes.length) pb.push(`${liste(arretes)} ${arretes.length > 1 ? 'sont arrêtés' : 'est arrêté'}`);
    const tel = (s.tailscale || []).map(p => [p.nom, p.en_ligne ? 'connecté' : 'hors ligne', p.en_ligne ? 'ok' : 'attente']);
    hud('État des systèmes', [
      ['Processeur', `${s.cpu_temp ?? '?'} °C · charge ${s.charge ?? '?'} / ${s.coeurs}`, s.cpu_temp >= 85 ? 'alerte' : 'ok'], ['Carte graphique', `${s.gpu_temp ?? '?'} °C`, s.gpu_temp >= 85 ? 'alerte' : 'ok'],
      ['Mémoire', `${s.ram} % de ${s.ram_go} Go`, s.ram >= 90 ? 'alerte' : 'ok'], ['Disque', `${s.disque} % · ${s.disque_libre_go} Go libres`, s.disque >= 90 ? 'alerte' : 'ok'],
      ['En marche depuis', `${s.depuis_h} h`, 'ok'], ...Object.entries(s.services || {}).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v ? 'en ligne' : 'ARRÊTÉ', v ? 'ok' : 'alerte']),
      ['Réseau', `${s.reseau.presents} appareils présents`, 'ok'], ...tel], []);
    return say(pb.length ? `Diagnostic terminé. Attention : ${liste(pb)}.` : `Tous les systèmes sont opérationnels. Processeur à ${s.cpu_temp} degrés, mémoire à ${s.ram} %, disque à ${s.disque} %. La sentinelle, le cerveau et les oreilles fonctionnent, depuis ${Math.round(s.depuis_h)} heures sans interruption.`);
  }

  /* ---------- qui est à la maison ---------- */
  async function presence() {
    let d = {}, s = null;
    try { d = await appel('/atlas/diag', null, 8000); } catch (e) { /* rien */ }
    try { s = await pc({ action: 'systeme' }); } catch (e) { /* rien */ }
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    const recent = x => { if (!x || !x.recu) return false; const [h, m] = x.recu.split(':').map(Number), t = new Date(); t.setHours(h, m, 0, 0); return Date.now() - t < 3 * 60000; };
    const sh = Object.entries(d).find(([k]) => /^shadow/.test(k));
    const shadow = sh && recent(sh[1]) ? sh[1] : null;
    const voix = typeof CONV !== 'undefined' && CONV.presents ? CONV.presents() : [];
    const L = [], dits = [];
    if (voix.length) { L.push(['Voix entendues', liste(voix), 'ok']); dits.push(`J'ai entendu ${liste(voix)} récemment`); }
    if (shadow) { L.push(['Shadow', shadow.enfantVu ? `réveillé · voit ${enfant}` : 'réveillé', 'ok']); dits.push(shadow.enfantVu ? `Shadow est réveillé, et il voit ${enfant} en ce moment` : `Shadow est réveillé${shadow.parleIlYa != null && shadow.parleIlYa < 600 ? `, ${enfant} lui a parlé il y a ${Math.max(1, Math.round(shadow.parleIlYa / 60))} minute${shadow.parleIlYa >= 120 ? 's' : ''}` : ''}`); }
    else { L.push(['Shadow', 'endormi ou absent', 'attente']); dits.push('Shadow ne donne pas signe de vie'); }
    // la Fusée allumée la nuit : il dort à la maison ; éteinte : il est chez sa mère
    try {
      const h = new Date().getHours();
      const fu = ((await appel('/maison/appareils', null, 10000)).appareils || []).find(a => /\bfusee\b/.test(N(a.nom)));
      if (fu && fu.allume != null && (h >= 20 || h < 8)) { L.push(['Fusée', fu.allume ? `allumée · ${enfant} dort ici` : 'éteinte', fu.allume ? 'ok' : 'attente']); dits.push(fu.allume ? `La Fusée est allumée : ${enfant} dort à la maison` : `La Fusée est éteinte : ${enfant} est sans doute chez sa mère`); }
    } catch (e) { /* rien */ }
    if (s) (s.tailscale || []).forEach(p => L.push([p.nom, p.en_ligne ? 'à portée' : 'hors ligne', p.en_ligne ? 'ok' : 'attente']));
    if (s) L.push(['Réseau', `${s.reseau.presents} appareils présents`, 'ok']);
    hud('Présences', L, []);
    return say(`${dits.join('. ')}.${s ? ` ${s.reseau.presents} appareils sont connectés au réseau de la maison.` : ''}`);
  }

  /* ---------- le lancement de la fusée ---------- */
  async function fusee() {
    let l = []; try { l = (await appel('/maison/appareils', null, 15000)).appareils || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const f = l.find(a => /\bfusee\b/.test(N(a.nom)));
    if (!f) return say("Je ne trouve pas la Fusée.");
    const lum = l.filter(a => a.type === 'lampe' && a.allume && !chambre(a));
    sfx('demarrage');
    // en duo avec Shadow s'il est réveillé : Atlas lance la séquence, Shadow fait le compte à rebours et allume la Fusée
    const canal = (nom, msg) => appel(`/maison/canal/${nom}`, msg, 10000);
    let duo = false;
    try {
      DUO.vide(); // on oublie les vieux messages (le canal atlas n'a qu'une boucle de lecture : duo.js)
      await say('Séquence de lancement. Shadow, ici Atlas : tu es prêt ?');
      await canal('shadow', { type: 'fusee', de: 'atlas' });
      duo = !!(await DUO.attends('fusee-pret', 6000));
    } catch (e) { duo = false; }
    if (duo) {
      let fini = false;
      fini = !!(await DUO.attends('fusee-ok', 25000));
      sfx('final');
      if (lum.length) { try { for (const v of [100, 20, 100, 30, 100]) { await regle(lum.map(a => a.id), true, v, 100); await wait(120); } await Promise.all(lum.map(a => regle([a.id], true, a.lum, a.teinte))); } catch (e) { /* tant pis */ } }
      return say(fini ? "Décollage confirmé. Bravo l'équipage, mission réussie !" : 'Shadow a perdu le contact, mais la fusée est partie. Mission réussie !');
    }
    if (f.allume) await regle([f.id], false).catch(() => {});
    await say('Pas de réponse de Shadow : je lance seul. Tous les systèmes sont prêts. Dix. Neuf. Huit. Sept. Six. Cinq. Quatre. Trois. Deux. Un.');
    await regle([f.id], true).catch(() => {});
    sfx('final');
    if (lum.length) { try { for (const v of [100, 20, 100, 30, 100]) { await regle(lum.map(a => a.id), true, v, 100); await wait(120); } await Promise.all(lum.map(a => regle([a.id], true, a.lum, a.teinte))); } catch (e) { /* tant pis */ } }
    return say('Décollage ! La Fusée a quitté la Terre.');
  }

  /* ---------- les alertes de prix (l'ordinateur surveille 24 h/24, et prévient par notification et à la voix) ---------- */
  const INSTR = [[/\b(l or|de l or|gold|xau)\b/, 'XAU', "l'or"], [/\b(l argent|de l argent|silver|xag)\b/, 'XAG', "l'argent"], [/\b(cuivre|copper)\b/, 'HG', 'le cuivre'], [/\b(euro dollar|eurusd|l euro)\b/, 'EURUSD', "l'euro-dollar"]];
  const fmt = (v, sym) => (sym === 'EURUSD' ? v.toFixed(5) : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
  async function prixAlerte(t, n) {
    const ins = INSTR.find(([re]) => re.test(n));
    if (!ins) return say("Sur quel marché ? Je surveille l'or, l'argent, le cuivre et l'euro-dollar.");
    const pc = String(t).match(/(\d+(?:[.,]\d+)?)\s*(?:%|pour\s?cents?)/i);
    const nb = String(t).replace(/(\d)[\s ](?=\d{3}\b)/g, '$1').match(/(\d+(?:[.,]\d+)?)(?!\s*(?:%|pour))/);
    let corps;
    if (pc) { const v = parseFloat(pc[1].replace(',', '.')); corps = { sym: ins[1], pct: /\b(perd|baisse|chute|recule|descend|tombe|lache)\b/.test(n) ? -v : v }; }
    else if (nb) corps = { sym: ins[1], seuil: parseFloat(nb[1].replace(',', '.')) };
    else return say(`À quel prix ? Dis par exemple : préviens-moi si ${ins[2]} passe 4 150.`);
    let r; try { r = await appel('/maison/prix-alertes', corps, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (r.erreur) return say(r.erreur === 'pas de cours' ? `Je n'ai pas encore le cours de ${ins[2]}.` : "Je n'ai pas compris l'alerte.");
    const a = r.alerte; fx.ok();
    const premiere = !S.prixVu; if (premiere) { S.prixVu = true; save(); }
    return say(`${a.type === 'pct' ? `Alerte posée : je te préviens si ${ins[2]} ${a.pct > 0 ? 'prend' : 'perd'} ${Math.abs(a.pct)} %, c'est-à-dire ${a.sens === 'haut' ? 'au-dessus' : 'en dessous'} de ${fmt(a.seuil, a.sym)}` : `Alerte posée : je te préviens dès que ${ins[2]} ${a.sens === 'haut' ? 'dépasse' : 'passe sous'} ${fmt(a.seuil, a.sym)}`}. ${ins[2].charAt(0).toUpperCase() + ins[2].slice(1)} est à ${fmt(r.cours, a.sym)} en ce moment.${premiere ? ' Je surveille le cours au comptant, toutes les 2 minutes : il peut différer de quelques points du contrat future que tu trades.' : ''}`);
  }
  async function prixListe(supprimer) {
    let r; try { r = await appel('/maison/prix-alertes', supprimer ? { supprime: 'tout' } : null, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (supprimer) { fx.ok(); return say(r.supprimees ? `${r.supprimees} alerte${r.supprimees > 1 ? 's' : ''} de prix supprimée${r.supprimees > 1 ? 's' : ''}.` : "Il n'y avait aucune alerte de prix."); }
    const l = r.alertes || [];
    if (!l.length) return say("Aucune alerte de prix en cours.");
    const nom = sym => (INSTR.find(x => x[1] === sym) || [])[2] || sym;
    hud('Alertes de prix', l.map(a => [nom(a.sym), `${a.sens === 'haut' ? '▲ au-dessus de' : '▼ sous'} ${fmt(a.seuil, a.sym)}`, 'attente']), []);
    return say(`${l.length} alerte${l.length > 1 ? 's' : ''} : ${l.map(a => `${nom(a.sym)} ${a.sens === 'haut' ? 'au-dessus de' : 'sous'} ${fmt(a.seuil, a.sym)}`).join(', ')}.`);
  }

  /* ---------- les réveils sur l'ordinateur de la maison : la lampe monte 15 minutes avant (lever de soleil), même téléphone fermé ---------- */
  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const hTxt = hm => { const [h, m] = hm.split(':'); return `${+h} h${m !== '00' ? ` ${m}` : ''}`; };
  const joursTxt = j => (!j || !j.length ? '' : j.length === 7 ? 'tous les jours' : j.join() === '0,1,2,3,4' ? 'du lundi au vendredi' : j.join() === '5,6' ? 'le week-end' : `le ${j.map(x => JOURS[x]).join(', ')}`);
  async function reveil(t, n) {
    const m = n.match(/\b(?:a|pour)\s+(\d{1,2})\s*(?:heures?|h)\s*(\d{1,2})?/) || n.match(/\b(\d{1,2})\s*(?:heures?|h)\s*(\d{1,2})?/);
    if (!m) return say("À quelle heure ? Dis par exemple : réveille-moi à 7 heures.");
    const h = +m[1], mi = m[2] ? +m[2] : (/\bet demie?\b/.test(n) ? 30 : /\bet quart\b/.test(n) ? 15 : /\bmoins le quart\b/.test(n) ? -15 : 0);
    const d = new Date(); d.setHours(h, mi, 0, 0);
    if (h > 23 || d.getMinutes() > 59) return say("Cette heure n'existe pas.");
    let jours = [];
    if (/\b(tous les jours|chaque jour|tous les matins|chaque matin)\b/.test(n)) jours = [0, 1, 2, 3, 4, 5, 6];
    else if (/\b(en semaine|jours de semaine|du lundi au vendredi|jours ouvres|les jours de travail)\b/.test(n)) jours = [0, 1, 2, 3, 4];
    else if (/\bweek ?end\b/.test(n)) jours = [5, 6];
    else JOURS.forEach((j, i) => { if (new RegExp(`\\b${j}s?\\b`).test(n) && /\b(les|chaque|tous les)\b/.test(n)) jours.push(i); });
    if (!jours.length && d <= new Date()) d.setDate(d.getDate() + 1);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let r; try { r = await appel('/maison/reveils', jours.length ? { heure: hm, jours } : { heure: hm, date }, 10000); } catch (e) { r = null; }
    if (!r) return null; // l'ordinateur ne répond pas : le réveil du téléphone (outils.js) prend le relais
    fx.ok();
    const quand = jours.length ? joursTxt(jours) : d.getDate() === new Date().getDate() ? "aujourd'hui" : 'demain';
    return say(`Réveil réglé à ${d.getHours()} heures${d.getMinutes() ? ` ${d.getMinutes()}` : ''}, ${quand}. Ta lampe montera doucement un quart d'heure avant, comme un lever de soleil, et je te réveillerai ici et sur ton téléphone, même si je suis fermé.`);
  }
  async function reveils(effacer) {
    let r; try { r = await appel('/maison/reveils', effacer ? { supprime: 'tout' } : null, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (effacer) { S.minuteurs = (S.minuteurs || []).filter(x => x.type !== 'reveil'); save(); fx.ok(); return say('Tous tes réveils sont annulés.'); }
    const l = r.reveils || [], e = r.ecole || {};
    const ec = e.actif ? ` Le réveil d'école de ${(typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils'} est actif, à ${hTxt(e.heure)}, les jours d'école, quand la Fusée est allumée.` : '';
    if (!l.length) return say(`Aucun réveil pour toi.${ec}`);
    return say(`${l.map(x => `${hTxt(x.heure)} ${x.jours.length ? joursTxt(x.jours) : x.date === new Date().toISOString().slice(0, 10) ? "aujourd'hui" : 'demain'}`).join(', ')}.${ec}`);
  }
  async function coucherAuto(actif) {
    try { await appel('/maison/reveils', { coucher: actif }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok();
    return say(actif ? "Coucher automatique activé : à 20 h, s'il est là, salle de bain, Fusée, radio et lumière basse, et Shadow le lui dit." : 'Coucher automatique de 20 h désactivé.');
  }
  async function ecole(actif) {
    try { await appel('/maison/reveils', { ecole: actif }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok();
    const p = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    return say(actif ? `Réveil d'école activé : à 7 h 30, les jours d'école hors vacances, si la Fusée est allumée, je l'éteins et j'allume doucement la lumière de ${p}.` : `Réveil d'école de ${p} désactivé.`);
  }

  /* ---------- le journal de la journée : départs et retours, passages devant les caméras, alertes, Shadow, marchés ---------- */
  async function journal(auto) {
    const minuit = new Date(); minuit.setHours(0, 0, 0, 0);
    let al = []; try { al = ((await appel(`/maison/alertes?depuis=${+minuit}`, null, 10000)).alertes || []).filter(a => a.at >= +minuit); } catch (e) { return auto ? '' : say("L'ordinateur de la maison ne répond pas."); }
    const h = at => hhmm(new Date(at));
    const parts = [], L = [];
    // départs et retours
    const pres = al.filter(a => a.genre === 'presence' && /^(Départ|Retour|Je t'ai vu partir|Bon retour)/.test(a.texte));
    const dep = pres.filter(a => /^(Départ|Je t'ai vu partir)/.test(a.texte)), ret = pres.filter(a => /^(Retour|Bon retour)/.test(a.texte));
    if (dep.length || ret.length) {
      const seq = pres.sort((a, b) => a.at - b.at).map(a => `${/^(Départ|Je t'ai vu partir)/.test(a.texte) ? 'parti' : 'rentré'} à ${h(a.at)}`);
      parts.push(`Tu es ${seq.join(', puis ')}`); L.push(['Départs / retours', seq.join(' · '), 'ok']);
    } else { parts.push('Tu n\'as pas quitté la maison, ou je ne t\'ai pas vu partir'); L.push(['Départs / retours', 'aucun', 'ok']); }
    // les passages devant les caméras (une personne vue)
    const pass = al.filter(a => a.genre === 'ezviz' && /^Quelqu'un devant/.test(a.texte));
    const det = al.filter(a => a.genre === 'ezviz' && /^Détection/.test(a.texte)).length + al.filter(a => a.genre === 'camera').length;
    if (pass.length) {
      const desc = pass.slice(-3).map(a => { const m = a.texte.match(/« ([^»]+) »\s*:\s*(.*)$/); return `${h(a.at)} devant la caméra ${m ? m[1] : ''}${m && m[2] ? ` : ${m[2].replace(/\.$/, '')}` : ''}`; });
      parts.push(`${pass.length} passage${pass.length > 1 ? 's' : ''} devant les caméras. ${desc.join('. ')}`);
    }
    L.push(['Passages (personne vue)', `${pass.length}`, pass.length ? 'attente' : 'ok'], ['Mouvements détectés', `${det}`, 'ok']);
    // les alertes qui comptaient
    const vraies = al.filter(a => (a.gravite === 'attention' || a.gravite === 'urgent') && !['presence', 'reveil', 'coucher', 'marche'].includes(a.genre) && a.genre !== 'ezviz' || (a.genre === 'ezviz' && a.gravite === 'urgent'));
    parts.push(vraies.length ? `${vraies.length} alerte${vraies.length > 1 ? 's' : ''} : ${vraies.slice(-2).map(a => `${h(a.at)}, ${a.texte.replace(/\.$/, '')}`).join('. ')}` : 'Aucune alerte de sécurité');
    L.push(['Alertes', vraies.length ? `${vraies.length}` : 'aucune', vraies.length ? 'alerte' : 'ok']);
    // les routines de la journée
    const rv = al.filter(a => a.genre === 'reveil'), co = al.filter(a => a.genre === 'coucher' && /^Coucher du petit/.test(a.texte));
    if (rv.length) L.push(['Réveils', rv.map(a => h(a.at)).join(' · '), 'ok']);
    if (co.length) L.push(['Coucher', h(co[co.length - 1].at), 'ok']);
    const prix = al.filter(a => a.genre === 'marche');
    if (prix.length) { parts.push(`${prix.length} alerte${prix.length > 1 ? 's' : ''} de prix déclenchée${prix.length > 1 ? 's' : ''}`); L.push(['Alertes de prix', `${prix.length}`, 'attente']); }
    // Shadow et le petit
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    const min = typeof LIEN !== 'undefined' && LIEN.minutes ? LIEN.minutes() : 0;
    if (min) { parts.push(`${enfant} a passé ${min} minutes avec Shadow`); L.push(['Shadow', `${min} min avec ${enfant}`, 'ok']); }
    // les marchés du jour
    try {
      const c = (await appel('/atlas/marche?h=24', null, 8000)).cours || {};
      const m = [['XAU', "l'or"], ['XAG', "l'argent"]].filter(([k]) => c[k] && c[k].var24 != null).map(([k, nom]) => `${nom} ${c[k].var24 >= 0 ? 'prend' : 'perd'} ${Math.abs(c[k].var24).toLocaleString('fr-FR')} %, à ${c[k].prix.toLocaleString('fr-FR')}`);
      if (m.length) { parts.push(`Sur 24 heures, ${m.join(', et ')}`); m.forEach(x => L.push(['Marché', x, 'ok'])); }
    } catch (e) { /* rien */ }
    // les photos des derniers passages
    const imgs = [];
    for (const a of pass.filter(x => x.image).slice(-4)) { try { const b = await appel(`/maison/alerte/image?id=${a.id}`, null, 10000); if (b instanceof Blob) imgs.push({ nom: h(a.at), blob: b, etat: 'ok' }); } catch (e) { /* rien */ } }
    hud(`Journal du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`, L, imgs);
    const texte = `${auto ? 'Le résumé de ta journée. ' : 'Voici ta journée. '}${parts.join('. ')}.`;
    return auto ? texte : say(texte);
  }
  // le résumé automatique du soir, vers 21 h 30, s'il y a quelqu'un (une fois par jour)
  setInterval(() => {
    const d = new Date(), hm = d.getHours() * 60 + d.getMinutes();
    if (hm >= 21 * 60 + 30 && hm < 22 * 60 + 15 && typeof PROACTIF !== 'undefined' && root()) PROACTIF.annonce(`journal-${dayKey()}`, () => journal(true), { expire: Date.now() + 40 * 60000 });
  }, 60000);

  /* ---------- il apprend tes habitudes : il propose, tu dis oui, c'est automatique ---------- */
  const JOURS2 = j => (j.length === 7 ? 'tous les jours' : j.join() === '0,1,2,3,4' ? 'du lundi au vendredi' : j.join() === '5,6' ? 'le week-end' : 'certains jours');
  const habTxt = x => `tu ${x.allume ? 'allumes' : 'éteins'} ${liste(x.noms.map(v => v.charAt(0).toLowerCase() + v.slice(1)))}${x.allume && x.lum != null ? ` à ${x.lum} %` : ''} vers ${hTxt(x.heure)}, ${JOURS2(x.jours)}`;
  let enAttente = null; // la proposition à laquelle il attend un oui ou un non
  async function habitudesVerifie() {
    if (!root()) return;
    let r; try { r = await appel('/maison/habitudes', null, 10000); } catch (e) { return; }
    const vues = S.habVues = S.habVues || [];
    const x = (r.suggestions || []).find(y => !vues.includes(y.id));
    if (!x) return;
    PROACTIF.annonce(`habitude-${x.id}`, async () => { enAttente = { id: x.id, x, at: Date.now() }; if (!vues.includes(x.id)) { vues.push(x.id); save(); } return `J'ai remarqué quelque chose : ${habTxt(x)}. Tu veux que je le fasse tout seul ? Dis oui, ou non merci.`; }, { expire: Date.now() + 3 * 3600000 });
  }
  setTimeout(habitudesVerifie, 60000); setInterval(habitudesVerifie, 30 * 60000);
  async function habitudeReponse(oui) {
    const p = enAttente; enAttente = null;
    try { await appel('/maison/habitudes', oui ? { accepte: p.id } : { refuse: p.id }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok();
    return say(oui ? `C'est noté : désormais, je le fais tout seul, ${JOURS2(p.x.jours)} à ${hTxt(p.x.heure)}, quand tu es là.` : "D'accord, je ne te le proposerai plus.");
  }
  async function automatismes(effacer) {
    let r; try { r = await appel('/maison/habitudes', effacer ? { supprime: 'tout' } : null, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (effacer) { fx.ok(); return say('Tous les automatismes sont supprimés. Je continue à observer, et je te proposerai de nouvelles idées.'); }
    const a = r.auto || [], s2 = r.suggestions || [];
    hud('Habitudes', [...a.map(x => ['Automatique', habTxt(x), 'ok']), ...s2.map(x => ['Remarqué', habTxt(x), 'attente'])], []);
    if (!a.length && !s2.length) return say("Je n'ai encore rien remarqué de régulier. J'observe ce que tu me demandes chaque jour : il me faut au moins quatre jours pareils.");
    return say(`${a.length ? `Je fais tout seul : ${a.map(habTxt).join(' ; ')}. ` : ''}${s2.length ? `J'ai aussi remarqué : ${s2.map(habTxt).join(' ; ')}.` : ''}`);
  }

  /* ---------- le protocole danger : toutes les lumières, la sirène, les preuves, et les numéros d'urgence à portée de doigt ---------- */
  async function danger() {
    let l = []; try { l = ((await appel('/maison/appareils', null, 10000)).appareils || []).filter(a => a.type === 'lampe' && a.allume != null); } catch (e) { /* tant pis */ }
    const tout = Promise.all([
      l.length ? regle(l.map(a => a.id), true, 100, 50).catch(() => {}) : null, // toute la maison en pleine lumière (chambres comprises)
      appel('/maison/danger', {}, 10000).catch(() => {}),                       // preuves : une photo de chaque caméra + alerte urgente sur le téléphone
      appel('/maison/defense', { camera: 'toutes', action: 'sirene', duree: 60 }, 30000).catch(() => {}), // les sirènes des caméras, une minute
    ]);
    for (let k = 0; k < 3; k++) { fx.tone([[880, 0.35], [660, 0.35], [880, 0.35], [660, 0.35]]); await wait(1500); }
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:#1a0505;border:2px solid #ef4444;border-radius:14px;padding:14px;color:#fee2e2">
      <div style="font-size:12px;letter-spacing:.2em;color:#fca5a5">◢ PROTOCOLE DANGER · ${hhmm().replace(' h ', ':')}</div>
      <div style="margin:10px 0 12px;font-size:14px">Toutes les lumières sont allumées. Une photo de chaque caméra est gardée comme preuve, et l'alerte est sur ton téléphone.</div>
      <div style="display:grid;gap:8px">
        <a href="tel:17" style="display:block;text-align:center;padding:14px;border-radius:10px;background:#dc2626;color:#fff;font-size:18px;font-weight:700;text-decoration:none">📞 Appeler le 17 (police)</a>
        <a href="tel:112" style="display:block;text-align:center;padding:12px;border-radius:10px;background:#7f1d1d;color:#fff;font-size:16px;text-decoration:none">📞 Appeler le 112</a>
        <a href="sms:114" style="display:block;text-align:center;padding:12px;border-radius:10px;background:#450a0a;color:#fff;font-size:15px;text-decoration:none">✉️ SMS au 114 (si tu ne peux pas parler)</a>
      </div></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 15 * 60000);
    await say("Protocole de sécurité activé. Toutes les caméras enregistrent, et les images partent hors de la maison. La police peut être prévenue à tout instant.");
    await tout;
  }

  /* ---------- l'énergie : en direct (prises qui mesurent), aujourd'hui et ce mois-ci (ampoules estimées) ---------- */
  const kwh = v => v.toLocaleString('fr-FR', { maximumFractionDigits: v < 1 ? 2 : 1 });
  const euros = v => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  async function energie(t, n) {
    let e; try { e = await appel('/maison/energie', null, 15000); } catch (ex) { return say("L'ordinateur de la maison ne répond pas."); }
    // un appareil précis : « combien consomme la station de trading ? »
    const un = (e.direct || []).find(x => N(t).includes(N(x.nom))) || Object.keys(e.aujourdhui || {}).map(nom => ({ nom })).find(x => N(t).includes(N(x.nom)));
    if (un && !/\b(maison|total|tout)\b/.test(n)) {
      const d = (e.direct || []).find(x => x.nom === un.nom), auj = (e.aujourdhui || {})[un.nom], mo = (e.mois || {})[un.nom];
      return say(`${un.nom} : ${d && d.watts != null ? `${Math.round(d.watts)} watts en ce moment` : 'pas de mesure en direct'}${auj != null ? `, ${kwh(auj)} kilowattheure aujourd'hui` : ''}${mo != null ? `, ${euros(mo * e.prix_kwh)} depuis le début du mois` : ''}.${(e.mesure || []).includes(un.nom) ? '' : ' (Estimation : cette ampoule ne mesure pas sa consommation.)'}`);
    }
    const mois = /\b(mois|mensuel)\b/.test(n), data = mois ? e.mois || {} : e.aujourdhui || {};
    const tot = Object.values(data).reduce((a, b) => a + b, 0);
    if (!Object.keys(data).length) return say("Je viens de commencer à mesurer : redemande-moi dans quelques heures. En ce moment, " + ((e.direct || []).map(x => `${x.nom} : ${Math.round(x.watts)} watts`).join(', ') || 'aucune prise ne mesure') + '.');
    const top = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 3);
    hud(mois ? 'Énergie · ce mois-ci' : "Énergie · aujourd'hui", [['Total', `${kwh(tot)} kWh · ${euros(tot * e.prix_kwh)}`, 'ok'],
      ...Object.entries(data).sort((a, b) => b[1] - a[1]).map(([nom, v]) => [nom + ((e.mesure || []).includes(nom) ? '' : ' (estimé)'), `${kwh(v)} kWh · ${euros(v * e.prix_kwh)}`, 'ok']),
      ...(e.direct || []).filter(x => x.watts > 0).map(x => [`${x.nom} en direct`, `${Math.round(x.watts)} W`, 'attente']), ['Prix', `${e.prix_kwh.toLocaleString('fr-FR')} € le kWh`, 'ok']], []);
    return say(`${mois ? 'Ce mois-ci' : "Aujourd'hui"}, les appareils reliés ont consommé ${kwh(tot)} kilowattheures, soit environ ${euros(tot * e.prix_kwh)}. Le plus gourmand : ${top.map(([nom, v]) => `${nom}, ${kwh(v)}`).join(' ; ')}. Seules les prises qui mesurent sont exactes : pour les ampoules, c'est une estimation, et le reste de la maison (frigo, chauffage, four) n'est pas compté.`);
  }
  async function prixKwh(t) {
    const m = String(t).match(/(\d+[.,]\d+)/); if (!m) return say("Dis par exemple : le kilowattheure coûte 0,25 euro.");
    try { await appel('/maison/energie', { prix_kwh: parseFloat(m[1].replace(',', '.')) }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok(); return say(`C'est noté : ${m[1].replace('.', ',')} euro le kilowattheure.`);
  }
  async function circadien(actif) {
    try { await appel('/maison/reveils', { circadien: actif }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    fx.ok(); return say(actif ? 'La lumière suit de nouveau le soleil : fraîche le matin, chaude le soir.' : "D'accord : quand tu allumes, la lumière garde sa teinte d'avant.");
  }

  /* ---------- la veille d'actualités : l'ordinateur lit l'actu toutes les 20 minutes et ne prévient que du vraiment nouveau ---------- */
  async function veille(action, sujet) {
    let r; try { r = await appel('/maison/veilles', action === 'liste' ? null : action === 'ajoute' ? { sujet } : { supprime: sujet || 'tout' }, 10000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const l = r.veilles || [];
    fx.ok();
    if (action === 'ajoute') return say(`C'est noté : je surveille l'actualité sur « ${sujet} », toutes les 20 minutes, de 7 h à 23 h. Je ne te préviens que s'il y a un vrai fait nouveau et important, pas à chaque article.`);
    if (action === 'supprime') return say(sujet && sujet !== 'tout' ? `J'arrête de surveiller « ${sujet} ».` : "J'arrête toutes mes veilles d'actualités.");
    return say(l.length ? `Je surveille : ${liste(l.map(v => v.sujet))}.` : "Je ne surveille aucune actualité pour l'instant. Dis par exemple : surveille les infos sur la Fed.");
  }

  /* ---------- le mode cockpit : le tableau de bord en grand, et Atlas en petit dans le coin (il écoute et parle toujours) ---------- */
  function pleinEcran() {
    if (!document.body.classList.contains('cockpit') || document.fullscreenElement) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { const h = document.getElementById('cockpit-pe'); if (h) h.remove(); }).catch(() => {});
  }
  function modeCockpit(on) {
    document.body.classList.toggle('cockpit', on);
    let f = document.getElementById('cockpit-cadre');
    if (on && !f) { f = document.createElement('iframe'); f.id = 'cockpit-cadre'; f.src = `cockpit.html?v=${window.ATLAS_VERSION || ''}${typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role === 'ordinateur' ? '&poste=travail' : ''}`; f.title = 'Cockpit de la maison'; document.body.appendChild(f); f.addEventListener('load', () => { try { f.contentDocument.addEventListener('pointerdown', pleinEcran); } catch (e) { /* rien */ } }); }
    if (!on && f) f.remove();
    // le plein écran (sans les barres d'Android) : le navigateur l'accorde au premier toucher de l'écran
    if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.addEventListener('pointerdown', pleinEcran);
      const h = document.createElement('div'); h.id = 'cockpit-pe';
      h.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:80;padding:10px 18px;border-radius:999px;background:rgba(14,116,144,.85);color:#e0f2fe;font:600 15px system-ui;pointer-events:none';
      h.textContent = '⛶ Touche l\'écran pour le plein écran';
      document.body.appendChild(h); setTimeout(() => h.remove(), 8000);
    }
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    try { localStorage.setItem('atlas-cockpit', on ? '1' : '0'); } catch (e) { /* rien */ }
    window.dispatchEvent(new Event('resize'));
  }
  // une tablette au mur : elle se rallume en mode cockpit
  setTimeout(() => { try { if (localStorage.getItem('atlas-cockpit') === '1') modeCockpit(true); } catch (e) { /* rien */ } }, 1500);

  /* ---------- les visiteurs : qui est passé, les livreurs (déjà venus ?), les véhicules qui reviennent ---------- */
  async function visiteurs(jours) {
    let r; try { r = await appel(`/maison/passages?jours=${jours}&historique=1`, null, 15000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const l = r.passages || [], tous = r.tous || [];
    const h = at => hhmm(new Date(at * 1000));
    const jourDe = at => new Date(at * 1000).toLocaleDateString('fr-FR', { weekday: 'long' });
    const debut = Date.now() / 1000 - jours * 86400;
    const pers = l.filter(x => x.personne), livr = pers.filter(x => x.a && (x.a.livreur || x.a.transporteur)), autres = pers.filter(x => !(x.a && (x.a.livreur || x.a.transporteur)));
    const parts = [], L = [];
    if (!l.length) return say(`Personne n'est passé devant les caméras ${jours === 1 ? "aujourd'hui" : 'cette semaine'}, en tout cas rien qu'elles aient vu.`);
    // les livreurs : déjà venus ?
    const dl = livr.map(x => {
      const t = (x.a.transporteur || 'un livreur');
      const avant = tous.filter(y => y.at < debut && y.a && _n(y.a.transporteur) && _n(y.a.transporteur) === _n(x.a.transporteur)).pop();
      return `${h(x.at)}, ${x.a.transporteur ? `un livreur ${t}` : 'un livreur'}${x.a.colis ? ' avec un colis' : ''}${avant ? ` (déjà venu ${jourDe(avant.at)})` : ''}`;
    });
    if (dl.length) { parts.push(`${dl.length} livraison${dl.length > 1 ? 's' : ''} : ${dl.slice(-4).join(' ; ')}`); L.push(['Livreurs', `${dl.length}`, 'ok']); }
    if (autres.length) {
      const parCam = {}; autres.forEach(x => { parCam[x.camera] = (parCam[x.camera] || 0) + 1; });
      parts.push(`${autres.length} autre${autres.length > 1 ? 's' : ''} passage${autres.length > 1 ? 's' : ''} de personnes : ${Object.entries(parCam).map(([c, k]) => `${k} devant la caméra ${c}`).join(', ')}, la dernière fois à ${h(autres[autres.length - 1].at)}`);
      L.push(['Personnes', `${autres.length}`, 'attente']);
    }
    // les véhicules : ceux qui reviennent
    const sig = a => [_n(a.vehicule_marque) || _n(a.vehicule_type), _n(a.vehicule_couleur)].join(' ').trim();
    const veh = {}; l.filter(x => x.a && x.a.vehicule && sig(x.a)).forEach(x => { const k = sig(x.a); (veh[k] = veh[k] || []).push(x); });
    const rev = Object.entries(veh).map(([k, v]) => [k, v.filter((x, i) => !i || x.at - v[i - 1].at >= 300)]).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
    if (rev.length) { parts.push(`Véhicules qui reviennent : ${rev.slice(0, 3).map(([k, v]) => `${k}${v[0].a.vitres_teintees ? ' aux vitres teintées' : ''}, ${v.length} fois (${v.slice(-3).map(x => h(x.at)).join(', ')})`).join(' ; ')}`); rev.forEach(([k, v]) => L.push([`Véhicule : ${k}`, `${v.length} passages`, v.length >= 3 ? 'alerte' : 'attente'])); }
    else if (Object.keys(veh).length) L.push(['Véhicules', `${Object.keys(veh).length} différents`, 'ok']);
    const imgs = [];
    for (const x of pers.filter(y => y.alerte).slice(-4)) { try { const b = await appel(`/maison/alerte/image?id=${x.alerte}`, null, 10000); if (b instanceof Blob) imgs.push({ nom: h(x.at), blob: b, etat: x.a && x.a.livreur ? 'ok' : 'attente' }); } catch (e) { /* rien */ } }
    hud(jours === 1 ? "Visiteurs d'aujourd'hui" : 'Visiteurs de la semaine', L.length ? L : [['Passages', `${l.length}`, 'ok']], imgs);
    return say(`${jours === 1 ? "Aujourd'hui" : 'Cette semaine'} : ${parts.length ? parts.join('. ') : `${l.length} détections, sans personne ni véhicule notable`}.`);
  }
  const _n = v => N(v || '');

  /* ---------- la sirène des caméras (défense active) ---------- */
  async function sirene(t, n, on) {
    const cam = (String(t).match(/\b(?:de la|du|de|sur la)\s+(?:caméra\s+)?(façade|facade|cours?|toiture|toit)\b/i) || [])[1] || 'toutes';
    const nom = /toit/i.test(cam) ? 'Toiture' : /cour/i.test(cam) ? 'Cours' : /fa[cç]ade/i.test(cam) ? 'Façade' : 'toutes';
    let r; try { r = await appel('/maison/defense', { camera: nom, action: on ? 'sirene' : 'stop', duree: on ? 30 : 0 }, 30000); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(on ? "La sirène n'a pas voulu se déclencher. Utilise le bouton d'alarme de l'appli EZVIZ." : "Je n'arrive pas à couper la sirène depuis ici : coupe-la dans l'appli EZVIZ.");
    return say(on ? `Sirène déclenchée${nom === 'toutes' ? ' sur toutes les caméras' : ` sur la caméra ${nom}`}, pendant 30 secondes. Dis « arrête la sirène » pour la couper.` : 'Sirène coupée.');
  }

  /* ---------- le message holographique : papa se filme 20 secondes, Shadow le projette à son fils façon hologramme ---------- */
  async function hologramme(capsule = '') { // capsule : « AAAA-MM-JJ », le jour où Shadow l'ouvrira
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    if (!window.MediaRecorder || !navigator.mediaDevices) return say("Cet appareil ne sait pas enregistrer de vidéo.");
    let flux; try { flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: { echoCancellation: true, noiseSuppression: true } }); } catch (e) { return say("Je n'ai pas accès à la caméra et au micro de cet appareil."); }
    showBoard(`<div style="position:relative;border:1px solid #38bdf8;border-radius:14px;overflow:hidden;background:#020b14"><video id="holo-apercu" autoplay muted playsinline style="width:100%;display:block;filter:sepia(1) hue-rotate(165deg) saturate(2.4) brightness(1.1)"></video>
      <div id="holo-etat" style="position:absolute;left:10px;top:8px;font:12px ui-monospace,monospace;letter-spacing:.2em;color:#7dd3fc">◢ MESSAGE HOLOGRAPHIQUE · PRÊT</div>
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(125,211,252,.08) 0 2px,transparent 2px 5px);pointer-events:none"></div></div>
      <div class="small muted" style="margin-top:6px">Touche l'image pour arrêter avant les 20 secondes.</div>`, 'graphe-board');
    clearTimeout(effaceT);
    const v = document.getElementById('holo-apercu'); if (v) v.srcObject = flux;
    const duree = capsule ? 60 : 20;
    await say(capsule ? `Capsule temporelle pour ${enfant}. Tu as une minute. Je t'enregistre dans trois, deux, un.` : `Message holographique pour ${enfant}. Je t'enregistre dans trois, deux, un.`);
    if (typeof OREILLES !== 'undefined') OREILLES.mute(true); // il ne s'écoute pas pendant l'enregistrement
    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 900000 }), morceaux = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) morceaux.push(e.data); };
    const fini = new Promise(r => { rec.onstop = r; });
    rec.start(500); fx.tone([[1319, 0.12]]);
    const etat = document.getElementById('holo-etat'), t0 = Date.now();
    const tic = setInterval(() => { if (etat) etat.textContent = `◢ ${capsule ? 'CAPSULE TEMPORELLE' : 'ENREGISTREMENT'} ● ${Math.max(0, duree - Math.round((Date.now() - t0) / 1000))} s`; }, 250);
    await new Promise(r => { const t = setTimeout(r, duree * 1000); const b = document.getElementById('board'); if (b) b.addEventListener('click', () => { clearTimeout(t); r(); }, { once: true }); });
    clearInterval(tic); rec.stop(); await fini; flux.getTracks().forEach(x => x.stop());
    if (typeof OREILLES !== 'undefined') OREILLES.mute(false);
    fx.tone([[1319, 0.08], [988, 0.14]]); hideBoard();
    const video = new Blob(morceaux, { type: 'video/webm' });
    if (video.size < 5000) return say("L'enregistrement n'a pas marché. On réessaie quand tu veux.");
    try {
      const r = await fetch(`${root()}/maison/hologramme${capsule ? `?capsule=${capsule}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'video/webm' }, body: video, cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
    } catch (e) { return say("Je n'ai pas réussi à l'envoyer à l'ordinateur de la maison."); }
    if (capsule) return say(`Capsule temporelle scellée. Elle restera verrouillée jusqu'au ${new Date(`${capsule}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Ce jour-là, Shadow l'ouvrira pour ${enfant}.`);
    return say(`Message enregistré. Shadow le projettera à ${enfant} en hologramme, dès qu'il le verra.`);
  }
  // la capsule temporelle : un message à ouvrir plus tard (Noël, son anniversaire, dans un an…)
  const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function prochaine(mois, jourM, annee) { const auj = new Date(); auj.setHours(0, 0, 0, 0); let d = new Date(annee || auj.getFullYear(), mois, jourM); if (!annee && d <= auj) d = new Date(auj.getFullYear() + 1, mois, jourM); return d; }
  function dateCapsule(n) {
    let m;
    if (/\bnoel\b/.test(n)) return prochaine(11, 25);
    if (/\b(nouvel an|jour de l an)\b/.test(n)) return prochaine(0, 1);
    if ((m = n.match(/\ble (\d{1,2}|premier|1er) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?: (\d{4}))?\b/))) return prochaine(MOIS.indexOf(m[2]), /^\d+$/.test(m[1]) ? +m[1] : 1, m[3] ? +m[3] : 0);
    if ((m = n.match(/\bdans (un|une|deux|trois|cinq|six|dix|\d{1,3}) (ans?|annees?|mois|semaines?|jours?)\b/))) {
      const k = { un: 1, une: 1, deux: 2, trois: 3, cinq: 5, six: 6, dix: 10 }[m[1]] || +m[1], d = new Date();
      if (/^an|^annee/.test(m[2])) d.setFullYear(d.getFullYear() + k); else if (m[2] === 'mois') d.setMonth(d.getMonth() + k); else if (/^semaine/.test(m[2])) d.setDate(d.getDate() + 7 * k); else d.setDate(d.getDate() + k);
      return d;
    }
    return null;
  }
  async function capsule(t, n) {
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    let d = dateCapsule(n);
    if (!d && /\banniversaire\b/.test(n)) {
      if (!S.anniversaireEnfant) {
        const a = N(await ask(`C'est quand, l'anniversaire de ${enfant} ?`, { wait: 12000 }) || '');
        const m = a.match(/\b(\d{1,2}|premier|1er) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
        if (!m) return say("Je n'ai pas compris la date. Redis-moi par exemple : « capsule temporelle pour le 14 mai ».");
        S.anniversaireEnfant = [MOIS.indexOf(m[2]), /^\d+$/.test(m[1]) ? +m[1] : 1]; save();
      }
      d = prochaine(S.anniversaireEnfant[0], S.anniversaireEnfant[1]);
    }
    if (!d) {
      const a = N(await ask('On l\'ouvre quand ? À Noël, pour son anniversaire, dans un an, ou à une date ?', { wait: 12000 }) || '');
      d = dateCapsule(a) || (/\banniversaire\b/.test(a) && S.anniversaireEnfant ? prochaine(S.anniversaireEnfant[0], S.anniversaireEnfant[1]) : null);
      if (!d) return say("Je n'ai pas compris la date. Redis-moi par exemple : « capsule temporelle à ouvrir dans un an ».");
    }
    const jours = Math.round((d - new Date()) / 86400000);
    if (jours < 1) return say('Choisis une date dans le futur.');
    const lib = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!(await askYesNo(`Capsule temporelle à ouvrir le ${lib}, dans ${jours} jours. On enregistre ?`))) return say('Capsule annulée.');
    return hologramme(iso(d));
  }

  /* ---------- l'inverse : le message holographique du petit, projeté chez papa ---------- */
  let holoFils = null;
  async function projetteFils(h, rejoue) {
    let url; try { const b = await appel(`/maison/hologramme/${h.id}`, null, 30000); if (!(b instanceof Blob) || b.size < 5000) return ''; url = URL.createObjectURL(b); } catch (e) { return ''; }
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    if (!rejoue) { fx.tone([[523, 0.12], [784, 0.12], [1047, 0.25]]); await say(`Message holographique entrant… de ${enfant} !`); }
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:40;background:radial-gradient(60% 55% at 50% 55%,#06223a,#000 75%);display:grid;place-items:center;opacity:0;transition:opacity .8s';
    el.innerHTML = `<style>@keyframes hC{0%,100%{opacity:.92}47%{opacity:.75}50%{opacity:.42}53%{opacity:.86}}@keyframes hS{from{background-position:0 0}to{background-position:0 40px}}</style>
      <div style="position:relative;width:min(84vw,680px);animation:hC 3.2s infinite">
        <video playsinline style="width:100%;display:block;border-radius:10px;transform:rotate(${h.rot || 0}deg);filter:sepia(1) hue-rotate(165deg) saturate(3) brightness(1.25) contrast(1.15);mix-blend-mode:screen;-webkit-mask-image:radial-gradient(70% 70% at 50% 50%,#000 60%,transparent 100%);mask-image:radial-gradient(70% 70% at 50% 50%,#000 60%,transparent 100%)"></video>
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(125,211,252,.12) 0 2px,transparent 2px 6px);animation:hS 2s linear infinite;pointer-events:none"></div>
        <div style="position:absolute;left:50%;bottom:-60px;transform:translateX(-50%);width:70%;height:60px;background:radial-gradient(50% 100% at 50% 100%,rgba(125,211,252,.35),transparent 70%)"></div></div>
      <div style="position:fixed;top:14px;left:0;right:0;text-align:center;font:13px ui-monospace,monospace;letter-spacing:.35em;color:#7dd3fc">◢ MESSAGE HOLOGRAPHIQUE · ${esc(enfant.toUpperCase())}</div>`;
    document.body.appendChild(el);
    if (typeof OREILLES !== 'undefined') OREILLES.mute(true);
    try {
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      const v = el.querySelector('video'); v.src = url;
      await new Promise(res => { v.onended = res; v.onerror = res; el.onclick = res; setTimeout(res, 40000); v.play().catch(() => { v.muted = true; v.play().catch(res); }); });
    } finally { el.style.opacity = '0'; setTimeout(() => { el.remove(); URL.revokeObjectURL(url); }, 900); if (typeof OREILLES !== 'undefined') OREILLES.mute(false); }
    holoFils = h;
    if (!rejoue) appel('/maison/hologramme', { lu: h.id }).catch(() => {});
    return rejoue ? '' : 'Fin de la transmission. Dis « rejoue le message » pour le revoir.';
  }
  async function holoFilsReleve() {
    if (!root()) return;
    let r; try { r = await appel('/maison/hologramme', null, 10000); } catch (e) { return; }
    (r.hologrammes || []).filter(h => h.de === 'enfant' && !h.lu).forEach(h => PROACTIF.annonce(`alerte-holo-${h.id}`, () => projetteFils(h, false), { urgent: true, expire: Date.now() + 3 * 86400000 }));
  }
  setTimeout(holoFilsReleve, 20000); setInterval(holoFilsReleve, 30000);

  /* ---------- le rapport de nuit : ce que la sentinelle a vu entre 20 h et le réveil, en film accéléré ---------- */
  async function rapportNuit(court) {
    const now = new Date(), debut = new Date(now); debut.setHours(20, 0, 0, 0);
    if (now.getHours() < 20) debut.setDate(debut.getDate() - 1);
    const fin = new Date(debut); fin.setDate(fin.getDate() + 1); fin.setHours(8, 30, 0, 0);
    let al = [], pa = [];
    try { al = ((await appel(`/maison/alertes?depuis=${+debut}`, null, 10000)).alertes || []).filter(a => a.at >= +debut && a.at <= +fin); } catch (e) { return court ? '' : say("L'ordinateur de la maison ne répond pas."); }
    try { pa = ((await appel('/maison/passages?jours=2', null, 10000)).passages || []).filter(x => x.at * 1000 >= +debut && x.at * 1000 <= +fin); } catch (e) { /* rien */ }
    const h = ms => hhmm(new Date(ms));
    const pers = pa.filter(x => x.personne), veh = pa.filter(x => !x.personne && x.a && x.a.vehicule);
    const prives = pers.filter(x => !/facade|rue/.test(N(x.camera)));
    const bruits = al.filter(a => a.genre === 'camera' && /bruit/i.test(a.texte));
    const urgentes = al.filter(a => a.gravite === 'urgent');
    const autres = al.filter(a => a.gravite === 'attention' && !['reveil', 'coucher', 'presence', 'marche', 'veille', 'hologramme'].includes(a.genre) && a.genre !== 'ezviz');
    const mouv = al.filter(a => a.genre === 'ezviz' && /^Détection/.test(a.texte)).length;
    const parts = [];
    if (urgentes.length) parts.push(`attention, ${urgentes.length} alerte${urgentes.length > 1 ? 's' : ''} urgente${urgentes.length > 1 ? 's' : ''} : ${urgentes.slice(-2).map(a => `${h(a.at)}, ${a.texte.replace(/\.$/, '')}`).join(' ; ')}`);
    if (prives.length) parts.push(`${prives.length} passage${prives.length > 1 ? 's' : ''} de personnes dans la cour ou sur le toit (${prives.slice(-3).map(x => h(x.at * 1000)).join(', ')})`);
    const rue = pers.length - prives.length;
    if (rue) parts.push(`${rue} passant${rue > 1 ? 's' : ''} devant la maison`);
    if (veh.length) parts.push(`${veh.length} véhicule${veh.length > 1 ? 's' : ''} vu${veh.length > 1 ? 's' : ''}`);
    if (bruits.length) parts.push(`${bruits.length} bruit${bruits.length > 1 ? 's' : ''} fort${bruits.length > 1 ? 's' : ''} (${bruits.slice(-3).map(a => h(a.at)).join(', ')})`);
    if (autres.length) parts.push(`${autres.length} autre${autres.length > 1 ? 's' : ''} alerte${autres.length > 1 ? 's' : ''} : ${autres.slice(-2).map(a => a.texte.replace(/\.$/, '')).join(' ; ')}`);
    const calme = !urgentes.length && !prives.length && !bruits.length && !autres.length;
    const resume = calme ? `Nuit calme.${rue || veh.length ? ` ${[rue ? `${rue} passant${rue > 1 ? 's' : ''} dans la rue` : '', veh.length ? `${veh.length} véhicule${veh.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' et ')}, rien dans la cour ni sur le toit.` : ' Rien dans la cour ni sur le toit, aucune alerte.'}` : `Cette nuit : ${parts.join('. ')}.`;
    if (court) return resume;
    // le film accéléré : les photos de la nuit, dans l'ordre, avec leur heure
    const avecPhoto = al.filter(a => a.image).slice(-16);
    const photos = [];
    for (const a of avecPhoto) { try { const b = await appel(`/maison/alerte/image?id=${a.id}`, null, 10000); if (b instanceof Blob) photos.push({ u: URL.createObjectURL(b), h: h(a.at), t: a.texte, urgent: a.gravite === 'urgent' }); } catch (e) { /* rien */ } }
    const L = [['Personnes (cour, toit)', `${prives.length}`, prives.length ? 'alerte' : 'ok'], ['Passants (rue)', `${rue}`, 'ok'], ['Véhicules', `${veh.length}`, 'ok'],
      ['Bruits forts', `${bruits.length}`, bruits.length ? 'attente' : 'ok'], ['Mouvements détectés', `${mouv}`, 'ok'], ['Alertes urgentes', `${urgentes.length}`, urgentes.length ? 'alerte' : 'ok']];
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#04121f,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:12px 14px;color:#cfefff">
      <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.18em;color:#7dd3fc"><span>◢ RAPPORT DE NUIT</span><span>${h(+debut)} → ${h(Math.min(+fin, Date.now()))}</span></div>
      ${photos.length ? `<div style="position:relative;margin-top:10px;border:1px solid #1e6a8a;border-radius:10px;overflow:hidden;background:#020b14"><img id="nuit-film" src="${photos[0].u}" style="width:100%;display:block"><div id="nuit-leg" style="position:absolute;left:8px;bottom:6px;right:8px;font-size:12px;color:#e0f2fe;text-shadow:0 0 4px #000"></div></div>
        <div style="display:flex;gap:4px;margin-top:6px;overflow-x:auto">${photos.map((p, i) => `<div data-i="${i}" style="flex:0 0 auto;font-size:10px;padding:3px 6px;border-radius:6px;border:1px solid ${p.urgent ? '#f87171' : '#1e6a8a'};color:${p.urgent ? '#fca5a5' : '#93c5fd'}">${p.h}</div>`).join('')}</div>` : '<div style="margin-top:10px;font-size:13px;color:#93c5fd">Aucune photo cette nuit.</div>'}
      <div style="margin-top:8px">${L.map(([k, v, e]) => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span style="color:#93c5fd">${esc(k)}</span><span style="color:${{ ok: '#5eead4', alerte: '#fca5a5', attente: '#fcd34d' }[e]}">${esc(v)}</span></div>`).join('')}</div></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(() => { cacheEcran(); photos.forEach(p => URL.revokeObjectURL(p.u)); }, 120000);
    if (photos.length > 1) {
      let i = 0; const img = document.getElementById('nuit-film'), leg = document.getElementById('nuit-leg');
      const montre = k => { if (!img || !document.body.contains(img)) return false; i = k; img.src = photos[k].u; leg.textContent = `${photos[k].h} · ${photos[k].t.slice(0, 90)}`; document.querySelectorAll('[data-i]').forEach(x => { x.style.background = +x.dataset.i === k ? 'rgba(56,189,248,.3)' : 'transparent'; }); return true; };
      montre(0);
      const film = setInterval(() => { if (!montre((i + 1) % photos.length)) clearInterval(film); }, 900);
      document.querySelectorAll('[data-i]').forEach(x => x.addEventListener('click', () => { clearInterval(film); montre(+x.dataset.i); }));
    } else if (photos.length) { const leg = document.getElementById('nuit-leg'); if (leg) leg.textContent = `${photos[0].h} · ${photos[0].t.slice(0, 90)}`; }
    return say(resume);
  }

  /* ---------- la salle de commandement du matin : « je viens de me réveiller » ---------- */
  // un écran de commande (la nuit, les marchés de la nuit, les annonces, la météo, les mails importants, les missions du jour)
  // qui se remplit panneau par panneau ; il dit l'essentiel, les mails arrivent quand le tri est fini
  async function commandement(entete) {
    const sous = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
    const fr = (x, d) => Number(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
    const pc2 = (x, d = 1) => `${x > 0 ? 'plus' : x < 0 ? 'moins' : ''} ${fr(Math.abs(x), d)} %`.trim();
    const hm2 = d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    const P = (id, titre) => `<div style="border:1px solid #1e6a8a;border-radius:12px;padding:10px 12px;background:rgba(4,18,31,.85);min-width:0"><div style="font-size:10px;letter-spacing:.2em;color:#7dd3fc">◢ ${titre}</div><div id="cmd-${id}" style="margin-top:6px;font-size:13px;line-height:1.45;color:#e0f2fe">…</div></div>`;
    showBoard(`<div style="font-family:ui-monospace,Menlo,monospace;background:linear-gradient(160deg,#020b14,#0a2540);border:1px solid #1e6a8a;border-radius:14px;padding:12px;box-shadow:0 0 30px rgba(56,189,248,.25) inset">
      <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.2em;color:#7dd3fc"><span>◢ SALLE DE COMMANDEMENT</span><span>${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase())} · ${hm2(new Date())}</span></div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);margin:8px 0 10px"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px">${P('nuit', 'LA NUIT')}${P('marches', 'MARCHÉS DE LA NUIT')}${P('annonces', 'ANNONCES DU JOUR')}${P('meteo', 'MÉTÉO')}${P('mails', 'MAILS IMPORTANTS')}${P('missions', 'MISSIONS DU JOUR')}</div></div>`, 'graphe-board');
    clearTimeout(effaceT); effaceT = setTimeout(cacheEcran, 4 * 60000);
    const remplis = (id, html) => { const el = document.getElementById(`cmd-${id}`); if (el) el.innerHTML = html || '<span style="color:#64748b">—</span>'; };
    const ligne = (k, v, c) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd">${esc(k)}</span><span style="color:${c || '#e0f2fe'};text-align:right">${esc(v)}</span></div>`;
    const v = S.settings.ville;
    const mails = sous(appel('/maison/pc', { action: 'mails_importants' }, 120000), 120000); // le tri peut prendre une minute : il ne bloque pas le reste
    const [nuitTxt, or, eu, tr, w] = await Promise.all([
      sous(rapportNuit(true), 12000),
      sous(appel('/atlas/marche?serie=XAU&h=14', null, 8000), 9000),
      sous(appel('/atlas/marche?serie=EURUSD&h=14', null, 8000), 9000),
      sous(appel('/maison/trading', null, 8000), 9000),
      v ? sous(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,weather_code&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`).then(r => r.json()), 8000) : null]);
    const dits = [entete];
    // la nuit
    remplis('nuit', nuitTxt ? esc(nuitTxt) : 'Rapport indisponible.');
    if (nuitTxt) dits.push(nuitTxt);
    // les marchés de la nuit : depuis 22 h hier, et la plage de la séance asiatique (1 h – 9 h)
    const nuitM = (j, dec) => {
      const pts = (j && j.serie) || []; if (pts.length < 5) return null;
      const d = new Date(), v22 = new Date(d); v22.setHours(22, 0, 0, 0); if (d.getHours() < 22) v22.setDate(v22.getDate() - 1);
      const ref = pts.find(p => p[0] * 1000 >= +v22) || pts[0], der = pts[pts.length - 1];
      const a0 = new Date(d); a0.setHours(1, 0, 0, 0); const a1 = new Date(d); a1.setHours(9, 0, 0, 0);
      const asie = pts.filter(p => p[0] * 1000 >= +a0 && p[0] * 1000 <= +a1).map(p => p[1]);
      return { prix: fr(der[1], dec), v: (der[1] - ref[1]) / ref[1] * 100, lo: asie.length > 2 ? fr(Math.min(...asie), dec) : null, hi: asie.length > 2 ? fr(Math.max(...asie), dec) : null };
    };
    const mo = nuitM(or, 1), me = nuitM(eu, 4), mk = [];
    remplis('marches', [mo && ligne('Or', `${mo.prix} $ · ${mo.v >= 0 ? '+' : ''}${fr(mo.v, 2)} %`, mo.v >= 0 ? '#5eead4' : '#fca5a5'), mo && mo.lo && ligne('  Asie', `${mo.lo} – ${mo.hi}`),
      me && ligne('EUR/USD', `${me.prix} · ${me.v >= 0 ? '+' : ''}${fr(me.v, 2)} %`, me.v >= 0 ? '#5eead4' : '#fca5a5'), me && me.lo && ligne('  Asie', `${me.lo} – ${me.hi}`)].filter(Boolean).join('') || 'Pas encore de cours relevés.');
    if (mo) mk.push(`l'or ${Math.abs(mo.v) < 0.05 ? 'est stable' : `fait ${pc2(mo.v)}`} depuis hier soir, à ${mo.prix} dollars${mo.lo ? `, entre ${mo.lo} et ${mo.hi} pendant la séance asiatique` : ''}`);
    if (me) mk.push(`l'euro-dollar ${Math.abs(me.v) < 0.03 ? 'est stable' : `fait ${pc2(me.v, 2)}`}, à ${me.prix}`);
    if (mk.length) dits.push(`Cette nuit, ${mk.join(' ; ')}.`);
    // les annonces du jour (États-Unis et zone euro, impact fort)
    const now = Date.now(), auj = new Date().toDateString();
    const ann = ((or && or.annonces) || []).filter(a => (a.pays === 'USD' || a.pays === 'EUR') && a.impact === 'High' && !/Bank Holiday/i.test(a.titre) && new Date(a.date).toDateString() === auj).sort((a, b) => new Date(a.date) - new Date(b.date));
    const titre = a => { try { return MARCHE._titre(a); } catch (e) { return a.titre; } };
    remplis('annonces', ann.length ? ann.map(a => ligne(hm2(new Date(a.date)), `${a.pays === 'EUR' ? '🇪🇺' : '🇺🇸'} ${titre(a)}`, new Date(a.date) < now ? '#64748b' : '#fcd34d')).join('') : 'Aucune annonce à fort impact.');
    const venir = ann.filter(a => new Date(a.date) > now);
    if (venir.length) dits.push(`Annonces à fort impact : ${venir.map(a => `à ${hhmm(new Date(a.date))}, ${titre(a)}`).join(' ; ')}.`);
    // la météo
    if (w && w.current) {
      const h = new Date().getHours(), pluie = w.hourly.time.map((t, i) => [+t.slice(11, 13), w.hourly.precipitation_probability[i]]).filter(([hh, p]) => hh >= h && hh <= 21 && p >= 50);
      remplis('meteo', ligne(v.name || 'Dehors', `${Math.round(w.current.temperature_2m)}°`) + ligne('Min · max', `${Math.round(w.daily.temperature_2m_min[0])}° · ${Math.round(w.daily.temperature_2m_max[0])}°`) + ligne('Pluie', pluie.length ? `vers ${pluie[0][0]} h` : 'non', pluie.length ? '#fcd34d' : '#5eead4'));
      dits.push(`Dehors, ${Math.round(w.current.temperature_2m)} degrés, jusqu'à ${Math.round(w.daily.temperature_2m_max[0])}${pluie.length ? `, de la pluie probable vers ${pluie[0][0]} heures` : ', sans pluie'}.`);
    } else remplis('meteo', v ? 'Météo indisponible.' : 'Donne-moi ta ville dans les réglages.');
    // les missions du jour : rappels, ce qu'il faut retenir, l'agenda, la session de trading
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const mis = [];
    try { (await AGENDA.aujourdhui()).slice(0, 5).forEach(e => mis.push([e.journee ? 'Journée' : hm2(new Date(e.debut * 1000)), `${AGENDA.propre(e.titre)}${e.lieu ? ` · ${e.lieu.split(',')[0]}` : ''}`])); } catch (e) { /* pas d'agenda */ }
    (S.minuteurs || []).filter(t => t.type === 'rappel' && t.fin <= +fin && t.fin > now).sort((a, b) => a.fin - b.fin).slice(0, 4).forEach(t => mis.push([hm2(new Date(t.fin)), t.nom]));
    try { MEMOIRE.aujourdhui().slice(0, 2).forEach(x => mis.push(['À retenir', x.texte.replace(/\.$/, '')])); } catch (e) { /* rien */ }
    try { LIEN.upcoming(1).filter(x => x.days === 0).slice(0, 2).forEach(x => mis.push(['Famille', x.e.text])); } catch (e) { /* rien */ }
    if (tr && ![0, 6].includes(new Date().getDay())) mis.push(['Trading', `à plat avant ${hm2(new Date(tr.plat_a * 1000))}`]);
    remplis('missions', mis.length ? mis.map(([k, x]) => ligne(k, x)).join('') : 'Rien de prévu : journée libre.');
    const vraies = mis.filter(([k]) => k !== 'Trading');
    if (vraies.length) dits.push(`Tes missions : ${vraies.map(([k, x]) => (/^\d/.test(k) ? `${x} à ${k.replace(':', ' h ')}` : x)).join(', ')}.`);
    if (typeof dayKey === 'function') { S.matinFait = dayKey(); save(); }
    // les mails : s'ils sont déjà triés, il les dit ; sinon, dès que le tri est fini
    const ditMails = r => {
      const l = (r && r.importants) || [];
      remplis('mails', !r ? 'Tri indisponible.' : l.length ? l.slice(0, 5).map(x => ligne(x.de.slice(0, 18), x.resume.slice(0, 48), '#fcd34d')).join('') : 'Rien d\'important.');
      return !r ? '' : l.length ? `${l.length} mail${l.length > 1 ? 's' : ''} important${l.length > 1 ? 's' : ''}, dont ${l[0].de} : ${l[0].resume}.` : 'Aucun mail important.';
    };
    const deja = await sous(mails, 1500);
    if (deja) dits.push(ditMails(deja));
    else mails.then(r => { const t = ditMails(r); if (t) PROACTIF.annonce(`mails-matin-${Date.now()}`, `Le tri des mails est fini : ${t}`, { expire: Date.now() + 20 * 60000 }); });
    if (nuitTxt && !/^Nuit calme/.test(nuitTxt)) dits.push('Dis « rapport de nuit » pour voir les photos.');
    return say(dits.filter(Boolean).join(' '));
  }

  /* ---------- le lien lumineux : son fils pense à lui (les lampes respirent), papa répond (l'écran de Shadow s'illumine) ---------- */
  async function lienFils(t) {
    const enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || 'ton fils';
    const m = String(t).match(/dis[- ]lui (?:que |qu['’])?(.+?)\s*[.!?]*$/i);
    try { await appel('/maison/lien', { de: 'papa', mot: m ? m[1] : '' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    sfx('scan');
    return say(`C'est parti. L'écran de Shadow va s'illuminer pour ${enfant}${m ? `, avec ton message` : ''}, chez toi ou chez sa mère, dès qu'il sera devant.`);
  }
  function route(t, n) {
    if ((/\b(bisous?|calins?|coeurs?|rayons?) lumineux\b|\bsignal lumineux\b|\bje pense a lui (aussi|fort|tres fort)\b/.test(n) || /\b(envoie|envoi|renvoie|fais)( lui| a mon fils| au petit| a shadow)? (un |des |plein de |gros |un gros )*(bisous?|calins?|coeurs?)\b/.test(n)) && !/\b(maman|sa mere|ma mere)\b/.test(n)) return () => lienFils(t);
    if (/\b(rapport de (la )?nuit|qu est ce qui s est passe (cette nuit|la nuit derniere|pendant la nuit|pendant que je dormais)|comment s est passee la nuit|la nuit (a ete|s est passee)|il s est passe quoi cette nuit|bilan de (la )?nuit)\b/.test(n)) return () => rapportNuit(false);
    if (/\b(rejoue|remets|repasse|revoir)\b.*\b(message|hologramme)\b/.test(n) && holoFils) return () => projetteFils(holoFils, true);
    if (/\bcapsules? temporelles?\b|\bcapsule (a|pour) ouvrir\b/.test(n)) return () => capsule(t, n);
    if (/\b(message (holographique|video|hologramme)|hologramme|enregistre (un|moi un) message (video )?pour|filme moi pour|laisse un message video)\b/.test(n) && !/\b(rejoue|lis|ecoute)\b/.test(n)) return hologramme;
    if (/\b(declenche|active|lance|fais sonner|allume)\b.*\bsirenes?\b/.test(n)) return () => sirene(t, n, true);
    if (/\b(arrete|coupe|stop|eteins|desactive)\b.*\bsirenes?\b/.test(n)) return () => sirene(t, n, false);
    if (/\b(qui est passe|qui est venu|les visiteurs|des visiteurs|le livreur est (passe|venu)|est ce que le (livreur|facteur) est (passe|venu)|qui a sonne|des passages|les passages)\b/.test(n) && !/\bshadow\b/.test(n)) return () => visiteurs(/\bsemaine\b/.test(n) ? 7 : 1);
    { // « surveille les infos sur la Fed », « préviens-moi s'il y a du nouveau sur l'or », « arrête de surveiller la Fed », « mes veilles »
      const aj = String(t).match(/(?:surveille|suis|garde un (?:œil|oeil) sur|fais (?:une |la )?veille sur)\s+(?:l['’]actu(?:alité)?|les (?:infos|actualités|actus|nouvelles))?\s*(?:sur|de|à propos de|concernant|autour de)?\s*(.+?)\s*[.!?]*$/i)
        || String(t).match(/préviens[- ]moi\s+(?:s['’]il y a|quand il y a|dès qu['’]il y a)\s+(?:du nouveau|des nouvelles|une info|de l['’]actu)\s+(?:sur|à propos de|concernant)\s+(.+?)\s*[.!?]*$/i);
      if (/\b(arrete|stop|ne surveille plus|supprime|annule)\b.*\b(surveiller|veilles?|surveillance de l actu)\b/.test(n)) { const m = String(t).match(/surveiller\s+(?:l['’]actu(?:alité)? (?:sur|de)\s+)?(.+?)\s*[.!?]*$/i); return () => veille('supprime', m && !/^(tout|les veilles)$/i.test(m[1]) ? m[1] : 'tout'); }
      if (/\b(mes veilles|qu est ce que tu surveilles|quelles actus tu surveilles|tu surveilles quoi)\b/.test(n)) return () => veille('liste');
      if (aj && aj[1] && !/\b(maison|cameras?|perimetre|alarme|enfant|fils|reseau|ordi)\b/.test(N(aj[1])) && /\b(infos?|actu|actualites?|nouvelles|nouveau|veille|surveille)\b/.test(n)) return () => veille('ajoute', aj[1].replace(/^(?:sur|de)\s+/i, '').trim());
    }
    if (/\b(ferme|quitte|sors du|enleve|cache)\b.*\b(cockpit|tableau de bord)\b|\bfin du (mode )?cockpit\b/.test(n)) return () => { modeCockpit(false); return say('Mode cockpit fermé.'); };
    if (/\b(cockpit|tableau de bord|ecran de controle|panneau de controle de la maison)\b/.test(n) && !/\breglages\b/.test(n)) return () => { modeCockpit(true); return say("Mode cockpit : le tableau de bord de la maison, en direct. Je reste là, dans le coin, et je t'écoute toujours."); };
    if (/\b(combien|consommation|consomme|consomment|coute|coutent|facture|energie|electricite|kilowatt|gourmand)\b/.test(n) && /\b(maison|prise|prises|station|tele|television|fusee|musique|lumieres?|ampoules?|appareils?|ce mois|aujourd hui|energie|electricite|consomme)\b/.test(n) && !/\b(or|argent|bitcoin|action|nasdaq|cuivre)\b/.test(n) && !/\b(kilowatt ?heure coute|prix du kilowatt)\b/.test(n)) return () => energie(t, n);
    if (/\b(le kilowatt ?heure|le kwh|prix du kilowatt ?heure)\b.*\d/.test(n)) return () => prixKwh(t);
    if (/\blumiere qui suit le soleil\b|\b(teinte|lumiere) automatique\b|\bcircadien\w*\b/.test(n) && /\b(desactive|arrete|coupe|enleve)\b/.test(n)) return () => circadien(false);
    if (/\blumiere qui suit le soleil\b|\b(teinte|lumiere) automatique\b|\bcircadien\w*\b/.test(n) && /\b(active|remets|reactive)\b/.test(n)) return () => circadien(true);
    if (/\b(protocole danger|protocole d urgence|alerte intrusion|mode panique|declenche l alerte|il y a des intrus|on essaie d entrer|quelqu un essaie d entrer)\b/.test(n)) return danger;
    if (enAttente && Date.now() - enAttente.at < 4 * 60000) {
      if (/^(oui|ouais|ok|d accord|vas y|carrement|avec plaisir|oui merci|bien sur|fais le|oui fais le)\b/.test(n)) return () => habitudeReponse(true);
      if (/^(non|non merci|pas la peine|laisse|surtout pas|jamais)\b/.test(n)) return () => habitudeReponse(false);
    }
    if (/\b(quelles habitudes|mes habitudes|mes automatismes|qu est ce que tu as remarque|tu as remarque quoi|ce que tu fais tout seul)\b/.test(n)) return () => automatismes(false);
    if (/\b(supprime|efface|arrete|annule|enleve)\b.*\b(automatismes|habitudes)\b/.test(n)) return () => automatismes(true);
    if (/\b(resume de (la|ma) journee|journal (de la journee|du jour)|comment s est passee? (la|ma) journee|bilan de (la|ma) journee|qu est ce qui s est passe aujourd hui|ma journee)\b/.test(n) && !/\b(shadow|mon fils|il|le petit)\b/.test(n)) return () => journal(false);
    if (/\bcoucher (automatique|de 20 h|de 20 heures|du soir)\b/.test(n) && /\b(desactive|coupe|arrete|annule|supprime|enleve)\b/.test(n)) return () => coucherAuto(false);
    if (/\bcoucher (automatique|de 20 h|de 20 heures|du soir)\b/.test(n) && /\b(active|remets|reactive)\b/.test(n)) return () => coucherAuto(true);
    if (/\breveil\b.*\b(ecole|classe)\b|\b(ecole|classe)\b.*\breveil\b/.test(n) && /\b(desactive|coupe|arrete|annule|supprime|enleve)\b/.test(n)) return () => ecole(false);
    if (/\breveil\b.*\b(ecole|classe)\b|\b(ecole|classe)\b.*\breveil\b/.test(n) && /\b(active|remets|rallume|reactive)\b/.test(n)) return () => ecole(true);
    if (/\b(annule|arrete|supprime|enleve|desactive|efface)\b.*\b(mes |le |les |mon )?reveils?\b/.test(n)) return () => reveils(true);
    if (/\b(mes reveils|quels reveils|a quelle heure (je me reveille|tu me reveilles|est mon reveil)|j ai un reveil)\b/.test(n)) return () => reveils(false);
    if (/\b(reveille moi|reveiller|mets un reveil|programme un reveil|regle un reveil|reveil a|reveil pour)\b/.test(n) && /\d/.test(n)) return async () => { const r = await reveil(t, n); if (r === null && typeof OUTILS !== 'undefined') { const o = OUTILS.route(t, n); if (o) return o(); } return r; };
    if (/\b(mes alertes de prix|les alertes de prix|quelles alertes (de prix )?(sont )?(en cours|posees))\b/.test(n) && !/\b(supprime|efface|enleve|annule)\b/.test(n)) return () => prixListe(false);
    if (/\b(supprime|efface|enleve|annule|retire)\b.*\balertes? de prix\b/.test(n)) return () => prixListe(true);
    if (/\b(previens moi|alerte moi|dis moi|averti?s moi|mets une alerte|pose une alerte|alerte)\b.*\b(si|quand|des que|lorsque)\b/.test(n) && INSTR.some(([re]) => re.test(n)) && /\d/.test(t)) return () => prixAlerte(t, n);
    if (/\b(scan (de securite|du perimetre|des cameras)|scanne (le perimetre|la maison|les cameras|les alentours)|protocole (de )?securite|verifie (le perimetre|toutes les cameras|la maison)|tout est en ordre dehors)\b/.test(n)) return scan;
    if (/\b(protocole depart|je pars|on part|je m en vais|on s en va|je sors de la maison|je quitte la maison|mode absent)\b/.test(n) && !/\b(visio|en vacances dans|chez moi ce soir)\b/.test(n) && !/\b(fin|arrete|sors) (du )?mode absent\b/.test(n)) return depart;
    if (/\b(protocole retour|je suis (rentre|de retour|a la maison)|on est (rentres?|de retour)|me revoila|fin du mode absent|mode presence)\b/.test(n)) return retour;
    if (/\b(etat des systemes|etat de tes systemes|diagnostic( complet| du systeme| de la maison)?|rapport systeme|comment vont (tes|les) systemes|statut (des )?systemes|etat de l ordi(nateur)?)\b/.test(n) && !/\bshadow\b/.test(n)) return systemes;
    if (/\b(qui est (a la maison|present|dans la maison)|il y a qui a la maison|qui est rentre|qui est dans la maison|y a quelqu un a la maison|ou est (mon fils|le petit))\b/.test(n)) return presence;
    if (/\b(lance la fusee|lancement de la fusee|decollage|compte a rebours|fais decoller la fusee)\b/.test(n)) return fusee; // avec Shadow s'il est réveillé
    return null;
  }
  return { route, scan, hud, modeCockpit, rapportNuit, commandement };
})();

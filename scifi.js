/* =========================================================
   ATLAS — les protocoles (utiles d'abord, avec l'allure d'un film de science-fiction)
   - « scan de sécurité » / « scanne le périmètre » : une photo fraîche de chaque caméra, celles qui ne répondent pas,
     les alertes des 12 dernières heures, le réseau — affiché comme un écran de contrôle, résumé à la voix.
   - « je pars » / « protocole départ » : en bas tout s'éteint, l'ordi se verrouille, la sentinelle passe en mode absent,
     et il dit quelles caméras veillent (et laquelle ne répond pas).
   - « je suis rentré » / « protocole retour » : la maison s'allume, fin du mode absent, et ce qui s'est passé pendant l'absence.
   - « état des systèmes » / « diagnostic » : l'ordinateur (températures, mémoire, disque), les services de la maison, le réseau.
   - « qui est à la maison ? » : les téléphones, Shadow (réveillé ? il voit le petit ?), les voix entendues, le réseau.
   - « lance la fusée » / « compte à rebours » : 10, 9, 8… la Fusée s'allume au décollage.
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
  const regle = (ids, allume, lum, teinte, pendant) => appel('/maison/commande', Object.assign({ ids, allume }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}, pendant ? { pendant } : {}), 20000);
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
    try { return ((await appel('/maison/alertes?depuis=0', null, 10000)).alertes || []).filter(a => a.at >= depuis && a.gravite !== 'info'); } catch (e) { return null; }
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
    if (f.allume) await regle([f.id], false).catch(() => {});
    sfx('demarrage');
    await say('Séquence de lancement. Tous les systèmes sont prêts. Dix. Neuf. Huit. Sept. Six. Cinq. Quatre. Trois. Deux. Un.');
    await regle([f.id], true).catch(() => {});
    sfx('final');
    if (lum.length) { try { for (const v of [100, 20, 100, 30, 100]) { await regle(lum.map(a => a.id), true, v, 100); await wait(120); } await Promise.all(lum.map(a => regle([a.id], true, a.lum, a.teinte))); } catch (e) { /* tant pis */ } }
    return say('Décollage ! La Fusée a quitté la Terre.');
  }

  function route(t, n) {
    if (/\b(scan (de securite|du perimetre|des cameras)|scanne (le perimetre|la maison|les cameras|les alentours)|protocole (de )?securite|verifie (le perimetre|toutes les cameras|la maison)|tout est en ordre dehors)\b/.test(n)) return scan;
    if (/\b(protocole depart|je pars|on part|je m en vais|on s en va|je sors de la maison|je quitte la maison|mode absent)\b/.test(n) && !/\b(visio|en vacances dans|chez moi ce soir)\b/.test(n) && !/\b(fin|arrete|sors) (du )?mode absent\b/.test(n)) return depart;
    if (/\b(protocole retour|je suis (rentre|de retour|a la maison)|on est (rentres?|de retour)|me revoila|fin du mode absent|mode presence)\b/.test(n)) return retour;
    if (/\b(etat des systemes|etat de tes systemes|diagnostic( complet| du systeme| de la maison)?|rapport systeme|comment vont (tes|les) systemes|statut (des )?systemes|etat de l ordi(nateur)?)\b/.test(n) && !/\bshadow\b/.test(n)) return systemes;
    if (/\b(qui est (a la maison|present|dans la maison)|il y a qui a la maison|qui est rentre|qui est dans la maison|y a quelqu un a la maison|ou est (mon fils|le petit))\b/.test(n)) return presence;
    if (/\b(lance la fusee|lancement de la fusee|decollage|compte a rebours|fais decoller la fusee)\b/.test(n)) return fusee;
    return null;
  }
  return { route, scan, hud };
})();

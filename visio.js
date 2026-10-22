/* =========================================================
   ATLAS — les visios (et les effets qui font de l'effet)
   - « mode visio » : lumière de studio dans le salon, la musique et la radio coupées, plus de notifications sur l'écran,
     et Atlas ne répond plus qu'à son nom (il ne coupe pas la parole aux invités). « fin de la visio » : tout revient comme avant.
   - Les effets, à la caméra : « fondu au noir », « rallume en douceur », « effet orage », « lumière de studio ».
   - « présente-toi à mes invités », « mode science-fiction », « fais ton show » : il présente son inventeur et la maison, en séquence de
     science-fiction (sons, lumières qui parcourent les pièces — jamais les chambres —, caméras en direct) ; en visio, la version courte.
   - « coupe mon micro » / « remets mon micro » (le micro de l'ordi), « montre le graphique de l'or à l'écran ».
   - « [le petit] va se coucher » : sa musique, la Fusée et sa lumière à 15 % pendant 15 minutes, puis tout s'éteint tout seul.
   - « je viens de me réveiller » : la maison s'allume (jamais les chambres) et le briefing du matin.
   - « je vais me coucher » : en bas tout s'éteint (jamais les chambres), l'escalier éclairé 5 minutes, la musique coupée, la sentinelle
     en garde de nuit tout de suite, l'ordi verrouillé et l'écran noir.
   ========================================================= */
'use strict';

const VISIO = (() => {
  const PIECE = /\bsalon\b/; // la pièce des visios (choisie par papa)
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 15000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return await r.json();
    } finally { clearTimeout(tm); }
  }
  const lampes = async () => ((await appel('/maison/appareils', null, 15000)).appareils || []).filter(a => a.type === 'lampe' && a.allume != null);
  // pendant : en secondes, puis l'ordinateur de la maison éteint tout seul (même si le téléphone est fermé)
  const regle = (ids, allume, lum, teinte, pendant) => appel('/maison/commande', Object.assign({ ids, allume }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}, pendant ? { pendant } : {}), 20000);
  const pc = d => appel('/maison/pc', d);
  // lesquelles : celles qu'on nomme, sinon celles qui sont allumées, sinon le salon
  async function cibles(t, salonDabord) {
    const l = await lampes();
    const nommees = l.filter(a => N(t).split(' ').some(w => w.length > 3 && N(a.nom).split(' ').includes(w)));
    if (nommees.length) return nommees;
    const salon = l.filter(a => PIECE.test(N(a.nom)));
    if (salonDabord && salon.length) return salon;
    const on = l.filter(a => a.allume);
    return on.length ? on : salon.length ? salon : l.slice(0, 1);
  }

  /* ---------- les effets ---------- */
  async function fondu(t, sens) {
    let l; try { l = await cibles(t, false); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!l.length) return say("Je n'ai pas de lumière réglable.");
    const ids = l.map(a => a.id);
    const pas = sens === 'noir' ? [80, 60, 42, 28, 17, 9, 4, 1] : [1, 4, 9, 17, 28, 42, 60, 80, 100];
    try {
      for (const v of pas) { await regle(ids, true, v, sens === 'noir' ? undefined : Math.min(55, v / 2)); await wait(220); }
      if (sens === 'noir') await regle(ids, false);
    } catch (e) { return say("La lumière ne suit pas."); }
    return sens === 'noir' ? undefined : say(pick(['Et la lumière revint.', 'Bonjour le soleil.']));
  }
  async function orage(t) {
    let l; try { l = await cibles(t, false); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!l.length) return say("Je n'ai pas de lumière réglable.");
    const ids = l.map(a => a.id), avant = l.map(a => ({ id: a.id, allume: a.allume, lum: a.lum, teinte: a.teinte }));
    fx.tone([[90, 0.5], [60, 0.9]]); // un grondement
    try {
      for (const [on, ms] of [[false, 300], [true, 90], [false, 140], [true, 60], [false, 700], [true, 120], [false, 90], [true, 60], [false, 500]]) {
        await regle(ids, on, on ? 100 : undefined, on ? 100 : undefined); await wait(ms);
      }
      for (const a of avant) await regle([a.id], a.allume, a.allume ? a.lum : undefined, a.allume ? a.teinte : undefined);
    } catch (e) { return say("L'orage s'est calmé tout seul."); }
    return say(pick(["L'orage est passé.", 'Fin de la tempête.']));
  }
  async function studio(t, muet) {
    let l; try { l = await cibles(t, true); } catch (e) { return muet ? null : say("L'ordinateur de la maison ne répond pas."); }
    if (!l.length) return muet ? null : say("Je n'ai pas de lumière réglable.");
    try { await regle(l.map(a => a.id), true, 100, 45); } catch (e) { return muet ? null : say("La lumière ne suit pas."); }
    return muet ? null : say('Lumière de studio.');
  }

  /* ---------- le mode visio ---------- */
  async function visio(oui) {
    if (oui) {
      let l = []; try { l = await lampes(); } catch (e) { /* tant pis */ }
      S.visio = { at: Date.now(), lampes: l.map(a => ({ id: a.id, allume: a.allume, lum: a.lum, teinte: a.teinte })), conversation: S.settings.conversation, proactif: S.settings.proactif };
      S.settings.conversation = false; S.settings.proactif = false; save(); // il ne coupe pas la parole aux invités
      await Promise.all([studio('', true), pc({ action: 'musique', quoi: 'pause' }).catch(() => {}), pc({ action: 'radio_stop' }).catch(() => {}), pc({ action: 'nepasderanger', oui: true }).catch(() => {})]);
      fx.ok();
      return say("Mode visio : lumière de studio dans le salon, la musique coupée, plus aucune notification sur l'écran. Je ne parle que si on m'appelle par mon nom. Bonne visio.");
    }
    const v = S.visio;
    if (v) {
      S.settings.conversation = v.conversation; S.settings.proactif = v.proactif;
      for (const a of v.lampes || []) { try { await regle([a.id], a.allume, a.allume ? a.lum : undefined, a.allume ? a.teinte : undefined); } catch (e) { /* tant pis */ } }
    }
    S.visio = null; save();
    try { await pc({ action: 'nepasderanger', oui: false }); } catch (e) { /* tant pis */ }
    fx.ok();
    return say(v ? "Fin de la visio : les lumières sont comme avant, et les notifications reviennent." : "Les notifications sont revenues.");
  }

  /* ---------- le spectacle : « présente-toi à mes invités » (à la maison : la grande séquence ; en visio : la version courte) ---------- */
  // des sons de science-fiction, fabriqués sur place (aucun fichier)
  function sfx(quoi) {
    if (!S.settings.sound) return;
    try {
      const c = fx.audio(), t0 = c.currentTime, out = c.createGain(); out.gain.value = 0.16; out.connect(c.destination);
      const note = (type, f1, f2, debut, duree, vol, filtre) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = type;
        o.frequency.setValueAtTime(f1, t0 + debut); o.frequency.exponentialRampToValueAtTime(f2, t0 + debut + duree);
        g.gain.setValueAtTime(0.0001, t0 + debut); g.gain.exponentialRampToValueAtTime(vol, t0 + debut + Math.min(0.4, duree / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + debut + duree);
        let n = o; if (filtre) { const b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.setValueAtTime(filtre[0], t0 + debut); b.frequency.exponentialRampToValueAtTime(filtre[1], t0 + debut + duree); o.connect(b); n = b; }
        n.connect(g); g.connect(out); o.start(t0 + debut); o.stop(t0 + debut + duree + 0.05);
      };
      if (quoi === 'demarrage') { // un réacteur qui s'allume : un grondement qui monte, puis des carillons
        note('sawtooth', 45, 180, 0, 3.2, 0.5, [120, 2400]); note('sawtooth', 45.5, 181, 0, 3.2, 0.35, [120, 2400]);
        [523, 659, 784, 1047, 1319].forEach((f, k) => note('sine', f, f, 2.6 + k * 0.12, 1.4, 0.25));
      } else if (quoi === 'scan') { // un balayage, des bips
        note('square', 1800, 2600, 0, 0.5, 0.06, [3000, 1500]); [0.55, 0.75, 0.95].forEach(d => note('sine', 1568, 1568, d, 0.12, 0.2));
      } else if (quoi === 'final') { // un accord qui s'ouvre
        [261.6, 329.6, 392, 523.3, 784].forEach(f => note('sawtooth', f, f, 0, 3.5, 0.12, [300, 4000]));
      }
    } catch (e) { /* pas de son */ }
  }
  const inventeur = () => {
    const enfant = N((typeof LIEN !== 'undefined' && LIEN.prenom()) || '');
    if (S.nom) return S.nom;
    if (dlg.qui && !/^invit/i.test(dlg.qui) && N(dlg.qui) !== enfant) return dlg.qui;
    const v = (typeof VOIX !== 'undefined' ? VOIX.people() : []).map(p => p.name).find(x => !/^invit/i.test(x) && N(x) !== enfant);
    return v || '';
  };
  const remets = async avant => { for (const a of avant) { try { await regle([a.id], a.allume, a.allume ? a.lum : undefined, a.allume ? a.teinte : undefined); } catch (e) { /* tant pis */ } } };
  async function cameras() {
    const l = [];
    try { (await appel('/maison/ezviz', null, 8000)).cameras.forEach(c => l.push(c.nom)); } catch (e) { /* rien */ }
    try { ((await appel('/maison/cameras', null, 8000)).cameras || []).forEach(c => l.push(c.nom.charAt(0).toUpperCase() + c.nom.slice(1))); } catch (e) { /* rien */ }
    return l;
  }
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  async function spectacle(t, n) {
    const enVisio = !!S.visio || /\b(visio|collegues|clients|reunion|en ligne|participants)\b/.test(n || '');
    // les deux inventeurs : papa et son fils
    const nom = inventeur(), enfant = (typeof LIEN !== 'undefined' && LIEN.prenom()) || '';
    const deux = !!(nom && enfant);
    const inventeurs = deux ? `${nom} et ${enfant}, mes deux inventeurs` : nom ? `${nom}, mon inventeur` : 'mon inventeur';
    const ont = deux ? 'qui m\'ont' : 'qui m\'a', ils = deux ? 'Ils m\'ont' : 'Il m\'a';
    let l = []; try { l = await lampes(); } catch (e) { /* sans lumières, il parle quand même */ }
    const avant = l.map(a => ({ id: a.id, allume: a.allume, lum: a.lum, teinte: a.teinte }));
    const salon = l.filter(a => PIECE.test(N(a.nom))), sIds = salon.map(a => a.id);
    // jamais les chambres (quelqu'un dort peut-être)
    const pieces = l.filter(a => !/\bchambres?\b/.test(N(a.nom))).sort((a, b) => (PIECE.test(N(a.nom)) ? 1 : 0) - (PIECE.test(N(b.nom)) ? 1 : 0));
    const pIds = pieces.map(a => a.id);
    const essaie = async f => { try { await f(); } catch (e) { /* la lumière ne suit pas : le spectacle continue */ } };

    if (enVisio) {
      sfx('demarrage');
      if (sIds.length) await essaie(async () => { for (const v of [70, 40, 15]) { await regle(sIds, true, v, 0); await wait(250); } });
      await wait(1800);
      await say(`Bonjour à tous. Non, je ne suis pas un effet spécial. Je m'appelle Atlas : je suis l'intelligence artificielle de cette maison. Ce sont ${inventeurs}, ${ont} imaginé, puis construit de A à Z.`.replace('Ce sont ' + inventeurs + ', qui m\'a', 'C\'est ' + inventeurs + ', qui m\'a'));
      if (sIds.length) await essaie(async () => { for (const v of [40, 75, 100, 60, 100]) { await regle(sIds, true, v, 45); await wait(180); } });
      await say("Je pilote la maison : la lumière derrière lui, par exemple. Je surveille ses caméras, je suis les marchés en temps réel, je lis ses mails, et je commande son ordinateur, à la voix.");
      sfx('scan');
      await say('Rassurez-vous : ce que j\'entends pendant cette réunion reste ici. Je vous le laisse. Bonne réunion à tous.');
      sfx('final');
      if (!S.visio) { await wait(1500); await remets(avant.filter(a => sIds.includes(a.id))); }
      return;
    }

    // à la maison : la grande séquence
    sfx('demarrage');
    if (pIds.length) await essaie(async () => { for (const v of [60, 30, 10]) { await regle(pIds, true, v, 0); await wait(220); } await regle(pIds, false); });
    await wait(1500);
    await say('Séquence de présentation. Initialisation.');
    sfx('scan'); await wait(1200);
    await say(`Bonsoir à tous. Je m'appelle Atlas. Je suis l'intelligence de cette maison. Il y a encore quelques semaines, je n'existais pas. ${deux ? 'Ce sont' : 'C\'est'} ${inventeurs}, ${ont} imaginé, puis construit, ligne après ligne, ici même. ${ils} donné une voix, des yeux, et une mission : veiller sur cette maison, et sur tous ceux qui l'habitent.`);
    await say("Laissez-moi vous montrer. D'abord : la lumière.");
    if (pIds.length) await essaie(async () => {
      for (const a of pieces) { await regle([a.id], true, 100, 70); await wait(450); } // les pièces s'allument une à une
      await wait(300); await regle(pIds, false); await wait(500);
      await regle(pIds, true, 100, 100); await wait(400); // un flash, toutes ensemble
      for (const v of [70, 45, 30]) { await regle(pIds, true, v, 10); await wait(200); }
    });
    const cams = await cameras();
    sfx('scan');
    await say(`Ensuite : mes yeux. ${cams.length ? `En ce moment, ${cams.length} caméras veillent sur la maison : ${liste(cams)}. ` : ''}Le jour, je vous les montre en direct, avec le son. La nuit, pendant que tout le monde dort, ma sentinelle analyse chaque mouvement, chaque bruit, chaque appareil qui ose se connecter au réseau. Et si quelque chose ne va pas, je réveille ${nom || 'mon inventeur'}.`);
    await say("Je suis aussi connecté au reste du monde : je suis les marchés à la seconde, je lis ses mails, je pilote son ordinateur, sa musique, la radio. Il me suffit d'une phrase.");
    await say(`Et je ne suis pas seul. J'ai un petit frère : Shadow, le robot ${enfant ? `de ${enfant}` : 'de la famille'}. ${deux ? 'Lui aussi, ils l\'ont inventé ensemble, tous les deux.' : `Lui aussi, c'est ${nom || 'mon inventeur'} qui l'a créé.`} Nous nous parlons, lui et moi, tous les jours.`);
    await say('Mais assez parlé de moi. Ce soir, vous êtes les invités de cette maison. Bienvenue.');
    sfx('final');
    if (pIds.length) await essaie(async () => { for (const v of [35, 50, 65]) { await regle(sIds.length ? sIds : pIds, true, v, 0); await wait(250); } });
    await wait(1200);
    await remets(avant.filter(a => pIds.includes(a.id) && !sIds.includes(a.id))); // les pièces du spectacle comme avant (les chambres n'ont jamais bougé) ; le salon en lumière chaude, pour la soirée
  }

  /* ---------- le micro de l'ordi, un graphique à l'écran ---------- */
  async function micro(muet) {
    let r; try { r = await pc({ action: 'micro', muet }); } catch (e) { return say("L'ordinateur ne répond pas."); }
    if (!r.ok) return say("Je n'arrive pas à régler le micro.");
    fx.ok(); return say(r.muet ? "Micro de l'ordi coupé : on ne t'entend plus." : "Micro de l'ordi rallumé : on t'entend.");
  }
  const SYMB = [[/\bl or\b|\bde l or\b|\bgold\b/, 'or', "l'or"], [/\bl argent\b|\bsilver\b/, 'argent', "l'argent"], [/\bcuivre\b/, 'cuivre', 'le cuivre'], [/\beuro dollar\b|\beurusd\b/, 'euro dollar', "l'euro-dollar"],
    [/\bbitcoin\b/, 'bitcoin', 'le bitcoin'], [/\bnasdaq\b/, 'nasdaq', 'le Nasdaq'], [/\bs ?p ?500\b|\bsp500\b/, 'sp500', 'le S&P 500'], [/\bcac( 40)?\b/, 'cac 40', 'le CAC 40'], [/\bdax\b/, 'dax', 'le DAX'], [/\bpetrole\b/, 'petrole', 'le pétrole'], [/\bdow jones\b/, 'dow jones', 'le Dow Jones']];
  async function graphique(cle, nom) {
    let r; try { r = await pc({ action: 'graphique', cle }); } catch (e) { return say("L'ordinateur ne répond pas."); }
    if (!r.ok) return say("Le graphique ne s'ouvre pas.");
    fx.ok(); return say(`Voilà ${nom}, en grand sur l'écran.`);
  }

  /* ---------- « je vais me coucher » : la maison se met en nuit ---------- */
  async function coucher() {
    let l = []; try { l = (await appel('/maison/appareils', null, 15000)).appareils || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas. Bonne nuit quand même."); }
    const enfant = N((typeof LIEN !== 'undefined' && LIEN.prenom()) || '');
    // en bas, tout s'éteint ; jamais les chambres (ni celle du petit, ni la tienne : tu y vas) ; la télé aussi
    const eteindre = l.filter(a => a.allume && ((a.type === 'lampe' && !/\bchambres?\b/.test(N(a.nom))) || /\b(tele|television|tv)\b/.test(N(a.nom))));
    // les escaliers (tous les étages) et la salle de bain restent éclairés 5 minutes — le temps de se brosser les dents — puis s'éteignent tout seuls
    const escaliers = l.filter(a => a.type === 'lampe' && /\bescaliers?\b/.test(N(a.nom)));
    const bain = l.filter(a => a.type === 'lampe' && /\b(salle de bains?|sdb|salle d eau)\b/.test(N(a.nom)));
    const escalier = escaliers[0] || bain[0];
    try {
      const garde = new Set([...escaliers, ...bain]);
      const ids = eteindre.filter(a => !garde.has(a)).map(a => a.id);
      if (ids.length) await regle(ids, false);
      if (escaliers.length) await regle(escaliers.map(a => a.id), true, 25, 0, 300);
      if (bain.length) await regle(bain.map(a => a.id), true, 70, 30, 300);
    } catch (e) { /* tant pis */ }
    await Promise.all([pc({ action: 'musique', quoi: 'pause' }).catch(() => {}), pc({ action: 'radio_stop' }).catch(() => {}), appel('/maison/sentinelle', { dodo: true }).catch(() => {})]);
    let cams = 0; try { cams = ((await appel('/maison/ezviz', null, 8000)).cameras || []).length + ((await appel('/maison/cameras', null, 8000)).cameras || []).length; } catch (e) { /* rien */ }
    fx.ok();
    await say(`Bonne nuit. ${eteindre.length ? 'Tout est éteint en bas' : 'Rien n\'était resté allumé en bas'}${escalier ? `, je te laisse ${[escaliers.length ? "l'escalier" : '', bain.length ? 'la salle de bain' : ''].filter(Boolean).join(' et ')} allumé${escaliers.length && bain.length ? 's' : ''} 5 minutes` : ''}. La sentinelle passe en garde de nuit${cams ? ` avec ${cams} caméras` : ''} : si quelque chose ne va pas, je te réveille sur ton téléphone.`);
    // l'ordi : verrouillé, écran noir (après avoir parlé)
    try { await pc({ action: 'verrouille' }); await wait(1500); await pc({ action: 'ecran' }); } catch (e) { /* tant pis */ }
    dlg.state = 'standby'; face.set('idle');
  }

  /* ---------- « [le petit] va se coucher » : sa musique, la Fusée et sa lumière à 15 %, un quart d'heure ---------- */
  const prenomEnfant = () => (typeof LIEN !== 'undefined' && LIEN.prenom()) || '';
  async function coucherEnfant() {
    let l = []; try { l = (await appel('/maison/appareils', null, 15000)).appareils || []; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const p = N(prenomEnfant());
    const lampe = l.find(a => a.type === 'lampe' && p && N(a.nom).split(' ').includes(p));
    const prises = l.filter(a => a.type !== 'lampe' && /\b(musique|fusee)\b/.test(N(a.nom)));
    const ok = [], rien = [];
    try {
      if (lampe) { const r = await regle([lampe.id], true, 15, 0, 900); (r.resultats || []).some(x => x.ok) ? ok.push('sa lumière à 15 %') : rien.push('sa lumière'); }
      if (prises.length) { const r = await regle(prises.map(a => a.id), true, null, null, 900); prises.forEach(a => ((r.resultats || []).find(x => x.id === a.id && x.ok) ? ok : rien).push(/fusee/.test(N(a.nom)) ? 'la Fusée' : 'sa musique')); }
    } catch (e) { return say("La commande n'est pas passée : l'ordinateur ne répond pas."); }
    if (!ok.length) return say(rien.length ? `${rien.join(' et ')} ne répondent pas.` : "Je ne trouve ni sa lumière, ni sa musique, ni la Fusée.");
    fx.ok();
    const liste = x => (x.length > 1 ? `${x.slice(0, -1).join(', ')} et ${x[x.length - 1]}` : x[0]);
    return say(`C'est parti pour le coucher de ${prenomEnfant() || 'ton fils'} : ${liste(ok)}, pendant un quart d'heure. Ensuite, tout s'éteint tout seul.${rien.length ? ` ${liste(rien)} ne répond pas.` : ''}`);
  }

  /* ---------- « je viens de me réveiller » : la maison s'allume (jamais les chambres : le petit dort peut-être) ---------- */
  async function reveil() {
    let l = []; try { l = await lampes(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const bas = l.filter(a => !/\bchambres?\b/.test(N(a.nom)));
    appel('/maison/sentinelle', { dodo: false }).catch(() => {}); // fin de la garde de nuit anticipée
    let r = null; try { if (bas.length) r = await regle(bas.map(a => a.id), true, 85, 70); } catch (e) { /* tant pis */ }
    const allumees = r ? (r.resultats || []).filter(x => x.ok).length : 0;
    fx.ok();
    let brief = ''; try { if (typeof PROACTIF !== 'undefined') { brief = await PROACTIF.briefMatin(); if (typeof dayKey === 'function') { S.matinFait = dayKey(); save(); } } } catch (e) { /* pas de briefing */ }
    const h = new Date().getHours();
    return say(`${h < 18 ? 'Bonjour' : 'Bonsoir'} ! ${allumees ? 'La maison s\'allume.' : 'Je n\'ai pas pu allumer la maison.'}${brief ? ` ${brief}` : ''}`);
  }

  function route(t, n) {
    const p = N(prenomEnfant());
    if (!/\bchez\b/.test(n) && p && new RegExp(`\\b${p}\\b.*\\b(va|part|file|monte) (se coucher|au lit|dormir|au dodo)\\b|\\bc est l heure (du coucher|d aller au lit) (de|pour) ${p}\\b|\\bcoucher de ${p}\\b`).test(n) || !/\bchez\b/.test(n) && /\b(mon fils|le petit|mon bonhomme|mon garcon) (va|part|file|monte) (se coucher|au lit|dormir|au dodo)\b/.test(n)) return coucherEnfant;
    if (/\b(je viens de me (reveiller|lever)|je suis (reveille|leve|debout)|je me leve|je me reveille|c est le matin|allume la maison|reveille la maison|debout la maison)\b/.test(n)) return reveil;
    if (!/\bchez\b/.test(n) && /\b(je (vais|pars|monte|file) (me coucher|dormir|au lit|au dodo)|je (me couche|vais au lit)|on (va|part) (se coucher|dormir)|on se couche|c est l heure de dormir|bonne nuit (atlas|la maison|tout le monde))\b/.test(n)) return coucher;
    if (/\b(mode visio|mode visioconference|je (suis|vais etre|passe|pars) en visio|je commence (une|ma) visio|j ai une visio|on commence la visio)\b/.test(n) && !/\b(fin|sors|arrete|quitte)\b/.test(n)) return () => visio(true);
    if (/\b(fin (du mode |de la |de ma )?visio|j ai fini (la|ma) visio|la visio est (finie|terminee)|sors du mode visio|arrete le mode visio|quitte le mode visio)\b/.test(n)) return () => visio(false);
    if (/\b(presente toi|dis bonjour|salue)\b.*\b(invites|amis|collegues|clients|tout le monde|a tous|la compagnie|participants)\b/.test(n) || /\b(mode science fiction|sequence de presentation|fais (le|ton) (show|spectacle)|fais ta demo|montre leur ce que tu sais faire|montre (a|aux) (mes |nos )?invites ce que tu sais faire)\b/.test(n)) return () => spectacle(t, n);
    if (/\b(fondu au noir|fondu a noir|fondu noir|eteins en douceur|eteins doucement|eteins les lumieres doucement|baisse doucement|fais le noir)\b/.test(n)) return () => fondu(t, 'noir');
    if (/\b(rallume en douceur|allume en douceur|allume doucement|rallume doucement|lever de soleil|leve le soleil|que la lumiere soit)\b/.test(n) || (/\bdouceur\b/.test(n) && /^(ral|ra |re|al)/.test(n) && n.split(' ').length <= 5 && !/\b(eteins|baisse)\b/.test(n))) return () => fondu(t, 'jour'); // « Rallez mon douceur »
    if (/\b(effet orage|effet eclair|fais un eclair|fais l orage|fais un orage|fais clignoter)\b/.test(n) || (/\b(orage|orages|eclairs?)\b/.test(n) && n.split(' ').length <= 5 && !/\b(va|risque|prevu|demain|meteo|y a|il y)\b/.test(n))) return () => orage(t); // « est fait orage »
    if (/\b(effet projecteur|mode projecteur|lumiere de studio|mode studio|eclaire moi|mets moi en lumiere)\b/.test(n)) return () => studio(t);
    if (/\b(coupe|desactive|eteins|mute) (mon|le) micro\b/.test(n)) return () => micro(true);
    if (/\b(remets|rallume|reactive|active|ouvre) (mon|le) micro\b/.test(n)) return () => micro(false);
    if (/\b(graphique|chart|cours|courbe)\b/.test(n) && /\b(a l ecran|sur l ecran|sur l ordi|en grand|sur tradingview|sur le grand ecran)\b/.test(n)) {
      const s = SYMB.find(([re]) => re.test(n));
      if (s) return () => graphique(s[1], s[2]);
    }
    return null;
  }
  const qui = () => { const a = inventeur(), b = (typeof LIEN !== 'undefined' && LIEN.prenom()) || ''; return a && b ? `${a} et ${b}` : a || b; };
  return { route, visio, sfx, actif: () => !!S.visio, inventeurs: qui };
})();

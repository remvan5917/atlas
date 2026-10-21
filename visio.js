/* =========================================================
   ATLAS — les visios (et les effets qui font de l'effet)
   - « mode visio » : lumière de studio dans le salon, la musique et la radio coupées, plus de notifications sur l'écran,
     et Atlas ne répond plus qu'à son nom (il ne coupe pas la parole aux invités). « fin de la visio » : tout revient comme avant.
   - Les effets, à la caméra : « fondu au noir », « rallume en douceur », « effet orage », « lumière de studio ».
   - « présente-toi à mes invités » : il se présente, et les lumières jouent avec lui.
   - « coupe mon micro » / « remets mon micro » (le micro de l'ordi), « montre le graphique de l'or à l'écran ».
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
  const regle = (ids, allume, lum, teinte) => appel('/maison/commande', Object.assign({ ids, allume }, lum != null ? { lum } : {}, teinte != null ? { teinte } : {}), 20000);
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

  /* ---------- le spectacle : « présente-toi à mes invités » ---------- */
  async function spectacle() {
    let l = []; try { l = await cibles('', true); } catch (e) { /* sans lumières, il parle quand même */ }
    const ids = l.map(a => a.id), avant = l.map(a => ({ id: a.id, allume: a.allume, lum: a.lum, teinte: a.teinte }));
    const moi = S.nom || '';
    await say(`Bonsoir à tous. Je suis Atlas, l'assistant de cette maison${moi ? `, et de ${moi}` : ''}. Je vois que nous avons des invités : laissez-moi installer l'ambiance.`);
    if (ids.length) { try { for (const v of [80, 55, 35, 20]) { await regle(ids, true, v, 0); await wait(250); } } catch (e) { /* tant pis */ } }
    await say("Voilà, c'est mieux. Je règle les lumières, je surveille les caméras jour et nuit, je suis les marchés à la seconde, et je lis même ses mails. Rassurez-vous : je garde ses secrets.");
    if (ids.length) { try { for (const v of [35, 60, 85, 100]) { await regle(ids, true, v, 45); await wait(200); } } catch (e) { /* tant pis */ } }
    await say('Et la lumière revient. Bonne réunion à tous.');
    if (S.visio == null && avant.length) { await wait(1500); for (const a of avant) { try { await regle([a.id], a.allume, a.allume ? a.lum : undefined, a.allume ? a.teinte : undefined); } catch (e) { /* tant pis */ } } }
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

  function route(t, n) {
    if (/\b(mode visio|mode visioconference|je (suis|vais etre|passe|pars) en visio|je commence (une|ma) visio|j ai une visio|on commence la visio)\b/.test(n) && !/\b(fin|sors|arrete|quitte)\b/.test(n)) return () => visio(true);
    if (/\b(fin (du mode |de la |de ma )?visio|j ai fini (la|ma) visio|la visio est (finie|terminee)|sors du mode visio|arrete le mode visio|quitte le mode visio)\b/.test(n)) return () => visio(false);
    if (/\b(presente toi|dis bonjour|salue)\b.*\b(invites|amis|collegues|clients|tout le monde|a tous|la compagnie)\b/.test(n)) return spectacle;
    if (/\b(fondu au noir|eteins en douceur|eteins doucement|eteins les lumieres doucement|baisse doucement|fais le noir)\b/.test(n)) return () => fondu(t, 'noir');
    if (/\b(rallume en douceur|allume en douceur|allume doucement|rallume doucement|lever de soleil|leve le soleil|que la lumiere soit)\b/.test(n)) return () => fondu(t, 'jour');
    if (/\b(effet orage|effet eclair|fais un eclair|fais l orage|un orage|fais clignoter)\b/.test(n)) return () => orage(t);
    if (/\b(effet projecteur|mode projecteur|lumiere de studio|mode studio|eclaire moi|mets moi en lumiere)\b/.test(n)) return () => studio(t);
    if (/\b(coupe|desactive|eteins|mute) (mon|le) micro\b/.test(n)) return () => micro(true);
    if (/\b(remets|rallume|reactive|active|ouvre) (mon|le) micro\b/.test(n)) return () => micro(false);
    if (/\b(graphique|chart|cours|courbe)\b/.test(n) && /\b(a l ecran|sur l ecran|sur l ordi|en grand|sur tradingview|sur le grand ecran)\b/.test(n)) {
      const s = SYMB.find(([re]) => re.test(n));
      if (s) return () => graphique(s[1], s[2]);
    }
    return null;
  }
  return { route, visio, actif: () => !!S.visio };
})();

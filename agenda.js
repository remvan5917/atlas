/* =========================================================
   ATLAS — ton Google Agenda (lecture seule, par l'adresse iCal secrète gardée sur l'ordinateur de la maison)
   - « qu'est-ce que j'ai aujourd'hui / demain / cette semaine ? », « mon prochain rendez-vous », « mon agenda »
   - L'ordinateur prévient 1 heure et 15 minutes avant chaque rendez-vous (notification + voix), même Atlas fermé.
   - Les rendez-vous du jour s'affichent dans la salle de commandement du matin, et à l'accueil quand tu rentres.
   ========================================================= */
'use strict';

const AGENDA = (() => {
  async function appel(chemin, ms = 15000) {
    const r0 = VOIXMAISON.root(); if (!r0) throw new Error('pas de maison');
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const hm = s => { const d = new Date(s * 1000); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`.replace(' h 00', ' h'); };
  const jourDe = s => new Date(s * 1000).toDateString();
  const nomJour = s => { const d = new Date(s * 1000), auj = new Date(), dem = new Date(Date.now() + 86400000); return d.toDateString() === auj.toDateString() ? "aujourd'hui" : d.toDateString() === dem.toDateString() ? 'demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }); };
  const propre = t => String(t || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim(); // sans emoji : la voix les lirait
  const un = e => (e.journee ? `${propre(e.titre)}, toute la journée` : `${propre(e.titre)} à ${hm(e.debut)}${e.lieu ? `, ${e.lieu.split(',')[0]}` : ''}`);
  async function lire(jours = 7) { return appel(`/maison/agenda?jours=${jours}`, 12000); }

  // pour la salle de commandement et l'accueil : les rendez-vous qui restent aujourd'hui
  async function aujourdhui() {
    try {
      const r = await lire(1); const now = Date.now() / 1000, auj = new Date().toDateString();
      return (r.evenements || []).filter(e => jourDe(e.debut) === auj && (e.journee || e.fin > now));
    } catch (e) { return []; }
  }
  async function prochain() {
    try { const r = await lire(7); return (r.evenements || []).find(e => !e.journee && e.debut > Date.now() / 1000) || null; } catch (e) { return null; }
  }

  async function dire(n) {
    let r; try { r = await lire(/\bsemaine\b/.test(n) ? 7 : 2); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.relie) return say("Ton agenda n'est pas encore relié. Sur l'ordinateur, lance le petit script agenda-connecter, et colle l'adresse secrète iCal de ton Google Agenda.");
    if (r.erreur) return say("Je n'arrive pas à lire ton agenda en ce moment. Je réessaie dans quelques minutes.");
    const now = Date.now() / 1000, l = (r.evenements || []).filter(e => e.journee ? e.fin > now : e.fin > now);
    if (/\bprochain\b/.test(n)) {
      const p = l.find(e => !e.journee && e.debut > now);
      return say(p ? `Ton prochain rendez-vous : ${propre(p.titre)}, ${nomJour(p.debut)} à ${hm(p.debut)}${p.lieu ? `, à ${p.lieu.split(',')[0]}` : ''}.` : 'Aucun rendez-vous prévu dans les sept prochains jours.');
    }
    const quand = /\bdemain\b/.test(n) ? 'demain' : /\bsemaine\b/.test(n) ? 'semaine' : 'aujourd hui';
    const dem = new Date(Date.now() + 86400000).toDateString(), auj = new Date().toDateString();
    const sel = quand === 'semaine' ? l : l.filter(e => jourDe(e.debut) === (quand === 'demain' ? dem : auj));
    try { SCIFI.hud(quand === 'semaine' ? 'Agenda · 7 jours' : `Agenda · ${quand === 'demain' ? 'demain' : "aujourd'hui"}`, sel.slice(0, 12).map(e => [quand === 'semaine' ? `${nomJour(e.debut)} ${e.journee ? '' : hm(e.debut)}` : e.journee ? 'journée' : hm(e.debut).replace(' h ', ':'), e.titre.slice(0, 40), 'ok'])); } catch (e) { /* pas d'écran */ }
    const lib = quand === 'semaine' ? 'Cette semaine' : quand === 'demain' ? 'Demain' : "Aujourd'hui";
    if (!sel.length) return say(`${lib}, rien dans ton agenda.`);
    if (quand === 'semaine') return say(`${lib}, ${sel.length} rendez-vous : ${sel.slice(0, 8).map(e => `${nomJour(e.debut)}, ${un(e)}`).join(' ; ')}.`);
    return say(`${lib}, tu as ${sel.length > 1 ? `${sel.length} rendez-vous` : 'un rendez-vous'} : ${sel.map(un).join(' ; ')}.`);
  }

  function route(t, n) {
    if (/\b(ouvre|lance|affiche sur l ordi)\b/.test(n)) return null; // « ouvre mon agenda » : le site, sur l'ordinateur (pc.js)
    if (/\b(mon agenda|mes rendez vous|mes rdv|mon planning|mon programme|mon emploi du temps|mon prochain (rendez vous|rdv)|qu est ce que j ai (de prevu )?(aujourd hui|demain|cette semaine|ce matin|cet apres midi|ce soir)|j ai quoi (de prevu )?(aujourd hui|demain|cette semaine)|j ai (un|des) (rendez vous|rdv)|c est quand mon (rendez vous|rdv))\b/.test(n)) return () => dire(n);
    return null;
  }
  return { route, aujourdhui, prochain, un, hm, propre };
})();

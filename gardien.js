// Les cinq gardiens : les colis, le mode voyage, le sommeil écouté, les fuites de données, l'ange gardien.
// Le travail se fait sur l'ordinateur de la maison (la sentinelle) ; ici, la voix et l'écran.
//  - « mes colis », « qu'est-ce que j'attends ? » : ce que les mails annoncent (lus en lecture seule) ; la caméra reconnaît le livreur.
//  - « je pars en vacances 5 jours à Biarritz » : mode absent, réveils et courses en pause, la valise selon la météo du lieu,
//    un résumé chaque soir à 21 h sur le téléphone ; « je suis rentré » : la fin du voyage et ce qui s'est passé.
//  - « comment j'ai dormi ? » : la nuit écoutée par l'appareil de ta chambre (le niveau sonore seulement, jamais le son).
//  - « vérifie mes fuites de données » : Have I Been Pwned, avec ta clé.
//  - l'ange gardien : sans signe de toi pendant 24 h (48 h en voyage), il te demande si tout va bien ; sans réponse,
//    il prévient ta personne de confiance (seulement si tu l'as autorisé). « je vais bien » le rassure.
const GARDIEN = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(chemin, corps, ms = 20000) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(`${r0}${chemin}`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store', signal: ctl.signal });
      if (!r.ok) throw new Error(`maison ${r.status}`);
      return r.json();
    } finally { clearTimeout(tm); }
  }
  const hors = () => say("L'ordinateur de la maison ne répond pas.");
  const jourFr = ts => new Date(ts * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const heureFr = ts => new Date(ts * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const carte = (titre, lignes) => showBoard(`<div style="font-family:system-ui;min-width:min(86vw,520px);padding:10px 6px"><div style="font-size:13px;letter-spacing:.3em;color:#FFdd00;margin-bottom:10px">${esc(titre)}</div>${lignes.map(l => `<div style="padding:7px 0;border-top:1px solid rgba(255,255,255,.08);font-size:16px">${l}</div>`).join('')}</div>`);

  /* ---------- l'état du voyage, partagé par tous les appareils (la tablette fait les rituels) ---------- */
  let voyage = {};
  async function relitVoyage() { try { voyage = await appel('/maison/voyage', null, 8000) || {}; } catch (e) { /* rien */ } }
  window.enVoyage = () => !!(voyage.actif && Date.now() / 1000 < (voyage.fin || 0) + 2 * 86400);
  setTimeout(relitVoyage, 4000); setInterval(relitVoyage, 10 * 60000);

  /* =================== 1. les colis =================== */
  async function colis() {
    let j; try { j = await appel('/maison/colis'); } catch (e) { return hors(); }
    const l = (j.colis || []).filter(c => c.statut !== 'livre' || Date.now() / 1000 - c.maj < 86400);
    if (!l.length) return say(j.releve ? "Aucun colis en route d'après tes mails." : "Je n'ai pas encore lu tes mails de commande : redemande-moi dans quelques minutes.");
    const st = { commande: 'commandé', expedie: 'expédié', en_livraison: 'en livraison', point_relais: 'au point relais', livre: 'livré' };
    const quand = c => c.date_prevue ? ` · prévu le ${new Date(c.date_prevue + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}` : '';
    carte('TES COLIS', l.map(c => `<b>${esc(c.marchand)}</b>${c.article ? ` — ${esc(c.article)}` : ''}<br><span style="color:#9ca3af;font-size:14px">${st[c.statut] || c.statut}${c.transporteur ? ` · ${esc(c.transporteur)}` : ''}${quand(c)}${c.point_relais ? ` · ${esc(c.point_relais)}` : ''}</span>`));
    return say(`${l.length} colis : ` + l.slice(0, 4).map(c => `${c.marchand}${c.article ? `, ${c.article}` : ''}, ${st[c.statut] || c.statut}${c.date_prevue ? `, prévu ${new Date(c.date_prevue + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long' })}` : ''}`).join(' ; ') + '. Quand la caméra voit un livreur, je te dirai lequel c\'est sûrement.');
  }

  /* =================== 2. le mode voyage =================== */
  const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15 };
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function duree(n) {
    const now = new Date();
    let m = n.match(/\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze) (jours?|nuits?|semaines?)\b/);
    if (m) { const k = +m[1] || NOMBRES[m[1]] || 1; return k * (/semaine/.test(m[2]) ? 7 : 1); }
    if (/\b(une|la) semaine\b/.test(n)) return 7;
    if (/\b(le|ce|en|un) week end\b/.test(n)) return Math.max(1, (7 - now.getDay()) % 7 || 1);
    m = n.match(/\bjusqu (?:a |au )?(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)\b/);
    if (m) return ((JOURS.indexOf(m[1]) - now.getDay() + 7) % 7) || 7;
    return 0;
  }
  function destination(t) {
    const s = t.replace(/\b(en|pour|pendant)\s+(vacances|voyage|d[ée]placement|week-?end)\b/gi, ' ')
      .replace(/\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze)\s+(jours?|nuits?|semaines?)\b/gi, ' ')
      .replace(/\bjusqu.{0,3}(?:au|à|a)?\s+\S+/gi, ' ').replace(/\b(pour|pendant)\b.*$/i, ' ');
    const l = [...s.matchAll(/(?:^|\s)(?:à|a|au|aux|en)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ' -]{1,30}?)(?=\s*(?:[.!,?]|$|\s(?:et|avec)\b))/g)];
    return l.length ? l[l.length - 1][1].trim() : '';
  }
  async function meteoValise(lieu, jours) {
    let g; try { g = (await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(lieu)}&count=1&language=fr`)).json()).results[0]; } catch (e) { g = null; }
    if (!g) return null;
    let w; try { w = (await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=${Math.min(16, Math.max(1, jours))}&timezone=auto`)).json()).daily; } catch (e) { w = null; }
    return { lieu: g.name, pays: g.country, code: g.country_code, w };
  }
  function liste(jours, m) {
    const n = Math.min(jours, 7), l = [];
    const tmax = m && m.w ? Math.max(...m.w.temperature_2m_max) : null, tmin = m && m.w ? Math.min(...m.w.temperature_2m_min) : null;
    const pluie = m && m.w ? m.w.precipitation_probability_max.filter(p => p >= 50).length : 0;
    l.push(`${n} t-shirts, ${n} sous-vêtements, ${n} paires de chaussettes`);
    l.push(tmax !== null && tmax >= 24 ? 'Shorts, maillot de bain, casquette, crème solaire, lunettes de soleil' : 'Deux pantalons, un pull');
    if (tmin !== null && tmin <= 6) l.push('Manteau chaud, bonnet, gants');
    if (pluie) l.push(`Veste de pluie ou parapluie (${pluie} jour${pluie > 1 ? 's' : ''} de pluie probable${pluie > 1 ? 's' : ''})`);
    l.push('Pyjama, trousse de toilette, brosse à dents, médicaments');
    l.push('Chargeurs du téléphone, batterie externe, écouteurs');
    if (m && m.code && m.code !== 'FR') l.push(['GB', 'US', 'CA', 'CH'].includes(m.code) ? 'Passeport (ou carte d\'identité selon le pays), adaptateur de prise' : 'Carte d\'identité ou passeport, carte européenne d\'assurance maladie');
    else l.push('Carte d\'identité, carte Vitale, permis de conduire');
    if (typeof LIEN !== 'undefined' && LIEN.prenom && LIEN.prenom()) l.push(`Pour ${LIEN.prenom()} : ses affaires, son doudou, un jeu pour le trajet`);
    return { l, tmax, tmin, pluie };
  }
  async function depart(t, n) {
    let jours = duree(n); const dest = destination(t);
    const defaut = !jours; if (!jours) jours = 7;
    const fin = Math.floor(Date.now() / 1000) + jours * 86400;
    try { await appel('/maison/voyage', { fin, destination: dest }); await appel('/maison/sentinelle', { absent: true }); } catch (e) { return hors(); }
    voyage = { actif: true, fin, destination: dest, debut: Math.floor(Date.now() / 1000) };
    fx.ok();
    const m = dest ? await meteoValise(dest, jours) : null;
    const v = liste(jours, m);
    carte(`VOYAGE${m ? ' · ' + m.lieu.toUpperCase() : ''} · ${jours} JOUR${jours > 1 ? 'S' : ''}`, [
      `🏠 La maison est en mode absent jusqu'au ${jourFr(fin)} : caméras, réseau, alarme, intérieur ; le fantôme allume le soir.`,
      '⏸ Les réveils, les courses et la préparation de la semaine sont en pause.',
      '🌙 Un résumé de la maison chaque soir à 21 h sur ton téléphone.',
      ...(m && v.tmax !== null ? [`🌤 ${esc(m.lieu)} : de ${Math.round(v.tmin)} à ${Math.round(v.tmax)} °C${v.pluie ? `, pluie possible ${v.pluie} jour${v.pluie > 1 ? 's' : ''}` : ''}`] : []),
      '<b>La valise</b>', ...v.l.map(x => '☐ ' + esc(x)),
    ]);
    return say(`Bon voyage${m ? ` à ${m.lieu}` : ''} ! ${defaut ? 'Je compte une semaine, dis-moi si c\'est plus court. ' : ''}La maison est surveillée jusqu'au ${jourFr(fin)}, le fantôme allume le soir, les réveils et les courses sont en pause, et je t'envoie un résumé chaque soir à 21 heures.`
      + (m && v.tmax !== null ? ` Là-bas, de ${Math.round(v.tmin)} à ${Math.round(v.tmax)} degrés${v.pluie ? ', prends de quoi te protéger de la pluie' : ''}.` : '') + ' Ta liste de valise est à l\'écran.');
  }
  async function retour() {
    const debut = voyage.debut || 0;
    try { await appel('/maison/voyage', { fin_voyage: true }); } catch (e) { /* rien */ }
    voyage = { actif: false };
    let l = []; try { l = (await appel(`/maison/alertes?depuis=${debut * 1000}`, null, 10000)).alertes || []; } catch (e) { l = []; }
    const urg = l.filter(a => a.gravite === 'urgent' && a.genre !== 'voyage'), att = l.filter(a => a.gravite === 'attention' && a.genre !== 'voyage');
    await SECURITE.modeAbsent(false);
    return say(`Bienvenue ! Pendant ton voyage : ${urg.length} alerte${urg.length > 1 ? 's' : ''} urgente${urg.length > 1 ? 's' : ''} et ${att.length} à regarder.`
      + (urg.length ? ` La dernière urgente : ${urg[urg.length - 1].texte}` : ' Rien de grave.') + ' Dis « rapport de sécurité » pour le détail. Les réveils et les courses reprennent.');
  }

  /* =================== 3. le sommeil =================== */
  async function sommeil() {
    let j; try { j = await appel('/maison/sommeil'); } catch (e) { return hors(); }
    const l = j.nuits || [];
    if (!l.length) return say("Je n'ai pas encore de nuit complète. L'appareil posé dans ta chambre écoute le niveau sonore pendant la nuit : demain matin, je te dirai comment tu as dormi.");
    const b = l[l.length - 1], h = Math.round(b.minutes / 6) / 10;
    const moy = l.length > 2 ? l.slice(0, -1).reduce((s, x) => s + x.agitees / x.minutes, 0) / (l.length - 1) : null;
    const comp = moy === null ? '' : (b.agitees / b.minutes < moy * 0.8 ? ' Plus calme que tes nuits précédentes.' : b.agitees / b.minutes > moy * 1.25 ? ' Plus agitée que d\'habitude.' : ' Comme d\'habitude.');
    carte('TA NUIT', [`${heureFr(b.debut)} → ${heureFr(b.fin)} · ${h} h écoutées`, `Nuit <b>${b.qualite}</b> : ${b.agitees} minutes de bruit, ${b.pics} pic${b.pics > 1 ? 's' : ''}`, `Le plus long moment calme : ${Math.floor(b.calme_max_min / 60)} h ${String(b.calme_max_min % 60).padStart(2, '0')}`,
      ...(b.heures_agitees.length ? [`Agité vers : ${b.heures_agitees.join(', ')}`] : []), '<span style="color:#9ca3af;font-size:13px">Le niveau sonore seulement, mesuré par ' + esc(b.appareil) + ' : pas un avis médical.</span>']);
    return say(`Nuit ${b.qualite}. J'ai entendu ${b.agitees} minutes de bruit et ${b.pics} pic${b.pics > 1 ? 's' : ''}${b.heures_agitees.length ? `, surtout vers ${b.heures_agitees.slice(0, 3).join(', ')}` : ''}. Ton plus long moment calme : ${Math.floor(b.calme_max_min / 60)} heure${b.calme_max_min >= 120 ? 's' : ''} ${b.calme_max_min % 60}.${comp}`);
  }
  async function chambre(t) {
    const m = t.match(/(?:c['’]est |le |la )?(t[ée]l[ée]phone|tablette|ordinateur|vieux t[ée]l[ée]phone)/i);
    if (!m) return say("Dis-moi quel appareil dort dans ta chambre : le téléphone, la tablette, ou le vieux téléphone.");
    try { await appel('/maison/sommeil', { appareil: m[1].toLowerCase().replace('vieux telephone', 'vieux téléphone') }); } catch (e) { return hors(); }
    return say(`D'accord : la nuit, j'écoute ton sommeil avec ${m[1].toLowerCase()}.`);
  }

  /* =================== 4. les fuites de données =================== */
  async function fuites() {
    let s; try { s = await appel('/maison/fuites'); } catch (e) { return hors(); }
    if (!s.cle) return say("Pour vérifier tes fuites, il me faut une clé de Have I Been Pwned, environ 4 dollars par mois. Prends-la sur haveibeenpwned point com, rubrique API, puis lance le script de connexion sur l'ordinateur : maison, hibp-connecter. Ensuite je vérifie chaque semaine tout seul.");
    say('Je vérifie tes adresses dans les fuites connues, ça prend quelques secondes.');
    let r; try { r = await appel('/maison/fuites', { maintenant: true }, 150000); } catch (e) { return hors(); }
    if (!r.ok) return say(r.raison === 'clé refusée' ? "Have I Been Pwned refuse la clé : vérifie-la sur leur site." : "La vérification n'a pas marché, je réessaierai.");
    const tout = Object.entries(r.connues || {}).flatMap(([a, l]) => l.map(n => `${a} : ${n}`));
    if (!tout.length) return say("Bonne nouvelle : aucune de tes adresses n'apparaît dans une fuite connue.");
    carte('FUITES DE DONNÉES', tout.map(esc));
    const mdp = (r.nouvelles || []).filter(x => x.motdepasse);
    return say(`Tes adresses apparaissent dans ${tout.length} fuite${tout.length > 1 ? 's' : ''}.` + (mdp.length ? ` Dans ${mdp.length}, des mots de passe ont fuité : ${mdp.slice(0, 3).map(x => x.fuite).join(', ')}. Change ces mots de passe, et partout où tu as utilisé les mêmes.` : '') + ' La liste est à l\'écran.');
  }

  /* =================== 5. l'ange gardien =================== */
  async function vivant() {
    try { await appel('/maison/ange', { vivant: true }); } catch (e) { return hors(); }
    return say('Noté, merci. Je suis rassuré.');
  }
  async function etatAnge() {
    let c; try { c = await appel('/maison/ange'); } catch (e) { return hors(); }
    const ct = c.contact && c.contact.email ? `${c.contact.nom || 'ta personne de confiance'} (${c.contact.email})` : '';
    return say(`${c.actif ? 'L\'ange gardien veille' : 'L\'ange gardien est coupé'}${c.pause_jusqua * 1000 > Date.now() ? `, en pause jusqu'au ${jourFr(c.pause_jusqua)}` : ''}. Sans signe de toi pendant ${c.delai_h} heures, ${c.delai_voyage_h} en voyage, je te demande si tout va bien. `
      + (ct ? (c.envoi_autorise ? `Sans réponse en ${c.relance_h} heures, je préviens ${ct} par mail.` : `Ta personne de confiance est ${ct}, mais tu ne m'as pas encore autorisé à lui écrire : dis « autorise l'ange gardien à la prévenir ».`)
        : "Je n'ai pas encore de personne de confiance : dis « ma personne de confiance est Marie, son mail est marie point dupont arobase gmail point com ».")
      + ` Ton dernier signe de vie : il y a ${Math.round(c.dernier_signe_il_y_a / 60)} minutes.`);
  }
  function mailParle(s) {
    return s.toLowerCase().replace(/\s*(arobase|arrobase|at)\s*/g, '@').replace(/\s*(point|dot)\s*/g, '.').replace(/\s*(tiret du bas|underscore)\s*/g, '_').replace(/\s*tiret\s*/g, '-').replace(/\s+/g, '').replace(/[.,;!]+$/, '');
  }
  async function contact(t) {
    const m = t.match(/personne de confiance (?:est|c['’]est|sera)\s+([A-Za-zÀ-ÿ' -]{2,40}?)\s*,?\s*(?:et\s+)?(?:son|sa)\s+(?:adresse\s+)?(?:mail|e-?mail|courriel|adresse)\s+(?:est\s+|c['’]est\s+)?(.+)$/i);
    if (!m) return say("Dis-le comme ça : « ma personne de confiance est Marie, son mail est marie point dupont arobase gmail point com ».");
    const email = mailParle(m[2]);
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) return say(`Je n'ai pas compris l'adresse : j'ai entendu « ${email} ». Redis-la lentement, avec « arobase » et « point ».`);
    try { await appel('/maison/ange', { contact: { nom: m[1].trim(), email } }); } catch (e) { return hors(); }
    carte('ANGE GARDIEN', [`Personne de confiance : <b>${esc(m[1].trim())}</b>`, esc(email), '<span style="color:#9ca3af;font-size:13px">Elle ne sera prévenue que si tu l\'autorises : « autorise l\'ange gardien à la prévenir ».</span>']);
    return say(`C'est noté : ${m[1].trim()}, à l'adresse affichée. Vérifie-la à l'écran. Pour que je puisse lui écrire en cas de besoin, depuis ton adresse Gmail, dis « autorise l'ange gardien à la prévenir ».`);
  }
  async function autorise(oui) {
    let c; try { c = await appel('/maison/ange', { envoi_autorise: oui }); } catch (e) { return hors(); }
    if (oui && !(c.contact && c.contact.email)) return say("Il me faut d'abord ta personne de confiance et son mail.");
    return say(oui ? `C'est autorisé : si tu ne réponds pas, j'écrirai à ${c.contact.nom || 'ta personne de confiance'} depuis ton Gmail, une seule fois, avec ton dernier signe de vie et ce que la maison a noté.` : "D'accord : je ne préviendrai personne, je te relancerai seulement toi.");
  }
  async function reglage(n) {
    const corps = {};
    let m = n.match(/\b(\d+) (heures?|jours?)\b/);
    if (/\b(desactive|coupe|arrete)\b/.test(n)) corps.actif = false;
    else if (/\b(pause|suspends?)\b/.test(n)) corps.pause_jours = m ? (+m[1]) * (/jour/.test(m[2]) ? 1 : 1 / 24) : 1;
    else if (/\b(active|rallume|remets)\b/.test(n)) { corps.actif = true; corps.pause_jours = 0; }
    if (m && /\b(delai|apres|au bout de|sans nouvelles)\b/.test(n)) corps.delai_h = (+m[1]) * (/jour/.test(m[2]) ? 24 : 1);
    if (!Object.keys(corps).length) return etatAnge();
    try { await appel('/maison/ange', corps); } catch (e) { return hors(); }
    return etatAnge();
  }

  function route(t, n) {
    if (/\b(mes colis|mes commandes en cours|qu est ce que j attends( comme colis)?|colis (attendus?|en cours|en route)|ou en est (mon|ma) (colis|commande)|j ai des colis|quand arrive (mon|ma) (colis|commande))\b/.test(n)) return colis;
    if (/\b(je pars|on part|je m en vais|on s en va)\b.*\b(en vacances|en voyage|en deplacement|en week end)\b|\bje pars (\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|quinze) (jours?|nuits?|semaines?)\b/.test(n)) return () => depart(t, n);
    if (window.enVoyage() && /\b(je suis rentre|je suis de retour|on est rentre|fin du voyage|retour de vacances)\b/.test(n)) return retour;
    if (/\b(comment j ai dormi|ma nuit|mon sommeil|j ai bien dormi|bilan de (ma|la) nuit)\b/.test(n) && !/\brapport de nuit\b/.test(n)) return sommeil;
    if (/\b(dort|dors|est|reste) (la nuit )?dans ma chambre\b/.test(n) && /\b(telephone|tablette|ordinateur)\b/.test(n)) return () => chambre(t);
    if (/\b(fuites? de donnees|mes donnees ont fuite|mes mots de passe ont fuite|verifie (mes )?fuites|suis je pirate|have i been pwned|pwned)\b/.test(n)) return fuites;
    if (/^(atlas )?(je vais bien|je suis vivant|tout va bien je vais bien)\b/.test(n)) return vivant;
    if (/\bpersonne de confiance (est|c est|sera)\b/.test(n)) return () => contact(t);
    if (/\b(autorise|tu peux)\b.*\bange gardien\b.*\b(prevenir|ecrire|envoyer)\b/.test(n)) return () => autorise(true);
    if (/\b(n autorise plus|interdis|ne previens personne)\b.*\bange gardien\b|\bange gardien\b.*\bne previens personne\b/.test(n)) return () => autorise(false);
    if (/\bange gardien\b/.test(n)) return () => reglage(n);
    return null;
  }
  return { route, enVoyage: () => window.enVoyage(), _duree: duree, _destination: destination, _mail: mailParle };
})();

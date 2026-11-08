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

  /* ---------- le planning de la semaine, à la voix : il dicte (pro et perso), Atlas range, relit, et écrit dans l'agenda ---------- */
  const JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cleSemaine = () => { const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 1 - d.getDay())); return dJ(d); }; // le lundi de la semaine planifiée
  function semaineCible() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : 2)); // le week-end : la semaine qui vient
    const l = []; const x = new Date(d); do { l.push(new Date(x)); x.setDate(x.getDate() + 1); } while (x.getDay() !== 1 && l.length < 8);
    return l;
  }
  const libJour = d => `${JS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()}`;
  async function post(corps) {
    const r0 = VOIXMAISON.root(); if (!r0) throw new Error('pas de maison');
    const r = await fetch(`${r0}/maison/agenda/ecris`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), cache: 'no-store' });
    if (!r.ok) throw new Error(`maison ${r.status}`); return r.json();
  }
  // le cerveau range la dictée en rendez-vous (sans rien inventer)
  async function analyse(texte, jours, existants, actuels) {
    const table = jours.map(d => `${libJour(d)} = ${dJ(d)}`).join(' ; ');
    const consigne = `Tu es le secrétaire d'un père (entrepreneur, sportif : gymnastique, krav maga ; un fils). Il dicte ses rendez-vous. Range-les en événements d'agenda, SANS RIEN INVENTER.
Les jours : ${table}. Aujourd'hui : ${libJour(new Date())} ${dJ(new Date())}. Un jour cité sans date = le prochain dans cette liste ; « demain » = le jour suivant aujourd'hui.
Pour chaque événement : "titre" court et clair, avec une majuscule, sans date ni heure dedans (ex. « Réunion client Dupont », « Dentiste », « Krav maga ») ; "date" AAAA-MM-JJ ; "debut" et "fin" en HH:MM (24 h).
Sans heure de fin, une durée normale (réunion ou rendez-vous 1 h, appel 30 min, dentiste ou médecin 45 min, sport 1 h 30, repas 1 h 30). Sans heure du tout pour une chose qui en demande une : "debut" vide. Une journée entière (congé, salon, déplacement) : "journee": true.
« Tous les jours », « chaque matin », « du lundi au vendredi » : un événement par jour concerné. "pro" : true pour le travail (clients, réunions, appels pro, rendez-vous professionnels, comptable, banque pro, chantier, prospection, formation), false pour le personnel (famille, son fils, sport, santé, maison, amis, loisirs). "lieu" seulement s'il le dit. "rappel" en minutes seulement s'il en demande un.
${actuels ? `Voici la liste ACTUELLE, à corriger selon ce qu'il dit (enlever, déplacer, ajouter, changer) ; renvoie la liste complète corrigée : ${JSON.stringify(actuels)}` : ''}
Réponds UNIQUEMENT en JSON : {"evenements": [{"titre": "…", "date": "AAAA-MM-JJ", "debut": "09:00", "fin": "10:00", "journee": false, "pro": true, "lieu": "", "rappel": 0}]}`;
    const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: `${existants.length ? `Déjà dans son agenda (ne pas les recréer) : ${existants.slice(0, 40).map(e => `${libJour(new Date(e.debut * 1000))} ${e.journee ? '' : hm(e.debut)} ${propre(e.titre)}`).join(' ; ')}.\n` : ''}Ce qu'il dit : ${texte}` }], { maxTokens: 2500, temperature: 0.1, json: true }));
    const o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return (o.evenements || []).filter(x => x && x.titre && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')).slice(0, 60).map(x => ({ titre: String(x.titre).slice(0, 120), date: x.date, debut: /^\d{1,2}:\d{2}$/.test(x.debut || '') ? x.debut.padStart(5, '0') : '', fin: /^\d{1,2}:\d{2}$/.test(x.fin || '') ? x.fin.padStart(5, '0') : '', journee: !!x.journee, pro: !!x.pro, lieu: String(x.lieu || '').slice(0, 120), rappel: Math.max(0, Math.min(1440, +x.rappel || 0)) }));
  }
  const epoque = (date, h) => Math.floor(new Date(`${date}T${h || '00:00'}:00`).getTime() / 1000);
  const enEvt = x => { const deb = x.journee ? epoque(x.date) : epoque(x.date, x.debut); let fin = x.journee ? deb + 86400 : x.fin ? epoque(x.date, x.fin) : deb + 3600; if (fin <= deb) fin = deb + 3600; return { titre: x.titre, debut: deb, fin, journee: x.journee, pro: x.pro, lieu: x.lieu, rappel: x.rappel }; };
  const chevauche = (x, existants) => { if (x.journee || !x.debut) return null; const e = enEvt(x); return existants.find(y => !y.journee && !y.eco && y.debut < e.fin && y.fin > e.debut) || null; };  // (une annonce des marchés n'est pas un conflit)
  // les moments de la journée : le matin (avant midi), le midi (12 h – 14 h), l'après-midi (14 h – 18 h), le soir
  const MOMENTS = [['journee', 'Toute la journée'], ['matin', 'Matin'], ['midi', 'Midi'], ['aprem', 'Après-midi'], ['soir', 'Soir']];
  const momentH = h => (h < 12 ? 'matin' : h < 14 ? 'midi' : h < 18 ? 'aprem' : 'soir');
  const momentDe = x => (x.journee ? 'journee' : x.debut ? momentH(+x.debut.split(':')[0] + (+x.debut.split(':')[1] || 0) / 60) : 'journee');
  const momentEco = e => { const d = new Date(e.debut * 1000); return momentH(d.getHours() + d.getMinutes() / 60); };
  // la semaine en grille : un jour par colonne ; ce qui est déjà prévu (discret), ce qu'il dicte (en clair, « nouveau »), les annonces des marchés (en ambre)
  const pad2 = v => String(v).padStart(2, '0');
  const hhmm = s => { const d = new Date(s * 1000); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const cleRdv = x => `${N(x.titre)}|${x.date}|${x.journee ? 'j' : x.debut}|${x.journee ? '' : x.fin || ''}`;
  // la semaine en tableau : les jours en colonnes, les moments en lignes (journée, matin, midi, après-midi, soir) ;
  // ce qui est déjà prévu (discret), ce qu'il dicte (en clair, « nouveau »), les annonces des marchés (en ambre) ; chaque chose une seule fois
  const PL_CSS = `.plg{--l:rgba(255,255,255,.07);display:grid;border:1px solid var(--l);border-radius:14px;overflow:hidden;margin-top:10px;font-family:system-ui}
.plg>div{border-right:1px solid var(--l);border-bottom:1px solid var(--l);min-width:0}
.plg .plh{padding:9px 6px 8px;background:rgba(255,255,255,.04);text-align:center}
.plg .plh b{display:block;color:#fde68a;font-size:15px;text-transform:capitalize;white-space:nowrap}
.plg .plh small{display:inline-block;margin-top:4px;font-size:10px;letter-spacing:.1em;color:#a5b4fc;border:1px solid rgba(165,180,252,.35);border-radius:10px;padding:0 7px;text-transform:uppercase}
.plg .plh.auj{background:rgba(253,230,138,.13)}
.plg .plm{padding:8px 10px;background:rgba(255,255,255,.04);display:flex;flex-direction:column;justify-content:center}
.plg .plm b{color:#e2e8f0;font-size:12px;letter-spacing:.12em;text-transform:uppercase}.plg .plm small{color:#64748b;font-size:10.5px;margin-top:2px}
.plg .plc{padding:5px;display:flex;flex-direction:column;gap:4px;min-height:40px}.plg .plc.auj{background:rgba(253,230,138,.05)}
.pli{display:grid;grid-template-columns:auto 1fr;gap:1px 6px;align-items:baseline;padding:4px 6px;border-radius:7px;border-left:3px solid var(--c);background:rgba(255,255,255,.06);font-size:13.5px;line-height:1.28}
.pli time{font:700 12px system-ui;color:#cbd5e1;font-variant-numeric:tabular-nums}
.pli span{color:#f1f5f9;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.pli.ex{opacity:.82}.pli.neuf{background:rgba(253,230,138,.16);border-left-color:#fde68a;box-shadow:inset 0 0 0 1px rgba(253,230,138,.4)}
.pli em{grid-column:1/-1;font-style:normal;font-size:10px;letter-spacing:.1em;color:#fde68a;font-weight:800}
.pli i{grid-column:1/-1;font-style:normal;font-size:11px;color:#fca5a5}
.ple{font-size:11px;color:#fcd34d;padding:1px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;font-size:12px;color:#94a3b8}.plleg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}
.pljour{margin-top:10px;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden}.pljour>b{display:block;padding:7px 10px;background:rgba(255,255,255,.04);color:#fde68a;text-transform:capitalize}
.pljour>b small{margin-left:8px;font-size:10px;letter-spacing:.1em;color:#a5b4fc}.pljour .plr{display:grid;grid-template-columns:78px 1fr;border-top:1px solid rgba(255,255,255,.06)}
.pljour .plr>b{padding:7px 8px;font-size:11px;letter-spacing:.1em;color:#94a3b8;text-transform:uppercase}.pljour .plr>div{padding:5px;display:flex;flex-direction:column;gap:4px}`;
  const styleGrille = () => { if (!document.getElementById('pl-css')) { const st = document.createElement('style'); st.id = 'pl-css'; st.textContent = PL_CSS; document.head.appendChild(st); } };
  const LIGNES = [['journee', 'Journée', ''], ['matin', 'Matin', 'avant midi'], ['midi', 'Midi', '12 h – 14 h'], ['aprem', 'Après-midi', '14 h – 18 h'], ['soir', 'Soir', 'après 18 h']];
  const cleVue = t => N(String(t || '').replace(/ \(pro\)$/, '')).replace(/^echeance /, '').replace(/ a confirmer$/, '').trim();
  // deux titres pour la même chose, à la même heure (« Réunion hebdomadaire SOPAM » / « SOPAM Réunion hebdomadaire (Tristan…) ») : les mots du plus court sont presque tous dans l'autre
  const motsDe = t => new Set(cleVue(t).split(' ').filter(w => w.length > 2 && !/^(avec|pour|dans|chez|les|des|une|aux)$/.test(w)));
  const memeChose = (a, b) => { const A = motsDe(a), B = motsDe(b), [p, g] = A.size <= B.size ? [A, B] : [B, A]; if (!p.size) return false; let n = 0; p.forEach(w => { if (g.has(w)) n++; }); return n / p.size >= 0.7; };
  function grille(jours, existants, nouveaux = [], orig = null) {
    styleGrille();
    const etroit = window.innerWidth < 760, auj = dJ(new Date()), deja = new Set((orig || []).map(cleRdv));
    const coul = (t, pro) => (/kedi/i.test(t) ? '#f9a8d4' : pro ? '#93c5fd' : '#86efac');
    const libelle = t => { t = propre(String(t).replace(/ \(pro\)$/, '')); if (!/kedi/i.test(t)) return t; const reste = t.split('·').slice(1).join('·').trim(); return `♥ ${reste || 'Avec Kedi'}`; };
    const carte = it => `<div class="pli ${it.genre}" style="--c:${coul(it.titre, it.pro)}" title="${esc(propre(it.titre))}">${it.genre === 'neuf' ? '<em>NOUVEAU</em>' : ''}<time>${it.h || ''}</time><span>${esc(libelle(it.titre))}</span>${it.conflit ? `<i>⚠ même heure que ${esc(libelle(it.conflit.titre))}</i>` : ''}</div>`;
    // les choses d'un jour, rangées par moment, sans doublon
    const duJour = d => {
      const j = dJ(d), t0 = epoque(j), t1 = t0 + 86400, vus = new Set(), heuresEco = new Set(), par = { journee: [], matin: [], midi: [], aprem: [], soir: [] }; let marque = '';
      const neufs = nouveaux.filter(x => x.date === j).map(x => ({ titre: x.titre, pro: x.pro, h: x.journee ? '' : x.debut ? `${x.debut}${x.fin ? `–${x.fin}` : ''}` : '<span style="color:#fca5a5">heure ?</span>', m: momentDe(x), genre: deja.has(cleRdv(x)) ? 'atlas' : 'neuf', conflit: chevauche(x, existants), k: x.journee ? '' : x.debut || '99' }));
      const ex = (existants || []).filter(e => e.journee ? e.debut < t1 && e.fin > t0 : e.debut >= t0 && e.debut < t1).sort((a, b) => a.debut - b.debut);
      neufs.forEach(x => vus.add(`${cleVue(x.titre)}|${x.k}`)); const pareils = [];
      for (const e of ex) {
        if (/^semaine [ab]$/i.test(propre(e.titre))) { marque = propre(e.titre); continue; }  // (semaine A / B : une étiquette sous le jour)
        const h = e.journee ? '' : hhmm(e.debut), m = e.journee ? 'journee' : momentH(new Date(e.debut * 1000).getHours() + new Date(e.debut * 1000).getMinutes() / 60);
        if (e.eco) { if (heuresEco.has(h)) continue; heuresEco.add(h); par[m].push({ eco: true, k: h, html: `<div class="ple" title="${esc(propre(e.titre))}">${h} ${esc(propre(e.titre))}</div>` }); continue; }
        const cle = `${cleVue(e.titre)}|${h}`; if (vus.has(cle) || pareils.some(([hh, mm]) => hh === h && memeChose(mm, e.titre))) continue; vus.add(cle); pareils.push([h, e.titre]);
        par[m].push({ k: h, html: carte({ titre: e.titre, pro: e.pro || / \(pro\)$/.test(e.titre), h, genre: 'ex' }) });
      }
      neufs.forEach(x => par[x.m].push({ k: x.k, html: carte(x) }));
      for (const m in par) {  // une annonce des marchés déjà présente dans l'agenda (même heure) : une seule fois
        const hNonEco = new Set(par[m].filter(x => !x.eco).map(x => x.k)); par[m] = par[m].filter(x => !x.eco || !hNonEco.has(x.k)).sort((a, b) => a.k.localeCompare(b.k));
      }
      return { j, marque, par };
    };
    const semaine = jours.map(d => ({ d, ...duJour(d) }));
    const lignes = LIGNES.filter(([k]) => k !== 'journee' || semaine.some(s => s.par.journee.length));
    const legende = `<div class="plleg"><span><i style="background:#fde68a"></i>nouveau</span><span><i style="background:#93c5fd"></i>pro</span><span><i style="background:#86efac"></i>perso</span><span><i style="background:#f9a8d4"></i>avec Kedi</span><span style="color:#fcd34d">annonces des marchés</span></div>`;
    if (etroit) return legende + semaine.map(s => `<div class="pljour"><b>${esc(libJour(s.d))}${s.j === auj ? ' · aujourd’hui' : ''}${s.marque ? `<small>${esc(s.marque.toUpperCase())}</small>` : ''}</b>${lignes.filter(([k]) => s.par[k].length).map(([k, lab]) => `<div class="plr"><b>${lab}</b><div>${s.par[k].map(x => x.html).join('')}</div></div>`).join('') || '<div class="plr"><b></b><div style="color:#64748b;font-size:12px">libre</div></div>'}</div>`).join('');
    return `${legende}<div class="plg" style="grid-template-columns:96px repeat(${jours.length},minmax(0,1fr))"><div class="plh"></div>${semaine.map(s => `<div class="plh${s.j === auj ? ' auj' : ''}"><b>${esc(libJour(s.d))}</b>${s.marque ? `<small>${esc(s.marque)}</small>` : ''}</div>`).join('')}`
      + lignes.map(([k, lab, sous]) => `<div class="plm"><b>${lab}</b>${sous ? `<small>${sous}</small>` : ''}</div>${semaine.map(s => `<div class="plc${s.j === auj ? ' auj' : ''}">${s.par[k].map(x => x.html).join('')}</div>`).join('')}`).join('') + '</div>';
  }
  const boutons = () => `<div style="position:sticky;bottom:0;padding-top:10px;background:linear-gradient(transparent,rgba(5,10,20,.94) 30%)"><div style="display:flex;gap:10px"><button type="button" id="ok-board" style="flex:2;padding:16px;border:0;border-radius:14px;background:#16a34a;color:#fff;font:800 19px system-ui;cursor:pointer">✔ C'est bon, écris-le</button><button type="button" id="mod-board" style="flex:1;padding:16px;border:0;border-radius:14px;background:#334155;color:#fff;font:800 19px system-ui;cursor:pointer">✎ Modifier</button></div>`
    + `<input id="corr-board" autocomplete="off" placeholder="ou écris ce qu'il faut changer, puis Entrée (ex. « déplace le dentiste à jeudi 15 h »)" style="width:100%;box-sizing:border-box;margin-top:8px;padding:11px 12px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#f1f5f9;font:15px system-ui"><div style="text-align:center;color:#94a3b8;font-size:13px;margin-top:6px">ou dis « c'est bon », ou ce qu'il faut changer : rien n'est écrit sans ton accord</div></div>`;
  const joursDe = (l, titre) => (titre === 'À AJOUTER' ? [...new Set(l.map(x => x.date))].sort().map(j => new Date(`${j}T12:00:00`)) : semaineCible());
  function montre(l, existants, titre, o = {}) {
    showBoard(`<div style="text-align:left;font-family:system-ui;width:min(calc(97vw - 48px),1232px)"${o.ecrit ? ' id="pl-ecrit"' : ''}><small style="letter-spacing:.3em;color:#a5b4fc">${esc(o.orig ? 'MODIFIER TON PLANNING' : titre)} · ${l.length} RENDEZ-VOUS${o.ecrit ? ' · ✔ ÉCRIT DANS TON AGENDA' : ''}</small>${grille(joursDe(l, titre), existants, l, o.orig)}`
      + `${o.ecrit ? '<div style="margin-top:12px;color:#94a3b8;font-size:14px">Pour changer quelque chose plus tard : dis « modifie mon planning ».</div>' : boutons()}</div>`, 'planning-large');
  }
  // les boutons seuls (il ne répond pas) : on attend son geste, sans rien écrire
  function attendsBoutons(ms) {
    return new Promise(r => {
      const t = setTimeout(() => r(null), ms), fin = v => { clearTimeout(t); r(v); };
      setTimeout(() => {
        const b = document.getElementById('ok-board'), m = document.getElementById('mod-board'), i = document.getElementById('corr-board');
        if (b) b.onclick = () => fin('ok'); if (m) m.onclick = () => fin('modifier');
        if (i) i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && i.value.trim()) fin(i.value.trim()); };
      }, 60);
    });
  }
  const hDit = h => { const [a, b] = h.split(':').map(Number); return a === 12 && !b ? 'midi' : `${a} heure${a > 1 ? 's' : ''}${b ? ` ${b}` : ''}`; };
  // à voix haute : jour par jour, et dans chaque jour, le matin, le midi, l'après-midi, le soir
  const resume = l => { const par = {}; l.forEach(x => { (par[x.date] = par[x.date] || []).push(x); }); const dit = { journee: 'toute la journée', matin: 'le matin', midi: 'à midi', aprem: "l'après-midi", soir: 'le soir' }; return Object.keys(par).sort().map(j => `${libJour(new Date(`${j}T12:00:00`))} : ${MOMENTS.map(([m]) => { const r = par[j].filter(x => momentDe(x) === m).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')); return r.length ? `${dit[m]}, ${r.map(x => `${x.titre}${x.debut && !x.journee ? ` à ${hDit(x.debut)}` : ''}`).join(' et ')}` : ''; }).filter(Boolean).join(' ; ')}`).join('. '); };
  // il manque une heure : on la demande (« à quelle heure, le dentiste mardi ? »)
  async function heures(l) {
    for (const x of l.filter(y => !y.journee && !y.debut).slice(0, 5)) {
      const a = N(await ask(`À quelle heure, ${x.titre}, ${libJour(new Date(`${x.date}T12:00:00`))} ?`, { wait: 15000 }));
      const m = a.match(/\b(\d{1,2}) ?(?:h|heures?)(?: ?(\d{1,2}))?\b/) || (/\bmidi\b/.test(a) ? [0, '12', '0'] : null);
      if (m) { const h = Math.min(23, +m[1] + (/\b(de l apres midi|du soir)\b/.test(a) && +m[1] < 12 ? 12 : 0)); x.debut = `${String(h).padStart(2, '0')}:${String(+(m[2] || 0)).padStart(2, '0')}`; } else x.journee = true;
    }
  }
  async function ecrire(l, existants, titre, avant = '', orig = null) {
    let r, sup = [];
    try {
      if (orig) {  // une modification : on enlève ce qui a changé ou disparu, on écrit ce qui est nouveau ; le reste ne bouge pas
        const garde = new Set(l.map(cleRdv)), avantK = new Set(orig.map(cleRdv));
        sup = orig.filter(x => !garde.has(cleRdv(x))).map(x => x.uid); const neufs = l.filter(x => !avantK.has(cleRdv(x)));
        r = await post({ supprime: sup.slice(0, 20), evenements: neufs.map(enEvt) });
        for (let k = 20; k < sup.length; k += 20) await post({ supprime: sup.slice(k, k + 20) });
      } else r = await post({ evenements: l.map(enEvt) });
    } catch (e) { await say("Je n'arrive pas à joindre l'ordinateur de la maison : rien n'est noté. Redis-le-moi dans un instant."); return { statut: 'erreur', l }; }
    S.planningSemaine = cleSemaine(); S.planningEnAttente = null; save(); fx.ok();
    montre(l, existants, titre, { ecrit: true });
    if (orig) await say(`${r.google === false ? "C'est corrigé chez moi, mais Google Agenda n'a pas répondu : je réessaierai." : "C'est corrigé dans ton agenda"}${r.n || sup.length ? ` : ${r.n ? `${r.n} ajouté${r.n > 1 ? 's' : ''}` : ''}${r.n && sup.length ? ', ' : ''}${sup.length ? `${sup.length} enlevé${sup.length > 1 ? 's' : ''}` : ''}` : ''}.`);
    else await say(`${avant ? `${avant} ` : ''}${r.google ? `C'est dans ton Google Agenda : ${r.n} rendez-vous` : `C'est noté : ${r.n} rendez-vous`}, et je te préviendrai avant chacun.${r.google === false ? " Google Agenda n'a pas répondu : je réessaierai." : ''}`);
    if (!rituel) setTimeout(() => { if (document.getElementById('pl-ecrit')) hideBoard(); }, 60000);
    if (orig) return { statut: 'ecrit', l };
    if (titre === 'TON PLANNING' && !rituel) await apres();
    return { statut: 'ecrit', l };
  }
  // le planning à l'écran, lu à voix haute ; « c'est bon » (dit ou touché) : il se tait et l'écrit ; une correction : il la fait et remontre
  async function metsDeCote(l, titre, orig) {
    S.planningEnAttente = { l, titre, orig, at: Date.now() }; save(); hideBoard();
    await say("Je garde ton planning de côté : rien n'est écrit. Dis « reprends mon planning » quand tu veux.");
    return { statut: 'attente', l };
  }
  async function valideEtEcris(l, existants, titre, orig = null) {
    let silences = 0, attente = false;
    for (let tour = 0; tour < 10; tour++) {
      if (!l.length && !orig) { await say("Je n'ai trouvé aucun rendez-vous à noter."); return { statut: 'rien', l }; }
      await heures(l);
      montre(l, existants, titre, { orig });
      const conf = l.map(x => [x, chevauche(x, existants)]).filter(([, c]) => c);
      let a;
      if (attente) {  // il n'a pas répondu : le planning reste à l'écran ; il écoute sa voix ET attend un bouton, sans rien écrire (15 min au plus)
        let gagne = null; const limite = Date.now() + 15 * 60000;
        attendsBoutons(15 * 60000).then(v => { if (gagne === null) { gagne = v === null ? '' : v; try { OREILLES.cancel(); } catch (e) { /* rien */ } } });
        while (gagne === null && Date.now() < limite) { const h = await hear({ maxWait: 60000 }); if (gagne === null && h) gagne = h; }
        a = gagne || null; gagne = gagne === null ? '' : gagne;
        if (!a) return metsDeCote(l, titre, orig);
        if (a !== 'ok' && a !== 'modifier') { if (estOk(a)) a = 'ok'; else if (isNo(a) && N(a).split(' ').length <= 3) a = 'non'; else if (/^(modifie|modifier|change|corrige|je modifie)$/.test(N(a))) a = 'modifier'; }
      }
      else {
      const lu = silences ? "C'est bon ? Dis « c'est bon », touche Modifier, ou dis ce qu'il faut changer."
        : orig && !tour ? "Voici ce que j'ai noté pour toi cette semaine. Qu'est-ce qu'on change ?"
        : `${tour ? "Voilà, c'est corrigé. " : ''}${l.length > 1 ? `${l.length} rendez-vous. ` : ''}${resume(l)}.${conf.length ? ` Attention : ${conf.slice(0, 2).map(([x, c]) => `${x.titre} tombe en même temps que ${propre(c.titre)}`).join(', et ')}.` : ''} Dis « c'est bon » dès que c'est niquel, ou ce qu'il faut changer.`;
      a = await valideVisuel(lu, { wait: 20000 });
      }
      if (a === 'modifier') { a = await valideVisuel("Je t'écoute : qu'est-ce qu'on change ?", { wait: 30000 }); if (!a || a === 'modifier') { attente = true; continue; } }
      if (a === 'ok') return ecrire(l, existants, titre, '', orig);
      if (a === 'non') { hideBoard(); await say(orig ? "D'accord, je ne change rien." : "D'accord, je ne note rien."); return { statut: 'annule', l }; }
      if (!a) { if (++silences < 2) continue; await say("Je laisse ton planning à l'écran, rien n'est écrit. Touche « C'est bon » quand tu veux, ou « Modifier »."); attente = true; continue; }
      silences = 0; attente = false;
      const avant = l;
      try { face.set('think'); l = await analyse(a, semaineCible(), existants, l); } catch (e) { l = avant; await say("Je n'ai pas compris la correction. Redis-la autrement."); } finally { face.set('idle'); }
      l.forEach(x => { if (!x.debut && !x.journee) { const y = avant.find(z => N(z.titre) === N(x.titre) && z.date === x.date && z.debut); if (y) { x.debut = y.debut; x.fin = x.fin || y.fin; } } }); // une heure déjà donnée ne se reperd pas
    }
    return metsDeCote(l, titre, orig);
  }
  // « modifie mon planning » : ce qu'Atlas a noté cette semaine, à l'écran, à corriger (déplacer, enlever, ajouter)
  async function modifiePlanning() {
    if (!AI.ready()) return say("Pour modifier ton planning, il me faut mon cerveau en ligne.");
    const jours = semaineCible(), t0 = epoque(dJ(jours[0])), t1 = epoque(dJ(jours[jours.length - 1])) + 86400;
    let at = []; try { at = ((await (await fetch(`${VOIXMAISON.root()}/maison/agenda/ecris`, { cache: 'no-store' })).json()).atlas || []).filter(x => x.debut >= t0 && x.debut < t1); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    let ex = []; try { ex = ((await lire(10)).evenements || []).filter(e => e.fin > t0 && e.debut < t1); } catch (e) { ex = []; }
    const siens = new Set(at.map(x => `${N(x.titre)}|${x.debut}`));
    ex = ex.filter(e => !String(e.uid || '').startsWith('atlas-') && !siens.has(`${N(String(e.titre).replace(/ \(pro\)$/, ''))}|${e.debut}`));
    const orig = at.map(x => ({ uid: x.uid, titre: x.titre, date: dJ(new Date(x.debut * 1000)), debut: x.journee ? '' : hhmm(x.debut), fin: x.journee ? '' : hhmm(x.fin), journee: !!x.journee, pro: !!x.pro, lieu: '', rappel: 0 }));
    if (!orig.length) return say("Je n'ai rien noté pour toi cette semaine. Ce que tu as mis toi-même dans Google Agenda se modifie dans l'application ; pour ajouter, dis « ajoute à mon agenda » et le rendez-vous.");
    return valideEtEcris(orig.map(x => ({ ...x })), ex, 'TON PLANNING', orig);
  }
  // après le planning de la semaine : la feuille imprimée, et les menus qui s'adaptent aux jours chargés
  async function imprimePlanning() {
    const j = semaineCible(); const r0 = VOIXMAISON.root(); if (!r0) return false;
    try { const r = await fetch(`${r0}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'planning', du: dJ(j[0]), au: dJ(j[j.length - 1]) }) }); return r.ok; } catch (e) { return false; }
  }
  async function apres() {
    const imp = S.settings.imprimePlanning !== false && await imprimePlanning();
    if (imp) await say("Je l'imprime sur l'imprimante du bureau.");
    if (typeof CUISINE === 'undefined' || !CUISINE.semaineValidee) return;
    await say('Maintenant, les repas de la semaine.');
    return CUISINE.semaineValidee({ debut: dJ(semaineCible()[0]), imprime: true });
  }
  let rituel = false;
  async function planifie(o = {}) {
    rituel = !!o.rituel;
    if (!AI.ready()) return say("Pour ranger ton planning, il me faut mon cerveau en ligne.");
    planningOffre = null; dlg.attendReponse = 0;
    const jours = semaineCible(), d0 = jours[0], d1 = jours[jours.length - 1];
    let ex = []; try { const r = await lire(10); ex = (r.evenements || []).filter(e => e.debut >= d0.getTime() / 1000 && e.debut < d1.getTime() / 1000 + 86400); } catch (e) { ex = []; }
    let eco = []; try { eco = ((await (await fetch(`${VOIXMAISON.root()}/maison/calendrier-eco?du=${dJ(d0)}&au=${dJ(d1)}`, { cache: 'no-store' })).json()).annonces || []).map(a => ({ titre: a.titre, debut: a.debut, fin: a.fin, journee: false, eco: true })); } catch (e) { eco = []; }
    const ecoDit = (() => { const par = {}; eco.forEach(a => { const k = libJour(new Date(a.debut * 1000)); (par[k] = par[k] || []).push(`${a.titre} à ${hm(a.debut)}`); }); return Object.entries(par).slice(0, 4).map(([k, v]) => `${k}, ${v.slice(0, 2).join(' et ')}`).join(' ; '); })();
    ex = ex.concat(eco);
    showBoard(`<div style="text-align:left;font-family:system-ui;width:min(calc(97vw - 48px),1232px)"><small style="letter-spacing:.3em;color:#a5b4fc">TA SEMAINE · DU ${esc(libJour(d0).toUpperCase())} AU ${esc(libJour(d1).toUpperCase())} · DÉJÀ PRÉVU · JE T'ÉCOUTE</small>${grille(jours, ex)}<div id="pl-dicte" style="margin-top:12px;font-size:18px;line-height:1.5;color:#e2e8f0"></div><p style="color:#94a3b8;font-size:14px">Dicte ce que tu veux ajouter. Dis « c'est tout » quand tu as fini.</p></div>`, 'planning-large');
    const exRdv = ex.filter(e => !e.eco);
    await say(`C'est parti pour ta semaine, du ${libJour(d0)} au ${libJour(d1)}.${exRdv.length ? ` Tu as déjà ${exRdv.length} rendez-vous, dont ${exRdv.slice(0, 3).map(e => `${propre(e.titre)} ${nomJour(e.debut)}`).join(', ')}.` : ''}${ecoDit ? ` Côté marchés : ${ecoDit}.` : ''} Dis-moi tout, le pro et le perso, jour par jour, à ton rythme. Dis « c'est tout » quand tu as fini.`);
    const dicte = []; let vides = 0;
    for (let i = 0; i < 30; i++) {
      const a = await hear({ maxWait: 30000, prompt: "Un père dicte son planning de la semaine en français : jours, heures, réunions, clients, rendez-vous médicaux, sport (gymnastique, krav maga), son fils, l'école." });
      const n = N(a || '');
      if (!n) { vides++; if (vides >= 3) break; if (vides === 2) await say("Tu as fini ? Dis « c'est tout », ou continue."); continue; }
      vides = 0;
      if (/^(c est tout|c est bon|termine|j ai fini|fini|rien d autre|stop|voila c est tout|c est fini|ca sera tout)\b/.test(n) || (/\b(c est tout|j ai fini|c est fini)$/.test(n) && n.split(' ').length <= 5)) break;
      if (/^(annule|laisse tomber|on arrete)\b/.test(n)) { hideBoard(); return say("D'accord, on le fera plus tard."); }
      dicte.push(a); const z = document.getElementById('pl-dicte'); if (z) z.innerHTML = dicte.map(x => `<div>• ${esc(x)}</div>`).join('');
      try { fx.tone([[988, 0.06]]); } catch (e) { /* rien */ }
    }
    if (!dicte.length) { hideBoard(); await say(rituel ? "Je n'ai rien entendu de ton planning." : "Je n'ai rien entendu. On le fera quand tu veux : dis « on fait mon planning »."); return { statut: 'rien', l: [] }; }
    face.set('think'); patiente('Je range ton planning…', 'jour par jour, matin, midi, après-midi et soir'); await say('Je range tout.');
    let l; try { l = await analyse(dicte.join('. '), jours, ex); } catch (e) { l = null; } finally { face.set('idle'); }
    if (!l) { hideBoard(); await say("Je n'ai pas réussi à ranger ton planning. Redis-le-moi dans un instant."); return { statut: 'rien', l: [] }; }
    return valideEtEcris(l, ex, 'TON PLANNING');
  }
  // un seul rendez-vous : « ajoute à mon agenda dentiste jeudi à 15 h »
  async function ajoute(t) {
    if (!AI.ready()) return say("Pour noter ton rendez-vous, il me faut mon cerveau en ligne.");
    const jours = Array.from({ length: 21 }, (v, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
    let ex = []; try { ex = (await lire(21)).evenements || []; } catch (e) { ex = []; }
    face.set('think'); let l; try { l = await analyse(t, jours, ex); } catch (e) { l = null; } finally { face.set('idle'); }
    if (!l || !l.length) return say("Je n'ai pas compris le rendez-vous. Dis par exemple : ajoute à mon agenda dentiste jeudi à 15 heures.");
    return valideEtEcris(l, ex, 'À AJOUTER');
  }
  // enlever un rendez-vous qu'Atlas a noté : « enlève le dentiste de mon agenda »
  async function enleve(n) {
    let r; try { const r0 = VOIXMAISON.root(); r = await (await fetch(`${r0}/maison/agenda/ecris`, { cache: 'no-store' })).json(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const mots = n.split(' ').filter(w => w.length > 3 && !/^(enleve|retire|supprime|annule|efface|agenda|rendez|vous|planning|mon|dans|de|du)$/.test(w));
    const c = (r.atlas || []).filter(x => mots.some(w => N(x.titre).includes(w)));
    if (!c.length) return say("Je ne trouve pas ce rendez-vous parmi ceux que j'ai notés. Ceux que tu as mis toi-même dans Google Agenda, enlève-les dans l'application.");
    const x = c[0];
    if (!(await askYesNo(`J'enlève ${x.titre}, ${nomJour(x.debut)}${x.journee ? '' : ` à ${hm(x.debut)}`} ?`))) return say("D'accord, je le laisse.");
    try { await post({ supprime: [x.uid] }); } catch (e) { return say("Je n'ai pas réussi à l'enlever."); }
    fx.ok(); return say("C'est enlevé.");
  }
  // le dimanche soir, il propose
  let planningOffre = null;
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (d.getDay() !== 0 || h < 17.5 || h > 21.5 || !dlg.started || S.settings.planningAuto === false || S.planningSemaine === cleSemaine()) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    PROACTIF.annonce(`planning-${cleSemaine()}`, () => { planningOffre = { at: Date.now() }; dlg.attendReponse = Date.now() + 150000; return typeof SECRETAIRE !== 'undefined' ? "C'est dimanche soir : on prépare ta semaine ? D'abord ton planning, puis les repas faits pour ton planning, les courses et le drive pour lundi, et je t'imprime ta Gazette." : "C'est dimanche soir : on fait ton planning de la semaine ? Tu me dictes le pro et le perso, je range tout dans ton agenda."; }, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);
  // avant tout le reste (sinon « planifie ma semaine » partirait vers les menus)
  function routePlanning(t, n) {
    if (planningOffre && Date.now() - planningOffre.at < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|bien sur|carrement|go|on y va|c est parti)\b/.test(n)) return typeof SECRETAIRE !== 'undefined' ? () => { planningOffre = null; dlg.attendReponse = 0; return SECRETAIRE.semaine(); } : planifie;
      if (/^(non|pas ce soir|pas maintenant|plus tard|laisse)\b/.test(n)) return () => { planningOffre = null; dlg.attendReponse = 0; S.planningSemaine = cleSemaine(); save(); return say("D'accord. Dis « on fait mon planning » quand tu veux."); };
    }
    if (/\b(reprends|reprend|reprenons)\b.*\b(mon |le )?planning\b/.test(n) && S.planningEnAttente) return async () => { const p = S.planningEnAttente; S.planningEnAttente = null; save(); let ex = []; try { ex = (await lire(10)).evenements || []; } catch (e) { ex = []; } if (p.orig) { const siens = new Set(p.orig.map(x => `${N(x.titre)}|${epoque(x.date, x.debut)}`)); ex = ex.filter(e => !String(e.uid || '').startsWith('atlas-') && !siens.has(`${N(String(e.titre).replace(/ \(pro\)$/, ''))}|${e.debut}`)); } return valideEtEcris(p.l, ex, p.titre, p.orig); };
    if (/\b(modifie|modifier|change|changer|corrige|corriger|revois|revoir)\b.*\b(mon|le|ma) (planning|semaine|emploi du temps)\b/.test(n) && !/\b(menus?|repas|trading)\b/.test(n)) return modifiePlanning;
    if (/\b(ne me propose plus|arrete de me proposer)\b.*\bplanning\b/.test(n)) return () => { S.settings.planningAuto = false; save(); return say("D'accord, je ne te propose plus le planning le dimanche. Dis « on fait mon planning » quand tu veux."); };
    if (/\b(on fait|faisons|fais|faire|prepare|preparer|lance|commence|planifie|organise|organiser)( moi)? (mon|le|ton|un|ma|la)? ?(planning|programme|emploi du temps|agenda)( de la semaine| de ma semaine| pour la semaine)?\b|\b(planifie|organise|planifier|organiser)( moi)? (ma|la) semaine\b/.test(n) && !/\b(menus?|repas|courses|cuisine)\b/.test(n)) return planifie;
    if (/\b(ajoute|mets|note|inscris|cale|programme|rajoute)\b.*\b(a|dans|sur) (mon|l) agenda\b|\b(ajoute|note|cale|rajoute|prends)\b (un |le |mon )?(rendez vous|rdv|une reunion|un appel)\b/.test(n)) return () => ajoute(t);
    if (/\b(enleve|retire|supprime|annule|efface)\b.*\b(de|dans) (mon|l) (agenda|planning)\b/.test(n)) return () => enleve(n);
    if (/\b(imprime|imprimer)\b.*\b(planning|agenda|semaine pro|emploi du temps)\b/.test(n) && !/\bmenus?\b/.test(n)) return async () => { const ok = await imprimePlanning(); return say(ok ? "C'est parti : ton planning de la semaine s'imprime sur l'imprimante du bureau." : "Je n'arrive pas à joindre l'ordinateur pour imprimer."); };
    if (/\b(arrete|n imprime plus|ne plus imprimer)\b.*\bplanning\b/.test(n)) return () => { S.settings.imprimePlanning = false; save(); return say("D'accord, je n'imprime plus le planning tout seul. Dis « imprime mon planning » quand tu en veux un."); };
    if (/\b(adapte|ajuste|cale)\b.*\bmenus?\b.*\b(planning|agenda|semaine)\b/.test(n)) return async () => { const a = await CUISINE.adapte(); hideBoard(); if (!a) return say("Je n'ai pas pu adapter les menus pour le moment."); if (a.rien) return say("Tu n'as pas de menus en cours. Dis « fais les menus de la semaine » : ils suivront ton agenda."); return say(a.changes.length ? `J'ai adapté : ${a.changes.join(' ; ')}.` : 'Tes menus collent déjà à ton agenda.'); };
    return null;
  }

  function route(t, n) {
    if (/\b(ouvre|lance|affiche sur l ordi)\b/.test(n)) return null; // « ouvre mon agenda » : le site, sur l'ordinateur (pc.js)
    if (/\b(mon agenda|mes rendez vous|mes rdv|mon planning|mon programme|mon emploi du temps|mon prochain (rendez vous|rdv)|qu est ce que j ai (de prevu )?(aujourd hui|demain|cette semaine|ce matin|cet apres midi|ce soir)|j ai quoi (de prevu )?(aujourd hui|demain|cette semaine)|j ai (un|des) (rendez vous|rdv)|c est quand mon (rendez vous|rdv))\b/.test(n)) return () => dire(n);
    return null;
  }
  return { route, routePlanning, planifie, modifiePlanning, _grille: grille, _montre: montre, _lire: lire, aujourdhui, prochain, un, hm, propre, _analyse: analyse, _semaine: semaineCible };
})();

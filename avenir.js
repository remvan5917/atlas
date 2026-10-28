/* =========================================================
   ATLAS — l'avenir (après le secrétaire)
   - Le conseiller d'économies : « où je peux économiser ? » — ses charges passées au crible, sans inventer de prix
     (les comparateurs officiels pour vérifier) ; et le simulateur : « si je résilie Revolut Ultra et que je change de box,
     j'ai combien en décembre 2027 ? » → la courbe mois par mois, à l'écran et imprimée.
   - Les lettres prêtes à signer : « écris la lettre de résiliation du krav maga » → un vrai courrier (ses coordonnées,
     les références de ses papiers rangés), imprimé, gardé.
   - Les devoirs de son fils : « range les devoirs » (une photo du cahier ou de la liste de mots) → Shadow le fait réviser
     chaque soir (shadow/devoirs.js) ; le vendredi, le bilan : « il sait 9 mots sur 12, il bloque sur maintenant ».
   - La maison qui sait qu'il travaille : pendant ses rendez-vous pro et ses séances de trading, plus aucune annonce
     (sauf l'urgent), sa lampe de travail ; Shadow le sait. « Mode concentration pendant une heure », « fin de la concentration ».
   - La semaine écoulée, au dos de la Gazette : le sport, l'argent, les repas maison, les missions de son fils, son humeur,
     et un conseil.
   - Les papiers qui expirent : « ma carte d'identité expire en mars 2031 » → l'ordinateur prévient deux mois, un mois,
     une semaine avant.
   Rien de personnel dans ce fichier : tout est sur l'ordinateur de la maison.
   ========================================================= */
'use strict';

const AVENIR = (() => {
  const r0 = () => VOIXMAISON.root();
  const carnet = (nom, corps) => SECRETAIRE._carnet(nom, corps);
  const injoignable = () => say("L'ordinateur de la maison ne répond pas. Réessaie dans un instant.");
  const eu = v => (typeof PRIX !== 'undefined' ? PRIX.euros(v) : `${Math.round(v)} €`);
  const eu0 = v => `${Math.round(v).toLocaleString('fr-FR')} €`;
  const dJ = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const auj = () => dJ(new Date());
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOISC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dLong = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, '1er ');
  const json = raw => { const s = String(raw || ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); };
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const carte = (titre, couleur, corps) => `<div style="text-align:left;font-family:system-ui;min-width:min(92vw,640px)"><small style="letter-spacing:.3em;color:${couleur}">${esc(titre)}</small>${corps}</div>`;
  const imprime = async corps => { try { const r = await fetch(`${r0()}/maison/imprime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }); return r.ok; } catch (e) { return false; } };

  /* =================== 1. LE CONSEILLER D'ÉCONOMIES =================== */
  const lignesBudget = b => {
    const act = (b.charges || []).map((x, i) => [x, i]).filter(([x]) => !x.jusqua || auj() <= x.jusqua).map(([x, i]) => ({ id: `c${i}`, nom: x.nom, montant: +x.montant, cote: x.type === 'pro' ? 'perso (pro)' : 'perso', categorie: x.categorie, abonnement: !!x.abonnement, jusqua: x.jusqua || '' }));
    const soc = (((b.societe || {}).depenses) || []).map((x, i) => ({ id: `s${i}`, nom: x.nom, montant: +x.montant, cote: 'société', categorie: x.abonnement ? 'abonnement' : 'société', abonnement: !!x.abonnement }));
    return act.concat(soc);
  };
  const COMPARATEURS = "Pour l'énergie : le comparateur officiel et gratuit du médiateur national de l'énergie, energie-info.fr. Pour la banque : le comparateur public des tarifs bancaires, tarifs-bancaires.gouv.fr. Pour une assurance ou une mutuelle : demander deux ou trois devis à garanties égales. Pour une box ou un forfait : comparer les offres des opérateurs (sans donner de prix). Pour un abonnement logiciel : vérifier s'il sert vraiment, ou s'il existe une formule moins chère chez le même éditeur.";
  async function economies() {
    if (!AI.ready()) return say('Pour passer ton budget au crible, il me faut mon cerveau en ligne.');
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const l = lignesBudget(b); if (!l.length) return say("Je n'ai pas encore ton budget. Dis « mets à jour mon budget ».");
    face.set('think');
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu es un conseiller budgétaire honnête pour un père qui vit à l'équilibre (il lui reste très peu chaque mois). Passe ses dépenses au crible et propose les PISTES les plus utiles, de la plus rentable à la moins rentable, 6 au plus. RÈGLES ABSOLUES : n'annonce AUCUN prix de marché ni aucune offre précise (tu ne les connais pas à jour) ; un gain chiffré seulement s'il découle de ses montants (arrêter = le montant entier ; sinon "gain" vide) ; ne touche pas au loyer, à la pension alimentaire ni à l'alimentation de base ; respecte qu'un outil de travail (trading, IA, comptable) peut être nécessaire : propose alors de vérifier l'usage ou la formule. Où vérifier : ${COMPARATEURS} JSON UNIQUEMENT : {"pistes": [{"id": "c3", "action": "comparer|renégocier|vérifier l'usage|résilier si inutile|regrouper", "pourquoi": "moins de 22 mots", "ou": "où vérifier, d'après la liste", "gain": 0}], "resume": "une phrase"}` }, { role: 'user', content: JSON.stringify(l) }], { maxTokens: 1400, temperature: 0.2, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    const p = ((r && r.pistes) || []).map(x => Object.assign({}, x, { ligne: l.find(y => y.id === x.id) })).filter(x => x.ligne).slice(0, 6);
    if (!p.length) return say("Je n'ai pas réussi à analyser ton budget pour le moment.");
    showBoard(carte('OÙ ÉCONOMISER · SANS INVENTER DE PRIX', '#86efac', p.map((x, i) => `<div style="margin:9px 0;padding:9px 13px;border-radius:12px;background:rgba(255,255,255,.05)"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-size:17px">${i + 1}. ${esc(x.ligne.nom)} <span style="color:#94a3b8;font-size:13px;font-weight:500">${esc(x.ligne.cote)}</span></b><b>${eu(x.ligne.montant)}/mois</b></div><div style="color:#fde68a;font-size:14px;margin-top:2px">${esc(x.action)}${+x.gain > 0 ? ` · jusqu'à ${eu(+x.gain * 12)} par an` : ''}</div><div style="color:#cbd5e1;font-size:14px">${esc(x.pourquoi || '')}</div>${x.ou ? `<div style="color:#94a3b8;font-size:13px">Où vérifier : ${esc(x.ou)}</div>` : ''}</div>`).join('') + '<p style="color:#94a3b8;font-size:13px">Dis par exemple : « si je résilie Revolut Ultra, j’ai combien en décembre 2027 ? »</p>'));
    return say(`${r.resume ? `${r.resume} ` : ''}Les trois premières pistes : ${p.slice(0, 3).map(x => `${x.ligne.nom}, ${x.action}`).join(' ; ')}. Tout est à l'écran, avec où vérifier. Pour voir l'effet sur ton avenir, demande-moi une simulation.`);
  }
  // le simulateur : le cumul de ce qui reste chaque mois, d'aujourd'hui au mois visé, sans rien changer et avec les changements
  let simOffre = null;
  async function simule(t) {
    if (!AI.ready()) return say('Pour la simulation, il me faut mon cerveau en ligne.');
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const l = lignesBudget(b); if (!l.length) return say("Je n'ai pas encore ton budget. Dis « mets à jour mon budget ».");
    const rev = (b.revenus || []).reduce((s_, x) => s_ + +x.montant, 0);
    const socRev = (((b.societe || {}).revenus) || []).reduce((s_, x) => s_ + +x.montant, 0);
    face.set('think');
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu traduis une question de simulation budgétaire en changements précis. Aujourd'hui : ${auj()}. Ses lignes (id, nom, montant mensuel, côté) : ${JSON.stringify(l.map(x => [x.id, x.nom, x.montant, x.cote]))}. Revenu perso mensuel : ${rev} €. Revenu de la société : ${socRev} €. Chaque changement porte sur UNE ligne : "nouveau" = le nouveau montant mensuel (0 si résilié ; s'il dit « je change de box » sans prix, "nouveau" vide) ; "des" = AAAA-MM du premier mois concerné (le mois prochain par défaut). Un revenu en plus ou en moins : {"id": "revenu", "delta": 300} ou {"id": "revenu_societe", "delta": …}. "jusqua" = AAAA-MM du mois visé (12 mois plus tard s'il ne dit rien). JSON UNIQUEMENT : {"changements": [{"id": "c3", "nouveau": 0, "des": "AAAA-MM", "delta": 0}], "jusqua": "AAAA-MM", "manque": "ce qu'il faut lui demander (ex. le prix de la nouvelle box), ou vide"}` }, { role: 'user', content: t }], { maxTokens: 600, temperature: 0, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r) return say("Je n'ai pas compris la simulation. Dis par exemple : si je résilie Revolut Ultra, j'ai combien en décembre 2027 ?");
    let ch = (r.changements || []).filter(x => x && (x.id === 'revenu' || x.id === 'revenu_societe' || l.some(y => y.id === x.id)));
    // un prix manquant (« je change de box ») : on le demande
    for (const x of ch.filter(y => y.id !== 'revenu' && y.id !== 'revenu_societe' && (y.nouveau === '' || y.nouveau == null)).slice(0, 2)) {
      const lg = l.find(y => y.id === x.id);
      const a = await ask(`Combien coûterait ${lg.nom} par mois après le changement ? Dis par exemple : 30 euros.`, { wait: 15000 });
      const m = String(a).match(/(\d+(?:[,.]\d{1,2})?)/); x.nouveau = m ? parseFloat(m[1].replace(',', '.')) : lg.montant;
    }
    const d0 = new Date(); d0.setDate(1);
    const fin = /^\d{4}-\d{2}$/.test(r.jusqua || '') ? r.jusqua : dJ(new Date(d0.getFullYear() + 1, d0.getMonth(), 1)).slice(0, 7);
    const mois = []; for (const d = new Date(d0); dJ(d).slice(0, 7) <= fin && mois.length < 37; d.setMonth(d.getMonth() + 1)) mois.push(dJ(d).slice(0, 7));
    const socTouche = ch.some(x => x.id === 'revenu_societe' || String(x.id).startsWith('s'));
    const net = (m, avec) => {
      let tot = 0;
      for (const x of l) {
        if (x.cote === 'société' && !socTouche) continue;
        const c = (b.charges || [])[+x.id.slice(1)]; const fini = x.id.startsWith('c') && c && c.jusqua && `${m}-01` > c.jusqua; if (fini) continue;
        const k = avec && ch.find(y => y.id === x.id && (!y.des || m >= y.des));
        tot -= k ? +k.nouveau : x.montant;
      }
      tot += rev + (socTouche ? socRev : 0);
      if (avec) ch.filter(y => (y.id === 'revenu' || (y.id === 'revenu_societe' && socTouche)) && (!y.des || m >= y.des)).forEach(y => { tot += +y.delta || 0; });
      return tot;
    };
    let cb = 0, cs = 0; const base = [], scen = [];
    mois.forEach(m => { cb += net(m, false); cs += net(m, true); base.push(Math.round(cb * 100) / 100); scen.push(Math.round(cs * 100) / 100); });
    const libCh = ch.map(x => { if (x.id === 'revenu' || x.id === 'revenu_societe') return `${+x.delta >= 0 ? '+' : ''}${eu(+x.delta)} de revenu ${x.id === 'revenu' ? 'perso' : 'pour la société'} par mois${x.des ? ` dès ${MOIS[+x.des.slice(5) - 1]} ${x.des.slice(0, 4)}` : ''}`; const lg = l.find(y => y.id === x.id); return `${lg.nom} : ${+x.nouveau === 0 ? 'résilié' : `${eu(lg.montant)} → ${eu(+x.nouveau)}`}${x.des ? ` dès ${MOIS[+x.des.slice(5) - 1]} ${x.des.slice(0, 4)}` : ''} (${eu(lg.montant - +x.nouveau)} par mois)`; });
    const finLib = `${MOIS[+fin.slice(5) - 1]} ${fin.slice(0, 4)}`, diff = cs - cb;
    const titre = `Si ${ch.length ? 'tu fais ces changements' : 'rien ne change'}, fin ${finLib}`;
    const resume = `${socTouche ? 'Toi et ta société ensemble' : 'Ton côté perso'} : sans rien changer, ${eu0(cb)} mis de côté fin ${finLib} ; avec les changements, ${eu0(cs)}, soit ${diff >= 0 ? '+' : ''}${eu0(diff)}.`;
    simOffre = { at: Date.now(), job: { type: 'simulation', titre, resume, mois: mois.map(m => `${MOISC[+m.slice(5) - 1]} ${m.slice(2, 4)}`), base, scenario: scen, changements: libCh } }; dlg.attendReponse = Date.now() + 120000;
    const W = 600, H = 200, lo = Math.min(0, ...base, ...scen), hi = Math.max(1, ...base, ...scen), X = i => 10 + (W - 20) * i / Math.max(1, mois.length - 1), Y = v => 10 + (H - 20) * (1 - (v - lo) / (hi - lo || 1));
    const pl = a => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    showBoard(carte(titre.toUpperCase(), '#86efac', `<div style="display:flex;gap:22px;margin:10px 0;font-size:14px;color:#cbd5e1"><div>Sans rien changer<div style="font-size:24px;font-weight:800;color:#e2e8f0">${eu0(cb)}</div></div><div>Avec les changements<div style="font-size:24px;font-weight:800;color:#86efac">${eu0(cs)}</div></div><div>Différence<div style="font-size:24px;font-weight:800;color:${diff >= 0 ? '#86efac' : '#fca5a5'}">${diff >= 0 ? '+' : ''}${eu0(diff)}</div></div></div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${lo < 0 ? `<line x1="10" x2="${W - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="#475569" stroke-dasharray="4 3"/>` : ''}<polyline points="${pl(base)}" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="6 4"/><polyline points="${pl(scen)}" fill="none" stroke="#4ade80" stroke-width="3"/></svg>${libCh.length ? `<div style="font-size:14px;color:#cbd5e1;margin-top:6px">${libCh.map(esc).join('<br>')}</div>` : ''}<p style="color:#94a3b8;font-size:12px">Argent mis de côté chaque mois, cumulé, sans ton solde de départ.</p>`));
    return say(`${resume}${r.manque ? ` Pour être plus juste, il me manque : ${r.manque}.` : ''} Je l'imprime ?`);
  }

  /* =================== 2. LES LETTRES PRÊTES À SIGNER =================== */
  let lettreOffre = null;
  async function identite() {
    let p; try { p = await carnet('papiers'); } catch (e) { return null; }
    if (p.identite && p.identite.adresse) return p.identite;
    const a = await ask("Pour l'en-tête de tes courriers : dis-moi ton nom complet et ton adresse, avec le code postal et la ville.", { wait: 25000 });
    if (!a) return null;
    let id = null; try { id = json(await AI.chat([{ role: 'system', content: 'Range cette identité pour un en-tête de lettre française. JSON UNIQUEMENT : {"nom": "Prénom NOM", "adresse": "ligne 1\\nCODE POSTAL Ville", "ville": "Ville"}' }, { role: 'user', content: a }], { maxTokens: 150, temperature: 0, json: true })); } catch (e) { id = null; }
    if (!id || !id.adresse) return null;
    try { await carnet('papiers', { action: 'cle', cle: 'identite', valeur: id }); } catch (e) { /* tant pis */ }
    return id;
  }
  async function lettre(t) {
    if (!AI.ready()) return say('Pour écrire un courrier, il me faut mon cerveau en ligne.');
    const id = await identite(); if (!id) return say("Il me faut ton nom et ton adresse pour l'en-tête. Redis « écris la lettre de … » quand tu veux.");
    // ce qu'Atlas sait déjà : un papier rangé de ce destinataire (références), une charge du budget
    let pa = { items: [] }, bu = { charges: [] }; try { [pa, bu] = await Promise.all([carnet('papiers'), carnet('budget')]); } catch (e) { /* sans */ }
    const mots = N(t).split(' ').filter(w => w.length > 3 && !/^(ecris|redige|lettre|courrier|resiliation|reclamation|demande|pour|avec|mon|abonnement|contrat)$/.test(w));
    const pap = (pa.items || []).filter(x => mots.some(w => N([x.emetteur, x.objet, x.type].join(' ')).includes(w))).slice(-2);
    const ch = (bu.charges || []).filter(x => mots.some(w => N([x.nom, x.beneficiaire].join(' ')).includes(w))).slice(0, 2);
    face.set('think');
    let r = null;
    try { r = json(await AI.chat([{ role: 'system', content: `Tu rédiges un courrier administratif français, sobre et correct, à signer à la main. Expéditeur : ${id.nom}. Écris le CORPS seulement (pas d'adresse ni de date), au vouvoiement, avec la formule de politesse finale. RÈGLES : n'invente AUCUN article de loi, aucun numéro, aucune date de contrat ; ce que tu ne sais pas → [à compléter] (ex. [numéro d'adhérent à compléter]). Pour une résiliation : demander la résiliation à la prochaine échéance possible et la confirmation écrite ; suggérer l'envoi en recommandé avec accusé de réception (mention). Pour une réclamation : les faits, la demande précise, un délai raisonnable. JSON UNIQUEMENT : {"destinataire_nom": "…", "objet": "…", "references": "Réf. client : … (ou vide)", "corps": "…", "mention": "Lettre recommandée avec accusé de réception (ou vide)"}` }, { role: 'user', content: `Sa demande : ${t}\nCe que je sais : ${JSON.stringify({ papiers: pap.map(x => ({ emetteur: x.emetteur, objet: x.objet, reference: x.reference, date: x.date_doc })), budget: ch.map(x => ({ nom: x.nom, beneficiaire: x.beneficiaire, montant: x.montant, jour: x.jour })) })}` }], { maxTokens: 1100, temperature: 0.3, json: true })); } catch (e) { r = null; } finally { face.set('idle'); }
    if (!r || !r.corps) return say("Je n'ai pas réussi à écrire la lettre. Redis-moi ce qu'il faut écrire.");
    let dest = r.destinataire_nom || '';
    const ad = await ask(`La lettre est pour ${dest || 'le destinataire'}. Tu as son adresse ? Dis-la, ou dis « je l'écrirai à la main ».`, { wait: 25000 });
    if (ad && !/\b(main|sais pas|plus tard|non)\b/.test(N(ad))) dest = `${dest}\n${ad.replace(/,\s*/g, '\n')}`; else dest = `${dest}\n\n[adresse à compléter]`;
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const job = { type: 'lettre', expediteur: `${id.nom}\n${id.adresse}`, destinataire: dest.trim(), lieu_date: `${id.ville || ''}${id.ville ? ', le ' : 'Le '}${date}`, objet: r.objet || '', references: r.references || '', corps: r.corps, signature: id.nom, mention: r.mention || '' };
    lettreOffre = { at: Date.now(), job }; dlg.attendReponse = Date.now() + 150000;
    showBoard(carte('LA LETTRE · À SIGNER', '#e2e8f0', `<div style="background:#f8fafc;color:#111;border-radius:8px;padding:18px 22px;margin-top:10px;font:15px/1.5 Georgia,serif;max-height:62vh;overflow:auto"><div style="white-space:pre-line">${esc(job.expediteur)}</div><div style="white-space:pre-line;margin:12px 0 0 45%">${esc(job.destinataire)}</div><div style="margin:10px 0 0 45%">${esc(job.lieu_date)}</div>${job.mention ? `<p><b>${esc(job.mention)}</b></p>` : ''}<p><b>Objet :</b> ${esc(job.objet)}${job.references ? `<br><span style="font-size:13px">${esc(job.references)}</span>` : ''}</p><div style="white-space:pre-line">${esc(job.corps)}</div><p style="margin-left:45%">${esc(job.signature)}</p></div>`));
    const trous = (job.corps.match(/\[[^\]]+\]/g) || []).length + (/\[adresse/.test(job.destinataire) ? 1 : 0);
    return say(`Voici la lettre : ${job.objet}.${trous ? ` Il reste ${trous} chose${trous > 1 ? 's' : ''} à compléter à la main, entre crochets.` : ''}${job.mention ? ' Envoie-la en recommandé avec accusé de réception.' : ''} Je l'imprime ?`);
  }
  async function imprimeLettre() {
    const o = lettreOffre; lettreOffre = null; dlg.attendReponse = 0; if (!o) return;
    const ok = await imprime(o.job);
    try { await carnet('lettres', { action: 'ajoute', item: { objet: o.job.objet, destinataire: o.job.destinataire.split('\n')[0], date: auj(), corps: o.job.corps } }); } catch (e) { /* tant pis */ }
    hideBoard(); fx.ok();
    return say(ok ? "Elle s'imprime sur l'imprimante du bureau. Il ne reste qu'à la signer. Je la garde aussi dans tes courriers." : "Je n'arrive pas à joindre l'ordinateur pour l'imprimer. Je l'ai quand même gardée.");
  }

  /* =================== 3. LES DEVOIRS DE SON FILS (Shadow le fait réviser) =================== */
  function scanneDevoirs() {
    showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,460px)"><small style="letter-spacing:.3em;color:#7dd3fc">LES DEVOIRS · LE CAHIER OU LA LISTE DE MOTS</small><p style="font-size:16px;color:#e2e8f0">Prends en photo la page du cahier de liaison, du cahier de textes, ou la liste de mots de la semaine.</p><label style="display:inline-block;margin-top:6px;padding:16px 26px;border-radius:14px;background:#0284c7;color:#fff;font:700 20px system-ui;cursor:pointer">📷 Photographier<input id="av-dv" type="file" accept="image/*" capture="environment" style="display:none"></label></div>`);
    const inp = document.getElementById('av-dv');
    if (inp) inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) lisDevoirs(f).catch(() => say("Je n'ai pas réussi à lire la page.")); });
    return say('Prends la page en photo : je trouve les devoirs et les mots à apprendre, et Shadow le fera réviser chaque soir.');
  }
  const reduit = f => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1800 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = ko; im.src = URL.createObjectURL(f); });
  async function lisDevoirs(f) {
    const img = await reduit(f);
    showBoard('<div style="font-family:system-ui;text-align:center;color:#e2e8f0;font-size:18px">Je lis la page…</div>'); face.set('think');
    const q = `Ceci est une page de cahier d'un enfant de CE1 (cahier de liaison, cahier de textes, ou liste de mots à apprendre), en français, souvent manuscrite. Aujourd'hui : ${auj()}. Réponds UNIQUEMENT en JSON : {"devoirs": [{"matiere": "…", "quoi": "court, clair", "pour": "AAAA-MM-JJ ou vide"}], "mots": ["les mots de la liste à apprendre, tels qu'écrits"], "poesie": "titre de la poésie à apprendre, ou vide", "tables": [3], "mot_parents": "un mot de l'école aux parents, ou vide"}. Pas d'invention : vide si tu ne lis pas.`;
    let txt = '';
    try { if (S.settings.seeCloud && S.settings.key) txt = await AI.see(img, q); if (!txt && typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { const j = await (await fetch(`${r0()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question: q }) })).json(); txt = j && j.texte; } } catch (e) { txt = ''; }
    let r = null; try { r = json(txt); } catch (e) { r = null; }
    face.set('idle');
    if (!txt) { hideBoard(); return say("Je n'ai pas de vision disponible pour lire la page. Active la vision détaillée dans mes réglages."); }
    if (!r || (!(r.devoirs || []).length && !(r.mots || []).length && !r.poesie)) { hideBoard(); return say("Je n'arrive pas à lire cette page. Reprends la photo bien à plat, avec plus de lumière."); }
    // une phrase de dictée pour chaque mot (Shadow la dit, comme à l'école)
    let mots = (r.mots || []).map(String).filter(Boolean).slice(0, 20).map(t_ => ({ t: t_.trim(), phrase: '' }));
    if (mots.length && AI.ready()) { try { const p = json(await AI.chat([{ role: 'system', content: "Pour chaque mot, une phrase de dictée très simple pour un enfant de CE1 (7 ans), qui contient le mot exactement tel quel. JSON UNIQUEMENT : {\"phrases\": [\"…\"]} dans le même ordre." }, { role: 'user', content: mots.map(m => m.t).join('\n') }], { maxTokens: 900, temperature: 0.4, json: true })); (p.phrases || []).forEach((ph, i) => { if (mots[i] && String(ph).toLowerCase().includes(mots[i].t.toLowerCase())) mots[i].phrase = String(ph); }); } catch (e) { /* sans phrases */ } }
    mots = mots.map(m => ({ t: m.t, phrase: m.phrase || `Le mot ${m.t}.` }));
    const sem = { at: Math.floor(Date.now() / 1000), devoirs: (r.devoirs || []).filter(x => x && x.quoi).slice(0, 12), mots, poesie: r.poesie || '', tables: (r.tables || []).map(Number).filter(x => x > 1 && x < 11).slice(0, 3), mot_parents: r.mot_parents || '' };
    try { await carnet('devoirs', { action: 'cle', cle: 'semaine', valeur: sem }); await carnet('devoirs', { action: 'cle', cle: 'resultats', valeur: {} }); } catch (e) { return injoignable(); }
    showBoard(carte('LES DEVOIRS DE LA SEMAINE', '#7dd3fc', `${sem.devoirs.map(x => `<div style="font-size:17px;padding:4px 0">• <b>${esc(x.matiere || '')}</b> ${esc(x.quoi)}${x.pour ? ` <span style="color:#fde68a">pour ${esc(new Date(`${x.pour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }))}</span>` : ''}</div>`).join('')}${mots.length ? `<div style="margin-top:10px;color:#7dd3fc;font-size:13px;letter-spacing:.2em">LES MOTS (${mots.length})</div><div style="font-size:17px">${esc(mots.map(m => m.t).join(' · '))}</div>` : ''}${sem.poesie ? `<div style="margin-top:8px">Poésie : ${esc(sem.poesie)}</div>` : ''}${sem.mot_parents ? `<div style="margin-top:8px;color:#fca5a5">Mot de l'école : ${esc(sem.mot_parents)}</div>` : ''}`));
    fx.ok();
    return say(`C'est noté : ${sem.devoirs.length ? `${sem.devoirs.length} devoir${sem.devoirs.length > 1 ? 's' : ''}` : ''}${sem.devoirs.length && mots.length ? ' et ' : ''}${mots.length ? `${mots.length} mots à apprendre` : ''}${sem.poesie ? `, et la poésie « ${sem.poesie} »` : ''}. Shadow le fera réviser chaque soir, et je te fais le bilan vendredi.${sem.mot_parents ? ` Il y a aussi un mot de l'école : ${sem.mot_parents}.` : ''}`);
  }
  async function bilanDevoirs(silencieux) {
    let d; try { d = await carnet('devoirs'); } catch (e) { return silencieux ? null : injoignable(); }
    const sem = d.semaine || {}, res = d.resultats || {}, mots = sem.mots || [];
    if (!mots.length) return silencieux ? null : say("Je n'ai pas encore les mots de la semaine. Dis « range les devoirs » et prends la page en photo.");
    const vus = mots.filter(m => res[m.t]), sus = vus.filter(m => res[m.t].ok > 0 && res[m.t].dernier === 'ok'), durs = vus.filter(m => res[m.t].fail > 0 && res[m.t].dernier !== 'ok');
    const prenom = LIEN.prenom() || 'Ton fils';
    const t = !vus.length ? `${prenom} n'a pas encore révisé ses mots avec Shadow cette semaine.` : `${prenom} sait ${sus.length} mot${sus.length > 1 ? 's' : ''} sur ${mots.length}.${durs.length ? ` Il bloque sur ${liste(durs.slice(0, 4).map(m => `« ${m.t} »`))}.` : ' Bravo à lui !'}${vus.length < mots.length ? ` ${mots.length - vus.length} pas encore révisé${mots.length - vus.length > 1 ? 's' : ''}.` : ''}`;
    return silencieux ? t : say(t);
  }
  async function devoirsAfaire() { // pour la Gazette : les devoirs datés de la semaine
    try { const d = await carnet('devoirs'); return ((d.semaine || {}).devoirs || []).filter(x => x.pour).map(x => ({ t: `${LIEN.prenom() || 'Ton fils'} : ${x.matiere ? `${x.matiere}, ` : ''}${x.quoi}`, d: x.pour, g: 'fils' })); } catch (e) { return []; }
  }

  /* =================== 4. LA MAISON QUI SAIT QU'IL TRAVAILLE =================== */
  const TRADING = /\b(MYM|MNQ|MGC|M6E|MCL|MES|Open US|Fen[êe]tre active|session de trading|trading)\b/i;
  let conc = { jusqua: 0, raison: '', manuel: false }, evtsCache = { at: 0, l: [] };
  const concentre = () => conc.jusqua > Date.now();
  async function tic() {
    if (!dlg.started || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    if (Date.now() - evtsCache.at > 5 * 60000) { try { evtsCache = { at: Date.now(), l: ((await AGENDA._lire(1)).evenements || []) }; } catch (e) { evtsCache.at = Date.now(); } }
    const now = Date.now() / 1000;
    const enCours = S.settings.concentrationAuto === false ? null : evtsCache.l.find(e => !e.journee && e.debut <= now && e.fin > now && (e.pro || /\(pro\)$/.test(e.titre) || TRADING.test(e.titre)));
    const avant = concentre();
    if (!conc.manuel) conc = enCours ? { jusqua: enCours.fin * 1000, raison: TRADING.test(enCours.titre) ? 'trading' : 'travail', manuel: false } : { jusqua: 0, raison: '', manuel: false };
    if (concentre() && !avant) debut();
    if (!concentre() && avant) fin_();
  }
  async function debut() {
    try { await fetch(`${r0()}/maison/concentration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jusqua: Math.floor(conc.jusqua / 1000), raison: conc.raison }) }); } catch (e) { /* tant pis */ }
    const lampe = S.settings.lampeTravail;
    if (lampe) { try { await fetch(`${r0()}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [lampe], allume: true }) }); } catch (e) { /* tant pis */ } }
    try { fx.tone([[660, 0.08], [880, 0.12]]); } catch (e) { /* rien */ }
    try { if (typeof SCIFI !== 'undefined' && SCIFI.hud) SCIFI.hud('Concentration', [['jusqu’à', new Date(conc.jusqua).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), 'ok'], ['annonces', 'en attente', 'ok']]); } catch (e) { /* rien */ }
  }
  async function fin_() {
    conc = { jusqua: 0, raison: '', manuel: false };
    try { await fetch(`${r0()}/maison/concentration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jusqua: 0 }) }); } catch (e) { /* tant pis */ }
    PROACTIF.annonce(`conc-fin-${Date.now()}`, 'Fin de ta concentration. Je te dis ce qui attendait.', { expire: Date.now() + 30 * 60000 });
  }
  async function manuel(t, n) {
    const m = n.match(/\b(\d{1,3}) ?(minutes?|min|heures?|h)\b/), j = n.match(/\bjusqu a (\d{1,2}) ?h(?: ?(\d{2}))?\b/);
    let jusqua = Date.now() + 60 * 60000;
    if (m) jusqua = Date.now() + +m[1] * (/^h/.test(m[2]) ? 3600000 : 60000);
    else if (/\b(une heure|1 heure)\b/.test(n)) jusqua = Date.now() + 3600000;
    else if (/\bdeux heures\b/.test(n)) jusqua = Date.now() + 2 * 3600000;
    else if (/\b(une demi heure|30 minutes)\b/.test(n)) jusqua = Date.now() + 30 * 60000;
    if (j) { const d = new Date(); d.setHours(+j[1], +(j[2] || 0), 0, 0); if (d > new Date()) jusqua = +d; }
    conc = { jusqua, raison: 'travail', manuel: true }; await debut();
    return say(`Mode concentration jusqu'à ${new Date(jusqua).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')}. Je garde tout pour après, sauf l'urgent.`);
  }
  setInterval(() => { tic().catch(() => {}); }, 60000);

  /* =================== 5. LA SEMAINE ÉCOULÉE (au dos de la Gazette) =================== */
  const SPORT = /\b(gym|gymnastique|krav|sport|muscu|musculation|fitness|footing|course a pied|running|natation|piscine|velo|salle)\b/;
  async function bilan() {
    const now = Date.now() / 1000, debut7 = now - 7 * 86400, lignes = [];
    const lire = async u => { try { return await (await fetch(`${r0()}${u}`, { cache: 'no-store' })).json(); } catch (e) { return null; } };
    const [ag, bu, mi, hu, cu, dv, pa] = await Promise.all([lire('/maison/agenda?jours=1'), carnet('budget').catch(() => null), lire('/maison/missions'), lire('/maison/voix/humeur'), typeof CUISINE !== 'undefined' ? CUISINE._charge(true).catch(() => null) : null, bilanDevoirs(true).catch(() => null), carnet('papiers').catch(() => null)]);
    const passes = ((ag && ag.evenements) || []).filter(e => e.debut >= debut7 && e.debut < now);
    const sport = passes.filter(e => SPORT.test(N(e.titre)) && !/\b(pas de|annule|annulee|sans)\b/.test(N(e.titre)));
    lignes.push(['Sport', sport.length ? `${sport.length} séance${sport.length > 1 ? 's' : ''} : ${[...new Set(sport.map(e => e.titre.replace(/\s*\(pro\)$/, '')))].slice(0, 4).join(', ')}` : 'aucune séance dans ton agenda']);
    if (bu) {
      const dep = (bu.items || []).filter(x => x.type === 'depense' && x.date >= dJ(new Date((debut7) * 1000)));
      const ali = dep.filter(x => x.categorie === 'alimentation').reduce((s_, x) => s_ + +x.montant, 0), tot = dep.reduce((s_, x) => s_ + +x.montant, 0);
      const prevu = ((bu.charges || []).find(x => x.categorie === 'alimentation') || {}).montant || 0;
      lignes.push(['Argent', dep.length ? `${eu(tot)} de dépenses notées, dont ${eu(ali)} de courses${prevu ? ` (repère : ${eu(prevu / 4.33)} par semaine)` : ''}` : 'aucune dépense notée (photographie tes tickets)']);
    }
    if (cu) { const rp = (cu.repas || []).filter(x => x.at >= debut7); lignes.push(['Repas maison', rp.length ? `${rp.length} cuisiné${rp.length > 1 ? 's' : ''} avec Atlas : ${rp.slice(-4).map(x => x.plat).join(', ')}` : 'aucun repas cuisiné avec Atlas']); }
    if (mi && mi.grade) lignes.push([`${LIEN.prenom() || 'Ton fils'}`, `${mi.semaine || 0} point${(mi.semaine || 0) > 1 ? 's' : ''} de missions cette semaine, grade ${mi.grade || '—'}${dv ? ` ; ${dv}` : ''}`]);
    if (hu && hu.pret) lignes.push(['Ton humeur', `d'après ta voix : ${hu.etat}`]);
    if (typeof VIE !== 'undefined') { try { const lt = await VIE.ligneTrading(); if (lt) lignes.push(lt); } catch (e) { /* sans */ } }
    if (pa) { const faits = (pa.items || []).filter(x => x.fait_le && x.fait_le >= dJ(new Date(debut7 * 1000))); if (faits.length) lignes.push(['Papiers', `${faits.length} réglé${faits.length > 1 ? 's' : ''} : ${faits.slice(0, 3).map(x => x.objet).join(', ')}`]); }
    let conseil = '';
    if (AI.ready()) { try { conseil = String(await AI.chat([{ role: 'system', content: "D'après ce bilan de sa semaine, donne UN seul conseil concret, bienveillant et réaliste pour la semaine qui vient (une phrase, moins de 25 mots, en tutoyant, sans émoji)." }, { role: 'user', content: lignes.map(l => `${l[0]} : ${l[1]}`).join('\n') }], { maxTokens: 80, temperature: 0.5 })).replace(/^["«\s]+|["»\s]+$/g, '').trim(); } catch (e) { conseil = ''; } }
    return { lignes, conseil };
  }

  /* =================== 6. LES PAPIERS QUI EXPIRENT =================== */
  const DOCS = [[/\b(carte d identite|cni)\b/, "Ta carte d'identité"], [/\bpasseport\b/, 'Ton passeport'], [/\bpermis( de conduire)?\b/, 'Ton permis de conduire'], [/\b(assurance (de la |de ma )?(voiture|auto|mini))\b/, "L'assurance de la voiture"], [/\btitre de sejour\b/, 'Ton titre de séjour'], [/\bcarte vitale\b/, 'Ta carte Vitale'], [/\b(carte grise)\b/, 'La carte grise']];
  async function expire(t, n) {
    const doc = DOCS.find(([re]) => re.test(n)); if (!doc) return null;
    const d = await SECRETAIRE._date(t);
    if (!d) return say(`À quelle date ? Dis par exemple : ${doc[1].charAt(0).toLowerCase() + doc[1].slice(1)} expire en mars 2031.`);
    let pa; try { pa = await carnet('papiers'); } catch (e) { return injoignable(); }
    const x = (pa.items || []).find(y => y.objet === doc[1]);
    try { if (x) await carnet('papiers', { action: 'modifie', id: x.id, champs: { expire_le: d, renouvele: false } }); else await carnet('papiers', { action: 'ajoute', item: { id: ('00000000' + Math.random().toString(16).slice(2, 10)).slice(-8), type: 'identité', categorie: 'identite', objet: doc[1], expire_le: d, a_faire: 'garder' } }); } catch (e) { return injoignable(); }
    const dans = Math.round((new Date(`${d}T12:00:00`) - new Date()) / 86400000);
    fx.ok(); return say(`C'est noté : ${doc[1].charAt(0).toLowerCase() + doc[1].slice(1)} expire le ${dLong(d)}. ${dans < 60 ? "C'est bientôt : pense à le renouveler dès maintenant." : 'Je te préviendrai deux mois avant, un mois avant, et une semaine avant.'}`);
  }
  async function quandExpire(n) {
    let pa; try { pa = await carnet('papiers'); } catch (e) { return injoignable(); }
    const l = (pa.items || []).filter(x => x.expire_le && !x.renouvele).sort((a, b) => a.expire_le.localeCompare(b.expire_le));
    const doc = DOCS.find(([re]) => re.test(n)), x = doc ? l.find(y => y.objet === doc[1]) : null;
    if (doc && !x) return say(`Je ne connais pas la date d'expiration. Dis-moi : ${doc[1].charAt(0).toLowerCase() + doc[1].slice(1)} expire le …`);
    if (x) return say(`${x.objet} expire le ${dLong(x.expire_le)}.`);
    return say(l.length ? `Tes papiers : ${l.slice(0, 5).map(y => `${y.objet.charAt(0).toLowerCase() + y.objet.slice(1)}, ${new Date(`${y.expire_le}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`).join(' ; ')}.` : "Je ne connais encore aucune date d'expiration. Dis-moi par exemple : ma carte d'identité expire en mars 2031.");
  }
  async function expirantsAfaire(au) { // pour la Gazette : ce qui expire dans les deux mois
    try { const pa = await carnet('papiers'); const lim = dJ(new Date(Date.now() + 60 * 86400000)); return (pa.items || []).filter(x => x.expire_le && !x.renouvele && x.expire_le <= lim).map(x => ({ t: `${x.objet} expire le ${new Date(`${x.expire_le}T12:00:00`).toLocaleDateString('fr-FR')} : à renouveler`, d: x.expire_le <= au ? x.expire_le : '', g: 'papiers' })); } catch (e) { return []; }
  }

  /* =================== le vendredi soir : le bilan des devoirs =================== */
  setInterval(() => {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (d.getDay() !== 5 || h < 18 || h > 20.5 || !dlg.started || S.devoirsBilan === dJ(d) || (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal())) return;
    PROACTIF.annonce(`devoirs-${dJ(d)}`, async () => { S.devoirsBilan = dJ(new Date()); save(); const t = await bilanDevoirs(true); return t ? `Le bilan des devoirs : ${t}` : ''; }, { expire: Date.now() + 3 * 3600000 });
  }, 10 * 60000);

  /* =================== les phrases =================== */
  /* ---------- les prélèvements à venir (son tableau des dépenses : le jour du mois, le montant, le compte) ---------- */
  const euros = v => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} euros`;
  function aVenir(charges, debut, jours) {
    const out = [];
    for (let k = 0; k < jours; k++) {
      const d = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + k), dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      for (const x of charges || []) {
        if (!x.jour || !x.montant || (x.jusqua && dJ(d) > x.jusqua)) continue;
        if (d.getDate() === Math.min(+x.jour, dernier)) out.push({ d, x }); // le 31 d'un mois de 30 jours : le 30
      }
    }
    return out;
  }
  const jourDit = d => { const k = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000); return k === 0 ? "aujourd'hui" : k === 1 ? 'demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }); };
  function parCompte(l) { const m = {}; l.forEach(({ x }) => { const c = x.compte || 'ton compte'; m[c] = (m[c] || 0) + Math.abs(+x.montant); }); return m; }
  async function prelevements(n) {
    let b; try { b = await carnet('budget'); } catch (e) { return injoignable(); }
    const jours = /\bmois\b/.test(n) ? 31 : /\bprochain\b/.test(n) && !/\bsemaine\b/.test(n) ? 62 : 7;
    let l = aVenir(b.charges, new Date(), jours);
    if (/\bprochain\b/.test(n) && !/\b(semaine|mois)\b/.test(n)) l = l.slice(0, 1);
    if (!l.length) return say(jours === 7 ? 'Aucun prélèvement prévu dans les sept prochains jours.' : 'Aucun prélèvement prévu sur cette période.');
    const tot = parCompte(l);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,620px)"><small style="letter-spacing:.3em;color:#fcd34d">PRÉLÈVEMENTS À VENIR · ${jours === 7 ? '7 JOURS' : jours === 31 ? 'CE MOIS-CI' : 'LE PROCHAIN'}</small>
${l.map(({ d, x }) => `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px dotted rgba(255,255,255,.12)"><span style="flex:0 0 110px;color:#94a3b8">${esc(jourDit(d))}</span><span style="flex:1">${esc(x.nom || x.beneficiaire || '')}</span><span style="flex:0 0 130px;color:#94a3b8">${esc(x.compte || '')}</span><b style="flex:0 0 90px;text-align:right">${esc(Math.abs(+x.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 }))} €</b></div>`).join('')}
<div style="margin-top:10px;font-size:14px;color:#cbd5e1">${Object.entries(tot).map(([c, v]) => `${esc(c)} : <b>${esc(v.toLocaleString('fr-FR', { minimumFractionDigits: 2 }))} €</b>`).join(' · ')}</div></div>`);
    const dits = l.slice(0, 6).map(({ d, x }) => `${jourDit(d)}, ${x.nom || x.beneficiaire} : ${euros(Math.abs(+x.montant))} sur ${x.compte || 'ton compte'}`);
    return say(`${l.length === 1 ? 'Le prochain prélèvement' : `${l.length} prélèvements`} : ${dits.join(' ; ')}${l.length > 6 ? ', et le reste à l’écran' : ''}.${Object.keys(tot).length > 1 || l.length > 1 ? ` En tout : ${Object.entries(tot).map(([c, v]) => `${euros(v)} sur ${c}`).join(', ')}.` : ''}`);
  }
  // il prévient tout seul : la veille au matin (à partir de 9 h), et le lundi le total de la semaine, compte par compte
  setInterval(async () => {
    const h = new Date().getHours(); if (h < 9 || h >= 21 || !dlg.started || voice.occupe()) return;
    if (typeof CONSTELLATION !== 'undefined' && !CONSTELLATION.principal()) return;
    const j = auj(); if (S.prelevDit === j) return;
    let b; try { b = await carnet('budget'); } catch (e) { return; }
    S.prelevDit = j; save();
    const demain = new Date(); demain.setDate(demain.getDate() + 1);
    const ld = aVenir(b.charges, new Date(), 1), l = aVenir(b.charges, demain, 1);
    const dire = q => q.map(({ x }) => `${x.nom || x.beneficiaire}, ${euros(Math.abs(+x.montant))} sur ${x.compte || 'ton compte'}`).join(' ; ');
    // au jour le jour, sans qu'il demande : aujourd'hui et demain, en une phrase (rien à dire : il se tait)
    if (ld.length || l.length) PROACTIF.annonce(`prelev-${j}`, [ld.length ? `Aujourd'hui, ${ld.length > 1 ? `${ld.length} prélèvements` : 'un prélèvement'} : ${dire(ld)}.` : '', l.length ? `Demain, ${l.length > 1 ? `${l.length} prélèvements` : 'un prélèvement'} : ${dire(l)}.` : (ld.length ? 'Demain, rien.' : '')].filter(Boolean).join(' '), { expire: Date.now() + 10 * 3600000 });
    if (new Date().getDay() === 1) {
      const s7 = aVenir(b.charges, new Date(), 7);
      if (s7.length) PROACTIF.annonce(`prelev-semaine-${j}`, `Cette semaine, ${s7.length} prélèvement${s7.length > 1 ? 's' : ''} : ${Object.entries(parCompte(s7)).map(([c, v]) => `${euros(v)} sur ${c}`).join(', ')}. Dis « mes prélèvements » pour le détail.`, { expire: Date.now() + 10 * 3600000 });
    }
  }, 10 * 60000);

  function route(t, n) {
    if (/\b(prelevements?|prelevement)\b/.test(n) && !/\b(ajoute|enleve|supprime|retire)\b/.test(n)) return () => prelevements(n);
    if (simOffre && Date.now() - simOffre.at < 150000) {
      if (/^(oui|ouais|ok|d accord|vas y|imprime|bien sur)\b/.test(n)) return async () => { const o = simOffre; simOffre = null; dlg.attendReponse = 0; const ok = await imprime(o.job); return say(ok ? "La simulation s'imprime sur l'imprimante du bureau." : "Je n'arrive pas à joindre l'ordinateur pour imprimer."); };
      if (/^(non|pas la peine|laisse)\b/.test(n)) return () => { simOffre = null; dlg.attendReponse = 0; return say("D'accord."); };
    }
    if (lettreOffre && Date.now() - lettreOffre.at < 180000) {
      if (/^(oui|ouais|ok|d accord|vas y|imprime|imprime la|bien sur)\b/.test(n)) return imprimeLettre;
      if (/^(non|pas la peine|laisse|annule)\b/.test(n)) return () => { lettreOffre = null; dlg.attendReponse = 0; hideBoard(); return say("D'accord, je ne l'imprime pas."); };
    }
    // les économies, la simulation
    if (/\b(ou|comment) (je peux |puis je |pourrais je )?(economiser|faire des economies)\b|\baide moi a economiser\b|\bpasse mon budget au crible\b|\bmes pistes d economies\b/.test(n)) return economies;
    if (/\b(si je|et si je|simule|simulation)\b/.test(n) && /\b(combien|j aurai|j ai|il me reste|reste|economise|mis de cote|fin|budget|resilie|change|arrete|baisse|gagne)\b/.test(n)) return () => simule(t);
    // les lettres
    if (/\b(ecris|redige|prepare|fais)( moi)? (la |une |le |un )?(lettre|courrier)\b/.test(n)) return () => lettre(t);
    // les devoirs
    if (/\b(range|photographie|scanne|lis|note)\b.*\b(devoirs|cahier de liaison|cahier de textes|liste de mots|mots de la semaine|poesie)\b/.test(n)) return scanneDevoirs;
    if (/\b(bilan|ou en est|comment vont|comment ca va)\b.*\b(devoirs|mots de la semaine|dictee)\b/.test(n)) return () => bilanDevoirs(false);
    // la concentration
    if (/\b(fin de (la |ma )?concentration|arrete (le mode |la )?concentration|j ai fini de travailler)\b/.test(n)) return () => { const etait = concentre(); conc = { jusqua: 0, raison: '', manuel: true }; setTimeout(() => { conc.manuel = false; }, 30 * 60000); if (etait) fin_(); return say("Fin de la concentration. La maison redevient bavarde."); };
    if (/\b(mode concentration|je me concentre|je dois me concentrer|ne me derange pas|ne pas me deranger)\b/.test(n)) return () => manuel(t, n);
    if (/\bma lampe de travail\b/.test(n)) return () => { const a = typeof MAISON !== 'undefined' ? MAISON._trouve(String(t).replace(/^.*?lampe de travail\s*,?\s*(c['’]est|est)?\s*/i, ''), true)[0] : null; if (!a) return say("Je ne trouve pas cette lampe. Dis par exemple : ma lampe de travail, c'est le salon."); S.settings.lampeTravail = a.id; save(); return say(`C'est noté : ${a.nom}, ta lampe de travail. Je l'allumerai quand tu te concentres.`); };
    if (/\b(pas de|arrete la|plus de) concentration automatique\b/.test(n)) return () => { S.settings.concentrationAuto = false; save(); return say("D'accord : la concentration seulement quand tu me la demandes."); };
    // les papiers qui expirent
    const unDoc = DOCS.some(([re]) => re.test(n));
    if (/\b(expire|expirent|expiration|perime|n est plus valable|fin de validite|valable jusqu)\b/.test(n) && /\b(quand|c est quand|quelle date)\b/.test(n) && (unDoc || /\bmes papiers\b/.test(n))) return () => quandExpire(n);
    if (/\b(expire|expirent|expiration|perime|valable jusqu)\b/.test(n) && unDoc) return () => expire(t, n);
    if (/\bj ai renouvele\b.*\b(carte d identite|passeport|permis|carte vitale|titre de sejour)\b/.test(n)) return async () => { const doc = DOCS.find(([re]) => re.test(n)); let pa; try { pa = await carnet('papiers'); } catch (e) { return injoignable(); } const x = (pa.items || []).find(y => doc && y.objet === doc[1]); if (x) { try { await carnet('papiers', { action: 'modifie', id: x.id, champs: { renouvele: true } }); } catch (e) { /* rien */ } } return say(`Bravo ! Dis-moi la nouvelle date : ${doc ? doc[1].charAt(0).toLowerCase() + doc[1].slice(1) : 'il'} expire le …`); };
    return null;
  }
  return { route, concentre, bilan, devoirsAfaire, expirantsAfaire, _simule: simule };
})();

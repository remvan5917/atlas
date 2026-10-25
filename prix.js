/* =========================================================
   ATLAS — les courses au meilleur prix (Aldi, Leclerc, Lidl)
   - Le ticket de caisse : « scanne mon ticket » → une photo (le téléphone), il lit chaque ligne et retient le prix de chaque
     article dans ce magasin ; il signale ce qui était nettement moins cher ailleurs ; il range les produits au garde-manger.
   - Les prix dits : « le lait est à 0,95 € chez Lidl ».
   - « Où faire mes courses ? » : la liste de courses comparée — le total dans chaque magasin, et un deuxième magasin
     seulement si l'économie dépasse 5 € (le partage est gardé : « mode magasin Lidl » ne montre que les articles de Lidl).
   - « Prépare le drive » : un lien de recherche sur le drive Leclerc pour chaque article (on ajoute au panier soi-même).
   Il ne commande et ne paie jamais rien. Les prix viennent des tickets de papa : plus il en photographie, plus c'est juste.
   ========================================================= */
'use strict';

const PRIX = (() => {
  const root = () => VOIXMAISON.root();
  async function appel(corps) {
    const r0 = root(); if (!r0) throw new Error('pas de maison');
    const r = await fetch(`${r0}/maison/prix`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`prix ${r.status}`);
    return r.json();
  }
  const injoignable = () => say("Je n'arrive pas à joindre l'ordinateur de la maison.");
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const MAG = { aldi: 'Aldi', leclerc: 'Leclerc', lidl: 'Lidl', autre: 'un autre magasin' };
  const MAGS = ['aldi', 'leclerc', 'lidl'];
  const euros = v => `${(Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')} €`;
  const magDe = n => (/\baldi\b/.test(n) ? 'aldi' : /\b(leclerc|e leclerc)\b/.test(n) ? 'leclerc' : /\blidl\b/.test(n) ? 'lidl' : '');
  const SEUIL = () => +(S.settings.seuilDeuxMagasins || 5);
  // un article de la liste ↔ une ligne de prix : les mots qui comptent en commun (sans les quantités)
  const VIDE = /^(de|du|des|la|le|les|l|en|au|aux|a|et|bio|nature|frais|fraiche|fraiches|pack|lot|x|g|kg|cl|ml|l|piece|pieces|sachet|boite|barquette|filet|tranche|tranches|gr|unite)$/;
  const mots = t => N(String(t).replace(/\(.*?\)/g, '')).split(' ').filter(w => w.length > 2 && !VIDE.test(w) && !/^\d/.test(w)).map(w => w.replace(/(x|s)$/, ''));
  const colle = (art, ligne) => { const a = mots(art), b = mots(ligne); if (!a.length || !b.length || !(b.includes(a[0]) || a.includes(b[0]))) return 0; const k = a.filter(w => b.includes(w)).length; return k / Math.min(a.length, b.length); }; // « poulet fermier » = « poulet » (le mot principal en commun)

  let cache = null, cacheAt = 0;
  async function charge(force) { if (!force && cache && Date.now() - cacheAt < 60000) return cache; cache = (await appel()).prix || []; cacheAt = Date.now(); return cache; }
  // le dernier prix connu de cet article dans chaque magasin
  function prixDe(art, l) {
    const out = {};
    for (const x of l) { const c = colle(art, x.a); if (c < 0.6) continue; const k = x.m; if (!out[k] || x.at > out[k].at || (x.at === out[k].at && c > out[k].c)) out[k] = { p: x.p, at: x.at, c, l: x.l }; }
    return out;
  }

  /* ---------- le ticket de caisse ---------- */
  let ticketOffre = null;
  function ticket() {
    showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,460px)"><small style="letter-spacing:.3em;color:#86efac">TICKET DE CAISSE</small>
      <p style="font-size:16px;color:#e2e8f0">Pose le ticket à plat, bien éclairé, et prends-le en photo en entier.</p>
      <label style="display:inline-block;margin-top:6px;padding:16px 26px;border-radius:14px;background:#16a34a;color:#fff;font:700 20px system-ui;cursor:pointer">📷 Photographier le ticket<input id="px-tk" type="file" accept="image/*" capture="environment" style="display:none"></label>
      <p style="font-size:13px;color:#94a3b8;margin-top:12px">Un ticket long ? Prends-le en deux photos : refais « scanne mon ticket » pour la suite.</p></div>`);
    const inp = document.getElementById('px-tk');
    if (inp) inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) lisTicket(f).catch(() => say("Je n'ai pas réussi à lire le ticket.")); });
    return say("Prends ton ticket en photo avec le bouton vert. Je lis chaque ligne et je retiens les prix.");
  }
  const reduit = f => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1800 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = ko; im.src = URL.createObjectURL(f); });
  async function lisTicket(f) {
    const img = await reduit(f);
    showBoard('<div style="font-family:system-ui;text-align:center;color:#e2e8f0;font-size:18px">Je lis le ticket…</div>'); face.set('think');
    const q = 'Ceci est un ticket de caisse de supermarché français. Lis CHAQUE article acheté avec son prix payé (après remise si elle est sur la ligne suivante). Ignore les totaux, la TVA, les moyens de paiement, la fidélité. Réponds UNIQUEMENT en JSON : {"magasin": "aldi|leclerc|lidl|autre", "date": "AAAA-MM-JJ ou vide", "lignes": [{"libelle": "tel qu\'écrit", "article": "nom générique court en français, sans marque (ex. lait demi-écrémé, tomates, saumon, lentilles corail)", "prix": 1.23, "quantite": "1 kg, 2 x, 500 g ou vide"}], "total": 0}';
    let txt = '';
    try {
      if (S.settings.seeCloud && S.settings.key) txt = await AI.see(img, q); // la lecture d'un ticket demande une bonne vue
      if (!txt && typeof SECURITE !== 'undefined' && SECURITE.visionMaison()) { const j = await (await fetch(`${root()}/maison/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, question: q }) })).json(); txt = j && j.texte; }
    } catch (e) { txt = ''; }
    face.set('idle');
    let r = null; try { r = JSON.parse(String(txt).slice(String(txt).indexOf('{'), String(txt).lastIndexOf('}') + 1)); } catch (e) { r = null; }
    const lignes = ((r && r.lignes) || []).filter(x => x && (x.article || x.libelle) && +x.prix > 0).slice(0, 120);
    if (!txt) { hideBoard(); return say("Je n'ai pas de vision disponible pour lire le ticket. Active la vision détaillée dans mes réglages."); }
    if (!lignes.length) { hideBoard(); return say("Je n'arrive pas à lire ce ticket. Reprends la photo bien à plat, avec plus de lumière."); }
    const mg = MAGS.includes(String(r.magasin).toLowerCase()) ? String(r.magasin).toLowerCase() : 'autre';
    const at = /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? Math.round(new Date(`${r.date}T12:00:00`) / 1000) : Math.round(Date.now() / 1000);
    const total = lignes.reduce((s_, x) => s_ + +x.prix, 0);
    // ce qui était nettement moins cher ailleurs
    let l = []; try { l = await charge(true); } catch (e) { /* rien */ }
    const ailleurs = lignes.map(x => { const p = prixDe(x.article || x.libelle, l.filter(y => y.m !== mg)); const best = Object.entries(p).sort((a, b) => a[1].p - b[1].p)[0]; return best && best[1].p < +x.prix * 0.8 && +x.prix - best[1].p >= 0.5 ? `${x.article} : ${euros(+x.prix - best[1].p)} de moins chez ${MAG[best[0]]}` : null; }).filter(Boolean);
    ticketOffre = { at: Date.now(), mg, quand: at, lignes }; dlg.attendReponse = Date.now() + 150000;
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,560px)"><small style="letter-spacing:.3em;color:#86efac">TICKET ${MAG[mg].toUpperCase()} · ${lignes.length} ARTICLES · ${euros(total)}</small>${lignes.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:15px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span>${esc(x.article || x.libelle)}${x.quantite ? ` <span style="color:#94a3b8">${esc(x.quantite)}</span>` : ''}</span><b>${euros(+x.prix)}</b></div>`).join('')}${ailleurs.length ? `<p style="color:#fcd34d;font-size:14px;margin-top:8px">Moins cher ailleurs : ${esc(ailleurs.join(' · '))}</p>` : ''}</div>`);
    return say(`Ticket ${MAG[mg]}${mg === 'autre' ? '' : ''} : ${lignes.length} articles, ${euros(total)}.${ailleurs.length ? ` À noter : ${liste(ailleurs.slice(0, 2))}.` : ''} Je retiens les prix, et je range les produits au garde-manger ?`);
  }
  async function retiensTicket(garde) {
    const o = ticketOffre; ticketOffre = null; dlg.attendReponse = 0;
    try { await appel({ action: 'ajoute', magasin: o.mg, at: o.quand, lignes: o.lignes, source: 'ticket' }); } catch (e) { return injoignable(); }
    cacheAt = 0;
    if (garde && typeof CUISINE !== 'undefined' && CUISINE.ajouteStock) { try { await CUISINE.ajouteStock(o.lignes.map(x => x.article || x.libelle)); } catch (e) { /* tant pis */ } }
    fx.ok(); return say(`C'est retenu : ${o.lignes.length} prix chez ${MAG[o.mg]}${garde ? ', et les produits sont au garde-manger' : ''}. Plus tu me montres de tickets, plus je trouve les meilleurs prix.`);
  }
  // « le lait est à 0,95 € chez Lidl »
  async function prixDit(t, n) {
    const m = String(t).match(/^(?:le |la |les |l['’]|un |une |des )?(.+?)\s+(?:est|sont|coûte|coute|coûtent|coutent|vaut|valent|fait|font)\s+(?:à\s+)?(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)?(?:\s*(\d{1,2}))?/i);
    const mg = magDe(n);
    if (!m || !mg) return null;
    const pr = parseFloat(`${m[2].replace(',', '.')}${m[3] && !/[.,]/.test(m[2]) ? `.${m[3]}` : ''}`);
    try { await appel({ action: 'ajoute', magasin: mg, lignes: [{ article: m[1], libelle: m[1], prix: pr }], source: 'dit' }); } catch (e) { return injoignable(); }
    cacheAt = 0; fx.ok(); return say(`C'est noté : ${m[1]}, ${euros(pr)} chez ${MAG[mg]}.`);
  }

  /* ---------- « où faire mes courses ? » : la liste comparée ---------- */
  async function compare(n) {
    const items = (S.listes || []).filter(x => x.liste === 'courses');
    if (!items.length) return say('Ta liste de courses est vide. Dis « fais les menus de la semaine », ou ajoute ce qu\'il te faut.');
    let l; try { l = await charge(true); } catch (e) { return injoignable(); }
    if (!l.length) return say("Je ne connais encore aucun prix. Après tes prochaines courses, dis « scanne mon ticket » : je retiendrai les prix de chaque magasin.");
    const P = items.map(x => ({ x, p: prixDe(x.text, l) }));
    const connus = P.filter(o => Object.keys(o.p).some(k => MAGS.includes(k)));
    if (!connus.length) return say("Je n'ai pas encore de prix pour les articles de ta liste. Photographie tes prochains tickets, et je pourrai comparer.");
    // pour comparer à armes égales : un article sans prix dans un magasin y est compté au prix moyen des autres (estimé)
    const prixIci = (o, m) => o.p[m] ? o.p[m].p : (() => { const v = MAGS.map(k => o.p[k] && o.p[k].p).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })();
    const totalSeul = m => connus.reduce((s_, o) => s_ + prixIci(o, m), 0);
    const seuls = MAGS.map(m => ({ m, t: totalSeul(m), vrais: connus.filter(o => o.p[m]).length })).filter(x => x.vrais).sort((a, b) => a.t - b.t);
    if (!seuls.length) return say("Je n'ai pas encore assez de prix chez Aldi, Leclerc ou Lidl pour comparer.");
    const best = seuls[0];
    let duo = null;
    for (let i = 0; i < MAGS.length; i++) for (let j = i + 1; j < MAGS.length; j++) {
      const a = MAGS[i], b = MAGS[j]; let t = 0; const part = { [a]: [], [b]: [] };
      for (const o of connus) { const pa = o.p[a] ? o.p[a].p : null, pb = o.p[b] ? o.p[b].p : null; const k = pa != null && (pb == null || pa <= pb) ? a : pb != null ? b : (best.m === a ? a : b); t += k === a ? (pa != null ? pa : prixIci(o, a)) : (pb != null ? pb : prixIci(o, b)); part[k].push(o.x); }
      if (part[a].length && part[b].length && (!duo || t < duo.t)) duo = { a, b, t, part };
    }
    const eco = duo ? best.t - duo.t : 0, deux = duo && eco >= SEUIL();
    // le partage, gardé pour le mode magasin
    S.coursesPlan = {}; items.forEach(x => { S.coursesPlan[x.id] = best.m; });
    if (deux) Object.entries(duo.part).forEach(([m, l2]) => l2.forEach(x => { S.coursesPlan[x.id] = m; }));
    save();
    const inconnus = items.length - connus.length;
    const grp = m => items.filter(x => S.coursesPlan[x.id] === m).map(x => x.text);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,600px)"><small style="letter-spacing:.3em;color:#86efac">TES COURSES AU MEILLEUR PRIX · ${items.length} ARTICLES</small><p style="font-size:15px;color:#cbd5e1">${seuls.map(x => `${MAG[x.m]} : ${euros(x.t)}`).join(' · ')}${deux ? ` · <b style="color:#86efac">${MAG[duo.a]} + ${MAG[duo.b]} : ${euros(duo.t)}</b>` : ''}</p>${(deux ? [duo.a, duo.b] : [best.m]).map(m => `<div style="margin-top:8px"><b style="color:#fde68a">${MAG[m]}</b><div style="font-size:15px;color:#e2e8f0">${esc(grp(m).join(' · '))}</div></div>`).join('')}${inconnus ? `<p style="font-size:13px;color:#94a3b8;margin-top:8px">${inconnus} article${inconnus > 1 ? 's' : ''} sans prix connu : comptés nulle part.</p>` : ''}</div>`);
    const d = deux ? ` En passant aussi chez ${MAG[duo.a === best.m ? duo.b : duo.a]} pour ${liste(duo.part[duo.a === best.m ? duo.b : duo.a].slice(0, 3).map(x => x.text.replace(/\s*\(.*\)$/, '')))}${duo.part[duo.a === best.m ? duo.b : duo.a].length > 3 ? '…' : ''}, tu économises ${euros(eco)} : ${euros(duo.t)}.` : duo && eco > 0.5 ? ` Un deuxième magasin ne ferait gagner que ${euros(eco)} : ça ne vaut pas le détour.` : '';
    return say(`Pour les ${connus.length} articles dont je connais le prix, le moins cher en un seul magasin, c'est ${MAG[best.m]} : environ ${euros(best.t)}${seuls[1] ? `, contre ${euros(seuls[1].t)} chez ${MAG[seuls[1].m]}` : ''}.${d}${inconnus ? ` Pour ${inconnus} article${inconnus > 1 ? 's' : ''}, je n'ai pas encore de prix.` : ''} Au magasin, dis « mode magasin ${MAG[best.m]} »${deux ? `, puis « mode magasin ${MAG[duo.a === best.m ? duo.b : duo.a]} »` : ''}.`);
  }

  /* ---------- le plan « drive d'abord » : tout au drive Leclerc, sauf si un autre magasin fait économiser au moins le seuil ---------- */
  async function planDrive() {
    const items = (S.listes || []).filter(x => x.liste === 'courses');
    let l = []; try { l = await charge(true); } catch (e) { l = []; }
    const P = items.map(x => ({ x, p: prixDe(x.text, l) }));
    let autre = null;
    for (const m of ['aldi', 'lidl']) {
      const moins = P.filter(o => o.p[m] && o.p.leclerc && o.p[m].p < o.p.leclerc.p);
      const eco = moins.reduce((s_, o) => s_ + o.p.leclerc.p - o.p[m].p, 0);
      if (!autre || eco > autre.eco) autre = { m, items: moins.map(o => o.x), eco };
    }
    S.coursesPlan = {}; items.forEach(x => { S.coursesPlan[x.id] = 'leclerc'; });
    const garde = autre && autre.eco >= SEUIL() ? autre : null;
    if (garde) garde.items.forEach(x => { S.coursesPlan[x.id] = garde.m; });
    save();
    const auDrive = P.filter(o => S.coursesPlan[o.x.id] === 'leclerc'), connus = auDrive.filter(o => o.p.leclerc);
    return { n: items.length, drive: auDrive.length, totalDrive: connus.reduce((s_, o) => s_ + o.p.leclerc.p, 0), connus: connus.length, autre: garde, eco: autre ? autre.eco : 0, MAG };
  }

  /* ---------- le drive Leclerc : un lien de recherche par article (le panier, c'est toi qui le valides) ---------- */
  function drive(silencieux) {
    const tout = (S.listes || []).filter(x => x.liste === 'courses');
    if (!tout.length) return say('Ta liste de courses est vide.');
    const plan = S.coursesPlan || {}, partage = tout.some(x => plan[x.id] === 'leclerc') && tout.some(x => plan[x.id] && plan[x.id] !== 'leclerc');
    const items = partage ? tout.filter(x => !plan[x.id] || plan[x.id] === 'leclerc') : tout; // le partage entre deux magasins : seulement la part de Leclerc ; sinon toute la liste
    const autre = !partage && tout.some(x => plan[x.id] && plan[x.id] !== 'leclerc') ? plan[tout.find(x => plan[x.id] && plan[x.id] !== 'leclerc').id] : '';
    const base = S.settings.driveLeclerc || 'https://www.e.leclerc/recherche?q=';
    const lien = t => (base.includes('{q}') ? base.replace('{q}', encodeURIComponent(t)) : `${base}${encodeURIComponent(t)}`);
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,520px)"><small style="letter-spacing:.3em;color:#7dd3fc">DRIVE LECLERC · ${items.length} ARTICLES · TOUCHE POUR CHERCHER</small>${items.map(x => { const q = x.text.replace(/\s*\(.*\)$/, ''); return `<a href="${esc(lien(q))}" target="_blank" rel="noopener" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);color:#e0f2fe;text-decoration:none;font-size:17px"><span>${esc(x.text)}</span><span style="color:#7dd3fc">chercher ›</span></a>`; }).join('')}<p style="font-size:13px;color:#94a3b8;margin-top:8px">Choisis ton magasin drive sur le site la première fois. Je n'ajoute rien au panier et je ne paie rien : c'est toi qui valides.</p></div>`);
    if (silencieux) return items.length;
    return say(`Voici les ${items.length} articles${partage ? ' à prendre chez Leclerc' : ''} pour le drive : touche chacun pour le chercher sur le site, ajoute-le au panier, et valide quand c'est bon.${autre ? ` D'après tes prix, ${MAG[autre]} reviendrait un peu moins cher ; le drive te fait gagner du temps.` : ''}`);
  }

  /* ---------- ce qu'on lui dit ---------- */
  function route(t, n) {
    if (ticketOffre && Date.now() - ticketOffre.at < 180000) {
      if (/^(oui|ouais|ok|d accord|vas y|les deux|retiens|bien sur)\b/.test(n)) return () => retiensTicket(!/\bseulement les prix|juste les prix|pas le garde manger\b/.test(n));
      if (/\b(seulement|juste) les prix\b/.test(n)) return () => retiensTicket(false);
      if (/^(non|pas la peine|laisse|annule)\b/.test(n)) return () => { ticketOffre = null; dlg.attendReponse = 0; hideBoard(); return say("D'accord, je ne garde rien de ce ticket."); };
    }
    if (/\b(scanne|scan|photographie|lis|prends en photo|enregistre)\b.*\b(ticket|tickets|ticket de caisse|facture des courses)\b|\bmon ticket de caisse\b/.test(n)) return ticket;
    if (/\b(est|sont|coute|coutent|vaut|valent|fait|font)\b.*\d.*\bchez (aldi|leclerc|lidl)\b/.test(n)) return () => prixDit(t, n);
    if (/\b(ou (faire|acheter)|quel magasin|le moins cher|moins cher|compare (les )?prix|comparer|meilleur prix|economiser)\b/.test(n) && /\b(courses|liste|magasin|acheter|prix)\b/.test(n)) return () => compare(n);
    if (/\b(prepare|fais|lance)\b.*\bdrive\b|\b(mon|le) drive\b.*\b(leclerc|courses|liste)\b|\bcourses au drive\b/.test(n)) return drive;
    if (/\b(mon drive leclerc|le drive leclerc) (c est|est)\b/.test(n)) { const u = (String(t).match(/https?:\/\/\S+/) || [])[0]; if (u) return () => { S.settings.driveLeclerc = u; save(); return say("C'est noté : j'utiliserai ce drive pour tes liens."); }; }
    if (/\b(deuxieme magasin|second magasin)\b.*\b(si|a partir de|au dessus de)\b.*\d/.test(n)) { const v = +((n.match(/(\d+)/) || [])[1] || 5); return () => { S.settings.seuilDeuxMagasins = v; save(); return say(`D'accord : je te proposerai un deuxième magasin seulement si tu économises au moins ${v} euros.`); }; }
    return null;
  }
  return { route, planDrive, drive, euros, magasinDe: id => (S.coursesPlan || {})[id] || '' };
})();

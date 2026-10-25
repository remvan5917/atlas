/* =========================================================
   ATLAS — un membre de la maison
   - Ses proches : « Marie est ma sœur », « ma mère s'appelle Christine », « l'anniversaire de Marie, c'est le 12 mars »,
     « qui est Marie ? », « ma famille », « retire Marie de mes proches ». Atlas s'en sert dans ses réponses, et rappelle
     les anniversaires (une semaine avant, la veille, le jour même).
   - Les objets : « j'ai rangé le passeport dans le tiroir du bureau » → « où est le passeport ? » ;
     « j'ai prêté la perceuse à Paul » → « à qui j'ai prêté la perceuse ? », « qu'est-ce que j'ai prêté ? »,
     « Paul m'a rendu la perceuse ».
   - Le suivi : ce qu'il lui a raconté pour hier (« jeudi, entretien d'embauche »), Atlas lui demande comment ça s'est passé,
     une fois, le lendemain.
   Tout reste sur ses appareils et l'ordinateur de la maison (comme ses notes).
   ========================================================= */
'use strict';

const FOYER = (() => {
  const P = () => (S.proches = S.proches || []);
  const RG = () => (S.rangements = S.rangements || []);
  const PR = () => (S.prets = S.prets || []);
  const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const LIENS = "frere|soeur|sœur|mere|mère|maman|pere|père|papa|fils|fille|femme|compagne|copine|copain|compagnon|mari|ex|cousin|cousine|oncle|tante|neveu|niece|nièce|grand mere|grand-mère|grand-mere|mamie|grand pere|grand-père|grand-pere|papi|papy|ami|amie|meilleur ami|meilleure amie|pote|voisin|voisine|collegue|collègue|associe|associé|associee|associée|patron|patronne|chef|beau frere|beau-frère|belle soeur|belle-sœur|belle-soeur|belle mere|belle-mère|beau pere|beau-père|parrain|marraine|filleul|filleule|nounou|coach|medecin|médecin|dentiste|kine|kiné";
  const NOM = "[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:[ -][A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)?";
  const propre = t => String(t || '').replace(/^\s*(?:atlas|hey atlas|dis atlas)[\s,.:!]*/i, '').replace(/[.!?]+\s*$/, '').trim();
  const art = l => (/^(mere|mère|maman|soeur|sœur|fille|femme|compagne|copine|cousine|tante|niece|nièce|grand|mamie|amie|meilleure|voisine|collegue|collègue|associee|associée|patronne|belle|marraine|filleule|nounou)/i.test(l) ? 'sa' : 'son');
  const tonTa = l => (art(l) === 'sa' ? 'ta' : 'ton'); // à l'oral, il lui parle : « ta sœur »
  const Maj = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const dit = x => x.dit || x.objet; // avec son article : « le passeport », « mes lunettes »
  const trouve = nom => P().find(p => N(p.nom) === N(nom)) || P().find(p => N(p.nom).split(' ')[0] === N(nom).split(' ')[0]);
  const dateDit = a => { if (!a) return ''; const [m, j] = a.split('-').map(Number); return `${j === 1 ? '1er' : j} ${MOIS_FR[m - 1]}`; };
  function jourDe(n) { // « le 12 mars », « le premier mai » → « 03-12 »
    const m = n.match(/\b(premier|1er|\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
    if (!m) return '';
    const j = /^(premier|1er)$/.test(m[1]) ? 1 : +m[1]; if (j < 1 || j > 31) return '';
    return `${String(MOIS.indexOf(m[2]) + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
  }
  function retiensProche(nom, lien, anniv) {
    let p = trouve(nom);
    if (!p) { p = { id: Date.now(), nom: nom.trim(), lien: '', anniv: '', at: Date.now() }; P().push(p); }
    if (lien) p.lien = lien.toLowerCase().replace(/\s+/g, ' ').trim();
    if (anniv) p.anniv = anniv;
    p.at = Date.now(); save();
    return p;
  }

  /* ---------- ce qu'Atlas sait, pour ses réponses ---------- */
  function contexte() {
    const l = P().map(p => `${p.nom}${p.lien ? ` (${art(p.lien)} ${p.lien})` : ''}${p.anniv ? `, anniversaire le ${dateDit(p.anniv)}` : ''}`);
    const r = RG().slice(-12).map(x => `${x.objet} : ${x.ou}`);
    const pr = PR().filter(x => !x.rendu).map(x => `${x.objet} prêté à ${x.qui}`);
    return [l.length ? `Ses proches : ${l.join(' ; ')}.` : '', r.length ? `Où il a rangé ses affaires : ${r.join(' ; ')}.` : '', pr.length ? `Ce qu'il a prêté : ${pr.join(' ; ')}.` : ''].filter(Boolean).join('\n');
  }

  /* ---------- les anniversaires et le suivi (une fois par jour, quand il est là) ---------- */
  const jour = () => new Date().toDateString();
  function annivs() {
    const auj = new Date(); auj.setHours(12, 0, 0, 0);
    for (const p of P()) {
      if (!p.anniv) continue;
      const [m, j] = p.anniv.split('-').map(Number);
      let d = new Date(auj.getFullYear(), m - 1, j, 12); if (d < auj) d = new Date(auj.getFullYear() + 1, m - 1, j, 12);
      const k = Math.round((d - auj) / 86400000);
      if (![0, 1, 10].includes(k)) continue;
      const qui = `${p.nom}${p.lien ? `, ${tonTa(p.lien)} ${p.lien}` : ''}`;
      const t = k === 0 ? () => messageAnniv(p, qui) : k === 1 ? `Demain, c'est l'anniversaire de ${qui}.${(p.idees || []).length ? ` Tes idées de cadeau : ${p.idees.slice(-3).join(', ')}.` : ''}` : () => cadeaux(p, qui, true);
      PROACTIF.annonce(`anniv-${p.id}-${auj.getFullYear()}-${k}`, t, { expire: Date.now() + 14 * 3600000 });
    }
  }
  // dix jours avant : ses idées notées au fil de l'année, et trois suggestions (le cerveau), à l'écran
  async function cadeaux(p, qui, annonce) {
    const idees = (p.idees || []).slice(-6);
    let sug = [];
    if (AI.ready()) { try { const raw = String(await AI.chat([{ role: 'system', content: "Propose 3 idées de cadeau précises et réalistes (de 15 à 60 €), d'après ce qu'on sait de la personne. Pas de banalités. JSON UNIQUEMENT : {\"idees\": [\"…\", \"…\", \"…\"]}" }, { role: 'user', content: `${p.nom}${p.lien ? `, ${art(p.lien)} ${p.lien}` : ''}. Ce qu'il a noté : ${idees.join(' ; ') || 'rien'}.` }], { maxTokens: 200, temperature: 0.7, json: true })); sug = (JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).idees || []).slice(0, 3); } catch (e) { sug = []; } }
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,520px)"><small style="letter-spacing:.3em;color:#f9a8d4">L'ANNIVERSAIRE DE ${esc(p.nom.toUpperCase())} · LE ${esc(dateDit(p.anniv).toUpperCase())}</small>${idees.length ? `<div style="margin-top:10px;color:#fbcfe8;font-size:13px;letter-spacing:.2em">TES IDÉES</div>${idees.map(x => `<div style="font-size:17px;padding:3px 0">• ${esc(x)}</div>`).join('')}` : ''}${sug.length ? `<div style="margin-top:10px;color:#fbcfe8;font-size:13px;letter-spacing:.2em">MES SUGGESTIONS</div>${sug.map(x => `<div style="font-size:17px;padding:3px 0">• ${esc(x)}</div>`).join('')}` : ''}</div>`);
    const debut = annonce ? `Dans dix jours, c'est l'anniversaire de ${qui}. ` : '';
    return `${debut}${idees.length ? `Tu m'avais dit : ${idees.slice(-3).join(', ')}. ` : ''}${sug.length ? `Mes idées : ${sug.join(' ; ')}.` : "Je n'ai pas encore d'idée : dis-moi ce qu'il ou elle aime."}`;
  }
  // le jour J : un message proposé, à l'écran (à copier pour l'envoyer)
  async function messageAnniv(p, qui) {
    let msg = `Joyeux anniversaire ${p.nom} ! Plein de bonnes choses pour cette nouvelle année.`;
    if (AI.ready()) { try { msg = String(await AI.chat([{ role: 'system', content: "Écris un message d'anniversaire court (2 phrases), chaleureux et naturel, en français, en tutoyant, de la part d'un père de famille. Sans émoji. Rien d'autre que le message." }, { role: 'user', content: `Pour ${p.nom}${p.lien ? `, ${art(p.lien)} ${p.lien}` : ''}. Ce qu'il sait : ${(p.idees || []).slice(-3).join(' ; ') || 'rien de particulier'}.` }], { maxTokens: 120, temperature: 0.8 })).replace(/^["«\s]+|["»\s]+$/g, '').trim() || msg; } catch (e) { /* le message simple */ } }
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(90vw,520px)"><small style="letter-spacing:.3em;color:#f9a8d4">AUJOURD'HUI · L'ANNIVERSAIRE DE ${esc(p.nom.toUpperCase())}</small><p id="fy-msg" style="font-size:20px;line-height:1.45;margin-top:10px">${esc(msg)}</p><button id="fy-copie" style="padding:12px 18px;border-radius:12px;border:0;background:#db2777;color:#fff;font:700 16px system-ui;cursor:pointer">Copier le message</button></div>`);
    setTimeout(() => { const b = document.getElementById('fy-copie'); if (b) b.addEventListener('click', () => { try { navigator.clipboard.writeText(msg); b.textContent = 'Copié ✓'; } catch (e) { /* rien */ } }); }, 50);
    return `Aujourd'hui, c'est l'anniversaire de ${qui}. Je te propose un message : ${msg} Il est à l'écran, tu peux le copier pour l'envoyer.`;
  }
  function retiensIdee(p, idee) {
    p.idees = (p.idees || []).filter(x => N(x) !== N(idee)).concat([idee]).slice(-12); p.at = Date.now(); save();
  }
  let suiviFait = '';
  async function suivi() {
    if (suiviFait === jour() || !AI.ready()) return;
    const hier = new Date(Date.now() - 86400000), k = `${hier.getFullYear()}-${String(hier.getMonth() + 1).padStart(2, '0')}-${String(hier.getDate()).padStart(2, '0')}`;
    const it = (S.memoire || []).find(x => x.date === k && !x.suivi);
    suiviFait = jour();
    if (!it) return;
    it.suivi = true; save();
    PROACTIF.annonce(`suivi-${it.id}`, async () => {
      try {
        const q = String(await AI.chat([{ role: 'system', content: "Tu es Atlas, l'assistant de la maison (calme, chaleureux, une IA de film). Transforme ce souvenir d'hier en UNE question de suivi courte et naturelle, à dire à voix haute, en tutoyant (exemple : « Au fait, ton entretien d'hier, ça s'est bien passé ? »). Rien d'autre." }, { role: 'user', content: it.texte }], { maxTokens: 60, temperature: 0.3 }) || '').replace(/\[\[[^\]]*\]\]/g, '').trim();
        return q || `Au fait, hier : ${it.texte} Comment ça s'est passé ?`;
      } catch (e) { return `Au fait, hier : ${it.texte} Comment ça s'est passé ?`; }
    }, { expire: Date.now() + 12 * 3600000 });
  }
  // le matin, quand il commence à parler (ou dès qu'on le voit) : une fois par jour
  setInterval(() => {
    const h = new Date().getHours();
    if (h < 8 || h >= 22 || !dlg.started || Date.now() - (dlg.lastActive || 0) > 10 * 60000) return;
    if (annivs.fait !== jour()) { annivs.fait = jour(); annivs(); }
    suivi();
  }, 60000);

  /* ---------- les objets : rangés, prêtés ---------- */
  const objetDe = s => String(s || '').replace(/^(mon|ma|mes|le|la|les|l['’]|un|une|des|du|de la|ton|ta|tes)\s*/i, '').trim();
  function range(objet, ou) {
    const o = objetDe(objet), d = String(objet).trim().replace(/^(mes|mon|ma|tes|ton|ta)\s/i, (w, x) => ({ mes: 'tes', mon: 'ton', ma: 'ta', tes: 'tes', ton: 'ton', ta: 'ta' }[x.toLowerCase()] + ' ')); if (!o || !ou) return null;
    RG().filter(x => N(x.objet) === N(o)).forEach(x => tomb('rangements', x)); // l'ancienne place s'oublie (sur tous les appareils)
    S.rangements = RG().filter(x => N(x.objet) !== N(o)).concat([{ id: Date.now(), objet: o, dit: d, ou: ou.trim(), at: Date.now() }]).slice(-80); save();
    fx.ok(); return say(pick([`Noté : ${d}, ${ou}.`, `C'est retenu : ${d}, ${ou}.`]));
  }
  function ouEst(objet) {
    const o = N(objetDe(objet)); if (!o) return null;
    const x = RG().slice().reverse().find(r => N(r.objet) === o) || RG().slice().reverse().find(r => N(r.objet).includes(o) || o.includes(N(r.objet)));
    if (!x) { const p = PR().slice().reverse().find(r => !r.rendu && (N(r.objet).includes(o) || o.includes(N(r.objet)))); return p ? () => say(`Tu as prêté ${dit(p)} à ${p.qui}, ${quand(p.at)}.`) : null; }
    return () => say(`${Maj(dit(x))} : ${x.ou}. Tu me l'as dit ${quand(x.at)}.`);
  }
  const quand = t => { const j = Math.round((Date.now() - t) / 86400000); return j === 0 ? "aujourd'hui" : j === 1 ? 'hier' : j < 30 ? `il y a ${j} jours` : `le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`; };

  /* ---------- les phrases ---------- */
  function route(t, n) {
    const raw = propre(t);
    let m;
    // « idée cadeau pour Léa : un livre de cuisine », « pour l'anniversaire de Léa, offrir un livre »
    if ((m = raw.match(new RegExp(`^(?:une )?id[ée]e (?:de )?cadeau (?:pour|à)\\s+(${NOM})\\s*[:,]?\\s+(.{3,80})$`, 'i')) || raw.match(new RegExp(`^pour l['’]anniversaire (?:de|d['’])\\s*(${NOM})\\s*,?\\s*(?:lui )?(?:offrir|offre|acheter)\\s+(.{3,80})$`, 'i')))) {
      const p = trouve(m[1]); if (p) { const idee = m[2].trim(); return () => { retiensIdee(p, idee); fx.ok(); return say(`Noté pour ${p.nom} : ${idee}.${p.anniv ? ' Je te le rappellerai dix jours avant son anniversaire.' : ' Dis-moi la date de son anniversaire, je te le rappellerai.'}`); }; }
    }
    // « Léa adore la poterie », « Paul aime le jazz », « Marie rêve d'aller au Japon » (pour quelqu'un de ses proches)
    if ((m = raw.match(new RegExp(`^(${NOM})\\s+(adore|aime|kiffe|r[êe]ve d['’e]|voudrait|a envie d['’e]|collectionne|est fan d['’e]|joue)\\s+(.{3,70})$`)))) {
      const p = trouve(m[1]); if (p && !/^(Il|Elle|Ce|Atlas|Shadow)$/.test(m[1])) { const idee = `${p.nom} ${m[2]} ${m[3]}`.replace(/\s+/g, ' ').trim(); return () => { retiensIdee(p, idee); fx.ok(); return say(`C'est retenu : ${idee}. Ça m'aidera pour ses cadeaux.`); }; }
    }
    // « des idées de cadeau pour Léa ? »
    if ((m = raw.match(new RegExp(`id[ée]es? (?:de )?cadeaux? (?:pour|à)\\s+(${NOM})`, 'i')))) {
      const p = trouve(m[1]); if (p) return async () => say(await cadeaux(p, p.nom, false));
    }
    // « Marie est ma sœur », « Paul, c'est mon meilleur ami »
    if ((m = raw.match(new RegExp(`^(${NOM})\\s*,?\\s*(?:est|c['’]est)\\s+(?:mon|ma|notre)\\s+(${LIENS})\\b`))) && !/^(Il|Elle|Ce|Ça|Ca|On|Tout|Rien|Lui|Atlas|Shadow)\b/.test(m[1])) {
      const [, nom, lien] = m; return () => { const p = retiensProche(nom, lien); fx.ok(); return say(`C'est noté : ${p.nom}, ${tonTa(p.lien)} ${p.lien}.${p.anniv ? '' : ' Tu peux me dire la date de son anniversaire, je te la rappellerai.'}`); };
    }
    // « ma sœur s'appelle Marie », « ma sœur, c'est Marie »
    if ((m = raw.match(new RegExp(`^(?:[Mm]on|[Mm]a)\\s+(${LIENS})\\s*,?\\s*(?:s['’]appelle|c['’]est|se nomme)\\s+(${NOM})\\b`)))) {
      const [, lien, nom] = m; return () => { const p = retiensProche(nom, lien); fx.ok(); return say(`C'est noté : ${p.nom}, ${tonTa(p.lien)} ${p.lien}.`); };
    }
    // « l'anniversaire de Marie, c'est le 12 mars », « Marie est née le 12 mars »
    if ((m = raw.match(new RegExp(`anniversaire (?:de|d['’])\\s*(${NOM})`)) || raw.match(new RegExp(`^(${NOM})\\s+(?:est|a)\\s+n[ée]e?s?\\s+le`))) && jourDe(n) && !/\b(quand|c est quand|quel jour)\b/.test(n)) {
      const nom = m[1], a = jourDe(n); return () => { const p = retiensProche(nom, '', a); fx.ok(); return say(`Retenu : l'anniversaire de ${p.nom}, le ${dateDit(a)}. Je te préviendrai une semaine avant, puis la veille.`); };
    }
    // « c'est quand l'anniversaire de Marie ? »
    if ((m = raw.match(new RegExp(`(?:[Qq]uand|[Qq]uel jour).*anniversaire (?:de|d['’])\\s*(${NOM})`)))) {
      const p = trouve(m[1]); if (p) return () => say(p.anniv ? `L'anniversaire de ${p.nom}, c'est le ${dateDit(p.anniv)}.` : `Je ne connais pas encore la date de l'anniversaire de ${p.nom}.`);
    }
    // « qui est Marie ? »
    if ((m = raw.match(new RegExp(`^(?:[Qq]ui est|[Cc]['’]est qui)\\s+(${NOM})\\s*\\??$`)))) {
      const p = trouve(m[1]); if (p) return () => say(`${p.nom}, c'est ${tonTa(p.lien || 'ami')} ${p.lien || 'proche'}${p.anniv ? `, son anniversaire est le ${dateDit(p.anniv)}` : ''}.`);
    }
    if (/^(ma famille|mes proches|qui sont mes proches|tu connais ma famille|qui tu connais dans ma (vie|famille))$/.test(n)) {
      return () => say(P().length ? `Je connais ${P().map(p => `${p.nom}${p.lien ? `, ${tonTa(p.lien)} ${p.lien}` : ''}`).join(' ; ')}.` : "Tu ne m'as encore présenté personne. Dis par exemple : « Marie est ma sœur ».");
    }
    if ((m = raw.match(new RegExp(`^(?:[Rr]etire|[Ee]nl[eè]ve|[Ss]upprime|[Oo]ublie)\\s+(${NOM})\\s+(?:de|des)\\s+(?:mes proches|ma famille|la liste)`)))) {
      const p = trouve(m[1]); if (p) return () => { S.proches = P().filter(x => x !== p); tomb('proches', p); save(); return say(`J'ai retiré ${p.nom} de tes proches.`); };
    }
    // les objets rangés : « j'ai rangé le passeport dans le tiroir du bureau », « j'ai mis mes lunettes sur la table »
    if ((m = raw.match(/^j['’]ai\s+(?:rang[ée]|mis|pos[ée]|laiss[ée]|cach[ée]|plac[ée])s?\s+(.+?)\s+((?:dans|sur|sous|derri[eè]re|devant|à c[oô]t[ée] d[eu]|a cote d[eu]|au fond d[eu]|en haut d[eu]|en bas d[eu]|chez|au|à la|a la|à l['’]|a l['’])\s+.+)$/i)) && !/\b(lumiere|lampe|radio|musique|minuteur|reveil|alarme)\b/.test(n)) {
      const [, objet, ou] = m; return () => range(objet, ou);
    }
    // « où est le passeport ? », « où sont mes lunettes ? », « où j'ai mis la perceuse ? »
    if ((m = n.match(/^(?:ou (?:est|sont)|ou j ai (?:mis|range|pose|laisse))\s+(.+?)(?:\s+deja)?$/)) && !/\b(cles|clefs|cle|clef)\b/.test(n)) {
      const f = ouEst(m[1]); if (f) return f;
    }
    // les prêts
    if ((m = raw.match(/^j['’]ai\s+pr[eê]t[ée]\s+(.+?)\s+(?:à|a)\s+(.+)$/i))) {
      const objet = objetDe(m[1]), d = m[1].trim(), qui = m[2].trim();
      return () => { S.prets = PR().concat([{ id: Date.now(), objet, dit: d, qui, at: Date.now(), rendu: 0 }]).slice(-60); save(); fx.ok(); return say(`Noté : ${d}, chez ${qui}. Je m'en souviendrai.`); };
    }
    if ((m = raw.match(/^(.+?)\s+m['’]a\s+rendu\s+(.+)$/i))) {
      const qui = N(m[1]), o = N(objetDe(m[2]));
      const p = PR().find(x => !x.rendu && (N(x.objet).includes(o) || o.includes(N(x.objet))) && (N(x.qui).includes(qui) || qui.includes(N(x.qui))));
      if (p) return () => { p.rendu = Date.now(); p.at = Date.now(); save(); fx.ok(); return say(`Parfait : ${dit(p)}, c'est rendu.`); };
    }
    if ((m = n.match(/^a qui j ai prete\s+(.+)$/))) {
      const o = m[1]; const p = PR().slice().reverse().find(x => !x.rendu && (N(x.objet).includes(N(objetDe(o))) || N(objetDe(o)).includes(N(x.objet))));
      return () => say(p ? `${Maj(dit(p))} : chez ${p.qui}, depuis ${quand(p.at).replace(/^il y a /, '')}.` : "Je n'ai pas noté de prêt pour ça.");
    }
    if (/^(qu est ce que j ai prete|qu est ce que j ai prete a qui|mes prets|ce que j ai prete|on me doit quoi|qui me doit quelque chose)$/.test(n)) {
      const l = PR().filter(x => !x.rendu);
      return () => say(l.length ? `En ce moment : ${l.map(x => `${dit(x)} chez ${x.qui}, depuis ${quand(x.at).replace(/^il y a /, '')}`).join(' ; ')}.` : "Rien de prêté en ce moment, d'après moi.");
    }
    return null;
  }
  return { route, contexte, _annivs: annivs, _suivi: suivi, _cadeaux: cadeaux };
})();

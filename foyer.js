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
      if (![0, 1, 7].includes(k)) continue;
      const qui = `${p.nom}${p.lien ? `, ${tonTa(p.lien)} ${p.lien}` : ''}`;
      const t = k === 0 ? `Aujourd'hui, c'est l'anniversaire de ${qui}. Pense à lui souhaiter.` : k === 1 ? `Demain, c'est l'anniversaire de ${qui}.` : `Dans une semaine, c'est l'anniversaire de ${qui}. Il est encore temps de trouver un cadeau.`;
      PROACTIF.annonce(`anniv-${p.id}-${auj.getFullYear()}-${k}`, t, { expire: Date.now() + 14 * 3600000 });
    }
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
  return { route, contexte, _annivs: annivs, _suivi: suivi };
})();

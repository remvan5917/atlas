/* ---------- le coéquipier : Atlas sait ce que tu fais sur l'ordinateur ----------
   L'ordinateur de la maison note l'appli au premier plan (et depuis quand), et jette un coup d'œil à l'écran qui a changé,
   toutes les 4 minutes au plus, avec la vision de la maison : l'image ne sort jamais d'ici et elle est effacée aussitôt.
   Jamais les fenêtres privées (banque, mots de passe, santé, navigation privée).
   - « regarde mon écran », « aide-moi avec ça », « t'en penses quoi ? » : il regarde tout de suite, et répond en coéquipier ;
   - « qu'est-ce que j'ai fait aujourd'hui sur l'ordi ? », « on en était où ? » ;
   - il parle peu, de lui-même : une pause après 1 h 45 sans lever les yeux, « tu étais sur… » au retour d'une longue pause ;
     jamais en séance de trading, ni en mode concentration ; au plus une fois toutes les 45 minutes ;
   - « arrête de regarder mon écran » / « regarde mon écran en permanence ». */
const COEQ = (() => {
  let cache = null, cacheAt = 0, ditAt = 0, pauseDite = 0, retourDit = 0;
  const root = () => VOIXMAISON.root();
  const surPC = () => typeof CONSTELLATION === 'undefined' || !CONSTELLATION.role || CONSTELLATION.role === 'ordinateur';
  async function lit(force) {
    if (!root()) return null;
    if (!force && cache && Date.now() - cacheAt < 30000) return cache;
    try { cache = await (await fetch(`${root()}/maison/pc/activite`, { cache: 'no-store' })).json(); cacheAt = Date.now(); } catch (e) { /* on garde l'ancien */ }
    return cache;
  }
  const duree = s => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} heure${m >= 120 ? 's' : ''}${m % 60 ? ` ${m % 60}` : ''}` : `${Math.max(1, m)} minute${m > 1 ? 's' : ''}`; };
  const nomAppli = a => String(a || '').replace(/^Google /, '').replace(/^com\.\w+\./, '') || 'une appli';
  const titreDit = t => String(t || '').replace(/[▲▼−+]?\s*-?\d[\d.,\s]*%?/g, ' ').replace(/[▲▼−|/·•]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70); // « SILZ2026 ▼ 53,950 −1.92% / Topstep » → « SILZ Topstep »
  const trading = c => /tradingview|topstep|tradovate|ninjatrader|rithmic/i.test(`${c && c.maintenant ? `${c.maintenant.appli} ${c.maintenant.titre}` : ''}`) || (typeof TRADING !== 'undefined' && TRADING.actif && TRADING.actif());
  async function frais() { await lit(); }
  const texte = () => (cache && cache.on && cache.texte) || '';

  // il regarde tout de suite ; avec une demande d'aide ou d'avis, le cerveau répond en coéquipier à partir de ce qu'il voit
  async function regarde(t, aide) {
    patiente('Je regarde ton écran…', "la vision de la maison : l'image ne sort pas d'ici");
    let r = null;
    try {
      const ctl = window.AbortController ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), 170000);
      const q = aide ? "Décris précisément ce qu'il y a à l'écran (l'appli, le document, le code, le graphique, les messages d'erreur), et lis le texte important." : t;
      r = await (await fetch(`${root()}/maison/pc/regarde?question=${encodeURIComponent(q)}`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })).json();
      clearTimeout(tm);
    } catch (e) { r = null; }
    if (!r || !r.ok) { hideBoard(); return say(r && r.prive ? "C'est une fenêtre privée : je ne regarde pas." : r && r.raison === 'pas de vision' ? "La vision de la maison n'est pas prête pour le moment." : "Je n'arrive pas à voir ton écran pour le moment."); }
    if (r.image) {
      showBoard(`<div class="graphe"><small>TON ÉCRAN · ${esc(nomAppli(r.appli).toUpperCase())} · ${hhmm().replace(' h ', ':')}</small><img src="${r.image}" alt="" style="width:100%;border-radius:12px;display:block"></div>`, 'graphe-board');
      setTimeout(() => { const b = document.getElementById('board'); if (b && /TON ÉCRAN/.test(b.textContent)) hideBoard(); }, 60000);
    } else hideBoard();
    const vu = nettoie(r.texte || '');
    if (!aide || !AI.ready()) return say(vu || 'Je ne vois rien de clair.');
    face.set('think');
    try {
      const rep = String(await AI.chat([{ role: 'system', content: `Tu es Atlas, le coéquipier d'un père micro-entrepreneur et day trader, assis à côté de lui devant son ordinateur. Voici ce que la vision vient de voir sur son écran (elle peut se tromper sur les détails) : « ${vu} ». Appli au premier plan : ${nomAppli(r.appli)}${r.titre ? `, « ${r.titre} »` : ''}. ${texte()}
Réponds à voix haute, en français, en deux à quatre phrases concrètes et utiles, comme un coéquipier : ce que tu remarques, et la prochaine étape. Si tu ne vois pas assez bien, dis-le et demande ce qu'il veut. En trading : jamais de conseil d'achat ou de vente ; tu peux décrire, rappeler son plan, ses règles et la gestion du risque. Pas de liste, pas d'émoji.` }, { role: 'user', content: t }], { maxTokens: 400, temperature: 0.4 }));
      return say(nettoie(rep) || vu);
    } catch (e) { return say(vu || 'Je ne vois rien de clair.'); } finally { face.set('idle'); }
  }
  async function journee() {
    const c = await lit(true);
    if (!c) return say("L'ordinateur de la maison ne répond pas.");
    if (!c.on) return say("Je ne regarde pas ton écran en ce moment. Dis « regarde mon écran en permanence » pour que je m'y remette.");
    if (!(c.jour || []).length) return say("Je n'ai encore rien noté aujourd'hui sur l'ordinateur.");
    const tot = c.jour.reduce((s, x) => s + x[1], 0);
    return say(`Aujourd'hui, ${duree(tot)} sur l'ordi : ${c.jour.slice(0, 5).map(([a, s]) => `${nomAppli(a)}, ${duree(s)}`).join(' ; ')}.`);
  }
  async function ouOnEnEtait() {
    const c = await lit(true);
    if (!c || !c.on) return say("Je ne regarde pas ton écran en ce moment.");
    const m = c.maintenant, a = c.avant;
    const p = [];
    if (m && m.appli !== 'pause') p.push(`Tu es sur ${nomAppli(m.appli)}${m.titre ? `, ${titreDit(m.titre)}` : ''}, depuis ${duree(m.depuis)}.`);
    if (a) p.push(`Avant, tu étais sur ${nomAppli(a.appli)}${a.titre ? `, ${titreDit(a.titre)}` : ''}, pendant ${duree(a.duree)}.`);
    if (c.vu) p.push(`Au dernier coup d'œil : ${nettoie(c.vu.texte)}`);
    return say(p.join(' ') || "Je n'ai rien noté de récent sur l'ordinateur.");
  }
  async function regle(on) {
    try { await fetch(`${root()}/maison/pc/activite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on }) }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    cacheAt = 0; fx.ok();
    return say(on ? "C'est parti : je garde un œil sur ton écran, en coéquipier. Les images restent à la maison, et je ne regarde jamais tes fenêtres privées. Dis « arrête de regarder mon écran » quand tu veux." : "D'accord : je ne regarde plus ton écran. Dis « regarde mon écran en permanence » pour que je reprenne.");
  }

  // de lui-même, très peu : seulement sur l'ordinateur, quand il est disponible
  setInterval(async () => {
    if (!surPC() || !dlg.started || voice.endormi || voice.occupe() || dlg.busy) return;
    const h = new Date().getHours(); if (h < 8 || h >= 22) return;
    if (typeof AVENIR !== 'undefined' && AVENIR.concentre && AVENIR.concentre()) return;
    const c = await lit(true); if (!c || !c.on || !c.present) return;
    if (Date.now() - ditAt < 45 * 60000 || trading(c)) return;
    // 1 h 45 devant l'écran sans vraie pause
    if (c.devant >= 105 * 60 && Date.now() - pauseDite > 2 * 3600000) {
      pauseDite = ditAt = Date.now();
      return PROACTIF.annonce(`coeq-pause-${Date.now()}`, `Ça fait ${duree(c.devant)} que tu es devant l'ordi sans lever les yeux. Cinq minutes pour bouger et boire un verre d'eau ?`, { expire: Date.now() + 10 * 60000 });
    }
    // le retour après une longue pause : où il en était
    const p = c.derniere_pause, a = c.avant;
    if (p && a && Date.now() / 1000 - p.fin < 150 && p.fin - p.debut >= 30 * 60 && a.duree >= 10 * 60 && retourDit !== p.fin) {
      retourDit = p.fin; ditAt = Date.now();
      return PROACTIF.annonce(`coeq-retour-${p.fin}`, `Re. Avant ta pause, tu étais sur ${nomAppli(a.appli)}${a.titre ? `, ${titreDit(a.titre)}` : ''}.`, { expire: Date.now() + 5 * 60000 });
    }
  }, 60000);

  function route(t, n) {
    if (/\b(arrete|arreter|arretes|stop|ne) (de |plus )?(regarder|surveiller|voir|lire) (mon|l) ecran\b|\bne regarde plus (mon|l) ecran\b|\bcoequipier (off|en pause|arrete|stop)\b/.test(n)) return () => regle(false);
    if (/\b(regarde|surveille|suis) (mon|l) ecran (tout le temps|en permanence|toute la journee|en continu)\b|\bsois mon coequipier\b|\bcoequipier (on|active|reprends)\b|\breprends (le coequipier|ton oeil)\b/.test(n)) return () => regle(true);
    if (/\b(qu est ce que j ai fait|j ai fait quoi|mon temps d ecran|combien de temps (j ai passe|sur))\b.*\b(aujourd hui|ordi|ordinateur|ecran)\b|\btemps d ecran\b/.test(n)) return journee;
    if (/\b(on en etait ou|j en etais ou|ou j en etais|qu est ce que je faisais|je faisais quoi|sur quoi je (bosse|travaille|travaillais|bossais))\b/.test(n)) return ouOnEnEtait;
    if (/\b(regarde|vois|lis|check|verifie|jette un (oeil|coup d oeil)|tu vois)\b.*\b(mon ecran|l ecran de l ordi|ce que je fais|ce que j ai a l ecran|sur mon ecran)\b|\bqu est ce que tu vois sur (mon|l) ecran\b/.test(n))
      return () => regarde(t, /\b(aide|pense|avis|erreur|bug|marche pas|probleme|comment|pourquoi|corrige|ameliore)\b/.test(n));
    // l'aide « sur ça » : seulement sur l'ordinateur, quand il est devant
    if (surPC() && cache && cache.on && cache.present && /\b(aide moi (avec|sur|a) (ca|ce truc|cette|ce)|tu peux m aider (avec|sur|a) (ca|ce)|t en penses quoi|tu en penses quoi|qu est ce que t en penses|qu est ce que tu en penses|ca marche pas|pourquoi ca (marche|fonctionne) pas|c est bon comme ca|j ai bien fait)\b/.test(n) && n.split(' ').length <= 16)
      return () => regarde(t, true);
    return null;
  }
  setTimeout(() => lit(), 5000);
  return { route, frais, texte, surPC, _lit: lit };
})();

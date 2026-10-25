/* =========================================================
   ATLAS — l'appli Cuisine (l'écran) : l'accueil, la fiche recette, le mode cuisson, la fin
   Pensée pour le téléphone et la tablette de la cuisine : de grosses cibles, un texte énorme en cuisson, les mains sales
   (toucher n'importe où ou dire « suivant » sans dire « Atlas »), plusieurs minuteurs, l'écran qui reste allumé.
   - L'accueil : le dîner du soir, la semaine, le garde-manger, les courses, « Envie de… », mes recettes.
   - La fiche : temps, calories et macros par portion (estimation), les portions (− / +) qui recalculent les quantités,
     les ingrédients (au garde-manger, ou à acheter → les courses), « Cuisiner », « Garder ».
   - La cuisson : une étape à la fois, ses ingrédients, son minuteur ; Atlas lit l'étape ; une question → il répond.
   - La fin : la note, « Garder dans mes recettes », retirer du garde-manger ce qui a servi.
   L'alimentation la moins transformée possible, pour des sportifs (comme cuisine.js). Rien de médical.
   ========================================================= */
'use strict';

const CUISINEUI = (() => {
  const REP = [['matin', 'Petit-déjeuner', 'Ce matin'], ['midi', 'Déjeuner', 'Ce midi'], ['collation', 'Collation', 'La collation'], ['plat', 'Dîner', 'Ce soir']];
  let heroCle = 'plat', jourSel = '';
  let el = null, vue = 'accueil', data = null, rec = null, pers = 2, etape = -1, lecture = true, horloge = 0, verrou = null, retour = 'accueil';
  const minuteurs = [];
  const r0 = () => VOIXMAISON.root();
  async function db(corps) {
    const r = await fetch(`${r0()}/maison/cuisine`, { method: corps ? 'POST' : 'GET', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error(`cuisine ${r.status}`);
    return r.json();
  }
  const liste = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0] || '');
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const REGLES = "Uniquement des aliments bruts ou très peu transformés (légumes, fruits, légumineuses, céréales complètes, œufs, viandes et poissons frais, laitages nature, oléagineux, huile d'olive, épices), aucun produit industriel (pas de cube, pas de sauce toute prête, pas de pâte industrielle), aucun complément. Repères du sportif, sans conseil médical : des protéines à chaque repas (25 à 40 g pour un adulte sportif), des légumes, des glucides complexes après l'effort ; pour un enfant sportif, des portions d'enfant, simples et gourmandes.";

  /* ---------- les icônes (des traits) ---------- */
  const IC = {
    x: '<path d="M6 6l12 12M18 6L6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', flame: '<path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-4 3-5 0 2 1 3 2 3 0-3-1-5 1-8z"/>',
    leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l8-8"/>', heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', moins: '<path d="M5 12h14"/>', cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5v14l11-7z"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>', box: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M10 15h4M7 7V4h10v3"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', sound: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>', mute: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  };
  const ic = (k, t = 22) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
  // la couleur d'un plat : d'après ce qui domine (le poisson, la viande, les légumineuses, les légumes, les œufs, le sucré)
  const teinte = t => { const n = N(t || ''); return /\b(saumon|cabillaud|poisson|maquereau|sardine|thon|truite|merlu|crevette|moules|colin)\b/.test(n) ? ['#0e7490', '#0b3b4a'] : /\b(poulet|dinde|boeuf|steak|veau|porc|agneau|canard|viande|basquaise)\b/.test(n) ? ['#c2410c', '#4a1d0a'] : /\b(lentilles?|pois chiches?|haricots?|dahl|chili|feves?|houmous|curry)\b/.test(n) ? ['#b45309', '#3f2a0b'] : /\b(oeufs?|omelette|frittata|shakshuka)\b/.test(n) ? ['#ca8a04', '#3f3208'] : /\b(skyr|yaourt|fruits?|avoine|porridge|pancakes?|crepes?|gateau|dessert|compote)\b/.test(n) ? ['#be185d', '#3f0d24'] : ['#15803d', '#0b2e17']; };

  /* ---------- les photos des plats : de vraies photos, libres (Wikimedia Commons), gratuites et sans clé ----------
     Le nom du plat → l'anglais (le cerveau, par lots) → la recherche → la photo dont la légende colle le mieux.
     Si rien ne colle vraiment, pas de photo : le dégradé du plat reste (mieux qu'une photo d'autre chose).
     Gardé sur l'appareil (un plat = une recherche, une fois). Seul le nom du plat part, rien de personnel. */
  const PHOTO = (() => {
    const PLAT = /\b(dish|meal|dinner|lunch|breakfast|plate|plated|recipe|cooked|roast|roasted|grilled|baked|fried|pan|stew|soup|salad|curry|bowl|served|fillet|homemade|cuisine|omelet|omelette|porridge|oatmeal|dal|dhal|dahl|chili|basquaise|gratin|risotto|tagine)\b/;
    const CLE = 'cz.photos', MOTS = /^(with|and|the|a|an|of|on|in|style|homemade|fresh|recipe|dish|food|bowl|plate|topped|drizzled|sprinkled|garnished|small|large|served|side|some|little|ceramic|wooden|board|top)$/;
    let memo = {}; try { memo = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { memo = {}; }
    const range = () => { try { const k = Object.keys(memo); k.slice(0, Math.max(0, k.length - 300)).forEach(x => delete memo[x]); localStorage.setItem(CLE, JSON.stringify(memo)); } catch (e) { /* rien */ } };
    const cle = t => N(t || '').slice(0, 90);
    const connu = t => { const m = memo[cle(t)]; return m && (m.u || Date.now() / 1000 - (m.at || 0) < 7 * 86400) ? m : null; }; // un échec : on réessaie dans une semaine
    const att = new Map(); let file = [], tourne = false;
    async function anglais(titres) {
      if (!AI.ready()) return {};
      try {
        const raw = String(await AI.chat([{ role: 'system', content: 'For each French dish name, give two English image-search queries for a photo of that plated dish: "p" precise (a short visual description of the plated dish, 4 to 10 words, main ingredients first, how it looks, e.g. "fromage blanc in a small bowl drizzled with honey", "red lentil dahl topped with fresh coriander"; no adjectives like delicious), "s" simple (1 to 3 words, the dish as served, e.g. "salmon fillet", "chili con carne", "quinoa salad", "omelette"). Answer ONLY JSON: {"d": [{"t": "<the exact French name>", "p": "...", "s": "..."}]}' }, { role: 'user', content: titres.join('\n') }], { maxTokens: 900, temperature: 0.2, json: true }));
        const o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); const r = {};
        (o.d || []).forEach(x => { if (x && x.t) r[cle(x.t)] = [x.p, x.s].filter(Boolean); });
        return r;
      } catch (e) { return {}; }
    }
    // Wikimedia Commons (rapide, libre) : la photo dont le TITRE nomme le plat (tous les mots de « s ») et reprend le plus
    // de mots de « p » ; plutôt large et nette ; jamais une page de vieux livre scannée
    const mots = q => String(q || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !MOTS.test(w));
    const racine = w => w.replace(/(ies)$/, 'y').replace(/(oes|es|s)$/, m => (m === 'oes' ? 'o' : ''));
    async function commons(q) {
      const ab = new AbortController(), t = setTimeout(() => ab.abort(), 9000);
      const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1280`;
      try { const r = await fetch(u, { signal: ab.signal }); if (!r.ok) return []; const d = await r.json(); return Object.values((d.query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)); } catch (e) { return []; } finally { clearTimeout(t); }
    }
    const sansHtml = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    async function cherche(p, s_) {
      const mp = mots(p), ms = mots(s_ || p).slice(0, 3);
      if (!mp.length && !ms.length) return null;
      // la recherche exige tous les mots : la précise, puis plus courte, puis le plat seul
      for (const q of [mp.join(' '), mp.slice(0, 3).join(' '), mp.slice(0, 2).join(' '), ms.join(' ')].filter((x, i, l) => x && l.indexOf(x) === i)) {
        let mieux = null, top = 0;
        for (const x of await commons(q)) {
          const ii = (x.imageinfo || [])[0]; if (!ii || !ii.thumburl || !/jpeg|png|webp/.test(ii.mime || '') || ii.width < 800) continue;
          const tit = String(x.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[_-]/g, ' ');
          if (/\b(1[5-9]\d\d|book|handbook|page|journal|magazine|catalog|map|diagram|logo|menu card|poster|drawing|illustration|painting|mhnt|bot|herbarium|seeds?|plants?|field|farm|harvest|reservoir|river|lake|creek|hatchery|jar|bottle|package|packaging|label|brand|shop|store|market|restaurant sign|dairy bar|candy|cereal bar|chocolate bar|ice cream|vending|advert|advertisement)\b/.test(tit)) continue;
          if (!ms.every(w => tit.includes(racine(w)))) continue;
          const vus = mp.filter(w => tit.includes(racine(w))).length;
          // un plat, pas l'ingrédient vivant ou cru : deux mots du plat, ou un mot de cuisine dans le titre
          if (vus < Math.min(2, mp.length) && !PLAT.test(tit)) continue;
          const rap = ii.width / (ii.height || ii.width);
          const sc = (mp.length ? vus / mp.length : 0) + (rap >= 1.15 && rap <= 1.9 ? 0.3 : rap < 0.9 ? -0.15 : 0) + (ii.width >= 1600 ? 0.1 : 0);
          if (sc > top) { top = sc; mieux = { ii, tit }; }
        }
        if (mieux) { const m = mieux.ii.extmetadata || {}; return { u: mieux.ii.thumburl, par: sansHtml((m.Artist || {}).value).slice(0, 40), lic: sansHtml((m.LicenseShortName || {}).value).slice(0, 20), src: mieux.ii.descriptionurl || '' }; }
        await new Promise(r => setTimeout(r, 400));
      }
      return null;
    }
    // les images fabriquées par la carte graphique de la maison (maison/images.py, par le relais) : le PC les fabrique
    // quand Shadow ne se sert pas de la carte ; en attendant (ou hors de la maison), la photo de Commons
    const CLEG = 'cz.gen'; let gen = {}; try { gen = JSON.parse(localStorage.getItem(CLEG) || '{}') || {}; } catch (e) { gen = {}; }
    const gardeGen = () => { try { const k = Object.keys(gen); k.slice(0, Math.max(0, k.length - 400)).forEach(x => delete gen[x]); localStorage.setItem(CLEG, JSON.stringify(gen)); } catch (e) { /* rien */ } };
    const urlGen = g => (g && g.e === 'pret' && r0() ? `${r0()}/maison/image/${g.c}.jpg` : '');
    const aDemander = new Map();
    async function demande() {
      if (!aDemander.size || !r0()) return;
      const l = [...aDemander.values()].slice(0, 30); l.forEach(x => aDemander.delete(cle(x.t)));
      try {
        const r = await fetch(`${r0()}/maison/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demandes: l.map(x => ({ titre: x.t, prompt: x.p })) }) });
        const d = await r.json(), at = Math.floor(Date.now() / 1000);
        for (const [t, v] of Object.entries(d.etats || {})) { gen[cle(t)] = { c: v.cle, e: v.etat, at }; if (v.etat === 'pret') montreGen(cle(t)); }
        gardeGen(); suivi();
      } catch (e) { /* le PC n'est pas joignable : on redemandera */ }
    }
    let suiviT = 0;
    function suivi() {
      if (suiviT) return;
      suiviT = setTimeout(async () => {
        suiviT = 0;
        const att_ = Object.entries(gen).filter(([, g]) => g.e === 'attente');
        if (!att_.length || !r0()) return;
        try {
          const d = await (await fetch(`${r0()}/maison/images?cles=${att_.slice(0, 60).map(([, g]) => g.c).join(',')}`, { cache: 'no-store' })).json();
          let neuf = false;
          for (const [k, g] of att_) { const e = (d.cles || {})[g.c]; if (e && e !== g.e) { g.e = e; neuf = true; if (e === 'pret') montreGen(k); } }
          if (neuf) gardeGen();
        } catch (e) { /* rien */ }
        if (document.getElementById('cz')) suivi(); // tant que l'appli est ouverte, on regarde toutes les 30 secondes
      }, 30000);
    }
    // une image vient d'être fabriquée : elle remplace la photo, en fondu, partout où le plat est à l'écran
    function montreGen(k) {
      const u = urlGen(gen[k]); if (!u) return;
      document.querySelectorAll('#cz img[data-ph]').forEach(im => { if (cle(im.dataset.ph) !== k || im.dataset.maison) return; const pre = new Image(); pre.onload = () => { if (!im.isConnected) return; im.classList.remove('ok'); setTimeout(() => affiche(im, { u, maison: true }, false), 350); }; pre.src = u; });
    }
    async function boucle() {
      if (tourne) return; tourne = true;
      try {
        while (file.length) {
          const lot = file.splice(0, 10), sansQ = lot.map(x => x.t); // « p » et « s » pour chacun (même si la recette a déjà son « photo »)
          const tr = sansQ.length ? await anglais(sansQ) : {};
          for (const x of lot) {
            const k = cle(x.t), qs = tr[k] || (x.q ? [x.q] : []);
            if (qs[0] && !gen[k]) aDemander.set(k, { t: x.t, p: qs[0] });
            if (x.genSeul) { if (memo[k] && qs[0]) { memo[k].q = qs[0]; range(); } continue; }
            const m = qs.length ? await cherche(qs[0], qs[1]) : null;
            memo[k] = Object.assign({ at: Math.floor(Date.now() / 1000), q: qs[0] || '' }, m || { u: '' }); range();
            (att.get(k) || []).forEach(f => f(memo[k])); att.delete(k);
            await new Promise(r => setTimeout(r, 300)); // poli avec le service
          }
          demande();
        }
      } finally { tourne = false; }
    }
    function veut(t, q, f) {
      const k = cle(t); if (!k) return; const m = connu(t);
      if (m) {
        if (!gen[k] && r0()) { if (m.q) { aDemander.set(k, { t, p: m.q }); setTimeout(demande, 100); } else if (!att.has(k)) { file.push({ t, q, genSeul: true }); setTimeout(boucle, 60); } }
        return f(m);
      }
      if (!att.has(k)) { att.set(k, []); file.push({ t, q }); }
      att.get(k).push(f); setTimeout(boucle, 60); // le temps de ramasser toutes les photos de l'écran en un seul lot
    }
    function affiche(im, m, vite) {
      if (!m || !m.u || !im.isConnected) return;
      if (vite) im.style.transition = 'none';
      im.dataset.maison = m.maison ? '1' : '';
      im.onload = () => { im.classList.add('ok'); if (vite) requestAnimationFrame(() => { im.style.transition = ''; }); const c = im.parentElement && im.parentElement.querySelector('.credit'); if (c) { c.textContent = m.maison ? 'Image créée par l’ordinateur de la maison' : m.par ? `Photo ${m.par} · ${m.lic}` : ''; c.hidden = !c.textContent; } };
      im.onerror = () => {
        if (m.maison) { im.dataset.maison = ''; veut(im.dataset.ph, im.dataset.q || '', m2 => affiche(im, m2, false)); return; } // le PC injoignable (hors de la maison) : la photo
        memo[cle(im.dataset.ph)] = { u: '', at: Math.floor(Date.now() / 1000) }; range();
      };
      im.src = m.u;
    }
    // les images d'un écran : <img class="ph" data-ph="le plat" data-q="english query"> → remplies dès que trouvées, en fondu
    function remplis(racine) {
      racine.querySelectorAll('img[data-ph]').forEach(im => {
        if (im.dataset.fait) return; im.dataset.fait = '1';
        const k = cle(im.dataset.ph), g = gen[k];
        if (urlGen(g)) return affiche(im, { u: urlGen(g), maison: true }, true); // déjà fabriquée : tout de suite
        if (g && g.e === 'attente') suivi();
        let tout = true; // déjà connue : elle s'affiche tout de suite, sans fondu (en cuisson, l'écran se redessine à chaque étape)
        veut(im.dataset.ph, im.dataset.q || '', m => affiche(im, m, tout));
        tout = false;
      });
    }
    return { remplis, connu };
  })();
  // une photo plein cadre (avec son voile pour que le texte reste lisible) ; le dégradé dessous tant qu'elle n'est pas là
  const ph = (r, credit) => { const t = typeof r === 'string' ? r : r && r.titre; if (!t) return ''; const q = typeof r === 'object' && r.photo ? r.photo : ''; return `<img class="ph" alt="" decoding="async" referrerpolicy="no-referrer" data-ph="${esc(t)}" data-q="${esc(q)}"><i class="voile"></i>${credit ? '<span class="credit" hidden></span>' : ''}`; };

  /* ---------- le style ---------- */
  function style() {
    if (document.getElementById('cz-css')) return;
    const s = document.createElement('style'); s.id = 'cz-css';
    s.textContent = `
#cz{position:fixed;inset:0;z-index:66;background:#0b0c0e;color:#f5f1ea;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;opacity:0;transition:opacity .25s;-webkit-tap-highlight-color:transparent}
#cz.vu{opacity:1}#cz *{box-sizing:border-box}
#cz .tete{display:flex;align-items:center;gap:10px;padding:max(14px,env(safe-area-inset-top)) 16px 10px}
#cz .tete h1{margin:0;font:800 24px/1 system-ui;letter-spacing:-.01em;flex:1}#cz .tete small{display:block;font:500 12px system-ui;color:#a8a29e;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
#cz .rond{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.07);border:0;color:#f5f1ea;cursor:pointer;flex:0 0 auto}
#cz .rond:active{transform:scale(.94)}#cz .corps{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 16px max(24px,env(safe-area-inset-bottom));overscroll-behavior:contain}
#cz .hero{position:relative;border-radius:24px;padding:22px 20px;min-height:170px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;cursor:pointer;box-shadow:0 18px 40px rgba(0,0,0,.35)}
#cz .hero::after{content:'';position:absolute;inset:0;background:radial-gradient(120% 90% at 100% 0%,rgba(255,255,255,.18),transparent 55%);pointer-events:none}
#cz .hero .lab{font:700 12px system-ui;letter-spacing:.16em;text-transform:uppercase;opacity:.85}#cz .hero h2{margin:6px 0 4px;font:800 clamp(24px,5vw,34px)/1.1 system-ui;letter-spacing:-.01em}
#cz .hero p{margin:0;font-size:15px;opacity:.9}#cz .puces{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#cz .puce{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;background:rgba(0,0,0,.28);font:600 13px system-ui;color:#fff}
#cz .titre{margin:26px 0 10px;font:800 18px system-ui;display:flex;justify-content:space-between;align-items:baseline}#cz .titre span{font:500 13px system-ui;color:#a8a29e}
#cz .defile{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory;scrollbar-width:none}#cz .defile::-webkit-scrollbar{display:none}
#cz .jour{flex:0 0 46%;max-width:210px;scroll-snap-align:start;border-radius:18px;padding:14px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;border:1px solid rgba(255,255,255,.06)}
#cz .jour b{font:700 12px system-ui;letter-spacing:.12em;text-transform:uppercase;opacity:.85}#cz .jour div{font:700 16px/1.25 system-ui}
#cz .tuiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#cz .tuile{border-radius:18px;padding:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);cursor:pointer;min-height:96px;display:flex;flex-direction:column;justify-content:space-between}
#cz .tuile .i{color:#ffb547}#cz .tuile b{font:700 16px system-ui}#cz .tuile small{color:#a8a29e;font-size:13px;line-height:1.35}#cz .tuile.alerte small{color:#fca5a5}
#cz .chercher{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.07);border-radius:16px;padding:6px 6px 6px 14px;margin-top:6px}
#cz .chercher input{flex:1;min-width:0;background:none;border:0;outline:0;color:#f5f1ea;font:500 17px system-ui;padding:10px 0}
#cz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:13px 18px;font:700 16px system-ui;cursor:pointer;background:rgba(255,255,255,.09);color:#f5f1ea}
#cz .btn.chaud{background:linear-gradient(135deg,#ff8a3d,#ffb547);color:#1c0f04;box-shadow:0 10px 24px rgba(255,138,61,.35)}#cz .btn:active{transform:scale(.97)}#cz .btn.plein{width:100%}
#cz .chips{display:flex;gap:8px;margin-top:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}#cz .chips::-webkit-scrollbar{display:none}#cz .chip{flex:0 0 auto}#cz .chip{border:1px solid rgba(255,255,255,.12);background:none;color:#e7e2d9;border-radius:999px;padding:9px 13px;font:600 14px system-ui;cursor:pointer}
#cz .grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
#cz .carte{border-radius:18px;padding:14px;min-height:110px;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer;position:relative}#cz .carte b{font:700 15px/1.25 system-ui}#cz .carte small{opacity:.8;font-size:12px;margin-top:4px}
#cz .macros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}#cz .macro{background:rgba(255,255,255,.05);border-radius:14px;padding:10px;text-align:center}
#cz .macro b{display:block;font:800 19px system-ui}#cz .macro small{font-size:11px;color:#a8a29e;letter-spacing:.06em;text-transform:uppercase}
#cz .portions{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);border-radius:16px;padding:8px 8px 8px 16px;margin-top:14px}#cz .portions b{font:700 17px system-ui}
#cz .ingr{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-size:17px}
#cz .ingr .q{margin-left:auto;font-weight:700;color:#ffd9a0;white-space:nowrap}#cz .ingr .ok{color:#6ee7a8}#cz .ingr .manque{color:#fca5a5}
#cz .etape-l{display:flex;gap:12px;padding:10px 0;font-size:16px;line-height:1.45;color:#e7e2d9}#cz .etape-l i{font-style:normal;flex:0 0 28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);display:grid;place-items:center;font:700 13px system-ui}
#cz .bas{position:sticky;bottom:0;display:flex;gap:10px;padding:14px 0 max(4px,env(safe-area-inset-bottom));background:linear-gradient(transparent,#0b0c0e 30%)}
/* la cuisson */
#cz.cuisson{background:#050506}#cz .prog{display:flex;gap:4px;padding:0 16px}#cz .prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.12)}#cz .prog i.fait{background:#ffb547}#cz .prog i.ici{background:linear-gradient(90deg,#ffb547,#ff8a3d)}
#cz .scene{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;justify-content:center;padding:10px 22px;cursor:pointer;user-select:none}
#cz .scene .num{font:800 14px system-ui;letter-spacing:.2em;color:#ffb547;text-transform:uppercase}#cz .scene .txt{margin-top:12px;font:700 clamp(26px,5.4vw,48px)/1.22 system-ui;letter-spacing:-.01em}
#cz .scene .ing{margin-top:20px;display:flex;flex-wrap:wrap;gap:8px}#cz .scene .ing span{background:rgba(255,181,71,.12);color:#ffd9a0;border-radius:999px;padding:8px 13px;font:600 16px system-ui}
#cz .minus{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px}#cz .minu{display:inline-flex;align-items:center;gap:8px;background:rgba(110,231,168,.12);color:#a7f3d0;border-radius:999px;padding:9px 14px;font:700 17px system-ui;font-variant-numeric:tabular-nums}
#cz .minu.fini{background:#16a34a;color:#fff;animation:czClig 1s steps(2) infinite}@keyframes czClig{50%{opacity:.55}}
#cz .nav{display:grid;grid-template-columns:1fr 2fr;gap:10px;padding:12px 16px max(16px,env(safe-area-inset-bottom))}#cz .nav .btn{padding:20px;font-size:19px}
#cz .astuce{margin-top:16px;color:#a8a29e;font-size:15px;line-height:1.5}#cz .vide{color:#a8a29e;font-size:15px;padding:8px 0}
#cz .etoiles{display:flex;gap:10px;justify-content:center;margin:20px 0}#cz .etoiles button{background:none;border:0;color:#57534e;cursor:pointer;padding:4px}#cz .etoiles button.on{color:#ffb547}
#cz .charge{display:grid;place-items:center;gap:14px;padding:60px 0;color:#a8a29e;font-size:16px}#cz .charge i{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,181,71,.2);border-top-color:#ffb547;animation:czTourne 1s linear infinite}@keyframes czTourne{to{transform:rotate(360deg)}}
/* les photos */
#cz .hero,#cz .jour,#cz .carte{position:relative;overflow:hidden;isolation:isolate}
#cz .ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease,transform 1.2s ease;z-index:-2;transform:scale(1.04)}
#cz .ph.ok{opacity:1;transform:scale(1)}#cz .voile{position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .9s;background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.18) 40%,rgba(0,0,0,.82) 100%)}
#cz .ph.ok+.voile{opacity:1}#cz .jour .voile,#cz .carte .voile{background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,.12) 32%,rgba(0,0,0,.25) 55%,rgba(0,0,0,.88) 100%)}#cz .jour b,#cz .carte span{text-shadow:0 1px 8px rgba(0,0,0,.6)}#cz .hero::after{z-index:-1}
#cz .hero .ph.ok{animation:czKen 26s ease-in-out infinite alternate}@keyframes czKen{from{transform:scale(1.02) translate(0,0)}to{transform:scale(1.16) translate(-2.5%,-2%)}}
#cz .jour:active .ph,#cz .carte:active .ph{transform:scale(1.06)}
#cz .hero h2,#cz .jour div,#cz .carte b{text-shadow:0 2px 14px rgba(0,0,0,.45)}
#cz .credit{position:absolute;top:10px;right:12px;font:500 10px system-ui;color:rgba(255,255,255,.7);background:rgba(0,0,0,.3);padding:3px 7px;border-radius:999px;max-width:70%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cz .hero.grand{min-height:min(62vh,440px);border-radius:28px}#cz .hero.grand h2{font-size:clamp(30px,7vw,46px)}
#cz .carte{min-height:150px}#cz .grille .carte:first-child{grid-column:span 2;min-height:190px}
/* la cuisson : la photo du plat en fond, floutée, comme une lumière */
#cz .fondph{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(48px) saturate(1.4) brightness(.32);opacity:0;transition:opacity 1.2s;z-index:0;pointer-events:none}
#cz .fondph.ok{opacity:1}#cz.cuisson>*:not(.fondph){position:relative;z-index:1}
#cz .vignette{width:0;height:44px;border-radius:14px;object-fit:cover;flex:0 0 auto;opacity:0;transition:opacity .6s,width .4s;margin-left:-10px}#cz .vignette.ok{opacity:1;width:44px;margin-left:0}
#cz .repas{flex-basis:40%;min-height:128px}#cz .repas b{letter-spacing:.06em;font-size:11px}#cz .repas.passe{opacity:.5}#cz .repas.ici{outline:2px solid #ffb547;outline-offset:-2px}#cz .repas-jour{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))}
@media (prefers-reduced-motion:reduce){#cz .hero .ph.ok{animation:none}}
@media (min-width:900px){#cz .corps{padding:4px 28px 28px}#cz .tuiles{grid-template-columns:repeat(4,minmax(0,1fr))}#cz .jour{flex-basis:18%}#cz .fiche{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}}`;
    document.head.appendChild(s);
  }

  /* ---------- ouvrir, fermer, dessiner ---------- */
  async function ouvre(v = 'accueil') {
    style();
    if (!el) { el = document.createElement('div'); el.id = 'cz'; document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('vu')); }
    vue = v; dessine();
    try { data = await db(); } catch (e) { data = data || { stock: [], menus: [], recettes: [] }; }
    if (vue === 'accueil') dessine();
  }
  function ferme() {
    if (!el) return; el.classList.remove('vu'); const e = el; el = null; setTimeout(() => e.remove(), 260);
    lache(); clearInterval(horloge); horloge = 0;
  }
  async function garde() { try { if ('wakeLock' in navigator && !verrou) verrou = await navigator.wakeLock.request('screen'); } catch (e) { verrou = null; } }
  function lache() { try { if (verrou) verrou.release(); } catch (e) { /* rien */ } verrou = null; }
  function dessine() {
    if (!el) return;
    el.classList.toggle('cuisson', vue === 'cuisson');
    el.innerHTML = vue === 'jour' ? vJour() : vue === 'recette' ? vRecette() : vue === 'cuisson' ? vCuisson() : vue === 'fin' ? vFin() : vue === 'charge' ? vCharge() : vAccueil();
    branche(); PHOTO.remplis(el);
    const ici = el.querySelector('.repas.ici'); if (ici && ici.parentElement) ici.parentElement.scrollLeft = Math.max(0, ici.offsetLeft - ici.parentElement.offsetLeft - 24); // la journée : le repas qui vient, en vue
  }
  const sansReste = t => String(t || '').replace(/^restes?\s+(?:de la |de l['’]|du |des |de |d['’])/i, ''); // la photo d'un reste : celle du plat
  const estReste = t => /^restes?\b/i.test(String(t || ''));
  const tete = (titre, sous, gauche = 'x') => `<div class="tete"><button class="rond" data-a="${gauche === 'x' ? 'ferme' : 'retour'}" aria-label="${gauche === 'x' ? 'Fermer' : 'Retour'}">${ic(gauche)}</button><div style="flex:1"><small>${esc(sous || '')}</small><h1>${esc(titre)}</h1></div></div>`;
  let chargeTxt = '';
  const vCharge = () => `${tete('Cuisine', 'Atlas cuisine', 'back')}<div class="corps"><div class="charge"><i></i>${esc(chargeTxt || 'Je prépare la recette…')}</div></div>`;

  /* ---------- l'accueil ---------- */
  const auj = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function vAccueil() {
    const d = data || {}, st = d.stock || [], now = Date.now() / 1000;
    const menus = (d.menus || []).filter(x => x.date >= auj()), soir = menus.find(x => x.date === auj());
    const vite = st.filter(x => x.perime && x.lieu !== 'congelateur' && x.perime - now < 2 * 86400);
    const courses = (S.listes || []).filter(x => x.liste === 'courses').length;
    const recettes = (d.recettes || []).slice().reverse(), nouv = ((d.nouveautes || {}).liste || []);
    // le prochain repas de la journée (le matin, le petit-déjeuner ; à midi, le déjeuner ; l'après-midi, la collation ; puis le dîner)
    const h = new Date().getHours(); let k0 = h < 10 ? 0 : h < 14 ? 1 : h < 17 ? 2 : 3; while (soir && k0 < 3 && !soir[REP[k0][0]]) k0++;
    heroCle = REP[k0][0]; const heroPlat = soir ? soir[heroCle] || soir.plat : '';
    const [c1, c2] = teinte(heroPlat);
    const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const journee = soir && REP.some(([k]) => k !== 'plat' && soir[k]);
    return `${tete('Cuisine', date)}<div class="corps">
      <div class="hero grand" data-a="${soir ? 'soir' : 'idee'}" style="background:linear-gradient(140deg,${c1},${c2})">${soir ? ph(heroPlat) : ''}
        <div class="lab">${soir ? REP[k0][2] : 'Ce soir ?'}</div><h2>${esc(soir ? heroPlat : 'On cuisine quoi ?')}</h2>
        <p>${esc(soir ? (heroCle === 'plat' ? soir.note : heroCle === 'collation' ? soir.collation_quand : '') || 'Touche pour la recette' : 'Trois idées avec ce que tu as, tes entraînements et le potager')}</p>
        <div class="puces">${soir && heroCle === 'plat' && soir.double ? '<span class="puce">×2 · le midi de demain</span>' : ''}${soir && (soir.decongeler || []).length ? `<span class="puce">${ic('box', 15)} ${heroCle === 'plat' ? '' : 'ce soir : '}sortir ${esc(liste(soir.decongeler))}</span>` : ''}<span class="puce">${ic('play', 15)} ${soir ? 'Voir la recette' : 'Des idées'}</span></div>
      </div>
      ${journee ? `<div class="titre">Ma journée</div><div class="defile">${REP.map(([k, lab], i) => soir[k] ? `<div class="jour repas ${i < k0 ? 'passe' : i === k0 ? 'ici' : ''}" data-date="${soir.date}" data-cle="${k}" style="background:linear-gradient(160deg,${teinte(soir[k])[0]}cc,${teinte(soir[k])[1]})">${ph(sansReste(soir[k]))}<b>${lab}</b><div>${esc(soir[k])}</div></div>` : '').join('')}</div>` : ''}
      <div class="chercher" style="margin-top:${journee ? 16 : 6}px">${ic('search', 20)}<input id="cz-q" placeholder="Envie de… (un plat, un ingrédient)" enterkeyhint="search" autocomplete="off"><button class="btn chaud" data-a="cherche">${ic('spark', 18)}</button></div>
      <div class="chips">${['Récupération après le sport', 'Prêt en 15 minutes', "Avec ce que j'ai", 'À faire avec mon fils', 'Petit-déjeuner sportif', 'Végétarien protéiné'].map(x => `<button class="chip" data-idee="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="titre">La semaine <span>${menus.length ? `${menus.length} dîners` : ''}</span></div>
      ${menus.length ? `<div class="defile">${menus.map(m => { const [a, b] = teinte(m.plat); const j = new Date(`${m.date}T12:00:00`); return `<div class="jour" data-jour="${m.date}" style="background:linear-gradient(160deg,${a}cc,${b})">${ph(m.plat)}<b>${m.date === auj() ? "Aujourd'hui" : `${JOURS[j.getDay()]} ${j.getDate()}`}</b><div>${esc(m.plat)}${m.matin ? '<small style="display:block;font:500 12px system-ui;opacity:.8;margin-top:4px">+ matin, midi, collation</small>' : ''}</div></div>`; }).join('')}</div>` : `<button class="btn plein" data-a="semaine">${ic('cal', 20)} Préparer ma semaine : menus, courses, drive</button>`}
      <div class="titre">La maison</div>
      <div class="tuiles">
        <div class="tuile ${vite.length ? 'alerte' : ''}" data-a="frigo"><span class="i">${ic('box')}</span><b>Garde-manger</b><small>${st.length ? (vite.length ? `À finir : ${esc(liste(vite.slice(0, 3).map(x => x.nom)))}` : `${st.length} produits`) : 'Vide pour l’instant'}</small></div>
        <div class="tuile" data-a="courses"><span class="i">${ic('cart')}</span><b>Courses</b><small>${courses ? `${courses} article${courses > 1 ? 's' : ''} · mode magasin` : 'Liste vide'}</small></div>
        <div class="tuile" data-a="semaine"><span class="i">${ic('cal')}</span><b>Ma semaine</b><small>Menus, courses, drive</small></div>
        <div class="tuile" data-a="batch"><span class="i">${ic('timer')}</span><b>Batch cooking</b><small>${(d.batch || []).length ? `${d.batch.length} étapes prêtes` : 'Après les menus'}</small></div>
      </div>
      <div class="titre">Nouveautés de la semaine <span>${nouv.length ? `<button class="chip" data-a="renouvelle" style="padding:6px 11px;font-size:13px">${ic('spark', 14)} Renouveler</button>` : ''}</span></div>
      ${nouv.length ? `<div class="defile">${nouv.map((r, i) => { const [a, b] = teinte(r.titre); return `<div class="jour" data-nouv="${i}" style="flex-basis:72%;max-width:320px;min-height:210px;background:linear-gradient(160deg,${a},${b})">${ph(r)}<b>${esc((r.tags || [])[0] || 'Nouveau')}</b><div>${esc(r.titre)}<div style="font:500 13px system-ui;opacity:.85;margin-top:6px">${r.minutes ? `${r.minutes} min` : ''}${r.macros && r.macros.proteines ? ` · ${r.macros.proteines} g de protéines` : ''}</div></div></div>`; }).join('')}</div>` : `<button class="btn plein" data-a="renouvelle">${ic('spark', 20)} ${renouvelleEnCours ? 'J’écris tes nouvelles recettes…' : 'Écrire les nouveautés de la semaine'}</button>`}
      <div class="titre">Mes recettes <span>${recettes.length || ''}</span></div>
      ${recettes.length ? `<div class="grille">${recettes.slice(0, 12).map(r => { const [a, b] = teinte(r.titre); return `<div class="carte" data-rec="${esc(r.id)}" style="background:linear-gradient(160deg,${a},${b})">${ph(r)}${r.note ? `<span style="position:absolute;top:10px;right:12px;font:700 13px system-ui;color:#ffd9a0">${'★'.repeat(r.note)}</span>` : ''}<b>${esc(r.titre)}</b><small>${r.minutes ? `${r.minutes} min` : ''}${r.macros && r.macros.proteines ? ` · ${r.macros.proteines} g de protéines` : ''}</small></div>`; }).join('')}</div>` : '<div class="vide">Les recettes que tu gardes apparaîtront ici.</div>'}
    </div>`;
  }

  /* ---------- une journée du menu : le matin, le midi, la collation, le soir ---------- */
  function vJour() {
    const m = ((data && data.menus) || []).find(x => x.date === jourSel);
    if (!m) { vue = 'accueil'; return vAccueil(); }
    const j = new Date(`${m.date}T12:00:00`), titre = m.date === auj() ? "Aujourd'hui" : j.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
    const det = k => k === 'plat' ? [m.note, m.double ? '×2 : le reste pour le midi de demain' : '', (m.decongeler || []).length ? `sortir ${liste(m.decongeler)} le matin` : ''].filter(Boolean).join(' · ') : k === 'collation' ? m.collation_quand : '';
    return `${tete(titre.charAt(0).toUpperCase() + titre.slice(1), 'La journée', 'back')}<div class="corps"><div class="repas-jour">
      ${REP.map(([k, lab]) => { if (!m[k]) return ''; const [a, b] = teinte(m[k]); return `<div class="hero" data-date="${m.date}" data-cle="${k}" style="min-height:190px;background:linear-gradient(140deg,${a},${b})">${ph(sansReste(m[k]))}<div class="lab">${lab}</div><h2 style="font-size:clamp(22px,4.6vw,30px)">${esc(m[k])}</h2>${det(k) ? `<p>${esc(det(k))}</p>` : ''}<div class="puces"><span class="puce">${ic(estReste(m[k]) ? 'flame' : 'play', 15)} ${estReste(m[k]) ? 'À réchauffer' : 'La recette'}</span></div></div>`; }).join('')}
      ${m.matin ? '' : '<div class="vide">Ce menu ne contient que le dîner. Dis « fais les menus de la semaine » : je prépare aussi le matin, le midi et la collation.</div>'}
    </div></div>`;
  }

  /* ---------- la recette : générée pour lui ---------- */
  async function genere(idee, o = {}) {
    if (!AI.ready()) { await say('Pour la recette, il me faut mon cerveau en ligne.'); return null; }
    let cx = null; try { cx = typeof CUISINE !== 'undefined' && CUISINE._contexte ? await CUISINE._contexte() : null; } catch (e) { cx = null; }
    const p = o.pers || (cx && cx.enfant ? 2 : 2);
    const consigne = `Tu es un chef et un coach nutrition pour une famille sportive (le père fait de la gymnastique et du krav maga, son fils de la gym). ${REGLES} Écris une recette savoureuse, fiable et précise, en français, pour ${p} portion${p > 1 ? 's' : ''}. Les étapes : courtes, claires, à l'impératif, 4 à 10 étapes ; "minutes" seulement quand il faut attendre ou surveiller (cuisson, repos) ; "ingredients" de l'étape : les noms exacts de la liste. Les macros : une estimation honnête PAR PORTION. Réponds UNIQUEMENT en JSON :
{"titre": "…", "resume": "moins de 18 mots, ce qui la rend bonne pour un sportif", "minutes": 25, "portions": ${p}, "tags": ["récupération", "rapide"], "macros": {"kcal": 550, "proteines": 40, "glucides": 55, "lipides": 18}, "ingredients": [{"nom": "pavé de saumon", "qte": 2, "unite": "pièces"}], "etapes": [{"texte": "…", "minutes": 0, "ingredients": ["pavé de saumon"]}], "astuce": "une astuce de chef, courte", "photo": "3 à 5 mots EN ANGLAIS pour chercher une photo du plat servi (ex. roasted salmon sweet potato)"}`;
    const donnees = `La demande : ${idee}.${cx ? `\nIl a : ${(cx.st || []).map(x => x.nom).join(', ') || 'rien de noté'}.\nÀ finir vite : ${(cx.vite || []).join(', ') || 'rien'}.\nPrêt au potager : ${(cx.potager || []).join(', ') || 'rien'}.` : ''}`;
    try { const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: donnees }], { maxTokens: 1400, temperature: 0.6, json: true })); const r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); if (r && r.titre && (r.etapes || []).length) return r; } catch (e) { /* rien */ }
    return null;
  }
  async function cherche(idee, o = {}) {
    await ouvre('charge'); chargeTxt = `Je prépare « ${idee} »…`; vue = 'charge'; dessine();
    const r = await genere(idee, o);
    if (!r) { vue = 'accueil'; dessine(); return say("Je n'ai pas réussi à écrire cette recette. Réessaie dans un instant."); }
    montre(r, o.pers, o.retour);
    return say(`${r.titre}. ${r.resume || ''} ${r.minutes ? `${r.minutes} minutes.` : ''} Dis « on cuisine » quand tu es prêt.`);
  }
  function montre(r, p, ret) { rec = Object.assign({ portions: 2 }, r); pers = p || rec.portions || 2; etape = -1; retour = ret || 'accueil'; vue = 'recette'; if (!el) ouvre('recette'); else dessine(); }

  /* ---------- les nouveautés : Atlas renouvelle seul les recettes, chaque semaine ---------- */
  let renouvelleEnCours = false;
  async function renouvelle(force) {
    if (renouvelleEnCours || !AI.ready() || !r0()) return false;
    let c; try { c = await db(); } catch (e) { return false; }
    const nv = c.nouveautes || {};
    if (!force && nv.at && Date.now() / 1000 - nv.at < 6.5 * 86400) return false;
    renouvelleEnCours = true;
    try {
      let cx = null; try { cx = typeof CUISINE !== 'undefined' && CUISINE._contexte ? await CUISINE._contexte() : null; } catch (e) { cx = null; }
      const rc = c.recettes || [], aime = rc.filter(x => (x.note || 0) >= 4).map(x => x.titre).slice(-10), pasAime = rc.filter(x => x.note && x.note <= 2).map(x => x.titre).slice(-10);
      const deja = rc.map(x => x.titre).concat((nv.liste || []).map(x => x.titre), (c.repas || []).map(x => x.plat)).slice(-40);
      const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });
      const consigne = `Tu es un chef créatif et un coach nutrition pour une famille sportive (le père : gymnastique et krav maga ; son fils : gym). ${REGLES} Invente 6 recettes NOUVELLES pour la semaine, toutes différentes de celles qu'il connaît déjà : de saison en ${mois} dans le nord de la France ; 2 de récupération après l'effort, 1 prête en 15 minutes, 1 végétarienne riche en protéines, 1 petit-déjeuner ou collation sportive, 1 à faire avec son fils. Inspire-toi de ce qu'il aime, évite ce qu'il n'aime pas. Pour 2 portions. Chaque recette complète et précise. Réponds UNIQUEMENT en JSON : {"recettes": [{"titre": "…", "resume": "moins de 18 mots", "minutes": 25, "portions": 2, "tags": ["récupération"], "macros": {"kcal": 550, "proteines": 40, "glucides": 55, "lipides": 18}, "ingredients": [{"nom": "…", "qte": 2, "unite": "…"}], "etapes": [{"texte": "…", "minutes": 0, "ingredients": ["…"]}], "astuce": "…", "photo": "3 à 5 mots EN ANGLAIS pour chercher une photo du plat servi"}]}`;
      const donnees = `Il aime : ${aime.join(', ') || 'pas encore de notes'}.\nIl n'aime pas : ${pasAime.join(', ') || 'rien de noté'}.\nDéjà connues (à ne pas refaire) : ${deja.join(', ') || 'aucune'}.\nAu garde-manger : ${cx ? (cx.st || []).map(x => x.nom).join(', ') : 'inconnu'}.\nPrêt au potager : ${cx ? (cx.potager || []).join(', ') || 'rien' : 'inconnu'}.`;
      let r = null; try { const raw = String(await AI.chat([{ role: 'system', content: consigne }, { role: 'user', content: donnees }], { maxTokens: 6000, temperature: 0.85, json: true })); r = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { r = null; }
      const l = ((r && r.recettes) || []).filter(x => x && x.titre && (x.etapes || []).length && (x.ingredients || []).length).slice(0, 6);
      if (!l.length) return false;
      await db({ action: 'nouveautes', liste: l });
      try { data = await db(); } catch (e) { /* rien */ }
      return true;
    } finally { renouvelleEnCours = false; }
  }
  // chaque semaine, tout seul (l'appareil principal, Atlas démarré) ; le vendredi soir, la semaine complète (menus et courses)
  setInterval(() => { if (dlg.started && (typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal()) && S.settings.renouvelleAuto !== false) renouvelle(false).catch(() => {}); }, 6 * 3600000);
  setTimeout(() => { if (dlg.started && (typeof CONSTELLATION === 'undefined' || CONSTELLATION.principal()) && S.settings.renouvelleAuto !== false) renouvelle(false).catch(() => {}); }, 90000);

  /* ---------- les quantités ---------- */
  const facteur = () => pers / (rec.portions || pers || 1);
  function qte(x) {
    if (x.qte == null || x.qte === '' || isNaN(+x.qte)) return x.unite ? String(x.unite) : '';
    let v = +x.qte * facteur(); const u = String(x.unite || '');
    if (/^(g|gr|grammes?|ml|cl)$/i.test(u)) v = v >= 50 ? Math.round(v / 5) * 5 : Math.round(v);
    else { const e = Math.round(v * 4) / 4; const ent = Math.floor(e), fr = e - ent; v = `${ent || ''}${fr === 0.25 ? '¼' : fr === 0.5 ? '½' : fr === 0.75 ? '¾' : ''}` || '¼'; }
    return `${v} ${u}`.trim();
  }
  const aLaMaison = nom => { const n = N(nom).split(' ').filter(w => w.length > 3); return (data && data.stock || []).some(s_ => { const m = N(s_.nom); return n.some(w => m.includes(w.replace(/s$/, ''))); }); };

  /* ---------- la fiche recette ---------- */
  function vRecette() {
    const r = rec, [c1, c2] = teinte(r.titre), m = r.macros || {}, ing = r.ingredients || [];
    const manque = ing.filter(x => !aLaMaison(x.nom));
    return `${tete(r.titre, r.minutes ? `${r.minutes} minutes` : 'Recette', 'back')}<div class="corps">
      <div class="fiche"><div>
        <div class="hero grand" style="background:linear-gradient(140deg,${c1},${c2});cursor:default">${ph(r, true)}<div class="lab">${esc((r.tags || []).slice(0, 3).join(' · ') || 'Fait maison')}</div><h2>${esc(r.titre)}</h2><p>${esc(r.resume || '')}</p>
          <div class="puces">${r.minutes ? `<span class="puce">${ic('clock', 15)} ${r.minutes} min</span>` : ''}<span class="puce">${ic('leaf', 15)} 100 % brut</span></div></div>
        <div class="macros">${[['kcal', m.kcal, 'kcal'], ['protéines', m.proteines, 'g'], ['glucides', m.glucides, 'g'], ['lipides', m.lipides, 'g']].map(([k, v, u]) => `<div class="macro"><b>${v != null ? Math.round(+v * 1) : '–'}<span style="font-size:12px;font-weight:600"> ${u === 'kcal' ? '' : u}</span></b><small>${k}</small></div>`).join('')}</div>
        <div style="font-size:12px;color:#78716c;margin-top:6px">Par portion · une estimation</div>
        <div class="portions"><b>${pers} portion${pers > 1 ? 's' : ''}</b><div style="display:flex;gap:8px"><button class="rond" data-a="moins" aria-label="Moins">${ic('moins')}</button><button class="rond" data-a="plus" aria-label="Plus">${ic('plus')}</button></div></div>
        <div class="titre">Ingrédients <span>${manque.length ? `${manque.length} à acheter` : 'tout est là'}</span></div>
        ${ing.map(x => { const ok = aLaMaison(x.nom); return `<div class="ingr"><span class="${ok ? 'ok' : 'manque'}">${ic(ok ? 'check' : 'cart', 18)}</span><span>${esc(x.nom)}</span><span class="q">${esc(qte(x))}</span></div>`; }).join('')}
        ${manque.length ? `<button class="btn plein" data-a="manque" style="margin-top:12px">${ic('cart', 19)} Ajouter ${manque.length} ingrédient${manque.length > 1 ? 's' : ''} aux courses</button>` : ''}
      </div><div>
        <div class="titre">Les étapes <span>${(r.etapes || []).length}</span></div>
        ${(r.etapes || []).map((e, i) => `<div class="etape-l"><i>${i + 1}</i><span>${esc(e.texte)}${e.minutes ? ` <b style="color:#a7f3d0">· ${e.minutes} min</b>` : ''}</span></div>`).join('')}
        ${r.astuce ? `<div class="astuce">${ic('spark', 16)} ${esc(r.astuce)}</div>` : ''}
      </div></div>
      <div class="bas"><button class="btn" data-a="garde" aria-label="Garder">${ic('heart', 20)}</button><button class="btn chaud plein" data-a="cuisine">${ic('play', 20)} Cuisiner</button></div>
    </div>`;
  }

  /* ---------- le mode cuisson ---------- */
  function vCuisson() {
    const et = rec.etapes || [], e = et[etape] || et[0], ingE = (e.ingredients || []).map(nom => { const x = (rec.ingredients || []).find(y => N(y.nom) === N(nom)) || { nom }; return `${x.nom}${qte(x) ? ` · ${qte(x)}` : ''}`; });
    const q = rec.photo ? ` data-q="${esc(rec.photo)}"` : '';
    return `<img class="fondph" alt="" referrerpolicy="no-referrer" data-ph="${esc(rec.titre)}"${q}><div class="tete"><button class="rond" data-a="retourfiche" aria-label="Retour">${ic('back')}</button><img class="vignette" alt="" referrerpolicy="no-referrer" data-ph="${esc(rec.titre)}"${q}><div style="flex:1"><small>${esc(rec.titre)}</small><h1 style="font-size:18px">Étape ${etape + 1} sur ${et.length}</h1></div><button class="rond" data-a="lecture" aria-label="Lecture à voix haute">${ic(lecture ? 'sound' : 'mute')}</button></div>
      <div class="prog">${et.map((x, i) => `<i class="${i < etape ? 'fait' : i === etape ? 'ici' : ''}"></i>`).join('')}</div>
      <div class="scene" data-a="suivant"><div class="num">Étape ${etape + 1}</div><div class="txt">${esc(e.texte)}</div>
        ${ingE.length ? `<div class="ing">${ingE.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${e.minutes ? `<div style="margin-top:22px"><button class="btn" data-a="minuteur" style="background:rgba(110,231,168,.14);color:#a7f3d0">${ic('timer', 20)} Lancer ${e.minutes} min</button></div>` : ''}
        <div style="margin-top:22px;color:#57534e;font-size:14px">${ic('mic', 15)} Dis « suivant », « répète », « les ingrédients », ou pose ta question. Touche l'écran pour avancer.</div></div>
      <div class="minus" id="cz-minus">${minusHtml()}</div>
      <div class="nav"><button class="btn" data-a="precedent">${ic('back', 20)}</button><button class="btn chaud" data-a="suivant">${etape >= et.length - 1 ? `${ic('check', 20)} Terminé` : `Suivant`}</button></div>`;
  }
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function minusHtml() { const now = Date.now(); return minuteurs.map(m => { const r = Math.max(0, (m.fin - now) / 1000); return `<span class="minu ${r <= 0 ? 'fini' : ''}" data-mn="${m.id}">${ic('timer', 18)} ${esc(m.nom)} · ${r <= 0 ? 'prêt !' : mmss(r)}</span>`; }).join(''); }
  function lanceMinuteur(min, nom) {
    const m = { id: Date.now(), nom: String(nom || 'minuteur').slice(0, 28), fin: Date.now() + min * 60000, dit: false }; minuteurs.push(m);
    setTimeout(() => { if (m.dit) return; m.dit = true; try { fx.tone([[1047, 0.15], [1319, 0.15], [1568, 0.3], [1319, 0.15], [1568, 0.3]]); } catch (e) { /* rien */ } say(`Minuteur ${m.nom} : c'est prêt.`); const z = document.getElementById('cz-minus'); if (z) z.innerHTML = minusHtml(); }, min * 60000);
    if (!horloge) horloge = setInterval(() => { const z = document.getElementById('cz-minus'); if (z) z.innerHTML = minusHtml(); for (let i = minuteurs.length - 1; i >= 0; i--) if (Date.now() - minuteurs[i].fin > 5 * 60000) minuteurs.splice(i, 1); if (!minuteurs.length && !el) { clearInterval(horloge); horloge = 0; } }, 1000);
    const z = document.getElementById('cz-minus'); if (z) z.innerHTML = minusHtml();
    return m;
  }
  async function vaEtape(i) {
    const et = rec.etapes || [];
    if (i >= et.length) { vue = 'fin'; dessine(); lache(); try { await db({ action: 'repas', plat: rec.titre }); } catch (e) { /* rien */ } return say('Et voilà, c\'est prêt ! Bon appétit. Tu peux noter la recette, et je range le garde-manger.'); }
    etape = Math.max(0, i); vue = 'cuisson'; dessine(); garde();
    if (lecture) { try { voice.stop(); } catch (e) { /* rien */ } await say(`Étape ${etape + 1}. ${et[etape].texte}${et[etape].minutes ? ` Dis « minuteur » pour lancer ${et[etape].minutes} minutes.` : ''}`); }
  }

  /* ---------- la fin ---------- */
  let note = 0;
  function vFin() {
    const [c1, c2] = teinte(rec.titre);
    return `${tete('Bon appétit !', rec.titre)}<div class="corps" style="text-align:center">
      <div class="hero grand" style="background:linear-gradient(140deg,${c1},${c2});cursor:default;text-align:left">${ph(rec, true)}<div class="lab">C'est prêt</div><h2>${esc(rec.titre)}</h2><p>${esc(rec.resume || '')}</p></div>
      <div class="titre" style="justify-content:center">Tu as aimé ?</div>
      <div class="etoiles">${[1, 2, 3, 4, 5].map(k => `<button data-note="${k}" class="${k <= note ? 'on' : ''}" aria-label="${k} étoile${k > 1 ? 's' : ''}">${ic('star', 40)}</button>`).join('')}</div>
      <div style="display:grid;gap:10px;max-width:460px;margin:0 auto"><button class="btn chaud plein" data-a="gardefin">${ic('heart', 20)} Garder dans mes recettes</button><button class="btn plein" data-a="range">${ic('box', 20)} Retirer du garde-manger ce que j'ai utilisé</button><button class="btn plein" data-a="ferme">Fermer</button></div>
    </div>`;
  }
  async function gardeRecette(n) {
    const r = Object.assign({}, rec, { note: n || rec.note || 0 }); delete r.at;
    try { const x = await db({ action: 'recette_garde', recette: r }); if (x.id) rec.id = x.id; data = await db(); } catch (e) { return say("Je n'ai pas réussi à la garder."); }
    fx.ok(); return say('Gardée dans tes recettes.');
  }

  /* ---------- les gestes ---------- */
  function branche() {
    if (!el) return;
    el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); action(b.dataset.a); }));
    el.querySelectorAll('[data-idee]').forEach(b => b.addEventListener('click', () => cherche(b.dataset.idee)));
    el.querySelectorAll('[data-plat]').forEach(b => b.addEventListener('click', () => cherche(b.dataset.plat)));
    el.querySelectorAll('[data-jour]').forEach(b => b.addEventListener('click', () => { jourSel = b.dataset.jour; vue = 'jour'; dessine(); }));
    el.querySelectorAll('[data-cle]').forEach(b => b.addEventListener('click', async () => { const m = (data.menus || []).find(x => x.date === b.dataset.date); const k = b.dataset.cle; if (!m || !m[k]) return; if (estReste(m[k])) return say(`${m[k]} : le reste du dîner de la veille. Réchauffe-le doucement, à la poêle ou au four, et ajoute des crudités ou un fruit.`); cherche(m[k], { pers: k === 'plat' && m.double ? 4 : 2, retour: vue === 'jour' ? 'jour' : 'accueil' }); }));
    el.querySelectorAll('[data-nouv]').forEach(b => b.addEventListener('click', () => { const r = ((data.nouveautes || {}).liste || [])[+b.dataset.nouv]; if (r) montre(r); }));
    el.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => { const r = (data.recettes || []).find(x => x.id === b.dataset.rec); if (r) montre(r); }));
    el.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', async () => { note = +b.dataset.note; dessine(); if (rec.id) { try { await db({ action: 'recette_note', id: rec.id, note, faite: true }); } catch (e) { /* rien */ } } }));
    const q = el.querySelector('#cz-q'); if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter' && q.value.trim()) cherche(q.value.trim()); });
  }
  async function action(a) {
    const et = rec && rec.etapes || [];
    if (a === 'ferme') return ferme();
    if (a === 'retour' && vue === 'recette' && retour === 'jour') { vue = 'jour'; return dessine(); }
    if (a === 'retour') { vue = 'accueil'; dessine(); try { data = await db(); dessine(); } catch (e) { /* rien */ } return; }
    if (a === 'retourfiche') { vue = 'recette'; lache(); return dessine(); }
    if (a === 'soir') { const m = (data.menus || []).find(x => x.date === auj()); const k = m && m[heroCle] ? heroCle : 'plat'; return m ? cherche(m[k], { pers: k === 'plat' && m.double ? 4 : 2 }) : null; }
    if (a === 'idee') { ferme(); return handle("qu'est-ce qu'on mange ce soir"); }
    if (a === 'cherche') { const q = el.querySelector('#cz-q'); return q && q.value.trim() ? cherche(q.value.trim()) : q && q.focus(); }
    if (a === 'semaine') { ferme(); return handle('prépare ma semaine'); }
    if (a === 'batch') { ferme(); return handle('on lance le batch cooking'); }
    if (a === 'courses') { ferme(); return handle('mode magasin'); }
    if (a === 'frigo') { ferme(); return handle("qu'est-ce qu'il y a dans le frigo"); }
    if (a === 'plus') { pers = Math.min(12, pers + 1); return dessine(); }
    if (a === 'moins') { pers = Math.max(1, pers - 1); return dessine(); }
    if (a === 'manque') { const l = (rec.ingredients || []).filter(x => !aLaMaison(x.nom)).map(x => `${x.nom}${qte(x) ? ` (${qte(x)})` : ''}`); const deja = (S.listes || []).filter(y => y.liste === 'courses').map(y => N(y.text)); const neufs = l.filter(i => !deja.includes(N(i))); S.listes = (S.listes || []).concat(neufs.map((t, i) => ({ id: Date.now() + i, liste: 'courses', text: t, at: Date.now() }))); save(); fx.ok(); return say(neufs.length ? `Ajouté aux courses : ${liste(neufs.map(x => x.replace(/\s*\(.*\)$/, '')))}.` : "C'était déjà sur ta liste."); }
    if (a === 'garde') return gardeRecette();
    if (a === 'renouvelle') { renouvelle(true).then(() => { if (el && vue === 'accueil') dessine(); }); return dessine(); }
    if (a === 'cuisine') return vaEtape(0);
    if (a === 'suivant') return vaEtape(etape + 1);
    if (a === 'precedent') return vaEtape(Math.max(0, etape - 1));
    if (a === 'lecture') { lecture = !lecture; if (!lecture) { try { voice.stop(); } catch (e) { /* rien */ } } return dessine(); }
    if (a === 'minuteur') { const e = et[etape]; if (e && e.minutes) { lanceMinuteur(e.minutes, `étape ${etape + 1}`); return say(`Minuteur de ${e.minutes} minutes lancé.`); } return; }
    if (a === 'gardefin') return gardeRecette(note);
    if (a === 'range') { if (typeof CUISINE === 'undefined') return; let c; try { c = await db(); } catch (e) { return; } const ing = (rec.ingredients || []).map(x => N(x.nom)); const servis = (c.stock || []).filter(s_ => ing.some(i => i.includes(N(s_.nom)) || N(s_.nom).split(' ').some(w => w.length > 3 && i.includes(w)))).map(s_ => s_.nom); if (!servis.length) return say("Je n'ai rien trouvé à retirer dans le garde-manger."); try { await db({ action: 'retire', noms: servis }); } catch (e) { return; } fx.ok(); return say(`C'est retiré : ${liste(servis)}.`); }
  }

  /* ---------- la voix ---------- */
  // en cuisson, ces mots marchent sans dire « Atlas » (les mains sont prises)
  const DIRECT = /^(suivant|suivante|etape suivante|ensuite|apres|c est fait|fait|ok suivant|precedent|precedente|retour|repete|redis|repete l etape|les ingredients|ingredients|minuteur|lance le minuteur|on continue|continue|termine|c est termine|fin de la recette)\b/;
  function direct(n) { return !!(el && vue === 'cuisson' && DIRECT.test(n)); }
  function route(t, n) {
    if (el && vue === 'cuisson') {
      if (/^(suivant|suivante|etape suivante|ensuite|apres|c est fait|fait|ok suivant|on continue|continue)\b/.test(n)) return () => vaEtape(etape + 1);
      if (/^(precedent|precedente|retour)\b/.test(n)) return () => vaEtape(Math.max(0, etape - 1));
      if (/^(repete|redis)\b/.test(n)) return () => say((rec.etapes[etape] || {}).texte || '');
      if (/\bingredients?\b/.test(n)) return () => say(liste((rec.ingredients || []).map(x => `${qte(x) ? `${qte(x)} de ` : ''}${x.nom}`.replace(/de ([aeiouyéèh])/i, "d'$1"))));
      if (/\b(minuteur|chrono)\b/.test(n)) { const m = n.match(/\b(\d{1,3}) ?(min|minutes?)\b/); return () => { const mn = m ? +m[1] : ((rec.etapes[etape] || {}).minutes || 0); if (!mn) return say('Combien de minutes ? Dis par exemple : minuteur 10 minutes.'); lanceMinuteur(mn, m ? `${mn} min` : `étape ${etape + 1}`); return say(`Minuteur de ${mn} minutes lancé.`); }; }
      if (/^(termine|c est termine|fin de la recette)\b/.test(n)) return () => vaEtape((rec.etapes || []).length);
      if (n.split(' ').length >= 3) return async () => { face.set('think'); let rep = ''; try { rep = String(await AI.chat([{ role: 'system', content: `Tu es un chef qui aide en direct pendant la recette « ${rec.titre} » (ingrédients : ${(rec.ingredients || []).map(x => x.nom).join(', ')}). Étape en cours : ${(rec.etapes[etape] || {}).texte}. Réponds en une ou deux phrases courtes, à l'oral, concrètes ; ingrédients bruts seulement. Pas d'émojis.` }, { role: 'user', content: t }], { maxTokens: 160, temperature: 0.4 })); } catch (e) { rep = ''; } face.set('idle'); return say(rep ? rep.replace(/[*#_]/g, '').trim() : "Je n'ai pas de réponse sûre."); };
    }
    if (el && vue === 'recette') {
      if (/^(on cuisine|on y va|c est parti|on commence|lance|go|cuisiner)\b/.test(n)) return () => vaEtape(0);
      const p = n.match(/\bpour (\d{1,2})\b/); if (p) return () => { pers = Math.max(1, Math.min(12, +p[1])); dessine(); return say(`Pour ${pers}.`); };
      if (/\b(garde|enregistre|sauvegarde)\b/.test(n)) return () => gardeRecette();
    }
    if (/\b(ouvre|lance|affiche|montre)\b.*\b(la cuisine|l appli cuisine|mes recettes|le mode cuisine)\b|^(mode cuisine|la cuisine|mes recettes|appli cuisine)$/.test(n)) return () => ouvre('accueil');
    if (/\b(renouvelle|nouvelles|de nouvelles|change)\b.*\brecettes\b|\b(nouveautes|nouvelles idees) (de la semaine|cuisine|de recettes)\b/.test(n)) return async () => { await say("J'écris six nouvelles recettes pour toi. Ça prend une minute."); const ok = await renouvelle(true); if (!ok) return say("Je n'ai pas réussi à les écrire pour le moment."); await ouvre('accueil'); return say('Voilà tes nouveautés de la semaine, sur l’accueil de la cuisine.'); };
    if (/\b(arrete|ne)\b.*\b(renouveler|renouvelle)\b.*\brecettes\b/.test(n)) return () => { S.settings.renouvelleAuto = false; save(); return say("D'accord, je ne renouvelle plus les recettes tout seul."); };
    // une recette : « une recette de saumon », « on fait des crêpes pour 4 », « comment on fait un dahl » → la fiche, à l'écran
    const pm = n.match(/\bpour (\d{1,2})\b/), pp = pm ? +pm[1] : 0;
    if (/\b(une recette|la recette|recette)\s+(de|du|des|d|avec|au|aux)\b|\b(on fait|on va faire|je fais|je vais faire|apprends moi a faire|comment (on )?fai(t|s) (on )?(des|du|de la|un|une))\b/.test(n) && !/\b(menus?|semaine|courses|batch)\b/.test(n)) {
      const plat = String(t).replace(/^.*?\b(?:une recette|la recette|recette)\s+(?:de |du |des |d['’]|avec |au |aux )?/i, '').replace(/^.*?\b(?:on fait|on va faire|je fais|je vais faire|apprends-moi à faire|comment (?:on )?fai[st]-?(?:on)?)\s*/i, '').replace(/\s*pour\s+\S+(\s+personnes?)?\s*[.!?]*$/i, '').replace(/[.!?]+$/, '').trim();
      if (plat.length >= 3) return () => cherche(plat, { pers: pp || 0 });
    }
    return null;
  }
  return { route, direct, ouvre, ferme, cherche, montre, renouvelle, actif: () => !!el };
})();

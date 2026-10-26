/* ---------- le jumelage des clés : plus besoin de retaper ses clés sur un nouvel appareil ----------
   L'ordinateur confie ses clés (Mistral, Groq, ElevenLabs) à la maison. Un appareil sans clé (l'iPhone…) les demande ;
   l'ordinateur demande « ton téléphone demande tes clés, je les lui donne ? » ; après ton oui, il les reçoit tout seul.
   Rien n'est donné sans ce oui. Seule l'adresse de la maison se tape une fois sur chaque appareil. */
const JUMELAGE = (() => {
  const CLES = ['mistralKey', 'key', 'elevenKey', 'elevenVoice']; // (la voix d'Atlas voyage avec les clés : la même partout)
  const NOMS = { telephone: 'ton téléphone', tablette: 'ta tablette', ordinateur: "l'ordinateur" };
  let ident = ''; try { ident = localStorage.getItem('atlas-jumelage-id') || ''; if (!ident) { ident = Math.random().toString(36).slice(2, 12); localStorage.setItem('atlas-jumelage-id', ident); } } catch (e) { ident = 'x' + Date.now(); }
  const role = () => (typeof CONSTELLATION !== 'undefined' && CONSTELLATION.role) || '';
  async function api(corps) {
    const r = await fetch(`${VOIXMAISON.root()}/maison/jumelage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ id: ident, role: role() }, corps)) });
    return r.json();
  }
  const manque = () => (!S.settings.key && !S.settings.mistralKey) || !S.settings.elevenKey || !S.settings.elevenVoice;
  let attente = null;
  async function tour() {
    if (!VOIXMAISON.root() || window.__BANC) return;
    const s = S.settings, miennes = {}; CLES.forEach(k => { if (s[k]) miennes[k] = s[k]; });
    if (Object.keys(miennes).length) { try { await api({ action: 'depose', cles: miennes }); } catch (e) { /* plus tard */ } }
    if (manque()) {
      let r; try { r = await api({ action: 'demande' }); } catch (e) { return; }
      if (r.confiance && r.cles) {
        let n = 0; CLES.forEach(k => { if (!s[k] && r.cles[k]) { s[k] = r.cles[k]; n++; } });
        if (n) { save(); if (attente) { clearInterval(attente); attente = null; hideBoard(); } fx.ok(); say(r.cles.elevenVoice && n === 1 ? "J'ai retrouvé ma voix." : "J'ai reçu tes clés depuis la maison : je suis au complet."); }
      } else if (!attente) {
        showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,440px);padding:12px 4px"><div style="font-size:40px">🔑</div><b style="font-size:20px;color:#fde68a">J'ai demandé tes clés à l'ordinateur</b><div style="color:#cbd5e1;font-size:15px;margin-top:8px">Sur l'ordinateur, Atlas va te demander « je les lui donne ? » : dis oui (ou touche le bouton).</div></div>`);
        attente = setInterval(tour, 10000); setTimeout(() => { if (attente) { clearInterval(attente); attente = null; } }, 15 * 60000);
      }
    }
  }
  // un appareil de confiance (l'ordinateur) : les demandes, à valider — même s'il n'est pas l'appareil principal (c'est une question de sécurité)
  const dejaDit = new Set();
  async function veille() {
    if (!VOIXMAISON.root() || window.__BANC || manque()) return;
    let r; try { r = await api({ action: 'attente' }); } catch (e) { return; }
    for (const x of (r.demandes || [])) {
      if (dejaDit.has(x.id) || voice.occupe() || dlg.busy) continue;
      dejaDit.add(x.id);
      const qui = NOMS[x.role] || 'un nouvel appareil';
      showBoard(`<div style="text-align:center;font-family:system-ui;min-width:min(86vw,460px);padding:12px 4px"><div style="font-size:40px">🔑</div><b style="font-size:20px;color:#fde68a">${esc(qui.charAt(0).toUpperCase() + qui.slice(1))} demande tes clés</b><div style="color:#cbd5e1;font-size:15px;margin:8px 0 12px">Mistral, Groq et ElevenLabs, pour qu'il marche comme ici. Seulement si c'est bien ton appareil.</div><button type="button" id="jum-oui" style="padding:14px 22px;border:0;border-radius:14px;background:#16a34a;color:#fff;font:800 17px system-ui;cursor:pointer">✔ Je les lui donne</button> <button type="button" id="jum-non" style="padding:14px 18px;border:0;border-radius:14px;background:rgba(255,255,255,.12);color:#e2e8f0;font:700 16px system-ui;cursor:pointer">Non</button></div>`);
      let clic = null; const bouton = new Promise(res => { clic = res; });
      setTimeout(() => { const o = document.getElementById('jum-oui'), n = document.getElementById('jum-non'); if (o) o.onclick = () => { try { voice.stop(); } catch (e) { /* rien */ } clic('oui'); }; if (n) n.onclick = () => { try { voice.stop(); } catch (e) { /* rien */ } clic('non'); }; }, 60);
      const a = await Promise.race([bouton, ask(`${qui.charAt(0).toUpperCase() + qui.slice(1)} demande tes clés, pour marcher comme ici. Je les lui donne ?`, { wait: 30000 })]);
      const ok = a === 'oui' || (a !== 'non' && isYes(a));
      try { await api({ action: ok ? 'autorise' : 'refuse', cible: x.id }); } catch (e) { /* rien */ }
      if (!ok) setTimeout(() => dejaDit.delete(x.id), 2 * 60000); // un « non » par erreur : il redemandera dans deux minutes
      hideBoard();
      await say(ok ? `C'est fait : ${qui} reçoit tes clés dans quelques secondes.` : "D'accord, je ne lui donne rien.");
    }
  }
  setTimeout(tour, 7000); setInterval(veille, 15000);
  return { tour };
})();

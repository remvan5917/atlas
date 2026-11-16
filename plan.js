/* ---------- le plan du jour (7 h 30) : 5 à 7 actions, tout préparé — un « oui » par action ----------
   Chaque matin, la maison range le bureau, prépare tout ce qui peut l'être et écrit le plan (maison/plan-du-jour.json).
   « mon plan du jour » : Atlas le montre (un bouton par action) et le lit, action après action : « oui » fait la vraie chose
   (le mail préparé part, la décision est enregistrée, c'est marqué fait), « plus tard » le reporte à demain. Rien ne part sans son oui. */
const PLAN = (() => {
  const root = () => VOIXMAISON.root();
  async function api(corps) {
    const r = await fetch(`${root()}/maison/plan`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  const EM = { envoyer: '✉️', valider: '✅', decider: '🗳️', toi: '👤', lire: '📄' };
  const ETAT = { fait: '✓ fait', plus_tard: '→ demain', non: '✕ non' };
  let plan = null;
  function dessine() {
    const p = plan, l = p.actions || [], reste = l.filter(a => a.etat === 'a_faire');
    const bt = (txt, rep, id, fond) => `<button type="button" data-plan="${rep}" data-id="${esc(id)}" style="padding:9px 13px;margin:6px 6px 0 0;border:0;border-radius:10px;background:${fond};color:#fff;font:600 14px system-ui">${txt}</button>`;
    const ligne = a => {
      const fini = a.etat !== 'a_faire';
      let corps = a.pourquoi ? `<div style="color:#94a3b8;font-size:14px;margin-top:3px">${esc(a.pourquoi)}</div>` : '';
      if (a.type === 'envoyer' && a.apercu) corps += `<details style="margin-top:6px"><summary style="color:#93c5fd;font-size:13.5px;cursor:pointer">Voir le mail (à ${esc(a.apercu.a)})</summary><div style="white-space:pre-wrap;font-size:13.5px;color:#e2e8f0;background:rgba(255,255,255,.05);border-radius:8px;padding:8px;margin-top:4px">${esc(a.apercu.texte)}</div></details>`;
      if (a.etapes && a.etapes.length) corps += `<ol style="margin:6px 0 0;padding-left:20px;font-size:14px;color:#e2e8f0">${a.etapes.map(e => `<li>${esc(e)}</li>`).join('')}</ol>`;
      let boutons = '';
      if (!fini) {
        if (a.type === 'decider') boutons = (a.options || []).map((o, k) => bt(`${k === 0 ? '★ ' : ''}${esc(String(o).slice(0, 60))}`, `choix:${k}`, a.id, k === 0 ? '#6d28d9' : 'rgba(255,255,255,.1)')).join('');
        else boutons = bt(a.type === 'envoyer' ? '✉ Oui, envoie' : a.type === 'toi' ? "✓ C'est fait" : '✓ Oui', 'oui', a.id, '#2563eb');
        boutons += bt('→ Plus tard', 'plus_tard', a.id, 'rgba(255,255,255,.1)');
      }
      return `<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08);opacity:${fini ? 0.5 : 1}">
        <div style="display:flex;justify-content:space-between;gap:10px;font-size:16.5px;font-weight:600;color:#f8fafc"><span>${EM[a.type] || '•'} ${esc(a.titre || '')}</span><span style="color:#94a3b8;font-weight:500;font-size:13px;white-space:nowrap">${fini ? ETAT[a.etat] || '' : a.minutes ? `${a.minutes} min` : ''}</span></div>${corps}<div>${boutons}</div></div>`;
    };
    const menage = (p.menage || []).length ? `<details style="margin-top:10px"><summary style="color:#a5b4fc;font-size:14px;cursor:pointer">🧹 Rangé pour toi : ${p.menage.length}</summary><ul style="font-size:13.5px;color:#cbd5e1;padding-left:20px">${p.menage.map(m => `<li>${esc(typeof m === 'string' ? m : m.texte || '')}</li>`).join('')}</ul></details>` : '';
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(92vw,680px);max-width:760px">
      <small style="letter-spacing:.3em;color:#fcd34d">☀️ ${esc((p.titre || 'TON PLAN DU JOUR').toUpperCase())} · ${p.minutes || '?'} MIN</small>
      ${p.mot ? `<div style="font-size:17px;margin:8px 0 4px;color:#f1f5f9">${esc(p.mot)}</div>` : ''}
      <div style="font-size:13px;color:#94a3b8">${reste.length ? `${reste.length} action${reste.length > 1 ? 's' : ''} à faire` : 'Tout est fait pour aujourd’hui. Va trader tranquille.'}</div>
      ${l.map(ligne).join('')}${menage}</div>`, 'planning-large');
    document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => repond(b.dataset.id, b.dataset.plan));
  }
  async function repond(id, rep, parle = false) {
    const a = (plan.actions || []).find(x => x.id === id); if (!a) return;
    const corps = { action: 'repond', id };
    if (rep.startsWith('choix:')) { corps.reponse = 'oui'; corps.choix = (a.options || [])[+rep.split(':')[1]]; } else corps.reponse = rep;
    let r; try { r = await api(corps); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!r.ok) return say(r.raison ? `Ça n'a pas marché : ${r.raison}.` : "Ça n'a pas marché.");
    plan = r.plan; dessine(); fx.ok();
    if (!parle) { if (r.fait) say(r.fait === 'envoyé' ? 'Envoyé.' : r.fait === 'fait' ? 'Noté.' : `C'est noté : ${r.fait}.`); else if (rep === 'plus_tard') say('Reporté à demain.'); }
    return r;
  }
  async function montre(lire = true) {
    try { const r = await api(); plan = r.plan; } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!plan || !plan.actions) return say("Ton plan du jour n'est pas encore prêt : il arrive vers 7 h 30.");
    const auj = new Date(), iso = `${auj.getFullYear()}-${String(auj.getMonth() + 1).padStart(2, '0')}-${String(auj.getDate()).padStart(2, '0')}`;
    dessine();
    const reste = plan.actions.filter(a => a.etat === 'a_faire');
    if (plan.date !== iso) return say("C'est le plan d'hier : celui d'aujourd'hui n'est pas encore prêt.");
    if (!reste.length) return say("Tout est fait pour aujourd'hui. Va trader tranquille.");
    if (!lire) return '';
    await say(`${plan.mot ? plan.mot + ' ' : ''}${reste.length} action${reste.length > 1 ? 's' : ''}, environ ${reste.reduce((s, a) => s + (+a.minutes || 0), 0)} minutes. On y va.`);
    for (const a of reste) { // une par une, à la voix : « oui », « plus tard », ou le choix
      if (dlg.interrupt) break;
      if (a.type === 'decider') {
        const rep = await ask(`${a.titre}. Je te recommande : ${(a.options || [])[0] || 'le premier choix'}. Tu valides ?`, { wait: 20000 });
        const n = N(rep || '');
        if (/\b(oui|ok|d accord|valide|vas y|go)\b/.test(n)) await repond(a.id, 'choix:0', true);
        else if (/\b(plus tard|demain|attends)\b/.test(n)) await repond(a.id, 'plus_tard', true);
        else { await say("Je la laisse à l'écran : touche le choix que tu veux."); continue; }
      } else {
        const q = a.type === 'envoyer' ? `${a.titre}. Le mail est prêt${a.apercu ? `, pour ${String(a.apercu.a).split('@')[0]}` : ''}. Je l'envoie ?` : a.type === 'toi' ? `${a.titre}. ${(a.etapes || []).slice(0, 2).join('. ')}. Dis « c'est fait » quand c'est fait, ou « plus tard ».` : `${a.titre}. ${a.pourquoi || ''} Je le marque comme fait ?`;
        const rep = await ask(q, { wait: a.type === 'toi' ? 30000 : 20000 });
        const n = N(rep || '');
        if (/\b(oui|ok|d accord|vas y|envoie|c est fait|fait|valide|go)\b/.test(n)) await repond(a.id, 'oui', true);
        else if (/\b(plus tard|demain|attends|pas maintenant)\b/.test(n)) await repond(a.id, 'plus_tard', true);
        else if (/\b(non|pas ca|annule)\b/.test(n)) await repond(a.id, 'non', true);
        else { await say("Je le laisse à l'écran."); continue; }
      }
    }
    const fin = plan.actions.filter(a => a.etat === 'a_faire').length;
    return say(fin ? `Il en reste ${fin} à l'écran.` : "C'est tout pour aujourd'hui. Va trader tranquille.");
  }
  function route(t, n) {
    if (/\b(mon plan du jour|mon plan de la journee|le plan du jour|qu est ce que je dois faire aujourd hui|ma journee de travail|mes actions du jour|on fait mon plan du jour)\b/.test(n)) return () => montre(true);
    if (/\b(montre|affiche)\b.*\bplan du jour\b/.test(n)) return () => montre(false);
    return null;
  }
  return { route, montre };
})();

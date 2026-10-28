/* ---------- le téléphone d'Atlas : il appelle à ta place (avec SA voix), il prépare tes WhatsApp et tes SMS ----------
   - « appelle le dentiste pour prendre rendez-vous mardi après-midi » : il trouve le numéro (ton carnet, sinon les signatures
     de tes mails), te dit qui il appelle et pourquoi, et après ton oui, la voix d'Atlas appelle (elle se présente comme ton
     assistant IA), avec tes disponibilités de la semaine ; le compte rendu arrive à la fin de l'appel.
   - « le numéro du dentiste c'est 03 20 … » : dans ton carnet.
   - « envoie un WhatsApp à Paul : j'arrive dans 10 minutes » : WhatsApp s'ouvre, contact et texte prêts ; tu touches Envoyer.
   - « envoie un SMS à … » : depuis le numéro d'Atlas après ton oui (s'il est relié) ; sinon, sur ton iPhone, Messages s'ouvre prêt.
   Jamais d'appel ni de SMS sans ton oui pour celui-là ; pas d'appel la nuit. */
const TELEPHONE = (() => {
  const root = () => VOIXMAISON.root();
  async function api(corps) {
    const r = await fetch(`${root()}/maison/telephone`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  async function carnet(corps) {
    const r = await fetch(`${root()}/maison/carnet/contacts`, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : { cache: 'no-store' });
    return r.json();
  }
  const lisible = n => String(n || '').replace(/^\+33/, '0').replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  // les nombres dits en lettres (« zéro six douze trente-quatre… ») → des chiffres
  const U = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16 };
  const D = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  function enChiffres(t) {
    const m = N(t).replace(/-/g, ' ').split(' ').filter(Boolean), out = [];
    const unite = w => (U[w] != null && U[w] <= 9 ? U[w] : null), ado = w => (U[w] != null && U[w] >= 10 ? U[w] : null);
    // « dix » suivi d'une unité (dix-sept…), un nombre de 11 à 16, ou une unité seule
    const finDe = (k) => { if (m[k] === 'dix') { const u = unite(m[k + 1]); return u != null ? [10 + u, 2] : [10, 1]; } if (ado(m[k]) != null) return [ado(m[k]), 1]; if (unite(m[k]) != null) return [unite(m[k]), 1]; return [0, 0]; };
    for (let i = 0; i < m.length;) {
      let v = null, n = 0;
      if (m[i] === 'quatre' && /^vingts?$/.test(m[i + 1] || '')) { const [f, k] = finDe(i + 2); v = 80 + f; n = 2 + k; }
      else if (D[m[i]] != null) {
        const b = D[m[i]]; let k = i + 1; if (m[k] === 'et') k++;
        if (b === 60) { const [f, c] = finDe(k); v = 60 + f; n = k - i + c; } else { const u = unite(m[k]); v = b + (u || 0); n = k - i + (u != null ? 1 : 0); }
      } else if (m[i] === 'dix' || ado(m[i]) != null) { const [f, c] = finDe(i); v = f; n = c; }
      else if (unite(m[i]) != null) { v = unite(m[i]); n = 1; out.push(String(v)); i += 1; continue; }
      if (v != null) { out.push(String(v).padStart(2, '0')); i += n; continue; }
      out.push(m[i]); i++;
    }
    return out.join(' ').replace(/\b0 ([1-9])\b/g, '0$1'); // « zéro six » → 06
  }
  const numeroDe = t => { const x = /\d{2}/.test(t) ? String(t) : enChiffres(t); const m = x.replace(/(\d)[\s.-](?=\d)/g, '$1').match(/(\+?\d{10,13})/); return m ? m[1] : null; };
  const estIphone = () => /iPhone|iPad/.test(navigator.userAgent);
  // la voix d'Atlas, confiée une fois à l'ordinateur de la maison (pour l'agent d'appel)
  setTimeout(async () => {
    const s = S.settings; if (!s.elevenKey || !s.elevenVoice || !root()) return;
    let st; try { st = await api(); } catch (e) { return; }
    if (st.cle && st.agent && S.telVoix === s.elevenVoice) return;
    try { await api({ action: 'cle', key: s.elevenKey, voice: s.elevenVoice }); S.telVoix = s.elevenVoice; save(); } catch (e) { /* plus tard */ }
  }, 9000);

  async function trouveNumero(qui) {
    try { const r = await api({ action: 'numero', qui }); if (r.numero) return r; } catch (e) { /* plus bas */ }
    const a = await ask(`Je n'ai pas le numéro de ${qui}. Tu me le dis ?`, { wait: 25000 });
    const n = numeroDe(a || '');
    if (!n) return null;
    try { await carnet({ action: 'ajoute', item: { nom: qui, tel: n } }); } catch (e) { /* tant pis */ }
    return { numero: n, nom: qui, source: 'dit' };
  }
  async function disponibilites() {
    try {
      const ag = await (await fetch(`${root()}/maison/agenda?jours=8`, { cache: 'no-store' })).json();
      const l = (ag.evenements || []).filter(e => !e.journee).slice(0, 25).map(e => { const d = new Date(e.debut * 1000), f = new Date(e.fin * 1000); return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })} de ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')} à ${f.getHours()} h ${String(f.getMinutes()).padStart(2, '0')}`; });
      return l.length ? `Rémy est déjà pris : ${l.join(' ; ')}. Propose seulement des créneaux libres, en journée.` : '';
    } catch (e) { return ''; }
  }
  async function appelle(qui, mission) {
    let st; try { st = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    if (!st.pret) return say(st.cle ? "Les appels ne sont pas encore reliés à un numéro de téléphone. Dis « comment relier les appels » : je t'explique, c'est une fois pour toutes." : "Il faut d'abord la voix d'Atlas : règle ElevenLabs dans mes réglages, sur l'ordinateur. Ensuite, dis « comment relier les appels ».");
    const n = await trouveNumero(qui); if (!n) return say("D'accord, sans numéro je ne peux pas appeler.");
    const ok = await askYesNo(`J'appelle ${n.nom || qui}, au ${lisible(n.numero)}, avec ma voix, en me présentant comme ton robot personnel, pour : ${mission}. J'appelle ?`);
    if (!ok) return say("D'accord, je n'appelle pas.");
    patiente(`J'appelle ${n.nom || qui}…`, mission.slice(0, 90));
    const r = await api({ action: 'appelle', a: n.numero, qui: n.nom || qui, mission, contexte: await disponibilites() });
    hideBoard();
    if (!r.ok) return say(`L'appel n'est pas parti : ${r.raison}.`);
    fx.ok(); return say(`C'est parti : j'appelle ${n.nom || qui}. Je te fais le compte rendu dès que c'est fini.`);
  }
  async function whatsapp(qui, texte) {
    const n = await trouveNumero(qui); if (!n) return say("D'accord, sans numéro je ne peux pas le préparer.");
    const url = `https://wa.me/${n.numero.replace(/^\+/, '').replace(/^0/, '33')}?text=${encodeURIComponent(texte)}`;
    try { window.open(url, '_blank'); } catch (e) { location.href = url; }
    return say(`WhatsApp est ouvert, avec ${n.nom || qui} et ton message prêts : touche Envoyer.`);
  }
  async function sms(qui, texte) {
    const n = await trouveNumero(qui); if (!n) return say("D'accord, sans numéro je ne peux pas l'envoyer.");
    let st = {}; try { st = await api(); } catch (e) { /* sans */ }
    if (st.sms && await askYesNo(`J'envoie à ${n.nom || qui}, au ${lisible(n.numero)}, depuis le numéro d'Atlas : « ${texte} ». Je l'envoie ?`)) {
      const r = await api({ action: 'sms', a: n.numero, texte });
      return say(r.ok ? 'Le SMS est parti.' : `Le SMS n'est pas parti : ${r.raison}.`);
    }
    if (estIphone()) { location.href = `sms:${n.numero}&body=${encodeURIComponent(texte)}`; return say('Messages est ouvert, tout est prêt : touche Envoyer.'); }
    return say(`Ton SMS pour ${n.nom || qui} est prêt, mais un ordinateur ne peut pas l'envoyer depuis ton numéro. Demande-le-moi sur ton iPhone, ou dis « envoie-lui un WhatsApp ».`);
  }
  async function groupe(nom, texte) {
    if (!texte) { texte = String(await ask(`Qu'est-ce que j'écris dans le groupe ${nom} ?`, { wait: 30000 }) || '').trim(); if (!texte || /^(rien|laisse tomber|annule|non)\b/i.test(texte)) return say("D'accord, je n'envoie rien."); }
    const url = `https://wa.me/?text=${encodeURIComponent(texte)}`; // WhatsApp ne permet pas d'ouvrir un groupe directement : il s'ouvre avec le message, tu choisis le groupe
    try { window.open(url, '_blank'); } catch (e) { location.href = url; }
    return say(`WhatsApp est ouvert avec ton message : choisis le groupe ${nom}, puis touche Envoyer.`);
  }
  async function relier() {
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,700px);font-size:15px;line-height:1.55"><small style="letter-spacing:.3em;color:#fcd34d">RELIER LES APPELS D'ATLAS · UNE FOIS POUR TOUTES</small>
<ol style="margin-top:10px;padding-left:20px"><li>Crée un compte sur <b>twilio.com</b>.</li><li>Achète un <b>numéro français</b> (Phone Numbers → Buy a number → France ; Twilio te demandera une pièce d'identité et une adresse, c'est la loi française). Environ 1 € par mois, et quelques centimes par minute d'appel.</li><li>Dans la page d'accueil de Twilio, note ton <b>Account SID</b> (commence par AC) et ton <b>Auth Token</b>.</li><li>Sur l'ordinateur, lance <code>~/.local/share/shadow/maison/appels-connecter.sh</code> et colle-les avec ton numéro.</li></ol>
<p style="color:#94a3b8">Ensuite : « appelle … pour … » — la voix d'Atlas appelle, se présente comme ton robot personnel (une IA), et je te fais le compte rendu. Le même numéro envoie aussi tes SMS automatiques.</p></div>`);
    return say("Les étapes sont à l'écran : un compte Twilio, un numéro français, puis un petit script sur l'ordinateur. Après, j'appelle pour toi, avec ma voix.");
  }
  async function mesAppels() {
    let r; try { r = await api(); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
    const l = r.derniers || [];
    if (!l.length) return say("Je n'ai encore passé aucun appel pour toi.");
    showBoard(`<div style="text-align:left;font-family:system-ui;min-width:min(94vw,700px)"><small style="letter-spacing:.3em;color:#fcd34d">MES APPELS POUR TOI</small>${l.map(x => `<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)"><b>${esc(x.qui || lisible(x.a))}</b> <small style="color:#94a3b8">${new Date(x.at * 1000).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${esc(x.statut)}${x.duree ? ` · ${Math.round(x.duree / 60)} min` : ''}</small><div style="font-size:14px;color:#cbd5e1">${esc(x.mission || '')}</div>${x.resume ? `<div style="font-size:14px;color:#86efac;margin-top:4px">${esc(x.resume)}</div>` : ''}</div>`).join('')}</div>`);
    const d = l[0];
    return say(d.resume ? `Le dernier appel, à ${d.qui || lisible(d.a)} : ${d.resume}` : `Le dernier appel, à ${d.qui || lisible(d.a)}, est ${d.statut}.`);
  }
  function route(t, n) {
    // l'appel filmé pour LinkedIn : « Atlas, appel LinkedIn », « appelle-moi pour LinkedIn »
    if (/\b(appel (pour |de )?linkedin|appelle moi pour linkedin|appel filme|appel de demonstration)\b/.test(n)) return async () => {
      if (!(await askYesNo("J'appelle ton iPhone pour l'appel filmé pour LinkedIn. Ta caméra est prête ? J'appelle ?"))) return say("D'accord, dis-le-moi quand tu es prêt.");
      let r; try { r = await api({ action: 'linkedin' }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); }
      if (!r.ok) return say(`L'appel n'est pas parti : ${r.raison}.`);
      fx.ok(); return say("Ça sonne sur ton iPhone. Lance l'enregistrement et décroche !");
    };
    if (/\b(comment relier|relie|brancher|connecter) (les )?appels\b/.test(n)) return relier;
    if (/\b(mes appels|les appels que tu as (faits|passes)|compte rendu (de l |du dernier )?appel)\b/.test(n)) return mesAppels;
    // « le numéro de Paul c'est (le) 06… », « le numéro de Paul est le 06… », « enregistre le numéro de Paul : 06… », « mon numéro c'est 06… »
    let m = String(t).match(/\b(?:(?:enregistre|note|retiens|ajoute)\s+)?(?:le |son )?num[ée]ro (?:de t[ée]l[ée]phone )?(?:de |du |d['’]|des )(.+?)[,\s]+(?:c['’]est|est|:)\s*(?:le |au |:)?\s*(.+)$/i) || String(t).match(/\b(?:enregistre|note|retiens|ajoute)\s+(.+?)\s+(?:au|:)\s+(.+)$/i);
    const moi = String(t).match(/\bmon (?:num[ée]ro|t[ée]l[ée]phone|portable)[,\s]+(?:c['’]est|est|:)?\s*(?:le |:)?\s*(.+)$/i);
    if (moi && numeroDe(moi[1])) m = [null, S.nom || 'moi', moi[1]];
    if (m && numeroDe(m[2])) return async () => { const num = numeroDe(m[2]), nom = m[1].replace(/^(le|la|les|l['’])\s+/i, '').replace(/[,.]+$/, '').trim(); try { await carnet({ action: 'ajoute', item: { nom, tel: num } }); } catch (e) { return say("L'ordinateur de la maison ne répond pas."); } fx.ok(); return say(`C'est noté : ${nom}, ${lisible(num)}.`); };
    m = String(t).match(/(?:^|[\s,])(?:envoie|écris|ecris)(?:-lui| lui)? un (?:message )?whats ?app (?:à|a|au|aux) (.+?)\s*(?::|pour (?:lui )?dire(?: que)?|que|en disant)\s*(.+)$/i);
    if (m) return () => whatsapp(m[1].trim(), m[2].trim());
    m = String(t).match(/(?:^|[\s,])(?:envoie|écris|ecris)(?:-lui| lui)? un (?:sms|texto|message|petit message) (?:à|a|au|aux) (.+?)\s*(?::|pour (?:lui )?dire(?: que)?|que|en disant)\s*(.+)$/i);
    if (m) return () => sms(m[1].trim(), m[2].trim());
    // un groupe WhatsApp (« envoie un message dans le groupe Famille : … ») : WhatsApp s'ouvre avec le texte, il choisit le groupe
    m = String(t).match(/(?:^|[\s,])(?:envoie|écris|ecris|envoyer|écrire|mets|poste)(?:-lui| lui)?(?: un (?:message|petit message|whats ?app)(?: whats ?app)?)? (?:dans|sur|au|à|a) (?:le |mon )?groupe(?: whats ?app)? (.+?)(?:\s*(?::|pour (?:leur )?dire(?: que)?|que|en disant)\s*(.+))?[.!?]*$/i);
    if (m) return () => groupe(m[1].replace(/^(whats ?app)\s+/i, '').trim(), (m[2] || '').trim());
    // sans le texte : « envoie un SMS à Rémi », « envoie un message WhatsApp à Paul » → il demande quoi écrire
    m = String(t).match(/(?:^|[\s,])(?:(?:envoie|écris|ecris|envoyer|écrire)(?:-lui| lui)? )?un (?:message |petit message )?(whats ?app|sms|texto|message)(?: whats ?app)? (?:à|a|au|aux|pour) ([^,:.!?]+?)\s*[.!?]*$/i);
    if (m) {
      const qui = m[2].replace(/^(le|la|les|l['’])\s+/i, '').trim(), wa = /whats/i.test(m[0]);
      return async () => {
        const texte = String(await ask(`Qu'est-ce que j'écris à ${qui} ?`, { wait: 30000 }) || '').trim();
        if (!texte || /^(rien|laisse tomber|annule|non)\b/i.test(texte)) return say("D'accord, je n'envoie rien.");
        return wa ? whatsapp(qui, texte) : sms(qui, texte);
      };
    }
    m = String(t).match(/\b(?:appelle|téléphone à|telephone a|passe un coup de fil à|passe un coup de fil a)\s+(.+?)\s+(?:pour|et|afin de|afin d['’])\s+(.+)$/i);
    if (m && !/\b(mon fils|shadow|le petit)\b/i.test(m[1]) && !(typeof LIEN !== 'undefined' && LIEN.prenom() && new RegExp(`\\b${LIEN.prenom()}\\b`, 'i').test(m[1]))) return () => appelle(m[1].replace(/^(le|la|les|l['’])\s+/i, '').trim(), m[2].trim());
    return null;
  }
  return { route };
})();

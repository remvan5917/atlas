/* =========================================================
   ATLAS — la présentation : il filme, Atlas fait tout
   « Atlas, lance la présentation » (ou « mode présentation », « présente-toi à la caméra », « moteur, action », « on tourne ») :
   Atlas mène seul tout le film, plein écran, avec sa voix et sa bande-son — le réveil, qui il est (construit seul, en France),
   Shadow (le premier robot, déjà publié : Atlas est la suite), le bureau, la compta, la maison holographique (et les vraies
   lumières qui baissent puis se rallument), la détection, la sentinelle, ses appareils, sa règle, le robot de demain, la carte de fin.
   AUCUNE donnée réelle (c'est confidentiel) : ni mail, ni compta, ni trading, ni caméra, ni plan de la maison — tout est dessiné pour le film.
   « Stop » ou « coupez » : il s'arrête, les lumières reviennent comme avant.
   ========================================================= */
const PRESENTATION = (() => {
  try { localStorage.removeItem('atlas-demo'); } catch (e) { /* l'ancien mode démo n'existe plus */ }
  const root = () => VOIXMAISON.root();
  const prenom = () => S.nom || 'Rémy';
  let scene = 0, enCours = false, lumieres = [];
  const attends = ms => new Promise(r => setTimeout(r, ms));
  const vivant = moi => moi === scene;

  /* ---------- le décor ---------- */
  const CSS = `
#pres{position:fixed;inset:0;z-index:99990;background:radial-gradient(ellipse at center,#06121f 0%,#010409 72%);overflow:hidden;font-family:ui-monospace,Menlo,monospace;color:#a5f3fc;transition:opacity 1s}
#pres canvas.fond{position:absolute;inset:0;width:100%;height:100%;opacity:.55}
#pres .contenu{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;animation:pr-entre .7s ease-out}
#pres .flash{position:absolute;inset:0;background:radial-gradient(circle,rgba(165,243,252,.35),transparent 60%);pointer-events:none;animation:pr-flash .6s forwards}
#pres .anneaux{position:relative;width:min(54vmin,520px);height:min(54vmin,520px);flex:none}
#pres .r1{animation:pr-tourne 14s linear infinite}#pres .r2{animation:pr-tourne 9s linear infinite reverse}#pres .r3{animation:pr-tourne 22s linear infinite}
#pres .nom{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:200 clamp(34px,8vmin,78px) system-ui;letter-spacing:.5em;padding-left:.5em;color:#e0f2fe;text-shadow:0 0 24px #22d3ee,0 0 60px #0891b2;opacity:0;animation:pr-nom 2.4s .6s forwards}
#pres .journal{margin-top:2.5vh;width:min(92vw,700px);font-size:clamp(12px,1.9vmin,15px);line-height:1.75;min-height:12em}
#pres .journal div{opacity:0;animation:pr-ligne .35s forwards;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pres .ok{color:#4ade80}
#pres .fin{margin-top:2vh;font:700 clamp(14px,2.6vmin,22px) system-ui;letter-spacing:.45em;color:#4ade80;text-shadow:0 0 18px #22c55e;opacity:0}
#pres .balayage{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);box-shadow:0 0 18px #22d3ee;animation:pr-balaye 3.2s ease-in-out infinite;opacity:.55}
#pres .grille{position:absolute;left:0;right:0;bottom:0;width:100%;height:42%}
#pres .chap{position:absolute;top:6vh;left:6vw;font-size:clamp(11px,1.8vmin,14px);letter-spacing:.35em;color:#67e8f9;opacity:.85}
#pres .chap b{color:#e0f2fe;font-weight:700;text-transform:uppercase}
#pres .heure{position:absolute;top:6vh;right:6vw;font-size:clamp(10px,1.6vmin,13px);letter-spacing:.3em;color:#67e8f9;opacity:.7;text-align:right;line-height:1.7}
#pres .titre{font:200 clamp(28px,7vmin,72px) system-ui;letter-spacing:.22em;text-transform:uppercase;color:#e0f2fe;text-shadow:0 0 22px #0891b2;text-align:center;padding:0 16px;opacity:0;animation:pr-nom 1.4s forwards}
#pres .tuiles{display:flex;gap:min(3vw,28px);flex-wrap:wrap;justify-content:center;margin-top:5vh;padding:0 16px}
#pres .tuile{min-width:min(26vw,220px);padding:2.2vmin 2.6vmin;border:1px solid rgba(34,211,238,.35);border-radius:14px;background:rgba(2,16,28,.6);box-shadow:0 0 30px rgba(8,145,178,.18) inset;opacity:0;transform:translateY(14px);animation:pr-monte .7s forwards;text-align:left}
#pres .tuile .v{font:700 clamp(20px,4vmin,40px) system-ui;color:#e0f2fe;text-shadow:0 0 18px #22d3ee}
#pres .tuile .l{margin-top:.6vmin;font-size:clamp(11px,1.8vmin,14px);letter-spacing:.12em;color:#7dd3fc;text-transform:uppercase}
#pres .phrase{position:absolute;bottom:7vh;left:0;right:0;text-align:center;font:300 clamp(16px,3vmin,28px) system-ui;color:#e0f2fe;letter-spacing:.04em;padding:0 16px;text-shadow:0 0 14px #0891b2;transition:opacity .5s}
#pres canvas.holo{width:min(92vw,1100px);height:min(64vh,620px)}
#pres .robot{height:min(62vh,540px);width:auto;filter:drop-shadow(0 0 8px #22d3ee) drop-shadow(0 0 22px #0891b2)}
#pres .robot *{fill:none;stroke:#67e8f9;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:var(--l);stroke-dashoffset:var(--l);animation:pr-trace 2.2s forwards}
#pres .etapes{position:absolute;top:7vh;left:6vw;font-size:clamp(11px,1.9vmin,15px);line-height:1.9;text-align:left;padding:10px 14px;border:1px solid rgba(34,211,238,.25);border-radius:10px;background:rgba(2,12,20,.5)}
#pres .etapes div{opacity:0;animation:pr-ligne .5s forwards}
#pres .coin{position:absolute;top:7vh;right:6vw;text-align:right;font-size:clamp(10px,1.6vmin,13px);letter-spacing:.25em;line-height:1.8;color:#67e8f9;opacity:.8}
#pres .regle{font:800 clamp(30px,8vmin,86px) system-ui;letter-spacing:.06em;color:#fff;text-align:center;padding:0 16px;text-shadow:0 0 30px #22d3ee;opacity:0;animation:pr-nom 1.6s forwards}
#pres .france{width:min(60vw,420px);height:3px;margin:3vh auto 0;background:linear-gradient(90deg,#1d4ed8 0 33%,#f8fafc 33% 66%,#dc2626 66%);box-shadow:0 0 16px rgba(248,250,252,.4);transform:scaleX(0);animation:pr-trait 1.4s 1s forwards}
#pres .signe{margin-top:2.4vh;font:300 clamp(14px,2.6vmin,22px) system-ui;letter-spacing:.3em;color:#cbd5e1;text-align:center;opacity:0;animation:pr-ligne 1s 1.8s forwards}
#pres .duo{display:flex;align-items:center;gap:min(6vw,70px)}
#pres .duo .bloc{text-align:center;opacity:0;animation:pr-monte .9s forwards}
#pres .duo .leg{margin-top:2vh;font-size:clamp(11px,1.9vmin,15px);letter-spacing:.3em;color:#cbd5e1}
#pres .duo .leg b{display:block;margin-top:.6vh;font:700 clamp(18px,3.6vmin,32px) system-ui;letter-spacing:.3em}
#pres .lien{width:min(16vw,170px);height:2px;background:linear-gradient(90deg,#a78bfa,#22d3ee);box-shadow:0 0 14px #22d3ee;transform:scaleX(0);transform-origin:left;animation:pr-trait 1.2s 1.4s forwards}
#pres .shadow{width:min(26vmin,230px);height:min(26vmin,230px);border-radius:50%;background:radial-gradient(circle at 50% 40%,#2e1065,#0b0420 70%);box-shadow:0 0 40px #7c3aed,0 0 90px rgba(124,58,237,.5) inset;display:flex;align-items:center;justify-content:center;gap:16%}
#pres .shadow i{width:16%;height:30%;border-radius:40%;background:#ddd6fe;box-shadow:0 0 18px #c4b5fd;animation:pr-cligne 3.4s infinite}
#pres .mini{width:min(26vmin,230px);height:min(26vmin,230px)}
#pres .lien{position:relative}
#pres .paquet{position:absolute;top:-4px;width:10px;height:10px;margin-left:-5px;border-radius:50%;opacity:0}
#pres .paquet.va{background:#67e8f9;box-shadow:0 0 12px #22d3ee;animation:pr-va 1.6s linear infinite}
#pres .paquet.vient{background:#c4b5fd;box-shadow:0 0 12px #a78bfa;animation:pr-vient 1.6s linear infinite}
#pres .sh-visage{width:min(40vmin,360px);height:auto;filter:drop-shadow(0 0 22px rgba(76,141,255,.45))}
#pres .sh-crete{animation:pr-crete 1.6s ease-in-out infinite}
#pres .sh-oeil{transform-box:fill-box;transform-origin:center;animation:pr-cligne 3.6s infinite}
#pres .parle .sh-crete{animation:pr-crete .35s ease-in-out infinite alternate}
#pres .vitrine{display:flex;align-items:center;gap:min(5vw,60px);padding:0 4vw}
#pres .liste{text-align:left}
#pres .liste div{font:400 clamp(14px,2.5vmin,21px) system-ui;color:#e2e8f0;padding:.7vh 0;opacity:0;transform:translateX(16px);animation:pr-monte .5s forwards}
#pres .liste div b{color:var(--c,#67e8f9);margin-right:.6em}
#pres .mur{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:min(1.6vw,16px);width:min(92vw,1040px);margin-top:3vh}
#pres .mur div{padding:1.6vmin 1.8vmin;border:1px solid rgba(34,211,238,.3);border-radius:12px;background:rgba(2,16,28,.6);font:600 clamp(12px,2.1vmin,17px) system-ui;color:#e0f2fe;text-align:left;opacity:0;transform:scale(.8);animation:pr-monte .45s forwards}
#pres .mur div small{display:block;margin-top:.4vh;font:400 clamp(10px,1.6vmin,13px) system-ui;color:#7dd3fc}
#pres .tel{display:flex;align-items:center;gap:min(5vw,60px)}
#pres .iphone{position:relative;flex:none;width:min(30vmin,290px);aspect-ratio:9/19;border-radius:min(5vmin,46px);border:3px solid #cbd5e1;background:#05070c;box-shadow:0 0 0 6px #1e293b,0 0 50px rgba(34,211,238,.25);overflow:hidden}
#pres .iphone:before{content:'';position:absolute;top:2.2%;left:34%;width:32%;height:3.6%;border-radius:20px;background:#000;z-index:2}
#pres .ecran-tel{position:absolute;inset:0;padding:16% 7% 8%;display:flex;flex-direction:column;font-family:system-ui;animation:pr-entre .5s}
#pres .tel-tete{text-align:center;color:#f1f5f9;font:600 clamp(11px,1.8vmin,15px) system-ui;padding-bottom:6%;border-bottom:1px solid #1e293b}
#pres .tel-tete small{display:block;font-weight:400;color:#94a3b8;font-size:.8em}
#pres .tel-fil{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:6% 0}
#pres .tb{max-width:84%;padding:7px 10px;border-radius:16px;font-size:clamp(10px,1.7vmin,14px);line-height:1.35;color:#fff;text-align:left;opacity:0;transform:translateY(8px);transition:all .35s}
#pres .tb.moi{align-self:flex-end;background:#2563eb}#pres .tb.lui{align-self:flex-start;background:#1e293b}
#pres .tb-etat{align-self:flex-end;font-size:clamp(9px,1.3vmin,11px);color:#94a3b8;opacity:0;transition:opacity .3s}
#pres .tel-saisie{min-height:2.4em;border:1px solid #334155;border-radius:18px;padding:6px 10px;color:#e2e8f0;font-size:clamp(10px,1.7vmin,14px);text-align:left}
#pres .tel-saisie:after{content:'|';animation:pr-clignote 1s infinite;color:#60a5fa}
#pres .appel-av{width:44%;aspect-ratio:1;margin:12% auto 6%;border-radius:50%;background:radial-gradient(circle,#155e75,#0b1220);display:flex;align-items:center;justify-content:center;font:700 clamp(16px,3vmin,26px) system-ui;color:#e0f2fe;box-shadow:0 0 30px rgba(34,211,238,.4)}
#pres .appel-nom{text-align:center;color:#f1f5f9;font:600 clamp(12px,2vmin,17px) system-ui}
#pres .appel-t{text-align:center;color:#86efac;font:500 clamp(10px,1.6vmin,13px) ui-monospace,monospace;margin-top:4px}
#pres canvas.onde{width:100%;height:18%;margin-top:10%}
#pres .transcrit{width:min(40vw,460px);display:flex;flex-direction:column;gap:8px;text-align:left}
#pres .hud-tel{font-size:clamp(10px,1.6vmin,13px);letter-spacing:.2em;color:#67e8f9;line-height:1.9;margin-bottom:1vh}
#pres .tr{padding:9px 12px;border-radius:12px;font:400 clamp(12px,2vmin,16px) system-ui;line-height:1.4;color:#f1f5f9;opacity:0;animation:pr-monte .4s forwards}
#pres .tr small{display:block;font:700 10px ui-monospace,monospace;letter-spacing:.2em;margin-bottom:3px}
#pres .tr.a{background:rgba(34,211,238,.1);border-left:3px solid #22d3ee}#pres .tr.a small{color:#67e8f9}
#pres .tr.e{background:rgba(255,255,255,.05);border-left:3px solid #94a3b8}#pres .tr.e small{color:#cbd5e1}
#pres .resultat{padding:11px 14px;border-radius:12px;background:rgba(74,222,128,.13);border:1px solid #4ade80;color:#bbf7d0;font:700 clamp(12px,2vmin,16px) system-ui;opacity:0;animation:pr-monte .5s forwards}
#pres .cadran{position:relative;width:min(50vmin,500px);height:min(50vmin,500px);margin-top:-4vh}
#pres .cadran svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#pres .aiguille{transform-box:view-box;transform-origin:200px 200px;animation:pr-tourne 12s .8s linear forwards}
#pres .cadran .centre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font:200 clamp(26px,7vmin,64px) ui-monospace,monospace;color:#e0f2fe;text-shadow:0 0 18px #22d3ee}
#pres .cadran .centre small{font:400 clamp(10px,1.6vmin,13px) ui-monospace,monospace;letter-spacing:.3em;color:#67e8f9;margin-top:.6vh}
#pres .ev{position:absolute;width:min(24vmin,230px);transform:translate(-50%,-50%);text-align:center;font:600 clamp(11px,1.9vmin,15px) system-ui;color:#e0f2fe;opacity:0;animation:pr-monte .5s forwards}
#pres .ev small{display:block;font:400 clamp(9px,1.5vmin,12px) system-ui;color:#7dd3fc;margin-top:2px}
#pres .ev:before{content:attr(data-h);display:block;font:700 clamp(9px,1.4vmin,11px) ui-monospace,monospace;letter-spacing:.2em;color:#fbbf24;margin-bottom:2px}
#pres .bulle{max-width:min(34vw,330px);margin:1.6vh auto 0;padding:9px 13px;border-radius:14px;font:400 clamp(12px,2vmin,16px) system-ui;line-height:1.4;color:#f1f5f9;text-align:left;opacity:0;animation:pr-monte .6s forwards}
#pres .bulle.a{background:rgba(34,211,238,.14);border:1px solid rgba(34,211,238,.45)}#pres .bulle.s{background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.5)}
#pres .cam{position:relative;width:min(84vw,820px);height:min(56vh,470px);border:1px solid rgba(34,211,238,.35);border-radius:12px;overflow:hidden;background:repeating-linear-gradient(0deg,rgba(34,211,238,.035) 0 2px,transparent 2px 4px),radial-gradient(ellipse at 50% 70%,#0b2233,#02060b 75%)}
#pres .cam .rec{position:absolute;top:12px;left:14px;font-size:12px;letter-spacing:.25em;color:#fca5a5}
#pres .cam .rec:before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:8px;animation:pr-clignote 1s infinite}
#pres .cam .ts{position:absolute;top:12px;right:14px;font-size:12px;letter-spacing:.2em;color:#94a3b8}
#pres .marcheur{position:absolute;bottom:12%;left:-14%;height:58%;animation:pr-marche 5.5s cubic-bezier(.3,.1,.3,1) forwards}
#pres .marcheur svg{height:100%;width:auto}
#pres .cible{position:absolute;inset:-6% -18%;border:2px solid #f87171;box-shadow:0 0 18px rgba(248,113,113,.6);opacity:0;animation:pr-cible .5s 3.6s forwards}
#pres .cible span{position:absolute;top:-28px;left:-2px;white-space:nowrap;font:700 12px ui-monospace,monospace;letter-spacing:.15em;color:#fff;background:#dc2626;padding:3px 8px;border-radius:4px}
#pres .alerte{position:absolute;bottom:14px;right:14px;padding:10px 14px;border-radius:10px;background:rgba(220,38,38,.18);border:1px solid #f87171;color:#fecaca;font-size:13px;letter-spacing:.12em;opacity:0;animation:pr-monte .6s 4.8s forwards}
#pres .radar{position:relative;width:min(58vmin,520px);height:min(58vmin,520px);border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 calc(16.6% - 1px),rgba(34,211,238,.28) calc(16.6% - 1px) 16.6%);border:1px solid rgba(34,211,238,.45);box-shadow:0 0 40px rgba(8,145,178,.25) inset}
#pres .radar:before,#pres .radar:after{content:'';position:absolute;background:rgba(34,211,238,.25)}#pres .radar:before{left:50%;top:0;bottom:0;width:1px}#pres .radar:after{top:50%;left:0;right:0;height:1px}
#pres .radar .balai{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(34,211,238,.55),rgba(34,211,238,0) 22%,transparent);animation:pr-tourne 3s linear infinite}
#pres .radar .pt{position:absolute;width:10px;height:10px;margin:-5px;border-radius:50%;background:#4ade80;box-shadow:0 0 12px #4ade80;opacity:0;animation:pr-ligne .4s forwards}
#pres .radar .pt.rouge{background:#ef4444;box-shadow:0 0 18px #ef4444;animation:pr-ligne .4s forwards,pr-pulse 1s infinite}
#pres .radar .pt small{position:absolute;left:14px;top:-4px;white-space:nowrap;font-size:11px;letter-spacing:.15em;color:#fecaca}
@keyframes pr-tourne{to{transform:rotate(360deg)}}@keyframes pr-nom{0%{opacity:0;letter-spacing:1.2em;filter:blur(8px)}100%{opacity:1;filter:none}}
@keyframes pr-ligne{to{opacity:1}}@keyframes pr-balaye{0%{top:8%}50%{top:92%}100%{top:8%}}@keyframes pr-trace{to{stroke-dashoffset:0}}
@keyframes pr-monte{to{opacity:1;transform:none}}@keyframes pr-trait{to{transform:scaleX(1)}}@keyframes pr-clignote{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes pr-entre{0%{opacity:0;transform:translateX(-14px) skewX(-6deg);filter:blur(6px) hue-rotate(60deg)}35%{opacity:.8;transform:translateX(9px) skewX(3deg)}55%{transform:translateX(-4px)}100%{opacity:1;transform:none;filter:none}}
@keyframes pr-flash{from{opacity:1}to{opacity:0}}@keyframes pr-cligne{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes pr-marche{to{left:42%}}@keyframes pr-crete{0%,100%{stroke:#4c8dff;filter:drop-shadow(0 0 3px #4c8dff)}50%{stroke:#8ff0ff;filter:drop-shadow(0 0 9px #8ff0ff)}}@keyframes pr-va{0%{left:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{left:100%;opacity:0}}@keyframes pr-vient{0%{left:100%;opacity:0}10%{opacity:1}90%{opacity:1}100%{left:0;opacity:0}}@keyframes pr-cible{0%{opacity:0;transform:scale(1.6)}100%{opacity:1;transform:none}}@keyframes pr-pulse{50%{transform:scale(1.7)}}`;

  /* ---------- la bande-son (fabriquée ici : un souffle entre les chapitres, un grondement, une alerte) ---------- */
  function son(genre) {
    if (!S.settings.sound) return;
    try {
      const c = fx.audio(), t = c.currentTime, g = c.createGain(); g.connect(c.destination);
      if (genre === 'souffle') { // un bruit filtré qui monte puis s'éteint
        const b = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = c.createBufferSource(), f = c.createBiquadFilter(); s.buffer = b; f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.7); f.frequency.exponentialRampToValueAtTime(800, t + 1.1);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
        s.connect(f); f.connect(g); s.start(t); s.stop(t + 1.2);
      } else { // le grondement (une note grave qui tombe) ou l'alerte (une note aiguë qui tombe)
        const o = c.createOscillator(), al = genre === 'alerte'; o.type = 'sine'; o.frequency.setValueAtTime(al ? 880 : 110, t); o.frequency.exponentialRampToValueAtTime(al ? 440 : 38, t + 1.4);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(al ? 0.05 : 0.16, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g); o.start(t); o.stop(t + 1.7);
      }
    } catch (e) { /* pas de son */ }
  }
  const bip = seq => { try { fx.tone(seq); } catch (e) { /* sans son */ } };

  /* ---------- le fond : un réseau de neurones qui dérive, d'un chapitre à l'autre ---------- */
  function fond(cv, moi) {
    const ctx = cv.getContext('2d'), N_ = 70, pts = Array.from({ length: N_ }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006 }));
    let der = 0;
    const tour = t => {
      if (!vivant(moi) || !document.contains(cv)) return;
      requestAnimationFrame(tour); if (t - der < 33) return; der = t;
      const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight; ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; }
      for (let i = 0; i < N_; i++) for (let j = i + 1; j < N_; j++) {
        const dx = (pts[i].x - pts[j].x) * w, dy = (pts[i].y - pts[j].y) * h, dd = dx * dx + dy * dy;
        if (dd < 160 * 160) { ctx.strokeStyle = `rgba(34,211,238,${(0.22 * (1 - Math.sqrt(dd) / 160)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[i].x * w, pts[i].y * h); ctx.lineTo(pts[j].x * w, pts[j].y * h); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(165,243,252,.8)'; for (const p of pts) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.6, 0, 7); ctx.fill(); }
    };
    requestAnimationFrame(tour);
  }

  function ecran(html, moi) {
    if (!document.getElementById('pres-css')) { const s = document.createElement('style'); s.id = 'pres-css'; s.textContent = CSS; document.head.appendChild(s); }
    let d = document.getElementById('pres');
    if (!d) {
      d = document.createElement('div'); d.id = 'pres'; d.style.opacity = '0'; d.innerHTML = '<canvas class="fond"></canvas>'; document.body.appendChild(d);
      requestAnimationFrame(() => { d.style.opacity = '1'; }); fond(d.querySelector('canvas.fond'), moi);
    }
    d.querySelectorAll('.contenu,.flash').forEach(x => x.remove());
    const c = document.createElement('div'); c.className = 'contenu'; c.innerHTML = html; d.appendChild(c);
    const f = document.createElement('div'); f.className = 'flash'; d.appendChild(f); setTimeout(() => f.remove(), 700);
    return c;
  }
  async function fermeEcran() { const d = document.getElementById('pres'); if (!d) return; d.style.opacity = '0'; await attends(1000); d.remove(); }
  const anneaux = (nom = 'ATLAS', cls = 'anneaux') => `<div class="${cls}" style="position:relative">
<svg class="r1" viewBox="0 0 200 200" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="100" cy="100" r="92" fill="none" stroke="#22d3ee" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="2 5"/><circle cx="100" cy="100" r="86" fill="none" stroke="#0e7490" stroke-width="2.5" stroke-dasharray="60 18 8 18"/></svg>
<svg class="r2" viewBox="0 0 200 200" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="100" cy="100" r="74" fill="none" stroke="#67e8f9" stroke-width="1.2" stroke-dasharray="120 40 10 40"/><circle cx="100" cy="100" r="68" fill="none" stroke="#155e75" stroke-width="5" stroke-dasharray="3 9"/></svg>
<svg class="r3" viewBox="0 0 200 200" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="100" cy="100" r="56" fill="none" stroke="#a5f3fc" stroke-opacity=".7" stroke-width=".6"/><path d="M100 30 L104 40 L96 40 Z M100 170 L104 160 L96 160 Z" fill="#22d3ee"/></svg>
<div class="nom">${nom}</div></div>`;
  function sol() { // une grille de hangar en perspective, dessinée à plat
    const L = [];
    for (let i = 0; i <= 12; i++) { const y = 100 * Math.pow(i / 12, 1.8); L.push(`<line vector-effect="non-scaling-stroke" x1="0" y1="${y.toFixed(1)}" x2="1000" y2="${y.toFixed(1)}" stroke-opacity="${(0.05 + 0.25 * i / 12).toFixed(2)}"/>`); }
    for (let i = -14; i <= 14; i++) L.push(`<line vector-effect="non-scaling-stroke" x1="${500 + i * 12}" y1="0" x2="${500 + i * 95}" y2="100" stroke-opacity=".18"/>`);
    return `<svg class="grille" viewBox="0 0 1000 100" preserveAspectRatio="none" stroke="#22d3ee" stroke-width=".6">${L.join('')}</svg>`;
  }
  const hh = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; };
  async function dit(d, t) { const ph = d.querySelector('.phrase'); if (ph) { ph.style.opacity = '0'; await attends(220); ph.textContent = t; ph.style.opacity = '1'; } await say(t); await attends(220); }
  const tuile = (v, l, i) => `<div class="tuile" style="animation-delay:${0.25 + i * 0.25}s"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`;
  const chapitre = (n, nom, corps) => `${sol()}<div class="chap">${String(n).padStart(2, '0')} · <b>${esc(nom)}</b></div><div class="heure">ATLAS · EN DIRECT<br>${hh()}</div>${corps}<div class="phrase" style="opacity:0"></div>`;
  const tuiles = (nom, l) => `<div class="titre">${esc(nom)}</div><div class="tuiles">${l.map(([v, x], i) => tuile(v, x, i)).join('')}</div>`;

  /* ---------- la maison holographique (une maison de ville dessinée pour le film, pas le vrai plan) ---------- */
  function holo(cv, moi) {
    const ctx = cv.getContext('2d'), H = 2.6, L = 10, D = 5, FAITE = 3 * H + 1.9, t0 = performance.now();
    const fen = [0, 1, 2].map(() => [0, 1, 2].map(() => ({ on: Math.random() < 0.5, k: 0 })));
    let der = 0, yaw = 0.6;
    const tour = t => {
      if (!vivant(moi) || !document.contains(cv)) return;
      requestAnimationFrame(tour); if (t - der < 33) return; der = t;
      const s = (t - t0) / 1000, w = cv.width = cv.clientWidth * 1.5, h = cv.height = cv.clientHeight * 1.5; ctx.clearRect(0, 0, w, h);
      yaw += 0.006;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), f = Math.min(w, h) * 1.55, cxs = w / 2, cys = h * 0.62;
      const P = (x, y, z) => { const xr = x * cy - z * sy, zr = x * sy + z * cy + 24; return [cxs + f * xr / zr, cys - f * (y - 3.2) / zr + f * 0.32 * (zr - 24) / zr]; };
      const ligne = (a, b, al, col = '103,232,249', lw = 1.6) => { const p = P(...a), q = P(...b); ctx.strokeStyle = `rgba(${col},${al})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
      ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12;
      // le sol : des anneaux autour de la maison
      for (let r = 1; r <= 4; r++) { ctx.beginPath(); for (let a = 0; a <= 64; a++) { const p = P(Math.cos(a / 64 * 6.283) * (5 + r * 2.2), 0, Math.sin(a / 64 * 6.283) * (5 + r * 2.2)); a ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.strokeStyle = `rgba(34,211,238,${(0.12 + 0.05 * Math.sin(s * 2 - r)).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke(); }
      // les étages qui montent du sol, un par un
      for (let n = 0; n < 3; n++) {
        const k = Math.max(0, Math.min(1, (s - 0.4 - n * 0.7) / 0.9)); if (!k) continue;
        const y0 = n * H, y1 = y0 + H * k, al = 0.35 + 0.55 * k, x = L / 2, z = D / 2;
        const bas = [[-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z]], haut = bas.map(([a, , c]) => [a, y1, c]);
        for (let i = 0; i < 4; i++) { ligne(bas[i], bas[(i + 1) % 4], al); ligne(haut[i], haut[(i + 1) % 4], al); ligne(bas[i], haut[i], al); }
        // les fenêtres qui s'allument (en façade)
        if (k === 1) fen[n].forEach((o, i) => {
          if (Math.random() < 0.006) o.on = !o.on; o.k += ((o.on ? 1 : 0) - o.k) * 0.08;
          const fx0 = -3.4 + i * 3, a = P(fx0, y0 + 0.8, -z), b = P(fx0 + 1.4, y0 + 0.8, -z), c = P(fx0 + 1.4, y0 + 2, -z), dd = P(fx0, y0 + 2, -z);
          ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...dd); ctx.closePath();
          ctx.fillStyle = `rgba(255,181,71,${(0.08 + 0.5 * o.k).toFixed(3)})`; ctx.fill(); ctx.strokeStyle = `rgba(255,181,71,${(0.3 + 0.5 * o.k).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
        });
      }
      // le toit
      const kt = Math.max(0, Math.min(1, (s - 2.6) / 0.8));
      if (kt) { const y = 3 * H, x = L / 2, z = D / 2, fy = y + (FAITE - y) * kt; [[[-x, y, -z], [-x, fy, 0]], [[-x, y, z], [-x, fy, 0]], [[x, y, -z], [x, fy, 0]], [[x, y, z], [x, fy, 0]], [[-x, fy, 0], [x, fy, 0]]].forEach(([a, b]) => ligne(a, b, 0.85)); }
      // le scanner qui balaie les étages
      if (s > 3.2) {
        const ys = (Math.sin((s - 3.2) * 1.1) * 0.5 + 0.5) * 3 * H, x = L / 2 + 0.3, z = D / 2 + 0.3, c4 = [[-x, ys, -z], [x, ys, -z], [x, ys, z], [-x, ys, z]].map(p => P(...p));
        ctx.beginPath(); c4.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.fillStyle = 'rgba(34,211,238,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(165,243,252,.9)'; ctx.lineWidth = 2; ctx.stroke();
      }
      // le cœur d'Atlas au-dessus du toit, relié à chaque étage
      if (s > 3.6) {
        const c = P(0, FAITE + 2.2, 0), r = (10 + 3 * Math.sin(s * 3)) * w / 1000;
        ctx.setLineDash([4, 6]); for (let n = 0; n < 3; n++) ligne([0, FAITE + 2.2, 0], [0, n * H + H / 2, 0], 0.45, '165,243,252', 1); ctx.setLineDash([]);
        const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r * 4); g.addColorStop(0, 'rgba(224,242,254,1)'); g.addColorStop(0.3, 'rgba(34,211,238,.7)'); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r * 4, 0, 7); ctx.fill();
      }
      ctx.shadowBlur = 0;
    };
    requestAnimationFrame(tour);
  }

  /* ---------- les vraies lumières : elles baissent au début, se rallument pour « la maison », reviennent comme avant à la fin ---------- */
  async function lampes() {
    try { await MAISON.liste(true); } catch (e) { return []; }
    return (MAISON._appareils() || []).filter(a => a.allume === true && a.lum != null).map(a => ({ id: a.id, lum: a.lum, teinte: a.teinte }));
  }
  async function eclaire(l, lum, teinte) {
    if (!l.length || !root()) return;
    try { await fetch(`${root()}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: l.map(a => a.id), allume: true, lum, teinte, source: 'auto' }) }); } catch (e) { /* tant pis */ }
  }
  async function rends() {
    const l = lumieres; lumieres = [];
    for (const a of l) { try { await fetch(`${root()}/maison/commande`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [a.id], allume: true, lum: a.lum, teinte: a.teinte == null ? undefined : a.teinte, source: 'auto' }) }); } catch (e) { /* tant pis */ } }
  }

  const ROBOT = [
    'M200 30 c26 0 40 16 40 40 v14 c0 22 -16 36 -40 36 s-40 -14 -40 -36 v-14 c0 -24 14 -40 40 -40 z', 'M168 72 q32 -12 64 0 q-2 16 -32 18 q-30 -2 -32 -18 z', 'M188 120 l4 14 h16 l4 -14',
    'M150 140 q50 -14 100 0 l-10 70 q-40 22 -80 0 z', 'M188 172 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 'M164 192 q36 10 72 0', 'M168 222 h64 l-6 30 h-52 z',
    'M133 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', 'M249 148 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
    'M136 156 l-20 58', 'M110 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M116 220 l-6 48', 'M110 268 l-6 14 m6 -14 l0 15 m0 -15 l6 13',
    'M264 156 l20 58', 'M278 214 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M284 220 l6 48', 'M290 268 l6 14 m-6 -14 l0 15 m0 -15 l-6 13',
    'M180 252 l-8 64', 'M166 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M172 328 l-4 52', 'M156 384 h24',
    'M220 252 l8 64', 'M222 322 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0', 'M228 328 l4 52', 'M220 384 h24',
  ];
  const SHADOW = (cls = '') => `<svg class="sh-visage ${cls}" viewBox="0 0 320 232"><defs><linearGradient id="sh-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#56668e"/><stop offset=".06" stop-color="#2e3a5c"/><stop offset=".5" stop-color="#1a2342"/><stop offset="1" stop-color="#0d1328"/></linearGradient>
<radialGradient id="sh-v" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#14245a"/><stop offset=".55" stop-color="#0a1433"/><stop offset="1" stop-color="#040919"/></radialGradient><clipPath id="sh-b"><path d="M92 166 H228 Q222 210 160 212 Q98 210 92 166 Z"/></clipPath></defs>
<rect x="118" y="21" width="84" height="9" rx="4" fill="#26304d"/><path class="sh-crete" d="M116 28 L124 13 L132 28 L140 11 L148 28 L156 10 L164 28 L172 11 L180 28 L188 12 L196 28 L203 17" fill="none" stroke="#4c8dff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="3" y="92" width="14" height="64" rx="5" fill="#1a2342" stroke="#e9f0ff" stroke-width="2"/><rect x="303" y="92" width="14" height="64" rx="5" fill="#1a2342" stroke="#e9f0ff" stroke-width="2"/>
<rect x="12" y="26" width="296" height="196" rx="18" fill="url(#sh-g)" stroke="#e9f0ff" stroke-width="4"/><rect x="34" y="36" width="252" height="176" rx="12" fill="url(#sh-v)"/>
${[[23, 37], [297, 37], [23, 211], [297, 211]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#8e9ab9"/>`).join('')}
${[0, 160].map(dx => `<g transform="translate(${dx} 0)"><rect x="47" y="43" width="66" height="62" rx="8" fill="#0a1330" stroke="#e9f0ff" stroke-width="3.5"/><rect x="54" y="50" width="52" height="48" rx="3" fill="#03040c"/><rect class="sh-oeil" x="68" y="56" width="24" height="36" rx="3" fill="#59c8ff" style="filter:drop-shadow(0 0 6px #59c8ff)"/></g>`).join('')}
<path d="M152 142 L160 126 L168 142 Z" fill="none" stroke="#e9f0ff" stroke-width="3" stroke-linejoin="round"/>
<g stroke="#e9f0ff" stroke-width="2.2" stroke-linecap="round"><path d="M138 134 L104 122"/><path d="M138 139 L101 139"/><path d="M138 144 L104 156"/><path d="M182 134 L216 122"/><path d="M182 139 L219 139"/><path d="M182 144 L216 156"/></g>
<path d="M92 166 H228 Q222 210 160 212 Q98 210 92 166 Z" fill="#050a1a" stroke="#e9f0ff" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M96 166 L104 186 L112 167 L120 192 L128 168 L136 196 L144 168 L152 198 L160 168 L168 198 L176 168 L184 196 L192 168 L200 192 L208 167 L216 186 L224 166 Z" fill="#f1f5ff" stroke="#e9f0ff" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M90 166 H230" stroke="#4c8dff" stroke-width="7" stroke-linecap="round"/><text x="160" y="219" text-anchor="middle" font-family="ui-monospace,monospace" font-size="6" fill="#9aa8cc" letter-spacing="1">SHADOW · S-01</text></svg>`;
  const VOIX_EUX = 'TkwuwKE5cxtp46xF1Uw9'; // « Marianne », une autre voix du compte ElevenLabs : celle de la personne au téléphone
  async function tamponEux(t) {
    const s = S.settings; if (!s.elevenKey) return null;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOIX_EUX}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': s.elevenKey, Accept: 'audio/mpeg' }, body: JSON.stringify({ text: t, model_id: s.elevenModel || 'eleven_v4_turbo', language_code: 'fr' }) });
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return await new Promise((res, rej) => fx.audio().decodeAudioData(ab, res, rej)).catch(() => null);
    } catch (e) { return null; }
  }
  // elle parle « au téléphone » (un filtre 300–3400 Hz) ; sans ElevenLabs, la voix du navigateur ; sinon, un silence de la bonne durée
  async function voixEux(tampon, t) {
    if (tampon) {
      try {
        const c = fx.audio(), src = c.createBufferSource(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
        src.buffer = tampon; hp.type = 'highpass'; hp.frequency.value = 320; lp.type = 'lowpass'; lp.frequency.value = 3400; g.gain.value = 1.2;
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(c.destination);
        return await new Promise(res => { src.onended = res; src.start(); setTimeout(res, tampon.duration * 1000 + 800); });
      } catch (e) { /* plus bas */ }
    }
    return new Promise(res => {
      try { const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.05; u.pitch = 1.2; u.onend = res; u.onerror = res; speechSynthesis.speak(u); setTimeout(res, 1500 + 70 * t.length); } catch (e) { setTimeout(res, 1200 + 55 * t.length); }
    });
  }
  const SILHOUETTE = '<svg viewBox="0 0 60 160"><defs><linearGradient id="pr-hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9" stop-opacity=".6"/><stop offset="1" stop-color="#0891b2" stop-opacity=".12"/></linearGradient></defs>'
    + '<g fill="url(#pr-hg)" stroke="#a5f3fc" stroke-width="1"><circle cx="30" cy="14" r="10"/><path d="M18 28 h24 q6 0 7 7 l4 40 q0 4 -4 4 h-2 l-3 -34 v42 l2 66 h-9 l-5 -60 l-5 60 h-9 l2 -66 v-42 l-3 34 h-2 q-4 0 -4 -4 l4 -40 q1 -7 7 -7 z"/></g>'
    + '<g fill="#fde68a">' + [[30, 14], [30, 30], [19, 32], [41, 32], [14, 74], [46, 74], [30, 74], [24, 110], [36, 110], [23, 150], [37, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + '</g>'
    + '<g stroke="#fde68a" stroke-width=".6" stroke-opacity=".7" fill="none"><path d="M30 14 V30 M19 32 H41 M19 32 L14 74 M41 32 L46 74 M30 30 V74 M30 74 L24 110 L23 150 M30 74 L36 110 L37 150"/></g></svg>';

  /* ---------- le film ---------- */
  async function film() {
    const moi = ++scene, fini = () => !vivant(moi);
    enCours = true; const discret = dlg.discret; dlg.discret = true; // pendant le film, il ne répond qu'à son nom (et à « stop »)
    try { hideBoard(); } catch (e) { /* rien */ }
    const parle = async (d, l) => { for (const t of l) { if (fini()) return false; await dit(d, t); } return !fini(); };
    try {
      lumieres = await lampes();
      const avant = lumieres.slice();

      // 00 · le réveil : la maison s'éteint, Atlas s'allume
      eclaire(avant, 8, 0); son('grondement');
      let d = ecran(`<div class="balayage"></div>${anneaux()}<div class="journal"></div><div class="fin">SYSTÈMES OPÉRATIONNELS</div>`, moi);
      const j = d.querySelector('.journal');
      const lignes = [['Noyau neuronal', 'en ligne'], ['Voix', 'synthèse active'], ['Vision', 'active'], ['Mémoire', 'chargée'], ['Liaison avec Shadow', 'établie'], ['Maison holographique', 'projetée'],
        ['Détection', 'armée'], ['Sentinelle', 'en veille'], ['Bureau · comptabilité', 'prêts'], ['Téléphone · SMS · appels', 'reliés'], ['Automatisations', 'actives'], ['Ordinateur · tablette · iPhone', 'synchronisés'], ['Protocole de confiance', 'rien ne part sans son oui']];
      bip([[220, 0.25], [330, 0.25], [440, 0.4]]);
      await attends(2600);
      for (const [k, v] of lignes) {
        if (fini()) return;
        const el = document.createElement('div'); el.innerHTML = `<span class="ok">[ OK ]</span> ${esc(k)} ${'·'.repeat(Math.max(3, 34 - k.length))} ${esc(v)}`;
        j.appendChild(el); bip([[1320, 0.03]]); await attends(330);
      }
      d.querySelector('.fin').style.cssText = 'opacity:1;animation:pr-clignote 1s 3';
      bip([[660, 0.12], [990, 0.12], [1320, 0.3]]); await attends(2000);
      if (fini()) return;

      // 01 · qui je suis
      son('souffle'); d = ecran(`${sol()}${anneaux('')}<div class="phrase" style="opacity:0"></div>`, moi);
      if (!(await parle(d, ['Bonjour. Je suis Atlas.', "L'intelligence artificielle de cette maison.",
        `Je n'ai pas été conçu dans la Silicon Valley. ${prenom()} m'a construit lui-même. Seul. Ici, en France.`]))) return;

      // 02 · d'abord, il y a eu Shadow
      son('souffle');
      d = ecran(chapitre(1, 'Le début : Shadow', `<div class="duo"><div class="bloc">${SHADOW()}<div class="leg">HIER<b style="color:#93c5fd">SHADOW</b></div></div>
<div class="lien"></div><div class="bloc" style="animation-delay:1.8s">${anneaux('', 'mini')}<div class="leg">AUJOURD'HUI<b style="color:#67e8f9">ATLAS</b></div></div></div>`), moi);
      if (!(await parle(d, ['Tout a commencé par un robot. Pour son fils.', "Shadow. Un petit robot qui parle, qui écoute, qui apprend avec lui : ses devoirs, ses histoires, ses mille questions.",
        "Vous l'avez peut-être déjà vu. C'est en le construisant que tout est né.", 'Moi, je suis la suite. Shadow veille sur le petit. Moi, je veille sur toute la maison.']))) return;

      // 01 bis · ce que fait Shadow
      son('souffle');
      const fShadow = [['Il parle, il écoute', 'son ami, à la voix'], ['Il reconnaît', 'son visage, sa voix, ses émotions'], ['Il voit', 'les objets autour de lui'], ['Il fait réviser', 'la dictée, les tables, l’heure, l’anglais'],
        ['Il raconte', 'les histoires du soir, les comptines'], ['Il joue', 'Jacques a dit, pierre-feuille-ciseaux, devinettes'], ['Il a 15 expressions', 'il rit, il rougit, il s’endort'], ['Il protège', 'les données de l’enfant']];
      d = ecran(chapitre(2, 'Ce que fait Shadow', `<div class="vitrine"><div>${SHADOW()}</div><div class="liste" style="--c:#93c5fd">${fShadow.map(([a, b], i) => `<div style="animation-delay:${0.4 + i * 0.32}s"><b>▸ ${esc(a)}</b>${esc(b)}</div>`).join('')}</div></div>`), moi);
      if (!(await parle(d, ['Shadow parle, écoute, reconnaît son visage et sa voix.', 'Il lui fait réviser la dictée et les tables, il lui raconte des histoires, il joue avec lui.', 'Un vrai copain. Fait à la maison.']))) return;

      // 03 · le bureau
      son('souffle'); d = ecran(chapitre(3, 'Le bureau', tuiles('Le bureau', [['Ses mails', 'lus chaque matin'], ['Les réponses', 'écrites dans son style'], ['L’envoi', 'après son oui']])), moi);
      if (!(await parle(d, ["Chaque matin, je lis ses mails : ceux de sa société, et les siens.", "Je comprends ce qu'il faut faire. J'écris les réponses, dans son style.", 'Il relit. Il dit oui. C’est envoyé.']))) return;

      // 04 · la comptabilité
      son('souffle'); d = ecran(chapitre(4, 'La comptabilité', tuiles('La comptabilité', [['Les factures', 'retrouvées chez les fournisseurs'], ['Le tableau', 'rempli seul'], ['La réponse', 'prête à valider']])), moi);
      if (!(await parle(d, ['Quand son cabinet comptable demande des pièces, je vais chercher les vraies factures, chez les fournisseurs.', 'Je remplis le tableau. Je prépare la réponse.']))) return;

      // 05 · le téléphone : le SMS qui s'écrit, puis l'appel à deux voix
      son('souffle');
      const eux = ['Le Bistrot du Canal, bonjour !', 'Ah… très bien ! Samedi soir… vingt heures, ça vous irait ?', 'Merci à vous. À samedi !'];
      const tampons = eux.map(tamponEux); // la voix de l'autre, préparée pendant le SMS
      d = ecran(chapitre(5, 'Le téléphone', `<div class="tel"><div class="iphone"><div class="ecran-tel" id="pr-tel"></div></div><div class="transcrit" id="pr-tr"><div class="hud-tel">ATLAS · MESSAGES<br><span style="color:#94a3b8">PRÉPARÉ PAR ATLAS · ENVOYÉ APRÈS SON OUI</span></div></div></div>`), moi);
      const tel = d.querySelector('#pr-tel'), tr = d.querySelector('#pr-tr');
      tel.innerHTML = '<div class="tel-tete">Julie<small>SMS</small></div><div class="tel-fil"></div><div class="tel-saisie"></div>';
      const sms = 'Je rentre dans 20 minutes, je ramène le dessert.', saisie = tel.querySelector('.tel-saisie'), fil = tel.querySelector('.tel-fil');
      const tape = (async () => { await attends(900); for (let i = 1; i <= sms.length && vivant(moi); i++) { saisie.textContent = sms.slice(0, i); if (i % 3 === 0) bip([[2200, 0.012]]); await attends(42); } })();
      if (!(await parle(d, ['Je parle aussi pour lui.', 'Un message à envoyer ? Il me le dit. Je l’écris.']))) return;
      await tape; if (fini()) return;
      const bulle = (t, cls) => { const b = document.createElement('div'); b.className = `tb ${cls}`; b.textContent = t; fil.appendChild(b); requestAnimationFrame(() => { b.style.opacity = '1'; b.style.transform = 'none'; }); return b; };
      saisie.textContent = ''; bulle(sms, 'moi'); bip([[1568, 0.05]]);
      const et = document.createElement('div'); et.className = 'tb-etat'; et.textContent = 'Distribué'; fil.appendChild(et); setTimeout(() => { et.style.opacity = '1'; }, 500);
      if (!(await parle(d, ['Il dit oui. C’est parti.']))) return;
      bulle('Parfait, à tout à l’heure !', 'lui'); bip([[1046, 0.05], [1318, 0.07]]); await attends(1400);
      if (fini()) return;
      // l'appel
      tel.innerHTML = '<div class="appel-av">BC</div><div class="appel-nom">Le Bistrot du Canal</div><div class="appel-t" id="pr-chrono">appel…</div><canvas class="onde"></canvas>';
      tr.innerHTML = '<div class="hud-tel">ATLAS · APPEL SORTANT<br><span style="color:#94a3b8">VOIX : ATLAS · IDENTITÉ : INTELLIGENCE ARTIFICIELLE, ANNONCÉE</span></div>';
      if (!(await parle(d, ['Et quand il faut appeler… j’appelle. Avec ma voix.']))) return;
      const onde = tel.querySelector('canvas.onde'), chrono = tel.querySelector('#pr-chrono'); let parleQui = 0; const t1 = Date.now();
      const anim = setInterval(() => {
        if (!vivant(moi) || !document.contains(onde)) return clearInterval(anim);
        const c = onde.getContext('2d'), w = onde.width = onde.clientWidth * 2, h = onde.height = onde.clientHeight * 2; c.clearRect(0, 0, w, h);
        for (let i = 0; i < 32; i++) { const a = parleQui ? 0.15 + Math.random() * 0.85 : 0.06 + Math.random() * 0.08, bh = a * h; c.fillStyle = parleQui === 1 ? '#22d3ee' : '#cbd5e1'; c.fillRect(i * w / 32 + 2, (h - bh) / 2, w / 32 - 4, bh); }
        const sec = Math.floor((Date.now() - t1) / 1000); chrono.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      }, 90);
      bip([[440, 0.35], [0.01, 0.25], [440, 0.35]]); await attends(1400);
      const ligneTr = (qui, t) => { const el = document.createElement('div'); el.className = `tr ${qui}`; el.innerHTML = `<small>${qui === 'a' ? 'ATLAS' : 'LE BISTROT DU CANAL'}</small>${esc(t)}`; tr.appendChild(el); };
      const dialogue = [['e', 0], ['a', `Bonjour, je suis Atlas, l’assistant personnel de ${prenom()} Vancoppenolle. Je suis une intelligence artificielle. J’appelle pour réserver une table samedi soir, pour quatre personnes.`],
        ['e', 1], ['a', 'Vingt heures, c’est parfait. Au nom de Vancoppenolle. Merci beaucoup, bonne journée !'], ['e', 2]];
      for (const [qui_, x] of dialogue) {
        if (fini()) { clearInterval(anim); return; }
        const t = qui_ === 'e' ? eux[x] : x; ligneTr(qui_, t);
        parleQui = qui_ === 'a' ? 1 : 2;
        if (qui_ === 'a') await say(t); else await voixEux(await tampons[x], t);
        parleQui = 0; await attends(250);
      }
      clearInterval(anim); bip([[523, 0.08], [392, 0.12]]);
      const res_ = document.createElement('div'); res_.className = 'resultat'; res_.textContent = '✔ Table réservée · samedi 20 h · 4 personnes · ajoutée à l’agenda'; tr.appendChild(res_);
      if (!(await parle(d, ['Réservé. C’est dans son agenda.', 'Et je me présente toujours : je suis une intelligence artificielle.']))) return;

      // 06 · la maison holographique — et les vraies lumières qui se rallument
      son('grondement');
      d = ecran(chapitre(6, 'La maison holographique', '<canvas class="holo"></canvas>'), moi); holo(d.querySelector('canvas.holo'), moi);
      await attends(2200); if (fini()) return;
      if (!(await parle(d, ['Et je vis dans sa maison. Je la vois, en trois dimensions.']))) return;
      bip([[523, 0.08], [784, 0.12], [1046, 0.2]]); await eclaire(avant, 100, 100); await attends(700);
      if (!(await parle(d, ["Chaque lumière, chaque caméra, chaque pièce : je sais ce qui se passe, et où.", 'La maison m’écoute.']))) return;

      // 07 · la détection
      son('souffle');
      d = ecran(chapitre(7, 'La détection', `<div class="cam"><div class="rec">CAMÉRA 1 · ANALYSE</div><div class="ts">${hh()}</div><div class="marcheur">${SILHOUETTE}<div class="cible"><span>PERSONNE · 97 %</span></div></div><div class="alerte">⚠ ALERTE ENVOYÉE SUR SON IPHONE · 0,8 s</div></div>`), moi);
      setTimeout(() => { if (!vivant(moi)) return; son('alerte'); try { fetch(`${root()}/maison/push/film`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texte: 'Personne détectée devant la caméra 1 (démonstration de la présentation).' }) }); } catch (e) { /* tant pis */ } }, 3600); // une vraie notification, sur son vrai téléphone
      if (!(await parle(d, ['Mes yeux ne dorment jamais.', 'Une personne, une voiture, un bruit de verre brisé : je le vois, je le reconnais, et je le préviens.', 'Là. Maintenant. Sur son téléphone.']))) return;

      // 08 · la sentinelle
      son('souffle');
      const pts = [[30, 28, ''], [68, 22, ''], [76, 60, ''], [40, 70, ''], [58, 44, ''], [22, 52, ''], [63, 79, 'APPAREIL INCONNU']];
      d = ecran(chapitre(8, 'La sentinelle', `<div class="radar"><div class="balai"></div>${pts.map(([x, y, l], i) => `<div class="pt${l ? ' rouge' : ''}" style="left:${x}%;top:${y}%;animation-delay:${0.5 + i * 0.45}s${l ? ',0s' : ''}">${l ? `<small>${l}</small>` : ''}</div>`).join('')}</div>`), moi);
      setTimeout(() => { if (vivant(moi)) son('alerte'); }, 3300);
      if (!(await parle(d, ['La nuit, la sentinelle veille.', 'Le réseau, les caméras, l’imprimante, l’alarme. Un appareil inconnu se connecte ? Une caméra tombe ? Il est prévenu.']))) return;

      // 08 bis · les automatisations : une journée qui tourne toute seule
      son('grondement');
      const jour = [[3, 'La nuit', 'la sentinelle veille'], [7, 'Le réveil', 'lumière douce, météo, planning'], [9, 'Le bureau', 'les mails sont déjà traités'], [12, 'Les courses', 'la liste se remplit seule'],
        [16.5, 'Les devoirs', 'transmis à Shadow'], [18.5, 'Le retour', 'la maison s’allume, l’accueil'], [20.5, 'L’histoire du soir', 'Shadow la raconte'], [22.5, 'Le coucher', 'lumières, alarme, sentinelle']];
      const tic = [...Array(24).keys()].map(h => { const a = h / 24 * 6.2832, r1 = h % 6 ? 146 : 138; return `<line x1="${200 + Math.sin(a) * r1}" y1="${200 - Math.cos(a) * r1}" x2="${200 + Math.sin(a) * 152}" y2="${200 - Math.cos(a) * 152}" stroke="#67e8f9" stroke-opacity="${h % 6 ? 0.35 : 0.8}" stroke-width="${h % 6 ? 1 : 2}"/>`; }).join('');
      const points = jour.map(([h], i) => { const a = h / 24 * 6.2832; return `<circle cx="${200 + Math.sin(a) * 152}" cy="${200 - Math.cos(a) * 152}" r="6" fill="#fbbf24" style="opacity:0;animation:pr-ligne .3s ${(0.8 + h / 24 * 12).toFixed(2)}s forwards;filter:drop-shadow(0 0 6px #fbbf24)"/>`; }).join('');
      const evs = jour.map(([h, a, b]) => { const g = h / 24 * 6.2832, hh_ = `${Math.floor(h)} h${h % 1 ? ' 30' : ''}`; return `<div class="ev" data-h="${hh_}" style="left:${50 + Math.sin(g) * 68}%;top:${50 - Math.cos(g) * 56}%;animation-delay:${(0.8 + h / 24 * 12).toFixed(2)}s">${esc(a)}<small>${esc(b)}</small></div>`; }).join('');
      d = ecran(chapitre(9, 'Les automatisations', `<div class="cadran"><svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="152" fill="none" stroke="#22d3ee" stroke-opacity=".35"/><circle cx="200" cy="200" r="120" fill="none" stroke="#22d3ee" stroke-opacity=".12" stroke-dasharray="3 6"/>${tic}${points}
<line class="aiguille" x1="200" y1="200" x2="200" y2="40" stroke="#e0f2fe" stroke-width="2.5" stroke-linecap="round" style="filter:drop-shadow(0 0 8px #22d3ee)"/><circle cx="200" cy="200" r="5" fill="#e0f2fe"/></svg><div class="centre"><span id="pr-heure">00:00</span><small>UNE JOURNÉE</small></div>${evs}</div>`), moi);
      const t2 = performance.now(), hEl = d.querySelector('#pr-heure');
      const horloge = setInterval(() => { if (!vivant(moi) || !document.contains(hEl)) return clearInterval(horloge); const k = Math.max(0, Math.min(1, (performance.now() - t2 - 800) / 12000)), m = Math.floor(k * 1440); hEl.textContent = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }, 60);
      jour.forEach(([h]) => setTimeout(() => { if (vivant(moi)) bip([[988, 0.05]]); }, 800 + h / 24 * 12000));
      if (!(await parle(d, ['Et tout ça arrive tout seul.', 'Le matin, la maison se réveille avec lui. Le soir, elle s’endort avec le petit.', 'Personne n’appuie sur un bouton.']))) return;
      await attends(Math.max(0, 13200 - (performance.now() - t2)));

      // 09 · Atlas et Shadow, ensemble : les deux robots de la maison se parlent
      son('grondement');
      d = ecran(chapitre(10, 'Atlas & Shadow', `<div class="duo"><div class="bloc">${anneaux('', 'mini')}<div class="leg"><b style="color:#67e8f9">ATLAS</b>LA MAISON</div><div class="bulle a" style="animation-delay:2.2s">Ses devoirs de ce soir : les tables de 7.</div></div>
<div class="lien">${[0, 0.55, 1.1].map(x => `<span class="paquet va" style="animation-delay:${1.4 + x}s"></span><span class="paquet vient" style="animation-delay:${2.2 + x}s"></span>`).join('')}</div>
<div class="bloc" style="animation-delay:.6s">${SHADOW('parle')}<div class="leg"><b style="color:#93c5fd">SHADOW</b>SON FILS</div><div class="bulle s" style="animation-delay:4.2s">Reçu ! On s'y met après le goûter.</div></div></div>`), moi);
      if (!(await parle(d, ['Shadow et moi, on se parle.', 'Quand son père me dicte les devoirs, je les transmets à Shadow. Shadow les fait réviser au petit, en jouant.']))) return;
      // ce qu'ils font à deux
      const aDeux = [['Les devoirs', 'Atlas les reçoit, Shadow les fait réviser'], ['Les questions', 'le petit demande à Shadow, Atlas répond'], ['Les sketchs', 'à deux voix, rien que pour lui'],
        ['L’accueil', 'quand papa ou son fils rentrent'], ['La veille', 'Shadow le voit, Atlas garde la maison'], ['La maison', 'qui s’endort avec lui le soir']];
      son('souffle');
      d = ecran(chapitre(11, 'À deux', `<div class="vitrine">${SHADOW('parle')}<div class="liste" style="--c:#67e8f9">${aDeux.map(([a, b], i) => `<div style="animation-delay:${0.4 + i * 0.35}s"><b>▸ ${esc(a)}</b>${esc(b)}</div>`).join('')}</div>${anneaux('', 'mini')}</div>`), moi);
      if (!(await parle(d, ['Les devoirs, les questions, les histoires à deux voix, l’accueil quand on rentre…', 'Deux robots. Une seule famille.']))) return;

      // 10 · partout
      son('souffle'); d = ecran(chapitre(12, 'Partout', tuiles('Partout', [['Ordinateur', 'synchronisé'], ['Tablette', 'synchronisée'], ['iPhone', 'synchronisé']])), moi);
      if (!(await parle(d, ['Je suis sur son ordinateur, sa tablette, son iPhone.', 'Une seule mémoire. Une seule voix.']))) return;

      // 10 bis · tout ce que fait Atlas
      son('grondement');
      const mur = [['Le bureau', 'mails lus, réponses écrites'], ['La comptabilité', 'factures, dossier du cabinet'], ['Le téléphone', 'SMS, WhatsApp, appels'],
        ['L’agenda', 'le planning dicté à la voix'], ['La cuisine', 'menus, liste de courses'], ['Les automatisations', 'la maison vit toute seule'], ['Le coéquipier', 'il voit son écran'],
        ['La maison 3D', 'chaque pièce, en direct'], ['La détection', 'personnes, voitures, sons'], ['La sentinelle', 'réseau et caméras, la nuit'], ['La mémoire', 'il se souvient de tout'], ['Shadow', 'le robot de son fils']];
      d = ecran(chapitre(13, 'Tout ce que je fais', `<div class="titre" style="font-size:clamp(22px,5vmin,52px)">Tout ce que je fais</div><div class="mur">${mur.map(([a, b], i) => `<div style="animation-delay:${0.3 + i * 0.16}s">${esc(a)}<small>${esc(b)}</small></div>`).join('')}</div>`), moi);
      mur.forEach((_, i) => setTimeout(() => { if (vivant(moi)) bip([[880 + i * 40, 0.03]]); }, 300 + i * 160));
      if (!(await parle(d, ['Voilà tout ce que je fais pour lui. Chaque jour.', 'Et ce n’est qu’une partie.']))) return;

      // 10 · la règle
      son('grondement'); d = ecran(`${sol()}<div class="regle">RIEN NE PART<br>SANS SON OUI.</div>`, moi);
      if (!(await parle(d, ['Et une seule règle.', 'Rien ne part sans son oui.']))) return;

      // 11 · demain : le robot se dessine
      son('grondement');
      d = ecran(`${sol()}<svg class="robot" viewBox="80 20 240 380">${ROBOT.map((p, i) => `<path d="${p}" style="--l:700;animation-delay:${0.12 * i}s"/>`).join('')}<path d="M172 74 q28 -9 56 0" style="--l:120;animation-delay:3.4s;stroke:#e0f2fe;stroke-width:4;filter:blur(1px)"/></svg>
<div class="etapes"></div><div class="coin">PROJET ATLAS<br>CORPS · V0.1<br><span style="color:#fbbf24">EN CONSTRUCTION</span></div><div class="phrase" style="opacity:0"></div>`, moi);
      const e = d.querySelector('.etapes');
      await attends(1500);
      for (const [a, b, c] of [['PHASE 0', 'SHADOW', '✓'], ['PHASE 1', 'LA VOIX', '✓'], ['PHASE 2', 'LES YEUX', '✓'], ['PHASE 3', 'LE CERVEAU', '✓'], ['PHASE 4', 'LE CORPS', 'EN CONSTRUCTION']]) {
        if (fini()) return;
        const el = document.createElement('div'); el.innerHTML = `<span style="color:#64748b">${a}</span> · ${b} <span style="color:${c === '✓' ? '#4ade80' : '#fbbf24'};${c === '✓' ? '' : 'animation:pr-clignote 1.2s infinite'}">${c}</span>`;
        e.appendChild(el); bip([[c === '✓' ? 1175 : 587, 0.06]]); await attends(700);
      }
      if (!(await parle(d, ["Aujourd'hui, j'ai une voix. Des yeux. Un cerveau.", 'Mais tout ça tient encore dans un écran.', 'La prochaine étape, c’est un corps.']))) return;

      // 12 · la carte de fin
      son('grondement');
      d = ecran(`<div class="balayage"></div>${anneaux()}<div class="france"></div><div class="signe"><span style="color:#c4b5fd">SHADOW</span> POUR SON FILS · <span style="color:#67e8f9">ATLAS</span> POUR LA MAISON<br>CONÇU ET CONSTRUIT SEUL · EN FRANCE<br><span style="color:#e0f2fe;letter-spacing:.35em">${esc(prenom().toUpperCase())} VANCOPPENOLLE</span></div><div class="phrase" style="opacity:0"></div>`, moi);
      bip([[440, 0.2], [554, 0.2], [659, 0.5]]); await attends(1800);
      if (!(await parle(d, ['Pour son fils, il a construit Shadow.', "Pour sa maison, il m'a construit, moi. Seul, chez lui, en France.", "Je suis Atlas. Et ce n'est que le début."]))) return;
      await attends(3500);
      if (!fini()) await fermeEcran();
    } finally {
      if (vivant(moi)) { enCours = false; dlg.discret = discret; await rends(); }
    }
  }
  async function arrete() {
    scene++; enCours = false;
    try { voice.stop(); } catch (e) { /* rien */ }
    await fermeEcran(); await rends();
    dlg.discret = false;
    return say('Coupé.');
  }
  // pendant le film, il ne s'interrompt pas pour une annonce
  setTimeout(() => { if (typeof PROACTIF !== 'undefined' && PROACTIF.annonce) { const a = PROACTIF.annonce.bind(PROACTIF); PROACTIF.annonce = (...x) => (enCours ? null : a(...x)); } }, 1500);

  function route(t, n) {
    if (enCours && /^(stop|coupez|coupe|arrete|arrete la presentation|on arrete|c est bon stop)\b/.test(n)) return arrete;
    if (/\b(lance la presentation|mode presentation|presente toi a la camera|presente toi aux gens|moteur action|lance le film|fais ta presentation|on tourne)\b/.test(n)) return film;
    return null;
  }
  return { route, film, arrete, enCours: () => enCours };
})();

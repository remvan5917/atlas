# Atlas — l'assistant personnel

Né du « mode papa » de Shadow, Atlas est devenu un projet à part : toujours disponible, sans code ni mode.
Adresse : https://remvan5917.github.io/atlas/

## L'utiliser
- Touche l'écran une fois (le son et le micro ont besoin d'un geste), puis parle.
- Mot de réveil : **« Atlas »**. Après une réponse, il t'écoute encore un moment sans que tu redises son nom.
- « Atlas, mets-toi en veille », « stop » / « tais-toi », « répète ». Toucher le noyau pendant qu'il parle le fait taire.
- **Un seul Atlas à la fois sur un appareil** : si on l'ouvre ailleurs (l'appli et un onglet Chrome, deux onglets), le dernier démarré prend la main ; l'autre rend le micro et la caméra et affiche « Atlas est ouvert ailleurs » (un toucher pour le reprendre). Il ne dit jamais deux phrases en même temps : elles attendent leur tour.

## Ce qu'il sait faire
- **Un assistant adulte** (IA de film : calme, précis, pince-sans-rire), tout à la voix ; rien ne s'affiche, sauf si tu demandes « affiche-le » (code avec un bouton « Copier »).
- **Internet** : « cherche sur Internet… », « les actus (sur…) », ou une question récente (le cerveau décide de chercher). D'abord la recherche web de Groq (gpt-oss-120b, outil *browser_search*), en secours l'ordinateur de la maison (Google Actualités en RSS, Wikipédia).
- **La vue** (option « vision détaillée ») : « qu'est-ce que tu vois ? », « qu'est-ce que je tiens ? » — une photo de la caméra est envoyée à Groq pour la décrire, la caméra se referme toute seule après une minute.
- **Le couteau suisse** (`outils.js`, sans le grand cerveau) : calculs exacts et HT/TTC, conversions d'unités et de devises (BCE), minuteurs nommés, réveil, chrono, Pomodoro, listes partagées, météo de n'importe quelle ville, état du PC, « fais-moi le point », heure dans le monde, jours avant une date, pile ou face.
- **Notes et rappels** : « note que… », « lis mes notes », « rappelle-moi de sortir le linge dans 20 minutes / à 18 heures ».
- **La journée de ton fils avec Shadow** et l'agenda de la famille : lus dans la mémoire de Shadow (Atlas n'y écrit que pour effacer, quand tu le demandes).

## Sa mémoire de toi (`memoire.js`)
- Après quelques échanges (ou un moment de calme), le cerveau relit la conversation et **retient tout seul ce qui dure** : goûts, habitudes, projets, les gens de ta vie, et les choses prévues à un jour précis (« jeudi, dentiste à 10 h » → la vraie date, prise dans un calendrier tout prêt : les petits cerveaux se trompent en comptant les jours).
- Il s'en sert naturellement (« la dernière fois, tu disais que… »), sans réciter.
- « Souviens-toi que… », « qu'est-ce que tu sais sur moi ? », « qu'est-ce que tu as retenu aujourd'hui ? », « oublie que… », « oublie tout ce que tu sais » (avec confirmation).
- Jamais de mot de passe, de code, de numéro de carte ou de compte, ni de détail de santé. Tout se voit et s'efface dans les réglages (« Ce qu'il sait de toi »). Gardée sur tes appareils et sur l'ordinateur de la maison (`/atlas/etat`), comme les notes.

## Il parle le premier (`proactif.js`)
- Une file d'annonces : chacune attend qu'il se taise et que personne ne parle, et qu'il y ait quelqu'un (vu ou entendu depuis 20 minutes) ; la nuit (22 h 30 – 7 h), seulement l'urgent. Un petit signal sonore avant. Chaque annonce n'est dite qu'une fois.
- **Le briefing du matin** : la première fois qu'il te reconnaît le matin (voix, visage, ou quand tu l'appelles), juste après le bonjour : la météo et l'heure de la pluie, tes rappels, ce que tu lui as dit pour aujourd'hui, l'agenda de la famille, l'or et les annonces du jour. Au démarrage le matin, il le dit tout de suite.
- **La pluie** qui arrive dans 10 à 50 minutes (Open-Meteo, toutes les 10 minutes) ; **l'ordinateur** de la maison qui chauffe (88 °C) ou se remplit (92 %).
- Réglage : « Il prend la parole de lui-même ».

## Les marchés (`marche.js`) — des infos, jamais des conseils
- L'ordinateur de la maison relève les cours toutes les 2 minutes et garde 3 jours (`/atlas/marche`, fichier `memoire/marche.json`) : **or et argent au comptant, cuivre** (gold-api.com), **euro-dollar** (déduit de l'or en euros, à un pip près). Pas de source gratuite fiable pour les indices (Yahoo et la bourse CME refusent les programmes) : il le dit.
- Le **calendrier économique** de la semaine (ForexFactory, toutes les heures) : États-Unis et zone euro, traduit pour l'oral (« les inscriptions hebdomadaires au chômage, prévu 200 mille, précédent 199 mille »).
- « Le cours de l'or », « où en est l'euro-dollar », « le point des marchés », « les annonces du jour / de demain / de la semaine », « affiche le graphique de l'or » (24 h, ou « sur 3 jours ») : un **zigzag et un canal tracés à la main**, sans signaux ni niveaux.
- **Alertes** : 5 minutes avant une annonce à fort impact, et avant l'ouverture de Wall Street (9 h 30 à New York, l'heure d'été américaine comprise). Réglage : « Les marchés ».

## La maison (`maison.js`) — prises et lampes Smart Life
- **Une prise peut alimenter n'importe quoi** (télé, ventilateur, radiateur, congélateur, box…) :
  - ce qui doit rester allumé (congélateur, frigo, box, routeur, l'ordinateur de la maison, aquarium, chaudière… reconnus à leur nom, ou la case « Toujours allumé ») n'est **jamais coupé par « éteins tout » ni par une scène** ; le couper par son nom demande une confirmation ;
  - ce qui chauffe (radiateur, bouilloire, fer, four, plaque…) n'est **jamais allumé par « allume tout »** ;
  - le cerveau ne coupe ni n'allume jamais ces appareils de lui-même ;
  - autoriser à Shadow un appareil qui chauffe ou qui doit rester allumé demande une confirmation.
- L'ordinateur de la maison les pilote **en direct sur le réseau de la maison** (tinytuya, dans `~/.local/share/shadow/venv`), et passe par le cloud Tuya seulement si un appareil ne répond pas. Les clés des appareils restent dans `~/.local/share/shadow/maison/` (droits 700/600), jamais renvoyées aux pages.
- « Allume la lampe du salon », « éteins tout », « allume les lumières », « qu'est-ce qui est allumé ? », « est-ce que la prise du bureau est allumée ? ».
- **Les scènes** : « enregistre la scène film » garde l'état de la maison à ce moment ; « mode film » le rejoue. Elles voyagent entre appareils comme les notes.
- Le cerveau peut aussi piloter tout seul (« il fait sombre ici » → [[allume:…]]).
- **Les relier (une fois, puis à chaque nouvel appareil)** : brancher les prises et les ajouter dans Smart Life ; créer un projet sur iot.tuya.com (Cloud → Create Cloud Project, Smart Home, data center *Central Europe*), y lier le compte Smart Life (Devices → Link App Account → scanner le QR avec Smart Life), copier l'Access ID et l'Access Secret ; puis lancer sur l'ordinateur `~/.local/share/shadow/maison/connecter.sh` (l'assistant de tinytuya demande ces deux clés et la région `eu`). Atlas trouve les appareils dans la minute.

## La sécurité (`securite.js`) — l'alarme Verisure et les caméras EZVIZ
- **L'alarme** : « l'alarme est activée ? », « active l'alarme en mode total / partiel » (avec confirmation). Chez nous, on désactive toujours avant de changer de mode : Atlas ne l'active **que si elle est désactivée**, sinon il te dit de la désactiver d'abord. Il ne la **désactive jamais** (aucune adresse n'existe pour ça : badge, clavier ou appli Verisure). Un enfant ne peut pas l'activer. Au plus 3 activations en 10 minutes ; une porte ou fenêtre ouverte : il ne force jamais.
  - Le service `shadow-verisure` (127.0.0.1:11437, `~/.local/share/shadow/verisure/`) utilise le module `verisure_owa_api` (Verisure France = l'ancien Securitas Direct ; licence Apache-2.0, version figée dans `VERSION`) avec aiohttp et pydantic dans le venv.
  - **Le relier** (une fois) : `~/.local/share/shadow/venv/bin/python ~/.local/share/shadow/verisure/connecter.py` — identifiant, mot de passe (utilisé une seule fois, jamais gardé), code SMS ; le jeton reste dans `compte.json` (600).
- **Les caméras** (EZVIZ en RTSP, et les caméras Tuya comme **LSC Smart Connect**) : « montre-moi l'entrée » → **le direct, vidéo et son** (converti à la volée par l'ordinateur en MP4 fragmenté, un seul direct à la fois, 3 minutes au plus ; ses oreilles se coupent le temps du direct) ; « une photo de l'entrée » → une image ; « qu'est-ce qui se passe dans le jardin ? » → il regarde et répond. Rien n'est enregistré.
- **La vision de la maison** : le modèle **gemma3:4b** (Ollama, `/maison/vision`) décrit les images des caméras et celles de sa propre caméra (« qu'est-ce que tu vois ? ») **sans qu'elles quittent la maison** (environ 10 secondes ; sur la carte graphique de 4 Go, il prend la place du cerveau de Shadow le temps d'une image). Groq ne sert qu'en secours, si la vision détaillée est activée.
- **Une caméra LSC Smart Connect** : l'ajouter dans l'appli **Smart Life** (pas l'appli LSC), relancer `maison/connecter.sh`, et sur iot.tuya.com activer le service « IoT Video Live Stream » du projet : le cloud Tuya donne alors une adresse de flux à l'ordinateur.
  - **Les relier** : installer ffmpeg (`sudo apt install ffmpeg`), activer le flux local (RTSP) de chaque caméra dans l'appli EZVIZ, puis lancer `~/.local/share/shadow/maison/cameras.py` : il trouve les caméras, demande un nom et le code de vérification (étiquette de la caméra), gardé dans `maison/cameras.json` (600).

## La sentinelle — il détecte seul ce qui est suspect
Un service de l'ordinateur (`shadow-sentinelle`, `~/.local/share/shadow/maison/sentinelle.py`) surveille en continu et écrit ses alertes ; Atlas les relève toutes les 20 secondes et les dit (les urgentes tout de suite, même la nuit ; avec la photo s'il y en a une).
- **Le réseau** : un appareil jamais vu qui se connecte (avec son fabricant, ou « adresse privée » pour un téléphone) — urgent la nuit ou en mode absent.
- **Tailscale** : un nouvel appareil dans ton réseau privé (urgent).
- **L'ordinateur** : des connexions à distance ratées, 3 mots de passe ratés en 3 minutes, un nouveau service ouvert sur le réseau, un programme inconnu qui occupe la machine 10 minutes, une session ouverte à distance.
- **La caméra** (la nuit de 22 h à 7 h, ou en mode absent) : un mouvement → la vision de la maison regarde s'il y a clairement une personne (pas une voiture, un reflet, un arbre) ; un bruit fort (seulement un niveau sonore : jamais les paroles). Rien n'est enregistré, sauf la photo d'une alerte, 7 jours.
- **L'alarme** (une fois reliée) : ses changements d'état ; le mode total met la maison en mode absent. **Les prises** : un appareil qui chauffe allumé depuis 3 heures, une prise qui s'allume en mode absent.
- Ce qu'il apprend au départ (les appareils, les services) devient la référence : il ne signale que ce qui change.
- « Je pars » / « mode absent », « je suis rentré » ; « il s'est passé quoi ? », « rapport de sécurité », « montre la dernière alerte ».

## Le lien avec Shadow
- **Les lumières de Shadow** : tu choisis ce que Shadow peut piloter (« autorise Shadow à allumer la lampe de la chambre », ou une case « Shadow » par appareil dans les réglages). C'est **l'ordinateur de la maison** qui garde la liste et refuse tout le reste (`/maison/shadow`), avec au plus 12 commandes en 10 minutes. « Interdis la veilleuse à Shadow », « interdis les lumières à Shadow » (tout est coupé), « rends les lumières à Shadow », « qu'est-ce que Shadow peut allumer ? ». Option : à la fin de l'histoire du soir, Shadow éteint ses lampes.
- **Le messager** : « dis à mon fils que je rentre à 19 h », « demande à mon fils de ranger sa chambre » (→ « Papa te demande de ranger ta chambre »), « laisse un message à mon fils : bravo ». Le message attend sur l'ordinateur (`/maison/messages`, 3 jours) ; Shadow le dit dès que l'enfant est là, puis propose de répondre. Sa réponse (« Shadow, dis à papa que… ») arrive chez Atlas, qui te la dit quand tu es là. « J'ai des messages ? ».
- **Ce que Shadow a appris** : « qu'est-ce que Shadow a appris aujourd'hui / cette semaine ? » (souvenirs, consignes, jeux et devinettes appris, numérotés) ; « efface le deux », « efface tout ce que Shadow a appris aujourd'hui », « dis à Shadow d'oublier que… » (avec confirmation). C'est le **seul** cas où Atlas écrit dans la mémoire de Shadow, et seulement pour oublier : une pierre tombale, que tous les appareils de Shadow appliquent à leur synchronisation.

## Le mode conversation (activé par défaut)
- **Il sait qui parle** : empreinte de voix calculée sur l'appareil (que des nombres, jamais d'enregistrement), reprise de Shadow — les voix déjà apprises par Shadow sont reconnues aussi. « Atlas, apprends ma voix », « qui parle ? », « oublie la voix de… ». Une voix inconnue devient « invité 1 », « invité 2 »… le temps de la soirée.
- **Il suit la discussion** (fil en mémoire vive, 20 minutes au plus, jamais enregistré) et **n'intervient que s'il apporte quelque chose** : une question à laquelle il sait répondre, une erreur sur un fait ; jamais pendant une dispute, une conversation intime, ou avec un enfant qui ne lui parle pas ; au plus une intervention spontanée toutes les deux minutes. Il ne réfléchit pas à chaque phrase (seulement aux questions, ou de temps en temps), pour économiser le cerveau.
- Quand on l'appelle, il répond à la bonne personne (par son prénom) ; juste après sa réponse, la même personne peut enchaîner sans redire « Atlas ».
- **Seul avec lui** (personne d'autre n'a parlé ces 4 dernières minutes), il répond à tout ce qu'on lui dit, sans qu'on dise son nom ; le mode conversation, discret, ne s'active que quand plusieurs personnes parlent. Son nom est reconnu même mal transcrit (« Atlass », « At last », « Hatlas »…), avec un petit bip.
- Une voix inconnue qui lui a déjà parlé, ou qui est là depuis plus de 10 minutes, n'est jamais accueillie comme un invité ; il propose plutôt d'apprendre la voix.
- **Diagnostic** (réglages) : ce qu'il a entendu en dernier et ce qu'il en a fait (répondu, écouté, en veille…), et quel cerveau, quelles oreilles, quelle voix il utilise.
- **Il accueille une voix inconnue** (un invité) une fois par soirée, et se présente sur demande (« Atlas, présente-toi »).
- **Il accueille ceux qui arrivent** : quelqu'un de la famille qu'il n'a ni vu ni entendu depuis 3 heures (« Bonsoir Maman, bon retour »), à la voix ou à la caméra (`yeux.js`, repris de Shadow : il reconnaît les visages que Shadow a appris, sur l'appareil, sans jamais modifier la mémoire de Shadow ; aucune image n'est envoyée). Un visage inconnu bien visible ou une voix inconnue : il accueille l'invité (une fois par soirée). Ceux qui sont déjà là au démarrage ne sont pas accueillis.
- Ce qui commence par « Shadow… » et la réponse de Shadow ne le concernent pas.
- **Et dans l'autre sens** : quand Atlas parle, il le signale à l'ordinateur de la maison (`/atlas/parle`) ; Shadow, qui écoute la même pièce, ignore ce qu'il a entendu pendant ce moment-là. Atlas ne peut donc ni discuter avec Shadow ni lui apprendre des choses (Atlas ne fait que lire la mémoire de Shadow, jamais l'écrire).
- En mode conversation, il écoute la pièce avec les oreilles de la maison (whisper.cpp sur l'ordinateur) : le son ne sort pas de chez toi. « Reste discret » / « participe à la conversation », ou dans les réglages.
- Pense à prévenir les invités (et la famille) qu'Atlas écoute.

## Le noyau et la voix
- Le noyau (`noyau.js`) : sphère de particules 3D, cœur lumineux, anneaux, couronne de fréquences qui suit le vrai son de sa voix (et ta voix quand il écoute), et l'affichage de bord.
- La voix (`voix.js`) : **la voix ElevenLabs de papa en priorité** (clé + Voice ID dans les réglages ; modèle v4 turbo par défaut ; une très légère touche numérique façon JARVIS, réglable) ; si ElevenLabs ne répond pas ou si le crédit est épuisé, la voix de l'ordinateur (futuriste par défaut, holographique, synthétique, ou les robots inquiétants, Pierre, Jessica, Tom — Piper puis traitée dans le téléphone, sans écho), puis celle du téléphone, naturelle. La clé ElevenLabs reste sur l'appareil ; le Voice ID et le modèle voyagent entre appareils.

## L'ordinateur de la maison (le même que pour Shadow)
Le relais `~/.local/share/shadow/ollama-pont.py` sert les deux assistants :
- `/shadow/voix` (Piper), `/shadow/oreilles` (whisper.cpp), `/shadow/web` (actus et Wikipédia), `/shadow/pc` (état du PC, lecture seule) ;
- `/atlas/etat` : **la mémoire partagée d'Atlas** (notes, listes, ville, voix), fichier `memoire/atlas.json`, séparé de celui de Shadow, sauvegardé chaque jour (14 jours) ;
- `/shadow/etat` : la mémoire de Shadow, qu'Atlas lit seulement.

## Vie privée
- La clé Groq reste sur l'appareil où on l'a tapée (elle n'est jamais partagée ni écrite dans le code).
- Aucun prénom n'est écrit dans le code : celui de l'enfant est lu à l'exécution dans la mémoire de Shadow.
- Au premier démarrage sur un appareil où Shadow est installé, Atlas reprend ses réglages (cerveau, adresse, voix, ville) et les notes et listes de l'ancien mode papa.

## Mettre à jour
À chaque version : `window.ATLAS_VERSION` dans `index.html`, les `?v=N` des fichiers, et `CACHE` dans `sw.js`.
Atlas se met à jour tout seul au démarrage (sinon Ctrl + Maj + R).

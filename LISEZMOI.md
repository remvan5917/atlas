# Atlas — l'assistant personnel

Né du « mode papa » de Shadow, Atlas est devenu un projet à part : toujours disponible, sans code ni mode.
Adresse : https://remvan5917.github.io/atlas/

## L'utiliser
- Touche l'écran une fois (le son et le micro ont besoin d'un geste), puis parle.
- Mot de réveil : **« Atlas »**. Après une réponse, il t'écoute encore un moment sans que tu redises son nom.
- « Atlas, mets-toi en veille », « stop » / « tais-toi », « répète ». Toucher le noyau pendant qu'il parle le fait taire.

## Ce qu'il sait faire
- **Un assistant adulte** (IA de film : calme, précis, pince-sans-rire), tout à la voix ; rien ne s'affiche, sauf si tu demandes « affiche-le » (code avec un bouton « Copier »).
- **Internet** : « cherche sur Internet… », « les actus (sur…) », ou une question récente (le cerveau décide de chercher). D'abord la recherche web de Groq (gpt-oss-120b, outil *browser_search*), en secours l'ordinateur de la maison (Google Actualités en RSS, Wikipédia).
- **La vue** (option « vision détaillée ») : « qu'est-ce que tu vois ? », « qu'est-ce que je tiens ? » — une photo de la caméra est envoyée à Groq pour la décrire, la caméra se referme toute seule après une minute.
- **Le couteau suisse** (`outils.js`, sans le grand cerveau) : calculs exacts et HT/TTC, conversions d'unités et de devises (BCE), minuteurs nommés, réveil, chrono, Pomodoro, listes partagées, météo de n'importe quelle ville, état du PC, « fais-moi le point », heure dans le monde, jours avant une date, pile ou face.
- **Notes et rappels** : « note que… », « lis mes notes », « rappelle-moi de sortir le linge dans 20 minutes / à 18 heures ».
- **La journée de ton fils avec Shadow** et l'agenda de la famille : lus dans la mémoire de Shadow, **sans jamais y écrire**.

## Le mode conversation (activé par défaut)
- **Il sait qui parle** : empreinte de voix calculée sur l'appareil (que des nombres, jamais d'enregistrement), reprise de Shadow — les voix déjà apprises par Shadow sont reconnues aussi. « Atlas, apprends ma voix », « qui parle ? », « oublie la voix de… ». Une voix inconnue devient « invité 1 », « invité 2 »… le temps de la soirée.
- **Il suit la discussion** (fil en mémoire vive, 20 minutes au plus, jamais enregistré) et **n'intervient que s'il apporte quelque chose** : une question à laquelle il sait répondre, une erreur sur un fait ; jamais pendant une dispute, une conversation intime, ou avec un enfant qui ne lui parle pas ; au plus une intervention spontanée toutes les deux minutes. Il ne réfléchit pas à chaque phrase (seulement aux questions, ou de temps en temps), pour économiser le cerveau.
- Quand on l'appelle, il répond à la bonne personne (par son prénom) ; juste après sa réponse, la même personne peut enchaîner sans redire « Atlas ».
- **Il accueille une voix inconnue** (un invité) une fois par soirée, et se présente sur demande (« Atlas, présente-toi »).
- **Il accueille ceux qui arrivent** : quelqu'un de la famille qu'il n'a ni vu ni entendu depuis 3 heures (« Bonsoir Maman, bon retour »), à la voix ou à la caméra (`yeux.js`, repris de Shadow : il reconnaît les visages que Shadow a appris, sur l'appareil, sans jamais modifier la mémoire de Shadow ; aucune image n'est envoyée). Un visage inconnu bien visible ou une voix inconnue : il accueille l'invité (une fois par soirée). Ceux qui sont déjà là au démarrage ne sont pas accueillis.
- Ce qui commence par « Shadow… » et la réponse de Shadow ne le concernent pas.
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

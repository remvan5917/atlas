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

## Le noyau et la voix
- Le noyau (`noyau.js`) : sphère de particules 3D, cœur lumineux, anneaux, couronne de fréquences qui suit le vrai son de sa voix (et ta voix quand il écoute), et l'affichage de bord.
- La voix (`voix.js`) : robot sombre (par défaut), démon de métal, robot glacial, ou une voix humaine (Pierre, Jessica, Tom), fabriquées par l'ordinateur de la maison (Piper) puis traitées dans le téléphone, sans écho.

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

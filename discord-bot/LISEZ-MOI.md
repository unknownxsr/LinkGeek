# Bot Discord LinkGeek

## Ce qu'il fait
- `/classement` : top 10 de la semaine (les mêmes heures que dans le launcher)
- `/telecharger` : lien de la dernière version
- `/stats` : nombre de joueurs Linkgeek
- Annonce chaque nouvelle version GitHub dans **#mises-à-jour** (vérifie toutes les 10 min)
- Poste le podium de la semaine le **lundi matin** dans **#duels**

## Installation (une seule fois)
1. **Le jeton Discord** : sur https://discord.com/developers/applications → ton application → **Bot** → **Reset Token** → copie-le.
2. Copie `.env.example` en `.env`, ouvre-le avec le Bloc-notes et colle le jeton après `DISCORD_TOKEN=`.
3. **La clé Firebase** : console Firebase (compte LinkGeek) → ⚙️ **Paramètres du projet** → **Comptes de service** → **Générer une nouvelle clé privée**. Renomme le fichier téléchargé en `cle-firebase.json` et mets-le dans ce dossier.
4. Double-clique sur **Lancer le bot.cmd**. La première fois, il installe ce qu'il faut (1 minute).

Quand la fenêtre affiche « ✅ Connecté », le bot est en ligne. Il le reste tant que la fenêtre est ouverte.

## ⚠️ Sécurité
`.env` et `cle-firebase.json` donnent un accès total à ton bot et à ta base. Ne les envoie à personne. Ils sont exclus de GitHub par `.gitignore`.

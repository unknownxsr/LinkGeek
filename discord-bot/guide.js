/**
 * Contenu du salon « guide » : un message d'intro puis une section par fonctionnalité,
 * chacune avec une capture du launcher (dossier guide/).
 * {telecharger} et {aide} sont remplacés par les mentions des salons du serveur.
 */
const INTRO = {
  title: '📖 Guide de Linkgeek',
  text: 'Linkgeek réunit **tous tes jeux PC dans un seul launcher** : Steam, Epic Games, Xbox / Microsoft Store, Battle.net, Ubisoft Connect, EA app et GOG.\n\n'
    + 'Il trouve tes jeux tout seul, suit ton temps de jeu, et ajoute tout ce qu\'il faut pour jouer avec tes amis : défis, niveaux, cartes à collectionner, duels, messagerie…\n\n'
    + 'Voici le tour complet des fonctionnalités 👇\n\n'
    + '⬇️ Télécharger : {telecharger}\n❓ Une question ou un souci : {aide}',
};

const SECTIONS = [
  {
    title: '🏠 Accueil', image: 'accueil.png',
    text: '• Une grande bannière pour **reprendre ta dernière partie** en un clic.\n'
      + '• Le **classement général de la semaine** (remis à zéro chaque lundi) et tes amis connectés.\n'
      + '• **Personnaliser l\'accueil** : choisis les blocs affichés et leur ordre.\n\n'
      + '**La barre du haut**\n'
      + '🔔 Notifications · 💬 Messages · 📺 Mode TV · 🔗 Partager · ☀️/🌙 Ne pas déranger (il s\'active tout seul pendant que tu joues).',
  },
  {
    title: '📚 Bibliothèque', image: 'bibliotheque.png',
    text: '• Tous tes jeux **détectés automatiquement**, avec leurs jaquettes.\n'
      + '• Trie et filtre par plateforme, favoris, **collections** (En cours, À finir…) et genres.\n'
      + '• Recherche rapide avec **Ctrl+K**, ou ajoute un jeu à la main.\n'
      + '• La page de chaque jeu affiche le temps de jeu, la dernière session, la place sur le disque, l\'activité des 30 derniers jours et les actualités du jeu.\n\n'
      + '⏱️ Le **temps de jeu est suivi automatiquement**, quel que soit le launcher utilisé : Linkgeek reste discrètement dans la barre des tâches.',
  },
  {
    title: '👥 Amis', image: 'amis.png',
    text: '• Ajoute tes amis avec leur **code ami** et vois en direct s\'ils sont en ligne ou **à quel jeu ils jouent**.\n'
      + '• **Invite un ami** à rejoindre ta partie.\n'
      + '• 🏆 **Classement** entre amis.\n'
      + '• ⚔️ **Duels de la semaine** : « qui joue le plus à … ? » ou « qui fait le plus de défis ? ». Chacun mise des Geek Coins, le gagnant remporte tout.\n'
      + '• 🔎 **Coéquipiers** : affiche pendant 24 h que tu cherches quelqu\'un pour jouer.\n'
      + '• 🎁 **Parrainage** : un ami installe Linkgeek avec ton code et vous recevez chacun un booster gratuit.\n'
      + '• Un **profil** personnalisable : photo, titre, contour, succès en vitrine et tes 5 jeux préférés.',
  },
  {
    title: '💬 Messagerie', image: 'messages.png',
    text: '• Discute avec tes amis directement dans le launcher (bouton 💬 en haut, ou sur la carte d\'un ami).\n'
      + '• Notification quand tu reçois un message, même pendant une partie.\n'
      + '• **Entrée** pour envoyer, **Maj+Entrée** pour aller à la ligne.\n'
      + '• Les messages sont gardés **1 semaine**, puis supprimés automatiquement.',
  },
  {
    title: '🎯 Défis, niveaux et badges', image: 'defis.png',
    text: '• **Défis du jour, de la semaine et uniques** : joue et gagne de l\'XP.\n'
      + '• Monte de **niveau** et débloque des **badges** : Recrue, Bronze, Argent, Or, Platine, Diamant, Émeraude, Master.\n'
      + '• 🔥 **Série de connexion** : reviens chaque jour pour gagner de plus en plus de Geek Coins.',
  },
  {
    title: '🃏 Succès et cartes à collectionner', image: 'cartes.png',
    text: '• Des **succès** à débloquer en jouant, à mettre en vitrine sur ton profil.\n'
      + '• **Ouvre des boosters** (3 par jour) et complète les séries de cartes.\n'
      + '• 5 raretés (Commune, Rare, Épique, Légendaire, Mythique), avec des versions **skin** et **holographique**.\n'
      + '• ♻️ **Fusion des doubles** : 15 communes donnent 1 rare, 20 rares donnent 1 épique.',
  },
  {
    title: '🛍️ Boutique et Geek Coins', image: 'boutique.png',
    text: '• Gagne des **Geek Coins** avec les défis, les niveaux et ta série de connexion.\n'
      + '• 🎡 **Roulette du jour** : un tour gratuit chaque jour (Geek Coins, XP ou un thème au hasard).\n'
      + '• Dépense tes Geek Coins en **thèmes** et **titres** pour personnaliser Linkgeek et ton profil.\n'
      + '• Des **éditions limitées** arrivent pendant les événements.',
  },
  {
    title: '📊 Statistiques', image: 'stats.png',
    text: '• Ton temps de jeu total, de la semaine, l\'espace occupé et le nombre de jeux.\n'
      + '• Tes **records** : session la plus longue, plus longue série, jour le plus joué.\n'
      + '• **Quand tu joues** : les heures et les jours où tu joues le plus.\n'
      + '• Compare-toi à la semaine dernière ou à tes amis, **exporte en image** et découvre ton **récap du mois**.',
  },
  {
    title: '📺 Mode TV / manette', image: 'tv.png',
    text: '• Une interface **en grand et en plein écran**, pensée pour la télé et la manette.\n'
      + '• Ouvre-la avec le bouton 📺 en haut, ou avec le bouton **☰** de ta manette.\n'
      + '• **A** pour choisir, **B** pour revenir, **LB/RB** pour changer d\'onglet, **X** pour jouer, **Y** pour les favoris.\n'
      + '• Le bouton écran en haut à droite te ramène au mode bureau.',
  },
  {
    title: '⚙️ Et aussi…', image: null,
    text: '• 🎨 **Thèmes** et apparence au choix.\n'
      + '• 🌍 Linkgeek en **français, anglais, espagnol, allemand et russe** (il suit la langue de Windows).\n'
      + '• 🎮 **Discord** : affiche à quoi tu joues sur ton profil Discord.\n'
      + '• 🚀 Lancement au **démarrage de Windows** (facultatif).\n'
      + '• 🔄 **Mises à jour automatiques** : tu as toujours la dernière version.\n\n'
      + 'Une idée pour améliorer Linkgeek ? Partage-la dans le salon des suggestions. Bon jeu ! 🎮',
  },
];

/* ---------- English version (shown under each French section) ---------- */
const INTRO_EN = {
  title: '📖 Linkgeek guide',
  text: 'Linkgeek brings **all your PC games into one launcher**: Steam, Epic Games, Xbox / Microsoft Store, Battle.net, Ubisoft Connect, EA app and GOG.\n\n'
    + 'It finds your games on its own, tracks your playtime, and adds everything you need to play with friends: challenges, levels, collectible cards, duels, messaging…\n\n'
    + 'Here is the full tour 👇\n\n'
    + '⬇️ Download: {telecharger}\n❓ A question or a problem: {aide}',
};

const SECTIONS_EN = [
  { title: '🏠 Home',
    text: '• A big banner to **resume your last game** in one click.\n'
      + '• The **weekly global leaderboard** (reset every Monday) and your online friends.\n'
      + '• **Customize the home page**: pick which blocks are shown and in what order.\n\n'
      + '**Top bar**\n'
      + '🔔 Notifications · 💬 Messages · 📺 TV mode · 🔗 Share · ☀️/🌙 Do not disturb (turns on by itself while you play).' },
  { title: '📚 Library',
    text: '• All your games **detected automatically**, with their covers.\n'
      + '• Sort and filter by platform, favorites, **collections** (Playing, To finish…) and genres.\n'
      + '• Quick search with **Ctrl+K**, or add a game by hand.\n'
      + '• Each game page shows playtime, last session, disk space, activity over the last 30 days and game news.\n\n'
      + '⏱️ **Playtime is tracked automatically**, whatever launcher you use: Linkgeek stays quietly in the system tray.' },
  { title: '👥 Friends',
    text: '• Add friends with their **friend code** and see live if they are online or **what they are playing**.\n'
      + '• **Invite a friend** to join your game.\n'
      + '• 🏆 **Leaderboard** between friends.\n'
      + '• ⚔️ **Weekly duels**: "who plays … the most?" or "who completes the most challenges?". Everyone bets Geek Coins, the winner takes it all.\n'
      + '• 🔎 **Teammates**: show for 24 h that you are looking for someone to play with.\n'
      + '• 🎁 **Referral**: a friend installs Linkgeek with your code and you both get a free booster.\n'
      + '• A customizable **profile**: picture, title, frame, showcased achievements and your 5 favorite games.' },
  { title: '💬 Messaging',
    text: '• Chat with your friends right inside the launcher (💬 button at the top, or on a friend\'s card).\n'
      + '• A notification when you get a message, even during a game.\n'
      + '• **Enter** to send, **Shift+Enter** for a new line.\n'
      + '• Messages are kept for **1 week**, then deleted automatically.' },
  { title: '🎯 Challenges, levels and badges',
    text: '• **Daily, weekly and one-time challenges**: play and earn XP.\n'
      + '• **Level up** and unlock **badges**: Rookie, Bronze, Silver, Gold, Platinum, Diamond, Emerald, Master.\n'
      + '• 🔥 **Login streak**: come back every day to earn more and more Geek Coins.' },
  { title: '🃏 Achievements and collectible cards',
    text: '• **Achievements** to unlock by playing, to showcase on your profile.\n'
      + '• **Open boosters** (3 per day) and complete card sets.\n'
      + '• 5 rarities (Common, Rare, Epic, Legendary, Mythic), with **skin** and **holographic** versions.\n'
      + '• ♻️ **Merge duplicates**: 15 commons make 1 rare, 20 rares make 1 epic.' },
  { title: '🛍️ Shop and Geek Coins',
    text: '• Earn **Geek Coins** with challenges, levels and your login streak.\n'
      + '• 🎡 **Daily wheel**: one free spin every day (Geek Coins, XP or a random theme).\n'
      + '• Spend your Geek Coins on **themes** and **titles** to customize Linkgeek and your profile.\n'
      + '• **Limited editions** arrive during events.' },
  { title: '📊 Statistics',
    text: '• Your total and weekly playtime, disk space used and number of games.\n'
      + '• Your **records**: longest session, longest streak, most played day.\n'
      + '• **When you play**: the hours and days you play the most.\n'
      + '• Compare yourself with last week or with your friends, **export as an image** and discover your **monthly recap**.' },
  { title: '📺 TV / controller mode',
    text: '• A **big, full-screen** interface, made for the TV and a controller.\n'
      + '• Open it with the 📺 button at the top, or with the **☰** button on your controller.\n'
      + '• **A** to select, **B** to go back, **LB/RB** to switch tabs, **X** to play, **Y** for favorites.\n'
      + '• The screen button at the top right takes you back to desktop mode.' },
  { title: '⚙️ And also…',
    text: '• 🎨 **Themes** and appearance of your choice.\n'
      + '• 🌍 Linkgeek in **English, French, Spanish, German and Russian** (it follows your Windows language).\n'
      + '• 🎮 **Discord**: shows what you are playing on your Discord profile.\n'
      + '• 🚀 Launch at **Windows startup** (optional).\n'
      + '• 🔄 **Automatic updates**: you always have the latest version.\n\n'
      + 'An idea to improve Linkgeek? Share it in the suggestions channel. Have fun! 🎮' },
];

module.exports = { INTRO, SECTIONS, INTRO_EN, SECTIONS_EN };

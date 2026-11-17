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
      + '• 🌍 Linkgeek en **français ou en anglais**.\n'
      + '• 🎮 **Discord** : affiche à quoi tu joues sur ton profil Discord.\n'
      + '• 🚀 Lancement au **démarrage de Windows** (facultatif).\n'
      + '• 🔄 **Mises à jour automatiques** : tu as toujours la dernière version.\n\n'
      + 'Une idée pour améliorer Linkgeek ? Partage-la dans le salon des suggestions. Bon jeu ! 🎮',
  },
];

module.exports = { INTRO, SECTIONS };

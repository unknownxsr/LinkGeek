/**
 * English version of the interface.
 * The app is written in French; when English is selected, every text node and
 * the title/placeholder attributes are translated as they appear on screen
 * (exact phrases first, then patterns for text with numbers or names).
 * Switching back to French reloads the window.
 */
(function () {
  const D = {
    // ---- navigation & common ----
    'Accueil': 'Home', 'Amis': 'Friends', 'Défis': 'Challenges', 'Succès': 'Achievements', 'Bibliothèque': 'Library',
    'Statistiques': 'Statistics', 'Paramètres': 'Settings', 'Joués récemment': 'Recently played', 'Ajouter un jeu': 'Add a game',
    'Rescanner les bibliothèques': 'Rescan libraries', 'Rechercher dans ta bibliothèque…  (Ctrl+K)': 'Search your library…  (Ctrl+K)',
    'Modifier mon profil': 'Edit my profile', 'Annuler': 'Cancel', 'Enregistrer': 'Save', 'Supprimer': 'Delete', 'Renommer': 'Rename',
    'Retour': 'Back', 'Ouvrir': 'Open', 'Ajouter': 'Add', 'Retirer': 'Remove', 'Changer': 'Change', 'Appliquer': 'Apply', 'Envoyer': 'Send',
    'Détails': 'Details', 'Jouer': 'Play', 'Favori': 'Favorite', 'Favoris': 'Favorites', 'En cours': 'Playing', 'Tous': 'All',
    "En cours d'exécution": 'Running', 'Jamais joué': 'Never played', 'Pas encore joué': 'Not played yet', 'Jamais': 'Never',
    'Hier': 'Yesterday', "À l'instant": 'Just now', "à l'instant": 'just now', 'Joueur': 'Player', 'Moi': 'Me', '(toi)': '(you)',
    'Aucun jeu lancé récemment': 'No game launched recently', 'Fermer': 'Close', 'Revoir': 'Show again', 'Version': 'Version',
    'Calcul…': 'Calculating…', 'Installation…': 'Installing…',
    // ---- home ----
    'Reprendre la partie': 'Continue playing', 'À découvrir': 'To discover', 'Temps de jeu total': 'Total playtime',
    'Jeux installés': 'Installed games', 'Espace utilisé': 'Space used', 'sur tous tes disques': 'across all your drives',
    'Le plus joué': 'Most played', 'Tout voir →': 'See all →', 'Les plus joués': 'Most played', 'Statistiques →': 'Statistics →',
    'Aucun jeu détecté': 'No game found', 'Tu peux aussi ajouter un jeu à la main.': 'You can also add a game manually.',
    'Linkgeek scanne Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app et GOG.': 'Linkgeek scans Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app and GOG.',
    // ---- library ----
    'Ma bibliothèque': 'My library', 'Masqués': 'Hidden', 'Utilisation la plus récente': 'Most recently used', 'Nom (A → Z)': 'Name (A → Z)',
    'Temps de jeu': 'Playtime', 'Taille sur le disque': 'Size on disk', 'Ajouts récents': 'Recently added', 'Collections': 'Collections',
    '＋ Nouvelle': '＋ New', 'Créer une collection': 'Create a collection', 'Supprimer la collection': 'Delete collection', 'Collection vide': 'Empty collection',
    "Ouvre un jeu puis utilise « Collections » pour l'y ranger.": 'Open a game and use "Collections" to add it here.',
    'Aucun jeu trouvé': 'No game found', 'Essaie un autre filtre ou une autre recherche.': 'Try another filter or search.',
    'Ajoutés': 'Added', 'En cours ': 'Playing', 'À finir': 'Backlog', 'Nouvelle collection': 'New collection', 'Renommer la collection': 'Rename collection',
    'Supprimer cette collection ?': 'Delete this collection?', 'Ajouté manuellement': 'Added manually',
    // ---- game page ----
    'Ouvrir le dossier': 'Open folder', 'Données Steam + suivi Linkgeek': 'Steam data + Linkgeek tracking', 'Suivi par Linkgeek': 'Tracked by Linkgeek',
    'Dernière session': 'Last session', 'Activité — 30 derniers jours': 'Activity — last 30 days', 'Sessions suivies': 'Tracked sessions',
    'Durée moyenne': 'Average length', 'À propos': 'About', 'Informations': 'Details', 'Plateforme': 'Platform', 'Éditeur': 'Publisher',
    'Taille': 'Size', "Ouvrir le dossier d'installation": 'Open install folder', 'Page du magasin': 'Store page', 'Changer la jaquette': 'Change cover',
    'Afficher dans la bibliothèque': 'Show in library', 'Masquer de la bibliothèque': 'Hide from library', 'Retirer de Linkgeek': 'Remove from Linkgeek',
    'Renommer le jeu': 'Rename game', 'Jeu masqué de la bibliothèque': 'Game hidden from library', 'Jeu affiché dans la bibliothèque': 'Game shown in library',
    'Jeu ajouté à ta bibliothèque': 'Game added to your library', 'aucune session': 'no session', 'Pas encore de sessions suivies': 'No tracked session yet',
    // ---- secret & ultimate trophies ----
    'Légende vivante': 'Living legend', 'Tout ça pour ça': 'All that for this', 'Curieux': 'Curious', 'Chanceux': 'Lucky', 'Influenceur': 'Influencer',
    'Linkgeek Ultime': 'Linkgeek Ultimate', 'Ultime': 'Ultimate', 'Secret': 'Secret', 'Trophées secrets': 'Secret trophies', 'Le trophée ultime': 'The ultimate trophy',
    'Faire une session de jeu de moins de 30 secondes': 'Play a session shorter than 30 seconds',
    'Ouvrir toutes les pages du launcher (Accueil, Amis, Défis, Succès, Stats, Paramètres)': 'Open every page of the launcher (Home, Friends, Challenges, Achievements, Stats, Settings)',
    'Avoir un 7 dans son pseudo': 'Have a 7 in your username', 'Relier tous ses réseaux (Discord, Twitch et TikTok) à son profil': 'Link all your socials (Discord, Twitch and TikTok) to your profile',
    'Débloquer tous les autres trophées au rang maximum': 'Unlock every other trophy at its highest rank',
    'Débloque tous les autres trophées au rang maximum, secrets compris. Récompense : un badge spécial sur ton profil.': 'Unlock every other trophy at its highest rank, secrets included. Reward: a special badge on your profile.',
    'Trophée secret découvert !': 'Secret trophy found!', 'TROPHÉE ULTIME DÉBLOQUÉ !': 'ULTIMATE TROPHY UNLOCKED!',
    'Trophée « Linkgeek Ultime » : tous les trophées au rang maximum': '"Linkgeek Ultimate" trophy: every trophy at its highest rank',
    // ---- Boutique & frames ----
    'Boutique': 'Shop', 'Dépense tes jetons pour personnaliser Linkgeek': 'Spend your tokens to customize Linkgeek', 'Mes jetons': 'My tokens',
    'Comment en gagner ?': 'How to earn them?', 'Voir mes défis': 'See my challenges', 'Thèmes': 'Themes', 'Historique': 'History', '✓ Appliqué': '✓ Applied',
    'Pas assez de jetons': 'Not enough tokens', 'Acheter': 'Buy', 'Défi terminé': 'Challenge completed', 'Ouvrir la Boutique →': 'Open the Shop →',
    'Néon': 'Neon', 'Océan': 'Ocean', 'Forêt': 'Forest', 'Braise': 'Ember', 'Or royal': 'Royal gold',
    'Rose électrique et cyan, ambiance arcade': 'Electric pink and cyan, arcade vibes', 'Bleu profond et turquoise, calme et lisible': 'Deep blue and turquoise, calm and readable',
    'Verts sombres et lumière dorée': 'Dark greens and golden light', 'Rouge volcanique et orange incandescent': 'Volcanic red and glowing orange',
    'Rose pastel sur nuit violette': 'Pastel pink on a violet night', 'Coucher de soleil rétro des années 80': 'Retro 80s sunset',
    "Noir laqué et feuille d'or": 'Black lacquer and gold leaf', 'Vert phosphore sur noir total': 'Phosphor green on pure black',
    'Contour de photo': 'Picture frame', 'Chaque rang atteint débloque son contour. Il est visible par tes amis.': 'Every rank you reach unlocks its frame. Your friends can see it.',
    'Automatique': 'Automatic', 'Aucun': 'None', 'Sans contour': 'No frame', 'Débloqué': 'Unlocked', 'Contour retiré': 'Frame removed', 'Contour mis à jour': 'Frame updated',
    'Nouveau badge et nouveau contour débloqués !': 'New badge and new frame unlocked!',
    // ---- home: profile & recommendations ----
    'Reprendre': 'Continue', 'Tes derniers jeux lancés': 'Your latest games', 'Toute la bibliothèque →': 'Whole library →', 'de jeu au total': 'played in total',
    'Voir les statistiques': 'See statistics', 'Annonces officielles de tes jeux Steam': 'Official announcements of your Steam games',
    'Aucune annonce ces 30 derniers jours.': 'No announcement in the last 30 days.', 'Chargement des annonces…': 'Loading announcements…',
    'Ton profil de joueur': 'Your player profile', 'Calculé à partir de tes jeux': 'Based on your games', 'Recommandés pour toi': 'Recommended for you',
    "Jeux Steam populaires dans tes genres préférés, que tu n'as pas encore": "Popular Steam games in your favorite genres that you don't own yet",
    'Recherche…': 'Searching…', 'Gratuit': 'Free', 'Évaluations positives sur Steam': 'Positive Steam reviews',
    'Linkgeek cherche des jeux qui te correspondent…': 'Linkgeek is looking for games that suit you…',
    "Pas de recommandation pour le moment : réessaie plus tard (il faut une connexion Internet).": 'No recommendation right now: try again later (an Internet connection is needed).',
    "Joue un peu, et Linkgeek découvrira tes genres préférés (il faut connaître les étiquettes de tes jeux, ça arrive dans quelques instants).": "Play a little and Linkgeek will find your favorite genres (your games' tags are being fetched, it takes a moment).",
    'Compétitif en équipe': 'Team competitive', 'Tir / FPS': 'Shooter / FPS', 'Course': 'Racing', 'Sport': 'Sports', 'RPG': 'RPG',
    'Aventure & exploration': 'Adventure & exploration', 'Simulation & gestion': 'Simulation & management', 'Stratégie': 'Strategy',
    'Coop entre amis': 'Co-op with friends', 'Horreur': 'Horror', 'Détente': 'Chill',
    // ---- game news ----
    'Mises à jour': 'Updates', "Recherche d'une mise à jour…": 'Checking for updates…', 'Linkgeek est à jour': 'Linkgeek is up to date',
    'Rechercher une mise à jour': 'Check for updates', 'Vérifier à nouveau': 'Check again', 'Réessayer': 'Try again', 'La mise à jour a échoué': 'The update failed',
    'Disponibles uniquement dans la version installée de Linkgeek.': 'Only available in the installed version of Linkgeek.', 'Mettre à jour': 'Update',
    'Installation…': 'Installing…', 'Installation de la mise à jour…': 'Installing the update…', 'Linkgeek va se fermer puis redémarrer tout seul.': 'Linkgeek will close and restart by itself.',
    'Redémarrer et mettre à jour': 'Restart and update', "Linkgeek redémarre en quelques secondes. Sinon, elle s'installera à la prochaine fermeture.": 'Linkgeek restarts in a few seconds. Otherwise it will be installed the next time you close it.',
    'Téléchargement en cours': 'Downloading', "Redémarre pour l'installer, ça prend quelques secondes.": 'Restart to install it, it only takes a few seconds.',
    'Fichier incomplet': 'Incomplete file', 'Fichier corrompu (empreinte SHA-256 différente)': 'Corrupted file (SHA-256 mismatch)', 'Archive invalide (Linkgeek.exe introuvable)': 'Invalid archive (Linkgeek.exe not found)',
    'Nouveautés': 'News', 'Nouveau': 'New', 'Mise à jour': 'Update', 'Annonce': 'Announcement', 'Lire la suite': 'Read more', 'Réduire': 'Show less',
    'Voir sur Steam': 'View on Steam', 'Mises à jour récentes': 'Recent updates', 'Actualiser': 'Refresh', 'Actualisation…': 'Refreshing…',
    'Voir sur le site du jeu': "View on the game's site", 'Chercher les notes de mise à jour': 'Search the patch notes',
    'Aucune annonce officielle récente pour ce jeu.': 'No recent official announcement for this game.',
    'Une mise à jour ou une annonce est sortie depuis ta dernière partie': 'An update or announcement came out since your last session',
    // ---- profile titles & genres ----
    'Titres': 'Titles', 'Afficher': 'Show', 'Nouveau titre débloqué !': 'New title unlocked!', 'Titre retiré de ton profil': 'Title removed from your profile',
    'Pro du FPS': 'FPS Pro', 'Perfectionniste': 'Perfectionist', 'Maître du jeu': 'Game Master', 'Survivant': 'Survivor', 'Aventurier': 'Adventurer',
    'Jouer à 15 jeux de tir différents': 'Play 15 different shooters', 'Débloquer 100 % des succès': 'Unlock 100% of the achievements',
    'Atteindre le niveau 100': 'Reach level 100', "Jouer à 10 jeux de survie (Raft, Palworld, No Man's Sky…)": "Play 10 survival games (Raft, Palworld, No Man's Sky…)",
    "Jouer à 15 jeux d'aventure ou de RPG": 'Play 15 adventure or RPG games', 'Changer de titre dans la Boutique': 'Change title in the Shop',
    'Genre': 'Genre', 'Tir': 'Shooter', 'Survie': 'Survival', 'Aventure / RPG': 'Adventure / RPG', 'Choisi par toi ·': 'Chosen by you ·',
    'revenir à la détection automatique': 'back to automatic detection', 'Détecté automatiquement · compte pour les titres de la Boutique': 'Detected automatically · counts for the Shop titles',
    // ---- admin rewards ----
    'Donner une récompense': 'Give a reward', 'Destinataire': 'Recipient', 'Jetons (négatif pour retirer)': 'Tokens (negative to remove)',
    'Succès ou trophée': 'Achievement or trophy', 'Palier': 'Tier', '— Aucun —': '— None —', 'Débloquer': 'Unlock', 'Verrouiller (retirer)': 'Lock (remove)',
    'Message (facultatif, pour un autre joueur)': 'Message (optional, for another player)', 'Donner': 'Give', 'Trophée ultime': 'Ultimate trophy', 'Chargement…': 'Loading…',
    'XP, niveau, jetons de la Boutique et succès ou trophées (secrets et ultime compris), à toi ou à un joueur. Remplis seulement ce que tu veux donner.': 'XP, level, Shop tokens and achievements or trophies (secret and ultimate included), to you or to a player. Only fill in what you want to give.',
    "Un autre joueur reçoit sa récompense dans les secondes qui suivent s'il est en ligne, sinon à sa prochaine connexion. « Verrouiller » retire un succès et le bloque à ce palier.": 'Another player gets the reward within seconds if online, otherwise next time they connect. "Lock" removes an achievement and keeps it at that tier.',
    "Connecte-toi au mode en ligne (onglet Compte) pour récompenser les autres joueurs. « Verrouiller » retire un succès et le bloque à ce palier.": 'Sign in to online mode (Account tab) to reward other players. "Lock" removes an achievement and keeps it at that tier.',
    "Indique de l'XP, un niveau, des jetons ou un succès": 'Enter XP, a level, tokens or an achievement',
    "Cet onglet n'existe que sur ton compte. Les actions sur les autres joueurs et les rangs sont vérifiées par le serveur : personne d'autre ne peut les faire, même avec une copie modifiée de l'app.": 'This tab only exists on your account. Actions on other players and on ranks are checked by the server: nobody else can do them, even with a modified copy of the app.',
    'Connecté au mode en ligne': 'Connected to online mode',
    'Mode en ligne déconnecté : seules les actions sur ton propre profil sont disponibles': 'Online mode disconnected: only actions on your own profile are available',
    'Nom et niveau requis de chaque badge. Appliqué à tous les joueurs.': 'Name and required level of each badge. Applied to every player.',
    'Nom et niveau requis de chaque badge. Appliqué sur ton PC ; envoyé à tous les joueurs à ta prochaine connexion en ligne.': 'Name and required level of each badge. Applied on your PC; sent to every player next time you go online.',
    "À recopier dans Firebase → Realtime Database → Règles, puis Publier. Sans elles, le serveur refuse tes actions d'admin.": 'Paste them into Firebase → Realtime Database → Rules, then Publish. Without them, the server refuses your admin actions.',
    'Mon profil ': 'My profile',
    // ---- stats ----
    'Vue d\'ensemble de ta bibliothèque et de ton temps de jeu': 'Overview of your library and playtime', 'Répartition par plateforme': 'By platform',
    'Stockage': 'Storage', 'Top 10 — temps de jeu': 'Top 10 — playtime', 'Tous les jeux': 'All games', 'Cette semaine': 'This week',
    'Aucun temps de jeu enregistré pour le moment.': 'No playtime recorded yet.',
    'Laisse Linkgeek tourner (il reste dans la barre des tâches) : chaque partie sera enregistrée automatiquement, quel que soit le launcher utilisé.': 'Keep Linkgeek running (it stays in the system tray): every session is recorded automatically, whatever launcher you use.',
    'Jeu': 'Game', 'Sessions': 'Sessions', 'Dernière partie': 'Last played', 'Jours joués': 'Days played', 'Sur le disque': 'On disk', 'Libre': 'Free',
    'Jeux': 'Games', 'Autres': 'Other',
    // ---- profile ----
    'Mon profil': 'My profile', 'Pseudo': 'Username', 'Pseudo enregistré': 'Username saved', 'Mes 5 jeux préférés': 'My top 5 games',
    "Clique sur un bloc pour choisir un jeu · glisse-dépose pour changer l'ordre": 'Click a slot to pick a game · drag and drop to reorder',
    'Photo de profil mise à jour': 'Profile picture updated', 'Changer la photo': 'Change picture', 'Photo Steam': 'Steam picture',
    'Personnalise Linkgeek à ton goût': 'Make Linkgeek your own', 'Choisir un jeu': 'Pick a game', 'Rechercher un jeu…': 'Search a game…',
    'XP sur ton profil': 'XP on your profile', 'Niveau': 'Level', 'Badge': 'Badge',
    // ---- friends ----
    'En jeu': 'In game', 'En ligne': 'Online', 'Absent': 'Away', 'Hors ligne': 'Offline', 'Joue à': 'Playing', 'Ton code ami': 'Your friend code',
    'Ajouter un ami': 'Add a friend', 'Demande-lui son code ami (visible dans son onglet Amis).': 'Ask for their friend code (shown in their Friends tab).',
    "Demandes d'ami": 'Friend requests', 'Accepter': 'Accept', 'Refuser': 'Decline', "veut t'ajouter en ami": 'wants to be your friend',
    "Pas encore d'amis": 'No friends yet', 'Partage ton code': 'Share your code', "ou ajoute celui d'un ami ci-dessus.": "or add a friend's code above.",
    'Rechercher un ami…': 'Search a friend…', 'Retirer des amis': 'Remove friend', 'Retirer cet ami ?': 'Remove this friend?', 'Copier': 'Copy',
    'Code ami copié !': 'Friend code copied!', 'Ami ajouté 🎉': 'Friend added 🎉', "Demande d'ami envoyée": 'Friend request sent',
    'Vous êtes maintenant amis 🎉': 'You are now friends 🎉', 'Actualiser': 'Refresh', 'Mes amis': 'My friends', 'Classement': 'Leaderboard',
    'Temps de jeu cette semaine': 'Playtime this week', 'Points de succès': 'Achievement points', 'Remis à zéro chaque lundi': 'Resets every Monday',
    "Les amis qui ont une ancienne version de Linkgeek apparaissent à 0 tant qu'ils n'ont pas mis à jour.": 'Friends on an older Linkgeek version show 0 until they update.',
    'Temps total': 'Total time', 'Jeu le plus joué': 'Most played game', 'Top 5': 'Top 5', 'Pas encore de top 5.': 'No top 5 yet.',
    'vient de lancer': 'just launched', "Joue avec tes amis et vois ce qu'ils font": 'Play with your friends and see what they are up to',
    "Le mode en ligne n'est pas encore activé": 'Online mode is not set up yet',
    "Pour voir tes amis, Linkgeek a besoin d'un petit serveur gratuit (Firebase) partagé par tous les joueurs. Ça se configure une seule fois.": 'To see your friends, Linkgeek needs a small free server (Firebase) shared by all players. It only needs to be set up once.',
    'Configurer le mode en ligne': 'Set up online mode', 'Connecte-toi pour retrouver tes amis': 'Sign in to find your friends',
    "Ton compte Google sert d'identité : tes amis t'ajoutent grâce à ton code ami, et voient quand tu es en ligne et à quoi tu joues.": 'Your Google account is your identity: friends add you with your friend code and see when you are online and what you play.',
    'Configurer la connexion Google': 'Set up Google sign-in', 'Continuer avec Google': 'Continue with Google',
    'Termine la connexion dans ton navigateur…': 'Finish signing in in your browser…', 'Choisis ton compte Google puis reviens ici.': 'Pick your Google account, then come back here.',
    // ---- challenges & levels ----
    'Défis du jour': 'Daily challenges', 'Défis de la semaine': 'Weekly challenges', 'Premiers pas': 'First steps', 'Terminés': 'Completed',
    'Défis du jour terminés': 'Daily challenges done', 'XP gagnée récemment': 'Recent XP', 'Relève des défis pour gagner de l\'XP, monter de niveau et débloquer des badges': 'Complete challenges to earn XP, level up and unlock badges',
    'Rangs et badges': 'Ranks and badges', 'XP au total': 'total XP', 'Défi': 'Challenge', 'terminé': 'done', 'unique': 'one-time',
    'Recrue': 'Rookie', 'Bronze': 'Bronze', 'Argent': 'Silver', 'Or': 'Gold', 'Platine': 'Platinum', 'Diamant': 'Diamond', 'Émeraude': 'Emerald', 'Master': 'Master',
    'Joue 30 minutes': 'Play for 30 minutes', 'Joue 1 heure': 'Play for 1 hour', 'Lance un jeu depuis Linkgeek': 'Launch a game from Linkgeek',
    'Fais une session de 45 min sans pause': 'Play a 45-minute session without a break', 'Rejoue à un jeu délaissé depuis 2 semaines': 'Replay a game untouched for 2 weeks',
    'Joue avec un ami': 'Play with a friend', 'Joue à un de tes favoris': 'Play one of your favorites', 'Joue à un jeu de ton top 5': 'Play a game from your top 5',
    'Joue 5 heures cette semaine': 'Play 5 hours this week', 'Joue 10 heures cette semaine': 'Play 10 hours this week',
    "Fais une session de 2 h d'affilée": 'Play a 2-hour session in a row', 'Lance ton premier jeu depuis Linkgeek': 'Launch your first game from Linkgeek',
    'Ajoute un jeu à tes favoris': 'Add a game to your favorites', 'Personnalise ta photo de profil': 'Customize your profile picture',
    'Choisis tes 5 jeux préférés': 'Pick your 5 favorite games', 'Connecte ton compte Google': 'Link your Google account', 'Ajoute ton premier ami': 'Add your first friend',
    'Joue pour la première fois avec un ami': 'Play with a friend for the first time', 'Débloque un succès de rang Or': 'Unlock a Gold achievement',
    "Cadeau de l'administrateur": 'Gift from the admin',
    // ---- achievements ----
    'En équipe': 'Teamwork', 'Touche-à-tout': 'Jack of all trades', 'Marathonien': 'Marathoner', 'Dévoué': 'Devoted', 'Sans pause': 'Non-stop',
    'Habitué': 'Regular', 'Fidèle': 'Loyal', 'Oiseau de nuit': 'Night owl', 'Collectionneur': 'Collector', 'Multi-plateforme': 'Multi-platform',
    'Disque plein': 'Full disk', 'Populaire': 'Popular', 'Coups de cœur': 'Favorites', 'Verrouillés': 'Locked', 'Débloqués': 'Unlocked',
    'Bronze 10 pts · Argent 25 pts · Or 50 pts · Platine 100 pts': 'Bronze 10 pts · Silver 25 pts · Gold 50 pts · Platinum 100 pts',
    'Session suivie par Linkgeek': 'Session tracked by Linkgeek', 'Sessions suivies par Linkgeek': 'Sessions tracked by Linkgeek', 'Jouer sur une plateforme': 'Play on one platform',
    'débloqué': 'unlocked', 'Tes coéquipiers': 'Your teammates', 'points de succès': 'achievement points',
    // ---- settings ----
    'Apparence': 'Appearance', 'Compte': 'Account', 'Général': 'General', 'Admin': 'Admin', 'Thème de l\'application': 'App theme',
    "Choisis l'ambiance de Linkgeek. Le changement est immédiat.": "Choose Linkgeek's look. It changes instantly.", 'Classique': 'Classic', 'Sombre': 'Dark', 'Clair': 'Light',
    "Bleu nuit et reflets violets, le thème d'origine": 'Midnight blue with violet glints, the original theme', 'Noir profond et gris neutres, idéal le soir': 'Deep black and neutral greys, great at night',
    'Lumineux et contrasté pour la journée': 'Bright and crisp for the daytime', 'Mon compte': 'My account', 'Ton profil Linkgeek est relié à ton compte Google.': 'Your Linkgeek profile is linked to your Google account.',
    'Connecté': 'Signed in', 'Utiliser mon nom et ma photo Google': 'Use my Google name and picture', 'Se déconnecter': 'Sign out',
    'Supprimer mon compte en ligne': 'Delete my online account', 'Politique de confidentialité': 'Privacy policy',
    "Efface du serveur ton profil, ton code ami, ton statut, tes amitiés, tes demandes d'ami et tes cadeaux en attente, puis ton compte Firebase. Ton temps de jeu et tes réglages restent sur ce PC.": 'Erases your profile, friend code, status, friendships, friend requests and pending gifts from the server, then your Firebase account. Your playtime and settings stay on this PC.',
    'Supprimer ton compte en ligne ?': 'Delete your online account?', 'Supprimer définitivement': 'Delete permanently', 'Ton compte en ligne a été supprimé': 'Your online account was deleted',
    "Ton profil, ton code ami, tes amitiés, tes demandes d'ami et ton statut seront effacés du serveur, ainsi que ton compte Firebase. Tes amis ne te verront plus. C'est définitif, mais tu pourras recréer un compte plus tard (avec un nouveau code ami). Ton temps de jeu et tes réglages restent sur ce PC.": 'Your profile, friend code, friendships, friend requests and status will be erased from the server, along with your Firebase account. Friends will no longer see you. This is permanent, but you can create a new account later (with a new friend code). Your playtime and settings stay on this PC.',
    'Créer mon compte': 'Create my account', 'Crée ton compte Linkgeek en un clic avec Google : ton nom et ta photo sont repris automatiquement.': 'Create your Linkgeek account in one click with Google: your name and picture are imported automatically.',
    'Ton profil, ton identité': 'Your profile, your identity', 'Connexion sécurisée dans ton navigateur': 'Secure sign-in in your browser',
    'Nom et photo de profil importés': 'Name and profile picture imported', 'Aucun mot de passe stocké par Linkgeek': 'No password stored by Linkgeek',
    'Comportement de Linkgeek sur ton PC.': 'How Linkgeek behaves on your PC.', 'Lancer Linkgeek au démarrage de Windows': 'Start Linkgeek with Windows',
    'Démarre discrètement dans la zone de notification pour suivre ton temps de jeu en continu.': 'Starts quietly in the system tray to keep tracking your playtime.',
    'Réduire dans la zone de notification à la fermeture': 'Minimize to the system tray when closed',
    "La croix cache la fenêtre au lieu de quitter. Désactivé : fermer quitte Linkgeek (le suivi s'arrête).": 'The close button hides the window instead of quitting. Off: closing quits Linkgeek (tracking stops).',
    'Prévenir quand un ami lance un jeu': 'Notify me when a friend starts a game',
    "« Mirko vient de lancer Rocket League » : dans l'app, ou en notification Windows si Linkgeek est en arrière-plan.": '"Mirko just launched Rocket League": in the app, or as a Windows notification when Linkgeek is in the background.',
    'Langue': 'Language', "Langue de l'interface de Linkgeek.": "Linkgeek's interface language.", 'Revoir la présentation': 'Show the welcome tour again',
    'Les 3 étapes affichées au premier lancement.': 'The 3 steps shown on first launch.', 'Discord': 'Discord', 'Afficher mon jeu sur Discord': 'Show my game on Discord',
    'Connecté à Discord : ton profil affiche le jeu lancé via Linkgeek.': 'Connected to Discord: your profile shows the game launched through Linkgeek.',
    "En attente de Discord : ouvre l'application Discord sur ce PC.": 'Waiting for Discord: open the Discord app on this PC.',
    "Il faut d'abord renseigner l'ID de l'application Discord ci-dessous.": 'Enter the Discord application ID below first.',
    "ID de l'application Discord": 'Discord application ID', 'Crée une application nommée': 'Create an application named', 'sur le': 'on the',
    'portail développeur Discord': 'Discord developer portal',
    "(bouton « New Application »), puis copie son « Application ID ». Il est inclus dans l'installeur que tu partages.": '("New Application" button), then copy its "Application ID". It is included in the installer you share.',
    'ID Discord enregistré': 'Discord ID saved', 'ID Discord effacé': 'Discord ID cleared',
    'Linkgeek détecte automatiquement Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app et GOG.': 'Linkgeek automatically finds Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app and GOG.',
    'Rescanner': 'Rescan', 'Ajouter un jeu manuellement': 'Add a game manually', 'Pour un jeu installé hors des plateformes reconnues (.exe ou raccourci)': 'For a game installed outside the supported platforms (.exe or shortcut)',
    'Jeux masqués': 'Hidden games', 'Aucun jeu masqué': 'No hidden game', 'Tout réafficher': 'Show all', 'Tous les jeux sont de nouveau visibles': 'All games are visible again',
    "Données de l'application": 'App data', 'Compte Google déconnecté': 'Google account signed out', 'Profil mis à jour depuis Google': 'Profile updated from Google',
    'Règles copiées dans le presse-papiers': 'Rules copied to the clipboard', '📋 Copier les règles': '📋 Copy rules', 'Configuration Google': 'Google setup',
    'Configuration Google enregistrée': 'Google setup saved', 'Configuration Google importée': 'Google setup imported', 'Configuration effacée': 'Setup cleared',
    'Importer le fichier JSON': 'Import the JSON file', 'ou colle les valeurs': 'or paste the values', 'ID client': 'Client ID', 'Code secret du client': 'Client secret',
    'Mode en ligne (amis)': 'Online mode (friends)', 'à configurer': 'to set up', 'Effacer': 'Clear',
    'Mode en ligne': 'Online mode', 'Connecté au serveur Linkgeek': 'Connected to the Linkgeek server', '✓ Disponible': '✓ Available', 'Non disponible': 'Unavailable',
    "Non disponible pour le moment. Réinstalle Linkgeek ou préviens la personne qui te l'a envoyé.": 'Unavailable for now. Reinstall Linkgeek or tell the person who sent it to you.',
    'Options avancées': 'Advanced options', 'admin': 'admin',
    'Joué récemment': 'Recently played',
    // ---- trophies (one rarity each) ----
    'Les premiers pas': 'First steps', 'Un vrai investissement': 'A real commitment', 'Pour les plus acharnés': 'For the most dedicated', 'Tous les trophées de Linkgeek': 'Every Linkgeek trophy',
    'Platine': 'Platinum', 'Argent': 'Silver', 'Or': 'Gold', 'Bronze': 'Bronze', 'Débloqués': 'Unlocked', 'À débloquer': 'To unlock', 'Tes trophées les plus proches : fonce !': 'Your closest trophies: go for it!',
    'Indice : explore Linkgeek…': 'Hint: explore Linkgeek…', 'Trophée secret : il se révèle quand tu le débloques': 'Secret trophy: it reveals itself when you unlock it',
    'Trophée secret découvert !': 'Secret trophy found!', 'TROPHÉE PLATINE DÉBLOQUÉ !': 'PLATINUM TROPHY UNLOCKED!',
    'Premier pas': 'First step', 'Lancer ta première session de jeu': 'Start your first game session', 'Touche-à-tout': 'Jack of all trades', 'Jouer à 3 jeux différents': 'Play 3 different games',
    'Échauffement': 'Warm-up', 'Cumuler 10 heures de jeu': 'Play 10 hours in total', 'Petite collection': 'Small collection', 'Avoir 10 jeux dans ta bibliothèque': 'Have 10 games in your library',
    'Coup de cœur': 'Crush', 'Mettre un jeu en favori': 'Add a game to your favourites', 'Premier ami': 'First friend', 'Ajouter ton premier ami': 'Add your first friend',
    'Ça devient sérieux': 'Getting serious', 'Jouer 3 jours différents': 'Play on 3 different days', 'Oiseau de nuit': 'Night owl', 'Lancer une session entre minuit et 5 h': 'Start a session between midnight and 5 am',
    'Défi relevé': 'Challenge accepted', 'Terminer ton premier défi': 'Complete your first challenge', 'À ton image': 'In your image', 'Choisir ta propre photo de profil': 'Pick your own profile picture',
    'Mon top 5': 'My top 5', 'Remplir les 5 places de tes jeux préférés': 'Fill the 5 slots of your favourite games', 'Coup de chance': 'Lucky spin', 'Tourner la roulette du jour': 'Spin the daily wheel',
    'Curieux': 'Curious', 'Ouvrir toutes les pages du launcher (Accueil, Amis, Défis, Succès, Stats, Paramètres)': 'Open every page of the launcher (Home, Friends, Challenges, Achievements, Stats, Settings)',
    'Tout ça pour ça': 'All that for this', 'Faire une session de jeu de moins de 30 secondes': 'Play a session shorter than 30 seconds', 'Chanceux': 'Lucky', 'Avoir un 7 dans son pseudo': 'Have a 7 in your name',
    'Marathonien': 'Marathoner', 'Cumuler 100 heures de jeu': 'Play 100 hours in total', 'Dévoué': 'Devoted', 'Passer 50 heures sur un même jeu': 'Spend 50 hours on one game',
    'Sans pause': 'Non-stop', "Jouer 3 heures d'affilée": 'Play 3 hours in a row', 'Habitué': 'Regular', 'Lancer 50 sessions de jeu': 'Start 50 game sessions', 'Régulier': 'Steady', 'Jouer 30 jours différents': 'Play on 30 different days',
    'En équipe': 'Teamwork', 'Jouer avec 3 amis différents': 'Play with 3 different friends', 'Populaire': 'Popular', 'Avoir 5 amis': 'Have 5 friends', 'Multi-plateforme': 'Multi-platform',
    'Jouer sur 3 plateformes (Steam, Epic, Xbox, Battle.net…)': 'Play on 3 platforms (Steam, Epic, Xbox, Battle.net…)', 'Disque plein': 'Full disk', 'Avoir 250 Go de jeux installés': 'Have 250 GB of installed games',
    'Relooking': 'Makeover', 'Acheter un thème dans la Boutique': 'Buy a theme in the Shop', 'Vétéran': 'Veteran', 'Atteindre le niveau 25': 'Reach level 25',
    'Influenceur': 'Influencer', 'Relier tous ses réseaux (Discord, Twitch et TikTok) à son profil': 'Link all your socials (Discord, Twitch and TikTok) to your profile',
    'Légende vivante': 'Living legend', 'Passer 500 heures sur un même jeu': 'Spend 500 hours on one game', 'Increvable': 'Unstoppable', "Jouer 8 heures d'affilée": 'Play 8 hours in a row',
    'Assidu': 'Dedicated', 'Jouer 30 jours de suite': 'Play 30 days in a row', 'Chasseur de défis': 'Challenge hunter', 'Terminer 100 défis': 'Complete 100 challenges', 'Explorateur': 'Explorer', 'Jouer à 25 jeux différents': 'Play 25 different games',
    'Linkgeek Platine': 'Linkgeek Platinum', 'Débloquer tous les autres trophées de Linkgeek': 'Unlock every other Linkgeek trophy',
    'Sessions suivies par Linkgeek': 'Sessions tracked by Linkgeek', 'Session suivie par Linkgeek': 'Session tracked by Linkgeek', 'Une partie suivie par Linkgeek chaque jour': 'A session tracked by Linkgeek every day',
    "Lance le même jeu qu'un ami en même temps": 'Launch the same game as a friend at the same time',
    // ---- achievements redesign ----
    'Rang de chasseur de trophées': 'Trophy hunter rank', 'complété': 'complete', 'Débutant': 'Beginner', 'Amateur': 'Amateur', 'Chasseur': 'Hunter', 'Expert': 'Expert', 'Maître': 'Master', 'Légende': 'Legend',
    'Tu as atteint le rang le plus haut 👑': 'You reached the highest rank 👑', 'Secrets': 'Secrets', '🔥 Presque débloqués': '🔥 Almost unlocked',
    'Tes prochains paliers les plus proches : fonce !': 'Your closest next tiers: go for it!', 'Derniers débloqués': 'Recently unlocked', 'Tous les succès': 'All achievements',
    '4 paliers par succès : Bronze, Argent, Or puis Platine': '4 tiers per achievement: Bronze, Silver, Gold then Platinum', 'Presque': 'Almost', 'Pas commencés': 'Not started',
    'Pas encore commencé': 'Not started yet', 'Plus que': 'Only', 'Presque !': 'Almost!', '✓ Terminé au rang Platine': '✓ Completed at Platinum', 'Points gagnés sur ce succès': 'Points earned on this achievement',
    // ---- statistics ----
    janvier: 'January', février: 'February', mars: 'March', avril: 'April', mai: 'May', juin: 'June', juillet: 'July', août: 'August', septembre: 'September', octobre: 'October', novembre: 'November', décembre: 'December',
    'Non suivi': 'Not tracked', 'Temps Steam · autres plateformes non suivies': 'Steam time · other platforms not tracked', 'temps non suivi': 'time not tracked', 'Records': 'Records', 'Quand tu joues': 'When you play', 'Comparaisons': 'Comparisons',
    'Valeur de ta bibliothèque': 'Your library value', 'Heure préférée': 'Favourite hour', 'Jour le plus actif': 'Most active day', 'Moins': 'Less', 'Plus': 'More',
    'Seul Steam fournit son propre temps de jeu. Pour les autres plateformes, Linkgeek compte uniquement les parties lancées pendant qu\'il est ouvert.': 'Only Steam reports its own playtime. For other platforms, Linkgeek only counts the sessions played while it is open.',
    'Joue un peu avec Linkgeek ouvert : la grille se remplira avec tes horaires de jeu.': 'Play a bit with Linkgeek open: the grid will fill up with your playing hours.',
    'Cette semaine': 'This week', 'Ce mois-ci': 'This month', 'Même moment la semaine dernière': 'Same time last week', 'nouveau': 'new', 'Comparer avec mes amis': 'Compare with my friends',
    'Pas encore de données de tes amis pour cette semaine.': 'No data from your friends for this week yet.', 'Tu as joué autant que la moyenne de tes amis cette semaine.': 'You played as much as your friends on average this week.',
    'Valeur estimée': 'Estimated value', 'Coût moyen par heure': 'Average cost per hour', 'sur tes jeux payants': 'on your paid games', 'Meilleur rapport heures / prix': 'Best hours / price ratio',
    'Prix Steam actuels en France, hors promotions. Les jeux des autres plateformes ne sont pas comptés.': 'Current Steam prices in France, without discounts. Games from other platforms are not counted.',
    'Aucun prix Steam trouvé pour tes jeux (hors ligne ?).': 'No Steam price found for your games (offline?).',
    'Session la plus longue': 'Longest session', 'Plus longue série': 'Longest streak', 'Jour le plus joué': 'Most played day', 'Dernier jeu découvert': 'Latest game discovered',
    'Pas encore de session suivie': 'No tracked session yet', 'Aucune série en cours': 'No streak running', "Aucun nouveau jeu depuis l'installation": 'No new game since the install', 'Jeu supprimé': 'Deleted game',
    'Linkgeek Wrapped': 'Linkgeek Wrapped', 'Pas encore assez de parties': 'Not enough games yet', 'Prêt à revoir tes parties ?': 'Ready to look back at your games?', 'Ton temps de jeu': 'Your playtime',
    'Ton jeu n°1': 'Your #1 game', 'Ton genre préféré': 'Your favourite genre', "D'après tout ton temps de jeu": 'Based on all your playtime', 'Tes records': 'Your records',
    'Ta plus grosse journée': 'Your biggest day', 'Tes habitudes': 'Your habits', 'À partager': 'To share', 'Ton récap en image': 'Your recap as a picture',
    "Enregistrer l'image": 'Save picture', 'Copier': 'Copy', 'Image enregistrée': 'Picture saved', 'Image copiée : colle-la où tu veux (Ctrl+V)': 'Picture copied: paste it anywhere (Ctrl+V)',
    'Commun': 'Common', 'Rare': 'Rare', 'Épique': 'Epic', 'Une nouvelle palette de couleurs': 'A new colour palette', 'Couleurs + fond animé': 'Colours + animated backdrop',
    "Effets animés exclusifs dans toute l'application": 'Exclusive animated effects across the whole app',
    'Aurore boréale': 'Northern lights', 'Voiles verts et violets qui ondulent dans la nuit polaire': 'Green and violet veils rippling in the polar night',
    'Cyberpunk': 'Cyberpunk', "Jaune néon, cyan, scanlines et glitch d'une ville de 2099": 'Neon yellow, cyan, scanlines and glitches of a 2099 city',
    'Galaxie': 'Galaxy', "Nébuleuse violette et champ d'étoiles filantes en mouvement": 'Violet nebula and a moving field of shooting stars',
    'Holographique': 'Holographic', 'Reflets irisés qui changent de couleur en permanence': 'Iridescent reflections that keep changing colour',
    'Pluie de code vert phosphore sur noir total': 'Phosphor-green code rain on pure black',
    'Info précédente': 'Previous', 'Info suivante': 'Next',
    'À savoir': 'Good to know', 'Les infos du moment, mises à jour en direct': 'What is happening right now, updated live',
    "Ton tour gratuit t'attend": 'Your free spin is waiting', 'Tourner la roue': 'Spin the wheel',
    'Jetons, XP ou un thème au hasard : tente ta chance dans la Boutique.': 'Tokens, XP or a random theme: try your luck in the Shop.',
    "Tu as déjà tourné la roue aujourd'hui. Reviens après minuit !": 'You already spun the wheel today. Come back after midnight!',
    'Défis du jour': 'Daily challenges', 'Tous terminés, bravo 🎉': 'All done, well played 🎉', 'De nouveaux défis arrivent demain à minuit.': 'New challenges arrive tomorrow at midnight.',
    'Défi de la semaine': 'Weekly challenge', 'Titre à débloquer': 'Title to unlock', 'Classement de la semaine': 'Weekly leaderboard',
    'Tu es 1er cette semaine 🥇': 'You are 1st this week 🥇', 'Amis': 'Friends', "Accepte-les depuis l'onglet Amis.": 'Accept them from the Friends tab.',
    'Va voir à quoi ils jouent.': 'See what they are playing.', 'Tu as atteint le rang le plus haut !': 'You reached the highest rank!', "Rien de neuf pour l'instant.": 'Nothing new for now.',
    'Succès en vitrine': 'Showcased achievements', 'Choisir un succès': 'Pick an achievement', '— Vide —': '— Empty —',
    'Tes succès préférés, visibles par tes amis · à choisir avec « Modifier le profil »': 'Your favorite achievements, visible to your friends · pick them with “Edit profile”',
    "Débloque un succès pour pouvoir l'afficher ici.": 'Unlock an achievement to show it here.',
    'Modifier le profil': 'Edit profile', 'Modifier': 'Edit', 'Photo de profil': 'Profile picture', 'Changer la photo': 'Change picture',
    'Revenir à la photo par défaut': 'Back to the default picture', 'Visible par tes amis. Elle est enregistrée tout de suite.': 'Visible to your friends. It is saved right away.',
    'Pseudo': 'Name', 'Aucun titre': 'No title', 'Affiché sous ton pseudo.': 'Shown under your name.',
    "Aucun titre débloqué pour l'instant : remplis leurs conditions (Boutique → Titres).": 'No title unlocked yet: meet their goals (Shop → Titles).',
    'Contour de photo': 'Picture frame', 'Automatique': 'Automatic', 'Aucun': 'None', 'Réseaux': 'Socials', 'Mes 5 jeux préférés': 'My 5 favorite games',
    '— Aucun —': '— None —', "Laisse vide pour retirer. Discord : un identifiant numérique rend l'icône cliquable.": 'Leave empty to remove. Discord: a numeric ID makes the icon clickable.',
    'Modifiables avec « Modifier le profil »': 'Editable with “Edit profile”', 'Profil enregistré': 'Profile saved', 'Fermer': 'Close',
    'Notifications': 'Notifications', 'Tout effacer': 'Clear all', 'Aucune notification': 'No notifications',
    "Tes défis, niveaux, jetons, succès et l'activité de tes amis apparaîtront ici.": 'Your challenges, levels, tokens, achievements and friend activity will show up here.',
    'Titre': 'Title', 'Plateforme': 'Platform', 'Dernière partie': 'Last played', 'Taille': 'Size', 'Lancer': 'Launch',
    'Maintenant': 'Now', 'Jamais': 'Never', 'Affichage en grille': 'Grid view', 'Affichage en liste': 'List view', 'Détails': 'Details',
    // ---- shop: daily wheel ----
    'Roulette du jour': 'Daily wheel', 'Un tour gratuit chaque jour · remis à zéro à minuit': 'One free spin every day · resets at midnight',
    'Tourner la roulette': 'Spin the wheel', "Ton tour gratuit d'aujourd'hui est disponible !": "Today's free spin is available!",
    'La roue tourne…': 'Spinning…', "Déjà tourné aujourd'hui": 'Already spun today', 'Bonne chance !': 'Good luck!',
    "Gain d'aujourd'hui": "Today's prize", 'Un thème au hasard': 'A random theme', 'jetons': 'tokens', 'Roulette': 'Wheel',
    "Tu as déjà tourné la roulette aujourd'hui. Reviens demain !": 'You already spun the wheel today. Come back tomorrow!',
    // ---- home: global weekly leaderboard ----
    'Classement général de la semaine': 'Global leaderboard of the week', 'Remis à zéro chaque lundi': 'Resets every Monday', 'ami': 'friend',
    'Connecte-toi pour voir le classement': 'Sign in to see the leaderboard', 'Se connecter': 'Sign in',
    'Le classement réunit tous les joueurs de Linkgeek. Connecte-toi avec Google pour y participer.': 'The leaderboard gathers every Linkgeek player. Sign in with Google to take part.',
    "Le classement n'est pas encore activé sur le serveur.": 'The leaderboard is not enabled on the server yet.',
    'Impossible de charger le classement pour le moment.': 'Unable to load the leaderboard right now.',
    "Personne n'a encore joué cette semaine. Lance un jeu pour prendre la première place !": 'Nobody has played yet this week. Launch a game to take first place!',
    "Tu n'as pas encore joué cette semaine : lance un jeu pour entrer dans le classement.": "You haven't played yet this week: launch a game to enter the leaderboard.",
    'Tu as choisi de ne pas apparaître dans le classement (Paramètres → Général).': 'You chose not to appear in the leaderboard (Settings → General).',
    'Apparaître dans le classement général': 'Appear in the global leaderboard',
    "Ton pseudo, ta photo, ton niveau et tes heures de jeu de la semaine sont visibles par tous les joueurs de Linkgeek sur l'accueil.": "Your name, picture, level and this week's playtime are visible to every Linkgeek player on the home page.",
    // ---- admin dashboard ----
    'Tableau de bord': 'Dashboard', 'Actualiser': 'Refresh', 'Actualisation…': 'Refreshing…', 'Réessayer': 'Try again',
    'Chiffres globaux de Linkgeek, visibles seulement par toi. Mis à jour toutes les 30 secondes.': 'Linkgeek-wide numbers, visible only to you. Updated every 30 seconds.',
    'Connecte-toi au mode en ligne (onglet Compte) pour voir les chiffres de Linkgeek.': 'Sign in to online mode (Account tab) to see Linkgeek\'s numbers.',
    'En ligne maintenant': 'Online now', 'En jeu': 'In game', 'lancé via Linkgeek': 'launched via Linkgeek', 'Pic du jour': "Today's peak", 'relevé sur ce PC': 'recorded on this PC',
    'Joueurs inscrits': 'Registered players', 'En ligne ces dernières 24 h': 'Online over the last 24 h', 'Activité': 'Activity',
    'Actifs sur 24 h': 'Active in 24 h', 'Actifs sur 7 jours': 'Active in 7 days', 'Actifs sur 30 jours': 'Active in 30 days', 'Joueurs revenus cette semaine': 'Players back this week',
    'Joués en ce moment': 'Being played now', 'Jeux préférés des joueurs': "Players' favorite games", "Personne ne joue via Linkgeek pour l'instant.": 'Nobody is playing via Linkgeek right now.',
    'Pas encore de données.': 'No data yet.', 'Temps de jeu': 'Playtime', 'Au total': 'In total', 'tous joueurs confondus': 'all players combined', 'Cette semaine': 'This week',
    'Jeux par joueur': 'Games per player', 'en moyenne': 'on average', 'Trophée ultime': 'Ultimate trophy', "joueurs l'ayant obtenu": 'players who earned it',
    'Niveaux': 'Levels', 'Moyenne': 'Average', 'Maximum': 'Maximum', 'Fondateurs': 'Founders', 'Aucun joueur.': 'No players.', 'Communauté': 'Community',
    'Amitiés': 'Friendships', 'Amis par joueur': 'Friends per player', 'Sans ami': 'No friends', 'Réseaux reliés': 'Socials linked', 'Titres équipés': 'Equipped titles', 'Aucun titre équipé.': 'No equipped titles.',
    'La courbe se remplit au fil du temps quand Linkgeek est ouvert sur ton PC (un relevé toutes les 5 minutes).': 'The curve fills up over time while Linkgeek is open on your PC (one reading every 5 minutes).',
    'Le serveur refuse la lecture : republie les règles Firebase (Admin → Copier les règles)': 'The server refuses the read: republish the Firebase rules (Admin → Copy rules)',
    'Connecte-toi au mode en ligne pour voir le tableau de bord': 'Sign in to online mode to see the dashboard',
    // ---- admin ----
    'Administration': 'Administration', 'Administrateur de Linkgeek': 'Linkgeek administrator', 'Ajouter ou retirer de l\'XP': 'Add or remove XP',
    'Fixer mon niveau': 'Set my level', 'Renouveler mes défis du jour': 'Renew my daily challenges', 'Renouveler': 'Renew',
    'Donner de l\'XP à un joueur': 'Give XP to a player', 'Autre joueur (code ami)…': 'Other player (friend code)…', 'Message (facultatif)': 'Message (optional)',
    'Montant en XP': 'XP amount', 'Ou fixer le niveau': 'Or set the level', 'XP (négatif pour retirer)': 'XP (negative to remove)',
    'Enregistrer les rangs': 'Save ranks', "Rétablir les rangs d'origine": 'Restore default ranks', 'Nom et niveau requis de chaque badge.': 'Name and required level for each badge.',
    'Sécurité du serveur': 'Server security', 'Règles Firebase avec ton compte admin': 'Firebase rules with your admin account',
    'Remplace ton XP par le minimum de ce niveau': 'Replaces your XP with the minimum for that level',
    'Tire 3 nouveaux défis (ceux déjà terminés restent comptés)': 'Draws 3 new challenges (completed ones still count)',
    'Le joueur reçoit l\'XP dans les 15 secondes s\'il est en ligne, sinon à sa prochaine connexion.': 'The player gets the XP within 15 seconds if online, otherwise next time they connect.',
    'Nouveaux défis du jour tirés': 'New daily challenges drawn', 'Rangs mis à jour pour tous les joueurs': 'Ranks updated for every player', 'Rangs enregistrés sur ton PC': 'Ranks saved on your PC',
    // ---- onboarding & updates ----
    'Tous tes jeux au même endroit': 'All your games in one place', 'Connecte-toi avec Google': 'Sign in with Google', 'Ajoute tes amis': 'Add your friends',
    "Ton compte Google sert d'identité : ton nom et ta photo sont repris, et aucun mot de passe n'est stocké. C'est facultatif : sans compte, rien ne quitte ton PC.": 'Your Google account is your identity: your name and picture are imported, and no password is stored. It is optional: without an account, nothing leaves your PC.',
    '✓ Déjà connecté': '✓ Already signed in', 'Passer': 'Skip', 'Suivant': 'Next', "C'est parti !": "Let's go!",
    // ---- stats / profile / challenges leftovers ----
    'Espace occupé': 'Space used', 'tous les jeux mesurés': 'all games measured', 'sur le disque': 'on disk', 'de jeu': 'played',
    'jeux installés': 'games installed', 'le plus joué': 'most played', 'Terminé': 'Done', "Lance le même jeu qu'un ami en même temps": 'Launch the same game as a friend at the same time',
    // ---- online / Google setup steps ----
    'Les amis et les statuts passent par un serveur Firebase gratuit. Tous tes amis doivent utiliser': 'Friends and statuses go through a free Firebase server. All your friends must use',
    'le même': 'the same', "projet : l'installeur que tu partages l'inclut automatiquement.": 'project: the installer you share includes it automatically.',
    'Va sur la': 'Go to the', 'console Firebase': 'Firebase console', 'Ajouter un projet': 'Add project', 'et choisis': 'and pick',
    'ton projet Google Cloud existant': 'your existing Google Cloud project', "(celui de l'ID client ci-dessus).": '(the one with the client ID above).',
    '→ Commencer → active le fournisseur': '→ Get started → enable the provider', '→ Créer une base de données → onglet': '→ Create database → tab',
    'Règles': 'Rules', ': remplace tout par les règles de Linkgeek': ': replace everything with the Linkgeek rules', ', puis': ', then', 'Publier': 'Publish',
    'Paramètres du projet →': 'Project settings →', 'Ajouter une app Web': 'Add a Web app', '(</>) → copie le bloc': '(</>) → copy the', 'et colle-le ici :': 'block and paste it here:',
    'Pour que tes amis puissent se connecter, publie aussi ton écran de consentement OAuth (Google Cloud → Écran de consentement →': 'So that your friends can sign in, also publish your OAuth consent screen (Google Cloud → OAuth consent screen →',
    "Publier l'application": 'Publish app', '). Les autorisations utilisées (nom, e-mail, photo) ne demandent pas de validation par Google.': '). The permissions used (name, e-mail, picture) need no verification by Google.',
    'Ouvre la': 'Open the', 'console Google Cloud': 'Google Cloud console', 'et crée un projet (ex. « Linkgeek »).': 'and create a project (e.g. "Linkgeek").', 'Dans': 'In',
    'Écran de consentement OAuth': 'OAuth consent screen', ', choisis': ', pick', 'Externe': 'External',
    ", renseigne le nom de l'app et ajoute ton adresse Gmail dans": ', enter the app name and add your Gmail address under', 'Utilisateurs test': 'Test users',
    'Identifiants': 'Credentials', 'Créer des identifiants': 'Create credentials', 'ID client OAuth': 'OAuth client ID', ', choisis le type': ', pick the type',
    'Application de bureau': 'Desktop app', 'Télécharge le fichier JSON proposé, puis importe-le ici :': 'Download the JSON file offered, then import it here:',
    "Pour activer la connexion Google, Linkgeek a besoin d'un identifiant client OAuth (gratuit). Suis les étapes ci-dessous, une seule fois.": 'To enable Google sign-in, Linkgeek needs a (free) OAuth client ID. Follow the steps below, just once.',
    // ---- profile: records, membership, socials ----
    'succès débloqués': 'achievements unlocked', 'amis': 'friends', 'ami': 'friend', 'Voir mes succès': 'See my achievements', 'Voir mes amis': 'See my friends',
    'Records': 'Records', 'Calculés à partir des sessions suivies par Linkgeek': 'Based on the sessions tracked by Linkgeek',
    'Session la plus longue': 'Longest session', 'Série de jours joués': 'Days-played streak', 'Jeu du mois': 'Game of the month',
    'Pas encore de session suivie': 'No tracked session yet', 'Pas de série en cours': 'No streak running', 'Aucune partie ce mois-ci': 'No game played this month',
    'Jeu retiré': 'Removed game', '★ Fondateur': '★ Founder', 'Mes réseaux': 'My socials', 'Réseaux': 'Socials', 'Modifier mes réseaux': 'Edit my socials',
    'Ajouter mes réseaux (Discord, Twitch, TikTok)': 'Add my socials (Discord, Twitch, TikTok)', 'Réseaux enregistrés': 'Socials saved',
    'Tes amis les verront sur ton profil. Laisse vide pour retirer.': 'Your friends will see them on your profile. Leave empty to remove.',
    'pseudo ou identifiant': 'username or ID', 'nom de la chaîne': 'channel name', '@pseudo': '@username',
    "Discord : un identifiant numérique (Paramètres Discord → Avancés → Mode développeur, puis clic droit sur ton nom → Copier l'identifiant) rend l'icône cliquable. Avec un simple pseudo, tes amis pourront le copier.": 'Discord: a numeric ID (Discord settings → Advanced → Developer mode, then right-click your name → Copy User ID) makes the icon clickable. With just a username, your friends can copy it.',
    'Date de création de ton compte Linkgeek': 'Date your Linkgeek account was created', 'Date de ta première utilisation de Linkgeek sur ce PC': 'Date you first used Linkgeek on this PC',
    'Redémarre pour en profiter.': 'Restart to use it.', 'Redémarrer': 'Restart', 'Plus tard': 'Later', "Elle s'installera à la prochaine fermeture": 'It will be installed next time you quit',
  };

  // [pattern, replacement]: text with numbers, names or dates
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const P = [
    // trophies
    [/^(\d+) \/ (\d+) trophées · plus la rareté est haute, plus le défi est difficile$/, '$1 / $2 trophies · the rarer, the harder'],
    [/^(.+) · (\d+) pts chacun$/, (m, a, b) => `${tr(a)} · ${b} pts each`],
    [/^(Bronze|Argent|Or|Platine) · \+(\d+) pts$/, (m, a, b) => `${tr(a)} · +${b} pts`],
    [/^Trophée (Bronze|Argent|Or|Platine) · \+(\d+) pts$/, (m, a, b) => `${tr(a)} trophy · +${b} pts`],
    [/^Trophée (Bronze|Argent|Or|Platine) débloqué$/, (m, a) => `${tr(a)} trophy unlocked`],
    [/^(Bronze|Argent|Or|Platine) · secret$/, (m, a) => `${tr(a)} · secret`],
    [/^Obtenu le (.+)$/, 'Unlocked on $1'],
    // achievements redesign
    [/^(\d+) \/ (\d+) paliers débloqués · chaque palier rapporte des points$/, '$1 / $2 tiers unlocked · every tier earns points'],
    [/^Encore ([\d\s  ]+) pts pour devenir (.+)$/, (m, a, b) => `${a} more pts to become ${tr(b)}`],
    [/^Plus que (.+) !$/, (m, a) => `Only ${a} to go!`], [/^Plus que (.+)$/, (m, a) => `Only ${a} to go`],
    [/^Palier (\S+) · \+(\d+) pts$/, (m, a, b) => `${tr(a)} tier · +${b} pts`],
    [/^(\d+) \/ (\d+) pts$/, '$1 / $2 pts'], [/^\+(\d+) pts$/, '+$1 pts'],
    [/^(\S+) · (il y a .+|à l'instant)$/i, (m, a, b) => `${tr(a)} · ${tr(b)}`],
    // statistics
    [/^(.+) suivies$/, (m, a) => `${tr(a)} tracked`],
    [/^(.+) suivies par Linkgeek$/, (m, a) => `${tr(a)} tracked by Linkgeek`],
    [/^Steam \+ (.+) suivies par Linkgeek$/, (m, a) => `Steam + ${tr(a)} tracked by Linkgeek`],
    [/^Même moment en (\S+)$/, (m, a) => `Same time in ${tr(a)}`],
    [/^(lun|mar|mer|jeu|ven|sam|dim)\.$/, (m, a) => ({ lun: 'Mon', mar: 'Tue', mer: 'Wed', jeu: 'Thu', ven: 'Fri', sam: 'Sat', dim: 'Sun' })[a]],
    [/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)$/, (m, a) => ({ lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' })[a]],
    [/^Tu as joué (\d+) % de (plus|moins) que la moyenne de tes amis cette semaine\.$/, (m, a, b) => `You played ${a}% ${b === 'plus' ? 'more' : 'less'} than your friends on average this week.`],
    [/^Moyenne de (\d+) amis? : (.+) h · toi : (.+) h$/, (m, a, b, c) => `Average of ${a} friend${a > 1 ? 's' : ''}: ${b.replace(',', '.')} h · you: ${c.replace(',', '.')} h`],
    [/^(\d+) jeux Steam(?: dont (\d+) gratuits?)?$/, (m, a, b) => `${a} Steam games${b ? `, ${b} free` : ''}`],
    [/^(\d+) jours?$/, (m, a) => `${a} day${a > 1 ? 's' : ''}`],
    [/^Série en cours : (\d+) jours?$/, (m, a) => `Current streak: ${a} day${a > 1 ? 's' : ''}`],
    [/^Ajouté le (.+)$/, 'Added on $1'],
    [/^Récap (?:de |d')(\S+) (\d{4})$/, (m, a, b) => `${tr(a)} ${b} recap`],
    [/^(.+) t'a coûté$/, '$1 cost you'], [/^de l'heure 😄$/, 'per hour 😄'],
    [/^Mon année (\d{4})$/, 'My $1'],
    [/^soit (\d+) % de ton temps de jeu$/, '$1% of your playtime'],
    [/^Ton top (\d)$/, 'Your top $1'],
    [/^le (\d+ \S+)$/, 'on $1'],
    // home: info carousel
    [/^Prochain tour dans (\d+) h (\d+) min$/, 'Next spin in $1 h $2 min'],
    [/^(\d+) défis? du jour à terminer$/, (m, n) => `${n} daily challenge${n > 1 ? 's' : ''} left`],
    [/^Succès · palier (.+)$/, (m, a) => `Achievement · ${tr(a)} tier`],
    [/^Niveau (\d+) · (.+)$/, (m, a, b) => `Level ${a} · ${tr(b)}`],
    [/^Encore ([\d\s  ]+) XP pour le niveau (\d+)$/, '$1 more XP for level $2'],
    [/^Badge (.+) et son contour au niveau (\d+)\.$/, (m, a, b) => `${tr(a)} badge and its frame at level ${b}.`],
    [/^Tu es (\d+)e cette semaine$/, 'You are #$1 this week'],
    [/^([\d,]+) h de jeu depuis lundi\.$/, (m, a) => `${a.replace(',', '.')} h played since Monday.`],
    [/^(\d+) demandes? d'ami en attente$/, (m, n) => `${n} pending friend request${n > 1 ? 's' : ''}`],
    [/^(\d+) amis? en ligne$/, (m, n) => `${n} friend${n > 1 ? 's' : ''} online`],
    [/^(.+) \/ (.+) · \+(\d+) XP$/, (m, a, b, c) => `${tr(a)} / ${tr(b)} · +${c} XP`],
    [/^(.+) \/ (.+) · encore (.+)$/, (m, a, b, c) => `${a} / ${b} · ${c} to go`],
    // profile: showcase
    [/^Emplacement (\d)$/, 'Slot $1'],
    [/^Seuls tes succès débloqués sont proposés \((\d+)\)\.$/, 'Only your unlocked achievements are listed ($1).'],
    // shop: daily wheel
    [/^(\d+) jetons$/, '$1 tokens'], [/^(\d+) XP$/, '$1 XP'],
    [/^Prochain tour gratuit dans (\d+) h (\d+) min$/, 'Next free spin in $1 h $2 min'],
    [/^le thème (.+)$/, (m, a) => `the ${tr(a)} theme`],
    [/^(\d+) jetons \(tu avais déjà tous les thèmes\)$/, '$1 tokens (you already had every theme)'],
    [/^Si tu as déjà tous les thèmes de la Boutique, le thème est remplacé par (\d+) jetons\.$/, 'If you already own every Shop theme, the theme is replaced by $1 tokens.'],
    [/^Roulette du jour : \+(\d+) XP$/, 'Daily wheel: +$1 XP'],
    [/^Jackpot ! Tu gagnes le thème (.+) 🎉 Applique-le dans la liste des thèmes\.$/, (m, a) => `Jackpot! You win the ${tr(a)} theme 🎉 Apply it from the theme list.`],
    [/^Roulette : (\d+) (jetons|XP)$/, (m, a, b) => `Wheel: ${a} ${b === 'XP' ? 'XP' : 'tokens'}`],
    [/^Roulette : thème (.+) gagné$/, (m, a) => `Wheel: ${tr(a)} theme won`],
    // home: global weekly leaderboard
    [/^Du lundi (\d+) (\S+) au dimanche (\d+) (\S+) · remis à zéro chaque lundi$/, (m, a, b, c, d) => {
      const M = { janvier: 'January', février: 'February', mars: 'March', avril: 'April', mai: 'May', juin: 'June', juillet: 'July', août: 'August', septembre: 'September', octobre: 'October', novembre: 'November', décembre: 'December' };
      return `Monday ${M[b] || b} ${a} to Sunday ${M[d] || d} ${c} · resets every Monday`;
    }],
    [/^(\d+(?:,\d)?) h$/, (m, a) => `${a.replace(',', '.')} h`],
    // admin dashboard
    [/^([\d\s  ]+) actifs · ([\d\s  ]+) absents$/, '$1 active · $2 away'],
    [/^\+([\d\s  ]+) cette semaine · \+([\d\s  ]+) en 30 jours$/, '+$1 this week · +$2 in 30 days'],
    [/^max (\d+)$/, 'max $1'], [/^([\d\s  ]+) h$/, '$1 h'],
    [/^Dernière mise à jour : (.+?)\. Seuls des totaux sont affichés : aucun nom ni adresse de joueur\. « En ligne » compte les joueurs dont Linkgeek a donné signe de vie depuis moins de 3 minutes\.$/, 'Last updated: $1. Only totals are shown: no player names or addresses. “Online” counts players whose Linkgeek checked in less than 3 minutes ago.'],
    [/^D'après ton temps de jeu sur (\d+) jeux?$/, 'From your playtime on $1 game(s)'], [/^Voir (.+) sur Steam$/, 'See $1 on Steam'],
    [/^(\d+) jeux?$/, '$1 game(s)'], [/^(\d+) %$/, '$1%'], [/^👍 (\d+) %$/, '👍 $1%'], [/^−(\d+) %$/, '−$1%'],
    [/^Les nouveautés automatiques ne sont disponibles que pour les jeux Steam : (.+) ne les publie pas\.$/, 'Automatic news is only available for Steam games: $1 does not publish it.'],
    [/^« (.+) »$/, (m, a) => `“${tr(a)}”`],
    [/^(\d+) \/ (\d+) débloqués · ils ne s'achètent pas : remplis la condition pour les gagner, puis affiche-en un sous ton pseudo$/, "$1 / $2 unlocked · they can't be bought: meet the goal to earn them, then show one under your name"],
    [/^Titre « (.+) » affiché sur ton profil$/, (m, a) => `Title “${tr(a)}” shown on your profile`],
    [/^Débloqué le (.+)$/, (m, a) => `Unlocked on ${tr(a)}`],
    [/^Moi \((.+)\)$/, 'Me ($1)'], [/^Pour toi : (.+)$/, 'For you: $1'], [/^Envoyé à (.+?) : (.+) ✓$/, 'Sent to $1: $2 ✓'],
    [/^[−-]([\d\s  ]+) jetons$/, '−$1 tokens'],
    [/^\+(.+) jetons$/, '+$1 tokens'], [/^([\d\s  ]+) jetons$/, '$1 tokens'],
    [/^Encore (.+) jetons$/, '$1 more tokens'], [/^Il te manque (.+) jetons pour ce thème$/, 'You need $1 more tokens for this theme'],
    [/^Il te manque (.+) jetons$/, 'You need $1 more tokens'],
    [/^(✓ )?Chaque défi terminé : 1 jeton pour (\d+) XP \(un défi à (\d+) XP = (\d+) jetons\)$/, '$1Each completed challenge: 1 token per $2 XP (a $3 XP challenge = $4 tokens)'],
    [/^(🔒 )?Thèmes rares dès le niveau (\d+), épiques dès le niveau (\d+)$/u, '$1Rare themes from level $2, epic themes from level $3'],
    [/^Niveau (\d+) requis$/, 'Level $1 required'],
    [/^([✓🔒] )Niveau (\d+)$/u, '$1Level $2'],
    [/^Tu es niveau (\d+) · encore (\d+) niveaux?$/, (m, a, b) => `You are level ${a} · ${b} more level${b > 1 ? 's' : ''}`],
    [/^Il faut être niveau (\d+) pour acheter un thème (rare|épique)$/, (m, a, b) => `You must be level ${a} to buy ${b === 'rare' ? 'a rare' : 'an epic'} theme`],
    [/^(⬆ )?Chaque nouveau niveau : 20 \+ 5 × le niveau \(niveau 20 = 120 jetons\)$/, '$1Each new level: 20 + 5 × the level (level 20 = 120 tokens)'],
    [/^(\d+) \/ (\d+) possédés · les thèmes achetés apparaissent aussi dans Paramètres → Apparence$/, '$1 / $2 owned · bought themes also appear in Settings → Appearance'],
    [/^Encore (\d+) thèmes à débloquer avec tes jetons\.$/, '$1 more themes to unlock with your tokens.'],
    [/^Acheter le thème (.+) \?$/, (m, a) => `Buy the ${tr(a)} theme?`],
    [/^Il coûte (.+) jetons\. Il te restera (.+) jetons\. Le thème sera appliqué tout de suite\.$/, 'It costs $1 tokens. You will have $2 tokens left. The theme is applied right away.'],
    [/^Thème (.+) acheté et appliqué 🎉$/, (m, a) => `${tr(a)} theme bought and applied 🎉`],
    [/^Défi : (.+)$/, (m, a) => `Challenge: ${tr(a)}`], [/^Niveau (\d+) atteint$/, 'Level $1 reached'], [/^Achat : thème (.+)$/, (m, a) => `Purchase: ${tr(a)} theme`],
    [/^Bonus d'ouverture de la Boutique \(niveaux 2 à (\d+)\)$/, 'Shop opening bonus (levels 2 to $1)'],
    [/^Rang actuel : (.+)$/, (m, a) => `Current rank: ${tr(a)}`], [/^Contour (.+)$/, (m, a) => `${tr(a)} frame`],
    [/^(\d+) \/ (\d+) découverts · ils se révèlent quand tu les débloques$/, '$1 / $2 found · they reveal themselves once unlocked'],
    [/^(\d+) \/ (\d+) trophées au rang maximum$/, '$1 / $2 trophies at the highest rank'],
    [/^(\d+) pts · trophée caché$/, '$1 pts · hidden trophy'], [/^(\d+) pts · le dernier trophée de Linkgeek$/, "$1 pts · Linkgeek's final trophy"],
    [/^Débloqué le (.+) · (\d+) pts$/, (m, d, p) => `Unlocked on ${tr(d)} · ${p} pts`],
    [/^Débloqué le (.+) : le badge Ultime brille sur ton profil\.$/, (m, d) => `Unlocked on ${tr(d)}: the Ultimate badge shines on your profile.`],
    [/^Membre depuis (\S+) (\d{4})$/, (m, mo, y) => `Member since ${MONTHS[mo] || mo} ${y}`],
    [/^Jeu du mois · (\S+) (\d{4})$/, (m, mo, y) => `Game of the month · ${MONTHS[mo] || mo} ${y}`],
    [/^Série en cours : (\d+) jours? 🔥$/, (m, n) => `Current streak: ${n} day${n === '1' ? '' : 's'} 🔥`],
    [/^(\d+) jours?$/, (m, n) => `${n} day${n === '1' ? '' : 's'}`],
    [/^(.+) de jeu ce mois-ci$/, '$1 played this month'],
    [/^Fait partie des (\d+) premiers membres de Linkgeek \(membre n° (\d+)\)$/, 'One of the first $1 Linkgeek members (member #$2)'],
    [/^(Discord|Twitch|TikTok) : (.+) \(cliquer pour copier\)$/, '$1: $2 (click to copy)'],
    [/^Pseudo Discord copié : (.+)$/, 'Discord username copied: $1'],
    [/^(.+) XP au total · encore (.+) XP avant le niveau (\d+)( · prochain badge :)?$/, (m, a, b, c, d) => `${a} total XP · ${b} XP to level ${c}${d ? ' · next badge:' : ''}`],
    [/^au niveau (\d+)$/, 'at level $1'],
    [/^(\d+) restants? · nouveaux défis dans (.+)$/, '$1 left · new challenges in $2'],
    [/^Tous terminés 🎉 · nouveaux défis dans (.+)$/, 'All done 🎉 · new challenges in $1'],
    [/^Défis uniques · (\d+) \/ (\d+) terminés$/, 'One-time challenges · $1 / $2 done'],
    [/^(\d+) \/ (\d+) paliers débloqués$/, '$1 / $2 tiers unlocked'],
    [/^\/ (.+) points de succès · (\d+) %$/, '/ $1 achievement points · $2%'],
    [/^Prochain palier : (.+)$/, (m, a) => `Next tier: ${tr(a)}`],
    [/^Terminé : (.+)$/, (m, a) => { const t = tr(cap(a)); return `Done: ${t.charAt(0).toLowerCase()}${t.slice(1)}`; }],
    [/^(\d+) taille\(s\) en calcul$/, '$1 size(s) being calculated'],
    [/^(\d+) déjà lancés · (\d+) jamais joués$/, '$1 launched · $2 never played'],
    [/^Jeux (.+)$/, (m, a) => `Games ${tr(a)}`],
    [/^✓ activé(.*)$/, (m, a) => `✓ enabled${a.replace(' (fichier partagé)', ' (shared file)')}`],
    [/^✓ configurée(.*)$/, (m, a) => `✓ set up${a.replace(' (fichier google-oauth.json)', ' (google-oauth.json file)')}`],
    [/^Linkgeek garde ton nom, ton e-mail et ta photo(, ainsi qu'une clé de session chiffrée pour le mode en ligne)?\. Aucun mot de passe n'est conservé\.$/,
      (m, a) => `Linkgeek keeps your name, e-mail and picture${a ? ', plus an encrypted session key for online mode' : ''}. No password is stored.`],
    [/^Niveau (\d+) · (.+)$/, (m, a, b) => `Level ${a} · ${tr(b)}`],
    [/^Niveau (\d+)$/, 'Level $1'],
    [/^([\d\s  ,.]+ ?h(?: \d+ min)?|[\d]+ min) de jeu au total$/, '$1 played in total'],
    [/^(\d+) jeux? · (.+) de jeu · (.+)$/, '$1 games · $2 played · $3'],
    [/^(\d+) jeux? lancés?$/, '$1 games launched'],
    [/^(\d+) (jeu|jeux) · (.+)$/, (m, a, b, c) => `${a} game${a === '1' ? '' : 's'} · ${tr(c)}`],
    [/^(\d+) en ligne · (\d+) amis?$/, '$1 online · $2 friend(s)'],
    [/^« (.+) » · (\d+) résultats?$/, '"$1" · $2 result(s)'],
    [/^Vu (.+)$/, (m, a) => `Seen ${tr(a)}`],
    [/^[Ii]l y a (\d+) min$/, '$1 min ago'], [/^[Ii]l y a (\d+) h$/, '$1 h ago'],
    [/^[Ii]l y a (\d+) (jours?|mois|ans?|semaines?)$/, (m, n, u) => {
      const w = { j: 'day', m: 'month', a: 'year', s: 'week' }[u[0]];
      return `${n} ${w}${n === '1' ? '' : 's'} ago`;
    }],
    [/^[Ii]l y a (.+)$/, '$1 ago'],
    [/^Badge (.+)$/, (m, a) => `${tr(a)} badge`],
    [/^(\d+) j (\d+) h$/, '$1 d $2 h'], [/^(\d+) j$/, '$1 d'],
    [/^depuis (\d+) min$/, 'for $1 min'], [/^depuis (\d+) h(.*)$/, 'for $1 h$2'],
    [/^(\d+) jeux détectés actuellement$/, '$1 games currently found'],
    [/^(\d+) jeux? masqués?$/, '$1 hidden game(s)'],
    [/^(\d+) jeux trouvés$/, '$1 games found'],
    [/^Lancement de (.+)…$/, 'Launching $1…'],
    [/^Mise à jour (.+) prête$/, 'Update $1 ready'],
    [/^Version actuelle : (.+) · Linkgeek vérifie tout seul toutes les 6 heures$/, 'Current version: $1 · Linkgeek checks by itself every 6 hours'],
    [/^Version actuelle : (.+)$/, 'Current version: $1'],
    [/^Version (\S+) · vérifié (.+)$/, (m, a, b) => `Version ${a} · checked ${tr(b)}`],
    [/^Téléchargement de la version (.+)…$/, 'Downloading version $1…'],
    [/^Préparation de la version (.+)…$/, 'Preparing version $1…'],
    [/^Version (.+) prête à être installée$/, 'Version $1 ready to install'],
    [/^Nouveautés de la version (.+)$/, "What's new in version $1"],
    [/^(\d+) % · ([\d,]+) Mo \/ ([\d,]+) Mo$/, (m, a, b, c) => `${a} % · ${b.replace(',', '.')} MB / ${c.replace(',', '.')} MB`],
    [/^✓ Linkgeek a été mis à jour en version (.+)$/, '✓ Linkgeek was updated to version $1'],
    [/^Linkgeek a été mis à jour en version (.+) ✓$/, 'Linkgeek was updated to version $1 ✓'],
    [/^La version (.+) est publiée sans le fichier \.zip de mise à jour$/, 'Version $1 was published without the update .zip file'],
    [/^La mise à jour (.*) n'a pas pu être installée \((.+)\)$/, 'Update $1 could not be installed ($2)'],
    [/^GitHub a répondu (\d+)$/, 'GitHub answered $1'],
    [/^Étape (\d+) sur (\d+)$/, 'Step $1 of $2'],
    [/^Relié le (.+)$/, (m, a) => `Linked on ${tr(a)}`],
    [/^Version (.+)$/, 'Version $1'],
    [/^Collection « (.+) » créée$/, 'Collection "$1" created'],
    [/^Ajouté à « (.+) »$/, 'Added to "$1"'], [/^Retiré de « (.+) »$/, 'Removed from "$1"'],
    [/^« (.+) » sera supprimée\. Les jeux restent dans ta bibliothèque\.$/, '"$1" will be deleted. The games stay in your library.'],
    [/^(.+) a été retiré de tes amis$/, '$1 was removed from your friends'],
    [/^(.+) ne sera plus dans ta liste d'amis, et tu disparaîtras de la sienne\.$/, '$1 will no longer be in your friends list, and you will disappear from theirs.'],
    [/^(.+) veut t'ajouter en ami$/, '$1 wants to be your friend'],
    [/^(.+) n'a pas encore partagé son profil : il apparaîtra quand son Linkgeek sera à jour\.$/, '$1 has not shared a profile yet: it will appear once their Linkgeek is up to date.'],
    [/^Voir le profil de (.+)$/, "See $1's profile"],
    [/^(\d+) demande\(s\) d'ami$/, '$1 friend request(s)'], [/^(\d+) ami\(s\) en ligne$/, '$1 friend(s) online'],
    [/^(\d+) défi\(s\) du jour restant\(s\)$/, '$1 daily challenge(s) left'],
    [/^Renouvelés dans (.+)$/, (m, a) => `Renewed in ${tr(a)}`], [/^nouveaux défis dans (.+)$/, (m, a) => `new challenges in ${tr(a)}`],
    [/^(.+) XP avant le niveau (\d+)$/, '$1 XP to level $2'],
    [/^(.+) XP au total · encore (.+)$/, '$1 total XP · $2 more'],
    [/^(.+) h de jeu$/, '$1 h played'],
    [/^Lance (\d+) sessions de jeu$/, 'Launch $1 play sessions'], [/^Joue à (\d+) jeux différents$/, 'Play $1 different games'],
    [/^Joue (\d+) jours différents$/, 'Play on $1 different days'], [/^Joue sur (\d+) plateformes différentes$/, 'Play on $1 different platforms'],
    [/^Joue (\d+) fois avec des amis$/, 'Play $1 times with friends'], [/^Termine (\d+) défis quotidiens$/, 'Complete $1 daily challenges'],
    [/^Jouer avec ([\d\s\u202f\u00a0]+) amis? différents?$/, 'Play with $1 different friend(s)'], [/^Jouer à ([\d\s\u202f\u00a0]+) (jeu|jeux) différents?$/, 'Play $1 different game(s)'],
    [/^Cumuler ([\d\s\u202f\u00a0]+) heures? de jeu au total$/, 'Play $1 hour(s) in total'], [/^Passer ([\d\s\u202f\u00a0]+) heures? sur un même jeu$/, 'Spend $1 hour(s) on a single game'],
    [/^Jouer (\d+) heures? d'affilée$/, 'Play $1 hour(s) in a row'], [/^Lancer ([\d\s\u202f\u00a0]+) sessions? de jeu$/, 'Launch $1 play session(s)'],
    [/^Jouer (\d+) jours? différents?$/, 'Play on $1 different day(s)'], [/^Lancer ([\d\s\u202f\u00a0]+) sessions? entre minuit et 5 h$/, 'Launch $1 session(s) between midnight and 5 am'],
    [/^Avoir (\d+) (jeu|jeux) dans ta bibliothèque$/, 'Have $1 game(s) in your library'], [/^Jouer sur (\d+) plateformes (.+)$/, 'Play on $1 platforms $2'],
    [/^Avoir (.+) Go de jeux installés$/, 'Have $1 GB of games installed'], [/^Avoir (\d+) amis?$/, 'Have $1 friend(s)'],
    [/^Mettre ([\d\s\u202f\u00a0]+) (jeu|jeux) en favori$/, 'Favorite $1 game(s)'],
    [/^Niveau fixé à (\d+)(.*)$/, (m, a, b) => `Level set to ${a}${tr(b.trim()) ? ' ' + tr(b.trim()) : ''}`],
    [/^Niveau (\d+) attribué par (.+)$/, 'Level $1 given by $2'], [/^Cadeau de (.+)$/, 'Gift from $1'],
    [/^(.+) — de (.+)$/, '$1 — from $2'],
    [/^Jouer (\d+) h$/, 'Play $1 h'],
    [/^(\d+) h (\d+) min$/, '$1 h $2 min'],
  ];

  const MONTHS = { janvier: 'January', février: 'February', mars: 'March', avril: 'April', mai: 'May', juin: 'June', juillet: 'July', août: 'August', septembre: 'September', octobre: 'October', novembre: 'November', décembre: 'December' };
  const DAYS = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
  const UNITS = [[/\bMo\b/g, 'MB'], [/\bGo\b/g, 'GB'], [/\bTo\b/g, 'TB'], [/\bKo\b/g, 'KB'], [/\bpts\b/g, 'pts']];

  function tr(s) {
    if (!s) return s;
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    for (const [re, rep] of P) if (re.test(s)) return s.replace(re, rep);
    let out = s;
    // dates written by toLocaleDateString('fr-FR')
    out = out.replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g, (d) => DAYS[d]);
    out = out.replace(/\b(\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)( \d{4})?/g, (m, d, mo, y) => `${MONTHS[mo]} ${d}${y ? ',' + y : ''}`);
    for (const [re, rep] of UNITS) out = out.replace(re, rep);
    return out;
  }

  const ORIG = new WeakMap();
  let on = false;

  function translateText(node) {
    const raw = node.nodeValue;
    if (!raw || !/[A-Za-zÀ-ÿ]/.test(raw)) return;
    const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const t = tr(m[2]);
    if (t !== m[2]) { ORIG.set(node, raw); node.nodeValue = m[1] + t + m[3]; }
  }

  function translateAttrs(el) {
    for (const a of ['title', 'placeholder', 'aria-label']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const t = tr(v.trim()); if (t !== v.trim()) el.setAttribute(a, t); }
    }
  }

  function walk(root) {
    if (root.nodeType === 3) return translateText(root);
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE' || root.tagName === 'TEXTAREA') return;
    translateAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TEXTAREA' || p.isContentEditable)) continue;
        translateText(n);
      } else translateAttrs(n);
    }
  }

  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData' && !ORIG.has(m.target)) translateText(m.target);
      else if (m.type === 'attributes') translateAttrs(m.target);
    }
  });

  window.applyLanguage = function (lang) {
    const en = lang === 'en';
    if (en === on) return;
    if (!en) { location.reload(); return; } // back to the original French
    on = true;
    document.documentElement.lang = 'en';
    try { localStorage.setItem('linkgeek-lang', 'en'); } catch { /* ignore */ }
    walk(document.body);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder'] });
  };
  window.linkgeekTr = tr;

  // apply before the first paint when English was chosen last time
  try {
    if (localStorage.getItem('linkgeek-lang') === 'en') document.addEventListener('DOMContentLoaded', () => window.applyLanguage('en'));
  } catch { /* ignore */ }
  const origReload = window.applyLanguage;
  window.applyLanguage = function (lang) {
    if (lang !== 'en') { try { if (localStorage.getItem('linkgeek-lang') === 'en') { localStorage.removeItem('linkgeek-lang'); if (on) { location.reload(); return; } } } catch { /* ignore */ } }
    origReload(lang);
  };
})();

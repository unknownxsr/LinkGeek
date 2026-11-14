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
    [/^(✓ )?Chaque défi terminé : 1 jeton pour (\d+) XP \(un défi à 60 XP = 12 jetons\)$/, '$1Each completed challenge: 1 token per $2 XP (a 60 XP challenge = 12 tokens)'],
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

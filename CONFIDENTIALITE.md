# Politique de confidentialité de Linkgeek

*Dernière mise à jour : 14 novembre 2026*

Linkgeek est un launcher de jeux gratuit pour Windows, développé par Zenshyy, une personne qui édite l'application à titre personnel. Cette page explique quelles données Linkgeek utilise, pourquoi, où elles sont stockées et comment les faire supprimer.

## En résumé

- **Sans compte Google, rien ne quitte ton PC.** Ta bibliothèque, ton temps de jeu, tes statistiques, tes succès, tes défis et ton niveau restent sur ton ordinateur.
- **Avec le mode en ligne (connexion Google),** seules les infos nécessaires au système d'amis sont envoyées : ton pseudo, ta photo, ton code ami, ton niveau, ton statut, le jeu en cours et une carte de profil visible par tes amis.
- **Tu peux supprimer ton compte en ligne toi-même**, en un clic, depuis Paramètres → Compte.
- **Ces données ne sont jamais vendues ni partagées** à des fins publicitaires, et Linkgeek ne contient aucun traqueur ni aucune publicité.

## 1. Données qui restent sur ton ordinateur

Linkgeek analyse tes jeux installés (Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app, GOG et les jeux ajoutés à la main) et enregistre localement :

- la liste de tes jeux, leurs jaquettes, tes favoris, tes collections et les jeux masqués ;
- ton temps de jeu, tes sessions, tes succès, tes défis, ton XP et ton niveau ;
- tes jetons de la Boutique et les thèmes achetés ;
- ton profil local (pseudo, avatar, top 5) et tes réglages.

Ces données sont stockées dans le dossier `%APPDATA%\Linkgeek` de ton PC. **Elles ne sont envoyées à personne**, sauf ce qui est décrit aux sections 3 à 6. Tu peux les supprimer à tout moment en effaçant ce dossier.

## 2. Connexion avec Google (facultative)

La connexion se fait dans ton navigateur, directement sur la page de Google : **Linkgeek ne voit jamais ton mot de passe.** Linkgeek demande uniquement les autorisations de base `openid`, `email` et `profile`, et récupère :

- ton identifiant Google, ton adresse e-mail, ton nom et ta photo de profil.

Le jeton d'accès Google est **révoqué immédiatement** après la lecture de ton profil. Ton nom, ton e-mail et ta photo sont gardés sur ton PC pour afficher ton compte dans l'application.

## 3. Données envoyées en ligne (mode en ligne et amis)

Si tu te connectes avec Google, Linkgeek utilise **Google Firebase** (Authentication et Realtime Database) pour faire fonctionner le système d'amis. Sont alors stockés en ligne :

| Donnée | Pourquoi | Qui peut la voir |
|---|---|---|
| Ton compte Firebase (identifiant, e-mail Google) | Te connecter | Personne d'autre (seulement l'administrateur du projet Firebase) |
| Ton pseudo, ta photo, ton code ami | T'afficher dans la liste d'amis et les demandes d'ami | Les joueurs connectés à Linkgeek |
| Si tu as choisi ta propre photo de profil dans Linkgeek : une petite copie (128 × 128 pixels, JPEG) | La montrer à tes amis à la place de ta photo Google | Les joueurs connectés à Linkgeek. **Effacée du serveur** si tu reviens à la photo par défaut ou supprimes ton compte en ligne |
| Ton niveau, la date de son dernier changement, le contour de photo et le titre choisis | Afficher ton badge de niveau et ton contour ; limiter la triche (le serveur n'accepte qu'une montée de niveau à la fois) | Les joueurs connectés à Linkgeek |
| Ton statut (en ligne, absent, hors ligne) et le jeu en cours (nom, plateforme, image) | Montrer à tes amis à quoi tu joues, et les prévenir quand tu lances un jeu | **Tes amis uniquement** |
| La date de création de ton compte et ton numéro de membre (dans l'ordre d'inscription) | Afficher « Membre depuis » et le badge « Fondateur » des 100 premiers membres | Les joueurs connectés à Linkgeek |
| Ta carte de profil : ton top 5 (noms et images des jeux), ton jeu le plus joué et son temps de jeu, ton nombre de jeux, ton temps de jeu total et celui de la semaine, ton nombre de succès et de points (et si tu as le trophée ultime), tes records (session la plus longue, plus longue série de jours joués, jeu du mois), les 5 succès que tu as choisi de mettre en vitrine (nom, palier, icône) et les pseudos Discord, Twitch et TikTok que tu as choisi d'ajouter | Afficher ton profil quand un ami clique sur toi, et le classement entre amis | **Tes amis uniquement** |
| Ton entrée au classement général de la semaine : pseudo, photo Google, contour, titre, niveau et heures de jeu du lundi au dimanche (une entrée par semaine) | Afficher le top 10 des joueurs de la semaine sur l'accueil | **Tous les joueurs connectés.** Tu peux t'en retirer à tout moment : Paramètres → Général → « Apparaître dans le classement général » (ton entrée de la semaine est alors effacée) |
| Tes demandes d'ami et ta liste d'amis | Gérer tes amis | Toi (et la personne concernée par une demande) |
| Les cadeaux d'XP ou de niveau envoyés par l'administrateur de Linkgeek (montant, message, nom de l'expéditeur, date) | Te les remettre | Toi. **Ils sont effacés du serveur dès que ton Linkgeek les reçoit.** |

Linkgeek garde une connexion ouverte avec la base de données pendant que tu es connecté, pour que les changements (amis en ligne, jeux lancés) arrivent en temps réel. Aucune donnée supplémentaire n'est envoyée pour cela.

La base de données est hébergée dans **l'Union européenne (Belgique, région europe-west1)**. Les règles de sécurité de la base empêchent un joueur de lire ou de modifier les données d'un autre en dehors de ce qui est décrit dans le tableau.

**Le rôle d'administrateur :** un seul compte (celui de l'éditeur) peut envoyer de l'XP ou un niveau à un joueur, modifier la table des rangs et afficher un badge « Admin ». Pour suivre la santé du service, son Linkgeek peut aussi lire les profils publics, les statuts, les cartes de profil et les listes d'amis de tous les joueurs, afin de calculer des **statistiques globales** (nombre de joueurs en ligne, actifs, nouveaux inscrits, temps de jeu total, jeux les plus joués, répartition des niveaux, nombre d'amitiés). Le tableau de bord n'affiche que ces totaux et des noms de jeux, jamais le nom, l'e-mail ou les réseaux d'un joueur, et rien n'est conservé à part l'historique du nombre de joueurs en ligne, sur le PC de l'administrateur, pendant 7 jours. La table des rangs (noms des badges et niveaux requis) ne contient aucune donnée personnelle.

**Base légale :** ces données sont traitées parce que tu as choisi d'activer le mode en ligne (exécution du service que tu demandes, article 6.1.b du RGPD).

**Durée de conservation :** tes données en ligne sont gardées tant que ton compte existe. Quand tu supprimes ton compte en ligne, elles sont effacées immédiatement (voir section 7).

## 4. Discord (facultatif)

Si tu actives « Afficher mon jeu sur Discord » et que l'application Discord est ouverte sur ton PC, Linkgeek lui transmet **localement** le nom et l'image du jeu en cours, ainsi que l'heure de début. Discord les affiche alors sur ton profil, à tes contacts Discord, selon tes réglages Discord. Linkgeek n'envoie rien à Discord par Internet ; c'est l'application Discord qui le fait, selon sa propre politique de confidentialité. Tu peux désactiver cette option à tout moment dans Paramètres → Général.

## 5. Mises à jour automatiques

Linkgeek vérifie régulièrement s'il existe une nouvelle version sur **GitHub** (github.com), où les versions sont publiées. Cette vérification n'envoie aucune donnée personnelle : seulement une requête technique classique (adresse IP, version de Windows), comme pour n'importe quelle page web.

## 6. Images des jeux

Pour afficher les jaquettes, Linkgeek charge des images depuis les serveurs des boutiques (par exemple Steam). Pour les jeux dont le launcher ne fournit pas d'image (Battle.net, Ubisoft Connect, EA app, GOG, jeux ajoutés à la main), Linkgeek **envoie le nom du jeu** à la recherche du magasin Steam pour trouver sa jaquette. Ces serveurs reçoivent une requête technique classique (adresse IP), comme quand tu visites leur site. Aucune information sur toi n'est jointe.

Pour afficher les nouveautés de tes jeux Steam (notes de mise à jour, annonces), Linkgeek interroge l'**API publique des actualités Steam** avec **l'identifiant Steam du jeu**, au plus une fois toutes les 3 heures par jeu. Rien d'autre n'est envoyé.

Pour la section « Recommandés pour toi », Linkgeek calcule **sur ton PC** ton profil de joueur (tes genres préférés d'après ton temps de jeu). Il demande ensuite à **SteamSpy** la liste des jeux populaires de ces genres (seul le nom du genre est envoyé, par exemple « Survival »), puis au **magasin Steam** leur prix actuel (seuls les identifiants Steam des jeux proposés sont envoyés). Ton profil, ta bibliothèque et ton temps de jeu ne quittent pas ton PC.

Pour la « Valeur de ta bibliothèque » (page Statistiques), Linkgeek demande au **magasin Steam** le prix public de tes jeux Steam : seuls leurs identifiants Steam sont envoyés, sans compte ni temps de jeu. Les prix sont gardés 7 jours sur ton PC ; le calcul de la valeur et du coût par heure se fait sur ton PC. Le « Linkgeek Wrapped » (récap du mois ou de l'année) est lui aussi calculé sur ton PC, et son image n'est enregistrée ou copiée que si tu le demandes.

Pour les titres de profil (« Pro du FPS », « Survivant »…), Linkgeek doit connaître le genre des jeux auxquels tu as joué. Il envoie pour cela **l'identifiant Steam de ces jeux** au service public **SteamSpy** (steamspy.com), qui renvoie leurs étiquettes (tir, survie, RPG…). Seul l'identifiant du jeu est envoyé, jamais ton nom, ton compte ou ton temps de jeu. Tu peux aussi corriger le genre d'un jeu à la main sur sa page.

## 7. Tes droits

Conformément au RGPD, tu peux à tout moment **consulter, corriger ou supprimer** tes données, t'opposer à leur traitement ou demander à en recevoir une copie.

- **Arrêter le mode en ligne :** Paramètres → Compte → « Se déconnecter ».
- **Supprimer ton compte en ligne et toutes tes données en ligne :** Paramètres → Compte → « Supprimer mon compte en ligne ». Linkgeek efface du serveur ton profil, ton niveau, ton code ami, ton statut, ta carte de profil, tes amitiés (des deux côtés), tes demandes d'ami et tes cadeaux en attente, puis ton compte Firebase. Si tu ne peux plus ouvrir Linkgeek, écris à **linkgeek.contact@gmail.com** depuis l'adresse de ton compte Google, en indiquant ton code ami : la suppression est faite sous 30 jours.
- **Supprimer tes données locales :** désinstalle Linkgeek, puis supprime le dossier `%APPDATA%\Linkgeek`.

Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la **CNIL** (www.cnil.fr).

## 8. Mineurs

Le mode en ligne utilise un compte Google. Il est donc soumis à l'âge minimum fixé par Google pour avoir un compte (en France, 15 ans sans autorisation des parents).

## 9. Modifications

Cette politique peut évoluer avec l'application. La date en haut de la page indique la dernière mise à jour. En cas de changement important, il sera signalé dans les notes de version.

## Contact

Zenshyy, **linkgeek.contact@gmail.com**

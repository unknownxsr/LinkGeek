# Linkgeek

Le launcher de jeux qui rassemble **Steam, Epic Games, Xbox / Game Pass, Microsoft Store, Battle.net, Ubisoft Connect, EA app, GOG** et tes jeux ajoutés à la main, avec ton temps de jeu, tes statistiques, des succès, des défis et des niveaux, un système d'amis (profils, classement, notifications) et Discord. Disponible en français et en anglais.

## Télécharger

👉 **[Télécharger la dernière version](https://github.com/unknownxsr/linkgeek/releases/latest)** : prends le fichier `Linkgeek-Setup-x.x.x.exe`.

Linkgeek se met ensuite à jour tout seul.

### « Windows a protégé votre ordinateur » ?

Linkgeek est un projet indépendant et son installateur n'est pas encore signé numériquement, donc Windows SmartScreen affiche un avertissement au premier lancement. Pour continuer, clique sur **Informations complémentaires**, puis sur **Exécuter quand même**.

## Confidentialité

Sans compte Google, rien ne quitte ton PC. Pour tous les détails, lis la [politique de confidentialité](CONFIDENTIALITE.md).

---

## Pour le développeur

```bash
npm install          # première fois seulement
npm start            # lancer en mode développement
npm run dist         # créer l'installateur dans dist/
```

Pour publier une nouvelle version, suis le fichier [PUBLIER.md](PUBLIER.md).

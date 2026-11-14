# Publier une version de Linkgeek

> **Important :** sur ton PC, Smart App Control bloque la fabrication de l'installateur `.exe` (`npm run dist` échoue avec « spawn UNKNOWN » : Windows refuse de lancer l'installateur non signé qu'electron-builder vient de créer).
> L'installateur `.exe` est donc fabriqué **par GitHub**, sur ses serveurs, grâce au fichier `.github/workflows/release.yml`.
> Le `.zip` (plan B pour les testeurs bloqués) se fabrique toujours sur ton PC avec `npm run setup`.

## Première publication (une seule fois)

1. Connecte-toi à **github.com** avec ton compte **unknownxsr**.
2. Crée un dépôt **public** nommé **`linkgeek`** (New repository).
3. Envoie le contenu de ce dossier sur le dépôt, **sauf** `node_modules`, `dist` et `online-config.json` (déjà exclus par `.gitignore`).
   Le dossier caché **`.github`** doit être envoyé aussi : c'est lui qui fabrique l'installateur.
   Le plus simple est **GitHub Desktop** (Add local repository → ce dossier → Publish repository). Le glisser-déposer du site web oublie souvent les dossiers cachés.
4. Donne à GitHub la configuration en ligne (une seule fois) :
   - sur le dépôt : **Settings → Secrets and variables → Actions → New repository secret** ;
   - Nom : `ONLINE_CONFIG` ;
   - Valeur : tout le contenu du fichier `%APPDATA%\Linkgeek\online-config.json` (ouvre-le avec le Bloc-notes, copie tout).
5. Lance la fabrication :
   - **Actions → Release → Run workflow**, ou crée un tag `v1.8.1` dans GitHub Desktop puis « Push ».
   - Au bout de 5 à 10 minutes, la release **Linkgeek 1.8.1** apparaît dans **Releases**, avec automatiquement les **3 fichiers** :
     - `Linkgeek-Setup-1.8.1.exe`
     - `Linkgeek-Setup-1.8.1.exe.blockmap`
     - `latest.yml` ← **indispensable** pour les mises à jour automatiques
6. Ajoute à la main dans la même release (bouton **Edit**) le plan B, depuis ton dossier `dist` :
   - `Linkgeek-Setup-1.8.1.zip`
   - `LISEZ-MOI-TESTEURS.txt`

Le lien de téléchargement à partager est :
`https://github.com/unknownxsr/linkgeek/releases/latest`

## Les versions suivantes

1. Dans `package.json`, augmente le numéro `"version"` (par exemple `1.8.1` → `1.8.1`).
2. Envoie les changements sur GitHub, puis crée le tag `v1.8.1` (ou **Actions → Release → Run workflow**).
3. GitHub fabrique et publie l'installateur tout seul. Ajoute si besoin le `.zip` fait avec `npm run setup`.

Les joueurs reçoivent la mise à jour dans les 6 heures, ou au prochain lancement.

## Ton PC à toi

Ne lance pas le `.exe` sur ton PC (Smart App Control le bloque). Garde ta méthode habituelle :
`npm run setup`, puis `dist\Linkgeek-Setup\install.ps1 -Silent`.

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
   - **Actions → Release → Run workflow**, ou crée un tag `v1.8.3` dans GitHub Desktop puis « Push ».
   - Au bout de 5 à 10 minutes, la release **Linkgeek 1.8.3** apparaît dans **Releases**, avec automatiquement les **5 fichiers** :
     - `Linkgeek-Setup-1.8.3.exe` (installateur)
     - `Linkgeek-Setup-1.8.3.exe.blockmap` et `latest.yml` (mises à jour des anciennes versions installées avec le `.exe`)
     - `Linkgeek-Setup-1.8.3.zip` ← **indispensable** : c'est lui que le launcher télécharge pour se mettre à jour
     - `LISEZ-MOI-TESTEURS.txt`
6. Plus rien à ajouter à la main.

Le lien de téléchargement à partager est :
`https://github.com/unknownxsr/linkgeek/releases/latest`

## Les versions suivantes

1. Dans `package.json`, augmente le numéro `"version"` (par exemple `1.8.3` → `1.8.4`). **Obligatoire** : le launcher ne propose une mise à jour que si le numéro est plus grand que le sien.
2. Envoie les changements sur GitHub, puis crée le tag `v1.8.4` (ou **Actions → Release → Run workflow**).
3. GitHub fabrique et publie l'installateur et le `.zip` tout seuls.
4. Facultatif : écris les nouveautés dans la description de la release (bouton **Edit**). Le launcher les affiche aux joueurs avant la mise à jour.

## Comment les joueurs reçoivent la mise à jour

- Linkgeek vérifie 10 secondes après le lancement, puis toutes les 6 heures, et télécharge la nouvelle version en arrière-plan.
- Quand elle est prête : une notification « Mise à jour prête » avec **Redémarrer**, et un bouton **Mettre à jour** à côté de la cloche.
- Dans **Paramètres → À propos** : version actuelle, bouton **Rechercher une mise à jour**, progression du téléchargement et nouveautés.
- S'ils ne redémarrent pas, la mise à jour s'installe quand ils ferment Linkgeek.
- Aucune installation `.exe` n'est lancée (les fichiers sont copiés par un petit script PowerShell), donc Smart App Control ne bloque pas.

## Ton PC à toi

Ne lance pas le `.exe` sur ton PC (Smart App Control le bloque). Une fois une release publiée sur GitHub, ton Linkgeek se met à jour depuis le launcher comme celui des joueurs.
Pour tester une version pas encore publiée, garde ta méthode habituelle : `npm run setup`, puis `dist\Linkgeek-Setup\install.ps1 -Silent`.

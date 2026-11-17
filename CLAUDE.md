# Linkgeek: notes for Claude Code

**The reference project folder is `C:\Users\sacha\Documents\Linkgeek-projet`.** Make every change there.
`E:\Claude Code\Developpement\NexusLauncher` is the old working copy. It is kept in sync but is no longer the reference.

## What it is
Linkgeek is an Electron 39 game launcher for Windows. The interface is in French, with an English mode. It brings together:
- **Libraries:** Steam, Epic, Xbox/Game Pass, Microsoft Store (older UWP games, identified through the Store catalog), Battle.net, Ubisoft Connect, EA app, GOG and games added by hand.
- **Tracking and progress:** playtime, statistics, achievements (Bronze → Platinum), challenges with XP, levels and badges.
- **Online and social:** friends via Firebase, an admin mode, Discord Rich Presence and automatic updates from GitHub Releases.

## Commands
Node is not always on PATH in the tool shell. In PowerShell, start with:
`$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')`

- `npm start`: development mode.
- Icons: `assets/icon.png` (512) and `assets/icon.ico` (16 to 256) are generated from `assets/logo-source.png` by `build/make-icons.ps1`. The logo itself (pink 3D L with speed lines, `assets/logo-source.svg`) is drawn into `logo-source.png` by `build/draw-logo.ps1`, which then runs make-icons.
- **Never modify `Linkgeek.exe` after the build** (no rcedit, keep `"signAndEditExecutable": false`): it must stay byte-identical to Electron's `electron.exe`, otherwise Smart App Control blocks it. So the exe keeps Electron's icon; the logo comes from the window `icon` + `app.setAppUserModelId`, and from the shortcuts: `install.ps1` (`icon.ico`) and, for the NSIS installer, `build/installer.nsh` (`nsis.include`, recreates the shortcuts with `resources\app\assets\icon.ico`). Building the NSIS installer locally fails on this PC (electron-builder runs a freshly built unsigned exe, blocked by Smart App Control); it works on GitHub Actions.
- `npm run setup`: builds `dist\Linkgeek-Setup` and `.zip`. This is a folder build plus `install.ps1`, the format used to install on the developer's PC (see below). It bundles `%APPDATA%\Linkgeek\online-config.json`.
- `dist\Linkgeek-Setup\install.ps1 -Silent`: installs into `%LOCALAPPDATA%\Programs\Linkgeek`. Close Linkgeek first.
- `npm run dist`: builds the NSIS `.exe` for GitHub Releases. See PUBLIER.md.

**Smart App Control:** it is active on the developer's PC and blocks unsigned `.exe` files. Install there with `npm run setup` and `install.ps1`, never with the NSIS installer.

## Architecture
- `main.js`: main process. It holds the IPC handlers, the admin logic, the public card (`getCard`), Discord, friend notifications and the updater.
- `preload.js` exposes `window.nexus`, which the renderer calls `api`.
- `renderer/`:
  - `app.js` is vanilla JS. Views are template strings, and clicks go through delegation on `data-*` attributes.
  - The CSP forbids inline handlers.
  - `i18n.js` is the English layer: a French→English dictionary plus regex patterns, applied to the DOM.
- `src/`:
  - Shop: `shop.js` holds the catalog of paid themes and the tokens (1 token per 5 XP of challenge, 20 + 5 × level per new level). Each theme's CSS lives in `styles.css` under `:root[data-theme="…"]`. Rank frames are resolved in `main.js` (`frameFor`).
  - Titles: `titles.js` holds the profile titles and their conditions, computed by `titleContext()` in `main.js`. Each title's progress relies on the genres from `genres.js`, which uses SteamSpy tags; the player can override a genre by hand.
  - Recommendations: `recommend.js` builds the player profile (families of SteamSpy tags weighted by playtime), then picks popular games from SteamSpy tag lists that the player doesn't own (`library.ownedSteam`), with Steam store prices (12 h cache).
  - News: `news.js` fetches Steam announcements through the public ISteamNews API (3 h cache, Nouveau badge, Nouveautés panel and home section). Non-Steam games only get a link.
  - Libraries and assets: `scanners/` (one file per platform; `xbox.js` covers Xbox/Game Pass and Microsoft Store games; `others.js` covers Battle.net, Ubisoft, EA and GOG through the registry), `library.js`, `covers.js` (artwork found by name through the Steam store search) and `tracker.js` (processes, every 20 s).
  - Progress: `achievements.js`, `challenges.js` (XP, levels, ranks).
  - Online and integrations: `online.js` (Firebase REST, SSE streams, account deletion, protected level), `discord.js` (named-pipe IPC, no dependency), `updater.js`.
  - Storage: `store.js`, which writes `%APPDATA%\Linkgeek\library.json`.
- `firebase/database.rules.json`:
  - Contains the placeholder `__ADMIN_EMAIL__`. "Copier les règles" replaces it with the admin's email, so the email is never shipped.
  - **Every new field written online must be added to the rules**; otherwise `$other: false` rejects it.

## Conventions
- **New text:** every new interface string in `app.js` must also be added to `renderer/i18n.js`, as an exact entry or as a pattern.
- **Admin identity:** the admin is identified locally by `settings.adminHash` (SHA-256 of the email). The server checks the email in the rules. Never write the email in plain text in the code.
- **Level anti-cheat:** the server only allows one level at a time, at most every 10 min below level 10, then every hour. The exception is the 10 min after an admin gift (`boostAt`). The limit is mirrored in `online.publishLevel`.
- **Privacy:** any new data sent online must be described in `CONFIDENTIALITE.md`. Then regenerate `site/confidentialite.html` from it.

## Testing
Tests are Electron harnesses with a fake Firebase server (REST + SSE). They set the env vars `LINKGEEK_IDP_BASE` / `LINKGEEK_TOKEN_BASE`, a temporary userData, then `require(main.js)`. To check the English mode, call `applyLanguage('en')` and then list the text nodes that are still in French.

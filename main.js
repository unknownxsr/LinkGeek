const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, Tray, Menu, nativeImage, safeStorage, powerMonitor, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const crypto = require('crypto');
const { Store } = require('./src/store');
const { Library } = require('./src/library');
const { Tracker } = require('./src/tracker');
const { GoogleAuth } = require('./src/google');
const { Online } = require('./src/online');
const { Achievements, PAGES } = require('./src/achievements');
const { Challenges, RANKS, sanitizeRanks } = require('./src/challenges');
const { Covers } = require('./src/covers');
const { DiscordPresence } = require('./src/discord');
const { setupUpdater } = require('./src/updater');
const { Shop, SHOP_THEMES } = require('./src/shop');
const { Genres, GENRES } = require('./src/genres');
const { Titles } = require('./src/titles');
const { News } = require('./src/news');
const { Recommender } = require('./src/recommend');

const FREE_THEMES = ['classic', 'dark', 'light'];
const THEMES = {
  classic: { bg: '#0a0c11', symbol: '#c9cfdc' },
  dark: { bg: '#050505', symbol: '#d0d0d0' },
  light: { bg: '#eef0f5', symbol: '#2b3140' },
  // themes sold in the Boutique
  ...Object.fromEntries(SHOP_THEMES.map((t) => [t.id, { bg: t.c.bg, symbol: t.symbol }])),
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'nexus-img', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.setName('Linkgeek');
app.setAppUserModelId('com.zenshyy.linkgeek');
if (!app.requestSingleInstanceLock()) app.quit();

let win;
let tray;
let store;
let library;
let tracker;
let online;
let achievements;
let challenges;
let covers;
let updater;
let shop;
let genres;
let titles;
let news;
let reco;
const discord = new DiscordPresence();
let lastFriendGames = null; // uid -> game id, to notify when a friend starts a game
let quitting = false;
let offlineSent = false;

const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp|ico)$/i;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  if (channel === 'library:changed' && achievements) achievements.schedule();
  if (channel === 'library:changed' && challenges) challenges.schedule();
  if (channel === 'library:changed' && titles) titles.schedule();
}

/** Numbers the profile titles are based on. */
function titleContext() {
  const played = library.games().filter((g) => g.playtimeSec > 0);
  const count = (k) => played.filter((g) => genres.get(g.id).includes(k)).length;
  let a = null;
  try { a = achievements.list(); } catch { /* not ready */ }
  return {
    fps: count('fps'), survival: count('survival'), adventure: count('adventure'),
    achPct: a && a.total ? Math.floor((a.unlocked / a.total) * 100) : 0,
    level: challenges.levelInfo().level,
  };
}

function announceTitles(list) {
  send('titles:unlocked', list);
  if (online) online.updateIdentity();
  if (win && !win.isDestroyed() && win.isVisible()) return;
  try {
    const { Notification } = require('electron');
    if (!Notification.isSupported()) return;
    const n = new Notification({ title: `Nouveau titre débloqué : ${list[0].name}`, body: list[0].desc, icon: path.join(__dirname, 'assets', 'icon.png') });
    n.on('click', () => { if (win) { win.show(); win.focus(); send('shop:open'); } });
    n.show();
  } catch { /* ignore */ }
}

function announceChallenges(r) {
  r.tokens = shop ? shop.reward(r) : 0; // Boutique tokens for challenges and new levels
  if (titles) titles.schedule(); // "Maître du jeu" (level 100)
  send('challenges:completed', r);
  if (r.levelUp && r.levelUp.rankUp && online) online.updateIdentity(); // new rank = new avatar frame
  if (r.levelUp && online) online.updateIdentity(); // friends see the new level
  if (win && !win.isDestroyed() && win.isVisible()) return;
  try {
    const { Notification } = require('electron');
    if (!Notification.isSupported()) return;
    const xp = r.completed.reduce((a, c) => a + c.xp, 0);
    const sx = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n)} XP`;
    const admin = r.completed.some((c) => c.kind === 'admin');
    const n = new Notification({
      title: r.levelUp ? `Niveau ${r.levelUp.to} atteint !${r.levelUp.rankUp ? ` Badge ${r.levelUp.rankName} débloqué` : ''}` : admin ? `XP de l'administrateur : ${sx(xp)}` : `Défi terminé : ${sx(xp)}`,
      body: r.completed.map((c) => `${c.title} (${sx(c.xp)})`).join('\n'),
      icon: path.join(__dirname, 'assets', 'icon.png'),
    });
    n.on('click', () => { if (win) { win.show(); win.focus(); send('challenges:open'); } });
    n.show();
  } catch { /* ignore */ }
}

/** Admin gifts: "title_<key>" gives a profile title, anything else is a trophy. */
function grantAchOrTitle(key, tier) {
  if (String(key).startsWith('title_')) { titles.grant(String(key).slice(6), Number(tier) > 0); return { title: true }; }
  return achievements.grant(String(key), tier);
}

function announceAchievements(list) {
  if (titles) titles.schedule(); // "Perfectionniste"
  send('achievements:unlocked', list);
  if (challenges) challenges.schedule();
  // Window hidden in the tray: use a Windows notification instead of the in-app toast
  if (win && !win.isDestroyed() && win.isVisible()) return;
  try {
    const { Notification } = require('electron');
    if (!Notification.isSupported()) return;
    const first = list[list.length - 1];
    const n = new Notification({
      title: list.length > 1 ? `${list.length} succès débloqués !` : `Succès ${first.tierName} débloqué !`,
      body: `${first.name} — ${first.desc}`,
      icon: path.join(__dirname, 'assets', 'icon.png'),
    });
    n.on('click', () => { if (win) { win.show(); win.focus(); send('achievements:open'); } });
    n.show();
  } catch { /* ignore */ }
}

function createWindow() {
  const theme = THEMES[store.data.settings.theme] || THEMES.classic;
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: theme.bg,
    title: 'Linkgeek',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: theme.symbol, height: 40 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // --hidden: started with Windows, stay in the tray and just track playtime
  if (!process.argv.includes('--hidden')) win.once('ready-to-show', () => win.show());
  win.on('close', (e) => {
    // Keep running in the tray so playtime keeps being tracked (unless disabled in settings)
    if (quitting) return;
    if (store.data.settings.closeToTray === false) { quitting = true; app.quit(); return; }
    e.preventDefault();
    win.hide();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Linkgeek');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir Linkgeek', click: () => { win.show(); win.focus(); } },
    { type: 'separator' },
    { label: 'Quitter', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => { win.show(); win.focus(); });
}

async function diskInfo(games) {
  const roots = new Set(games.map((g) => g.installDir && path.parse(g.installDir).root.toUpperCase()).filter(Boolean));
  const out = [];
  for (const root of roots) {
    try {
      const s = await fs.promises.statfs(root);
      const total = s.blocks * s.bsize;
      const free = s.bavail * s.bsize;
      const gamesBytes = games.filter((g) => g.installDir && g.installDir.toUpperCase().startsWith(root)).reduce((a, g) => a + (g.sizeBytes || 0), 0);
      out.push({ root, total, free, gamesBytes });
    } catch { /* ignore */ }
  }
  return out.sort((a, b) => a.root.localeCompare(b.root));
}

function launchGame(game) {
  const l = game.launch;
  if (!l) throw new Error('Pas de méthode de lancement');
  if (l.type === 'url') {
    if (!/^(steam|com\.epicgames\.launcher|uplay):\/\//.test(l.url)) throw new Error('URL non autorisée');
    return shell.openExternal(l.url);
  }
  if (l.type === 'shell') {
    spawn('explorer.exe', [l.target], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (l.type === 'exe') {
    if (!fs.existsSync(l.path)) throw new Error('Exécutable introuvable : ' + l.path);
    spawn(l.path, l.args || [], { cwd: path.dirname(l.path), detached: true, stdio: 'ignore' }).unref();
  }
}

/** Steam profile overridden by what the user customised in Linkgeek. */
function getProfile() {
  const p = store.data.profile || {};
  const base = library.profile || {};
  const top5 = Array.from({ length: 5 }, (_, i) => (p.top5 && p.top5[i]) || null);
  const avatar = p.avatar && fs.existsSync(p.avatar)
    ? 'nexus-img://local/?p=' + encodeURIComponent(p.avatar) + '&v=' + (p.avatarV || 0)
    : base.avatar || null;
  const acc = store.data.account;
  let a = null;
  try { a = achievements ? achievements.list() : null; } catch { /* not ready */ }
  const m = store.data.membership || {};
  const seen = Object.values(store.data.firstSeen || {});
  return {
    name: p.name || base.name || 'Joueur', avatar, customAvatar: !!p.avatar, steamName: base.name || null, top5,
    account: acc ? { email: acc.email, name: acc.name } : null,
    level: challenges ? challenges.levelInfo() : null,
    ranks: challenges ? challenges.ranks() : RANKS,
    admin: isAdmin(),
    records: library ? getRecords() : null,
    ach: a ? { unlocked: a.unlocked, total: a.total } : null,
    ultimate: a ? a.ultimate : null, // "Linkgeek Ultime" trophy: special badge
    friendCount: online && online.session ? (online.snapshot.friends || []).length : null,
    socials: p.socials || {},
    // online only: date the account was created + member number (founder = first 100)
    member: m.member || null,
    joinedAt: m.joinedAt || null,
    localSince: seen.length ? Math.min(...seen) : null,
    frame: frameFor(p.frame),
    title: titles ? titles.equipped() : null,
    frameChoice: p.frame || 'auto',
  };
}

/* ---------------- Avatar frames ----------------
 * Every rank reached unlocks the matching frame around the profile picture.
 * "auto" (default) = the frame of the current rank; "none" = no frame.
 */
function unlockedFrames() {
  if (!challenges) return [];
  const lv = challenges.levelInfo().level;
  return challenges.ranks().filter((r) => lv >= r.min).map((r) => r.key);
}
function frameFor(choice) {
  const un = unlockedFrames();
  if (choice === 'none') return null;
  if (choice && un.includes(choice)) return choice;
  return un[un.length - 1] || null;
}

/* ---------------- Records ---------------- */
const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/** Longest session, longest run of consecutive days played, game of the month (from tracked sessions). */
function getRecords() {
  const sessions = [...store.data.sessions];
  const now = Date.now();
  if (tracker) for (const [gameId, r] of tracker.running) sessions.push({ gameId, start: r.start, end: now });
  let longest = null;
  const days = new Set();
  for (const s of sessions) {
    const len = s.end - s.start;
    if (!longest || len > longest.ms) longest = { ms: len, gameId: s.gameId, at: s.start };
    for (let t = new Date(s.start).setHours(0, 0, 0, 0); t <= s.end; t += 86400000) days.add(dayKey(t));
  }
  // runs of consecutive days
  let best = 0; let run = 0; let prev = null;
  const sorted = [...days].map((k) => { const [y, mo, d] = k.split('-').map(Number); return new Date(y, mo, d).getTime(); }).sort((x, y) => x - y);
  for (const t of sorted) {
    run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  const today = new Date().setHours(0, 0, 0, 0);
  let current = 0;
  for (let t = days.has(dayKey(today)) ? today : today - 86400000; days.has(dayKey(t)); t = new Date(t - 43200000).setHours(0, 0, 0, 0)) current++;
  // game of the month
  const m0 = new Date(); m0.setHours(0, 0, 0, 0); m0.setDate(1);
  const per = {};
  for (const s of sessions) if (s.end > m0.getTime()) per[s.gameId] = (per[s.gameId] || 0) + s.end - Math.max(s.start, m0.getTime());
  const [gid, ms] = Object.entries(per).sort((x, y) => y[1] - x[1])[0] || [];
  return {
    longest: longest && longest.ms >= 60000 ? longest : null,
    streak: { current, best },
    month: { gameId: gid || null, ms: ms || 0, month: m0.getMonth(), year: m0.getFullYear() },
  };
}

/* ---------------- Social links ---------------- */
const SOCIAL_RE = {
  discord: /^([a-z0-9_.]{2,32}|\d{17,20})$/,
  twitch: /^[A-Za-z0-9_]{3,25}$/,
  tiktok: /^[A-Za-z0-9_.]{2,24}$/,
};
function cleanSocial(k, v) {
  let s = String(v || '').trim();
  if (!s) return undefined;
  if (k === 'twitch') s = s.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '');
  if (k === 'tiktok') s = s.replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '');
  if (k === 'discord') s = s.replace(/^https?:\/\/(www\.)?discord(app)?\.com\/users\//i, '').toLowerCase();
  s = s.replace(/^@/, '').replace(/[/?#].*$/, '');
  if (!SOCIAL_RE[k].test(s)) {
    const names = { discord: 'Discord', twitch: 'Twitch', tiktok: 'TikTok' };
    throw new Error(`Nom ${names[k]} invalide : « ${String(v).slice(0, 40)} »`);
  }
  return s;
}

/* ---------------- Settings ---------------- */
const startupLink = () => path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Linkgeek.lnk');

function setStartup(enabled) {
  const lnk = startupLink();
  if (!enabled) { try { fs.unlinkSync(lnk); } catch { /* not there */ } return; }
  // In dev the exe is electron.exe and needs the app folder as first argument
  const args = (app.isPackaged ? '' : `"${app.getAppPath()}" `) + '--hidden';
  shell.writeShortcutLink(lnk, 'create', {
    target: process.execPath, args, cwd: path.dirname(process.execPath),
    icon: path.join(__dirname, 'assets', 'icon.ico'), iconIndex: 0, description: 'Linkgeek',
  });
}

function encrypt(s) {
  if (!s) return undefined;
  return safeStorage.isEncryptionAvailable() ? 'enc:' + safeStorage.encryptString(s).toString('base64') : s;
}
function decrypt(s) {
  if (!s) return undefined;
  if (!s.startsWith('enc:')) return s;
  try { return safeStorage.decryptString(Buffer.from(s.slice(4), 'base64')); } catch { return undefined; }
}

/**
 * online-config.json bundles the Google OAuth client + Firebase project so that
 * every Linkgeek install shared from this PC talks to the same server.
 * Looked up in userData first, then next to the app (bundled by make-setup).
 */
function readOnlineFile() {
  for (const p of [path.join(app.getPath('userData'), 'online-config.json'), path.join(__dirname, 'online-config.json')]) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* none */ }
  }
  return {};
}

/** OAuth client: from settings, else from online-config.json / google-oauth.json. */
function googleConfig() {
  const g = store.data.settings.google || {};
  if (g.clientId) return { clientId: g.clientId, clientSecret: decrypt(g.clientSecret), source: 'settings' };
  const shared = readOnlineFile().google;
  if (shared && shared.client_id) return { clientId: shared.client_id, clientSecret: shared.client_secret, source: 'file' };
  for (const p of [path.join(app.getPath('userData'), 'google-oauth.json'), path.join(__dirname, 'google-oauth.json')]) {
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const c = j.installed || j.web || j;
      if (c.client_id || c.clientId) return { clientId: c.client_id || c.clientId, clientSecret: c.client_secret || c.clientSecret, source: 'file' };
    } catch { /* none */ }
  }
  return null;
}

function firebaseConfig() {
  const f = store.data.settings.firebase;
  if (f && f.apiKey && f.databaseURL) return { ...f, source: 'settings' };
  const shared = readOnlineFile().firebase;
  if (shared && shared.apiKey && shared.databaseURL) return { ...shared, source: 'file' };
  return null;
}

/** Keeps userData/online-config.json in sync so make-setup can bundle it for friends. */
function writePortableConfig() {
  const g = googleConfig();
  const f = firebaseConfig();
  const out = {};
  if (g) out.google = { client_id: g.clientId, client_secret: g.clientSecret || undefined };
  if (f) out.firebase = { apiKey: f.apiKey, databaseURL: f.databaseURL, projectId: f.projectId || undefined };
  if (adminHash()) out.adminHash = adminHash();
  const d = discordConfig();
  if (d.clientId) out.discord = { clientId: d.clientId };
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'online-config.json'), JSON.stringify(out, null, 2)); } catch { /* ignore */ }
}

/* ---------- Admin ----------
 * The admin is one Google account. Locally it is recognised by a SHA-256 of its
 * e-mail (the address itself is never shipped with the app). On the server, the
 * Firebase rules check the Google-verified e-mail, so nobody else can grant XP,
 * edit the ranks or show the admin tag, even with a modified copy of the app.
 */
const hashEmail = (e) => crypto.createHash('sha256').update(String(e || '').trim().toLowerCase()).digest('hex');
function adminHash() { return store.data.settings.adminHash || readOnlineFile().adminHash || null; }
function isAdmin() {
  const acc = store.data.account;
  const h = adminHash();
  return !!(h && acc && acc.email && hashEmail(acc.email) === h);
}
function requireAdmin() { if (!isAdmin()) throw new Error('Réservé à l\'administrateur de Linkgeek'); }

/** Accepts the firebaseConfig snippet copied from the Firebase console, or JSON. */
function parseFirebaseConfig(text) {
  const t = String(text || '');
  const pick = (k) => { const m = t.match(new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']+)["']`)); return m ? m[1].trim() : null; };
  const cfg = { apiKey: pick('apiKey'), databaseURL: pick('databaseURL'), projectId: pick('projectId') };
  if (!cfg.apiKey) throw new Error('« apiKey » introuvable dans la configuration collée');
  if (!cfg.databaseURL) throw new Error('« databaseURL » introuvable : crée d\'abord la Realtime Database dans Firebase, puis recopie la configuration');
  if (!/^https?:\/\//.test(cfg.databaseURL)) throw new Error('databaseURL invalide');
  return cfg;
}

/** What friends see: current game (with a cover they can load) and online/away. */
function currentActivity() {
  const running = new Set(tracker ? tracker.runningIds() : []);
  const g = library ? library.games().find((x) => running.has(x.id)) : null;
  let game = null;
  if (g) {
    const remote = [g.cover, g.header, g.hero].find((u) => typeof u === 'string' && u.startsWith('https://')) || null;
    const steamId = g.source === 'steam' ? g.id.split(':')[1] : null;
    game = {
      id: g.id, name: g.name, source: g.source,
      cover: steamId ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamId}/header.jpg` : remote,
    };
  }
  const idle = powerMonitor.getSystemIdleTime();
  return { state: !game && idle >= 600 ? 'away' : 'online', game };
}

const httpsArt = (g) => {
  if (!g) return null;
  if (g.source === 'steam') return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.id.split(':')[1]}/library_600x900.jpg`;
  return [g.cover, g.header, g.hero].find((u) => typeof u === 'string' && u.startsWith('https://') && u.length <= 500) || null;
};

/** Public profile card friends see when they open my profile. */
function getCard() {
  const games = library.games();
  const byId = new Map(games.map((g) => [g.id, g]));
  const p = store.data.profile || {};
  const top5 = (p.top5 || []).map((id) => byId.get(id)).filter(Boolean).slice(0, 5)
    .map((g) => ({ name: g.name.slice(0, 120), source: g.source, ...(httpsArt(g) ? { cover: httpsArt(g) } : {}) }));
  const top = games.filter((g) => !g.hidden).sort((a, b) => b.playtimeSec - a.playtimeSec)[0];
  const a = achievements.list();
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const w0 = d.getTime();
  let week = 0;
  for (const s of store.data.sessions) if (s.end > w0) week += s.end - Math.max(s.start, w0);
  for (const r of tracker.running.values()) week += Date.now() - Math.max(r.start, w0);
  const card = {
    top5,
    ach: { unlocked: a.unlocked, total: a.total, points: a.points, ...(a.ultimate ? { ultimate: true } : {}) },
    games: games.filter((g) => !g.hidden).length,
    totalHours: Math.round(games.reduce((s, g) => s + (g.playtimeSec || 0), 0) / 360) / 10,
    weekHours: Math.min(168, Math.round(week / 360000) / 10),
    week: new Date(w0 - new Date(w0).getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  };
  const soc = (store.data.profile && store.data.profile.socials) || {};
  if (Object.keys(soc).length) card.socials = { ...soc };
  const rec = getRecords();
  const monthGame = rec.month.gameId && games.find((g) => g.id === rec.month.gameId);
  card.records = {
    longestMin: rec.longest ? Math.round(rec.longest.ms / 60000) : 0,
    bestStreak: rec.streak.best,
    ...(monthGame ? { monthGame: monthGame.name.slice(0, 120) } : {}),
  };
  if (top && top.playtimeSec > 0) card.top = { name: top.name.slice(0, 120), hours: Math.round(top.playtimeSec / 360) / 10, ...(httpsArt(top) ? { cover: httpsArt(top) } : {}) };
  return card;
}

function discordConfig() {
  const s = store.data.settings.discord || {};
  const shared = readOnlineFile().discord || {};
  return { enabled: s.enabled !== false, clientId: s.clientId || shared.clientId || null };
}

function updateDiscord() {
  discord.configure(discordConfig());
  const running = tracker ? [...tracker.running.entries()] : [];
  const g = running.length ? library.games().find((x) => x.id === running[0][0]) : null;
  discord.set(g ? { name: g.name, cover: httpsArt(g), start: running[0][1].start } : null);
}

/** "Mirko vient de lancer Rocket League": in the app, or as a Windows notification. */
function notifyFriendGames(snap) {
  const now = new Map(snap.friends.map((f) => [f.uid, f.game ? f.game.id : null]));
  const prev = lastFriendGames;
  lastFriendGames = now;
  if (!prev || store.data.settings.notifyFriends === false) return;
  for (const f of snap.friends) {
    if (!f.game || !prev.has(f.uid) || prev.get(f.uid) === f.game.id) continue;
    send('friends:activity', { uid: f.uid, name: f.name, photo: f.photo, game: f.game });
    if (win && !win.isDestroyed() && win.isVisible() && win.isFocused()) continue;
    try {
      const { Notification } = require('electron');
      if (!Notification.isSupported()) continue;
      const n = new Notification({ title: `${f.name} joue maintenant`, body: `${f.name} vient de lancer ${f.game.name}`, icon: path.join(__dirname, 'assets', 'icon.png'), silent: true });
      n.on('click', () => { if (win) { win.show(); win.focus(); send('friends:open'); } });
      n.show();
    } catch { /* ignore */ }
  }
}

function getSettings() {
  const s = store.data.settings;
  const g = googleConfig();
  let dataSize = 0;
  try { dataSize = fs.statSync(store.file).size; } catch { /* ignore */ }
  return {
    theme: s.theme || 'classic',
    ownedThemes: shop ? [...shop.data.owned] : [],
    closeToTray: s.closeToTray !== false,
    startup: fs.existsSync(startupLink()),
    google: g ? { configured: true, clientId: g.clientId, source: g.source } : { configured: false },
    firebase: (() => { const f = firebaseConfig(); return f ? { configured: true, projectId: f.projectId || null, databaseURL: f.databaseURL, source: f.source } : { configured: false }; })(),
    online: online ? { signedIn: !!online.session } : { signedIn: false },
    account: store.data.account,
    admin: { isAdmin: isAdmin(), online: !!(online && online.session) },
    notifyFriends: s.notifyFriends !== false,
    discord: { ...discordConfig(), connected: discord.ready },
    language: s.language === 'en' ? 'en' : 'fr',
    onboarded: !!s.onboarded,
    update: updater ? { ready: updater.ready || null } : null,
    hiddenCount: store.data.hidden.length,
    version: app.getVersion(),
    dataPath: app.getPath('userData'),
    dataSize,
  };
}

function applyTheme(theme) {
  const t = THEMES[theme] || THEMES.classic;
  if (win && !win.isDestroyed()) {
    win.setBackgroundColor(t.bg);
    try { win.setTitleBarOverlay({ color: '#00000000', symbolColor: t.symbol, height: 40 }); } catch { /* ignore */ }
  }
}

function registerIpc() {
  const findGame = (id) => library.games().find((g) => g.id === id);
  const snapshot = () => ({ games: library.games(), profile: getProfile(), running: tracker.runningIds(), collections: store.data.collections || {} });
  ipcMain.handle('profile:card', () => getCard());
  const setProfile = (patch) => {
    store.data.profile = { ...(store.data.profile || {}), ...patch };
    store.save();
    if (online) online.updateIdentity();
    if (challenges) challenges.schedule();
    if (achievements) achievements.schedule(); // pseudo with a 7, all socials linked…
    return getProfile();
  };

  ipcMain.handle('nav:visit', (_e, page) => {
    if (!PAGES.includes(page)) return false;
    const v = store.data.visitedPages || (store.data.visitedPages = []);
    if (!v.includes(page)) { v.push(page); store.save(); achievements.schedule(); }
    return true;
  });

  ipcMain.handle('library:get', () => snapshot());

  ipcMain.handle('library:rescan', async () => {
    await library.scan();
    library.computeSizes(() => send('library:changed'));
    covers.fill(library.games(), () => send('library:changed'));
    return snapshot();
  });

  ipcMain.handle('profile:setName', (_e, name) => setProfile({ name: String(name || '').trim().slice(0, 32) || undefined }));

  ipcMain.handle('profile:setSocials', (_e, s) => {
    const socials = {};
    for (const k of Object.keys(SOCIAL_RE)) { const v = cleanSocial(k, s && s[k]); if (v) socials[k] = v; }
    const r = setProfile({ socials });
    if (online) online.publishCard().catch(() => {});
    return r;
  });

  ipcMain.handle('profile:setFrame', (_e, key) => {
    const k = String(key || 'auto');
    if (k !== 'auto' && k !== 'none' && !unlockedFrames().includes(k)) throw new Error('Ce contour n\'est pas encore débloqué');
    return setProfile({ frame: k === 'auto' ? undefined : k });
  });

  /* ---- Boutique ---- */
  ipcMain.handle('shop:get', () => ({ ...shop.list(), titles: titles.list() }));
  ipcMain.handle('titles:equip', (_e, key) => {
    titles.equip(key ? String(key) : null);
    if (online) online.updateIdentity();
    return { shop: { ...shop.list(), titles: titles.list() }, profile: getProfile() };
  });
  /* ---- Game news (Steam announcements) ---- */
  const steamGamesByPlaytime = () => library.games().filter((g) => g.source === 'steam' && !g.hidden).sort((a, b) => b.playtimeSec - a.playtimeSec);
  ipcMain.handle('news:get', async (_e, id) => {
    const g = findGame(String(id));
    if (!g) return { steam: false, items: [] };
    if (g.source === 'steam' && !news.cache[news.appid(g)]) await news.fill([g]);
    return { steam: g.source === 'steam', items: news.get(g) };
  });
  ipcMain.handle('news:seen', (_e, id) => {
    const g = findGame(String(id));
    const items = g ? news.get(g) : [];
    if (items.length) { news.markSeen(g.id, items[0].date); send('library:changed'); }
    return true;
  });
  /** Home: latest announcement of my most played Steam games (last 30 days). */
  ipcMain.handle('news:recent', () => {
    const since = Date.now() - 30 * 86400000;
    return steamGamesByPlaytime().slice(0, 25)
      .map((g) => ({ gameId: g.id, item: news.get(g)[0], isNew: news.isNew(g) }))
      .filter((x) => x.item && x.item.date > since)
      .sort((a, b) => (b.isNew - a.isNew) || b.item.date - a.item.date)
      .slice(0, 6);
  });
  /* ---- Player profile & recommendations ---- */
  ipcMain.handle('reco:get', () => ({ profile: reco.profile(), result: reco.cache.result || null, fresh: !!reco.cached() }));
  ipcMain.handle('reco:refresh', async () => ({ profile: reco.profile(), result: await reco.compute(), fresh: true }));

  ipcMain.handle('news:refresh', async () => { await news.fill(steamGamesByPlaytime(), null, true); send('library:changed'); return true; });

  ipcMain.handle('game:setGenres', (_e, id, list) => {
    genres.setOverride(String(id), Array.isArray(list) ? list.map(String) : null);
    send('library:changed');
    return { genres: genres.get(String(id)), detected: genres.detected(String(id)), custom: Array.isArray(genres.overrides[String(id)]) };
  });
  ipcMain.handle('shop:buy', (_e, id, apply) => {
    const t = shop.buy(String(id));
    if (apply) { store.data.settings.theme = t.id; applyTheme(t.id); store.save(); }
    return { shop: { ...shop.list(), titles: titles.list() }, settings: getSettings() };
  });

  ipcMain.handle('profile:setTop5', (_e, ids) => {
    const top5 = Array.from({ length: 5 }, (_, i) => (Array.isArray(ids) && typeof ids[i] === 'string' ? ids[i] : null));
    return setProfile({ top5 });
  });

  ipcMain.handle('profile:pickAvatar', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choisir une photo de profil',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    // Copy into app data so the picture survives if the original is moved/deleted
    const ext = path.extname(r.filePaths[0]).toLowerCase();
    const dest = path.join(app.getPath('userData'), 'avatar' + ext);
    const old = store.data.profile && store.data.profile.avatar;
    if (old && old !== dest && fs.existsSync(old)) { try { fs.unlinkSync(old); } catch { /* ignore */ } }
    fs.copyFileSync(r.filePaths[0], dest);
    return setProfile({ avatar: dest, avatarV: Date.now() });
  });

  /* ---- Settings ---- */
  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:set', (_e, patch) => {
    const s = store.data.settings;
    if (patch && THEMES[patch.theme]) {
      if (!FREE_THEMES.includes(patch.theme) && !shop.owns(patch.theme)) throw new Error('Ce thème s\'achète dans la Boutique');
      s.theme = patch.theme; applyTheme(s.theme);
    }
    if (patch && typeof patch.closeToTray === 'boolean') s.closeToTray = patch.closeToTray;
    if (patch && typeof patch.startup === 'boolean') setStartup(patch.startup);
    if (patch && typeof patch.notifyFriends === 'boolean') s.notifyFriends = patch.notifyFriends;
    if (patch && (patch.language === 'fr' || patch.language === 'en')) s.language = patch.language;
    if (patch && typeof patch.onboarded === 'boolean') s.onboarded = patch.onboarded;
    if (patch && patch.discord && typeof patch.discord === 'object') {
      const cur = s.discord || {};
      const id = patch.discord.clientId !== undefined ? String(patch.discord.clientId || '').trim() : cur.clientId;
      if (id && !/^\d{15,25}$/.test(id)) throw new Error('L\'ID d\'application Discord est un nombre de 17 à 20 chiffres');
      s.discord = { enabled: typeof patch.discord.enabled === 'boolean' ? patch.discord.enabled : cur.enabled !== false, clientId: id || undefined };
      writePortableConfig();
      updateDiscord();
    }
    store.save();
    return getSettings();
  });

  /* ---- Collections ---- */
  const cols = () => store.data.collections || (store.data.collections = {});
  ipcMain.handle('collections:get', () => cols());
  ipcMain.handle('collections:create', (_e, name) => {
    const n = String(name || '').trim().slice(0, 30);
    if (!n) throw new Error('Donne un nom à la collection');
    const id = 'c' + Date.now().toString(36);
    cols()[id] = { name: n, ids: [] };
    store.save(); send('library:changed');
    return id;
  });
  ipcMain.handle('collections:rename', (_e, id, name) => {
    const c = cols()[id]; const n = String(name || '').trim().slice(0, 30);
    if (c && n) { c.name = n; store.save(); send('library:changed'); }
    return cols();
  });
  ipcMain.handle('collections:delete', (_e, id) => { delete cols()[id]; store.save(); send('library:changed'); return cols(); });
  ipcMain.handle('collections:toggle', (_e, id, gameId) => {
    const c = cols()[id];
    if (!c) throw new Error('Collection introuvable');
    const i = c.ids.indexOf(gameId);
    if (i >= 0) c.ids.splice(i, 1); else c.ids.push(String(gameId));
    store.save(); send('library:changed');
    return i < 0;
  });

  /* ---- Online account deletion ---- */
  ipcMain.handle('account:deleteOnline', async () => {
    if (!online || !online.session) throw new Error('Tu n\'es pas connecté au mode en ligne');
    const r = await online.deleteAccount();
    store.data.account = null;
    store.data.sentRequests = [];
    store.data.membership = undefined;
    store.save();
    lastFriendGames = null;
    return { ...r, settings: getSettings() };
  });

  ipcMain.handle('settings:unhideAll', () => { store.data.hidden = []; store.save(); return getSettings(); });
  ipcMain.handle('settings:openData', () => shell.openPath(app.getPath('userData')));

  ipcMain.handle('google:setConfig', (_e, cfg) => {
    const clientId = String((cfg && cfg.clientId) || '').trim();
    const clientSecret = String((cfg && cfg.clientSecret) || '').trim();
    if (clientId && !/\.apps\.googleusercontent\.com$/.test(clientId)) {
      throw new Error('L\'ID client doit se terminer par .apps.googleusercontent.com');
    }
    store.data.settings.google = clientId ? { clientId, clientSecret: encrypt(clientSecret) } : {};
    store.save();
    writePortableConfig();
    return getSettings();
  });

  ipcMain.handle('firebase:copyRules', () => {
    // The admin's e-mail is only written into the rules the admin copies to their own Firebase console
    const acc = store.data.account;
    const email = isAdmin() && /^[^'"\\\s]+@[^'"\\\s]+$/.test(acc.email) ? acc.email.trim().toLowerCase() : 'aucun-admin@invalid';
    const rules = fs.readFileSync(path.join(__dirname, 'firebase', 'database.rules.json'), 'utf8').split('__ADMIN_EMAIL__').join(email);
    clipboard.writeText(rules);
    return true;
  });

  /* ---------- Admin ---------- */
  const afterGrant = () => { if (online) online.updateIdentity(); return { profile: getProfile(), challenges: challenges.list() }; };
  ipcMain.handle('admin:selfGrant', (_e, g) => {
    requireAdmin();
    const xp = Number(g && g.xp); const level = Number(g && g.level);
    const hasXp = Number.isFinite(xp) && xp !== 0;
    const hasLevel = Number.isFinite(level) && level >= 1;
    const coins = Math.trunc(Number(g && g.coins));
    const hasCoins = Number.isFinite(coins) && coins !== 0;
    const hasAch = !!(g && g.ach);
    if (!hasXp && !hasLevel && !hasCoins && !hasAch) throw new Error('Indique de l\'XP, un niveau, des jetons ou un succès');
    if (hasXp || hasLevel) {
      challenges.grant({
        xp: hasXp ? Math.max(-100000, Math.min(100000, xp)) : undefined,
        level: hasLevel ? Math.min(999, level) : undefined,
        title: hasLevel ? `Niveau fixé à ${Math.floor(level)} (admin)` : `${xp > 0 ? 'XP ajoutée' : 'XP retirée'} (admin)`,
      });
    }
    if (hasCoins) shop.add(Math.max(-1000000, Math.min(1000000, coins)), `${coins > 0 ? 'Jetons ajoutés' : 'Jetons retirés'} (admin)`);
    const ach = hasAch ? grantAchOrTitle(String(g.ach), g.tier) : null;
    return { ...afterGrant(), shop: shop.list(), ach };
  });
  ipcMain.handle('admin:achCatalog', () => {
    requireAdmin();
    return [...achievements.catalog(), ...titles.list().map((t) => ({ key: 'title_' + t.key, name: t.name, kind: 'title', tiers: ['Débloquer'] }))];
  });
  ipcMain.handle('admin:rerollDaily', () => { requireAdmin(); challenges.rerollDaily(); return afterGrant(); });
  ipcMain.handle('admin:setRanks', async (_e, list) => {
    requireAdmin();
    const ranks = list ? sanitizeRanks(list) : RANKS;
    store.data.ranksConfig = ranks;
    store.save();
    let remote = false;
    let remoteError = null;
    try { remote = online ? await online.setRemoteRanks(ranks) : false; } catch (e) { remoteError = e.message; }
    send('library:changed');
    return { ...afterGrant(), remote, remoteError };
  });
  ipcMain.handle('admin:grant', async (_e, g) => {
    requireAdmin();
    if (!online || !online.session) throw new Error('Connecte-toi au mode en ligne pour gérer les autres joueurs');
    let uid = g && g.uid;
    if (!uid) uid = await online.resolveCode(g && g.code);
    await online.sendGrant(uid, {
      xp: Number(g.xp), level: g.level ? Number(g.level) : undefined, note: g.note,
      coins: Number(g.coins), ach: g.ach || undefined, tier: g.ach ? Number(g.tier) : undefined,
    });
    return true;
  });

  ipcMain.handle('firebase:setConfig', async (_e, text) => {
    store.data.settings.firebase = text ? parseFirebaseConfig(text) : undefined;
    store.save();
    writePortableConfig();
    online.emit({ status: online.session ? online.snapshot.status : (online.configured ? 'signed-out' : 'unconfigured') });
    return getSettings();
  });

  ipcMain.handle('google:importJson', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Importer le fichier client OAuth téléchargé depuis Google Cloud',
      properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    let c;
    try { const j = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); c = j.installed || j.web || j; } catch { c = null; }
    if (!c || !c.client_id) throw new Error('Fichier non reconnu : il doit contenir « client_id »');
    store.data.settings.google = { clientId: c.client_id, clientSecret: encrypt(c.client_secret) };
    store.save();
    writePortableConfig();
    return getSettings();
  });

  /* ---- Google account ---- */
  const google = new GoogleAuth((url) => shell.openExternal(url));
  const googleAvatarPath = () => path.join(app.getPath('userData'), 'avatar-google.jpg');

  async function applyGoogleProfile(acc, force) {
    const p = store.data.profile || {};
    const patch = {};
    if (acc.name && (force || !p.name)) patch.name = acc.name.slice(0, 32);
    if (acc.picture && (force || !p.avatar)) {
      try {
        if (await GoogleAuth.downloadPicture(acc.picture, googleAvatarPath())) {
          patch.avatar = googleAvatarPath();
          patch.avatarV = Date.now();
        }
      } catch { /* keep current picture */ }
    }
    return setProfile(patch);
  }

  ipcMain.handle('account:signIn', async () => {
    const cfg = googleConfig();
    if (!cfg) throw new Error('Configure d\'abord l\'ID client Google (section Compte)');
    const { account: acc, idToken } = await google.signIn(cfg);
    store.data.account = acc;
    store.save();
    challenges.schedule();
    const profile = await applyGoogleProfile(acc, false);
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
    let onlineError = null;
    if (online.configured) {
      try {
        if (!idToken) throw new Error('Google n\'a pas renvoyé de jeton d\'identité');
        await online.signInWithGoogle(idToken);
      } catch (e) { onlineError = e.message; }
    }
    return { settings: getSettings(), profile, onlineError };
  });

  /* ---- Friends ---- */
  ipcMain.handle('friends:get', () => online.snapshot);
  ipcMain.handle('friends:refresh', async () => { await online.poll(); return online.snapshot; });
  ipcMain.handle('friends:add', async (_e, code) => { const r = await online.addFriend(code); await online.poll(); return r; });
  ipcMain.handle('friends:accept', (_e, uid) => online.accept(String(uid)));
  ipcMain.handle('friends:decline', (_e, uid) => online.decline(String(uid)));
  ipcMain.handle('friends:remove', (_e, uid) => online.remove(String(uid)));
  ipcMain.handle('friends:copyCode', () => { if (online.code) clipboard.writeText(online.code); return !!online.code; });

  ipcMain.handle('account:cancel', () => { google.cancel(); return true; });

  ipcMain.handle('account:useGoogleProfile', async () => {
    if (!store.data.account) throw new Error('Aucun compte Google relié');
    return applyGoogleProfile(store.data.account, true);
  });

  ipcMain.handle('account:signOut', async () => {
    await online.signOut();
    store.data.account = null;
    store.save();
    return getSettings();
  });

  ipcMain.handle('profile:resetAvatar', () => {
    const old = store.data.profile && store.data.profile.avatar;
    if (old && fs.existsSync(old)) { try { fs.unlinkSync(old); } catch { /* ignore */ } }
    return setProfile({ avatar: undefined });
  });

  ipcMain.handle('game:launch', async (_e, id) => {
    const g = findGame(id);
    if (!g) throw new Error('Jeu introuvable');
    await launchGame(g);
    challenges.note('launch', { id: g.id });
    setTimeout(() => tracker.tick(), 8000);
    return true;
  });

  ipcMain.handle('game:toggleFavorite', (_e, id) => { const r = store.toggle('favorites', id); achievements.schedule(); challenges.schedule(); return r; });
  ipcMain.handle('achievements:get', () => achievements.list());
  ipcMain.handle('challenges:get', () => challenges.list());
  ipcMain.handle('game:toggleHidden', (_e, id) => store.toggle('hidden', id));

  ipcMain.handle('game:openFolder', (_e, id) => {
    const g = findGame(id);
    if (g && g.installDir) shell.openPath(g.installDir);
  });

  ipcMain.handle('game:openStore', (_e, id) => {
    const g = findGame(id);
    if (g && g.storeUrl) shell.openExternal(g.storeUrl);
  });

  ipcMain.handle('game:rename', (_e, id, name) => {
    store.data.overrides[id] = { ...(store.data.overrides[id] || {}), name: String(name || '').trim() || undefined };
    store.save();
    return true;
  });

  ipcMain.handle('game:setCover', async (_e, id) => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choisir une jaquette',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (r.canceled || !r.filePaths[0]) return false;
    store.data.overrides[id] = { ...(store.data.overrides[id] || {}), cover: 'nexus-img://local/?p=' + encodeURIComponent(r.filePaths[0]) };
    store.save();
    return true;
  });

  ipcMain.handle('game:addManual', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Ajouter un jeu',
      properties: ['openFile'],
      filters: [{ name: 'Exécutables', extensions: ['exe', 'lnk', 'bat'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    let exePath = r.filePaths[0];
    if (exePath.toLowerCase().endsWith('.lnk')) {
      try { exePath = shell.readShortcutLink(exePath).target || exePath; } catch { /* keep */ }
    }
    const name = path.basename(exePath).replace(/\.(exe|bat|lnk)$/i, '');
    const id = 'manual:' + crypto.createHash('md5').update(exePath.toLowerCase()).digest('hex').slice(0, 12);
    if (!store.data.manual.find((m) => m.id === id)) {
      store.data.manual.push({ id, name, exePath, installDir: path.dirname(exePath) });
      store.save();
    }
    await library.scan();
    library.computeSizes(() => send('library:changed'));
    return id;
  });

  ipcMain.handle('game:removeManual', async (_e, id) => {
    store.data.manual = store.data.manual.filter((m) => m.id !== id);
    store.save();
    await library.scan();
    return true;
  });

  ipcMain.handle('stats:get', async () => {
    const games = library.games();
    return { sessions: store.data.sessions, disks: await diskInfo(games) };
  });
}

/**
 * The app used to be called "Nexus Launcher": move its data (playtime, profile,
 * settings, avatar) to the new Linkgeek folder on first launch.
 */
function migrateLegacyData() {
  const oldDir = path.join(app.getPath('appData'), 'Nexus Launcher');
  const newDir = app.getPath('userData');
  const oldFile = path.join(oldDir, 'library.json');
  const newFile = path.join(newDir, 'library.json');
  try {
    if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
      fs.mkdirSync(newDir, { recursive: true });
      for (const f of fs.readdirSync(oldDir)) {
        if (f === 'library.json' || f === 'google-oauth.json' || /^avatar/i.test(f)) {
          fs.copyFileSync(path.join(oldDir, f), path.join(newDir, f));
        }
      }
      const data = JSON.parse(fs.readFileSync(newFile, 'utf8'));
      if (data.profile && typeof data.profile.avatar === 'string' && data.profile.avatar.startsWith(oldDir)) {
        data.profile.avatar = path.join(newDir, data.profile.avatar.slice(oldDir.length));
      }
      fs.writeFileSync(newFile, JSON.stringify(data));
    }
  } catch (e) { console.error('migration failed', e); }

  // Old "start with Windows" shortcut → recreate it under the new name
  const oldLnk = path.join(path.dirname(startupLink()), 'Nexus Launcher.lnk');
  if (fs.existsSync(oldLnk)) {
    try { fs.unlinkSync(oldLnk); setStartup(true); } catch { /* ignore */ }
  }
}

app.on('second-instance', () => {
  if (win) { win.show(); if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(async () => {
  protocol.handle('nexus-img', (req) => {
    const p = new URL(req.url).searchParams.get('p');
    if (!p || !IMG_EXT.test(p)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(p).toString());
  });

  migrateLegacyData();
  store = new Store(app.getPath('userData'));
  library = new Library(store, async (exe) => (await app.getFileIcon(exe, { size: 'large' })).toDataURL());
  covers = new Covers(store);
  library.covers = covers;
  tracker = new Tracker(store, () => library.games(), (running) => {
    send('games:running', running);
    send('library:changed');
    if (online) online.heartbeat().catch(() => {}); // friends see the new game right away
    updateDiscord();
  });
  online = new Online({
    getConfig: firebaseConfig,
    loadRefreshToken: () => decrypt(store.data.onlineSession),
    saveRefreshToken: (t) => { store.data.onlineSession = t ? encrypt(t) : undefined; store.save(); },
    getActivity: currentActivity,
    getIdentity: () => {
      const p = getProfile();
      const acc = store.data.account;
      return { name: p.name, photo: (acc && acc.picture) || null, level: p.level ? p.level.level : 1, admin: p.admin, frame: p.frame, title: p.title ? p.title.key : null };
    },
    getCard,
    onMembership: (m) => {
      const cur = store.data.membership || {};
      if (cur.member === m.member && cur.joinedAt === m.joinedAt) return;
      store.data.membership = m;
      store.save();
      send('library:changed');
    },
    onSentRequest: (fid) => {
      const l = store.data.sentRequests || (store.data.sentRequests = []);
      if (!l.includes(fid)) { l.push(String(fid)); if (l.length > 200) l.shift(); store.save(); }
    },
    getSentRequests: () => store.data.sentRequests || [],
    onRanks: (remote) => {
      if (!remote) return; // no shared table yet: keep the local one
      let ranks;
      try { ranks = sanitizeRanks(Object.values(remote)); } catch { return; }
      if (JSON.stringify(ranks) === JSON.stringify(store.data.ranksConfig || RANKS)) return;
      store.data.ranksConfig = ranks;
      store.save();
      send('library:changed');
    },
    onGrant: (g) => {
      const by = String(g.by || 'l\'administrateur').slice(0, 40);
      const why = g.note ? `${String(g.note).slice(0, 80)} — de ${by}` : `Cadeau de ${by}`;
      if (Number.isFinite(g.xp) || Number.isFinite(g.level)) {
        challenges.grant({
          xp: Number.isFinite(g.xp) ? g.xp : undefined,
          level: Number.isFinite(g.level) ? g.level : undefined,
          title: g.note ? why : (Number.isFinite(g.level) ? `Niveau ${g.level} attribué par ${by}` : why),
        });
      }
      if (Number.isFinite(g.coins) && g.coins !== 0) {
        const n = Math.max(-1000000, Math.min(1000000, Math.trunc(g.coins)));
        shop.add(n, why);
        send('shop:coins', { n, why });
      }
      if (typeof g.ach === 'string' && g.ach) { try { grantAchOrTitle(g.ach, Number(g.tier)); } catch { /* unknown trophy */ } }
      online.updateIdentity();
    },
    onUpdate: (snap) => {
      send('friends:changed', snap);
      if (snap.status === 'online') {
        notifyFriendGames(snap);
        const myGame = currentActivity().game;
        achievements.notePlayedWith(myGame, snap.friends);
        achievements.schedule();
        challenges.notePlayedWith(myGame, snap.friends);
        challenges.schedule();
      }
    },
  });
  achievements = new Achievements(store, () => library.games(), () => online && online.snapshot, announceAchievements);
  achievements.getName = () => (library.profile && library.profile.name) || ''; // Steam name when no Linkgeek pseudo
  challenges = new Challenges({
    store,
    getGames: () => library.games(),
    getRunning: () => tracker.running,
    getFriends: () => online && online.snapshot,
    getRanks: () => store.data.ranksConfig || RANKS,
    onComplete: announceChallenges,
  });
  genres = new Genres(store);
  library.genres = genres;
  news = new News(store);
  library.news = news;
  reco = new Recommender(store, () => library.games(), (id) => (genres.cache[id] || {}).tags, () => library.ownedSteam || new Set());
  titles = new Titles(store, titleContext, announceTitles);
  shop = new Shop(store);
  shop.init(challenges.levelInfo().level); // tokens for the levels reached before the Boutique existed
  // a bought theme that is no longer owned (edited file): back to the default
  const th = store.data.settings.theme;
  if (th && !FREE_THEMES.includes(th) && !shop.owns(th)) store.data.settings.theme = 'classic';

  registerIpc();
  createWindow();
  createTray();

  updater = setupUpdater({
    send,
    notify: (version) => {
      if (win && !win.isDestroyed() && win.isVisible()) return;
      try {
        const { Notification } = require('electron');
        if (!Notification.isSupported()) return;
        const n = new Notification({
          title: `Linkgeek ${version} est prêt`,
          body: 'La mise à jour sera installée à la prochaine fermeture de Linkgeek.',
          icon: path.join(__dirname, 'assets', 'icon.png'),
        });
        n.on('click', () => { if (win) { win.show(); win.focus(); } });
        n.show();
      } catch { /* ignore */ }
    },
    beforeInstall: async () => {
      quitting = true;
      if (tracker) tracker.stop();
      if (store) store.flush();
      if (online && online.session && !offlineSent) { offlineSent = true; await online.goOffline(); }
    },
  });
  ipcMain.handle('update:install', () => updater.install());
  ipcMain.handle('update:status', () => ({ version: app.getVersion(), ready: updater.ready || null }));

  await library.scan();
  achievements.ready = true;
  challenges.ready = true;
  titles.ready = true;
  challenges.startClock();
  send('library:changed');
  tracker.start();
  updateDiscord();
  library.computeSizes(() => send('library:changed'));
  // artwork first (it finds the Steam page of non-Steam games), then genres of the games played
  covers.fill(library.games(), () => send('library:changed'))
    .finally(() => genres.fill(library.games().filter((g) => g.playtimeSec > 0), () => send('library:changed'))
      // recommendations need the tags of my games: computed once they are known (cached 12 h)
      .finally(() => { if (!reco.cached()) reco.compute().then((r) => { if (r) send('reco:changed'); }).catch(() => {}); }));
  // Steam news of my games, refreshed every 3 hours (most played first)
  const refreshNews = () => news.fill(library.games().filter((g) => g.source === 'steam' && !g.hidden).sort((a, b) => b.playtimeSec - a.playtimeSec), () => send('library:changed'));
  setTimeout(refreshNews, 5000);
  setInterval(refreshNews, 3 * 3600 * 1000 + 60000);
  online.resume();
  // keep the public card (hours this week, achievements…) fresh for friends
  setInterval(() => { if (online.session) online.publishCard().catch(() => {}); }, 5 * 60 * 1000);
});

app.on('before-quit', (e) => {
  quitting = true;
  if (tracker) tracker.stop();
  if (store) store.flush();
  discord.disconnect();
  // Tell friends we went offline before exiting (max ~2.5 s)
  if (online && online.session && !offlineSent) {
    e.preventDefault();
    offlineSent = true;
    online.goOffline().finally(() => app.quit());
  }
});

app.on('window-all-closed', () => { /* keep tray alive */ });

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
const { Shop, SHOP_THEMES, SHOP_SEASONAL } = require('./src/shop');
const { Cards, CARDS: CARD_LIST } = require('./src/cards');
const { Genres, GENRES } = require('./src/genres');
const { Titles } = require('./src/titles');
const { News } = require('./src/news');
const { Recommender } = require('./src/recommend');
const { Notifier } = require('./src/notifier');
const { Social, gameKey } = require('./src/social');
const { Chat } = require('./src/chat');

const FREE_THEMES = ['classic', 'dark', 'light'];
const THEMES = {
  classic: { bg: '#0a0c11', symbol: '#c9cfdc' },
  dark: { bg: '#050505', symbol: '#d0d0d0' },
  light: { bg: '#eef0f5', symbol: '#2b3140' },
  // themes sold in the Boutique
  ...Object.fromEntries([...SHOP_THEMES, ...SHOP_SEASONAL].map((t) => [t.id, { bg: t.c.bg, symbol: t.symbol }])),
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
let cards;
let genres;
let titles;
let news;
let reco;
const discord = new DiscordPresence();
let lastFriendGames = null; // uid -> game id, to notify when a friend starts a game
let lastFriendOnline = null; // uid -> online?, to notify when a friend comes online
let notifier = null; // overlay notifications (top-right, on top of games)
let social = null;   // invites, duels, coéquipiers, contact, parrainage
let chat = null;     // messagerie entre amis
let chatFriendsT = null;
// Public download page (button « Partager » in the top bar)
const DOWNLOAD_URL = 'https://github.com/unknownxsr/linkgeek/releases/latest';
let quitting = false;

/* ---------------- Notifications (Paramètres → Notifications) ----------------
 * Each type can be switched off. When Linkgeek is not the window in front (a game is,
 * or it is minimised / in the tray), they show at the top-right of the screen, on top of
 * the game. When Linkgeek is in front, the app shows its own toast instead. */
const NOTIF_TYPES = ['trophy', 'friendOnline', 'friendGame', 'invite', 'message', 'duel', 'challenge', 'level', 'wheel', 'packs', 'update'];
// Interface languages: French is the original; 'en' texts are written here with L(), the other
// languages are translated from the French by the notification window (renderer/i18n-xx.js).
const LANGS = ['fr', 'en', 'es', 'de', 'ru'];
const L = (fr, en) => (store && store.data.settings.language === 'en' ? en : fr);
const uiLang = () => (store && LANGS.includes(store.data.settings.language) ? store.data.settings.language : 'fr');
/** Windows display language, e.g. 'es-ES' (after app ready). */
function systemLanguage() {
  if (process.env.LINKGEEK_SYSLANG) return process.env.LINKGEEK_SYSLANG; // tests
  try { return (app.getPreferredSystemLanguages && app.getPreferredSystemLanguages()[0]) || app.getLocale() || 'fr-FR'; } catch { return 'fr-FR'; }
}
/** Language for a first launch: the Windows language if Linkgeek has it, otherwise English. */
function detectLanguage() {
  const l = systemLanguage().toLowerCase().split(/[-_]/)[0];
  return LANGS.includes(l) ? l : 'en';
}
/**
 * Country of the player (2 letters, e.g. 'FR', 'US', 'BR'), from the Windows regional format
 * (then the display language). Used for the currency, the date / time format and the
 * country leaderboard.
 */
function systemRegion() {
  const pick = (loc) => { const m = /[-_]([A-Za-z]{2})(?:$|[-_@.])/.exec(String(loc || '')); return m ? m[1].toUpperCase() : null; };
  if (/^[A-Z]{2}$/.test(process.env.LINKGEEK_REGION || '')) return process.env.LINKGEEK_REGION; // tests
  let r = null;
  try { r = pick(app.getSystemLocale && app.getSystemLocale()); } catch { /* old Electron */ }
  return r || pick(systemLanguage()) || 'FR';
}
function notifOn(type) {
  const s = store.data.settings;
  if (type === 'friendGame') return s.notifyFriends !== false; // older setting, same switch
  return !(s.notifs && s.notifs[type] === false);
}
/**
 * n = { kicker, title, body, icon (emoji), img (url), round, accent ('r,g,b') }.
 * inApp: Linkgeek in front → ask the window for a toast (types the app has no toast for).
 */
function notify(type, n, inApp = false) {
  if (!store || !notifOn(type)) return;
  if ((type === 'friendOnline' || type === 'friendGame' || type === 'invite' || type === 'message') && dndActive()) return; // « Ne pas déranger »
  const front = win && !win.isDestroyed() && win.isVisible() && !win.isMinimized() && win.isFocused();
  if (front) { if (inApp) send('notify:inapp', { type, ...n }); return; }
  if (!notifier) notifier = new Notifier();
  notifier.show({ type, ...n, lang: uiLang() });
}
const TIER_ACCENT = { bronze: '205,127,50', silver: '200,210,222', gold: '242,185,44', platinum: '159,216,255' };
const localDay = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
/** Once a day: the wheel can be spun / boosters can be opened (also right after midnight). */
function checkDailyNotifs() {
  if (!store || !shop || !cards || !challenges) return;
  const seen = store.data.notifSeen || (store.data.notifSeen = {});
  const today = localDay();
  try {
    if (shop.wheel().free && seen.wheel !== today) {
      seen.wheel = today; store.save();
      notify('wheel', { kicker: L('Roulette du jour', 'Daily wheel'), title: L('Ton tour gratuit t\'attend', 'Your free spin is waiting'), body: L('Geek Coins, XP ou un thème au hasard : tente ta chance dans la Boutique.', 'Geek Coins, XP or a random theme: try your luck in the Shop.'), icon: '🎡', accent: '242,185,44' }, true);
    }
    const c = cards.list();
    if (c.leftToday > 0 && (c.gifts > 0 || c.coins >= c.price) && seen.packs !== today) {
      seen.packs = today; store.save();
      notify('packs', { kicker: L('Cartes à collectionner', 'Collectible cards'), title: c.gifts > 0 ? L(`${c.gifts} booster${c.gifts > 1 ? 's' : ''} offert${c.gifts > 1 ? 's' : ''} à ouvrir`, `${c.gifts} gifted booster${c.gifts > 1 ? 's' : ''} to open`) : L(`${c.leftToday} boosters à ouvrir aujourd'hui`, `${c.leftToday} boosters to open today`), body: L('Ouvre-les dans Succès → Cartes.', 'Open them in Achievements → Cards.'), icon: '🃏', accent: '181,107,255' }, true);
    }
  } catch { /* not ready */ }
}

/**
 * My score in a duel for its week [start, end): minutes played (Linkgeek tracking) on the
 * duel's game, matched by name so it works whatever the store, or challenges completed.
 */
function duelScore(d, start, end) {
  if (d.kind === 'challenges') {
    const h = (challenges && challenges.data && challenges.data.history) || [];
    return h.filter((x) => x.at >= start && x.at < end && ['daily', 'weekly', 'onetime'].includes(x.kind)).length;
  }
  const key = d.game && d.game.key;
  if (!key || !library) return 0;
  const ids = new Set(library.games().filter((g) => gameKey(g.name) === key).map((g) => g.id));
  if (!ids.size) return 0;
  const sessions = [...store.data.sessions];
  if (tracker) for (const [gameId, r] of tracker.running) sessions.push({ gameId, start: r.start, end: Date.now() });
  let ms = 0;
  for (const s of sessions) if (ids.has(s.gameId)) ms += Math.max(0, Math.min(s.end, end) - Math.max(s.start, start));
  return Math.floor(ms / 60000);
}

/** A new message from a friend (src/chat.js): the window reloads the conversation, else a notification. */
function chatEvent(kind, e) {
  if (kind !== 'message') return;
  send('chat:message', e);
  if (e.quiet) return;
  const front = win && !win.isDestroyed() && win.isVisible() && !win.isMinimized() && win.isFocused();
  if (front && e.open) return; // already reading this conversation
  notify('message', { kicker: L('Nouveau message', 'New message'), title: e.name, body: e.text, img: e.photo || '', icon: '💬', round: true, accent: '79,179,255', duration: 7000, raw: true }, true);
}

/** News from src/social.js → window + notifications (top-right when Linkgeek is not in front). */
function socialEvent(kind, e) {
  if (kind === 'invite') {
    send('social:invite', e);
    notify('invite', { kicker: L('Invitation à jouer', 'Game invite'), title: L(`${e.name} t'invite à jouer`, `${e.name} invites you to play`), body: e.game.name, img: e.photo || '', icon: '🎮', round: true, accent: '79,179,255', duration: 9000 });
  } else if (kind === 'duelNew') {
    const d = e.duel;
    notify('duel', { kicker: L('Duel de la semaine', 'Weekly duel'), title: L(`${d.aName} te défie !`, `${d.aName} challenges you!`), body: `${d.kind === 'game' ? L(`Qui joue le plus à ${d.game.name} ?`, `Who plays ${d.game.name} the most?`) : L('Qui fait le plus de défis ?', 'Who completes the most challenges?')} · ${d.stake} Geek Coins`, icon: '⚔️', accent: '255,92,120' }, true);
  } else if (kind === 'duelAnswer') {
    const d = e.duel;
    if (d.a !== e.me) return;
    const ok = d.status === 'active';
    notify('duel', { kicker: L('Duel de la semaine', 'Weekly duel'), title: ok ? L(`${d.bName} accepte ton duel !`, `${d.bName} accepts your duel!`) : L(`${d.bName} refuse ton duel`, `${d.bName} declines your duel`), body: ok ? L('Que le meilleur gagne 🔥', 'May the best one win 🔥') : L('Ta mise t\'est rendue.', 'Your stake is given back.'), icon: '⚔️', accent: '255,92,120' }, true);
  } else if (kind === 'duelEnd') {
    const won = e.result === 'won'; const draw = e.result === 'draw';
    notify('duel', { kicker: L('Duel terminé', 'Duel over'), title: won ? L(`Tu gagnes ${e.stake * 2} Geek Coins !`, `You win ${e.stake * 2} Geek Coins!`) : draw ? L('Égalité : mise rendue', 'Draw: stake given back') : L('Duel perdu', 'Duel lost'), body: `${e.mine} – ${e.theirs}`, icon: won ? '🏆' : draw ? '🤝' : '⚔️', accent: won ? '242,185,44' : '255,92,120' }, true);
  } else if (kind === 'referralPack') {
    send('cards:gift', { what: '+1 booster', by: L('Parrainage', 'Referral'), packs: 1 });
    notify('packs', { kicker: L('Parrainage', 'Referral'), title: L('Booster offert !', 'Free booster!'), body: e.why === 'referred' ? L('Merci d\'avoir rejoint Linkgeek grâce à un ami.', 'Thanks for joining Linkgeek through a friend.') : L('Un ami que tu as invité a installé Linkgeek.', 'A friend you invited installed Linkgeek.'), icon: '🃏', accent: '181,107,255' });
  }
}
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
  // a profile title counts as a trophy notification (on top of the game when Linkgeek is not in front)
  if (list[0]) notify('trophy', { kicker: L('Nouveau titre débloqué', 'New title unlocked'), title: list[0].name, body: list[0].desc, icon: '🏷️', accent: '242,185,44' });
}

function announceChallenges(r) {
  r.tokens = shop ? shop.reward(r) : 0; // Boutique tokens for challenges and new levels
  if (titles) titles.schedule(); // "Maître du jeu" (level 100)
  send('challenges:completed', r);
  if (r.levelUp && r.levelUp.rankUp && online) online.updateIdentity(); // new rank = new avatar frame
  if (r.levelUp && online) online.updateIdentity(); // friends see the new level
  // On top of the game when Linkgeek is not in front (the app shows its own toast otherwise)
  const sx = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n)} XP`;
  const done = r.completed.filter((c) => c.kind !== 'wheel' && c.kind !== 'admin'); // the wheel shows its own prize
  if (done.length) {
    const xp = done.reduce((a, c) => a + c.xp, 0);
    notify('challenge', {
      kicker: done.length > 1 ? L(`${done.length} défis réalisés`, `${done.length} challenges completed`) : L('Défi réalisé', 'Challenge completed'),
      title: done.length > 1 ? `${sx(xp)}${r.tokens ? ` · +${r.tokens} Geek Coins` : ''}` : done[0].title,
      body: done.length > 1 ? done.map((c) => c.title).join(' · ') : `${sx(done[0].xp)}${r.tokens ? ` · +${r.tokens} Geek Coins` : ''}`,
      icon: '✅', accent: '61,214,140',
    });
  }
  if (r.levelUp) {
    notify('level', {
      kicker: L('Niveau supérieur', 'Level up'),
      title: L(`Niveau ${r.levelUp.to} atteint !`, `Level ${r.levelUp.to} reached!`),
      body: r.levelUp.rankUp ? L(`Nouveau badge : ${r.levelUp.rankName}`, `New badge: ${r.levelUp.rankName}`) : L('Continue tes défis pour monter encore.', 'Keep completing challenges to climb higher.'),
      icon: '⬆️', accent: '124,92,255',
    });
  }
}

/** Wheel XP waiting to be added (also picked up at the next start if Linkgeek closed meanwhile). */
function payWheelXp() {
  const w = shop && shop.data.wheel;
  if (!w || !(w.pendingXp > 0)) return;
  const n = w.pendingXp;
  w.pendingXp = 0;
  store.save();
  challenges.grant({ xp: n, title: `Roulette : ${n} XP`, kind: 'wheel' });
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
  // On top of the game (top-right) when Linkgeek is not in front; the app shows its own toast otherwise
  const first = list[list.length - 1];
  if (!first) return;
  notify('trophy', {
    kicker: list.length > 1 ? L(`${list.length} trophées débloqués`, `${list.length} trophies unlocked`) : L(`Trophée ${first.tierName} débloqué`, `${first.tierName} trophy unlocked`),
    title: first.name,
    body: first.desc,
    icon: first.kind === 'ultimate' ? '👑' : first.secret ? '🔮' : '🏆',
    accent: first.kind === 'ultimate' ? '255,140,220' : first.secret ? '140,100,255' : TIER_ACCENT[first.rarity] || TIER_ACCENT.bronze,
    duration: 6500,
  });
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
    // .ico on Windows: the window and taskbar pick the exact size they need (16 … 256)
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: theme.symbol, height: 52 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Pinning the window to the taskbar: Windows would take the icon of Linkgeek.exe (Electron's,
  // the exe is never modified). These properties give it the Linkgeek logo and how to relaunch.
  if (process.platform === 'win32') {
    try {
      win.setAppDetails({
        appId: 'com.zenshyy.linkgeek',
        appIconPath: path.join(__dirname, 'assets', 'icon.ico'),
        appIconIndex: 0,
        relaunchCommand: `"${process.execPath}"`,
        relaunchDisplayName: 'Linkgeek',
      });
    } catch { /* older Windows: keep the default */ }
  }
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
  const icon = process.platform === 'win32'
    ? nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.ico')) // Windows takes the 16/24/32 px frame it needs
    : nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Linkgeek');
  buildTrayMenu();
  tray.on('click', () => { win.show(); win.focus(); });
}
/** Tray menu in the interface language (rebuilt when the language changes). */
const TRAY_TEXT = {
  fr: ['Ouvrir Linkgeek', 'Mode TV / manette', 'Quitter'],
  en: ['Open Linkgeek', 'TV / controller mode', 'Quit'],
  es: ['Abrir Linkgeek', 'Modo TV / mando', 'Salir'],
  de: ['Linkgeek öffnen', 'TV- / Controller-Modus', 'Beenden'],
  ru: ['Открыть Linkgeek', 'Режим ТВ / геймпад', 'Выход'],
};
function buildTrayMenu() {
  const t = TRAY_TEXT[store && store.data.settings.language] || TRAY_TEXT.fr;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: t[0], click: () => { win.show(); win.focus(); } },
    { label: t[1], click: () => { win.show(); win.focus(); send('tv:mode', true); } },
    { type: 'separator' },
    { label: t[2], click: () => { quitting = true; app.quit(); } },
  ]));
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
    // the window makes a small JPEG of a custom picture so friends can see it (see profile:setAvatarShare)
    needsAvatarShare: !!(p.avatar && fs.existsSync(p.avatar) && !(p.avatarShare && p.avatarShare.src === (p.avatarV || 0))),
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
    showcase: showcaseFor(p, a),
    bestCards: bestCards(),
  };
}

/**
 * The 2 best collectible cards: rarest first, then holo, then avec skin, then sans skin.
 * Shared as { id, holo }: id + "skin" = the skinned version (ids stay a-z for the rules).
 */
function bestCards() {
  if (!cards) return [];
  const RANK = { mythic: 4, legendary: 3, epic: 2, rare: 1, common: 0 };
  const vr = (c) => (c.holo > 0 ? 2 : c.skinN > 0 ? 1 : 0);
  return cards.list().cards.filter((c) => c.n > 0)
    .sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || vr(b) - vr(a) || b.n - a.n || a.num - b.num)
    .slice(0, 2).map((c) => ({ id: vr(c) === 1 ? c.id + 'skin' : c.id, holo: c.holo > 0 }));
}

/** The 3 showcased achievements, resolved (a slot whose achievement is locked again shows empty). */
const SHOWCASE_SLOTS = 3;
function showcaseFor(p, a) {
  const items = a ? a.items : [];
  return Array.from({ length: SHOWCASE_SLOTS }, (_, i) => {
    const k = p.showcase && p.showcase[i];
    const it = k && items.find((x) => x.key === k && x.tier >= 1);
    if (!it) return null;
    const t = it.tiers[0];
    // tier = rarity rank (1 Bronze … 4 Platine): what friends' Linkgeek uses to colour the trophy
    const rank = { bronze: 1, silver: 2, gold: 3, platinum: 4 }[it.rarity] || 1;
    return { key: it.key, name: it.name, icon: it.icon, kind: it.kind || (it.secret ? 'secret' : null), secret: !!it.secret, rarity: it.rarity, tier: rank, tierName: t.name, desc: t.desc, at: t.at };
  });
}

/* ---------------- Avatar frames ----------------
 * Every rank reached unlocks the matching frame around the profile picture.
 * "auto" (default) = the frame of the current rank; "none" = no frame.
 */
function rankFrames() {
  if (!challenges) return [];
  const lv = challenges.levelInfo().level;
  return challenges.ranks().filter((r) => lv >= r.min).map((r) => r.key);
}
/** Rank frames reached + frames bought in the Boutique ("f_…"). */
function unlockedFrames() {
  return [...rankFrames(), ...(shop ? shop.ownedFrames() : [])];
}
function frameFor(choice) {
  if (choice === 'none') return null;
  if (choice && unlockedFrames().includes(choice)) return choice;
  const ranks = rankFrames();
  return ranks[ranks.length - 1] || null; // "auto" = current rank
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
  const perDay = new Map(); // day start -> ms played that day
  for (const s of sessions) {
    const len = s.end - s.start;
    if (!longest || len > longest.ms) longest = { ms: len, gameId: s.gameId, at: s.start };
    for (let t = new Date(s.start).setHours(0, 0, 0, 0); t <= s.end; t = new Date(t + 36 * 3600000).setHours(0, 0, 0, 0)) {
      days.add(dayKey(t));
      const next = new Date(t + 36 * 3600000).setHours(0, 0, 0, 0);
      const part = Math.min(s.end, next) - Math.max(s.start, t);
      if (part > 0) perDay.set(t, (perDay.get(t) || 0) + part);
    }
  }
  const [bestDayAt, bestDayMs] = [...perDay].sort((x, y) => y[1] - x[1])[0] || [];
  // most recently discovered game (first seen by Linkgeek after the first scan)
  const seen = Object.entries(store.data.firstSeen || {});
  const firstScan = seen.length ? Math.min(...seen.map(([, t]) => t)) : 0;
  const [newId, newAt] = seen.filter(([, t]) => t > firstScan + 3600000).sort((x, y) => y[1] - x[1])[0] || [];
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
    bestDay: bestDayMs >= 60000 ? { at: bestDayAt, ms: bestDayMs } : null,
    newest: newId ? { gameId: newId, at: newAt } : null,
  };
}

/**
 * Estimated value of the Steam library: full Steam price (in the player's country and
 * currency, without discounts) of each Steam game, cached 7 days. Only app ids and the
 * country code are sent to Steam.
 */
const PRICE_TTL = 7 * 86400000;
async function libraryValue(force = false) {
  const cache = store.data.libPrices || (store.data.libPrices = {});
  const cc = systemRegion().toLowerCase();
  const steam = library.games().filter((g) => g.source === 'steam' && !g.hidden);
  const ids = steam.map((g) => g.id.split(':')[1]).filter((id) => /^\d+$/.test(id));
  // prices of another country (the player moved, or an older version priced everything in France)
  const todo = ids.filter((id) => force || !cache[id] || Date.now() - cache[id].at > PRICE_TTL || (cache[id].cc || 'fr') !== cc);
  for (let i = 0; i < todo.length; i += 40) {
    const chunk = todo.slice(i, i + 40);
    try {
      const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${chunk.join(',')}&cc=${cc}&filters=price_overview`, { signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      for (const id of chunk) {
        const d = j && j[id];
        const p = d && d.success && d.data && d.data.price_overview;
        cache[id] = p ? { at: Date.now(), cc, cents: p.initial || p.final || 0, currency: p.currency || 'EUR' }
          : { at: Date.now(), cc, cents: d && d.success ? 0 : null, free: !!(d && d.success) };
      }
    } catch { /* offline: use what is cached */ }
  }
  store.save();
  // the currency most prices are in (Steam answers in the country's currency, or USD / EUR)
  const counts = {};
  for (const id of ids) { const c = cache[id]; if (c && c.cents > 0 && c.currency) counts[c.currency] = (counts[c.currency] || 0) + 1; }
  const currency = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'EUR';
  const items = steam.map((g) => {
    const c = cache[g.id.split(':')[1]];
    if (!c || c.cents === null || c.cents === undefined) return null;
    if (c.cents > 0 && c.currency && c.currency !== currency) return null; // never add two currencies
    const price = c.cents / 100;
    const hours = (g.playtimeSec || 0) / 3600;
    return { gameId: g.id, price, free: !c.cents, hours, perHour: hours >= 1 && price > 0 ? price / hours : null };
  }).filter(Boolean);
  const total = items.reduce((a, x) => a + x.price, 0);
  const paidHours = items.filter((x) => x.price > 0).reduce((a, x) => a + x.hours, 0);
  return { total, currency, country: cc.toUpperCase(), count: items.length, unknown: steam.length - items.length, free: items.filter((x) => x.free).length, perHour: paidHours >= 1 ? total / paidHours : null, items, at: Date.now() };
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
/** This week (Monday 00:00 → now, local time): its key (Monday's date) and hours played. */
function weekInfo() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const w0 = d.getTime();
  let ms = 0;
  for (const s of store.data.sessions) if (s.end > w0) ms += s.end - Math.max(s.start, w0);
  for (const r of tracker.running.values()) ms += Date.now() - Math.max(r.start, w0);
  return { week: new Date(w0 - new Date(w0).getTimezoneOffset() * 60000).toISOString().slice(0, 10), start: w0, hours: Math.min(168, Math.round(ms / 360000) / 10) };
}

/**
 * Admin dashboard totals, built from the global snapshot. Only counts and game names
 * go to the window: no player names, e-mails or socials.
 */
function adminStats(snap) {
  const { users, presence, cards, friends, memberCount, now, offlineAfter } = snap;
  const H = 3600000, D = 24 * H;
  const uids = Object.keys(users);
  const count = (list) => [...list.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n }));

  // presence
  let online = 0, away = 0, active24 = 0, active7 = 0, active30 = 0;
  const playing = [];
  for (const p of Object.values(presence)) {
    if (!p || typeof p !== 'object') continue;
    const age = now - (Number(p.lastSeen) || 0);
    if (age < D) active24++;
    if (age < 7 * D) active7++;
    if (age < 30 * D) active30++;
    if (age > offlineAfter || p.state === 'offline') continue;
    if (p.state === 'away') away++; else online++;
    if (p.game && p.game.name) playing.push(String(p.game.name).slice(0, 120));
  }

  // players
  const ranks = challenges ? challenges.ranks() : RANKS;
  const byRank = ranks.map((r) => ({ name: r.name, min: r.min, key: r.key, n: 0 }));
  let levelSum = 0, levelMax = 0, new7 = 0, new30 = 0, founders = 0;
  const titles = [];
  for (const u of Object.values(users)) {
    if (!u || typeof u !== 'object') continue;
    const lv = Math.max(1, Number(u.level) || 1);
    levelSum += lv; levelMax = Math.max(levelMax, lv);
    let ri = 0; ranks.forEach((r, i) => { if (lv >= r.min) ri = i; });
    if (byRank[ri]) byRank[ri].n++;
    if (u.joinedAt && now - u.joinedAt < 7 * D) new7++;
    if (u.joinedAt && now - u.joinedAt < 30 * D) new30++;
    if (u.member && u.member <= 100) founders++;
    if (u.title) titles.push(u.title);
  }

  // play time (cards)
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const week = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let totalHours = 0, weekHours = 0, gamesSum = 0, cardsN = 0, ultimate = 0, socials = 0;
  const favorites = [];
  for (const c of Object.values(cards)) {
    if (!c || typeof c !== 'object') continue;
    cardsN++;
    totalHours += Number(c.totalHours) || 0;
    if (c.week === week) weekHours += Number(c.weekHours) || 0;
    gamesSum += Number(c.games) || 0;
    if (c.ach && c.ach.ultimate) ultimate++;
    if (c.socials && Object.keys(c.socials).length) socials++;
    if (c.top && c.top.name) favorites.push(String(c.top.name).slice(0, 120));
  }

  // friendships (each one is stored on both sides)
  let links = 0, lonely = 0;
  for (const uid of uids) {
    const n = Object.keys(friends[uid] || {}).length;
    links += n;
    if (!n) lonely++;
  }

  // local history of the online count, sampled at most every 5 min, kept 7 days
  const hist = (store.data.adminHistory || []).filter((h) => now - h.at < 7 * D);
  if (!hist.length || now - hist[hist.length - 1].at >= 5 * 60000) hist.push({ at: now, n: online + away });
  store.data.adminHistory = hist; store.save();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const peakToday = Math.max(online + away, ...hist.filter((h) => h.at >= today.getTime()).map((h) => h.n));

  return {
    at: now,
    online: { now: online + away, active: online, away, inGame: playing.length, peakToday, history: hist.filter((h) => now - h.at < D) },
    activity: { active24, active7, active30 },
    players: { members: Math.max(memberCount, uids.length), profiles: uids.length, new7, new30, founders, avgLevel: uids.length ? Math.round(levelSum / uids.length * 10) / 10 : 0, maxLevel: levelMax, byRank },
    play: { totalHours: Math.round(totalHours), weekHours: Math.round(weekHours), avgGames: cardsN ? Math.round(gamesSum / cardsN) : 0, ultimate, socials, cards: cardsN },
    friends: { pairs: Math.round(links / 2), avg: uids.length ? Math.round(links / uids.length * 10) / 10 : 0, lonely },
    playingNow: count(playing),
    favorites: count(favorites),
    titles: count(titles),
  };
}

function requireAdmin() { if (!isAdmin()) throw new Error('Réservé à l\'administrateur de Linkgeek'); }

/**
 * Admin gift of a Boutique item (theme, seasonal theme, frame): gives it or takes it back.
 * Taking back the applied theme goes back to the default one; a removed frame stops showing
 * on its own (frameFor only accepts unlocked frames). Returns { item, themeReset }.
 */
function applyItemGrant(id, remove) {
  const item = shop.grantItem(String(id), !!remove);
  let themeReset = false;
  if (remove && item.kind === 'theme' && store.data.settings.theme === item.id) {
    store.data.settings.theme = 'classic';
    applyTheme('classic');
    store.save();
    themeReset = true;
  }
  if (item.kind === 'frame' && online) online.updateIdentity(); // friends see the frame change
  return { item, themeReset };
}

/**
 * Cards part of an admin gift: { card: id | 'all' (+ "skin" = avec skin), cardN (±), holo, packs (±) },
 * all checked. Gives out.variant: 'base' (sans skin), 'skin' or 'holo'.
 */
function cardGrant(g) {
  const out = {};
  const n = Math.trunc(Number(g && g.cardN));
  if (g && g.card && Number.isFinite(n) && n !== 0) {
    let id = String(g.card);
    let skin = false;
    if (id !== 'all' && !CARD_LIST.some((c) => c.id === id) && id.endsWith('skin')) { id = id.slice(0, -4); skin = true; }
    if (id !== 'all' && !CARD_LIST.some((c) => c.id === id)) throw new Error('Carte inconnue');
    out.card = id; out.cardN = Math.max(-999, Math.min(999, n)); out.holo = !!g.holo;
    out.variant = out.holo ? 'holo' : skin ? 'skin' : 'base';
  }
  const p = Math.trunc(Number(g && g.packs));
  if (Number.isFinite(p) && p !== 0) out.packs = Math.max(-999, Math.min(999, p));
  return out;
}

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

/** Wide artwork of a game for the profile banner (Steam hero, else the widest https image). */
const httpsBanner = (g) => {
  if (!g) return null;
  if (g.source === 'steam') return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.id.split(':')[1]}/library_hero.jpg`;
  return [g.hero, g.header, g.cover].find((u) => typeof u === 'string' && u.startsWith('https://') && u.length <= 500) || null;
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
  const wk = weekInfo();
  const card = {
    top5,
    ach: { unlocked: a.unlocked, total: a.total, points: a.points, ...(a.ultimate ? { ultimate: true } : {}) },
    games: games.filter((g) => !g.hidden).length,
    totalHours: Math.round(games.reduce((s, g) => s + (g.playtimeSec || 0), 0) / 360) / 10,
    weekHours: wk.hours,
    week: wk.week,
  };
  const sc = showcaseFor(p, a).filter(Boolean)
    .map((s) => ({ name: String(s.name).slice(0, 60), icon: String(s.icon || 'trophy').slice(0, 20), tier: s.tier, ...(s.kind === 'secret' || s.kind === 'ultimate' ? { kind: s.kind } : {}) }));
  if (sc.length) card.showcase = sc;
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
  // the banner of my profile page: first game of my top 5, else my most played game
  const bannerGame = (p.top5 || []).map((id) => byId.get(id)).find(Boolean) || top;
  const banner = httpsBanner(bannerGame);
  if (banner) card.banner = banner;
  const best = bestCards();
  if (best.length) card.bestCards = best;
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
/**
 * "Ne pas déranger": no friend notifications while it is on.
 *  - 'competitive' (default): while a game marked « partie classée » is running
 *  - 'playing': while any game is running · 'always' · 'off'
 */
const DND_MODES = ['off', 'competitive', 'playing', 'always'];
function dndActive() {
  const s = store.data.settings;
  const mode = DND_MODES.includes(s.dnd) ? s.dnd : 'competitive';
  if (mode === 'always') return true;
  if (mode === 'off' || !tracker) return false;
  const running = tracker.runningIds();
  if (mode === 'playing') return running.length > 0;
  const marked = new Set(s.dndGames || []);
  return running.some((id) => marked.has(id));
}

/**
 * Mode « en jeu »: when a game starts, Linkgeek gets out of the way (minimised, animations
 * paused by the window) to leave memory and CPU to the game. Back to normal when it stops.
 */
let gameModeOn = false;
let tvMode = false; // mode TV / manette (full screen, renderer/tv.js)
let tvHadGame = false;
function updateGameMode(running) {
  const on = store.data.settings.gameMode !== false && running.length > 0;
  if (on && !gameModeOn && win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) win.minimize();
  // mode TV: the game is closed → back to the big screen, like a console
  // (only once, when the last game closes)
  if (running.length === 0 && tvHadGame && tvMode && win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.setFullScreen(true); win.focus(); }
  tvHadGame = running.length > 0;
  gameModeOn = on;
  send('gamemode', { on, dnd: dndActive() }); // also tells the window whether « Ne pas déranger » is on
}

/** A friend comes online / starts a game: in the app, or on top of the game (top-right). */
function notifyFriendGames(snap) {
  const now = new Map(snap.friends.map((f) => [f.uid, f.game ? f.game.id : null]));
  const prev = lastFriendGames;
  lastFriendGames = now;
  const onlineNow = new Map(snap.friends.map((f) => [f.uid, f.state !== 'offline']));
  const prevOnline = lastFriendOnline;
  lastFriendOnline = onlineNow;
  const photo = (f) => (typeof f.photo === 'string' && /^(https:|data:image\/)/.test(f.photo) ? f.photo : '');
  // friend online (not the first look after start: everybody would "come online")
  if (prevOnline) {
    for (const f of snap.friends) {
      if (!onlineNow.get(f.uid) || !prevOnline.has(f.uid) || prevOnline.get(f.uid)) continue;
      notify('friendOnline', {
        kicker: L('Ami en ligne', 'Friend online'), title: L(`${f.name} est en ligne`, `${f.name} is online`),
        body: f.game ? L(`Joue à ${f.game.name}`, `Playing ${f.game.name}`) : L('Viens jouer avec lui !', 'Come and play together!'),
        img: photo(f), icon: '🟢', round: true, accent: '61,214,140',
      }, true);
    }
  }
  if (!prev || store.data.settings.notifyFriends === false || dndActive()) return;
  for (const f of snap.friends) {
    if (!f.game || !prev.has(f.uid) || prev.get(f.uid) === f.game.id) continue;
    send('friends:activity', { uid: f.uid, name: f.name, photo: f.photo, game: f.game });
    notify('friendGame', {
      kicker: L('Un ami lance un jeu', 'A friend started a game'), title: L(`${f.name} joue maintenant`, `${f.name} is playing now`),
      body: L(`Vient de lancer ${f.game.name}`, `Just started ${f.game.name}`), img: photo(f), icon: '🎮', round: true, accent: '79,179,255',
    });
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
    notifs: Object.fromEntries(NOTIF_TYPES.map((t) => [t, notifOn(t)])),
    gameMode: s.gameMode !== false,
    tvStart: !!s.tvStart, // open in mode TV
    tvPad: s.tvPad !== false, // a controller button (☰ / Start) opens mode TV
    homeLayout: s.homeLayout || null,
    dnd: DND_MODES.includes(s.dnd) ? s.dnd : 'competitive',
    dndGames: s.dndGames || [],
    dndActive: store ? dndActive() : false,
    weeklyBoard: s.weeklyBoard !== false,
    discord: { ...discordConfig(), connected: discord.ready },
    language: LANGS.includes(s.language) ? s.language : 'fr',
    region: systemRegion(), // country (currency, date / time format, country leaderboard)
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
    try { win.setTitleBarOverlay({ color: '#00000000', symbolColor: t.symbol, height: 52 }); } catch { /* ignore */ }
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
    covers.fill(library.games(), () => send('library:changed'))
      .finally(() => covers.fillDescriptions(library.games(), () => send('library:changed')));
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
  ipcMain.handle('shop:get', () => ({ ...shop.list(challenges.levelInfo().level), titles: titles.list() }));
  ipcMain.handle('titles:equip', (_e, key) => {
    titles.equip(key ? String(key) : null);
    if (online) online.updateIdentity();
    return { shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() }, profile: getProfile() };
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
  ipcMain.handle('shop:spin', () => {
    const prize = shop.spin();
    // XP lands when the wheel stops (no level-up toast while it is still turning)
    if (prize.kind === 'xp') setTimeout(payWheelXp, 5300);
    return { prize, shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() }, profile: getProfile() };
  });
  ipcMain.handle('shop:buy', (_e, id, apply) => {
    const t = shop.buy(String(id), challenges.levelInfo().level);
    if (apply) { store.data.settings.theme = t.id; applyTheme(t.id); store.save(); }
    return { shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() }, settings: getSettings() };
  });
  /* ---- Collectible cards (boosters bought with tokens) ---- */
  /** Called by the window when it opens (and now and then): pays today's login streak bonus once. */
  ipcMain.handle('shop:claimLogin', () => {
    const r = shop.claimLogin();
    return { result: r, shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() } };
  });
  ipcMain.handle('cards:get', () => cards.list());
  ipcMain.handle('cards:open', () => {
    const gift = cards.gifts > 0;
    const pulls = cards.open();
    return { pulls, gift, cards: cards.list(), shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() } };
  });
  /* ---- Mode TV / manette: full screen, the renderer draws the big interface ---- */
  ipcMain.handle('tv:set', (_e, on) => {
    tvMode = !!on;
    if (win && !win.isDestroyed()) {
      if (tvMode) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
      win.setFullScreen(tvMode);
    }
    return tvMode;
  });
  ipcMain.handle('cards:fuse', (_e, rarity) => {
    const pull = cards.fuse(String(rarity));
    return { pull, cards: cards.list() };
  });
  ipcMain.handle('shop:buyFrame', (_e, id, apply) => {
    const f = shop.buyFrame(String(id));
    const profile = apply ? setProfile({ frame: f.id }) : getProfile();
    return { shop: { ...shop.list(challenges.levelInfo().level), titles: titles.list() }, profile };
  });

  /** 3 showcased achievements: only unlocked ones, each at most once. */
  ipcMain.handle('profile:setShowcase', (_e, keys) => {
    const got = new Set(achievements.list().items.filter((it) => it.tier >= 1).map((it) => it.key));
    const seen = new Set();
    const showcase = Array.from({ length: SHOWCASE_SLOTS }, (_, i) => {
      const k = Array.isArray(keys) && typeof keys[i] === 'string' ? keys[i] : null;
      if (!k || !got.has(k) || seen.has(k)) return null;
      seen.add(k); return k;
    });
    return setProfile({ showcase });
  });

  ipcMain.handle('profile:setTop5', (_e, ids) => {
    const top5 = Array.from({ length: 5 }, (_, i) => (Array.isArray(ids) && typeof ids[i] === 'string' ? ids[i] : null));
    return setProfile({ top5 });
  });

  /** The custom picture's bytes, so the window can shrink it on a canvas. */
  ipcMain.handle('profile:avatarBytes', () => {
    const p = store.data.profile || {};
    if (!p.avatar || !fs.existsSync(p.avatar)) return null;
    if (fs.statSync(p.avatar).size > 25 * 1024 * 1024) return null;
    return { bytes: new Uint8Array(fs.readFileSync(p.avatar)), src: p.avatarV || 0 };
  });
  /** Small JPEG (128 px) of the custom picture, published online for friends. */
  ipcMain.handle('profile:setAvatarShare', (_e, dataUrl, src) => {
    const p = store.data.profile || {};
    if (!p.avatar) return false;
    const d = String(dataUrl || '');
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d) || d.length > 60000) throw new Error('Image invalide');
    p.avatarShare = { v: crypto.createHash('sha1').update(d).digest('hex').slice(0, 16), src: Number(src) || 0, data: d };
    store.data.profile = p;
    store.save();
    if (online) online.publishAvatar().catch(() => {});
    return true;
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
    if (patch && patch.notif && NOTIF_TYPES.includes(patch.notif.type) && typeof patch.notif.on === 'boolean') {
      // one notification type on / off (Paramètres → Notifications)
      if (patch.notif.type === 'friendGame') s.notifyFriends = patch.notif.on;
      else s.notifs = { ...(s.notifs || {}), [patch.notif.type]: patch.notif.on };
    }
    if (patch && typeof patch.gameMode === 'boolean') s.gameMode = patch.gameMode;
    if (patch && typeof patch.tvStart === 'boolean') s.tvStart = patch.tvStart;
    if (patch && typeof patch.tvPad === 'boolean') s.tvPad = patch.tvPad;
    if (patch && (Array.isArray(patch.homeLayout) || patch.homeLayout === null)) {
      // order + visibility of the home blocks: [{ id, hidden }]
      s.homeLayout = patch.homeLayout === null ? undefined : patch.homeLayout
        .filter((b) => b && typeof b.id === 'string' && /^[a-z]{2,12}$/.test(b.id)).slice(0, 20)
        .map((b) => ({ id: b.id, hidden: !!b.hidden }));
    }
    if (patch && DND_MODES.includes(patch.dnd)) s.dnd = patch.dnd;
    if (patch && typeof patch.dndGame === 'string') {
      // marks / unmarks one game as « partie classée »
      const l = new Set(s.dndGames || []);
      if (l.has(patch.dndGame)) l.delete(patch.dndGame); else l.add(patch.dndGame.slice(0, 200));
      s.dndGames = [...l].slice(0, 300);
    }
    if (patch && typeof patch.weeklyBoard === 'boolean') {
      s.weeklyBoard = patch.weeklyBoard;
      if (online && online.session) { online.lastWeekly = ''; online.publishWeekly().catch(() => {}); }
    }
    if (patch && LANGS.includes(patch.language)) { s.language = patch.language; if (tray) buildTrayMenu(); }
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
    const cg = cardGrant(g);
    const hasItem = !!(g && g.item);
    if (!hasXp && !hasLevel && !hasCoins && !hasAch && !cg.card && !cg.packs && !hasItem) throw new Error('Indique de l\'XP, un niveau, des Geek Coins, un succès, un article, des cartes ou des boosters');
    const itemRes = hasItem ? applyItemGrant(g.item, g.itemRemove) : null;
    if (cg.card) cards.giveCard(cg.card, cg.cardN, cg.variant);
    if (cg.packs) cards.addPacks(cg.packs);
    if (hasXp || hasLevel) {
      challenges.grant({
        xp: hasXp ? Math.max(-100000, Math.min(100000, xp)) : undefined,
        level: hasLevel ? Math.min(100, level) : undefined, // level 100 is the maximum
        title: hasLevel ? `Niveau fixé à ${Math.floor(level)} (admin)` : `${xp > 0 ? 'XP ajoutée' : 'XP retirée'} (admin)`,
      });
    }
    if (hasCoins) shop.add(Math.max(-1000000, Math.min(1000000, coins)), `${coins > 0 ? 'Geek Coins ajoutés' : 'Geek Coins retirés'} (admin)`);
    const ach = hasAch ? grantAchOrTitle(String(g.ach), g.tier) : null;
    return { ...afterGrant(), shop: shop.list(challenges.levelInfo().level), ach, cards: cards.list(), themeReset: !!(itemRes && itemRes.themeReset), settings: getSettings() };
  });
  ipcMain.handle('admin:shopCatalog', () => { requireAdmin(); return shop.catalog(); });
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
      ...((cg) => ({ ...cg, card: cg.card && cg.variant === 'skin' ? cg.card + 'skin' : cg.card }))(cardGrant(g)), // keeps the « avec skin » version
      item: g.item && shop.catalog().some((x) => x.id === g.item) ? g.item : undefined,
      itemRemove: g.item ? !!g.itemRemove : undefined,
    });
    return true;
  });

  /** Global leaderboard of the week (top 10 + my rank). null when offline. */
  /* ---- Discord account link: Linkgeek ranks become roles on the Discord server (discord-bot/) ---- */
  const needOnline = () => { if (!online || !online.session) throw new Error('Connecte-toi au mode en ligne pour lier ton compte Discord'); };
  ipcMain.handle('discordLink:status', () => (online && online.session ? online.discordLinkStatus() : { signedIn: false }));
  ipcMain.handle('discordLink:start', () => { needOnline(); return online.discordLinkStart(); });
  ipcMain.handle('discordLink:unlink', () => { needOnline(); return online.discordUnlink(); });

  // scope: 'world' (every player) or 'country' (players of my country only)
  ipcMain.handle('board:weekly', async (_e, scope) => {
    const wk = weekInfo();
    const country = systemRegion();
    const byCountry = scope === 'country';
    const base = { week: wk.week, start: wk.start, myHours: wk.hours, enabled: store.data.settings.weeklyBoard !== false, scope: byCountry ? 'country' : 'world', country };
    if (!online || !online.session) return { ...base, offline: true, rows: [] };
    await online.publishWeekly().catch(() => {});
    try {
      const r = await online.weeklyTop(wk.week, base.enabled ? wk.hours : 0, 10, byCountry ? country : null);
      return { ...base, ...r };
    } catch (e) {
      return { ...base, rows: [], error: /refus|denied|401|403/i.test(String(e && e.message)) ? 'rules' : 'network' };
    }
  });

  ipcMain.handle('admin:stats', async () => {
    requireAdmin();
    if (!online || !online.session) throw new Error('Connecte-toi au mode en ligne pour voir le tableau de bord');
    let snap;
    try { snap = await online.adminSnapshot(); } catch (e) {
      if (/401|403|permission/i.test(String(e && e.message))) throw new Error('Le serveur refuse la lecture : republie les règles Firebase (Admin → Copier les règles)');
      throw e;
    }
    return adminStats(snap);
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

  /* ---- Social: invites, duels, coéquipiers, contact, partage, parrainage (src/social.js) ---- */
  ipcMain.handle('social:get', () => social.state());
  ipcMain.handle('social:invite', (_e, fid, gameId) => {
    const g = findGame(gameId);
    if (!g) throw new Error('Jeu introuvable');
    return social.invite(String(fid), { name: g.name });
  });
  ipcMain.handle('social:answerInvite', async (_e, from, accept) => {
    const inv = social.invites.find((i) => i.from === from);
    await social.answerInvite(String(from));
    if (!accept || !inv) return { launched: false };
    // the same game in my library (matched by name, whatever the store)
    const g = library.games().find((x) => gameKey(x.name) === inv.game.key);
    if (!g) return { launched: false, missing: inv.game.name };
    await launchGame(g);
    return { launched: true, name: g.name };
  });
  ipcMain.handle('social:createDuel', (_e, o) => {
    const g = o && o.kind === 'game' ? findGame(o.gameId) : null;
    if (o && o.kind === 'game' && !g) throw new Error('Choisis un jeu');
    return social.createDuel({ fid: String(o.fid || ''), kind: o.kind, game: g ? { name: g.name } : null, stake: o.stake });
  });
  ipcMain.handle('social:answerDuel', (_e, id, accept) => social.answerDuel(String(id), !!accept));
  ipcMain.handle('social:cancelDuel', (_e, id) => social.cancelDuel(String(id)));
  ipcMain.handle('social:refresh', async () => { await Promise.all([social.pollDuels(), social.pollLfg(), social.pollInvites()]).catch(() => {}); return social.state(); });
  ipcMain.handle('social:setLfg', (_e, on, o) => social.setLfg(!!on, o || {}).then(() => social.state()));
  ipcMain.handle('social:askLfg', (_e, uid) => social.askLfg(String(uid)).then(() => social.state()));
  ipcMain.handle('social:feedback', (_e, msg) => social.sendFeedback(msg));
  ipcMain.handle('social:claimReferral', (_e, code) => social.claimReferral(code).then(() => social.state()));
  ipcMain.handle('share:info', () => ({ url: DOWNLOAD_URL, code: online && online.code, signedIn: !!(online && online.session), ...social.state().referral }));
  ipcMain.handle('share:copy', (_e, what) => {
    const code = online && online.code;
    const SHARE = {
      fr: [`Rejoins-moi sur Linkgeek, le launcher qui regroupe tous tes jeux 🎮\nTélécharge-le ici : ${DOWNLOAD_URL}`, `\nPuis entre mon code ami ${code} dans Amis : on reçoit chacun un booster gratuit !`],
      en: [`Join me on Linkgeek, the launcher that brings all your games together 🎮\nDownload it here: ${DOWNLOAD_URL}`, `\nThen enter my friend code ${code} in Friends: we both get a free booster!`],
      es: [`Únete a mí en Linkgeek, el launcher que reúne todos tus juegos 🎮\nDescárgalo aquí: ${DOWNLOAD_URL}`, `\nLuego introduce mi código de amigo ${code} en Amigos: ¡cada uno recibe un sobre gratis!`],
      de: [`Komm zu mir auf Linkgeek, den Launcher, der all deine Spiele vereint 🎮\nHier herunterladen: ${DOWNLOAD_URL}`, `\nGib dann meinen Freundescode ${code} unter Freunde ein: Wir bekommen beide einen kostenlosen Booster!`],
      ru: [`Присоединяйся ко мне в Linkgeek — лаунчере, который собирает все твои игры 🎮\nСкачать: ${DOWNLOAD_URL}`, `\nПотом введи мой код друга ${code} во вкладке «Друзья»: каждый из нас получит бесплатный бустер!`],
    }[uiLang()];
    const text = what === 'message' ? SHARE[0] + (code ? SHARE[1] : '') : DOWNLOAD_URL;
    clipboard.writeText(text);
    return true;
  });
  ipcMain.handle('share:open', () => shell.openExternal(DOWNLOAD_URL));
  /* ---- Messagerie entre amis (src/chat.js) ---- */
  ipcMain.handle('chat:get', () => chat.state());
  ipcMain.handle('chat:open', (_e, fid) => chat.open(String(fid || '')));
  ipcMain.handle('chat:close', () => { chat.close(); });
  ipcMain.handle('chat:send', (_e, fid, text) => chat.send(String(fid || ''), String(text || '')));
  ipcMain.handle('admin:feedback', () => { requireAdmin(); return social.listFeedback(); });
  ipcMain.handle('admin:feedbackDelete', (_e, id) => { requireAdmin(); return social.deleteFeedback(String(id)); });

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
    return setProfile({ avatar: undefined, avatarShare: undefined }); // friends see the Google picture again
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

  /**
   * Opens the uninstaller of a game, from the right place:
   * Steam → its own uninstall dialog; Epic → its library; Xbox / Microsoft Store / games added by
   * hand → Windows "Installed apps"; Battle.net, Ubisoft, EA, GOG → their uninstaller (registry).
   * Returns { how } so the window can say what happens next.
   */
  ipcMain.handle('game:uninstall', async (_e, id) => {
    const g = findGame(id);
    if (!g) throw new Error('Jeu introuvable');
    if (g.source === 'steam') { await shell.openExternal(`steam://uninstall/${g.id.split(':')[1]}`); return { how: 'steam' }; }
    if (g.source === 'epic') { await shell.openExternal('com.epicgames.launcher://library'); return { how: 'epic' }; }
    if (g.uninstall && typeof g.uninstall === 'string') {
      // the uninstaller registered by the game itself (it asks for confirmation on its own)
      spawn(g.uninstall, { shell: true, detached: true, stdio: 'ignore', windowsHide: false }).unref();
      return { how: 'program' };
    }
    await shell.openExternal('ms-settings:appsfeatures');
    return { how: 'windows' };
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
    return { sessions: store.data.sessions, disks: await diskInfo(games), records: getRecords() };
  });
  ipcMain.handle('stats:value', (_e, force) => libraryValue(!!force));
  /** Linkgeek Wrapped: save the shareable picture (PNG drawn by the window). */
  ipcMain.handle('stats:saveImage', async (_e, dataUrl, name) => {
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw new Error('Image invalide');
    const r = await dialog.showSaveDialog(win, {
      title: 'Enregistrer mon récap Linkgeek',
      defaultPath: path.join(app.getPath('pictures'), String(name || 'Linkgeek-recap').replace(/[^\w.-]+/g, '-') + '.png'),
      filters: [{ name: 'Image PNG', extensions: ['png'] }],
    });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, Buffer.from(m[1], 'base64'));
    return r.filePath;
  });
  ipcMain.handle('stats:copyImage', (_e, dataUrl) => {
    const img = nativeImage.createFromDataURL(String(dataUrl || ''));
    if (img.isEmpty()) throw new Error('Image invalide');
    clipboard.writeImage(img);
    return true;
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
  // first launch: the interface takes the language of Windows (never changed after that)
  if (!LANGS.includes(store.data.settings.language)) { store.data.settings.language = detectLanguage(); store.save(); }
  library = new Library(store, async (exe) => (await app.getFileIcon(exe, { size: 'large' })).toDataURL());
  covers = new Covers(store);
  library.covers = covers;
  tracker = new Tracker(store, () => library.games(), (running) => {
    send('games:running', running);
    send('library:changed');
    updateGameMode(running);
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
    getAvatar: () => {
      const p = store.data.profile || {};
      return p.avatar && p.avatarShare && p.avatarShare.data ? { v: p.avatarShare.v, data: p.avatarShare.data } : null;
    },
    loadAvatarCache: () => store.data.friendAvatars || {},
    saveAvatarCache: (c) => { store.data.friendAvatars = c; store.save(); },
    getWeekly:() => ({ ...weekInfo(), enabled: store.data.settings.weeklyBoard !== false, country: systemRegion() }),
    onWeeklyPublished: (w) => {
      const l = store.data.weeklyWeeks || (store.data.weeklyWeeks = []);
      if (!l.includes(w)) { l.push(w); if (l.length > 60) l.shift(); store.save(); }
    },
    getWeeklyWeeks: () => store.data.weeklyWeeks || [],
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
      try {
        const cg = cardGrant({ card: g.card, cardN: g.cardN, holo: g.holo, packs: g.packs });
        if (cg.card) cards.giveCard(cg.card, cg.cardN, cg.variant);
        if (cg.packs) cards.addPacks(cg.packs);
        if (cg.card || cg.packs) {
          const what = [];
          if (cg.packs) what.push(`${cg.packs > 0 ? '+' : ''}${cg.packs} booster${Math.abs(cg.packs) > 1 ? 's' : ''}`);
          if (cg.card) {
            const name = cg.card === 'all' ? 'toutes les cartes' : `« ${CARD_LIST.find((c) => c.id === cg.card).name} »`;
            what.push(`${cg.cardN > 0 ? '+' : ''}${cg.cardN} ${{ holo: 'holo ', skin: 'avec skin ', base: 'sans skin ' }[cg.variant] || ''}× ${name}`);
          }
          send('cards:gift', { what: what.join(' · '), by, packs: cg.packs || 0 });
        }
      } catch { /* unknown card */ }
      if (typeof g.item === 'string' && g.item) {
        try {
          const r = applyItemGrant(g.item, g.itemRemove === true);
          send('shop:item', { name: r.item.name, kind: r.item.kind, remove: g.itemRemove === true, by, themeReset: r.themeReset });
        } catch { /* unknown item (older Linkgeek) */ }
      }
      online.updateIdentity();
    },
    onUpdate: (snap) => {
      send('friends:changed', snap);
      if (chat) { clearTimeout(chatFriendsT); chatFriendsT = setTimeout(() => chat.changed(), 300); } // names / statuses in the Messages list
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
  // Invites, duels de la semaine, « Recherche un coéquipier », Contact, parrainage (src/social.js)
  social = new Social({
    online, store,
    weekInfo: () => weekInfo(),
    score: duelScore,
    version: () => app.getVersion(),
    coins: () => shop.data.coins,
    addCoins: (n, why) => { shop.add(n, why); send('shop:coins', { n, why }); },
    addPacks: (n) => { cards.addPacks(n); },
    onEvent: socialEvent,
    onChange: (st) => send('social:changed', st),
  });
  // Messagerie entre amis (src/chat.js)
  chat = new Chat({
    online, store,
    onEvent: chatEvent,
    onChange: (st) => send('chat:changed', st),
  });
  online.onStarted = () => { social.start(); chat.start(); };
  online.onStopped = () => { social.stop(); chat.stop(); };
  online.getExtraDeletePaths = () => [...social.deletePaths(), ...chat.deletePaths()];
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
  cards = new Cards(store, shop);
  shop.init(challenges.levelInfo().level); // tokens for the levels reached before the Boutique existed
  setTimeout(payWheelXp, 8000); // wheel XP not added because Linkgeek closed during the spin
  // a bought theme that is no longer owned (edited file): back to the default
  const th = store.data.settings.theme;
  if (th && !FREE_THEMES.includes(th) && !shop.owns(th)) store.data.settings.theme = 'classic';

  registerIpc();
  createWindow();
  createTray();

  updater = setupUpdater({
    send,
    notify: (version) => notify('update', {
      kicker: L('Mise à jour du launcher', 'Launcher update'), title: L(`Linkgeek ${version} est prêt`, `Linkgeek ${version} is ready`),
      body: L('Elle sera installée à la prochaine fermeture de Linkgeek.', 'It will be installed the next time Linkgeek closes.'), icon: '⬇️', accent: '34,211,238',
    }),
    beforeInstall: async () => {
      quitting = true;
      if (tracker) tracker.stop();
      if (store) store.flush();
      if (online && online.session && !offlineSent) { offlineSent = true; await online.goOffline(); }
    },
  });
  // Paramètres → Notifications → « Tester »: shows one on top of everything, even with Linkgeek in front
  ipcMain.handle('notify:test', () => {
    if (!notifier) notifier = new Notifier();
    notifier.show({ type: 'trophy', kicker: L('Trophée Or débloqué', 'Gold trophy unlocked'), title: L('Exemple de notification', 'Sample notification'), body: L('Elle s\'affiche ici, même par-dessus tes jeux.', 'It shows up here, even on top of your games.'), icon: '🏆', accent: TIER_ACCENT.gold, lang: uiLang() });
    return true;
  });
  ipcMain.handle('update:install', () => updater.install());
  ipcMain.handle('update:status', () => ({ version: app.getVersion(), ready: updater.ready || null, ...updater.status() }));
  ipcMain.handle('update:check', () => updater.check({ manual: true }));

  await library.scan();
  achievements.ready = true;
  challenges.ready = true;
  titles.ready = true;
  // wheel ready / boosters to open: once a day (at start, then right after midnight)
  setTimeout(checkDailyNotifs, 12000);
  setInterval(checkDailyNotifs, 60000);
  challenges.startClock();
  send('library:changed');
  tracker.start();
  updateDiscord();
  library.computeSizes(() => send('library:changed'));
  // artwork first (it finds the Steam page of non-Steam games), then genres of the games played
  covers.fill(library.games(), () => send('library:changed'))
    .finally(() => covers.fillDescriptions(library.games(), () => send('library:changed')))
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
  if (notifier) notifier.destroy();
  if (updater) updater.installOnQuit(); // a downloaded update is installed when Linkgeek closes
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

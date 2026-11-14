const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseVdf, get } = require('../vdf');

const STEAM_ID64_BASE = 76561197960265728n;
// Tools / runtimes that are not games
const EXCLUDED_IDS = new Set(['228980', '1070560', '1391110', '1628350', '1493710', '250820', '1826330']);
const EXCLUDED_NAME = /redistributable|steamvr|proton|steam linux runtime|steamworks/i;

function readText(p) {
  try { return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}

function findSteamPath() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8', windowsHide: true });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) {
      const p = path.normalize(m[1].trim());
      if (fs.existsSync(p)) return p;
    }
  } catch { /* ignore */ }
  for (const p of ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findImage(cacheDir, appid, fileName) {
  const base = path.join(cacheDir, appid);
  const direct = path.join(base, fileName);
  if (fs.existsSync(direct)) return direct;
  try {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const p = path.join(base, entry.name, fileName);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function localImg(p) {
  return p ? 'nexus-img://local/?p=' + encodeURIComponent(p) : null;
}

function readUsers(steamPath) {
  const txt = readText(path.join(steamPath, 'config', 'loginusers.vdf'));
  if (!txt) return { profile: null, accountIds: [] };
  const users = get(parseVdf(txt), 'users') || {};
  let profile = null;
  const accountIds = [];
  for (const [id64, u] of Object.entries(users)) {
    let accountId;
    try { accountId = (BigInt(id64) - STEAM_ID64_BASE).toString(); } catch { continue; }
    accountIds.push(accountId);
    const recent = get(u, 'MostRecent') === '1';
    if (!profile || recent) {
      const avatar = path.join(steamPath, 'config', 'avatarcache', id64 + '.png');
      profile = {
        name: get(u, 'PersonaName') || get(u, 'AccountName'),
        avatar: fs.existsSync(avatar) ? localImg(avatar) : null,
        accountId,
      };
    }
  }
  return { profile, accountIds };
}

function readPlaytimes(steamPath, accountIds) {
  // appid -> { minutes, lastPlayed }
  const result = {};
  let ids = accountIds;
  if (!ids.length) {
    try { ids = fs.readdirSync(path.join(steamPath, 'userdata')); } catch { ids = []; }
  }
  for (const id of ids) {
    const txt = readText(path.join(steamPath, 'userdata', id, 'config', 'localconfig.vdf'));
    if (!txt) continue;
    const apps = get(parseVdf(txt), 'UserLocalConfigStore', 'Software', 'Valve', 'Steam', 'apps') || {};
    for (const [appid, a] of Object.entries(apps)) {
      const minutes = parseInt(get(a, 'Playtime') || '0', 10);
      const last = parseInt(get(a, 'LastPlayed') || '0', 10);
      const prev = result[appid] || { minutes: 0, lastPlayed: 0 };
      result[appid] = { minutes: Math.max(prev.minutes, minutes), lastPlayed: Math.max(prev.lastPlayed, last) };
    }
  }
  return result;
}

function scanSteam() {
  const steamPath = findSteamPath();
  if (!steamPath) return { games: [], profile: null };

  const { profile, accountIds } = readUsers(steamPath);
  const playtimes = readPlaytimes(steamPath, accountIds);
  const cacheDir = path.join(steamPath, 'appcache', 'librarycache');

  const libs = new Set([steamPath]);
  const lfTxt = readText(path.join(steamPath, 'steamapps', 'libraryfolders.vdf'));
  if (lfTxt) {
    const lf = get(parseVdf(lfTxt), 'libraryfolders') || {};
    for (const v of Object.values(lf)) {
      const p = typeof v === 'object' ? get(v, 'path') : v;
      if (p && fs.existsSync(p)) libs.add(path.normalize(p));
    }
  }

  const games = [];
  const seen = new Set();
  for (const lib of libs) {
    const appsDir = path.join(lib, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(appsDir).filter((f) => /^appmanifest_\d+\.acf$/i.test(f)); } catch { continue; }
    for (const f of files) {
      const txt = readText(path.join(appsDir, f));
      if (!txt) continue;
      const st = get(parseVdf(txt), 'AppState');
      if (!st) continue;
      const appid = get(st, 'appid');
      const name = get(st, 'name') || 'App ' + appid;
      if (!appid || seen.has(appid) || EXCLUDED_IDS.has(appid) || EXCLUDED_NAME.test(name)) continue;
      seen.add(appid);

      const pt = playtimes[appid] || { minutes: 0, lastPlayed: 0 };
      const lastPlayed = Math.max(parseInt(get(st, 'LastPlayed') || '0', 10), pt.lastPlayed);
      const cdn = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}`;

      games.push({
        id: 'steam:' + appid,
        source: 'steam',
        sourceLabel: 'Steam',
        name,
        installDir: path.join(appsDir, 'common', get(st, 'installdir') || ''),
        sizeBytes: parseInt(get(st, 'SizeOnDisk') || '0', 10) || null,
        platformPlaytimeSec: pt.minutes * 60,
        lastPlayed: lastPlayed ? lastPlayed * 1000 : 0,
        cover: localImg(findImage(cacheDir, appid, 'library_600x900.jpg') || findImage(cacheDir, appid, 'library_capsule.jpg')) || `${cdn}/library_600x900.jpg`,
        hero: localImg(findImage(cacheDir, appid, 'library_hero.jpg')) || `${cdn}/library_hero.jpg`,
        logo: localImg(findImage(cacheDir, appid, 'logo.png')),
        header: localImg(findImage(cacheDir, appid, 'header.jpg') || findImage(cacheDir, appid, 'library_header.jpg')) || `${cdn}/header.jpg`,
        launch: { type: 'url', url: 'steam://rungameid/' + appid },
        storeUrl: 'https://store.steampowered.com/app/' + appid,
      });
    }
  }
  // Every Steam game the account owns or has played, installed or not
  // (used to avoid recommending a game the player already has)
  const owned = new Set(Object.keys(playtimes));
  try { for (const e of fs.readdirSync(cacheDir)) { const m = e.match(/^(\d+)/); if (m) owned.add(m[1]); } } catch { /* no cache */ }
  for (const g of games) owned.add(g.id.split(':')[1]);
  return { games, profile, ownedAppIds: [...owned] };
}

module.exports = { scanSteam };

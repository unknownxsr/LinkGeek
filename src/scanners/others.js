/**
 * Battle.net, Ubisoft Connect, EA app and GOG games, read from the Windows
 * registry (one PowerShell call). Covers are looked up later by name (covers.js).
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Battle.net uninstall "--uid=" â†’ product code used by "Battle.net.exe --exec=launch <code>"
const BNET_CODES = {
  prometheus: 'Pro', wow: 'WoW', wow_classic: 'WoWC', wow_classic_era: 'WoWC', diablo3: 'D3', fenris: 'Fen',
  osi: 'OSI', anbs: 'ANBS', s2: 'S2', s1: 'S1', heroes: 'Hero', hs_beta: 'WTCG', w3: 'W3', rtro: 'RTRO',
  wlby: 'WLBY', viper: 'VIPR', odin: 'ODIN', lazarus: 'LAZR', zeus: 'ZEUS', fore: 'FORE', auks: 'AUKS',
  gryphon: 'GRY', aqua: 'AQUA', spot: 'SPOT', l4dr: 'L4DR', scor: 'SCOR', d2: 'D2', d2r: 'OSI',
};
const NOT_GAMES = /(battle\.net|anti-?cheat|sentinel|ubisoft connect|ubisoft game launcher|ea app|origin|gog galaxy|redistributable|directx|vc\+\+|easyanticheat|punkbuster|touchup|uninstall)/i;

const PS = `
$ErrorActionPreference='SilentlyContinue'
$out = @{ uninstall=@(); gog=@(); ubi=@(); bnet=$null; ubiLauncher=$null; gogGalaxy=$null }
$keys = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
$out.uninstall = @(Get-ItemProperty $keys | Where-Object { $_.PSChildName -notmatch '^Steam App' -and $_.UninstallString -notmatch 'steam://' -and ($_.Publisher -match 'Blizzard|Ubisoft|Electronic Arts|^EA |GOG' -or $_.PSChildName -match '^Uplay Install') } |
  Select-Object PSChildName, DisplayName, Publisher, InstallLocation, DisplayIcon, UninstallString)
$out.gog = @(Get-ChildItem 'HKLM:\\SOFTWARE\\WOW6432Node\\GOG.com\\Games' | ForEach-Object { Get-ItemProperty $_.PSPath | Select-Object gameID, gameName, path, exe, launchCommand, workingDir })
$out.ubi = @(Get-ChildItem 'HKLM:\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs' | ForEach-Object { [pscustomobject]@{ id=$_.PSChildName; dir=(Get-ItemProperty $_.PSPath).InstallDir } })
$b = Get-ItemProperty 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net'
if ($b) { $out.bnet = $b.InstallLocation }
$g = Get-ItemProperty 'HKLM:\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths'
if ($g) { $out.gogGalaxy = $g.client }
$out | ConvertTo-Json -Depth 4 -Compress`;

function readRegistry() {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS], { windowsHide: true, maxBuffer: 1 << 24 }, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      try { resolve(JSON.parse(stdout)); } catch { resolve(null); }
    });
  });
}

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const cleanDir = (d) => (d ? String(d).replace(/^"|"$/g, '').replace(/[\\/]+$/, '') : null);
const exeFromIcon = (s) => {
  if (!s) return null;
  const p = String(s).replace(/^"|"$/g, '').replace(/,\s*-?\d+$/, '').replace(/^"|"$/g, '');
  return /\.exe$/i.test(p) && fs.existsSync(p) ? p : null;
};
const exists = (d) => { try { return !!d && fs.statSync(d).isDirectory(); } catch { return false; } };

function base(o) {
  return {
    sizeBytes: null, platformPlaytimeSec: 0, lastPlayed: 0, cover: null, hero: null, logo: null,
    needsCover: true, ...o,
  };
}

async function scanOthers() {
  const r = await readRegistry();
  if (!r) return [];
  const games = [];
  const seen = new Set();
  const push = (g) => {
    const key = (g.installDir || g.id).toLowerCase();
    if (seen.has(key) || !exists(g.installDir)) return;
    seen.add(key);
    games.push(base(g));
  };

  // ---- Battle.net ----
  const bnetExe = r.bnet && path.join(cleanDir(r.bnet), 'Battle.net.exe');
  for (const u of arr(r.uninstall)) {
    if (!/Blizzard/i.test(u.Publisher || '') || NOT_GAMES.test(u.DisplayName || '')) continue;
    const uid = ((u.UninstallString || '').match(/--uid=([\w.-]+)/) || [])[1];
    if (!uid || uid === 'battle.net') continue;
    const code = BNET_CODES[uid.toLowerCase()] || BNET_CODES[uid.toLowerCase().replace(/_.*$/, '')];
    const dir = cleanDir(u.InstallLocation);
    const exe = exeFromIcon(u.DisplayIcon);
    push({
      id: 'battlenet:' + uid, source: 'battlenet', sourceLabel: 'Battle.net', name: u.DisplayName, publisher: 'Blizzard Entertainment',
      installDir: dir, exePath: exe,
      launch: code && bnetExe && fs.existsSync(bnetExe) ? { type: 'exe', path: bnetExe, args: [`--exec=launch ${code}`] }
        : exe ? { type: 'exe', path: exe, args: [] } : null,
    });
  }

  // ---- Ubisoft Connect ----
  const ubiNames = {};
  for (const u of arr(r.uninstall)) {
    const m = (u.PSChildName || '').match(/^Uplay Install (\d+)/);
    if (m) ubiNames[m[1]] = u;
  }
  for (const u of arr(r.ubi)) {
    const meta = ubiNames[u.id] || {};
    const dir = cleanDir(u.dir);
    const name = meta.DisplayName || (dir ? path.basename(dir) : null);
    if (!name || NOT_GAMES.test(name)) continue;
    push({
      id: 'ubisoft:' + u.id, source: 'ubisoft', sourceLabel: 'Ubisoft Connect', name, publisher: 'Ubisoft',
      installDir: dir, exePath: exeFromIcon(meta.DisplayIcon),
      launch: { type: 'url', url: `uplay://launch/${u.id}/0` },
    });
  }

  // ---- GOG ----
  for (const g of arr(r.gog)) {
    if (!g.gameID || !g.path || NOT_GAMES.test(g.gameName || '')) continue;
    const exe = g.exe && fs.existsSync(g.exe) ? g.exe : null;
    const galaxy = r.gogGalaxy && path.join(cleanDir(r.gogGalaxy), 'GalaxyClient.exe');
    push({
      id: 'gog:' + g.gameID, source: 'gog', sourceLabel: 'GOG', name: g.gameName,
      installDir: cleanDir(g.path), exePath: exe,
      storeUrl: `https://www.gog.com/game/${encodeURIComponent(String(g.gameName).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''))}`,
      launch: galaxy && fs.existsSync(galaxy)
        ? { type: 'exe', path: galaxy, args: ['/command=runGame', `/gameId=${g.gameID}`, `/path=${cleanDir(g.path)}`] }
        : exe ? { type: 'exe', path: exe, args: [] } : null,
    });
  }

  // ---- EA app ----
  for (const u of arr(r.uninstall)) {
    if (!/Electronic Arts|^EA /i.test(u.Publisher || '') || NOT_GAMES.test(u.DisplayName || '')) continue;
    const dir = cleanDir(u.InstallLocation);
    const exe = exeFromIcon(u.DisplayIcon);
    if (!exe) continue;
    push({
      id: 'ea:' + String(u.PSChildName).replace(/[^\w.-]/g, ''), source: 'ea', sourceLabel: 'EA app', name: u.DisplayName,
      publisher: 'Electronic Arts', installDir: dir, exePath: exe, launch: { type: 'exe', path: exe, args: [] },
    });
  }

  return games.filter((g) => g.launch);
}

module.exports = { scanOthers };

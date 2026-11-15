/**
 * Microsoft games installed as Appx packages.
 *
 * 1. Xbox / Game Pass: packages with a MicrosoftGame.config (GDK games), read as before.
 * 2. Microsoft Store: older UWP packages without that file. Every other Store-signed
 *    package (no frameworks, no Windows/system apps) is looked up once in the Microsoft
 *    Store catalog by its PackageFamilyName; only products of kind "Game" are kept.
 *    The answer (game or not, + name/artwork) is cached in store.data.msStoreCatalog,
 *    so each app is looked up once; a network error is not cached (retried next scan).
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CATALOG_URL = 'https://displaycatalog.mp.microsoft.com/v7.0/products/lookup?alternateId=PackageFamilyName&value=%s&market=FR&languages=fr-FR';
const LOOKUP_TIMEOUT_MS = 8000;
const LOOKUP_PARALLEL = 6;
// Not games, never looked up: system apps, runtimes and Microsoft's own utilities
// (the catalog would answer "not a game" anyway: this only saves requests)
const SKIP_NAME = /^(Microsoft\.(Windows|VCLibs|NET|UI\.Xaml|Services\.Store|DesktopAppInstaller|StorePurchaseApp|Xbox|GamingApp|GamingServices|Edge|MicrosoftEdge|Office|OneDrive|Teams|Bing|Zune|LanguageExperiencePack|SecHealthUI|WindowsAppRuntime|WinAppRuntime)|Microsoft\.\w*Extensions?$|MicrosoftWindows\.|Windows\.)/i;

function localImg(p) {
  return p && fs.existsSync(p) ? 'nexus-img://local/?p=' + encodeURIComponent(p) : null;
}

function attr(xml, tag, name) {
  const re = new RegExp(`<${tag}\\b[^>]*?\\b${name}="([^"]*)"`, 's');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function text(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

function decodeXml(s) {
  return s && s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

const usable = (s) => (s && !s.startsWith('ms-resource') ? s : null);

/**
 * Appx manifests name images without their scale qualifier ("Assets\Logo.png" is shipped as
 * "Assets\Logo.scale-200.png"…). Returns the real file, the biggest variant when there are several.
 */
function resolveAsset(dir, rel) {
  if (!rel) return null;
  const full = path.join(dir, rel);
  if (fs.existsSync(full)) return full;
  const folder = path.dirname(full);
  const ext = path.extname(full).toLowerCase();
  const base = path.basename(full, path.extname(full)).toLowerCase();
  let files;
  try { files = fs.readdirSync(folder); } catch { return null; }
  const score = (f) => { const m = f.match(/(?:scale|targetsize)-(\d+)/i); return m ? Number(m[1]) : 0; };
  const hits = files
    .filter((f) => f.toLowerCase().startsWith(base + '.') && path.extname(f).toLowerCase() === ext && !/contrast-(black|white)|altform-lightunplated/i.test(f))
    .sort((a, b) => score(b) - score(a));
  return hits.length ? path.join(folder, hits[0]) : null;
}

/** Store-signed, non-framework packages; isGdk = has a MicrosoftGame.config. */
function listPackages() {
  const ps = `
$ErrorActionPreference='SilentlyContinue'
Get-AppxPackage | Where-Object { $_.InstallLocation -and -not $_.IsFramework -and -not $_.NonRemovable } | ForEach-Object {
  [pscustomobject]@{ Name = $_.Name; PackageFamilyName = $_.PackageFamilyName; InstallLocation = $_.InstallLocation; Store = ([string]$_.SignatureKind -eq 'Store'); IsGdk = (Test-Path (Join-Path $_.InstallLocation 'MicrosoftGame.config')) }
} | ConvertTo-Json -Compress`;
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, maxBuffer: 1 << 24 }, (err, stdout) => {
      if (err || !stdout.trim()) return resolve([]);
      try {
        const data = JSON.parse(stdout);
        resolve(Array.isArray(data) ? data : [data]);
      } catch { resolve([]); }
    });
  });
}

/* ---------- Xbox / Game Pass (MicrosoftGame.config) — unchanged ---------- */
function gdkGame(p) {
  const dir = p.InstallLocation;
  let xml;
  try { xml = fs.readFileSync(path.join(dir, 'MicrosoftGame.config'), 'utf8'); } catch { return null; }

  let name = decodeXml(attr(xml, 'ShellVisuals', 'DefaultDisplayName'));
  if (!name || name.startsWith('ms-resource')) name = p.Name.split('.').slice(1).join(' ') || p.Name;
  const publisher = decodeXml(attr(xml, 'ShellVisuals', 'PublisherDisplayName'));
  const description = decodeXml(attr(xml, 'ShellVisuals', 'Description'));
  const logo480 = attr(xml, 'ShellVisuals', 'Square480x480Logo');
  const logo150 = attr(xml, 'ShellVisuals', 'Square150x150Logo');
  const splash = attr(xml, 'ShellVisuals', 'SplashScreenImage');
  const bg = attr(xml, 'ShellVisuals', 'BackgroundColor');
  const exeId = attr(xml, 'Executable', 'Id') || 'Game';
  const exeName = attr(xml, 'Executable', 'Name');

  const square = localImg(logo480 && path.join(dir, logo480)) || localImg(logo150 && path.join(dir, logo150));
  return {
    id: 'xbox:' + p.PackageFamilyName,
    source: 'xbox',
    sourceLabel: 'Xbox / Game Pass',
    name,
    publisher,
    description: description && !description.startsWith('ms-resource') ? description : null,
    installDir: dir,
    exePath: exeName ? path.join(dir, exeName) : null,
    sizeBytes: null, // computed asynchronously
    platformPlaytimeSec: 0,
    lastPlayed: 0,
    cover: square,
    coverStyle: 'square',
    coverBg: bg && bg !== 'transparent' ? bg : null,
    hero: localImg(splash && path.join(dir, splash)),
    logo: null,
    launch: { type: 'shell', target: `shell:AppsFolder\\${p.PackageFamilyName}!${exeId}` },
  };
}

/* ---------- Microsoft Store catalog ---------- */
/** { game, title, publisher, poster, box, hero } or throws on a network / server error. */
async function lookupCatalog(pfn) {
  const res = await fetch(CATALOG_URL.replace('%s', encodeURIComponent(pfn)), {
    headers: { Accept: 'application/json', 'User-Agent': 'Linkgeek' },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (res.status === 404) return { game: false };
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const data = await res.json();
  const prod = data && Array.isArray(data.Products) ? data.Products[0] : null;
  if (!prod) return { game: false }; // not sold on the Store (side-loaded, system…)
  if (String(prod.ProductKind || '').toLowerCase() !== 'game') return { game: false };
  const loc = (prod.LocalizedProperties || [])[0] || {};
  const imgs = loc.Images || [];
  const img = (...purposes) => {
    for (const p of purposes) {
      const i = imgs.filter((x) => x.ImagePurpose === p && x.Uri).sort((a, b) => (b.Width || 0) - (a.Width || 0))[0];
      if (i) return i.Uri.startsWith('//') ? 'https:' + i.Uri : i.Uri;
    }
    return null;
  };
  return {
    game: true,
    title: loc.ProductTitle || null,
    publisher: loc.PublisherName || null,
    poster: img('Poster'),
    box: img('BoxArt', 'Tile'),
    hero: img('SuperHeroArt', 'TitledHeroArt', 'Hero'),
  };
}

/** Looks up the packages not in the cache yet (a few at a time). Errors are not cached. */
async function fillCatalogCache(store, pfns) {
  const cache = store.data.msStoreCatalog || (store.data.msStoreCatalog = {});
  const todo = pfns.filter((pfn) => !cache[pfn]);
  if (!todo.length) return cache;
  let changed = false;
  for (let i = 0; i < todo.length; i += LOOKUP_PARALLEL) {
    await Promise.all(todo.slice(i, i + LOOKUP_PARALLEL).map(async (pfn) => {
      try { cache[pfn] = { ...(await lookupCatalog(pfn)), at: Date.now() }; changed = true; } catch { /* offline: try again next scan */ }
    }));
  }
  if (changed) store.save();
  return cache;
}

/** A Microsoft Store (UWP) game, read from its AppxManifest.xml + catalog artwork. */
function storeGame(p, cat) {
  const dir = p.InstallLocation;
  let xml;
  try { xml = fs.readFileSync(path.join(dir, 'AppxManifest.xml'), 'utf8'); } catch { return null; }
  const props = (xml.match(/<Properties>([\s\S]*?)<\/Properties>/) || [])[1] || '';
  const appTag = (xml.match(/<Application\b[^>]*>/) || [])[0] || '';
  const appId = (appTag.match(/\bId="([^"]*)"/) || [])[1] || 'App';
  const exe = (appTag.match(/\bExecutable="([^"]*)"/) || [])[1] || null;
  const visual = (xml.match(/<(?:\w+:)?VisualElements\b[^>]*>/) || [])[0] || '';
  const vAttr = (n) => decodeXml((visual.match(new RegExp(`\\b${n}="([^"]*)"`)) || [])[1] || null);

  const name = usable(decodeXml(text(props, 'DisplayName'))) || usable(vAttr('DisplayName')) || cat.title
    || p.Name.split('.').slice(1).join(' ') || p.Name;
  const publisher = usable(decodeXml(text(props, 'PublisherDisplayName'))) || cat.publisher || null;
  const description = usable(vAttr('Description'));
  const logo = resolveAsset(dir, vAttr('Square310x310Logo')) || resolveAsset(dir, vAttr('Square150x150Logo')) || resolveAsset(dir, text(props, 'Logo'));
  const bg = vAttr('BackgroundColor');

  return {
    id: 'msstore:' + p.PackageFamilyName,
    source: 'msstore',
    sourceLabel: 'Microsoft Store',
    name,
    publisher,
    description,
    installDir: dir,
    exePath: exe ? path.join(dir, exe) : null,
    sizeBytes: null, // computed asynchronously
    platformPlaytimeSec: 0,
    lastPlayed: 0,
    // catalog poster (portrait) first, else the square box art / the package logo
    cover: cat.poster || cat.box || localImg(logo),
    coverStyle: cat.poster ? undefined : 'square',
    coverBg: !cat.poster && !cat.box && bg && bg !== 'transparent' ? bg : null,
    hero: cat.hero || null,
    logo: null,
    launch: { type: 'shell', target: `shell:AppsFolder\\${p.PackageFamilyName}!${appId}` },
  };
}

async function scanXbox(store) {
  const pkgs = await listPackages();
  const games = [];
  for (const p of pkgs.filter((x) => x.IsGdk)) {
    const g = gdkGame(p);
    if (g) games.push(g);
  }
  if (!store) return games;
  // Other Store apps: ask the catalog (once per app) whether they are games
  const candidates = pkgs.filter((x) => !x.IsGdk && x.Store && x.PackageFamilyName && !SKIP_NAME.test(x.Name));
  let cache = store.data.msStoreCatalog || {};
  try { cache = await fillCatalogCache(store, candidates.map((x) => x.PackageFamilyName)); } catch { /* keep what we have */ }
  for (const p of candidates) {
    const cat = cache[p.PackageFamilyName];
    if (!cat || !cat.game) continue;
    const g = storeGame(p, cat);
    if (g) games.push(g);
  }
  return games;
}

module.exports = { scanXbox, lookupCatalog, resolveAsset };

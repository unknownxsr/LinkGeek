const fs = require('fs');
const path = require('path');

const EPIC_DATA = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data';

function readCatalog() {
  // catcache.bin = base64-encoded JSON array of catalog items (with key art URLs)
  const map = {};
  try {
    const b64 = fs.readFileSync(path.join(EPIC_DATA, 'Catalog', 'catcache.bin'), 'utf8');
    const items = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8'));
    for (const it of items) if (it && it.id) map[it.id] = it;
  } catch { /* ignore */ }
  return map;
}

function pickImage(item, types, w, h) {
  if (!item || !Array.isArray(item.keyImages)) return null;
  for (const t of types) {
    const img = item.keyImages.find((k) => k.type === t);
    if (img && img.url) {
      const q = w ? `?w=${w}${h ? '&h=' + h : ''}&resize=1` : '';
      return encodeURI(img.url) + q;
    }
  }
  return null;
}

function scanEpic() {
  const dir = path.join(EPIC_DATA, 'Manifests');
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.item')); } catch { return []; }
  const catalog = readCatalog();
  const games = [];

  for (const f of files) {
    let m;
    try { m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '')); } catch { continue; }
    const cats = m.AppCategories || [];
    if (!cats.includes('games')) continue;
    if (m.MainGameAppName && m.MainGameAppName !== m.AppName) continue; // DLC
    if (m.bIsIncompleteInstall) continue;

    const item = catalog[m.CatalogItemId];
    const launchId = `${m.CatalogNamespace}%3A${m.CatalogItemId}%3A${m.AppName}`;
    games.push({
      id: 'epic:' + m.AppName,
      source: 'epic',
      sourceLabel: 'Epic Games',
      name: m.DisplayName || (item && item.title) || m.AppName,
      installDir: m.InstallLocation,
      exePath: m.LaunchExecutable ? path.join(m.InstallLocation, m.LaunchExecutable) : null,
      sizeBytes: m.InstallSize || null,
      platformPlaytimeSec: 0,
      lastPlayed: 0,
      cover: pickImage(item, ['DieselGameBoxTall', 'OfferImageTall', 'Thumbnail'], 600, 800),
      hero: pickImage(item, ['DieselGameBox', 'OfferImageWide', 'DieselStoreFrontWide'], 1920),
      logo: pickImage(item, ['DieselGameBoxLogo'], 600),
      launch: { type: 'url', url: `com.epicgames.launcher://apps/${launchId}?action=launch&silent=true` },
      publisher: item && item.developer,
      description: item && item.description !== item.title ? item.description : null,
    });
  }
  return games;
}

module.exports = { scanEpic };

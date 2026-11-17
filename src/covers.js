/**
 * Finds artwork for games whose launcher gives none (Battle.net, Ubisoft, EA,
 * GOG, games added by hand) by looking the name up in the Steam store search.
 * Only the game's name is sent. Results (including "not found") are cached.
 */
const CDN = 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps';
const RETRY_MS = 1000 * 60 * 60 * 24 * 7;

const norm = (s) => String(s || '').toLowerCase()
  .replace(/[®™©]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

function art(appid) {
  return {
    cover: `${CDN}/${appid}/library_600x900.jpg`,
    hero: `${CDN}/${appid}/library_hero.jpg`,
    header: `${CDN}/${appid}/header.jpg`,
  };
}

async function lookup(name) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=US`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('search ' + r.status);
  const j = await r.json();
  const items = (j && j.items) || [];
  const want = norm(name);
  const exact = items.find((i) => norm(i.name) === want);
  const close = exact || items.find((i) => norm(i.name).startsWith(want) || want.startsWith(norm(i.name)));
  return close ? close.id : null;
}

/** French short description of a Steam game (HTML stripped), or null. */
async function steamDescription(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=french&cc=FR&filters=basic`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('details ' + r.status);
  const j = await r.json();
  const d = j && j[appid] && j[appid].success && j[appid].data;
  const t = d && (d.short_description || '');
  if (!t) return null;
  return t.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

class Covers {
  constructor(store) { this.store = store; this.busy = false; }

  get cache() { return this.store.data.coverCache || (this.store.data.coverCache = {}); }

  /** Artwork for a game, if already known. */
  get(g) {
    const c = this.cache[g.id];
    return c && c.appid ? art(c.appid) : null;
  }

  /** Looks up missing artwork one game at a time; calls onFound when something new arrives. */
  async fill(games, onFound) {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const g of games) {
        if (!g.needsCover && g.source !== 'manual') continue;
        const c = this.cache[g.id];
        if (c && (c.appid || Date.now() - c.at < RETRY_MS)) continue;
        try {
          const appid = await lookup(g.name);
          this.cache[g.id] = { appid, at: Date.now() };
          this.store.save();
          if (appid && onFound) onFound();
        } catch { /* offline: try again next launch */ }
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally { this.busy = false; }
  }

  get descCache() { return this.store.data.descCache || (this.store.data.descCache = {}); }

  /** Clean description found for a game whose own one was damaged, if already known. */
  description(g) {
    const c = this.descCache[g.id];
    return c && c.text ? c.text : null;
  }

  /**
   * Games whose launcher description is damaged (descBroken, see scanners/epic.js): their
   * French description is taken from the Steam store, found by the game's name. Cached.
   */
  async fillDescriptions(games, onFound) {
    if (this.busyDesc) return;
    this.busyDesc = true;
    try {
      for (const g of games) {
        if (!g.descBroken) continue;
        const c = this.descCache[g.id];
        if (c && (c.text || Date.now() - c.at < RETRY_MS)) continue;
        try {
          const appid = await lookup(g.name);
          const text = appid ? await steamDescription(appid) : null;
          this.descCache[g.id] = { text, appid, at: Date.now() };
          this.store.save();
          if (text && onFound) onFound();
        } catch { /* offline: try again next launch */ }
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally { this.busyDesc = false; }
  }
}

module.exports = { Covers, lookupSteamAppId: lookup };

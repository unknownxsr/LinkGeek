/**
 * Game genres for the profile titles (shooter, survival, adventure/RPG).
 * Tags come from SteamSpy (public API, only the Steam app id is sent). Games
 * from other launchers are matched to their Steam page by name first.
 * Results are cached for 30 days; the player can also fix genres by hand.
 */
const { lookupSteamAppId } = require('./covers');

const TTL = 30 * 24 * 3600 * 1000;
const RETRY = 3 * 24 * 3600 * 1000;
const GENRES = {
  fps: { name: 'Tir', tags: ['FPS', 'Shooter', 'Third-Person Shooter', 'Looter Shooter', 'Hero Shooter', 'Arena Shooter', 'Tactical', 'Battle Royale', 'Extraction Shooter', 'Military'] },
  survival: { name: 'Survie', tags: ['Survival', 'Open World Survival Craft', 'Survival Horror'] },
  adventure: { name: 'Aventure / RPG', tags: ['Adventure', 'RPG', 'Action RPG', 'JRPG', 'Action-Adventure', 'CRPG', 'Party-Based RPG', 'Open World', 'Souls-like', 'Story Rich'] },
};
// Strong tags are enough on their own; weak ones must be among the top tags
const WEAK = new Set(['Tactical', 'Military', 'Open World', 'Story Rich']);

function classify(tags, extra = []) {
  const top = [...tags.slice(0, 8), ...extra];
  const out = [];
  for (const [k, g] of Object.entries(GENRES)) {
    if (g.tags.some((t) => (WEAK.has(t) ? top.slice(0, 5).includes(t) : top.includes(t)))) out.push(k);
  }
  return out;
}

class Genres {
  constructor(store) { this.store = store; this.busy = false; }

  get cache() { return this.store.data.genreCache || (this.store.data.genreCache = {}); }
  get overrides() { return this.store.data.genreOverrides || (this.store.data.genreOverrides = {}); }

  /** Genres of a game: the player's choice wins, otherwise the detected ones. */
  get(gameId) {
    const o = this.overrides[gameId];
    if (Array.isArray(o)) return o;
    const c = this.cache[gameId];
    return c && Array.isArray(c.genres) ? c.genres : [];
  }

  detected(gameId) { const c = this.cache[gameId]; return c ? c.genres || [] : null; }

  setOverride(gameId, genres) {
    if (genres === null) delete this.overrides[gameId];
    else this.overrides[gameId] = genres.filter((g) => GENRES[g]);
    this.store.save();
  }

  appIdFor(g) {
    if (g.source === 'steam') return g.id.split(':')[1];
    const c = this.store.data.coverCache && this.store.data.coverCache[g.id];
    return c && c.appid ? String(c.appid) : undefined;
  }

  /** Fetches missing genres one game at a time (SteamSpy asks for ≤ 1 request per second). */
  async fill(games, onChange) {
    if (this.busy) return;
    this.busy = true;
    let changed = false;
    try {
      for (const g of games) {
        const c = this.cache[g.id];
        if (c && Date.now() - c.at < (c.genres ? TTL : RETRY)) continue;
        try {
          let appid = this.appIdFor(g);
          if (!appid) {
            const found = await lookupSteamAppId(g.name);
            appid = found ? String(found) : undefined;
            await new Promise((r) => setTimeout(r, 400));
          }
          if (!appid) { this.cache[g.id] = { at: Date.now(), genres: null }; continue; }
          const r = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${encodeURIComponent(appid)}`, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) throw new Error('steamspy ' + r.status);
          const j = await r.json();
          const tags = j && j.tags && typeof j.tags === 'object' ? Object.keys(j.tags) : [];
          const genre = String((j && j.genre) || '').split(',').map((s) => s.trim());
          // SteamSpy genres complete the tags (RPG / Adventure)
          const extra = genre.filter((x) => x === 'RPG' || x === 'Adventure');
          this.cache[g.id] = { at: Date.now(), appid, genres: tags.length || extra.length ? classify(tags, extra) : null, tags: tags.slice(0, 8) };
          this.store.save();
          changed = true;
        } catch { /* offline or rate limited: next launch */ }
        await new Promise((r) => setTimeout(r, 1100));
      }
    } finally {
      this.busy = false;
      if (changed && onChange) onChange();
    }
  }
}

module.exports = { Genres, GENRES, classify };

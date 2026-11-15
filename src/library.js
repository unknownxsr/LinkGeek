const fs = require('fs');
const path = require('path');
const { scanSteam } = require('./scanners/steam');
const { scanEpic } = require('./scanners/epic');
const { scanXbox } = require('./scanners/xbox');
const { scanOthers } = require('./scanners/others');

const SIZE_TTL = 1000 * 60 * 60 * 24; // recompute folder sizes once a day

async function folderSize(dir) {
  let total = 0;
  const stack = [dir];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = await fs.promises.readdir(cur, { withFileTypes: true }); } catch { continue; }
    await Promise.all(entries.map(async (e) => {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) { stack.push(p); return; }
      // Files, but also links/reparse points (common in Xbox/WindowsApps installs)
      try {
        const st = await fs.promises.stat(p);
        if (st.isDirectory()) { if (!seen.has(p)) { seen.add(p); stack.push(p); } } else total += st.size;
      } catch { /* ignore */ }
    }));
  }
  return total;
}

class Library {
  constructor(store, getFileIcon) {
    this.store = store;
    this.getFileIcon = getFileIcon;
    this.raw = [];
    this.profile = null;
    this.sizing = false;
  }

  manualGames() {
    return this.store.data.manual.map((m) => ({
      id: m.id,
      source: 'manual',
      sourceLabel: 'Ajouté manuellement',
      name: m.name,
      installDir: m.installDir || path.dirname(m.exePath),
      exePath: m.exePath,
      sizeBytes: null,
      platformPlaytimeSec: 0,
      lastPlayed: 0,
      cover: m.cover || null,
      icon: m.icon || null,
      hero: null,
      launch: { type: 'exe', path: m.exePath, args: m.args || [] },
    }));
  }

  async scan() {
    const results = await Promise.allSettled([
      Promise.resolve().then(scanSteam),
      Promise.resolve().then(scanEpic),
      scanXbox(this.store),
      scanOthers(),
    ]);
    const [steam, epic, xbox, others] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    if (results.some((r) => r.status === 'rejected')) {
      results.filter((r) => r.status === 'rejected').forEach((r) => console.error(r.reason));
    }
    this.profile = steam && steam.profile;
    this.ownedSteam = new Set((steam && steam.ownedAppIds) || []);
    const main = [...((steam && steam.games) || []), ...(epic || []), ...(xbox || [])];
    // A game installed through Steam/Epic can also appear in the registry: keep one copy
    const dirs = new Set(main.map((g) => (g.installDir || '').toLowerCase().replace(/[\\/]+$/, '')).filter(Boolean));
    this.raw = [
      ...main,
      ...(others || []).filter((g) => !dirs.has((g.installDir || '').toLowerCase())),
      ...this.manualGames(),
    ];
    // Remember when each game first showed up (library sort "Ajouts récents")
    const seen = this.store.data.firstSeen || (this.store.data.firstSeen = {});
    let added = false;
    for (const g of this.raw) if (!seen[g.id]) { seen[g.id] = Date.now(); added = true; }
    if (added) this.store.save();

    // icons for manual games (exe icon)
    for (const m of this.store.data.manual) {
      if (!m.icon && m.exePath && this.getFileIcon) {
        try { m.icon = await this.getFileIcon(m.exePath); this.store.save(); } catch { /* ignore */ }
      }
    }
    return this.games();
  }

  /** Merges scanned data with locally tracked stats and preferences. */
  games() {
    const d = this.store.data;
    return this.raw.map((g) => this.withNews(this.merge(g, d)));
  }

  /** "Nouveau" badge: a Steam announcement came out since my last session. */
  withNews(g) {
    g.newsNew = this.news ? this.news.isNew(g) : false;
    return g;
  }

  merge(g, d) {
    {
      const t = d.tracked[g.id] || { seconds: 0, lastPlayed: 0 };
      const size = g.sizeBytes || (d.sizes[g.id] && d.sizes[g.id].bytes) || null;
      const ov = d.overrides[g.id] || {};
      const manual = g.source === 'manual' ? d.manual.find((m) => m.id === g.id) : null;
      const found = !g.cover && this.covers ? this.covers.get(g) : null;
      return {
        ...g,
        ...(found ? { hero: g.hero || found.hero, header: g.header || found.header } : {}),
        name: ov.name || g.name,
        cover: ov.cover || g.cover || (found && found.cover) || null,
        addedAt: (d.firstSeen && d.firstSeen[g.id]) || 0,
        // genres used by the profile titles (detected, or chosen by the player)
        genres: this.genres ? this.genres.get(g.id) : [],
        genresCustom: !!(d.genreOverrides && Array.isArray(d.genreOverrides[g.id])),
        collections: Object.entries(d.collections || {}).filter(([, c]) => c.ids && c.ids.includes(g.id)).map(([k]) => k),
        icon: (manual && manual.icon) || g.icon || null,
        sizeBytes: size,
        // Steam already counts its own playtime; elsewhere we use our own tracking
        playtimeSec: Math.max(g.platformPlaytimeSec || 0, t.seconds || 0),
        trackedSec: t.seconds || 0,
        lastPlayed: Math.max(g.lastPlayed || 0, t.lastPlayed || 0),
        favorite: d.favorites.includes(g.id),
        hidden: d.hidden.includes(g.id),
        sessions: d.sessions.filter((s) => s.gameId === g.id).length,
      };
    }
  }

  /** Computes sizes of games whose platform doesn't report them. */
  async computeSizes(onProgress) {
    if (this.sizing) return;
    this.sizing = true;
    try {
      const d = this.store.data;
      const todo = this.raw.filter((g) => !g.sizeBytes && g.installDir &&
        !(d.sizes[g.id] && Date.now() - d.sizes[g.id].at < SIZE_TTL));
      for (const g of todo) {
        const bytes = await folderSize(g.installDir);
        if (bytes > 0) {
          d.sizes[g.id] = { bytes, at: Date.now() };
          this.store.save();
          onProgress && onProgress();
        }
      }
    } finally {
      this.sizing = false;
    }
  }
}

module.exports = { Library };

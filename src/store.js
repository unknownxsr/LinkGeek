const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  manual: [],        // games added by hand: { id, name, exePath, installDir, args }
  tracked: {},       // gameId -> { seconds, lastPlayed }
  sessions: [],      // { gameId, start, end }
  favorites: [],
  hidden: [],
  sizes: {},         // gameId -> { bytes, at }
  overrides: {},     // gameId -> { name, cover }
  profile: {},       // { name, avatar (file path), top5: [gameId|null x5] }
  settings: { theme: 'classic', closeToTray: true, google: {} },
  account: null,     // Google account linked to the profile: { id, email, name, picture, linkedAt }
  collections: {     // id -> { name, ids: [gameId] }
    playing: { name: 'En cours', ids: [] },
    backlog: { name: 'À finir', ids: [] },
  },
  firstSeen: {},     // gameId -> first time the game was found
  coverCache: {},    // gameId -> { appid, at } (artwork found by name)
};

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'library.json');
    this.data = structuredClone(DEFAULTS);
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...this.data, ...raw, settings: { ...this.data.settings, ...(raw.settings || {}) } };
    } catch { /* first launch */ }
    this.timer = null;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }

  flush() {
    clearTimeout(this.timer);
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (e) { console.error('store save failed', e); }
  }

  toggle(listName, id) {
    const list = this.data[listName];
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1); else list.push(id);
    this.save();
    return idx < 0;
  }
}

module.exports = { Store };

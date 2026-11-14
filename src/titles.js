/**
 * Profile titles ("Maître du jeu", "Survivant"…), unlocked by goals and shown
 * under the player's name. Once unlocked, a title is kept forever.
 */
const TITLES = [
  { key: 'fps', name: 'Pro du FPS', icon: 'crosshair', goal: 15, desc: 'Jouer à 15 jeux de tir différents', metric: (c) => c.fps },
  { key: 'perfectionist', name: 'Perfectionniste', icon: 'medal', goal: 100, unit: '%', desc: 'Débloquer 100 % des succès', metric: (c) => c.achPct },
  { key: 'gamemaster', name: 'Maître du jeu', icon: 'crown', goal: 100, desc: 'Atteindre le niveau 100', metric: (c) => c.level },
  { key: 'survivor', name: 'Survivant', icon: 'tent', goal: 10, desc: 'Jouer à 10 jeux de survie (Raft, Palworld, No Man\'s Sky…)', metric: (c) => c.survival },
  { key: 'adventurer', name: 'Aventurier', icon: 'map', goal: 15, desc: 'Jouer à 15 jeux d\'aventure ou de RPG', metric: (c) => c.adventure },
];

class Titles {
  /**
   * @param {object} store
   * @param {() => object} getContext  { fps, survival, adventure, achPct, level }
   * @param {(list) => void} onUnlock
   */
  constructor(store, getContext, onUnlock) {
    this.store = store; this.getContext = getContext; this.onUnlock = onUnlock; this.timer = null;
  }

  get data() {
    const d = this.store.data;
    if (!d.titles || typeof d.titles !== 'object') d.titles = {};
    d.titles.unlocked = d.titles.unlocked || {}; // key -> date
    return d.titles;
  }

  check() {
    if (!this.ready) return [];
    let ctx;
    try { ctx = this.getContext(); } catch { return []; }
    const t = this.data;
    const fresh = [];
    for (const def of TITLES) {
      if (t.unlocked[def.key]) continue;
      if ((Number(def.metric(ctx)) || 0) >= def.goal) {
        t.unlocked[def.key] = Date.now();
        fresh.push({ key: def.key, name: def.name, desc: def.desc });
      }
    }
    if (fresh.length) { this.store.save(); this.onUnlock(fresh); }
    return fresh;
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { try { this.check(); } catch (e) { console.error('titles', e); } }, 2000);
  }

  /** Admin gift / removal. */
  grant(key, on) {
    const def = TITLES.find((x) => x.key === key);
    if (!def) throw new Error('Titre inconnu');
    const t = this.data;
    if (on && !t.unlocked[key]) { t.unlocked[key] = Date.now(); this.onUnlock([{ key, name: def.name, desc: def.desc, gift: true }]); }
    if (!on) { delete t.unlocked[key]; if (t.equipped === key) t.equipped = null; }
    this.store.save();
  }

  equip(key) {
    if (key && !this.data.unlocked[key]) throw new Error('Ce titre n\'est pas encore débloqué');
    this.data.equipped = key || null;
    this.store.save();
  }

  equipped() {
    const k = this.data.equipped;
    const def = k && this.data.unlocked[k] ? TITLES.find((x) => x.key === k) : null;
    return def ? { key: def.key, name: def.name } : null;
  }

  list() {
    let ctx = {};
    try { ctx = this.getContext(); } catch { /* not ready */ }
    const t = this.data;
    return TITLES.map((def) => ({
      key: def.key, name: def.name, desc: def.desc, icon: def.icon, goal: def.goal, unit: def.unit || null,
      value: Math.min(def.goal, Math.floor(Number(def.metric(ctx)) || 0)),
      unlockedAt: t.unlocked[def.key] || null,
      equipped: t.equipped === def.key,
    }));
  }
}

module.exports = { Titles, TITLES };

/**
 * Collectible cards — Series 1 « Les Gardiens du Pixel »: 20 original creatures,
 * one per game style (the genre is only thematic, it does not change the draws).
 *
 * - Boosters are only bought (Boutique tokens), BOOSTER_PRICE each, BOOSTER_SIZE cards,
 *   at most DAILY_LIMIT per day.
 * - Each card: rarity drawn first (Commune 70 / Rare 22 / Épique 7 / Légendaire 1 %),
 *   then a card of that rarity at random; 5 % chance to be holographic.
 * - Duplicates are simply counted (×2, ×3…).
 * - The admin can give/remove cards and offer boosters (store.data.cards.gifts): an offered
 *   booster is opened first, for free and outside the daily limit.
 * Stored in store.data.cards = { owned: { id: { n, holo, first } }, opened, log }.
 */
const crypto = require('crypto');

const SERIES = { id: 's1', name: 'Les Gardiens du Pixel', number: 1 };
const BOOSTER_PRICE = 150;
const BOOSTER_SIZE = 5;
const HOLO_PCT = 5;
const DAILY_LIMIT = 3; // boosters per day (resets at local midnight)
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const RARITIES = {
  common: { name: 'Commune', pct: 70, order: 0 },
  rare: { name: 'Rare', pct: 22, order: 1 },
  epic: { name: 'Épique', pct: 7, order: 2 },
  legendary: { name: 'Légendaire', pct: 1, order: 3 },
};

// num = collector number (#01 … #20); hue = body colour of the pixel creature
const CARDS = [
  ['viseur', 'Viseur', 'FPS', 'common', 2],
  ['turbo', 'Turbo', 'Course', 'common', 28],
  ['boussole', 'Boussole', 'Aventure', 'common', 140],
  ['brique', 'Brique', 'Construction', 'common', 16],
  ['lanterne', 'Lanterne', 'Horreur', 'common', 48],
  ['ballon', 'Ballon', 'Sport', 'common', 95],
  ['pioche', 'Pioche', 'Survie', 'common', 75],
  ['engrenage', 'Engrenage', 'Simulation', 'common', 180],
  ['de', 'Dé', 'Stratégie', 'common', 215],
  ['pixel', 'Pixel', 'Rétro', 'common', 320],
  ['sniper', 'Sniper d\'élite', 'FPS', 'rare', 355],
  ['pilote', 'Pilote fantôme', 'Course', 'rare', 195],
  ['batisseur', 'Bâtisseur céleste', 'Construction', 'rare', 40],
  ['chasseur', 'Chasseur nocturne', 'Horreur', 'rare', 265],
  ['tacticien', 'Tacticien', 'Stratégie', 'rare', 225],
  ['survivant', 'Survivant', 'Survie', 'rare', 110],
  ['speedrunner', 'Le Speedrunner', 'Plateforme', 'epic', 300],
  ['gardienne', 'La Gardienne du Lag', 'Multijoueur', 'epic', 170],
  ['boss', 'Le Boss Final', 'Action', 'epic', 340],
  ['grand', 'Le Grand Linkgeek', 'Tous les jeux', 'legendary', 45],
].map(([id, name, genre, rarity, hue], i) => ({ id, num: i + 1, name, genre, rarity, hue }));

class Cards {
  constructor(store, shop) { this.store = store; this.shop = shop; }

  get data() {
    const d = this.store.data;
    if (!d.cards || typeof d.cards !== 'object') d.cards = {};
    const c = d.cards;
    c.owned = c.owned && typeof c.owned === 'object' ? c.owned : {};
    c.opened = Number(c.opened) || 0;
    return c;
  }

  /** One card: rarity by its odds, then a card of that rarity; holo 5 %. */
  draw() {
    let r = crypto.randomInt(100);
    let rarity = 'common';
    for (const [k, v] of Object.entries(RARITIES)) { if (r < v.pct) { rarity = k; break; } r -= v.pct; }
    const pool = CARDS.filter((c) => c.rarity === rarity);
    const card = pool[crypto.randomInt(pool.length)];
    return { id: card.id, holo: crypto.randomInt(100) < HOLO_PCT };
  }

  /** Boosters opened today (a clock set back keeps the count, like the wheel). */
  today(now = Date.now()) {
    const d = this.data.daily || {};
    if (d.day === dayKey(now) || d.at > now) return Number(d.n) || 0;
    return 0;
  }

  /** Boosters offered by the admin, not opened yet. */
  get gifts() { return Math.max(0, Math.floor(Number(this.data.gifts) || 0)); }

  /** Admin: offers (or takes back, n < 0) unopened boosters. Returns the new count. */
  addPacks(n) {
    n = Math.trunc(Number(n));
    if (!Number.isFinite(n) || n === 0) throw new Error('Indique un nombre de boosters');
    const c = this.data;
    c.gifts = Math.max(0, Math.min(999, this.gifts + Math.max(-999, Math.min(999, n))));
    this.store.save();
    return c.gifts;
  }

  /**
   * Admin: gives (n > 0) or removes (n < 0) copies of one card, or of every card with id "all".
   * holo: the copies given are holographic / the copies removed are taken from the holo ones first.
   */
  giveCard(id, n, holo = false) {
    n = Math.trunc(Number(n));
    if (!Number.isFinite(n) || n === 0) throw new Error('Indique un nombre de cartes');
    n = Math.max(-999, Math.min(999, n));
    const ids = id === 'all' ? CARDS.map((x) => x.id) : [id];
    if (!ids.every((x) => CARDS.some((k) => k.id === x))) throw new Error('Carte inconnue');
    const c = this.data;
    const now = Date.now();
    for (const cid of ids) {
      const o = c.owned[cid] || { n: 0, holo: 0, first: now };
      if (n > 0) { o.n += n; if (holo) o.holo += n; }
      else {
        o.n = Math.max(0, o.n + n);
        if (holo) o.holo = Math.max(0, o.holo + n);
        o.holo = Math.min(o.holo, o.n);
      }
      if (o.n > 0) c.owned[cid] = o; else delete c.owned[cid];
    }
    this.store.save();
    return ids.length;
  }

  /** Opens a booster: an offered one first (free, outside the daily limit), otherwise buys it. */
  open() {
    const now = Date.now();
    const c0 = this.data;
    const gift = this.gifts > 0;
    const done = this.today(now);
    if (gift) c0.gifts = this.gifts - 1;
    else {
      if (done >= DAILY_LIMIT) throw new Error(`Tu as déjà ouvert ${DAILY_LIMIT} boosters aujourd'hui. Reviens demain !`);
      const s = this.shop.data;
      if (s.coins < BOOSTER_PRICE) throw new Error(`Il te manque ${BOOSTER_PRICE - s.coins} jetons pour un booster`);
      this.shop.add(-BOOSTER_PRICE, `Achat : booster « ${SERIES.name} »`);
    }
    const c = this.data;
    if (!gift) c.daily = { day: dayKey(now), n: done + 1, at: now };
    const pulls = [];
    for (let i = 0; i < BOOSTER_SIZE; i++) {
      const p = this.draw();
      const o = c.owned[p.id] || { n: 0, holo: 0, first: now };
      const isNew = o.n === 0;
      const newHolo = p.holo && !o.holo;
      o.n += 1;
      if (p.holo) o.holo += 1;
      c.owned[p.id] = o;
      pulls.push({ ...p, isNew, newHolo });
    }
    c.opened += 1;
    this.store.save();
    return pulls;
  }

  list() {
    const c = this.data;
    const cards = CARDS.map((card) => {
      const o = c.owned[card.id];
      return { ...card, n: o ? o.n : 0, holo: o ? o.holo : 0, first: o ? o.first : null };
    });
    const got = cards.filter((x) => x.n > 0);
    const next = new Date(); next.setHours(24, 0, 0, 0);
    const today = this.today();
    return {
      gifts: this.gifts,
      dailyLimit: DAILY_LIMIT,
      openedToday: today,
      leftToday: Math.max(0, DAILY_LIMIT - today),
      nextDayAt: next.getTime(),
      series: SERIES,
      cards,
      rarities: RARITIES,
      price: BOOSTER_PRICE,
      size: BOOSTER_SIZE,
      holoPct: HOLO_PCT,
      owned: got.length,
      total: CARDS.length,
      holos: cards.filter((x) => x.holo > 0).length,
      totalCards: got.reduce((a, x) => a + x.n, 0),
      opened: c.opened,
      coins: this.shop.data.coins,
    };
  }
}

module.exports = { Cards, CARDS, CARD_RARITIES: RARITIES, BOOSTER_PRICE };

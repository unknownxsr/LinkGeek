/**
 * Collectible cards — Series 2 « Arsenal Pixel »: 10 pixel weapons, each in 2 skins
 * (a rare one and an even rarer one). The sniper is the rarest weapon of the set.
 * Series 1 (« Les Gardiens du Pixel », creatures) is converted once: every old copy
 * becomes a card of the same rarity (see migrate()).
 *
 * - Boosters are only bought (Boutique Geek Coins), BOOSTER_PRICE each, BOOSTER_SIZE cards,
 *   at most DAILY_LIMIT per day.
 * - Each card: rarity drawn first (Commune 68 / Rare 22 / Épique 7 / Légendaire 2,5 /
 *   Mythique 0,5 %), then a card of that rarity at random.
 * - Every card exists in 3 versions: sans skin (plain weapon), avec skin, holo (with its skin).
 *   Whatever the card, SKIN_PCT % chance to get it with its skin, and 1 skin in 4 is holo:
 *   sans skin 90 % · avec skin 7,5 % · holo 2,5 %.
 * - Carte du jour (dailyCard()): one epic / legendary / mythic card a day (80 / 17 / 3 %), the same
 *   for every player, with an extra chance per card drawn: +5 % epic, +2,5 % legendary, +1,5 % mythic.
 * - Duplicates are counted (×2, ×3…), per version, and can be fused (fuse()): 15 common doubles
 *   → 1 random rare, 20 rare doubles → 1 random epic. Nothing for legendary or mythic.
 * - The admin can give/remove cards and offer boosters (store.data.cards.gifts): an offered
 *   booster is opened first, for free and outside the daily limit.
 * Stored in store.data.cards = { owned: { id: { n, skin, holo, first } }, opened, log }:
 * n = all copies, skin = skinned non-holo copies, holo = holo copies, sans skin = n − skin − holo.
 * Admin grants / shared best cards name a version with the id: "<id>" = sans skin,
 * "<id>skin" = avec skin, "<id>" + holo flag = holo (ids stay a-z only for the Firebase rules).
 */
const crypto = require('crypto');

// shown as « Série 1 » (the id stays 's2': it marks collections already converted from the creatures)
const SERIES = { id: 's2', name: 'Arsenal Pixel', number: 1 };
const BOOSTER_PRICE = 150;
const BOOSTER_SIZE = 5;
const SKIN_PCT = 10; // chance to get the skin, whatever the card
const HOLO_PCT = 2.5; // part of the skinned cards that are holo (1 in 4)
const VARIANTS = ['base', 'skin', 'holo'];
const DAILY_LIMIT = 3; // boosters per day (resets at local midnight)
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// pct = chance per card (the draw works in per-mille, so 0.5 % is possible)
const RARITIES = {
  common: { name: 'Commune', pct: 68, order: 0 },
  rare: { name: 'Rare', pct: 22, order: 1 },
  epic: { name: 'Épique', pct: 7, order: 2 },
  legendary: { name: 'Légendaire', pct: 2.5, order: 3 },
  mythic: { name: 'Mythique', pct: 0.5, order: 4 },
};

/**
 * Carte du jour: each day one epic, legendary or mythic card gets a better drop rate.
 * Its rarity is drawn with ODDS (epic 80 / legendary 17 / mythic 3 %), then a card of that rarity.
 * The pick comes from a hash of the date, so every player has the same card the same day.
 * BOOST = extra chance, for each card drawn in a booster, to get the card of the day.
 */
const DAILY_CARD = {
  odds: { epic: 80, legendary: 17, mythic: 3 },
  boost: { epic: 5, legendary: 2.5, mythic: 1.5 },
};

// fusion of the doubles: 15 commons → 1 rare, 20 rares → 1 epic (nothing above)
const FUSIONS = {
  common: { cost: 15, to: 'rare' },
  rare: { cost: 20, to: 'epic' },
};

const WEAPONS = {
  pistolet: 'Pistolet', revolver: 'Revolver', smg: 'Mitraillette', pompe: 'Fusil à pompe', assaut: 'Fusil d\'assaut',
  katana: 'Katana', hache: 'Hache', arbalete: 'Arbalète', roquette: 'Bazooka', sniper: 'Sniper',
};
// [id (a-z only: shared with friends / admin grants), weapon, skin, rarity, hue (card glow)]
// num = collector number (#01 … #20): the 2 skins of a weapon follow each other
const CARDS = [
  ['pistacier', 'pistolet', 'Acier bleu', 'common', 215],
  ['pistdragon', 'pistolet', 'Dragon d\'or', 'rare', 42],
  ['revbois', 'revolver', 'Bois verni', 'common', 28],
  ['revcuivre', 'revolver', 'Cuivre gravé', 'rare', 20],
  ['smgurbain', 'smg', 'Urbain', 'common', 220],
  ['smgtoxique', 'smg', 'Toxique', 'rare', 100],
  ['pompecamo', 'pompe', 'Camo forêt', 'common', 90],
  ['pompelave', 'pompe', 'Lave', 'epic', 14],
  ['fusildesert', 'assaut', 'Désert', 'common', 38],
  ['fusiltigre', 'assaut', 'Tigre', 'epic', 28],
  ['katanasakura', 'katana', 'Sakura', 'common', 330],
  ['katanafoudre', 'katana', 'Foudre', 'epic', 200],
  ['hacheviking', 'hache', 'Viking', 'common', 25],
  ['hachegivre', 'hache', 'Givre', 'rare', 195],
  ['arbachasseur', 'arbalete', 'Chasseur', 'common', 80],
  ['arbaneon', 'arbalete', 'Néon', 'rare', 300],
  ['roquettekaki', 'roquette', 'Kaki', 'rare', 70],
  ['roquetteretro', 'roquette', 'Rétro arcade', 'epic', 0],
  ['sniperarctique', 'sniper', 'Arctique', 'legendary', 200],
  ['snipergalaxie', 'sniper', 'Galaxie', 'mythic', 280],
].map(([id, weapon, skin, rarity, hue], i) => ({ id, num: i + 1, weapon, skin, name: `${WEAPONS[weapon]} ${skin}`, genre: WEAPONS[weapon], rarity, hue }));

// Series 1 card ids by rarity (for the one-time conversion of an old collection)
const OLD_S1 = {
  common: ['viseur', 'turbo', 'boussole', 'brique', 'lanterne', 'ballon', 'pioche', 'engrenage', 'de', 'pixel'],
  rare: ['sniper', 'pilote', 'batisseur', 'chasseur', 'tacticien', 'survivant'],
  epic: ['speedrunner', 'gardienne', 'boss'],
  legendary: ['grand'],
};

class Cards {
  constructor(store, shop) { this.store = store; this.shop = shop; }

  get data() {
    const d = this.store.data;
    if (!d.cards || typeof d.cards !== 'object') d.cards = {};
    const c = d.cards;
    c.owned = c.owned && typeof c.owned === 'object' ? c.owned : {};
    c.opened = Number(c.opened) || 0;
    if (c.series !== SERIES.id) this.migrate(c);
    if (c.variants !== 3) {
      // before the 3 versions every card showed its skin: normal copies become « avec skin »
      for (const o of Object.values(c.owned)) { o.holo = Math.min(o.n, Number(o.holo) || 0); o.skin = Math.max(0, o.n - o.holo); }
      c.variants = 3;
      this.store.save();
    }
    return c;
  }

  /**
   * Series 1 → 2, once: every copy of an old card becomes a copy of a new card of the same
   * rarity (holo copies stay holo, the earliest date is kept). Unknown ids are dropped.
   */
  migrate(c) {
    const out = {};
    for (const [rar, olds] of Object.entries(OLD_S1)) {
      const pool = CARDS.filter((x) => x.rarity === rar);
      olds.forEach((oid, i) => {
        const o = c.owned[oid];
        if (!o || !(o.n > 0)) return;
        const nid = pool[i % pool.length].id;
        const t = out[nid] || { n: 0, holo: 0, first: o.first || Date.now() };
        t.n += Number(o.n) || 0;
        t.holo = Math.min(t.n, t.holo + (Number(o.holo) || 0));
        t.first = Math.min(t.first, o.first || t.first);
        out[nid] = t;
      });
    }
    for (const [id, o] of Object.entries(c.owned)) if (CARDS.some((x) => x.id === id) && !out[id]) out[id] = o; // already a new card
    c.owned = out;
    c.series = SERIES.id;
    this.store.save();
  }

  /** The card of the day (same for everyone on a given date): { card, boost, day }. */
  dailyCard(now = Date.now()) {
    const day = dayKey(now);
    const h = crypto.createHash('sha256').update(`linkgeek-carte-du-jour:${day}`).digest();
    let r = h.readUInt32BE(0) % 1000;
    let rarity = 'epic';
    for (const [k, pct] of Object.entries(DAILY_CARD.odds)) { const w = Math.round(pct * 10); if (r < w) { rarity = k; break; } r -= w; }
    const pool = CARDS.filter((c) => c.rarity === rarity);
    return { card: pool[h.readUInt32BE(4) % pool.length], boost: DAILY_CARD.boost[rarity], day };
  }

  /**
   * One card: first the card of the day's extra chance (DAILY_CARD.boost %), otherwise rarity by
   * its odds, then a card of that rarity; then its version (skin 10 %, holo 2,5 %).
   */
  draw() {
    const daily = this.dailyCard();
    let card;
    if (crypto.randomInt(1000) < Math.round(daily.boost * 10)) card = daily.card;
    else {
      let r = crypto.randomInt(1000);
      let rarity = 'common';
      for (const [k, v] of Object.entries(RARITIES)) { const w = Math.round(v.pct * 10); if (r < w) { rarity = k; break; } r -= w; }
      const pool = CARDS.filter((c) => c.rarity === rarity);
      card = pool[crypto.randomInt(pool.length)];
    }
    const v = crypto.randomInt(1000);
    const holo = v < HOLO_PCT * 10;
    return { id: card.id, holo, skin: holo || v < SKIN_PCT * 10, daily: card.id === daily.card.id };
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
   * Admin: gives (n > 0) or removes (n < 0) copies of one card, or of every card with id "all",
   * in one version: 'base' (sans skin), 'skin' (avec skin) or 'holo'.
   * Removing takes only copies of that version (never more than there are).
   */
  giveCard(id, n, variant = 'base') {
    n = Math.trunc(Number(n));
    if (!Number.isFinite(n) || n === 0) throw new Error('Indique un nombre de cartes');
    if (variant === true) variant = 'holo'; // older callers: holo flag
    if (!VARIANTS.includes(variant)) variant = 'base';
    n = Math.max(-999, Math.min(999, n));
    const ids = id === 'all' ? CARDS.map((x) => x.id) : [id];
    if (!ids.every((x) => CARDS.some((k) => k.id === x))) throw new Error('Carte inconnue');
    const c = this.data;
    const now = Date.now();
    for (const cid of ids) {
      const o = c.owned[cid] || { n: 0, skin: 0, holo: 0, first: now };
      o.skin = o.skin || 0; o.holo = o.holo || 0;
      const have = { base: o.n - o.skin - o.holo, skin: o.skin, holo: o.holo };
      const d = n > 0 ? n : -Math.min(-n, have[variant]);
      o.n += d;
      if (variant === 'skin') o.skin += d;
      if (variant === 'holo') o.holo += d;
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
      if (s.coins < BOOSTER_PRICE) throw new Error(`Il te manque ${BOOSTER_PRICE - s.coins} Geek Coins pour un booster`);
      this.shop.add(-BOOSTER_PRICE, `Achat : booster « ${SERIES.name} »`);
    }
    const c = this.data;
    if (!gift) c.daily = { day: dayKey(now), n: done + 1, at: now };
    const pulls = [];
    for (let i = 0; i < BOOSTER_SIZE; i++) {
      const p = this.draw();
      const o = c.owned[p.id] || { n: 0, skin: 0, holo: 0, first: now };
      o.skin = o.skin || 0; o.holo = o.holo || 0;
      const isNew = o.n === 0;
      const newHolo = p.holo && !o.holo;
      const newSkin = p.skin && !p.holo && !o.skin;
      o.n += 1;
      if (p.holo) o.holo += 1; else if (p.skin) o.skin += 1;
      c.owned[p.id] = o;
      pulls.push({ ...p, isNew, newHolo, newSkin });
    }
    c.opened += 1;
    this.store.save();
    return pulls;
  }

  /**
   * Doubles of a rarity: every copy beyond the first one of each version (sans skin / avec skin /
   * holo), so a fusion never takes away a version from the collection.
   */
  doubles(rarity) {
    const c = this.data;
    let n = 0;
    for (const card of CARDS) {
      if (card.rarity !== rarity) continue;
      const o = c.owned[card.id];
      if (!o) continue;
      const skin = o.skin || 0, holo = o.holo || 0, base = Math.max(0, o.n - skin - holo);
      n += Math.max(0, base - 1) + Math.max(0, skin - 1) + Math.max(0, holo - 1);
    }
    return n;
  }

  /**
   * Fusion: FUSIONS[rarity].cost doubles of that rarity become 1 card of the next rarity
   * (random card, version drawn like a booster). Doubles are taken from the most plentiful card
   * first, sans skin before avec skin, holo last.
   */
  fuse(rarity) {
    const f = FUSIONS[rarity];
    if (!f) throw new Error('Cette rareté ne peut pas être fusionnée');
    const have = this.doubles(rarity);
    if (have < f.cost) throw new Error(`Il te faut ${f.cost} doubles ${RARITIES[rarity].name.toLowerCase()}s (tu en as ${have})`);
    const c = this.data;
    let left = f.cost;
    const spare = (o, v) => { const skin = o.skin || 0, holo = o.holo || 0; const n = v === 'holo' ? holo : v === 'skin' ? skin : o.n - skin - holo; return Math.max(0, n - 1); };
    for (const v of VARIANTS) {
      while (left > 0) {
        // the card with the most doubles of this version
        let best = null, bestN = 0;
        for (const card of CARDS) {
          if (card.rarity !== rarity || !c.owned[card.id]) continue;
          const s = spare(c.owned[card.id], v);
          if (s > bestN) { best = card.id; bestN = s; }
        }
        if (!best) break;
        const o = c.owned[best];
        const take = Math.min(left, bestN);
        o.n -= take;
        if (v === 'skin') o.skin -= take;
        if (v === 'holo') o.holo -= take;
        left -= take;
      }
    }
    // the new card
    const pool = CARDS.filter((x) => x.rarity === f.to);
    const card = pool[crypto.randomInt(pool.length)];
    const r = crypto.randomInt(1000);
    const holo = r < HOLO_PCT * 10, skin = holo || r < SKIN_PCT * 10;
    const now = Date.now();
    const o = c.owned[card.id] || { n: 0, skin: 0, holo: 0, first: now };
    o.skin = o.skin || 0; o.holo = o.holo || 0;
    const pull = { id: card.id, holo, skin, isNew: o.n === 0, newHolo: holo && !o.holo, newSkin: skin && !holo && !o.skin };
    o.n += 1;
    if (holo) o.holo += 1; else if (skin) o.skin += 1;
    c.owned[card.id] = o;
    c.fused = (Number(c.fused) || 0) + 1;
    this.store.save();
    return pull;
  }

  list() {
    const c = this.data;
    const cards = CARDS.map((card) => {
      const o = c.owned[card.id];
      const n = o ? o.n : 0, holo = o ? o.holo || 0 : 0, skin = o ? o.skin || 0 : 0;
      return { ...card, n, skinN: skin, holo, base: Math.max(0, n - skin - holo), first: o ? o.first : null };
    });
    const got = cards.filter((x) => x.n > 0);
    const next = new Date(); next.setHours(24, 0, 0, 0);
    const today = this.today();
    const dc = this.dailyCard();
    return {
      // carte du jour: its id, its extra chance per card drawn, when it changes, how it is picked
      dailyCard: { id: dc.card.id, rarity: dc.card.rarity, boost: dc.boost, endsAt: next.getTime(), odds: DAILY_CARD.odds, boosts: DAILY_CARD.boost },
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
      skinPct: SKIN_PCT,
      // how many cards I own in each version
      bases: cards.filter((x) => x.base > 0).length,
      skins: cards.filter((x) => x.skinN > 0).length,
      owned: got.length,
      total: CARDS.length,
      // 100 % = every card in its 3 versions (sans skin, avec skin, holo)
      versionsOwned: cards.reduce((a, x) => a + (x.base > 0) + (x.skinN > 0) + (x.holo > 0), 0),
      versionsTotal: CARDS.length * VARIANTS.length,
      holos: cards.filter((x) => x.holo > 0).length,
      totalCards: got.reduce((a, x) => a + x.n, 0),
      opened: c.opened,
      fused: Number(c.fused) || 0,
      // fusion of the doubles: { rarity: { cost, to, have } }
      fusions: Object.fromEntries(Object.entries(FUSIONS).map(([r, f]) => [r, { ...f, have: this.doubles(r) }])),
      coins: this.shop.data.coins,
    };
  }
}

module.exports = { Cards, CARDS, CARD_RARITIES: RARITIES, BOOSTER_PRICE, WEAPONS };

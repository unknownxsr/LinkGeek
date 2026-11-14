/**
 * Shop: themes bought with tokens ("jetons").
 * Tokens are earned by completing challenges (1 token per 8 XP) and by reaching
 * new levels (20 + 5 × level). XP gifts from the admin do not give tokens for
 * the challenge part. Everything is stored locally in store.data.shop.
 */
const THEMES = [
  // rarity: common (colours) < rare (colours + animated backdrop) < epic (full animated effect)
  { id: 'neon', rarity: 'common', name: 'Néon', desc: 'Rose électrique et cyan, ambiance arcade', price: 600,
    c: { bg: '#0b0612', side: '#120a1d', card: '#1d1230', text: '#fbeaff', muted: '#7b5f93', accent: 'linear-gradient(135deg,#ff2bd6,#00e5ff)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,43,214,.4), transparent)' }, symbol: '#ffd1f6' },
  { id: 'ocean', rarity: 'common', name: 'Océan', desc: 'Bleu profond et turquoise, calme et lisible', price: 600,
    c: { bg: '#04121c', side: '#071a27', card: '#0d2638', text: '#e6f6ff', muted: '#4f7a92', accent: 'linear-gradient(135deg,#1aa3ff,#2ee6c5)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(26,163,255,.35), transparent)' }, symbol: '#bfe6ff' },
  { id: 'forest', rarity: 'common', name: 'Forêt', desc: 'Verts sombres et lumière dorée', price: 750,
    c: { bg: '#07110b', side: '#0b1910', card: '#13251a', text: '#eafbef', muted: '#5d8068', accent: 'linear-gradient(135deg,#3ddc84,#d4e157)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(61,220,132,.3), transparent)' }, symbol: '#c8f5d6' },
  { id: 'ember', rarity: 'common', name: 'Braise', desc: 'Rouge volcanique et orange incandescent', price: 900,
    c: { bg: '#120706', side: '#1a0b09', card: '#2a1210', text: '#fff0ea', muted: '#8f5f55', accent: 'linear-gradient(135deg,#ff4d2e,#ffb02e)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,77,46,.38), transparent)' }, symbol: '#ffd2c4' },
  { id: 'sakura', rarity: 'rare', name: 'Sakura', desc: 'Rose pastel sur nuit violette', price: 1050,
    c: { bg: '#130b12', side: '#1a0f19', card: '#2a1828', text: '#fff0f7', muted: '#93708a', accent: 'linear-gradient(135deg,#ff9ecf,#c39bff)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,158,207,.33), transparent)' }, symbol: '#ffd6ea' },
  { id: 'synthwave', rarity: 'rare', name: 'Synthwave', desc: 'Coucher de soleil rétro des années 80', price: 1350,
    c: { bg: '#10061f', side: '#170a2b', card: '#26103f', text: '#fff1e6', muted: '#8a6aa8', accent: 'linear-gradient(135deg,#ff6a3d,#ff2e88 50%,#8a2eff)', glow: 'radial-gradient(140px 70px at 90% 0%, rgba(255,106,61,.4), transparent)' }, symbol: '#ffc9a8' },
  { id: 'royal', rarity: 'rare', name: 'Or royal', desc: 'Noir laqué et feuille d\'or', price: 1800,
    c: { bg: '#080706', side: '#0f0d0a', card: '#1c1812', text: '#fbf3df', muted: '#857a5f', accent: 'linear-gradient(135deg,#f7d774,#c8962a)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(247,215,116,.28), transparent)' }, symbol: '#f7e3a8' },
  { id: 'matrix', rarity: 'epic', name: 'Matrix', desc: 'Pluie de code vert phosphore sur noir total', price: 2250,
    c: { bg: '#000000', side: '#030a05', card: '#08160c', text: '#c9ffd9', muted: '#3f8a57', accent: 'linear-gradient(135deg,#00ff66,#00b84a)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(0,255,102,.25), transparent)' }, symbol: '#7dffad' },
  { id: 'aurora', rarity: 'rare', name: 'Aurore boréale', desc: 'Voiles verts et violets qui ondulent dans la nuit polaire', price: 1500,
    c: { bg: '#040a12', side: '#07101b', card: '#0d1a29', text: '#e6fbff', muted: '#5f8aa0', accent: 'linear-gradient(135deg,#3dffb5,#7a5cff)', glow: 'radial-gradient(160px 70px at 70% 0%, rgba(61,255,181,.35), transparent), radial-gradient(120px 60px at 95% 10%, rgba(122,92,255,.35), transparent)' }, symbol: '#b6ffe6' },
  { id: 'cyber', rarity: 'epic', name: 'Cyberpunk', desc: 'Jaune néon, cyan, scanlines et glitch d\'une ville de 2099', price: 2700,
    c: { bg: '#07070c', side: '#0e0d14', card: '#17151f', text: '#fdf8c8', muted: '#7d7890', accent: 'linear-gradient(135deg,#fcee0a,#00f0ff)', glow: 'radial-gradient(140px 60px at 90% 0%, rgba(252,238,10,.3), transparent)' }, symbol: '#fcee0a' },
  { id: 'galaxy', rarity: 'epic', name: 'Galaxie', desc: 'Nébuleuse violette et champ d\'étoiles filantes en mouvement', price: 3000,
    c: { bg: '#04020b', side: '#090616', card: '#130f27', text: '#efeaff', muted: '#7d72aa', accent: 'linear-gradient(135deg,#a855f7,#ec4899 55%,#38bdf8)', glow: 'radial-gradient(150px 80px at 80% 10%, rgba(168,85,247,.45), transparent), radial-gradient(100px 60px at 20% 100%, rgba(56,189,248,.25), transparent)' }, symbol: '#e9d5ff' },
  { id: 'holo', rarity: 'epic', name: 'Holographique', desc: 'Reflets irisés qui changent de couleur en permanence', price: 3750,
    c: { bg: '#0a0a12', side: '#10101b', card: '#1a1a2b', text: '#f6f5ff', muted: '#8d8bb0', accent: 'linear-gradient(135deg,#ff7ad9,#7af0ff 35%,#b7ff7a 65%,#ffd27a)', glow: 'radial-gradient(150px 70px at 85% 0%, rgba(122,240,255,.35), transparent), radial-gradient(110px 60px at 15% 100%, rgba(255,122,217,.3), transparent)' }, symbol: '#ffffff' },
];
// minLevel: profile level needed to BUY a theme of that rarity (a wheel win ignores it: pure luck)
const RARITIES = { common: { name: 'Commun', order: 0, minLevel: 1 }, rare: { name: 'Rare', order: 1, minLevel: 15 }, epic: { name: 'Épique', order: 2, minLevel: 40 } };
const THEME_ODDS = { common: 70, rare: 25, epic: 5 }; // wheel "random theme" prize

/**
 * Daily wheel: one free spin per day (local midnight). Weights are percentages,
 * from the most likely prize to the rarest. A theme won when every theme is
 * already owned is paid as THEME_DUPLICATE tokens instead.
 */
const WHEEL = [
  // keys kept from the first economy (they style the slices); amounts lowered in 1.8.1
  { key: 'c10', kind: 'coins', n: 5, w: 35 },
  { key: 'x15', kind: 'xp', n: 15, w: 25 },
  { key: 'c25', kind: 'coins', n: 10, w: 18 },
  { key: 'x35', kind: 'xp', n: 35, w: 12 },
  { key: 'c50', kind: 'coins', n: 25, w: 8 },
  { key: 'theme', kind: 'theme', n: 1, w: 2 },
];
const THEME_DUPLICATE = 150;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const XP_PER_TOKEN = 8;
const tokensForXp = (xp) => Math.max(0, Math.round(xp / XP_PER_TOKEN));
const tokensForLevel = (lv) => 20 + 5 * lv;

class Shop {
  constructor(store) { this.store = store; }

  get data() {
    const d = this.store.data;
    if (!d.shop || typeof d.shop !== 'object') d.shop = {};
    const s = d.shop;
    s.coins = Number(s.coins) || 0;
    s.owned = Array.isArray(s.owned) ? s.owned : [];
    s.log = Array.isArray(s.log) ? s.log : [];   // [{ at, n, why }]
    return s;
  }

  add(n, why) {
    if (!n) return 0;
    const s = this.data;
    s.coins += n;
    s.log.unshift({ at: Date.now(), n, why: String(why).slice(0, 120) });
    s.log = s.log.slice(0, 40);
    this.store.save();
    return n;
  }

  /** First launch with the shop: tokens for every level already reached. */
  init(level) {
    const s = this.data;
    if (s.maxLevelPaid !== undefined) return 0;
    let n = 0;
    for (let lv = 2; lv <= level; lv++) n += tokensForLevel(lv);
    s.maxLevelPaid = level;
    return this.add(n, `Bonus d'ouverture de la Boutique (niveaux 2 à ${level})`);
  }

  /** Called with each challenge result (see Challenges.onComplete). Returns tokens earned. */
  reward(r) {
    const s = this.data;
    let total = 0;
    for (const c of r.completed || []) {
      if (c.kind === 'admin' || c.kind === 'wheel' || !(c.xp > 0)) continue;
      total += this.add(tokensForXp(c.xp), `Défi : ${c.title}`);
    }
    if (r.levelUp) {
      const from = Math.max(s.maxLevelPaid || 1, r.levelUp.from);
      for (let lv = from + 1; lv <= r.levelUp.to; lv++) total += this.add(tokensForLevel(lv), `Niveau ${lv} atteint`);
      s.maxLevelPaid = Math.max(s.maxLevelPaid || 1, r.levelUp.to);
      this.store.save();
    }
    return total;
  }

  owns(id) { return this.data.owned.includes(id); }

  buy(id, level = 1) {
    const t = THEMES.find((x) => x.id === id);
    if (!t) throw new Error('Article introuvable');
    const s = this.data;
    if (s.owned.includes(id)) throw new Error('Tu possèdes déjà ce thème');
    const need = (RARITIES[t.rarity] || RARITIES.common).minLevel;
    if (level < need) throw new Error(`Il faut être niveau ${need} pour acheter un thème ${RARITIES[t.rarity].name.toLowerCase()}`);
    if (s.coins < t.price) throw new Error(`Il te manque ${t.price - s.coins} jetons`);
    s.coins -= t.price;
    s.owned.push(id);
    s.log.unshift({ at: Date.now(), n: -t.price, why: `Achat : thème ${t.name}` });
    s.log = s.log.slice(0, 40);
    this.store.save();
    return t;
  }

  /** Wheel state for the window: segments, whether today's free spin is still available. */
  wheel(now = Date.now()) {
    const w = this.data.wheel || {};
    const next = new Date(now); next.setHours(24, 0, 0, 0);
    return {
      segments: WHEEL.map(({ key, kind, n, w: pct }) => ({ key, kind, n, pct })),
      free: w.day !== dayKey(now) && !(w.at > now), // clock set back: wait
      nextAt: next.getTime(),
      last: w.last || null,
      duplicate: THEME_DUPLICATE,
      spins: w.spins || 0,
    };
  }

  /**
   * Spends today's free spin. Coins and themes are applied here; XP is returned
   * for the caller to add (it goes through the challenges / levels engine).
   */
  spin(now = Date.now()) {
    const s = this.data;
    if (!this.wheel(now).free) throw new Error('Tu as déjà tourné la roulette aujourd\'hui. Reviens demain !');
    let r = require('crypto').randomInt(100);
    let prize = WHEEL[0];
    for (const p of WHEEL) { if (r < p.w) { prize = p; break; } r -= p.w; }
    const out = { key: prize.key, kind: prize.kind, n: prize.n };
    if (prize.kind === 'coins') this.add(prize.n, `Roulette : ${prize.n} jetons`);
    if (prize.kind === 'theme') {
      const left = THEMES.filter((t) => !s.owned.includes(t.id));
      if (left.length) {
        // rarity first (common 60 / rare 30 / epic 10, among rarities still missing), then a theme of it
        const { randomInt } = require('crypto');
        const groups = Object.entries(THEME_ODDS).map(([r, w]) => ({ w, list: left.filter((t) => t.rarity === r) })).filter((g) => g.list.length);
        let roll = randomInt(groups.reduce((a, g) => a + g.w, 0));
        const g = groups.find((x) => (roll -= x.w) < 0) || groups[0];
        const t = g.list[randomInt(g.list.length)];
        s.owned.push(t.id);
        s.log.unshift({ at: now, n: 0, why: `Roulette : thème ${t.name} gagné` });
        s.log = s.log.slice(0, 40);
        out.theme = { id: t.id, name: t.name };
      } else {
        this.add(THEME_DUPLICATE, 'Roulette : thème (tous déjà possédés) remplacé par des jetons');
        out.duplicate = THEME_DUPLICATE;
      }
    }
    s.wheel = { day: dayKey(now), at: now, last: { ...out, at: now }, spins: ((s.wheel && s.wheel.spins) || 0) + 1, pendingXp: prize.kind === 'xp' ? prize.n : 0 };
    this.store.save();
    return out;
  }

  list(level = 1) {
    const s = this.data;
    return {
      coins: s.coins,
      level,
      themes: THEMES.map((t) => ({ ...t, owned: s.owned.includes(t.id), minLevel: (RARITIES[t.rarity] || RARITIES.common).minLevel })),
      rarities: RARITIES,
      themeOdds: THEME_ODDS,
      log: s.log.slice(0, 15),
      rates: { perXp: XP_PER_TOKEN, level: tokensForLevel(0), perLevel: 5 },
      wheel: this.wheel(),
    };
  }
}

module.exports = { Shop, SHOP_THEMES: THEMES, tokensForXp, tokensForLevel };

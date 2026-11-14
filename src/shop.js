/**
 * Shop: themes bought with tokens ("jetons").
 * Tokens are earned by completing challenges (1 token per 5 XP) and by reaching
 * new levels (20 + 5 × level). XP gifts from the admin do not give tokens for
 * the challenge part. Everything is stored locally in store.data.shop.
 */
const THEMES = [
  { id: 'neon', name: 'Néon', desc: 'Rose électrique et cyan, ambiance arcade', price: 400,
    c: { bg: '#0b0612', side: '#120a1d', card: '#1d1230', text: '#fbeaff', muted: '#7b5f93', accent: 'linear-gradient(135deg,#ff2bd6,#00e5ff)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,43,214,.4), transparent)' }, symbol: '#ffd1f6' },
  { id: 'ocean', name: 'Océan', desc: 'Bleu profond et turquoise, calme et lisible', price: 400,
    c: { bg: '#04121c', side: '#071a27', card: '#0d2638', text: '#e6f6ff', muted: '#4f7a92', accent: 'linear-gradient(135deg,#1aa3ff,#2ee6c5)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(26,163,255,.35), transparent)' }, symbol: '#bfe6ff' },
  { id: 'forest', name: 'Forêt', desc: 'Verts sombres et lumière dorée', price: 500,
    c: { bg: '#07110b', side: '#0b1910', card: '#13251a', text: '#eafbef', muted: '#5d8068', accent: 'linear-gradient(135deg,#3ddc84,#d4e157)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(61,220,132,.3), transparent)' }, symbol: '#c8f5d6' },
  { id: 'ember', name: 'Braise', desc: 'Rouge volcanique et orange incandescent', price: 600,
    c: { bg: '#120706', side: '#1a0b09', card: '#2a1210', text: '#fff0ea', muted: '#8f5f55', accent: 'linear-gradient(135deg,#ff4d2e,#ffb02e)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,77,46,.38), transparent)' }, symbol: '#ffd2c4' },
  { id: 'sakura', name: 'Sakura', desc: 'Rose pastel sur nuit violette', price: 700,
    c: { bg: '#130b12', side: '#1a0f19', card: '#2a1828', text: '#fff0f7', muted: '#93708a', accent: 'linear-gradient(135deg,#ff9ecf,#c39bff)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(255,158,207,.33), transparent)' }, symbol: '#ffd6ea' },
  { id: 'synthwave', name: 'Synthwave', desc: 'Coucher de soleil rétro des années 80', price: 900,
    c: { bg: '#10061f', side: '#170a2b', card: '#26103f', text: '#fff1e6', muted: '#8a6aa8', accent: 'linear-gradient(135deg,#ff6a3d,#ff2e88 50%,#8a2eff)', glow: 'radial-gradient(140px 70px at 90% 0%, rgba(255,106,61,.4), transparent)' }, symbol: '#ffc9a8' },
  { id: 'royal', name: 'Or royal', desc: 'Noir laqué et feuille d\'or', price: 1200,
    c: { bg: '#080706', side: '#0f0d0a', card: '#1c1812', text: '#fbf3df', muted: '#857a5f', accent: 'linear-gradient(135deg,#f7d774,#c8962a)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(247,215,116,.28), transparent)' }, symbol: '#f7e3a8' },
  { id: 'matrix', name: 'Matrix', desc: 'Vert phosphore sur noir total', price: 1500,
    c: { bg: '#000000', side: '#030a05', card: '#08160c', text: '#c9ffd9', muted: '#3f8a57', accent: 'linear-gradient(135deg,#00ff66,#00b84a)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(0,255,102,.25), transparent)' }, symbol: '#7dffad' },
];

const tokensForXp = (xp) => Math.max(0, Math.round(xp / 5));
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
      if (c.kind === 'admin' || !(c.xp > 0)) continue;
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

  buy(id) {
    const t = THEMES.find((x) => x.id === id);
    if (!t) throw new Error('Article introuvable');
    const s = this.data;
    if (s.owned.includes(id)) throw new Error('Tu possèdes déjà ce thème');
    if (s.coins < t.price) throw new Error(`Il te manque ${t.price - s.coins} jetons`);
    s.coins -= t.price;
    s.owned.push(id);
    s.log.unshift({ at: Date.now(), n: -t.price, why: `Achat : thème ${t.name}` });
    s.log = s.log.slice(0, 40);
    this.store.save();
    return t;
  }

  list() {
    const s = this.data;
    return {
      coins: s.coins,
      themes: THEMES.map((t) => ({ ...t, owned: s.owned.includes(t.id) })),
      log: s.log.slice(0, 15),
      rates: { perXp: 5, level: tokensForLevel(0), perLevel: 5 },
    };
  }
}

module.exports = { Shop, SHOP_THEMES: THEMES, tokensForXp, tokensForLevel };

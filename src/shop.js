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
/**
 * Seasonal themes: shown all year in the Boutique, but only revealed and buyable during
 * their window (every year, local time, both days included). Not in the wheel, no level
 * needed. Before the window the window gets only the name and the dates, not the look.
 */
const SEASONAL = [
  { id: 'noel', rarity: 'seasonal', name: 'Noël', desc: 'Neige qui tombe, rouge velours, vert sapin et guirlandes dorées', price: 1200,
    season: { from: [12, 15], to: [12, 27] },
    c: { bg: '#0b0d10', side: '#0e1512', card: '#1a1214', text: '#fff6ec', muted: '#9a8a7c', accent: 'linear-gradient(135deg,#e5383b,#f4c95d 55%,#2fa36b)', glow: 'radial-gradient(130px 70px at 85% 0%, rgba(229,56,59,.38), transparent), radial-gradient(110px 60px at 10% 100%, rgba(47,163,107,.32), transparent)' }, symbol: '#ffe8a3' },
];
const nowMs = () => Number(process.env.LINKGEEK_TEST_NOW) || Date.now(); // tests can fake the date
/** Where we are in a seasonal window: soon (with opensAt), open (closesAt) or ended (opensAt next year). */
function seasonInfo(t, now = nowMs()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const [fm, fd] = t.season.from; const [tm, td] = t.season.to;
  const open = new Date(y, fm - 1, fd).getTime();
  const close = new Date(y, tm - 1, td + 1).getTime(); // end of the last day
  if (now < open) return { status: 'soon', opensAt: open, closesAt: close };
  if (now < close) return { status: 'open', opensAt: open, closesAt: close };
  return { status: 'ended', opensAt: new Date(y + 1, fm - 1, fd).getTime(), closesAt: new Date(y + 1, tm - 1, td + 1).getTime() };
}

// minLevel: profile level needed to BUY a theme of that rarity (a wheel win ignores it: pure luck)
const RARITIES = { common: { name: 'Commun', order: 0, minLevel: 1 }, rare: { name: 'Rare', order: 1, minLevel: 15 }, epic: { name: 'Épique', order: 2, minLevel: 40 } };
const THEME_ODDS = { common: 70, rare: 25, epic: 5 }; // wheel "random theme" prize

/**
 * Profile picture frames sold in the Boutique: all the same price, no level needed,
 * cheaper than the most expensive themes. Once bought, a frame can be chosen like the
 * rank frames ("Modifier le profil") and friends see it (users/{uid}/frame).
 * Ids start with "f_" so they never clash with rank keys.
 */
const FRAME_PRICE = 1500;
const FRAMES = [
  { id: 'f_inferno', name: 'Inferno', desc: 'Des flammes qui ondulent et vacillent autour de ta photo' },
  { id: 'f_glacier', name: 'Glacier', desc: 'Glace polie et reflets givrés qui glissent' },
  { id: 'f_prism', name: 'Prisme', desc: 'Un arc-en-ciel qui tourne sans fin' },
  { id: 'f_void', name: 'Néant', desc: 'Une spirale cosmique violette qui pulse lentement' },
].map((f) => ({ ...f, price: FRAME_PRICE }));

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

/**
 * Login streak: opening Linkgeek on consecutive days gives a growing token bonus
 * (day 1 → 10 … day 7 and after → 50). Missing a day starts again at day 1.
 */
const STREAK_BONUS = [10, 15, 20, 25, 30, 35, 50];
const streakBonus = (n) => STREAK_BONUS[Math.min(Math.max(n, 1), STREAK_BONUS.length) - 1];

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
    s.frames = Array.isArray(s.frames) ? s.frames : []; // bought profile frames
    s.log = Array.isArray(s.log) ? s.log : [];   // [{ at, n, why }]
    return s;
  }

  ownedFrames() { return this.data.frames.filter((id) => FRAMES.some((f) => f.id === id)); }

  buyFrame(id) {
    const f = FRAMES.find((x) => x.id === id);
    if (!f) throw new Error('Contour introuvable');
    const s = this.data;
    if (s.frames.includes(id)) throw new Error('Tu possèdes déjà ce contour');
    if (s.coins < f.price) throw new Error(`Il te manque ${f.price - s.coins} jetons`);
    s.coins -= f.price;
    s.frames.push(id);
    s.log.unshift({ at: Date.now(), n: -f.price, why: `Achat : contour ${f.name}` });
    s.log = s.log.slice(0, 40);
    this.store.save();
    return f;
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

  /** Where the login streak stands (without changing it). */
  loginInfo(now = Date.now()) {
    const l = this.data.login || {};
    const today = dayKey(now);
    const yesterday = dayKey(new Date(now).setDate(new Date(now).getDate() - 1));
    const alive = l.day === today || l.day === yesterday;
    const streak = alive ? l.streak || 0 : 0;
    const claimed = l.day === today;
    return { streak, best: l.best || 0, claimedToday: claimed, nextBonus: streakBonus(claimed ? streak + 1 : streak + 1), bonuses: STREAK_BONUS };
  }

  /** First opening of the day: extends (or restarts) the streak and pays its bonus. null if already done today. */
  claimLogin(now = Date.now()) {
    const s = this.data;
    const l = s.login || {};
    const today = dayKey(now);
    if (l.day === today || (l.at && l.at > now + 3600000)) return null; // already today / clock set back
    const yesterday = dayKey(new Date(now).setDate(new Date(now).getDate() - 1));
    const streak = l.day === yesterday ? (l.streak || 0) + 1 : 1;
    const bonus = streakBonus(streak);
    s.login = { day: today, at: now, streak, best: Math.max(l.best || 0, streak) };
    this.add(bonus, `Série de connexion : jour ${streak}`);
    return { streak, bonus, best: s.login.best, broken: !!l.day && l.day !== yesterday && (l.streak || 0) > 1, nextBonus: streakBonus(streak + 1), bonuses: STREAK_BONUS };
  }

  owns(id) { return this.data.owned.includes(id); }

  /** Every item the admin can give or take back: themes (seasonal included) and frames. */
  catalog() {
    return [
      ...THEMES.map((t) => ({ id: t.id, kind: 'theme', name: t.name, group: `Thèmes ${RARITIES[t.rarity].name.toLowerCase()}s` })),
      ...SEASONAL.map((t) => ({ id: t.id, kind: 'theme', name: t.name, group: 'Thèmes saisonniers' })),
      ...FRAMES.map((f) => ({ id: f.id, kind: 'frame', name: f.name, group: 'Contours de photo' })),
    ].map((x) => ({ ...x, owned: x.kind === 'frame' ? this.data.frames.includes(x.id) : this.data.owned.includes(x.id) }));
  }

  /** Admin: gives (remove = false) or takes back an item, without tokens. Returns the item. */
  grantItem(id, remove = false) {
    const it = this.catalog().find((x) => x.id === id);
    if (!it) throw new Error('Article de la Boutique inconnu');
    const s = this.data;
    const list = it.kind === 'frame' ? s.frames : s.owned;
    const i = list.indexOf(id);
    if (remove) { if (i >= 0) list.splice(i, 1); } else if (i < 0) list.push(id);
    this.store.save();
    return it;
  }

  buy(id, level = 1) {
    const t = THEMES.find((x) => x.id === id) || SEASONAL.find((x) => x.id === id);
    if (!t) throw new Error('Article introuvable');
    const s = this.data;
    if (s.owned.includes(id)) throw new Error('Tu possèdes déjà ce thème');
    if (t.season) {
      const si = seasonInfo(t);
      if (si.status !== 'open') throw new Error(`Le thème ${t.name} n'est disponible que du ${t.season.from[1]} au ${t.season.to[1]} décembre`);
    } else {
      const need = (RARITIES[t.rarity] || RARITIES.common).minLevel;
      if (level < need) throw new Error(`Il faut être niveau ${need} pour acheter un thème ${RARITIES[t.rarity].name.toLowerCase()}`);
    }
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
      frames: FRAMES.map((f) => ({ ...f, owned: s.frames.includes(f.id) })),
      seasonal: SEASONAL.map((t) => {
        const owned = s.owned.includes(t.id);
        const si = seasonInfo(t);
        // not revealed before its window (unless already owned): name, price and dates only
        if (!owned && si.status === 'soon') return { id: t.id, name: t.name, rarity: t.rarity, price: t.price, season: t.season, owned, hidden: true, ...si };
        return { ...t, owned, ...si };
      }),
      now: nowMs(),
      rarities: RARITIES,
      themeOdds: THEME_ODDS,
      log: s.log.slice(0, 15),
      rates: { perXp: XP_PER_TOKEN, level: tokensForLevel(0), perLevel: 5 },
      wheel: this.wheel(),
      login: this.loginInfo(),
    };
  }
}

module.exports = { Shop, SHOP_THEMES: THEMES, SHOP_SEASONAL: SEASONAL, SHOP_FRAMES: FRAMES, tokensForXp, tokensForLevel };

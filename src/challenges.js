/**
 * Challenges (défis) and the profile level system.
 *  - Daily challenges (3, renewed every day) and weekly ones (3, renewed every Monday)
 *  - One-time "Premiers pas" challenges
 * Completing a challenge gives XP; XP gives levels; levels unlock rank badges.
 * Fully separate from the achievements (trophies).
 */
const crypto = require('crypto');

const RANKS = [
  { min: 1, key: 'rookie', name: 'Recrue' },
  { min: 5, key: 'bronze', name: 'Bronze' },
  { min: 10, key: 'silver', name: 'Argent' },
  { min: 30, key: 'gold', name: 'Or' },
  { min: 40, key: 'platinum', name: 'Platine' },
  { min: 50, key: 'diamond', name: 'Diamant' },
  { min: 60, key: 'emerald', name: 'Émeraude' },
  { min: 70, key: 'master', name: 'Master' },
];

/** XP needed to go from level n to n+1. */
const xpStep = (n) => 100 + 20 * (n - 1);

function levelFromXp(xp) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp || 0));
  while (rest >= xpStep(level)) { rest -= xpStep(level); level++; }
  return { level, into: rest, needed: xpStep(level) };
}
/** Total XP needed to reach a level. */
const xpForLevel = (level) => { let t = 0; for (let n = 1; n < level; n++) t += xpStep(n); return t; };
const rankFor = (level, ranks = RANKS) => [...ranks].reverse().find((r) => level >= r.min) || ranks[0];

/** Validates a rank table edited by the admin: same 8 rank keys, names, strictly increasing levels from 1. */
function sanitizeRanks(list) {
  if (!Array.isArray(list) || list.length !== RANKS.length) throw new Error('Il faut exactement 8 rangs');
  const out = RANKS.map((def, i) => {
    const r = list[i] || {};
    const name = String(r.name || '').trim().slice(0, 20);
    const min = i === 0 ? 1 : Math.floor(Number(r.min));
    if (!name) throw new Error(`Le rang ${i + 1} n'a pas de nom`);
    if (!Number.isFinite(min) || min < 1 || min > 999) throw new Error(`Niveau invalide pour « ${name} »`);
    return { min, key: def.key, name };
  });
  for (let i = 1; i < out.length; i++) {
    if (out[i].min <= out[i - 1].min) throw new Error(`« ${out[i].name} » doit demander un niveau plus élevé que « ${out[i - 1].name} »`);
  }
  return out;
}

const MIN = 60000;
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfWeek = (ms) => { const d = new Date(startOfDay(ms)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
const pl = (n, w, p = w + 's') => `${n} ${n > 1 ? p : w}`;

/* ---------- Challenge pools ---------- */
// metric(m) → current value; available(ctx) → can this challenge be offered
const DAILY = [
  { key: 'play30', icon: 'clock', goal: 30, unit: 'min', xp: 60, title: () => 'Joue 30 minutes', metric: (m) => m.minutes },
  { key: 'play60', icon: 'clock', goal: 60, unit: 'min', xp: 90, title: () => 'Joue 1 heure', metric: (m) => m.minutes },
  { key: 'sessions2', icon: 'play', goal: 2, xp: 60, title: (g) => `Lance ${g} sessions de jeu`, metric: (m) => m.sessions },
  { key: 'games2', icon: 'pad', goal: 2, xp: 80, title: (g) => `Joue à ${g} jeux différents`, metric: (m) => m.games },
  { key: 'launch', icon: 'rocket', goal: 1, xp: 40, title: () => 'Lance un jeu depuis Linkgeek', metric: (m) => m.launches },
  { key: 'long45', icon: 'bolt', goal: 45, unit: 'min', xp: 80, title: () => 'Fais une session de 45 min sans pause', metric: (m) => m.longest },
  { key: 'comeback', icon: 'rewind', goal: 1, xp: 100, title: () => 'Rejoue à un jeu délaissé depuis 2 semaines', metric: (m) => m.comebacks },
  { key: 'friend', icon: 'duo', goal: 1, xp: 120, title: () => 'Joue avec un ami', metric: (m) => m.friendPlays, available: (c) => c.friends > 0 },
  { key: 'fav', icon: 'star', goal: 1, xp: 60, title: () => 'Joue à un de tes favoris', metric: (m) => m.favPlayed, available: (c) => c.favorites > 0 },
  { key: 'top5', icon: 'heart', goal: 1, xp: 60, title: () => 'Joue à un jeu de ton top 5', metric: (m) => m.top5Played, available: (c) => c.top5 > 0 },
];
const WEEKLY = [
  { key: 'play5h', icon: 'clock', goal: 300, unit: 'min', xp: 300, title: () => 'Joue 5 heures cette semaine', metric: (m) => m.minutes },
  { key: 'play10h', icon: 'clock', goal: 600, unit: 'min', xp: 450, title: () => 'Joue 10 heures cette semaine', metric: (m) => m.minutes },
  { key: 'games4', icon: 'pad', goal: 4, xp: 300, title: (g) => `Joue à ${g} jeux différents`, metric: (m) => m.games },
  { key: 'days5', icon: 'calendar', goal: 5, xp: 400, title: (g) => `Joue ${g} jours différents`, metric: (m) => m.days },
  { key: 'sessions10', icon: 'play', goal: 10, xp: 300, title: (g) => `Lance ${g} sessions de jeu`, metric: (m) => m.sessions },
  { key: 'long2h', icon: 'bolt', goal: 120, unit: 'min', xp: 250, title: () => 'Fais une session de 2 h d\'affilée', metric: (m) => m.longest },
  { key: 'platforms2', icon: 'grid', goal: 2, xp: 300, title: (g) => `Joue sur ${g} plateformes différentes`, metric: (m) => m.platforms, available: (c) => c.platforms > 1 },
  { key: 'friends3', icon: 'duo', goal: 3, xp: 450, title: (g) => `Joue ${g} fois avec des amis`, metric: (m) => m.friendPlays, available: (c) => c.friends > 0 },
  { key: 'dailies10', icon: 'check', goal: 10, xp: 400, title: (g) => `Termine ${g} défis quotidiens`, metric: (m) => m.dailiesDone },
];
const ONETIME = [
  { key: 'o_launch', icon: 'rocket', goal: 1, xp: 50, title: () => 'Lance ton premier jeu depuis Linkgeek', metric: (c) => c.launchesTotal },
  { key: 'o_fav', icon: 'star', goal: 1, xp: 50, title: () => 'Ajoute un jeu à tes favoris', metric: (c) => c.favorites },
  { key: 'o_avatar', icon: 'image', goal: 1, xp: 100, title: () => 'Personnalise ta photo de profil', metric: (c) => c.avatar },
  { key: 'o_top5', icon: 'heart', goal: 5, xp: 150, title: () => 'Choisis tes 5 jeux préférés', metric: (c) => c.top5 },
  { key: 'o_google', icon: 'user', goal: 1, xp: 150, title: () => 'Connecte ton compte Google', metric: (c) => c.google },
  { key: 'o_friend', icon: 'people', goal: 1, xp: 200, title: () => 'Ajoute ton premier ami', metric: (c) => c.friends },
  { key: 'o_together', icon: 'duo', goal: 1, xp: 250, title: () => 'Joue pour la première fois avec un ami', metric: (c) => c.playedWith },
  { key: 'o_gold', icon: 'trophy', goal: 1, xp: 150, title: () => 'Débloque un succès de rang Or', metric: (c) => c.goldTrophies },
];

function seededShuffle(list, seed) {
  const out = [...list];
  let h = crypto.createHash('sha256').update(seed).digest();
  for (let i = out.length - 1; i > 0; i--) {
    if (i % 8 === 0) h = crypto.createHash('sha256').update(h).digest();
    const j = h.readUInt32BE((i % 8) * 4) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

class Challenges {
  /**
   * @param {object} o { store, getGames, getRunning, getFriends, getAchievements, onComplete }
   */
  constructor(o) {
    Object.assign(this, o);
    this.timer = null;
    this.ready = false;
  }

  get data() {
    const d = this.store.data;
    if (!d.progress || typeof d.progress !== 'object') d.progress = {};
    const p = d.progress;
    p.xp = p.xp || 0;
    p.completed = p.completed || {};  // challenge instance id -> ms
    p.history = p.history || [];      // [{ title, xp, at, kind }]
    p.current = p.current || {};      // { day: {key, ids}, week: {key, ids} }
    p.salt = p.salt || crypto.randomBytes(8).toString('hex');
    if (!Array.isArray(d.events)) d.events = [];
    return p;
  }

  /* ---------- Events ---------- */
  note(type, extra = {}) {
    const ev = this.store.data.events || (this.store.data.events = []);
    ev.push({ t: type, at: Date.now(), ...extra });
    if (ev.length > 3000) ev.splice(0, 1000);
    this.store.save();
    this.schedule();
  }

  /** A friend is playing the same game as me: counts once per friend every 30 min. */
  notePlayedWith(myGame, friends) {
    if (!myGame || !Array.isArray(friends)) return;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ev = this.store.data.events || [];
    for (const f of friends) {
      if (!f.game || f.state === 'offline') continue;
      if (f.game.id !== myGame.id && norm(f.game.name) !== norm(myGame.name)) continue;
      const recent = ev.some((e) => e.t === 'friend' && e.uid === f.uid && Date.now() - e.at < 30 * MIN);
      if (!recent) this.note('friend', { uid: f.uid });
    }
  }

  /* ---------- Context & metrics ---------- */
  context() {
    const d = this.store.data;
    const games = this.getGames() || [];
    const fr = this.getFriends();
    const ach = (d.achievements && d.achievements.unlocked) || {};
    return {
      games,
      byId: new Map(games.map((g) => [g.id, g])),
      friends: fr && Array.isArray(fr.friends) ? fr.friends.length : 0,
      favorites: (d.favorites || []).length,
      top5: ((d.profile && d.profile.top5) || []).filter(Boolean).length,
      top5Ids: new Set(((d.profile && d.profile.top5) || []).filter(Boolean)),
      avatar: d.profile && d.profile.avatar ? 1 : 0,
      google: d.account ? 1 : 0,
      platforms: new Set(games.filter((g) => g.playtimeSec > 0).map((g) => g.source)).size,
      launchesTotal: (d.events || []).filter((e) => e.t === 'launch').length,
      playedWith: Object.keys((d.achievements && d.achievements.playedWith) || {}).length,
      goldTrophies: Object.values(ach).filter((u) => u.tier >= 3).length,
    };
  }

  spans() {
    const out = (this.store.data.sessions || []).map((s) => ({ id: s.gameId, start: s.start, end: s.end }));
    for (const [id, r] of this.getRunning()) out.push({ id, start: r.start, end: r.lastTick, live: true });
    return out.sort((a, b) => a.start - b.start);
  }

  metrics(from, to, ctx, spans) {
    const inside = spans.filter((s) => s.end > from && s.start < to);
    const minutes = inside.reduce((a, s) => a + (Math.min(s.end, to) - Math.max(s.start, from)), 0) / MIN;
    const ids = new Set(inside.map((s) => s.id));
    const days = new Set(inside.map((s) => dayKey(Math.max(s.start, from))));
    const events = (this.store.data.events || []).filter((e) => e.at >= from && e.at < to);
    let comebacks = 0;
    for (const s of inside) {
      const prev = spans.filter((x) => x.id === s.id && x.end <= s.start).pop();
      const g = ctx.byId.get(s.id);
      if (prev ? s.start - prev.end >= 14 * DAY : g && g.platformPlaytimeSec > 0 && !spans.some((x) => x.id === s.id && x.start < s.start)) { comebacks++; break; }
    }
    const p = this.data;
    return {
      minutes,
      sessions: spans.filter((s) => s.start >= from && s.start < to).length,
      games: ids.size,
      days: days.size,
      longest: inside.reduce((a, s) => Math.max(a, (s.end - s.start) / MIN), 0),
      platforms: new Set([...ids].map((id) => ctx.byId.get(id)).filter(Boolean).map((g) => g.source)).size,
      launches: events.filter((e) => e.t === 'launch').length,
      friendPlays: events.filter((e) => e.t === 'friend').length,
      favPlayed: [...ids].some((id) => (this.store.data.favorites || []).includes(id)) ? 1 : 0,
      top5Played: [...ids].some((id) => ctx.top5Ids.has(id)) ? 1 : 0,
      comebacks,
      dailiesDone: Object.entries(p.completed).filter(([k, at]) => k.startsWith('d:') && at >= from && at < to).length,
    };
  }

  /** Picks (and remembers) the 3 challenges of the current day / week. */
  pick(kind, key, pool, ctx) {
    const p = this.data;
    const cur = p.current[kind];
    if (cur && cur.key === key && Array.isArray(cur.ids)) return cur.ids.map((id) => pool.find((c) => c.key === id)).filter(Boolean);
    const avail = pool.filter((c) => !c.available || c.available(ctx));
    // Never two variants of the same metric (e.g. play 30 min + play 1 h)
    const chosen = [];
    const reroll = kind === 'day' && p.reroll && p.reroll.key === key ? `:${p.reroll.n}` : '';
    for (const c of seededShuffle(avail, `${p.salt}:${kind}:${key}${reroll}`)) {
      if (chosen.length >= 3) break;
      if (chosen.some((x) => x.metric.toString() === c.metric.toString())) continue;
      chosen.push(c);
    }
    p.current[kind] = { key, ids: chosen.map((c) => c.key) };
    this.store.save();
    return chosen;
  }

  state() {
    const now = Date.now();
    const ctx = this.context();
    const spans = this.spans();
    const p = this.data;
    const d0 = startOfDay(now); const d1 = addDays(d0, 1);
    const w0 = startOfWeek(now); const w1 = addDays(w0, 7);
    const dKey = dayKey(d0); const wKey = dayKey(w0);
    const md = this.metrics(d0, d1, ctx, spans);
    const mw = this.metrics(w0, w1, ctx, spans);
    const item = (prefix, c, m) => {
      const id = `${prefix}:${c.key}`;
      return { id, key: c.key, icon: c.icon, title: c.title(c.goal), xp: c.xp, goal: c.goal, unit: c.unit || null,
        value: Math.min(c.goal, Math.floor(Math.max(0, Number(c.metric(m)) || 0))), doneAt: p.completed[id] || null };
    };
    return {
      daily: { key: dKey, resetsAt: d1, items: this.pick('day', dKey, DAILY, ctx).map((c) => item(`d:${dKey}`, c, md)) },
      weekly: { key: wKey, resetsAt: w1, items: this.pick('week', wKey, WEEKLY, ctx).map((c) => item(`w:${wKey}`, c, mw)) },
      onetime: ONETIME.map((c) => item('o', c, ctx)),
    };
  }

  ranks() {
    try { return this.getRanks ? sanitizeRanks(this.getRanks()) : RANKS; } catch { return RANKS; }
  }

  levelInfo() {
    const p = this.data;
    const l = levelFromXp(p.xp);
    const ranks = this.ranks();
    const rank = rankFor(l.level, ranks);
    const next = ranks.find((r) => r.min > l.level) || null;
    return { xp: p.xp, level: l.level, into: l.into, needed: l.needed, rank: rank.key, rankName: rank.name, nextRank: next ? { key: next.key, name: next.name, level: next.min } : null };
  }

  /** Awards XP for newly completed challenges. */
  check() {
    if (!this.ready) return null;
    const st = this.state();
    const p = this.data;
    const before = levelFromXp(p.xp).level;
    const fresh = [];
    const kinds = [['daily', st.daily.items], ['weekly', st.weekly.items], ['onetime', st.onetime]];
    for (const [kind, items] of kinds) {
      for (const it of items) {
        if (it.doneAt || it.value < it.goal) continue;
        p.completed[it.id] = Date.now();
        p.xp += it.xp;
        p.history.unshift({ title: it.title, xp: it.xp, at: Date.now(), kind });
        fresh.push({ title: it.title, xp: it.xp, kind });
      }
    }
    if (!fresh.length) return null;
    p.history = p.history.slice(0, 40);
    // Forget old daily/weekly completions (keep ~5 weeks)
    const cutoff = Date.now() - 35 * DAY;
    for (const [k, at] of Object.entries(p.completed)) if (!k.startsWith('o:') && at < cutoff) delete p.completed[k];
    this.store.save();
    const info = this.levelInfo();
    const levelUp = info.level > before ? { from: before, to: info.level, rank: info.rank, rankName: info.rankName, rankUp: rankFor(before, this.ranks()).key !== info.rank } : null;
    const result = { completed: fresh, levelUp, level: info };
    this.onComplete(result);
    return result;
  }

  /**
   * Admin actions: add/remove XP or set an exact level.
   * @param {{xp?: number, level?: number, title?: string}} g
   */
  grant(g) {
    const p = this.data;
    const beforeXp = p.xp;
    const before = levelFromXp(p.xp).level;
    if (Number.isFinite(g.level) && g.level >= 1) p.xp = xpForLevel(Math.min(999, Math.floor(g.level)));
    if (Number.isFinite(g.xp)) p.xp = Math.max(0, Math.floor(p.xp + g.xp));
    const delta = p.xp - beforeXp;
    const title = String(g.title || (Number.isFinite(g.level) ? `Niveau fixé à ${Math.floor(g.level)} par l'administrateur` : 'Cadeau de l\'administrateur')).slice(0, 120);
    p.history.unshift({ title, xp: delta, at: Date.now(), kind: 'admin' });
    p.history = p.history.slice(0, 40);
    this.store.save();
    const info = this.levelInfo();
    const ranks = this.ranks();
    const levelUp = info.level > before ? { from: before, to: info.level, rank: info.rank, rankName: info.rankName, rankUp: rankFor(before, ranks).key !== info.rank } : null;
    const result = { completed: [{ title, xp: delta, kind: 'admin' }], levelUp, level: info };
    this.onComplete(result);
    return info;
  }

  /** Admin: draws 3 new daily challenges (those already finished today stay counted). */
  rerollDaily() {
    const p = this.data;
    const key = dayKey(startOfDay(Date.now()));
    p.reroll = { key, n: p.reroll && p.reroll.key === key ? p.reroll.n + 1 : 1 };
    delete p.current.day;
    this.store.save();
    return this.list();
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { try { this.check(); } catch (e) { console.error('challenges', e); } }, 1200);
  }

  startClock() {
    // Picks up time played in a running session and day/week resets
    setInterval(() => this.schedule(), 60000);
  }

  list() {
    this.check();
    const st = this.state();
    const p = this.data;
    return { ...st, level: this.levelInfo(), ranks: this.ranks(), history: p.history.slice(0, 12), total: Object.keys(p.completed).length };
  }
}

module.exports = { Challenges, RANKS, levelFromXp, rankFor, sanitizeRanks, xpForLevel };

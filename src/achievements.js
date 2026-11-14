/**
 * Achievements: tiered goals (Bronze → Argent → Or → Platine) computed from the
 * library, the play sessions recorded by the tracker and the friends list.
 * Unlocked tiers are stored and never revoked.
 */
const H = 3600;
const GB = 1024 ** 3;
const TIER_NAMES = ['Bronze', 'Argent', 'Or', 'Platine'];
const POINTS = [10, 25, 50, 100];
const pl = (n, w, p = w + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? p : w}`;

const DEFS = [
  { key: 'friends_play', name: 'En équipe', icon: 'duo', tiers: [1, 3, 5, 10],
    desc: (n) => `Jouer avec ${pl(n, 'ami')} différent${n > 1 ? 's' : ''}`,
    hint: 'Lance le même jeu qu\'un ami en même temps', metric: (c) => c.playedWith },
  { key: 'games_played', name: 'Touche-à-tout', icon: 'pad', tiers: [1, 5, 10, 25],
    desc: (n) => `Jouer à ${pl(n, 'jeu', 'jeux')} différent${n > 1 ? 's' : ''}`, metric: (c) => c.gamesPlayed },
  { key: 'playtime_total', name: 'Marathonien', icon: 'clock', unit: 'h', tiers: [10 * H, 100 * H, 500 * H, 1000 * H],
    desc: (n) => `Cumuler ${pl(n / H, 'heure')} de jeu au total`, metric: (c) => c.totalSec },
  { key: 'playtime_one', name: 'Dévoué', icon: 'heart', unit: 'h', tiers: [10 * H, 50 * H, 100 * H, 300 * H],
    desc: (n) => `Passer ${pl(n / H, 'heure')} sur un même jeu`, metric: (c) => c.maxGameSec },
  { key: 'long_session', name: 'Sans pause', icon: 'bolt', unit: 'h', tiers: [1 * H, 3 * H, 6 * H, 10 * H],
    desc: (n) => `Jouer ${pl(n / H, 'heure')} d'affilée`, hint: 'Session suivie par Linkgeek', metric: (c) => c.longestSec },
  { key: 'sessions', name: 'Habitué', icon: 'play', tiers: [1, 25, 100, 500],
    desc: (n) => `Lancer ${pl(n, 'session')} de jeu`, hint: 'Sessions suivies par Linkgeek', metric: (c) => c.sessions },
  { key: 'days', name: 'Fidèle', icon: 'calendar', tiers: [3, 7, 30, 100],
    desc: (n) => `Jouer ${pl(n, 'jour')} différent${n > 1 ? 's' : ''}`, metric: (c) => c.days },
  { key: 'night', name: 'Oiseau de nuit', icon: 'moon', tiers: [1, 10, 25, 50],
    desc: (n) => `Lancer ${pl(n, 'session')} entre minuit et 5 h`, metric: (c) => c.nightSessions },
  { key: 'library', name: 'Collectionneur', icon: 'layers', tiers: [10, 25, 50, 100],
    desc: (n) => `Avoir ${pl(n, 'jeu', 'jeux')} dans ta bibliothèque`, metric: (c) => c.libraryCount },
  { key: 'platforms', name: 'Multi-plateforme', icon: 'grid', tiers: [1, 2, 3, 4],
    desc: (n) => n === 1 ? 'Jouer sur une plateforme' : `Jouer sur ${n} plateformes (Steam, Epic, Xbox, Battle.net…)`, metric: (c) => c.platforms },
  { key: 'storage', name: 'Disque plein', icon: 'disk', unit: 'gb', tiers: [100 * GB, 250 * GB, 500 * GB, 1000 * GB],
    desc: (n) => `Avoir ${(n / GB).toLocaleString('fr-FR')} Go de jeux installés`, metric: (c) => c.storage },
  { key: 'social', name: 'Populaire', icon: 'people', tiers: [1, 5, 10, 25],
    desc: (n) => `Avoir ${pl(n, 'ami')}`, metric: (c) => c.friends },
  { key: 'favorites', name: 'Coups de cœur', icon: 'star', tiers: [1, 5, 10, 20],
    desc: (n) => `Mettre ${pl(n, 'jeu', 'jeux')} en favori`, metric: (c) => c.favorites },
  { key: 'playtime_legend', name: 'Légende vivante', icon: 'crown', unit: 'h', tiers: [400 * H, 600 * H, 800 * H, 1000 * H],
    desc: (n) => `Passer ${pl(n / H, 'heure')} sur un même jeu`, metric: (c) => c.maxGameSec },
  // ---- Secret trophies: shown as "???" until unlocked ----
  { key: 'secret_quick', kind: 'secret', name: 'Tout ça pour ça', icon: 'hourglass', tiers: [1],
    desc: () => 'Faire une session de jeu de moins de 30 secondes', metric: (c) => c.quickSessions },
  { key: 'secret_curious', kind: 'secret', name: 'Curieux', icon: 'compass', tiers: [1],
    desc: () => 'Ouvrir toutes les pages du launcher (Accueil, Amis, Défis, Succès, Stats, Paramètres)', metric: (c) => c.allPages },
  { key: 'secret_lucky', kind: 'secret', name: 'Chanceux', icon: 'clover', tiers: [1],
    desc: () => 'Avoir un 7 dans son pseudo', metric: (c) => c.lucky },
  { key: 'secret_influencer', kind: 'secret', name: 'Influenceur', icon: 'megaphone', tiers: [1],
    desc: () => 'Relier tous ses réseaux (Discord, Twitch et TikTok) à son profil', metric: (c) => c.allSocials },
  // ---- The ultimate trophy: every other trophy at its highest rank ----
  { key: 'ultimate', kind: 'ultimate', name: 'Linkgeek Ultime', icon: 'gem', tiers: [1],
    desc: () => 'Débloquer tous les autres trophées au rang maximum', metric: (c) => c.allMaxed },
];
const SPECIAL = { secret: { name: 'Secret', points: 50 }, ultimate: { name: 'Ultime', points: 500 } };
const PAGES = ['home', 'friends', 'challenges', 'achievements', 'stats', 'settings'];
const tierName = (def, i) => (def.kind ? SPECIAL[def.kind].name : TIER_NAMES[i]);
const tierPoints = (def, i) => (def.kind ? SPECIAL[def.kind].points : POINTS[i]);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

class Achievements {
  constructor(store, getGames, getFriends, onUnlock) {
    this.store = store;
    this.getGames = getGames;
    this.getFriends = getFriends;
    this.onUnlock = onUnlock;
    this.timer = null;
  }

  get data() {
    const d = this.store.data;
    if (!d.achievements || typeof d.achievements !== 'object') d.achievements = {};
    const a = d.achievements;
    a.unlocked = a.unlocked || {};   // key -> { tier, best, dates: { [tier]: ms } }
    a.playedWith = a.playedWith || {}; // friend uid -> { name, game, at }
    return a;
  }

  /** Records friends playing the same game as me right now. */
  notePlayedWith(myGame, friends) {
    if (!myGame || !Array.isArray(friends)) return;
    let changed = false;
    for (const f of friends) {
      if (!f.game || f.state === 'offline') continue;
      if (f.game.id === myGame.id || norm(f.game.name) === norm(myGame.name)) {
        this.data.playedWith[f.uid] = { name: f.name, game: myGame.name, at: Date.now() };
        changed = true;
      }
    }
    if (changed) { this.store.save(); this.schedule(); }
  }

  context() {
    const games = this.getGames() || [];
    const sessions = this.store.data.sessions || [];
    const played = games.filter((g) => g.playtimeSec > 0);
    const days = new Set(sessions.map((s) => dayKey(s.start)));
    for (const g of games) if (g.lastPlayed) days.add(dayKey(g.lastPlayed));
    const fr = this.getFriends();
    const d = this.store.data;
    const name = (d.profile && d.profile.name) || (this.getName ? this.getName() : '') || '';
    const soc = (d.profile && d.profile.socials) || {};
    const visited = new Set(d.visitedPages || []);
    return {
      quickSessions: d.quickSessions || 0,
      allPages: PAGES.every((p) => visited.has(p)) ? 1 : 0,
      lucky: /7/.test(name) ? 1 : 0,
      allSocials: soc.discord && soc.twitch && soc.tiktok ? 1 : 0,
      playedWith: Object.keys(this.data.playedWith).length,
      gamesPlayed: played.length,
      totalSec: games.reduce((a, g) => a + (g.playtimeSec || 0), 0),
      maxGameSec: games.reduce((a, g) => Math.max(a, g.playtimeSec || 0), 0),
      longestSec: sessions.reduce((a, s) => Math.max(a, (s.end - s.start) / 1000), 0),
      sessions: sessions.length,
      days: days.size,
      nightSessions: sessions.filter((s) => new Date(s.start).getHours() < 5).length,
      libraryCount: games.length,
      platforms: new Set(played.map((g) => g.source)).size,
      storage: games.reduce((a, g) => a + (g.sizeBytes || 0), 0),
      friends: fr && Array.isArray(fr.friends) ? fr.friends.length : 0,
      favorites: games.filter((g) => g.favorite).length,
    };
  }

  /** Re-evaluates everything; returns newly unlocked tiers. */
  check() {
    if (!this.ready) return []; // wait for the first library scan
    const ctx = this.context();
    const a = this.data;
    const first = !a.initialized;
    const fresh = [];
    // the ultimate trophy is checked last, once every other one is up to date
    for (const def of [...DEFS.filter((x) => x.kind !== 'ultimate'), ...DEFS.filter((x) => x.kind === 'ultimate')]) {
      if (def.kind === 'ultimate') {
        ctx.allMaxed = DEFS.every((o) => o === def || ((a.unlocked[o.key] || {}).tier || 0) >= o.tiers.length) ? 1 : 0;
      }
      const value = Math.max(0, Number(def.metric(ctx)) || 0);
      const u = a.unlocked[def.key] || (a.unlocked[def.key] = { tier: 0, best: 0, dates: {} });
      if (u.frozen) continue; // tier set back by the admin
      u.best = Math.max(u.best || 0, value);
      let tier = 0;
      while (tier < def.tiers.length && u.best >= def.tiers[tier]) tier++;
      for (let t = (u.tier || 0) + 1; t <= tier; t++) {
        u.dates[t] = Date.now();
        fresh.push({ key: def.key, name: def.name, kind: def.kind || null, tier: t, tierName: tierName(def, t - 1), desc: def.desc(def.tiers[t - 1]) });
      }
      u.tier = Math.max(u.tier || 0, tier);
    }
    a.initialized = true;
    if (fresh.length || first) this.store.save();
    // First evaluation: everything already earned unlocks silently (no flood of notifications)
    if (fresh.length && !first) this.onUnlock(fresh);
    return fresh;
  }

  /**
   * Admin gift: puts a trophy at a given tier (0 = lock it again).
   * Tiers above the current one unlock with the usual notification.
   */
  grant(key, tier) {
    const def = DEFS.find((d) => d.key === key);
    if (!def) throw new Error('Succès inconnu');
    const t = Math.max(0, Math.min(def.tiers.length, Math.floor(Number(tier))));
    if (!Number.isFinite(t)) throw new Error('Palier invalide');
    const a = this.data;
    const u = a.unlocked[key] || (a.unlocked[key] = { tier: 0, best: 0, dates: {} });
    const fresh = [];
    if (t > (u.tier || 0)) {
      for (let i = (u.tier || 0) + 1; i <= t; i++) {
        u.dates[i] = Date.now();
        fresh.push({ key, name: def.name, kind: def.kind || null, tier: i, tierName: tierName(def, i - 1), desc: def.desc(def.tiers[i - 1]), gift: true });
      }
      u.tier = t;
      // progress at least at the goal of the tier, so the next check keeps it
      u.best = Math.max(u.best || 0, def.tiers[t - 1]);
      delete u.frozen;
    } else if (t < (u.tier || 0)) {
      for (let i = t + 1; i <= 4; i++) delete u.dates[i];
      u.tier = t;
      // frozen: the admin's choice wins, normal progress no longer changes this trophy
      u.frozen = Date.now();
    }
    this.store.save();
    if (fresh.length) this.onUnlock(fresh);
    this.schedule(); // the ultimate trophy may change
    return { name: def.name, tier: t, tierName: t ? tierName(def, t - 1) : null };
  }

  /** Every trophy with its real name (admin panel only). */
  catalog() {
    return DEFS.map((d) => ({ key: d.key, name: d.name, kind: d.kind || null, tiers: d.tiers.map((_, i) => tierName(d, i)) }));
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { try { this.check(); } catch (e) { console.error('achievements', e); } }, 1500);
  }

  list() {
    this.check();
    const a = this.data;
    const items = DEFS.map((def) => {
      const u = a.unlocked[def.key] || { tier: 0, best: 0, dates: {} };
      // a secret trophy reveals nothing until it is unlocked
      const hidden = def.kind === 'secret' && !u.tier;
      return {
        key: def.key, kind: def.kind || null, hidden,
        name: hidden ? '???' : def.name, icon: hidden ? 'secret' : def.icon, unit: def.unit || null, hint: hidden ? null : def.hint || null,
        tier: u.tier, value: hidden ? 0 : u.best,
        tiers: def.tiers.map((goal, i) => ({ goal, name: tierName(def, i), points: tierPoints(def, i), desc: hidden ? '???' : def.desc(goal), at: u.dates[i + 1] || null })),
      };
    });
    const counts = [0, 0, 0, 0];
    let points = 0; let maxPoints = 0; let unlocked = 0; let total = 0;
    for (const def of DEFS) {
      const u = a.unlocked[def.key] || { tier: 0 };
      def.tiers.forEach((_, i) => {
        maxPoints += tierPoints(def, i); total++;
        if (i < u.tier) { points += tierPoints(def, i); unlocked++; if (!def.kind) counts[i]++; }
      });
    }
    const secrets = DEFS.filter((d) => d.kind === 'secret');
    const ult = a.unlocked.ultimate;
    const friends = Object.values(a.playedWith).sort((x, y) => y.at - x.at);
    return {
      items, counts, points, maxPoints, unlocked, total, playedWith: friends.slice(0, 12),
      secrets: { found: secrets.filter((d) => (a.unlocked[d.key] || {}).tier).length, total: secrets.length },
      ultimate: ult && ult.tier ? ult.dates[1] || true : null,
    };
  }
}

module.exports = { Achievements, TIER_NAMES, PAGES };

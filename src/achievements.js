/**
 * Trophies: each one has a single rarity and a single goal, harder as the
 * rarity goes up: 15 Bronze, 12 Argent, 5 Or and 1 Platine (all the others).
 * Computed from the library, the sessions recorded by the tracker, the friends
 * list and Linkgeek's own features. Unlocked trophies are never revoked
 * (except by the admin).
 *
 * The engine keeps the "tiers" shape of the old tiered system (one tier per
 * trophy) so the admin panel, titles, showcase and profile keep working.
 */
const { levelFromXp } = require('./challenges');
const H = 3600;
const GB = 1024 ** 3;
const RARITIES = {
  bronze: { name: 'Bronze', points: 15, rank: 1 },
  silver: { name: 'Argent', points: 30, rank: 2 },
  gold: { name: 'Or', points: 90, rank: 3 },
  platinum: { name: 'Platine', points: 300, rank: 4 },
};
const TIER_NAMES = ['Bronze', 'Argent', 'Or', 'Platine'];
const DATA_VERSION = 2; // 2 = one rarity per trophy

const TRACKED = 'Temps de jeu suivi par Linkgeek (Linkgeek ouvert)';
const TIME_KEYS = ['playtime_10', 'playtime_100', 'one_game_50', 'one_game_500'];
const T = (rarity, key, name, icon, goal, desc, metric, extra = {}) => ({ rarity, key, name, icon, tiers: [goal], desc: () => desc, metric, ...extra });
const DEFS = [
  // ---------- Bronze: first steps ----------
  T('bronze', 'first_session', 'Premier pas', 'play', 1, 'Lancer ta première session de jeu', (c) => c.sessions, { hint: 'Sessions suivies par Linkgeek' }),
  T('bronze', 'games_3', 'Touche-à-tout', 'pad', 3, 'Jouer à 3 jeux différents', (c) => c.gamesPlayed),
  T('bronze', 'playtime_10', 'Échauffement', 'clock', 10 * H, 'Cumuler 10 heures de jeu', (c) => c.totalSec, { unit: 'h', hint: TRACKED }),
  T('bronze', 'library_10', 'Petite collection', 'layers', 10, 'Avoir 10 jeux dans ta bibliothèque', (c) => c.libraryCount),
  T('bronze', 'favorite_1', 'Coup de cœur', 'star', 1, 'Mettre un jeu en favori', (c) => c.favorites),
  T('bronze', 'friend_1', 'Premier ami', 'people', 1, 'Ajouter ton premier ami', (c) => c.friends),
  T('bronze', 'days_3', 'Ça devient sérieux', 'calendar', 3, 'Jouer 3 jours différents', (c) => c.days),
  T('bronze', 'night_1', 'Oiseau de nuit', 'moon', 1, 'Lancer une session entre minuit et 5 h', (c) => c.nightSessions),
  T('bronze', 'challenge_1', 'Défi relevé', 'bolt', 1, 'Terminer ton premier défi', (c) => c.challengesDone),
  T('bronze', 'avatar', 'À ton image', 'image', 1, 'Choisir ta propre photo de profil', (c) => c.customAvatar),
  T('bronze', 'top5', 'Mon top 5', 'heart', 5, 'Remplir les 5 places de tes jeux préférés', (c) => c.top5),
  T('bronze', 'wheel_1', 'Coup de chance', 'gem', 1, 'Tourner la roulette du jour', (c) => c.wheelSpins),
  T('bronze', 'secret_curious', 'Curieux', 'compass', 1, 'Ouvrir toutes les pages du launcher (Accueil, Amis, Défis, Succès, Stats, Paramètres)', (c) => c.allPages, { secret: true }),
  T('bronze', 'secret_quick', 'Tout ça pour ça', 'hourglass', 1, 'Faire une session de jeu de moins de 30 secondes', (c) => c.quickSessions, { secret: true }),
  T('bronze', 'secret_lucky', 'Chanceux', 'clover', 1, 'Avoir un 7 dans son pseudo', (c) => c.lucky, { secret: true }),
  // ---------- Argent: a real investment ----------
  T('silver', 'playtime_100', 'Marathonien', 'clock', 100 * H, 'Cumuler 100 heures de jeu', (c) => c.totalSec, { unit: 'h', hint: TRACKED }),
  T('silver', 'one_game_50', 'Dévoué', 'heart', 50 * H, 'Passer 50 heures sur un même jeu', (c) => c.maxGameSec, { unit: 'h', hint: TRACKED }),
  T('silver', 'session_3h', 'Sans pause', 'bolt', 3 * H, 'Jouer 3 heures d\'affilée', (c) => c.longestSec, { unit: 'h', hint: 'Session suivie par Linkgeek' }),
  T('silver', 'sessions_50', 'Habitué', 'play', 50, 'Lancer 50 sessions de jeu', (c) => c.sessions, { hint: 'Sessions suivies par Linkgeek' }),
  T('silver', 'days_30', 'Régulier', 'calendar', 30, 'Jouer 30 jours différents', (c) => c.days),
  T('silver', 'team_3', 'En équipe', 'duo', 3, 'Jouer avec 3 amis différents', (c) => c.playedWith, { hint: 'Lance le même jeu qu\'un ami en même temps' }),
  T('silver', 'friends_5', 'Populaire', 'people', 5, 'Avoir 5 amis', (c) => c.friends),
  T('silver', 'platforms_3', 'Multi-plateforme', 'grid', 3, 'Jouer sur 3 plateformes (Steam, Epic, Xbox, Battle.net…)', (c) => c.platforms),
  T('silver', 'storage_250', 'Disque plein', 'disk', 250 * GB, 'Avoir 250 Go de jeux installés', (c) => c.storage, { unit: 'gb' }),
  T('silver', 'theme_1', 'Relooking', 'star', 1, 'Acheter un thème dans la Boutique', (c) => c.themes),
  T('silver', 'level_25', 'Vétéran', 'crown', 25, 'Atteindre le niveau 25', (c) => c.level),
  T('silver', 'secret_influencer', 'Influenceur', 'megaphone', 1, 'Relier tous ses réseaux (Discord, Twitch et TikTok) à son profil', (c) => c.allSocials, { secret: true }),
  // ---------- Or: for the dedicated ----------
  T('gold', 'one_game_500', 'Légende vivante', 'crown', 500 * H, 'Passer 500 heures sur un même jeu', (c) => c.maxGameSec, { unit: 'h', hint: TRACKED }),
  T('gold', 'session_8h', 'Increvable', 'bolt', 8 * H, 'Jouer 8 heures d\'affilée', (c) => c.longestSec, { unit: 'h', hint: 'Session suivie par Linkgeek' }),
  T('gold', 'streak_30', 'Assidu', 'calendar', 30, 'Jouer 30 jours de suite', (c) => c.bestStreak, { hint: 'Une partie suivie par Linkgeek chaque jour' }),
  T('gold', 'challenges_100', 'Chasseur de défis', 'compass', 100, 'Terminer 100 défis', (c) => c.challengesDone),
  T('gold', 'games_25', 'Explorateur', 'pad', 25, 'Jouer à 25 jeux différents', (c) => c.gamesPlayed),
  // ---------- Platine: everything ----------
  T('platinum', 'ultimate', 'Linkgeek Platine', 'gem', 1, 'Débloquer tous les autres trophées de Linkgeek', (c) => c.allMaxed, { kind: 'ultimate' }),
];
const PAGES = ['home', 'friends', 'challenges', 'achievements', 'stats', 'settings'];
const tierName = (def) => RARITIES[def.rarity].name;
const tierPoints = (def) => RARITIES[def.rarity].points;

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
    a.unlocked = a.unlocked || {};   // key -> { tier (0/1), best, dates: { 1: ms } }
    a.playedWith = a.playedWith || {}; // friend uid -> { name, game, at }
    if (a.v !== DATA_VERSION) {
      // old tiered trophies: start over with the new list, everything already earned unlocks silently
      if (Object.keys(a.unlocked).length) a.legacy = a.unlocked;
      a.unlocked = {};
      a.initialized = false;
      a.v = DATA_VERSION;
    }
    if (!a.trackedTime) {
      // playtime trophies now count only the time played with Linkgeek open: the progress
      // remembered from the platforms' counters is dropped (trophies already won stay won)
      for (const k of TIME_KEYS) if (a.unlocked[k] && !a.unlocked[k].tier) a.unlocked[k].best = 0;
      a.trackedTime = 1;
    }
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
    // longest run of consecutive days with a tracked session
    const dayStarts = [...new Set(sessions.map((s) => new Date(s.start).setHours(0, 0, 0, 0)))].sort((x, y) => x - y);
    let bestStreak = 0; let run = 0; let prev = null;
    for (const t of dayStarts) { run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1; bestStreak = Math.max(bestStreak, run); prev = t; }
    const shop = d.shop || {};
    return {
      bestStreak,
      challengesDone: Object.keys((d.progress && d.progress.completed) || {}).length,
      level: levelFromXp((d.progress && d.progress.xp) || 0).level,
      customAvatar: d.profile && d.profile.avatar ? 1 : 0,
      top5: ((d.profile && d.profile.top5) || []).filter(Boolean).length,
      wheelSpins: (shop.wheel && shop.wheel.spins) || 0,
      themes: Array.isArray(shop.owned) ? shop.owned.length : 0,
      quickSessions: d.quickSessions || 0,
      allPages: PAGES.every((p) => visited.has(p)) ? 1 : 0,
      lucky: /7/.test(name) ? 1 : 0,
      allSocials: soc.discord && soc.twitch && soc.tiktok ? 1 : 0,
      playedWith: Object.keys(this.data.playedWith).length,
      gamesPlayed: played.length,
      // playtime counted only while Linkgeek was open (not the platforms' own counters)
      totalSec: games.reduce((a, g) => a + (g.trackedSec || 0), 0),
      maxGameSec: games.reduce((a, g) => Math.max(a, g.trackedSec || 0), 0),
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
        fresh.push({ key: def.key, name: def.name, kind: def.kind || null, secret: !!def.secret, rarity: def.rarity, icon: def.icon, tier: t, tierName: tierName(def), points: tierPoints(def), desc: def.desc() });
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
        fresh.push({ key, name: def.name, kind: def.kind || null, secret: !!def.secret, rarity: def.rarity, icon: def.icon, tier: i, tierName: tierName(def), points: tierPoints(def), desc: def.desc(), gift: true });
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
    return { name: def.name, tier: t, tierName: t ? tierName(def) : null };
  }

  /** Every trophy with its real name (admin panel only). */
  catalog() {
    return DEFS.map((d) => ({ key: d.key, name: `${d.name} (${tierName(d)})`, kind: d.kind || (d.secret ? 'secret' : null), rarity: d.rarity, tiers: [tierName(d)] }));
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
      const hidden = !!def.secret && !u.tier;
      return {
        key: def.key, kind: def.kind || null, secret: !!def.secret, hidden, rarity: def.rarity, rarityName: tierName(def),
        name: hidden ? '???' : def.name, icon: hidden ? 'secret' : def.icon, unit: def.unit || null, hint: hidden ? null : def.hint || null,
        tier: u.tier ? 1 : 0, value: hidden ? 0 : u.best,
        tiers: def.tiers.map((goal) => ({ goal, name: tierName(def), points: tierPoints(def), desc: hidden ? 'Trophée secret : il se révèle quand tu le débloques' : def.desc(), at: u.dates[1] || null })),
      };
    });
    // per rarity: [unlocked, total] in the order bronze, silver, gold, platinum
    const byRarity = Object.fromEntries(Object.keys(RARITIES).map((r) => [r, { got: 0, total: 0, points: RARITIES[r].points }]));
    const counts = [0, 0, 0, 0];
    let points = 0; let maxPoints = 0; let unlocked = 0; let total = 0;
    for (const def of DEFS) {
      const u = a.unlocked[def.key] || { tier: 0 };
      const r = byRarity[def.rarity];
      r.total++; total++; maxPoints += tierPoints(def);
      if (u.tier) { r.got++; unlocked++; points += tierPoints(def); counts[RARITIES[def.rarity].rank - 1]++; }
    }
    const secrets = DEFS.filter((d) => d.secret);
    const ult = a.unlocked.ultimate;
    const friends = Object.values(a.playedWith).sort((x, y) => y.at - x.at);
    return {
      items, counts, byRarity, points, maxPoints, unlocked, total, playedWith: friends.slice(0, 12),
      secrets: { found: secrets.filter((d) => (a.unlocked[d.key] || {}).tier).length, total: secrets.length },
      ultimate: ult && ult.tier ? ult.dates[1] || true : null,
    };
  }
}

module.exports = { Achievements, TIER_NAMES, RARITIES, PAGES };

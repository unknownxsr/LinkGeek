/**
 * Social features on top of the online mode (src/online.js, same Firebase database):
 *
 *   invites/{to}/{from}      { name, photo, game:{ name, key }, at }    "viens jouer à …" (friends only)
 *   duels/{id}               { a, b, aName, bName, kind, game, stake, week, status, at, scores, final }
 *   userDuels/{uid}/{id}     true                                       index of my duels
 *   lfg/{uid}                { name, photo, level, game, note, at }     « Recherche un coéquipier » (all players)
 *   feedback/{id}            { uid, name, msg, v, at }                  Contact → read by the admin only
 *   referrals/{uid}          { by, at }                                 who invited me (new accounts only)
 *   refBy/{by}/{uid}         true                                       the players I invited
 *
 * Duels de la semaine: two friends bet Geek Coins on « qui joue le plus à <jeu> » or « qui
 * fait le plus de défis » from Monday to Sunday. The coins live on each PC (Boutique), so each
 * side puts its own stake aside when it creates / accepts the duel, then pays itself after the
 * week: the winner gets both stakes, a draw gives each stake back, a refused or expired duel
 * gives the stake back. Scores are published by each player on their own side of the duel.
 *
 * Parrainage: a new account (< 14 days) enters the friend code of who invited them: both get a
 * free booster, at most REF_MAX boosters earned this way per player.
 */
const crypto = require('crypto');

const SV_TIME = { '.sv': 'timestamp' };
const DAY = 86400000;
const INVITE_TTL = 30 * 60000;           // an invite older than 30 min is ignored
const LFG_TTL = 24 * 3600000;            // « Recherche un coéquipier » lasts 24 h
const DUEL_STAKES = [10, 25, 50, 100, 250, 500];
const DUEL_MAX_OPEN = 5;                 // pending + active duels at the same time
const RESOLVE_GRACE = 2 * DAY;           // after the week: wait for the friend's final score
const REF_MAX = 5;                       // boosters earned by referral, per player
const REF_NEW_ACCOUNT = 14 * DAY;        // only a new account can say who invited it
const FEEDBACK_GAP = 60000;              // one message per minute

const gameKey = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 80);
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const httpsOnly = (u) => (typeof u === 'string' && /^https:\/\//.test(u) && u.length <= 500 ? u : null);
const newId = () => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.randomBytes(20), (b) => A[b % A.length]).join('');
};

class Social {
  /**
   * @param {object} o
   * @param {import('./online').Online} o.online
   * @param {object} o.store
   * @param {() => {week: string, start: number}} o.weekInfo     current week (Monday key)
   * @param {(duel: object, start: number, end: number) => number} o.score   my score for a duel week
   * @param {() => number} o.coins
   * @param {(n: number, why: string) => void} o.addCoins
   * @param {(n: number) => void} o.addPacks
   * @param {(event: string, data: object) => void} o.onEvent      invite / duel / referral news
   * @param {(state: object) => void} o.onChange                   new state for the window
   * @param {() => string} o.version
   */
  constructor(o) {
    Object.assign(this, o);
    this.invites = [];
    this.duels = {};
    this.lfg = [];
    this.lastLfg = 0;
    this.started = false;
  }

  get me() { return this.online.session && this.online.session.uid; }
  get local() {
    const d = this.store.data;
    if (!d.social || typeof d.social !== 'object') d.social = {};
    const s = d.social;
    s.duels = s.duels && typeof s.duels === 'object' ? s.duels : {};
    s.referral = s.referral && typeof s.referral === 'object' ? s.referral : { gained: 0, rewarded: [] };
    if (!Array.isArray(s.referral.rewarded)) s.referral.rewarded = [];
    return s;
  }
  identity() {
    const id = this.online.getIdentity();
    return { name: clip(id.name || 'Joueur', 40), photo: httpsOnly(id.photo), level: Math.max(1, Math.min(100, Number(id.level) || 1)) };
  }
  friend(uid) { return (this.online.snapshot.friends || []).find((f) => f.uid === uid) || null; }
  requireOnline() { if (!this.me) throw new Error('Connecte-toi au mode en ligne (Paramètres → Compte)'); }

  /* ---------- lifecycle (called when the online mode starts / stops) ---------- */
  start() {
    if (!this.me || this.started) return;
    this.started = true;
    const me = this.me;
    const later = (k, fn, ms = 400) => { clearTimeout(this['t_' + k]); this['t_' + k] = setTimeout(() => fn().catch(() => {}), ms); };
    this.online.stream(`invites/${me}`, () => later('inv', () => this.pollInvites()));
    this.online.stream(`userDuels/${me}`, () => later('duels', () => this.pollDuels()));
    this.pollInvites().catch(() => {});
    this.pollDuels().catch(() => {});
    this.pollLfg().catch(() => {});
    this.checkReferrals().catch(() => {});
    this.timer = setInterval(() => {
      this.pollDuels().catch(() => {});      // scores + week end
      this.checkReferrals().catch(() => {});
      if (Date.now() - this.lastLfg > 120000) this.pollLfg().catch(() => {});
    }, 5 * 60000);
  }
  stop() {
    this.started = false;
    clearInterval(this.timer);
    this.invites = []; this.duels = {}; this.lfg = [];
    this.changed();
  }
  state() {
    const me = this.me;
    const l = this.local;
    const wk = this.weekInfo();
    const duels = Object.entries(this.duels).map(([id, d]) => {
      const mine = d.a === me ? 'a' : 'b';
      const other = mine === 'a' ? 'b' : 'a';
      const ld = l.duels[id] || {};
      return {
        id, kind: d.kind, game: d.game || null, stake: d.stake, week: d.week, status: d.status, at: d.at,
        mine, outgoing: d.a === me, friend: { uid: d[other], name: d[other + 'Name'] || 'Joueur' },
        myScore: Number((d.scores || {})[me]) || 0, theirScore: Number((d.scores || {})[d[other]]) || 0,
        current: d.week === wk.week, result: ld.result || null, staked: !!ld.staked,
      };
    }).sort((x, y) => (y.at || 0) - (x.at || 0));
    const mineLfg = this.lfg.find((x) => x.uid === me) || null;
    const friendIds = new Set((this.online.snapshot.friends || []).map((f) => f.uid));
    const sent = new Set(this.local.lfgAsked || []);
    return {
      invites: this.invites,
      duels,
      duelStakes: DUEL_STAKES,
      lfg: this.lfg.filter((x) => x.uid !== me).map((x) => ({ ...x, friend: friendIds.has(x.uid), asked: sent.has(x.uid) })),
      myLfg: mineLfg,
      referral: { by: l.referral.by || null, gained: l.referral.gained || 0, max: REF_MAX, canClaim: this.canClaimReferral() },
    };
  }
  changed() { if (this.onChange) this.onChange(this.state()); }

  /* ---------- 1. Inviter un ami à jouer ---------- */
  async invite(fid, game) {
    this.requireOnline();
    const f = this.friend(fid);
    if (!f) throw new Error('Tu ne peux inviter que tes amis');
    const name = clip(game && game.name, 120);
    if (!name) throw new Error('Choisis un jeu');
    const id = this.identity();
    const body = { name: id.name, game: { name, key: gameKey(name) || 'jeu' }, at: SV_TIME };
    if (id.photo) body.photo = id.photo;
    await this.online.db('PUT', `invites/${fid}/${this.me}`, body);
    return { to: f.name, game: name };
  }
  async pollInvites() {
    if (!this.me) return;
    const raw = (await this.online.db('GET', `invites/${this.me}`).catch(() => null)) || {};
    const now = this.online.now();
    const seen = new Set(this.invites.map((i) => i.from + ':' + i.at));
    const list = [];
    for (const [from, v] of Object.entries(raw)) {
      if (!v || typeof v !== 'object' || !v.game) continue;
      if (now - (Number(v.at) || 0) > INVITE_TTL) { this.online.db('DELETE', `invites/${this.me}/${from}`).catch(() => {}); continue; }
      const inv = { from, name: clip(v.name, 40) || 'Un ami', photo: httpsOnly(v.photo), game: { name: clip(v.game.name, 120), key: clip(v.game.key, 80) }, at: Number(v.at) || now };
      list.push(inv);
      if (!seen.has(inv.from + ':' + inv.at)) this.onEvent('invite', inv);
    }
    this.invites = list;
    this.changed();
  }
  /** Accepted (the game is launched by the caller) or refused: the invite is removed. */
  async answerInvite(from) {
    if (!this.me) return;
    this.invites = this.invites.filter((i) => i.from !== from);
    this.changed();
    await this.online.db('DELETE', `invites/${this.me}/${from}`).catch(() => {});
  }

  /* ---------- 2. Duels de la semaine ---------- */
  openDuels() { return Object.values(this.duels).filter((d) => d.status === 'pending' || d.status === 'active').length; }
  async createDuel({ fid, kind, game, stake }) {
    this.requireOnline();
    const f = this.friend(fid);
    if (!f) throw new Error('Choisis un ami');
    if (kind !== 'game' && kind !== 'challenges') throw new Error('Choisis le type de duel');
    stake = Math.trunc(Number(stake));
    if (!DUEL_STAKES.includes(stake)) throw new Error('Mise invalide');
    if (this.coins() < stake) throw new Error(`Il te manque ${stake - this.coins()} Geek Coins pour cette mise`);
    if (this.openDuels() >= DUEL_MAX_OPEN) throw new Error(`Tu as déjà ${DUEL_MAX_OPEN} duels en cours`);
    const g = kind === 'game' ? { name: clip(game && game.name, 120), key: gameKey(game && game.name) } : null;
    if (kind === 'game' && (!g.name || !g.key)) throw new Error('Choisis un jeu');
    const wk = this.weekInfo();
    const me = this.me;
    const id = newId();
    const duel = { a: me, b: fid, aName: this.identity().name, bName: clip(f.name, 40) || 'Joueur', kind, stake, week: wk.week, status: 'pending', at: SV_TIME };
    if (g) duel.game = g;
    await this.online.db('PATCH', '', { [`duels/${id}`]: duel, [`userDuels/${me}/${id}`]: true, [`userDuels/${fid}/${id}`]: true });
    // my stake is put aside now (given back if the duel is refused / cancelled / expires)
    this.addCoins(-stake, `Duel contre ${f.name} : mise`);
    this.local.duels[id] = { staked: stake };
    this.store.save();
    await this.pollDuels();
    return id;
  }
  async answerDuel(id, accept) {
    this.requireOnline();
    const d = this.duels[id];
    if (!d || d.b !== this.me || d.status !== 'pending') throw new Error('Ce duel n\'est plus en attente');
    if (d.week !== this.weekInfo().week) throw new Error('Ce duel a expiré (la semaine est finie)');
    if (accept && this.coins() < d.stake) throw new Error(`Il te manque ${d.stake - this.coins()} Geek Coins pour accepter`);
    await this.online.db('PATCH', `duels/${id}`, { status: accept ? 'active' : 'declined' });
    if (accept) {
      this.addCoins(-d.stake, `Duel contre ${d.aName || 'un ami'} : mise`);
      this.local.duels[id] = { staked: d.stake };
      this.store.save();
    }
    await this.pollDuels();
  }
  async cancelDuel(id) {
    this.requireOnline();
    const d = this.duels[id];
    if (!d || d.a !== this.me || d.status !== 'pending') throw new Error('Ce duel ne peut plus être annulé');
    await this.online.db('PATCH', `duels/${id}`, { status: 'cancelled' });
    await this.pollDuels();
  }
  async pollDuels() {
    if (!this.me) return;
    const me = this.me;
    const ids = Object.keys((await this.online.db('GET', `userDuels/${me}`).catch(() => null)) || {});
    const out = {};
    await Promise.all(ids.map(async (id) => {
      const d = await this.online.db('GET', `duels/${id}`).catch(() => null);
      if (d && (d.a === me || d.b === me)) out[id] = d;
      else if (!d) this.online.db('DELETE', `userDuels/${me}/${id}`).catch(() => {}); // deleted duel
    }));
    const before = this.duels;
    this.duels = out;
    for (const [id, d] of Object.entries(out)) {
      const was = before[id];
      if (was && was.status === 'pending' && d.status !== 'pending') this.onEvent('duelAnswer', { id, duel: d, me });
      if (!was && d.b === me && d.status === 'pending' && this.duelsLoaded) this.onEvent('duelNew', { id, duel: d }); // not for the first load
      try { await this.settleDuel(id, d); } catch { /* next time */ }
    }
    this.duelsLoaded = true;
    // forget duels finished more than 5 weeks ago
    const old = this.weekInfo().start - 35 * DAY;
    for (const [id, d] of Object.entries(out)) {
      const ld = this.local.duels[id];
      if (new Date(d.week + 'T00:00:00').getTime() < old && (!ld || ld.result)) {
        this.online.db('DELETE', `userDuels/${me}/${id}`).catch(() => {});
        delete this.duels[id];
      }
    }
    this.changed();
  }
  /** Scores, week end, payouts. Each PC only ever pays itself. */
  async settleDuel(id, d) {
    const me = this.me;
    const l = this.local;
    const ld = l.duels[id] || (l.duels[id] = {});
    if (ld.result) return;
    const wk = this.weekInfo();
    const start = new Date(d.week + 'T00:00:00').getTime();
    const end = start + 7 * DAY;
    const over = d.week !== wk.week && Date.now() >= end;
    const refund = (why) => {
      if (ld.staked) this.addCoins(ld.staked, why);
      ld.result = 'refund'; this.store.save();
    };
    if (d.status === 'declined' || d.status === 'cancelled') return refund(d.status === 'declined' ? 'Duel refusé : mise rendue' : 'Duel annulé : mise rendue');
    if (d.status === 'pending') {
      if (over) { if (d.a === me) this.online.db('PATCH', `duels/${id}`, { status: 'cancelled' }).catch(() => {}); refund('Duel expiré : mise rendue'); }
      return;
    }
    if (d.status !== 'active') return;
    const other = d.a === me ? d.b : d.a;
    const mine = Math.max(0, Math.round(this.score(d, start, Math.min(end, Date.now()))));
    const posted = Number((d.scores || {})[me]);
    if (posted !== mine || (over && !(d.final || {})[me])) {
      const patch = { [`scores/${me}`]: mine };
      if (over) patch[`final/${me}`] = true;
      await this.online.db('PATCH', `duels/${id}`, patch);
      d.scores = { ...(d.scores || {}), [me]: mine };
      if (over) d.final = { ...(d.final || {}), [me]: true };
    }
    if (!over) return;
    const theirsFinal = !!(d.final || {})[other];
    if (!theirsFinal && Date.now() < end + RESOLVE_GRACE) return; // wait for their final score
    const theirs = Number((d.scores || {})[other]) || 0;
    const stake = ld.staked || 0;
    if (mine > theirs) { this.addCoins(stake * 2, `Duel gagné contre ${d.a === me ? d.bName : d.aName}`); ld.result = 'won'; }
    else if (mine === theirs) { if (stake) this.addCoins(stake, 'Duel à égalité : mise rendue'); ld.result = 'draw'; }
    else ld.result = 'lost';
    ld.final = { mine, theirs };
    this.store.save();
    this.onEvent('duelEnd', { id, duel: d, result: ld.result, mine, theirs, stake });
  }

  /* ---------- 3. Recherche un coéquipier ---------- */
  async pollLfg() {
    if (!this.me) return;
    this.lastLfg = Date.now();
    const raw = (await this.online.db('GET', 'lfg', undefined, { orderBy: '"at"', limitToLast: 60 }).catch(() => null)) || {};
    const now = this.online.now();
    this.lfg = Object.entries(raw).filter(([, v]) => v && now - (Number(v.at) || 0) < LFG_TTL).map(([uid, v]) => ({
      uid, name: clip(v.name, 40) || 'Joueur', photo: httpsOnly(v.photo), level: Math.max(1, Math.min(100, Number(v.level) || 1)),
      game: clip(v.game, 120) || null, note: clip(v.note, 80) || null, at: Number(v.at) || now,
    })).sort((x, y) => y.at - x.at);
    this.changed();
    return this.state().lfg;
  }
  async setLfg(on, { game, note } = {}) {
    this.requireOnline();
    const path = `lfg/${this.me}`;
    if (!on) { await this.online.db('DELETE', path); }
    else {
      const id = this.identity();
      const body = { name: id.name, level: id.level, at: SV_TIME };
      if (id.photo) body.photo = id.photo;
      if (clip(game, 120)) body.game = clip(game, 120);
      if (clip(note, 80)) body.note = clip(note, 80);
      await this.online.db('PUT', path, body);
    }
    await this.pollLfg();
  }
  /** Friend request to someone from the list (they don't need my code). */
  async askLfg(uid) {
    this.requireOnline();
    if (uid === this.me) throw new Error('C\'est toi 🙂');
    await this.online.sendRequestTo(uid);
    const l = this.local;
    l.lfgAsked = [...new Set([...(l.lfgAsked || []), uid])].slice(-200);
    this.store.save();
    this.changed();
  }

  /* ---------- 4. Contact (only the admin reads it) ---------- */
  async sendFeedback(msg) {
    this.requireOnline();
    const text = String(msg || '').trim().slice(0, 1000);
    if (text.length < 5) throw new Error('Écris un message un peu plus long');
    const l = this.local;
    if (Date.now() - (l.feedbackAt || 0) < FEEDBACK_GAP) throw new Error('Attends une minute avant d\'envoyer un autre message');
    const id = this.identity();
    await this.online.db('PUT', `feedback/${newId()}`, { uid: this.me, name: id.name, msg: text, v: clip(this.version(), 20), at: SV_TIME });
    l.feedbackAt = Date.now();
    this.store.save();
  }
  async listFeedback() {
    this.requireOnline();
    const raw = (await this.online.db('GET', 'feedback')) || {};
    return Object.entries(raw).map(([id, v]) => ({ id, uid: clip(v.uid, 40), name: clip(v.name, 40), msg: String(v.msg || '').slice(0, 1000), v: clip(v.v, 20), at: Number(v.at) || 0 }))
      .sort((x, y) => y.at - x.at);
  }
  async deleteFeedback(id) {
    this.requireOnline();
    if (!/^[A-Za-z0-9_-]{6,40}$/.test(String(id))) throw new Error('Message inconnu');
    await this.online.db('DELETE', `feedback/${id}`);
  }

  /* ---------- 5. Parrainage ---------- */
  canClaimReferral() {
    const l = this.local;
    const m = this.online.membership;
    return !!(this.me && !l.referral.by && m && m.joinedAt && this.online.now() - m.joinedAt < REF_NEW_ACCOUNT);
  }
  givePack(why) {
    const r = this.local.referral;
    if ((r.gained || 0) >= REF_MAX) return false;
    r.gained = (r.gained || 0) + 1;
    this.addPacks(1);
    this.store.save();
    this.onEvent('referralPack', { why, gained: r.gained, max: REF_MAX });
    return true;
  }
  /** A new player enters the friend code of who invited them. */
  async claimReferral(rawCode) {
    this.requireOnline();
    if (!this.canClaimReferral()) throw new Error(this.local.referral.by ? 'Tu as déjà indiqué qui t\'a invité' : 'Seul un nouveau compte (moins de 14 jours) peut indiquer un parrain');
    const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new Error('Code invalide (format : ABCD-1234)');
    if (code === this.online.code) throw new Error('C\'est ton propre code 🙂');
    const by = await this.online.db('GET', `codes/${code}`);
    if (!by || by === this.me) throw new Error('Aucun joueur avec ce code');
    await this.online.db('PATCH', '', { [`referrals/${this.me}`]: { by, at: SV_TIME }, [`refBy/${by}/${this.me}`]: true });
    this.local.referral.by = by;
    this.store.save();
    this.givePack('referred');
    // and a friend request to the one who invited me
    this.online.sendRequestTo(by).catch(() => {});
    this.changed();
  }
  /** The players I invited who installed Linkgeek: one booster each (REF_MAX at most). */
  async checkReferrals() {
    if (!this.me) return;
    const raw = (await this.online.db('GET', `refBy/${this.me}`).catch(() => null)) || {};
    const r = this.local.referral;
    let changed = false;
    for (const uid of Object.keys(raw)) {
      if (r.rewarded.includes(uid)) continue;
      r.rewarded.push(uid); changed = true;
      this.givePack('inviter');
    }
    if (changed) { this.store.save(); this.changed(); }
  }

  /** Account deletion: what can be removed of mine. */
  deletePaths() {
    const me = this.me;
    if (!me) return [];
    return [`lfg/${me}`, `invites/${me}`, `userDuels/${me}`, `referrals/${me}`];
  }
}

module.exports = { Social, gameKey, DUEL_STAKES, REF_MAX };

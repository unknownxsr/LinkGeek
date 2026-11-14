/**
 * Online features (friends + presence) on top of Firebase:
 *  - Auth: the Google ID token from our desktop sign-in is exchanged for a
 *    Firebase session (Identity Toolkit REST API). Only the refresh token is
 *    kept, encrypted by the caller.
 *  - Data: Firebase Realtime Database through its REST API. Changes arrive in
 *    real time through REST streaming (server-sent events); a slow poll stays
 *    as a safety net.
 *
 * Database layout (see firebase/database.rules.json for who may read/write what):
 *   users/{uid}            { name, photo, code, level, levelAt, boostAt, admin }
 *   codes/{code}           uid                      friend-code lookup
 *   presence/{uid}         { state, game, since, lastSeen }      (friends only)
 *   cards/{uid}            { top5, top, ach, games, …Hours }     public profile (friends only)
 *   requests/{to}/{from}   { name, photo, at }      pending friend requests
 *   friends/{uid}/{fid}    true
 *   grants/{uid}/{id}      { xp, level, note, by, at }   gifts from the admin
 *   config/ranks           rank table set by the admin
 */
const IDP_BASE = process.env.LINKGEEK_IDP_BASE || 'https://identitytoolkit.googleapis.com';
const TOKEN_BASE = process.env.LINKGEEK_TOKEN_BASE || 'https://securetoken.googleapis.com';

const HEARTBEAT_MS = 45 * 1000;
const POLL_MS = 15 * 1000;           // without live streams
const SLOW_POLL_MS = 90 * 1000;      // safety net while streams are live
const OFFLINE_AFTER_MS = 3 * 60 * 1000;
const STREAM_RENEW_MS = 50 * 60 * 1000; // ID tokens last 1 h
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
// Mirrors the server rule: one level at a time, at most every 10 min below level 10, then every hour
const levelWait = (lv) => (lv < 10 ? 10 : 60) * 60 * 1000;
const BOOST_MS = 10 * 60 * 1000;
const FIRST_LEVEL_MAX = 5;

const SV_TIME = { '.sv': 'timestamp' };

function makeCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');

/** Applies a Firebase stream event (put/patch at a path) to a plain object. */
function applyEvent(root, type, p, data) {
  const parts = String(p || '/').split('/').filter(Boolean);
  if (!parts.length) {
    if (type === 'patch') return { ...(root && typeof root === 'object' ? root : {}), ...data };
    return data;
  }
  const out = root && typeof root === 'object' ? { ...root } : {};
  let cur = out;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] && typeof cur[parts[i]] === 'object' ? { ...cur[parts[i]] } : {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (type === 'patch') cur[last] = { ...(cur[last] && typeof cur[last] === 'object' ? cur[last] : {}), ...data };
  else if (data === null) delete cur[last];
  else cur[last] = data;
  return out;
}

/** One live connection to a database path (REST streaming / server-sent events). */
class Stream {
  constructor(online, path, onEvent) {
    this.online = online; this.path = path; this.onEvent = onEvent;
    this.ctrl = null; this.closed = false; this.fails = 0; this.ok = false;
    this.open();
  }

  async open() {
    if (this.closed) return;
    this.ctrl = new AbortController();
    const opened = Date.now();
    const renew = setTimeout(() => this.ctrl.abort(), STREAM_RENEW_MS);
    try {
      const c = this.online.requireConfig();
      const url = `${c.databaseURL.replace(/\/+$/, '')}/${this.path}.json?auth=${encodeURIComponent(await this.online.token())}`;
      const r = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: this.ctrl.signal, redirect: 'follow' });
      if (!r.ok || !r.body || !/event-stream/.test(r.headers.get('content-type') || '')) throw new Error('stream ' + r.status);
      this.ok = true;
      const dec = new TextDecoder();
      let buf = '';
      for await (const chunk of r.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = (block.match(/^event:\s*(.*)$/m) || [])[1];
          const raw = (block.match(/^data:\s*(.*)$/m) || [])[1];
          if (ev === 'put' || ev === 'patch') {
            this.fails = 0;
            try { const d = JSON.parse(raw); this.onEvent(ev, d.path, d.data); } catch { /* ignore */ }
          } else if (ev === 'auth_revoked' || ev === 'cancel') {
            this.ctrl.abort();
          }
        }
      }
    } catch { /* closed, aborted or refused */ }
    clearTimeout(renew);
    this.ok = false;
    if (this.closed) return;
    // quick reconnect after a token renewal, back off after repeated failures
    this.fails = Date.now() - opened > 60000 ? 0 : this.fails + 1;
    setTimeout(() => this.open(), Math.min(60000, 1000 * 2 ** this.fails));
  }

  close() { this.closed = true; this.ok = false; if (this.ctrl) this.ctrl.abort(); }
}

class Online {
  /**
   * @param {object} o
   * @param {() => ({apiKey, databaseURL}|null)} o.getConfig
   * @param {() => (string|null)} o.loadRefreshToken
   * @param {(t: string|null) => void} o.saveRefreshToken
   * @param {() => {state: string, game: object|null}} o.getActivity
   * @param {() => {name, photo, level, admin}} o.getIdentity
   * @param {() => object} [o.getCard]  public profile card shown to friends
   * @param {(snapshot: object) => void} o.onUpdate
   */
  constructor(o) {
    Object.assign(this, o);
    this.session = null;   // { uid, idToken, expiresAt }
    this.code = null;
    this.snapshot = { status: 'disconnected', friends: [], requests: [], code: null, error: null, live: false };
    this.timers = [];
    this.lastActivityKey = '';
    this.serverOffset = 0;
    this.users = {};       // fid -> users/{fid}
    this.presence = {};    // fid -> presence/{fid}
    this.cards = {};       // fid -> cards/{fid} (public profile, friends only)
    this.friendIds = [];
    this.requests = [];
    this.streams = new Map();
    this.me = {};          // my own users/{uid} node as last read
    this.lastFull = 0;
    this.lastCard = '';
    this.levelTimer = null;
  }

  get configured() { const c = this.getConfig(); return !!(c && c.apiKey && c.databaseURL); }
  get live() { const s = [...this.streams.values()]; return s.length > 0 && s.every((x) => x.ok); }
  now() { return Date.now() + this.serverOffset; }

  /* ---------- Auth ---------- */
  async signInWithGoogle(googleIdToken) {
    const c = this.requireConfig();
    const r = await fetch(`${IDP_BASE}/v1/accounts:signInWithIdp?key=${encodeURIComponent(c.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true,
        returnIdpCredential: false,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.idToken) throw new Error('Firebase a refusé la connexion : ' + ((j.error && j.error.message) || r.status));
    this.setSession(j.localId, j.idToken, j.refreshToken, j.expiresIn);
    await this.start();
  }

  setSession(uid, idToken, refreshToken, expiresIn) {
    this.session = { uid, idToken, expiresAt: Date.now() + (parseInt(expiresIn, 10) || 3600) * 1000 - 60000 };
    if (refreshToken) this.saveRefreshToken(refreshToken);
  }

  async refresh() {
    const c = this.requireConfig();
    const rt = this.loadRefreshToken();
    if (!rt) throw new Error('not-signed-in');
    const r = await fetch(`${TOKEN_BASE}/v1/token?key=${encodeURIComponent(c.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id_token) {
      if (r.status === 400) this.saveRefreshToken(null); // revoked / invalid
      throw new Error('Session expirée, reconnecte-toi avec Google');
    }
    this.setSession(j.user_id, j.id_token, j.refresh_token, j.expires_in);
  }

  async token() {
    if (!this.session || Date.now() > this.session.expiresAt) {
      // several callers at once share one refresh
      if (!this.refreshing) this.refreshing = this.refresh().finally(() => { this.refreshing = null; });
      await this.refreshing;
    }
    return this.session.idToken;
  }

  requireConfig() {
    const c = this.getConfig();
    if (!c || !c.apiKey || !c.databaseURL) throw new Error('Mode en ligne non configuré (Paramètres → Compte)');
    return c;
  }

  /* ---------- Database ---------- */
  async db(method, path, body) {
    const c = this.requireConfig();
    const base = c.databaseURL.replace(/\/+$/, '');
    const url = `${base}/${path}.json?auth=${encodeURIComponent(await this.token())}`;
    const r = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = j && j.error ? j.error : r.status;
      throw new Error(msg === 'Permission denied' ? 'Accès refusé par le serveur (règles Firebase ?)' : 'Erreur serveur : ' + msg);
    }
    return j;
  }

  /* ---------- Lifecycle ---------- */
  async resume() {
    if (!this.configured || !this.loadRefreshToken()) { this.emit({ status: this.configured ? 'signed-out' : 'unconfigured' }); return; }
    try { await this.refresh(); await this.start(); } catch (e) { this.emit({ status: 'error', error: e.message }); }
  }

  async start() {
    this.stopTimers();
    this.emit({ status: 'connecting', error: null });
    await this.ensureProfile();
    await this.heartbeat(true);
    await this.poll();
    this.openOwnStreams();
    this.timers.push(setInterval(() => this.heartbeat().catch(() => {}), HEARTBEAT_MS));
    this.timers.push(setInterval(() => {
      // full refresh: often without live streams, rarely with them
      if (!this.live || Date.now() - this.lastFull >= SLOW_POLL_MS) this.poll().catch(() => {});
      else this.rebuild(); // friends who stopped sending heartbeats turn offline
    }, POLL_MS));
  }

  stopTimers() {
    this.timers.forEach(clearInterval); this.timers = [];
    clearTimeout(this.levelTimer);
    for (const s of this.streams.values()) s.close();
    this.streams.clear();
  }

  async signOut() {
    await this.goOffline();
    this.stopTimers();
    this.session = null;
    this.saveRefreshToken(null);
    this.users = {}; this.presence = {}; this.friendIds = []; this.requests = [];
    this.emit({ status: this.configured ? 'signed-out' : 'unconfigured', friends: [], requests: [], code: null, live: false });
  }

  /**
   * "Membre depuis" + member number. The date comes from the Firebase account
   * creation; the number is taken from a shared counter in one atomic write that
   * the rules only accept as "counter + 1", so two players never get the same one.
   * The first 100 members are the founders.
   */
  async ensureMembership(me) {
    const uid = this.session.uid;
    let joinedAt = me.joinedAt || null;
    let member = me.member || null;
    if (!joinedAt) {
      try {
        const c = this.requireConfig();
        const r = await fetch(`${IDP_BASE}/v1/accounts:lookup?key=${encodeURIComponent(c.apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await this.token() }),
        });
        const j = await r.json().catch(() => ({}));
        const created = Number(j.users && j.users[0] && j.users[0].createdAt);
        joinedAt = Number.isFinite(created) && created > 0 ? created : Date.now();
      } catch { joinedAt = Date.now(); }
      await this.db('PATCH', `users/${uid}`, { joinedAt: Math.min(joinedAt, Date.now()) }).catch(() => {});
    }
    for (let i = 0; i < 6 && !member; i++) {
      const count = Number(await this.db('GET', 'meta/memberCount').catch(() => 0)) || 0;
      try {
        await this.db('PATCH', '', { 'meta/memberCount': count + 1, [`users/${uid}/member`]: count + 1 });
        member = count + 1;
      } catch {
        // someone joined at the same moment, or member already set: read again
        const again = await this.db('GET', `users/${uid}/member`).catch(() => null);
        if (again) member = again;
        else await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
      }
    }
    this.membership = { joinedAt, member };
    if (this.onMembership) this.onMembership(this.membership);
  }

  async goOffline() {
    if (!this.session) return;
    try {
      await Promise.race([
        this.db('PATCH', `presence/${this.session.uid}`, { state: 'offline', game: null, lastSeen: SV_TIME }),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* best effort */ }
  }

  /**
   * Deletes everything about me on the server (profile, code, presence,
   * friendships on both sides, pending requests and gifts), then the Firebase
   * account itself, then signs out. Local playtime and settings stay on the PC.
   */
  async deleteAccount() {
    if (!this.session) throw new Error('Connecte-toi d\'abord avec Google');
    const me = this.session.uid;
    const keys = async (p) => Object.keys((await this.db('GET', p).catch(() => null)) || {});
    const [friends, reqs, grants] = await Promise.all([keys(`friends/${me}`), keys(`requests/${me}`), keys(`grants/${me}`)]);
    const code = this.code || (this.me && this.me.code);
    // The rules allow these deletions one entry at a time
    const paths = [`presence/${me}`, `cards/${me}`];
    for (const f of friends) paths.push(`friends/${me}/${f}`, `friends/${f}/${me}`, `requests/${f}/${me}`);
    for (const r of reqs) paths.push(`requests/${me}/${r}`);
    for (const f of (this.getSentRequests ? this.getSentRequests() : [])) if (!friends.includes(f)) paths.push(`requests/${f}/${me}`);
    for (const g of grants) paths.push(`grants/${me}/${g}`);
    if (code) paths.push(`codes/${code}`);
    paths.push(`users/${me}`);
    let failed = 0;
    for (const p of paths) await this.db('DELETE', p).catch(() => { failed++; });
    const c = this.requireConfig();
    const idToken = await this.token();
    const r = await fetch(`${IDP_BASE}/v1/accounts:delete?key=${encodeURIComponent(c.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    }).catch(() => null);
    this.stopTimers();
    this.session = null;
    this.saveRefreshToken(null);
    this.users = {}; this.presence = {}; this.friendIds = []; this.requests = [];
    this.emit({ status: this.configured ? 'signed-out' : 'unconfigured', friends: [], requests: [], code: null, live: false });
    return { authDeleted: !!(r && r.ok), failed };
  }

  /* ---------- My profile & presence ---------- */
  async ensureProfile() {
    const uid = this.session.uid;
    const me = (await this.db('GET', `users/${uid}`)) || {};
    let code = me.code;
    if (!code) {
      for (let i = 0; i < 6 && !code; i++) {
        const c = makeCode();
        if (!(await this.db('GET', `codes/${c}`))) { await this.db('PUT', `codes/${c}`, uid); code = c; }
      }
    }
    const id = this.getIdentity();
    await this.db('PATCH', `users/${uid}`, { name: id.name || 'Joueur', photo: id.photo || null, code });
    this.me = { ...me, name: id.name, code };
    this.code = code;
    await this.ensureMembership(me).catch(() => {});
    await this.publishAdmin();
    await this.publishFrame().catch(() => {});
    await this.publishLevel();
    await this.publishCard(true);
  }

  async updateIdentity() {
    if (!this.session) return;
    const id = this.getIdentity();
    await this.db('PATCH', `users/${this.session.uid}`, { name: id.name || 'Joueur', photo: id.photo || null }).catch(() => {});
    await this.publishFrame().catch(() => {});
    await this.publishLevel().catch(() => {});
    await this.publishCard().catch(() => {});
  }

  /**
   * Friends see the level stored on the server. The rules only let it climb
   * one level at a time (every 10 min, then every hour from level 10), except
   * right after a gift from the admin, so an edited local file cannot show
   * "level 999". The local level is published as fast as the rules allow.
   */
  async publishLevel() {
    if (!this.session) return;
    clearTimeout(this.levelTimer);
    const id = this.getIdentity();
    const want = Math.max(1, Math.min(999, Math.floor(id.level || 1)));
    const me = (await this.db('GET', `users/${this.session.uid}`).catch(() => null)) || this.me || {};
    this.me = me;
    const cur = Number(me.level) || 0;
    if (want === cur) return;
    const now = this.now();
    let target = want;
    if (!id.admin && want > cur) {
      const boosted = me.boostAt && now - me.boostAt < BOOST_MS - 5000;
      if (!cur) target = Math.min(want, FIRST_LEVEL_MAX);
      else if (!boosted) {
        const wait = (me.levelAt || 0) + levelWait(cur) - now;
        if (wait > 0) { this.levelTimer = setTimeout(() => this.publishLevel().catch(() => {}), wait + 5000); return; }
        target = cur + 1;
      }
    }
    try {
      await this.db('PATCH', `users/${this.session.uid}`, { level: target, levelAt: SV_TIME });
    } catch {
      // rules from an older Linkgeek version (no levelAt yet)
      await this.db('PATCH', `users/${this.session.uid}`, { level: target }).catch(() => {});
    }
    this.me = { ...me, level: target, levelAt: now };
    if (target < want) this.levelTimer = setTimeout(() => this.publishLevel().catch(() => {}), levelWait(target) + 5000);
  }

  /** Public card (top 5, achievements, most played game, hours this week) shown on my profile to friends. */
  async publishCard(force) {
    if (!this.session || !this.getCard) return;
    let card;
    try { card = this.getCard(); } catch { return; }
    const key = JSON.stringify(card);
    if (!force && key === this.lastCard) return;
    try {
      await this.db('PUT', `cards/${this.session.uid}`, card);
      this.lastCard = key;
    } catch { /* rules from an older version: ignore */ }
  }

  /** Rank frame around my picture (separate write: older rules would refuse it). */
  async publishFrame() {
    if (!this.session) return;
    const id = this.getIdentity();
    const f = id.frame || null;
    const t = id.title || null; // equipped profile title key
    if (f === this.lastFrame && t === this.lastTitle) return;
    await this.db('PATCH', `users/${this.session.uid}`, { frame: f });
    this.lastFrame = f;
    await this.db('PATCH', `users/${this.session.uid}`, { title: t }).catch(() => {});
    this.lastTitle = t;
  }

  /** The admin flag is only accepted by the server for the admin's Google account (see rules). */
  async publishAdmin() {
    const id = this.getIdentity();
    await this.db('PATCH', `users/${this.session.uid}`, { admin: id.admin ? true : null }).catch(() => {});
  }

  /* ---------- Admin ---------- */
  async resolveCode(code) {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 8) throw new Error('Code ami invalide (format ABCD-1234)');
    const uid = await this.db('GET', `codes/${c.slice(0, 4)}-${c.slice(4)}`);
    if (!uid) throw new Error('Aucun joueur avec ce code');
    return uid;
  }

  /** Sends XP / a level to a player. Refused by the server unless I am the admin. */
  async sendGrant(uid, g) {
    if (!this.session) throw new Error('Connecte-toi au mode en ligne pour gérer les autres joueurs');
    const body = { at: SV_TIME, by: String(this.getIdentity().name || 'Admin').slice(0, 40) };
    if (Number.isFinite(g.xp) && g.xp !== 0) body.xp = Math.max(-100000, Math.min(100000, Math.floor(g.xp)));
    if (Number.isFinite(g.level)) body.level = Math.max(1, Math.min(999, Math.floor(g.level)));
    if (g.note) body.note = String(g.note).slice(0, 120);
    if (Number.isFinite(g.coins) && g.coins !== 0) body.coins = Math.max(-1000000, Math.min(1000000, Math.trunc(g.coins)));
    if (g.ach) { body.ach = String(g.ach).slice(0, 30); body.tier = Math.max(0, Math.min(4, Math.floor(Number(g.tier) || 0))); }
    if (body.xp === undefined && body.level === undefined && body.coins === undefined && body.ach === undefined) throw new Error('Indique de l\'XP, un niveau, des jetons ou un succès');
    await this.db('POST', `grants/${uid}`, body);
    if (body.xp === undefined && body.level === undefined) return;
    // lets the player show their new level right away (see publishLevel)
    const patch = { boostAt: SV_TIME };
    if (body.level !== undefined) { patch.level = body.level; patch.levelAt = SV_TIME; }
    await this.db('PATCH', `users/${uid}`, patch).catch(() => {});
  }

  async setRemoteRanks(ranks) {
    if (!this.session) return false;
    await this.db('PUT', 'config/ranks', ranks);
    return true;
  }

  /** Pending XP gifts for me + the global rank table. Never breaks the friends poll. */
  async pollAdminData() {
    const uid = this.session.uid;
    const [grants, ranks] = await Promise.all([
      this.db('GET', `grants/${uid}`).catch(() => null),
      this.db('GET', 'config/ranks').catch(() => undefined),
    ]);
    if (ranks !== undefined && this.onRanks) this.onRanks(ranks);
    await this.applyGrants(grants);
  }

  async applyGrants(grants) {
    if (!grants || typeof grants !== 'object' || !this.onGrant || this.applying) return;
    this.applying = true;
    try {
      for (const [gid, g] of Object.entries(grants)) {
        // Delete first so a gift is never applied twice
        try { await this.db('DELETE', `grants/${this.session.uid}/${gid}`); } catch { continue; }
        this.onGrant(g || {});
      }
    } finally { this.applying = false; }
  }

  /** Sends presence; called on a timer and whenever activity changes. */
  async heartbeat(force = false) {
    if (!this.session) return;
    const a = this.getActivity();
    const key = JSON.stringify([a.state, a.game && a.game.id]);
    const changed = key !== this.lastActivityKey;
    if (!changed && !force && this.lastBeat && Date.now() - this.lastBeat < HEARTBEAT_MS - 2000) return;
    const body = { state: a.state, game: a.game || null, lastSeen: SV_TIME };
    if (changed || force) body.since = SV_TIME;
    const res = await this.db('PATCH', `presence/${this.session.uid}`, body);
    if (res && typeof res.lastSeen === 'number') this.serverOffset = res.lastSeen - Date.now();
    this.lastActivityKey = key;
    this.lastBeat = Date.now();
    if (changed) this.publishCard().catch(() => {});
  }

  /* ---------- Live streams ---------- */
  openOwnStreams() {
    const uid = this.session.uid;
    const later = (fn) => { clearTimeout(this['t_' + fn]); this['t_' + fn] = setTimeout(() => this[fn]().catch(() => {}), 400); };
    this.stream(`friends/${uid}`, () => later('poll'));
    this.stream(`requests/${uid}`, () => later('poll'));
    this.stream(`grants/${uid}`, () => later('pollAdminData'));
  }

  stream(path, onEvent) {
    if (this.streams.has(path)) return;
    this.streams.set(path, new Stream(this, path, onEvent));
  }

  /** One presence stream per friend: their game / online state shows up instantly. */
  syncFriendStreams() {
    if (!this.session) return;
    const want = new Set(this.friendIds.map((f) => `presence/${f}`));
    for (const [p, s] of this.streams) if (p.startsWith('presence/') && !want.has(p)) { s.close(); this.streams.delete(p); }
    for (const p of want) {
      const fid = p.slice('presence/'.length);
      this.stream(p, (type, path, data) => {
        this.presence[fid] = applyEvent(this.presence[fid], type, path, data);
        clearTimeout(this.rebuildTimer);
        this.rebuildTimer = setTimeout(() => this.rebuild(), 150);
      });
    }
  }

  /* ---------- Friends ---------- */
  async poll() {
    if (!this.session) return;
    const uid = this.session.uid;
    try {
      const [friendIds, reqs] = await Promise.all([
        this.db('GET', `friends/${uid}`),
        this.db('GET', `requests/${uid}`),
      ]);
      this.friendIds = Object.keys(friendIds || {});
      await Promise.all(this.friendIds.map(async (fid) => {
        const [u, p, c] = await Promise.all([
          this.db('GET', `users/${fid}`).catch(() => null),
          this.db('GET', `presence/${fid}`).catch(() => null),
          this.db('GET', `cards/${fid}`).catch(() => null),
        ]);
        this.users[fid] = u;
        this.presence[fid] = p;
        this.cards[fid] = c;
      }));
      this.requests = Object.entries(reqs || {}).map(([from, r]) => ({ uid: from, name: r.name, photo: r.photo || null, at: r.at }));
      this.lastFull = Date.now();
      this.syncFriendStreams();
      this.rebuild();
    } catch (e) {
      this.emit({ status: 'error', error: e.message });
    }
    try { await this.pollAdminData(); } catch { /* ignore */ }
  }

  /** Builds the friends list from what is cached (poll + live streams). */
  rebuild() {
    if (!this.session) return;
    const now = this.now();
    const friends = this.friendIds.map((fid) => {
      const u = this.users[fid];
      const p = this.presence[fid];
      let state = (p && p.state) || 'offline';
      if (!p || !p.lastSeen || now - p.lastSeen > OFFLINE_AFTER_MS) state = 'offline';
      return {
        uid: fid,
        name: (u && u.name) || 'Joueur',
        photo: (u && u.photo) || null,
        level: (u && Number(u.level)) || 1,
        admin: !!(u && u.admin),
        card: this.cards[fid] || null,
        member: (u && Number(u.member)) || null,
        frame: (u && typeof u.frame === 'string' && u.frame) || null,
        title: (u && typeof u.title === 'string' && u.title) || null,
        joinedAt: (u && Number(u.joinedAt)) || null,
        state,
        game: state !== 'offline' && p && p.game ? p.game : null,
        since: p && p.since ? p.since - this.serverOffset : null,
        lastSeen: p && p.lastSeen ? p.lastSeen - this.serverOffset : null,
      };
    });
    this.emit({ status: 'online', friends, requests: this.requests, code: this.code, error: null, live: this.live });
  }

  async addFriend(rawCode) {
    if (!this.session) throw new Error('Connecte-toi d\'abord avec Google');
    const code = normCode(rawCode);
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new Error('Code ami invalide (format : ABCD-1234)');
    if (code === this.code) throw new Error('C\'est ton propre code 🙂');
    const fid = await this.db('GET', `codes/${code}`);
    if (!fid) throw new Error('Aucun joueur avec ce code');
    const me = this.session.uid;
    if (await this.db('GET', `friends/${me}/${fid}`)) throw new Error('Vous êtes déjà amis');
    // They already asked me: accept straight away
    if (await this.db('GET', `requests/${me}/${fid}`)) { await this.accept(fid); return 'accepted'; }
    const id = this.getIdentity();
    await this.db('PUT', `requests/${fid}/${me}`, { name: id.name || 'Joueur', photo: id.photo || null, at: SV_TIME });
    if (this.onSentRequest) this.onSentRequest(fid); // so deleting the account can withdraw it
    return 'sent';
  }

  async accept(fid) {
    const me = this.session.uid;
    // Single atomic multi-path update
    await this.db('PATCH', '', { [`friends/${me}/${fid}`]: true, [`friends/${fid}/${me}`]: true, [`requests/${me}/${fid}`]: null });
    await this.poll();
  }

  async decline(fid) {
    await this.db('DELETE', `requests/${this.session.uid}/${fid}`);
    await this.poll();
  }

  async remove(fid) {
    const me = this.session.uid;
    await this.db('PATCH', '', { [`friends/${me}/${fid}`]: null, [`friends/${fid}/${me}`]: null });
    await this.poll();
  }

  emit(patch) {
    this.snapshot = { ...this.snapshot, ...patch, configured: this.configured, signedIn: !!this.session };
    this.onUpdate(this.snapshot);
  }
}

module.exports = { Online, normCode, applyEvent };

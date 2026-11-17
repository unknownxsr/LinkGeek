/**
 * Messagerie entre amis, on top of the online mode (same Firebase database as src/online.js):
 *
 *   chats/{a_b}/{id}     { from, to, text, at }       a conversation (a_b = the 2 uids, sorted)
 *   inbox/{to}/{from}    { name, photo, last, at }    « you have a new message from … »
 *
 * Only friends can write to each other (Firebase rules). The recipient follows inbox/{me}
 * (live stream): a new entry = a new message → notification + the window reloads the
 * conversation if it is open. What I have read stays on this PC (store.data.chat).
 * Messages are kept KEEP_DAYS (1 week) only: older ones are deleted when a conversation is opened,
 * and every CLEAN_EVERY for all my conversations (either friend can delete them), together with
 * the old entries of my inbox.
 */
const crypto = require('crypto');

const SV_TIME = { '.sv': 'timestamp' };
const MSG_MAX = 500;          // characters per message
const PAGE = 80;              // messages loaded per conversation
const SEND_GAP = 600;         // ms between two messages
const KEEP_DAYS = 7;          // older messages are deleted (keeps the database small)
const CLEAN_EVERY = 6 * 3600000; // cleanup of all my conversations
const DAY = 86400000;

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const httpsOnly = (u) => (typeof u === 'string' && /^https:\/\//.test(u) && u.length <= 500 ? u : null);
/** Message text: no control characters, at most 3 blank lines in a row, trimmed. */
const cleanText = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
  .replace(/\n{4,}/g, '\n\n\n').trim().slice(0, MSG_MAX);
/** Time-ordered id: [a-z0-9], 9 chars of time + 8 random. */
const msgId = () => Date.now().toString(36).padStart(9, '0') + Array.from(crypto.randomBytes(8), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const chatId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

class Chat {
  /**
   * @param {object} o
   * @param {import('./online').Online} o.online
   * @param {object} o.store
   * @param {(event: string, data: object) => void} o.onEvent   'message' (a new message from a friend)
   * @param {(state: object) => void} o.onChange                new state for the window
   */
  constructor(o) {
    Object.assign(this, o);
    this.inbox = {};
    this.openWith = null; // friend whose conversation is shown in the window
    this.started = false;
    this.lastSend = 0;
  }

  get me() { return this.online.session && this.online.session.uid; }
  get local() {
    const d = this.store.data;
    if (!d.chat || typeof d.chat !== 'object') d.chat = {};
    const c = d.chat;
    c.read = c.read && typeof c.read === 'object' ? c.read : {};   // uid -> time of the last message read
    c.last = c.last && typeof c.last === 'object' ? c.last : {};   // uid -> { at, text, mine }
    return c;
  }
  friends() { return this.online.snapshot.friends || []; }
  friend(uid) { return this.friends().find((f) => f.uid === uid) || null; }

  /* ---------- lifecycle ---------- */
  start() {
    if (!this.me || this.started) return;
    this.started = true;
    this.first = true;
    this.online.stream(`inbox/${this.me}`, () => { clearTimeout(this.t); this.t = setTimeout(() => this.pollInbox().catch(() => {}), 300); });
    this.pollInbox().catch(() => {});
    this.timer = setInterval(() => this.pollInbox().catch(() => {}), 60000);
    // old messages: a first cleanup shortly after start-up, then every 6 h
    this.cleanT = setTimeout(() => this.cleanup().catch(() => {}), 20000);
    this.cleanTimer = setInterval(() => this.cleanup().catch(() => {}), CLEAN_EVERY);
  }
  stop() {
    this.started = false;
    clearInterval(this.timer); clearInterval(this.cleanTimer); clearTimeout(this.cleanT);
    this.inbox = {};
    this.changed();
  }

  /** New messages: inbox/{me}/{from} is rewritten by the friend at each message. */
  async pollInbox() {
    if (!this.me) return;
    const raw = (await this.online.db('GET', `inbox/${this.me}`)) || {};
    const l = this.local;
    let changed = false;
    for (const [from, v] of Object.entries(raw)) {
      if (!v || typeof v !== 'object') continue;
      const at = Number(v.at) || 0;
      const e = { from, name: clip(v.name, 40) || 'Un ami', photo: httpsOnly(v.photo), text: clip(v.last, 120), at };
      this.inbox[from] = e;
      const prev = l.last[from];
      if (!prev || at > prev.at) {
        l.last[from] = { at, text: e.text, mine: false };
        changed = true;
        // a message I have not read yet (not on the first look at start-up for old ones already seen)
        if (at > (l.read[from] || 0)) {
          if (this.openWith === from) l.read[from] = at;
          this.onEvent('message', { ...e, open: this.openWith === from, quiet: this.first && Date.now() - at > 12 * 3600000 });
        }
      }
    }
    this.first = false;
    if (changed) this.store.save();
    this.changed();
  }

  state() {
    const l = this.local;
    const list = this.friends().map((f) => {
      const last = l.last[f.uid] || null;
      return {
        uid: f.uid, name: f.name, photo: f.photo || null, state: f.state, game: f.game || null,
        last, unread: !!(last && !last.mine && last.at > (l.read[f.uid] || 0)),
      };
    }).sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0) || a.name.localeCompare(b.name, 'fr'));
    return { signedIn: !!this.me, list, unread: list.filter((x) => x.unread).length, max: MSG_MAX };
  }
  changed() { if (this.onChange) this.onChange(this.state()); }

  /** Loads the conversation with a friend (last PAGE messages) and marks it read. */
  async open(fid) {
    if (!this.me) throw new Error('Connecte-toi au mode en ligne pour discuter avec tes amis');
    if (!this.friend(fid)) throw new Error('Tu ne peux écrire qu\'à tes amis');
    this.openWith = fid;
    const cid = chatId(this.me, fid);
    const raw = (await this.online.db('GET', `chats/${cid}`, undefined, { orderBy: '"at"', limitToLast: PAGE })) || {};
    const old = this.online.now() - KEEP_DAYS * DAY;
    const msgs = [];
    const prune = [];
    for (const [id, m] of Object.entries(raw)) {
      if (!m || typeof m !== 'object' || typeof m.text !== 'string') continue;
      const at = Number(m.at) || 0;
      if (at && at < old) { prune.push(id); continue; }
      msgs.push({ id, mine: m.from === this.me, text: clip(m.text, MSG_MAX), at });
    }
    msgs.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
    for (const id of prune.slice(0, 40)) this.online.db('DELETE', `chats/${cid}/${id}`).catch(() => {});
    const l = this.local;
    const last = msgs[msgs.length - 1];
    if (last && (!l.last[fid] || last.at >= l.last[fid].at)) l.last[fid] = { at: last.at, text: clip(last.text, 120), mine: last.mine };
    if (last) l.read[fid] = Math.max(l.read[fid] || 0, last.at);
    if (l.last[fid]) l.read[fid] = Math.max(l.read[fid] || 0, l.last[fid].at);
    this.store.save();
    this.changed();
    return { friend: fid, messages: msgs };
  }
  close() { this.openWith = null; }

  async send(fid, text) {
    if (!this.me) throw new Error('Connecte-toi au mode en ligne pour discuter avec tes amis');
    const f = this.friend(fid);
    if (!f) throw new Error('Tu ne peux écrire qu\'à tes amis');
    const t = cleanText(text);
    if (!t) throw new Error('Écris un message');
    if (Date.now() - this.lastSend < SEND_GAP) throw new Error('Doucement : un message à la fois');
    this.lastSend = Date.now();
    const id = msgId();
    await this.online.db('PUT', `chats/${chatId(this.me, fid)}/${id}`, { from: this.me, to: fid, text: t, at: SV_TIME });
    const me = this.online.getIdentity();
    const box = { name: clip(me.name || 'Joueur', 40), last: t.replace(/\s+/g, ' ').slice(0, 120), at: SV_TIME };
    const photo = httpsOnly(me.photo);
    if (photo) box.photo = photo;
    await this.online.db('PUT', `inbox/${fid}/${this.me}`, box).catch(() => {});
    const at = this.online.now();
    const l = this.local;
    l.last[fid] = { at, text: t.slice(0, 120), mine: true };
    l.read[fid] = Math.max(l.read[fid] || 0, at);
    this.store.save();
    this.changed();
    return { id, mine: true, text: t, at };
  }

  /**
   * Deletes the messages older than KEEP_DAYS in all my conversations (only the old ones are
   * downloaded: query on "at"), and the inbox entries older than that. Returns how many were deleted.
   */
  async cleanup() {
    if (!this.me) return 0;
    const cutoff = this.online.now() - KEEP_DAYS * DAY;
    let n = 0;
    for (const f of this.friends()) {
      const cid = chatId(this.me, f.uid);
      const old = (await this.online.db('GET', `chats/${cid}`, undefined, { orderBy: '"at"', endAt: cutoff, limitToFirst: 300 }).catch(() => null)) || {};
      const ids = Object.keys(old);
      if (!ids.length) continue;
      // one request per conversation (multi-location delete)
      await this.online.db('PATCH', `chats/${cid}`, Object.fromEntries(ids.map((id) => [id, null]))).catch(() => {});
      n += ids.length;
    }
    const inbox = (await this.online.db('GET', `inbox/${this.me}`).catch(() => null)) || {};
    const oldBox = Object.entries(inbox).filter(([, v]) => v && Number(v.at) < cutoff).map(([k]) => k);
    if (oldBox.length) await this.online.db('PATCH', `inbox/${this.me}`, Object.fromEntries(oldBox.map((k) => [k, null]))).catch(() => {});
    // forget old local previews too
    const l = this.local;
    let changed = false;
    for (const [uid, v] of Object.entries(l.last)) if (v && v.at < cutoff) { delete l.last[uid]; changed = true; }
    if (changed) { this.store.save(); this.changed(); }
    return n;
  }

  /** Account deletion: my inbox and the conversations with my friends. */
  deletePaths() {
    const me = this.me;
    if (!me) return [];
    return [`inbox/${me}`, ...this.friends().map((f) => `chats/${chatId(me, f.uid)}`)];
  }
}

module.exports = { Chat, chatId, cleanText, MSG_MAX, KEEP_DAYS };

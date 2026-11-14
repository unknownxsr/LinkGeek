/**
 * Discord Rich Presence through the local Discord client (named pipe IPC),
 * without any extra dependency. Discord shows the name of the Discord
 * application whose ID is configured (create one called "Linkgeek" at
 * https://discord.com/developers/applications), e.g. "Joue à Linkgeek".
 */
const net = require('net');

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

function encode(op, obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

class DiscordPresence {
  constructor() {
    this.clientId = null;
    this.sock = null;
    this.ready = false;
    this.activity = null;
    this.retry = null;
    this.buf = Buffer.alloc(0);
    this.enabled = false;
  }

  /** Turns the presence on/off and sets the application ID. */
  configure({ enabled, clientId }) {
    const id = /^\d{15,25}$/.test(String(clientId || '')) ? String(clientId) : null;
    const changed = id !== this.clientId;
    this.clientId = id;
    this.enabled = !!(enabled && id);
    if (!this.enabled || changed) this.disconnect();
    if (this.enabled) this.connect();
  }

  connect(n = 0) {
    if (!this.enabled || this.sock) return;
    if (n > 9) { this.scheduleRetry(); return; }
    const sock = net.createConnection(`\\\\?\\pipe\\discord-ipc-${n}`);
    let opened = false;
    sock.once('connect', () => {
      opened = true;
      this.sock = sock;
      sock.write(encode(OP_HANDSHAKE, { v: 1, client_id: this.clientId }));
    });
    sock.on('data', (d) => this.onData(d));
    sock.once('error', () => { if (!opened) { sock.destroy(); this.connect(n + 1); } });
    sock.once('close', () => {
      if (!opened) return;
      this.sock = null; this.ready = false;
      this.scheduleRetry();
    });
  }

  scheduleRetry() {
    clearTimeout(this.retry);
    if (this.enabled) this.retry = setTimeout(() => this.connect(), 30000); // Discord not open yet
  }

  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 8) {
      const op = this.buf.readInt32LE(0);
      const len = this.buf.readInt32LE(4);
      if (this.buf.length < 8 + len) return;
      let msg = null;
      try { msg = JSON.parse(this.buf.slice(8, 8 + len).toString('utf8')); } catch { /* ignore */ }
      this.buf = this.buf.slice(8 + len);
      if (op === OP_PING && this.sock) this.sock.write(encode(OP_PONG, msg));
      else if (op === OP_CLOSE) this.disconnect(true);
      else if (msg && msg.evt === 'READY') { this.ready = true; this.push(); }
    }
  }

  /** game: { name, cover, start } or null when nothing is running. */
  set(game) {
    this.activity = game;
    this.push();
  }

  push() {
    if (!this.ready || !this.sock) return;
    const g = this.activity;
    const activity = g ? {
      details: String(g.name).slice(0, 120),
      state: 'Lancé avec Linkgeek',
      timestamps: g.start ? { start: Math.floor(g.start / 1000) } : undefined,
      assets: {
        ...(g.cover && /^https:\/\//.test(g.cover) ? { large_image: g.cover, large_text: String(g.name).slice(0, 120) } : {}),
      },
      instance: false,
    } : null;
    this.sock.write(encode(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: String(Date.now()) + Math.random() }));
  }

  disconnect(retry) {
    clearTimeout(this.retry);
    if (this.sock) { try { this.sock.destroy(); } catch { /* ignore */ } }
    this.sock = null; this.ready = false; this.buf = Buffer.alloc(0);
    if (retry) this.scheduleRetry();
  }
}

module.exports = { DiscordPresence };

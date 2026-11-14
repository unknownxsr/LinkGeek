const { execFile } = require('child_process');
const path = require('path');

const INTERVAL_MS = 20000;
// Ignore helpers that live in game folders but aren't the game itself
const IGNORED_EXE = /(crashhandler|crashreport|unitycrashhandler|easyanticheat|battleye|uninstall|setup|redist|vc_redist|dxsetup)/i;

function listProcessPaths() {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Get-Process | Where-Object Path | ForEach-Object { $_.Path }'],
    { windowsHide: true, maxBuffer: 1 << 24 }, (err, stdout) => {
      if (err) return resolve([]);
      resolve(stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
    });
  });
}

/**
 * Detects running games by matching process executable paths against each
 * game's install folder. Works whatever the game was launched from.
 */
class Tracker {
  constructor(store, getGames, onChange) {
    this.store = store;
    this.getGames = getGames;
    this.onChange = onChange;
    this.running = new Map(); // gameId -> { start, lastTick }
    this.timer = null;
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), INTERVAL_MS);
  }

  stop() {
    clearInterval(this.timer);
    const now = Date.now();
    for (const id of [...this.running.keys()]) this.finish(id, now, true);
    this.store.flush();
  }

  async tick() {
    const games = this.getGames().filter((g) => g.installDir && g.installDir.length > 3);
    if (!games.length) return;
    const procs = (await listProcessPaths())
      .filter((p) => !IGNORED_EXE.test(path.basename(p)))
      .map((p) => p.toLowerCase());

    const now = Date.now();
    const active = new Set();
    for (const g of games) {
      const dir = g.installDir.toLowerCase().replace(/[\\/]+$/, '') + '\\';
      if (procs.some((p) => p.startsWith(dir))) active.add(g.id);
    }

    let changed = false;
    for (const id of active) {
      const t = this.store.data.tracked[id] || (this.store.data.tracked[id] = { seconds: 0, lastPlayed: 0 });
      const r = this.running.get(id);
      if (r) {
        t.seconds += Math.min(now - r.lastTick, INTERVAL_MS * 3) / 1000;
        r.lastTick = now;
      } else {
        this.running.set(id, { start: now, lastTick: now });
        changed = true;
      }
      t.lastPlayed = now;
    }
    for (const id of [...this.running.keys()]) {
      if (!active.has(id)) { this.finish(id, now); changed = true; }
    }
    if (active.size || changed) this.store.save();
    if (changed) this.onChange([...this.running.keys()]);
  }

  finish(id, now, quitting = false) {
    const r = this.running.get(id);
    if (!r) return;
    this.running.delete(id);
    const end = Math.max(r.lastTick, Math.min(now, r.lastTick + INTERVAL_MS));
    // Game closed within 30 s: secret trophy "Tout ça pour ça" (not when Linkgeek itself quits)
    if (!quitting && end - r.start < 30000) this.store.data.quickSessions = (this.store.data.quickSessions || 0) + 1;
    if (end - r.start >= 30000) {
      this.store.data.sessions.push({ gameId: id, start: r.start, end });
      if (this.store.data.sessions.length > 5000) this.store.data.sessions.splice(0, 1000);
    }
  }

  runningIds() { return [...this.running.keys()]; }
}

module.exports = { Tracker };

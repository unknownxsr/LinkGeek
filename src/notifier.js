/**
 * Overlay notifications: a small transparent window, always on top (games included, in
 * borderless / windowed mode), at the top-right of the screen the player is on.
 * It never takes the focus and lets the clicks through, so it never disturbs the game.
 * Windows hides everything over a game in exclusive fullscreen: there it can't show.
 */
const path = require('path');
const { BrowserWindow, screen } = require('electron');

const W = 380;
const H = 300; // room for 3 stacked notifications
const MARGIN = 12;

class Notifier {
  constructor() { this.win = null; this.ready = null; this.hideTimer = null; }

  ensure() {
    if (this.win && !this.win.isDestroyed()) return this.ready;
    this.win = new BrowserWindow({
      width: W, height: H, show: false, frame: false, transparent: true, backgroundColor: '#00000000',
      resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
      skipTaskbar: true, focusable: false, alwaysOnTop: true, hasShadow: false,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
    });
    this.win.setAlwaysOnTop(true, 'screen-saver');
    this.win.setIgnoreMouseEvents(true);
    try { this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch { /* not on Windows */ }
    this.win.on('closed', () => { this.win = null; this.ready = null; });
    this.ready = this.win.loadFile(path.join(__dirname, '..', 'renderer', 'notify.html'));
    return this.ready;
  }

  /** Top-right of the screen under the mouse (the one the game is on). */
  place() {
    let d;
    try { d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea; } catch { d = screen.getPrimaryDisplay().workArea; }
    this.win.setBounds({ x: Math.round(d.x + d.width - W - MARGIN), y: Math.round(d.y + MARGIN), width: W, height: H });
  }

  async show(n) {
    try { await this.ensure(); } catch { return; }
    if (!this.win || this.win.isDestroyed()) return;
    if (!this.win.isVisible()) this.place();
    this.win.setAlwaysOnTop(true, 'screen-saver');
    if (!this.win.isVisible()) this.win.showInactive();
    else this.win.moveTop();
    try { await this.win.webContents.executeJavaScript(`window.lgNotify(${JSON.stringify(n)})`); } catch { /* ignore */ }
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideWhenEmpty(), (Number(n.duration) || 5500) + 600);
  }

  async hideWhenEmpty() {
    if (!this.win || this.win.isDestroyed()) return;
    let left = 0;
    try { left = await this.win.webContents.executeJavaScript('window.lgCount()'); } catch { /* ignore */ }
    if (left > 0) { this.hideTimer = setTimeout(() => this.hideWhenEmpty(), 1500); return; }
    this.win.hide();
  }

  destroy() { if (this.win && !this.win.isDestroyed()) this.win.destroy(); }
}

module.exports = { Notifier };

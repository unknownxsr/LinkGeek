/**
 * Automatic updates from GitHub Releases (electron-updater).
 * - Checks a few seconds after launch, then every 6 hours.
 * - Downloads in the background; when ready, the window shows a
 *   "Restart to update" toast. If the user ignores it, the update is
 *   installed the next time Linkgeek quits.
 * Only runs in the installed (packaged) app, never in development.
 */
const { app } = require('electron');

const FIRST_CHECK_MS = 10 * 1000;
const EVERY_MS = 6 * 60 * 60 * 1000;

function setupUpdater({ send, notify, beforeInstall }) {
  if (!app.isPackaged) return { install: async () => {}, check: async () => null };

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    console.error('electron-updater missing', e);
    return { install: async () => {}, check: async () => null };
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  let ready = null;

  autoUpdater.on('update-downloaded', (info) => {
    ready = info.version;
    send('update:ready', ready);
    notify(ready);
  });
  autoUpdater.on('error', (e) => console.error('update error', e && e.message));

  const check = () => autoUpdater.checkForUpdates().catch((e) => console.error('update check failed', e && e.message));
  setTimeout(check, FIRST_CHECK_MS);
  setInterval(check, EVERY_MS);

  return {
    check,
    get ready() { return ready; },
    async install() {
      if (!ready) return;
      await beforeInstall();
      // silent install, then relaunch Linkgeek
      autoUpdater.quitAndInstall(true, true);
    },
  };
}

module.exports = { setupUpdater };

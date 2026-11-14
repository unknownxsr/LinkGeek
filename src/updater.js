/**
 * In-launcher updates, from the GitHub release's .zip ("Linkgeek-Setup-x.y.z.zip").
 *
 * Why the .zip and not the .exe installer: it works for every kind of install
 * (the .exe one and the .zip / install.ps1 one) and never launches an unsigned
 * installer, which Smart App Control blocks on some PCs.
 *
 * Flow:
 *  1. check   – GitHub API "latest release" → newer version with a Linkgeek-Setup-*.zip asset?
 *  2. download – to %TEMP%\linkgeek-update\<version>\, with progress; size (and SHA-256 when
 *               GitHub gives it) verified.
 *  3. extract – PowerShell Expand-Archive; the extracted app must contain Linkgeek.exe and
 *               the expected version.
 *  4. apply   – on "Redémarrer" (or when Linkgeek quits): a small hidden PowerShell script waits
 *               for Linkgeek to close, copies the new files over the current install folder,
 *               then relaunches Linkgeek (not when the update is applied on quit).
 * Checks 10 s after launch, then every 6 h; downloads automatically.
 * Only runs in the installed app, or in development when LINKGEEK_UPDATE_API is set (tests).
 */
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const OWNER = 'unknownxsr';
const REPO = 'linkgeek';
const API = process.env.LINKGEEK_UPDATE_API || `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const FIRST_CHECK_MS = 10 * 1000;
const EVERY_MS = 6 * 60 * 60 * 1000;
const ZIP_RE = /^Linkgeek-Setup-[\d.]+\.zip$/i;

const cmpVer = (a, b) => {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};
const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const runPs = (script) => new Promise((resolve, reject) => {
  const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('error', reject);
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `PowerShell ${code}`))));
});

function setupUpdater({ send, notify, beforeInstall }) {
  const enabled = app.isPackaged || !!process.env.LINKGEEK_UPDATE_API;
  const root = path.join(os.tmpdir(), 'linkgeek-update');
  const resultFile = path.join(app.getPath('userData'), 'update-result.json');
  let st = { state: enabled ? 'idle' : 'dev', current: app.getVersion(), checkedAt: null };
  let busy = null;
  let release = null; // { version, notes, url, asset }

  const set = (patch) => {
    st = { ...st, ...patch, current: app.getVersion() };
    send('update:state', st);
    if (patch.state === 'ready') { send('update:ready', st.version); notify(st.version); }
  };

  // result of an update applied by the helper script at the previous launch
  try {
    const r = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    fs.unlinkSync(resultFile);
    if (r && r.ok === false) st.lastError = `La mise à jour ${r.version || ''} n'a pas pu être installée (${r.error || 'erreur inconnue'})`;
    else if (r && r.ok && cmpVer(app.getVersion(), r.version) >= 0) st.justUpdated = r.version;
  } catch { /* nothing to report */ }

  async function fetchLatest() {
    const res = await fetch(API, { headers: { 'User-Agent': 'Linkgeek-Updater', Accept: 'application/vnd.github+json' } });
    if (res.status === 404) return null; // no release published yet
    if (!res.ok) throw new Error(`GitHub a répondu ${res.status}`);
    const j = await res.json();
    const version = String(j.tag_name || j.name || '').replace(/^v/i, '').trim();
    const asset = (j.assets || []).find((a) => ZIP_RE.test(a.name || ''));
    return { version, notes: String(j.body || '').slice(0, 4000), url: j.html_url || null, publishedAt: j.published_at || null, asset };
  }

  async function download(asset, dir) {
    const file = path.join(dir, asset.name);
    const res = await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'Linkgeek-Updater', Accept: 'application/octet-stream' } });
    if (!res.ok || !res.body) throw new Error(`Téléchargement impossible (${res.status})`);
    const total = Number(asset.size) || Number(res.headers.get('content-length')) || 0;
    const out = fs.createWriteStream(file);
    const hash = crypto.createHash('sha256');
    let got = 0, lastSent = 0;
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const buf = Buffer.from(value);
        got += buf.length;
        hash.update(buf);
        if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
        const now = Date.now();
        if (now - lastSent > 250) { lastSent = now; set({ state: 'downloading', received: got, total, pct: total ? Math.min(99, Math.round((got / total) * 100)) : null }); }
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    if (total && got !== total) throw new Error('Fichier incomplet');
    const digest = String(asset.digest || '');
    if (digest.startsWith('sha256:') && digest.slice(7).toLowerCase() !== hash.digest('hex')) throw new Error('Fichier corrompu (empreinte SHA-256 différente)');
    return file;
  }

  async function check({ manual = false } = {}) {
    if (!enabled) { set({ state: 'dev' }); return st; }
    if (busy) return st;
    if (st.state === 'ready') return st;
    busy = (async () => {
      set({ state: 'checking', error: null });
      try {
        const rel = await fetchLatest();
        const checkedAt = Date.now();
        if (!rel || !rel.version || cmpVer(rel.version, app.getVersion()) <= 0) { set({ state: 'uptodate', checkedAt, latest: rel ? rel.version : null }); return; }
        if (!rel.asset) { set({ state: 'error', checkedAt, error: `La version ${rel.version} est publiée sans le fichier .zip de mise à jour` }); return; }
        release = rel;
        set({ state: 'downloading', checkedAt, version: rel.version, notes: rel.notes, url: rel.url, received: 0, total: rel.asset.size || 0, pct: 0 });
        const dir = path.join(root, rel.version);
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const zip = await download(rel.asset, dir);
        set({ state: 'extracting', pct: 100 });
        const ex = path.join(dir, 'x');
        await runPs(`Expand-Archive -LiteralPath ${psQuote(zip)} -DestinationPath ${psQuote(ex)} -Force`);
        const appDir = path.join(ex, 'app');
        if (!fs.existsSync(path.join(appDir, 'Linkgeek.exe'))) throw new Error('Archive invalide (Linkgeek.exe introuvable)');
        let v = null;
        try { v = JSON.parse(fs.readFileSync(path.join(appDir, 'resources', 'app', 'package.json'), 'utf8')).version; } catch { /* checked below */ }
        if (v !== rel.version) throw new Error(`Archive invalide (version ${v || '?'} au lieu de ${rel.version})`);
        release.appDir = appDir;
        set({ state: 'ready', version: rel.version });
      } catch (e) {
        console.error('update failed', e && e.message);
        set({ state: 'error', error: (e && e.message) || String(e), manual });
      } finally {
        busy = null;
      }
    })();
    await busy;
    return st;
  }

  /** Writes and starts the helper script; Linkgeek must quit right after. */
  function launchHelper(relaunch, testDir = null) {
    const installDir = testDir || path.dirname(process.execPath);
    const exe = testDir ? path.join(testDir, 'Linkgeek.exe') : process.execPath;
    const log = path.join(root, 'update.log');
    const script = path.join(root, 'apply-update.ps1');
    const ps = `$ErrorActionPreference = 'Stop'
$src = ${psQuote(release.appDir)}; $dst = ${psQuote(installDir)}; $exe = ${psQuote(exe)}
$result = ${psQuote(resultFile)}; $ver = ${psQuote(release.version)}
Start-Transcript -Path ${psQuote(log)} -Force | Out-Null
try {
  # wait for Linkgeek to close (max 30 s), then make sure nothing is left running from the install folder
  try { Wait-Process -Id ${process.pid} -Timeout 30 -ErrorAction SilentlyContinue } catch { }
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($dst, [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
  robocopy $src $dst /E /R:3 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "copie des fichiers impossible (robocopy $LASTEXITCODE)" }
  robocopy (Join-Path $src 'resources\\app') (Join-Path $dst 'resources\\app') /MIR /R:3 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "copie du code impossible (robocopy $LASTEXITCODE)" }
  $key = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Linkgeek'
  if ((Test-Path $key) -and ((Get-ItemProperty $key).InstallLocation -eq $dst)) { Set-ItemProperty $key -Name DisplayVersion -Value $ver }
  @{ ok = $true; version = $ver } | ConvertTo-Json | Set-Content -Path $result -Encoding UTF8
} catch {
  @{ ok = $false; version = $ver; error = "$_" } | ConvertTo-Json | Set-Content -Path $result -Encoding UTF8
}
Stop-Transcript | Out-Null
${relaunch ? 'Start-Process -FilePath $exe' : ''}
`;
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(script, '﻿' + ps, 'utf8');
    const cmd = `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${script}"`;
    // Started through WMI so it is not a child of Linkgeek and survives it closing;
    // falls back to a detached child process.
    return runPs(`$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${psQuote(cmd)} }; if ($r.ReturnValue -ne 0) { exit 1 }`)
      .catch(() => {
        const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', script], { detached: true, stdio: 'ignore', windowsHide: true });
        p.unref();
      });
  }

  let applied = false;
  /** Restart now and install. */
  async function install() {
    if (st.state !== 'ready' || !release || !release.appDir || applied) return false;
    applied = true;
    set({ state: 'installing' });
    if (!app.isPackaged) { // tests only: never touch the Electron used in development
      console.log('[update] would apply', release.version, 'from', release.appDir);
      if (process.env.LINKGEEK_UPDATE_TEST_DIR) await launchHelper(false, process.env.LINKGEEK_UPDATE_TEST_DIR);
      return true;
    }
    await beforeInstall();
    await launchHelper(true);
    app.quit();
    return true;
  }
  /** Linkgeek is quitting with a downloaded update: install it, without relaunching. */
  function installOnQuit() {
    if (st.state !== 'ready' || !release || !release.appDir || applied || !app.isPackaged) return;
    applied = true;
    try { launchHelper(false); } catch (e) { console.error('update on quit failed', e && e.message); }
  }

  if (enabled) {
    setTimeout(() => check(), FIRST_CHECK_MS);
    setInterval(() => check(), EVERY_MS);
  }

  return {
    check,
    install,
    installOnQuit,
    status: () => st,
    get ready() { return st.state === 'ready' ? st.version : null; },
  };
}

module.exports = { setupUpdater, cmpVer };

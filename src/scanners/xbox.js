const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function localImg(p) {
  return p && fs.existsSync(p) ? 'nexus-img://local/?p=' + encodeURIComponent(p) : null;
}

function attr(xml, tag, name) {
  const re = new RegExp(`<${tag}\\b[^>]*?\\b${name}="([^"]*)"`, 's');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function decodeXml(s) {
  return s && s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function listPackages() {
  const ps = `
$ErrorActionPreference='SilentlyContinue'
Get-AppxPackage | Where-Object { $_.InstallLocation -and -not $_.IsFramework -and (Test-Path (Join-Path $_.InstallLocation 'MicrosoftGame.config')) } |
  Select-Object Name, PackageFamilyName, InstallLocation | ConvertTo-Json -Compress`;
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, maxBuffer: 1 << 24 }, (err, stdout) => {
      if (err || !stdout.trim()) return resolve([]);
      try {
        const data = JSON.parse(stdout);
        resolve(Array.isArray(data) ? data : [data]);
      } catch { resolve([]); }
    });
  });
}

async function scanXbox() {
  const pkgs = await listPackages();
  const games = [];
  for (const p of pkgs) {
    const dir = p.InstallLocation;
    let xml;
    try { xml = fs.readFileSync(path.join(dir, 'MicrosoftGame.config'), 'utf8'); } catch { continue; }

    let name = decodeXml(attr(xml, 'ShellVisuals', 'DefaultDisplayName'));
    if (!name || name.startsWith('ms-resource')) name = p.Name.split('.').slice(1).join(' ') || p.Name;
    const publisher = decodeXml(attr(xml, 'ShellVisuals', 'PublisherDisplayName'));
    const description = decodeXml(attr(xml, 'ShellVisuals', 'Description'));
    const logo480 = attr(xml, 'ShellVisuals', 'Square480x480Logo');
    const logo150 = attr(xml, 'ShellVisuals', 'Square150x150Logo');
    const splash = attr(xml, 'ShellVisuals', 'SplashScreenImage');
    const bg = attr(xml, 'ShellVisuals', 'BackgroundColor');
    const exeId = attr(xml, 'Executable', 'Id') || 'Game';
    const exeName = attr(xml, 'Executable', 'Name');

    const square = localImg(logo480 && path.join(dir, logo480)) || localImg(logo150 && path.join(dir, logo150));
    games.push({
      id: 'xbox:' + p.PackageFamilyName,
      source: 'xbox',
      sourceLabel: 'Xbox / Game Pass',
      name,
      publisher,
      description: description && !description.startsWith('ms-resource') ? description : null,
      installDir: dir,
      exePath: exeName ? path.join(dir, exeName) : null,
      sizeBytes: null, // computed asynchronously
      platformPlaytimeSec: 0,
      lastPlayed: 0,
      cover: square,
      coverStyle: 'square',
      coverBg: bg && bg !== 'transparent' ? bg : null,
      hero: localImg(splash && path.join(dir, splash)),
      logo: null,
      launch: { type: 'shell', target: `shell:AppsFolder\\${p.PackageFamilyName}!${exeId}` },
    });
  }
  return games;
}

module.exports = { scanXbox };

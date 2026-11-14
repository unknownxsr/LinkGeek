/* Linkgeek — renderer */
const api = window.nexus;

const state = {
  cmpFriends: (() => { try { return localStorage.getItem('linkgeek-cmp-friends') === '1'; } catch { return false; } })(),
  games: [],
  profile: null,
  running: new Set(),
  view: 'home',
  gameId: null,
  prevView: 'library',
  q: '',
  source: 'all',
  sort: 'recent',
  collection: null,
  news: {},          // gameId -> { steam, items }
  newsOpen: null,    // id of the announcement shown in full
  recentNews: null,
  collections: {},
  friendProfile: null,
  friendsTab: 'list',
  board: 'week',
  showHidden: false,
  tableSort: { key: 'playtimeSec', dir: -1 },
  settings: null,
  settingsTab: 'appearance',
  friends: { status: 'disconnected', friends: [], requests: [], code: null },
  friendQuery: '',
  ach: null,
  achFilter: 'all',
  chal: null,
  signingIn: false,
  stats: null,
  loaded: false,
};

const SOURCES = {
  steam: { label: 'Steam', color: '#5fb4ec' },
  epic: { label: 'Epic Games', color: '#d7dbe3' },
  xbox: { label: 'Xbox / Game Pass', color: '#3ddc84' },
  battlenet: { label: 'Battle.net', color: '#148eff' },
  ubisoft: { label: 'Ubisoft Connect', color: '#a9b4ff' },
  ea: { label: 'EA app', color: '#ff4747' },
  gog: { label: 'GOG', color: '#b16cf0' },
  manual: { label: 'Ajoutés', color: '#f5a524' },
};

/* ---------------- Icons ---------------- */
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  disk: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18"/><path d="M16.5 17h.01"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  pad: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 20h8M9 17h6"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
};

/* ---------------- Formatting ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtTime(sec, empty = 'Jamais joué') {
  if (!sec || sec < 60) return sec > 0 ? '< 1 min' : empty;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h >= 100) return `${h.toLocaleString('fr-FR')} h`;
  if (h > 0) return m ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}
function fmtHours(sec) {
  const h = sec / 3600;
  return h >= 10 ? `${Math.round(h).toLocaleString('fr-FR')} h` : `${h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`;
}
function fmtSize(b) {
  if (!b) return '—';
  const u = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toLocaleString('fr-FR', { maximumFractionDigits: b < 10 ? 1 : 0 })} ${u[i]}`;
}
function fmtAgo(ms) {
  if (!ms) return 'Jamais';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return "À l'instant";
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`;
  const days = Math.floor(d / 86400);
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------- Images ---------------- */
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function initials(name) { return name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'; }
function placeholder(g, big = false) {
  const h = hue(g.name);
  const style = `background: linear-gradient(145deg, hsl(${h} 55% 32%), hsl(${(h + 50) % 360} 60% 16%)); font-size: ${big ? 28 : 15}px;`;
  if (g.icon) return `<div class="placeholder" style="${style}"><img class="exe-icon" src="${esc(g.icon)}" alt=""></div>`;
  return `<div class="placeholder" style="${style}">${big ? esc(g.name) : esc(initials(g.name))}</div>`;
}
function coverSources(g) { return [g.cover, g.source === 'steam' ? g.header : null].filter(Boolean); }

function coverHtml(g, cls = 'cover') {
  const srcs = coverSources(g);
  const square = g.coverStyle === 'square';
  if (!srcs.length) return `<div class="${cls}">${placeholder(g, cls === 'cover')}</div>`;
  const bg = square && g.coverBg ? `style="background:${esc(g.coverBg)}"` : '';
  const backdrop = square && cls === 'cover' ? `<div class="backdrop" style="background-image:url('${esc(srcs[0])}')"></div>` : '';
  return `<div class="${cls}${square ? ' square' : ''}" ${bg}>${backdrop}<img loading="lazy" src="${esc(srcs[0])}" data-fb='${esc(JSON.stringify(srcs.slice(1)))}' data-gid="${esc(g.id)}" alt=""></div>`;
}
function heroSrc(g) { return g.hero || (g.source === 'steam' ? g.header : null) || g.cover; }

// Fallback chain for broken images
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.classList.contains('hero-logo')) {
    const h = document.createElement('h1'); h.textContent = img.alt; img.replaceWith(h); return;
  }
  if (!(img instanceof HTMLImageElement) || !img.dataset.gid) return;
  let fb = [];
  try { fb = JSON.parse(img.dataset.fb || '[]'); } catch { /* ignore */ }
  if (fb.length) { img.dataset.fb = JSON.stringify(fb.slice(1)); img.src = fb[0]; return; }
  const g = state.games.find((x) => x.id === img.dataset.gid);
  const box = img.parentElement;
  if (g && box) { box.classList.remove('square'); box.innerHTML = placeholder(g, box.classList.contains('cover')); }
}, true);

/* ---------------- Helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const visibleGames = () => state.games.filter((g) => state.showHidden || !g.hidden);
const byId = (id) => state.games.find((g) => g.id === id);

/** keep = also store it in the notification centre (plain confirmations are not kept). */
function toast(msg, err = false, keep = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '') + (keep ? ' keep' : '');
  t.innerHTML = (err ? '⚠️ ' : '') + esc(msg);
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2800);
  setTimeout(() => t.remove(), 3200);
}

/* ---------------- Notification centre (bell next to the logo) ----------------
 * Every important toast (challenges, levels, tokens, trophies, titles, friends,
 * updates, wheel prizes) is copied here and kept on this PC (last 60). */
const NOTIF_KEY = 'linkgeek-notifs';
const NOTIF_NAV = [['f-toast', 'friends'], ['coin-toast', 'shop'], ['title-toast', 'shop'], ['lvup', 'challenges'], ['ch', 'challenges'], ['update', 'settings'], ['ach', 'achievements'], ['keep', 'shop']];
const notifs = (() => { try { const l = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } })();
const saveNotifs = () => { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 60))); } catch { /* ignore */ } };

function recordToast(t) {
  const cls = t.className;
  if (!/\b(ach|coin-toast|f-toast|update|keep)\b/.test(cls) || /\berr\b/.test(cls)) return;
  const copy = t.cloneNode(true);
  copy.querySelectorAll('button, script').forEach((b) => b.remove()); // no dead buttons in the list
  const nav = (NOTIF_NAV.find(([c]) => new RegExp(`\\b${c}\\b`).test(cls)) || [])[1] || null;
  notifs.unshift({ at: Date.now(), cls: cls.replace(/\btoast\b/, '').trim(), html: copy.innerHTML, nav, read: false });
  notifs.length = Math.min(notifs.length, 60);
  saveNotifs();
  renderNotifs();
}

function renderNotifs() {
  const unread = notifs.filter((n) => !n.read).length;
  const c = $('#notif-count');
  if (c) { c.textContent = unread > 9 ? '9+' : unread || ''; c.classList.toggle('on', unread > 0); }
  const p = $('#notif-panel');
  if (!p || p.hidden) return;
  p.innerHTML = `<div class="np-head"><b>Notifications</b>${notifs.length ? '<button class="link" data-notif-clear>Tout effacer</button>' : ''}</div>
    <div class="np-list">${notifs.length ? notifs.map((n, i) => `<div class="np-item ${n.read ? '' : 'unread'} ${esc(n.cls)}" ${n.nav ? `data-notif-go="${i}"` : ''}>
        <div class="np-body">${n.html}</div><small class="np-when">${esc(fmtAgo(n.at))}</small></div>`).join('')
      : `<div class="np-empty"><svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><b>Aucune notification</b><span>Tes défis, niveaux, jetons, succès et l'activité de tes amis apparaîtront ici.</span></div>`}</div>`;
}

function toggleNotifs(open) {
  const p = $('#notif-panel');
  if (!p) return;
  p.hidden = open === undefined ? !p.hidden : !open;
  renderNotifs();
  if (!p.hidden) {
    // opening marks everything as read (the dots stay visible until next opening)
    setTimeout(() => { notifs.forEach((n) => { n.read = true; }); saveNotifs(); const c = $('#notif-count'); if (c) { c.textContent = ''; c.classList.remove('on'); } }, 400);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#notif-bell')) { toggleNotifs(); return; }
  const item = e.target.closest('[data-notif-go]');
  if (item) { const n = notifs[Number(item.dataset.notifGo)]; toggleNotifs(false); if (n && n.nav) go(n.nav); return; }
  if (e.target.closest('[data-notif-clear]')) { notifs.length = 0; saveNotifs(); renderNotifs(); return; }
  const p = $('#notif-panel');
  if (p && !p.hidden && !e.target.closest('.notif-wrap')) toggleNotifs(false);
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const p = $('#notif-panel'); if (p && !p.hidden) toggleNotifs(false); } });
new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('toast')) recordToast(n); })
  .observe($('#toasts'), { childList: true });
renderNotifs();

function filteredGames() {
  const q = state.q.trim().toLowerCase();
  let list = visibleGames();
  if (state.source === 'fav') list = list.filter((g) => g.favorite);
  else if (state.source !== 'all') list = list.filter((g) => g.source === state.source);
  if (state.collection) list = list.filter((g) => (g.collections || []).includes(state.collection));
  if (q) list = list.filter((g) => g.name.toLowerCase().includes(q) || (g.publisher || '').toLowerCase().includes(q));
  const sorters = {
    added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0) || a.name.localeCompare(b.name),
    recent: (a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    playtime: (a, b) => b.playtimeSec - a.playtimeSec,
    size: (a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0),
  };
  return list.sort(sorters[state.sort]);
}

/* ---------------- Sidebar ---------------- */
/**
 * Friends see a custom profile picture through a small JPEG (128 px, square crop)
 * made here on a canvas (works for PNG, JPG, WebP and GIF), then sent online by main.
 */
async function ensureAvatarShare() {
  if (state.avatarSharing || !state.profile || !state.profile.needsAvatarShare) return;
  state.avatarSharing = true;
  try {
    const r = await api.avatarBytes();
    if (!r) return;
    const bmp = await createImageBitmap(new Blob([r.bytes]));
    const S = 128, side = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1e29'; ctx.fillRect(0, 0, S, S); // transparent PNG: no black background
    ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, S, S);
    let q = 0.85, data = c.toDataURL('image/jpeg', q);
    while (data.length > 58000 && q > 0.3) { q -= 0.15; data = c.toDataURL('image/jpeg', q); }
    await api.setAvatarShare(data, r.src);
    state.profile.needsAvatarShare = false;
  } catch (e) { console.warn('avatar share', e); } finally { state.avatarSharing = false; }
}

function renderSidebar() {
  const p = state.profile;
  if (p && p.needsAvatarShare) ensureAvatarShare();
  const name = p && p.name ? p.name : 'Joueur';
  const total = state.games.reduce((a, g) => a + g.playtimeSec, 0);
  const lv = p && p.level;
  $('#profile').innerHTML = `
    ${avatarHtml('avatar')}
    <div class="who"><div class="who-name"><b>${esc(name)}</b>${lv ? levelBadge(lv.level, 'sm') : ''}${p && p.admin ? adminTag() : ''}${p && p.ultimate ? ultimateBadge() : ''}</div>${p && p.title ? `<span class="who-title" title="Niveau ${lv ? lv.level : 1}${lv ? ` · ${esc(lv.rankName)}` : ''}">« ${esc(p.title.name)} »</span>` : `<span>${lv ? `Niveau ${lv.level} · ${esc(lv.rankName)}` : `${fmtHours(total)} de jeu au total`}</span>`}</div>
    <span class="edit-hint" data-edit-profile title="Modifier le profil">${I.edit}</span>`;
  $('#profile').classList.toggle('active', state.view === 'profile');

  document.querySelectorAll('#nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === state.view || (state.view === 'game' && b.dataset.view === state.prevView));
  });
  $('#nav-count').textContent = visibleGames().length || '';
  const fr = state.friends;
  const onlineCount = (fr.friends || []).filter((f) => f.state !== 'offline').length;
  const reqCount = (fr.requests || []).length;
  const badge = $('#nav-friends');
  badge.textContent = reqCount ? reqCount : (onlineCount || '');
  badge.className = 'count' + (reqCount ? ' alert' : onlineCount ? ' live' : '');
  badge.title = reqCount ? `${reqCount} demande(s) d'ami` : onlineCount ? `${onlineCount} ami(s) en ligne` : '';
  $('#nav-ach').textContent = state.ach ? `${state.ach.unlocked}/${state.ach.total}` : '';
  $('#nav-shop').textContent = state.shop ? fmtCoins(state.shop.coins) : '';
  $('#nav-shop').title = state.shop ? `${fmtCoins(state.shop.coins)} jetons` : '';
  const left = state.chal ? state.chal.daily.items.filter((c) => !c.doneAt).length : 0;
  const nc = $('#nav-chal');
  nc.textContent = left || (state.chal ? '✓' : '');
  nc.className = 'count' + (left ? ' todo' : state.chal ? ' live' : '');
  nc.title = left ? `${left} défi(s) du jour restant(s)` : state.chal ? 'Défis du jour terminés' : '';

  const recents = visibleGames().filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 8);
  $('#recents').innerHTML = recents.length ? recents.map((g) => `
    <button class="recent" data-open="${esc(g.id)}">
      ${coverHtml(g, 'thumb')}
      <div class="meta"><b>${esc(g.name)}</b><span>${state.running.has(g.id) ? '<span style="color:var(--good)">● En cours</span>' : esc(fmtAgo(g.lastPlayed))}</span></div>
    </button>`).join('') : '<div style="padding:8px 12px;color:var(--faint);font-size:12.5px">Aucun jeu lancé récemment</div>';
}

/* ---------------- Cards ---------------- */
function gameCard(g) {
  const running = state.running.has(g.id);
  return `
  <div class="card" tabindex="0" data-open="${esc(g.id)}">
    <div class="cover-wrap" style="position:relative">
      ${coverHtml(g)}
      <div class="badges">
        ${running ? '<span class="chip live">En cours</span>' : g.newsNew ? '<span class="chip news" title="Une mise à jour ou une annonce est sortie depuis ta dernière partie">Nouveau</span>' : '<span></span>'}
        ${g.favorite ? `<span class="star-mini">${I.star}</span>` : ''}
      </div>
      <div class="overlay">
        <button class="play-fab" data-launch="${esc(g.id)}" title="Jouer">${I.play}</button>
        <button class="fav-btn ${g.favorite ? 'on' : ''}" data-fav="${esc(g.id)}" title="Favori">${I.star}</button>
      </div>
    </div>
    <div class="info">
      <div class="title" title="${esc(g.name)}">${esc(g.name)}</div>
      <div class="meta"><span class="dot ${g.source}"></span>${esc(playLabel(g))}${g.sizeBytes ? `<span class="sep"></span>${fmtSize(g.sizeBytes)}` : ''}</div>
    </div>
  </div>`;
}

function wideCard(g) {
  return `
  <button class="wide-card" data-open="${esc(g.id)}">
    <div class="bg" style="background-image:url('${esc(heroSrc(g) || '')}')"></div>
    <div class="shade"></div>
    <div class="txt"><b>${esc(g.name)}</b><span>${state.running.has(g.id) ? 'En cours' : esc(fmtAgo(g.lastPlayed))} · ${esc(fmtTime(g.playtimeSec))}</span></div>
    <span class="play-fab" data-launch="${esc(g.id)}">${I.play}</span>
  </button>`;
}

function kpi(icon, label, value, hint = '') {
  return `<div class="kpi"><div class="label">${icon}${esc(label)}</div><div class="value" title="${esc(value)}">${esc(value)}</div>${hint ? `<div class="hint" title="${esc(hint)}">${esc(hint)}</div>` : ''}</div>`;
}

function totals(list = visibleGames()) {
  const time = list.reduce((a, g) => a + g.playtimeSec, 0);
  const size = list.reduce((a, g) => a + (g.sizeBytes || 0), 0);
  const top = [...list].sort((a, b) => b.playtimeSec - a.playtimeSec)[0];
  return { time, size, top, count: list.length };
}

/* ---------------- Views ---------------- */
function viewHome() {
  const games = visibleGames();
  if (!games.length) return state.loaded ? emptyLibrary() : loadingView();
  const recent = [...games].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  const t = totals(games);
  const favs = games.filter((g) => g.favorite);
  state.heroList = heroGames(games, recent);
  if (!(state.heroIdx < state.heroList.length)) state.heroIdx = 0;

  return `
  <div class="page">
    <section class="hero">${heroInner(state.heroList[state.heroIdx], state.heroIdx, state.heroList.length)}</section>

    <button class="home-stats" data-nav="stats" title="Voir les statistiques">
      <div><b>${fmtHours(t.time)}</b><span>de jeu au total</span></div>
      <div><b>${t.count}</b><span>jeux installés</span></div>
      <div><b>${fmtSize(t.size)}</b><span>sur le disque</span></div>
      <div><b title="${esc(t.top && t.top.playtimeSec ? t.top.name : '')}">${esc(t.top && t.top.playtimeSec ? t.top.name : '—')}</b><span>le plus joué</span></div>
      <i>Statistiques →</i>
    </button>

    ${weeklyBoardSection()}

    <div class="home-split">
      ${recentNewsSection()}
      ${infoPanel()}
    </div>

    ${recoSection()}

    ${favs.length ? `
    <section class="section">
      <div class="section-head"><div><h2>Favoris</h2><div class="sub">${favs.length} jeu${favs.length > 1 ? 'x' : ''}</div></div>${favs.length > 6 ? '<button class="link" data-nav="library">Tout voir →</button>' : ''}</div>
      <div class="grid">${favs.slice(0, 6).map(gameCard).join('')}</div>
    </section>` : ''}
  </div>`;
}

/* ---- Home: hero carousel (5 games, a new one every 5 s, in a loop) ---- */
const HERO_COUNT = 5, HERO_MS = 5000;
/** Running game first, then the most recently played ones (games with artwork preferred). */
function heroGames(games, recent) {
  const list = [];
  const add = (g) => { if (g && !list.includes(g) && list.length < HERO_COUNT) list.push(g); };
  games.filter((g) => state.running.has(g.id)).forEach(add);
  recent.filter((g) => heroSrc(g)).forEach(add);
  recent.forEach(add);
  return list;
}
function heroInner(g, idx, n) {
  const running = state.running.has(g.id);
  if (!state.heroAt) state.heroAt = Date.now();
  const elapsed = Math.min(HERO_MS, Math.max(0, Date.now() - state.heroAt)); // keeps the progress bar in step after a re-render
  return `<div class="hero-bg" style="background-image:url('${esc(heroSrc(g) || '')}')"></div>
    <div class="hero-content">
      <div class="eyebrow">${running ? '<span class="chip live">En cours</span>' : `<span class="dot ${g.source}"></span>${g.lastPlayed ? (idx === 0 ? 'Reprendre la partie' : 'Joué récemment') : 'À découvrir'}`}</div>
      ${g.logo ? `<img class="hero-logo" src="${esc(g.logo)}" alt="${esc(g.name)}">` : `<h1>${esc(g.name)}</h1>`}
      <div class="hero-meta">
        <span>${I.clock}${esc(fmtTime(g.playtimeSec))}</span>
        <span>${I.calendar}${esc(fmtAgo(g.lastPlayed))}</span>
        ${g.sizeBytes ? `<span>${I.disk}${fmtSize(g.sizeBytes)}</span>` : ''}
      </div>
      <div class="actions">
        ${playButton(g)}
        <button class="btn-glass" data-open="${esc(g.id)}">Détails</button>
        <button class="btn-glass square ${g.favorite ? 'on' : ''}" data-fav="${esc(g.id)}" title="Favori">${I.star}</button>
      </div>
    </div>
    ${n > 1 ? `<div class="hero-dots">${Array.from({ length: n }, (_, i) => `<button class="${i === idx ? 'on' : ''}" data-hero-dot="${i}" aria-label="Jeu ${i + 1}">${i === idx ? `<i style="animation-delay:-${elapsed}ms"></i>` : ''}</button>`).join('')}</div>` : ''}`;
}
/** Swaps only the hero (no full re-render), with a short fade. */
function showHero(i) {
  const el = $('.hero');
  const list = state.heroList || [];
  if (!el || state.view !== 'home' || list.length < 2) return;
  state.heroIdx = (i + list.length) % list.length;
  state.heroAt = Date.now();
  el.classList.add('fading');
  setTimeout(() => {
    el.innerHTML = heroInner(list[state.heroIdx], state.heroIdx, list.length);
    el.classList.remove('fading');
  }, 280);
}
setInterval(() => {
  const el = $('.hero');
  if (!el || state.view !== 'home') return;
  // paused while hovered / hidden / a dialog is open: push the deadline back
  if (document.hidden || el.matches(':hover') || document.querySelector('#modal-root .modal')) { state.heroAt = (state.heroAt || Date.now()) + 500; return; }
  if (Date.now() - (state.heroAt || 0) < HERO_MS - 100) return;
  showHero((state.heroIdx || 0) + 1);
}, 500);

/* ---- Home: global leaderboard of the week (all players, Monday → Sunday) ---- */
async function loadWeekly() {
  if (state.weeklyLoading) return;
  state.weeklyLoading = true;
  try { state.weekly = await api.weeklyBoard(); state.weeklyAt = Date.now(); } catch { state.weekly = state.weekly || { rows: [], error: 'network' }; }
  state.weeklyLoading = false;
  if (state.view === 'home') render(true);
}
setInterval(() => { if (state.view === 'home' && !document.hidden) loadWeekly(); }, 120000);

function weeklyBoardSection() {
  const w = state.weekly;
  if (!w && !state.weeklyLoading) loadWeekly();
  const d0 = w ? new Date(w.start) : null;
  const d1 = d0 ? new Date(w.start + 6 * 86400000) : null;
  const dm = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const sub = d0 ? `Du lundi ${dm(d0)} au dimanche ${dm(d1)} · remis à zéro chaque lundi` : 'Remis à zéro chaque lundi';
  const hrs = (h) => `${String(Math.round(h * 10) / 10).replace('.', ',')} h`;
  const medals = ['🥇', '🥈', '🥉'];
  const avatar = (r) => {
    const photo = r.me ? (state.profile && state.profile.avatar) || r.photo : r.photo;
    return `<div class="f-avatar ${r.frame ? `framed r-${esc(r.frame)}` : ''}" style="--h:${hue(r.name || '?')}">${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc(initials(r.name || '?'))}</span>`}</div>`;
  };
  const row = (r, rank, max) => `<div class="lb-row ${r.me ? 'me' : ''}" ${r.friend ? `data-friend-open="${esc(r.uid)}"` : ''}>
      <span class="lb-rank">${rank <= 3 ? medals[rank - 1] : rank}</span>
      ${avatar(r)}
      <div class="lb-name"><b>${esc(r.name)}${r.me ? ' <small>(toi)</small>' : r.friend ? ' <small class="wb-friend">ami</small>' : ''}</b>${levelBadge(r.level || 1, 'xs')}${(() => { const n = r.me ? state.profile && state.profile.title && state.profile.title.name : r.title && titleName(r.title); return n ? titleChip(n) : ''; })()}</div>
      <div class="lb-bar"><i style="width:${Math.max(3, Math.round((r.hours / max) * 100))}%"></i></div>
      <b class="lb-val">${hrs(r.hours)}</b>
    </div>`;
  let body;
  if (!w) body = '<div class="skeleton" style="height:220px"></div>';
  else if (w.offline) body = `<div class="wb-empty">${I.trophy || ''}<div><b>Connecte-toi pour voir le classement</b><span>Le classement réunit tous les joueurs de Linkgeek. Connecte-toi avec Google pour y participer.</span></div><button class="ghost" data-goto-account>Se connecter</button></div>`;
  else if (w.error === 'rules') body = '<p class="news-empty">Le classement n\'est pas encore activé sur le serveur.</p>';
  else if (w.error) body = '<p class="news-empty">Impossible de charger le classement pour le moment.</p>';
  else if (!w.rows.length) body = '<p class="news-empty">Personne n\'a encore joué cette semaine. Lance un jeu pour prendre la première place !</p>';
  else {
    const max = Math.max(1, ...w.rows.map((r) => r.hours));
    body = w.rows.map((r, i) => row(r, i + 1, max)).join('');
    if (w.enabled && !w.rows.some((r) => r.me)) {
      body += w.myHours > 0 && w.myRank
        ? `<div class="wb-sep">···</div>${row({ me: true, name: (state.profile && state.profile.name) || 'Moi', level: state.profile && state.profile.level ? state.profile.level.level : 1, frame: state.profile && state.profile.frame, hours: w.myHours }, w.myRank, max)}`
        : '<p class="wb-note">Tu n\'as pas encore joué cette semaine : lance un jeu pour entrer dans le classement.</p>';
    }
  }
  return `<section class="section">
    <div class="section-head"><div><h2>Classement général de la semaine</h2><div class="sub">${esc(sub)}</div></div>${w && !w.offline ? '<button class="link" data-board-refresh>Actualiser</button>' : ''}</div>
    <div class="panel lb wb">${body}</div>
    ${w && !w.enabled ? '<p class="lb-note">Tu as choisi de ne pas apparaître dans le classement (Paramètres → Général).</p>' : ''}
  </section>`;
}

/* ---- Home: "À savoir" info carousel (a new tip every 5 s, in a loop) ---- */
const INFO_MS = 5000;
const pctOf = (v, g) => Math.max(0, Math.min(100, g ? (v / g) * 100 : 0));
function infoSlides() {
  const out = [];
  const s = state.shop;
  // daily wheel
  if (s && s.wheel) {
    if (s.wheel.free) out.push({ icon: COIN, cls: 'gold', kicker: 'Roulette du jour', title: 'Ton tour gratuit t\'attend', text: 'Jetons, XP ou un thème au hasard : tente ta chance dans la Boutique.', nav: 'shop', cta: 'Tourner la roue' });
    else {
      const left = Math.max(0, s.wheel.nextAt - Date.now());
      out.push({ icon: COIN, cls: 'gold', kicker: 'Roulette du jour', title: `Prochain tour dans ${Math.floor(left / 3600000)} h ${String(Math.floor(left / 60000) % 60).padStart(2, '0')} min`, text: 'Tu as déjà tourné la roue aujourd\'hui. Reviens après minuit !', nav: 'shop' });
    }
  }
  // challenges
  const c = state.chal;
  if (c && c.daily) {
    const todo = c.daily.items.filter((x) => !x.doneAt);
    if (todo.length) {
      const best = [...todo].sort((a, b) => pctOf(b.value, b.goal) - pctOf(a.value, a.goal))[0];
      out.push({ icon: CH_ICONS[best.icon] || I.bolt, cls: 'violet', kicker: `${todo.length} défi${todo.length > 1 ? 's' : ''} du jour à terminer`, title: best.title, text: `${fmtGoal(best.value, best.unit)} / ${fmtGoal(best.goal, best.unit)} · +${best.xp} XP`, pct: pctOf(best.value, best.goal), nav: 'challenges' });
    } else out.push({ icon: I.bolt, cls: 'green', kicker: 'Défis du jour', title: 'Tous terminés, bravo 🎉', text: 'De nouveaux défis arrivent demain à minuit.', nav: 'challenges' });
    const wk = c.weekly && c.weekly.items.filter((x) => !x.doneAt).sort((a, b) => pctOf(b.value, b.goal) - pctOf(a.value, a.goal))[0];
    if (wk) out.push({ icon: CH_ICONS[wk.icon] || I.calendar, cls: 'blue', kicker: 'Défi de la semaine', title: wk.title, text: `${fmtGoal(wk.value, wk.unit)} / ${fmtGoal(wk.goal, wk.unit)} · +${wk.xp} XP`, pct: pctOf(wk.value, wk.goal), nav: 'challenges' });
  }
  // closest achievement tier
  const a = state.ach && state.ach.items && state.ach.items
    .filter((it) => it.tier < 1 && !it.hidden && it.kind !== 'ultimate')
    .map((it) => ({ it, next: it.tiers[0], p: pctOf(it.value, it.tiers[0].goal) }))
    .filter((x) => x.p < 100).sort((x, y) => y.p - x.p)[0];
  if (a) out.push({ icon: `<span class="info-trophy">${trophySvg(a.it.rarity, a.it.icon)}</span>`, cls: a.it.rarity, kicker: `Trophée ${a.next.name} · +${a.next.points} pts`, title: a.it.name, text: `${fmtAch(a.it.value, a.it.unit)} / ${fmtAch(a.next.goal, a.it.unit)} · encore ${fmtAch(Math.max(0, a.next.goal - a.it.value), a.it.unit)}`, pct: a.p, nav: 'achievements' });
  // level
  const lv = state.profile && state.profile.level;
  if (lv) out.push({ icon: levelBadge(lv.level, 'sm'), cls: 'violet', kicker: `Niveau ${lv.level} · ${lv.rankName}`, title: `Encore ${(lv.needed - lv.into).toLocaleString('fr-FR')} XP pour le niveau ${lv.level + 1}`, text: lv.nextRank ? `Badge ${lv.nextRank.name} et son contour au niveau ${lv.nextRank.level}.` : 'Tu as atteint le rang le plus haut !', pct: pctOf(lv.into, lv.needed), nav: 'challenges' });
  // closest profile title
  const t = s && (s.titles || []).filter((x) => !x.unlockedAt && x.goal).sort((x, y) => pctOf(y.value, y.goal) - pctOf(x.value, x.goal))[0];
  if (t) out.push({ icon: '🏷️', cls: 'gold', kicker: 'Titre à débloquer', title: `« ${t.name} »`, text: t.desc || '', meta: `${t.value} / ${t.goal}`, pct: pctOf(t.value, t.goal), nav: 'shop' });
  // weekly leaderboard
  const w = state.weekly;
  if (w && !w.offline && w.enabled && w.myRank) out.push({ icon: I.trophy, cls: 'gold', kicker: 'Classement de la semaine', title: w.myRank === 1 ? 'Tu es 1er cette semaine 🥇' : `Tu es ${w.myRank}e cette semaine`, text: `${String(w.myHours).replace('.', ',')} h de jeu depuis lundi.` });
  // friends
  const fr = state.friends && state.friends.friends;
  if (fr) {
    const on = fr.filter((f) => friendState(f) !== 'offline').length;
    const req = (state.friends.requests || []).length;
    if (req) out.push({ icon: I.user || '👋', cls: 'green', kicker: 'Amis', title: `${req} demande${req > 1 ? 's' : ''} d'ami en attente`, text: 'Accepte-les depuis l\'onglet Amis.', nav: 'friends' });
    else if (on) out.push({ icon: '👥', cls: 'green', kicker: 'Amis', title: `${on} ami${on > 1 ? 's' : ''} en ligne`, text: 'Va voir à quoi ils jouent.', nav: 'friends' });
  }
  return out;
}
function infoSlide(sl, idx, n) {
  if (!sl) return '<p class="news-empty">Rien de neuf pour l\'instant.</p>';
  return `<div class="info-slide ${sl.nav ? 'go' : ''}" ${sl.nav ? `data-nav="${sl.nav}"` : ''}>
      <div class="info-ic ${esc(sl.cls || '')}">${sl.icon}</div>
      <small class="info-k">${esc(sl.kicker)}</small>
      <b class="info-t">${esc(sl.title)}</b>
      <span class="info-x">${esc(sl.text)}</span>
      ${sl.meta ? `<span class="info-m">${esc(sl.meta)}</span>` : ''}
      ${sl.pct !== undefined ? `<div class="info-bar"><i style="width:${sl.pct.toFixed(1)}%"></i></div>` : ''}
      ${sl.cta ? `<span class="info-cta"><span>${esc(sl.cta)}</span> →</span>` : ''}
    </div>
    ${n > 1 ? `<div class="info-nav">
      <button class="info-arrow" data-info-step="-1" title="Info précédente" aria-label="Info précédente"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>
      <div class="info-dots">${Array.from({ length: n }, (_, i) => `<button class="${i === idx ? 'on' : ''}" data-info-dot="${i}" aria-label="Info ${i + 1}"></button>`).join('')}</div>
      <span class="info-count">${idx + 1} / ${n}</span>
      <button class="info-arrow" data-info-step="1" title="Info suivante" aria-label="Info suivante"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>
    </div>` : ''}`;
}
function infoPanel() {
  const slides = infoSlides();
  if (!(state.infoIdx < slides.length)) state.infoIdx = 0;
  return `<section class="section home-col">
    <div class="section-head"><div><h2>À savoir</h2><div class="sub">Les infos du moment, mises à jour en direct</div></div></div>
    <div class="panel info-card">${infoSlide(slides[state.infoIdx], state.infoIdx, slides.length)}</div>
  </section>`;
}
function showInfo(i) {
  const el = $('.info-card');
  if (!el || state.view !== 'home') return;
  const slides = infoSlides();
  if (!slides.length) return;
  state.infoIdx = (i + slides.length) % slides.length;
  el.classList.add('fading');
  setTimeout(() => { el.innerHTML = infoSlide(slides[state.infoIdx], state.infoIdx, slides.length); el.classList.remove('fading'); }, 180);
}

/* ---- Home: player profile & recommendations ---- */
function playerProfilePanel() {
  const r = state.reco;
  const prof = r && r.profile;
  return `<section class="section home-col">
    <div class="section-head"><div><h2>Ton profil de joueur</h2><div class="sub">${prof && prof.games ? `D'après ton temps de jeu sur ${prof.games} jeu${prof.games > 1 ? 'x' : ''}` : 'Calculé à partir de tes jeux'}</div></div></div>
    <div class="panel player-prof">
      ${!prof ? '<div class="skeleton" style="height:180px"></div>'
        : !prof.families.length ? '<p class="news-empty">Joue un peu, et Linkgeek découvrira tes genres préférés (il faut connaître les étiquettes de tes jeux, ça arrive dans quelques instants).</p>'
        : prof.families.map((f, i) => `<div class="pp-row">
            <div class="pp-label"><b>${esc(f.name)}</b><span>${f.pct} %</span></div>
            <div class="pp-bar"><i style="width:${Math.max(4, Math.round((f.pct / prof.families[0].pct) * 100))}%;opacity:${1 - i * 0.12}"></i></div>
          </div>`).join('')}
    </div>
  </section>`;
}

function recoSection() {
  const r = state.reco;
  const items = (r && r.result && r.result.items) || [];
  const loading = !r || (!items.length && !r.failed);
  return `<section class="section">
    <div class="section-head"><div><h2>Recommandés pour toi</h2><div class="sub">Jeux Steam populaires dans tes genres préférés, que tu n'as pas encore</div></div>
      <button class="link" data-reco-refresh>${state.recoLoading ? 'Recherche…' : 'Actualiser'}</button></div>
    ${items.length ? `<div class="reco-grid">${items.map((it) => `<a class="reco-card" href="${esc(it.url)}" target="_blank" title="Voir ${esc(it.name)} sur Steam">
        <div class="reco-img"><img src="${esc(it.header)}" alt="" loading="lazy">
          ${it.discount ? `<span class="reco-promo">−${it.discount} %</span>` : ''}</div>
        <div class="reco-body">
          <b>${esc(it.name)}</b>
          <div class="reco-why">${it.because.map((b) => `<span>${esc(b)}</span>`).join('')}</div>
          <div class="reco-foot">
            <span class="reco-rate" title="Évaluations positives sur Steam">👍 ${it.rating} %</span>
            <span class="reco-price">${it.free ? 'Gratuit' : it.price ? `${it.discount && it.initial ? `<s>${esc(it.initial)}</s>` : ''}<b>${esc(it.price)}</b>` : ''}</span>
          </div>
        </div>
      </a>`).join('')}</div>`
      : `<div class="panel reco-empty">${loading ? '<span class="spinner"></span>Linkgeek cherche des jeux qui te correspondent…' : 'Pas de recommandation pour le moment : réessaie plus tard (il faut une connexion Internet).'}</div>`}
  </section>`;
}

async function loadReco(force = false) {
  try {
    if (force) { state.recoLoading = true; render(true); }
    state.reco = force ? await api.refreshReco() : await api.getReco();
    if (!force && state.reco && !state.reco.result && !state.recoAsked) {
      state.recoAsked = true; // first time: compute in the background
      api.refreshReco().then((r) => { state.reco = r; if (state.view === 'home') render(true); }).catch(() => { state.reco.failed = true; });
    }
  } catch { state.reco = { ...(state.reco || {}), failed: true }; }
  state.recoLoading = false;
  if (state.view === 'home') render(true);
}

function playButton(g) {
  return state.running.has(g.id)
    ? `<button class="btn-play running">${I.bolt.replace('<svg', '<svg style="fill:none;stroke:currentColor;stroke-width:1.8"')}En cours d'exécution</button>`
    : `<button class="btn-play" data-launch="${esc(g.id)}">${I.play}Jouer</button>`;
}

function loadingView() {
  return `<div class="page"><div class="skeleton" style="height:420px"></div><div class="grid" style="margin-top:34px">${'<div class="skeleton" style="aspect-ratio:2/3"></div>'.repeat(6)}</div></div>`;
}

function emptyLibrary() {
  return `<div class="page"><div class="empty" style="margin-top:80px"><b>Aucun jeu détecté</b>Linkgeek scanne Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app et GOG.<br>Tu peux aussi ajouter un jeu à la main.<br><br><button class="btn-play" data-add>${I.play}Ajouter un jeu</button></div></div>`;
}

/* ---- Library: grid or list view (remembered on this PC) ---- */
const VIEW_ICONS = {
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="4" height="4" rx="1"/><rect x="4" y="15" width="4" height="4" rx="1"/><path d="M11 7h9M11 17h9"/></svg>',
};
function libView() {
  if (!state.libView) { try { state.libView = localStorage.getItem('linkgeek-libview') === 'list' ? 'list' : 'grid'; } catch { state.libView = 'grid'; } }
  return state.libView;
}
function setLibView(v) {
  state.libView = v === 'list' ? 'list' : 'grid';
  try { localStorage.setItem('linkgeek-libview', state.libView); } catch { /* ignore */ }
  render(true);
}

function libraryList(list) {
  const head = (key, label, cls = '') => `<div class="ll-h ${cls} ${key ? 'sortable' : ''} ${state.sort === key ? 'on' : ''}" ${key ? `data-lib-sort="${key}"` : ''}>${label}${state.sort === key ? '<span class="arrow">↓</span>' : ''}</div>`;
  return `<div class="lib-list">
    <div class="ll-row ll-head">
      ${head('name', 'Titre', 'll-title')}${head('', 'Plateforme')}${head('playtime', 'Temps de jeu', 'num')}${head('recent', 'Dernière partie', 'num')}${head('size', 'Taille', 'num')}<div></div>
    </div>
    ${list.map((g) => {
      const running = state.running.has(g.id);
      return `<div class="ll-row ll-game ${running ? 'running' : ''}" data-open="${esc(g.id)}" tabindex="0">
        <div class="ll-title">
          <div class="ll-cover">${coverHtml(g, 'thumb')}${g.newsNew && !running ? '<i class="ll-new" title="Une mise à jour ou une annonce est sortie depuis ta dernière partie"></i>' : ''}</div>
          <div class="ll-name"><b title="${esc(g.name)}">${esc(g.name)}</b>
            ${running ? '<span class="ll-run">● En cours</span>' : `<button class="ll-launch" data-launch="${esc(g.id)}">${I.play}Lancer</button>`}</div>
        </div>
        <div class="ll-src"><span class="dot ${g.source}"></span>${esc((SOURCES[g.source] || {}).label || g.source)}</div>
        <div class="num">${g.playtimeSec ? esc(playLabel(g)) : `<span class="ll-dim">${OWN_PLAYTIME.has(g.source) ? '—' : 'Non suivi'}</span>`}</div>
        <div class="num">${running ? '<span class="ll-run">Maintenant</span>' : g.lastPlayed ? esc(fmtAgo(g.lastPlayed)) : '<span class="ll-dim">Jamais</span>'}</div>
        <div class="num">${g.sizeBytes ? fmtSize(g.sizeBytes) : '<span class="ll-dim">—</span>'}</div>
        <div class="ll-actions">
          <button class="ll-ico ${g.favorite ? 'on' : ''}" data-fav="${esc(g.id)}" title="Favori">${I.star}</button>
          <button class="ll-ico" data-open="${esc(g.id)}" title="Détails">⋯</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function viewLibrary() {
  const all = visibleGames();
  const list = filteredGames();
  const count = (s) => (s === 'all' ? all.length : s === 'fav' ? all.filter((g) => g.favorite).length : all.filter((g) => g.source === s).length);
  const tabs = [['all', 'Tous'], ['fav', 'Favoris'], ...Object.entries(SOURCES).map(([k, v]) => [k, v.label])]
    .filter(([k]) => k === 'all' || count(k) > 0);

  return `
  <div class="page">
    <div class="page-head">
      <div><h1>Ma bibliothèque</h1><div class="sub">${all.length} jeux · ${fmtHours(totals(all).time)} de jeu · ${fmtSize(totals(all).size)}</div></div>
    </div>
    <div class="toolbar">
      <div class="segmented">
        ${tabs.map(([k, label]) => `<button class="${state.source === k ? 'active' : ''}" data-source="${k}">${SOURCES[k] ? `<span class="dot ${k}"></span>` : ''}${label}<span class="n">${count(k)}</span></button>`).join('')}
      </div>
      <div class="spacer"></div>
      ${state.q ? `<span class="result-count">« ${esc(state.q)} » · ${list.length} résultat${list.length > 1 ? 's' : ''}</span>` : ''}
      <div class="segmented sm view-switch" role="group" aria-label="Affichage">
        <button class="${libView() === 'grid' ? 'active' : ''}" data-lib-view="grid" title="Affichage en grille">${VIEW_ICONS.grid}</button>
        <button class="${libView() === 'list' ? 'active' : ''}" data-lib-view="list" title="Affichage en liste">${VIEW_ICONS.list}</button>
      </div>
      <button class="toggle ${state.showHidden ? 'on' : ''}" data-toggle-hidden>${state.showHidden ? I.eye : I.eyeOff}Masqués</button>
      <select class="select" id="sort">
        <option value="recent" ${state.sort === 'recent' ? 'selected' : ''}>Utilisation la plus récente</option>
        <option value="name" ${state.sort === 'name' ? 'selected' : ''}>Nom (A → Z)</option>
        <option value="playtime" ${state.sort === 'playtime' ? 'selected' : ''}>Temps de jeu</option>
        <option value="size" ${state.sort === 'size' ? 'selected' : ''}>Taille sur le disque</option>
        <option value="added" ${state.sort === 'added' ? 'selected' : ''}>Ajouts récents</option>
      </select>
    </div>
    <div class="col-bar">
      <span class="col-label">${I.layers}Collections</span>
      ${Object.entries(state.collections).map(([id, c]) => {
        const n = all.filter((g) => (g.collections || []).includes(id)).length;
        return `<button class="col-chip ${state.collection === id ? 'active' : ''}" data-col="${esc(id)}">${esc(c.name)}<span class="n">${n}</span></button>`;
      }).join('')}
      <button class="col-chip add" data-col-new title="Créer une collection">＋ Nouvelle</button>
      ${state.collection && state.collections[state.collection] ? `<span class="spacer"></span>
        <button class="link" data-col-rename="${esc(state.collection)}">Renommer</button>
        <button class="link danger" data-col-del="${esc(state.collection)}">Supprimer la collection</button>` : ''}
    </div>
    ${list.length ? (libView() === 'list' ? libraryList(list) : `<div class="grid">${list.map(gameCard).join('')}</div>`) : state.collection ? `<div class="empty"><b>Collection vide</b>Ouvre un jeu puis utilise « Collections » pour l'y ranger.</div>` : `<div class="empty"><b>Aucun jeu trouvé</b>Essaie un autre filtre ou une autre recherche.</div>`}
  </div>`;
}

function viewGame() {
  const g = byId(state.gameId);
  if (!g) { state.view = state.prevView; return render(); }
  const sessions = (state.stats ? state.stats.sessions : []).filter((s) => s.gameId === g.id);
  const avg = sessions.length ? sessions.reduce((a, s) => a + (s.end - s.start), 0) / sessions.length / 1000 : 0;
  const hero = g.hero || (g.source === 'steam' ? g.header : null);
  const blur = !g.hero || g.coverStyle === 'square';

  return `
  <div style="animation:fade .25s ease">
    <section class="detail-hero">
      <div class="hero-bg ${blur ? 'blur' : ''}" style="background-image:url('${esc(hero || g.cover || '')}')"></div>
      <button class="btn-glass back" data-back>${I.back}Retour</button>
      <div class="detail-top">
        ${coverHtml(g)}
        <div class="txt">
          <span class="chip"><span class="dot ${g.source}"></span>${esc(g.sourceLabel)}</span>
          ${state.running.has(g.id) ? '<span class="chip live" style="margin-left:6px">En cours</span>' : ''}
          <h1>${esc(g.name)}</h1>
          <div class="publisher">${esc(g.publisher || '')}</div>
          <div class="actions">
            ${playButton(g)}
            <button class="btn-glass square ${g.favorite ? 'on' : ''}" data-fav="${esc(g.id)}" title="Favori">${I.star}</button>
            <button class="btn-glass square" data-folder="${esc(g.id)}" title="Ouvrir le dossier">${I.folder}</button>
          </div>
        </div>
      </div>
    </section>

    <div class="detail-body">
      <div>
        <div class="stat-tiles">
          ${kpi(I.clock, 'Temps de jeu', fmtTime(g.playtimeSec), g.source === 'steam' ? 'Données Steam + suivi Linkgeek' : 'Suivi par Linkgeek')}
          ${kpi(I.calendar, 'Dernière session', fmtAgo(g.lastPlayed), g.lastPlayed ? new Date(g.lastPlayed).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '')}
          ${kpi(I.disk, 'Taille sur le disque', g.sizeBytes ? fmtSize(g.sizeBytes) : 'Calcul…', g.installDir ? 'Disque ' + g.installDir.slice(0, 2) : '')}
        </div>
        <div class="panel" style="margin-top:16px">
          <h2>Activité — 30 derniers jours</h2>
          ${activityChart(sessions, 30)}
          <div class="kv" style="margin-top:16px;flex-direction:row;gap:28px">
            <div style="flex-direction:column;gap:2px"><span>Sessions suivies</span><b style="text-align:left">${sessions.length}</b></div>
            <div style="flex-direction:column;gap:2px"><span>Durée moyenne</span><b style="text-align:left">${avg ? fmtTime(avg) : '—'}</b></div>
          </div>
        </div>
        ${newsPanel(g)}
        ${g.description ? `<div class="panel" style="margin-top:16px"><h2>À propos</h2><p>${esc(g.description)}</p></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="panel">
          <h2>Informations</h2>
          <div class="kv">
            <div><span>Plateforme</span><b>${esc(g.sourceLabel)}</b></div>
            ${g.publisher ? `<div><span>Éditeur</span><b>${esc(g.publisher)}</b></div>` : ''}
            <div><span>Taille</span><b>${fmtSize(g.sizeBytes)}</b></div>
            <div><span>Temps de jeu</span><b>${esc(fmtTime(g.playtimeSec))}</b></div>
          </div>
          ${g.installDir ? `<div class="path" style="margin-top:14px">${esc(g.installDir)}</div>` : ''}
        </div>
        <div class="panel">
          <h2>Collections</h2>
          <div class="col-pick">
            ${Object.entries(state.collections).map(([id, c]) => {
              const on = (g.collections || []).includes(id);
              return `<button class="col-chip ${on ? 'active' : ''}" data-col-toggle="${esc(id)}" data-gid="${esc(g.id)}">${on ? '✓ ' : ''}${esc(c.name)}</button>`;
            }).join('')}
            <button class="col-chip add" data-col-new data-gid="${esc(g.id)}">＋ Nouvelle</button>
          </div>
        </div>
        <div class="panel">
          <h2>Genre</h2>
          <div class="col-pick">
            ${[['fps', 'Tir'], ['survival', 'Survie'], ['adventure', 'Aventure / RPG']].map(([k, l]) => {
              const on = (g.genres || []).includes(k);
              return `<button class="col-chip ${on ? 'active' : ''}" data-genre="${k}" data-gid="${esc(g.id)}">${on ? '✓ ' : ''}${l}</button>`;
            }).join('')}
          </div>
          <p class="genre-note">${g.genresCustom ? `Choisi par toi · <button class="link" data-genre-reset="${esc(g.id)}">revenir à la détection automatique</button>` : 'Détecté automatiquement · compte pour les titres de la Boutique'}</p>
        </div>
        <div class="panel" style="padding:10px">
          <div class="menu-list">
            <button data-folder="${esc(g.id)}">${I.folder}Ouvrir le dossier d'installation</button>
            ${g.storeUrl ? `<button data-store="${esc(g.id)}">${I.ext}Page du magasin</button>` : ''}
            <button data-rename="${esc(g.id)}">${I.edit}Renommer</button>
            <button data-cover="${esc(g.id)}">${I.image}Changer la jaquette</button>
            <button data-hide="${esc(g.id)}">${g.hidden ? I.eye : I.eyeOff}${g.hidden ? 'Afficher dans la bibliothèque' : 'Masquer de la bibliothèque'}</button>
            ${g.source === 'manual' ? `<button class="danger" data-remove="${esc(g.id)}">${I.trash}Retirer de Linkgeek</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- Game news (Steam announcements) ---------------- */
const fmtNewsDate = (ms) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function newsPanel(g) {
  const n = state.news[g.id];
  const head = '<h2 class="news-h">Nouveautés</h2>';
  if (g.source !== 'steam') {
    const q = `https://www.google.com/search?q=${encodeURIComponent(`${g.name} patch notes`)}`;
    return `<div class="panel news-panel" style="margin-top:16px">${head}
      <p class="news-empty">Les nouveautés automatiques ne sont disponibles que pour les jeux Steam : ${esc(g.sourceLabel)} ne les publie pas.</p>
      <div class="set-actions">${g.storeUrl ? `<button class="ghost" data-store="${esc(g.id)}">${I.ext}Voir sur le site du jeu</button>` : ''}<a class="ghost btn-link" href="${esc(q)}" target="_blank">${I.ext}Chercher les notes de mise à jour</a></div>
    </div>`;
  }
  if (!n) return `<div class="panel news-panel" style="margin-top:16px">${head}<div class="skeleton" style="height:120px"></div></div>`;
  if (!n.items.length) return `<div class="panel news-panel" style="margin-top:16px">${head}<p class="news-empty">Aucune annonce officielle récente pour ce jeu.</p></div>`;
  return `<div class="panel news-panel" style="margin-top:16px">${head}
    <div class="news-list">${n.items.map((it, i) => {
      const fresh = g.lastPlayed && it.date > g.lastPlayed;
      const open = state.newsOpen === it.id;
      return `<article class="news-item ${open ? 'open' : ''}">
        ${it.image ? `<img class="news-img" src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
        <div class="news-meta">${it.patch ? '<span class="chip patch">Mise à jour</span>' : '<span class="chip">Annonce</span>'}${fresh ? '<span class="chip news">Nouveau</span>' : ''}<span>${esc(fmtNewsDate(it.date))}</span></div>
        <h3>${esc(it.title)}</h3>
        ${open ? `<div class="news-text">${esc(it.text)}</div>` : `<p class="news-sum">${esc(it.summary)}</p>`}
        <div class="news-actions">
          ${it.text.length > 320 ? `<button class="link" data-news-toggle="${esc(it.id)}">${open ? 'Réduire' : 'Lire la suite'}</button>` : ''}
          <a class="link" href="${esc(it.url)}" target="_blank">Voir sur Steam ${I.ext}</a>
        </div>
      </article>${i < n.items.length - 1 ? '' : ''}`;
    }).join('')}</div>
  </div>`;
}

async function loadNews(id) {
  try {
    state.news[id] = await api.getNews(id);
    if (state.view === 'game' && state.gameId === id) render(true);
    const g = byId(id);
    if (g && g.newsNew) { await api.markNewsSeen(id); } // opening the game page clears the "Nouveau" badge
  } catch (e) { console.error(e); }
}

async function loadRecentNews() {
  try { state.recentNews = await api.getRecentNews(); if (state.view === 'home') render(true); } catch { /* ignore */ }
}

function recentNewsSection() {
  const list = (state.recentNews || []).filter((x) => byId(x.gameId)).slice(0, 5);
  return `<section class="section home-col">
    <div class="section-head"><div><h2>Mises à jour récentes</h2><div class="sub">Annonces officielles de tes jeux Steam</div></div><button class="link" data-news-refresh>Actualiser</button></div>
    <div class="panel news-compact">${list.length ? list.map((x) => {
      const g = byId(x.gameId);
      return `<button class="nc-row" data-open="${esc(g.id)}">
        <img src="${esc(g.header || heroSrc(g) || g.cover || '')}" alt="" loading="lazy">
        <div><span class="nc-game">${esc(g.name)}${x.isNew ? '<span class="chip news">Nouveau</span>' : ''}</span><b>${esc(x.item.title)}</b><small>${esc(fmtAgo(x.item.date))}</small></div>
      </button>`;
    }).join('') : `<p class="news-empty">${state.recentNews ? 'Aucune annonce ces 30 derniers jours.' : 'Chargement des annonces…'}</p>`}</div>
  </section>`;
}

function activityChart(sessions, days) {
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(day0); d.setDate(d.getDate() - (days - 1 - i));
    return { d, sec: 0 };
  });
  const startMs = buckets[0].d.getTime();
  for (const s of sessions) {
    if (s.end < startMs) continue;
    const idx = Math.floor((new Date(s.start).setHours(0, 0, 0, 0) - startMs) / 86400000);
    if (idx >= 0 && idx < days) buckets[idx].sec += (s.end - s.start) / 1000;
  }
  const max = Math.max(...buckets.map((b) => b.sec), 1);
  if (!sessions.length) {
    return `<div class="empty" style="padding:34px 20px"><b>Pas encore de sessions suivies</b>Laisse Linkgeek tourner (il reste dans la barre des tâches) : chaque partie sera enregistrée automatiquement, quel que soit le launcher utilisé.</div>`;
  }
  return `<div class="columns">${buckets.map((b, i) => `
    <div class="col">
      <div class="tip">${b.d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${b.sec ? fmtTime(b.sec) : 'aucune session'}</div>
      <div class="c ${b.sec ? '' : 'zero'}" style="height:${b.sec ? Math.max(4, (b.sec / max) * 100) : 2}%"></div>
      <label>${i % Math.ceil(days / 10) === 0 || i === days - 1 ? b.d.getDate() : '&nbsp;'}</label>
    </div>`).join('')}</div>`;
}

/* ---------------- Statistics helpers ----------------
 * Only Steam reports its own playtime. For every other platform Linkgeek only
 * knows the sessions it tracked itself, so "0 h" is shown as "non suivi". */
const OWN_PLAYTIME = new Set(['steam']);
function playLabel(g, empty = 'Pas encore joué') {
  if (OWN_PLAYTIME.has(g.source)) return fmtTime(g.playtimeSec, empty);
  return g.playtimeSec ? `${fmtTime(g.playtimeSec)} suivies` : 'Non suivi';
}
const DAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const mondayOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
/** ms played between a and b (sessions cut at the edges, running games included). */
function playedBetween(sessions, a, b) {
  let ms = 0;
  for (const s of sessions) { const x = Math.max(s.start, a); const y = Math.min(s.end, b); if (y > x) ms += y - x; }
  return ms;
}
function allSessions() {
  const now = Date.now();
  const list = [...((state.stats && state.stats.sessions) || [])];
  for (const id of state.running) list.push({ gameId: id, start: state.runningSince && state.runningSince[id] ? state.runningSince[id] : now, end: now });
  return list;
}
/** Minutes per weekday (Mon=0) x hour, over the last `weeks` weeks. */
function heatGrid(sessions, weeks = 12) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const from = Date.now() - weeks * 7 * 86400000;
  for (const s of sessions) {
    let t = Math.max(s.start, from);
    while (t < s.end) {
      const d = new Date(t);
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime();
      const part = Math.min(next, s.end) - t;
      grid[(d.getDay() + 6) % 7][d.getHours()] += part / 60000;
      t = next;
    }
  }
  return grid;
}
function heatmapPanel(sessions) {
  const g = heatGrid(sessions);
  const max = Math.max(...g.flat());
  if (max < 1) return '<div class="empty">Joue un peu avec Linkgeek ouvert : la grille se remplira avec tes horaires de jeu.</div>';
  const hours = new Array(24).fill(0).map((_, h) => g.reduce((a, row) => a + row[h], 0));
  const days = g.map((row) => row.reduce((a, v) => a + v, 0));
  const favH = hours.indexOf(Math.max(...hours));
  const favD = days.indexOf(Math.max(...days));
  const m = (v) => (v >= 60 ? `${Math.floor(v / 60)} h ${String(Math.round(v % 60)).padStart(2, '0')}` : `${Math.round(v)} min`);
  return `<div class="heat">
      <div class="heat-hours"><span></span>${hours.map((_, h) => `<span>${h % 3 === 0 ? `${h} h` : ''}</span>`).join('')}</div>
      ${g.map((row, d) => `<div class="heat-row"><span class="heat-day">${DAYS_FR[d].slice(0, 3)}.</span>${row.map((v, h) => `<i style="--v:${(v / max).toFixed(3)}" title="${DAYS_FR[d]} ${h} h : ${v ? m(v) : 'rien'} (12 dernières semaines)"></i>`).join('')}</div>`).join('')}
    </div>
    <div class="heat-facts">
      <div><span>Heure préférée</span><b>${favH} h – ${(favH + 1) % 24} h</b></div>
      <div><span>Jour le plus actif</span><b class="cap">${DAYS_FR[favD]}</b></div>
      <div class="heat-scale"><span>Moins</span>${[0.08, 0.3, 0.55, 0.8, 1].map((v) => `<i style="--v:${v}"></i>`).join('')}<span>Plus</span></div>
    </div>`;
}
function cmpCard(label, now, before, hint) {
  const h = (ms) => (ms ? fmtTime(ms / 1000) : '0 h');
  let delta = '';
  if (before > 60000) {
    const pct = Math.round(((now - before) / before) * 100);
    delta = `<span class="cmp-d ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}">${pct > 0 ? '↑' : pct < 0 ? '↓' : '='} ${Math.abs(pct)} %</span>`;
  } else if (now > 60000) delta = '<span class="cmp-d up">nouveau</span>';
  return `<div class="cmp"><span class="cmp-l">${esc(label)}</span><div class="cmp-v"><b>${h(now)}</b>${delta}</div><small><span>${esc(hint)}</span> : <span>${h(before)}</span></small></div>`;
}
function comparisonsPanel(sessions) {
  const now = Date.now();
  const w0 = mondayOf(now);
  const m0 = new Date(now); m0.setHours(0, 0, 0, 0); m0.setDate(1);
  const pm0 = new Date(m0); pm0.setMonth(pm0.getMonth() - 1);
  const pmEnd = Math.min(m0.getTime(), pm0.getTime() + (now - m0.getTime()));
  const week = playedBetween(sessions, w0, now);
  const month = playedBetween(sessions, m0.getTime(), now);
  let friends = '';
  if (state.cmpFriends) {
    const wk = currentWeekKey();
    const list = ((state.friends && state.friends.friends) || []).filter((f) => f.card && f.card.week === wk);
    if (!list.length) friends = '<div class="cmp-friends"><span>Pas encore de données de tes amis pour cette semaine.</span></div>';
    else {
      const avg = list.reduce((a, f) => a + (Number(f.card.weekHours) || 0), 0) / list.length;
      const mine = week / 3600000;
      const pct = avg > 0 ? Math.round(((mine - avg) / avg) * 100) : null;
      const txt = pct === null ? `Tes amis n'ont pas encore joué cette semaine, toi ${fmtTime(week / 1000) || '0 h'}.`
        : pct === 0 ? 'Tu as joué autant que la moyenne de tes amis cette semaine.'
          : `Tu as joué ${Math.abs(pct)} % de ${pct > 0 ? 'plus' : 'moins'} que la moyenne de tes amis cette semaine.`;
      friends = `<div class="cmp-friends ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}"><b>${esc(txt)}</b><span>Moyenne de ${list.length} ami${list.length > 1 ? 's' : ''} : ${String(Math.round(avg * 10) / 10).replace('.', ',')} h · toi : ${String(Math.round(mine * 10) / 10).replace('.', ',')} h</span></div>`;
    }
  }
  return `<div class="cmps">
      ${cmpCard('Cette semaine', week, playedBetween(sessions, w0 - 7 * 86400000, now - 7 * 86400000), 'Même moment la semaine dernière')}
      ${cmpCard('Ce mois-ci', month, playedBetween(sessions, pm0.getTime(), pmEnd), `Même moment en ${MONTHS_FR[pm0.getMonth()]}`)}
    </div>
    <label class="cmp-toggle"><button class="switch ${state.cmpFriends ? 'on' : ''}" data-cmp-friends role="switch" aria-checked="${!!state.cmpFriends}"><i></i></button>Comparer avec mes amis</label>
    ${friends}`;
}
const fmtEur = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: v < 1 ? 2 : v < 100 ? 2 : 0, maximumFractionDigits: 2 });
function valuePanel() {
  const v = state.libValue;
  if (!v) { if (!state.libValueLoading) loadLibValue(); return '<div class="skeleton" style="height:160px"></div>'; }
  if (!v.count) return '<div class="empty">Aucun prix Steam trouvé pour tes jeux (hors ligne ?).</div>';
  const best = v.items.filter((x) => x.perHour !== null).sort((a, b) => a.perHour - b.perHour);
  const top = best[0] && byId(best[0].gameId);
  const perH = (x) => (x < 0.01 ? '< 0,01 €' : fmtEur(x));
  return `<div class="val-kpis">
      <div><span>Valeur estimée</span><b>${fmtEur(v.total)}</b><small>${v.count} jeux Steam${v.free ? ` dont ${v.free} gratuit${v.free > 1 ? 's' : ''}` : ''}</small></div>
      <div><span>Coût moyen par heure</span><b>${v.perHour !== null ? perH(v.perHour) : '—'}</b><small>sur tes jeux payants</small></div>
    </div>
    ${top ? `<p class="val-fun"><span>${esc(top.name)} t'a coûté</span> <b>${perH(best[0].perHour)}</b> <span>de l'heure 😄</span></p>` : ''}
    ${best.length ? `<div class="val-list"><small>Meilleur rapport heures / prix</small>${best.slice(0, 5).map((x) => { const g = byId(x.gameId); return g ? `<div class="val-row" data-open="${esc(g.id)}">${coverHtml(g, 'thumb')}<span title="${esc(g.name)}">${esc(g.name)}</span><em>${fmtEur(x.price)} · ${Math.round(x.hours)} h</em><b>${perH(x.perHour)}/h</b></div>` : ''; }).join('')}</div>` : ''}
    <p class="val-note">Prix Steam actuels en France, hors promotions. Les jeux des autres plateformes ne sont pas comptés.</p>`;
}
async function loadLibValue(force = false) {
  state.libValueLoading = true;
  try { state.libValue = await api.getLibraryValue(force); } catch { state.libValue = { count: 0, items: [] }; }
  state.libValueLoading = false;
  if (state.view === 'stats') render(true);
}
function statsRecords(r) {
  if (!r) return '';
  const card = (icon, label, value, sub) => `<div class="srec"><div class="srec-ic">${icon}</div><span>${esc(label)}</span><b title="${esc(value)}">${esc(value)}</b><small title="${esc(sub)}">${esc(sub)}</small></div>`;
  const lg = r.longest && byId(r.longest.gameId);
  const nw = r.newest && byId(r.newest.gameId);
  const dt = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<div class="srecs">
      ${card(I.bolt, 'Session la plus longue', r.longest ? fmtDur(r.longest.ms) : '—', r.longest ? `${lg ? lg.name : 'Jeu supprimé'} · ${dt(r.longest.at)}` : 'Pas encore de session suivie')}
      ${card(I.calendar, 'Plus longue série', `${r.streak.best} jour${r.streak.best > 1 ? 's' : ''}`, r.streak.current ? `Série en cours : ${r.streak.current} jour${r.streak.current > 1 ? 's' : ''}` : 'Aucune série en cours')}
      ${card(I.clock, 'Jour le plus joué', r.bestDay ? fmtDur(r.bestDay.ms) : '—', r.bestDay ? dt(r.bestDay.at) : 'Pas encore de session suivie')}
      ${card(I.star, 'Dernier jeu découvert', nw ? nw.name : '—', nw ? `Ajouté le ${dt(r.newest.at)}` : 'Aucun nouveau jeu depuis l\'installation')}
    </div>`;
}

/* ---------------- Linkgeek Wrapped ----------------
 * Animated recap of a month (or of the year in December / January), from the
 * sessions Linkgeek tracked, ending with a picture to save or copy. */
function wrappedPeriods() {
  const now = new Date();
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mName = MONTHS_FR[pm.getMonth()];
  const list = [{ key: 'month', label: `Récap ${/^[aeiouy]/.test(mName) ? 'd\'' : 'de '}${mName} ${pm.getFullYear()}`, title: `${MONTHS_FR[pm.getMonth()]} ${pm.getFullYear()}`, from: pm.getTime(), to: new Date(now.getFullYear(), now.getMonth(), 1).getTime() }];
  const y = now.getMonth() === 11 ? now.getFullYear() : now.getMonth() === 0 ? now.getFullYear() - 1 : null;
  if (y) list.unshift({ key: 'year', label: `Mon année ${y}`, title: `ton année ${y}`, from: new Date(y, 0, 1).getTime(), to: Math.min(Date.now(), new Date(y + 1, 0, 1).getTime()), year: true });
  return list;
}
function wrappedButtons() {
  return wrappedPeriods().map((p, i) => `<button class="${p.year ? 'btn-play' : 'btn-glass'} wrap-btn" data-wrapped="${i}"><span aria-hidden="true">🎁</span><span>${esc(p.label)}</span></button>`).join('');
}
function recapData(p) {
  const ss = allSessions().filter((s) => s.end > p.from && s.start < p.to).map((s) => ({ ...s, start: Math.max(s.start, p.from), end: Math.min(s.end, p.to) }));
  const per = {};
  const days = new Map();
  let longest = null;
  for (const s of ss) {
    per[s.gameId] = (per[s.gameId] || 0) + s.end - s.start;
    if (!longest || s.end - s.start > longest.ms) longest = { ms: s.end - s.start, gameId: s.gameId };
    for (let t = new Date(s.start).setHours(0, 0, 0, 0); t < s.end; t = new Date(t + 36 * 3600000).setHours(0, 0, 0, 0)) {
      const part = Math.min(s.end, new Date(t + 36 * 3600000).setHours(0, 0, 0, 0)) - Math.max(s.start, t);
      if (part > 0) days.set(t, (days.get(t) || 0) + part);
    }
  }
  const total = Object.values(per).reduce((a, v) => a + v, 0);
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, ms]) => ({ game: byId(id), name: (byId(id) || {}).name || 'Jeu supprimé', ms }));
  const bestDay = [...days].sort((a, b) => b[1] - a[1])[0];
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const s of ss) for (let t = s.start; t < s.end;) { const d = new Date(t); const nx = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime(); grid[(d.getDay() + 6) % 7][d.getHours()] += Math.min(nx, s.end) - t; t = nx; }
  const hours = new Array(24).fill(0).map((_, h) => grid.reduce((a, r) => a + r[h], 0));
  const dsum = grid.map((r) => r.reduce((a, v) => a + v, 0));
  const fam = state.reco && state.reco.profile && state.reco.profile.families && state.reco.profile.families[0];
  return {
    total, sessions: ss.length, games: Object.keys(per).length, days: days.size, top, longest,
    bestDay: bestDay ? { at: bestDay[0], ms: bestDay[1] } : null,
    favHour: total ? hours.indexOf(Math.max(...hours)) : null, favDay: total ? dsum.indexOf(Math.max(...dsum)) : null,
    genre: fam ? fam.name : null,
  };
}
function wrappedSlides(p, d) {
  const h = (ms) => Math.round(ms / 3600000).toLocaleString('fr-FR');
  const name = (state.profile && state.profile.name) || 'Joueur';
  if (d.total < 60000) return [{ cls: 's1', html: `<small>Linkgeek Wrapped</small><h1>Pas encore assez de parties</h1><p>Linkgeek n'a suivi aucune session sur ${esc(p.title)}. Laisse-le ouvert quand tu joues et reviens le mois prochain !</p>` }];
  const g1 = d.top[0];
  const out = [
    { cls: 's1', html: `<small>Linkgeek Wrapped</small><h1>${esc(name)}, voici ${esc(p.title)} 🎮</h1><p>Prêt à revoir tes parties ?</p>` },
    { cls: 's2', html: `<small>Ton temps de jeu</small><div class="w-big">${h(d.total)}<span>h</span></div><p>en <b>${d.sessions}</b> session${d.sessions > 1 ? 's' : ''}, sur <b>${d.days}</b> jour${d.days > 1 ? 's' : ''}, avec <b>${d.games}</b> jeu${d.games > 1 ? 'x' : ''} différent${d.games > 1 ? 's' : ''}</p>` },
  ];
  if (g1) out.push({ cls: 's3', bg: g1.game ? heroSrc(g1.game) : null, html: `<small>Ton jeu n°1</small><h1>${esc(g1.name)}</h1><div class="w-big sm">${h(g1.ms)}<span>h</span></div><p>soit ${Math.round((g1.ms / d.total) * 100)} % de ton temps de jeu</p>` });
  if (d.top.length > 1) out.push({ cls: 's4', html: `<small>Ton top ${d.top.length}</small><ol class="w-top">${d.top.map((x, i) => `<li style="--i:${i}"><span>${i + 1}</span>${x.game ? coverHtml(x.game, 'thumb') : ''}<b>${esc(x.name)}</b><em>${h(x.ms)} h</em></li>`).join('')}</ol>` });
  if (d.genre) out.push({ cls: 's5', html: `<small>Ton genre préféré</small><h1 class="w-grad">${esc(d.genre)}</h1><p>D'après tout ton temps de jeu</p>` });
  out.push({ cls: 's6', html: `<small>Tes records</small><div class="w-recs">
      ${d.longest ? `<div><span>Session la plus longue</span><b>${esc(fmtDur(d.longest.ms))}</b><em>${esc((byId(d.longest.gameId) || {}).name || '')}</em></div>` : ''}
      ${d.bestDay ? `<div><span>Ta plus grosse journée</span><b>${esc(fmtDur(d.bestDay.ms))}</b><em>le ${new Date(d.bestDay.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</em></div>` : ''}
    </div>` });
  if (d.favHour !== null) out.push({ cls: 's7', html: `<small>Tes habitudes</small><h1>Tu joues surtout le <span class="w-grad">${DAYS_FR[d.favDay]}</span>, vers <span class="w-grad">${d.favHour} h</span></h1>` });
  out.push({ cls: 's8', share: true, html: `<small>À partager</small><h1>Ton récap en image</h1><canvas class="w-canvas" width="1080" height="1350"></canvas>
    <div class="w-actions"><button class="btn-play" data-w="save">Enregistrer l'image</button><button class="btn-glass" data-w="copy">Copier</button></div>` });
  return out;
}
function drawShare(cv, p, d) {
  const x = cv.getContext('2d');
  const W = 1080, H = 1350;
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#120a2a'); bg.addColorStop(0.55, '#1b0f3d'); bg.addColorStop(1, '#062a3a');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, r, c) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  glow(900, 120, 520, 'rgba(124,92,255,.45)'); glow(120, 1250, 520, 'rgba(34,211,238,.32)');
  const grad = x.createLinearGradient(80, 0, 1000, 0); grad.addColorStop(0, '#a78bfa'); grad.addColorStop(1, '#22d3ee');
  x.textBaseline = 'alphabetic';
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 34px "Segoe UI", sans-serif';
  x.fillText('LINKGEEK WRAPPED', 80, 120);
  x.fillStyle = '#fff'; x.font = '800 64px "Segoe UI", sans-serif';
  x.fillText(p.title.charAt(0).toUpperCase() + p.title.slice(1), 80, 200);
  x.fillStyle = grad; x.font = '900 220px "Segoe UI", sans-serif';
  const hrs = String(Math.round(d.total / 3600000));
  x.fillText(hrs, 70, 440);
  const w = x.measureText(hrs).width;
  x.fillStyle = '#fff'; x.font = '700 60px "Segoe UI", sans-serif'; x.fillText('heures de jeu', 90 + w, 430);
  x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '500 36px "Segoe UI", sans-serif';
  x.fillText(`${d.sessions} sessions · ${d.days} jours · ${d.games} jeux`, 80, 500);
  x.fillStyle = '#fff'; x.font = '800 44px "Segoe UI", sans-serif'; x.fillText('Mon top 5', 80, 610);
  d.top.forEach((t, i) => {
    const y = 680 + i * 78;
    x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.roundRect(80, y - 50, 920, 66, 18); x.fill();
    x.fillStyle = grad; x.font = '900 40px "Segoe UI", sans-serif'; x.fillText(String(i + 1), 108, y);
    x.fillStyle = '#fff'; x.font = '600 36px "Segoe UI", sans-serif';
    let n = t.name; while (x.measureText(n).width > 640 && n.length > 3) n = n.slice(0, -2);
    x.fillText(n === t.name ? n : n + '…', 170, y);
    x.fillStyle = 'rgba(255,255,255,.7)'; x.textAlign = 'right'; x.fillText(`${Math.round(t.ms / 3600000)} h`, 975, y); x.textAlign = 'left';
  });
  const facts = [d.genre && ['Genre préféré', d.genre], d.longest && ['Session record', fmtDur(d.longest.ms)], d.favHour !== null && ['Moment préféré', `${DAYS_FR[d.favDay]}, ${d.favHour} h`]].filter(Boolean);
  facts.forEach(([k, v], i) => {
    const y = 1130 + Math.floor(i / 2) * 0; const xx = 80 + i * 320;
    x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '600 26px "Segoe UI", sans-serif'; x.fillText(k.toUpperCase(), xx, y);
    x.fillStyle = '#fff'; x.font = '800 34px "Segoe UI", sans-serif';
    let s = String(v); const full = s;
    while (x.measureText(s + '…').width > 290 && s.length > 3) s = s.slice(0, -1);
    x.fillText(s === full ? s : s.trim() + '…', xx, y + 48);
  });
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '600 28px "Segoe UI", sans-serif';
  x.fillText(`${(state.profile && state.profile.name) || 'Joueur'} sur Linkgeek`, 80, 1290);
}
function openWrapped(i) {
  const p = wrappedPeriods()[i];
  if (!p) return;
  const d = recapData(p);
  const slides = wrappedSlides(p, d);
  const root = $('#modal-root');
  let idx = 0; let timer = null;
  const show = (n) => {
    idx = Math.max(0, Math.min(slides.length - 1, n));
    const s = slides[idx];
    root.querySelector('.w-stage').innerHTML = `<div class="w-slide ${s.cls}">${s.bg ? `<div class="w-bg" style="background-image:url('${esc(s.bg)}')"></div>` : ''}<div class="w-in">${s.html}</div></div>`;
    root.querySelectorAll('.w-prog i').forEach((b, k) => { b.className = k < idx ? 'done' : k === idx ? (s.share ? 'done' : 'on') : ''; });
    root.querySelector('.wrapped').classList.toggle('share', !!s.share);
    clearTimeout(timer);
    if (s.share) { const cv = root.querySelector('.w-canvas'); drawShare(cv, p, d); } else timer = setTimeout(() => show(idx + 1), 5500);
  };
  root.innerHTML = `<div class="modal-bg w-bg-root"><div class="wrapped" role="dialog" aria-label="Linkgeek Wrapped">
    <div class="w-prog">${slides.map(() => '<i></i>').join('')}</div>
    <button class="w-close" data-w="close" title="Fermer">✕</button>
    <div class="w-stage"></div>
    <button class="w-nav prev" data-w="prev" aria-label="Précédent"></button><button class="w-nav next" data-w="next" aria-label="Suivant"></button>
  </div></div>`;
  const close = () => { clearTimeout(timer); root.innerHTML = ''; root.onclick = null; document.removeEventListener('keydown', key); };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); };
  document.addEventListener('keydown', key);
  root.onclick = async (e) => {
    if (e.target.classList.contains('w-bg-root')) return close();
    const b = e.target.closest('[data-w]');
    if (!b) return;
    const a = b.dataset.w;
    if (a === 'close') return close();
    if (a === 'next') return show(idx + 1);
    if (a === 'prev') return show(idx - 1);
    const url = root.querySelector('.w-canvas').toDataURL('image/png');
    try {
      if (a === 'save') { const f = await api.saveImage(url, `Linkgeek-recap-${p.title}`); if (f) toast('Image enregistrée'); }
      if (a === 'copy') { await api.copyImage(url); toast('Image copiée : colle-la où tu veux (Ctrl+V)'); }
    } catch (err) { toast(errMsg(err), true); }
  };
  show(0);
}

function viewStats() {
  const games = visibleGames();
  if (!games.length) return state.loaded ? emptyLibrary() : loadingView();
  const t = totals(games);
  const st = state.stats || { sessions: [], disks: [] };
  const played = games.filter((g) => g.playtimeSec > 0);
  const top = [...played].sort((a, b) => b.playtimeSec - a.playtimeSec).slice(0, 10);
  const maxT = top.length ? top[0].playtimeSec : 1;
  const week = st.sessions.filter((s) => s.end > Date.now() - 7 * 86400000).reduce((a, s) => a + (s.end - s.start) / 1000, 0);

  // platform breakdown
  const plat = Object.entries(SOURCES).map(([k, v]) => {
    const l = games.filter((g) => g.source === k);
    return { k, ...v, count: l.length, size: l.reduce((a, g) => a + (g.sizeBytes || 0), 0), time: l.reduce((a, g) => a + g.playtimeSec, 0) };
  }).filter((p) => p.count);
  const totalSize = plat.reduce((a, p) => a + p.size, 0) || 1;
  const R = 62; const C = 2 * Math.PI * R; let off = 0;
  const arcs = plat.map((p) => {
    const len = (p.size / totalSize) * C;
    const s = `<circle r="${R}" cx="85" cy="85" stroke="${p.color}" stroke-dasharray="${Math.max(len - 3, 0)} ${C}" stroke-dashoffset="${-off}"></circle>`;
    off += len; return s;
  }).join('');

  // table
  const { key, dir } = state.tableSort;
  const rows = [...games].sort((a, b) => {
    const va = a[key] ?? 0; const vb = b[key] ?? 0;
    return (typeof va === 'string' ? va.localeCompare(vb, 'fr') : va - vb) * dir;
  });
  const th = (k, label, num) => `<th class="${num ? 'num' : ''}" data-tsort="${k}">${label}${key === k ? `<span class="arrow">${dir > 0 ? '↑' : '↓'}</span>` : ''}</th>`;

  return `
  <div class="page">
    <div class="page-head"><div><h1>Statistiques</h1><div class="sub">Vue d'ensemble de ta bibliothèque et de ton temps de jeu</div></div>
      <div class="wrap-btns">${wrappedButtons()}</div></div>
    <div class="kpis">
      ${(() => { const tracked = games.filter((g) => !OWN_PLAYTIME.has(g.source)).reduce((a, g) => a + g.playtimeSec, 0); return kpi(I.clock, 'Temps de jeu total', fmtHours(t.time), tracked ? `Steam + ${fmtHours(tracked)} suivies par Linkgeek` : 'Temps Steam · autres plateformes non suivies'); })()}
      ${kpi(I.bolt, 'Cette semaine', week ? fmtTime(week) : '—', 'suivi par Linkgeek')}
      ${kpi(I.disk, 'Espace occupé', fmtSize(t.size), `${games.filter((g) => !g.sizeBytes).length ? games.filter((g) => !g.sizeBytes).length + ' taille(s) en calcul' : 'tous les jeux mesurés'}`)}
      ${kpi(I.layers, 'Jeux installés', String(t.count), `${played.length} déjà lancés · ${t.count - played.length} jamais joués`)}
    </div>

    <div class="stats-grid">
      <div class="panel span-12">
        <h2>Records</h2>
        ${statsRecords(st.records)}
      </div>
      <div class="panel span-7">
        <h2>Quand tu joues</h2>
        ${heatmapPanel(allSessions())}
      </div>
      <div class="panel span-5">
        <h2>Comparaisons</h2>
        ${comparisonsPanel(allSessions())}
      </div>
      <div class="panel span-7">
        <h2>Top 10 — temps de jeu</h2>
        ${top.length ? `<div class="bars">${top.map((g) => `
          <div class="bar-row" data-open="${esc(g.id)}">
            ${coverHtml(g, 'thumb')}
            <span class="name" title="${esc(g.name)}">${esc(g.name)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(g.playtimeSec / maxT) * 100}%"></div></div>
            <span class="val">${fmtHours(g.playtimeSec)}</span>
          </div>`).join('')}</div>` : '<div class="empty">Aucun temps de jeu enregistré pour le moment.</div>'}
      </div>
      <div class="panel span-5">
        <h2>Valeur de ta bibliothèque</h2>
        ${valuePanel()}
      </div>
      <div class="panel span-5">
        <h2>Répartition par plateforme</h2>
        <div class="donut-wrap">
          <div class="donut">
            <svg viewBox="0 0 170 170"><circle r="${R}" cx="85" cy="85" stroke="rgba(255,255,255,.05)"></circle>${arcs}</svg>
            <div class="center"><div><b>${fmtSize(t.size)}</b><span>sur le disque</span></div></div>
          </div>
          <div class="legend">
            ${plat.map((p) => `<div class="legend-row"><span class="dot" style="background:${p.color}"></span><div>${esc(p.label)}<small>${p.count} jeu${p.count > 1 ? 'x' : ''} · ${OWN_PLAYTIME.has(p.k) ? fmtHours(p.time) : p.time ? `${fmtHours(p.time)} suivies par Linkgeek` : 'temps non suivi'}</small></div><span class="v">${fmtSize(p.size)}</span></div>`).join('')}
            <p class="legend-note">Seul Steam fournit son propre temps de jeu. Pour les autres plateformes, Linkgeek compte uniquement les parties lancées pendant qu'il est ouvert.</p>
          </div>
        </div>
      </div>
      <div class="panel span-7">
        <h2>Activité — 30 derniers jours</h2>
        ${activityChart(st.sessions, 30)}
      </div>
      <div class="panel span-5">
        <h2>Stockage</h2>
        ${st.disks.length ? st.disks.map((d) => {
          const other = Math.max(d.total - d.free - d.gamesBytes, 0);
          return `<div class="disk">
            <div class="disk-head"><b>Disque ${esc(d.root.replace('\\', ''))}</b><span>${fmtSize(d.free)} libres sur ${fmtSize(d.total)}</span></div>
            <div class="disk-bar"><div class="games" style="width:${(d.gamesBytes / d.total) * 100}%"></div><div class="other" style="width:${(other / d.total) * 100}%"></div></div>
            <div class="disk-legend"><span><i style="background:var(--accent)"></i>Jeux ${fmtSize(d.gamesBytes)}</span><span><i style="background:rgba(255,255,255,.16)"></i>Autres ${fmtSize(other)}</span></div>
          </div>`;
        }).join('') : '<div class="skeleton" style="height:80px"></div>'}
      </div>
      <div class="panel span-12" style="padding:10px 10px 4px">
        <h2 style="padding:10px 12px 0">Tous les jeux</h2>
        <table>
          <thead><tr>${th('name', 'Jeu')}${th('source', 'Plateforme')}${th('playtimeSec', 'Temps de jeu', 1)}${th('sizeBytes', 'Taille', 1)}${th('lastPlayed', 'Dernière session', 1)}</tr></thead>
          <tbody>${rows.map((g) => `
            <tr data-open="${esc(g.id)}">
              <td><div class="cell-game">${coverHtml(g, 'thumb')}<span>${esc(g.name)}</span></div></td>
              <td><span class="src"><span class="dot ${g.source}"></span>${esc(SOURCES[g.source].label)}</span></td>
              <td class="num ${!OWN_PLAYTIME.has(g.source) && !g.playtimeSec ? 'dim' : ''}">${esc(playLabel(g, '—'))}</td>
              <td class="num">${fmtSize(g.sizeBytes)}</td>
              <td class="num">${esc(fmtAgo(g.lastPlayed))}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ---------------- Profile ---------------- */
function avatarHtml(cls, framed = true) {
  const p = state.profile || {};
  const inner = p.avatar
    ? `<img class="${cls}" src="${esc(p.avatar)}" alt="">`
    : `<div class="${cls}">${esc(initials(p.name || 'Joueur'))}</div>`;
  return framed && p.frame ? `<span class="av-frame r-${esc(p.frame)}" title="Contour ${esc(rankName(p.frame))}">${inner}</span>` : inner;
}
const rankName = (key) => (RANKS.find((r) => r.key === key) || {}).name || key;

/* ---- Rank frames: chosen in the "Modifier le profil" window ---- */
const CROWN_LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

function top5() {
  const ids = (state.profile && state.profile.top5) || [];
  return Array.from({ length: 5 }, (_, i) => (ids[i] ? byId(ids[i]) || null : null));
}

function viewProfile() {
  const p = state.profile || { name: 'Joueur' };
  const games = visibleGames();
  const t = totals(games);
  const picks = top5();
  const banner = picks.find(Boolean) || t.top;

  return `
  <div class="page">
    <section class="pf-hero">
      <div class="pf-banner" style="background-image:url('${esc(banner ? heroSrc(banner) || '' : '')}')"></div>
      <div class="pf-main">
        <button class="pf-avatar ${p.frame ? `framed r-${esc(p.frame)}` : ''}" data-edit-profile title="Modifier le profil">
          ${avatarHtml('pf-avatar-img', false)}
          <span class="pf-avatar-edit">${I.edit}<span>Modifier</span></span>
        </button>
        <div class="pf-id">
          <div class="pf-name-wrap">
            <h1 class="pf-name-txt" title="${esc(p.name)}">${esc(p.name)}</h1>
            ${p.level ? `<button class="pf-badge" data-nav="challenges" title="Voir mes défis">${levelBadge(p.level.level, 'lg')}</button>` : ''}
            ${p.admin ? adminTag(true) : ''}
            ${p.ultimate ? ultimateBadge(true) : ''}
          </div>
          ${p.title ? `<button class="pf-title" data-edit-profile title="Changer de titre">${titleChip(p.title.name, true)}</button>` : ''}
          ${p.level ? levelBar(p.level) : ''}
          <div class="pf-sub">
            ${memberLine(p)}
            ${socialIcons(p.socials, false)}
            ${p.steamName && p.steamName !== p.name ? `<span>Nom Steam : ${esc(p.steamName)}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="pf-edit" data-edit-profile title="Modifier la photo, le pseudo, le titre, le contour, les réseaux et les jeux préférés">${I.edit}<span>Modifier le profil</span></button>
      <div class="pf-stats five">
        <div><b>${fmtHours(t.time)}</b><span>de jeu</span></div>
        <div><b>${t.count}</b><span>jeux installés</span></div>
        <button data-nav="achievements" title="Voir mes succès"><b>${p.ach ? `${p.ach.unlocked}/${p.ach.total}` : '—'}</b><span>succès débloqués</span></button>
        <button data-nav="friends" title="Voir mes amis"><b>${p.friendCount !== null && p.friendCount !== undefined ? p.friendCount : '—'}</b><span>${p.friendCount === 1 ? 'ami' : 'amis'}</span></button>
        <div><b title="${esc(t.top && t.top.playtimeSec ? t.top.name : '')}">${esc(t.top && t.top.playtimeSec ? t.top.name : '—')}</b><span>le plus joué</span></div>
      </div>
    </section>

    ${showcaseSection(p.showcase)}

    ${recordsSection(p.records)}

    <section class="section">
      <div class="section-head">
        <div><h2>Mes 5 jeux préférés</h2><div class="sub">Modifiables avec « Modifier le profil »</div></div>
      </div>
      <div class="top5">
        ${picks.map((g, i) => g ? `
          <div class="slot filled" data-open="${esc(g.id)}">
            <div class="rank">${i + 1}</div>
            ${coverHtml(g)}
            <div class="slot-info"><b title="${esc(g.name)}">${esc(g.name)}</b><span><span class="dot ${g.source}"></span>${esc(fmtTime(g.playtimeSec, 'Pas encore joué'))}</span></div>
          </div>` : `
          <div class="slot empty" data-edit-profile>
            <div class="rank">${i + 1}</div>
            <div class="slot-empty"><span class="plus"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>Choisir un jeu</div>
          </div>`).join('')}
      </div>
    </section>
  </div>`;
}

/* ---- Profile: records, membership, social links ---- */
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const FOUNDERS = 100;

function memberLine(p) {
  const since = p.joinedAt || p.localSince;
  if (!since) return '';
  const d = new Date(since);
  const founder = p.member && p.member <= FOUNDERS;
  return `<span class="pf-member" title="${p.joinedAt ? 'Date de création de ton compte Linkgeek' : 'Date de ta première utilisation de Linkgeek sur ce PC'}">${I.calendar}Membre depuis ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}</span>
    ${founder ? `<span class="founder" title="Fait partie des ${FOUNDERS} premiers membres de Linkgeek (membre n° ${p.member})">★ Fondateur <i>#${p.member}</i></span>` : ''}`;
}

const SOCIALS = {
  discord: { label: 'Discord', icon: '<svg viewBox="0 0 24 24"><path d="M19.3 5.3A16.6 16.6 0 0 0 15.2 4l-.5 1a15.4 15.4 0 0 0-5.4 0l-.5-1a16.6 16.6 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.8 16.7a16.8 16.8 0 0 0 5 2.6l1.1-1.7a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 10.2 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.8 16.8 0 0 0 5-2.6c.5-4.3-.8-8.1-2.3-11.4zM8.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/></svg>',
    url: (v) => (/^\d{17,20}$/.test(v) ? `https://discord.com/users/${v}` : null) },
  twitch: { label: 'Twitch', icon: '<svg viewBox="0 0 24 24"><path d="M4.3 2 3 5.4v13.8h4.7V22h2.6l2.7-2.8h3.9l5.2-5.3V2zm16 11-3 3h-4.7l-2.6 2.6V16H6V3.7h14.3zm-3-6.4h-1.7v5h1.7zm-4.6 0H11v5h1.7z"/></svg>',
    url: (v) => `https://www.twitch.tv/${encodeURIComponent(v)}` },
  tiktok: { label: 'TikTok', icon: '<svg viewBox="0 0 24 24"><path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.2 6.2 0 1 0 5.3 6.2V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4z"/></svg>',
    url: (v) => `https://www.tiktok.com/@${encodeURIComponent(v)}` },
};

/** Small clickable icons. Discord usernames cannot be linked: clicking copies them. */
function socialIcons(socials, editable = false) {
  const s = socials || {};
  const icons = Object.entries(SOCIALS).filter(([k]) => s[k]).map(([k, n]) => {
    const url = n.url(s[k]);
    return url
      ? `<a class="soc ${k}" href="${esc(url)}" target="_blank" title="${n.label} : ${esc(s[k])}">${n.icon}</a>`
      : `<button class="soc ${k}" data-copy-social="${esc(s[k])}" title="${n.label} : ${esc(s[k])} (cliquer pour copier)">${n.icon}</button>`;
  }).join('');
  if (!editable) return icons ? `<span class="socials">${icons}</span>` : '';
  return `<span class="socials">${icons}<button class="soc edit" data-edit-socials title="${icons ? 'Modifier mes réseaux' : 'Ajouter mes réseaux (Discord, Twitch, TikTok)'}">${icons ? I.edit : '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'}${icons ? '' : '<span>Réseaux</span>'}</button></span>`;
}

/* ---- Profile: 5 achievements on display (chosen in "Modifier le profil") ---- */
function showcaseMedal(s, size = '') {
  return `<div class="sc-trophy ${size}">${trophySvg(troArt(s), s.icon)}</div>`;
}
function showcaseSection(list) {
  const slots = list || [null, null, null, null, null];
  return `<section class="section">
    <div class="section-head"><div><h2>Succès en vitrine</h2><div class="sub">Tes succès préférés, visibles par tes amis · à choisir avec « Modifier le profil »</div></div></div>
    <div class="showcase">${slots.map((s, i) => s ? `
      <button class="sc-slot filled ${esc(s.rarity || rarityOfRank(s.tier))}" data-nav="achievements" title="${esc(s.desc || '')}">
        ${showcaseMedal(s, 'lg')}
        <b>${esc(s.name)}</b>
        <span class="sc-tier">${esc(s.tierName || '')}</span>
        ${s.at ? `<small>${new Date(s.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</small>` : ''}
      </button>` : `
      <button class="sc-slot empty" data-edit-profile title="Choisir un succès">
        <span class="plus"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>
        <span>Emplacement ${i + 1}</span>
      </button>`).join('')}</div>
  </section>`;
}

/* ---- Profile: one window to edit everything ---- */
async function editProfileModal() {
  if (!state.shop) { try { state.shop = await api.getShop(); } catch { /* titles unavailable */ } }
  try { state.ach = await api.getAchievements(); } catch { /* keep the last list */ }
  const p = state.profile || {};
  const unlockedAch = ((state.ach && state.ach.items) || []).filter((it) => it.tier >= 1)
    .sort((a, b) => (b.kind ? 1 : 0) - (a.kind ? 1 : 0) || b.tier - a.tier || a.name.localeCompare(b.name, 'fr'));
  const curShow = Array.from({ length: 5 }, (_, i) => (p.showcase && p.showcase[i] ? p.showcase[i].key : ''));
  const draft = {
    name: p.name || '',
    title: p.title ? p.title.key : '',
    frame: p.frameChoice || 'auto',
    socials: { ...(p.socials || {}) },
    top5: Array.from({ length: 5 }, (_, i) => (p.top5 && p.top5[i]) || ''),
  };
  const root = $('#modal-root');
  const lv = (p.level && p.level.level) || 1;
  const current = [...RANKS].reverse().find((r) => lv >= r.min);
  const frameKey = (f) => (f === 'none' ? null : f === 'auto' ? current && current.key : f);
  const pic = () => (state.profile.avatar ? `<img src="${esc(state.profile.avatar)}" alt="">` : `<div>${esc(initials(draft.name || 'Joueur'))}</div>`);
  const titles = ((state.shop && state.shop.titles) || []).filter((t) => t.unlockedAt);
  const games = [...visibleGames()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const photoBlock = () => `<div class="ep-photo">
      <span class="ep-pic fp-pic ${frameKey(draft.frame) ? `framed r-${frameKey(draft.frame)}` : ''}">${pic()}</span>
      <div class="ep-photo-btns">
        <button class="ghost" data-ep="photo">${I.image}Changer la photo</button>
        ${state.profile.customAvatar ? '<button class="link" data-ep="photo-reset">Revenir à la photo par défaut</button>' : ''}
        <small>Visible par tes amis. Elle est enregistrée tout de suite.</small>
      </div>
    </div>`;
  const frameOpts = () => [['auto', 'Automatique', true], ...RANKS.map((r) => [r.key, r.name, lv >= r.min, r.min]), ['none', 'Aucun', true]]
    .map(([k, label, ok, min]) => `<button class="ep-frame ${draft.frame === k ? 'active' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-ep-frame="${k}"` : 'disabled'} title="${esc(ok ? label : `Débloqué au niveau ${min}`)}">
        <span class="fp-pic ${frameKey(k) ? `framed r-${frameKey(k)}` : ''}">${pic()}${ok ? '' : `<i class="fp-lock">${CROWN_LOCK}</i>`}</span><small>${esc(label)}</small></button>`).join('');

  root.innerHTML = `<div class="modal-bg"><div class="modal ep-modal" role="dialog" aria-label="Modifier le profil">
    <div class="ep-head"><h2>${I.edit}Modifier le profil</h2><button class="ep-x" data-ep="cancel" title="Fermer">✕</button></div>
    <div class="ep-body">
      <section class="ep-sec"><h3>Photo de profil</h3><div id="ep-photo">${photoBlock()}</div></section>
      <section class="ep-sec"><h3>Pseudo</h3><input id="ep-name" class="ep-input" maxlength="32" value="${esc(draft.name)}" spellcheck="false" autocomplete="off"></section>
      <section class="ep-sec"><h3>Titre</h3>
        <select id="ep-title" class="ep-input"><option value="">Aucun titre</option>${titles.map((t) => `<option value="${esc(t.key)}" ${draft.title === t.key ? 'selected' : ''}>« ${esc(t.name)} »</option>`).join('')}</select>
        <small class="ep-hint">${titles.length ? 'Affiché sous ton pseudo.' : 'Aucun titre débloqué pour l\'instant : remplis leurs conditions (Boutique → Titres).'}</small></section>
      <section class="ep-sec"><h3>Contour de photo</h3><div class="ep-frames" id="ep-frames">${frameOpts()}</div></section>
      <section class="ep-sec"><h3>Réseaux</h3>
        ${Object.entries(SOCIALS).map(([k, n]) => `<label class="soc-field"><span class="soc ${k}">${n.icon}</span>
          <input id="ep-soc-${k}" class="ep-input" value="${esc(draft.socials[k] || '')}" placeholder="${k === 'discord' ? 'pseudo ou identifiant' : k === 'twitch' ? 'nom de la chaîne' : '@pseudo'}" spellcheck="false" autocomplete="off"></label>`).join('')}
        <small class="ep-hint">Laisse vide pour retirer. Discord : un identifiant numérique rend l'icône cliquable.</small></section>
      <section class="ep-sec"><h3>Succès en vitrine</h3>
        <div class="ep-top5">${curShow.map((k, i) => `<label><span>${i + 1}</span><select id="ep-show-${i}" class="ep-input"><option value="">— Vide —</option>${unlockedAch.map((it) => `<option value="${esc(it.key)}" ${k === it.key ? 'selected' : ''}>${esc(it.name)} · ${esc(it.tiers[it.tier - 1].name)}</option>`).join('')}</select></label>`).join('')}</div>
        <small class="ep-hint">${unlockedAch.length ? `Seuls tes succès débloqués sont proposés (${unlockedAch.length}).` : 'Débloque un succès pour pouvoir l\'afficher ici.'}</small></section>
      <section class="ep-sec"><h3>Mes 5 jeux préférés</h3>
        <div class="ep-top5">${draft.top5.map((id, i) => `<label><span>${i + 1}</span><select id="ep-top-${i}" class="ep-input"><option value="">— Aucun —</option>${games.map((g) => `<option value="${esc(g.id)}" ${id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>`).join('')}</div></section>
    </div>
    <div class="row ep-foot"><button class="ghost" data-ep="cancel">Annuler</button><button class="primary" data-ep="save">Enregistrer</button></div>
  </div></div>`;
  $('#ep-name').focus();

  const close = () => { root.innerHTML = ''; root.onclick = null; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.onclick = async (e) => {
    if (e.target.classList.contains('modal-bg')) return close();
    const fr = e.target.closest('[data-ep-frame]');
    if (fr) { draft.frame = fr.dataset.epFrame; $('#ep-frames').innerHTML = frameOpts(); $('#ep-photo').innerHTML = photoBlock(); return; }
    const b = e.target.closest('[data-ep]');
    if (!b) return;
    const a = b.dataset.ep;
    if (a === 'cancel') return close();
    if (a === 'photo' || a === 'photo-reset') {
      const r = a === 'photo' ? await api.pickAvatar() : await api.resetAvatar();
      if (r) { state.profile = r; $('#ep-photo').innerHTML = photoBlock(); $('#ep-frames').innerHTML = frameOpts(); renderSidebar(); render(true); }
      return;
    }
    if (a !== 'save') return;
    b.disabled = true;
    try {
      const name = $('#ep-name').value.trim();
      const title = $('#ep-title').value;
      const socials = Object.fromEntries(Object.keys(SOCIALS).map((k) => [k, $(`#ep-soc-${k}`).value.trim()]));
      const top = draft.top5.map((_, i) => $(`#ep-top-${i}`).value || null);
      const seen = new Set();
      const top5 = top.map((id) => (id && !seen.has(id) ? (seen.add(id), id) : null)); // the same game only once
      if (name && name !== p.name) state.profile = await api.setProfileName(name);
      if (draft.frame !== (p.frameChoice || 'auto')) state.profile = await api.setFrame(draft.frame);
      if (title !== (p.title ? p.title.key : '')) { const r = await api.equipTitle(title || null); state.shop = r.shop; state.profile = r.profile; }
      if (JSON.stringify(socials) !== JSON.stringify(Object.fromEntries(Object.keys(SOCIALS).map((k) => [k, (p.socials || {})[k] || ''])))) state.profile = await api.setSocials(socials);
      if (JSON.stringify(top5) !== JSON.stringify(draft.top5.map((x) => x || null))) state.profile = await api.setTop5(top5);
      const show = curShow.map((_, i) => $(`#ep-show-${i}`).value || null);
      if (JSON.stringify(show) !== JSON.stringify(curShow.map((x) => x || null))) state.profile = await api.setShowcase(show);
      close();
      renderSidebar(); render(true);
      toast('Profil enregistré');
    } catch (err) { b.disabled = false; toast(errMsg(err), true); }
  };
}

function editSocialsModal() {
  const s = (state.profile && state.profile.socials) || {};
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal soc-modal"><h2>Mes réseaux</h2>
    <p class="set-desc">Tes amis les verront sur ton profil. Laisse vide pour retirer.</p>
    ${Object.entries(SOCIALS).map(([k, n]) => `<label class="soc-field"><span class="soc ${k}">${n.icon}</span>
      <input id="soc-${k}" value="${esc(s[k] || '')}" placeholder="${k === 'discord' ? 'pseudo ou identifiant' : k === 'twitch' ? 'nom de la chaîne' : '@pseudo'}" spellcheck="false" autocomplete="off"></label>`).join('')}
    <p class="soc-hint">Discord : un identifiant numérique (Paramètres Discord → Avancés → Mode développeur, puis clic droit sur ton nom → Copier l'identifiant) rend l'icône cliquable. Avec un simple pseudo, tes amis pourront le copier.</p>
    <div class="row"><button class="ghost" data-m="cancel">Annuler</button><button class="primary" data-m="ok">Enregistrer</button></div>
  </div></div>`;
  root.onclick = async (e) => {
    const m = e.target.closest('[data-m]');
    if (e.target.classList.contains('modal-bg') || (m && m.dataset.m === 'cancel')) { root.innerHTML = ''; return; }
    if (!m) return;
    try {
      state.profile = await api.setSocials({ discord: $('#soc-discord').value, twitch: $('#soc-twitch').value, tiktok: $('#soc-tiktok').value });
      root.innerHTML = '';
      toast('Réseaux enregistrés');
      render(true);
    } catch (err) { toast(errMsg(err), true); }
  };
}

function fmtDur(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`;
}

function recordsSection(r) {
  if (!r) return '';
  const lg = r.longest && byId(r.longest.gameId);
  const mg = r.month && r.month.gameId && byId(r.month.gameId);
  const monthName = r.month ? `${MONTHS_FR[r.month.month]} ${r.month.year}` : '';
  const card = (icon, label, value, sub, g) => `<div class="rec">
      ${g ? `<div class="rec-bg" style="background-image:url('${esc(heroSrc(g) || '')}')"></div>` : ''}
      <div class="rec-ic">${icon}</div>
      <span class="rec-l">${label}</span>
      <b class="rec-v" title="${esc(value)}">${esc(value)}</b>
      <span class="rec-s" title="${esc(sub)}">${esc(sub)}</span>
    </div>`;
  return `<section class="section">
    <div class="section-head"><div><h2>Records</h2><div class="sub">Calculés à partir des sessions suivies par Linkgeek</div></div></div>
    <div class="records">
      ${card(I.bolt, 'Session la plus longue', r.longest ? fmtDur(r.longest.ms) : '—',
        r.longest ? `${lg ? lg.name : 'Jeu retiré'} · ${new Date(r.longest.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Pas encore de session suivie', lg)}
      ${card(I.calendar, 'Série de jours joués', `${r.streak.best} jour${r.streak.best > 1 ? 's' : ''}`,
        r.streak.current ? `Série en cours : ${r.streak.current} jour${r.streak.current > 1 ? 's' : ''} 🔥` : 'Pas de série en cours', null)}
      ${card(I.trophy, `Jeu du mois · ${monthName}`, mg ? mg.name : '—', mg ? `${fmtDur(r.month.ms)} de jeu ce mois-ci` : 'Aucune partie ce mois-ci', mg)}
    </div>
  </section>`;
}

async function saveTop5(ids) {
  state.profile = await api.setTop5(ids);
  render(true);
}

function openPicker(slot) {
  const ids = [...((state.profile && state.profile.top5) || [null, null, null, null, null])];
  const root = $('#modal-root');
  const list = () => {
    const q = ($('#picker-q') ? $('#picker-q').value : '').trim().toLowerCase();
    return visibleGames()
      .filter((g) => !q || g.name.toLowerCase().includes(q))
      .sort((a, b) => b.playtimeSec - a.playtimeSec || a.name.localeCompare(b.name, 'fr'));
  };
  const grid = () => list().map((g) => {
    const pos = ids.indexOf(g.id);
    return `<button class="pick ${pos === slot ? 'current' : ''}" data-pick="${esc(g.id)}" title="${esc(g.name)}">
      ${coverHtml(g)}
      ${pos >= 0 ? `<span class="pick-rank">#${pos + 1}</span>` : ''}
      <b>${esc(g.name)}</b>
    </button>`;
  }).join('') || '<div class="empty" style="grid-column:1/-1">Aucun jeu trouvé</div>';

  root.innerHTML = `<div class="modal-bg"><div class="modal picker">
    <div class="picker-head"><h2>Choisir le jeu n°${slot + 1}</h2><button class="ghost icon-only" data-m="cancel">✕</button></div>
    <div class="search picker-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="picker-q" placeholder="Rechercher un jeu…" autocomplete="off" spellcheck="false"></div>
    <div class="picker-grid" id="picker-grid">${grid()}</div>
  </div></div>`;
  const input = $('#picker-q');
  input.focus();
  input.oninput = () => { $('#picker-grid').innerHTML = grid(); };
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.onclick = async (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const id = pick.dataset.pick;
      const from = ids.indexOf(id);
      if (from >= 0) ids[from] = ids[slot]; // already in top 5: swap places
      ids[slot] = id;
      close();
      return saveTop5(ids);
    }
    if (e.target.closest('[data-m]') || e.target.classList.contains('modal-bg')) close();
  };
}

// Drag & drop to reorder the top 5
let dragSlot = null;
document.addEventListener('dragstart', (e) => {
  const s = e.target.closest && e.target.closest('.slot.filled');
  if (!s) return;
  dragSlot = Number(s.dataset.slot);
  e.dataTransfer.effectAllowed = 'move';
  s.classList.add('dragging');
});
document.addEventListener('dragend', () => {
  dragSlot = null;
  document.querySelectorAll('.slot').forEach((s) => s.classList.remove('dragging', 'drop'));
});
document.addEventListener('dragover', (e) => {
  const s = e.target.closest && e.target.closest('.slot');
  if (!s || dragSlot === null) return;
  e.preventDefault();
  document.querySelectorAll('.slot.drop').forEach((x) => x !== s && x.classList.remove('drop'));
  s.classList.add('drop');
});
document.addEventListener('drop', (e) => {
  const s = e.target.closest && e.target.closest('.slot');
  if (!s || dragSlot === null) return;
  e.preventDefault();
  const to = Number(s.dataset.slot);
  if (to === dragSlot) return;
  const ids = [...state.profile.top5];
  [ids[to], ids[dragSlot]] = [ids[dragSlot], ids[to]];
  saveTop5(ids);
});

/* ---------------- Friends ---------------- */
const STATUS = {
  playing: { label: 'En jeu', cls: 'playing' },
  online: { label: 'En ligne', cls: 'online' },
  away: { label: 'Absent', cls: 'away' },
  offline: { label: 'Hors ligne', cls: 'offline' },
};
const friendState = (f) => (f.state !== 'offline' && f.game ? 'playing' : f.state);

function fmtSince(ms) {
  if (!ms) return '';
  const min = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `depuis ${min} min`;
  const h = Math.floor(min / 60);
  return `depuis ${h} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`;
}

function friendAvatar(f, size = '') {
  const st = STATUS[friendState(f)];
  const inner = f.photo
    ? `<img src="${esc(f.photo)}" alt="" referrerpolicy="no-referrer">`
    : `<span>${esc(initials(f.name))}</span>`;
  return `<div class="f-avatar ${size} ${f.frame ? `framed r-${esc(f.frame)}` : ''}" style="--h:${hue(f.name)}">${inner}<i class="f-dot ${st.cls}" title="${st.label}"></i></div>`;
}

function friendCard(f) {
  const s = friendState(f);
  const st = STATUS[s];
  let line;
  if (s === 'playing') line = `<span class="f-status playing">Joue à <b>${esc(f.game.name)}</b></span>`;
  else if (s === 'offline') line = `<span class="f-status">${f.lastSeen ? 'Vu ' + esc(fmtAgo(f.lastSeen).toLowerCase()) : 'Hors ligne'}</span>`;
  else line = `<span class="f-status ${st.cls}">${st.label}</span>`;
  return `<div class="f-card ${st.cls}" data-friend-open="${esc(f.uid)}" tabindex="0" title="Voir le profil de ${esc(f.name)}">
    ${s === 'playing' && f.game.cover ? `<div class="f-game-bg" style="background-image:url('${esc(f.game.cover)}')"></div>` : ''}
    ${friendAvatar(f)}
    <div class="f-info">
      <div class="f-name"><b title="${esc(f.name)}">${esc(f.name)}</b>${levelBadge(f.level || 1, 'xs')}${f.admin ? adminTag() : ''}${f.card && f.card.ach && f.card.ach.ultimate ? ultimateBadge() : ''}</div>
      ${f.title && titleName(f.title) ? titleChip(titleName(f.title)) : ''}
      ${line}
      ${s === 'playing' ? `<small>${esc(SOURCES[f.game.source] ? SOURCES[f.game.source].label : '')}${f.since ? ' · ' + esc(fmtSince(f.since)) : ''}</small>` : ''}
    </div>
    ${s === 'playing' && f.game.cover ? `<img class="f-game" src="${esc(f.game.cover)}" alt="" referrerpolicy="no-referrer">` : ''}
    <button class="f-remove" data-friend-remove="${esc(f.uid)}" data-name="${esc(f.name)}" title="Retirer des amis">✕</button>
  </div>`;
}

function friendsGate(fr) {
  const s = state.settings || {};
  if (fr.status === 'unconfigured' || (fr.configured === false)) {
    return `<div class="f-gate">${FRIENDS_ART}<b>Le mode en ligne n'est pas encore activé</b>
      <p>Pour voir tes amis, Linkgeek a besoin d'un petit serveur gratuit (Firebase) partagé par tous les joueurs. Ça se configure une seule fois.</p>
      <button class="btn-play" data-goto-account>Configurer le mode en ligne</button></div>`;
  }
  if (!fr.signedIn) {
    const ready = s.google && s.google.configured;
    return `<div class="f-gate">${FRIENDS_ART}<b>Connecte-toi pour retrouver tes amis</b>
      <p>Ton compte Google sert d'identité : tes amis t'ajoutent grâce à ton code ami, et voient quand tu es en ligne et à quoi tu joues.</p>
      ${state.signingIn ? '<div class="acc-wait"><span class="spinner"></span><div><b>Termine la connexion dans ton navigateur…</b></div><button class="ghost" data-acc="cancel">Annuler</button></div>'
        : ready ? `<button class="btn-google" data-acc="signin">${GOOGLE_G}Continuer avec Google</button>` : '<button class="btn-play" data-goto-account>Configurer la connexion Google</button>'}
      ${fr.status === 'error' && fr.error ? `<p class="f-err">${esc(fr.error)}</p>` : ''}</div>`;
  }
  return null;
}

const FRIENDS_ART = '<div class="f-art"><span style="--h:260"></span><span style="--h:190"></span><span style="--h:320"></span></div>';

function viewFriends() {
  const fr = state.friends;
  const gate = friendsGate(fr);
  const head = (sub) => `<div class="page-head"><div><h1>Amis</h1><div class="sub">${sub}</div></div>
    ${gate ? '' : '<button class="ghost icon-only" data-friends-refresh title="Actualiser"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg></button>'}</div>`;
  if (gate) return `<div class="page">${head('Joue avec tes amis et vois ce qu\'ils font')}${gate}</div>`;

  const list = fr.friends || [];
  const q = state.friendQuery.trim().toLowerCase();
  const shown = q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;
  const groups = ['playing', 'online', 'away', 'offline'].map((k) => ({
    k, items: shown.filter((f) => friendState(f) === k).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  })).filter((g) => g.items.length);
  const onlineCount = list.filter((f) => f.state !== 'offline').length;

  // My own status, computed locally
  const myGame = state.games.find((g) => state.running.has(g.id));
  const me = { name: (state.profile && state.profile.name) || 'Moi', photo: state.profile && state.profile.avatar, frame: state.profile && state.profile.frame, state: 'online', game: myGame ? { name: myGame.name } : null };

  return `<div class="page">
    ${head(`${onlineCount} en ligne · ${list.length} ami${list.length > 1 ? 's' : ''}`)}
    ${fr.status === 'error' && fr.error ? `<div class="f-banner">⚠️ ${esc(fr.error)}</div>` : ''}
    <div class="f-top">
      <div class="panel f-me">
        ${friendAvatar(me, 'lg')}
        <div class="f-info">
          <div class="f-name"><b>${esc(me.name)}</b>${state.profile && state.profile.level ? levelBadge(state.profile.level.level, 'sm') : ''}${state.profile && state.profile.admin ? adminTag() : ''}</div>
          ${state.profile && state.profile.title ? titleChip(state.profile.title.name) : ''}
          <span class="f-status ${me.game ? 'playing' : 'online'}">${me.game ? `Joue à <b>${esc(me.game.name)}</b>` : 'En ligne'}</span>
        </div>
        <div class="f-code">
          <span>Ton code ami</span>
          <button data-friends-copy title="Copier">${esc(fr.code || '····-····')}<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button>
        </div>
      </div>
      <form class="panel f-add" id="f-add">
        <b>Ajouter un ami</b>
        <span>Demande-lui son code ami (visible dans son onglet Amis).</span>
        <div class="f-add-row">
          <input id="f-code" placeholder="ABCD-1234" maxlength="9" spellcheck="false" autocomplete="off">
          <button class="btn-play sm" type="submit">Ajouter</button>
        </div>
      </form>
    </div>

    ${(fr.requests || []).length ? `<section class="section">
      <div class="section-head"><h2>Demandes d'ami <span class="pill">${fr.requests.length}</span></h2></div>
      <div class="f-reqs">${fr.requests.map((r) => `
        <div class="f-req panel">
          ${friendAvatar({ ...r, state: 'online' })}
          <div class="f-info"><b>${esc(r.name || 'Joueur')}</b><span class="f-status">veut t'ajouter en ami</span></div>
          <button class="btn-play sm" data-friend-accept="${esc(r.uid)}">Accepter</button>
          <button class="ghost" data-friend-decline="${esc(r.uid)}">Refuser</button>
        </div>`).join('')}</div>
    </section>` : ''}

    ${list.length ? `<div class="segmented f-tabs">
      <button class="${state.friendsTab === 'list' ? 'active' : ''}" data-friends-tab="list">Mes amis<span class="n">${list.length}</span></button>
      <button class="${state.friendsTab === 'board' ? 'active' : ''}" data-friends-tab="board">${I.trophy}Classement</button>
    </div>` : ''}
    ${list.length && state.friendsTab === 'board' ? leaderboard(list) : `<section class="section">
      ${list.length > 6 ? `<div class="search f-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="f-q" placeholder="Rechercher un ami…" value="${esc(state.friendQuery)}" autocomplete="off"></div>` : ''}
      ${!list.length ? `<div class="empty"><b>Pas encore d'amis</b>Partage ton code <b class="mono">${esc(fr.code || '')}</b> ou ajoute celui d'un ami ci-dessus.</div>` : ''}
      ${groups.map((g) => `
        <div class="f-group">
          <div class="f-group-title"><i class="f-dot ${STATUS[g.k].cls}"></i>${STATUS[g.k].label}<span>${g.items.length}</span></div>
          <div class="f-grid">${g.items.map(friendCard).join('')}</div>
        </div>`).join('')}
    </section>`}
  </div>`;
}

/* ---- Leaderboard between friends ---- */
function currentWeekKey() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function leaderboard(list) {
  const wk = currentWeekKey();
  const myCard = state.myCard || {};
  const me = {
    uid: 'me', me: true, name: (state.profile && state.profile.name) || 'Moi', photo: state.profile && state.profile.avatar, frame: state.profile && state.profile.frame,
    level: (state.profile && state.profile.level && state.profile.level.level) || 1, admin: state.profile && state.profile.admin,
    card: myCard, state: 'online',
  };
  const week = (p) => (p.card && p.card.week === wk ? p.card.weekHours || 0 : 0);
  const metrics = {
    week: { label: 'Temps de jeu cette semaine', val: week, fmt: (v) => `${String(v).replace('.', ',')} h` },
    level: { label: 'Niveau', val: (p) => p.level || 1, fmt: (v) => `Niveau ${v}` },
    ach: { label: 'Points de succès', val: (p) => (p.card && p.card.ach ? p.card.ach.points : 0), fmt: (v) => `${v.toLocaleString('fr-FR')} pts` },
    total: { label: 'Temps de jeu total', val: (p) => (p.card ? p.card.totalHours || 0 : 0), fmt: (v) => `${Math.round(v).toLocaleString('fr-FR')} h` },
  };
  const m = metrics[state.board] || metrics.week;
  const rows = [me, ...list].map((p) => ({ p, v: m.val(p) })).sort((a, b) => b.v - a.v || a.p.name.localeCompare(b.p.name, 'fr'));
  const max = Math.max(1, ...rows.map((r) => r.v));
  const medals = ['🥇', '🥈', '🥉'];
  return `<section class="section">
    <div class="lb-head">
      <div class="segmented">${Object.entries(metrics).map(([k, x]) => `<button class="${state.board === k ? 'active' : ''}" data-board="${k}">${x.label}</button>`).join('')}</div>
      ${state.board === 'week' ? '<span class="lb-hint">Remis à zéro chaque lundi</span>' : ''}
    </div>
    <div class="panel lb">
      ${rows.map((r, i) => `<div class="lb-row ${r.p.me ? 'me' : ''}" ${r.p.me ? '' : `data-friend-open="${esc(r.p.uid)}"`}>
        <span class="lb-rank">${r.v > 0 && i < 3 ? medals[i] : i + 1}</span>
        ${friendAvatar(r.p)}
        <div class="lb-name"><b>${esc(r.p.name)}${r.p.me ? ' <small>(toi)</small>' : ''}</b>${levelBadge(r.p.level || 1, 'xs')}${r.p.admin ? adminTag() : ''}${(() => { const n = r.p.me ? state.profile && state.profile.title && state.profile.title.name : r.p.title && titleName(r.p.title); return n ? titleChip(n) : ''; })()}</div>
        <div class="lb-bar"><i style="width:${Math.round((r.v / max) * 100)}%"></i></div>
        <b class="lb-val">${esc(m.fmt(r.v))}</b>
      </div>`).join('')}
    </div>
    <p class="lb-note">Les amis qui ont une ancienne version de Linkgeek apparaissent à 0 tant qu'ils n'ont pas mis à jour.</p>
  </section>`;
}

/* ---- A friend's profile ---- */
function friendProfileModal(uid) {
  const f = (state.friends.friends || []).find((x) => x.uid === uid);
  if (!f) return;
  const c = f.card || {};
  const s = friendState(f);
  const rank = rankOf(f.level || 1);
  const wk = currentWeekKey();
  const cover = (g) => g && g.cover
    ? `<img src="${esc(g.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
    : `<span style="--h:${hue((g && g.name) || '?')}">${esc(initials((g && g.name) || '?'))}</span>`;
  const top5 = (c.top5 || []).filter(Boolean);
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal fp">
    <button class="fp-close" data-m="close" title="Fermer">✕</button>
    <div class="fp-head">
      ${friendAvatar(f, 'xl')}
      <div>
        <div class="f-name fp-name"><b>${esc(f.name)}</b>${levelBadge(f.level || 1, 'md')}${f.admin ? adminTag(true) : ''}${c.ach && c.ach.ultimate ? ultimateBadge(true) : ''}</div>
        ${f.title && titleName(f.title) ? titleChip(titleName(f.title)) : ''}
        <div class="fp-sub">Niveau ${f.level || 1} · ${esc(rank.name)}</div>
        <div class="fp-meta">${memberLine({ joinedAt: f.joinedAt, member: f.member })}${socialIcons(c.socials)}</div>
        <div class="f-status ${STATUS[s].cls}">${s === 'playing' ? `Joue à <b>${esc(f.game.name)}</b>${f.since ? ' · ' + esc(fmtSince(f.since)) : ''}` : s === 'offline' ? (f.lastSeen ? 'Vu ' + esc(fmtAgo(f.lastSeen).toLowerCase()) : 'Hors ligne') : STATUS[s].label}</div>
      </div>
    </div>
    ${f.card ? `
    <div class="fp-kpis">
      <div><span>Cette semaine</span><b>${c.week === wk ? String(c.weekHours || 0).replace('.', ',') : 0} h</b></div>
      <div><span>Temps total</span><b>${Math.round(c.totalHours || 0).toLocaleString('fr-FR')} h</b></div>
      <div><span>Jeux</span><b>${c.games || 0}</b></div>
      <div><span>Succès</span><b>${c.ach ? `${c.ach.unlocked}/${c.ach.total}` : '—'}</b><small>${c.ach ? `${c.ach.points.toLocaleString('fr-FR')} pts` : ''}</small></div>
    </div>
    ${c.records ? `<div class="fp-recs">
      <div>${I.bolt}<span>Session la plus longue</span><b>${c.records.longestMin ? fmtDur(c.records.longestMin * 60000) : '—'}</b></div>
      <div>${I.calendar}<span>Série de jours joués</span><b>${c.records.bestStreak || 0} jour${c.records.bestStreak > 1 ? 's' : ''}</b></div>
      <div>${I.trophy}<span>Jeu du mois</span><b title="${esc(c.records.monthGame || '')}">${esc(c.records.monthGame || '—')}</b></div>
    </div>` : ''}
    ${Object.values(c.showcase || {}).filter(Boolean).length ? `<div class="fp-show"><span class="fp-show-l">Succès en vitrine</span><div>${Object.values(c.showcase).filter(Boolean).map((sc) => `<div class="fp-show-it" title="${esc(sc.name)}">${showcaseMedal(sc)}<b>${esc(sc.name)}</b></div>`).join('')}</div></div>` : ''}
    ${c.top ? `<div class="fp-top">
      <div class="fp-cover">${cover(c.top)}</div>
      <div><span>Jeu le plus joué</span><b>${esc(c.top.name)}</b><small>${String(c.top.hours).replace('.', ',')} h de jeu</small></div>
    </div>` : ''}
    <h3 class="set-h3">Top 5</h3>
    ${top5.length ? `<div class="fp-top5">${top5.map((g, i) => `<div class="fp-slot"><div class="fp-cover">${cover(g)}<i>${i + 1}</i></div><b title="${esc(g.name)}">${esc(g.name)}</b></div>`).join('')}</div>`
      : '<p class="fp-empty">Pas encore de top 5.</p>'}`
      : `<p class="fp-empty">${esc(f.name)} n'a pas encore partagé son profil : il apparaîtra quand son Linkgeek sera à jour.</p>`}
  </div></div>`;
  root.onclick = (e) => {
    if (e.target.closest('[data-m]') || e.target.classList.contains('modal-bg')) root.innerHTML = '';
  };
}

/* ---- "Mirko vient de lancer Rocket League" ---- */
function friendActivityToast(a) {
  const t = document.createElement('div');
  t.className = 'toast f-toast';
  t.innerHTML = `${a.game.cover ? `<img src="${esc(a.game.cover)}" alt="" referrerpolicy="no-referrer">` : ''}
    <div><b>${esc(a.name)}</b><span>vient de lancer <b>${esc(a.game.name)}</b></span></div>`;
  t.addEventListener('click', () => go('friends'));
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 5200);
  setTimeout(() => t.remove(), 5600);
}

function confirmModal(title, text, okLabel, danger = true) {
  return new Promise((resolve) => {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-bg"><div class="modal"><h2>${esc(title)}</h2><p style="color:var(--muted);line-height:1.5">${esc(text)}</p><div class="row"><button class="ghost" data-m="cancel">Annuler</button><button class="primary${danger ? ' danger-fill' : ''}" data-m="ok">${esc(okLabel)}</button></div></div></div>`;
    const close = (v) => { root.innerHTML = ''; resolve(v); };
    root.onclick = (e) => {
      const m = e.target.closest('[data-m]');
      if (m) close(m.dataset.m === 'ok');
      else if (e.target.classList.contains('modal-bg')) close(false);
    };
  });
}

async function friendsClick(t) {
  const d = t.dataset;
  try {
    if (d.gotoAccount !== undefined) { state.settingsTab = 'account'; return go('settings'); }
    if (d.friendsRefresh !== undefined) { t.classList.add('spin'); state.friends = await api.refreshFriends(); return render(true); }
    if (d.friendsCopy !== undefined) { if (await api.copyFriendCode()) toast('Code ami copié !'); return; }
    if (d.friendAccept) { await api.acceptFriend(d.friendAccept); toast('Ami ajouté 🎉'); return; }
    if (d.friendDecline) { await api.declineFriend(d.friendDecline); return; }
    if (d.friendOpen) return friendProfileModal(d.friendOpen);
    if (d.friendsTab) { state.friendsTab = d.friendsTab; if (d.friendsTab === 'board') loadMyCard(); return render(true); }
    if (d.board) { state.board = d.board; return render(true); }
    if (d.friendRemove) {
      if (await confirmModal('Retirer cet ami ?', `${d.name} ne sera plus dans ta liste d'amis, et tu disparaîtras de la sienne.`, 'Retirer')) {
        await api.removeFriend(d.friendRemove);
        toast(`${d.name} a été retiré de tes amis`);
      }
    }
  } catch (e) { toast(errMsg(e), true); }
}

async function loadMyCard() {
  try { state.myCard = await api.getMyCard(); if (state.view === 'friends') render(true); } catch { /* ignore */ }
}

/* ---------------- Collections ---------------- */
async function collectionsClick(t) {
  const d = t.dataset;
  try {
    if (d.col) { state.collection = state.collection === d.col ? null : d.col; return render(true); }
    if (d.colNew !== undefined) {
      const name = await promptModal('Nouvelle collection', '');
      if (!name || !name.trim()) return;
      const id = await api.createCollection(name);
      if (d.gid) await api.toggleCollection(id, d.gid);
      await reload();
      toast(`Collection « ${name.trim()} » créée`);
      return render(true);
    }
    if (d.colToggle) {
      const added = await api.toggleCollection(d.colToggle, d.gid);
      await reload();
      toast(added ? `Ajouté à « ${state.collections[d.colToggle].name} »` : `Retiré de « ${state.collections[d.colToggle].name} »`);
      return render(true);
    }
    if (d.colRename) {
      const c = state.collections[d.colRename];
      const name = await promptModal('Renommer la collection', c ? c.name : '');
      if (name && name.trim()) { await api.renameCollection(d.colRename, name); await reload(); render(true); }
      return;
    }
    if (d.colDel) {
      const c = state.collections[d.colDel];
      if (await confirmModal('Supprimer cette collection ?', `« ${c ? c.name : ''} » sera supprimée. Les jeux restent dans ta bibliothèque.`, 'Supprimer')) {
        await api.deleteCollection(d.colDel);
        state.collection = null;
        await reload(); render(true);
      }
    }
  } catch (e) { toast(errMsg(e), true); }
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'f-add') return;
  e.preventDefault();
  const input = $('#f-code');
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const r = await api.addFriend(input.value);
    toast(r === 'accepted' ? 'Vous êtes maintenant amis 🎉' : 'Demande d\'ami envoyée');
    input.value = '';
  } catch (err) { toast(errMsg(err), true); } finally { btn.disabled = false; }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'f-code') {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    e.target.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v;
  }
  if (e.target.id === 'f-q') {
    state.friendQuery = e.target.value;
    const pos = e.target.selectionStart;
    render(true);
    const i = $('#f-q'); if (i) { i.focus(); i.setSelectionRange(pos, pos); }
  }
});

function onFriendsSnapshot(snap) {
  const prev = state.friends;
  const prevReq = new Set((prev.requests || []).map((r) => r.uid));
  state.friends = snap;
  if (prev.status === 'online') {
    for (const r of snap.requests || []) if (!prevReq.has(r.uid)) toast(`${r.name || 'Quelqu\'un'} veut t'ajouter en ami`);
    // friends who start a game: see friendActivityToast (sent by the main process)
  }
  const typing = document.activeElement && ['f-code', 'f-q', 'pf-name', 'modal-input'].includes(document.activeElement.id);
  if (state.view === 'friends' && !typing) render(true); else renderSidebar();
}

/* ---------------- Levels & challenges ---------------- */
const DEFAULT_RANKS = [
  { min: 1, key: 'rookie', name: 'Recrue' },
  { min: 5, key: 'bronze', name: 'Bronze' },
  { min: 10, key: 'silver', name: 'Argent' },
  { min: 30, key: 'gold', name: 'Or' },
  { min: 40, key: 'platinum', name: 'Platine' },
  { min: 50, key: 'diamond', name: 'Diamant' },
  { min: 60, key: 'emerald', name: 'Émeraude' },
  { min: 70, key: 'master', name: 'Master' },
];
let RANKS = DEFAULT_RANKS; // can be changed by the admin
const setRanks = (r) => { if (Array.isArray(r) && r.length === DEFAULT_RANKS.length) RANKS = r; };
const rankOf = (level) => [...RANKS].reverse().find((r) => level >= r.min) || RANKS[0];
const signedXp = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('fr-FR')}`;
const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>';
const adminTag = (big = false) => `<span class="adm-tag${big ? ' big' : ''}" title="Administrateur de Linkgeek">${CROWN}${big ? 'Admin' : ''}</span>`;

/** Hexagonal rank badge with the level number inside. */
function levelBadge(level, size = '', forceRank = null, locked = false) {
  const r = forceRank || rankOf(level);
  return `<span class="lv-badge ${size} r-${r.key}${locked ? ' locked' : ''}" title="Niveau ${level} · Badge ${esc(r.name)}"><i></i><b>${level}</b></span>`;
}

function levelBar(lv) {
  const pct = Math.min(100, (lv.into / lv.needed) * 100);
  return `<div class="lv-line">
    <span class="lv-rank r-${lv.rank}">${esc(lv.rankName)}</span>
    <div class="lv-track"><i class="r-${lv.rank}" style="width:${pct.toFixed(1)}%"></i></div>
    <span class="lv-xp">${lv.into.toLocaleString('fr-FR')} / ${lv.needed.toLocaleString('fr-FR')} XP</span>
  </div>`;
}

const CH_ICONS = {
  ...ACH_ICONS_BASE(),
  rocket: '<svg viewBox="0 0 24 24"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1-4 4.5-8 12-9-1 7.5-5 11-9 12z"/><circle cx="14.5" cy="9.5" r="1.8"/></svg>',
  rewind: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
};
function ACH_ICONS_BASE() { return { pad: I.pad, clock: I.clock, bolt: I.bolt, calendar: I.calendar, star: I.star, play: I.play, image: I.image, trophy: I.trophy }; }

function fmtGoal(v, unit) {
  if (unit !== 'min') return v.toLocaleString('fr-FR');
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60); const m = v % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
function fmtCountdown(ms) {
  const s = Math.max(0, ms - Date.now()) / 1000;
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

function chCard(c) {
  const done = !!c.doneAt;
  const pct = Math.min(100, (c.value / c.goal) * 100);
  const icon = CH_ICONS[c.icon] || ACH_ICONS[c.icon] || I.bolt;
  return `<div class="ch-card panel${done ? ' done' : ''}">
    <div class="ch-icon">${done ? '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' : icon}</div>
    <div class="ch-body">
      <b>${esc(c.title)}</b>
      <div class="ch-prog"><div class="a-bar"><i style="width:${pct.toFixed(1)}%"></i></div><span>${done ? 'Terminé' : `${fmtGoal(c.value, c.unit)} / ${fmtGoal(c.goal, c.unit)}`}</span></div>
    </div>
    <span class="ch-xp">+${c.xp} XP</span>
  </div>`;
}

function viewChallenges() {
  const c = state.chal;
  const head = `<div class="page-head"><div><h1>Défis</h1><div class="sub">Relève des défis pour gagner de l'XP, monter de niveau et débloquer des badges</div></div></div>`;
  if (!c) return `<div class="page">${head}</div>`;
  const lv = c.level;
  const rank = RANKS.find((r) => r.key === lv.rank);
  const pending = c.onetime.filter((x) => !x.doneAt);
  const doneOnce = c.onetime.filter((x) => x.doneAt);
  const dailyLeft = c.daily.items.filter((x) => !x.doneAt).length;
  return `<div class="page">
    ${head}
    <div class="panel lv-hero r-${lv.rank}">
      ${levelBadge(lv.level, 'xl')}
      <div class="lv-info">
        <span class="lv-kicker">Badge ${esc(rank.name)}</span>
        <h2>Niveau ${lv.level}</h2>
        ${levelBar(lv)}
        <div class="lv-meta">${lv.xp.toLocaleString('fr-FR')} XP au total · encore ${(lv.needed - lv.into).toLocaleString('fr-FR')} XP avant le niveau ${lv.level + 1}${lv.nextRank ? ` · prochain badge : <b>${esc(lv.nextRank.name)}</b> au niveau ${lv.nextRank.level}` : ''}</div>
      </div>
    </div>
    <div class="lv-ranks">${RANKS.map((r) => {
      const got = lv.level >= r.min;
      return `<div class="lv-step${got ? ' got' : ''}${r.key === lv.rank ? ' current' : ''}">${levelBadge(r.min, 'md', r, !got)}<b>${esc(r.name)}</b><span>Niveau ${r.min}</span></div>`;
    }).join('<div class="lv-link"></div>')}</div>

    <section class="section">
      <div class="section-head"><div><h2>Défis du jour</h2><div class="sub">${dailyLeft ? `${dailyLeft} restant${dailyLeft > 1 ? 's' : ''} · ` : 'Tous terminés 🎉 · '}nouveaux défis dans ${fmtCountdown(c.daily.resetsAt)}</div></div></div>
      <div class="ch-grid">${c.daily.items.map(chCard).join('')}</div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>Défis de la semaine</h2><div class="sub">Renouvelés dans ${fmtCountdown(c.weekly.resetsAt)}</div></div></div>
      <div class="ch-grid">${c.weekly.items.map(chCard).join('')}</div>
    </section>
    ${pending.length ? `<section class="section">
      <div class="section-head"><div><h2>Premiers pas</h2><div class="sub">Défis uniques · ${doneOnce.length} / ${c.onetime.length} terminés</div></div></div>
      <div class="ch-grid">${[...pending, ...doneOnce].map(chCard).join('')}</div>
    </section>` : ''}
    ${c.history.length ? `<section class="section">
      <div class="section-head"><h2>XP gagnée récemment</h2></div>
      <div class="panel ch-history">${c.history.map((h) => `<div><span class="ch-kind">${h.kind === 'daily' ? 'Jour' : h.kind === 'weekly' ? 'Semaine' : h.kind === 'admin' ? 'Admin' : h.kind === 'wheel' ? 'Roulette' : 'Unique'}</span><b>${esc(h.title)}</b><span class="ch-when">${esc(fmtAgo(h.at))}</span><span class="ch-xp${h.xp < 0 ? ' neg' : ''}">${signedXp(h.xp)} XP</span></div>`).join('')}</div>
    </section>` : ''}
  </div>`;
}

async function loadChallenges() {
  try {
    state.chal = await api.getChallenges();
    if (state.chal) setRanks(state.chal.ranks);
    if (state.chal && state.profile) state.profile.level = state.chal.level;
    if (state.view === 'challenges') render(true); else renderSidebar();
  } catch (e) { console.error(e); }
}

function onChallengesDone(r) {
  if (state.profile) state.profile.level = r.level;
  for (const c of r.completed.slice(0, 4)) {
    if (c.kind === 'wheel') continue; // the wheel shows its own result
    const t = document.createElement('div');
    t.className = 'toast ach ch';
    const label = c.kind === 'admin' ? 'Administrateur' : `Défi ${c.kind === 'daily' ? 'du jour' : c.kind === 'weekly' ? 'de la semaine' : 'unique'} terminé`;
    t.innerHTML = `<span class="ch-toast-xp">${signedXp(c.xp)}<small>XP</small></span><div><small>${label}</small><b>${esc(c.title)}</b></div>`;
    t.addEventListener('click', () => go('challenges'));
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 5000);
    setTimeout(() => t.remove(), 5500);
  }
  if (r.tokens > 0) coinToast(r.tokens, r.levelUp ? `Niveau ${r.levelUp.to} atteint` : 'Défi terminé');
  if (r.levelUp) {
    const u = r.levelUp;
    const t = document.createElement('div');
    t.className = 'toast ach lvup';
    t.innerHTML = `${levelBadge(u.to, 'md')}<div><small>${u.rankUp ? 'Nouveau badge et nouveau contour débloqués !' : 'Niveau supérieur !'}</small><b>Niveau ${u.to}${u.rankUp ? ` · ${esc(u.rankName)}` : ''}</b></div>`;
    t.addEventListener('click', () => go('challenges'));
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 6500);
    setTimeout(() => t.remove(), 7000);
  }
  loadChallenges();
  if (r.tokens) loadShop();
  if (r.levelUp && r.levelUp.rankUp) reload().then(() => render(true)); // new frame
  else if (state.view === 'profile' || state.view === 'friends') render(true);
}

/* ---------------- Boutique ---------------- */
const COIN = '<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2c.5-1 1.4-1.5 2.6-1.5 1.5 0 2.5.8 2.5 2 0 2.4-4.6 1.7-4.6 4.4 0 1.2 1 2.1 2.6 2.1 1.2 0 2.1-.5 2.6-1.5M12 6v1.7M12 16.3V18"/></svg>';
const fmtCoins = (n) => Number(n || 0).toLocaleString('fr-FR');

function coinToast(n, why) {
  const t = document.createElement('div');
  t.className = 'toast coin-toast';
  t.innerHTML = `${COIN}<div><b>${n < 0 ? '−' : '+'}${fmtCoins(Math.abs(n))} jetons</b><span>${esc(why)}</span></div>`;
  t.addEventListener('click', () => go('shop'));
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 4200);
  setTimeout(() => t.remove(), 4700);
}

async function loadShop() {
  try {
    state.shop = await api.getShop();
    if (state.view === 'shop' || (state.view === 'settings' && state.settingsTab === 'appearance')) render(true); else renderSidebar();
  } catch (e) { console.error(e); }
}

function viewShop() {
  const s = state.shop;
  const head = `<div class="page-head"><div><h1>Boutique</h1><div class="sub">Dépense tes jetons pour personnaliser Linkgeek</div></div></div>`;
  if (!s) return `<div class="page">${head}</div>`;
  const cur = state.settings && state.settings.theme;
  const lvl = s.level || 1;
  const card = (t) => {
    const lockedLvl = !t.owned && lvl < (t.minLevel || 1);
    const afford = s.coins >= t.price && !lockedLvl;
    const active = cur === t.id;
    return `<div class="shop-card rar-${esc(t.rarity || 'common')} ${t.owned ? 'owned' : ''} ${active ? 'active' : ''} ${lockedLvl ? 'lvl-locked' : ''}">
      <span class="rar-tag ${esc(t.rarity || 'common')}">${esc(((s.rarities || {})[t.rarity] || {}).name || 'Commun')}</span>
      ${themePreview(t)}
      ${lockedLvl ? `<div class="shop-lvl-lock">${CROWN_LOCK}<b>Niveau ${t.minLevel} requis</b><small>Tu es niveau ${lvl} · encore ${t.minLevel - lvl} niveau${t.minLevel - lvl > 1 ? 'x' : ''}</small></div>` : ''}
      <div class="shop-meta">
        <div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div>
        ${t.owned
          ? (active ? '<span class="chip live">✓ Appliqué</span>' : `<button class="btn-glass sm" data-shop-apply="${t.id}">Appliquer</button>`)
          : `<button class="btn-play sm ${afford ? '' : 'disabled'}" data-shop-buy="${t.id}" ${afford ? '' : `title="${lockedLvl ? `Niveau ${t.minLevel} requis` : 'Pas assez de jetons'}"`}>${COIN}${fmtCoins(t.price)}</button>`}
      </div>
      ${!t.owned && !afford && !lockedLvl ? `<div class="shop-miss">Encore ${fmtCoins(t.price - s.coins)} jetons</div>` : ''}
    </div>`;
  };
  const ownedCount = s.themes.filter((t) => t.owned).length;
  return `<div class="page">
    ${head}
    <div class="panel shop-wallet">
      <div class="shop-coin">${COIN}</div>
      <div class="shop-bal"><span>Mes jetons</span><b>${fmtCoins(s.coins)}</b></div>
      <div class="shop-earn">
        <b>Comment en gagner ?</b>
        <span>✓ Chaque défi terminé : 1 jeton pour ${s.rates.perXp} XP (un défi à 80 XP = ${Math.round(80 / s.rates.perXp)} jetons)</span>
        <span>⬆ Chaque nouveau niveau : 20 + 5 × le niveau (niveau 20 = 120 jetons)</span>
        <span>🔒 Thèmes rares dès le niveau ${((s.rarities || {}).rare || {}).minLevel || 15}, épiques dès le niveau ${((s.rarities || {}).epic || {}).minLevel || 40}</span>
      </div>
      <button class="ghost" data-nav="challenges">Voir mes défis</button>
    </div>
    ${s.wheel ? wheelSection(s) : ''}
    <section class="section">
      <div class="section-head"><div><h2>Thèmes</h2><div class="sub">${ownedCount} / ${s.themes.length} possédés · les thèmes achetés apparaissent aussi dans Paramètres → Apparence</div></div></div>
      ${['common', 'rare', 'epic'].map((r) => {
        const list = s.themes.filter((t) => (t.rarity || 'common') === r);
        if (!list.length) return '';
        const info = { common: 'Une nouvelle palette de couleurs', rare: 'Couleurs + fond animé', epic: 'Effets animés exclusifs dans toute l\'application' }[r];
        const need = ((s.rarities || {})[r] || {}).minLevel || 1;
        return `<div class="rar-head ${r}"><b>${esc(((s.rarities || {})[r] || {}).name || r)}</b><span>${esc(info)}</span>${need > 1 ? `<em class="rar-lvl ${lvl >= need ? 'ok' : ''}">${lvl >= need ? '✓' : '🔒'} Niveau ${need}</em>` : ''}<i>${list.filter((t) => t.owned).length} / ${list.length}</i></div>
          <div class="shop-grid">${list.map(card).join('')}</div>`;
      }).join('')}
    </section>
    ${(s.titles || []).length ? `<section class="section">
      <div class="section-head"><div><h2>Titres</h2><div class="sub">${s.titles.filter((t) => t.unlockedAt).length} / ${s.titles.length} débloqués · ils ne s'achètent pas : remplis la condition pour les gagner, puis affiche-en un sous ton pseudo</div></div></div>
      <div class="title-grid">${s.titles.map(titleCard).join('')}</div>
    </section>` : ''}
    ${s.log.length ? `<section class="section">
      <div class="section-head"><h2>Historique</h2></div>
      <div class="panel shop-log">${s.log.map((l) => `<div><span>${esc(l.why)}</span><small>${esc(fmtAgo(l.at))}</small><b class="${l.n < 0 ? 'neg' : 'pos'}">${l.n > 0 ? '+' : '−'}${fmtCoins(Math.abs(l.n))}</b></div>`).join('')}</div>
    </section>` : ''}
  </div>`;
}

/* ---- Shop: daily wheel (1 free spin per day, slices sized by their odds) ---- */
// in: colour near the hub, out: colour at the rim, fill: legend chip
const WHEEL_STYLE = {
  c10: { in: '#3a2c0c', out: '#8a6a1c', fill: '#8a6a1c' },
  x15: { in: '#1d1546', out: '#5a46b8', fill: '#5a46b8' },
  c25: { in: '#5a400a', out: '#d29d22', fill: '#d29d22' },
  x35: { in: '#2b1d70', out: '#8466ff', fill: '#8466ff' },
  c50: { in: '#8a5f06', out: '#ffd85e', fill: '#ffd85e' },
  theme: { in: '#ff2bd6', out: '#22d3ee', fill: 'linear-gradient(135deg,#ff2bd6,#a855f7,#22d3ee)' },
};
const prizeLabel = (p) => (p.kind === 'coins' ? `${p.n} jetons` : p.kind === 'xp' ? `${p.n} XP` : 'Un thème au hasard');

/** Rotating disc: gradient slices sized by their odds, gold separators and pegs,
 *  an icon (coin / XP badge / star) and the amount in each slice. */
function wheelSvg(w, winKey) {
  const R = 100, rad = (d) => (d * Math.PI) / 180;
  const pt = (a, r = R) => [100 + r * Math.sin(rad(a)), 100 - r * Math.cos(rad(a))].map((v) => v.toFixed(2)).join(' ');
  let a = 0;
  const defs = [];
  const seps = [];
  const pegs = [];
  const slices = w.segments.map((p) => {
    const a0 = a, a1 = a + p.pct * 3.6; a = a1;
    const span = a1 - a0, mid = (a0 + a1) / 2;
    const st = WHEEL_STYLE[p.key] || { in: '#222', out: '#555' };
    defs.push(p.kind === 'theme'
      ? `<linearGradient id="wg-${p.key}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2bd6"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>`
      : `<radialGradient id="wg-${p.key}" cx="100" cy="100" r="100" gradientUnits="userSpaceOnUse"><stop offset=".15" stop-color="${st.in}"/><stop offset="1" stop-color="${st.out}"/></radialGradient>`);
    seps.push(`<path d="M100 100L${pt(a0, 98)}"/>`);
    const [px, py] = pt(a0, 94).split(' ');
    pegs.push(`<circle cx="${px}" cy="${py}" r="2.4"/>`);
    const d = `M100 100 L${pt(a0)} A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${pt(a1)} Z`;
    let icon = '';
    if (p.kind === 'coins') icon = `<circle cx="100" cy="${span >= 40 ? 22 : 20}" r="${span >= 40 ? 8 : 6.5}" fill="url(#wg-coin)" stroke="#6b4604" stroke-width="1"/><circle cx="100" cy="${span >= 40 ? 22 : 20}" r="${span >= 40 ? 5 : 4}" fill="none" stroke="rgba(110,70,0,.65)" stroke-width="1"/>`;
    else if (p.kind === 'xp') icon = `<rect x="${span >= 40 ? 89 : 91}" y="${span >= 40 ? 15 : 14}" width="${span >= 40 ? 22 : 18}" height="${span >= 40 ? 13 : 11}" rx="3.5" fill="#efe9ff" stroke="#4b33c4" stroke-width="1"/><text x="100" y="${span >= 40 ? 25 : 22.6}" class="wh-xp">XP</text>`;
    else icon = `<path d="M100 7l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#fff" stroke="rgba(80,0,90,.5)" stroke-width=".6"/>`;
    const num = p.kind === 'theme' ? '' : `<text x="100" y="${span >= 60 ? 52 : span >= 40 ? 50 : 42}" class="wh-n ${span >= 60 ? 'big' : span < 35 ? 'sm' : ''}">${p.n}</text>`;
    const win = winKey === p.key ? `<path d="${d}" class="wh-win"/>` : '';
    return `<path d="${d}" fill="url(#wg-${p.key})"/>${win}<g transform="rotate(${mid.toFixed(2)} 100 100)">${icon}${num}</g>`;
  }).join('');
  return `<svg viewBox="0 0 200 200" class="wh-svg">
    <defs>${defs.join('')}<linearGradient id="wg-coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f2b92c"/><stop offset="1" stop-color="#a86d0c"/></linearGradient></defs>
    <circle cx="100" cy="100" r="100" fill="#0c0f16"/>
    ${slices}
    <g stroke="rgba(255,226,150,.75)" stroke-width="1.1">${seps.join('')}</g>
    <g fill="url(#wg-coin)" stroke="#6b4604" stroke-width=".6">${pegs.join('')}</g>
  </svg>`;
}

/** Static frame drawn over the disc: gold ring with blinking bulbs, inner shading and a glass highlight. */
function wheelFrame() {
  const bulbs = Array.from({ length: 24 }, (_, i) => {
    const t = (i * 15 * Math.PI) / 180;
    return `<circle class="wh-bulb ${i % 2 ? 'b2' : ''}" cx="${(150 + 140 * Math.sin(t)).toFixed(1)}" cy="${(150 - 140 * Math.cos(t)).toFixed(1)}" r="3.6"/>`;
  }).join('');
  return `<svg class="wheel-frame" viewBox="0 0 300 300" aria-hidden="true">
    <defs>
      <linearGradient id="wf-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".3" stop-color="#f2b92c"/><stop offset=".55" stop-color="#8a5a06"/><stop offset=".8" stop-color="#f2c445"/><stop offset="1" stop-color="#ffe58a"/></linearGradient>
      <radialGradient id="wf-shade" cx="150" cy="150" r="131" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
      <linearGradient id="wf-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <circle cx="150" cy="150" r="131" fill="url(#wf-shade)"/>
    <ellipse cx="150" cy="92" rx="100" ry="58" fill="url(#wf-gloss)"/>
    <circle cx="150" cy="150" r="140" fill="none" stroke="url(#wf-gold)" stroke-width="18"/>
    <circle cx="150" cy="150" r="149" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
    <circle cx="150" cy="150" r="131" fill="none" stroke="rgba(60,35,0,.8)" stroke-width="1.5"/>
    ${bulbs}
  </svg>`;
}
const WHEEL_POINTER = `<svg viewBox="0 0 36 46" aria-hidden="true"><defs>
  <linearGradient id="wp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f2b92c"/><stop offset="1" stop-color="#9a6408"/></linearGradient>
  <radialGradient id="wp-r" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffb3c2"/><stop offset=".5" stop-color="#ff2e63"/><stop offset="1" stop-color="#8a0024"/></radialGradient></defs>
  <path d="M18 44L4.5 17A14 14 0 1 1 31.5 17Z" fill="url(#wp-g)" stroke="#6b4604" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="18" cy="14" r="6.5" fill="url(#wp-r)" stroke="#6b4604" stroke-width="1"/><circle cx="16" cy="12" r="2" fill="#fff" opacity=".8"/></svg>`;

function wheelSection(s) {
  const w = s.wheel;
  const spinning = !!state.wheelSpinning;
  const left = Math.max(0, w.nextAt - Date.now());
  const wait = `${Math.floor(left / 3600000)} h ${String(Math.floor(left / 60000) % 60).padStart(2, '0')} min`;
  const last = state.wheelResult || (w.last && dayStr(w.last.at) === dayStr(Date.now()) ? w.last : null);
  const lastTxt = (p) => (p.kind === 'theme' ? (p.theme ? `le thème ${p.theme.name}` : `${p.duplicate} jetons (tu avais déjà tous les thèmes)`) : prizeLabel(p));
  return `<section class="section">
    <div class="section-head"><div><h2>Roulette du jour</h2><div class="sub">Un tour gratuit chaque jour · remis à zéro à minuit</div></div></div>
    <div class="panel wheel-panel">
      <div class="wheel-box ${w.free && !spinning ? 'ready' : ''} ${spinning ? 'spinning' : ''}">
        <div class="wheel-rot" style="transform:rotate(${state.wheelRot || 0}deg)">${wheelSvg(w, !spinning && state.wheelResult ? state.wheelResult.key : null)}</div>
        ${wheelFrame()}
        <div class="wheel-pointer">${WHEEL_POINTER}</div>
        <div class="wheel-hub">${COIN}</div>
      </div>
      <div class="wheel-side">
        ${w.free && !spinning
          ? '<button class="btn-play wheel-go" data-wheel-spin>Tourner la roulette</button><span class="wheel-hint">Ton tour gratuit d\'aujourd\'hui est disponible !</span>'
          : `<button class="btn-play wheel-go disabled" disabled>${spinning ? 'La roue tourne…' : 'Déjà tourné aujourd\'hui'}</button><span class="wheel-hint">${spinning ? 'Bonne chance !' : `Prochain tour gratuit dans ${wait}`}</span>`}
        ${last && !spinning ? `<div class="wheel-last"><small>Gain d'aujourd'hui</small><b>${esc(lastTxt(last))}</b></div>` : ''}
        <div class="wheel-odds">${w.segments.map((p) => `<div><i style="background:${(WHEEL_STYLE[p.key] || {}).fill || '#555'}"></i><span>${esc(prizeLabel(p))}</span><b>${p.pct} %</b></div>`).join('')}</div>
        <p class="wheel-note">Si tu as déjà tous les thèmes de la Boutique, le thème est remplacé par ${w.duplicate} jetons.</p>
      </div>
    </div>
  </section>`;
}
const dayStr = (t) => new Date(t).toDateString();

async function spinWheel(btn) {
  if (state.wheelSpinning) return;
  btn.disabled = true;
  let r;
  try { r = await api.spinWheel(); } catch (e) { btn.disabled = false; return toast(errMsg(e), true); }
  // angle of the prize inside the wheel (0 = top, clockwise), a bit away from the slice edges
  let a = 0, theta = 0;
  for (const p of state.shop.wheel.segments) {
    const span = p.pct * 3.6;
    if (p.key === r.prize.key) { theta = a + span * (0.2 + Math.random() * 0.6); break; }
    a += span;
  }
  const cur = state.wheelRot || 0;
  const target = cur - (cur % 360) + 360 * 6 + ((360 - theta) % 360);
  state.wheelSpinning = true;
  state.wheelRot = target;
  const el = $('.wheel-rot');
  const side = $('.wheel-side .wheel-go');
  if (side) { side.textContent = 'La roue tourne…'; side.classList.add('disabled'); }
  const box = $('.wheel-box');
  if (box) { box.classList.remove('ready'); box.classList.add('spinning'); setTimeout(() => box.classList.remove('spinning'), 4300); }
  if (el) { el.classList.add('spin'); requestAnimationFrame(() => { el.style.transform = `rotate(${target}deg)`; }); }
  await new Promise((res) => setTimeout(res, el ? 5200 : 0));
  state.wheelSpinning = false;
  state.wheelResult = r.prize;
  state.shop = r.shop; state.profile = r.profile;
  if (r.challenges) { state.chal = r.challenges; setRanks(r.challenges.ranks); }
  render(true); renderSidebar();
  const p = r.prize;
  if (p.kind === 'coins') coinToast(p.n, 'Roulette du jour');
  else if (p.kind === 'xp') toast(`Roulette du jour : +${p.n} XP`, false, true);
  else if (p.theme) toast(`Jackpot ! Tu gagnes le thème ${p.theme.name} 🎉 Applique-le dans la liste des thèmes.`, false, true);
  else coinToast(p.duplicate, 'Roulette : thème remplacé par des jetons');
}

/* ---- Profile titles ---- */
const TITLE_ICONS = {
  crosshair: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="m8.5 10-3-7h5l1.5 4M15.5 10l3-7h-5L12 7"/><path d="m12 12.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  tent: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 3v17M8.5 20 12 13l3.5 7"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/></svg>',
};
const titleChip = (name, big = false) => (name ? `<span class="title-chip${big ? ' big' : ''}">« ${esc(name)} »</span>` : '');
/** Title name for a key (friends publish only the key). */
const titleName = (key) => { const t = state.shop && (state.shop.titles || []).find((x) => x.key === key); return t ? t.name : null; };

function titleCard(t) {
  const got = !!t.unlockedAt;
  const pct = Math.round((t.value / t.goal) * 100);
  return `<div class="title-card ${got ? 'got' : ''} ${t.equipped ? 'equipped' : ''}">
    <div class="title-ic">${TITLE_ICONS[t.icon] || I.trophy}</div>
    <div class="title-body">
      <b>${esc(t.name)}</b>
      <span>${esc(t.desc)}</span>
      ${got ? `<small>Débloqué le ${new Date(t.unlockedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small>`
        : `<div class="a-prog"><div class="a-bar"><i style="width:${pct}%"></i></div><span>${t.value} / ${t.goal}${t.unit === '%' ? ' %' : ''}</span></div>`}
    </div>
    ${got ? (t.equipped ? '<button class="btn-glass sm" data-title-equip="">Retirer</button>' : `<button class="btn-play sm" data-title-equip="${t.key}">Afficher</button>`) : `<span class="title-lock">${CROWN_LOCK}</span>`}
  </div>`;
}

function titleToast(list) {
  for (const u of list.slice(0, 3)) {
    const t = document.createElement('div');
    t.className = 'toast ach title-toast';
    t.innerHTML = `<span class="a-emoji">🏷️</span><div><small>Nouveau titre débloqué !</small><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></div>`;
    t.addEventListener('click', () => go('shop'));
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 6000);
    setTimeout(() => t.remove(), 6500);
  }
  loadShop();
}

async function shopClick(t) {
  const d = t.dataset;
  try {
    if (d.titleEquip !== undefined) {
      const r = await api.equipTitle(d.titleEquip || null);
      state.shop = r.shop; state.profile = r.profile;
      toast(d.titleEquip ? `Titre « ${titleName(d.titleEquip)} » affiché sur ton profil` : 'Titre retiré de ton profil');
      return render(true);
    }
    if (d.genre) {
      const g = byId(d.gid);
      const cur = new Set(g.genres || []);
      if (cur.has(d.genre)) cur.delete(d.genre); else cur.add(d.genre);
      await api.setGameGenres(g.id, [...cur]);
      await reload(); loadShop();
      return render(true);
    }
    if (d.genreReset !== undefined) {
      await api.setGameGenres(d.genreReset, null);
      await reload(); loadShop();
      return render(true);
    }
    if (d.shopBuy) {
      const it = state.shop.themes.find((x) => x.id === d.shopBuy);
      if ((state.shop.level || 1) < (it.minLevel || 1)) return toast(`Niveau ${it.minLevel} requis`, true);
      if (state.shop.coins < it.price) return toast(`Il te manque ${fmtCoins(it.price - state.shop.coins)} jetons pour ce thème`, true);
      if (!(await confirmModal(`Acheter le thème ${it.name} ?`, `Il coûte ${fmtCoins(it.price)} jetons. Il te restera ${fmtCoins(state.shop.coins - it.price)} jetons. Le thème sera appliqué tout de suite.`, 'Acheter', false))) return;
      const r = await api.buyShop(it.id, true);
      state.shop = r.shop; state.settings = r.settings;
      applyTheme(r.settings.theme);
      toast(`Thème ${it.name} acheté et appliqué 🎉`);
      return render(true);
    }
    if (d.shopApply) {
      state.settings = await api.setSettings({ theme: d.shopApply });
      applyTheme(state.settings.theme);
      return render(true);
    }
    if (d.frame) {
      state.profile = await api.setFrame(d.frame);
      toast(d.frame === 'none' ? 'Contour retiré' : 'Contour mis à jour');
      return render(true);
    }
  } catch (e) { toast(errMsg(e), true); }
}

/* ---------------- Achievements ---------------- */
const ACH_ICONS = {
  duo: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0"/></svg>',
  pad: I.pad, clock: I.clock, bolt: I.bolt, calendar: I.calendar, layers: I.layers, disk: I.disk, star: I.star, play: I.play, image: I.image,
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3.1 0 5.3 2.9 4.3 6.2C19.5 15.4 12 20 12 20z"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/></svg>',
  compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  clover: '<svg viewBox="0 0 24 24"><path d="M12 12c-3-3-6-3-6-6a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 3-3 3-6 6zM12 12c3 3 3 6 6 6a3 3 0 0 0 0-6M12 12c-3 3-3 6-6 6a3 3 0 0 1 0-6M12 12l2 9"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24"><path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8M19.5 5.5a8.5 8.5 0 0 1 0 13"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3 7.5 9 12 21M15 3l1.5 6L12 21"/></svg>',
  secret: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/></svg>',
};
const TIER_CLS = ['locked', 'bronze', 'silver', 'gold', 'platinum'];
const TIER_EMOJI = ['', '🥉', '🥈', '🥇', '💎'];

function fmtAch(v, unit) {
  if (unit === 'h') { const h = v / 3600; return `${h < 10 ? (Math.floor(h * 10) / 10).toLocaleString('fr-FR') : Math.floor(h).toLocaleString('fr-FR')} h`; }
  if (unit === 'gb') return `${Math.floor(v / 1024 ** 3).toLocaleString('fr-FR')} Go`;
  return Math.floor(v).toLocaleString('fr-FR');
}

function medal(it, size = '') {
  return `<div class="a-medal ${TIER_CLS[it.tier]} ${size}">${ACH_ICONS[it.icon] || I.trophy}</div>`;
}

function ultimateBadge(big = false) {
  return `<span class="ult-badge${big ? ' big' : ''}" title="Trophée « Linkgeek Ultime » : tous les trophées au rang maximum">${ACH_ICONS.gem}${big ? 'Ultime' : ''}</span>`;
}

/* ---- Trophies page: one rarity per trophy (15 Bronze, 12 Argent, 5 Or, 1 Platine) ----
 * Every trophy is a portrait card (like a game cover) with a cup drawn in the
 * colour of its rarity. Locked ones are greyed with their progress. */
const RARITY = {
  bronze: { name: 'Bronze', pts: 15, rank: 1, sub: 'Les premiers pas', stops: ['#ffd2a6', '#d88a4a', '#8a4a1f'] },
  silver: { name: 'Argent', pts: 30, rank: 2, sub: 'Un vrai investissement', stops: ['#ffffff', '#c9d2de', '#7d8898'] },
  gold: { name: 'Or', pts: 90, rank: 3, sub: 'Pour les plus acharnés', stops: ['#fff1b0', '#f2b92c', '#a86d0c'] },
  platinum: { name: 'Platine', pts: 300, rank: 4, sub: 'Tous les trophées de Linkgeek', stops: ['#f2fbff', '#9fd8ff', '#b9a6ff'] },
};
const RARITY_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const rarityOfRank = (n) => ['bronze', 'bronze', 'silver', 'gold', 'platinum'][n] || 'bronze';
const COLLECTOR_RANKS = [[0, 'Débutant'], [10, 'Amateur'], [25, 'Chasseur'], [45, 'Expert'], [70, 'Maître'], [90, 'Légende']];

/* Metal look per rarity: horizontal stops dark → highlight → mid → shadow → mid,
 * which reads as a polished, rounded cup. Platinum is prismatic. */
const TRO_METAL = {
  bronze: ['#5a2b0e', '#f0b27e', '#c27a3f', '#743c15', '#a5602b'],
  silver: ['#5d6878', '#ffffff', '#c9d2dd', '#737f94', '#b3becb'],
  gold: ['#7a4c03', '#fff6c8', '#f6c23a', '#a06706', '#e3a51e'],
  platinum: ['#76a6dc', '#ffffff', '#a9dcff', '#c9b8ff', '#ffd3f2'],
};
const TRO_GLOW = { gold: '#ffc93c', platinum: '#a9dcff' };
const TRO_SPARK = 'M0-7 1.7-1.7 7 0 1.7 1.7 0 7-1.7 1.7-7 0-1.7-1.7Z';
let TRO_UID = 0;

/** Two mirrored laurel branches around (cx, cy), from angle t0 to t1 (0 = bottom, 90 = side). */
function troLaurel(cx, cy, R, t0, t1, n, fill) {
  const f = (v) => v.toFixed(1);
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = ((t0 + ((t1 - t0) * i) / (n - 1)) * Math.PI) / 180;
    const k = 1 - i / (n * 1.9);
    for (const side of [1, -1]) {
      const px = cx - (R + side * 3.2) * Math.sin(t);
      const py = cy + (R + side * 3.2) * Math.cos(t);
      const deg = (Math.atan2(-Math.sin(t), -Math.cos(t)) * 180) / Math.PI + side * 30;
      for (const mirror of [false, true]) {
        const x = mirror ? 2 * cx - px : px;
        const d = mirror ? 180 - deg : deg;
        s += `<ellipse cx="${f(x)}" cy="${f(py)}" rx="${f(6.2 * k)}" ry="${f(2.5 * k)}" transform="rotate(${d.toFixed(0)} ${f(x)} ${f(py)})" fill="${fill}"/>`;
      }
    }
  }
  const end = (t1 * Math.PI) / 180;
  const ex = cx - R * Math.sin(end), ey = cy + R * Math.cos(end);
  const big = t1 > 180 ? 1 : 0;
  s += `<path d="M${cx} ${cy + R}A${R} ${R} 0 ${big} 1 ${f(ex)} ${f(ey)}M${cx} ${cy + R}A${R} ${R} 0 ${big} 0 ${f(2 * cx - ex)} ${f(ey)}" stroke="${fill}" stroke-width="1.6" fill="none"/>`;
  return s;
}

/** A trophy cup in its rarity's metal; the rarer it is, the more ornate:
 *  Bronze = plain cup · Argent = rim, medallion, curled handles, 2-tier base ·
 *  Or = + star finial, laurels, halo, rays, sheen, sparkles ·
 *  Platine = + prismatic shimmer, gem, full wreath, rotating rays, more sparkles. */
function trophySvg(rarity, icon, locked = false, secret = false) {
  if (rarity === 'secret') return secretTrophySvg(icon, locked, secret);
  const rr = RARITY[rarity] ? rarity : 'bronze';
  const lvl = RARITY[rr].rank;
  const live = !locked;
  const u = `tr${++TRO_UID}`;
  const M = `url(#${u}m)`;
  const metal = TRO_METAL[rr];
  const inner = (ACH_ICONS[icon] || I.trophy).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const cup = lvl >= 3 ? 'M29 18h62v24c0 26-14 44-31 44S29 68 29 42z' : lvl === 2 ? 'M30 18h60v25c0 24-14 41-30 41S30 67 30 43z' : 'M33 16h54v27c0 22-12 38-27 38S33 65 33 43z';
  const parts = [];
  // defs
  parts.push(`<defs>
    <linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect">${metal.map((c, i) => `<stop offset="${(i / (metal.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}${lvl === 4 && live ? '<animateTransform attributeName="gradientTransform" type="translate" values="0 0;1 0;0 0" dur="7s" repeatCount="indefinite"/>' : ''}</linearGradient>
    <linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
    ${lvl >= 3 ? `<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/>${live ? `<animateTransform attributeName="gradientTransform" type="translate" values="-1.2 -1.2;1.2 1.2;1.2 1.2" keyTimes="0;.45;1" dur="${lvl === 4 ? 3.2 : 4.2}s" repeatCount="indefinite"/>` : ''}</linearGradient>` : ''}
    ${lvl >= 3 ? `<radialGradient id="${u}g" cx="60" cy="46" r="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${TRO_GLOW[rr]}" stop-opacity=".55"/><stop offset="1" stop-color="${TRO_GLOW[rr]}" stop-opacity="0"/></radialGradient>` : ''}
  </defs>`);
  // background FX (halo + rays), only when unlocked
  if (lvl >= 3 && live) {
    parts.push(`<circle cx="60" cy="46" r="60" fill="url(#${u}g)"/>`);
    const n = lvl === 4 ? 16 : 12;
    const rays = Array.from({ length: n }, (_, i) => `<path d="M60 46L56.5 -12h7z" transform="rotate(${((i * 360) / n).toFixed(1)} 60 46)"/>`).join('');
    parts.push(`<g class="tr-rays ${lvl === 4 ? 'spin' : ''}" fill="url(#${u}g)" opacity="${lvl === 4 ? '.9' : '.6'}">${rays}</g>`);
  }
  // laurels behind the cup
  if (lvl === 3) parts.push(`<g opacity=".95">${troLaurel(60, 66, 46, 30, 120, 6, M)}</g>`);
  if (lvl === 4) parts.push(troLaurel(60, 58, 54, 26, 205, 10, M));
  // handles
  if (lvl === 1) parts.push(`<path d="M34 23H24c0 14 5 23 13 25M86 23h10c0 14-5 23-13 25" stroke="${M}" stroke-width="5" stroke-linecap="round" fill="none"/>`);
  else {
    parts.push(`<path d="M31 23H18c-1 21 8 32 20 34M89 23h13c1 21-8 32-20 34" stroke="${M}" stroke-width="${lvl >= 3 ? 6.5 : 6}" stroke-linecap="round" fill="none"/>`);
    parts.push(`<circle cx="18" cy="23" r="${lvl >= 3 ? 4.5 : 3.6}" fill="${M}"/><circle cx="102" cy="23" r="${lvl >= 3 ? 4.5 : 3.6}" fill="${M}"/>`);
    if (lvl >= 3) parts.push(`<path d="M30 33h-6c0 9 4 15 9 17M90 33h6c0 9-4 15-9 17" stroke="${M}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".9"/>`);
  }
  // finial on top
  if (lvl === 3) parts.push(`<rect x="57.5" y="5" width="5" height="9" rx="1.5" fill="${M}"/><path d="M60-7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L60 7.8l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="${M}" stroke="rgba(120,70,0,.55)" stroke-width=".8"/>`);
  if (lvl === 4) parts.push(`<rect x="57.5" y="4" width="5" height="10" rx="1.5" fill="${M}"/><path d="M60-12l9 8-9 12-9-12z" fill="${M}" stroke="#fff" stroke-opacity=".8" stroke-width="1"/><path d="M51-4h18M60-12l-3 8 3 12 3-12z" stroke="#fff" stroke-opacity=".7" stroke-width=".8" fill="none"/>`);
  // cup body + depth + rim
  parts.push(`<path d="${cup}" fill="${M}"/><path d="${cup}" fill="url(#${u}v)"/>`);
  if (lvl >= 2) parts.push(`<rect x="${lvl >= 3 ? 26 : 27}" y="13" width="${lvl >= 3 ? 68 : 66}" height="8" rx="4" fill="${M}"/><rect x="${lvl >= 3 ? 26 : 27}" y="13" width="${lvl >= 3 ? 68 : 66}" height="8" rx="4" fill="url(#${u}v)"/>`);
  if (lvl >= 3) parts.push(`<path d="${cup}" fill="url(#${u}s)"/>`);
  // shine stripe
  parts.push(`<path d="${lvl === 1 ? 'M40 22c0 18 3 32 10 40' : 'M37 24c0 20 3 36 12 45'}" stroke="#fff" stroke-opacity="${lvl === 1 ? .3 : .55}" stroke-width="${lvl === 1 ? 2.5 : 3.5}" stroke-linecap="round" fill="none"/>`);
  // emblem / engraved icon
  if (lvl === 1) {
    parts.push(secret ? '<text x="60" y="54" class="tr-q dark">?</text>' : `<g transform="translate(50 33) scale(.84)" fill="none" stroke="rgba(60,24,4,.8)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`);
  } else {
    const ey = lvl >= 3 ? 44 : 43;
    parts.push(`<circle cx="60" cy="${ey}" r="14" fill="rgba(0,0,0,.32)" stroke="${M}" stroke-width="2.4"/>`);
    if (lvl >= 3) parts.push(`<circle cx="60" cy="${ey}" r="17.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="1.5 2.5"/>`);
    parts.push(secret ? `<text x="60" y="${ey + 6}" class="tr-q">?</text>` : `<g transform="translate(51 ${ey - 9}) scale(.75)" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`);
  }
  // stem + base
  if (lvl === 1) {
    parts.push(`<path d="M54 80h12l-1.5 18h-9z" fill="${M}"/><rect x="38" y="97" width="44" height="8" rx="2.5" fill="${M}"/><rect x="33" y="104" width="54" height="16" rx="3" fill="${M}"/><rect x="33" y="104" width="54" height="16" rx="3" fill="url(#${u}v)"/>`);
  } else {
    parts.push(`<path d="M54 ${lvl >= 3 ? 85 : 83}h12l-2 14h-8z" fill="${M}"/><ellipse cx="60" cy="91" rx="${lvl >= 3 ? 9 : 7.5}" ry="3.2" fill="${M}"/>`);
    parts.push(`<rect x="39" y="98" width="42" height="7" rx="2.5" fill="${M}"/><rect x="30" y="104" width="60" height="19" rx="3.5" fill="${M}"/><rect x="30" y="104" width="60" height="19" rx="3.5" fill="url(#${u}v)"/>`);
    parts.push(`<rect x="42" y="109" width="36" height="8" rx="2" fill="rgba(0,0,0,.3)" stroke="#fff" stroke-opacity="${lvl >= 3 ? .4 : .25}" stroke-width=".8"/>`);
    if (lvl === 4) parts.push(`<path d="M60 109.5l3.5 3.5-3.5 3.5-3.5-3.5z" fill="${M}" stroke="#fff" stroke-width=".7"/><circle cx="35.5" cy="113.5" r="2" fill="${M}"/><circle cx="84.5" cy="113.5" r="2" fill="${M}"/>`);
    if (lvl === 3) parts.push(`<circle cx="50" cy="113" r="1.6" fill="${M}"/><circle cx="70" cy="113" r="1.6" fill="${M}"/>`);
  }
  // sparkles
  if (lvl >= 2 && live) {
    const sp = lvl === 2 ? [[96, 14, .55, 0]] : lvl === 3 ? [[20, 8, .8, 0], [102, 36, .65, 1.1], [97, 96, .55, 2]] : [[16, 4, .9, 0], [104, 18, .7, .7], [104, 70, .6, 1.4], [14, 64, .7, 2.1], [92, 100, .5, 1], [28, 98, .55, 1.8]];
    parts.push(sp.map(([x, y, s, d]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="${TRO_SPARK}" class="tr-spark" fill="#fff" style="animation-delay:${d}s"/></g>`).join(''));
  }
  return `<svg class="trophy ${rr} ${locked ? 'locked' : ''}" viewBox="0 -14 120 140" aria-hidden="true">${parts.join('')}</svg>`;
}

/** Secret trophies all share their own shape: a pearly white crystal floating
 *  over a pedestal, circled by an orbit ring (whatever their rarity). */
const troArt = (it) => (it.secret || it.kind === 'secret' ? 'secret' : it.rarity || rarityOfRank(it.tier));
function secretTrophySvg(icon, locked = false, hidden = false) {
  const u = `tr${++TRO_UID}`;
  const live = !locked;
  const inner = (ACH_ICONS[icon] || ACH_ICONS.secret).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const g = (id, a, b, c) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  const orbit = 'M16 46a44 11 0 1 0 88 0a44 11 0 1 0-88 0';
  return `<svg class="trophy secret ${locked ? 'locked' : ''}" viewBox="0 -14 120 140" aria-hidden="true">
    <defs>
      ${g('t', '#ffffff', '#f3ecff', '#dfe9ff')}${g('l', '#fbfcff', '#e4e8f8', '#c3c9e2')}${g('r', '#eef1fb', '#cfd5ea', '#a2a9c6')}${g('b', '#ffffff', '#dfe3f0', '#9ea6bf')}
      <radialGradient id="${u}h" cx="60" cy="40" r="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>${live ? '<animateTransform attributeName="gradientTransform" type="translate" values="-1.2 -1.2;1.2 1.2;1.2 1.2" keyTimes="0;.45;1" dur="3.6s" repeatCount="indefinite"/>' : ''}</linearGradient>
    </defs>
    ${live ? `<circle cx="60" cy="40" r="62" fill="url(#${u}h)"/>` : ''}
    <g transform="rotate(-14 60 46)"><path d="${orbit}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.4" stroke-dasharray="3 4"/></g>
    <path d="M55 86h10l3 13H52z" fill="url(#${u}b)"/>
    <rect x="34" y="98" width="52" height="8" rx="3" fill="url(#${u}b)"/>
    <rect x="28" y="105" width="64" height="17" rx="4" fill="url(#${u}b)"/>
    <rect x="43" y="110" width="34" height="7" rx="2" fill="rgba(40,44,70,.22)" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/>
    <path d="M60 111l2.6 2.6-2.6 2.6-2.6-2.6z" fill="#fff"/>
    <g class="${live ? 'tr-float' : ''}">
      <path d="M60-8L86 17 60 26 34 17z" fill="url(#${u}t)"/>
      <path d="M34 17L60 26V88L34 58z" fill="url(#${u}l)"/>
      <path d="M86 17L86 58 60 88V26z" fill="url(#${u}r)"/>
      <path d="M60-8L86 17 86 58 60 88 34 58 34 17z" fill="url(#${u}s)"/>
      <path d="M60-8L86 17 86 58 60 88 34 58 34 17zM34 17L60 26 86 17M60 26V88" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M40 22l2 30" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-opacity=".9"/>
      ${hidden ? '<text x="60" y="56" class="tr-q dark secret-q">?</text>' : `<g transform="translate(50.5 36) scale(.8)" fill="none" stroke="rgba(52,56,92,.82)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`}
    </g>
    <g transform="rotate(-14 60 46)"><path d="M16 46a44 11 0 0 0 88 0" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6"/>
      ${live ? `<circle r="2.6" fill="#fff"><animateMotion dur="5s" repeatCount="indefinite" path="${orbit}"/></circle><circle r="1.6" fill="#fff" opacity=".8"><animateMotion dur="5s" begin="-2.5s" repeatCount="indefinite" path="${orbit}"/></circle>` : ''}</g>
    ${live ? [[18, 2, .8, 0], [102, 12, .6, 1], [100, 88, .55, 1.9], [20, 80, .6, 1.4]].map(([x, y, s, d]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="${TRO_SPARK}" class="tr-spark" fill="#fff" style="animation-delay:${d}s"/></g>`).join('') : ''}
  </svg>`;
}

function trophyCard(it) {
  const got = it.tier >= 1;
  const t = it.tiers[0];
  const pct = got ? 100 : Math.max(0, Math.min(100, (it.value / Math.max(1, t.goal)) * 100));
  const near = !got && !it.hidden && pct >= 60;
  return `<div class="tro ${it.rarity} ${it.secret ? 'secret' : ''} ${got ? 'got' : 'locked'} ${it.hidden ? 'hidden' : ''} ${near ? 'near' : ''}" title="${esc(t.desc)}">
    <div class="tro-glow"></div>
    <span class="tro-pts">+${t.points}</span>
    ${got ? '<span class="tro-check">✓</span>' : `<span class="tro-lock">${CROWN_LOCK}</span>`}
    ${near ? '<span class="tro-flag">Presque !</span>' : ''}
    <div class="tro-art">${trophySvg(troArt(it), it.icon, !got, it.hidden)}</div>
    <div class="tro-info">
      <span class="tro-rar ${it.secret ? 'secret' : it.rarity}">${it.secret ? 'Secret · ' : ''}${esc(RARITY[it.rarity].name)}</span>
      <b class="tro-name">${esc(it.name)}</b>
      <span class="tro-desc">${esc(t.desc)}</span>
      ${got ? `<span class="tro-date">Obtenu le ${new Date(t.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`
        : it.hidden ? '<span class="tro-date">Indice : explore Linkgeek…</span>'
          : `<div class="tro-prog"><div class="a-bar"><i class="${it.rarity}" style="width:${pct.toFixed(1)}%"></i></div><span>${fmtAch(it.value, it.unit)} / ${fmtAch(t.goal, it.unit)}</span></div>`}
    </div>
  </div>`;
}

function nearCard(it) {
  const t = it.tiers[0];
  const pct = Math.max(0, Math.min(100, (it.value / Math.max(1, t.goal)) * 100));
  return `<div class="tro-near ${it.rarity}">
    <div class="tro-near-art">${trophySvg(it.rarity, it.icon)}</div>
    <div class="tro-near-body">
      <small>${esc(RARITY[it.rarity].name)} · +${t.points} pts</small>
      <b>${esc(it.name)}</b>
      <span>${esc(t.desc)}</span>
      <div class="tro-prog"><div class="a-bar"><i class="${it.rarity}" style="width:${pct.toFixed(1)}%"></i></div><span>${Math.floor(pct)} %</span></div>
      <em>Plus que ${fmtAch(Math.max(0, t.goal - it.value), it.unit)} !</em>
    </div>
  </div>`;
}

function viewAchievements() {
  const a = state.ach;
  const head = (sub) => `<div class="page-head"><div><h1>Succès</h1><div class="sub">${sub}</div></div></div>`;
  if (!a) return `<div class="page">${head('Chargement…')}</div>`;
  const items = a.items;
  const f = ['all', 'got', 'todo'].includes(state.achFilter) ? state.achFilter : 'all';
  const shown = (it) => f === 'all' || (f === 'got' ? it.tier >= 1 : it.tier < 1);
  const pct = Math.round((a.points / a.maxPoints) * 100);
  const rankIdx = COLLECTOR_RANKS.reduce((r, [min], i) => (pct >= min ? i : r), 0);
  const nextRank = COLLECTOR_RANKS[rankIdx + 1];
  const ptsToNext = nextRank ? Math.max(0, Math.ceil((nextRank[0] / 100) * a.maxPoints) - a.points) : 0;
  const pctOfIt = (it) => (it.value / Math.max(1, it.tiers[0].goal)) * 100;
  const near = items.filter((it) => it.tier < 1 && !it.hidden && it.kind !== 'ultimate').sort((x, y) => pctOfIt(y) - pctOfIt(x)).slice(0, 3);
  const latest = items.filter((it) => it.tier >= 1 && it.tiers[0].at).sort((x, y) => y.tiers[0].at - x.tiers[0].at).slice(0, 6);
  const br = a.byRarity || {};
  const C = 2 * Math.PI * 54;
  return `<div class="page">
    ${head(`${a.unlocked} / ${a.total} trophées · plus la rareté est haute, plus le défi est difficile`)}
    <div class="ach2-hero">
      <div class="ach2-ring">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}"/></svg>
        <div><b>${pct}<small>%</small></b><span>complété</span></div>
      </div>
      <div class="ach2-hero-main">
        <small>Rang de chasseur de trophées</small>
        <h2>${esc(COLLECTOR_RANKS[rankIdx][1])}</h2>
        <p>${nextRank ? `Encore <b>${ptsToNext.toLocaleString('fr-FR')} pts</b> pour devenir <b>${esc(nextRank[1])}</b>` : 'Tu as atteint le rang le plus haut 👑'}</p>
        <div class="ach2-score"><b>${a.points.toLocaleString('fr-FR')}</b> / ${a.maxPoints.toLocaleString('fr-FR')} points</div>
        <div class="ach2-ranks">${COLLECTOR_RANKS.map(([min, n], i) => `<span class="${i < rankIdx ? 'past' : i === rankIdx ? 'cur' : ''}" title="${min} %">${esc(n)}</span>`).join('')}</div>
      </div>
      <div class="tro-counts">${['bronze', 'silver', 'gold', 'platinum'].map((r) => `<div class="tro-count ${r}">${trophySvg(r, 'trophy', !(br[r] && br[r].got))}<b>${br[r] ? br[r].got : 0}<small>/${br[r] ? br[r].total : 0}</small></b><span>${RARITY[r].name}</span><em>${RARITY[r].pts} pts</em></div>`).join('')}</div>
    </div>
    ${near.length ? `<section class="section">
      <div class="section-head"><div><h2>🔥 Presque débloqués</h2><div class="sub">Tes trophées les plus proches : fonce !</div></div></div>
      <div class="ach2-nears">${near.map(nearCard).join('')}</div>
    </section>` : ''}
    ${latest.length ? `<section class="section">
      <div class="section-head"><div><h2>Derniers débloqués</h2></div></div>
      <div class="ach2-latest">${latest.map((it) => `<div class="ach2-lt"><div class="tro-mini">${trophySvg(troArt(it), it.icon)}</div><div><b>${esc(it.name)}</b><span>${esc(RARITY[it.rarity].name)} · ${esc(fmtAgo(it.tiers[0].at))}</span></div></div>`).join('')}</div>
    </section>` : ''}
    <div class="a-filters tro-filters">${[['all', 'Tous', items.length], ['got', 'Débloqués', a.unlocked], ['todo', 'À débloquer', a.total - a.unlocked]].map(([k, l, c]) => `<button class="${f === k ? 'active' : ''}" data-ach-filter="${k}">${l}<span class="n">${c}</span></button>`).join('')}</div>
    ${RARITY_ORDER.map((r) => {
      const list = items.filter((it) => it.rarity === r && shown(it))
        .sort((x, y) => (y.tier - x.tier) || (pctOfIt(y) - pctOfIt(x)));
      if (!list.length) return '';
      return `<section class="section tro-sec ${r}">
        <div class="tro-head ${r}"><div class="tro-head-ic">${trophySvg(r, 'trophy')}</div><div><h2>${esc(RARITY[r].name)}</h2><span>${esc(RARITY[r].sub)} · ${RARITY[r].pts} pts chacun</span></div><i>${br[r] ? br[r].got : 0} / ${br[r] ? br[r].total : 0}</i></div>
        <div class="tro-grid ${r === 'platinum' ? 'solo' : ''}">${list.map(trophyCard).join('')}</div>
      </section>`;
    }).join('')}
    ${a.playedWith.length ? `<section class="section"><div class="section-head"><h2>Tes coéquipiers</h2></div>
      <div class="a-mates">${a.playedWith.map((m) => `<div class="a-mate panel">${friendAvatar({ name: m.name, state: 'offline' })}<div class="f-info"><b>${esc(m.name)}</b><span class="f-status">${esc(m.game)} · ${esc(fmtAgo(m.at))}</span></div></div>`).join('')}</div></section>` : ''}
  </div>`;
}

async function loadAchievements() {
  try {
    state.ach = await api.getAchievements();
    if (state.view === 'achievements') render(true); else renderSidebar();
  } catch (e) { console.error(e); }
}

function achToast(list) {
  for (const u of list.slice(-3)) {
    const t = document.createElement('div');
    const rar = u.rarity || TIER_CLS[u.tier] || 'bronze';
    t.className = `toast ach ${rar}${u.secret ? ' secret' : ''}`;
    const label = u.kind === 'ultimate' ? 'TROPHÉE PLATINE DÉBLOQUÉ !' : u.secret ? 'Trophée secret découvert !' : `Trophée ${esc(u.tierName)} débloqué`;
    t.innerHTML = `<span class="toast-trophy">${trophySvg(u.secret ? 'secret' : rar, u.icon || 'trophy')}</span><div><small>${label}</small><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></div>`;
    t.addEventListener('click', () => go('achievements'));
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 5600);
    setTimeout(() => t.remove(), 6100);
  }
  if (list.length > 3) toast(`+ ${list.length - 3} autres succès débloqués`);
  loadAchievements();
}

/* ---------------- Settings ---------------- */
const SETTINGS_TABS = [
  ['appearance', 'Apparence', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>'],
  ['account', 'Compte', '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'],
  ['general', 'Général', '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/></svg>'],
  ['library', 'Bibliothèque', '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><path d="m15.5 5.2 3.9-1 3 15.5-3.9 1z"/></svg>'],
  ['about', 'À propos', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>'],
];

const THEMES = [
  { id: 'classic', name: 'Classique', desc: 'Bleu nuit et reflets violets, le thème d\'origine', c: { bg: '#0a0c11', side: '#0f121a', card: '#1a1e29', text: '#eef1f7', muted: '#5c6377', accent: 'linear-gradient(135deg,#7c5cff,#22d3ee)', glow: 'radial-gradient(120px 60px at 90% 0%, rgba(124,92,255,.35), transparent)' } },
  { id: 'dark', name: 'Sombre', desc: 'Noir profond et gris neutres, idéal le soir', c: { bg: '#050505', side: '#0c0c0c', card: '#1a1a1a', text: '#f2f2f2', muted: '#626262', accent: 'linear-gradient(135deg,#8b7bff,#6d8dff)', glow: 'none' } },
  { id: 'light', name: 'Clair', desc: 'Lumineux et contrasté pour la journée', c: { bg: '#eef0f5', side: '#f7f8fb', card: '#dfe2ea', text: '#12151d', muted: '#8a91a1', accent: 'linear-gradient(135deg,#7c5cff,#22d3ee)', glow: 'none' } },
];

const GOOGLE_G = '<svg class="g-logo" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function themePreview(t) {
  const c = t.c;
  return `<div class="tp ${t.rarity ? `tp-${t.rarity} tp-fx-${esc(t.id)}` : ''}" style="background:${c.bg}">
    <div class="tp-glow" style="background:${c.glow}"></div>
    ${t.rarity === 'epic' || t.id === 'aurora' ? '<div class="tp-fx"></div>' : ''}
    <div class="tp-side" style="background:${c.side}">
      <i style="background:${c.accent}"></i><i style="background:${c.muted};opacity:.5"></i><i style="background:${c.muted};opacity:.5"></i>
    </div>
    <div class="tp-main">
      <div class="tp-hero" style="background:${c.card}"><span style="background:${c.accent}"></span></div>
      <div class="tp-row">${`<div style="background:${c.card}"></div>`.repeat(4)}</div>
      <div class="tp-line" style="background:${c.text};opacity:.8"></div>
      <div class="tp-line short" style="background:${c.muted}"></div>
    </div>
  </div>`;
}

function toggle(id, on, label, desc) {
  return `<div class="set-row">
    <div><b>${esc(label)}</b><span>${esc(desc)}</span></div>
    <button class="switch ${on ? 'on' : ''}" data-setting="${id}" role="switch" aria-checked="${on}"><i></i></button>
  </div>`;
}

function firebaseDetails(s) {
  const f = s.firebase || {};
  return `<details class="dev" ${f.configured ? '' : 'open'}>
    <summary>Mode en ligne (amis) ${f.configured ? `<span class="ok">✓ activé${f.projectId ? ' · ' + esc(f.projectId) : ''}${f.source === 'file' ? ' (fichier partagé)' : ''}</span>` : '<span class="todo">à configurer</span>'}</summary>
    <p class="set-desc" style="margin:4px 0 12px">Les amis et les statuts passent par un serveur Firebase gratuit. Tous tes amis doivent utiliser <b>le même</b> projet : l'installeur que tu partages l'inclut automatiquement.</p>
    <ol class="steps">
      <li>Va sur la <a href="https://console.firebase.google.com/" target="_blank">console Firebase</a> → <b>Ajouter un projet</b> et choisis <b>ton projet Google Cloud existant</b> (celui de l'ID client ci-dessus).</li>
      <li><b>Authentication</b> → Commencer → active le fournisseur <b>Google</b>.</li>
      <li><b>Realtime Database</b> → Créer une base de données → onglet <b>Règles</b> : remplace tout par les règles de Linkgeek <button class="link inline" data-acc="fb-rules">📋 Copier les règles</button>, puis <b>Publier</b>.</li>
      <li>Paramètres du projet → <b>Ajouter une app Web</b> (&lt;/&gt;) → copie le bloc <span class="mono">firebaseConfig</span> et colle-le ici :</li>
    </ol>
    <textarea id="fb-config" class="fb-config" spellcheck="false" placeholder="const firebaseConfig = {&#10;  apiKey: &quot;AIza…&quot;,&#10;  databaseURL: &quot;https://ton-projet-default-rtdb.europe-west1.firebasedatabase.app&quot;,&#10;  projectId: &quot;ton-projet&quot;, …&#10;};"></textarea>
    <div class="set-actions"><button class="ghost primary-soft" data-acc="fb-save">Enregistrer</button>${f.source === 'settings' ? '<button class="ghost danger" data-acc="fb-clear">Effacer</button>' : ''}</div>
    <p class="set-note">Pour que tes amis puissent se connecter, publie aussi ton écran de consentement OAuth (Google Cloud → Écran de consentement → <b>Publier l'application</b>). Les autorisations utilisées (nom, e-mail, photo) ne demandent pas de validation par Google.</p>
  </details>`;
}

/** Normal players with the config bundled in the installer only see a status line, no setup fields. */
function onlineConfigHidden(s) {
  return !(s.admin && s.admin.isAdmin) && (s.google.source === 'file' || (s.firebase && s.firebase.source === 'file'));
}
function onlineStatusLine(s) {
  const ok = s.google.configured && s.firebase && s.firebase.configured;
  return `<div class="set-list online-status"><div class="set-row"><div><b>Mode en ligne</b><span>${ok ? 'Connecté au serveur Linkgeek' : 'Non disponible pour le moment. Réinstalle Linkgeek ou préviens la personne qui te l\'a envoyé.'}</span></div>
    <span class="chip ${ok ? 'live' : 'warn'}">${ok ? '✓ Disponible' : 'Non disponible'}</span></div></div>`;
}
/** Admin: the whole setup stays available, folded under "Options avancées". */
function advancedBlock(inner) {
  return `<details class="dev adv"><summary>Options avancées <span class="todo">admin</span></summary><div class="adv-body">${inner}</div></details>`;
}

function settingsSection(s) {
  const tab = state.settingsTab;
  if (tab === 'appearance') {
    return `<h2>Thème de l'application</h2><p class="set-desc">Choisis l'ambiance de Linkgeek. Le changement est immédiat.</p>
      <div class="themes">${[...THEMES, ...((state.shop && state.shop.themes) || []).filter((t) => t.owned)].map((t) => `
        <button class="theme-card ${s.theme === t.id ? 'active' : ''}" data-theme-pick="${t.id}">
          ${themePreview(t)}
          <div class="theme-meta"><span class="radio"></span><div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div></div>
        </button>`).join('')}</div>
      <div class="set-warn shop-hint">${COIN}<span>Encore ${state.shop ? state.shop.themes.filter((t) => !t.owned).length : ''} thèmes à débloquer avec tes jetons.</span><button class="link" data-nav="shop">Ouvrir la Boutique →</button></div>`;
  }
  if (tab === 'account') {
    const a = s.account;
    if (a) {
      return `<h2>Mon compte</h2><p class="set-desc">Ton profil Linkgeek est relié à ton compte Google.</p>
        <div class="acc-card">
          ${a.picture ? `<img class="acc-pic" src="${esc(a.picture)}" alt="" referrerpolicy="no-referrer">` : `<div class="acc-pic">${esc(initials(a.name || a.email || '?'))}</div>`}
          <div class="acc-id"><b>${esc(a.name || 'Compte Google')}</b><span>${esc(a.email || '')}</span><small>${GOOGLE_G} Relié le ${new Date(a.linkedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
          <span class="chip live">Connecté</span>
        </div>
        <div class="set-actions">
          <button class="ghost" data-acc="use">${I.image}Utiliser mon nom et ma photo Google</button>
          <button class="ghost danger" data-acc="signout">Se déconnecter</button>
        </div>
        <p class="set-note">Linkgeek garde ton nom, ton e-mail et ta photo${s.online && s.online.signedIn ? ', ainsi qu\'une clé de session chiffrée pour le mode en ligne' : ''}. Aucun mot de passe n'est conservé.</p>
        ${s.firebase && s.firebase.configured && !(s.online && s.online.signedIn) ? `<div class="set-warn">Le mode en ligne est activé mais ta session n'est pas ouverte. <button class="link" data-acc="signin">Se reconnecter avec Google</button> pour retrouver tes amis.</div>` : ''}
        ${s.online && s.online.signedIn ? `<div class="set-danger">
          <div><b>Supprimer mon compte en ligne</b><span>Efface du serveur ton profil, ton code ami, ton statut, tes amitiés, tes demandes d'ami et tes cadeaux en attente, puis ton compte Firebase. Ton temps de jeu et tes réglages restent sur ce PC.</span></div>
          <button class="ghost danger" data-acc="delete-online">${I.trash}Supprimer</button>
        </div>` : ''}
        <p class="set-note"><a href="https://github.com/unknownxsr/linkgeek/blob/main/CONFIDENTIALITE.md" target="_blank">Politique de confidentialité</a></p>
        ${onlineConfigHidden(s) ? onlineStatusLine(s) : s.admin && s.admin.isAdmin ? advancedBlock(firebaseDetails(s)) : firebaseDetails(s)}`;
    }
    const ready = s.google.configured;
    const hidden = onlineConfigHidden(s);
    return `<h2>Créer mon compte</h2><p class="set-desc">Crée ton compte Linkgeek en un clic avec Google : ton nom et ta photo sont repris automatiquement.</p>
      <div class="acc-hero">
        <div class="acc-hero-txt">
          <b>Ton profil, ton identité</b>
          <ul><li>Connexion sécurisée dans ton navigateur</li><li>Nom et photo de profil importés</li><li>Aucun mot de passe stocké par Linkgeek</li></ul>
        </div>
        ${state.signingIn
          ? `<div class="acc-wait"><span class="spinner"></span><div><b>Termine la connexion dans ton navigateur…</b><span>Choisis ton compte Google puis reviens ici.</span></div><button class="ghost" data-acc="cancel">Annuler</button></div>`
          : `<button class="btn-google" data-acc="signin" ${ready ? '' : 'disabled'}>${GOOGLE_G}Continuer avec Google</button>`}
      </div>
      ${hidden ? onlineStatusLine(s) : `${ready ? '' : '<p class="set-warn">Pour activer la connexion Google, Linkgeek a besoin d\'un identifiant client OAuth (gratuit). Suis les étapes ci-dessous, une seule fois.</p>'}
      <details class="dev" ${ready ? '' : 'open'}>
        <summary>Configuration Google ${ready ? `<span class="ok">✓ configurée${s.google.source === 'file' ? ' (fichier google-oauth.json)' : ''}</span>` : ''}</summary>
        <ol class="steps">
          <li>Ouvre la <a href="https://console.cloud.google.com/apis/credentials" target="_blank">console Google Cloud</a> et crée un projet (ex. « Linkgeek »).</li>
          <li>Dans <b>Écran de consentement OAuth</b>, choisis <b>Externe</b>, renseigne le nom de l'app et ajoute ton adresse Gmail dans <b>Utilisateurs test</b>.</li>
          <li>Dans <b>Identifiants</b> → <b>Créer des identifiants</b> → <b>ID client OAuth</b>, choisis le type <b>Application de bureau</b>.</li>
          <li>Télécharge le fichier JSON proposé, puis importe-le ici :</li>
        </ol>
        <div class="set-actions"><button class="ghost" data-acc="import">${I.folder}Importer le fichier JSON</button></div>
        <div class="or">ou colle les valeurs</div>
        <div class="fields">
          <label>ID client<input id="g-id" placeholder="xxxx.apps.googleusercontent.com" value="${esc(s.google.source === 'settings' ? s.google.clientId : '')}" spellcheck="false" autocomplete="off"></label>
          <label>Code secret du client<input id="g-secret" type="password" placeholder="${s.google.source === 'settings' ? '•••••••• (enregistré)' : 'GOCSPX-…'}" spellcheck="false" autocomplete="off"></label>
        </div>
        <div class="set-actions"><button class="ghost primary-soft" data-acc="save">Enregistrer</button>${s.google.source === 'settings' ? '<button class="ghost danger" data-acc="clear">Effacer</button>' : ''}</div>
      </details>
      ${firebaseDetails(s)}`}`;
  }
  if (tab === 'general') {
    return `<h2>Général</h2><p class="set-desc">Comportement de Linkgeek sur ton PC.</p>
      <div class="set-list">
        ${toggle('startup', s.startup, 'Lancer Linkgeek au démarrage de Windows', 'Démarre discrètement dans la zone de notification pour suivre ton temps de jeu en continu.')}
        ${toggle('closeToTray', s.closeToTray, 'Réduire dans la zone de notification à la fermeture', 'La croix cache la fenêtre au lieu de quitter. Désactivé : fermer quitte Linkgeek (le suivi s\'arrête).')}
        ${toggle('weeklyBoard', s.weeklyBoard, 'Apparaître dans le classement général', 'Ton pseudo, ta photo, ton niveau et tes heures de jeu de la semaine sont visibles par tous les joueurs de Linkgeek sur l\'accueil.')}
        ${toggle('notifyFriends', s.notifyFriends, 'Prévenir quand un ami lance un jeu', '« Mirko vient de lancer Rocket League » : dans l\'app, ou en notification Windows si Linkgeek est en arrière-plan.')}
        <div class="set-row"><div><b>Langue</b><span>Langue de l'interface de Linkgeek.</span></div>
          <div class="segmented sm">${[['fr', 'Français'], ['en', 'English']].map(([k, l]) => `<button class="${s.language === k ? 'active' : ''}" data-setting="language" data-value="${k}">${l}</button>`).join('')}</div></div>
        <div class="set-row"><div><b>Revoir la présentation</b><span>Les 3 étapes affichées au premier lancement.</span></div><button class="ghost" data-onb="show">Revoir</button></div>
      </div>
      <h3 class="set-h3">Discord</h3>
      <div class="set-list">
        ${toggle('discord', s.discord.enabled, 'Afficher mon jeu sur Discord', s.discord.clientId ? (s.discord.connected ? 'Connecté à Discord : ton profil affiche le jeu lancé via Linkgeek.' : 'En attente de Discord : ouvre l\'application Discord sur ce PC.') : 'Il faut d\'abord renseigner l\'ID de l\'application Discord ci-dessous.')}
        <div class="set-row col">
          <div><b>ID de l'application Discord</b><span>Crée une application nommée <b>Linkgeek</b> sur le <a href="https://discord.com/developers/applications" target="_blank">portail développeur Discord</a> (bouton « New Application »), puis copie son « Application ID ». Il est inclus dans l'installeur que tu partages.</span></div>
          <div class="f-add-row"><input id="discord-id" placeholder="123456789012345678" value="${esc(s.discord.clientId || '')}" spellcheck="false" autocomplete="off"><button class="ghost primary-soft" data-acc="discord-save">Enregistrer</button></div>
        </div>
      </div>`;
  }
  if (tab === 'library') {
    return `<h2>Bibliothèque</h2><p class="set-desc">Linkgeek détecte automatiquement Steam, Epic Games, Xbox / Game Pass, Battle.net, Ubisoft Connect, EA app et GOG.</p>
      <div class="set-list">
        <div class="set-row"><div><b>Rescanner les bibliothèques</b><span>${visibleGames().length} jeux détectés actuellement</span></div><button class="ghost" data-lib="rescan">Rescanner</button></div>
        <div class="set-row"><div><b>Ajouter un jeu manuellement</b><span>Pour un jeu installé hors des plateformes reconnues (.exe ou raccourci)</span></div><button class="ghost" data-add>Ajouter</button></div>
        <div class="set-row"><div><b>Jeux masqués</b><span>${s.hiddenCount ? `${s.hiddenCount} jeu${s.hiddenCount > 1 ? 'x' : ''} masqué${s.hiddenCount > 1 ? 's' : ''}` : 'Aucun jeu masqué'}</span></div><button class="ghost" data-lib="unhide" ${s.hiddenCount ? '' : 'disabled'}>Tout réafficher</button></div>
      </div>`;
  }
  if (tab === 'admin' && s.admin && s.admin.isAdmin) return adminSection(s);
  if (tab === 'dashboard' && s.admin && s.admin.isAdmin) return dashboardSection(s);
  return `<h2>À propos</h2>
    <div class="about">
      <img src="../assets/icon.png" alt="">
      <div><b>Linkgeek</b><span>Version ${esc(s.version)}</span></div>
    </div>
    <div class="set-list">
      <div class="set-row"><div><b>Données de l'application</b><span class="mono">${esc(s.dataPath)} · ${fmtSize(s.dataSize)}</span></div><button class="ghost" data-lib="data">${I.folder}Ouvrir</button></div>
    </div>`;
}

function adminSection(s) {
  const lv = state.profile && state.profile.level;
  const friends = (state.friends.friends || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const online = s.admin.online;
  return `<h2>Administration</h2>
    <p class="set-desc">Cet onglet n'existe que sur ton compte. Les actions sur les autres joueurs et les rangs sont vérifiées par le serveur : personne d'autre ne peut les faire, même avec une copie modifiée de l'app.</p>
    <div class="adm-who">${adminTag(true)}<div><b>${esc(s.account.email)}</b><span>${online ? '<i class="f-dot online"></i> Connecté au mode en ligne' : '<i class="f-dot offline"></i> Mode en ligne déconnecté : seules les actions sur ton propre profil sont disponibles'}</span></div></div>

    <h3 class="set-h3">Mon profil</h3>
    <div class="set-list">
      <div class="set-row"><div><b>Niveau ${lv ? lv.level : 1} · ${esc(lv ? lv.rankName : '')}</b><span>${lv ? lv.xp.toLocaleString('fr-FR') : 0} XP au total</span></div>${lv ? levelBadge(lv.level, 'md') : ''}</div>
      <div class="set-row"><div><b>Ajouter ou retirer de l'XP</b><span>Montant en XP</span></div>
        <div class="adm-inline"><input id="adm-xp" type="number" min="1" step="50" value="500"><button class="ghost primary-soft" data-adm="xp-add">Ajouter</button><button class="ghost danger" data-adm="xp-remove">Retirer</button></div></div>
      <div class="set-row"><div><b>Fixer mon niveau</b><span>Remplace ton XP par le minimum de ce niveau</span></div>
        <div class="adm-inline"><input id="adm-level" type="number" min="1" max="999" value="${lv ? lv.level : 1}"><button class="ghost primary-soft" data-adm="level">Appliquer</button></div></div>
      <div class="set-row"><div><b>Renouveler mes défis du jour</b><span>Tire 3 nouveaux défis (ceux déjà terminés restent comptés)</span></div><button class="ghost" data-adm="reroll">Renouveler</button></div>
    </div>

    <h3 class="set-h3">Donner une récompense</h3>
    <p class="set-note">XP, niveau, jetons de la Boutique et succès ou trophées (secrets et ultime compris), à toi ou à un joueur. Remplis seulement ce que tu veux donner.</p>
    <div class="adm-grant">
      <label>Destinataire<select id="adm-target">
        <option value="me">Moi (${esc((state.profile && state.profile.name) || 'mon profil')})</option>
        ${online ? friends.map((f) => `<option value="${esc(f.uid)}">${esc(f.name)} · niveau ${f.level || 1}</option>`).join('') : ''}
        ${online ? '<option value="code">Autre joueur (code ami)…</option>' : ''}
      </select></label>
      <label class="dim">Code ami<input id="adm-code" placeholder="ABCD-1234" maxlength="9" spellcheck="false" autocomplete="off"></label>
      <label>XP (négatif pour retirer)<input id="adm-gxp" type="number" step="50" placeholder="0"></label>
      <label>Ou fixer le niveau<input id="adm-glevel" type="number" min="1" max="999" placeholder="facultatif"></label>
      <label>Jetons (négatif pour retirer)<input id="adm-gcoins" type="number" step="100" placeholder="0"></label>
      <label>Succès ou trophée<select id="adm-ach">${achOptions()}</select></label>
      <label>Palier<select id="adm-tier">${tierOptions('')}</select></label>
      <label class="wide">Message (facultatif, pour un autre joueur)<input id="adm-note" maxlength="80" placeholder="Bravo pour le tournoi !"></label>
      <button class="btn-play sm" data-adm="grant">Donner</button>
    </div>
    <p class="set-note">${online ? 'Un autre joueur reçoit sa récompense dans les secondes qui suivent s\'il est en ligne, sinon à sa prochaine connexion.' : 'Connecte-toi au mode en ligne (onglet Compte) pour récompenser les autres joueurs.'} « Verrouiller » retire un succès et le bloque à ce palier.</p>

    <h3 class="set-h3">Rangs et badges</h3>
    <p class="set-note">Nom et niveau requis de chaque badge. ${online ? 'Appliqué à tous les joueurs.' : 'Appliqué sur ton PC ; envoyé à tous les joueurs à ta prochaine connexion en ligne.'}</p>
    <div class="adm-ranks">${RANKS.map((r, i) => `<div class="adm-rank">
      ${levelBadge(r.min, 'md', r)}
      <input data-rank-name="${i}" value="${esc(r.name)}" maxlength="20">
      <label>Niveau<input data-rank-min="${i}" type="number" min="1" max="999" value="${r.min}" ${i === 0 ? 'disabled' : ''}></label>
    </div>`).join('')}</div>
    <div class="set-actions"><button class="ghost primary-soft" data-adm="ranks-save">Enregistrer les rangs</button><button class="ghost" data-adm="ranks-reset">Rétablir les rangs d'origine</button></div>

    <h3 class="set-h3">Sécurité du serveur</h3>
    <div class="set-list"><div class="set-row"><div><b>Règles Firebase avec ton compte admin</b><span>À recopier dans Firebase → Realtime Database → Règles, puis Publier. Sans elles, le serveur refuse tes actions d'admin.</span></div><button class="ghost" data-acc="fb-rules">📋 Copier les règles</button></div></div>`;
}

/* ---- Admin: dashboard (global numbers, refreshed every 30 s while open) ---- */
const DASH_ICON = '<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z"/></svg>';
const nf = (n) => Number(n || 0).toLocaleString('fr-FR');

async function loadDash() {
  if (state.dashLoading) return;
  state.dashLoading = true;
  try { state.dash = await api.adminStats(); state.dashError = null; } catch (e) { state.dashError = errMsg(e); }
  state.dashLoading = false;
  if (state.view === 'settings' && state.settingsTab === 'dashboard') render(true);
}
setInterval(() => {
  if (state.view === 'settings' && state.settingsTab === 'dashboard' && !document.hidden) loadDash();
}, 30000);

function dashSpark(hist) {
  if (!hist || hist.length < 2) return '<p class="set-note">La courbe se remplit au fil du temps quand Linkgeek est ouvert sur ton PC (un relevé toutes les 5 minutes).</p>';
  const W = 600, Hh = 90, t0 = hist[0].at, t1 = hist[hist.length - 1].at || t0 + 1;
  const max = Math.max(1, ...hist.map((h) => h.n));
  const pts = hist.map((h) => `${((h.at - t0) / Math.max(1, t1 - t0) * W).toFixed(1)},${(Hh - 6 - h.n / max * (Hh - 16)).toFixed(1)}`);
  return `<svg class="dash-spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">
    <polygon points="0,${Hh} ${pts.join(' ')} ${W},${Hh}" class="area"/><polyline points="${pts.join(' ')}" class="line"/></svg>
    <div class="dash-axis"><span>${new Date(t0).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span><span>max ${max}</span><span>${new Date(t1).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
}
function dashBars(list, empty, label = (x) => esc(x.name)) {
  if (!list || !list.length) return `<p class="set-note">${empty}</p>`;
  const max = Math.max(...list.map((x) => x.n));
  return `<div class="dash-bars">${list.map((x) => `<div class="dash-bar"><span class="l">${label(x)}</span><span class="b"><i style="width:${Math.max(4, x.n / max * 100)}%"></i></span><b>${nf(x.n)}</b></div>`).join('')}</div>`;
}

function dashboardSection(s) {
  const d = state.dash;
  if (!s.admin.online) return `<h2>Tableau de bord</h2><p class="set-warn">Connecte-toi au mode en ligne (onglet Compte) pour voir les chiffres de Linkgeek.</p>`;
  if (!d && !state.dashError) { loadDash(); return '<h2>Tableau de bord</h2><div class="skeleton" style="height:320px"></div>'; }
  if (!d) return `<h2>Tableau de bord</h2><p class="set-warn">${esc(state.dashError)}</p><div class="set-actions"><button class="ghost" data-adm="dash-refresh">Réessayer</button></div>`;
  const tile = (v, l, sub = '', cls = '') => `<div class="dash-tile ${cls}"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const titleName = (x) => { const t = ((state.shop && state.shop.titles) || []).find((y) => y.key === x.name); return esc(t ? t.name : x.name); };
  return `<div class="dash-head"><div><h2>Tableau de bord</h2><p class="set-desc">Chiffres globaux de Linkgeek, visibles seulement par toi. Mis à jour toutes les 30 secondes.</p></div>
      <button class="ghost" data-adm="dash-refresh" ${state.dashLoading ? 'disabled' : ''}>${state.dashLoading ? 'Actualisation…' : 'Actualiser'}</button></div>
    ${state.dashError ? `<p class="set-warn">${esc(state.dashError)}</p>` : ''}
    <div class="dash-tiles">
      ${tile(`<i class="f-dot online"></i>${nf(d.online.now)}`, 'En ligne maintenant', `${nf(d.online.active)} actifs · ${nf(d.online.away)} absents`, 'live')}
      ${tile(nf(d.online.inGame), 'En jeu', 'lancé via Linkgeek')}
      ${tile(nf(d.online.peakToday), 'Pic du jour', 'relevé sur ce PC')}
      ${tile(nf(d.players.members), 'Joueurs inscrits', `+${nf(d.players.new7)} cette semaine · +${nf(d.players.new30)} en 30 jours`)}
    </div>
    <h3 class="set-h3">En ligne ces dernières 24 h</h3>
    <div class="dash-card">${dashSpark(d.online.history)}</div>
    <h3 class="set-h3">Activité</h3>
    <div class="dash-tiles">
      ${tile(nf(d.activity.active24), 'Actifs sur 24 h')}
      ${tile(nf(d.activity.active7), 'Actifs sur 7 jours')}
      ${tile(nf(d.activity.active30), 'Actifs sur 30 jours')}
      ${tile(d.players.profiles ? Math.round(d.activity.active7 / d.players.profiles * 100) + ' %' : '—', 'Joueurs revenus cette semaine')}
    </div>
    <div class="dash-cols">
      <div><h3 class="set-h3">Joués en ce moment</h3>${dashBars(d.playingNow, 'Personne ne joue via Linkgeek pour l\'instant.')}</div>
      <div><h3 class="set-h3">Jeux préférés des joueurs</h3>${dashBars(d.favorites, 'Pas encore de données.')}</div>
    </div>
    <h3 class="set-h3">Temps de jeu</h3>
    <div class="dash-tiles">
      ${tile(nf(d.play.totalHours) + ' h', 'Au total', 'tous joueurs confondus')}
      ${tile(nf(d.play.weekHours) + ' h', 'Cette semaine')}
      ${tile(nf(d.play.avgGames), 'Jeux par joueur', 'en moyenne')}
      ${tile(nf(d.play.ultimate), 'Trophée ultime', 'joueurs l\'ayant obtenu')}
    </div>
    <div class="dash-cols">
      <div><h3 class="set-h3">Niveaux</h3>
        <div class="dash-mini"><span>Moyenne <b>${String(d.players.avgLevel).replace('.', ',')}</b></span><span>Maximum <b>${nf(d.players.maxLevel)}</b></span><span>Fondateurs <b>${nf(d.players.founders)}</b>/100</span></div>
        ${dashBars(d.players.byRank.filter((r) => r.n).reverse(), 'Aucun joueur.', (r) => `${levelBadge(r.min, 'xs', r)}${esc(r.name)}`)}</div>
      <div><h3 class="set-h3">Communauté</h3>
        <div class="dash-mini"><span>Amitiés <b>${nf(d.friends.pairs)}</b></span><span>Amis par joueur <b>${String(d.friends.avg).replace('.', ',')}</b></span><span>Sans ami <b>${nf(d.friends.lonely)}</b></span><span>Réseaux reliés <b>${nf(d.play.socials)}</b></span></div>
        <h3 class="set-h3 sm">Titres équipés</h3>${dashBars(d.titles, 'Aucun titre équipé.', titleName)}</div>
    </div>
    <p class="set-note">Dernière mise à jour : ${new Date(d.at).toLocaleTimeString('fr-FR')}. Seuls des totaux sont affichés : aucun nom ni adresse de joueur. « En ligne » compte les joueurs dont Linkgeek a donné signe de vie depuis moins de 3 minutes.</p>`;
}

/* ---- Admin: trophy pickers ---- */
function achOptions() {
  const c = state.achCatalog;
  if (!c) { loadAchCatalog(); return '<option value="">Chargement…</option>'; }
  const group = (label, list) => (list.length ? `<optgroup label="${label}">${list.map((a) => `<option value="${a.key}">${esc(a.name)}</option>`).join('')}</optgroup>` : '');
  return `<option value="">— Aucun —</option>
    ${group('Succès', c.filter((a) => !a.kind))}
    ${group('Trophées secrets', c.filter((a) => a.kind === 'secret'))}
    ${group('Trophée ultime', c.filter((a) => a.kind === 'ultimate'))}
    ${group('Titres', c.filter((a) => a.kind === 'title'))}`;
}
function tierOptions(key) {
  const a = (state.achCatalog || []).find((x) => x.key === key);
  if (!a) return '<option value="">—</option>';
  const tiers = a.tiers.length === 1 ? ['Débloquer'] : a.tiers;
  return tiers.map((n, i) => `<option value="${i + 1}" ${i === tiers.length - 1 ? 'selected' : ''}>${esc(n)}</option>`).join('') + '<option value="0">Verrouiller (retirer)</option>';
}
async function loadAchCatalog() {
  if (state.achCatalogLoading) return;
  state.achCatalogLoading = true;
  try { state.achCatalog = await api.adminAchCatalog(); if (state.view === 'settings' && state.settingsTab === 'admin') { const sel = $('#adm-ach'); if (sel) sel.innerHTML = achOptions(); } } catch { /* not admin */ }
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'adm-ach') $('#adm-tier').innerHTML = tierOptions(e.target.value);
  if (e.target.id === 'adm-target') { const code = $('#adm-code'); if (code) code.closest('label').classList.toggle('dim', e.target.value !== 'code'); }
});

async function adminClick(t) {
  const a = t.dataset.adm;
  if (a === 'dash-refresh') { state.dashError = null; await loadDash(); return; }
  const num =(sel) => { const v = Number($(sel).value); return Number.isFinite(v) ? v : NaN; };
  const done = async (r, msg) => { if (r && r.profile) state.profile = r.profile; if (r && r.challenges) { state.chal = r.challenges; setRanks(r.challenges.ranks); } state.settings = await api.getSettings(); toast(msg); render(true); };
  t.disabled = true;
  try {
    if (a === 'xp-add' || a === 'xp-remove') {
      const n = Math.abs(num('#adm-xp'));
      if (!n) throw new Error('Indique un montant d\'XP');
      return await done(await api.adminSelfGrant({ xp: a === 'xp-add' ? n : -n }), `${a === 'xp-add' ? '+' : '−'}${n} XP sur ton profil`);
    }
    if (a === 'level') { const l = num('#adm-level'); return await done(await api.adminSelfGrant({ level: l }), `Niveau fixé à ${l}`); }
    if (a === 'reroll') return await done(await api.adminRerollDaily(), 'Nouveaux défis du jour tirés');
    if (a === 'ranks-save' || a === 'ranks-reset') {
      const list = a === 'ranks-reset' ? null : RANKS.map((r, i) => ({ key: r.key, name: $(`[data-rank-name="${i}"]`).value, min: i === 0 ? 1 : Number($(`[data-rank-min="${i}"]`).value) }));
      const r = await api.adminSetRanks(list);
      await done(r, r.remote ? 'Rangs mis à jour pour tous les joueurs' : 'Rangs enregistrés sur ton PC');
      if (r.remoteError) toast('Serveur : ' + r.remoteError + ' — as-tu publié les nouvelles règles ?', true);
      return;
    }
    if (a === 'grant') {
      const target = $('#adm-target').value;
      const g = {
        xp: $('#adm-gxp').value ? num('#adm-gxp') : undefined,
        level: $('#adm-glevel').value ? num('#adm-glevel') : undefined,
        coins: $('#adm-gcoins').value ? num('#adm-gcoins') : undefined,
        ach: $('#adm-ach').value || undefined,
        tier: $('#adm-ach').value ? Number($('#adm-tier').value) : undefined,
      };
      if (!g.xp && !g.level && !g.coins && !g.ach) throw new Error('Indique de l\'XP, un niveau, des jetons ou un succès');
      const achName = g.ach ? $('#adm-ach').selectedOptions[0].textContent : '';
      const parts = [g.xp ? `${signedXp(g.xp)} XP` : '', g.level ? `niveau ${g.level}` : '', g.coins ? `${g.coins > 0 ? '+' : '−'}${fmtCoins(Math.abs(g.coins))} jetons` : '', g.ach ? `${achName} (${$('#adm-tier').selectedOptions[0].textContent})` : ''].filter(Boolean).join(', ');
      if (target === 'me') {
        const r = await api.adminSelfGrant(g);
        if (r.shop) state.shop = r.shop;
        loadAchievements();
        await done(r, `Pour toi : ${parts}`);
      } else {
        await api.adminGrant({ uid: target === 'code' ? null : target, code: $('#adm-code').value, ...g, note: $('#adm-note').value.trim() });
        const who = target === 'code' ? $('#adm-code').value.toUpperCase() : $('#adm-target').selectedOptions[0].textContent.split(' · ')[0];
        toast(`Envoyé à ${who} : ${parts} ✓`);
        $('#adm-note').value = '';
      }
    }
  } catch (e) { toast(errMsg(e), true); } finally { t.disabled = false; }
}

function viewSettings() {
  const s = state.settings;
  if (!s) return '<div class="page"><div class="skeleton" style="height:400px"></div></div>';
  const tabs = s.admin && s.admin.isAdmin ? [...SETTINGS_TABS, ['dashboard', 'Tableau de bord', DASH_ICON], ['admin', 'Admin', CROWN]] : SETTINGS_TABS;
  if ((state.settingsTab === 'admin' || state.settingsTab === 'dashboard') && !(s.admin && s.admin.isAdmin)) state.settingsTab = 'appearance';
  return `<div class="page">
    <div class="page-head"><div><h1>Paramètres</h1><div class="sub">Personnalise Linkgeek à ton goût</div></div></div>
    <div class="settings">
      <nav class="set-nav">${tabs.map(([id, label, icon]) => `<button class="${state.settingsTab === id ? 'active' : ''}" data-set-tab="${id}">${icon}${label}${id === 'account' && s.account ? '<span class="dot" style="background:var(--good);margin-left:auto"></span>' : ''}</button>`).join('')}</nav>
      <div class="set-body panel">${settingsSection(s)}</div>
    </div>
  </div>`;
}

function applyTheme(theme) {
  if (theme === 'classic') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('nexus-theme', theme); } catch { /* ignore */ }
  themeFx(theme);
}

/* ---- Epic theme effects drawn on a canvas behind the app ----
 * Matrix: falling code. Galaxy: twinkling stars drifting + shooting stars.
 * Capped at ~30 fps, paused while Linkgeek is hidden, off with "reduce motion". */
const FX = { kind: null, canvas: null, raf: 0, last: 0, w: 0, h: 0, dpr: 1, data: null };
function themeFx(theme) {
  const kind = theme === 'matrix' || theme === 'galaxy' ? theme : null;
  if (FX.kind === kind) return;
  cancelAnimationFrame(FX.raf);
  if (FX.canvas) { FX.canvas.remove(); FX.canvas = null; }
  FX.kind = kind;
  if (!kind || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.id = 'theme-fx';
  document.body.prepend(c);
  FX.canvas = c;
  fxResize();
  FX.raf = requestAnimationFrame(fxFrame);
}
function fxResize() {
  const c = FX.canvas;
  if (!c) return;
  FX.dpr = Math.min(window.devicePixelRatio || 1, 2);
  FX.w = innerWidth; FX.h = innerHeight;
  c.width = FX.w * FX.dpr; c.height = FX.h * FX.dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0);
  if (FX.kind === 'matrix') {
    const size = 16;
    FX.data = { size, drops: Array.from({ length: Math.ceil(FX.w / size) }, () => Math.random() * -FX.h / size), chars: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789'.split('') };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FX.w, FX.h);
  } else {
    const n = Math.round((FX.w * FX.h) / 5200);
    FX.data = { stars: Array.from({ length: n }, () => ({ x: Math.random() * FX.w, y: Math.random() * FX.h, r: Math.random() * 1.3 + 0.2, s: Math.random() * 0.12 + 0.02, p: Math.random() * Math.PI * 2, hue: [270, 320, 200, 0][Math.floor(Math.random() * 4)] })), shoot: null, nextShoot: performance.now() + 3000 };
  }
}
window.addEventListener('resize', () => { if (FX.canvas) fxResize(); });
function fxFrame(t) {
  FX.raf = requestAnimationFrame(fxFrame);
  if (document.hidden || t - FX.last < (FX.kind === 'matrix' ? 50 : 33)) return;
  FX.last = t;
  const ctx = FX.canvas.getContext('2d');
  const d = FX.data;
  if (FX.kind === 'matrix') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.fillRect(0, 0, FX.w, FX.h);
    ctx.font = `${d.size}px Consolas, monospace`;
    d.drops.forEach((y, i) => {
      const ch = d.chars[(Math.random() * d.chars.length) | 0];
      const x = i * d.size; const py = y * d.size;
      ctx.fillStyle = Math.random() > 0.975 ? '#d6ffe4' : 'rgba(0, 255, 102, 0.55)';
      ctx.fillText(ch, x, py);
      d.drops[i] = py > FX.h && Math.random() > 0.975 ? 0 : y + 1;
    });
  } else {
    ctx.clearRect(0, 0, FX.w, FX.h);
    for (const s of d.stars) {
      s.x -= s.s; if (s.x < -2) { s.x = FX.w + 2; s.y = Math.random() * FX.h; }
      const a = 0.45 + 0.55 * Math.abs(Math.sin(t / 1400 + s.p));
      ctx.fillStyle = s.hue ? `hsla(${s.hue}, 90%, 85%, ${a})` : `rgba(255, 255, 255, ${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!d.shoot && t > d.nextShoot) d.shoot = { x: Math.random() * FX.w * 0.7 + FX.w * 0.3, y: Math.random() * FX.h * 0.4, life: 0 };
    if (d.shoot) {
      const sh = d.shoot; sh.life += 1;
      const x = sh.x - sh.life * 14; const y = sh.y + sh.life * 6;
      const g = ctx.createLinearGradient(x, y, x + 120, y - 52);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); g.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y - 52); ctx.stroke();
      if (sh.life > 40) { d.shoot = null; d.nextShoot = t + 5000 + Math.random() * 7000; }
    }
  }
}

async function loadSettings() {
  state.settings = await api.getSettings();
  applyTheme(state.settings.theme);
  applyLanguage(state.settings.language);
  if (state.view === 'settings') render(true);
}

/* ---------------- First launch ---------------- */
const ONB_STEPS = [
  {
    icon: I.layers, title: 'Tous tes jeux au même endroit',
    text: () => {
      const n = visibleGames().length;
      const plats = Object.keys(SOURCES).filter((s) => state.games.some((g) => g.source === s)).map((s) => SOURCES[s].label);
      return `Linkgeek a trouvé <b>${n} jeu${n > 1 ? 'x' : ''}</b>${plats.length ? ` sur ${esc(plats.join(', '))}` : ''}. Il suit ton temps de jeu tout seul, quel que soit le launcher utilisé. Range-les dans des collections comme « En cours » ou « À finir ».`;
    },
  },
  {
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>', title: 'Connecte-toi avec Google',
    text: () => 'Ton compte Google sert d\'identité : ton nom et ta photo sont repris, et aucun mot de passe n\'est stocké. C\'est facultatif : sans compte, rien ne quitte ton PC.',
    action: () => (state.settings && state.settings.account ? '<span class="chip live">✓ Déjà connecté</span>' : '<button class="btn-google" data-onb="google">' + GOOGLE_G + 'Continuer avec Google</button>'),
  },
  {
    icon: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/></svg>', title: 'Ajoute tes amis',
    text: () => 'Dans l\'onglet <b>Amis</b>, partage ton <b>code ami</b> (format ABCD-1234) ou entre celui d\'un ami. Vous verrez qui est en ligne, à quoi chacun joue, vos profils et un classement de la semaine.',
  },
];

function showOnboarding(step = 0) {
  state.onbStep = step;
  const s = ONB_STEPS[step];
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg onb-bg"><div class="modal onb">
    <div class="onb-art"><img src="../assets/icon.png" alt=""><span>${s.icon}</span></div>
    <div class="onb-step">Étape ${step + 1} sur ${ONB_STEPS.length}</div>
    <h2>${s.title}</h2>
    <p>${s.text()}</p>
    ${s.action ? `<div class="onb-action">${s.action()}</div>` : ''}
    <div class="onb-dots">${ONB_STEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row">
      <button class="ghost" data-onb="${step ? 'prev' : 'skip'}">${step ? 'Retour' : 'Passer'}</button>
      <button class="primary" data-onb="${step < ONB_STEPS.length - 1 ? 'next' : 'done'}">${step < ONB_STEPS.length - 1 ? 'Suivant' : 'C\'est parti !'}</button>
    </div>
  </div></div>`;
  root.onclick = null;
}

async function onboardingClick(t) {
  const a = t.dataset.onb;
  if (a === 'show') return showOnboarding(0);
  if (a === 'next') return showOnboarding(state.onbStep + 1);
  if (a === 'prev') return showOnboarding(state.onbStep - 1);
  if (a === 'google') {
    $('#modal-root').innerHTML = '';
    state.settingsTab = 'account';
    go('settings');
    const b = await new Promise((r) => setTimeout(() => r($('[data-acc="signin"]')), 300));
    if (b && !b.disabled) b.click();
    return;
  }
  if (a === 'skip' || a === 'done') {
    $('#modal-root').innerHTML = '';
    state.settings = await api.setSettings({ onboarded: true });
    if (a === 'done') go('friends');
  }
}

async function maybeOnboard() {
  const s = state.settings;
  if (!s || s.onboarded) return;
  // People who used Linkgeek before this screen existed don't need it
  if (s.account) { state.settings = await api.setSettings({ onboarded: true }); return; }
  if (!$('#modal-root').innerHTML) showOnboarding(0);
}

const errMsg = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

async function settingsClick(t) {
  const d = t.dataset;
  try {
    if (d.setTab) { state.settingsTab = d.setTab; return render(true); }
    if (d.themePick) {
      applyTheme(d.themePick);
      state.settings = await api.setSettings({ theme: d.themePick });
      return render(true);
    }
    if (d.setting === 'language') {
      state.settings = await api.setSettings({ language: d.value });
      applyLanguage(state.settings.language);
      return render(true);
    }
    if (d.setting === 'discord') {
      state.settings = await api.setSettings({ discord: { enabled: !state.settings.discord.enabled } });
      return render(true);
    }
    if (d.setting) {
      state.settings = await api.setSettings({ [d.setting]: !state.settings[d.setting] });
      if (d.setting === 'weeklyBoard') { state.weekly = null; state.weeklyAt = 0; }
      return render(true);
    }
    if (d.lib === 'rescan') return $('#btn-rescan').click();
    if (d.lib === 'unhide') { state.settings = await api.unhideAll(); await reload(); toast('Tous les jeux sont de nouveau visibles'); return render(true); }
    if (d.lib === 'data') return api.openDataFolder();
    if (d.acc === 'signin') {
      state.signingIn = true; render(true);
      try {
        const r = await api.signInGoogle();
        state.settings = r.settings; state.profile = r.profile;
        state.friends = await api.getFriends();
        toast(`Connecté : bienvenue ${r.settings.account.name || ''} !`);
        if (r.onlineError) toast('Mode en ligne : ' + r.onlineError, true);
      } finally { state.signingIn = false; render(true); }
      return;
    }
    if (d.acc === 'cancel') return api.cancelSignIn();
    if (d.acc === 'use') { state.profile = await api.useGoogleProfile(); toast('Profil mis à jour depuis Google'); return render(true); }
    if (d.acc === 'signout') { state.settings = await api.signOutGoogle(); await reload(); toast('Compte Google déconnecté'); return render(true); }
    if (d.acc === 'fb-rules') { await api.copyFirebaseRules(); return toast('Règles copiées dans le presse-papiers'); }
    if (d.acc === 'discord-save') {
      state.settings = await api.setSettings({ discord: { clientId: $('#discord-id').value } });
      toast(state.settings.discord.clientId ? 'ID Discord enregistré' : 'ID Discord effacé');
      return render(true);
    }
    if (d.acc === 'delete-online') {
      const ok = await confirmModal('Supprimer ton compte en ligne ?',
        'Ton profil, ton code ami, tes amitiés, tes demandes d\'ami et ton statut seront effacés du serveur, ainsi que ton compte Firebase. Tes amis ne te verront plus. C\'est définitif, mais tu pourras recréer un compte plus tard (avec un nouveau code ami). Ton temps de jeu et tes réglages restent sur ce PC.',
        'Supprimer définitivement');
      if (!ok) return;
      t.disabled = true;
      const r = await api.deleteOnlineAccount();
      state.settings = r.settings;
      state.friends = await api.getFriends();
      await reload();
      toast(r.failed ? `Compte supprimé, mais ${r.failed} élément(s) n'ont pas pu être effacés (règles Firebase à mettre à jour ?)` : 'Ton compte en ligne a été supprimé', !!r.failed);
      return render(true);
    }
    if (d.acc === 'fb-save' || d.acc === 'fb-clear') {
      state.settings = await api.setFirebaseConfig(d.acc === 'fb-clear' ? '' : $('#fb-config').value);
      state.friends = await api.getFriends();
      toast(d.acc === 'fb-clear' ? 'Mode en ligne désactivé' : 'Mode en ligne configuré ✓');
      return render(true);
    }
    if (d.acc === 'import') { const s = await api.importGoogleJson(); if (s) { state.settings = s; toast('Configuration Google importée'); render(true); } return; }
    if (d.acc === 'save' || d.acc === 'clear') {
      const cfg = d.acc === 'clear' ? {} : { clientId: $('#g-id').value, clientSecret: $('#g-secret').value };
      state.settings = await api.setGoogleConfig(cfg);
      toast(d.acc === 'clear' ? 'Configuration effacée' : 'Configuration Google enregistrée');
      return render(true);
    }
  } catch (e) {
    toast(errMsg(e), true);
  }
}

/* ---------------- Render & routing ---------------- */
function render(keepScroll = false) {
  const main = $('#main');
  const scroll = main.scrollTop;
  const views = { shop: viewShop, home: viewHome, friends: viewFriends, challenges: viewChallenges, achievements: viewAchievements, library: viewLibrary, stats: viewStats, game: viewGame, profile: viewProfile, settings: viewSettings };
  $('#view').innerHTML = views[state.view]();
  renderSidebar();
  main.scrollTop = keepScroll ? scroll : 0;
}

function go(view, gameId = null) {
  if (view === 'game') {
    if (state.view !== 'game') state.prevView = state.view;
    state.gameId = gameId;
  }
  state.view = view;
  if (view === 'stats' || view === 'game') refreshStats();
  if (view === 'settings') loadSettings();
  if (view === 'achievements') loadAchievements();
  if (view === 'shop') loadShop();
  if (view === 'game' && gameId) { state.newsOpen = null; loadNews(gameId); }
  if (view === 'home') { loadRecentNews(); loadReco(); if (!state.ach) loadAchievements(); if (!state.shop) loadShop(); if (!state.weeklyAt || Date.now() - state.weeklyAt > 60000) loadWeekly(); }
  if (view === 'challenges' || view === 'profile') loadChallenges();
  if (view === 'friends') loadMyCard();
  api.noteVisit(view).catch(() => {}); // secret trophy "Curieux"
  render();
}

async function refreshStats() {
  try {
    state.stats = await api.getStats();
    if (state.view === 'stats' || state.view === 'game') render(true);
  } catch (e) { console.error(e); }
}

async function reload() {
  const data = await api.getLibrary();
  state.games = data.games;
  state.profile = data.profile;
  if (data.profile) setRanks(data.profile.ranks);
  state.running = new Set(data.running);
  state.collections = data.collections || {};
  if (state.collection && !state.collections[state.collection]) state.collection = null;
  if (data.games.length) state.loaded = true;
}

/* ---------------- Modal ---------------- */
function promptModal(title, value) {
  return new Promise((resolve) => {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-bg"><div class="modal"><h2>${esc(title)}</h2><input id="modal-input" value="${esc(value)}"><div class="row"><button class="ghost" data-m="cancel">Annuler</button><button class="primary" data-m="ok">Enregistrer</button></div></div></div>`;
    const input = $('#modal-input'); input.focus(); input.select();
    const close = (v) => { root.innerHTML = ''; resolve(v); };
    root.onclick = (e) => {
      const m = e.target.closest('[data-m]');
      if (m) close(m.dataset.m === 'ok' ? input.value : null);
      else if (e.target.classList.contains('modal-bg')) close(null);
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null); };
  });
}

/* ---------------- Events ---------------- */
async function launch(id) {
  const g = byId(id);
  try {
    await api.launch(id);
    toast(`Lancement de ${g ? g.name : 'du jeu'}…`);
  } catch (e) {
    toast(String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true);
  }
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-launch],[data-fav],[data-open],[data-nav],[data-source],[data-back],[data-folder],[data-store],[data-rename],[data-cover],[data-hide],[data-remove],[data-toggle-hidden],[data-tsort],[data-add],[data-pick-avatar],[data-reset-avatar],[data-slot-clear],[data-slot]');
  const adm = e.target.closest('[data-adm]');
  if (adm && !adm.disabled) return adminClick(adm);
  const st = e.target.closest('[data-set-tab],[data-theme-pick],[data-setting],[data-lib],[data-acc]');
  if (st && !st.disabled) return settingsClick(st);
  const ft = e.target.closest('[data-goto-account],[data-friends-refresh],[data-friends-copy],[data-friend-accept],[data-friend-decline],[data-friend-remove],[data-friend-open],[data-friends-tab],[data-board]');
  if (ft && !ft.closest('#modal-root')) return friendsClick(ft);
  const ct = e.target.closest('[data-col],[data-col-new],[data-col-rename],[data-col-del],[data-col-toggle]');
  if (ct && !ct.closest('#modal-root')) return collectionsClick(ct);
  if (e.target.closest('[data-reco-refresh]')) { if (!state.recoLoading) loadReco(true); return; }
  if (e.target.closest('[data-board-refresh]')) { loadWeekly(); return; }
  if (e.target.closest('[data-cmp-friends]')) {
    state.cmpFriends = !state.cmpFriends;
    try { localStorage.setItem('linkgeek-cmp-friends', state.cmpFriends ? '1' : '0'); } catch { /* ignore */ }
    return render(true);
  }
  const wb = e.target.closest('[data-wrapped]');
  if (wb && !wb.closest('#modal-root')) return openWrapped(Number(wb.dataset.wrapped));
  const lv = e.target.closest('[data-lib-view]');
  if (lv) { setLibView(lv.dataset.libView); return; }
  const ls = e.target.closest('[data-lib-sort]');
  if (ls) { state.sort = ls.dataset.libSort; render(true); return; }
  const idot = e.target.closest('[data-info-dot]');
  if (idot) { showInfo(Number(idot.dataset.infoDot)); return; }
  const istep = e.target.closest('[data-info-step]');
  if (istep) { showInfo((state.infoIdx || 0) + Number(istep.dataset.infoStep)); return; }
  const hd = e.target.closest('[data-hero-dot]');
  if (hd) { showHero(Number(hd.dataset.heroDot)); return; }
  const wsp = e.target.closest('[data-wheel-spin]');
  if (wsp && !wsp.disabled) return spinWheel(wsp);
  const nw = e.target.closest('[data-news-toggle],[data-news-refresh]');
  if (nw) {
    if (nw.dataset.newsToggle) { state.newsOpen = state.newsOpen === nw.dataset.newsToggle ? null : nw.dataset.newsToggle; return render(true); }
    nw.disabled = true; nw.textContent = 'Actualisation…';
    await api.refreshNews(); state.news = {}; return loadRecentNews();
  }
  const sh = e.target.closest('[data-shop-buy],[data-shop-apply],[data-frame],[data-title-equip],[data-genre],[data-genre-reset]');
  if (sh && !sh.disabled) return shopClick(sh);
  const ob = e.target.closest('[data-onb]');
  if (ob) return onboardingClick(ob);
  if (e.target.closest('[data-edit-socials]')) return editSocialsModal();
  const ep = e.target.closest('[data-edit-profile]');
  if (ep && !ep.closest('#modal-root')) return editProfileModal();
  const cs = e.target.closest('[data-copy-social]');
  if (cs) { try { await navigator.clipboard.writeText(cs.dataset.copySocial); toast(`Pseudo Discord copié : ${cs.dataset.copySocial}`); } catch { toast(cs.dataset.copySocial); } return; }
  const af = e.target.closest('[data-ach-filter]');
  if (af) { state.achFilter = af.dataset.achFilter; return render(true); }
  if (!t || t.closest('#modal-root')) return;
  const d = t.dataset;
  if (d.pickAvatar !== undefined) {
    const p = await api.pickAvatar();
    if (p) { state.profile = p; render(true); toast('Photo de profil mise à jour'); }
    return;
  }
  if (d.resetAvatar !== undefined) { state.profile = await api.resetAvatar(); return render(true); }
  if (d.slotClear !== undefined) {
    const ids = [...state.profile.top5]; ids[Number(d.slotClear)] = null;
    return saveTop5(ids);
  }
  if (d.slot !== undefined) return openPicker(Number(d.slot));
  if (d.launch) { e.stopPropagation(); return launch(d.launch); }
  if (d.fav) { e.stopPropagation(); await api.toggleFavorite(d.fav); await reload(); return render(true); }
  if (d.open) return go('game', d.open);
  if (d.nav) return go(d.nav);
  if (d.source) { state.source = d.source; return render(true); }
  if (d.back !== undefined) { state.view = state.prevView; return render(); }
  if (d.folder) return api.openFolder(d.folder);
  if (d.store) return api.openStore(d.store);
  if (d.rename) {
    const g = byId(d.rename);
    const name = await promptModal('Renommer le jeu', g.name);
    if (name !== null) { await api.rename(g.id, name); await reload(); render(true); }
    return;
  }
  if (d.cover) { if (await api.setCover(d.cover)) { await reload(); render(true); } return; }
  if (d.hide) {
    const hidden = await api.toggleHidden(d.hide);
    toast(hidden ? 'Jeu masqué de la bibliothèque' : 'Jeu affiché dans la bibliothèque');
    await reload(); return render(true);
  }
  if (d.remove) { await api.removeManual(d.remove); await reload(); state.view = 'library'; return render(); }
  if (d.toggleHidden !== undefined) { state.showHidden = !state.showHidden; return render(true); }
  if (d.add !== undefined) return addGame();
  if (d.tsort) {
    const k = d.tsort;
    state.tableSort = state.tableSort.key === k ? { key: k, dir: -state.tableSort.dir } : { key: k, dir: k === 'name' || k === 'source' ? 1 : -1 };
    return render(true);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('card')) go('game', e.target.dataset.open);
  if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) { e.preventDefault(); $('#search').focus(); }
  if (e.key === 'Escape' && state.view === 'game') { state.view = state.prevView; render(); }
});

document.addEventListener('change', async (e) => {
  if (e.target.id === 'sort') { state.sort = e.target.value; render(true); }
  if (e.target.id === 'pf-name') {
    state.profile = await api.setProfileName(e.target.value);
    e.target.value = state.profile.name;
    renderSidebar();
    toast('Pseudo enregistré');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'pf-name' && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur();
});

$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) go(b.dataset.view);
});

$('#search').addEventListener('input', (e) => {
  state.q = e.target.value;
  if (state.view !== 'library') { state.view = 'library'; render(); } else render(true);
  $('#search').focus();
});

async function addGame() {
  const id = await api.addManual();
  if (id) { await reload(); toast('Jeu ajouté à ta bibliothèque'); go('game', id); }
}
$('#btn-add').addEventListener('click', addGame);

$('#btn-rescan').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  b.classList.add('spin');
  try {
    const data = await api.rescan();
    state.games = data.games; state.profile = data.profile; state.running = new Set(data.running); state.loaded = true;
    render(true);
    toast(`${visibleGames().length} jeux trouvés`);
  } finally { b.classList.remove('spin'); }
});

let changeTimer;
api.onLibraryChanged(() => {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(async () => {
    const first = !state.loaded;
    await reload();
    state.loaded = true;
    if (document.activeElement && ['modal-input', 'pf-name'].includes(document.activeElement.id)) { renderSidebar(); return; }
    render(!first);
    // news may have arrived: refresh the home section (cheap, cached in the main process)
    if (state.view === 'home') loadRecentNews();
    if (state.view === 'game' && state.gameId && !(state.news[state.gameId] && state.news[state.gameId].items.length)) loadNews(state.gameId);
    if (state.view === 'stats') refreshStats();
  }, 250);
});
api.onRunning((ids) => { state.running = new Set(ids); });

/* ---------------- Boot ---------------- */
api.onFriends(onFriendsSnapshot);
api.onAchievements(achToast);
api.onOpenAchievements(() => go('achievements'));
api.onChallenges(onChallengesDone);
api.onOpenChallenges(() => go('challenges'));
api.onFriendActivity(friendActivityToast);
api.onShopCoins((c) => { coinToast(c.n, c.why); loadShop(); });
api.onOpenShop(() => go('shop'));
api.onTitles((l) => { titleToast(l); reload().then(() => render(true)); });
api.onOpenFriends(() => go('friends'));
// Countdowns and in-progress play time
setInterval(() => { if (state.view === 'challenges') loadChallenges(); }, 60000);

/* ---------------- Updates ---------------- */
function updateToast(version) {
  if ($('#update-toast')) return;
  const t = document.createElement('div');
  t.id = 'update-toast';
  t.className = 'toast update';
  t.innerHTML = `<div><b>Mise à jour ${esc(version)} prête</b><span>Redémarre pour en profiter.</span></div>
    <button class="btn-play" data-act="install">Redémarrer</button>
    <button class="btn-glass" data-act="later" title="Elle s'installera à la prochaine fermeture">Plus tard</button>`;
  t.addEventListener('click', async (e) => {
    const act = e.target.closest('button') && e.target.closest('button').dataset.act;
    if (act === 'later') t.remove();
    if (act === 'install') { e.target.disabled = true; e.target.textContent = 'Installation…'; await api.installUpdate(); }
  });
  $('#toasts').appendChild(t);
}
if (api.onUpdateReady) {
  api.onUpdateReady(updateToast);
  api.getUpdateStatus().then((s) => { if (s && s.ready) updateToast(s.ready); }).catch(() => {});
}

(async () => {
  render();
  const [, , fr] = await Promise.all([reload(), loadSettings(), api.getFriends()]);
  state.friends = fr;
  render();
  setTimeout(loadChallenges, 1500);
  loadShop();
  setTimeout(loadRecentNews, 2500);
  setTimeout(loadReco, 3000);
  api.onReco(() => loadReco());
  // first launch: wait for the first scan so the welcome screen can count the games
  setTimeout(maybeOnboard, state.loaded ? 600 : 4000);
})();

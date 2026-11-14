/* Linkgeek — renderer */
const api = window.nexus;

const state = {
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

function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = (err ? '⚠️ ' : '') + esc(msg);
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2800);
  setTimeout(() => t.remove(), 3200);
}

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
function renderSidebar() {
  const p = state.profile;
  const name = p && p.name ? p.name : 'Joueur';
  const total = state.games.reduce((a, g) => a + g.playtimeSec, 0);
  const lv = p && p.level;
  $('#profile').innerHTML = `
    ${avatarHtml('avatar')}
    <div class="who"><div class="who-name"><b>${esc(name)}</b>${lv ? levelBadge(lv.level, 'sm') : ''}${p && p.admin ? adminTag() : ''}${p && p.ultimate ? ultimateBadge() : ''}</div>${p && p.title ? `<span class="who-title" title="Niveau ${lv ? lv.level : 1}${lv ? ` · ${esc(lv.rankName)}` : ''}">« ${esc(p.title.name)} »</span>` : `<span>${lv ? `Niveau ${lv.level} · ${esc(lv.rankName)}` : `${fmtHours(total)} de jeu au total`}</span>`}</div>
    <span class="edit-hint">${I.edit}</span>`;
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
      <div class="meta"><span class="dot ${g.source}"></span>${esc(fmtTime(g.playtimeSec, 'Pas encore joué'))}${g.sizeBytes ? `<span class="sep"></span>${fmtSize(g.sizeBytes)}` : ''}</div>
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
  const featured = games.find((g) => state.running.has(g.id)) || recent[0];
  const t = totals(games);
  const favs = games.filter((g) => g.favorite);
  const running = state.running.has(featured.id);
  const logo = featured.logo;

  return `
  <div class="page">
    <section class="hero">
      <div class="hero-bg" style="background-image:url('${esc(heroSrc(featured) || '')}')"></div>
      <div class="hero-content">
        <div class="eyebrow">${running ? '<span class="chip live">En cours</span>' : `<span class="dot ${featured.source}"></span>${featured.lastPlayed ? 'Reprendre la partie' : 'À découvrir'}`}</div>
        ${logo ? `<img class="hero-logo" src="${esc(logo)}" alt="${esc(featured.name)}">` : `<h1>${esc(featured.name)}</h1>`}
        <div class="hero-meta">
          <span>${I.clock}${esc(fmtTime(featured.playtimeSec))}</span>
          <span>${I.calendar}${esc(fmtAgo(featured.lastPlayed))}</span>
          ${featured.sizeBytes ? `<span>${I.disk}${fmtSize(featured.sizeBytes)}</span>` : ''}
        </div>
        <div class="actions">
          ${playButton(featured)}
          <button class="btn-glass" data-open="${esc(featured.id)}">Détails</button>
          <button class="btn-glass square ${featured.favorite ? 'on' : ''}" data-fav="${esc(featured.id)}" title="Favori">${I.star}</button>
        </div>
      </div>
    </section>

    <button class="home-stats" data-nav="stats" title="Voir les statistiques">
      <div><b>${fmtHours(t.time)}</b><span>de jeu au total</span></div>
      <div><b>${t.count}</b><span>jeux installés</span></div>
      <div><b>${fmtSize(t.size)}</b><span>sur le disque</span></div>
      <div><b title="${esc(t.top && t.top.playtimeSec ? t.top.name : '')}">${esc(t.top && t.top.playtimeSec ? t.top.name : '—')}</b><span>le plus joué</span></div>
      <i>Statistiques →</i>
    </button>

    <section class="section">
      <div class="section-head"><div><h2>Reprendre</h2><div class="sub">Tes derniers jeux lancés</div></div><button class="link" data-nav="library">Toute la bibliothèque →</button></div>
      <div class="rail">${recent.filter((g) => g.id !== featured.id).slice(0, 8).map(wideCard).join('')}</div>
    </section>

    <div class="home-split">
      ${recentNewsSection()}
      ${playerProfilePanel()}
    </div>

    ${recoSection()}

    ${favs.length ? `
    <section class="section">
      <div class="section-head"><div><h2>Favoris</h2><div class="sub">${favs.length} jeu${favs.length > 1 ? 'x' : ''}</div></div>${favs.length > 6 ? '<button class="link" data-nav="library">Tout voir →</button>' : ''}</div>
      <div class="grid">${favs.slice(0, 6).map(gameCard).join('')}</div>
    </section>` : ''}
  </div>`;
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
    ${list.length ? `<div class="grid">${list.map(gameCard).join('')}</div>` : state.collection ? `<div class="empty"><b>Collection vide</b>Ouvre un jeu puis utilise « Collections » pour l'y ranger.</div>` : `<div class="empty"><b>Aucun jeu trouvé</b>Essaie un autre filtre ou une autre recherche.</div>`}
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
    <div class="page-head"><div><h1>Statistiques</h1><div class="sub">Vue d'ensemble de ta bibliothèque et de ton temps de jeu</div></div></div>
    <div class="kpis">
      ${kpi(I.clock, 'Temps de jeu total', fmtHours(t.time), `soit ${(t.time / 86400).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} jours`)}
      ${kpi(I.bolt, 'Cette semaine', week ? fmtTime(week) : '—', 'suivi par Linkgeek')}
      ${kpi(I.disk, 'Espace occupé', fmtSize(t.size), `${games.filter((g) => !g.sizeBytes).length ? games.filter((g) => !g.sizeBytes).length + ' taille(s) en calcul' : 'tous les jeux mesurés'}`)}
      ${kpi(I.layers, 'Jeux installés', String(t.count), `${played.length} déjà lancés · ${t.count - played.length} jamais joués`)}
    </div>

    <div class="stats-grid">
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
        <h2>Répartition par plateforme</h2>
        <div class="donut-wrap">
          <div class="donut">
            <svg viewBox="0 0 170 170"><circle r="${R}" cx="85" cy="85" stroke="rgba(255,255,255,.05)"></circle>${arcs}</svg>
            <div class="center"><div><b>${fmtSize(t.size)}</b><span>sur le disque</span></div></div>
          </div>
          <div class="legend">
            ${plat.map((p) => `<div class="legend-row"><span class="dot" style="background:${p.color}"></span><div>${esc(p.label)}<small>${p.count} jeu${p.count > 1 ? 'x' : ''} · ${fmtHours(p.time)}</small></div><span class="v">${fmtSize(p.size)}</span></div>`).join('')}
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
              <td class="num">${esc(fmtTime(g.playtimeSec, '—'))}</td>
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

/* ---- Rank frames around the profile picture ---- */
function framePicker(p) {
  const lv = (p.level && p.level.level) || 1;
  const choice = p.frameChoice || 'auto';
  const pic = p.avatar ? `<img src="${esc(p.avatar)}" alt="">` : `<div>${esc(initials(p.name || 'Joueur'))}</div>`;
  const opt = (key, label, sub, unlocked, active, frameKey) => `<button class="fp-opt ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" ${unlocked ? `data-frame="${key}"` : 'disabled'} title="${esc(sub)}">
      <span class="fp-pic ${frameKey ? `framed r-${frameKey}` : ''}">${pic}${unlocked ? '' : `<i class="fp-lock">${CROWN_LOCK}</i>`}</span>
      <b>${esc(label)}</b><small>${esc(sub)}</small>
    </button>`;
  const current = [...RANKS].reverse().find((r) => lv >= r.min);
  return `<section class="section">
    <div class="section-head"><div><h2>Contour de photo</h2><div class="sub">Chaque rang atteint débloque son contour. Il est visible par tes amis.</div></div></div>
    <div class="frame-picker">
      ${opt('auto', 'Automatique', `Rang actuel : ${current ? current.name : '—'}`, true, choice === 'auto', current && current.key)}
      ${RANKS.map((r) => opt(r.key, r.name, lv >= r.min ? 'Débloqué' : `Niveau ${r.min}`, lv >= r.min, choice === r.key, r.key)).join('')}
      ${opt('none', 'Aucun', 'Sans contour', true, choice === 'none', null)}
    </div>
  </section>`;
}
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
        <button class="pf-avatar ${p.frame ? `framed r-${esc(p.frame)}` : ''}" data-pick-avatar title="Changer la photo de profil">
          ${avatarHtml('pf-avatar-img', false)}
          <span class="pf-avatar-edit">${I.image}<span>Changer</span></span>
        </button>
        <div class="pf-id">
          <label for="pf-name">Pseudo</label>
          <div class="pf-name-wrap">
            <input id="pf-name" class="pf-name" value="${esc(p.name)}" maxlength="32" spellcheck="false" autocomplete="off">
            ${I.edit}
            ${p.level ? `<button class="pf-badge" data-nav="challenges" title="Voir mes défis">${levelBadge(p.level.level, 'lg')}</button>` : ''}
            ${p.admin ? adminTag(true) : ''}
            ${p.ultimate ? ultimateBadge(true) : ''}
          </div>
          ${p.title ? `<button class="pf-title" data-nav="shop" title="Changer de titre dans la Boutique">${titleChip(p.title.name, true)}</button>` : ''}
          ${p.level ? levelBar(p.level) : ''}
          <div class="pf-sub">
            ${memberLine(p)}
            ${socialIcons(p.socials, true)}
            ${p.steamName && p.steamName !== p.name ? `<span>Nom Steam : ${esc(p.steamName)}</span>` : ''}
            ${p.customAvatar ? `<button class="link" data-reset-avatar>Revenir à la photo Steam</button>` : ''}
          </div>
        </div>
      </div>
      <div class="pf-stats five">
        <div><b>${fmtHours(t.time)}</b><span>de jeu</span></div>
        <div><b>${t.count}</b><span>jeux installés</span></div>
        <button data-nav="achievements" title="Voir mes succès"><b>${p.ach ? `${p.ach.unlocked}/${p.ach.total}` : '—'}</b><span>succès débloqués</span></button>
        <button data-nav="friends" title="Voir mes amis"><b>${p.friendCount !== null && p.friendCount !== undefined ? p.friendCount : '—'}</b><span>${p.friendCount === 1 ? 'ami' : 'amis'}</span></button>
        <div><b title="${esc(t.top && t.top.playtimeSec ? t.top.name : '')}">${esc(t.top && t.top.playtimeSec ? t.top.name : '—')}</b><span>le plus joué</span></div>
      </div>
    </section>

    ${recordsSection(p.records)}
    ${p.level ? framePicker(p) : ''}

    <section class="section">
      <div class="section-head">
        <div><h2>Mes 5 jeux préférés</h2><div class="sub">Clique sur un bloc pour choisir un jeu · glisse-dépose pour changer l'ordre</div></div>
      </div>
      <div class="top5">
        ${picks.map((g, i) => g ? `
          <div class="slot filled" draggable="true" data-slot="${i}">
            <div class="rank">${i + 1}</div>
            ${coverHtml(g)}
            <button class="slot-clear" data-slot-clear="${i}" title="Retirer">✕</button>
            <div class="slot-info"><b title="${esc(g.name)}">${esc(g.name)}</b><span><span class="dot ${g.source}"></span>${esc(fmtTime(g.playtimeSec, 'Pas encore joué'))}</span></div>
          </div>` : `
          <div class="slot empty" data-slot="${i}">
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
      <div class="panel ch-history">${c.history.map((h) => `<div><span class="ch-kind">${h.kind === 'daily' ? 'Jour' : h.kind === 'weekly' ? 'Semaine' : h.kind === 'admin' ? 'Admin' : 'Unique'}</span><b>${esc(h.title)}</b><span class="ch-when">${esc(fmtAgo(h.at))}</span><span class="ch-xp${h.xp < 0 ? ' neg' : ''}">${signedXp(h.xp)} XP</span></div>`).join('')}</div>
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
  const card = (t) => {
    const afford = s.coins >= t.price;
    const active = cur === t.id;
    return `<div class="shop-card ${t.owned ? 'owned' : ''} ${active ? 'active' : ''}">
      ${themePreview(t)}
      <div class="shop-meta">
        <div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div>
        ${t.owned
          ? (active ? '<span class="chip live">✓ Appliqué</span>' : `<button class="btn-glass sm" data-shop-apply="${t.id}">Appliquer</button>`)
          : `<button class="btn-play sm ${afford ? '' : 'disabled'}" data-shop-buy="${t.id}" ${afford ? '' : 'title="Pas assez de jetons"'}>${COIN}${fmtCoins(t.price)}</button>`}
      </div>
      ${!t.owned && !afford ? `<div class="shop-miss">Encore ${fmtCoins(t.price - s.coins)} jetons</div>` : ''}
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
        <span>✓ Chaque défi terminé : 1 jeton pour ${s.rates.perXp} XP (un défi à 60 XP = 12 jetons)</span>
        <span>⬆ Chaque nouveau niveau : 20 + 5 × le niveau (niveau 20 = 120 jetons)</span>
      </div>
      <button class="ghost" data-nav="challenges">Voir mes défis</button>
    </div>
    <section class="section">
      <div class="section-head"><div><h2>Thèmes</h2><div class="sub">${ownedCount} / ${s.themes.length} possédés · les thèmes achetés apparaissent aussi dans Paramètres → Apparence</div></div></div>
      <div class="shop-grid">${s.themes.map(card).join('')}</div>
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
  pad: I.pad, clock: I.clock, bolt: I.bolt, calendar: I.calendar, layers: I.layers, disk: I.disk, star: I.star, play: I.play,
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

/* Secret trophies ("???" until unlocked) and the ultimate trophy */
function specialCard(it) {
  const done = it.tier >= 1;
  const t = it.tiers[0];
  const cls = it.kind === 'ultimate' ? 'ultimate' : 'secret';
  return `<div class="a-card panel ${cls} ${done ? 'got' : 'locked'}">
    <div class="a-medal ${cls} ${done ? '' : 'locked'}">${done ? ACH_ICONS[it.icon] || I.trophy : '<b>?</b>'}</div>
    <div class="a-body">
      <div class="a-title"><b>${esc(it.name)}</b>${done ? `<span class="a-tag ${cls}">${esc(t.name)}</span>` : `<span class="a-tag dim">${it.kind === 'ultimate' ? 'Ultime' : 'Secret'}</span>`}</div>
      <div class="a-desc">${esc(t.desc)}</div>
      <div class="a-hint">${done ? `Débloqué le ${new Date(t.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${t.points} pts` : it.kind === 'ultimate' ? `${t.points} pts · le dernier trophée de Linkgeek` : `${t.points} pts · trophée caché`}</div>
    </div>
  </div>`;
}

function ultimateBadge(big = false) {
  return `<span class="ult-badge${big ? ' big' : ''}" title="Trophée « Linkgeek Ultime » : tous les trophées au rang maximum">${ACH_ICONS.gem}${big ? 'Ultime' : ''}</span>`;
}

function achCard(it) {
  if (it.kind) return specialCard(it);
  const done = it.tier >= 4;
  const next = it.tiers[Math.min(it.tier, 3)];
  const prevGoal = it.tier > 0 ? it.tiers[it.tier - 1].goal : 0;
  const pct = done ? 100 : Math.max(0, Math.min(100, ((it.value - prevGoal) / (next.goal - prevGoal)) * 100));
  const last = it.tier > 0 ? it.tiers[it.tier - 1] : null;
  return `<div class="a-card panel ${TIER_CLS[it.tier]}">
    ${medal(it)}
    <div class="a-body">
      <div class="a-title"><b>${esc(it.name)}</b>${it.tier ? `<span class="a-tag ${TIER_CLS[it.tier]}">${esc(last.name)}</span>` : ''}</div>
      <div class="a-desc">${done ? `Terminé : ${esc(last.desc.charAt(0).toLowerCase() + last.desc.slice(1))}` : `${it.tier ? 'Prochain palier : ' : ''}${esc(next.desc)}`}</div>
      ${it.hint && !done ? `<div class="a-hint">${esc(it.hint)}</div>` : ''}
      <div class="a-prog"><div class="a-bar"><i class="${TIER_CLS[Math.min(it.tier + 1, 4)]}" style="width:${pct.toFixed(1)}%"></i></div>
        <span>${done ? fmtAch(it.value, it.unit) : `${fmtAch(it.value, it.unit)} / ${fmtAch(next.goal, it.unit)}`}</span></div>
      <div class="a-pips">${it.tiers.map((t, i) => `<span class="a-pip ${i < it.tier ? TIER_CLS[i + 1] : ''}" title="${esc(`${t.name} · ${t.desc} · ${t.points} pts${t.at ? ` · obtenu le ${new Date(t.at).toLocaleDateString('fr-FR')}` : ''}`)}">${esc(t.name)}</span>`).join('')}</div>
    </div>
  </div>`;
}

function viewAchievements() {
  const a = state.ach;
  const head = (sub) => `<div class="page-head"><div><h1>Succès</h1><div class="sub">${sub}</div></div></div>`;
  if (!a) return `<div class="page">${head('Chargement…')}</div>`;
  const filters = [['all', 'Tous'], ['progress', 'En cours'], ['done', 'Terminés'], ['locked', 'Verrouillés']];
  const max = (it) => it.tiers.length;
  const items = a.items.filter((it) => !it.kind).filter((it) => state.achFilter === 'all' || (state.achFilter === 'done' ? it.tier >= max(it) : state.achFilter === 'locked' ? it.tier === 0 : it.tier > 0 && it.tier < max(it)))
    .sort((x, y) => (state.achFilter === 'all' ? 0 : y.tier - x.tier));
  const secrets = a.items.filter((it) => it.kind === 'secret');
  const ult = a.items.find((it) => it.kind === 'ultimate');
  const maxed = a.items.filter((it) => it.kind !== 'ultimate' && it.tier >= max(it)).length;
  const others = a.items.filter((it) => it.kind !== 'ultimate').length;
  const pct = Math.round((a.points / a.maxPoints) * 100);
  return `<div class="page">
    ${head(`${a.unlocked} / ${a.total} paliers débloqués`)}
    <div class="panel a-summary">
      <div class="a-level">${I.trophy}</div>
      <div class="a-score">
        <div class="a-score-top"><b>${a.points.toLocaleString('fr-FR')}</b><span>/ ${a.maxPoints.toLocaleString('fr-FR')} points de succès · ${pct} %</span></div>
        <div class="a-bar big"><i style="width:${pct}%"></i></div>
        <div class="a-legend">Bronze 10 pts · Argent 25 pts · Or 50 pts · Platine 100 pts</div>
      </div>
      <div class="a-counts">${['bronze', 'silver', 'gold', 'platinum'].map((c, i) => `
        <div class="a-count"><div class="a-medal sm ${c}">${I.trophy}</div><b>${a.counts[i]}</b><span>${['Bronze', 'Argent', 'Or', 'Platine'][i]}</span></div>`).join('')}</div>
    </div>
    ${ult ? `<div class="panel a-ultimate ${ult.tier ? 'got' : ''}">
      <div class="a-medal ultimate ${ult.tier ? '' : 'locked'}">${ACH_ICONS.gem}</div>
      <div class="a-ult-body">
        <small>Le trophée ultime</small>
        <b>${esc(ult.name)}</b>
        <span>${ult.tier ? `Débloqué le ${new Date(ult.tiers[0].at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} : le badge Ultime brille sur ton profil.` : 'Débloque tous les autres trophées au rang maximum, secrets compris. Récompense : un badge spécial sur ton profil.'}</span>
        <div class="a-prog"><div class="a-bar"><i class="ultimate" style="width:${Math.round((maxed / others) * 100)}%"></i></div><span>${maxed} / ${others} trophées au rang maximum</span></div>
      </div>
      <span class="a-ult-pts">${ult.tiers[0].points} pts</span>
    </div>` : ''}
    <div class="a-filters">${filters.map(([k, l]) => `<button class="${state.achFilter === k ? 'active' : ''}" data-ach-filter="${k}">${l}</button>`).join('')}</div>
    ${items.length ? `<div class="a-grid">${items.map(achCard).join('')}</div>` : '<div class="empty"><b>Rien ici pour l\'instant</b>Continue de jouer !</div>'}
    ${secrets.length ? `<section class="section">
      <div class="section-head"><div><h2>Trophées secrets</h2><div class="sub">${a.secrets.found} / ${a.secrets.total} découverts · ils se révèlent quand tu les débloques</div></div></div>
      <div class="a-grid">${secrets.map(specialCard).join('')}</div>
    </section>` : ''}
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
    t.className = `toast ach ${u.kind || TIER_CLS[u.tier]}`;
    const label = u.kind === 'secret' ? 'Trophée secret découvert !' : u.kind === 'ultimate' ? 'TROPHÉE ULTIME DÉBLOQUÉ !' : `Succès ${esc(u.tierName)} débloqué`;
    t.innerHTML = `<span class="a-emoji">${u.kind === 'secret' ? '🕵️' : u.kind === 'ultimate' ? '👑' : TIER_EMOJI[u.tier]}</span><div><small>${label}</small><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></div>`;
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
  return `<div class="tp" style="background:${c.bg}">
    <div class="tp-glow" style="background:${c.glow}"></div>
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
        ${firebaseDetails(s)}`;
    }
    const ready = s.google.configured;
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
      ${ready ? '' : '<p class="set-warn">Pour activer la connexion Google, Linkgeek a besoin d\'un identifiant client OAuth (gratuit). Suis les étapes ci-dessous, une seule fois.</p>'}
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
      ${firebaseDetails(s)}`;
  }
  if (tab === 'general') {
    return `<h2>Général</h2><p class="set-desc">Comportement de Linkgeek sur ton PC.</p>
      <div class="set-list">
        ${toggle('startup', s.startup, 'Lancer Linkgeek au démarrage de Windows', 'Démarre discrètement dans la zone de notification pour suivre ton temps de jeu en continu.')}
        ${toggle('closeToTray', s.closeToTray, 'Réduire dans la zone de notification à la fermeture', 'La croix cache la fenêtre au lieu de quitter. Désactivé : fermer quitte Linkgeek (le suivi s\'arrête).')}
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
  const num = (sel) => { const v = Number($(sel).value); return Number.isFinite(v) ? v : NaN; };
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
  const tabs = s.admin && s.admin.isAdmin ? [...SETTINGS_TABS, ['admin', 'Admin', CROWN]] : SETTINGS_TABS;
  if (state.settingsTab === 'admin' && !(s.admin && s.admin.isAdmin)) state.settingsTab = 'appearance';
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
  if (view === 'home') { loadRecentNews(); loadReco(); }
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

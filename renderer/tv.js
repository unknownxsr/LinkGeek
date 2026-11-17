/* Linkgeek — mode TV / manette.
 * A big full-screen interface you drive with a controller (or the arrows + Entrée), like a console:
 * Accueil (hero + rows), Bibliothèque (grid), Amis (invite to play), a page per game, a menu.
 * Loaded after app.js: uses its state and helpers (state, esc, coverHtml, heroSrc, launch, reload…).
 *
 * Controller (standard mapping): stick / croix = move · A = choisir · B = retour · X = jouer ·
 * Y = favori · LB / RB = onglets · ☰ (Menu) = menu. Outside mode TV, ☰ opens it (Paramètres → Général).
 */
const TV = {
  on: false,
  tab: 'home', // home | library | friends
  game: null, // id of the game page shown, or null
  overlay: null, // { kind: 'menu' } | { kind: 'friend', uid } | { kind: 'pick', uid }
  filter: 'all', // library filter
  keys: {}, // tab -> last focused key (to come back to the same place)
  lastMove: 0,
};
const TV_TABS = [['home', 'Accueil'], ['library', 'Bibliothèque'], ['friends', 'Amis']];
const TV_FOCUSABLE = 'button:not([disabled]), [data-tv-f], input, select, textarea, a[href]';
const tvRoot = () => document.getElementById('tv-root');

/* ---------------- small sounds (Web Audio, very quiet) ---------------- */
let tvAudio = null;
function tvBeep(kind) {
  try {
    tvAudio = tvAudio || new AudioContext();
    const t = tvAudio.currentTime;
    const o = tvAudio.createOscillator(), g = tvAudio.createGain();
    const f = { move: [660, 0.035, 0.025], ok: [880, 0.07, 0.05], back: [420, 0.06, 0.04], tab: [740, 0.05, 0.035] }[kind] || [600, 0.04, 0.03];
    o.type = 'sine'; o.frequency.setValueAtTime(f[0], t);
    if (kind === 'ok') o.frequency.exponentialRampToValueAtTime(f[0] * 1.5, t + f[1]);
    g.gain.setValueAtTime(f[2], t); g.gain.exponentialRampToValueAtTime(0.0001, t + f[1] + 0.05);
    o.connect(g).connect(tvAudio.destination); o.start(t); o.stop(t + f[1] + 0.06);
  } catch { /* no sound */ }
}

/* ---------------- enter / leave ---------------- */
function tvEnter() {
  if (TV.on) return;
  TV.on = true; TV.tab = 'home'; TV.game = null; TV.overlay = null;
  document.body.classList.add('tv-on');
  const r = tvRoot(); r.hidden = false;
  api.setTvMode(true).catch(() => {});
  tvRender();
  tvBeep('ok');
}
function tvExit() {
  if (!TV.on) return;
  TV.on = false; TV.overlay = null;
  document.body.classList.remove('tv-on');
  const r = tvRoot(); r.hidden = true; r.innerHTML = '';
  api.setTvMode(false).catch(() => {});
  tvBeep('back');
  render(true);
}

/* ---------------- pieces ---------------- */
const tvGames = () => visibleGames();
const tvRecent = () => tvGames().filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed);
function tvMeta(g) {
  const bits = [];
  if (state.running.has(g.id)) bits.push('<span class="tv-live">● En cours</span>');
  else if (g.lastPlayed) bits.push(esc(fmtAgo(g.lastPlayed)));
  if (g.playtimeSec) bits.push(esc(fmtTime(g.playtimeSec)) + ' de jeu');
  if (SOURCES[g.source]) bits.push(esc(SOURCES[g.source].label));
  return bits.join('<i>·</i>');
}
function tvTile(g, row, wide = false) {
  const running = state.running.has(g.id);
  const art = wide
    ? `<div class="tv-wide-art" style="background-image:url('${esc(heroSrc(g) || '')}')">${heroSrc(g) ? '' : placeholder(g, true)}</div>`
    : coverHtml(g);
  return `<button class="tv-tile ${wide ? 'wide' : ''}" data-tv-game="${esc(g.id)}" data-tv-key="${esc(row)}:${esc(g.id)}">
    ${art}
    ${running ? '<span class="tv-badge live">● En cours</span>' : g.favorite ? '<span class="tv-badge fav">★</span>' : ''}
    <span class="tv-tile-name">${esc(g.name)}</span>
  </button>`;
}
function tvRow(title, list, key, wide = false) {
  if (!list.length) return '';
  return `<section class="tv-row"><h2>${esc(title)}</h2><div class="tv-strip">${list.map((g) => tvTile(g, key, wide)).join('')}</div></section>`;
}
function tvHeroHtml(g) {
  if (!g) return '<div class="tv-hero"><div class="tv-hero-txt"><h1>Bienvenue sur Linkgeek</h1><p>Ajoute des jeux depuis le mode bureau pour les retrouver ici.</p></div></div>';
  const bg = heroSrc(g);
  return `<div class="tv-hero" data-hero="${esc(g.id)}">
    <div class="tv-hero-bg" style="${bg ? `background-image:url('${esc(bg)}')` : `background:linear-gradient(135deg, hsl(${hue(g.name)} 50% 30%), hsl(${(hue(g.name) + 60) % 360} 55% 12%))`}"></div>
    <div class="tv-hero-txt"><h1>${esc(g.name)}</h1><p>${tvMeta(g)}</p></div>
  </div>`;
}

/* ---------------- screens ---------------- */
function tvHome() {
  const games = tvGames();
  const recent = tvRecent();
  const focusId = (TV.keys.home || '').split(':')[1];
  const heroGame = byId(focusId) || recent[0] || games[0];
  const fav = games.filter((g) => g.favorite).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  const most = [...games].filter((g) => g.playtimeSec > 0).sort((a, b) => b.playtimeSec - a.playtimeSec);
  const added = [...games].filter((g) => g.addedAt).sort((a, b) => b.addedAt - a.addedAt);
  return `${tvHeroHtml(heroGame)}
    <div class="tv-rows">
      ${tvRow('Reprendre', recent.slice(0, 10), 'recent', true)}
      ${tvRow('Favoris', fav.slice(0, 20), 'fav')}
      ${tvRow('Les plus joués', most.slice(0, 20), 'most')}
      ${tvRow('Ajoutés récemment', added.slice(0, 20), 'added')}
      ${!recent.length && !fav.length ? tvRow('Tous mes jeux', [...games].sort((a, b) => a.name.localeCompare(b.name, 'fr')).slice(0, 30), 'all') : ''}
    </div>`;
}
function tvLibrary() {
  const all = tvGames();
  const sources = Object.keys(SOURCES).filter((s) => all.some((g) => g.source === s));
  const filters = [['all', 'Tous'], ['fav', 'Favoris'], ...sources.map((s) => [s, SOURCES[s].label])];
  if (!filters.some(([k]) => k === TV.filter)) TV.filter = 'all';
  const list = all.filter((g) => TV.filter === 'all' || (TV.filter === 'fav' ? g.favorite : g.source === TV.filter))
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.name.localeCompare(b.name, 'fr'));
  return `<div class="tv-page">
    <div class="tv-chips">${filters.map(([k, l]) => `<button class="tv-chip ${TV.filter === k ? 'on' : ''}" data-tv-filter="${esc(k)}" data-tv-key="f:${esc(k)}">${esc(l)}</button>`).join('')}<span class="tv-count">${list.length} jeu${list.length > 1 ? 'x' : ''}</span></div>
    ${list.length ? `<div class="tv-grid">${list.map((g) => tvTile(g, 'lib')).join('')}</div>` : '<div class="tv-empty">Aucun jeu ici</div>'}
  </div>`;
}
function tvFriends() {
  const fr = state.friends || {};
  if (!fr.signedIn) return '<div class="tv-page"><div class="tv-empty"><b>Connecte-toi pour retrouver tes amis</b><span>La connexion se fait depuis le mode bureau (Amis).</span><button class="tv-btn" data-tv-exit>Passer en mode bureau</button></div></div>';
  const order = { playing: 0, online: 1, away: 2, offline: 3 };
  const list = [...(fr.friends || [])].sort((a, b) => order[friendState(a)] - order[friendState(b)] || a.name.localeCompare(b.name, 'fr'));
  if (!list.length) return `<div class="tv-page"><div class="tv-empty"><b>Pas encore d'amis</b><span>Ton code ami : ${esc(fr.code || '—')}</span></div></div>`;
  const on = list.filter((f) => friendState(f) !== 'offline').length;
  return `<div class="tv-page">
    <div class="tv-chips"><span class="tv-count">${on} en ligne · ${list.length} ami${list.length > 1 ? 's' : ''}</span></div>
    <div class="tv-fgrid">${list.map((f) => {
      const s = friendState(f);
      const line = s === 'playing' ? `Joue à <b>${esc(f.game.name)}</b>` : s === 'offline' ? (f.lastSeen ? 'Vu ' + esc(fmtAgo(f.lastSeen).toLowerCase()) : 'Hors ligne') : esc(STATUS[s].label);
      return `<button class="tv-friend ${STATUS[s].cls}" data-tv-friend="${esc(f.uid)}" data-tv-key="fr:${esc(f.uid)}">
        ${s === 'playing' && f.game.cover ? `<span class="tv-fbg" style="background-image:url('${esc(f.game.cover)}')"></span>` : ''}
        ${friendAvatar(f)}
        <span class="tv-fi"><b>${esc(f.name)}</b><small class="${STATUS[s].cls}">${line}</small></span>
      </button>`;
    }).join('')}</div>
  </div>`;
}
function tvGamePage(g) {
  const running = state.running.has(g.id);
  const bg = heroSrc(g);
  const friendsOn = ((state.friends && state.friends.friends) || []).filter((f) => friendState(f) !== 'offline').length;
  return `<div class="tv-game">
    <div class="tv-hero-bg big" style="${bg ? `background-image:url('${esc(bg)}')` : `background:linear-gradient(135deg, hsl(${hue(g.name)} 50% 30%), hsl(${(hue(g.name) + 60) % 360} 55% 12%))`}"></div>
    <div class="tv-game-body">
      <div class="tv-game-cover">${coverHtml(g)}</div>
      <div class="tv-game-info">
        <h1>${esc(g.name)}</h1>
        <p class="tv-game-meta">${tvMeta(g)}</p>
        <div class="tv-actions">
          ${running ? '<button class="tv-btn play running" data-tv-key="g:play" disabled>● En cours</button>' : `<button class="tv-btn play" data-tv-play="${esc(g.id)}" data-tv-key="g:play">${I.play}Jouer</button>`}
          <button class="tv-btn" data-tv-fav="${esc(g.id)}" data-tv-key="g:fav">${I.star}${g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
          ${state.friends && state.friends.signedIn ? `<button class="tv-btn" data-tv-invite-game="${esc(g.id)}" data-tv-key="g:inv">👥 Inviter un ami${friendsOn ? ` (${friendsOn} en ligne)` : ''}</button>` : ''}
          <button class="tv-btn ghost" data-tv-back data-tv-key="g:back">Retour</button>
        </div>
        <div class="tv-facts">
          <div><span>Temps de jeu</span><b>${esc(fmtTime(g.playtimeSec))}</b></div>
          <div><span>Dernière partie</span><b>${esc(fmtAgo(g.lastPlayed))}</b></div>
          ${g.sizeBytes ? `<div><span>Taille</span><b>${esc(fmtSize(g.sizeBytes))}</b></div>` : ''}
          ${SOURCES[g.source] ? `<div><span>Plateforme</span><b>${esc(SOURCES[g.source].label)}</b></div>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- overlays (menu, friend, game picker) ---------------- */
function tvOverlay() {
  const o = TV.overlay;
  if (!o) return '';
  let body = '';
  if (o.kind === 'menu') {
    body = `<h2>Menu</h2>
      <button class="tv-mi" data-tv-close data-tv-key="m:resume">▶ Reprendre</button>
      <button class="tv-mi" data-tv-rescan data-tv-key="m:rescan">⟳ Rescanner mes jeux</button>
      <button class="tv-mi" data-tv-exit data-tv-key="m:exit">🖥️ Passer en mode bureau</button>`;
  } else if (o.kind === 'friend') {
    const f = ((state.friends && state.friends.friends) || []).find((x) => x.uid === o.uid);
    if (!f) { TV.overlay = null; return ''; }
    const s = friendState(f);
    const playing = s === 'playing' && f.game ? tvGames().find((g) => gameKeyOf(g.name) === gameKeyOf(f.game.name)) : null;
    body = `<div class="tv-ov-who">${friendAvatar(f)}<div><h2>${esc(f.name)}</h2><small class="${STATUS[s].cls}">${s === 'playing' ? `Joue à ${esc(f.game.name)}` : esc(STATUS[s].label)}</small></div></div>
      ${playing ? `<button class="tv-mi" data-tv-play="${esc(playing.id)}" data-tv-key="o:join">🎮 Lancer ${esc(playing.name)} aussi</button>` : ''}
      <button class="tv-mi" data-tv-pick="${esc(f.uid)}" data-tv-key="o:inv">👥 Inviter à jouer…</button>
      <button class="tv-mi" data-tv-close data-tv-key="o:close">Fermer</button>`;
  } else if (o.kind === 'pick') {
    // choose the game for the invite (o.uid) — or the friend for a game (o.gameId)
    if (o.gameId) {
      const list = ((state.friends && state.friends.friends) || []).filter((f) => friendState(f) !== 'offline');
      body = `<h2>Inviter un ami</h2><div class="tv-ov-list">${list.length ? list.map((f) => `<button class="tv-mi" data-tv-send-invite="${esc(f.uid)}" data-game="${esc(o.gameId)}" data-tv-key="p:${esc(f.uid)}">${friendAvatar(f, 'sm')}<span>${esc(f.name)}</span></button>`).join('') : '<p class="tv-ov-note">Aucun ami en ligne pour l\'instant.</p>'}</div>
        <button class="tv-mi" data-tv-close data-tv-key="p:close">Annuler</button>`;
    } else {
      const list = (tvRecent().length ? tvRecent() : tvGames()).slice(0, 12);
      body = `<h2>À quel jeu ?</h2><div class="tv-ov-list">${list.map((g) => `<button class="tv-mi" data-tv-send-invite="${esc(o.uid)}" data-game="${esc(g.id)}" data-tv-key="p:${esc(g.id)}">${coverHtml(g, 'thumb')}<span>${esc(g.name)}</span></button>`).join('')}</div>
        <button class="tv-mi" data-tv-close data-tv-key="p:close">Annuler</button>`;
    }
  }
  return `<div class="tv-ov"><div class="tv-ov-panel">${body}</div></div>`;
}
const gameKeyOf = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

/* ---------------- render ---------------- */
const TV_PAD_ICONS = { a: '<i class="pb a">A</i>', b: '<i class="pb b">B</i>', x: '<i class="pb x">X</i>', y: '<i class="pb y">Y</i>', lb: '<i class="pb sh">LB</i>', rb: '<i class="pb sh">RB</i>', menu: '<i class="pb m">☰</i>' };
function tvLegend() {
  const onGame = !!TV.game || (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tvGame);
  return `<div class="tv-legend">
    <span>${TV_PAD_ICONS.a}Choisir</span><span>${TV_PAD_ICONS.b}Retour</span>
    ${onGame ? `<span>${TV_PAD_ICONS.x}Jouer</span><span>${TV_PAD_ICONS.y}Favori</span>` : ''}
    <span>${TV_PAD_ICONS.lb}${TV_PAD_ICONS.rb}Onglets</span><span>${TV_PAD_ICONS.menu}Menu</span>
  </div>`;
}
function tvClock() {
  return new Date().toLocaleTimeString(typeof linkgeekLocale === 'function' ? linkgeekLocale() : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function tvRender() {
  if (!TV.on) return;
  const root = tvRoot();
  const prevKey = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset.tvKey : null;
  const scrolls = [...root.querySelectorAll('.tv-strip, .tv-main, .tv-rows')].map((el) => el.scrollLeft + ',' + el.scrollTop);
  const g = TV.game && byId(TV.game);
  if (TV.game && !g) TV.game = null;
  const p = state.profile;
  const content = g ? tvGamePage(g) : TV.tab === 'library' ? tvLibrary() : TV.tab === 'friends' ? tvFriends() : tvHome();
  root.innerHTML = `<div class="tv-shell ${g ? 'on-game' : ''} tab-${TV.tab}">
    <header class="tv-top">
      <div class="tv-brand"><img src="../assets/icon.png" alt=""><b>Linkgeek</b></div>
      <nav class="tv-tabs">${TV_PAD_ICONS.lb}${TV_TABS.map(([k, l]) => `<button class="tv-tab ${!g && TV.tab === k ? 'on' : ''}" data-tv-tab="${k}" data-tv-key="t:${k}">${esc(l)}${k === 'friends' && state.friends && state.friends.friends ? `<em>${state.friends.friends.filter((f) => friendState(f) !== 'offline').length || ''}</em>` : ''}</button>`).join('')}${TV_PAD_ICONS.rb}</nav>
      <div class="tv-me">
        ${state.shop ? `<span class="tv-coins">${COIN}${fmtCoins(state.shop.coins)}</span>` : ''}
        <span class="tv-clock">${tvClock()}</span>
        ${avatarHtml('avatar')}<b>${esc(p && p.name ? p.name : 'Joueur')}</b>
        <button class="tv-desk" data-tv-exit data-tv-key="t:desk" title="Revenir au mode bureau" aria-label="Revenir au mode bureau"><svg viewBox="0 0 24 24"><path d="M4.5 4h15A2.5 2.5 0 0 1 22 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 14.5v-8A2.5 2.5 0 0 1 4.5 4z"/><path d="M8 20.5h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg></button>
      </div>
    </header>
    <main class="tv-main ${!g && TV.tab === 'home' ? 'home' : ''}">${content}</main>
    ${tvLegend()}
    ${tvOverlay()}
  </div>`;
  // same screen re-drawn: keep the scroll positions
  if (TV.lastScreen === tvScreenId()) {
    const newScrolls = [...root.querySelectorAll('.tv-strip, .tv-main, .tv-rows')];
    newScrolls.forEach((el, i) => { if (scrolls[i]) { const [l, t] = scrolls[i].split(','); el.scrollLeft = +l; el.scrollTop = +t; } });
  }
  TV.lastScreen = tvScreenId();
  // focus: the overlay first, then the same place, then the remembered one, then the first thing of the page
  const scope = tvScope();
  const find = (k) => k && scope.querySelector(`[data-tv-key="${CSS.escape(k)}"]`);
  const el = TV.overlay ? tvFirst(scope) : find(prevKey) || find(TV.game ? 'g:play' : TV.keys[TV.tab]) || tvFirst(scope);
  if (el) tvFocus(el, true);
}
const tvScreenId = () => (TV.game ? 'g:' + TV.game : 't:' + TV.tab);
function tvFirst(scope) {
  if (scope === tvRoot()) {
    return scope.querySelector('.tv-main [data-tv-game], .tv-main [data-tv-friend], .tv-main .tv-btn:not([disabled]), .tv-main button') || scope.querySelector('.tv-tab.on');
  }
  return [...scope.querySelectorAll(TV_FOCUSABLE)].find(tvVisible) || null;
}
const tvVisible = (el) => !!(el.offsetWidth || el.offsetHeight) && !el.closest('[hidden]');

/* ---------------- focus + spatial navigation ---------------- */
function tvScope() {
  const m = document.getElementById('modal-root');
  if (m && m.children.length) return m;
  const ov = tvRoot().querySelector('.tv-ov');
  return ov || tvRoot();
}
// the focus ring is a class (:focus is not drawn while the window is in the background)
function tvMark(el) {
  document.querySelectorAll('.tv-f').forEach((x) => { if (x !== el) x.classList.remove('tv-f'); });
  if (el) el.classList.add('tv-f');
}
function tvFocus(el, instant = false) {
  if (!el) return;
  el.focus({ preventScroll: true });
  tvMark(el);
  tvOnFocus(el);
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: instant ? 'auto' : 'smooth' });
  // rows: keep the focused tile a bit away from the edge
  const strip = el.closest('.tv-strip');
  if (strip) {
    const r = el.getBoundingClientRect(), s = strip.getBoundingClientRect();
    const pad = s.width * 0.08;
    if (r.left < s.left + pad) strip.scrollBy({ left: r.left - s.left - pad, behavior: instant ? 'auto' : 'smooth' });
    else if (r.right > s.right - pad) strip.scrollBy({ left: r.right - s.right + pad, behavior: instant ? 'auto' : 'smooth' });
  }
  const row = el.closest('.tv-row');
  const rows = el.closest('.tv-rows');
  if (row && rows) {
    // Accueil: the row of the focused tile goes to the top, right under the hero
    const rr = row.getBoundingClientRect(), mr = rows.getBoundingClientRect();
    rows.scrollBy({ top: rr.top - mr.top, behavior: instant ? 'auto' : 'smooth' });
  }
}
function tvMove(dir) {
  const scope = tvScope();
  const items = [...scope.querySelectorAll(TV_FOCUSABLE)].filter(tvVisible);
  const cur = scope.contains(document.activeElement) && document.activeElement !== scope ? document.activeElement : null;
  if (!cur) { const f = tvFirst(scope); if (f) tvFocus(f); return; }
  const a = cur.getBoundingClientRect();
  const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    let primary, ortho;
    if (dir === 'left' || dir === 'right') {
      primary = dir === 'right' ? r.left - a.right : a.left - r.right;
      if ((dir === 'right' ? c.x - ac.x : ac.x - c.x) <= 2) continue;
      const overlap = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
      ortho = overlap > Math.min(a.height, r.height) * 0.3 ? 0 : Math.abs(c.y - ac.y) * 3 + 400;
    } else {
      primary = dir === 'down' ? r.top - a.bottom : a.top - r.bottom;
      if ((dir === 'down' ? c.y - ac.y : ac.y - c.y) <= 2) continue;
      ortho = Math.abs(c.x - ac.x) * 0.9;
    }
    const score = Math.max(-20, primary) + ortho;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { tvFocus(best); tvBeep('move'); }
}

/* ---------------- actions ---------------- */
function tvSwitchTab(step) {
  if (TV.overlay) return;
  const i = TV_TABS.findIndex(([k]) => k === TV.tab);
  TV.tab = TV_TABS[(i + step + TV_TABS.length) % TV_TABS.length][0];
  TV.game = null;
  tvBeep('tab');
  tvRender();
}
function tvBack() {
  const m = document.getElementById('modal-root');
  if (m && m.children.length) {
    const close = m.querySelector('[data-m="cancel"], .cv-x, [data-booster-close], [data-soc-close], .modal-x');
    if (close) close.click(); else { const bg = m.querySelector('.modal-bg'); if (bg) bg.click(); else m.innerHTML = ''; }
    if (m.children.length) m.innerHTML = '';
    tvBeep('back');
    return setTimeout(() => { if (TV.on) { const f = tvFirst(tvScope()); if (f && !tvRoot().contains(document.activeElement)) tvFocus(f, true); } }, 30);
  }
  if (TV.overlay) { TV.overlay = null; tvBeep('back'); return tvRender(); }
  if (TV.game) { TV.game = null; tvBeep('back'); return tvRender(); }
  if (TV.tab !== 'home') { TV.tab = 'home'; tvBeep('back'); return tvRender(); }
  TV.overlay = { kind: 'menu' }; tvRender();
}
async function tvToggleFav(id) {
  try { await api.toggleFavorite(id); await reload(); } catch (e) { return toast(errMsg(e), true); }
  const g = byId(id);
  toast(g && g.favorite ? '★ Ajouté aux favoris' : 'Retiré des favoris');
  tvRender();
}
function tvPlay(id) {
  const g = byId(id);
  if (!g) return;
  if (state.running.has(id)) return toast(`${g.name} est déjà en cours`);
  tvBeep('ok');
  launch(id);
}
function tvFocusedGame() {
  const el = document.activeElement;
  if (el && el.dataset && el.dataset.tvGame) return el.dataset.tvGame;
  return TV.game;
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('#tv-btn')) { if (TV.on) tvExit(); else tvEnter(); return; }
  if (e.target.closest('[data-tv-enter]')) { tvEnter(); return; }
  if (!TV.on || !e.target.closest('#tv-root')) return;
  const t = e.target.closest('[data-tv-tab],[data-tv-game],[data-tv-filter],[data-tv-friend],[data-tv-play],[data-tv-fav],[data-tv-back],[data-tv-close],[data-tv-exit],[data-tv-rescan],[data-tv-pick],[data-tv-invite-game],[data-tv-send-invite]');
  if (!t) { if (e.target.classList.contains('tv-ov')) { TV.overlay = null; tvRender(); } return; }
  const d = t.dataset;
  if (d.tvTab) { TV.tab = d.tvTab; TV.game = null; TV.overlay = null; tvBeep('tab'); return tvRender(); }
  if (d.tvGame) { TV.keys[TV.tab] = d.tvKey; TV.game = d.tvGame; tvBeep('ok'); return tvRender(); }
  if (d.tvFilter) { TV.filter = d.tvFilter; TV.keys.library = d.tvKey; tvBeep('ok'); return tvRender(); }
  if (d.tvFriend) { TV.keys.friends = d.tvKey; TV.overlay = { kind: 'friend', uid: d.tvFriend }; tvBeep('ok'); return tvRender(); }
  if (d.tvPlay) { TV.overlay = null; tvPlay(d.tvPlay); return tvRender(); }
  if (d.tvFav) return tvToggleFav(d.tvFav);
  if (d.tvBack !== undefined) return tvBack();
  if (d.tvClose !== undefined) { TV.overlay = null; tvBeep('back'); return tvRender(); }
  if (d.tvExit !== undefined) return tvExit();
  if (d.tvRescan !== undefined) {
    TV.overlay = null; tvRender(); toast('Recherche de nouveaux jeux…');
    try { await api.rescan(); await reload(); tvRender(); toast('Bibliothèque à jour'); } catch (err) { toast(errMsg(err), true); }
    return;
  }
  if (d.tvPick) { TV.overlay = { kind: 'pick', uid: d.tvPick }; tvBeep('ok'); return tvRender(); }
  if (d.tvInviteGame) { TV.overlay = { kind: 'pick', gameId: d.tvInviteGame }; tvBeep('ok'); return tvRender(); }
  if (d.tvSendInvite) {
    try { const r = await api.inviteFriend(d.tvSendInvite, d.game); toast(`🎮 Invitation envoyée à ${r.to} pour ${r.game}`); } catch (err) { toast(errMsg(err), true); }
    TV.overlay = null; tvBeep('ok'); return tvRender();
  }
});
// the hero of Accueil follows the focused game; the legend shows X / Y on a game
function tvOnFocus(el) {
  if (!TV.on || !el || !el.closest || !el.closest('#tv-root')) return;
  if (el.dataset.tvKey && !TV.overlay && !TV.game) TV.keys[TV.tab] = el.dataset.tvKey;
  const leg = tvRoot().querySelector('.tv-legend');
  if (leg) leg.outerHTML = tvLegend();
  if (!TV.game && TV.tab === 'home' && el.dataset.tvGame) {
    const hero = tvRoot().querySelector('.tv-hero');
    if (hero && hero.dataset.hero !== el.dataset.tvGame) {
      clearTimeout(TV.heroT);
      TV.heroT = setTimeout(() => {
        const g = byId(el.dataset.tvGame);
        const h = tvRoot().querySelector('.tv-hero');
        if (!g || !h) return;
        const tmp = document.createElement('div'); tmp.innerHTML = tvHeroHtml(g);
        const nh = tmp.firstElementChild; nh.classList.add('swap');
        h.replaceWith(nh);
      }, 140);
    }
  }
}
document.addEventListener('focusin', (e) => tvOnFocus(e.target));
// the mouse still works: hovering a tile focuses it
document.addEventListener('mousemove', (e) => {
  if (!TV.on) return;
  const el = e.target.closest && e.target.closest('#tv-root button');
  if (el && el !== document.activeElement && tvScope().contains(el)) { el.focus({ preventScroll: true }); tvMark(el); tvOnFocus(el); }
});

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown', (e) => {
  if (!TV.on) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key;
  const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (dirs[k]) { e.preventDefault(); e.stopPropagation(); return tvMove(dirs[k]); }
  if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); e.stopPropagation(); return tvBack(); }
  if (k === 'Enter' || k === ' ') {
    e.preventDefault(); e.stopPropagation();
    const el = document.activeElement;
    if (el && el !== document.body && tvScope().contains(el)) { if (!el.closest('#tv-root')) tvBeep('ok'); el.click(); }
    return;
  }
  if (k === 'PageUp' || k === 'q' || k === 'Q') { e.preventDefault(); return tvSwitchTab(-1); }
  if (k === 'PageDown' || k === 'e' || k === 'E') { e.preventDefault(); return tvSwitchTab(1); }
  if (k === 'f' || k === 'F') { const id = tvFocusedGame(); if (id) tvToggleFav(id); return; }
  if (k === 'm' || k === 'M' || k === 'ContextMenu') { e.preventDefault(); TV.overlay = TV.overlay ? null : { kind: 'menu' }; return tvRender(); }
  if (k === 'F11') { e.preventDefault(); return tvExit(); }
}, true);

/* ---------------- controller (Gamepad API, standard mapping) ---------------- */
const PAD = { raf: 0, held: {}, next: {}, hinted: false };
const PAD_DIRS = ['up', 'down', 'left', 'right'];
function padRead() {
  const st = {};
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  for (const p of pads) {
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = (i) => p.axes[i] || 0;
    st.up = st.up || b(12) || ax(1) < -0.55;
    st.down = st.down || b(13) || ax(1) > 0.55;
    st.left = st.left || b(14) || ax(0) < -0.55;
    st.right = st.right || b(15) || ax(0) > 0.55;
    st.a = st.a || b(0); st.b = st.b || b(1); st.x = st.x || b(2); st.y = st.y || b(3);
    st.lb = st.lb || b(4); st.rb = st.rb || b(5); st.view = st.view || b(8); st.menu = st.menu || b(9); st.guide = st.guide || b(16);
    st.rsUp = st.rsUp || ax(3) < -0.5; st.rsDown = st.rsDown || ax(3) > 0.5;
  }
  return { st, count: pads.length };
}
function padPress(k) {
  if (!TV.on) {
    // outside mode TV: ☰ (or the Xbox button) opens it
    if ((k === 'menu' || k === 'guide') && !(state.settings && state.settings.tvPad === false)) tvEnter();
    return;
  }
  if (PAD_DIRS.includes(k)) return tvMove(k);
  if (k === 'a') {
    const el = document.activeElement;
    if (el && el !== document.body && tvScope().contains(el)) { if (!el.closest('#tv-root')) tvBeep('ok'); el.click(); } else { const f = tvFirst(tvScope()); if (f) tvFocus(f); }
    return;
  }
  if (k === 'b') return tvBack();
  if (k === 'x') { const id = tvFocusedGame(); if (id && !TV.overlay) { tvPlay(id); tvRender(); } return; }
  if (k === 'y') { const id = tvFocusedGame(); if (id && !TV.overlay) tvToggleFav(id); return; }
  if (k === 'lb') return tvSwitchTab(-1);
  if (k === 'rb') return tvSwitchTab(1);
  if (k === 'menu' || k === 'guide' || k === 'view') { TV.overlay = TV.overlay && TV.overlay.kind === 'menu' ? null : { kind: 'menu' }; tvBeep('ok'); return tvRender(); }
}
function padLoop(t) {
  const { st, count } = padRead();
  if (!count) { PAD.raf = 0; PAD.held = {}; return; }
  // only when Linkgeek is the window in front (never while a game is played)
  if (document.hasFocus() && !document.hidden) {
    for (const k of Object.keys(st)) {
      const on = st[k];
      if (on && !PAD.held[k]) {
        PAD.held[k] = true; PAD.next[k] = t + 380;
        if (k === 'rsUp' || k === 'rsDown') continue;
        padPress(k);
      } else if (on && (PAD_DIRS.includes(k) || k === 'rsUp' || k === 'rsDown') && t >= PAD.next[k]) {
        PAD.next[k] = t + (k.startsWith('rs') ? 30 : 110);
        if (k.startsWith('rs')) { if (TV.on) { const m = tvRoot().querySelector('.tv-main'); if (m) m.scrollBy({ top: k === 'rsUp' ? -40 : 40 }); } } else padPress(k);
      } else if (!on) PAD.held[k] = false;
    }
  } else {
    // buttons held while the window was in the background must be released first
    for (const k of Object.keys(st)) PAD.held[k] = st[k];
  }
  PAD.raf = requestAnimationFrame(padLoop);
}
function padStart() { if (!PAD.raf) PAD.raf = requestAnimationFrame(padLoop); }
window.addEventListener('gamepadconnected', () => {
  padStart();
  if (!TV.on && !PAD.hinted && !(state.settings && state.settings.tvPad === false)) {
    PAD.hinted = true;
    toast('🎮 Manette détectée : appuie sur ☰ (Menu) pour passer en mode TV');
  }
});
padStart();

/* ---------------- keep in sync with the rest of the app ---------------- */
{
  const appRender = render;
  // eslint-disable-next-line no-global-assign
  render = function tvAwareRender(...a) {
    const r = appRender.apply(this, a);
    if (TV.on) { clearTimeout(TV.syncT); TV.syncT = setTimeout(() => { if (TV.on && !TV.overlay) tvRender(); }, 180); }
    return r;
  };
}
setInterval(() => { if (TV.on) { const c = tvRoot().querySelector('.tv-clock'); if (c) c.textContent = tvClock(); } }, 15000);
api.onTvMode((on) => { if (on) tvEnter(); else tvExit(); });
// « Ouvrir Linkgeek en mode TV » (Paramètres → Général): as soon as the window is shown
{
  let tried = false;
  const tryStart = () => {
    if (tried || !state.settings || document.visibilityState !== 'visible') return;
    tried = true;
    if (state.settings.tvStart) tvEnter();
  };
  const t = setInterval(() => { if (state.settings) { clearInterval(t); tryStart(); } }, 250);
  document.addEventListener('visibilitychange', tryStart);
}

/* ---------------- Social (src/social.js) ----------------
 * Invites to play, Duels de la semaine, « Recherche un coéquipier », Contact, Partager,
 * parrainage. Loaded before app.js: these functions use its helpers (state, esc, toast,
 * render, friendAvatar…) only when they run. */

const SOC_EMPTY = { invites: [], duels: [], lfg: [], myLfg: null, duelStakes: [10, 25, 50, 100, 250, 500], referral: {} };
const socState = () => state.social || SOC_EMPTY;
const socTyping = () => { const a = document.activeElement; return !!(a && a.closest && a.closest('.soc-form') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)); };
async function loadSocial(force = false) {
  try { state.social = force ? await api.refreshSocial() : await api.getSocial(); } catch { /* offline */ }
  if (state.view === 'friends' && !socTyping()) render(true);
}
// (top level: app.js's « api » does not exist yet, it is window.nexus)
if (window.nexus.onSocial) window.nexus.onSocial((s) => {
  state.social = s;
  if (state.view === 'friends' && !socTyping() && !$('#modal-root').innerHTML) render(true);
});
const myGamesForSelect = () => (state.games || []).filter((g) => !g.hidden)
  .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.name.localeCompare(b.name, 'fr'));
const socFriends = () => ((state.friends && state.friends.friends) || []).slice()
  .sort((a, b) => (a.state === 'offline') - (b.state === 'offline') || a.name.localeCompare(b.name, 'fr'));
const closeModal = () => { const r = $('#modal-root'); r.innerHTML = ''; r.onclick = null; };
const INVITE_IC = '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 11v3M6 12.5h3"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.8" r="1" fill="currentColor"/></svg>';
const SHARE_IC = '<svg viewBox="0 0 24 24"><circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4"/></svg>';

/* ---------- 1. Inviter un ami à jouer ---------- */
function inviteModal({ fid = '', gameId = '' } = {}) {
  const friends = socFriends();
  if (!friends.length) return toast('Ajoute d\'abord des amis pour pouvoir les inviter', true);
  const games = myGamesForSelect();
  if (!games.length) return toast('Aucun jeu dans ta bibliothèque', true);
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal soc-modal">
    <h2>${INVITE_IC}Inviter un ami à jouer</h2>
    <p class="soc-p">Ton ami reçoit une notification, même en pleine partie, et peut lancer le jeu en un clic.</p>
    <div class="fields soc-form">
      <label>Ami<select id="si-f">${friends.map((f) => `<option value="${esc(f.uid)}" ${f.uid === fid ? 'selected' : ''}>${esc(f.name)} · ${esc(STATUS[friendState(f)].label)}</option>`).join('')}</select></label>
      <label>Jeu<select id="si-g">${games.map((g) => `<option value="${esc(g.id)}" ${g.id === gameId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
    </div>
    <div class="row"><button class="ghost" data-si="close">Annuler</button><button class="primary" data-si="send">Envoyer l'invitation</button></div>
  </div></div>`;
  root.onclick = async (e) => {
    const b = e.target.closest('[data-si]');
    if (!b && !e.target.classList.contains('modal-bg')) return;
    if (b && b.dataset.si === 'send') {
      b.disabled = true;
      try { const r = await api.inviteFriend($('#si-f').value, $('#si-g').value); toast(`🎮 Invitation envoyée à ${r.to} pour ${r.game}`); } catch (err) { b.disabled = false; return toast(errMsg(err), true); }
    }
    closeModal();
  };
}
/** An invite received (Linkgeek in front): launch the game or later. */
function inviteReceivedModal(inv) {
  const root = $('#modal-root');
  if (root.innerHTML) { toast(`🎮 ${inv.name} t'invite à jouer à ${inv.game.name} (Amis)`); return; }
  // library not loaded yet (invite at start): main checks when the player clicks
  const owned = !(state.games || []).length || state.games.some((g) => gameKeyJs(g.name) === inv.game.key);
  root.innerHTML = `<div class="modal-bg"><div class="modal soc-modal soc-invite">
    <div class="soc-inv-ava">${friendAvatar({ name: inv.name, photo: inv.photo, state: 'online' }, 'lg')}</div>
    <h2>${esc(inv.name)} t'invite à jouer</h2>
    <p class="soc-game">🎮 ${esc(inv.game.name)}</p>
    ${owned ? '' : '<p class="soc-p">Ce jeu n\'est pas dans ta bibliothèque Linkgeek.</p>'}
    <div class="row"><button class="ghost" data-iv="no">Plus tard</button>${owned ? '<button class="primary" data-iv="yes">Lancer le jeu</button>' : ''}</div>
  </div></div>`;
  root.onclick = async (e) => {
    const b = e.target.closest('[data-iv]');
    if (!b && !e.target.classList.contains('modal-bg')) return;
    closeModal();
    try {
      const r = await api.answerInvite(inv.from, !!(b && b.dataset.iv === 'yes'));
      if (r && r.launched) toast(`Lancement de ${r.name}…`);
      else if (r && r.missing) toast(`${r.missing} n'est pas dans ta bibliothèque`, true);
    } catch (err) { toast(errMsg(err), true); }
  };
}
// same matching as src/social.js gameKey()
const gameKeyJs = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 80);
if (window.nexus.onInvite) window.nexus.onInvite((inv) => { loadSocial(); inviteReceivedModal(inv); });

function invitesBlock() {
  const inv = socState().invites || [];
  if (!inv.length) return '';
  return `<section class="section"><div class="section-head"><h2>Invitations à jouer <span class="pill">${inv.length}</span></h2></div>
    <div class="f-reqs">${inv.map((i) => `<div class="f-req panel soc-inv-row">
      ${friendAvatar({ name: i.name, photo: i.photo, state: 'online' })}
      <div class="f-info"><b>${esc(i.name)}</b><span class="f-status">t'invite à jouer à <b>${esc(i.game.name)}</b> · ${esc(fmtAgo(i.at).toLowerCase())}</span></div>
      <button class="btn-play sm" data-soc="inv-yes" data-id="${esc(i.from)}">Lancer le jeu</button>
      <button class="ghost" data-soc="inv-no" data-id="${esc(i.from)}">Ignorer</button>
    </div>`).join('')}</div></section>`;
}

/* ---------- 2. Duels de la semaine ---------- */
const fmtDuel = (d, n) => (d.kind === 'challenges' ? `${n} défi${n > 1 ? 's' : ''}`
  : n >= 60 ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')}` : `${n} min`);
const duelWhat = (d) => (d.kind === 'challenges' ? 'Qui fait le plus de défis ?' : `Qui joue le plus à ${d.game ? d.game.name : 'ce jeu'} ?`);
function duelEndsIn() {
  const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - ((end.getDay() + 6) % 7) + 7);
  const ms = end - Date.now();
  const d = Math.floor(ms / 86400000); const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d} j ${h} h` : `${h} h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}`;
}
function duelCard(d) {
  const me = (state.profile && state.profile.name) || 'Moi';
  const mine = d.myScore; const theirs = d.theirScore;
  const max = Math.max(1, mine, theirs);
  const pot = d.stake * 2;
  let status = ''; let actions = '';
  if (d.status === 'pending' && !d.current) status = '<span class="dl-tag off">Expiré</span>';
  else if (d.status === 'pending' && d.outgoing) { status = '<span class="dl-tag wait">En attente de réponse</span>'; actions = `<button class="ghost" data-soc="duel-cancel" data-id="${esc(d.id)}">Annuler</button>`; }
  else if (d.status === 'pending') { status = '<span class="dl-tag new">Nouveau défi !</span>'; actions = `<button class="btn-play sm" data-soc="duel-yes" data-id="${esc(d.id)}">${COIN}Accepter · ${d.stake}</button><button class="ghost" data-soc="duel-no" data-id="${esc(d.id)}">Refuser</button>`; }
  else if (d.status === 'declined') status = '<span class="dl-tag off">Refusé</span>';
  else if (d.status === 'cancelled') status = '<span class="dl-tag off">Annulé</span>';
  else if (d.result === 'won') status = `<span class="dl-tag win">🏆 Gagné · +${pot}</span>`;
  else if (d.result === 'lost') status = '<span class="dl-tag lose">Perdu</span>';
  else if (d.result === 'draw') status = '<span class="dl-tag off">Égalité · mise rendue</span>';
  else if (d.current) status = `<span class="dl-tag live">En cours · fin dans ${esc(duelEndsIn())}</span>`;
  else status = '<span class="dl-tag wait">Résultat en attente</span>';
  const live = d.status === 'active';
  return `<div class="panel dl-card ${live ? 'live' : ''} ${d.result || ''}">
    <div class="dl-top"><span class="dl-kind">${d.kind === 'challenges' ? '✅' : '🎮'} ${esc(duelWhat(d))}</span>${status}</div>
    <div class="dl-vs">
      <div class="dl-side me"><b>${esc(me)}</b>${live ? `<span>${esc(fmtDuel(d, mine))}</span><div class="dl-bar"><i style="width:${Math.round((mine / max) * 100)}%"></i></div>` : ''}</div>
      <div class="dl-mid">VS<small>${COIN}${pot}</small></div>
      <div class="dl-side them"><b>${esc(d.friend.name)}</b>${live ? `<span>${esc(fmtDuel(d, theirs))}</span><div class="dl-bar"><i style="width:${Math.round((theirs / max) * 100)}%"></i></div>` : ''}</div>
    </div>
    ${actions ? `<div class="dl-actions">${actions}</div>` : ''}
  </div>`;
}
function duelsSection() {
  const s = socState();
  const list = s.duels || [];
  const open = list.filter((d) => (d.status === 'pending' && d.current) || (d.status === 'active' && !d.result));
  const done = list.filter((d) => !open.includes(d)).slice(0, 6);
  return `<section class="section soc-sec">
    <div class="soc-hero panel">
      <div><b>⚔️ Duels de la semaine</b><span>Défie un ami du lundi au dimanche : « qui joue le plus à … ? » ou « qui fait le plus de défis ? ». Chacun mise des Geek Coins, le gagnant remporte tout.</span></div>
      <div class="soc-hero-act"><button class="ghost icon-only" data-soc="refresh" title="Actualiser les scores"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg></button><button class="btn-play sm" data-soc="duel-new">Lancer un duel</button></div>
    </div>
    ${open.length ? `<div class="dl-grid">${open.map(duelCard).join('')}</div>` : '<div class="empty"><b>Aucun duel en cours</b>Lance un duel à un ami : la mise est rendue s\'il refuse ou si la semaine se termine avant qu\'il accepte.</div>'}
    ${done.length ? `<h3 class="set-h3">Duels terminés</h3><div class="dl-grid">${done.map(duelCard).join('')}</div>` : ''}
    <p class="lb-note">Le temps de jeu compté est celui suivi par Linkgeek, sur le jeu du même nom (quelle que soit la plateforme). Les scores sont mis à jour toutes les 5 minutes.</p>
  </section>`;
}
function duelModal(fid = '') {
  const friends = socFriends();
  if (!friends.length) return toast('Ajoute d\'abord des amis pour les défier', true);
  const s = socState();
  const games = myGamesForSelect();
  const coins = state.shop ? state.shop.coins : 0;
  const root = $('#modal-root');
  const draw = (kind = 'game', stake = 50) => {
    root.innerHTML = `<div class="modal-bg"><div class="modal soc-modal dl-modal">
      <h2>⚔️ Lancer un duel</h2>
      <p class="soc-p">Le duel dure jusqu'à dimanche minuit. Ton ami doit l'accepter et miser autant que toi.</p>
      <div class="fields soc-form">
        <label>Ami<select id="sd-f">${friends.map((f) => `<option value="${esc(f.uid)}" ${f.uid === fid ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
        <div class="dl-kinds segmented"><button class="${kind === 'game' ? 'active' : ''}" data-sd-kind="game">🎮 Temps de jeu sur un jeu</button><button class="${kind === 'challenges' ? 'active' : ''}" data-sd-kind="challenges">✅ Nombre de défis</button></div>
        ${kind === 'game' ? `<label>Jeu<select id="sd-g">${games.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>` : ''}
        <div class="dl-stakes"><span>Mise (chacun)</span><div>${s.duelStakes.map((v) => `<button class="${v === stake ? 'active' : ''} ${coins < v ? 'poor' : ''}" data-sd-stake="${v}">${COIN}${v}</button>`).join('')}</div></div>
      </div>
      <p class="dl-sum">Le gagnant remporte <b>${COIN}${stake * 2} Geek Coins</b>. Égalité : chacun récupère sa mise. Tu as ${fmtCoins(coins)} Geek Coins.</p>
      <div class="row"><button class="ghost" data-sd="close">Annuler</button><button class="primary" data-sd="send">Défier</button></div>
    </div></div>`;
    root.dataset.kind = kind; root.dataset.stake = stake;
  };
  draw();
  root.onclick = async (e) => {
    const k = e.target.closest('[data-sd-kind]');
    if (k) { const f = $('#sd-f').value; fid = f; return draw(k.dataset.sdKind, Number(root.dataset.stake)); }
    const st = e.target.closest('[data-sd-stake]');
    if (st) { fid = $('#sd-f').value; const g = $('#sd-g') && $('#sd-g').value; draw(root.dataset.kind, Number(st.dataset.sdStake)); if (g && $('#sd-g')) $('#sd-g').value = g; return; }
    const b = e.target.closest('[data-sd]');
    if (!b && !e.target.classList.contains('modal-bg')) return;
    if (b && b.dataset.sd === 'send') {
      b.disabled = true;
      try {
        await api.createDuel({ fid: $('#sd-f').value, kind: root.dataset.kind, gameId: $('#sd-g') ? $('#sd-g').value : null, stake: Number(root.dataset.stake) });
        toast('⚔️ Duel envoyé ! Ta mise est mise de côté jusqu\'à la réponse.');
        state.friendsTab = 'duels';
      } catch (err) { b.disabled = false; return toast(errMsg(err), true); }
    }
    closeModal();
    render(true);
  };
}

/* ---------- 3. Recherche un coéquipier ---------- */
function lfgSection() {
  const s = socState();
  const mine = s.myLfg;
  const games = myGamesForSelect();
  const others = s.lfg || [];
  return `<section class="section soc-sec">
    <div class="soc-hero panel lfg-me ${mine ? 'on' : ''}">
      <div><b>🔎 Recherche un coéquipier</b><span>Affiche que tu cherches quelqu'un pour jouer : les joueurs de Linkgeek qui ne sont pas encore tes amis peuvent t'ajouter. Visible par tous pendant 24 h.</span></div>
      <form class="soc-form lfg-form" id="lfg-form">
        <select id="lfg-game"><option value="">N'importe quel jeu</option>${games.map((g) => `<option value="${esc(g.name)}" ${mine && mine.game === g.name ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <input id="lfg-note" maxlength="80" placeholder="Un petit mot (ex. : ranked ce soir, micro)" value="${esc((mine && mine.note) || '')}" autocomplete="off">
        ${mine ? '<button class="ghost" type="button" data-soc="lfg-off">Arrêter</button><button class="btn-play sm" type="submit">Mettre à jour</button>' : '<button class="btn-play sm" type="submit">Je recherche</button>'}
      </form>
      ${mine ? `<span class="lfg-live"><i class="f-dot online"></i>Ton statut est visible · ${esc(fmtAgo(mine.at).toLowerCase())}</span>` : ''}
    </div>
    <div class="section-head"><h2>Joueurs qui cherchent un coéquipier <span class="pill">${others.length}</span></h2><button class="link" data-soc="refresh">Actualiser</button></div>
    ${others.length ? `<div class="lfg-grid">${others.map((p) => `<div class="panel lfg-card">
      ${friendAvatar({ name: p.name, photo: p.photo, state: 'online' })}
      <div class="f-info"><div class="f-name"><b>${esc(p.name)}</b>${levelBadge(p.level || 1, 'xs')}</div>
        <span class="f-status">${p.game ? `🎮 <b>${esc(p.game)}</b>` : 'N\'importe quel jeu'} · ${esc(fmtAgo(p.at).toLowerCase())}</span>
        ${p.note ? `<small class="lfg-note">« ${esc(p.note)} »</small>` : ''}</div>
      ${p.friend ? '<span class="dl-tag off">Déjà ami</span>' : p.asked ? '<span class="dl-tag wait">Demande envoyée</span>' : `<button class="btn-play sm" data-soc="lfg-ask" data-id="${esc(p.uid)}">Ajouter en ami</button>`}
    </div>`).join('')}</div>` : '<div class="empty"><b>Personne pour l\'instant</b>Active ta recherche : les autres joueurs te verront ici.</div>'}
  </section>`;
}

/* ---------- 6. Parrainage (new accounts) ---------- */
function referralBlock() {
  const r = socState().referral || {};
  if (!r.canClaim) return '';
  return `<form class="panel f-add soc-form ref-claim" id="ref-form">
    <b>🎁 Un ami t'a invité sur Linkgeek ?</b>
    <span>Entre son code ami : vous recevez chacun un booster gratuit.</span>
    <div class="f-add-row"><input id="ref-code" placeholder="ABCD-1234" maxlength="9" spellcheck="false" autocomplete="off"><button class="btn-play sm" type="submit">Valider</button></div>
  </form>`;
}

/* ---------- Friends page: tabs ---------- */
function socialTabs(listLen) {
  const s = socState();
  const duelsNew = (s.duels || []).filter((d) => d.status === 'pending' && d.current && !d.outgoing).length;
  const t = state.friendsTab;
  return `<div class="segmented f-tabs">
    <button class="${t === 'list' ? 'active' : ''}" data-friends-tab="list">Mes amis<span class="n">${listLen}</span></button>
    ${listLen ? `<button class="${t === 'board' ? 'active' : ''}" data-friends-tab="board">${I.trophy}Classement</button>` : ''}
    <button class="${t === 'duels' ? 'active' : ''}" data-friends-tab="duels">⚔️ Duels${duelsNew ? `<span class="n hot">${duelsNew}</span>` : ''}</button>
    <button class="${t === 'lfg' ? 'active' : ''}" data-friends-tab="lfg">🔎 Coéquipiers</button>
  </div>`;
}

/* ---------- 5. Partager (top bar) ---------- */
async function shareModal() {
  let info = { url: 'https://github.com/unknownxsr/linkgeek/releases/latest' };
  try { info = await api.shareInfo(); } catch { /* defaults */ }
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal soc-modal share-modal">
    <h2>${SHARE_IC}Partager Linkgeek</h2>
    <p class="soc-p">Envoie ce lien à tes amis : ils téléchargent Linkgeek et retrouvent tous leurs jeux au même endroit.</p>
    <div class="share-link"><input readonly value="${esc(info.url)}"><button class="btn-play sm" data-sh="link">Copier le lien</button></div>
    <div class="share-ref">
      <b>🎁 Parrainage : un booster offert à chacun</b>
      <span>${info.code ? `Ton ami installe Linkgeek puis entre ton code <b class="mono">${esc(info.code)}</b> dans Amis : vous recevez chacun un booster gratuit.` : 'Connecte-toi au mode en ligne pour avoir ton code de parrainage.'}</span>
      <div class="ref-prog"><div class="up-bar"><i style="width:${Math.round(((info.gained || 0) / (info.max || 5)) * 100)}%"></i></div><small>${info.gained || 0} / ${info.max || 5} boosters gagnés par parrainage</small></div>
    </div>
    <div class="row"><button class="ghost" data-sh="open">Ouvrir la page</button><button class="ghost" data-sh="close">Fermer</button><button class="primary" data-sh="message">Copier le message d'invitation</button></div>
  </div></div>`;
  root.onclick = async (e) => {
    const b = e.target.closest('[data-sh]');
    if (!b && !e.target.classList.contains('modal-bg')) return;
    const a = b && b.dataset.sh;
    if (a === 'link' || a === 'message') { await api.shareCopy(a); toast(a === 'link' ? 'Lien de téléchargement copié !' : 'Message d\'invitation copié : colle-le où tu veux'); return; }
    if (a === 'open') { api.shareOpen(); return; }
    closeModal();
  };
}

/* ---------- 4. Contact (Paramètres → À propos) ---------- */
function contactBlock(s) {
  const on = !!(s.online && s.online.signedIn);
  return `<h3 class="set-h3">Contact</h3>
    <form class="panel contact-box soc-form" id="contact-form">
      <b>Une idée, un bug, un avis ?</b>
      <span>Écris directement au créateur de Linkgeek. Seul lui lit ces messages ; ton pseudo et la version de l'app sont joints.</span>
      <textarea id="contact-msg" maxlength="1000" rows="4" placeholder="Ton message…" ${on ? '' : 'disabled'}></textarea>
      <div class="contact-foot"><small id="contact-n">0 / 1000</small>${on ? '<button class="btn-play sm" type="submit">Envoyer</button>' : '<button class="ghost" type="button" data-goto-account>Connecte-toi pour envoyer un message</button>'}</div>
    </form>`;
}

/* ---------- Admin: messages from the Contact block ---------- */
function adminFeedbackBlock() {
  const list = state.adminFeedback;
  return `<h3 class="set-h3">Messages des joueurs</h3>
    <div class="fb-list">${list === undefined ? '<p class="set-note">Chargement…</p>'
      : list === null ? '<p class="set-note">Impossible de charger les messages (mode en ligne déconnecté, ou règles Firebase pas encore republiées).</p>'
        : !list.length ? '<p class="set-note">Aucun message pour l\'instant.</p>'
          : list.map((m) => `<div class="panel fb-item"><div class="fb-head"><b>${esc(m.name || 'Joueur')}</b><small>${esc(fmtAgo(m.at))}${m.v ? ` · v${esc(m.v)}` : ''}</small><button class="ghost danger sm" data-soc="fb-del" data-id="${esc(m.id)}">Supprimer</button></div><p>${esc(m.msg)}</p></div>`).join('')}</div>
    <button class="link" data-soc="fb-load">Actualiser les messages</button>`;
}
async function loadAdminFeedback() {
  try { state.adminFeedback = await api.adminFeedback(); } catch { state.adminFeedback = null; }
  if (state.view === 'settings' && state.settingsTab === 'admin') render(true);
}

/* ---------- clicks & forms ---------- */
document.addEventListener('click', async (e) => {
  const sh = e.target.closest('#share-btn');
  if (sh) { shareModal(); return; }
  const iv = e.target.closest('[data-soc-invite]');
  if (iv) { e.stopImmediatePropagation(); e.preventDefault(); inviteModal({ fid: iv.dataset.socInvite, gameId: iv.dataset.game || '' }); return; }
  const dv = e.target.closest('[data-soc-duel]');
  if (dv) { e.stopImmediatePropagation(); duelModal(dv.dataset.socDuel); return; }
  const t = e.target.closest('[data-soc]');
  if (!t) return;
  const a = t.dataset.soc; const id = t.dataset.id;
  try {
    if (a === 'refresh') { t.classList.add('spin'); await loadSocial(true); return; }
    if (a === 'duel-new') return duelModal();
    if (a === 'duel-yes') { t.disabled = true; await api.answerDuel(id, true); toast('⚔️ Duel accepté : que le meilleur gagne !'); return loadSocial(); }
    if (a === 'duel-no') { await api.answerDuel(id, false); return loadSocial(); }
    if (a === 'duel-cancel') { await api.cancelDuel(id); toast('Duel annulé : ta mise t\'est rendue'); return loadSocial(); }
    if (a === 'lfg-off') { await api.setLfg(false); toast('Tu n\'apparais plus dans « Recherche un coéquipier »'); return loadSocial(); }
    if (a === 'lfg-ask') { t.disabled = true; await api.askLfg(id); toast('Demande d\'ami envoyée 👋'); return loadSocial(); }
    if (a === 'inv-yes' || a === 'inv-no') {
      const r = await api.answerInvite(id, a === 'inv-yes');
      if (r && r.launched) toast(`Lancement de ${r.name}…`);
      else if (r && r.missing) toast(`${r.missing} n'est pas dans ta bibliothèque`, true);
      return loadSocial();
    }
    if (a === 'fb-load') { state.adminFeedback = undefined; render(true); return loadAdminFeedback(); }
    if (a === 'fb-del') {
      if (!(await confirmModal('Supprimer ce message ?', 'Il sera effacé définitivement.', 'Supprimer'))) return;
      await api.adminFeedbackDelete(id);
      state.adminFeedback = (state.adminFeedback || []).filter((m) => m.id !== id);
      return render(true);
    }
  } catch (err) { t.disabled = false; toast(errMsg(err), true); }
}, true);

document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.id === 'lfg-form') {
    e.preventDefault();
    try { await api.setLfg(true, { game: $('#lfg-game').value, note: $('#lfg-note').value }); toast('🔎 Ton statut « Recherche un coéquipier » est visible pendant 24 h'); document.activeElement.blur(); loadSocial(); } catch (err) { toast(errMsg(err), true); }
  } else if (f.id === 'ref-form') {
    e.preventDefault();
    try { state.social = await api.claimReferral($('#ref-code').value); toast('🎁 Parrainage validé : un booster gratuit t\'attend dans Cartes !'); render(true); } catch (err) { toast(errMsg(err), true); }
  } else if (f.id === 'contact-form') {
    e.preventDefault();
    const m = $('#contact-msg');
    try { await api.sendFeedback(m.value); m.value = ''; $('#contact-n').textContent = '0 / 1000'; toast('✉️ Message envoyé, merci pour ton retour !'); } catch (err) { toast(errMsg(err), true); }
  }
}, true);
document.addEventListener('input', (e) => {
  if (e.target.id === 'contact-msg') { const n = $('#contact-n'); if (n) n.textContent = `${e.target.value.length} / 1000`; }
});

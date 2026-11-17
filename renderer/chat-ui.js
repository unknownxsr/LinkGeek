/* Linkgeek — messagerie entre amis (renderer).
 * A panel on the right, opened from the 💬 button of the top bar, a friend card or a friend profile:
 * list of conversations → one conversation (bubbles, Entrée = envoyer, Maj+Entrée = nouvelle ligne).
 * Loaded after app.js: uses its state and helpers (esc, toast, errMsg, friendAvatar, fmtAgo…).
 * The data lives in src/chat.js (main process).
 */
const CHAT = { open: false, with: null, msgs: [], state: null, loading: false, sending: false, draft: {} };
const CHAT_IC = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/></svg>';

function chatFriend(uid) {
  const f = ((state.friends && state.friends.friends) || []).find((x) => x.uid === uid);
  if (f) return f;
  const c = CHAT.state && CHAT.state.list.find((x) => x.uid === uid);
  return c ? { uid, name: c.name, photo: c.photo, state: c.state || 'offline' } : null;
}
function chatAvatar(f, cls = '') {
  if (f && typeof friendAvatar === 'function' && ((state.friends && state.friends.friends) || []).some((x) => x.uid === f.uid)) return friendAvatar(f, cls);
  const n = f && f.name ? f.name : '?';
  return `<span class="ch-av ${cls}" style="--h:${hue(n)}">${esc(initials(n))}</span>`;
}
const chatTime = (t) => new Date(t).toLocaleTimeString(typeof linkgeekLocale === 'function' ? linkgeekLocale() : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
function chatDay(t) {
  const d = new Date(t), now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Aujourd'hui";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (same(d, y)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function chatStatus(f) {
  if (!f) return '';
  const s = typeof friendState === 'function' ? friendState(f) : f.state;
  if (s === 'playing' && f.game) return `<span class="playing">Joue à <b translate="no">${esc(f.game.name)}</b></span>`;
  return `<span class="${esc(s)}">${esc((STATUS[s] || STATUS.offline).label)}</span>`;
}

/* ---------------- top bar button + badge ---------------- */
function chatBadge() {
  const b = document.getElementById('chat-count');
  if (!b) return;
  const n = CHAT.state ? CHAT.state.unread : 0;
  b.textContent = n > 9 ? '9+' : n || '';
  b.classList.toggle('on', n > 0);
}

/* ---------------- panel ---------------- */
function chatRender(keepInput = true) {
  let p = document.getElementById('chat-panel');
  document.body.classList.toggle('chat-open', CHAT.open);
  if (!CHAT.open) { if (p) p.remove(); return; }
  const input = p && p.querySelector('#chat-input');
  if (input && keepInput && CHAT.with) CHAT.draft[CHAT.with] = input.value;
  const hadFocus = input && document.activeElement === input;
  if (!p) { p = document.createElement('aside'); p.id = 'chat-panel'; p.className = 'chat-panel'; document.body.appendChild(p); }
  const st = CHAT.state;
  if (!st || !st.signedIn) {
    p.innerHTML = `<div class="chp-head"><b>${CHAT_IC}Messages</b><button class="chp-x" data-chat-close aria-label="Fermer">✕</button></div>
      <div class="chp-empty"><b>Connecte-toi pour discuter avec tes amis</b><span>La messagerie passe par le mode en ligne (Amis).</span><button class="btn-play sm" data-chat-friends>Aller dans Amis</button></div>`;
    return;
  }
  if (!CHAT.with) {
    p.innerHTML = `<div class="chp-head"><b>${CHAT_IC}Messages</b><button class="chp-x" data-chat-close aria-label="Fermer">✕</button></div>
      <div class="chp-list">${st.list.length ? st.list.map((c) => {
        const f = chatFriend(c.uid) || c;
        return `<button class="chp-conv ${c.unread ? 'unread' : ''}" data-chat-open="${esc(c.uid)}">
          ${chatAvatar(f)}
          <span class="chp-ci"><span class="chp-cn"><b>${esc(c.name)}</b>${c.last ? `<small>${esc(fmtAgo(c.last.at))}</small>` : ''}</span>
          <span class="chp-cl">${c.last ? `${c.last.mine ? '<span>Toi : </span>' : ''}<span translate="no">${esc(c.last.text)}</span>` : chatStatus(f)}</span></span>
          ${c.unread ? '<i class="chp-dot"></i>' : ''}
        </button>`;
      }).join('') : '<div class="chp-empty"><b>Pas encore d\'amis</b><span>Ajoute des amis avec leur code ami pour leur écrire.</span></div>'}</div>`;
    return;
  }
  const f = chatFriend(CHAT.with);
  let lastDay = '';
  const body = CHAT.loading && !CHAT.msgs.length ? '<div class="chp-wait"><span class="spinner"></span></div>'
    : CHAT.msgs.length ? CHAT.msgs.map((m, i) => {
      const day = chatDay(m.at);
      const sep = day !== lastDay ? `<div class="chp-day">${esc(day)}</div>` : '';
      lastDay = day;
      const next = CHAT.msgs[i + 1];
      const tail = !next || next.mine !== m.mine || next.at - m.at > 5 * 60000 || chatDay(next.at) !== day;
      return `${sep}<div class="chp-msg ${m.mine ? 'mine' : 'theirs'} ${tail ? 'tail' : ''} ${m.pending ? 'pending' : ''}" title="${esc(chatTime(m.at))}"><span translate="no">${esc(m.text)}</span>${tail ? `<small>${esc(chatTime(m.at))}</small>` : ''}</div>`;
    }).join('')
    : `<div class="chp-hello">${chatAvatar(f, 'lg')}<b>${esc(f ? f.name : '')}</b><span>Dis bonjour 👋 Les messages sont gardés 1 semaine.</span></div>`;
  p.innerHTML = `<div class="chp-head conv">
      <button class="chp-back" data-chat-back aria-label="Retour">${I.back}</button>
      ${chatAvatar(f)}<span class="chp-who"><b>${esc(f ? f.name : 'Ami')}</b>${chatStatus(f)}</span>
      <button class="chp-x" data-chat-close aria-label="Fermer">✕</button></div>
    <div class="chp-msgs" id="chat-msgs">${body}</div>
    <form class="chp-form" id="chat-form">
      <textarea id="chat-input" rows="1" maxlength="${st.max || 500}" placeholder="Écris un message…" spellcheck="true"></textarea>
      <button class="chp-send" type="submit" aria-label="Envoyer" title="Envoyer (Entrée)"><svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg></button>
    </form>
    <div class="chp-count" id="chat-countc"></div>`;
  const box = p.querySelector('#chat-msgs');
  box.scrollTop = box.scrollHeight;
  const ta = p.querySelector('#chat-input');
  ta.value = CHAT.draft[CHAT.with] || '';
  chatAutosize(ta);
  if (hadFocus || !keepInput) ta.focus();
}
function chatAutosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
  const c = document.getElementById('chat-countc');
  const max = (CHAT.state && CHAT.state.max) || 500;
  if (c) { const left = max - ta.value.length; c.textContent = left < 60 ? `${left}` : ''; }
}

async function chatOpenPanel(uid) {
  CHAT.open = true;
  if (!CHAT.state) { try { CHAT.state = await api.getChat(); } catch { /* offline */ } }
  if (uid) return chatOpenConv(uid);
  CHAT.with = null;
  api.chatClose().catch(() => {});
  chatRender();
}
async function chatOpenConv(uid) {
  CHAT.open = true;
  CHAT.with = uid; CHAT.msgs = []; CHAT.loading = true;
  chatRender(false);
  try {
    const r = await api.chatOpen(uid);
    if (CHAT.with !== uid) return;
    CHAT.msgs = r.messages;
  } catch (e) { toast(errMsg(e), true); }
  CHAT.loading = false;
  if (CHAT.with === uid) chatRender(false);
}
async function chatReload() {
  if (!CHAT.open || !CHAT.with) return;
  const uid = CHAT.with;
  try {
    const r = await api.chatOpen(uid);
    if (CHAT.with !== uid) return;
    const pending = CHAT.msgs.filter((m) => m.pending);
    CHAT.msgs = [...r.messages, ...pending];
    chatRender();
  } catch { /* keep what is shown */ }
}
function chatClose() {
  CHAT.open = false; CHAT.with = null;
  api.chatClose().catch(() => {});
  chatRender();
}
async function chatSend() {
  const ta = document.getElementById('chat-input');
  if (!ta || !CHAT.with || CHAT.sending) return;
  const text = ta.value.trim();
  if (!text) return;
  const uid = CHAT.with;
  const tmp = { id: 'tmp' + Date.now(), mine: true, text, at: Date.now(), pending: true };
  CHAT.msgs.push(tmp);
  CHAT.draft[uid] = '';
  ta.value = '';
  CHAT.sending = true;
  chatRender();
  try {
    const m = await api.chatSend(uid, text);
    const i = CHAT.msgs.indexOf(tmp);
    if (i >= 0) CHAT.msgs[i] = m;
  } catch (e) {
    CHAT.msgs = CHAT.msgs.filter((x) => x !== tmp);
    CHAT.draft[uid] = text;
    toast(errMsg(e), true);
  }
  CHAT.sending = false;
  if (CHAT.with === uid) chatRender();
}

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('#chat-btn')) { if (CHAT.open) chatClose(); else chatOpenPanel(); return; }
  const o = e.target.closest('[data-chat-open]');
  if (o) {
    e.stopPropagation(); e.preventDefault();
    if (o.closest('#modal-root')) { $('#modal-root').innerHTML = ''; }
    chatOpenConv(o.dataset.chatOpen);
    return;
  }
  if (e.target.closest('[data-chat-close]')) return chatClose();
  if (e.target.closest('[data-chat-back]')) return chatOpenPanel();
  if (e.target.closest('[data-chat-friends]')) { chatClose(); go('friends'); }
}, true);
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'chat-form') return;
  e.preventDefault();
  chatSend();
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); chatSend(); return; }
  if (e.key === 'Escape' && CHAT.open && !(typeof TV !== 'undefined' && TV.on) && !document.querySelector('#modal-root .modal-bg')) {
    if (CHAT.with) chatOpenPanel(); else chatClose();
  }
});
document.addEventListener('input', (e) => { if (e.target.id === 'chat-input') { chatAutosize(e.target); if (CHAT.with) CHAT.draft[CHAT.with] = e.target.value; } });

api.onChat((s) => {
  CHAT.state = s;
  chatBadge();
  if (CHAT.open && !CHAT.with) chatRender();
});
api.onChatMessage((m) => {
  if (CHAT.open && CHAT.with === m.from) chatReload();
});
api.getChat().then((s) => { CHAT.state = s; chatBadge(); }).catch(() => {});

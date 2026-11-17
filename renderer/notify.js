/* Overlay notifications: main.js calls window.lgNotify({ kicker, title, body, icon, img, round, accent, duration }). */
(() => {
  const stack = document.getElementById('stack');
  const MAX = 3;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = (u) => (typeof u === 'string' && /^(https:|data:image\/|nexus-img:)/.test(u) ? u : '');
  function remove(el) {
    if (!el || el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 360);
  }
  window.lgNotify = (n) => {
    const d = Math.max(2000, Math.min(15000, Number(n.duration) || 5500));
    const el = document.createElement('div');
    el.className = 'n';
    if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(n.accent || '')) el.style.setProperty('--ac', n.accent);
    el.style.setProperty('--d', `${d}ms`);
    const img = safeImg(n.img);
    el.innerHTML = `<div class="ic ${n.round ? 'round' : ''}">${img ? `<img src="${esc(img)}" alt="">` : esc(n.icon || '🔔')}</div>
      <div class="tx"><small>${esc(n.kicker || 'Linkgeek')}</small><b>${esc(n.title)}</b>${n.body ? `<span>${esc(n.body)}</span>` : ''}</div>`;
    stack.prepend(el);
    [...stack.children].slice(MAX).forEach(remove);
    setTimeout(() => remove(el), d);
    return stack.children.length;
  };
  window.lgCount = () => [...stack.children].filter((e) => !e.classList.contains('out')).length;
})();

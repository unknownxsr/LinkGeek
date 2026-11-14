/**
 * Game news ("Nouveautés"): the official announcements of Steam games
 * (patch notes, events…) from the public Steam news API. No account or key;
 * only the Steam app id is sent. Results are cached for 3 hours.
 */
const TTL = 3 * 3600 * 1000;
const CLAN_IMG = 'https://clan.akamai.steamstatic.com/images/';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Steam BBCode / HTML → plain text with paragraphs and bullet points. */
function clean(raw) {
  let s = String(raw || '');
  s = s.replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '')
    .replace(/\[previewyoutube[^\]]*\][\s\S]*?\[\/previewyoutube\]/gi, '')
    .replace(/\[video[^\]]*\][\s\S]*?\[\/video\]/gi, '')
    .replace(/\[\*\]/g, '\n• ')
    .replace(/\[\/?(p|h1|h2|h3|h4|list|olist|quote|table|tr|td|th|hr)[^\]]*\]/gi, '\n')
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
    .replace(/\[\/?[a-z*]+(=[^\]]*)?\]/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => ENT[e] || (e[0] === '#' ? String.fromCharCode(parseInt(e.slice(1), 10)) || m : m))
    .replace(/\\\[/g, '[').replace(/\\\]/g, ']')
    .replace(/https?:\/\/\S+\.(png|jpe?g|gif|webp)\S*/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*(\n\s*)+/g, '\n\n')
    .replace(/\n\s*•\s*\n/g, '\n')
    .trim();
  return s;
}

function firstImage(raw) {
  const s = String(raw || '');
  const m = s.match(/\[img[^\]]*\]([^\[]+?)\[\/img\]/i) || s.match(/\[img[^\]]*src="([^"]+)"/i) || s.match(/<img[^>]+src="([^"]+)"/i) || s.match(/\{STEAM_CLAN_IMAGE\}\/[^\s"\[\]]+/);
  let url = m ? (m[1] || m[0]) : null;
  if (!url) return null;
  url = url.trim().replace('{STEAM_CLAN_IMAGE}/', CLAN_IMG);
  return /^https:\/\//.test(url) ? url : null;
}

class News {
  constructor(store) { this.store = store; this.busy = false; }

  get cache() { return this.store.data.newsCache || (this.store.data.newsCache = {}); }
  get seen() { return this.store.data.newsSeen || (this.store.data.newsSeen = {}); }

  appid(g) { return g.source === 'steam' ? g.id.split(':')[1] : null; }

  /** The 5 latest announcements of a game (empty for non-Steam games). */
  get(g) {
    const id = this.appid(g);
    const c = id && this.cache[id];
    return c && Array.isArray(c.items) ? c.items : [];
  }

  /** "Nouveau" badge: an announcement came out since my last session and I have not opened it yet. */
  isNew(g) {
    const items = this.get(g);
    if (!items.length || !g.lastPlayed) return false;
    const latest = items[0].date;
    return latest > g.lastPlayed && latest > (this.seen[g.id] || 0);
  }

  markSeen(gameId, date) {
    this.seen[gameId] = Math.max(this.seen[gameId] || 0, date || Date.now());
    this.store.save();
  }

  async fetchOne(appid) {
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${encodeURIComponent(appid)}&count=8&maxlength=0&format=json&feeds=steam_community_announcements`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('news ' + r.status);
    const j = await r.json();
    const list = (j && j.appnews && j.appnews.newsitems) || [];
    return list.slice(0, 5).map((n) => {
      const text = clean(n.contents);
      return {
        id: String(n.gid),
        title: String(n.title || '').slice(0, 200),
        date: (Number(n.date) || 0) * 1000,
        url: /^https:\/\//.test(n.url || '') ? n.url : `https://store.steampowered.com/news/app/${appid}`,
        image: firstImage(n.contents),
        summary: text.replace(/\s+/g, ' ').slice(0, 320) + (text.length > 320 ? '…' : ''),
        text: text.slice(0, 6000) + (text.length > 6000 ? '\n…' : ''),
        patch: /patch|update|hotfix|mise à jour|notes|fix/i.test(n.title || '') || (n.tags || []).includes('patchnotes'),
      };
    });
  }

  /** Refreshes the news of the given games (Steam only), one request at a time. */
  async fill(games, onChange, force = false) {
    if (this.busy) return;
    this.busy = true;
    let changed = false;
    try {
      for (const g of games) {
        const id = this.appid(g);
        if (!id) continue;
        const c = this.cache[id];
        if (!force && c && Date.now() - c.at < TTL) continue;
        try {
          this.cache[id] = { at: Date.now(), items: await this.fetchOne(id) };
          changed = true;
        } catch { /* offline: keep the old cache */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (changed) this.store.save();
    } finally {
      this.busy = false;
      if (changed && onChange) onChange();
    }
  }
}

module.exports = { News, clean, firstImage };

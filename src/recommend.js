/**
 * "Recommandés pour toi": a player profile built from the tags of the games I
 * play (weighted by playtime), then popular Steam games of the same families
 * that I do not own yet, with their current Steam price / promotion.
 *
 * Sources (public, no account): SteamSpy (tags, top games per tag) and the
 * Steam store (price). Only tag names and Steam app ids are sent.
 */
const FAMILIES = [
  { key: 'team', name: 'Compétitif en équipe', query: 'Team-Based', tags: ['Team-Based', 'Competitive', 'PvP', 'e-sports', 'Esports', 'Tactical', 'MOBA', 'Hero Shooter'] },
  { key: 'shooter', name: 'Tir / FPS', query: 'FPS', tags: ['FPS', 'Shooter', 'Third-Person Shooter', 'Looter Shooter', 'Battle Royale', 'Extraction Shooter'] },
  { key: 'survival', name: 'Survie', query: 'Survival', tags: ['Survival', 'Open World Survival Craft', 'Crafting', 'Base-Building', 'Survival Horror'] },
  { key: 'racing', name: 'Course', query: 'Racing', tags: ['Racing', 'Driving', 'Automobile Sim', 'Offroad'] },
  { key: 'sports', name: 'Sport', query: 'Sports', tags: ['Sports', 'Football (Soccer)', 'Football (American)', 'Basketball', 'Skateboarding'] },
  { key: 'rpg', name: 'RPG', query: 'RPG', tags: ['RPG', 'Action RPG', 'JRPG', 'Souls-like', 'CRPG', 'Party-Based RPG'] },
  { key: 'adventure', name: 'Aventure & exploration', query: 'Exploration', tags: ['Adventure', 'Exploration', 'Open World', 'Space', 'Action-Adventure'] },
  { key: 'sim', name: 'Simulation & gestion', query: 'Simulation', tags: ['Simulation', 'Management', 'Building', 'City Builder', 'Automation', 'Economy'] },
  { key: 'strategy', name: 'Stratégie', query: 'Strategy', tags: ['Strategy', 'RTS', 'Turn-Based Strategy', 'Grand Strategy', 'Tower Defense', 'Card Game'] },
  { key: 'coop', name: 'Coop entre amis', query: 'Online Co-Op', tags: ['Co-op', 'Online Co-Op', 'Local Co-Op'] },
  { key: 'horror', name: 'Horreur', query: 'Horror', tags: ['Horror', 'Psychological Horror'] },
  { key: 'cozy', name: 'Détente', query: 'Cozy', tags: ['Casual', 'Cozy', 'Relaxing', 'Cute', 'Family Friendly', 'Life Sim'] },
];
const TAG_TTL = 7 * 24 * 3600 * 1000;
const PRICE_TTL = 6 * 3600 * 1000;
const CDN = 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps';
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

class Recommender {
  constructor(store, getGames, getTags, getOwned) {
    Object.assign(this, { store, getGames, getTags, getOwned });
    this.busy = false;
  }

  get cache() { return this.store.data.recoCache || (this.store.data.recoCache = { tags: {}, prices: {} }); }

  /** Player profile: share of each family, weighted by playtime (top tags count more). */
  profile() {
    const score = {};
    let total = 0;
    let games = 0;
    for (const g of this.getGames()) {
      if (!(g.playtimeSec > 0)) continue;
      const tags = this.getTags(g.id);
      if (!tags || !tags.length) continue;
      games++;
      const w = Math.pow(g.playtimeSec / 3600, 0.75); // long sessions count, without one game taking everything
      for (const f of FAMILIES) {
        let best = 0;
        tags.slice(0, 8).forEach((t, i) => { if (f.tags.includes(t)) best = Math.max(best, (8 - i) / 8); });
        if (best) { score[f.key] = (score[f.key] || 0) + w * best; total += w * best; }
      }
    }
    const list = FAMILIES.map((f) => ({ key: f.key, name: f.name, pct: total ? Math.round(((score[f.key] || 0) / total) * 100) : 0 }))
      .filter((f) => f.pct >= 3).sort((a, b) => b.pct - a.pct);
    return { families: list.slice(0, 6), games };
  }

  /** Top games of a SteamSpy tag (cached 7 days, only what is needed is kept). */
  async tagList(tag) {
    const c = this.cache.tags[tag];
    if (c && Date.now() - c.at < TAG_TTL) return c.list;
    const r = await fetch(`https://steamspy.com/api.php?request=tag&tag=${encodeURIComponent(tag)}`, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('steamspy ' + r.status);
    const j = await r.json();
    const list = Object.values(j || {}).map((a) => ({
      appid: String(a.appid), name: String(a.name || '').slice(0, 120),
      pos: Number(a.positive) || 0, neg: Number(a.negative) || 0,
      owners: parseInt(String(a.owners || '0').split('..')[0].replace(/\D/g, ''), 10) || 0,
      ccu: Number(a.ccu) || 0,
    })).filter((a) => a.appid && a.name && a.pos + a.neg >= 2000)
      .sort((a, b) => b.ccu - a.ccu || b.owners - a.owners).slice(0, 120);
    this.cache.tags[tag] = { at: Date.now(), list };
    this.store.save();
    return list;
  }

  /** Current Steam price of up to 30 games (France), cached 6 hours. */
  async prices(appids) {
    const todo = appids.filter((id) => { const p = this.cache.prices[id]; return !p || Date.now() - p.at > PRICE_TTL; });
    for (let i = 0; i < todo.length; i += 15) {
      const chunk = todo.slice(i, i + 15);
      try {
        const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${chunk.join(',')}&cc=fr&filters=price_overview`, { signal: AbortSignal.timeout(15000) });
        const j = await r.json();
        for (const id of chunk) {
          const d = j && j[id];
          const p = d && d.success && d.data && d.data.price_overview;
          this.cache.prices[id] = p
            ? { at: Date.now(), final: p.final_formatted, initial: p.initial_formatted || null, discount: p.discount_percent || 0 }
            : { at: Date.now(), free: !!(d && d.success), final: null, discount: 0 };
        }
      } catch { /* keep going without prices */ }
    }
    this.store.save();
  }

  /** Builds the recommendations (top families → popular games of those tags I do not own). */
  async compute() {
    if (this.busy) return this.cache.result || null;
    this.busy = true;
    try {
      const prof = this.profile();
      const top = prof.families.slice(0, 4);
      if (!top.length) return null;
      const owned = this.getOwned();
      const ownedNames = new Set(this.getGames().map((g) => norm(g.name)));
      const cand = new Map();
      for (const fam of top) {
        const def = FAMILIES.find((f) => f.key === fam.key);
        let list = [];
        try { list = await this.tagList(def.query); } catch { continue; }
        await new Promise((r) => setTimeout(r, 1100)); // SteamSpy: 1 request per second
        list.forEach((a, rank) => {
          if (owned.has(a.appid) || ownedNames.has(norm(a.name))) return;
          const c = cand.get(a.appid) || { ...a, fams: [], score: 0 };
          c.fams.push(fam.name);
          // the more of my families a game matches, and the higher it ranks there, the better
          c.score += fam.pct * (1 - rank / 150);
          cand.set(a.appid, c);
        });
      }
      const ranked = [...cand.values()].map((c) => {
        const ratio = c.pos / Math.max(1, c.pos + c.neg);
        return { ...c, ratio, final: c.score * (0.4 + ratio) * (1 + Math.log10(1 + c.ccu) / 10) };
      }).filter((c) => c.ratio >= 0.7).sort((a, b) => b.final - a.final).slice(0, 24);
      // Real top tags of the best candidates: precise "because" + variety between families
      const famOrder = top.map((f) => FAMILIES.find((x) => x.key === f.key));
      for (const c of ranked) {
        let tags = this.cache.appTags && this.cache.appTags[c.appid];
        if (!tags) {
          try {
            const r = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${c.appid}`, { signal: AbortSignal.timeout(10000) });
            const j = await r.json();
            tags = Object.keys((j && j.tags) || {}).slice(0, 8);
            (this.cache.appTags || (this.cache.appTags = {}))[c.appid] = tags;
          } catch { tags = []; }
          await new Promise((r) => setTimeout(r, 1050));
        }
        // software sold on Steam (overlays, tools…) is not a game
        if (tags.some((t) => /^(Utilities|Software|Design & Illustration|Game Development|Animation & Modeling|Video Production|Audio Production|Photo Editing|Web Publishing)$/.test(t))) { c.final = -1; continue; }
        const matched = famOrder.filter((f) => f.tags.some((t) => tags.slice(0, 6).includes(t)));
        c.fams = matched.length ? matched.map((f) => f.name) : c.fams;
        c.primary = matched.length ? matched[0].key : '?';
        c.final *= matched.length ? 1 + 0.25 * matched.length : 0.5;
      }
      ranked.sort((a, b) => b.final - a.final);
      const perFamily = {};
      const items = [];
      for (const c of ranked) {
        if (c.final < 0 || (perFamily[c.primary] || 0) >= 4) continue;
        perFamily[c.primary] = (perFamily[c.primary] || 0) + 1;
        items.push(c);
        if (items.length >= 12) break;
      }
      await this.prices(items.map((i) => i.appid));
      const result = {
        at: Date.now(),
        profile: prof,
        items: items.map((c) => {
          const p = this.cache.prices[c.appid] || {};
          return {
            appid: c.appid, name: c.name, because: c.fams.slice(0, 3),
            rating: Math.round(c.ratio * 100), header: `${CDN}/${c.appid}/header.jpg`,
            url: `https://store.steampowered.com/app/${c.appid}`,
            price: p.final || null, initial: p.initial || null, discount: p.discount || 0, free: !!p.free,
          };
        }),
      };
      this.cache.result = result;
      this.store.save();
      return result;
    } finally { this.busy = false; }
  }

  /** Cached result if fresh enough (12 h), otherwise null (call compute()). */
  cached() {
    const r = this.cache.result;
    return r && Date.now() - r.at < 12 * 3600 * 1000 ? r : null;
  }
}

module.exports = { Recommender, FAMILIES };

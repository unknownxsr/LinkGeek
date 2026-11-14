// Minimal parser for Valve's KeyValues text format (.vdf / .acf)
function parseVdf(text) {
  let i = 0;
  const n = text.length;

  function skip() {
    while (i < n) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
      if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
      break;
    }
  }

  function readString() {
    if (text[i] === '"') {
      i++;
      let s = '';
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < n) {
          const nx = text[i + 1];
          s += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
          i += 2;
        } else s += text[i++];
      }
      i++;
      return s;
    }
    let s = '';
    while (i < n && !/[\s{}"]/.test(text[i])) s += text[i++];
    return s;
  }

  function readObject() {
    const obj = {};
    while (true) {
      skip();
      if (i >= n) return obj;
      if (text[i] === '}') { i++; return obj; }
      const key = readString();
      skip();
      if (text[i] === '{') { i++; obj[key] = readObject(); }
      else obj[key] = readString();
    }
  }

  return readObject();
}

// Case-insensitive property access helper
function get(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    const found = Object.keys(cur).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found === undefined) return undefined;
    cur = cur[found];
  }
  return cur;
}

module.exports = { parseVdf, get };

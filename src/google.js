/**
 * "Sign in with Google" for a desktop app: OAuth 2.0 authorization code flow
 * with PKCE and a temporary loopback redirect (127.0.0.1), as recommended by
 * Google for installed applications. The sign-in happens in the user's own
 * browser; Linkgeek never sees the Google password.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const TIMEOUT_MS = 5 * 60 * 1000;

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function page(title, msg, ok) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#0a0c11;color:#eef1f7;font-family:"Segoe UI",system-ui,sans-serif}
.c{text-align:center;padding:40px 48px;border-radius:20px;background:#151924;border:1px solid rgba(255,255,255,.1);max-width:420px}
.i{width:64px;height:64px;border-radius:50%;margin:0 auto 18px;display:grid;place-items:center;font-size:30px;background:${ok ? 'linear-gradient(135deg,#7c5cff,#22d3ee)' : '#5a2330'}}
h1{font-size:22px;margin:0 0 8px}p{color:#8d95a8;margin:0;line-height:1.5}</style></head>
<body><div class="c"><div class="i">${ok ? '✓' : '!'}</div><h1>${title}</h1><p>${msg}</p></div></body></html>`;
}

class GoogleAuth {
  constructor(openExternal) {
    this.openExternal = openExternal;
    this.pending = null;
  }

  cancel() {
    if (this.pending) this.pending.abort(new Error('Connexion annulée'));
  }

  /** Runs the full flow and resolves with the Google profile. */
  async signIn({ clientId, clientSecret }) {
    if (!clientId) throw new Error('Identifiant client Google manquant (voir Paramètres → Compte)');
    this.cancel();

    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));

    const { code, redirectUri } = await new Promise((resolve, reject) => {
      let settled = false;
      const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
        const err = url.searchParams.get('error');
        const gotCode = url.searchParams.get('code');
        const okState = url.searchParams.get('state') === state;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (err || !gotCode || !okState) {
          res.end(page('Connexion annulée', 'Tu peux fermer cet onglet et revenir sur Linkgeek.', false));
          finish(new Error(err === 'access_denied' ? 'Connexion refusée' : 'Réponse Google invalide'));
        } else {
          res.end(page('Connexion réussie', 'Ton compte Google est relié à Linkgeek. Tu peux fermer cet onglet.', true));
          finish(null, gotCode);
        }
      });
      const timer = setTimeout(() => finish(new Error('Délai de connexion dépassé')), TIMEOUT_MS);
      const finish = (e, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pending = null;
        setTimeout(() => server.close(), 500);
        if (e) reject(e); else resolve({ code: value, redirectUri: server.redirectUri });
      };
      this.pending = { abort: (e) => finish(e) };

      server.on('error', (e) => finish(e));
      server.listen(0, '127.0.0.1', () => {
        server.redirectUri = `http://127.0.0.1:${server.address().port}`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: server.redirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state,
          prompt: 'select_account',
        });
        this.openExternal(`${AUTH_URL}?${params}`);
      });
    });

    // Exchange the code for a short-lived access token
    const body = new URLSearchParams({
      code, client_id: clientId, redirect_uri: redirectUri,
      grant_type: 'authorization_code', code_verifier: verifier,
    });
    if (clientSecret) body.set('client_secret', clientSecret);
    const tr = await fetch(TOKEN_URL, { method: 'POST', body });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok || !tok.access_token) {
      throw new Error('Google a refusé la connexion : ' + (tok.error_description || tok.error || tr.status));
    }

    const ur = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const info = await ur.json().catch(() => ({}));
    // Only the public profile is kept: revoke the token right away
    fetch(`${REVOKE_URL}?token=${encodeURIComponent(tok.access_token)}`, { method: 'POST' }).catch(() => {});
    if (!ur.ok || !info.sub) throw new Error('Impossible de lire le profil Google');

    return {
      account: {
        id: info.sub,
        email: info.email || null,
        name: info.name || info.given_name || null,
        picture: info.picture || null,
        linkedAt: Date.now(),
      },
      // Short-lived Google ID token, exchanged once for a Firebase session (never stored)
      idToken: tok.id_token || null,
    };
  }

  /** Downloads the Google profile picture (in high resolution) to `dest`. */
  static async downloadPicture(url, dest) {
    if (!url) return false;
    const big = url.replace(/=s\d+(-c)?$/, '=s400-c');
    const r = await fetch(big);
    if (!r.ok) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    return true;
  }
}

module.exports = { GoogleAuth };

/**
 * Bot Discord du serveur LinkGeek.
 *  - /classement  : top 10 du classement de la semaine (même données que dans le launcher)
 *  - /telecharger : lien de la dernière version
 *  - /stats       : nombre de joueurs Linkgeek
 *  - Annonce automatique de chaque nouvelle version GitHub dans le salon « mises-à-jour »
 *  - Classement de la semaine posté automatiquement le lundi matin dans « duels »
 *
 * Secrets (jamais sur GitHub) : jeton.txt (jeton Discord) et cle-firebase.json (clé du compte de service).
 */
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const GUIDE = require('./guide');
/** Salon « guide » sous « règles » + messages d'explication avec captures. */
const GUIDE_ON = true;
const admin = require('firebase-admin');

/* ---------- Configuration ---------- */
function loadEnv() {
  const f = path.join(__dirname, '.env');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  // Plus simple : le jeton seul, collé dans jeton.txt
  const j = path.join(__dirname, 'jeton.txt');
  if (!process.env.DISCORD_TOKEN && fs.existsSync(j)) {
    const t = fs.readFileSync(j, 'utf8').trim();
    if (t && !/COLLE/i.test(t)) process.env.DISCORD_TOKEN = t;
  }
}
function fail(msg) { console.error('\n❌ ' + msg + '\n'); process.exit(1); }
loadEnv();
let TOKEN = process.env.DISCORD_TOKEN;
const DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://linkgeek-edff5-default-rtdb.europe-west1.firebasedatabase.app';
const REPO = process.env.GITHUB_REPO || 'unknownxsr/linkgeek';

const KEY = path.join(__dirname, 'cle-firebase.json');
if (!fs.existsSync(KEY)) fail('cle-firebase.json introuvable (Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée).');

admin.initializeApp({ credential: admin.credential.cert(require(KEY)), databaseURL: DB_URL });
const db = admin.database();

const COLOR = 0xe63ef5;
const RELEASES = `https://github.com/${REPO}/releases/latest`;
const STATE_FILE = path.join(__dirname, 'etat.json');
const state = (() => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } })();
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

/* ---------- Données ---------- */
/** Clé de la semaine, identique au launcher : date du lundi (heure locale). */
function weekKey(offsetWeeks = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7 * offsetWeeks);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
async function leaderboard(week, n = 10) {
  const snap = await db.ref(`weekly/${week}`).orderByChild('hours').limitToLast(n).get();
  const rows = [];
  snap.forEach((c) => { const v = c.val() || {}; if (v.hours > 0) rows.push({ name: v.name || 'Joueur', level: v.level || 1, hours: v.hours }); });
  return rows.sort((a, b) => b.hours - a.hours);
}
function leaderboardEmbed(rows, week, title) {
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} ${r.name} — **${r.hours} h** · niv. ${r.level}`);
  return new EmbedBuilder().setColor(COLOR).setTitle(title)
    .setDescription(lines.length ? lines.join('\n') : 'Personne n\'a encore joué cette semaine. À vous de jouer ! 🎮')
    .setFooter({ text: `Semaine du ${week.split('-').reverse().join('/')} · Linkgeek` });
}
async function latestRelease() {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'linkgeek-bot', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error('GitHub ' + r.status);
  return r.json();
}
const findChannel = (guild, part) => guild.channels.cache.find((c) => c.isTextBased() && c.name.includes(part));

/* ---------- Discord ---------- */
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const en = (t) => ({ 'en-US': t, 'en-GB': t });
const COMMANDS = [
  { name: 'classement', description: 'Top 10 des joueurs Linkgeek de la semaine', description_localizations: en('Top 10 Linkgeek players of the week') },
  { name: 'telecharger', description: 'Lien de téléchargement de la dernière version de Linkgeek', description_localizations: en('Download link for the latest Linkgeek version') },
  { name: 'stats', description: 'Nombre de joueurs Linkgeek', description_localizations: en('Number of Linkgeek players') },
  { name: 'lier', description: 'Lier ton compte Linkgeek : ton rang devient un rôle ici', description_localizations: en('Link your Linkgeek account: your rank becomes a role here'), options: [{ type: 3, name: 'code', description: 'Le code à 6 caractères (Linkgeek → Paramètres → Compte)', description_localizations: en('The 6-character code (Linkgeek → Settings → Account)'), required: true, min_length: 6, max_length: 6 }] },
  { name: 'delier', description: 'Délier ton compte Linkgeek (retire ton rôle de rang)', description_localizations: en('Unlink your Linkgeek account (removes your rank role)') },
];
/** Réponse dans la langue de Discord du membre : français si son Discord est en français, sinon anglais. */
const T = (i, fr, enText) => (String(i.locale || '').startsWith('fr') ? fr : enText);

/* ---------- Comptes liés : rang Linkgeek → rôle Discord ----------
 * Le launcher écrit discordLinks/{uid} = { code, at } ; /lier <code> écrit discord/{uid} = { id, name, at }.
 * Toutes les 10 minutes (et juste après /lier), chaque membre lié reçoit le rôle de son rang
 * (niveau lu dans users/{uid}/level, table des rangs dans config/ranks), et perd les autres rôles de rang.
 * Il faut au bot la permission « Gérer les rôles », et son rôle doit être AU-DESSUS des rôles de rang.
 */
const DEFAULT_RANKS = [
  { min: 1, key: 'rookie', name: 'Recrue' }, { min: 5, key: 'bronze', name: 'Bronze' }, { min: 10, key: 'silver', name: 'Argent' },
  { min: 30, key: 'gold', name: 'Or' }, { min: 40, key: 'platinum', name: 'Platine' }, { min: 50, key: 'diamond', name: 'Diamant' },
  { min: 60, key: 'emerald', name: 'Émeraude' }, { min: 70, key: 'master', name: 'Master' },
];
const RANK_COLORS = { rookie: 0x9aa4b2, bronze: 0xcd7f32, silver: 0xc8d2de, gold: 0xf2b92c, platinum: 0x9fd8ff, diamond: 0x5ad1ff, emerald: 0x3ddc84, master: 0xe63ef5 };
const LINK_TTL = 15 * 60 * 1000;
const EPHEMERAL = 64;

async function rankTable() {
  try {
    const v = (await db.ref('config/ranks').get()).val();
    const list = (Array.isArray(v) ? v : Object.values(v || {})).filter((r) => r && r.key && r.name && r.min >= 1);
    if (list.length === DEFAULT_RANKS.length) return list.sort((a, b) => a.min - b.min);
  } catch { /* défaut */ }
  return DEFAULT_RANKS;
}
const rankFor = (level, ranks) => [...ranks].reverse().find((r) => level >= r.min) || ranks[0];

/** Les rôles de rang du serveur (créés s'ils manquent, renommés si l'admin a changé les noms). */
async function rankRoles(guild, ranks) {
  state.rankRoles = state.rankRoles || {};
  const ids = state.rankRoles[guild.id] || (state.rankRoles[guild.id] = {});
  await guild.roles.fetch();
  const roles = {};
  for (const r of ranks) {
    let role = (ids[r.key] && guild.roles.cache.get(ids[r.key])) || guild.roles.cache.find((x) => x.name === r.name);
    if (!role) {
      role = await guild.roles.create({ name: r.name, color: RANK_COLORS[r.key] || 0x99aab5, hoist: false, mentionable: false, reason: 'Rang Linkgeek' });
      console.log('🏷️ Rôle créé :', r.name);
    } else if (role.name !== r.name) await role.setName(r.name, 'Rang Linkgeek renommé').catch(() => {});
    ids[r.key] = role.id;
    roles[r.key] = role;
  }
  saveState();
  return roles;
}

/** Donne au membre le rôle de son rang et lui retire les autres. */
async function syncMember(guild, ranks, roles, uid, discordId) {
  const level = Number((await db.ref(`users/${uid}/level`).get()).val()) || 1;
  const rank = rankFor(level, ranks);
  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return { level, rank, absent: true };
  const want = roles[rank.key];
  const extra = Object.values(roles).filter((r) => r.id !== want.id && member.roles.cache.has(r.id));
  if (extra.length) await member.roles.remove(extra, 'Rang Linkgeek');
  if (!member.roles.cache.has(want.id)) await member.roles.add(want, 'Rang Linkgeek');
  return { level, rank };
}
async function clearMember(guild, discordId) {
  const ids = Object.values((state.rankRoles || {})[guild.id] || {});
  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return;
  const has = ids.filter((id) => member.roles.cache.has(id));
  if (has.length) await member.roles.remove(has, 'Compte Linkgeek délié');
}

/** Tous les comptes liés (toutes les 10 minutes). Les comptes déliés perdent leurs rôles de rang. */
let syncing = false;
async function syncAllRanks() {
  if (syncing) return;
  syncing = true;
  try {
    const links = (await db.ref('discord').get()).val() || {};
    const ranks = await rankTable();
    const before = state.linked || {};
    const now = {};
    for (const [uid, l] of Object.entries(links)) if (l && /^\d{15,22}$/.test(String(l.id))) now[uid] = String(l.id);
    // nobody linked yet: no role is created on the server
    if (!Object.keys(now).length && !Object.keys(before).length) { syncing = false; return; }
    for (const guild of client.guilds.cache.values()) {
      let roles;
      try { roles = await rankRoles(guild, ranks); } catch (e) { console.error('Rôles de rang :', e.message, '→ donne au bot la permission « Gérer les rôles »'); continue; }
      for (const [uid, id] of Object.entries(now)) await syncMember(guild, ranks, roles, uid, id).catch((e) => console.error('Rang', id, ':', e.message));
      const kept = new Set(Object.values(now));
      for (const id of new Set(Object.values(before))) if (!kept.has(id)) await clearMember(guild, id).catch(() => {});
    }
    state.linked = now; saveState();
  } catch (e) { console.error('Synchro des rangs :', e.message); }
  syncing = false;
}

async function cmdLier(i) {
  await i.deferReply({ flags: EPHEMERAL });
  const code = String(i.options.getString('code') || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return i.editReply(T(i, '❌ Le code fait 6 caractères (lettres et chiffres). Tu le trouves dans Linkgeek → Paramètres → Compte → « Lier mon compte Discord ».', '❌ The code is 6 characters (letters and numbers). You will find it in Linkgeek → Settings → Account → "Link my Discord account".'));
  const snap = await db.ref('discordLinks').orderByChild('code').equalTo(code).get();
  let uid = null; let at = 0;
  snap.forEach((c) => { uid = c.key; at = Number((c.val() || {}).at) || 0; });
  if (!uid || Date.now() - at > LINK_TTL) return i.editReply(T(i, '❌ Code inconnu ou expiré (il est valable 15 minutes). Demande un nouveau code dans Linkgeek → Paramètres → Compte.', '❌ Unknown or expired code (it is valid for 15 minutes). Get a new code in Linkgeek → Settings → Account.'));
  // un seul compte Linkgeek par compte Discord
  const updates = { [`discord/${uid}`]: { id: i.user.id, name: i.user.username, at: admin.database.ServerValue.TIMESTAMP }, [`discordLinks/${uid}`]: null };
  const prev = await db.ref('discord').orderByChild('id').equalTo(i.user.id).get();
  prev.forEach((c) => { if (c.key !== uid) updates[`discord/${c.key}`] = null; });
  await db.ref().update(updates);
  state.linked = { ...(state.linked || {}), [uid]: i.user.id }; saveState();
  try {
    const ranks = await rankTable();
    const r = await syncMember(i.guild, ranks, await rankRoles(i.guild, ranks), uid, i.user.id);
    return i.editReply(T(i, `✅ Compte Linkgeek lié ! Niveau **${r.level}** · rôle **${r.rank.name}**. Il se met à jour tout seul quand tu montes de rang.`, `✅ Linkgeek account linked! Level **${r.level}** · role **${r.rank.name}**. It updates by itself when you rank up.`));
  } catch (e) {
    console.error('Rôle de rang :', e.message);
    return i.editReply(T(i, '✅ Compte Linkgeek lié ! Ton rôle de rang arrivera dès que le bot aura la permission de gérer les rôles.', '✅ Linkgeek account linked! Your rank role will arrive shortly.'));
  }
}
async function cmdDelier(i) {
  await i.deferReply({ flags: EPHEMERAL });
  const prev = await db.ref('discord').orderByChild('id').equalTo(i.user.id).get();
  const updates = {};
  prev.forEach((c) => { updates[`discord/${c.key}`] = null; });
  if (!Object.keys(updates).length) return i.editReply(T(i, 'Ton compte Discord n\'est lié à aucun compte Linkgeek.', 'Your Discord account is not linked to any Linkgeek account.'));
  await db.ref().update(updates);
  await clearMember(i.guild, i.user.id).catch(() => {});
  const l = { ...(state.linked || {}) }; for (const k of Object.keys(updates)) delete l[k.split('/')[1]]; state.linked = l; saveState();
  return i.editReply(T(i, '✅ Compte Linkgeek délié : ton rôle de rang a été retiré.', '✅ Linkgeek account unlinked: your rank role has been removed.'));
}

client.once('clientReady', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setActivity('Linkgeek', { type: ActivityType.Playing });
  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(COMMANDS).catch((e) => console.error('Commandes :', e.message));
  }
  await setupProfile();
  for (const guild of client.guilds.cache.values()) await postRules(guild).catch((e) => console.error('Règlement :', e.message));
  for (const guild of client.guilds.cache.values()) await postLinkInfo(guild).catch((e) => console.error('Salon lier-son-compte :', e.message));
  for (const guild of client.guilds.cache.values()) await postEnglishWelcome(guild).catch((e) => console.error('english-chat :', e.message));
  await guideAll();
  setInterval(guideAll, 3 * 60 * 1000); // réessaie tant que le guide n'a pas pu être posté (ex. permission manquante)
  await checkRelease();
  setInterval(checkRelease, 3 * 60 * 1000);
  setInterval(weeklyPost, 30 * 60 * 1000);
  await syncAllRanks();
  setInterval(syncAllRanks, 10 * 60 * 1000);
});

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  try {
    if (i.commandName === 'classement') {
      await i.deferReply();
      const w = weekKey();
      await i.editReply({ embeds: [leaderboardEmbed(await leaderboard(w), w, '🏆 Classement de la semaine')] });
    } else if (i.commandName === 'telecharger') {
      await i.deferReply();
      const rel = await latestRelease().catch(() => null);
      const e = new EmbedBuilder().setColor(COLOR).setTitle(T(i, '⬇️ Télécharger Linkgeek', '⬇️ Download Linkgeek')).setURL(RELEASES)
        .setDescription(T(i,
          `${rel ? `Dernière version : **${rel.tag_name}**\n` : ''}[Télécharger l'installateur](${RELEASES}) (fichier \`Linkgeek-Setup-x.x.x.exe\`).\n\nSi Windows affiche un avertissement : **Informations complémentaires** → **Exécuter quand même**.`,
          `${rel ? `Latest version: **${rel.tag_name}**\n` : ''}[Download the installer](${RELEASES}) (file \`Linkgeek-Setup-x.x.x.exe\`).\n\nIf Windows shows a warning: **More info** → **Run anyway**.`));
      await i.editReply({ embeds: [e] });
    } else if (i.commandName === 'lier') {
      await cmdLier(i);
    } else if (i.commandName === 'delier') {
      await cmdDelier(i);
    } else if (i.commandName === 'stats') {
      await i.deferReply();
      const n = (await db.ref('meta/memberCount').get()).val() || 0;
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('📊 Linkgeek').setDescription(T(i, `**${n}** joueurs ont rejoint Linkgeek en ligne.`, `**${n}** players have joined Linkgeek online.`))] });
    }
  } catch (e) {
    console.error(e);
    const msg = { content: T(i, 'Oups, une erreur est survenue. Réessaie dans un instant.', 'Oops, something went wrong. Please try again in a moment.'), ephemeral: true };
    if (i.deferred || i.replied) i.editReply(msg).catch(() => {}); else i.reply(msg).catch(() => {});
  }
});


/* ---------- Profil, règlement, téléchargement ---------- */
const BIO = 'Bot officiel de Linkgeek, le launcher qui réunit tous tes jeux PC (Steam, Epic, Xbox, Battle.net, Ubisoft, EA, GOG).\n\n'
  + '• Annonce les nouvelles versions\n• /classement : top de la semaine\n• /telecharger : dernière version\n• /stats : joueurs Linkgeek\n• /lier : ton rang Linkgeek devient un rôle\n\n'
  + 'Téléchargement : ' + RELEASES;

async function setupProfile() {
  try {
    if (state.bio !== BIO) { await client.application.edit({ description: BIO }); state.bio = BIO; saveState(); console.log('📝 Bio mise à jour'); }
  } catch (e) { console.error('Bio :', e.message); }
  try {
    // Photo de profil : avatar.png (change-la quand le fichier change, grâce à sa taille + date)
    const av = path.join(__dirname, 'avatar.png');
    if (fs.existsSync(av)) {
      const st = fs.statSync(av); const sig = `${st.size}:${st.mtimeMs}`;
      if (state.avatar !== sig) { await client.user.setAvatar(av); state.avatar = sig; saveState(); console.log('🖼️ Photo de profil mise à jour'); }
    }
  } catch (e) { console.error('Photo de profil :', e.message); }
  try {
    if (!state.banner) { await client.user.setBanner(path.join(__dirname, 'banniere.png')); state.banner = true; saveState(); console.log('🖼️ Bannière noire appliquée'); }
  } catch (e) { console.error('Bannière :', e.message); }
}

const RULES = [
  ['1. Respect', 'Sois respectueux envers tout le monde. Insultes, harcèlement, racisme, sexisme et discriminations sont interdits.'],
  ['2. Pas de spam', 'Pas de spam, de flood, de mentions abusives ni de messages en majuscules à répétition.'],
  ['3. Pas de publicité', 'Aucune publicité (serveurs, réseaux, liens commerciaux) sans l\'accord d\'un modérateur, y compris en message privé.'],
  ['4. Contenu approprié', 'Aucun contenu choquant, violent, sexuel ou illégal. Pas de pseudo ni d\'avatar inapproprié.'],
  ['5. Les bons salons', 'Utilise chaque salon pour son sujet : #aide pour les questions, #bugs pour les problèmes, #suggestions pour tes idées.'],
  ['6. Pas de triche', 'Ne partage aucune méthode pour tricher dans Linkgeek (XP, niveaux, cartes) ni de version modifiée du launcher.'],
  ['7. Sécurité', 'Ne partage jamais tes mots de passe, codes ou jetons. L\'équipe Linkgeek ne te les demandera jamais.'],
  ['8. Modération', 'Les décisions des modérateurs s\'appliquent. En cas de souci, contacte un @Modérateur en message privé.'],
  ['9. Règles de Discord', 'Les Conditions d\'utilisation et les Règles de la communauté de Discord s\'appliquent aussi ici.'],
];
function rulesEmbed() {
  return new EmbedBuilder().setColor(COLOR).setTitle('📜 Règlement du serveur LinkGeek')
    .setDescription('Bienvenue ! Pour que tout le monde passe un bon moment, merci de respecter ces règles.')
    .addFields(RULES.map(([name, value]) => ({ name, value })))
    .setFooter({ text: 'Le non-respect du règlement peut entraîner un avertissement, une exclusion ou un bannissement.' });
}
const RULES_EN = [
  ['1. Respect', 'Be respectful to everyone. Insults, harassment, racism, sexism and discrimination are not allowed.'],
  ['2. No spam', 'No spam, flooding, mass mentions or repeated all-caps messages.'],
  ['3. No advertising', 'No advertising (servers, socials, commercial links) without a moderator\'s approval, including in DMs.'],
  ['4. Appropriate content', 'No shocking, violent, sexual or illegal content. No inappropriate username or avatar.'],
  ['5. The right channels', 'Use each channel for its topic. English speakers: #english-chat to talk, #english-help for questions.'],
  ['6. No cheating', 'Do not share any way to cheat in Linkgeek (XP, levels, cards) or any modified version of the launcher.'],
  ['7. Safety', 'Never share your passwords, codes or tokens. The Linkgeek team will never ask for them.'],
  ['8. Moderation', 'Moderators\' decisions apply. If you have an issue, DM a @Modérateur.'],
  ['9. Discord rules', 'Discord\'s Terms of Service and Community Guidelines also apply here.'],
];
function rulesEmbedEn() {
  return new EmbedBuilder().setColor(COLOR).setTitle('🇬🇧 LinkGeek server rules')
    .setDescription('Welcome! So that everyone has a good time, please follow these rules.')
    .addFields(RULES_EN.map(([name, value]) => ({ name, value })))
    .setFooter({ text: 'Breaking the rules may lead to a warning, a timeout or a ban.' });
}
/** Publie le message une seule fois puis le met à jour (pas de doublon). */
async function upsert(guild, key, ch, payload) {
  state.msgs = state.msgs || {};
  const id = state.msgs[`${guild.id}:${key}`];
  if (id) {
    const m = await ch.messages.fetch(id).catch(() => null);
    if (m) { await m.edit(payload); return; }
  }
  const m = await ch.send(payload);
  state.msgs[`${guild.id}:${key}`] = m.id; saveState();
}
async function postRules(guild) {
  const ch = findChannel(guild, 'règles');
  if (ch) await upsert(guild, 'rules', ch, { embeds: [rulesEmbed(), rulesEmbedEn()] });
}
/** Salon « lier-son-compte » : message d'explication + seules les commandes sont possibles (salon toujours propre). */
function linkEmbed() {
  return new EmbedBuilder().setColor(COLOR).setTitle('🔗 Lier ton compte Linkgeek et Discord')
    .setDescription('Relie ton compte Linkgeek à Discord : ton **rang Linkgeek devient un rôle** sur le serveur, et il se met à jour tout seul quand tu montes de niveau.')
    .addFields(
      { name: '1. Ouvre Linkgeek', value: 'Va dans **Paramètres → Compte** puis clique sur **« Lier mon compte Discord »**.' },
      { name: '2. Copie ton code', value: 'Un code de **6 caractères** s\'affiche. Il est valable **15 minutes**.' },
      { name: '3. Tape la commande ici', value: '`/lier code` en remplaçant *code* par le tien. Le bot te répond en privé avec ton niveau et ton rôle.' },
      { name: 'Envie de délier ?', value: '`/delier` retire le lien et ton rôle de rang.' },
    )
    .setFooter({ text: 'Ce salon n\'accepte que les commandes. Une question ? Passe par #aide. Ne partage jamais ton code avec quelqu\'un.' });
}
function linkEmbedEn() {
  return new EmbedBuilder().setColor(COLOR).setTitle('🇬🇧 Link your Linkgeek and Discord accounts')
    .setDescription('Link your Linkgeek account to Discord: your **Linkgeek rank becomes a role** on the server, and it updates by itself when you level up.')
    .addFields(
      { name: '1. Open Linkgeek', value: 'Go to **Settings → Account** and click **"Link my Discord account"**.' },
      { name: '2. Copy your code', value: 'A **6-character** code appears. It is valid for **15 minutes**.' },
      { name: '3. Type the command here', value: '`/lier code`, replacing *code* with yours. The bot replies privately with your level and role.' },
      { name: 'Want to unlink?', value: '`/delier` removes the link and your rank role.' },
    )
    .setFooter({ text: 'This channel only accepts commands. Never share your code with anyone.' });
}
async function postLinkInfo(guild) {
  const ch = findChannel(guild, 'lier-son-compte');
  if (!ch) return;
  state.linkPerms = state.linkPerms || {};
  if (!state.linkPerms[guild.id]) {
    try {
      await ch.permissionOverwrites.edit(client.user.id, { ViewChannel: true, SendMessages: true, EmbedLinks: true });
      await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
      state.linkPerms[guild.id] = true; saveState(); console.log('🔒 Salon lier-son-compte : commandes uniquement');
    } catch (e) { console.error('Permissions lier-son-compte :', e.message); }
  }
  await upsert(guild, 'link', ch, { embeds: [linkEmbed(), linkEmbedEn()] });
}
/** Message d'accueil épinglé en haut de #english-chat. */
async function postEnglishWelcome(guild) {
  const ch = findChannel(guild, 'english-chat');
  if (!ch) return;
  const m = (part) => { const c = findChannel(guild, part); return c ? `<#${c.id}>` : `#${part}`; };
  const e = new EmbedBuilder().setColor(COLOR).setTitle('👋 Welcome to the LinkGeek community!')
    .setDescription('This is the place for English speakers. Chat, share your best cards and find teammates here.\n\n'
      + `📖 **Guide** (English below each section): ${m('guide')}\n`
      + `📜 **Rules**: ${m('règles')}\n`
      + `⬇️ **Download Linkgeek**: ${m('télécharger')}\n`
      + `🔗 **Link your account** (your rank becomes a role): ${m('lier-son-compte')}\n`
      + `❓ **Need help?** ${m('english-help')}\n\n`
      + 'You can type `/telecharger`, `/classement` (weekly top 10) or `/stats` anywhere. Have fun! 🎮');
  await upsert(guild, 'enwelcome', ch, { embeds: [e] });
}
/** Crée le salon « guide » juste sous « règles » (mêmes permissions : lecture seule) s'il n'existe pas. */
async function guideChannel(guild) {
  const existing = findChannel(guild, 'guide');
  if (existing) return existing;
  const rules = findChannel(guild, 'règles');
  const name = rules ? rules.name.replace(/règles/i, 'guide').replace(/^\p{Extended_Pictographic}️?/u, '📖') : '📖・guide';
  const ch = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic: 'Tout ce que tu peux faire avec Linkgeek, en images.',
    parent: rules ? rules.parentId : null,
    permissionOverwrites: rules ? rules.permissionOverwrites.cache.map((o) => ({ id: o.id, type: o.type, allow: o.allow, deny: o.deny })) : [],
  });
  if (rules) await ch.setPosition(rules.position + 1).catch(() => {});
  console.log('📖 Salon créé :', ch.name);
  return ch;
}
const guideDone = new Set();
let guideErr = '';
async function guideAll() {
  if (!GUIDE_ON) return;
  for (const guild of client.guilds.cache.values()) {
    if (guideDone.has(guild.id)) continue;
    try { await postGuide(guild); guideDone.add(guild.id); console.log('📖 Guide posté'); guideErr = ''; } catch (e) {
      if (e.message !== guideErr) console.error('Guide :', e.message, '→ donne au rôle du bot « Gérer les salons » (ou crée un salon « guide »), il réessaie toutes les 3 min');
      guideErr = e.message;
    }
  }
}
/** Change ce numéro pour supprimer l'ancien guide et le republier en entier (nouveaux messages). */
const GUIDE_VERSION = 4;
async function postGuide(guild) {
  const ch = await guideChannel(guild);
  state.guideVersion = state.guideVersion || {};
  if (state.guideVersion[guild.id] !== GUIDE_VERSION) {
    const old = await ch.messages.fetch({ limit: 100 }).catch(() => null);
    if (old) for (const m of old.values()) if (m.author.id === client.user.id) await m.delete().catch(() => {});
    for (const k of Object.keys(state.msgs || {})) if (k.startsWith(`${guild.id}:guide:`)) delete state.msgs[k];
    saveState();
    console.log('🧹 Ancien guide supprimé');
  }
  const mention = (part, fallback) => { const c = findChannel(guild, part); return c ? `<#${c.id}>` : fallback; };
  const fill = (s) => s.replace('{telecharger}', mention('télécharger', '/telecharger')).replace('{aide}', mention('aide', 'le salon #aide'));
  const fillEn = (s) => s.replace('{telecharger}', mention('télécharger', '/telecharger')).replace('{aide}', mention('english-help', mention('aide', '#aide')));
  const parts = [{ title: GUIDE.INTRO.title, text: GUIDE.INTRO.text, image: null }, ...GUIDE.SECTIONS];
  const partsEn = [GUIDE.INTRO_EN, ...GUIDE.SECTIONS_EN];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const e = new EmbedBuilder().setColor(COLOR).setTitle(`🇫🇷 ${p.title}`).setDescription(fill(p.text));
    const eEn = new EmbedBuilder().setColor(COLOR).setTitle(`🇬🇧 ${partsEn[i].title}`).setDescription(fillEn(partsEn[i].text));
    const files = [];
    if (p.image) {
      files.push(new AttachmentBuilder(path.join(__dirname, 'guide', p.image), { name: p.image }));
      eEn.setImage(`attachment://${p.image}`); // la capture en dernier, sous les deux textes
    }
    if (i === parts.length - 1) eEn.setFooter({ text: 'Linkgeek · gratuit / free · Windows 10 & 11' });
    await upsert(guild, `guide:${i}`, ch, { embeds: [e, eEn], files, attachments: [] });
  }
  state.guideVersion[guild.id] = GUIDE_VERSION; saveState();
}
async function postDownload(guild, rel) {
  const ch = findChannel(guild, 'télécharger');
  if (!ch) return;
  const key = `dl3:${rel.tag_name}`; // dl2 : version bilingue (force la mise à jour du message)
  if (state.msgs && state.msgs[`${guild.id}:dlVersion`] === key) return;
  const exe = (rel.assets || []).find((a) => /\.exe$/i.test(a.name));
  const zip = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
  const e = new EmbedBuilder().setColor(COLOR).setTitle('⬇️ Télécharger Linkgeek')
    .setDescription(`**Version actuelle : ${rel.tag_name}**\n\n`
      + '1. Clique sur le bouton ci-dessous pour télécharger l\'installateur.\n'
      + '2. Lance le fichier `Linkgeek-Setup.exe`.\n'
      + '3. Si Windows affiche « Windows a protégé votre ordinateur » : **Informations complémentaires** → **Exécuter quand même**.\n\n'
      + '**Windows bloque complètement ?** (« Le Contrôle intelligent des applications a bloqué… », sans bouton pour continuer) → prends la **version .zip** :\n'
      + '1. Clic droit sur le `.zip` → **Propriétés** → coche **Débloquer** → OK.\n'
      + '2. Clic droit → **Extraire tout**.\n'
      + '3. Dans le dossier extrait (pas dans `app`), double-clique sur **Installer Linkgeek** et réponds **O** + Entrée aux 2 questions.\n\n'
      + 'Linkgeek se met ensuite à jour tout seul. Un problème ? Passe sur #aide.')
    .setFooter({ text: 'Windows 10 et 11 · Gratuit' });
  const eEn = new EmbedBuilder().setColor(COLOR).setTitle('🇬🇧 Download Linkgeek')
    .setDescription(`**Current version: ${rel.tag_name}**\n\n`
      + '1. Click the button below to download the installer.\n'
      + '2. Run the `Linkgeek-Setup.exe` file.\n'
      + '3. If Windows says "Windows protected your PC": **More info** → **Run anyway**.\n\n'
      + '**Windows blocks it completely?** ("Smart App Control blocked…", no way to continue) → use the **.zip version**:\n'
      + '1. Right-click the `.zip` → **Properties** → tick **Unblock** → OK.\n'
      + '2. Right-click → **Extract All**.\n'
      + '3. In the extracted folder (not in `app`), double-click **Installer Linkgeek** and answer **O** + Enter to the 2 questions.\n\n'
      + 'Linkgeek then updates by itself. A problem? Ask in #english-help.')
    .setFooter({ text: 'Windows 10 & 11 · Free' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(`Télécharger / Download ${rel.tag_name}`).setEmoji('⬇️').setURL(exe ? exe.browser_download_url : RELEASES),
    ...(zip ? [new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Version .zip (si bloqué / if blocked)').setEmoji('🗜️').setURL(zip.browser_download_url)] : []),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Toutes les versions / All versions').setURL(`https://github.com/${REPO}/releases`),
  );
  await upsert(guild, 'download', ch, { embeds: [e, eEn], components: [row] });
  state.msgs[`${guild.id}:dlVersion`] = key; saveState();
}

/** Annonce chaque nouvelle version publiée sur GitHub. */
async function checkRelease() {
  try {
    const rel = await latestRelease();
    if (!rel) return;
    for (const guild of client.guilds.cache.values()) await postDownload(guild, rel).catch((e) => console.error('Télécharger :', e.message));
    if (state.lastRelease === rel.tag_name) return;
    for (const guild of client.guilds.cache.values()) {
      const ch = findChannel(guild, 'mises-à-jour');
      if (!ch) continue;
      const notes = (rel.body || '').trim();
      const e = new EmbedBuilder().setColor(COLOR).setTitle(`🆕 ${rel.name || rel.tag_name} est disponible !`).setURL(rel.html_url)
        .setDescription(`${notes && notes !== rel.name ? notes.slice(0, 3500) + '\n\n' : ''}Linkgeek se met à jour tout seul. Nouveau ? [Télécharge-le ici](${RELEASES}).\n🇬🇧 Linkgeek updates by itself. New here? [Download it here](${RELEASES}).`)
        .setTimestamp(new Date(rel.published_at));
      await ch.send({ embeds: [e] });
    }
    state.lastRelease = rel.tag_name; saveState();
    console.log('📢 Version annoncée :', rel.tag_name);
  } catch (e) { console.error('Vérification GitHub :', e.message); }
}

/** Le lundi matin : podium de la semaine écoulée. */
async function weeklyPost() {
  const now = new Date();
  if (now.getDay() !== 1 || now.getHours() < 9) return;
  const last = weekKey(-1);
  if (state.lastWeekly === last) return;
  try {
    const rows = await leaderboard(last);
    for (const guild of client.guilds.cache.values()) {
      const ch = findChannel(guild, 'duels') || findChannel(guild, 'général');
      if (ch) await ch.send({ embeds: [leaderboardEmbed(rows, last, '🏁 Résultats de la semaine')] });
    }
    state.lastWeekly = last; saveState();
  } catch (e) { console.error('Classement hebdo :', e.message); }
}

/** Premier lancement : demande le jeton dans la fenêtre et l'enregistre dans jeton.txt. */
function askToken() {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n🔑 Colle le jeton de ton bot (clic droit dans cette fenêtre), puis appuie sur Entrée :');
    rl.question('> ', (t) => { rl.close(); resolve(String(t || '').trim()); });
  });
}
(async () => {
  if (!TOKEN) {
    TOKEN = await askToken();
    if (!TOKEN) fail('Aucun jeton collé.');
    fs.writeFileSync(path.join(__dirname, 'jeton.txt'), TOKEN);
    console.log('✅ Jeton enregistré, tu n\'auras plus à le coller.');
  }
  client.login(TOKEN).catch((e) => {
    try { fs.writeFileSync(path.join(__dirname, 'jeton.txt'), 'COLLE-TON-JETON-ICI'); } catch {}
    fail('Connexion à Discord impossible : ' + e.message + '\nLe jeton est sans doute incorrect : relance et colle-le à nouveau.');
  });
})();

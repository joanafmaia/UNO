import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACK_MIGRATE,
  CARD_BACK_CATALOG,
  challengeForDate,
  FELT_CATALOG,
  FELT_MIGRATE,
  FRAME_CATALOG,
  FRAME_MIGRATE,
  isBotId,
  isCosmeticUnlocked,
  sanitizeNickname,
  todayKey,
  resolveAvatarId,
} from "../game/cosmetics.js";
import { playersCollection } from "./mongo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "players.json");
const CARTOON_DIR = path.join(__dirname, "..", "..", "client", "public", "assets", "avatars", "cartoon");

export const DEFAULT_AVATARS = ["educado", "shiba", "laranja"];

export const AVATAR_CATALOG = [
  { id: "educado", file: "educado.jpg", unlockWins: 0 },
  { id: "shiba", file: "shiba.jpg", unlockWins: 0 },
  { id: "laranja", file: "laranja.jpg", unlockWins: 0 },
  { id: "blep", file: "blep.jpg", unlockWins: 1 },
  { id: "careta", file: "careta.jpg", unlockWins: 1 },
  { id: "julgamento", file: "julgamento.jpg", unlockWins: 2 },
  { id: "chefe", file: "chefe.jpg", unlockWins: 3 },
  { id: "sideeye", file: "sideeye.jpg", unlockWins: 4 },
  { id: "choro", file: "choro.jpg", unlockWins: 5 },
  { id: "nice", file: "nice.jpg", unlockWins: 6 },
  { id: "piscadela", file: "piscadela.jpg", unlockWins: 7 },
  { id: "lambe", file: "lambe.jpg", unlockWins: 8 },
  { id: "sofa", file: "sofa.jpg", unlockWins: 9 },
  { id: "smoking", file: "smoking.jpg", unlockWins: 10 },
];

export function listCartoonAvatars() {
  try {
    fs.mkdirSync(CARTOON_DIR, { recursive: true });
    const seen = new Set();
    return fs
      .readdirSync(CARTOON_DIR)
      .filter((name) => /^[a-zA-Z0-9_-]+\.jpg$/i.test(name))
      .sort((a, b) => a.localeCompare(b, "pt"))
      .map((file) => {
        const base = file.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "toon";
        let id = base;
        let n = 2;
        while (seen.has(id) || AVATAR_CATALOG.some((a) => a.id === id)) {
          id = `${base}_${n++}`.slice(0, 40);
        }
        seen.add(id);
        const index = seen.size - 1;
        return {
          id,
          file: `cartoon/${file}`,
          unlockWins: index < 3 ? 0 : index - 2,
          group: "cartoon",
        };
      });
  } catch {
    return [];
  }
}

export function allAvatars() {
  return [
    ...AVATAR_CATALOG.map((a) => ({ ...a, group: "animals" })),
    ...listCartoonAvatars(),
  ];
}

function emptyPlayer(discordId, username) {
  return {
    discord_id: discordId,
    username: username || "Jogador",
    nickname: "",
    selected_avatar: "educado",
    selected_felt: "classic",
    selected_card_back: "classic",
    selected_frame: "none",
    equipped_title: "",
    wins: 0,
    losses: 0,
    points: 0,
    plus4_played: 0,
    uno_shouts: 0,
    catches: 0,
    streak: 0,
    unlocked_avatars: [...DEFAULT_AVATARS],
    titles: [],
    daily: null,
  };
}

function migrateAvatarId(id) {
  return resolveAvatarId(id);
}

function publicPlayer(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

function normalizePlayer(p) {
  const merged = { ...emptyPlayer(p.discord_id, p.username), ...p };
  delete merged._id;
  merged.selected_felt = FELT_MIGRATE[merged.selected_felt] || merged.selected_felt;
  merged.selected_card_back = BACK_MIGRATE[merged.selected_card_back] || merged.selected_card_back;
  merged.selected_frame = FRAME_MIGRATE[merged.selected_frame] || merged.selected_frame;
  merged.selected_avatar = migrateAvatarId(merged.selected_avatar);
  merged.unlocked_avatars = [...new Set((merged.unlocked_avatars || DEFAULT_AVATARS).map(migrateAvatarId))];
  return merged;
}

async function loadPlayer(discordId) {
  const doc = await playersCollection().findOne({ discord_id: discordId });
  return doc ? normalizePlayer(publicPlayer(doc)) : null;
}

async function savePlayer(player) {
  const doc = { ...player };
  delete doc._id;
  await playersCollection().replaceOne({ discord_id: doc.discord_id }, doc, { upsert: true });
  return doc;
}

function ensureDaily(player) {
  const date = todayKey();
  if (!player.daily || player.daily.date !== date) {
    const challenge = challengeForDate(date);
    player.daily = {
      date,
      id: challenge.id,
      target: challenge.target,
      progress: 0,
      done: false,
    };
  }
  return player.daily;
}

function bumpDaily(player, type, amount = 1) {
  const daily = ensureDaily(player);
  if (daily.done || daily.id !== type) return;
  daily.progress += amount;
  if (daily.progress >= daily.target) {
    daily.done = true;
    daily.progress = daily.target;
    player.points += 30;
  }
}

function refreshUnlocksAndTitles(player) {
  ensureDaily(player);
  for (const avatar of allAvatars()) {
    if (player.wins >= avatar.unlockWins && !player.unlocked_avatars.includes(avatar.id)) {
      player.unlocked_avatars.push(avatar.id);
    }
  }

  const titles = [];
  if (player.plus4_played >= 5) titles.push("plus4_master");
  if (player.wins >= 5) titles.push("uno_king");
  if (player.losses >= 8) titles.push("unlucky");
  if (player.unlocked_avatars.length >= allAvatars().length) titles.push("collector");
  if (player.points >= 500) titles.push("high_roller");
  if (player.uno_shouts >= 15) titles.push("shout_legend");
  if (player.catches >= 5) titles.push("hunter");
  if (player.streak >= 3) titles.push("streaker");
  player.titles = titles;
  if (player.equipped_title && !titles.includes(player.equipped_title)) {
    player.equipped_title = "";
  }
  return player;
}

export async function migratePlayersFromJson() {
  let raw;
  try {
    raw = await fsPromises.readFile(DATA_FILE, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[UNO] players.json ilegível — a saltar migração", err);
    }
    return { imported: 0 };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[UNO] players.json inválido — a saltar migração");
    return { imported: 0 };
  }

  const col = playersCollection();
  if (await col.countDocuments()) {
    console.info("[UNO] MongoDB já tem jogadores — JSON não importado");
    return { imported: 0 };
  }

  const docs = [];
  for (const value of Object.values(parsed || {})) {
    if (value && typeof value === "object" && value.discord_id) {
      const player = refreshUnlocksAndTitles(normalizePlayer(value));
      delete player._id;
      docs.push(player);
    }
  }
  if (!docs.length) return { imported: 0 };

  try {
    const result = await col.insertMany(docs, { ordered: false });
    console.info(`[UNO] Importados ${result.insertedCount} jogadores de players.json para MongoDB`);
    return { imported: result.insertedCount };
  } catch (err) {
    const n = err.insertedCount || err.result?.insertedCount || 0;
    console.warn("[UNO] Migração JSON parcial:", n, err.message);
    return { imported: n };
  }
}

export async function upsertPlayer(discordId, username) {
  const existing = await loadPlayer(discordId);
  const previous = existing ? JSON.stringify(existing) : null;
  let player = existing || emptyPlayer(discordId, username);
  if (username && player.username !== username) player.username = username;
  player = normalizePlayer(player);
  refreshUnlocksAndTitles(player);
  if (JSON.stringify(player) !== previous) {
    await savePlayer(player);
  }
  return player;
}

export async function getPlayer(discordId) {
  return loadPlayer(discordId);
}

export async function setAvatar(discordId, avatarId) {
  return setCosmetics(discordId, { selected_avatar: avatarId });
}

export async function setCosmetics(discordId, patch = {}) {
  const player = await upsertPlayer(discordId);

  if (patch.nickname !== undefined) {
    player.nickname = sanitizeNickname(patch.nickname);
  }

  if (patch.selected_avatar || patch.avatarId || patch.avatar) {
    const avatarId = patch.selected_avatar || patch.avatarId || patch.avatar;
    const item = allAvatars().find((a) => a.id === avatarId);
    if (!item || !player.unlocked_avatars.includes(avatarId)) {
      return { ok: false, error: "avatar_locked" };
    }
    player.selected_avatar = avatarId;
  }

  if (patch.selected_felt || patch.felt) {
    const id = patch.selected_felt || patch.felt;
    const item = FELT_CATALOG.find((x) => x.id === id);
    if (!item || !isCosmeticUnlocked(item, player)) return { ok: false, error: "cosmetic_locked" };
    player.selected_felt = id;
  }

  if (patch.selected_card_back || patch.cardBack) {
    const id = patch.selected_card_back || patch.cardBack;
    const item = CARD_BACK_CATALOG.find((x) => x.id === id);
    if (!item || !isCosmeticUnlocked(item, player)) return { ok: false, error: "cosmetic_locked" };
    player.selected_card_back = id;
  }

  if (patch.selected_frame || patch.frame) {
    const id = patch.selected_frame || patch.frame;
    const item = FRAME_CATALOG.find((x) => x.id === id);
    if (!item || !isCosmeticUnlocked(item, player)) return { ok: false, error: "cosmetic_locked" };
    player.selected_frame = id;
  }

  if (patch.equipped_title !== undefined || patch.equippedTitle !== undefined) {
    const title = patch.equipped_title ?? patch.equippedTitle;
    if (title && !player.titles.includes(title)) return { ok: false, error: "title_locked" };
    player.equipped_title = title || "";
  }

  refreshUnlocksAndTitles(player);
  await savePlayer(player);
  return { ok: true, player };
}

export async function bumpStats(discordId, fields = {}) {
  const player = await upsertPlayer(discordId);
  for (const [key, value] of Object.entries(fields)) {
    if (typeof player[key] === "number") player[key] += Number(value) || 0;
  }
  if (fields.uno_shouts) bumpDaily(player, "uno", fields.uno_shouts);
  if (fields.catches) bumpDaily(player, "catch", fields.catches);
  if (fields.plus4_played) bumpDaily(player, "plus4", fields.plus4_played);
  refreshUnlocksAndTitles(player);
  await savePlayer(player);
  return player;
}

function diffUnlocks(before, after) {
  const items = [];
  for (const id of after.unlocked_avatars || []) {
    if (!(before.unlocked_avatars || []).includes(id)) items.push({ kind: "avatar", id });
  }
  for (const id of after.titles || []) {
    if (!(before.titles || []).includes(id)) items.push({ kind: "title", id });
  }
  for (const item of FELT_CATALOG) {
    if (isCosmeticUnlocked(item, after) && !isCosmeticUnlocked(item, before)) {
      items.push({ kind: "felt", id: item.id });
    }
  }
  for (const item of CARD_BACK_CATALOG) {
    if (isCosmeticUnlocked(item, after) && !isCosmeticUnlocked(item, before)) {
      items.push({ kind: "cardBack", id: item.id });
    }
  }
  for (const item of FRAME_CATALOG) {
    if (isCosmeticUnlocked(item, after) && !isCosmeticUnlocked(item, before)) {
      items.push({ kind: "frame", id: item.id });
    }
  }
  return items;
}

export async function recordMatch({ winnerId, loserIds, points, plus4Counts }) {
  const unlocksByPlayer = {};
  let winnerDoc = null;

  if (winnerId && !isBotId(winnerId)) {
    const winner = (await loadPlayer(winnerId)) || emptyPlayer(winnerId);
    const before = JSON.parse(JSON.stringify(winner));
    winner.wins += 1;
    winner.points += points;
    winner.streak = (winner.streak || 0) + 1;
    winner.plus4_played += plus4Counts?.[winnerId] || 0;
    bumpDaily(winner, "win", 1);
    bumpDaily(winner, "plus4", plus4Counts?.[winnerId] || 0);
    winnerDoc = await savePlayer(refreshUnlocksAndTitles(winner));
    const items = diffUnlocks(before, winnerDoc);
    if (items.length) unlocksByPlayer[winnerId] = items;
  }

  for (const loserId of loserIds || []) {
    if (isBotId(loserId)) continue;
    const loser = (await loadPlayer(loserId)) || emptyPlayer(loserId);
    const before = JSON.parse(JSON.stringify(loser));
    loser.losses += 1;
    loser.streak = 0;
    loser.plus4_played += plus4Counts?.[loserId] || 0;
    bumpDaily(loser, "plus4", plus4Counts?.[loserId] || 0);
    const saved = await savePlayer(refreshUnlocksAndTitles(loser));
    const items = diffUnlocks(before, saved);
    if (items.length) unlocksByPlayer[loserId] = items;
  }

  return { winner: winnerDoc, unlocksByPlayer };
}

export function cosmeticsPayload() {
  const catalog = allAvatars();
  return {
    avatars: catalog.filter((a) => a.group !== "cartoon"),
    cartoons: catalog.filter((a) => a.group === "cartoon"),
    felts: FELT_CATALOG,
    cardBacks: CARD_BACK_CATALOG,
    frames: FRAME_CATALOG,
  };
}

export async function getLeaderboard(limit = 10) {
  const rows = await playersCollection()
    .find({
      discord_id: { $not: { $regex: "^bot:" } },
      wins: { $gt: 0 },
    })
    .sort({ wins: -1, points: -1 })
    .limit(limit)
    .toArray();

  return rows.map((doc, index) => {
    const p = normalizePlayer(publicPlayer(doc));
    return {
      rank: index + 1,
      discord_id: p.discord_id,
      username: p.username,
      nickname: p.nickname,
      selected_avatar: p.selected_avatar,
      selected_frame: p.selected_frame,
      equipped_title: p.equipped_title,
      wins: p.wins,
      losses: p.losses,
      points: p.points,
      plus4_played: p.plus4_played,
      streak: p.streak || 0,
      titles: p.titles,
    };
  });
}

/**
 * Catálogo partilhado (servidor + cliente). IDs únicos — os visuais CSS ficam no frontend.
 */
export const DEFAULT_RULES = {
  stack: false,
  chaos70: false,
  blitz: false,
  jumpIn: false,
  series: false,
};

export const SERIES_TARGET = 3;
export const MAX_PLAYERS = 10;
export const MAX_SPECTATORS = 8;
export const HOUSE_BOT_ID = "bot:house";
export const EVENT_LOG_LIMIT = 8;

export function isBotId(id) {
  return String(id || "").startsWith("bot:");
}

export const FELT_CATALOG = [
  { id: "classic", unlock: { type: "default" } },
  { id: "nonna", unlock: { type: "default" } },
  { id: "arcade", unlock: { type: "wins", value: 1 } },
  { id: "diner", unlock: { type: "points", value: 50 } },
  { id: "meadow", unlock: { type: "uno_shouts", value: 5 } },
  { id: "pool_party", unlock: { type: "wins", value: 2 } },
  { id: "candy", unlock: { type: "catches", value: 2 } },
  { id: "disco", unlock: { type: "plus4_played", value: 3 } },
  { id: "lava", unlock: { type: "plus4_played", value: 6 } },
  { id: "haunted", unlock: { type: "uno_shouts", value: 12 } },
  { id: "cinema", unlock: { type: "wins", value: 4 } },
  { id: "elmo", unlock: { type: "default" } },
];

export const CARD_BACK_CATALOG = [
  { id: "classic", unlock: { type: "default" } },
  { id: "froggo", unlock: { type: "default" } },
  { id: "spicy", unlock: { type: "wins", value: 1 } },
  { id: "ducky", unlock: { type: "catches", value: 1 } },
  { id: "taco", unlock: { type: "points", value: 80 } },
  { id: "bee", unlock: { type: "uno_shouts", value: 8 } },
  { id: "glitch", unlock: { type: "plus4_played", value: 4 } },
  { id: "fangs", unlock: { type: "plus4_played", value: 8 } },
  { id: "dj_cat", unlock: { type: "wins", value: 5 } },
  { id: "koi", unlock: { type: "catches", value: 6 } },
  { id: "popcorn", unlock: { type: "points", value: 40 } },
  { id: "bricks", unlock: { type: "default" } },
];

export const FRAME_CATALOG = [
  { id: "none", unlock: { type: "default" } },
  { id: "kitty", unlock: { type: "default" } },
  { id: "blossom", unlock: { type: "wins", value: 1 } },
  { id: "deal_with_it", unlock: { type: "points", value: 60 } },
  { id: "royalty", unlock: { type: "wins", value: 3 } },
  { id: "chaos", unlock: { type: "plus4_played", value: 3 } },
  { id: "angel", unlock: { type: "catches", value: 3 } },
  { id: "yarr", unlock: { type: "uno_shouts", value: 6 } },
  { id: "main_character", unlock: { type: "wins", value: 7 } },
  { id: "toadstool", unlock: { type: "catches", value: 8 } },
  { id: "filmstrip", unlock: { type: "wins", value: 2 } },
  { id: "blade", unlock: { type: "default" } },
];

export const AVATAR_IDS = [
  "educado",
  "shiba",
  "laranja",
  "blep",
  "careta",
  "julgamento",
  "chefe",
  "sideeye",
  "choro",
  "nice",
  "piscadela",
  "lambe",
  "sofa",
  "smoking",
];

export const AVATAR_MIGRATE = {
  wolf: "educado",
  fox: "shiba",
  cat: "laranja",
  robot: "blep",
  dragon: "julgamento",
  pirate: "careta",
  alien: "nice",
  wizard: "choro",
  dracula: "educado",
  alice: "shiba",
  sherlock: "laranja",
  frankenstein: "blep",
  musketeer: "chefe",
  dorothy: "julgamento",
  robinhood: "careta",
  cleopatra: "nice",
  quixote: "smoking",
  phantom: "choro",
};

export function resolveAvatarId(id) {
  if (!id || typeof id !== "string") return "educado";
  if (AVATAR_MIGRATE[id]) return AVATAR_MIGRATE[id];
  if (AVATAR_IDS.includes(id)) return id;
  if (/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return id;
  return "educado";
}

export function avatarUrl(id) {
  const resolved = resolveAvatarId(id);
  if (AVATAR_IDS.includes(resolved)) return `/assets/avatars/${resolved}.jpg`;
  return `/assets/avatars/cartoon/${resolved}.jpg`;
}

export const FELT_MIGRATE = { neon: "arcade", casino: "diner", space: "haunted" };
export const BACK_MIGRATE = { gold: "spicy", galaxy: "glitch", flame: "fangs" };
export const FRAME_MIGRATE = { gold: "royalty", fire: "chaos", ice: "angel" };

export const DAILY_TYPES = [
  { id: "win", target: 1 },
  { id: "plus4", target: 2 },
  { id: "uno", target: 3 },
  { id: "catch", target: 1 },
];

export const REACTION_EMOJIS = ["😂", "🔥", "💀", "😎", "😭", "🃏", "🔪", "👀", "🧱", "🍪"];

export function isCosmeticUnlocked(item, player) {
  if (!item?.unlock || item.unlock.type === "default") return true;
  const { type, value } = item.unlock;
  return Number(player?.[type] || 0) >= value;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function challengeForDate(dateKey) {
  const sum = dateKey.split("-").reduce((acc, part) => acc + Number(part), 0);
  return DAILY_TYPES[sum % DAILY_TYPES.length];
}

export function sanitizeNickname(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 20);
}

export function discordAvatarUrl(userId, avatarHash) {
  if (!userId || !avatarHash) return "";
  if (!/^[0-9]+$/.test(String(userId))) return "";
  if (!/^[a-zA-Z0-9_]+$/.test(String(avatarHash))) return "";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
}

export function isAllowedAvatarUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "cdn.discordapp.com" &&
      /^\/avatars\/[0-9]+\/[a-zA-Z0-9_]+\.(png|jpg|webp|gif)$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

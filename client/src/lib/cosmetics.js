import {
  BACK_MIGRATE,
  FELT_MIGRATE,
  FRAME_MIGRATE,
  avatarUrl,
  isAllowedAvatarUrl,
  isCosmeticUnlocked,
  REACTION_EMOJIS,
} from "@shared/cosmetics.js";

export { isAllowedAvatarUrl, REACTION_EMOJIS, avatarUrl };

export function resolveFelt(id) {
  return FELT_MIGRATE[id] || id || "classic";
}

export function resolveBack(id) {
  return BACK_MIGRATE[id] || id || "classic";
}

export function resolveFrame(id) {
  return FRAME_MIGRATE[id] || id || "none";
}

export function isUnlocked(item, player) {
  return isCosmeticUnlocked(item, player);
}

export function unlockLabel(item, t) {
  if (!item?.unlock || item.unlock.type === "default") return "";
  return t(`unlock.${item.unlock.type}`, { count: item.unlock.value });
}

export function avatarSrc(player) {
  if (isAllowedAvatarUrl(player?.discordAvatar)) return player.discordAvatar;
  return avatarUrl(player?.avatar || player?.selected_avatar);
}

export const CARD_BACKS = {
  classic: { motif: "UNO", label: "" },
  froggo: { motif: "🐸", label: "RIBBIT" },
  spicy: { motif: "🌶️", label: "HOT" },
  ducky: { motif: "🦆", label: "QUACK" },
  taco: { motif: "🌮", label: "TUE" },
  bee: { motif: "🐝", label: "BUZZ" },
  glitch: { motif: "UNO?", label: "ERR" },
  fangs: { motif: "🧛", label: "BITE" },
  dj_cat: { motif: "🎧", label: "NYA" },
  koi: { motif: "🐟", label: "KOI" },
  popcorn: { motif: "🍿", label: "CINE" },
  bricks: { motif: "🧱", label: "CLICK" },
};

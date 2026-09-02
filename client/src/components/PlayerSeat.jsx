import { avatarSrc } from "../lib/cosmetics.js";
import AvatarFrame from "./AvatarFrame.jsx";
import CardBack from "./CardBack.jsx";

export default function PlayerSeat({ player, isYou, t, onCatch, showStack, compact, chip }) {
  const title = player.equippedTitle ? t(`titles.${player.equippedTitle}`) : null;
  const name = player.isBot ? t("lobby.botName") : isYou ? t("game.you") : player.displayName || player.username;
  const catchBtn = player.vulnerable && !isYou && (
    <button
      type="button"
      onClick={() => onCatch(player.discordId)}
      className="rounded-full bg-uno-yellow px-2 py-1 text-[10px] font-black uppercase text-black"
    >
      {t("game.catch")}
    </button>
  );

  if (chip) {
    return (
      <div
        className={`player-chip ${player.isCurrent ? "player-chip-turn" : ""} ${
          !player.connected && !player.isBot ? "opacity-50" : ""
        }`}
      >
        <AvatarFrame id={player.frame} src={avatarSrc(player)} size="sm" />
        <p className="player-chip-name">
          {name}
          {player.isBot ? " 🤖" : ""}
        </p>
        <p className="player-chip-count">{player.cardCount}</p>
        {catchBtn}
      </div>
    );
  }

  return (
    <div
      className={`player-seat ${compact ? "player-seat-compact" : ""} ${
        player.isCurrent ? "player-seat-turn" : ""
      } ${!player.connected && !player.isBot ? "opacity-50" : ""}`}
    >
      <div className="relative">
        <AvatarFrame id={player.frame} src={avatarSrc(player)} size="sm" />
        {showStack && player.cardCount > 0 && (
          <div className="absolute -right-3 -top-2 scale-50">
            <CardBack variant={player.cardBack} small stacked count={player.cardCount} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {name}
          {player.isBot ? " 🤖" : ""}
        </p>
        {title && !compact && <p className="truncate text-[10px] font-bold uppercase text-uno-yellow">{title}</p>}
        <p className="text-xs text-white/70">{t("game.cards", { count: player.cardCount })}</p>
      </div>
      {catchBtn}
    </div>
  );
}

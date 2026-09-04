import { useAuth } from "../context/AuthContext.jsx";
import { useGame } from "../context/GameContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import LanguageSelector from "./LanguageSelector.jsx";
import AvatarFrame from "./AvatarFrame.jsx";
import UnoLogo from "./UnoLogo.jsx";
import { avatarUrl, isAllowedAvatarUrl } from "../lib/cosmetics.js";

const TABS = [
  { id: "table", key: "tabs.table", skin: "tab-card-table" },
  { id: "profile", key: "tabs.profile", skin: "tab-card-profile" },
  { id: "leaderboard", key: "tabs.leaderboard", skin: "tab-card-leaderboard" },
];

export default function Header({ tab, onTab }) {
  const { t } = useI18n();
  const { session, player } = useAuth();
  const { state, muted, toggleMute } = useGame();
  const isYourTurn = state?.currentPlayerId === session?.user.discordId && state?.status === "playing";
  const avatar = isAllowedAvatarUrl(session?.user.avatarUrl)
    ? session.user.avatarUrl
    : avatarUrl(player?.selected_avatar);

  return (
    <header className="app-header flex flex-shrink-0 flex-col gap-1 px-4 pt-2">
      <div className="app-header-bar flex flex-wrap items-center justify-between gap-3">
        <div className="app-header-brand flex items-center gap-3">
          <UnoLogo size="sm" />
          <div className="app-header-meta">
            <p className="text-xs font-black uppercase tracking-widest text-uno-yellow">
              {session?.mock ? t("app.mockMode") : t("app.subtitle")}
            </p>
            <p className="text-sm font-extrabold text-white/90">
              {t("app.channel")}: {session?.channelName || t("app.unknownChannel")}
            </p>
            {state?.roomCode && (
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                {t("lobby.roomCode")}: {state.roomCode}
              </p>
            )}
          </div>
        </div>

        <div className="app-header-tools flex items-center gap-3">
          {isYourTurn && (
            <span className="rounded-full border-2 border-black bg-uno-yellow px-3 py-1 text-xs font-black uppercase text-black shadow-[0_3px_0_#111]">
              {t("header.yourTurn")}
            </span>
          )}
          <LanguageSelector />
          <button
            type="button"
            onClick={toggleMute}
            className="app-header-mute grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-black/35 text-lg shadow-[0_3px_0_#111]"
            title={muted ? t("header.soundOn") : t("header.soundOff")}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <div className="flex items-center gap-2 rounded-full border-2 border-white bg-black/35 py-1 pl-1 pr-3 shadow-[0_3px_0_#111]">
            <AvatarFrame id={player?.selected_frame} src={avatar} size="sm" />
            <div className="leading-tight">
              <span className="block text-sm font-black">{player?.nickname || session?.user.username}</span>
              {player?.equipped_title && (
                <span className="text-[10px] font-black uppercase text-uno-yellow">{t(`titles.${player.equipped_title}`)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 pt-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={`tab-card ${item.skin} ${tab === item.id ? "tab-card-active" : "tab-card-idle"}`}
          >
            {t(item.key)}
          </button>
        ))}
      </nav>
    </header>
  );
}

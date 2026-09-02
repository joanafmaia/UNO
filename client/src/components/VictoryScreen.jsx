const CONFETTI = ["#ed1c24", "#ffde00", "#009fe3", "#2ea043", "#fff"];

export default function VictoryScreen({
  t,
  state,
  isHost,
  playAgain,
  me,
}) {
  const winner = state.players.find((p) => p.discordId === state.winnerId);
  const seriesOver = Boolean(state.seriesWinnerId);
  const showSeries = Boolean(state.rules?.series) || state.players.some((p) => p.seriesWins > 0);
  const unlocks = state.unlocks?.[me] || [];

  const unlockLabel = (item) => {
    if (item.kind === "avatar") return t(`avatars.${item.id}`);
    if (item.kind === "title") return t(`titles.${item.id}`);
    return t(`cosmetics.${item.id}`);
  };

  return (
    <div className="victory-stage">
      <div className="victory-confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className="victory-pip"
            style={{
              left: `${4 + (i * 13) % 92}%`,
              animationDelay: `${(i % 7) * 0.12}s`,
              background: CONFETTI[i % CONFETTI.length],
              transform: `rotate(${i * 24}deg)`,
            }}
          />
        ))}
      </div>

      <div className="victory-card">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-uno-yellow">
          {seriesOver ? t("victory.seriesOver") : t("victory.roundOver")}
        </p>
        <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none drop-shadow-[0_4px_0_#111]">
          {winner?.isBot ? t("lobby.botName") : winner?.displayName || t("victory.someone")}
        </h2>
        <p className="mt-3 text-lg font-black">
          {seriesOver
            ? t("victory.champion")
            : t("victory.wonRound", { points: state.lastRoundPoints || 0 })}
        </p>

        {unlocks.length > 0 && (
          <div className="mt-5 rounded-2xl border-2 border-uno-yellow bg-black/40 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-uno-yellow">{t("victory.unlocked")}</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {unlocks.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                  {unlockLabel(item)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showSeries && (
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {state.players.map((p) => (
              <li
                key={p.discordId}
                className={`rounded-full border-2 px-3 py-1 text-xs font-black ${
                  p.discordId === state.seriesWinnerId || p.discordId === state.winnerId
                    ? "border-uno-yellow bg-black/50 text-uno-yellow"
                    : "border-white/30 bg-black/30"
                }`}
              >
                {p.isBot ? t("lobby.botName") : p.displayName} {p.seriesWins || 0}
                {state.seriesTarget ? `/${state.seriesTarget}` : ""}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm font-bold text-white/75">
          {isHost
            ? seriesOver
              ? t("victory.hostSeries")
              : t("victory.hostNext")
            : t("lobby.waitingHost")}
        </p>

        {isHost && (
          <button type="button" onClick={playAgain} className="uno-btn uno-btn-red mt-5">
            {seriesOver ? t("victory.newSeries") : t("lobby.playAgain")}
          </button>
        )}
      </div>
    </div>
  );
}

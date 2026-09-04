import { useState } from "react";
import { MAX_PLAYERS } from "@shared/cosmetics.js";
import { avatarSrc } from "../lib/cosmetics.js";
import AvatarFrame from "./AvatarFrame.jsx";
import Card from "./Card.jsx";

const DECO_CARDS = [
  { id: "deco-r", color: "red", value: "7", type: "number" },
  { id: "deco-y", color: "yellow", value: "skip", type: "action" },
  { id: "deco-g", color: "green", value: "reverse", type: "action" },
  { id: "deco-b", color: "blue", value: "draw2", type: "action" },
  { id: "deco-w", color: "black", value: "wild", type: "wild" },
];

const DECO_ROTATE = [-32, -16, 0, 16, 32];

const HOUSE_RULES = [
  { key: "stack", label: "rules.stack", hint: "rules.stackHint", face: "+2", color: "red" },
  { key: "chaos70", label: "rules.chaos70", hint: "rules.chaos70Hint", face: "7/0", color: "yellow" },
  { key: "blitz", label: "rules.blitz", hint: "rules.blitzHint", face: "10s", color: "blue" },
  { key: "jumpIn", label: "rules.jumpIn", hint: "rules.jumpInHint", face: "⚡", color: "green" },
  { key: "series", label: "rules.series", hint: "rules.seriesHint", face: "3", color: "purple" },
];

const PRESETS = [
  { id: "classic", face: "UNO", color: "red", rules: { stack: false, chaos70: false, blitz: false, jumpIn: false } },
  { id: "chaos", face: "🔥", color: "yellow", rules: { stack: true, chaos70: true, blitz: false, jumpIn: true } },
  { id: "race", face: "⏱", color: "blue", rules: { stack: false, chaos70: false, blitz: true, jumpIn: false } },
];

export default function Lobby({
  state,
  t,
  isHost,
  waiting,
  finished,
  invite,
  startGame,
  playAgain,
  toggleRule,
  applyPreset,
  addBot,
  removeBot,
  eventLine,
  joinRoom,
  createRoom,
}) {
  const emptyCount = Math.max(0, Math.min(3, MAX_PLAYERS - state.players.length));
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const roomCode = state.roomCode || "";

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sem clipboard */
    }
  };

  const submitCode = (event) => {
    event.preventDefault();
    const code = codeInput.trim();
    if (code.length < 4) return;
    joinRoom(code);
    setCodeInput("");
  };

  return (
    <div className="lobby-stage">
      <div className="lobby-fan" aria-hidden="true">
        {DECO_CARDS.map((card, i) => (
          <div
            key={card.id}
            className="lobby-fan-card"
            style={{ transform: `translateX(${(i - 2) * 38}px) rotate(${DECO_ROTATE[i]}deg)` }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>

      <div className="lobby-table">
        <div className="lobby-table-felt">
          <div className="lobby-head">
            <p className="tilt-hint">{t("lobby.tiltHint")}</p>
            {eventLine && <p className="lobby-event">{eventLine}</p>}
          </div>

          <div className="lobby-body">
            <div className="lobby-seats-col">
              <ul className="lobby-seats">
                {state.players.map((p) => (
                  <li key={p.discordId} className="lobby-seat">
                    <AvatarFrame id={p.frame} src={avatarSrc(p)} size="sm" />
                    <span className="mt-1 max-w-[88px] truncate text-xs font-black">
                      {p.isBot ? t("lobby.botName") : p.displayName || p.username}
                    </span>
                    {p.equippedTitle && (
                      <span className="text-[9px] font-black uppercase text-uno-yellow">{t(`titles.${p.equippedTitle}`)}</span>
                    )}
                    {p.isHost && <span className="lobby-host">{t("lobby.hostBadge")}</span>}
                    {p.seriesWins > 0 && (
                      <span className="text-[10px] font-black text-uno-yellow">
                        {t("lobby.seriesScore", { count: p.seriesWins })}
                      </span>
                    )}
                  </li>
                ))}
                {waiting &&
                  Array.from({ length: emptyCount }, (_, i) => (
                    <li key={`empty-${i}`} className="lobby-seat lobby-seat-empty">
                      <span className="lobby-empty-pip">?</span>
                      <span className="text-[10px] font-bold uppercase text-white/50">{t("lobby.emptySeat")}</span>
                    </li>
                  ))}
              </ul>
              {(state.spectators || []).length > 0 && (
                <p className="mt-1 text-[10px] font-bold text-white/70">
                  {t("lobby.spectators", { count: state.spectators.length })}
                  {": "}
                  {state.spectators.map((s) => s.displayName).join(", ")}
                </p>
              )}
              {waiting && roomCode && (
                <div className="room-code">
                  <button type="button" className="room-code-value" onClick={copyCode} title={t("lobby.copyCode")}>
                    {roomCode}
                  </button>
                  <div className="room-code-actions">
                    <button type="button" onClick={copyCode} className="uno-btn uno-btn-yellow room-code-btn">
                      {copied ? t("lobby.copied") : t("lobby.copyCode")}
                    </button>
                    <button type="button" onClick={createRoom} className="uno-btn uno-btn-blue room-code-btn">
                      {t("lobby.newRoom")}
                    </button>
                  </div>
                  <form className="room-code-join" onSubmit={submitCode}>
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                      maxLength={6}
                      placeholder={t("lobby.joinCodePlaceholder")}
                      className="room-code-input"
                      aria-label={t("lobby.joinCode")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="submit" className="uno-btn uno-btn-red room-code-btn" disabled={codeInput.length < 4}>
                      {t("lobby.join")}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {waiting && (
              <div className="lobby-rules-col">
                <p className="lobby-section-label">{t("rules.presets")}</p>
                <div className="lobby-presets">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => applyPreset(preset.rules)}
                      title={t(`rules.preset.${preset.id}Hint`)}
                      className={`rule-card rule-card-${preset.color}`}
                    >
                      <span className="rule-card-face">{preset.face}</span>
                      <span className="rule-card-name">{t(`rules.preset.${preset.id}`)}</span>
                    </button>
                  ))}
                </div>
                <p className="lobby-section-label">{t("rules.title")}</p>
                <div className="lobby-rules">
                  {HOUSE_RULES.map((rule) => {
                    const on = Boolean(state.rules?.[rule.key]);
                    return (
                      <button
                        key={rule.key}
                        type="button"
                        disabled={!isHost}
                        onClick={() => toggleRule(rule.key)}
                        title={t(rule.hint)}
                        className={`rule-card rule-card-${rule.color} ${on ? "rule-card-on" : "rule-card-off"}`}
                      >
                        <span className="rule-card-face">{rule.face}</span>
                        <span className="rule-card-name">{t(rule.label)}</span>
                        <span className="rule-card-switch">{on ? t("lobby.ruleOn") : t("lobby.ruleOff")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lobby-foot">
            {state.players.length < 2 && waiting && (
              <p className="lobby-need">{t("lobby.needPlayers")}</p>
            )}
            <p className="lobby-host-line">
              {isHost ? t("lobby.youAreHost") : t("lobby.waitingHost")}
            </p>

            <div className="lobby-actions">
              <button type="button" onClick={invite} className="uno-btn uno-btn-blue">
                {t("lobby.invite")}
              </button>
              {waiting && isHost && (
                <button
                  type="button"
                  onClick={state.players.some((p) => p.isBot) ? removeBot : addBot}
                  className="uno-btn uno-btn-yellow"
                >
                  {state.players.some((p) => p.isBot) ? t("lobby.kickBot") : t("lobby.callBot")}
                </button>
              )}
              {waiting && isHost && (
                <button
                  type="button"
                  onClick={startGame}
                  disabled={state.players.length < 2}
                  className="uno-btn uno-btn-red"
                >
                  {t("lobby.start")}
                </button>
              )}
              {finished && isHost && (
                <button type="button" onClick={playAgain} className="uno-btn uno-btn-red">
                  {t("lobby.playAgain")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

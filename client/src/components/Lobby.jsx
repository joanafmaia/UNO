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
  { key: "jumpIn", label: "rules.jumpIn", hint: "rules.jumpInHint", face: "JMP", color: "green" },
  { key: "series", label: "rules.series", hint: "rules.seriesHint", face: "3", color: "purple" },
];

const PRESETS = [
  { id: "classic", face: "UNO", color: "red", rules: { stack: false, chaos70: false, blitz: false, jumpIn: false } },
  { id: "chaos", face: "7/0", color: "yellow", rules: { stack: true, chaos70: true, blitz: false, jumpIn: true } },
  { id: "race", face: "10s", color: "blue", rules: { stack: false, chaos70: false, blitz: true, jumpIn: false } },
];

function presetMatches(preset, rules) {
  return (
    Boolean(rules?.stack) === preset.rules.stack &&
    Boolean(rules?.chaos70) === preset.rules.chaos70 &&
    Boolean(rules?.blitz) === preset.rules.blitz &&
    Boolean(rules?.jumpIn) === preset.rules.jumpIn
  );
}

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
  const [moreOpen, setMoreOpen] = useState(false);
  const roomCode = state.roomCode || "";
  const hasBot = state.players.some((p) => p.isBot);

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
    setMoreOpen(false);
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

          <ul className="lobby-seats">
            {state.players.map((p) => (
              <li key={p.discordId} className="lobby-seat">
                <AvatarFrame id={p.frame} src={avatarSrc(p)} size="sm" />
                <span className="lobby-seat-name">
                  {p.isBot ? t("lobby.botName") : p.displayName || p.username}
                </span>
                {p.equippedTitle && (
                  <span className="lobby-seat-title">{t(`titles.${p.equippedTitle}`)}</span>
                )}
                {p.isHost && <span className="lobby-host">{t("lobby.hostBadge")}</span>}
                {p.seriesWins > 0 && (
                  <span className="lobby-seat-score">{t("lobby.seriesScore", { count: p.seriesWins })}</span>
                )}
              </li>
            ))}
            {waiting && emptyCount > 0 && (
              <li className="lobby-empty-group" title={t("lobby.emptySeat")}>
                {Array.from({ length: emptyCount }, (_, i) => (
                  <span key={`empty-${i}`} className="lobby-empty-pip">?</span>
                ))}
              </li>
            )}
          </ul>
          {(state.spectators || []).length > 0 && (
            <p className="lobby-watchers">
              {t("lobby.spectators", { count: state.spectators.length })}
              {": "}
              {state.spectators.map((s) => s.displayName).join(", ")}
            </p>
          )}

          {waiting && (
            <div className="lobby-chips">
              <div className="lobby-presets">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => applyPreset(preset.rules)}
                    title={t(`rules.preset.${preset.id}Hint`)}
                    className={`mode-card mode-card-${preset.color} ${
                      presetMatches(preset, state.rules) ? "mode-card-on" : ""
                    }`}
                  >
                    <span className="mode-card-face">{preset.face}</span>
                    <span className="mode-card-name">{t(`rules.preset.${preset.id}`)}</span>
                  </button>
                ))}
              </div>
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
                      className={`rule-toggle rule-toggle-${rule.color} ${on ? "rule-toggle-on" : "rule-toggle-off"}`}
                    >
                      <span className="rule-toggle-face">{rule.face}</span>
                      <span className="rule-toggle-name">{t(rule.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="lobby-toolbar">
            {waiting && roomCode && (
              <div className="room-code">
                <button type="button" className="room-code-value" onClick={copyCode} title={t("lobby.copyCode")}>
                  {roomCode}
                </button>
                <button type="button" onClick={copyCode} className="uno-btn uno-btn-yellow uno-btn-sm">
                  {copied ? t("lobby.copied") : t("lobby.copyCode")}
                </button>
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  className="uno-btn uno-btn-ghost uno-btn-sm"
                >
                  {moreOpen ? t("lobby.moreHide") : t("lobby.more")}
                </button>
              </div>
            )}
            {waiting && moreOpen && roomCode && (
              <div className="lobby-more">
                <button type="button" onClick={createRoom} className="uno-btn uno-btn-blue uno-btn-sm">
                  {t("lobby.newRoom")}
                </button>
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
                  <button type="submit" className="uno-btn uno-btn-red uno-btn-sm" disabled={codeInput.length < 4}>
                    {t("lobby.join")}
                  </button>
                </form>
              </div>
            )}

            <div className="lobby-foot">
              {state.players.length < 2 && waiting && (
                <p className="lobby-need">{t("lobby.needPlayers")}</p>
              )}
              <p className="lobby-host-line">
                {isHost ? t("lobby.youAreHost") : t("lobby.waitingHost")}
              </p>
              <div className="lobby-actions">
                <button type="button" onClick={invite} className="uno-btn uno-btn-blue uno-btn-sm">
                  {t("lobby.invite")}
                </button>
                {waiting && isHost && (
                  <button
                    type="button"
                    onClick={hasBot ? removeBot : addBot}
                    className="uno-btn uno-btn-yellow uno-btn-sm"
                  >
                    {hasBot ? t("lobby.kickBot") : t("lobby.callBot")}
                  </button>
                )}
                {waiting && isHost && (
                  <button
                    type="button"
                    onClick={startGame}
                    disabled={state.players.length < 2}
                    className="uno-btn uno-btn-red uno-btn-deal"
                  >
                    {t("lobby.start")}
                  </button>
                )}
                {finished && isHost && (
                  <button type="button" onClick={playAgain} className="uno-btn uno-btn-red uno-btn-deal">
                    {t("lobby.playAgain")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

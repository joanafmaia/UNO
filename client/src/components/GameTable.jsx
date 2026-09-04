import { useEffect, useMemo, useState } from "react";
import { getDiscordSdk } from "../discord/discordSdk.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useGame } from "../context/GameContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import Card, { cardCaption } from "./Card.jsx";
import CardBack from "./CardBack.jsx";
import CardFlight from "./CardFlight.jsx";
import FeltSurface from "./FeltSurface.jsx";
import FxOverlay from "./FxOverlay.jsx";
import HandFan, { sortHand } from "./HandFan.jsx";
import Lobby from "./Lobby.jsx";
import PlayerSeat from "./PlayerSeat.jsx";
import PlayLog from "./PlayLog.jsx";
import ReactionBar from "./ReactionBar.jsx";
import UnoButton from "./UnoButton.jsx";
import VictoryScreen from "./VictoryScreen.jsx";

const COLORS = ["red", "yellow", "green", "blue"];
const COLOR_BTN = {
  red: "bg-uno-red",
  yellow: "bg-uno-yellow",
  green: "bg-uno-green",
  blue: "bg-uno-blue",
};

function eventText(event, t) {
  if (!event) return "";
  const params = { ...event.params };
  if (params.card) params.card = cardCaption(params.card, t);
  if (params.color) params.color = t(`colors.${params.color}`);
  return t(`events.${event.type}`, params);
}

function TurnTimer({ deadline }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) return undefined;
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const seconds = (left / 1000).toFixed(1);
  const danger = left < 3000;
  return (
    <span className={`table-hud-chip ${danger ? "table-hud-danger animate-pulse" : ""}`}>
      {seconds}s
    </span>
  );
}

export default function GameTable() {
  const { t } = useI18n();
  const { session, player, refreshPlayer } = useAuth();
  const {
    state,
    notice,
    fx,
    clearNotice,
    startGame,
    playCard,
    chooseColor,
    chooseSwap,
    drawCard,
    passTurn,
    shoutUno,
    catchUno,
    challengePlus4,
    playAgain,
    setRules,
    react,
    addBot,
    removeBot,
    joinRoom,
    createRoom,
  } = useGame();
  const [sortMode, setSortMode] = useState("color");
  const sortedHand = useMemo(
    () => sortHand(state?.you?.hand || [], sortMode),
    [state?.you?.hand, sortMode]
  );

  useEffect(() => {
    if (state?.status === "finished") refreshPlayer()?.catch(() => {});
  }, [state?.status, state?.winnerId]);

  if (!state) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center">
        <p className="animate-pulse font-display text-2xl tracking-wide">{t("app.loadingGame")}</p>
      </div>
    );
  }

  const me = session.user.discordId;
  const others = state.players.filter((p) => p.discordId !== me);
  const you = state.players.find((p) => p.discordId === me);
  const isHost = state.hostId === me;
  const yourTurn = state.currentPlayerId === me;
  const playable = new Set(state.you?.playableIds || []);
  const jumpable = new Set(state.you?.jumpableIds || []);
  const waiting = state.status === "waiting";
  const finished = state.status === "finished";
  const spectator = Boolean(state.you?.spectator);
  const choosing = state.pendingColorChoice === me;
  const swapping = state.pendingSwap === me;
  const challenging = state.status === "pending_challenge" && state.pendingChallenge?.challengerId === me;
  const canPass = Boolean(state.drawnThisTurn && yourTurn && !state.drawStack);
  const feltId = player?.selected_felt || state.you?.felt || "classic";
  const reverseSpin = state.direction === -1;
  const slam = fx === "play" || fx === "plus4" || fx === "reverse" || fx === "skip" || fx === "jump";

  const invite = async () => {
    const sdk = getDiscordSdk();
    try {
      if (sdk?.commands?.openInviteDialog) await sdk.commands.openInviteDialog();
      else await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* convite cancelado */
    }
  };

  const toggleRule = (key) => {
    if (!isHost || !waiting) return;
    setRules({ ...state.rules, [key]: !state.rules?.[key] });
  };

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${fx === "plus4" || fx === "catch" ? "table-shake" : ""}`}>
      <FxOverlay fx={fx} event={state.lastEvent} />

      {notice && (
        <button type="button" onClick={clearNotice} className="rounded-lg bg-uno-red/90 px-3 py-2 text-sm font-semibold">
          {t(`errors.${notice}`)}
        </button>
      )}

      {waiting && (
        <Lobby
          state={state}
          t={t}
          isHost={isHost}
          waiting={waiting}
          finished={false}
          invite={invite}
          startGame={startGame}
          playAgain={playAgain}
          toggleRule={toggleRule}
          applyPreset={(rules) => setRules({ ...state.rules, ...rules })}
          addBot={addBot}
          removeBot={removeBot}
          eventLine={state.lastEvent ? eventText(state.lastEvent, t) : ""}
          joinRoom={joinRoom}
          createRoom={createRoom}
        />
      )}

      {finished && (
        <VictoryScreen t={t} state={state} isHost={isHost} playAgain={playAgain} me={me} />
      )}

      {!waiting && !finished && (
        <div className={`table-play ${yourTurn ? "table-play-your-turn" : ""}`}>
          <div className="table-play-hud">
            {state.rules?.blitz && <TurnTimer deadline={state.turnDeadline} />}
            {state.drawStack > 0 && (
              <span className="table-hud-chip table-hud-stack">
                {t("game.stack", { count: state.drawStack })}
              </span>
            )}
            {state.lastEvent && (
              <p className="table-play-event">{eventText(state.lastEvent, t)}</p>
            )}
            <PlayLog events={state.eventLog} t={t} />
          </div>

          <div className="table-stage">
            {others.length > 0 && (
              <div className="table-opponents">
                {others.map((p) => (
                  <PlayerSeat key={p.discordId} player={p} isYou={false} t={t} onCatch={catchUno} chip />
                ))}
              </div>
            )}

            <div className="table-rail">
              <div className="table-cloth">
                <FeltSurface id={feltId} className="absolute inset-0" />
                <CardFlight event={state.lastEvent} cardBack={state.you?.cardBack} />
                <div className="table-piles">
                  <button
                    type="button"
                    onClick={yourTurn ? drawCard : undefined}
                    className="table-pile table-pile-draw"
                    title={t("game.drawPile")}
                  >
                    <CardBack variant={state.you?.cardBack} />
                    <span className="table-pile-badge">{state.drawCount}</span>
                  </button>
                  <div
                    className={`table-pile table-pile-discard ${slam ? "card-slam" : ""}`}
                    title={t("game.discardPile")}
                  >
                    <div className={`table-discard-ring ${COLOR_BTN[state.currentColor] || "bg-black/40"}`}>
                      <Card card={state.topCard} />
                    </div>
                  </div>
                </div>
              </div>
              <span
                className={`table-dir-pip ${reverseSpin ? "table-dir-ccw" : ""}`}
                title={state.direction === 1 ? t("game.directionCw") : t("game.directionCcw")}
              >
                {state.direction === 1 ? "↻" : "↺"}
              </span>
            </div>
          </div>

          <div className="table-play-hand">
            {spectator && (
              <p className="mx-auto max-w-lg rounded-full bg-black/50 px-4 py-2 text-center text-sm font-black text-uno-yellow">
                {t("game.spectating")}
              </p>
            )}

            {(state.spectators || []).length > 0 && !spectator && (
              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-white/55">
                {t("game.watchers", { count: state.spectators.length })}
              </p>
            )}

            {jumpable.size > 0 && (
              <p className="text-center text-sm font-black text-uno-yellow">{t("game.jumpHint")}</p>
            )}

            {state.drawnThisTurn && yourTurn && (
              <p className="text-center text-sm text-uno-yellow">{t("game.mustPlayDrawn")}</p>
            )}

            <div className="hand-sort">
              <button
                type="button"
                onClick={() => setSortMode("color")}
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${sortMode === "color" ? "bg-uno-yellow text-black" : "bg-black/40"}`}
              >
                {t("game.sortColor")}
              </button>
              <button
                type="button"
                onClick={() => setSortMode("value")}
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${sortMode === "value" ? "bg-uno-yellow text-black" : "bg-black/40"}`}
              >
                {t("game.sortValue")}
              </button>
            </div>

            <HandFan
              cards={sortedHand}
              playable={playable}
              jumpable={jumpable}
              spectator={spectator}
              onPlay={playCard}
            />
          </div>

          <div className="table-play-actions">
            {!spectator && (
              <div className="table-play-controls">
                {you && <PlayerSeat player={you} isYou t={t} onCatch={catchUno} compact />}
                <button
                  type="button"
                  onClick={drawCard}
                  disabled={!yourTurn && !challenging}
                  className="uno-btn uno-btn-blue disabled:opacity-40"
                >
                  {state.drawStack > 0 ? t("game.drawStack", { count: state.drawStack }) : t("game.draw")}
                </button>
                <button
                  type="button"
                  onClick={passTurn}
                  disabled={!canPass}
                  className="uno-btn uno-btn-yellow disabled:opacity-40"
                >
                  {t("game.pass")}
                </button>
                <UnoButton onClick={shoutUno} pulse={you?.cardCount === 1} />
              </div>
            )}
            <ReactionBar reactions={state.reactions} onReact={react} />
          </div>
        </div>
      )}

      {choosing && (
        <div className="table-modal">
          <div className="table-modal-card">
            <h3>{t("game.chooseColor")}</h3>
            <div className="table-color-row">
              {COLORS.map((color) => (
                <Card
                  key={color}
                  small
                  title={t(`colors.${color}`)}
                  card={{ color, type: "wild", value: "wild" }}
                  onClick={() => chooseColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {swapping && (
        <div className="table-modal">
          <div className="table-modal-card">
            <h3>{t("game.chooseSwap")}</h3>
            <div className="table-swap-row">
              {others.map((p) => (
                <button
                  key={p.discordId}
                  type="button"
                  onClick={() => chooseSwap(p.discordId)}
                  className="table-swap-pick"
                >
                  <PlayerSeat player={p} t={t} chip />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {challenging && (
        <div className="table-modal">
          <div className="table-modal-card">
            <h3>{t("game.challengeTitle")}</h3>
            <p className="table-modal-hint">{t("game.challengeHint")}</p>
            <div className="table-modal-actions">
              <button type="button" onClick={challengePlus4} className="uno-btn uno-btn-red uno-btn-deal">
                {t("game.challengeYes")}
              </button>
              <button type="button" onClick={drawCard} className="uno-btn uno-btn-yellow uno-btn-sm">
                {t("game.challengeNo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

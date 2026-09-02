import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isMuted, playSound, setMuted } from "../lib/sounds.js";
import { getSessionToken } from "../lib/api.js";
import { createSocket } from "../socket.js";
import { useAuth } from "./AuthContext.jsx";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { session, player } = useAuth();
  const socketRef = useRef(null);
  const [state, setState] = useState(null);
  const [notice, setNotice] = useState(null);
  const [fx, setFx] = useState(null);
  const [muted, setMutedState] = useState(() => isMuted());

  useEffect(() => {
    const token = getSessionToken();
    if (!session || !player || !token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("game_state", (payload) => {
      const nextFx = payload.fx || payload.lastEvent?.fx;
      if (payload.sound) playSound(payload.sound);
      else if (nextFx === "uno") playSound("uno");
      else if (nextFx === "plus4" || nextFx === "catch") playSound("plus4");
      else if (nextFx === "win") playSound("win");
      setFx(nextFx || null);
      setState((prev) => ({
        ...payload,
        unlocks:
          payload.status === "finished"
            ? payload.unlocks || prev?.unlocks || {}
            : payload.unlocks,
      }));
    });

    socket.on("error_message", (payload) => {
      setNotice(payload.error || "error");
    });

    socket.on("connect_error", (err) => {
      setNotice(err.message === "unauthorized" ? "unauthorized" : "invalid_join");
    });

    socket.connect();
    const params = new URLSearchParams(window.location.search);
    const table = (params.get("table") || params.get("code") || "").trim();
    socket.emit("join_room", table ? { code: table } : {});

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.user?.discordId, session?.channelId, player?.discord_id]);

  useEffect(() => {
    if (!player) return;
    socketRef.current?.emit("update_cosmetics", {
      avatar: player.selected_avatar,
      nickname: player.nickname,
      felt: player.selected_felt,
      cardBack: player.selected_card_back,
      frame: player.selected_frame,
      equippedTitle: player.equipped_title,
    });
  }, [
    player?.selected_avatar,
    player?.nickname,
    player?.selected_felt,
    player?.selected_card_back,
    player?.selected_frame,
    player?.equipped_title,
  ]);

  const emit = (event, payload) => socketRef.current?.emit(event, payload);

  const value = useMemo(
    () => ({
      state,
      notice,
      fx,
      muted,
      toggleMute: () => {
        const next = !isMuted();
        setMuted(next);
        setMutedState(next);
      },
      clearNotice: () => setNotice(null),
      startGame: () => emit("start_game"),
      setRules: (rules) => emit("set_rules", rules),
      playCard: (cardId, chosenColor) => emit("play_card", { cardId, chosenColor }),
      chooseColor: (color) => emit("choose_color", { color }),
      chooseSwap: (targetId) => emit("choose_swap", { targetId }),
      drawCard: () => emit("draw_card"),
      passTurn: () => emit("pass_turn"),
      shoutUno: () => {
        playSound("uno");
        emit("shout_uno");
      },
      catchUno: (targetId) => emit("catch_uno", { targetId }),
      challengePlus4: () => emit("challenge_plus4"),
      react: (emoji) => emit("react", { emoji }),
      playAgain: () => emit("play_again"),
      addBot: () => emit("add_bot"),
      removeBot: () => emit("remove_bot"),
      joinRoom: (code) => emit("join_room", { code }),
      createRoom: () => emit("join_room", { create: true }),
      joinChannelTable: () => emit("join_room", {}),
    }),
    [state, notice, fx, muted]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

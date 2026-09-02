import { getSession } from "../auth/sessions.js";
import { isAllowedAvatarUrl, isBotId } from "../game/cosmetics.js";
import { deleteRoomIfEmpty, findRoomBySocket, forEachRoom, getOrCreateChannelRoom, getRoom, getRoomByCode, createPrivateRoom, sanitizeRoomCode } from "../game/rooms.js";
import { socketRateLimited } from "../middleware/auth.js";
import { bumpStats, recordMatch, setCosmetics, upsertPlayer } from "../store/playerStore.js";

let blitzTimer = null;
const botTimers = new Map();

function limited(socket, event, max, windowMs) {
  const key = socket.data.discordId || socket.id;
  if (socketRateLimited(key, event, max, windowMs)) {
    socket.emit("error_message", { error: "rate_limited" });
    return true;
  }
  return false;
}

function clearBotTimer(roomKey) {
  const id = botTimers.get(roomKey);
  if (id) {
    clearTimeout(id);
    botTimers.delete(roomKey);
  }
}

function scheduleBot(io, room) {
  clearBotTimer(room.code);
  if (!room.botAction()) return;
  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    const result = room.runBotTurn();
    if (!result?.ok) return;
    afterMove(io, room, result);
  }, 800);
  botTimers.set(room.code, timer);
}

function afterMove(io, room, result = {}) {
  broadcastRoom(io, room, { sound: result.sound, fx: result.fx });
  if (result.finished) {
    recordMatch({
      winnerId: result.winnerId,
      loserIds: result.losers,
      points: result.points,
      plus4Counts: result.plus4Counts,
    })
      .then((rec) => {
        broadcastRoom(io, room, { unlocks: rec.unlocksByPlayer || {} });
      })
      .catch(console.error);
    return;
  }
  scheduleBot(io, room);
}

export function attachSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.sessionToken;
    const session = getSession(token);
    if (!session?.channelId) return next(new Error("unauthorized"));
    socket.data.session = session;
    socket.data.discordId = session.discordId;
    next();
  });

  if (!blitzTimer) {
    blitzTimer = setInterval(() => {
      forEachRoom((room) => {
        const blitz = room.resolveBlitzTimeout();
        if (blitz.ok && blitz.timedOut) {
          afterMove(io, room, blitz);
          return;
        }
        const afk = room.resolveAbsentTurn();
        if (afk.ok && afk.timedOut) afterMove(io, room, afk);
      });
    }, 400);
    if (typeof blitzTimer.unref === "function") blitzTimer.unref();
  }

  io.on("connection", (socket) => {
    socket.on("join_room", async (payload = {}) => {
      if (limited(socket, "join_room", 8, 10_000)) return;
      const session = socket.data.session;
      if (!session?.channelId) {
        socket.emit("error_message", { error: "invalid_join" });
        return;
      }

      let player;
      try {
        player = await upsertPlayer(session.discordId, session.username);
      } catch (err) {
        console.error(err);
        socket.emit("error_message", { error: "store_unavailable" });
        return;
      }

      let room = null;
      const wantCreate = payload.create === true;
      const rawCode = typeof payload.code === "string" ? payload.code : "";

      if (wantCreate) {
        leaveCurrentRoom(io, socket);
        room = createPrivateRoom(session.channelId);
      } else if (rawCode) {
        const code = sanitizeRoomCode(rawCode);
        if (!code) {
          socket.emit("error_message", { error: "invalid_room_code" });
          return;
        }
        room = getRoomByCode(code);
        if (!room) {
          socket.emit("error_message", { error: "room_not_found" });
          return;
        }
      } else {
        room = getOrCreateChannelRoom(session.channelId);
      }

      if (socket.data.roomCode && socket.data.roomCode !== room.code) {
        leaveCurrentRoom(io, socket);
      }

      const result = room.addPlayer({
        discordId: session.discordId,
        username: session.username,
        avatar: player.selected_avatar,
        nickname: player.nickname,
        felt: player.selected_felt,
        cardBack: player.selected_card_back,
        frame: player.selected_frame,
        equippedTitle: player.equipped_title,
        discordAvatar: isAllowedAvatarUrl(session.avatarUrl) ? session.avatarUrl : "",
        socketId: socket.id,
      });

      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }

      socket.data.roomCode = room.code;
      socket.join(room.code);
      broadcastRoom(io, room);
      scheduleBot(io, room);
    });

    socket.on("set_rules", (payload = {}) => {
      if (limited(socket, "set_rules", 10, 5000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.setRules(socket.data.discordId, payload);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      broadcastRoom(io, room);
    });

    socket.on("add_bot", () => {
      if (limited(socket, "add_bot", 5, 5000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.addBot(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      broadcastRoom(io, room);
    });

    socket.on("remove_bot", () => {
      if (limited(socket, "remove_bot", 5, 5000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.removeBot(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      broadcastRoom(io, room);
    });

    socket.on("start_game", () => {
      if (limited(socket, "start_game", 5, 5000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.start(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      afterMove(io, room, result);
    });

    socket.on("play_card", (payload = {}) => {
      if (limited(socket, "play_card", 30, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      handlePlayResult(
        io,
        socket,
        room,
        room.playCard(socket.data.discordId, payload.cardId, payload.chosenColor)
      );
    });

    socket.on("choose_color", (payload = {}) => {
      if (limited(socket, "choose_color", 10, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      handlePlayResult(io, socket, room, room.chooseColor(socket.data.discordId, payload.color));
    });

    socket.on("choose_swap", (payload = {}) => {
      if (limited(socket, "choose_swap", 10, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      handlePlayResult(io, socket, room, room.chooseSwap(socket.data.discordId, payload.targetId));
    });

    socket.on("challenge_plus4", () => {
      if (limited(socket, "challenge_plus4", 10, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      handlePlayResult(io, socket, room, room.challengePlus4(socket.data.discordId));
    });

    socket.on("draw_card", () => {
      if (limited(socket, "draw_card", 15, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.drawCard(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      afterMove(io, room, result);
    });

    socket.on("pass_turn", () => {
      if (limited(socket, "pass_turn", 15, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.passTurn(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      afterMove(io, room, result);
    });

    socket.on("shout_uno", () => {
      if (limited(socket, "shout_uno", 2, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.shoutUno(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      if (result.validCall && !isBotId(socket.data.discordId)) {
        bumpStats(socket.data.discordId, { uno_shouts: 1 }).catch(console.error);
      }
      afterMove(io, room, { ...result, sound: "uno", fx: "uno" });
    });

    socket.on("catch_uno", (payload = {}) => {
      if (limited(socket, "catch_uno", 8, 2000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.catchUno(socket.data.discordId, payload.targetId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      if (!isBotId(socket.data.discordId)) {
        bumpStats(socket.data.discordId, { catches: 1 }).catch(console.error);
      }
      afterMove(io, room, { ...result, sound: "plus4", fx: "catch" });
    });

    socket.on("react", (payload = {}) => {
      if (limited(socket, "react", 5, 3000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.addReaction(socket.data.discordId, payload.emoji);
      if (!result.ok) return;
      broadcastRoom(io, room, { reaction: result.reaction });
    });

    socket.on("update_cosmetics", async (payload = {}) => {
      if (limited(socket, "update_cosmetics", 10, 10_000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      let result;
      try {
        result = await setCosmetics(socket.data.discordId, payload);
      } catch (err) {
        console.error(err);
        socket.emit("error_message", { error: "store_unavailable" });
        return;
      }
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      const p = result.player;
      room.updateCosmetics(socket.data.discordId, {
        avatar: p.selected_avatar,
        nickname: p.nickname,
        felt: p.selected_felt,
        cardBack: p.selected_card_back,
        frame: p.selected_frame,
        equippedTitle: p.equipped_title,
        discordAvatar: isAllowedAvatarUrl(socket.data.session.avatarUrl)
          ? socket.data.session.avatarUrl
          : "",
      });
      broadcastRoom(io, room);
    });

    socket.on("play_again", () => {
      if (limited(socket, "play_again", 5, 5000)) return;
      const room = requireSeat(socket);
      if (!room) return;
      const result = room.playAgain(socket.data.discordId);
      if (!result.ok) {
        socket.emit("error_message", result);
        return;
      }
      broadcastRoom(io, room);
    });

    socket.on("disconnect", () => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;
      room.removeSocket(socket.id);
      clearBotTimer(room.code);
      broadcastRoom(io, room);
      deleteRoomIfEmpty(room.code);
    });
  });
}

function leaveCurrentRoom(io, socket) {
  const previous = findRoomBySocket(socket.id);
  if (!previous) {
    socket.data.roomCode = null;
    return;
  }
  socket.leave(previous.code);
  previous.removeSocket(socket.id);
  clearBotTimer(previous.code);
  socket.data.roomCode = null;
  broadcastRoom(io, previous);
  deleteRoomIfEmpty(previous.code);
}

function roomOf(socket) {
  if (!socket.data.roomCode) return null;
  return getRoom(socket.data.roomCode);
}

function requireSeat(socket) {
  const room = roomOf(socket);
  if (!room) return null;
  const occupant = room.findOccupant(socket.data.discordId);
  if (!occupant || occupant.socketId !== socket.id) return null;
  return room;
}

function handlePlayResult(io, socket, room, result) {
  if (!result.ok) {
    socket.emit("error_message", result);
    return;
  }
  afterMove(io, room, result);
}

function broadcastRoom(io, room, extra = {}) {
  for (const player of room.occupants()) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit("game_state", {
      ...room.publicState(player.discordId),
      ...extra,
    });
  }
}

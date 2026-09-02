import assert from "node:assert/strict";
import { test } from "node:test";
import { createDeck } from "../game/cards.js";
import { UnoEngine } from "../game/UnoEngine.js";
import { deleteRoomIfEmpty, getOrCreateChannelRoom, getOrCreateRoom, getRoom, getRoomByCode, createPrivateRoom, sanitizeRoomCode } from "../game/rooms.js";
import { CARD_BACK_CATALOG, discordAvatarUrl, FELT_CATALOG, FRAME_CATALOG, HOUSE_BOT_ID, isAllowedAvatarUrl, isCosmeticUnlocked, REACTION_EMOJIS } from "../game/cosmetics.js";

function twoPlayers(channelId = "test") {
  const room = new UnoEngine(channelId);
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addPlayer({ discordId: "bob", username: "Bob", socketId: "s-b" });
  return room;
}

test("baralho oficial tem 108 cartas", () => {
  const deck = createDeck();
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((c) => c.value === "wild").length, 4);
  assert.equal(deck.filter((c) => c.value === "wild_draw4").length, 4);
  assert.equal(deck.filter((c) => c.value === "0").length, 4);
  assert.equal(deck.filter((c) => c.value === "skip").length, 8);
});

test("start reparte 7 cartas e exige o anfitrião", () => {
  const room = twoPlayers();
  assert.equal(room.start("bob").ok, false);
  assert.equal(room.start("bob").error, "not_host");
  const started = room.start("alice");
  assert.equal(started.ok, true);
  assert.equal(room.hands.get("alice").length, 7);
  assert.equal(room.hands.get("bob").length, 7);
  assert.equal(room.discardPile.length, 1);
  assert.equal(room.status, "playing");
});

test("jogada inválida (cor e valor diferentes) é rejeitada", () => {
  const room = twoPlayers();
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.pendingColorChoice = null;
  room.pendingSwap = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.currentColor = "blue";
  room.discardPile = [{ id: "top", color: "blue", value: "9", type: "number" }];
  room.hands.set("alice", [{ id: "bad", color: "red", value: "1", type: "number" }]);
  const result = room.playCard("alice", "bad");
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_play");
});

test("grito UNO só conta uma vez enquanto a bandeira called está activa", () => {
  const room = twoPlayers();
  room.start("alice");
  room.hands.set("alice", [
    { id: "a1", color: "red", value: "1", type: "number" },
    { id: "a2", color: "red", value: "2", type: "number" },
  ]);
  room.unoFlags.set("alice", { called: false, vulnerable: false });
  const first = room.shoutUno("alice");
  const second = room.shoutUno("alice");
  assert.equal(first.validCall, true);
  assert.equal(second.validCall, false);
  assert.equal(room.unoShoutCounts.get("alice"), 1);
});

test("Stack: +2 em cima de +2 acumula a pilha", () => {
  const room = twoPlayers();
  room.setRules("alice", { stack: true });
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.pendingColorChoice = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.drawStackType = null;
  room.currentColor = "red";
  room.discardPile = [{ id: "top", color: "red", value: "1", type: "number" }];
  room.hands.set("alice", [
    { id: "d2a", color: "red", value: "draw2", type: "action" },
    { id: "keep", color: "green", value: "3", type: "number" },
  ]);
  room.hands.set("bob", [
    { id: "d2b", color: "blue", value: "draw2", type: "action" },
    { id: "keep2", color: "green", value: "4", type: "number" },
  ]);
  assert.equal(room.playCard("alice", "d2a").ok, true);
  assert.equal(room.drawStack, 2);
  assert.equal(room.currentPlayer()?.discordId, "bob");
  assert.equal(room.playCard("bob", "d2b").ok, true);
  assert.equal(room.drawStack, 4);
});

test("host passa para o próximo jogador ligado ao sair", () => {
  const room = twoPlayers();
  assert.equal(room.hostId, "alice");
  room.removeSocket("s-a");
  assert.equal(room.hostId, "bob");
  assert.equal(room.players.find((p) => p.discordId === "alice").connected, false);
});

test("playAgain só o host e só com o jogo acabado ou no lobby", () => {
  const room = twoPlayers();
  room.start("alice");
  assert.equal(room.playAgain("alice").error, "game_in_progress");
  room.status = "finished";
  assert.equal(room.playAgain("bob").error, "not_host");
  assert.equal(room.playAgain("alice").ok, true);
  assert.equal(room.status, "waiting");
});

test("Blitz timeout nomeia quem ficou sem tempo, não o jogador seguinte", () => {
  const room = twoPlayers();
  room.setRules("alice", { blitz: true });
  room.start("alice");
  room.status = "choosing_color";
  room.pendingColorChoice = "alice";
  room.currentColor = "red";
  room.turnDeadline = Date.now() - 1;
  room.discardPile = [{ id: "w", color: "black", value: "wild", type: "wild" }];
  const result = room.resolveBlitzTimeout();
  assert.equal(result.timedOut, true);
  assert.equal(room.lastEvent.params.name, "Alice");
});

test("sala a jogar é apagada se ninguém estiver ligado", () => {
  const id = `ch-${Date.now()}`;
  const room = getOrCreateRoom(id);
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addPlayer({ discordId: "bob", username: "Bob", socketId: "s-b" });
  room.start("alice");
  assert.equal(room.status, "playing");
  room.removeSocket("s-a");
  room.removeSocket("s-b");
  deleteRoomIfEmpty(id);
  assert.equal(getRoom(id), null);
});

test("Jump-in: carta igual fora da vez rouba o turno", () => {
  const room = new UnoEngine("jump");
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addPlayer({ discordId: "bob", username: "Bob", socketId: "s-b" });
  room.addPlayer({ discordId: "carol", username: "Carol", socketId: "s-c" });
  room.setRules("alice", { jumpIn: true });
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.pendingColorChoice = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.currentColor = "red";
  room.discardPile = [{ id: "top", color: "red", value: "3", type: "number" }];
  room.hands.set("alice", [
    { id: "a7", color: "red", value: "7", type: "number" },
    { id: "keep-a", color: "green", value: "1", type: "number" },
  ]);
  room.hands.set("bob", [{ id: "keep-b", color: "blue", value: "2", type: "number" }]);
  room.hands.set("carol", [
    { id: "c7", color: "red", value: "7", type: "number" },
    { id: "keep-c", color: "yellow", value: "4", type: "number" },
  ]);
  assert.equal(room.playCard("alice", "a7").ok, true);
  assert.equal(room.currentPlayer()?.discordId, "bob");
  const jumped = room.playCard("carol", "c7");
  assert.equal(jumped.ok, true);
  assert.equal(jumped.fx, "jump");
  assert.equal(room.lastEvent.type, "jumped_in");
  assert.equal(room.currentPlayer()?.discordId, "alice");
});

test("Desafio +4: se o acusado tinha a cor, leva 4 e o desafiante joga", () => {
  const room = twoPlayers("chal-g");
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.currentColor = "red";
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.discardPile = [{ id: "top", color: "red", value: "5", type: "number" }];
  room.hands.set("alice", [
    { id: "w4", color: "black", value: "wild_draw4", type: "wild" },
    { id: "secret", color: "red", value: "2", type: "number" },
    { id: "keep", color: "green", value: "9", type: "number" },
  ]);
  room.hands.set("bob", [
    { id: "b1", color: "blue", value: "1", type: "number" },
    { id: "b2", color: "yellow", value: "3", type: "number" },
  ]);
  assert.equal(room.playCard("alice", "w4", "blue").ok, true);
  assert.equal(room.status, "pending_challenge");
  assert.equal(room.pendingChallenge.challengerId, "bob");
  const bobBefore = room.hands.get("bob").length;
  const aliceBefore = room.hands.get("alice").length;
  const result = room.challengePlus4("bob");
  assert.equal(result.ok, true);
  assert.equal(result.guilty, true);
  assert.equal(room.hands.get("alice").length, aliceBefore + 4);
  assert.equal(room.hands.get("bob").length, bobBefore);
  assert.equal(room.currentPlayer()?.discordId, "bob");
});

test("Desafio +4: jogada legal, o desafiante leva 6", () => {
  const room = twoPlayers("chal-i");
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.currentColor = "red";
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.discardPile = [{ id: "top", color: "red", value: "5", type: "number" }];
  room.hands.set("alice", [
    { id: "w4", color: "black", value: "wild_draw4", type: "wild" },
    { id: "keep", color: "green", value: "9", type: "number" },
  ]);
  room.hands.set("bob", [{ id: "b1", color: "blue", value: "1", type: "number" }]);
  assert.equal(room.playCard("alice", "w4", "yellow").ok, true);
  const bobBefore = room.hands.get("bob").length;
  const result = room.challengePlus4("bob");
  assert.equal(result.guilty, false);
  assert.equal(room.hands.get("bob").length, bobBefore + 6);
  assert.equal(room.currentPlayer()?.discordId, "alice");
});

test("quem entra a meio fica a ver e senta-se na ronda seguinte", () => {
  const room = twoPlayers("spec");
  room.start("alice");
  const join = room.addPlayer({ discordId: "carol", username: "Carol", socketId: "s-c" });
  assert.equal(join.ok, true);
  assert.equal(join.spectator, true);
  assert.equal(room.spectators.length, 1);
  assert.equal(room.publicState("carol").you.spectator, true);
  room.status = "finished";
  assert.equal(room.playAgain("alice").ok, true);
  assert.equal(room.players.some((p) => p.discordId === "carol"), true);
  assert.equal(room.spectators.length, 0);
});

test("série: ao terceiro golo declara o campeão e o playAgain limpa o placar", () => {
  const room = twoPlayers("ser");
  room.setRules("alice", { series: true });
  room.start("alice");
  room.hands.set("alice", []);
  room.hands.set("bob", [{ id: "x", color: "red", value: "1", type: "number" }]);
  room.finishGame("alice");
  room.playAgain("alice");
  room.start("alice");
  room.hands.set("alice", []);
  room.hands.set("bob", [{ id: "y", color: "red", value: "2", type: "number" }]);
  room.finishGame("alice");
  room.playAgain("alice");
  room.start("alice");
  room.hands.set("alice", []);
  room.hands.set("bob", [{ id: "z", color: "red", value: "3", type: "number" }]);
  const last = room.finishGame("alice");
  assert.equal(last.ok, true);
  assert.equal(room.seriesWinnerId, "alice");
  assert.equal(room.matchScores.alice, 3);
  assert.equal(room.lastEvent.type, "series_over");
  room.playAgain("alice");
  assert.equal(room.seriesWinnerId, null);
  assert.equal(room.matchScores.alice, 0);
});

test("avatars Discord só aceitam o CDN oficial /avatars/", () => {
  const ok = discordAvatarUrl("123", "abcDEF");
  assert.equal(isAllowedAvatarUrl(ok), true);
  assert.equal(isAllowedAvatarUrl("https://evil.example/avatars/1/x.png"), false);
  assert.equal(isAllowedAvatarUrl("https://cdn.discordapp.com/attachments/1/x.png"), false);
  assert.equal(isCosmeticUnlocked({ unlock: { type: "default" } }, {}), true);
  assert.equal(isCosmeticUnlocked({ unlock: { type: "wins", value: 2 } }, { wins: 1 }), false);
  assert.equal(isCosmeticUnlocked({ unlock: { type: "wins", value: 2 } }, { wins: 2 }), true);
});

test("anfitrião chama o bot e a partida começa a dois", () => {
  const room = new UnoEngine("bot-room");
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  assert.equal(room.addBot("bob").error, "not_host");
  assert.equal(room.addBot("alice").ok, true);
  assert.equal(room.players.some((p) => p.discordId === HOUSE_BOT_ID), true);
  assert.equal(room.start("alice").ok, true);
  assert.equal(room.hands.get(HOUSE_BOT_ID).length, 7);
});

test("bot joga uma carta válida na sua vez", () => {
  const room = new UnoEngine("bot-play");
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addBot("alice");
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = room.players.findIndex((p) => p.isBot);
  room.pendingColorChoice = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.currentColor = "red";
  room.discardPile = [{ id: "top", color: "red", value: "3", type: "number" }];
  room.hands.set(HOUSE_BOT_ID, [
    { id: "bot-red", color: "red", value: "9", type: "number" },
    { id: "keep", color: "green", value: "1", type: "number" },
  ]);
  room.hands.set("alice", [{ id: "a1", color: "blue", value: "2", type: "number" }]);
  const result = room.runBotTurn();
  assert.equal(result.ok, true);
  assert.equal(room.topCard().id, "bot-red");
});

test("Robot no +4 não lê a mão: 1 carta culpada, aceita", () => {
  const room = new UnoEngine("bot-plus4");
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addBot("alice");
  room.start("alice");
  room.status = "pending_challenge";
  room.pendingChallenge = {
    challengerId: HOUSE_BOT_ID,
    accusedId: "alice",
    colorAtPlay: "red",
  };
  room.hands.set("alice", [{ id: "guilty", color: "red", value: "1", type: "number" }]);
  room.hands.set(HOUSE_BOT_ID, [{ id: "b1", color: "blue", value: "2", type: "number" }]);
  const action = room.botAction();
  assert.equal(action.fn, "drawCard");
});

test("Robot grita UNO antes de jump-in com 2 cartas", () => {
  const room = new UnoEngine("bot-jump-uno");
  room.addPlayer({ discordId: "alice", username: "Alice", socketId: "s-a" });
  room.addBot("alice");
  room.setRules("alice", { jumpIn: true });
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.pendingColorChoice = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.currentColor = "red";
  room.discardPile = [{ id: "top", color: "red", value: "3", type: "number" }];
  room.hands.set(HOUSE_BOT_ID, [
    { id: "j1", color: "red", value: "3", type: "number" },
    { id: "keep", color: "green", value: "1", type: "number" },
  ]);
  room.unoFlags.set(HOUSE_BOT_ID, { called: false, vulnerable: false });
  const result = room.runBotTurn();
  assert.equal(result.ok, true);
  assert.equal(room.unoFlags.get(HOUSE_BOT_ID).called, true);
  assert.equal(room.topCard().id, "j1");
  assert.equal(room.hands.get(HOUSE_BOT_ID).length, 1);
  assert.equal(room.players.find((p) => p.isBot).username, "Robot");
});

test("eventLog guarda as últimas jogadas", () => {
  const room = twoPlayers("log");
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.currentColor = "red";
  room.drawnThisTurn = null;
  room.drawStack = 0;
  room.discardPile = [{ id: "top", color: "red", value: "1", type: "number" }];
  room.hands.set("alice", [
    { id: "r2", color: "red", value: "2", type: "number" },
    { id: "keep", color: "green", value: "4", type: "number" },
  ]);
  room.playCard("alice", "r2");
  assert.ok(room.eventLog.some((e) => e.type === "played_card"));
  assert.ok(room.publicState("bob").eventLog.length >= 1);
});

test("publicState não envia a carta comprada aos adversários", () => {
  const room = twoPlayers("draw-leak");
  room.start("alice");
  room.drawnThisTurn = { id: "secret", color: "red", value: "7", type: "number" };
  const alice = room.publicState("alice");
  const bob = room.publicState("bob");
  assert.equal(alice.drawnThisTurn, true);
  assert.equal(bob.drawnThisTurn, true);
  assert.equal(typeof bob.drawnThisTurn, "boolean");
  assert.equal(bob.you.hand.some((c) => c.id === "secret"), false);
});

test("jogador desligado perde a vez depois do graça AFK", () => {
  const room = twoPlayers("afk");
  room.start("alice");
  room.status = "playing";
  room.currentPlayerIndex = 0;
  room.pendingColorChoice = null;
  room.pendingSwap = null;
  room.pendingChallenge = null;
  room.drawnThisTurn = null;
  room.drawStack = 0;
  const before = room.hands.get("alice").length;
  room.removeSocket("s-a");
  assert.equal(room.resolveAbsentTurn().ok, false);
  room.players.find((p) => p.discordId === "alice").disconnectedAt = Date.now() - 9000;
  const skipped = room.resolveAbsentTurn();
  assert.equal(skipped.ok, true);
  assert.equal(room.currentPlayer()?.discordId, "bob");
  assert.equal(room.hands.get("alice").length, before + 1);
  assert.equal(room.lastEvent.type, "player_afk");
});

test("homenagem da casa está no catálogo", () => {
  assert.ok(FELT_CATALOG.some((x) => x.id === "elmo"));
  assert.ok(CARD_BACK_CATALOG.some((x) => x.id === "bricks"));
  assert.ok(FRAME_CATALOG.some((x) => x.id === "blade"));
  assert.ok(REACTION_EMOJIS.includes("🔪"));
  assert.ok(REACTION_EMOJIS.includes("👀"));
});

test("código de sala: canal partilha mesa, código entra noutra", () => {
  assert.equal(sanitizeRoomCode("ab-cd"), "ABCD");
  assert.equal(sanitizeRoomCode("no"), "");
  const channel = `voice-${Date.now()}`;
  const a = getOrCreateChannelRoom(channel);
  const b = getOrCreateChannelRoom(channel);
  assert.equal(a.code, b.code);
  assert.equal(getRoomByCode(a.code.toLowerCase()), a);
  const priv = createPrivateRoom(channel);
  assert.notEqual(priv.code, a.code);
  assert.equal(getRoomByCode(priv.code), priv);
});

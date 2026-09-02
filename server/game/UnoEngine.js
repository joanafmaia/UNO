import { DEFAULT_RULES, EVENT_LOG_LIMIT, HOUSE_BOT_ID, isBotId, MAX_PLAYERS, MAX_SPECTATORS, REACTION_EMOJIS, SERIES_TARGET } from "./cosmetics.js";
import { cardPoints, createDeck, isWild, shuffle } from "./cards.js";

const STARTING_HAND = 7;
const BLITZ_MS = 10_000;
const REACTION_LIMIT = 12;
const LIVE_STATUSES = ["playing", "choosing_color", "choosing_swap", "pending_challenge"];

/**
 * Motor de regras do UNO + modos da casa (Stack, 7/0, Blitz, Jump-in, série).
 */
export class UnoEngine {
  constructor(channelId, code = channelId) {
    this.channelId = channelId;
    this.code = String(code || channelId).toUpperCase();
    this.privateTable = false;
    this.status = "waiting";
    this.players = [];
    this.spectators = [];
    this.hands = new Map();
    this.drawPile = [];
    this.discardPile = [];
    this.currentColor = null;
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.pendingColorChoice = null;
    this.pendingSwap = null;
    this.pendingChallenge = null;
    this.plus4ColorAtPlay = null;
    this.drawnThisTurn = null;
    this.unoFlags = new Map();
    this.plus4Counts = new Map();
    this.unoShoutCounts = new Map();
    this.catchCounts = new Map();
    this.winnerId = null;
    this.lastRoundPoints = 0;
    this.seriesWinnerId = null;
    this.matchScores = {};
    this.lastEvent = null;
    this.hostId = null;
    this.rules = { ...DEFAULT_RULES };
    this.drawStack = 0;
    this.drawStackType = null;
    this.turnDeadline = null;
    this.reactions = [];
    this.eventLog = [];
  }

  occupants() {
    return [...this.players, ...this.spectators];
  }

  findOccupant(discordId) {
    return this.occupants().find((p) => p.discordId === discordId) || null;
  }

  seatPlayer(player) {
    const seated = {
      discordId: player.discordId,
      username: player.username,
      socketId: player.socketId,
      connected: true,
      disconnectedAt: null,
      avatar: player.avatar || "educado",
      nickname: player.nickname || "",
      felt: player.felt || "classic",
      cardBack: player.cardBack || "classic",
      frame: player.frame || "none",
      equippedTitle: player.equippedTitle || "",
      discordAvatar: player.discordAvatar || "",
      isBot: Boolean(player.isBot) || isBotId(player.discordId),
    };
    if (this.matchScores[player.discordId] === undefined) this.matchScores[player.discordId] = 0;
    return seated;
  }

  addPlayer(player) {
    const existing = this.findOccupant(player.discordId);
    if (existing) {
      this.applyCosmetics(existing, player);
      existing.connected = true;
      existing.socketId = player.socketId;
      existing.disconnectedAt = null;
      return { ok: true, rejoined: true, spectator: this.spectators.includes(existing) };
    }

    const live = LIVE_STATUSES.includes(this.status);
    if (live) {
      if (this.spectators.length >= MAX_SPECTATORS) return { ok: false, error: "room_full" };
      const seated = this.seatPlayer(player);
      this.spectators.push(seated);
      this.setEvent("spectator_joined", { name: this.displayName(player.discordId) });
      return { ok: true, spectator: true };
    }

    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: "room_full" };

    this.players.push(this.seatPlayer(player));
    if (!this.hostId || isBotId(this.hostId)) {
      const human = this.players.find((p) => !p.isBot);
      this.hostId = human?.discordId || player.discordId;
    }
    this.setEvent("house_hello", { name: this.displayName(player.discordId) });
    return { ok: true };
  }

  addBot(requestedBy) {
    if (requestedBy !== this.hostId) return { ok: false, error: "not_host" };
    if (this.status !== "waiting") return { ok: false, error: "game_in_progress" };
    if (this.players.some((p) => p.isBot)) return { ok: true, already: true };
    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: "room_full" };
    this.players.push(this.seatPlayer({
      discordId: HOUSE_BOT_ID,
      username: "Robot",
      nickname: "Robot",
      avatar: "educado",
      socketId: null,
      isBot: true,
    }));
    this.setEvent("bot_joined", { name: this.displayName(HOUSE_BOT_ID) });
    return { ok: true };
  }

  removeBot(requestedBy) {
    if (requestedBy !== this.hostId) return { ok: false, error: "not_host" };
    if (this.status !== "waiting") return { ok: false, error: "game_in_progress" };
    const before = this.players.length;
    this.players = this.players.filter((p) => !p.isBot);
    if (this.players.length === before) return { ok: true };
    this.setEvent("bot_left", { name: "Robot" });
    return { ok: true };
  }

  applyCosmetics(existing, incoming) {
    existing.username = incoming.username || existing.username;
    existing.avatar = incoming.avatar || existing.avatar;
    if (incoming.nickname !== undefined) existing.nickname = incoming.nickname;
    if (incoming.felt) existing.felt = incoming.felt;
    if (incoming.cardBack) existing.cardBack = incoming.cardBack;
    if (incoming.frame) existing.frame = incoming.frame;
    if (incoming.equippedTitle !== undefined) existing.equippedTitle = incoming.equippedTitle;
    if (incoming.discordAvatar !== undefined) existing.discordAvatar = incoming.discordAvatar;
  }

  updateCosmetics(discordId, cosmetics) {
    const player = this.findOccupant(discordId);
    if (!player) return { ok: false, error: "not_in_game" };
    this.applyCosmetics(player, cosmetics);
    return { ok: true };
  }

  setRules(requestedBy, next = {}) {
    if (requestedBy !== this.hostId) return { ok: false, error: "not_host" };
    if (this.status !== "waiting") return { ok: false, error: "game_in_progress" };
    this.rules = {
      stack: Boolean(next.stack),
      chaos70: Boolean(next.chaos70),
      blitz: Boolean(next.blitz),
      jumpIn: Boolean(next.jumpIn),
      series: Boolean(next.series),
    };
    if (!this.rules.series) {
      this.seriesWinnerId = null;
      this.matchScores = {};
      for (const p of this.players) this.matchScores[p.discordId] = 0;
    }
    this.setEvent("rules_updated", { ...this.rules });
    return { ok: true };
  }

  addReaction(discordId, emoji) {
    if (!REACTION_EMOJIS.includes(emoji)) return { ok: false, error: "invalid_play" };
    if (!this.findOccupant(discordId)) return { ok: false, error: "not_in_game" };
    const reaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: this.displayName(discordId),
      fromId: discordId,
      emoji,
      at: Date.now(),
    };
    this.reactions = [...this.reactions, reaction].slice(-REACTION_LIMIT);
    return { ok: true, reaction };
  }

  removeSocket(socketId) {
    const player = this.occupants().find((p) => p.socketId === socketId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = Date.now();
    const watching = this.spectators.includes(player);
    this.setEvent(watching ? "spectator_left" : "player_left", { name: this.displayName(player.discordId) });
    if (!watching && player.discordId === this.hostId) {
      const next = this.players.find((p) => p.connected && !p.isBot && p.discordId !== player.discordId);
      if (next) this.hostId = next.discordId;
    }
  }

  start(requestedBy) {
    if (requestedBy !== this.hostId) return { ok: false, error: "not_host" };
    if (this.players.length < 2) return { ok: false, error: "need_two_players" };
    if (this.status !== "waiting") return { ok: false, error: "already_started" };

    this.drawPile = shuffle(createDeck());
    this.discardPile = [];
    this.hands.clear();
    this.unoFlags.clear();
    this.plus4Counts.clear();
    this.unoShoutCounts.clear();
    this.catchCounts.clear();
    this.winnerId = null;
    this.drawnThisTurn = null;
    this.pendingColorChoice = null;
    this.pendingSwap = null;
    this.pendingChallenge = null;
    this.plus4ColorAtPlay = null;
    this.drawStack = 0;
    this.drawStackType = null;
    this.direction = 1;
    this.currentPlayerIndex = 0;
    this.reactions = [];
    this.eventLog = [];

    for (const player of this.players) {
      this.hands.set(player.discordId, this.drawPile.splice(0, STARTING_HAND));
      this.unoFlags.set(player.discordId, { called: false, vulnerable: false });
      this.plus4Counts.set(player.discordId, 0);
      this.unoShoutCounts.set(player.discordId, 0);
      this.catchCounts.set(player.discordId, 0);
    }

    let first = this.drawPile.pop();
    while (isWild(first) || first.value === "draw2") {
      this.drawPile.unshift(first);
      this.drawPile = shuffle(this.drawPile);
      first = this.drawPile.pop();
    }
    this.discardPile.push(first);
    this.currentColor = first.color;
    this.status = "playing";

    if (first.value === "skip") this.advanceTurn();
    else if (first.value === "reverse" && this.players.length > 2) this.direction *= -1;

    this.refreshDeadline();
    this.setEvent("game_started", { card: first }, "play");
    return { ok: true, sound: "play", fx: "play" };
  }

  playCard(discordId, cardId, chosenColor) {
    if (this.pendingChallenge) return { ok: false, error: "choose_challenge_first" };

    const hand = this.hands.get(discordId);
    if (!hand) return { ok: false, error: "not_in_game" };
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { ok: false, error: "card_not_in_hand" };

    const card = hand[cardIndex];
    const jumping = this.isJumpPlay(discordId, card);

    if (!jumping) {
      const guard = this.requireTurn(discordId);
      if (!guard.ok) return guard;
      if (this.pendingColorChoice) return { ok: false, error: "choose_color_first" };
      if (this.pendingSwap) return { ok: false, error: "choose_swap_first" };
      if (this.drawnThisTurn && card.id !== this.drawnThisTurn.id) {
        return { ok: false, error: "must_play_drawn_or_pass" };
      }
      if (!this.isPlayable(card, discordId)) {
        return { ok: false, error: "invalid_play" };
      }
    }

    const colorBefore = this.currentColor;

    if (isWild(card) && !this.isValidColor(chosenColor)) {
      hand.splice(cardIndex, 1);
      this.discardPile.push(card);
      this.drawnThisTurn = null;
      this.updateUnoVulnerability(discordId, hand.length);
      this.pendingColorChoice = discordId;
      this.status = "choosing_color";
      if (card.value === "wild_draw4") this.plus4ColorAtPlay = colorBefore;
      this.setEvent("need_color", { name: this.displayName(discordId), card }, "play");
      return { ok: true, needColor: true, sound: "play", fx: "play" };
    }

    hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.drawnThisTurn = null;
    if (card.value === "wild_draw4") this.plus4ColorAtPlay = colorBefore;
    if (!isWild(card)) this.currentColor = card.color;
    else this.currentColor = chosenColor;

    if (card.value === "wild_draw4") {
      this.plus4Counts.set(discordId, (this.plus4Counts.get(discordId) || 0) + 1);
    }

    if (jumping) {
      const idx = this.players.findIndex((p) => p.discordId === discordId);
      if (idx >= 0) this.currentPlayerIndex = idx;
    }

    this.updateUnoVulnerability(discordId, hand.length);
    if (hand.length === 0) return this.finishGame(discordId);

    const action = this.applyAction(card, discordId);
    if (action?.needSwap) {
      return { ok: true, needSwap: true, sound: "play", fx: "swap" };
    }
    if (action?.pendingChallenge) {
      return { ok: true, sound: "plus4", fx: "challenge" };
    }

    const fx = jumping ? "jump" : this.fxForCard(card, action);
    this.setEvent(jumping ? "jumped_in" : "played_card", {
      name: this.displayName(discordId),
      card,
      color: this.currentColor,
    }, fx);
    return { ok: true, sound: this.soundForFx(fx), fx };
  }

  chooseColor(discordId, color) {
    if (this.pendingColorChoice !== discordId) return { ok: false, error: "not_choosing" };
    if (!this.isValidColor(color)) return { ok: false, error: "invalid_color" };

    this.currentColor = color;
    this.pendingColorChoice = null;
    this.status = "playing";

    const top = this.topCard();
    const action = this.applyAction(top, discordId);
    if (action?.pendingChallenge) {
      return { ok: true, sound: "plus4", fx: "challenge" };
    }
    const fx = this.fxForCard(top, action);
    this.setEvent("color_chosen", {
      name: this.displayName(discordId),
      color,
      card: top,
    }, fx);
    return { ok: true, sound: this.soundForFx(fx), fx };
  }

  chooseSwap(discordId, targetId) {
    if (this.pendingSwap !== discordId) return { ok: false, error: "not_choosing" };
    if (discordId === targetId) return { ok: false, error: "cannot_swap_self" };
    if (!this.hands.has(targetId)) return { ok: false, error: "invalid_target" };

    this.swapHands(discordId, targetId);
    this.pendingSwap = null;
    this.status = "playing";
    this.advanceTurn();
    this.setEvent("swapped", {
      name: this.displayName(discordId),
      target: this.displayName(targetId),
    }, "swap");
    return { ok: true, sound: "play", fx: "swap" };
  }

  challengePlus4(discordId) {
    if (this.status !== "pending_challenge" || !this.pendingChallenge) {
      return { ok: false, error: "not_challenging" };
    }
    if (this.pendingChallenge.challengerId !== discordId) {
      return { ok: false, error: "not_your_turn" };
    }

    const { accusedId, colorAtPlay } = this.pendingChallenge;
    const accusedHand = this.hands.get(accusedId) || [];
    const guilty = accusedHand.some((c) => c.color === colorAtPlay);

    this.pendingChallenge = null;
    this.status = "playing";

    if (guilty) {
      this.giveCards(accusedId, 4);
      this.refreshDeadline();
      this.setEvent("plus4_caught", {
        name: this.displayName(discordId),
        accused: this.displayName(accusedId),
      }, "catch");
      return { ok: true, sound: "catch", fx: "catch", guilty: true };
    }

    this.giveCards(discordId, 6);
    this.advanceTurn();
    this.setEvent("plus4_stood", {
      name: this.displayName(discordId),
      accused: this.displayName(accusedId),
    }, "plus4");
    return { ok: true, sound: "plus4", fx: "plus4", guilty: false };
  }

  acceptPlus4(discordId) {
    if (this.status !== "pending_challenge" || !this.pendingChallenge) {
      return { ok: false, error: "not_challenging" };
    }
    if (this.pendingChallenge.challengerId !== discordId) {
      return { ok: false, error: "not_your_turn" };
    }
    this.giveCards(discordId, 4);
    this.pendingChallenge = null;
    this.status = "playing";
    this.advanceTurn();
    this.setEvent("drew_stack", { name: this.displayName(discordId), count: 4 }, "plus4");
    return { ok: true, sound: "plus4", fx: "plus4" };
  }

  drawCard(discordId) {
    if (this.pendingChallenge) return this.acceptPlus4(discordId);

    const guard = this.requireTurn(discordId);
    if (!guard.ok) return guard;
    if (this.pendingColorChoice) return { ok: false, error: "choose_color_first" };
    if (this.pendingSwap) return { ok: false, error: "choose_swap_first" };

    if (this.drawStack > 0) {
      const count = this.drawStack;
      this.giveCards(discordId, count);
      this.drawStack = 0;
      this.drawStackType = null;
      this.advanceTurn();
      this.setEvent("drew_stack", { name: this.displayName(discordId), count }, "plus4");
      return { ok: true, stacked: true, sound: "plus4", fx: "plus4" };
    }

    if (this.drawnThisTurn) return { ok: false, error: "already_drawn" };
    const card = this.takeFromDrawPile();
    this.hands.get(discordId).push(card);
    this.drawnThisTurn = card;
    this.updateUnoVulnerability(discordId, this.hands.get(discordId).length);
    this.setEvent("drew_card", { name: this.displayName(discordId) }, "draw");
    return { ok: true, card, playable: this.isPlayable(card, discordId), sound: "draw", fx: "draw" };
  }

  passTurn(discordId) {
    const guard = this.requireTurn(discordId);
    if (!guard.ok) return guard;
    if (this.drawStack > 0) return this.drawCard(discordId);
    if (!this.drawnThisTurn) return { ok: false, error: "must_draw_first" };
    this.drawnThisTurn = null;
    this.advanceTurn();
    this.setEvent("passed", { name: this.displayName(discordId) });
    return { ok: true };
  }

  shoutUno(discordId) {
    const hand = this.hands.get(discordId);
    if (!hand) return { ok: false, error: "not_in_game" };

    const flags = this.unoFlags.get(discordId) || { called: false, vulnerable: false };
    let validCall = false;
    if (hand.length <= 2 && !flags.called) {
      flags.called = true;
      flags.vulnerable = false;
      this.unoFlags.set(discordId, flags);
      validCall = true;
      this.unoShoutCounts.set(discordId, (this.unoShoutCounts.get(discordId) || 0) + 1);
    }

    this.setEvent("shouted_uno", { name: this.displayName(discordId) }, "uno");
    return { ok: true, validCall, sound: "uno", fx: "uno" };
  }

  catchUno(catcherId, targetId) {
    if (this.status !== "playing") return { ok: false, error: "not_playing" };
    if (catcherId === targetId) return { ok: false, error: "cannot_catch_self" };

    const hand = this.hands.get(targetId);
    const flags = this.unoFlags.get(targetId);
    if (!hand || !flags) return { ok: false, error: "invalid_target" };
    if (hand.length !== 1 || !flags.vulnerable || flags.called) {
      return { ok: false, error: "not_vulnerable" };
    }

    this.giveCards(targetId, 2);
    flags.vulnerable = false;
    flags.called = false;
    this.unoFlags.set(targetId, flags);
    this.catchCounts.set(catcherId, (this.catchCounts.get(catcherId) || 0) + 1);
    this.setEvent("caught_uno", {
      catcher: this.displayName(catcherId),
      target: this.displayName(targetId),
    }, "catch");
    return { ok: true, sound: "plus4", fx: "catch" };
  }

  resolveBlitzTimeout() {
    if (!this.rules.blitz) return { ok: false };
    if (!LIVE_STATUSES.includes(this.status)) return { ok: false };
    if (!this.turnDeadline || Date.now() < this.turnDeadline) return { ok: false };
    return this.forceSkipCurrent("blitz_timeout", "blitz");
  }

  resolveAbsentTurn() {
    if (!LIVE_STATUSES.includes(this.status)) return { ok: false };
    const actorId =
      this.pendingChallenge?.challengerId ||
      this.pendingColorChoice ||
      this.pendingSwap ||
      this.currentPlayer()?.discordId;
    const player = this.findOccupant(actorId);
    if (!player || player.isBot || player.connected) return { ok: false };
    if (!player.disconnectedAt || Date.now() - player.disconnectedAt < 8000) return { ok: false };
    return this.forceSkipCurrent("player_afk", "blitz");
  }

  forceSkipCurrent(eventType, fx = "blitz") {
    if (this.pendingChallenge) {
      const timedOutName = this.displayName(this.pendingChallenge.challengerId);
      this.acceptPlus4(this.pendingChallenge.challengerId);
      this.setEvent(eventType, { name: timedOutName }, fx);
      return { ok: true, timedOut: true, fx, sound: "blitz" };
    }

    if (this.pendingColorChoice) {
      const timedOutName = this.displayName(this.pendingColorChoice);
      this.currentColor = this.currentColor || "red";
      this.pendingColorChoice = null;
      this.status = "playing";
      this.applyAction(this.topCard(), this.currentPlayer()?.discordId);
      this.setEvent(eventType, { name: timedOutName }, fx);
      return { ok: true, timedOut: true, fx, sound: "blitz" };
    }

    if (this.pendingSwap) {
      const timedOutName = this.displayName(this.pendingSwap);
      const other = this.players.find((p) => p.discordId !== this.pendingSwap);
      if (other) this.swapHands(this.pendingSwap, other.discordId);
      this.pendingSwap = null;
      this.status = "playing";
      this.advanceTurn();
      this.setEvent(eventType, { name: timedOutName }, fx);
      return { ok: true, timedOut: true, fx, sound: "blitz" };
    }

    const current = this.currentPlayer();
    if (!current) return { ok: false };
    if (this.drawStack > 0) {
      this.giveCards(current.discordId, this.drawStack);
      this.drawStack = 0;
      this.drawStackType = null;
    } else if (!this.drawnThisTurn) {
      this.giveCards(current.discordId, 1);
    }
    this.advanceTurn();
    this.setEvent(eventType, { name: this.displayName(current.discordId) }, fx);
    return { ok: true, timedOut: true, sound: "play", fx };
  }

  isPlayable(card, discordId) {
    const top = this.topCard();
    if (!top) return true;

    if (this.drawStack > 0) {
      if (this.drawStackType === "draw2") return card.value === "draw2";
      if (this.drawStackType === "wild_draw4") return card.value === "wild_draw4";
    }

    if (card.value === "wild") return true;
    if (card.value === "wild_draw4") return true;
    return card.color === this.currentColor || card.value === top.value;
  }

  applyAction(card, playerId) {
    if (this.rules.chaos70 && card.type === "number" && card.value === "0") {
      this.rotateHands();
      this.advanceTurn();
      return { rotated: true };
    }

    if (this.rules.chaos70 && card.type === "number" && card.value === "7") {
      if (this.players.length === 2) {
        const other = this.players.find((p) => p.discordId !== playerId);
        if (other) this.swapHands(playerId, other.discordId);
        this.advanceTurn();
        return { swapped: true };
      }
      this.pendingSwap = playerId;
      this.status = "choosing_swap";
      this.setEvent("need_swap", { name: this.displayName(playerId) }, "swap");
      return { needSwap: true };
    }

    if (card.value === "reverse") {
      if (this.players.length === 2) {
        this.advanceTurn();
        this.advanceTurn();
        return { reversed: true };
      }
      this.direction *= -1;
      this.advanceTurn();
      return { reversed: true };
    }

    if (card.value === "skip") {
      this.advanceTurn();
      this.advanceTurn();
      return {};
    }

    if (card.value === "draw2") {
      if (this.rules.stack) {
        this.drawStack += 2;
        this.drawStackType = "draw2";
        this.advanceTurn();
        return { stacked: true };
      }
      this.advanceTurn();
      const victim = this.currentPlayer();
      if (victim) this.giveCards(victim.discordId, 2);
      this.advanceTurn();
      return { drew: true };
    }

    if (card.value === "wild_draw4") {
      if (this.rules.stack) {
        this.drawStack += 4;
        this.drawStackType = "wild_draw4";
        this.advanceTurn();
        return { stacked: true };
      }
      this.advanceTurn();
      const victim = this.currentPlayer();
      this.pendingChallenge = {
        accusedId: playerId,
        challengerId: victim?.discordId || null,
        colorAtPlay: this.plus4ColorAtPlay || this.currentColor,
      };
      this.plus4ColorAtPlay = null;
      this.status = "pending_challenge";
      this.refreshDeadline();
      this.setEvent("need_challenge", {
        name: this.displayName(victim?.discordId),
        accused: this.displayName(playerId),
      }, "challenge");
      return { pendingChallenge: true };
    }

    this.advanceTurn();
    return {};
  }

  finishGame(winnerId) {
    this.status = "finished";
    this.winnerId = winnerId;
    this.pendingColorChoice = null;
    this.pendingSwap = null;
    this.pendingChallenge = null;
    this.drawnThisTurn = null;
    this.drawStack = 0;
    this.turnDeadline = null;

    let points = 0;
    for (const [id, hand] of this.hands.entries()) {
      if (id === winnerId) continue;
      points += hand.reduce((sum, card) => sum + cardPoints(card), 0);
    }
    this.lastRoundPoints = points;

    if (this.rules.series) {
      this.matchScores[winnerId] = (this.matchScores[winnerId] || 0) + 1;
      if (this.matchScores[winnerId] >= SERIES_TARGET) {
        this.seriesWinnerId = winnerId;
      }
    }

    const eventType = this.seriesWinnerId ? "series_over" : "game_over";
    this.setEvent(eventType, {
      name: this.displayName(winnerId),
      points,
      seriesWins: this.matchScores[winnerId],
    }, "win");
    return {
      ok: true,
      finished: true,
      winnerId,
      points,
      plus4Counts: Object.fromEntries(this.plus4Counts),
      unoShouts: Object.fromEntries(this.unoShoutCounts),
      catches: Object.fromEntries(this.catchCounts),
      losers: this.players.filter((p) => p.discordId !== winnerId).map((p) => p.discordId),
      sound: "win",
      fx: "win",
    };
  }

  promoteSpectators() {
    const leftover = [];
    for (const watcher of this.spectators) {
      if (this.players.length >= MAX_PLAYERS) {
        leftover.push(watcher);
        continue;
      }
      this.players.push(watcher);
      if (this.matchScores[watcher.discordId] === undefined) this.matchScores[watcher.discordId] = 0;
      if (!this.hostId) this.hostId = watcher.discordId;
    }
    this.spectators = leftover;
  }

  resetToLobby() {
    const resetSeries = Boolean(this.seriesWinnerId);
    this.status = "waiting";
    this.winnerId = null;
    this.lastRoundPoints = 0;
    this.hands.clear();
    this.discardPile = [];
    this.drawStack = 0;
    this.drawStackType = null;
    this.pendingColorChoice = null;
    this.pendingSwap = null;
    this.pendingChallenge = null;
    this.plus4ColorAtPlay = null;
    this.turnDeadline = null;
    this.eventLog = [];
    this.promoteSpectators();
    if (resetSeries) {
      this.seriesWinnerId = null;
      this.matchScores = {};
      for (const p of this.players) this.matchScores[p.discordId] = 0;
    }
    this.lastEvent = { type: "lobby", params: {}, at: Date.now() };
  }

  playAgain(requestedBy) {
    if (requestedBy !== this.hostId) return { ok: false, error: "not_host" };
    if (this.status !== "finished" && this.status !== "waiting") {
      return { ok: false, error: "game_in_progress" };
    }
    this.resetToLobby();
    return { ok: true };
  }

  publicState(forDiscordId) {
    const youHand = this.hands.get(forDiscordId) || [];
    const youPlayer = this.findOccupant(forDiscordId);
    const spectator = this.spectators.some((p) => p.discordId === forDiscordId);
    const playableIds = youHand
      .filter((c) => {
        if (this.status !== "playing") return false;
        if (this.isJumpPlay(forDiscordId, c)) return true;
        if (this.currentPlayer()?.discordId !== forDiscordId) return false;
        if (this.drawnThisTurn && c.id !== this.drawnThisTurn.id) return false;
        return this.isPlayable(c, forDiscordId);
      })
      .map((c) => c.id);
    const jumpableIds = youHand.filter((c) => this.isJumpPlay(forDiscordId, c)).map((c) => c.id);

    const seat = (p) => ({
      discordId: p.discordId,
      username: p.username,
      nickname: p.nickname,
      displayName: this.displayName(p.discordId),
      avatar: p.avatar,
      discordAvatar: p.discordAvatar,
      frame: p.frame,
      cardBack: p.cardBack,
      equippedTitle: p.equippedTitle,
      connected: p.connected,
      cardCount: this.hands.get(p.discordId)?.length ?? 0,
      calledUno: this.unoFlags.get(p.discordId)?.called ?? false,
      vulnerable: this.unoFlags.get(p.discordId)?.vulnerable ?? false,
      isCurrent: this.currentPlayer()?.discordId === p.discordId,
      isHost: p.discordId === this.hostId,
      seriesWins: this.matchScores[p.discordId] || 0,
      isBot: Boolean(p.isBot),
    });

    return {
      channelId: this.channelId,
      roomCode: this.code,
      privateTable: Boolean(this.privateTable),
      status: this.status,
      hostId: this.hostId,
      direction: this.direction,
      currentColor: this.currentColor,
      currentPlayerId: this.currentPlayer()?.discordId ?? null,
      topCard: this.topCard(),
      drawCount: this.drawPile.length,
      pendingColorChoice: this.pendingColorChoice,
      pendingSwap: this.pendingSwap,
      pendingChallenge: this.pendingChallenge,
      drawnThisTurn: Boolean(this.drawnThisTurn),
      winnerId: this.winnerId,
      lastRoundPoints: this.lastRoundPoints,
      seriesWinnerId: this.seriesWinnerId,
      seriesTarget: this.rules.series ? SERIES_TARGET : 0,
      lastEvent: this.lastEvent,
      rules: this.rules,
      drawStack: this.drawStack,
      turnDeadline: this.turnDeadline,
      reactions: this.reactions,
      eventLog: this.eventLog,
      you: {
        discordId: forDiscordId,
        hand: youHand,
        spectator,
        calledUno: this.unoFlags.get(forDiscordId)?.called ?? false,
        felt: youPlayer?.felt || "classic",
        cardBack: youPlayer?.cardBack || "classic",
        playableIds,
        jumpableIds,
      },
      players: this.players.map(seat),
      spectators: this.spectators.map(seat),
    };
  }

  isJumpPlay(discordId, card) {
    if (!this.rules.jumpIn || !card) return false;
    if (this.status !== "playing") return false;
    if (this.pendingColorChoice || this.pendingSwap || this.pendingChallenge) return false;
    if (this.drawStack > 0) return false;
    if (this.currentPlayer()?.discordId === discordId) return false;
    if (isWild(card)) return false;
    const top = this.topCard();
    if (!top || isWild(top)) return false;
    return card.color === top.color && card.value === top.value;
  }

  requireTurn(discordId) {
    if (!["playing", "choosing_color", "choosing_swap", "pending_challenge"].includes(this.status)) {
      return { ok: false, error: "not_playing" };
    }
    if (this.currentPlayer()?.discordId !== discordId) {
      return { ok: false, error: "not_your_turn" };
    }
    return { ok: true };
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  displayName(id) {
    const p = this.findOccupant(id);
    if (!p) return "???";
    return p.nickname || p.username || "???";
  }

  playerName(id) {
    return this.displayName(id);
  }

  topCard() {
    return this.discardPile[this.discardPile.length - 1] || null;
  }

  advanceTurn() {
    if (this.players.length === 0) return;
    const n = this.players.length;
    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + n) % n;
    this.drawnThisTurn = null;
    this.refreshDeadline();
  }

  refreshDeadline() {
    const timed = this.rules.blitz && LIVE_STATUSES.includes(this.status);
    this.turnDeadline = timed ? Date.now() + BLITZ_MS : null;
  }

  giveCards(discordId, count) {
    const hand = this.hands.get(discordId);
    if (!hand) return;
    for (let i = 0; i < count; i++) hand.push(this.takeFromDrawPile());
    this.updateUnoVulnerability(discordId, hand.length);
  }

  takeFromDrawPile() {
    if (this.drawPile.length === 0) this.recycleDiscard();
    if (this.drawPile.length === 0) this.drawPile = shuffle(createDeck());
    return this.drawPile.pop();
  }

  recycleDiscard() {
    const top = this.discardPile.pop();
    this.drawPile = shuffle(this.discardPile);
    this.discardPile = top ? [top] : [];
  }

  swapHands(a, b) {
    const handA = this.hands.get(a);
    const handB = this.hands.get(b);
    this.hands.set(a, handB);
    this.hands.set(b, handA);
    this.updateUnoVulnerability(a, handB.length);
    this.updateUnoVulnerability(b, handA.length);
  }

  rotateHands() {
    const ids = this.players.map((p) => p.discordId);
    const hands = ids.map((id) => this.hands.get(id));
    const n = ids.length;
    for (let i = 0; i < n; i++) {
      const from = (i - this.direction + n) % n;
      this.hands.set(ids[i], hands[from]);
    }
    for (const id of ids) {
      this.updateUnoVulnerability(id, this.hands.get(id).length);
    }
  }

  updateUnoVulnerability(discordId, handSize) {
    const flags = this.unoFlags.get(discordId) || { called: false, vulnerable: false };
    if (handSize === 1) flags.vulnerable = !flags.called;
    else {
      flags.called = false;
      flags.vulnerable = false;
    }
    this.unoFlags.set(discordId, flags);
  }

  isValidColor(color) {
    return ["red", "yellow", "green", "blue"].includes(color);
  }

  fxForCard(card, action = {}) {
    if (action.rotated) return "rotate";
    if (action.swapped || action.needSwap) return "swap";
    if (action.pendingChallenge) return "challenge";
    if (card?.value === "wild_draw4" || action.drew || action.stacked) return "plus4";
    if (card?.value === "reverse" || action.reversed) return "reverse";
    if (card?.value === "skip") return "skip";
    if (card?.value === "draw2") return "plus4";
    return "play";
  }

  soundForFx(fx) {
    if (fx === "catch") return "catch";
    if (fx === "plus4" || fx === "challenge") return "plus4";
    if (["skip", "reverse", "jump", "win", "draw", "uno", "blitz"].includes(fx)) return fx;
    return "play";
  }

  botBestColor(discordId) {
    const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (const card of this.hands.get(discordId) || []) {
      if (counts[card.color] !== undefined) counts[card.color] += 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  botPick(playable, discordId) {
    const ranked = [...playable].sort((a, b) => {
      const wildA = isWild(a) ? 1 : 0;
      const wildB = isWild(b) ? 1 : 0;
      if (wildA !== wildB) return wildA - wildB;
      const actionScore = (c) => (c.value === "draw2" || c.value === "skip" || c.value === "wild_draw4" ? 0 : 1);
      return actionScore(a) - actionScore(b);
    });
    return ranked[0] || playable[0];
  }

  botAction() {
    const bot = this.players.find((p) => p.isBot);
    if (!bot || !LIVE_STATUSES.includes(this.status)) return null;
    const id = bot.discordId;
    const hand = this.hands.get(id) || [];
    const flags = this.unoFlags.get(id);

    if (this.status === "pending_challenge" && this.pendingChallenge?.challengerId === id) {
      const accusedCount = this.hands.get(this.pendingChallenge.accusedId)?.length ?? 0;
      return accusedCount >= 3 ? { fn: "challengePlus4", args: [] } : { fn: "drawCard", args: [] };
    }
    if (this.pendingColorChoice === id) {
      return { fn: "chooseColor", args: [this.botBestColor(id)] };
    }
    if (this.pendingSwap === id) {
      const other = this.players
        .filter((p) => p.discordId !== id)
        .sort((a, b) => (this.hands.get(a.discordId)?.length || 99) - (this.hands.get(b.discordId)?.length || 99))[0];
      if (!other) return null;
      return { fn: "chooseSwap", args: [other.discordId] };
    }

    if (hand.length <= 2 && !flags?.called) {
      return { fn: "shoutUno", args: [] };
    }

    if (this.status === "playing") {
      const prey = this.players.find((p) => {
        if (p.discordId === id) return false;
        const theirHand = this.hands.get(p.discordId);
        const theirFlags = this.unoFlags.get(p.discordId);
        return theirHand?.length === 1 && theirFlags?.vulnerable && !theirFlags?.called;
      });
      if (prey) return { fn: "catchUno", args: [prey.discordId] };
    }

    if (this.rules.jumpIn && this.status === "playing" && this.currentPlayer()?.discordId !== id) {
      const jump = hand.find((c) => this.isJumpPlay(id, c));
      if (jump) return { fn: "playCard", args: [jump.id] };
    }

    if (this.currentPlayer()?.discordId !== id) return null;

    const playable = hand.filter((c) => {
      if (this.drawnThisTurn && c.id !== this.drawnThisTurn.id) return false;
      return this.isPlayable(c, id);
    });
    if (playable.length) {
      const card = this.botPick(playable, id);
      const color = isWild(card) ? this.botBestColor(id) : undefined;
      return { fn: "playCard", args: [card.id, color] };
    }
    if (this.drawnThisTurn) return { fn: "passTurn", args: [] };
    return { fn: "drawCard", args: [] };
  }

  runBotTurn() {
    const bot = this.players.find((p) => p.isBot);
    if (!bot) return { ok: false };
    let last = { ok: false };
    for (let i = 0; i < 4; i += 1) {
      const action = this.botAction();
      if (!action || typeof this[action.fn] !== "function") return last.ok ? last : { ok: false };
      last = this[action.fn](bot.discordId, ...(action.args || []));
      if (!last?.ok || last.finished) return last;
      if (action.fn !== "shoutUno") return last;
    }
    return last;
  }

  setEvent(type, params, fx) {
    this.lastEvent = { type, params, fx, at: Date.now() };
    if (type === "lobby" || type === "rules_updated") return;
    this.eventLog = [...(this.eventLog || []), this.lastEvent].slice(-EVENT_LOG_LIMIT);
  }
}

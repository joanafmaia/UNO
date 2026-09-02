/**
 * Baralho oficial de UNO — 108 cartas.
 *
 * 4 cores × (1 zero + 2× números 1-9 + 2× Skip + 2× Reverse + 2× +2) = 100
 * + 4 Wild + 4 Wild Draw Four = 108
 */

export const COLORS = ["red", "yellow", "green", "blue"];
export const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const ACTIONS = ["skip", "reverse", "draw2"];

export function createDeck() {
  const deck = [];
  let id = 0;

  for (const color of COLORS) {
    deck.push({ id: `c${id++}`, color, value: "0", type: "number" });

    for (const value of NUMBERS.slice(1)) {
      deck.push({ id: `c${id++}`, color, value, type: "number" });
      deck.push({ id: `c${id++}`, color, value, type: "number" });
    }

    for (const action of ACTIONS) {
      deck.push({ id: `c${id++}`, color, value: action, type: "action" });
      deck.push({ id: `c${id++}`, color, value: action, type: "action" });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c${id++}`, color: "black", value: "wild", type: "wild" });
    deck.push({
      id: `c${id++}`,
      color: "black",
      value: "wild_draw4",
      type: "wild",
    });
  }

  return deck;
}

export function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Pontuação oficial: números = face, ações = 20, coringas = 50 */
export function cardPoints(card) {
  if (card.type === "wild") return 50;
  if (card.type === "action") return 20;
  return Number(card.value) || 0;
}

export function isWild(card) {
  return card?.type === "wild";
}

export function isDrawCard(card) {
  return card?.value === "draw2" || card?.value === "wild_draw4";
}

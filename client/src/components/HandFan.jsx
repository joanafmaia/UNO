import Card from "./Card.jsx";

const COLOR_RANK = { red: 0, yellow: 1, green: 2, blue: 3, black: 4 };
const VALUE_RANK = {
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
  skip: 10, reverse: 11, draw2: 12, wild: 13, wild_draw4: 14,
};

export function sortHand(cards, mode) {
  const copy = [...(cards || [])];
  if (mode === "color") {
    copy.sort((a, b) => (COLOR_RANK[a.color] ?? 9) - (COLOR_RANK[b.color] ?? 9) || String(a.value).localeCompare(String(b.value)));
  } else if (mode === "value") {
    copy.sort((a, b) => (VALUE_RANK[a.value] ?? 20) - (VALUE_RANK[b.value] ?? 20) || (COLOR_RANK[a.color] ?? 9) - (COLOR_RANK[b.color] ?? 9));
  }
  return copy;
}

export default function HandFan({
  cards,
  playable,
  jumpable,
  spectator,
  onPlay,
}) {
  const n = cards.length;
  const mid = (n - 1) / 2;
  const step = n > 12 ? 4.2 : n > 8 ? 6 : 8;

  return (
    <div className="hand-fan">
      {cards.map((card, i) => {
        const rot = n <= 1 ? 0 : (i - mid) * step;
        const hot = !spectator && (playable.has(card.id) || jumpable.has(card.id));
        return (
          <div
            key={card.id}
            className={`hand-fan-card ${hot ? "hand-fan-card-hot" : ""}`}
            style={{
              zIndex: hot ? 40 : i + 1,
              "--fan-rot": `${rot}deg`,
              marginLeft: i === 0 ? 0 : n > 10 ? "-2.65rem" : "-2.15rem",
            }}
          >
            <Card
              card={card}
              playable={!spectator && playable.has(card.id) && !jumpable.has(card.id)}
              jumpable={!spectator && jumpable.has(card.id)}
              onClick={!spectator && playable.has(card.id) ? () => onPlay(card.id) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

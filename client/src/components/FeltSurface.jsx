import { resolveFelt } from "../lib/cosmetics.js";

const DECOS = {
  classic: [],
  nonna: [
    { e: "🍝", x: "12%", y: "18%" },
    { e: "🍷", x: "78%", y: "62%" },
  ],
  arcade: [{ e: "👾", x: "14%", y: "22%" }, { e: "🕹️", x: "80%", y: "58%" }],
  diner: [{ e: "☕", x: "16%", y: "20%" }, { e: "🍟", x: "76%", y: "64%" }],
  meadow: [
    { e: "🌼", x: "18%", y: "24%" },
    { e: "🌿", x: "72%", y: "20%" },
    { e: "🌼", x: "80%", y: "68%" },
  ],
  pool_party: [{ e: "🍉", x: "15%", y: "22%" }, { e: "🏖️", x: "78%", y: "60%" }],
  candy: [{ e: "🍭", x: "14%", y: "18%" }, { e: "🍬", x: "82%", y: "66%" }],
  disco: [{ e: "✨", x: "20%", y: "20%" }, { e: "🪩", x: "76%", y: "58%" }],
  lava: [{ e: "🔥", x: "18%", y: "28%" }, { e: "🌋", x: "74%", y: "62%" }],
  haunted: [{ e: "🕸️", x: "16%", y: "16%" }, { e: "🕷️", x: "78%", y: "64%" }],
  cinema: [{ e: "🎬", x: "14%", y: "20%" }, { e: "🍿", x: "78%", y: "62%" }],
  elmo: [{ e: "👀", x: "18%", y: "22%" }, { e: "❤️", x: "76%", y: "64%" }],
};

export default function FeltSurface({ id, className = "", compact }) {
  const felt = resolveFelt(id);
  const extras = DECOS[felt] || [];
  return (
    <div className={`felt-surface felt-${felt} ${compact ? "felt-compact" : ""} ${className}`}>
      <div className="felt-overlay" />
      {!compact &&
        extras.map((d, i) => (
          <span key={i} className="felt-deco" style={{ left: d.x, top: d.y }}>
            {d.e}
          </span>
        ))}
    </div>
  );
}

import { CARD_BACKS, resolveBack } from "../lib/cosmetics.js";

export default function CardBack({ variant = "classic", small, stacked, count }) {
  const id = resolveBack(variant);
  const art = CARD_BACKS[id] || CARD_BACKS.classic;
  const size = small ? "h-16 w-12" : "h-28 w-20";
  const motifSize = small ? "text-base" : "text-2xl";
  const copies = stacked ? Math.min(3, Math.max(1, count || 1)) : 1;

  return (
    <div className={`relative ${size}`}>
      {Array.from({ length: copies }, (_, i) => (
        <div
          key={i}
          className={`card-skin card-skin-${id} ${size} ${stacked ? "absolute" : ""}`}
          style={stacked ? { left: i * 3, top: i * 2, zIndex: i + 1 } : undefined}
        >
          <span className={`card-skin-motif ${motifSize}`}>{art.motif}</span>
          {art.label && !small && <span className="card-skin-label">{art.label}</span>}
        </div>
      ))}
    </div>
  );
}

import { REACTION_EMOJIS } from "../lib/cosmetics.js";

export default function ReactionBar({ reactions, onReact }) {
  return (
    <div className="reaction-bar relative">
      <div className="flex justify-center gap-1">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className="rounded-full bg-black/40 px-2 py-1 text-lg transition hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 overflow-hidden">
        {(reactions || []).slice(-6).map((r) => (
          <span
            key={r.id}
            className="reaction-float absolute text-2xl"
            style={{ left: `${12 + (r.at % 70)}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

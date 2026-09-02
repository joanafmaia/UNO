import { useI18n } from "../context/I18nContext.jsx";

const FACE = {
  skip: "⊘",
  reverse: "⇄",
  draw2: "+2",
  wild: "WILD",
  wild_draw4: "+4",
};

const COLOR_CLASS = {
  red: "uno-card-red",
  yellow: "uno-card-yellow",
  green: "uno-card-green",
  blue: "uno-card-blue",
  black: "uno-card-wild",
};

function faceLabel(card, t) {
  if (card.type === "number") return card.value;
  return FACE[card.value] || t(`cards.${card.value}`);
}

export default function Card({ card, selected, playable, jumpable, small, onClick }) {
  const { t } = useI18n();
  if (!card) {
    return (
      <div className={`uno-card uno-card-empty ${small ? "uno-card-sm" : ""}`}>
        —
      </div>
    );
  }

  const label = faceLabel(card, t);
  const pip = card.type === "number" ? card.value : FACE[card.value] || label;

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`uno-card ${COLOR_CLASS[card.color] || "uno-card-red"} ${small ? "uno-card-sm" : ""}
        ${playable ? "uno-card-playable" : ""}
        ${jumpable ? "uno-card-jump" : ""}
        ${selected ? "uno-card-selected" : ""}
        ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {card.color !== "black" && (
        <>
          <span className="uno-card-pip uno-card-pip-tl">{pip}</span>
          <span className="uno-card-pip uno-card-pip-br">{pip}</span>
          <span className={`color-mark color-mark-${card.color}`} aria-hidden="true" />
        </>
      )}
      <span className="uno-card-oval">
        {card.color === "black" && (
          <span className="uno-card-wild-pie" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
        <span className="uno-card-value">{label}</span>
      </span>
    </button>
  );
}

export function cardCaption(card, t) {
  if (!card) return "";
  const color = t(`colors.${card.color}`);
  const value = card.type === "number" ? card.value : t(`cards.${card.value}`);
  return card.color === "black" ? value : `${color} ${value}`;
}

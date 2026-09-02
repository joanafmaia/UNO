import { useI18n } from "../context/I18nContext.jsx";

export default function UnoButton({ onClick, pulse }) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`uno-btn uno-btn-red uno-btn-shout ${pulse ? "animate-pulse" : ""}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_45%)]" />
      <span className="relative">{t("game.shoutUno")}</span>
    </button>
  );
}

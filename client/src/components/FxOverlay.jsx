import { useEffect, useState } from "react";
import { useI18n } from "../context/I18nContext.jsx";

export default function FxOverlay({ fx, event }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fx || fx === "play" || fx === "draw") return undefined;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), fx === "uno" || fx === "win" ? 1600 : 900);
    return () => clearTimeout(id);
  }, [fx, event?.at]);

  if (!visible || !fx || fx === "play") return null;

  const name = event?.params?.name || event?.params?.catcher || "";

  const content = {
    uno: { text: "UNO!", sub: name, className: "bg-uno-red text-white" },
    plus4: { text: "+4", sub: t("fx.plus4"), className: "bg-black text-uno-yellow" },
    catch: { text: t("game.catch"), sub: name, className: "bg-uno-yellow text-black" },
    reverse: { text: "↺", sub: t("fx.reverse"), className: "bg-uno-blue text-white" },
    swap: { text: "⇄", sub: t("fx.swap"), className: "bg-purple-700 text-white" },
    rotate: { text: "⟳", sub: t("fx.rotate"), className: "bg-emerald-700 text-white" },
    skip: { text: "⊘", sub: t("fx.skip"), className: "bg-uno-red text-white" },
    jump: { text: "⚡", sub: t("fx.jump"), className: "bg-uno-yellow text-black" },
    win: { text: t("fx.win"), sub: name, className: "bg-uno-yellow text-black" },
    challenge: { text: "+4?", sub: t("fx.challenge"), className: "bg-black text-uno-yellow" },
    draw: null,
  }[fx];

  if (!content) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className={`fx-pop rounded-3xl px-10 py-6 text-center shadow-glow ${content.className}`}>
        <p className="font-display text-6xl font-black tracking-tight">{content.text}</p>
        {content.sub && <p className="mt-1 text-sm font-bold uppercase tracking-wide">{content.sub}</p>}
      </div>
    </div>
  );
}

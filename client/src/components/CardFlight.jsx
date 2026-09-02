import { useEffect, useState } from "react";
import Card from "./Card.jsx";
import CardBack from "./CardBack.jsx";

export default function CardFlight({ event, cardBack }) {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (!event?.at) return undefined;
    if (event.type === "played_card" || event.type === "jumped_in" || event.type === "color_chosen") {
      if (!event.params?.card) return undefined;
      setMode("play");
      const id = setTimeout(() => setMode(null), 420);
      return () => clearTimeout(id);
    }
    if (event.type === "drew_card" || event.type === "drew_stack") {
      setMode("draw");
      const id = setTimeout(() => setMode(null), 380);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [event?.at, event?.type]);

  if (mode === "play" && event?.params?.card) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="card-fly-play">
          <Card card={event.params.card} />
        </div>
      </div>
    );
  }

  if (mode === "draw") {
    return (
      <div className="pointer-events-none absolute left-[42%] top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <div className="card-fly-draw">
          <CardBack variant={cardBack} />
        </div>
      </div>
    );
  }

  return null;
}

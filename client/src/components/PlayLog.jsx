import { cardCaption } from "./Card.jsx";

export default function PlayLog({ events, t }) {
  const rows = (events || []).slice(-8);
  if (!rows.length) return null;

  return (
    <ol className="play-log">
      {rows.map((event) => {
        const params = { ...event.params };
        if (params.card) params.card = cardCaption(params.card, t);
        if (params.color) params.color = t(`colors.${params.color}`);
        return (
          <li key={`${event.type}-${event.at}`} className="play-log-item">
            {t(`events.${event.type}`, params)}
          </li>
        );
      })}
    </ol>
  );
}

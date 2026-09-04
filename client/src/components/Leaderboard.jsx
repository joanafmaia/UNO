import { useEffect, useState } from "react";
import { useI18n } from "../context/I18nContext.jsx";
import { apiGet } from "../lib/api.js";
import { avatarUrl } from "../lib/cosmetics.js";

export default function Leaderboard() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/leaderboard");
      setRows(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const order = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;

  return (
    <div className="rank-page">
      <div className="rank-head">
        <h2>{t("leaderboard.title")}</h2>
        <button type="button" onClick={load} className="uno-btn uno-btn-ghost uno-btn-sm" disabled={loading}>
          {t("leaderboard.refresh")}
        </button>
      </div>

      {!loading && rows.length === 0 && <p className="shop-empty">{t("leaderboard.empty")}</p>}

      {podium.length > 0 && (
        <ol className={`rank-podium rank-podium-${order.length}`}>
          {order.map((row) => (
            <li key={row.discord_id} className={`rank-podium-seat rank-place-${row.rank}`}>
              <span className="rank-medal">{row.rank}</span>
              <img src={avatarUrl(row.selected_avatar)} alt="" />
              <strong>{row.nickname || row.username}</strong>
              {row.equipped_title && <em>{t(`titles.${row.equipped_title}`)}</em>}
              <b>{row.wins}</b>
              <span>{t("leaderboard.wins")}</span>
            </li>
          ))}
        </ol>
      )}

      {rest.length > 0 && (
        <ol className="rank-list">
          {rest.map((row) => (
            <li key={row.discord_id}>
              <span className="rank-list-pos">{row.rank}</span>
              <img src={avatarUrl(row.selected_avatar)} alt="" />
              <div className="rank-list-who">
                <strong>{row.nickname || row.username}</strong>
                {row.equipped_title && <em>{t(`titles.${row.equipped_title}`)}</em>}
              </div>
              <span className="rank-list-wins">{row.wins}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

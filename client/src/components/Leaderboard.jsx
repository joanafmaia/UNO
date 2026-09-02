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

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-3xl tracking-wide drop-shadow-[0_3px_0_#111]">{t("leaderboard.title")}</h2>
        <button
          type="button"
          onClick={load}
          className="uno-btn uno-btn-yellow px-4 py-1 text-sm"
        >
          {t("leaderboard.refresh")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border-4 border-white bg-black/35 shadow-[0_8px_0_#111]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <tr>
              <th className="px-4 py-3">{t("leaderboard.rank")}</th>
              <th className="px-4 py-3">{t("leaderboard.player")}</th>
              <th className="px-4 py-3">{t("leaderboard.wins")}</th>
              <th className="px-4 py-3">{t("leaderboard.losses")}</th>
              <th className="px-4 py-3">{t("leaderboard.points")}</th>
              <th className="px-4 py-3">{t("leaderboard.titles")}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  {t("leaderboard.empty")}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.discord_id} className="border-t border-white/5">
                <td className="px-4 py-3 font-black text-uno-yellow">{row.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={avatarUrl(row.selected_avatar)}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="font-semibold">{row.nickname || row.username}</span>
                    {row.equipped_title && (
                      <span className="block text-[10px] uppercase text-uno-yellow">
                        {t(`titles.${row.equipped_title}`)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{row.losses}</td>
                <td className="px-4 py-3">{row.points}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(row.titles || []).map((id) => (
                      <span key={id} className="rounded-full bg-uno-red/80 px-2 py-0.5 text-[10px] font-bold">
                        {t(`titles.${id}`)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

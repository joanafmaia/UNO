import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { apiGet, apiSend } from "../lib/api.js";
import { avatarUrl, isAllowedAvatarUrl, isUnlocked, unlockLabel } from "../lib/cosmetics.js";
import AvatarFrame from "./AvatarFrame.jsx";
import CardBack from "./CardBack.jsx";
import FeltSurface from "./FeltSurface.jsx";

function AvatarGrid({ items, player, busy, t, onEquip }) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {items.map((avatar) => {
        const unlocked = player.unlocked_avatars?.includes(avatar.id);
        const equipped = player.selected_avatar === avatar.id;
        const canEquip = unlocked && !equipped && busy !== avatar.id;
        const winsLeft = Math.max(0, (avatar.unlockWins || 0) - (player.wins || 0));
        return (
          <button
            key={avatar.id}
            type="button"
            disabled={!canEquip}
            onClick={() => onEquip(avatar.id)}
            title={
              unlocked
                ? equipped
                  ? t("profile.equipped")
                  : t("profile.equip")
                : t("profile.unlockAt", { count: avatar.unlockWins })
            }
            className={`relative overflow-hidden rounded-full border-4 p-0 ${
              equipped ? "border-uno-yellow shadow-[0_0_0_2px_#111]" : "border-white/20"
            } ${!unlocked ? "cursor-not-allowed" : canEquip ? "hover:border-white" : ""}`}
          >
            <img
              src={`/assets/avatars/${avatar.file}`}
              alt=""
              className={`aspect-square w-full object-cover ${unlocked ? "" : "opacity-35"}`}
            />
            {!unlocked && (
              <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 px-1 text-center">
                <span className="text-base leading-none">🔒</span>
                <span className="mt-0.5 text-[10px] font-black uppercase leading-tight text-uno-yellow">
                  {t("profile.unlockShort", { count: avatar.unlockWins })}
                </span>
                {winsLeft > 0 && (
                  <span className="text-[9px] font-bold leading-tight text-white/80">
                    {t("profile.unlockLeft", { count: winsLeft })}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CosmeticGrid({ items, selected, player, onEquip, busy, t, preview }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => {
        const unlocked = isUnlocked(item, player);
        const equipped = selected === item.id;
        return (
          <article
            key={item.id}
            className={`rounded-2xl border p-3 text-center ${
              equipped ? "border-uno-yellow bg-black/50" : "border-white/10 bg-black/20"
            } ${!unlocked ? "opacity-50" : ""}`}
          >
            {preview(item)}
            <p className="mt-2 text-sm font-bold">{t(`cosmetics.${item.id}`)}</p>
            <p className="min-h-[2rem] text-[11px] leading-tight text-white/55">{t(`cosmetics.${item.id}Hint`)}</p>
            {!unlocked ? (
              <p className="text-[11px] text-white/60">{unlockLabel(item, t)}</p>
            ) : (
              <button
                type="button"
                disabled={equipped || busy === item.id}
                onClick={() => onEquip(item.id)}
                className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase disabled:text-uno-yellow"
              >
                {equipped ? t("profile.equipped") : t("profile.equip")}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function Profile() {
  const { t } = useI18n();
  const { player, setPlayer, session } = useAuth();
  const [catalog, setCatalog] = useState({ avatars: [], cartoons: [], felts: [], cardBacks: [], frames: [] });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    apiGet("/api/cosmetics").then(setCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    if (player) setNickname(player.nickname || "");
  }, [player?.nickname]);

  if (!player) return null;

  const patch = async (body, busyId) => {
    setBusy(busyId || "save");
    setError(null);
    try {
      const res = await apiSend("/api/me/cosmetics", "PATCH", body);
      setPlayer(res.player);
    } catch (err) {
      setError(err.error || "cosmetic_locked");
    } finally {
      setBusy(null);
    }
  };

  const daily = player.daily;
  const dailyPct = daily ? Math.min(100, Math.round((daily.progress / daily.target) * 100)) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <section className="rounded-3xl border-4 border-white bg-black/30 p-5 shadow-[0_8px_0_#111]">
        <div className="flex flex-wrap items-center gap-4">
          <AvatarFrame
            id={player.selected_frame}
            src={isAllowedAvatarUrl(session.user.avatarUrl) ? session.user.avatarUrl : avatarUrl(player.selected_avatar)}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-black">{player.nickname || player.username}</h2>
            <p className="text-sm text-white/60">{player.username}</p>
            {player.equipped_title && (
              <p className="text-xs font-bold uppercase text-uno-yellow">{t(`titles.${player.equipped_title}`)}</p>
            )}
          </div>
        </div>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ nickname }, "nick");
          }}
        >
          <input
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("profile.nickname")}
            className="min-w-[180px] flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none"
          />
          <button type="submit" className="rounded-full bg-uno-yellow px-4 py-2 text-sm font-black text-black">
            {t("profile.saveNick")}
          </button>
        </form>

        {daily && (
          <div className="mt-4 rounded-xl bg-white/5 p-3">
            <p className="text-xs font-bold uppercase text-white/50">{t("daily.title")}</p>
            <p className="text-sm font-semibold">{t(`daily.${daily.id}`, { count: daily.target })}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
              <div className="h-full bg-uno-yellow" style={{ width: `${dailyPct}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/60">
              {daily.done ? t("daily.done") : `${daily.progress}/${daily.target}`}
            </p>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["wins", player.wins],
            ["losses", player.losses],
            ["points", player.points],
            ["plus4", player.plus4_played],
            ["shouts", player.uno_shouts],
            ["catches", player.catches],
            ["streak", player.streak],
          ].map(([key, value]) => (
            <div key={key} className="rounded-xl bg-white/5 p-3 text-center">
              <dt className="text-xs uppercase tracking-wide text-white/50">{t(`profile.${key}`)}</dt>
              <dd className="font-display text-2xl font-black text-uno-yellow">{value || 0}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-bold uppercase text-white/60">{t("profile.titles")}</h3>
          {player.titles?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {player.titles.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ equippedTitle: player.equipped_title === id ? "" : id }, id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    player.equipped_title === id ? "bg-uno-yellow text-black" : "bg-uno-red"
                  }`}
                >
                  {t(`titles.${id}`)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/50">{t("titles.none")}</p>
          )}
        </div>
      </section>

      {error && <p className="text-sm text-uno-yellow">{t(`errors.${error}`)}</p>}

      <section>
        <h3 className="mb-1 font-display text-xl font-black">{t("profile.avatars")}</h3>
        <p className="mb-3 text-xs font-semibold leading-snug text-white/70">{t("profile.avatarsHint")}</p>
        <AvatarGrid
          items={catalog.avatars || []}
          player={player}
          busy={busy}
          t={t}
          onEquip={(id) => patch({ avatarId: id }, id)}
        />
      </section>

      <section>
        <h3 className="mb-1 font-display text-xl font-black">{t("profile.cartoons")}</h3>
        <p className="mb-3 text-xs font-semibold leading-snug text-white/70">{t("profile.cartoonsHint")}</p>
        {catalog.cartoons?.length ? (
          <AvatarGrid
            items={catalog.cartoons}
            player={player}
            busy={busy}
            t={t}
            onEquip={(id) => patch({ avatarId: id }, id)}
          />
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-white/20 bg-black/20 p-4 text-sm text-white/70">
            {t("profile.cartoonsEmpty")}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl font-black">{t("profile.felts")}</h3>
        <CosmeticGrid
          items={catalog.felts || []}
          selected={player.selected_felt}
          player={player}
          onEquip={(id) => patch({ felt: id }, id)}
          busy={busy}
          t={t}
          preview={(item) => (
            <div className="mx-auto h-16 w-full overflow-hidden rounded-xl border-2 border-white/20">
              <FeltSurface id={item.id} compact />
            </div>
          )}
        />
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl font-black">{t("profile.cardBacks")}</h3>
        <CosmeticGrid
          items={catalog.cardBacks || []}
          selected={player.selected_card_back}
          player={player}
          onEquip={(id) => patch({ cardBack: id }, id)}
          busy={busy}
          t={t}
          preview={(item) => (
            <div className="flex justify-center">
              <CardBack variant={item.id} small />
            </div>
          )}
        />
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl font-black">{t("profile.frames")}</h3>
        <CosmeticGrid
          items={catalog.frames || []}
          selected={player.selected_frame}
          player={player}
          onEquip={(id) => patch({ frame: id }, id)}
          busy={busy}
          t={t}
          preview={(item) => (
            <div className="flex justify-center">
              <AvatarFrame id={item.id} src={avatarUrl(player.selected_avatar)} size="md" />
            </div>
          )}
        />
      </section>
    </div>
  );
}

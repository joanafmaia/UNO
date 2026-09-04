import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { apiGet, apiSend } from "../lib/api.js";
import { avatarUrl, isAllowedAvatarUrl, isUnlocked, unlockLabel } from "../lib/cosmetics.js";
import AvatarFrame from "./AvatarFrame.jsx";
import CardBack from "./CardBack.jsx";
import FeltSurface from "./FeltSurface.jsx";

const TABS = [
  { id: "profile", key: "profile.tabProfile" },
  { id: "avatars", key: "profile.tabAvatars" },
  { id: "table", key: "profile.tabTable" },
  { id: "cards", key: "profile.tabCards" },
];

function AvatarGrid({ items, player, busy, t, onEquip }) {
  return (
    <div className="shop-avatars">
      {items.map((avatar) => {
        const unlocked = player.unlocked_avatars?.includes(avatar.id);
        const equipped = player.selected_avatar === avatar.id;
        const canEquip = unlocked && !equipped && busy !== avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            disabled={!unlocked || equipped || busy === avatar.id}
            onClick={() => canEquip && onEquip(avatar.id)}
            title={
              unlocked
                ? equipped
                  ? t("profile.equipped")
                  : t("profile.equip")
                : t("profile.unlockAt", { count: avatar.unlockWins })
            }
            className={`shop-avatar ${equipped ? "shop-avatar-on" : ""} ${!unlocked ? "shop-avatar-lock" : ""}`}
          >
            <img src={`/assets/avatars/${avatar.file}`} alt="" />
            {!unlocked && (
              <span className="shop-lock">
                🔒
                <span>{avatar.unlockWins}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CosmeticGrid({ items, selected, player, onEquip, busy, t, preview }) {
  const [focus, setFocus] = useState(selected);

  useEffect(() => {
    setFocus(selected);
  }, [selected]);

  const active = items.find((item) => item.id === focus) || items.find((item) => item.id === selected);

  return (
    <div>
      <div className="shop-grid">
        {items.map((item) => {
          const unlocked = isUnlocked(item, player);
          const equipped = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={busy === item.id}
              onClick={() => {
                setFocus(item.id);
                if (unlocked && !equipped) onEquip(item.id);
              }}
              title={unlocked ? t(`cosmetics.${item.id}`) : unlockLabel(item, t)}
              className={`shop-tile ${equipped ? "shop-tile-on" : ""} ${focus === item.id ? "shop-tile-focus" : ""} ${!unlocked ? "shop-tile-lock" : ""}`}
            >
              <span className="shop-tile-preview">{preview(item)}</span>
              <span className="shop-tile-name">{t(`cosmetics.${item.id}`)}</span>
              {!unlocked && <span className="shop-lock-dot">🔒</span>}
            </button>
          );
        })}
      </div>
      {active && (
        <p className="shop-focus-hint">
          {isUnlocked(active, player)
            ? t(`cosmetics.${active.id}Hint`)
            : unlockLabel(active, t)}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const { t } = useI18n();
  const { player, setPlayer, session } = useAuth();
  const [tab, setTab] = useState("profile");
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
  const avatar = isAllowedAvatarUrl(session.user.avatarUrl)
    ? session.user.avatarUrl
    : avatarUrl(player.selected_avatar);

  return (
    <div className="shop">
      <nav className="shop-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shop-tab ${tab === item.id ? "shop-tab-on" : ""}`}
          >
            {t(item.key)}
          </button>
        ))}
      </nav>

      {error && <p className="shop-error">{t(`errors.${error}`)}</p>}

      {tab === "profile" && (
        <section className="shop-hero">
          <div className="shop-identity">
            <AvatarFrame id={player.selected_frame} src={avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="shop-name">{player.nickname || player.username}</h2>
              {player.equipped_title && (
                <p className="shop-title">{t(`titles.${player.equipped_title}`)}</p>
              )}
            </div>
          </div>

          <form
            className="shop-nick"
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
              aria-label={t("profile.nickname")}
            />
            <button type="submit" className="uno-btn uno-btn-yellow uno-btn-sm">
              {t("profile.saveNick")}
            </button>
          </form>

          {daily && (
            <div className="shop-daily">
              <p className="shop-kicker">{t("daily.title")}</p>
              <p className="shop-daily-name">{t(`daily.${daily.id}`, { count: daily.target })}</p>
              <div className="shop-daily-bar">
                <span style={{ width: `${dailyPct}%` }} />
              </div>
              <p className="shop-daily-meta">
                {daily.done ? t("daily.done") : `${daily.progress}/${daily.target}`}
              </p>
            </div>
          )}

          <dl className="shop-stats">
            {[
              ["wins", player.wins],
              ["points", player.points],
              ["streak", player.streak],
            ].map(([key, value]) => (
              <div key={key} className="shop-stat">
                <dt>{t(`profile.${key}`)}</dt>
                <dd>{value || 0}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="shop-kicker">{t("profile.titles")}</h3>
            {player.titles?.length ? (
              <div className="shop-titles">
                {player.titles.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ equippedTitle: player.equipped_title === id ? "" : id }, id)}
                    className={player.equipped_title === id ? "shop-chip-on" : "shop-chip"}
                  >
                    {t(`titles.${id}`)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="shop-empty">{t("titles.none")}</p>
            )}
          </div>
        </section>
      )}

      {tab === "avatars" && (
        <section className="space-y-5">
          <div>
            <h3 className="shop-heading">{t("profile.avatars")}</h3>
            <AvatarGrid
              items={catalog.avatars || []}
              player={player}
              busy={busy}
              t={t}
              onEquip={(id) => patch({ avatarId: id }, id)}
            />
          </div>
          <div>
            <h3 className="shop-heading">{t("profile.cartoons")}</h3>
            {catalog.cartoons?.length ? (
              <AvatarGrid
                items={catalog.cartoons}
                player={player}
                busy={busy}
                t={t}
                onEquip={(id) => patch({ avatarId: id }, id)}
              />
            ) : (
              <p className="shop-empty">{t("profile.cartoonsEmpty")}</p>
            )}
          </div>
        </section>
      )}

      {tab === "table" && (
        <section className="space-y-5">
          <div>
            <h3 className="shop-heading">{t("profile.felts")}</h3>
            <CosmeticGrid
              items={catalog.felts || []}
              selected={player.selected_felt}
              player={player}
              onEquip={(id) => patch({ felt: id }, id)}
              busy={busy}
              t={t}
              preview={(item) => <FeltSurface id={item.id} compact />}
            />
          </div>
          <div>
            <h3 className="shop-heading">{t("profile.frames")}</h3>
            <CosmeticGrid
              items={catalog.frames || []}
              selected={player.selected_frame}
              player={player}
              onEquip={(id) => patch({ frame: id }, id)}
              busy={busy}
              t={t}
              preview={(item) => <AvatarFrame id={item.id} src={avatar} size="sm" />}
            />
          </div>
        </section>
      )}

      {tab === "cards" && (
        <section>
          <h3 className="shop-heading">{t("profile.cardBacks")}</h3>
          <CosmeticGrid
            items={catalog.cardBacks || []}
            selected={player.selected_card_back}
            player={player}
            onEquip={(id) => patch({ cardBack: id }, id)}
            busy={busy}
            t={t}
            preview={(item) => <CardBack variant={item.id} small />}
          />
        </section>
      )}
    </div>
  );
}

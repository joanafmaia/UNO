import { Router } from "express";
import { rateLimit, requireSession } from "../middleware/auth.js";
import { pingMongo } from "../store/mongo.js";
import {
  allAvatars,
  cosmeticsPayload,
  getLeaderboard,
  setAvatar,
  setCosmetics,
  upsertPlayer,
} from "../store/playerStore.js";

export function createApiRouter() {
  const router = Router();

  router.get("/leaderboard", rateLimit({ max: 60, windowMs: 60_000 }), async (_req, res) => {
    try {
      const top = await getLeaderboard(10);
      res.json({ leaderboard: top });
    } catch (err) {
      console.error(err);
      res.status(503).json({ error: "store_unavailable" });
    }
  });

  router.get("/avatars", rateLimit({ max: 60, windowMs: 60_000 }), (_req, res) => {
    res.json({ avatars: allAvatars() });
  });

  router.get("/cosmetics", rateLimit({ max: 60, windowMs: 60_000 }), (_req, res) => {
    res.json(cosmeticsPayload());
  });

  router.get("/health", async (_req, res) => {
    try {
      await pingMongo();
      res.json({ ok: true, service: "uno-activity", mongo: true });
    } catch {
      res.status(503).json({ ok: false, service: "uno-activity", mongo: false });
    }
  });

  router.get("/me", requireSession, async (req, res) => {
    try {
      const player = await upsertPlayer(req.session.discordId, req.session.username);
      res.json({ player });
    } catch (err) {
      console.error(err);
      res.status(503).json({ error: "store_unavailable" });
    }
  });

  router.patch(
    "/me/avatar",
    requireSession,
    rateLimit({ max: 20, windowMs: 60_000, keyFn: (req) => req.session.discordId }),
    async (req, res) => {
      try {
        const { avatarId } = req.body || {};
        const result = await setAvatar(req.session.discordId, avatarId);
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(503).json({ error: "store_unavailable" });
      }
    }
  );

  router.patch(
    "/me/cosmetics",
    requireSession,
    rateLimit({ max: 30, windowMs: 60_000, keyFn: (req) => req.session.discordId }),
    async (req, res) => {
      try {
        const result = await setCosmetics(req.session.discordId, req.body || {});
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(503).json({ error: "store_unavailable" });
      }
    }
  );

  return router;
}

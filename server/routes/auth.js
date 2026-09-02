import { Router } from "express";
import { discordAvatarUrl } from "../game/cosmetics.js";
import { createSession, mockAllowed, sanitizeId } from "../auth/sessions.js";
import { rateLimit } from "../middleware/auth.js";

export function createAuthRouter() {
  const router = Router();

  router.post("/token", rateLimit({ max: 20, windowMs: 60_000 }), async (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const secretReady = clientSecret && !clientSecret.startsWith("your_");

    const channelId = sanitizeId(String(req.body?.channelId || ""), 80);
    if (!channelId) {
      return res.status(400).json({ error: "invalid_join" });
    }

    if (req.body?.mock) {
      if (!mockAllowed(req)) {
        return res.status(403).json({ error: "mock_forbidden" });
      }
      const discordId = sanitizeId(req.body.discordId) || `dev-${Math.random().toString(36).slice(2, 8)}`;
      const session = createSession({
        discordId,
        channelId,
        username: String(req.body.username || "Dev").slice(0, 32),
        avatarUrl: "",
        mock: true,
      });
      return res.json({ access_token: "dev-mock-token", session_token: session.token });
    }

    const { code } = req.body || {};
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "missing_code" });
    }

    if (!clientId || !secretReady) {
      return res.status(500).json({ error: "oauth_not_configured" });
    }

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      });

      const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        const details = await response.text();
        console.error("Discord token exchange failed:", details);
        return res.status(401).json({ error: "token_exchange_failed" });
      }

      const data = await response.json();
      const meRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (!meRes.ok) {
        return res.status(401).json({ error: "user_fetch_failed" });
      }
      const me = await meRes.json();
      const session = createSession({
        discordId: me.id,
        channelId,
        username: me.global_name || me.username,
        avatarUrl: discordAvatarUrl(me.id, me.avatar),
        mock: false,
      });

      res.json({ access_token: data.access_token, session_token: session.token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "token_exchange_error" });
    }
  });

  return router;
}

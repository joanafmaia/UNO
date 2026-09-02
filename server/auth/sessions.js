import crypto from "node:crypto";

const TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_MS = 60_000;
const sessions = new Map();

let sweepTimer = null;

function ensureSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (session.expires < now) sessions.delete(token);
    }
  }, SWEEP_MS);
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();
}

export function createSession(user) {
  const discordId = sanitizeId(String(user.discordId || ""), 40);
  const channelId = sanitizeId(String(user.channelId || ""), 80);
  if (!discordId) throw new Error("invalid_discord_id");
  if (!channelId) throw new Error("invalid_channel");
  ensureSweep();
  const token = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    discordId,
    channelId,
    username: String(user.username || "Jogador").slice(0, 32),
    avatarUrl: user.avatarUrl || "",
    mock: Boolean(user.mock),
    expires: Date.now() + TTL_MS,
  };
  sessions.set(token, session);
  return session;
}

export function getSession(token) {
  if (!token || typeof token !== "string") return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function isLoopback(req) {
  const ip = String(req.socket?.remoteAddress || "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export function mockAllowed(req) {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.ALLOW_DEV_MOCK !== "true") return false;
  return isLoopback(req);
}

export function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  try {
    const host = new URL(origin).hostname;
    const ok =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".discordsays.com") ||
      host.endsWith(".discord.com");
    if (ok) return callback(null, origin);
  } catch {
    /* ignore */
  }
  callback(new Error("Not allowed by CORS"));
}

export function sanitizeId(value, max = 40) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, max);
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : "";
}

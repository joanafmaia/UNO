import { getSession } from "../auth/sessions.js";

export function requireSession(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.session = session;
  next();
}

export function rateLimit({ max, windowMs, keyFn }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length === 0) hits.delete(key);
    if (recent.length >= max) {
      hits.set(key, recent);
      return res.status(429).json({ error: "rate_limited" });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

const socketHits = new Map();

export function socketRateLimited(socketId, event, max, windowMs) {
  const key = `${socketId}:${event}`;
  const now = Date.now();
  const recent = (socketHits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length === 0) socketHits.delete(key);
  if (recent.length >= max) {
    socketHits.set(key, recent);
    return true;
  }
  recent.push(now);
  socketHits.set(key, recent);
  return false;
}

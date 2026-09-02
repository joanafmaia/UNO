/**
 * Prefixo `/.proxy` é obrigatório quando a Activity corre dentro do Discord.
 * Em desenvolvimento local o Vite faz proxy direto de /api e /socket.io.
 */
let sessionToken = "";

export function setSessionToken(token) {
  sessionToken = typeof token === "string" ? token : "";
}

export function getSessionToken() {
  return sessionToken;
}

export function isInsideDiscord() {
  return typeof window !== "undefined" && window.location.hostname.includes("discordsays.com");
}

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return isInsideDiscord() ? `/.proxy${normalized}` : normalized;
}

function headers(extra = {}) {
  const next = { ...extra };
  if (sessionToken) next.Authorization = `Bearer ${sessionToken}`;
  return next;
}

export async function apiGet(path) {
  const res = await fetch(apiUrl(path), { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

export async function apiSend(path, method, body) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), data);
  return data;
}

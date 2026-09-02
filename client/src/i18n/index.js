import pt from "./pt.json";
import en from "./en.json";

export const LOCALES = { pt, en };
export const SUPPORTED = ["pt", "en"];

/**
 * Mapeia o locale do cliente Discord (ex: pt-PT, pt-BR, en-US)
 * para um dos idiomas suportados pela Activity.
 */
export function localeFromDiscord(raw) {
  if (!raw || typeof raw !== "string") return "en";
  const lower = raw.toLowerCase();
  if (lower.startsWith("pt")) return "pt";
  return "en";
}

export function interpolate(template, params = {}) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : ""
  );
}

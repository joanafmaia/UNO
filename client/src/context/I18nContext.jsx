import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, LOCALES, localeFromDiscord, SUPPORTED } from "../i18n/index.js";

const I18nContext = createContext(null);
const STORAGE_KEY = "uno_lang";

export function I18nProvider({ initialLocale = "en", children }) {
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const [locale, setLocaleState] = useState(
    stored && SUPPORTED.includes(stored) ? stored : localeFromDiscord(initialLocale)
  );

  // Sem escolha manual, segue o locale do Discord quando a sessão chegar
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!initialLocale) return;
    setLocaleState(localeFromDiscord(initialLocale));
  }, [initialLocale]);

  const setLocale = useCallback((next) => {
    const resolved = SUPPORTED.includes(next) ? next : "en";
    setLocaleState(resolved);
    localStorage.setItem(STORAGE_KEY, resolved);
  }, []);

  const t = useCallback(
    (path, params) => {
      const dict = LOCALES[locale] || LOCALES.en;
      const value = path.split(".").reduce((acc, key) => acc?.[key], dict);
      if (value == null) return path;
      return interpolate(value, params);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

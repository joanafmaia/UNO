import { useI18n } from "../context/I18nContext.jsx";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "pt" ? "en" : "pt";

  return (
    <button
      type="button"
      className="lang-toggle"
      title={t(`lang.${next}`)}
      aria-label={t(`lang.${next}`)}
      onClick={() => setLocale(next)}
    >
      {locale === "pt" ? "🇵🇹" : "🇬🇧"}
    </button>
  );
}

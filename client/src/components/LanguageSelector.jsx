import { useI18n } from "../context/I18nContext.jsx";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/30 p-1" role="group" aria-label="language">
      <button
        type="button"
        title={t("lang.pt")}
        onClick={() => setLocale("pt")}
        className={`rounded-full border-2 px-2 py-1 text-xs font-black uppercase tracking-wide transition ${
          locale === "pt" ? "border-black bg-uno-yellow text-black shadow-[0_2px_0_#111]" : "border-white/40 opacity-70 hover:opacity-100"
        }`}
      >
        🇵🇹 PT
      </button>
      <button
        type="button"
        title={t("lang.en")}
        onClick={() => setLocale("en")}
        className={`rounded-full border-2 px-2 py-1 text-xs font-black uppercase tracking-wide transition ${
          locale === "en" ? "border-black bg-uno-yellow text-black shadow-[0_2px_0_#111]" : "border-white/40 opacity-70 hover:opacity-100"
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}

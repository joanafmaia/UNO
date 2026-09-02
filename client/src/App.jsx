import { useState } from "react";
import GameTable from "./components/GameTable.jsx";
import Header from "./components/Header.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Profile from "./components/Profile.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { GameProvider } from "./context/GameContext.jsx";
import UnoLogo from "./components/UnoLogo.jsx";
import { I18nProvider, useI18n } from "./context/I18nContext.jsx";

function Shell() {
  const { t } = useI18n();
  const { session, error } = useAuth();
  const [tab, setTab] = useState("table");

  if (error) {
    return (
      <div className="uno-room grid min-h-screen place-items-center p-6">
        <p className="rounded-xl border-4 border-white bg-uno-red px-4 py-3 font-black shadow-[0_5px_0_#111]">{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="uno-room grid min-h-screen place-items-center gap-4">
        <UnoLogo size="lg" />
        <p className="animate-pulse font-display text-3xl tracking-wide">{t("app.loading")}</p>
      </div>
    );
  }

  return (
    <GameProvider>
      <div className="uno-room">
        <div className="uno-stripes" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <Header tab={tab} onTab={setTab} />
        {tab === "table" && <GameTable />}
        {tab === "profile" && <Profile />}
        {tab === "leaderboard" && <Leaderboard />}
      </div>
    </GameProvider>
  );
}

export default function App() {
  const { session } = useAuth();
  return (
    <I18nProvider initialLocale={session?.locale}>
      <Shell />
    </I18nProvider>
  );
}

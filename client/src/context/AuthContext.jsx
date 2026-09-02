import { createContext, useContext, useEffect, useState } from "react";
import { setupDiscord } from "../discord/discordSdk.js";
import { apiGet } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await setupDiscord();
        if (cancelled) return;
        setSession(s);
        const data = await apiGet("/api/me");
        if (!cancelled) setPlayer(data.player);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || "auth_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPlayer = async () => {
    if (!session) return;
    const data = await apiGet("/api/me");
    setPlayer(data.player);
    return data.player;
  };

  return (
    <AuthContext.Provider value={{ session, player, setPlayer, refreshPlayer, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

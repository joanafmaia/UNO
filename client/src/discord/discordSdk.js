import { Common, DiscordSDK } from "@discord/embedded-app-sdk";
import { discordAvatarUrl, isAllowedAvatarUrl } from "@shared/cosmetics.js";
import { localeFromDiscord } from "../i18n/index.js";
import { apiSend, isInsideDiscord, setSessionToken } from "../lib/api.js";

const LANDSCAPE = Common.OrientationLockStateTypeObject.LANDSCAPE;
const UNLOCKED = Common.OrientationLockStateTypeObject.UNLOCKED;

/** Pede ao Discord que o telemóvel fique deitado — a mesa cabe melhor. */
async function preferLandscape(sdk) {
  try {
    if (!sdk?.commands?.setOrientationLockState) return;
    await sdk.commands.setOrientationLockState({
      lock_state: LANDSCAPE,
      picture_in_picture_lock_state: UNLOCKED,
      grid_lock_state: LANDSCAPE,
    });
  } catch (err) {
    console.warn("[UNO] orientation lock:", err);
  }
}

let discordSdk = null;

async function mockSession() {
  // sessionStorage: cada separador do browser é um jogador diferente (teste local)
  let mockId = sessionStorage.getItem("uno_mock_id");
  if (!mockId || !/^[a-zA-Z0-9_-]{1,40}$/.test(mockId)) {
    mockId = `dev-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("uno_mock_id", mockId);
  }
  const params = new URLSearchParams(window.location.search);
  const username = params.get("name") || `Dev ${mockId.slice(-4)}`;
  const channelId = (params.get("channel") || "dev-channel").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "dev-channel";
  const { session_token } = await apiSend("/api/token", "POST", {
    mock: true,
    discordId: mockId,
    username,
    channelId,
  });
  if (!session_token) throw new Error("auth_failed");
  setSessionToken(session_token);
  return {
    user: {
      discordId: mockId,
      username,
      globalName: "Dev Player",
      avatarUrl: "",
    },
    channelId,
    channelName: "Mesa local",
    locale: localeFromDiscord(params.get("lang") || navigator.language),
    mock: true,
  };
}

/**
 * Inicializa o Embedded App SDK:
 * 1. ready()
 * 2. authorize (OAuth2 code)
 * 3. troca o code no backend por access_token
 * 4. authenticate
 * 5. captura channel_id do canal de voz + locale do cliente
 */
export async function setupDiscord() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  if (!isInsideDiscord() || !clientId || clientId.startsWith("your_")) {
    console.info("[UNO] SDK mock — a correr fora do Discord ou sem CLIENT_ID");
    return mockSession();
  }

  discordSdk = new DiscordSDK(clientId);
  await discordSdk.ready();
  await preferLandscape(discordSdk);

  const sdkChannelId = String(discordSdk.channelId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!sdkChannelId) throw new Error("invalid_join");

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"],
  });

  const { access_token, session_token } = await apiSend("/api/token", "POST", {
    code,
    channelId: sdkChannelId,
  });
  if (!session_token) throw new Error("auth_failed");
  setSessionToken(session_token);
  const auth = await discordSdk.commands.authenticate({ access_token });
  if (!auth) throw new Error("Authenticate command failed");

  let channelName = "Voice";
  const channelId = sdkChannelId;
  if (channelId && discordSdk.guildId) {
    try {
      const channel = await discordSdk.commands.getChannel({ channel_id: channelId });
      if (channel?.name) channelName = channel.name;
    } catch (err) {
      console.warn("[UNO] getChannel falhou:", err);
    }
  }

  // Preferência: propriedade locale do SDK, senão o comando oficial
  let rawLocale = discordSdk.locale;
  if (!rawLocale) {
    try {
      const settings = await discordSdk.commands.userSettingsGetLocale();
      rawLocale = settings?.locale;
    } catch {
      rawLocale = navigator.language;
    }
  }

  return {
    user: {
      discordId: auth.user.id,
      username: auth.user.global_name || auth.user.username,
      globalName: auth.user.global_name,
      avatarUrl: (() => {
        const url = discordAvatarUrl(auth.user.id, auth.user.avatar);
        return isAllowedAvatarUrl(url) ? url : "";
      })(),
    },
    channelId,
    channelName,
    locale: localeFromDiscord(rawLocale),
    mock: false,
    sdk: discordSdk,
  };
}

export function getDiscordSdk() {
  return discordSdk;
}

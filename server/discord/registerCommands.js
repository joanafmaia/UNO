const API = "https://discord.com/api/v10";

/** Slash /playuno — abre a mesa no canal onde foi escrito (texto ou voz). */
const PLAYUNO_SLASH = {
  name: "playuno",
  description: "Abre a mesa de UNO neste canal",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  description_localizations: {
    "pt-BR": "Abre a mesa de UNO neste canal",
    "en-US": "Open the UNO table in this channel",
    "en-GB": "Open the UNO table in this channel",
  },
};

/** App Launcher: o Discord abre a mesa e publica o convite no canal. */
const PLAYUNO_ENTRY = {
  name: "launch",
  description: "Abre a mesa de UNO",
  type: 4,
  handler: 2,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

function botAuth() {
  const appId = (process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID || "").trim();
  const token = (process.env.DISCORD_BOT_TOKEN || "").trim();
  if (!appId || appId.startsWith("your_")) return null;
  if (!token || token.startsWith("your_")) return null;
  return { appId, token };
}

async function discord(path, token, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Discord ${method} ${path} → ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

async function clearGuildOverrides(auth) {
  const guilds = await discord("/users/@me/guilds", auth.token);
  if (!Array.isArray(guilds) || guilds.length === 0) {
    console.warn("[UNO] O bot não está em nenhum servidor — convence com scope bot + applications.commands");
    return 0;
  }
  let ok = 0;
  for (const guild of guilds) {
    try {
      await discord(`/applications/${auth.appId}/guilds/${guild.id}/commands`, auth.token, {
        method: "PUT",
        body: [],
      });
      ok += 1;
      console.log(`[UNO] Comandos de servidor limpos em ${guild.name || guild.id}`);
    } catch (err) {
      console.error(`[UNO] Falha a limpar comandos em ${guild.id}:`, err.details || err.message);
    }
  }
  return ok;
}

async function registerGlobalCommands(auth) {
  await discord(`/applications/${auth.appId}/commands`, auth.token, {
    method: "PUT",
    body: [PLAYUNO_SLASH, PLAYUNO_ENTRY],
  });
  console.log("[UNO] /playuno (slash, qualquer canal) + App Launcher registados");
}

export async function registerPlayUnoCommand() {
  const auth = botAuth();
  if (!auth) {
    console.info("[UNO] /playuno não registado — falta DISCORD_BOT_TOKEN (e Client ID)");
    return false;
  }

  try {
    await registerGlobalCommands(auth);
  } catch (err) {
    console.error("[UNO] Falha a registar /playuno:", err.details || err.message);
    console.error("[UNO] Confirma Activities → Enable Activities no Developer Portal");
    return false;
  }

  await clearGuildOverrides(auth);
  return true;
}

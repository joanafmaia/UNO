const API = "https://discord.com/api/v10";

const PLAYUNO = {
  name: "playuno",
  description: "Abre a mesa de UNO",
  type: 1,
  description_localizations: {
    "pt-BR": "Abre a mesa de UNO",
    "en-US": "Open the UNO table",
    "en-GB": "Open the UNO table",
  },
};

const PLAYUNO_GLOBAL = {
  ...PLAYUNO,
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

async function registerGlobal(auth) {
  const commands = await discord(`/applications/${auth.appId}/commands`, auth.token);
  const existing = Array.isArray(commands)
    ? commands.find((c) => c.name === PLAYUNO.name && c.type === 1)
    : null;

  if (existing) {
    await discord(`/applications/${auth.appId}/commands/${existing.id}`, auth.token, {
      method: "PATCH",
      body: PLAYUNO_GLOBAL,
    });
    console.log("[UNO] Comando /playuno actualizado (global)");
  } else {
    await discord(`/applications/${auth.appId}/commands`, auth.token, {
      method: "POST",
      body: PLAYUNO_GLOBAL,
    });
    console.log("[UNO] Comando /playuno registado (global — pode demorar até 1h)");
  }
}

async function registerInGuilds(auth) {
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
        body: [PLAYUNO],
      });
      ok += 1;
      console.log(`[UNO] /playuno no servidor ${guild.name || guild.id}`);
    } catch (err) {
      console.error(`[UNO] Falha a registar /playuno em ${guild.id}:`, err.details || err.message);
    }
  }
  return ok;
}

export async function registerPlayUnoCommand() {
  const auth = botAuth();
  if (!auth) {
    console.info("[UNO] /playuno não registado — falta DISCORD_BOT_TOKEN (e Client ID)");
    return false;
  }

  const guilds = await registerInGuilds(auth);
  await registerGlobal(auth);
  return guilds > 0;
}

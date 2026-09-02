const API = "https://discord.com/api/v10";

const PLAYUNO = {
  name: "playuno",
  description: "Abre a mesa de UNO",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  description_localizations: {
    "pt-PT": "Abre a mesa de UNO",
    "pt-BR": "Abre a mesa de UNO",
    en: "Open the UNO table",
  },
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

export async function registerPlayUnoCommand() {
  const auth = botAuth();
  if (!auth) {
    console.info("[UNO] /playuno não registado — falta DISCORD_BOT_TOKEN (e Client ID)");
    return false;
  }

  const commands = await discord(`/applications/${auth.appId}/commands`, auth.token);
  const existing = Array.isArray(commands)
    ? commands.find((c) => c.name === PLAYUNO.name && c.type === 1)
    : null;

  if (existing) {
    await discord(`/applications/${auth.appId}/commands/${existing.id}`, auth.token, {
      method: "PATCH",
      body: PLAYUNO,
    });
    console.log("[UNO] Comando /playuno actualizado");
  } else {
    await discord(`/applications/${auth.appId}/commands`, auth.token, {
      method: "POST",
      body: PLAYUNO,
    });
    console.log("[UNO] Comando /playuno registado");
  }
  return true;
}

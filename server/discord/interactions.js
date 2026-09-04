import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";

const COMMAND = "playuno";
const LAUNCH_ACTIVITY = InteractionResponseType.LAUNCH_ACTIVITY || 12;

function publicKey() {
  return (process.env.DISCORD_PUBLIC_KEY || "").trim();
}

export function interactionsConfigured() {
  const key = publicKey();
  return Boolean(key) && !key.startsWith("your_");
}

function ephemeral(content) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
  };
}

export function createInteractionsHandler() {
  const key = publicKey();
  if (!key || key.startsWith("your_")) {
    return (_req, res) => {
      res.status(503).json({ error: "interactions_not_configured" });
    };
  }

  const verify = verifyKeyMiddleware(key);
  return (req, res, next) => {
    verify(req, res, () => {
      try {
        const interaction = req.body;
        if (interaction?.type === InteractionType.APPLICATION_COMMAND) {
          const name = interaction.data?.name;
          if (name === COMMAND) {
            const channelType = interaction.channel?.type;
            console.info(`[UNO] /playuno → launch activity (canal ${channelType ?? "desconhecido"})`);
            return res.json({ type: LAUNCH_ACTIVITY });
          }
          return res.json(
            ephemeral("Comando desconhecido.")
          );
        }
        if (interaction?.type === InteractionType.PING) {
          return res.json({ type: InteractionResponseType.PONG });
        }
        return res.status(400).json({ error: "unsupported_interaction" });
      } catch (err) {
        console.error("[UNO] interactions:", err);
        if (!res.headersSent) {
          return res.json(
            ephemeral("A mesa falhou a abrir. Tenta outra vez daqui a uns segundos.")
          );
        }
        next(err);
      }
    });
  };
}

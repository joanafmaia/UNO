import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";

const COMMAND = "playuno";

function publicKey() {
  return (process.env.DISCORD_PUBLIC_KEY || "").trim();
}

export function interactionsConfigured() {
  const key = publicKey();
  return Boolean(key) && !key.startsWith("your_");
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
      const interaction = req.body;
      if (interaction?.type === InteractionType.APPLICATION_COMMAND) {
        const name = interaction.data?.name;
        if (name === COMMAND) {
          return res.send({ type: InteractionResponseType.LAUNCH_ACTIVITY });
        }
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Comando desconhecido.",
            flags: 64,
          },
        });
      }
      if (interaction?.type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
      }
      return res.status(400).json({ error: "unsupported_interaction" });
    });
  };
}

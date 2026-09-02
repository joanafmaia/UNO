import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { corsOrigin } from "./auth/sessions.js";
import { createApiRouter } from "./routes/api.js";
import { createAuthRouter } from "./routes/auth.js";
import { attachSocketHandlers } from "./socket/socketHandler.js";
import { createInteractionsHandler } from "./discord/interactions.js";
import { registerPlayUnoCommand } from "./discord/registerCommands.js";
import { connectMongo } from "./store/mongo.js";
import { migratePlayersFromJson } from "./store/playerStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: corsOrigin, credentials: true }));

// Discord precisa do corpo cru para verificar a assinatura Ed25519
app.post(
  "/api/interactions",
  express.raw({ type: "application/json", limit: "256kb" }),
  createInteractionsHandler()
);

app.use(express.json({ limit: "32kb" }));

app.use("/api", createAuthRouter());
app.use("/api", createApiRouter());

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
  pingTimeout: 30000,
  pingInterval: 10000,
});

attachSocketHandlers(io);

async function start() {
  try {
    await connectMongo();
    await migratePlayersFromJson();
  } catch (err) {
    console.error("[UNO] Não foi possível ligar ao MongoDB.");
    console.error("[UNO] Define MONGODB_URI no .env (local, Docker ou Atlas).");
    console.error(err);
    process.exit(1);
  }

  try {
    await registerPlayUnoCommand();
  } catch (err) {
    console.error("[UNO] Falha a registar /playuno:", err.details || err.message);
  }

  server.listen(PORT, () => {
    console.log(`[UNO] Servidor a escutar em http://localhost:${PORT}`);
    console.log(`[UNO] Socket.io pronto — salas agrupadas por channelId`);
  });
}

start();

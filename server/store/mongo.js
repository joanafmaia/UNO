import { MongoClient } from "mongodb";

let client;
let db;

export async function connectMongo() {
  if (db) return db;

  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error("MONGODB_URI em falta no .env (ex.: mongodb://127.0.0.1:27017/uno)");
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();

  const named = process.env.MONGODB_DB?.trim();
  db = named ? client.db(named) : client.db();
  if (!named && (!db.databaseName || db.databaseName === "test")) {
    db = client.db("uno");
  }

  const players = db.collection("players");
  await players.createIndex({ discord_id: 1 }, { unique: true });
  await players.createIndex({ wins: -1, points: -1 });

  console.log(`[UNO] MongoDB ligado — base «${db.databaseName}»`);
  return db;
}

export function getDb() {
  if (!db) throw new Error("mongo_not_connected");
  return db;
}

export function playersCollection() {
  return getDb().collection("players");
}

export async function pingMongo() {
  await getDb().command({ ping: 1 });
}

export function mongoConnected() {
  return Boolean(db);
}

export async function closeMongo() {
  if (!client) return;
  await client.close();
  client = null;
  db = null;
}

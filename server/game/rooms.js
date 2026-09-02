import { UnoEngine } from "./UnoEngine.js";

/** Salas indexadas pelo código (ex.: K7P2). Cada canal Discord tem uma mesa por omissão. */
const rooms = new Map();
const channelIndex = new Map();

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode() {
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i += 1) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("room_code_exhausted");
}

export function sanitizeRoomCode(raw) {
  const cleaned = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 6) return "";
  return cleaned;
}

function remember(room) {
  rooms.set(room.code, room);
  return room;
}

export function getOrCreateChannelRoom(channelId) {
  const existingCode = channelIndex.get(channelId);
  if (existingCode && rooms.has(existingCode)) return rooms.get(existingCode);
  const code = makeRoomCode();
  const room = new UnoEngine(channelId, code);
  channelIndex.set(channelId, code);
  return remember(room);
}

export function createPrivateRoom(channelId) {
  const code = makeRoomCode();
  const room = new UnoEngine(channelId || "private", code);
  room.privateTable = true;
  return remember(room);
}

export function getRoomByCode(raw) {
  const code = sanitizeRoomCode(raw);
  return code ? rooms.get(code) ?? null : null;
}

/** Testes / chave explícita (não é um código de 4 letras). */
export function getOrCreateRoom(id) {
  if (rooms.has(id)) return rooms.get(id);
  const room = new UnoEngine(id, id);
  return remember(room);
}

export function getRoom(id) {
  if (rooms.has(id)) return rooms.get(id);
  return getRoomByCode(id);
}

export function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.occupants().some((p) => p.socketId === socketId)) return room;
  }
  return null;
}

export function forEachRoom(cb) {
  for (const room of rooms.values()) cb(room);
}

function forget(room) {
  rooms.delete(room.code);
  for (const [channelId, code] of channelIndex) {
    if (code === room.code) channelIndex.delete(channelId);
  }
}

export function deleteRoomIfEmpty(id) {
  const room = getRoom(id);
  if (!room) return;
  const anyoneConnected = room.occupants().some((p) => p.connected && !p.isBot);
  if (!anyoneConnected) forget(room);
}

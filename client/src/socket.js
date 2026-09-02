import { io } from "socket.io-client";
import { isInsideDiscord } from "./lib/api.js";

/**
 * Cliente Socket.io.
 * Dentro do Discord o path passa pelo proxy da Activity (/.proxy/socket.io).
 */
export function createSocket(sessionToken) {
  const inside = isInsideDiscord();
  return io(inside ? window.location.origin : "http://localhost:3001", {
    path: inside ? "/.proxy/socket.io" : "/socket.io",
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: { sessionToken },
  });
}

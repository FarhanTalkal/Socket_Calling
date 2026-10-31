import { io } from "socket.io-client";

const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");

export const isServerConfigured = Boolean(SERVER_URL);

const ackTimeout =
  process.env.NODE_ENV === "production" && process.env.REACT_APP_SERVER_URL ? 20000 : 5000;

export const socket = isServerConfigured
  ? io(SERVER_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
    })
  : { connected: false, on: () => {}, off: () => {}, connect: () => {}, disconnect: () => {} };

export const emitWithAck = (event, payload, timeout = ackTimeout) => {
  if (!isServerConfigured) return Promise.resolve({ ok: false, error: "Server URL not configured" });
  return socket
    .timeout(timeout)
    .emitWithAck(event, payload)
    .catch(() => ({ ok: false, error: "Server did not respond (Render may be waking up)" }));
};

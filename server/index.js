const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOW_VERCEL_PREVIEWS = process.env.ALLOW_VERCEL_PREVIEWS === "true";

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (CLIENT_ORIGINS.includes(origin)) return true;
  if (!ALLOW_VERCEL_PREVIEWS) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === "vercel.app" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error(`Origin not allowed: ${origin}`));
  },
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 32;

const app = express();
app.use(cors(corsOptions));

const clientBuild = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get(/^(?!\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e5,
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", connections: io.engine.clientsCount });
});

const cleanString = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const reply = (ack, payload) => {
  if (typeof ack === "function") ack(payload);
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join_room", (data, ack) => {
    const room = cleanString(data?.room, MAX_NAME_LENGTH);
    const username = cleanString(data?.username, MAX_NAME_LENGTH);
    if (!room || !username) {
      return reply(ack, { ok: false, error: "Username and room are required" });
    }

    const previousRoom = socket.data.room;
    if (previousRoom && previousRoom !== room) {
      socket.leave(previousRoom);
      socket.to(previousRoom).emit("user_left", { username: socket.data.username });
    }

    const alreadyInRoom = previousRoom === room && socket.rooms.has(room);
    socket.data.room = room;
    socket.data.username = username;
    socket.join(room);

    if (!alreadyInRoom) {
      socket.to(room).emit("user_joined", { username });
      console.log(`User ${username} (${socket.id}) joined room: ${room}`);
    }
    reply(ack, { ok: true });
  });

  socket.on("send_message", (data, ack) => {
    const { room, username } = socket.data;
    const message = cleanString(data?.message, MAX_MESSAGE_LENGTH);
    if (!room || !message) {
      return reply(ack, { ok: false, error: "Not in a room or empty message" });
    }

    const messageData = {
      id: randomUUID(),
      room,
      author: username,
      message,
      timestamp: Date.now(),
    };
    socket.to(room).emit("receive_message", messageData);
    reply(ack, { ok: true, message: messageData });
  });

  socket.on("disconnect", (reason) => {
    const { room, username } = socket.data;
    if (room) socket.to(room).emit("user_left", { username });
    console.log(`User disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

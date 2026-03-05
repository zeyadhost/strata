import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { World } from "./world/world";
import { PlayerState, WorldInitPayload } from "./types";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT ?? 3000;

const world = new World();
console.log(`World generated (seed: ${world.seed}), spawn: ${world.spawnX}, ${world.spawnY}`);

const players = new Map<string, PlayerState>();

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const playerState: PlayerState = {
    id: socket.id,
    x: world.spawnX,
    y: world.spawnY,
    flipX: false,
  };
  players.set(socket.id, playerState);

  const payload: WorldInitPayload = {
    tiles: world.tiles,
    spawnX: world.spawnX,
    spawnY: world.spawnY,
    players: Array.from(players.values()).filter((p) => p.id !== socket.id),
  };
  socket.emit("world:init", payload);

  socket.broadcast.emit("player:joined", playerState);

  socket.on("player:move", (data: { x: number; y: number; flipX: boolean }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = data.x;
    p.y = data.y;
    p.flipX = data.flipX;
    socket.broadcast.emit("player:state", { id: socket.id, ...data });
  });

  socket.on("tile:dig", (data: { x: number; y: number }) => {
    const change = world.digTile(data.x, data.y);
    if (change) io.emit("tile:update", change);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    io.emit("player:left", { id: socket.id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Strata server listening on port ${PORT}`);
});

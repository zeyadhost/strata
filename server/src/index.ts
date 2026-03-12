import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { World } from "./world/world";
import { InventoryKey, createEmptyInventoryState, InventoryState, OreCollectPayload, OreDropPayload, PlayerState, TILE_SIZE, TileType, WorldInitPayload } from "./types";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT ?? 3000;

const world = new World();
console.log(`World generated (seed: ${world.seed}), spawn: ${world.spawnX}, ${world.spawnY}`);

const players = new Map<string, PlayerState>();
const inventories = new Map<string, InventoryState>();
const playerDrops = new Map<string, Map<string, OreDropPayload>>();
let nextDropId = 1;
const ORE_PICKUP_RADIUS = 34;

function getInventoryKeyForTile(tileType: TileType): InventoryKey | null {
  switch (tileType) {
    case TileType.COAL:
      return "coal";
    case TileType.COPPER:
      return "copper";
    case TileType.IRON:
      return "iron";
    case TileType.SILVER:
      return "silver";
    case TileType.GOLD:
      return "gold";
    case TileType.EMERALD:
      return "emerald";
    case TileType.SAPPHIRE:
      return "sapphire";
    case TileType.DIAMOND:
      return "diamond";
    default:
      return null;
  }
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const playerState: PlayerState = {
    id: socket.id,
    x: world.spawnX,
    y: world.spawnY,
    flipX: false,
  };
  players.set(socket.id, playerState);
  inventories.set(socket.id, createEmptyInventoryState());
  playerDrops.set(socket.id, new Map());

  const payload: WorldInitPayload = {
    tiles: world.tiles,
    spawnX: world.spawnX,
    spawnY: world.spawnY,
    players: Array.from(players.values()).filter((p) => p.id !== socket.id),
    inventory: { ...(inventories.get(socket.id) ?? createEmptyInventoryState()) },
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
    const result = world.digTile(data.x, data.y);
    if (!result) return;

    io.emit("tile:update", result.change);

    const inventoryKey = getInventoryKeyForTile(result.minedType);
    if (!inventoryKey) return;

    const dropId = `drop-${nextDropId++}`;
    const drop: OreDropPayload = {
      dropId,
      item: inventoryKey,
      x: data.x,
      y: data.y,
    };

    const drops = playerDrops.get(socket.id);
    drops?.set(dropId, drop);
    socket.emit("ore:dropped", drop);
  });

  socket.on("ore:collect", (data: OreCollectPayload) => {
    const drops = playerDrops.get(socket.id);
    const drop = drops?.get(data.dropId);
    const player = players.get(socket.id);
    if (!drop || !player) return;

    const dropCenterX = drop.x * TILE_SIZE + TILE_SIZE / 2;
    const dropCenterY = drop.y * TILE_SIZE + TILE_SIZE / 2;
    const distance = Math.hypot(player.x - dropCenterX, player.y - dropCenterY);
    if (distance > ORE_PICKUP_RADIUS) return;

    drops?.delete(data.dropId);

    const inventory = inventories.get(socket.id) ?? createEmptyInventoryState();
    inventory[drop.item] += 1;
    inventories.set(socket.id, inventory);

    socket.emit("inventory:update", { inventory: { ...inventory } });
    socket.emit("ore:collected", {
      dropId: drop.dropId,
      item: drop.item,
      amount: 1,
      x: drop.x,
      y: drop.y,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    inventories.delete(socket.id);
    playerDrops.delete(socket.id);
    io.emit("player:left", { id: socket.id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Strata server listening on port ${PORT}`);
});

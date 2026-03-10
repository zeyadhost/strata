export enum TileType {
  AIR     = 0,
  GRASS   = 1,
  DIRT    = 2,
  STONE   = 3,
  COAL    = 4,
  EMERALD = 5,
  DIAMOND = 6,
}

export interface TileChange {
  x: number;
  y: number;
  type: TileType;
}

export type InventoryKey = "coal" | "emerald" | "diamond";

export type InventoryState = Record<InventoryKey, number>;

export interface InventoryUpdatePayload {
  inventory: InventoryState;
}

export interface OreCollectedPayload {
  item: InventoryKey;
  amount: number;
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  flipX: boolean;
}

export interface WorldInitPayload {
  tiles: number[][];
  spawnX: number;
  spawnY: number;
  players: PlayerState[];
  inventory: InventoryState;
}

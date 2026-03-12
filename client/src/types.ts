export enum TileType {
  AIR      = 0,
  GRASS    = 1,
  DIRT     = 2,
  STONE    = 3,
  COAL     = 4,
  COPPER   = 5,
  IRON     = 6,
  SILVER   = 7,
  GOLD     = 8,
  EMERALD  = 9,
  SAPPHIRE = 10,
  DIAMOND  = 11,
}

export interface TileChange {
  x: number;
  y: number;
  type: TileType;
}

export const INVENTORY_KEYS = ["coal", "copper", "iron", "silver", "gold", "emerald", "sapphire", "diamond"] as const;

export type InventoryKey = (typeof INVENTORY_KEYS)[number];

export type InventoryState = Record<InventoryKey, number>;

export function createEmptyInventoryState(): InventoryState {
  return {
    coal: 0,
    copper: 0,
    iron: 0,
    silver: 0,
    gold: 0,
    emerald: 0,
    sapphire: 0,
    diamond: 0,
  };
}

export interface InventoryUpdatePayload {
  inventory: InventoryState;
}

export interface OreDropPayload {
  dropId: string;
  item: InventoryKey;
  x: number;
  y: number;
}

export interface OreCollectPayload {
  dropId: string;
}

export interface OreCollectedPayload {
  dropId: string;
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

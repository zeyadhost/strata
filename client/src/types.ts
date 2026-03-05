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
}

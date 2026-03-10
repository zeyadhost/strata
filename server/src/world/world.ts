import { TileType, WORLD_WIDTH, WORLD_HEIGHT, TileChange } from "../types";
import { generateWorld, findSpawn } from "./worldGen";

export interface DigResult {
  change: TileChange;
  minedType: TileType;
}

export class World {
  readonly tiles: number[][];
  readonly spawnX: number;
  readonly spawnY: number;
  readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 0xffffff);
    this.tiles = generateWorld(this.seed);
    const spawn = findSpawn(this.tiles);
    this.spawnX = spawn.spawnX;
    this.spawnY = spawn.spawnY;
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT;
  }

  getTile(x: number, y: number): TileType {
    if (!this.isInBounds(x, y)) return TileType.AIR;
    return this.tiles[y][x];
  }

  digTile(x: number, y: number): DigResult | null {
    if (!this.isInBounds(x, y)) return null;
    const minedType = this.tiles[y][x];
    if (minedType === TileType.AIR) return null;
    this.tiles[y][x] = TileType.AIR;
    return {
      change: { x, y, type: TileType.AIR },
      minedType,
    };
  }
}

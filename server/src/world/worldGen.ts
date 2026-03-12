import {
  TileType,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  LAYER_SURFACE,
  LAYER_SHALLOW,
  LAYER_MID,
  LAYER_DEEP,
} from "../types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHeightmap(rand: () => number): number[] {
  const STEP = 12;
  const points: number[] = [];
  for (let i = 0; i <= Math.ceil(WORLD_WIDTH / STEP) + 1; i++) {
    points.push((rand() - 0.5) * 6);
  }

  const map: number[] = new Array(WORLD_WIDTH);
  for (let x = 0; x < WORLD_WIDTH; x++) {
    const seg = Math.floor(x / STEP);
    const t   = (x % STEP) / STEP;
    const smooth = t * t * (3 - 2 * t);
    const base =
      Math.sin(x * 0.025) * 4 +
      Math.sin(x * 0.007 + 0.8) * 6;
    map[x] = Math.round(LAYER_SURFACE + base + points[seg] * (1 - smooth) + points[seg + 1] * smooth);
  }
  return map;
}

function baseTileAt(y: number, surfaceY: number): TileType {
  if (y < surfaceY)      return TileType.AIR;
  if (y === surfaceY)    return TileType.GRASS;
  if (y < LAYER_SHALLOW) return TileType.DIRT;
  return TileType.STONE;
}

interface GemEntry { type: TileType; minY: number; maxY: number; chance: number }

const GEM_TABLE: GemEntry[] = [
  { type: TileType.COAL,     minY: LAYER_SHALLOW - 4, maxY: WORLD_HEIGHT, chance: 0.011 },
  { type: TileType.COPPER,   minY: LAYER_SHALLOW,     maxY: LAYER_MID + 8, chance: 0.008 },
  { type: TileType.IRON,     minY: LAYER_SHALLOW + 8, maxY: LAYER_DEEP, chance: 0.0065 },
  { type: TileType.SILVER,   minY: LAYER_MID - 4,     maxY: WORLD_HEIGHT, chance: 0.0045 },
  { type: TileType.GOLD,     minY: LAYER_MID + 10,    maxY: WORLD_HEIGHT, chance: 0.0038 },
  { type: TileType.EMERALD,  minY: LAYER_MID,         maxY: WORLD_HEIGHT, chance: 0.0035 },
  { type: TileType.SAPPHIRE, minY: LAYER_DEEP - 6,    maxY: WORLD_HEIGHT, chance: 0.0026 },
  { type: TileType.DIAMOND,  minY: LAYER_DEEP,        maxY: WORLD_HEIGHT, chance: 0.0018 },
];

export function generateWorld(seed: number): number[][] {
  const rand = mulberry32(seed);
  const heightmap = buildHeightmap(rand);

  const tiles: number[][] = Array.from(
    { length: WORLD_HEIGHT },
    () => new Array(WORLD_WIDTH).fill(TileType.AIR)
  );

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const surfaceY = heightmap[x];
      let tile = baseTileAt(y, surfaceY);

      if (tile !== TileType.AIR && tile !== TileType.GRASS && tile !== TileType.DIRT) {
        for (const gem of GEM_TABLE) {
          if (y >= gem.minY && y < gem.maxY && rand() < gem.chance) {
            tile = gem.type;
            break;
          }
        }
      }

      tiles[y][x] = tile;
    }
  }

  const valleyLeft  = new Array(WORLD_WIDTH).fill(false);
  const valleyRight = new Array(WORLD_WIDTH).fill(false);

  let runMin = heightmap[0];
  for (let x = 0; x < WORLD_WIDTH; x++) {
    if (heightmap[x] <= runMin + 2) {
      runMin = heightmap[x];
    } else {
      valleyLeft[x] = true;
    }
  }

  runMin = heightmap[WORLD_WIDTH - 1];
  for (let x = WORLD_WIDTH - 1; x >= 0; x--) {
    if (heightmap[x] <= runMin + 2) {
      runMin = heightmap[x];
    } else {
      valleyRight[x] = true;
    }
  }

  for (let x = 0; x < WORLD_WIDTH; x++) {
    if (valleyLeft[x] && valleyRight[x]) {
      const sy = heightmap[x];
      if (tiles[sy]?.[x] === TileType.GRASS) {
        tiles[sy][x] = TileType.DIRT;
      }
    }
  }

  return tiles;
}

export function findSpawn(tiles: number[][]): { spawnX: number; spawnY: number } {
  const midX = Math.floor(WORLD_WIDTH / 2);
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    if (tiles[y][midX] !== TileType.AIR) {
      return { spawnX: midX * 16 + 8, spawnY: (y - 1) * 16 };
    }
  }
  return { spawnX: midX * 16 + 8, spawnY: 0 };
}

export const TILE_SIZE    = 16;
export const WORLD_WIDTH  = 200;
export const WORLD_HEIGHT = 150;

export const PLAYER_SPEED       = 160;
export const PLAYER_JUMP_VEL    = -380;
export const PLAYER_WIDTH       = 14;
export const PLAYER_HEIGHT      = 20;

export const TILE_TEXTURE: Record<number, string> = {
  1: "tile_grass",
  2: "tile_dirt",
  3: "tile_stone",
  4: "gem_coal",
  5: "gem_emerald",
  6: "gem_diamond",
};

export const ORE_GLOW: Record<number, number | null> = {
  4: 0x888888,
  5: 0x00ff66,
  6: 0x66ccff,
};

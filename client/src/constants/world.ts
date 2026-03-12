export const TILE_SIZE    = 16;
export const WORLD_WIDTH  = 200;
export const WORLD_HEIGHT = 150;

export const LAYER_SURFACE  = 18;
export const LAYER_SHALLOW  = 30;
export const LAYER_MID      = 65;
export const LAYER_DEEP     = 105;

export const PLAYER_SPEED       = 160;
export const PLAYER_JUMP_VEL    = -380;
export const PLAYER_WIDTH       = 14;
export const PLAYER_BODY_WIDTH  = 10;
export const PLAYER_HEIGHT      = 20;

export const TILE_TEXTURE: Record<number, string> = {
  1: "tile_grass",
  2: "tile_dirt",
  3: "tile_stone",
  4: "ore_coal",
  5: "ore_copper",
  6: "ore_iron",
  7: "ore_silver",
  8: "ore_gold",
  9: "ore_emerald",
  10: "ore_sapphire",
  11: "ore_diamond",
};

export const DIRT_STONE_TRANSITION_TEXTURE = "tile_dirt_stone_transition";

export const ORE_GLOW: Record<number, number | null> = {
  4: 0x888888,
  5: 0xc87b44,
  6: 0xb7c7d9,
  7: 0xd8dcf4,
  8: 0xffc94a,
  9: 0x00ff66,
  10: 0x4dc7ff,
  11: 0x66ccff,
};

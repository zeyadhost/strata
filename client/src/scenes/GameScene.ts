import Phaser from "phaser";
import { Socket } from "socket.io-client";
import { ProceduralAudioManager } from "../ProceduralAudioManager";
import { createEmptyInventoryState, INVENTORY_KEYS, InventoryKey, InventoryState, InventoryUpdatePayload, OreCollectPayload, OreCollectedPayload, OreDropPayload, TileType, TileChange, PlayerState, WorldInitPayload } from "../types";
import { loadSettings, saveSettings, type GameSettings } from "../settings";
import { InventoryPanel } from "../ui/InventoryPanel";
import { HotbarPanel, type HotbarSlotKey } from "../ui/HotbarPanel";
import { SettingsMenu } from "../ui/SettingsMenu";
import { DEFAULT_EQUIPPED_PICKAXES } from "../constants/pickaxes";
import {
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  LAYER_SHALLOW,
  PLAYER_SPEED,
  PLAYER_JUMP_VEL,
  PLAYER_WIDTH,
  PLAYER_BODY_WIDTH,
  PLAYER_HEIGHT,
  DIRT_STONE_TRANSITION_TEXTURE,
  TILE_TEXTURE,
  ORE_GLOW,
} from "../constants/world";

const RENDER_BUFFER = 3;
const DIG_RANGE     = 1;
const MOVE_INTERVAL = 50;
const CURSOR_DEFAULT = "url('/cursors/cursor-24.png') 1 1, auto";
const HUD_BASE_FONT_SIZE = 18;
const HUD_BASE_MARGIN = 16;
const HUD_BASE_PADDING_X = 6;
const HUD_BASE_PADDING_Y = 4;
const HUD_FOV_MIN = 0.75;
const HUD_FOV_MAX = 2;
const HOTBAR_BASE_BOTTOM = 18;
const BREAK_EFFECT_DEPTH = 26;
const BREAK_STAGE_COUNT = 10;
const BREAK_TEXTURE_KEY = "break-crack-atlas";
const BREAK_FRAME_PREFIX = "break-stage-";
const ORE_DROP_DEPTH = 24;
const ORE_MAGNET_RADIUS = 34;
const ORE_COLLECT_RADIUS = 14;
const ORE_DROP_SIZE = 14;
const ORE_FLIGHT_SIZE = 28;
const ORE_MAGNET_BASE_SPEED = 92;
const ORE_MAGNET_SPEED_GAIN = 1.45;
const ORE_FLIGHT_DURATION_MS = 420;

const BREAK_CRACK_PATHS: Array<Array<[number, number]>> = [
  [[8, 1], [7, 4], [8, 7], [6, 10], [4, 15]],
  [[8, 7], [10, 5], [12, 4], [15, 2]],
  [[8, 7], [11, 8], [13, 10], [14, 14]],
  [[6, 10], [8, 12], [10, 15]],
  [[7, 4], [4, 3], [2, 1]],
  [[7, 4], [5, 6], [3, 7], [1, 8]],
  [[11, 8], [12, 7], [14, 6]],
  [[5, 12], [3, 13], [1, 15]],
  [[10, 5], [10, 3], [11, 1]],
  [[9, 12], [11, 13], [13, 15]],
  [[4, 9], [2, 10], [1, 12]],
  [[12, 9], [14, 10], [15, 12]],
];

const BREAK_STAGE_PATH_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];

function breakFrameKey(stage: number) {
  return `${BREAK_FRAME_PREFIX}${stage}`;
}

function plotBreakPixel(context: CanvasRenderingContext2D, baseX: number, x: number, y: number, color: string) {
  if (x < 0 || x >= TILE_SIZE || y < 0 || y >= TILE_SIZE) {
    return;
  }

  context.fillStyle = color;
  context.fillRect(baseX + x, y, 1, 1);
}

function drawBreakLine(
  context: CanvasRenderingContext2D,
  baseX: number,
  start: [number, number],
  end: [number, number],
  color: string,
) {
  let [x0, y0] = start;
  const [x1, y1] = end;
  const deltaX = Math.abs(x1 - x0);
  const deltaY = Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    plotBreakPixel(context, baseX, x0, y0, color);
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x0 += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y0 += stepY;
    }
  }
}

type BreakTarget = {
  x: number;
  y: number;
  type: TileType;
  durationMs: number;
};

type TileRenderConfig = {
  textureKey: string;
  rotation?: number;
};

type OreDropState = {
  payload: OreDropPayload;
  sprite: Phaser.GameObjects.Image;
  bobTween: Phaser.Tweens.Tween | null;
  collecting: boolean;
};

function gemTextureKey(item: InventoryKey) {
  return `gem_${item}`;
}

function gemAssetPath(item: InventoryKey) {
  return `/gems/${item}.png`;
}

export class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private tiles: number[][] = [];
  private spawnX = 0;
  private spawnY = 0;
  private settings: GameSettings = loadSettings();
  private worldReady = false;
  private pendingInit: WorldInitPayload | null = null;

  private player!: Phaser.GameObjects.Rectangle;
  private otherPlayers = new Map<string, Phaser.GameObjects.Rectangle>();
  private settingsMenu!: SettingsMenu;
  private audioManager!: ProceduralAudioManager;

  private tileSprites = new Map<number, Phaser.Physics.Arcade.Image>();
  private tileGlows = new Map<number, Phaser.GameObjects.Rectangle>();
  private tileGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lastViewLeft = -999;
  private lastViewTop  = -999;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private moveTimer = 0;
  private pointerMining = false;
  private wasGrounded = false;
  private loadingText!: Phaser.GameObjects.Text;
  private coordsText!: HTMLDivElement;
  private inventoryPanel!: InventoryPanel;
  private hotbarPanel!: HotbarPanel;
  private activeHotbarSlot: HotbarSlotKey = "main-pickaxe";
  private breakTarget: BreakTarget | null = null;
  private breakElapsedMs = 0;
  private breakEffect!: Phaser.GameObjects.Image;
  private breakEffectStage = -1;
  private pendingDigTiles = new Set<number>();
  private oreDrops = new Map<string, OreDropState>();
  private inventory: InventoryState = createEmptyInventoryState();

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { socket: Socket; worldInit: WorldInitPayload }) {
    this.socket = data.socket;
    this.pendingInit = data.worldInit ?? null;
  }

  preload() {
    this.load.image("tile_grass", "/tiles/grass.png");
    this.load.image("tile_dirt", "/tiles/dirt.png");
    this.load.image("tile_stone", "/tiles/stone.png");
    this.load.image(DIRT_STONE_TRANSITION_TEXTURE, "/tiles/dirt_stone_transition.png");
    this.load.image("ore_coal", "/ores/coal.png");
    this.load.image("ore_copper", "/ores/copper.png");
    this.load.image("ore_iron", "/ores/iron.png");
    this.load.image("ore_silver", "/ores/silver.png");
    this.load.image("ore_gold", "/ores/gold.png");
    this.load.image("ore_emerald", "/ores/emerald.png");
    this.load.image("ore_sapphire", "/ores/sapphire.png");
    this.load.image("ore_diamond", "/ores/diamond.png");
    for (const key of INVENTORY_KEYS) {
      this.load.image(gemTextureKey(key), gemAssetPath(key));
    }
  }

  create() {
    this.tileGroup = this.physics.add.staticGroup();
    this.input.setDefaultCursor(CURSOR_DEFAULT);
    this.audioManager = new ProceduralAudioManager(this.settings);
    this.ensureBreakTextureAtlas();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.loadingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Loading world...", { fontFamily: "monogram", fontSize: "24px", color: "#aaaaaa" })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.coordsText = document.createElement("div");
    this.coordsText.className = "strata-coords-hud";
    Object.assign(this.coordsText.style, {
      position: "fixed",
      left: `${HUD_BASE_MARGIN}px`,
      top: `${HUD_BASE_MARGIN}px`,
      zIndex: "900",
      pointerEvents: "none",
      fontFamily: "monogram, monospace",
      fontSize: `${HUD_BASE_FONT_SIZE}px`,
      lineHeight: "1",
      color: "#f7f1d5",
      background: "rgba(11, 16, 32, 0.8)",
      padding: `${HUD_BASE_PADDING_Y}px ${HUD_BASE_PADDING_X}px`,
      textTransform: "uppercase",
      whiteSpace: "pre",
      imageRendering: "pixelated",
      display: this.settings.showCoordinates ? "block" : "none",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.coordsText);

    this.breakEffect = this.add.image(0, 0, BREAK_TEXTURE_KEY, breakFrameKey(0));
    this.breakEffect.setOrigin(0);
    this.breakEffect.setDepth(BREAK_EFFECT_DEPTH);
    this.breakEffect.setAlpha(0.9);
    this.breakEffect.setVisible(false);

    this.inventoryPanel = new InventoryPanel({
      onVisibilityChange: (isOpen) => {
        this.hotbarPanel?.setActiveSlot(isOpen ? "inventory" : this.activeHotbarSlot);
      },
    });
    this.inventoryPanel.setInventory(this.inventory);
    this.hotbarPanel = new HotbarPanel({
      onSelect: (slot) => this.handleHotbarSelect(slot),
    });
    this.hotbarPanel.setSlotVisual("main-pickaxe", {
      title: DEFAULT_EQUIPPED_PICKAXES.primary.shortName,
      accentColor: DEFAULT_EQUIPPED_PICKAXES.primary.accentColor,
      compact: true,
    });
    this.hotbarPanel.setSlotVisual("secondary-pickaxe", {
      title: DEFAULT_EQUIPPED_PICKAXES.secondary.shortName,
      accentColor: DEFAULT_EQUIPPED_PICKAXES.secondary.accentColor,
      compact: true,
    });
    this.hotbarPanel.setActiveSlot(this.activeHotbarSlot);

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("gameout", this.onPointerUp, this);
    this.input.keyboard?.on("keydown", this.onAnyKeyDown, this);

    this.settingsMenu = new SettingsMenu(this.settings, {
      onApply: (settings) => {
        saveSettings(settings);
        this.applySettings(settings);
      },
    });

    this.applySettings(this.settings);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onAnyKeyDown, this);
      this.audioManager.destroy();
      this.settingsMenu.destroy();
      this.coordsText.remove();
      this.inventoryPanel.destroy();
      this.hotbarPanel.destroy();
      this.clearOreDrops();
      this.breakEffect.destroy();
    });

    this.registerSocketEvents();

    if (this.pendingInit) {
      this.applyWorldInit(this.pendingInit);
      this.pendingInit = null;
    }
  }

  private registerSocketEvents() {
    this.socket.on("world:init", (payload: WorldInitPayload) => {
      this.applyWorldInit(payload);
    });

    this.socket.on("tile:update", (change: TileChange) => {
      if (!this.tiles[change.y]) return;
      this.tiles[change.y][change.x] = change.type;
      this.pendingDigTiles.delete(this.getTileKey(change.x, change.y));

      if (this.breakTarget?.x === change.x && this.breakTarget?.y === change.y) {
        this.clearBreakTarget();
      }

      this.invalidateTileNeighborhood(change.x, change.y);

      this.lastViewLeft = -999;
      this.lastViewTop  = -999;
    });

    this.socket.on("inventory:update", ({ inventory }: InventoryUpdatePayload) => {
      this.inventory = { ...inventory };
      this.inventoryPanel.setInventory(this.inventory);
    });

    this.socket.on("ore:dropped", (payload: OreDropPayload) => {
      this.spawnOreDrop(payload);
    });

    this.socket.on("ore:collected", (payload: OreCollectedPayload) => {
      this.handleOreCollected(payload);
    });

    this.socket.on("player:joined", (p: PlayerState) => this.spawnOtherPlayer(p));

    this.socket.on("player:state", (p: PlayerState) => {
      const sprite = this.otherPlayers.get(p.id);
      if (!sprite) return;
      sprite.setPosition(p.x, p.y);
    });

    this.socket.on("player:left", ({ id }: { id: string }) => {
      this.otherPlayers.get(id)?.destroy();
      this.otherPlayers.delete(id);
    });
  }

  private applyWorldInit(payload: WorldInitPayload) {
    this.tiles  = payload.tiles;
    this.spawnX = payload.spawnX;
    this.spawnY = payload.spawnY;
    this.inventory = { ...payload.inventory };
    this.pendingDigTiles.clear();
    this.clearBreakTarget();
    this.clearOreDrops();

    this.loadingText.destroy();
    this.initPlayer();
    this.inventoryPanel.setInventory(this.inventory);

    for (const p of payload.players) this.spawnOtherPlayer(p);

    this.worldReady = true;
  }

  private createWorldBarriers() {
    const W = WORLD_WIDTH  * TILE_SIZE;
    const H = WORLD_HEIGHT * TILE_SIZE;
    const T = 32;
    const walls = this.physics.add.staticGroup();
    const rects = [
      { x: -T / 2,     y: H / 2,      w: T, h: H      },
      { x: W + T / 2,  y: H / 2,      w: T, h: H      },
      { x: W / 2,      y: H + T / 2,  w: W, h: T      },
      { x: W / 2,      y: -T / 2,     w: W, h: T      },
    ];
    for (const r of rects) {
      const zone = this.add.zone(r.x, r.y, r.w, r.h);
      this.physics.add.existing(zone, true);
      walls.add(zone);
    }
    this.physics.add.collider(this.player, walls);
  }

  private initPlayer() {
    this.player = this.add.rectangle(this.spawnX, this.spawnY, PLAYER_WIDTH, PLAYER_HEIGHT, this.getPlayerColor(this.socket.id ?? "local"));
    this.player.setStrokeStyle(2, 0x0f172a, 0.9);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY_WIDTH, PLAYER_HEIGHT);
    body.setOffset((PLAYER_WIDTH - PLAYER_BODY_WIDTH) * 0.5, 0);
    body.setCollideWorldBounds(false);
    this.wasGrounded = false;

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.physics.add.collider(this.player, this.tileGroup, undefined, (_playerObj, tileObj) => {
      const pb = this.player.body as Phaser.Physics.Arcade.Body;
      const tb = (tileObj as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      const inXRange = pb.center.x >= tb.position.x && pb.center.x <= tb.position.x + tb.width;
      const inYRange = pb.center.y >= tb.position.y && pb.center.y <= tb.position.y + tb.height;
      return inXRange || inYRange;
    });
    this.createWorldBarriers();

    this.applySettings(this.settings);
    this.updateViewport(true);
  }

  private spawnOtherPlayer(p: PlayerState) {
    const sprite = this.add.rectangle(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, this.getPlayerColor(p.id));
    sprite.setStrokeStyle(2, 0x0f172a, 0.9);
    sprite.setDepth(10);
    sprite.setVisible(this.settings.showOtherPlayers);
    this.otherPlayers.set(p.id, sprite);
  }

  private applySettings(settings: GameSettings) {
    this.settings = { ...settings };
    this.audioManager?.setSettings(this.settings);
    this.settingsMenu?.setSettings(this.settings);
    this.sound.setVolume(this.settings.masterVolume / 100);
    this.cameras.main.setZoom(this.settings.fov);
    this.cameras.main.setRoundPixels(this.settings.pixelSnap);
    if (this.coordsText) {
      this.coordsText.style.display = this.settings.showCoordinates ? "block" : "none";
    }
    this.updateHudLayout();
    this.updateCoordinatesText();

    for (const sprite of this.otherPlayers.values()) {
      sprite.setVisible(this.settings.showOtherPlayers);
    }
  }

  private getPlayerColor(id: string): number {
    let hash = 0;
    for (let index = 0; index < id.length; index++) {
      hash = ((hash << 5) - hash + id.charCodeAt(index)) | 0;
    }

    const hue = Math.abs(hash) % 360;
    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.75, 0.58);
    return Phaser.Display.Color.GetColor(color.red, color.green, color.blue);
  }

  private spawnOreDrop(payload: OreDropPayload) {
    this.destroyOreDrop(payload.dropId);

    const centerX = payload.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = payload.y * TILE_SIZE + TILE_SIZE / 2;
    const spreadSeed = Array.from(payload.dropId).reduce((total, char) => total + char.charCodeAt(0), 0);
    const offsetX = ((spreadSeed % 7) - 3) * 1.25;
    const offsetY = (((spreadSeed >> 3) % 5) - 2) * 0.9;

    const sprite = this.add.image(centerX + offsetX, centerY + offsetY, gemTextureKey(payload.item));
    sprite.setDisplaySize(ORE_DROP_SIZE, ORE_DROP_SIZE);
    sprite.setDepth(ORE_DROP_DEPTH);

    const bobTween = this.tweens.add({
      targets: sprite,
      y: sprite.y - 3,
      duration: 620 + (spreadSeed % 5) * 40,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    this.oreDrops.set(payload.dropId, {
      payload,
      sprite,
      bobTween,
      collecting: false,
    });
  }

  private destroyOreDrop(dropId: string) {
    const drop = this.oreDrops.get(dropId);
    if (!drop) return;

    drop.bobTween?.stop();
    drop.sprite.destroy();
    this.oreDrops.delete(dropId);
  }

  private clearOreDrops() {
    for (const dropId of this.oreDrops.keys()) {
      this.destroyOreDrop(dropId);
    }
  }

  private updateOreDrops(delta: number) {
    if (!this.player || this.oreDrops.size === 0) {
      return;
    }

    const targetX = this.player.x;
    const targetY = this.player.y - PLAYER_HEIGHT * 0.25;
    const deltaSeconds = delta / 1000;

    for (const drop of this.oreDrops.values()) {
      if (drop.collecting) {
        continue;
      }

      const dx = targetX - drop.sprite.x;
      const dy = targetY - drop.sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance > ORE_MAGNET_RADIUS) {
        continue;
      }

      if (drop.bobTween) {
        drop.bobTween.stop();
        drop.bobTween = null;
      }

      const pullStrength = ORE_MAGNET_BASE_SPEED + (ORE_MAGNET_RADIUS - distance) * ORE_MAGNET_SPEED_GAIN;
      const step = Math.min(pullStrength * deltaSeconds, distance);
      if (distance > 0.001) {
        drop.sprite.x += (dx / distance) * step;
        drop.sprite.y += (dy / distance) * step;
      }

      if (distance <= ORE_COLLECT_RADIUS) {
        drop.collecting = true;
        drop.sprite.setVisible(false);
        this.socket.emit("ore:collect", { dropId: drop.payload.dropId } satisfies OreCollectPayload);
      }
    }
  }

  private handleOreCollected(payload: OreCollectedPayload) {
    const drop = this.oreDrops.get(payload.dropId);
    if (drop) {
      this.playOreCollectFlight(drop.payload.item, drop.sprite.x, drop.sprite.y);
      this.destroyOreDrop(payload.dropId);
    }

    this.showOrePickupText(payload);
  }

  private playOreCollectFlight(item: InventoryKey, worldX: number, worldY: number) {
    const slotRect = this.hotbarPanel.getSlotRect("inventory");
    if (!slotRect) {
      return;
    }

    const canvasRect = this.game.canvas.getBoundingClientRect();
    const camera = this.cameras.main;
    const zoom = camera.zoom;
    const startX = canvasRect.left + (worldX - camera.worldView.x) * zoom - ORE_FLIGHT_SIZE / 2;
    const startY = canvasRect.top + (worldY - camera.worldView.y) * zoom - ORE_FLIGHT_SIZE / 2;
    const targetX = slotRect.left + slotRect.width / 2 - ORE_FLIGHT_SIZE / 2;
    const targetY = slotRect.top + slotRect.height / 2 - ORE_FLIGHT_SIZE / 2;
    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    const element = document.createElement("img");
    element.src = gemAssetPath(item);
    element.alt = "";
    Object.assign(element.style, {
      position: "fixed",
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${ORE_FLIGHT_SIZE}px`,
      height: `${ORE_FLIGHT_SIZE}px`,
      pointerEvents: "none",
      zIndex: "980",
      imageRendering: "pixelated",
      transform: "translate3d(0, 0, 0) scale(1)",
      opacity: "1",
      transition: `transform ${ORE_FLIGHT_DURATION_MS}ms cubic-bezier(0.18, 0.88, 0.24, 1), opacity ${ORE_FLIGHT_DURATION_MS}ms ease-out`,
      filter: "drop-shadow(0 3px 0 rgba(4, 10, 23, 0.55))",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(element);

    requestAnimationFrame(() => {
      element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.42)`;
      element.style.opacity = "0.72";
    });

    window.setTimeout(() => {
      element.remove();
      this.hotbarPanel.pulseSlot("inventory");
    }, ORE_FLIGHT_DURATION_MS + 20);
  }

  private invalidateTileSprite(tx: number, ty: number) {
    if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return;
    const key = ty * WORLD_WIDTH + tx;
    const sprite = this.tileSprites.get(key);
    if (!sprite) return;
    this.tileGroup.remove(sprite, true, true);
    this.tileSprites.delete(key);
    this.tileGlows.get(key)?.destroy();
    this.tileGlows.delete(key);
  }

  private invalidateTileNeighborhood(tx: number, ty: number) {
    const neighbors: Array<[number, number]> = [
      [tx, ty],
      [tx, ty - 1],
      [tx, ty + 1],
      [tx - 1, ty],
      [tx + 1, ty],
      [tx - 1, ty + 1],
      [tx + 1, ty + 1],
      [tx - 1, ty - 1],
      [tx + 1, ty - 1],
    ];

    for (const [neighborX, neighborY] of neighbors) {
      this.invalidateTileSprite(neighborX, neighborY);
    }
  }

  private isSolidTile(tx: number, ty: number): boolean {
    return this.tiles[ty]?.[tx] !== undefined && this.tiles[ty][tx] !== TileType.AIR;
  }

  private getTileTextureConfig(tx: number, ty: number, tileType: TileType): TileRenderConfig | null {
    if (tileType === TileType.GRASS) {
      const aboveLeft = this.isSolidTile(tx - 1, ty - 1);
      const aboveRight = this.isSolidTile(tx + 1, ty - 1);
      if (aboveLeft && aboveRight) {
        return { textureKey: TILE_TEXTURE[TileType.DIRT] };
      }
    }

    if (tileType === TileType.STONE && ty === LAYER_SHALLOW) {
      return {
        textureKey: DIRT_STONE_TRANSITION_TEXTURE,
        rotation: 90,
      };
    }

    const textureKey = TILE_TEXTURE[tileType];
    return textureKey ? { textureKey } : null;
  }

  private updateViewport(force = false) {
    if (!this.player) return;
    const cam = this.cameras.main;

    const vl = Math.max(0,            Math.floor(cam.worldView.left   / TILE_SIZE) - RENDER_BUFFER);
    const vr = Math.min(WORLD_WIDTH,  Math.ceil(cam.worldView.right   / TILE_SIZE) + RENDER_BUFFER);
    const vt = Math.max(0,            Math.floor(cam.worldView.top    / TILE_SIZE) - RENDER_BUFFER);
    const vb = Math.min(WORLD_HEIGHT, Math.ceil(cam.worldView.bottom  / TILE_SIZE) + RENDER_BUFFER);

    if (!force && vl === this.lastViewLeft && vt === this.lastViewTop) return;
    this.lastViewLeft = vl;
    this.lastViewTop  = vt;

    for (const [key, sprite] of this.tileSprites) {
      const tx = key % WORLD_WIDTH;
      const ty = Math.floor(key / WORLD_WIDTH);
      if (tx < vl || tx >= vr || ty < vt || ty >= vb) {
        this.tileGroup.remove(sprite, true, true);
        this.tileSprites.delete(key);
        this.tileGlows.get(key)?.destroy();
        this.tileGlows.delete(key);
      }
    }

    for (let ty = vt; ty < vb; ty++) {
      const row = this.tiles[ty];
      if (!row) continue;
      for (let tx = vl; tx < vr; tx++) {
        const tileType = row[tx];
        if (tileType === TileType.AIR) continue;
        const key = ty * WORLD_WIDTH + tx;
        if (this.tileSprites.has(key)) continue;
        const renderConfig = this.getTileTextureConfig(tx, ty, tileType);
        if (!renderConfig) continue;
        const px = tx * TILE_SIZE + TILE_SIZE / 2;
        const py = ty * TILE_SIZE + TILE_SIZE / 2;
        const sprite = this.physics.add.staticImage(px, py, renderConfig.textureKey);
        if (renderConfig.rotation) {
          sprite.setAngle(renderConfig.rotation);
        }
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
        const spriteBody = sprite.body as Phaser.Physics.Arcade.StaticBody;
        spriteBody.setSize(TILE_SIZE, TILE_SIZE);
        spriteBody.position.set(px - TILE_SIZE / 2, py - TILE_SIZE / 2);
        spriteBody.updateCenter();
        this.tileGroup.add(sprite);
        this.tileSprites.set(key, sprite);

        const glowColor = ORE_GLOW[tileType];
        if (glowColor != null) {
          const glow = this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE);
          glow.setStrokeStyle(2, glowColor, 0.6);
          glow.setFillStyle(glowColor, 0.08);
          glow.setDepth(sprite.depth + 1);
          this.tileGlows.set(key, glow);
        }
      }
    }
  }

  private handleDig(pointer: Phaser.Input.Pointer) {
    const target = this.getDigTarget(pointer);
    if (!target) {
      this.clearBreakTarget();
      return;
    }

    if (this.breakTarget?.x === target.x && this.breakTarget?.y === target.y) {
      return;
    }

    this.breakTarget = target;
    this.breakElapsedMs = 0;
    this.breakEffectStage = -1;
    this.updateBreakEffectStage(0);
    this.audioManager.playDigHit(target.x * TILE_SIZE + TILE_SIZE / 2, this.player.x, 0);
    this.spawnBreakParticles(target, 3, 0.45);
  }

  private ensureBreakTextureAtlas() {
    if (this.textures.exists(BREAK_TEXTURE_KEY)) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE * BREAK_STAGE_COUNT;
    canvas.height = TILE_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;

    for (let stage = 0; stage < BREAK_STAGE_COUNT; stage++) {
      const baseX = stage * TILE_SIZE;
      const pathCount = BREAK_STAGE_PATH_COUNTS[stage];
      const shadowColor = `rgba(16, 22, 36, ${0.22 + stage * 0.045})`;
      const highlightColor = `rgba(244, 246, 255, ${0.24 + stage * 0.06})`;
      const glowColor = `rgba(224, 230, 255, ${0.08 + stage * 0.022})`;

      context.fillStyle = `rgba(255, 255, 255, ${0.03 + stage * 0.011})`;
      context.fillRect(baseX, 0, TILE_SIZE, TILE_SIZE);

      for (let pathIndex = 0; pathIndex < pathCount; pathIndex++) {
        const path = BREAK_CRACK_PATHS[pathIndex];
        for (let pointIndex = 0; pointIndex < path.length - 1; pointIndex++) {
          const start = path[pointIndex];
          const end = path[pointIndex + 1];
          drawBreakLine(context, baseX, [start[0] + 1, start[1] + 1], [end[0] + 1, end[1] + 1], shadowColor);
          drawBreakLine(context, baseX, [start[0], start[1]], [end[0], end[1]], highlightColor);
        }
      }

      if (stage >= 4) {
        for (let speck = 0; speck < stage; speck++) {
          const px = (stage * 7 + speck * 5) % 14 + 1;
          const py = (stage * 3 + speck * 4) % 14 + 1;
          plotBreakPixel(context, baseX, px, py, glowColor);
        }
      }
    }

    const texture = this.textures.addCanvas(BREAK_TEXTURE_KEY, canvas);
    if (!texture) {
      return;
    }

    for (let stage = 0; stage < BREAK_STAGE_COUNT; stage++) {
      texture.add(breakFrameKey(stage), 0, stage * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
  }

  private getDigTarget(pointer: Phaser.Input.Pointer): BreakTarget | null {
    if (!this.worldReady || !this.player) return null;

    const tx = Math.floor(pointer.worldX / TILE_SIZE);
    const ty = Math.floor(pointer.worldY / TILE_SIZE);

    return this.getDigTargetAt(tx, ty);
  }

  private getDigTargetAt(tx: number, ty: number): BreakTarget | null {
    if (!this.worldReady || !this.player) return null;

    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);

    const dx = tx - ptx;
    const dy = ty - pty;

    if (dy < 0 && dx === 0) return null;
    if (Math.abs(dx) > DIG_RANGE || dy > DIG_RANGE) return null;
    if (dy < 0 && Math.abs(dy) > 1) return null;
    if (this.tiles[ty]?.[tx] === TileType.AIR) return null;
    if (this.pendingDigTiles.has(this.getTileKey(tx, ty))) return null;

    const type = this.tiles[ty][tx] as TileType;
    return {
      x: tx,
      y: ty,
      type,
      durationMs: this.getBreakDuration(type),
    };
  }

  private onAnyKeyDown(event: KeyboardEvent) {
    void this.audioManager.unlock();

    if (event.code === "Digit1") {
      this.handleHotbarSelect("main-pickaxe");
    }

    if (event.code === "Digit2") {
      this.handleHotbarSelect("secondary-pickaxe");
    }

    if (event.code === "Backquote") {
      this.handleHotbarSelect("inventory");
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.settingsMenu.isOpen() || this.inventoryPanel.isOpen()) {
      return;
    }

    void this.audioManager.unlock();
    this.pointerMining = this.settings.holdToMine;
    this.handleDig(pointer);
  }

  private onPointerUp() {
    if (this.settings.holdToMine) {
      this.pointerMining = false;
      this.clearBreakTarget();
    }
  }

  private getTileKey(tx: number, ty: number) {
    return ty * WORLD_WIDTH + tx;
  }

  private getBreakDuration(type: TileType) {
    switch (type) {
      case TileType.GRASS:
        return 180;
      case TileType.DIRT:
        return 260;
      case TileType.STONE:
        return 520;
      case TileType.COAL:
        return 640;
      case TileType.COPPER:
        return 700;
      case TileType.IRON:
        return 760;
      case TileType.SILVER:
        return 820;
      case TileType.GOLD:
        return 860;
      case TileType.EMERALD:
        return 940;
      case TileType.SAPPHIRE:
        return 1020;
      case TileType.DIAMOND:
        return 1120;
      default:
        return 420;
    }
  }

  private getBreakEffectColor(type: TileType) {
    switch (type) {
      case TileType.GRASS:
        return 0xa7d95e;
      case TileType.DIRT:
        return 0xb48352;
      case TileType.STONE:
        return 0xc8d1e2;
      case TileType.COAL:
        return 0x9aa0ad;
      case TileType.COPPER:
        return 0xd88a57;
      case TileType.IRON:
        return 0xcbd4de;
      case TileType.SILVER:
        return 0xe6e8fb;
      case TileType.GOLD:
        return 0xffcf5e;
      case TileType.EMERALD:
        return 0x3bf4a3;
      case TileType.SAPPHIRE:
        return 0x56bcff;
      case TileType.DIAMOND:
        return 0x7de5ff;
      default:
        return 0xf7f1d5;
    }
  }

  private clearBreakTarget() {
    this.breakTarget = null;
    this.breakElapsedMs = 0;
    this.breakEffectStage = -1;
    this.breakEffect.setVisible(false);
  }

  private updateBreakEffectStage(progress: number) {
    if (!this.breakTarget) return;

    const tileLeft = this.breakTarget.x * TILE_SIZE;
    const tileTop = this.breakTarget.y * TILE_SIZE;
    const stage = Phaser.Math.Clamp(Math.floor(progress * BREAK_STAGE_COUNT), 0, BREAK_STAGE_COUNT - 1);
    this.breakEffect.setPosition(tileLeft, tileTop);
    this.breakEffect.setFrame(breakFrameKey(stage));
    this.breakEffect.setTint(this.getBreakEffectColor(this.breakTarget.type));
    this.breakEffect.setVisible(true);

    if (stage > this.breakEffectStage) {
      this.breakEffectStage = stage;
      if (stage > 0) {
        this.audioManager.playDigHit(tileLeft + TILE_SIZE / 2, this.player.x, stage / (BREAK_STAGE_COUNT - 1));
        this.spawnBreakParticles(this.breakTarget, 2, 0.35 + stage * 0.08);
      }
    }
  }

  private spawnBreakParticles(target: BreakTarget, count: number, strength: number) {
    const color = this.getBreakEffectColor(target.type);
    const centerX = target.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = target.y * TILE_SIZE + TILE_SIZE / 2;

    for (let index = 0; index < count; index++) {
      const size = Phaser.Math.Between(2, 4);
      const particle = this.add.rectangle(
        centerX + Phaser.Math.Between(-5, 5),
        centerY + Phaser.Math.Between(-5, 5),
        size,
        size,
        color,
        0.95,
      );
      particle.setDepth(BREAK_EFFECT_DEPTH + 1);

      const driftX = Phaser.Math.Between(-14, 14) * strength;
      const driftY = Phaser.Math.Between(-18, -6) * strength;

      this.tweens.add({
        targets: particle,
        x: particle.x + driftX,
        y: particle.y + driftY,
        alpha: 0,
        angle: Phaser.Math.Between(-30, 30),
        ease: "Quad.Out",
        duration: Phaser.Math.Between(180, 320),
        onComplete: () => particle.destroy(),
      });
    }
  }

  private completeBreak(target: BreakTarget) {
    this.pendingDigTiles.add(this.getTileKey(target.x, target.y));
    this.audioManager.playDig(target.x * TILE_SIZE + TILE_SIZE / 2, this.player.x);
    this.spawnBreakParticles(target, 8, 1);
    this.socket.emit("tile:dig", { x: target.x, y: target.y });
    this.clearBreakTarget();
  }

  private updateBreaking(delta: number) {
    if (!this.breakTarget) {
      this.breakEffect.setVisible(false);
      return;
    }

    const refreshedTarget = this.getDigTargetAt(this.breakTarget.x, this.breakTarget.y);
    if (!refreshedTarget) {
      this.clearBreakTarget();
      return;
    }

    this.breakTarget = refreshedTarget;
    this.breakElapsedMs += delta;
    const progress = Phaser.Math.Clamp(this.breakElapsedMs / this.breakTarget.durationMs, 0, 1);
    this.updateBreakEffectStage(progress);

    if (progress >= 1) {
      this.completeBreak(this.breakTarget);
    }
  }

  private handleHotbarSelect(slot: HotbarSlotKey) {
    if (slot === "inventory") {
      this.inventoryPanel.toggle();
      this.hotbarPanel.setActiveSlot(this.inventoryPanel.isOpen() ? "inventory" : this.activeHotbarSlot);
      return;
    }

    this.activeHotbarSlot = slot;
    if (this.inventoryPanel.isOpen()) {
      this.inventoryPanel.close();
    }
    this.hotbarPanel.setActiveSlot(this.activeHotbarSlot);
  }

  private showOrePickupText(payload: OreCollectedPayload) {
    const oreName = payload.item.toUpperCase();
    const pickupText = this.add.text(
      payload.x * TILE_SIZE + TILE_SIZE / 2,
      payload.y * TILE_SIZE + TILE_SIZE + 8,
      `+${payload.amount} ${oreName}`,
      {
        fontFamily: "monogram",
        fontSize: "18px",
        color: "#f7f1d5",
        stroke: "#0b1020",
        strokeThickness: 4,
      },
    );
    pickupText.setOrigin(0.5);
    pickupText.setDepth(30);
    pickupText.setAlpha(0);

    this.tweens.add({
      targets: pickupText,
      y: pickupText.y - 28,
      alpha: { from: 0, to: 1 },
      ease: "Cubic.Out",
      duration: 180,
      onComplete: () => {
        this.tweens.add({
          targets: pickupText,
          y: pickupText.y - 18,
          alpha: 0,
          ease: "Cubic.In",
          duration: 550,
          onComplete: () => pickupText.destroy(),
        });
      },
    });
  }

  private updateCoordinatesText() {
    if (!this.player || !this.settings.showCoordinates) return;

    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    this.coordsText.textContent = `X ${tx}  Y ${ty}  DEPTH ${ty}`;
  }

  private getSurfaceTileForMusic(grounded: boolean): TileType | null {
    if (!this.player) return null;

    const tx = Math.floor(this.player.x / TILE_SIZE);
    const footTy = Math.floor((this.player.y + PLAYER_HEIGHT * 0.5 + 2) / TILE_SIZE);
    const bodyTy = Math.floor(this.player.y / TILE_SIZE);
    const candidateTiles = grounded
      ? [this.tiles[footTy]?.[tx], this.tiles[bodyTy]?.[tx]]
      : [this.tiles[bodyTy]?.[tx], this.tiles[footTy]?.[tx]];

    for (const tileType of candidateTiles) {
      if (tileType === TileType.GRASS || tileType === TileType.DIRT) {
        return tileType;
      }
    }

    return null;
  }

  private updateHudLayout() {
    if (!this.coordsText) return;

    const normalizedFov = Phaser.Math.Clamp(
      (this.settings.fov - HUD_FOV_MIN) / (HUD_FOV_MAX - HUD_FOV_MIN),
      0,
      1,
    );
    const hudScale = Phaser.Math.Linear(0.85, 1.6, normalizedFov);
    const fontSize = Math.round(HUD_BASE_FONT_SIZE * hudScale);
    const margin = Math.round(HUD_BASE_MARGIN * hudScale);
    const paddingX = Math.round(HUD_BASE_PADDING_X * hudScale);
    const paddingY = Math.round(HUD_BASE_PADDING_Y * hudScale);

    Object.assign(this.coordsText.style, {
      left: `${margin}px`,
      top: `${margin}px`,
      fontSize: `${fontSize}px`,
      padding: `${paddingY}px ${paddingX}px`,
    } satisfies Partial<CSSStyleDeclaration>);

    this.inventoryPanel.setLayout({
      fontSize,
      paddingX,
      paddingY,
    });

    this.hotbarPanel.setLayout({
      bottom: Math.round(HOTBAR_BASE_BOTTOM * hudScale),
      fontSize,
    });
  }

  private snapCameraToPixels() {
    if (!this.settings.pixelSnap) return;

    const camera = this.cameras.main;
    camera.scrollX = Math.round(camera.scrollX);
    camera.scrollY = Math.round(camera.scrollY);
  }

  update(_time: number, delta: number) {
    if (!this.worldReady || !this.player) return;

    const body  = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    this.updateOreDrops(delta);

    if (this.settingsMenu.isOpen() || this.inventoryPanel.isOpen()) {
      body.setVelocityX(0);
      this.pointerMining = false;
      this.clearBreakTarget();
      this.updateCoordinatesText();
      this.audioManager.updateMusic({
        depth: Math.floor(this.player.y / TILE_SIZE),
        surfaceTile: this.getSurfaceTileForMusic(grounded),
      }, delta);
      this.snapCameraToPixels();
      return;
    }

    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump  =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (left) {
      body.setVelocityX(-PLAYER_SPEED);
    } else if (right) {
      body.setVelocityX(PLAYER_SPEED);
    } else {
      body.setVelocityX(0);
    }

    if (jump && body.blocked.down) {
      body.setVelocityY(PLAYER_JUMP_VEL);
      this.audioManager.playJump(this.player.x, this.player.x);
    }

    if (this.pointerMining && this.settings.holdToMine) {
      this.handleDig(this.input.activePointer);
    }

    this.updateBreaking(delta);

    this.snapCameraToPixels();
    this.updateViewport();
    this.updateCoordinatesText();
    this.audioManager.updateMusic({
      depth: Math.floor(this.player.y / TILE_SIZE),
      surfaceTile: this.getSurfaceTileForMusic(grounded),
    }, delta);

    const landed = !this.wasGrounded && grounded && body.velocity.y >= 0;
    if (landed) {
      this.audioManager.playLand(this.player.x, this.player.x, Math.abs(body.velocity.y));
    }
    this.wasGrounded = grounded;

    this.moveTimer += delta;
    if (this.moveTimer >= MOVE_INTERVAL) {
      this.socket.emit("player:move", {
        x: this.player.x,
        y: this.player.y,
        flipX: false,
      });
      this.moveTimer = 0;
    }
  }
}

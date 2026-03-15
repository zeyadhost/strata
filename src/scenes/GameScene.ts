import Phaser from "phaser";
import { ProceduralAudioManager } from "../ProceduralAudioManager";
import { createEmptyInventoryState, INVENTORY_KEYS, InventoryKey, InventoryState, OreCollectedPayload, OreDropPayload, PlayerUpdatePayload, TileDestroyedPayload, TileType, WorldInitPayload } from "../types";
import { loadSettings, saveSettings, type GameSettings } from "../settings";
import { InventoryPanel } from "../ui/InventoryPanel";
import { HotbarPanel, type HotbarSlotKey } from "../ui/HotbarPanel";
import { SettingsMenu } from "../ui/SettingsMenu";
import { DEFAULT_PRIMARY_PICKAXE, PICKAXE_DEFINITIONS, PICKAXE_LIST, type PickaxeId } from "../constants/pickaxes";
import { NetworkManager } from "../network/NetworkManager";
import { ShopPanel } from "../ui/ShopPanel";
import { StorageManager } from "../state/StorageManager";
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
const DIG_RANGE     = 2;
const CURSOR_DEFAULT = "url('cursors/cursor-24.png') 1 1, auto";
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

const PICKAXE_TEXTURE_KEY = "pickaxe_equipped";
const PICKAXE_DEPTH = 11;
const PICKAXE_SIZE = 20;
const PICKAXE_OFFSET_X = 9;
const PICKAXE_OFFSET_Y = 2;
const PICKAXE_IDLE_ANGLE = 25;

const PLAYER_ANIM_IDLE = "player_idle";
const PLAYER_ANIM_WALK = "player_walk";
const PLAYER_ANIM_JUMP = "player_jump";
const PLAYER_ANIM_FALL = "player_fall";
const PLAYER_ANIM_MINE = "player_mine";

interface PickaxeTransform {
  x: number;
  y: number;
  angle: number;
}

interface AccessoryTransform {
  x: number;
  y: number;
  angle: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
}

const MINE_ANIM_OFFSETS: Record<number, PickaxeTransform> = {
  1: { x: 5, y: -14, angle: 101 },
  2: { x: 6.5, y: -10.5, angle: 144 },
};

const WALK_ANIM_OFFSETS: Record<number, PickaxeTransform> = {
  1: { x: 3, y: -12.5, angle: 101 },
  2: { x: 4, y: -6.5, angle: 113 },
  3: { x: 7.5, y: -7.5, angle: 143 },
  4: { x: 4, y: -6.5, angle: 119 },
};

const IDLE_ANIM_OFFSETS: Record<number, PickaxeTransform> = {
  1: { x: 6, y: -11.5, angle: 77 },
  2: { x: 6, y: -10.5, angle: 80 },
  3: { x: 5.5, y: -8.5, angle: 83 },
  4: { x: 5.5, y: -10.5, angle: 72 },
};

const JUMP_ANIM_OFFSETS: Record<number, PickaxeTransform> = {
  1: { x: 5.5, y: -10, angle: 76 },
  2: { x: 5.5, y: -14.5, angle: 76 },
  3: { x: 5.5, y: -14.5, angle: 81 },
};

const FALL_ANIM_OFFSETS: Record<number, PickaxeTransform> = {
  1: { x: 7, y: -24, angle: 69 },
  2: { x: 6, y: -25, angle: 69 },
};

const ACCESSORY_IDLE_OFFSETS: Record<number, AccessoryTransform> = {
  1: { x: 3.5, y: -26.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  2: { x: 3.5, y: -22.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  3: { x: 3.5, y: -22.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  4: { x: 3.5, y: -24.0, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
};

const ACCESSORY_MINE_OFFSETS: Record<number, AccessoryTransform> = {
  1: { x: 3.5, y: -26.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  2: { x: 3.5, y: -23.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
};

const ACCESSORY_WALK_OFFSETS: Record<number, AccessoryTransform> = {
  1: { x: 3.5, y: -26.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  2: { x: 3.5, y: -24.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  3: { x: 3.5, y: -26.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  4: { x: 3.5, y: -24, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
};

const ACCESSORY_JUMP_OFFSETS: Record<number, AccessoryTransform> = {
  1: { x: 3.5, y: -23.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  2: { x: 3.5, y: -28.5, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  3: { x: 3.5, y: -30, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
};

const ACCESSORY_FALL_OFFSETS: Record<number, AccessoryTransform> = {
  1: { x: 4, y: -27, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
  2: { x: 4, y: -27, angle: 0, originX: 0.75, originY: 0.75, width: 14, height: 6 },
};

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
    if (x0 === x1 && y0 === y1) break;
    const doubledError = error * 2;
    if (doubledError > -deltaY) { error -= deltaY; x0 += stepX; }
    if (doubledError < deltaX) { error += deltaX; y0 += stepY; }
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
  return `gems/${item}.png`;
}

interface RemotePlayer {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  pickaxeSprite: Phaser.GameObjects.Image;
  accessorySprite: Phaser.GameObjects.Image;
  facingLeft: boolean;
  activeHotbarSlot: string;
}

export class GameScene extends Phaser.Scene {
  private tiles: number[][] = [];
  private spawnX = 0;
  private spawnY = 0;
  private settings: GameSettings = loadSettings();
  private worldReady = false;
  private pendingInit: WorldInitPayload | null = null;
  private saveData: any = null;

  private player!: Phaser.GameObjects.Sprite;
  private remotePlayers = new Map<string, RemotePlayer>();
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

  private pointerMining = false;
  private wasGrounded = false;
  private loadingText!: Phaser.GameObjects.Text;
  private coordsText!: HTMLDivElement;
  private lobbyCodeText!: HTMLDivElement;
  private networkManager: NetworkManager | null = null;
  private inventoryPanel!: InventoryPanel;
  private shopPanel!: ShopPanel;
  private hotbarPanel!: HotbarPanel;
  private activeHotbarSlot: HotbarSlotKey = "main-pickaxe";
  private breakTarget: BreakTarget | null = null;
  private breakElapsedMs = 0;
  private breakEffect!: Phaser.GameObjects.Image;
  private breakEffectStage = -1;
  private pendingDigTiles = new Set<number>();
  private oreDrops = new Map<string, OreDropState>();
  private pickaxeSprite: Phaser.GameObjects.Image | null = null;
  private pickaxeBaseScale = 1;
  private accessorySprite: Phaser.GameObjects.Image | null = null;
  private facingLeft = false;
  private nextOreDropId = 1;
  private inventory: InventoryState = createEmptyInventoryState();

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { worldInit: WorldInitPayload | null; isHost: boolean; networkManager: NetworkManager; saveData: any }) {
    this.pendingInit = data.worldInit ?? null;
    this.networkManager = data.networkManager;
    this.saveData = data.saveData;
  }

  preload() {
    this.load.image("tile_grass", "tiles/grass.png");
    this.load.image("tile_dirt", "tiles/dirt.png");
    this.load.image("tile_stone", "tiles/stone.png");
    this.load.image(DIRT_STONE_TRANSITION_TEXTURE, "tiles/dirt_stone_transition.png");
    this.load.image("ore_coal", "ores/coal.png");
    this.load.image("ore_copper", "ores/copper.png");
    this.load.image("ore_iron", "ores/iron.png");
    this.load.image("ore_silver", "ores/silver.png");
    this.load.image("ore_gold", "ores/gold.png");
    this.load.image("ore_emerald", "ores/emerald.png");
    this.load.image("ore_sapphire", "ores/sapphire.png");
    this.load.image("ore_diamond", "ores/diamond.png");
    for (const key of INVENTORY_KEYS) {
      this.load.image(gemTextureKey(key), gemAssetPath(key));
    }
    this.load.image(PICKAXE_TEXTURE_KEY, DEFAULT_PRIMARY_PICKAXE.texture);
    for (const p of PICKAXE_LIST) {
      this.load.image(`pickaxe_tex_${p.id}`, p.texture);
    }
    this.load.image("accessory_miner_hat", "accessory/miner_hat.png");
  }

  create() {
    this.tileGroup = this.physics.add.staticGroup();
    this.input.setDefaultCursor(CURSOR_DEFAULT);
    this.audioManager = new ProceduralAudioManager(this.settings);
    this.ensureBreakTextureAtlas();
    this.loadPlayerGifs();

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

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);

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
      lineHeight: "1.4",
      color: "#f7f1d5",
      background: "rgba(11, 16, 32, 0.85)",
      padding: `${HUD_BASE_PADDING_Y * 2}px ${HUD_BASE_PADDING_X * 2}px`,
      textTransform: "uppercase",
      whiteSpace: "pre",
      imageRendering: "pixelated",
      display: this.settings.showCoordinates ? "flex" : "none",
      flexDirection: "column",
      gap: "2px",
      borderRadius: "2px",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.coordsText);

    const coordsLine = document.createElement("div");
    coordsLine.className = "coords-line";
    this.coordsText.appendChild(coordsLine);

    this.lobbyCodeText = document.createElement("div");
    this.lobbyCodeText.className = "strata-lobby-code";
    Object.assign(this.lobbyCodeText.style, {
      pointerEvents: "auto",
      cursor: "pointer",
      color: "#00ff88",
      display: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    this.lobbyCodeText.title = "Click to copy invite code";
    this.lobbyCodeText.onclick = () => {
      if (this.networkManager?.lobbyCode) {
        navigator.clipboard.writeText(this.networkManager.lobbyCode);
        const oldText = this.lobbyCodeText.innerText;
        this.lobbyCodeText.innerText = "LOBBY: COPIED!";
        setTimeout(() => (this.lobbyCodeText.innerText = oldText), 1000);
      }
    };
    this.coordsText.appendChild(this.lobbyCodeText);

    if (this.networkManager) {
      if (this.networkManager.lobbyCode) {
        this.lobbyCodeText.innerText = `LOBBY: ${this.networkManager.lobbyCode}`;
        this.lobbyCodeText.style.display = "block";
        this.coordsText.style.display = "flex";
      }

      this.networkManager.onConnect((peerId) => {
        if (!this.networkManager?.isHost()) {
          this.networkManager?.send("CLIENT_READY", { saveData: this.saveData }, peerId);
        }
      });

      this.networkManager.onData((payload, fromId) => {
        if (payload.type === "CLIENT_READY") {
          if (this.networkManager?.isHost() && this.worldReady) {
            this.networkManager.send("WORLD_INIT", {
              tiles: this.tiles,
              spawnX: this.spawnX,
              spawnY: this.spawnY,
              players: [], 
              inventory: createEmptyInventoryState(),
            }, fromId);
          }
        } else if (payload.type === "WORLD_INIT") {
          this.applyWorldInit(payload.data);
        } else if (payload.type === "PLAYER_UPDATE") {
          this.updateRemotePlayer(payload.data as PlayerUpdatePayload);
        } else if (payload.type === "TILE_DESTROYED") {
          const { tx, ty } = payload.data as TileDestroyedPayload;
          this.remoteTileDestroyed(tx, ty);
        }
      });

      if (!this.networkManager.isHost()) {
        setTimeout(() => { if (!this.worldReady) this.networkManager?.send("CLIENT_READY", {}, this.networkManager.lobbyCode!); }, 500);
      }
    }

    this.breakEffect = this.add.image(0, 0, BREAK_TEXTURE_KEY, breakFrameKey(0));
    this.breakEffect.setOrigin(0).setDepth(BREAK_EFFECT_DEPTH).setAlpha(0.9).setVisible(false);

    this.shopPanel = new ShopPanel({
      onBuy: (pickaxeId, cost) => {
        this.saveData.coins -= cost;
        this.saveData.unlockedPickaxes.push(pickaxeId);
        StorageManager.save(this.saveData);
        this.shopPanel.updateState(this.saveData);
      },
      onEquip: (pickaxeId) => {
        this.saveData.equippedPickaxe = pickaxeId;
        StorageManager.save(this.saveData);
        this.shopPanel.updateState(this.saveData);
        
        const pickDef = PICKAXE_DEFINITIONS[pickaxeId];
        if (pickDef) {
          this.hotbarPanel.setSlotVisual("main-pickaxe", {
            title: pickDef.shortName,
            accentColor: pickDef.accentColor,
            compact: true,
            icon: pickDef.texture,
          });
          this.pickaxeSprite?.setTexture(`pickaxe_tex_${pickaxeId}`);
        }
      }
    });

    const ORE_SELL_PRICES: Record<string, number> = {
      coal: 2, copper: 5, iron: 15, silver: 30, gold: 50, emerald: 100, sapphire: 250, diamond: 1000,
    };

    this.inventoryPanel = new InventoryPanel({
      onVisibilityChange: (isOpen) => {
        this.hotbarPanel?.setActiveSlot(isOpen ? "inventory" : this.activeHotbarSlot);
      },
      onSellOres: () => {
        let totalCoinsGained = 0;
        for (const key of INVENTORY_KEYS) {
          const amount = this.inventory[key];
          if (amount > 0) {
            totalCoinsGained += amount * ORE_SELL_PRICES[key];
            this.inventory[key] = 0;
          }
        }
        if (totalCoinsGained > 0) {
          this.saveData.coins += totalCoinsGained;
          this.saveData.inventory = { ...this.inventory };
          StorageManager.save(this.saveData);
          this.inventoryPanel.setInventory(this.inventory);
          if (this.shopPanel.isOpen()) {
            this.shopPanel.updateState(this.saveData);
          }
        }
      }
    });
    this.inventoryPanel.setInventory(this.inventory);
    this.hotbarPanel = new HotbarPanel({ onSelect: (slot) => this.handleHotbarSelect(slot) });
    const equippedP = this.saveData?.equippedPickaxe ? PICKAXE_DEFINITIONS[this.saveData.equippedPickaxe as PickaxeId] : DEFAULT_PRIMARY_PICKAXE;
    this.hotbarPanel.setSlotVisual("main-pickaxe", {
      title: equippedP?.shortName || DEFAULT_PRIMARY_PICKAXE.shortName,
      accentColor: equippedP?.accentColor || DEFAULT_PRIMARY_PICKAXE.accentColor,
      compact: true,
      icon: equippedP?.texture || DEFAULT_PRIMARY_PICKAXE.texture,
    });
    this.hotbarPanel.setSlotVisual("secondary-pickaxe", { title: "Empty", accentColor: "#5f6674", compact: true });
    this.hotbarPanel.setActiveSlot(this.activeHotbarSlot);

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("gameout", this.onPointerUp, this);
    this.input.keyboard?.on("keydown", this.onAnyKeyDown, this);

    this.settingsMenu = new SettingsMenu(this.settings, {
      onApply: (settings) => { saveSettings(settings); this.applySettings(settings); },
    });

    this.applySettings(this.settings);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onAnyKeyDown, this);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
      this.audioManager.destroy(); this.settingsMenu.destroy(); this.coordsText.remove();
      this.inventoryPanel.destroy(); this.hotbarPanel.destroy(); this.shopPanel.destroy(); this.clearOreDrops();
      this.breakEffect.destroy(); this.pickaxeSprite?.destroy(); this.accessorySprite?.destroy();
    });

    if (this.pendingInit) { this.applyWorldInit(this.pendingInit); this.pendingInit = null; }
  }

  private async loadGifIntoTexture(url: string, textureKey: string, animKey: string, frameRate: number) {
    if (typeof ImageDecoder === "undefined") {
      this.load.image(textureKey, url);
      this.load.start();
      return;
    }
    const response = await fetch(url);
    const decoder = new ImageDecoder({ data: response.body!, type: "image/gif" });
    await decoder.completed;
    const frameCount = decoder.tracks.selectedTrack!.frameCount;
    const firstFrame = await decoder.decode({ frameIndex: 0 });
    const fw = firstFrame.image.displayWidth;
    const fh = firstFrame.image.displayHeight;
    const canvas = document.createElement("canvas");
    canvas.width = fw * frameCount; canvas.height = fh;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < frameCount; i++) {
      const result = await decoder.decode({ frameIndex: i });
      ctx.drawImage(result.image, i * fw, 0);
      result.image.close();
    }
    const texture = this.textures.addCanvas(textureKey, canvas);
    if (!texture) return;
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      const frameName = `${textureKey}_frame_${i}`;
      texture.add(frameName, 0, i * fw, 0, fw, fh);
      frames.push({ key: textureKey, frame: frameName });
    }
    this.anims.create({ key: animKey, frames, frameRate, repeat: -1 });
    decoder.close();
  }

  private loadPlayerGifs() {
    this.loadGifIntoTexture("player/idle.gif", "tex_player_idle", PLAYER_ANIM_IDLE, 8);
    this.loadGifIntoTexture("player/walk.gif", "tex_player_walk", PLAYER_ANIM_WALK, 12);
    this.loadGifIntoTexture("player/jump.gif", "tex_player_jump", PLAYER_ANIM_JUMP, 10);
    this.loadGifIntoTexture("player/fall.gif", "tex_player_fall", PLAYER_ANIM_FALL, 10);
    this.loadGifIntoTexture("player/mine.gif", "tex_player_mine", PLAYER_ANIM_MINE, 10);
  }

  private applyWorldInit(payload: WorldInitPayload) {
    console.log("[GameScene] Applying world initialization");
    this.tiles = payload.tiles;
    this.spawnX = payload.spawnX;
    this.spawnY = payload.spawnY;
    this.inventory = { ...payload.inventory };
    this.pendingDigTiles.clear();
    this.clearBreakTarget();
    this.clearOreDrops();

    if (this.loadingText) {
      this.loadingText.destroy();
    }
    this.initPlayer();
    this.inventoryPanel.setInventory(this.inventory);
    this.worldReady = true;
  }

  private createWorldBarriers() {
    const W = WORLD_WIDTH * TILE_SIZE, H = WORLD_HEIGHT * TILE_SIZE, T = 32;
    const walls = this.physics.add.staticGroup();
    const rects = [
      { x: -T / 2, y: H / 2, w: T, h: H }, { x: W + T / 2, y: H / 2, w: T, h: H },
      { x: W / 2, y: H + T / 2, w: W, h: T }, { x: W / 2, y: -T / 2, w: W, h: T },
    ];
    for (const r of rects) {
      const zone = this.add.zone(r.x, r.y, r.w, r.h);
      this.physics.add.existing(zone, true);
      walls.add(zone);
    }
    this.physics.add.collider(this.player, walls);
  }

  private initPlayer() {
    this.player = this.add.sprite(this.spawnX + PLAYER_WIDTH / 2, this.spawnY + PLAYER_HEIGHT / 2, "tex_player_idle", 0);
    this.player.setDepth(10).setOrigin(0.5, 1.0);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY_WIDTH, PLAYER_HEIGHT);
    body.setOffset((16 - PLAYER_BODY_WIDTH) * 0.5, 32 - PLAYER_HEIGHT);
    body.setCollideWorldBounds(false);
    this.wasGrounded = false;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.physics.add.collider(this.player, this.tileGroup);
    this.createWorldBarriers();
    this.applySettings(this.settings);
    this.initPickaxe(); this.initAccessory();
    this.updateViewport(true);
  }

  private applySettings(settings: GameSettings) {
    this.settings = { ...settings };
    this.audioManager?.setSettings(this.settings);
    this.settingsMenu?.setSettings(this.settings);
    this.sound.setVolume(this.settings.masterVolume / 100);
    this.cameras.main.setZoom(this.settings.fov);
    this.cameras.main.setRoundPixels(this.settings.pixelSnap);
    if (this.coordsText) this.coordsText.style.display = this.settings.showCoordinates ? "flex" : "none";
    this.updateHudLayout(); this.updateCoordinatesText();
  }

  private spawnOreDrop(payload: OreDropPayload) {
    this.destroyOreDrop(payload.dropId);
    const centerX = payload.x * TILE_SIZE + TILE_SIZE / 2, centerY = payload.y * TILE_SIZE + TILE_SIZE / 2;
    const spreadSeed = Array.from(payload.dropId).reduce((total, char) => total + char.charCodeAt(0), 0);
    const offsetX = ((spreadSeed % 7) - 3) * 1.25, offsetY = (((spreadSeed >> 3) % 5) - 2) * 0.9;
    const sprite = this.add.image(centerX + offsetX, centerY + offsetY, gemTextureKey(payload.item));
    sprite.setDisplaySize(ORE_DROP_SIZE, ORE_DROP_SIZE).setDepth(ORE_DROP_DEPTH);
    const bobTween = this.tweens.add({ targets: sprite, y: sprite.y - 3, duration: 620 + (spreadSeed % 5) * 40, ease: "Sine.InOut", yoyo: true, repeat: -1 });
    this.oreDrops.set(payload.dropId, { payload, sprite, bobTween, collecting: false });
  }

  private destroyOreDrop(dropId: string) {
    const drop = this.oreDrops.get(dropId); if (!drop) return;
    drop.bobTween?.stop(); drop.sprite.destroy(); this.oreDrops.delete(dropId);
  }

  private clearOreDrops() { for (const dropId of this.oreDrops.keys()) this.destroyOreDrop(dropId); }

  private updateOreDrops(delta: number) {
    if (!this.player || this.oreDrops.size === 0) return;
    const targetX = this.player.x, targetY = this.player.y - PLAYER_HEIGHT * 0.25, deltaSeconds = delta / 1000;
    for (const drop of this.oreDrops.values()) {
      if (drop.collecting) continue;
      const dx = targetX - drop.sprite.x, dy = targetY - drop.sprite.y, distance = Math.hypot(dx, dy);
      if (distance > ORE_MAGNET_RADIUS) continue;
      if (drop.bobTween) { drop.bobTween.stop(); drop.bobTween = null; }
      const pullStrength = ORE_MAGNET_BASE_SPEED + (ORE_MAGNET_RADIUS - distance) * ORE_MAGNET_SPEED_GAIN;
      const step = Math.min(pullStrength * deltaSeconds, distance);
      if (distance > 0.001) { drop.sprite.x += (dx / distance) * step; drop.sprite.y += (dy / distance) * step; }
      if (distance <= ORE_COLLECT_RADIUS) { drop.collecting = true; drop.sprite.setVisible(false); this.collectOreDrop(drop.payload); }
    }
  }

  private collectOreDrop(drop: OreDropPayload) {
    this.inventory[drop.item] += 1; this.inventoryPanel.setInventory(this.inventory);
    this.handleOreCollected({ dropId: drop.dropId, item: drop.item, amount: 1, x: drop.x, y: drop.y });
  }

  private getInventoryKeyForTile(tileType: TileType): InventoryKey | null {
    const map: Record<number, InventoryKey> = { [TileType.COAL]: "coal", [TileType.COPPER]: "copper", [TileType.IRON]: "iron", [TileType.SILVER]: "silver", [TileType.GOLD]: "gold", [TileType.EMERALD]: "emerald", [TileType.SAPPHIRE]: "sapphire", [TileType.DIAMOND]: "diamond" };
    return map[tileType] || null;
  }

  private handleOreCollected(payload: OreCollectedPayload) {
    const drop = this.oreDrops.get(payload.dropId);
    if (drop) { this.playOreCollectFlight(drop.payload.item, drop.sprite.x, drop.sprite.y); this.destroyOreDrop(payload.dropId); }
    this.showOrePickupText(payload);
  }

  private playOreCollectFlight(item: InventoryKey, worldX: number, worldY: number) {
    const slotRect = this.hotbarPanel.getSlotRect("inventory"); if (!slotRect) return;
    const canvasRect = this.game.canvas.getBoundingClientRect(), camera = this.cameras.main, zoom = camera.zoom;
    const startX = canvasRect.left + (worldX - camera.worldView.x) * zoom - ORE_FLIGHT_SIZE / 2;
    const startY = canvasRect.top + (worldY - camera.worldView.y) * zoom - ORE_FLIGHT_SIZE / 2;
    const targetX = slotRect.left + slotRect.width / 2 - ORE_FLIGHT_SIZE / 2, targetY = slotRect.top + slotRect.height / 2 - ORE_FLIGHT_SIZE / 2;
    const element = document.createElement("img"); element.src = gemAssetPath(item);
    Object.assign(element.style, { position: "fixed", left: `${startX}px`, top: `${startY}px`, width: `${ORE_FLIGHT_SIZE}px`, height: `${ORE_FLIGHT_SIZE}px`, pointerEvents: "none", zIndex: "980", imageRendering: "pixelated", transform: "translate3d(0, 0, 0) scale(1)", opacity: "1", transition: `transform ${ORE_FLIGHT_DURATION_MS}ms cubic-bezier(0.18, 0.88, 0.24, 1), opacity ${ORE_FLIGHT_DURATION_MS}ms ease-out`, filter: "drop-shadow(0 3px 0 rgba(4, 10, 23, 0.55))" });
    document.body.appendChild(element);
    requestAnimationFrame(() => { element.style.transform = `translate3d(${targetX - startX}px, ${targetY - startY}px, 0) scale(0.42)`; element.style.opacity = "0.72"; });
    setTimeout(() => { element.remove(); this.hotbarPanel.pulseSlot("inventory"); }, ORE_FLIGHT_DURATION_MS + 20);
  }

  private pickaxeAngle(angle: number) { return this.facingLeft ? -angle : angle; }
  private hasEquippedPickaxe() { return this.activeHotbarSlot === "main-pickaxe"; }
  private syncHeldPickaxeVisibility() { if (this.pickaxeSprite) this.pickaxeSprite.setVisible(this.hasEquippedPickaxe()); }

  private initPickaxe() {
    this.pickaxeSprite?.destroy();
    let textureToUse = PICKAXE_TEXTURE_KEY;
    if (this.saveData?.equippedPickaxe) {
       textureToUse = `pickaxe_tex_${this.saveData.equippedPickaxe}`;
    }
    this.pickaxeSprite = this.add.image(this.player.x, this.player.y, textureToUse);
    this.pickaxeSprite.setDisplaySize(PICKAXE_SIZE, PICKAXE_SIZE).setDepth(PICKAXE_DEPTH).setOrigin(0.75, 0.75).setAngle(this.pickaxeAngle(PICKAXE_IDLE_ANGLE));
    this.pickaxeBaseScale = this.pickaxeSprite.scaleX; this.syncHeldPickaxeVisibility();
  }

  private updatePickaxe() {
    if (!this.pickaxeSprite || !this.player || !this.hasEquippedPickaxe()) { if (this.pickaxeSprite) this.pickaxeSprite.setVisible(false); return; }
    this.pickaxeSprite.setVisible(true);
    const animKey = this.player.anims.currentAnim?.key, frameIndex = this.player.anims.currentFrame?.index || 1;
    let t: PickaxeTransform = { x: PICKAXE_OFFSET_X, y: PICKAXE_OFFSET_Y, angle: PICKAXE_IDLE_ANGLE };
    if (animKey === PLAYER_ANIM_MINE) t = MINE_ANIM_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_WALK) t = WALK_ANIM_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_IDLE) t = IDLE_ANIM_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_JUMP) t = JUMP_ANIM_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_FALL) t = FALL_ANIM_OFFSETS[frameIndex] || t;
    const sideX = this.facingLeft ? -t.x : t.x;
    this.pickaxeSprite.setPosition(this.player.x + sideX, this.player.y + t.y);
    this.pickaxeSprite.scaleX = this.facingLeft ? -this.pickaxeBaseScale : this.pickaxeBaseScale;
    this.pickaxeSprite.setAngle(this.pickaxeAngle(t.angle));
  }

  private initAccessory() {
    this.accessorySprite?.destroy();
    this.accessorySprite = this.add.image(this.player.x, this.player.y, "accessory_miner_hat");
    this.accessorySprite.setDepth(11).setVisible(true);
  }

  private updateAccessory() {
    if (!this.accessorySprite || !this.player) return;
    const animKey = this.player.anims.currentAnim?.key, frameIndex = this.player.anims.currentFrame?.index || 1;
    let t = ACCESSORY_IDLE_OFFSETS[frameIndex] || ACCESSORY_IDLE_OFFSETS[1];
    if (animKey === PLAYER_ANIM_MINE) t = ACCESSORY_MINE_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_WALK) t = ACCESSORY_WALK_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_JUMP) t = ACCESSORY_JUMP_OFFSETS[frameIndex] || t;
    else if (animKey === PLAYER_ANIM_FALL) t = ACCESSORY_FALL_OFFSETS[frameIndex] || t;
    const sideX = this.facingLeft ? -t.x : t.x;
    this.accessorySprite.setPosition(this.player.x + sideX, this.player.y + t.y).setDisplaySize(t.width, t.height).setOrigin(t.originX, t.originY).setAngle(this.facingLeft ? -t.angle : t.angle);
    this.accessorySprite.scaleX = Math.abs(this.accessorySprite.scaleX) * (this.facingLeft ? -1 : 1);
  }

  private invalidateTileSprite(tx: number, ty: number) {
    const key = ty * WORLD_WIDTH + tx, sprite = this.tileSprites.get(key); if (!sprite) return;
    this.tileGroup.remove(sprite, true, true); this.tileSprites.delete(key);
    this.tileGlows.get(key)?.destroy(); this.tileGlows.delete(key);
  }

  private invalidateTileNeighborhood(tx: number, ty: number) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.invalidateTileSprite(tx + dx, ty + dy);
  }

  private isSolidTile(tx: number, ty: number) { return this.tiles[ty]?.[tx] !== undefined && this.tiles[ty][tx] !== TileType.AIR; }

  private getTileTextureConfig(tx: number, ty: number, tileType: TileType): TileRenderConfig | null {
    if (tileType === TileType.GRASS && this.isSolidTile(tx - 1, ty - 1) && this.isSolidTile(tx + 1, ty - 1)) return { textureKey: TILE_TEXTURE[TileType.DIRT] };
    if (tileType === TileType.STONE && ty === LAYER_SHALLOW) return { textureKey: DIRT_STONE_TRANSITION_TEXTURE, rotation: 90 };
    return TILE_TEXTURE[tileType] ? { textureKey: TILE_TEXTURE[tileType] } : null;
  }

  private updateViewport(force = false) {
    if (!this.player) return;
    const cam = this.cameras.main;
    const vl = Math.max(0, Math.floor(cam.worldView.left / TILE_SIZE) - RENDER_BUFFER);
    const vr = Math.min(WORLD_WIDTH, Math.ceil(cam.worldView.right / TILE_SIZE) + RENDER_BUFFER);
    const vt = Math.max(0, Math.floor(cam.worldView.top / TILE_SIZE) - RENDER_BUFFER);
    const vb = Math.min(WORLD_HEIGHT, Math.ceil(cam.worldView.bottom / TILE_SIZE) + RENDER_BUFFER);
    if (!force && vl === this.lastViewLeft && vt === this.lastViewTop) return;
    this.lastViewLeft = vl; this.lastViewTop = vt;
    for (const [key, sprite] of this.tileSprites) {
      const tx = key % WORLD_WIDTH, ty = Math.floor(key / WORLD_WIDTH);
      if (tx < vl || tx >= vr || ty < vt || ty >= vb) { this.tileGroup.remove(sprite, true, true); this.tileSprites.delete(key); this.tileGlows.get(key)?.destroy(); this.tileGlows.delete(key); }
    }
    for (let ty = vt; ty < vb; ty++) {
      for (let tx = vl; tx < vr; tx++) {
        const type = this.tiles[ty]?.[tx]; if (!type || type === TileType.AIR || this.tileSprites.has(ty * WORLD_WIDTH + tx)) continue;
        const config = this.getTileTextureConfig(tx, ty, type); if (!config) continue;
        const px = tx * TILE_SIZE + TILE_SIZE / 2, py = ty * TILE_SIZE + TILE_SIZE / 2;
        const sprite = this.physics.add.staticImage(px, py, config.textureKey); if (config.rotation) sprite.setAngle(config.rotation);
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE); const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(TILE_SIZE, TILE_SIZE).position.set(px - TILE_SIZE / 2, py - TILE_SIZE / 2); body.updateCenter();
        this.tileGroup.add(sprite); this.tileSprites.set(ty * WORLD_WIDTH + tx, sprite);
        const glowColor = ORE_GLOW[type]; if (glowColor != null) { const glow = this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE).setStrokeStyle(2, glowColor, 0.6).setFillStyle(glowColor, 0.08).setDepth(sprite.depth + 1); this.tileGlows.set(ty * WORLD_WIDTH + tx, glow); }
      }
    }
  }

  private handleDig(pointer: Phaser.Input.Pointer) {
    if (!this.hasEquippedPickaxe()) { this.clearBreakTarget(); return; }
    const target = this.getDigTarget(pointer); if (!target) { this.clearBreakTarget(); return; }
    if (this.breakTarget?.x === target.x && this.breakTarget?.y === target.y) return;
    this.breakTarget = target; this.breakElapsedMs = 0; this.breakEffectStage = -1; this.updateBreakEffectStage(0);
    this.audioManager.playDigHit(target.x * TILE_SIZE + TILE_SIZE / 2, this.player.x, 0); this.spawnBreakParticles(target, 3, 0.45);
  }

  private ensureBreakTextureAtlas() {
    if (this.textures.exists(BREAK_TEXTURE_KEY)) return;
    const canvas = document.createElement("canvas"); canvas.width = TILE_SIZE * BREAK_STAGE_COUNT; canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d")!; ctx.imageSmoothingEnabled = false;
    for (let s = 0; s < BREAK_STAGE_COUNT; s++) {
      const bx = s * TILE_SIZE; ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + s * 0.011})`; ctx.fillRect(bx, 0, TILE_SIZE, TILE_SIZE);
      const sc = `rgba(16, 22, 36, ${0.22 + s * 0.045})`, hc = `rgba(244, 246, 255, ${0.24 + s * 0.06})`;
      for (let i = 0; i < BREAK_STAGE_PATH_COUNTS[s]; i++) {
        const p = BREAK_CRACK_PATHS[i]; for (let j = 0; j < p.length - 1; j++) { drawBreakLine(ctx, bx, [p[j][0] + 1, p[j][1] + 1], [p[j + 1][0] + 1, p[j + 1][1] + 1], sc); drawBreakLine(ctx, bx, [p[j][0], p[j][1]], [p[j + 1][0], p[j + 1][1]], hc); }
      }
    }
    const tex = this.textures.addCanvas(BREAK_TEXTURE_KEY, canvas)!;
    for (let s = 0; s < BREAK_STAGE_COUNT; s++) tex.add(breakFrameKey(s), 0, s * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }

  private getDigTarget(pointer: Phaser.Input.Pointer): BreakTarget | null {
    if (!this.worldReady || !this.player) return null;
    return this.getDigTargetAt(Math.floor(pointer.worldX / TILE_SIZE), Math.floor(pointer.worldY / TILE_SIZE));
  }

  private getDigTargetAt(tx: number, ty: number): BreakTarget | null {
    if (!this.worldReady || !this.player || !this.player.body) return null;
    const body = this.player.body as Phaser.Physics.Arcade.Body, ptx = Math.floor(body.center.x / TILE_SIZE), pty = Math.floor(body.center.y / TILE_SIZE);
    if (Math.abs(tx - ptx) > DIG_RANGE || Math.abs(ty - pty) > DIG_RANGE || this.tiles[ty]?.[tx] === TileType.AIR || this.pendingDigTiles.has(ty * WORLD_WIDTH + tx)) return null;
    const type = this.tiles[ty][tx] as TileType; return { x: tx, y: ty, type, durationMs: this.getBreakDuration(type) };
  }

  private onAnyKeyDown(event: KeyboardEvent) {
    this.audioManager.unlock();
    if (event.code === "Digit1") this.handleHotbarSelect("main-pickaxe");
    if (event.code === "Digit2") this.handleHotbarSelect("secondary-pickaxe");
    if (event.code === "Backquote") this.handleHotbarSelect("inventory");
    if (event.code === "KeyB") this.shopPanel.toggle(this.saveData);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.settingsMenu.isOpen() || this.inventoryPanel.isOpen() || this.shopPanel.isOpen()) return;
    this.audioManager.unlock(); this.pointerMining = this.settings.holdToMine; this.handleDig(pointer);
  }

  private onPointerUp() { if (this.settings.holdToMine) { this.pointerMining = false; this.clearBreakTarget(); } }

  private getBreakDuration(type: TileType) {
    const map: Record<number, number> = { [TileType.GRASS]: 180, [TileType.DIRT]: 260, [TileType.STONE]: 520, [TileType.COAL]: 640, [TileType.COPPER]: 700, [TileType.IRON]: 760, [TileType.SILVER]: 820, [TileType.GOLD]: 860, [TileType.EMERALD]: 940, [TileType.SAPPHIRE]: 1020, [TileType.DIAMOND]: 1120 };
    return map[type] || 420;
  }

  private getBreakEffectColor(type: TileType) {
    const map: Record<number, number> = { [TileType.GRASS]: 0xa7d95e, [TileType.DIRT]: 0xb48352, [TileType.STONE]: 0xc8d1e2, [TileType.COAL]: 0x9aa0ad, [TileType.COPPER]: 0xd88a57, [TileType.IRON]: 0xcbd4de, [TileType.SILVER]: 0xe6e8fb, [TileType.GOLD]: 0xffcf5e, [TileType.EMERALD]: 0x3bf4a3, [TileType.SAPPHIRE]: 0x56bcff, [TileType.DIAMOND]: 0x7de5ff };
    return map[type] || 0xf7f1d5;
  }

  private clearBreakTarget() { this.breakTarget = null; this.breakElapsedMs = 0; this.breakEffectStage = -1; this.breakEffect.setVisible(false); }

  private updateBreakEffectStage(progress: number) {
    if (!this.breakTarget) return;
    const stage = Phaser.Math.Clamp(Math.floor(progress * BREAK_STAGE_COUNT), 0, BREAK_STAGE_COUNT - 1);
    this.breakEffect.setPosition(this.breakTarget.x * TILE_SIZE, this.breakTarget.y * TILE_SIZE).setFrame(breakFrameKey(stage)).setTint(this.getBreakEffectColor(this.breakTarget.type)).setVisible(true);
    if (stage > this.breakEffectStage) {
      this.breakEffectStage = stage; if (stage > 0) { this.audioManager.playDigHit(this.breakTarget.x * TILE_SIZE + TILE_SIZE / 2, this.player.x, stage / (BREAK_STAGE_COUNT - 1)); this.spawnBreakParticles(this.breakTarget, 2, 0.35 + stage * 0.08); }
    }
  }

  private spawnBreakParticles(target: BreakTarget, count: number, strength: number) {
    const color = this.getBreakEffectColor(target.type), centerX = target.x * TILE_SIZE + TILE_SIZE / 2, centerY = target.y * TILE_SIZE + TILE_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(2, 4), p = this.add.rectangle(centerX + Phaser.Math.Between(-5, 5), centerY + Phaser.Math.Between(-5, 5), size, size, color, 0.95).setDepth(BREAK_EFFECT_DEPTH + 1);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-14, 14) * strength, y: p.y + Phaser.Math.Between(-18, -6) * strength, alpha: 0, angle: Phaser.Math.Between(-30, 30), ease: "Quad.Out", duration: Phaser.Math.Between(180, 320), onComplete: () => p.destroy() });
    }
  }

  private broadcastLocalState() {
    if (!this.networkManager || !this.player) return;
    this.networkManager.send("PLAYER_UPDATE", { id: this.networkManager.lobbyCode || "local", x: this.player.x, y: this.player.y, anim: this.player.anims.currentAnim?.key || PLAYER_ANIM_IDLE, facingLeft: this.facingLeft, activeHotbarSlot: this.activeHotbarSlot } as PlayerUpdatePayload);
  }

  private createRemotePlayer(id: string) {
    if (this.remotePlayers.has(id)) return;
    const sprite = this.add.sprite(0, 0, "tex_player_idle").setDepth(10).setOrigin(0.5, 1.0);
    const pickaxeSprite = this.add.image(0, 0, PICKAXE_TEXTURE_KEY).setDisplaySize(PICKAXE_SIZE, PICKAXE_SIZE).setDepth(PICKAXE_DEPTH).setOrigin(0.75, 0.75);
    const accessorySprite = this.add.image(0, 0, "accessory_miner_hat").setDepth(11);
    this.remotePlayers.set(id, { id, sprite, pickaxeSprite, accessorySprite, facingLeft: false, activeHotbarSlot: "main-pickaxe" });
  }

  private updateRemotePlayer(payload: PlayerUpdatePayload) {
    if (!this.remotePlayers.has(payload.id)) this.createRemotePlayer(payload.id);
    const rp = this.remotePlayers.get(payload.id)!;
    rp.sprite.setPosition(payload.x, payload.y).setFlipX(payload.facingLeft);
    rp.facingLeft = payload.facingLeft; rp.activeHotbarSlot = payload.activeHotbarSlot;
    if (rp.sprite.anims.currentAnim?.key !== payload.anim) rp.sprite.play(payload.anim, true);
    this.updateRemotePlayerEquipment(rp);
  }

  private updateRemotePlayerEquipment(rp: RemotePlayer) {
    const hasP = rp.activeHotbarSlot === "main-pickaxe"; rp.pickaxeSprite.setVisible(hasP);
    if (hasP) {
      const anim = rp.sprite.anims.currentAnim?.key, frame = rp.sprite.anims.currentFrame?.index || 1;
      let t: PickaxeTransform = { x: PICKAXE_OFFSET_X, y: PICKAXE_OFFSET_Y, angle: PICKAXE_IDLE_ANGLE };
      if (anim === PLAYER_ANIM_MINE) t = MINE_ANIM_OFFSETS[frame] || t;
      else if (anim === PLAYER_ANIM_WALK) t = WALK_ANIM_OFFSETS[frame] || t;
      else if (anim === PLAYER_ANIM_IDLE) t = IDLE_ANIM_OFFSETS[frame] || t;
      else if (anim === PLAYER_ANIM_JUMP) t = JUMP_ANIM_OFFSETS[frame] || t;
      else if (anim === PLAYER_ANIM_FALL) t = FALL_ANIM_OFFSETS[frame] || t;
      rp.pickaxeSprite.setPosition(rp.sprite.x + (rp.facingLeft ? -t.x : t.x), rp.sprite.y + t.y).setAngle(rp.facingLeft ? -t.angle : t.angle);
      rp.pickaxeSprite.scaleX = (rp.facingLeft ? -1 : 1) * this.pickaxeBaseScale;
    }
    const anim = rp.sprite.anims.currentAnim?.key, frame = rp.sprite.anims.currentFrame?.index || 1;
    let t = ACCESSORY_IDLE_OFFSETS[frame] || ACCESSORY_IDLE_OFFSETS[1];
    if (anim === PLAYER_ANIM_MINE) t = ACCESSORY_MINE_OFFSETS[frame] || t;
    else if (anim === PLAYER_ANIM_WALK) t = ACCESSORY_WALK_OFFSETS[frame] || t;
    else if (anim === PLAYER_ANIM_JUMP) t = ACCESSORY_JUMP_OFFSETS[frame] || t;
    else if (anim === PLAYER_ANIM_FALL) t = ACCESSORY_FALL_OFFSETS[frame] || t;
    rp.accessorySprite.setPosition(rp.sprite.x + (rp.facingLeft ? -t.x : t.x), rp.sprite.y + t.y).setDisplaySize(t.width, t.height).setOrigin(t.originX, t.originY).setAngle(rp.facingLeft ? -t.angle : t.angle);
    rp.accessorySprite.scaleX = Math.abs(rp.accessorySprite.scaleX) * (rp.facingLeft ? -1 : 1);
  }

  private remoteTileDestroyed(tx: number, ty: number) {
    if (this.tiles[ty]?.[tx] !== TileType.AIR) {
      const type = this.tiles[ty][tx] as TileType; this.tiles[ty][tx] = TileType.AIR;
      this.invalidateTileNeighborhood(tx, ty); this.lastViewLeft = -999;
      const key = this.getInventoryKeyForTile(type);
      if (key) this.spawnOreDrop({ dropId: `remote-${tx}-${ty}-${Date.now()}`, item: key, x: tx, y: ty });
    }
  }

  private updateBreaking(delta: number) {
    if (!this.breakTarget) return;
    this.breakElapsedMs += delta;
    const progress = Math.min(this.breakElapsedMs / this.breakTarget.durationMs, 1);
    this.updateBreakEffectStage(progress);
    if (progress >= 1) this.completeBreak(this.breakTarget);
  }

  private completeBreak(target: BreakTarget) {
    const tx = target.x;
    const ty = target.y;
    const key = ty * WORLD_WIDTH + tx;
    this.pendingDigTiles.add(key);
    this.audioManager.playDig(target.x * TILE_SIZE + TILE_SIZE / 2, this.player.x);
    this.spawnBreakParticles(target, 8, 1);
    if (this.tiles[ty]?.[tx] !== TileType.AIR) {
      this.tiles[ty][tx] = TileType.AIR;
      this.invalidateTileNeighborhood(tx, ty);
      this.lastViewLeft = -999;
      this.networkManager?.send("TILE_DESTROYED", { tx, ty } as TileDestroyedPayload);
      const invKey = this.getInventoryKeyForTile(target.type);
      if (invKey) this.spawnOreDrop({ dropId: `drop-${this.nextOreDropId++}`, item: invKey, x: tx, y: ty });
    }
    this.pendingDigTiles.delete(key);
    this.clearBreakTarget();
  }

  update(_time: number, delta: number) {
    if (!this.worldReady || !this.player) return;
    this.broadcastLocalState();
    const body = this.player.body as Phaser.Physics.Arcade.Body, grounded = body.blocked.down || body.touching.down;
    this.updateOreDrops(delta);
    if (this.settingsMenu.isOpen() || this.inventoryPanel.isOpen() || this.shopPanel.isOpen()) {
      body.setVelocityX(0); this.pointerMining = false; this.clearBreakTarget(); this.updateCoordinatesText();
      this.audioManager.updateMusic({ depth: Math.floor(this.player.y / TILE_SIZE), surfaceTile: this.getSurfaceTileForMusic(grounded) }, delta);
      this.snapCameraToPixels(); return;
    }
    const left = this.cursors.left.isDown || this.wasd.left.isDown, right = this.cursors.right.isDown || this.wasd.right.isDown, jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up);
    if (left) { this.facingLeft = true; body.setVelocityX(-PLAYER_SPEED); }
    else if (right) { this.facingLeft = false; body.setVelocityX(PLAYER_SPEED); }
    else body.setVelocityX(0);
    if (jump && grounded) { body.setVelocityY(PLAYER_JUMP_VEL); this.audioManager.playJump(this.player.x, this.player.x); }
    if (this.pointerMining && this.settings.holdToMine) this.handleDig(this.input.activePointer);
    this.updateBreaking(delta);
    this.snapCameraToPixels(); this.updateViewport(); this.updateCoordinatesText();
    this.audioManager.updateMusic({ depth: Math.floor(this.player.y / TILE_SIZE), surfaceTile: this.getSurfaceTileForMusic(grounded) }, delta);
    if (!this.wasGrounded && grounded && body.velocity.y >= 0) this.audioManager.playLand(this.player.x, this.player.x, Math.abs(body.velocity.y));
    this.wasGrounded = grounded;
    if (this.anims.exists(PLAYER_ANIM_IDLE)) {
      if (this.breakTarget) this.player.play(PLAYER_ANIM_MINE, true);
      else if (body.velocity.y > 10 && !grounded) this.player.play(PLAYER_ANIM_FALL, true);
      else if (body.velocity.y < -10 && !grounded) this.player.play(PLAYER_ANIM_JUMP, true);
      else if (Math.abs(body.velocity.x) > 0 && grounded) this.player.play(PLAYER_ANIM_WALK, true);
      else if (grounded) this.player.play(PLAYER_ANIM_IDLE, true);
    }
  }

  private onPostUpdate() { if (this.worldReady && this.player) { this.updatePickaxe(); this.updateAccessory(); this.player.setFlipX(this.facingLeft); } }

  private handleHotbarSelect(slot: HotbarSlotKey) {
    if (slot === "inventory") { this.inventoryPanel.toggle(); this.hotbarPanel.setActiveSlot(this.inventoryPanel.isOpen() ? "inventory" : this.activeHotbarSlot); return; }
    this.activeHotbarSlot = slot; if (this.inventoryPanel.isOpen()) this.inventoryPanel.close();
    this.syncHeldPickaxeVisibility(); this.hotbarPanel.setActiveSlot(slot);
  }

  private showOrePickupText(payload: OreCollectedPayload) {
    const t = this.add.text(payload.x * TILE_SIZE + TILE_SIZE / 2, payload.y * TILE_SIZE + TILE_SIZE + 8, `+${payload.amount} ${payload.item.toUpperCase()}`, { fontFamily: "monogram", fontSize: "18px", color: "#f7f1d5", stroke: "#0b1020", strokeThickness: 4 }).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: t, y: t.y - 28, alpha: 1, duration: 180, onComplete: () => this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 550, onComplete: () => t.destroy() }) });
  }

  private updateCoordinatesText() {
    if (!this.player || !this.settings.showCoordinates) return;
    const tx = Math.floor(this.player.x / TILE_SIZE), ty = Math.floor(this.player.y / TILE_SIZE), cl = this.coordsText.querySelector(".coords-line");
    if (cl) cl.textContent = `X ${tx}  Y ${ty}  DEPTH ${ty}`;
  }

  private getSurfaceTileForMusic(grounded: boolean) {
    if (!this.player) return null;
    const tx = Math.floor(this.player.x / TILE_SIZE), fty = Math.floor((this.player.y + PLAYER_HEIGHT * 0.5 + 2) / TILE_SIZE), bty = Math.floor(this.player.y / TILE_SIZE);
    const ts = grounded ? [this.tiles[fty]?.[tx], this.tiles[bty]?.[tx]] : [this.tiles[bty]?.[tx], this.tiles[fty]?.[tx]];
    return ts.find(t => t === TileType.GRASS || t === TileType.DIRT) || null;
  }

  private updateHudLayout() {
    if (!this.coordsText) return;
    const hudScale = Phaser.Math.Linear(0.85, 1.6, (this.settings.fov - HUD_FOV_MIN) / (HUD_FOV_MAX - HUD_FOV_MIN));
    const fs = Math.round(HUD_BASE_FONT_SIZE * hudScale), m = Math.round(HUD_BASE_MARGIN * hudScale), px = Math.round(HUD_BASE_PADDING_X * hudScale), py = Math.round(HUD_BASE_PADDING_Y * hudScale);
    Object.assign(this.coordsText.style, { left: `${m}px`, top: `${m}px`, fontSize: `${fs}px`, padding: `${py}px ${px}px` });
    this.inventoryPanel.setLayout({ fontSize: fs, paddingX: px, paddingY: py });
    this.hotbarPanel.setLayout({ bottom: Math.round(HOTBAR_BASE_BOTTOM * hudScale), fontSize: fs });
  }

  private snapCameraToPixels() { if (this.settings.pixelSnap) { const c = this.cameras.main; c.scrollX = Math.round(c.scrollX); c.scrollY = Math.round(c.scrollY); } }
}

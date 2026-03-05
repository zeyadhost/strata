import Phaser from "phaser";
import { Socket } from "socket.io-client";
import { TileType, TileChange, PlayerState, WorldInitPayload } from "../types";
import {
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  PLAYER_JUMP_VEL,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  TILE_TEXTURE,
} from "../constants/world";

const RENDER_BUFFER = 3;
const DIG_RANGE     = 2;
const MOVE_INTERVAL = 50;

export class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private tiles: number[][] = [];
  private spawnX = 0;
  private spawnY = 0;
  private worldReady = false;
  private pendingInit: WorldInitPayload | null = null;

  private player!: Phaser.Physics.Arcade.Sprite;
  private otherPlayers = new Map<string, Phaser.GameObjects.Rectangle>();

  private tileSprites = new Map<number, Phaser.Physics.Arcade.Image>();
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
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { socket: Socket; worldInit: WorldInitPayload }) {
    this.socket = data.socket;
    this.pendingInit = data.worldInit ?? null;
  }

  preload() {
    this.load.image("tile_grass",  "/tiles/grass.png");
    this.load.image("tile_dirt",   "/tiles/dirt.png");
    this.load.image("tile_stone",  "/tiles/stone.png");
    this.load.image("gem_coal",    "/gems/coal.png");
    this.load.image("gem_emerald", "/gems/emerald.png");
    this.load.image("gem_diamond", "/gems/diamond.png");
  }

  create() {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x44aaff);
    gfx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
    gfx.generateTexture("player", PLAYER_WIDTH, PLAYER_HEIGHT);
    gfx.destroy();

    this.tileGroup = this.physics.add.staticGroup();

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

    this.input.on("pointerdown", this.handleDig, this);

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

      const key    = change.y * WORLD_WIDTH + change.x;
      const sprite = this.tileSprites.get(key);
      if (sprite) {
        this.tileGroup.remove(sprite, true, true);
        this.tileSprites.delete(key);
      }
    });

    this.socket.on("player:joined", (p: PlayerState) => this.spawnOtherPlayer(p));

    this.socket.on("player:state", (p: PlayerState) => {
      const rect = this.otherPlayers.get(p.id);
      if (rect) rect.setPosition(p.x, p.y);
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

    this.loadingText.destroy();
    this.initPlayer();

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
    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, "player");
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.player.setCollideWorldBounds(false);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.physics.add.collider(this.player, this.tileGroup);
    this.createWorldBarriers();

    this.updateViewport(true);
  }

  private spawnOtherPlayer(p: PlayerState) {
    const rect = this.add.rectangle(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, 0xff6644) as Phaser.GameObjects.Rectangle;
    this.otherPlayers.set(p.id, rect);
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
        const textureKey = TILE_TEXTURE[tileType];
        if (!textureKey) continue;
        const px = tx * TILE_SIZE + TILE_SIZE / 2;
        const py = ty * TILE_SIZE + TILE_SIZE / 2;
        const sprite = this.physics.add.staticImage(px, py, textureKey);
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
        sprite.refreshBody();
        this.tileGroup.add(sprite);
        this.tileSprites.set(key, sprite);
      }
    }
  }

  private handleDig(pointer: Phaser.Input.Pointer) {
    if (!this.worldReady || !this.player) return;

    const tx = Math.floor(pointer.worldX / TILE_SIZE);
    const ty = Math.floor(pointer.worldY / TILE_SIZE);

    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);

    const dx = tx - ptx;
    const dy = ty - pty;

    if (dy < 0 && dx === 0) return;
    if (Math.abs(dx) > DIG_RANGE || dy > DIG_RANGE) return;
    if (dy < 0 && Math.abs(dy) > 1) return;
    if (this.tiles[ty]?.[tx] === TileType.AIR) return;

    this.socket.emit("tile:dig", { x: tx, y: ty });
  }

  update(_time: number, delta: number) {
    if (!this.worldReady || !this.player) return;

    const body  = this.player.body as Phaser.Physics.Arcade.Body;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump  =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (left) {
      body.setVelocityX(-PLAYER_SPEED);
      this.player.setFlipX(true);
    } else if (right) {
      body.setVelocityX(PLAYER_SPEED);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    if (jump && body.blocked.down) {
      body.setVelocityY(PLAYER_JUMP_VEL);
    }

    this.updateViewport();

    this.moveTimer += delta;
    if (this.moveTimer >= MOVE_INTERVAL) {
      this.socket.emit("player:move", {
        x: this.player.x,
        y: this.player.y,
        flipX: this.player.flipX,
      });
      this.moveTimer = 0;
    }
  }
}

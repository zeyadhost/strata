import Phaser from "phaser";
import { FONTS } from "../constants/fonts";
import { findSpawn, generateWorld } from "../world/worldGen";
import { NetworkManager } from "../network/NetworkManager";

export class BootScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private networkManager: NetworkManager | null = null;

  private initData!: { isHost: boolean; lobbyCode?: string; saveData: any; isOffline?: boolean };

  constructor() {
    super({ key: "BootScene" });
  }

  init(data: any) {
    this.initData = data;
  }

  async create() {
    this.input.setDefaultCursor("url('cursors/pointer-24.png') 1 1, auto");

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, "STRATA", { fontFamily: FONTS.header, fontSize: "48px", color: "#e0e0e0" })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 20, "Connecting to network...", { fontFamily: FONTS.body, fontSize: "18px", color: "#888888" })
      .setOrigin(0.5);

    this.networkManager = new NetworkManager();

    try {
      if (this.initData.isOffline) {
        this.statusText.setText(`Initializing single-player mode...`);
        this.statusText.setText(`Generating world...`);
        const seed = Math.floor(Math.random() * 0xffffff);
        const tiles = generateWorld(seed);
        const spawn = findSpawn(tiles);
        this.statusText.setText(`World ready (seed ${seed})`);
        this.statusText.setColor("#00ff88");

        this.time.delayedCall(150, () => {
          this.scene.start("GameScene", {
            worldInit: {
              tiles,
              spawnX: spawn.spawnX,
              spawnY: spawn.spawnY,
              players: [],
              inventory: this.initData.saveData.inventory,
            },
            isHost: true,
            networkManager: this.networkManager,
            saveData: this.initData.saveData,
            isOffline: true,
          });
        });

      } else if (this.initData.isHost) {
        this.statusText.setText(`Initializing Host...`);
        await this.networkManager.initialize(true);
        
        this.statusText.setText(`Generating world...`);
        const seed = Math.floor(Math.random() * 0xffffff);
        const tiles = generateWorld(seed);
        const spawn = findSpawn(tiles);
        this.statusText.setText(`World ready (seed ${seed})`);
        this.statusText.setColor("#00ff88");

        this.time.delayedCall(150, () => {
          this.scene.start("GameScene", {
            worldInit: {
              tiles,
              spawnX: spawn.spawnX,
              spawnY: spawn.spawnY,
              players: [],
              inventory: this.initData.saveData.inventory,
            },
            isHost: true,
            networkManager: this.networkManager,
            saveData: this.initData.saveData,
            isOffline: false,
          });
        });
      } else {
        this.statusText.setText(`Joining Lobby: ${this.initData.lobbyCode}...`);
        this.statusText.setColor("#00bbff");
        
        await this.networkManager.initialize(false, this.initData.lobbyCode);
        
        this.statusText.setText(`Connected! Waiting for world data...`);
        this.scene.start("GameScene", {
          worldInit: null,
          isHost: false,
          networkManager: this.networkManager,
          saveData: this.initData.saveData,
          isOffline: false,
        });
      }
    } catch (err) {
      console.error("Failed to initialize network:", err);
      this.statusText.setText(`Error: ${err instanceof Error ? err.message : String(err)}`);
      this.statusText.setColor("#ff4444");
      
      const retryBtn = document.createElement("button");
      retryBtn.innerText = "Back to Menu";
      retryBtn.style.position = "fixed";
      retryBtn.style.top = "60%";
      retryBtn.style.left = "50%";
      retryBtn.style.transform = "translateX(-50%)";
      retryBtn.onclick = () => {
        retryBtn.remove();
        this.scene.start("StartScene");
      };
      document.body.appendChild(retryBtn);
    }
  }
}

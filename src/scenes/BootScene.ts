import Phaser from "phaser";
import { findSpawn, generateWorld } from "../world/worldGen";
import { ensureRetroGuiTheme, destroyRetroGuiThemeIfUnused } from "../ui/RetroStartTheme";

export class BootScene extends Phaser.Scene {
  private initData!: { saveData: any };

  constructor() {
    super({ key: "BootScene" });
  }

  init(data: any) {
    this.initData = data;
  }

  create() {
    ensureRetroGuiTheme();
    this.cameras.main.setBackgroundColor("#1a1c19");
    this.input.setDefaultCursor("url('cursors/pointer-24.png') 1 1, auto");

    const container = document.createElement("div");
    container.className = "retro-gui";
    document.body.appendChild(container);

    const panel = document.createElement("div");
    panel.className = "retro-panel";
    panel.style.textAlign = "center";

    const title = document.createElement("div");
    title.className = "retro-title";
    title.textContent = "STRATA";

    const status = document.createElement("div");
    status.className = "retro-label retro-label--center";
    status.textContent = "GENERATING WORLD...";

    panel.appendChild(title);
    panel.appendChild(status);
    container.appendChild(panel);

    requestAnimationFrame(() => {
      const seed = Math.floor(Math.random() * 0xffffff);
      const tiles = generateWorld(seed);
      const spawn = findSpawn(tiles);
      status.textContent = `WORLD READY`;

      setTimeout(() => {
        container.remove();
        destroyRetroGuiThemeIfUnused();
        this.scene.start("GameScene", {
          worldInit: {
            tiles,
            spawnX: spawn.spawnX,
            spawnY: spawn.spawnY,
            inventory: this.initData.saveData.inventory,
          },
          saveData: this.initData.saveData,
        });
      }, 300);
    });
  }
}

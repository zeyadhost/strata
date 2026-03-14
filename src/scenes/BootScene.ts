import Phaser from "phaser";
import { FONTS } from "../constants/fonts";
import { createEmptyInventoryState } from "../types";
import { findSpawn, generateWorld } from "../world/worldGen";

export class BootScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    this.input.setDefaultCursor("url('cursors/pointer-24.png') 1 1, auto");

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, "STRATA", { fontFamily: FONTS.header, fontSize: "48px", color: "#e0e0e0" })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 20, "Generating world...", { fontFamily: FONTS.body, fontSize: "18px", color: "#888888" })
      .setOrigin(0.5);

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
          inventory: createEmptyInventoryState(),
        },
      });
    });
  }
}

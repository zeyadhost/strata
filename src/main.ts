import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

import { StartScene } from "./scenes/StartScene";

document.fonts.load("16px monogram").then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    pixelArt: true,
    backgroundColor: "#1a1a2e",
    scene: [StartScene, BootScene, GameScene],
    parent: document.body,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 800 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
  });
});

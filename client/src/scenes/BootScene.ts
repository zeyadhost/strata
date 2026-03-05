import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import { FONTS } from "../constants/fonts";
import { WorldInitPayload } from "../types";

export class BootScene extends Phaser.Scene {
  private socket!: Socket;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, "STRATA", { fontFamily: FONTS.header, fontSize: "48px", color: "#e0e0e0" })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 20, "Connecting...", { fontFamily: FONTS.body, fontSize: "18px", color: "#888888" })
      .setOrigin(0.5);

    this.socket = io();

    this.socket.on("connect", () => {
      this.statusText.setText("Connected. Loading world...");
      this.statusText.setColor("#00ff88");
    });

    this.socket.on("world:init", (payload: WorldInitPayload) => {
      this.scene.start("GameScene", { socket: this.socket, worldInit: payload });
    });

    this.socket.on("disconnect", () => {
      this.statusText.setText("Disconnected");
      this.statusText.setColor("#ff4444");
    });
  }
}

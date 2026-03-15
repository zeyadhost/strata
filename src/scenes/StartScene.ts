import Phaser from "phaser";
import { StorageManager } from "../state/StorageManager";
import { PlayerSaveData } from "../types";
import { ensureRetroGuiTheme, destroyRetroGuiThemeIfUnused } from "../ui/RetroStartTheme";

type MenuState = "MAIN" | "MULTIPLAYER" | "CHARACTER" | "SETTINGS";

const ACCESSORIES = [
  { key: "none",                   label: "NONE",     file: null },
  { key: "accessory_miner_cap",    label: "CAP",      file: "/accessory/miner_cap.png" },
  { key: "accessory_miner_hat",    label: "HAT",      file: "/accessory/miner_hat.png" },
  { key: "accessory_miner_headlamp", label: "LAMP",   file: "/accessory/miner_headlamp.png" },
];

const PLAYER_IDLE_GIF = "/player/idle.gif";

const ACCESSORY_IDLE_OFFSET = { x: 3.5, y: -26.5, originX: 0.75, originY: 0.75, w: 14, h: 6 };

export class StartScene extends Phaser.Scene {
  private uiContainer?: HTMLDivElement;
  private saveData!: PlayerSaveData;
  private currentMenu: MenuState = "MAIN";

  constructor() {
    super({ key: "StartScene" });
  }

  create() {
    this.saveData = StorageManager.load() || StorageManager.generateDefaultSave();
    this.cameras.main.setBackgroundColor("#1a1c19");

    const splashTitle = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, "STRATA", {
      fontFamily: "monogram, monospace",
      fontSize: "72px",
      color: "#e0f0d5"
    }).setOrigin(0.5).setAlpha(0);

    const splashSub = this.add.text(this.scale.width / 2, this.scale.height / 2 + 30, "INITIALIZING SYSTEM...", {
      fontFamily: "monogram, monospace",
      fontSize: "24px",
      color: "#e0f0d5"
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [splashTitle, splashSub],
      alpha: 1,
      duration: 1200,
      ease: "Sine.easeInOut",
      yoyo: true,
      hold: 800,
      onComplete: () => this.openMenuContainer()
    });

    this.events.on("updateSaveData", () => StorageManager.save(this.saveData));
  }

  private openMenuContainer() {
    ensureRetroGuiTheme();
    if (this.uiContainer) this.uiContainer.remove();

    this.uiContainer = document.createElement("div");
    this.uiContainer.className = "retro-gui";
    this.uiContainer.style.opacity = "0";
    this.uiContainer.style.transition = "opacity 0.4s ease-in-out";
    document.body.appendChild(this.uiContainer);

    this.renderCurrentState();

    requestAnimationFrame(() => {
      if (this.uiContainer) this.uiContainer.style.opacity = "1";
    });
  }

  private renderCurrentState() {
    if (!this.uiContainer) return;
    this.uiContainer.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "retro-panel";

    const title = document.createElement("div");
    title.className = "retro-title";
    title.textContent = "STRATA";

    const menu = document.createElement("div");
    menu.className = "retro-menu";

    panel.appendChild(title);
    panel.appendChild(menu);

    switch (this.currentMenu) {
      case "MAIN":        this.renderMainMenu(title, menu);        break;
      case "MULTIPLAYER": this.renderMultiplayerMenu(title, menu); break;
      case "CHARACTER":   this.renderCharacterMenu(title, menu);   break;
      case "SETTINGS":    this.renderSettingsMenu(title, menu);    break;
    }

    this.uiContainer.appendChild(panel);
  }

  private renderMainMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "STRATA";

    const items: [string, () => void][] = [
      ["PLAY OFFLINE",      () => this.startGame(true, undefined, true)],
      ["LOCAL MULTIPLAYER", () => { this.currentMenu = "MULTIPLAYER"; this.renderCurrentState(); }],
      ["CHARACTER",         () => { this.currentMenu = "CHARACTER";   this.renderCurrentState(); }],
      ["SETTINGS",          () => { this.currentMenu = "SETTINGS";    this.renderCurrentState(); }],
    ];

    for (const [label, handler] of items) {
      const btn = document.createElement("button");
      btn.className = "retro-btn";
      btn.textContent = label;
      btn.onclick = handler;
      menu.appendChild(btn);
    }
  }

  private renderMultiplayerMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "MULTIPLAYER";

    const btnHost = document.createElement("button");
    btnHost.className = "retro-btn";
    btnHost.textContent = "HOST LOBBY";
    btnHost.onclick = () => this.startGame(true, undefined, false);

    const divider = document.createElement("div");
    divider.className = "retro-divider";

    const joinRow = document.createElement("div");
    joinRow.className = "retro-row";

    const joinInputWrap = document.createElement("div");
    joinInputWrap.className = "retro-input-wrap";
    joinInputWrap.style.flex = "2";

    const joinInput = document.createElement("input");
    joinInput.className = "retro-input";
    joinInput.placeholder = "CODE...";
    joinInput.maxLength = 6;
    joinInputWrap.appendChild(joinInput);

    const btnJoin = document.createElement("button");
    btnJoin.className = "retro-btn";
    btnJoin.textContent = "JOIN";
    btnJoin.style.flex = "1";
    btnJoin.onclick = () => {
      const code = joinInput.value.trim().toUpperCase();
      if (code.length > 0) this.startGame(false, code, false);
    };

    joinRow.appendChild(joinInputWrap);
    joinRow.appendChild(btnJoin);

    const btnBack = document.createElement("button");
    btnBack.className = "retro-btn retro-btn--back";
    btnBack.textContent = "BACK";
    btnBack.onclick = () => { this.currentMenu = "MAIN"; this.renderCurrentState(); };

    menu.appendChild(btnHost);
    menu.appendChild(divider);
    menu.appendChild(joinRow);
    menu.appendChild(btnBack);
  }

  private renderCharacterMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "CHARACTER";

    const previewSection = document.createElement("div");
    previewSection.className = "retro-preview-section";

    const selectedAcc = ACCESSORIES.find(a => a.key === this.saveData.equippedAccessory)
      ?? ACCESSORIES[0];

    const S = 3;
    const FRAME_W = 16;
    const FRAME_H = 32;
    const CANVAS_W = FRAME_W * S;
    const CANVAS_H = FRAME_H * S;

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.cssText = `
      width: ${CANVAS_W}px;
      height: ${CANVAS_H}px;
      image-rendering: pixelated;
    `;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const playerImg = new Image();
    playerImg.onload = () => {
      ctx.drawImage(playerImg, 0, 0, FRAME_W, FRAME_H, 0, 0, CANVAS_W, CANVAS_H);

      if (selectedAcc.file) {
        const accImg = new Image();
        accImg.onload = () => {
          const o = ACCESSORY_IDLE_OFFSET;
          const REST_Y = -26.5;

          const playerCenterX = CANVAS_W / 2;
          const playerBottomY = CANVAS_H;

          const accDisplayW = o.w * S;
          const accDisplayH = o.h * S;

          const accX = playerCenterX + o.x * S - o.originX * accDisplayW;
          const accY = playerBottomY + REST_Y * S - o.originY * accDisplayH;

          ctx.drawImage(accImg, 0, 0, accImg.naturalWidth, accImg.naturalHeight,
            accX, accY, accDisplayW, accDisplayH);
        };
        accImg.src = selectedAcc.file;
      }
    };
    playerImg.src = PLAYER_IDLE_GIF;

    previewSection.appendChild(canvas);

    const accLabel = document.createElement("div");
    accLabel.className = "retro-label";
    accLabel.textContent = "HEADWEAR";
    previewSection.appendChild(accLabel);

    const accRow = document.createElement("div");
    accRow.className = "retro-acc-row";

    for (const acc of ACCESSORIES) {
      const btn = document.createElement("button");
      btn.className = "retro-btn retro-btn--acc";
      btn.textContent = acc.label;
      const isActive = acc.key === "none"
        ? !this.saveData.equippedAccessory || this.saveData.equippedAccessory === "none"
        : this.saveData.equippedAccessory === acc.key;
      if (isActive) btn.classList.add("retro-btn--active");
      btn.onclick = () => {
        this.saveData.equippedAccessory = acc.key === "none" ? "" : acc.key;
        this.events.emit("updateSaveData");
        this.renderCurrentState();
      };
      accRow.appendChild(btn);
    }

    previewSection.appendChild(accRow);
    menu.appendChild(previewSection);

    const nameLabel = document.createElement("div");
    nameLabel.className = "retro-label";
    nameLabel.textContent = "IDENTIFIER";

    const nameInputWrap = document.createElement("div");
    nameInputWrap.className = "retro-input-wrap";

    const nameInput = document.createElement("input");
    nameInput.className = "retro-input";
    nameInput.value = this.saveData.username;
    nameInput.maxLength = 10;

    const tagDisplay = document.createElement("span");
    tagDisplay.className = "retro-tag";
    tagDisplay.textContent = this.saveData.tag;

    nameInput.addEventListener("input", () => {
      this.saveData.username = nameInput.value || "MINER";
      this.events.emit("updateSaveData");
    });

    nameInputWrap.appendChild(nameInput);
    nameInputWrap.appendChild(tagDisplay);

    const btnBack = document.createElement("button");
    btnBack.className = "retro-btn retro-btn--back";
    btnBack.textContent = "BACK";
    btnBack.onclick = () => { this.currentMenu = "MAIN"; this.renderCurrentState(); };

    menu.appendChild(nameLabel);
    menu.appendChild(nameInputWrap);
    menu.appendChild(btnBack);
  }

  private renderSettingsMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "SETTINGS";

    const wipText = document.createElement("div");
    wipText.className = "retro-label retro-label--center";
    wipText.textContent = "NO SETTINGS AVAILABLE";

    const btnBack = document.createElement("button");
    btnBack.className = "retro-btn retro-btn--back";
    btnBack.textContent = "BACK";
    btnBack.onclick = () => { this.currentMenu = "MAIN"; this.renderCurrentState(); };

    menu.appendChild(wipText);
    menu.appendChild(btnBack);
  }

  private startGame(isHost: boolean, lobbyCode?: string, isOffline = false) {
    if (this.uiContainer) {
      this.uiContainer.style.opacity = "0";
      setTimeout(() => {
        if (this.uiContainer) {
          this.uiContainer.remove();
          this.uiContainer = undefined;
        }
      }, 400);
    }

    this.cameras.main.fadeOut(400, 26, 28, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      destroyRetroGuiThemeIfUnused();
      this.scene.start("BootScene", { isHost, lobbyCode, saveData: this.saveData, isOffline });
    });
  }
}

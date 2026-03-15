import Phaser from "phaser";
import { StorageManager } from "../state/StorageManager";
import { PlayerSaveData } from "../types";
import { ensureRetroGuiTheme, destroyRetroGuiThemeIfUnused } from "../ui/RetroStartTheme";
import { loadSettings, saveSettings, GameSettings } from "../settings";

type MenuState = "MAIN" | "CHARACTER" | "SETTINGS";

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
  private pendingSettings!: GameSettings;

  constructor() {
    super({ key: "StartScene" });
  }

  create() {
    this.saveData = StorageManager.load() || StorageManager.generateDefaultSave();
    this.pendingSettings = loadSettings();
    this.cameras.main.setBackgroundColor("#1a1c19");
    this.openMenuContainer();
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
      case "MAIN":      this.renderMainMenu(title, menu);      break;
      case "CHARACTER": this.renderCharacterMenu(title, menu); break;
      case "SETTINGS":  this.renderSettingsMenu(title, menu);  break;
    }

    this.uiContainer.appendChild(panel);
  }

  private renderMainMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "STRATA";

    const items: [string, () => void][] = [
      ["PLAY",      () => this.startGame()],
      ["CHARACTER", () => { this.currentMenu = "CHARACTER"; this.renderCurrentState(); }],
      ["SETTINGS",  () => { this.currentMenu = "SETTINGS";  this.renderCurrentState(); }],
    ];

    for (const [label, handler] of items) {
      const btn = document.createElement("button");
      btn.className = "retro-btn";
      btn.textContent = label;
      btn.onclick = handler;
      menu.appendChild(btn);
    }
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
          const accDisplayW = o.w * S;
          const accDisplayH = o.h * S;
          const accX = CANVAS_W / 2 + o.x * S - o.originX * accDisplayW;
          const accY = CANVAS_H + o.y * S - o.originY * accDisplayH;
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

    const btnBack = document.createElement("button");
    btnBack.className = "retro-btn retro-btn--back";
    btnBack.textContent = "BACK";
    btnBack.onclick = () => { this.currentMenu = "MAIN"; this.renderCurrentState(); };

    menu.appendChild(btnBack);
  }

  private renderSettingsMenu(title: HTMLElement, menu: HTMLElement) {
    title.textContent = "SETTINGS";
    this.pendingSettings = loadSettings();

    const fields: { label: string; key: keyof GameSettings; type: "slider" | "toggle" | "select"; min?: number; max?: number; step?: number; unit?: string; options?: { label: string; value: string }[] }[] = [
      { label: "MASTER VOL",   key: "masterVolume",   type: "slider", min: 0, max: 100, step: 5, unit: "%" },
      { label: "AMBIENCE VOL", key: "ambienceVolume", type: "slider", min: 0, max: 100, step: 5, unit: "%" },
      { label: "SFX VOL",      key: "sfxVolume",      type: "slider", min: 0, max: 100, step: 5, unit: "%" },
      { label: "FOV",          key: "fov",            type: "slider", min: 0.75, max: 2, step: 0.05, unit: "x" },
      { label: "PIXEL SNAP",   key: "pixelSnap",      type: "toggle" },
      { label: "HOLD TO MINE", key: "holdToMine",     type: "toggle" },
      { label: "SHOW COORDS",  key: "showCoordinates", type: "toggle" },

    ];

    for (const field of fields) {
      const row = document.createElement("div");
      row.className = "retro-settings-row";

      const label = document.createElement("span");
      label.className = "retro-settings-label";
      label.textContent = field.label;

      if (field.type === "slider") {
        const value = document.createElement("span");
        value.className = "retro-settings-value";
        const current = this.pendingSettings[field.key] as number;
        const decimals = field.step! < 1 ? 2 : 0;
        value.textContent = `${current.toFixed(decimals)}${field.unit || ""}`;

        const input = document.createElement("input");
        input.type = "range";
        input.className = "retro-range";
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.value = String(current);
        input.oninput = () => {
          const v = Number(input.value);
          (this.pendingSettings as any)[field.key] = v;
          value.textContent = `${v.toFixed(decimals)}${field.unit || ""}`;
        };
        row.appendChild(label);
        row.appendChild(value);
        row.appendChild(input);
      } else if (field.type === "toggle") {
        const btn = document.createElement("button");
        btn.className = "retro-btn retro-btn--acc";
        const on = this.pendingSettings[field.key] as boolean;
        btn.textContent = on ? "ON" : "OFF";
        if (on) btn.classList.add("retro-btn--active");
        btn.onclick = () => {
          (this.pendingSettings as any)[field.key] = !this.pendingSettings[field.key];
          this.renderCurrentState();
        };
        row.appendChild(label);
        row.appendChild(btn);
      } else if (field.type === "select") {
        const btn = document.createElement("button");
        btn.className = "retro-btn retro-btn--acc";
        const current = this.pendingSettings[field.key] as string;
        const opt = field.options!.find(o => o.value === current) || field.options![0];
        btn.textContent = opt.label;
        btn.classList.add("retro-btn--active");
        btn.onclick = () => {
          const idx = field.options!.findIndex(o => o.value === this.pendingSettings[field.key] as string);
          const next = field.options![(idx + 1) % field.options!.length];
          (this.pendingSettings as any)[field.key] = next.value;
          this.renderCurrentState();
        };
        row.appendChild(label);
        row.appendChild(btn);
      }

      menu.appendChild(row);
    }

    const btnApply = document.createElement("button");
    btnApply.className = "retro-btn";
    btnApply.textContent = "APPLY";
    btnApply.onclick = () => {
      saveSettings(this.pendingSettings);
      this.currentMenu = "MAIN";
      this.renderCurrentState();
    };
    menu.appendChild(btnApply);

    const btnBack = document.createElement("button");
    btnBack.className = "retro-btn retro-btn--back";
    btnBack.textContent = "BACK";
    btnBack.onclick = () => { this.currentMenu = "MAIN"; this.renderCurrentState(); };
    menu.appendChild(btnBack);
  }

  private startGame() {
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
      this.scene.start("BootScene", { saveData: this.saveData });
    });
  }
}

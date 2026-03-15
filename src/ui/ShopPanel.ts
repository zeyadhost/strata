import { ensureStrataGuiTheme, destroyStrataGuiThemeIfUnused } from "./StrataGuiTheme";
import { PICKAXE_LIST, type PickaxeId } from "../constants/pickaxes";
import { PlayerSaveData } from "../types";

export type ShopPanelOptions = {
  onVisibilityChange?: (isOpen: boolean) => void;
  onEquip?: (pickaxeId: PickaxeId) => void;
  onBuy?: (pickaxeId: PickaxeId, cost: number) => void;
};

const PICKAXE_COSTS: Record<number, number> = {
  1: 0,
  2: 250,
  3: 1000,
  4: 3000,
  5: 10000,
};

export class ShopPanel {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly coinsDisplay: HTMLDivElement;
  private readonly itemsContainer: HTMLDivElement;
  
  private isPanelOpen = false;
  private readonly onVisibilityChange?: (isOpen: boolean) => void;
  private readonly onEquip?: (pickaxeId: PickaxeId) => void;
  private readonly onBuy?: (pickaxeId: PickaxeId, cost: number) => void;

  private saveData: PlayerSaveData | null = null;
  private itemButtons = new Map<PickaxeId, HTMLButtonElement>();

  constructor(options: ShopPanelOptions = {}) {
    ensureStrataGuiTheme();
    this.onVisibilityChange = options.onVisibilityChange;
    this.onEquip = options.onEquip;
    this.onBuy = options.onBuy;

    this.root = document.createElement("div");
    this.root.className = "strata-gui strata-gui--modal strata-shop";
    this.root.addEventListener("click", (event) => {
      if (event.target === this.root) {
        this.close();
      }
    });

    this.panel = document.createElement("section");
    this.panel.className = "strata-gui__panel";
    this.panel.addEventListener("click", (event) => event.stopPropagation());
    this.panel.style.width = "400px";

    const header = document.createElement("div");
    header.className = "strata-gui__header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "strata-gui__title-wrap";

    const title = document.createElement("div");
    title.className = "strata-gui__title";
    title.textContent = "Pickaxe Shop";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "strata-gui__close";
    closeButton.textContent = "X";
    closeButton.addEventListener("click", () => this.close());

    this.coinsDisplay = document.createElement("div");
    this.coinsDisplay.className = "strata-gui__badge";
    this.coinsDisplay.textContent = "🪙 0 Coins";
    
    titleWrap.append(title, this.coinsDisplay);
    header.append(titleWrap, closeButton);

    this.itemsContainer = document.createElement("div");
    this.itemsContainer.className = "strata-gui__body";
    this.itemsContainer.style.marginTop = "16px";

    for (const p of PICKAXE_LIST) {
      const row = document.createElement("div");
      row.className = "strata-gui__row";
      row.style.gridTemplateColumns = "60px 1fr auto";
      row.style.alignItems = "center";

      const icon = document.createElement("img");
      icon.src = p.texture;
      icon.style.width = "48px";
      icon.style.height = "48px";
      icon.style.imageRendering = "pixelated";

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.flexDirection = "column";

      const name = document.createElement("div");
      name.className = "strata-gui__row-key";
      name.style.color = p.accentColor;
      name.textContent = p.name;

      const desc = document.createElement("div");
      desc.className = "strata-gui__hint";
      desc.textContent = p.description;

      info.append(name, desc);

      const actionBtn = document.createElement("button");
      actionBtn.className = "strata-gui__slot";
      actionBtn.style.padding = "6px 12px";
      actionBtn.style.minWidth = "80px";
      actionBtn.style.minHeight = "40px";
      actionBtn.style.textAlign = "center";
      actionBtn.style.fontFamily = "monogram, monospace";
      actionBtn.style.fontSize = "16px";
      actionBtn.style.cursor = "pointer";
      
      this.itemButtons.set(p.id as PickaxeId, actionBtn);
      
      row.append(icon, info, actionBtn);
      this.itemsContainer.append(row);

      actionBtn.addEventListener("click", () => {
        if (!this.saveData) return;
        const isUnlocked = this.saveData.unlockedPickaxes.includes(p.id);
        if (isUnlocked) {
          this.onEquip?.(p.id as PickaxeId);
        } else {
          const cost = PICKAXE_COSTS[p.tier] || 0;
          if (this.saveData.coins >= cost) {
            this.onBuy?.(p.id as PickaxeId, cost);
          }
        }
      });
    }

    this.panel.append(header, this.itemsContainer);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.close();
  }

  updateState(saveData: PlayerSaveData) {
    this.saveData = saveData;
    this.coinsDisplay.textContent = `🪙 ${saveData.coins} Coins`;

    for (const p of PICKAXE_LIST) {
      const btn = this.itemButtons.get(p.id as PickaxeId);
      if (!btn) continue;

      const isUnlocked = saveData.unlockedPickaxes.includes(p.id);
      const isEquipped = saveData.equippedPickaxe === p.id;
      const cost = PICKAXE_COSTS[p.tier] || 0;

      if (isEquipped) {
        btn.textContent = "EQUIPPED";
        btn.style.color = "#a0a0a0";
        btn.style.background = "linear-gradient(180deg, #121d40 0%, #0c1531 100%)";
      } else if (isUnlocked) {
        btn.textContent = "EQUIP";
        btn.style.color = "#ffffff";
        btn.style.background = "linear-gradient(180deg, #2e8b57 0%, #1e5c3a 100%)";
      } else {
        if (saveData.coins >= cost) {
          btn.textContent = `BUY (${cost})`;
          btn.style.color = "#f4d679";
          btn.style.background = "linear-gradient(180deg, #bda34b 0%, #877435 100%)";
        } else {
          btn.textContent = `LOCKED (${cost})`;
          btn.style.color = "#777777";
          btn.style.background = "linear-gradient(180deg, #121d40 0%, #0c1531 100%)";
        }
      }
    }
  }

  open(saveData: PlayerSaveData) {
    this.updateState(saveData);
    this.isPanelOpen = true;
    this.root.style.display = "flex";
    this.onVisibilityChange?.(true);
  }

  close() {
    this.isPanelOpen = false;
    this.root.style.display = "none";
    this.onVisibilityChange?.(false);
  }

  toggle(saveData: PlayerSaveData) {
    if (this.isPanelOpen) this.close();
    else this.open(saveData);
  }

  isOpen() {
    return this.isPanelOpen;
  }

  destroy() {
    this.root.remove();
    destroyStrataGuiThemeIfUnused();
  }
}

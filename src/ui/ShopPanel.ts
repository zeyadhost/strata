import { ensureStrataGuiTheme, destroyStrataGuiThemeIfUnused } from "./StrataGuiTheme";
import { PICKAXE_LIST, type PickaxeId } from "../constants/pickaxes";
import { PlayerSaveData } from "../types";

export type ShopPanelOptions = {
  onVisibilityChange?: (isOpen: boolean) => void;
  onEquip?: (pickaxeId: PickaxeId) => void;
  onBuy?: (pickaxeId: PickaxeId, cost: number) => void;
  onSellOres?: () => void;
};

const PICKAXE_COSTS: Record<number, number> = {
  1: 0,
  2: 50,
  3: 200,
  4: 500,
  5: 1500,
  6: 5000,
};

export class ShopPanel {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly coinsDisplay: HTMLDivElement;
  private readonly itemsContainer: HTMLDivElement;
  private readonly styleTag: HTMLStyleElement;

  private isPanelOpen = false;
  private readonly onVisibilityChange?: (isOpen: boolean) => void;
  private readonly onEquip?: (pickaxeId: PickaxeId) => void;
  private readonly onBuy?: (pickaxeId: PickaxeId, cost: number) => void;
  private readonly onSellOres?: () => void;

  private saveData: PlayerSaveData | null = null;
  private itemButtons = new Map<PickaxeId, HTMLButtonElement>();

  constructor(options: ShopPanelOptions = {}) {
    ensureStrataGuiTheme();
    this.onVisibilityChange = options.onVisibilityChange;
    this.onEquip = options.onEquip;
    this.onBuy = options.onBuy;
    this.onSellOres = options.onSellOres;

    this.styleTag = document.createElement("style");
    this.styleTag.textContent = this.getStyles();
    document.head.appendChild(this.styleTag);

    this.root = document.createElement("div");
    this.root.className = "strata-shop-root";
    this.root.addEventListener("click", (event) => {
      if (event.target === this.root) this.close();
    });

    this.panel = document.createElement("section");
    this.panel.className = "strata-shop-panel";
    this.panel.addEventListener("click", (event) => event.stopPropagation());

    const header = document.createElement("div");
    header.className = "strata-shop-header";

    const title = document.createElement("div");
    title.className = "strata-shop-title";
    title.textContent = "Pickaxe Shop";

    this.coinsDisplay = document.createElement("div");
    this.coinsDisplay.className = "strata-shop-coins";
    this.coinsDisplay.textContent = "🪙 0";

    const sellBtn = document.createElement("button");
    sellBtn.className = "strata-shop-sell";
    sellBtn.textContent = "SELL ORES";
    sellBtn.addEventListener("click", () => this.onSellOres?.());

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "strata-shop-close";
    closeButton.textContent = "X";
    closeButton.addEventListener("click", () => this.close());

    header.append(title, this.coinsDisplay, sellBtn, closeButton);

    this.itemsContainer = document.createElement("div");
    this.itemsContainer.className = "strata-shop-items";

    for (const p of PICKAXE_LIST) {
      const card = document.createElement("div");
      card.className = "strata-shop-card";

      const icon = document.createElement("img");
      icon.src = p.texture;
      icon.className = "strata-shop-icon";

      const name = document.createElement("div");
      name.className = "strata-shop-name";
      name.style.color = p.accentColor;
      name.textContent = p.shortName;

      const actionBtn = document.createElement("button");
      actionBtn.className = "strata-shop-action";
      this.itemButtons.set(p.id as PickaxeId, actionBtn);

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

      card.append(icon, name, actionBtn);
      this.itemsContainer.appendChild(card);
    }

    this.panel.append(header, this.itemsContainer);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.close();
  }

  updateState(saveData: PlayerSaveData) {
    this.saveData = saveData;
    this.coinsDisplay.textContent = `🪙 ${saveData.coins}`;

    for (const p of PICKAXE_LIST) {
      const btn = this.itemButtons.get(p.id as PickaxeId);
      if (!btn) continue;

      const isUnlocked = saveData.unlockedPickaxes.includes(p.id);
      const isEquipped = saveData.equippedPickaxe === p.id;
      const cost = PICKAXE_COSTS[p.tier] || 0;

      btn.dataset.state = isEquipped ? "equipped" : isUnlocked ? "owned" : saveData.coins >= cost ? "buyable" : "locked";

      if (isEquipped) {
        btn.textContent = "EQUIPPED";
      } else if (isUnlocked) {
        btn.textContent = "EQUIP";
      } else if (saveData.coins >= cost) {
        btn.textContent = `$${cost}`;
      } else {
        btn.textContent = `$${cost}`;
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
    this.styleTag.remove();
    destroyStrataGuiThemeIfUnused();
  }

  private getStyles() {
    return `
      .strata-shop-root {
        position: fixed;
        inset: 0;
        z-index: 950;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(6, 9, 22, 0.6);
        pointer-events: auto;
      }

      .strata-shop-panel {
        width: min(calc(100vw - 24px), 900px);
        background: linear-gradient(180deg, #182548 0%, #0d1631 38%, #091124 100%);
        box-shadow:
          inset 0 0 0 2px #324f95,
          inset 0 0 0 6px #0b1532,
          0 0 0 2px #f0e6c3,
          0 0 0 6px #050a18,
          0 14px 0 rgba(3, 6, 14, 0.95);
        padding: 14px;
        font-family: monogram, monospace;
        color: #f6ecc8;
      }

      .strata-shop-header {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 12px;
      }

      .strata-shop-title {
        font-size: 24px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #f5e9c1;
        text-shadow: 2px 2px 0 #0b1531;
        width: 100%;
      }

      .strata-shop-coins {
        font-size: 20px;
        color: #f4d679;
        padding: 6px 12px;
        background: rgba(244, 214, 121, 0.1);
        border: 2px solid rgba(244, 214, 121, 0.3);
      }

      .strata-shop-sell {
        font-family: monogram, monospace;
        font-size: 18px;
        padding: 6px 14px;
        border: 0;
        background: linear-gradient(180deg, #2e8b57 0%, #1e5c3a 100%);
        color: #fff;
        box-shadow:
          inset 0 0 0 2px #4cc080,
          inset 0 0 0 4px #133d25;
        cursor: url('cursors/pointer-24.png') 1 1, pointer;
        text-transform: uppercase;
      }

      .strata-shop-sell:hover { filter: brightness(1.12); }
      .strata-shop-sell:active { transform: translateY(1px); }

      .strata-shop-close {
        font-family: monogram, monospace;
        font-size: 22px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: linear-gradient(180deg, #a55260 0%, #7c3144 100%);
        color: #fff0dc;
        box-shadow:
          inset 0 0 0 2px #c07080,
          inset 0 0 0 4px #4e1727;
        cursor: url('cursors/pointer-24.png') 1 1, pointer;
      }

      .strata-shop-close:hover { filter: brightness(1.1); }

      .strata-shop-items {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: #4066bb #081126;
        padding-bottom: 4px;
      }

      .strata-shop-card {
        flex: 0 0 auto;
        width: 120px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 10px 8px;
        background: linear-gradient(180deg, rgba(15, 26, 56, 0.95), rgba(8, 16, 36, 0.98));
        box-shadow:
          inset 0 0 0 2px #213a70,
          inset 0 0 0 4px #0a132c;
      }

      .strata-shop-icon {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
      }

      .strata-shop-name {
        font-size: 16px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
      }

      .strata-shop-action {
        font-family: monogram, monospace;
        font-size: 16px;
        width: 100%;
        padding: 5px 8px;
        border: 0;
        text-transform: uppercase;
        cursor: url('cursors/pointer-24.png') 1 1, pointer;
      }

      .strata-shop-action[data-state="equipped"] {
        background: linear-gradient(180deg, #121d40 0%, #0c1531 100%);
        color: #a0a0a0;
        box-shadow: inset 0 0 0 2px #203867;
      }

      .strata-shop-action[data-state="owned"] {
        background: linear-gradient(180deg, #2e8b57 0%, #1e5c3a 100%);
        color: #fff;
        box-shadow: inset 0 0 0 2px #4cc080;
      }

      .strata-shop-action[data-state="buyable"] {
        background: linear-gradient(180deg, #bda34b 0%, #877435 100%);
        color: #f4d679;
        box-shadow: inset 0 0 0 2px #d4bc6a;
      }

      .strata-shop-action[data-state="locked"] {
        background: linear-gradient(180deg, #121d40 0%, #0c1531 100%);
        color: #555;
        box-shadow: inset 0 0 0 2px #203867;
        cursor: default;
      }

      .strata-shop-action:hover:not([data-state="locked"]):not([data-state="equipped"]) {
        filter: brightness(1.1);
      }

      .strata-shop-action:active:not([data-state="locked"]):not([data-state="equipped"]) {
        transform: translateY(1px);
      }
    `;
  }
}

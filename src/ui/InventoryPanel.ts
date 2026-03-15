import { INVENTORY_KEYS, type InventoryKey, type InventoryState } from "../types";
import { destroyStrataGuiThemeIfUnused, ensureStrataGuiTheme } from "./StrataGuiTheme";

type InventoryPanelLayout = {
  fontSize: number;
  paddingX: number;
  paddingY: number;
};

type InventoryPanelOptions = {
  onVisibilityChange?: (isOpen: boolean) => void;
  onSellOres?: () => void;
};

const INVENTORY_ROWS: InventoryKey[] = [...INVENTORY_KEYS];

function formatInventoryLabel(key: InventoryKey) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function gemAssetPath(key: InventoryKey) {
  return `gems/${key}.png`;
}

export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly values = new Map<InventoryKey, HTMLSpanElement>();
  private readonly itemSlots = new Map<InventoryKey, HTMLDivElement>();
  private isPanelOpen = false;
  private readonly onVisibilityChange?: (isOpen: boolean) => void;
  private readonly onSellOres?: () => void;

  constructor(options: InventoryPanelOptions = {}) {
    ensureStrataGuiTheme();
    this.onVisibilityChange = options.onVisibilityChange;
    this.onSellOres = options.onSellOres;

    this.root = document.createElement("div");
    this.root.className = "strata-gui strata-gui--modal strata-inventory";
    this.root.addEventListener("click", (event) => {
      if (event.target === this.root) {
        this.close();
      }
    });

    this.panel = document.createElement("section");
    this.panel.className = "strata-gui__panel";
    this.panel.addEventListener("click", (event) => event.stopPropagation());

    const header = document.createElement("div");
    header.className = "strata-gui__header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "strata-gui__title-wrap";

    const title = document.createElement("div");
    title.className = "strata-gui__title";
    title.textContent = "Inventory";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "strata-gui__close";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", "Close inventory");
    closeButton.addEventListener("click", () => this.close());

    const body = document.createElement("div");
    body.className = "strata-gui__inventory-grid";

    for (const key of INVENTORY_ROWS) {
      const slot = document.createElement("div");
      slot.className = "strata-gui__inventory-slot";
      slot.dataset.empty = "true";
      slot.title = formatInventoryLabel(key);

      const icon = document.createElement("img");
      icon.className = "strata-gui__inventory-icon";
      icon.alt = formatInventoryLabel(key);
      icon.decoding = "async";
      icon.loading = "eager";
      icon.src = gemAssetPath(key);

      const value = document.createElement("span");
      value.className = "strata-gui__inventory-count";
      value.textContent = "0";

      slot.append(icon, value);
      body.appendChild(slot);
      this.values.set(key, value);
      this.itemSlots.set(key, slot);
    }

    const footer = document.createElement("div");
    footer.className = "strata-gui__footer";
    footer.style.display = "flex";
    footer.style.justifyContent = "center";
    footer.style.padding = "10px";
    footer.style.borderTop = "2px solid #203867";

    const sellButton = document.createElement("button");
    sellButton.type = "button";
    sellButton.className = "strata-gui__slot";
    sellButton.style.width = "auto";
    sellButton.style.minHeight = "40px";
    sellButton.style.padding = "8px 16px";
    sellButton.style.textAlign = "center";
    sellButton.style.cursor = "pointer";
    sellButton.style.fontFamily = "monogram, monospace";
    sellButton.style.fontSize = "20px";
    sellButton.style.color = "#f4d679";
    sellButton.textContent = "Sell All Ores";
    sellButton.addEventListener("click", () => {
      this.onSellOres?.();
    });

    footer.appendChild(sellButton);

    titleWrap.append(title);
    header.append(titleWrap, closeButton);
    this.panel.append(header, body, footer);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.close();
  }

  setInventory(inventory: InventoryState) {
    for (const key of INVENTORY_ROWS) {
      const amount = inventory[key];
      this.values.get(key)!.textContent = String(amount);
      this.itemSlots.get(key)!.dataset.empty = amount > 0 ? "false" : "true";
    }
  }

  setLayout(layout: InventoryPanelLayout) {
    this.panel.style.padding = `${layout.paddingY}px ${layout.paddingX}px`;
    this.panel.style.minWidth = `${Math.max(320, layout.fontSize * 14)}px`;

    this.root.style.fontSize = `${layout.fontSize}px`;
    this.panel.style.setProperty("font-size", `${layout.fontSize}px`);
  }

  open() {
    this.isPanelOpen = true;
    this.root.style.display = "flex";
    this.onVisibilityChange?.(true);
  }

  close() {
    this.isPanelOpen = false;
    this.root.style.display = "none";
    this.onVisibilityChange?.(false);
  }

  toggle() {
    if (this.isPanelOpen) this.close();
    else this.open();
  }

  isOpen() {
    return this.isPanelOpen;
  }

  destroy() {
    this.root.remove();
    destroyStrataGuiThemeIfUnused();
  }
}
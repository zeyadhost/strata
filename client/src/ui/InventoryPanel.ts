import { INVENTORY_KEYS, type InventoryKey, type InventoryState } from "../types";
import { destroyStrataGuiThemeIfUnused, ensureStrataGuiTheme } from "./StrataGuiTheme";

type InventoryPanelLayout = {
  fontSize: number;
  paddingX: number;
  paddingY: number;
};

type InventoryPanelOptions = {
  onVisibilityChange?: (isOpen: boolean) => void;
};

const INVENTORY_ROWS: InventoryKey[] = [...INVENTORY_KEYS];

function formatInventoryLabel(key: InventoryKey) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLElement;
  private readonly values = new Map<InventoryKey, HTMLSpanElement>();
  private isPanelOpen = false;
  private readonly onVisibilityChange?: (isOpen: boolean) => void;

  constructor(options: InventoryPanelOptions = {}) {
    ensureStrataGuiTheme();
    this.onVisibilityChange = options.onVisibilityChange;

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
    body.className = "strata-gui__body";

    for (const key of INVENTORY_ROWS) {
      const row = document.createElement("div");
      row.className = "strata-gui__row";

      const label = document.createElement("span");
      label.className = "strata-gui__row-key";
      label.textContent = formatInventoryLabel(key);

      const value = document.createElement("span");
      value.className = "strata-gui__row-value";
      value.textContent = "0";
      this.values.set(key, value);

      row.append(label, value);
      body.appendChild(row);
    }

    titleWrap.append(title);
    header.append(titleWrap, closeButton);
    this.panel.append(header, body);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
    this.close();
  }

  setInventory(inventory: InventoryState) {
    for (const key of INVENTORY_ROWS) {
      this.values.get(key)!.textContent = String(inventory[key]);
    }
  }

  setLayout(layout: InventoryPanelLayout) {
    this.panel.style.padding = `${layout.paddingY}px ${layout.paddingX}px`;
    this.panel.style.minWidth = `${Math.max(220, layout.fontSize * 11)}px`;

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
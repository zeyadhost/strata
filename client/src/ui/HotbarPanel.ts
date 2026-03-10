import { destroyStrataGuiThemeIfUnused, ensureStrataGuiTheme } from "./StrataGuiTheme";

type HotbarSlotKey = "main-pickaxe" | "secondary-pickaxe" | "inventory";

type HotbarLayout = {
  bottom: number;
  fontSize: number;
};

type HotbarPanelOptions = {
  onSelect: (slot: HotbarSlotKey) => void;
};

const SLOT_CONFIG: Array<{ key: HotbarSlotKey; bind: string; title: string; copy: string }> = [
  { key: "main-pickaxe", bind: "1", title: "Main Pick", copy: "Primary tool" },
  { key: "secondary-pickaxe", bind: "2", title: "Side Pick", copy: "Secondary tool" },
  { key: "inventory", bind: "`", title: "Inventory", copy: "Open ore bag" },
];

export class HotbarPanel {
  private readonly root: HTMLDivElement;
  private readonly slots = new Map<HotbarSlotKey, HTMLButtonElement>();

  constructor(options: HotbarPanelOptions) {
    ensureStrataGuiTheme();

    this.root = document.createElement("div");
    this.root.className = "strata-gui strata-hotbar";

    const dock = document.createElement("div");
    dock.className = "strata-gui__dock";

    for (const config of SLOT_CONFIG) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "strata-gui__slot";
      button.dataset.active = "false";
      button.innerHTML = [
        `<span class="strata-gui__slot-key">${config.bind}</span>`,
        `<span class="strata-gui__slot-title">${config.title}</span>`,
        `<span class="strata-gui__slot-copy">${config.copy}</span>`,
      ].join("");
      button.addEventListener("click", () => options.onSelect(config.key));
      this.slots.set(config.key, button);
      dock.appendChild(button);
    }

    this.root.appendChild(dock);
    document.body.appendChild(this.root);
  }

  setActiveSlot(slot: HotbarSlotKey | null) {
    for (const [key, button] of this.slots) {
      button.dataset.active = key === slot ? "true" : "false";
    }
  }

  setLayout(layout: HotbarLayout) {
    this.root.style.left = "50%";
    this.root.style.bottom = `${layout.bottom}px`;
    this.root.style.transform = "translateX(-50%)";
    this.root.style.fontSize = `${layout.fontSize}px`;
  }

  destroy() {
    this.root.remove();
    destroyStrataGuiThemeIfUnused();
  }
}

export type { HotbarSlotKey };
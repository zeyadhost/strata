import { destroyStrataGuiThemeIfUnused, ensureStrataGuiTheme } from "./StrataGuiTheme";

type HotbarSlotKey = "main-pickaxe" | "secondary-pickaxe" | "inventory";

type HotbarSlotVisual = {
  title: string;
  copy?: string;
  accentColor?: string;
  badge?: string;
  compact?: boolean;
};

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
  private readonly slotTitles = new Map<HotbarSlotKey, HTMLSpanElement>();
  private readonly slotKeys = new Map<HotbarSlotKey, HTMLSpanElement>();
  private readonly slotCopies = new Map<HotbarSlotKey, HTMLSpanElement>();
  private readonly slotBadges = new Map<HotbarSlotKey, HTMLSpanElement>();
  private readonly pulseTimers = new Map<HotbarSlotKey, number>();

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

      const bind = document.createElement("span");
      bind.className = "strata-gui__slot-key";
      bind.textContent = config.bind;

      const media = document.createElement("div");
      media.className = "strata-gui__slot-media";

      const labels = document.createElement("div");
      labels.className = "strata-gui__slot-labels";

      const title = document.createElement("span");
      title.className = "strata-gui__slot-title";
      title.textContent = config.title;

      const copy = document.createElement("span");
      copy.className = "strata-gui__slot-copy";
      copy.textContent = config.copy;

      const badge = document.createElement("span");
      badge.className = "strata-gui__slot-tier";
      badge.style.display = "none";

      labels.append(title, copy);
      media.append(labels);
      button.append(bind, media, badge);

      button.addEventListener("click", () => options.onSelect(config.key));
      this.slots.set(config.key, button);
      this.slotTitles.set(config.key, title);
      this.slotKeys.set(config.key, bind);
      this.slotCopies.set(config.key, copy);
      this.slotBadges.set(config.key, badge);
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

  setSlotVisual(slot: HotbarSlotKey, visual: HotbarSlotVisual) {
    const button = this.slots.get(slot);
    if (!button) return;

    this.slotTitles.get(slot)!.textContent = visual.title;
    const copy = this.slotCopies.get(slot)!;
    if (visual.copy) {
      copy.textContent = visual.copy;
      copy.style.display = "block";
    } else {
      copy.textContent = "";
      copy.style.display = "none";
    }

    const badge = this.slotBadges.get(slot)!;
    if (visual.badge) {
      badge.textContent = visual.badge;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
      badge.textContent = "";
    }

    button.style.setProperty("--slot-accent", visual.accentColor ?? "#f4d679");
    button.dataset.compact = visual.compact ? "true" : "false";

    const bind = this.slotKeys.get(slot)!;
    bind.style.display = "inline";
  }

  getSlotRect(slot: HotbarSlotKey) {
    return this.slots.get(slot)?.getBoundingClientRect() ?? null;
  }

  pulseSlot(slot: HotbarSlotKey) {
    const button = this.slots.get(slot);
    if (!button) return;

    const existingTimer = this.pulseTimers.get(slot);
    if (existingTimer != null) {
      window.clearTimeout(existingTimer);
    }

    button.dataset.collect = "true";
    const timer = window.setTimeout(() => {
      button.dataset.collect = "false";
      this.pulseTimers.delete(slot);
    }, 360);
    this.pulseTimers.set(slot, timer);
  }

  destroy() {
    for (const timer of this.pulseTimers.values()) {
      window.clearTimeout(timer);
    }
    this.pulseTimers.clear();
    this.root.remove();
    destroyStrataGuiThemeIfUnused();
  }
}

export type { HotbarSlotKey };
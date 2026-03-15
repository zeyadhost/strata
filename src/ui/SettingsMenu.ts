import { DEFAULT_SETTINGS, GameSettings } from "../settings";

type SettingsMenuOptions = {
  onApply: (settings: GameSettings) => void;
};

type CategoryKey = "audio" | "video" | "game";

export class SettingsMenu {
  private container: HTMLDivElement;
  private button: HTMLButtonElement;
  private backdrop: HTMLDivElement;
  private panel: HTMLDivElement;
  private mainLayout: HTMLDivElement;
  private sidebar: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private styleTag: HTMLStyleElement;
  private current: GameSettings;
  private activeCategory: CategoryKey = "audio";
  private readonly onApply: (settings: GameSettings) => void;
  private readonly iconBase = "settings-icons";
  private readonly pointerCursor = "url('cursors/pointer-24.png') 1 1, pointer";
  private readonly categoryButtons = new Map<CategoryKey, HTMLButtonElement>();
  private readonly sections = new Map<CategoryKey, HTMLElement>();
  private readonly resizeHandler = () => this.updateResponsiveLayout();
  private readonly documentPointerHandler = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest(".strata-settings__select-wrap")) return;
    this.closeDropdowns();
  };

  constructor(initial: GameSettings, options: SettingsMenuOptions) {
    this.current = { ...initial };
    this.onApply = options.onApply;

    this.styleTag = document.createElement("style");
    this.styleTag.textContent = this.getStyles();
    document.head.appendChild(this.styleTag);

    this.container = document.createElement("div");
    this.container.className = "strata-settings";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "strata-settings__launcher";
    this.button.innerHTML = `${this.iconMarkup("settings.png", "Settings")}<span class="strata-settings__launcher-label">Settings</span>`;
    this.button.style.cursor = this.pointerCursor;
    this.button.addEventListener("click", () => this.toggle());

    this.backdrop = document.createElement("div");
    this.backdrop.className = "strata-settings__backdrop";
    this.backdrop.style.display = "none";
    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) this.close();
    });

    this.panel = document.createElement("div");
    this.panel.className = "strata-settings__panel";
    this.panel.addEventListener("click", (event) => event.stopPropagation());

    const header = document.createElement("div");
    header.className = "strata-settings__header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "strata-settings__title-wrap";

    const title = document.createElement("div");
    title.className = "strata-settings__title";
    title.innerHTML = `${this.iconMarkup("settings.png", "Settings")}<span>GAME SETTINGS</span>`;

    const subtitle = document.createElement("div");
    subtitle.className = "strata-settings__subtitle";
    subtitle.textContent = "Tune the cave, the camera, and the controls.";

    titleWrap.append(title, subtitle);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "strata-settings__close";
    closeButton.innerHTML = `${this.iconMarkup("close.png", "Close")}<span>CLOSE</span>`;
    closeButton.style.cursor = this.pointerCursor;
    closeButton.addEventListener("click", () => this.close());

    header.append(titleWrap, closeButton);

    this.mainLayout = document.createElement("div");
    this.mainLayout.className = "strata-settings__layout";

    this.sidebar = document.createElement("div");
    this.sidebar.className = "strata-settings__sidebar";

    const navLabel = document.createElement("div");
    navLabel.className = "strata-settings__sidebar-label";
    navLabel.textContent = "PANELS";
    this.sidebar.appendChild(navLabel);

    this.contentArea = document.createElement("div");
    this.contentArea.className = "strata-settings__content";

    this.buildCategories();
    this.buildSections();
    this.setActiveCategory(this.activeCategory);

    this.mainLayout.append(this.sidebar, this.contentArea);

    const footer = document.createElement("div");
    footer.className = "strata-settings__footer";

    const resetButton = this.createActionButton("reset.png", "RESET", "danger");
    resetButton.addEventListener("click", () => this.reset());

    const applyButton = this.createActionButton("apply.png", "APPLY", "confirm");
    applyButton.addEventListener("click", () => this.apply());

    footer.append(resetButton, applyButton);

    this.panel.append(header, this.mainLayout, footer);
    this.backdrop.appendChild(this.panel);
    this.container.append(this.button, this.backdrop);
    document.body.appendChild(this.container);

    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("pointerdown", this.documentPointerHandler);
    this.updateResponsiveLayout();
  }

  isOpen() {
    return this.backdrop.style.display !== "none";
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.syncInputs(this.current);
    this.updateResponsiveLayout();
    this.backdrop.style.display = "flex";
  }

  close() {
    this.backdrop.style.display = "none";
  }

  destroy() {
    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("pointerdown", this.documentPointerHandler);
    this.styleTag.remove();
    this.container.remove();
  }

  setSettings(settings: GameSettings) {
    this.current = { ...settings };
    this.syncInputs(settings);
  }

  private apply() {
    const settings = this.readInputs();
    this.current = settings;
    this.onApply(settings);
    this.close();
  }

  private reset() {
    this.current = { ...DEFAULT_SETTINGS };
    this.syncInputs(this.current);
    this.onApply({ ...DEFAULT_SETTINGS });
  }

  private buildCategories() {
    const categories: Array<{ key: CategoryKey; icon: string; label: string; note: string }> = [
      { key: "audio", icon: "audio.png", label: "AUDIO", note: "mix, ambience, fx" },
      { key: "video", icon: "video.png", label: "VIDEO", note: "camera and render" },
      { key: "game", icon: "game.png", label: "GAME", note: "controls and hud" },
    ];

    for (const category of categories) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "strata-settings__tab";
      button.style.cursor = this.pointerCursor;
      button.innerHTML = [
        `<span class="strata-settings__tab-icon">${this.iconMarkup(category.icon, category.label)}</span>`,
        '<span class="strata-settings__tab-copy">',
        `<span class="strata-settings__tab-label">${category.label}</span>`,
        `<span class="strata-settings__tab-note">${category.note}</span>`,
        "</span>",
      ].join("");
      button.addEventListener("click", () => this.setActiveCategory(category.key));
      this.categoryButtons.set(category.key, button);
      this.sidebar.appendChild(button);
    }
  }

  private buildSections() {
    const audio = this.createSection("audio.png", "Audio Rack", [
      this.createSliderField("masterVolume", "Master Volume", "Overall loudness for the full game mix.", 0, 100, 1, "%", 0),
      this.createSliderField("ambienceVolume", "Ambience Volume", "Wind, cave air, and passive world sounds.", 0, 100, 1, "%", 0),
      this.createSliderField("sfxVolume", "SFX Volume", "Mining hits, pickups, movement, and feedback.", 0, 100, 1, "%", 0),
    ]);

    const video = this.createSection("video.png", "View Rig", [
      this.createSliderField("fov", "Field Of View", "Zoom the camera in or out without changing resolution.", 0.75, 2, 0.05, "x", 2),
      this.createToggleField("pixelSnap", "Pixel Snap", "Lock camera math to whole pixels for cleaner scrolling."),
    ]);

    const game = this.createSection("game.png", "Control Board", [
      this.createToggleField("holdToMine", "Hold To Mine", "Keep mining while the mouse button stays down."),
      this.createToggleField("showCoordinates", "Show Coordinates", "Display the live world position readout."),
    ]);

    this.sections.set("audio", audio);
    this.sections.set("video", video);
    this.sections.set("game", game);

    this.contentArea.append(audio, video, game);
  }

  private createSection(iconName: string, title: string, children: HTMLElement[]) {
    const section = document.createElement("section");
    section.className = "strata-settings__section";

    const heading = document.createElement("div");
    heading.className = "strata-settings__section-head";

    const titleRow = document.createElement("div");
    titleRow.className = "strata-settings__section-title";
    titleRow.innerHTML = `${this.iconMarkup(iconName, title)}<span>${title}</span>`;

    const body = document.createElement("div");
    body.className = "strata-settings__section-body";
    body.append(...children);

    heading.append(titleRow);
    section.append(heading, body);
    return section;
  }

  private createSliderField(
    name: keyof GameSettings,
    label: string,
    description: string,
    min: number,
    max: number,
    step: number,
    unit: string,
    decimals: number,
  ) {
    const row = this.createFieldShell(label, description);

    const controlStack = document.createElement("div");
    controlStack.className = "strata-settings__slider-stack";

    const value = document.createElement("span");
    value.className = "strata-settings__value";
    value.dataset.valueFor = String(name);

    const input = document.createElement("input");
    input.type = "range";
    input.name = String(name);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.dataset.unit = unit;
    input.dataset.decimals = String(decimals);
    input.className = "strata-settings__range";
    input.style.cursor = this.pointerCursor;
    input.addEventListener("input", () => this.updateSliderState(input));

    controlStack.append(value, input);
    row.control.appendChild(controlStack);
    return row.element;
  }

  private createToggleField(name: keyof GameSettings, label: string, description: string) {
    const row = this.createFieldShell(label, description);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "strata-settings__toggle";
    toggle.dataset.toggleFor = String(name);
    toggle.style.cursor = this.pointerCursor;

    const light = document.createElement("span");
    light.className = "strata-settings__toggle-light";
    light.dataset.toggleMarkerFor = String(name);

    const text = document.createElement("span");
    text.className = "strata-settings__toggle-text";
    text.dataset.toggleTextFor = String(name);

    toggle.append(light, text);
    toggle.addEventListener("click", () => {
      const nextState = toggle.dataset.state !== "on";
      this.setToggleState(String(name), nextState);
    });

    row.control.appendChild(toggle);
    return row.element;
  }



  private createFieldShell(label: string, description: string) {
    const element = document.createElement("div");
    element.className = "strata-settings__field";

    const meta = document.createElement("div");
    meta.className = "strata-settings__field-meta";

    const title = document.createElement("div");
    title.className = "strata-settings__field-title";
    title.textContent = label;

    const copy = document.createElement("div");
    copy.className = "strata-settings__field-copy";
    copy.textContent = description;

    const control = document.createElement("div");
    control.className = "strata-settings__field-control";

    meta.append(title, copy);
    element.append(meta, control);
    return { element, meta, control };
  }

  private createActionButton(iconName: string, label: string, tone: "danger" | "confirm") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `strata-settings__action strata-settings__action--${tone}`;
    button.style.cursor = this.pointerCursor;
    button.innerHTML = `${this.iconMarkup(iconName, label)}<span>${label}</span>`;
    return button;
  }

  private setActiveCategory(category: CategoryKey) {
    this.activeCategory = category;

    for (const [key, button] of this.categoryButtons) {
      button.dataset.active = key === category ? "true" : "false";
    }

    for (const [key, section] of this.sections) {
      section.style.display = key === category ? "grid" : "none";
    }
  }

  private setToggleState(name: string, checked: boolean) {
    const toggle = this.contentArea.querySelector<HTMLButtonElement>(`[data-toggle-for='${name}']`);
    const marker = this.contentArea.querySelector<HTMLElement>(`[data-toggle-marker-for='${name}']`);
    const text = this.contentArea.querySelector<HTMLElement>(`[data-toggle-text-for='${name}']`);
    if (!toggle || !marker || !text) return;

    toggle.dataset.state = checked ? "on" : "off";
    toggle.dataset.on = checked ? "true" : "false";
    marker.textContent = checked ? "ON" : "OFF";
    text.textContent = checked ? "Enabled" : "Disabled";
  }

  private closeDropdowns() {
    for (const element of this.contentArea.querySelectorAll<HTMLElement>(".strata-settings__select-wrap")) {
      element.dataset.open = "false";
    }
  }

  private updateDropdownSelection(name: string) {
    const input = this.contentArea.querySelector<HTMLInputElement>(`.strata-settings__select-wrap [name='${name}']`);
    if (!input) return;

    const wrap = input.closest<HTMLElement>(".strata-settings__select-wrap");
    if (!wrap) return;

    for (const option of wrap.querySelectorAll<HTMLElement>(".strata-settings__select-option")) {
      option.dataset.selected = option.dataset.value === input.value ? "true" : "false";
    }
  }

  private syncInputs(settings: GameSettings) {
    for (const input of this.contentArea.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) {
      const name = input.name as keyof GameSettings;
      const value = settings[name];
      input.value = String(value);

      if (input instanceof HTMLInputElement && input.type === "range") {
        this.updateSliderState(input);
      }
    }

    for (const input of this.contentArea.querySelectorAll<HTMLInputElement>("input[type='hidden']")) {
      const name = input.name;
      const label = this.contentArea.querySelector<HTMLElement>(`[data-select-value-for='${name}']`);
      const option = this.contentArea.querySelector<HTMLElement>(`.strata-settings__select-option[data-value='${input.value}']`);
      if (label && option) {
        label.textContent = option.textContent;
      }
      this.updateDropdownSelection(name);
    }

    this.setToggleState("pixelSnap", settings.pixelSnap);
    this.setToggleState("holdToMine", settings.holdToMine);
    this.setToggleState("showCoordinates", settings.showCoordinates);
  }

  private readInputs(): GameSettings {
    return {
      masterVolume: this.readNumber("masterVolume"),
      ambienceVolume: this.readNumber("ambienceVolume"),
      sfxVolume: this.readNumber("sfxVolume"),
      outputMode: "stereo", // default value since UI was removed
      fov: this.readNumber("fov"),
      pixelSnap: this.readToggle("pixelSnap"),
      holdToMine: this.readToggle("holdToMine"),
      showCoordinates: this.readToggle("showCoordinates"),
    };
  }

  private readNumber(name: string) {
    return Number((this.contentArea.querySelector(`[name='${name}']`) as HTMLInputElement).value);
  }

  private readToggle(name: string) {
    return (this.contentArea.querySelector(`[data-toggle-for='${name}']`) as HTMLButtonElement).dataset.state === "on";
  }

  private updateResponsiveLayout() {
    const stacked = window.innerWidth < 900;
    this.mainLayout.style.gridTemplateColumns = stacked ? "1fr" : "208px minmax(0, 1fr)";
  }

  private updateSliderState(input: HTMLInputElement) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

    input.style.setProperty("--fill", `${percent}%`);

    const valueDisplay = this.contentArea.querySelector<HTMLElement>(`[data-value-for='${input.name}']`);
    if (valueDisplay) {
      valueDisplay.textContent = this.formatSliderValue(input, value);
    }
  }

  private formatSliderValue(input: HTMLInputElement, value: number) {
    const decimals = Number(input.dataset.decimals || 0);
    const unit = input.dataset.unit || "";
    const fixed = value.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
    return `${fixed}${unit}`;
  }

  private iconMarkup(iconName: string, alt: string) {
    return `<img src="${this.iconBase}/${iconName}" alt="${alt}" width="16" height="16" style="display:block;image-rendering:pixelated" />`;
  }

  private getStyles() {
    return `
      .strata-settings {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1000;
        color: #f6ecc8;
        font-family: Inter, sans-serif;
      }

      .strata-settings *,
      .strata-settings *::before,
      .strata-settings *::after {
        box-sizing: border-box;
      }

      .strata-settings button,
      .strata-settings select,
      .strata-settings input {
        image-rendering: pixelated;
      }

      .strata-settings__launcher {
        position: absolute;
        top: 14px;
        right: 14px;
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        min-height: 42px;
        border: 0;
        background: linear-gradient(180deg, #253c74 0%, #162454 100%);
        color: #efe4b9;
        box-shadow:
          inset 0 0 0 2px #314c92,
          inset 0 0 0 4px #0b1531,
          0 0 0 2px #e9ddb7,
          0 0 0 4px #091127,
          0 6px 0 #070d1d;
        text-transform: uppercase;
      }

      .strata-settings__launcher:hover,
      .strata-settings__close:hover,
      .strata-settings__tab:hover,
      .strata-settings__action:hover,
      .strata-settings__toggle:hover,
      .strata-settings__select:hover {
        filter: brightness(1.08);
      }

      .strata-settings__launcher:active,
      .strata-settings__close:active,
      .strata-settings__tab:active,
      .strata-settings__action:active,
      .strata-settings__toggle:active {
        transform: translateY(2px);
      }

      .strata-settings__launcher-label,
      .strata-settings__tab-label,
      .strata-settings__title,
      .strata-settings__section-title,
      .strata-settings__action,
      .strata-settings__close,
      .strata-settings__sidebar-label,
      .strata-settings__value,
      .strata-settings__toggle-light {
        font-family: monogram, monospace;
        text-transform: uppercase;
        -webkit-font-smoothing: none;
        font-smooth: never;
      }

      .strata-settings__launcher-label {
        font-size: 20px;
        line-height: 1;
        letter-spacing: 0.06em;
      }

      .strata-settings__backdrop {
        position: absolute;
        inset: 0;
        pointer-events: auto;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background:
          linear-gradient(rgba(6, 9, 22, 0.78), rgba(6, 9, 22, 0.88)),
          repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 6px),
          radial-gradient(circle at top, rgba(58, 95, 178, 0.22), transparent 40%);
      }

      .strata-settings__panel {
        width: min(920px, calc(100vw - 28px));
        max-height: min(760px, calc(100vh - 28px));
        overflow: auto;
        padding: 18px;
        background: linear-gradient(180deg, #182548 0%, #0d1631 38%, #091124 100%);
        scrollbar-width: thin;
        scrollbar-color: #4066bb #081126;
        box-shadow:
          inset 0 0 0 2px #324f95,
          inset 0 0 0 6px #0b1532,
          0 0 0 2px #f0e6c3,
          0 0 0 6px #050a18,
          0 14px 0 rgba(3, 6, 14, 0.95),
          0 22px 48px rgba(0, 0, 0, 0.58);
      }

      .strata-settings__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .strata-settings__title-wrap {
        display: grid;
        gap: 8px;
      }

      .strata-settings__title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 28px;
        line-height: 1;
        letter-spacing: 0.06em;
        color: #f5e9c1;
        text-shadow: 2px 2px 0 #0b1531;
      }

      .strata-settings__subtitle {
        max-width: 520px;
        color: #b2bfdc;
        font-size: 14px;
        line-height: 1.4;
      }

      .strata-settings__close {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        min-height: 42px;
        border: 0;
        background: linear-gradient(180deg, #a55260 0%, #7c3144 100%);
        color: #fff0dc;
        box-shadow:
          inset 0 0 0 2px #c07080,
          inset 0 0 0 4px #4e1727,
          0 0 0 2px #f2e6c4,
          0 0 0 4px #091127,
          0 5px 0 #3a1320;
        font-size: 20px;
        line-height: 1;
        letter-spacing: 0.06em;
      }

      .strata-settings__layout {
        display: grid;
        gap: 18px;
        align-items: start;
      }

      .strata-settings__sidebar,
      .strata-settings__content {
        min-width: 0;
      }

      .strata-settings__sidebar {
        display: grid;
        gap: 10px;
        align-content: start;
        padding: 14px;
        background: linear-gradient(180deg, rgba(15, 26, 56, 0.95), rgba(8, 16, 36, 0.98));
        box-shadow:
          inset 0 0 0 2px #213a70,
          inset 0 0 0 4px #0a132c,
          0 0 0 2px rgba(240, 230, 195, 0.75);
      }

      .strata-settings__sidebar-label {
        padding: 4px 6px 8px;
        color: #f4d679;
        font-size: 18px;
        letter-spacing: 0.08em;
      }

      .strata-settings__tab {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        width: 100%;
        padding: 12px 12px 12px 10px;
        border: 0;
        background: linear-gradient(180deg, #121d40 0%, #0c1531 100%);
        color: #dfe8ff;
        box-shadow:
          inset 0 0 0 2px #203867,
          inset 0 0 0 4px #091127,
          0 0 0 2px rgba(239, 229, 189, 0.18);
        text-align: left;
      }

      .strata-settings__tab[data-active='true'] {
        background: linear-gradient(180deg, #3c61bf 0%, #29478c 100%);
        color: #fff5d8;
        box-shadow:
          inset 0 0 0 2px #6c8fe5,
          inset 0 0 0 4px #182d65,
          0 0 0 2px #f2e5bc,
          0 5px 0 #172751;
      }

      .strata-settings__tab-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .strata-settings__tab-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .strata-settings__tab-label {
        font-size: 20px;
        line-height: 1;
        letter-spacing: 0.06em;
      }

      .strata-settings__tab-note {
        color: rgba(233, 240, 255, 0.75);
        font-size: 12px;
        line-height: 1.25;
      }

      .strata-settings__content {
        padding: 14px;
        background: linear-gradient(180deg, rgba(13, 23, 50, 0.96), rgba(8, 15, 33, 0.98));
        box-shadow:
          inset 0 0 0 2px #223a6e,
          inset 0 0 0 4px #091127,
          0 0 0 2px rgba(240, 230, 195, 0.75);
      }

      .strata-settings__section {
        display: grid;
        gap: 16px;
      }

      .strata-settings__section-head {
        display: grid;
        padding: 12px 14px;
        background: linear-gradient(180deg, rgba(43, 68, 128, 0.46), rgba(17, 29, 62, 0.42));
        box-shadow:
          inset 0 0 0 2px #284679,
          inset 0 0 0 4px #0c1632;
      }

      .strata-settings__section-title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 24px;
        line-height: 1;
        letter-spacing: 0.06em;
        color: #f5e7b0;
      }

      .strata-settings__section-body {
        display: grid;
        gap: 12px;
      }

      .strata-settings__field {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
        gap: 16px;
        align-items: center;
        padding: 14px;
        background: linear-gradient(180deg, rgba(9, 17, 37, 0.92), rgba(4, 10, 23, 0.96));
        box-shadow:
          inset 0 0 0 2px #162b55,
          inset 0 0 0 4px #050d20,
          0 0 0 2px rgba(240, 230, 195, 0.08);
      }

      .strata-settings__field-meta {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .strata-settings__field-title {
        color: #fff1cb;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.2;
      }

      .strata-settings__field-copy {
        color: #93a4c8;
        font-size: 13px;
        line-height: 1.45;
      }

      .strata-settings__field-control {
        min-width: 0;
        display: flex;
        justify-content: flex-end;
      }

      .strata-settings__slider-stack {
        width: min(100%, 300px);
        display: grid;
        gap: 10px;
      }

      .strata-settings__value {
        justify-self: start;
        min-width: 92px;
        padding: 8px 10px 6px;
        background: linear-gradient(180deg, #223862 0%, #142345 100%);
        color: #9df4f8;
        box-shadow:
          inset 0 0 0 2px #325b98,
          inset 0 0 0 4px #09132d,
          0 0 0 2px rgba(243, 234, 204, 0.18);
        font-size: 22px;
        line-height: 1;
        letter-spacing: 0.04em;
        text-align: center;
      }

      .strata-settings__range {
        --fill: 50%;
        appearance: none;
        width: 100%;
        height: 20px;
        margin: 0;
        border: 0;
        outline: none;
        background: linear-gradient(90deg, #78f0b0 0, #78f0b0 var(--fill), #374665 var(--fill), #374665 100%);
        box-shadow:
          inset 0 0 0 2px #091127,
          0 0 0 2px #f0e6c3;
      }

      .strata-settings__range::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 28px;
        border: 0;
        background: linear-gradient(180deg, #f7e49e 0%, #cfa84e 100%);
        box-shadow:
          inset 0 0 0 2px #fdf1bf,
          inset 0 0 0 4px #8a6427,
          0 0 0 2px #091127;
      }

      .strata-settings__range::-moz-range-thumb {
        width: 18px;
        height: 28px;
        border: 0;
        border-radius: 0;
        background: linear-gradient(180deg, #f7e49e 0%, #cfa84e 100%);
        box-shadow:
          inset 0 0 0 2px #fdf1bf,
          inset 0 0 0 4px #8a6427,
          0 0 0 2px #091127;
      }

      .strata-settings__range::-moz-range-track {
        height: 20px;
        border: 0;
        border-radius: 0;
        background: linear-gradient(90deg, #78f0b0 0, #78f0b0 var(--fill), #374665 var(--fill), #374665 100%);
        box-shadow:
          inset 0 0 0 2px #091127,
          0 0 0 2px #f0e6c3;
      }

      .strata-settings__toggle {
        min-width: 220px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        align-items: center;
        padding: 8px;
        border: 0;
        background: linear-gradient(180deg, #1a2f2a 0%, #12221d 100%);
        color: #ebf7ef;
        box-shadow:
          inset 0 0 0 2px #244b3c,
          inset 0 0 0 4px #091127,
          0 0 0 2px rgba(240, 230, 195, 0.12);
      }

      .strata-settings__toggle[data-on='false'] {
        background: linear-gradient(180deg, #3b2227 0%, #261419 100%);
        box-shadow:
          inset 0 0 0 2px #69404a,
          inset 0 0 0 4px #091127,
          0 0 0 2px rgba(240, 230, 195, 0.12);
      }

      .strata-settings__toggle-light {
        flex: 0 0 68px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 0 8px;
        background: linear-gradient(180deg, #7af0b1 0%, #36a964 100%);
        color: #051109;
        box-shadow:
          inset 0 0 0 2px #bff8d4,
          inset 0 0 0 4px #0d3e24,
          0 0 0 2px #091127;
        font-size: 18px;
        line-height: 1;
        letter-spacing: 0.04em;
      }

      .strata-settings__toggle[data-on='false'] .strata-settings__toggle-light {
        background: linear-gradient(180deg, #f19cae 0%, #bb526d 100%);
        color: #1b090f;
        box-shadow:
          inset 0 0 0 2px #ffd4dd,
          inset 0 0 0 4px #6a2235,
          0 0 0 2px #091127;
      }

      .strata-settings__toggle[data-on='true'] .strata-settings__toggle-light {
        order: 2;
      }

      .strata-settings__toggle-text {
        flex: 1 1 auto;
        color: #f0e7c6;
        font-size: 14px;
        font-weight: 700;
        text-align: left;
      }

      .strata-settings__toggle[data-on='true'] .strata-settings__toggle-text {
        order: 1;
        text-align: right;
      }

      .strata-settings__select-wrap {
        position: relative;
        width: min(100%, 220px);
      }

      .strata-settings__select {
        width: 100%;
        min-height: 44px;
        padding: 10px 12px;
        border: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: linear-gradient(180deg, #223862 0%, #142345 100%);
        color: #f8f0d0;
        box-shadow:
          inset 0 0 0 2px #325b98,
          inset 0 0 0 4px #09132d,
          0 0 0 2px rgba(243, 234, 204, 0.18);
        font-size: 15px;
        font-weight: 700;
      }

      .strata-settings__select-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .strata-settings__select-menu {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 6px);
        z-index: 20;
        display: none;
        padding: 6px;
        background: linear-gradient(180deg, #1a2a54 0%, #10203f 100%);
        box-shadow:
          inset 0 0 0 2px #4168c3,
          inset 0 0 0 4px #0b1531,
          0 0 0 2px #f0e6c3,
          0 6px 0 #091127;
      }

      .strata-settings__select-wrap[data-open='true'] .strata-settings__select-menu {
        display: grid;
        gap: 4px;
      }

      .strata-settings__select-wrap[data-open='true'] .strata-settings__select {
        filter: brightness(1.08);
      }

      .strata-settings__select-option {
        width: 100%;
        min-height: 36px;
        border: 0;
        padding: 8px 10px;
        text-align: left;
        background: linear-gradient(180deg, #142345 0%, #0e1933 100%);
        color: #f8f0d0;
        box-shadow:
          inset 0 0 0 2px #2e4f90,
          inset 0 0 0 4px #081126;
        font-size: 14px;
        font-weight: 700;
      }

      .strata-settings__select-option:hover,
      .strata-settings__select-option[data-selected='true'] {
        background: linear-gradient(180deg, #3d61b8 0%, #274689 100%);
        color: #fff6d8;
        box-shadow:
          inset 0 0 0 2px #7d9af0,
          inset 0 0 0 4px #162b5f;
      }

      .strata-settings__select-arrow {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #ffe28f;
        font-family: monogram, monospace;
        font-size: 20px;
        line-height: 1;
      }

      .strata-settings__footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
        flex-wrap: wrap;
      }

      .strata-settings__panel::-webkit-scrollbar {
        width: 14px;
      }

      .strata-settings__panel::-webkit-scrollbar-track {
        background: #081126;
        box-shadow:
          inset 0 0 0 2px #050b18,
          inset 0 0 0 4px #142345;
      }

      .strata-settings__panel::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #4a72cc 0%, #2e4e98 100%);
        box-shadow:
          inset 0 0 0 2px #86a3ef,
          inset 0 0 0 4px #17305f,
          0 0 0 2px #f0e6c3;
      }

      .strata-settings__panel::-webkit-scrollbar-corner {
        background: #081126;
      }

      .strata-settings__action {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        padding: 10px 14px;
        border: 0;
        color: #fff6da;
        font-size: 20px;
        line-height: 1;
        letter-spacing: 0.06em;
      }

      .strata-settings__action--danger {
        background: linear-gradient(180deg, #b25e60 0%, #8f4045 100%);
        box-shadow:
          inset 0 0 0 2px #cf8585,
          inset 0 0 0 4px #56262d,
          0 0 0 2px #f2e5c4,
          0 5px 0 #4f2428;
      }

      .strata-settings__action--confirm {
        background: linear-gradient(180deg, #4ea371 0%, #34724e 100%);
        box-shadow:
          inset 0 0 0 2px #8cd0a5,
          inset 0 0 0 4px #1f4b31,
          0 0 0 2px #f2e5c4,
          0 5px 0 #214d33;
      }

      @media (max-width: 900px) {
        .strata-settings__panel {
          padding: 16px;
        }

        .strata-settings__field {
          grid-template-columns: 1fr;
        }

        .strata-settings__field-control,
        .strata-settings__slider-stack,
        .strata-settings__select-wrap {
          width: 100%;
        }

        .strata-settings__field-control {
          justify-content: stretch;
        }
      }

      @media (max-width: 640px) {
        .strata-settings__backdrop {
          padding: 14px;
        }

        .strata-settings__header {
          align-items: stretch;
          flex-direction: column;
        }

        .strata-settings__title {
          font-size: 24px;
        }

        .strata-settings__close,
        .strata-settings__action,
        .strata-settings__toggle,
        .strata-settings__select-wrap {
          width: 100%;
        }

        .strata-settings__footer {
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}
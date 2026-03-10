const GUI_THEME_STYLE_ID = "strata-gui-theme";

export function ensureStrataGuiTheme() {
  const existing = document.getElementById(GUI_THEME_STYLE_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const styleTag = document.createElement("style");
  styleTag.id = GUI_THEME_STYLE_ID;
  styleTag.textContent = `
    .strata-gui,
    .strata-gui * {
      box-sizing: border-box;
    }

    .strata-gui {
      position: fixed;
      z-index: 920;
      pointer-events: none;
      color: #f6ecc8;
      font-family: Inter, sans-serif;
      image-rendering: pixelated;
    }

    .strata-gui__panel {
      min-width: 240px;
      padding: 12px;
      background: linear-gradient(180deg, #182548 0%, #0d1631 38%, #091124 100%);
      box-shadow:
        inset 0 0 0 2px #324f95,
        inset 0 0 0 6px #0b1532,
        0 0 0 2px #f0e6c3,
        0 0 0 6px #050a18,
        0 8px 0 rgba(3, 6, 14, 0.95),
        0 14px 32px rgba(0, 0, 0, 0.44);
    }

    .strata-gui--modal {
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        linear-gradient(rgba(6, 9, 22, 0.7), rgba(6, 9, 22, 0.82)),
        repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 6px),
        radial-gradient(circle at top, rgba(58, 95, 178, 0.18), transparent 40%);
      pointer-events: auto;
    }

    .strata-gui--modal .strata-gui__panel {
      width: min(420px, calc(100vw - 32px));
      max-height: min(560px, calc(100vh - 32px));
      overflow: auto;
      pointer-events: auto;
    }

    .strata-gui__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      padding: 8px 10px;
      background: linear-gradient(180deg, rgba(43, 68, 128, 0.46), rgba(17, 29, 62, 0.42));
      box-shadow:
        inset 0 0 0 2px #284679,
        inset 0 0 0 4px #0c1632;
    }

    .strata-gui__title-wrap {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .strata-gui__title,
    .strata-gui__badge,
    .strata-gui__row-key,
    .strata-gui__row-value {
      font-family: monogram, monospace;
      text-transform: uppercase;
      -webkit-font-smoothing: none;
      font-smooth: never;
      letter-spacing: 0.06em;
    }

    .strata-gui__title {
      font-size: 24px;
      line-height: 1;
      color: #f5e9c1;
      text-shadow: 2px 2px 0 #0b1531;
    }

    .strata-gui__badge {
      padding: 4px 8px 3px;
      font-size: 15px;
      line-height: 1;
      color: #f4d679;
      background: linear-gradient(180deg, #223862 0%, #142345 100%);
      box-shadow:
        inset 0 0 0 2px #37548d,
        inset 0 0 0 4px #0a132c;
    }

    .strata-gui__body {
      display: grid;
      gap: 8px;
    }

    .strata-gui__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      background: linear-gradient(180deg, rgba(9, 17, 37, 0.92), rgba(4, 10, 23, 0.96));
      box-shadow:
        inset 0 0 0 2px #162b55,
        inset 0 0 0 4px #050d20,
        0 0 0 2px rgba(240, 230, 195, 0.08);
    }

    .strata-gui__row-key {
      color: #fff1cb;
      font-size: 18px;
      line-height: 1;
    }

    .strata-gui__row-value {
      min-width: 48px;
      text-align: right;
      color: #f4d679;
      font-size: 18px;
      line-height: 1;
    }

    .strata-gui__hint {
      margin-top: 8px;
      color: #93a4c8;
      font-size: 12px;
      line-height: 1.35;
      text-transform: uppercase;
    }

    .strata-gui__close {
      min-width: 42px;
      min-height: 42px;
      padding: 8px 10px 6px;
      border: 0;
      background: linear-gradient(180deg, #a55260 0%, #7c3144 100%);
      color: #fff0dc;
      box-shadow:
        inset 0 0 0 2px #c07080,
        inset 0 0 0 4px #4e1727,
        0 0 0 2px #f2e6c4,
        0 0 0 4px #091127,
        0 5px 0 #3a1320;
      font-family: monogram, monospace;
      font-size: 22px;
      line-height: 1;
      text-transform: uppercase;
      -webkit-font-smoothing: none;
      font-smooth: never;
      pointer-events: auto;
    }

    .strata-gui__close:hover {
      filter: brightness(1.08);
    }

    .strata-gui__close:active {
      transform: translateY(2px);
    }

    .strata-gui__dock {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    .strata-gui__slot {
      min-width: 112px;
      padding: 10px 12px 8px;
      border: 0;
      background: linear-gradient(180deg, #121d40 0%, #0c1531 100%);
      color: #dfe8ff;
      box-shadow:
        inset 0 0 0 2px #203867,
        inset 0 0 0 4px #091127,
        0 0 0 2px rgba(239, 229, 189, 0.22),
        0 5px 0 #081020;
      pointer-events: auto;
      display: grid;
      gap: 4px;
      text-align: left;
    }

    .strata-gui__slot:hover {
      filter: brightness(1.08);
    }

    .strata-gui__slot:active {
      transform: translateY(2px);
    }

    .strata-gui__slot[data-active='true'] {
      background: linear-gradient(180deg, #3c61bf 0%, #29478c 100%);
      color: #fff5d8;
      box-shadow:
        inset 0 0 0 2px #6c8fe5,
        inset 0 0 0 4px #182d65,
        0 0 0 2px #f2e5bc,
        0 5px 0 #172751;
    }

    .strata-gui__slot-key,
    .strata-gui__slot-title {
      font-family: monogram, monospace;
      text-transform: uppercase;
      -webkit-font-smoothing: none;
      font-smooth: never;
      line-height: 1;
      letter-spacing: 0.06em;
    }

    .strata-gui__slot-key {
      color: #f4d679;
      font-size: 16px;
    }

    .strata-gui__slot-title {
      font-size: 19px;
      color: inherit;
    }

    .strata-gui__slot-copy {
      color: rgba(233, 240, 255, 0.72);
      font-size: 11px;
      line-height: 1.2;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(styleTag);
  return styleTag;
}

export function destroyStrataGuiThemeIfUnused() {
  if (document.querySelector(".strata-gui")) {
    return;
  }

  document.getElementById(GUI_THEME_STYLE_ID)?.remove();
}
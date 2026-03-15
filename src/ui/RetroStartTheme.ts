const RETRO_THEME_STYLE_ID = "retro-gui-theme";

export function ensureRetroGuiTheme() {
  const existing = document.getElementById(RETRO_THEME_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;

  const styleTag = document.createElement("style");
  styleTag.id = RETRO_THEME_STYLE_ID;
  styleTag.textContent = `
    .retro-gui,
    .retro-gui * {
      box-sizing: border-box;
      font-family: monogram, monospace;
      -webkit-font-smoothing: none;
      font-smooth: never;
    }

    .retro-gui {
      position: fixed;
      inset: 0;
      z-index: 920;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #1a1c19;
      image-rendering: pixelated;
    }

    .retro-panel {
      width: min(480px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      padding: 20px;
      border: 3px solid #e0f0d5;
      background: #1a1c19;
      position: relative;
    }

    .retro-panel::before {
      content: "";
      position: absolute;
      top: 5px; left: 5px;
      width: 5px; height: 5px;
      box-shadow:
        0 0 0 2px #1a1c19,
        0 0 0 3px #e0f0d5;
    }

    .retro-panel::after {
      content: "";
      position: absolute;
      bottom: 5px; right: 5px;
      width: 5px; height: 5px;
      box-shadow:
        0 0 0 2px #1a1c19,
        0 0 0 3px #e0f0d5;
    }

    .retro-title {
      font-size: 28px;
      text-align: center;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #e0f0d5;
    }

    .retro-menu {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .retro-btn {
      appearance: none;
      background: transparent;
      border: 2px solid #e0f0d5;
      color: #e0f0d5;
      padding: 10px 16px;
      font-size: 20px;
      font-family: monogram, monospace;
      text-transform: uppercase;
      cursor: pointer;
      text-align: center;
      width: 100%;
      display: block;
      letter-spacing: 1px;
    }

    .retro-btn:hover {
      background: #e0f0d5;
      color: #1a1c19;
    }

    .retro-btn:active {
      transform: translateY(1px);
    }

    .retro-btn--back {
      border-style: dashed;
      color: rgba(224, 240, 213, 0.6);
      border-color: rgba(224, 240, 213, 0.4);
    }

    .retro-btn--back:hover {
      background: rgba(224, 240, 213, 0.12);
      color: #e0f0d5;
    }

    .retro-btn--acc {
      font-size: 16px;
      padding: 6px 8px;
    }

    .retro-btn--active {
      background: #e0f0d5;
      color: #1a1c19;
    }

    .retro-row {
      display: flex;
      gap: 10px;
    }

    .retro-row > * {
      flex: 1;
    }

    .retro-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(224, 240, 213, 0.5);
      font-size: 14px;
      letter-spacing: 2px;
    }

    .retro-divider::before,
    .retro-divider::after {
      content: "";
      flex: 1;
      height: 2px;
      background: rgba(224, 240, 213, 0.3);
    }

    .retro-input-wrap {
      display: flex;
      align-items: center;
      border: 2px solid #e0f0d5;
      padding: 8px 10px;
    }

    .retro-input {
      background: transparent;
      border: none;
      color: #e0f0d5;
      font-size: 22px;
      font-family: monogram, monospace;
      width: 100%;
      text-transform: uppercase;
      outline: none;
      flex: 1;
    }

    .retro-input::placeholder {
      color: rgba(224, 240, 213, 0.3);
    }

    .retro-tag {
      font-size: 16px;
      color: rgba(224, 240, 213, 0.35);
      white-space: nowrap;
      padding-left: 8px;
    }

    .retro-label {
      font-size: 14px;
      color: rgba(224, 240, 213, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .retro-label--center {
      text-align: center;
      margin: 24px 0;
    }

    .retro-preview-section {
      border: 2px solid rgba(224, 240, 213, 0.25);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .retro-preview-canvas {
      image-rendering: pixelated;
      width: 96px;
      height: 96px;
      display: block;
    }

    .retro-acc-row {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .retro-acc-row > .retro-btn {
      flex: 1;
      min-width: 0;
    }

    .retro-settings-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(224, 240, 213, 0.1);
    }

    .retro-settings-label {
      flex: 1;
      font-size: 16px;
      color: rgba(224, 240, 213, 0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
    }

    .retro-settings-value {
      font-size: 16px;
      color: #e0f0d5;
      min-width: 48px;
      text-align: right;
      white-space: nowrap;
    }

    .retro-settings-row .retro-btn--acc {
      width: auto;
      flex: 0 0 auto;
      min-width: 52px;
    }

    .retro-range {
      appearance: none;
      -webkit-appearance: none;
      background: rgba(224, 240, 213, 0.15);
      height: 6px;
      width: 100px;
      outline: none;
      border: 1px solid rgba(224, 240, 213, 0.3);
    }

    .retro-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 10px;
      height: 16px;
      background: #e0f0d5;
      cursor: pointer;
      border: none;
    }

    .retro-range::-moz-range-thumb {
      width: 10px;
      height: 16px;
      background: #e0f0d5;
      cursor: pointer;
      border: none;
      border-radius: 0;
    }
  `;
  document.head.appendChild(styleTag);
  return styleTag;
}

export function destroyRetroGuiThemeIfUnused() {
  if (document.querySelector(".retro-gui")) return;
  document.getElementById(RETRO_THEME_STYLE_ID)?.remove();
}

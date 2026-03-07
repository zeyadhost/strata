export type AudioOutputMode = "mono" | "stereo";

export interface GameSettings {
  masterVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  outputMode: AudioOutputMode;
  fov: number;
  pixelSnap: boolean;
  holdToMine: boolean;
  showCoordinates: boolean;
  showOtherPlayers: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  ambienceVolume: 65,
  sfxVolume: 80,
  outputMode: "stereo",
  fov: 1,
  pixelSnap: true,
  holdToMine: false,
  showCoordinates: true,
  showOtherPlayers: true,
};

const STORAGE_KEY = "strata.settings";

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
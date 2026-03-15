import { PlayerSaveData, createEmptyInventoryState } from "../types";

const STORAGE_KEY = "strata_save_data";

export class StorageManager {
  static save(data: PlayerSaveData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }

  static load(): PlayerSaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as PlayerSaveData;
      }
    } catch {
    }
    return null;
  }

  static generateDefaultSave(): PlayerSaveData {
    return {
      username: "Miner",
      tag: "#" + Math.floor(1000 + Math.random() * 9000).toString(),
      inventory: createEmptyInventoryState(),
      coins: 0,
      unlockedPickaxes: ["wooden-pickaxe"],
      equippedPickaxe: "wooden-pickaxe",
      equippedAccessory: "accessory_miner_hat",
      coords: null,
    };
  }
}

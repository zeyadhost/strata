import pickaxeData from "../data/pickaxes.json";
import type { InventoryKey } from "../types";

export type PickaxeId =
  | "wooden-pickaxe"
  | "stone-pickaxe"
  | "iron-pickaxe"
  | "gold-pickaxe"
  | "diamond-pickaxe"
  | "flaming-pickaxe";

interface PickaxeDataEntry {
  id: PickaxeId;
  name: string;
  shortName: string;
  description: string;
  tier: number;
  miningSpeed: number;
  oreAccess: InventoryKey[];
  texture: string;
}

interface PickaxeVisual {
  accentColor: string;
}

export interface PickaxeDefinition {
  id: PickaxeId;
  name: string;
  shortName: string;
  description: string;
  tier: number;
  miningSpeed: number;
  oreAccess: InventoryKey[];
  texture: string;
  accentColor: string;
}

const PICKAXE_VISUALS: Record<PickaxeId, PickaxeVisual> = {
  "wooden-pickaxe": { accentColor: "#8dd17f" },
  "stone-pickaxe": { accentColor: "#b0b0b0" },
  "iron-pickaxe": { accentColor: "#c9d4e3" },
  "gold-pickaxe": { accentColor: "#ffcf5e" },
  "diamond-pickaxe": { accentColor: "#7de5ff" },
  "flaming-pickaxe": { accentColor: "#ff6a33" },
};

const PICKAXE_DATA = pickaxeData as PickaxeDataEntry[];

export const PICKAXE_DEFINITIONS = Object.fromEntries(
  PICKAXE_DATA.map((entry) => [
    entry.id,
    { ...entry, ...PICKAXE_VISUALS[entry.id] },
  ]),
) as Record<PickaxeId, PickaxeDefinition>;

export const PICKAXE_LIST = PICKAXE_DATA.map((entry) => PICKAXE_DEFINITIONS[entry.id]);

export const DEFAULT_PRIMARY_PICKAXE = PICKAXE_DEFINITIONS["wooden-pickaxe"];
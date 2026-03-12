import pickaxeData from "../data/pickaxes.json";
import type { InventoryKey } from "../types";

export type PickaxeId =
  | "wooden-pickaxe"
  | "copper-pickaxe"
  | "iron-pickaxe"
  | "steel-pickaxe"
  | "diamond-pickaxe";

interface PickaxeDataEntry {
  id: PickaxeId;
  name: string;
  shortName: string;
  description: string;
  tier: number;
  miningSpeed: number;
  oreAccess: InventoryKey[];
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
  accentColor: string;
}

const PICKAXE_VISUALS: Record<PickaxeId, PickaxeVisual> = {
  "wooden-pickaxe": {
    accentColor: "#8dd17f",
  },
  "copper-pickaxe": {
    accentColor: "#d89063",
  },
  "iron-pickaxe": {
    accentColor: "#c9d4e3",
  },
  "steel-pickaxe": {
    accentColor: "#9fb3d9",
  },
  "diamond-pickaxe": {
    accentColor: "#7de5ff",
  },
};

const PICKAXE_DATA = pickaxeData as PickaxeDataEntry[];

export const PICKAXE_DEFINITIONS = Object.fromEntries(
  PICKAXE_DATA.map((entry) => [
    entry.id,
    {
      ...entry,
      ...PICKAXE_VISUALS[entry.id],
    },
  ]),
) as Record<PickaxeId, PickaxeDefinition>;

export const PICKAXE_LIST = PICKAXE_DATA.map((entry) => PICKAXE_DEFINITIONS[entry.id]);

export const DEFAULT_EQUIPPED_PICKAXES = {
  primary: PICKAXE_DEFINITIONS["wooden-pickaxe"],
  secondary: PICKAXE_DEFINITIONS["iron-pickaxe"],
};
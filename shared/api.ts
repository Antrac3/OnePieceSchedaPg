/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// One Piece Character Sheet Types
export interface Characteristics {
  POT: number;
  AGI: number;
  RES: number;
  CAR: number;
  VOL: number;
  PER: number;
  combatStyle: string;
}

export interface PointsResources {
  fatigue: number; // Stanchezza
  shounen: number;
  willpower: number; // Volontà
  morale: number;
}

export interface AbilitiesCategories {
  physical: string[];
  interaction: string[];
  combat: string[];
  social: string[];
  naval: string[];
  profession: string[];
  knowledge: string[];
}

export interface StatusProgression {
  traits: string[]; // Pregi/Difetti
  qualities: string[]; // Qualità fuori dal combattimento
  alterations: { level: number; label: string }[]; // Alterazioni Liv 1-6
  level: number;
  experience: number;
}

export interface AttackEntry {
  name: string;
  style: string; // stile
  weaponType: "melee" | "ranged" | "other";
  damage: string;
  bonus: string;
}

export interface CombatData {
  defense: number;
  rd: number; // Riduzione Danno
  initiative: number;
  baseMovement: number;
  swimMovement?: number;
  flyMovement?: number;
  attacks: AttackEntry[];
  takenDamage: string; // Danni subiti e ripartiti
  tempModifiers: string; // Bonus/Malus temporanei
  techniques: string[]; // Tecniche di Combattimento
}

export interface EquipmentRelations {
  items: { name: string; notes?: string; materialPoints?: number }[];
  meleeWeapons: { name: string; notes?: string }[];
  rangedWeapons: { name: string; notes?: string }[];
  carryCapacity?: string; // Capacità di trasporto
  relations: { name: string; affinity?: string }[]; // Amicizia e Affinità
  notes: string[];
}

export interface CharacterSheet {
  id?: string;
  user_id?: string;
  name: string;
  background: string;
  dream: string;
  race: string;
  size: string;
  crew: string;
  appearance: string;
  image_url?: string;
  job: string; // Mestiere
  characteristics: Characteristics;
  points: PointsResources;
  abilities: AbilitiesCategories;
  status: StatusProgression;
  combat: CombatData;
  equipment: EquipmentRelations;
  // Health and status modifiers
  health?: {
    max: number; // PF massimo
    current: number; // PF correnti
    wounds?: number; // conteggio ferite
    malus_notes?: string; // note su malus attivi
    // per-level fields (client-side representation)
    hp_bonus_l1?: number;
    hp_bonus_l2?: number;
    hp_bonus_l3?: number;
    hp_bonus_l4?: number;
    hp_bonus_l5?: number;
    hp_bonus_l6?: number;
    hp_dmg_l1?: number;
    hp_dmg_l2?: number;
    hp_dmg_l3?: number;
    hp_dmg_l4?: number;
    hp_dmg_l5?: number;
    hp_dmg_l6?: number;
    total_damage?: number;
  };
  // Flat DB columns (optional) - kept for server/client typing
  hp_max?: number;
  hp_current?: number;
  hp_wounds?: number;
  hp_total_damage?: number;
  hp_malus_notes?: string;
  hp_bonus_l1?: number;
  hp_bonus_l2?: number;
  hp_bonus_l3?: number;
  hp_bonus_l4?: number;
  hp_bonus_l5?: number;
  hp_bonus_l6?: number;
  hp_dmg_l1?: number;
  hp_dmg_l2?: number;
  hp_dmg_l3?: number;
  hp_dmg_l4?: number;
  hp_dmg_l5?: number;
  hp_dmg_l6?: number;
  modifiers?: Record<string, number>; // es. movement: -3, AGI: -1
  created_at?: string;
  updated_at?: string;
}

export type ProfileRole = "player" | "master";
export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
  created_at?: string;
}

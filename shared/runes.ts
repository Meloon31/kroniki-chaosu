import type { ActNumber, RuneId, RuneLevels, RuneShards } from './types.js';

export const RUNE_MAX_LEVEL = 10;
export const RUNE_SHARD_DROP_CHANCE = 0.30; // 30% chance from Main Act Boss

export interface RuneDefinition {
  id: RuneId;
  act: ActNumber;
  isHardcore?: boolean;
  name: string;
  bossName: string;
  shardName: string;
  color: string;
  glowColor: string;
  icon: string;
  perLevelDescription: string;
  maxLevelDescription: string;
  formatCurrentBonus: (level: number) => string;
}

export const RUNES: Record<RuneId, RuneDefinition> = {
  malakor: {
    id: 'malakor',
    act: 1,
    name: 'Runa Malakora',
    bossName: 'Malakor, Władca Katakumb',
    shardName: 'Odłamek Runy Malakora',
    color: '#4ade80',
    glowColor: '#16a34a',
    icon: '💀',
    perLevelDescription: '+1% Max HP oraz +0.5% Redukcji Obrażeń za poziom',
    maxLevelDescription: 'Max (10/10): +10% Max HP, +5% Redukcji Obrażeń',
    formatCurrentBonus: (lvl) =>
      `+${lvl}% Max HP, +${(lvl * 0.5).toFixed(1)}% Redukcji Obrażeń`,
  },
  azirath: {
    id: 'azirath',
    act: 2,
    name: 'Runa Aziratha',
    bossName: 'Azirath, Pożeracz Wydm',
    shardName: 'Odłamek Runy Aziratha',
    color: '#facc15',
    glowColor: '#eab308',
    icon: '🦂',
    perLevelDescription: '+1% Szybkości Ataku oraz +0.5% Szybkości Ruchu za poziom',
    maxLevelDescription: 'Max (10/10): +10% Szybkości Ataku, +5% Szybkości Ruchu',
    formatCurrentBonus: (lvl) =>
      `+${lvl}% Szyb. Ataku, +${(lvl * 0.5).toFixed(1)}% Szyb. Ruchu`,
  },
  sylvara: {
    id: 'sylvara',
    act: 3,
    name: 'Runa Sylwary',
    bossName: 'Sylvara, Matka Cierni',
    shardName: 'Odłamek Runy Sylwary',
    color: '#c084fc',
    glowColor: '#9333ea',
    icon: '🌿',
    perLevelDescription: '+0.8% Szansy na Kryt oraz +1% Obrażeń Krytycznych za poziom',
    maxLevelDescription: 'Max (10/10): +8% Szansy na Kryt, +10% Obrażeń Krytycznych',
    formatCurrentBonus: (lvl) =>
      `+${(lvl * 0.8).toFixed(1)}% Kryt, +${lvl}% Obr. Kryt.`,
  },
  vaelgor: {
    id: 'vaelgor',
    act: 4,
    name: 'Runa Vaelgora',
    bossName: 'Vaelgor, Archont Chaosu',
    shardName: 'Odłamek Runy Vaelgora',
    color: '#f43f5e',
    glowColor: '#e11d48',
    icon: '🔥',
    perLevelDescription: '+1% AD i AP oraz +0.5% Skrócenia Czasu Odnowienia (CDR) za poziom',
    maxLevelDescription: 'Max (10/10): +10% AD/AP, +5% CDR',
    formatCurrentBonus: (lvl) =>
      `+${lvl}% AD i AP, +${(lvl * 0.5).toFixed(1)}% CDR`,
  },

  // =========================================================
  // HARDCORE RUNES (Akty 5, 6, 7 — Unikalne Bonusy Endgame!)
  // =========================================================
  kaelis: {
    id: 'kaelis',
    act: 5,
    isHardcore: true,
    name: 'Runa Kaelisa (HC)',
    bossName: 'Kaelis, Władca Wiecznej Zimy',
    shardName: 'Odłamek Runy Kaelisa',
    color: '#38bdf8',
    glowColor: '#0284c7',
    icon: '❄️',
    perLevelDescription: '+1.5% Obrażeń vs Bossy/Elity, +1.0% Redukcji Obrażeń oraz +1.2% Uniku za poziom',
    maxLevelDescription: 'Max (10/10): +15% DMG vs Bossy, +10% Redukcji, +12% Uniku',
    formatCurrentBonus: (lvl) =>
      `+${(lvl * 1.5).toFixed(1)}% DMG vs Bossy, +${lvl}% Redukcji, +${(lvl * 1.2).toFixed(1)}% Uniku`,
  },
  ignarok: {
    id: 'ignarok',
    act: 6,
    isHardcore: true,
    name: 'Runa Ignaroka (HC)',
    bossName: 'Ignarok, Kolos Prakuźni',
    shardName: 'Odłamek Runy Ignaroka',
    color: '#fb923c',
    glowColor: '#ea580c',
    icon: '🔨',
    perLevelDescription: '+2.0% Obrony (DEF), +1.5% Max HP oraz +1.5% Mocy Leczenia i Tarcz za poziom',
    maxLevelDescription: 'Max (10/10): +20% DEF, +15% Max HP, +15% Leczenia & Tarcz',
    formatCurrentBonus: (lvl) =>
      `+${(lvl * 2).toFixed(0)}% DEF, +${(lvl * 1.5).toFixed(1)}% HP, +${(lvl * 1.5).toFixed(1)}% Leczenia`,
  },
  aeternus: {
    id: 'aeternus',
    act: 7,
    isHardcore: true,
    name: 'Runa Aeternusa (HC)',
    bossName: 'Aeternus, Cesarz Wieczności',
    shardName: 'Odłamek Runy Aeternusa',
    color: '#00f5d4',
    glowColor: '#0d9488',
    icon: '👑',
    perLevelDescription: '+1.8% AD i AP, +1.2% Kryt, +2.0% Obr. Kryt. oraz +0.8% CDR za poziom',
    maxLevelDescription: 'Max (10/10): +18% AD/AP, +12% Kryt, +20% Obr. Kryt., +8% CDR',
    formatCurrentBonus: (lvl) =>
      `+${(lvl * 1.8).toFixed(1)}% AD/AP, +${(lvl * 1.2).toFixed(1)}% Kryt, +${lvl * 2}% Obr. Kryt., +${(lvl * 0.8).toFixed(1)}% CDR`,
  },
};

export const STANDARD_RUNE_LIST: RuneDefinition[] = [
  RUNES.malakor,
  RUNES.azirath,
  RUNES.sylvara,
  RUNES.vaelgor,
];

export const HARDCORE_RUNE_LIST: RuneDefinition[] = [
  RUNES.kaelis,
  RUNES.ignarok,
  RUNES.aeternus,
];

export const RUNE_LIST: RuneDefinition[] = [
  ...STANDARD_RUNE_LIST,
  ...HARDCORE_RUNE_LIST,
];

export function getRuneByAct(act: ActNumber): RuneDefinition {
  const map: Record<ActNumber, RuneId> = {
    1: 'malakor',
    2: 'azirath',
    3: 'sylvara',
    4: 'vaelgor',
    5: 'kaelis',
    6: 'ignarok',
    7: 'aeternus',
  };
  return RUNES[map[act]];
}

export function createStarterRunes(): RuneLevels {
  return {
    malakor: 0,
    azirath: 0,
    sylvara: 0,
    vaelgor: 0,
    kaelis: 0,
    ignarok: 0,
    aeternus: 0,
  };
}

export function createStarterRuneShards(): RuneShards {
  return {
    malakor: 0,
    azirath: 0,
    sylvara: 0,
    vaelgor: 0,
    kaelis: 0,
    ignarok: 0,
    aeternus: 0,
  };
}

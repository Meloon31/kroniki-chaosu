import type { ActNumber, RuneId, RuneLevels, RuneShards } from './types.js';

export const RUNE_MAX_LEVEL = 10;
export const RUNE_SHARD_DROP_CHANCE = 0.30; // 30% chance from Main Act Boss

export interface RuneDefinition {
  id: RuneId;
  act: ActNumber;
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
};

export const RUNE_LIST: RuneDefinition[] = [
  RUNES.malakor,
  RUNES.azirath,
  RUNES.sylvara,
  RUNES.vaelgor,
];

export function getRuneByAct(act: ActNumber): RuneDefinition {
  const map: Record<ActNumber, RuneId> = {
    1: 'malakor',
    2: 'azirath',
    3: 'sylvara',
    4: 'vaelgor',
  };
  return RUNES[map[act]];
}

export function createStarterRunes(): RuneLevels {
  return { malakor: 0, azirath: 0, sylvara: 0, vaelgor: 0 };
}

export function createStarterRuneShards(): RuneShards {
  return { malakor: 0, azirath: 0, sylvara: 0, vaelgor: 0 };
}

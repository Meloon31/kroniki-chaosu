import type {
  ClassId,
  EquipmentItem,
  EquipSlot,
  ItemBonusStats,
  Rarity,
  ShardBag,
} from './types.js';

export const RARITY_ORDER: Rarity[] = [
  'zwykly',
  'normalny',
  'mityczny',
  'legendarny',
  'boski',
];

export const EQUIP_SLOTS: EquipSlot[] = [
  'bron',
  'helm',
  'zbroja',
  'rekawice',
  'buty',
  'amulet',
];

export const SLOT_LABELS: Record<EquipSlot, { name: string; icon: string }> = {
  bron: { name: 'Broń', icon: '⚔️' },
  helm: { name: 'Hełm', icon: '🪖' },
  zbroja: { name: 'Zbroja', icon: '🛡️' },
  rekawice: { name: 'Rękawice', icon: '🧤' },
  buty: { name: 'Buty', icon: '👢' },
  amulet: { name: 'Amulet', icon: '📿' },
};

export interface RarityMeta {
  id: Rarity;
  name: string;
  shardName: string;
  dropChancePct: number; // Exact table: 80, 40, 15, 5, 0.5
  color: string;
  beamColor: string;
  glowColor: string;
  badgeBg: string;
  baseMultiplier: number;
  bonusCount: [number, number];
  bonusScale: number;
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  zwykly: {
    id: 'zwykly',
    name: 'Zwykły',
    shardName: 'Zwykły Odłamek',
    dropChancePct: 80,
    color: '#e5e7eb',
    beamColor: '#d1d5db',
    glowColor: '#9ca3af',
    badgeBg: '#4b5563',
    baseMultiplier: 1.0,
    bonusCount: [0, 0],
    bonusScale: 0,
  },
  normalny: {
    id: 'normalny',
    name: 'Normalny',
    shardName: 'Normalny Odłamek',
    dropChancePct: 40,
    color: '#4ade80',
    beamColor: '#22c55e',
    glowColor: '#16a34a',
    badgeBg: '#15803d',
    baseMultiplier: 1.28,
    bonusCount: [0, 1],
    bonusScale: 0.35,
  },
  mityczny: {
    id: 'mityczny',
    name: 'Mityczny',
    shardName: 'Mityczny Odłamek',
    dropChancePct: 15,
    color: '#a78bfa',
    beamColor: '#8b5cf6',
    glowColor: '#6366f1',
    badgeBg: '#5b21b6',
    baseMultiplier: 1.72,
    bonusCount: [2, 2],
    bonusScale: 0.72,
  },
  legendarny: {
    id: 'legendarny',
    name: 'Legendarny',
    shardName: 'Legendarny Odłamek',
    dropChancePct: 5,
    color: '#fbbf24',
    beamColor: '#f59e0b',
    glowColor: '#ea580c',
    badgeBg: '#b45309',
    baseMultiplier: 2.28,
    bonusCount: [3, 3],
    bonusScale: 1.05,
  },
  boski: {
    id: 'boski',
    name: 'Boski',
    shardName: 'Boski Odłamek',
    dropChancePct: 0.5,
    color: '#fb7185',
    beamColor: '#f43f5e',
    glowColor: '#ec4899',
    badgeBg: '#9f1239',
    baseMultiplier: 2.72,
    bonusCount: [4, 4],
    bonusScale: 1.42,
  },
};

export const MAX_UPGRADE_LEVEL = 13;

/**
 * Calibrated +0..+13 upgrade stat curve:
 * +1..+6: +8% per level (+6 = 1.48x)
 * +7..+13: +12% per level (+7 = 1.60x, +9 = 1.84x, +13 = 2.32x)
 * Creates clear progression gates (+7 for Act 2/3, +9 for Act 4) without breaking endgame balance!
 */
export function getUpgradeStatMultiplier(upgradeLevel: number): number {
  const lvl = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, upgradeLevel));
  if (lvl <= 6) {
    return 1 + lvl * 0.08;
  }
  return 1 + 6 * 0.08 + (lvl - 6) * 0.12;
}

export function getUpgradeShardCost(currentLevel: number): number {
  const costs = [1, 1, 2, 2, 3, 4, 6, 9, 13, 18, 24, 32, 42];
  if (currentLevel < 0 || currentLevel >= MAX_UPGRADE_LEVEL) return 0;
  return costs[currentLevel];
}

export function getSalvageShardYield(item: EquipmentItem): number {
  const baseByRarity: Record<Rarity, number> = {
    zwykly: 1,
    normalny: 1,
    mityczny: 2,
    legendarny: 2,
    boski: 3,
  };
  return baseByRarity[item.rarity] + Math.floor(item.upgradeLevel * 0.8);
}

export function getEffectiveItemBaseStats(item: EquipmentItem) {
  const mult = getUpgradeStatMultiplier(item.upgradeLevel);
  return {
    hp: Math.round(item.baseStats.hp * mult),
    ad: Math.round(item.baseStats.ad * mult),
    ap: Math.round(item.baseStats.ap * mult),
    def: Math.round(item.baseStats.def * mult),
  };
}

export interface FullSetBonusValues {
  adPct?: number;
  apPct?: number;
  hpPct?: number;
  defPct?: number;
  attackSpeedPct?: number;
  moveSpeedPct?: number;
  healPowerPct?: number;
  shieldPowerPct?: number;
  cdrPct?: number;
  summary: string;
}

/**
 * Balanced Full Set Bonus scaling (rewarding 6/6 completion without enabling one-shots or immortality).
 */
const SET_TIER_SCALE: Record<Rarity, number> = {
  zwykly: 0.55,
  normalny: 0.85,
  mityczny: 1.25,
  legendarny: 1.75,
  boski: 2.3,
};

export function getFullSetBonus(classId: ClassId, rarity: Rarity): FullSetBonusValues {
  const s = SET_TIER_SCALE[rarity];
  switch (classId) {
    case 'wojownik': {
      const adPct = Math.round(8 * s);
      return {
        adPct,
        summary: `+${adPct}% Ataku Fizycznego (AD)`,
      };
    }
    case 'czarnoksieznik': {
      const apPct = Math.round(8 * s);
      return {
        apPct,
        summary: `+${apPct}% Ataku Magicznego (AP)`,
      };
    }
    case 'krasnolud': {
      const hpPct = Math.round(7 * s);
      const defPct = Math.round(8 * s);
      return {
        hpPct,
        defPct,
        summary: `+${hpPct}% Max HP, +${defPct}% Obrony (DEF)`,
      };
    }
    case 'elf': {
      const adPct = Math.round(5.5 * s);
      const apPct = Math.round(5.5 * s);
      const attackSpeedPct = Math.round(4 * s);
      const moveSpeedPct = Math.round(3 * s);
      return {
        adPct,
        apPct,
        attackSpeedPct,
        moveSpeedPct,
        summary: `+${adPct}% AD & AP, +${attackSpeedPct}% Szyb. Ataku, +${moveSpeedPct}% Szyb. Ruchu`,
      };
    }
    case 'wrozka': {
      const healPowerPct = Math.round(7 * s);
      const shieldPowerPct = Math.round(7 * s);
      const cdrPct = Math.round(3.5 * s);
      return {
        healPowerPct,
        shieldPowerPct,
        cdrPct,
        summary: `+${healPowerPct}% Leczenia, +${shieldPowerPct}% Tarcz, +${cdrPct}% CDR`,
      };
    }
  }
}

export function rollDropRarity(
  rng: () => number = Math.random,
  guaranteeDrop = false,
  luckBonus = 1.0
): Rarity | null {
  if (rng() * 100 < 0.5 * luckBonus) return 'boski';
  if (rng() * 100 < 5.0 * luckBonus) return 'legendarny';
  if (rng() * 100 < 15.0 * luckBonus) return 'mityczny';
  if (rng() * 100 < 40.0 * luckBonus) return 'normalny';
  if (guaranteeDrop || rng() * 100 < 80.0) return 'zwykly';
  return null;
}

const SLOT_PREFIXES: Record<Rarity, string[]> = {
  zwykly: ['Stary', 'Prosty', 'Podniszczony', 'Żelazny', 'Wędrowny'],
  normalny: ['Solidny', 'Kuty', 'Rycerski', 'Wzmocniony', 'Bojowy'],
  mityczny: ['Mityczny', 'Runiczny', 'Gwiezdny', 'Tajemny', 'Księżycowy'],
  legendarny: ['Legendarny', 'Smoczy', 'Królewski', 'Płomienny', 'Niebiański'],
  boski: ['Boski', 'Pradawny', 'Wieczny', 'Karmazynowy', 'Archoncki'],
};

const SLOT_NOUNS: Record<EquipSlot, string[]> = {
  bron: ['Miecz', 'Młot', 'Kostur', 'Łuk', 'Różdżka', 'Ostrze'],
  helm: ['Hełm', 'Korona', 'Kaptur', 'Diadem', 'Przyłbica'],
  zbroja: ['Napierśnik', 'Szata', 'Kolczuga', 'Pancerz', 'Tunika'],
  rekawice: ['Rękawice', 'Karwasze', 'Naramienniki', 'Chwytaki'],
  buty: ['Buty', 'Nagolenniki', 'Trzewiki', 'Sandały Wiatru'],
  amulet: ['Amulet', 'Talizman', 'Medalion', 'Serce Run'],
};

const SUFFIXES: Record<Rarity, string[]> = {
  zwykly: ['Rekruta', 'Piechura', 'Zwiadowcy'],
  normalny: ['Weterana', 'Strażnika', 'Czeladnika'],
  mityczny: ['Mrozu', 'Burzy', 'Cienia', 'Światła'],
  legendarny: ['Tytanów', 'Katakumb', 'Pustyni', 'Lasu'],
  boski: ['Chaosu', 'Nieskończoności', 'Stworzenia', 'Przeznaczenia'],
};

let itemSeq = 1;

export function generateEquipmentItem(
  itemLevel: number,
  rarity: Rarity,
  preferredSlot?: EquipSlot,
  classAffinity?: ClassId,
  rng: () => number = Math.random
): EquipmentItem {
  const lvl = Math.max(1, Math.min(60, Math.round(itemLevel)));
  const slot = preferredSlot ?? EQUIP_SLOTS[Math.floor(rng() * EQUIP_SLOTS.length)];
  const meta = RARITY_META[rarity];

  // Controlled power growth from lvl 1 to lvl 60
  const lvlScale = (1 + (lvl - 1) * 0.16 + Math.pow(lvl, 1.24) * 0.024) * meta.baseMultiplier;
  const jitter = () => 0.93 + rng() * 0.14;

  const baseStats = { hp: 0, ad: 0, ap: 0, def: 0 };
  switch (slot) {
    case 'bron':
      baseStats.ad = Math.round(9.5 * lvlScale * jitter());
      baseStats.ap = Math.round(9.5 * lvlScale * jitter());
      break;
    case 'helm':
      baseStats.hp = Math.round(24 * lvlScale * jitter());
      baseStats.def = Math.round(4.4 * lvlScale * jitter());
      break;
    case 'zbroja':
      baseStats.hp = Math.round(44 * lvlScale * jitter());
      baseStats.def = Math.round(7.8 * lvlScale * jitter());
      break;
    case 'rekawice':
      baseStats.ad = Math.round(4.5 * lvlScale * jitter());
      baseStats.ap = Math.round(4.5 * lvlScale * jitter());
      baseStats.def = Math.round(3.5 * lvlScale * jitter());
      break;
    case 'buty':
      baseStats.hp = Math.round(20 * lvlScale * jitter());
      baseStats.def = Math.round(4.2 * lvlScale * jitter());
      break;
    case 'amulet':
      baseStats.hp = Math.round(18 * lvlScale * jitter());
      baseStats.ad = Math.round(5.5 * lvlScale * jitter());
      baseStats.ap = Math.round(5.5 * lvlScale * jitter());
      break;
  }

  const bonusStats: ItemBonusStats = {};
  const [minBonuses, maxBonuses] = meta.bonusCount;
  const numBonuses =
    minBonuses === maxBonuses
      ? minBonuses
      : minBonuses + Math.floor(rng() * (maxBonuses - minBonuses + 1));

  if (numBonuses > 0 && meta.bonusScale > 0) {
    const pool: Array<keyof ItemBonusStats> = [
      'hp',
      'ad',
      'ap',
      'def',
      'critChance',
      'critDamage',
      'attackSpeed',
      'moveSpeed',
      'cdr',
      'healPower',
      'dodge',
    ];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, numBonuses);
    const s = meta.bonusScale;
    for (const stat of chosen) {
      switch (stat) {
        case 'hp':
          bonusStats.hp = Math.round((12 + lvl * 2.6) * s * jitter());
          break;
        case 'ad':
          bonusStats.ad = Math.round((2.5 + lvl * 0.65) * s * jitter());
          break;
        case 'ap':
          bonusStats.ap = Math.round((2.5 + lvl * 0.65) * s * jitter());
          break;
        case 'def':
          bonusStats.def = Math.round((1.8 + lvl * 0.4) * s * jitter());
          break;
        case 'critChance':
          bonusStats.critChance = Number(((0.9 + lvl * 0.025) * s * jitter()).toFixed(1));
          break;
        case 'critDamage':
          bonusStats.critDamage = Math.round((3.5 + lvl * 0.12) * s * jitter());
          break;
        case 'attackSpeed':
          bonusStats.attackSpeed = Number(((1.2 + lvl * 0.03) * s * jitter()).toFixed(1));
          break;
        case 'moveSpeed':
          bonusStats.moveSpeed = Number(((0.9 + lvl * 0.02) * s * jitter()).toFixed(1));
          break;
        case 'cdr':
          bonusStats.cdr = Number(((0.9 + lvl * 0.025) * s * jitter()).toFixed(1));
          break;
        case 'healPower':
          bonusStats.healPower = Math.round((2.2 + lvl * 0.08) * s * jitter());
          break;
        case 'dodge':
          bonusStats.dodge = Number(((0.7 + lvl * 0.02) * s * jitter()).toFixed(1));
          break;
      }
    }
  }

  const pref = SLOT_PREFIXES[rarity][Math.floor(rng() * SLOT_PREFIXES[rarity].length)];
  const noun = SLOT_NOUNS[slot][Math.floor(rng() * SLOT_NOUNS[slot].length)];
  const suf = SUFFIXES[rarity][Math.floor(rng() * SUFFIXES[rarity].length)];

  const id = `itm_${Date.now().toString(36)}_${(itemSeq++).toString(36)}_${Math.floor(
    rng() * 99999
  ).toString(36)}`;

  return {
    id,
    name: `${pref} ${noun} ${suf}`,
    slot,
    rarity,
    itemLevel: lvl,
    upgradeLevel: 0,
    baseStats,
    bonusStats,
    classAffinity,
  };
}

export function createStarterShards(): ShardBag {
  return {
    zwykly: 4,
    normalny: 1,
    mityczny: 0,
    legendarny: 0,
    boski: 0,
  };
}

export function createStarterEquipment(classId: ClassId) {
  return {
    bron: generateEquipmentItem(1, 'zwykly', 'bron', classId),
    helm: generateEquipmentItem(1, 'zwykly', 'helm', classId),
    zbroja: generateEquipmentItem(1, 'zwykly', 'zbroja', classId),
    rekawice: null,
    buty: null,
    amulet: null,
  };
}

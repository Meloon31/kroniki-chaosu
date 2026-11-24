import type {
  ClassId,
  EquipmentItem,
  EquipSlot,
  ItemBonusStats,
  PlayerProfile,
  Rarity,
  ShardBag,
} from './types.js';

export const RARITY_ORDER: Rarity[] = [
  'zwykly',
  'normalny',
  'mityczny',
  'legendarny',
  'boski',
  'niesmiertelny',
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
  niesmiertelny: {
    id: 'niesmiertelny',
    name: 'Nieśmiertelny',
    shardName: 'Odłamek Nieśmiertelny',
    dropChancePct: 5, // 5% wyłącznie w trybie Hardcore!
    color: '#00f5d4',
    beamColor: '#2dd4bf',
    glowColor: '#06b6d4',
    badgeBg: '#0f766e',
    baseMultiplier: 4.08, // dokładnie +50% wartości bazowej (w tym DEF!) względem Boskiego (2.72 * 1.5)
    bonusCount: [4, 4],
    bonusScale: 1.62,     // bonusy dodatkowe trochę większe (~+14%) niż w Boskich
  },
};

export const MAX_UPGRADE_LEVEL = 13;
export const MAX_OVERCAP_UPGRADE_LEVEL = 15;
export const MAX_UPGRADE_LEVEL_HARDCORE = 20;
export const CHAOS_STONE_DROP_RATE = 0.05;
export const CHAOS_STONE_ELIGIBLE_BOSSES = [
  'malakor',
  'azirath',
  'sylvara',
  'vaelgor',
  'kaelis',
  'ignarok',
  'aeternus',
] as const;

export function getMaxUpgradeLevel(hardcoreUnlocked = false): number {
  // Standard mode shard upgrading strictly stops at +13 (+14/+15 require Kamień Chaosu);
  // Unlocking Hardcore Mode raises the forge cap to +20!
  return hardcoreUnlocked ? MAX_UPGRADE_LEVEL_HARDCORE : MAX_UPGRADE_LEVEL;
}

export interface HardcoreUnlockProgress {
  allNormalActsCleared: boolean;
  boskiPlus13Slots: number;
  requiredSlots: number;
  unlocked: boolean;
}

export function getHardcoreUnlockProgress(profile: PlayerProfile): HardcoreUnlockProgress {
  const allNormalActsCleared =
    (profile.completedLocations || []).includes(60) ||
    (profile.defeatedActBosses || []).includes(4);

  let boskiPlus13Slots = 0;
  for (const s of EQUIP_SLOTS) {
    const it = profile.equipped[s];
    if (
      it &&
      canClassEquipItem(it, profile.classId) &&
      (it.rarity === 'boski' || it.rarity === 'niesmiertelny') &&
      it.upgradeLevel >= MAX_UPGRADE_LEVEL
    ) {
      boskiPlus13Slots++;
    }
  }

  const unlocked =
    Boolean(profile.sandboxUnlockAll) ||
    (allNormalActsCleared && boskiPlus13Slots >= EQUIP_SLOTS.length);

  return {
    allNormalActsCleared,
    boskiPlus13Slots,
    requiredSlots: EQUIP_SLOTS.length,
    unlocked,
  };
}

export function isHardcoreUnlocked(profile: PlayerProfile): boolean {
  return getHardcoreUnlockProgress(profile).unlocked;
}

export const ALL_CLASS_IDS: ClassId[] = [
  'wojownik',
  'czarnoksieznik',
  'elf',
  'krasnolud',
  'wrozka',
];

/**
 * Upgrade success chances:
 * +0 -> +6: 60%
 * +6 -> +9: 35%
 * +9 -> +12: 20%
 * +12 -> +13: 10%
 * Hardcore exclusive (+13 -> +20):
 * +13 -> +16: 12%
 * +16 -> +19: 8%
 * +19 -> +20: 5%
 */
export function getUpgradeSuccessChance(currentLevel: number): number {
  if (currentLevel < 6) return 60;
  if (currentLevel < 9) return 35;
  if (currentLevel < 12) return 20;
  if (currentLevel < 13) return 10;
  if (currentLevel < 16) return 12;
  if (currentLevel < 19) return 8;
  return 5;
}

export interface Plus13ClassBonus {
  title: string;
  icon: string;
  adPct?: number;
  apPct?: number;
  hpPct?: number;
  defPct?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeedPct?: number;
  moveSpeedPct?: number;
  cdrPct?: number;
  dodgeChance?: number;
  damageReduction?: number;
  healPowerPct?: number;
  shieldPowerPct?: number;
  summary: string;
}

export function getPlus13ClassBonus(classId: ClassId): Plus13ClassBonus {
  switch (classId) {
    case 'wojownik':
      return {
        title: 'Furia Tytana (+13)',
        icon: '⚔️',
        adPct: 10,
        defPct: 8,
        critChance: 6,
        summary: '+10% AD, +8% Obrony, +6% Szansy na Krytyk',
      };
    case 'czarnoksieznik':
      return {
        title: 'Pieczęć Arcymaga (+13)',
        icon: '🔮',
        apPct: 12,
        cdrPct: 6,
        critDamage: 14,
        summary: '+12% AP, +6% CDR, +14% Obrażeń Krytycznych',
      };
    case 'elf':
      return {
        title: 'Gracja Wichru (+13)',
        icon: '🏹',
        attackSpeedPct: 9,
        critChance: 7,
        dodgeChance: 6,
        moveSpeedPct: 5,
        summary: '+9% Szyb. Ataku, +7% Kryt, +6% Unik, +5% Ruch',
      };
    case 'krasnolud':
      return {
        title: 'Serce Góry (+13)',
        icon: '🔨',
        hpPct: 12,
        defPct: 10,
        damageReduction: 4,
        summary: '+12% Max HP, +10% Obrony, +4% Redukcji Obrażeń',
      };
    case 'wrozka':
      return {
        title: 'Blask Gwiazd (+13)',
        icon: '✨',
        healPowerPct: 14,
        shieldPowerPct: 14,
        apPct: 9,
        cdrPct: 5,
        summary: '+14% Leczenia i Tarcz, +9% AP, +5% CDR',
      };
  }
}

export function canClassEquipItem(item: EquipmentItem, classId: ClassId): boolean {
  if (!item.classAffinity) return true;
  return item.classAffinity === classId;
}

/**
 * Calibrated +0..+13 upgrade stat curve:
 * +1..+6: +8% per level (+6 = 1.48x)
 * +7..+13: +12% per level (+7 = 1.60x, +9 = 1.84x, +13 = 2.32x)
 * Creates clear progression gates (+7 for Act 2/3, +9 for Act 4) without breaking endgame balance!
 */
export function getUpgradeStatMultiplier(upgradeLevel: number): number {
  const lvl = Math.max(0, Math.min(MAX_UPGRADE_LEVEL_HARDCORE, upgradeLevel));
  if (lvl <= 6) {
    return 1 + lvl * 0.08;
  }
  if (lvl <= 13) {
    return 1 + 6 * 0.08 + (lvl - 6) * 0.12;
  }
  // Elite Chaos Overcap +14 (2.62x) & +15 (3.00x) — huge base stat leap!
  if (lvl === 14) return 2.62;
  if (lvl === 15) return 3.0;
  return 3.0 + (lvl - 15) * 0.16;
}

export function getUpgradeShardCost(currentLevel: number): number {
  const costs = [
    1, 1, 2, 2, 3, 4, 6, 9, 13, 18, 24, 32, 42,
    // Hardcore +13 -> +20
    46, 52, 60, 70, 82, 96, 115,
  ];
  if (currentLevel < 0 || currentLevel >= MAX_UPGRADE_LEVEL_HARDCORE) return 0;
  return costs[currentLevel];
}

export function getSalvageShardYield(item: EquipmentItem): number {
  const baseByRarity: Record<Rarity, number> = {
    zwykly: 1,
    normalny: 1,
    mityczny: 2,
    legendarny: 2,
    boski: 3,
    niesmiertelny: 4,
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
  niesmiertelny: 2.95,
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
  luckBonus = 1.0,
  isHardcore = false
): Rarity | null {
  // Nieśmiertelny set drops EXCLUSIVELY in Hardcore Mode with a 5% drop chance!
  if (isHardcore && rng() * 100 < 5.0) return 'niesmiertelny';
  if (rng() * 100 < (isHardcore ? 3.5 : 0.5) * luckBonus) return 'boski';
  if (rng() * 100 < (isHardcore ? 22.0 : 5.0) * luckBonus) return 'legendarny';
  if (rng() * 100 < (isHardcore ? 45.0 : 15.0) * luckBonus) return 'mityczny';
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
  niesmiertelny: ['Nieśmiertelny', 'Astralny', 'Wiekuisty', 'Tytaniczny', 'Nieskończony'],
};

const CLASS_SLOT_NOUNS: Record<ClassId, Record<EquipSlot, string[]>> = {
  wojownik: {
    bron: ['Miecz', 'Wielki Miecz', 'Ostrze Rycerskie'],
    helm: ['Hełm Rycerski', 'Przyłbica', 'Szyszak'],
    zbroja: ['Napierśnik', 'Pancerz Rycerski', 'Kirys'],
    rekawice: ['Rękawice Płytowe', 'Karwasze', 'Rękawice Miecza'],
    buty: ['Nagolenniki', 'Buty Rycerskie', 'Okute Buty'],
    amulet: ['Amulet Męstwa', 'Medalion Tytana', 'Talizman Furii'],
  },
  czarnoksieznik: {
    bron: ['Kostur', 'Berło Arkany', 'Laska Pustki'],
    helm: ['Kapelusz Maga', 'Kaptur Mroku', 'Korona Arkany'],
    zbroja: ['Szata Arkany', 'Płaszcz Maga', 'Toga Cienia'],
    rekawice: ['Rękawice Runiczne', 'Mankiety Mocy', 'Rękawice Arkany'],
    buty: ['Trzewiki Maga', 'Buty Cienia', 'Obuwie Arkany'],
    amulet: ['Serce Run', 'Amulet Arkany', 'Kryształ Duszy'],
  },
  elf: {
    bron: ['Łuk', 'Łuk Refleksyjny', 'Ostrze Wiatru'],
    helm: ['Diadem Lasu', 'Kaptur Łowcy', 'Opaska Wichru'],
    zbroja: ['Tunika Łowcy', 'Skórznia Lasu', 'Płaszcz Wiatru'],
    rekawice: ['Karwasze Łucznika', 'Rękawice Wiatru', 'Chwytaki Elfów'],
    buty: ['Sandały Wiatru', 'Buty Zwiadowcy', 'Lekkie Buty'],
    amulet: ['Talizman Wichru', 'Medalion Liścia', 'Amulet Polowania'],
  },
  krasnolud: {
    bron: ['Młot Bojowy', 'Topór Górski', 'Kafar Kuźni'],
    helm: ['Hełm Górski', 'Rogaty Hełm', 'Hełm Tarczownika'],
    zbroja: ['Pancerz Płytowy', 'Kolczuga Góry', 'Zbroja Kuźni'],
    rekawice: ['Pancerne Rękawice', 'Rękawice Kuźni', 'Karwasze Skały'],
    buty: ['Stalowe Buty', 'Buty Górskie', 'Ciężkie Nagolenniki'],
    amulet: ['Serce Góry', 'Amulet Kamienia', 'Medalion Kuźni'],
  },
  wrozka: {
    bron: ['Różdżka', 'Gwiazdka Światła', 'Laska Natury'],
    helm: ['Tiara Gwiazd', 'Wianek Światła', 'Diadem Wróżki'],
    zbroja: ['Suknia Światła', 'Szata Wróżki', 'Płaszcz Gwiazd'],
    rekawice: ['Jedwabne Rękawice', 'Mankiety Blasku', 'Bransolety Światła'],
    buty: ['Pantofelki Gwiazd', 'Buty Blasku', 'Sandały Światła'],
    amulet: ['Gwiazda Opieki', 'Amulet Blasku', 'Talizman Życia'],
  },
};

const SUFFIXES: Record<Rarity, string[]> = {
  zwykly: ['Rekruta', 'Wędrowca', 'Nowicjusza'],
  normalny: ['Weterana', 'Strażnika', 'Czeladnika'],
  mityczny: ['Mrozu', 'Burzy', 'Cienia', 'Światła'],
  legendarny: ['Tytanów', 'Katakumb', 'Pustyni', 'Lasu'],
  boski: ['Chaosu', 'Nieskończoności', 'Stworzenia', 'Przeznaczenia'],
  niesmiertelny: ['Wieczności', 'Astralu', 'Prakuźni', 'Nieśmiertelnych'],
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
  const assignedClass: ClassId =
    classAffinity ?? ALL_CLASS_IDS[Math.floor(rng() * ALL_CLASS_IDS.length)];
  const meta = RARITY_META[rarity];

  // Controlled power growth from lvl 1 to lvl 60
  const lvlScale = (1 + (lvl - 1) * 0.16 + Math.pow(lvl, 1.24) * 0.024) * meta.baseMultiplier;
  const jitter = () => 0.93 + rng() * 0.14;

  const isPhys = assignedClass === 'wojownik' || assignedClass === 'krasnolud';
  const isMag = assignedClass === 'czarnoksieznik' || assignedClass === 'wrozka';

  const baseStats = { hp: 0, ad: 0, ap: 0, def: 0 };
  switch (slot) {
    case 'bron':
      baseStats.ad = isMag ? 0 : Math.round((isPhys ? 11.2 : 9.5) * lvlScale * jitter());
      baseStats.ap = isPhys ? 0 : Math.round((isMag ? 11.2 : 9.5) * lvlScale * jitter());
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
      baseStats.ad = isMag ? 0 : Math.round((isPhys ? 5.5 : 4.5) * lvlScale * jitter());
      baseStats.ap = isPhys ? 0 : Math.round((isMag ? 5.5 : 4.5) * lvlScale * jitter());
      baseStats.def = Math.round(3.5 * lvlScale * jitter());
      break;
    case 'buty':
      baseStats.hp = Math.round(20 * lvlScale * jitter());
      baseStats.def = Math.round(4.2 * lvlScale * jitter());
      break;
    case 'amulet':
      baseStats.hp = Math.round(18 * lvlScale * jitter());
      baseStats.ad = isMag ? 0 : Math.round((isPhys ? 6.5 : 5.5) * lvlScale * jitter());
      baseStats.ap = isPhys ? 0 : Math.round((isMag ? 6.5 : 5.5) * lvlScale * jitter());
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
  const nouns = CLASS_SLOT_NOUNS[assignedClass][slot];
  const noun = nouns[Math.floor(rng() * nouns.length)];
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
    classAffinity: assignedClass,
  };
}

export function createStarterShards(): ShardBag {
  return {
    zwykly: 4,
    normalny: 1,
    mityczny: 0,
    legendarny: 0,
    boski: 0,
    niesmiertelny: 0,
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

// =========================================================
// KAMIEŃ CHAOSU (HIGH-RISK CRAFTING + OVERCAP +14 / +15)
// Exact distribution matching shared/chaosStone.json:
// 10% destroy | 10% add_bonus | 10% remove_bonus | 20% upgrade_plus2 | 50% no_effect
// =========================================================
export type ChaosStoneOutcomeKind =
  | 'destroy'
  | 'add_bonus'
  | 'remove_bonus'
  | 'upgrade_plus2'
  | 'no_effect';

export interface ChaosStoneResult {
  outcome: ChaosStoneOutcomeKind;
  updatedItem: EquipmentItem | null; // null when destroyed
  previousLevel: number;
  newLevel: number;
  addedBonusKey?: keyof ItemBonusStats;
  addedBonusValue?: number;
  addedBonusLabel?: string;
  removedBonusKey?: keyof ItemBonusStats;
  removedBonusValue?: number;
  removedBonusLabel?: string;
  noBonusToRemove?: boolean;
  cappedAtMax?: boolean;
  message: string;
}

export const CHAOS_BONUS_STAT_META: Record<
  keyof ItemBonusStats,
  { label: string; isPct: boolean }
> = {
  hp: { label: 'HP', isPct: false },
  ad: { label: 'Atak Fiz. (AD)', isPct: false },
  ap: { label: 'Atak Mag. (AP)', isPct: false },
  def: { label: 'Obrona (DEF)', isPct: false },
  critChance: { label: 'Szansa na Kryt', isPct: true },
  critDamage: { label: 'Obr. Krytyczne', isPct: true },
  attackSpeed: { label: 'Szyb. Ataku', isPct: true },
  moveSpeed: { label: 'Szyb. Ruchu', isPct: true },
  cdr: { label: 'Skrócenie CD', isPct: true },
  healPower: { label: 'Moc Leczenia/Tarcz', isPct: true },
  dodge: { label: 'Szansa na Unik', isPct: true },
};

const ALL_BONUS_STAT_KEYS: Array<keyof ItemBonusStats> = [
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

function rollBonusValueForItem(
  stat: keyof ItemBonusStats,
  item: EquipmentItem,
  rng: () => number
): number {
  const lvl = Math.max(1, Math.min(60, item.itemLevel));
  // Ensure even Zwykly/Normalny items gain a meaningful Chaos bonus roll!
  const s = Math.max(0.68, RARITY_META[item.rarity].bonusScale);
  const jitter = 0.94 + rng() * 0.16;
  switch (stat) {
    case 'hp':
      return Math.max(10, Math.round((12 + lvl * 2.6) * s * jitter));
    case 'ad':
      return Math.max(3, Math.round((2.5 + lvl * 0.65) * s * jitter));
    case 'ap':
      return Math.max(3, Math.round((2.5 + lvl * 0.65) * s * jitter));
    case 'def':
      return Math.max(2, Math.round((1.8 + lvl * 0.4) * s * jitter));
    case 'critChance':
      return Number(Math.max(0.8, (0.9 + lvl * 0.025) * s * jitter).toFixed(1));
    case 'critDamage':
      return Math.max(3, Math.round((3.5 + lvl * 0.12) * s * jitter));
    case 'attackSpeed':
      return Number(Math.max(1.0, (1.2 + lvl * 0.03) * s * jitter).toFixed(1));
    case 'moveSpeed':
      return Number(Math.max(0.8, (0.9 + lvl * 0.02) * s * jitter).toFixed(1));
    case 'cdr':
      return Number(Math.max(0.8, (0.9 + lvl * 0.025) * s * jitter).toFixed(1));
    case 'healPower':
      return Math.max(2, Math.round((2.2 + lvl * 0.08) * s * jitter));
    case 'dodge':
      return Number(Math.max(0.6, (0.7 + lvl * 0.02) * s * jitter).toFixed(1));
  }
}

export function shouldWarnChaosStoneRisk(item: EquipmentItem): boolean {
  return (
    item.rarity === 'legendarny' ||
    item.rarity === 'boski' ||
    item.rarity === 'niesmiertelny' ||
    item.upgradeLevel >= 10
  );
}

export function applyChaosStone(
  item: EquipmentItem,
  rng: () => number = Math.random,
  maxCap: number = MAX_OVERCAP_UPGRADE_LEVEL
): ChaosStoneResult {
  const roll = rng() * 100;
  const previousLevel = item.upgradeLevel;

  // 10% — Zniszczenie przedmiotu (0 <= roll < 10)
  if (roll < 10) {
    return {
      outcome: 'destroy',
      updatedItem: null,
      previousLevel,
      newLevel: 0,
      message: `💥 ZNISZCZENIE! ${item.name} (+${previousLevel}) spłonął w energii Chaosu!`,
    };
  }

  // 10% — Dodanie modyfikatora (+1 losowy bonus statystyk) (10 <= roll < 20)
  if (roll < 20) {
    const existingKeys = new Set(
      (Object.keys(item.bonusStats) as Array<keyof ItemBonusStats>).filter(
        (k) => typeof item.bonusStats[k] === 'number' && (item.bonusStats[k] || 0) > 0
      )
    );
    const available = ALL_BONUS_STAT_KEYS.filter((k) => !existingKeys.has(k));
    const chosenKey =
      available.length > 0
        ? available[Math.floor(rng() * available.length)]
        : ALL_BONUS_STAT_KEYS[Math.floor(rng() * ALL_BONUS_STAT_KEYS.length)];
    const rolledVal = rollBonusValueForItem(chosenKey, item, rng);
    const nextBonusStats: ItemBonusStats = { ...item.bonusStats };
    const prevVal = Number(nextBonusStats[chosenKey] || 0);
    const meta = CHAOS_BONUS_STAT_META[chosenKey];
    const combinedVal = meta.isPct
      ? Number((prevVal + rolledVal).toFixed(1))
      : Math.round(prevVal + rolledVal);
    nextBonusStats[chosenKey] = combinedVal;

    const updatedItem: EquipmentItem = {
      ...item,
      bonusStats: nextBonusStats,
    };
    const formattedVal = `+${rolledVal}${meta.isPct ? '%' : ''} ${meta.label}`;
    return {
      outcome: 'add_bonus',
      updatedItem,
      previousLevel,
      newLevel: previousLevel,
      addedBonusKey: chosenKey,
      addedBonusValue: rolledVal,
      addedBonusLabel: formattedVal,
      message: `✨ NOWY MODYFIKATOR! Dodano ${formattedVal}!`,
    };
  }

  // 10% — Usunięcie modyfikatora (-1 losowy bonus statystyk) (20 <= roll < 30)
  if (roll < 30) {
    const existingKeys = (Object.keys(item.bonusStats) as Array<keyof ItemBonusStats>).filter(
      (k) => typeof item.bonusStats[k] === 'number' && (item.bonusStats[k] || 0) > 0
    );
    if (existingKeys.length === 0) {
      // Technical rule: if item has no bonus modifiers, treat as no effect!
      return {
        outcome: 'no_effect',
        updatedItem: item,
        previousLevel,
        newLevel: previousLevel,
        noBonusToRemove: true,
        message: '💨 Kamień Chaosu rozpadł się bez skutku (brak bonusów do usunięcia).',
      };
    }
    const removedKey = existingKeys[Math.floor(rng() * existingKeys.length)];
    const removedVal = Number(item.bonusStats[removedKey] || 0);
    const meta = CHAOS_BONUS_STAT_META[removedKey];
    const nextBonusStats: ItemBonusStats = { ...item.bonusStats };
    delete nextBonusStats[removedKey];

    const updatedItem: EquipmentItem = {
      ...item,
      bonusStats: nextBonusStats,
    };
    const formattedVal = `+${removedVal}${meta.isPct ? '%' : ''} ${meta.label}`;
    return {
      outcome: 'remove_bonus',
      updatedItem,
      previousLevel,
      newLevel: previousLevel,
      removedBonusKey: removedKey,
      removedBonusValue: removedVal,
      removedBonusLabel: formattedVal,
      message: `🌫️ USUNIĘTO MODYFIKATOR! Stracono ${formattedVal}.`,
    };
  }

  // 20% — Przełamanie (+2 Poziomy, cap +15 standard / +20 Hardcore!) (30 <= roll < 50)
  if (roll < 50) {
    const targetLevel = Math.min(maxCap, previousLevel + 2);
    const cappedAtMax = previousLevel >= maxCap;
    const updatedItem: EquipmentItem = {
      ...item,
      upgradeLevel: Math.max(previousLevel, targetLevel),
    };
    return {
      outcome: 'upgrade_plus2',
      updatedItem,
      previousLevel,
      newLevel: updatedItem.upgradeLevel,
      cappedAtMax,
      message: cappedAtMax
        ? `🔥 PRZEŁAMANIE CHAOSU! Przedmiot osiągnął już elitarne maksimum +${maxCap}!`
        : updatedItem.upgradeLevel >= 14
          ? `🔥 PRZEŁAMANIE PROGU +13! ${item.name} awansuje na ELITARNE +${updatedItem.upgradeLevel}!`
          : `⚡ PRZEŁAMANIE (+2)! ${item.name} awansuje z +${previousLevel} na +${updatedItem.upgradeLevel}!`,
    };
  }

  // 50% — Brak efektu (50 <= roll < 100)
  return {
    outcome: 'no_effect',
    updatedItem: item,
    previousLevel,
    newLevel: previousLevel,
    message: '💨 Kamień Chaosu rozpadł się bez skutku.',
  };
}

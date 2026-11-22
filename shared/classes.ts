import type { ClassId } from './types.js';

export const MAX_LEVEL = 60;
export const MAX_SKILL_RANK = 12;

export interface ActiveSkillDef {
  slot: 'active1' | 'active2' | 'active3';
  keyLabel: string;
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  manaCost: number;
  range: number;
  radius: number;
  icon: string;
  color: string;
  damageScaleAd?: number;
  damageScaleAp?: number;
  damageScaleDef?: number;
  rankBonusPct: number; // +% effectiveness per rank above 1
}

export interface PassiveSkillDef {
  slot: 'passive1' | 'passive2';
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  perRankSummary: (rank: number) => string;
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  role: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  baseHp: number;
  hpPerLvl: number;
  baseAd: number;
  adPerLvl: number;
  baseAp: number;
  apPerLvl: number;
  baseDef: number;
  defPerLvl: number;
  baseMoveSpeed: number;
  baseCritChance: number;
  baseAttackRange: number;
  baseAttackCooldown: number;
  baseMana: number;
  manaPerLvl: number;
  actives: [ActiveSkillDef, ActiveSkillDef, ActiveSkillDef];
  passives: [PassiveSkillDef, PassiveSkillDef];
}

export const CLASSES: Record<ClassId, ClassDefinition> = {
  wojownik: {
    id: 'wojownik',
    name: 'Wojownik',
    role: 'Melee DPS (Fizyczny)',
    tagline: 'Potężne ciosy w zwarciu, obszarowe cięcia i niezłomny szał bitewny.',
    primaryColor: '#ef4444',
    accentColor: '#f59e0b',
    baseHp: 140,
    hpPerLvl: 18,
    baseAd: 24,
    adPerLvl: 4.5,
    baseAp: 0,
    apPerLvl: 0,
    baseDef: 14,
    defPerLvl: 2.2,
    baseMoveSpeed: 1.0,
    baseCritChance: 10,
    baseAttackRange: 3.1,
    baseAttackCooldown: 0.58,
    baseMana: 100,
    manaPerLvl: 5,
    actives: [
      {
        slot: 'active1',
        keyLabel: '1 / Q',
        id: 'potezne_ciecie',
        name: 'Potężne Cięcie',
        description: 'Szerokie, miażdżące cięcie mieczem zadające wysokie obrażenia fizyczne (AD) przed sobą.',
        cooldown: 4.0,
        manaCost: 16,
        range: 4.2,
        radius: 3.6,
        icon: '⚔️',
        color: '#ef4444',
        damageScaleAd: 1.85,
        rankBonusPct: 6,
      },
      {
        slot: 'active2',
        keyLabel: '2 / E',
        id: 'wir_ostrzy',
        name: 'Wir Ostrzy',
        description: 'Gwałtowny wir zadający wielokrotne obrażenia obszarowe AD wszystkim wrogom wokół.',
        cooldown: 7.5,
        manaCost: 26,
        range: 0,
        radius: 4.4,
        icon: '🌪️',
        color: '#f97316',
        damageScaleAd: 2.4,
        rankBonusPct: 6.5,
      },
      {
        slot: 'active3',
        keyLabel: '3 / R',
        id: 'szarza_z_ogluszeniem',
        name: 'Szarża z Ogłuszeniem',
        description: 'Błyskawiczna szarża naprzód — zadaje obrażenia AD i ogłusza zwykłych wrogów na 2.0 s.',
        cooldown: 9.0,
        manaCost: 24,
        range: 10.5,
        radius: 3.0,
        icon: '💥',
        color: '#facc15',
        damageScaleAd: 1.55,
        rankBonusPct: 6,
      },
    ],
    passives: [
      {
        slot: 'passive1',
        id: 'mistrzostwo_broni',
        name: 'Mistrzostwo Broni',
        description: 'Zwiększa całkowity Atak Fizyczny (AD) o +2.0% za każdy punkt umiejętności.',
        icon: '🗡️',
        color: '#dc2626',
        perRankSummary: (r) => `+${(r * 2.0).toFixed(0)}% AD`,
      },
      {
        slot: 'passive2',
        id: 'szal_bitewny',
        name: 'Szał Bitewny',
        description: 'Zwiększa Szansę na Kryt (+0.9%/pkt) oraz Szybkość Ataku (+1.6%/pkt).',
        icon: '🔥',
        color: '#ea580c',
        perRankSummary: (r) => `+${(r * 0.9).toFixed(1)}% Kryt, +${(r * 1.6).toFixed(1)}% Szyb. Ataku`,
      },
    ],
  },

  czarnoksieznik: {
    id: 'czarnoksieznik',
    name: 'Czarnoksiężnik',
    role: 'Ranged Magic DPS',
    tagline: 'Mistrz mrocznych zaklęć, deszczu meteorów i wysysania życiowej energii.',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    baseHp: 95,
    hpPerLvl: 11,
    baseAd: 5,
    adPerLvl: 0.5,
    baseAp: 28,
    apPerLvl: 5.0,
    baseDef: 8,
    defPerLvl: 1.2,
    baseMoveSpeed: 0.95,
    baseCritChance: 12,
    baseAttackRange: 11.5,
    baseAttackCooldown: 0.64,
    baseMana: 150,
    manaPerLvl: 10,
    actives: [
      {
        slot: 'active1',
        keyLabel: '1 / Q',
        id: 'kula_cienia',
        name: 'Kula Cienia',
        description: 'Wybuchowy pocisk mrocznej energii zadający obrażenia magiczne (AP) w punkcie trafienia.',
        cooldown: 3.6,
        manaCost: 18,
        range: 14.0,
        radius: 3.2,
        icon: '🟣',
        color: '#a855f7',
        damageScaleAp: 1.9,
        rankBonusPct: 6,
      },
      {
        slot: 'active2',
        keyLabel: '2 / E',
        id: 'deszcz_meteorow',
        name: 'Deszcz Meteorów',
        description: 'Przyzywa z nieba grad bazaltowych meteorów niszczących wrogów na dużym obszarze (AP).',
        cooldown: 9.5,
        manaCost: 34,
        range: 13.5,
        radius: 5.2,
        icon: '☄️',
        color: '#f43f5e',
        damageScaleAp: 2.75,
        rankBonusPct: 6.5,
      },
      {
        slot: 'active3',
        keyLabel: '3 / R',
        id: 'wyssanie_duszy',
        name: 'Wyssanie Duszy',
        description: 'Wypija esencję wrogów w obszarze (AP), lecząc 16% zadanych obrażeń (maks. 18% Max HP).',
        cooldown: 9.0,
        manaCost: 26,
        range: 9.0,
        radius: 4.5,
        icon: '💀',
        color: '#c026d3',
        damageScaleAp: 1.65,
        rankBonusPct: 6,
      },
    ],
    passives: [
      {
        slot: 'passive1',
        id: 'mroczna_moc',
        name: 'Mroczna Moc',
        description: 'Zwiększa całkowity Atak Magiczny (AP) o +2.0% za każdy punkt umiejętności.',
        icon: '🔮',
        color: '#9333ea',
        perRankSummary: (r) => `+${(r * 2.0).toFixed(0)}% AP`,
      },
      {
        slot: 'passive2',
        id: 'rezonans_many',
        name: 'Rezonans Many',
        description: 'Skraca czas odnowienia (+1.2% CDR/pkt) i wzmacnia Obrażenia Krytyczne (+2.2%/pkt).',
        icon: '✨',
        color: '#db2777',
        perRankSummary: (r) => `+${(r * 1.2).toFixed(1)}% CDR, +${(r * 2.2).toFixed(1)}% Obr. Kryt.`,
      },
    ],
  },

  elf: {
    id: 'elf',
    name: 'Elf',
    role: 'Hybryda / Zwinność',
    tagline: 'Błyskawiczny ruch, uniki i śmiercionośne połączenie ataków AD + AP.',
    primaryColor: '#10b981',
    accentColor: '#38bdf8',
    baseHp: 110,
    hpPerLvl: 13,
    baseAd: 16,
    adPerLvl: 3.0,
    baseAp: 16,
    apPerLvl: 3.0,
    baseDef: 10,
    defPerLvl: 1.5,
    baseMoveSpeed: 1.25,
    baseCritChance: 15,
    baseAttackRange: 10.5,
    baseAttackCooldown: 0.48,
    baseMana: 120,
    manaPerLvl: 7,
    actives: [
      {
        slot: 'active1',
        keyLabel: '1 / Q',
        id: 'magiczna_strzala',
        name: 'Magiczna Strzała',
        description: 'Przeszywająca strzała nasycona magią lasu, zadająca obrażenia hybrydowe (AD + AP) w linii.',
        cooldown: 3.4,
        manaCost: 15,
        range: 14.5,
        radius: 1.8,
        icon: '🏹',
        color: '#34d399',
        damageScaleAd: 0.88,
        damageScaleAp: 0.88,
        rankBonusPct: 6,
      },
      {
        slot: 'active2',
        keyLabel: '2 / E',
        id: 'odskok_z_salwa',
        name: 'Odskok z Salwą',
        description: 'Zwinny odskok w tył połączony z wachlarzem 5 magicznych strzał (AD + AP).',
        cooldown: 7.0,
        manaCost: 22,
        range: 11.5,
        radius: 4.5,
        icon: '🍃',
        color: '#06b6d4',
        damageScaleAd: 0.95,
        damageScaleAp: 0.95,
        rankBonusPct: 6,
      },
      {
        slot: 'active3',
        keyLabel: '3 / R',
        id: 'ostrze_wiatru',
        name: 'Ostrze Wiatru',
        description: 'Półksiężycowa fala wiatru tnąca wrogów (AD + AP) i przyspieszająca Elfa na 3 s.',
        cooldown: 8.0,
        manaCost: 24,
        range: 12.0,
        radius: 3.8,
        icon: '💨',
        color: '#22d3ee',
        damageScaleAd: 1.05,
        damageScaleAp: 1.05,
        rankBonusPct: 6.5,
      },
    ],
    passives: [
      {
        slot: 'passive1',
        id: 'zwinnosc_lasu',
        name: 'Zwinność Lasu',
        description: 'Zwiększa Szybkość Ruchu (+1.4%/pkt) oraz Szansę na Unik (+1.2%/pkt, maks. 32%).',
        icon: '🦶',
        color: '#059669',
        perRankSummary: (r) => `+${(r * 1.4).toFixed(1)}% Ruch, +${(r * 1.2).toFixed(1)}% Unik`,
      },
      {
        slot: 'passive2',
        id: 'harmonia_zywiolow',
        name: 'Harmonia Żywiołów',
        description: 'Wzmacnia hybrydowo zarówno Atak Fizyczny (AD) jak i Magiczny (AP) o +1.7%/pkt.',
        icon: '🌀',
        color: '#0284c7',
        perRankSummary: (r) => `+${(r * 1.7).toFixed(1)}% AD i AP`,
      },
    ],
  },

  krasnolud: {
    id: 'krasnolud',
    name: 'Krasnolud',
    role: 'Tank / Obrońca',
    tagline: 'Niezniszczalny bastion drużyny — prowokacja wrogów, kamienny pancerz i młot gór.',
    primaryColor: '#d97706',
    accentColor: '#94a3b8',
    baseHp: 190,
    hpPerLvl: 26,
    baseAd: 14,
    adPerLvl: 2.2,
    baseAp: 0,
    apPerLvl: 0,
    baseDef: 22,
    defPerLvl: 3.8,
    baseMoveSpeed: 0.9,
    baseCritChance: 5,
    baseAttackRange: 2.9,
    baseAttackCooldown: 0.66,
    baseMana: 105,
    manaPerLvl: 5,
    actives: [
      {
        slot: 'active1',
        keyLabel: '1 / Q',
        id: 'uderzenie_mlotem',
        name: 'Uderzenie Młotem',
        description: 'Obszarowe uderzenie (AD + DEF), które PROWOKUJE (Taunt) wszystkich wrogów na 5 s.',
        cooldown: 5.5,
        manaCost: 18,
        range: 0,
        radius: 6.2,
        icon: '🔨',
        color: '#f59e0b',
        damageScaleAd: 1.35,
        damageScaleDef: 0.85,
        rankBonusPct: 6,
      },
      {
        slot: 'active2',
        keyLabel: '2 / E',
        id: 'kamienna_skora',
        name: 'Kamienna Skóra',
        description: 'Pokrywa Krasnoluda kamiennymi płytami: -26% otrzymywanych obrażeń oraz tarcza na 4.5 s.',
        cooldown: 12.0,
        manaCost: 24,
        range: 0,
        radius: 2.5,
        icon: '🛡️',
        color: '#64748b',
        damageScaleDef: 1.2,
        rankBonusPct: 5,
      },
      {
        slot: 'active3',
        keyLabel: '3 / R',
        id: 'trzesienie_ziemi',
        name: 'Trzęsienie Ziemi',
        description: 'Potężne wstrząsy ziemi ranią wrogów (AD + DEF), spowalniają i ogłuszają zwykłych wrogów.',
        cooldown: 10.0,
        manaCost: 28,
        range: 0,
        radius: 6.8,
        icon: '🌋',
        color: '#b45309',
        damageScaleAd: 1.55,
        damageScaleDef: 1.05,
        rankBonusPct: 6,
      },
    ],
    passives: [
      {
        slot: 'passive1',
        id: 'zelazna_wola',
        name: 'Żelazna Wola',
        description: 'Zwiększa Maksymalne HP o +2.4% za każdy punkt umiejętności.',
        icon: '❤️',
        color: '#b91c1c',
        perRankSummary: (r) => `+${(r * 2.4).toFixed(1)}% Max HP`,
      },
      {
        slot: 'passive2',
        id: 'pancerz_gory',
        name: 'Pancerz Góry',
        description: 'Zwiększa Obronę (DEF) o +2.6% za każdy punkt umiejętności.',
        icon: '⛰️',
        color: '#475569',
        perRankSummary: (r) => `+${(r * 2.6).toFixed(1)}% DEF`,
      },
    ],
  },

  wrozka: {
    id: 'wrozka',
    name: 'Wróżka',
    role: 'Support / Healer',
    tagline: 'Świetlista opiekunka drużyny — taktyczne leczenie, tarcze ochronne i aura przyspieszenia.',
    primaryColor: '#ec4899',
    accentColor: '#fde047',
    baseHp: 100,
    hpPerLvl: 12,
    baseAd: 4,
    adPerLvl: 0.5,
    baseAp: 20,
    apPerLvl: 3.8,
    baseDef: 10,
    defPerLvl: 1.5,
    baseMoveSpeed: 1.1,
    baseCritChance: 8,
    baseAttackRange: 11.0,
    baseAttackCooldown: 0.6,
    baseMana: 160,
    manaPerLvl: 12,
    actives: [
      {
        slot: 'active1',
        keyLabel: '1 / Q',
        id: 'swietlisty_pocisk',
        name: 'Świetlisty Pocisk',
        description: 'Wystrzeliwuje kulę światła (AP), która osłabia wroga (-15% obrażeń, +12% otrzymywanych) na 5 s.',
        cooldown: 3.6,
        manaCost: 16,
        range: 14.0,
        radius: 2.8,
        icon: '🌟',
        color: '#facc15',
        damageScaleAp: 1.45,
        rankBonusPct: 6,
      },
      {
        slot: 'active2',
        keyLabel: '2 / E',
        id: 'fala_uzdrowienia',
        name: 'Fala Uzdrowienia',
        description: 'Rozsyła falę światła leczącą pobliską drużynę (skaluje się z AP; maks. 34% Max HP sojusznika).',
        cooldown: 8.5,
        manaCost: 28,
        range: 0,
        radius: 14.0,
        icon: '💚',
        color: '#22c55e',
        damageScaleAp: 1.45,
        rankBonusPct: 6,
      },
      {
        slot: 'active3',
        keyLabel: '3 / R',
        id: 'bariera_swiatla',
        name: 'Bariera Światła',
        description: 'Nakłada na drużynę 6.5-sekundową tarczę absorbującą (maks. 42% Max HP; chroni przed korzeniami i Wybuchem Chaosu!).',
        cooldown: 11.5,
        manaCost: 34,
        range: 0,
        radius: 15.0,
        icon: '🪽',
        color: '#38bdf8',
        damageScaleAp: 1.65,
        rankBonusPct: 6,
      },
    ],
    passives: [
      {
        slot: 'passive1',
        id: 'blogoslawienstwo_natury',
        name: 'Błogosławieństwo Natury',
        description: 'Zwiększa moc leczenia oraz wytrzymałość tarcz ochronnych o +2.5% za każdy punkt umiejętności.',
        icon: '🌸',
        color: '#ec4899',
        perRankSummary: (r) => `+${(r * 2.5).toFixed(1)}% Leczenia i Tarcz`,
      },
      {
        slot: 'passive2',
        id: 'aura_przyspieszenia',
        name: 'Aura Przyspieszenia',
        description: 'Skraca czas odnowienia umiejętności (CDR) dla Wróżki i sojuszników o +1.2% za punkt.',
        icon: '⚡',
        color: '#eab308',
        perRankSummary: (r) => `+${(r * 1.2).toFixed(1)}% CDR (Aura)`,
      },
    ],
  },
};

export const CLASS_LIST: ClassDefinition[] = [
  CLASSES.wojownik,
  CLASSES.czarnoksieznik,
  CLASSES.elf,
  CLASSES.krasnolud,
  CLASSES.wrozka,
];

/**
 * Calibrated XP curve (Lvl 1 -> 60).
 * Standard playthrough of 60 locations (Acts 1-4) reaches Max Level 60 near locations 58-60.
 */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.round(320 * Math.pow(level, 1.48) + 180 * level);
}

export function targetLocationXpPool(globalIndex: number): number {
  const clamped = Math.max(1, Math.min(60, globalIndex));
  const refLvl = Math.min(MAX_LEVEL - 1, clamped);
  return Math.round(xpToNextLevel(refLvl) * 1.015);
}

export function getEnemyCountMultiplier(partySize: number): number {
  const clamped = Math.max(1, Math.min(4, partySize));
  const table: Record<number, number> = {
    1: 1.0,
    2: 1.4,
    3: 1.8,
    4: 2.2,
  };
  return table[clamped];
}

export function getBossHpMultiplier(partySize: number): number {
  const extra = Math.max(0, Math.min(3, partySize - 1));
  return 1 + extra * 0.75; // +75% HP/Shield per additional player
}

export function getBossDamageMultiplier(partySize: number): number {
  const extra = Math.max(0, Math.min(3, partySize - 1));
  return 1 + extra * 0.2; // +20% DMG per additional player
}

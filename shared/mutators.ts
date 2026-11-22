export type LocationMutatorId =
  | 'treasure_goblin'
  | 'wave_obelisk'
  | 'meteor_storm'
  | 'volatile_foes'
  | 'roaming_vortex'
  | 'blood_frenzy'
  | 'shield_totems'
  | 'bounty_hunt'
  | 'miniboss_lair'
  | 'boss_sanctum';

export interface LocationMutatorDef {
  id: LocationMutatorId;
  icon: string;
  name: string;
  shortDesc: string;
  color: string;
  xpBonusPct: number;
  luckBonus: number;
}

export const LOCATION_MUTATORS: Record<LocationMutatorId, LocationMutatorDef> = {
  treasure_goblin: {
    id: 'treasure_goblin',
    icon: '💰',
    name: 'Polowanie na Złotego Goblina',
    shortDesc: 'Na mapie grasuje Złoty Goblin Skarbów! Złap go, zanim ucieknie — sypie 5 rzadkich łupów!',
    color: '#fbbf24',
    xpBonusPct: 10,
    luckBonus: 1.15,
  },
  wave_obelisk: {
    id: 'wave_obelisk',
    icon: '🔮',
    name: 'Ołtarz Fal Wyzwania',
    shortDesc: 'Aktywuj Kryształ Fal [F] i pokonaj 3 fale zasadzek, by zdobyć Skarb Mistrzów!',
    color: '#38bdf8',
    xpBonusPct: 20,
    luckBonus: 1.25,
  },
  meteor_storm: {
    id: 'meteor_storm',
    icon: '☄️',
    name: 'Burza Meteorów',
    shortDesc: 'Z nieba spadają płonące meteory — unikaj ich albo wciągaj w nie wrogów!',
    color: '#f97316',
    xpBonusPct: 15,
    luckBonus: 1.15,
  },
  volatile_foes: {
    id: 'volatile_foes',
    icon: '💥',
    name: 'Wybuchowi Wrogowie',
    shortDesc: 'Zabici wrogowie eksplodują po chwili — odskocz i wywołuj reakcje łańcuchowe!',
    color: '#ef4444',
    xpBonusPct: 15,
    luckBonus: 1.15,
  },
  roaming_vortex: {
    id: 'roaming_vortex',
    icon: '🌪️',
    name: 'Żywe Wiry Żywiołów',
    shortDesc: 'Po komnatach krążą wiry żywiołów — wykorzystaj unik [Spacja] i refleks!',
    color: '#2dd4bf',
    xpBonusPct: 15,
    luckBonus: 1.18,
  },
  blood_frenzy: {
    id: 'blood_frenzy',
    icon: '🔥',
    name: 'Krwawy Szał',
    shortDesc: 'Wszyscy walczą i biegają +28% szybciej! Utrzymuj wysokie Combo za +25% XP!',
    color: '#f43f5e',
    xpBonusPct: 25,
    luckBonus: 1.15,
  },
  shield_totems: {
    id: 'shield_totems',
    icon: '🛡️',
    name: 'Totemy Ochronne',
    shortDesc: 'W pokojach stoją Totemy Tarczy chroniące potwory — rozbij je jako pierwsze!',
    color: '#a855f7',
    xpBonusPct: 18,
    luckBonus: 1.2,
  },
  bounty_hunt: {
    id: 'bounty_hunt',
    icon: '👑',
    name: 'Łowy na Elity',
    shortDesc: 'Podwójna liczba Elit z unikalnymi mocami oraz +45% szansy na rzadki łup!',
    color: '#eab308',
    xpBonusPct: 22,
    luckBonus: 1.45,
  },
  miniboss_lair: {
    id: 'miniboss_lair',
    icon: '💀',
    name: 'Legowisko Mini-Bossa',
    shortDesc: 'Na końcu lochu czeka potężny Strażnik z unikalnymi umiejętnościami!',
    color: '#f59e0b',
    xpBonusPct: 15,
    luckBonus: 1.25,
  },
  boss_sanctum: {
    id: 'boss_sanctum',
    icon: '👑',
    name: 'Sanktuarium Władcy Aktu',
    shortDesc: 'Finałowe starcie Aktu! Pokonaj Władcę, by zdobyć Odłamek Runy (30% szansy)!',
    color: '#e11d48',
    xpBonusPct: 20,
    luckBonus: 1.35,
  },
};

export type EliteAffix = 'mortar' | 'frost' | 'charger' | 'vampiric';

export const ELITE_AFFIX_META: Record<
  EliteAffix,
  { icon: string; label: string; color: string }
> = {
  mortar: { icon: '🔥', label: 'Ognisty', color: '#f97316' },
  frost: { icon: '❄️', label: 'Mroźny', color: '#38bdf8' },
  charger: { icon: '⚡', label: 'Błyskawiczny', color: '#facc15' },
  vampiric: { icon: '💚', label: 'Regenerator', color: '#4ade80' },
};

export type BoonId =
  | 'swift_step'
  | 'crit_fury'
  | 'flame_aura'
  | 'vampiric_strikes'
  | 'titan_barrier'
  | 'chain_lightning'
  | 'golden_fortune';

export interface BoonDef {
  id: BoonId;
  icon: string;
  name: string;
  description: string;
  color: string;
}

export const CHAOS_BOONS: Record<BoonId, BoonDef> = {
  swift_step: {
    id: 'swift_step',
    icon: '⚡',
    name: 'Piorunujący Krok',
    description: '+30% Prędkości Ruchu oraz -25% czasu odnowienia umiejętności!',
    color: '#38bdf8',
  },
  crit_fury: {
    id: 'crit_fury',
    icon: '💥',
    name: 'Krytyczna Furia',
    description: '+28% Szansy na Trafienie Krytyczne i +55% Obrażeń Krytycznych!',
    color: '#f59e0b',
  },
  flame_aura: {
    id: 'flame_aura',
    icon: '🔥',
    name: 'Ognista Aura',
    description: 'Co 1.6s wybuchasz pierścieniem ognia raniącym pobliskich wrogów!',
    color: '#ef4444',
  },
  vampiric_strikes: {
    id: 'vampiric_strikes',
    icon: '🧛',
    name: 'Wampirze Ostrze',
    description: 'Każde trafienie leczy Cię za 10% zadanych obrażeń!',
    color: '#ec4899',
  },
  titan_barrier: {
    id: 'titan_barrier',
    icon: '🛡️',
    name: 'Tytaniczna Bariera',
    description: 'Co 6s automatycznie odnawiasz tarczę równą 22% Maks. HP!',
    color: '#60a5fa',
  },
  chain_lightning: {
    id: 'chain_lightning',
    icon: '☄️',
    name: 'Kaskada Błyskawic',
    description: '35% szansy przy trafieniu na uderzenie piorunem AoE w grupę wrogów!',
    color: '#a855f7',
  },
  golden_fortune: {
    id: 'golden_fortune',
    icon: '🍀',
    name: 'Złoty Uśmiech Losu',
    description: '+65% szansy na rzadki łup (Mityczny/Legendarny/Boski) oraz +35% XP!',
    color: '#fde047',
  },
};

export const ALL_BOON_IDS: BoonId[] = Object.keys(CHAOS_BOONS) as BoonId[];

/**
 * Deterministic varied mutator rotation across the 15 locations of each Act so
 * no two consecutive levels ever feel the same!
 */
const REGULAR_MUTATOR_CYCLE: LocationMutatorId[] = [
  'treasure_goblin',  // loc 1
  'volatile_foes',    // loc 2
  'wave_obelisk',     // loc 3
  'meteor_storm',     // loc 4
  // loc 5 = miniboss_lair
  'shield_totems',    // loc 6
  'blood_frenzy',     // loc 7
  'roaming_vortex',   // loc 8
  'bounty_hunt',      // loc 9
  // loc 10 = miniboss_lair
  'treasure_goblin',  // loc 11
  'wave_obelisk',     // loc 12
  'meteor_storm',     // loc 13
  'blood_frenzy',     // loc 14
  // loc 15 = boss_sanctum
];

export function getMutatorForLocation(act: number, locationInAct: number): LocationMutatorId {
  if (locationInAct === 15) return 'boss_sanctum';
  if (locationInAct === 5 || locationInAct === 10) return 'miniboss_lair';
  // Shift rotation slightly per Act so Act 1..4 feel distinct too!
  const nonBossIdx =
    locationInAct < 5
      ? locationInAct - 1
      : locationInAct < 10
        ? locationInAct - 2
        : locationInAct - 3;
  const shifted = (nonBossIdx + (act - 1) * 3) % REGULAR_MUTATOR_CYCLE.length;
  return REGULAR_MUTATOR_CYCLE[shifted];
}

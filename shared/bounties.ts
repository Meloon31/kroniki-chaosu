import type { ActNumber, PlayerProfile, Rarity, RuneId } from './types.js';

export type BountyKind =
  | 'kills'
  | 'combo'
  | 'chest'
  | 'clear'
  | 'upgrade'
  | 'loot'
  | 'emote';

export interface BountyDef {
  id: string;
  kind: BountyKind;
  title: string;
  description: string;
  icon: string;
  target: number;
  rewardXp: number;
  rewardShards?: Partial<Record<Rarity, number>>;
  rewardItemRarity?: Rarity;
}

export interface ActiveBountyState {
  defId: string;
  progress: number;
  claimed?: boolean;
}

export interface DailyRewardDef {
  day: number; // 1..7
  title: string;
  icon: string;
  xp: number;
  shards?: Partial<Record<Rarity, number>>;
  itemRarity?: Rarity;
  summary: string;
}

// =========================================================
// MISJE GŁÓWNE (1× na każdy Akt — Pokonaj Bossa Aktu)
// Nagroda: 1× Odłamek Runy Bossa Aktu + 6 Legendarnych + 8 Mitycznych!
// =========================================================
export interface MainActQuestDef {
  id: string;
  act: ActNumber;
  bossLocationGlobal: number; // 15, 30, 45, 60
  title: string;
  bossName: string;
  description: string;
  icon: string;
  runeId: RuneId;
  rewardXp: number;
  rewardShards: Partial<Record<Rarity, number>>;
}

export const MAIN_ACT_QUESTS: MainActQuestDef[] = [
  {
    id: 'main_act_1',
    act: 1,
    bossLocationGlobal: 15,
    title: 'Upadek Króla Katakumb',
    bossName: 'Malakor, Król Katakumb',
    description: 'Pokonaj Bossa Aktu 1 (Lokacja 15) po raz pierwszy.',
    icon: '💀',
    runeId: 'malakor',
    rewardXp: 2500,
    rewardShards: { legendarny: 6, mityczny: 8 },
  },
  {
    id: 'main_act_2',
    act: 2,
    bossLocationGlobal: 30,
    title: 'Koniec Pożeracza Wydm',
    bossName: 'Azirath, Pożeracz Wydm',
    description: 'Pokonaj Bossa Aktu 2 (Lokacja 30) po raz pierwszy.',
    icon: '🦂',
    runeId: 'azirath',
    rewardXp: 4500,
    rewardShards: { legendarny: 6, mityczny: 8 },
  },
  {
    id: 'main_act_3',
    act: 3,
    bossLocationGlobal: 45,
    title: 'Złamanie Korony Cierni',
    bossName: 'Sylvara, Matka Cierni',
    description: 'Pokonaj Bossa Aktu 3 (Lokacja 45) po raz pierwszy.',
    icon: '🌿',
    runeId: 'sylvara',
    rewardXp: 7000,
    rewardShards: { legendarny: 6, mityczny: 8 },
  },
  {
    id: 'main_act_4',
    act: 4,
    bossLocationGlobal: 60,
    title: 'Pogromca Archonta Chaosu',
    bossName: 'Vaelgor, Archont Chaosu',
    description: 'Pokonaj Bossa Aktu 4 (Lokacja 60) po raz pierwszy.',
    icon: '🔥',
    runeId: 'vaelgor',
    rewardXp: 10000,
    rewardShards: { legendarny: 6, mityczny: 8 },
  },
];

// =========================================================
// MISJA POBOCZNA (1× na każdą z 60 lokacji — 100% wrogów!)
// Nagroda: 2 Mityczne Odłamki + 1 Legendarny Odłamek
// =========================================================
export const SIDE_LOCATION_REWARD = {
  xp: 550,
  shards: { mityczny: 2, legendarny: 1 } as Partial<Record<Rarity, number>>,
  summary: '2× Mityczny Odłamek + 1× Legendarny Odłamek + 550 XP',
};

// =========================================================
// MISJA DZIENNA: Logowanie + Przejście Aktu (reset co dzień!)
// Nagroda: 2 Legendarne Odłamki + 1 Boski Odłamek
// =========================================================
export const DAILY_ACT_QUEST_REWARD = {
  xp: 2200,
  shards: { legendarny: 2, boski: 1 } as Partial<Record<Rarity, number>>,
  summary: '2× Legendarny Odłamek + 1× Boski Odłamek + 2200 XP',
};

// =========================================================
// 7-DNIOWA SERIA LOGOWANIA
// =========================================================
export const DAILY_REWARDS: DailyRewardDef[] = [
  {
    day: 1,
    title: 'Dzień 1: Dobry Start',
    icon: '🎁',
    xp: 800,
    shards: { zwykly: 6, normalny: 4 },
    summary: '+800 XP • 6 Zwykłych & 4 Normalne Odłamki',
  },
  {
    day: 2,
    title: 'Dzień 2: Iskra Kowala',
    icon: '🔨',
    xp: 1400,
    shards: { mityczny: 5 },
    summary: '+1400 XP • 5 Mitycznych Odłamków',
  },
  {
    day: 3,
    title: 'Dzień 3: Skarb Wyprawy',
    icon: '⚔️',
    xp: 2200,
    itemRarity: 'mityczny',
    summary: '+2200 XP • Gwarantowany Mityczny Przedmiot Klasowy!',
  },
  {
    day: 4,
    title: 'Dzień 4: Kuźnia Legend',
    icon: '🔥',
    xp: 3000,
    shards: { legendarny: 4 },
    summary: '+3000 XP • 4 Legendarne Odłamki',
  },
  {
    day: 5,
    title: 'Dzień 5: Skarbiec Drużyny',
    icon: '💎',
    xp: 4000,
    shards: { mityczny: 6, legendarny: 4 },
    summary: '+4000 XP • 6 Mitycznych & 4 Legendarne Odłamki',
  },
  {
    day: 6,
    title: 'Dzień 6: Złoty Oręż',
    icon: '👑',
    xp: 5200,
    itemRarity: 'legendarny',
    summary: '+5200 XP • Gwarantowany Legendarny Przedmiot Klasowy!',
  },
  {
    day: 7,
    title: 'Dzień 7: Błogosławieństwo Chaosu',
    icon: '🌟',
    xp: 8000,
    shards: { boski: 2, legendarny: 5 },
    itemRarity: 'legendarny',
    summary: '+8000 XP • 2 Boskie Odłamki + Legendarny Przedmiot!',
  },
];

// =========================================================
// CODZIENNE KOŁO FORTUNY CHAOSU (1 darmowy obrót dziennie!)
// =========================================================
export interface WheelSliceDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  weight: number;
  xp?: number;
  shards?: Partial<Record<Rarity, number>>;
  itemRarity?: Rarity;
  randomRune?: boolean;
}

export const WHEEL_SLICES: WheelSliceDef[] = [
  {
    id: 'boski_jackpot',
    label: 'JACKPOT: 2× Boski Odłamek!',
    shortLabel: '2× Boski',
    icon: '💎',
    color: '#e11d48',
    weight: 7,
    shards: { boski: 2 },
  },
  {
    id: 'mythic_pack',
    label: '6× Mityczny Odłamek',
    shortLabel: '6× Mityczny',
    icon: '⚡',
    color: '#7c3aed',
    weight: 18,
    shards: { mityczny: 6 },
  },
  {
    id: 'legendary_pack',
    label: '4× Legendarny Odłamek',
    shortLabel: '4× Legend.',
    icon: '🔥',
    color: '#ea580c',
    weight: 15,
    shards: { legendarny: 4 },
  },
  {
    id: 'random_rune',
    label: 'Losowy Odłamek Runy Bossa!',
    shortLabel: 'Runa Bossa',
    icon: '💠',
    color: '#0284c7',
    weight: 12,
    randomRune: true,
  },
  {
    id: 'xp_surge',
    label: '+2500 Bonus XP + 3× Mityczny',
    shortLabel: '+2500 XP',
    icon: '⭐',
    color: '#16a34a',
    weight: 16,
    xp: 2500,
    shards: { mityczny: 3 },
  },
  {
    id: 'legendary_item',
    label: 'Legendarny Przedmiot Klasowy!',
    shortLabel: 'Leg. Sprzęt',
    icon: '⚔️',
    color: '#ca8a04',
    weight: 11,
    itemRarity: 'legendarny',
  },
  {
    id: 'forge_bundle',
    label: '3× Legendarny + 3× Mityczny',
    shortLabel: '3L + 3M',
    icon: '🔨',
    color: '#9333ea',
    weight: 14,
    shards: { legendarny: 3, mityczny: 3 },
  },
  {
    id: 'boski_mini',
    label: '1× Boski + 2× Legendarny!',
    shortLabel: '1B + 2L',
    icon: '👑',
    color: '#be185d',
    weight: 7,
    shards: { boski: 1, legendarny: 2 },
  },
];

export function rollWheelSliceIndex(): number {
  const total = WHEEL_SLICES.reduce((acc, s) => acc + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL_SLICES.length; i++) {
    r -= WHEEL_SLICES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

// =========================================================
// CODZIENNE BŁOGOSŁAWIEŃSTWO DNIA (inny globalny bonus w każdy dzień tygodnia!)
// =========================================================
export interface DailyBlessingDef {
  dayOfWeek: number; // 0=Niedziela .. 6=Sobota
  dayName: string;
  name: string;
  icon: string;
  color: string;
  summary: string;
  xpBonusPct?: number;
  upgradeChanceBonus?: number; // e.g. +10 percentage points at Blacksmith
  salvageBonusPct?: number;    // extra shards when salvaging
  critChanceBonus?: number;
  critDamageBonus?: number;
  hpPctBonus?: number;
  adApPctBonus?: number;
}

export const DAILY_BLESSINGS: Record<number, DailyBlessingDef> = {
  1: {
    dayOfWeek: 1,
    dayName: 'Poniedziałek',
    name: 'Dzień Kowala',
    icon: '🔨',
    color: '#fb923c',
    summary: '+10% szansy na ulepszenie u Kowala!',
    upgradeChanceBonus: 10,
  },
  2: {
    dayOfWeek: 2,
    dayName: 'Wtorek',
    name: 'Dzień Mędrca',
    icon: '📚',
    color: '#38bdf8',
    summary: '+35% zdobywanego XP ze wszystkich źródeł!',
    xpBonusPct: 35,
  },
  3: {
    dayOfWeek: 3,
    dayName: 'Środa',
    name: 'Dzień Skarbców',
    icon: '💎',
    color: '#c084fc',
    summary: '+50% więcej Odłamków z rozbierania przedmiotów i +15% XP!',
    salvageBonusPct: 50,
    xpBonusPct: 15,
  },
  4: {
    dayOfWeek: 4,
    dayName: 'Czwartek',
    name: 'Dzień Krytyków',
    icon: '⚡',
    color: '#facc15',
    summary: '+10% Szansy na Krytyk i +20% Obrażeń Krytycznych!',
    critChanceBonus: 10,
    critDamageBonus: 20,
  },
  5: {
    dayOfWeek: 5,
    dayName: 'Piątek',
    name: 'Dzień Tytanów',
    icon: '🛡️',
    color: '#4ade80',
    summary: '+15% Max HP oraz +12% Ataku (AD i AP)!',
    hpPctBonus: 15,
    adApPctBonus: 12,
  },
  6: {
    dayOfWeek: 6,
    dayName: 'Sobota',
    name: 'Gorączka Chaosu',
    icon: '🔥',
    color: '#f43f5e',
    summary: '+30% XP oraz +8% szansy na ulepszenie u Kowala!',
    xpBonusPct: 30,
    upgradeChanceBonus: 8,
  },
  0: {
    dayOfWeek: 0,
    dayName: 'Niedziela',
    name: 'Boskie Święto',
    icon: '👑',
    color: '#fde047',
    summary: '+35% XP, +10% szansy u Kowala oraz +12% AD & AP!',
    xpBonusPct: 35,
    upgradeChanceBonus: 10,
    adApPctBonus: 12,
  },
};

export function getDailyBlessing(now = new Date()): DailyBlessingDef {
  return DAILY_BLESSINGS[now.getDay()] || DAILY_BLESSINGS[0];
}

// =========================================================
// WYPRAWA DNIA (Przeklęta Komnata — deterministyczna po dacie dla wszystkich!)
// =========================================================
export interface DailyFeaturedInfo {
  dateKey: string;
  globalLocation: number; // 1..60
  bonusShards: Partial<Record<Rarity, number>>;
  summary: string;
}

export function getDailyFeaturedLocation(now = new Date()): DailyFeaturedInfo {
  const dateKey = getTodayDateKey(now);
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Pick a fun non-trivial location (2..59) shared across all players today!
  const globalLocation = 2 + (Math.abs(hash) % 58);
  return {
    dateKey,
    globalLocation,
    bonusShards: { legendarny: 2, mityczny: 3 },
    summary: '2× Bonus XP + 2× Legendarny & 3× Mityczny Odłamek za 1. przejście dzisiaj!',
  };
}

// =========================================================
// ZLECENIA WYPRAWOWE (odnawialne na bieżąco)
// =========================================================
export const BOUNTY_POOL: BountyDef[] = [
  {
    id: 'slay_20',
    kind: 'kills',
    title: 'Łowca Potworów',
    description: 'Pokonaj 20 przeciwników na wyprawach.',
    icon: '⚔️',
    target: 20,
    rewardXp: 900,
    rewardShards: { normalny: 5, mityczny: 2 },
  },
  {
    id: 'slay_45',
    kind: 'kills',
    title: 'Pogromca Hordy',
    description: 'Pokonaj 45 przeciwników solo lub z drużyną.',
    icon: '💀',
    target: 45,
    rewardXp: 1900,
    rewardShards: { mityczny: 5, legendarny: 2 },
  },
  {
    id: 'combo_10',
    kind: 'combo',
    title: 'Taniec Ostrzy',
    description: 'Osiągnij serię 10× Combo w walce.',
    icon: '🔥',
    target: 10,
    rewardXp: 1200,
    rewardShards: { mityczny: 4 },
  },
  {
    id: 'open_chests_2',
    kind: 'chest',
    title: 'Poszukiwacz Skarbów',
    description: 'Otwórz 2 zamknięte skrzynie z zagadką.',
    icon: '🗝️',
    target: 2,
    rewardXp: 1400,
    rewardItemRarity: 'mityczny',
  },
  {
    id: 'clear_loc_2',
    kind: 'clear',
    title: 'Zdobywca Krain',
    description: 'Ukończ 2 lokacje na dowolnym Akcie.',
    icon: '🏆',
    target: 2,
    rewardXp: 2000,
    rewardShards: { legendarny: 3 },
  },
  {
    id: 'upgrade_2',
    kind: 'upgrade',
    title: 'Mistrz Kowadła',
    description: 'Ulepsz sprzęt u Kowala 2 razy.',
    icon: '🔨',
    target: 2,
    rewardXp: 1100,
    rewardShards: { normalny: 4, mityczny: 4 },
  },
  {
    id: 'loot_5',
    kind: 'loot',
    title: 'Kolekcjoner Łupów',
    description: 'Zbierz 5 przedmiotów z pola bitwy.',
    icon: '🎒',
    target: 5,
    rewardXp: 1000,
    rewardShards: { mityczny: 3 },
  },
  {
    id: 'emote_2',
    kind: 'emote',
    title: 'Dusza Drużyny',
    description: 'Wyślij 2 komiksowe emotki w trakcie gry.',
    icon: '💬',
    target: 2,
    rewardXp: 650,
    rewardShards: { zwykly: 6, normalny: 4 },
  },
];

export const BOUNTY_BY_ID: Record<string, BountyDef> = Object.fromEntries(
  BOUNTY_POOL.map((b) => [b.id, b])
);

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canClaimDailyReward(lastClaimDate?: string): boolean {
  return lastClaimDate !== getTodayDateKey();
}

export function canSpinDailyWheel(lastWheelSpinDate?: string): boolean {
  return lastWheelSpinDate !== getTodayDateKey();
}

export function isMainQuestCompleted(profile: PlayerProfile, q: MainActQuestDef): boolean {
  const defeated = profile.defeatedActBosses || [];
  if (defeated.includes(q.act)) return true;
  return (profile.completedLocations || []).includes(q.bossLocationGlobal);
}

export function isMainQuestClaimed(profile: PlayerProfile, q: MainActQuestDef): boolean {
  return (profile.claimedMainQuests || []).includes(q.id);
}

export function isDailyActQuestReady(profile: PlayerProfile): boolean {
  const today = getTodayDateKey();
  return profile.dailyActClearedDate === today && profile.dailyActClaimedDate !== today;
}

export function isDailyActQuestClaimed(profile: PlayerProfile): boolean {
  return profile.dailyActClaimedDate === getTodayDateKey();
}

export function getReadySideLocations(profile: PlayerProfile): number[] {
  const cleared = profile.fullClearedLocations || [];
  const claimed = new Set(profile.claimedSideLocations || []);
  return cleared.filter((locIdx) => !claimed.has(locIdx)).sort((a, b) => a - b);
}

export function countAllReadyRewards(profile: PlayerProfile): {
  total: number;
  daily: number;
  main: number;
  side: number;
  wheel: number;
} {
  const dailyLogin = canClaimDailyReward(profile.lastDailyClaimDate) ? 1 : 0;
  const dailyAct = isDailyActQuestReady(profile) ? 1 : 0;
  const readyBounties = ensureActiveBounties(profile.bounties).filter((b) => {
    const def = BOUNTY_BY_ID[b.defId];
    return def && b.progress >= def.target;
  }).length;
  const daily = dailyLogin + dailyAct + readyBounties;

  const main = MAIN_ACT_QUESTS.filter(
    (q) => isMainQuestCompleted(profile, q) && !isMainQuestClaimed(profile, q)
  ).length;

  const side = getReadySideLocations(profile).length;
  const wheel = canSpinDailyWheel(profile.lastWheelSpinDate) ? 1 : 0;

  return {
    total: daily + main + side + wheel,
    daily,
    main,
    side,
    wheel,
  };
}

export function getNextDailyDay(prevStreak?: number, lastClaimDate?: string): number {
  if (!lastClaimDate) return 1;
  const today = new Date();
  const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yestKey = getTodayDateKey(yest);
  const todayKey = getTodayDateKey(today);
  if (lastClaimDate === todayKey) {
    return Math.max(1, Math.min(7, prevStreak || 1));
  }
  if (lastClaimDate === yestKey) {
    const next = (prevStreak || 0) + 1;
    return next > 7 ? 1 : next;
  }
  return 1;
}

export function rollReplacementBounty(excludeIds: string[]): ActiveBountyState {
  const excl = new Set(excludeIds);
  const candidates = BOUNTY_POOL.filter((b) => !excl.has(b.id));
  const pool = candidates.length > 0 ? candidates : BOUNTY_POOL;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { defId: pick.id, progress: 0 };
}

export function ensureActiveBounties(existing?: ActiveBountyState[]): ActiveBountyState[] {
  const valid = (existing || []).filter((b) => Boolean(BOUNTY_BY_ID[b.defId]));
  const result: ActiveBountyState[] = [...valid].slice(0, 3);
  const defaults = ['slay_20', 'combo_10', 'clear_loc_2'];
  let dIdx = 0;
  while (result.length < 3) {
    const used = result.map((r) => r.defId);
    const defId = defaults[dIdx++];
    if (defId && !used.includes(defId)) {
      result.push({ defId, progress: 0 });
    } else {
      result.push(rollReplacementBounty(used));
    }
  }
  return result;
}

import type { Rarity } from './types.js';

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

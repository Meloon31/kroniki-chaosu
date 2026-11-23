import type { PlayerProfile } from './types.js';

export type CosmeticSlot = 'title' | 'aura' | 'trail';

export interface CosmeticRewardDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  displayLabel: string;
  icon: string;
  color: string;
  requirement: string;
  checkUnlocked: (profile: PlayerProfile) => boolean;
}

function hasAnyGearAtLevel(profile: PlayerProfile, minUpgrade: number, requiredRarity?: 'boski' | 'niesmiertelny'): boolean {
  const all = [...Object.values(profile.equipped), ...profile.inventory].filter((x) => !!x);
  return all.some((it) => {
    if (!it) return false;
    if (it.upgradeLevel < minUpgrade) return false;
    if (requiredRarity && it.rarity !== requiredRarity) return false;
    return true;
  });
}

export const COSMETIC_REWARDS: CosmeticRewardDef[] = [
  // =========================================================
  // TYTUŁY NAD POSTACIĄ (PRESTIGE TITLES)
  // =========================================================
  {
    id: 'title_pogromca_chaosu',
    slot: 'title',
    name: 'Pogromca Chaosu',
    displayLabel: '🔥 Pogromca Chaosu',
    icon: '🔥',
    color: '#fb7185',
    requirement: 'Pokonaj Vaelgora, Archonta Chaosu (Akt 4)',
    checkUnlocked: (p) => (p.defeatedActBosses || []).includes(4) || p.sandboxUnlockAll,
  },
  {
    id: 'title_mistrz_kowalstwa',
    slot: 'title',
    name: 'Mistrz Kowalstwa',
    displayLabel: '🔨 Mistrz Kowalstwa',
    icon: '🔨',
    color: '#fbbf24',
    requirement: 'Ulepsz dowolny przedmiot u Kowala na +13',
    checkUnlocked: (p) => hasAnyGearAtLevel(p, 13) || p.sandboxUnlockAll,
  },
  {
    id: 'title_wladca_szczeliny',
    slot: 'title',
    name: 'Władca Szczeliny',
    displayLabel: '🌀 Władca Szczeliny',
    icon: '🌀',
    color: '#c084fc',
    requirement: 'Ukończ co najmniej 3. piętro Szczeliny Chaosu',
    checkUnlocked: (p) => (p.bestRiftFloor || 0) >= 3 || p.sandboxUnlockAll,
  },
  {
    id: 'title_aniol_wsparcia',
    slot: 'title',
    name: 'Anioł Stróż',
    displayLabel: '👼 Anioł Stróż',
    icon: '👼',
    color: '#4ade80',
    requirement: 'Wskrześ sojusznika 3 razy lub wyczyść 5 lokacji w 100%',
    checkUnlocked: (p) =>
      (p.totalRevives || 0) >= 3 || (p.fullClearedLocations || []).length >= 5 || p.sandboxUnlockAll,
  },
  {
    id: 'title_mistrz_refleksu',
    slot: 'title',
    name: 'Cień Refleksu',
    displayLabel: '⚡ Cień Refleksu',
    icon: '⚡',
    color: '#38bdf8',
    requirement: 'Wykonaj 10 Perfekcyjnych Uników w walce',
    checkUnlocked: (p) => (p.perfectDodgesTotal || 0) >= 10 || p.sandboxUnlockAll,
  },
  {
    id: 'title_niesmiertelny',
    slot: 'title',
    name: 'Nieśmiertelny Tytan',
    displayLabel: '💎 Nieśmiertelny Tytan',
    icon: '💎',
    color: '#00f5d4',
    requirement: 'Pokonaj Aeternusa (Hardcore Akt 7) lub wbij przedmiot na +20',
    checkUnlocked: (p) =>
      (p.defeatedActBosses || []).includes(7) || hasAnyGearAtLevel(p, 20) || p.sandboxUnlockAll,
  },

  // =========================================================
  // KOMIKSOWE AURY POD STOPAMI (GROUND AURAS)
  // =========================================================
  {
    id: 'aura_boski_13',
    slot: 'aura',
    name: 'Boska Korona +13',
    displayLabel: '✨ Boska Korona +13',
    icon: '✨',
    color: '#fde047',
    requirement: 'Ulepsz dowolny przedmiot Boski na +13',
    checkUnlocked: (p) => hasAnyGearAtLevel(p, 13, 'boski') || p.sandboxUnlockAll,
  },
  {
    id: 'aura_chaos_rift',
    slot: 'aura',
    name: 'Krąg Szczeliny Chaosu',
    displayLabel: '🌀 Krąg Szczeliny',
    icon: '🌀',
    color: '#a855f7',
    requirement: 'Ukończ 1. piętro Szczeliny Chaosu',
    checkUnlocked: (p) => (p.bestRiftFloor || 0) >= 1 || p.sandboxUnlockAll,
  },
  {
    id: 'aura_niesmiertelnosc',
    slot: 'aura',
    name: 'Astralna Aura Wieczności',
    displayLabel: '💎 Aura Wieczności',
    icon: '💎',
    color: '#00f5d4',
    requirement: 'Zdobądź przedmiot Nieśmiertelny (Tryb Hardcore)',
    checkUnlocked: (p) => hasAnyGearAtLevel(p, 0, 'niesmiertelny') || p.sandboxUnlockAll,
  },

  // =========================================================
  // UNIKALNE EFEKTY ŚLADU BIEGU I PORTALU (TRAILS)
  // =========================================================
  {
    id: 'trail_flawless_quad',
    slot: 'trail',
    name: 'Ślad Niepokonanych (4× Co-op)',
    displayLabel: '🌈 Ślad Niepokonanych',
    icon: '🌈',
    color: '#f43f5e',
    requirement: 'Pokonaj Vaelgora (Akt 4) w 4-osobowej drużynie bez ani jednego powalenia!',
    checkUnlocked: (p) => !!p.noDownAct4QuadCleared || p.sandboxUnlockAll,
  },
  {
    id: 'trail_gold_sparks',
    slot: 'trail',
    name: 'Złote Iskry Mentora',
    displayLabel: '🌟 Złote Iskry',
    icon: '🌟',
    color: '#fbbf24',
    requirement: 'Zdobądź co najmniej 2 Odłamki Mentora (lub wyczyść 3 lokacje 100%)',
    checkUnlocked: (p) =>
      (p.mentorShards || 0) >= 2 || (p.fullClearedLocations || []).length >= 3 || p.sandboxUnlockAll,
  },
  {
    id: 'trail_void_embers',
    slot: 'trail',
    name: 'Żar Pustki',
    displayLabel: '🔥 Żar Pustki',
    icon: '🔥',
    color: '#c084fc',
    requirement: 'Pokonaj Bossa Aktu 4 lub ukończ 5. piętro Szczeliny Chaosu',
    checkUnlocked: (p) =>
      (p.defeatedActBosses || []).includes(4) || (p.bestRiftFloor || 0) >= 5 || p.sandboxUnlockAll,
  },
];

export function getCosmeticById(id?: string | null): CosmeticRewardDef | undefined {
  if (!id) return undefined;
  return COSMETIC_REWARDS.find((c) => c.id === id);
}

export function getUnlockedCosmeticIds(profile: PlayerProfile): string[] {
  const existing = new Set(profile.unlockedCosmetics || []);
  for (const def of COSMETIC_REWARDS) {
    if (def.checkUnlocked(profile)) {
      existing.add(def.id);
    }
  }
  return Array.from(existing);
}

import type { ActNumber, ClassId } from './types.js';

export type RiftCategory = 'solo' | 'duo' | 'trio' | 'quad';

export interface RiftLeaderboardEntry {
  id: string;
  category: RiftCategory;
  floor: number;
  clearTimeMs: number;
  achievedAt: string;
  players: Array<{
    name: string;
    classId: ClassId;
    level: number;
  }>;
}

export type RiftLeaderboardMap = Record<RiftCategory, RiftLeaderboardEntry[]>;

export function getRiftCategory(partySize: number): RiftCategory {
  if (partySize <= 1) return 'solo';
  if (partySize === 2) return 'duo';
  if (partySize === 3) return 'trio';
  return 'quad';
}

export const RIFT_CATEGORY_LABELS: Record<RiftCategory, string> = {
  solo: '👤 Solo (1 Gracz)',
  duo: '👥 Duet (2 Graczy)',
  trio: '🛡️ Trio (3 Graczy)',
  quad: '👑 Pełna Drużyna (4 Graczy)',
};

/**
 * Endless Chaos Rift floor theme rotates through Acts 1-4 (and Hardcore 5-7 at high floors!).
 */
export function getRiftFloorAct(floor: number): ActNumber {
  const f = Math.max(1, Math.floor(floor));
  const cycle: ActNumber[] = [4, 1, 2, 3, 5, 6, 7];
  return cycle[(f - 1) % cycle.length];
}

/**
 * Scales enemy HP & Damage cleanly for Endless Floors designed for +10..+13 gear & maxed Boss Runes!
 * Floor 1 starts slightly above Act 4 Finale (Loc 60), scaling exponentially ~14% HP & ~9% DMG per floor.
 */
export function getRiftFloorHpMultiplier(floor: number): number {
  const f = Math.max(1, floor);
  return Number((1.15 * Math.pow(1.14, f - 1)).toFixed(3));
}

export function getRiftFloorDamageMultiplier(floor: number): number {
  const f = Math.max(1, floor);
  return Number((1.08 * Math.pow(1.09, f - 1)).toFixed(3));
}

export function getRiftFloorLuckBonus(floor: number): number {
  return Number((1.45 + Math.min(2.2, (Math.max(1, floor) - 1) * 0.12)).toFixed(2));
}

export function formatRiftTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

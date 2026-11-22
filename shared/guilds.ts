import type { ActNumber, ClassId } from './types.js';

export type GuildUpgradeId = 'atak' | 'obrona' | 'zycie' | 'kryt';

export const GUILD_MAX_LEVEL = 10;

export type GuildLevels = Record<GuildUpgradeId, number>; // 0..10
export type GuildShards = Record<GuildUpgradeId, number>;

export interface GuildUpgradeDef {
  id: GuildUpgradeId;
  name: string;
  shardName: string;
  icon: string;
  color: string;
  perLevelDesc: string;
  maxDesc: string;
  formatBonus: (level: number) => string;
}

export const GUILD_UPGRADES: Record<GuildUpgradeId, GuildUpgradeDef> = {
  atak: {
    id: 'atak',
    name: 'Potęga Gildii',
    shardName: 'Odłamek Ataku Gildii',
    icon: '⚔️',
    color: '#f87171',
    perLevelDesc: '+1% Ataku (AD i AP) za każdy poziom',
    maxDesc: 'Poziom 10: +10% AD i AP dla całej gildii!',
    formatBonus: (lvl) => `+${lvl}% AD i AP`,
  },
  obrona: {
    id: 'obrona',
    name: 'Bastion Gildii',
    shardName: 'Odłamek Obrony Gildii',
    icon: '🛡️',
    color: '#60a5fa',
    perLevelDesc: '+1% Obrony (DEF) za każdy poziom',
    maxDesc: 'Poziom 10: +10% DEF dla całej gildii!',
    formatBonus: (lvl) => `+${lvl}% DEF`,
  },
  zycie: {
    id: 'zycie',
    name: 'Serce Gildii',
    shardName: 'Odłamek Życia Gildii',
    icon: '❤️',
    color: '#4ade80',
    perLevelDesc: '+50 Max HP za każdy poziom',
    maxDesc: 'Poziom 10: +500 Max HP dla całej gildii!',
    formatBonus: (lvl) => `+${lvl * 50} Max HP`,
  },
  kryt: {
    id: 'kryt',
    name: 'Furia Gildii',
    shardName: 'Odłamek Krytyku Gildii',
    icon: '⚡',
    color: '#fde047',
    perLevelDesc: '+1% Szansy na Krytyk za każdy poziom',
    maxDesc: 'Poziom 10: +10% Szansy na Krytyk dla całej gildii!',
    formatBonus: (lvl) => `+${lvl}% Kryt`,
  },
};

export const GUILD_UPGRADE_LIST: GuildUpgradeDef[] = [
  GUILD_UPGRADES.atak,
  GUILD_UPGRADES.obrona,
  GUILD_UPGRADES.zycie,
  GUILD_UPGRADES.kryt,
];

export const GUILD_EMBLEMS = ['🏰', '🐉', '⚔️', '👑', '🔥', '🛡️', '🦅', '🌟'];
export const GUILD_COLORS = ['#fbbf24', '#38bdf8', '#4ade80', '#f43f5e', '#c084fc', '#fb923c'];

export interface GuildMemberSummary {
  playerUid: string;
  name: string;
  classId: ClassId;
  level: number;
  role: 'leader' | 'member';
  joinedAt: number;
}

export interface GuildState {
  id: string;
  code: string;
  name: string;
  tag: string;
  emblem: string;
  color: string;
  leaderUid: string;
  members: GuildMemberSummary[];
  upgrades: GuildLevels;
  shards: GuildShards;
  act8ClearedDate?: string;
  act9ClearedDate?: string;
  createdAt: number;
}

export interface GuildInvitePayload {
  guildId: string;
  guildName: string;
  guildTag: string;
  guildEmblem: string;
  fromName: string;
}

export function createStarterGuildLevels(): GuildLevels {
  return { atak: 0, obrona: 0, zycie: 0, kryt: 0 };
}

export function createStarterGuildShards(): GuildShards {
  return { atak: 0, obrona: 0, zycie: 0, kryt: 0 };
}

export function rollRandomGuildShard(rng: () => number = Math.random): GuildUpgradeId {
  const list: GuildUpgradeId[] = ['atak', 'obrona', 'zycie', 'kryt'];
  return list[Math.floor(rng() * list.length)];
}

export function isGuildAct(act: ActNumber): boolean {
  return act === 8 || act === 9;
}

export function isGuildLocation(globalIndex: number): boolean {
  return globalIndex >= 106 && globalIndex <= 135;
}

export function getGuildTodayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isGuildActClearedToday(guild: GuildState | null | undefined, act: 8 | 9): boolean {
  if (!guild) return false;
  const today = getGuildTodayKey();
  return act === 8 ? guild.act8ClearedDate === today : guild.act9ClearedDate === today;
}

export function getTotalGuildShards(guild: GuildState | null | undefined): number {
  if (!guild) return 0;
  return (
    (guild.shards.atak || 0) +
    (guild.shards.obrona || 0) +
    (guild.shards.zycie || 0) +
    (guild.shards.kryt || 0)
  );
}

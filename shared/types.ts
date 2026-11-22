export type ClassId = 'wojownik' | 'czarnoksieznik' | 'elf' | 'krasnolud' | 'wrozka';

export type Rarity = 'zwykly' | 'normalny' | 'mityczny' | 'legendarny' | 'boski';

export type EquipSlot = 'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'amulet';

export type RuneId = 'malakor' | 'azirath' | 'sylvara' | 'vaelgor';

export type ActNumber = 1 | 2 | 3 | 4;

export type DamageType = 'physical' | 'magical' | 'hybrid' | 'heal' | 'shield' | 'poison' | 'true';

export interface Vec2 {
  x: number;
  z: number;
}

export interface ItemBonusStats {
  hp?: number;
  ad?: number;
  ap?: number;
  def?: number;
  critChance?: number;   // percentage points e.g. 3.5 = +3.5%
  critDamage?: number;   // percentage points e.g. 12 = +12%
  attackSpeed?: number;  // percentage points
  moveSpeed?: number;    // percentage points
  cdr?: number;          // percentage points
  healPower?: number;    // percentage points
  dodge?: number;        // percentage points
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  itemLevel: number; // 1..60
  upgradeLevel: number; // 0..13
  baseStats: {
    hp: number;
    ad: number;
    ap: number;
    def: number;
  };
  bonusStats: ItemBonusStats;
  classAffinity?: ClassId;
}

export type EquippedGear = Record<EquipSlot, EquipmentItem | null>;

export type ShardBag = Record<Rarity, number>;

export type RuneLevels = Record<RuneId, number>; // 0..10
export type RuneShards = Record<RuneId, number>;

export interface SkillRanks {
  active1: number; // 1..12
  active2: number; // 1..12
  active3: number; // 1..12
  passive1: number; // 0..12
  passive2: number; // 0..12
}

export interface ComputedStats {
  maxHp: number;
  maxMana: number;
  ad: number;
  ap: number;
  def: number;
  moveSpeed: number;      // multiplier, e.g. 1.00, 1.25
  attackSpeed: number;    // multiplier, e.g. 1.00
  critChance: number;     // 0..100 (%)
  critDamage: number;     // e.g. 165 (%)
  cdr: number;            // 0..55 (%)
  damageReduction: number;// 0..75 (%)
  dodgeChance: number;    // 0..55 (%)
  healPower: number;      // multiplier, e.g. 1.00
  shieldPower: number;    // multiplier, e.g. 1.00
  activeSetRarity: Rarity | null;
  setCounts: Record<Rarity, number>;
  weaponUpgradeGlow: number; // 0..13
  armorUpgradeGlow: number;  // 0..13
  combatPower: number;
}

export interface PlayerProfile {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  skillPoints: number;
  skillRanks: SkillRanks;
  equipped: EquippedGear;
  inventory: EquipmentItem[];
  shards: ShardBag;
  runes: RuneLevels;
  runeShards: RuneShards;
  unlockedLocationGlobal: number; // 1..60
  completedLocations: number[];   // global indices 1..60
  sandboxUnlockAll: boolean;
}

export interface NetPlayerState {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  x: number;
  z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  shield: number;
  mana: number;
  maxMana: number;
  alive: boolean;
  animState: 'idle' | 'run' | 'attack' | 'cast' | 'spin' | 'dash' | 'dead';
  animTime: number;
  weaponGlow: number;
  armorGlow: number;
  activeSetRarity: Rarity | null;
  // Status flags
  rootedUntil: number;
  slowedUntil: number;
  stoneSkinUntil: number;
  hasteUntil: number;
  invulnUntil: number;
  shieldExpiresAt: number;
  potionReadyAt: number;
  stats: ComputedStats;
}

export type EnemyTier = 'normal' | 'elite' | 'miniboss' | 'boss' | 'summon' | 'root_trap';

export interface EnemyState {
  id: string;
  archetype: string;
  name: string;
  tier: EnemyTier;
  act: ActNumber;
  bossId?: RuneId;
  x: number;
  z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  radius: number;
  speed: number;
  damage: number;
  xpReward: number;
  alive: boolean;
  animState: 'idle' | 'run' | 'attack' | 'cast' | 'burrow' | 'dead';
  stunnedUntil: number;
  slowedUntil: number;
  weakenedUntil: number;
  tauntedBy: string | null;
  tauntedUntil: number;
  castingAbility?: {
    id: string;
    name: string;
    startedAt: number;
    executeAt: number;
    targetX: number;
    targetZ: number;
  };
  rootVictimId?: string;
}

export interface TelegraphZone {
  id: string;
  shape: 'circle' | 'line' | 'ring' | 'beam' | 'cone' | 'arena_chaos';
  x: number;
  z: number;
  radius: number;
  length?: number;
  width?: number;
  angle?: number;
  color: string;
  label?: string;
  createdAt: number;
  triggerAt: number;
  duration?: number; // for persistent hazards like poison / curse / tornado / beam
  expiresAt?: number;
  ownerId: string;
  abilityId: string;
  vx?: number;
  vz?: number;
}

export interface GroundLoot {
  id: string;
  x: number;
  z: number;
  item?: EquipmentItem;
  runeShard?: RuneId;
  ownerId?: string; // undefined = shared/first pickup or instanced
  droppedAt: number;
  pickedUp: boolean;
}

export type PuzzleType = 'pressure_plates' | 'rotating_statues' | 'symbol_match';

export interface WorldPuzzleState {
  id: string;
  type: PuzzleType;
  roomIndex: number;
  x: number;
  z: number;
  gateX: number;
  gateZ: number;
  gateHorizontal: boolean;
  solved: boolean;
  // For pressure_plates: sequence of indices [0,1,2,3] to step on in order
  targetSequence: number[];
  currentSequence: number[];
  // For rotating_statues: angles 0..3 (x90 deg), target is all 0 (facing center)
  statueAngles: number[];
  // For symbol_match: 3 pillars with symbol index 0..3 matching targetSymbols
  pillarSymbols: number[];
  targetSymbols: number[];
  // Element positions
  nodes: Array<{ x: number; z: number; hintIndex: number }>;
}

export interface SecretPassageState {
  id: string;
  kind: 'cracked_wall' | 'hidden_lever' | 'rune_path';
  x: number;
  z: number;
  wallX: number;
  wallZ: number;
  leverX?: number;
  leverZ?: number;
  revealed: boolean;
  hp: number;
  maxHp: number;
}

export interface LockedChestState {
  id: string;
  x: number;
  z: number;
  isSecret: boolean;
  puzzleSeed: number;
  puzzleVariant: 'sequence' | 'rotate' | 'symbols';
  opened: boolean;
  lockedByPlayerId?: string;
}

export interface ObsidianPillarState {
  id: string;
  x: number;
  z: number;
  radius: number;
  expiresAt: number;
}

export interface MapWall {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  id?: string;
  destructible?: boolean;
  gateId?: string;
  secretId?: string;
}

export interface MapRoom {
  index: number;
  cx: number;
  cz: number;
  w: number;
  d: number;
  kind: 'spawn' | 'combat' | 'puzzle' | 'secret' | 'shrine' | 'boss' | 'exit';
}

export interface MapProp {
  x: number;
  z: number;
  kind: string;
  scale: number;
  rotY: number;
}

export interface LocationDefinition {
  globalIndex: number; // 1..60
  act: ActNumber;
  locationInAct: number; // 1..15
  name: string;
  subtitle: string;
  isMiniBoss: boolean;
  isMainBoss: boolean;
  bossName?: string;
  bossId?: RuneId;
  recommendedLevel: number;
  seed: number;
}

export interface GeneratedMapData {
  location: LocationDefinition;
  width: number;
  height: number;
  spawn: Vec2;
  exitPortal: Vec2;
  rooms: MapRoom[];
  walls: MapWall[];
  props: MapProp[];
  shrines: Array<{ id: string; x: number; z: number; used: boolean }>;
  puzzles: WorldPuzzleState[];
  secrets: SecretPassageState[];
  chests: LockedChestState[];
}

export interface FloatingCombatText {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  subtext?: string;
  damageType: DamageType;
  isCrit?: boolean;
  isComicWord?: boolean;
  createdAt: number;
}

export interface SkillVfxEvent {
  id: string;
  kind:
    | 'slash'
    | 'whirlwind'
    | 'charge'
    | 'shadow_orb'
    | 'meteor'
    | 'soul_drain'
    | 'magic_arrow'
    | 'volley_backflip'
    | 'wind_blade'
    | 'hammer_slam'
    | 'stone_skin'
    | 'earthquake'
    | 'radiant_bolt'
    | 'heal_wave'
    | 'light_barrier'
    | 'boss_bone_wave'
    | 'boss_leap_slam'
    | 'boss_summon'
    | 'boss_curse'
    | 'boss_burrow'
    | 'boss_solar_beam'
    | 'boss_sandstorm'
    | 'boss_stinger'
    | 'boss_roots'
    | 'boss_spores'
    | 'boss_thorn_nova'
    | 'boss_bark_shield'
    | 'boss_rift_slash'
    | 'boss_obsidian_rain'
    | 'boss_lava_ring'
    | 'boss_chaos_burst'
    | 'miniboss_cleave'
    | 'miniboss_soul_nova'
    | 'miniboss_sand_roar'
    | 'miniboss_venom_web'
    | 'miniboss_magma_slam'
    | 'potion_heal'
    | 'chest_open'
    | 'secret_break'
    | 'puzzle_solve'
    | 'level_up';
  x: number;
  z: number;
  tx?: number;
  tz?: number;
  radius?: number;
  color?: string;
  duration?: number;
  casterId?: string;
}

export interface TradeSessionState {
  tradeId: string;
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  offerA: EquipmentItem[];
  offerB: EquipmentItem[];
  lockedA: boolean;
  lockedB: boolean;
  acceptedA: boolean;
  acceptedB: boolean;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface LobbyMember {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  ready: boolean;
  isHost: boolean;
}

export interface RoomSummary {
  code: string;
  hostId: string;
  act: ActNumber;
  locationInAct: number;
  globalLocation: number;
  inGame: boolean;
  members: LobbyMember[];
  enemyCountMultiplier: number;
  bossHpMultiplier: number;
  bossDamageMultiplier: number;
}

export interface WorldSnapshot {
  tick: number;
  serverTime: number;
  globalLocation: number;
  partySize: number;
  players: NetPlayerState[];
  enemies: EnemyState[];
  telegraphs: TelegraphZone[];
  loot: GroundLoot[];
  puzzles: WorldPuzzleState[];
  secrets: SecretPassageState[];
  chests: LockedChestState[];
  shrines: Array<{ id: string; x: number; z: number; used: boolean }>;
  pillars: ObsidianPillarState[];
  exitUnlocked: boolean;
  enemiesRemaining: number;
  totalEnemies: number;
  bossDefeated: boolean;
}

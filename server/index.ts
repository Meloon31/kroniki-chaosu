import express from 'express';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

import {
  CLASSES,
  getBossDamageMultiplier,
  getBossHpMultiplier,
  getEnemyCountMultiplier,
  targetLocationXpPool,
} from '../shared/classes.js';
import {
  ACT_ENEMIES,
  BossAbilityDef,
  getMainBossByAct,
  getMiniBoss,
  MAIN_BOSSES,
} from '../shared/bosses.js';
import { ALL_CLASS_IDS, generateEquipmentItem, rollDropRarity } from '../shared/items.js';
import {
  ALL_BOON_IDS,
  BoonId,
  CHAOS_BOONS,
  ELITE_AFFIX_META,
  EliteAffix,
  LOCATION_MUTATORS,
  LocationMutatorId,
} from '../shared/mutators.js';
import { getRuneByAct, RUNE_SHARD_DROP_CHANCE } from '../shared/runes.js';
import {
  clipPointToLineOfSight,
  createSeededRng,
  generateMapData,
  getLocationDef,
  hasLineOfSight,
  moveWithWallSweep,
  resolveWallCollisions,
} from '../shared/world.js';
import type {
  ClassId,
  ComputedStats,
  DamageType,
  EnemyState,
  EquipmentItem,
  FloatingCombatText,
  GeneratedMapData,
  GroundLoot,
  LobbyMember,
  NetPlayerState,
  ObsidianPillarState,
  RoomSummary,
  SkillRanks,
  SkillVfxEvent,
  TelegraphZone,
  TradeSessionState,
  WorldSnapshot,
} from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = Number(process.env.PORT) || 3001;

function getLanUrls(port: number): string[] {
  const urls: string[] = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

const distDir = path.resolve(__dirname, '../../dist');

function readCurrentBuildVersion(): { appVersion: string; buildId: string; builtAt: string } {
  try {
    const raw = fs.readFileSync(path.join(distDir, 'version.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { appVersion: '1.0.0', buildId: 'dev', builtAt: new Date().toISOString() };
  }
}

let lastKnownBuildId = readCurrentBuildVersion().buildId;

// Watch dist/version.json every 5s: when a fresh build lands, push live update notice to all clients!
const versionWatchTimer = setInterval(() => {
  const cur = readCurrentBuildVersion();
  if (cur.buildId && cur.buildId !== lastKnownBuildId) {
    lastKnownBuildId = cur.buildId;
    io.emit('server:update_available', cur);
  }
}, 5000);

app.use(
  express.static(distDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('version.json')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  })
);
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, time: Date.now(), ...readCurrentBuildVersion() });
});
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(readCurrentBuildVersion());
});
app.get('/api/network-info', (_req, res) => {
  res.json({
    port: PORT,
    lanUrls: getLanUrls(PORT),
  });
});

interface ServerPlayer extends NetPlayerState {
  socketId: string;
  ready: boolean;
  skillRanks: SkillRanks;
  cooldowns: {
    basic: number;
    active1: number;
    active2: number;
    active3: number;
    dash: number;
  };
  whirlwindUntil: number;
  whirlwindNextTick: number;
  poisonUntil: number;
  poisonNextTick: number;
  poisonDps: number;
  respawnAt: number;
  lastPlateId?: string;
  lastWardHintAt?: number;
  activeBoons: BoonId[];
  pendingBoonChoices?: BoonId[];
  flameAuraNextTick: number;
  titanBarrierNextTick: number;
}

interface ServerEnemy extends EnemyState {
  homeX: number;
  homeZ: number;
  aggro: boolean;
  nextAttackAt: number;
  abilityCooldowns: Record<string, number>;
  lastAbilityId?: string;
  healChannelUntil?: number;
  healNextTick?: number;
  burrowUntil?: number;
  burrowTargetX?: number;
  burrowTargetZ?: number;
  solarBeamAngle?: number;
  armor: number;
  armorPenPct: number;
  requiredPower: number;
  skillMaxHpPct: number;
  isWaveMob?: boolean;
  goblinDespawnAt?: number;
  nextSpecialAt?: number;
}

interface ActiveTelegraph extends TelegraphZone {
  resolved: boolean;
  damage: number;
  damageType: DamageType;
  appliesPoison?: boolean;
  appliesSlow?: boolean;
  appliesRoot?: boolean;
  isChaosBurst?: boolean;
  isLavaRing?: boolean;
  ringMaxRadius?: number;
  nextTickAt?: number;
  armorPenPct?: number;
  extraMaxHpPct?: number;
  bossRequiredPower?: number;
  hitsEnemies?: boolean;
}

interface GameRoom {
  code: string;
  hostId: string;
  globalLocation: number;
  inGame: boolean;
  tick: number;
  mapData: GeneratedMapData | null;
  players: Map<string, ServerPlayer>;
  enemies: Map<string, ServerEnemy>;
  telegraphs: Map<string, ActiveTelegraph>;
  loot: Map<string, GroundLoot>;
  pillars: ObsidianPillarState[];
  totalEnemies: number;
  bossDefeated: boolean;
  clearBonusAwarded: boolean;
  mutatorId: LocationMutatorId;
  comboCount: number;
  maxCombo: number;
  enemiesSlain: number;
  comboExpiresAt: number;
  nextMeteorAt: number;
  trades: Map<string, TradeSessionState>;
  pendingCombatTexts: FloatingCombatText[];
  pendingVfx: SkillVfxEvent[];
  loopTimer?: ReturnType<typeof setInterval>;
}

const rooms = new Map<string, GameRoom>();
const socketToRoom = new Map<string, string>();
let uidCounter = 1;

function nextId(prefix: string): string {
  return `${prefix}_${(uidCounter++).toString(36)}_${Math.floor(Math.random() * 9999).toString(36)}`;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function buildRoomSummary(room: GameRoom): RoomSummary {
  const loc = getLocationDef(room.globalLocation);
  const partySize = Math.max(1, room.players.size);
  const members: LobbyMember[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    classId: p.classId,
    level: p.level,
    ready: p.ready,
    isHost: p.id === room.hostId,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    act: loc.act,
    locationInAct: loc.locationInAct,
    globalLocation: room.globalLocation,
    inGame: room.inGame,
    members,
    enemyCountMultiplier: getEnemyCountMultiplier(partySize),
    bossHpMultiplier: getBossHpMultiplier(partySize),
    bossDamageMultiplier: getBossDamageMultiplier(partySize),
  };
}

function broadcastRoomSummary(room: GameRoom) {
  io.to(room.code).emit('room:summary', buildRoomSummary(room));
}

function pushCombatText(
  room: GameRoom,
  x: number,
  y: number,
  z: number,
  text: string,
  damageType: DamageType,
  isCrit = false,
  isComicWord = false,
  subtext?: string
) {
  room.pendingCombatTexts.push({
    id: nextId('fct'),
    x,
    y,
    z,
    text,
    subtext,
    damageType,
    isCrit,
    isComicWord,
    createdAt: Date.now(),
  });
}

function pushVfx(room: GameRoom, vfx: Omit<SkillVfxEvent, 'id'>) {
  room.pendingVfx.push({
    id: nextId('vfx'),
    ...vfx,
  });
}

function getPartyFairyAuraCdr(room: GameRoom): number {
  let maxAura = 0;
  for (const p of room.players.values()) {
    if (p.classId === 'wrozka' && p.alive) {
      const aura = (p.skillRanks.passive2 || 0) * 1.2;
      if (aura > maxAura) maxAura = aura;
    }
  }
  return maxAura;
}

function getEffectivePlayerCdr(room: GameRoom, player: ServerPlayer): number {
  const baseCdr = player.stats.cdr;
  const fairyAura = player.classId === 'wrozka' ? 0 : getPartyFairyAuraCdr(room);
  const boonCdr = player.activeBoons.includes('swift_step') ? 25 : 0;
  return Math.min(55, baseCdr + fairyAura + boonCdr);
}

function offerBoonsToParty(room: GameRoom, sourceTitle: string) {
  for (const ally of room.players.values()) {
    const available = ALL_BOON_IDS.filter((id) => !ally.activeBoons.includes(id));
    const pool = available.length >= 3 ? available : [...ALL_BOON_IDS];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);
    ally.pendingBoonChoices = choices;
    io.to(ally.socketId).emit('boon:offer', {
      title: sourceTitle,
      choices,
    });
  }
}

function pickEliteAffix(rng: () => number): EliteAffix {
  const list: EliteAffix[] = ['mortar', 'frost', 'charger', 'vampiric'];
  return list[Math.floor(rng() * list.length)];
}

function spawnObeliskWave(room: GameRoom, waveNum: number) {
  if (!room.mapData?.obelisk) return;
  const ob = room.mapData.obelisk;
  const loc = room.mapData.location;
  const partySize = Math.max(1, room.players.size);
  const countMult = getEnemyCountMultiplier(partySize);
  const actRoster = ACT_ENEMIES[loc.act];
  const L = loc.globalIndex;
  const baseMobHp = Math.round((180 + L * 68 + Math.pow(L, 2.25) * 2.35) * 1.25);
  const baseMobDmg = Math.round(16 + L * 5.2 + Math.pow(L, 1.72) * 0.72);
  const mobArmor = Math.round(12 + L * 4.5);

  const packCount = Math.round((4 + waveNum * 2) * countMult);
  for (let i = 0; i < packCount; i++) {
    const arch = actRoster[Math.floor(Math.random() * actRoster.length)];
    const isElite = i === 0 || (waveNum === 3 && i === 1);
    const affix = isElite ? pickEliteAffix(Math.random) : undefined;
    const ang = (i / packCount) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 6.5 + Math.random() * 4.5;
    const ex = ob.x + Math.cos(ang) * dist;
    const ez = ob.z + Math.sin(ang) * dist;
    const hp = Math.round(baseMobHp * arch.hpMult * (isElite ? 2.2 : 0.92));
    const dmg = Math.round(baseMobDmg * arch.dmgMult * (isElite ? 1.3 : 1.0));
    const mob: ServerEnemy = {
      id: nextId('wave'),
      archetype: arch.archetype,
      name:
        isElite && affix
          ? `${ELITE_AFFIX_META[affix].icon} Elitarny ${arch.name}`
          : isElite
            ? `Elitarny ${arch.name}`
            : arch.name,
      tier: isElite ? 'elite' : 'normal',
      act: loc.act,
      affix,
      x: ex,
      z: ez,
      homeX: ob.x,
      homeZ: ob.z,
      rotY: 0,
      hp,
      maxHp: hp,
      shield: 0,
      maxShield: 0,
      radius: arch.radius * (isElite ? 1.24 : 1.0),
      speed: arch.speed * 1.08,
      damage: dmg,
      xpReward: Math.max(15, Math.round(targetLocationXpPool(L) * 0.015)),
      alive: true,
      animState: 'run',
      stunnedUntil: 0,
      slowedUntil: 0,
      weakenedUntil: 0,
      tauntedBy: null,
      tauntedUntil: 0,
      aggro: true,
      nextAttackAt: 0,
      abilityCooldowns: {},
      armor: isElite ? Math.round(mobArmor * 1.25) : mobArmor,
      armorPenPct: isElite ? 8 : 4,
      requiredPower: 0,
      skillMaxHpPct: 0,
      isWaveMob: true,
      nextSpecialAt: Date.now() + 2600 + Math.random() * 2000,
    };
    room.enemies.set(mob.id, mob);
  }
  pushVfx(room, { kind: 'boss_summon', x: ob.x, z: ob.z, radius: 7, color: '#38bdf8' });
  io.to(room.code).emit('game:banner', {
    type: 'boss',
    title: `🔮 FALA ${waveNum}/${ob.maxWaves} — PRZETRWAJ ZASADZKĘ!`,
    subtitle: 'Pokonaj wszystkich napastników wokół Kryształu Fal!',
  });
}

/**
 * Applies a tactical bounded shield with expiration so shields are clutch tools, never infinite immortality.
 */
function applyBoundedShield(player: ServerPlayer, amount: number, durationMs: number, now: number): number {
  const capPct = player.classId === 'krasnolud' ? 0.48 : 0.42;
  const cap = Math.round(player.maxHp * capPct);
  const clamped = Math.min(cap, Math.max(player.shield, Math.round(amount)));
  player.shield = clamped;
  player.shieldExpiresAt = now + durationMs;
  return clamped;
}

/**
 * Populates a location with balanced enemies, unique mini-bosses, and calibrated Main Act Bosses:
 * - Act 1 Boss (Malakor): Normalny +0, 0 Runes (~3 min)
 * - Act 2 Boss (Azirath): Min. Full Mityczny +7 (~3.5 min)
 * - Act 3 Boss (Sylvara): Min. Full Legendarny +7 (~4 min)
 * - Act 4 Boss (Vaelgor): Min. Full Legendarny +9 (~4.5 min; even Boski +13 + 4x10/10 Runes ~2.1 min!)
 */
function initializeLocation(room: GameRoom, globalLocation: number) {
  room.globalLocation = Math.max(1, Math.min(60, globalLocation));
  const map = generateMapData(room.globalLocation);
  room.mapData = map;
  room.enemies.clear();
  room.telegraphs.clear();
  room.loot.clear();
  room.pillars = [];
  room.bossDefeated = false;
  room.clearBonusAwarded = false;
  room.mutatorId = map.location.mutatorId;
  room.comboCount = 0;
  room.maxCombo = 0;
  room.enemiesSlain = 0;
  room.comboExpiresAt = 0;
  room.nextMeteorAt = Date.now() + 4500;

  const partySize = Math.max(1, room.players.size);
  const countMult = getEnemyCountMultiplier(partySize);
  const bossHpMult = getBossHpMultiplier(partySize);
  const bossDmgMult = getBossDamageMultiplier(partySize);

  const loc = map.location;
  const mutDef = LOCATION_MUTATORS[loc.mutatorId];
  const isBounty = loc.mutatorId === 'bounty_hunt';
  const isFrenzy = loc.mutatorId === 'blood_frenzy';
  const rng = createSeededRng(loc.seed + 999);
  const actRoster = ACT_ENEMIES[loc.act];

  // Calibrated mob HP & DMG curve (Lvl 1 -> 60):
  // Loc 1 ~ 240 HP; Loc 15 ~ 1,650 HP; Loc 30 ~ 6,200 HP; Loc 45 ~ 14,500 HP; Loc 60 ~ 27,500 HP!
  // Prevents one-shotting even in maxed Boski +13!
  const L = loc.globalIndex;
  const baseMobHp = Math.round((180 + L * 68 + Math.pow(L, 2.25) * 2.35) * 1.25);
  const baseMobDmg = Math.round(16 + L * 5.2 + Math.pow(L, 1.72) * 0.72);
  const mobArmor = Math.round(12 + L * 4.5);

  const totalXpPool = targetLocationXpPool(loc.globalIndex);
  const spawnedEnemies: ServerEnemy[] = [];

  for (const r of map.rooms) {
    if (r.kind === 'spawn') continue;

    if (r.index === 8) {
      if (loc.isMainBoss) {
        const bossDef = getMainBossByAct(loc.act);
        const scaledHp = Math.round(bossDef.baseHp * bossHpMult * 1.25);
        const scaledDmg = Math.round(bossDef.baseDamage * bossDmgMult);
        const boss: ServerEnemy = {
          id: nextId('boss'),
          archetype: `boss_${bossDef.id}`,
          name: bossDef.name,
          tier: 'boss',
          act: loc.act,
          bossId: bossDef.id,
          x: r.cx,
          z: r.cz,
          homeX: r.cx,
          homeZ: r.cz,
          rotY: 0,
          hp: scaledHp,
          maxHp: scaledHp,
          shield: 0,
          maxShield: 0,
          radius: bossDef.radius,
          speed: bossDef.speed,
          damage: scaledDmg,
          xpReward: 0,
          alive: true,
          animState: 'idle',
          stunnedUntil: 0,
          slowedUntil: 0,
          weakenedUntil: 0,
          tauntedBy: null,
          tauntedUntil: 0,
          aggro: false,
          nextAttackAt: 0,
          abilityCooldowns: {},
          armor: bossDef.bossArmor,
          armorPenPct: bossDef.armorPenPct,
          requiredPower: bossDef.requiredPower,
          skillMaxHpPct: bossDef.skillMaxHpPct,
        };
        spawnedEnemies.push(boss);
      } else if (loc.isMiniBoss) {
        const mb = getMiniBoss(loc.act, loc.locationInAct)!;
        const actBoss = getMainBossByAct(loc.act);
        const mbHp = Math.round(baseMobHp * 13.5 * bossHpMult);
        const mbDmg = Math.round(baseMobDmg * 1.95 * bossDmgMult);
        const miniBoss: ServerEnemy = {
          id: nextId('miniboss'),
          archetype: mb.archetype,
          name: mb.name,
          tier: 'miniboss',
          act: loc.act,
          x: r.cx,
          z: r.cz,
          homeX: r.cx,
          homeZ: r.cz,
          rotY: 0,
          hp: mbHp,
          maxHp: mbHp,
          shield: 0,
          maxShield: 0,
          radius: 1.9,
          speed: 4.5,
          damage: mbDmg,
          xpReward: 0,
          alive: true,
          animState: 'idle',
          stunnedUntil: 0,
          slowedUntil: 0,
          weakenedUntil: 0,
          tauntedBy: null,
          tauntedUntil: 0,
          aggro: false,
          nextAttackAt: 0,
          abilityCooldowns: {},
          armor: Math.round(actBoss.bossArmor * 0.62),
          armorPenPct: Math.round(actBoss.armorPenPct * 0.65),
          requiredPower: Math.round(actBoss.requiredPower * (loc.locationInAct === 10 ? 0.72 : 0.52)),
          skillMaxHpPct: Math.max(5, actBoss.skillMaxHpPct - 4),
        };
        spawnedEnemies.push(miniBoss);
      } else {
        const count = Math.round(6 * countMult);
        for (let k = 0; k < count; k++) {
          const arch = actRoster[Math.floor(rng() * actRoster.length)];
          const isElite = k < (isBounty ? 3 : 2);
          const affix = isElite ? pickEliteAffix(rng) : undefined;
          const angle = (k / count) * Math.PI * 2;
          const dist = 4 + rng() * 6;
          const ex = r.cx + Math.cos(angle) * dist;
          const ez = r.cz + Math.sin(angle) * dist;
          const hp = Math.round(baseMobHp * arch.hpMult * (isElite ? 2.5 : 1.0));
          const dmg = Math.round(baseMobDmg * arch.dmgMult * (isElite ? 1.35 : 1.0));
          spawnedEnemies.push({
            id: nextId('mob'),
            archetype: arch.archetype,
            name:
              isElite && affix
                ? `${ELITE_AFFIX_META[affix].icon} Elitarny ${arch.name}`
                : isElite
                  ? `Elitarny ${arch.name}`
                  : arch.name,
            tier: isElite ? 'elite' : 'normal',
            act: loc.act,
            affix,
            x: ex,
            z: ez,
            homeX: ex,
            homeZ: ez,
            rotY: rng() * Math.PI * 2,
            hp,
            maxHp: hp,
            shield: 0,
            maxShield: 0,
            radius: arch.radius * (isElite ? 1.25 : 1.0),
            speed: arch.speed * (isFrenzy ? 1.25 : 1.0),
            damage: dmg,
            xpReward: 0,
            alive: true,
            animState: 'idle',
            stunnedUntil: 0,
            slowedUntil: 0,
            weakenedUntil: 0,
            tauntedBy: null,
            tauntedUntil: 0,
            aggro: false,
            nextAttackAt: 0,
            abilityCooldowns: {},
            armor: isElite ? Math.round(mobArmor * 1.35) : mobArmor,
            armorPenPct: isElite ? 10 : 4,
            requiredPower: 0,
            skillMaxHpPct: 0,
            nextSpecialAt: Date.now() + 2500 + Math.floor(rng() * 2500),
          });
        }
      }
      continue;
    }

    const basePackSize =
      r.kind === 'secret' ? 3 : r.kind === 'puzzle' ? 4 : r.kind === 'shrine' ? 5 : 6;
    const scaledCount = Math.max(2, Math.round(basePackSize * countMult));

    for (let k = 0; k < scaledCount; k++) {
      const arch = actRoster[Math.floor(rng() * actRoster.length)];
      const isElite =
        (k === 0 || (isBounty && k === 1)) && (r.kind === 'combat' || r.kind === 'secret' || (isBounty && r.kind === 'shrine'));
      const affix = isElite ? pickEliteAffix(rng) : undefined;
      const angle = rng() * Math.PI * 2;
      const dist = 3 + rng() * 9.5;
      const ex = r.cx + Math.cos(angle) * dist;
      const ez = r.cz + Math.sin(angle) * dist;
      const hp = Math.round(baseMobHp * arch.hpMult * (isElite ? 2.4 : 1.0));
      const dmg = Math.round(baseMobDmg * arch.dmgMult * (isElite ? 1.32 : 1.0));

      spawnedEnemies.push({
        id: nextId('mob'),
        archetype: arch.archetype,
        name:
          isElite && affix
            ? `${ELITE_AFFIX_META[affix].icon} Elitarny ${arch.name}`
            : isElite
              ? `Elitarny ${arch.name}`
              : arch.name,
        tier: isElite ? 'elite' : 'normal',
        act: loc.act,
        affix,
        x: ex,
        z: ez,
        homeX: ex,
        homeZ: ez,
        rotY: rng() * Math.PI * 2,
        hp,
        maxHp: hp,
        shield: 0,
        maxShield: 0,
        radius: arch.radius * (isElite ? 1.22 : 1.0),
        speed: arch.speed * (isFrenzy ? 1.25 : 1.0),
        damage: dmg,
        xpReward: 0,
        alive: true,
        animState: 'idle',
        stunnedUntil: 0,
        slowedUntil: 0,
        weakenedUntil: 0,
        tauntedBy: null,
        tauntedUntil: 0,
        aggro: false,
        nextAttackAt: 0,
        abilityCooldowns: {},
        armor: isElite ? Math.round(mobArmor * 1.3) : mobArmor,
        armorPenPct: isElite ? 8 : 4,
        requiredPower: 0,
        skillMaxHpPct: 0,
        nextSpecialAt: Date.now() + 2500 + Math.floor(rng() * 2500),
      });
    }

    // Spawn 1-2 tactical Explosive Powder Barrels in combat/shrine/puzzle rooms!
    if (r.kind === 'combat' || r.kind === 'shrine' || r.kind === 'puzzle') {
      const barrelCount = r.kind === 'combat' ? 2 : 1;
      for (let b = 0; b < barrelCount; b++) {
        const ba = rng() * Math.PI * 2;
        const bd = 4.5 + rng() * 5.5;
        const bx = r.cx + Math.cos(ba) * bd;
        const bz = r.cz + Math.sin(ba) * bd;
        const bid = nextId('barrel');
        room.enemies.set(bid, {
          id: bid,
          archetype: 'explosive_barrel',
          name: '🧨 Beczka Prochowa',
          tier: 'barrel',
          act: loc.act,
          x: bx,
          z: bz,
          homeX: bx,
          homeZ: bz,
          rotY: rng() * Math.PI * 2,
          hp: 1,
          maxHp: 1,
          shield: 0,
          maxShield: 0,
          radius: 0.95,
          speed: 0,
          damage: 0,
          xpReward: 0,
          alive: true,
          animState: 'idle',
          stunnedUntil: 0,
          slowedUntil: 0,
          weakenedUntil: 0,
          tauntedBy: null,
          tauntedUntil: 0,
          aggro: false,
          nextAttackAt: 0,
          abilityCooldowns: {},
          armor: 0,
          armorPenPct: 0,
          requiredPower: 0,
          skillMaxHpPct: 0,
        });
      }
    }

    // Spawn Shield Totems on shield_totems maps!
    if (loc.mutatorId === 'shield_totems' && (r.kind === 'combat' || r.kind === 'shrine')) {
      const totemHp = Math.round(baseMobHp * 1.8);
      const tid = nextId('totem');
      room.enemies.set(tid, {
        id: tid,
        archetype: 'shield_totem',
        name: '🛡️ Totem Ochronny',
        tier: 'totem',
        act: loc.act,
        x: r.cx + (rng() - 0.5) * 6,
        z: r.cz + (rng() - 0.5) * 6,
        homeX: r.cx,
        homeZ: r.cz,
        rotY: 0,
        hp: totemHp,
        maxHp: totemHp,
        shield: 0,
        maxShield: 0,
        radius: 1.15,
        speed: 0,
        damage: 0,
        xpReward: Math.max(25, Math.round(totalXpPool * 0.03)),
        alive: true,
        animState: 'idle',
        stunnedUntil: 0,
        slowedUntil: 0,
        weakenedUntil: 0,
        tauntedBy: null,
        tauntedUntil: 0,
        aggro: false,
        nextAttackAt: 0,
        abilityCooldowns: {},
        armor: 0,
        armorPenPct: 0,
        requiredPower: 0,
        skillMaxHpPct: 0,
        nextSpecialAt: Date.now() + 2000,
      });
    }
  }

  // Spawn Golden Treasure Goblin on treasure_goblin maps (or 25% surprise chance on regular maps!)
  if (loc.mutatorId === 'treasure_goblin' || (!loc.isMainBoss && !loc.isMiniBoss && Math.random() < 0.25)) {
    const gobRoom = map.rooms.find((r) => r.kind === 'combat' && r.index !== 0 && r.index !== 8) ?? map.rooms[4];
    const gobHp = Math.round(baseMobHp * 3.6 * countMult);
    const gid = nextId('goblin');
    room.enemies.set(gid, {
      id: gid,
      archetype: 'treasure_goblin',
      name: '💰 Złoty Goblin Skarbów',
      tier: 'goblin',
      act: loc.act,
      x: gobRoom.cx + 3,
      z: gobRoom.cz - 3,
      homeX: gobRoom.cx,
      homeZ: gobRoom.cz,
      rotY: 0,
      hp: gobHp,
      maxHp: gobHp,
      shield: 0,
      maxShield: 0,
      radius: 1.0,
      speed: 7.4,
      damage: 0,
      xpReward: Math.max(40, Math.round(totalXpPool * 0.08)),
      alive: true,
      animState: 'idle',
      stunnedUntil: 0,
      slowedUntil: 0,
      weakenedUntil: 0,
      tauntedBy: null,
      tauntedUntil: 0,
      aggro: false,
      nextAttackAt: 0,
      abilityCooldowns: {},
      armor: 0,
      armorPenPct: 0,
      requiredPower: 0,
      skillMaxHpPct: 0,
    });
  }

  // Spawn 4 roaming 3D elemental vortices on roaming_vortex maps!
  if (loc.mutatorId === 'roaming_vortex') {
    const now = Date.now();
    const vortexRooms = map.rooms.filter((r) => r.index !== 0 && r.kind !== 'secret').slice(0, 4);
    for (const vr of vortexRooms) {
      const ang = rng() * Math.PI * 2;
      const vid = nextId('vortex');
      room.telegraphs.set(vid, {
        id: vid,
        shape: 'circle',
        x: vr.cx,
        z: vr.cz,
        radius: 2.7,
        color: '#2dd4bf',
        label: 'Wir Żywiołów',
        createdAt: now,
        triggerAt: now + 800,
        duration: 600000,
        expiresAt: now + 600800,
        ownerId: 'world',
        abilityId: 'burza_piaskowa',
        vx: Math.cos(ang) * 4.8,
        vz: Math.sin(ang) * 4.8,
        resolved: false,
        damage: Math.round(baseMobDmg * 0.72),
        damageType: 'magical',
        appliesSlow: true,
      });
    }
  }

  const enemyXpPool = totalXpPool * 0.8;
  let totalWeight = 0;
  for (const e of spawnedEnemies) {
    totalWeight += e.tier === 'boss' ? 14 : e.tier === 'miniboss' ? 9 : e.tier === 'elite' ? 2.2 : 1;
  }
  for (const e of spawnedEnemies) {
    const w = e.tier === 'boss' ? 14 : e.tier === 'miniboss' ? 9 : e.tier === 'elite' ? 2.2 : 1;
    e.xpReward = Math.max(8, Math.round((w / Math.max(1, totalWeight)) * enemyXpPool));
    room.enemies.set(e.id, e);
  }

  room.totalEnemies = spawnedEnemies.length;

  let pIdx = 0;
  for (const p of room.players.values()) {
    const offAngle = (pIdx / Math.max(1, room.players.size)) * Math.PI * 2;
    p.x = map.spawn.x + Math.cos(offAngle) * 2.5;
    p.z = map.spawn.z + Math.sin(offAngle) * 2.5;
    p.hp = p.maxHp;
    p.mana = p.maxMana;
    p.shield = 0;
    p.shieldExpiresAt = 0;
    p.alive = true;
    p.rootedUntil = 0;
    p.slowedUntil = 0;
    p.poisonUntil = 0;
    p.animState = 'idle';
    p.activeBoons = [];
    p.pendingBoonChoices = undefined;
    p.flameAuraNextTick = 0;
    p.titanBarrierNextTick = 0;
    pIdx++;
  }

  io.to(room.code).emit('world:loaded', {
    mapData: map,
    partySize,
    enemyCountMultiplier: countMult,
    bossHpMultiplier: bossHpMult,
    bossDamageMultiplier: bossDmgMult,
  });
  io.to(room.code).emit('game:banner', {
    type: loc.isMainBoss || loc.isMiniBoss ? 'boss' : 'secret',
    title: `${mutDef.icon} ${loc.name.toUpperCase()}`,
    subtitle: `${mutDef.name}: ${mutDef.shortDesc}`,
  });
  broadcastRoomSummary(room);
}

function getSolvedGateIds(map: GeneratedMapData): Set<string> {
  const s = new Set<string>();
  for (const p of map.puzzles) {
    if (p.solved) s.add(p.id);
  }
  return s;
}

function getRevealedSecretIds(map: GeneratedMapData): Set<string> {
  const s = new Set<string>();
  for (const sec of map.secrets) {
    if (sec.revealed) s.add(sec.id);
  }
  return s;
}

function damagePlayer(
  room: GameRoom,
  player: ServerPlayer,
  rawDamage: number,
  damageType: DamageType,
  now: number,
  options?: {
    sourceLabel?: string;
    armorPenPct?: number;
    extraMaxHpPct?: number;
    bossRequiredPower?: number;
  }
) {
  if (!player.alive) return;
  if (now < player.invulnUntil) {
    pushCombatText(room, player.x, 2.5, player.z, 'UNIK!', 'shield', false, true);
    return;
  }

  if (damageType !== 'poison' && Math.random() * 100 < player.stats.dodgeChance) {
    pushCombatText(room, player.x, 2.5, player.z, 'UNIK!', 'shield', false, true);
    return;
  }

  const armorPen = options?.armorPenPct ?? 0;
  const effDef = player.stats.def * (1 - armorPen / 100);
  const defMitigation = Math.min(0.54, effDef / (effDef + 160 + room.globalLocation * 18));

  // Total non-armor DR strictly capped at 46% (no immortal tanks!)
  let dr = player.stats.damageReduction / 100;
  if (now < player.stoneSkinUntil) {
    dr += 0.26;
  }
  dr = Math.min(0.46, dr);

  // Undergeared boss pressure multiplier
  let underGearMult = 1.0;
  if (options?.bossRequiredPower && player.stats.combatPower < options.bossRequiredPower) {
    underGearMult = Math.min(2.0, options.bossRequiredPower / Math.max(1, player.stats.combatPower));
  }

  const baseHit = rawDamage * underGearMult * (1 - defMitigation) * (1 - dr);
  const hpPctBonus = options?.extraMaxHpPct ? player.maxHp * (options.extraMaxHpPct / 100) : 0;
  let dmg = Math.max(1, Math.round(baseHit + hpPctBonus));

  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, dmg);
    player.shield -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0 && dmg === 0) {
      pushCombatText(room, player.x, 2.4, player.z, `TARCZA -${absorbed}`, 'shield', false, false);
      return;
    }
  }

  player.hp = Math.max(0, player.hp - dmg);
  pushCombatText(
    room,
    player.x,
    2.4,
    player.z,
    `-${dmg}`,
    damageType,
    false,
    false,
    options?.sourceLabel
  );

  if (player.hp <= 0) {
    player.alive = false;
    player.shield = 0;
    player.animState = 'dead';
    player.respawnAt = now + 5500;
    io.to(room.code).emit('game:banner', {
      type: 'info',
      title: `${player.name} poległ!`,
      subtitle: 'Odrodzenie za 5 sekund lub uleczenie przez Wróżkę.',
    });
  }
}

function damageEnemy(
  room: GameRoom,
  attacker: ServerPlayer,
  enemy: ServerEnemy,
  rawDamage: number,
  damageType: DamageType,
  now: number,
  canCrit = true,
  allowBoonProcs = true,
  originPos?: { x: number; z: number }
): number {
  if (!enemy.alive) return 0;
  if (enemy.burrowUntil && now < enemy.burrowUntil) return 0;

  // Strict Line-of-Sight check: NEVER allow hitting mobs or bosses through solid walls from another room!
  if (room.mapData && enemy.tier !== 'root_trap') {
    const ox = originPos ? originPos.x : attacker.x;
    const oz = originPos ? originPos.z : attacker.z;
    const solvedGates = getSolvedGateIds(room.mapData);
    const revealedSecrets = getRevealedSecretIds(room.mapData);
    if (!hasLineOfSight(ox, oz, enemy.x, enemy.z, room.mapData.walls, solvedGates, revealedSecrets)) {
      return 0;
    }
  }

  enemy.aggro = true;
  let dmg = rawDamage;
  if (now < enemy.weakenedUntil) {
    dmg *= 1.12;
  }

  // Enemy Armor mitigation
  const offPower = Math.max(
    attacker.stats.ad,
    attacker.stats.ap,
    (attacker.stats.ad + attacker.stats.ap) * 0.56
  );
  const armorMit = enemy.armor / (enemy.armor + Math.max(80, offPower * 1.35));
  dmg *= 1 - armorMit;

  // Boss Gear Ward: steeply punishes fighting Act 2/3/4 Boss below required gear power!
  if (enemy.requiredPower > 0 && attacker.stats.combatPower < enemy.requiredPower) {
    const ratio = Math.max(0.2, attacker.stats.combatPower / Math.max(1, enemy.requiredPower));
    dmg *= Math.pow(ratio, 2.4);
    if (!attacker.lastWardHintAt || now - attacker.lastWardHintAt > 5500) {
      attacker.lastWardHintAt = now;
      pushCombatText(
        room,
        enemy.x,
        4.8,
        enemy.z,
        `ZA NISKA MOC! (${attacker.stats.combatPower}/${enemy.requiredPower})`,
        'physical',
        false,
        true
      );
    }
  }

  const hasCritFury = attacker.activeBoons.includes('crit_fury');
  const effCritChance = attacker.stats.critChance + (hasCritFury ? 28 : 0);
  const effCritDmg = attacker.stats.critDamage + (hasCritFury ? 55 : 0);
  const isCrit = canCrit && enemy.tier !== 'barrel' && Math.random() * 100 < effCritChance;
  if (isCrit) {
    dmg *= effCritDmg / 100;
  }

  dmg = Math.max(1, Math.round(dmg * (0.94 + Math.random() * 0.12)));

  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, dmg);
    enemy.shield -= absorbed;
    dmg -= absorbed;
    if (enemy.shield <= 0 && enemy.healChannelUntil && now < enemy.healChannelUntil) {
      enemy.healChannelUntil = 0;
      pushCombatText(room, enemy.x, 3.8, enemy.z, 'PRZERWANO LECZENIE!', 'shield', true, true);
      io.to(room.code).emit('game:banner', {
        type: 'boss',
        title: 'TARCZA ZNISZCZONA!',
        subtitle: `Leczenie ${enemy.name} zostało przerwane!`,
      });
    }
  }

  if (dmg > 0) {
    enemy.hp = Math.max(0, enemy.hp - dmg);
    if (allowBoonProcs && enemy.tier !== 'barrel') {
      // Vampiric Strikes Boon: heal 10% of damage dealt!
      if (attacker.activeBoons.includes('vampiric_strikes') && attacker.alive && attacker.hp < attacker.maxHp) {
        const vampHeal = Math.max(2, Math.min(attacker.maxHp - attacker.hp, Math.round(dmg * 0.1)));
        attacker.hp += vampHeal;
      }
      // Chain Lightning Boon: 35% chance to arc lightning to nearby enemies!
      if (attacker.activeBoons.includes('chain_lightning') && Math.random() < 0.35) {
        let jumps = 0;
        for (const other of room.enemies.values()) {
          if (!other.alive || other.id === enemy.id || other.tier === 'root_trap') continue;
          if (Math.hypot(other.x - enemy.x, other.z - enemy.z) <= 6.8) {
            jumps++;
            pushVfx(room, { kind: 'wind_blade', x: enemy.x, z: enemy.z, tx: other.x, tz: other.z, color: '#a855f7' });
            damageEnemy(room, attacker, other, Math.round(dmg * 0.55), 'magical', now, false, false);
            if (jumps >= 2) break;
          }
        }
        if (jumps > 0) {
          pushCombatText(room, enemy.x, 3.3, enemy.z, '⚡ PIORUN!', 'magical', false, true);
        }
      }
    }
  }

  if (enemy.tier !== 'barrel') {
    pushCombatText(
      room,
      enemy.x + (Math.random() - 0.5) * 0.8,
      enemy.tier === 'boss' ? 4.2 : 2.5,
      enemy.z + (Math.random() - 0.5) * 0.8,
      isCrit ? `${dmg}!` : `${dmg}`,
      damageType,
      isCrit,
      false
    );
  }

  if (isCrit) {
    io.to(attacker.socketId).emit('juice:crit', { intensity: enemy.tier === 'boss' ? 1.15 : 0.8 });
  }

  if (enemy.hp <= 0) {
    handleEnemyDeath(room, enemy, attacker, now);
  }

  return dmg;
}

function spawnEquipmentDrop(
  room: GameRoom,
  x: number,
  z: number,
  itemLevel: number,
  guaranteeDrop = false,
  luckBonus = 1.0,
  _classAffinity?: ClassId
) {
  const rarity = rollDropRarity(Math.random, guaranteeDrop, luckBonus);
  if (!rarity) return;

  // Equal 20% drop chance for each of the 5 hero classes (Wojownik, Czarnoksiężnik, Elf, Krasnolud, Wróżka)!
  const targetClass = ALL_CLASS_IDS[Math.floor(Math.random() * ALL_CLASS_IDS.length)];

  const item = generateEquipmentItem(itemLevel, rarity, undefined, targetClass);
  const spreadAngle = Math.random() * Math.PI * 2;
  const spreadDist = 0.8 + Math.random() * 2.2;
  const drop: GroundLoot = {
    id: nextId('loot'),
    x: x + Math.cos(spreadAngle) * spreadDist,
    z: z + Math.sin(spreadAngle) * spreadDist,
    item,
    droppedAt: Date.now(),
    pickedUp: false,
  };
  room.loot.set(drop.id, drop);

  if (rarity === 'boski') {
    io.to(room.code).emit('juice:boski_drop', {
      itemName: item.name,
      x: drop.x,
      z: drop.z,
    });
  }
}

function handleEnemyDeath(
  room: GameRoom,
  enemy: ServerEnemy,
  killer: ServerPlayer,
  now: number
) {
  enemy.alive = false;
  enemy.animState = 'dead';

  if (enemy.tier === 'root_trap' && enemy.rootVictimId) {
    const victim = room.players.get(enemy.rootVictimId);
    if (victim) {
      victim.rootedUntil = 0;
      pushCombatText(room, victim.x, 2.8, victim.z, 'UWOLNIONY!', 'heal', false, true);
    }
    return;
  }

  if (enemy.tier === 'barrel') {
    pushVfx(room, { kind: 'meteor', x: enemy.x, z: enemy.z, radius: 6.5, color: '#f97316' });
    pushCombatText(room, enemy.x, 2.8, enemy.z, '💥 KABOOM!', 'physical', true, true);
    for (const other of room.enemies.values()) {
      if (!other.alive || other.id === enemy.id || other.tier === 'root_trap') continue;
      if (Math.hypot(other.x - enemy.x, other.z - enemy.z) <= 6.8 + other.radius) {
        const blastPct = other.tier === 'boss' ? 0.06 : other.tier === 'miniboss' ? 0.1 : 0.42;
        const blastDmg = Math.max(120, Math.round(other.maxHp * blastPct));
        damageEnemy(room, killer, other, blastDmg, 'magical', now, false, false, { x: enemy.x, z: enemy.z });
      }
    }
    return;
  }

  if (enemy.tier === 'summon') return;

  const loc = getLocationDef(room.globalLocation);
  const mutDef = LOCATION_MUTATORS[room.mutatorId];
  const fortuneLuck = killer.activeBoons.includes('golden_fortune') ? 1.65 : 1.0;
  const effectiveLuck = mutDef.luckBonus * fortuneLuck;

  // Update Party Kill-Streak Combo & Expedition Stats!
  room.comboCount = now <= room.comboExpiresAt ? room.comboCount + 1 : 1;
  if (room.comboCount > room.maxCombo) room.maxCombo = room.comboCount;
  room.enemiesSlain++;
  room.comboExpiresAt = now + 5500;
  if (room.comboCount === 5 || room.comboCount === 10 || room.comboCount === 20 || room.comboCount === 30) {
    const label =
      room.comboCount >= 30
        ? '👑 30x LEGENDA!'
        : room.comboCount >= 20
          ? '💀 20x MASAKRA!'
          : room.comboCount >= 10
            ? '⚡ 10x SZAŁ!'
            : '🔥 5x SERIA!';
    pushCombatText(room, killer.x, 3.6, killer.z, label, 'physical', true, true);
  }

  const comboXpMult = 1 + Math.min(0.5, room.comboCount * 0.03);
  const mutXpMult = 1 + mutDef.xpBonusPct / 100;
  const boonXpMult = killer.activeBoons.includes('golden_fortune') ? 1.35 : 1.0;
  const finalXp = Math.round(enemy.xpReward * comboXpMult * mutXpMult * boonXpMult);

  if (finalXp > 0) {
    io.to(room.code).emit('player:xp_gain', {
      amount: finalXp,
      source: enemy.name,
    });
  }

  if (enemy.tier === 'goblin') {
    pushVfx(room, { kind: 'chest_open', x: enemy.x, z: enemy.z, radius: 5, color: '#fbbf24' });
    for (let i = 0; i < 5; i++) {
      spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, true, 1.55 * fortuneLuck, killer.classId);
    }
    io.to(room.code).emit('game:banner', {
      type: 'secret',
      title: '💰 ZŁOTY GOBLIN POKONANY!',
      subtitle: 'Worek skarbów pękł — 5 rzadkich łupów rozsypało się na arenie!',
    });
    return;
  }

  if (enemy.tier === 'totem') {
    pushVfx(room, { kind: 'puzzle_solve', x: enemy.x, z: enemy.z, radius: 5, color: '#a855f7' });
    pushCombatText(room, enemy.x, 3.2, enemy.z, '🛡️ TOTEM ROZBITY!', 'shield', true, true);
    for (const other of room.enemies.values()) {
      if (other.alive && other.shield > 0 && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= 18) {
        other.shield = 0;
      }
    }
    return;
  }

  // Volatile Foes mutator: slain mobs leave a telegraphed blast that hits players AND nearby enemies!
  if (room.mutatorId === 'volatile_foes' && (enemy.tier === 'normal' || enemy.tier === 'elite')) {
    const bid = nextId('tel');
    room.telegraphs.set(bid, {
      id: bid,
      shape: 'circle',
      x: enemy.x,
      z: enemy.z,
      radius: 4.1,
      color: '#ef4444',
      label: 'Wybuch!',
      createdAt: now,
      triggerAt: now + 1150,
      ownerId: enemy.id,
      abilityId: 'volatile_blast',
      resolved: false,
      damage: Math.round(enemy.damage * 1.15),
      damageType: 'magical',
      hitsEnemies: true,
    });
  }

  // Check Wave Obelisk progress!
  if (enemy.isWaveMob && room.mapData?.obelisk && room.mapData.obelisk.state === 'active') {
    let waveRemaining = 0;
    for (const e of room.enemies.values()) {
      if (e.alive && e.isWaveMob) waveRemaining++;
    }
    if (waveRemaining === 0) {
      const ob = room.mapData.obelisk;
      if (ob.currentWave < ob.maxWaves) {
        ob.currentWave++;
        spawnObeliskWave(room, ob.currentWave);
      } else {
        ob.state = 'completed';
        pushVfx(room, { kind: 'chest_open', x: ob.x, z: ob.z, radius: 6, color: '#38bdf8' });
        for (let i = 0; i < 3; i++) {
          spawnEquipmentDrop(room, ob.x, ob.z, loc.globalIndex, true, 1.45 * fortuneLuck, killer.classId);
        }
        const waveBonusXp = Math.round(targetLocationXpPool(loc.globalIndex) * 0.18);
        io.to(room.code).emit('player:xp_gain', { amount: waveBonusXp, source: 'Ołtarz Fal' });
        io.to(room.code).emit('game:banner', {
          type: 'boss_kill',
          title: '🏆 WYZWANIE FAL UKOŃCZONE!',
          subtitle: 'Zdobyto Skarb Mistrzów oraz wybór nowego Daru Chaosu!',
        });
        offerBoonsToParty(room, '🏆 NAGRODA OŁTARZA FAL — WYBIERZ DAR!');
      }
    }
  }

  if (enemy.tier === 'boss') {
    room.bossDefeated = true;
    for (let i = 0; i < 6; i++) {
      spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, i < 3, 1.35 * fortuneLuck, killer.classId);
    }

    const rune = getRuneByAct(loc.act);
    const rolledRune = Math.random() < RUNE_SHARD_DROP_CHANCE;
    if (rolledRune) {
      const runeLoot: GroundLoot = {
        id: nextId('runeloot'),
        x: enemy.x,
        z: enemy.z,
        runeShard: rune.id,
        droppedAt: now,
        pickedUp: false,
      };
      room.loot.set(runeLoot.id, runeLoot);
    }

    io.to(room.code).emit('game:banner', {
      type: 'boss_kill',
      title: `POKONANO BOSSA: ${enemy.name}!`,
      subtitle: rolledRune
        ? `WYPADŁ ${rune.shardName.toUpperCase()} (30% szansy)! Podnieś go z areny!`
        : 'Portal do kolejnego Aktu otwarty! Zbierz łupy z areny.',
      runeDropped: rolledRune ? rune.id : undefined,
    });
  } else if (enemy.tier === 'miniboss') {
    room.bossDefeated = true;
    for (let i = 0; i < 4; i++) {
      spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, i < 2, 1.2 * fortuneLuck, killer.classId);
    }
    io.to(room.code).emit('game:banner', {
      type: 'boss_kill',
      title: `POKONANO MINI-BOSSA: ${enemy.name}!`,
      subtitle: 'Portal do kolejnej lokacji został otwarty!',
    });
  } else if (enemy.tier === 'elite') {
    spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, true, 1.15 * effectiveLuck, killer.classId);
    spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, false, effectiveLuck, killer.classId);
  } else if (Math.random() < 0.55) {
    spawnEquipmentDrop(room, enemy.x, enemy.z, loc.globalIndex, false, effectiveLuck, killer.classId);
  }
}

function pickBossAbility(
  room: GameRoom,
  boss: ServerEnemy,
  target: ServerPlayer,
  now: number
): BossAbilityDef | null {
  const dist = Math.hypot(target.x - boss.x, target.z - boss.z);
  const hpRatio = boss.hp / Math.max(1, boss.maxHp);

  let pool: BossAbilityDef[] = [];
  if (boss.tier === 'boss' && boss.bossId) {
    pool = MAIN_BOSSES[boss.bossId].abilities;
  } else if (boss.tier === 'miniboss') {
    const loc = getLocationDef(room.globalLocation);
    const mb = getMiniBoss(loc.act, loc.locationInAct);
    if (mb) pool = mb.abilities;
  }

  const ready = pool.filter((ab) => {
    const cdEnd = boss.abilityCooldowns[ab.id] || 0;
    if (now < cdEnd) return false;
    if (ab.hpThresholdMax && hpRatio > ab.hpThresholdMax) return false;
    return true;
  });

  if (ready.length === 0) return null;

  const weighted = ready.map((ab) => {
    let w = ab.baseWeight;
    if (ab.id === boss.lastAbilityId) w *= 0.25;
    if (ab.preferredMinDist && dist >= ab.preferredMinDist) w *= 1.45;
    if (ab.preferredMaxDist && dist <= ab.preferredMaxDist) w *= 1.5;
    if (ab.id === 'pancerz_kory' && hpRatio < 0.55) w *= 1.5;
    if (ab.id === 'wybuch_chaosu' && hpRatio < 0.55) w *= 1.5;
    w *= 0.65 + Math.random() * 0.85;
    return { ab, w };
  });

  const sum = weighted.reduce((acc, item) => acc + item.w, 0);
  let r = Math.random() * sum;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) return item.ab;
  }
  return weighted[0].ab;
}

function isInsideBossChamber(boss: ServerEnemy, x: number, z: number, margin = 17.8): boolean {
  return Math.abs(x - boss.homeX) <= margin && Math.abs(z - boss.homeZ) <= margin;
}

function clampToBossChamber(boss: ServerEnemy, x: number, z: number, halfLimit = 14.8): { x: number; z: number } {
  return {
    x: Math.max(boss.homeX - halfLimit, Math.min(boss.homeX + halfLimit, x)),
    z: Math.max(boss.homeZ - halfLimit, Math.min(boss.homeZ + halfLimit, z)),
  };
}

function startBossAbility(
  room: GameRoom,
  boss: ServerEnemy,
  ab: BossAbilityDef,
  primaryTarget: ServerPlayer,
  now: number
) {
  const alivePlayers = Array.from(room.players.values()).filter(
    (p) => p.alive && isInsideBossChamber(boss, p.x, p.z)
  );
  if (alivePlayers.length === 0) return;

  const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  const target =
    (ab.id === 'uderzenie_zadlem' || ab.id === 'kat_ciecie') && isInsideBossChamber(boss, primaryTarget.x, primaryTarget.z)
      ? primaryTarget
      : randomTarget;
  const clampedTarget = clampToBossChamber(boss, target.x, target.z);

  boss.lastAbilityId = ab.id;
  boss.abilityCooldowns[ab.id] = now + ab.cooldownMs;
  boss.animState = 'cast';
  boss.castingAbility = {
    id: ab.id,
    name: ab.name,
    startedAt: now,
    executeAt: now + ab.telegraphMs,
    targetX: clampedTarget.x,
    targetZ: clampedTarget.z,
  };

  const angleToTarget = Math.atan2(target.z - boss.z, target.x - boss.x);
  const bossMeta = {
    armorPenPct: boss.armorPenPct,
    extraMaxHpPct: boss.skillMaxHpPct,
    bossRequiredPower: boss.requiredPower,
  };

  switch (ab.id) {
    case 'fala_kosci':
    case 'ryk_wydm': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'line',
        x: boss.x,
        z: boss.z,
        radius: 2.2,
        length: 16,
        width: ab.id === 'ryk_wydm' ? 4.4 : 3.4,
        angle: angleToTarget,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.42,
        damageType: 'physical',
        ...bossMeta,
      });
      break;
    }

    case 'kat_ciecie': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: boss.x + Math.cos(angleToTarget) * 3.0,
        z: boss.z + Math.sin(angleToTarget) * 3.0,
        radius: 4.6,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.55,
        damageType: 'physical',
        ...bossMeta,
      });
      break;
    }

    case 'pieczec_dusz':
    case 'mlot_magmy': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: boss.x,
        z: boss.z,
        radius: 6.5,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.45,
        damageType: ab.id === 'pieczec_dusz' ? 'magical' : 'physical',
        appliesSlow: ab.id === 'pieczec_dusz',
        ...bossMeta,
      });
      break;
    }

    case 'siec_jadu': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: target.x,
        z: target.z,
        radius: 4.8,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        duration: 4500,
        expiresAt: now + ab.telegraphMs + 4500,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 0.45,
        damageType: 'poison',
        appliesPoison: true,
        appliesSlow: true,
        ...bossMeta,
      });
      break;
    }

    case 'skok_z_uderzeniem': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: target.x,
        z: target.z,
        radius: 5.5,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.55,
        damageType: 'physical',
        ...bossMeta,
      });
      break;
    }

    case 'klatwa_cienia':
      for (const p of alivePlayers) {
        const id = nextId('tel');
        room.telegraphs.set(id, {
          id,
          shape: 'circle',
          x: p.x,
          z: p.z,
          radius: 4.0,
          color: ab.color,
          label: ab.name,
          createdAt: now,
          triggerAt: now + ab.telegraphMs,
          duration: 5000,
          expiresAt: now + ab.telegraphMs + 5000,
          ownerId: boss.id,
          abilityId: ab.id,
          resolved: false,
          damage: boss.damage * 0.42,
          damageType: 'magical',
          appliesSlow: true,
          armorPenPct: boss.armorPenPct,
          bossRequiredPower: boss.requiredPower,
        });
      }
      break;

    case 'nurkowanie_w_piasku': {
      boss.burrowUntil = now + ab.telegraphMs;
      boss.burrowTargetX = clampedTarget.x;
      boss.burrowTargetZ = clampedTarget.z;
      boss.animState = 'burrow';
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: clampedTarget.x,
        z: clampedTarget.z,
        radius: 5.0,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.55,
        damageType: 'physical',
        ...bossMeta,
      });
      break;
    }

    case 'sloneczny_promien': {
      const id = nextId('tel');
      boss.solarBeamAngle = angleToTarget;
      room.telegraphs.set(id, {
        id,
        shape: 'beam',
        x: boss.x,
        z: boss.z,
        radius: 1.8,
        length: 17,
        width: 2.6,
        angle: angleToTarget,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        duration: 3600,
        expiresAt: now + ab.telegraphMs + 3600,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 0.58,
        damageType: 'magical',
        armorPenPct: boss.armorPenPct,
        extraMaxHpPct: 5,
        bossRequiredPower: boss.requiredPower,
      });
      break;
    }

    case 'burza_piaskowa':
      for (let t = 0; t < 3; t++) {
        const ang = Math.random() * Math.PI * 2;
        const id = nextId('tel');
        room.telegraphs.set(id, {
          id,
          shape: 'circle',
          x: boss.x + Math.cos(ang) * 5,
          z: boss.z + Math.sin(ang) * 5,
          radius: 2.8,
          color: ab.color,
          label: 'Tornado Piasku',
          createdAt: now,
          triggerAt: now + ab.telegraphMs,
          duration: 6000,
          expiresAt: now + ab.telegraphMs + 6000,
          ownerId: boss.id,
          abilityId: ab.id,
          vx: Math.cos(ang + 0.6) * 4.8,
          vz: Math.sin(ang + 0.6) * 4.8,
          resolved: false,
          damage: boss.damage * 0.45,
          damageType: 'physical',
          armorPenPct: boss.armorPenPct,
          bossRequiredPower: boss.requiredPower,
        });
      }
      break;

    case 'uderzenie_zadlem': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'cone',
        x: target.x,
        z: target.z,
        radius: 3.6,
        angle: angleToTarget,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.48,
        damageType: 'poison',
        appliesPoison: true,
        ...bossMeta,
      });
      break;
    }

    case 'chwyt_korzeni': {
      const rootCount = Math.min(alivePlayers.length, alivePlayers.length >= 2 ? 2 : 1);
      const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
      for (let i = 0; i < rootCount; i++) {
        const vp = shuffled[i];
        const id = nextId('tel');
        room.telegraphs.set(id, {
          id,
          shape: 'circle',
          x: vp.x,
          z: vp.z,
          radius: 3.1,
          color: ab.color,
          label: ab.name,
          createdAt: now,
          triggerAt: now + ab.telegraphMs,
          ownerId: boss.id,
          abilityId: ab.id,
          resolved: false,
          damage: boss.damage * 0.85,
          damageType: 'magical',
          appliesRoot: true,
          ...bossMeta,
        });
      }
      break;
    }

    case 'trujace_zarodniki':
      for (let s = 0; s < 5; s++) {
        const ang = Math.random() * Math.PI * 2;
        const d = 3 + Math.random() * 11;
        const id = nextId('tel');
        room.telegraphs.set(id, {
          id,
          shape: 'circle',
          x: boss.homeX + Math.cos(ang) * d,
          z: boss.homeZ + Math.sin(ang) * d,
          radius: 3.4,
          color: ab.color,
          label: 'Zarodniki',
          createdAt: now,
          triggerAt: now + ab.telegraphMs,
          duration: 3800,
          expiresAt: now + ab.telegraphMs + 3800,
          ownerId: boss.id,
          abilityId: ab.id,
          resolved: false,
          damage: boss.damage * 0.48,
          damageType: 'poison',
          appliesPoison: true,
          armorPenPct: boss.armorPenPct,
          bossRequiredPower: boss.requiredPower,
        });
      }
      break;

    case 'roj_cierni': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'ring',
        x: boss.x,
        z: boss.z,
        radius: 13.5,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.25,
        damageType: 'magical',
        ...bossMeta,
      });
      break;
    }

    case 'rozdarcie_wymiaru': {
      const behindX = target.x - Math.sin(target.rotY) * 2.5;
      const behindZ = target.z - Math.cos(target.rotY) * 2.5;
      boss.castingAbility.targetX = behindX;
      boss.castingAbility.targetZ = behindZ;
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'circle',
        x: target.x,
        z: target.z,
        radius: 4.8,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        damage: boss.damage * 1.5,
        damageType: 'magical',
        ...bossMeta,
      });
      break;
    }

    case 'deszcz_obsydianu':
      for (let m = 0; m < 6; m++) {
        const refP = alivePlayers[m % alivePlayers.length];
        const rx = m < 2 ? refP.x + (Math.random() - 0.5) * 3 : boss.homeX + (Math.random() - 0.5) * 24;
        const rz = m < 2 ? refP.z + (Math.random() - 0.5) * 3 : boss.homeZ + (Math.random() - 0.5) * 24;
        const id = nextId('tel');
        room.telegraphs.set(id, {
          id,
          shape: 'circle',
          x: rx,
          z: rz,
          radius: 3.6,
          color: ab.color,
          label: 'Meteor',
          createdAt: now,
          triggerAt: now + ab.telegraphMs + m * 160,
          ownerId: boss.id,
          abilityId: ab.id,
          resolved: false,
          damage: boss.damage * 1.35,
          damageType: 'magical',
          ...bossMeta,
        });
      }
      break;

    case 'pierscien_lawy': {
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'ring',
        x: boss.x,
        z: boss.z,
        radius: 2.5,
        ringMaxRadius: 17.5,
        color: ab.color,
        label: ab.name,
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        duration: 2400,
        expiresAt: now + ab.telegraphMs + 2400,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        isLavaRing: true,
        damage: boss.damage * 1.15,
        damageType: 'magical',
        armorPenPct: boss.armorPenPct,
        extraMaxHpPct: 8,
        bossRequiredPower: boss.requiredPower,
      });
      break;
    }

    case 'wybuch_chaosu': {
      room.pillars = [];
      for (let p = 0; p < 3; p++) {
        const ang = (p / 3) * Math.PI * 2 + Math.random() * 0.6;
        room.pillars.push({
          id: nextId('pillar'),
          x: boss.homeX + Math.cos(ang) * 9.5,
          z: boss.homeZ + Math.sin(ang) * 9.5,
          radius: 1.9,
          expiresAt: now + ab.telegraphMs + 1400,
        });
      }
      const id = nextId('tel');
      room.telegraphs.set(id, {
        id,
        shape: 'arena_chaos',
        x: boss.x,
        z: boss.z,
        radius: 24,
        color: ab.color,
        label: 'WYBUCH CHAOSU — SCHOWAJ SIĘ ZA FILAREM!',
        createdAt: now,
        triggerAt: now + ab.telegraphMs,
        ownerId: boss.id,
        abilityId: ab.id,
        resolved: false,
        isChaosBurst: true,
        damage: boss.damage * 2.8,
        damageType: 'magical',
        armorPenPct: 50,
        extraMaxHpPct: 45,
        bossRequiredPower: boss.requiredPower,
      });
      io.to(room.code).emit('game:banner', {
        type: 'warning',
        title: 'VAELGOR ŁADUJE WYBUCH CHAOSU!',
        subtitle: 'Schowaj się za Obsydianowym Filarem lub użyj Bariery Światła Wróżki!',
      });
      break;
    }

    default:
      break;
  }
}

function executeBossAbilityImpact(room: GameRoom, boss: ServerEnemy, now: number) {
  const cast = boss.castingAbility;
  if (!cast) return;
  const partySize = Math.max(1, room.players.size);

  switch (cast.id) {
    case 'skok_z_uderzeniem': {
      const clamped = clampToBossChamber(boss, cast.targetX, cast.targetZ);
      boss.x = clamped.x;
      boss.z = clamped.z;
      pushVfx(room, { kind: 'boss_leap_slam', x: boss.x, z: boss.z, radius: 5.5, color: '#22a355' });
      break;
    }

    case 'kat_ciecie':
      pushVfx(room, { kind: 'miniboss_cleave', x: boss.x, z: boss.z, tx: cast.targetX, tz: cast.targetZ, radius: 4.8, color: '#dc2626' });
      break;

    case 'pieczec_dusz':
      pushVfx(room, { kind: 'miniboss_soul_nova', x: boss.x, z: boss.z, radius: 6.5, color: '#7c3aed' });
      break;

    case 'ryk_wydm':
      pushVfx(room, { kind: 'miniboss_sand_roar', x: boss.x, z: boss.z, tx: cast.targetX, tz: cast.targetZ, radius: 4.4, color: '#d97706' });
      break;

    case 'siec_jadu':
      pushVfx(room, { kind: 'miniboss_venom_web', x: cast.targetX, z: cast.targetZ, radius: 4.8, color: '#84cc16' });
      break;

    case 'mlot_magmy':
      pushVfx(room, { kind: 'miniboss_magma_slam', x: boss.x, z: boss.z, radius: 6.5, color: '#ea580c' });
      break;

    case 'zew_krypty': {
      const count = 2 + partySize;
      const loc = getLocationDef(room.globalLocation);
      const mobHp = Math.round((200 + loc.globalIndex * 95) * 0.75);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const sx = boss.x + Math.cos(ang) * 4.5;
        const sz = boss.z + Math.sin(ang) * 4.5;
        const skel: ServerEnemy = {
          id: nextId('sum'),
          archetype: 'a1_szkielet',
          name: 'Przyzwany Szkielet',
          tier: 'summon',
          act: boss.act,
          x: sx,
          z: sz,
          homeX: boss.homeX,
          homeZ: boss.homeZ,
          rotY: ang,
          hp: mobHp,
          maxHp: mobHp,
          shield: 0,
          maxShield: 0,
          radius: 0.8,
          speed: 4.5,
          damage: Math.round(boss.damage * 0.38),
          xpReward: 0,
          alive: true,
          animState: 'run',
          stunnedUntil: 0,
          slowedUntil: 0,
          weakenedUntil: 0,
          tauntedBy: null,
          tauntedUntil: 0,
          aggro: true,
          nextAttackAt: now + 900,
          abilityCooldowns: {},
          armor: 20,
          armorPenPct: 5,
          requiredPower: 0,
          skillMaxHpPct: 0,
        };
        room.enemies.set(skel.id, skel);
      }
      pushVfx(room, { kind: 'boss_summon', x: boss.x, z: boss.z, radius: 5.0, color: '#22a355' });
      pushCombatText(room, boss.x, 4.5, boss.z, 'ZEW KRYPTY!', 'magical', false, true);
      break;
    }

    case 'nurkowanie_w_piasku':
      if (boss.burrowTargetX !== undefined && boss.burrowTargetZ !== undefined) {
        const clamped = clampToBossChamber(boss, boss.burrowTargetX, boss.burrowTargetZ);
        boss.x = clamped.x;
        boss.z = clamped.z;
      }
      boss.burrowUntil = 0;
      pushVfx(room, { kind: 'boss_burrow', x: boss.x, z: boss.z, radius: 5.0, color: '#d97706' });
      break;

    case 'uderzenie_zadlem':
      pushVfx(room, { kind: 'boss_stinger', x: boss.x, z: boss.z, tx: cast.targetX, tz: cast.targetZ, radius: 3.6, color: '#65a30d' });
      break;

    case 'pancerz_kory': {
      const shieldAmt = Math.round(boss.maxHp * 0.085);
      boss.shield = shieldAmt;
      boss.maxShield = shieldAmt;
      boss.healChannelUntil = now + 5200;
      boss.healNextTick = now + 850;
      pushVfx(room, { kind: 'boss_bark_shield', x: boss.x, z: boss.z, radius: 4.0, color: '#22a355' });
      io.to(room.code).emit('game:banner', {
        type: 'warning',
        title: 'SYLVARA AKTYWUJE PANCERZ KORY!',
        subtitle: 'Zbij jej zieloną tarczę, aby przerwać regenerację HP!',
      });
      break;
    }

    case 'rozdarcie_wymiaru': {
      const clamped = clampToBossChamber(boss, cast.targetX, cast.targetZ);
      boss.x = clamped.x;
      boss.z = clamped.z;
      pushVfx(room, { kind: 'boss_rift_slash', x: boss.x, z: boss.z, radius: 5.0, color: '#be123c' });
      break;
    }

    case 'roj_cierni':
      pushVfx(room, { kind: 'boss_thorn_nova', x: boss.x, z: boss.z, radius: 13.5, color: '#9333ea' });
      break;

    case 'fala_kosci':
      pushVfx(room, {
        kind: 'boss_bone_wave',
        x: boss.x,
        z: boss.z,
        tx: cast.targetX,
        tz: cast.targetZ,
        color: '#22a355',
      });
      break;

    default:
      break;
  }

  boss.castingAbility = undefined;
  boss.animState = 'idle';
}

function isPlayerShelteredByPillar(
  px: number,
  pz: number,
  bx: number,
  bz: number,
  pillars: ObsidianPillarState[]
): boolean {
  const toPlayerX = px - bx;
  const toPlayerZ = pz - bz;
  const distPlayer = Math.hypot(toPlayerX, toPlayerZ);
  if (distPlayer < 1) return false;
  const dirX = toPlayerX / distPlayer;
  const dirZ = toPlayerZ / distPlayer;

  for (const pil of pillars) {
    const toPilX = pil.x - bx;
    const toPilZ = pil.z - bz;
    const proj = toPilX * dirX + toPilZ * dirZ;
    if (proj <= 0 || proj >= distPlayer) continue;
    const perpDist = Math.abs(toPilX * dirZ - toPilZ * dirX);
    if (perpDist <= pil.radius + 1.1) return true;
  }
  return false;
}

function tickRoom(room: GameRoom) {
  if (!room.inGame || !room.mapData) return;
  const now = Date.now();
  const dt = 0.05;
  room.tick++;

  const map = room.mapData;
  const solvedGates = getSolvedGateIds(map);
  const revealedSecrets = getRevealedSecretIds(map);

  if (room.pillars.length > 0) {
    room.pillars = room.pillars.filter((p) => p.expiresAt > now);
  }

  // Decay Kill-Streak Combo cleanly
  if (room.comboCount > 0 && now > room.comboExpiresAt) {
    room.comboCount = 0;
  }

  for (const p of room.players.values()) {
    if (!p.alive) {
      if (p.respawnAt > 0 && now >= p.respawnAt) {
        p.alive = true;
        p.hp = Math.round(p.maxHp * 0.8);
        p.mana = p.maxMana;
        p.x = map.spawn.x;
        p.z = map.spawn.z;
        p.invulnUntil = now + 2000;
        p.animState = 'idle';
      }
      continue;
    }

    // Expire temporary shields cleanly
    if (p.shield > 0 && p.shieldExpiresAt > 0 && now >= p.shieldExpiresAt) {
      p.shield = 0;
      p.shieldExpiresAt = 0;
    }

    // Chaos Boon: Titan Barrier (refresh 22% Max HP shield every 6s!)
    if (p.activeBoons.includes('titan_barrier') && now >= p.titanBarrierNextTick) {
      p.titanBarrierNextTick = now + 6000;
      const shAmt = applyBoundedShield(p, Math.round(p.maxHp * 0.22), 5500, now);
      if (shAmt > 0) {
        pushCombatText(room, p.x, 2.8, p.z, `🛡️ +${shAmt}`, 'shield', false, false);
      }
    }

    // Chaos Boon: Flame Aura (pulsing fire ring around hero every 1.6s!)
    if (p.activeBoons.includes('flame_aura') && now >= p.flameAuraNextTick) {
      p.flameAuraNextTick = now + 1600;
      const auraDmg = Math.max(25, Math.round(Math.max(p.stats.ad, p.stats.ap) * 0.62));
      let hitAny = false;
      for (const e of room.enemies.values()) {
        if (!e.alive || e.tier === 'root_trap') continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) <= 4.6 + e.radius) {
          damageEnemy(room, p, e, auraDmg, 'magical', now, false, false);
          hitAny = true;
        }
      }
      if (hitAny) {
        pushVfx(room, { kind: 'miniboss_magma_slam', x: p.x, z: p.z, radius: 4.5, color: '#f97316' });
      }
    }

    p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.068 * dt);

    if (p.poisonUntil > now && now >= p.poisonNextTick) {
      p.poisonNextTick = now + 950;
      damagePlayer(room, p, p.poisonDps, 'poison', now, { sourceLabel: 'Trucizna' });
    }

    if (p.whirlwindUntil > now && now >= p.whirlwindNextTick) {
      p.whirlwindNextTick = now + 260;
      const rankMult = 1 + (p.skillRanks.active2 - 1) * 0.065;
      const tickDmg = p.stats.ad * 0.54 * rankMult;
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) <= 4.5 + e.radius) {
          damageEnemy(room, p, e, tickDmg, 'physical', now);
        }
      }
    }

    for (const puz of map.puzzles) {
      if (puz.solved || puz.type !== 'pressure_plates') continue;
      let onAnyPlate = false;
      for (let idx = 0; idx < puz.nodes.length; idx++) {
        const node = puz.nodes[idx];
        if (Math.hypot(p.x - node.x, p.z - node.z) < 2.2) {
          onAnyPlate = true;
          const plateKey = `${puz.id}_${idx}`;
          if (p.lastPlateId !== plateKey) {
            p.lastPlateId = plateKey;
            handlePressurePlateStep(room, puz, idx);
          }
          break;
        }
      }
      if (!onAnyPlate && p.lastPlateId?.startsWith(puz.id)) {
        p.lastPlateId = undefined;
      }
    }
  }

  const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);

  // Meteor Storm mutator: periodic telegraphed sky meteors near a player (can hit mobs too!)
  if (room.mutatorId === 'meteor_storm' && alivePlayers.length > 0 && now >= room.nextMeteorAt) {
    room.nextMeteorAt = now + 4200;
    const refP = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const L = room.globalLocation;
    const metDmg = Math.round((24 + L * 6.5 + Math.pow(L, 1.7) * 0.8) * 1.15);
    for (let m = 0; m < 2; m++) {
      const mx = refP.x + (Math.random() - 0.5) * 10;
      const mz = refP.z + (Math.random() - 0.5) * 10;
      const mid = nextId('tel');
      room.telegraphs.set(mid, {
        id: mid,
        shape: 'circle',
        x: mx,
        z: mz,
        radius: 3.4,
        color: '#f97316',
        label: '☄️ Meteor',
        createdAt: now,
        triggerAt: now + 1350 + m * 220,
        ownerId: 'world',
        abilityId: 'mutator_meteor',
        resolved: false,
        damage: metDmg,
        damageType: 'magical',
        hitsEnemies: true,
      });
    }
  }

  for (const e of room.enemies.values()) {
    if (!e.alive) continue;
    if (e.tier === 'root_trap' || e.tier === 'barrel') continue;

    // Shield Totem AI: periodically grants protective shield to nearby enemies!
    if (e.tier === 'totem') {
      if (!e.nextSpecialAt || now >= e.nextSpecialAt) {
        e.nextSpecialAt = now + 4400;
        let buffed = false;
        for (const ally of room.enemies.values()) {
          if (!ally.alive || ally.id === e.id || ally.tier === 'totem' || ally.tier === 'barrel' || ally.tier === 'goblin') continue;
          if (Math.hypot(ally.x - e.x, ally.z - e.z) <= 15) {
            const sh = Math.round(ally.maxHp * 0.25);
            if (ally.shield < sh) {
              ally.shield = sh;
              ally.maxShield = sh;
              buffed = true;
            }
          }
        }
        if (buffed) {
          pushVfx(room, { kind: 'light_barrier', x: e.x, z: e.z, radius: 13, color: '#a855f7' });
          pushCombatText(room, e.x, 3.3, e.z, '🛡️ OSŁONA!', 'shield', false, true);
        }
      }
      continue;
    }

    // Golden Treasure Goblin AI: flees wildly from nearby heroes & drops treasure if slain in time!
    if (e.tier === 'goblin') {
      if (alivePlayers.length === 0) continue;
      let nearest = alivePlayers[0];
      let nearestDist = Math.hypot(nearest.x - e.x, nearest.z - e.z);
      for (const p of alivePlayers) {
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = p;
        }
      }
      if (!e.aggro && nearestDist <= 16.5) {
        e.aggro = true;
        e.goblinDespawnAt = now + 38000;
        pushCombatText(room, e.x, 2.8, e.z, '💰 ŁAP MNIE! HEHE!', 'physical', true, true);
        io.to(room.code).emit('game:banner', {
          type: 'secret',
          title: '💰 ZŁOTY GOBLIN SPŁOSZONY!',
          subtitle: 'Goń go i pokonaj w 38 sekund zanim ucieknie ze skarbem!',
        });
      }
      if (!e.aggro) {
        e.animState = 'idle';
        continue;
      }
      if (e.goblinDespawnAt && now >= e.goblinDespawnAt) {
        e.alive = false;
        pushVfx(room, { kind: 'puzzle_solve', x: e.x, z: e.z, radius: 4, color: '#fbbf24' });
        pushCombatText(room, e.x, 2.8, e.z, '💨 GOBLIN UCIEKŁ!', 'physical', false, true);
        continue;
      }
      if (now < e.stunnedUntil) {
        e.animState = 'idle';
        continue;
      }
      // Run away from nearest player with playful zigzag!
      const awayX = e.x - nearest.x;
      const awayZ = e.z - nearest.z;
      const alen = Math.hypot(awayX, awayZ) || 1;
      const wobble = Math.sin(now * 0.004) * 0.65;
      const dirX = (awayX / alen) * Math.cos(wobble) - (awayZ / alen) * Math.sin(wobble);
      const dirZ = (awayX / alen) * Math.sin(wobble) + (awayZ / alen) * Math.cos(wobble);
      const spd = e.speed * (now < e.slowedUntil ? 0.55 : 1.0);
      const resolved = resolveWallCollisions(
        e.x + dirX * spd * dt,
        e.z + dirZ * spd * dt,
        e.radius,
        map.walls,
        solvedGates,
        revealedSecrets
      );
      e.x = resolved.x;
      e.z = resolved.z;
      e.rotY = Math.atan2(dirX, dirZ);
      e.animState = 'run';
      continue;
    }

    if (e.healChannelUntil && now < e.healChannelUntil && e.shield > 0) {
      if (e.healNextTick && now >= e.healNextTick) {
        e.healNextTick = now + 850;
        const healAmt = Math.round(e.maxHp * 0.024);
        e.hp = Math.min(e.maxHp, e.hp + healAmt);
        pushCombatText(room, e.x, 4.2, e.z, `+${healAmt}`, 'heal', false, false);
      }
    }

    if (now < e.stunnedUntil) {
      e.animState = 'idle';
      continue;
    }

    const isBossUnit = e.tier === 'boss' || e.tier === 'miniboss';
    const eligiblePlayers = isBossUnit
      ? alivePlayers.filter((p) => isInsideBossChamber(e, p.x, p.z))
      : alivePlayers;

    // If all players died or left the Boss/Mini-Boss chamber, Boss STAYS in its chamber and returns to center!
    if (isBossUnit && eligiblePlayers.length === 0) {
      if (e.aggro || e.castingAbility || (e.burrowUntil && now < e.burrowUntil)) {
        e.aggro = false;
        e.castingAbility = undefined;
        e.burrowUntil = 0;
        e.tauntedBy = null;
        for (const [tid, tel] of room.telegraphs.entries()) {
          if (tel.ownerId === e.id) room.telegraphs.delete(tid);
        }
      }
      const hx = e.homeX - e.x;
      const hz = e.homeZ - e.z;
      const hDist = Math.hypot(hx, hz);
      if (hDist > 0.6) {
        const step = Math.min(hDist, e.speed * 1.15 * dt);
        e.x += (hx / hDist) * step;
        e.z += (hz / hDist) * step;
        e.rotY = Math.atan2(hx, hz);
        e.animState = 'run';
      } else {
        e.x = e.homeX;
        e.z = e.homeZ;
        e.animState = 'idle';
      }
      continue;
    }

    if (e.castingAbility && now >= e.castingAbility.executeAt) {
      executeBossAbilityImpact(room, e, now);
    }

    if (eligiblePlayers.length === 0) {
      e.animState = 'idle';
      continue;
    }

    let target: ServerPlayer | null = null;
    if (e.tauntedBy && now < e.tauntedUntil) {
      const taunter = room.players.get(e.tauntedBy);
      if (taunter && taunter.alive && (!isBossUnit || isInsideBossChamber(e, taunter.x, taunter.z))) {
        target = taunter;
      }
    }

    if (!target) {
      let bestDist = Infinity;
      for (const p of eligiblePlayers) {
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < bestDist) {
          bestDist = d;
          target = p;
        }
      }
    }

    if (!target) continue;
    const dist = Math.hypot(target.x - e.x, target.z - e.z);
    const aggroRange = e.tier === 'boss' || e.tier === 'miniboss' ? 23 : 19;

    if (!e.aggro && dist <= aggroRange) {
      if (hasLineOfSight(e.x, e.z, target.x, target.z, map.walls, solvedGates, revealedSecrets)) {
        e.aggro = true;
      }
    }
    if (!e.aggro) {
      e.animState = 'idle';
      continue;
    }

    if ((e.tier === 'boss' || e.tier === 'miniboss') && !e.castingAbility && (!e.burrowUntil || now >= e.burrowUntil)) {
      if (Math.random() < 0.12) {
        const ab = pickBossAbility(room, e, target, now);
        if (ab) {
          startBossAbility(room, e, ab, target, now);
          continue;
        }
      }
    }

    // Elite Affix Special Abilities (makes every Elite exciting to dodge & prioritize!)
    if (e.tier === 'elite' && e.affix && dist <= 15 && (!e.nextSpecialAt || now >= e.nextSpecialAt)) {
      e.nextSpecialAt = now + 5600 + Math.random() * 1400;
      if (e.affix === 'mortar') {
        const tid = nextId('tel');
        room.telegraphs.set(tid, {
          id: tid,
          shape: 'circle',
          x: target.x,
          z: target.z,
          radius: 3.1,
          color: '#f97316',
          label: '🔥 Moździerz',
          createdAt: now,
          triggerAt: now + 1100,
          ownerId: e.id,
          abilityId: 'elite_mortar',
          resolved: false,
          damage: Math.round(e.damage * 1.25),
          damageType: 'magical',
          armorPenPct: e.armorPenPct,
        });
        pushCombatText(room, e.x, 3.0, e.z, '🔥 MOŹDZIERZ!', 'magical', false, true);
      } else if (e.affix === 'frost') {
        const tid = nextId('tel');
        room.telegraphs.set(tid, {
          id: tid,
          shape: 'ring',
          x: e.x,
          z: e.z,
          radius: 6.2,
          color: '#38bdf8',
          label: '❄️ Fala Mrozu',
          createdAt: now,
          triggerAt: now + 1050,
          ownerId: e.id,
          abilityId: 'elite_frost',
          resolved: false,
          damage: Math.round(e.damage * 1.05),
          damageType: 'magical',
          appliesSlow: true,
          armorPenPct: e.armorPenPct,
        });
        pushCombatText(room, e.x, 3.0, e.z, '❄️ MRÓZ!', 'shield', false, true);
      } else if (e.affix === 'charger') {
        const ang = Math.atan2(target.z - e.z, target.x - e.x);
        const tid = nextId('tel');
        room.telegraphs.set(tid, {
          id: tid,
          shape: 'line',
          x: e.x,
          z: e.z,
          radius: 1.8,
          length: 11,
          width: 2.6,
          angle: ang,
          color: '#facc15',
          label: '⚡ Szarża',
          createdAt: now,
          triggerAt: now + 950,
          ownerId: e.id,
          abilityId: 'elite_charge',
          resolved: false,
          damage: Math.round(e.damage * 1.3),
          damageType: 'physical',
          armorPenPct: e.armorPenPct,
        });
        pushCombatText(room, e.x, 3.0, e.z, '⚡ SZARŻA!', 'physical', false, true);
      } else if (e.affix === 'vampiric') {
        let healed = false;
        for (const ally of room.enemies.values()) {
          if (!ally.alive || ally.tier === 'barrel' || ally.tier === 'goblin') continue;
          if (Math.hypot(ally.x - e.x, ally.z - e.z) <= 10 && ally.hp < ally.maxHp) {
            const h = Math.round(ally.maxHp * 0.14);
            ally.hp = Math.min(ally.maxHp, ally.hp + h);
            healed = true;
          }
        }
        if (healed) {
          pushVfx(room, { kind: 'heal_wave', x: e.x, z: e.z, radius: 9, color: '#4ade80' });
          pushCombatText(room, e.x, 3.0, e.z, '💚 REGENERACJA!', 'heal', false, true);
        }
      }
    }

    if (e.castingAbility || (e.burrowUntil && now < e.burrowUntil)) continue;

    const dx = target.x - e.x;
    const dz = target.z - e.z;
    e.rotY = Math.atan2(dx, dz);

    const isRanged =
      e.archetype.includes('lucznik') ||
      e.archetype.includes('nekromanta') ||
      e.archetype.includes('kultysta') ||
      e.archetype.includes('dzinn') ||
      e.archetype.includes('plujec') ||
      e.archetype.includes('driada') ||
      e.archetype.includes('szczelina');

    const desiredRange = isRanged ? 8.5 : e.radius + 1.4;

    if (dist > desiredRange) {
      const speedMult = now < e.slowedUntil ? 0.5 : 1.0;
      const step = e.speed * speedMult * dt;
      const nx = e.x + (dx / Math.max(0.01, dist)) * step;
      const nz = e.z + (dz / Math.max(0.01, dist)) * step;
      const resolved = resolveWallCollisions(nx, nz, e.radius, map.walls, solvedGates, revealedSecrets);
      if (isBossUnit) {
        const clamped = clampToBossChamber(e, resolved.x, resolved.z);
        e.x = clamped.x;
        e.z = clamped.z;
      } else {
        e.x = resolved.x;
        e.z = resolved.z;
      }
      e.animState = 'run';
    } else if (now >= e.nextAttackAt) {
      e.animState = 'attack';
      e.nextAttackAt = now + (e.tier === 'boss' ? 1350 : isRanged ? 1700 : 1350);
      const dmgMult = now < e.weakenedUntil ? 0.85 : 1.0;
      const hitDmg = Math.round(e.damage * dmgMult);

      if (isRanged) {
        const tid = nextId('tel');
        room.telegraphs.set(tid, {
          id: tid,
          shape: 'circle',
          x: target.x,
          z: target.z,
          radius: 1.9,
          color: '#dc2626',
          createdAt: now,
          triggerAt: now + 540,
          ownerId: e.id,
          abilityId: 'mob_bolt',
          resolved: false,
          damage: hitDmg,
          damageType: 'magical',
          armorPenPct: e.armorPenPct,
        });
      } else {
        damagePlayer(room, target, hitDmg, 'physical', now, {
          armorPenPct: e.armorPenPct,
          bossRequiredPower: e.requiredPower,
        });
      }
    }
  }

  for (const [tid, tel] of room.telegraphs.entries()) {
    if (tel.vx !== undefined && tel.vz !== undefined && now >= tel.triggerAt) {
      tel.x += tel.vx * dt;
      tel.z += tel.vz * dt;
      if (Math.random() < 0.06) {
        const turn = (Math.random() - 0.5) * 1.4;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const nvx = tel.vx * c - tel.vz * s;
        const nvz = tel.vx * s + tel.vz * c;
        tel.vx = nvx;
        tel.vz = nvz;
      }
    }

    if (tel.shape === 'beam' && now >= tel.triggerAt) {
      const owner = room.enemies.get(tel.ownerId);
      if (!owner || !owner.alive) {
        room.telegraphs.delete(tid);
        continue;
      }
      tel.x = owner.x;
      tel.z = owner.z;
      tel.angle = (tel.angle ?? 0) + 1.4 * dt;
    }

    if (tel.isLavaRing && now >= tel.triggerAt && tel.expiresAt) {
      const progress = Math.min(1, (now - tel.triggerAt) / Math.max(1, tel.expiresAt - tel.triggerAt));
      tel.radius = 2.5 + progress * ((tel.ringMaxRadius ?? 17.5) - 2.5);
    }

    if (now < tel.triggerAt) continue;

    if (tel.duration && tel.expiresAt) {
      if (now >= tel.expiresAt) {
        room.telegraphs.delete(tid);
        continue;
      }
      if (!tel.nextTickAt || now >= tel.nextTickAt) {
        tel.nextTickAt = now + 480;
        for (const p of alivePlayers) {
          let hit = false;
          if (tel.shape === 'beam') {
            const ang = tel.angle ?? 0;
            const lx = Math.cos(ang);
            const lz = Math.sin(ang);
            const rx = p.x - tel.x;
            const rz = p.z - tel.z;
            const proj = rx * lx + rz * lz;
            const perp = Math.abs(rx * lz - rz * lx);
            hit = proj >= 0 && proj <= (tel.length ?? 17) && perp <= (tel.width ?? 2.6) / 2 + 0.6;
          } else if (tel.isLavaRing) {
            const d = Math.hypot(p.x - tel.x, p.z - tel.z);
            hit = Math.abs(d - tel.radius) <= 1.6;
          } else {
            hit = Math.hypot(p.x - tel.x, p.z - tel.z) <= tel.radius;
          }

          if (hit) {
            damagePlayer(room, p, tel.damage, tel.damageType, now, {
              armorPenPct: tel.armorPenPct,
              extraMaxHpPct: tel.extraMaxHpPct,
              bossRequiredPower: tel.bossRequiredPower,
            });
            if (tel.appliesSlow) p.slowedUntil = now + 1500;
            if (tel.appliesPoison) {
              p.poisonUntil = now + 4000;
              p.poisonDps = Math.round(tel.damage * 0.38);
            }
          }
        }
      }
      continue;
    }

    if (!tel.resolved) {
      tel.resolved = true;
      for (const p of alivePlayers) {
        let hit = false;
        if (tel.isChaosBurst) {
          const sheltered = isPlayerShelteredByPillar(p.x, p.z, tel.x, tel.z, room.pillars);
          if (sheltered) {
            pushCombatText(room, p.x, 3.0, p.z, 'OSŁONA FILARU!', 'shield', false, true);
          } else {
            hit = Math.hypot(p.x - tel.x, p.z - tel.z) <= tel.radius;
          }
        } else if (tel.shape === 'line') {
          const ang = tel.angle ?? 0;
          const lx = Math.cos(ang);
          const lz = Math.sin(ang);
          const rx = p.x - tel.x;
          const rz = p.z - tel.z;
          const proj = rx * lx + rz * lz;
          const perp = Math.abs(rx * lz - rz * lx);
          hit = proj >= 0 && proj <= (tel.length ?? 16) && perp <= (tel.width ?? 3.4) / 2 + 0.6;
        } else if (tel.shape === 'ring') {
          const d = Math.hypot(p.x - tel.x, p.z - tel.z);
          hit = d <= tel.radius && d >= 2.2;
        } else {
          hit = Math.hypot(p.x - tel.x, p.z - tel.z) <= tel.radius;
        }

        if (hit) {
          damagePlayer(room, p, tel.damage, tel.damageType, now, {
            armorPenPct: tel.armorPenPct,
            extraMaxHpPct: tel.extraMaxHpPct,
            bossRequiredPower: tel.bossRequiredPower,
          });
          if (tel.appliesSlow) p.slowedUntil = now + 2200;
          if (tel.appliesPoison) {
            p.poisonUntil = now + 4500;
            p.poisonDps = Math.round(tel.damage * 0.22);
          }
          if (tel.appliesRoot) {
            if (p.shield > 0) {
              pushCombatText(room, p.x, 2.8, p.z, 'TARCZA OCHRONIŁA!', 'shield', false, true);
            } else {
              p.rootedUntil = now + 4500;
              pushCombatText(room, p.x, 2.8, p.z, 'UNIERUCHOMIONY!', 'poison', false, true);
              const rootHp = Math.round(450 + room.globalLocation * 85);
              const trap: ServerEnemy = {
                id: nextId('root'),
                archetype: 'root_trap',
                name: 'Korzenie Cierni',
                tier: 'root_trap',
                act: 3,
                x: p.x,
                z: p.z,
                homeX: p.x,
                homeZ: p.z,
                rotY: 0,
                hp: rootHp,
                maxHp: rootHp,
                shield: 0,
                maxShield: 0,
                radius: 1.2,
                speed: 0,
                damage: 0,
                xpReward: 0,
                alive: true,
                animState: 'idle',
                stunnedUntil: 0,
                slowedUntil: 0,
                weakenedUntil: 0,
                tauntedBy: null,
                tauntedUntil: 0,
                aggro: false,
                nextAttackAt: 0,
                abilityCooldowns: {},
                rootVictimId: p.id,
                armor: 0,
                armorPenPct: 0,
                requiredPower: 0,
                skillMaxHpPct: 0,
              };
              room.enemies.set(trap.id, trap);
            }
          }
        }
      }

      // Friendly-fire environmental hazards (Meteor Storm & Volatile Foes) damage enemies dragged into them!
      if (tel.hitsEnemies) {
        const refPlayer = alivePlayers[0];
        if (refPlayer) {
          for (const foe of room.enemies.values()) {
            if (!foe.alive || foe.tier === 'root_trap' || foe.id === tel.ownerId) continue;
            if (Math.hypot(foe.x - tel.x, foe.z - tel.z) <= tel.radius + foe.radius) {
              const envPct = foe.tier === 'boss' ? 0.04 : foe.tier === 'miniboss' ? 0.08 : 0.28;
              const envDmg = Math.max(tel.damage, Math.round(foe.maxHp * envPct));
              damageEnemy(room, refPlayer, foe, envDmg, 'magical', now, false, false, { x: tel.x, z: tel.z });
            }
          }
        }
      }

      if (tel.isChaosBurst) {
        pushVfx(room, { kind: 'boss_chaos_burst', x: tel.x, z: tel.z, radius: tel.radius, color: '#be123c' });
      } else if (tel.abilityId === 'deszcz_obsydianu' || tel.abilityId === 'mutator_meteor') {
        pushVfx(room, { kind: 'boss_obsidian_rain', x: tel.x, z: tel.z, radius: tel.radius, color: '#f97316' });
      } else if (tel.abilityId === 'volatile_blast' || tel.abilityId === 'elite_mortar') {
        pushVfx(room, { kind: 'meteor', x: tel.x, z: tel.z, radius: tel.radius, color: '#ef4444' });
      } else if (tel.abilityId === 'elite_frost') {
        pushVfx(room, { kind: 'light_barrier', x: tel.x, z: tel.z, radius: tel.radius, color: '#38bdf8' });
      }
      room.telegraphs.delete(tid);
    }
  }

  for (const [eid, e] of room.enemies.entries()) {
    if (e.tier === 'root_trap' && e.rootVictimId) {
      const vp = room.players.get(e.rootVictimId);
      if (!vp || !vp.alive || now >= vp.rootedUntil) {
        room.enemies.delete(eid);
      }
    }
  }

  let enemiesRemaining = 0;
  let goblinAlive = false;
  for (const e of room.enemies.values()) {
    if (!e.alive) continue;
    if (e.tier === 'goblin') goblinAlive = true;
    if (
      e.tier !== 'summon' &&
      e.tier !== 'root_trap' &&
      e.tier !== 'barrel' &&
      e.tier !== 'totem' &&
      e.tier !== 'goblin' &&
      !e.isWaveMob
    ) {
      enemiesRemaining++;
    }
  }

  const loc = getLocationDef(room.globalLocation);
  const exitUnlocked =
    loc.isMainBoss || loc.isMiniBoss
      ? room.bossDefeated
      : enemiesRemaining <= Math.floor(room.totalEnemies * 0.45);

  const snapshot: WorldSnapshot = {
    tick: room.tick,
    serverTime: now,
    globalLocation: room.globalLocation,
    partySize: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      classId: p.classId,
      level: p.level,
      x: Number(p.x.toFixed(2)),
      z: Number(p.z.toFixed(2)),
      rotY: Number(p.rotY.toFixed(2)),
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      shield: Math.round(p.shield),
      mana: Math.round(p.mana),
      maxMana: p.maxMana,
      alive: p.alive,
      animState: p.animState,
      animTime: p.animTime,
      weaponGlow: p.weaponGlow,
      armorGlow: p.armorGlow,
      activeSetRarity: p.activeSetRarity,
      rootedUntil: p.rootedUntil,
      slowedUntil: p.slowedUntil,
      stoneSkinUntil: p.stoneSkinUntil,
      hasteUntil: p.hasteUntil,
      invulnUntil: p.invulnUntil,
      shieldExpiresAt: p.shieldExpiresAt,
      potionReadyAt: p.potionReadyAt,
      activeBoons: p.activeBoons,
      stats: p.stats,
    })),
    enemies: Array.from(room.enemies.values())
      .filter((e) => e.alive)
      .map((e) => ({
        id: e.id,
        archetype: e.archetype,
        name: e.name,
        tier: e.tier,
        act: e.act,
        bossId: e.bossId,
        affix: e.affix,
        x: Number(e.x.toFixed(2)),
        z: Number(e.z.toFixed(2)),
        rotY: Number(e.rotY.toFixed(2)),
        hp: Math.round(e.hp),
        maxHp: e.maxHp,
        shield: Math.round(e.shield),
        maxShield: e.maxShield,
        radius: e.radius,
        speed: e.speed,
        damage: e.damage,
        xpReward: e.xpReward,
        alive: e.alive,
        animState: e.animState,
        stunnedUntil: e.stunnedUntil,
        slowedUntil: e.slowedUntil,
        weakenedUntil: e.weakenedUntil,
        tauntedBy: e.tauntedBy,
        tauntedUntil: e.tauntedUntil,
        castingAbility: e.castingAbility,
        rootVictimId: e.rootVictimId,
      })),
    telegraphs: Array.from(room.telegraphs.values()),
    loot: Array.from(room.loot.values()).filter((l) => !l.pickedUp),
    puzzles: map.puzzles,
    secrets: map.secrets,
    chests: map.chests,
    shrines: map.shrines,
    obelisk: map.obelisk,
    pillars: room.pillars,
    exitUnlocked,
    enemiesRemaining,
    totalEnemies: room.totalEnemies,
    bossDefeated: room.bossDefeated,
    mutatorId: room.mutatorId,
    comboCount: room.comboCount,
    comboExpiresAt: room.comboExpiresAt,
    goblinAlive,
  };

  io.to(room.code).emit('world:snapshot', snapshot);

  if (room.pendingCombatTexts.length > 0) {
    io.to(room.code).emit('world:combat_texts', room.pendingCombatTexts);
    room.pendingCombatTexts = [];
  }
  if (room.pendingVfx.length > 0) {
    io.to(room.code).emit('world:vfx', room.pendingVfx);
    room.pendingVfx = [];
  }
}

function handlePressurePlateStep(room: GameRoom, puz: GeneratedMapData['puzzles'][0], plateIdx: number) {
  const expected = puz.targetSequence[puz.currentSequence.length];
  if (plateIdx === expected) {
    puz.currentSequence.push(plateIdx);
    pushCombatText(
      room,
      puz.nodes[plateIdx].x,
      2.2,
      puz.nodes[plateIdx].z,
      `PŁYTA ${puz.currentSequence.length}/${puz.targetSequence.length} ✓`,
      'heal',
      false,
      true
    );
    if (puz.currentSequence.length === puz.targetSequence.length) {
      solveWorldPuzzle(room, puz);
    }
  } else {
    puz.currentSequence = [];
    pushCombatText(
      room,
      puz.nodes[plateIdx].x,
      2.2,
      puz.nodes[plateIdx].z,
      'ZŁA KOLEJNOŚĆ! RESET',
      'physical',
      false,
      true
    );
  }
}

function solveWorldPuzzle(room: GameRoom, puz: GeneratedMapData['puzzles'][0]) {
  if (puz.solved) return;
  puz.solved = true;
  pushVfx(room, { kind: 'puzzle_solve', x: puz.gateX, z: puz.gateZ, radius: 5, color: '#38bdf8' });
  const bonusXp = Math.round(targetLocationXpPool(room.globalLocation) * 0.08);
  io.to(room.code).emit('player:xp_gain', { amount: bonusXp, source: 'Zagadka Runiczna' });
  io.to(room.code).emit('game:banner', {
    type: 'secret',
    title: 'ZAGADKA ROZWIĄZANA!',
    subtitle: 'Runiczna Brama została otwarta! Droga naprzód stoi otworem.',
  });
}

function handleSkillCast(
  room: GameRoom,
  player: ServerPlayer,
  slot: 'active1' | 'active2' | 'active3',
  aimX: number,
  aimZ: number
) {
  if (!player.alive || !room.mapData) return;
  const now = Date.now();
  if (now < player.cooldowns[slot]) return;

  const cls = CLASSES[player.classId];
  const skillDef = cls.actives.find((a) => a.slot === slot);
  if (!skillDef) return;
  if (player.mana < skillDef.manaCost) {
    pushCombatText(room, player.x, 2.5, player.z, 'BRAK MANY!', 'magical', false, true);
    return;
  }

  const rank = Math.max(1, player.skillRanks[slot] || 1);
  const rankMult = 1 + (rank - 1) * (skillDef.rankBonusPct / 100);
  const cdr = getEffectivePlayerCdr(room, player);
  const effectiveCdMs = Math.round(skillDef.cooldown * 1000 * (1 - cdr / 100));

  player.mana -= skillDef.manaCost;
  player.cooldowns[slot] = now + effectiveCdMs;
  player.animState = slot === 'active2' && player.classId === 'wojownik' ? 'spin' : 'cast';
  player.animTime = now;

  const dx = aimX - player.x;
  const dz = aimZ - player.z;
  const distToAim = Math.hypot(dx, dz) || 1;
  const dirX = dx / distToAim;
  const dirZ = dz / distToAim;
  player.rotY = Math.atan2(dirX, dirZ);

  const map = room.mapData;
  const solvedGates = getSolvedGateIds(map);
  const revealedSecrets = getRevealedSecretIds(map);

  const clampedRange = Math.min(distToAim, skillDef.range || 0);
  const rawTargetX = player.x + dirX * clampedRange;
  const rawTargetZ = player.z + dirZ * clampedRange;
  const clippedTarget = clipPointToLineOfSight(
    player.x,
    player.z,
    rawTargetX,
    rawTargetZ,
    map.walls,
    solvedGates,
    revealedSecrets
  );
  const targetX = clippedTarget.x;
  const targetZ = clippedTarget.z;

  const checkCrackedWallHit = (hx: number, hz: number, rad: number) => {
    for (const sec of map.secrets) {
      if (sec.revealed || sec.kind !== 'cracked_wall') continue;
      if (Math.hypot(sec.wallX - hx, sec.wallZ - hz) <= rad + 2.8) {
        sec.hp--;
        if (sec.hp <= 0) {
          sec.revealed = true;
          pushVfx(room, { kind: 'secret_break', x: sec.wallX, z: sec.wallZ, radius: 4, color: '#d97706' });
          io.to(room.code).emit('game:banner', {
            type: 'secret',
            title: 'ODKRYTO UKRYTE PRZEJŚCIE!',
            subtitle: 'Pęknięta ściana runęła, odsłaniając sekretną komnatę ze skarbem!',
          });
        } else {
          pushCombatText(room, sec.wallX, 2.5, sec.wallZ, 'PĘKA!', 'physical', false, true);
        }
      }
    }
  };

  switch (skillDef.id) {
    case 'potezne_ciecie': {
      const dmg = player.stats.ad * (skillDef.damageScaleAd ?? 1.85) * rankMult;
      const cx = player.x + dirX * 2.4;
      const cz = player.z + dirZ * 2.4;
      pushVfx(room, { kind: 'slash', x: cx, z: cz, tx: aimX, tz: aimZ, radius: skillDef.radius, color: '#dc2626', casterId: player.id });
      checkCrackedWallHit(cx, cz, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - cx, e.z - cz) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'physical', now);
        }
      }
      break;
    }

    case 'wir_ostrzy': {
      player.whirlwindUntil = now + 2100;
      player.whirlwindNextTick = now;
      pushVfx(room, { kind: 'whirlwind', x: player.x, z: player.z, radius: skillDef.radius, color: '#d97706', duration: 2100, casterId: player.id });
      checkCrackedWallHit(player.x, player.z, skillDef.radius);
      break;
    }

    case 'szarza_z_ogluszeniem': {
      const dmg = player.stats.ad * (skillDef.damageScaleAd ?? 1.55) * rankMult;
      const resolved = moveWithWallSweep(player.x, player.z, targetX, targetZ, 0.9, map.walls, solvedGates, revealedSecrets);
      pushVfx(room, { kind: 'charge', x: player.x, z: player.z, tx: resolved.x, tz: resolved.z, radius: skillDef.radius, color: '#d99e26', casterId: player.id });
      player.x = resolved.x;
      player.z = resolved.z;
      checkCrackedWallHit(player.x, player.z, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - player.x, e.z - player.z) <= skillDef.radius + e.radius + 0.8) {
          damageEnemy(room, player, e, dmg, 'physical', now);
          if (e.tier !== 'boss' && e.tier !== 'miniboss') {
            e.stunnedUntil = now + 2000;
            pushCombatText(room, e.x, 3.0, e.z, 'OGŁUSZONY!', 'physical', false, true);
          }
        }
      }
      break;
    }

    case 'kula_cienia': {
      const dmg = player.stats.ap * (skillDef.damageScaleAp ?? 1.9) * rankMult;
      pushVfx(room, { kind: 'shadow_orb', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: skillDef.radius, color: '#7e22ce', casterId: player.id });
      checkCrackedWallHit(targetX, targetZ, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - targetX, e.z - targetZ) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'magical', now);
        }
      }
      break;
    }

    case 'deszcz_meteorow': {
      const dmg = player.stats.ap * (skillDef.damageScaleAp ?? 2.75) * rankMult;
      pushVfx(room, { kind: 'meteor', x: targetX, z: targetZ, radius: skillDef.radius, color: '#b91c1c', casterId: player.id });
      checkCrackedWallHit(targetX, targetZ, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - targetX, e.z - targetZ) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'magical', now);
        }
      }
      break;
    }

    case 'wyssanie_duszy': {
      const dmg = player.stats.ap * (skillDef.damageScaleAp ?? 1.65) * rankMult;
      pushVfx(room, { kind: 'soul_drain', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: skillDef.radius, color: '#9333ea', casterId: player.id });
      let totalDealt = 0;
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - targetX, e.z - targetZ) <= skillDef.radius + e.radius) {
          totalDealt += damageEnemy(room, player, e, dmg, 'magical', now);
        }
      }
      if (totalDealt > 0) {
        const maxCapHeal = Math.round(player.maxHp * 0.18);
        const heal = Math.min(player.maxHp - player.hp, maxCapHeal, Math.round(totalDealt * 0.16));
        if (heal > 0) {
          player.hp += heal;
          pushCombatText(room, player.x, 2.7, player.z, `+${heal}`, 'heal', false, false);
        }
      }
      break;
    }

    case 'magiczna_strzala': {
      const dmg = (player.stats.ad * (skillDef.damageScaleAd ?? 0.88) + player.stats.ap * (skillDef.damageScaleAp ?? 0.88)) * rankMult;
      pushVfx(room, { kind: 'magic_arrow', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: 1.8, color: '#22a355', casterId: player.id });
      checkCrackedWallHit(targetX, targetZ, 2.0);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        const rx = e.x - player.x;
        const rz = e.z - player.z;
        const proj = rx * dirX + rz * dirZ;
        const perp = Math.abs(rx * dirZ - rz * dirX);
        if (proj >= 0 && proj <= skillDef.range && perp <= 1.8 + e.radius) {
          damageEnemy(room, player, e, dmg, 'hybrid', now);
        }
      }
      break;
    }

    case 'odskok_z_salwa': {
      const dmg = (player.stats.ad * (skillDef.damageScaleAd ?? 0.95) + player.stats.ap * (skillDef.damageScaleAp ?? 0.95)) * rankMult;
      pushVfx(room, { kind: 'volley_backflip', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: skillDef.radius, color: '#0e87a1', casterId: player.id });
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        const rx = e.x - player.x;
        const rz = e.z - player.z;
        const d = Math.hypot(rx, rz);
        if (d <= skillDef.range && (rx * dirX + rz * dirZ) / Math.max(0.01, d) > 0.55) {
          damageEnemy(room, player, e, dmg, 'hybrid', now);
        }
      }
      const backX = player.x - dirX * 5.2;
      const backZ = player.z - dirZ * 5.2;
      const resolved = moveWithWallSweep(player.x, player.z, backX, backZ, 0.9, map.walls, solvedGates, revealedSecrets);
      player.x = resolved.x;
      player.z = resolved.z;
      player.invulnUntil = now + 320;
      break;
    }

    case 'ostrze_wiatru': {
      const dmg = (player.stats.ad * (skillDef.damageScaleAd ?? 1.05) + player.stats.ap * (skillDef.damageScaleAp ?? 1.05)) * rankMult;
      player.hasteUntil = now + 3000;
      pushVfx(room, { kind: 'wind_blade', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: skillDef.radius, color: '#22a8b8', casterId: player.id });
      checkCrackedWallHit(targetX, targetZ, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        const rx = e.x - player.x;
        const rz = e.z - player.z;
        const proj = rx * dirX + rz * dirZ;
        const perp = Math.abs(rx * dirZ - rz * dirX);
        if (proj >= 0 && proj <= skillDef.range && perp <= 3.0 + e.radius) {
          damageEnemy(room, player, e, dmg, 'hybrid', now);
        }
      }
      break;
    }

    case 'uderzenie_mlotem': {
      const dmg = (player.stats.ad * (skillDef.damageScaleAd ?? 1.35) + player.stats.def * (skillDef.damageScaleDef ?? 0.85)) * rankMult;
      pushVfx(room, { kind: 'hammer_slam', x: player.x, z: player.z, radius: skillDef.radius, color: '#b45309', casterId: player.id });
      checkCrackedWallHit(player.x, player.z, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - player.x, e.z - player.z) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'physical', now);
          e.tauntedBy = player.id;
          e.tauntedUntil = now + 5200;
          pushCombatText(room, e.x, 3.2, e.z, 'PROWOKACJA!', 'physical', false, true);
        }
      }
      break;
    }

    case 'kamienna_skora': {
      player.stoneSkinUntil = now + 4500;
      const rawShield = (player.stats.def * 1.2 + player.maxHp * 0.14) * rankMult;
      const applied = applyBoundedShield(player, rawShield, 5500, now);
      pushVfx(room, { kind: 'stone_skin', x: player.x, z: player.z, radius: 2.8, color: '#78716c', casterId: player.id });
      pushCombatText(room, player.x, 2.8, player.z, `KAMIENNA SKÓRA +${applied}`, 'shield', false, true);
      break;
    }

    case 'trzesienie_ziemi': {
      const dmg = (player.stats.ad * (skillDef.damageScaleAd ?? 1.55) + player.stats.def * (skillDef.damageScaleDef ?? 1.05)) * rankMult;
      pushVfx(room, { kind: 'earthquake', x: player.x, z: player.z, radius: skillDef.radius, color: '#9a3412', casterId: player.id });
      checkCrackedWallHit(player.x, player.z, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - player.x, e.z - player.z) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'physical', now);
          e.slowedUntil = now + 3800;
          if (e.tier !== 'boss' && e.tier !== 'miniboss') e.stunnedUntil = now + 1500;
        }
      }
      break;
    }

    case 'swietlisty_pocisk': {
      const dmg = player.stats.ap * (skillDef.damageScaleAp ?? 1.45) * rankMult;
      pushVfx(room, { kind: 'radiant_bolt', x: player.x, z: player.z, tx: targetX, tz: targetZ, radius: skillDef.radius, color: '#d9a826', casterId: player.id });
      checkCrackedWallHit(targetX, targetZ, skillDef.radius);
      for (const e of room.enemies.values()) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - targetX, e.z - targetZ) <= skillDef.radius + e.radius) {
          damageEnemy(room, player, e, dmg, 'magical', now);
          e.weakenedUntil = now + 5000;
          pushCombatText(room, e.x, 3.1, e.z, 'OSŁABIONY!', 'magical', false, true);
        }
      }
      break;
    }

    case 'fala_uzdrowienia': {
      const rawHeal = Math.round((player.stats.ap * 1.45 + 32 + player.level * 5) * rankMult * player.stats.healPower);
      pushVfx(room, { kind: 'heal_wave', x: player.x, z: player.z, radius: skillDef.radius, color: '#22a355', casterId: player.id });
      for (const ally of room.players.values()) {
        if (Math.hypot(ally.x - player.x, ally.z - player.z) > skillDef.radius) continue;
        const cappedHeal = Math.min(rawHeal, Math.round(ally.maxHp * 0.34));
        if (!ally.alive) {
          ally.alive = true;
          ally.hp = Math.min(ally.maxHp, cappedHeal);
          ally.animState = 'idle';
          pushCombatText(room, ally.x, 2.8, ally.z, 'WSKRZESZONY!', 'heal', true, true);
        } else {
          ally.hp = Math.min(ally.maxHp, ally.hp + cappedHeal);
          pushCombatText(room, ally.x, 2.6, ally.z, `+${cappedHeal}`, 'heal', false, false);
        }
      }
      break;
    }

    case 'bariera_swiatla': {
      const rawShield = (player.stats.ap * 1.65 + 42 + player.level * 6) * rankMult * player.stats.shieldPower;
      pushVfx(room, { kind: 'light_barrier', x: player.x, z: player.z, radius: skillDef.radius, color: '#38bdf8', casterId: player.id });
      for (const ally of room.players.values()) {
        if (!ally.alive) continue;
        if (Math.hypot(ally.x - player.x, ally.z - player.z) <= skillDef.radius) {
          const applied = applyBoundedShield(ally, rawShield, 6500, now);
          ally.rootedUntil = 0;
          pushCombatText(room, ally.x, 2.8, ally.z, `TARCZA +${applied}`, 'shield', false, true);
        }
      }
      break;
    }
  }
}

function handleBasicAttack(room: GameRoom, player: ServerPlayer, aimX: number, aimZ: number) {
  if (!player.alive || !room.mapData) return;
  const now = Date.now();
  if (now < player.cooldowns.basic) return;

  const cls = CLASSES[player.classId];
  const frenzyAspd = room.mutatorId === 'blood_frenzy' ? 1.28 : 1.0;
  const comboAspd = 1 + Math.min(0.4, room.comboCount * 0.02);
  const cdMs = Math.round(
    (cls.baseAttackCooldown * 1000) / Math.max(0.5, player.stats.attackSpeed * frenzyAspd * comboAspd)
  );
  player.cooldowns.basic = now + cdMs;
  player.animState = 'attack';
  player.animTime = now;

  const dx = aimX - player.x;
  const dz = aimZ - player.z;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  player.rotY = Math.atan2(dirX, dirZ);

  for (const sec of room.mapData.secrets) {
    if (sec.revealed || sec.kind !== 'cracked_wall') continue;
    const dWall = Math.hypot(sec.wallX - player.x, sec.wallZ - player.z);
    if (dWall <= cls.baseAttackRange + 2.5) {
      sec.hp--;
      if (sec.hp <= 0) {
        sec.revealed = true;
        pushVfx(room, { kind: 'secret_break', x: sec.wallX, z: sec.wallZ, radius: 4, color: '#d97706' });
        io.to(room.code).emit('game:banner', {
          type: 'secret',
          title: 'ODKRYTO UKRYTE PRZEJŚCIE!',
          subtitle: 'Pęknięta ściana runęła! Zajrzyj do sekretnej komnaty!',
        });
      } else {
        pushCombatText(room, sec.wallX, 2.5, sec.wallZ, 'PĘKA!', 'physical', false, true);
      }
    }
  }

  let dmg = player.stats.ad;
  let dmgType: DamageType = 'physical';
  if (player.classId === 'czarnoksieznik' || player.classId === 'wrozka') {
    dmg = player.stats.ap * 0.92;
    dmgType = 'magical';
  } else if (player.classId === 'elf') {
    dmg = (player.stats.ad + player.stats.ap) * 0.46;
    dmgType = 'hybrid';
  }

  const isMelee = player.classId === 'wojownik' || player.classId === 'krasnolud';
  if (isMelee) {
    const cx = player.x + dirX * 1.9;
    const cz = player.z + dirZ * 1.9;
    pushVfx(room, { kind: 'slash', x: cx, z: cz, tx: aimX, tz: aimZ, radius: 2.3, color: cls.primaryColor, casterId: player.id });
    for (const e of room.enemies.values()) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - cx, e.z - cz) <= 2.3 + e.radius) {
        damageEnemy(room, player, e, dmg, dmgType, now);
      }
    }
  } else {
    let hitEnemy: ServerEnemy | null = null;
    let bestScore = Infinity;
    for (const e of room.enemies.values()) {
      if (!e.alive) continue;
      const rx = e.x - player.x;
      const rz = e.z - player.z;
      const proj = rx * dirX + rz * dirZ;
      const perp = Math.abs(rx * dirZ - rz * dirX);
      if (proj >= 0 && proj <= cls.baseAttackRange + 1.5 && perp <= 1.65 + e.radius) {
        if (proj < bestScore) {
          bestScore = proj;
          hitEnemy = e;
        }
      }
    }
    const endX = hitEnemy ? hitEnemy.x : player.x + dirX * cls.baseAttackRange;
    const endZ = hitEnemy ? hitEnemy.z : player.z + dirZ * cls.baseAttackRange;
    pushVfx(room, {
      kind: player.classId === 'elf' ? 'magic_arrow' : player.classId === 'wrozka' ? 'radiant_bolt' : 'shadow_orb',
      x: player.x,
      z: player.z,
      tx: endX,
      tz: endZ,
      radius: 1.0,
      color: cls.primaryColor,
      casterId: player.id,
    });
    if (hitEnemy) {
      damageEnemy(room, player, hitEnemy, dmg, dmgType, now);
    }
  }
}

io.on('connection', (socket: Socket) => {
  socket.emit('server:version', readCurrentBuildVersion());

  const createServerPlayer = (payload: {
    name: string;
    classId: ClassId;
    level: number;
    skillRanks: SkillRanks;
    stats: ComputedStats;
  }): ServerPlayer => ({
    id: socket.id,
    socketId: socket.id,
    name: (payload.name || 'Bohater').slice(0, 20),
    classId: payload.classId || 'wojownik',
    level: Math.max(1, Math.min(60, payload.level || 1)),
    x: -44,
    z: -44,
    rotY: 0,
    hp: payload.stats.maxHp,
    maxHp: payload.stats.maxHp,
    shield: 0,
    mana: payload.stats.maxMana,
    maxMana: payload.stats.maxMana,
    alive: true,
    animState: 'idle',
    animTime: 0,
    weaponGlow: payload.stats.weaponUpgradeGlow,
    armorGlow: payload.stats.armorUpgradeGlow,
    activeSetRarity: payload.stats.activeSetRarity,
    rootedUntil: 0,
    slowedUntil: 0,
    stoneSkinUntil: 0,
    hasteUntil: 0,
    invulnUntil: 0,
    shieldExpiresAt: 0,
    potionReadyAt: 0,
    stats: payload.stats,
    ready: true,
    skillRanks: payload.skillRanks,
    cooldowns: { basic: 0, active1: 0, active2: 0, active3: 0, dash: 0 },
    whirlwindUntil: 0,
    whirlwindNextTick: 0,
    poisonUntil: 0,
    poisonNextTick: 0,
    poisonDps: 0,
    respawnAt: 0,
    activeBoons: [],
    flameAuraNextTick: 0,
    titanBarrierNextTick: 0,
  });

  socket.on('room:create', (payload, ack) => {
    leaveCurrentRoom(socket);
    const code = generateRoomCode();
    const player = createServerPlayer(payload);
    const room: GameRoom = {
      code,
      hostId: socket.id,
      globalLocation: Math.max(1, Math.min(60, payload.globalLocation || 1)),
      inGame: false,
      tick: 0,
      mapData: null,
      players: new Map([[socket.id, player]]),
      enemies: new Map(),
      telegraphs: new Map(),
      loot: new Map(),
      pillars: [],
      totalEnemies: 0,
      bossDefeated: false,
      clearBonusAwarded: false,
      mutatorId: 'treasure_goblin',
      comboCount: 0,
      maxCombo: 0,
      enemiesSlain: 0,
      comboExpiresAt: 0,
      nextMeteorAt: 0,
      trades: new Map(),
      pendingCombatTexts: [],
      pendingVfx: [],
    };
    rooms.set(code, room);
    socketToRoom.set(socket.id, code);
    socket.join(code);
    const summary = buildRoomSummary(room);
    if (ack) ack({ ok: true, summary });
    broadcastRoomSummary(room);
  });

  socket.on('room:join', (payload, ack) => {
    const code = String(payload.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      if (ack) ack({ ok: false, error: 'Nie znaleziono pokoju o podanym kodzie!' });
      return;
    }
    if (room.players.size >= 4) {
      if (ack) ack({ ok: false, error: 'Drużyna jest pełna (maksymalnie 4 graczy)!' });
      return;
    }
    leaveCurrentRoom(socket);
    const player = createServerPlayer(payload);
    if (room.mapData) {
      player.x = room.mapData.spawn.x + 2;
      player.z = room.mapData.spawn.z + 2;
    }
    room.players.set(socket.id, player);
    socketToRoom.set(socket.id, code);
    socket.join(code);

    const summary = buildRoomSummary(room);
    if (ack) ack({ ok: true, summary });
    broadcastRoomSummary(room);

    if (room.inGame && room.mapData) {
      const partySize = room.players.size;
      socket.emit('world:loaded', {
        mapData: room.mapData,
        partySize,
        enemyCountMultiplier: getEnemyCountMultiplier(partySize),
        bossHpMultiplier: getBossHpMultiplier(partySize),
        bossDamageMultiplier: getBossDamageMultiplier(partySize),
      });
    }
  });

  socket.on('room:update_profile', (payload) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;

    p.name = (payload.name || p.name).slice(0, 20);
    p.classId = payload.classId || p.classId;
    p.level = Math.max(1, Math.min(60, payload.level || p.level));
    if (payload.skillRanks) p.skillRanks = payload.skillRanks;
    if (payload.stats) {
      const hpRatio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
      p.stats = payload.stats;
      p.maxHp = payload.stats.maxHp;
      p.maxMana = payload.stats.maxMana;
      p.hp = Math.min(p.maxHp, Math.max(1, Math.round(p.maxHp * hpRatio)));
      p.weaponGlow = payload.stats.weaponUpgradeGlow;
      p.armorGlow = payload.stats.armorUpgradeGlow;
      p.activeSetRarity = payload.stats.activeSetRarity;
    }
    broadcastRoomSummary(room);
  });

  socket.on('room:select_location', (payload) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.globalLocation = Math.max(1, Math.min(60, Number(payload.globalLocation) || 1));
    if (room.inGame) {
      initializeLocation(room, room.globalLocation);
    } else {
      broadcastRoomSummary(room);
    }
  });

  socket.on('room:start', (payload) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (payload?.globalLocation) {
      room.globalLocation = Math.max(1, Math.min(60, Number(payload.globalLocation)));
    }
    room.inGame = true;
    initializeLocation(room, room.globalLocation);
    if (!room.loopTimer) {
      room.loopTimer = setInterval(() => tickRoom(room), 50);
    }
  });

  socket.on('player:move', (payload: { dx: number; dz: number; rotY?: number }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.alive || !room.mapData) return;

    const now = Date.now();
    if (now < p.rootedUntil) {
      p.animState = 'idle';
      return;
    }

    const len = Math.hypot(payload.dx, payload.dz);
    if (len > 0.01) {
      const ndx = payload.dx / Math.max(1, len);
      const ndz = payload.dz / Math.max(1, len);
      let speed = 8.4 * p.stats.moveSpeed;
      if (now < p.slowedUntil) speed *= 0.55;
      if (now < p.hasteUntil) speed *= 1.3;
      if (room.mutatorId === 'blood_frenzy') speed *= 1.24;
      if (p.activeBoons.includes('swift_step')) speed *= 1.3;
      const dt = 0.05;
      const nx = p.x + ndx * speed * dt;
      const nz = p.z + ndz * speed * dt;
      const resolved = moveWithWallSweep(
        p.x,
        p.z,
        nx,
        nz,
        0.85,
        room.mapData.walls,
        getSolvedGateIds(room.mapData),
        getRevealedSecretIds(room.mapData)
      );
      p.x = resolved.x;
      p.z = resolved.z;
      if (payload.rotY !== undefined) p.rotY = payload.rotY;
      else p.rotY = Math.atan2(ndx, ndz);
      if (now >= p.whirlwindUntil && now - p.animTime > 240) {
        p.animState = 'run';
      }
    } else if (now >= p.whirlwindUntil && now - p.animTime > 240) {
      p.animState = 'idle';
    }
  });

  socket.on('player:attack', (payload: { aimX: number; aimZ: number }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    handleBasicAttack(room, p, payload.aimX, payload.aimZ);
  });

  socket.on('player:skill', (payload: { slot: 'active1' | 'active2' | 'active3'; aimX: number; aimZ: number }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    handleSkillCast(room, p, payload.slot, payload.aimX, payload.aimZ);
  });

  socket.on('player:potion', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.alive) return;
    const now = Date.now();
    if (now < p.potionReadyAt || p.hp >= p.maxHp) return;

    p.potionReadyAt = now + 16000;
    const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.32));
    p.hp += heal;
    pushVfx(room, { kind: 'potion_heal', x: p.x, z: p.z, radius: 2.2, color: '#22c55e', casterId: p.id });
    pushCombatText(room, p.x, 2.7, p.z, `🧪 +${heal}`, 'heal', false, true);
  });

  socket.on('player:dash', (payload: { dirX: number; dirZ: number }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.alive || !room.mapData) return;
    const now = Date.now();
    if (now < p.cooldowns.dash || now < p.rootedUntil) return;

    p.cooldowns.dash = now + 2600;
    p.invulnUntil = now + 340;
    p.animState = 'dash';
    p.animTime = now;
    const len = Math.hypot(payload.dirX, payload.dirZ) || 1;
    const nx = p.x + (payload.dirX / len) * 5.8;
    const nz = p.z + (payload.dirZ / len) * 5.8;
    const resolved = moveWithWallSweep(
      p.x,
      p.z,
      nx,
      nz,
      0.85,
      room.mapData.walls,
      getSolvedGateIds(room.mapData),
      getRevealedSecretIds(room.mapData)
    );
    p.x = resolved.x;
    p.z = resolved.z;
    pushCombatText(room, p.x, 2.3, p.z, 'UNIK!', 'shield', false, true);
  });

  socket.on('loot:pickup', (payload: { lootId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    const drop = room.loot.get(payload.lootId);
    if (!drop || drop.pickedUp) return;
    if (Math.hypot(p.x - drop.x, p.z - drop.z) > 6.5) return;

    drop.pickedUp = true;
    room.loot.delete(drop.id);
    socket.emit('loot:granted', {
      item: drop.item,
      runeShard: drop.runeShard,
    });
  });

  socket.on('world:interact', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.alive || !room.mapData) return;
    const map = room.mapData;

    for (const drop of room.loot.values()) {
      if (!drop.pickedUp && Math.hypot(p.x - drop.x, p.z - drop.z) <= 4.5) {
        drop.pickedUp = true;
        room.loot.delete(drop.id);
        socket.emit('loot:granted', { item: drop.item, runeShard: drop.runeShard });
        return;
      }
    }

    for (const chest of map.chests) {
      if (!chest.opened && Math.hypot(p.x - chest.x, p.z - chest.z) <= 4.2) {
        socket.emit('chest:open_modal', chest);
        return;
      }
    }

    for (const sec of map.secrets) {
      if (sec.revealed) continue;
      if (sec.kind === 'hidden_lever' && sec.leverX !== undefined && sec.leverZ !== undefined) {
        if (Math.hypot(p.x - sec.leverX, p.z - sec.leverZ) <= 4.2) {
          sec.revealed = true;
          pushVfx(room, { kind: 'secret_break', x: sec.wallX, z: sec.wallZ, radius: 4.5, color: '#38bdf8' });
          io.to(room.code).emit('game:banner', {
            type: 'secret',
            title: 'UKRYTA DŹWIGNIA AKTYWOWANA!',
            subtitle: 'Sekretna ściana odsunęła się, ujawniając ukrytą komnatę!',
          });
          return;
        }
      }
      if (sec.kind === 'cracked_wall' && Math.hypot(p.x - sec.wallX, p.z - sec.wallZ) <= 5.0) {
        sec.revealed = true;
        pushVfx(room, { kind: 'secret_break', x: sec.wallX, z: sec.wallZ, radius: 4.5, color: '#d97706' });
        io.to(room.code).emit('game:banner', {
          type: 'secret',
          title: 'ODKRYTO UKRYTE PRZEJŚCIE!',
          subtitle: 'Pęknięta ściana runęła, odsłaniając skarb!',
        });
        return;
      }
    }

    for (const puz of map.puzzles) {
      if (puz.solved) continue;
      for (let i = 0; i < puz.nodes.length; i++) {
        const node = puz.nodes[i];
        if (Math.hypot(p.x - node.x, p.z - node.z) <= 4.2) {
          if (puz.type === 'rotating_statues') {
            puz.statueAngles[i] = (puz.statueAngles[i] + 1) % 4;
            const aligned = puz.statueAngles[i] === 0;
            pushCombatText(
              room,
              node.x,
              3.0,
              node.z,
              aligned ? 'POSĄG WYRÓWNANY ✓' : 'OBRÓT 90°',
              aligned ? 'heal' : 'shield',
              false,
              true
            );
            if (puz.statueAngles.every((a) => a === 0)) solveWorldPuzzle(room, puz);
            return;
          }
          if (puz.type === 'symbol_match') {
            puz.pillarSymbols[i] = (puz.pillarSymbols[i] + 1) % 4;
            const symbols = ['☀️', '🌙', '⚡', '🔥'];
            const matched = puz.pillarSymbols[i] === puz.targetSymbols[i];
            pushCombatText(
              room,
              node.x,
              3.2,
              node.z,
              `${symbols[puz.pillarSymbols[i]]}${matched ? ' ✓' : ''}`,
              matched ? 'heal' : 'magical',
              false,
              true
            );
            if (puz.pillarSymbols.every((s, idx) => s === puz.targetSymbols[idx])) {
              solveWorldPuzzle(room, puz);
            }
            return;
          }
        }
      }
    }

    for (const sh of map.shrines) {
      if (!sh.used && Math.hypot(p.x - sh.x, p.z - sh.z) <= 4.2) {
        sh.used = true;
        for (const ally of room.players.values()) {
          ally.alive = true;
          ally.hp = ally.maxHp;
          ally.mana = ally.maxMana;
          pushCombatText(room, ally.x, 2.8, ally.z, 'KAPLICZKA: 100% HP + DAR CHAOSU!', 'heal', true, true);
        }
        offerBoonsToParty(room, '✨ KAPLICZKA CHAOSU — WYBIERZ BŁOGOSŁAWIEŃSTWO!');
        return;
      }
    }

    if (map.obelisk && map.obelisk.state === 'idle' && Math.hypot(p.x - map.obelisk.x, p.z - map.obelisk.z) <= 4.6) {
      map.obelisk.state = 'active';
      map.obelisk.currentWave = 1;
      spawnObeliskWave(room, 1);
      return;
    }

    if (Math.hypot(p.x - map.exitPortal.x, p.z - map.exitPortal.z) <= 4.8) {
      let remaining = 0;
      for (const e of room.enemies.values()) {
        if (
          e.alive &&
          e.tier !== 'summon' &&
          e.tier !== 'root_trap' &&
          e.tier !== 'barrel' &&
          e.tier !== 'totem' &&
          e.tier !== 'goblin' &&
          !e.isWaveMob
        ) {
          remaining++;
        }
      }
      const loc = map.location;
      const unlocked =
        loc.isMainBoss || loc.isMiniBoss
          ? room.bossDefeated
          : remaining <= Math.floor(room.totalEnemies * 0.45);
      if (!unlocked) {
        pushCombatText(room, map.exitPortal.x, 3.0, map.exitPortal.z, 'POKONAJ STRAŻNIKÓW!', 'physical', false, true);
        return;
      }
      if (!room.clearBonusAwarded) {
        room.clearBonusAwarded = true;
        const clearXp = Math.round(targetLocationXpPool(room.globalLocation) * 0.12);
        const chestsOpened = map.chests.filter((c) => c.opened).length;
        const secretsFound = map.secrets.filter((s) => s.revealed).length;
        const score =
          (room.maxCombo >= 10 ? 2 : room.maxCombo >= 5 ? 1 : 0) +
          (chestsOpened >= 2 ? 1 : 0) +
          (secretsFound >= 1 ? 1 : 0) +
          (remaining === 0 ? 1 : 0);
        const grade = score >= 4 ? 'S' : score >= 2 ? 'A' : 'B';
        io.to(room.code).emit('location:completed', {
          globalLocation: room.globalLocation,
          locationName: loc.name,
          clearXp,
          enemiesSlain: room.enemiesSlain,
          maxCombo: room.maxCombo,
          chestsOpened,
          totalChests: map.chests.length,
          secretsFound,
          totalSecrets: map.secrets.length,
          grade,
        });
      }
      const nextLoc = Math.min(60, room.globalLocation + 1);
      initializeLocation(room, nextLoc);
    }
  });

  socket.on('player:emote', (payload: { text: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.alive) return;
    const clean = String(payload?.text || '').slice(0, 24);
    if (!clean) return;
    pushCombatText(room, p.x, 3.3, p.z, clean, 'heal', true, true);
  });

  socket.on('boon:choose', (payload: { boonId: BoonId }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !p.pendingBoonChoices) return;
    if (!p.pendingBoonChoices.includes(payload.boonId)) return;

    p.pendingBoonChoices = undefined;
    if (!p.activeBoons.includes(payload.boonId)) {
      p.activeBoons.push(payload.boonId);
    }
    const def = CHAOS_BOONS[payload.boonId];
    if (payload.boonId === 'titan_barrier') {
      applyBoundedShield(p, Math.round(p.maxHp * 0.25), 6000, Date.now());
    }
    pushVfx(room, { kind: 'level_up', x: p.x, z: p.z, radius: 3.2, color: def.color });
    pushCombatText(room, p.x, 3.4, p.z, `${def.icon} ${def.name.toUpperCase()}!`, 'heal', true, true);
  });

  socket.on('chest:solved', (payload: { chestId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const p = room?.players.get(socket.id);
    if (!room || !p || !room.mapData) return;

    const chest = room.mapData.chests.find((c) => c.id === payload.chestId);
    if (!chest || chest.opened) return;
    chest.opened = true;

    pushVfx(room, { kind: 'chest_open', x: chest.x, z: chest.z, radius: 4, color: '#d9a826' });
    const rolls = chest.isSecret ? 3 : 2;
    const luck = chest.isSecret ? 1.5 : 1.1;
    for (let i = 0; i < rolls; i++) {
      spawnEquipmentDrop(room, chest.x, chest.z, room.globalLocation, i === 0, luck, p.classId);
    }
    const chestXp = Math.round(targetLocationXpPool(room.globalLocation) * 0.04);
    io.to(room.code).emit('player:xp_gain', { amount: chestXp, source: 'Skrzynia z Łupem' });
  });

  // 2-STEP ANTI-SCAM TRADING
  socket.on('trade:request', (payload: { targetId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const playerA = room.players.get(socket.id);
    const playerB = room.players.get(payload.targetId);
    if (!playerA || !playerB || playerA.id === playerB.id) return;

    const tradeId = nextId('trd');
    const session: TradeSessionState = {
      tradeId,
      playerAId: playerA.id,
      playerAName: playerA.name,
      playerBId: playerB.id,
      playerBName: playerB.name,
      offerA: [],
      offerB: [],
      lockedA: false,
      lockedB: false,
      acceptedA: false,
      acceptedB: false,
      status: 'pending',
    };
    room.trades.set(tradeId, session);
    io.to(playerB.socketId).emit('trade:incoming', session);
    socket.emit('trade:state', session);
  });

  socket.on('trade:respond', (payload: { tradeId: string; accept: boolean }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const session = room?.trades.get(payload.tradeId);
    if (!room || !session || session.playerBId !== socket.id) return;

    if (!payload.accept) {
      session.status = 'cancelled';
      io.to(session.playerAId).emit('trade:state', session);
      io.to(session.playerBId).emit('trade:state', session);
      room.trades.delete(session.tradeId);
      return;
    }

    session.status = 'active';
    io.to(session.playerAId).emit('trade:state', session);
    io.to(session.playerBId).emit('trade:state', session);
  });

  socket.on('trade:update_offer', (payload: { tradeId: string; items: EquipmentItem[] }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const session = room?.trades.get(payload.tradeId);
    if (!room || !session || session.status !== 'active') return;

    const safeItems = (payload.items || []).slice(0, 6);
    if (socket.id === session.playerAId) session.offerA = safeItems;
    else if (socket.id === session.playerBId) session.offerB = safeItems;
    else return;

    session.lockedA = false;
    session.lockedB = false;
    session.acceptedA = false;
    session.acceptedB = false;

    io.to(session.playerAId).emit('trade:state', session);
    io.to(session.playerBId).emit('trade:state', session);
  });

  socket.on('trade:lock', (payload: { tradeId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const session = room?.trades.get(payload.tradeId);
    if (!room || !session || session.status !== 'active') return;

    if (socket.id === session.playerAId) session.lockedA = true;
    else if (socket.id === session.playerBId) session.lockedB = true;
    else return;

    io.to(session.playerAId).emit('trade:state', session);
    io.to(session.playerBId).emit('trade:state', session);
  });

  socket.on('trade:accept', (payload: { tradeId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const session = room?.trades.get(payload.tradeId);
    if (!room || !session || session.status !== 'active') return;
    if (!session.lockedA || !session.lockedB) return;

    if (socket.id === session.playerAId) session.acceptedA = true;
    else if (socket.id === session.playerBId) session.acceptedB = true;
    else return;

    if (session.acceptedA && session.acceptedB) {
      session.status = 'completed';
      io.to(session.playerAId).emit('trade:completed', {
        tradeId: session.tradeId,
        givenIds: session.offerA.map((i) => i.id),
        receivedItems: session.offerB,
      });
      io.to(session.playerBId).emit('trade:completed', {
        tradeId: session.tradeId,
        givenIds: session.offerB.map((i) => i.id),
        receivedItems: session.offerA,
      });
      room.trades.delete(session.tradeId);
    } else {
      io.to(session.playerAId).emit('trade:state', session);
      io.to(session.playerBId).emit('trade:state', session);
    }
  });

  socket.on('trade:cancel', (payload: { tradeId: string }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    const session = room?.trades.get(payload.tradeId);
    if (!room || !session) return;

    session.status = 'cancelled';
    io.to(session.playerAId).emit('trade:state', session);
    io.to(session.playerBId).emit('trade:state', session);
    room.trades.delete(session.tradeId);
  });

  socket.on('room:leave', () => {
    leaveCurrentRoom(socket);
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket);
  });
});

function leaveCurrentRoom(socket: Socket) {
  const code = socketToRoom.get(socket.id);
  if (!code) return;
  socketToRoom.delete(socket.id);
  socket.leave(code);

  const room = rooms.get(code);
  if (!room) return;
  room.players.delete(socket.id);

  for (const [tid, trd] of room.trades.entries()) {
    if (trd.playerAId === socket.id || trd.playerBId === socket.id) {
      trd.status = 'cancelled';
      io.to(trd.playerAId).emit('trade:state', trd);
      io.to(trd.playerBId).emit('trade:state', trd);
      room.trades.delete(tid);
    }
  }

  if (room.players.size === 0) {
    if (room.loopTimer) clearInterval(room.loopTimer);
    rooms.delete(code);
    return;
  }

  if (room.hostId === socket.id) {
    const nextHost = room.players.keys().next().value;
    if (nextHost) room.hostId = nextHost;
  }
  broadcastRoomSummary(room);
}

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

export function startServer(preferredPort = PORT): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : preferredPort;
      console.log(`[Kroniki Chaosu] Co-op ARPG Server running on http://localhost:${actualPort}`);
      const lans = getLanUrls(actualPort);
      for (const url of lans) {
        console.log(`[Kroniki Chaosu] LAN URL dla znajomych w sieci: ${url}`);
      }
      resolve({
        port: actualPort,
        close: () =>
          new Promise<void>((res) => {
            clearInterval(versionWatchTimer);
            for (const room of rooms.values()) {
              if (room.loopTimer) clearInterval(room.loopTimer);
            }
            io.close(() => {
              httpServer.close(() => res());
            });
          }),
      });
    };

    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && preferredPort !== 0) {
        httpServer.removeListener('error', onError);
        httpServer.listen(0, '0.0.0.0', onListening);
      } else {
        reject(err);
      }
    };

    httpServer.once('error', onError);
    httpServer.listen(preferredPort, '0.0.0.0', onListening);
  });
}

// Auto-start only when run directly via Node/tsx (not when imported by Electron main process)
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  startServer(PORT).catch((err) => {
    console.error('[Kroniki Chaosu] Błąd uruchomienia serwera:', err);
    process.exit(1);
  });
}

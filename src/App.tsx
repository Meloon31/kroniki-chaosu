import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CLASSES, MAX_LEVEL, MAX_SKILL_RANK, xpToNextLevel } from '../shared/classes';
import { getMainBossByAct } from '../shared/bosses';
import {
  canClassEquipItem,
  createStarterEquipment,
  createStarterShards,
  EQUIP_SLOTS,
  generateEquipmentItem,
  getMaxUpgradeLevel,
  getPlus13ClassBonus,
  getSalvageShardYield,
  getUpgradeShardCost,
  getUpgradeSuccessChance,
  isHardcoreUnlocked,
  MAX_UPGRADE_LEVEL,
  MAX_UPGRADE_LEVEL_HARDCORE,
  RARITY_META,
} from '../shared/items';
import {
  BOUNTY_BY_ID,
  BountyKind,
  canClaimDailyReward,
  canSpinDailyWheel,
  countAllReadyRewards,
  DAILY_ACT_QUEST_REWARD,
  DAILY_REWARDS,
  ensureActiveBounties,
  getDailyBlessing,
  getDailyFeaturedLocation,
  getNextDailyDay,
  getReadySideLocations,
  getTodayDateKey,
  isDailyActQuestReady,
  isMainQuestClaimed,
  isMainQuestCompleted,
  MAIN_ACT_QUESTS,
  rollReplacementBounty,
  SIDE_LOCATION_REWARD,
  SIDE_LOCATION_REWARD_HC,
  WHEEL_SLICES,
} from '../shared/bounties';
import { CAMP_LOCATION_INDEX, TOTAL_LOCATIONS } from '../shared/world';
import { CosmeticSlot } from '../shared/prestige';
import { RiftLeaderboardMap } from '../shared/rift';
import {
  GUILD_UPGRADES,
  GuildInvitePayload,
  GuildState,
  GuildUpgradeId,
} from '../shared/guilds';
import { createStarterRunes, createStarterRuneShards, RUNE_MAX_LEVEL, RUNES } from '../shared/runes';
import { BoonId, CHAOS_BOONS } from '../shared/mutators';
import type { BoonRarity } from '../shared/hades';
import transmutationConfig from '../shared/transmutation.json';
import { computePlayerStats } from '../shared/stats';
import type {
  ActNumber,
  ClassId,
  EquipmentItem,
  EquipSlot,
  FloatingCombatText,
  GeneratedMapData,
  LockedChestState,
  MvpCard,
  PlayerProfile,
  Rarity,
  RoomSummary,
  RuneId,
  SkillRanks,
  SkillVfxEvent,
  TradeSessionState,
  WorldSnapshot,
} from '../shared/types';
import { soundEngine } from './audio/soundEngine';
import { musicEngine, MusicTrackInfo } from './audio/musicEngine';
import { BlacksmithModal } from './components/BlacksmithModal';
import { BountiesModal, BountiesTab } from './components/BountiesModal';
import { CharonModal } from './components/CharonModal';
import { ChestPuzzleModal } from './components/ChestPuzzleModal';
import { GuildModal } from './components/GuildModal';
import { HadesOfferOverlay, HadesOfferState } from './components/HadesOfferOverlay';
import { ActivePanel, Hud } from './components/Hud';
import { InventoryModal } from './components/InventoryModal';
import { LobbyScreen } from './components/LobbyScreen';
import { PrestigeModal } from './components/PrestigeModal';
import { RiftModal } from './components/RiftModal';
import { RunesModal } from './components/RunesModal';
import { SkillsModal } from './components/SkillsModal';
import { TradeModal } from './components/TradeModal';
import { WorldMapModal } from './components/WorldMapModal';
import { GameEngine, ScreenFloatingText } from './game/GameEngine';

const STORAGE_KEY = 'kroniki_chaosu_profile_v1';
const SERVER_URL_KEY = 'kroniki_chaosu_server_url_v1';

interface DesktopBridge {
  isDesktopClient?: boolean;
  platform?: string;
  getLiveServerUrl?: () => Promise<string>;
  setLiveServerUrl?: (url: string) => Promise<{ mode: string; url: string }>;
  reloadFresh?: () => Promise<boolean>;
}

function getDesktopBridge(): DesktopBridge | undefined {
  return (window as unknown as { kronikiDesktop?: DesktopBridge }).kronikiDesktop;
}

function loadSavedServerUrl(): string {
  try {
    return (localStorage.getItem(SERVER_URL_KEY) || '').trim();
  } catch {
    return '';
  }
}

function createDefaultProfile(classId: ClassId = 'wojownik'): PlayerProfile {
  return {
    name: 'Bohater',
    classId,
    level: 1,
    xp: 0,
    skillPoints: 2,
    skillRanks: {
      active1: 1,
      active2: 1,
      active3: 1,
      passive1: 0,
      passive2: 0,
    },
    equipped: createStarterEquipment(classId),
    inventory: [],
    shards: createStarterShards(),
    runes: createStarterRunes(),
    runeShards: createStarterRuneShards(),
    unlockedLocationGlobal: 1,
    completedLocations: [],
    sandboxUnlockAll: false,
    dailyStreak: 0,
    bounties: ensureActiveBounties(),
    lifetimeKills: 0,
    playerUid: `plr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
    guildId: null,
    guildSnapshot: null,
    mentorShards: 0,
    bestRiftFloor: 0,
    perfectDodgesTotal: 0,
    totalRevives: 0,
    noDownAct4QuadCleared: false,
    equippedTitle: null,
    equippedAura: null,
    equippedTrail: null,
  };
}

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const def = createDefaultProfile(parsed.classId || 'wojownik');
    return {
      ...def,
      ...parsed,
      playerUid: parsed.playerUid || def.playerUid,
      skillRanks: { ...def.skillRanks, ...(parsed.skillRanks || {}) },
      equipped: { ...def.equipped, ...(parsed.equipped || {}) },
      shards: { ...def.shards, ...(parsed.shards || {}) },
      runes: { ...def.runes, ...(parsed.runes || {}) },
      runeShards: { ...def.runeShards, ...(parsed.runeShards || {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      completedLocations: Array.isArray(parsed.completedLocations) ? parsed.completedLocations : [],
      bounties: ensureActiveBounties(parsed.bounties),
      lifetimeKills: typeof parsed.lifetimeKills === 'number' ? parsed.lifetimeKills : 0,
    };
  } catch {
    return createDefaultProfile();
  }
}

interface VictorySummaryData {
  locationName: string;
  globalLocation: number;
  clearXp: number;
  enemiesSlain: number;
  maxCombo: number;
  chestsOpened: number;
  totalChests: number;
  secretsFound: number;
  totalSecrets: number;
  grade: 'S' | 'A' | 'B';
  mvpCards?: MvpCard[];
  mentorShardsEarned?: number;
}

interface BannerMessage {
  id: number;
  type: 'info' | 'warning' | 'secret' | 'boss' | 'boss_kill' | 'boski' | 'levelup';
  title: string;
  subtitle?: string;
}

interface ToastMessage {
  id: number;
  text: string;
  color: string;
}

export function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [guild, setGuild] = useState<GuildState | null>(() => profile.guildSnapshot ?? null);
  const guildRef = useRef<GuildState | null>(guild);
  guildRef.current = guild;
  const [incomingGuildInvite, setIncomingGuildInvite] = useState<GuildInvitePayload | null>(null);

  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(() => loadSavedServerUrl());
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const loadedBuildIdRef = useRef<string | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState('');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const roomRef = useRef<RoomSummary | null>(room);
  roomRef.current = room;
  const [riftLeaderboard, setRiftLeaderboard] = useState<RiftLeaderboardMap>({
    solo: [],
    duo: [],
    trio: [],
    quad: [],
  });
  const [perfectDodgeFlashKey, setPerfectDodgeFlashKey] = useState(0);
  const [inGame, setInGame] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lanUrls, setLanUrls] = useState<string[]>([]);
  const [initialInviteCode] = useState<string>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get('room') || '').trim().toUpperCase().slice(0, 8);
    } catch {
      return '';
    }
  });

  const [mapData, setMapData] = useState<GeneratedMapData | null>(null);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<ScreenFloatingText[]>([]);
  const [interactHint, setInteractHint] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [bountiesInitialTab, setBountiesInitialTab] = useState<BountiesTab>('daily');
  const [activeChest, setActiveChest] = useState<LockedChestState | null>(null);
  const [boonOffer, setBoonOffer] = useState<{ title: string; choices: BoonId[] } | null>(null);
  const [hadesOffer, setHadesOffer] = useState<HadesOfferState | null>(null);
  const [charonOpen, setCharonOpen] = useState<{ runEssence: number; purchasedIds: string[] } | null>(null);
  const [activePactCurses, setActivePactCurses] = useState<string[]>([]);
  const activePactCursesRef = useRef<string[]>(activePactCurses);
  activePactCursesRef.current = activePactCurses;
  const [victorySummary, setVictorySummary] = useState<VictorySummaryData | null>(null);
  const [activeTrade, setActiveTrade] = useState<TradeSessionState | null>(null);
  const [incomingTrade, setIncomingTrade] = useState<TradeSessionState | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const [boskiFlashKey, setBoskiFlashKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => musicEngine.getVolume());
  const [currentTrack, setCurrentTrack] = useState<MusicTrackInfo>(() => musicEngine.getCurrentTrack());
  const [skillCooldowns, setSkillCooldowns] = useState({
    active1: 0,
    active2: 0,
    active3: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const victoryTimerRef = useRef<number | null>(null);
  const aliveEnemyIdsRef = useRef<Set<string>>(new Set());
  const lastEmoteAtRef = useRef<number>(0);
  const toastCounter = useRef(1);

  const showBanner = useCallback(
    (type: BannerMessage['type'], title: string, subtitle?: string, durationMs = 3600) => {
      const id = Date.now() + Math.random();
      setBanner({ id, type, title, subtitle });
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = window.setTimeout(() => {
        setBanner((cur) => (cur?.id === id ? null : cur));
      }, durationMs);
    },
    []
  );

  const pushToast = useCallback((text: string, color = '#fde047') => {
    const id = toastCounter.current++;
    setToasts((prev) => [...prev.slice(-4), { id, text, color }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const advanceBounty = useCallback(
    (kind: BountyKind, value: number, mode: 'add' | 'max' = 'add') => {
      if (value <= 0) return;
      const newlyCompleted: string[] = [];
      setProfile((prev) => {
        const list = ensureActiveBounties(prev.bounties);
        let changed = false;
        const nextList = list.map((b) => {
          const def = BOUNTY_BY_ID[b.defId];
          if (!def || def.kind !== kind || b.progress >= def.target) return b;
          const nextProg =
            mode === 'max' ? Math.max(b.progress, value) : Math.min(def.target, b.progress + value);
          const clamped = Math.min(def.target, nextProg);
          if (clamped !== b.progress) {
            changed = true;
            if (b.progress < def.target && clamped >= def.target) {
              newlyCompleted.push(def.title);
            }
            return { ...b, progress: clamped };
          }
          return b;
        });
        const nextKills = kind === 'kills' ? (prev.lifetimeKills || 0) + value : prev.lifetimeKills || 0;
        if (!changed && nextKills === (prev.lifetimeKills || 0)) return prev;
        return { ...prev, bounties: nextList, lifetimeKills: nextKills };
      });
      for (const title of newlyCompleted) {
        soundEngine.playPuzzleSolve();
        pushToast(`🏆 Misja ukończona: ${title}! Odbierz w [J] Misje!`, '#4ade80');
      }
    },
    [pushToast]
  );

  // Persist profile & push stat updates (including Guild Bonuses!) to server live
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore quota errors
    }
    const sock = socketRef.current;
    if (sock && sock.connected) {
      const stats = computePlayerStats(
        profile.classId,
        profile.level,
        profile.equipped,
        profile.skillRanks,
        profile.runes,
        0,
        guild?.upgrades
      );
      sock.emit('room:update_profile', {
        name: guild ? `[${guild.tag}] ${profile.name}` : profile.name,
        classId: profile.classId,
        level: profile.level,
        skillRanks: profile.skillRanks,
        equippedTitle: profile.equippedTitle ?? null,
        equippedAura: profile.equippedAura ?? null,
        equippedTrail: profile.equippedTrail ?? null,
        stats,
      });
    }
  }, [profile, guild]);

  const grantXp = useCallback(
    (rawAmount: number) => {
      if (rawAmount <= 0) return;
      const xpBonus = getDailyBlessing().xpBonusPct || 0;
      const amount = xpBonus > 0 ? Math.round(rawAmount * (1 + xpBonus / 100)) : rawAmount;
      setProfile((prev) => {
        if (prev.level >= MAX_LEVEL) return prev;
        let lvl = prev.level;
        let xp = prev.xp + amount;
        let sp = prev.skillPoints;
        let leveledUp = false;

        while (lvl < MAX_LEVEL) {
          const req = xpToNextLevel(lvl);
          if (xp >= req) {
            xp -= req;
            lvl++;
            sp++;
            leveledUp = true;
          } else {
            break;
          }
        }
        if (lvl >= MAX_LEVEL) xp = 0;

        if (leveledUp) {
          soundEngine.playLevelUp();
          showBanner(
            'levelup',
            `AWANS NA POZIOM ${lvl}!`,
            `Zdobyto +1 Punkt Umiejętności! Otwórz [K] Drzewko Umiejętności.`,
            3500
          );
        }
        return { ...prev, level: lvl, xp, skillPoints: sp };
      });
    },
    [showBanner]
  );

  const handleChooseBoon = useCallback(
    (boonId: BoonId) => {
      socketRef.current?.emit('boon:choose', { boonId });
      const def = CHAOS_BOONS[boonId];
      if (def) {
        soundEngine.playRuneUpgrade();
        pushToast(`${def.icon} Wybrano Dar: ${def.name}!`, def.color);
      }
      setBoonOffer(null);
    },
    [pushToast]
  );

  // Quick hotkeys [Z], [X], [C] to pick a Chaos Boon OR Hades Elemental/Evolution Card!
  useEffect(() => {
    if (!boonOffer && !hadesOffer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      const idx = k === 'z' ? 0 : k === 'x' ? 1 : k === 'c' ? 2 : -1;
      if (idx < 0) return;
      if (hadesOffer) {
        if (hadesOffer.mode === 'elemental' && hadesOffer.choices[idx]) {
          const ch = hadesOffer.choices[idx];
          socketRef.current?.emit('hades:choose_boon', { kind: ch.kind, id: ch.id });
          soundEngine.playRuneUpgrade();
          setHadesOffer(null);
        } else if (hadesOffer.mode === 'evolution' && hadesOffer.choices[idx]) {
          socketRef.current?.emit('hades:choose_evolution', { id: hadesOffer.choices[idx] });
          soundEngine.playRuneUpgrade();
          setHadesOffer(null);
        }
      } else if (boonOffer && boonOffer.choices[idx]) {
        handleChooseBoon(boonOffer.choices[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boonOffer, hadesOffer, handleChooseBoon]);

  // Bind dynamic Act music engine & track listener
  useEffect(() => {
    musicEngine.bindAutoUnlock();
    return musicEngine.subscribe((tr) => setCurrentTrack(tr));
  }, []);

  // Switch seamlessly between Main Menu Overture and the 3 dynamic tracks of each Act!
  useEffect(() => {
    if (!inGame || !mapData) {
      musicEngine.playMenuTheme();
    } else {
      const loc = mapData.location;
      musicEngine.playActLocation(loc.act, loc.locationInAct, loc.isMainBoss || loc.isMiniBoss);
    }
  }, [inGame, mapData]);

  // Adapt music energy dynamically to Boss fights, Wave Obelisk, and Kill-Streak Combos!
  useEffect(() => {
    if (!inGame || !snapshot) {
      musicEngine.setCombatIntensity(0.4);
      return;
    }
    const bossLive = snapshot.enemies.some((e) => e.alive && (e.tier === 'boss' || e.tier === 'miniboss'));
    const waveLive = snapshot.obelisk?.state === 'active';
    const comboBoost = Math.min(0.45, (snapshot.comboCount || 0) * 0.04);
    const intensity = bossLive ? 1.0 : waveLive ? 0.92 : 0.52 + comboBoost;
    musicEngine.setCombatIntensity(intensity);
  }, [inGame, snapshot]);

  // Fetch LAN sharing URLs from server
  useEffect(() => {
    fetch('/api/network-info')
      .then((r) => r.json())
      .then((d: { lanUrls?: string[] }) => {
        if (Array.isArray(d.lanUrls)) setLanUrls(d.lanUrls);
      })
      .catch(() => {});
  }, []);

  // Socket.io connection setup (reconnects cleanly whenever serverUrl changes)
  useEffect(() => {
    setConnected(false);
    setRoom(null);
    const targetUrl = serverUrl.trim();
    const sock = targetUrl
      ? io(targetUrl, { transports: ['websocket', 'polling'] })
      : io({ transports: ['websocket', 'polling'] });
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      setLocalPlayerId(sock.id || '');
      engineRef.current?.setLocalPlayerId(sock.id || '');
      const p = profileRef.current;
      sock.emit('guild:sync', {
        playerUid: p.playerUid,
        name: p.name,
        classId: p.classId,
        level: p.level,
        guildId: p.guildId,
        guildSnapshot: p.guildSnapshot,
      });
      sock.emit('rift:get_leaderboard');
    });

    sock.on('guild:state', (gState: GuildState | null) => {
      setGuild(gState);
      setProfile((prev) => ({
        ...prev,
        guildId: gState?.id ?? null,
        guildSnapshot: gState,
      }));
    });

    sock.on('guild:invite_incoming', (invite: GuildInvitePayload) => {
      setIncomingGuildInvite(invite);
      soundEngine.playPuzzleTick();
    });

    sock.on(
      'guild:shard_drop',
      (payload: { guildName: string; shardId: GuildUpgradeId; act: number }) => {
        const upDef = GUILD_UPGRADES[payload.shardId];
        soundEngine.playLootDrop('niesmiertelny');
        pushToast(
          `🏰 Gildia [${payload.guildName}] zdobyła 1× ${upDef.icon} ${upDef.shardName} (100%)!`,
          upDef.color
        );
      }
    );

    sock.on('guild:error', (payload: { error?: string }) => {
      soundEngine.playPuzzleFail();
      pushToast(`🏰 ${payload?.error || 'Błąd operacji Gildii'}`, '#f87171');
    });

    sock.on('disconnect', () => {
      setConnected(false);
    });

    const handleVersionCheck = (info: { buildId?: string }) => {
      if (!info?.buildId) return;
      if (!loadedBuildIdRef.current) {
        loadedBuildIdRef.current = info.buildId;
      } else if (loadedBuildIdRef.current !== info.buildId) {
        setUpdateAvailable(info.buildId);
      }
    };

    sock.on('server:version', handleVersionCheck);
    sock.on('server:update_available', (info: { buildId?: string }) => {
      if (info?.buildId && loadedBuildIdRef.current && info.buildId !== loadedBuildIdRef.current) {
        setUpdateAvailable(info.buildId);
      }
    });

    sock.on('room:summary', (summary: RoomSummary) => {
      setRoom(summary);
      if (summary.inGame) setInGame(true);
    });

    sock.on('world:loaded', (payload: { mapData: GeneratedMapData }) => {
      setMapData(payload.mapData);
      setBoonOffer(null);
      aliveEnemyIdsRef.current = new Set();
      setInGame(true);
      setActiveChest(null);
      engineRef.current?.loadMap(payload.mapData);
      if (payload.mapData.location.isMainBoss) {
        soundEngine.playBossRoar();
        const bossDef = getMainBossByAct(payload.mapData.location.act);
        showBanner(
          'boss',
          `AKT ${payload.mapData.location.act}: ${bossDef.name.toUpperCase()}`,
          `Wymagany sprzęt: ${bossDef.recommendedGear} (Moc ≥ ${bossDef.requiredPower}) • 30% na Odłamek Runy!`,
          5200
        );
      }
    });

    sock.on('world:snapshot', (snap: WorldSnapshot) => {
      setSnapshot(snap);
      engineRef.current?.applySnapshot(snap);

      // Track live enemy kills & max combo for active bounties!
      const prevAlive = aliveEnemyIdsRef.current;
      const curAlive = new Set<string>();
      for (const e of snap.enemies) {
        if (e.alive && e.tier !== 'barrel' && e.tier !== 'root_trap') {
          curAlive.add(e.id);
        }
      }
      if (prevAlive.size > 0) {
        let slainDelta = 0;
        for (const id of prevAlive) {
          if (!curAlive.has(id)) slainDelta++;
        }
        if (slainDelta > 0) {
          advanceBounty('kills', slainDelta, 'add');
        }
      }
      aliveEnemyIdsRef.current = curAlive;

      if ((snap.comboCount || 0) >= 2) {
        advanceBounty('combo', snap.comboCount || 0, 'max');
      }
    });

    sock.on('world:vfx', (events: SkillVfxEvent[]) => {
      engineRef.current?.handleVfxEvents(events);
      for (const ev of events) {
        if (ev.kind === 'slash' || ev.kind === 'whirlwind' || ev.kind === 'charge' || ev.kind === 'hammer_slam') {
          soundEngine.playSlash();
        } else if (ev.kind === 'meteor' || ev.kind === 'earthquake' || ev.kind === 'boss_obsidian_rain' || ev.kind === 'boss_chaos_burst') {
          soundEngine.playMeteorImpact();
        } else if (ev.kind === 'shadow_orb' || ev.kind === 'soul_drain' || ev.kind === 'radiant_bolt') {
          soundEngine.playMagic();
        } else if (ev.kind === 'magic_arrow' || ev.kind === 'volley_backflip' || ev.kind === 'wind_blade') {
          soundEngine.playArrow();
        } else if (ev.kind === 'heal_wave') {
          soundEngine.playHeal();
        } else if (ev.kind === 'light_barrier' || ev.kind === 'stone_skin') {
          soundEngine.playShield();
        } else if (ev.kind === 'secret_break') {
          soundEngine.playSecretOpen();
        } else if (ev.kind === 'puzzle_solve') {
          soundEngine.playPuzzleSolve();
        }
      }
    });

    sock.on('world:combat_texts', (texts: FloatingCombatText[]) => {
      engineRef.current?.handleCombatTexts(texts);
    });

    sock.on('juice:crit', (payload: { intensity: number }) => {
      soundEngine.playCrit();
      engineRef.current?.triggerHitStop(55);
      engineRef.current?.addScreenShake(0.38 * (payload.intensity || 1));
    });

    sock.on('juice:boski_drop', (payload: { itemName: string; rarity?: Rarity }) => {
      const isImmortal = payload.rarity === 'niesmiertelny';
      soundEngine.playLootDrop(isImmortal ? 'niesmiertelny' : 'boski');
      engineRef.current?.triggerBoskiSlowMo(1350);
      setBoskiFlashKey((k) => k + 1);
      showBanner(
        'boski',
        isImmortal
          ? `💎 NIEŚMIERTELNY DROP! (5% HARDCORE) 💎`
          : `✨ BOSKI DROP! (0.5% SZANSY) ✨`,
        isImmortal
          ? `Wypadł artefakt Nieśmiertelny (+50% DEF i wartości): ${payload.itemName}!`
          : `Wypadł legendarny artefakt: ${payload.itemName}!`,
        5600
      );
    });

    sock.on(
      'juice:perfect_dodge',
      (payload: { buffMs: number; cooldowns?: { active1: number; active2: number; active3: number } }) => {
        soundEngine.playPerfectDodge();
        engineRef.current?.triggerHitStop(75);
        engineRef.current?.addScreenShake(0.28);
        setPerfectDodgeFlashKey((k) => k + 1);
        if (payload.cooldowns) {
          const now = Date.now();
          setSkillCooldowns({
            active1: payload.cooldowns.active1 > 0 ? now + payload.cooldowns.active1 : 0,
            active2: payload.cooldowns.active2 > 0 ? now + payload.cooldowns.active2 : 0,
            active3: payload.cooldowns.active3 > 0 ? now + payload.cooldowns.active3 : 0,
          });
        }
        setProfile((prev) => ({
          ...prev,
          perfectDodgesTotal: (prev.perfectDodgesTotal || 0) + 1,
        }));
        advanceBounty('perfect_dodge', 1, 'add');
        pushToast('⚡ PERFEKCYJNY UNIK! +25% DMG (3s) • -2s Cooldownów!', '#fde047');
      }
    );

    sock.on('juice:goblin_laugh', () => {
      soundEngine.playGoblinLaugh();
      pushToast('💰 Hi-hi-hi! Pojawił się Goblin Skarbnik! Masz 20s!', '#fde047');
    });

    sock.on('player:revive_credit', (payload: { allyName: string }) => {
      soundEngine.playHeal();
      setProfile((prev) => ({
        ...prev,
        totalRevives: (prev.totalRevives || 0) + 1,
      }));
      pushToast(`👼 Wskrzeszono sojusznika: ${payload.allyName}!`, '#4ade80');
    });

    sock.on('prestige:flawless_act4_quad', () => {
      soundEngine.playLootDrop('niesmiertelny');
      setProfile((prev) => ({ ...prev, noDownAct4QuadCleared: true }));
      showBanner(
        'boski',
        '🌈 PRESTIŻ ODBLOKOWANY: ŚLAD NIEPOKONANYCH!',
        '4× Co-op Akt 4 bez ani jednego powalenia! Załóż tęczowy ślad w [P] Prestiż!',
        5800
      );
    });

    sock.on('rift:leaderboard', (data: RiftLeaderboardMap) => {
      if (data && typeof data === 'object') setRiftLeaderboard(data);
    });

    sock.on('rift:floor_cleared', (payload: { floor: number; clearTimeMs: number; partySize: number }) => {
      soundEngine.playLevelUp();
      setProfile((prev) => ({
        ...prev,
        bestRiftFloor: Math.max(prev.bestRiftFloor || 0, payload.floor || 0),
      }));
    });

    sock.on(
      'camp:station_interact',
      (payload: { kind: 'blacksmith' | 'runes' | 'trade' | 'portal' | 'rift' | 'prestige' }) => {
        soundEngine.playPuzzleTick();
        if (payload.kind === 'blacksmith') setActivePanel('blacksmith');
        else if (payload.kind === 'runes') setActivePanel('runes');
        else if (payload.kind === 'prestige') setActivePanel('prestige');
        else if (payload.kind === 'portal') setActivePanel('worldmap');
        else if (payload.kind === 'rift') {
          sock.emit('rift:get_leaderboard');
          setActivePanel('rift');
        } else if (payload.kind === 'trade') {
          const other = roomRef.current?.members.find((m) => m.id !== sock.id);
          if (other) {
            sock.emit('trade:request', { targetId: other.id });
            pushToast(`🤝 Wysłano zaproszenie do handlu: ${other.name}`, '#fde047');
          } else {
            pushToast('🤝 Strefa Handlu: Zaproś znajomego do Obozu 3D, aby się wymieniać!', '#38bdf8');
          }
        }
      }
    );

    sock.on(
      'loot:granted',
      (payload: { item?: EquipmentItem; runeShard?: RuneId; shardDrop?: { rarity: Rarity; amount: number } }) => {
        if (payload.item) {
          const it = payload.item;
          soundEngine.playLootDrop(it.rarity);
          pushToast(`+${RARITY_META[it.rarity].name}: ${it.name}`, RARITY_META[it.rarity].color);
          setProfile((prev) => ({
            ...prev,
            inventory: [it, ...prev.inventory].slice(0, 60),
          }));
          advanceBounty('loot', 1, 'add');
        }
        if (payload.runeShard) {
          const rid = payload.runeShard;
          const rDef = RUNES[rid];
          soundEngine.playRuneUpgrade();
          pushToast(`💠 Zdobyto ${rDef.shardName}!`, rDef.color);
          setProfile((prev) => ({
            ...prev,
            runeShards: {
              ...prev.runeShards,
              [rid]: (prev.runeShards[rid] || 0) + 1,
            },
          }));
        }
        if (payload.shardDrop && payload.shardDrop.amount > 0) {
          const { rarity, amount } = payload.shardDrop;
          const meta = RARITY_META[rarity];
          soundEngine.playPuzzleTick();
          pushToast(`💎 +${amount} × ${meta.shardName}`, meta.color);
          setProfile((prev) => ({
            ...prev,
            shards: {
              ...prev.shards,
              [rarity]: (prev.shards[rarity] || 0) + amount,
            },
          }));
        }
      }
    );

    sock.on('player:xp_gain', (payload: { amount: number }) => {
      grantXp(payload.amount);
    });

    sock.on('boss:defeated', (payload: { act: ActNumber; globalLocation: number; bossName: string }) => {
      const todayKey = getTodayDateKey();
      const prev = profileRef.current;
      const hadAct = (prev.defeatedActBosses || []).includes(payload.act);
      const hadDaily = prev.dailyActClearedDate === todayKey;

      setProfile((p) => {
        const curDefeated = p.defeatedActBosses || [];
        return {
          ...p,
          defeatedActBosses: curDefeated.includes(payload.act) ? curDefeated : [...curDefeated, payload.act],
          dailyActClearedDate: todayKey,
        };
      });

      if (!hadAct) {
        pushToast(
          `📜 Misja Główna Aktu ${payload.act} ukończona! Odbierz 1× Runę + 6L + 8M w [J] Misje!`,
          '#fde047'
        );
      }
      if (!hadDaily) {
        pushToast(
          `☀️ Misja Dzienna (Przejście Aktu) ukończona! Odbierz 2× Leg + 1× Boski w [J] Misje!`,
          '#fb7185'
        );
      }
      if ((roomRef.current?.members.length || 1) >= 2) {
        advanceBounty('coop_boss', 1, 'add');
      }
    });

    sock.on('location:full_clear', (payload: { globalLocation: number; locationName: string }) => {
      const prev = profileRef.current;
      const alreadyCleared = (prev.fullClearedLocations || []).includes(payload.globalLocation);
      if (!alreadyCleared) {
        setProfile((p) => {
          const cur = p.fullClearedLocations || [];
          if (cur.includes(payload.globalLocation)) return p;
          return { ...p, fullClearedLocations: [...cur, payload.globalLocation] };
        });
        soundEngine.playPuzzleSolve();
        pushToast(
          `🗺️ 100% lokacji „${payload.locationName}” wyczyszczone! Odbierz 2M + 1L w [J] Misje!`,
          '#38bdf8'
        );
      }
    });

    sock.on(
      'location:completed',
      (payload: {
        globalLocation: number;
        clearXp: number;
        locationName?: string;
        act?: ActNumber;
        isMainBoss?: boolean;
        allEnemiesCleared?: boolean;
        enemiesSlain?: number;
        maxCombo?: number;
        chestsOpened?: number;
        totalChests?: number;
        secretsFound?: number;
        totalSecrets?: number;
        grade?: 'S' | 'A' | 'B';
        mvpCards?: MvpCard[];
        mentorShardsEarned?: number;
      }) => {
        const todayKey = getTodayDateKey();
        const featured = getDailyFeaturedLocation();
        const isFeaturedBonus =
          payload.globalLocation === featured.globalLocation &&
          profileRef.current.dailyFeaturedClaimedDate !== todayKey;
        const mentorBonus = payload.mentorShardsEarned || 0;

        const finalClearXp = isFeaturedBonus ? payload.clearXp * 2 : payload.clearXp;
        grantXp(finalClearXp);
        advanceBounty('clear', 1, 'add');
        soundEngine.playLevelUp();

        if (isFeaturedBonus) {
          pushToast(
            `🔥 WYPRAWA DNIA UKOŃCZONA! 2× XP (+${finalClearXp}) + 2× Legendarny & 3× Mityczny Odłamek!`,
            '#fb923c'
          );
        }
        if (mentorBonus > 0) {
          pushToast(
            `🎓 NAGRODA MENTORA: +${mentorBonus} Odłamków Mentora! Wymień je u Kowala [B]!`,
            '#38bdf8'
          );
        }

        setProfile((prev) => {
          const nextShards = { ...prev.shards };
          if (isFeaturedBonus) {
            nextShards.legendarny = (nextShards.legendarny || 0) + 2;
            nextShards.mityczny = (nextShards.mityczny || 0) + 3;
          }
          const curFull = prev.fullClearedLocations || [];
          const nextFull =
            payload.allEnemiesCleared && !curFull.includes(payload.globalLocation)
              ? [...curFull, payload.globalLocation]
              : curFull;
          const curBosses = prev.defeatedActBosses || [];
          const nextBosses =
            payload.isMainBoss && payload.act && !curBosses.includes(payload.act)
              ? [...curBosses, payload.act]
              : curBosses;
          return {
            ...prev,
            shards: nextShards,
            mentorShards: (prev.mentorShards || 0) + mentorBonus,
            fullClearedLocations: nextFull,
            defeatedActBosses: nextBosses,
            dailyActClearedDate: payload.isMainBoss ? todayKey : prev.dailyActClearedDate,
            dailyFeaturedClaimedDate: isFeaturedBonus ? todayKey : prev.dailyFeaturedClaimedDate,
            unlockedLocationGlobal: Math.min(
              TOTAL_LOCATIONS,
              Math.max(prev.unlockedLocationGlobal, payload.globalLocation + 1)
            ),
            completedLocations: prev.completedLocations.includes(payload.globalLocation)
              ? prev.completedLocations
              : [...prev.completedLocations, payload.globalLocation],
          };
        });

        const summary: VictorySummaryData = {
          locationName: payload.locationName || `Lokacja #${payload.globalLocation}`,
          globalLocation: payload.globalLocation,
          clearXp: finalClearXp,
          enemiesSlain: payload.enemiesSlain ?? 0,
          maxCombo: payload.maxCombo ?? 0,
          chestsOpened: payload.chestsOpened ?? 0,
          totalChests: payload.totalChests ?? 0,
          secretsFound: payload.secretsFound ?? 0,
          totalSecrets: payload.totalSecrets ?? 0,
          grade: payload.grade ?? 'A',
          mvpCards: payload.mvpCards,
          mentorShardsEarned: mentorBonus,
        };
        setVictorySummary(summary);
        if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);
        victoryTimerRef.current = window.setTimeout(() => {
          setVictorySummary(null);
        }, 12500);
      }
    );

    sock.on('chest:open_modal', (chest: LockedChestState) => {
      setActiveChest(chest);
    });

    sock.on('boon:offer', (payload: { title: string; choices: BoonId[] }) => {
      setBoonOffer(payload);
      soundEngine.playLevelUp();
    });

    sock.on(
      'hades:boon_offer',
      (payload: { title: string; choices: Array<{ kind: 'elemental' | 'duo'; id: string; rarity?: BoonRarity }> }) => {
        setCharonOpen(null);
        setHadesOffer({ mode: 'elemental', title: payload.title, choices: payload.choices });
        soundEngine.playLevelUp();
      }
    );

    sock.on('hades:evolution_offer', (payload: { title: string; choices: string[] }) => {
      setCharonOpen(null);
      setHadesOffer({ mode: 'evolution', title: payload.title, choices: payload.choices });
      soundEngine.playLevelUp();
    });

    sock.on('charon:open', (payload: { runEssence: number; purchasedIds: string[] }) => {
      setCharonOpen(payload);
      soundEngine.playPuzzleTick();
    });

    sock.on('juice:wall_slam', () => {
      soundEngine.playWallSlam();
      engineRef.current?.addScreenShake(0.32);
    });

    sock.on('juice:armor_break', () => {
      soundEngine.playArmorBreak();
      engineRef.current?.triggerHitStop(55);
      engineRef.current?.addScreenShake(0.28);
    });

    sock.on('juice:ultimate', (payload: { isTeam?: boolean }) => {
      soundEngine.playUltimate(!!payload?.isTeam);
      engineRef.current?.triggerHitStop(85);
      engineRef.current?.addScreenShake(payload?.isTeam ? 0.65 : 0.45);
    });

    sock.on('juice:boss_phase', () => {
      soundEngine.playBossPhase();
      engineRef.current?.addScreenShake(0.45);
    });

    sock.on('juice:merchant_buy', (payload: { itemId: string }) => {
      soundEngine.playMerchantBuy();
      setCharonOpen((prev) =>
        prev ? { ...prev, purchasedIds: [...prev.purchasedIds, payload.itemId] } : null
      );
    });

    sock.on('game:banner', (payload: { type: BannerMessage['type']; title: string; subtitle?: string }) => {
      showBanner(payload.type, payload.title, payload.subtitle, 4200);
    });

    // Trade socket listeners
    sock.on('trade:incoming', (session: TradeSessionState) => {
      setIncomingTrade(session);
      soundEngine.playPuzzleTick();
    });

    sock.on('trade:state', (session: TradeSessionState) => {
      if (session.status === 'cancelled') {
        setActiveTrade(null);
        setIncomingTrade(null);
        pushToast('Handel został anulowany.', '#f87171');
      } else {
        setIncomingTrade(null);
        setActiveTrade(session);
      }
    });

    sock.on(
      'trade:completed',
      (payload: { givenIds: string[]; receivedItems: EquipmentItem[] }) => {
        setActiveTrade(null);
        soundEngine.playPuzzleSolve();
        pushToast('🤝 Wymiana zakończona pomyślnie!', '#4ade80');
        setProfile((prev) => {
          const givenSet = new Set(payload.givenIds);
          const kept = prev.inventory.filter((i) => !givenSet.has(i.id));
          return {
            ...prev,
            inventory: [...payload.receivedItems, ...kept].slice(0, 60),
          };
        });
      }
    );

    return () => {
      sock.disconnect();
    };
  }, [advanceBounty, grantXp, pushToast, serverUrl, showBanner]);

  // Mount Three.js GameEngine when entering game
  useEffect(() => {
    if (!inGame || !canvasHostRef.current) return;

    const engine = new GameEngine(canvasHostRef.current, localPlayerId, {
      onMove: (dx, dz, rotY) => {
        socketRef.current?.emit('player:move', { dx, dz, rotY });
      },
      onAttack: (aimX, aimZ) => {
        socketRef.current?.emit('player:attack', { aimX, aimZ });
      },
      onSkill: (slot, aimX, aimZ) => {
        const now = Date.now();
        const cur = profileRef.current;
        const cls = CLASSES[cur.classId];
        const sk = cls.actives.find((a) => a.slot === slot);
        if (sk) {
          const stats = computePlayerStats(
            cur.classId,
            cur.level,
            cur.equipped,
            cur.skillRanks,
            cur.runes,
            0,
            guildRef.current?.upgrades
          );
          const cdMs = Math.round(sk.cooldown * 1000 * (1 - stats.cdr / 100));
          setSkillCooldowns((prev) => (now < prev[slot] ? prev : { ...prev, [slot]: now + cdMs }));
        }
        socketRef.current?.emit('player:skill', { slot, aimX, aimZ });
      },
      onDash: (dirX, dirZ) => {
        socketRef.current?.emit('player:dash', { dirX, dirZ });
      },
      onPotion: () => {
        socketRef.current?.emit('player:potion');
      },
      onUltimate: () => {
        socketRef.current?.emit('player:ultimate');
      },
      onInteract: () => {
        socketRef.current?.emit('world:interact');
      },
      onReviveHold: () => {
        socketRef.current?.emit('player:revive_hold');
      },
      onAutoPickupLoot: (lootId) => {
        socketRef.current?.emit('loot:pickup', { lootId });
      },
      onFloatingTexts: (newTexts) => {
        setFloatingTexts((prev) => [...prev.slice(-28), ...newTexts]);
        window.setTimeout(() => {
          const removeIds = new Set(newTexts.map((t) => t.id));
          setFloatingTexts((prev) => prev.filter((t) => !removeIds.has(t.id)));
        }, 950);
      },
      onInteractHint: (hint) => {
        setInteractHint(hint);
      },
    });
    engineRef.current = engine;

    if (mapData) {
      engine.loadMap(mapData);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inGame]);

  // Block game input when any modal is open
  useEffect(() => {
    engineRef.current?.setUiBlocked(Boolean(activePanel || activeChest || activeTrade || charonOpen));
  }, [activePanel, activeChest, activeTrade, charonOpen]);

  // Panel hotkeys (I, K, B, U, M, Escape)
  useEffect(() => {
    if (!inGame) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        setActivePanel(null);
        setActiveChest(null);
        return;
      }
      if (activeChest || activeTrade) return;
      if (k === 'i') setActivePanel((p) => (p === 'inventory' ? null : 'inventory'));
      else if (k === 'k') setActivePanel((p) => (p === 'skills' ? null : 'skills'));
      else if (k === 'b') setActivePanel((p) => (p === 'blacksmith' ? null : 'blacksmith'));
      else if (k === 'u') setActivePanel((p) => (p === 'runes' ? null : 'runes'));
      else if (k === 'm') setActivePanel((p) => (p === 'worldmap' ? null : 'worldmap'));
      else if (k === 'j') setActivePanel((p) => (p === 'bounties' ? null : 'bounties'));
      else if (k === 'g') setActivePanel((p) => (p === 'guild' ? null : 'guild'));
      else if (k === 'r') {
        socketRef.current?.emit('rift:get_leaderboard');
        setActivePanel((p) => (p === 'rift' ? null : 'rift'));
      } else if (k === 'p') setActivePanel((p) => (p === 'prestige' ? null : 'prestige'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inGame, activeChest, activeTrade]);

  // Refresh HUD cooldown timers smoothly
  useEffect(() => {
    if (!inGame) return;
    const t = window.setInterval(() => {
      setSkillCooldowns((c) => ({ ...c }));
    }, 120);
    return () => window.clearInterval(t);
  }, [inGame]);

  // ==========================================
  // PLAYER PROFILE & LOBBY HANDLERS
  // ==========================================
  const buildNetPayload = (p: PlayerProfile, globalLocation?: number) => ({
    name: guildRef.current ? `[${guildRef.current.tag}] ${p.name}` : p.name,
    classId: p.classId,
    level: p.level,
    skillRanks: p.skillRanks,
    equippedTitle: p.equippedTitle ?? null,
    equippedAura: p.equippedAura ?? null,
    equippedTrail: p.equippedTrail ?? null,
    stats: computePlayerStats(
      p.classId,
      p.level,
      p.equipped,
      p.skillRanks,
      p.runes,
      0,
      guildRef.current?.upgrades
    ),
    globalLocation,
  });

  const handleEnterCamp = () => {
    setErrorMsg(null);
    setActivePanel(null);
    if (roomRef.current) {
      socketRef.current?.emit('camp:enter');
      return;
    }
    socketRef.current?.emit(
      'room:create',
      buildNetPayload(profileRef.current, CAMP_LOCATION_INDEX),
      (res: { ok: boolean; summary?: RoomSummary; error?: string }) => {
        if (!res.ok) {
          setErrorMsg(res.error || 'Nie udało się wejść do Obozu 3D');
        } else if (res.summary) {
          setRoom(res.summary);
          socketRef.current?.emit('camp:enter');
        }
      }
    );
  };

  const handleTogglePactCurse = (curseId: string) => {
    setActivePactCurses((prev) => {
      const next = prev.includes(curseId) ? prev.filter((id) => id !== curseId) : [...prev, curseId];
      if (roomRef.current) {
        socketRef.current?.emit('pact:set_curses', { curses: next });
      }
      return next;
    });
  };

  const handleStartRift = (floor: number) => {
    setErrorMsg(null);
    setActivePanel(null);
    const curses = activePactCursesRef.current;
    if (roomRef.current) {
      if (curses.length > 0) socketRef.current?.emit('pact:set_curses', { curses });
      socketRef.current?.emit('rift:start', { floor });
      return;
    }
    socketRef.current?.emit(
      'room:create',
      buildNetPayload(profileRef.current, 60),
      (res: { ok: boolean; summary?: RoomSummary; error?: string }) => {
        if (!res.ok) {
          setErrorMsg(res.error || 'Nie udało się otworzyć Szczeliny Chaosu');
        } else if (res.summary) {
          setRoom(res.summary);
          if (curses.length > 0) socketRef.current?.emit('pact:set_curses', { curses });
          socketRef.current?.emit('rift:start', { floor });
        }
      }
    );
  };

  const handleExchangeMentorShards = (targetRarity: Rarity, mentorCost: number, grantAmount: number) => {
    const cur = profileRef.current;
    if ((cur.mentorShards || 0) < mentorCost) return;
    const meta = RARITY_META[targetRarity];
    soundEngine.playRuneUpgrade();
    setProfile((prev) => {
      if ((prev.mentorShards || 0) < mentorCost) return prev;
      return {
        ...prev,
        mentorShards: (prev.mentorShards || 0) - mentorCost,
        shards: {
          ...prev.shards,
          [targetRarity]: (prev.shards[targetRarity] || 0) + grantAmount,
        },
      };
    });
    pushToast(`🎓 Wymieniono ${mentorCost} Odł. Mentora ➔ +${grantAmount} × ${meta.shardName}!`, meta.color);
  };

  const handleTransmuteShards = (fromRarity: Rarity, toRarity: Rarity, count: number) => {
    const ratio = transmutationConfig.transmutationRatio || 30;
    const cur = profileRef.current;
    const owned = cur.shards[fromRarity] || 0;
    const actual = Math.min(Math.max(0, Math.floor(count)), Math.floor(owned / ratio));
    if (actual <= 0) return;

    const spent = actual * ratio;
    const toMeta = RARITY_META[toRarity];
    setProfile((prev) => {
      const curOwned = prev.shards[fromRarity] || 0;
      const safeActual = Math.min(actual, Math.floor(curOwned / ratio));
      if (safeActual <= 0) return prev;
      return {
        ...prev,
        shards: {
          ...prev.shards,
          [fromRarity]: curOwned - safeActual * ratio,
          [toRarity]: (prev.shards[toRarity] || 0) + safeActual,
        },
      };
    });
    pushToast(
      `⚗️ Przemiana (${spent}➔${actual}): +${actual} × ${toMeta.shardName}!`,
      toMeta.color
    );
  };

  const handleEquipCosmetic = (slot: CosmeticSlot, id: string | null) => {
    soundEngine.playPuzzleTick();
    setProfile((prev) => ({
      ...prev,
      equippedTitle: slot === 'title' ? id : prev.equippedTitle,
      equippedAura: slot === 'aura' ? id : prev.equippedAura,
      equippedTrail: slot === 'trail' ? id : prev.equippedTrail,
    }));
    pushToast(id ? '👑 Założono kosmetyk Prestiżu (widoczny dla drużyny w 3D)!' : '👑 Zdjęto kosmetyk Prestiżu.', '#fde047');
  };

  const handleCreateGuild = (
    name: string,
    tag: string,
    emblem: string,
    color: string
  ): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        resolve({ ok: false, error: 'Brak połączenia z serwerem.' });
        return;
      }
      sock.emit('guild:create', { name, tag, emblem, color }, (res: { ok: boolean; error?: string }) => {
        resolve(res || { ok: false, error: 'Błąd tworzenia Gildii.' });
      });
    });

  const handleJoinGuildByCode = (code: string): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        resolve({ ok: false, error: 'Brak połączenia z serwerem.' });
        return;
      }
      sock.emit('guild:join_code', { code }, (res: { ok: boolean; error?: string }) => {
        resolve(res || { ok: false, error: 'Nie znaleziono Gildii.' });
      });
    });

  const handleInviteRoomMember = (targetSocketId: string): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        resolve({ ok: false, error: 'Brak połączenia z serwerem.' });
        return;
      }
      sock.emit('guild:invite_player', { targetSocketId }, (res: { ok: boolean; error?: string }) => {
        resolve(res || { ok: false, error: 'Nie udało się zaprosić gracza.' });
      });
    });

  const handleLeaveGuild = (): Promise<void> =>
    new Promise((resolve) => {
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        setGuild(null);
        resolve();
        return;
      }
      sock.emit('guild:leave', () => resolve());
    });

  const handleUpgradeGuild = (upgradeId: GuildUpgradeId): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        resolve({ ok: false, error: 'Brak połączenia z serwerem.' });
        return;
      }
      sock.emit('guild:upgrade', { upgradeId }, (res: { ok: boolean; error?: string }) => {
        resolve(res || { ok: false, error: 'Nie udało się ulepszyć Gildii.' });
      });
    });

  const handleStartGuildAct = (globalLocation: number) => {
    if (room) {
      if (inGame) {
        handleSelectLocation(globalLocation);
      } else {
        handleStartGame(globalLocation);
      }
    } else {
      setErrorMsg(null);
      socketRef.current?.emit(
        'room:create',
        buildNetPayload(profileRef.current, globalLocation),
        (res: { ok: boolean; summary?: RoomSummary; error?: string }) => {
          if (!res.ok) {
            setErrorMsg(res.error || 'Nie udało się uruchomić Aktu Gildyjnego');
            pushToast(`🏰 ${res.error || 'Błąd Aktu Gildyjnego'}`, '#f87171');
          } else if (res.summary) {
            setRoom(res.summary);
            socketRef.current?.emit('room:start', { globalLocation });
          }
        }
      );
    }
  };

  const handleUpdateHero = (name: string, classId: ClassId) => {
    setProfile((prev) => {
      if (prev.classId === classId) return { ...prev, name };
      // Move any equipped gear belonging to the previous class cleanly into the backpack!
      const nextEquipped = { ...prev.equipped };
      const nextInventory = [...prev.inventory];
      for (const s of EQUIP_SLOTS) {
        const it = nextEquipped[s];
        if (it && !canClassEquipItem(it, classId)) {
          nextEquipped[s] = null;
          if (nextInventory.length < 60) nextInventory.unshift(it);
        }
      }
      return { ...prev, name, classId, equipped: nextEquipped, inventory: nextInventory };
    });
  };

  const handleCreateRoom = (globalLocation: number) => {
    setErrorMsg(null);
    socketRef.current?.emit(
      'room:create',
      buildNetPayload(profile, globalLocation),
      (res: { ok: boolean; summary?: RoomSummary; error?: string }) => {
        if (!res.ok) setErrorMsg(res.error || 'Błąd tworzenia pokoju');
        else if (res.summary) setRoom(res.summary);
      }
    );
  };

  const handleJoinRoom = (code: string) => {
    setErrorMsg(null);
    socketRef.current?.emit(
      'room:join',
      { ...buildNetPayload(profile), code },
      (res: { ok: boolean; summary?: RoomSummary; error?: string }) => {
        if (!res.ok) setErrorMsg(res.error || 'Nie udało się dołączyć');
        else if (res.summary) setRoom(res.summary);
      }
    );
  };

  const handleSelectLocation = (globalLocation: number) => {
    socketRef.current?.emit('room:select_location', { globalLocation });
  };

  const handleStartGame = (globalLocation: number) => {
    socketRef.current?.emit('room:start', { globalLocation });
  };

  const handleEquip = (item: EquipmentItem) => {
    if (!canClassEquipItem(item, profileRef.current.classId)) {
      const reqName = item.classAffinity ? CLASSES[item.classAffinity].name : 'innej klasy';
      soundEngine.playPuzzleFail();
      pushToast(`🔒 Tylko dla klasy: ${reqName}! (Użyj Handlu lub Rozbierz)`, '#f87171');
      return;
    }
    soundEngine.playPuzzleTick();
    setProfile((prev) => {
      if (!canClassEquipItem(item, prev.classId)) return prev;
      const currentlyEquipped = prev.equipped[item.slot];
      const nextInv = prev.inventory.filter((i) => i.id !== item.id);
      if (currentlyEquipped) nextInv.unshift(currentlyEquipped);
      return {
        ...prev,
        equipped: { ...prev.equipped, [item.slot]: item },
        inventory: nextInv,
      };
    });
  };

  const handleUnequip = (slot: EquipSlot) => {
    setProfile((prev) => {
      const it = prev.equipped[slot];
      if (!it || prev.inventory.length >= 60) return prev;
      return {
        ...prev,
        equipped: { ...prev.equipped, [slot]: null },
        inventory: [it, ...prev.inventory],
      };
    });
  };

  const handleSalvageItem = (itemId: string) => {
    const target = profileRef.current.inventory.find((i) => i.id === itemId);
    if (!target) return;
    soundEngine.playAnvilStrike(1);
    const salvageMult = 1 + (getDailyBlessing().salvageBonusPct || 0) / 100;
    const gained = Math.max(1, Math.round(getSalvageShardYield(target) * salvageMult));
    setProfile((prev) => {
      if (!prev.inventory.some((i) => i.id === itemId)) return prev;
      return {
        ...prev,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
        shards: {
          ...prev.shards,
          [target.rarity]: (prev.shards[target.rarity] || 0) + gained,
        },
      };
    });
    pushToast(`+${gained} × ${RARITY_META[target.rarity].shardName}`, RARITY_META[target.rarity].color);
    advanceBounty('salvage', 1, 'add');
  };

  const handleBulkSalvage = (rarity: Rarity) => {
    const matching = profileRef.current.inventory.filter((i) => i.rarity === rarity);
    if (matching.length === 0) return;
    soundEngine.playAnvilStrike(3);
    const salvageMult = 1 + (getDailyBlessing().salvageBonusPct || 0) / 100;
    let gained = 0;
    for (const it of matching) {
      gained += Math.max(1, Math.round(getSalvageShardYield(it) * salvageMult));
    }
    setProfile((prev) => {
      const kept = prev.inventory.filter((it) => it.rarity !== rarity);
      return {
        ...prev,
        inventory: kept,
        shards: {
          ...prev.shards,
          [rarity]: (prev.shards[rarity] || 0) + gained,
        },
      };
    });
    pushToast(`Rozebrano ${matching.length}×! +${gained} × ${RARITY_META[rarity].shardName}`, RARITY_META[rarity].color);
    advanceBounty('salvage', matching.length, 'add');
  };

  const handleUpgradeSkill = (slot: keyof SkillRanks) => {
    soundEngine.playPuzzleTick();
    setProfile((prev) => {
      if (prev.skillPoints <= 0) return prev;
      const cur = prev.skillRanks[slot] || 0;
      if (cur >= MAX_SKILL_RANK) return prev;
      return {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        skillRanks: { ...prev.skillRanks, [slot]: cur + 1 },
      };
    });
  };

  const handleUpgradeItem = (
    itemId: string
  ): { success: boolean; newLevel: number; chancePct: number } | null => {
    const cur = profileRef.current;
    let target: EquipmentItem | null = null;
    let eqSlot: EquipSlot | null = null;
    for (const s of EQUIP_SLOTS) {
      if (cur.equipped[s]?.id === itemId) {
        target = cur.equipped[s];
        eqSlot = s;
        break;
      }
    }
    if (!target) {
      target = cur.inventory.find((i) => i.id === itemId) ?? null;
    }
    const maxAllowed = getMaxUpgradeLevel(isHardcoreUnlocked(cur));
    if (!target || target.upgradeLevel >= maxAllowed) return null;
    const cost = getUpgradeShardCost(target.upgradeLevel);
    if ((cur.shards[target.rarity] || 0) < cost) return null;

    const blessingForgeBonus = getDailyBlessing().upgradeChanceBonus || 0;
    const chancePct = Math.min(95, getUpgradeSuccessChance(target.upgradeLevel) + blessingForgeBonus);
    const success = Math.random() * 100 < chancePct;
    const newLevel = success ? target.upgradeLevel + 1 : target.upgradeLevel;

    setProfile((prev) => {
      const nextShards = {
        ...prev.shards,
        [target!.rarity]: Math.max(0, (prev.shards[target!.rarity] || 0) - cost),
      };
      if (!success) {
        return { ...prev, shards: nextShards };
      }
      const updated: EquipmentItem = { ...target!, upgradeLevel: newLevel };
      if (eqSlot) {
        return {
          ...prev,
          shards: nextShards,
          equipped: { ...prev.equipped, [eqSlot]: updated },
        };
      }
      return {
        ...prev,
        shards: nextShards,
        inventory: prev.inventory.map((i) => (i.id === itemId ? updated : i)),
      };
    });

    if (success) {
      advanceBounty('upgrade', 1, 'add');
    }

    if (success && (newLevel === MAX_UPGRADE_LEVEL || newLevel >= MAX_UPGRADE_LEVEL_HARDCORE)) {
      const bonusClass = target.classAffinity ?? cur.classId;
      const p13 = getPlus13ClassBonus(bonusClass);
      soundEngine.playLevelUp();
      showBanner(
        'boski',
        newLevel >= MAX_UPGRADE_LEVEL_HARDCORE
          ? `💎 NIEŚMIERTELNA PERFEKCJA +20 ODBLOKOWANA!`
          : `👑 MISTRZOWSKIE +13 ODBLOKOWANE!`,
        newLevel >= MAX_UPGRADE_LEVEL_HARDCORE
          ? `${p13.icon} 1.5× ${p13.title}: ${p13.summary}`
          : `${p13.icon} ${p13.title}: ${p13.summary}`,
        5200
      );
    }

    return { success, newLevel, chancePct };
  };

  const handleUpgradeRune = (runeId: RuneId) => {
    setProfile((prev) => {
      const curLvl = prev.runes[runeId] || 0;
      const shards = prev.runeShards[runeId] || 0;
      if (curLvl >= RUNE_MAX_LEVEL || shards < 1) return prev;
      return {
        ...prev,
        runes: { ...prev.runes, [runeId]: curLvl + 1 },
        runeShards: { ...prev.runeShards, [runeId]: shards - 1 },
      };
    });
  };

  const handleToggleSandbox = () => {
    setProfile((prev) => ({ ...prev, sandboxUnlockAll: !prev.sandboxUnlockAll }));
  };

  const handleClaimDaily = () => {
    const cur = profileRef.current;
    if (!canClaimDailyReward(cur.lastDailyClaimDate)) return;
    const dayNum = getNextDailyDay(cur.dailyStreak, cur.lastDailyClaimDate);
    const rew = DAILY_REWARDS[dayNum - 1] || DAILY_REWARDS[0];
    const todayKey = getTodayDateKey();

    let bonusItem: EquipmentItem | null = null;
    if (rew.itemRarity) {
      bonusItem = generateEquipmentItem(
        Math.max(1, cur.level),
        rew.itemRarity,
        undefined,
        cur.classId
      );
    }

    setProfile((prev) => {
      const nextShards = { ...prev.shards };
      if (rew.shards) {
        for (const [rKey, amt] of Object.entries(rew.shards)) {
          if (amt && amt > 0) {
            nextShards[rKey as Rarity] = (nextShards[rKey as Rarity] || 0) + amt;
          }
        }
      }
      return {
        ...prev,
        dailyStreak: dayNum,
        lastDailyClaimDate: todayKey,
        shards: nextShards,
        inventory: bonusItem ? [bonusItem, ...prev.inventory].slice(0, 60) : prev.inventory,
      };
    });

    grantXp(rew.xp);
    soundEngine.playLevelUp();
    pushToast(`🎁 Odebrano Nagrodę Dnia ${dayNum}/7! (${rew.summary})`, '#fde047');
    if (bonusItem) {
      pushToast(`✨ Otrzymano: ${bonusItem.name}!`, RARITY_META[bonusItem.rarity].color);
    }
  };

  const handleClaimBounty = (slotIndex: number) => {
    const cur = profileRef.current;
    const list = ensureActiveBounties(cur.bounties);
    const entry = list[slotIndex];
    if (!entry) return;
    const def = BOUNTY_BY_ID[entry.defId];
    if (!def || entry.progress < def.target) return;

    let bonusItem: EquipmentItem | null = null;
    if (def.rewardItemRarity) {
      bonusItem = generateEquipmentItem(
        Math.max(1, cur.level),
        def.rewardItemRarity,
        undefined,
        cur.classId
      );
    }

    setProfile((prev) => {
      const activeList = ensureActiveBounties(prev.bounties);
      const nextShards = { ...prev.shards };
      if (def.rewardShards) {
        for (const [rKey, amt] of Object.entries(def.rewardShards)) {
          if (amt && amt > 0) {
            nextShards[rKey as Rarity] = (nextShards[rKey as Rarity] || 0) + amt;
          }
        }
      }
      const existingIds = activeList.map((b) => b.defId);
      const nextBounties = activeList.map((b, i) =>
        i === slotIndex ? rollReplacementBounty(existingIds) : b
      );
      return {
        ...prev,
        shards: nextShards,
        bounties: nextBounties,
        inventory: bonusItem ? [bonusItem, ...prev.inventory].slice(0, 60) : prev.inventory,
      };
    });

    grantXp(def.rewardXp);
    soundEngine.playRuneUpgrade();
    pushToast(`🏆 Ukończono misję „${def.title}”! (+${def.rewardXp} XP)`, '#4ade80');
    if (bonusItem) {
      pushToast(`🎁 Nagroda: ${bonusItem.name}!`, RARITY_META[bonusItem.rarity].color);
    }
  };

  const handleClaimDailyAct = () => {
    const cur = profileRef.current;
    if (!isDailyActQuestReady(cur)) return;
    const todayKey = getTodayDateKey();
    setProfile((prev) => ({
      ...prev,
      dailyActClaimedDate: todayKey,
      shards: {
        ...prev.shards,
        legendarny: (prev.shards.legendarny || 0) + (DAILY_ACT_QUEST_REWARD.shards.legendarny || 0),
        boski: (prev.shards.boski || 0) + (DAILY_ACT_QUEST_REWARD.shards.boski || 0),
      },
    }));
    grantXp(DAILY_ACT_QUEST_REWARD.xp);
    soundEngine.playLootDrop('boski');
    pushToast(`☀️ Odebrano Misję Dzienną Aktu! +2 Legendarne +1 BOSKI Odłamek!`, '#fb7185');
  };

  const handleClaimMainQuest = (questId: string) => {
    const cur = profileRef.current;
    const q = MAIN_ACT_QUESTS.find((item) => item.id === questId);
    if (!q || !isMainQuestCompleted(cur, q) || isMainQuestClaimed(cur, q)) return;
    const runeDef = RUNES[q.runeId];
    setProfile((prev) => {
      const nextShards = { ...prev.shards };
      for (const [rKey, amt] of Object.entries(q.rewardShards)) {
        if (amt && amt > 0) {
          nextShards[rKey as Rarity] = (nextShards[rKey as Rarity] || 0) + amt;
        }
      }
      return {
        ...prev,
        claimedMainQuests: [...(prev.claimedMainQuests || []), q.id],
        shards: nextShards,
        runeShards: {
          ...prev.runeShards,
          [q.runeId]: (prev.runeShards[q.runeId] || 0) + 1,
        },
      };
    });
    grantXp(q.rewardXp);
    soundEngine.playLevelUp();
    pushToast(
      `📜 Misja Główna Aktu ${q.act}: +1 ${runeDef.shardName}, +6 Legendarnych, +8 Mitycznych!`,
      '#fde047'
    );
  };

  const handleClaimSideLocation = (globalLocation: number) => {
    const cur = profileRef.current;
    if (!(cur.fullClearedLocations || []).includes(globalLocation)) return;
    if ((cur.claimedSideLocations || []).includes(globalLocation)) return;
    const isHC = globalLocation > 60;
    const rew = isHC ? SIDE_LOCATION_REWARD_HC : SIDE_LOCATION_REWARD;
    setProfile((prev) => ({
      ...prev,
      claimedSideLocations: [...(prev.claimedSideLocations || []), globalLocation],
      shards: {
        ...prev.shards,
        mityczny: (prev.shards.mityczny || 0) + (rew.shards.mityczny || 0),
        legendarny: (prev.shards.legendarny || 0) + (rew.shards.legendarny || 0),
        boski: (prev.shards.boski || 0) + (rew.shards.boski || 0),
        niesmiertelny: (prev.shards.niesmiertelny || 0) + (rew.shards.niesmiertelny || 0),
      },
    }));
    grantXp(rew.xp);
    soundEngine.playRuneUpgrade();
    pushToast(
      isHC
        ? `🗺️ HC Lokacja #${globalLocation} (100%): +1 Nieśmiertelny & +2 Boskie Odłamki!`
        : `🗺️ Lokacja #${globalLocation} (100%): +2 Mityczne & +1 Legendarny Odłamek!`,
      isHC ? '#00f5d4' : '#38bdf8'
    );
  };

  const handleClaimAllSideLocations = () => {
    const cur = profileRef.current;
    const ready = getReadySideLocations(cur);
    if (ready.length === 0) return;
    let totalMythic = 0;
    let totalLeg = 0;
    let totalBoski = 0;
    let totalImmortal = 0;
    let totalXp = 0;
    for (const locIdx of ready) {
      const rew = locIdx > 60 ? SIDE_LOCATION_REWARD_HC : SIDE_LOCATION_REWARD;
      totalMythic += rew.shards.mityczny || 0;
      totalLeg += rew.shards.legendarny || 0;
      totalBoski += rew.shards.boski || 0;
      totalImmortal += rew.shards.niesmiertelny || 0;
      totalXp += rew.xp;
    }

    setProfile((prev) => ({
      ...prev,
      claimedSideLocations: Array.from(new Set([...(prev.claimedSideLocations || []), ...ready])),
      shards: {
        ...prev.shards,
        mityczny: (prev.shards.mityczny || 0) + totalMythic,
        legendarny: (prev.shards.legendarny || 0) + totalLeg,
        boski: (prev.shards.boski || 0) + totalBoski,
        niesmiertelny: (prev.shards.niesmiertelny || 0) + totalImmortal,
      },
    }));
    grantXp(totalXp);
    soundEngine.playLevelUp();
    const parts: string[] = [];
    if (totalImmortal > 0) parts.push(`+${totalImmortal} Nieśm.`);
    if (totalBoski > 0) parts.push(`+${totalBoski} Boskich`);
    if (totalLeg > 0) parts.push(`+${totalLeg} Leg.`);
    if (totalMythic > 0) parts.push(`+${totalMythic} Mit.`);
    pushToast(`🗺️ Odebrano ${ready.length} Misji Pobocznych: ${parts.join(', ')}!`, '#4ade80');
  };

  const handleSpinWheelComplete = (sliceIndex: number) => {
    const cur = profileRef.current;
    if (!canSpinDailyWheel(cur.lastWheelSpinDate)) return;
    const slice = WHEEL_SLICES[sliceIndex] || WHEEL_SLICES[0];
    const todayKey = getTodayDateKey();

    let bonusItem: EquipmentItem | null = null;
    if (slice.itemRarity) {
      bonusItem = generateEquipmentItem(Math.max(1, cur.level), slice.itemRarity, undefined, cur.classId);
    }
    const runeIds: RuneId[] = ['malakor', 'azirath', 'sylvara', 'vaelgor'];
    const rolledRuneId: RuneId | null = slice.randomRune
      ? runeIds[Math.floor(Math.random() * runeIds.length)]
      : null;

    setProfile((prev) => {
      const nextShards = { ...prev.shards };
      if (slice.shards) {
        for (const [rKey, amt] of Object.entries(slice.shards)) {
          if (amt && amt > 0) {
            nextShards[rKey as Rarity] = (nextShards[rKey as Rarity] || 0) + amt;
          }
        }
      }
      const nextRuneShards = { ...prev.runeShards };
      if (rolledRuneId) {
        nextRuneShards[rolledRuneId] = (nextRuneShards[rolledRuneId] || 0) + 1;
      }
      return {
        ...prev,
        lastWheelSpinDate: todayKey,
        shards: nextShards,
        runeShards: nextRuneShards,
        inventory: bonusItem ? [bonusItem, ...prev.inventory].slice(0, 60) : prev.inventory,
      };
    });

    if (slice.xp) grantXp(slice.xp);
    soundEngine.playLootDrop(slice.id.includes('boski') ? 'boski' : 'legendarny');
    pushToast(`🎡 Koło Fortuny: ${slice.icon} ${slice.label}`, '#fde047');
    if (bonusItem) {
      pushToast(`⚔️ Otrzymano: ${bonusItem.name}!`, RARITY_META[bonusItem.rarity].color);
    }
    if (rolledRuneId) {
      pushToast(`💠 Wylosowano: ${RUNES[rolledRuneId].shardName}!`, RUNES[rolledRuneId].color);
    }
  };

  const handleJumpToLocation = (globalLocation: number) => {
    if (room) {
      handleSelectLocation(globalLocation);
      if (!inGame) {
        handleStartGame(globalLocation);
      }
    } else {
      handleCreateRoom(globalLocation);
    }
  };

  const handleSendEmote = (text: string) => {
    const now = Date.now();
    if (now - lastEmoteAtRef.current < 1100) return;
    lastEmoteAtRef.current = now;
    socketRef.current?.emit('player:emote', { text });
    soundEngine.playPuzzleTick();
    advanceBounty('emote', 1, 'add');
  };

  const readyBountyCount = countAllReadyRewards(profile).total;

  const handleChangeServerUrl = (nextUrl: string) => {
    const cleaned = nextUrl.trim().replace(/\/+$/, '');
    try {
      if (cleaned) localStorage.setItem(SERVER_URL_KEY, cleaned);
      else localStorage.removeItem(SERVER_URL_KEY);
    } catch {
      // ignore
    }
    setErrorMsg(null);
    const bridge = getDesktopBridge();
    if (bridge?.setLiveServerUrl) {
      // In desktop client: switch live remote server directly so updates load automatically!
      bridge.setLiveServerUrl(cleaned).catch(() => {});
      return;
    }
    setServerUrl(cleaned);
  };

  const handleApplyLiveUpdate = () => {
    const bridge = getDesktopBridge();
    if (bridge?.reloadFresh) {
      bridge.reloadFresh().catch(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {updateAvailable && (
        <div
          className="comic-panel-sm"
          style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 120,
            padding: '8px 16px',
            background: 'linear-gradient(90deg, #14532d, #166534)',
            borderColor: '#4ade80',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fef08a' }}>
            ✨ NOWA AKTUALIZACJA GRY DOSTĘPNA! (Postęp bohatera jest zapisany)
          </span>
          <button
            className="comic-btn comic-btn-gold"
            onClick={handleApplyLiveUpdate}
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            🔄 Załaduj teraz
          </button>
        </div>
      )}

      {!inGame ? (
        <LobbyScreen
          profile={profile}
          guild={guild}
          room={room}
          connected={connected}
          errorMsg={errorMsg}
          initialInviteCode={initialInviteCode}
          lanUrls={lanUrls}
          serverUrl={serverUrl}
          onChangeServerUrl={handleChangeServerUrl}
          onUpdateHero={handleUpdateHero}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSelectLocation={handleSelectLocation}
          onStartGame={handleStartGame}
          onToggleSandbox={handleToggleSandbox}
          onOpenBounties={(tab) => {
            setBountiesInitialTab(tab || 'daily');
            setActivePanel('bounties');
          }}
          onOpenGuild={() => setActivePanel('guild')}
          onEnterCamp={handleEnterCamp}
          onOpenRift={() => {
            socketRef.current?.emit('rift:get_leaderboard');
            setActivePanel('rift');
          }}
          onOpenPrestige={() => setActivePanel('prestige')}
        />
      ) : (
        <>
          {/* Three.js 2.5D/3D Comic Canvas Host */}
          <div ref={canvasHostRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />

          {/* Boski Crimson-Rainbow Screen Flash */}
          {boskiFlashKey > 0 && <div key={boskiFlashKey} className="boski-screen-flash" />}

          {/* Perfect Dodge Comic Gold Flash */}
          {perfectDodgeFlashKey > 0 && (
            <div
              key={perfectDodgeFlashKey}
              className="boski-screen-flash"
              style={{
                background:
                  'radial-gradient(circle, rgba(254, 240, 138, 0.34) 0%, rgba(56, 189, 248, 0.22) 55%, transparent 78%)',
              }}
            />
          )}

          {/* Comic HUD */}
          {room && (
            <Hud
              profile={profile}
              guild={guild}
              room={room}
              localPlayerId={localPlayerId}
              mapData={mapData}
              snapshot={snapshot}
              floatingTexts={floatingTexts}
              interactHint={interactHint}
              skillCooldowns={skillCooldowns}
              muted={muted}
              currentTrack={currentTrack}
              musicVolume={musicVolume}
              readyBountyCount={readyBountyCount}
              onToggleMute={() => {
                const next = !muted;
                soundEngine.muted = next;
                musicEngine.setMuted(next);
                setMuted(next);
              }}
              onMusicVolumeChange={(v) => {
                setMusicVolume(v);
                musicEngine.setVolume(v);
              }}
              onNextTrack={() => musicEngine.nextTrackInCurrentAct()}
              onOpenPanel={(p) => {
                if (p === 'rift') socketRef.current?.emit('rift:get_leaderboard');
                setActivePanel(p);
              }}
              onCastSkill={(slot) => engineRef.current?.castSkillFromHud(slot)}
              onUsePotion={() => socketRef.current?.emit('player:potion')}
              onCastUltimate={() => socketRef.current?.emit('player:ultimate')}
              onRequestTrade={(targetId) => {
                socketRef.current?.emit('trade:request', { targetId });
              }}
              onSendEmote={handleSendEmote}
              onEnterCamp={handleEnterCamp}
              onLeaveToLobby={() => {
                socketRef.current?.emit('room:leave');
                setInGame(false);
                setRoom(null);
                setMapData(null);
                setSnapshot(null);
                setActivePanel(null);
                setBoonOffer(null);
                setVictorySummary(null);
                setActiveChest(null);
                setActiveTrade(null);
                setIncomingTrade(null);
              }}
            />
          )}

          {/* Dramatic Event / Boss / Boski Banner */}
          {banner && (
            <div
              className={`comic-panel ${banner.type === 'boski' ? 'boski-shimmer' : ''}`}
              style={{
                position: 'fixed',
                top: 138,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 75,
                padding: '12px 26px',
                textAlign: 'center',
                maxWidth: '90vw',
                pointerEvents: 'none',
                background:
                  banner.type === 'boski'
                    ? 'linear-gradient(90deg, #881337, #7c3aed, #b45309)'
                    : banner.type === 'warning'
                      ? 'linear-gradient(180deg, #991b1b, #450a0a)'
                      : banner.type === 'levelup'
                        ? 'linear-gradient(180deg, #854d0e, #422006)'
                        : undefined,
              }}
            >
              <div className="comic-title" style={{ fontSize: 30, color: '#fde047' }}>
                {banner.title}
              </div>
              {banner.subtitle && (
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                  {banner.subtitle}
                </div>
              )}
            </div>
          )}

          {/* Roguelike Chaos Boon Choice Overlay (Hades-style 1 of 3 cards, selectable via click or [Z]/[X]/[C]!) */}
          {boonOffer && (
            <div
              style={{
                position: 'fixed',
                bottom: 168,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 82,
                width: 'min(760px, 94vw)',
                pointerEvents: 'auto',
              }}
            >
              <div
                className="comic-panel"
                style={{
                  padding: '14px 16px',
                  borderColor: '#fbbf24',
                  background: 'linear-gradient(180deg, rgba(24, 18, 48, 0.96), rgba(12, 14, 28, 0.97))',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div className="comic-title" style={{ fontSize: 22, color: '#fde047' }}>
                    {boonOffer.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
                    Wybierz 1 z 3 Mocy na czas bieżącej lokacji (kliknij lub naciśnij [Z] / [X] / [C])
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {boonOffer.choices.map((bid, idx) => {
                    const b = CHAOS_BOONS[bid];
                    const hotkey = ['Z', 'X', 'C'][idx] || `${idx + 1}`;
                    return (
                      <button
                        key={bid}
                        onClick={() => handleChooseBoon(bid)}
                        className="comic-panel-sm"
                        style={{
                          cursor: 'pointer',
                          padding: '12px 12px',
                          textAlign: 'left',
                          borderColor: b.color,
                          background: 'linear-gradient(160deg, rgba(30, 27, 56, 0.95), rgba(15, 17, 34, 0.95))',
                          transition: 'transform 0.12s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 24 }}>{b.icon}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: b.color,
                              color: '#111118',
                            }}
                          >
                            [{hotkey}]
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: b.color }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.35 }}>{b.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Hades-Style Elemental / Duo Boon & Skill Evolution 1-of-3 Overlay */}
          {hadesOffer && (
            <HadesOfferOverlay
              offer={hadesOffer}
              onPickElemental={(kind, id) => {
                socketRef.current?.emit('hades:choose_boon', { kind, id });
                soundEngine.playRuneUpgrade();
                setHadesOffer(null);
              }}
              onPickEvolution={(id) => {
                socketRef.current?.emit('hades:choose_evolution', { id });
                soundEngine.playRuneUpgrade();
                setHadesOffer(null);
              }}
            />
          )}

          {/* Wandering Merchant (Charon) In-Run Shop Modal */}
          {charonOpen && (
            <CharonModal
              runEssence={
                snapshot?.players.find((pl) => pl.id === localPlayerId)?.runEssence ?? charonOpen.runEssence
              }
              purchasedIds={charonOpen.purchasedIds}
              onBuy={(itemId) => socketRef.current?.emit('charon:buy', { itemId })}
              onClose={() => setCharonOpen(null)}
            />
          )}

          {/* Incoming Trade Invite Prompt */}
          {incomingTrade && !activeTrade && (
            <div
              className="comic-panel"
              style={{
                position: 'fixed',
                top: 130,
                left: 16,
                zIndex: 80,
                padding: 14,
                width: 280,
                borderColor: '#fbbf24',
              }}
            >
              <div style={{ fontWeight: 900, color: '#fde047', fontSize: 14 }}>
                🤝 Zaproszenie do handlu!
              </div>
              <div style={{ fontSize: 12, color: '#e2e8f0', margin: '4px 0 10px' }}>
                Gracz <strong>{incomingTrade.playerAName}</strong> chce wymienić się przedmiotami.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="comic-btn comic-btn-green"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                  onClick={() =>
                    socketRef.current?.emit('trade:respond', {
                      tradeId: incomingTrade.tradeId,
                      accept: true,
                    })
                  }
                >
                  ✓ Akceptuj
                </button>
                <button
                  className="comic-btn comic-btn-red"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                  onClick={() => {
                    socketRef.current?.emit('trade:respond', {
                      tradeId: incomingTrade.tradeId,
                      accept: false,
                    });
                    setIncomingTrade(null);
                  }}
                >
                  ✕ Odrzuć
                </button>
              </div>
            </div>
          )}

          {/* Expedition Victory Summary Card (Grade S / A / B + 4 Comic MVP Cards!) */}
          {victorySummary && (
            <div
              className="comic-panel"
              style={{
                position: 'fixed',
                top: 72,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 84,
                width: victorySummary.mvpCards && victorySummary.mvpCards.length > 0 ? 'min(640px, 94vw)' : 'min(480px, 92vw)',
                maxHeight: '84vh',
                overflowY: 'auto',
                padding: '16px 20px',
                borderColor:
                  victorySummary.grade === 'S'
                    ? '#fde047'
                    : victorySummary.grade === 'A'
                      ? '#38bdf8'
                      : '#a855f7',
                background: 'linear-gradient(155deg, rgba(22, 26, 56, 0.97), rgba(11, 14, 30, 0.98))',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#4ade80', letterSpacing: 1 }}>
                    ✨ WYPRAWA UKOŃCZONA!
                  </div>
                  <div className="comic-title" style={{ fontSize: 24, color: '#fde047', lineHeight: 1.1 }}>
                    {victorySummary.locationName}
                  </div>
                </div>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 16,
                    border: '3px solid #111118',
                    background:
                      victorySummary.grade === 'S'
                        ? 'linear-gradient(135deg, #facc15, #f97316)'
                        : victorySummary.grade === 'A'
                          ? 'linear-gradient(135deg, #38bdf8, #6366f1)'
                          : 'linear-gradient(135deg, #c084fc, #7e22ce)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(250,204,21,0.35)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#111118', lineHeight: 1 }}>OCENA</span>
                  <span className="comic-title" style={{ fontSize: 30, color: '#fff', lineHeight: 1 }}>
                    {victorySummary.grade}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginTop: 12,
                  marginBottom: 12,
                }}
              >
                <div className="comic-panel-sm" style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>⚔️ Pokonani</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#f8fafc' }}>
                    {victorySummary.enemiesSlain}
                  </div>
                </div>
                <div className="comic-panel-sm" style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>🔥 Max Seria</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#fb923c' }}>
                    {victorySummary.maxCombo}×
                  </div>
                </div>
                <div className="comic-panel-sm" style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>🗝️ Skrzynie</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#fde047' }}>
                    {victorySummary.chestsOpened}/{victorySummary.totalChests}
                  </div>
                </div>
                <div className="comic-panel-sm" style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>⭐ Bonus XP</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#4ade80' }}>
                    +{victorySummary.clearXp}
                  </div>
                </div>
              </div>

              {/* Mentor Shards Earned Highlight */}
              {(victorySummary.mentorShardsEarned || 0) > 0 && (
                <div
                  className="comic-panel-sm"
                  style={{
                    padding: '7px 12px',
                    marginBottom: 10,
                    borderColor: '#38bdf8',
                    background: 'rgba(14, 116, 144, 0.35)',
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#e0f2fe',
                    textAlign: 'center',
                  }}
                >
                  🎓 PREMIA MENTORA: Zdobyto <strong style={{ color: '#fde047' }}>+{victorySummary.mentorShardsEarned} Odłamków Mentora</strong> (wymień u Kowala [B])!
                </div>
              )}

              {/* 4 Comic MVP Cards */}
              {victorySummary.mvpCards && victorySummary.mvpCards.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: '#fde68a',
                      letterSpacing: 1,
                      marginBottom: 6,
                      textAlign: 'center',
                    }}
                  >
                    🏆 KOMIKSOWE KARTY WYRÓŻNIEŃ MVP
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {victorySummary.mvpCards.map((card) => {
                      const cls = CLASSES[card.classId];
                      return (
                        <div
                          key={card.id}
                          className="comic-panel-sm"
                          style={{
                            padding: '8px 10px',
                            borderColor: card.color,
                            background: `linear-gradient(135deg, ${card.color}22 0%, rgba(15, 18, 36, 0.94) 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 11,
                              background: `${card.color}30`,
                              border: `2px solid ${card.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              flexShrink: 0,
                            }}
                          >
                            {card.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 11.5,
                                fontWeight: 900,
                                color: card.color,
                                lineHeight: 1.1,
                                textTransform: 'uppercase',
                              }}
                            >
                              {card.title}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 900,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: 1,
                              }}
                            >
                              {card.playerName}{' '}
                              <span style={{ fontSize: 10, color: cls.primaryColor }}>({cls.name})</span>
                            </div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#cbd5e1' }}>
                              {card.statLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
                  🔍 Sekrety: {victorySummary.secretsFound}/{victorySummary.totalSecrets} • Gotowi na kolejny etap!
                </span>
                <button
                  className="comic-btn comic-btn-gold"
                  onClick={() => setVictorySummary(null)}
                  style={{ padding: '5px 14px', fontSize: 12 }}
                >
                  Super! ✕
                </button>
              </div>
            </div>
          )}

          {/* Active Modals */}
          {activePanel === 'inventory' && (
            <InventoryModal
              profile={profile}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              onSalvageItem={handleSalvageItem}
              onBulkSalvage={handleBulkSalvage}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'skills' && (
            <SkillsModal
              profile={profile}
              onUpgradeSkill={handleUpgradeSkill}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'blacksmith' && (
            <BlacksmithModal
              profile={profile}
              onUpgradeItem={handleUpgradeItem}
              onExchangeMentorShards={handleExchangeMentorShards}
              onTransmuteShards={handleTransmuteShards}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'runes' && (
            <RunesModal
              profile={profile}
              onUpgradeRune={handleUpgradeRune}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'worldmap' && (
            <WorldMapModal
              profile={profile}
              currentGlobalLocation={snapshot?.globalLocation ?? room?.globalLocation ?? 1}
              onSelectLocation={handleSelectLocation}
              onToggleSandbox={handleToggleSandbox}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activeChest && (
            <ChestPuzzleModal
              chest={activeChest}
              onSolved={(chestId) => {
                socketRef.current?.emit('chest:solved', { chestId });
                advanceBounty('chest', 1, 'add');
                setActiveChest(null);
              }}
              onClose={() => setActiveChest(null)}
            />
          )}

          {activeTrade && (
            <TradeModal
              profile={profile}
              localPlayerId={localPlayerId}
              trade={activeTrade}
              onUpdateOffer={(items) =>
                socketRef.current?.emit('trade:update_offer', {
                  tradeId: activeTrade.tradeId,
                  items,
                })
              }
              onLockOffer={() =>
                socketRef.current?.emit('trade:lock', { tradeId: activeTrade.tradeId })
              }
              onAcceptTrade={() =>
                socketRef.current?.emit('trade:accept', { tradeId: activeTrade.tradeId })
              }
              onCancelTrade={() => {
                socketRef.current?.emit('trade:cancel', { tradeId: activeTrade.tradeId });
                setActiveTrade(null);
              }}
            />
          )}
        </>
      )}

      {/* Bounties & Daily Rewards Modal (accessible from both Main Menu AND in-game [J]!) */}
      {activePanel === 'bounties' && (
        <BountiesModal
          profile={profile}
          initialTab={bountiesInitialTab}
          onClaimDaily={handleClaimDaily}
          onClaimDailyAct={handleClaimDailyAct}
          onClaimBounty={handleClaimBounty}
          onClaimMainQuest={handleClaimMainQuest}
          onClaimSideLocation={handleClaimSideLocation}
          onClaimAllSideLocations={handleClaimAllSideLocations}
          onSpinWheelComplete={handleSpinWheelComplete}
          onJumpToLocation={handleJumpToLocation}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Guild Modal (accessible from both Main Menu AND in-game [G]!) */}
      {activePanel === 'guild' && (
        <GuildModal
          guild={guild}
          playerUid={profile.playerUid || ''}
          localSocketId={localPlayerId}
          room={room}
          connected={connected}
          onCreateGuild={handleCreateGuild}
          onJoinGuildByCode={handleJoinGuildByCode}
          onInviteRoomMember={handleInviteRoomMember}
          onLeaveGuild={handleLeaveGuild}
          onUpgradeGuild={handleUpgradeGuild}
          onStartGuildAct={handleStartGuildAct}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Endless Chaos Rift & 4-Category Leaderboard Modal (Main Menu & In-Game [R]) */}
      {activePanel === 'rift' && (
        <RiftModal
          profile={profile}
          room={room}
          leaderboard={riftLeaderboard}
          activePactCurses={activePactCurses}
          onTogglePactCurse={handleTogglePactCurse}
          onStartRift={handleStartRift}
          onRefreshLeaderboard={() => socketRef.current?.emit('rift:get_leaderboard')}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Prestige Chamber Modal: Titles, Ground Auras & Running Trails (Main Menu & In-Game [P]) */}
      {activePanel === 'prestige' && (
        <PrestigeModal
          profile={profile}
          onEquipCosmetic={handleEquipCosmetic}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Incoming Guild Invite Prompt (works both in Main Menu & In-Game!) */}
      {incomingGuildInvite && (
        <div
          className="comic-panel"
          style={{
            position: 'fixed',
            top: 84,
            right: 16,
            zIndex: 96,
            padding: 14,
            width: 300,
            borderColor: '#fbbf24',
          }}
        >
          <div style={{ fontWeight: 900, color: '#fde047', fontSize: 14 }}>
            {incomingGuildInvite.guildEmblem} Zaproszenie do Gildii!
          </div>
          <div style={{ fontSize: 12, color: '#e2e8f0', margin: '5px 0 10px' }}>
            Gracz <strong>{incomingGuildInvite.fromName}</strong> zaprasza Cię do Gildii{' '}
            <strong style={{ color: '#fbbf24' }}>
              [{incomingGuildInvite.guildTag}] {incomingGuildInvite.guildName}
            </strong>
            !
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="comic-btn comic-btn-green"
              style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
              onClick={() => {
                socketRef.current?.emit(
                  'guild:respond_invite',
                  { guildId: incomingGuildInvite.guildId, accept: true },
                  (res: { ok: boolean; error?: string }) => {
                    if (res?.ok) {
                      soundEngine.playLevelUp();
                      pushToast(`🏰 Dołączono do Gildii ${incomingGuildInvite.guildName}!`, '#4ade80');
                    } else if (res?.error) {
                      pushToast(`🏰 ${res.error}`, '#f87171');
                    }
                  }
                );
                setIncomingGuildInvite(null);
              }}
            >
              ✓ Dołącz
            </button>
            <button
              className="comic-btn comic-btn-red"
              style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
              onClick={() => {
                socketRef.current?.emit('guild:respond_invite', {
                  guildId: incomingGuildInvite.guildId,
                  accept: false,
                });
                setIncomingGuildInvite(null);
              }}
            >
              ✕ Odrzuć
            </button>
          </div>
        </div>
      )}

      {/* Loot / System Toasts (Bottom-Right, works in both Main Menu & In-Game) */}
      <div
        style={{
          position: 'fixed',
          bottom: inGame ? 152 : 24,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 95,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="comic-panel-sm"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 900,
              color: t.color,
              borderColor: t.color,
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;

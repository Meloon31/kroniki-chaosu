import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CLASSES, MAX_LEVEL, MAX_SKILL_RANK, xpToNextLevel } from '../shared/classes';
import { getMainBossByAct } from '../shared/bosses';
import {
  canClassEquipItem,
  createStarterEquipment,
  createStarterShards,
  EQUIP_SLOTS,
  getPlus13ClassBonus,
  getSalvageShardYield,
  getUpgradeShardCost,
  getUpgradeSuccessChance,
  MAX_UPGRADE_LEVEL,
  RARITY_META,
} from '../shared/items';
import { createStarterRunes, createStarterRuneShards, RUNE_MAX_LEVEL, RUNES } from '../shared/runes';
import { BoonId, CHAOS_BOONS } from '../shared/mutators';
import { computePlayerStats } from '../shared/stats';
import type {
  ClassId,
  EquipmentItem,
  EquipSlot,
  FloatingCombatText,
  GeneratedMapData,
  LockedChestState,
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
import { ChestPuzzleModal } from './components/ChestPuzzleModal';
import { ActivePanel, Hud } from './components/Hud';
import { InventoryModal } from './components/InventoryModal';
import { LobbyScreen } from './components/LobbyScreen';
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
      skillRanks: { ...def.skillRanks, ...(parsed.skillRanks || {}) },
      equipped: { ...def.equipped, ...(parsed.equipped || {}) },
      shards: { ...def.shards, ...(parsed.shards || {}) },
      runes: { ...def.runes, ...(parsed.runes || {}) },
      runeShards: { ...def.runeShards, ...(parsed.runeShards || {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      completedLocations: Array.isArray(parsed.completedLocations) ? parsed.completedLocations : [],
    };
  } catch {
    return createDefaultProfile();
  }
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

  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(() => loadSavedServerUrl());
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const loadedBuildIdRef = useRef<string | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState('');
  const [room, setRoom] = useState<RoomSummary | null>(null);
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
  const [activeChest, setActiveChest] = useState<LockedChestState | null>(null);
  const [boonOffer, setBoonOffer] = useState<{ title: string; choices: BoonId[] } | null>(null);
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

  // Persist profile & push stat updates to server live
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
        profile.runes
      );
      sock.emit('room:update_profile', {
        name: profile.name,
        classId: profile.classId,
        level: profile.level,
        skillRanks: profile.skillRanks,
        stats,
      });
    }
  }, [profile]);

  const grantXp = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
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

  // Quick hotkeys [Z], [X], [C] to pick a Chaos Boon without stopping movement!
  useEffect(() => {
    if (!boonOffer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && boonOffer.choices[0]) handleChooseBoon(boonOffer.choices[0]);
      else if (k === 'x' && boonOffer.choices[1]) handleChooseBoon(boonOffer.choices[1]);
      else if (k === 'c' && boonOffer.choices[2]) handleChooseBoon(boonOffer.choices[2]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boonOffer, handleChooseBoon]);

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

    sock.on('juice:boski_drop', (payload: { itemName: string }) => {
      soundEngine.playLootDrop('boski');
      engineRef.current?.triggerBoskiSlowMo(1250);
      setBoskiFlashKey((k) => k + 1);
      showBanner(
        'boski',
        `✨ BOSKI DROP! (0.5% SZANSY) ✨`,
        `Wypadł legendarny artefakt: ${payload.itemName}!`,
        5200
      );
    });

    sock.on('loot:granted', (payload: { item?: EquipmentItem; runeShard?: RuneId }) => {
      if (payload.item) {
        const it = payload.item;
        soundEngine.playLootDrop(it.rarity);
        pushToast(`+${RARITY_META[it.rarity].name}: ${it.name}`, RARITY_META[it.rarity].color);
        setProfile((prev) => ({
          ...prev,
          inventory: [it, ...prev.inventory].slice(0, 60),
        }));
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
    });

    sock.on('player:xp_gain', (payload: { amount: number }) => {
      grantXp(payload.amount);
    });

    sock.on('location:completed', (payload: { globalLocation: number; clearXp: number }) => {
      grantXp(payload.clearXp);
      setProfile((prev) => ({
        ...prev,
        unlockedLocationGlobal: Math.min(60, Math.max(prev.unlockedLocationGlobal, payload.globalLocation + 1)),
        completedLocations: prev.completedLocations.includes(payload.globalLocation)
          ? prev.completedLocations
          : [...prev.completedLocations, payload.globalLocation],
      }));
    });

    sock.on('chest:open_modal', (chest: LockedChestState) => {
      setActiveChest(chest);
    });

    sock.on('boon:offer', (payload: { title: string; choices: BoonId[] }) => {
      setBoonOffer(payload);
      soundEngine.playLevelUp();
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
  }, [grantXp, pushToast, serverUrl, showBanner]);

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
          const stats = computePlayerStats(cur.classId, cur.level, cur.equipped, cur.skillRanks, cur.runes);
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
      onInteract: () => {
        socketRef.current?.emit('world:interact');
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
    engineRef.current?.setUiBlocked(Boolean(activePanel || activeChest || activeTrade));
  }, [activePanel, activeChest, activeTrade]);

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
    name: p.name,
    classId: p.classId,
    level: p.level,
    skillRanks: p.skillRanks,
    stats: computePlayerStats(p.classId, p.level, p.equipped, p.skillRanks, p.runes),
    globalLocation,
  });

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
    soundEngine.playAnvilStrike(1);
    setProfile((prev) => {
      const target = prev.inventory.find((i) => i.id === itemId);
      if (!target) return prev;
      const gained = getSalvageShardYield(target);
      pushToast(`+${gained} × ${RARITY_META[target.rarity].shardName}`, RARITY_META[target.rarity].color);
      return {
        ...prev,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
        shards: {
          ...prev.shards,
          [target.rarity]: (prev.shards[target.rarity] || 0) + gained,
        },
      };
    });
  };

  const handleBulkSalvage = (rarity: Rarity) => {
    soundEngine.playAnvilStrike(3);
    setProfile((prev) => {
      let gained = 0;
      const kept: EquipmentItem[] = [];
      for (const it of prev.inventory) {
        if (it.rarity === rarity) gained += getSalvageShardYield(it);
        else kept.push(it);
      }
      if (gained === 0) return prev;
      pushToast(`Rozebrano! +${gained} × ${RARITY_META[rarity].shardName}`, RARITY_META[rarity].color);
      return {
        ...prev,
        inventory: kept,
        shards: {
          ...prev.shards,
          [rarity]: (prev.shards[rarity] || 0) + gained,
        },
      };
    });
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
    if (!target || target.upgradeLevel >= MAX_UPGRADE_LEVEL) return null;
    const cost = getUpgradeShardCost(target.upgradeLevel);
    if ((cur.shards[target.rarity] || 0) < cost) return null;

    const chancePct = getUpgradeSuccessChance(target.upgradeLevel);
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

    if (success && newLevel >= MAX_UPGRADE_LEVEL) {
      const bonusClass = target.classAffinity ?? cur.classId;
      const p13 = getPlus13ClassBonus(bonusClass);
      soundEngine.playLevelUp();
      showBanner(
        'boski',
        `👑 MISTRZOWSKIE +13 ODBLOKOWANE!`,
        `${p13.icon} ${p13.title}: ${p13.summary}`,
        5000
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
        />
      ) : (
        <>
          {/* Three.js 2.5D/3D Comic Canvas Host */}
          <div ref={canvasHostRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />

          {/* Boski Crimson-Rainbow Screen Flash */}
          {boskiFlashKey > 0 && <div key={boskiFlashKey} className="boski-screen-flash" />}

          {/* Comic HUD */}
          {room && (
            <Hud
              profile={profile}
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
              onOpenPanel={(p) => setActivePanel(p)}
              onCastSkill={(slot) => engineRef.current?.castSkillFromHud(slot)}
              onUsePotion={() => socketRef.current?.emit('player:potion')}
              onRequestTrade={(targetId) => {
                socketRef.current?.emit('trade:request', { targetId });
              }}
              onLeaveToLobby={() => {
                socketRef.current?.emit('room:leave');
                setInGame(false);
                setRoom(null);
                setMapData(null);
                setSnapshot(null);
                setActivePanel(null);
                setBoonOffer(null);
                setActiveChest(null);
                setActiveTrade(null);
                setIncomingTrade(null);
              }}
            />
          )}

          {/* Loot / System Toasts (Bottom-Right) */}
          <div
            style={{
              position: 'fixed',
              bottom: 152,
              right: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              zIndex: 45,
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
    </div>
  );
}
export default App;

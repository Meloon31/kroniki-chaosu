import React, { useEffect, useRef, useState } from 'react';
import { CLASSES, MAX_LEVEL, xpToNextLevel } from '../../shared/classes';
import { getDailyBlessing, getDailyFeaturedLocation } from '../../shared/bounties';
import { getTotalGuildShards, GuildState, isGuildAct } from '../../shared/guilds';
import { RARITY_META } from '../../shared/items';
import { CHAOS_BOONS, LOCATION_MUTATORS } from '../../shared/mutators';
import { CLASS_ULTIMATES, DUO_BOONS, ELEMENTAL_BOONS, SKILL_EVOLUTIONS } from '../../shared/hades';
import { formatRiftTime } from '../../shared/rift';
import { getLocationDef } from '../../shared/world';
import type {
  GeneratedMapData,
  PlayerProfile,
  RoomSummary,
  WorldSnapshot,
} from '../../shared/types';
import type { ScreenFloatingText } from '../game/GameEngine';
import type { MusicTrackInfo } from '../audio/musicEngine';

export type ActivePanel =
  | null
  | 'inventory'
  | 'skills'
  | 'blacksmith'
  | 'runes'
  | 'worldmap'
  | 'trade'
  | 'bounties'
  | 'guild'
  | 'rift'
  | 'prestige';

const COOP_EMOTES = [
  { icon: '👍', label: '👍 SUPER!' },
  { icon: '🔥', label: '🔥 DAWAJ!' },
  { icon: '❤️', label: '❤️ DZIĘKI!' },
  { icon: '⚠️', label: '⚠️ UWAGA!' },
  { icon: '💰', label: '💰 SKARB!' },
];

interface HudProps {
  profile: PlayerProfile;
  guild?: GuildState | null;
  room: RoomSummary;
  localPlayerId: string;
  mapData: GeneratedMapData | null;
  snapshot: WorldSnapshot | null;
  floatingTexts: ScreenFloatingText[];
  interactHint: string | null;
  skillCooldowns: { active1: number; active2: number; active3: number };
  muted: boolean;
  currentTrack?: MusicTrackInfo;
  musicVolume?: number;
  readyBountyCount?: number;
  onToggleMute: () => void;
  onMusicVolumeChange?: (v: number) => void;
  onNextTrack?: () => void;
  onOpenPanel: (panel: ActivePanel) => void;
  onCastSkill: (slot: 'active1' | 'active2' | 'active3') => void;
  onUsePotion: () => void;
  onCastUltimate?: () => void;
  onRequestTrade: (targetId: string) => void;
  onSendEmote?: (text: string) => void;
  onEnterCamp?: () => void;
  onLeaveToLobby: () => void;
}

export const Hud: React.FC<HudProps> = ({
  profile,
  guild,
  room,
  localPlayerId,
  mapData,
  snapshot,
  floatingTexts,
  interactHint,
  skillCooldowns,
  muted,
  currentTrack,
  musicVolume = 0.42,
  readyBountyCount = 0,
  onToggleMute,
  onMusicVolumeChange,
  onNextTrack,
  onOpenPanel,
  onCastSkill,
  onUsePotion,
  onCastUltimate,
  onRequestTrade,
  onSendEmote,
  onEnterCamp,
  onLeaveToLobby,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredPassive, setHoveredPassive] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const localPlayer = snapshot?.players.find((p) => p.id === localPlayerId);
  const cls = CLASSES[profile.classId];
  const loc = getLocationDef(snapshot?.globalLocation ?? room.globalLocation);

  const activeBoss = snapshot?.enemies.find(
    (e) => e.alive && (e.tier === 'boss' || e.tier === 'miniboss')
  );

  const totalRuneShards =
    (profile.runeShards.malakor || 0) +
    (profile.runeShards.azirath || 0) +
    (profile.runeShards.sylvara || 0) +
    (profile.runeShards.vaelgor || 0) +
    (profile.runeShards.kaelis || 0) +
    (profile.runeShards.ignarok || 0) +
    (profile.runeShards.aeternus || 0);

  // Render Minimap Canvas
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas || !mapData || !snapshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1221';
    ctx.fillRect(0, 0, W, H);

    // Map world range approx -72..+72 -> 144 units
    const scale = W / 148;
    const toX = (wx: number) => W / 2 + wx * scale;
    const toY = (wz: number) => H / 2 + wz * scale;

    const revealedSecIds = new Set(snapshot.secrets.filter((s) => s.revealed).map((s) => s.id));
    const solvedGateIds = new Set(snapshot.puzzles.filter((p) => p.solved).map((p) => p.id));

    // Rooms
    for (const r of mapData.rooms) {
      if (r.kind === 'secret') {
        // Only show secret room brightly once a secret is revealed (dim dashed hint otherwise)
        ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
      } else if (r.kind === 'boss') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      } else if (r.kind === 'puzzle') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      }
      ctx.fillRect(toX(r.cx - r.w / 2), toY(r.cz - r.d / 2), r.w * scale, r.d * scale);
    }

    // Walls
    for (const w of mapData.walls) {
      if (w.gateId && solvedGateIds.has(w.gateId)) continue;
      if (w.secretId && revealedSecIds.has(w.secretId)) continue;
      ctx.fillStyle = w.gateId ? '#38bdf8' : w.secretId ? '#fbbf24' : '#64748b';
      ctx.fillRect(
        toX(w.x - w.w / 2),
        toY(w.z - w.d / 2),
        Math.max(1.5, w.w * scale),
        Math.max(1.5, w.d * scale)
      );
    }

    // Exit Portal & Branching Hades Portals
    if (snapshot.branchPortals && snapshot.branchPortals.length > 0) {
      for (const bp of snapshot.branchPortals) {
        ctx.fillStyle = bp.color || '#22d3ee';
        ctx.beginPath();
        ctx.arc(toX(bp.x), toY(bp.z), 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = snapshot.exitUnlocked ? '#22d3ee' : '#64748b';
      ctx.beginPath();
      ctx.arc(toX(mapData.exitPortal.x), toY(mapData.exitPortal.z), 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wandering Merchant (Charon)
    if (snapshot.merchant) {
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(toX(snapshot.merchant.x), toY(snapshot.merchant.z), 4.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Unopened Chests
    for (const ch of snapshot.chests) {
      if (ch.opened) continue;
      ctx.fillStyle = ch.isSecret ? '#fde047' : '#f59e0b';
      ctx.fillRect(toX(ch.x) - 2.2, toY(ch.z) - 2.2, 4.4, 4.4);
    }

    // Unused Shrines
    for (const sh of snapshot.shrines) {
      if (sh.used) continue;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(toX(sh.x), toY(sh.z), 3.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wave Obelisk
    if (snapshot.obelisk && snapshot.obelisk.state !== 'completed') {
      ctx.fillStyle = snapshot.obelisk.state === 'active' ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(toX(snapshot.obelisk.x), toY(snapshot.obelisk.z), 4.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Camp 3D Stations on minimap
    if (mapData.campStations && mapData.campStations.length > 0) {
      for (const st of mapData.campStations) {
        ctx.fillStyle = st.color || '#fde047';
        ctx.beginPath();
        ctx.arc(toX(st.x), toY(st.z), 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies (including Golden Goblin, Shield Totems & Camp Training Dummy)
    for (const e of snapshot.enemies) {
      if (!e.alive || e.tier === 'root_trap' || e.tier === 'barrel') continue;
      if (e.tier === 'dummy') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(toX(e.x), toY(e.z), 3.6, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle =
        e.tier === 'goblin'
          ? '#fde047'
          : e.tier === 'totem'
            ? '#c084fc'
            : e.tier === 'boss' || e.tier === 'miniboss'
              ? '#f43f5e'
              : e.tier === 'elite'
                ? '#fb923c'
                : '#ef4444';
      const r =
        e.tier === 'boss'
          ? 4.6
          : e.tier === 'miniboss' || e.tier === 'goblin'
            ? 3.8
            : e.tier === 'totem' || e.tier === 'elite'
              ? 2.8
              : 1.9;
      ctx.beginPath();
      ctx.arc(toX(e.x), toY(e.z), r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players (Teammates + Local Hero + Pulsing Downed Rescue Marker!)
    const miniNow = Date.now();
    for (const p of snapshot.players) {
      const isMe = p.id === localPlayerId;
      const px = toX(p.x);
      const pz = toY(p.z);
      const isDowned = !p.alive && (p.downedUntil || 0) > miniNow;

      if (isDowned) {
        const pulse = 5.5 + Math.sin(miniNow * 0.012) * 2.2;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, pz, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(px, pz, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // White medical cross
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2.6, pz - 0.9, 5.2, 1.8);
        ctx.fillRect(px - 0.9, pz - 2.6, 1.8, 5.2);
        continue;
      }

      ctx.fillStyle = isMe ? '#fde047' : '#38bdf8';
      ctx.strokeStyle = '#111118';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, pz, isMe ? 4.2 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [mapData, snapshot, localPlayerId]);

  const now = Date.now();
  const xpNeeded = xpToNextLevel(profile.level);
  const xpPct = profile.level >= MAX_LEVEL ? 100 : Math.min(100, (profile.xp / Math.max(1, xpNeeded)) * 100);

  const damageColor = (ft: ScreenFloatingText) => {
    if (ft.isCrit) return '#fde047';
    switch (ft.damageType) {
      case 'physical':
        return '#fff7ed';
      case 'magical':
        return '#d8b4fe';
      case 'hybrid':
        return '#5eead4';
      case 'heal':
        return '#4ade80';
      case 'shield':
        return '#38bdf8';
      case 'poison':
        return '#a3e635';
      default:
        return '#ffffff';
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* Floating Damage Numbers & Comic Words */}
      {floatingTexts.map((ft) => (
        <div
          key={ft.id}
          className="floating-dmg"
          style={{
            left: ft.screenX,
            top: ft.screenY,
            color: damageColor(ft),
            fontSize: ft.isCrit ? 34 : ft.isComicWord ? 24 : 20,
          }}
        >
          {ft.isCrit ? '💥 ' : ''}
          {ft.text}
          {ft.subtext ? ` (${ft.subtext})` : ''}
        </div>
      ))}

      {/* TOP-LEFT: Party Status (1-4 Players) + Trade Buttons */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'auto',
          width: 248,
        }}
      >
        <div
          className="comic-panel-sm"
          style={{
            padding: '6px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <span>
            Pokój: <strong style={{ color: '#fde047', letterSpacing: 1.5 }}>{room.code}</strong>
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="comic-btn comic-btn-dark"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/?room=${room.code}`;
                navigator.clipboard?.writeText(inviteUrl).catch(() => {});
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1600);
              }}
              style={{ padding: '2px 7px', fontSize: 10 }}
              title="Skopiuj bezpośredni link zaproszenia dla znajomego"
            >
              {copiedCode ? '✓ Link!' : '🔗 Zaproś'}
            </button>
          </div>
        </div>

        {/* Party Bond Buff Pill (+5% XP & +5% Magic Find per extra ally) */}
        {snapshot && (snapshot.partyBondXpPct || 0) > 0 && (
          <div
            className="comic-panel-sm"
            style={{
              padding: '4px 9px',
              fontSize: 10.5,
              fontWeight: 900,
              color: '#86efac',
              borderColor: '#22c55e',
              background: 'rgba(20, 83, 45, 0.72)',
              textAlign: 'center',
            }}
            title="Premia Więzi Drużyny za wspólną grę w Co-op"
          >
            🤝 Więzi Drużyny: +{snapshot.partyBondXpPct}% XP • +{snapshot.partyBondMfPct || snapshot.partyBondXpPct}% Drop
          </div>
        )}

        {(snapshot?.players ?? []).map((p) => {
          const isMe = p.id === localPlayerId;
          const pCls = CLASSES[p.classId];
          const hpPct = Math.max(0, Math.min(100, (p.hp / Math.max(1, p.maxHp)) * 100));
          const shieldPct = Math.min(100, (p.shield / Math.max(1, p.maxHp)) * 100);
          const isDowned = !p.alive && (p.downedUntil || 0) > now;
          const downedSec = isDowned ? Math.max(0, ((p.downedUntil || 0) - now) / 1000) : 0;
          const revPct = Math.round((p.reviveProgress || 0) * 100);
          const hasBarrierBuff = (p.lightBarrierUntil || 0) > now && p.shield > 0;

          return (
            <div
              key={p.id}
              className="comic-panel-sm"
              style={{
                padding: '7px 9px',
                borderColor: isDowned ? '#f43f5e' : isMe ? '#fde047' : pCls.primaryColor,
                background: isDowned ? 'rgba(136, 19, 55, 0.85)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}{' '}
                  <span style={{ color: pCls.primaryColor, fontSize: 11 }}>
                    ({pCls.name} • {p.level})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {p.isMentor && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        background: '#0284c7',
                        color: '#e0f2fe',
                        padding: '1px 5px',
                        borderRadius: 6,
                      }}
                      title="Mentor (statystyki skalowane do lokacji -> Odłamki Mentora!)"
                    >
                      🎓
                    </span>
                  )}
                  {hasBarrierBuff && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#7dd3fc',
                        border: '1px solid #38bdf8',
                        padding: '0px 4px',
                        borderRadius: 6,
                      }}
                      title="Bariera Światła Wróżki: +15% Szybkości Ataku"
                    >
                      🪽+15%
                    </span>
                  )}
                  {!isMe && (
                    <button
                      className="comic-btn comic-btn-gold"
                      onClick={() => onRequestTrade(p.id)}
                      style={{ padding: '2px 7px', fontSize: 10 }}
                      title="Zaproponuj handel"
                    >
                      🤝 Handluj
                    </button>
                  )}
                </div>
              </div>
              {isDowned ? (
                <div
                  style={{
                    position: 'relative',
                    height: 16,
                    background: '#2b0a14',
                    border: '2px solid #f43f5e',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${revPct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #22c55e, #fde047)',
                      transition: 'width 0.08s',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      fontSize: 9.5,
                      fontWeight: 900,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textShadow: '1px 1px 0 #111',
                    }}
                  >
                    {revPct > 0
                      ? `👼 Wskrzeszanie: ${revPct}%${p.revivingByName ? ` (${p.revivingByName})` : ''}`
                      : `🚑 POWALONY (${downedSec.toFixed(0)}s) — Trzymaj [E]/[F]`}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    height: 12,
                    background: '#0f1221',
                    border: '2px solid #111118',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${hpPct}%`, height: '100%', background: '#22c55e', transition: 'width 0.12s' }} />
                  {p.shield > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: `${shieldPct}%`,
                        height: '100%',
                        background: 'rgba(56, 189, 248, 0.7)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      fontSize: 9,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textShadow: '1px 1px 0 #111',
                    }}
                  >
                    {p.hp}/{p.maxHp}
                    {p.shield > 0 ? ` (+${p.shield})` : ''}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TOP-CENTER: Location Banner, Objectives & Boss Health Bar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          width: 'min(520px, 48vw)',
        }}
      >
        <div
          className="comic-panel-sm"
          style={{
            padding: '7px 16px',
            textAlign: 'center',
            width: '100%',
            borderColor: snapshot?.isCamp
              ? '#fbbf24'
              : (snapshot?.riftFloor || 0) > 0
                ? '#c084fc'
                : undefined,
          }}
        >
          {snapshot?.isCamp ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24', letterSpacing: 1 }}>
                🏕️ WSPÓLNY OBÓZ 3D (INTERAKTYWNE LOBBY DRUŻYNY)
              </div>
              <div className="comic-title" style={{ fontSize: 22, color: '#fff', lineHeight: 1.1 }}>
                Obóz Bohaterów Chaosu
              </div>
              {(() => {
                const dummy = snapshot.enemies.find((e) => e.tier === 'dummy');
                const dps = Math.round(dummy?.dummyDps || 0);
                const maxCrit = Math.round(dummy?.dummyMaxCrit || 0);
                return (
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>
                      Podejdź do stanowisk (🔨 Kowal • 💠 Runy • 👑 Prestiż • 🌀 Szczelina • 🗺️ Portal) i wciśnij [F]
                    </span>
                    {(dps > 0 || maxCrit > 0) && (
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 999,
                          background: 'rgba(14, 116, 144, 0.45)',
                          border: '1.5px solid #38bdf8',
                          color: '#fde047',
                          fontWeight: 900,
                        }}
                      >
                        🎯 MANEKIN DPS: {dps.toLocaleString()}/s • 💥 Max Kryt: {maxCrit.toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (snapshot?.riftFloor || 0) > 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#e879f9', letterSpacing: 1 }}>
                🌀 SZCZELINA CHAOSU (ENDGAME) • PIĘTRO {snapshot?.riftFloor} • ⏱️{' '}
                {formatRiftTime(Math.max(0, now - (snapshot?.riftStartedAt || now)))}
              </div>
              <div className="comic-title" style={{ fontSize: 22, color: '#fff', lineHeight: 1.1 }}>
                Szczelina Chaosu — Poziom {snapshot?.riftFloor}
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12 }}>
                <span>⚔️ Wrogowie: {snapshot?.enemiesRemaining}/{snapshot?.totalEnemies}</span>
                <span style={{ color: snapshot?.exitUnlocked ? '#4ade80' : '#f472b6', fontWeight: 900 }}>
                  {snapshot?.exitUnlocked ? '🌀 PORTAL NA KOLEJNE PIĘTRO OTWARTY!' : '👑 Pokonaj Strażnika Szczeliny'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: isGuildAct(loc.act) ? '#fbbf24' : loc.act >= 5 ? '#00f5d4' : '#fde047',
                  letterSpacing: 1,
                }}
              >
                {isGuildAct(loc.act)
                  ? `🏰 AKT GILDYJNY ${loc.act === 8 ? 'I' : 'II'} • LOKACJA ${loc.locationInAct}/15 • BOSS: 100% ODŁAMEK GILDII`
                  : `${loc.act >= 5 ? '🔥 HARDCORE • ' : ''}AKT ${loc.act} • LOKACJA ${loc.locationInAct}/15 (#${loc.globalIndex}/105) • ${
                      loc.act >= 5
                        ? `PT BOSS: ${Math.round(room.bossHpMultiplier * 100)}% / MOB: ${Math.round(room.enemyCountMultiplier * 100)}%`
                        : `SKALA DRUŻYNY: ${Math.round(room.enemyCountMultiplier * 100)}%`
                    }`}
              </div>
              <div className="comic-title" style={{ fontSize: 22, color: '#fff', lineHeight: 1.1 }}>
                {loc.name}
              </div>
              {(() => {
                const mut = LOCATION_MUTATORS[snapshot?.mutatorId ?? loc.mutatorId];
                const blessing = getDailyBlessing();
                const isFeatured = getDailyFeaturedLocation().globalLocation === loc.globalIndex;
                const goblinRem =
                  snapshot?.goblinAlive && snapshot.goblinDespawnAt
                    ? Math.max(0, Math.ceil((snapshot.goblinDespawnAt - now) / 1000))
                    : 0;
                const altarRem =
                  snapshot?.obelisk?.state === 'active' && snapshot.obelisk.endsAt
                    ? Math.max(0, Math.ceil((snapshot.obelisk.endsAt - now) / 1000))
                    : 0;
                return (
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 10px',
                        borderRadius: 999,
                        background: 'rgba(15, 18, 33, 0.82)',
                        border: `1.5px solid ${mut.color}`,
                        fontSize: 11,
                        fontWeight: 900,
                        color: mut.color,
                      }}
                      title={mut.shortDesc}
                    >
                      <span>
                        {mut.icon} {mut.name.toUpperCase()}
                      </span>
                      <span style={{ color: '#e2e8f0', fontSize: 10 }}>+{mut.xpBonusPct}% XP</span>
                    </div>
                    {snapshot?.goblinAlive && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: 'rgba(202, 138, 4, 0.35)',
                          border: '1.5px solid #fde047',
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: '#fef08a',
                        }}
                      >
                        💰 GOBLIN SKARBNIK{goblinRem > 0 ? `: ${goblinRem}s!` : '!'}
                      </div>
                    )}
                    {snapshot?.obelisk?.state === 'active' && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: 'rgba(190, 18, 60, 0.45)',
                          border: '1.5px solid #fb7185',
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: '#fecdd3',
                        }}
                      >
                        🔮 PRZEKLĘTY OŁTARZ: {altarRem > 0 ? `${altarRem}s` : `FALA ${snapshot.obelisk.currentWave}/${snapshot.obelisk.maxWaves}`}
                      </div>
                    )}
                    <div
                      title={`Błogosławieństwo Dnia (${blessing.dayName}): ${blessing.summary}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 9px',
                        borderRadius: 999,
                        background: 'rgba(15, 18, 33, 0.82)',
                        border: `1.5px solid ${blessing.color}`,
                        fontSize: 10.5,
                        fontWeight: 900,
                        color: blessing.color,
                      }}
                    >
                      <span>{blessing.icon} {blessing.name}</span>
                    </div>
                    {isFeatured && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: 'rgba(234, 88, 12, 0.4)',
                          border: '1.5px solid #fb923c',
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: '#fef08a',
                        }}
                      >
                        🔥 WYPRAWA DNIA 2× XP
                      </div>
                    )}
                  </div>
                );
              })()}
              {snapshot && (
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>⚔️ Wrogowie: {snapshot.enemiesRemaining}/{snapshot.totalEnemies}</span>
                  <span>
                    🧩 Zagadka:{' '}
                    <strong style={{ color: snapshot.puzzles.every((p) => p.solved) ? '#4ade80' : '#38bdf8' }}>
                      {snapshot.puzzles.every((p) => p.solved) ? 'OTWARTA ✓' : 'ZABLOKOWANA'}
                    </strong>
                  </span>
                  <span>
                    🔐 Skrzynie: {snapshot.chests.filter((c) => c.opened).length}/{snapshot.chests.length}
                  </span>
                  <span>
                    🗝️ Sekrety: {snapshot.secrets.filter((s) => s.revealed).length}/{snapshot.secrets.length}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Active Combat Buff Pills (Mentor, Perfect Dodge, Fairy Barrier, Altar Buff) */}
          {localPlayer && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {localPlayer.isMentor && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(2, 132, 199, 0.4)',
                    border: '1.5px solid #38bdf8',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#e0f2fe',
                  }}
                >
                  🎓 TRYB MENTORA (Skalowany ➔ Odłamki Mentora!)
                </span>
              )}
              {(localPlayer.perfectDodgeBuffUntil || 0) > now && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(234, 179, 8, 0.38)',
                    border: '1.5px solid #fde047',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#fef08a',
                  }}
                >
                  ⚡ PERFEKCYJNY UNIK: +25% DMG ({(((localPlayer.perfectDodgeBuffUntil || 0) - now) / 1000).toFixed(1)}s)
                </span>
              )}
              {(localPlayer.lightBarrierUntil || 0) > now && localPlayer.shield > 0 && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(56, 189, 248, 0.3)',
                    border: '1.5px solid #38bdf8',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#bae6fd',
                  }}
                >
                  🪽 Bariera Światła: +15% ASPD
                </span>
              )}
              {(localPlayer.altarBuffUntil || 0) > now && localPlayer.altarBuffLabel && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(168, 85, 247, 0.36)',
                    border: '1.5px solid #c084fc',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#f5d0fe',
                  }}
                >
                  ✨ {localPlayer.altarBuffLabel} ({Math.ceil(((localPlayer.altarBuffUntil || 0) - now) / 1000)}s)
                </span>
              )}
              {(snapshot?.pactHeat || 0) > 0 && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(190, 18, 60, 0.45)',
                    border: '1.5px solid #fb7185',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#fecdd3',
                  }}
                >
                  🔥 PAKT CHAOSU: ŻAR {snapshot?.pactHeat}
                  {snapshot?.pactTimerEndsAt && snapshot.pactTimerEndsAt > now
                    ? ` • ⏳ ${formatRiftTime(snapshot.pactTimerEndsAt - now)}`
                    : ''}
                </span>
              )}
              {(localPlayer.runEssence || 0) > 0 && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(88, 28, 135, 0.48)',
                    border: '1.5px solid #e879f9',
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: '#f5d0fe',
                  }}
                  title="Esencja Chaosu — wydaj u Wędrownego Kupca Charona [F]"
                >
                  🔮 {localPlayer.runEssence} Esencji
                </span>
              )}
            </div>
          )}
        </div>

        {/* Active Boss / Mini-Boss Giant Comic HP Bar + Yellow Stagger Bar */}
        {activeBoss && (
          <div
            className="comic-panel"
            style={{
              width: '100%',
              padding: '8px 14px',
              borderColor:
                (activeBoss.staggerBrokenUntil || 0) > now
                  ? '#fde047'
                  : activeBoss.tier === 'boss'
                    ? '#f43f5e'
                    : '#f59e0b',
              background: 'linear-gradient(180deg, #3b0d1f 0%, #1a0b15 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span className="comic-title" style={{ fontSize: 20, color: '#fde047' }}>
                {activeBoss.tier === 'boss' ? '👑 ' : '💀 '}
                {activeBoss.name}
                {activeBoss.tier === 'boss' && (activeBoss.bossPhase || 1) > 1 && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      background: activeBoss.bossPhase === 3 ? '#e11d48' : '#ea580c',
                      color: '#fff',
                      padding: '1px 7px',
                      borderRadius: 7,
                      verticalAlign: 'middle',
                    }}
                  >
                    FAZA {activeBoss.bossPhase === 3 ? 'III' : 'II'}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#fecdd3' }}>
                {activeBoss.hp.toLocaleString()} / {activeBoss.maxHp.toLocaleString()} HP
              </span>
            </div>
            <div
              style={{
                position: 'relative',
                height: 18,
                background: '#111118',
                border: '2.5px solid #000',
                borderRadius: 9,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, (activeBoss.hp / Math.max(1, activeBoss.maxHp)) * 100)}%`,
                  height: '100%',
                  background:
                    activeBoss.tier === 'boss'
                      ? 'linear-gradient(90deg, #e11d48, #f97316)'
                      : 'linear-gradient(90deg, #d97706, #fbbf24)',
                  transition: 'width 0.1s',
                }}
              />
              {activeBoss.shield > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${Math.min(100, (activeBoss.shield / Math.max(1, activeBoss.maxShield || activeBoss.maxHp * 0.2)) * 100)}%`,
                    height: '100%',
                    background: 'rgba(52, 211, 153, 0.78)',
                  }}
                />
              )}
            </div>

            {/* Yellow Stagger Bar (Pasek Przełamania) */}
            {(activeBoss.maxStagger || 0) > 0 && (
              <div style={{ marginTop: 5 }}>
                <div
                  style={{
                    position: 'relative',
                    height: 12,
                    background: '#111118',
                    border: '2px solid #000',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  {(activeBoss.staggerBrokenUntil || 0) > now ? (
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, (((activeBoss.staggerBrokenUntil || 0) - now) / 4000) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b, #fef08a, #f97316)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, ((activeBoss.stagger || 0) / Math.max(1, activeBoss.maxStagger || 1)) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ca8a04, #fde047)',
                        transition: 'width 0.1s',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      fontSize: 9,
                      fontWeight: 900,
                      color: (activeBoss.staggerBrokenUntil || 0) > now ? '#111118' : '#fef9c3',
                      textShadow: (activeBoss.staggerBrokenUntil || 0) > now ? 'none' : '1px 1px 0 #111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(activeBoss.staggerBrokenUntil || 0) > now
                      ? `💫 PRZEŁAMANIE! OGŁUSZONY • 150% DMG (${(((activeBoss.staggerBrokenUntil || 0) - now) / 1000).toFixed(1)}s)`
                      : `⚡ PRZEŁAMANIE: ${Math.round(activeBoss.stagger || 0)} / ${Math.round(activeBoss.maxStagger || 0)}`}
                  </div>
                </div>
              </div>
            )}

            {/* Warlock Curse Primer Indicator on Boss */}
            {(activeBoss.cursedUntil || 0) > now && (
              <div
                style={{
                  marginTop: 4,
                  textAlign: 'center',
                  fontSize: 10.5,
                  fontWeight: 900,
                  color: '#e9d5ff',
                  background: 'rgba(126, 34, 206, 0.45)',
                  borderRadius: 6,
                  padding: '1px 8px',
                }}
              >
                🟣 KLĄTWA CZARNOKSIĘŻNIKA — Traf Wojownikiem, aby zdetonować WYBUCH CIENIA!
              </div>
            )}

            {activeBoss.castingAbility && (
              <div
                style={{
                  marginTop: 5,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#fef08a',
                  background: 'rgba(225, 29, 72, 0.45)',
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
              >
                ⚠️ UMIEJĘTNOŚĆ BOSSA: {activeBoss.castingAbility.name.toUpperCase()}!
              </div>
            )}
          </div>
        )}
      </div>

      {/* KILL-STREAK COMBO / FRENZY METER (x10 / x25 / x50 / x100) */}
      {snapshot && snapshot.comboCount >= 2 && snapshot.comboExpiresAt > now && (
        <div
          className="comic-panel-sm"
          style={{
            position: 'absolute',
            right: 16,
            top: 305,
            padding: '8px 14px',
            borderColor:
              snapshot.comboCount >= 100
                ? '#00f5d4'
                : snapshot.comboCount >= 50
                  ? '#f43f5e'
                  : snapshot.comboCount >= 25
                    ? '#f59e0b'
                    : snapshot.comboCount >= 10
                      ? '#fde047'
                      : '#94a3b8',
            background: 'linear-gradient(135deg, rgba(40, 14, 48, 0.92), rgba(17, 20, 38, 0.92))',
            minWidth: 192,
            textAlign: 'right',
          }}
        >
          <div
            className="comic-title"
            style={{
              fontSize: 26,
              lineHeight: 1,
              color:
                snapshot.comboCount >= 100
                  ? '#00f5d4'
                  : snapshot.comboCount >= 50
                    ? '#fb7185'
                    : snapshot.comboCount >= 25
                      ? '#fb923c'
                      : '#fde047',
            }}
          >
            {snapshot.comboCount >= 100
              ? '💎 '
              : snapshot.comboCount >= 50
                ? '👑 '
                : snapshot.comboCount >= 25
                  ? '💀 '
                  : snapshot.comboCount >= 10
                    ? '⚡ '
                    : '🔥 '}
            {snapshot.comboCount}x SERIA!
          </div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#86efac', marginTop: 2 }}>
            {(snapshot.comboMoveSpeedPct || 0) > 0 || (snapshot.comboMagicFindPct || 0) > 0
              ? `+${snapshot.comboMoveSpeedPct || 0}% Ruch • +${snapshot.comboMagicFindPct || 0}% Drop`
              : 'Dobij x10 po +4% Ruch & +2% Drop!'}
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#cbd5e1', marginTop: 1 }}>
            +{Math.min(40, snapshot.comboCount * 2)}% ASPD • +{Math.min(50, snapshot.comboCount * 3)}% XP
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
            {[10, 25, 50, 100].map((tier) => (
              <span
                key={tier}
                style={{
                  fontSize: 8.5,
                  fontWeight: 900,
                  padding: '0 4px',
                  borderRadius: 4,
                  background: snapshot.comboCount >= tier ? '#fde047' : 'rgba(255,255,255,0.08)',
                  color: snapshot.comboCount >= tier ? '#111118' : '#64748b',
                }}
              >
                x{tier}
              </span>
            ))}
          </div>
          <div
            style={{
              height: 5,
              marginTop: 5,
              background: '#0f1221',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, ((snapshot.comboExpiresAt - now) / 5000) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
              }}
            />
          </div>
        </div>
      )}

      {/* ACTIVE CHAOS / ELEMENTAL / DUO BOONS & EVOLUTIONS BAR */}
      {localPlayer &&
        ((localPlayer.activeBoons && localPlayer.activeBoons.length > 0) ||
          (localPlayer.elementalBoons && localPlayer.elementalBoons.length > 0) ||
          (localPlayer.duoBoons && localPlayer.duoBoons.length > 0) ||
          (localPlayer.skillEvolutions && localPlayer.skillEvolutions.length > 0)) && (
        <div
          style={{
            position: 'absolute',
            bottom: 138,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '90vw',
            pointerEvents: 'auto',
          }}
        >
          {(localPlayer.duoBoons || []).map((did) => {
            const d = DUO_BOONS[did];
            if (!d) return null;
            return (
              <div
                key={did}
                title={`${d.name}: ${d.description}`}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, rgba(126,34,206,0.92), rgba(180,83,9,0.92))',
                  border: '2px solid #fde047',
                  fontSize: 11,
                  fontWeight: 900,
                  color: '#fef08a',
                }}
              >
                {d.icon} {d.name}
              </div>
            );
          })}
          {(localPlayer.skillEvolutions || []).map((eid) => {
            const ev = SKILL_EVOLUTIONS[eid];
            if (!ev) return null;
            return (
              <div
                key={eid}
                title={`Ewolucja: ${ev.name} — ${ev.description}`}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(16, 18, 34, 0.92)',
                  border: `2px solid ${ev.color}`,
                  fontSize: 11,
                  fontWeight: 900,
                  color: ev.color,
                }}
              >
                {ev.icon} {ev.name}
              </div>
            );
          })}
          {(localPlayer.elementalBoons || []).map((eb) => {
            const def = ELEMENTAL_BOONS[eb.id];
            if (!def) return null;
            return (
              <div
                key={eb.id}
                title={`${def.name} (${eb.rarity}): ${def.description(eb.rarity)}`}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(16, 18, 34, 0.9)',
                  border: `2px solid ${def.color}`,
                  fontSize: 11,
                  fontWeight: 900,
                  color: def.color,
                }}
              >
                {def.icon} {def.name}
              </div>
            );
          })}
          {(localPlayer.activeBoons || []).map((bid) => {
            const b = CHAOS_BOONS[bid];
            if (!b) return null;
            return (
              <div
                key={bid}
                title={`${b.name}: ${b.description}`}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(16, 18, 34, 0.9)',
                  border: `2px solid ${b.color}`,
                  fontSize: 11,
                  fontWeight: 900,
                  color: b.color,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                }}
              >
                {b.icon} {b.name}
              </div>
            );
          })}
        </div>
      )}

      {/* TOP-RIGHT: Minimap + Quick Controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          pointerEvents: 'auto',
        }}
      >
        <div className="comic-panel-sm" style={{ padding: 6 }}>
          <canvas
            ref={minimapRef}
            width={164}
            height={164}
            style={{ display: 'block', borderRadius: 6, border: '2px solid #111118' }}
          />
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4, fontWeight: 700 }}>
            🟡 Ty • 🔵 Sojusznik • 🟠 Skrzynia • 🌀 Portal
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!snapshot?.isCamp && onEnterCamp && (
            <button
              className="comic-btn comic-btn-gold"
              onClick={onEnterCamp}
              title="Wróć do Wspólnego Obozu 3D (Kowal, Manekin DPS, Runy, Szczelina)"
              style={{ padding: '5px 10px', fontSize: 12 }}
            >
              🏕️ Obóz
            </button>
          )}
          <button
            className="comic-btn comic-btn-dark"
            onClick={onToggleMute}
            style={{ padding: '5px 10px', fontSize: 12 }}
          >
            {muted ? '🔇 Wyciszony' : '🔊 Dźwięk'}
          </button>
          <button
            className="comic-btn comic-btn-red"
            onClick={onLeaveToLobby}
            title="Powrót do Menu Głównego"
            style={{ padding: '5px 10px', fontSize: 12 }}
          >
            🏠 Menu
          </button>
        </div>

        {/* Dynamic Act Music Track Strip (3 Tracks per Act + Next Track + Volume) */}
        {currentTrack && (
          <div
            className="comic-panel-sm"
            style={{
              padding: '6px 9px',
              width: 178,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              borderColor: '#6366f1',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#fde047',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${currentTrack.title} (${currentTrack.bpm} BPM)`}
              >
                🎵 {currentTrack.act > 0 ? `(${currentTrack.indexInAct}/3) ` : ''}
                {currentTrack.title}
              </div>
              {currentTrack.act > 0 && onNextTrack && (
                <button
                  className="comic-btn comic-btn-dark"
                  onClick={onNextTrack}
                  title="Przełącz na następny utwór tego Aktu (3 utwory/Akt)"
                  style={{ padding: '1px 6px', fontSize: 10, flexShrink: 0 }}
                >
                  ⏭
                </button>
              )}
            </div>
            {onMusicVolumeChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800 }}>Głośn.</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : musicVolume}
                  onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#fbbf24', height: 4, cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Interact Hint */}
      {interactHint && (
        <div
          className="comic-panel-sm"
          style={{
            position: 'absolute',
            bottom: 146,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '7px 16px',
            background: 'rgba(250, 204, 21, 0.95)',
            color: '#111118',
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {interactHint}
        </div>
      )}

      {/* BOTTOM-CENTER: Comic Action Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          width: 'min(880px, 96vw)',
        }}
      >
        <div className="comic-panel" style={{ padding: '10px 14px', position: 'relative' }}>
          {/* Co-op Quick Comic Emotes Strip (top-right above HUD) */}
          {onSendEmote && (
            <div
              style={{
                position: 'absolute',
                top: -32,
                right: 12,
                display: 'flex',
                gap: 4,
              }}
            >
              {COOP_EMOTES.map((em) => (
                <button
                  key={em.label}
                  className="comic-btn comic-btn-dark"
                  onClick={() => onSendEmote(em.label)}
                  title={`Wyślij emotkę drużynie: ${em.label}`}
                  style={{
                    padding: '2px 7px',
                    fontSize: 13,
                    borderRadius: 9,
                  }}
                >
                  {em.icon}
                </button>
              ))}
            </div>
          )}

          {/* Active Set Bonus Pill if active */}
          {localPlayer?.activeSetRarity && (
            <div
              style={{
                position: 'absolute',
                top: -15,
                left: 16,
                background: RARITY_META[localPlayer.activeSetRarity].badgeBg,
                border: '2px solid #111118',
                borderRadius: 8,
                padding: '1px 10px',
                fontSize: 11,
                fontWeight: 900,
                color: '#fff',
              }}
            >
              ✨ KOMPLETNY ZESTAW {RARITY_META[localPlayer.activeSetRarity].name.toUpperCase()} (6/6)
            </div>
          )}

          {/* HP / Shield & Mana Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                position: 'relative',
                height: 22,
                background: '#0f1221',
                border: '2.5px solid #111118',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${
                    localPlayer ? Math.max(0, (localPlayer.hp / Math.max(1, localPlayer.maxHp)) * 100) : 100
                  }%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                  transition: 'width 0.1s',
                }}
              />
              {localPlayer && localPlayer.shield > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${Math.min(100, (localPlayer.shield / Math.max(1, localPlayer.maxHp)) * 100)}%`,
                    background: 'rgba(56, 189, 248, 0.72)',
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  textShadow: '1px 1px 0 #111',
                }}
              >
                ❤️ HP: {localPlayer ? `${localPlayer.hp} / ${localPlayer.maxHp}` : '...'}
                {localPlayer && localPlayer.shield > 0 ? ` (+${localPlayer.shield} Tarcza)` : ''}
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                height: 22,
                background: '#0f1221',
                border: '2.5px solid #111118',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${
                    localPlayer
                      ? Math.max(0, (localPlayer.mana / Math.max(1, localPlayer.maxMana)) * 100)
                      : 100
                  }%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                  transition: 'width 0.1s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  textShadow: '1px 1px 0 #111',
                }}
              >
                💧 MANA: {localPlayer ? `${localPlayer.mana} / ${localPlayer.maxMana}` : '...'}
              </div>
            </div>
          </div>

          {/* Skills + Passives + Panel Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            {/* 3 Active Skills */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {cls.actives.map((sk) => {
                const cdUntil = skillCooldowns[sk.slot] || 0;
                const remSec = Math.max(0, (cdUntil - now) / 1000);
                const rank = profile.skillRanks[sk.slot] || 1;
                return (
                  <button
                    key={sk.id}
                    onClick={() => onCastSkill(sk.slot)}
                    title={`${sk.name} (Poz. ${rank}) — ${sk.description} | Koszt: ${sk.manaCost} Many | CD: ${sk.cooldown}s`}
                    className="comic-btn"
                    style={{
                      position: 'relative',
                      width: 66,
                      height: 58,
                      flexDirection: 'column',
                      background: remSec > 0 ? '#1e2238' : sk.color,
                      color: '#fff',
                      padding: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{sk.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 900, textShadow: '1px 1px 0 #111' }}>
                      {sk.keyLabel}
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 4,
                        fontSize: 9,
                        fontWeight: 900,
                        color: '#fef08a',
                      }}
                    >
                      P.{rank}
                    </span>
                    {remSec > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(10,12,24,0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 17,
                          fontWeight: 900,
                          color: '#fde047',
                        }}
                      >
                        {remSec.toFixed(1)}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Tactical Health Potion [4 / V] */}
              {(() => {
                const potRem = Math.max(0, ((localPlayer?.potionReadyAt || 0) - now) / 1000);
                return (
                  <button
                    onClick={onUsePotion}
                    title="Mikstura Zdrowia [4 / V] — przywraca 32% Max HP (CD: 16 s)"
                    className="comic-btn"
                    style={{
                      position: 'relative',
                      width: 54,
                      height: 58,
                      flexDirection: 'column',
                      background: potRem > 0 ? '#1e2238' : '#15803d',
                      color: '#fff',
                      padding: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 21, lineHeight: 1 }}>🧪</span>
                    <span style={{ fontSize: 10, fontWeight: 900, textShadow: '1px 1px 0 #111' }}>
                      4 / V
                    </span>
                    {potRem > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(10,12,24,0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 15,
                          fontWeight: 900,
                          color: '#4ade80',
                        }}
                      >
                        {potRem.toFixed(0)}s
                      </div>
                    )}
                  </button>
                );
              })()}

              {/* Gniew Chaosu — Ultimate [T / 5] (50% Quick / 100% Full + Co-op Team Resonance!) */}
              {(() => {
                const fury = Math.round(localPlayer?.fury || 0);
                const ult = CLASS_ULTIMATES[profile.classId];
                const ready50 = fury >= 50;
                const ready100 = fury >= 100;
                return (
                  <button
                    onClick={() => onCastUltimate?.()}
                    disabled={!ready50}
                    title={`${ult.icon} ULTIMATE: ${ult.name} [T / 5] — ${ult.shortDesc} (50% = Szybki, 100% = Pełny, 2× w 3.5s = WSPÓLNY ULTIMATE!)`}
                    className={`comic-btn ${ready100 ? 'boski-shimmer' : ''}`}
                    style={{
                      position: 'relative',
                      width: 66,
                      height: 58,
                      flexDirection: 'column',
                      background: ready100
                        ? `linear-gradient(135deg, ${ult.color}, #f59e0b)`
                        : ready50
                          ? ult.color
                          : '#1e2238',
                      borderColor: ready100 ? '#fde047' : ready50 ? '#fbbf24' : '#334155',
                      color: '#fff',
                      padding: 2,
                      overflow: 'hidden',
                      opacity: ready50 ? 1 : 0.72,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${fury}%`,
                        background: ready100 ? 'rgba(254, 240, 138, 0.25)' : 'rgba(251, 191, 36, 0.28)',
                        pointerEvents: 'none',
                      }}
                    />
                    <span style={{ fontSize: 19, lineHeight: 1, zIndex: 1 }}>{ult.icon}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 900, textShadow: '1px 1px 0 #111', zIndex: 1 }}>
                      {ready100 ? '🔥 MAX!' : `${fury}%`}
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 4,
                        fontSize: 9,
                        fontWeight: 900,
                        color: '#fef08a',
                      }}
                    >
                      T/5
                    </span>
                  </button>
                );
              })()}

              {/* 2 Passive Icons */}
              <div style={{ display: 'flex', gap: 5, marginLeft: 4 }}>
                {cls.passives.map((ps, idx) => {
                  const r = profile.skillRanks[ps.slot] || 0;
                  return (
                    <div
                      key={ps.id}
                      onMouseEnter={() => setHoveredPassive(idx)}
                      onMouseLeave={() => setHoveredPassive(null)}
                      style={{
                        position: 'relative',
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        border: '2.5px solid #111118',
                        background: r > 0 ? ps.color : '#22263e',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{ps.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 900 }}>P.{r}</span>
                      {hoveredPassive === idx && (
                        <div
                          className="comic-panel-sm"
                          style={{
                            position: 'absolute',
                            bottom: 52,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 220,
                            padding: 8,
                            fontSize: 11,
                            zIndex: 40,
                          }}
                        >
                          <div style={{ fontWeight: 900, color: '#fde047' }}>{ps.name} (Pasywna)</div>
                          <div style={{ color: '#cbd5e1', marginTop: 2 }}>{ps.description}</div>
                          <div style={{ color: '#4ade80', fontWeight: 800, marginTop: 3 }}>
                            Aktywnie: {ps.perRankSummary(r)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UI Panel Buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className="comic-btn comic-btn-dark"
                onClick={() => onOpenPanel('inventory')}
                style={{ padding: '8px 10px', fontSize: 12 }}
              >
                🎒 [I] Ekwipunek ({profile.inventory.length})
              </button>
              <button
                className="comic-btn comic-btn-purple"
                onClick={() => onOpenPanel('skills')}
                style={{ padding: '8px 10px', fontSize: 12, position: 'relative' }}
              >
                ⭐ [K] Skille
                {profile.skillPoints > 0 && (
                  <span
                    style={{
                      background: '#fde047',
                      color: '#111',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    +{profile.skillPoints}
                  </span>
                )}
              </button>
              <button
                className="comic-btn comic-btn-gold"
                onClick={() => onOpenPanel('blacksmith')}
                style={{ padding: '8px 10px', fontSize: 12 }}
              >
                🔨 [B] Kowal
              </button>
              <button
                className="comic-btn comic-btn-green"
                onClick={() => onOpenPanel('runes')}
                style={{ padding: '8px 10px', fontSize: 12 }}
              >
                💠 [U] Runy
                {totalRuneShards > 0 && (
                  <span
                    style={{
                      background: '#111',
                      color: '#4ade80',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {totalRuneShards}
                  </span>
                )}
              </button>
              <button
                className="comic-btn comic-btn-blue"
                onClick={() => onOpenPanel('worldmap')}
                style={{ padding: '8px 10px', fontSize: 12 }}
              >
                🗺️ [M] Mapa
              </button>
              <button
                className="comic-btn comic-btn-gold"
                onClick={() => onOpenPanel('bounties')}
                style={{ padding: '8px 10px', fontSize: 12, position: 'relative' }}
                title="Misje Wyprawowe i Nagroda Dnia [J]"
              >
                🏆 [J] Misje
                {readyBountyCount > 0 && (
                  <span
                    style={{
                      background: '#22c55e',
                      color: '#052e16',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 900,
                      marginLeft: 4,
                    }}
                  >
                    {readyBountyCount}
                  </span>
                )}
              </button>
              <button
                className="comic-btn comic-btn-purple"
                onClick={() => onOpenPanel('guild')}
                style={{ padding: '8px 10px', fontSize: 12, position: 'relative', borderColor: '#fbbf24' }}
                title="Gildia, Rozwój i 2 Akty Gildyjne [G]"
              >
                {guild ? `${guild.emblem} [G] ${guild.tag}` : '🏰 [G] Gildia'}
                {getTotalGuildShards(guild) > 0 && (
                  <span
                    style={{
                      background: '#fde047',
                      color: '#111118',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 900,
                      marginLeft: 4,
                    }}
                  >
                    {getTotalGuildShards(guild)}
                  </span>
                )}
              </button>
              <button
                className="comic-btn comic-btn-purple"
                onClick={() => onOpenPanel('rift')}
                style={{ padding: '8px 10px', fontSize: 12, borderColor: '#e879f9' }}
                title="Szczelina Chaosu & Tablica Wyników [R]"
              >
                🌀 [R] Szczelina
              </button>
              <button
                className="comic-btn comic-btn-gold"
                onClick={() => onOpenPanel('prestige')}
                style={{ padding: '8px 10px', fontSize: 12 }}
                title="Prestiż: Tytuły, Aury i Ślady [P]"
              >
                👑 [P] Prestiż
              </button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#fde047', whiteSpace: 'nowrap' }}>
              POZ. {profile.level} / {MAX_LEVEL}
            </span>
            <div
              style={{
                flex: 1,
                height: 10,
                background: '#0f1221',
                border: '2px solid #111118',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${xpPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #a855f7, #fde047)',
                  transition: 'width 0.25s',
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {profile.level >= MAX_LEVEL
                ? 'MAX POZIOM!'
                : `${profile.xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
            </span>
            <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
              LPM: Kombo 1-2-3 • Spacja+LPM: Dash-Strike • T/5: Ultimate • E/F: Interakcja/Wskrześ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

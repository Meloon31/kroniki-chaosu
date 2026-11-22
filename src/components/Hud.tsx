import React, { useEffect, useRef, useState } from 'react';
import { CLASSES, MAX_LEVEL, xpToNextLevel } from '../../shared/classes';
import { RARITY_META } from '../../shared/items';
import { CHAOS_BOONS, LOCATION_MUTATORS } from '../../shared/mutators';
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
  | 'trade';

interface HudProps {
  profile: PlayerProfile;
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
  onToggleMute: () => void;
  onMusicVolumeChange?: (v: number) => void;
  onNextTrack?: () => void;
  onOpenPanel: (panel: ActivePanel) => void;
  onCastSkill: (slot: 'active1' | 'active2' | 'active3') => void;
  onUsePotion: () => void;
  onRequestTrade: (targetId: string) => void;
  onLeaveToLobby: () => void;
}

export const Hud: React.FC<HudProps> = ({
  profile,
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
  onToggleMute,
  onMusicVolumeChange,
  onNextTrack,
  onOpenPanel,
  onCastSkill,
  onUsePotion,
  onRequestTrade,
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
    profile.runeShards.malakor +
    profile.runeShards.azirath +
    profile.runeShards.sylvara +
    profile.runeShards.vaelgor;

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

    // Exit Portal
    ctx.fillStyle = snapshot.exitUnlocked ? '#22d3ee' : '#64748b';
    ctx.beginPath();
    ctx.arc(toX(mapData.exitPortal.x), toY(mapData.exitPortal.z), 4.2, 0, Math.PI * 2);
    ctx.fill();

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

    // Enemies (including Golden Goblin & Shield Totems!)
    for (const e of snapshot.enemies) {
      if (!e.alive || e.tier === 'root_trap' || e.tier === 'barrel') continue;
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

    // Players (Teammates + Local Hero)
    for (const p of snapshot.players) {
      const isMe = p.id === localPlayerId;
      ctx.fillStyle = isMe ? '#fde047' : '#38bdf8';
      ctx.strokeStyle = '#111118';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.z), isMe ? 4.2 : 3.5, 0, Math.PI * 2);
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

        {(snapshot?.players ?? []).map((p) => {
          const isMe = p.id === localPlayerId;
          const pCls = CLASSES[p.classId];
          const hpPct = Math.max(0, Math.min(100, (p.hp / Math.max(1, p.maxHp)) * 100));
          const shieldPct = Math.min(100, (p.shield / Math.max(1, p.maxHp)) * 100);
          return (
            <div
              key={p.id}
              className="comic-panel-sm"
              style={{
                padding: '7px 9px',
                borderColor: isMe ? '#fde047' : pCls.primaryColor,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>
                  {p.name}{' '}
                  <span style={{ color: pCls.primaryColor, fontSize: 11 }}>
                    ({pCls.name} • {p.level})
                  </span>
                </div>
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
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fde047', letterSpacing: 1 }}>
            AKT {loc.act} • LOKACJA {loc.locationInAct}/15 (#{loc.globalIndex}/60) • SKALA DRUŻYNY:{' '}
            {Math.round(room.enemyCountMultiplier * 100)}%
          </div>
          <div className="comic-title" style={{ fontSize: 22, color: '#fff', lineHeight: 1.1 }}>
            {loc.name}
          </div>
          {(() => {
            const mut = LOCATION_MUTATORS[snapshot?.mutatorId ?? loc.mutatorId];
            return (
              <div
                style={{
                  marginTop: 4,
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
                {snapshot?.goblinAlive && (
                  <span style={{ color: '#fde047', fontSize: 10 }}>• 💰 GOBLIN NA MAPIE!</span>
                )}
                {snapshot?.obelisk?.state === 'active' && (
                  <span style={{ color: '#fb7185', fontSize: 10 }}>
                    • 🔮 FALA {snapshot.obelisk.currentWave}/{snapshot.obelisk.maxWaves}
                  </span>
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
        </div>

        {/* Active Boss / Mini-Boss Giant Comic HP Bar */}
        {activeBoss && (
          <div
            className="comic-panel"
            style={{
              width: '100%',
              padding: '8px 14px',
              borderColor: activeBoss.tier === 'boss' ? '#f43f5e' : '#f59e0b',
              background: 'linear-gradient(180deg, #3b0d1f 0%, #1a0b15 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span className="comic-title" style={{ fontSize: 20, color: '#fde047' }}>
                {activeBoss.tier === 'boss' ? '👑 ' : '💀 '}
                {activeBoss.name}
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

      {/* KILL-STREAK COMBO COUNTER (Right-Center) */}
      {snapshot && snapshot.comboCount >= 2 && snapshot.comboExpiresAt > now && (
        <div
          className="comic-panel-sm"
          style={{
            position: 'absolute',
            right: 16,
            top: 305,
            padding: '8px 14px',
            borderColor:
              snapshot.comboCount >= 20
                ? '#f43f5e'
                : snapshot.comboCount >= 10
                  ? '#f59e0b'
                  : '#fbbf24',
            background: 'linear-gradient(135deg, rgba(40, 14, 48, 0.92), rgba(17, 20, 38, 0.92))',
            minWidth: 168,
            textAlign: 'right',
          }}
        >
          <div
            className="comic-title"
            style={{
              fontSize: 26,
              lineHeight: 1,
              color:
                snapshot.comboCount >= 20
                  ? '#fb7185'
                  : snapshot.comboCount >= 10
                    ? '#fb923c'
                    : '#fde047',
            }}
          >
            {snapshot.comboCount >= 30
              ? '👑 '
              : snapshot.comboCount >= 20
                ? '💀 '
                : snapshot.comboCount >= 10
                  ? '⚡ '
                  : '🔥 '}
            {snapshot.comboCount}x COMBO!
          </div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#e2e8f0', marginTop: 2 }}>
            +{Math.min(40, snapshot.comboCount * 2)}% ASPD • +{Math.min(50, snapshot.comboCount * 3)}% XP
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
                width: `${Math.max(0, Math.min(100, ((snapshot.comboExpiresAt - now) / 5500) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
              }}
            />
          </div>
        </div>
      )}

      {/* ACTIVE CHAOS BOONS BAR (Just above bottom action bar) */}
      {localPlayer && localPlayer.activeBoons && localPlayer.activeBoons.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 138,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            pointerEvents: 'auto',
          }}
        >
          {localPlayer.activeBoons.map((bid) => {
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

        <div style={{ display: 'flex', gap: 6 }}>
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
          width: 'min(760px, 95vw)',
        }}
      >
        <div className="comic-panel" style={{ padding: '10px 14px' }}>
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
              WASD: Ruch • LPM: Atak • Spacja: Unik • F: Interakcja
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

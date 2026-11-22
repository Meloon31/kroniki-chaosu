import React, { useState } from 'react';
import { getMainBossByAct } from '../../shared/bosses';
import {
  canSpinDailyWheel,
  countAllReadyRewards,
  getDailyBlessing,
  getDailyFeaturedLocation,
} from '../../shared/bounties';
import { CLASS_LIST, CLASSES } from '../../shared/classes';
import { getTotalGuildShards, GuildState, isGuildActClearedToday } from '../../shared/guilds';
import { getHardcoreUnlockProgress } from '../../shared/items';
import type { BountiesTab } from './BountiesModal';
import { computePlayerStats } from '../../shared/stats';
import { ACT_THEMES, ALL_LOCATIONS, getLocationDef, isHardcoreAct } from '../../shared/world';
import type { ActNumber, ClassId, PlayerProfile, RoomSummary } from '../../shared/types';
import { HeroShowcaseCanvas } from './HeroShowcaseCanvas';

interface LobbyScreenProps {
  profile: PlayerProfile;
  guild: GuildState | null;
  room: RoomSummary | null;
  connected: boolean;
  errorMsg: string | null;
  initialInviteCode: string;
  lanUrls: string[];
  serverUrl: string;
  onChangeServerUrl: (url: string) => void;
  onUpdateHero: (name: string, classId: ClassId) => void;
  onCreateRoom: (globalLocation: number) => void;
  onJoinRoom: (code: string) => void;
  onSelectLocation: (globalLocation: number) => void;
  onStartGame: (globalLocation: number) => void;
  onToggleSandbox: () => void;
  onOpenBounties: (tab?: BountiesTab) => void;
  onOpenGuild: () => void;
}

const CLASS_ICONS: Record<ClassId, string> = {
  wojownik: '⚔️',
  czarnoksieznik: '🔮',
  elf: '🏹',
  krasnolud: '🔨',
  wrozka: '🪽',
};

type ExpeditionTier = 'standard' | 'hardcore' | 'guild';

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  profile,
  guild,
  room,
  connected,
  errorMsg,
  initialInviteCode,
  lanUrls,
  serverUrl,
  onChangeServerUrl,
  onUpdateHero,
  onCreateRoom,
  onJoinRoom,
  onSelectLocation,
  onStartGame,
  onToggleSandbox,
  onOpenBounties,
  onOpenGuild,
}) => {
  const [joinCode, setJoinCode] = useState(initialInviteCode);
  const [serverDraft, setServerDraft] = useState(serverUrl);
  const [showServerBox, setShowServerBox] = useState(false);
  const [inspectTab, setInspectTab] = useState<'stats' | 'skills'>('stats');
  const [rightTab, setRightTab] = useState<'expedition' | 'party'>(
    initialInviteCode ? 'party' : 'expedition'
  );
  const [selectedAct, setSelectedAct] = useState<ActNumber>(
    getLocationDef(room?.globalLocation ?? 1).act
  );
  const [selectedLoc, setSelectedLoc] = useState<number>(room?.globalLocation ?? 1);
  const [copiedMode, setCopiedMode] = useState<'none' | 'code' | 'link'>('none');

  const selectedClass = CLASSES[profile.classId];
  const activeGlobalLoc = room ? room.globalLocation : selectedLoc;
  const activeLocDef = getLocationDef(activeGlobalLoc);
  const actBoss = getMainBossByAct(selectedAct);
  const heroStats = computePlayerStats(
    profile.classId,
    profile.level,
    profile.equipped,
    profile.skillRanks,
    profile.runes,
    0,
    guild?.upgrades
  );

  const rewardCounts = countAllReadyRewards(profile);
  const wheelReady = canSpinDailyWheel(profile.lastWheelSpinDate);
  const blessing = getDailyBlessing();
  const featured = getDailyFeaturedLocation();
  const featuredLoc = getLocationDef(featured.globalLocation);
  const hcProgress = getHardcoreUnlockProgress(profile);

  const currentTier: ExpeditionTier =
    selectedAct >= 8 ? 'guild' : isHardcoreAct(selectedAct) ? 'hardcore' : 'standard';

  const switchTier = (tier: ExpeditionTier) => {
    if (tier === 'standard') {
      setSelectedAct(1);
    } else if (tier === 'hardcore') {
      setSelectedAct(5);
    } else {
      setSelectedAct(8);
    }
  };

  const handleLocPick = (gIdx: number) => {
    setSelectedLoc(gIdx);
    if (room) onSelectLocation(gIdx);
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopiedMode('code');
    setTimeout(() => setCopiedMode('none'), 1600);
  };

  const copyInviteLink = () => {
    if (!room) return;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocalhost && lanUrls[0] ? lanUrls[0] : window.location.origin;
    const url = `${base}/?room=${room.code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedMode('link');
    setTimeout(() => setCopiedMode('none'), 2200);
  };

  const statBars = [
    { label: 'Zdrowie', value: `${selectedClass.baseHp}`, pct: Math.min(100, (selectedClass.baseHp / 200) * 100), color: '#34d399' },
    { label: 'Atak Fiz. (AD)', value: `${selectedClass.baseAd}`, pct: Math.min(100, (selectedClass.baseAd / 28) * 100), color: '#f87171' },
    { label: 'Atak Mag. (AP)', value: `${selectedClass.baseAp}`, pct: Math.min(100, (selectedClass.baseAp / 30) * 100), color: '#c084fc' },
    { label: 'Obrona (DEF)', value: `${selectedClass.baseDef}`, pct: Math.min(100, (selectedClass.baseDef / 24) * 100), color: '#60a5fa' },
    { label: 'Zwinność', value: `${selectedClass.baseMoveSpeed.toFixed(2)}×`, pct: Math.min(100, (selectedClass.baseMoveSpeed / 1.3) * 100), color: '#fbbf24' },
  ];

  const guildShardsTotal = guild ? getTotalGuildShards(guild) : 0;
  const guildActsRemaining = guild
    ? (isGuildActClearedToday(guild, 8) ? 0 : 1) + (isGuildActClearedToday(guild, 9) ? 0 : 1)
    : 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: `radial-gradient(circle at 50% 44%, ${selectedClass.primaryColor}33 0%, #161b34 45%, #090c18 100%)`,
        transition: 'background 0.45s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Warm atmospheric fantasy aurora lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 14% 14%, rgba(251, 191, 36, 0.12), transparent 45%), radial-gradient(ellipse at 86% 84%, rgba(56, 189, 248, 0.14), transparent 48%), radial-gradient(circle at 50% 50%, rgba(255, 244, 214, 0.04), transparent 62%)',
        }}
      />

      {/* =========================================================
          1. CLEAN MMO TOP HEADER BAR (ZERO CLUTTER!)
          ========================================================= */}
      <header
        className="mmo-topbar"
        style={{
          position: 'relative',
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 24px',
          gap: 16,
        }}
      >
        {/* Brand Crest */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 48%, #dc2626 100%)',
              border: '1.5px solid rgba(254, 240, 138, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 21,
              boxShadow: '0 6px 22px rgba(245, 158, 11, 0.42)',
            }}
          >
            ⚔️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                className="comic-title"
                style={{
                  fontSize: 25,
                  lineHeight: 1,
                  background: 'linear-gradient(90deg, #fffbeb 0%, #fde047 52%, #fb923c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                KRONIKI CHAOSU
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.09em',
                  color: '#fde68a',
                  background: 'rgba(251, 191, 36, 0.14)',
                  border: '1px solid rgba(251, 191, 36, 0.36)',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                MMO CO-OP 1–4
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
              9 Aktów • Hardcore +20 • Gildie • 5 Klas Bohaterów
            </div>
          </div>
        </div>

        {/* Center: Clean MMO Hero Identity & Combat Power */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="glass-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderColor: 'rgba(251, 191, 36, 0.32)',
            }}
          >
            {guild && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 900,
                  color: guild.color,
                  background: `${guild.color}22`,
                  padding: '1px 7px',
                  borderRadius: 99,
                }}
              >
                {guild.emblem} [{guild.tag}]
              </span>
            )}
            <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700 }}>Bohater:</span>
            <input
              type="text"
              value={profile.name}
              maxLength={18}
              onChange={(e) => onUpdateHero(e.target.value, profile.classId)}
              placeholder="Imię bohatera..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13.5,
                width: 126,
                outline: 'none',
                fontFamily: 'Outfit, sans-serif',
              }}
            />
          </div>

          <div
            className="glass-pill"
            style={{
              padding: '7px 15px',
              fontSize: 12.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              borderColor: 'rgba(255, 255, 255, 0.16)',
            }}
          >
            <span>
              Poz. <strong style={{ color: '#fde047' }}>{profile.level}</strong>
              <span style={{ color: '#64748b' }}>/60</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span>
              🔥 Moc <strong style={{ color: '#fb923c' }}>{heroStats.combatPower}</strong>
            </span>
          </div>
        </div>

        {/* Right: Server Connection Pill */}
        <button
          className="glass-pill"
          onClick={() => setShowServerBox((v) => !v)}
          style={{
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 800,
            color: connected ? '#34d399' : '#fbbf24',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderColor: connected ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.35)',
          }}
          title="Ustawienia serwera Co-op"
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: connected ? '#34d399' : '#fbbf24',
              boxShadow: connected ? '0 0 8px #34d399' : undefined,
            }}
          />
          {connected ? (serverUrl ? 'Serwer Zdalny' : 'Serwer Online') : 'Łączenie...'} ⚙️
        </button>
      </header>

      {/* Slide-down Server URL Configurator */}
      {showServerBox && (
        <div
          style={{
            position: 'relative',
            zIndex: 15,
            padding: '10px 24px',
            background: 'rgba(13, 17, 32, 0.96)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc' }}>🌐 Adres Serwera Co-op:</span>
          <input
            type="text"
            value={serverDraft}
            onChange={(e) => setServerDraft(e.target.value)}
            placeholder="Puste = lokalny, lub np. https://kroniki-chaosu.onrender.com"
            style={{
              flex: 1,
              minWidth: 260,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10,
              padding: '7px 12px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          />
          <button
            className="comic-btn comic-btn-blue"
            onClick={() => {
              onChangeServerUrl(serverDraft);
              setShowServerBox(false);
            }}
            style={{ padding: '7px 14px', fontSize: 12 }}
          >
            Połącz
          </button>
          <button
            className="comic-btn comic-btn-dark"
            onClick={() => {
              setServerDraft('');
              onChangeServerUrl('');
              setShowServerBox(false);
            }}
            style={{ padding: '7px 14px', fontSize: 12 }}
          >
            Lokalny
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            position: 'relative',
            zIndex: 15,
            margin: '8px 24px 0',
            padding: '8px 14px',
            borderRadius: 12,
            background: 'rgba(185, 28, 28, 0.28)',
            border: '1px solid rgba(248, 113, 113, 0.55)',
            color: '#fecaca',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* =========================================================
          2. MAIN 3-COLUMN MMO CHARACTER SELECT STAGE
          ========================================================= */}
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 345px) 1fr minmax(335px, 390px)',
          gap: 18,
          padding: '14px 24px',
          maxWidth: 1520,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* LEFT COLUMN: Classic MMO Vertical Class Roster + Tabbed Inspector */}
        <section
          className="mmo-panel"
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 6,
              borderBottom: '1px solid rgba(251, 191, 36, 0.18)',
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '0.1em', color: '#fde68a' }}>
              🛡️ KLASY BOHATERÓW
            </span>
            <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>5 klas</span>
          </div>

          {/* Vertical MMO Class Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CLASS_LIST.map((cls) => {
              const active = profile.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  className="mmo-roster-card"
                  onClick={() => onUpdateHero(profile.name, cls.id)}
                  style={
                    active
                      ? {
                          borderColor: cls.primaryColor,
                          background: `linear-gradient(90deg, ${cls.primaryColor}34 0%, rgba(18, 22, 40, 0.92) 78%)`,
                          boxShadow: `0 6px 22px ${cls.primaryColor}2e, inset 3px 0 0 ${cls.primaryColor}`,
                        }
                      : undefined
                  }
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: active ? `${cls.primaryColor}38` : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${active ? cls.primaryColor : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 19,
                      flexShrink: 0,
                    }}
                  >
                    {CLASS_ICONS[cls.id]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 900, color: active ? '#fff' : '#cbd5e1' }}>
                        {cls.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: cls.primaryColor,
                          background: `${cls.primaryColor}1f`,
                          padding: '2px 7px',
                          borderRadius: 99,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cls.role}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 1,
                      }}
                    >
                      {cls.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Compact MMO Class Inspector Tabs */}
          <div
            style={{
              background: 'rgba(10, 13, 25, 0.58)',
              borderRadius: 14,
              padding: 11,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`mmo-tab-btn ${inspectTab === 'stats' ? 'active' : ''}`}
                onClick={() => setInspectTab('stats')}
                style={{ padding: '6px 8px', fontSize: 11.5 }}
              >
                📊 Atrybuty
              </button>
              <button
                className={`mmo-tab-btn ${inspectTab === 'skills' ? 'active' : ''}`}
                onClick={() => setInspectTab('skills')}
                style={{ padding: '6px 8px', fontSize: 11.5 }}
              >
                ✨ Skille (3+2)
              </button>
            </div>

            {inspectTab === 'stats' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {statBars.map((sb) => (
                  <div
                    key={sb.label}
                    style={{ display: 'grid', gridTemplateColumns: '94px 1fr 44px', alignItems: 'center', gap: 8 }}
                  >
                    <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>{sb.label}</span>
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${sb.pct}%`,
                          height: '100%',
                          background: sb.color,
                          borderRadius: 99,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#f8fafc', textAlign: 'right' }}>
                      {sb.value}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 7,
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  <span>
                    Kryt bazowy: <strong style={{ color: '#fde047' }}>{selectedClass.baseCritChance}%</strong>
                  </span>
                  <span>
                    Zasięg: <strong style={{ color: selectedClass.primaryColor }}>{selectedClass.baseAttackRange.toFixed(1)}m</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingRight: 2 }}>
                {selectedClass.actives.map((sk) => (
                  <div
                    key={sk.id}
                    style={{
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10,
                      padding: '6px 9px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
                        {sk.icon} {sk.name}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fde047' }}>
                        [{sk.keyLabel}] {sk.cooldown}s
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                      {sk.description}
                    </div>
                  </div>
                ))}
                {selectedClass.passives.map((ps) => (
                  <div
                    key={ps.id}
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.18)',
                      borderRadius: 10,
                      padding: '6px 9px',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7dd3fc' }}>
                      {ps.icon} {ps.name} <span style={{ fontSize: 9.5, opacity: 0.8 }}>(Pasywna)</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                      {ps.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            CENTER STAGE: GRAND 3D MMO HERO PEDESTAL + PRIMARY PLAY CTA
            ========================================================= */}
        <section
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 0,
            padding: '4px 0',
          }}
        >
          {/* Floating MMO Hero Nameplate Banner */}
          <div style={{ textAlign: 'center', zIndex: 4, pointerEvents: 'none' }}>
            <div
              className="glass-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 16px',
                borderColor: `${selectedClass.primaryColor}66`,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 15 }}>{CLASS_ICONS[profile.classId]}</span>
              <span style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', letterSpacing: '0.03em' }}>
                {profile.name || 'Bohater'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.22)' }}>•</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: selectedClass.primaryColor }}>
                {selectedClass.name} ({selectedClass.role})
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              🖱️ Przeciągnij bohatera, aby obrócić 360°
            </div>
          </div>

          {/* Spacious Interactive 3D Hero Stage */}
          <div style={{ width: '100%', flex: 1, minHeight: 280 }}>
            <HeroShowcaseCanvas
              classId={profile.classId}
              weaponGlow={heroStats.weaponUpgradeGlow}
              armorGlow={heroStats.armorUpgradeGlow}
            />
          </div>

          {/* Grand Central MMO Play CTA */}
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              zIndex: 5,
            }}
          >
            {room ? (
              <>
                <button
                  className="mmo-play-cta"
                  onClick={() => onStartGame(activeGlobalLoc)}
                  style={{ width: '100%', padding: '15px 22px', fontSize: 18 }}
                >
                  ▶ ROZPOCZNIJ WYPRAWĘ
                </button>
                <div
                  className="glass-pill"
                  style={{
                    padding: '5px 14px',
                    fontSize: 11.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                  }}
                >
                  <span style={{ color: '#fde68a', fontWeight: 800 }}>
                    📍 Akt {activeLocDef.act} • #{activeLocDef.locationInAct} {activeLocDef.name}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <button
                    onClick={copyInviteLink}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7dd3fc',
                      fontWeight: 800,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {copiedMode === 'link' ? '✓ Skopiowano!' : `🔗 Pokój ${room.code} (${room.members.length}/4)`}
                  </button>
                </div>
              </>
            ) : (
              <>
                {initialInviteCode && (
                  <button
                    className="comic-btn comic-btn-green"
                    disabled={!connected}
                    onClick={() => onJoinRoom(initialInviteCode)}
                    style={{ width: '100%', padding: '11px 16px', fontSize: 14 }}
                  >
                    🤝 Dołącz do zaproszenia znajomego ({initialInviteCode})
                  </button>
                )}
                <button
                  className="mmo-play-cta"
                  disabled={!connected}
                  onClick={() => onCreateRoom(selectedLoc)}
                  style={{ width: '100%', padding: '15px 22px', fontSize: 17.5 }}
                >
                  ⚔️ WEJDŹ DO GRY (SOLO / CO-OP)
                </button>
                <div style={{ fontSize: 11.5, color: '#cbd5e1', fontWeight: 700 }}>
                  Cel wyprawy: <span style={{ color: '#fde68a' }}>Akt {activeLocDef.act} • {activeLocDef.name}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* =========================================================
            RIGHT COLUMN: CLEAN 2-TAB MMO EXPEDITION & PARTY PANEL
            ========================================================= */}
        <section
          className="mmo-panel"
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {/* Clean MMO Top Tabs */}
          <div style={{ display: 'flex', gap: 7 }}>
            <button
              className={`mmo-tab-btn ${rightTab === 'expedition' ? 'active' : ''}`}
              onClick={() => setRightTab('expedition')}
            >
              🗺️ Mapa Wypraw
            </button>
            <button
              className={`mmo-tab-btn ${rightTab === 'party' ? 'active' : ''}`}
              onClick={() => setRightTab('party')}
            >
              👥 Drużyna Co-op
              {room && (
                <span
                  style={{
                    background: '#22c55e',
                    color: '#052e16',
                    borderRadius: 99,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {room.members.length}/4
                </span>
              )}
            </button>
          </div>

          {rightTab === 'expedition' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {/* 3-Tier MMO Expedition Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <button
                  onClick={() => switchTier('standard')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: 10,
                    border: currentTier === 'standard' ? '1.5px solid #fde047' : '1px solid rgba(255,255,255,0.1)',
                    background: currentTier === 'standard' ? 'rgba(250, 204, 21, 0.22)' : 'rgba(255,255,255,0.03)',
                    color: currentTier === 'standard' ? '#fef08a' : '#94a3b8',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  ⚔️ Standard
                </button>
                <button
                  onClick={() => switchTier('hardcore')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: 10,
                    border: currentTier === 'hardcore' ? '1.5px solid #00f5d4' : '1px solid rgba(0,245,212,0.28)',
                    background:
                      currentTier === 'hardcore'
                        ? 'linear-gradient(135deg, rgba(0,245,212,0.26), rgba(168,85,247,0.24))'
                        : 'rgba(0,245,212,0.06)',
                    color: '#00f5d4',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  🔥 Hardcore {hcProgress.unlocked ? '' : '🔒'}
                </button>
                <button
                  onClick={() => switchTier('guild')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: 10,
                    border: currentTier === 'guild' ? '1.5px solid #34d399' : '1px solid rgba(52,211,153,0.28)',
                    background:
                      currentTier === 'guild'
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.28), rgba(251,191,36,0.2))'
                        : 'rgba(16,185,129,0.06)',
                    color: '#6ee7b7',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  🏰 Gildia
                </button>
              </div>

              {/* Hardcore Unlock Progress Notice */}
              {currentTier === 'hardcore' && !hcProgress.unlocked && (
                <div
                  style={{
                    padding: '9px 11px',
                    borderRadius: 11,
                    background: 'rgba(225, 29, 72, 0.16)',
                    border: '1px solid rgba(251, 113, 133, 0.45)',
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 900, color: '#fde047', marginBottom: 2 }}>
                    🔥 Wymagania Trybu Hardcore (Set Nieśmiertelny +20):
                  </div>
                  <div style={{ color: hcProgress.allNormalActsCleared ? '#4ade80' : '#fca5a5', fontWeight: 800 }}>
                    {hcProgress.allNormalActsCleared ? '✅' : '⏳'} Pokonaj Vaelgora (Akty 1–4)
                  </div>
                  <div style={{ color: hcProgress.boskiPlus13Slots >= 6 ? '#4ade80' : '#fef08a', fontWeight: 800 }}>
                    {hcProgress.boskiPlus13Slots >= 6 ? '✅' : '⏳'} Ekwipunek Boski +13: {hcProgress.boskiPlus13Slots}/6
                  </div>
                </div>
              )}

              {/* Guild Acts Notice */}
              {currentTier === 'guild' && (
                <div
                  style={{
                    padding: '9px 11px',
                    borderRadius: 11,
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  {guild ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: '#fde68a' }}>
                          {guild.emblem} [{guild.tag}] {guild.name}
                        </div>
                        <div style={{ color: '#a7f3d0', fontWeight: 700 }}>
                          Akt {selectedAct === 8 ? 'I' : 'II'}:{' '}
                          {isGuildActClearedToday(guild, selectedAct as 8 | 9)
                            ? '✅ Dziś ukończono'
                            : '🟢 Dostępny (100% Odłamek Gildii!)'}
                        </div>
                      </div>
                      <button
                        className="comic-btn comic-btn-gold"
                        onClick={onOpenGuild}
                        style={{ padding: '5px 10px', fontSize: 10.5 }}
                      >
                        🏰 Panel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#fde68a', fontWeight: 800 }}>
                        Dołącz lub załóż Gildię, aby zdobywać Odłamki Gildii!
                      </span>
                      <button
                        className="comic-btn comic-btn-green"
                        onClick={onOpenGuild}
                        style={{ padding: '5px 10px', fontSize: 10.5, flexShrink: 0 }}
                      >
                        🏰 Gildia
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Act Selector Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    currentTier === 'standard'
                      ? 'repeat(4, 1fr)'
                      : currentTier === 'hardcore'
                        ? 'repeat(3, 1fr)'
                        : 'repeat(2, 1fr)',
                  gap: 6,
                }}
              >
                {(currentTier === 'standard'
                  ? ([1, 2, 3, 4] as ActNumber[])
                  : currentTier === 'hardcore'
                    ? ([5, 6, 7] as ActNumber[])
                    : ([8, 9] as ActNumber[])
                ).map((act) => {
                  const active = selectedAct === act;
                  return (
                    <button
                      key={act}
                      onClick={() => setSelectedAct(act)}
                      style={{
                        padding: '7px 4px',
                        borderRadius: 10,
                        border: active
                          ? `1.5px solid ${ACT_THEMES[act].accentGlowColor}`
                          : '1px solid rgba(255,255,255,0.09)',
                        background: active ? `${ACT_THEMES[act].accentGlowColor}30` : 'rgba(255,255,255,0.035)',
                        color: active ? '#fff' : '#94a3b8',
                        fontWeight: 900,
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      {act === 8 ? '🏰 Gildia I' : act === 9 ? '🐉 Gildia II' : `Akt ${act}`}
                    </button>
                  );
                })}
              </div>

              {/* Act Title & Boss Subtitle */}
              <div
                style={{
                  background: 'rgba(10, 13, 25, 0.55)',
                  borderRadius: 11,
                  padding: '8px 11px',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 900, color: '#fff' }}>
                  {ACT_THEMES[selectedAct].name.replace(/^(HARDCORE |GILDIA )?Akt [1-9I]+: /, '')}
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                  Boss: <strong style={{ color: '#fb7185' }}>{actBoss.name}</strong> • {actBoss.recommendedGear}
                </div>
              </div>

              {/* 15-Location Clean MMO Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {ALL_LOCATIONS.filter((l) => l.act === selectedAct).map((loc) => {
                  const isHC = isHardcoreAct(loc.act);
                  const isGuildAct = loc.act >= 8;
                  const hcGateOk = !isHC || hcProgress.unlocked;
                  const guildGateOk = !isGuildAct || !!guild;
                  const unlocked =
                    profile.sandboxUnlockAll ||
                    (isGuildAct
                      ? guildGateOk
                      : hcGateOk &&
                        (loc.globalIndex <= profile.unlockedLocationGlobal ||
                          (loc.globalIndex === 61 && hcProgress.unlocked)));
                  const chosen = activeGlobalLoc === loc.globalIndex;
                  const isFeatured = featured.globalLocation === loc.globalIndex;

                  return (
                    <button
                      key={loc.globalIndex}
                      disabled={!unlocked}
                      onClick={() => handleLocPick(loc.globalIndex)}
                      title={`${loc.name}${isFeatured ? ' • WYPRAWA DNIA (2× XP!)' : ''}`}
                      style={{
                        position: 'relative',
                        padding: '8px 3px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.3,
                        border: chosen
                          ? '2px solid #fde047'
                          : isFeatured
                            ? '1.5px solid #fb923c'
                            : '1px solid rgba(255,255,255,0.09)',
                        background: chosen
                          ? 'linear-gradient(135deg, #fde047, #f59e0b)'
                          : loc.isMainBoss
                            ? 'rgba(225, 29, 72, 0.34)'
                            : loc.isMiniBoss
                              ? 'rgba(217, 119, 6, 0.3)'
                              : 'rgba(255,255,255,0.05)',
                        color: chosen ? '#1a1205' : '#f8fafc',
                      }}
                    >
                      {loc.isMainBoss ? '👑' : loc.isMiniBoss ? '💀' : ''}
                      {loc.locationInAct}
                      {isFeatured && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -4,
                            fontSize: 9,
                            background: '#fb923c',
                            color: '#111',
                            borderRadius: 99,
                            padding: '0 4px',
                            fontWeight: 900,
                          }}
                        >
                          2×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Destination & Compact Sandbox Unlock */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11.5, color: '#fde68a', fontWeight: 800, minWidth: 0 }}>
                  📍 #{activeLocDef.globalIndex} {activeLocDef.name}
                </div>
                <button
                  onClick={onToggleSandbox}
                  style={{
                    background: profile.sandboxUnlockAll ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255,255,255,0.06)',
                    border: profile.sandboxUnlockAll
                      ? '1px solid rgba(74, 222, 128, 0.45)'
                      : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 800,
                    color: profile.sandboxUnlockAll ? '#4ade80' : '#94a3b8',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Odblokuj wszystkie lokacje testowo"
                >
                  {profile.sandboxUnlockAll ? '🔓 135 Test' : '🔒 Test 135'}
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================
               PARTY / CO-OP TAB
               ========================================================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
              {!room ? (
                <>
                  <div
                    style={{
                      background: 'rgba(10, 13, 25, 0.55)',
                      borderRadius: 13,
                      padding: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 12,
                      color: '#cbd5e1',
                      lineHeight: 1.45,
                    }}
                  >
                    Stwórz własny pokój dla <strong>1–4 graczy</strong> lub wpisz kod zaproszenia znajomego, aby grać razem w Co-op!
                  </div>

                  <button
                    className="comic-btn comic-btn-gold"
                    disabled={!connected}
                    onClick={() => onCreateRoom(selectedLoc)}
                    style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
                  >
                    ✨ Utwórz Pokój Drużyny
                  </button>

                  <div style={{ display: 'flex', gap: 7 }}>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Kod pokoju (np. KRC4X9)"
                      maxLength={8}
                      style={{
                        flex: 1,
                        background: 'rgba(10, 13, 24, 0.78)',
                        border: '1.5px solid rgba(255,255,255,0.14)',
                        borderRadius: 11,
                        padding: '10px 12px',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13.5,
                        letterSpacing: 1.8,
                        textTransform: 'uppercase',
                        outline: 'none',
                      }}
                    />
                    <button
                      className="comic-btn comic-btn-blue"
                      disabled={!connected || joinCode.trim().length < 4}
                      onClick={() => onJoinRoom(joinCode)}
                      style={{ padding: '10px 16px', fontSize: 13 }}
                    >
                      Dołącz
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Invite Code & Share Links */}
                  <div
                    style={{
                      background: 'rgba(10, 13, 25, 0.7)',
                      border: '1.5px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: 14,
                      padding: '10px 13px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800 }}>KOD POKOJU</div>
                      <div style={{ fontSize: 23, fontWeight: 900, color: '#fde047', letterSpacing: 2.5 }}>
                        {room.code}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="comic-btn comic-btn-gold"
                        onClick={copyInviteLink}
                        style={{ padding: '7px 11px', fontSize: 11.5 }}
                      >
                        {copiedMode === 'link' ? '✓ Link!' : '🔗 Link'}
                      </button>
                      <button
                        className="comic-btn comic-btn-dark"
                        onClick={copyCode}
                        style={{ padding: '7px 11px', fontSize: 11.5 }}
                      >
                        {copiedMode === 'code' ? '✓ Kod!' : '📋 Kod'}
                      </button>
                    </div>
                  </div>

                  {/* 4 MMO Party Slots */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const m = room.members[slotIdx];
                      return (
                        <div
                          key={slotIdx}
                          style={{
                            background: m ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            border: m
                              ? `1.5px solid ${CLASSES[m.classId].primaryColor}88`
                              : '1px dashed rgba(255,255,255,0.12)',
                            borderRadius: 12,
                            padding: '9px 11px',
                          }}
                        >
                          {m ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 21 }}>{CLASS_ICONS[m.classId]}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 900, fontSize: 13, color: '#fff' }}>
                                  {m.isHost ? '👑 ' : ''}
                                  {m.name}
                                </div>
                                <div style={{ fontSize: 11, color: CLASSES[m.classId].primaryColor, fontWeight: 700 }}>
                                  {CLASSES[m.classId].name} • Poziom {m.level}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#4ade80' }}>● Gotowy</span>
                            </div>
                          ) : (
                            <div style={{ color: '#64748b', fontSize: 11.5, padding: '4px 2px', fontWeight: 600 }}>
                              + Wolne miejsce w drużynie #{slotIdx + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Party Scaling Bar */}
                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: 'rgba(10, 13, 25, 0.65)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 11,
                      padding: '8px 12px',
                      fontSize: 11.5,
                      color: '#cbd5e1',
                    }}
                  >
                    <span>
                      Moby <strong style={{ color: '#fbbf24' }}>{Math.round(room.enemyCountMultiplier * 100)}%</strong>
                    </span>
                    <span>
                      Boss HP <strong style={{ color: '#fb7185' }}>{Math.round(room.bossHpMultiplier * 100)}%</strong>
                    </span>
                    <span>
                      Boss DMG <strong style={{ color: '#fb923c' }}>{Math.round(room.bossDamageMultiplier * 100)}%</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {/* =========================================================
          3. SLEEK BOTTOM MMO FEATURE DOCK (GUILD / QUESTS / WHEEL / BLESSING)
          ========================================================= */}
      <footer
        className="mmo-dock"
        style={{
          position: 'relative',
          zIndex: 12,
          padding: '10px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1520,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {/* Dock 1: Guild */}
          <button
            className="mmo-dock-btn"
            onClick={onOpenGuild}
            style={{
              borderColor: guild ? `${guild.color}77` : 'rgba(251, 191, 36, 0.35)',
            }}
          >
            <span style={{ fontSize: 23 }}>{guild ? guild.emblem : '🏰'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: guild ? guild.color : '#fde68a' }}>
                  {guild ? `[${guild.tag}] Gildia` : 'Gildia'}
                </span>
                {guild && (guildShardsTotal > 0 || guildActsRemaining > 0) && (
                  <span
                    style={{
                      background: guildShardsTotal > 0 ? '#4ade80' : '#fde047',
                      color: '#111118',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {guildShardsTotal > 0 ? `+${guildShardsTotal} Odł.` : `${guildActsRemaining}/2 Akty`}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {guild ? `${guild.name} • Bonusy & 2 Akty Dzienne` : 'Załóż bractwo i zdobywaj bonusy'}
              </div>
            </div>
          </button>

          {/* Dock 2: Bounties / Quests */}
          <button
            className="mmo-dock-btn"
            onClick={() =>
              onOpenBounties(
                rewardCounts.main > 0 && rewardCounts.daily === 0
                  ? 'main'
                  : rewardCounts.side > 0 && rewardCounts.daily === 0
                    ? 'side'
                    : 'daily'
              )
            }
            style={
              rewardCounts.total > 0
                ? {
                    borderColor: '#fbbf24',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(18, 22, 42, 0.92))',
                  }
                : undefined
            }
          >
            <span style={{ fontSize: 23 }}>🏆</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: rewardCounts.total > 0 ? '#fef08a' : '#f8fafc' }}>
                  Misje & Nagrody
                </span>
                {rewardCounts.total > 0 && (
                  <span
                    style={{
                      background: '#22c55e',
                      color: '#052e16',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 10.5,
                      fontWeight: 900,
                    }}
                  >
                    {rewardCounts.total}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Główne, Poboczne, Dzienne • Odłamki & Runy
              </div>
            </div>
          </button>

          {/* Dock 3: Daily Wheel of Chaos */}
          <button
            className="mmo-dock-btn"
            onClick={() => onOpenBounties('wheel')}
            style={
              wheelReady
                ? {
                    borderColor: '#fb7185',
                    background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.28), rgba(245, 158, 11, 0.18))',
                  }
                : undefined
            }
          >
            <span style={{ fontSize: 23 }}>🎡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: wheelReady ? '#fef08a' : '#f8fafc' }}>
                  Koło Fortuny
                </span>
                {wheelReady && (
                  <span
                    style={{
                      background: '#fde047',
                      color: '#111118',
                      borderRadius: 99,
                      padding: '0 6px',
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    GRATIS!
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {wheelReady ? 'Zakręć za darmo po nagrodę dnia!' : 'Dzisiejszy obrót wykorzystany — wróć jutro'}
              </div>
            </div>
          </button>

          {/* Dock 4: Active Daily Blessing + Featured Dungeon */}
          <button
            className="mmo-dock-btn"
            onClick={() => onOpenBounties('wheel')}
            style={{ borderColor: `${blessing.color}66` }}
            title={`Dziś (${blessing.dayName}): ${blessing.summary} • Wyprawa Dnia: #${featuredLoc.globalIndex} ${featuredLoc.name}`}
          >
            <span style={{ fontSize: 23 }}>{blessing.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 900, color: blessing.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {blessing.name}
              </div>
              <div style={{ fontSize: 10.5, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🔥 2× XP Dnia: #{featuredLoc.globalIndex} {featuredLoc.name}
              </div>
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
};

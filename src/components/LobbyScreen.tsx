import React, { useState } from 'react';
import { getMainBossByAct } from '../../shared/bosses';
import { CLASS_LIST, CLASSES } from '../../shared/classes';
import { computePlayerStats } from '../../shared/stats';
import { ACT_THEMES, ALL_LOCATIONS, getLocationDef } from '../../shared/world';
import type { ActNumber, ClassId, PlayerProfile, RoomSummary } from '../../shared/types';
import { HeroShowcaseCanvas } from './HeroShowcaseCanvas';

interface LobbyScreenProps {
  profile: PlayerProfile;
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
}

const CLASS_ICONS: Record<ClassId, string> = {
  wojownik: '⚔️',
  czarnoksieznik: '🔮',
  elf: '🏹',
  krasnolud: '🔨',
  wrozka: '🪽',
};

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  profile,
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
}) => {
  const [joinCode, setJoinCode] = useState(initialInviteCode);
  const [serverDraft, setServerDraft] = useState(serverUrl);
  const [showServerBox, setShowServerBox] = useState(false);
  const [skillTab, setSkillTab] = useState<'actives' | 'passives'>('actives');
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
    profile.runes
  );

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

  // Visual stat ratings (0..100%) for sleek modern stat bars
  const statBars = [
    { label: 'Zdrowie', value: `${selectedClass.baseHp}`, pct: Math.min(100, (selectedClass.baseHp / 200) * 100), color: '#34d399' },
    { label: 'Atak Fiz. (AD)', value: `${selectedClass.baseAd}`, pct: Math.min(100, (selectedClass.baseAd / 28) * 100), color: '#f87171' },
    { label: 'Atak Mag. (AP)', value: `${selectedClass.baseAp}`, pct: Math.min(100, (selectedClass.baseAp / 30) * 100), color: '#c084fc' },
    { label: 'Obrona (DEF)', value: `${selectedClass.baseDef}`, pct: Math.min(100, (selectedClass.baseDef / 24) * 100), color: '#60a5fa' },
    { label: 'Zwinność', value: `${selectedClass.baseMoveSpeed.toFixed(2)}×`, pct: Math.min(100, (selectedClass.baseMoveSpeed / 1.3) * 100), color: '#fbbf24' },
  ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: `radial-gradient(circle at 50% 44%, ${selectedClass.primaryColor}2b 0%, #13162b 46%, #090b14 100%)`,
        transition: 'background 0.45s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle top-left & bottom-right modern atmospheric light orbs */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 15% 12%, rgba(99, 102, 241, 0.16), transparent 45%), radial-gradient(ellipse at 86% 88%, rgba(244, 63, 94, 0.14), transparent 48%)',
        }}
      />

      {/* TOP MODERN NAVIGATION HEADER */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 26px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10, 12, 22, 0.55)',
          backdropFilter: 'blur(16px)',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 21,
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
            }}
          >
            ⚔️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="comic-title"
                style={{
                  fontSize: 26,
                  lineHeight: 1,
                  background: 'linear-gradient(90deg, #fff 0%, #fde68a 55%, #fb923c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                KRONIKI CHAOSU
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#7dd3fc',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                CO-OP 1–4 • LIVE
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
              4 Akty • 60 Lokacji • 5 Klas • Runy Bossów & Handel
            </div>
          </div>
        </div>

        {/* Center-Right: Hero Name + Level/Power + Server Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            className="glass-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px',
            }}
          >
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Bohater:</span>
            <input
              type="text"
              value={profile.name}
              maxLength={18}
              onChange={(e) => onUpdateHero(e.target.value, profile.classId)}
              placeholder="Imię..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                width: 118,
                outline: 'none',
                fontFamily: 'Outfit, sans-serif',
              }}
            />
          </div>

          <div
            className="glass-pill"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>
              Poz. <strong style={{ color: '#fde047' }}>{profile.level}</strong>
              <span style={{ color: '#64748b' }}>/60</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>
            <span>
              🔥 Moc <strong style={{ color: '#fb923c' }}>{heroStats.combatPower}</strong>
            </span>
          </div>

          <button
            className="glass-pill"
            onClick={() => setShowServerBox((v) => !v)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              color: connected ? '#34d399' : '#fbbf24',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
            title="Zmień adres serwera Co-op"
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
            {connected ? (serverUrl ? 'Serwer Zdalny' : 'Serwer Lokalny') : 'Łączenie...'} ⚙️
          </button>
        </div>
      </header>

      {/* Slide-down Server URL Configurator */}
      {showServerBox && (
        <div
          style={{
            position: 'relative',
            zIndex: 15,
            padding: '10px 26px',
            background: 'rgba(13, 17, 32, 0.94)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc' }}>🌐 Serwer Co-op / Aktualizacji:</span>
          <input
            type="text"
            value={serverDraft}
            onChange={(e) => setServerDraft(e.target.value)}
            placeholder="Puste = lokalny, lub wpisz np. https://kroniki-chaosu.onrender.com"
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
            Wbudowany Lokalny
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            position: 'relative',
            zIndex: 15,
            margin: '10px 26px 0',
            padding: '9px 14px',
            borderRadius: 12,
            background: 'rgba(185, 28, 28, 0.25)',
            border: '1px solid rgba(248, 113, 113, 0.5)',
            color: '#fecaca',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* MAIN 3-COLUMN MODERN HERO STAGE */}
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(310px, 370px) 1fr minmax(330px, 400px)',
          gap: 18,
          padding: '16px 26px 20px',
          maxWidth: 1480,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* LEFT COLUMN: Modern Class Picker & Skills */}
        <section
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
            KLASA BOHATERA
          </div>

          {/* 5 Class Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
            {CLASS_LIST.map((cls) => {
              const active = profile.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => onUpdateHero(profile.name, cls.id)}
                  style={{
                    borderRadius: 13,
                    padding: '9px 4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    border: active ? `1.5px solid ${cls.primaryColor}` : '1px solid rgba(255,255,255,0.08)',
                    background: active
                      ? `linear-gradient(180deg, ${cls.primaryColor}38 0%, rgba(18,21,36,0.92) 100%)`
                      : 'rgba(255,255,255,0.03)',
                    boxShadow: active ? `0 8px 20px ${cls.primaryColor}33` : 'none',
                    color: '#fff',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <span style={{ fontSize: 21 }}>{CLASS_ICONS[cls.id]}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800 }}>{cls.name}</span>
                </button>
              );
            })}
          </div>

          {/* Class Summary & Visual Stat Bars */}
          <div
            style={{
              background: 'rgba(10, 13, 24, 0.55)',
              borderRadius: 14,
              padding: 12,
              border: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 19, fontWeight: 900, color: '#fff' }}>{selectedClass.name}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: selectedClass.primaryColor,
                  background: `${selectedClass.primaryColor}20`,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                {selectedClass.role}
              </span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
              {selectedClass.tagline}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {statBars.map((sb) => (
                <div key={sb.label} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 44px', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>{sb.label}</span>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
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
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', textAlign: 'right' }}>
                    {sb.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Kit Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => setSkillTab('actives')}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: skillTab === 'actives' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.03)',
                color: skillTab === 'actives' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              Aktywne (3)
            </button>
            <button
              onClick={() => setSkillTab('passives')}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: skillTab === 'passives' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.03)',
                color: skillTab === 'passives' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              Pasywne (2)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
            {skillTab === 'actives'
              ? selectedClass.actives.map((sk) => (
                  <div
                    key={sk.id}
                    style={{
                      background: 'rgba(10, 13, 24, 0.55)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 12,
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>
                        {sk.icon} {sk.name}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                        [{sk.keyLabel}] • {sk.cooldown}s
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.35 }}>
                      {sk.description}
                    </div>
                  </div>
                ))
              : selectedClass.passives.map((ps) => (
                  <div
                    key={ps.id}
                    style={{
                      background: 'rgba(10, 13, 24, 0.55)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 12,
                      padding: '9px 11px',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7dd3fc' }}>
                      {ps.icon} {ps.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.35 }}>
                      {ps.description}
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {/* CENTER STAGE: Live Interactive 3D Hero Pedestal */}
        <section
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
          <div style={{ width: '100%', height: '100%', minHeight: 360 }}>
            <HeroShowcaseCanvas
              classId={profile.classId}
              weaponGlow={heroStats.weaponUpgradeGlow}
              armorGlow={heroStats.armorUpgradeGlow}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              className="glass-pill"
              style={{
                padding: '6px 16px',
                fontSize: 11.5,
                color: '#cbd5e1',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🖱️ Przeciągnij bohatera, aby obrócić 360°</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: selectedClass.primaryColor, fontWeight: 800 }}>
                Kryt {selectedClass.baseCritChance}%
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Co-op Party + Act/Location + Play CTA */}
        <section
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {/* Party / Room Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8' }}>
                DRUŻYNA CO-OP (1–4)
              </span>
              {room && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399' }}>
                  ● Pokój {room.code}
                </span>
              )}
            </div>

            {!room ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {initialInviteCode && (
                  <button
                    className="comic-btn comic-btn-green"
                    disabled={!connected}
                    onClick={() => onJoinRoom(initialInviteCode)}
                    style={{ padding: '11px 14px', fontSize: 14 }}
                  >
                    🤝 Dołącz do znajomego ({initialInviteCode})
                  </button>
                )}

                <button
                  className="cta-play-btn"
                  disabled={!connected}
                  onClick={() => onCreateRoom(selectedLoc)}
                  style={{ padding: '13px 16px', fontSize: 15 }}
                >
                  ✨ UTWÓRZ POKÓJ (SOLO / CO-OP)
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
                      background: 'rgba(10, 13, 24, 0.72)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 11,
                      padding: '9px 12px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  <button
                    className="comic-btn comic-btn-blue"
                    disabled={!connected || joinCode.trim().length < 4}
                    onClick={() => onJoinRoom(joinCode)}
                    style={{ padding: '9px 15px', fontSize: 13 }}
                  >
                    Dołącz
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Invite Code + Link */}
                <div
                  style={{
                    background: 'rgba(10, 13, 24, 0.65)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 13,
                    padding: '9px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 9,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>KOD ZAPROSZENIA</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fde047', letterSpacing: 2.5 }}>
                      {room.code}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="comic-btn comic-btn-gold"
                      onClick={copyInviteLink}
                      style={{ padding: '6px 10px', fontSize: 11 }}
                    >
                      {copiedMode === 'link' ? '✓ Link!' : '🔗 Link'}
                    </button>
                    <button
                      className="comic-btn comic-btn-dark"
                      onClick={copyCode}
                      style={{ padding: '6px 10px', fontSize: 11 }}
                    >
                      {copiedMode === 'code' ? '✓ Kod!' : '📋 Kod'}
                    </button>
                  </div>
                </div>

                {/* 4 Party Member Slots */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const m = room.members[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          background: m ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: m
                            ? `1px solid ${CLASSES[m.classId].primaryColor}88`
                            : '1px dashed rgba(255,255,255,0.1)',
                          borderRadius: 11,
                          padding: '7px 9px',
                          fontSize: 12,
                        }}
                      >
                        {m ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 18 }}>{CLASS_ICONS[m.classId]}</span>
                            <div style={{ overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  color: '#fff',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {m.isHost ? '👑 ' : ''}
                                {m.name}
                              </div>
                              <div style={{ fontSize: 10.5, color: CLASSES[m.classId].primaryColor, fontWeight: 700 }}>
                                {CLASSES[m.classId].name} • P.{m.level}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#64748b', fontSize: 11, padding: '6px 2px' }}>
                            + Wolny slot #{slotIdx + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Scaling Pill */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(10, 13, 24, 0.55)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 11,
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
              </div>
            )}
          </div>

          {/* Act & Location Selector */}
          <div
            style={{
              background: 'rgba(10, 13, 24, 0.52)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>
                WYBÓR WYPRAWY (60 LOKACJI)
              </span>
              <button
                onClick={onToggleSandbox}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '3px 8px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: profile.sandboxUnlockAll ? '#4ade80' : '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                {profile.sandboxUnlockAll ? '🔓 Wszystkie 60' : '🔒 Odblokuj 60'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 8 }}>
              {([1, 2, 3, 4] as ActNumber[]).map((act) => {
                const active = selectedAct === act;
                return (
                  <button
                    key={act}
                    onClick={() => setSelectedAct(act)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 9,
                      border: active
                        ? `1.5px solid ${ACT_THEMES[act].accentGlowColor}`
                        : '1px solid rgba(255,255,255,0.08)',
                      background: active ? `${ACT_THEMES[act].accentGlowColor}30` : 'rgba(255,255,255,0.03)',
                      color: active ? '#fff' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    Akt {act}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              <strong style={{ color: '#e2e8f0' }}>{ACT_THEMES[selectedAct].name.replace(/^Akt \d: /, '')}</strong> • Boss:{' '}
              <span style={{ color: '#fb7185' }}>{actBoss.recommendedGear}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
              {ALL_LOCATIONS.filter((l) => l.act === selectedAct).map((loc) => {
                const unlocked = profile.sandboxUnlockAll || loc.globalIndex <= profile.unlockedLocationGlobal;
                const chosen = activeGlobalLoc === loc.globalIndex;
                return (
                  <button
                    key={loc.globalIndex}
                    disabled={!unlocked}
                    onClick={() => handleLocPick(loc.globalIndex)}
                    title={`${loc.name} — ${loc.subtitle}`}
                    style={{
                      padding: '6px 3px',
                      borderRadius: 9,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      opacity: unlocked ? 1 : 0.32,
                      border: chosen ? '1.5px solid #fde047' : '1px solid rgba(255,255,255,0.08)',
                      background: chosen
                        ? 'linear-gradient(135deg, #fde047, #f59e0b)'
                        : loc.isMainBoss
                          ? 'rgba(225, 29, 72, 0.35)'
                          : loc.isMiniBoss
                            ? 'rgba(217, 119, 6, 0.32)'
                            : 'rgba(255,255,255,0.05)',
                      color: chosen ? '#1a1205' : '#f8fafc',
                    }}
                  >
                    {loc.isMainBoss ? '👑' : loc.isMiniBoss ? '💀' : ''}
                    {loc.locationInAct}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 8, fontSize: 11.5, color: '#fde68a', fontWeight: 700 }}>
              📍 {activeLocDef.name}
              {activeLocDef.bossName ? ` (${activeLocDef.bossName})` : ''}
            </div>
          </div>

          {/* Primary Play CTA */}
          {room ? (
            <button
              className="cta-play-btn"
              onClick={() => onStartGame(activeGlobalLoc)}
              style={{ width: '100%', padding: '14px 18px', fontSize: 17 }}
            >
              ▶ ROZPOCZNIJ WYPRAWĘ
            </button>
          ) : (
            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              Utwórz pokój lub dołącz kodem, aby wyruszyć do walki.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

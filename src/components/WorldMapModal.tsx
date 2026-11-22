import React, { useState } from 'react';
import { getMainBossByAct } from '../../shared/bosses';
import { getRuneByAct } from '../../shared/runes';
import { computePlayerStats } from '../../shared/stats';
import { ACT_THEMES, ALL_LOCATIONS, getLocationDef } from '../../shared/world';
import type { ActNumber, PlayerProfile } from '../../shared/types';

interface WorldMapModalProps {
  profile: PlayerProfile;
  currentGlobalLocation: number;
  onSelectLocation: (globalIndex: number) => void;
  onToggleSandbox: () => void;
  onClose: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  profile,
  currentGlobalLocation,
  onSelectLocation,
  onToggleSandbox,
  onClose,
}) => {
  const [actTab, setActTab] = useState<ActNumber>(getLocationDef(currentGlobalLocation).act);
  const theme = ACT_THEMES[actTab];
  const actBoss = getMainBossByAct(actTab);
  const actRune = getRuneByAct(actTab);
  const actLocations = ALL_LOCATIONS.filter((l) => l.act === actTab);
  const myStats = computePlayerStats(
    profile.classId,
    profile.level,
    profile.equipped,
    profile.skillRanks,
    profile.runes
  );
  const meetsBossPower = myStats.combatPower >= actBoss.requiredPower;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(960px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: '#38bdf8' }}>
              🗺️ ATLAS ŚWIATA — 4 AKTY • 60 LOKACJI
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Każda rozległa lokacja zawiera ukryte przejścia, zagadkę runiczną oraz losowe skrzynie z łupem.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="comic-btn comic-btn-gold"
              onClick={onToggleSandbox}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {profile.sandboxUnlockAll ? '🔓 Odblokowano wszystkie 60' : '🔑 Odblokuj wszystkie 60 (Test)'}
            </button>
            <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
              ✕ Zamknij [M]
            </button>
          </div>
        </div>

        {/* 4 Act Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {([1, 2, 3, 4] as ActNumber[]).map((act) => (
            <button
              key={act}
              onClick={() => setActTab(act)}
              className="comic-btn"
              style={{
                padding: '10px 8px',
                fontSize: 13,
                background: actTab === act ? ACT_THEMES[act].accentGlowColor : '#242944',
                color: actTab === act ? '#111118' : '#e2e8f0',
              }}
            >
              AKT {act} ({(act - 1) * 15 + 1}–{act * 15})
            </button>
          ))}
        </div>

        {/* Act Summary Banner */}
        <div
          className="comic-panel-sm"
          style={{
            padding: 12,
            marginBottom: 14,
            borderColor: theme.accentGlowColor,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div className="comic-title" style={{ fontSize: 24, color: theme.accentGlowColor }}>
              {theme.name}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>{theme.subtitle}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontWeight: 900, color: '#fb7185' }}>👑 Boss Główny (Lok. 15): {actBoss.name}</div>
            <div style={{ color: '#fde047', fontWeight: 800 }}>
              🛡️ Wymagany sprzęt: {actBoss.recommendedGear}
            </div>
            <div style={{ color: meetsBossPower ? '#4ade80' : '#f87171', fontWeight: 800, fontSize: 11 }}>
              🔥 Twoja Moc: {myStats.combatPower.toLocaleString()} / {actBoss.requiredPower.toLocaleString()}{' '}
              {meetsBossPower ? '✓ Gotowy!' : '(Za słaby sprzęt!)'}
            </div>
            <div style={{ color: actRune.color, fontWeight: 800 }}>
              💠 Drop Runy (30%): {actRune.name}
            </div>
          </div>
        </div>

        {/* 15 Locations Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {actLocations.map((loc) => {
            const unlocked = profile.sandboxUnlockAll || loc.globalIndex <= profile.unlockedLocationGlobal;
            const completed = profile.completedLocations.includes(loc.globalIndex);
            const current = loc.globalIndex === currentGlobalLocation;

            return (
              <button
                key={loc.globalIndex}
                disabled={!unlocked}
                onClick={() => {
                  onSelectLocation(loc.globalIndex);
                  onClose();
                }}
                className="comic-btn"
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: current
                    ? 'linear-gradient(180deg, #fde047, #f59e0b)'
                    : loc.isMainBoss
                      ? 'linear-gradient(180deg, #881337, #4c0519)'
                      : loc.isMiniBoss
                        ? 'linear-gradient(180deg, #92400e, #451a03)'
                        : '#20253f',
                  color: current ? '#111118' : '#fff',
                  borderColor: current ? '#fff' : completed ? '#4ade80' : '#111118',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, fontWeight: 900 }}>
                  <span>
                    {loc.isMainBoss ? '👑 BOSS ' : loc.isMiniBoss ? '💀 MINI-BOSS ' : ''}
                    Lokacja {loc.locationInAct}/15 (#{loc.globalIndex})
                  </span>
                  <span>{completed ? '✓' : unlocked ? `Poz. ${loc.recommendedLevel}` : '🔒'}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, marginTop: 3 }}>{loc.name}</div>
                {loc.bossName && (
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{loc.bossName}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

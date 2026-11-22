import React, { useState } from 'react';
import { getMainBossByAct } from '../../shared/bosses';
import { getHardcoreUnlockProgress } from '../../shared/items';
import { getRuneByAct } from '../../shared/runes';
import { computePlayerStats } from '../../shared/stats';
import { ACT_THEMES, ALL_LOCATIONS, getLocationDef, isHardcoreAct } from '../../shared/world';
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
  const hcProgress = getHardcoreUnlockProgress(profile);
  const viewingHC = isHardcoreAct(actTab);

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
        style={{ width: 'min(980px, 96vw)', maxHeight: '91vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: viewingHC ? '#00f5d4' : '#38bdf8' }}>
              {viewingHC ? '🔥 TRYB HARDCORE — AKTY 5–7 (NIEŚMIERTELNI)' : '🗺️ ATLAS ŚWIATA — 7 AKTÓW • 105 LOKACJI'}
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              4 Akty Standardowe (1–60) + 3 Ekskluzywne Akty HARDCORE (61–105) z setem Nieśmiertelnym (5% drop) i ulepszeniami +20!
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="comic-btn comic-btn-gold"
              onClick={onToggleSandbox}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {profile.sandboxUnlockAll ? '🔓 Odblokowano 105 + HC' : '🔑 Odblokuj wszystko (Test)'}
            </button>
            <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
              ✕ Zamknij [M]
            </button>
          </div>
        </div>

        {/* Standard Acts 1-4 + Hardcore Acts 5-7 Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 14 }}>
          {([1, 2, 3, 4, 5, 6, 7] as ActNumber[]).map((act) => {
            const isHC = isHardcoreAct(act);
            const active = actTab === act;
            return (
              <button
                key={act}
                onClick={() => setActTab(act)}
                className="comic-btn"
                style={{
                  padding: '9px 6px',
                  fontSize: 12,
                  background: active
                    ? ACT_THEMES[act].accentGlowColor
                    : isHC
                      ? 'linear-gradient(180deg, #2b163b, #161830)'
                      : '#242944',
                  color: active ? '#111118' : isHC ? '#00f5d4' : '#e2e8f0',
                  borderColor: isHC ? '#00f5d4' : '#111118',
                }}
              >
                {isHC ? '🔥 ' : ''}AKT {act}
                {isHC && !hcProgress.unlocked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>

        {/* Hardcore Unlock Progress / Prestige Banner when viewing Act 5-7 */}
        {viewingHC && (
          <div
            className="comic-panel-sm"
            style={{
              padding: 13,
              marginBottom: 14,
              borderColor: hcProgress.unlocked ? '#00f5d4' : '#f43f5e',
              background: hcProgress.unlocked
                ? 'linear-gradient(135deg, rgba(0,245,212,0.16), rgba(99,102,241,0.2))'
                : 'linear-gradient(135deg, rgba(225,29,72,0.2), rgba(30,22,56,0.92))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: hcProgress.unlocked ? '#00f5d4' : '#fde047' }}>
                  {hcProgress.unlocked
                    ? '🔥 TRYB HARDCORE ODBLOKOWANY! Walcz o Set Nieśmiertelny (+50% DEF & Wartości, 5% drop)!'
                    : '🔒 TRYB HARDCORE — ODBLOKUJ NAJWYŻSZE WYZWANIE GRY!'}
                </div>
                <div style={{ fontSize: 11.5, color: '#e2e8f0', marginTop: 3 }}>
                  • 3 Nowe Akty z unikalną muzyką i bossami • Ulepszanie <strong>+13 → +20</strong> • Zakładka <strong>Runy Hardcore</strong> • Skalowanie PT: Bossy <strong>+33% / +66% / +99%</strong>, Mobki <strong>+10% / +20% / +30%</strong>!
                </div>
              </div>
              {!hcProgress.unlocked && (
                <div style={{ fontSize: 12, fontWeight: 900, textAlign: 'right' }}>
                  <div style={{ color: hcProgress.allNormalActsCleared ? '#4ade80' : '#fca5a5' }}>
                    {hcProgress.allNormalActsCleared ? '✅' : '⏳'} Przejdź Akty 1–4 (Vaelgor)
                  </div>
                  <div style={{ color: hcProgress.boskiPlus13Slots >= 6 ? '#4ade80' : '#fde047' }}>
                    {hcProgress.boskiPlus13Slots >= 6 ? '✅' : '⏳'} Ekwipunek Boski +13: {hcProgress.boskiPlus13Slots} / 6
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
              {meetsBossPower ? '✓ Gotowy!' : '(Zbyt niska moc!)'}
            </div>
            <div style={{ color: actRune.color, fontWeight: 800 }}>
              💠 Drop Runy (30%): {actRune.name}
            </div>
          </div>
        </div>

        {/* 15 Locations Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {actLocations.map((loc) => {
            const hcGateOk = !viewingHC || hcProgress.unlocked;
            const unlocked =
              profile.sandboxUnlockAll ||
              (hcGateOk &&
                (loc.globalIndex <= profile.unlockedLocationGlobal ||
                  (loc.globalIndex === 61 && hcProgress.unlocked)));
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
                      ? viewingHC
                        ? 'linear-gradient(180deg, #0f766e, #134e4a)'
                        : 'linear-gradient(180deg, #881337, #4c0519)'
                      : loc.isMiniBoss
                        ? 'linear-gradient(180deg, #92400e, #451a03)'
                        : viewingHC
                          ? '#1d1c3b'
                          : '#20253f',
                  color: current ? '#111118' : '#fff',
                  borderColor: current ? '#fff' : completed ? '#4ade80' : viewingHC ? '#00f5d4' : '#111118',
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, fontWeight: 900 }}>
                  <span>
                    {loc.isMainBoss ? '👑 BOSS ' : loc.isMiniBoss ? '💀 MINI-BOSS ' : ''}
                    Lokacja {loc.locationInAct}/15 (#{loc.globalIndex})
                  </span>
                  <span>{completed ? '✓' : unlocked ? (viewingHC ? '🔥 HC' : `Poz. ${loc.recommendedLevel}`) : '🔒'}</span>
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

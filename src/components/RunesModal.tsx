import React, { useState } from 'react';
import { RUNE_LIST, RUNE_MAX_LEVEL } from '../../shared/runes';
import type { PlayerProfile, RuneId } from '../../shared/types';
import { soundEngine } from '../audio/soundEngine';

interface RunesModalProps {
  profile: PlayerProfile;
  onUpgradeRune: (runeId: RuneId) => void;
  onClose: () => void;
}

export const RunesModal: React.FC<RunesModalProps> = ({
  profile,
  onUpgradeRune,
  onClose,
}) => {
  const [pulseId, setPulseId] = useState<RuneId | null>(null);

  const handleUpgrade = (runeId: RuneId) => {
    soundEngine.playRuneUpgrade();
    onUpgradeRune(runeId);
    setPulseId(runeId);
    setTimeout(() => setPulseId(null), 900);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(920px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: '#4ade80' }}>
              💠 RUNY PASYWNE BOSSÓW (0/10)
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Każdy Główny Boss Aktu (Lokacja 15) ma <strong>30% szansy</strong> na drop Odłamka swojej Runy. 1 Odłamek = +1 Poziom Runy (max 10).
            </div>
          </div>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Zamknij [U]
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {RUNE_LIST.map((rune) => {
            const lvl = profile.runes[rune.id] || 0;
            const shards = profile.runeShards[rune.id] || 0;
            const canUp = shards >= 1 && lvl < RUNE_MAX_LEVEL;
            const pct = (lvl / RUNE_MAX_LEVEL) * 100;

            return (
              <div
                key={rune.id}
                className="comic-panel-sm"
                style={{
                  padding: 16,
                  borderColor: rune.color,
                  boxShadow:
                    pulseId === rune.id
                      ? `0 0 28px ${rune.color}`
                      : '3px 3px 0 #111118',
                  transition: 'box-shadow 0.25s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: '#131627',
                        border: `2.5px solid ${rune.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >
                      {rune.icon}
                    </div>
                    <div>
                      <div className="comic-title" style={{ fontSize: 22, color: rune.color, lineHeight: 1 }}>
                        {rune.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                        Akt {rune.act} • Boss: {rune.bossName}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#111322',
                      border: `2px solid ${rune.color}`,
                      borderRadius: 9,
                      padding: '4px 10px',
                      fontWeight: 900,
                      color: '#fde047',
                      fontSize: 14,
                    }}
                  >
                    {lvl} / {RUNE_MAX_LEVEL}
                  </div>
                </div>

                {/* Progress Bar 0..10 */}
                <div
                  style={{
                    marginTop: 10,
                    height: 12,
                    background: '#0f1221',
                    border: '2px solid #111118',
                    borderRadius: 7,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: rune.color,
                      transition: 'width 0.25s',
                    }}
                  />
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: '#cbd5e1' }}>
                  <div>{rune.perLevelDescription}</div>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    {rune.maxLevelDescription}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 10px',
                    background: '#131627',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 900,
                    color: lvl > 0 ? '#4ade80' : '#64748b',
                  }}
                >
                  Aktywny bonus: {lvl > 0 ? rune.formatCurrentBonus(lvl) : 'Brak (Poziom 0)'}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fde047' }}>
                    Posiadane Odłamki: 💠 {shards}
                  </div>
                  <button
                    disabled={!canUp}
                    onClick={() => handleUpgrade(rune.id)}
                    className="comic-btn comic-btn-green"
                    style={{ padding: '7px 14px', fontSize: 12 }}
                  >
                    {lvl >= RUNE_MAX_LEVEL
                      ? '🏆 MAX (10/10)'
                      : '⬆️ Wzmocnij Runę (1 Odłamek)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

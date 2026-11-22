import React from 'react';
import { CLASSES, MAX_SKILL_RANK } from '../../shared/classes';
import type { PlayerProfile, SkillRanks } from '../../shared/types';

interface SkillsModalProps {
  profile: PlayerProfile;
  onUpgradeSkill: (slot: keyof SkillRanks) => void;
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({
  profile,
  onUpgradeSkill,
  onClose,
}) => {
  const cls = CLASSES[profile.classId];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(820px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: '#c084fc' }}>
              ⭐ DRZEWKO UMIEJĘTNOŚCI — {cls.name.toUpperCase()}
            </h2>
            <div style={{ fontSize: 13, color: '#fde047', fontWeight: 900 }}>
              Dostępne Punkty Umiejętności: {profile.skillPoints}
            </div>
          </div>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Zamknij [K]
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 8 }}>
            UMIEJĘTNOŚCI AKTYWNE (3)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {cls.actives.map((sk) => {
              const rank = profile.skillRanks[sk.slot] || 1;
              const canUp = profile.skillPoints > 0 && rank < MAX_SKILL_RANK;
              const bonusPct = (rank - 1) * sk.rankBonusPct;
              return (
                <div
                  key={sk.id}
                  className="comic-panel-sm"
                  style={{ padding: 12, borderColor: sk.color, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{sk.icon}</span>
                      <span
                        style={{
                          background: sk.color,
                          color: '#fff',
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Poziom {rank} / {MAX_SKILL_RANK}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6, color: '#fff' }}>{sk.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      Klawisz: <strong>{sk.keyLabel}</strong> • CD: {sk.cooldown}s • Mana: {sk.manaCost}
                    </div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', margin: '8px 0' }}>{sk.description}</p>
                    <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 800 }}>
                      Obecna moc: +{bonusPct}% (+{sk.rankBonusPct}% / poziom)
                    </div>
                  </div>
                  <button
                    disabled={!canUp}
                    onClick={() => onUpgradeSkill(sk.slot)}
                    className="comic-btn comic-btn-gold"
                    style={{ width: '100%', marginTop: 10, padding: '8px 10px', fontSize: 13 }}
                  >
                    {rank >= MAX_SKILL_RANK ? 'MAX POZIOM' : '⬆️ Rozwiń (+1 Pkt)'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', marginBottom: 8 }}>
            UMIEJĘTNOŚCI PASYWNE (2)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {cls.passives.map((ps) => {
              const rank = profile.skillRanks[ps.slot] || 0;
              const canUp = profile.skillPoints > 0 && rank < MAX_SKILL_RANK;
              return (
                <div
                  key={ps.id}
                  className="comic-panel-sm"
                  style={{ padding: 14, borderColor: ps.color, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{ps.icon}</span>
                      <span
                        style={{
                          background: ps.color,
                          color: '#fff',
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Poziom {rank} / {MAX_SKILL_RANK}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6, color: '#fff' }}>{ps.name}</div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', margin: '6px 0' }}>{ps.description}</p>
                    <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 900 }}>
                      Aktywny bonus: {ps.perRankSummary(rank)}
                    </div>
                    {rank < MAX_SKILL_RANK && (
                      <div style={{ fontSize: 11, color: '#fde047', marginTop: 2 }}>
                        Następny poziom: {ps.perRankSummary(rank + 1)}
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!canUp}
                    onClick={() => onUpgradeSkill(ps.slot)}
                    className="comic-btn comic-btn-blue"
                    style={{ width: '100%', marginTop: 10, padding: '8px 10px', fontSize: 13 }}
                  >
                    {rank >= MAX_SKILL_RANK ? 'MAX POZIOM' : '⬆️ Rozwiń Pasywkę (+1 Pkt)'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

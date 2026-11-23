import React, { useState } from 'react';
import { COSMETIC_REWARDS, CosmeticSlot, getUnlockedCosmeticIds } from '../../shared/prestige';
import type { PlayerProfile } from '../../shared/types';

interface PrestigeModalProps {
  profile: PlayerProfile;
  onEquipCosmetic: (slot: CosmeticSlot, id: string | null) => void;
  onClose: () => void;
}

export const PrestigeModal: React.FC<PrestigeModalProps> = ({
  profile,
  onEquipCosmetic,
  onClose,
}) => {
  const [tab, setTab] = useState<CosmeticSlot>('title');
  const unlockedSet = new Set(getUnlockedCosmeticIds(profile));

  const currentBySlot: Record<CosmeticSlot, string | null | undefined> = {
    title: profile.equippedTitle,
    aura: profile.equippedAura,
    trail: profile.equippedTrail,
  };

  const items = COSMETIC_REWARDS.filter((c) => c.slot === tab);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(820px, 95vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 20,
          borderColor: '#fbbf24',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: '#fde047' }}>
              👑 KOMNATA PRESTIŻU — TYTUŁY, AURY I ŚLADY
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Kosmetyczne nagrody widoczne dla całej drużyny w Obozie 3D oraz na mapach!
            </div>
          </div>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Zamknij
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            className={`mmo-tab-btn ${tab === 'title' ? 'active' : ''}`}
            onClick={() => setTab('title')}
          >
            👑 Tytuły nad Postacią
          </button>
          <button
            className={`mmo-tab-btn ${tab === 'aura' ? 'active' : ''}`}
            onClick={() => setTab('aura')}
          >
            ✨ Aury pod Stopami
          </button>
          <button
            className={`mmo-tab-btn ${tab === 'trail' ? 'active' : ''}`}
            onClick={() => setTab('trail')}
          >
            🌈 Ślady Biegu
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {items.map((c) => {
            const isUnlocked = unlockedSet.has(c.id);
            const isEquipped = currentBySlot[tab] === c.id;
            return (
              <div
                key={c.id}
                className="comic-panel-sm"
                style={{
                  padding: 13,
                  borderColor: isEquipped ? '#fde047' : isUnlocked ? `${c.color}88` : 'rgba(255,255,255,0.1)',
                  opacity: isUnlocked ? 1 : 0.65,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: isEquipped ? '#fde047' : isUnlocked ? 'rgba(74,222,128,0.2)' : 'rgba(148,163,184,0.18)',
                      color: isEquipped ? '#111' : isUnlocked ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {isEquipped ? 'ZAŁOŻONE' : isUnlocked ? 'ODBLOKOWANE' : '🔒 ZABLOKOWANE'}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: c.color }}>{c.displayLabel}</div>
                <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.35, flex: 1 }}>{c.requirement}</div>
                <button
                  className={`comic-btn ${isEquipped ? 'comic-btn-dark' : isUnlocked ? 'comic-btn-gold' : 'comic-btn-dark'}`}
                  disabled={!isUnlocked}
                  onClick={() => onEquipCosmetic(tab, isEquipped ? null : c.id)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12 }}
                >
                  {isEquipped ? 'Zdejmij' : isUnlocked ? '✨ Załóż' : 'Wykonaj wyzwanie'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

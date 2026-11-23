import React from 'react';
import { CHARON_SHOP_ITEMS } from '../../shared/hades';

interface CharonModalProps {
  runEssence: number;
  purchasedIds: string[];
  onBuy: (itemId: string) => void;
  onClose: () => void;
}

export const CharonModal: React.FC<CharonModalProps> = ({
  runEssence,
  purchasedIds,
  onBuy,
  onClose,
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 20,
          borderColor: '#c084fc',
          background: 'linear-gradient(160deg, rgba(35, 16, 62, 0.97), rgba(12, 14, 28, 0.98))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: '#e879f9' }}>
              🧪 WĘDROWNY ALCHEMIK — VAREK
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>
              Wydaj zdobywaną podczas wyprawy <strong style={{ color: '#fde047' }}>Esencję Chaosu</strong> na Relikty i Klejnoty!
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="comic-panel-sm"
              style={{
                padding: '6px 14px',
                borderColor: '#fde047',
                fontSize: 14,
                fontWeight: 900,
                color: '#fde047',
              }}
            >
              🔮 {runEssence} Esencji
            </div>
            <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
              ✕ Zamknij
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {CHARON_SHOP_ITEMS.map((item) => {
            const bought = purchasedIds.includes(item.id);
            const canAfford = runEssence >= item.cost;
            return (
              <div
                key={item.id}
                className="comic-panel-sm"
                style={{
                  padding: 13,
                  borderColor: bought ? '#475569' : item.color,
                  background: bought
                    ? 'rgba(15, 18, 34, 0.55)'
                    : `linear-gradient(155deg, ${item.color}1e, rgba(14, 16, 32, 0.95))`,
                  opacity: bought ? 0.55 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 26 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: canAfford ? '#fde047' : '#f87171',
                        background: 'rgba(0,0,0,0.45)',
                        padding: '2px 8px',
                        borderRadius: 8,
                      }}
                    >
                      🔮 {item.cost}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: item.color, marginTop: 6 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.38, marginTop: 3 }}>
                    {item.description}
                  </div>
                </div>

                <button
                  className={`comic-btn ${bought ? 'comic-btn-dark' : canAfford ? 'comic-btn-gold' : 'comic-btn-dark'}`}
                  disabled={bought || !canAfford}
                  onClick={() => onBuy(item.id)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12 }}
                >
                  {bought ? '✓ Kupiono' : canAfford ? `Kup za ${item.cost} 🔮` : 'Za mało Esencji'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

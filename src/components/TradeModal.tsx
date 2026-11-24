import React, { useState } from 'react';
import { RARITY_META, SLOT_LABELS } from '../../shared/items';
import type { EquipmentItem, PlayerProfile, TradeSessionState } from '../../shared/types';
import { ItemTooltip } from './ItemTooltip';

interface TradeModalProps {
  profile: PlayerProfile;
  localPlayerId: string;
  trade: TradeSessionState;
  onUpdateOffer: (items: EquipmentItem[], chaosStones: number) => void;
  onLockOffer: () => void;
  onAcceptTrade: () => void;
  onCancelTrade: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  profile,
  localPlayerId,
  trade,
  onUpdateOffer,
  onLockOffer,
  onAcceptTrade,
  onCancelTrade,
}) => {
  const [hoveredItem, setHoveredItem] = useState<EquipmentItem | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isPlayerA = trade.playerAId === localPlayerId;
  const myName = isPlayerA ? trade.playerAName : trade.playerBName;
  const partnerName = isPlayerA ? trade.playerBName : trade.playerAName;
  const myOffer = isPlayerA ? trade.offerA : trade.offerB;
  const partnerOffer = isPlayerA ? trade.offerB : trade.offerA;
  const myChaosOffer = isPlayerA ? trade.chaosStonesA || 0 : trade.chaosStonesB || 0;
  const partnerChaosOffer = isPlayerA ? trade.chaosStonesB || 0 : trade.chaosStonesA || 0;
  const ownedChaosStones = profile.chaosStones || 0;
  const myLocked = isPlayerA ? trade.lockedA : trade.lockedB;
  const partnerLocked = isPlayerA ? trade.lockedB : trade.lockedA;
  const myAccepted = isPlayerA ? trade.acceptedA : trade.acceptedB;
  const partnerAccepted = isPlayerA ? trade.acceptedB : trade.acceptedA;

  const bothLocked = myLocked && partnerLocked;
  const offeredIds = new Set(myOffer.map((i) => i.id));

  const addItemToOffer = (item: EquipmentItem) => {
    if (offeredIds.has(item.id) || myOffer.length >= 6) return;
    onUpdateOffer([...myOffer, item], myChaosOffer);
  };

  const removeItemFromOffer = (itemId: string) => {
    onUpdateOffer(myOffer.filter((i) => i.id !== itemId), myChaosOffer);
  };

  const setChaosOffer = (nextQty: number) => {
    const clamped = Math.max(0, Math.min(ownedChaosStones, Math.floor(nextQty)));
    onUpdateOffer(myOffer, clamped);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const found = profile.inventory.find((i) => i.id === id);
    if (found) addItemToOffer(found);
  };

  return (
    <div className="modal-backdrop">
      <div
        className="comic-panel"
        style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: '#fbbf24' }}>
              🤝 HANDEL MIĘDZY GRACZAMI: {myName} ⇄ {partnerName}
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Przeciągnij przedmioty z plecaka do slotów wymiany. Każda zmiana automatycznie odblokowuje obie oferty (ochrona przed oszustwem)!
            </div>
          </div>
          <button className="comic-btn comic-btn-red" onClick={onCancelTrade} style={{ padding: '6px 14px' }}>
            ✕ Anuluj Handel
          </button>
        </div>

        {trade.status === 'pending' ? (
          <div style={{ textAlign: 'center', padding: 36, fontSize: 16, fontWeight: 800, color: '#fde047' }}>
            ⏳ Oczekiwanie na akceptację zaproszenia do handlu przez gracza {partnerName}...
          </div>
        ) : (
          <>
            {/* Two Offer Panes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {/* My Offer */}
              <div
                className="comic-panel-sm"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  padding: 12,
                  borderColor: dragOver ? '#fde047' : myLocked ? '#4ade80' : '#38bdf8',
                  background: dragOver ? 'rgba(250,204,21,0.12)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: '#38bdf8', fontSize: 14 }}>TWOJA OFERTA ({myOffer.length}/6)</strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: myAccepted ? '#4ade80' : myLocked ? '#fde047' : '#94a3b8',
                    }}
                  >
                    {myAccepted ? '✅ ZAAKCEPTOWANO' : myLocked ? '🔒 ZABLOKOWANO' : '✏️ EDYCJA'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, minHeight: 148 }}>
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const it = myOffer[idx];
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => it && setHoveredItem(it)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => it && removeItemFromOffer(it.id)}
                        style={{
                          background: '#131627',
                          border: `2px solid ${it ? RARITY_META[it.rarity].color : '#2a304d'}`,
                          borderRadius: 8,
                          padding: 6,
                          minHeight: 66,
                          cursor: it ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        {it ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 900, color: RARITY_META[it.rarity].color }}>
                              {SLOT_LABELS[it.slot].icon} +{it.upgradeLevel}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {it.name}
                            </div>
                            <div style={{ fontSize: 9, color: '#f87171' }}>Kliknij, by usunąć</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>Upuść tutaj</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Tradeable Kamienie Chaosu Control */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'linear-gradient(90deg, rgba(159,18,57,0.34), rgba(88,28,135,0.38))',
                    border: '1.5px solid #e11d48',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 900, color: '#fbcfe8' }}>
                    🌀 Kamienie Chaosu:{' '}
                    <span style={{ color: '#fde047' }}>{myChaosOffer}</span>{' '}
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>(Masz: {ownedChaosStones})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="comic-btn comic-btn-dark"
                      disabled={myChaosOffer <= 0}
                      onClick={() => setChaosOffer(myChaosOffer - 1)}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      −
                    </button>
                    <button
                      className="comic-btn comic-btn-purple"
                      disabled={myChaosOffer >= ownedChaosStones}
                      onClick={() => setChaosOffer(myChaosOffer + 1)}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Partner Offer */}
              <div
                className="comic-panel-sm"
                style={{
                  padding: 12,
                  borderColor: partnerLocked ? '#4ade80' : '#f59e0b',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: '#fbbf24', fontSize: 14 }}>
                    OFERTA: {partnerName.toUpperCase()} ({partnerOffer.length}/6)
                  </strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: partnerAccepted ? '#4ade80' : partnerLocked ? '#fde047' : '#94a3b8',
                    }}
                  >
                    {partnerAccepted ? '✅ ZAAKCEPTOWANO' : partnerLocked ? '🔒 ZABLOKOWANO' : '✏️ EDYTUJE...'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, minHeight: 148 }}>
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const it = partnerOffer[idx];
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => it && setHoveredItem(it)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          background: '#131627',
                          border: `2px solid ${it ? RARITY_META[it.rarity].color : '#2a304d'}`,
                          borderRadius: 8,
                          padding: 6,
                          minHeight: 66,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        {it ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 900, color: RARITY_META[it.rarity].color }}>
                              {SLOT_LABELS[it.slot].icon} +{it.upgradeLevel}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {it.name}
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>Najedź po statystyki</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>Pusty slot</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Partner Offered Kamienie Chaosu */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background:
                      partnerChaosOffer > 0
                        ? 'linear-gradient(90deg, rgba(159,18,57,0.42), rgba(88,28,135,0.45))'
                        : 'rgba(19,22,39,0.72)',
                    border: `1.5px solid ${partnerChaosOffer > 0 ? '#e11d48' : '#2a304d'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 900, color: partnerChaosOffer > 0 ? '#fbcfe8' : '#64748b' }}>
                    🌀 Kamienie Chaosu w ofercie partnera:
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: partnerChaosOffer > 0 ? '#fde047' : '#64748b' }}>
                    {partnerChaosOffer}×
                  </span>
                </div>
              </div>
            </div>

            {/* 2-Step Anti-Scam Confirmation Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
              <button
                className="comic-btn comic-btn-gold"
                disabled={myLocked}
                onClick={onLockOffer}
                style={{ padding: '10px 22px', fontSize: 15 }}
              >
                {myLocked ? '🔒 Krok 1: Oferta Zablokowana ✓' : '🔒 Krok 1: Zablokuj ofertę'}
              </button>
              <button
                className="comic-btn comic-btn-green"
                disabled={!bothLocked || myAccepted}
                onClick={onAcceptTrade}
                style={{ padding: '10px 22px', fontSize: 15 }}
              >
                {myAccepted
                  ? '✅ Oczekiwanie na drugiego gracza...'
                  : bothLocked
                    ? '🤝 Krok 2: Akceptuj wymianę!'
                    : '⏳ Krok 2: Zablokujcie obie oferty'}
              </button>
            </div>

            {/* Bottom: Backpack + Live Stat Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 12 }}>
              <div className="comic-panel-sm" style={{ padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', marginBottom: 6 }}>
                  TWÓJ PLECAK — Przeciągnij lub kliknij, aby dodać do wymiany
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                    gap: 6,
                    maxHeight: 190,
                    overflowY: 'auto',
                  }}
                >
                  {profile.inventory.map((it) => {
                    const already = offeredIds.has(it.id);
                    return (
                      <div
                        key={it.id}
                        draggable={!already}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                        onMouseEnter={() => setHoveredItem(it)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => !already && addItemToOffer(it)}
                        style={{
                          background: already ? '#101320' : '#1b2038',
                          opacity: already ? 0.45 : 1,
                          border: `2px solid ${RARITY_META[it.rarity].color}`,
                          borderRadius: 8,
                          padding: 6,
                          cursor: already ? 'default' : 'grab',
                        }}
                      >
                        <div style={{ fontSize: 11, color: RARITY_META[it.rarity].color, fontWeight: 900 }}>
                          {SLOT_LABELS[it.slot].icon} +{it.upgradeLevel}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {it.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="comic-panel-sm" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hoveredItem ? (
                  <ItemTooltip item={hoveredItem} compact />
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    Najedź kursorem na dowolny przedmiot, aby sprawdzić jego dokładne statystyki przed wymianą.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

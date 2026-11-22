import React, { useState } from 'react';
import {
  EQUIP_SLOTS,
  getFullSetBonus,
  getSalvageShardYield,
  RARITY_META,
  RARITY_ORDER,
  SLOT_LABELS,
} from '../../shared/items';
import { computePlayerStats } from '../../shared/stats';
import type { EquipmentItem, EquipSlot, PlayerProfile, Rarity } from '../../shared/types';
import { ItemTooltip } from './ItemTooltip';

interface InventoryModalProps {
  profile: PlayerProfile;
  onEquip: (item: EquipmentItem) => void;
  onUnequip: (slot: EquipSlot) => void;
  onSalvageItem: (itemId: string) => void;
  onBulkSalvage: (rarity: Rarity) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  profile,
  onEquip,
  onUnequip,
  onSalvageItem,
  onBulkSalvage,
  onClose,
}) => {
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const stats = computePlayerStats(
    profile.classId,
    profile.level,
    profile.equipped,
    profile.skillRanks,
    profile.runes
  );

  // Highlight best set progress
  const bestSetRarity = RARITY_ORDER.reduce((best, r) =>
    stats.setCounts[r] >= stats.setCounts[best] ? r : best
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1040px, 95vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: '#fde047' }}>
            🎒 EKWIPUNEK I ZESTAWY
          </h2>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Zamknij [I]
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
          {/* LEFT: Equipped 6 Slots + Set Bonus + Hero Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="comic-panel-sm" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#38bdf8', marginBottom: 8 }}>
                ZAŁOŻONY EKWIPUNEK (6 SLOTÓW)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {EQUIP_SLOTS.map((slot) => {
                  const item = profile.equipped[slot];
                  const slotInfo = SLOT_LABELS[slot];
                  const meta = item ? RARITY_META[item.rarity] : null;
                  return (
                    <div
                      key={slot}
                      onClick={() => item && setSelectedItem(item)}
                      onDoubleClick={() => item && onUnequip(slot)}
                      className={item?.rarity === 'boski' ? 'boski-shimmer' : ''}
                      style={{
                        background: '#131627',
                        border: `2.5px solid ${meta ? meta.color : '#2e3454'}`,
                        borderRadius: 9,
                        padding: '8px 7px',
                        cursor: item ? 'pointer' : 'default',
                        minHeight: 62,
                      }}
                    >
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800 }}>
                        {slotInfo.icon} {slotInfo.name}
                      </div>
                      {item ? (
                        <>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: meta!.color,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: 2,
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: '#fde047', fontWeight: 900 }}>
                              +{item.upgradeLevel} (P.{item.itemLevel})
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnequip(slot);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f87171',
                                fontSize: 10,
                                fontWeight: 900,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Zdejmij
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Pusty slot</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Set Bonus Live Tracker */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 12,
                borderColor: stats.activeSetRarity
                  ? RARITY_META[stats.activeSetRarity].color
                  : '#334155',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: '#fde047', marginBottom: 4 }}>
                ✨ BONUS ZA KOMPLETNY ZESTAW (6/6)
              </div>
              {stats.activeSetRarity ? (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 900, color: RARITY_META[stats.activeSetRarity].color }}>
                    AKTYWNY: Zestaw {RARITY_META[stats.activeSetRarity].name} (6/6)!
                  </div>
                  <div style={{ color: '#4ade80', fontWeight: 800, marginTop: 3 }}>
                    {getFullSetBonus(profile.classId, stats.activeSetRarity).summary}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Załóż 6 przedmiotów tej samej rzadkości!
                  <div style={{ marginTop: 4, color: RARITY_META[bestSetRarity].color, fontWeight: 800 }}>
                    Najbliżej: {RARITY_META[bestSetRarity].name} ({stats.setCounts[bestSetRarity]}/6) →{' '}
                    {getFullSetBonus(profile.classId, bestSetRarity).summary}
                  </div>
                </div>
              )}
            </div>

            {/* Computed Total Stats */}
            <div className="comic-panel-sm" style={{ padding: 12, fontSize: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#4ade80', marginBottom: 6 }}>
                STATYSTYKI CAŁKOWITE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div>❤️ HP: <strong>{stats.maxHp}</strong></div>
                <div>💧 Mana: <strong>{stats.maxMana}</strong></div>
                <div>⚔️ AD: <strong style={{ color: '#fca5a5' }}>{stats.ad}</strong></div>
                <div>🔮 AP: <strong style={{ color: '#d8b4fe' }}>{stats.ap}</strong></div>
                <div>🛡️ DEF: <strong style={{ color: '#93c5fd' }}>{stats.def}</strong></div>
                <div>💥 Kryt: <strong style={{ color: '#fde047' }}>{stats.critChance}%</strong> ({stats.critDamage}%)</div>
                <div>⚡ Szyb. Ataku: <strong>{stats.attackSpeed}×</strong></div>
                <div>🦶 Ruch: <strong>{stats.moveSpeed}×</strong></div>
                <div>⏱️ CDR: <strong>{stats.cdr}%</strong></div>
                <div>💨 Unik / DR: <strong>{stats.dodgeChance}% / {stats.damageReduction}%</strong></div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  fontSize: 13,
                  fontWeight: 900,
                  color: '#fde047',
                }}
              >
                🔥 Moc Bojowa: {stats.combatPower.toLocaleString()}
              </div>
            </div>
          </div>

          {/* RIGHT: Shards + Backpack + Salvage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Shard Bag Bar */}
            <div className="comic-panel-sm" style={{ padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', marginBottom: 6 }}>
                POSIADANE ODŁAMKI (DO ULEPSZANIA U KOWALA +0 → +13)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {RARITY_ORDER.map((r) => {
                  const m = RARITY_META[r];
                  return (
                    <div
                      key={r}
                      style={{
                        background: '#131627',
                        border: `2px solid ${m.color}`,
                        borderRadius: 8,
                        padding: '5px 7px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 10, color: m.color, fontWeight: 900 }}>{m.name}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
                        💎 {profile.shards[r] || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bulk Salvage Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1' }}>Szybkie Rozbieranie:</span>
              {(['zwykly', 'normalny', 'mityczny'] as Rarity[]).map((r) => {
                const count = profile.inventory.filter((i) => i.rarity === r).length;
                return (
                  <button
                    key={r}
                    disabled={count === 0}
                    onClick={() => onBulkSalvage(r)}
                    className="comic-btn comic-btn-dark"
                    style={{
                      padding: '5px 10px',
                      fontSize: 11,
                      borderColor: RARITY_META[r].color,
                      color: RARITY_META[r].color,
                    }}
                  >
                    ♻️ Rozbierz {RARITY_META[r].name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Selected Item Detail + Actions */}
            {selectedItem && (
              <div
                className="comic-panel-sm"
                style={{
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  background: '#14172b',
                }}
              >
                <ItemTooltip item={selectedItem} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profile.inventory.some((i) => i.id === selectedItem.id) && (
                    <>
                      <button
                        className="comic-btn comic-btn-green"
                        onClick={() => {
                          onEquip(selectedItem);
                          setSelectedItem(null);
                        }}
                        style={{ padding: '8px 16px', fontSize: 13 }}
                      >
                        ⚔️ Załóż Przedmiot
                      </button>
                      <button
                        className="comic-btn comic-btn-red"
                        onClick={() => {
                          onSalvageItem(selectedItem.id);
                          setSelectedItem(null);
                        }}
                        style={{ padding: '8px 16px', fontSize: 13 }}
                      >
                        ♻️ Rozbierz (+{getSalvageShardYield(selectedItem)}{' '}
                        {RARITY_META[selectedItem.rarity].shardName})
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Backpack Grid */}
            <div className="comic-panel-sm" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', marginBottom: 8 }}>
                PLECAK ({profile.inventory.length} / 60) — Kliknij, by obejrzeć • Podwójny klik, by założyć
              </div>
              {profile.inventory.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Plecak jest pusty — pokonuj wrogów i otwieraj skrzynie z łupem!
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                    gap: 8,
                    maxHeight: 300,
                    overflowY: 'auto',
                  }}
                >
                  {profile.inventory.map((item) => {
                    const m = RARITY_META[item.rarity];
                    const isSel = selectedItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        onDoubleClick={() => {
                          onEquip(item);
                          setSelectedItem(null);
                        }}
                        className={item.rarity === 'boski' ? 'boski-shimmer' : ''}
                        style={{
                          background: isSel ? '#2b3155' : '#131627',
                          border: `2.5px solid ${m.color}`,
                          borderRadius: 9,
                          padding: 7,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span>{SLOT_LABELS[item.slot].icon}</span>
                          <span style={{ color: '#fde047', fontWeight: 900 }}>
                            {item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : `P.${item.itemLevel}`}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: m.color,
                            marginTop: 3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{m.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CLASSES } from '../../shared/classes';
import {
  canClassEquipItem,
  getEffectiveItemBaseStats,
  getPlus13ClassBonus,
  getSalvageShardYield,
  MAX_UPGRADE_LEVEL,
  RARITY_META,
  SLOT_LABELS,
} from '../../shared/items';
import type { ClassId, EquipmentItem } from '../../shared/types';

interface ItemTooltipProps {
  item: EquipmentItem;
  viewerClassId?: ClassId;
  compact?: boolean;
}

const BONUS_LABELS: Record<string, string> = {
  hp: 'HP',
  ad: 'Atak Fiz. (AD)',
  ap: 'Atak Mag. (AP)',
  def: 'Obrona (DEF)',
  critChance: 'Szansa na Kryt',
  critDamage: 'Obr. Krytyczne',
  attackSpeed: 'Szyb. Ataku',
  moveSpeed: 'Szyb. Ruchu',
  cdr: 'Skrócenie CD',
  healPower: 'Moc Leczenia/Tarcz',
  dodge: 'Szansa na Unik',
};

const PCT_KEYS = new Set([
  'critChance',
  'critDamage',
  'attackSpeed',
  'moveSpeed',
  'cdr',
  'healPower',
  'dodge',
]);

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, viewerClassId, compact }) => {
  const meta = RARITY_META[item.rarity];
  const slotInfo = SLOT_LABELS[item.slot];
  const base = getEffectiveItemBaseStats(item);
  const bonusEntries = Object.entries(item.bonusStats).filter(
    ([, v]) => typeof v === 'number' && v > 0
  );

  const itemClassId = item.classAffinity;
  const itemClassDef = itemClassId ? CLASSES[itemClassId] : null;
  const canEquip = viewerClassId ? canClassEquipItem(item, viewerClassId) : true;
  const p13Bonus = itemClassId
    ? getPlus13ClassBonus(itemClassId)
    : viewerClassId
      ? getPlus13ClassBonus(viewerClassId)
      : null;

  return (
    <div
      className={`comic-panel-sm p-3 text-left ${item.rarity === 'boski' ? 'boski-shimmer' : ''}`}
      style={{
        borderColor: meta.color,
        minWidth: compact ? 200 : 250,
        maxWidth: 310,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: meta.color, lineHeight: 1.2 }}>
            {slotInfo.icon} {item.name}
            {item.upgradeLevel > 0 && (
              <span style={{ color: '#fde047', marginLeft: 5 }}>+{item.upgradeLevel}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <span
              style={{
                background: meta.badgeBg,
                padding: '1px 6px',
                borderRadius: 6,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {meta.name}
            </span>
            <span>
              {slotInfo.name} • Poz. {item.itemLevel}
            </span>
          </div>
          {itemClassDef && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: 900,
                color: canEquip ? itemClassDef.primaryColor : '#f87171',
              }}
            >
              {canEquip ? '✓' : '🔒'} Klasa: {itemClassDef.name}
              {!canEquip && ' (Inna klasa — użyj Handlu lub Rozbierz)'}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {base.hp > 0 && <div style={{ color: '#86efac' }}>❤️ +{base.hp} HP</div>}
        {base.ad > 0 && <div style={{ color: '#fca5a5' }}>⚔️ +{base.ad} AD</div>}
        {base.ap > 0 && <div style={{ color: '#d8b4fe' }}>🔮 +{base.ap} AP</div>}
        {base.def > 0 && <div style={{ color: '#93c5fd' }}>🛡️ +{base.def} DEF</div>}
      </div>

      {bonusEntries.length > 0 && (
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px dashed rgba(255,255,255,0.15)',
            fontSize: 12,
          }}
        >
          {bonusEntries.map(([key, val]) => (
            <div key={key} style={{ color: '#fde047', fontWeight: 700 }}>
              ✦ +{val}
              {PCT_KEYS.has(key) ? '%' : ''} {BONUS_LABELS[key] || key}
            </div>
          ))}
        </div>
      )}

      {item.upgradeLevel >= 7 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#38bdf8', fontWeight: 800 }}>
          ✨ Aktywna Poświata Kowalska (+{item.upgradeLevel})
        </div>
      )}

      {p13Bonus && item.upgradeLevel >= MAX_UPGRADE_LEVEL && (
        <div
          style={{
            marginTop: 7,
            padding: '6px 8px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(244,63,94,0.25), rgba(168,85,247,0.25))',
            border: '1.5px solid #fb7185',
            fontSize: 11,
          }}
        >
          <div style={{ fontWeight: 900, color: '#fde047' }}>
            🌟 {p13Bonus.icon} {p13Bonus.title}
          </div>
          <div style={{ color: '#fff', fontWeight: 800, marginTop: 2 }}>{p13Bonus.summary}</div>
        </div>
      )}

      {p13Bonus && item.upgradeLevel < MAX_UPGRADE_LEVEL && !compact && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: '#a5b4fc',
            borderTop: '1px dashed rgba(255,255,255,0.12)',
            paddingTop: 5,
          }}
        >
          👑 Bonus na +13 ({p13Bonus.title}): {p13Bonus.summary}
        </div>
      )}

      {!compact && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
          Rozebranie: +{getSalvageShardYield(item)} × {meta.shardName}
        </div>
      )}
    </div>
  );
};

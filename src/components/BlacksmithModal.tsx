import React, { useState } from 'react';
import {
  EQUIP_SLOTS,
  getEffectiveItemBaseStats,
  getUpgradeShardCost,
  MAX_UPGRADE_LEVEL,
  RARITY_META,
  SLOT_LABELS,
} from '../../shared/items';
import type { EquipmentItem, PlayerProfile } from '../../shared/types';
import { soundEngine } from '../audio/soundEngine';

interface BlacksmithModalProps {
  profile: PlayerProfile;
  onUpgradeItem: (itemId: string) => void;
  onClose: () => void;
}

export const BlacksmithModal: React.FC<BlacksmithModalProps> = ({
  profile,
  onUpgradeItem,
  onClose,
}) => {
  const allItems: Array<{ item: EquipmentItem; equipped: boolean }> = [
    ...EQUIP_SLOTS.map((s) => profile.equipped[s])
      .filter((i): i is EquipmentItem => i !== null)
      .map((item) => ({ item, equipped: true })),
    ...profile.inventory.map((item) => ({ item, equipped: false })),
  ];

  const [selectedId, setSelectedId] = useState<string | null>(allItems[0]?.item.id ?? null);
  const [forging, setForging] = useState(false);
  const [tensionPct, setTensionPct] = useState(0);
  const [justUpgraded, setJustUpgraded] = useState<string | null>(null);

  const selectedEntry = allItems.find((e) => e.item.id === selectedId) ?? allItems[0] ?? null;
  const item = selectedEntry?.item ?? null;

  const handleForge = () => {
    if (!item || forging || item.upgradeLevel >= MAX_UPGRADE_LEVEL) return;
    const cost = getUpgradeShardCost(item.upgradeLevel);
    if ((profile.shards[item.rarity] || 0) < cost) return;

    const targetLvl = item.upgradeLevel + 1;
    setForging(true);
    setJustUpgraded(null);
    setTensionPct(0);
    soundEngine.playAnvilTension(targetLvl);

    // Rising tension duration scales dramatically for +7 to +13!
    const totalMs = targetLvl >= 10 ? 1150 : targetLvl >= 7 ? 850 : 520;
    const start = performance.now();

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / totalMs);
      setTensionPct(Math.round(p * 100));
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        soundEngine.playAnvilStrike(targetLvl);
        onUpgradeItem(item.id);
        setForging(false);
        setJustUpgraded(`SUKCES! ${item.name} +${targetLvl}!`);
        setTimeout(() => setJustUpgraded(null), 2200);
      }
    };
    requestAnimationFrame(step);
  };

  const currStats = item ? getEffectiveItemBaseStats(item) : null;
  const nextStats =
    item && item.upgradeLevel < MAX_UPGRADE_LEVEL
      ? getEffectiveItemBaseStats({ ...item, upgradeLevel: item.upgradeLevel + 1 })
      : null;

  const cost = item ? getUpgradeShardCost(item.upgradeLevel) : 0;
  const ownedShards = item ? profile.shards[item.rarity] || 0 : 0;

  return (
    <div className="modal-backdrop" onClick={() => !forging && onClose()}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(940px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 32, color: '#fbbf24' }}>
              🔨 KUŹNIA KOWALA (+0 → +13)
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Ulepszaj ekwipunek odpowiednimi Odłamkami • Od <strong>+7</strong> broń i zbroja zyskują magiczną poświatę 3D!
            </div>
          </div>
          <button
            className="comic-btn comic-btn-red"
            disabled={forging}
            onClick={onClose}
            style={{ padding: '6px 14px' }}
          >
            ✕ Zamknij [B]
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Left: Item list */}
          <div className="comic-panel-sm" style={{ padding: 10, maxHeight: 460, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', marginBottom: 8 }}>
              WYBIERZ PRZEDMIOT DO KUCIA ({allItems.length})
            </div>
            {allItems.map(({ item: it, equipped }) => {
              const m = RARITY_META[it.rarity];
              const sel = item?.id === it.id;
              return (
                <div
                  key={it.id}
                  onClick={() => !forging && setSelectedId(it.id)}
                  style={{
                    background: sel ? '#2d3358' : '#131627',
                    border: `2px solid ${sel ? '#fde047' : m.color}`,
                    borderRadius: 9,
                    padding: '7px 9px',
                    marginBottom: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: m.color,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {SLOT_LABELS[it.slot].icon} {it.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {equipped ? '★ Założony' : 'Plecak'} • {m.name} (P.{it.itemLevel})
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#fde047', marginLeft: 8 }}>
                    +{it.upgradeLevel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Anvil Stage */}
          <div className="comic-panel-sm" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {item && currStats ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div
                    className="comic-title"
                    style={{ fontSize: 28, color: RARITY_META[item.rarity].color }}
                  >
                    {SLOT_LABELS[item.slot].icon} {item.name}{' '}
                    <span style={{ color: '#fde047' }}>+{item.upgradeLevel}</span>
                  </div>

                  {/* Animated Anvil & Hammer Stage */}
                  <div
                    style={{
                      margin: '14px auto',
                      width: 180,
                      height: 118,
                      background:
                        item.upgradeLevel >= 13
                          ? 'radial-gradient(circle, rgba(244,63,94,0.45), #131627 72%)'
                          : item.upgradeLevel >= 7
                            ? 'radial-gradient(circle, rgba(56,189,248,0.38), #131627 72%)'
                            : '#131627',
                      border: `3px solid ${item.upgradeLevel >= 7 ? '#38bdf8' : '#111118'}`,
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      className={forging ? 'anvil-hammer-anim' : ''}
                      style={{ fontSize: 48, lineHeight: 1 }}
                    >
                      🔨
                    </div>
                    <div style={{ fontSize: 26, marginTop: -4 }}>🪨</div>
                    {item.upgradeLevel >= 7 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          fontSize: 10,
                          fontWeight: 900,
                          color: item.upgradeLevel === 13 ? '#fb7185' : '#38bdf8',
                        }}
                      >
                        ✨ POŚWIATA +{item.upgradeLevel} AKTYWNA
                      </div>
                    )}
                  </div>

                  {/* Tension Bar */}
                  {forging && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#fde047', marginBottom: 4 }}>
                        🔥 ROZGRZEWANIE KOWADŁA... {tensionPct}%
                      </div>
                      <div
                        style={{
                          height: 14,
                          background: '#0f1221',
                          border: '2px solid #111118',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${tensionPct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #f59e0b, #ef4444, #fde047)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {justUpgraded && (
                    <div
                      className="comic-title"
                      style={{ fontSize: 24, color: '#4ade80', marginBottom: 8 }}
                    >
                      ✨ {justUpgraded}
                    </div>
                  )}

                  {/* Before -> After Stat Preview */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      gap: 10,
                      background: '#131627',
                      padding: 12,
                      borderRadius: 10,
                      border: '2px solid #2b3052',
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800 }}>
                        OBECNIE (+{item.upgradeLevel})
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                        {currStats.hp > 0 && <div>❤️ HP: {currStats.hp}</div>}
                        {currStats.ad > 0 && <div>⚔️ AD: {currStats.ad}</div>}
                        {currStats.ap > 0 && <div>🔮 AP: {currStats.ap}</div>}
                        {currStats.def > 0 && <div>🛡️ DEF: {currStats.def}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, color: '#fde047' }}>➔</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 800 }}>
                        {nextStats ? `PO KUCIU (+${item.upgradeLevel + 1})` : 'MAKSIMUM (+13)'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', marginTop: 4 }}>
                        {nextStats ? (
                          <>
                            {nextStats.hp > 0 && <div>❤️ HP: {nextStats.hp}</div>}
                            {nextStats.ad > 0 && <div>⚔️ AD: {nextStats.ad}</div>}
                            {nextStats.ap > 0 && <div>🔮 AP: {nextStats.ap}</div>}
                            {nextStats.def > 0 && <div>🛡️ DEF: {nextStats.def}</div>}
                          </>
                        ) : (
                          <div>🏆 MAKSYMALNY POZIOM!</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost & Forge Button */}
                <div>
                  {item.upgradeLevel < MAX_UPGRADE_LEVEL ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        <span>
                          Wymagany materiał:{' '}
                          <strong style={{ color: RARITY_META[item.rarity].color }}>
                            {cost} × {RARITY_META[item.rarity].shardName}
                          </strong>
                        </span>
                        <span style={{ color: ownedShards >= cost ? '#4ade80' : '#f87171' }}>
                          Posiadasz: 💎 {ownedShards}
                        </span>
                      </div>
                      {item.upgradeLevel + 1 === 7 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#38bdf8',
                            fontWeight: 900,
                            marginBottom: 8,
                            textAlign: 'center',
                          }}
                        >
                          ✨ Następny poziom (+7) odblokowuje ŚWIETLISTĄ POŚWIATĘ 3D na postaci!
                        </div>
                      )}
                      <button
                        className="comic-btn comic-btn-gold"
                        disabled={forging || ownedShards < cost}
                        onClick={handleForge}
                        style={{ width: '100%', padding: '13px 16px', fontSize: 17 }}
                      >
                        {forging
                          ? '🔥 KUCIE W TOKU...'
                          : ownedShards < cost
                            ? '❌ ZA MAŁO ODŁAMKÓW (Rozbierz sprzęt w Ekwipunku)'
                            : `🔨 ULEPSZ DO +${item.upgradeLevel + 1}`}
                      </button>
                    </>
                  ) : (
                    <div
                      className="comic-title"
                      style={{ textAlign: 'center', fontSize: 24, color: '#fb7185' }}
                    >
                      👑 PRZEDMIOT OSIĄGNĄŁ MAKSIMUM (+13)!
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                Brak przedmiotów do ulepszenia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

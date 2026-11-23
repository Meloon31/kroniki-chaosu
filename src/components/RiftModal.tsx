import React, { useState } from 'react';
import { CLASSES } from '../../shared/classes';
import {
  formatRiftTime,
  getRiftFloorAct,
  getRiftFloorDamageMultiplier,
  getRiftFloorHpMultiplier,
  getRiftFloorLuckBonus,
  RIFT_CATEGORY_LABELS,
  RiftCategory,
  RiftLeaderboardMap,
} from '../../shared/rift';
import { getPactRewardSummary, PACT_CURSES } from '../../shared/hades';
import { ACT_THEMES } from '../../shared/world';
import type { PlayerProfile, RoomSummary } from '../../shared/types';

interface RiftModalProps {
  profile: PlayerProfile;
  room: RoomSummary | null;
  leaderboard: RiftLeaderboardMap;
  activePactCurses?: string[];
  onTogglePactCurse?: (curseId: string) => void;
  onStartRift: (floor: number) => void;
  onRefreshLeaderboard: () => void;
  onClose: () => void;
}

const CATEGORIES: RiftCategory[] = ['solo', 'duo', 'trio', 'quad'];

export const RiftModal: React.FC<RiftModalProps> = ({
  profile,
  room,
  leaderboard,
  activePactCurses = [],
  onTogglePactCurse,
  onStartRift,
  onRefreshLeaderboard,
  onClose,
}) => {
  const pactSummary = getPactRewardSummary(activePactCurses);
  const unlocked =
    profile.sandboxUnlockAll ||
    (profile.defeatedActBosses || []).includes(4) ||
    (profile.completedLocations || []).includes(60);

  const maxSelectFloor = Math.max(1, (profile.bestRiftFloor || 0) + 1);
  const [floor, setFloor] = useState<number>(Math.max(1, profile.bestRiftFloor || 1));
  const [catTab, setCatTab] = useState<RiftCategory>(
    room ? (room.members.length <= 1 ? 'solo' : room.members.length === 2 ? 'duo' : room.members.length === 3 ? 'trio' : 'quad') : 'solo'
  );

  const floorAct = getRiftFloorAct(floor);
  const actTheme = ACT_THEMES[floorAct];
  const entries = leaderboard[catTab] || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(960px, 95vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
          borderColor: '#c084fc',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: '#e879f9' }}>
              🌀 SZCZELINA CHAOSU — ENDLESS ENDGAME
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Nieskończone piętra pod sprzęt <strong>+10 → +13</strong> i wymaksowane Runy Bossów • Tablica Wyników 1–4 graczy!
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="comic-btn comic-btn-dark" onClick={onRefreshLeaderboard} style={{ padding: '6px 12px', fontSize: 12 }}>
              🔄 Odśwież
            </button>
            <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
              ✕ Zamknij
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
          {/* Left: Launch Panel */}
          <div className="comic-panel-sm" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#c084fc', letterSpacing: 1 }}>
              WYBÓR PIĘTRA SZCZELINY
            </div>

            {!unlocked ? (
              <div
                style={{
                  background: 'rgba(225, 29, 72, 0.18)',
                  border: '1.5px solid #fb7185',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 900, color: '#fde047', marginBottom: 4 }}>🔒 SZCZELINA ZABLOKOWANA</div>
                Pokonaj <strong>Vaelgora, Archonta Chaosu</strong> (Akt 4, Lokacja 60), aby odblokować nieskończoną Szczelinę Chaosu!
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    className="comic-btn comic-btn-dark"
                    disabled={floor <= 1}
                    onClick={() => setFloor((f) => Math.max(1, f - 1))}
                    style={{ width: 42, height: 42, fontSize: 18 }}
                  >
                    −
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800 }}>PIĘTRO</div>
                    <div className="comic-title" style={{ fontSize: 36, color: '#fde047', lineHeight: 1 }}>
                      #{floor}
                    </div>
                  </div>
                  <button
                    className="comic-btn comic-btn-dark"
                    disabled={!profile.sandboxUnlockAll && floor >= maxSelectFloor}
                    onClick={() => setFloor((f) => f + 1)}
                    style={{ width: 42, height: 42, fontSize: 18 }}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 18, 36, 0.72)',
                    border: `1.5px solid ${actTheme.accentGlowColor}66`,
                    borderRadius: 12,
                    padding: 11,
                    fontSize: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}
                >
                  <div>
                    Biom piętra:{' '}
                    <strong style={{ color: actTheme.accentGlowColor }}>
                      {actTheme.name.replace(/^(HARDCORE )?Akt \d: /, '')}
                    </strong>
                  </div>
                  <div>
                    HP Wrogów:{' '}
                    <strong style={{ color: '#fb7185' }}>×{getRiftFloorHpMultiplier(floor).toFixed(2)}</strong>
                  </div>
                  <div>
                    Obrażenia Wrogów:{' '}
                    <strong style={{ color: '#fb923c' }}>×{getRiftFloorDamageMultiplier(floor).toFixed(2)}</strong>
                  </div>
                  <div>
                    Bonus Magic Find:{' '}
                    <strong style={{ color: '#4ade80' }}>
                      +{Math.round((getRiftFloorLuckBonus(floor) - 1) * 100)}%
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                  Twój rekord: <strong style={{ color: '#fde047' }}>Piętro {profile.bestRiftFloor || 0}</strong> •
                  Kategoria party: <strong style={{ color: '#7dd3fc' }}>{room ? `${room.members.length} os.` : 'Solo'}</strong>
                </div>

                {/* Pact of Chaos (Heat System à la Hades) */}
                {onTogglePactCurse && (
                  <div
                    style={{
                      background: 'rgba(136, 19, 55, 0.22)',
                      border: '1.5px solid rgba(251, 113, 133, 0.45)',
                      borderRadius: 11,
                      padding: 9,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 900, color: '#fde047' }}>
                        🔥 PIECZĘCIE WYZWANIA (Groza: {pactSummary.totalHeat})
                      </span>
                      {pactSummary.totalHeat > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 900, color: '#4ade80' }}>
                          +{Math.round((pactSummary.lootLuckMult - 1) * 100)}% Drop • +{pactSummary.xpBonusPct}% XP
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {PACT_CURSES.map((c) => {
                        const on = activePactCurses.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => onTogglePactCurse(c.id)}
                            title={c.description}
                            style={{
                              padding: '5px 7px',
                              borderRadius: 8,
                              border: `1.5px solid ${on ? c.color : 'rgba(255,255,255,0.12)'}`,
                              background: on ? `${c.color}2e` : 'rgba(15, 18, 34, 0.72)',
                              color: on ? '#fff' : '#94a3b8',
                              fontSize: 10,
                              fontWeight: 800,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>
                              {c.icon} {c.name}
                            </span>
                            <span style={{ color: c.color }}>+{c.heat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  className="mmo-play-cta"
                  onClick={() => {
                    onStartRift(floor);
                    onClose();
                  }}
                  style={{ width: '100%', padding: '13px 16px', fontSize: 15, marginTop: 'auto' }}
                >
                  🌀 WEJDŹ NA PIĘTRO #{floor}{pactSummary.totalHeat > 0 ? ` (🔥 GROZA ${pactSummary.totalHeat})` : ''}
                </button>
              </>
            )}
          </div>

          {/* Right: 4-Category Persistent Leaderboard */}
          <div className="comic-panel-sm" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`mmo-tab-btn ${catTab === c ? 'active' : ''}`}
                  onClick={() => setCatTab(c)}
                  style={{ fontSize: 11.5, padding: '7px 8px' }}
                >
                  {RIFT_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 16px', color: '#94a3b8', fontSize: 13 }}>
                Brak zapisanych wyników w kategorii <strong>{RIFT_CATEGORY_LABELS[catTab]}</strong>.<br />
                Ukończ 1. piętro Szczeliny Chaosu, aby zapisać się na szczycie Tablicy Wyników!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                {entries.map((ent, idx) => (
                  <div
                    key={ent.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr 90px 84px',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 11,
                      background:
                        idx === 0
                          ? 'linear-gradient(90deg, rgba(250,204,21,0.22), rgba(18,22,40,0.85))'
                          : idx === 1
                            ? 'linear-gradient(90deg, rgba(203,213,225,0.16), rgba(18,22,40,0.85))'
                            : idx === 2
                              ? 'linear-gradient(90deg, rgba(217,119,6,0.18), rgba(18,22,40,0.85))'
                              : 'rgba(15, 18, 34, 0.72)',
                      border: idx === 0 ? '1.5px solid #fde047' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 15, color: idx === 0 ? '#fde047' : '#cbd5e1' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ent.players.map((pl, pi) => (
                        <span
                          key={pi}
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#fff',
                            background: `${CLASSES[pl.classId].primaryColor}28`,
                            border: `1px solid ${CLASSES[pl.classId].primaryColor}66`,
                            padding: '2px 8px',
                            borderRadius: 99,
                          }}
                        >
                          {pl.name} <span style={{ opacity: 0.75, fontSize: 10 }}>P.{pl.level}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 900, color: '#e879f9', fontSize: 14 }}>
                      Piętro {ent.floor}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: '#7dd3fc', fontSize: 12.5 }}>
                      ⏱️ {formatRiftTime(ent.clearTimeMs)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

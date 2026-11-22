import React from 'react';
import {
  BOUNTY_BY_ID,
  canClaimDailyReward,
  DAILY_REWARDS,
  ensureActiveBounties,
  getNextDailyDay,
} from '../../shared/bounties';
import { RARITY_META } from '../../shared/items';
import type { PlayerProfile, Rarity } from '../../shared/types';

interface BountiesModalProps {
  profile: PlayerProfile;
  onClaimDaily: () => void;
  onClaimBounty: (slotIndex: number) => void;
  onClose: () => void;
}

export const BountiesModal: React.FC<BountiesModalProps> = ({
  profile,
  onClaimDaily,
  onClaimBounty,
  onClose,
}) => {
  const dailyAvailable = canClaimDailyReward(profile.lastDailyClaimDate);
  const currentDailyDay = getNextDailyDay(profile.dailyStreak, profile.lastDailyClaimDate);
  const bounties = ensureActiveBounties(profile.bounties);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 9, 20, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="comic-panel"
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
          background: 'linear-gradient(160deg, #1a1f3c 0%, #12162b 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 28, color: '#fde047' }}>
              🏆 MISJE & NAGRODY DNIA
            </h2>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Wykonuj zlecenia solo lub ze znajomymi, aby zdobywać XP, odłamki i gwarantowany sprzęt!
              {typeof profile.lifetimeKills === 'number' && profile.lifetimeKills > 0
                ? ` • Pokonani wrogowie: ${profile.lifetimeKills}`
                : ''}
            </div>
          </div>
          <button
            className="comic-btn comic-btn-red"
            onClick={onClose}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            ✕ Zamknij
          </button>
        </div>

        {/* 7-Day Daily Streak Strip */}
        <div
          className="comic-panel-sm"
          style={{
            padding: 14,
            marginBottom: 18,
            background: 'rgba(251, 191, 36, 0.08)',
            borderColor: '#f59e0b',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#fde047' }}>
                🎁 NAGRODA CODZIENNA (Seria: Dzień {currentDailyDay} / 7)
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                Wracaj codziennie po coraz cenniejsze nagrody — 7. dnia czekają Boskie Odłamki i Legendarny sprzęt!
              </div>
            </div>
            <button
              className={`comic-btn ${dailyAvailable ? 'comic-btn-gold' : 'comic-btn-dark'}`}
              disabled={!dailyAvailable}
              onClick={onClaimDaily}
              style={{
                padding: '9px 18px',
                fontSize: 13,
                opacity: dailyAvailable ? 1 : 0.65,
                cursor: dailyAvailable ? 'pointer' : 'default',
              }}
            >
              {dailyAvailable ? `🎁 Odbierz Dzień ${currentDailyDay}!` : '✓ Dzisiejsza odebrana'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {DAILY_REWARDS.map((rew) => {
              const isClaimed = dailyAvailable
                ? rew.day < currentDailyDay
                : rew.day <= currentDailyDay;
              const isToday = dailyAvailable && rew.day === currentDailyDay;
              return (
                <div
                  key={rew.day}
                  title={rew.summary}
                  style={{
                    borderRadius: 10,
                    padding: '8px 4px',
                    textAlign: 'center',
                    border: isToday
                      ? '2.5px solid #fde047'
                      : isClaimed
                        ? '2px solid #22c55e'
                        : '2px solid #2b3252',
                    background: isToday
                      ? 'rgba(250, 204, 21, 0.22)'
                      : isClaimed
                        ? 'rgba(34, 197, 94, 0.14)'
                        : 'rgba(15, 18, 33, 0.72)',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 900, color: isToday ? '#fde047' : '#94a3b8' }}>
                    Dzień {rew.day}
                  </div>
                  <div style={{ fontSize: 22, margin: '4px 0' }}>{isClaimed ? '✅' : rew.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.15 }}>
                    {rew.itemRarity
                      ? RARITY_META[rew.itemRarity].name
                      : `+${rew.xp} XP`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Bounties List */}
        <div style={{ fontSize: 14, fontWeight: 900, color: '#7dd3fc', marginBottom: 10 }}>
          📜 AKTYWNE ZLECENIA WYPRAWOWE (Po odbiorze pojawia się nowe zlecenie!)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bounties.map((bState, idx) => {
            const def = BOUNTY_BY_ID[bState.defId];
            if (!def) return null;
            const cur = Math.min(def.target, bState.progress);
            const pct = Math.min(100, (cur / Math.max(1, def.target)) * 100);
            const done = cur >= def.target;

            const rewardBits: string[] = [`+${def.rewardXp} XP`];
            if (def.rewardShards) {
              for (const [rKey, amt] of Object.entries(def.rewardShards)) {
                if (amt && amt > 0) {
                  rewardBits.push(`${amt}× ${RARITY_META[rKey as Rarity].name} Odłamek`);
                }
              }
            }
            if (def.rewardItemRarity) {
              rewardBits.push(`🎁 ${RARITY_META[def.rewardItemRarity].name} Przedmiot Klasowy`);
            }

            return (
              <div
                key={`${def.id}-${idx}`}
                className="comic-panel-sm"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  flexWrap: 'wrap',
                  borderColor: done ? '#4ade80' : '#2d3659',
                  background: done
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.16), rgba(16,24,48,0.85))'
                    : 'rgba(15, 19, 36, 0.84)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 250 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: done ? '#16a34a' : '#252c4a',
                      border: '2.5px solid #111118',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {def.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 15, color: done ? '#4ade80' : '#f8fafc' }}>
                        {def.title}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: done ? '#4ade80' : '#fde047' }}>
                        {cur} / {def.target}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{def.description}</div>

                    {/* Progress bar */}
                    <div
                      style={{
                        marginTop: 6,
                        height: 10,
                        borderRadius: 99,
                        background: '#0b0e1a',
                        border: '2px solid #111118',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: done
                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                            : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                          transition: 'width 0.25s ease',
                        }}
                      />
                    </div>

                    <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800, marginTop: 5 }}>
                      Nagroda: {rewardBits.join(' • ')}
                    </div>
                  </div>
                </div>

                <div>
                  {done ? (
                    <button
                      className="comic-btn comic-btn-green"
                      onClick={() => onClaimBounty(idx)}
                      style={{ padding: '10px 16px', fontSize: 13 }}
                    >
                      🎁 Odbierz!
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#64748b',
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      W trakcie...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

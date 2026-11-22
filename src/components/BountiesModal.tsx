import React, { useMemo, useState } from 'react';
import {
  BOUNTY_BY_ID,
  canClaimDailyReward,
  canSpinDailyWheel,
  countAllReadyRewards,
  DAILY_ACT_QUEST_REWARD,
  DAILY_BLESSINGS,
  DAILY_REWARDS,
  ensureActiveBounties,
  getDailyBlessing,
  getDailyFeaturedLocation,
  getNextDailyDay,
  getReadySideLocations,
  getTodayDateKey,
  isDailyActQuestClaimed,
  isDailyActQuestReady,
  isMainQuestClaimed,
  isMainQuestCompleted,
  MAIN_ACT_QUESTS,
  rollWheelSliceIndex,
  SIDE_LOCATION_REWARD,
  WHEEL_SLICES,
} from '../../shared/bounties';
import { RARITY_META } from '../../shared/items';
import { RUNES } from '../../shared/runes';
import { ALL_LOCATIONS, getLocationDef } from '../../shared/world';
import type { ActNumber, PlayerProfile, Rarity } from '../../shared/types';
import { soundEngine } from '../audio/soundEngine';

export type BountiesTab = 'daily' | 'main' | 'side' | 'wheel';

interface BountiesModalProps {
  profile: PlayerProfile;
  initialTab?: BountiesTab;
  onClaimDaily: () => void;
  onClaimDailyAct: () => void;
  onClaimBounty: (slotIndex: number) => void;
  onClaimMainQuest: (questId: string) => void;
  onClaimSideLocation: (globalLocation: number) => void;
  onClaimAllSideLocations: () => void;
  onSpinWheelComplete: (sliceIndex: number) => void;
  onJumpToLocation?: (globalLocation: number) => void;
  onClose: () => void;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const BountiesModal: React.FC<BountiesModalProps> = ({
  profile,
  initialTab = 'daily',
  onClaimDaily,
  onClaimDailyAct,
  onClaimBounty,
  onClaimMainQuest,
  onClaimSideLocation,
  onClaimAllSideLocations,
  onSpinWheelComplete,
  onJumpToLocation,
  onClose,
}) => {
  const [tab, setTab] = useState<BountiesTab>(initialTab);
  const [sideAct, setSideAct] = useState<ActNumber>(1);

  // Wheel animation state
  const [spinning, setSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wonSliceIdx, setWonSliceIdx] = useState<number | null>(null);

  const counts = countAllReadyRewards(profile);
  const dailyAvailable = canClaimDailyReward(profile.lastDailyClaimDate);
  const currentDailyDay = getNextDailyDay(profile.dailyStreak, profile.lastDailyClaimDate);
  const dailyActReady = isDailyActQuestReady(profile);
  const dailyActClaimed = isDailyActQuestClaimed(profile);
  const wheelReady = canSpinDailyWheel(profile.lastWheelSpinDate);
  const bounties = ensureActiveBounties(profile.bounties);
  const readySideLocs = getReadySideLocations(profile);
  const fullClearedSet = useMemo(() => new Set(profile.fullClearedLocations || []), [profile.fullClearedLocations]);
  const claimedSideSet = useMemo(() => new Set(profile.claimedSideLocations || []), [profile.claimedSideLocations]);

  const blessing = getDailyBlessing();
  const featured = getDailyFeaturedLocation();
  const featuredLoc = getLocationDef(featured.globalLocation);
  const featuredDoneToday = profile.dailyFeaturedClaimedDate === getTodayDateKey();

  const actLocations = useMemo(
    () => ALL_LOCATIONS.filter((l) => l.act === sideAct),
    [sideAct]
  );

  const handleSpinWheel = () => {
    if (!wheelReady || spinning) return;
    const chosenIdx = rollWheelSliceIndex();
    const sliceAngle = 360 / WHEEL_SLICES.length;
    // Pointer is at top (-90deg / 0deg CSS top). Center of slice i is at i * sliceAngle + sliceAngle/2.
    // To land slice i under the top pointer, rotate wheel clockwise to (360 - centerAngle) + extra full turns!
    const centerDeg = chosenIdx * sliceAngle + sliceAngle / 2;
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.52);
    const targetDeg = 360 * 6 + (360 - centerDeg) + jitter;

    setSpinning(true);
    setWonSliceIdx(null);
    setWheelAngle((prev) => prev + targetDeg - (prev % 360));

    // Play crisp comic wheel ticks during spin
    const tickTimes = [140, 290, 460, 650, 860, 1100, 1380, 1700, 2080, 2520, 3020, 3580];
    for (const ms of tickTimes) {
      window.setTimeout(() => soundEngine.playPuzzleTick(), ms);
    }

    window.setTimeout(() => {
      setSpinning(false);
      setWonSliceIdx(chosenIdx);
      onSpinWheelComplete(chosenIdx);
    }, 4300);
  };

  const tabButton = (id: BountiesTab, label: string, badge: number) => {
    const active = tab === id;
    return (
      <button
        key={id}
        className={`comic-btn ${active ? 'comic-btn-gold' : 'comic-btn-dark'}`}
        onClick={() => !spinning && setTab(id)}
        style={{
          padding: '8px 14px',
          fontSize: 12.5,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <span>{label}</span>
        {badge > 0 && (
          <span
            style={{
              background: '#22c55e',
              color: '#052e16',
              borderRadius: 99,
              padding: '0 6px',
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 9, 20, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 65,
        padding: 16,
      }}
      onClick={() => !spinning && onClose()}
    >
      <div
        className="comic-panel"
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '91vh',
          overflowY: 'auto',
          padding: 20,
          background: 'linear-gradient(160deg, #1a1f3c 0%, #11152b 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            gap: 12,
          }}
        >
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 28, color: '#fde047' }}>
              🏆 DZIENNIK MISJI & SKARBIEC DNIA
            </h2>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Misje Główne, Poboczne, Dzienne + Koło Fortuny Chaosu & Błogosławieństwo Dnia!
              {typeof profile.lifetimeKills === 'number' && profile.lifetimeKills > 0
                ? ` • Pokonani wrogowie: ${profile.lifetimeKills}`
                : ''}
            </div>
          </div>
          <button
            className="comic-btn comic-btn-red"
            disabled={spinning}
            onClick={onClose}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            ✕ Zamknij
          </button>
        </div>

        {/* 4 Clean Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabButton('daily', '☀️ Dzienne', counts.daily)}
          {tabButton('main', '📜 Główne', counts.main)}
          {tabButton('side', '🗺️ Poboczne', counts.side)}
          {tabButton('wheel', '🎡 Koło & Eventy', counts.wheel)}
        </div>

        {/* ===================================================== */}
        {/* TAB 1: MISJE DZIENNE + 7-DNIOWA SERIA + ZLECENIA       */}
        {/* ===================================================== */}
        {tab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Featured Daily Quest: Login + Clear Act Boss -> 2 Legendary + 1 Boski! */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 15,
                borderColor: dailyActReady ? '#4ade80' : '#f43f5e',
                background: dailyActReady
                  ? 'linear-gradient(120deg, rgba(34,197,94,0.2), rgba(225,29,72,0.12))'
                  : 'linear-gradient(120deg, rgba(225,29,72,0.16), rgba(30,22,58,0.85))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#fda4af', letterSpacing: 0.8 }}>
                    ☀️ MISJA DZIENNA PREMIUM (Resetuje się codziennie o północy!)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fef08a', marginTop: 2 }}>
                    👑 Zaloguj się i Przejdź Dowolny Akt!
                  </div>
                  <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ color: '#4ade80', fontWeight: 800 }}>✅ 1. Zalogowano dzisiaj</span>
                    <span
                      style={{
                        color: dailyActReady || dailyActClaimed ? '#4ade80' : '#fde047',
                        fontWeight: 800,
                      }}
                    >
                      {dailyActReady || dailyActClaimed ? '✅' : '⏳'} 2. Pokonaj Bossa dowolnego Aktu (Lok. 15 / 30 / 45 / 60)
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 900, color: '#fb7185', marginTop: 6 }}>
                    🎁 Nagroda: <span style={{ color: '#fb923c' }}>2× Legendarny Odłamek</span> +{' '}
                    <span style={{ color: '#f43f5e' }}>1× BOSKI Odłamek</span> +{' '}
                    <span style={{ color: '#4ade80' }}>{DAILY_ACT_QUEST_REWARD.xp} XP</span>
                  </div>
                </div>
                <div>
                  {dailyActClaimed ? (
                    <span
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: 'rgba(34,197,94,0.18)',
                        border: '2px solid #22c55e',
                        color: '#4ade80',
                        fontWeight: 900,
                        fontSize: 12.5,
                      }}
                    >
                      ✅ Odebrano dzisiaj
                    </span>
                  ) : dailyActReady ? (
                    <button
                      className="comic-btn comic-btn-green"
                      onClick={onClaimDailyAct}
                      style={{ padding: '10px 18px', fontSize: 13.5 }}
                    >
                      🎁 Odbierz 2L + 1B!
                    </button>
                  ) : (
                    <span
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.06)',
                        color: '#cbd5e1',
                        fontWeight: 800,
                        fontSize: 11.5,
                      }}
                    >
                      Pokonaj Bossa Aktu!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 7-Day Daily Streak Strip */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 14,
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
                    🎁 NAGRODA ZA CODZIENNE LOGOWANIE (Seria: Dzień {currentDailyDay} / 7)
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Loguj się dzień po dniu, aby odblokować Boskie Odłamki i Legendarny sprzęt 7. dnia!
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
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 900, color: isToday ? '#fde047' : '#94a3b8' }}>
                        Dzień {rew.day}
                      </div>
                      <div style={{ fontSize: 22, margin: '4px 0' }}>{isClaimed ? '✅' : rew.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.15 }}>
                        {rew.itemRarity ? RARITY_META[rew.itemRarity].name : `+${rew.xp} XP`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3 Active Repeatable Bounties */}
            <div style={{ fontSize: 13, fontWeight: 900, color: '#7dd3fc' }}>
              ⚔️ DODATKOWE ZLECENIA WYPRAWOWE (Odnawiają się natychmiast po odbiorze!)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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
                  rewardBits.push(`🎁 ${RARITY_META[def.rewardItemRarity].name} Przedmiot`);
                }

                return (
                  <div
                    key={`${def.id}-${idx}`}
                    className="comic-panel-sm"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
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
                          width: 42,
                          height: 42,
                          borderRadius: 11,
                          background: done ? '#16a34a' : '#252c4a',
                          border: '2.5px solid #111118',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        {def.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: 14, color: done ? '#4ade80' : '#f8fafc' }}>
                            {def.title}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: done ? '#4ade80' : '#fde047' }}>
                            {cur} / {def.target}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>{def.description}</div>
                        <div
                          style={{
                            marginTop: 5,
                            height: 8,
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
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800, marginTop: 4 }}>
                          Nagroda: {rewardBits.join(' • ')}
                        </div>
                      </div>
                    </div>
                    {done ? (
                      <button
                        className="comic-btn comic-btn-green"
                        onClick={() => onClaimBounty(idx)}
                        style={{ padding: '8px 15px', fontSize: 12.5 }}
                      >
                        🎁 Odbierz!
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>W trakcie...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 2: MISJE GŁÓWNE (4 BOSSOWIE AKTÓW — 1. RAZ)       */}
        {/* ===================================================== */}
        {tab === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12.5, color: '#cbd5e1', marginBottom: 2 }}>
              Pokonaj Głównego Bossa każdego Aktu po raz pierwszy, aby odebrać{' '}
              <strong style={{ color: '#4ade80' }}>gwarantowaną Runę Bossa</strong> oraz ogromny pakiet odłamków ulepszania!
            </div>

            {MAIN_ACT_QUESTS.map((q) => {
              const completed = isMainQuestCompleted(profile, q);
              const claimed = isMainQuestClaimed(profile, q);
              const runeDef = RUNES[q.runeId];
              return (
                <div
                  key={q.id}
                  className="comic-panel-sm"
                  style={{
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                    borderColor: claimed ? '#22c55e' : completed ? '#fde047' : '#334155',
                    background: claimed
                      ? 'rgba(34, 197, 94, 0.1)'
                      : completed
                        ? 'linear-gradient(90deg, rgba(250,204,21,0.18), rgba(20,24,48,0.92))'
                        : 'rgba(15, 19, 36, 0.88)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 270 }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 14,
                        background: claimed ? '#15803d' : completed ? '#d97706' : '#1e2542',
                        border: '2.5px solid #111118',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        flexShrink: 0,
                      }}
                    >
                      {claimed ? '✅' : q.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#312e81',
                            color: '#a5b4fc',
                          }}
                        >
                          AKT {q.act} • LOKACJA {q.bossLocationGlobal}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#fef08a' }}>{q.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>
                        {q.description} (<strong>{q.bossName}</strong>)
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          marginTop: 6,
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ color: runeDef.color }}>💠 1× {runeDef.shardName}</span>
                        {Object.entries(q.rewardShards).map(([rk, amt]) =>
                          amt && amt > 0 ? (
                            <span key={rk} style={{ color: RARITY_META[rk as Rarity].color }}>
                              💎 {amt}× {RARITY_META[rk as Rarity].shardName}
                            </span>
                          ) : null
                        )}
                        <span style={{ color: '#4ade80' }}>⭐ +{q.rewardXp} XP</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {claimed ? (
                      <span
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          background: 'rgba(34,197,94,0.16)',
                          border: '2px solid #22c55e',
                          color: '#4ade80',
                          fontWeight: 900,
                          fontSize: 12,
                        }}
                      >
                        ✅ Odebrano
                      </span>
                    ) : completed ? (
                      <button
                        className="comic-btn comic-btn-gold"
                        onClick={() => onClaimMainQuest(q.id)}
                        style={{ padding: '10px 18px', fontSize: 13 }}
                      >
                        🎁 Odbierz Nagrodę!
                      </button>
                    ) : (
                      <span
                        style={{
                          padding: '7px 12px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.05)',
                          color: '#94a3b8',
                          fontWeight: 800,
                          fontSize: 11.5,
                        }}
                      >
                        🔒 Pokonaj Bossa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 3: MISJE POBOCZNE (100% CLEAR KAŻDEJ LOKACJI 1..60) */}
        {/* ===================================================== */}
        {tab === 'side' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              className="comic-panel-sm"
              style={{
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                background: 'rgba(56, 189, 248, 0.1)',
                borderColor: '#38bdf8',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#7dd3fc' }}>
                  🗺️ Pełne Wyczyszczenie Lokacji (100% Pokonanych Przeciwników — {(profile.fullClearedLocations || []).length} / 105)
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>
                  Standard (1–60): <strong style={{ color: '#c084fc' }}>2× Mityczny</strong> +{' '}
                  <strong style={{ color: '#fb923c' }}>1× Legendarny</strong> •{' '}
                  <span style={{ color: '#00f5d4', fontWeight: 900 }}>
                    🔥 HARDCORE (61–105): 1× Nieśmiertelny + 2× Boski!
                  </span>
                </div>
              </div>
              {readySideLocs.length > 0 && (
                <button
                  className="comic-btn comic-btn-green"
                  onClick={onClaimAllSideLocations}
                  style={{ padding: '9px 16px', fontSize: 13 }}
                >
                  🎁 Odbierz Wszystkie ({readySideLocs.length})!
                </button>
              )}
            </div>

            {/* Act Switcher (1-4 Standard + 5-7 HARDCORE) */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {([1, 2, 3, 4, 5, 6, 7] as ActNumber[]).map((a) => {
                const readyInAct = readySideLocs.filter((g) => Math.ceil(g / 15) === a).length;
                const isHC = a >= 5;
                return (
                  <button
                    key={a}
                    className={`comic-btn ${sideAct === a ? (isHC ? 'comic-btn-gold' : 'comic-btn-blue') : 'comic-btn-dark'}`}
                    onClick={() => setSideAct(a)}
                    style={{
                      flex: 1,
                      minWidth: 74,
                      padding: '7px 6px',
                      fontSize: 11.5,
                      borderColor: isHC ? '#00f5d4' : undefined,
                    }}
                  >
                    {isHC ? '🔥 ' : ''}Akt {a} {readyInAct > 0 ? `(+${readyInAct})` : ''}
                  </button>
                );
              })}
            </div>

            {/* 15 Locations Grid for Selected Act */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 8,
              }}
            >
              {actLocations.map((loc) => {
                const cleared = fullClearedSet.has(loc.globalIndex);
                const claimed = claimedSideSet.has(loc.globalIndex);
                const ready = cleared && !claimed;
                return (
                  <div
                    key={loc.globalIndex}
                    className="comic-panel-sm"
                    style={{
                      padding: '9px 11px',
                      borderColor: ready ? '#4ade80' : claimed ? '#166534' : '#263050',
                      background: ready
                        ? 'rgba(34, 197, 94, 0.16)'
                        : claimed
                          ? 'rgba(20, 83, 45, 0.22)'
                          : 'rgba(13, 17, 32, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 7,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 900, color: ready ? '#4ade80' : '#f8fafc' }}>
                        #{loc.globalIndex} {loc.name}
                      </span>
                      <span style={{ fontSize: 11 }}>{claimed ? '✅' : ready ? '🎁' : '⚔️'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {claimed
                        ? loc.act >= 5
                          ? 'Nagroda HC odebrana (1N + 2B)'
                          : 'Nagroda odebrana (2M + 1L)'
                        : ready
                          ? '100% wrogów pokonanych! Gotowe!'
                          : 'Wyczyść wszystkich wrogów (100%)'}
                    </div>
                    {ready ? (
                      <button
                        className="comic-btn comic-btn-green"
                        onClick={() => onClaimSideLocation(loc.globalIndex)}
                        style={{ padding: '5px 10px', fontSize: 11.5 }}
                      >
                        {loc.act >= 5 ? '🎁 Odbierz 1N + 2B' : '🎁 Odbierz 2M + 1L'}
                      </button>
                    ) : !claimed ? (
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: loc.act >= 5 ? '#00f5d4' : '#fbbf24' }}>
                        {loc.act >= 5 ? 'Nagroda HC: 1× Nieśm. + 2× Boski' : 'Nagroda: 2× Mit + 1× Leg'}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 4: KOŁO FORTUNY + BŁOGOSŁAWIEŃSTWO + WYPRAWA DNIA */}
        {/* ===================================================== */}
        {tab === 'wheel' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Left: Interactive Comic Wheel of Chaos */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'radial-gradient(circle at 50% 35%, rgba(251,191,36,0.14), rgba(13,16,32,0.92))',
                borderColor: wheelReady ? '#fde047' : '#334155',
              }}
            >
              <div className="comic-title" style={{ fontSize: 22, color: '#fde047', marginBottom: 2 }}>
                🎡 KOŁO FORTUNY CHAOSU
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginBottom: 12, textAlign: 'center' }}>
                1 darmowy obrót każdego dnia! Wygraj Boskie Odłamki, Runy Bossów lub Legendarny sprzęt!
              </div>

              {/* Pointer + Wheel SVG */}
              <div style={{ position: 'relative', width: 268, height: 268, marginBottom: 14 }}>
                {/* Top Pointer Triangle */}
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 5,
                    width: 0,
                    height: 0,
                    borderLeft: '14px solid transparent',
                    borderRight: '14px solid transparent',
                    borderTop: '24px solid #fde047',
                    filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.85))',
                  }}
                />
                <svg
                  viewBox="-110 -110 220 220"
                  width="268"
                  height="268"
                  style={{
                    transform: `rotate(${wheelAngle}deg)`,
                    transition: spinning ? 'transform 4.2s cubic-bezier(0.14, 0.88, 0.22, 1)' : 'none',
                    filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.55))',
                  }}
                >
                  <circle cx="0" cy="0" r="106" fill="#111118" />
                  {WHEEL_SLICES.map((sl, i) => {
                    const count = WHEEL_SLICES.length;
                    const stepDeg = 360 / count;
                    const startRad = ((i * stepDeg - 90) * Math.PI) / 180;
                    const endRad = (((i + 1) * stepDeg - 90) * Math.PI) / 180;
                    const r = 100;
                    const x1 = Math.cos(startRad) * r;
                    const y1 = Math.sin(startRad) * r;
                    const x2 = Math.cos(endRad) * r;
                    const y2 = Math.sin(endRad) * r;
                    const midDeg = i * stepDeg + stepDeg / 2;
                    return (
                      <g key={sl.id}>
                        <path
                          d={`M 0 0 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                          fill={sl.color}
                          stroke="#111118"
                          strokeWidth="2.6"
                        />
                        <g transform={`rotate(${midDeg})`}>
                          <text
                            x="0"
                            y="-72"
                            textAnchor="middle"
                            fontSize="16"
                            style={{ userSelect: 'none' }}
                          >
                            {sl.icon}
                          </text>
                          <text
                            x="0"
                            y="-54"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="900"
                            stroke="#111118"
                            strokeWidth="2"
                            paintOrder="stroke"
                            style={{ userSelect: 'none' }}
                          >
                            {sl.shortLabel}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  <circle cx="0" cy="0" r="22" fill="#fde047" stroke="#111118" strokeWidth="3.5" />
                  <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="900" fill="#111118">
                    ★
                  </text>
                </svg>
              </div>

              {wonSliceIdx !== null && (
                <div
                  className="comic-panel-sm"
                  style={{
                    padding: '7px 12px',
                    marginBottom: 10,
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderColor: '#4ade80',
                    color: '#fef08a',
                    fontSize: 12.5,
                    fontWeight: 900,
                    textAlign: 'center',
                  }}
                >
                  🎉 WYLOSOWANO: {WHEEL_SLICES[wonSliceIdx].icon} {WHEEL_SLICES[wonSliceIdx].label}
                </div>
              )}

              <button
                className={`comic-btn ${wheelReady ? 'comic-btn-gold' : 'comic-btn-dark'}`}
                disabled={!wheelReady || spinning}
                onClick={handleSpinWheel}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  fontSize: 14,
                  opacity: wheelReady && !spinning ? 1 : 0.65,
                }}
              >
                {spinning
                  ? '🌀 Koło się kręci...'
                  : wheelReady
                    ? '🎡 ZAKRĘĆ KOŁEM (DARMOWY OBRÓT!)'
                    : '✓ Wróć jutro po kolejny darmowy obrót!'}
              </button>
            </div>

            {/* Right: Daily Blessing Schedule + Daily Featured Dungeon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Daily Featured Dungeon (2x XP + Bonus Shards) */}
              <div
                className="comic-panel-sm"
                style={{
                  padding: 14,
                  borderColor: '#f97316',
                  background: 'linear-gradient(135deg, rgba(234,88,12,0.2), rgba(20,18,44,0.92))',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: '#fdba74', letterSpacing: 0.7 }}>
                  🔥 PRZEKLĘTA WYPRAWA DNIA (Wspólna dla wszystkich graczy!)
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fef08a', marginTop: 3 }}>
                  Lokacja #{featuredLoc.globalIndex} (Akt {featuredLoc.act}): {featuredLoc.name}
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4 }}>{featured.summary}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: featuredDoneToday ? '#4ade80' : '#fbbf24' }}>
                    {featuredDoneToday ? '✅ Dzisiejsza skrzynia Wyprawy Dnia odebrana!' : '🎁 Dostępna nawet bez odblokowania!'}
                  </span>
                  {onJumpToLocation && (
                    <button
                      className="comic-btn comic-btn-gold"
                      onClick={() => {
                        onJumpToLocation(featured.globalLocation);
                        onClose();
                      }}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      ⚔️ Wybierz
                    </button>
                  )}
                </div>
              </div>

              {/* Daily Blessing of the Week */}
              <div
                className="comic-panel-sm"
                style={{
                  padding: 14,
                  borderColor: blessing.color,
                  background: 'rgba(15, 20, 38, 0.92)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: blessing.color, letterSpacing: 0.7 }}>
                  ✨ AKTYWNE BŁOGOSŁAWIEŃSTWO DNIA ({blessing.dayName.toUpperCase()})
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 3 }}>
                  {blessing.icon} {blessing.name}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#4ade80', marginTop: 2, marginBottom: 10 }}>
                  {blessing.summary}
                </div>

                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>
                  KALENDARZ BŁOGOSŁAWIEŃSTW TYGODNIA:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {WEEK_ORDER.map((dow) => {
                    const b = DAILY_BLESSINGS[dow];
                    const isToday = dow === blessing.dayOfWeek;
                    return (
                      <div
                        key={dow}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 8px',
                          borderRadius: 7,
                          fontSize: 11,
                          background: isToday ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.03)',
                          border: isToday ? `1.5px solid ${b.color}` : '1px solid transparent',
                        }}
                      >
                        <span style={{ fontWeight: 900, color: isToday ? b.color : '#cbd5e1', whiteSpace: 'nowrap' }}>
                          {b.icon} {b.dayName.slice(0, 3)}: {b.name}
                        </span>
                        <span style={{ color: isToday ? '#fef08a' : '#94a3b8', textAlign: 'right', fontSize: 10.5 }}>
                          {b.summary}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CLASSES } from '../../shared/classes';
import {
  canUpgradeTreeSkill,
  ensureSkillTreeForClass,
  getClassSkillTree,
  getSkillRankEffectiveStats,
  MAX_TREE_SKILL_RANK,
  SKILL_CHAOS_MODIFIERS,
  SKILL_CHAOS_OUTCOMES,
  SkillChaosCorruptionResult,
  TreeSkillDef,
} from '../../shared/skillTree';
import type { PlayerProfile } from '../../shared/types';
import { soundEngine } from '../audio/soundEngine';

interface SkillsModalProps {
  profile: PlayerProfile;
  canChangeLoadout: boolean;
  onUpgradeTreeSkill: (skillId: string) => void;
  onEquipTreeSkill: (slotIndex: 0 | 1 | 2, skillId: string) => void;
  onCorruptTreeSkill: (skillId: string) => SkillChaosCorruptionResult | null;
  onClose: () => void;
}

const SLOT_KEYS: [string, string, string] = ['1 / Q', '2 / E', '3'];

export const SkillsModal: React.FC<SkillsModalProps> = ({
  profile,
  canChangeLoadout,
  onUpgradeTreeSkill,
  onEquipTreeSkill,
  onCorruptTreeSkill,
  onClose,
}) => {
  const cls = CLASSES[profile.classId];
  const classTree = getClassSkillTree(profile.classId);
  const ensured = ensureSkillTreeForClass(
    profile.classId,
    profile.skillTree,
    profile.equippedSkills
  );
  const treeMap = ensured.skillTree;
  const equipped = ensured.equippedSkills;

  const [selectedSkillId, setSelectedSkillId] = useState<string>(equipped[0] || classTree.skills[0].id);
  const [draggingSkillId, setDraggingSkillId] = useState<string | null>(null);
  const [corrupting, setCorrupting] = useState(false);
  const [corruptPct, setCorruptPct] = useState(0);
  const [corruptResult, setCorruptResult] = useState<{
    key: number;
    result: SkillChaosCorruptionResult;
  } | null>(null);

  const selectedSkill: TreeSkillDef =
    classTree.skills.find((s) => s.id === selectedSkillId) || classTree.skills[0];
  const selectedNode = treeMap[selectedSkill.id] || { rank: 0, corrupted: false, chaosModId: null };
  const ownedChaosStones = profile.chaosStones || 0;
  const canUpSelected = canUpgradeTreeSkill(
    { ...profile, skillTree: treeMap },
    selectedSkill.id
  );
  const effStats = getSkillRankEffectiveStats(selectedSkill, Math.max(1, selectedNode.rank));
  const nextStats =
    selectedNode.rank > 0 && selectedNode.rank < MAX_TREE_SKILL_RANK
      ? getSkillRankEffectiveStats(selectedSkill, selectedNode.rank + 1)
      : null;

  const canCorruptSelected =
    !corrupting &&
    selectedNode.rank >= 1 &&
    !selectedNode.corrupted &&
    ownedChaosStones >= 1;

  const handleTriggerCorruption = () => {
    if (!canCorruptSelected) return;
    setCorrupting(true);
    setCorruptResult(null);
    setCorruptPct(0);
    soundEngine.playChaosVortexTension();

    const totalMs = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / totalMs);
      setCorruptPct(Math.round(p * 100));
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        const res = onCorruptTreeSkill(selectedSkill.id);
        setCorrupting(false);
        if (res) {
          if (res.outcome === 'overcap_plus2') soundEngine.playChaosBreakthrough();
          else if (res.outcome === 'new_modifier') soundEngine.playChaosBonusAdd();
          else if (res.outcome === 'reset_zero') soundEngine.playChaosDestroy();
          else soundEngine.playChaosFizzle();
          setCorruptResult({ key: Date.now() + Math.random(), result: res });
        }
      }
    };
    requestAnimationFrame(step);
  };

  // Group 10 skills by 3 vertical specialization branches
  const branchColumns: TreeSkillDef[][] = [0, 1, 2].map((bIdx) =>
    classTree.skills
      .filter((s) => s.branchIndex === bIdx)
      .sort((a, b) => a.tier - b.tier)
  );

  return (
    <div className="modal-backdrop" onClick={() => !corrupting && onClose()}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1140px, 96vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 18,
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: '#c084fc' }}>
              ⭐ DRZEWKO TALENTÓW I MISTRZOSTW — {cls.name.toUpperCase()}
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 12, fontWeight: 800 }}>
              <span
                style={{
                  background: 'rgba(253, 224, 71, 0.16)',
                  border: '1.5px solid #fde047',
                  color: '#fde047',
                  padding: '2px 10px',
                  borderRadius: 99,
                }}
              >
                ✨ Punkty Umiejętności: {profile.skillPoints} (Poz. {profile.level})
              </span>
              <span
                style={{
                  background: 'rgba(225, 29, 72, 0.22)',
                  border: '1.5px solid #e11d48',
                  color: '#fbcfe8',
                  padding: '2px 10px',
                  borderRadius: 99,
                }}
              >
                🌀 Kamienie Chaosu: {ownedChaosStones}
              </span>
              <span
                style={{
                  background: canChangeLoadout ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.2)',
                  border: `1.5px solid ${canChangeLoadout ? '#4ade80' : '#f87171'}`,
                  color: canChangeLoadout ? '#86efac' : '#fca5a5',
                  padding: '2px 10px',
                  borderRadius: 99,
                }}
              >
                {canChangeLoadout
                  ? '✅ Zmiana Aktywnego Zestawu (3/3) odblokowana'
                  : '⚔️ W walce — wyjdź z walki lub wróć do Obozu, by zmienić Zestaw 3/3'}
              </span>
            </div>
          </div>
          <button
            className="comic-btn comic-btn-red"
            disabled={corrupting}
            onClick={onClose}
            style={{ padding: '6px 14px' }}
          >
            ✕ Zamknij [K]
          </button>
        </div>

        {/* Main 2-Column Layout: Left = 3-Branch Skill Tree + Loadout Bar | Right = Inspector & Chaos Stone Corruption */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 345px', gap: 14, alignItems: 'start' }}>
          {/* LEFT: 3 Specialization Branches + Bottom Active Loadout (3/3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {branchColumns.map((colSkills, bIdx) => (
                <div
                  key={bIdx}
                  className="comic-panel-sm"
                  style={{
                    padding: '10px 8px',
                    background: 'rgba(16, 19, 36, 0.9)',
                    borderColor: bIdx === 1 ? '#a855f7' : '#2e3559',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    className="comic-title"
                    style={{
                      fontSize: 15,
                      color: bIdx === 0 ? '#fde047' : bIdx === 1 ? '#e879f9' : '#38bdf8',
                      marginBottom: 8,
                      textAlign: 'center',
                    }}
                  >
                    {classTree.branches[bIdx]}
                  </div>

                  {colSkills.map((sk, idx) => {
                    const node = treeMap[sk.id] || { rank: 0, corrupted: false, chaosModId: null };
                    const isSel = selectedSkill.id === sk.id;
                    const eqIdx = equipped.indexOf(sk.id);
                    const upCheck = canUpgradeTreeSkill({ ...profile, skillTree: treeMap }, sk.id);
                    const parentUnlocked = sk.parentIds.every((pid) => (treeMap[pid]?.rank || 0) >= 1);
                    const levelMet = profile.level >= sk.reqLevel;
                    const isUnlocked = node.rank >= 1;
                    const isOvercap = node.rank > MAX_TREE_SKILL_RANK;
                    const modDef = node.chaosModId ? SKILL_CHAOS_MODIFIERS[node.chaosModId] : null;

                    return (
                      <React.Fragment key={sk.id}>
                        {/* Vertical SVG Dependency Arrow from Parent */}
                        {idx > 0 && (
                          <svg width="28" height="22" viewBox="0 0 28 22" style={{ display: 'block', margin: '1px 0' }}>
                            <line
                              x1="14"
                              y1="0"
                              x2="14"
                              y2="14"
                              stroke={parentUnlocked ? '#fde047' : '#334155'}
                              strokeWidth={parentUnlocked ? 3 : 2}
                            />
                            <polygon
                              points="8,13 20,13 14,21"
                              fill={parentUnlocked ? '#fde047' : '#334155'}
                            />
                          </svg>
                        )}

                        <div
                          draggable={isUnlocked && canChangeLoadout}
                          onDragStart={() => isUnlocked && setDraggingSkillId(sk.id)}
                          onDragEnd={() => setDraggingSkillId(null)}
                          onClick={() => setSelectedSkillId(sk.id)}
                          className={node.corrupted ? 'chaos-overcap-frame' : ''}
                          style={{
                            width: '100%',
                            padding: '8px 9px',
                            borderRadius: 11,
                            cursor: 'pointer',
                            position: 'relative',
                            background: isSel
                              ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.52), rgba(30, 41, 72, 0.94))'
                              : isUnlocked
                                ? 'rgba(25, 31, 56, 0.92)'
                                : 'rgba(14, 17, 30, 0.72)',
                            border: `2px solid ${
                              isSel
                                ? '#fde047'
                                : node.corrupted
                                  ? '#e11d48'
                                  : isUnlocked
                                    ? sk.color
                                    : '#2a304d'
                            }`,
                            opacity: isUnlocked || (parentUnlocked && levelMet) ? 1 : 0.58,
                            transition: 'transform 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              <span style={{ fontSize: 22, lineHeight: 1 }}>{sk.icon}</span>
                              <div style={{ overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 900,
                                    color: sk.isUltimate ? '#fde047' : '#fff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {sk.isUltimate ? '👑 ' : ''}
                                  {sk.name}
                                </div>
                                <div style={{ fontSize: 9.5, color: levelMet ? '#94a3b8' : '#f87171', fontWeight: 700 }}>
                                  {eqIdx >= 0 ? (
                                    <span style={{ color: '#4ade80' }}>★ SLOT {eqIdx + 1}</span>
                                  ) : (
                                    `Wym. Poz. ${sk.reqLevel}`
                                  )}
                                  {node.corrupted && (
                                    <span style={{ color: '#f472b6', marginLeft: 5 }}>• 🌀 SKAŻONA</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 7,
                                  fontSize: 10.5,
                                  fontWeight: 900,
                                  background: isOvercap
                                    ? 'linear-gradient(90deg, #e11d48, #9333ea)'
                                    : isUnlocked
                                      ? sk.color
                                      : '#1e293b',
                                  color: '#fff',
                                }}
                              >
                                {node.rank}/{MAX_TREE_SKILL_RANK}
                              </span>
                              <button
                                className="comic-btn comic-btn-gold"
                                disabled={!upCheck.ok || corrupting}
                                title={upCheck.ok ? 'Rozwiń o +1 poziom (1 pkt)' : upCheck.reason}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!upCheck.ok) return;
                                  soundEngine.playPuzzleTick();
                                  onUpgradeTreeSkill(sk.id);
                                  setSelectedSkillId(sk.id);
                                }}
                                style={{
                                  width: 22,
                                  height: 22,
                                  padding: 0,
                                  fontSize: 14,
                                  lineHeight: 1,
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {modDef && (
                            <div
                              style={{
                                marginTop: 4,
                                padding: '2px 6px',
                                borderRadius: 6,
                                fontSize: 9.5,
                                fontWeight: 900,
                                background: 'rgba(147, 51, 234, 0.28)',
                                border: `1px solid ${modDef.color}`,
                                color: modDef.color,
                              }}
                            >
                              {modDef.icon} {modDef.shortTag}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom: ACTIVE LOADOUT BAR (3/3) with Drag & Drop + Click Support */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 12,
                borderColor: '#fde047',
                background: 'linear-gradient(135deg, rgba(30, 36, 66, 0.94), rgba(16, 19, 36, 0.96))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: '#fde047' }}>
                  ⚔️ AKTYWNY ZESTAW WALKI (3/3) — Przeciągnij odblokowaną umiejętność lub kliknij po prawej
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {([0, 1, 2] as const).map((slotIdx) => {
                  const sid = equipped[slotIdx];
                  const sk = classTree.skills.find((s) => s.id === sid);
                  const node = sk ? treeMap[sk.id] : null;
                  const modDef = node?.chaosModId ? SKILL_CHAOS_MODIFIERS[node.chaosModId] : null;
                  return (
                    <div
                      key={slotIdx}
                      onDragOver={(e) => {
                        if (canChangeLoadout && draggingSkillId) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (canChangeLoadout && draggingSkillId) {
                          soundEngine.playPuzzleTick();
                          onEquipTreeSkill(slotIdx, draggingSkillId);
                          setDraggingSkillId(null);
                        }
                      }}
                      onClick={() => sk && setSelectedSkillId(sk.id)}
                      className={node?.corrupted ? 'chaos-overcap-frame' : ''}
                      style={{
                        padding: '9px 10px',
                        borderRadius: 10,
                        background: '#131627',
                        border: `2px solid ${
                          draggingSkillId && canChangeLoadout
                            ? '#fde047'
                            : node?.corrupted
                              ? '#e11d48'
                              : sk?.color || '#334155'
                        }`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 9,
                          background: sk?.color || '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        {sk?.icon || '❓'}
                      </div>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>
                          SLOT {slotIdx + 1} • [{SLOT_KEYS[slotIdx]}]
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 900,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {sk?.name || 'Pusty'}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#fde047' }}>
                          Poziom {node?.rank || 0}/{MAX_TREE_SKILL_RANK}
                          {modDef ? ` • ${modDef.icon}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Selected Skill Inspector + Equip Controls + Kamień Chaosu Corruption */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Skill Details Card */}
            <div
              className={`comic-panel-sm ${selectedNode.corrupted ? 'chaos-overcap-frame' : ''}`}
              style={{
                padding: 14,
                borderColor: selectedNode.corrupted ? '#e11d48' : selectedSkill.color,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 32 }}>{selectedSkill.icon}</span>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      background: selectedNode.rank > MAX_TREE_SKILL_RANK ? '#e11d48' : selectedSkill.color,
                      color: '#fff',
                      padding: '3px 9px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Poziom {selectedNode.rank} / {MAX_TREE_SKILL_RANK}
                  </span>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                    Gałąź: <strong>{classTree.branches[selectedSkill.branchIndex]}</strong>
                  </div>
                </div>
              </div>

              <div className="comic-title" style={{ fontSize: 22, color: '#fff', marginTop: 6 }}>
                {selectedSkill.isUltimate ? '👑 ' : ''}
                {selectedSkill.name}
              </div>
              <p style={{ fontSize: 12, color: '#cbd5e1', margin: '6px 0 8px', lineHeight: 1.45 }}>
                {selectedSkill.description}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#131627',
                  padding: 8,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ color: '#38bdf8' }}>💧 Mana: {selectedSkill.manaCost}</div>
                <div style={{ color: '#fde047' }}>⏱️ CD: {effStats.effectiveCooldown}s</div>
                <div style={{ color: '#4ade80' }}>
                  ⚡ Moc: +{selectedNode.rank > 0 ? effStats.powerBonusPct : 0}%
                </div>
                <div style={{ color: '#c084fc' }}>
                  📐 Zasięg/AOE: {selectedSkill.range || effStats.effectiveRadius}m
                </div>
              </div>

              {nextStats && (
                <div style={{ fontSize: 11, color: '#86efac', fontWeight: 800, marginBottom: 8 }}>
                  Następny poziom (+{selectedNode.rank + 1}): Moc +{nextStats.powerBonusPct}% • CD {nextStats.effectiveCooldown}s
                </div>
              )}

              {selectedNode.chaosModId && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: '7px 9px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, rgba(147,51,234,0.34), rgba(225,29,72,0.28))',
                    border: `1.5px solid ${SKILL_CHAOS_MODIFIERS[selectedNode.chaosModId].color}`,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 900, color: '#fde047' }}>
                    {SKILL_CHAOS_MODIFIERS[selectedNode.chaosModId].icon} MODYFIKATOR CHAOSU:{' '}
                    {SKILL_CHAOS_MODIFIERS[selectedNode.chaosModId].name}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#f8fafc', marginTop: 2 }}>
                    {SKILL_CHAOS_MODIFIERS[selectedNode.chaosModId].description}
                  </div>
                </div>
              )}

              {/* Upgrade Skill Point Button */}
              <button
                className="comic-btn comic-btn-gold"
                disabled={!canUpSelected.ok || corrupting}
                onClick={() => {
                  if (!canUpSelected.ok) return;
                  soundEngine.playPuzzleTick();
                  onUpgradeTreeSkill(selectedSkill.id);
                }}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, marginBottom: 8 }}
              >
                {canUpSelected.ok
                  ? `⬆️ Rozwiń do Poziomu ${selectedNode.rank + 1} (1 Pkt)`
                  : canUpSelected.reason || 'Zablokowane'}
              </button>

              {/* Equip into Active Slot 1 / 2 / 3 */}
              <div style={{ fontSize: 10.5, fontWeight: 900, color: '#94a3b8', marginBottom: 4 }}>
                PRZYPISZ DO PASKA WALKI (3 AKTYWNE):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {([0, 1, 2] as const).map((sIdx) => {
                  const isInSlot = equipped[sIdx] === selectedSkill.id;
                  return (
                    <button
                      key={sIdx}
                      className={`comic-btn ${isInSlot ? 'comic-btn-green' : 'comic-btn-blue'}`}
                      disabled={selectedNode.rank < 1 || !canChangeLoadout || isInSlot}
                      onClick={() => {
                        soundEngine.playPuzzleTick();
                        onEquipTreeSkill(sIdx, selectedSkill.id);
                      }}
                      style={{ padding: '6px 4px', fontSize: 11 }}
                    >
                      {isInSlot ? `✓ Slot ${sIdx + 1}` : `Slot ${sIdx + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KAMIEŃ CHAOSU SKILL CORRUPTION PANEL */}
            <div
              className="comic-panel-sm"
              style={{
                padding: 13,
                borderColor: '#e11d48',
                background: 'linear-gradient(165deg, rgba(52, 12, 42, 0.94), rgba(14, 15, 30, 0.97))',
              }}
            >
              <div className="comic-title" style={{ fontSize: 18, color: '#f472b6', marginBottom: 6 }}>
                🌀 SKAŻENIE KAMIENIEM CHAOSU
              </div>

              {corrupting && (
                <div style={{ marginBottom: 8 }}>
                  <div
                    className="chaos-vortex-spin"
                    style={{
                      width: 48,
                      height: 48,
                      margin: '4px auto 6px',
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #e11d48, #9333ea, #fde047, #e11d48)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    🌀
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#fde047', textAlign: 'center', marginBottom: 4 }}>
                    SKAŻANIE UMIEJĘTNOŚCI... {corruptPct}%
                  </div>
                  <div style={{ height: 8, background: '#0f1221', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${corruptPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #9333ea, #e11d48, #fde047)',
                      }}
                    />
                  </div>
                </div>
              )}

              {corruptResult && corruptResult.result.skillId === selectedSkill.id && !corrupting && (
                <div
                  key={corruptResult.key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    marginBottom: 8,
                    fontSize: 11.5,
                    fontWeight: 900,
                    textAlign: 'center',
                    background:
                      corruptResult.result.outcome === 'overcap_plus2' ||
                      corruptResult.result.outcome === 'new_modifier'
                        ? 'rgba(147, 51, 234, 0.42)'
                        : corruptResult.result.outcome === 'reset_zero'
                          ? 'rgba(185, 28, 28, 0.55)'
                          : 'rgba(51, 65, 85, 0.65)',
                    border: `1.5px solid ${
                      corruptResult.result.outcome === 'overcap_plus2'
                        ? '#fde047'
                        : corruptResult.result.outcome === 'new_modifier'
                          ? '#c084fc'
                          : corruptResult.result.outcome === 'reset_zero'
                            ? '#ef4444'
                            : '#94a3b8'
                    }`,
                    color: '#fff',
                  }}
                >
                  {corruptResult.result.message}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {SKILL_CHAOS_OUTCOMES.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr',
                      gap: 6,
                      fontSize: 10.5,
                      padding: '3px 6px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.035)',
                      borderLeft: `3px solid ${o.color}`,
                    }}
                  >
                    <strong style={{ color: o.color }}>{o.chancePct}%</strong>
                    <div>
                      <div style={{ fontWeight: 900, color: '#f8fafc' }}>{o.label}</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{o.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedNode.corrupted ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '9px 10px',
                    borderRadius: 9,
                    background: 'rgba(136, 19, 55, 0.45)',
                    border: '1.5px solid #e11d48',
                    fontSize: 11.5,
                    fontWeight: 900,
                    color: '#fbcfe8',
                  }}
                >
                  🔒 SKAŻONA CHAOSEM — Kamienia Chaosu można użyć tylko 1 raz na umiejętności!
                </div>
              ) : (
                <button
                  className="comic-btn comic-btn-purple"
                  disabled={!canCorruptSelected}
                  onClick={handleTriggerCorruption}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 12.5,
                    background: canCorruptSelected
                      ? 'linear-gradient(135deg, #e11d48 0%, #9333ea 100%)'
                      : undefined,
                    borderColor: canCorruptSelected ? '#fde047' : undefined,
                  }}
                >
                  {corrupting
                    ? '🌀 SKAŻANIE W TOKU...'
                    : selectedNode.rank < 1
                      ? 'Wymaga min. Poziomu 1 tej umiejętności'
                      : ownedChaosStones < 1
                        ? '❌ Brak Kamieni Chaosu (0×)'
                        : `🌀 Użyj Kamienia Chaosu na umiejętności (${ownedChaosStones}×)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

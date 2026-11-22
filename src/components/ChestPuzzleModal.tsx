import React, { useMemo, useState } from 'react';
import { createSeededRng } from '../../shared/world';
import type { LockedChestState } from '../../shared/types';
import { soundEngine } from '../audio/soundEngine';

interface ChestPuzzleModalProps {
  chest: LockedChestState;
  onSolved: (chestId: string) => void;
  onClose: () => void;
}

const RUNE_ICONS = ['🔥', '❄️', '⚡', '🌿'];
const RUNE_NAMES = ['Ogień', 'Mróz', 'Błyskawica', 'Natura'];

export const ChestPuzzleModal: React.FC<ChestPuzzleModalProps> = ({
  chest,
  onSolved,
  onClose,
}) => {
  const puzzleData = useMemo(() => {
    const rng = createSeededRng(chest.puzzleSeed + 77);
    const seq = [0, 1, 2, 3];
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    const initAngles = [1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3)];
    const targetSyms = [Math.floor(rng() * 4), Math.floor(rng() * 4), Math.floor(rng() * 4)];
    return { seq, initAngles, targetSyms };
  }, [chest.puzzleSeed]);

  // Variant 1: Sequence press
  const [seqProgress, setSeqProgress] = useState<number[]>([]);
  // Variant 2: Rotate 4 conduits to point UP (0 deg)
  const [angles, setAngles] = useState<number[]>(puzzleData.initAngles);
  // Variant 3: Match 3 elemental locks based on logic clues
  const [chosenSyms, setChosenSyms] = useState<number[]>([0, 0, 0]);
  const [errorShake, setErrorShake] = useState(false);

  const finishSuccess = () => {
    soundEngine.playPuzzleSolve();
    onSolved(chest.id);
  };

  const handleSeqClick = (idx: number) => {
    const expected = puzzleData.seq[seqProgress.length];
    if (idx === expected) {
      soundEngine.playPuzzleTick();
      const next = [...seqProgress, idx];
      setSeqProgress(next);
      if (next.length === 4) {
        setTimeout(finishSuccess, 260);
      }
    } else {
      setErrorShake(true);
      setSeqProgress([]);
      setTimeout(() => setErrorShake(false), 380);
    }
  };

  const handleRotate = (tileIdx: number) => {
    soundEngine.playPuzzleTick();
    const next = angles.map((a, i) => (i === tileIdx ? (a + 1) % 4 : a));
    setAngles(next);
    if (next.every((a) => a === 0)) {
      setTimeout(finishSuccess, 260);
    }
  };

  const handleSymCycle = (slotIdx: number) => {
    soundEngine.playPuzzleTick();
    const next = chosenSyms.map((v, i) => (i === slotIdx ? (v + 1) % 4 : v));
    setChosenSyms(next);
    if (next.every((v, i) => v === puzzleData.targetSyms[i])) {
      setTimeout(finishSuccess, 260);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 94vw)',
          padding: 20,
          borderColor: chest.isSecret ? '#fde047' : '#38bdf8',
          transform: errorShake ? 'translateX(6px)' : undefined,
          transition: 'transform 0.08s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 className="comic-title" style={{ margin: 0, fontSize: 28, color: chest.isSecret ? '#fde047' : '#38bdf8' }}>
            {chest.isSecret ? '✨ ZŁOTA SKRZYNIA SEKRETU' : '🔐 ZAMKNIĘTA SKRZYNIA'}
          </h3>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '4px 10px', fontSize: 12 }}>
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 14 }}>
          Rozwiąż krótką zagadkę logiczną, aby otworzyć skrzynię i zgarnąć dodatkowe rzuty na ekwipunek (do klasy <strong>Boski</strong>)!
        </div>

        {chest.puzzleVariant === 'sequence' && (
          <div>
            <div
              className="comic-panel-sm"
              style={{ padding: 10, textAlign: 'center', marginBottom: 14, background: '#121526' }}
            >
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800 }}>
                WYGRAWEROWANA KOLEJNOŚĆ PIECZĘCI:
              </div>
              <div style={{ fontSize: 24, marginTop: 4, letterSpacing: 6 }}>
                {puzzleData.seq.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      opacity: idx < seqProgress.length ? 0.35 : 1,
                      margin: '0 4px',
                    }}
                  >
                    {RUNE_ICONS[s]}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => {
                const done = seqProgress.includes(i);
                return (
                  <button
                    key={i}
                    disabled={done}
                    onClick={() => handleSeqClick(i)}
                    className="comic-btn"
                    style={{
                      height: 76,
                      fontSize: 30,
                      flexDirection: 'column',
                      background: done ? '#166534' : '#262b47',
                      color: '#fff',
                    }}
                  >
                    <span>{RUNE_ICONS[i]}</span>
                    <span style={{ fontSize: 10 }}>{RUNE_NAMES[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {chest.puzzleVariant === 'rotate' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fde047', textAlign: 'center', marginBottom: 12 }}>
              Obróć wszystkie 4 runiczne kryształy, aby wskazywały w GÓRĘ (⬆️)!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {angles.map((ang, idx) => {
                const ok = ang === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => handleRotate(idx)}
                    className="comic-btn"
                    style={{
                      height: 82,
                      background: ok ? '#15803d' : '#262b47',
                      color: '#fff',
                      fontSize: 32,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform: `rotate(${ang * 90}deg)`,
                        transition: 'transform 0.15s',
                      }}
                    >
                      ⬆️
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {chest.puzzleVariant === 'symbols' && (
          <div>
            <div
              className="comic-panel-sm"
              style={{ padding: 10, marginBottom: 12, background: '#121526', fontSize: 12 }}
            >
              <div style={{ fontWeight: 900, color: '#fde047', marginBottom: 4 }}>WSKAZÓWKA ZAMKA:</div>
              <div>
                • Pieczęć 1: <strong>{RUNE_NAMES[puzzleData.targetSyms[0]]}</strong> ({RUNE_ICONS[puzzleData.targetSyms[0]]})
              </div>
              <div>
                • Pieczęć 2: <strong>{RUNE_NAMES[puzzleData.targetSyms[1]]}</strong> ({RUNE_ICONS[puzzleData.targetSyms[1]]})
              </div>
              <div>
                • Pieczęć 3: <strong>{RUNE_NAMES[puzzleData.targetSyms[2]]}</strong> ({RUNE_ICONS[puzzleData.targetSyms[2]]})
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {chosenSyms.map((val, idx) => {
                const ok = val === puzzleData.targetSyms[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleSymCycle(idx)}
                    className="comic-btn"
                    style={{
                      height: 84,
                      flexDirection: 'column',
                      background: ok ? '#15803d' : '#262b47',
                      color: '#fff',
                      fontSize: 28,
                    }}
                  >
                    <span>{RUNE_ICONS[val]}</span>
                    <span style={{ fontSize: 10 }}>Pieczęć #{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import {
  BOON_RARITY_META,
  BoonRarity,
  DUO_BOONS,
  ELEMENTAL_BOONS,
  PATRON_META,
  SKILL_EVOLUTIONS,
} from '../../shared/hades';

export interface HadesElementalOffer {
  mode: 'elemental';
  title: string;
  choices: Array<{ kind: 'elemental' | 'duo'; id: string; rarity?: BoonRarity }>;
}

export interface HadesEvolutionOffer {
  mode: 'evolution';
  title: string;
  choices: string[];
}

export type HadesOfferState = HadesElementalOffer | HadesEvolutionOffer;

interface HadesOfferOverlayProps {
  offer: HadesOfferState;
  onPickElemental: (kind: 'elemental' | 'duo', id: string) => void;
  onPickEvolution: (id: string) => void;
}

export const HadesOfferOverlay: React.FC<HadesOfferOverlayProps> = ({
  offer,
  onPickElemental,
  onPickEvolution,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 162,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 86,
        width: 'min(820px, 95vw)',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="comic-panel"
        style={{
          padding: '15px 18px',
          borderColor: offer.mode === 'evolution' ? '#f97316' : '#fde047',
          background: 'linear-gradient(180deg, rgba(26, 16, 52, 0.97), rgba(11, 13, 26, 0.98))',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 11 }}>
          <div className="comic-title" style={{ fontSize: 24, color: '#fde047' }}>
            {offer.title}
          </div>
          <div style={{ fontSize: 11.5, color: '#cbd5e1', fontWeight: 700 }}>
            Wybierz 1 z 3 kart (kliknij lub naciśnij [Z] / [X] / [C])
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${offer.choices.length}, 1fr)`, gap: 10 }}>
          {offer.mode === 'elemental'
            ? offer.choices.map((ch, idx) => {
                const hotkey = ['Z', 'X', 'C'][idx] || `${idx + 1}`;
                if (ch.kind === 'duo') {
                  const duo = DUO_BOONS[ch.id];
                  if (!duo) return null;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => onPickElemental('duo', ch.id)}
                      className="comic-panel-sm boski-shimmer"
                      style={{
                        cursor: 'pointer',
                        padding: 13,
                        textAlign: 'left',
                        borderColor: '#fde047',
                        background: 'linear-gradient(155deg, rgba(168, 85, 247, 0.35), rgba(234, 179, 8, 0.22))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 24 }}>{duo.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 6, background: '#fde047', color: '#111' }}>
                          FUZJA [{hotkey}]
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#fde047' }}>{duo.name}</div>
                      <div style={{ fontSize: 11, color: '#f8fafc', lineHeight: 1.36 }}>{duo.description}</div>
                    </button>
                  );
                }

                const def = ELEMENTAL_BOONS[ch.id];
                if (!def) return null;
                const rar = ch.rarity || 'zwykly';
                const rarMeta = BOON_RARITY_META[rar];
                const patron = PATRON_META[def.patron];
                return (
                  <button
                    key={ch.id}
                    onClick={() => onPickElemental('elemental', ch.id)}
                    className="comic-panel-sm"
                    style={{
                      cursor: 'pointer',
                      padding: 13,
                      textAlign: 'left',
                      borderColor: rarMeta.color,
                      background: `linear-gradient(155deg, ${def.color}22, rgba(14, 16, 32, 0.96))`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{def.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 6, background: rarMeta.color, color: '#111' }}>
                        {rarMeta.label} [{hotkey}]
                      </span>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: patron.color }}>
                      {patron.icon} {patron.title}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: def.color }}>{def.name}</div>
                    <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.36 }}>{def.description(rar)}</div>
                  </button>
                );
              })
            : offer.choices.map((evoId, idx) => {
                const evo = SKILL_EVOLUTIONS[evoId];
                if (!evo) return null;
                const hotkey = ['Z', 'X', 'C'][idx] || `${idx + 1}`;
                return (
                  <button
                    key={evoId}
                    onClick={() => onPickEvolution(evoId)}
                    className="comic-panel-sm"
                    style={{
                      cursor: 'pointer',
                      padding: 13,
                      textAlign: 'left',
                      borderColor: evo.color,
                      background: `linear-gradient(155deg, ${evo.color}26, rgba(14, 16, 32, 0.96))`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 26 }}>{evo.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 6, background: evo.color, color: '#111' }}>
                        PRZEBUDZENIE [{hotkey}]
                      </span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 900, color: evo.color }}>{evo.name}</div>
                    <div style={{ fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.36 }}>{evo.description}</div>
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
};

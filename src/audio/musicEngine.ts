import type { ActNumber } from '../../shared/types';

export interface MusicTrackInfo {
  id: string;
  act: ActNumber | 0; // 0 = Main Menu
  indexInAct: number; // 1..3
  title: string;
  bpm: number;
  leadStyle: 'horn' | 'flute' | 'oud' | 'harp' | 'brass' | 'celesta';
  arpStyle: 'lute' | 'harp' | 'oud' | 'synth';
  drumStyle: 'war' | 'desert' | 'forest' | 'epic';
  // 4 chords (1 bar = 16 sixteenth steps each -> 64-step main phrase, 128-step A+B cycle)
  chordsA: number[][];
  chordsB: number[][];
  // 32 eighth-note melody steps (null = rest, number = MIDI note) for section A and section B
  melodyA: Array<number | null>;
  melodyB: Array<number | null>;
  // 16 sixteenth-note bass pattern offsets (relative to chord root MIDI, null = rest)
  bassPattern: Array<number | null>;
  // 16 sixteenth-note arpeggio chord-tone indices (0..3, null = rest)
  arpPattern: Array<number | null>;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// =========================================================================
// 12 BESPOKE DYNAMIC FANTASY TRACKS (3 PER ACT) + 1 HEROIC MENU OVERTURE
// Carefully composed in harmonic modal scales with memorable A & B themes!
// =========================================================================

export const MENU_TRACK: MusicTrackInfo = {
  id: 'menu_overture',
  act: 0,
  indexInAct: 1,
  title: 'Kroniki Chaosu — Uwertura',
  bpm: 112,
  leadStyle: 'horn',
  arpStyle: 'harp',
  drumStyle: 'war',
  // Dm - Bb - C - Am | Dm - F - Gm - A
  chordsA: [
    [50, 53, 57, 62],
    [46, 50, 53, 58],
    [48, 52, 55, 60],
    [45, 48, 52, 57],
  ],
  chordsB: [
    [50, 53, 57, 62],
    [53, 57, 60, 65],
    [55, 58, 62, 67],
    [57, 61, 64, 69],
  ],
  melodyA: [
    62, null, 65, 69, 67, null, 65, 62,
    65, null, 69, 70, 69, null, 65, null,
    67, null, 72, 70, 69, 67, 65, 64,
    69, null, 67, 64, 69, null, null, null,
  ],
  melodyB: [
    74, null, 72, 70, 69, null, 65, 69,
    72, null, 74, 77, 76, null, 72, null,
    70, null, 74, 72, 70, 69, 67, 65,
    69, null, 73, 76, 74, null, null, null,
  ],
  bassPattern: [0, null, null, null, 0, null, 7, null, 0, null, null, null, 7, null, 5, null],
  arpPattern: [0, 1, 2, 3, 2, 1, 0, 2, 0, 1, 2, 3, 3, 2, 1, 0],
};

export const ACT_TRACKS: Record<ActNumber, MusicTrackInfo[]> = {
  // ======================================================
  // AKT 1: PODZIEMIA I KATAKUMBY (Medieval / Celtic Action)
  // ======================================================
  1: [
    {
      id: 'act1_marsz',
      act: 1,
      indexInAct: 1,
      title: 'Marsz Katakumb',
      bpm: 132,
      leadStyle: 'horn',
      arpStyle: 'lute',
      drumStyle: 'war',
      // D Dorian heroic: Dm - C - Bb - A | Dm - F - G - A
      chordsA: [
        [50, 53, 57, 62],
        [48, 52, 55, 60],
        [46, 50, 53, 58],
        [45, 49, 52, 57],
      ],
      chordsB: [
        [50, 53, 57, 62],
        [53, 57, 60, 65],
        [55, 59, 62, 67],
        [57, 61, 64, 69],
      ],
      melodyA: [
        62, 62, 65, 69, 74, null, 72, 69,
        72, null, 70, 67, 69, null, 67, 64,
        65, 67, 69, 70, 69, 67, 65, 62,
        64, null, 69, 67, 69, null, null, null,
      ],
      melodyB: [
        74, null, 74, 76, 77, 76, 74, 72,
        77, null, 76, 72, 74, null, 72, 69,
        71, 74, 76, 79, 76, 74, 71, 69,
        73, null, 76, 73, 74, null, null, null,
      ],
      bassPattern: [0, null, 0, null, 7, null, 0, 12, 0, null, 0, null, 7, 5, 3, null],
      arpPattern: [0, 2, 1, 3, 0, 2, 3, 1, 0, 2, 1, 3, 2, 3, 1, 2],
    },
    {
      id: 'act1_pochodnie',
      act: 1,
      indexInAct: 2,
      title: 'Płomień Pochodni',
      bpm: 142,
      leadStyle: 'flute',
      arpStyle: 'lute',
      drumStyle: 'war',
      // E minor lively tavern-battle: Em - D - C - B7 | Em - G - Am - B7
      chordsA: [
        [52, 55, 59, 64],
        [50, 54, 57, 62],
        [48, 52, 55, 60],
        [47, 51, 54, 59],
      ],
      chordsB: [
        [52, 55, 59, 64],
        [55, 59, 62, 67],
        [57, 60, 64, 69],
        [59, 63, 66, 71],
      ],
      melodyA: [
        64, 67, 71, 72, 71, 67, 69, 67,
        66, 69, 74, 72, 71, 69, 66, null,
        67, 69, 72, 76, 74, 72, 71, 67,
        66, 71, 75, 71, 76, null, null, null,
      ],
      melodyB: [
        76, 74, 71, 72, 76, 79, 76, 74,
        79, 78, 74, 71, 74, 79, 78, null,
        76, 72, 69, 72, 76, 81, 79, 76,
        75, 78, 83, 78, 76, null, null, null,
      ],
      bassPattern: [0, 12, 0, 7, 0, 12, 7, 12, 0, 12, 0, 7, 10, 7, 5, 7],
      arpPattern: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2],
    },
    {
      id: 'act1_krol_kosci',
      act: 1,
      indexInAct: 3,
      title: 'Gniew Króla Kości',
      bpm: 148,
      leadStyle: 'brass',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // C harmonic minor epic: Cm - Ab - Fm - G | Cm - Eb - Fm - G
      chordsA: [
        [48, 51, 55, 60],
        [44, 48, 51, 56],
        [41, 44, 48, 53],
        [43, 47, 50, 55],
      ],
      chordsB: [
        [48, 51, 55, 60],
        [51, 55, 58, 63],
        [53, 56, 60, 65],
        [55, 59, 62, 67],
      ],
      melodyA: [
        60, null, 63, 67, 68, 67, 63, 62,
        68, null, 67, 63, 60, null, 63, 67,
        65, 68, 72, 71, 68, 65, 63, 62,
        67, null, 71, 74, 72, null, null, null,
      ],
      melodyB: [
        72, 72, 75, 79, 80, 79, 75, 74,
        75, null, 79, 82, 79, 75, 74, 72,
        77, 75, 72, 75, 77, 80, 79, 77,
        79, null, 83, 86, 84, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 0, 0, 7, 10, 0, 0, 12, 0, 7, 0, 10, 11],
      arpPattern: [0, 2, 3, 2, 1, 2, 3, 2, 0, 3, 2, 1, 0, 2, 3, 1],
    },
  ],

  // ======================================================
  // AKT 2: PALĄCA PUSTYNIA (Exotic Arabian Phrygian Action)
  // ======================================================
  2: [
    {
      id: 'act2_karawana',
      act: 2,
      indexInAct: 1,
      title: 'Karawana Złotych Wydm',
      bpm: 130,
      leadStyle: 'oud',
      arpStyle: 'oud',
      drumStyle: 'desert',
      // E Phrygian Dominant: E - F - G - F | E - Dm - F - E
      chordsA: [
        [52, 56, 59, 64],
        [53, 57, 60, 65],
        [55, 59, 62, 67],
        [53, 57, 60, 65],
      ],
      chordsB: [
        [52, 56, 59, 64],
        [50, 53, 57, 62],
        [53, 57, 60, 65],
        [52, 56, 59, 64],
      ],
      melodyA: [
        64, 65, 68, 69, 68, 65, 64, null,
        65, 69, 72, 71, 69, 68, 65, null,
        67, 71, 74, 72, 71, 69, 68, 65,
        68, 65, 64, 65, 64, null, null, null,
      ],
      melodyB: [
        76, 77, 80, 77, 76, 74, 71, 68,
        74, 76, 77, 74, 72, 69, 68, 65,
        69, 72, 74, 77, 76, 74, 72, 69,
        68, 71, 76, 77, 76, null, null, null,
      ],
      bassPattern: [0, null, 0, 12, 7, null, 1, 0, 0, null, 7, null, 12, 10, 7, 1],
      arpPattern: [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 1, 0, 2],
    },
    {
      id: 'act2_burza',
      act: 2,
      indexInAct: 2,
      title: 'Burza Piaskowa',
      bpm: 146,
      leadStyle: 'flute',
      arpStyle: 'oud',
      drumStyle: 'desert',
      // D Phrygian Dominant gallop: D - Eb - Cm - D | D - Gm - Eb - D
      chordsA: [
        [50, 54, 57, 62],
        [51, 55, 58, 63],
        [48, 51, 55, 60],
        [50, 54, 57, 62],
      ],
      chordsB: [
        [50, 54, 57, 62],
        [55, 58, 62, 67],
        [51, 55, 58, 63],
        [50, 54, 57, 62],
      ],
      melodyA: [
        62, 63, 66, 67, 69, 67, 66, 63,
        67, 70, 74, 72, 70, 67, 66, 63,
        67, 66, 63, 62, 67, 70, 72, 70,
        69, 67, 66, 63, 62, null, null, null,
      ],
      melodyB: [
        74, 75, 78, 79, 81, 79, 78, 75,
        79, 78, 74, 70, 74, 79, 78, 75,
        75, 74, 70, 67, 70, 74, 75, 78,
        79, 78, 75, 74, 74, null, null, null,
      ],
      bassPattern: [0, 0, 7, 0, 12, 0, 7, 1, 0, 0, 7, 0, 10, 7, 1, 0],
      arpPattern: [0, 3, 2, 1, 0, 2, 3, 1, 3, 2, 1, 0, 1, 2, 3, 2],
    },
    {
      id: 'act2_faraon',
      act: 2,
      indexInAct: 3,
      title: 'Klątwa Faraona',
      bpm: 136,
      leadStyle: 'brass',
      arpStyle: 'oud',
      drumStyle: 'epic',
      // A Hungarian minor majestic: Am - F - Dm - E | Am - C - Bdim - E
      chordsA: [
        [45, 48, 52, 57],
        [41, 45, 48, 53],
        [50, 53, 57, 62],
        [52, 56, 59, 64],
      ],
      chordsB: [
        [45, 48, 52, 57],
        [48, 52, 55, 60],
        [47, 50, 53, 59],
        [52, 56, 59, 64],
      ],
      melodyA: [
        69, null, 71, 72, 75, 76, 75, 72,
        72, null, 71, 69, 68, null, 69, 72,
        74, 75, 76, 72, 74, 71, 69, 68,
        76, null, 75, 71, 76, null, null, null,
      ],
      melodyB: [
        81, null, 80, 76, 75, 72, 76, 80,
        84, null, 83, 81, 79, 76, 72, null,
        77, 76, 74, 71, 74, 77, 80, 77,
        76, null, 80, 83, 81, null, null, null,
      ],
      bassPattern: [0, null, 0, 7, 0, null, 12, 7, 0, null, 0, 7, 11, 7, 5, null],
      arpPattern: [0, 1, 2, 3, 0, 2, 3, 1, 0, 1, 3, 2, 3, 2, 1, 0],
    },
  ],

  // ======================================================
  // AKT 3: PRZEKLĘTY LAS I BAGNA (Fairy-Tale Celtic Mystic)
  // ======================================================
  3: [
    {
      id: 'act3_swietliki',
      act: 3,
      indexInAct: 1,
      title: 'Świetliki Pradawnego Lasu',
      bpm: 126,
      leadStyle: 'celesta',
      arpStyle: 'harp',
      drumStyle: 'forest',
      // G Dorian magical: Gm - F - Eb - D | Gm - Bb - C - D
      chordsA: [
        [55, 58, 62, 67],
        [53, 57, 60, 65],
        [51, 55, 58, 63],
        [50, 54, 57, 62],
      ],
      chordsB: [
        [55, 58, 62, 67],
        [58, 62, 65, 70],
        [60, 64, 67, 72],
        [62, 66, 69, 74],
      ],
      melodyA: [
        67, 70, 74, null, 77, 74, 72, 70,
        69, 72, 77, null, 74, 72, 69, null,
        70, 74, 79, 77, 74, 72, 70, 67,
        69, null, 74, 72, 74, null, null, null,
      ],
      melodyB: [
        79, null, 77, 74, 77, 79, 82, 79,
        82, null, 79, 77, 74, 77, 79, null,
        84, 81, 79, 76, 79, 81, 84, 81,
        82, null, 79, 78, 79, null, null, null,
      ],
      bassPattern: [0, null, 7, null, 12, null, 7, null, 0, null, 7, 10, 12, null, 7, null],
      arpPattern: [0, 1, 2, 3, 2, 3, 1, 2, 0, 2, 3, 1, 3, 2, 1, 0],
    },
    {
      id: 'act3_taniec_cierni',
      act: 3,
      indexInAct: 2,
      title: 'Taniec Cierni',
      bpm: 144,
      leadStyle: 'flute',
      arpStyle: 'harp',
      drumStyle: 'forest',
      // A Celtic minor fast jig-action: Am - G - F - Em | Am - C - Dm - E
      chordsA: [
        [45, 48, 52, 57],
        [43, 47, 50, 55],
        [41, 45, 48, 53],
        [40, 43, 47, 52],
      ],
      chordsB: [
        [45, 48, 52, 57],
        [48, 52, 55, 60],
        [50, 53, 57, 62],
        [52, 56, 59, 64],
      ],
      melodyA: [
        69, 72, 76, 74, 72, 71, 69, 67,
        67, 71, 74, 76, 74, 71, 67, null,
        69, 72, 77, 76, 74, 72, 69, 67,
        71, 74, 76, 74, 71, null, null, null,
      ],
      melodyB: [
        81, 79, 76, 72, 76, 79, 81, 79,
        84, 83, 79, 76, 79, 84, 83, null,
        81, 77, 74, 77, 81, 86, 84, 81,
        80, 83, 88, 83, 81, null, null, null,
      ],
      bassPattern: [0, 12, 7, 12, 0, 12, 7, 10, 0, 12, 7, 12, 10, 7, 5, 7],
      arpPattern: [0, 2, 3, 1, 0, 2, 3, 2, 0, 1, 2, 3, 2, 1, 3, 2],
    },
    {
      id: 'act3_moczary',
      act: 3,
      indexInAct: 3,
      title: 'Serce Moczaru',
      bpm: 134,
      leadStyle: 'harp',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // F# minor enchanting epic: F#m - D - Bm - C# | F#m - A - Bm - C#
      chordsA: [
        [54, 57, 61, 66],
        [50, 54, 57, 62],
        [47, 50, 54, 59],
        [49, 53, 56, 61],
      ],
      chordsB: [
        [54, 57, 61, 66],
        [57, 61, 64, 69],
        [59, 62, 66, 71],
        [61, 65, 68, 73],
      ],
      melodyA: [
        66, null, 69, 73, 76, 73, 71, 69,
        74, null, 73, 69, 66, null, 69, 71,
        71, 74, 78, 76, 74, 71, 69, 66,
        73, null, 77, 80, 78, null, null, null,
      ],
      melodyB: [
        78, 76, 73, 76, 78, 81, 80, 78,
        81, null, 80, 76, 73, 76, 80, null,
        83, 81, 78, 74, 78, 81, 83, 81,
        80, null, 85, 80, 78, null, null, null,
      ],
      bassPattern: [0, null, 0, 7, 12, null, 7, 5, 0, null, 0, 7, 10, 7, 5, null],
      arpPattern: [0, 1, 2, 3, 3, 2, 1, 0, 0, 2, 1, 3, 2, 3, 1, 0],
    },
  ],

  // ======================================================
  // AKT 4: OBSYDIANOWA CYTADELA (Epic Symphonic Action)
  // ======================================================
  4: [
    {
      id: 'act4_magma',
      act: 4,
      indexInAct: 1,
      title: 'Rzeki Magmy',
      bpm: 146,
      leadStyle: 'brass',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // E Phrygian metal-symphonic: Em - F - G - F | Em - C - D - B
      chordsA: [
        [52, 55, 59, 64],
        [53, 57, 60, 65],
        [55, 59, 62, 67],
        [53, 57, 60, 65],
      ],
      chordsB: [
        [52, 55, 59, 64],
        [48, 52, 55, 60],
        [50, 54, 57, 62],
        [47, 51, 54, 59],
      ],
      melodyA: [
        64, 64, 65, 67, 71, 67, 65, 64,
        65, 69, 72, 71, 69, 65, 64, null,
        67, 71, 74, 76, 74, 71, 69, 67,
        69, 65, 64, 65, 64, null, null, null,
      ],
      melodyB: [
        76, 76, 79, 83, 81, 79, 76, 74,
        72, 76, 79, 84, 83, 79, 76, null,
        74, 78, 81, 86, 84, 81, 78, 74,
        75, 78, 83, 78, 76, null, null, null,
      ],
      bassPattern: [0, 0, 0, 12, 0, 0, 7, 10, 0, 0, 0, 12, 7, 5, 1, 0],
      arpPattern: [0, 3, 2, 3, 1, 3, 2, 3, 0, 2, 3, 1, 2, 3, 1, 2],
    },
    {
      id: 'act4_szczelina',
      act: 4,
      indexInAct: 2,
      title: 'Szczelina Chaosu',
      bpm: 154,
      leadStyle: 'celesta',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // C# harmonic minor hyper-dynamic: C#m - A - F#m - G# | C#m - E - B - G#
      chordsA: [
        [49, 52, 56, 61],
        [45, 49, 52, 57],
        [42, 45, 49, 54],
        [44, 48, 51, 56],
      ],
      chordsB: [
        [49, 52, 56, 61],
        [52, 56, 59, 64],
        [47, 51, 54, 59],
        [44, 48, 51, 56],
      ],
      melodyA: [
        73, 76, 80, 76, 75, 73, 72, 73,
        69, 73, 76, 81, 80, 76, 73, null,
        74, 73, 69, 66, 69, 73, 78, 76,
        75, 72, 68, 72, 75, 80, 75, null,
      ],
      melodyB: [
        85, 83, 80, 76, 80, 83, 85, 80,
        88, 87, 83, 80, 83, 88, 87, null,
        83, 80, 78, 75, 78, 83, 87, 83,
        80, 84, 87, 84, 85, null, null, null,
      ],
      bassPattern: [0, 12, 0, 12, 7, 12, 0, 10, 0, 12, 0, 12, 7, 5, 3, 11],
      arpPattern: [0, 1, 2, 3, 0, 3, 2, 1, 0, 2, 3, 1, 3, 2, 0, 1],
    },
    {
      id: 'act4_archont',
      act: 4,
      indexInAct: 3,
      title: 'Upadek Archonta',
      bpm: 150,
      leadStyle: 'horn',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // D minor ultimate symphonic boss anthem: Dm - Bb - Gm - A | Dm - C - Bb - A
      chordsA: [
        [50, 53, 57, 62],
        [46, 50, 53, 58],
        [43, 46, 50, 55],
        [45, 49, 52, 57],
      ],
      chordsB: [
        [50, 53, 57, 62],
        [48, 52, 55, 60],
        [46, 50, 53, 58],
        [45, 49, 52, 57],
      ],
      melodyA: [
        74, null, 74, 77, 81, 79, 77, 74,
        70, null, 74, 77, 82, 81, 77, null,
        79, 77, 74, 70, 74, 79, 81, 79,
        81, null, 85, 88, 86, null, null, null,
      ],
      melodyB: [
        86, 84, 81, 77, 81, 84, 86, 88,
        84, null, 82, 79, 76, 79, 84, null,
        82, 81, 77, 74, 77, 82, 86, 82,
        81, 85, 88, 85, 86, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 10, 12, 11],
      arpPattern: [0, 2, 1, 3, 2, 3, 0, 2, 1, 3, 2, 0, 3, 2, 1, 3],
    },
  ],

  // ======================================================
  // HARDCORE AKT 5: CYTADELA ASTRALNEGO MROZU (Crystal Epic)
  // ======================================================
  5: [
    {
      id: 'act5_zorza_wieczna',
      act: 5,
      indexInAct: 1,
      title: 'Zorza Astralnego Mrozu',
      bpm: 138,
      leadStyle: 'celesta',
      arpStyle: 'harp',
      drumStyle: 'epic',
      // C# minor crystalline heroic: C#m - A - E - B | C#m - F#m - A - G#7
      chordsA: [
        [49, 52, 56, 61],
        [45, 49, 52, 57],
        [52, 56, 59, 64],
        [47, 51, 54, 59],
      ],
      chordsB: [
        [49, 52, 56, 61],
        [54, 57, 61, 66],
        [57, 61, 64, 69],
        [56, 60, 63, 68],
      ],
      melodyA: [
        73, null, 76, 80, 83, 80, 78, 76,
        73, null, 76, 81, 80, 76, 73, null,
        76, 80, 83, 85, 83, 80, 78, 75,
        78, null, 80, 83, 85, null, null, null,
      ],
      melodyB: [
        85, null, 83, 80, 83, 85, 88, 85,
        85, 83, 81, 78, 81, 85, 88, null,
        88, 85, 81, 76, 81, 85, 88, 85,
        84, null, 87, 92, 85, null, null, null,
      ],
      bassPattern: [0, null, 0, 7, 12, null, 7, 5, 0, 0, 7, null, 12, 7, 5, null],
      arpPattern: [0, 1, 2, 3, 2, 3, 1, 0, 0, 2, 3, 1, 3, 2, 1, 0],
    },
    {
      id: 'act5_lodowy_bastion',
      act: 5,
      indexInAct: 2,
      title: 'Bramy Wiecznej Zimy',
      bpm: 148,
      leadStyle: 'horn',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // B minor driving ice battle: Bm - G - D - F# | Bm - Em - G - F#
      chordsA: [
        [47, 50, 54, 59],
        [43, 47, 50, 55],
        [50, 54, 57, 62],
        [42, 46, 49, 54],
      ],
      chordsB: [
        [47, 50, 54, 59],
        [52, 55, 59, 64],
        [55, 59, 62, 67],
        [54, 58, 61, 66],
      ],
      melodyA: [
        71, 74, 78, null, 81, 78, 76, 74,
        74, 79, 83, 79, 78, 74, 71, null,
        74, 78, 81, 83, 81, 78, 74, 73,
        78, null, 82, 85, 83, null, null, null,
      ],
      melodyB: [
        83, 81, 78, 74, 78, 81, 83, 86,
        86, 83, 79, 76, 79, 83, 86, null,
        86, 83, 79, 74, 79, 83, 86, 83,
        82, 85, 90, 85, 83, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 10, 7, 0, 0, 12, 7, 10, 7, 5, 7],
      arpPattern: [0, 2, 3, 1, 0, 3, 2, 1, 0, 1, 3, 2, 3, 1, 2, 0],
    },
    {
      id: 'act5_korona_kaelisa',
      act: 5,
      indexInAct: 3,
      title: 'Korona Kaelisa (Boss HC)',
      bpm: 158,
      leadStyle: 'brass',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // F minor fierce astral blizzard: Fm - Db - Bbm - C | Fm - Ab - Db - C
      chordsA: [
        [41, 44, 48, 53],
        [37, 41, 44, 49],
        [46, 49, 53, 58],
        [48, 52, 55, 60],
      ],
      chordsB: [
        [41, 44, 48, 53],
        [44, 48, 51, 56],
        [49, 53, 56, 61],
        [48, 52, 55, 60],
      ],
      melodyA: [
        77, null, 77, 80, 84, 82, 80, 77,
        73, null, 77, 80, 85, 84, 80, null,
        82, 80, 77, 73, 77, 82, 84, 82,
        84, null, 88, 91, 89, null, null, null,
      ],
      melodyB: [
        89, 87, 84, 80, 84, 87, 89, 91,
        87, null, 84, 80, 77, 80, 87, null,
        85, 84, 80, 77, 80, 85, 89, 85,
        84, 88, 91, 88, 89, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 10, 12, 11],
      arpPattern: [0, 3, 2, 1, 3, 2, 0, 1, 0, 2, 3, 1, 2, 3, 1, 0],
    },
  ],

  // ======================================================
  // HARDCORE AKT 6: KUŹNIA ZAPOMNIANYCH TYTANÓW (Industrial Forge)
  // ======================================================
  6: [
    {
      id: 'act6_kowadlo_tytanow',
      act: 6,
      indexInAct: 1,
      title: 'Młoty Prakuźni',
      bpm: 136,
      leadStyle: 'brass',
      arpStyle: 'lute',
      drumStyle: 'epic',
      // G minor heavy heroic forge: Gm - Eb - Cm - D | Gm - F - Eb - D
      chordsA: [
        [43, 46, 50, 55],
        [39, 43, 46, 51],
        [48, 51, 55, 60],
        [50, 54, 57, 62],
      ],
      chordsB: [
        [43, 46, 50, 55],
        [41, 45, 48, 53],
        [39, 43, 46, 51],
        [50, 54, 57, 62],
      ],
      melodyA: [
        67, null, 67, 70, 74, null, 72, 70,
        75, null, 74, 70, 67, null, 70, 72,
        72, 75, 79, 77, 75, 72, 70, 67,
        74, null, 78, 81, 79, null, null, null,
      ],
      melodyB: [
        79, null, 77, 74, 77, 79, 82, 79,
        77, 74, 72, 69, 72, 77, 81, null,
        79, 75, 70, 75, 79, 82, 84, 82,
        81, null, 78, 81, 79, null, null, null,
      ],
      bassPattern: [0, 0, null, 0, 7, 0, 12, null, 0, 0, 7, 0, 10, 7, 5, null],
      arpPattern: [0, 1, 2, 0, 3, 2, 1, 0, 0, 2, 3, 2, 1, 0, 2, 3],
    },
    {
      id: 'act6_plynne_zloto',
      act: 6,
      indexInAct: 2,
      title: 'Rzeki Płynnego Złota',
      bpm: 150,
      leadStyle: 'horn',
      arpStyle: 'synth',
      drumStyle: 'war',
      // A minor fiery forge rush: Am - F - Dm - E | Am - G - F - E
      chordsA: [
        [45, 48, 52, 57],
        [41, 45, 48, 53],
        [50, 53, 57, 62],
        [52, 56, 59, 64],
      ],
      chordsB: [
        [45, 48, 52, 57],
        [43, 47, 50, 55],
        [41, 45, 48, 53],
        [52, 56, 59, 64],
      ],
      melodyA: [
        69, 72, 76, null, 79, 76, 74, 72,
        77, null, 76, 72, 69, null, 72, 74,
        74, 77, 81, 79, 77, 74, 72, 69,
        76, 80, 83, 80, 81, null, null, null,
      ],
      melodyB: [
        81, 79, 76, 72, 76, 79, 81, 84,
        83, 79, 74, 79, 83, 86, 83, null,
        81, 77, 72, 77, 81, 84, 86, 84,
        83, 80, 83, 88, 81, null, null, null,
      ],
      bassPattern: [0, 12, 0, 7, 0, 12, 10, 7, 0, 12, 0, 7, 10, 7, 5, 7],
      arpPattern: [0, 2, 1, 3, 0, 3, 2, 1, 0, 2, 3, 1, 3, 2, 1, 0],
    },
    {
      id: 'act6_gniew_ignaroka',
      act: 6,
      indexInAct: 3,
      title: 'Gniew Ignaroka (Boss HC)',
      bpm: 162,
      leadStyle: 'brass',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // E minor thunderous titan boss: Em - C - Am - B | Em - D - C - B
      chordsA: [
        [40, 43, 47, 52],
        [48, 52, 55, 60],
        [45, 48, 52, 57],
        [47, 51, 54, 59],
      ],
      chordsB: [
        [40, 43, 47, 52],
        [50, 54, 57, 62],
        [48, 52, 55, 60],
        [47, 51, 54, 59],
      ],
      melodyA: [
        76, null, 76, 79, 83, 81, 79, 76,
        72, null, 76, 79, 84, 83, 79, null,
        81, 79, 76, 72, 76, 81, 83, 81,
        83, null, 87, 90, 88, null, null, null,
      ],
      melodyB: [
        88, 86, 83, 79, 83, 86, 88, 91,
        86, 83, 81, 78, 81, 86, 90, null,
        88, 84, 79, 84, 88, 91, 88, 84,
        83, 87, 91, 87, 88, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 10, 12, 11],
      arpPattern: [0, 1, 3, 2, 3, 2, 1, 0, 0, 3, 1, 2, 3, 1, 2, 0],
    },
  ],

  // ======================================================
  // HARDCORE AKT 7: TRON WIECZNOŚCI (Celestial Cosmic Finale!)
  // ======================================================
  7: [
    {
      id: 'act7_bramy_wiecznosci',
      act: 7,
      indexInAct: 1,
      title: 'Bramy Wieczności',
      bpm: 142,
      leadStyle: 'celesta',
      arpStyle: 'harp',
      drumStyle: 'epic',
      // C minor cosmic majesty: Cm - Ab - Fm - G | Cm - Eb - Ab - G
      chordsA: [
        [48, 51, 55, 60],
        [44, 48, 51, 56],
        [41, 44, 48, 53],
        [43, 47, 50, 55],
      ],
      chordsB: [
        [48, 51, 55, 60],
        [51, 55, 58, 63],
        [56, 60, 63, 68],
        [55, 59, 62, 67],
      ],
      melodyA: [
        72, null, 75, 79, 84, 82, 79, 75,
        80, null, 79, 75, 72, null, 75, 77,
        77, 80, 84, 82, 80, 77, 75, 72,
        79, null, 83, 86, 84, null, null, null,
      ],
      melodyB: [
        84, 82, 79, 75, 79, 82, 84, 87,
        87, null, 84, 82, 79, 82, 87, null,
        87, 84, 80, 77, 80, 84, 87, 84,
        83, null, 86, 91, 84, null, null, null,
      ],
      bassPattern: [0, null, 7, 12, 0, null, 12, 7, 0, null, 7, 10, 12, 7, 5, null],
      arpPattern: [0, 1, 2, 3, 3, 2, 1, 0, 0, 2, 3, 1, 3, 2, 1, 0],
    },
    {
      id: 'act7_zacmienie_gwiazd',
      act: 7,
      indexInAct: 2,
      title: 'Zaćmienie Siedmiu Słońc',
      bpm: 154,
      leadStyle: 'horn',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // D minor grand astral battle: Dm - Bb - Gm - A | Dm - C - Bb - A
      chordsA: [
        [50, 53, 57, 62],
        [46, 50, 53, 58],
        [43, 46, 50, 55],
        [45, 49, 52, 57],
      ],
      chordsB: [
        [50, 53, 57, 62],
        [48, 52, 55, 60],
        [46, 50, 53, 58],
        [45, 49, 52, 57],
      ],
      melodyA: [
        74, 77, 81, null, 86, 84, 81, 77,
        82, null, 81, 77, 74, null, 77, 79,
        79, 82, 86, 84, 82, 79, 77, 74,
        81, 85, 88, 85, 86, null, null, null,
      ],
      melodyB: [
        86, 84, 81, 77, 81, 84, 86, 89,
        88, null, 84, 79, 84, 88, 91, null,
        89, 86, 82, 77, 82, 86, 89, 86,
        85, 88, 93, 88, 86, null, null, null,
      ],
      bassPattern: [0, 0, 12, 7, 0, 12, 10, 7, 0, 0, 12, 7, 10, 7, 5, 7],
      arpPattern: [0, 2, 3, 1, 2, 3, 0, 1, 0, 3, 2, 1, 3, 2, 1, 0],
    },
    {
      id: 'act7_tron_aeternusa',
      act: 7,
      indexInAct: 3,
      title: 'Tron Aeternusa (Ostateczny Boss HC)',
      bpm: 168,
      leadStyle: 'brass',
      arpStyle: 'harp',
      drumStyle: 'epic',
      // F# minor transcendent final boss: F#m - D - Bm - C# | F#m - E - D - C#
      chordsA: [
        [42, 45, 49, 54],
        [50, 54, 57, 62],
        [47, 50, 54, 59],
        [49, 53, 56, 61],
      ],
      chordsB: [
        [42, 45, 49, 54],
        [52, 56, 59, 64],
        [50, 54, 57, 62],
        [49, 53, 56, 61],
      ],
      melodyA: [
        78, null, 78, 81, 85, 83, 81, 78,
        74, null, 78, 81, 86, 85, 81, null,
        83, 81, 78, 74, 78, 83, 85, 83,
        85, null, 89, 92, 90, null, null, null,
      ],
      melodyB: [
        90, 88, 85, 81, 85, 88, 90, 93,
        92, 88, 83, 88, 92, 95, 92, null,
        90, 86, 81, 86, 90, 93, 90, 86,
        85, 89, 92, 89, 90, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 10, 12, 11],
      arpPattern: [0, 3, 2, 1, 3, 1, 2, 0, 0, 2, 3, 1, 3, 2, 0, 1],
    },
  ],

  // ======================================================
  // GILDIA AKT I (AKT 8): ZŁOTA CYTADELA BRACTWA (Heroic Guild Fanfare!)
  // ======================================================
  8: [
    {
      id: 'act8_hymn_bractwa',
      act: 8,
      indexInAct: 1,
      title: 'Hymn Złotego Bractwa',
      bpm: 132,
      leadStyle: 'brass',
      arpStyle: 'harp',
      drumStyle: 'war',
      // D major triumphant guild anthem: D - A - Bm - G | D - G - A - D
      chordsA: [
        [50, 54, 57, 62],
        [45, 49, 52, 57],
        [47, 50, 54, 59],
        [43, 47, 50, 55],
      ],
      chordsB: [
        [50, 54, 57, 62],
        [55, 59, 62, 67],
        [57, 61, 64, 69],
        [50, 54, 57, 62],
      ],
      melodyA: [
        74, null, 78, 81, 86, null, 85, 81,
        81, null, 78, 76, 74, null, 76, 78,
        79, 81, 83, 81, 78, 74, 76, 78,
        81, null, 78, 76, 74, null, null, null,
      ],
      melodyB: [
        86, null, 85, 81, 83, 85, 86, 88,
        91, null, 88, 86, 83, 86, 88, null,
        88, 85, 81, 85, 88, 90, 88, 85,
        86, null, 81, 85, 86, null, null, null,
      ],
      bassPattern: [0, null, 0, 7, 12, null, 7, null, 0, null, 7, 12, 7, null, 5, null],
      arpPattern: [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 3, 1, 2, 3, 1, 0],
    },
    {
      id: 'act8_marsz_sztandarow',
      act: 8,
      indexInAct: 2,
      title: 'Marsz Złotych Sztandarów',
      bpm: 142,
      leadStyle: 'horn',
      arpStyle: 'lute',
      drumStyle: 'epic',
      // G major noble battle march: G - D - Em - C | G - C - D - G
      chordsA: [
        [43, 47, 50, 55],
        [50, 54, 57, 62],
        [40, 43, 47, 52],
        [48, 52, 55, 60],
      ],
      chordsB: [
        [43, 47, 50, 55],
        [48, 52, 55, 60],
        [50, 54, 57, 62],
        [43, 47, 50, 55],
      ],
      melodyA: [
        79, 79, 83, 86, 84, 83, 81, 79,
        81, null, 78, 74, 78, 81, 83, null,
        76, 79, 83, 84, 83, 79, 76, 79,
        84, 83, 81, 78, 79, null, null, null,
      ],
      melodyB: [
        86, 83, 79, 83, 86, 88, 91, 88,
        88, null, 84, 81, 84, 88, 91, null,
        90, 86, 81, 86, 90, 93, 91, 90,
        91, null, 86, 83, 86, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 7, 12, 10, 7, 5, 7],
      arpPattern: [0, 2, 1, 3, 0, 2, 3, 1, 0, 1, 3, 2, 3, 2, 1, 0],
    },
    {
      id: 'act8_koronacja_aureliona',
      act: 8,
      indexInAct: 3,
      title: 'Koronacja Aureliona (Boss Gildii)',
      bpm: 152,
      leadStyle: 'brass',
      arpStyle: 'synth',
      drumStyle: 'epic',
      // A major / F#m heroic duel: F#m - D - A - E | F#m - Bm - C# - F#m
      chordsA: [
        [42, 45, 49, 54],
        [50, 54, 57, 62],
        [45, 49, 52, 57],
        [52, 56, 59, 64],
      ],
      chordsB: [
        [42, 45, 49, 54],
        [47, 50, 54, 59],
        [49, 53, 56, 61],
        [42, 45, 49, 54],
      ],
      melodyA: [
        78, null, 81, 85, 88, 85, 83, 81,
        86, null, 85, 81, 78, null, 81, 83,
        85, 88, 90, 88, 85, 81, 83, 85,
        88, null, 83, 80, 81, null, null, null,
      ],
      melodyB: [
        90, 88, 85, 81, 85, 88, 90, 93,
        90, null, 86, 83, 86, 90, 95, null,
        92, 89, 85, 89, 92, 97, 95, 92,
        90, null, 85, 88, 90, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 7, 10, 7, 5, 7],
      arpPattern: [0, 1, 2, 3, 3, 2, 1, 0, 0, 3, 2, 1, 2, 3, 1, 0],
    },
  ],

  // ======================================================
  // GILDIA AKT II (AKT 9): SANKTUARIUM SZMARAGDOWEGO SMOKA!
  // ======================================================
  9: [
    {
      id: 'act9_swiatynia_jadeitu',
      act: 9,
      indexInAct: 1,
      title: 'Świątynia Szmaragdowego Jadeitu',
      bpm: 134,
      leadStyle: 'flute',
      arpStyle: 'harp',
      drumStyle: 'forest',
      // E Dorian dragon sanctuary: Em - D - C - Bm | Em - G - A - B
      chordsA: [
        [40, 43, 47, 52],
        [50, 54, 57, 62],
        [48, 52, 55, 60],
        [47, 50, 54, 59],
      ],
      chordsB: [
        [40, 43, 47, 52],
        [43, 47, 50, 55],
        [45, 49, 52, 57],
        [47, 51, 54, 59],
      ],
      melodyA: [
        76, null, 79, 83, 86, 83, 81, 79,
        81, null, 78, 74, 78, 81, 83, null,
        79, 83, 86, 88, 86, 83, 81, 79,
        78, null, 83, 81, 79, null, null, null,
      ],
      melodyB: [
        88, null, 86, 83, 86, 88, 91, 88,
        91, 88, 86, 83, 86, 91, 95, null,
        93, 88, 85, 88, 93, 97, 95, 93,
        91, null, 87, 91, 88, null, null, null,
      ],
      bassPattern: [0, null, 7, 12, 0, null, 7, 5, 0, null, 7, 10, 12, 7, 5, null],
      arpPattern: [0, 1, 2, 3, 2, 3, 1, 2, 0, 2, 3, 1, 3, 2, 1, 0],
    },
    {
      id: 'act9_lot_skrzydel',
      act: 9,
      indexInAct: 2,
      title: 'Lot Szmaragdowych Skrzydeł',
      bpm: 148,
      leadStyle: 'celesta',
      arpStyle: 'harp',
      drumStyle: 'epic',
      // C# Dorian soaring dragon flight: C#m - B - A - G#m | C#m - E - F# - G#
      chordsA: [
        [49, 52, 56, 61],
        [47, 51, 54, 59],
        [45, 49, 52, 57],
        [44, 47, 51, 56],
      ],
      chordsB: [
        [49, 52, 56, 61],
        [52, 56, 59, 64],
        [54, 58, 61, 66],
        [56, 60, 63, 68],
      ],
      melodyA: [
        73, 76, 80, null, 83, 80, 78, 76,
        78, null, 75, 71, 75, 78, 80, null,
        76, 80, 81, 83, 81, 80, 76, 73,
        75, null, 80, 78, 76, null, null, null,
      ],
      melodyB: [
        85, 83, 80, 76, 80, 83, 85, 88,
        88, null, 85, 83, 80, 83, 88, null,
        90, 87, 85, 82, 85, 90, 92, 90,
        88, null, 87, 92, 85, null, null, null,
      ],
      bassPattern: [0, 0, 12, 7, 0, 12, 10, 7, 0, 0, 12, 7, 10, 7, 5, 7],
      arpPattern: [0, 2, 3, 1, 0, 3, 2, 1, 0, 1, 3, 2, 3, 1, 2, 0],
    },
    {
      id: 'act9_ryk_drakorysa',
      act: 9,
      indexInAct: 3,
      title: 'Ryk Drakorysa (Smok Gildii)',
      bpm: 158,
      leadStyle: 'horn',
      arpStyle: 'synth',
      drumStyle: 'war',
      // G minor roaring dragon boss: Gm - F - Eb - D | Gm - Cm - Eb - D
      chordsA: [
        [43, 46, 50, 55],
        [41, 45, 48, 53],
        [39, 43, 46, 51],
        [50, 54, 57, 62],
      ],
      chordsB: [
        [43, 46, 50, 55],
        [48, 51, 55, 60],
        [39, 43, 46, 51],
        [50, 54, 57, 62],
      ],
      melodyA: [
        79, null, 79, 82, 86, 84, 82, 79,
        77, null, 81, 84, 86, 84, 81, null,
        79, 82, 87, 86, 82, 79, 77, 74,
        81, null, 86, 84, 82, null, null, null,
      ],
      melodyB: [
        91, 89, 86, 82, 86, 89, 91, 94,
        91, null, 87, 84, 87, 91, 96, null,
        94, 91, 87, 82, 87, 91, 94, 91,
        90, 93, 98, 93, 91, null, null, null,
      ],
      bassPattern: [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 10, 12, 11],
      arpPattern: [0, 3, 2, 1, 3, 2, 1, 0, 0, 2, 3, 1, 3, 1, 2, 0],
    },
  ],
};

class DynamicMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private currentTrack: MusicTrackInfo = MENU_TRACK;
  private running = false;
  private muted = false;
  private volume = 0.42;
  private combatIntensity = 0.55; // 0.35 calm -> 1.0 full boss/combo intensity

  private stepIndex = 0; // 0..127 (8 bars of 16 sixteenth-notes: A = 0..63, B = 64..127)
  private nextNoteTime = 0;
  private schedulerTimer: number | null = null;
  private loopsPlayedOnTrack = 0;
  private listeners = new Set<(track: MusicTrackInfo) => void>();
  private unlockBound = false;

  public bindAutoUnlock() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      this.ensureAudioGraph();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.running && !this.muted) {
        this.startLoop();
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  public subscribe(fn: (track: MusicTrackInfo) => void): () => void {
    this.listeners.add(fn);
    fn(this.currentTrack);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn(this.currentTrack);
  }

  public getCurrentTrack(): MusicTrackInfo {
    return this.currentTrack;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.52, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.52, this.ctx.currentTime, 0.05);
    }
    if (!m && !this.running) {
      this.startLoop();
    }
  }

  public setCombatIntensity(level: number) {
    this.combatIntensity = Math.max(0.25, Math.min(1, level));
  }

  public playMenuTheme() {
    if (this.currentTrack.id === MENU_TRACK.id && this.running) return;
    this.switchTrack(MENU_TRACK);
  }

  public playActLocation(act: ActNumber, locationInAct: number, isBossOrMiniBoss = false) {
    const tracks = ACT_TRACKS[act] || ACT_TRACKS[1];
    // Boss always gets dramatic Track 3; regular levels cycle smoothly across all 3 tracks!
    const idx = isBossOrMiniBoss ? 2 : Math.max(0, locationInAct - 1) % tracks.length;
    const chosen = tracks[idx] || tracks[0];
    if (this.currentTrack.id !== chosen.id) {
      this.switchTrack(chosen);
    } else if (!this.running) {
      this.startLoop();
    }
  }

  public nextTrackInCurrentAct() {
    if (this.currentTrack.act === 0) return;
    const tracks = ACT_TRACKS[this.currentTrack.act];
    const nextIdx = this.currentTrack.indexInAct % tracks.length;
    this.switchTrack(tracks[nextIdx]);
  }

  private switchTrack(track: MusicTrackInfo) {
    this.currentTrack = track;
    this.stepIndex = 0;
    this.loopsPlayedOnTrack = 0;
    this.notify();
    if (!this.running) {
      this.startLoop();
    } else if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.06;
    }
  }

  private ensureAudioGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();

      // Master chain: Compressor -> MasterGain -> Destination
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.18;

      const warmFilter = this.ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.value = 7200;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume * 0.52;

      warmFilter.connect(compressor);
      compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Lush Stereo Concert Hall Echo / Delay bus for rich orchestral depth!
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.34;

      const delayL = this.ctx.createDelay(1.0);
      delayL.delayTime.value = 0.24;
      const delayR = this.ctx.createDelay(1.0);
      delayR.delayTime.value = 0.37;

      const fbL = this.ctx.createGain();
      fbL.gain.value = 0.32;
      const fbR = this.ctx.createGain();
      fbR.gain.value = 0.28;

      const damp = this.ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2300;

      this.reverbSend.connect(damp);
      damp.connect(delayL);
      damp.connect(delayR);
      delayL.connect(fbL);
      fbL.connect(delayR);
      delayR.connect(fbR);
      fbR.connect(delayL);
      delayL.connect(warmFilter);
      delayR.connect(warmFilter);

      // Direct dry tap into warmFilter via masterBus helper stored on reverbSend parent:
      // Actually connect a direct dry node!
      this.dryBus = warmFilter;

      // Pre-bake white noise buffer for crisp drums & shakers
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 0.5, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  private dryBus: AudioNode | null = null;

  private startLoop() {
    const ctx = this.ensureAudioGraph();
    if (!ctx) return;
    if (this.schedulerTimer !== null) return;

    this.running = true;
    this.nextNoteTime = ctx.currentTime + 0.08;

    this.schedulerTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
      // Schedule 120ms ahead for rock-solid timing at any framerate!
      while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.stepIndex, this.nextNoteTime);
        const secondsPerSixteenth = 60 / this.currentTrack.bpm / 4;
        this.nextNoteTime += secondsPerSixteenth;
        this.stepIndex = (this.stepIndex + 1) % 128;

        // Auto-rotate to next track in the Act after 3 full 8-bar cycles (~55-70s) for endless variety!
        if (this.stepIndex === 0) {
          this.loopsPlayedOnTrack++;
          if (this.currentTrack.act !== 0 && this.loopsPlayedOnTrack >= 3) {
            const tracks = ACT_TRACKS[this.currentTrack.act];
            const nextIdx = this.currentTrack.indexInAct % tracks.length;
            this.currentTrack = tracks[nextIdx];
            this.loopsPlayedOnTrack = 0;
            this.notify();
          }
        }
      }
    }, 25);
  }

  private scheduleStep(step: number, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.dryBus || !this.reverbSend) return;

    const tr = this.currentTrack;
    const stepDur = 60 / tr.bpm / 4;
    const isB = step >= 64;
    const localStep = step % 64;
    const bar = Math.floor(localStep / 16); // 0..3
    const stepInBar = localStep % 16; // 0..15

    const chords = isB ? tr.chordsB : tr.chordsA;
    const chord = chords[bar] || chords[0];
    const rootMidi = chord[0];

    // 1. RICH ORCHESTRAL STRINGS PAD (triggered on beat 1 of each bar!)
    if (stepInBar === 0) {
      this.playStringsChord(chord, time, stepDur * 16.2, 0.075 + this.combatIntensity * 0.025);
    }

    // 2. DRIVING PULSE BASS (every sixteenth pattern slot)
    const bassOffset = tr.bassPattern[stepInBar];
    if (bassOffset !== null && bassOffset !== undefined) {
      const bassMidi = rootMidi - 12 + bassOffset;
      this.playBass(midiToFreq(bassMidi), time, stepDur * 1.45, 0.17 + this.combatIntensity * 0.06);
    }

    // 3. PLUCKED ARPEGGIO (Lute / Harp / Oud / Arcane Synth)
    const arpIdx = tr.arpPattern[stepInBar];
    if (arpIdx !== null && arpIdx !== undefined) {
      const noteMidi = chord[arpIdx % chord.length] + (isB && stepInBar % 4 === 3 ? 12 : 0);
      this.playPluck(
        midiToFreq(noteMidi),
        time,
        stepDur * 2.1,
        tr.arpStyle,
        0.085 + (stepInBar % 4 === 0 ? 0.03 : 0)
      );
    }

    // 4. EXPRESSIVE MAIN MELODY (eighth-note resolution -> every even sixteenth step)
    if (step % 2 === 0) {
      const melArray = isB ? tr.melodyB : tr.melodyA;
      const melStep = Math.floor(localStep / 2); // 0..31
      const melMidi = melArray[melStep];
      if (melMidi !== null && melMidi !== undefined) {
        // Compute note sustain until next note or rest end (1 to 4 eighth notes)
        let holdEighths = 1;
        while (
          melStep + holdEighths < melArray.length &&
          melArray[melStep + holdEighths] === null &&
          holdEighths < 3
        ) {
          holdEighths++;
        }
        this.playLead(
          midiToFreq(melMidi),
          time,
          stepDur * 2 * holdEighths * 0.94,
          tr.leadStyle,
          0.145 + (isB ? 0.025 : 0)
        );
      }
    }

    // 5. DYNAMIC BATTLE PERCUSSION (adapts to Act style + combat intensity!)
    this.playPercussionStep(tr.drumStyle, stepInBar, isB, time, stepDur);
  }

  private playStringsChord(midiNotes: number[], time: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, time);
    filter.frequency.linearRampToValueAtTime(1250 + this.combatIntensity * 450, time + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(700, time + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(vol, time + Math.min(0.45, dur * 0.25));
    env.gain.setValueAtTime(vol * 0.88, time + dur * 0.72);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    filter.connect(env);
    env.connect(this.dryBus!);
    env.connect(this.reverbSend!);

    for (const m of midiNotes.slice(0, 3)) {
      const f = midiToFreq(m);
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, time);
        osc.detune.setValueAtTime(detune, time);
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + dur + 0.05);
      }
    }
  }

  private playBass(freq: number, time: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480 + this.combatIntensity * 320, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(vol, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const subGain = ctx.createGain();
    subGain.gain.value = 0.75;
    const sawGain = ctx.createGain();
    sawGain.gain.value = 0.32;

    osc1.connect(subGain);
    osc2.connect(sawGain);
    subGain.connect(filter);
    sawGain.connect(filter);
    filter.connect(env);
    env.connect(this.dryBus!);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  private playPluck(
    freq: number,
    time: number,
    dur: number,
    style: MusicTrackInfo['arpStyle'],
    vol: number
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = style === 'harp' ? 'triangle' : style === 'oud' ? 'sawtooth' : style === 'synth' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = style === 'oud' ? 'bandpass' : 'lowpass';
    filter.Q.value = style === 'oud' ? 2.2 : 1.4;
    filter.frequency.setValueAtTime(style === 'harp' ? 3200 : style === 'synth' ? 2600 : 2100, time);
    filter.frequency.exponentialRampToValueAtTime(480, time + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(vol, time + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.dryBus!);
    env.connect(this.reverbSend!);

    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  private playLead(
    freq: number,
    time: number,
    dur: number,
    style: MusicTrackInfo['leadStyle'],
    vol: number
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    // Gentle musical vibrato LFO for expressive fantasy melodies!
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.4;
    lfoGain.gain.value = style === 'celesta' || style === 'harp' ? 1.2 : 4.2;
    lfo.connect(lfoGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    if (style === 'flute') {
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);
      filter.frequency.setValueAtTime(2800, time);
    } else if (style === 'celesta' || style === 'harp') {
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);
      filter.frequency.setValueAtTime(4600, time);
      filter.frequency.exponentialRampToValueAtTime(1400, time + dur);
    } else if (style === 'oud') {
      osc.type = 'sawtooth';
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, time);
      osc2.detune.setValueAtTime(9, time);
      filter.frequency.setValueAtTime(2400, time);
      filter.frequency.exponentialRampToValueAtTime(750, time + dur);
    } else {
      // Heroic Horn / Symphonic Brass!
      osc.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, time);
      osc2.detune.setValueAtTime(-7, time);
      filter.frequency.setValueAtTime(650, time);
      filter.frequency.linearRampToValueAtTime(style === 'brass' ? 2500 : 1950, time + Math.min(0.08, dur * 0.25));
      filter.frequency.exponentialRampToValueAtTime(980, time + dur);
    }

    osc.frequency.setValueAtTime(freq, time);
    lfoGain.connect(osc.frequency);

    const g1 = ctx.createGain();
    g1.gain.value = 0.72;
    const g2 = ctx.createGain();
    g2.gain.value = style === 'flute' ? 0.14 : style === 'celesta' ? 0.25 : 0.42;

    const env = ctx.createGain();
    const attack = style === 'celesta' || style === 'harp' || style === 'oud' ? 0.01 : 0.032;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(vol, time + attack);
    if (style === 'celesta' || style === 'harp') {
      env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    } else {
      env.gain.setValueAtTime(vol * 0.85, time + dur * 0.78);
      env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    }

    osc.connect(g1);
    osc2.connect(g2);
    g1.connect(filter);
    g2.connect(filter);
    filter.connect(env);
    env.connect(this.dryBus!);
    env.connect(this.reverbSend!);

    lfo.start(time);
    osc.start(time);
    osc2.start(time);
    lfo.stop(time + dur + 0.05);
    osc.stop(time + dur + 0.05);
    osc2.stop(time + dur + 0.05);
  }

  private playPercussionStep(
    style: MusicTrackInfo['drumStyle'],
    stepInBar: number,
    isB: boolean,
    time: number,
    _stepDur: number
  ) {
    const intense = this.combatIntensity;
    if (this.currentTrack.act === 0 && !isB && stepInBar % 4 !== 0) return;

    // 1. Deep Taiko / War Kick
    const kickHits =
      style === 'epic'
        ? [0, 3, 6, 8, 10, 14]
        : style === 'desert'
          ? [0, 3, 6, 10, 12]
          : style === 'forest'
            ? [0, 6, 8, 14]
            : [0, 4, 8, 10, 14];

    if (kickHits.includes(stepInBar) && (stepInBar % 4 === 0 || intense >= 0.45 || isB)) {
      this.triggerKick(time, (stepInBar === 0 ? 0.28 : 0.21) * (0.72 + intense * 0.35));
    }

    // 2. Battle Snare / Darbuka Slap
    const snareHits = style === 'desert' ? [4, 7, 12, 15] : [4, 12];
    if (snareHits.includes(stepInBar) && (this.currentTrack.act !== 0 || isB)) {
      this.triggerSnare(time, (style === 'desert' ? 0.13 : 0.15) * (0.65 + intense * 0.4), style === 'desert');
    }

    // 3. Crisp Hi-Hat / Shaker driving sixteenth motion!
    if (stepInBar % 2 === 0 || (intense > 0.6 && stepInBar % 2 === 1)) {
      const accent = stepInBar % 4 === 2 ? 1.35 : 0.72;
      this.triggerHat(time, 0.045 * accent * (0.55 + intense * 0.55));
    }
  }

  private triggerKick(time: number, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(vol, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(env);
    env.connect(this.dryBus!);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  private triggerSnare(time: number, vol: number, isDarbuka: boolean) {
    const ctx = this.ctx!;
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = isDarbuka ? 2400 : 1550;
      filter.Q.value = isDarbuka ? 2.6 : 1.1;
      const env = ctx.createGain();
      env.gain.setValueAtTime(vol, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + (isDarbuka ? 0.09 : 0.14));
      src.connect(filter);
      filter.connect(env);
      env.connect(this.dryBus!);
      src.start(time);
      src.stop(time + 0.16);
    }

    // Drum body tone
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDarbuka ? 340 : 195, time);
    osc.frequency.exponentialRampToValueAtTime(isDarbuka ? 180 : 105, time + 0.08);
    env.gain.setValueAtTime(vol * 0.65, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    osc.connect(env);
    env.connect(this.dryBus!);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  private triggerHat(time: number, vol: number) {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.dryBus!);
    src.start(time);
    src.stop(time + 0.06);
  }
}

export const musicEngine = new DynamicMusicEngine();

import { getMainBossByAct, getMiniBoss } from './bosses.js';
import { getMutatorForLocation, LOCATION_MUTATORS } from './mutators.js';
import type {
  ActNumber,
  GeneratedMapData,
  LocationDefinition,
  LockedChestState,
  MapProp,
  MapRoom,
  MapWall,
  PuzzleType,
  SecretPassageState,
  WaveObeliskState,
  WorldPuzzleState,
} from './types.js';

export interface ActTheme {
  act: ActNumber;
  name: string;
  subtitle: string;
  skyColor: string;
  fogColor: string;
  floorColor: string;
  floorAccentColor: string;
  wallColor: string;
  wallTopColor: string;
  ambientLightColor: string;
  sunLightColor: string;
  accentGlowColor: string;
  propKinds: string[];
}

export const ACT_THEMES: Record<ActNumber, ActTheme> = {
  1: {
    act: 1,
    name: 'Akt 1: Podziemia i Katakumby',
    subtitle: 'Pochodnie, starożytne krypty i krasnoludzkie ruiny',
    skyColor: '#22243b',
    fogColor: '#272a45',
    floorColor: '#5c647f',
    floorAccentColor: '#484f69',
    wallColor: '#757fa0',
    wallTopColor: '#3c425c',
    ambientLightColor: '#a8b6e6',
    sunLightColor: '#ffe0b8',
    accentGlowColor: '#fb923c',
    propKinds: ['torch_pillar', 'crypt_sarcophagus', 'bone_pile', 'dwarf_pillar'],
  },
  2: {
    act: 2,
    name: 'Akt 2: Paląca Pustynia',
    subtitle: 'Złote wydmy, oazy, świątynie piasku i piramidy',
    skyColor: '#4d2f1d',
    fogColor: '#7d4d2c',
    floorColor: '#f2c679',
    floorAccentColor: '#e0a64d',
    wallColor: '#d99848',
    wallTopColor: '#9e6022',
    ambientLightColor: '#ffe6c2',
    sunLightColor: '#fff5cf',
    accentGlowColor: '#38bdf8',
    propKinds: ['sand_obelisk', 'palm_tree', 'oasis_pool', 'pharaoh_statue'],
  },
  3: {
    act: 3,
    name: 'Akt 3: Przeklęty Las i Bagna',
    subtitle: 'Bioluminescencyjne rośliny, toksyczne moczary i ruiny elfów',
    skyColor: '#16302c',
    fogColor: '#1a3d36',
    floorColor: '#386b58',
    floorAccentColor: '#285245',
    wallColor: '#2e5946',
    wallTopColor: '#1a362c',
    ambientLightColor: '#8bf0cf',
    sunLightColor: '#e4c7ff',
    accentGlowColor: '#c084fc',
    propKinds: ['glow_mushroom', 'gnarled_tree', 'elf_arch', 'swamp_pool'],
  },
  4: {
    act: 4,
    name: 'Akt 4: Obsydianowa Cytadela',
    subtitle: 'Rzeki lawy, lewitujące wyspy i Wymiar Chaosu',
    skyColor: '#24101d',
    fogColor: '#361426',
    floorColor: '#3d364d',
    floorAccentColor: '#592338',
    wallColor: '#2d263b',
    wallTopColor: '#c92e4b',
    ambientLightColor: '#c084fc',
    sunLightColor: '#fb7185',
    accentGlowColor: '#f43f5e',
    propKinds: ['obsidian_crystal', 'lava_brazier', 'chaos_monolith', 'lava_fissure'],
  },
};

const ACT_LOCATION_NAMES: Record<ActNumber, string[]> = {
  1: [
    'Wejście do Katakumb',
    'Korytarz Pochodni',
    'Zawalona Krypta',
    'Kuźnia Zapomnianych Krasnoludów',
    'Sala Kata Katakumb',
    'Kanały Kości',
    'Grobowiec Królów Kamienia',
    'Komnaty Cichego Echa',
    'Biblioteka Popiołów',
    'Sanktuarium Pieczęci',
    'Przepaść Runicznych Filarów',
    'Bastion Zamarłych',
    'Katakumby Zielonego Płomienia',
    'Przedsionek Korony',
    'Tron Malakora',
  ],
  2: [
    'Brama Palących Wydm',
    'Oaza Szmaragdowej Wody',
    'Ruiny Karawany',
    'Świątynia Piaskowej Klepsydry',
    'Dziedziniec Złotego Sfinksa',
    'Kanion Skorpionów',
    'Zasypany Obelisk',
    'Katakumby Faraonów',
    'Dolina Wirującego Słońca',
    'Ołtarz Kapłana Słońca',
    'Wielka Piramida Wschodu',
    'Komnata Błękitnych Hieroglifów',
    'Burzowe Tarasy',
    'Most Złotego Horyzontu',
    'Leże Aziratha',
  ],
  3: [
    'Skraj Przeklętego Lasu',
    'Ścieżka Świetlistych Grzybów',
    'Mroczne Rozlewisko',
    'Zapomniane Ogrody Elfów',
    'Polana Korzennego Kolosa',
    'Mgliste Bagna',
    'Krąg Pradawnych Dębów',
    'Zatruty Strumień',
    'Ruiny Księżycowej Wieży',
    'Gniazdo Tkaczki Jadu',
    'Labirynt Cierni',
    'Bioluminescencyjna Grota',
    'Skażone Źródło',
    'Aleja Szeptów',
    'Serce Cierni — Sanktuarium Sylwary',
  ],
  4: [
    'Wrota Obsydianowej Cytadeli',
    'Most nad Rzeką Lawy',
    'Lewitujące Bastiony',
    'Kuźnia Demonicznego Ognia',
    'Arena Obsydianowego Tytana',
    'Pęknięty Wymiar',
    'Korytarze Purpurowej Pustki',
    'Twierdza Złamanych Run',
    'Iglica Magmy',
    'Brama Zwiastuna Szczeliny',
    'Czarne Tarasy Chaosu',
    'Otchłań Płonących Kryształów',
    'Katedra Cienia i Ognia',
    'Schody Archonta',
    'Ołtarz Chaosu — Tron Vaelgora',
  ],
};

export const ALL_LOCATIONS: LocationDefinition[] = [];

for (let act = 1 as ActNumber; act <= 4; act = (act + 1) as ActNumber) {
  for (let loc = 1; loc <= 15; loc++) {
    const globalIndex = (act - 1) * 15 + loc;
    const isMiniBoss = loc === 5 || loc === 10;
    const isMainBoss = loc === 15;
    const mini = isMiniBoss ? getMiniBoss(act, loc) : undefined;
    const main = isMainBoss ? getMainBossByAct(act) : undefined;
    const mutatorId = getMutatorForLocation(act, loc);
    const mutDef = LOCATION_MUTATORS[mutatorId];
    ALL_LOCATIONS.push({
      globalIndex,
      act,
      locationInAct: loc,
      name: ACT_LOCATION_NAMES[act][loc - 1],
      subtitle: isMainBoss
        ? `Boss Główny: ${main!.name}`
        : isMiniBoss
          ? `Mini-Boss: ${mini!.name}`
          : `${mutDef.icon} ${mutDef.name}`,
      isMiniBoss,
      isMainBoss,
      bossName: main?.name ?? mini?.name,
      bossId: main?.id,
      recommendedLevel: globalIndex,
      seed: act * 100003 + loc * 7919 + 4242,
      mutatorId,
    });
  }
}

export function getLocationDef(globalIndex: number): LocationDefinition {
  const idx = Math.max(1, Math.min(60, Math.round(globalIndex)));
  return ALL_LOCATIONS[idx - 1];
}

export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a vast deterministic 3x3 macro-chamber dungeon (~136 x 136 world units)
 * for any of the 60 locations with:
 * - Guaranteed connected main path (Spawn -> Combat -> Puzzle Gate -> Combat -> Boss/Exit)
 * - 2 Secret Chambers hidden behind a Cracked Wall and a Hidden Lever behind a pillar
 * - In-world Logic Puzzle (rotates Pressure Plates / Rotating Statues / Symbol Match)
 * - 4-5 Locked Loot Chests with logic mini-puzzles
 * - 2 Healing Shrines
 * - Zero blocked paths or unreachable geometry
 */
export function generateMapData(globalIndex: number): GeneratedMapData {
  const location = getLocationDef(globalIndex);
  const rng = createSeededRng(location.seed);
  const theme = ACT_THEMES[location.act];

  const CELL_STEP = 44; // distance between room centers
  const ROOM_SIZE = 34; // interior size of each chamber
  const HALF_ROOM = ROOM_SIZE / 2; // 17
  const DOOR_WIDTH = 10; // wide, comfortable co-op corridors
  const WALL_THICK = 2;
  const WALL_H = 5.2;

  // 3x3 grid coordinates: gx in 0..2, gz in 0..2
  // Room index = gz * 3 + gx (0..8)
  // 0 = Spawn (top-left), 8 = Boss/Exit (bottom-right)
  const roomCenter = (idx: number) => {
    const gx = idx % 3;
    const gz = Math.floor(idx / 3);
    return {
      gx,
      gz,
      cx: (gx - 1) * CELL_STEP,
      cz: (gz - 1) * CELL_STEP,
    };
  };

  // Pick one of 4 distinct meandering topologies for variety across the 60 locations!
  // Each defines main path edges (0..8), puzzle room + gated edge, and 2 secret rooms + parent rooms.
  const layouts = [
    {
      // Snake East -> South -> West -> South -> East, secrets at 6 & 2
      mainEdges: [
        [0, 1],
        [1, 4],
        [4, 3],
        [3, 6],
        [4, 5],
        [5, 8],
        [6, 7],
      ] as Array<[number, number]>,
      puzzleRoom: 4,
      gatedEdge: [4, 5] as [number, number],
      secret1: { parent: 1, room: 2, kind: 'cracked_wall' as const },
      secret2: { parent: 7, room: 8, altParent: 6, altRoom: 7, kind: 'hidden_lever' as const },
      // Simpler: always keep 2 dedicated dead-end secret rooms!
      edgesClean: [
        [0, 1],
        [1, 4],
        [4, 3],
        [4, 5],
        [5, 8],
        [3, 6],
      ] as Array<[number, number]>,
      sec1: { from: 1, to: 2 }, // cracked wall
      sec2: { from: 6, to: 7 }, // hidden lever
      shrineRooms: [3, 5],
    },
    {
      // Snake South -> East -> North -> East -> South
      edgesClean: [
        [0, 3],
        [3, 4],
        [4, 1],
        [4, 7],
        [7, 8],
        [1, 2],
      ] as Array<[number, number]>,
      puzzleRoom: 4,
      gatedEdge: [4, 7] as [number, number],
      sec1: { from: 3, to: 6 },
      sec2: { from: 2, to: 5 },
      shrineRooms: [1, 7],
    },
    {
      // Upper arc + central hub
      edgesClean: [
        [0, 1],
        [1, 2],
        [2, 5],
        [5, 4],
        [4, 7],
        [7, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 5,
      gatedEdge: [5, 4] as [number, number],
      sec1: { from: 0, to: 3 },
      sec2: { from: 4, to: 6 }, // wait 4 and 6 not adjacent! use 7->6!
      shrineRooms: [2, 7],
    },
    {
      // Western loop into southern arena
      edgesClean: [
        [0, 3],
        [3, 6],
        [6, 7],
        [7, 4],
        [4, 5],
        [5, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 7,
      gatedEdge: [7, 4] as [number, number],
      sec1: { from: 0, to: 1 },
      sec2: { from: 4, to: 2 }, // not adjacent -> fix below
      shrineRooms: [3, 5],
    },
  ];

  // Ensure every single edge is strictly orthogonally adjacent!
  const cleanLayouts = [
    {
      edges: [
        [0, 1],
        [1, 4],
        [4, 3],
        [3, 6],
        [4, 5],
        [5, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 4,
      gatedEdge: [4, 5] as [number, number],
      sec1: { from: 1, to: 2 },
      sec2: { from: 6, to: 7 },
      leverRoom: 3,
      shrineRooms: [3, 5],
    },
    {
      edges: [
        [0, 3],
        [3, 4],
        [4, 1],
        [1, 2],
        [4, 7],
        [7, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 4,
      gatedEdge: [4, 7] as [number, number],
      sec1: { from: 3, to: 6 },
      sec2: { from: 2, to: 5 },
      leverRoom: 1,
      shrineRooms: [1, 7],
    },
    {
      edges: [
        [0, 1],
        [1, 2],
        [2, 5],
        [5, 4],
        [4, 7],
        [7, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 5,
      gatedEdge: [5, 4] as [number, number],
      sec1: { from: 0, to: 3 },
      sec2: { from: 7, to: 6 },
      leverRoom: 4,
      shrineRooms: [2, 7],
    },
    {
      edges: [
        [0, 3],
        [3, 6],
        [6, 7],
        [7, 4],
        [4, 5],
        [5, 8],
      ] as Array<[number, number]>,
      puzzleRoom: 7,
      gatedEdge: [7, 4] as [number, number],
      sec1: { from: 0, to: 1 },
      sec2: { from: 5, to: 2 },
      leverRoom: 4,
      shrineRooms: [6, 5],
    },
  ];
  void layouts;

  const layout = cleanLayouts[(location.globalIndex - 1) % cleanLayouts.length];

  const allEdges: Array<[number, number]> = [
    ...layout.edges,
    [layout.sec1.from, layout.sec1.to],
    [layout.sec2.from, layout.sec2.to],
  ];

  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgeSet = new Set(allEdges.map(([a, b]) => edgeKey(a, b)));

  // Build rooms metadata
  const rooms: MapRoom[] = [];
  for (let i = 0; i < 9; i++) {
    const { cx, cz } = roomCenter(i);
    let kind: MapRoom['kind'] = 'combat';
    if (i === 0) kind = 'spawn';
    else if (i === 8) kind = location.isMainBoss || location.isMiniBoss ? 'boss' : 'exit';
    else if (i === layout.puzzleRoom) kind = 'puzzle';
    else if (i === layout.sec1.to || i === layout.sec2.to) kind = 'secret';
    else if (layout.shrineRooms.includes(i)) kind = 'shrine';

    rooms.push({
      index: i,
      cx,
      cz,
      w: ROOM_SIZE,
      d: ROOM_SIZE,
      kind,
    });
  }

  // Determine Puzzle Gate coordinates
  const [ga, gb] = layout.gatedEdge;
  const gca = roomCenter(ga);
  const gcb = roomCenter(gb);
  const gateX = (gca.cx + gcb.cx) / 2;
  const gateZ = (gca.cz + gcb.cz) / 2;
  const gateHorizontal = gca.gx === gcb.gx; // connects N/S so gate spans X

  const puzzleTypes: PuzzleType[] = ['pressure_plates', 'rotating_statues', 'symbol_match'];
  const puzzleType = puzzleTypes[(location.globalIndex + location.act) % 3];
  const pCenter = roomCenter(layout.puzzleRoom);

  const puzzleId = `puz_${location.globalIndex}_main`;
  const puzzleNodes =
    puzzleType === 'pressure_plates'
      ? [
          { x: pCenter.cx - 8, z: pCenter.cz - 7, hintIndex: 0 },
          { x: pCenter.cx + 8, z: pCenter.cz - 7, hintIndex: 1 },
          { x: pCenter.cx + 8, z: pCenter.cz + 7, hintIndex: 2 },
          { x: pCenter.cx - 8, z: pCenter.cz + 7, hintIndex: 3 },
        ]
      : puzzleType === 'rotating_statues'
        ? [
            { x: pCenter.cx - 8, z: pCenter.cz - 6, hintIndex: 0 },
            { x: pCenter.cx + 8, z: pCenter.cz - 6, hintIndex: 1 },
            { x: pCenter.cx, z: pCenter.cz + 8, hintIndex: 2 },
          ]
        : [
            { x: pCenter.cx - 8, z: pCenter.cz, hintIndex: 0 },
            { x: pCenter.cx, z: pCenter.cz - 7, hintIndex: 1 },
            { x: pCenter.cx + 8, z: pCenter.cz, hintIndex: 2 },
          ];

  // Deterministic shuffled sequence for pressure plates
  const seq = [0, 1, 2, 3];
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }

  const targetSymbols = [
    Math.floor(rng() * 4),
    Math.floor(rng() * 4),
    Math.floor(rng() * 4),
  ];
  const initialSymbols = targetSymbols.map((s) => (s + 1 + Math.floor(rng() * 3)) % 4);
  const initialAngles = [1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3)];

  const puzzles: WorldPuzzleState[] = [
    {
      id: puzzleId,
      type: puzzleType,
      roomIndex: layout.puzzleRoom,
      x: pCenter.cx,
      z: pCenter.cz,
      gateX,
      gateZ,
      gateHorizontal,
      solved: false,
      targetSequence: seq,
      currentSequence: [],
      statueAngles: initialAngles,
      pillarSymbols: initialSymbols,
      targetSymbols,
      nodes: puzzleNodes,
    },
  ];

  // Build Secret Passages (1 Cracked Wall + 1 Hidden Lever behind a pillar)
  const s1a = roomCenter(layout.sec1.from);
  const s1b = roomCenter(layout.sec1.to);
  const sec1Id = `sec_${location.globalIndex}_cracked`;

  const s2a = roomCenter(layout.sec2.from);
  const s2b = roomCenter(layout.sec2.to);
  const leverRoomCenter = roomCenter(layout.leverRoom);
  const sec2Id = `sec_${location.globalIndex}_lever`;

  const secrets: SecretPassageState[] = [
    {
      id: sec1Id,
      kind: 'cracked_wall',
      x: (s1a.cx + s1b.cx) / 2,
      z: (s1a.cz + s1b.cz) / 2,
      wallX: (s1a.cx + s1b.cx) / 2,
      wallZ: (s1a.cz + s1b.cz) / 2,
      revealed: false,
      hp: 3,
      maxHp: 3,
    },
    {
      id: sec2Id,
      kind: 'hidden_lever',
      x: (s2a.cx + s2b.cx) / 2,
      z: (s2a.cz + s2b.cz) / 2,
      wallX: (s2a.cx + s2b.cx) / 2,
      wallZ: (s2a.cz + s2b.cz) / 2,
      leverX: leverRoomCenter.cx + 12.5,
      leverZ: leverRoomCenter.cz - 12.5,
      revealed: false,
      hp: 1,
      maxHp: 1,
    },
  ];

  // Build Walls cleanly for all 9 rooms + corridors + gates + secrets
  const walls: MapWall[] = [];
  const halfSideLen = (ROOM_SIZE - DOOR_WIDTH) / 2; // 12

  for (let i = 0; i < 9; i++) {
    const { gx, gz, cx, cz } = roomCenter(i);

    const hasNorth = gz > 0 && edgeSet.has(edgeKey(i, i - 3));
    const hasSouth = gz < 2 && edgeSet.has(edgeKey(i, i + 3));
    const hasWest = gx > 0 && edgeSet.has(edgeKey(i, i - 1));
    const hasEast = gx < 2 && edgeSet.has(edgeKey(i, i + 1));

    // North wall (z = cz - HALF_ROOM)
    if (!hasNorth) {
      walls.push({ x: cx, z: cz - HALF_ROOM, w: ROOM_SIZE + WALL_THICK, d: WALL_THICK, h: WALL_H });
    } else {
      walls.push({
        x: cx - (DOOR_WIDTH / 2 + halfSideLen / 2),
        z: cz - HALF_ROOM,
        w: halfSideLen + WALL_THICK / 2,
        d: WALL_THICK,
        h: WALL_H,
      });
      walls.push({
        x: cx + (DOOR_WIDTH / 2 + halfSideLen / 2),
        z: cz - HALF_ROOM,
        w: halfSideLen + WALL_THICK / 2,
        d: WALL_THICK,
        h: WALL_H,
      });
    }

    // South wall (z = cz + HALF_ROOM)
    if (!hasSouth) {
      walls.push({ x: cx, z: cz + HALF_ROOM, w: ROOM_SIZE + WALL_THICK, d: WALL_THICK, h: WALL_H });
    } else {
      walls.push({
        x: cx - (DOOR_WIDTH / 2 + halfSideLen / 2),
        z: cz + HALF_ROOM,
        w: halfSideLen + WALL_THICK / 2,
        d: WALL_THICK,
        h: WALL_H,
      });
      walls.push({
        x: cx + (DOOR_WIDTH / 2 + halfSideLen / 2),
        z: cz + HALF_ROOM,
        w: halfSideLen + WALL_THICK / 2,
        d: WALL_THICK,
        h: WALL_H,
      });
      // Corridor side walls going south to room i+3
      const corrMidZ = cz + CELL_STEP / 2;
      const corrLen = CELL_STEP - ROOM_SIZE + WALL_THICK; // 12
      walls.push({ x: cx - DOOR_WIDTH / 2 - WALL_THICK / 2, z: corrMidZ, w: WALL_THICK, d: corrLen, h: WALL_H });
      walls.push({ x: cx + DOOR_WIDTH / 2 + WALL_THICK / 2, z: corrMidZ, w: WALL_THICK, d: corrLen, h: WALL_H });
    }

    // West wall (x = cx - HALF_ROOM)
    if (!hasWest) {
      walls.push({ x: cx - HALF_ROOM, z: cz, w: WALL_THICK, d: ROOM_SIZE + WALL_THICK, h: WALL_H });
    } else {
      walls.push({
        x: cx - HALF_ROOM,
        z: cz - (DOOR_WIDTH / 2 + halfSideLen / 2),
        w: WALL_THICK,
        d: halfSideLen + WALL_THICK / 2,
        h: WALL_H,
      });
      walls.push({
        x: cx - HALF_ROOM,
        z: cz + (DOOR_WIDTH / 2 + halfSideLen / 2),
        w: WALL_THICK,
        d: halfSideLen + WALL_THICK / 2,
        h: WALL_H,
      });
    }

    // East wall (x = cx + HALF_ROOM)
    if (!hasEast) {
      walls.push({ x: cx + HALF_ROOM, z: cz, w: WALL_THICK, d: ROOM_SIZE + WALL_THICK, h: WALL_H });
    } else {
      walls.push({
        x: cx + HALF_ROOM,
        z: cz - (DOOR_WIDTH / 2 + halfSideLen / 2),
        w: WALL_THICK,
        d: halfSideLen + WALL_THICK / 2,
        h: WALL_H,
      });
      walls.push({
        x: cx + HALF_ROOM,
        z: cz + (DOOR_WIDTH / 2 + halfSideLen / 2),
        w: WALL_THICK,
        d: halfSideLen + WALL_THICK / 2,
        h: WALL_H,
      });
      // Corridor side walls going east to room i+1
      const corrMidX = cx + CELL_STEP / 2;
      const corrLen = CELL_STEP - ROOM_SIZE + WALL_THICK; // 12
      walls.push({ x: corrMidX, z: cz - DOOR_WIDTH / 2 - WALL_THICK / 2, w: corrLen, d: WALL_THICK, h: WALL_H });
      walls.push({ x: corrMidX, z: cz + DOOR_WIDTH / 2 + WALL_THICK / 2, w: corrLen, d: WALL_THICK, h: WALL_H });
    }
  }

  // Add removable Puzzle Gate wall
  walls.push({
    id: `wall_${puzzleId}`,
    x: gateX,
    z: gateZ,
    w: gateHorizontal ? DOOR_WIDTH : WALL_THICK * 1.1,
    d: gateHorizontal ? WALL_THICK * 1.1 : DOOR_WIDTH,
    h: WALL_H,
    gateId: puzzleId,
  });

  // Add removable Secret Passage walls
  const sec1Horiz = s1a.gx === s1b.gx;
  walls.push({
    id: `wall_${sec1Id}`,
    x: secrets[0].wallX,
    z: secrets[0].wallZ,
    w: sec1Horiz ? DOOR_WIDTH : WALL_THICK * 1.2,
    d: sec1Horiz ? WALL_THICK * 1.2 : DOOR_WIDTH,
    h: WALL_H,
    destructible: true,
    secretId: sec1Id,
  });

  const sec2Horiz = s2a.gx === s2b.gx;
  walls.push({
    id: `wall_${sec2Id}`,
    x: secrets[1].wallX,
    z: secrets[1].wallZ,
    w: sec2Horiz ? DOOR_WIDTH : WALL_THICK * 1.2,
    d: sec2Horiz ? WALL_THICK * 1.2 : DOOR_WIDTH,
    h: WALL_H,
    secretId: sec2Id,
  });

  // Locked Loot Chests (2 Secret Golden Chests + 3 Random Chests in main rooms)
  const variants: Array<'sequence' | 'rotate' | 'symbols'> = ['sequence', 'rotate', 'symbols'];
  const chests: LockedChestState[] = [];

  const sec1Room = roomCenter(layout.sec1.to);
  chests.push({
    id: `chest_${location.globalIndex}_sec1`,
    x: sec1Room.cx,
    z: sec1Room.cz,
    isSecret: true,
    puzzleSeed: Math.floor(rng() * 100000),
    puzzleVariant: variants[Math.floor(rng() * variants.length)],
    opened: false,
  });

  const sec2Room = roomCenter(layout.sec2.to);
  chests.push({
    id: `chest_${location.globalIndex}_sec2`,
    x: sec2Room.cx,
    z: sec2Room.cz,
    isSecret: true,
    puzzleSeed: Math.floor(rng() * 100000),
    puzzleVariant: variants[Math.floor(rng() * variants.length)],
    opened: false,
  });

  const candidateChestRooms = rooms
    .filter((r) => r.index !== 0 && r.index !== 8 && r.kind !== 'secret')
    .map((r) => r.index);
  for (let c = 0; c < 3 && c < candidateChestRooms.length; c++) {
    const rIdx = candidateChestRooms[(c + Math.floor(rng() * candidateChestRooms.length)) % candidateChestRooms.length];
    const rc = roomCenter(rIdx);
    const offsetX = (rng() > 0.5 ? 1 : -1) * (8 + rng() * 4);
    const offsetZ = (rng() > 0.5 ? 1 : -1) * (8 + rng() * 4);
    chests.push({
      id: `chest_${location.globalIndex}_rnd_${c}`,
      x: Number((rc.cx + offsetX).toFixed(1)),
      z: Number((rc.cz + offsetZ).toFixed(1)),
      isSecret: false,
      puzzleSeed: Math.floor(rng() * 100000),
      puzzleVariant: variants[(c + location.globalIndex) % 3],
      opened: false,
    });
  }

  // Healing Shrines
  const shrines = layout.shrineRooms.map((rIdx, idx) => {
    const rc = roomCenter(rIdx);
    return {
      id: `shrine_${location.globalIndex}_${idx}`,
      x: rc.cx - 10,
      z: rc.cz + 10,
      used: false,
    };
  });

  // Decorative Props around corners of each room (never blocking center/corridors!)
  const props: MapProp[] = [];
  for (let i = 0; i < 9; i++) {
    const { cx, cz } = roomCenter(i);
    const corners = [
      { x: cx - 13, z: cz - 13 },
      { x: cx + 13, z: cz - 13 },
      { x: cx - 13, z: cz + 13 },
      { x: cx + 13, z: cz + 13 },
    ];
    for (const corner of corners) {
      if (rng() < 0.85) {
        const kind = theme.propKinds[Math.floor(rng() * theme.propKinds.length)];
        props.push({
          x: corner.x + (rng() - 0.5) * 2.2,
          z: corner.z + (rng() - 0.5) * 2.2,
          kind,
          scale: 0.85 + rng() * 0.45,
          rotY: rng() * Math.PI * 2,
        });
      }
    }
  }

  const spawnRoom = roomCenter(0);
  const exitRoom = roomCenter(8);

  // Place a Wave Challenge Obelisk on wave_obelisk maps (and as a bonus event on every 4th non-boss map)
  let obelisk: WaveObeliskState | undefined;
  if (location.mutatorId === 'wave_obelisk' || (!location.isMainBoss && !location.isMiniBoss && location.locationInAct % 4 === 0)) {
    const obRoom = rooms.find((r) => r.kind === 'combat' && r.index !== 0 && r.index !== 8) ?? rooms[1];
    obelisk = {
      id: `obelisk_${location.globalIndex}`,
      x: obRoom.cx,
      z: obRoom.cz,
      state: 'idle',
      currentWave: 0,
      maxWaves: 3,
    };
  }

  return {
    location,
    width: CELL_STEP * 3 + 12,
    height: CELL_STEP * 3 + 12,
    spawn: { x: spawnRoom.cx, z: spawnRoom.cz },
    exitPortal: { x: exitRoom.cx + 10, z: exitRoom.cz + 10 },
    rooms,
    walls,
    props,
    shrines,
    obelisk,
    puzzles,
    secrets,
    chests,
  };
}

/**
 * Resolves circle vs AABB wall collisions against active walls (ignoring opened gates/revealed secrets).
 */
export function resolveWallCollisions(
  x: number,
  z: number,
  radius: number,
  walls: MapWall[],
  solvedGateIds: Set<string>,
  revealedSecretIds: Set<string>
): { x: number; z: number } {
  let nx = x;
  let nz = z;

  for (let pass = 0; pass < 2; pass++) {
    for (const w of walls) {
      if (w.gateId && solvedGateIds.has(w.gateId)) continue;
      if (w.secretId && revealedSecretIds.has(w.secretId)) continue;

      const minX = w.x - w.w / 2;
      const maxX = w.x + w.w / 2;
      const minZ = w.z - w.d / 2;
      const maxZ = w.z + w.d / 2;

      const closestX = Math.max(minX, Math.min(nx, maxX));
      const closestZ = Math.max(minZ, Math.min(nz, maxZ));

      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          nx += (dx / dist) * overlap;
          nz += (dz / dist) * overlap;
        } else {
          // Center inside wall -> push out along shortest axis
          const penLeft = Math.abs(nx - minX);
          const penRight = Math.abs(maxX - nx);
          const penTop = Math.abs(nz - minZ);
          const penBottom = Math.abs(maxZ - nz);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) nx = minX - radius;
          else if (minPen === penRight) nx = maxX + radius;
          else if (minPen === penTop) nz = minZ - radius;
          else nz = maxZ + radius;
        }
      }
    }
  }

  return { x: nx, z: nz };
}

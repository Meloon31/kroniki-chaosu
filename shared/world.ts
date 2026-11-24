import { getMainBossByAct, getMiniBoss } from './bosses.js';
import { getMutatorForLocation, LOCATION_MUTATORS } from './mutators.js';
import { getRiftFloorAct } from './rift.js';
import type {
  ActNumber,
  CampStation,
  CorridorAlcoveInfo,
  CorridorFieldData,
  CorridorSegment,
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
    skyColor: '#254f46',
    fogColor: '#2c6154',
    floorColor: '#569c7e',
    floorAccentColor: '#3f7d64',
    wallColor: '#4a8569',
    wallTopColor: '#2e5c48',
    ambientLightColor: '#bbf7e3',
    sunLightColor: '#f3e5ff',
    accentGlowColor: '#c084fc',
    propKinds: ['glow_mushroom', 'gnarled_tree', 'elf_arch', 'swamp_pool'],
  },
  4: {
    act: 4,
    name: 'Akt 4: Obsydianowa Cytadela',
    subtitle: 'Rzeki lawy, lewitujące wyspy i Wymiar Chaosu',
    skyColor: '#422036',
    fogColor: '#572540',
    floorColor: '#665b7d',
    floorAccentColor: '#873d5c',
    wallColor: '#52476b',
    wallTopColor: '#e04864',
    ambientLightColor: '#e9ccff',
    sunLightColor: '#ffd4dc',
    accentGlowColor: '#f43f5e',
    propKinds: ['obsidian_crystal', 'lava_brazier', 'chaos_monolith', 'lava_fissure'],
  },
  5: {
    act: 5,
    name: 'HARDCORE Akt 5: Cytadela Astralnego Mrozu',
    subtitle: 'Kryształy zorzy polarnej, zamarznięte gwiazdy i królestwo Kaelisa',
    skyColor: '#1e3557',
    fogColor: '#294973',
    floorColor: '#7eb6e0',
    floorAccentColor: '#5289b8',
    wallColor: '#5a7ea8',
    wallTopColor: '#bae6fd',
    ambientLightColor: '#d8f3ff',
    sunLightColor: '#e0f7ff',
    accentGlowColor: '#38bdf8',
    propKinds: ['obsidian_crystal', 'dwarf_pillar', 'sand_obelisk', 'elf_arch'],
  },
  6: {
    act: 6,
    name: 'HARDCORE Akt 6: Kuźnia Zapomnianych Tytanów',
    subtitle: 'Kanały płynnego złota, brązowe bastiony i piec Ignaroka',
    skyColor: '#4a291a',
    fogColor: '#693a21',
    floorColor: '#9e7348',
    floorAccentColor: '#c4632b',
    wallColor: '#7c5534',
    wallTopColor: '#fbbf24',
    ambientLightColor: '#ffe7c4',
    sunLightColor: '#fff1cc',
    accentGlowColor: '#f97316',
    propKinds: ['lava_brazier', 'dwarf_pillar', 'torch_pillar', 'lava_fissure'],
  },
  7: {
    act: 7,
    name: 'HARDCORE Akt 7: Tron Wieczności',
    subtitle: 'Kosmiczne marmury, złote zaćmienie i sanktuarium Aeternusa',
    skyColor: '#2d1f4f',
    fogColor: '#402a6e',
    floorColor: '#9a8cc7',
    floorAccentColor: '#5c4b8f',
    wallColor: '#7c6da8',
    wallTopColor: '#00f5d4',
    ambientLightColor: '#f2e8ff',
    sunLightColor: '#e0fffa',
    accentGlowColor: '#00f5d4',
    propKinds: ['chaos_monolith', 'obsidian_crystal', 'elf_arch', 'pharaoh_statue'],
  },
  8: {
    act: 8,
    name: 'GILDIA Akt I: Złota Cytadela Bractwa',
    subtitle: 'Królewskie marmury, szafirowe sztandary i twierdza Aureliona (1× dziennie)',
    skyColor: '#253969',
    fogColor: '#36508c',
    floorColor: '#c9d4ea',
    floorAccentColor: '#d9a441',
    wallColor: '#5d7ab8',
    wallTopColor: '#fbbf24',
    ambientLightColor: '#fff4d6',
    sunLightColor: '#fffbeb',
    accentGlowColor: '#fbbf24',
    propKinds: ['pharaoh_statue', 'dwarf_pillar', 'torch_pillar', 'elf_arch'],
  },
  9: {
    act: 9,
    name: 'GILDIA Akt II: Sanktuarium Szmaragdowego Smoka',
    subtitle: 'Świątynia jadeitu, bursztynowe kryształy i leże Drakorysa (1× dziennie)',
    skyColor: '#17473c',
    fogColor: '#216354',
    floorColor: '#5cb896',
    floorAccentColor: '#2d8265',
    wallColor: '#368a6e',
    wallTopColor: '#fbbf24',
    ambientLightColor: '#d9ffef',
    sunLightColor: '#fef9c3',
    accentGlowColor: '#10b981',
    propKinds: ['glow_mushroom', 'sand_obelisk', 'obsidian_crystal', 'elf_arch'],
  },
};

export const STANDARD_MAX_LOCATION = 60;
export const HARDCORE_MAX_LOCATION = 105;
export const TOTAL_LOCATIONS = 135;

export function isHardcoreAct(act: ActNumber): boolean {
  return act >= 5 && act <= 7;
}

export function isHardcoreLocation(globalIndex: number): boolean {
  return globalIndex > STANDARD_MAX_LOCATION && globalIndex <= HARDCORE_MAX_LOCATION;
}

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
  5: [
    'Brama Astralnego Mrozu',
    'Lodowy Most Zorzy',
    'Kryształowe Krużganki',
    'Sala Zamarzniętych Gwiazd',
    'Bastion Rycerza Zorzy',
    'Komnaty Wiecznego Szronu',
    'Lustrzany Labirynt Lodu',
    'Katedra Błękitnych Sopli',
    'Zamarznięte Obserwatorium',
    'Sanktuarium Wyroczni Lodu',
    'Tarasy Polarnego Wichru',
    'Skarbiec Krystalicznych Run',
    'Aleja Mroźnych Posągów',
    'Wrota Wiecznej Zimy',
    'Tron Kaelisa, Władcy Zimy',
  ],
  6: [
    'Wejście do Prakuźni Tytanów',
    'Kanały Płynnego Złota',
    'Warsztat Starożytnych Kowali',
    'Most Zębatych Kolumn',
    'Kowadło Kowala Zagłady',
    'Hala Runicznych Miechów',
    'Odlewnia Nieśmiertelnych',
    'Galeria Płonącego Brązu',
    'Rdzeń Złotego Pieca',
    'Komnata Złotego Automatu',
    'Wulkaniczne Tarasy Kuźni',
    'Skarbiec Hartowanych Ostrzy',
    'Korytarz Tysiąca Iskier',
    'Schody Wielkiego Młota',
    'Prakuźnia Ignaroka, Kolosa',
  ],
  7: [
    'Próg Tronu Wieczności',
    'Marmurowa Droga Gwiazd',
    'Ogród Zatrzymanego Czasu',
    'Arkady Kosmicznego Światła',
    'Sala Herolda Zaćmienia',
    'Pęknięty Zegar Galaktyki',
    'Biblioteka Nieskończoności',
    'Most Turkusowego Blasku',
    'Katedra Astralnej Korony',
    'Arena Ostrza Nieśmiertelnych',
    'Dziedziniec Siedmiu Słońc',
    'Komnaty Czystej Wieczności',
    'Panteon Dawnych Bohaterów',
    'Brama Ostatecznego Sądu',
    'Tron Aeternusa, Cesarza Wieczności',
  ],
  8: [
    'Brama Złotej Cytadeli',
    'Dziedziniec Sztandarów',
    'Aleja Królewskich Tarcz',
    'Koszary Bractwa',
    'Bastion Kapitana Valeriusa',
    'Sala Złotych Pieczęci',
    'Galeria Zwycięstw Gildii',
    'Most Szafirowego Światła',
    'Zbrojownia Królów',
    'Wieża Arcymaga Sztandaru',
    'Krużganki Honorowej Gwardii',
    'Skarbiec Złotych Odłamków',
    'Katedra Złotego Lwa',
    'Wielkie Schody Korony',
    'Tron Aureliona, Króla Sztandaru',
  ],
  9: [
    'Próg Szmaragdowej Świątyni',
    'Tarasy Jadeitowych Łusek',
    'Ogród Bursztynowych Kryształów',
    'Grota Smoczych Posągów',
    'Arena Jeźdźca Łuski',
    'Most Zielonego Płomienia',
    'Korytarze Starożytnych Skrzydeł',
    'Komnaty Smoczego Oddechu',
    'Sanktuarium Złotych Jaj',
    'Ołtarz Kapłanki Smoka',
    'Labirynt Szmaragdowych Filarów',
    'Skarbiec Pradawnej Łuski',
    'Kopuła Jadeitowego Nieba',
    'Wrota Smoczego Szczytu',
    'Leże Drakorysa, Smoka Gildii',
  ],
};

export const ALL_LOCATIONS: LocationDefinition[] = [];

for (let act = 1 as ActNumber; act <= 9; act = (act + 1) as ActNumber) {
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
      recommendedLevel: act >= 8 ? 45 : Math.min(60, globalIndex),
      seed: act * 100003 + loc * 7919 + 4242,
      mutatorId,
    });
  }
}

export const CAMP_LOCATION_INDEX = 0;

export function getLocationDef(globalIndex: number): LocationDefinition {
  if (globalIndex === CAMP_LOCATION_INDEX) {
    return {
      globalIndex: 0,
      act: 8,
      locationInAct: 0,
      name: 'Wspólny Obóz Bohaterów',
      subtitle: 'Kowal • Ołtarz Run • Manekin DPS • Handel • Portal Wypraw i Szczeliny',
      isMiniBoss: false,
      isMainBoss: false,
      recommendedLevel: 1,
      seed: 777777,
      mutatorId: 'treasure_goblin',
    };
  }
  const idx = Math.max(1, Math.min(TOTAL_LOCATIONS, Math.round(globalIndex)));
  return ALL_LOCATIONS[idx - 1];
}

/**
 * Generates the Interactive 3D Co-op Hero Camp (Lobby Hub 3D):
 * Contains Blacksmith Forge, Rune Altar, Training Dummy Arena (live DPS),
 * Co-op Trade Carpet, Prestige Hall, Expedition Portal, and Chaos Rift Portal!
 */
export function generateCampMap(): GeneratedMapData {
  const location = getLocationDef(CAMP_LOCATION_INDEX);
  const HALF = 26;
  const WALL_H = 4.6;
  const walls: MapWall[] = [
    { x: 0, z: -HALF, w: HALF * 2 + 2, d: 2.2, h: WALL_H },
    { x: 0, z: HALF, w: HALF * 2 + 2, d: 2.2, h: WALL_H },
    { x: -HALF, z: 0, w: 2.2, d: HALF * 2 + 2, h: WALL_H },
    { x: HALF, z: 0, w: 2.2, d: HALF * 2 + 2, h: WALL_H },
  ];

  const campStations: CampStation[] = [
    { id: 'st_blacksmith', kind: 'blacksmith', x: -15, z: -3, label: '🔨 KOWAL (+0→+20 & MENTOR) [F]', color: '#fbbf24' },
    { id: 'st_runes', kind: 'runes', x: 15, z: -3, label: '🔮 OŁTARZ RUN (0/10) [F]', color: '#a855f7' },
    { id: 'st_trade', kind: 'trade', x: -14, z: 11, label: '🤝 STREFA HANDLU CO-OP [F]', color: '#38bdf8' },
    { id: 'st_prestige', kind: 'prestige', x: 14, z: 11, label: '👑 PRESTIŻ: TYTUŁY I AURY [F]', color: '#fb7185' },
    { id: 'st_rift', kind: 'rift', x: -7, z: -15, label: '🌀 SZCZELINA CHAOSU (ENDLESS) [F]', color: '#c084fc' },
    { id: 'st_portal', kind: 'portal', x: 7, z: -15, label: '🗺️ PORTAL WYPRAW (AKTY 1–9) [F]', color: '#22d3ee' },
  ];

  const props: MapProp[] = [
    { x: -20, z: -20, kind: 'gnarled_tree', scale: 1.15, rotY: 0.4 },
    { x: 20, z: -20, kind: 'gnarled_tree', scale: 1.1, rotY: 2.1 },
    { x: -20, z: 20, kind: 'gnarled_tree', scale: 1.05, rotY: 1.2 },
    { x: 20, z: 20, kind: 'gnarled_tree', scale: 1.2, rotY: 3.0 },
    { x: -19, z: -10, kind: 'torch_pillar', scale: 1.0, rotY: 0 },
    { x: 19, z: -10, kind: 'torch_pillar', scale: 1.0, rotY: 0 },
    { x: -19, z: 4, kind: 'torch_pillar', scale: 1.0, rotY: 0 },
    { x: 19, z: 4, kind: 'torch_pillar', scale: 1.0, rotY: 0 },
    { x: -10, z: 18, kind: 'glow_mushroom', scale: 0.9, rotY: 0.5 },
    { x: 10, z: 18, kind: 'glow_mushroom', scale: 0.95, rotY: 2.2 },
    { x: 0, z: 17, kind: 'lava_brazier', scale: 0.95, rotY: 0 },
  ];

  return {
    location,
    width: HALF * 2,
    height: HALF * 2,
    spawn: { x: 0, z: 10 },
    exitPortal: { x: 7, z: -15 },
    isCamp: true,
    campStations,
    rooms: [
      { index: 0, cx: 0, cz: 0, w: HALF * 2 - 4, d: HALF * 2 - 4, kind: 'spawn' },
    ],
    walls,
    props,
    shrines: [],
    puzzles: [],
    secrets: [],
    chests: [],
  };
}

export function rollDynamicMapSeed(): number {
  return ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1337;
}

/**
 * Generates an Endless Chaos Rift procedural organic corridor for Floor 1..∞!
 */
export function generateRiftMap(floor: number, customSeed?: number): GeneratedMapData {
  const f = Math.max(1, Math.floor(floor));
  const act = getRiftFloorAct(f);
  const boss = getMainBossByAct(act);
  const baseGlobal = (act - 1) * 15 + (((f - 1) % 14) + 1);
  const map = generateMapData(baseGlobal, customSeed ?? rollDynamicMapSeed());
  return {
    ...map,
    riftFloor: f,
    location: {
      ...map.location,
      act,
      name: `Szczelina Chaosu — Piętro ${f}`,
      subtitle: `Strażnik Szczeliny: ${boss.name} • Endless Endgame`,
      isMainBoss: true,
      isMiniBoss: false,
      bossName: `${boss.name} (Piętro ${f})`,
      bossId: boss.id,
      recommendedLevel: 60,
      seed: map.mapSeed ?? (900001 + f * 1337),
    },
  };
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

// =========================================================
// SMOOTH 2D VALUE/SIMPLEX-STYLE NOISE & TAPERED CAPSULE SDF
// =========================================================
function hash2D(ix: number, iz: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function smoothNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

function distToSegmentSq(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): { distSq: number; t: number } {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const ex = px - x1;
    const ez = pz - z1;
    return { distSq: ex * ex + ez * ez, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const cx = x1 + dx * t;
  const cz = z1 + dz * t;
  const ex = px - cx;
  const ez = pz - cz;
  return { distSq: ex * ex + ez * ez, t };
}

/**
 * Signed Distance Field to the organic walkable corridor + alcoves + clearings.
 * Negative = inside walkable floor; Positive = inside solid canyon rock wall.
 */
export function sampleCorridorSdf(
  x: number,
  z: number,
  field: CorridorFieldData,
  solvedGateIds?: Set<string>,
  ignoreGateLocks = false
): number {
  let minD = Infinity;
  for (let i = 0; i < field.segments.length; i++) {
    const seg = field.segments[i];
    if (seg.gateId && !ignoreGateLocks && (!solvedGateIds || !solvedGateIds.has(seg.gateId))) {
      continue;
    }
    const { distSq, t } = distToSegmentSq(x, z, seg.x1, seg.z1, seg.x2, seg.z2);
    const r = seg.r1 + (seg.r2 - seg.r1) * t;
    const d = Math.sqrt(distSq) - r;
    if (d < minD) minD = d;
  }
  // Organic carved rock edge noise (subtle enough to never pinch narrow chokes shut!)
  const n = (smoothNoise2D(x * field.noiseScale, z * field.noiseScale, field.mapSeed) - 0.5) * 2;
  return minD + n * field.noiseAmp;
}

const OBELISK_SYMBOLS = ['🔥 Ogień', '❄️ Mróz', '⚡ Burza', '🌑 Cień'];

/**
 * Generates a brand-new, non-grid Organic Winding Corridor + Side Alcoves (Hybrid 1 + 2):
 * - Dynamic fresh mapSeed on every single run (synchronized across 1–4 Co-op players!)
 * - 14–18 control-point spline combining Catmull-Rom arcs + 45°/60°/120° irregular canyon bends (~320–420 units!)
 * - Pulsating Perlin/Value-noise width: narrow chokes (6–8u) <-> wide oval clearings (15–22u)
 * - 4–6 winding blind Side Alcoves (15–25u) for chests, Cursed Altars, Shrines & Vault Puzzle clues
 * - 1 Hard Multi-Step Vault Puzzle (Ancient Obelisks / Lights Out / Mirror Beam) guarding the Vault Chamber (55–85%)
 * - Spacious Organic Final Boss/Exit Arena at 100%
 */
export function generateMapData(globalIndex: number, customSeed?: number): GeneratedMapData {
  const location = getLocationDef(globalIndex);
  const mapSeed = customSeed ?? rollDynamicMapSeed();
  const rng = createSeededRng(mapSeed);
  const theme = ACT_THEMES[location.act];

  // =========================================================
  // 1. MAIN SPINE (14-18 Control Points, 45°/60°/120° + Smooth Arcs, ZERO Self-Intersection!)
  // =========================================================
  const numCtrl = 15 + Math.floor(rng() * 4); // 15..18 control points -> ~340..405 units!
  const stepDistMin = 21.5;
  const stepDistMax = 24.5;
  const archetype = rng() < 0.36 ? 'snake' : rng() < 0.7 ? 'horseshoe' : 'spiral_canyon';

  const ctrlPts: Array<{ x: number; z: number; sharp: boolean }> = [{ x: 0, z: 0, sharp: false }];
  let heading = rng() * Math.PI * 2;
  const bendDir = rng() < 0.5 ? 1 : -1;
  const sharpAnglesDeg = [45, 60, 120];

  const isPointClearOfChain = (
    px: number,
    pz: number,
    chain: Array<{ x: number; z: number }>,
    skipLastCount: number,
    minClearance: number
  ): boolean => {
    const minSq = minClearance * minClearance;
    const limit = chain.length - skipLastCount;
    for (let j = 0; j < limit - 1; j++) {
      const res = distToSegmentSq(px, pz, chain[j].x, chain[j].z, chain[j + 1].x, chain[j + 1].z);
      if (res.distSq < minSq) return false;
    }
    return true;
  };

  for (let i = 1; i < numCtrl; i++) {
    const prev = ctrlPts[i - 1];
    const dist = stepDistMin + rng() * (stepDistMax - stepDistMin);

    // Build candidate turn angles mixing smooth Catmull-Rom arcs & sharp 45°/60°/120° canyon bends!
    const wantSharp = i >= 2 && i <= numCtrl - 2 && rng() < 0.42;
    let baseTurnRad = 0;
    if (wantSharp) {
      const deg = sharpAnglesDeg[Math.floor(rng() * sharpAnglesDeg.length)];
      const sign =
        archetype === 'horseshoe' || archetype === 'spiral_canyon'
          ? rng() < 0.72
            ? bendDir
            : -bendDir
          : (i % 2 === 0 ? 1 : -1) * bendDir;
      baseTurnRad = (deg * Math.PI) / 180 * sign;
    } else {
      const arcDeg = 18 + rng() * 22;
      const sign =
        archetype === 'snake'
          ? Math.sin(i * 0.75) >= 0
            ? bendDir
            : -bendDir
          : bendDir;
      baseTurnRad = (arcDeg * Math.PI) / 180 * sign;
    }

    const candidates = [
      baseTurnRad,
      baseTurnRad * 0.5,
      -baseTurnRad * 0.65,
      (45 * Math.PI) / 180,
      (-45 * Math.PI) / 180,
      (60 * Math.PI) / 180,
      (-60 * Math.PI) / 180,
      0,
      (120 * Math.PI) / 180,
      (-120 * Math.PI) / 180,
    ];

    let chosenX = prev.x + Math.cos(heading) * dist;
    let chosenZ = prev.z + Math.sin(heading) * dist;
    let chosenHeading = heading;
    let chosenSharp = wantSharp;

    for (const turn of candidates) {
      const tryH = heading + turn;
      const nx = prev.x + Math.cos(tryH) * dist;
      const nz = prev.z + Math.sin(tryH) * dist;
      if (isPointClearOfChain(nx, nz, ctrlPts, 2, 29)) {
        chosenX = nx;
        chosenZ = nz;
        chosenHeading = tryH;
        chosenSharp = Math.abs(turn) >= (44 * Math.PI) / 180;
        break;
      }
    }

    heading = chosenHeading;
    ctrlPts.push({ x: chosenX, z: chosenZ, sharp: chosenSharp });
  }

  // Sample Hybrid Catmull-Rom + sharp-bend spine every ~5.5 units
  const rawSpine: Array<{ x: number; z: number }> = [];
  const catmull = (p0: number, p1: number, p2: number, p3: number, u: number) => {
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
    );
  };

  for (let i = 0; i < ctrlPts.length - 1; i++) {
    const p0 = ctrlPts[Math.max(0, i - 1)];
    const p1 = ctrlPts[i];
    const p2 = ctrlPts[i + 1];
    const p3 = ctrlPts[Math.min(ctrlPts.length - 1, i + 2)];
    const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const subSteps = Math.max(3, Math.round(segLen / 5.5));
    // Blend 65% Catmull-Rom + 35% linear on sharp 45/60/120 bends so angular canyon breaks stay distinct!
    const blendLin = p1.sharp || p2.sharp ? 0.35 : 0.08;
    for (let s = 0; s < subSteps; s++) {
      const u = s / subSteps;
      const cx = catmull(p0.x, p1.x, p2.x, p3.x, u);
      const cz = catmull(p0.z, p1.z, p2.z, p3.z, u);
      const lx = p1.x + (p2.x - p1.x) * u;
      const lz = p1.z + (p2.z - p1.z) * u;
      rawSpine.push({
        x: cx * (1 - blendLin) + lx * blendLin,
        z: cz * (1 - blendLin) + lz * blendLin,
      });
    }
  }
  rawSpine.push({ x: ctrlPts[ctrlPts.length - 1].x, z: ctrlPts[ctrlPts.length - 1].z });

  // Compute cumulative arc length (~320..420 units) & pulsating Perlin width!
  let totalLength = 0;
  const cumLen: number[] = [0];
  for (let i = 1; i < rawSpine.length; i++) {
    totalLength += Math.hypot(rawSpine[i].x - rawSpine[i - 1].x, rawSpine[i].z - rawSpine[i - 1].z);
    cumLen.push(totalLength);
  }

  // Choose 4 organic oval clearing centers along t in [0.18..0.82] + narrow chokes between them!
  const clearingTs = [0.22 + rng() * 0.06, 0.44 + rng() * 0.06, 0.65 + rng() * 0.06, 0.82 + rng() * 0.04];

  const spinePoints: Array<{ x: number; z: number; r: number; t: number }> = rawSpine.map((pt, idx) => {
    const t = totalLength > 0 ? cumLen[idx] / totalLength : 0;
    let r = 4.6;
    if (t < 0.055) {
      // Smooth start clearing
      r = 10.5 - (t / 0.055) * 4.5;
    } else if (t > 0.925) {
      // Smooth opening into Final Boss/Exit Arena (diameter ~37)
      const u = (t - 0.925) / 0.075;
      r = 6.5 + u * u * 12.2;
    } else {
      // Pulsating width via 2D smooth noise + organic oval clearings (width 6-8 chokes <-> 15-22 clearings!)
      const nVal = smoothNoise2D(pt.x * 0.035 + 11.3, pt.z * 0.035 - 7.1, mapSeed + 77);
      // Base pulses smoothly between r=3.3 (6.6u choke) and r=6.6 (13.2u corridor)
      r = 3.3 + nVal * 3.5;
      for (const ct of clearingTs) {
        const dt = Math.abs(t - ct);
        if (dt < 0.065) {
          const bump = Math.cos((dt / 0.065) * (Math.PI / 2));
          r = Math.max(r, 4.5 + bump * bump * 6.2); // up to r=10.7 (21.4u wide oval clearing!)
        }
      }
    }
    return {
      x: Number(pt.x.toFixed(2)),
      z: Number(pt.z.toFixed(2)),
      r: Number(r.toFixed(2)),
      t,
    };
  });

  const segments: CorridorSegment[] = [];
  for (let i = 0; i < spinePoints.length - 1; i++) {
    const a = spinePoints[i];
    const b = spinePoints[i + 1];
    const avgR = (a.r + b.r) / 2;
    const kind: CorridorSegment['kind'] =
      a.t < 0.05 ? 'spawn' : b.t > 0.93 ? 'arena' : avgR >= 7.4 ? 'clearing' : 'spine';
    segments.push({
      x1: a.x,
      z1: a.z,
      x2: b.x,
      z2: b.z,
      r1: a.r,
      r2: b.r,
      kind,
    });
  }

  // Ensure final arena is a spacious organic oval at the tip of the spine!
  const endPt = spinePoints[spinePoints.length - 1];
  const arenaRadius = 18.5;
  segments.push({
    x1: endPt.x,
    z1: endPt.z,
    x2: endPt.x + 0.2,
    z2: endPt.z + 0.2,
    r1: arenaRadius,
    r2: arenaRadius,
    kind: 'arena',
  });

  // Helper to get spine point & tangent at normalized t in [0..1]
  const sampleSpineAtT = (targetT: number) => {
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < spinePoints.length; i++) {
      const diff = Math.abs(spinePoints[i].t - targetT);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    const pt = spinePoints[bestIdx];
    const prev = spinePoints[Math.max(0, bestIdx - 1)];
    const next = spinePoints[Math.min(spinePoints.length - 1, bestIdx + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    return {
      idx: bestIdx,
      x: pt.x,
      z: pt.z,
      r: pt.r,
      t: pt.t,
      dirX: tx / tl,
      dirZ: tz / tl,
      perpX: -tz / tl,
      perpZ: tx / tl,
    };
  };

  // Helper to check if a branch tip/mid stays clear of existing non-parent segments
  const isBranchClear = (bx: number, bz: number, parentT: number, minClear: number): boolean => {
    const minSq = minClear * minClear;
    for (let i = 0; i < spinePoints.length; i++) {
      if (Math.abs(spinePoints[i].t - parentT) < 0.085) continue;
      const dx = bx - spinePoints[i].x;
      const dz = bz - spinePoints[i].z;
      const rad = spinePoints[i].r + minClear;
      if (dx * dx + dz * dz < rad * rad) return false;
    }
    for (const seg of segments) {
      if (seg.kind !== 'alcove' && seg.kind !== 'vault') continue;
      const { distSq } = distToSegmentSq(bx, bz, seg.x1, seg.z1, seg.x2, seg.z2);
      if (distSq < minSq) return false;
    }
    return true;
  };

  // =========================================================
  // 2. VAULT CHAMBER (55% - 85% ALONG SPINE) + SEALED RUNIC GATE
  // =========================================================
  const puzzleId = `puz_${location.globalIndex}_vault`;
  const vaultTargetT = 0.62 + rng() * 0.16; // cleanly in [62%..78%]
  const vaultAnchor = sampleSpineAtT(vaultTargetT);

  // Pick left or right side of spine with best clearance for the Vault Chamber!
  let vaultSide = rng() < 0.5 ? 1 : -1;
  const testVaultTip = (side: number) => ({
    x: vaultAnchor.x + vaultAnchor.perpX * side * 22,
    z: vaultAnchor.z + vaultAnchor.perpZ * side * 22,
  });
  if (!isBranchClear(testVaultTip(vaultSide).x, testVaultTip(vaultSide).z, vaultAnchor.t, 12)) {
    vaultSide = -vaultSide;
  }

  const vDirX = vaultAnchor.perpX * vaultSide;
  const vDirZ = vaultAnchor.perpZ * vaultSide;
  const gateDist = vaultAnchor.r + 5.2;
  const vaultGateX = Number((vaultAnchor.x + vDirX * gateDist).toFixed(2));
  const vaultGateZ = Number((vaultAnchor.z + vDirZ * gateDist).toFixed(2));
  const vaultGateAngle = Math.atan2(vDirZ, vDirX);
  const vaultCenterX = Number((vaultAnchor.x + vDirX * (gateDist + 11.2)).toFixed(2));
  const vaultCenterZ = Number((vaultAnchor.z + vDirZ * (gateDist + 11.2)).toFixed(2));

  // Widen the clearing right in front of the Vault Gate so Lights Out / Mirror Beam have roomy space!
  segments.push({
    x1: vaultAnchor.x,
    z1: vaultAnchor.z,
    x2: vaultAnchor.x + vDirX * (gateDist - 2.6),
    z2: vaultAnchor.z + vDirZ * (gateDist - 2.6),
    r1: Math.max(vaultAnchor.r, 9.2),
    r2: 5.0,
    kind: 'clearing',
  });
  // Sealed Vault Chamber behind the Runic Gate (walkable ONLY once puzzleId is solved!)
  segments.push({
    x1: vaultGateX + vDirX * 1.4,
    z1: vaultGateZ + vDirZ * 1.4,
    x2: vaultCenterX,
    z2: vaultCenterZ,
    r1: 4.5,
    r2: 9.2,
    kind: 'vault',
    gateId: puzzleId,
  });

  // =========================================================
  // 3. 4 TO 6 WINDING SIDE ALCOVES (LENGTH 15–25 UNITS)
  // =========================================================
  const desiredAlcoves = 4 + Math.floor(rng() * 3); // 4..6 alcoves!
  const alcoves: CorridorAlcoveInfo[] = [];
  const candidateAlcoveTs = [0.14, 0.26, 0.38, 0.50, 0.58, 0.84];
  for (let ai = 0; ai < candidateAlcoveTs.length && alcoves.length < desiredAlcoves; ai++) {
    const tCand = candidateAlcoveTs[ai] + (rng() - 0.5) * 0.04;
    if (Math.abs(tCand - vaultAnchor.t) < 0.08) continue;
    const anc = sampleSpineAtT(tCand);
    const lenTotal = 16 + rng() * 8.5; // 16..24.5 units!
    const trySides = rng() < 0.5 ? [1, -1] : [-1, 1];
    let placed = false;

    for (const side of trySides) {
      const bendAng = ((rng() - 0.5) * 36 * Math.PI) / 180;
      const baseAng = Math.atan2(anc.perpZ * side, anc.perpX * side);
      const midAng = baseAng + bendAng * 0.5;
      const tipAng = baseAng + bendAng;

      const midX = anc.x + Math.cos(midAng) * (anc.r + lenTotal * 0.48);
      const midZ = anc.z + Math.sin(midAng) * (anc.r + lenTotal * 0.48);
      const tipX = midX + Math.cos(tipAng) * (lenTotal * 0.52);
      const tipZ = midZ + Math.sin(tipAng) * (lenTotal * 0.52);

      if (isBranchClear(tipX, tipZ, anc.t, 9.5) && isBranchClear(midX, midZ, anc.t, 6.5)) {
        const pocketR = 5.6 + rng() * 1.6;
        segments.push({
          x1: anc.x,
          z1: anc.z,
          x2: midX,
          z2: midZ,
          r1: 4.0,
          r2: 3.4,
          kind: 'alcove',
        });
        segments.push({
          x1: midX,
          z1: midZ,
          x2: tipX,
          z2: tipZ,
          r1: 3.5,
          r2: pocketR,
          kind: 'alcove',
        });
        alcoves.push({
          id: `alcove_${alcoves.length}`,
          entryX: Number(anc.x.toFixed(2)),
          entryZ: Number(anc.z.toFixed(2)),
          tipX: Number(tipX.toFixed(2)),
          tipZ: Number(tipZ.toFixed(2)),
          radius: Number(pocketR.toFixed(2)),
          spineT: anc.t,
        });
        placed = true;
        break;
      }
    }
    if (!placed) continue;
  }

  // =========================================================
  // 4. ONE HARD MULTI-STEP VAULT PUZZLE (3 VARIANTS, RANDOMLY 1 PER LEVEL)
  // =========================================================
  const hardPuzzlePool: PuzzleType[] = ['ancient_obelisks', 'lights_out', 'mirror_beam'];
  const puzzleType = hardPuzzlePool[Math.floor(rng() * hardPuzzlePool.length)];
  const puzPerpX = -vDirZ;
  const puzPerpZ = vDirX;

  let puzzle: WorldPuzzleState;
  if (puzzleType === 'ancient_obelisks') {
    // 3 rotatable Obelisks hidden in 3 side alcoves BEFORE the Vault Gate + Clue Tablet beside the Vault Gate!
    const preVaultAlcoves = alcoves.filter((a) => a.spineT < vaultAnchor.t + 0.04);
    const obeliskSpots: Array<{ x: number; z: number }> = [];
    for (let k = 0; k < 3; k++) {
      if (preVaultAlcoves[k]) {
        obeliskSpots.push({ x: preVaultAlcoves[k].tipX, z: preVaultAlcoves[k].tipZ });
      } else {
        const fallback = sampleSpineAtT(0.18 + k * 0.16);
        obeliskSpots.push({
          x: Number((fallback.x + fallback.perpX * 3.0).toFixed(2)),
          z: Number((fallback.z + fallback.perpZ * 3.0).toFixed(2)),
        });
      }
    }
    const targetSymbols = [
      Math.floor(rng() * 4),
      Math.floor(rng() * 4),
      Math.floor(rng() * 4),
    ];
    const initialSymbols = targetSymbols.map((s) => (s + 1 + Math.floor(rng() * 3)) % 4);
    const clueX = Number((vaultGateX - vDirX * 2.2 + puzPerpX * 4.2).toFixed(2));
    const clueZ = Number((vaultGateZ - vDirZ * 2.2 + puzPerpZ * 4.2).toFixed(2));
    const clueText = `I: ${OBELISK_SYMBOLS[targetSymbols[0]]} • II: ${OBELISK_SYMBOLS[targetSymbols[1]]} • III: ${OBELISK_SYMBOLS[targetSymbols[2]]}`;

    puzzle = {
      id: puzzleId,
      type: 'ancient_obelisks',
      roomIndex: 1,
      x: vaultAnchor.x,
      z: vaultAnchor.z,
      gateX: vaultGateX,
      gateZ: vaultGateZ,
      gateAngle: vaultGateAngle,
      gateHorizontal: Math.abs(vDirZ) >= Math.abs(vDirX),
      solved: false,
      targetSequence: [],
      currentSequence: [],
      statueAngles: [],
      pillarSymbols: initialSymbols,
      targetSymbols,
      cluePos: { x: clueX, z: clueZ },
      clueText,
      nodes: obeliskSpots.map((sp, i) => ({
        x: sp.x,
        z: sp.z,
        hintIndex: i,
        label: `Obelisk ${i === 0 ? 'I' : i === 1 ? 'II' : 'III'}`,
      })),
    };
  } else if (puzzleType === 'lights_out') {
    // 5 coupled Runic Switches (Lights Out) arrayed in front of the Vault Gate — guaranteed solvable!
    const lightsState = [true, true, true, true, true];
    const toggleIdx = (arr: boolean[], idx: number) => {
      arr[idx] = !arr[idx];
      if (idx > 0) arr[idx - 1] = !arr[idx - 1];
      if (idx < arr.length - 1) arr[idx + 1] = !arr[idx + 1];
    };
    const scrambleMoves = 2 + Math.floor(rng() * 3); // 2..4 moves from solved!
    const used = new Set<number>();
    for (let m = 0; m < scrambleMoves; m++) {
      let pick = Math.floor(rng() * 5);
      while (used.has(pick)) pick = (pick + 1) % 5;
      used.add(pick);
      toggleIdx(lightsState, pick);
    }
    if (lightsState.every(Boolean)) toggleIdx(lightsState, 2);

    const nodes = [-2, -1, 0, 1, 2].map((off, i) => ({
      x: Number((vaultAnchor.x + vDirX * 2.2 + puzPerpX * off * 3.1).toFixed(2)),
      z: Number((vaultAnchor.z + vDirZ * 2.2 + puzPerpZ * off * 3.1).toFixed(2)),
      hintIndex: i,
      label: `Runa ${i + 1}`,
    }));

    puzzle = {
      id: puzzleId,
      type: 'lights_out',
      roomIndex: 1,
      x: vaultAnchor.x,
      z: vaultAnchor.z,
      gateX: vaultGateX,
      gateZ: vaultGateZ,
      gateAngle: vaultGateAngle,
      gateHorizontal: Math.abs(vDirZ) >= Math.abs(vDirX),
      solved: false,
      targetSequence: [],
      currentSequence: [],
      statueAngles: [],
      pillarSymbols: [],
      targetSymbols: [],
      lightsState,
      clueText: 'Zapal wszystkie 5 Run jednocześnie (każda przełącza sąsiednie!)',
      nodes,
    };
  } else {
    // mirror_beam: Emitter Crystal + 4 Rotatable Mirror Statues bouncing golden energy beam to Vault Gate Lock!
    const emitterX = Number((vaultAnchor.x - vDirX * 4.2 - puzPerpX * 4.2).toFixed(2));
    const emitterZ = Number((vaultAnchor.z - vDirZ * 4.2 - puzPerpZ * 4.2).toFixed(2));
    const mirrorCoords = [
      { x: vaultAnchor.x - vDirX * 4.2 + puzPerpX * 3.6, z: vaultAnchor.z - vDirZ * 4.2 + puzPerpZ * 3.6 },
      { x: vaultAnchor.x - vDirX * 0.6 + puzPerpX * 4.2, z: vaultAnchor.z - vDirZ * 0.6 + puzPerpZ * 4.2 },
      { x: vaultAnchor.x - vDirX * 0.6 - puzPerpX * 3.8, z: vaultAnchor.z - vDirZ * 0.6 - puzPerpZ * 3.8 },
      { x: vaultAnchor.x + vDirX * 2.6 - puzPerpX * 0.2, z: vaultAnchor.z + vDirZ * 2.6 - puzPerpZ * 0.2 },
    ];
    const targetAngles = [0, 0, 0, 0];
    const statueAngles = targetAngles.map(() => 1 + Math.floor(rng() * 3));

    puzzle = {
      id: puzzleId,
      type: 'mirror_beam',
      roomIndex: 1,
      x: vaultAnchor.x,
      z: vaultAnchor.z,
      gateX: vaultGateX,
      gateZ: vaultGateZ,
      gateAngle: vaultGateAngle,
      gateHorizontal: Math.abs(vDirZ) >= Math.abs(vDirX),
      solved: false,
      targetSequence: [],
      currentSequence: [],
      statueAngles,
      targetAngles,
      pillarSymbols: [],
      targetSymbols: [],
      beamEmitter: { x: emitterX, z: emitterZ },
      beamLock: { x: vaultGateX, z: vaultGateZ },
      clueText: 'Obróć 4 Posągi-Lustra, aby poprowadzić złoty promień prosto w Zamek Wrót!',
      nodes: mirrorCoords.map((mc, i) => ({
        x: Number(mc.x.toFixed(2)),
        z: Number(mc.z.toFixed(2)),
        hintIndex: i,
        label: `Lustro ${i + 1}`,
      })),
    };
  }

  // =========================================================
  // 5. COMPUTE COMPACT 2D WALKABILITY GRID (FOR 3D CANYON WALLS & FOG-OF-WAR MINIMAP)
  // =========================================================
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const seg of segments) {
    const pad = Math.max(seg.r1, seg.r2) + 14;
    minX = Math.min(minX, seg.x1 - pad, seg.x2 - pad);
    maxX = Math.max(maxX, seg.x1 + pad, seg.x2 + pad);
    minZ = Math.min(minZ, seg.z1 - pad, seg.z2 - pad);
    maxZ = Math.max(maxZ, seg.z1 + pad, seg.z2 + pad);
  }
  const gridCellSize = 2.6;
  const gridCols = Math.ceil((maxX - minX) / gridCellSize);
  const gridRows = Math.ceil((maxZ - minZ) / gridCellSize);

  const fieldPartial: CorridorFieldData = {
    mapSeed,
    minX: Number(minX.toFixed(1)),
    maxX: Number(maxX.toFixed(1)),
    minZ: Number(minZ.toFixed(1)),
    maxZ: Number(maxZ.toFixed(1)),
    totalLength: Math.round(totalLength),
    noiseScale: 0.095,
    noiseAmp: 0.85,
    segments,
    spinePoints,
    alcoves,
    vaultCenter: { x: vaultCenterX, z: vaultCenterZ },
    vaultGatePos: { x: vaultGateX, z: vaultGateZ, angle: vaultGateAngle, width: 9.2 },
    arenaCenter: { x: endPt.x, z: endPt.z, radius: arenaRadius },
    gridCellSize,
    gridCols,
    gridRows,
    walkMask: '',
  };

  const emptySolved = new Set<string>();
  const allSolved = new Set<string>([puzzleId]);
  const maskChars: string[] = new Array(gridCols * gridRows);
  for (let row = 0; row < gridRows; row++) {
    const wz = fieldPartial.minZ + (row + 0.5) * gridCellSize;
    for (let col = 0; col < gridCols; col++) {
      const wx = fieldPartial.minX + (col + 0.5) * gridCellSize;
      const dClosed = sampleCorridorSdf(wx, wz, fieldPartial, emptySolved);
      if (dClosed <= 0) {
        maskChars[row * gridCols + col] = '1';
      } else {
        const dOpen = sampleCorridorSdf(wx, wz, fieldPartial, allSolved);
        maskChars[row * gridCols + col] = dOpen <= 0 ? '2' : '0';
      }
    }
  }
  fieldPartial.walkMask = maskChars.join('');

  // =========================================================
  // 6. ENCOUNTER NODES (PACED EVERY ~24 UNITS FOR COMBO FLOW!), CHESTS, SHRINES, PROPS
  // =========================================================
  const rooms: MapRoom[] = [];
  rooms.push({ index: 0, cx: spinePoints[0].x, cz: spinePoints[0].z, w: 18, d: 18, kind: 'spawn' });

  // Place combat encounter zones every ~24 units along the entire 320–420 unit spine!
  let nextEncLen = 28;
  for (let i = 1; i < spinePoints.length - 1; i++) {
    const distSoFar = cumLen[i];
    if (distSoFar >= nextEncLen && spinePoints[i].t < 0.89) {
      const pt = spinePoints[i];
      const isClearing = pt.r >= 7.2;
      rooms.push({
        index: rooms.length,
        cx: pt.x,
        cz: pt.z,
        w: Math.round(pt.r * 1.8),
        d: Math.round(pt.r * 1.8),
        kind: isClearing ? 'shrine' : 'combat',
      });
      nextEncLen = distSoFar + 23 + rng() * 6; // 23..29 units pacing!
    }
  }
  // Vault room marker
  rooms.push({
    index: rooms.length,
    cx: vaultCenterX,
    cz: vaultCenterZ,
    w: 16,
    d: 16,
    kind: 'secret',
  });
  // Final Boss / Exit Arena marker (always last!)
  rooms.push({
    index: rooms.length,
    cx: endPt.x,
    cz: endPt.z,
    w: 34,
    d: 34,
    kind: location.isMainBoss || location.isMiniBoss ? 'boss' : 'exit',
  });

  // Only removable Runic Vault Gate wall (main walls are sculpted organically from corridorField!)
  const walls: MapWall[] = [
    {
      id: `wall_${puzzleId}`,
      x: vaultGateX,
      z: vaultGateZ,
      w: Math.abs(vDirZ) >= Math.abs(vDirX) ? 9.2 : 2.2,
      d: Math.abs(vDirZ) >= Math.abs(vDirX) ? 2.2 : 9.2,
      h: 5.8,
      gateId: puzzleId,
    },
  ];

  // Special Vault Chest (guaranteed 3-4 boosted drops + shards, 2× Mythic/Leg/Boski!) + Alcove Chests
  const variants: Array<'sequence' | 'rotate' | 'symbols'> = ['sequence', 'rotate', 'symbols'];
  const chests: LockedChestState[] = [
    {
      id: `chest_${location.globalIndex}_vault_special`,
      x: vaultCenterX,
      z: vaultCenterZ,
      isSecret: true,
      isVaultChest: true,
      puzzleSeed: Math.floor(rng() * 100000),
      puzzleVariant: variants[Math.floor(rng() * variants.length)],
      opened: false,
    },
  ];
  for (let c = 0; c < Math.min(3, alcoves.length); c++) {
    const al = alcoves[c];
    chests.push({
      id: `chest_${location.globalIndex}_alc_${c}`,
      x: Number((al.tipX + (rng() - 0.5) * 2.5).toFixed(1)),
      z: Number((al.tipZ + (rng() - 0.5) * 2.5).toFixed(1)),
      isSecret: false,
      puzzleSeed: Math.floor(rng() * 100000),
      puzzleVariant: variants[(c + Math.floor(rng() * 3)) % 3],
      opened: false,
    });
  }

  // 2 Healing Shrines placed nicely at ~35% & ~72% along spine clearings
  const sh1 = sampleSpineAtT(0.35);
  const sh2 = sampleSpineAtT(0.74);
  const shrines = [
    { id: `shrine_${location.globalIndex}_0`, x: Number((sh1.x + sh1.perpX * 2.8).toFixed(1)), z: Number((sh1.z + sh1.perpZ * 2.8).toFixed(1)), used: false },
    { id: `shrine_${location.globalIndex}_1`, x: Number((sh2.x - sh2.perpX * 2.8).toFixed(1)), z: Number((sh2.z - sh2.perpZ * 2.8).toFixed(1)), used: false },
  ];

  // Cursed Altar in a side alcove (Risk & Reward!)
  let obelisk: WaveObeliskState | undefined;
  const altarAlcove = alcoves[alcoves.length - 1];
  if (altarAlcove && (location.mutatorId === 'wave_obelisk' || rng() < 0.65)) {
    obelisk = {
      id: `obelisk_${location.globalIndex}`,
      x: altarAlcove.tipX,
      z: altarAlcove.tipZ,
      state: 'idle',
      currentWave: 0,
      maxWaves: 3,
    };
  }

  // Organic Decorative Props + Wall Torches on Bends + Act Pillars in Wide Clearings!
  const props: MapProp[] = [];
  for (let i = 2; i < spinePoints.length - 3; i += 2) {
    const pt = spinePoints[i];
    const prev = spinePoints[i - 1];
    const next = spinePoints[i + 1];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    const px = -tz / tl;
    const pz = tx / tl;

    // Place decorative props tucked neatly along canyon walls (never blocking narrow chokes!)
    if (pt.r >= 5.2 && rng() < 0.68) {
      const side = rng() < 0.5 ? 1 : -1;
      const offset = pt.r - 1.65;
      const kind = theme.propKinds[Math.floor(rng() * theme.propKinds.length)];
      props.push({
        x: Number((pt.x + px * side * offset).toFixed(1)),
        z: Number((pt.z + pz * side * offset).toFixed(1)),
        kind,
        scale: 0.85 + rng() * 0.45,
        rotY: rng() * Math.PI * 2,
      });
    }
    // Wall torches on bends for warm atmospheric lighting!
    if (i % 5 === 0) {
      const side = (i / 5) % 2 === 0 ? 1 : -1;
      const offset = Math.max(2.6, pt.r - 0.9);
      props.push({
        x: Number((pt.x + px * side * offset).toFixed(1)),
        z: Number((pt.z + pz * side * offset).toFixed(1)),
        kind: 'torch',
        scale: 1.0,
        rotY: rng() * Math.PI * 2,
      });
    }
  }

  const exitPortal = {
    x: Number((endPt.x + (endPt.x - spinePoints[spinePoints.length - 3].x) * 0.55).toFixed(1)),
    z: Number((endPt.z + (endPt.z - spinePoints[spinePoints.length - 3].z) * 0.55).toFixed(1)),
  };

  return {
    location,
    mapSeed,
    width: Math.round(maxX - minX),
    height: Math.round(maxZ - minZ),
    spawn: { x: spinePoints[0].x, z: spinePoints[0].z },
    exitPortal,
    corridorField: fieldPartial,
    rooms,
    walls,
    props,
    shrines,
    obelisk,
    puzzles: [puzzle],
    secrets: [],
    chests,
  };
}

/**
 * Smooth Curved Wall Sliding collision resolver:
 * - For organic corridors (corridorField present): evaluates continuous SDF + gradient normal push
 *   so characters & Dashes slide smoothly along curved/diagonal canyon walls with ZERO snagging!
 * - For Camp 3D (no corridorField): resolves circle vs AABB walls.
 */
export function resolveWallCollisions(
  x: number,
  z: number,
  radius: number,
  walls: MapWall[],
  solvedGateIds: Set<string>,
  revealedSecretIds: Set<string>,
  corridorField?: CorridorFieldData
): { x: number; z: number } {
  let nx = x;
  let nz = z;

  if (corridorField) {
    const eps = 0.28;
    for (let iter = 0; iter < 3; iter++) {
      const d = sampleCorridorSdf(nx, nz, corridorField, solvedGateIds) + radius;
      if (d <= 0) break;
      const gx =
        sampleCorridorSdf(nx + eps, nz, corridorField, solvedGateIds) -
        sampleCorridorSdf(nx - eps, nz, corridorField, solvedGateIds);
      const gz =
        sampleCorridorSdf(nx, nz + eps, corridorField, solvedGateIds) -
        sampleCorridorSdf(nx, nz - eps, corridorField, solvedGateIds);
      const gLen = Math.hypot(gx, gz);
      if (gLen > 1e-5) {
        nx -= (gx / gLen) * (d + 0.04);
        nz -= (gz / gLen) * (d + 0.04);
      } else {
        break;
      }
    }
    return { x: nx, z: nz };
  }

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

/**
 * Swept movement with buttery-smooth curved wall sliding:
 * Spacebar Dash, Warrior Charge, Elf Backflip, and Knockback slide cleanly along curved canyon walls
 * and NEVER clip or tunnel through rock!
 */
export function moveWithWallSweep(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  radius: number,
  walls: MapWall[],
  solvedGateIds: Set<string>,
  revealedSecretIds: Set<string>,
  corridorField?: CorridorFieldData
): { x: number; z: number } {
  const dx = targetX - startX;
  const dz = targetZ - startZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) {
    return resolveWallCollisions(startX, startZ, radius, walls, solvedGateIds, revealedSecretIds, corridorField);
  }
  const stepSize = 0.45;
  const steps = Math.max(1, Math.ceil(dist / stepSize));
  let cx = startX;
  let cz = startZ;
  for (let i = 1; i <= steps; i++) {
    const nextX = cx + dx / steps;
    const nextZ = cz + dz / steps;
    const res = resolveWallCollisions(nextX, nextZ, radius, walls, solvedGateIds, revealedSecretIds, corridorField);
    cx = res.x;
    cz = res.z;
    if (!corridorField) {
      const pushed = Math.hypot(res.x - nextX, res.z - nextZ);
      if (pushed > stepSize * 0.65) {
        break;
      }
    }
  }
  return { x: cx, z: cz };
}

function segmentIntersectsWallT(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  w: MapWall,
  pad = 0.05
): number | null {
  const minX = w.x - w.w / 2 - pad;
  const maxX = w.x + w.w / 2 + pad;
  const minZ = w.z - w.d / 2 - pad;
  const maxZ = w.z + w.d / 2 + pad;

  const dx = x2 - x1;
  const dz = z2 - z1;

  let tmin = 0;
  let tmax = 1;

  if (Math.abs(dx) < 1e-8) {
    if (x1 < minX || x1 > maxX) return null;
  } else {
    let tx1 = (minX - x1) / dx;
    let tx2 = (maxX - x1) / dx;
    if (tx1 > tx2) {
      const tmp = tx1;
      tx1 = tx2;
      tx2 = tmp;
    }
    tmin = Math.max(tmin, tx1);
    tmax = Math.min(tmax, tx2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-8) {
    if (z1 < minZ || z1 > maxZ) return null;
  } else {
    let tz1 = (minZ - z1) / dz;
    let tz2 = (maxZ - z1) / dz;
    if (tz1 > tz2) {
      const tmp = tz1;
      tz1 = tz2;
      tz2 = tmp;
    }
    tmin = Math.max(tmin, tz1);
    tmax = Math.min(tmax, tz2);
    if (tmin > tmax) return null;
  }

  return tmin >= 0 && tmin <= 1 ? tmin : null;
}

export function hasLineOfSight(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  walls: MapWall[],
  solvedGateIds: Set<string>,
  revealedSecretIds: Set<string>,
  corridorField?: CorridorFieldData
): boolean {
  if (corridorField) {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(2, Math.ceil(dist / 1.25));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      if (sampleCorridorSdf(px, pz, corridorField, solvedGateIds) > 0.25) {
        return false;
      }
    }
    return true;
  }

  for (const w of walls) {
    if (w.gateId && solvedGateIds.has(w.gateId)) continue;
    if (w.secretId && revealedSecretIds.has(w.secretId)) continue;
    if (segmentIntersectsWallT(x1, z1, x2, z2, w, 0.0) !== null) {
      return false;
    }
  }
  return true;
}

export function clipPointToLineOfSight(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  walls: MapWall[],
  solvedGateIds: Set<string>,
  revealedSecretIds: Set<string>,
  corridorField?: CorridorFieldData
): { x: number; z: number; blocked: boolean } {
  if (corridorField) {
    const dist = Math.hypot(targetX - startX, targetZ - startZ);
    const steps = Math.max(2, Math.ceil(dist / 1.0));
    let lastGoodX = startX;
    let lastGoodZ = startZ;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = startX + (targetX - startX) * t;
      const pz = startZ + (targetZ - startZ) * t;
      if (sampleCorridorSdf(px, pz, corridorField, solvedGateIds) > 0.1) {
        return { x: lastGoodX, z: lastGoodZ, blocked: true };
      }
      lastGoodX = px;
      lastGoodZ = pz;
    }
    return { x: targetX, z: targetZ, blocked: false };
  }

  let bestT = 1;
  let blocked = false;
  for (const w of walls) {
    if (w.gateId && solvedGateIds.has(w.gateId)) continue;
    if (w.secretId && revealedSecretIds.has(w.secretId)) continue;
    const t = segmentIntersectsWallT(startX, startZ, targetX, targetZ, w, 0.25);
    if (t !== null && t < bestT) {
      bestT = t;
      blocked = true;
    }
  }
  if (!blocked) return { x: targetX, z: targetZ, blocked: false };
  const safeT = Math.max(0, bestT - 0.03);
  return {
    x: startX + (targetX - startX) * safeT,
    z: startZ + (targetZ - startZ) * safeT,
    blocked: true,
  };
}

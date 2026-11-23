import type { ClassId } from './types.js';

// ==========================================
// 1. ELEMENTAL PATRONS, BOONS & DUO BOONS (HADES STYLE)
// ==========================================
export type ElementalPatron = 'ogien' | 'mroz' | 'blyskawica' | 'cien';
export type BoonRarity = 'zwykly' | 'epicki' | 'heroiczny';

export interface ElementalBoonDef {
  id: string;
  patron: ElementalPatron;
  slot: 'dash' | 'attack' | 'skill';
  name: string;
  icon: string;
  color: string;
  description: (rarity: BoonRarity) => string;
}

export interface DuoBoonDef {
  id: string;
  patrons: [ElementalPatron, ElementalPatron];
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const PATRON_META: Record<
  ElementalPatron,
  { name: string; icon: string; color: string; title: string }
> = {
  ogien: { name: 'Ogień', icon: '🔥', color: '#f97316', title: 'Patron Płomieni' },
  mroz: { name: 'Mróz', icon: '❄️', color: '#38bdf8', title: 'Patron Zimy' },
  blyskawica: { name: 'Błyskawica', icon: '⚡', color: '#fde047', title: 'Patron Burzy' },
  cien: { name: 'Cień', icon: '🌑', color: '#c084fc', title: 'Patron Pustki' },
};

export const BOON_RARITY_META: Record<
  BoonRarity,
  { label: string; color: string; mult: number }
> = {
  zwykly: { label: 'Zwykły', color: '#94a3b8', mult: 1.0 },
  epicki: { label: 'Epicki', color: '#c084fc', mult: 1.45 },
  heroiczny: { label: 'Heroiczny', color: '#fb7185', mult: 1.95 },
};

export const ELEMENTAL_BOONS: Record<string, ElementalBoonDef> = {
  // OGIEŃ
  ogien_dash: {
    id: 'ogien_dash',
    patron: 'ogien',
    slot: 'dash',
    name: 'Ślad Płomieni',
    icon: '🔥',
    color: '#f97316',
    description: (r) =>
      `Unik [Spacja] zostawia wybuchowy ślad ognia zadający ${Math.round(55 * BOON_RARITY_META[r].mult)}% obrażeń AD/AP w obszarze.`,
  },
  ogien_attack: {
    id: 'ogien_attack',
    patron: 'ogien',
    slot: 'attack',
    name: 'Żar Ostrza',
    icon: '☄️',
    color: '#fb923c',
    description: (r) =>
      `Ataki podstawowe zadają +${Math.round(18 * BOON_RARITY_META[r].mult)}% dodatkowych obrażeń ognia i podpalają cel.`,
  },
  ogien_skill: {
    id: 'ogien_skill',
    patron: 'ogien',
    slot: 'skill',
    name: 'Erupcja Gniewu',
    icon: '🌋',
    color: '#ef4444',
    description: (r) =>
      `Umiejętności wywołują falę ognia (+${Math.round(24 * BOON_RARITY_META[r].mult)}% DMG AOE) i +15% szybsze ładowanie Ultimate.`,
  },

  // MRÓZ
  mroz_dash: {
    id: 'mroz_dash',
    patron: 'mroz',
    slot: 'dash',
    name: 'Lodowy Poślizg',
    icon: '❄️',
    color: '#38bdf8',
    description: (r) =>
      `Unik [Spacja] uwalnia falę mrozu spowalniającą wrogów o 45% i zadającą ${Math.round(45 * BOON_RARITY_META[r].mult)}% DMG.`,
  },
  mroz_attack: {
    id: 'mroz_attack',
    patron: 'mroz',
    slot: 'attack',
    name: 'Kryształowe Cięcie',
    icon: '🧊',
    color: '#7dd3fc',
    description: (r) =>
      `Trafienia krytyczne wywołują Lodową Nowę AOE (${Math.round(40 * BOON_RARITY_META[r].mult)}% DMG) i spowalniają wrogów.`,
  },
  mroz_skill: {
    id: 'mroz_skill',
    patron: 'mroz',
    slot: 'skill',
    name: 'Zimowy Pancerz',
    icon: '🛡️',
    color: '#0ea5e9',
    description: (r) =>
      `Użycie umiejętności daje tarczę ${Math.round(6 * BOON_RARITY_META[r].mult)}% Max HP i +${Math.round(14 * BOON_RARITY_META[r].mult)}% obrażeń przeciw spowolnionym.`,
  },

  // BŁYSKAWICA
  blyskawica_dash: {
    id: 'blyskawica_dash',
    patron: 'blyskawica',
    slot: 'dash',
    name: 'Skok Pioruna',
    icon: '⚡',
    color: '#fde047',
    description: (r) =>
      `Unik [Spacja] razi najbliższego wroga piorunem (${Math.round(60 * BOON_RARITY_META[r].mult)}% DMG) i skraca CD Uniku o 20%.`,
  },
  blyskawica_attack: {
    id: 'blyskawica_attack',
    patron: 'blyskawica',
    slot: 'attack',
    name: 'Łańcuch Piorunów',
    icon: '🌩️',
    color: '#facc15',
    description: (r) =>
      `Co 2. atak podstawowy przeskakuje błyskawicą na 2 pobliskich wrogów za ${Math.round(42 * BOON_RARITY_META[r].mult)}% DMG.`,
  },
  blyskawica_skill: {
    id: 'blyskawica_skill',
    patron: 'blyskawica',
    slot: 'skill',
    name: 'Przeciążenie Burzy',
    icon: '🔋',
    color: '#eab308',
    description: (r) =>
      `+${Math.round(14 * BOON_RARITY_META[r].mult)}% szybkości ataku i +${Math.round(12 * BOON_RARITY_META[r].mult)}% szansy na kryt po użyciu umiejętności (4s).`,
  },

  // CIEŃ
  cien_dash: {
    id: 'cien_dash',
    patron: 'cien',
    slot: 'dash',
    name: 'Krok w Mrok',
    icon: '🌑',
    color: '#c084fc',
    description: (r) =>
      `Atak po Uniku (Dash-Strike) zadaje +${Math.round(45 * BOON_RARITY_META[r].mult)}% obrażeń i ma +30% szansy na kryt.`,
  },
  cien_attack: {
    id: 'cien_attack',
    patron: 'cien',
    slot: 'attack',
    name: 'Kosa Cienia',
    icon: '🗡️',
    color: '#a855f7',
    description: (r) =>
      `Ciosy w plecy (Backstab) zadają dodatkowe +${Math.round(25 * BOON_RARITY_META[r].mult)}% obrażeń i leczą 3% HP przy zabójstwie.`,
  },
  cien_skill: {
    id: 'cien_skill',
    patron: 'cien',
    slot: 'skill',
    name: 'Piętno Pustki',
    icon: '👁️',
    color: '#e879f9',
    description: (r) =>
      `Zabici wrogowie wybuchają energią cienia (${Math.round(50 * BOON_RARITY_META[r].mult)}% DMG AOE) i dają +25% Esencji Chaosu.`,
  },
};

export const ELEMENTAL_BOON_LIST = Object.values(ELEMENTAL_BOONS);

export const DUO_BOONS: Record<string, DuoBoonDef> = {
  duo_thermal_shock: {
    id: 'duo_thermal_shock',
    patrons: ['ogien', 'mroz'],
    name: 'DUO: Szok Termiczny',
    icon: '🔥❄️',
    color: '#fb7185',
    description:
      'Trafienie spowolnionego/zamrożonego wroga wywołuje Szok Termiczny (+35% DMG + eksplozja pary AOE)!',
  },
  duo_void_storm: {
    id: 'duo_void_storm',
    patrons: ['blyskawica', 'cien'],
    name: 'DUO: Burza Pustki',
    icon: '⚡🌑',
    color: '#e879f9',
    description:
      'Ciosy w plecy oraz Dash-Strike zawsze wywołują łańcuch 3 fioletowych piorunów (65% DMG)!',
  },
  duo_plasma_flame: {
    id: 'duo_plasma_flame',
    patrons: ['ogien', 'blyskawica'],
    name: 'DUO: Plazma Burzy',
    icon: '🔥⚡',
    color: '#fde047',
    description:
      'Każdy 3. cios komba (Finisher) i każde użycie Ultimate przywołuje 3 wybuchowe pioruny ognia!',
  },
  duo_blood_blizzard: {
    id: 'duo_blood_blizzard',
    patrons: ['mroz', 'cien'],
    name: 'DUO: Krwawa Zamieć',
    icon: '❄️🌑',
    color: '#38bdf8',
    description:
      'Trafienia krytyczne zamrażają pancerz elit (2× DMG w Pancerz i Stagger) i leczą 4% Max HP!',
  },
  duo_arctic_thunder: {
    id: 'duo_arctic_thunder',
    patrons: ['mroz', 'blyskawica'],
    name: 'DUO: Arktyczny Grom',
    icon: '❄️⚡',
    color: '#67e8f9',
    description:
      'Łańcuchy błyskawic zadają +40% DMG spowolnionym wrogom i wydłużają ogłuszenie o +1s!',
  },
  duo_ash_seal: {
    id: 'duo_ash_seal',
    patrons: ['ogien', 'cien'],
    name: 'DUO: Pieczęć Popiołów',
    icon: '🔥🌑',
    color: '#fb923c',
    description:
      'Zderzenie wroga ze ścianą (Wall Slam) wywołuje podwójną eksplozję ognia i cienia (+100% DMG)!',
  },
};

export const DUO_BOON_LIST = Object.values(DUO_BOONS);

// ==========================================
// 2. SKILL EVOLUTIONS (KRYSZTAŁ MISTRZOSTWA — DAEDALUS HAMMER)
// ==========================================
export interface SkillEvolutionDef {
  id: string;
  classId: ClassId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const SKILL_EVOLUTIONS: Record<string, SkillEvolutionDef> = {
  // WOJOWNIK
  evo_woj_vortex: {
    id: 'evo_woj_vortex',
    classId: 'wojownik',
    name: 'Wir Próżni',
    icon: '🌪️',
    color: '#f97316',
    description: 'Wir Ostrzy [2] zasysa wrogów do środka i zadaje +30% obrażeń!',
  },
  evo_woj_titan: {
    id: 'evo_woj_titan',
    classId: 'wojownik',
    name: 'Ostrze Tytana',
    icon: '⚔️',
    color: '#fbbf24',
    description: '3. cios komba (Finisher) ma +45% zasięgu, +40% DMG i potężny Wall Slam!',
  },
  evo_woj_charge: {
    id: 'evo_woj_charge',
    classId: 'wojownik',
    name: 'Błyskawiczna Szarża',
    icon: '💨',
    color: '#ef4444',
    description: 'Szarża [3] ma o 35% krótszy cooldown i zadaje 2× obrażenia Pancerzowi i Stagger!',
  },

  // CZARNOKSIĘŻNIK
  evo_czar_meteor: {
    id: 'evo_czar_meteor',
    classId: 'czarnoksieznik',
    name: 'Deszcz Meteorów',
    icon: '☄️',
    color: '#a855f7',
    description: 'Meteor Chaosu [2] rozpada się na 2 dodatkowe mini-meteory w okolicy!',
  },
  evo_czar_orb: {
    id: 'evo_czar_orb',
    classId: 'czarnoksieznik',
    name: 'Mroczna Supernowa',
    icon: '🔮',
    color: '#e879f9',
    description: 'Kula Cienia [1] wybucha na dużym obszarze (+35% DMG) i nakłada podwójną Klątwę!',
  },
  evo_czar_reaper: {
    id: 'evo_czar_reaper',
    classId: 'czarnoksieznik',
    name: 'Żniwiarz Dusz',
    icon: '💀',
    color: '#c084fc',
    description: 'Wyssanie Duszy [3] leczy o 50% więcej i ładuje +25 Gniewu Chaosu!',
  },

  // ELF
  evo_elf_ricochet: {
    id: 'evo_elf_ricochet',
    classId: 'elf',
    name: 'Odbijające Strzały',
    icon: '🏹',
    color: '#22c55e',
    description: 'Ataki podstawowe i Salwa [1] rykoszetują na dodatkowego wroga za 70% DMG!',
  },
  evo_elf_wind: {
    id: 'evo_elf_wind',
    classId: 'elf',
    name: 'Huragan Ostrzy',
    icon: '🍃',
    color: '#4ade80',
    description: 'Ostrze Wiatru [3] ma ogromny odrzut (Wall Slam!) i zadaje +35% DMG!',
  },
  evo_elf_trap: {
    id: 'evo_elf_trap',
    classId: 'elf',
    name: 'Zabójczy Odskok',
    icon: '💥',
    color: '#fde047',
    description: 'Salwa w Odskoku [2] i Dash-Strike mają +40% szansy na trafienie krytyczne!',
  },

  // KRASNOLUD
  evo_kras_seismic: {
    id: 'evo_kras_seismic',
    classId: 'krasnolud',
    name: 'Młot Sejsmiczny',
    icon: '🔨',
    color: '#f59e0b',
    description: 'Uderzenie Młotem [1] ma +50% odrzutu (Wall Slam!) i bije podwójną falą!',
  },
  evo_kras_quake: {
    id: 'evo_kras_quake',
    classId: 'krasnolud',
    name: 'Fala Tektoniczna',
    icon: '🌋',
    color: '#fb923c',
    description: 'Trzęsienie Ziemi [3] ma +35% promienia i zadaje +60% obrażeń Stagger!',
  },
  evo_kras_colossus: {
    id: 'evo_kras_colossus',
    classId: 'krasnolud',
    name: 'Kamienny Kolos',
    icon: '🪨',
    color: '#38bdf8',
    description: 'Kamienna Skóra [2] daje +30% większą tarczę i odbija falę obrażeń wokół siebie!',
  },

  // WRÓŻKA
  evo_wro_prism: {
    id: 'evo_wro_prism',
    classId: 'wrozka',
    name: 'Pryzmat Światła',
    icon: '✨',
    color: '#f472b6',
    description: 'Promień Światła [1] i 3. cios komba rozszczepiają się na dodatkowy cel!',
  },
  evo_wro_sanctuary: {
    id: 'evo_wro_sanctuary',
    classId: 'wrozka',
    name: 'Świetliste Sanktuarium',
    icon: '🪽',
    color: '#38bdf8',
    description: 'Fala Leczenia [2] nakłada dodatkowo tarczę 20% Max HP całej drużynie!',
  },
  evo_wro_starburst: {
    id: 'evo_wro_starburst',
    classId: 'wrozka',
    name: 'Skrzydła Gwiazd',
    icon: '🌟',
    color: '#fde047',
    description: 'Bariera Światła [3] wybucha wokół sojuszników zadając obrażenia i ogłuszając moby!',
  },
};

export function getEvolutionsForClass(classId: ClassId): SkillEvolutionDef[] {
  return Object.values(SKILL_EVOLUTIONS).filter((e) => e.classId === classId);
}

// ==========================================
// 3. CLASS ULTIMATES (GNIEW CHAOSU — [Q] 50% / 100%)
// ==========================================
export interface ClassUltimateDef {
  name: string;
  icon: string;
  color: string;
  shortDesc: string;
}

export const CLASS_ULTIMATES: Record<ClassId, ClassUltimateDef> = {
  wojownik: {
    name: 'GNIEW BERSERKERA',
    icon: '⚔️',
    color: '#ef4444',
    shortDesc: 'Potężna fala cięć 360° + odrzut o ściany + nieśmiertelność 1.5s',
  },
  czarnoksieznik: {
    name: 'KATAKLIZM OTCHŁANI',
    icon: '☄️',
    color: '#a855f7',
    shortDesc: 'Supernowa pustki nakładająca Klątwę i masywny burst AP AOE',
  },
  elf: {
    name: 'DESZCZ TYSIĄCA STRZAŁ',
    icon: '🏹',
    color: '#22c55e',
    shortDesc: 'Gwarantowana krytyczna nawałnica strzał z przebiciem pancerza',
  },
  krasnolud: {
    name: 'ROZŁAM KONTYNENTU',
    icon: '🔨',
    color: '#f59e0b',
    shortDesc: 'Gigantyczny wstrząs rozbijający Pancerz, Stagger i odrzucający wrogów',
  },
  wrozka: {
    name: 'SUPERNOWA ŚWIATŁA',
    icon: '🌟',
    color: '#f472b6',
    shortDesc: 'Pełne leczenie + tarcza drużyny + eksplozja światła wokół wszystkich',
  },
};

// ==========================================
// 4. PACT OF CHAOS (HEAT SYSTEM A LA HADES)
// ==========================================
export interface PactCurseDef {
  id: string;
  name: string;
  icon: string;
  heat: number;
  description: string;
  color: string;
}

export const PACT_CURSES: PactCurseDef[] = [
  {
    id: 'fast_foes',
    name: 'Furia Szybkości',
    icon: '💨',
    heat: 2,
    description: 'Wrogowie poruszają się o +20% szybciej.',
    color: '#fb923c',
  },
  {
    id: 'empowered_boss',
    name: 'Korona Chaosu',
    icon: '👑',
    heat: 3,
    description: 'Bossowie mają +25% HP i używają umiejętności o 20% częściej.',
    color: '#f43f5e',
  },
  {
    id: 'armored_hordes',
    name: 'Żelazna Horda',
    icon: '🛡️',
    heat: 2,
    description: 'Elity mają +50% twardszy Pancerz (Armor Bar).',
    color: '#eab308',
  },
  {
    id: 'deadly_traps',
    name: 'Zabójcze Pułapki',
    icon: '☠️',
    heat: 2,
    description: 'Strefy bossów i pułapki środowiskowe zadają +35% obrażeń.',
    color: '#a855f7',
  },
  {
    id: 'chaos_timer',
    name: 'Klepsydra Zagłady',
    icon: '⏳',
    heat: 3,
    description: 'Limit 4:00 min na lokację/piętro — po czasie wrogowie wpadają w szał (+40% DMG).',
    color: '#38bdf8',
  },
  {
    id: 'blood_tax',
    name: 'Podatek Krwi',
    icon: '🩸',
    heat: 2,
    description: 'Mikstury Zdrowia leczą o 30% mniej HP.',
    color: '#e11d48',
  },
];

export const PACT_CURSE_BY_ID: Record<string, PactCurseDef> = Object.fromEntries(
  PACT_CURSES.map((c) => [c.id, c])
);

export function getPactRewardSummary(activeCurseIds: string[]): {
  totalHeat: number;
  lootLuckMult: number;
  shardBonusPct: number;
  xpBonusPct: number;
} {
  let totalHeat = 0;
  for (const id of activeCurseIds) {
    const def = PACT_CURSE_BY_ID[id];
    if (def) totalHeat += def.heat;
  }
  return {
    totalHeat,
    lootLuckMult: 1 + totalHeat * 0.08, // up to +112% loot luck at max Heat 14!
    shardBonusPct: totalHeat * 10,
    xpBonusPct: totalHeat * 8,
  };
}

// ==========================================
// 5. WANDERING MERCHANT (CHARON) & BRANCHING PORTALS
// ==========================================
export type PortalRewardKind = 'shards' | 'boon' | 'evolution' | 'elite_vault' | 'merchant';

export const PORTAL_REWARD_META: Record<
  PortalRewardKind,
  { label: string; shortLabel: string; icon: string; color: string; desc: string }
> = {
  shards: {
    label: 'Skarbiec Odłamków',
    shortLabel: '💎 Odłamki',
    icon: '💎',
    color: '#38bdf8',
    desc: 'Gwarantowany pakiet odłamków na start kolejnego etapu!',
  },
  boon: {
    label: 'Ołtarz Żywiołów',
    shortLabel: '⚡ Dar Żywiołu',
    icon: '⚡',
    color: '#fde047',
    desc: 'Wybór 1 z 3 Darów Żywiołów lub potężnego DUO-Daru!',
  },
  evolution: {
    label: 'Kuźnia Mistrzostwa',
    shortLabel: '🔨 Kryształ Mistrz.',
    icon: '🔨',
    color: '#f97316',
    desc: 'Wybór 1 z 3 Modyfikatorów Umiejętności dla Twojej klasy!',
  },
  elite_vault: {
    label: 'Elitarny Skarbiec',
    shortLabel: '💀 2× Drop',
    icon: '💀',
    color: '#f43f5e',
    desc: 'Trudniejsi wrogowie, ale podwójna szansa na Legendarny/Boski łup!',
  },
  merchant: {
    label: 'Przystań Charona',
    shortLabel: '🛶 Kupiec Charon',
    icon: '🛶',
    color: '#c084fc',
    desc: 'Gwarantowany Wędrowny Kupiec z Darami i Kryształem Mistrzostwa!',
  },
};

export interface CharonShopItemDef {
  id: 'elixir' | 'elemental_boon' | 'skill_evolution' | 'mystery_chest' | 'upgrade_boon';
  name: string;
  icon: string;
  cost: number;
  color: string;
  description: string;
}

export const CHARON_SHOP_ITEMS: CharonShopItemDef[] = [
  {
    id: 'elixir',
    name: 'Eliksir Przewoźnika',
    icon: '🧪',
    cost: 40,
    color: '#4ade80',
    description: 'Natychmiast przywraca 100% HP, 100% Many oraz daje tarczę 30% Max HP!',
  },
  {
    id: 'elemental_boon',
    name: 'Pieczęć Patrona',
    icon: '⚡',
    cost: 75,
    color: '#fde047',
    description: 'Otwiera wybór 1 z 3 Darów Żywiołów (lub DUO-Daru)!',
  },
  {
    id: 'skill_evolution',
    name: 'Kryształ Mistrzostwa',
    icon: '🔨',
    cost: 110,
    color: '#f97316',
    description: 'Wybierz 1 z 3 unikalnych modyfikacji umiejętności Twojej klasy!',
  },
  {
    id: 'mystery_chest',
    name: 'Tajemnicza Skrzynia Charona',
    icon: '🎁',
    cost: 90,
    color: '#c084fc',
    description: 'Wyrzuca gwarantowany przedmiot Mityczny, Legendarny lub Boski!',
  },
  {
    id: 'upgrade_boon',
    name: 'Wzmocnienie Daru',
    icon: '✨',
    cost: 65,
    color: '#fb7185',
    description: 'Podnosi rzadkość losowego posiadanego Daru Żywiołu (Zwykły ➔ Epicki ➔ Heroiczny)!',
  },
];

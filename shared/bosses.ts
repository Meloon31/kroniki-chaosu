import type { ActNumber, RuneId } from './types.js';

export interface BossAbilityDef {
  id: string;
  name: string;
  description: string;
  telegraphMs: number;
  cooldownMs: number;
  baseWeight: number;
  preferredMinDist?: number;
  preferredMaxDist?: number;
  hpThresholdMax?: number;
  color: string;
}

export interface MainBossDef {
  id: RuneId;
  act: ActNumber;
  name: string;
  title: string;
  visualSummary: string;
  recommendedGear: string;
  requiredPower: number;   // Combat power threshold matching Act gear gate
  baseHp: number;
  baseDamage: number;
  bossArmor: number;       // Reduces incoming damage smoothly
  armorPenPct: number;     // Pierces % of player DEF so high DEF never equals immortality
  skillMaxHpPct: number;   // Extra % of player Max HP dealt on telegraphed skills (prevents immortality!)
  radius: number;
  speed: number;
  abilities: BossAbilityDef[];
}

export const MAIN_BOSSES: Record<RuneId, MainBossDef> = {
  malakor: {
    id: 'malakor',
    act: 1,
    name: 'Malakor, Władca Katakumb',
    title: 'Boss Główny Aktu 1',
    visualSummary: 'Potężny kościany rycerz w pękniętej koronie, dzierżący dwuręczny młot płonący zielonym, komiksowym ogniem.',
    recommendedGear: 'Min. Pełny Normalny (+0 do +3), 0 Run',
    requiredPower: 420,
    baseHp: 52000,
    baseDamage: 185,
    bossArmor: 65,
    armorPenPct: 12,
    skillMaxHpPct: 8,
    radius: 2.35,
    speed: 4.3,
    abilities: [
      {
        id: 'fala_kosci',
        name: 'Fala Kości',
        description: 'Wypuszcza linię ostrych kolców kości w stronę losowego gracza.',
        telegraphMs: 980,
        cooldownMs: 5500,
        baseWeight: 32,
        preferredMinDist: 4,
        color: '#22a355',
      },
      {
        id: 'skok_z_uderzeniem',
        name: 'Skok z Uderzeniem',
        description: 'Wyskakuje w powietrze i spada na wybranego członka drużyny (duże AOE).',
        telegraphMs: 1180,
        cooldownMs: 7500,
        baseWeight: 28,
        preferredMinDist: 5,
        color: '#16a34a',
      },
      {
        id: 'zew_krypty',
        name: 'Zew Krypty',
        description: 'Przywołuje grupę szkieletów skalującą się z rozmiarem party.',
        telegraphMs: 1200,
        cooldownMs: 15000,
        baseWeight: 20,
        hpThresholdMax: 0.9,
        color: '#4ade80',
      },
      {
        id: 'klatwa_cienia',
        name: 'Klątwa Cienia',
        description: 'Rzuca obszarowe strefy spowolnienia i cienia pod nogi graczy.',
        telegraphMs: 920,
        cooldownMs: 8500,
        baseWeight: 24,
        color: '#7c3aed',
      },
    ],
  },

  azirath: {
    id: 'azirath',
    act: 2,
    name: 'Azirath, Pożeracz Wydm',
    title: 'Boss Główny Aktu 2',
    visualSummary: 'Gigantyczny, opancerzony w złoto skorpion-faraon otoczony wirującymi piaskami i niebieskimi hieroglifami.',
    recommendedGear: 'Min. Pełny Mityczny +7',
    requiredPower: 1820,
    baseHp: 235000,
    baseDamage: 740,
    bossArmor: 175,
    armorPenPct: 22,
    skillMaxHpPct: 10,
    radius: 2.65,
    speed: 4.8,
    abilities: [
      {
        id: 'nurkowanie_w_piasku',
        name: 'Nurkowanie w Piasku',
        description: 'Znika pod piaskiem i wyskakuje od spodu pod losowym graczem.',
        telegraphMs: 1320,
        cooldownMs: 8500,
        baseWeight: 28,
        preferredMinDist: 4,
        color: '#d97706',
      },
      {
        id: 'sloneczny_promien',
        name: 'Słoneczny Promień',
        description: 'Obraca się wokół własnej osi strzelając palącym laserem słonecznym.',
        telegraphMs: 1120,
        cooldownMs: 11500,
        baseWeight: 24,
        color: '#eab308',
      },
      {
        id: 'burza_piaskowa',
        name: 'Burza Piaskowa',
        description: 'Tworzy wirujące 3D tornada piasku przemieszczające się losowo po arenie.',
        telegraphMs: 1000,
        cooldownMs: 11500,
        baseWeight: 24,
        color: '#0284c7',
      },
      {
        id: 'uderzenie_zadlem',
        name: 'Uderzenie Żądłem',
        description: 'Szybki, potężny cios żądłem w tanka lub najbliższego gracza (nakłada truciznę).',
        telegraphMs: 780,
        cooldownMs: 5200,
        baseWeight: 32,
        preferredMaxDist: 7.5,
        color: '#65a30d',
      },
    ],
  },

  sylvara: {
    id: 'sylvara',
    act: 3,
    name: 'Sylvara, Matka Cierni',
    title: 'Boss Główny Aktu 3',
    visualSummary: 'Wysoka, mroczna driada spleciona z fioletowo-zielonymi, bioluminescencyjnymi pnączami i korzeniami.',
    recommendedGear: 'Min. Pełny Legendarny +7',
    requiredPower: 3580,
    baseHp: 620000,
    baseDamage: 1580,
    bossArmor: 295,
    armorPenPct: 28,
    skillMaxHpPct: 12,
    radius: 2.35,
    speed: 4.7,
    abilities: [
      {
        id: 'chwyt_korzeni',
        name: 'Chwyt Korzeni',
        description: 'Unieruchamia 1–2 graczy w kolczastych korzeniach (zniszcz korzenie lub użyj tarczy Wróżki!).',
        telegraphMs: 960,
        cooldownMs: 9500,
        baseWeight: 26,
        color: '#16a34a',
      },
      {
        id: 'trujace_zarodniki',
        name: 'Trujące Zarodniki',
        description: 'Rozrzuca wybuchające strefy toksycznych zarodników na arenie.',
        telegraphMs: 1050,
        cooldownMs: 7200,
        baseWeight: 30,
        color: '#84cc16',
      },
      {
        id: 'roj_cierni',
        name: 'Rój Cierni',
        description: 'Wystrzeliwuje serię kolczastych pocisków w promieniu 360° (bullet-hell).',
        telegraphMs: 960,
        cooldownMs: 8200,
        baseWeight: 28,
        color: '#9333ea',
      },
      {
        id: 'pancerz_kory',
        name: 'Pancerz Kory',
        description: 'Nakłada tarczę i zaczyna się leczyć — zbij tarczę, by przerwać leczenie!',
        telegraphMs: 900,
        cooldownMs: 17000,
        baseWeight: 24,
        hpThresholdMax: 0.85,
        color: '#22c55e',
      },
    ],
  },

  vaelgor: {
    id: 'vaelgor',
    act: 4,
    name: 'Vaelgor, Archont Chaosu',
    title: 'Boss Główny Aktu 4',
    visualSummary: 'Lewitujący, skrzydlaty demon z czarnego obsydianu i pękającej lawy, z koroną z czystej energii chaosu.',
    recommendedGear: 'Min. Pełny Legendarny +9 (Endgame)',
    requiredPower: 5580,
    baseHp: 1220000,
    baseDamage: 2850,
    bossArmor: 430,
    armorPenPct: 34,
    skillMaxHpPct: 14,
    radius: 2.75,
    speed: 5.1,
    abilities: [
      {
        id: 'rozdarcie_wymiaru',
        name: 'Rozdarcie Wymiaru',
        description: 'Teleportuje się za plecy losowego gracza i wykonuje potężne cięcie wymiarowe.',
        telegraphMs: 880,
        cooldownMs: 6800,
        baseWeight: 30,
        color: '#be123c',
      },
      {
        id: 'deszcz_obsydianu',
        name: 'Deszcz Obsydianu',
        description: 'Z nieba spadają liczne meteory obsydianu z krótkim telegrafowaniem.',
        telegraphMs: 1080,
        cooldownMs: 8200,
        baseWeight: 28,
        color: '#ea580c',
      },
      {
        id: 'pierscien_lawy',
        name: 'Pierścień Lawy',
        description: 'Wypuszcza rozchodzącą się falę płynnej lawy po całej arenie.',
        telegraphMs: 960,
        cooldownMs: 9500,
        baseWeight: 26,
        color: '#dc2626',
      },
      {
        id: 'wybuch_chaosu',
        name: 'Wybuch Chaosu',
        description: 'Ładuje niszczycielską falę Chaosu — schowaj się za Obsydianowymi Filarami lub użyj Bariery Światła!',
        telegraphMs: 3200,
        cooldownMs: 19000,
        baseWeight: 22,
        hpThresholdMax: 0.88,
        color: '#db2777',
      },
    ],
  },
};

export interface MiniBossDef {
  act: ActNumber;
  locationInAct: 5 | 10;
  archetype: string;
  name: string;
  styleTag: string;
  color: string;
  abilities: BossAbilityDef[];
}

export const MINI_BOSSES: MiniBossDef[] = [
  {
    act: 1,
    locationInAct: 5,
    archetype: 'mb_krypta_kat',
    name: 'Grimjaw, Kat Katakumb',
    styleTag: 'Zakapturzony kat w żelaznej masce z wielkim toporem katowskim',
    color: '#dc2626',
    abilities: [
      {
        id: 'kat_ciecie',
        name: 'Egzekucja Toporem',
        description: 'Szerokie, krwawe cięcie wielkim toporem przed sobą.',
        telegraphMs: 900,
        cooldownMs: 5500,
        baseWeight: 35,
        color: '#dc2626',
      },
      {
        id: 'skok_z_uderzeniem',
        name: 'Miażdżący Skok',
        description: 'Wyskakuje w górę i uderza toporem w ziemię.',
        telegraphMs: 1100,
        cooldownMs: 8000,
        baseWeight: 25,
        color: '#b45309',
      },
    ],
  },
  {
    act: 1,
    locationInAct: 10,
    archetype: 'mb_nekro_lord',
    name: 'Mordath, Strażnik Pieczęci',
    styleTag: 'Lewitujący licz ze złotą pieczęcią za plecami i latarnią dusz',
    color: '#7c3aed',
    abilities: [
      {
        id: 'pieczec_dusz',
        name: 'Pieczęć Dusz',
        description: 'Uwalnia widmową falę ze swojej latarni dusz, spowalniając cele.',
        telegraphMs: 950,
        cooldownMs: 6500,
        baseWeight: 34,
        color: '#7c3aed',
      },
      {
        id: 'zew_krypty',
        name: 'Zew Krypty',
        description: 'Wzywa szkieletowych strażników krypty.',
        telegraphMs: 1200,
        cooldownMs: 14000,
        baseWeight: 22,
        color: '#22a355',
      },
    ],
  },
  {
    act: 2,
    locationInAct: 5,
    archetype: 'mb_sfinks',
    name: 'Khepri, Złoty Sfinks',
    styleTag: 'Skrzydlaty, czworonożny sfinks ze złota i piaskowca',
    color: '#d97706',
    abilities: [
      {
        id: 'ryk_wydm',
        name: 'Ryk Złotych Wydm',
        description: 'Potężna fala piasku i dźwięku w linii przed Sfinksem.',
        telegraphMs: 920,
        cooldownMs: 6000,
        baseWeight: 35,
        color: '#d97706',
      },
      {
        id: 'burza_piaskowa',
        name: 'Wir Wydm',
        description: 'Przyzywa wędrujące tornada piasku.',
        telegraphMs: 1000,
        cooldownMs: 11000,
        baseWeight: 25,
        color: '#0284c7',
      },
    ],
  },
  {
    act: 2,
    locationInAct: 10,
    archetype: 'mb_faraon_cien',
    name: 'Setesh, Kapłan Słońca',
    styleTag: 'Szakalogłowy kapłan z wielkim berłem Ankh i dyskiem słońca',
    color: '#eab308',
    abilities: [
      {
        id: 'sloneczny_promien',
        name: 'Promień Słońca',
        description: 'Omiata arenę wirującym promieniem słonecznym z dysku Ankh.',
        telegraphMs: 1050,
        cooldownMs: 10500,
        baseWeight: 30,
        color: '#eab308',
      },
      {
        id: 'nurkowanie_w_piasku',
        name: 'Pustynna Zasadzka',
        description: 'Znika w wirze piasku i uderza spod ziemi.',
        telegraphMs: 1150,
        cooldownMs: 8500,
        baseWeight: 28,
        color: '#d97706',
      },
    ],
  },
  {
    act: 3,
    locationInAct: 5,
    archetype: 'mb_drzewiec',
    name: 'Korzenny Kolos Bagien',
    styleTag: 'Masywny zgarbiony drzewiec porośnięty grzybami i mchem',
    color: '#15803d',
    abilities: [
      {
        id: 'chwyt_korzeni',
        name: 'Oplot Korzeni',
        description: 'Chwyta graczy w kolczaste korzenie bagien.',
        telegraphMs: 950,
        cooldownMs: 9500,
        baseWeight: 30,
        color: '#16a34a',
      },
      {
        id: 'trujace_zarodniki',
        name: 'Deszcz Zarodników',
        description: 'Strząsa z pleców wybuchające grzybowe zarodniki.',
        telegraphMs: 1000,
        cooldownMs: 7500,
        baseWeight: 32,
        color: '#84cc16',
      },
    ],
  },
  {
    act: 3,
    locationInAct: 10,
    archetype: 'mb_wiedzma',
    name: 'Vespera, Tkaczka Jadu',
    styleTag: 'Pajęcza wiedźma (drider) na 6 odnóżach z jadowym odwłokiem',
    color: '#9333ea',
    abilities: [
      {
        id: 'siec_jadu',
        name: 'Jadowa Sieć',
        description: 'Wystrzeliwuje toksyczną pajęczynę, spowalniając i zatruwając wrogów.',
        telegraphMs: 880,
        cooldownMs: 6500,
        baseWeight: 35,
        color: '#84cc16',
      },
      {
        id: 'roj_cierni',
        name: 'Salwa Kłów Jadu',
        description: 'Wypuszcza pierścień jadowitych kolców wokół siebie.',
        telegraphMs: 950,
        cooldownMs: 8000,
        baseWeight: 28,
        color: '#9333ea',
      },
    ],
  },
  {
    act: 4,
    locationInAct: 5,
    archetype: 'mb_golem_lawy',
    name: 'Ignis, Obsydianowy Tytan',
    styleTag: 'Bazaltowy kolos z piecem lawowym w torsie i kominami na barkach',
    color: '#ea580c',
    abilities: [
      {
        id: 'mlot_magmy',
        name: 'Wstrząs Pieca',
        description: 'Uderza lawowymi pięściami, wyrzucając bazaltowe głazy.',
        telegraphMs: 950,
        cooldownMs: 6200,
        baseWeight: 34,
        color: '#ea580c',
      },
      {
        id: 'pierscien_lawy',
        name: 'Fala Magmy',
        description: 'Wypuszcza rozszerzający się pierścień ognia.',
        telegraphMs: 950,
        cooldownMs: 9500,
        baseWeight: 26,
        color: '#dc2626',
      },
    ],
  },
  {
    act: 4,
    locationInAct: 10,
    archetype: 'mb_rycerz_chaosu',
    name: 'Kaelen, Zwiastun Szczeliny',
    styleTag: 'Smukły rycerz pustki z dwiema kosami szczeliny i pękniętą aureolą',
    color: '#be123c',
    abilities: [
      {
        id: 'rozdarcie_wymiaru',
        name: 'Cięcie Kosą Pustki',
        description: 'Przeskakuje za plecy gracza i tnie bliźniaczymi kosami.',
        telegraphMs: 850,
        cooldownMs: 6500,
        baseWeight: 35,
        color: '#be123c',
      },
      {
        id: 'deszcz_obsydianu',
        name: 'Odłamki Szczeliny',
        description: 'Przyzywa z portali grad spadających obsydianowych kolców.',
        telegraphMs: 1000,
        cooldownMs: 8500,
        baseWeight: 28,
        color: '#7c3aed',
      },
    ],
  },
];

export interface ActEnemyArchetype {
  archetype: string;
  name: string;
  role: 'melee' | 'ranged' | 'brute' | 'caster';
  hpMult: number;
  dmgMult: number;
  speed: number;
  radius: number;
  color: string;
}

export const ACT_ENEMIES: Record<ActNumber, ActEnemyArchetype[]> = {
  1: [
    { archetype: 'a1_szkielet', name: 'Szkielet Wojownik', role: 'melee', hpMult: 1.0, dmgMult: 1.0, speed: 4.3, radius: 0.85, color: '#cbd5e1' },
    { archetype: 'a1_lucznik', name: 'Grobowy Łucznik', role: 'ranged', hpMult: 0.85, dmgMult: 1.08, speed: 3.9, radius: 0.8, color: '#94a3b8' },
    { archetype: 'a1_nekromanta', name: 'Nekromanta Krypty', role: 'caster', hpMult: 0.92, dmgMult: 1.2, speed: 3.6, radius: 0.9, color: '#2f855a' },
    { archetype: 'a1_golem', name: 'Krasnoludzki Golem Ruin', role: 'brute', hpMult: 1.7, dmgMult: 1.32, speed: 3.1, radius: 1.25, color: '#6b6560' },
  ],
  2: [
    { archetype: 'a2_skorpion', name: 'Piaskowy Skorpion', role: 'melee', hpMult: 1.05, dmgMult: 1.05, speed: 4.8, radius: 0.9, color: '#c97e1c' },
    { archetype: 'a2_mumia', name: 'Mumia Strażnik', role: 'brute', hpMult: 1.65, dmgMult: 1.28, speed: 3.3, radius: 1.15, color: '#d6c18f' },
    { archetype: 'a2_kultysta', name: 'Kultysta Słońca', role: 'caster', hpMult: 0.92, dmgMult: 1.24, speed: 3.8, radius: 0.85, color: '#d99e26' },
    { archetype: 'a2_dzinn', name: 'Dżinn Burzy', role: 'ranged', hpMult: 1.0, dmgMult: 1.18, speed: 4.5, radius: 0.95, color: '#2a8ab8' },
  ],
  3: [
    { archetype: 'a3_biegacz', name: 'Ciernisty Biegacz', role: 'melee', hpMult: 0.98, dmgMult: 1.12, speed: 5.2, radius: 0.85, color: '#257042' },
    { archetype: 'a3_plujec', name: 'Bagienny Plujec', role: 'ranged', hpMult: 0.95, dmgMult: 1.22, speed: 3.8, radius: 0.9, color: '#6f9c24' },
    { archetype: 'a3_driada', name: 'Skażona Driada', role: 'caster', hpMult: 1.08, dmgMult: 1.26, speed: 4.2, radius: 0.9, color: '#8a52bd' },
    { archetype: 'a3_drzewiec', name: 'Mroczny Drzewiec', role: 'brute', hpMult: 1.8, dmgMult: 1.38, speed: 3.2, radius: 1.3, color: '#1b4d32' },
  ],
  4: [
    { archetype: 'a4_imp', name: 'Imp Chaosu', role: 'melee', hpMult: 0.98, dmgMult: 1.15, speed: 5.3, radius: 0.82, color: '#b8324a' },
    { archetype: 'a4_szczelina', name: 'Mag Szczeliny', role: 'caster', hpMult: 1.02, dmgMult: 1.32, speed: 4.1, radius: 0.9, color: '#7b3fa8' },
    { archetype: 'a4_rycerz', name: 'Rycerz Lawy', role: 'melee', hpMult: 1.4, dmgMult: 1.3, speed: 4.4, radius: 1.05, color: '#d9641e' },
    { archetype: 'a4_golem', name: 'Obsydianowy Kolos', role: 'brute', hpMult: 1.9, dmgMult: 1.42, speed: 3.3, radius: 1.35, color: '#2c3647' },
  ],
};

export function getMainBossByAct(act: ActNumber): MainBossDef {
  const map: Record<ActNumber, RuneId> = {
    1: 'malakor',
    2: 'azirath',
    3: 'sylvara',
    4: 'vaelgor',
  };
  return MAIN_BOSSES[map[act]];
}

export function getMiniBoss(act: ActNumber, locationInAct: number): MiniBossDef | undefined {
  return MINI_BOSSES.find((m) => m.act === act && m.locationInAct === locationInAct);
}

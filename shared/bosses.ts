import type { ActNumber, BossId } from './types.js';

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
  id: BossId;
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

export const MAIN_BOSSES: Record<BossId, MainBossDef> = {
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

  // =========================================================
  // HARDCORE ACT 5 BOSS: KAELIS, WŁADCA WIECZNEJ ZIMY (Lok. 75)
  // =========================================================
  kaelis: {
    id: 'kaelis',
    act: 5,
    name: 'Kaelis, Władca Wiecznej Zimy',
    title: 'Boss Hardcore • Akt 5',
    visualSummary: 'Krystaliczny lodowy archanioł z czterema skrzydłami ze szronu, lodową halabardą i aureolą zorzy polarnej.',
    recommendedGear: 'HARDCORE • Min. Pełny Boski +13 (6/6)',
    requiredPower: 8200,
    baseHp: 1820000, // ~3 min solo w wymaksowanym Boskim +13
    baseDamage: 4600,
    bossArmor: 2200,
    armorPenPct: 38,
    skillMaxHpPct: 16,
    radius: 2.85,
    speed: 5.2,
    abilities: [
      {
        id: 'lodowe_wlocznie',
        name: 'Salwa Lodowych Włóczni',
        description: 'Wystrzeliwuje 3 błyskawiczne lodowe włócznie w stronę graczy (przebijają pancerz).',
        telegraphMs: 850,
        cooldownMs: 5600,
        baseWeight: 32,
        preferredMinDist: 3.5,
        color: '#38bdf8',
      },
      {
        id: 'zamiec_absolutna',
        name: 'Zamieć Absolutna',
        description: 'Wypuszcza lodową falę pierścieniową po całej komnacie, mocno spowalniając bohaterów.',
        telegraphMs: 1020,
        cooldownMs: 8800,
        baseWeight: 28,
        color: '#7dd3fc',
      },
      {
        id: 'krysztalowe_wiezienie',
        name: 'Kryształowe Więzienie',
        description: 'Zamyka graczy w wybuchających bryłach astralnego lodu — ucieknij ze strefy przed detonacją!',
        telegraphMs: 960,
        cooldownMs: 8200,
        baseWeight: 26,
        color: '#0284c7',
      },
      {
        id: 'gwiazda_zimy',
        name: 'Supernowa Zimy',
        description: 'Przyzywa deszcz 6 krystalicznych meteorów zorzy polarnej na arenę.',
        telegraphMs: 1120,
        cooldownMs: 10500,
        baseWeight: 24,
        color: '#a5f3fc',
      },
      {
        id: 'tarcza_szronu',
        name: 'Bariera Wiecznego Szronu',
        description: 'Oplata się lodową tarczą i regeneruje siły — zbij tarczę jak najszybciej!',
        telegraphMs: 900,
        cooldownMs: 18500,
        baseWeight: 22,
        hpThresholdMax: 0.82,
        color: '#22d3ee',
      },
    ],
  },

  // =========================================================
  // HARDCORE ACT 6 BOSS: IGNAROK, KOLOS PRAKUŹNI (Lok. 90)
  // =========================================================
  ignarok: {
    id: 'ignarok',
    act: 6,
    name: 'Ignarok, Kolos Prakuźni',
    title: 'Boss Hardcore • Akt 6',
    visualSummary: 'Kolosalny runiczny tytan z brązu i płynnego złota, z buchającym piecem w piersi i gigantycznym młotem kowalskim.',
    recommendedGear: 'HARDCORE • Boski/Nieśmiertelny +15..+17 + Runa Kaelisa',
    requiredPower: 11200,
    baseHp: 2850000, // ~3 min solo w ekwipunku +15..+17
    baseDamage: 5900,
    bossArmor: 2900,
    armorPenPct: 42,
    skillMaxHpPct: 18,
    radius: 3.05,
    speed: 4.9,
    abilities: [
      {
        id: 'uderzenie_kowadla',
        name: 'Wstrząs Prakuźni',
        description: 'Uderza młotem w posadzkę wywołując potężny sejsmiczny krater przed sobą.',
        telegraphMs: 920,
        cooldownMs: 5800,
        baseWeight: 32,
        preferredMaxDist: 9,
        color: '#f97316',
      },
      {
        id: 'strumien_plazmy',
        name: 'Strumień Płynnego Złota',
        description: 'Obraca się wokół osi wypuszczając niszczycielski laser z pieca Prakuźni!',
        telegraphMs: 1150,
        cooldownMs: 11200,
        baseWeight: 26,
        color: '#facc15',
      },
      {
        id: 'deszcz_roztopionego_zlota',
        name: 'Deszcz Roztopionego Złota',
        description: 'Zasypuje arenę 6 strefami płynnego metalu zostawiającymi parzące kałuże.',
        telegraphMs: 1040,
        cooldownMs: 8800,
        baseWeight: 28,
        color: '#ea580c',
      },
      {
        id: 'przeciazenie_pieca',
        name: 'Przeciążenie Pieca',
        description: 'Wypuszcza podwójną falę ognistych pierścieni ze swojego reaktora!',
        telegraphMs: 980,
        cooldownMs: 9600,
        baseWeight: 26,
        color: '#dc2626',
      },
      {
        id: 'hartowanie_pancerza',
        name: 'Hartowanie Tytana',
        description: 'Wytwarza tarczę z hartowanego złota i wywołuje salwę iskier wokół siebie.',
        telegraphMs: 900,
        cooldownMs: 18000,
        baseWeight: 22,
        hpThresholdMax: 0.8,
        color: '#fbbf24',
      },
    ],
  },

  // =========================================================
  // HARDCORE ACT 7 FINAL BOSS: AETERNUS, CESARZ WIECZNOŚCI (Lok. 105)
  // =========================================================
  aeternus: {
    id: 'aeternus',
    act: 7,
    name: 'Aeternus, Cesarz Wieczności',
    title: 'Ostateczny Boss Hardcore • Akt 7',
    visualSummary: 'Lewitujący bóg czasu w biało-złotej szacie gwiazd z czterema skrzydłami galaktyki, koroną zaćmienia i kosmicznym ostrzem.',
    recommendedGear: 'HARDCORE • Nieśmiertelny +18..+20 + Runy HC',
    requiredPower: 14800,
    baseHp: 4350000, // ~3 min solo w Nieśmiertelnym +18..+20
    baseDamage: 7400,
    bossArmor: 3600,
    armorPenPct: 46,
    skillMaxHpPct: 20,
    radius: 3.1,
    speed: 5.5,
    abilities: [
      {
        id: 'rozdarcie_czasu',
        name: 'Rozdarcie Czasoprzestrzeni',
        description: 'Przecina całą arenę 3 skrzyżowanymi szczelinami czasu!',
        telegraphMs: 940,
        cooldownMs: 6500,
        baseWeight: 30,
        color: '#00f5d4',
      },
      {
        id: 'zacmienie_wiecznosci',
        name: 'Zaćmienie Wieczności',
        description: 'Teleportuje się w stronę gracza i detonuje potężną sferę zaćmienia.',
        telegraphMs: 920,
        cooldownMs: 7400,
        baseWeight: 28,
        color: '#a855f7',
      },
      {
        id: 'wir_galaktyki',
        name: 'Wiry Galaktyki',
        description: 'Przywołuje 4 wędrujące kosmiczne wiry krążące po komnacie tronu.',
        telegraphMs: 1000,
        cooldownMs: 11000,
        baseWeight: 25,
        color: '#38bdf8',
      },
      {
        id: 'wyrok_niesmiertelnych',
        name: 'Wyrok Nieśmiertelnych',
        description: 'Zsyła 7 kosmicznych meteorów światła i purpury na wszystkich bohaterów.',
        telegraphMs: 1050,
        cooldownMs: 8800,
        baseWeight: 27,
        color: '#fde047',
      },
      {
        id: 'kronika_zaglady',
        name: 'Kronika Zagłady',
        description: 'Ładuje ostateczny impuls wieczności — skryj się za filarami lub odpal Barierę Światła!',
        telegraphMs: 3000,
        cooldownMs: 20000,
        baseWeight: 22,
        hpThresholdMax: 0.78,
        color: '#f43f5e',
      },
    ],
  },

  // =========================================================
  // AKT GILDYJNY I (AKT 8): AURELION, KRÓL ZŁOTEGO SZTANDARU (Lok. 120)
  // Kalibracja: Mityczny +6 (~3 min bicia dla każdego członka gildii!)
  // =========================================================
  aurelion: {
    id: 'aurelion',
    act: 8,
    name: 'Aurelion, Król Złotego Sztandaru',
    title: 'Boss Gildyjny • Akt Gildyjny I',
    visualSummary: 'Majestatyczny złoto-szafirowy król-paladyn w lwiej koronie, z królewską peleryną, halabardą światła i orbitującymi złotymi tarczami.',
    recommendedGear: 'GILDIA • Wystarczy Mityczny +6 (~3 min walki)',
    requiredPower: 1850,
    baseHp: 230000, // ~180s (3 min) bicia w Mitycznym +6!
    baseDamage: 720,
    bossArmor: 210,
    armorPenPct: 22,
    skillMaxHpPct: 11,
    radius: 2.7,
    speed: 4.9,
    abilities: [
      {
        id: 'szarza_sztandaru',
        name: 'Szarża Złotego Sztandaru',
        description: 'Wypuszcza świetlisty szlak szarży przez całą komnatę.',
        telegraphMs: 920,
        cooldownMs: 5800,
        baseWeight: 32,
        preferredMinDist: 3.5,
        color: '#fbbf24',
      },
      {
        id: 'wyrok_krola',
        name: 'Wyrok Króla',
        description: 'Przyzywa potężny złoty krąg sprawiedliwości pod losowym graczem.',
        telegraphMs: 1020,
        cooldownMs: 7400,
        baseWeight: 28,
        color: '#38bdf8',
      },
      {
        id: 'deszcz_kopii',
        name: 'Deszcz Złotych Kopii',
        description: 'Z nieba spada 5 świetlistych kopii Bractwa w strefy wokół drużyny.',
        telegraphMs: 1080,
        cooldownMs: 9200,
        baseWeight: 26,
        color: '#fde047',
      },
      {
        id: 'tarcza_bractwa',
        name: 'Bastion Bractwa',
        description: 'Oplata się złotą tarczą i leczy — zbij ją wspólnie z gildią!',
        telegraphMs: 920,
        cooldownMs: 17500,
        baseWeight: 22,
        hpThresholdMax: 0.82,
        color: '#f59e0b',
      },
    ],
  },

  // =========================================================
  // AKT GILDYJNY II (AKT 9): DRAKORYS, PRADAWNY SMOK GILDII (Lok. 135)
  // Kalibracja: Mityczny +6 (~3 min bicia dla każdego członka gildii!)
  // =========================================================
  drakorys: {
    id: 'drakorys',
    act: 9,
    name: 'Drakorys, Pradawny Smok Gildii',
    title: 'Boss Gildyjny • Akt Gildyjny II',
    visualSummary: 'Potężny szmaragdowo-złoty Smok z wielkimi skrzydłami jadeitu, rogatym pyskiem, ogonem z bursztynowych kryształów i szmaragdowym ogniem.',
    recommendedGear: 'GILDIA • Wystarczy Mityczny +6 (~3 min walki)',
    requiredPower: 2050,
    baseHp: 268000, // ~180-195s (3 min) bicia w Mitycznym +6!
    baseDamage: 810,
    bossArmor: 240,
    armorPenPct: 24,
    skillMaxHpPct: 12,
    radius: 2.95,
    speed: 5.0,
    abilities: [
      {
        id: 'oddech_szmaragdu',
        name: 'Oddech Szmaragdowego Ognia',
        description: 'Obraca się wokół własnej osi ziejąc palącym promieniem jadeitowego ognia!',
        telegraphMs: 1120,
        cooldownMs: 10800,
        baseWeight: 28,
        color: '#10b981',
      },
      {
        id: 'skrzydla_huraganu',
        name: 'Skrzydła Huraganu',
        description: 'Potężnym uderzeniem skrzydeł wysyła rozchodzącą się falę wiatru po arenie.',
        telegraphMs: 980,
        cooldownMs: 8600,
        baseWeight: 28,
        color: '#34d399',
      },
      {
        id: 'meteory_jadeitu',
        name: 'Grad Jadeitowych Kryształów',
        description: 'Zrzuca 5 wybuchających kryształów smoka na pozycje graczy.',
        telegraphMs: 1050,
        cooldownMs: 8200,
        baseWeight: 28,
        color: '#f59e0b',
      },
      {
        id: 'gniew_smoka',
        name: 'Wiry Smoczego Żaru',
        description: 'Tworzy 3 wędrujące kule szmaragdowego ognia krążące po świątyni.',
        telegraphMs: 980,
        cooldownMs: 11500,
        baseWeight: 24,
        color: '#059669',
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

  // HARDCORE ACT 5 MINI-BOSSES
  {
    act: 5,
    locationInAct: 5,
    archetype: 'mb_hc_mroz_rycerz',
    name: 'Voryn, Rycerz Zorzy',
    styleTag: 'Krystaliczny paladyn mrozu z wielką lodową lancą',
    color: '#38bdf8',
    abilities: [
      {
        id: 'lodowe_wlocznie',
        name: 'Lanca Zorzy',
        description: 'Szybkie pchnięcie lodową lancą przez środek komnaty.',
        telegraphMs: 860,
        cooldownMs: 5600,
        baseWeight: 34,
        color: '#38bdf8',
      },
      {
        id: 'zamiec_absolutna',
        name: 'Fala Szronu',
        description: 'Rozchodzący się lodowy pierścień spowalniający wrogów.',
        telegraphMs: 1000,
        cooldownMs: 8500,
        baseWeight: 26,
        color: '#7dd3fc',
      },
    ],
  },
  {
    act: 5,
    locationInAct: 10,
    archetype: 'mb_hc_mroz_wiedma',
    name: 'Glacia, Wyrocznia Lodu',
    styleTag: 'Lewitująca czarodziejka szronu z koroną sopli',
    color: '#22d3ee',
    abilities: [
      {
        id: 'krysztalowe_wiezienie',
        name: 'Klatka Szronu',
        description: 'Detonuje lodowe kręgi pod nogami drużyny.',
        telegraphMs: 950,
        cooldownMs: 7400,
        baseWeight: 30,
        color: '#0284c7',
      },
      {
        id: 'gwiazda_zimy',
        name: 'Grad Kryształów',
        description: 'Zsyła serię lodowych meteorów na arenę.',
        telegraphMs: 1050,
        cooldownMs: 9200,
        baseWeight: 28,
        color: '#a5f3fc',
      },
    ],
  },

  // HARDCORE ACT 6 MINI-BOSSES
  {
    act: 6,
    locationInAct: 5,
    archetype: 'mb_hc_kuznia_straznik',
    name: 'Brimstone, Kowal Zagłady',
    styleTag: 'Opancerzony w brąz kolos z dwoma rozgrzanymi kowadłami',
    color: '#f97316',
    abilities: [
      {
        id: 'uderzenie_kowadla',
        name: 'Grzmot Kowadła',
        description: 'Potężne uderzenie wstrząsające ziemią.',
        telegraphMs: 920,
        cooldownMs: 6000,
        baseWeight: 32,
        color: '#f97316',
      },
      {
        id: 'przeciazenie_pieca',
        name: 'Wybuch Żaru',
        description: 'Rozszerzająca się fala ognistego żaru.',
        telegraphMs: 980,
        cooldownMs: 8800,
        baseWeight: 28,
        color: '#dc2626',
      },
    ],
  },
  {
    act: 6,
    locationInAct: 10,
    archetype: 'mb_hc_kuznia_automat',
    name: 'Solarius, Złoty Automat',
    styleTag: 'Pradawny runiczny konstrukt z laserowym rdzeniem',
    color: '#facc15',
    abilities: [
      {
        id: 'strumien_plazmy',
        name: 'Promień Prakuźni',
        description: 'Obracający się złoty promień plazmy.',
        telegraphMs: 1120,
        cooldownMs: 10500,
        baseWeight: 28,
        color: '#facc15',
      },
      {
        id: 'deszcz_roztopionego_zlota',
        name: 'Salwa Złotej Lawy',
        description: 'Rozrzuca strefy wrzącego złota po arenie.',
        telegraphMs: 1000,
        cooldownMs: 8200,
        baseWeight: 30,
        color: '#ea580c',
      },
    ],
  },

  // HARDCORE ACT 7 MINI-BOSSES
  {
    act: 7,
    locationInAct: 5,
    archetype: 'mb_hc_tron_herold',
    name: 'Chronos, Herold Zaćmienia',
    styleTag: 'Skrzydlaty strażnik czasu z klepsydrą gwiazd',
    color: '#a855f7',
    abilities: [
      {
        id: 'rozdarcie_czasu',
        name: 'Cięcie Czasu',
        description: 'Przecina arenę świetlistymi liniami czasu.',
        telegraphMs: 920,
        cooldownMs: 6500,
        baseWeight: 32,
        color: '#00f5d4',
      },
      {
        id: 'zacmienie_wiecznosci',
        name: 'Sfera Zaćmienia',
        description: 'Teleportuje się i detonuje kosmiczną falę.',
        telegraphMs: 940,
        cooldownMs: 7800,
        baseWeight: 28,
        color: '#a855f7',
      },
    ],
  },
  {
    act: 7,
    locationInAct: 10,
    archetype: 'mb_hc_tron_serafin',
    name: 'Serafina, Ostrze Nieśmiertelnych',
    styleTag: 'Świetlista wojowniczka z turkusowymi skrzydłami i podwójnym mieczem',
    color: '#00f5d4',
    abilities: [
      {
        id: 'wyrok_niesmiertelnych',
        name: 'Deszcz Gwiazd',
        description: 'Zsyła serię kosmicznych meteorów na graczy.',
        telegraphMs: 1000,
        cooldownMs: 8200,
        baseWeight: 30,
        color: '#fde047',
      },
      {
        id: 'wir_galaktyki',
        name: 'Tornado Astralu',
        description: 'Wypuszcza wędrujące kosmiczne wiry po arenie.',
        telegraphMs: 1000,
        cooldownMs: 10200,
        baseWeight: 26,
        color: '#38bdf8',
      },
    ],
  },

  // GUILD ACT I (ACT 8) MINI-BOSSES
  {
    act: 8,
    locationInAct: 5,
    archetype: 'mb_guild_kapitan',
    name: 'Kapitan Valerius, Strażnik Bramy',
    styleTag: 'Złoty rycerz sztandaru z potężną tarczą i kopią',
    color: '#fbbf24',
    abilities: [
      {
        id: 'szarza_sztandaru',
        name: 'Szarża Bractwa',
        description: 'Przebija linię obrony złotą kopią.',
        telegraphMs: 920,
        cooldownMs: 6000,
        baseWeight: 32,
        color: '#fbbf24',
      },
      {
        id: 'wyrok_krola',
        name: 'Uderzenie Tarczy',
        description: 'Detonuje złoty krąg pod graczem.',
        telegraphMs: 1000,
        cooldownMs: 7500,
        baseWeight: 28,
        color: '#38bdf8',
      },
    ],
  },
  {
    act: 8,
    locationInAct: 10,
    archetype: 'mb_guild_arcymag',
    name: 'Alaric, Arcymag Sztandaru',
    styleTag: 'Szafirowy czarodziej gildii otoczony złotymi runami',
    color: '#38bdf8',
    abilities: [
      {
        id: 'deszcz_kopii',
        name: 'Salwa Świetlistych Run',
        description: 'Zsyła 5 złotych promieni z nieba.',
        telegraphMs: 1050,
        cooldownMs: 8500,
        baseWeight: 30,
        color: '#fde047',
      },
      {
        id: 'tarcza_bractwa',
        name: 'Bariera Sztandaru',
        description: 'Tworzy złotą tarczę i zaczyna się leczyć.',
        telegraphMs: 920,
        cooldownMs: 16500,
        baseWeight: 24,
        color: '#f59e0b',
      },
    ],
  },

  // GUILD ACT II (ACT 9) MINI-BOSSES
  {
    act: 9,
    locationInAct: 5,
    archetype: 'mb_guild_jezdzca',
    name: 'Drakon, Jeździec Łuski',
    styleTag: 'Szmaragdowy wojownik smoka z dwoma jadeitowymi toporami',
    color: '#10b981',
    abilities: [
      {
        id: 'skrzydla_huraganu',
        name: 'Fala Łuski',
        description: 'Rozchodzący się pierścień szmaragdowej energii.',
        telegraphMs: 980,
        cooldownMs: 8200,
        baseWeight: 30,
        color: '#34d399',
      },
      {
        id: 'meteory_jadeitu',
        name: 'Grad Bursztynu',
        description: 'Zrzuca serię wybuchających kryształów.',
        telegraphMs: 1040,
        cooldownMs: 8500,
        baseWeight: 28,
        color: '#f59e0b',
      },
    ],
  },
  {
    act: 9,
    locationInAct: 10,
    archetype: 'mb_guild_kaplanka',
    name: 'Virelia, Kapłanka Smoka',
    styleTag: 'Tajemnicza szamanka jadeitu w koronie smoczych rogów',
    color: '#34d399',
    abilities: [
      {
        id: 'oddech_szmaragdu',
        name: 'Promień Jadeitu',
        description: 'Obracający się szmaragdowy laser świątyni.',
        telegraphMs: 1120,
        cooldownMs: 10500,
        baseWeight: 28,
        color: '#10b981',
      },
      {
        id: 'gniew_smoka',
        name: 'Kule Smoczego Ognia',
        description: 'Wypuszcza wędrujące ogniste wiry po komnacie.',
        telegraphMs: 980,
        cooldownMs: 11000,
        baseWeight: 26,
        color: '#059669',
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
  5: [
    { archetype: 'a5_mroz_straznik', name: 'Strażnik Szronu', role: 'melee', hpMult: 1.0, dmgMult: 1.05, speed: 4.8, radius: 0.92, color: '#38bdf8' },
    { archetype: 'a5_zorza_mag', name: 'Tkacz Zorzy', role: 'caster', hpMult: 0.95, dmgMult: 1.18, speed: 4.2, radius: 0.9, color: '#818cf8' },
    { archetype: 'a5_sopel_strzelec', name: 'Astralny Łowca', role: 'ranged', hpMult: 0.92, dmgMult: 1.15, speed: 4.5, radius: 0.85, color: '#22d3ee' },
    { archetype: 'a5_golem_lodu', name: 'Kolos Wiecznej Zimy', role: 'brute', hpMult: 1.45, dmgMult: 1.25, speed: 3.5, radius: 1.35, color: '#0284c7' },
  ],
  6: [
    { archetype: 'a6_kuznia_woj', name: 'Kowal Runiczny', role: 'melee', hpMult: 1.05, dmgMult: 1.08, speed: 4.7, radius: 0.95, color: '#f97316' },
    { archetype: 'a6_plazma_mag', name: 'Alchemik Prakuźni', role: 'caster', hpMult: 0.96, dmgMult: 1.2, speed: 4.2, radius: 0.9, color: '#facc15' },
    { archetype: 'a6_iskra_strzelec', name: 'Strzelec Żaru', role: 'ranged', hpMult: 0.94, dmgMult: 1.16, speed: 4.5, radius: 0.88, color: '#ea580c' },
    { archetype: 'a6_golem_zlota', name: 'Złoty Tytan Kuźni', role: 'brute', hpMult: 1.48, dmgMult: 1.28, speed: 3.5, radius: 1.38, color: '#ca8a04' },
  ],
  7: [
    { archetype: 'a7_niezmierny_rycerz', name: 'Rycerz Wieczności', role: 'melee', hpMult: 1.06, dmgMult: 1.1, speed: 5.0, radius: 0.95, color: '#00f5d4' },
    { archetype: 'a7_czas_mag', name: 'Kronikarz Pustki', role: 'caster', hpMult: 0.98, dmgMult: 1.22, speed: 4.4, radius: 0.92, color: '#c084fc' },
    { archetype: 'a7_gwiazda_lowca', name: 'Łucznik Zaćmienia', role: 'ranged', hpMult: 0.95, dmgMult: 1.18, speed: 4.8, radius: 0.88, color: '#fde047' },
    { archetype: 'a7_golem_astralu', name: 'Astralny Behemot', role: 'brute', hpMult: 1.5, dmgMult: 1.3, speed: 3.7, radius: 1.4, color: '#6366f1' },
  ],
  8: [
    { archetype: 'a8_sztandar_rycerz', name: 'Sztandarowy Rycerz', role: 'melee', hpMult: 1.05, dmgMult: 1.04, speed: 4.6, radius: 0.92, color: '#fbbf24' },
    { archetype: 'a8_kusznik_bractwa', name: 'Kusznik Bractwa', role: 'ranged', hpMult: 0.92, dmgMult: 1.12, speed: 4.3, radius: 0.85, color: '#38bdf8' },
    { archetype: 'a8_kleryk_sztandaru', name: 'Kleryk Sztandaru', role: 'caster', hpMult: 0.95, dmgMult: 1.18, speed: 4.0, radius: 0.9, color: '#fde047' },
    { archetype: 'a8_golem_bramy', name: 'Złoty Golem Bramy', role: 'brute', hpMult: 1.55, dmgMult: 1.24, speed: 3.4, radius: 1.32, color: '#d97706' },
  ],
  9: [
    { archetype: 'a9_smoczy_wyznawca', name: 'Smoczy Wyznawca', role: 'melee', hpMult: 1.08, dmgMult: 1.08, speed: 4.8, radius: 0.92, color: '#10b981' },
    { archetype: 'a9_jadeit_lowca', name: 'Jadeitowy Łowca', role: 'ranged', hpMult: 0.94, dmgMult: 1.15, speed: 4.5, radius: 0.86, color: '#34d399' },
    { archetype: 'a9_szaman_luski', name: 'Szaman Łuski', role: 'caster', hpMult: 0.98, dmgMult: 1.2, speed: 4.1, radius: 0.9, color: '#f59e0b' },
    { archetype: 'a9_smoczy_golem', name: 'Smoczy Strażnik', role: 'brute', hpMult: 1.6, dmgMult: 1.28, speed: 3.5, radius: 1.35, color: '#059669' },
  ],
};

export function getMainBossByAct(act: ActNumber): MainBossDef {
  const map: Record<ActNumber, BossId> = {
    1: 'malakor',
    2: 'azirath',
    3: 'sylvara',
    4: 'vaelgor',
    5: 'kaelis',
    6: 'ignarok',
    7: 'aeternus',
    8: 'aurelion',
    9: 'drakorys',
  };
  return MAIN_BOSSES[map[act]];
}

export function getMiniBoss(act: ActNumber, locationInAct: number): MiniBossDef | undefined {
  return MINI_BOSSES.find((m) => m.act === act && m.locationInAct === locationInAct);
}

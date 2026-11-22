import * as THREE from 'three';
import type { ClassId, NetPlayerState } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createPlushLathe,
  createRoundedBoxGeometry,
  createSoftBladeGeometry,
  createSoftStarGeometry,
  createSoftWingGeometry,
  createTaperedCurveGeometry,
  createToonMaterial,
  getUpgradeGlowColor,
} from './ComicMaterials';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  capePivot?: THREE.Group;
  wingLeftGroup?: THREE.Group;
  wingRightGroup?: THREE.Group;
  orbitProp?: THREE.Group;
  shieldShell: THREE.Mesh;
  shieldRing: THREE.Mesh;
  stonePlatesGroup: THREE.Group;
  weaponGlowMesh: THREE.Mesh;
  armorGlowRing: THREE.Mesh;
  classId: ClassId;
}

export function buildCharacterRig(
  classId: ClassId,
  isLocal: boolean,
  options?: { hideSelectionRing?: boolean }
): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  root.add(createContactShadow(0.95, 0.4));

  // Subtle selection ring (can be hidden in 3D Main Menu showcase)
  const ringGeo = new THREE.RingGeometry(0.78, 0.9, 36);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isLocal ? '#fbbf24' : '#38bdf8',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: options?.hideSelectionRing ? 0 : isLocal ? 0.5 : 0.36,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  root.add(ring);

  const auraGeo = new THREE.RingGeometry(0.94, 1.16, 36);
  const auraMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const armorGlowRing = new THREE.Mesh(auraGeo, auraMat);
  armorGlowRing.rotation.x = -Math.PI / 2;
  armorGlowRing.position.y = 0.055;
  root.add(armorGlowRing);

  const isDwarf = classId === 'krasnolud';
  const isFairy = classId === 'wrozka';
  const isElf = classId === 'elf';
  const hScale = isDwarf ? 0.8 : isFairy ? 0.93 : isElf ? 1.02 : 0.96;
  const wScale = isDwarf ? 1.24 : isFairy ? 0.9 : isElf ? 0.94 : 1.06;

  // Warm, vibrant modern cartoon color palettes (Brawl Stars / Zelda / Torchlight vibe)
  const palettes: Record<
    ClassId,
    {
      primary: string;
      secondary: string;
      trim: string;
      skin: string;
      cheek: string;
      boots: string;
      hair: string;
      iris: string;
    }
  > = {
    wojownik: {
      primary: '#e5484d',
      secondary: '#6b7d99',
      trim: '#f5c249',
      skin: '#ffd4b2',
      cheek: '#ff8a80',
      boots: '#3b4259',
      hair: '#5c3624',
      iris: '#2563eb',
    },
    czarnoksieznik: {
      primary: '#7244bd',
      secondary: '#412870',
      trim: '#f5be4f',
      skin: '#fde0c8',
      cheek: '#f497b6',
      boots: '#2e224d',
      hair: '#e8effa',
      iris: '#a855f7',
    },
    elf: {
      primary: '#2da36f',
      secondary: '#7d5636',
      trim: '#f5d061',
      skin: '#ffe3cc',
      cheek: '#fa9d94',
      boots: '#593c24',
      hair: '#ffdb6e',
      iris: '#16a34a',
    },
    krasnolud: {
      primary: '#d4682a',
      secondary: '#69768c',
      trim: '#f2be4c',
      skin: '#fbc9a2',
      cheek: '#f28574',
      boots: '#4d3b32',
      hair: '#f26a1b',
      iris: '#0284c7',
    },
    wrozka: {
      primary: '#f06eaa',
      secondary: '#fff0f7',
      trim: '#fad25a',
      skin: '#ffece6',
      cheek: '#ff96ba',
      boots: '#c7528b',
      hair: '#ffcae2',
      iris: '#38bdf8',
    },
  };
  const pal = palettes[classId];

  // ==========================================
  // 1. CHUBBY SOFT CARTOON LEGS & PLUSH BOOTS
  // ==========================================
  const makeLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21 * wScale, 0.56 * hScale, 0);

    const leg = createComicMesh(
      new THREE.CapsuleGeometry(0.145 * wScale, 0.2 * hScale, 10, 18),
      pal.secondary,
      0.026
    );
    leg.position.y = -0.18 * hScale;

    // Fluffy rolled boot cuff
    const cuff = createComicMesh(
      new THREE.TorusGeometry(0.155 * wScale, 0.055, 10, 20),
      pal.trim,
      0.02
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.3 * hScale;

    // Plump rounded storybook boot
    const boot = createComicMesh(
      new THREE.CapsuleGeometry(0.15 * wScale, 0.14 * hScale, 10, 18),
      pal.boots,
      0.026
    );
    boot.position.y = -0.41 * hScale;

    const toe = createComicMesh(
      new THREE.SphereGeometry(0.165 * wScale, 16, 14),
      pal.boots,
      0.025
    );
    toe.scale.set(1.0, 0.72, 1.38);
    toe.position.set(0, -0.49 * hScale, 0.11);

    // Soft rounded boot sole rim
    const sole = createComicMesh(
      new THREE.SphereGeometry(0.16 * wScale, 14, 10),
      '#241d2e',
      0.015
    );
    sole.scale.set(1.04, 0.3, 1.44);
    sole.position.set(0, -0.55 * hScale, 0.1);

    pivot.add(leg, cuff, boot, toe, sole);
    return pivot;
  };

  const leftLegPivot = makeLeg(-1);
  const rightLegPivot = makeLeg(1);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  // ==========================================
  // 2. PLUSH LATHE-SCULPTED TORSO (ZERO BOXES!)
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.56 * hScale;
  bodyGroup.add(torsoGroup);

  if (classId === 'czarnoksieznik' || classId === 'wrozka') {
    // Smooth pear/bell cartoon robe or dress sculpted with LatheGeometry!
    const robeGeo = createPlushLathe(
      [
        [0.01, -0.34 * hScale],
        [0.54 * wScale, -0.34 * hScale],
        [0.55 * wScale, -0.24 * hScale],
        [0.44 * wScale, -0.02 * hScale],
        [0.3 * wScale, 0.24 * hScale],
        [0.39 * wScale, 0.56 * hScale],
        [0.32 * wScale, 0.74 * hScale],
        [0.01, 0.77 * hScale],
      ],
      26
    );
    const robe = createComicMesh(robeGeo, pal.primary, 0.03);

    const hemTrim = createComicMesh(
      new THREE.TorusGeometry(0.53 * wScale, 0.056, 10, 26),
      pal.trim,
      0.02
    );
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.position.y = -0.3 * hScale;

    const sash = createComicMesh(
      new THREE.TorusGeometry(0.32 * wScale, 0.068, 10, 24),
      pal.trim,
      0.02
    );
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 0.24 * hScale;

    torsoGroup.add(robe, hemTrim, sash);

    if (classId === 'czarnoksieznik') {
      // Fluffy scalloped arcane shawl collar made of soft overlapping puffs!
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const puff = createComicMesh(new THREE.SphereGeometry(0.15, 14, 12), pal.secondary, 0.02);
        puff.position.set(Math.cos(a) * 0.34 * wScale, 0.68 * hScale, Math.sin(a) * 0.3 * wScale);
        torsoGroup.add(puff);
      }
      // Cute golden clasp brooch on chest
      const brooch = createComicMesh(new THREE.SphereGeometry(0.11, 14, 12), '#38bdf8', 0.016, {
        emissive: '#0284c7',
        emissiveIntensity: 0.28,
      });
      brooch.position.set(0, 0.62 * hScale, 0.37 * wScale);
      torsoGroup.add(brooch);
    } else {
      // Plush flower-petal skirt & cute bow sash around Fairy waist!
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const petal = createComicMesh(
          new THREE.SphereGeometry(0.2, 14, 12),
          i % 2 === 0 ? pal.secondary : '#ff99c8',
          0.02
        );
        petal.scale.set(0.95, 1.38, 0.56);
        petal.position.set(Math.cos(a) * 0.38, 0.04 * hScale, Math.sin(a) * 0.38);
        petal.rotation.y = -a + Math.PI / 2;
        petal.rotation.x = 0.34;
        torsoGroup.add(petal);
      }
      // Cute ribbon collar
      const collar = createComicMesh(new THREE.TorusGeometry(0.3, 0.055, 10, 22), pal.secondary, 0.018);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.72 * hScale;
      torsoGroup.add(collar);
    }
  } else {
    // Plush barrel/heroic sculpted torso using LatheGeometry (ZERO blocky boxes!)
    const bellyR = isDwarf ? 0.5 * wScale : 0.42 * wScale;
    const chestR = isDwarf ? 0.48 * wScale : isElf ? 0.37 * wScale : 0.46 * wScale;
    const torsoGeo = createPlushLathe(
      [
        [0.01, -0.06 * hScale],
        [bellyR * 0.84, -0.02 * hScale],
        [bellyR, 0.16 * hScale],
        [chestR, 0.48 * hScale],
        [chestR * 0.86, 0.72 * hScale],
        [0.24 * wScale, 0.8 * hScale],
        [0.01, 0.82 * hScale],
      ],
      26
    );
    const chest = createComicMesh(torsoGeo, pal.primary, 0.03);
    chest.scale.set(1.06, 1.0, 0.88);
    torsoGroup.add(chest);

    // Sculpted domed front breastplate (soft sphere shell instead of rectangular box!)
    const plate = createComicMesh(
      new THREE.SphereGeometry(0.36 * wScale, 20, 16),
      pal.secondary,
      0.024
    );
    plate.scale.set(1.06, 0.88, 0.55);
    plate.position.set(0, 0.46 * hScale, 0.24 * wScale);
    torsoGroup.add(plate);

    // Golden emblem medallion on chest
    const emblemRing = createComicMesh(new THREE.TorusGeometry(0.13, 0.032, 10, 18), pal.trim, 0.015);
    emblemRing.position.set(0, 0.48 * hScale, 0.43 * wScale);
    const gem = createComicMesh(
      new THREE.SphereGeometry(0.1, 14, 12),
      classId === 'elf' ? '#34d399' : '#fbbf24',
      0.015,
      { emissive: classId === 'elf' ? '#10b981' : '#d97706', emissiveIntensity: 0.2 }
    );
    gem.scale.set(1, 1.1, 0.6);
    gem.position.set(0, 0.48 * hScale, 0.44 * wScale);
    torsoGroup.add(emblemRing, gem);

    // Plush rounded belt torus + soft circular golden buckle
    const belt = createComicMesh(
      new THREE.TorusGeometry(bellyR * 0.96, 0.085, 12, 26),
      '#593622',
      0.022
    );
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.06, 0.88, 1);
    belt.position.y = 0.1 * hScale;

    const buckle = createComicMesh(new THREE.TorusGeometry(0.11, 0.038, 10, 18), pal.trim, 0.016);
    buckle.position.set(0, 0.1 * hScale, bellyR * 0.91);
    torsoGroup.add(belt, buckle);

    if (classId === 'krasnolud') {
      // Fluffy cartoon fur mantle puffs around Dwarf shoulders!
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const fur = createComicMesh(new THREE.SphereGeometry(0.16, 14, 12), '#e8dcc8', 0.02);
        fur.position.set(Math.cos(a) * 0.42 * wScale, 0.72 * hScale, Math.sin(a) * 0.34 * wScale);
        torsoGroup.add(fur);
      }
    } else if (classId === 'wojownik') {
      // Rounded scalloped armored skirt tassets (flattened soft spheres, zero boxes!)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const tasset = createComicMesh(new THREE.SphereGeometry(0.18 * wScale, 14, 12), pal.secondary, 0.02);
        tasset.scale.set(1.0, 1.25, 0.55);
        tasset.position.set(Math.cos(a) * 0.36 * wScale, -0.05 * hScale, Math.sin(a) * 0.3 * wScale);
        tasset.rotation.y = -a + Math.PI / 2;
        tasset.rotation.x = 0.25;
        torsoGroup.add(tasset);
      }
    } else if (classId === 'elf') {
      // Soft leaf-shaped tunic flaps around Elf waist
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = createComicMesh(new THREE.SphereGeometry(0.17, 14, 12), pal.primary, 0.02);
        leaf.scale.set(0.9, 1.4, 0.45);
        leaf.position.set(Math.cos(a) * 0.34, -0.06 * hScale, Math.sin(a) * 0.3);
        leaf.rotation.y = -a + Math.PI / 2;
        leaf.rotation.x = 0.28;
        torsoGroup.add(leaf);
      }
    }
  }

  // Smooth Curved Flowing Cartoon Cape
  let capePivot: THREE.Group | undefined;
  if (classId === 'wojownik' || classId === 'elf') {
    capePivot = new THREE.Group();
    capePivot.position.set(0, 1.3 * hScale, -0.24 * wScale);
    const capeGeo = new THREE.CylinderGeometry(
      0.34 * wScale,
      0.62 * wScale,
      0.98 * hScale,
      20,
      2,
      true,
      Math.PI * 0.66,
      Math.PI * 0.68
    );
    const capeMesh = createComicMesh(
      capeGeo,
      classId === 'wojownik' ? '#c82832' : '#1b7a4a',
      0.016,
      { side: THREE.DoubleSide }
    );
    capeMesh.position.set(0, -0.45 * hScale, 0.08);
    capeMesh.rotation.x = 0.2;
    capePivot.add(capeMesh);
    bodyGroup.add(capePivot);
  }

  // ==========================================
  // 3. BIG EXPRESSIVE CHIBI-CARTOON HEAD & FACE
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68 * hScale, 0);
  bodyGroup.add(headGroup);

  const neck = createComicMesh(new THREE.CapsuleGeometry(0.14, 0.1, 8, 14), pal.skin, 0.018);
  neck.position.y = -0.28;
  headGroup.add(neck);

  // Big plush round stylized cartoon head (radius 0.435 — soft & adorable heroic proportion!)
  const skull = createComicMesh(new THREE.SphereGeometry(0.435, 28, 22), pal.skin, 0.03);
  skull.scale.set(1.04, 0.97, 0.98);
  headGroup.add(skull);

  // Cute round side ears (for non-elves; elves get long pointed ears below)
  if (classId !== 'elf') {
    for (const s of [-1, 1]) {
      const ear = createComicMesh(new THREE.SphereGeometry(0.095, 12, 10), pal.skin, 0.018);
      ear.scale.set(0.65, 1.0, 0.85);
      ear.position.set(s * 0.43, -0.02, -0.02);
      headGroup.add(ear);
    }
  }

  // Expressive Layered Cartoon Eyes (White Sclera + Colored Iris + Dark Pupil + Twin Glints + Rosy Cheeks + Smile!)
  const scleraMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const irisMat = new THREE.MeshBasicMaterial({ color: pal.iris });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#141124' });
  const cheekMat = createToonMaterial(pal.cheek, { transparent: true, opacity: 0.48, rimStrength: 0 });
  const browMat = createToonMaterial(pal.hair);

  for (const s of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), scleraMat);
    sclera.scale.set(0.92, 1.15, 0.42);
    sclera.position.set(s * 0.155, 0.02, 0.39);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), irisMat);
    iris.scale.set(0.9, 1.12, 0.42);
    iris.position.set(s * 0.155, 0.016, 0.408);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), pupilMat);
    pupil.scale.set(0.9, 1.1, 0.42);
    pupil.position.set(s * 0.155, 0.014, 0.42);

    const glintBig = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), scleraMat);
    glintBig.position.set(s * 0.155 + 0.022, 0.052, 0.435);

    const glintSmall = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), scleraMat);
    glintSmall.position.set(s * 0.155 - 0.018, -0.008, 0.434);

    // Soft rosy cartoon cheeks
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), cheekMat);
    cheek.scale.set(1.25, 0.72, 0.35);
    cheek.position.set(s * 0.255, -0.075, 0.345);

    // Expressive curved eyebrows
    const browCurve = createTaperedCurveGeometry(
      [
        [s * 0.085, 0.145 + (classId === 'wojownik' || classId === 'krasnolud' ? -0.02 : 0.01), 0.395],
        [s * 0.16, 0.175, 0.39],
        [s * 0.235, 0.155 + (classId === 'wojownik' || classId === 'krasnolud' ? 0.02 : -0.01), 0.365],
      ],
      0.024,
      0.018,
      10,
      8
    );
    const brow = new THREE.Mesh(browCurve, browMat);

    headGroup.add(sclera, iris, pupil, glintBig, glintSmall, cheek, brow);
  }

  // Cute round button nose
  const nose = createComicMesh(new THREE.SphereGeometry(0.048, 12, 10), pal.skin, 0.012);
  nose.scale.set(1.05, 0.85, 1.1);
  nose.position.set(0, -0.035, 0.432);
  headGroup.add(nose);

  // Cute curved cartoon smile (visible for classes without giant mustache covering it)
  if (classId !== 'krasnolud') {
    const smileGeo = createTaperedCurveGeometry(
      [
        [-0.075, -0.115, 0.405],
        [0, -0.145, 0.422],
        [0.075, -0.115, 0.405],
      ],
      0.014,
      0.014,
      10,
      8
    );
    const smile = new THREE.Mesh(smileGeo, new THREE.MeshBasicMaterial({ color: '#7a3538' }));
    headGroup.add(smile);
  }

  let wingLeftGroup: THREE.Group | undefined;
  let wingRightGroup: THREE.Group | undefined;
  let orbitProp: THREE.Group | undefined;

  if (classId === 'wojownik') {
    // Plush Domed Cartoon Knight Helm + Smooth Tapered Curved Ivory Horns + Bouncy Crest Plume!
    const dome = createComicMesh(
      new THREE.SphereGeometry(0.475, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.57),
      '#7487a3',
      0.028
    );
    dome.position.y = 0.06;

    const helmBand = createComicMesh(new THREE.TorusGeometry(0.47, 0.056, 12, 28), pal.trim, 0.02);
    helmBand.rotation.x = Math.PI / 2;
    helmBand.position.y = 0.085;

    const noseGuard = createComicMesh(new THREE.CapsuleGeometry(0.042, 0.16, 8, 12), pal.trim, 0.016);
    noseGuard.position.set(0, 0.03, 0.455);

    // Fluffy cloud-like comic crest plume along helm top!
    for (let p = 0; p < 5; p++) {
      const puff = createComicMesh(
        new THREE.SphereGeometry(0.145 - p * 0.014, 14, 12),
        p % 2 === 0 ? '#ef4444' : '#dc2626',
        0.02
      );
      puff.position.set(0, 0.54 - p * 0.045, 0.08 - p * 0.15);
      headGroup.add(puff);
    }

    // Smooth tapered curved Viking/Knight horns using Catmull-Rom tube!
    for (const s of [-1, 1]) {
      const hornGeo = createTaperedCurveGeometry(
        [
          [s * 0.41, 0.24, 0.02],
          [s * 0.64, 0.34, 0.08],
          [s * 0.72, 0.56, 0.14],
          [s * 0.58, 0.74, 0.16],
        ],
        0.095,
        0.02,
        16,
        12
      );
      const horn = createComicMesh(hornGeo, '#fbf5e6', 0.022);
      const hornRing = createComicMesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), pal.trim, 0.014);
      hornRing.position.set(s * 0.44, 0.25, 0.03);
      hornRing.rotation.y = Math.PI / 2;
      headGroup.add(horn, hornRing);
    }
    headGroup.add(dome, helmBand, noseGuard);
  } else if (classId === 'czarnoksieznik') {
    // Soft silver side hair curls + plush curved Wizard Hat w/ drooping curl & golden star!
    for (const s of [-1, 1]) {
      const curl = createComicMesh(new THREE.SphereGeometry(0.14, 14, 12), pal.hair, 0.02);
      curl.scale.set(0.85, 1.35, 0.95);
      curl.position.set(s * 0.38, -0.05, -0.08);
      headGroup.add(curl);
    }
    const brim = createComicMesh(
      createPlushLathe(
        [
          [0.01, -0.05],
          [0.74, -0.04],
          [0.78, 0.01],
          [0.72, 0.06],
          [0.4, 0.12],
          [0.01, 0.13],
        ],
        28
      ),
      '#582d99',
      0.028
    );
    brim.position.y = 0.24;
    brim.rotation.x = -0.08;

    const band = createComicMesh(new THREE.TorusGeometry(0.43, 0.068, 12, 26), pal.trim, 0.02);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.34;

    // Smooth organically bent witch/wizard hat spire using tapered curve!
    const hatSpireGeo = createTaperedCurveGeometry(
      [
        [0, 0.32, 0],
        [0.02, 0.62, -0.06],
        [0.12, 0.92, -0.22],
        [0.24, 1.06, -0.46],
        [0.18, 0.94, -0.62],
      ],
      0.42,
      0.04,
      20,
      16
    );
    const hatSpire = createComicMesh(hatSpireGeo, '#6434ad', 0.028);

    const tipStar = createComicMesh(createSoftStarGeometry(0.13, 0.068, 5, 0.045), '#fde047', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.28,
    });
    tipStar.position.set(0.18, 0.9, -0.64);
    headGroup.add(brim, band, hatSpire, tipStar);

    // Floating rounded spellbook with glowing heart emblem
    orbitProp = new THREE.Group();
    orbitProp.position.y = 1.18;
    const book = createComicMesh(createRoundedBoxGeometry(0.32, 0.38, 0.12, 0.05, 5), '#6d28d9', 0.022);
    book.position.set(-0.92, 0.12, 0.28);
    book.rotation.y = 0.45;
    const bookGem = createComicMesh(new THREE.SphereGeometry(0.08, 12, 10), '#fbbf24', 0.014, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.25,
    });
    bookGem.position.set(-0.92, 0.12, 0.35);
    orbitProp.add(book, bookGem);
    bodyGroup.add(orbitProp);
  } else if (classId === 'elf') {
    // Lush Golden Cartoon Hair with sculpted bangs, bouncy ponytail, leaf circlet & soft long ears!
    const hairCrown = createComicMesh(new THREE.SphereGeometry(0.46, 24, 18), pal.hair, 0.026);
    hairCrown.position.set(0, 0.08, -0.06);

    // Soft sculpted hair bang locks framing face
    for (const s of [-1, 1]) {
      const bangGeo = createTaperedCurveGeometry(
        [
          [0, 0.42, 0.12],
          [s * 0.24, 0.3, 0.34],
          [s * 0.38, 0.08, 0.26],
        ],
        0.13,
        0.045,
        12,
        10
      );
      const bang = createComicMesh(bangGeo, pal.hair, 0.02);

      // Cute long rounded elf ears
      const earGeo = createTaperedCurveGeometry(
        [
          [s * 0.4, 0.02, -0.02],
          [s * 0.58, 0.08, -0.06],
          [s * 0.72, 0.17, -0.1],
        ],
        0.085,
        0.02,
        12,
        10
      );
      const ear = createComicMesh(earGeo, pal.skin, 0.018);
      headGroup.add(bang, ear);
    }

    // Swishy curved golden ponytail
    const tailGeo = createTaperedCurveGeometry(
      [
        [0, 0.12, -0.44],
        [0, -0.06, -0.62],
        [0, -0.34, -0.66],
        [0, -0.52, -0.58],
      ],
      0.16,
      0.045,
      14,
      12
    );
    const ponytail = createComicMesh(tailGeo, pal.hair, 0.024);

    const circlet = createComicMesh(new THREE.TorusGeometry(0.43, 0.042, 10, 26), pal.trim, 0.016);
    circlet.rotation.x = Math.PI / 2 - 0.12;
    circlet.position.y = 0.18;

    const circletGem = createComicMesh(new THREE.SphereGeometry(0.08, 12, 10), '#34d399', 0.014, {
      emissive: '#10b981',
      emissiveIntensity: 0.25,
    });
    circletGem.position.set(0, 0.23, 0.44);
    headGroup.add(hairCrown, ponytail, circlet, circletGem);

    // Rounded leather quiver w/ fluffy green arrow fletchings
    const quiver = createComicMesh(new THREE.CapsuleGeometry(0.125, 0.48, 10, 14), '#7a4928', 0.022);
    quiver.position.set(-0.26, 1.15 * hScale, -0.34);
    quiver.rotation.z = 0.28;
    for (let a = -1; a <= 1; a++) {
      const fletch = createComicMesh(new THREE.SphereGeometry(0.072, 10, 10), '#4ade80', 0.014);
      fletch.scale.set(0.85, 1.65, 0.85);
      fletch.position.set(a * 0.06, 0.36, 0);
      quiver.add(fletch);
    }
    bodyGroup.add(quiver);
  } else if (classId === 'krasnolud') {
    // Round Riveted Dwarf Helm + Smooth Curved Horns + GIANT Fluffy Cloud-Beard & Curled Mustache!
    const helm = createComicMesh(
      new THREE.SphereGeometry(0.475, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
      '#73849e',
      0.028
    );
    helm.position.y = 0.07;
    const helmRim = createComicMesh(new THREE.TorusGeometry(0.47, 0.06, 12, 26), pal.trim, 0.02);
    helmRim.rotation.x = Math.PI / 2;
    helmRim.position.y = 0.07;

    for (const s of [-1, 1]) {
      // Curled handlebar cartoon mustache!
      const stacheGeo = createTaperedCurveGeometry(
        [
          [0, -0.1, 0.42],
          [s * 0.16, -0.12, 0.42],
          [s * 0.32, -0.06, 0.36],
          [s * 0.38, 0.02, 0.32],
        ],
        0.095,
        0.032,
        12,
        10
      );
      const stache = createComicMesh(stacheGeo, pal.hair, 0.02);

      // Cute curved stubby dwarf horns
      const miniHornGeo = createTaperedCurveGeometry(
        [
          [s * 0.42, 0.22, 0],
          [s * 0.58, 0.32, 0.04],
          [s * 0.56, 0.5, 0.06],
        ],
        0.085,
        0.022,
        12,
        10
      );
      const miniHorn = createComicMesh(miniHornGeo, '#fbf5e6', 0.02);
      headGroup.add(stache, miniHorn);
    }

    // Lush cloud-shaped braided ginger beard!
    const beardPuffs: Array<[number, number, number, number]> = [
      [0, -0.26, 0.32, 0.25],
      [-0.2, -0.22, 0.26, 0.2],
      [0.2, -0.22, 0.26, 0.2],
      [0, -0.47, 0.31, 0.21],
      [-0.14, -0.4, 0.26, 0.17],
      [0.14, -0.4, 0.26, 0.17],
      [0, -0.66, 0.29, 0.15],
    ];
    for (const [bx, by, bz, br] of beardPuffs) {
      const puff = createComicMesh(new THREE.SphereGeometry(br, 16, 14), pal.hair, 0.022);
      puff.position.set(bx, by, bz);
      headGroup.add(puff);
    }
    const beardRing = createComicMesh(new THREE.TorusGeometry(0.155, 0.042, 10, 18), pal.trim, 0.015);
    beardRing.rotation.x = Math.PI / 2;
    beardRing.position.set(0, -0.56, 0.3);
    headGroup.add(helm, helmRim, beardRing);
  } else if (classId === 'wrozka') {
    // Plush Pastel Cartoon Hair + Big Cute Twin Buns + Soft 3D Star Tiara + Sculpted Butterfly Wings!
    const hair = createComicMesh(new THREE.SphereGeometry(0.455, 24, 18), pal.hair, 0.026);
    hair.position.set(0, 0.07, -0.05);

    // Cute soft bangs
    for (const s of [-1, 1]) {
      const bang = createComicMesh(new THREE.SphereGeometry(0.18, 14, 12), pal.hair, 0.02);
      bang.scale.set(1.25, 0.78, 0.85);
      bang.position.set(s * 0.2, 0.26, 0.27);

      const bun = createComicMesh(new THREE.SphereGeometry(0.22, 18, 14), pal.hair, 0.024);
      bun.position.set(s * 0.4, 0.3, -0.08);
      const ribbon = createComicMesh(new THREE.TorusGeometry(0.16, 0.042, 10, 18), pal.trim, 0.016);
      ribbon.position.set(s * 0.31, 0.24, -0.06);
      ribbon.rotation.y = s * 0.85;
      headGroup.add(bang, bun, ribbon);
    }

    const tiara = createComicMesh(new THREE.TorusGeometry(0.36, 0.042, 10, 22), pal.trim, 0.016);
    tiara.rotation.x = Math.PI / 2;
    tiara.position.y = 0.32;

    const starGem = createComicMesh(createSoftStarGeometry(0.14, 0.072, 5, 0.045), '#fde047', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.3,
    });
    starGem.position.set(0, 0.38, 0.34);
    headGroup.add(hair, tiara, starGem);

    // Sculpted Bezier Butterfly Wings (translucent pastel sky-blue + soft outline!)
    const wingGeo = createSoftWingGeometry(0.95, 0.9, 0.04, 'butterfly');
    const makeWingPair = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.14, 1.15 * hScale, -0.26);
      const wingMat = createToonMaterial('#9be2ff', {
        emissive: '#60c8f5',
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
      });
      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      if (side === -1) wingMesh.scale.x = -1;
      wingMesh.rotation.y = -side * 0.25;
      wg.add(wingMesh);
      return wg;
    };

    wingLeftGroup = makeWingPair(-1);
    wingRightGroup = makeWingPair(1);
    bodyGroup.add(wingLeftGroup, wingRightGroup);
  }

  // ==========================================
  // 4. PLUSH ARMS, MITTEN HANDS & SCULPTED WEAPONS
  // ==========================================
  const makeArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.49 * wScale, 1.24 * hScale, 0);

    // Plush puffed cartoon shoulder / pauldron
    const pauldron = createComicMesh(
      new THREE.SphereGeometry(
        classId === 'wojownik' || classId === 'krasnolud' ? 0.26 : classId === 'wrozka' ? 0.21 : 0.19,
        18,
        14
      ),
      classId === 'wrozka' ? pal.secondary : pal.trim,
      0.024
    );
    pauldron.scale.set(1.12, 0.9, 1.02);

    const arm = createComicMesh(
      new THREE.CapsuleGeometry(0.12, 0.34 * hScale, 10, 16),
      pal.primary,
      0.024
    );
    arm.position.y = -0.24 * hScale;

    const cuff = createComicMesh(
      new THREE.TorusGeometry(0.125, 0.042, 10, 18),
      pal.secondary,
      0.018
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.4 * hScale;

    // Plump mitten hand + little thumb!
    const hand = createComicMesh(new THREE.SphereGeometry(0.135, 16, 12), pal.skin, 0.022);
    hand.position.y = -0.52 * hScale;
    const thumb = createComicMesh(new THREE.SphereGeometry(0.055, 10, 8), pal.skin, 0.014);
    thumb.position.set(-side * 0.09, -0.5 * hScale, 0.07);

    pivot.add(pauldron, arm, cuff, hand, thumb);
    return pivot;
  };

  const leftArmPivot = makeArm(-1);
  const rightArmPivot = makeArm(1);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Offhand gear (domed shields & rounded dagger — zero boxes!)
  if (classId === 'krasnolud') {
    const shield = createComicMesh(new THREE.SphereGeometry(0.48, 22, 16), '#6b7a94', 0.028);
    shield.scale.set(1, 1, 0.32);
    shield.position.set(-0.2, -0.44 * hScale, 0.26);
    const rim = createComicMesh(new THREE.TorusGeometry(0.47, 0.062, 10, 24), pal.trim, 0.02);
    rim.position.set(-0.2, -0.44 * hScale, 0.28);
    const boss = createComicMesh(new THREE.SphereGeometry(0.16, 16, 12), pal.trim, 0.02);
    boss.position.set(-0.2, -0.44 * hScale, 0.36);
    leftArmPivot.add(shield, rim, boss);
  } else if (classId === 'wojownik') {
    const buckler = createComicMesh(new THREE.SphereGeometry(0.36, 20, 14), '#6b7a94', 0.024);
    buckler.scale.set(0.35, 1, 1);
    buckler.position.set(-0.18, -0.4 * hScale, 0.1);
    const rim = createComicMesh(new THREE.TorusGeometry(0.35, 0.048, 10, 22), pal.trim, 0.018);
    rim.rotation.y = Math.PI / 2;
    rim.position.set(-0.2, -0.4 * hScale, 0.1);
    leftArmPivot.add(buckler, rim);
  } else if (classId === 'elf') {
    const dagger = createComicMesh(createSoftBladeGeometry(0.14, 0.56, 0.05, 'sword'), '#e4ecf5', 0.018);
    dagger.rotation.x = Math.PI / 2;
    dagger.position.set(0, -0.52 * hScale, 0.12);
    leftArmPivot.add(dagger);
  }

  // Primary Weapon on Right Hand (Sculpted Storybook Weapons — ZERO boxes!)
  const weaponAttach = new THREE.Group();
  weaponAttach.position.set(0, -0.52 * hScale, 0.16);
  weaponAttach.rotation.x = Math.PI * 0.36;
  rightArmPivot.add(weaponAttach);

  let weaponGlowMesh: THREE.Mesh;

  if (classId === 'wojownik') {
    const grip = createComicMesh(new THREE.CapsuleGeometry(0.052, 0.32, 8, 14), '#6b3516', 0.018);
    const pommel = createComicMesh(new THREE.SphereGeometry(0.115, 16, 12), '#ef4444', 0.018);
    pommel.position.y = -0.22;

    // Sculpted curved cartoon crossguard!
    const guardGeo = createTaperedCurveGeometry(
      [
        [-0.36, 0.25, 0],
        [-0.18, 0.18, 0],
        [0.18, 0.18, 0],
        [0.36, 0.25, 0],
      ],
      0.075,
      0.075,
      14,
      12
    );
    const guard = createComicMesh(guardGeo, pal.trim, 0.02);
    const guardGem = createComicMesh(new THREE.SphereGeometry(0.085, 12, 10), '#38bdf8', 0.014, {
      emissive: '#0284c7',
      emissiveIntensity: 0.24,
    });
    guardGem.position.set(0, 0.19, 0.08);

    // Chunky sculpted leaf-belly cartoon broadsword blade!
    const blade = createComicMesh(createSoftBladeGeometry(0.38, 1.48, 0.09, 'sword'), '#e2ebf5', 0.024);
    blade.position.y = 0.24;
    weaponAttach.add(grip, pommel, guard, guardGem, blade);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 1.3, 8, 14),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.y = 0.98;
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'czarnoksieznik') {
    // Organic curved gnarled wizard staff!
    const shaftGeo = createTaperedCurveGeometry(
      [
        [0, -0.3, 0],
        [-0.04, 0.4, 0.02],
        [0.06, 1.05, -0.02],
        [0.14, 1.55, 0],
        [-0.12, 1.82, 0],
        [-0.24, 1.58, 0],
      ],
      0.062,
      0.036,
      22,
      12
    );
    const shaft = createComicMesh(shaftGeo, '#693d22', 0.022);
    const crystal = createComicMesh(new THREE.SphereGeometry(0.2, 18, 16), '#c084fc', 0.022, {
      emissive: '#9333ea',
      emissiveIntensity: 0.34,
    });
    crystal.position.set(-0.04, 1.58, 0);
    const haloRing = createComicMesh(new THREE.TorusGeometry(0.28, 0.035, 10, 22), pal.trim, 0.015);
    haloRing.position.set(-0.04, 1.58, 0);
    haloRing.rotation.x = 0.6;
    weaponAttach.add(shaft, crystal, haloRing);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12),
      new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.set(-0.04, 1.58, 0);
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'elf') {
    // Curved recurve fairytale bow!
    const bowGeo = createTaperedCurveGeometry(
      [
        [0, -0.58, 0.05],
        [0, -0.36, 0.34],
        [0, 0, 0.46],
        [0, 0.36, 0.34],
        [0, 0.58, 0.05],
      ],
      0.038,
      0.038,
      20,
      12
    );
    const bowWood = createComicMesh(bowGeo, '#229963', 0.02);
    bowWood.position.set(0, 0.25, 0.06);
    const bowString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 1.16, 8),
      new THREE.MeshBasicMaterial({ color: '#f1f5f9' })
    );
    bowString.position.set(0, 0.25, 0.12);
    const arrowShaft = createComicMesh(new THREE.CapsuleGeometry(0.025, 0.72, 6, 10), '#fde047', 0.012);
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.set(0, 0.25, 0.48);
    const arrowHead = createComicMesh(new THREE.SphereGeometry(0.075, 12, 10), '#34d399', 0.015, {
      emissive: '#10b981',
      emissiveIntensity: 0.25,
    });
    arrowHead.scale.set(0.85, 0.85, 1.6);
    arrowHead.position.set(0, 0.25, 0.88);
    weaponAttach.add(bowWood, bowString, arrowShaft, arrowHead);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.085, 10, 22, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#34d399', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.rotation.z = -Math.PI / 2;
    weaponGlowMesh.position.set(0, 0.25, 0.16);
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'krasnolud') {
    // Plush rounded barrel-head Dwarven Warhammer!
    const handle = createComicMesh(new THREE.CapsuleGeometry(0.065, 1.24, 8, 14), '#7a4520', 0.022);
    handle.position.y = 0.52;
    const headBarrel = createComicMesh(new THREE.CapsuleGeometry(0.28, 0.36, 12, 20), '#8293ad', 0.028);
    headBarrel.rotation.z = Math.PI / 2;
    headBarrel.position.y = 1.2;
    for (const s of [-1, 1]) {
      const cap = createComicMesh(new THREE.TorusGeometry(0.26, 0.06, 10, 20), pal.trim, 0.02);
      cap.rotation.y = Math.PI / 2;
      cap.position.set(s * 0.26, 1.2, 0);
      weaponAttach.add(cap);
    }
    weaponAttach.add(handle, headBarrel);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.48, 8, 14),
      new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.rotation.z = Math.PI / 2;
    weaponGlowMesh.position.y = 1.2;
    weaponAttach.add(weaponGlowMesh);
  } else {
    // Magical Fairy Star Wand!
    const wand = createComicMesh(new THREE.CapsuleGeometry(0.042, 1.05, 8, 14), '#f7cf54', 0.018);
    wand.position.y = 0.45;
    const halo = createComicMesh(new THREE.TorusGeometry(0.24, 0.042, 10, 22), '#ffcae2', 0.016);
    halo.position.y = 1.14;
    const star = createComicMesh(createSoftStarGeometry(0.2, 0.105, 5, 0.065), '#fde047', 0.018, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.3,
    });
    star.position.y = 1.14;
    weaponAttach.add(wand, halo, star);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 12),
      new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.y = 1.14;
    weaponAttach.add(weaponGlowMesh);
  }

  // Soft Shield Shell + Ring
  const shieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.26, 24, 18),
    new THREE.MeshBasicMaterial({
      color: '#56b4e9',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  shieldShell.position.y = 1.05;
  root.add(shieldShell);

  const shieldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.046, 10, 32),
    new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  shieldRing.rotation.x = Math.PI / 2;
  shieldRing.position.y = 1.05;
  root.add(shieldRing);

  // Orbiting smooth rounded river-pebble shields for Dwarf Kamienna Skóra (ZERO boxes!)
  const stonePlatesGroup = new THREE.Group();
  stonePlatesGroup.position.y = 1.0;
  stonePlatesGroup.visible = false;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const pebble = createComicMesh(new THREE.SphereGeometry(0.32, 14, 12), '#8c847b', 0.022);
    pebble.scale.set(0.85, 1.15, 0.5);
    pebble.position.set(Math.cos(a) * 1.08, 0, Math.sin(a) * 1.08);
    pebble.rotation.y = -a + Math.PI / 2;
    stonePlatesGroup.add(pebble);
  }
  root.add(stonePlatesGroup);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    capePivot,
    wingLeftGroup,
    wingRightGroup,
    orbitProp,
    shieldShell,
    shieldRing,
    stonePlatesGroup,
    weaponGlowMesh,
    armorGlowRing,
    classId,
  };
}

export function updateCharacterRig(
  rig: CharacterRig,
  state: NetPlayerState,
  elapsedSec: number,
  nowMs: number
) {
  if (!state.alive) {
    rig.bodyGroup.rotation.x = Math.PI / 2;
    rig.bodyGroup.position.y = 0.22;
    (rig.shieldShell.material as THREE.MeshBasicMaterial).opacity = 0;
    (rig.shieldRing.material as THREE.MeshBasicMaterial).opacity = 0;
    rig.stonePlatesGroup.visible = false;
    return;
  }

  rig.bodyGroup.rotation.x = 0;

  if (rig.wingLeftGroup && rig.wingRightGroup) {
    const flap = Math.sin(elapsedSec * 14) * 0.42;
    rig.wingLeftGroup.rotation.y = 0.35 + flap;
    rig.wingRightGroup.rotation.y = -0.35 - flap;
  }

  if (rig.orbitProp) {
    rig.orbitProp.rotation.y = elapsedSec * 1.4;
    rig.orbitProp.position.y = 1.18 + Math.sin(elapsedSec * 3.5) * 0.1;
  }

  if (state.animState === 'spin') {
    rig.bodyGroup.rotation.y = elapsedSec * 17;
    rig.rightArmPivot.rotation.x = -Math.PI / 2;
    rig.rightArmPivot.rotation.z = -0.5;
    rig.leftArmPivot.rotation.x = -Math.PI / 3;
    rig.bodyGroup.position.y = 0.16;
  } else {
    rig.bodyGroup.rotation.y = 0;
    rig.rightArmPivot.rotation.z = 0;

    if (state.animState === 'run') {
      const stride = Math.sin(elapsedSec * 13);
      rig.leftLegPivot.rotation.x = stride * 0.72;
      rig.rightLegPivot.rotation.x = -stride * 0.72;
      rig.leftArmPivot.rotation.x = -stride * 0.58;
      rig.rightArmPivot.rotation.x = stride * 0.48 - 0.18;
      // Bouncy cartoon squash-and-stretch run!
      const bounce = Math.abs(stride);
      rig.bodyGroup.position.y = bounce * 0.16 + (rig.classId === 'wrozka' ? 0.18 : 0);
      rig.bodyGroup.scale.set(1 + (1 - bounce) * 0.055, 1 - (1 - bounce) * 0.055, 1 + (1 - bounce) * 0.055);
      rig.bodyGroup.rotation.x = 0.12;
      rig.headGroup.rotation.z = stride * 0.07;
      if (rig.capePivot) rig.capePivot.rotation.x = 0.28 + bounce * 0.2;
    } else if (state.animState === 'attack' || state.animState === 'cast') {
      const swing = Math.sin(elapsedSec * 22);
      rig.rightArmPivot.rotation.x = -1.25 + swing * 1.0;
      rig.leftArmPivot.rotation.x = -0.45 - swing * 0.3;
      rig.leftLegPivot.rotation.x = 0.2;
      rig.rightLegPivot.rotation.x = -0.2;
      rig.bodyGroup.position.y = 0.07;
      rig.bodyGroup.scale.set(1.04, 0.96, 1.04);
      rig.headGroup.rotation.z = 0;
    } else if (state.animState === 'dash') {
      rig.bodyGroup.rotation.x = 0.34;
      rig.leftArmPivot.rotation.x = 0.65;
      rig.rightArmPivot.rotation.x = 0.65;
      rig.bodyGroup.position.y = 0.24;
      rig.bodyGroup.scale.set(0.92, 1.1, 0.92);
      rig.headGroup.rotation.z = 0;
    } else {
      const breath = Math.sin(elapsedSec * 3.1);
      rig.leftLegPivot.rotation.x = 0;
      rig.rightLegPivot.rotation.x = 0;
      rig.leftArmPivot.rotation.x = breath * 0.07;
      rig.rightArmPivot.rotation.x = -0.15 + breath * 0.08;
      rig.headGroup.rotation.y = Math.sin(elapsedSec * 1.45) * 0.11;
      rig.headGroup.rotation.z = Math.sin(elapsedSec * 2.1) * 0.035;
      rig.bodyGroup.position.y = (rig.classId === 'wrozka' ? 0.25 : 0) + breath * 0.05;
      rig.bodyGroup.scale.set(1 - breath * 0.02, 1 + breath * 0.025, 1 - breath * 0.02);
      if (rig.capePivot) rig.capePivot.rotation.x = 0.07 + breath * 0.05;
    }
  }

  const sMat = rig.shieldShell.material as THREE.MeshBasicMaterial;
  const rMat = rig.shieldRing.material as THREE.MeshBasicMaterial;
  if (state.shield > 0) {
    sMat.opacity = 0.14 + Math.sin(elapsedSec * 5) * 0.03;
    rMat.opacity = 0.44 + Math.sin(elapsedSec * 5) * 0.09;
    rig.shieldShell.rotation.y = elapsedSec * 0.8;
    rig.shieldRing.rotation.z = -elapsedSec * 1.6;
  } else {
    sMat.opacity = 0;
    rMat.opacity = 0;
  }

  const stoneActive = nowMs < state.stoneSkinUntil;
  rig.stonePlatesGroup.visible = stoneActive;
  if (stoneActive) {
    rig.stonePlatesGroup.rotation.y = elapsedSec * 2.4;
  }

  const wGlow = state.weaponGlow || 0;
  const wMat = rig.weaponGlowMesh.material as THREE.MeshBasicMaterial;
  if (wGlow >= 7) {
    const glowCol = getUpgradeGlowColor(wGlow);
    if (glowCol) {
      if (wGlow === 13) wMat.color.setHSL((elapsedSec * 0.4) % 1, 0.82, 0.58);
      else wMat.color.copy(glowCol);
      wMat.opacity = 0.18 + ((wGlow - 6) / 7) * 0.14 + Math.sin(elapsedSec * 7) * 0.04;
    }
  } else {
    wMat.opacity = 0;
  }

  const aGlow = state.armorGlow || 0;
  const aMat = rig.armorGlowRing.material as THREE.MeshBasicMaterial;
  if (aGlow >= 7) {
    const glowCol = getUpgradeGlowColor(aGlow);
    if (glowCol) {
      if (aGlow === 13) aMat.color.setHSL((elapsedSec * 0.4 + 0.5) % 1, 0.82, 0.58);
      else aMat.color.copy(glowCol);
      aMat.opacity = 0.28 + Math.sin(elapsedSec * 5) * 0.08;
    }
  } else {
    aMat.opacity = 0;
  }
}

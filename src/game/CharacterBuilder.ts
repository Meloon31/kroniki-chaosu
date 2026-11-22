import * as THREE from 'three';
import type { ClassId, NetPlayerState } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createRoundedBoxGeometry,
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

  root.add(createContactShadow(0.9, 0.44));

  // Subtle selection ring (can be hidden in 3D Main Menu showcase)
  const ringGeo = new THREE.RingGeometry(0.76, 0.87, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isLocal ? '#f5b942' : '#56b4e9',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: options?.hideSelectionRing ? 0 : isLocal ? 0.48 : 0.34,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  root.add(ring);

  const auraGeo = new THREE.RingGeometry(0.92, 1.14, 32);
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
  const hScale = isDwarf ? 0.82 : isFairy ? 0.95 : isElf ? 1.04 : 1.0;
  const wScale = isDwarf ? 1.22 : isFairy ? 0.86 : isElf ? 0.92 : 1.04;

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
      eye: string;
    }
  > = {
    wojownik: {
      primary: '#d43f3a',
      secondary: '#526075',
      trim: '#e6b446',
      skin: '#f7c9a6',
      cheek: '#f08c7d',
      boots: '#32384c',
      hair: '#4a2e22',
      eye: '#1c1d2b',
    },
    czarnoksieznik: {
      primary: '#5d3494',
      secondary: '#312354',
      trim: '#e0ad48',
      skin: '#f3d8c2',
      cheek: '#e69ba8',
      boots: '#241c3b',
      hair: '#dbe4f0',
      eye: '#c084fc',
    },
    elf: {
      primary: '#248f63',
      secondary: '#6b4c32',
      trim: '#e6c25b',
      skin: '#f9dcc4',
      cheek: '#f29b92',
      boots: '#4a3423',
      hair: '#f2cf66',
      eye: '#15803d',
    },
    krasnolud: {
      primary: '#b85a24',
      secondary: '#5c6678',
      trim: '#e2ae48',
      skin: '#f2c19c',
      cheek: '#eb8775',
      boots: '#3e332e',
      hair: '#de5e1c',
      eye: '#242c3b',
    },
    wrozka: {
      primary: '#e0639b',
      secondary: '#fcebf2',
      trim: '#f0c854',
      skin: '#fde6e0',
      cheek: '#f799b4',
      boots: '#b54e80',
      hair: '#f7c2d9',
      eye: '#3b82f6',
    },
  };
  const pal = palettes[classId];

  // ==========================================
  // 1. PLUSH CAPSULE LEGS & ROUNDED CARTOON BOOTS
  // ==========================================
  const makeLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21 * wScale, 0.62 * hScale, 0);

    const leg = createComicMesh(
      new THREE.CapsuleGeometry(0.135 * wScale, 0.26 * hScale, 8, 14),
      pal.secondary,
      0.022
    );
    leg.position.y = -0.22 * hScale;

    const cuff = createComicMesh(
      new THREE.TorusGeometry(0.145 * wScale, 0.045, 8, 16),
      pal.trim,
      0.018
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.34 * hScale;

    const boot = createComicMesh(
      new THREE.CapsuleGeometry(0.14 * wScale, 0.16 * hScale, 8, 14),
      pal.boots,
      0.024
    );
    boot.position.y = -0.45 * hScale;

    // Plump rounded cartoon boot toe (Sphere instead of rectangular box!)
    const toe = createComicMesh(
      new THREE.SphereGeometry(0.145 * wScale, 14, 10),
      pal.boots,
      0.022
    );
    toe.scale.set(0.95, 0.72, 1.38);
    toe.position.set(0, -0.54 * hScale, 0.11);

    pivot.add(leg, cuff, boot, toe);
    return pivot;
  };

  const leftLegPivot = makeLeg(-1);
  const rightLegPivot = makeLeg(1);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  // ==========================================
  // 2. SOFT ORGANIC TORSO & FLOWING ROBES / ARMOR
  // ==========================================
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.64 * hScale;
  bodyGroup.add(torsoGroup);

  if (classId === 'czarnoksieznik' || classId === 'wrozka') {
    // Smooth lathed bell-shaped cartoon robe / dress!
    const lathePts = [
      new THREE.Vector2(0.02, -0.34 * hScale),
      new THREE.Vector2(0.49 * wScale, -0.34 * hScale),
      new THREE.Vector2(0.44 * wScale, -0.14 * hScale),
      new THREE.Vector2(0.28 * wScale, 0.18 * hScale),
      new THREE.Vector2(0.35 * wScale, 0.56 * hScale),
      new THREE.Vector2(0.26 * wScale, 0.74 * hScale),
      new THREE.Vector2(0.02, 0.76 * hScale),
    ];
    const robeGeo = new THREE.LatheGeometry(lathePts, 20);
    const robe = createComicMesh(robeGeo, pal.primary, 0.028);

    const hemTrim = createComicMesh(
      new THREE.TorusGeometry(0.48 * wScale, 0.048, 8, 22),
      pal.trim,
      0.018
    );
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.position.y = -0.31 * hScale;

    const sash = createComicMesh(
      new THREE.TorusGeometry(0.30 * wScale, 0.06, 8, 20),
      pal.trim,
      0.018
    );
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 0.22 * hScale;

    torsoGroup.add(robe, hemTrim, sash);

    if (classId === 'czarnoksieznik') {
      // Plush curved arcane shawl collar
      const shawl = createComicMesh(
        new THREE.TorusGeometry(0.34 * wScale, 0.11, 10, 20),
        pal.secondary,
        0.022
      );
      shawl.rotation.x = Math.PI / 2 - 0.15;
      shawl.position.y = 0.68 * hScale;
      torsoGroup.add(shawl);
    } else {
      // Soft rounded scalloped flower petals around Fairy waist!
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const petal = createComicMesh(
          new THREE.SphereGeometry(0.18, 12, 10),
          i % 2 === 0 ? pal.secondary : pal.primary,
          0.018
        );
        petal.scale.set(0.95, 1.35, 0.55);
        petal.position.set(Math.cos(a) * 0.34, 0.05 * hScale, Math.sin(a) * 0.34);
        petal.rotation.y = -a + Math.PI / 2;
        petal.rotation.x = 0.32;
        torsoGroup.add(petal);
      }
    }
  } else {
    // Plush sculpted heroic rounded capsule torso (NO blocky cubes!)
    const chest = createComicMesh(
      new THREE.CapsuleGeometry(0.37 * wScale, 0.38 * hScale, 10, 18),
      pal.primary,
      0.028
    );
    chest.scale.set(1.08, 1.0, 0.84);
    chest.position.y = 0.42 * hScale;

    // Rounded beveled chestplate overlay
    const plate = createComicMesh(
      createRoundedBoxGeometry(0.56 * wScale, 0.44 * hScale, 0.26, 0.09, 4),
      pal.secondary,
      0.022
    );
    plate.position.set(0, 0.48 * hScale, 0.20 * wScale);

    const gem = createComicMesh(new THREE.SphereGeometry(0.11, 12, 10), pal.trim, 0.016);
    gem.scale.set(1, 1.25, 0.55);
    gem.position.set(0, 0.50 * hScale, 0.34 * wScale);

    // Plush rounded belt torus + rounded buckle
    const belt = createComicMesh(
      new THREE.TorusGeometry(0.35 * wScale, 0.075, 10, 22),
      '#4d3221',
      0.02
    );
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.05, 0.85, 1);
    belt.position.y = 0.09 * hScale;

    const buckle = createComicMesh(
      createRoundedBoxGeometry(0.20, 0.17, 0.10, 0.04, 3),
      pal.trim,
      0.016
    );
    buckle.position.set(0, 0.09 * hScale, 0.32 * wScale);

    torsoGroup.add(chest, plate, gem, belt, buckle);

    if (classId === 'wojownik' || classId === 'krasnolud') {
      for (const s of [-1, 1]) {
        const tasset = createComicMesh(
          createRoundedBoxGeometry(0.25 * wScale, 0.28 * hScale, 0.34, 0.07, 3),
          pal.secondary,
          0.02
        );
        tasset.position.set(s * 0.34 * wScale, -0.07 * hScale, 0);
        tasset.rotation.z = s * 0.16;
        torsoGroup.add(tasset);
      }
    }
  }

  // Curved Flowing Cartoon Cape (bent cylindrical mantle instead of flat slab!)
  let capePivot: THREE.Group | undefined;
  if (classId === 'wojownik' || classId === 'elf') {
    capePivot = new THREE.Group();
    capePivot.position.set(0, 1.38 * hScale, -0.22 * wScale);
    const capeGeo = new THREE.CylinderGeometry(
      0.34 * wScale,
      0.56 * wScale,
      0.98 * hScale,
      14,
      1,
      true,
      Math.PI * 0.68,
      Math.PI * 0.64
    );
    const capeMesh = new THREE.Mesh(
      capeGeo,
      createToonMaterial(classId === 'wojownik' ? '#a62626' : '#18663d', {
        side: THREE.DoubleSide,
      })
    );
    capeMesh.position.set(0, -0.46 * hScale, 0.06);
    capeMesh.rotation.x = 0.18;
    capeMesh.castShadow = true;
    capePivot.add(capeMesh);
    bodyGroup.add(capePivot);
  }

  // ==========================================
  // 3. EXPRESSIVE SOFT CARTOON HEAD & FACE
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.65 * hScale, 0);
  bodyGroup.add(headGroup);

  const neck = createComicMesh(new THREE.CapsuleGeometry(0.13, 0.10, 6, 12), pal.skin, 0.016);
  neck.position.y = -0.24;
  headGroup.add(neck);

  // Plush slightly stylized round head!
  const skull = createComicMesh(new THREE.SphereGeometry(0.355, 20, 16), pal.skin, 0.026);
  skull.scale.set(1.02, 0.99, 0.98);
  headGroup.add(skull);

  // Expressive glossy cartoon eyes + dual highlights + soft rosy cheeks + curved brows!
  const eyeMat = new THREE.MeshBasicMaterial({ color: pal.eye });
  const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const cheekMat = createToonMaterial(pal.cheek, { transparent: true, opacity: 0.45 });
  const browMat = createToonMaterial(pal.hair);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), eyeMat);
    eye.scale.set(0.88, 1.18, 0.55);
    eye.position.set(s * 0.125, 0.02, 0.318);

    const glintBig = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), glintMat);
    glintBig.position.set(s * 0.125 + 0.016, 0.048, 0.348);

    const glintSmall = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), glintMat);
    glintSmall.position.set(s * 0.125 - 0.014, 0.002, 0.345);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), cheekMat);
    cheek.scale.set(1.2, 0.72, 0.4);
    cheek.position.set(s * 0.20, -0.055, 0.275);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.085, 6, 8), browMat);
    brow.rotation.z =
      Math.PI / 2 + (classId === 'wojownik' || classId === 'krasnolud' ? -s * 0.22 : s * 0.1);
    brow.position.set(s * 0.125, 0.125, 0.325);

    headGroup.add(eye, glintBig, glintSmall, cheek, brow);
  }

  // Cute rounded button nose
  const nose = createComicMesh(new THREE.SphereGeometry(0.042, 10, 8), pal.skin, 0.01);
  nose.scale.set(1.0, 0.85, 1.1);
  nose.position.set(0, -0.025, 0.352);
  headGroup.add(nose);

  let wingLeftGroup: THREE.Group | undefined;
  let wingRightGroup: THREE.Group | undefined;
  let orbitProp: THREE.Group | undefined;

  if (classId === 'wojownik') {
    // Rounded Domed Cartoon Knight Helm + Plump Curved Ivory Horns + Fluffy Crest Plume
    const dome = createComicMesh(
      new THREE.SphereGeometry(0.395, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
      '#68778d',
      0.026
    );
    dome.position.y = 0.05;
    const helmBand = createComicMesh(new THREE.TorusGeometry(0.39, 0.045, 8, 20), pal.trim, 0.018);
    helmBand.rotation.x = Math.PI / 2;
    helmBand.position.y = 0.08;
    const noseGuard = createComicMesh(new THREE.CapsuleGeometry(0.036, 0.18, 6, 10), pal.trim, 0.016);
    noseGuard.position.set(0, 0.03, 0.37);

    // Sculpted bubbly comic plume along crest!
    for (let p = 0; p < 4; p++) {
      const puff = createComicMesh(
        new THREE.SphereGeometry(0.115 - p * 0.012, 10, 8),
        '#dc2626',
        0.018
      );
      puff.position.set(0, 0.44 - p * 0.04, 0.06 - p * 0.14);
      headGroup.add(puff);
    }

    // Smooth curved horns (bent torus arcs!)
    for (const s of [-1, 1]) {
      const horn = createComicMesh(
        new THREE.TorusGeometry(0.22, 0.065, 8, 14, Math.PI * 0.72),
        '#f2ece0',
        0.02
      );
      horn.position.set(s * 0.36, 0.24, 0.02);
      horn.rotation.z = s === 1 ? -0.45 : Math.PI + 0.45;
      horn.rotation.y = s * 0.25;
      headGroup.add(horn);
    }
    headGroup.add(dome, helmBand, noseGuard);
  } else if (classId === 'czarnoksieznik') {
    // Plump Curled Cartoon Wizard Hat + Floating Rounded Spellbook!
    const brim = createComicMesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 22), '#462375', 0.026);
    brim.position.y = 0.21;
    brim.rotation.x = -0.07;
    const band = createComicMesh(new THREE.TorusGeometry(0.37, 0.055, 8, 20), pal.trim, 0.018);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.27;
    const hatMid = createComicMesh(new THREE.CapsuleGeometry(0.26, 0.26, 8, 16), '#562a8f', 0.026);
    hatMid.position.set(0, 0.48, -0.05);
    hatMid.rotation.x = -0.22;
    const hatTip = createComicMesh(new THREE.ConeGeometry(0.22, 0.52, 16), '#462375', 0.024);
    hatTip.position.set(0.09, 0.82, -0.24);
    hatTip.rotation.x = -0.68;
    hatTip.rotation.z = -0.28;
    const tipBall = createComicMesh(new THREE.SphereGeometry(0.065, 10, 8), pal.trim, 0.015);
    tipBall.position.set(0.18, 0.96, -0.44);
    headGroup.add(brim, band, hatMid, hatTip, tipBall);

    orbitProp = new THREE.Group();
    orbitProp.position.y = 1.15;
    const book = createComicMesh(createRoundedBoxGeometry(0.28, 0.34, 0.10, 0.03, 3), '#5b21b6', 0.02);
    book.position.set(-0.82, 0.1, 0.26);
    book.rotation.y = 0.45;
    orbitProp.add(book);
    bodyGroup.add(orbitProp);
  } else if (classId === 'elf') {
    // Lush Layered Golden Cartoon Hair + Smooth Pointed Ears + Leaf Circlet + Quiver
    const hairCrown = createComicMesh(new THREE.SphereGeometry(0.385, 18, 14), pal.hair, 0.024);
    hairCrown.position.set(0, 0.08, -0.05);
    const bangL = createComicMesh(new THREE.SphereGeometry(0.18, 12, 10), pal.hair, 0.018);
    bangL.scale.set(1.2, 0.75, 0.85);
    bangL.position.set(-0.20, 0.22, 0.20);
    const bangR = bangL.clone();
    bangR.position.x = 0.20;
    const ponytail = createComicMesh(new THREE.CapsuleGeometry(0.13, 0.38, 8, 12), pal.hair, 0.022);
    ponytail.position.set(0, -0.10, -0.42);
    ponytail.rotation.x = 0.62;
    const circlet = createComicMesh(new THREE.TorusGeometry(0.355, 0.036, 8, 20), pal.trim, 0.015);
    circlet.rotation.x = Math.PI / 2 - 0.1;
    circlet.position.y = 0.14;

    for (const s of [-1, 1]) {
      const ear = createComicMesh(new THREE.CapsuleGeometry(0.052, 0.22, 6, 10), pal.skin, 0.018);
      ear.position.set(s * 0.38, 0.02, -0.02);
      ear.rotation.z = -s * 1.18;
      headGroup.add(ear);
    }
    headGroup.add(hairCrown, bangL, bangR, ponytail, circlet);

    const quiver = createComicMesh(new THREE.CapsuleGeometry(0.105, 0.48, 8, 12), '#6b4226', 0.02);
    quiver.position.set(-0.24, 1.15 * hScale, -0.32);
    quiver.rotation.z = 0.28;
    for (let a = -1; a <= 1; a++) {
      const fletch = createComicMesh(new THREE.SphereGeometry(0.06, 8, 8), '#34d399', 0.014);
      fletch.scale.set(0.8, 1.6, 0.8);
      fletch.position.set(a * 0.055, 0.36, 0);
      quiver.add(fletch);
    }
    bodyGroup.add(quiver);
  } else if (classId === 'krasnolud') {
    // Round Riveted Dwarf Helm + Plump Bubbly Braided Ginger Beard & Big Mustache!
    const helm = createComicMesh(
      new THREE.SphereGeometry(0.40, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      '#68758a',
      0.026
    );
    helm.position.y = 0.06;
    const helmRim = createComicMesh(new THREE.TorusGeometry(0.40, 0.052, 8, 20), pal.trim, 0.018);
    helmRim.rotation.x = Math.PI / 2;
    helmRim.position.y = 0.06;

    // Big plush cartoon mustache puffs!
    for (const s of [-1, 1]) {
      const stache = createComicMesh(new THREE.CapsuleGeometry(0.085, 0.16, 8, 10), pal.hair, 0.02);
      stache.rotation.z = Math.PI / 2 - s * 0.24;
      stache.position.set(s * 0.14, -0.09, 0.32);
      const miniHorn = createComicMesh(new THREE.TorusGeometry(0.15, 0.05, 8, 12, Math.PI * 0.65), '#f2ece0', 0.018);
      miniHorn.position.set(s * 0.36, 0.18, 0);
      miniHorn.rotation.z = s === 1 ? -0.35 : Math.PI + 0.35;
      headGroup.add(stache, miniHorn);
    }
    // Layered rounded beard puffs + golden ring
    const beardTop = createComicMesh(new THREE.SphereGeometry(0.24, 14, 10), pal.hair, 0.024);
    beardTop.scale.set(1.15, 1.0, 0.85);
    beardTop.position.set(0, -0.26, 0.25);
    const beardMid = createComicMesh(new THREE.SphereGeometry(0.19, 12, 10), pal.hair, 0.022);
    beardMid.position.set(0, -0.46, 0.25);
    const beardTip = createComicMesh(new THREE.SphereGeometry(0.13, 10, 8), pal.hair, 0.018);
    beardTip.position.set(0, -0.62, 0.25);
    const beardRing = createComicMesh(new THREE.TorusGeometry(0.14, 0.036, 8, 14), pal.trim, 0.014);
    beardRing.rotation.x = Math.PI / 2;
    beardRing.position.set(0, -0.52, 0.25);
    headGroup.add(helm, helmRim, beardTop, beardMid, beardTip, beardRing);
  } else if (classId === 'wrozka') {
    // Plush Pastel Cartoon Hair + Twin Round Buns + Star Circlet + Soft Butterfly Wings
    const hair = createComicMesh(new THREE.SphereGeometry(0.38, 18, 14), pal.hair, 0.024);
    hair.position.set(0, 0.06, -0.04);
    for (const s of [-1, 1]) {
      const bun = createComicMesh(new THREE.SphereGeometry(0.185, 14, 12), pal.hair, 0.022);
      bun.position.set(s * 0.33, 0.25, -0.08);
      const ribbon = createComicMesh(new THREE.TorusGeometry(0.13, 0.03, 6, 12), pal.trim, 0.012);
      ribbon.position.set(s * 0.26, 0.21, -0.06);
      ribbon.rotation.y = s * 0.8;
      headGroup.add(bun, ribbon);
    }
    const tiara = createComicMesh(new THREE.TorusGeometry(0.31, 0.036, 8, 18), pal.trim, 0.016);
    tiara.rotation.x = Math.PI / 2;
    tiara.position.y = 0.25;
    const starGem = createComicMesh(new THREE.SphereGeometry(0.085, 10, 8), '#fde047', 0.014, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.26,
    });
    starGem.position.set(0, 0.30, 0.28);
    headGroup.add(hair, tiara, starGem);

    const makeWingPair = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.14, 1.18 * hScale, -0.24);
      const wingMat = createToonMaterial('#9bdcf8', {
        emissive: '#67c8f2',
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      });
      const upper = new THREE.Mesh(new THREE.CircleGeometry(0.48, 20), wingMat);
      upper.scale.set(1.25, 0.85, 1);
      upper.position.set(side * 0.46, 0.25, -0.06);
      upper.rotation.z = side * 0.28;

      const lower = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18), wingMat);
      lower.scale.set(1.05, 0.92, 1);
      lower.position.set(side * 0.35, -0.22, -0.06);
      lower.rotation.z = -side * 0.22;

      wg.add(upper, lower);
      return wg;
    };

    wingLeftGroup = makeWingPair(-1);
    wingRightGroup = makeWingPair(1);
    bodyGroup.add(wingLeftGroup, wingRightGroup);
  }

  // ==========================================
  // 4. PLUSH CAPSULE ARMS & SCULPTED CARTOON WEAPONS
  // ==========================================
  const makeArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.46 * wScale, 1.32 * hScale, 0);

    const pauldron = createComicMesh(
      new THREE.SphereGeometry(
        classId === 'wojownik' || classId === 'krasnolud' ? 0.24 : 0.175,
        14,
        12
      ),
      classId === 'wrozka' ? pal.secondary : pal.trim,
      0.022
    );
    pauldron.scale.set(1.1, 0.86, 1.0);

    const arm = createComicMesh(
      new THREE.CapsuleGeometry(0.11, 0.38 * hScale, 8, 14),
      pal.primary,
      0.022
    );
    arm.position.y = -0.26 * hScale;

    const cuff = createComicMesh(
      new THREE.TorusGeometry(0.115, 0.036, 8, 14),
      pal.secondary,
      0.016
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.44 * hScale;

    const hand = createComicMesh(new THREE.SphereGeometry(0.12, 12, 10), pal.skin, 0.02);
    hand.position.y = -0.57 * hScale;

    pivot.add(pauldron, arm, cuff, hand);
    return pivot;
  };

  const leftArmPivot = makeArm(-1);
  const rightArmPivot = makeArm(1);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Rounded offhand gear
  if (classId === 'krasnolud') {
    const shield = createComicMesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 20), '#5c6678', 0.028);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(-0.18, -0.46 * hScale, 0.24);
    const rim = createComicMesh(new THREE.TorusGeometry(0.45, 0.055, 8, 22), pal.trim, 0.018);
    rim.position.set(-0.18, -0.46 * hScale, 0.26);
    const boss = createComicMesh(new THREE.SphereGeometry(0.15, 12, 10), pal.trim, 0.018);
    boss.position.set(-0.18, -0.46 * hScale, 0.32);
    leftArmPivot.add(shield, rim, boss);
  } else if (classId === 'wojownik') {
    const buckler = createComicMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 18), '#526075', 0.024);
    buckler.rotation.z = Math.PI / 2;
    buckler.position.set(-0.16, -0.42 * hScale, 0.08);
    leftArmPivot.add(buckler);
  } else if (classId === 'elf') {
    const dagger = createComicMesh(new THREE.ConeGeometry(0.065, 0.56, 10), '#dce4ee', 0.018);
    dagger.rotation.x = Math.PI / 2;
    dagger.position.set(0, -0.56 * hScale, 0.3);
    leftArmPivot.add(dagger);
  }

  // Primary Weapon on Right Hand (Rounded & Sculpted!)
  const weaponAttach = new THREE.Group();
  weaponAttach.position.set(0, -0.56 * hScale, 0.14);
  weaponAttach.rotation.x = Math.PI * 0.36;
  rightArmPivot.add(weaponAttach);

  let weaponGlowMesh: THREE.Mesh;

  if (classId === 'wojownik') {
    const grip = createComicMesh(new THREE.CapsuleGeometry(0.048, 0.32, 6, 10), '#5c2d12', 0.016);
    const pommel = createComicMesh(new THREE.SphereGeometry(0.10, 12, 10), '#dc2626', 0.016);
    pommel.position.y = -0.22;
    const guard = createComicMesh(createRoundedBoxGeometry(0.58, 0.13, 0.16, 0.045, 3), pal.trim, 0.02);
    guard.position.y = 0.20;
    const bladeBody = createComicMesh(createRoundedBoxGeometry(0.22, 1.18, 0.09, 0.035, 3), '#d8e1ec', 0.022);
    bladeBody.position.y = 0.84;
    const bladeTip = createComicMesh(new THREE.ConeGeometry(0.13, 0.36, 10), '#e8eef5', 0.02);
    bladeTip.scale.set(1, 1, 0.45);
    bladeTip.position.y = 1.56;
    weaponAttach.add(grip, pommel, guard, bladeBody, bladeTip);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 1.25, 6, 12),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.y = 0.94;
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'czarnoksieznik') {
    const shaft = createComicMesh(new THREE.CapsuleGeometry(0.052, 1.72, 6, 12), '#54321e', 0.02);
    shaft.position.y = 0.55;
    const crescent = createComicMesh(
      new THREE.TorusGeometry(0.26, 0.055, 8, 18, Math.PI * 1.38),
      pal.trim,
      0.018
    );
    crescent.position.y = 1.62;
    crescent.rotation.z = -Math.PI * 0.18;
    const crystal = createComicMesh(new THREE.SphereGeometry(0.17, 14, 12), '#a855f7', 0.02, {
      emissive: '#9333ea',
      emissiveIntensity: 0.3,
    });
    crystal.scale.set(0.85, 1.25, 0.85);
    crystal.position.y = 1.64;
    weaponAttach.add(shaft, crescent, crystal);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.y = 1.64;
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'elf') {
    const bowWood = createComicMesh(
      new THREE.TorusGeometry(0.56, 0.058, 10, 22, Math.PI * 1.05),
      '#1f8a5c',
      0.02
    );
    bowWood.rotation.z = -Math.PI / 2;
    bowWood.position.set(0, 0.25, 0.22);
    const bowString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6),
      new THREE.MeshBasicMaterial({ color: '#e2e8f0' })
    );
    bowString.position.set(0, 0.25, 0.18);
    const nockedArrow = createComicMesh(new THREE.ConeGeometry(0.06, 0.72, 8), '#34d399', 0.015, {
      emissive: '#10b981',
      emissiveIntensity: 0.2,
    });
    nockedArrow.rotation.x = Math.PI / 2;
    nockedArrow.position.set(0, 0.25, 0.56);
    weaponAttach.add(bowWood, bowString, nockedArrow);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.085, 8, 18, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#34d399', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.rotation.z = -Math.PI / 2;
    weaponGlowMesh.position.set(0, 0.25, 0.22);
    weaponAttach.add(weaponGlowMesh);
  } else if (classId === 'krasnolud') {
    // Plush rounded barrel-head Dwarven Warhammer!
    const handle = createComicMesh(new THREE.CapsuleGeometry(0.062, 1.24, 6, 12), '#6b3e1b', 0.02);
    handle.position.y = 0.52;
    const headBarrel = createComicMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.64, 16), '#7c8ba1', 0.026);
    headBarrel.rotation.z = Math.PI / 2;
    headBarrel.position.y = 1.20;
    for (const s of [-1, 1]) {
      const cap = createComicMesh(new THREE.TorusGeometry(0.23, 0.055, 8, 16), pal.trim, 0.018);
      cap.rotation.y = Math.PI / 2;
      cap.position.set(s * 0.30, 1.20, 0);
      weaponAttach.add(cap);
    }
    weaponAttach.add(handle, headBarrel);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.29, 0.45, 6, 12),
      new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.rotation.z = Math.PI / 2;
    weaponGlowMesh.position.y = 1.20;
    weaponAttach.add(weaponGlowMesh);
  } else {
    const wand = createComicMesh(new THREE.CapsuleGeometry(0.038, 1.05, 6, 12), '#f0c854', 0.016);
    wand.position.y = 0.45;
    const halo = createComicMesh(new THREE.TorusGeometry(0.21, 0.036, 8, 18), '#f7c2d9', 0.014);
    halo.position.y = 1.12;
    const star = createComicMesh(new THREE.SphereGeometry(0.145, 12, 10), '#fde047', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.28,
    });
    star.position.y = 1.12;
    weaponAttach.add(wand, halo, star);

    weaponGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0, depthWrite: false })
    );
    weaponGlowMesh.position.y = 1.12;
    weaponAttach.add(weaponGlowMesh);
  }

  // Soft Shield Shell + Ring
  const shieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.22, 20, 16),
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
    new THREE.TorusGeometry(1.18, 0.042, 8, 28),
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

  // Orbiting rounded stone pebbles for Dwarf Kamienna Skóra
  const stonePlatesGroup = new THREE.Group();
  stonePlatesGroup.position.y = 1.0;
  stonePlatesGroup.visible = false;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const slab = createComicMesh(createRoundedBoxGeometry(0.38, 0.52, 0.16, 0.06, 3), '#7c756d', 0.02);
    slab.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
    slab.rotation.y = -a + Math.PI / 2;
    stonePlatesGroup.add(slab);
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
    rig.orbitProp.position.y = 1.15 + Math.sin(elapsedSec * 3.5) * 0.09;
  }

  if (state.animState === 'spin') {
    rig.bodyGroup.rotation.y = elapsedSec * 17;
    rig.rightArmPivot.rotation.x = -Math.PI / 2;
    rig.rightArmPivot.rotation.z = -0.5;
    rig.leftArmPivot.rotation.x = -Math.PI / 3;
    rig.bodyGroup.position.y = 0.14;
  } else {
    rig.bodyGroup.rotation.y = 0;
    rig.rightArmPivot.rotation.z = 0;

    if (state.animState === 'run') {
      const stride = Math.sin(elapsedSec * 13);
      rig.leftLegPivot.rotation.x = stride * 0.68;
      rig.rightLegPivot.rotation.x = -stride * 0.68;
      rig.leftArmPivot.rotation.x = -stride * 0.55;
      rig.rightArmPivot.rotation.x = stride * 0.45 - 0.18;
      // Playful cartoon squash-and-stretch bounce!
      const bounce = Math.abs(stride);
      rig.bodyGroup.position.y = bounce * 0.14 + (rig.classId === 'wrozka' ? 0.16 : 0);
      rig.bodyGroup.scale.set(1 + (1 - bounce) * 0.04, 1 - (1 - bounce) * 0.04, 1 + (1 - bounce) * 0.04);
      rig.bodyGroup.rotation.x = 0.1;
      if (rig.capePivot) rig.capePivot.rotation.x = 0.25 + bounce * 0.18;
    } else if (state.animState === 'attack' || state.animState === 'cast') {
      const swing = Math.sin(elapsedSec * 22);
      rig.rightArmPivot.rotation.x = -1.2 + swing * 0.95;
      rig.leftArmPivot.rotation.x = -0.45 - swing * 0.3;
      rig.leftLegPivot.rotation.x = 0.18;
      rig.rightLegPivot.rotation.x = -0.18;
      rig.bodyGroup.position.y = 0.06;
      rig.bodyGroup.scale.set(1, 1, 1);
    } else if (state.animState === 'dash') {
      rig.bodyGroup.rotation.x = 0.32;
      rig.leftArmPivot.rotation.x = 0.65;
      rig.rightArmPivot.rotation.x = 0.65;
      rig.bodyGroup.position.y = 0.22;
      rig.bodyGroup.scale.set(0.94, 1.08, 0.94);
    } else {
      const breath = Math.sin(elapsedSec * 3.0);
      rig.leftLegPivot.rotation.x = 0;
      rig.rightLegPivot.rotation.x = 0;
      rig.leftArmPivot.rotation.x = breath * 0.06;
      rig.rightArmPivot.rotation.x = -0.15 + breath * 0.07;
      rig.headGroup.rotation.y = Math.sin(elapsedSec * 1.4) * 0.09;
      rig.bodyGroup.position.y = (rig.classId === 'wrozka' ? 0.24 : 0) + breath * 0.045;
      rig.bodyGroup.scale.set(1 - breath * 0.015, 1 + breath * 0.02, 1 - breath * 0.015);
      if (rig.capePivot) rig.capePivot.rotation.x = 0.06 + breath * 0.04;
    }
  }

  const sMat = rig.shieldShell.material as THREE.MeshBasicMaterial;
  const rMat = rig.shieldRing.material as THREE.MeshBasicMaterial;
  if (state.shield > 0) {
    sMat.opacity = 0.12 + Math.sin(elapsedSec * 5) * 0.03;
    rMat.opacity = 0.4 + Math.sin(elapsedSec * 5) * 0.09;
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
      if (wGlow === 13) wMat.color.setHSL((elapsedSec * 0.4) % 1, 0.78, 0.56);
      else wMat.color.copy(glowCol);
      wMat.opacity = 0.16 + ((wGlow - 6) / 7) * 0.13 + Math.sin(elapsedSec * 7) * 0.04;
    }
  } else {
    wMat.opacity = 0;
  }

  const aGlow = state.armorGlow || 0;
  const aMat = rig.armorGlowRing.material as THREE.MeshBasicMaterial;
  if (aGlow >= 7) {
    const glowCol = getUpgradeGlowColor(aGlow);
    if (glowCol) {
      if (aGlow === 13) aMat.color.setHSL((elapsedSec * 0.4 + 0.5) % 1, 0.78, 0.56);
      else aMat.color.copy(glowCol);
      aMat.opacity = 0.26 + Math.sin(elapsedSec * 5) * 0.08;
    }
  } else {
    aMat.opacity = 0;
  }
}

import * as THREE from 'three';
import type { EnemyState } from '../../shared/types';
import {
  createComicMesh,
  createComicSurfaceTexture,
  createContactShadow,
  createMonsterFaceTexture,
  createPlushLathe,
  createSoftBladeGeometry,
  createSoftStarGeometry,
  createSoftWingGeometry,
  createTaperedCurveGeometry,
  createToonMaterial,
  getBiomeOutlineColor,
  getOutlineMaterial,
} from './ComicMaterials';

export interface EnemyRig {
  root: THREE.Group;
  body: THREE.Group;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  shieldGroup?: THREE.Group;
  orbitGroup?: THREE.Group;
  wingL?: THREE.Object3D;
  wingR?: THREE.Object3D;
  flameMesh?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  spiderLegs?: THREE.Object3D[];
  tauntRing: THREE.Mesh;
  staggerStarsGroup: THREE.Group;
  curseRing: THREE.Mesh;
  tier: EnemyState['tier'];
  bossId?: EnemyState['bossId'];
  archetype: string;
  lastHp: number;
  hitFlashUntil: number;
  flashMats: Array<{ mat: THREE.MeshToonMaterial; origHex: number; origInt: number }>;
}

/**
 * Helper to add expressive glowing cartoon monster eyes + angled angry brows to any head/body.
 */
function addMonsterEyes(
  parent: THREE.Object3D,
  y: number,
  z: number,
  spacing: number,
  eyeRadius: number,
  eyeColor: string,
  browColor?: string
) {
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
  const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const browMat = browColor ? createToonMaterial(browColor) : null;

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 14, 12), eyeMat);
    eye.scale.set(1.0, 1.12, 0.58);
    eye.position.set(s * spacing, y, z);
    parent.add(eye);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.34, 8, 8), glintMat);
    glint.position.set(s * spacing + eyeRadius * 0.28, y + eyeRadius * 0.3, z + eyeRadius * 0.45);
    parent.add(glint);

    if (browMat) {
      const brow = new THREE.Mesh(
        new THREE.CapsuleGeometry(eyeRadius * 0.28, eyeRadius * 1.15, 6, 10),
        browMat
      );
      brow.position.set(s * spacing, y + eyeRadius * 1.05, z + eyeRadius * 0.15);
      brow.rotation.z = Math.PI / 2 - s * 0.32;
      parent.add(brow);
    }
  }
}

export function buildEnemyRig(enemy: EnemyState): EnemyRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  root.add(
    createContactShadow(
      enemy.tier === 'boss' ? 2.65 : enemy.tier === 'miniboss' ? 1.9 : enemy.radius * 1.1,
      enemy.tier === 'boss' ? 0.5 : 0.42
    )
  );

  let shieldGroup: THREE.Group | undefined;
  let orbitGroup: THREE.Group | undefined;
  let wingL: THREE.Object3D | undefined;
  let wingR: THREE.Object3D | undefined;
  let flameMesh: THREE.Object3D | undefined;
  let leftArm: THREE.Object3D | undefined;
  let rightArm: THREE.Object3D | undefined;
  let leftLeg: THREE.Object3D | undefined;
  let rightLeg: THREE.Object3D | undefined;
  let spiderLegs: THREE.Object3D[] | undefined;

  if (enemy.tier === 'dummy') {
    // =========================================================
    // CAMP 3D TRAINING DUMMY (Plush Straw & Armor Bullseye Dummy!)
    // =========================================================
    const base = createComicMesh(new THREE.CylinderGeometry(0.7, 0.9, 0.3, 18), '#6b4226', 0.026);
    base.position.y = 0.15;
    const post = createComicMesh(new THREE.CapsuleGeometry(0.14, 1.85, 8, 12), '#854d1e', 0.024);
    post.position.y = 1.05;
    const crossBar = createComicMesh(new THREE.CapsuleGeometry(0.11, 1.45, 8, 12), '#854d1e', 0.022);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.y = 1.55;
    const strawTorso = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.72],
          [0.54, 0.88],
          [0.62, 1.38],
          [0.52, 1.82],
          [0.01, 1.92],
        ],
        22
      ),
      '#e3b868',
      0.032
    );
    const bullseyeOut = createComicMesh(new THREE.TorusGeometry(0.38, 0.09, 10, 22), '#ef4444', 0.018);
    bullseyeOut.position.set(0, 1.38, 0.56);
    const bullseyeIn = createComicMesh(new THREE.SphereGeometry(0.18, 14, 12), '#fef08a', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.25,
    });
    bullseyeIn.scale.set(1, 1, 0.45);
    bullseyeIn.position.set(0, 1.38, 0.6);
    const head = createComicMesh(new THREE.SphereGeometry(0.42, 20, 16), '#ebd094', 0.028);
    head.position.y = 2.28;
    const helm = createComicMesh(
      new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      '#64748b',
      0.024
    );
    helm.position.y = 2.34;
    body.add(base, post, crossBar, strawTorso, bullseyeOut, bullseyeIn, head, helm);
  } else if (enemy.tier === 'bone_wall') {
    // Act 1 Malakor Destructible Bone Wall Segment (physically divides the arena for 10s!)
    const mound = createComicMesh(new THREE.BoxGeometry(3.4, 0.55, 1.3), '#475569', 0.03);
    mound.position.y = 0.28;
    body.add(mound);
    for (let i = -2; i <= 2; i++) {
      const h = i % 2 === 0 ? 3.2 : 2.55;
      const rib = createComicMesh(new THREE.ConeGeometry(0.38, h, 8), '#e2e8f0', 0.03, {
        emissive: '#38bdf8',
        emissiveIntensity: 0.14,
      });
      rib.position.set(i * 0.65, h / 2 + 0.25, (i % 2) * 0.16);
      rib.rotation.z = i * 0.07;
      body.add(rib);
    }
    const skull = createComicMesh(new THREE.SphereGeometry(0.52, 14, 12), '#f8fafc', 0.03);
    skull.position.set(0, 1.8, 0.42);
    body.add(skull);
  } else if (enemy.tier === 'flower_totem') {
    // Act 3 Sylvara Healing & Spore-Spewing Flower Totem
    const stem = createComicMesh(new THREE.CylinderGeometry(0.24, 0.36, 2.2, 10), '#15803d', 0.028);
    stem.position.y = 1.1;
    body.add(stem);
    const bulb = createComicMesh(new THREE.SphereGeometry(0.68, 14, 12), '#a3e635', 0.03, {
      emissive: '#84cc16',
      emissiveIntensity: 0.42,
    });
    bulb.position.y = 2.3;
    body.add(bulb);
    for (let p = 0; p < 6; p++) {
      const ang = (p / 6) * Math.PI * 2;
      const petal = createComicMesh(new THREE.ConeGeometry(0.36, 0.95, 7), '#d946ef', 0.024, {
        emissive: '#a21caf',
        emissiveIntensity: 0.25,
      });
      petal.position.set(Math.cos(ang) * 0.65, 2.35, Math.sin(ang) * 0.65);
      petal.rotation.z = -Math.cos(ang) * 0.95;
      petal.rotation.x = Math.sin(ang) * 0.95;
      body.add(petal);
    }
  } else if (enemy.tier === 'barrel') {
    // =========================================================
    // ACT-THEMED INTERACTIVE ENVIRONMENTAL HAZARDS!
    // =========================================================
    const hk = enemy.hazardKind || 'barrel';
    if (hk === 'stalactite') {
      // Act 1 Cracked Stalactite Rock Pillar
      const spire = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [0.78, 0.14],
            [0.64, 0.95],
            [0.34, 1.85],
            [0.01, 2.25],
          ],
          18
        ),
        '#707c94',
        0.034,
        { emissive: '#f59e0b', emissiveIntensity: 0.16 }
      );
      const glowRing = createComicMesh(new THREE.TorusGeometry(0.56, 0.07, 8, 20), '#fbbf24', 0.016, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.36,
      });
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = 0.85;
      body.add(spire, glowRing);
    } else if (hk === 'sand_pillar') {
      // Act 2 Unstable Carved Desert Sandstone Pillar
      const col = createComicMesh(new THREE.CylinderGeometry(0.55, 0.72, 2.35, 16), '#d99a3d', 0.032, {
        emissive: '#b45309',
        emissiveIntensity: 0.14,
      });
      col.position.y = 1.18;
      col.rotation.z = 0.12;
      const band = createComicMesh(new THREE.TorusGeometry(0.62, 0.09, 10, 20), '#38bdf8', 0.018, {
        emissive: '#0284c7',
        emissiveIntensity: 0.32,
      });
      band.rotation.x = Math.PI / 2;
      band.position.y = 1.3;
      body.add(col, band);
    } else if (hk === 'toxic_shroom') {
      // Act 3 Exploding Toxic Forest Spore Mushroom!
      const stem = createComicMesh(new THREE.CapsuleGeometry(0.26, 0.85, 8, 14), '#d9f99d', 0.024);
      stem.position.y = 0.55;
      const cap = createComicMesh(
        new THREE.SphereGeometry(0.95, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
        '#84cc16',
        0.03,
        { emissive: '#65a30d', emissiveIntensity: 0.38 }
      );
      cap.position.y = 1.12;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const spot = createComicMesh(new THREE.SphereGeometry(0.16, 10, 8), '#c084fc', 0.014, {
          emissive: '#9333ea',
          emissiveIntensity: 0.38,
        });
        spot.position.set(Math.cos(a) * 0.54, 1.65, Math.sin(a) * 0.54);
        body.add(spot);
      }
      flameMesh = cap;
      body.add(stem, cap);
    } else if (hk === 'chaos_crystal') {
      // Act 4+ Unstable Pulsing Chaos Crystal!
      const cry = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [0.68, 0.35],
            [0.74, 1.1],
            [0.32, 1.95],
            [0.01, 2.3],
          ],
          18
        ),
        '#f43f5e',
        0.034,
        { emissive: '#e11d48', emissiveIntensity: 0.44 }
      );
      const ring = createComicMesh(new THREE.TorusGeometry(0.88, 0.08, 10, 24), '#fb7185', 0.018, {
        emissive: '#e11d48',
        emissiveIntensity: 0.4,
      });
      ring.rotation.x = Math.PI / 2 - 0.3;
      ring.position.y = 1.15;
      flameMesh = cry;
      body.add(cry, ring);
    } else {
      // Act 1 Powder Barrel Keg w/ Glowing Fuse!
      const barrelBody = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [0.56, 0.04],
            [0.7, 0.42],
            [0.72, 0.78],
            [0.58, 1.24],
            [0.01, 1.28],
          ],
          22
        ),
        '#dc2626',
        0.032,
        { emissive: '#991b1b', emissiveIntensity: 0.14 }
      );
      for (const hy of [0.26, 0.98]) {
        const hoop = createComicMesh(new THREE.TorusGeometry(0.65, 0.065, 10, 22), '#334155', 0.02);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = hy;
        body.add(hoop);
      }
      const warnOrb = createComicMesh(new THREE.SphereGeometry(0.2, 12, 10), '#fde047', 0.018);
      warnOrb.scale.set(1, 1, 0.45);
      warnOrb.position.set(0, 0.64, 0.68);
      const fuse = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 1.26, 0],
            [0.08, 1.5, 0.05],
            [0.24, 1.56, 0.14],
          ],
          0.045,
          0.028,
          10,
          8
        ),
        '#e2d5b8',
        0.015
      );
      const spark = createComicMesh(new THREE.SphereGeometry(0.14, 12, 10), '#fb923c', 0.014, {
        emissive: '#f97316',
        emissiveIntensity: 0.44,
      });
      spark.position.set(0.24, 1.56, 0.14);
      flameMesh = spark;
      body.add(barrelBody, warnOrb, fuse, spark);
    }
  } else if (enemy.tier === 'totem') {
    // =========================================================
    // SHIELD TOTEM (Carved Plush Arcane Idol w/ Floating Shield Crystal!)
    // =========================================================
    const base = createComicMesh(new THREE.CylinderGeometry(0.85, 1.05, 0.48, 20), '#3b3254', 0.032);
    base.position.y = 0.24;
    const pole = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.45],
          [0.64, 0.55],
          [0.52, 1.4],
          [0.66, 2.25],
          [0.54, 2.6],
          [0.01, 2.7],
        ],
        22
      ),
      '#4c3b73',
      0.036
    );
    addMonsterEyes(body, 1.95, 0.58, 0.22, 0.12, '#c084fc');

    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 3.25;
    const crystal = createComicMesh(new THREE.SphereGeometry(0.46, 16, 14), '#a855f7', 0.026, {
      emissive: '#9333ea',
      emissiveIntensity: 0.4,
    });
    crystal.scale.set(0.85, 1.35, 0.85);
    const ring = createComicMesh(new THREE.TorusGeometry(0.75, 0.08, 10, 22), '#e879f9', 0.02, {
      emissive: '#a855f7',
      emissiveIntensity: 0.32,
    });
    ring.rotation.x = Math.PI / 2 - 0.35;
    orbitGroup.add(crystal, ring);
    body.add(base, pole, orbitGroup);
  } else if (enemy.tier === 'goblin') {
    // =========================================================
    // GOLDEN TREASURE GOBLIN (Adorable Cheeky Imp w/ GIANT Overflowing Gold Sack!)
    // =========================================================
    const torso = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.22],
          [0.44, 0.35],
          [0.48, 0.72],
          [0.36, 1.08],
          [0.01, 1.15],
        ],
        20
      ),
      '#34a853',
      0.028
    );
    const headTex = createMonsterFaceTexture({
      skin: '#52e078',
      eyeColor: '#fde047',
      style: 'goblin',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.45, 26, 20), '#52e078', 0.03, { map: headTex });
    head.rotation.y = -Math.PI / 2;
    head.scale.set(0.96, 0.94, 1.08);
    head.position.y = 1.44;
    leftLeg = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.22, 8, 12), '#166534', 0.02);
    leftLeg.position.set(-0.2, 0.22, 0);
    rightLeg = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.22, 8, 12), '#166534', 0.02);
    rightLeg.position.set(0.2, 0.22, 0);
    body.add(leftLeg, rightLeg);

    // Long playful pointy goblin ears!
    for (const s of [-1, 1]) {
      const ear = createComicMesh(
        createTaperedCurveGeometry(
          [
            [s * 0.36, 1.45, 0],
            [s * 0.64, 1.56, -0.05],
            [s * 0.84, 1.72, -0.1],
          ],
          0.11,
          0.025,
          12,
          10
        ),
        '#4ade80',
        0.02
      );
      body.add(ear);
    }

    // Golden jester cap!
    const cap = createComicMesh(
      createTaperedCurveGeometry(
        [
          [0, 1.72, 0],
          [0.08, 2.08, -0.1],
          [0.24, 2.2, -0.35],
        ],
        0.34,
        0.05,
        14,
        12
      ),
      '#f59e0b',
      0.024
    );
    const pom = createComicMesh(new THREE.SphereGeometry(0.11, 12, 10), '#fde047', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.35,
    });
    pom.position.set(0.24, 2.2, -0.36);

    // GIANT Plush Overflowing Gold Treasure Sack on Back!
    const sack = createComicMesh(new THREE.SphereGeometry(0.84, 20, 16), '#d97706', 0.034, {
      emissive: '#b45309',
      emissiveIntensity: 0.16,
    });
    sack.scale.set(1.06, 1.15, 0.96);
    sack.position.set(0, 1.32, -0.68);
    // Overflowing shiny gold coins & colorful gems at top of sack!
    const gemCols = ['#fde047', '#38bdf8', '#f43f5e', '#fde047', '#c084fc'];
    for (let g = 0; g < 5; g++) {
      const a = (g / 5) * Math.PI * 2;
      const coin = createComicMesh(new THREE.SphereGeometry(0.2, 12, 10), gemCols[g], 0.016, {
        emissive: gemCols[g],
        emissiveIntensity: 0.34,
      });
      coin.position.set(Math.cos(a) * 0.32, 2.22 + (g % 2) * 0.12, -0.68 + Math.sin(a) * 0.3);
      body.add(coin);
    }

    leftArm = createComicMesh(new THREE.CapsuleGeometry(0.1, 0.32, 8, 12), '#4ade80', 0.02);
    leftArm.position.set(-0.48, 0.85, 0.12);
    rightArm = createComicMesh(new THREE.CapsuleGeometry(0.1, 0.32, 8, 12), '#4ade80', 0.02);
    rightArm.position.set(0.48, 0.85, 0.12);
    body.add(torso, head, cap, pom, sack, leftArm, rightArm);
  } else if (enemy.tier === 'root_trap') {
    // Organic curved creeping cartoon vines!
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const cx = Math.cos(ang);
      const cz = Math.sin(ang);
      const vineGeo = createTaperedCurveGeometry(
        [
          [cx * 1.1, 0, cz * 1.1],
          [cx * 0.95, 0.9, cz * 0.95],
          [cx * 0.55, 1.7, cz * 0.55],
          [cx * 0.22, 2.2, cz * 0.22],
        ],
        0.2,
        0.04,
        14,
        10
      );
      const vine = createComicMesh(vineGeo, '#247a42', 0.028, {
        emissive: '#16a34a',
        emissiveIntensity: 0.2,
      });
      body.add(vine);
    }
  } else if (enemy.tier === 'boss' && enemy.bossId === 'malakor') {
    // =========================================================
    // AKT 1 BOSS: MALAKOR, WŁADCA KATAKUMB (Soft Cartoon Skeleton King!)
    // =========================================================
    for (const s of [-1, 1]) {
      const leg = createComicMesh(new THREE.CapsuleGeometry(0.34, 1.15, 10, 18), '#30394f', 0.038);
      leg.position.set(s * 0.56, 0.78, 0);
      const boot = createComicMesh(new THREE.SphereGeometry(0.42, 16, 14), '#23293a', 0.036);
      boot.scale.set(1, 0.7, 1.38);
      boot.position.set(s * 0.56, 0.26, 0.16);
      const knee = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), '#64748b', 0.03);
      knee.position.set(s * 0.56, 0.98, 0.34);
      body.add(leg, boot, knee);
    }

    // Soft sculpted hip armor & spine
    const pelvis = createComicMesh(
      createPlushLathe(
        [
          [0.01, -0.35],
          [0.92, -0.25],
          [0.98, 0.1],
          [0.72, 0.35],
          [0.01, 0.38],
        ],
        24
      ),
      '#283044',
      0.038
    );
    pelvis.scale.set(1.05, 1, 0.78);
    pelvis.position.y = 1.62;

    const beltBuckle = createComicMesh(new THREE.SphereGeometry(0.3, 14, 12), '#e6b842', 0.026);
    beltBuckle.scale.set(1.1, 1, 0.65);
    beltBuckle.position.set(0, 1.72, 0.76);

    const spine = createComicMesh(new THREE.CapsuleGeometry(0.32, 1.25, 10, 18), '#e2e8f0', 0.036);
    spine.position.y = 2.5;

    // Glowing plush emerald soul-heart orb inside smooth curved ribs!
    const soulHeart = createComicMesh(new THREE.SphereGeometry(0.46, 20, 16), '#34d399', 0.028, {
      emissive: '#10b981',
      emissiveIntensity: 0.4,
    });
    soulHeart.scale.set(1, 1.15, 0.9);
    soulHeart.position.set(0, 2.7, 0.25);

    for (let r = 0; r < 3; r++) {
      const rib = createComicMesh(
        new THREE.TorusGeometry(0.76 - r * 0.07, 0.12, 12, 22, Math.PI * 1.48),
        '#f1f5f9',
        0.028
      );
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = -Math.PI * 0.24;
      rib.position.y = 2.28 + r * 0.36;
      body.add(rib);
    }

    // Domed cartoon knight pauldrons + smooth curved ivory horns!
    const malArmorTex = createComicSurfaceTexture('#3f4e6b', '#e6b842', 'armor');
    for (const s of [-1, 1]) {
      const paul = createComicMesh(new THREE.SphereGeometry(0.74, 20, 16), '#3f4e6b', 0.04, {
        map: malArmorTex,
      });
      paul.scale.set(1.12, 0.9, 1.0);
      paul.position.set(s * 1.22, 3.4, 0);
      const paulRim = createComicMesh(new THREE.TorusGeometry(0.7, 0.1, 10, 22), '#e6b842', 0.024);
      paulRim.rotation.x = Math.PI / 2;
      paulRim.position.set(s * 1.22, 3.22, 0);
      const hornGeo = createTaperedCurveGeometry(
        [
          [s * 1.35, 3.85, 0],
          [s * 1.72, 4.25, 0.1],
          [s * 1.78, 4.72, 0.18],
        ],
        0.18,
        0.04,
        14,
        12
      );
      const horn = createComicMesh(hornGeo, '#cbd5e1', 0.028);
      body.add(paul, paulRim, horn);
    }

    // Flowing curved tattered crypt cape (curved cylinder mantle, ZERO flat box!)
    const cloakGeo = new THREE.CylinderGeometry(
      0.85,
      1.35,
      2.75,
      20,
      2,
      true,
      Math.PI * 0.65,
      Math.PI * 0.7
    );
    const cloak = createComicMesh(cloakGeo, '#1d3830', 0.026, { side: THREE.DoubleSide });
    cloak.position.set(0, 2.15, -0.35);
    cloak.rotation.x = 0.18;

    // Big expressive hand-painted comic skull + tilted golden crown!
    const skullFaceTex = createMonsterFaceTexture({
      skin: '#f4f7fb',
      eyeColor: '#4ade80',
      style: 'skull',
    });
    const skull = createComicMesh(new THREE.SphereGeometry(0.78, 28, 22), '#f4f7fb', 0.044, {
      map: skullFaceTex,
    });
    skull.rotation.y = -Math.PI / 2;
    skull.scale.set(0.98, 0.98, 1.06);
    skull.position.y = 4.18;

    const jaw = createComicMesh(new THREE.SphereGeometry(0.42, 18, 14), '#e2e8f0', 0.03);
    jaw.scale.set(1.02, 0.56, 0.92);
    jaw.position.set(0, 3.62, 0.16);

    const crownGroup = new THREE.Group();
    crownGroup.position.y = 4.78;
    crownGroup.rotation.z = 0.13;
    const crownBand = createComicMesh(new THREE.TorusGeometry(0.68, 0.16, 12, 24), '#eab308', 0.034);
    crownBand.rotation.x = Math.PI / 2;
    crownGroup.add(crownBand);
    for (let c = 0; c < 5; c++) {
      const a = (c / 5) * Math.PI * 2;
      const prong = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.34, 8, 12), '#facc15', 0.022);
      prong.position.set(Math.cos(a) * 0.66, 0.28, Math.sin(a) * 0.66);
      const gem = createComicMesh(new THREE.SphereGeometry(0.1, 10, 8), '#4ade80', 0.014, {
        emissive: '#16a34a',
        emissiveIntensity: 0.35,
      });
      gem.position.set(Math.cos(a) * 0.66, 0.52, Math.sin(a) * 0.66);
      crownGroup.add(prong, gem);
    }

    // Smooth capsule arms + giant rounded barrel Crypt Warhammer w/ bubbly emerald flames!
    leftArm = new THREE.Group();
    leftArm.position.set(-1.38, 3.1, 0.1);
    const lArmMesh = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.15, 10, 16), '#3f4e6b', 0.034);
    lArmMesh.position.y = -0.6;
    const lFist = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), '#e2e8f0', 0.03);
    lFist.position.y = -1.25;
    leftArm.add(lArmMesh, lFist);
    leftArm.rotation.x = -0.35;

    rightArm = new THREE.Group();
    rightArm.position.set(1.42, 3.1, 0.1);
    const rFore = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.15, 10, 16), '#3f4e6b', 0.034);
    rFore.position.y = -0.6;
    const rFist = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), '#e2e8f0', 0.03);
    rFist.position.y = -1.25;
    const handle = createComicMesh(new THREE.CapsuleGeometry(0.12, 3.8, 8, 14), '#526075', 0.03);
    handle.position.set(0.15, -0.35, 0.7);
    handle.rotation.x = 0.52;

    // Chunky plush barrel hammer head!
    const headBarrel = createComicMesh(new THREE.CapsuleGeometry(0.62, 0.95, 14, 22), '#263248', 0.038, {
      emissive: '#15803d',
      emissiveIntensity: 0.25,
    });
    headBarrel.rotation.x = Math.PI / 2;
    headBarrel.position.set(0.15, 0.75, 1.75);
    for (const s of [-1, 1]) {
      const cap = createComicMesh(new THREE.TorusGeometry(0.6, 0.12, 10, 20), '#e6b842', 0.024);
      cap.position.set(0.15, 0.75, 1.75 + s * 0.5);
      rightArm.add(cap);
    }

    // Bubbly cartoon soul-flames rising from hammer!
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0.15, 1.38, 1.75);
    for (let f = 0; f < 5; f++) {
      const drop = createComicMesh(
        new THREE.SphereGeometry(0.36 - f * 0.04, 14, 12),
        f % 2 === 0 ? '#4ade80' : '#22c55e',
        0.024,
        { emissive: '#16a34a', emissiveIntensity: 0.38 }
      );
      drop.scale.set(0.85, 1.45, 0.85);
      drop.position.set((f - 2) * 0.24, 0.18 + (f % 2) * 0.22, (f % 2 === 0 ? 1 : -1) * 0.2);
      flameGroup.add(drop);
    }
    flameMesh = flameGroup;
    rightArm.add(rFore, rFist, handle, headBarrel, flameGroup);

    // Orbiting plush bone-orbs
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.65;
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2;
      const orb = createComicMesh(new THREE.SphereGeometry(0.28, 14, 12), '#e2e8f0', 0.024, {
        emissive: '#22c55e',
        emissiveIntensity: 0.22,
      });
      orb.position.set(Math.cos(a) * 2.55, Math.sin(b) * 0.5, Math.sin(a) * 2.55);
      orbitGroup.add(orb);
    }

    body.add(pelvis, beltBuckle, spine, soulHeart, cloak, skull, jaw, crownGroup, leftArm, rightArm, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'azirath') {
    // =========================================================
    // AKT 2 BOSS: AZIRATH, POŻERACZ WYDM (Plush Cartoon Scorpion-Pharaoh!)
    // =========================================================
    const azScaleTex = createComicSurfaceTexture('#e0a229', '#1b82b8', 'scales');
    const carapace = createComicMesh(new THREE.SphereGeometry(1.55, 24, 18), '#e0a229', 0.042, {
      map: azScaleTex,
    });
    carapace.scale.set(1.02, 0.68, 1.32);
    carapace.position.y = 1.25;

    const lapisDome = createComicMesh(new THREE.SphereGeometry(1.15, 22, 16), '#1b82b8', 0.032);
    lapisDome.scale.set(0.95, 0.52, 1.28);
    lapisDome.position.y = 1.85;

    // 6 smooth curved scuttling scorpion legs with plush joints!
    spiderLegs = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const legPivot = new THREE.Group();
        legPivot.position.set(s * 1.25, 1.05, 1.0 - i * 1.0);
        const legGeo = createTaperedCurveGeometry(
          [
            [0, 0, 0],
            [s * 0.72, 0.45, 0],
            [s * 1.28, -0.15, 0],
            [s * 1.48, -0.98, 0],
          ],
          0.22,
          0.08,
          14,
          10
        );
        const legMesh = createComicMesh(legGeo, '#c9881c', 0.03);
        const joint = createComicMesh(new THREE.SphereGeometry(0.22, 12, 10), '#1b82b8', 0.022);
        joint.position.set(s * 0.72, 0.45, 0);
        legPivot.add(legMesh, joint);
        body.add(legPivot);
        spiderLegs.push(legPivot);
      }
    }

    // Plush Pharaoh torso + ornate layered collar + rounded striped royal headdress (ZERO BoxGeometry!)
    const pharaohTorso = createComicMesh(
      createPlushLathe(
        [
          [0.01, -0.6],
          [0.95, -0.4],
          [0.82, 0.2],
          [0.92, 0.85],
          [0.55, 1.1],
          [0.01, 1.15],
        ],
        24
      ),
      '#d49424',
      0.04
    );
    pharaohTorso.position.set(0, 2.3, 0.95);

    const chestCollar = createComicMesh(new THREE.TorusGeometry(0.86, 0.17, 12, 24), '#1b82b8', 0.028);
    chestCollar.rotation.x = Math.PI / 2;
    chestCollar.position.set(0, 3.12, 0.95);

    const azFaceTex = createMonsterFaceTexture({
      skin: '#f5c756',
      eyeColor: '#38bdf8',
      accent: '#1b82b8',
      style: 'pharaoh',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.72, 28, 22), '#f5c756', 0.042, {
      map: azFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.set(0, 3.78, 1.05);

    // Soft sculpted rounded Pharaoh Nemes hood (domed crown + plush side lappets, ZERO boxes!)
    const nemesCrown = createComicMesh(new THREE.SphereGeometry(0.86, 22, 16), '#1b82b8', 0.036, {
      emissive: '#0284c7',
      emissiveIntensity: 0.16,
    });
    nemesCrown.scale.set(1.22, 0.95, 0.85);
    nemesCrown.position.set(0, 3.92, 0.82);

    for (const s of [-1, 1]) {
      const lappet = createComicMesh(new THREE.CapsuleGeometry(0.24, 0.72, 10, 14), '#1b82b8', 0.028);
      lappet.position.set(s * 0.78, 3.42, 0.88);
      lappet.rotation.z = s * 0.22;
      const band = createComicMesh(new THREE.TorusGeometry(0.24, 0.055, 8, 16), '#f5c249', 0.018);
      band.rotation.x = Math.PI / 2;
      band.position.set(s * 0.78, 3.42, 0.88);
      body.add(lappet, band);
    }

    // Curved golden Cobra Uraeus on brow!
    const cobraGeo = createTaperedCurveGeometry(
      [
        [0, 4.18, 1.56],
        [0, 4.52, 1.72],
        [0, 4.82, 1.6],
        [0, 4.9, 1.74],
      ],
      0.13,
      0.06,
      14,
      10
    );
    const cobra = createComicMesh(cobraGeo, '#facc15', 0.024);

    // Chunky curved cartoon Scorpion Pincer Claws!
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 1.38, 1.95, 1.45);
      const forearm = createComicMesh(new THREE.CapsuleGeometry(0.28, 0.7, 10, 14), '#d48d1e', 0.032);
      forearm.rotation.x = Math.PI / 2;
      forearm.position.set(0, 0, 0.35);

      const outerClaw = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 0, 0.65],
            [s * 0.52, 0.05, 1.25],
            [s * 0.38, 0.02, 1.95],
            [s * 0.05, 0, 2.25],
          ],
          0.32,
          0.07,
          14,
          12
        ),
        '#eb9c24',
        0.036
      );
      const innerClaw = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 0, 0.65],
            [-s * 0.32, -0.02, 1.2],
            [-s * 0.16, 0, 1.8],
          ],
          0.22,
          0.05,
          12,
          10
        ),
        '#f5cf58',
        0.03
      );
      arm.add(forearm, outerClaw, innerClaw);
      body.add(arm);
      if (s === -1) leftArm = arm;
      else rightArm = arm;
    }

    // 6-segment lush rounded arching scorpion tail + glowing curved venom stinger!
    for (let seg = 0; seg < 6; seg++) {
      const t = seg / 5;
      const tailSeg = createComicMesh(
        new THREE.SphereGeometry(0.6 - seg * 0.055, 18, 14),
        seg % 2 === 0 ? '#e09a24' : '#1b82b8',
        0.036
      );
      tailSeg.position.set(0, 1.65 + seg * 0.76, -1.65 - Math.sin(t * Math.PI) * 1.25 + t * 1.55);
      body.add(tailSeg);
    }
    const stingerGeo = createTaperedCurveGeometry(
      [
        [0, 5.45, 0.05],
        [0, 5.75, 0.55],
        [0, 5.35, 1.15],
        [0, 4.88, 1.25],
      ],
      0.34,
      0.04,
      16,
      12
    );
    const stinger = createComicMesh(stingerGeo, '#84cc16', 0.032, {
      emissive: '#65a30d',
      emissiveIntensity: 0.38,
    });

    // Orbiting smooth circular golden-lapis medallions (ZERO BoxGeometry!)
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.65;
    for (let h = 0; h < 6; h++) {
      const ang = (h / 6) * Math.PI * 2;
      const medallion = createComicMesh(new THREE.SphereGeometry(0.36, 16, 12), '#2563eb', 0.024, {
        emissive: '#0284c7',
        emissiveIntensity: 0.3,
      });
      medallion.scale.set(1, 1.15, 0.38);
      medallion.position.set(Math.cos(ang) * 3.35, Math.sin(h * 1.2) * 0.48, Math.sin(ang) * 3.35);
      medallion.rotation.y = -ang;
      orbitGroup.add(medallion);
    }

    body.add(carapace, lapisDome, pharaohTorso, chestCollar, head, nemesCrown, cobra, stinger, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'sylvara') {
    // =========================================================
    // AKT 3 BOSS: SYLVARA, MATKA CIERNI (Fairytale Dryad Queen!)
    // =========================================================
    const sylBarkTex = createComicSurfaceTexture('#225c3a', '#4ade80', 'bark');
    const rootGown = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0],
          [1.55, 0.05],
          [1.35, 0.75],
          [0.85, 1.85],
          [0.52, 2.7],
          [0.68, 3.65],
          [0.42, 4.15],
          [0.01, 4.25],
        ],
        26
      ),
      '#225c3a',
      0.042,
      { map: sylBarkTex }
    );

    // 6 graceful swirling curved root tendrils around base!
    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const tendrilGeo = createTaperedCurveGeometry(
        [
          [c * 0.9, 1.4, s * 0.9],
          [c * 1.55, 0.65, s * 1.55],
          [c * 1.95, 0.16, s * 1.95],
        ],
        0.3,
        0.07,
        14,
        10
      );
      const tendril = createComicMesh(tendrilGeo, '#3b2b34', 0.032);
      body.add(tendril);
    }

    // Glowing spiralling vine waist sash
    const vineWrap = createComicMesh(new THREE.TorusGeometry(0.68, 0.14, 12, 24), '#34d399', 0.024, {
      emissive: '#16a34a',
      emissiveIntensity: 0.28,
    });
    vineWrap.rotation.x = Math.PI / 2 - 0.3;
    vineWrap.position.y = 3.0;

    // Graceful curved branch arms w/ soft blooming orchid clusters!
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.72, 3.85, 0);
      const branchGeo = createTaperedCurveGeometry(
        [
          [0, 0, 0],
          [s * 0.35, -0.75, 0.12],
          [s * 0.55, -1.65, 0.28],
        ],
        0.18,
        0.09,
        14,
        10
      );
      const branch = createComicMesh(branchGeo, '#3d2c36', 0.03);
      const flower = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), '#c084fc', 0.024, {
        emissive: '#9333ea',
        emissiveIntensity: 0.36,
      });
      flower.position.set(s * 0.55, -1.72, 0.3);
      arm.add(branch, flower);
      body.add(arm);
      if (s === -1) leftArm = arm;
      else rightArm = arm;
    }

    // Expressive dryad head w/ painted glowing violet eyes & forest runic swirls!
    const sylFaceTex = createMonsterFaceTexture({
      skin: '#7c3ab8',
      eyeColor: '#f0abfc',
      accent: '#4ade80',
      style: 'dryad',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.7, 28, 22), '#7c3ab8', 0.042, {
      map: sylFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.y = 4.65;

    for (const s of [-1, 1]) {
      const antlerGeo = createTaperedCurveGeometry(
        [
          [s * 0.34, 5.05, 0],
          [s * 0.85, 5.65, 0.05],
          [s * 1.28, 6.25, -0.05],
          [s * 1.15, 6.72, 0.05],
        ],
        0.16,
        0.04,
        16,
        12
      );
      const antler = createComicMesh(antlerGeo, '#4c266e', 0.03);
      const twigGeo = createTaperedCurveGeometry(
        [
          [s * 0.85, 5.65, 0.05],
          [s * 0.65, 6.25, 0.15],
        ],
        0.1,
        0.03,
        10,
        8
      );
      const twig = createComicMesh(twigGeo, '#4c266e', 0.024);
      const orchid = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), '#d8b4fe', 0.024, {
        emissive: '#a855f7',
        emissiveIntensity: 0.38,
      });
      orchid.position.set(s * 1.24, 6.45, 0.02);
      body.add(antler, twig, orchid);
    }

    // Orbiting plush glowing spore lanterns
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.85;
    for (let v = 0; v < 8; v++) {
      const ang = (v / 8) * Math.PI * 2;
      const pod = createComicMesh(
        new THREE.SphereGeometry(0.29, 14, 12),
        v % 2 === 0 ? '#4ade80' : '#c084fc',
        0.024,
        { emissive: v % 2 === 0 ? '#16a34a' : '#9333ea', emissiveIntensity: 0.35 }
      );
      pod.position.set(Math.cos(ang) * 2.3, Math.sin(v * 1.4) * 1.05, Math.sin(ang) * 2.3);
      orbitGroup.add(pod);
    }

    // 8 Smooth Sculpted Leaf-Shield Petals (visible during Pancerz Kory — ZERO BoxGeometry!)
    shieldGroup = new THREE.Group();
    shieldGroup.position.y = 2.65;
    shieldGroup.visible = false;
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const leafShield = createComicMesh(new THREE.SphereGeometry(0.88, 16, 14), '#22874a', 0.032, {
        emissive: '#16a34a',
        emissiveIntensity: 0.25,
      });
      leafShield.scale.set(0.75, 1.48, 0.24);
      leafShield.position.set(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5);
      leafShield.rotation.y = -a + Math.PI / 2;
      shieldGroup.add(leafShield);
    }

    body.add(rootGown, vineWrap, head, orbitGroup, shieldGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'vaelgor') {
    // =========================================================
    // AKT 4 BOSS: VAELGOR, ARCHONT CHAOSU (Epic Soft Cartoon Demon Lord!)
    // =========================================================
    const vaelMagmaTex = createComicSurfaceTexture('#241c33', '#f43f5e', 'magma');
    const lowerRobe = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.55],
          [0.24, 0.9],
          [0.72, 1.55],
          [1.18, 2.35],
          [1.38, 3.55],
          [1.05, 4.4],
          [0.01, 4.55],
        ],
        26
      ),
      '#241c33',
      0.046,
      { map: vaelMagmaTex, emissive: '#991b1b', emissiveIntensity: 0.2 }
    );
    lowerRobe.scale.set(1.08, 1, 0.88);

    // Smooth glowing magma core orb embedded in chest
    const moltenCore = createComicMesh(new THREE.SphereGeometry(0.72, 20, 16), '#f97316', 0.03, {
      emissive: '#ea580c',
      emissiveIntensity: 0.42,
    });
    moltenCore.scale.set(1, 1.15, 0.72);
    moltenCore.position.set(0, 3.45, 0.98);

    // Big sculpted pauldrons
    for (const s of [-1, 1]) {
      const paul = createComicMesh(new THREE.SphereGeometry(0.76, 18, 14), '#302342', 0.04, {
        emissive: '#9f1239',
        emissiveIntensity: 0.22,
      });
      paul.scale.set(1.15, 0.85, 1.0);
      paul.position.set(s * 1.42, 4.15, 0);
      body.add(paul);
    }

    // Expressive smooth demon head w/ painted molten-gold eyes & fanged grin!
    const vaelFaceTex = createMonsterFaceTexture({
      skin: '#241e38',
      eyeColor: '#fbbf24',
      accent: '#f43f5e',
      style: 'imp',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.8, 28, 22), '#241e38', 0.046, {
      map: vaelFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.scale.set(0.98, 1.02, 1.05);
    head.position.y = 5.15;

    for (const s of [-1, 1]) {
      const hornGeo = createTaperedCurveGeometry(
        [
          [s * 0.45, 5.55, 0],
          [s * 1.05, 6.05, -0.1],
          [s * 1.42, 6.55, 0.12],
          [s * 1.12, 7.02, 0.35],
        ],
        0.24,
        0.045,
        18,
        12
      );
      const horn = createComicMesh(hornGeo, '#382a45', 0.034, {
        emissive: '#be123c',
        emissiveIntensity: 0.28,
      });
      body.add(horn);
    }

    // 4 Sculpted Bezier Bat-Demon Wings (ZERO boxy slabs!)
    const upperWingGeo = createSoftWingGeometry(3.45, 2.25, 0.14, 'demon');
    const lowerWingGeo = createSoftWingGeometry(2.45, 1.55, 0.12, 'demon');
    const makeDemonWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 1.08, 4.15, -0.58);
      const upper = createComicMesh(upperWingGeo, '#21192e', 0.036, {
        emissive: '#be123c',
        emissiveIntensity: 0.24,
      });
      if (side === -1) upper.scale.x = -1;
      upper.position.set(0, 0.2, 0);

      const lower = createComicMesh(lowerWingGeo, '#2d1c3b', 0.032, {
        emissive: '#7e22ce',
        emissiveIntensity: 0.24,
      });
      if (side === -1) lower.scale.x = -1;
      lower.position.set(0, -0.85, 0.12);
      lower.rotation.z = -side * 0.22;

      wg.add(upper, lower);
      return wg;
    };
    wingL = makeDemonWing(-1);
    wingR = makeDemonWing(1);

    // Sculpted Curved Dimensional Rift Greatsword (createSoftBladeGeometry, ZERO BoxGeometry!)
    rightArm = new THREE.Group();
    rightArm.position.set(1.55, 3.6, 0.35);
    const armM = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.0, 10, 14), '#2a223b', 0.032);
    armM.position.y = -0.4;
    const blade = createComicMesh(createSoftBladeGeometry(0.68, 3.75, 0.16, 'cleaver'), '#281e3b', 0.038, {
      emissive: '#e11d48',
      emissiveIntensity: 0.38,
    });
    blade.position.set(0.2, -0.35, 0.55);
    blade.rotation.x = 0.62;
    rightArm.add(armM, blade);

    // Floating Crown of Chaos with soft glowing orbs
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 6.35;
    const crownRing = createComicMesh(new THREE.TorusGeometry(1.08, 0.15, 12, 28), '#db2777', 0.03, {
      emissive: '#e11d48',
      emissiveIntensity: 0.38,
    });
    crownRing.rotation.x = Math.PI / 2;
    orbitGroup.add(crownRing);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const orb = createComicMesh(new THREE.SphereGeometry(0.22, 14, 12), '#fbbf24', 0.022, {
        emissive: '#ef4444',
        emissiveIntensity: 0.36,
      });
      orb.scale.set(0.85, 1.45, 0.85);
      orb.position.set(Math.cos(a) * 1.08, 0.32, Math.sin(a) * 1.08);
      orbitGroup.add(orb);
    }

    body.add(lowerRobe, moltenCore, head, wingL, wingR, rightArm, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'kaelis') {
    // =========================================================
    // HARDCORE AKT 5 BOSS: KAELIS, WŁADCA WIECZNEJ ZIMY (Frost Archangel!)
    // =========================================================
    const iceTex = createComicSurfaceTexture('#38bdf8', '#e0f2fe', 'armor');
    const robe = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.45],
          [0.32, 0.9],
          [0.85, 1.8],
          [1.22, 3.0],
          [1.45, 4.0],
          [1.05, 4.75],
          [0.01, 4.9],
        ],
        26
      ),
      '#1e40af',
      0.045,
      { map: iceTex, emissive: '#0284c7', emissiveIntensity: 0.25 }
    );
    const frostHeart = createComicMesh(
      createPlushLathe(
        [
          [0.01, -0.78],
          [0.54, -0.35],
          [0.68, 0.05],
          [0.44, 0.55],
          [0.01, 0.85],
        ],
        20
      ),
      '#a5f3fc',
      0.03,
      {
        emissive: '#38bdf8',
        emissiveIntensity: 0.46,
      }
    );
    frostHeart.position.set(0, 3.5, 0.95);

    const kFaceTex = createMonsterFaceTexture({
      skin: '#dbeafe',
      eyeColor: '#22d3ee',
      accent: '#38bdf8',
      style: 'pharaoh',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.76, 28, 22), '#dbeafe', 0.042, {
      map: kFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.y = 5.4;

    // Plush Rounded Crystal Ice Crown (ZERO angular cones!)
    const iceBand = createComicMesh(new THREE.TorusGeometry(0.66, 0.14, 12, 24), '#38bdf8', 0.026, {
      emissive: '#0284c7',
      emissiveIntensity: 0.28,
    });
    iceBand.rotation.x = Math.PI / 2;
    iceBand.position.y = 5.95;
    body.add(iceBand);
    const frostSpireGeo = createPlushLathe(
      [
        [0.01, 0],
        [0.19, 0.12],
        [0.16, 0.52],
        [0.05, 0.85],
        [0.01, 0.94],
      ],
      16
    );
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2;
      const spike = createComicMesh(frostSpireGeo, '#a5f3fc', 0.022, {
        emissive: '#38bdf8',
        emissiveIntensity: 0.36,
      });
      spike.position.set(Math.cos(a) * 0.62, 5.95, Math.sin(a) * 0.62);
      spike.rotation.z = -Math.cos(a) * 0.22;
      spike.rotation.x = Math.sin(a) * 0.22;
      body.add(spike);
    }

    // 4 Crystalline Frost Archangel Wings!
    const wingGeoA = createSoftWingGeometry(3.6, 2.3, 0.14, 'demon');
    const wingGeoB = createSoftWingGeometry(2.5, 1.5, 0.12, 'demon');
    const makeIceWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 1.15, 4.35, -0.55);
      const u = createComicMesh(wingGeoA, '#7dd3fc', 0.032, { emissive: '#0284c7', emissiveIntensity: 0.32 });
      if (side === -1) u.scale.x = -1;
      const l = createComicMesh(wingGeoB, '#e0f2fe', 0.028, { emissive: '#38bdf8', emissiveIntensity: 0.38 });
      if (side === -1) l.scale.x = -1;
      l.position.set(0, -0.9, 0.15);
      wg.add(u, l);
      return wg;
    };
    wingL = makeIceWing(-1);
    wingR = makeIceWing(1);

    // Frost Halberd in right arm
    rightArm = new THREE.Group();
    rightArm.position.set(1.55, 3.75, 0.35);
    const armK = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.0, 10, 14), '#1d4ed8', 0.03);
    armK.position.y = -0.4;
    const pole = createComicMesh(new THREE.CapsuleGeometry(0.1, 4.1, 8, 12), '#e0f2fe', 0.026);
    pole.position.set(0.15, 0.3, 0.7);
    pole.rotation.x = 0.55;
    const spearHead = createComicMesh(createSoftBladeGeometry(0.75, 1.85, 0.16, 'cleaver'), '#22d3ee', 0.032, {
      emissive: '#38bdf8',
      emissiveIntensity: 0.45,
    });
    spearHead.position.set(0.15, 1.65, 1.65);
    spearHead.rotation.x = 0.55;
    rightArm.add(armK, pole, spearHead);

    // Orbiting Plush Aurora Drop-Crystals + Ice Shield Ring
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 3.2;
    const auroraDropGeo = createPlushLathe(
      [
        [0.01, -0.38],
        [0.24, -0.1],
        [0.26, 0.14],
        [0.12, 0.36],
        [0.01, 0.44],
      ],
      16
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const crystal = createComicMesh(auroraDropGeo, '#a5f3fc', 0.022, {
        emissive: '#38bdf8',
        emissiveIntensity: 0.42,
      });
      crystal.position.set(Math.cos(a) * 2.8, Math.sin(i * 1.4) * 0.8, Math.sin(a) * 2.8);
      orbitGroup.add(crystal);
    }

    shieldGroup = new THREE.Group();
    shieldGroup.position.y = 3.0;
    shieldGroup.visible = false;
    const frostShell = createComicMesh(new THREE.TorusGeometry(2.7, 0.22, 12, 32), '#22d3ee', 0.025, {
      emissive: '#38bdf8',
      emissiveIntensity: 0.5,
    });
    frostShell.rotation.x = Math.PI / 2;
    shieldGroup.add(frostShell);

    body.add(robe, frostHeart, head, wingL, wingR, rightArm, orbitGroup, shieldGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'ignarok') {
    // =========================================================
    // HARDCORE AKT 6 BOSS: IGNAROK, KOLOS PRAKUŹNI (Molten Gold Titan!)
    // =========================================================
    const forgeTex = createComicSurfaceTexture('#9a5b24', '#fbbf24', 'armor');
    const torso = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.15],
          [1.25, 0.35],
          [1.65, 1.65],
          [1.88, 3.15],
          [1.45, 4.25],
          [0.01, 4.45],
        ],
        26
      ),
      '#7c4319',
      0.048,
      { map: forgeTex }
    );
    torso.scale.set(1.12, 1, 0.92);

    // Glowing Molten Furnace Core
    const furnace = createComicMesh(new THREE.SphereGeometry(0.95, 22, 18), '#fbbf24', 0.032, {
      emissive: '#f97316',
      emissiveIntensity: 0.58,
    });
    furnace.position.set(0, 2.75, 1.15);
    flameMesh = furnace;

    const igFaceTex = createMonsterFaceTexture({
      skin: '#57331a',
      eyeColor: '#fef08a',
      accent: '#f97316',
      style: 'golem',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.84, 28, 22), '#57331a', 0.046, {
      map: igFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.set(0, 4.95, 0.18);

    // Twin Molten Chimneys on shoulders
    for (const s of [-1, 1]) {
      const paul = createComicMesh(new THREE.SphereGeometry(0.92, 18, 14), '#b45309', 0.04, { map: forgeTex });
      paul.position.set(s * 1.85, 4.05, 0);
      const chim = createComicMesh(new THREE.CapsuleGeometry(0.28, 1.0, 10, 14), '#475569', 0.03);
      chim.position.set(s * 1.45, 4.95, -0.35);
      const puff = createComicMesh(new THREE.SphereGeometry(0.4, 14, 12), '#fb923c', 0.022, {
        emissive: '#ea580c',
        emissiveIntensity: 0.45,
      });
      puff.position.set(s * 1.45, 5.72, -0.35);
      body.add(paul, chim, puff);
    }

    // Colossal Golden Forge Hammer in right arm
    leftArm = createComicMesh(new THREE.SphereGeometry(0.82, 18, 14), '#92400e', 0.04, { map: forgeTex });
    leftArm.scale.set(0.95, 1.35, 0.95);
    leftArm.position.set(-2.1, 2.55, 0.25);

    rightArm = new THREE.Group();
    rightArm.position.set(2.1, 3.25, 0.25);
    const armI = createComicMesh(new THREE.CapsuleGeometry(0.38, 1.2, 10, 16), '#92400e', 0.036);
    armI.position.y = -0.5;
    const shaft = createComicMesh(new THREE.CapsuleGeometry(0.16, 4.4, 8, 14), '#475569', 0.032);
    shaft.position.set(0.2, 0.1, 0.8);
    shaft.rotation.x = 0.55;
    const hammerHead = createComicMesh(new THREE.CapsuleGeometry(0.85, 1.35, 14, 22), '#f59e0b', 0.044, {
      emissive: '#ea580c',
      emissiveIntensity: 0.42,
    });
    hammerHead.rotation.x = Math.PI / 2;
    hammerHead.position.set(0.2, 1.45, 2.05);
    rightArm.add(armI, shaft, hammerHead);

    // Orbiting Runic Anvil Rings
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 3.1;
    const ring = createComicMesh(new THREE.TorusGeometry(3.0, 0.16, 12, 30), '#fbbf24', 0.028, {
      emissive: '#f97316',
      emissiveIntensity: 0.4,
    });
    ring.rotation.x = Math.PI / 2 + 0.25;
    orbitGroup.add(ring);

    shieldGroup = new THREE.Group();
    shieldGroup.position.y = 2.8;
    shieldGroup.visible = false;
    const goldShell = createComicMesh(new THREE.TorusGeometry(2.9, 0.25, 12, 32), '#fde047', 0.025, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.5,
    });
    goldShell.rotation.x = Math.PI / 2;
    shieldGroup.add(goldShell);

    body.add(torso, furnace, head, leftArm, rightArm, orbitGroup, shieldGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'aeternus') {
    // =========================================================
    // HARDCORE AKT 7 FINAL BOSS: AETERNUS, CESARZ WIECZNOŚCI!
    // =========================================================
    const cosmicTex = createComicSurfaceTexture('#4c1d95', '#00f5d4', 'robe');
    const robe = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.6],
          [0.35, 1.15],
          [0.95, 2.1],
          [1.35, 3.3],
          [1.55, 4.35],
          [1.1, 5.1],
          [0.01, 5.25],
        ],
        28
      ),
      '#312e81',
      0.048,
      { map: cosmicTex, emissive: '#6d28d9', emissiveIntensity: 0.3 }
    );

    // Radiant Eclipse Core
    const eclipseCore = createComicMesh(new THREE.SphereGeometry(0.82, 22, 18), '#00f5d4', 0.032, {
      emissive: '#06b6d4',
      emissiveIntensity: 0.55,
    });
    eclipseCore.position.set(0, 3.8, 1.05);

    const aeFaceTex = createMonsterFaceTexture({
      skin: '#f8fafc',
      eyeColor: '#00f5d4',
      accent: '#fde047',
      style: 'pharaoh',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.82, 28, 22), '#f8fafc', 0.044, {
      map: aeFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.y = 5.85;

    // Golden Eclipse Halo Behind Head
    const haloRing = createComicMesh(new THREE.TorusGeometry(1.45, 0.16, 12, 32), '#fde047', 0.032, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.45,
    });
    haloRing.position.set(0, 5.95, -0.45);
    body.add(haloRing);

    // 4 Celestial Galaxy Wings!
    const wA = createSoftWingGeometry(4.0, 2.5, 0.15, 'demon');
    const wB = createSoftWingGeometry(2.9, 1.75, 0.13, 'demon');
    const makeCosmicWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 1.18, 4.65, -0.58);
      const u = createComicMesh(wA, '#00f5d4', 0.034, { emissive: '#0d9488', emissiveIntensity: 0.36 });
      if (side === -1) u.scale.x = -1;
      const l = createComicMesh(wB, '#c084fc', 0.032, { emissive: '#7e22ce', emissiveIntensity: 0.36 });
      if (side === -1) l.scale.x = -1;
      l.position.set(0, -1.0, 0.15);
      wg.add(u, l);
      return wg;
    };
    wingL = makeCosmicWing(-1);
    wingR = makeCosmicWing(1);

    // Twin Cosmic Blades
    const makeBladeArm = (side: -1 | 1) => {
      const g = new THREE.Group();
      g.position.set(side * 1.65, 4.0, 0.35);
      const armM = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.05, 10, 14), '#f8fafc', 0.032);
      armM.position.y = -0.45;
      const blade = createComicMesh(createSoftBladeGeometry(0.72, 3.85, 0.16, 'cleaver'), '#00f5d4', 0.038, {
        emissive: side === 1 ? '#06b6d4' : '#a855f7',
        emissiveIntensity: 0.48,
      });
      blade.position.set(side * 0.2, -0.35, 0.6);
      blade.rotation.x = 0.62;
      g.add(armM, blade);
      return g;
    };
    leftArm = makeBladeArm(-1);
    rightArm = makeBladeArm(1);

    // Orbiting Galaxy Rings & Stars
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 3.4;
    const galRing1 = createComicMesh(new THREE.TorusGeometry(3.2, 0.12, 10, 32), '#00f5d4', 0.024, {
      emissive: '#06b6d4',
      emissiveIntensity: 0.45,
    });
    galRing1.rotation.x = Math.PI / 2 + 0.3;
    const galRing2 = createComicMesh(new THREE.TorusGeometry(2.6, 0.1, 10, 32), '#fde047', 0.022, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.45,
    });
    galRing2.rotation.x = Math.PI / 2 - 0.35;
    orbitGroup.add(galRing1, galRing2);

    body.add(robe, eclipseCore, head, wingL, wingR, leftArm, rightArm, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'aurelion') {
    // =========================================================
    // GILDIA AKT I BOSS: AURELION, KRÓL ZŁOTEGO SZTANDARU!
    // =========================================================
    const royalTex = createComicSurfaceTexture('#1e3a8a', '#fbbf24', 'armor');
    const torso = createComicMesh(
      createPlushLathe(
        [
          [0.01, 0.25],
          [0.95, 0.5],
          [1.25, 1.85],
          [1.45, 3.1],
          [1.1, 4.1],
          [0.01, 4.25],
        ],
        26
      ),
      '#1e40af',
      0.044,
      { map: royalTex }
    );
    torso.scale.set(1.08, 1, 0.9);

    // Royal Gold Cape
    const capeGeo = new THREE.CylinderGeometry(0.95, 1.55, 3.3, 20, 2, true, Math.PI * 0.62, Math.PI * 0.76);
    const cape = createComicMesh(capeGeo, '#b45309', 0.028, { side: THREE.DoubleSide });
    cape.position.set(0, 2.35, -0.45);
    cape.rotation.x = 0.2;

    // Lion-gold Chest Crest
    const crest = createComicMesh(new THREE.SphereGeometry(0.65, 20, 16), '#fde047', 0.03, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.45,
    });
    crest.scale.set(1.05, 1.15, 0.65);
    crest.position.set(0, 3.0, 1.05);

    const auFaceTex = createMonsterFaceTexture({
      skin: '#fde68a',
      eyeColor: '#38bdf8',
      accent: '#fbbf24',
      style: 'pharaoh',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.76, 28, 22), '#fde68a', 0.042, {
      map: auFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.position.y = 4.85;

    // Royal Plush Golden Crown w/ Sapphire Pearls (ZERO angular cones!)
    const crownBand = createComicMesh(new THREE.TorusGeometry(0.74, 0.16, 12, 24), '#fbbf24', 0.03);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = 5.45;
    body.add(crownBand);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spire = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.36, 8, 12), '#fde047', 0.02, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.32,
      });
      spire.position.set(Math.cos(a) * 0.72, 5.75, Math.sin(a) * 0.72);
      const pearl = createComicMesh(new THREE.SphereGeometry(0.11, 12, 10), '#38bdf8', 0.016, {
        emissive: '#0284c7',
        emissiveIntensity: 0.38,
      });
      pearl.position.set(Math.cos(a) * 0.72, 6.04, Math.sin(a) * 0.72);
      body.add(spire, pearl);
    }

    // Left Arm: Huge Golden Guild Shield
    leftArm = new THREE.Group();
    leftArm.position.set(-1.55, 3.3, 0.2);
    const lShield = createComicMesh(new THREE.SphereGeometry(1.15, 20, 16), '#fbbf24', 0.038, {
      map: royalTex,
      emissive: '#d97706',
      emissiveIntensity: 0.25,
    });
    lShield.scale.set(0.35, 1.35, 1.05);
    lShield.position.set(-0.2, -0.5, 0.45);
    leftArm.add(lShield);

    // Right Arm: Radiant Guild Banner Halberd
    rightArm = new THREE.Group();
    rightArm.position.set(1.55, 3.3, 0.2);
    const pole = createComicMesh(new THREE.CapsuleGeometry(0.11, 4.4, 8, 12), '#fde047', 0.028);
    pole.position.set(0.15, 0.35, 0.6);
    pole.rotation.x = 0.5;
    const tip = createComicMesh(createSoftBladeGeometry(0.8, 1.9, 0.16, 'cleaver'), '#38bdf8', 0.034, {
      emissive: '#0284c7',
      emissiveIntensity: 0.45,
    });
    tip.position.set(0.15, 1.85, 1.6);
    tip.rotation.x = 0.5;
    rightArm.add(pole, tip);

    // Orbiting Golden Guild Shields
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.8;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const sh = createComicMesh(new THREE.SphereGeometry(0.42, 14, 12), '#fbbf24', 0.024, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.35,
      });
      sh.scale.set(0.95, 1.25, 0.32);
      sh.position.set(Math.cos(a) * 2.85, 0.2, Math.sin(a) * 2.85);
      sh.rotation.y = -a;
      orbitGroup.add(sh);
    }

    shieldGroup = new THREE.Group();
    shieldGroup.position.y = 2.6;
    shieldGroup.visible = false;
    const aura = createComicMesh(new THREE.TorusGeometry(2.7, 0.22, 12, 32), '#fde047', 0.025, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.5,
    });
    aura.rotation.x = Math.PI / 2;
    shieldGroup.add(aura);

    body.add(torso, cape, crest, head, leftArm, rightArm, orbitGroup, shieldGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'drakorys') {
    // =========================================================
    // GILDIA AKT II BOSS: DRAKORYS, PRADAWNY SMOK GILDII!
    // =========================================================
    const dragonTex = createComicSurfaceTexture('#059669', '#fbbf24', 'scales');
    const dragonBody = createComicMesh(new THREE.SphereGeometry(1.65, 24, 18), '#059669', 0.045, {
      map: dragonTex,
    });
    dragonBody.scale.set(1.05, 1.15, 1.28);
    dragonBody.position.set(0, 2.25, -0.15);

    // Golden Plated Belly
    const belly = createComicMesh(new THREE.SphereGeometry(1.15, 20, 16), '#fbbf24', 0.032, {
      emissive: '#d97706',
      emissiveIntensity: 0.2,
    });
    belly.scale.set(0.92, 1.15, 0.72);
    belly.position.set(0, 2.1, 0.95);

    // Long Curved Dragon Neck + Horned Dragon Head!
    const neckGeo = createTaperedCurveGeometry(
      [
        [0, 3.1, 0.45],
        [0, 4.15, 0.95],
        [0, 4.95, 1.25],
      ],
      0.72,
      0.55,
      16,
      14
    );
    const neck = createComicMesh(neckGeo, '#047857', 0.038, { map: dragonTex });

    const drFaceTex = createMonsterFaceTexture({
      skin: '#10b981',
      eyeColor: '#fde047',
      accent: '#fbbf24',
      style: 'imp',
    });
    const head = createComicMesh(new THREE.SphereGeometry(0.88, 28, 22), '#10b981', 0.044, {
      map: drFaceTex,
    });
    head.rotation.y = -Math.PI / 2;
    head.scale.set(0.95, 0.92, 1.32);
    head.position.set(0, 5.2, 1.48);

    // Sweeping Golden Dragon Horns
    for (const s of [-1, 1]) {
      const hornGeo = createTaperedCurveGeometry(
        [
          [s * 0.42, 5.55, 1.35],
          [s * 0.95, 6.1, 0.85],
          [s * 1.25, 6.65, 0.25],
        ],
        0.24,
        0.045,
        16,
        10
      );
      const horn = createComicMesh(hornGeo, '#fbbf24', 0.032);
      body.add(horn);
    }

    // Arching Crystal-tipped Dragon Tail
    const tailGeo = createTaperedCurveGeometry(
      [
        [0, 1.45, -1.65],
        [0.45, 1.1, -3.15],
        [-0.35, 1.85, -4.45],
        [0, 2.85, -5.05],
      ],
      0.65,
      0.16,
      18,
      12
    );
    const tail = createComicMesh(tailGeo, '#047857', 0.038, { map: dragonTex });
    const tailGem = createComicMesh(
      createPlushLathe(
        [
          [0.01, -0.45],
          [0.36, -0.15],
          [0.44, 0.14],
          [0.2, 0.42],
          [0.01, 0.55],
        ],
        18
      ),
      '#fde047',
      0.028,
      {
        emissive: '#f59e0b',
        emissiveIntensity: 0.44,
      }
    );
    tailGem.position.set(0, 2.95, -5.15);

    // Massive Emerald-Gold Dragon Wings!
    const dWingGeo = createSoftWingGeometry(4.2, 2.75, 0.16, 'demon');
    const makeDragonWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 1.35, 3.65, -0.45);
      const w = createComicMesh(dWingGeo, '#10b981', 0.038, {
        emissive: '#059669',
        emissiveIntensity: 0.3,
      });
      if (side === -1) w.scale.x = -1;
      wg.add(w);
      return wg;
    };
    wingL = makeDragonWing(-1);
    wingR = makeDragonWing(1);

    // Orbiting Emerald Flame Orbs
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 3.2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const orb = createComicMesh(new THREE.SphereGeometry(0.32, 14, 12), '#34d399', 0.022, {
        emissive: '#10b981',
        emissiveIntensity: 0.5,
      });
      orb.position.set(Math.cos(a) * 3.1, Math.sin(i * 1.3) * 0.7, Math.sin(a) * 3.1);
      orbitGroup.add(orb);
    }

    body.add(dragonBody, belly, neck, head, tail, tailGem, wingL, wingR, orbitGroup);
  } else if (enemy.tier === 'miniboss') {
    // =========================================================
    // 8 BESPOKE SOFT CARTOON MINI-BOSSES — ZERO BOXES!
    // =========================================================
    buildUniqueMiniBossBody(enemy.archetype, body, (refs) => {
      leftArm = refs.leftArm;
      rightArm = refs.rightArm;
      orbitGroup = refs.orbitGroup;
      wingL = refs.wingL;
      wingR = refs.wingR;
      spiderLegs = refs.spiderLegs;
      flameMesh = refs.flameMesh;
    });
  } else {
    // =========================================================
    // DISTINCT SOFT CARTOON ARCHETYPES FOR STANDARD & ELITE MOBS!
    // =========================================================
    const isElite = enemy.tier === 'elite';
    const scale = isElite ? 1.28 : 1.0;
    const arch = enemy.archetype;

    const colorMap: Record<number, string> = {
      1: arch.includes('golem') ? '#7d7772' : arch.includes('nekro') ? '#349464' : '#e2e8f0',
      2: arch.includes('dzinn') ? '#38a3d1' : arch.includes('mumia') ? '#e8d5a3' : '#de8c26',
      3: arch.includes('driada') ? '#9d62d4' : arch.includes('plujec') ? '#84b82c' : '#2d8a52',
      4: arch.includes('szczelina') ? '#8e4ac4' : arch.includes('golem') ? '#3a465c' : '#cf3a56',
      5: arch.includes('golem') ? '#0284c7' : arch.includes('zorza') ? '#818cf8' : '#38bdf8',
      6: arch.includes('golem') ? '#ca8a04' : arch.includes('plazma') ? '#facc15' : '#f97316',
      7: arch.includes('golem') ? '#6366f1' : arch.includes('czas') ? '#c084fc' : '#00f5d4',
      8: arch.includes('golem') ? '#d97706' : arch.includes('kusznik') ? '#38bdf8' : '#fbbf24',
      9: arch.includes('golem') ? '#047857' : arch.includes('szaman') ? '#f59e0b' : '#10b981',
    };
    const col = colorMap[enemy.act] || '#cf3a56';

    if (arch.includes('golem')) {
      // Plump rounded boulder-golem with painted rune-stone texture, face & sturdy boots!
      const golemTex = createComicSurfaceTexture(col, enemy.act === 4 ? '#f97316' : '#38bdf8', 'armor');
      const golemFaceTex = createMonsterFaceTexture({
        skin: col,
        eyeColor: enemy.act === 4 ? '#fb923c' : '#38bdf8',
        accent: enemy.act === 4 ? '#facc15' : '#7dd3fc',
        style: 'golem',
      });
      const belly = createComicMesh(new THREE.SphereGeometry(0.68, 22, 18), col, 0.032, {
        map: golemTex,
      });
      belly.scale.set(1.12, 1.02, 0.96);
      belly.position.y = 0.96;
      const head = createComicMesh(new THREE.SphereGeometry(0.44, 24, 18), col, 0.03, {
        map: golemFaceTex,
      });
      head.rotation.y = -Math.PI / 2;
      head.position.set(0, 1.7, 0.12);
      leftArm = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), col, 0.026, { map: golemTex });
      leftArm.scale.set(0.92, 1.35, 0.92);
      leftArm.position.set(-0.78, 0.98, 0.1);
      rightArm = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), col, 0.026, { map: golemTex });
      rightArm.scale.set(0.92, 1.35, 0.92);
      rightArm.position.set(0.78, 0.98, 0.1);
      leftLeg = createComicMesh(new THREE.CapsuleGeometry(0.18, 0.28, 8, 12), '#334155', 0.022);
      leftLeg.position.set(-0.3, 0.28, 0.02);
      rightLeg = createComicMesh(new THREE.CapsuleGeometry(0.18, 0.28, 8, 12), '#334155', 0.022);
      rightLeg.position.set(0.3, 0.28, 0.02);
      body.add(belly, head, leftArm, rightArm, leftLeg, rightLeg);
    } else if (
      arch.includes('dzinn') ||
      arch.includes('nekro') ||
      arch.includes('szczelina') ||
      arch.includes('zorza') ||
      arch.includes('czas') ||
      arch.includes('kleryk') ||
      arch.includes('szaman')
    ) {
      // Swirly floating cartoon spirit / mage / shaman with painted robe, face & floating halo!
      const robeTex = createComicSurfaceTexture(col, '#fde047', 'robe');
      const spiritFaceTex = createMonsterFaceTexture({
        skin: col,
        eyeColor: enemy.act === 5 ? '#a5f3fc' : enemy.act === 7 ? '#00f5d4' : '#fde047',
        accent: '#f0abfc',
        style: 'dryad',
      });
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.18],
            [0.14, 0.45],
            [0.46, 0.95],
            [0.54, 1.35],
            [0.34, 1.62],
            [0.01, 1.68],
          ],
          24
        ),
        col,
        0.028,
        { map: robeTex }
      );
      const head = createComicMesh(new THREE.SphereGeometry(0.45, 24, 18), col, 0.028, {
        map: spiritFaceTex,
      });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 1.88;
      // Cute floating mystic hood/halo trim!
      const hoodRing = createComicMesh(
        new THREE.TorusGeometry(0.42, 0.08, 10, 20),
        enemy.act >= 7 ? '#fde047' : enemy.act === 5 ? '#bae6fd' : '#1e1b2e',
        0.02
      );
      hoodRing.rotation.x = Math.PI / 2 + 0.35;
      hoodRing.position.set(0, 1.72, -0.05);
      leftArm = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.38, 8, 12), col, 0.022);
      leftArm.position.set(-0.56, 1.25, 0.12);
      rightArm = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.38, 8, 12), col, 0.022);
      rightArm.position.set(0.56, 1.25, 0.12);
      body.add(robe, head, hoodRing, leftArm, rightArm);
    } else {
      // Plump comic fantasy minion tailored uniquely to every Act (1–9) with painted face + headgear!
      const texPattern =
        enemy.act === 1
          ? 'bone'
          : enemy.act === 2 || enemy.act === 9
            ? 'scales'
            : enemy.act === 3
              ? 'bark'
              : enemy.act === 5 || enemy.act === 6 || enemy.act === 8
                ? 'armor'
                : enemy.act === 7
                  ? 'robe'
                  : 'magma';
      const texAccentByAct: Record<number, string> = {
        1: '#94a3b8',
        2: '#f5c249',
        3: '#86efac',
        4: '#fb7185',
        5: '#e0f2fe',
        6: '#fbbf24',
        7: '#00f5d4',
        8: '#fbbf24',
        9: '#fde047',
      };
      const texAccent = texAccentByAct[enemy.act] || '#fb7185';
      const minionTex = createComicSurfaceTexture(col, texAccent, texPattern);
      const faceStyle =
        enemy.act === 1
          ? 'skull'
          : enemy.act === 2 || enemy.act === 5 || enemy.act === 7 || enemy.act === 8
            ? 'pharaoh'
            : enemy.act === 3
              ? 'dryad'
              : enemy.act === 6
                ? 'golem'
                : 'imp';
      const eyeByAct: Record<number, string> = {
        1: '#fb7185',
        2: '#38bdf8',
        3: '#fde047',
        4: '#fb7185',
        5: '#e0f2fe',
        6: '#fef08a',
        7: '#00f5d4',
        8: '#38bdf8',
        9: '#fde047',
      };
      const minionFaceTex = createMonsterFaceTexture({
        skin: col,
        eyeColor: eyeByAct[enemy.act] || '#fb7185',
        accent: texAccent,
        style: faceStyle,
      });

      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.32],
            [0.46, 0.45],
            [0.52, 0.9],
            [0.44, 1.28],
            [0.01, 1.38],
          ],
          24
        ),
        col,
        0.028,
        { map: minionTex }
      );
      const head = createComicMesh(new THREE.SphereGeometry(0.46, 26, 20), col, 0.028, {
        map: minionFaceTex,
      });
      head.rotation.y = -Math.PI / 2;
      head.scale.set(1.03, 0.96, 1.0);
      head.position.y = 1.7;

      // Cute thematic comic headgear per Act (Acts 1–9)!
      if (enemy.act === 3) {
        // Adorable spotted forest mushroom cap on Act 3 minions!
        const cap = createComicMesh(
          new THREE.SphereGeometry(0.65, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
          arch.includes('driada') ? '#9333ea' : '#22a355',
          0.026
        );
        cap.position.y = 1.9;
        const spot = createComicMesh(new THREE.SphereGeometry(0.11, 10, 8), '#fef08a', 0.012);
        spot.position.set(0.24, 2.34, 0.22);
        const spot2 = createComicMesh(new THREE.SphereGeometry(0.09, 10, 8), '#fef08a', 0.012);
        spot2.position.set(-0.26, 2.28, 0.16);
        body.add(cap, spot, spot2);
      } else if (enemy.act === 4) {
        // Cute curved imp horns on Act 4 minions!
        for (const s of [-1, 1]) {
          const horn = createComicMesh(
            createTaperedCurveGeometry(
              [
                [s * 0.26, 2.04, 0],
                [s * 0.44, 2.26, 0.06],
                [s * 0.38, 2.47, 0.1],
              ],
              0.08,
              0.02,
              10,
              8
            ),
            '#2b1d33',
            0.018
          );
          body.add(horn);
        }
      } else if (enemy.act === 5) {
        // Frosted icy crystal tiara halo on Act 5 Frost minions!
        const iceRing = createComicMesh(new THREE.TorusGeometry(0.42, 0.075, 10, 20), '#bae6fd', 0.018, {
          emissive: '#38bdf8',
          emissiveIntensity: 0.32,
        });
        iceRing.rotation.x = Math.PI / 2;
        iceRing.position.y = 2.12;
        const gem = createComicMesh(new THREE.SphereGeometry(0.14, 12, 10), '#e0f2fe', 0.014, {
          emissive: '#22d3ee',
          emissiveIntensity: 0.38,
        });
        gem.scale.set(0.85, 1.4, 0.85);
        gem.position.set(0, 2.28, 0.28);
        body.add(iceRing, gem);
      } else if (enemy.act === 6) {
        // Plump riveted bronze forge helmet with glowing amber crest on Act 6 minions!
        const helm = createComicMesh(
          new THREE.SphereGeometry(0.5, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
          '#92400e',
          0.024
        );
        helm.position.y = 1.76;
        const crest = createComicMesh(new THREE.CapsuleGeometry(0.09, 0.34, 8, 12), '#fbbf24', 0.018, {
          emissive: '#f97316',
          emissiveIntensity: 0.32,
        });
        crest.rotation.x = Math.PI / 2;
        crest.position.set(0, 2.26, -0.04);
        body.add(helm, crest);
      } else if (enemy.act === 7) {
        // Luminous golden-teal eclipse halo behind head on Act 7 Eternity minions!
        const halo = createComicMesh(new THREE.TorusGeometry(0.52, 0.065, 10, 24), '#fde047', 0.016, {
          emissive: '#00f5d4',
          emissiveIntensity: 0.36,
        });
        halo.position.set(0, 1.95, -0.22);
        body.add(halo);
      } else if (enemy.act === 8) {
        // Royal knight dome helmet + flowing sapphire plume on Act 8 Guild minions!
        const helm = createComicMesh(
          new THREE.SphereGeometry(0.5, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
          '#1e40af',
          0.024
        );
        helm.position.y = 1.76;
        const plume = createComicMesh(
          createTaperedCurveGeometry(
            [
              [0, 2.22, 0.12],
              [0, 2.48, -0.18],
              [0, 2.26, -0.52],
            ],
            0.14,
            0.035,
            12,
            10
          ),
          '#fbbf24',
          0.02
        );
        body.add(helm, plume);
      } else if (enemy.act === 9) {
        // Cute curved golden baby-dragon horns on Act 9 Guild Dragon minions!
        for (const s of [-1, 1]) {
          const dHorn = createComicMesh(
            createTaperedCurveGeometry(
              [
                [s * 0.24, 2.04, -0.02],
                [s * 0.44, 2.28, -0.14],
                [s * 0.54, 2.48, -0.3],
              ],
              0.09,
              0.025,
              12,
              10
            ),
            '#fbbf24',
            0.018
          );
          body.add(dHorn);
        }
      } else if (arch.includes('mumia')) {
        // Soft bandage rings around Mummy!
        for (let b = 0; b < 3; b++) {
          const wrap = createComicMesh(new THREE.TorusGeometry(0.5 - b * 0.03, 0.06, 8, 18), '#f5ead0', 0.016);
          wrap.rotation.x = Math.PI / 2 + 0.12;
          wrap.position.y = 0.58 + b * 0.26;
          body.add(wrap);
        }
      }

      // Cute articulated cartoon boots/feet!
      const bootColByAct: Record<number, string> = {
        1: '#475569',
        2: '#92400e',
        3: '#3f2e26',
        4: '#311b3b',
        5: '#1e3a8a',
        6: '#572814',
        7: '#312e81',
        8: '#1e3a8a',
        9: '#065f46',
      };
      const bootCol = bootColByAct[enemy.act] || '#311b3b';
      leftLeg = createComicMesh(new THREE.CapsuleGeometry(0.13, 0.22, 8, 12), bootCol, 0.02);
      leftLeg.position.set(-0.22, 0.24, 0.04);
      rightLeg = createComicMesh(new THREE.CapsuleGeometry(0.13, 0.22, 8, 12), bootCol, 0.02);
      rightLeg.position.set(0.22, 0.24, 0.04);

      leftArm = createComicMesh(new THREE.CapsuleGeometry(0.12, 0.36, 8, 14), col, 0.022);
      leftArm.position.set(-0.56, 0.98, 0.1);
      rightArm = new THREE.Group();
      rightArm.position.set(0.56, 1.1, 0.1);
      const rMesh = createComicMesh(new THREE.CapsuleGeometry(0.12, 0.36, 8, 14), col, 0.022);
      rMesh.position.y = -0.2;
      const club = createComicMesh(new THREE.CapsuleGeometry(0.1, 0.62, 8, 12), '#68778f', 0.02);
      club.position.set(0, -0.45, 0.28);
      club.rotation.x = Math.PI * 0.4;
      rightArm.add(rMesh, club);

      body.add(torso, head, leftArm, rightArm, leftLeg, rightLeg);
    }

    if (isElite) {
      const affixCol =
        enemy.affix === 'mortar'
          ? '#f97316'
          : enemy.affix === 'frost'
            ? '#38bdf8'
            : enemy.affix === 'charger'
              ? '#facc15'
              : enemy.affix === 'vampiric'
                ? '#4ade80'
                : '#a855f7';
      // Smooth cartoon Affix-colored Elite Crown!
      const crown = createComicMesh(new THREE.TorusGeometry(0.32, 0.085, 10, 20), affixCol, 0.024, {
        emissive: affixCol,
        emissiveIntensity: 0.32,
      });
      crown.rotation.x = Math.PI / 2;
      crown.position.y = 2.24;
      const crownGem = createComicMesh(new THREE.SphereGeometry(0.12, 12, 10), '#fde047', 0.016, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.3,
      });
      crownGem.position.set(0, 2.38, 0.24);
      body.add(crown, crownGem);
    }

    body.scale.setScalar(scale);
  }

  const ringColor =
    enemy.tier === 'goblin'
      ? '#fbbf24'
      : enemy.tier === 'totem'
        ? '#a855f7'
        : enemy.tier === 'barrel'
          ? '#ef4444'
          : enemy.tier === 'elite' && enemy.affix
            ? enemy.affix === 'mortar'
              ? '#f97316'
              : enemy.affix === 'frost'
                ? '#38bdf8'
                : enemy.affix === 'charger'
                  ? '#facc15'
                  : '#4ade80'
            : enemy.tier === 'boss'
              ? '#be123c'
              : '#d97706';

  const tauntRing = new THREE.Mesh(
    new THREE.RingGeometry(enemy.radius * 0.92, enemy.radius * 1.16, 32),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity:
        enemy.tier === 'boss' ||
        enemy.tier === 'miniboss' ||
        enemy.tier === 'goblin' ||
        enemy.tier === 'totem' ||
        enemy.tier === 'barrel' ||
        enemy.tier === 'elite'
          ? 0.48
          : 0,
      depthWrite: false,
    })
  );
  tauntRing.rotation.x = -Math.PI / 2;
  tauntRing.position.y = 0.05;
  root.add(tauntRing);

  const barW =
    enemy.tier === 'boss' ? 3.8 : enemy.tier === 'miniboss' ? 2.7 : enemy.tier === 'goblin' ? 1.85 : 1.45;
  const barY =
    enemy.tier === 'boss' ? 7.0 : enemy.tier === 'miniboss' ? 4.9 : enemy.tier === 'totem' ? 4.2 : 2.6;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.16, 0.28),
    new THREE.MeshBasicMaterial({ color: '#141122', side: THREE.DoubleSide })
  );
  hpBarBg.position.y = barY;
  hpBarBg.rotation.x = -0.65;
  hpBarBg.visible = enemy.tier !== 'barrel';
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.17),
    new THREE.MeshBasicMaterial({
      color:
        enemy.tier === 'goblin'
          ? '#fbbf24'
          : enemy.tier === 'totem'
            ? '#a855f7'
            : enemy.tier === 'boss'
              ? '#f43f5e'
              : enemy.tier === 'miniboss'
                ? '#f59e0b'
                : '#ef4444',
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(0, barY, 0.02);
  hpBarFill.rotation.x = -0.65;
  hpBarFill.visible = enemy.tier !== 'barrel';
  root.add(hpBarFill);

  const flashMats: Array<{ mat: THREE.MeshToonMaterial; origHex: number; origInt: number }> = [];
  const biomeInk = getBiomeOutlineColor(enemy.act);
  body.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.material instanceof THREE.MeshToonMaterial) {
      flashMats.push({
        mat: mesh.material,
        origHex: mesh.material.emissive.getHex(),
        origInt: mesh.material.emissiveIntensity,
      });
    } else if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms?.uThickness) {
      // Biome-tinted comic outlines (deep navy / warm umber / forest green / crimson-plum!)
      const thick = Number(mesh.material.uniforms.uThickness.value) || 0.032;
      mesh.material = getOutlineMaterial(thick, biomeInk);
    }
  });

  // Spinning Comic Stagger-Broken Stars Ring above Boss / Mini-Boss head!
  const staggerStarsGroup = new THREE.Group();
  staggerStarsGroup.position.y = enemy.tier === 'boss' ? 6.4 : enemy.tier === 'miniboss' ? 4.4 : 2.6;
  staggerStarsGroup.visible = false;
  const starGeo = createSoftStarGeometry(0.26, 0.12, 5, 0.06);
  for (let s = 0; s < 4; s++) {
    const a = (s / 4) * Math.PI * 2;
    const star = createComicMesh(starGeo, '#fde047', 0.016, {
      emissive: '#f59e0b',
      emissiveIntensity: 0.46,
    });
    const r = enemy.tier === 'boss' ? 1.45 : 0.95;
    star.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    staggerStarsGroup.add(star);
  }
  root.add(staggerStarsGroup);

  // Violet Warlock Curse Primer Ring (signals Warrior Co-op Detonation "WYBUCH CIENIA!")
  const curseRing = new THREE.Mesh(
    new THREE.RingGeometry(enemy.radius * 0.72, enemy.radius * 0.96, 28),
    new THREE.MeshBasicMaterial({
      color: '#c084fc',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  curseRing.rotation.x = -Math.PI / 2;
  curseRing.position.y = 0.09;
  curseRing.visible = false;
  root.add(curseRing);

  return {
    root,
    body,
    hpBarBg,
    hpBarFill,
    shieldGroup,
    orbitGroup,
    wingL,
    wingR,
    flameMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    spiderLegs,
    tauntRing,
    staggerStarsGroup,
    curseRing,
    tier: enemy.tier,
    bossId: enemy.bossId,
    archetype: enemy.archetype,
    lastHp: enemy.hp,
    hitFlashUntil: 0,
    flashMats,
  };
}

function buildUniqueMiniBossBody(
  archetype: string,
  body: THREE.Group,
  setRefs: (refs: {
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    orbitGroup?: THREE.Group;
    wingL?: THREE.Object3D;
    wingR?: THREE.Object3D;
    spiderLegs?: THREE.Object3D[];
    flameMesh?: THREE.Object3D;
  }) => void
) {
  switch (archetype) {
    case 'mb_krypta_kat': {
      // Plump Cartoon Crypt Executioner w/ Curved Hood, Rounded Iron Mask & Sculpted Double-Axe!
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.1],
            [0.72, 0.25],
            [0.95, 1.05],
            [1.08, 2.05],
            [0.85, 2.8],
            [0.01, 2.95],
          ],
          24
        ),
        '#522532',
        0.04
      );
      torso.scale.set(1.06, 1, 0.85);
      const collar = createComicMesh(new THREE.TorusGeometry(0.74, 0.18, 12, 24), '#64748b', 0.032);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 2.85;
      const head = createComicMesh(new THREE.SphereGeometry(0.62, 22, 18), '#262030', 0.038);
      head.position.y = 3.38;
      const hoodTip = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 3.65, 0],
            [0, 4.15, -0.25],
            [0, 4.3, -0.68],
          ],
          0.42,
          0.06,
          14,
          12
        ),
        '#262030',
        0.032
      );
      const mask = createComicMesh(new THREE.SphereGeometry(0.45, 18, 14), '#8a98ad', 0.028);
      mask.scale.set(0.95, 1.08, 0.55);
      mask.position.set(0, 3.35, 0.42);
      addMonsterEyes(body, 3.4, 0.68, 0.17, 0.095, '#f43f5e');

      const rightArm = new THREE.Group();
      rightArm.position.set(1.18, 2.35, 0.2);
      const armM = createComicMesh(new THREE.CapsuleGeometry(0.24, 0.85, 10, 14), '#522532', 0.03);
      armM.position.y = -0.35;
      const shaft = createComicMesh(new THREE.CapsuleGeometry(0.1, 3.2, 8, 14), '#5c341a', 0.028);
      shaft.position.set(0.1, 0.2, 0.7);
      shaft.rotation.x = 0.55;
      const axeBlade = createComicMesh(createSoftBladeGeometry(1.15, 1.45, 0.16, 'axe'), '#a8b7cc', 0.034, {
        emissive: '#b91c1c',
        emissiveIntensity: 0.22,
      });
      axeBlade.rotation.y = Math.PI / 2;
      axeBlade.position.set(0.1, 1.15, 1.45);
      rightArm.add(armM, shaft, axeBlade);
      body.add(torso, collar, head, hoodTip, mask, rightArm);
      setRefs({ rightArm });
      return;
    }

    case 'mb_nekro_lord': {
      // Mordath: Floating Cartoon Lich w/ Plush Robe, Golden Orb-Halo & Soul Lantern Staff!
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.2],
            [1.15, 0.35],
            [0.85, 1.55],
            [0.64, 2.75],
            [0.01, 3.0],
          ],
          24
        ),
        '#3b1e61',
        0.04
      );
      const cowl = createComicMesh(new THREE.SphereGeometry(0.68, 20, 16), '#291445', 0.038);
      cowl.position.y = 3.35;
      const skullFace = createMonsterFaceTexture({ skin: '#eef2f7', eyeColor: '#c084fc', accent: '#eab308', style: 'skull' });
      const skull = createComicMesh(new THREE.SphereGeometry(0.48, 24, 18), '#eef2f7', 0.032, { map: skullFace });
      skull.rotation.y = -Math.PI / 2;
      skull.position.set(0, 3.3, 0.25);

      const halo = new THREE.Group();
      halo.position.set(0, 3.2, -0.75);
      const sealRing = createComicMesh(new THREE.TorusGeometry(1.55, 0.15, 12, 28), '#eab308', 0.03, {
        emissive: '#ca8a04',
        emissiveIntensity: 0.28,
      });
      halo.add(sealRing);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const bead = createComicMesh(new THREE.SphereGeometry(0.18, 12, 10), '#c084fc', 0.02, {
          emissive: '#9333ea',
          emissiveIntensity: 0.35,
        });
        bead.position.set(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0);
        halo.add(bead);
      }

      const rightArm = new THREE.Group();
      rightArm.position.set(0.95, 2.35, 0.4);
      const staff = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, -1.2, 0],
            [0.08, 0.2, 0],
            [-0.08, 1.4, 0.1],
            [0.15, 1.85, 0.25],
          ],
          0.09,
          0.06,
          16,
          10
        ),
        '#4f301c',
        0.026
      );
      const lantern = createComicMesh(new THREE.SphereGeometry(0.42, 18, 14), '#a855f7', 0.028, {
        emissive: '#7c3aed',
        emissiveIntensity: 0.4,
      });
      lantern.position.set(0.1, 1.5, 0.25);
      rightArm.add(staff, lantern);
      body.add(robe, cowl, skull, halo, rightArm);
      setRefs({ orbitGroup: halo, rightArm });
      return;
    }

    case 'mb_sfinks': {
      // Plush Cartoon Golden Sphinx w/ Fluffy Mane Puffs & Sculpted Feathered Wings!
      const lionBody = createComicMesh(new THREE.CapsuleGeometry(0.86, 1.45, 14, 22), '#e0a53c', 0.04);
      lionBody.rotation.x = Math.PI / 2;
      lionBody.position.y = 1.38;
      for (const sx of [-0.62, 0.62]) {
        for (const sz of [-0.95, 0.95]) {
          const leg = createComicMesh(new THREE.CapsuleGeometry(0.25, 0.72, 10, 14), '#cc8f2b', 0.032);
          leg.position.set(sx, 0.68, sz);
          const paw = createComicMesh(new THREE.SphereGeometry(0.3, 14, 12), '#e0a53c', 0.026);
          paw.scale.set(1, 0.65, 1.25);
          paw.position.set(sx, 0.22, sz + 0.12);
          body.add(leg, paw);
        }
      }
      const sphinxFace = createMonsterFaceTexture({ skin: '#f2c357', eyeColor: '#38bdf8', accent: '#1b82b8', style: 'pharaoh' });
      const head = createComicMesh(new THREE.SphereGeometry(0.7, 26, 20), '#f2c357', 0.04, { map: sphinxFace });
      head.rotation.y = -Math.PI / 2;
      head.position.set(0, 2.45, 1.42);

      // Cute cat ears + fluffy royal-blue mane puffs (ZERO BoxGeometry!)
      for (const s of [-1, 1]) {
        const ear = createComicMesh(
          createTaperedCurveGeometry(
            [
              [s * 0.42, 2.95, 1.38],
              [s * 0.56, 3.38, 1.35],
            ],
            0.18,
            0.04,
            10,
            10
          ),
          '#f2c357',
          0.024
        );
        body.add(ear);
      }
      for (let m = 0; m < 10; m++) {
        const a = (m / 10) * Math.PI * 2;
        const puff = createComicMesh(
          new THREE.SphereGeometry(0.34, 14, 12),
          m % 2 === 0 ? '#1b82b8' : '#f5c249',
          0.024
        );
        puff.position.set(Math.cos(a) * 0.68, 2.42 + Math.sin(a) * 0.58, 1.15);
        body.add(puff);
      }

      // Sculpted Feathered Wings (ZERO boxes!)
      const wingGeo = createSoftWingGeometry(2.15, 1.45, 0.14, 'feather');
      const wingL = new THREE.Group();
      wingL.position.set(-0.82, 2.0, -0.1);
      const wlm = createComicMesh(wingGeo, '#e8b631', 0.034);
      wlm.scale.x = -1;
      wingL.add(wlm);

      const wingR = new THREE.Group();
      wingR.position.set(0.82, 2.0, -0.1);
      const wrm = createComicMesh(wingGeo, '#e8b631', 0.034);
      wingR.add(wrm);

      body.add(lionBody, head, wingL, wingR);
      setRefs({ wingL, wingR });
      return;
    }

    case 'mb_faraon_cien': {
      // Setesh: Soft Sculpted Jackal-Headed Anubis Solar Priest (ZERO BoxGeometry!)
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [1.02, 0.06],
            [0.82, 1.15],
            [0.64, 2.35],
            [0.01, 2.55],
          ],
          24
        ),
        '#e8d3a0',
        0.04
      );
      const collar = createComicMesh(new THREE.TorusGeometry(0.72, 0.2, 12, 24), '#eab308', 0.03);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 2.48;

      const jackalSkull = createComicMesh(new THREE.SphereGeometry(0.52, 20, 16), '#242636', 0.036);
      jackalSkull.position.set(0, 3.18, 0.08);
      const snout = createComicMesh(new THREE.CapsuleGeometry(0.24, 0.42, 10, 14), '#242636', 0.03);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 3.06, 0.56);
      addMonsterEyes(body, 3.26, 0.54, 0.2, 0.11, '#facc15');

      for (const s of [-1, 1]) {
        const ear = createComicMesh(
          createTaperedCurveGeometry(
            [
              [s * 0.24, 3.55, 0.0],
              [s * 0.3, 4.1, -0.05],
              [s * 0.28, 4.55, -0.08],
            ],
            0.16,
            0.035,
            12,
            10
          ),
          '#242636',
          0.028
        );
        body.add(ear);
      }

      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 3.25;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const sun = createComicMesh(new THREE.SphereGeometry(0.32, 16, 14), '#facc15', 0.026, {
          emissive: '#d97706',
          emissiveIntensity: 0.36,
        });
        sun.position.set(Math.cos(a) * 1.95, 0, Math.sin(a) * 1.95);
        orbitGroup.add(sun);
      }
      const rightArm = new THREE.Group();
      rightArm.position.set(0.95, 2.4, 0.3);
      const staff = createComicMesh(new THREE.CapsuleGeometry(0.09, 2.9, 8, 12), '#eab308', 0.026);
      const ankhLoop = createComicMesh(new THREE.TorusGeometry(0.4, 0.11, 10, 22), '#facc15', 0.026, {
        emissive: '#d97706',
        emissiveIntensity: 0.32,
      });
      ankhLoop.position.y = 1.85;
      rightArm.add(staff, ankhLoop);
      body.add(robe, collar, jackalSkull, snout, orbitGroup, rightArm);
      setRefs({ orbitGroup, rightArm });
      return;
    }

    case 'mb_drzewiec': {
      // Korzenny Kolos Bagien: Plush Storybook Treant w/ Fluffy Moss Canopy & Spotted Mushrooms!
      const trunk = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [1.45, 0.1],
            [1.12, 0.9],
            [1.22, 1.95],
            [0.98, 2.75],
            [0.01, 2.95],
          ],
          24
        ),
        '#593c2b',
        0.044
      );
      addMonsterEyes(body, 2.15, 1.16, 0.38, 0.18, '#86efac', '#241812');

      // Lush moss cloud puffs on back/shoulders
      const mossPuffs: Array<[number, number, number, number]> = [
        [0, 3.05, -0.25, 1.05],
        [-0.85, 2.85, -0.2, 0.78],
        [0.85, 2.85, -0.2, 0.78],
      ];
      for (const [mx, my, mz, mr] of mossPuffs) {
        const puff = createComicMesh(new THREE.SphereGeometry(mr, 18, 14), '#257a42', 0.034);
        puff.position.set(mx, my, mz);
        body.add(puff);
      }

      // Cute domed cartoon mushrooms on shoulders!
      for (let m = 0; m < 4; m++) {
        const cap = createComicMesh(
          new THREE.SphereGeometry(0.46, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
          m % 2 === 0 ? '#a855f7' : '#4ade80',
          0.026,
          { emissive: m % 2 === 0 ? '#7c3aed' : '#16a34a', emissiveIntensity: 0.3 }
        );
        cap.position.set((m - 1.5) * 0.62, 3.75, -0.25 + (m % 2) * 0.3);
        body.add(cap);
      }

      // Chunky soft rounded branch arms & big mossy fists (ZERO BoxGeometry!)
      const makeBranchArm = (s: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(s * 1.38, 2.35, 0.25);
        const arm = createComicMesh(new THREE.CapsuleGeometry(0.36, 1.35, 10, 16), '#4c3224', 0.036);
        arm.position.y = -0.65;
        const fist = createComicMesh(new THREE.SphereGeometry(0.52, 16, 14), '#593c2b', 0.036);
        fist.position.y = -1.45;
        g.add(arm, fist);
        return g;
      };
      const leftArm = makeBranchArm(-1);
      const rightArm = makeBranchArm(1);
      body.add(trunk, leftArm, rightArm);
      setRefs({ leftArm, rightArm });
      return;
    }

    case 'mb_wiedzma': {
      // Vespera, Tkaczka Jadu: Plush Cartoon Spider-Witch w/ Curved Hat & Venomy Spots!
      const abdomen = createComicMesh(new THREE.SphereGeometry(1.22, 22, 18), '#4c1d73', 0.042, {
        emissive: '#4d7c0f',
        emissiveIntensity: 0.2,
      });
      abdomen.scale.set(1.0, 0.88, 1.32);
      abdomen.position.set(0, 1.3, -1.08);
      for (let sp = 0; sp < 4; sp++) {
        const spot = createComicMesh(new THREE.SphereGeometry(0.24, 12, 10), '#84cc16', 0.018, {
          emissive: '#65a30d',
          emissiveIntensity: 0.32,
        });
        spot.position.set((sp % 2 === 0 ? -1 : 1) * 0.55, 1.85, -0.7 - sp * 0.35);
        body.add(spot);
      }

      const spiderLegs: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const lp = new THREE.Group();
          lp.position.set(s * 0.85, 1.1, 0.45 - i * 0.85);
          const legGeo = createTaperedCurveGeometry(
            [
              [0, 0, 0],
              [s * 0.65, 0.45, 0],
              [s * 1.25, -0.95, 0],
            ],
            0.18,
            0.055,
            12,
            10
          );
          const leg = createComicMesh(legGeo, '#33194d', 0.028);
          lp.add(leg);
          body.add(lp);
          spiderLegs.push(lp);
        }
      }

      const witchTorso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0],
            [0.64, 0.1],
            [0.48, 0.75],
            [0.54, 1.3],
            [0.01, 1.4],
          ],
          22
        ),
        '#6d28d9',
        0.036
      );
      witchTorso.position.set(0, 1.5, 0.68);
      const witchFace = createMonsterFaceTexture({ skin: '#d8b4fe', eyeColor: '#a3e635', accent: '#6d28d9', style: 'dryad' });
      const head = createComicMesh(new THREE.SphereGeometry(0.48, 24, 18), '#d8b4fe', 0.034, { map: witchFace });
      head.rotation.y = -Math.PI / 2;
      head.position.set(0, 3.1, 0.68);

      const hatBrim = createComicMesh(new THREE.CylinderGeometry(0.82, 0.86, 0.1, 24), '#271440', 0.03);
      hatBrim.position.set(0, 3.45, 0.68);
      const hatTip = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 3.45, 0.68],
            [0.05, 4.0, 0.55],
            [0.24, 4.4, 0.25],
          ],
          0.46,
          0.05,
          14,
          12
        ),
        '#271440',
        0.032
      );

      const rightArm = new THREE.Group();
      rightArm.position.set(0.75, 2.35, 0.85);
      const venomDrop = createComicMesh(new THREE.SphereGeometry(0.3, 14, 12), '#84cc16', 0.024, {
        emissive: '#65a30d',
        emissiveIntensity: 0.36,
      });
      venomDrop.scale.set(0.85, 0.85, 1.5);
      venomDrop.position.set(0.15, -0.2, 0.55);
      rightArm.add(venomDrop);

      body.add(abdomen, witchTorso, head, hatBrim, hatTip, rightArm);
      setRefs({ spiderLegs, rightArm });
      return;
    }

    case 'mb_golem_lawy': {
      // Plush Rounded Lava-Furnace Golem (ZERO BoxGeometry!)
      for (const s of [-1, 1]) {
        const leg = createComicMesh(new THREE.CapsuleGeometry(0.44, 0.68, 10, 16), '#2f2938', 0.036);
        leg.position.set(s * 0.58, 0.65, 0);
        body.add(leg);
      }
      const torso = createComicMesh(new THREE.SphereGeometry(1.38, 24, 18), '#262130', 0.044);
      torso.scale.set(1.06, 0.98, 0.92);
      torso.position.y = 2.2;

      // Glowing round magma furnace belly w/ smooth iron rings!
      const furnace = createComicMesh(new THREE.SphereGeometry(0.76, 18, 14), '#f97316', 0.028, {
        emissive: '#ea580c',
        emissiveIntensity: 0.42,
      });
      furnace.scale.set(1.08, 0.95, 0.48);
      furnace.position.set(0, 2.05, 1.08);
      const grateRing = createComicMesh(new THREE.TorusGeometry(0.76, 0.1, 10, 22), '#475569', 0.024);
      grateRing.position.set(0, 2.05, 1.18);

      addMonsterEyes(body, 2.95, 1.1, 0.38, 0.17, '#fde047', '#1a1622');

      for (const s of [-1, 1]) {
        const chimney = createComicMesh(new THREE.CapsuleGeometry(0.26, 0.85, 10, 14), '#475569', 0.032);
        chimney.position.set(s * 0.82, 3.55, -0.25);
        const puff = createComicMesh(new THREE.SphereGeometry(0.32, 12, 10), '#f97316', 0.02, {
          emissive: '#dc2626',
          emissiveIntensity: 0.34,
        });
        puff.position.set(s * 0.82, 4.18, -0.25);
        body.add(chimney, puff);
      }

      const leftArm = createComicMesh(new THREE.SphereGeometry(0.76, 18, 14), '#342836', 0.04, {
        emissive: '#b91c1c',
        emissiveIntensity: 0.25,
      });
      leftArm.scale.set(0.95, 1.15, 0.95);
      leftArm.position.set(-1.72, 1.8, 0.25);

      const rightArm = createComicMesh(new THREE.SphereGeometry(0.76, 18, 14), '#342836', 0.04, {
        emissive: '#b91c1c',
        emissiveIntensity: 0.25,
      });
      rightArm.scale.set(0.95, 1.15, 0.95);
      rightArm.position.set(1.72, 1.8, 0.25);

      body.add(torso, furnace, grateRing, leftArm, rightArm);
      setRefs({ leftArm, rightArm, flameMesh: furnace });
      return;
    }

    case 'mb_hc_mroz_rycerz': {
      // Voryn, Rycerz Zorzy (Act 5 HC): Frosted Crystal Paladin w/ Aurora Cape, Visor Helm, Frost Shield & Ice Lance!
      const frostArmorTex = createComicSurfaceTexture('#1d4ed8', '#bae6fd', 'armor');
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.12],
            [0.75, 0.3],
            [0.98, 1.2],
            [1.12, 2.2],
            [0.86, 2.95],
            [0.01, 3.1],
          ],
          24
        ),
        '#1e40af',
        0.04,
        { map: frostArmorTex }
      );
      const cape = createComicMesh(
        new THREE.CylinderGeometry(0.76, 1.24, 2.4, 20, 2, true, Math.PI * 0.62, Math.PI * 0.76),
        '#38bdf8',
        0.026,
        { side: THREE.DoubleSide, emissive: '#0284c7', emissiveIntensity: 0.24 }
      );
      cape.position.set(0, 1.75, -0.35);
      cape.rotation.x = 0.2;
      const headTex = createMonsterFaceTexture({ skin: '#e0f2fe', eyeColor: '#22d3ee', accent: '#38bdf8', style: 'pharaoh' });
      const head = createComicMesh(new THREE.SphereGeometry(0.6, 26, 20), '#e0f2fe', 0.036, { map: headTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.55;
      const crest = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 4.05, 0.2],
            [0, 4.48, -0.15],
            [0, 4.18, -0.68],
          ],
          0.22,
          0.04,
          14,
          12
        ),
        '#7dd3fc',
        0.024,
        { emissive: '#38bdf8', emissiveIntensity: 0.32 }
      );
      const leftArm = new THREE.Group();
      leftArm.position.set(-1.18, 2.35, 0.2);
      const fShield = createComicMesh(new THREE.SphereGeometry(0.95, 20, 16), '#7dd3fc', 0.032, {
        emissive: '#0284c7',
        emissiveIntensity: 0.28,
      });
      fShield.scale.set(0.32, 1.25, 0.98);
      fShield.position.set(-0.15, -0.35, 0.35);
      leftArm.add(fShield);
      const rightArm = new THREE.Group();
      rightArm.position.set(1.18, 2.35, 0.2);
      const lanceShaft = createComicMesh(new THREE.CapsuleGeometry(0.09, 3.6, 8, 14), '#e0f2fe', 0.024);
      lanceShaft.position.set(0.1, 0.2, 0.7);
      lanceShaft.rotation.x = 0.55;
      const lanceTip = createComicMesh(createSoftBladeGeometry(0.55, 1.55, 0.14, 'sword'), '#38bdf8', 0.028, {
        emissive: '#22d3ee',
        emissiveIntensity: 0.42,
      });
      lanceTip.position.set(0.1, 1.45, 1.65);
      lanceTip.rotation.x = 0.55;
      rightArm.add(lanceShaft, lanceTip);
      body.add(torso, cape, head, crest, leftArm, rightArm);
      setRefs({ leftArm, rightArm });
      return;
    }

    case 'mb_hc_mroz_wiedma': {
      // Glacia, Wyrocznia Lodu (Act 5 HC): Floating Glacial Oracle w/ Ice-Pearl Crown & Orbiting Snow Ring!
      const frostRobeTex = createComicSurfaceTexture('#0284c7', '#e0f2fe', 'robe');
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.25],
            [1.18, 0.45],
            [0.86, 1.6],
            [0.66, 2.8],
            [0.01, 3.05],
          ],
          24
        ),
        '#0369a1',
        0.038,
        { map: frostRobeTex, emissive: '#0284c7', emissiveIntensity: 0.22 }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#e0f2fe', eyeColor: '#22d3ee', accent: '#7dd3fc', style: 'dryad' });
      const head = createComicMesh(new THREE.SphereGeometry(0.58, 26, 20), '#e0f2fe', 0.036, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.5;
      const halo = new THREE.Group();
      halo.position.set(0, 2.8, 0);
      const ring = createComicMesh(new THREE.TorusGeometry(1.75, 0.1, 10, 28), '#7dd3fc', 0.022, {
        emissive: '#38bdf8',
        emissiveIntensity: 0.38,
      });
      ring.rotation.x = Math.PI / 2 + 0.25;
      halo.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const orb = createComicMesh(new THREE.SphereGeometry(0.2, 14, 12), '#e0f2fe', 0.018, {
          emissive: '#38bdf8',
          emissiveIntensity: 0.4,
        });
        orb.scale.set(0.85, 1.45, 0.85);
        orb.position.set(Math.cos(a) * 1.75, Math.sin(i) * 0.35, Math.sin(a) * 1.75);
        halo.add(orb);
      }
      const rightArm = new THREE.Group();
      rightArm.position.set(0.92, 2.45, 0.3);
      const staff = createComicMesh(new THREE.CapsuleGeometry(0.08, 2.8, 8, 12), '#bae6fd', 0.022);
      const crystal = createComicMesh(new THREE.SphereGeometry(0.36, 16, 14), '#22d3ee', 0.024, {
        emissive: '#06b6d4',
        emissiveIntensity: 0.45,
      });
      crystal.scale.set(0.82, 1.45, 0.82);
      crystal.position.y = 1.72;
      rightArm.add(staff, crystal);
      body.add(robe, head, halo, rightArm);
      setRefs({ orbitGroup: halo, rightArm });
      return;
    }

    case 'mb_hc_kuznia_straznik': {
      // Brimstone, Kowal Zagłady (Act 6 HC): Bronze Titan Blacksmith w/ Molten Forge Core & Twin Anvil-Hammers!
      const bronzeTex = createComicSurfaceTexture('#9a5b24', '#fbbf24', 'armor');
      const torso = createComicMesh(new THREE.SphereGeometry(1.32, 24, 18), '#854d1e', 0.042, { map: bronzeTex });
      torso.scale.set(1.12, 1.02, 0.92);
      torso.position.y = 2.05;
      const core = createComicMesh(new THREE.SphereGeometry(0.68, 18, 14), '#fbbf24', 0.026, {
        emissive: '#f97316',
        emissiveIntensity: 0.46,
      });
      core.scale.set(1, 0.95, 0.55);
      core.position.set(0, 2.05, 1.02);
      const faceTex = createMonsterFaceTexture({ skin: '#6b3e1a', eyeColor: '#fef08a', accent: '#f97316', style: 'golem' });
      const head = createComicMesh(new THREE.SphereGeometry(0.64, 24, 18), '#6b3e1a', 0.038, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.42;
      const makeAnvilArm = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.55, 2.35, 0.25);
        const arm = createComicMesh(new THREE.CapsuleGeometry(0.28, 0.9, 10, 14), '#92400e', 0.03);
        arm.position.y = -0.45;
        const hammer = createComicMesh(new THREE.CapsuleGeometry(0.45, 0.85, 12, 18), '#f59e0b', 0.032, {
          emissive: '#ea580c',
          emissiveIntensity: 0.36,
        });
        hammer.rotation.x = Math.PI / 2;
        hammer.position.set(0, -0.95, 0.55);
        g.add(arm, hammer);
        return g;
      };
      const leftArm = makeAnvilArm(-1);
      const rightArm = makeAnvilArm(1);
      body.add(torso, core, head, leftArm, rightArm);
      setRefs({ leftArm, rightArm, flameMesh: core });
      return;
    }

    case 'mb_hc_kuznia_automat': {
      // Solarius, Złoty Automat (Act 6 HC): Sleek Golden Clockwork Construct w/ Solar Reactor & Spinning Gear-Halo!
      const goldTex = createComicSurfaceTexture('#d97706', '#fef08a', 'armor');
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.35],
            [0.62, 0.65],
            [1.08, 1.85],
            [1.18, 2.65],
            [0.72, 3.1],
            [0.01, 3.2],
          ],
          24
        ),
        '#eab308',
        0.04,
        { map: goldTex }
      );
      const reactor = createComicMesh(new THREE.SphereGeometry(0.56, 18, 14), '#fef08a', 0.024, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.48,
      });
      reactor.position.set(0, 2.2, 0.92);
      const faceTex = createMonsterFaceTexture({ skin: '#fde047', eyeColor: '#38bdf8', accent: '#b45309', style: 'pharaoh' });
      const head = createComicMesh(new THREE.SphereGeometry(0.56, 24, 18), '#fde047', 0.036, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.65;
      const gearHalo = new THREE.Group();
      gearHalo.position.set(0, 2.6, -0.82);
      const gRing = createComicMesh(new THREE.TorusGeometry(1.45, 0.16, 10, 28), '#fbbf24', 0.028, {
        emissive: '#d97706',
        emissiveIntensity: 0.32,
      });
      gearHalo.add(gRing);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tooth = createComicMesh(new THREE.SphereGeometry(0.2, 12, 10), '#fef08a', 0.018);
        tooth.position.set(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0);
        gearHalo.add(tooth);
      }
      const makeCannonArm = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.32, 2.45, 0.18);
        const pod = createComicMesh(new THREE.CapsuleGeometry(0.32, 0.95, 10, 16), '#b45309', 0.03);
        pod.rotation.x = Math.PI / 2 - 0.35;
        pod.position.set(0, -0.25, 0.4);
        const muzzle = createComicMesh(new THREE.SphereGeometry(0.26, 14, 12), '#38bdf8', 0.02, {
          emissive: '#0284c7',
          emissiveIntensity: 0.44,
        });
        muzzle.position.set(0, -0.42, 0.95);
        g.add(pod, muzzle);
        return g;
      };
      const leftArm = makeCannonArm(-1);
      const rightArm = makeCannonArm(1);
      body.add(torso, reactor, head, gearHalo, leftArm, rightArm);
      setRefs({ orbitGroup: gearHalo, leftArm, rightArm, flameMesh: reactor });
      return;
    }

    case 'mb_hc_tron_herold': {
      // Chronos, Herold Zaćmienia (Act 7 HC): Winged Cosmic Time-Keeper w/ Starlight Wings & Crescent Scythe!
      const voidTex = createComicSurfaceTexture('#4c1d95', '#fde047', 'robe');
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.3],
            [0.95, 0.55],
            [0.78, 1.75],
            [0.98, 2.75],
            [0.64, 3.2],
            [0.01, 3.3],
          ],
          24
        ),
        '#4c1d95',
        0.04,
        { map: voidTex, emissive: '#6d28d9', emissiveIntensity: 0.25 }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#f5f3ff', eyeColor: '#fde047', accent: '#a855f7', style: 'pharaoh' });
      const head = createComicMesh(new THREE.SphereGeometry(0.58, 26, 20), '#f5f3ff', 0.036, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.72;
      const wGeo = createSoftWingGeometry(2.3, 1.55, 0.12, 'feather');
      const wingL = new THREE.Group();
      wingL.position.set(-0.78, 2.75, -0.45);
      const wlm = createComicMesh(wGeo, '#c084fc', 0.028, { emissive: '#7c3aed', emissiveIntensity: 0.34 });
      wlm.scale.x = -1;
      wingL.add(wlm);
      const wingR = new THREE.Group();
      wingR.position.set(0.78, 2.75, -0.45);
      wingR.add(createComicMesh(wGeo, '#c084fc', 0.028, { emissive: '#7c3aed', emissiveIntensity: 0.34 }));
      const halo = new THREE.Group();
      halo.position.y = 3.0;
      const tRing = createComicMesh(new THREE.TorusGeometry(1.85, 0.1, 10, 28), '#fde047', 0.02, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.4,
      });
      tRing.rotation.x = Math.PI / 2 - 0.3;
      halo.add(tRing);
      const rightArm = new THREE.Group();
      rightArm.position.set(1.05, 2.55, 0.25);
      const blade = createComicMesh(createSoftBladeGeometry(0.58, 2.6, 0.12, 'cleaver'), '#00f5d4', 0.028, {
        emissive: '#06b6d4',
        emissiveIntensity: 0.42,
      });
      blade.rotation.x = 0.58;
      blade.position.set(0.1, 0.25, 0.65);
      rightArm.add(blade);
      body.add(robe, head, wingL, wingR, halo, rightArm);
      setRefs({ wingL, wingR, orbitGroup: halo, rightArm });
      return;
    }

    case 'mb_hc_tron_serafin': {
      // Serafina, Ostrze Nieśmiertelnych (Act 7 HC): Radiant Teal-Winged Seraph Warrior w/ Twin Cosmic Swords!
      const serTex = createComicSurfaceTexture('#f8fafc', '#00f5d4', 'armor');
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.2],
            [0.98, 0.4],
            [0.64, 1.55],
            [0.88, 2.55],
            [0.58, 3.0],
            [0.01, 3.1],
          ],
          24
        ),
        '#f8fafc',
        0.036,
        { map: serTex }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#fff1f2', eyeColor: '#00f5d4', accent: '#fde047', style: 'dryad' });
      const head = createComicMesh(new THREE.SphereGeometry(0.56, 26, 20), '#fff1f2', 0.034, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.55;
      const tiara = createComicMesh(new THREE.TorusGeometry(0.56, 0.08, 10, 24), '#fde047', 0.02, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.36,
      });
      tiara.rotation.x = Math.PI / 2;
      tiara.position.y = 3.92;
      const wGeo = createSoftWingGeometry(2.55, 1.7, 0.12, 'feather');
      const wingL = new THREE.Group();
      wingL.position.set(-0.72, 2.65, -0.42);
      const wlm = createComicMesh(wGeo, '#00f5d4', 0.028, { emissive: '#06b6d4', emissiveIntensity: 0.36 });
      wlm.scale.x = -1;
      wingL.add(wlm);
      const wingR = new THREE.Group();
      wingR.position.set(0.72, 2.65, -0.42);
      wingR.add(createComicMesh(wGeo, '#00f5d4', 0.028, { emissive: '#06b6d4', emissiveIntensity: 0.36 }));
      const makeSwordArm = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.02, 2.45, 0.25);
        const sw = createComicMesh(createSoftBladeGeometry(0.42, 2.25, 0.1, 'sword'), side === 1 ? '#00f5d4' : '#c084fc', 0.024, {
          emissive: side === 1 ? '#06b6d4' : '#a855f7',
          emissiveIntensity: 0.42,
        });
        sw.rotation.x = 0.65;
        sw.position.set(0, -0.1, 0.55);
        g.add(sw);
        return g;
      };
      const leftArm = makeSwordArm(-1);
      const rightArm = makeSwordArm(1);
      body.add(torso, head, tiara, wingL, wingR, leftArm, rightArm);
      setRefs({ wingL, wingR, leftArm, rightArm });
      return;
    }

    case 'mb_guild_kapitan': {
      // Kapitan Valerius (Act 8 Guild I): Royal Sapphire-Gold Banner Knight w/ Plumed Helm, Tower Shield & Lance!
      const royalTex = createComicSurfaceTexture('#1e40af', '#fbbf24', 'armor');
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.1],
            [0.78, 0.28],
            [1.02, 1.3],
            [1.14, 2.25],
            [0.86, 2.9],
            [0.01, 3.05],
          ],
          24
        ),
        '#1d4ed8',
        0.04,
        { map: royalTex }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#fde68a', eyeColor: '#38bdf8', accent: '#fbbf24', style: 'pharaoh' });
      const head = createComicMesh(new THREE.SphereGeometry(0.6, 26, 20), '#fde68a', 0.036, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.5;
      const plume = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 3.98, 0.15],
            [0, 4.46, -0.22],
            [0, 4.02, -0.78],
          ],
          0.22,
          0.04,
          14,
          12
        ),
        '#fbbf24',
        0.024
      );
      const leftArm = new THREE.Group();
      leftArm.position.set(-1.18, 2.35, 0.2);
      const shield = createComicMesh(new THREE.SphereGeometry(0.98, 20, 16), '#fbbf24', 0.034, { map: royalTex });
      shield.scale.set(0.32, 1.32, 1.0);
      shield.position.set(-0.15, -0.35, 0.35);
      leftArm.add(shield);
      const rightArm = new THREE.Group();
      rightArm.position.set(1.18, 2.35, 0.2);
      const lance = createComicMesh(new THREE.CapsuleGeometry(0.09, 3.5, 8, 12), '#fde047', 0.024);
      lance.position.set(0.1, 0.25, 0.65);
      lance.rotation.x = 0.55;
      const tip = createComicMesh(createSoftBladeGeometry(0.52, 1.35, 0.12, 'sword'), '#38bdf8', 0.026, {
        emissive: '#0284c7',
        emissiveIntensity: 0.36,
      });
      tip.position.set(0.1, 1.4, 1.55);
      tip.rotation.x = 0.55;
      rightArm.add(lance, tip);
      body.add(torso, head, plume, leftArm, rightArm);
      setRefs({ leftArm, rightArm });
      return;
    }

    case 'mb_guild_arcymag': {
      // Alaric, Arcymag Sztandaru (Act 8 Guild I): Sapphire Guild Archmage w/ Curved Wizard Hat & Golden Seal Halo!
      const robeTex = createComicSurfaceTexture('#1e3a8a', '#fbbf24', 'robe');
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.2],
            [1.14, 0.4],
            [0.84, 1.55],
            [0.66, 2.75],
            [0.01, 2.95],
          ],
          24
        ),
        '#1d4ed8',
        0.038,
        { map: robeTex }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#e0f2fe', eyeColor: '#fde047', accent: '#38bdf8', style: 'dryad' });
      const head = createComicMesh(new THREE.SphereGeometry(0.56, 26, 20), '#e0f2fe', 0.034, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.4;
      const hatBrim = createComicMesh(new THREE.CylinderGeometry(0.95, 0.98, 0.12, 24), '#1e3a8a', 0.026);
      hatBrim.position.y = 3.78;
      const hatTip = createComicMesh(
        createTaperedCurveGeometry(
          [
            [0, 3.8, 0],
            [0.08, 4.42, -0.18],
            [0.28, 4.78, -0.52],
          ],
          0.52,
          0.06,
          14,
          12
        ),
        '#1e3a8a',
        0.028
      );
      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 2.85;
      const ring = createComicMesh(new THREE.TorusGeometry(1.68, 0.11, 10, 28), '#fbbf24', 0.024, {
        emissive: '#f59e0b',
        emissiveIntensity: 0.36,
      });
      ring.rotation.x = Math.PI / 2 + 0.2;
      orbitGroup.add(ring);
      const rightArm = new THREE.Group();
      rightArm.position.set(0.95, 2.35, 0.3);
      const staff = createComicMesh(new THREE.CapsuleGeometry(0.08, 2.85, 8, 12), '#fbbf24', 0.022);
      const orb = createComicMesh(new THREE.SphereGeometry(0.38, 16, 14), '#38bdf8', 0.024, {
        emissive: '#0284c7',
        emissiveIntensity: 0.44,
      });
      orb.position.y = 1.72;
      rightArm.add(staff, orb);
      body.add(robe, head, hatBrim, hatTip, orbitGroup, rightArm);
      setRefs({ orbitGroup, rightArm });
      return;
    }

    case 'mb_guild_jezdzca': {
      // Drakon, Jeździec Łuski (Act 9 Guild II): Emerald Dragon Berserker w/ Curved Dragon-Horn Helm & Twin Jade Axes!
      const jadeTex = createComicSurfaceTexture('#059669', '#fbbf24', 'scales');
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.12],
            [0.82, 0.32],
            [1.12, 1.35],
            [1.22, 2.3],
            [0.88, 2.95],
            [0.01, 3.1],
          ],
          24
        ),
        '#047857',
        0.042,
        { map: jadeTex }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#10b981', eyeColor: '#fde047', accent: '#fbbf24', style: 'imp' });
      const head = createComicMesh(new THREE.SphereGeometry(0.62, 26, 20), '#10b981', 0.038, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.55;
      for (const s of [-1, 1]) {
        const horn = createComicMesh(
          createTaperedCurveGeometry(
            [
              [s * 0.34, 3.88, 0],
              [s * 0.72, 4.32, -0.18],
              [s * 0.92, 4.72, -0.42],
            ],
            0.16,
            0.035,
            14,
            10
          ),
          '#fbbf24',
          0.024
        );
        body.add(horn);
      }
      const makeJadeAxe = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.28, 2.38, 0.22);
        const shaft = createComicMesh(new THREE.CapsuleGeometry(0.09, 2.5, 8, 12), '#5c341a', 0.024);
        shaft.rotation.x = 0.55;
        shaft.position.set(0, -0.1, 0.55);
        const blade = createComicMesh(createSoftBladeGeometry(0.9, 1.2, 0.14, 'axe'), '#34d399', 0.028, {
          emissive: '#10b981',
          emissiveIntensity: 0.35,
        });
        blade.rotation.y = Math.PI / 2;
        blade.position.set(0, 0.75, 1.25);
        g.add(shaft, blade);
        return g;
      };
      const leftArm = makeJadeAxe(-1);
      const rightArm = makeJadeAxe(1);
      body.add(torso, head, leftArm, rightArm);
      setRefs({ leftArm, rightArm });
      return;
    }

    case 'mb_guild_kaplanka': {
      // Virelia, Kapłanka Smoka (Act 9 Guild II): Jade Dragon Shamaness w/ Golden Horn Crown & Orbiting Amber Orbs!
      const shamanTex = createComicSurfaceTexture('#047857', '#fde047', 'robe');
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.22],
            [1.16, 0.45],
            [0.86, 1.6],
            [0.64, 2.8],
            [0.01, 3.0],
          ],
          24
        ),
        '#065f46',
        0.038,
        { map: shamanTex }
      );
      const faceTex = createMonsterFaceTexture({ skin: '#a7f3d0', eyeColor: '#f59e0b', accent: '#10b981', style: 'dryad' });
      const head = createComicMesh(new THREE.SphereGeometry(0.56, 26, 20), '#a7f3d0', 0.036, { map: faceTex });
      head.rotation.y = -Math.PI / 2;
      head.position.y = 3.46;
      for (const s of [-1, 1]) {
        const crownHorn = createComicMesh(
          createTaperedCurveGeometry(
            [
              [s * 0.28, 3.85, 0],
              [s * 0.65, 4.35, -0.08],
              [s * 0.48, 4.78, -0.15],
            ],
            0.14,
            0.03,
            14,
            10
          ),
          '#fbbf24',
          0.022
        );
        body.add(crownHorn);
      }
      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 2.65;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const amber = createComicMesh(new THREE.SphereGeometry(0.3, 14, 12), '#fbbf24', 0.022, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.42,
        });
        amber.scale.set(0.88, 1.25, 0.88);
        amber.position.set(Math.cos(a) * 1.85, Math.sin(i * 1.5) * 0.4, Math.sin(a) * 1.85);
        orbitGroup.add(amber);
      }
      const rightArm = new THREE.Group();
      rightArm.position.set(0.94, 2.35, 0.3);
      const staff = createComicMesh(new THREE.CapsuleGeometry(0.08, 2.85, 8, 12), '#d97706', 0.022);
      const gem = createComicMesh(new THREE.SphereGeometry(0.38, 16, 14), '#34d399', 0.024, {
        emissive: '#10b981',
        emissiveIntensity: 0.45,
      });
      gem.position.y = 1.72;
      rightArm.add(staff, gem);
      body.add(robe, head, orbitGroup, rightArm);
      setRefs({ orbitGroup, rightArm });
      return;
    }

    default: {
      // Kaelen, Zwiastun Szczeliny: Sleek Smooth Cartoon Void Knight w/ Painted Visor & Curved Twin Scythes!
      const voidTex = createComicSurfaceTexture('#291f40', '#f43f5e', 'armor');
      const bodyMesh = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.05],
            [0.64, 0.15],
            [0.54, 1.2],
            [0.86, 2.35],
            [0.58, 2.85],
            [0.01, 2.95],
          ],
          24
        ),
        '#291f40',
        0.04,
        { map: voidTex }
      );
      const helmFace = createMonsterFaceTexture({ skin: '#1c172e', eyeColor: '#fb7185', accent: '#f43f5e', style: 'imp' });
      const helm = createComicMesh(new THREE.SphereGeometry(0.56, 26, 20), '#1c172e', 0.038, { map: helmFace });
      helm.rotation.y = -Math.PI / 2;
      helm.scale.set(1.0, 1.12, 0.95);
      helm.position.y = 3.42;

      const halo = new THREE.Group();
      halo.position.set(0, 4.02, -0.15);
      const ring = createComicMesh(new THREE.TorusGeometry(0.88, 0.12, 10, 24, Math.PI * 1.55), '#e11d48', 0.028, {
        emissive: '#be123c',
        emissiveIntensity: 0.36,
      });
      ring.rotation.x = Math.PI / 2;
      halo.add(ring);

      const makeScythe = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.02, 2.4, 0.2);
        const bladeGeo = createTaperedCurveGeometry(
          [
            [0, 0, 0],
            [side * 0.45, 0.1, 0.65],
            [side * 0.25, 0.05, 1.45],
            [-side * 0.25, 0, 1.85],
          ],
          0.18,
          0.035,
          16,
          10
        );
        const blade = createComicMesh(bladeGeo, '#f43f5e', 0.03, {
          emissive: '#be123c',
          emissiveIntensity: 0.34,
        });
        g.add(blade);
        return g;
      };
      const leftArm = makeScythe(-1);
      const rightArm = makeScythe(1);
      body.add(bodyMesh, helm, halo, leftArm, rightArm);
      setRefs({ orbitGroup: halo, leftArm, rightArm });
    }
  }
}

export function updateEnemyRig(
  rig: EnemyRig,
  state: EnemyState,
  elapsedSec: number,
  nowMs: number
) {
  // Trigger crisp white-gold comic Hit-Flash & squash when damaged!
  if (state.hp < rig.lastHp) {
    rig.hitFlashUntil = nowMs + 115;
  }
  rig.lastHp = state.hp;
  const isFlashing = nowMs < rig.hitFlashUntil;

  for (let i = 0; i < rig.flashMats.length; i++) {
    const fm = rig.flashMats[i];
    if (isFlashing) {
      fm.mat.emissive.setHex(0xfff2cc);
      fm.mat.emissiveIntensity = 0.58;
    } else if (fm.mat.emissiveIntensity !== fm.origInt || fm.mat.emissive.getHex() !== fm.origHex) {
      fm.mat.emissive.setHex(fm.origHex);
      fm.mat.emissiveIntensity = fm.origInt;
    }
  }

  const baseScale = rig.tier === 'elite' ? 1.28 : 1.0;

  if (state.animState === 'burrow') {
    rig.body.position.y = -4.2;
  } else if (
    rig.bossId === 'vaelgor' ||
    rig.bossId === 'kaelis' ||
    rig.bossId === 'aeternus' ||
    rig.bossId === 'drakorys' ||
    rig.archetype === 'mb_nekro_lord' ||
    rig.archetype === 'mb_hc_mroz_wiedma' ||
    rig.archetype === 'mb_hc_tron_herold' ||
    rig.archetype === 'mb_hc_tron_serafin' ||
    rig.archetype === 'mb_guild_arcymag' ||
    rig.archetype === 'mb_guild_kaplanka'
  ) {
    rig.body.position.y = 0.55 + Math.sin(elapsedSec * 2.8) * 0.28;
    rig.body.scale.setScalar(baseScale);
  } else if (state.animState === 'run') {
    const bounce = Math.abs(Math.sin(elapsedSec * 10));
    rig.body.position.y = bounce * 0.2;
    rig.body.scale.set(
      baseScale * (1 + (1 - bounce) * 0.045),
      baseScale * (1 - (1 - bounce) * 0.045),
      baseScale * (1 + (1 - bounce) * 0.045)
    );
    const s = Math.sin(elapsedSec * 10);
    if (rig.leftArm && rig.rightArm) {
      rig.leftArm.rotation.x = s * 0.48;
      rig.rightArm.rotation.x = -s * 0.48;
    }
    if (rig.leftLeg && rig.rightLeg) {
      rig.leftLeg.rotation.x = -s * 0.55;
      rig.rightLeg.rotation.x = s * 0.55;
    }
    if (rig.spiderLegs) {
      rig.spiderLegs.forEach((leg, i) => {
        leg.rotation.y = Math.sin(elapsedSec * 14 + i * 1.4) * 0.28;
      });
    }
  } else if (state.animState === 'attack' || state.animState === 'cast') {
    if (rig.rightArm) rig.rightArm.rotation.x = -1.05 + Math.sin(elapsedSec * 16) * 0.9;
    rig.body.scale.set(baseScale * 1.04, baseScale * 0.96, baseScale * 1.04);
  } else {
    const breath = Math.sin(elapsedSec * 3.0);
    rig.body.position.y = breath * 0.065;
    rig.body.scale.set(
      baseScale * (1 - breath * 0.018),
      baseScale * (1 + breath * 0.022),
      baseScale * (1 - breath * 0.018)
    );
    if (rig.leftLeg && rig.rightLeg) {
      rig.leftLeg.rotation.x *= 0.8;
      rig.rightLeg.rotation.x *= 0.8;
    }
  }

  if (isFlashing) {
    rig.body.scale.x *= 1.12;
    rig.body.scale.y *= 0.88;
    rig.body.scale.z *= 1.12;
    if (rig.tier === 'dummy') {
      rig.body.rotation.z = Math.sin(elapsedSec * 36) * 0.24;
    }
  } else if (rig.tier === 'dummy') {
    rig.body.rotation.z *= 0.84;
  }

  // Spinning Stagger-Broken Stars above Boss / Mini-Boss when stunned!
  const isStaggerBroken = !!(state.staggerBrokenUntil && state.staggerBrokenUntil > nowMs);
  rig.staggerStarsGroup.visible = isStaggerBroken;
  if (isStaggerBroken) {
    rig.staggerStarsGroup.rotation.y = elapsedSec * 4.5;
  }

  // Violet Warlock Curse Primer Ring (visual indicator for Warrior Detonation!)
  const isCursed = !!(state.cursedUntil && state.cursedUntil > nowMs);
  rig.curseRing.visible = isCursed;
  if (isCursed) {
    rig.curseRing.rotation.z = -elapsedSec * 2.8;
    const pulse = 1 + Math.sin(elapsedSec * 8) * 0.08;
    rig.curseRing.scale.set(pulse, pulse, 1);
  }

  if (rig.orbitGroup) rig.orbitGroup.rotation.y = elapsedSec * 1.5;
  if (rig.wingL && rig.wingR) {
    const f = Math.sin(elapsedSec * 4.8) * 0.26;
    rig.wingL.rotation.y = 0.22 + f;
    rig.wingR.rotation.y = -0.22 - f;
  }
  if (rig.flameMesh) {
    const s = 0.94 + Math.sin(elapsedSec * 12) * 0.12;
    rig.flameMesh.scale.setScalar(s);
  }
  if (rig.shieldGroup) {
    rig.shieldGroup.visible = state.shield > 0;
    if (state.shield > 0) {
      rig.shieldGroup.rotation.y = -elapsedSec * 1.4;
    }
  }

  const rm = rig.tauntRing.material as THREE.MeshBasicMaterial;
  if (nowMs < state.tauntedUntil) {
    rm.color.set('#f59e0b');
    rm.opacity = 0.64;
  } else if (state.tier === 'goblin') {
    rm.color.set('#fbbf24');
    rm.opacity = 0.55 + Math.sin(elapsedSec * 8) * 0.2;
  } else if (state.tier === 'totem') {
    rm.color.set('#a855f7');
    rm.opacity = 0.5 + Math.sin(elapsedSec * 5) * 0.15;
  } else if (state.tier === 'barrel') {
    rm.color.set('#ef4444');
    rm.opacity = 0.35 + Math.sin(elapsedSec * 6) * 0.12;
  } else if (state.tier === 'elite' && state.affix) {
    rm.color.set(
      state.affix === 'mortar'
        ? '#f97316'
        : state.affix === 'frost'
          ? '#38bdf8'
          : state.affix === 'charger'
            ? '#facc15'
            : '#4ade80'
    );
    rm.opacity = 0.45;
  } else if (state.tier === 'boss' || state.tier === 'miniboss') {
    rm.color.set(state.tier === 'boss' ? '#e11d48' : '#f59e0b');
    rm.opacity = 0.38;
  } else {
    rm.opacity = 0;
  }

  const showBar =
    state.tier !== 'barrel' &&
    state.tier !== 'root_trap' &&
    (state.tier !== 'normal' || state.hp < state.maxHp);
  rig.hpBarBg.visible = showBar;
  rig.hpBarFill.visible = showBar;

  const ratio = Math.max(0.001, Math.min(1, state.hp / Math.max(1, state.maxHp)));
  rig.hpBarFill.scale.x = ratio;
}

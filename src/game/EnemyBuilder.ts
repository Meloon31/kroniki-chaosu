import * as THREE from 'three';
import type { EnemyState } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createPlushLathe,
  createSoftBladeGeometry,
  createSoftWingGeometry,
  createTaperedCurveGeometry,
  createToonMaterial,
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
  spiderLegs?: THREE.Object3D[];
  tauntRing: THREE.Mesh;
  tier: EnemyState['tier'];
  bossId?: EnemyState['bossId'];
  archetype: string;
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
  let spiderLegs: THREE.Object3D[] | undefined;

  if (enemy.tier === 'root_trap') {
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
    for (const s of [-1, 1]) {
      const paul = createComicMesh(new THREE.SphereGeometry(0.74, 20, 16), '#3f4e6b', 0.04);
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

    // Big expressive cartoon skull + rounded jaw + glowing emerald eyes + tilted golden crown!
    const skull = createComicMesh(new THREE.SphereGeometry(0.74, 24, 20), '#f1f5f9', 0.042);
    skull.scale.set(1.05, 0.96, 0.98);
    skull.position.y = 4.2;

    const jaw = createComicMesh(new THREE.SphereGeometry(0.46, 18, 14), '#e2e8f0', 0.032);
    jaw.scale.set(1.05, 0.62, 0.95);
    jaw.position.set(0, 3.68, 0.2);

    // Cute chunky cartoon skeleton teeth
    for (let t = -2; t <= 2; t++) {
      const tooth = createComicMesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 8), '#ffffff', 0.012);
      tooth.position.set(t * 0.13, 3.76, 0.6);
      body.add(tooth);
    }

    addMonsterEyes(body, 4.25, 0.66, 0.26, 0.16, '#4ade80', '#94a3b8');

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
    const carapace = createComicMesh(new THREE.SphereGeometry(1.55, 24, 18), '#e0a229', 0.042);
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

    const head = createComicMesh(new THREE.SphereGeometry(0.68, 24, 18), '#f0be4a', 0.04);
    head.position.set(0, 3.75, 1.05);
    addMonsterEyes(body, 3.82, 1.65, 0.24, 0.14, '#38bdf8', '#146d9c');

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
      0.042
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

    // Expressive dryad head + glowing violet eyes + sweeping curved stag antlers w/ glowing orchids!
    const head = createComicMesh(new THREE.SphereGeometry(0.66, 24, 18), '#6b2fa0', 0.04);
    head.position.y = 4.65;
    addMonsterEyes(body, 4.72, 0.58, 0.23, 0.13, '#f0abfc', '#2e1065');

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
      { emissive: '#991b1b', emissiveIntensity: 0.2 }
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

    // Expressive smooth demon head + glowing golden eyes + sweeping curved ram horns!
    const head = createComicMesh(new THREE.SphereGeometry(0.76, 24, 18), '#1d1c30', 0.044);
    head.scale.set(1.04, 1.02, 0.96);
    head.position.y = 5.15;
    addMonsterEyes(body, 5.2, 0.68, 0.28, 0.16, '#fbbf24', '#be123c');

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
    };
    const col = colorMap[enemy.act] || '#cf3a56';

    if (arch.includes('golem')) {
      // Plump rounded boulder-golem made of smooth overlapping stones!
      const belly = createComicMesh(new THREE.SphereGeometry(0.66, 20, 16), col, 0.03);
      belly.scale.set(1.12, 1.05, 0.96);
      belly.position.y = 0.92;
      const head = createComicMesh(new THREE.SphereGeometry(0.42, 18, 14), col, 0.028);
      head.position.set(0, 1.66, 0.1);
      addMonsterEyes(body, 1.7, 0.48, 0.15, 0.08, enemy.act === 4 ? '#f97316' : '#38bdf8');
      leftArm = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), col, 0.026);
      leftArm.scale.set(0.9, 1.35, 0.9);
      leftArm.position.set(-0.78, 0.95, 0.1);
      rightArm = createComicMesh(new THREE.SphereGeometry(0.32, 16, 12), col, 0.026);
      rightArm.scale.set(0.9, 1.35, 0.9);
      rightArm.position.set(0.78, 0.95, 0.1);
      body.add(belly, head, leftArm, rightArm);
    } else if (arch.includes('dzinn') || arch.includes('nekro') || arch.includes('szczelina')) {
      // Swirly floating cartoon spirit / necromancer / void wisp!
      const robe = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.18],
            [0.14, 0.45],
            [0.44, 0.95],
            [0.52, 1.35],
            [0.34, 1.6],
            [0.01, 1.66],
          ],
          22
        ),
        col,
        0.028
      );
      const head = createComicMesh(new THREE.SphereGeometry(0.44, 20, 16), col, 0.028);
      head.position.y = 1.85;
      addMonsterEyes(body, 1.88, 0.39, 0.15, 0.085, '#fde047', '#1e1b2e');
      leftArm = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.38, 8, 12), col, 0.022);
      leftArm.position.set(-0.56, 1.25, 0.12);
      rightArm = createComicMesh(new THREE.CapsuleGeometry(0.11, 0.38, 8, 12), col, 0.022);
      rightArm.position.set(0.56, 1.25, 0.12);
      body.add(robe, head, leftArm, rightArm);
    } else {
      // Plump cartoon fantasy minion (Skeleton / Mummy / Forest Shroomling / Imp!)
      const torso = createComicMesh(
        createPlushLathe(
          [
            [0.01, 0.25],
            [0.48, 0.4],
            [0.52, 0.85],
            [0.44, 1.25],
            [0.01, 1.35],
          ],
          22
        ),
        col,
        0.028
      );
      const head = createComicMesh(new THREE.SphereGeometry(0.45, 22, 16), col, 0.028);
      head.scale.set(1.04, 0.96, 0.98);
      head.position.y = 1.68;
      addMonsterEyes(body, 1.7, 0.4, 0.16, 0.09, enemy.act === 3 ? '#fde047' : '#fb7185', '#2a2238');

      // Cute thematic headgear per Act!
      if (enemy.act === 3) {
        // Adorable forest mushroom cap on Act 3 minions!
        const cap = createComicMesh(
          new THREE.SphereGeometry(0.64, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
          arch.includes('driada') ? '#9333ea' : '#22a355',
          0.026
        );
        cap.position.y = 1.88;
        body.add(cap);
      } else if (enemy.act === 4) {
        // Cute curved imp horns on Act 4 minions!
        for (const s of [-1, 1]) {
          const horn = createComicMesh(
            createTaperedCurveGeometry(
              [
                [s * 0.26, 2.02, 0],
                [s * 0.44, 2.24, 0.06],
                [s * 0.38, 2.45, 0.1],
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
      } else if (arch.includes('mumia')) {
        // Soft bandage rings around Mummy!
        for (let b = 0; b < 3; b++) {
          const wrap = createComicMesh(new THREE.TorusGeometry(0.5 - b * 0.03, 0.06, 8, 18), '#f5ead0', 0.016);
          wrap.rotation.x = Math.PI / 2 + 0.12;
          wrap.position.y = 0.55 + b * 0.28;
          body.add(wrap);
        }
      }

      leftArm = createComicMesh(new THREE.CapsuleGeometry(0.12, 0.36, 8, 14), col, 0.022);
      leftArm.position.set(-0.56, 0.96, 0.1);
      rightArm = new THREE.Group();
      rightArm.position.set(0.56, 1.08, 0.1);
      const rMesh = createComicMesh(new THREE.CapsuleGeometry(0.12, 0.36, 8, 14), col, 0.022);
      rMesh.position.y = -0.2;
      const club = createComicMesh(new THREE.CapsuleGeometry(0.1, 0.62, 8, 12), '#68778f', 0.02);
      club.position.set(0, -0.45, 0.28);
      club.rotation.x = Math.PI * 0.4;
      rightArm.add(rMesh, club);

      body.add(torso, head, leftArm, rightArm);
    }

    if (isElite) {
      // Smooth cartoon golden-purple Elite Crown!
      const crown = createComicMesh(new THREE.TorusGeometry(0.32, 0.085, 10, 20), '#a855f7', 0.024, {
        emissive: '#7c3aed',
        emissiveIntensity: 0.3,
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

  const tauntRing = new THREE.Mesh(
    new THREE.RingGeometry(enemy.radius * 0.92, enemy.radius * 1.12, 32),
    new THREE.MeshBasicMaterial({
      color: enemy.tier === 'boss' ? '#be123c' : '#d97706',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: enemy.tier === 'boss' || enemy.tier === 'miniboss' ? 0.42 : 0,
      depthWrite: false,
    })
  );
  tauntRing.rotation.x = -Math.PI / 2;
  tauntRing.position.y = 0.05;
  root.add(tauntRing);

  const barW = enemy.tier === 'boss' ? 3.8 : enemy.tier === 'miniboss' ? 2.7 : 1.45;
  const barY = enemy.tier === 'boss' ? 7.0 : enemy.tier === 'miniboss' ? 4.9 : 2.6;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.16, 0.28),
    new THREE.MeshBasicMaterial({ color: '#141122', side: THREE.DoubleSide })
  );
  hpBarBg.position.y = barY;
  hpBarBg.rotation.x = -0.65;
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.17),
    new THREE.MeshBasicMaterial({
      color: enemy.tier === 'boss' ? '#f43f5e' : enemy.tier === 'miniboss' ? '#f59e0b' : '#ef4444',
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(0, barY, 0.02);
  hpBarFill.rotation.x = -0.65;
  root.add(hpBarFill);

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
    spiderLegs,
    tauntRing,
    tier: enemy.tier,
    bossId: enemy.bossId,
    archetype: enemy.archetype,
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
      const skull = createComicMesh(new THREE.SphereGeometry(0.48, 20, 16), '#eef2f7', 0.032);
      skull.position.set(0, 3.3, 0.25);
      addMonsterEyes(body, 3.36, 0.68, 0.17, 0.1, '#c084fc');

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
      const head = createComicMesh(new THREE.SphereGeometry(0.7, 22, 18), '#f2c357', 0.04);
      head.position.set(0, 2.45, 1.42);
      addMonsterEyes(body, 2.52, 2.06, 0.24, 0.13, '#38bdf8', '#146d9c');

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
      const head = createComicMesh(new THREE.SphereGeometry(0.48, 20, 16), '#d8b4fe', 0.034);
      head.position.set(0, 3.1, 0.68);
      addMonsterEyes(body, 3.14, 1.12, 0.17, 0.1, '#a3e635', '#2e1065');

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

    default: {
      // Kaelen, Zwiastun Szczeliny: Sleek Smooth Cartoon Void Knight w/ Curved Twin Scythes!
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
        0.04
      );
      const helm = createComicMesh(new THREE.SphereGeometry(0.56, 22, 18), '#1c172e', 0.038);
      helm.scale.set(0.95, 1.12, 1.0);
      helm.position.y = 3.42;
      addMonsterEyes(body, 3.45, 0.52, 0.19, 0.11, '#fb7185');

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
  if (state.animState === 'burrow') {
    rig.body.position.y = -4.2;
  } else if (rig.bossId === 'vaelgor' || rig.archetype === 'mb_nekro_lord') {
    rig.body.position.y = 0.55 + Math.sin(elapsedSec * 2.8) * 0.28;
  } else if (state.animState === 'run') {
    const bounce = Math.abs(Math.sin(elapsedSec * 10));
    rig.body.position.y = bounce * 0.2;
    rig.body.scale.set(
      1 + (1 - bounce) * 0.045,
      1 - (1 - bounce) * 0.045,
      1 + (1 - bounce) * 0.045
    );
    if (rig.leftArm && rig.rightArm) {
      const s = Math.sin(elapsedSec * 10);
      rig.leftArm.rotation.x = s * 0.48;
      rig.rightArm.rotation.x = -s * 0.48;
    }
    if (rig.spiderLegs) {
      rig.spiderLegs.forEach((leg, i) => {
        leg.rotation.y = Math.sin(elapsedSec * 14 + i * 1.4) * 0.28;
      });
    }
  } else if (state.animState === 'attack' || state.animState === 'cast') {
    if (rig.rightArm) rig.rightArm.rotation.x = -1.05 + Math.sin(elapsedSec * 16) * 0.9;
    rig.body.scale.set(1.03, 0.97, 1.03);
  } else {
    const breath = Math.sin(elapsedSec * 3.0);
    rig.body.position.y = breath * 0.065;
    rig.body.scale.set(1 - breath * 0.018, 1 + breath * 0.022, 1 - breath * 0.018);
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
  } else if (state.tier === 'boss' || state.tier === 'miniboss') {
    rm.color.set(state.tier === 'boss' ? '#e11d48' : '#f59e0b');
    rm.opacity = 0.38;
  } else {
    rm.opacity = 0;
  }

  const ratio = Math.max(0.001, Math.min(1, state.hp / Math.max(1, state.maxHp)));
  rig.hpBarFill.scale.x = ratio;
}

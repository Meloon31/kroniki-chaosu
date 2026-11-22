import * as THREE from 'three';
import type { EnemyState } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createRoundedBoxGeometry,
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

export function buildEnemyRig(enemy: EnemyState): EnemyRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  root.add(
    createContactShadow(
      enemy.tier === 'boss' ? 2.55 : enemy.tier === 'miniboss' ? 1.85 : enemy.radius * 1.05,
      enemy.tier === 'boss' ? 0.56 : 0.45
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
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const vine = createComicMesh(new THREE.ConeGeometry(0.18, 2.3, 6), '#1f5e34', 0.032, {
        emissive: '#15803d',
        emissiveIntensity: 0.18,
      });
      vine.position.set(Math.cos(ang) * 0.9, 1.05, Math.sin(ang) * 0.9);
      vine.rotation.z = Math.cos(ang) * 0.38;
      vine.rotation.x = -Math.sin(ang) * 0.38;
      body.add(vine);
    }
  } else if (enemy.tier === 'boss' && enemy.bossId === 'malakor') {
    // =========================================================
    // AKT 1 BOSS: MALAKOR, WŁADCA KATAKUMB
    // Sculpted dread bone-knight, ribcage w/ emerald soul-heart,
    // tattered crypt cloak, cracked crown & flaming green warhammer
    // =========================================================
    for (const s of [-1, 1]) {
      const greave = createComicMesh(new THREE.CylinderGeometry(0.32, 0.38, 1.55, 8), '#262d3d', 0.045);
      greave.position.set(s * 0.54, 0.78, 0);
      const knee = createComicMesh(new THREE.OctahedronGeometry(0.28, 0), '#475569', 0.032);
      knee.position.set(s * 0.54, 0.95, 0.32);
      body.add(greave, knee);
    }

    const pelvis = createComicMesh(createRoundedBoxGeometry(1.5, 0.55, 0.95, 0.16, 3), '#1e2433', 0.036);
    pelvis.position.y = 1.6;
    const spine = createComicMesh(new THREE.CylinderGeometry(0.28, 0.34, 1.5, 8), '#cbd5e1', 0.04);
    spine.position.y = 2.45;
    // Sculpted rib bars around glowing emerald soul-core!
    const soulHeart = createComicMesh(new THREE.OctahedronGeometry(0.42, 0), '#22a355', 0.03, {
      emissive: '#16a34a',
      emissiveIntensity: 0.36,
    });
    soulHeart.position.set(0, 2.65, 0.25);
    for (let r = 0; r < 3; r++) {
      const rib = createComicMesh(new THREE.TorusGeometry(0.68 - r * 0.07, 0.09, 6, 12, Math.PI * 1.4), '#dfe4ed', 0.03);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = -Math.PI * 0.2;
      rib.position.y = 2.25 + r * 0.34;
      body.add(rib);
    }

    // Cathedral spiked pauldrons + tattered cloak
    for (const s of [-1, 1]) {
      const paul = createComicMesh(new THREE.DodecahedronGeometry(0.68, 0), '#334155', 0.048);
      paul.position.set(s * 1.18, 3.38, 0);
      const spike = createComicMesh(new THREE.ConeGeometry(0.18, 0.85, 6), '#94a3b8', 0.03);
      spike.position.set(s * 1.48, 3.88, 0);
      spike.rotation.z = -s * 0.45;
      body.add(paul, spike);
    }
    const cloak = createComicMesh(new THREE.BoxGeometry(1.85, 2.7, 0.14), '#1b2924', 0.036);
    cloak.position.set(0, 2.1, -0.78);
    cloak.rotation.x = 0.18;

    // Skull + jaw + glowing green eyes + cracked iron-gold crown
    const skull = createComicMesh(new THREE.SphereGeometry(0.64, 12, 10), '#e5e9f0', 0.048);
    skull.position.y = 4.08;
    const jaw = createComicMesh(new THREE.BoxGeometry(0.65, 0.32, 0.56), '#cbd5e1', 0.036);
    jaw.position.set(0, 3.64, 0.18);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#4ade80' });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), eyeMat);
      eye.position.set(s * 0.22, 4.12, 0.56);
      body.add(eye);
    }
    const crownBase = createComicMesh(new THREE.CylinderGeometry(0.76, 0.60, 0.48, 7), '#c9972c', 0.04);
    crownBase.position.y = 4.65;
    crownBase.rotation.z = 0.14;
    for (let c = 0; c < 5; c++) {
      const a = (c / 5) * Math.PI * 2;
      const prong = createComicMesh(new THREE.ConeGeometry(0.13, 0.52, 5), '#d4a63a', 0.025);
      prong.position.set(Math.cos(a) * 0.62, 5.02, Math.sin(a) * 0.62);
      body.add(prong);
    }

    // Articulated Arms + Giant Flaming Green Crypt Warhammer
    leftArm = createComicMesh(new THREE.CylinderGeometry(0.24, 0.2, 1.5, 8), '#334155', 0.036);
    leftArm.position.set(-1.35, 2.55, 0.3);
    leftArm.rotation.x = -0.45;

    rightArm = new THREE.Group();
    rightArm.position.set(1.38, 3.1, 0.1);
    const rFore = createComicMesh(new THREE.CylinderGeometry(0.24, 0.22, 1.4, 8), '#334155', 0.036);
    rFore.position.y = -0.6;
    const handle = createComicMesh(new THREE.CylinderGeometry(0.11, 0.11, 4.1, 8), '#475569', 0.034);
    handle.position.set(0.15, -0.35, 0.7);
    handle.rotation.x = 0.52;
    const headBlock = createComicMesh(createRoundedBoxGeometry(1.3, 0.96, 1.75, 0.22, 3), '#1e293b', 0.04, {
      emissive: '#15803d',
      emissiveIntensity: 0.24,
    });
    headBlock.position.set(0.15, 0.72, 1.72);
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0.15, 1.28, 1.72);
    for (let f = 0; f < 4; f++) {
      const cone = createComicMesh(new THREE.ConeGeometry(0.42 - f * 0.06, 1.15 - f * 0.12, 6), '#22a355', 0.026, {
        emissive: '#16a34a',
        emissiveIntensity: 0.34,
      });
      cone.position.set((f - 1.5) * 0.24, 0.2, (f % 2 === 0 ? 1 : -1) * 0.22);
      flameGroup.add(cone);
    }
    flameMesh = flameGroup;
    rightArm.add(rFore, handle, headBlock, flameGroup);

    // Orbiting spectral bone shards
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.6;
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2;
      const shard = createComicMesh(new THREE.OctahedronGeometry(0.28, 0), '#cbd5e1', 0.028);
      shard.position.set(Math.cos(a) * 2.5, Math.sin(b) * 0.5, Math.sin(a) * 2.5);
      orbitGroup.add(shard);
    }

    body.add(pelvis, spine, soulHeart, cloak, skull, jaw, crownBase, leftArm, rightArm, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'azirath') {
    // =========================================================
    // AKT 2 BOSS: AZIRATH, POŻERACZ WYDM
    // 6-legged gold-and-lapis Scorpion-Pharaoh w/ cobra crown,
    // articulated pincers, curved venomous stinger & blue hieroglyphs
    // =========================================================
    const carapace = createComicMesh(createRoundedBoxGeometry(2.5, 1.25, 3.2, 0.42, 4), '#c99322', 0.042);
    carapace.position.y = 1.22;
    const lapisPlate = createComicMesh(createRoundedBoxGeometry(1.7, 0.48, 2.7, 0.18, 3), '#146d9c', 0.03);
    lapisPlate.position.y = 1.92;

    // 6 articulated scuttling scorpion legs!
    spiderLegs = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const legPivot = new THREE.Group();
        legPivot.position.set(s * 1.2, 1.05, 1.0 - i * 1.0);
        const upper = createComicMesh(new THREE.CylinderGeometry(0.18, 0.14, 1.2, 6), '#a8761c', 0.032);
        upper.rotation.z = -s * 1.05;
        upper.position.set(s * 0.5, 0.15, 0);
        const lower = createComicMesh(new THREE.ConeGeometry(0.16, 1.25, 6), '#432818', 0.03);
        lower.rotation.z = Math.PI + s * 0.25;
        lower.position.set(s * 1.15, -0.5, 0);
        legPivot.add(upper, lower);
        body.add(legPivot);
        spiderLegs.push(legPivot);
      }
    }

    // Pharaoh torso + striped royal nemes headdress + cobra uraeus
    const pharaohTorso = createComicMesh(new THREE.CylinderGeometry(0.76, 1.05, 1.65, 10), '#b5801e', 0.048);
    pharaohTorso.position.set(0, 2.55, 0.95);
    const chestCollar = createComicMesh(new THREE.TorusGeometry(0.84, 0.14, 6, 14), '#146d9c', 0.028);
    chestCollar.rotation.x = Math.PI / 2;
    chestCollar.position.set(0, 3.1, 0.95);
    const head = createComicMesh(new THREE.SphereGeometry(0.58, 12, 10), '#d9aa3c', 0.046);
    head.position.set(0, 3.68, 1.05);
    const nemes = createComicMesh(new THREE.BoxGeometry(1.68, 1.05, 0.36), '#146d9c', 0.042, {
      emissive: '#0284c7',
      emissiveIntensity: 0.16,
    });
    nemes.position.set(0, 3.62, 0.78);
    const cobra = createComicMesh(new THREE.ConeGeometry(0.14, 0.55, 6), '#eab308', 0.025);
    cobra.position.set(0, 4.3, 1.38);
    cobra.rotation.x = 0.35;

    // Giant dual serrated pincer claws
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 1.35, 1.9, 1.5);
      const clawOuter = createComicMesh(new THREE.ConeGeometry(0.45, 1.75, 7), '#d48d1e', 0.046);
      clawOuter.rotation.x = Math.PI / 2;
      clawOuter.rotation.z = s * 0.25;
      clawOuter.position.set(s * 0.35, 0, 1.1);
      const clawInner = createComicMesh(new THREE.ConeGeometry(0.28, 1.25, 6), '#e6c253', 0.036);
      clawInner.rotation.x = Math.PI / 2;
      clawInner.rotation.z = -s * 0.35;
      clawInner.position.set(-s * 0.05, 0, 0.95);
      arm.add(clawOuter, clawInner);
      body.add(arm);
      if (s === -1) leftArm = arm;
      else rightArm = arm;
    }

    // 6-segment arching articulated scorpion tail + dripping green stinger!
    for (let seg = 0; seg < 5; seg++) {
      const t = seg / 4;
      const tailSeg = createComicMesh(
        new THREE.SphereGeometry(0.56 - seg * 0.06, 10, 8),
        seg % 2 === 0 ? '#c9881c' : '#146d9c',
        0.042
      );
      tailSeg.position.set(0, 1.75 + seg * 0.85, -1.65 - Math.sin(t * Math.PI) * 1.2 + t * 1.4);
      body.add(tailSeg);
    }
    const stinger = createComicMesh(new THREE.ConeGeometry(0.32, 1.45, 8), '#65a30d', 0.04, {
      emissive: '#4d7c0f',
      emissiveIntensity: 0.34,
    });
    stinger.position.set(0, 5.25, 0.2);
    stinger.rotation.x = Math.PI * 0.78;

    // Orbiting blue sandstone hieroglyph tablets
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.6;
    for (let h = 0; h < 6; h++) {
      const ang = (h / 6) * Math.PI * 2;
      const tablet = createComicMesh(new THREE.BoxGeometry(0.45, 0.72, 0.14), '#1d4ed8', 0.026, {
        emissive: '#0284c7',
        emissiveIntensity: 0.28,
      });
      tablet.position.set(Math.cos(ang) * 3.3, Math.sin(h * 1.2) * 0.45, Math.sin(ang) * 3.3);
      tablet.rotation.y = -ang;
      orbitGroup.add(tablet);
    }

    body.add(carapace, lapisPlate, pharaohTorso, chestCollar, head, nemes, cobra, stinger, orbitGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'sylvara') {
    // =========================================================
    // AKT 3 BOSS: SYLVARA, MATKA CIERNI
    // Eldritch dark-bark dryad queen, twisted root gown, thorny
    // stag antlers with glowing orchid pods & 3D interlocking Bark Shield!
    // =========================================================
    const rootCore = createComicMesh(new THREE.ConeGeometry(1.45, 2.55, 9), '#1b472e', 0.052);
    rootCore.position.y = 1.28;
    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      const tendril = createComicMesh(new THREE.ConeGeometry(0.28, 1.65, 6), '#291f24', 0.036);
      tendril.position.set(Math.cos(a) * 1.25, 0.55, Math.sin(a) * 1.25);
      tendril.rotation.z = -Math.cos(a) * 0.65;
      tendril.rotation.x = Math.sin(a) * 0.65;
      body.add(tendril);
    }

    const torso = createComicMesh(new THREE.CylinderGeometry(0.48, 0.78, 2.15, 10), '#242936', 0.046);
    torso.position.y = 3.15;
    // Spiralling bioluminescent vine sash
    const vineWrap = createComicMesh(new THREE.TorusGeometry(0.68, 0.11, 6, 14), '#22a355', 0.024, {
      emissive: '#16a34a',
      emissiveIntensity: 0.24,
    });
    vineWrap.rotation.x = Math.PI / 2 - 0.35;
    vineWrap.position.y = 3.1;

    // Elongated clawed branch arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.78, 3.85, 0);
      const branch = createComicMesh(new THREE.CylinderGeometry(0.14, 0.11, 2.1, 7), '#2d242a', 0.032);
      branch.position.y = -0.95;
      branch.rotation.z = s * 0.25;
      const bloom = createComicMesh(new THREE.OctahedronGeometry(0.26, 0), '#9333ea', 0.025, {
        emissive: '#7c3aed',
        emissiveIntensity: 0.32,
      });
      bloom.position.set(s * 0.35, -1.9, 0.15);
      arm.add(branch, bloom);
      body.add(arm);
      if (s === -1) leftArm = arm;
      else rightArm = arm;
    }

    const head = createComicMesh(new THREE.SphereGeometry(0.56, 12, 10), '#4a206b', 0.044);
    head.position.y = 4.55;
    // Branching thorny stag-antlers w/ glowing orchid pods!
    for (const s of [-1, 1]) {
      const antlerMain = createComicMesh(new THREE.ConeGeometry(0.16, 1.75, 6), '#3b1d52', 0.032);
      antlerMain.position.set(s * 0.68, 5.45, 0);
      antlerMain.rotation.z = -s * 0.52;
      const orchid = createComicMesh(new THREE.OctahedronGeometry(0.28, 0), '#c084fc', 0.025, {
        emissive: '#9333ea',
        emissiveIntensity: 0.34,
      });
      orchid.position.set(s * 1.15, 6.1, 0);
      body.add(antlerMain, orchid);
    }

    // Orbiting spore lanterns
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 2.8;
    for (let v = 0; v < 8; v++) {
      const ang = (v / 8) * Math.PI * 2;
      const pod = createComicMesh(
        new THREE.SphereGeometry(0.26, 8, 8),
        v % 2 === 0 ? '#22a355' : '#9333ea',
        0.028,
        { emissive: v % 2 === 0 ? '#16a34a' : '#7c3aed', emissiveIntensity: 0.32 }
      );
      pod.position.set(Math.cos(ang) * 2.25, Math.sin(v * 1.4) * 1.1, Math.sin(ang) * 2.25);
      orbitGroup.add(pod);
    }

    // 8 Interlocking 3D cel-shaded Bark Shield Plates (visible during Pancerz Kory!)
    shieldGroup = new THREE.Group();
    shieldGroup.position.y = 2.6;
    shieldGroup.visible = false;
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const barkWall = createComicMesh(new THREE.BoxGeometry(1.15, 2.4, 0.25), '#1f5e34', 0.036, {
        emissive: '#16a34a',
        emissiveIntensity: 0.22,
      });
      barkWall.position.set(Math.cos(a) * 2.45, 0, Math.sin(a) * 2.45);
      barkWall.rotation.y = -a + Math.PI / 2;
      shieldGroup.add(barkWall);
    }

    body.add(rootCore, torso, vineWrap, head, orbitGroup, shieldGroup);
  } else if (enemy.tier === 'boss' && enemy.bossId === 'vaelgor') {
    // =========================================================
    // AKT 4 BOSS: VAELGOR, ARCHONT CHAOSU
    // Levitating fractured obsidian arch-demon, molten magma core,
    // 4 layered jagged bat-demon wings, floating Chaos Crown & Rift Greatsword!
    // =========================================================
    const lowerRobe = createComicMesh(new THREE.ConeGeometry(1.15, 2.2, 7), '#16141f', 0.055);
    lowerRobe.rotation.x = Math.PI;
    lowerRobe.position.y = 1.65;

    const obsidianTorso = createComicMesh(new THREE.OctahedronGeometry(1.38, 1), '#1a1824', 0.06, {
      emissive: '#991b1b',
      emissiveIntensity: 0.24,
    });
    obsidianTorso.scale.set(1.05, 1.45, 0.85);
    obsidianTorso.position.y = 3.45;

    const moltenCore = createComicMesh(new THREE.OctahedronGeometry(0.75, 0), '#ea580c', 0.032, {
      emissive: '#dc2626',
      emissiveIntensity: 0.4,
    });
    moltenCore.position.set(0, 3.45, 0.72);

    const head = createComicMesh(new THREE.DodecahedronGeometry(0.68, 0), '#141726', 0.052);
    head.position.y = 5.25;
    for (const s of [-1, 1]) {
      const horn = createComicMesh(new THREE.ConeGeometry(0.2, 1.35, 6), '#272433', 0.036, {
        emissive: '#be123c',
        emissiveIntensity: 0.26,
      });
      horn.position.set(s * 0.62, 5.75, -0.1);
      horn.rotation.z = -s * 0.55;
      body.add(horn);
    }

    // 4-winged layered obsidian bat-demon wings!
    const makeDemonWing = (side: -1 | 1) => {
      const wg = new THREE.Group();
      wg.position.set(side * 1.15, 4.15, -0.55);
      const upper = createComicMesh(createRoundedBoxGeometry(3.4, 1.45, 0.18, 0.28, 3), '#171520', 0.04, {
        emissive: '#9f1239',
        emissiveIntensity: 0.22,
      });
      upper.position.set(side * 1.65, 0.65, 0);
      upper.rotation.z = side * 0.35;
      const lower = createComicMesh(createRoundedBoxGeometry(2.5, 1.1, 0.16, 0.24, 3), '#21192b', 0.036, {
        emissive: '#7e22ce',
        emissiveIntensity: 0.2,
      });
      lower.position.set(side * 1.25, -0.85, 0.1);
      lower.rotation.z = -side * 0.28;
      wg.add(upper, lower);
      return wg;
    };
    wingL = makeDemonWing(-1);
    wingR = makeDemonWing(1);

    // Dimensional Rift Greatsword in right hand!
    rightArm = new THREE.Group();
    rightArm.position.set(1.5, 3.55, 0.35);
    const blade = createComicMesh(new THREE.BoxGeometry(0.32, 3.8, 0.12), '#1e1b2e', 0.04, {
      emissive: '#e11d48',
      emissiveIntensity: 0.36,
    });
    blade.position.set(0.2, 0.2, 1.1);
    blade.rotation.x = 0.65;
    rightArm.add(blade);

    // Floating Crown of Pure Chaos Energy
    orbitGroup = new THREE.Group();
    orbitGroup.position.y = 6.25;
    const crownRing = createComicMesh(new THREE.TorusGeometry(1.05, 0.14, 8, 16), '#be185d', 0.032, {
      emissive: '#db2777',
      emissiveIntensity: 0.36,
    });
    crownRing.rotation.x = Math.PI / 2;
    orbitGroup.add(crownRing);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const spike = createComicMesh(new THREE.ConeGeometry(0.16, 0.72, 6), '#e6b83c', 0.026, {
        emissive: '#dc2626',
        emissiveIntensity: 0.32,
      });
      spike.position.set(Math.cos(a) * 1.05, 0.3, Math.sin(a) * 1.05);
      orbitGroup.add(spike);
    }

    body.add(lowerRobe, obsidianTorso, moltenCore, head, wingL, wingR, rightArm, orbitGroup);
  } else if (enemy.tier === 'miniboss') {
    // =========================================================
    // 8 BESPOKE MINI-BOSSES — EACH WITH UNIQUE 3D SILHOUETTE!
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
    // Standard & Elite Act Enemies
    const isElite = enemy.tier === 'elite';
    const scale = isElite ? 1.26 : 1.0;
    const colorMap: Record<number, string> = {
      1: enemy.archetype.includes('golem')
        ? '#6b6560'
        : enemy.archetype.includes('nekro')
          ? '#2f855a'
          : '#cbd5e1',
      2: enemy.archetype.includes('dzinn')
        ? '#2a8ab8'
        : enemy.archetype.includes('mumia')
          ? '#d6c18f'
          : '#c97e1c',
      3: enemy.archetype.includes('driada')
        ? '#8a52bd'
        : enemy.archetype.includes('plujec')
          ? '#6f9c24'
          : '#257042',
      4: enemy.archetype.includes('szczelina')
        ? '#7b3fa8'
        : enemy.archetype.includes('golem')
          ? '#2c3647'
          : '#b8324a',
    };
    const col = colorMap[enemy.act] || '#b8324a';

    const torso = createComicMesh(new THREE.CapsuleGeometry(0.42, 0.56, 8, 16), col, 0.028);
    torso.position.y = 0.88;
    const shoulders = createComicMesh(createRoundedBoxGeometry(1.06, 0.26, 0.52, 0.10, 3), '#384056', 0.024);
    shoulders.position.y = 1.22;
    const head = createComicMesh(new THREE.SphereGeometry(0.39, 16, 12), col, 0.028);
    head.position.y = 1.66;

    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    const le = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat);
    le.position.set(-0.14, 1.68, 0.34);
    const re = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat);
    re.position.set(0.14, 1.68, 0.34);

    const armGeo = new THREE.CapsuleGeometry(0.105, 0.42, 6, 12);
    leftArm = createComicMesh(armGeo, col, 0.022);
    leftArm.position.set(-0.56, 0.92, 0.08);
    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.08, 0.08);
    const rMesh = createComicMesh(armGeo, col, 0.022);
    rMesh.position.y = -0.22;
    const club = createComicMesh(new THREE.CapsuleGeometry(0.09, 0.65, 6, 10), '#526075', 0.02);
    club.position.set(0, -0.46, 0.28);
    club.rotation.x = Math.PI * 0.4;
    rightArm.add(rMesh, club);

    body.add(torso, shoulders, head, le, re, leftArm, rightArm);

    if (isElite) {
      const crown = createComicMesh(new THREE.ConeGeometry(0.34, 0.5, 6), '#8b4bc9', 0.03, {
        emissive: '#6d28d9',
        emissiveIntensity: 0.25,
      });
      crown.position.y = 2.18;
      body.add(crown);
    }

    body.scale.setScalar(scale);
  }

  const tauntRing = new THREE.Mesh(
    new THREE.RingGeometry(enemy.radius * 0.92, enemy.radius * 1.12, 24),
    new THREE.MeshBasicMaterial({
      color: enemy.tier === 'boss' ? '#be123c' : '#d97706',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: enemy.tier === 'boss' || enemy.tier === 'miniboss' ? 0.4 : 0,
      depthWrite: false,
    })
  );
  tauntRing.rotation.x = -Math.PI / 2;
  tauntRing.position.y = 0.05;
  root.add(tauntRing);

  const barW = enemy.tier === 'boss' ? 3.8 : enemy.tier === 'miniboss' ? 2.7 : 1.45;
  const barY = enemy.tier === 'boss' ? 6.8 : enemy.tier === 'miniboss' ? 4.8 : 2.55;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.14, 0.26),
    new THREE.MeshBasicMaterial({ color: '#0f1018', side: THREE.DoubleSide })
  );
  hpBarBg.position.y = barY;
  hpBarBg.rotation.x = -0.65;
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.16),
    new THREE.MeshBasicMaterial({
      color: enemy.tier === 'boss' ? '#e11d48' : enemy.tier === 'miniboss' ? '#d97706' : '#dc2626',
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(0, barY, 0.02);
  hpBarFill.rotation.x = -0.65;
  root.add(hpBarFill);

  void createToonMaterial;

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
      const legs = createComicMesh(new THREE.CapsuleGeometry(0.62, 0.55, 8, 14), '#26242b', 0.036);
      legs.position.y = 0.65;
      const torso = createComicMesh(createRoundedBoxGeometry(1.75, 1.65, 1.15, 0.34, 4), '#442029', 0.04);
      torso.position.y = 2.05;
      const collar = createComicMesh(new THREE.TorusGeometry(0.68, 0.16, 6, 12), '#525b6b', 0.036);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 2.95;
      const hood = createComicMesh(new THREE.ConeGeometry(0.62, 1.2, 8), '#1c1922', 0.045);
      hood.position.y = 3.55;
      const mask = createComicMesh(new THREE.BoxGeometry(0.62, 0.65, 0.25), '#788496', 0.036);
      mask.position.set(0, 3.25, 0.42);
      const rightArm = new THREE.Group();
      rightArm.position.set(1.15, 2.35, 0.2);
      const shaft = createComicMesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), '#4a2c18', 0.03);
      shaft.position.set(0.1, 0.2, 0.7);
      shaft.rotation.x = 0.55;
      const axeBlade = createComicMesh(new THREE.BoxGeometry(0.16, 1.35, 1.25), '#94a3b8', 0.042, {
        emissive: '#991b1b',
        emissiveIntensity: 0.2,
      });
      axeBlade.position.set(0.1, 1.2, 1.65);
      rightArm.add(shaft, axeBlade);
      body.add(legs, torso, collar, hood, mask, rightArm);
      setRefs({ rightArm });
      return;
    }

    case 'mb_nekro_lord': {
      // Mordath, Strażnik Pieczęci: Floating Lich + Giant Golden Seal Halo + Soul Lantern Staff!
      const robe = createComicMesh(new THREE.ConeGeometry(1.05, 2.75, 9), '#2c1747', 0.05);
      robe.position.y = 1.65;
      const cowl = createComicMesh(new THREE.ConeGeometry(0.6, 1.15, 8), '#1f1033', 0.042);
      cowl.position.y = 3.55;
      const skull = createComicMesh(new THREE.SphereGeometry(0.45, 10, 8), '#dfe4ed', 0.038);
      skull.position.set(0, 3.25, 0.18);
      const halo = new THREE.Group();
      halo.position.set(0, 3.1, -0.7);
      const sealRing = createComicMesh(new THREE.TorusGeometry(1.55, 0.14, 8, 18), '#d4a038', 0.034, {
        emissive: '#b45309',
        emissiveIntensity: 0.25,
      });
      halo.add(sealRing);
      const rightArm = new THREE.Group();
      rightArm.position.set(0.95, 2.35, 0.4);
      const staff = createComicMesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8), '#3b2416', 0.028);
      const lantern = createComicMesh(new THREE.OctahedronGeometry(0.42, 0), '#7c3aed', 0.032, {
        emissive: '#6d28d9',
        emissiveIntensity: 0.36,
      });
      lantern.position.set(0, 1.65, 0.25);
      rightArm.add(staff, lantern);
      body.add(robe, cowl, skull, halo, rightArm);
      setRefs({ orbitGroup: halo, rightArm });
      return;
    }

    case 'mb_sfinks': {
      const lionBody = createComicMesh(createRoundedBoxGeometry(1.6, 1.15, 2.8, 0.42, 4), '#d49a38', 0.04);
      lionBody.position.y = 1.35;
      for (const sx of [-0.6, 0.6]) {
        for (const sz of [-1.0, 1.0]) {
          const paw = createComicMesh(new THREE.CylinderGeometry(0.24, 0.28, 1.15, 7), '#bd8328', 0.036);
          paw.position.set(sx, 0.58, sz);
          body.add(paw);
        }
      }
      const head = createComicMesh(new THREE.SphereGeometry(0.62, 12, 10), '#e6b84c', 0.046);
      head.position.set(0, 2.35, 1.45);
      const mane = createComicMesh(new THREE.BoxGeometry(1.55, 1.15, 0.55), '#146d9c', 0.042);
      mane.position.set(0, 2.3, 1.18);
      const wingL = createComicMesh(new THREE.BoxGeometry(1.9, 1.3, 0.16), '#d9a826', 0.044);
      wingL.position.set(-1.35, 2.25, -0.15);
      wingL.rotation.z = 0.45;
      const wingR = createComicMesh(new THREE.BoxGeometry(1.9, 1.3, 0.16), '#d9a826', 0.044);
      wingR.position.set(1.35, 2.25, -0.15);
      wingR.rotation.z = -0.45;
      body.add(lionBody, head, mane, wingL, wingR);
      setRefs({ wingL, wingR });
      return;
    }

    case 'mb_faraon_cien': {
      // Setesh, Kapłan Słońca: Jackal-Headed Anubis Solar Priest + Solar Ankh-Disk Scepter!
      const robe = createComicMesh(new THREE.CylinderGeometry(0.55, 0.95, 2.45, 9), '#d6c18f', 0.048);
      robe.position.y = 1.25;
      const goldTrim = createComicMesh(new THREE.BoxGeometry(1.35, 0.55, 0.9), '#c99322', 0.04);
      goldTrim.position.y = 2.45;
      const jackalHead = createComicMesh(new THREE.BoxGeometry(0.58, 0.58, 0.85), '#1e202b', 0.042);
      jackalHead.position.set(0, 3.15, 0.15);
      for (const s of [-1, 1]) {
        const ear = createComicMesh(new THREE.ConeGeometry(0.14, 0.88, 6), '#1e202b', 0.032);
        ear.position.set(s * 0.24, 3.78, -0.05);
        body.add(ear);
      }
      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 3.2;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const sun = createComicMesh(new THREE.SphereGeometry(0.28, 10, 8), '#eab308', 0.028, {
          emissive: '#ca8a04',
          emissiveIntensity: 0.34,
        });
        sun.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
        orbitGroup.add(sun);
      }
      const rightArm = new THREE.Group();
      rightArm.position.set(0.95, 2.4, 0.3);
      const staff = createComicMesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8), '#c99322', 0.028);
      const ankhLoop = createComicMesh(new THREE.TorusGeometry(0.38, 0.09, 6, 14), '#eab308', 0.028, {
        emissive: '#d97706',
        emissiveIntensity: 0.3,
      });
      ankhLoop.position.y = 1.85;
      rightArm.add(staff, ankhLoop);
      body.add(robe, goldTrim, jackalHead, orbitGroup, rightArm);
      setRefs({ orbitGroup, rightArm });
      return;
    }

    case 'mb_drzewiec': {
      // Korzenny Kolos Bagien: Massive hunched Swamp Treant Titan w/ Mushrooms on back!
      const trunk = createComicMesh(new THREE.CylinderGeometry(0.95, 1.35, 2.75, 8), '#432e22', 0.055);
      trunk.position.y = 1.45;
      const hump = createComicMesh(new THREE.DodecahedronGeometry(1.15, 0), '#1f5e34', 0.052);
      hump.position.set(0, 2.75, -0.35);
      for (let m = 0; m < 4; m++) {
        const cap = createComicMesh(new THREE.ConeGeometry(0.45, 0.35, 8), m % 2 === 0 ? '#8a52bd' : '#4ade80', 0.028, {
          emissive: m % 2 === 0 ? '#6d28d9' : '#15803d',
          emissiveIntensity: 0.28,
        });
        cap.position.set((m - 1.5) * 0.55, 3.65, -0.35 + (m % 2) * 0.3);
        body.add(cap);
      }
      const leftArm = createComicMesh(new THREE.BoxGeometry(0.72, 2.2, 0.72), '#3b261c', 0.048);
      leftArm.position.set(-1.45, 1.6, 0.35);
      const rightArm = createComicMesh(new THREE.BoxGeometry(0.72, 2.2, 0.72), '#3b261c', 0.048);
      rightArm.position.set(1.45, 1.6, 0.35);
      body.add(trunk, hump, leftArm, rightArm);
      setRefs({ leftArm, rightArm });
      return;
    }

    case 'mb_wiedzma': {
      // Vespera, Tkaczka Jadu: 6-legged Spider-Sorceress (Drider) w/ Venom Abdomen!
      const abdomen = createComicMesh(new THREE.SphereGeometry(1.15, 12, 10), '#3b1557', 0.052, {
        emissive: '#4d7c0f',
        emissiveIntensity: 0.22,
      });
      abdomen.scale.set(1.0, 0.85, 1.35);
      abdomen.position.set(0, 1.25, -1.05);
      const spiderLegs: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const lp = new THREE.Group();
          lp.position.set(s * 0.85, 1.05, 0.45 - i * 0.85);
          const leg = createComicMesh(new THREE.ConeGeometry(0.14, 1.95, 6), '#261438', 0.032);
          leg.rotation.z = Math.PI + s * 0.42;
          leg.position.set(s * 0.75, -0.35, 0);
          lp.add(leg);
          body.add(lp);
          spiderLegs.push(lp);
        }
      }
      const witchTorso = createComicMesh(new THREE.CylinderGeometry(0.45, 0.56, 1.35, 8), '#4c1d95', 0.042);
      witchTorso.position.set(0, 2.15, 0.65);
      const hat = createComicMesh(new THREE.ConeGeometry(0.68, 1.15, 8), '#1f1033', 0.04);
      hat.position.set(0, 3.4, 0.65);
      const rightArm = createComicMesh(new THREE.ConeGeometry(0.16, 1.2, 5), '#65a30d', 0.028, {
        emissive: '#4d7c0f',
        emissiveIntensity: 0.3,
      });
      rightArm.rotation.x = Math.PI / 2;
      rightArm.position.set(0.85, 2.1, 1.35);
      body.add(abdomen, witchTorso, hat, rightArm);
      setRefs({ spiderLegs, rightArm });
      return;
    }

    case 'mb_golem_lawy': {
      const legs = createComicMesh(createRoundedBoxGeometry(1.5, 1.25, 1.15, 0.32, 3), '#25222c', 0.04);
      legs.position.y = 0.62;
      const bodyBlock = createComicMesh(createRoundedBoxGeometry(2.15, 1.95, 1.55, 0.45, 4), '#1f1c26', 0.044);
      bodyBlock.position.y = 2.15;
      // Glowing iron-grated magma furnace belly!
      const furnace = createComicMesh(new THREE.BoxGeometry(1.25, 0.95, 0.2), '#ea580c', 0.03, {
        emissive: '#dc2626',
        emissiveIntensity: 0.4,
      });
      furnace.position.set(0, 2.05, 0.78);
      for (const s of [-1, 1]) {
        const chimney = createComicMesh(new THREE.CylinderGeometry(0.24, 0.32, 1.1, 7), '#334155', 0.036);
        chimney.position.set(s * 0.78, 3.55, -0.25);
        body.add(chimney);
      }
      const leftArm = createComicMesh(new THREE.DodecahedronGeometry(0.75, 0), '#2b242c', 0.048, {
        emissive: '#b91c1c',
        emissiveIntensity: 0.22,
      });
      leftArm.position.set(-1.65, 1.75, 0.2);
      const rightArm = createComicMesh(new THREE.DodecahedronGeometry(0.75, 0), '#2b242c', 0.048, {
        emissive: '#b91c1c',
        emissiveIntensity: 0.22,
      });
      rightArm.position.set(1.65, 1.75, 0.2);
      body.add(legs, bodyBlock, furnace, leftArm, rightArm);
      setRefs({ leftArm, rightArm, flameMesh: furnace });
      return;
    }

    default: {
      // Kaelen, Zwiastun Szczeliny: Sleek Void Rift Knight w/ Twin Scythe-Blades & Fractured Halo!
      const legs = createComicMesh(new THREE.CylinderGeometry(0.42, 0.52, 1.45, 8), '#181524', 0.044);
      legs.position.y = 0.72;
      const chest = createComicMesh(new THREE.CylinderGeometry(0.75, 0.48, 1.55, 8), '#231b36', 0.048);
      chest.position.y = 2.15;
      const helm = createComicMesh(new THREE.OctahedronGeometry(0.54, 0), '#151221', 0.045);
      helm.position.y = 3.35;
      const halo = new THREE.Group();
      halo.position.set(0, 3.85, -0.2);
      const ring = createComicMesh(new THREE.TorusGeometry(0.85, 0.1, 6, 14, Math.PI * 1.55), '#be123c', 0.028, {
        emissive: '#9f1239',
        emissiveIntensity: 0.34,
      });
      ring.rotation.x = Math.PI / 2;
      halo.add(ring);
      const makeScythe = (side: -1 | 1) => {
        const g = new THREE.Group();
        g.position.set(side * 1.05, 2.35, 0.2);
        const blade = createComicMesh(new THREE.TorusGeometry(0.92, 0.11, 6, 12, Math.PI * 0.72), '#be123c', 0.032, {
          emissive: '#9f1239',
          emissiveIntensity: 0.3,
        });
        blade.position.set(side * 0.2, 0, 0.85);
        g.add(blade);
        return g;
      };
      const leftArm = makeScythe(-1);
      const rightArm = makeScythe(1);
      body.add(legs, chest, helm, halo, leftArm, rightArm);
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
    rig.body.position.y = Math.abs(Math.sin(elapsedSec * 10)) * 0.18;
    if (rig.leftArm && rig.rightArm) {
      const s = Math.sin(elapsedSec * 10);
      rig.leftArm.rotation.x = s * 0.45;
      rig.rightArm.rotation.x = -s * 0.45;
    }
    if (rig.spiderLegs) {
      rig.spiderLegs.forEach((leg, i) => {
        leg.rotation.y = Math.sin(elapsedSec * 14 + i * 1.4) * 0.28;
      });
    }
  } else if (state.animState === 'attack' || state.animState === 'cast') {
    if (rig.rightArm) rig.rightArm.rotation.x = -1.0 + Math.sin(elapsedSec * 16) * 0.85;
  } else {
    rig.body.position.y = Math.sin(elapsedSec * 3.0) * 0.06;
  }

  if (rig.orbitGroup) rig.orbitGroup.rotation.y = elapsedSec * 1.5;
  if (rig.wingL && rig.wingR) {
    const f = Math.sin(elapsedSec * 4.8) * 0.24;
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
    rm.color.set('#d97706');
    rm.opacity = 0.62;
  } else if (state.tier === 'boss' || state.tier === 'miniboss') {
    rm.color.set(state.tier === 'boss' ? '#be123c' : '#d97706');
    rm.opacity = 0.36;
  } else {
    rm.opacity = 0;
  }

  const ratio = Math.max(0.001, Math.min(1, state.hp / Math.max(1, state.maxHp)));
  rig.hpBarFill.scale.x = ratio;
}

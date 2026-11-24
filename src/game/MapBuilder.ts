import * as THREE from 'three';
import { ACT_THEMES } from '../../shared/world';
import type {
  GeneratedMapData,
  LockedChestState,
  ObsidianPillarState,
  SecretPassageState,
  WaveObeliskState,
  WorldPuzzleState,
} from '../../shared/types';
import {
  createComicFloorTexture,
  createComicMesh,
  createComicWallTexture,
  createContactShadow,
  createPlushLathe,
  createRoundedBoxGeometry,
  createRunicCircleTexture,
  createSoftBeamMaterial,
  createToonMaterial,
  createWindToonMaterial,
  getBiomeOutlineColor,
} from './ComicMaterials';

export interface BuiltMapHandles {
  root: THREE.Group;
  gateWalls: Map<string, THREE.Object3D>;
  secretWalls: Map<string, THREE.Object3D>;
  leverMeshes: Map<string, THREE.Object3D>;
  chestMeshes: Map<string, { group: THREE.Group; lid: THREE.Object3D; glow: THREE.Mesh }>;
  shrineMeshes: Map<string, THREE.Mesh>;
  obeliskVisual?: { crystal: THREE.Mesh; ring: THREE.Mesh; barrierRing?: THREE.Mesh };
  puzzleVisuals: Map<
    string,
    {
      type: WorldPuzzleState['type'];
      nodeMeshes: THREE.Object3D[];
      nodeIndicators: THREE.Mesh[];
      beamMeshes?: THREE.Mesh[];
    }
  >;
  exitPortalRing: THREE.Mesh;
  exitPortalCore: THREE.Mesh;
  pillarGroup: THREE.Group;
  animatedProps: THREE.Object3D[];
}

function makeSpriteLabel(text: string, borderColor: string, textColor = '#f1f5f9'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 84;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(16, 18, 34, 0.84)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 14, 300, 56, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 28px Outfit, Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 42);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.9, 0.78, 1);
  return sprite;
}

export function buildWorldMap(map: GeneratedMapData): BuiltMapHandles {
  const root = new THREE.Group();
  const theme = ACT_THEMES[map.location.act];

  const gateWalls = new Map<string, THREE.Object3D>();
  const secretWalls = new Map<string, THREE.Object3D>();
  const leverMeshes = new Map<string, THREE.Object3D>();
  const chestMeshes = new Map<string, { group: THREE.Group; lid: THREE.Object3D; glow: THREE.Mesh }>();
  const shrineMeshes = new Map<string, THREE.Mesh>();
  const puzzleVisuals = new Map<
    string,
    {
      type: WorldPuzzleState['type'];
      nodeMeshes: THREE.Object3D[];
      nodeIndicators: THREE.Mesh[];
      beamMeshes?: THREE.Mesh[];
    }
  >();
  const animatedProps: THREE.Object3D[] = [];

  const field = map.corridorField;
  const floorW = field ? Math.max(180, field.maxX - field.minX + 90) : 156;
  const floorD = field ? Math.max(180, field.maxZ - field.minZ + 90) : 156;
  const floorCX = field ? (field.minX + field.maxX) * 0.5 : 0;
  const floorCZ = field ? (field.minZ + field.maxZ) * 0.5 : 0;

  if (map.location.act === 4) {
    const lavaGeo = new THREE.PlaneGeometry(floorW + 120, floorD + 120);
    const lavaMat = new THREE.MeshBasicMaterial({ color: '#7f1d1d' });
    const lava = new THREE.Mesh(lavaGeo, lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(floorCX, -1.2, floorCZ);
    root.add(lava);
  }

  // Organic hand-painted Act floor (dynamically sized to cover the entire winding corridor!)
  const floorTex = createComicFloorTexture(theme.floorColor, theme.floorAccentColor, map.location.act);
  floorTex.repeat.set(Math.max(14, Math.round(floorW / 9.2)), Math.max(14, Math.round(floorD / 9.2)));
  const floorGeo = new THREE.PlaneGeometry(floorW, floorD);
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(floorCX, 0, floorCZ);
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Hand-painted glowing comic runic floor medallions for special rooms!
  for (const room of map.rooms) {
    if (room.kind === 'boss' || room.kind === 'secret' || room.kind === 'puzzle' || room.kind === 'spawn') {
      const col =
        room.kind === 'boss'
          ? theme.accentGlowColor
          : room.kind === 'secret'
            ? '#fbbf24'
            : room.kind === 'spawn'
              ? '#38bdf8'
              : '#a855f7';
      const medSize = room.kind === 'boss' ? 21 : room.kind === 'spawn' ? 11 : 15;
      const runicPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(medSize, medSize),
        new THREE.MeshBasicMaterial({
          map: createRunicCircleTexture(col),
          transparent: true,
          opacity: room.kind === 'boss' ? 0.36 : 0.28,
          depthWrite: false,
        })
      );
      runicPlane.rotation.x = -Math.PI / 2;
      runicPlane.position.set(room.cx, 0.035, room.cz);
      root.add(runicPlane);
    }
  }

  // Hand-painted plush comic walls with rounded stonework texture & warm turret-pillar lanterns!
  const wallTex = createComicWallTexture(theme.wallColor, theme.accentGlowColor, map.location.act);
  wallTex.repeat.set(0.24, 0.24);
  const wallMat = createToonMaterial(theme.wallColor, { map: wallTex, rimStrength: 0.24 });
  const wallCapMat = createToonMaterial(theme.wallTopColor, { rimStrength: 0.32 });
  const wallGeoCache = new Map<string, THREE.BufferGeometry>();
  const capGeoCache = new Map<string, THREE.BufferGeometry>();

  const getWallGeo = (w: number, h: number, d: number) => {
    const key = `${w.toFixed(1)}_${h.toFixed(1)}_${d.toFixed(1)}`;
    let g = wallGeoCache.get(key);
    if (!g) {
      g = createRoundedBoxGeometry(w, h, d, 0.78, 7);
      wallGeoCache.set(key, g);
    }
    return g;
  };

  const getCapGeo = (w: number, d: number) => {
    const key = `${w.toFixed(1)}_${d.toFixed(1)}`;
    let g = capGeoCache.get(key);
    if (!g) {
      g = createRoundedBoxGeometry(w + 0.48, 0.66, d + 0.48, 0.34, 6);
      capGeoCache.set(key, g);
    }
    return g;
  };

  // Shared rounded pillar, glowing lantern orb & decorative shrub/rock geometries per Act!
  const endPillarGeo = new THREE.CapsuleGeometry(0.92, 2.55, 12, 18);
  const endCapGeo = new THREE.SphereGeometry(1.06, 18, 14);
  const lanternGeo = new THREE.SphereGeometry(0.34, 14, 12);
  const lanternMat = createToonMaterial(theme.accentGlowColor, {
    emissive: theme.accentGlowColor,
    emissiveIntensity: 0.45,
    rimStrength: 0.35,
  });
  const shrubGeo = new THREE.SphereGeometry(0.72, 16, 12);
  const shrubColorByAct: Record<number, string> = {
    1: '#527060',
    2: '#dfa64d',
    3: '#2eb868',
    4: '#5b2848',
    5: '#7dd3fc',
    6: '#b8682c',
    7: '#7c5cc4',
    8: '#3b82f6',
    9: '#10b981',
  };
  const biomeOutline = getBiomeOutlineColor(map.location.act);
  // GPU Vertex-Shader wind sway on decorative foliage/bushes!
  const shrubMat = createWindToonMaterial(shrubColorByAct[map.location.act] || '#566482', {
    rimStrength: 0.28,
    windAmp: 0.09,
    windFreq: 2.3,
  });

  // =========================================================
  // ORGANIC 3D CARVED CANYON / CAVERN WALLS (SDF CONTOUR INSTANCED ROCKS)
  // Zero rectangular tile boxes — irregular displaced polygonal rock cliffs per Act!
  // =========================================================
  if (field && field.walkMask && field.gridCols > 0 && field.gridRows > 0) {
    const cols = field.gridCols;
    const rows = field.gridRows;
    const cellSize = field.gridCellSize;
    const mask = field.walkMask;

    const rimCells: Array<{ x: number; z: number; h: number; sx: number; sz: number; rot: number; hasCap: boolean }> = [];
    const backCells: Array<{ x: number; z: number; h: number; sx: number; sz: number; rot: number }> = [];

    const hash2 = (cx: number, cz: number, salt: number) => {
      const s = Math.sin(cx * 127.1 + cz * 311.7 + (field.mapSeed % 9973) * 0.13 + salt * 74.7) * 43758.5453;
      return s - Math.floor(s);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mask.charCodeAt(r * cols + c) !== 48) continue; // only solid ('0') cells

        let minDistSq = 99;
        for (let dr = -2; dr <= 2; dr++) {
          const rr = r + dr;
          if (rr < 0 || rr >= rows) continue;
          for (let dc = -2; dc <= 2; dc++) {
            const cc = c + dc;
            if (cc < 0 || cc >= cols) continue;
            if (mask.charCodeAt(rr * cols + cc) !== 48) {
              const dSq = dr * dr + dc * dc;
              if (dSq < minDistSq) minDistSq = dSq;
            }
          }
        }
        if (minDistSq > 5) continue;

        const jx = (hash2(c, r, 1) - 0.5) * cellSize * 0.42;
        const jz = (hash2(c, r, 2) - 0.5) * cellSize * 0.42;
        const wx = field.minX + (c + 0.5) * cellSize + jx;
        const wz = field.minZ + (r + 0.5) * cellSize + jz;
        const rot = hash2(c, r, 3) * Math.PI * 2;
        const sx = 1.05 + hash2(c, r, 4) * 0.46;
        const sz = 1.05 + hash2(c, r, 5) * 0.46;

        if (minDistSq <= 2) {
          // Inner carved canyon rim wall
          const h = 4.2 + hash2(c, r, 6) * 2.5;
          rimCells.push({ x: wx, z: wz, h, sx, sz, rot, hasCap: hash2(c, r, 7) > 0.52 });
        } else {
          // Outer rocky ridge backdrop (prevents seeing empty void past walls)
          const h = 5.6 + hash2(c, r, 8) * 3.1;
          backCells.push({ x: wx, z: wz, h, sx: sx * 1.18, sz: sz * 1.18, rot });
        }
      }
    }

    // Build organic sculpted polygonal rock column geometry with deterministic vertex jitter!
    const buildSculptedRockGeo = (radius: number, radialSegs: number, heightSegs: number, jitterAmp: number) => {
      const geo = new THREE.CylinderGeometry(radius * 0.78, radius * 1.16, 1, radialSegs, heightSegs);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const ang = Math.atan2(vz, vx);
        const disp =
          Math.sin(ang * 3.0 + vy * 5.2) * jitterAmp +
          Math.cos(ang * 5.0 - vy * 3.7) * (jitterAmp * 0.55);
        pos.setX(i, vx * (1 + disp));
        pos.setZ(i, vz * (1 + disp));
      }
      geo.computeVertexNormals();
      return geo;
    };

    // Act-tailored geological profile (Act 1 stone catacombs, Act 2 layered canyon, Act 3 root crags, Act 4 jagged obsidian!)
    const segsByAct = map.location.act === 4 ? 6 : map.location.act === 2 ? 8 : 7;
    const jitterByAct = map.location.act === 4 ? 0.24 : map.location.act === 3 ? 0.2 : 0.16;
    const rimRockGeo = buildSculptedRockGeo(cellSize * 0.68, segsByAct, 3, jitterByAct);
    const backRockGeo = buildSculptedRockGeo(cellSize * 0.78, 6, 2, 0.19);
    const capRockGeo = new THREE.DodecahedronGeometry(cellSize * 0.54, 1);
    {
      const cPos = capRockGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < cPos.count; i++) {
        const vx = cPos.getX(i);
        const vy = cPos.getY(i);
        const vz = cPos.getZ(i);
        const n = 1 + Math.sin(vx * 2.1 + vz * 2.7) * 0.14;
        cPos.setXYZ(i, vx * n, vy * 0.52 * n, vz * n);
      }
      capRockGeo.computeVertexNormals();
    }

    const dummy = new THREE.Object3D();

    if (rimCells.length > 0) {
      const rimInst = new THREE.InstancedMesh(rimRockGeo, wallMat, rimCells.length);
      rimInst.castShadow = true;
      rimInst.receiveShadow = true;
      const capItems = rimCells.filter((rc) => rc.hasCap);
      const capInst =
        capItems.length > 0 ? new THREE.InstancedMesh(capRockGeo, wallCapMat, capItems.length) : null;
      if (capInst) {
        capInst.castShadow = true;
        capInst.receiveShadow = true;
      }
      let capIdx = 0;
      for (let i = 0; i < rimCells.length; i++) {
        const rc = rimCells[i];
        dummy.position.set(rc.x, rc.h * 0.5 - 0.18, rc.z);
        dummy.rotation.set(0, rc.rot, 0);
        dummy.scale.set(rc.sx, rc.h, rc.sz);
        dummy.updateMatrix();
        rimInst.setMatrixAt(i, dummy.matrix);

        if (rc.hasCap && capInst) {
          dummy.position.set(rc.x, rc.h - 0.12, rc.z);
          dummy.rotation.set(0, rc.rot * 1.4, 0);
          dummy.scale.set(rc.sx * 1.05, 1.0, rc.sz * 1.05);
          dummy.updateMatrix();
          capInst.setMatrixAt(capIdx++, dummy.matrix);
        }
      }
      rimInst.instanceMatrix.needsUpdate = true;
      root.add(rimInst);
      if (capInst) {
        capInst.instanceMatrix.needsUpdate = true;
        root.add(capInst);
      }
    }

    if (backCells.length > 0) {
      const backMat = createToonMaterial(theme.wallTopColor, { map: wallTex, rimStrength: 0.16 });
      const backInst = new THREE.InstancedMesh(backRockGeo, backMat, backCells.length);
      backInst.receiveShadow = true;
      for (let i = 0; i < backCells.length; i++) {
        const bc = backCells[i];
        dummy.position.set(bc.x, bc.h * 0.5 - 0.2, bc.z);
        dummy.rotation.set(0, bc.rot, 0);
        dummy.scale.set(bc.sx, bc.h, bc.sz);
        dummy.updateMatrix();
        backInst.setMatrixAt(i, dummy.matrix);
      }
      backInst.instanceMatrix.needsUpdate = true;
      root.add(backInst);
    }

    // Subtle glowing ground rim foliage / stones along inner rim for organic richness!
    const decoSample = rimCells.filter((_, i) => i % 5 === 0);
    if (decoSample.length > 0) {
      const bushInst = new THREE.InstancedMesh(shrubGeo, shrubMat, decoSample.length);
      for (let i = 0; i < decoSample.length; i++) {
        const dc = decoSample[i];
        dummy.position.set(dc.x, dc.h + 0.15, dc.z);
        dummy.rotation.set(0, dc.rot, 0);
        dummy.scale.set(1.25, 0.8, 1.25);
        dummy.updateMatrix();
        bushInst.setMatrixAt(i, dummy.matrix);
      }
      bushInst.instanceMatrix.needsUpdate = true;
      root.add(bushInst);
    }
  }

  for (const w of map.walls) {
    if (w.gateId) {
      const gGroup = new THREE.Group();
      gGroup.position.set(w.x, 0, w.z);
      if (field && field.vaultGatePos) {
        gGroup.rotation.y = -field.vaultGatePos.angle;
        const gateSpan = Math.max(7.2, field.vaultGatePos.width || 8.4);
        const gateMesh = createComicMesh(
          createRoundedBoxGeometry(1.75, w.h + 1.1, gateSpan, 0.45, 5),
          '#164e63',
          0.036,
          { emissive: '#0284c7', emissiveIntensity: 0.36 }
        );
        gateMesh.position.y = (w.h + 1.1) / 2;
        gGroup.add(gateMesh);

        // Twin glowing runic arch pillars flanking the Vault Gate!
        for (const side of [-1, 1]) {
          const pil = createComicMesh(
            new THREE.CylinderGeometry(0.75, 0.95, w.h + 2.0, 12),
            '#1e293b',
            0.03,
            { emissive: '#0369a1', emissiveIntensity: 0.25 }
          );
          pil.position.set(0, (w.h + 2.0) / 2, side * (gateSpan * 0.5 + 0.55));
          const orb = createComicMesh(new THREE.OctahedronGeometry(0.55, 0), '#38bdf8', 0.02, {
            emissive: '#38bdf8',
            emissiveIntensity: 0.7,
          });
          orb.position.set(0, w.h + 2.55, side * (gateSpan * 0.5 + 0.55));
          gGroup.add(pil, orb);
          animatedProps.push(orb);
        }

        const lbl = makeSpriteLabel('🔒 WROTA SKARBCA', '#38bdf8', '#fde047');
        lbl.scale.set(3.8, 0.92, 1);
        lbl.position.y = w.h + 2.75;
        gGroup.add(lbl);
      } else {
        const gateMesh = createComicMesh(
          createRoundedBoxGeometry(w.w, w.h, w.d, 0.6, 5),
          '#1a7594',
          0.032,
          { emissive: '#0284c7', emissiveIntensity: 0.28 }
        );
        gateMesh.position.y = w.h / 2;
        gGroup.add(gateMesh);
        const lbl = makeSpriteLabel('🔒 BRAMA RUN', '#38bdf8', '#bae6fd');
        lbl.position.y = w.h + 1.1;
        gGroup.add(lbl);
      }
      root.add(gGroup);
      gateWalls.set(w.gateId, gGroup);
      continue;
    }

    if (w.secretId) {
      const sGroup = new THREE.Group();
      sGroup.position.set(w.x, 0, w.z);
      const isCracked = !!w.destructible;
      const wallBlock = createComicMesh(
        createRoundedBoxGeometry(w.w, w.h, w.d, 0.6, 5),
        isCracked ? '#8c4214' : theme.wallColor,
        0.032,
        isCracked ? { emissive: '#d97706', emissiveIntensity: 0.2 } : undefined
      );
      wallBlock.position.y = w.h / 2;
      sGroup.add(wallBlock);

      if (isCracked) {
        const crack = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.2, w.h * 0.52, 8, 12),
          new THREE.MeshBasicMaterial({ color: '#fbbf24' })
        );
        crack.position.y = w.h * 0.5;
        crack.rotation.z = 0.28;
        sGroup.add(crack);
        const lbl = makeSpriteLabel('💥 PĘKNIĘTA ŚCIANA', '#f59e0b', '#fde68a');
        lbl.position.y = w.h + 1.05;
        sGroup.add(lbl);
      } else {
        const lbl = makeSpriteLabel('🗝️ SEKRETNA ŚCIANA', '#64748b', '#cbd5e1');
        lbl.position.y = w.h + 1.05;
        sGroup.add(lbl);
      }

      root.add(sGroup);
      secretWalls.set(w.secretId, sGroup);
      continue;
    }

    const bodyMesh = new THREE.Mesh(getWallGeo(w.w, w.h - 0.35, w.d), wallMat);
    bodyMesh.position.set(w.x, (w.h - 0.35) / 2, w.z);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;

    const capMesh = new THREE.Mesh(getCapGeo(w.w, w.d), wallCapMat);
    capMesh.position.set(w.x, w.h - 0.08, w.z);
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;

    root.add(bodyMesh, capMesh);

    // Add plush rounded turret-pillars at ends of major wall segments to soften the entire silhouette!
    const isHoriz = w.w >= w.d;
    const len = isHoriz ? w.w : w.d;
    if (len >= 6) {
      for (const endSign of [-1, 1]) {
        const px = isHoriz ? w.x + endSign * (w.w * 0.5 - 0.5) : w.x;
        const pz = isHoriz ? w.z : w.z + endSign * (w.d * 0.5 - 0.5);
        const pillar = new THREE.Mesh(endPillarGeo, wallMat);
        pillar.position.set(px, (w.h - 0.3) * 0.5, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;

        const cap = new THREE.Mesh(endCapGeo, wallCapMat);
        cap.scale.set(1.05, 0.58, 1.05);
        cap.position.set(px, w.h + 0.08, pz);
        cap.castShadow = true;

        // Soft decorative boulder / mossy puff nestled at pillar base + grounding contact AO shadow!
        const puff = new THREE.Mesh(shrubGeo, shrubMat);
        puff.scale.set(1.12, 0.74, 1.12);
        puff.position.set(px + (isHoriz ? 0 : endSign * 0.45), 0.38, pz + (isHoriz ? endSign * 0.45 : 0));
        const aoShadow = createContactShadow(1.65, 0.34);
        aoShadow.position.set(px, 0.02, pz);
        root.add(pillar, cap, puff, aoShadow);

        // Warm comic glowing crystal/lantern finial atop alternating major pillars!
        if (endSign === 1 && len >= 9) {
          const finial = new THREE.Mesh(lanternGeo, lanternMat);
          finial.scale.set(0.95, 1.28, 0.95);
          finial.position.set(px, w.h + 0.72, pz);
          root.add(finial);
        }
      }
    }
  }

  // Hidden Levers (rounded base & knob handle!)
  for (const sec of map.secrets) {
    if (sec.kind === 'hidden_lever' && sec.leverX !== undefined && sec.leverZ !== undefined) {
      const lGroup = new THREE.Group();
      lGroup.position.set(sec.leverX, 0, sec.leverZ);
      lGroup.add(createContactShadow(0.7, 0.42));
      const base = createComicMesh(new THREE.CylinderGeometry(0.48, 0.58, 0.48, 16), '#3d485c', 0.025);
      base.position.y = 0.24;
      const stick = createComicMesh(new THREE.CapsuleGeometry(0.08, 1.25, 6, 10), '#be123c', 0.022, {
        emissive: '#9f1239',
        emissiveIntensity: 0.24,
      });
      stick.position.y = 0.9;
      stick.rotation.z = 0.4;
      const knob = createComicMesh(new THREE.SphereGeometry(0.2, 12, 10), '#f43f5e', 0.02);
      knob.position.set(-0.26, 1.48, 0);
      const lbl = makeSpriteLabel('⚙️ DŹWIGNIA [F]', '#f43f5e', '#fecdd3');
      lbl.position.y = 2.35;
      lGroup.add(base, stick, knob, lbl);
      root.add(lGroup);
      leverMeshes.set(sec.id, lGroup);
    }
  }

  // In-World Logic Puzzles (Legacy + 3 Hard Multi-Step Vault Puzzles!)
  const symbols = ['☀️', '🌙', '⚡', '🔥'];
  const obeliskSymbolNames = ['🔥 OGIEŃ', '❄️ MRÓZ', '⚡ BURZA', '🌑 CIEŃ'];
  const obeliskSymbolColors = ['#f97316', '#38bdf8', '#fde047', '#c084fc'];

  for (const puz of map.puzzles) {
    const nodeMeshes: THREE.Object3D[] = [];
    const nodeIndicators: THREE.Mesh[] = [];
    const beamMeshes: THREE.Mesh[] = [];

    if (puz.type === 'ancient_obelisks') {
      // Runic Clue Tablet beside the closed Vault Gate showing the encrypted 3-symbol code!
      if (puz.cluePos) {
        const tGroup = new THREE.Group();
        tGroup.position.set(puz.cluePos.x, 0, puz.cluePos.z);
        tGroup.add(createContactShadow(1.3, 0.44));
        const slab = createComicMesh(createRoundedBoxGeometry(2.1, 2.75, 0.58, 0.18, 5), '#312e81', 0.032, {
          emissive: '#4f46e5',
          emissiveIntensity: 0.28,
        });
        slab.position.y = 1.4;
        const runeGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 1.7),
          new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        runeGlow.position.set(0, 1.55, 0.32);
        const clueLbl = makeSpriteLabel(`📜 ${puz.clueText || 'SZYFR OBELISKÓW [F]'}`, '#fde047', '#fef9c3');
        clueLbl.scale.set(5.4, 1.05, 1);
        clueLbl.position.y = 3.65;
        tGroup.add(slab, runeGlow, clueLbl);
        root.add(tGroup);
      }

      // 3 Rotatable Ancient Obelisks hidden in side alcoves!
      puz.nodes.forEach((node, idx) => {
        const nGroup = new THREE.Group();
        nGroup.position.set(node.x, 0, node.z);
        nGroup.add(createContactShadow(1.3, 0.45));

        const ped = createComicMesh(new THREE.CylinderGeometry(0.95, 1.25, 0.65, 8), '#334155', 0.03);
        ped.position.y = 0.32;
        const obeliskBody = createComicMesh(new THREE.CylinderGeometry(0.55, 0.85, 3.1, 6), '#1e293b', 0.034, {
          emissive: '#312e81',
          emissiveIntensity: 0.22,
        });
        obeliskBody.position.y = 2.15;

        const initSym = puz.pillarSymbols[idx] || 0;
        const indicator = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.62, 0),
          createToonMaterial(obeliskSymbolColors[initSym % 4], {
            emissive: obeliskSymbolColors[initSym % 4],
            emissiveIntensity: 0.65,
          })
        );
        indicator.position.y = 4.25;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.25, 1.55, 24),
          new THREE.MeshBasicMaterial({
            color: obeliskSymbolColors[initSym % 4],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;

        const lbl = makeSpriteLabel(`🗿 ${node.label || `OBELISK ${idx + 1}`} [F]`, '#a855f7', '#fef08a');
        lbl.scale.set(3.2, 0.82, 1);
        lbl.position.y = 5.35;

        nGroup.add(ped, obeliskBody, indicator, ring, lbl);
        root.add(nGroup);
        nodeMeshes.push(ring);
        nodeIndicators.push(indicator);
      });

      puzzleVisuals.set(puz.id, { type: puz.type, nodeMeshes, nodeIndicators });
      continue;
    }

    if (puz.type === 'lights_out') {
      // 5 Coupled Runic Switches arrayed before the Vault Gate!
      const headerLbl = makeSpriteLabel('⚡ ZAPAL WSZYSTKIE 5 RUN JEDNOCZEŚNIE [F]', '#38bdf8', '#fde047');
      headerLbl.scale.set(5.4, 0.98, 1);
      headerLbl.position.set(puz.x, 4.1, puz.z);
      root.add(headerLbl);

      puz.nodes.forEach((node, idx) => {
        const nGroup = new THREE.Group();
        nGroup.position.set(node.x, 0, node.z);
        nGroup.add(createContactShadow(1.15, 0.42));

        const pad = createComicMesh(new THREE.CylinderGeometry(1.18, 1.38, 0.36, 18), '#334155', 0.028);
        pad.position.y = 0.18;

        const isOn = !!(puz.lightsState && puz.lightsState[idx]);
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.58, 0),
          createToonMaterial(isOn ? '#22c55e' : '#475569', {
            emissive: isOn ? '#16a34a' : '#0f172a',
            emissiveIntensity: isOn ? 0.75 : 0.08,
          })
        );
        crystal.scale.set(0.85, 1.45, 0.85);
        crystal.position.y = 1.45;

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.22, 1.52, 24),
          new THREE.MeshBasicMaterial({
            color: isOn ? '#fde047' : '#475569',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.72,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;

        const lbl = makeSpriteLabel(`RUNA ${idx + 1} [F]`, '#38bdf8', '#e0f2fe');
        lbl.scale.set(2.2, 0.68, 1);
        lbl.position.y = 2.75;

        nGroup.add(pad, crystal, ring, lbl);
        root.add(nGroup);
        nodeMeshes.push(ring);
        nodeIndicators.push(crystal);
      });

      puzzleVisuals.set(puz.id, { type: puz.type, nodeMeshes, nodeIndicators });
      continue;
    }

    if (puz.type === 'mirror_beam') {
      // Emitter Crystal + 4 Rotatable Mirror Statues + 5 Live Golden Laser Beam Segments!
      const headerLbl = makeSpriteLabel('🪞 SKIERUJ PROMIEŃ ŚWIATŁA DO WROT [F]', '#fde047', '#fef9c3');
      headerLbl.scale.set(5.4, 0.98, 1);
      headerLbl.position.set(puz.x, 4.35, puz.z);
      root.add(headerLbl);

      if (puz.beamEmitter) {
        const eGroup = new THREE.Group();
        eGroup.position.set(puz.beamEmitter.x, 0, puz.beamEmitter.z);
        eGroup.add(createContactShadow(1.25, 0.42));
        const ePed = createComicMesh(new THREE.CylinderGeometry(0.85, 1.15, 0.9, 16), '#78350f', 0.03);
        ePed.position.y = 0.45;
        const eOrb = createComicMesh(new THREE.SphereGeometry(0.64, 16, 12), '#fde047', 0.025, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.85,
        });
        eOrb.position.y = 1.85;
        const eLbl = makeSpriteLabel('☀️ EMITER ŚWIATŁA', '#f59e0b', '#fef08a');
        eLbl.scale.set(3.0, 0.78, 1);
        eLbl.position.y = 3.15;
        eGroup.add(ePed, eOrb, eLbl);
        root.add(eGroup);
        animatedProps.push(eOrb);
      }

      puz.nodes.forEach((node, idx) => {
        const nGroup = new THREE.Group();
        nGroup.position.set(node.x, 0, node.z);
        nGroup.add(createContactShadow(1.2, 0.42));

        const ped = createComicMesh(new THREE.CylinderGeometry(0.92, 1.12, 0.56, 18), '#475569', 0.028);
        ped.position.y = 0.28;
        const statueBody = new THREE.Group();
        statueBody.position.y = 0.56;
        const torso = createComicMesh(new THREE.CapsuleGeometry(0.42, 1.05, 8, 14), '#94a3b8', 0.028);
        torso.position.y = 0.95;
        // Reflective golden mirror shield mounted on front of statue!
        const mirrorFrame = createComicMesh(createRoundedBoxGeometry(1.38, 1.28, 0.2, 0.08, 4), '#f59e0b', 0.024, {
          emissive: '#b45309',
          emissiveIntensity: 0.28,
        });
        mirrorFrame.position.set(0, 1.25, 0.58);
        const mirrorGlass = new THREE.Mesh(
          new THREE.PlaneGeometry(1.12, 1.02),
          new THREE.MeshBasicMaterial({ color: '#fef9c3', side: THREE.DoubleSide })
        );
        mirrorGlass.position.set(0, 1.25, 0.7);
        const pointer = createComicMesh(new THREE.ConeGeometry(0.24, 0.7, 10), '#fde047', 0.02, {
          emissive: '#eab308',
          emissiveIntensity: 0.6,
        });
        pointer.rotation.x = Math.PI / 2;
        pointer.position.set(0, 1.25, 1.12);
        statueBody.add(torso, mirrorFrame, mirrorGlass, pointer);

        const indicator = new THREE.Mesh(
          new THREE.RingGeometry(1.18, 1.44, 24),
          new THREE.MeshBasicMaterial({
            color: '#d97706',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65,
          })
        );
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 0.06;

        const lbl = makeSpriteLabel(`🪞 LUSTRO ${idx + 1} [F]`, '#f59e0b', '#fef08a');
        lbl.scale.set(2.4, 0.72, 1);
        lbl.position.y = 3.25;

        nGroup.add(ped, statueBody, indicator, lbl);
        root.add(nGroup);
        nodeMeshes.push(statueBody);
        nodeIndicators.push(indicator);
      });

      // Build 5 live golden laser beam segments: Emitter -> M0 -> M1 -> M2 -> M3 -> Vault Lock!
      const chainPts: Array<{ x: number; z: number }> = [];
      if (puz.beamEmitter) chainPts.push(puz.beamEmitter);
      for (const nd of puz.nodes) chainPts.push({ x: nd.x, z: nd.z });
      chainPts.push(puz.beamLock || { x: puz.gateX, z: puz.gateZ });

      for (let segIdx = 0; segIdx < chainPts.length - 1; segIdx++) {
        const a = chainPts[segIdx];
        const b = chainPts[segIdx + 1];
        const dist = Math.max(0.2, Math.hypot(b.x - a.x, b.z - a.z));
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, dist, 10),
          new THREE.MeshBasicMaterial({
            color: '#fde047',
            transparent: true,
            opacity: 0.85,
          })
        );
        beam.position.set((a.x + b.x) * 0.5, 1.85, (a.z + b.z) * 0.5);
        beam.rotation.z = Math.PI / 2;
        beam.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        beam.visible = segIdx === 0;
        root.add(beam);
        beamMeshes.push(beam);
      }

      puzzleVisuals.set(puz.id, { type: puz.type, nodeMeshes, nodeIndicators, beamMeshes });
      continue;
    }

    const centerCrystal = createComicMesh(new THREE.SphereGeometry(0.75, 16, 12), '#2a9fd6', 0.028, {
      emissive: '#0284c7',
      emissiveIntensity: 0.28,
    });
    centerCrystal.scale.set(0.82, 1.35, 0.82);
    centerCrystal.position.set(puz.x, 2.2, puz.z);
    root.add(centerCrystal);
    animatedProps.push(centerCrystal);

    let hintText = '';
    if (puz.type === 'pressure_plates') {
      hintText = `KOLEJNOŚĆ: ${puz.targetSequence.map((n) => n + 1).join(' → ')}`;
    } else if (puz.type === 'rotating_statues') {
      hintText = 'OBRÓĆ POSĄGI DO KRYSZTAŁU [F]';
    } else {
      hintText = `SYMBOLE: ${puz.targetSymbols.map((s) => symbols[s] || obeliskSymbolNames[s % 4]).join(' ')}`;
    }
    const hintSprite = makeSpriteLabel(hintText, '#38bdf8', '#fde047');
    hintSprite.scale.set(4.8, 1.0, 1);
    hintSprite.position.set(puz.x, 3.85, puz.z);
    root.add(hintSprite);

    puz.nodes.forEach((node, idx) => {
      const nGroup = new THREE.Group();
      nGroup.position.set(node.x, 0, node.z);

      if (puz.type === 'pressure_plates') {
        const plate = createComicMesh(new THREE.CylinderGeometry(1.5, 1.68, 0.24, 24), '#4c576e', 0.028);
        plate.position.y = 0.12;
        const indicator = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 1.28, 24),
          new THREE.MeshBasicMaterial({
            color: '#d97706',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65,
          })
        );
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 0.26;
        const lbl = makeSpriteLabel(`PŁYTA ${idx + 1}`, '#d97706', '#fef08a');
        lbl.scale.set(2.1, 0.7, 1);
        lbl.position.y = 1.45;
        nGroup.add(plate, indicator, lbl);
        nodeIndicators.push(indicator);
      } else if (puz.type === 'rotating_statues') {
        nGroup.add(createContactShadow(1.2, 0.42));
        const ped = createComicMesh(new THREE.CylinderGeometry(0.95, 1.15, 0.56, 20), '#4c576e', 0.028);
        ped.position.y = 0.28;
        const statueBody = new THREE.Group();
        statueBody.position.y = 0.56;
        const torso = createComicMesh(new THREE.CapsuleGeometry(0.45, 1.1, 8, 16), '#8b95a5', 0.03);
        torso.position.y = 0.95;
        const head = createComicMesh(new THREE.SphereGeometry(0.42, 14, 12), '#9aa4b5', 0.028);
        head.position.y = 1.85;
        const arrow = createComicMesh(
          createPlushLathe(
            [
              [0.01, -0.45],
              [0.32, -0.35],
              [0.22, 0.15],
              [0.06, 0.48],
              [0.01, 0.52],
            ],
            18
          ),
          '#f0b429',
          0.024,
          {
            emissive: '#b45309',
            emissiveIntensity: 0.24,
          }
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.position.set(0, 1.15, 0.98);
        statueBody.add(torso, head, arrow);

        const indicator = new THREE.Mesh(
          new THREE.RingGeometry(1.18, 1.42, 24),
          new THREE.MeshBasicMaterial({
            color: '#d97706',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
          })
        );
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 0.06;
        const lbl = makeSpriteLabel('OBRÓĆ [F]', '#d97706', '#fde047');
        lbl.scale.set(2.2, 0.7, 1);
        lbl.position.y = 3.15;
        nGroup.add(ped, statueBody, indicator, lbl);
        nodeMeshes.push(statueBody);
        nodeIndicators.push(indicator);
        root.add(nGroup);
        return;
      } else {
        nGroup.add(createContactShadow(1.0, 0.42));
        const pillar = createComicMesh(new THREE.CylinderGeometry(0.62, 0.75, 2.7, 18), '#3d475c', 0.03);
        pillar.position.y = 1.35;
        const indicator = new THREE.Mesh(
          new THREE.SphereGeometry(0.46, 14, 12),
          createToonMaterial('#9333ea', { emissive: '#7c3aed', emissiveIntensity: 0.25 })
        );
        indicator.scale.set(0.85, 1.25, 0.85);
        indicator.position.y = 3.2;
        const lbl = makeSpriteLabel(`FILAR ${idx + 1} [F]`, '#a855f7', '#e9d5ff');
        lbl.scale.set(2.4, 0.75, 1);
        lbl.position.y = 4.25;
        nGroup.add(pillar, indicator, lbl);
        nodeIndicators.push(indicator);
      }

      root.add(nGroup);
      nodeMeshes.push(nGroup);
    });

    puzzleVisuals.set(puz.id, { type: puz.type, nodeMeshes, nodeIndicators });
  }

  // Plump Barrel-Lidded Cartoon Treasure Chests (including Special Vault Chest 2× Drop!)
  for (const ch of map.chests) {
    const cGroup = new THREE.Group();
    cGroup.position.set(ch.x, 0, ch.z);
    if (ch.isVaultChest) cGroup.scale.setScalar(1.32);
    cGroup.add(createContactShadow(ch.isVaultChest ? 1.55 : 1.15, 0.46));

    const baseColor = ch.isVaultChest ? '#b91c1c' : ch.isSecret ? '#cf8d1b' : '#854519';
    const trimColor = ch.isVaultChest ? '#fde047' : ch.isSecret ? '#f0ca56' : '#d6a442';
    const body = createComicMesh(createRoundedBoxGeometry(1.55, 0.85, 1.1, 0.22, 6), baseColor, 0.028,
      ch.isVaultChest ? { emissive: '#991b1b', emissiveIntensity: 0.24 } : undefined
    );
    body.position.y = 0.44;

    // Domed barrel lid!
    const lidGroup = new THREE.Group();
    lidGroup.position.y = 0.88;
    const lidDome = createComicMesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.56, 16, 1, false, 0, Math.PI),
      trimColor,
      0.025,
      {
        emissive: ch.isVaultChest ? '#eab308' : ch.isSecret ? '#b45309' : '#000000',
        emissiveIntensity: ch.isVaultChest ? 0.36 : ch.isSecret ? 0.18 : 0,
      }
    );
    lidDome.rotation.z = Math.PI / 2;
    lidDome.rotation.x = -Math.PI / 2;
    const lock = createComicMesh(new THREE.SphereGeometry(0.14, 10, 8), '#fde047', 0.018);
    lock.position.set(0, -0.02, 0.56);
    lidGroup.add(lidDome, lock);

    const glow = new THREE.Mesh(
      new THREE.RingGeometry(1.18, ch.isVaultChest ? 1.72 : 1.42, 28),
      new THREE.MeshBasicMaterial({
        color: ch.isVaultChest ? '#fde047' : ch.isSecret ? '#e6c253' : '#56b4e9',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ch.isVaultChest ? 0.65 : 0.36,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;

    const lbl = makeSpriteLabel(
      ch.isVaultChest
        ? '👑 SKRZYNIA SKARBCA (2× DROP) [F]'
        : ch.isSecret
          ? '✨ ZŁOTA SKRZYNIA [F]'
          : '🔐 SKRZYNIA [F]',
      ch.isVaultChest ? '#fde047' : ch.isSecret ? '#f59e0b' : '#38bdf8',
      '#fef08a'
    );
    lbl.scale.set(ch.isVaultChest ? 4.3 : 2.9, ch.isVaultChest ? 0.92 : 0.78, 1);
    lbl.position.y = ch.isVaultChest ? 2.55 : 2.2;

    cGroup.add(body, lidGroup, glow, lbl);
    root.add(cGroup);
    chestMeshes.set(ch.id, { group: cGroup, lid: lidGroup, glow });
  }

  // Healing Shrines (curved fountain pedestal + floating soft crystal!)
  for (const sh of map.shrines) {
    const sGroup = new THREE.Group();
    sGroup.position.set(sh.x, 0, sh.z);
    sGroup.add(createContactShadow(1.2, 0.42));
    const ped = createComicMesh(new THREE.CylinderGeometry(0.88, 1.18, 0.78, 20), '#626e82', 0.028);
    ped.position.y = 0.39;
    const rim = createComicMesh(new THREE.TorusGeometry(0.9, 0.12, 8, 20), '#7a879c', 0.022);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.78;
    const crystal = createComicMesh(new THREE.SphereGeometry(0.56, 14, 12), '#22a355', 0.026, {
      emissive: '#16a34a',
      emissiveIntensity: 0.3,
    });
    crystal.scale.set(0.82, 1.38, 0.82);
    crystal.position.y = 1.75;
    const lbl = makeSpriteLabel('✨ KAPLICZKA DARU [F]', '#4ade80', '#dcfce7');
    lbl.scale.set(3.2, 0.8, 1);
    lbl.position.y = 3.1;
    sGroup.add(ped, rim, crystal, lbl);
    root.add(sGroup);
    shrineMeshes.set(sh.id, crystal);
    animatedProps.push(crystal);
  }

  // Cursed Altar (Przeklęty Ołtarz — 30s Risk & Reward Arena Barrier!)
  let obeliskVisual: { crystal: THREE.Mesh; ring: THREE.Mesh; barrierRing?: THREE.Mesh } | undefined;
  if (map.obelisk) {
    const oGroup = new THREE.Group();
    oGroup.position.set(map.obelisk.x, 0, map.obelisk.z);
    oGroup.add(createContactShadow(1.8, 0.46));
    const ped = createComicMesh(new THREE.CylinderGeometry(1.15, 1.48, 0.9, 22), '#3b3754', 0.032, {
      outlineColor: biomeOutline,
    });
    ped.position.y = 0.45;
    const obCrystal = createComicMesh(new THREE.SphereGeometry(0.74, 18, 14), '#38bdf8', 0.03, {
      emissive: '#0284c7',
      emissiveIntensity: 0.36,
      outlineColor: biomeOutline,
    });
    obCrystal.scale.set(0.75, 1.65, 0.75);
    obCrystal.position.y = 2.45;
    const obRing = createComicMesh(new THREE.TorusGeometry(1.38, 0.12, 10, 28), '#7dd3fc', 0.022, {
      emissive: '#0284c7',
      emissiveIntensity: 0.32,
    });
    obRing.rotation.x = Math.PI / 2 - 0.25;
    obRing.position.y = 2.45;

    // 13.5m glowing arena containment barrier visible during the 30s Cursed Altar event!
    const barrierRing = new THREE.Mesh(
      new THREE.CylinderGeometry(13.5, 13.5, 3.2, 48, 1, true),
      createSoftBeamMaterial('#f43f5e', 0.28)
    );
    barrierRing.position.y = 1.6;
    barrierRing.visible = false;

    const obLbl = makeSpriteLabel('🔮 PRZEKLĘTY OŁTARZ [F]', '#f43f5e', '#fde68a');
    obLbl.scale.set(3.8, 0.86, 1);
    obLbl.position.y = 4.35;
    oGroup.add(ped, obCrystal, obRing, barrierRing, obLbl);
    root.add(oGroup);
    animatedProps.push(obCrystal);
    obeliskVisual = { crystal: obCrystal, ring: obRing, barrierRing };
  }

  // =========================================================
  // INTERACTIVE 3D CO-OP CAMP STATIONS (Wspólny Obóz Bohaterów!)
  // =========================================================
  if (map.isCamp && map.campStations) {
    // Cozy Campfire Hearth at south plaza + GPU wind-waving Hero Banners!
    const bannerMat = createWindToonMaterial('#e11d48', { windAmp: 0.22, windFreq: 3.1, side: THREE.DoubleSide });
    for (const bx of [-10, 10]) {
      const pole = createComicMesh(new THREE.CapsuleGeometry(0.12, 5.2, 8, 12), '#92400e', 0.024, {
        outlineColor: biomeOutline,
      });
      pole.position.set(bx, 2.6, -15);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4, 4, 6), bannerMat);
      cloth.position.set(bx, 3.7, -14.85);
      root.add(pole, cloth);
    }

    for (const st of map.campStations) {
      const stGroup = new THREE.Group();
      stGroup.position.set(st.x, 0, st.z);
      stGroup.add(createContactShadow(2.2, 0.42));

      // Glowing comic runic pad beneath each camp station
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 5.6),
        new THREE.MeshBasicMaterial({
          map: createRunicCircleTexture(st.color),
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.04;
      stGroup.add(pad);

      if (st.kind === 'blacksmith') {
        const base = createComicMesh(new THREE.CylinderGeometry(1.1, 1.4, 0.75, 20), '#475569', 0.03, { outlineColor: biomeOutline });
        base.position.y = 0.38;
        const anvil = createComicMesh(createRoundedBoxGeometry(1.9, 0.75, 0.95, 0.18, 5), '#64748b', 0.03, { outlineColor: biomeOutline });
        anvil.position.y = 1.15;
        const hammer = createComicMesh(new THREE.CapsuleGeometry(0.24, 0.65, 10, 14), '#fbbf24', 0.024, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.36,
        });
        hammer.rotation.z = Math.PI / 2;
        hammer.position.y = 2.25;
        stGroup.add(base, anvil, hammer);
        animatedProps.push(hammer);
      } else if (st.kind === 'runes') {
        const ped = createComicMesh(new THREE.CylinderGeometry(0.95, 1.3, 0.95, 20), '#3b2d5e', 0.03, { outlineColor: biomeOutline });
        ped.position.y = 0.48;
        const mono = createComicMesh(new THREE.SphereGeometry(0.76, 18, 14), '#a855f7', 0.03, {
          emissive: '#7c3aed',
          emissiveIntensity: 0.42,
        });
        mono.scale.set(0.72, 1.6, 0.72);
        mono.position.y = 2.35;
        const ring = createComicMesh(new THREE.TorusGeometry(1.3, 0.11, 10, 26), '#e879f9', 0.02);
        ring.rotation.x = Math.PI / 2 - 0.25;
        ring.position.y = 2.35;
        stGroup.add(ped, mono, ring);
        animatedProps.push(mono);
      } else if (st.kind === 'trade') {
        const carpet = createComicMesh(createRoundedBoxGeometry(3.2, 0.18, 2.2, 0.08, 4), '#1d4ed8', 0.024, { outlineColor: biomeOutline });
        carpet.position.y = 0.1;
        const coin = createComicMesh(new THREE.TorusGeometry(0.65, 0.2, 12, 24), '#fbbf24', 0.024, {
          emissive: '#d97706',
          emissiveIntensity: 0.35,
        });
        coin.position.y = 1.95;
        stGroup.add(carpet, coin);
        animatedProps.push(coin);
      } else if (st.kind === 'prestige') {
        const ped = createComicMesh(new THREE.CylinderGeometry(1.0, 1.28, 0.9, 22), '#e2e8f0', 0.028, { outlineColor: biomeOutline });
        ped.position.y = 0.45;
        const crown = createComicMesh(new THREE.TorusGeometry(0.68, 0.16, 12, 24), '#fde047', 0.026, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.42,
        });
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 2.05;
        stGroup.add(ped, crown);
        animatedProps.push(crown);
      } else if (st.kind === 'rift') {
        const ring = createComicMesh(new THREE.TorusGeometry(1.95, 0.28, 14, 32), '#a855f7', 0.032, {
          emissive: '#7c3aed',
          emissiveIntensity: 0.45,
        });
        ring.position.y = 2.25;
        const core = new THREE.Mesh(
          new THREE.CircleGeometry(1.7, 28),
          new THREE.MeshBasicMaterial({
            color: '#c084fc',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          })
        );
        core.position.y = 2.25;
        stGroup.add(ring, core);
        animatedProps.push(ring);
      }

      if (st.kind !== 'portal') {
        const lbl = makeSpriteLabel(st.label, st.color, '#fef08a');
        lbl.scale.set(4.1, 0.86, 1);
        lbl.position.y = 4.3;
        stGroup.add(lbl);
      }
      root.add(stGroup);
    }
  }

  // Exit Portal
  const portalGroup = new THREE.Group();
  portalGroup.position.set(map.exitPortal.x, 0, map.exitPortal.z);
  portalGroup.add(createContactShadow(2.2, 0.4));
  const exitPortalRing = createComicMesh(
    new THREE.TorusGeometry(2.15, 0.32, 14, 32),
    '#626e82',
    0.032,
    { emissive: '#0284c7', emissiveIntensity: 0.24 }
  );
  exitPortalRing.position.y = 2.4;
  const exitPortalCore = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 28),
    new THREE.MeshBasicMaterial({
      color: '#334155',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
  );
  exitPortalCore.position.y = 2.4;
  const portalLbl = makeSpriteLabel('🌀 PORTAL DALEJ [F]', '#38bdf8', '#bae6fd');
  portalLbl.position.y = 5.0;
  portalGroup.add(exitPortalRing, exitPortalCore, portalLbl);
  root.add(portalGroup);

  // Soft, Lush, Organic Cartoon Props per Act!
  for (const prop of map.props) {
    const pGroup = new THREE.Group();
    pGroup.position.set(prop.x, 0, prop.z);
    pGroup.rotation.y = prop.rotY;
    pGroup.scale.setScalar(prop.scale);

    switch (prop.kind) {
      case 'torch_pillar':
      case 'dwarf_pillar': {
        pGroup.add(createContactShadow(0.95, 0.4));
        const col = createComicMesh(new THREE.CylinderGeometry(0.48, 0.62, 3.4, 16), '#525c70', 0.028);
        col.position.y = 1.7;
        const bowl = createComicMesh(
          new THREE.SphereGeometry(0.66, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
          '#32394a',
          0.024
        );
        bowl.position.y = 3.75;
        const fire = createComicMesh(new THREE.SphereGeometry(0.38, 12, 10), '#ee8231', 0.02, {
          emissive: '#c2410c',
          emissiveIntensity: 0.34,
        });
        fire.scale.set(0.88, 1.45, 0.88);
        fire.position.y = 4.08;
        pGroup.add(col, bowl, fire);
        animatedProps.push(fire);
        break;
      }
      case 'crypt_sarcophagus':
      case 'bone_pile': {
        pGroup.add(createContactShadow(1.35, 0.38));
        // Rounded ancient stone tomb / boulder cluster
        const stoneA = createComicMesh(new THREE.SphereGeometry(0.95, 14, 12), '#5e677a', 0.03);
        stoneA.scale.set(1.2, 0.72, 1.65);
        stoneA.position.y = 0.48;
        const stoneB = createComicMesh(new THREE.SphereGeometry(0.55, 12, 10), '#4c5466', 0.026);
        stoneB.position.set(0.85, 0.36, 0.55);
        pGroup.add(stoneA, stoneB);
        break;
      }
      case 'sand_obelisk':
      case 'pharaoh_statue': {
        pGroup.add(createContactShadow(1.1, 0.4));
        const base = createComicMesh(new THREE.CylinderGeometry(0.8, 1.05, 0.7, 14), '#b5762a', 0.028);
        base.position.y = 0.35;
        const spire = createComicMesh(new THREE.CapsuleGeometry(0.52, 2.8, 8, 14), '#cc8a36', 0.03, {
          emissive: '#0369a1',
          emissiveIntensity: 0.1,
        });
        spire.position.y = 2.15;
        pGroup.add(base, spire);
        break;
      }
      case 'palm_tree': {
        pGroup.add(createContactShadow(1.25, 0.38));
        const trunk = createComicMesh(new THREE.CapsuleGeometry(0.28, 3.6, 8, 12), '#85491c', 0.028, {
          outlineColor: biomeOutline,
        });
        trunk.position.y = 1.9;
        trunk.rotation.z = 0.15;
        const frondMat = createWindToonMaterial('#248748', { windAmp: 0.16, windFreq: 2.6, rimStrength: 0.28 });
        for (let f = 0; f < 5; f++) {
          const a = (f / 5) * Math.PI * 2;
          const frond = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), frondMat);
          frond.castShadow = true;
          frond.scale.set(1.85, 0.32, 0.72);
          frond.position.set(0.32 + Math.cos(a) * 1.1, 3.9, Math.sin(a) * 1.1);
          frond.rotation.y = -a;
          frond.rotation.z = -0.35;
          pGroup.add(frond);
        }
        pGroup.add(trunk);
        break;
      }
      case 'oasis_pool': {
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(2.2, 24),
          new THREE.MeshBasicMaterial({ color: '#149bb5', side: THREE.DoubleSide, transparent: true, opacity: 0.82 })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.05;
        pGroup.add(pool);
        break;
      }
      case 'glow_mushroom': {
        pGroup.add(createContactShadow(0.95, 0.4));
        const stem = createComicMesh(new THREE.CapsuleGeometry(0.24, 1.35, 8, 14), '#e2e8f0', 0.024);
        stem.position.y = 0.85;
        stem.rotation.z = 0.1;
        // Plush domed cartoon mushroom cap + cute white spots!
        const cap = createComicMesh(
          new THREE.SphereGeometry(1.12, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
          '#9b5de5',
          0.03,
          { emissive: '#6d28d9', emissiveIntensity: 0.26 }
        );
        cap.position.set(0.08, 1.55, 0);
        for (let sp = 0; sp < 4; sp++) {
          const a = (sp / 4) * Math.PI * 2 + 0.4;
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            createToonMaterial('#f5d0fe')
          );
          dot.position.set(0.08 + Math.cos(a) * 0.68, 2.22, Math.sin(a) * 0.68);
          pGroup.add(dot);
        }
        pGroup.add(stem, cap);
        break;
      }
      case 'gnarled_tree':
      case 'elf_arch': {
        pGroup.add(createContactShadow(1.5, 0.42));
        const trunk = createComicMesh(new THREE.CapsuleGeometry(0.46, 2.8, 8, 14), '#4c3528', 0.03, {
          outlineColor: biomeOutline,
        });
        trunk.position.y = 1.65;
        // Lush multi-puff cartoon cloud canopy with GPU Vertex-Shader Wind Sway!
        const puffs: Array<[number, number, number, number, string]> = [
          [0, 3.8, 0, 1.38, '#217541'],
          [-0.85, 3.45, 0.45, 0.98, '#298c4e'],
          [0.9, 3.5, -0.35, 1.02, '#1c6638'],
          [0.15, 4.55, 0.2, 0.88, '#309e58'],
        ];
        for (const [px, py, pz, pr, col] of puffs) {
          const leafMat = createWindToonMaterial(col, { windAmp: 0.12, windFreq: 2.0, rimStrength: 0.28 });
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(pr, 16, 12), leafMat);
          leaf.castShadow = true;
          leaf.position.set(px, py, pz);
          pGroup.add(leaf);
        }
        pGroup.add(trunk);
        break;
      }
      case 'swamp_pool': {
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(2.1, 24),
          new THREE.MeshBasicMaterial({ color: '#649422', transparent: true, opacity: 0.62 })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.05;
        pGroup.add(pool);
        break;
      }
      case 'obsidian_crystal':
      case 'chaos_monolith': {
        pGroup.add(createContactShadow(1.15, 0.42));
        const cryBaseCol =
          map.location.act === 5
            ? '#7dd3fc'
            : map.location.act === 7
              ? '#c084fc'
              : map.location.act === 9
                ? '#10b981'
                : '#2b253d';
        const cryEmissive =
          map.location.act === 5
            ? '#38bdf8'
            : map.location.act === 7
              ? '#00f5d4'
              : map.location.act === 9
                ? '#34d399'
                : '#e11d48';
        const cry = createComicMesh(
          createPlushLathe(
            [
              [0.01, -1.2],
              [0.64, -0.75],
              [0.74, 0.15],
              [0.44, 0.95],
              [0.01, 1.38],
            ],
            18
          ),
          cryBaseCol,
          0.032,
          {
            emissive: cryEmissive,
            emissiveIntensity: 0.32,
          }
        );
        cry.position.y = 1.95;
        const sideGem = createComicMesh(new THREE.CapsuleGeometry(0.28, 0.85, 8, 14), cryEmissive, 0.022, {
          emissive: cryEmissive,
          emissiveIntensity: 0.34,
        });
        sideGem.position.set(0.62, 0.85, 0.25);
        sideGem.rotation.z = -0.32;
        pGroup.add(cry, sideGem);
        animatedProps.push(cry);
        break;
      }
      case 'lava_brazier':
      case 'lava_fissure': {
        pGroup.add(createContactShadow(1.05, 0.44));
        const braz = createComicMesh(new THREE.CylinderGeometry(0.92, 0.66, 1.2, 16), '#272233', 0.03);
        braz.position.y = 0.6;
        const magma = createComicMesh(new THREE.SphereGeometry(0.68, 14, 12), '#e35a24', 0.024, {
          emissive: '#b91c1c',
          emissiveIntensity: 0.34,
        });
        magma.scale.set(1.05, 0.72, 1.05);
        magma.position.y = 1.38;
        pGroup.add(braz, magma);
        animatedProps.push(magma);
        break;
      }
    }

    root.add(pGroup);
  }

  const pillarGroup = new THREE.Group();
  root.add(pillarGroup);

  return {
    root,
    gateWalls,
    secretWalls,
    leverMeshes,
    chestMeshes,
    shrineMeshes,
    obeliskVisual,
    puzzleVisuals,
    exitPortalRing,
    exitPortalCore,
    pillarGroup,
    animatedProps,
  };
}

export function syncWorldMapVisuals(
  handles: BuiltMapHandles,
  puzzles: WorldPuzzleState[],
  secrets: SecretPassageState[],
  chests: LockedChestState[],
  shrines: Array<{ id: string; used: boolean }>,
  pillars: ObsidianPillarState[],
  exitUnlocked: boolean,
  elapsedSec: number,
  obelisk?: WaveObeliskState
) {
  for (const obj of handles.animatedProps) {
    obj.rotation.y = elapsedSec * 1.15;
  }

  const symbolColors = ['#d9a826', '#2a9fd6', '#8b4bc9', '#d9641e'];
  const obeliskSymbolColors = ['#f97316', '#38bdf8', '#fde047', '#c084fc'];
  for (const puz of puzzles) {
    const gate = handles.gateWalls.get(puz.id);
    if (gate) gate.visible = !puz.solved;

    const vis = handles.puzzleVisuals.get(puz.id);
    if (!vis) continue;

    if (puz.type === 'pressure_plates') {
      vis.nodeIndicators.forEach((ind, idx) => {
        const active = puz.solved || puz.currentSequence.includes(idx);
        (ind.material as THREE.MeshBasicMaterial).color.set(active ? '#22a355' : '#d97706');
      });
    } else if (puz.type === 'rotating_statues') {
      vis.nodeMeshes.forEach((statue, idx) => {
        const node = puz.nodes[idx];
        const baseAngle = Math.atan2(puz.x - node.x, puz.z - node.z);
        statue.rotation.y = baseAngle + (puz.statueAngles[idx] || 0) * (Math.PI / 2);
      });
      vis.nodeIndicators.forEach((ind, idx) => {
        const aligned = puz.solved || puz.statueAngles[idx] === 0;
        (ind.material as THREE.MeshBasicMaterial).color.set(aligned ? '#22a355' : '#d97706');
      });
    } else if (puz.type === 'symbol_match') {
      vis.nodeIndicators.forEach((ind, idx) => {
        const sym = puz.pillarSymbols[idx] || 0;
        const mat = ind.material as THREE.MeshToonMaterial;
        mat.color.set(puz.solved ? '#22a355' : symbolColors[sym % 4]);
        ind.rotation.y = elapsedSec * 1.6;
      });
    } else if (puz.type === 'ancient_obelisks') {
      vis.nodeIndicators.forEach((ind, idx) => {
        const sym = puz.pillarSymbols[idx] || 0;
        const col = puz.solved ? '#22c55e' : obeliskSymbolColors[sym % 4];
        const mat = ind.material as THREE.MeshToonMaterial;
        mat.color.set(col);
        mat.emissive.set(col);
        ind.rotation.y = elapsedSec * 1.8;
        ind.position.y = 4.25 + Math.sin(elapsedSec * 2.5 + idx) * 0.16;
        const ring = vis.nodeMeshes[idx] as THREE.Mesh | undefined;
        if (ring) {
          (ring.material as THREE.MeshBasicMaterial).color.set(col);
        }
      });
    } else if (puz.type === 'lights_out') {
      vis.nodeIndicators.forEach((ind, idx) => {
        const on = puz.solved || !!(puz.lightsState && puz.lightsState[idx]);
        const mat = ind.material as THREE.MeshToonMaterial;
        mat.color.set(on ? '#22c55e' : '#475569');
        mat.emissive.set(on ? '#16a34a' : '#0f172a');
        mat.emissiveIntensity = on ? 0.85 : 0.08;
        ind.rotation.y = elapsedSec * (on ? 2.4 : 0.4);
        ind.position.y = on ? 1.6 + Math.sin(elapsedSec * 3 + idx) * 0.14 : 1.18;
        const ring = vis.nodeMeshes[idx] as THREE.Mesh | undefined;
        if (ring) {
          (ring.material as THREE.MeshBasicMaterial).color.set(on ? '#fde047' : '#334155');
        }
      });
    } else if (puz.type === 'mirror_beam') {
      const targets = puz.targetAngles || [0, 0, 0, 0];
      let chainAlignedCount = 0;
      let chainBroken = false;
      vis.nodeMeshes.forEach((statue, idx) => {
        const node = puz.nodes[idx];
        const nextPt =
          idx + 1 < puz.nodes.length
            ? puz.nodes[idx + 1]
            : puz.beamLock || { x: puz.gateX, z: puz.gateZ };
        const idealRotY = Math.atan2(nextPt.x - node.x, nextPt.z - node.z);
        const curStep = puz.statueAngles[idx] || 0;
        const targetStep = targets[idx] || 0;
        const deltaStep = (curStep - targetStep + 4) % 4;
        statue.rotation.y = idealRotY + deltaStep * (Math.PI / 2);

        const isAligned = puz.solved || deltaStep === 0;
        if (!chainBroken && isAligned) {
          chainAlignedCount++;
        } else {
          chainBroken = true;
        }
        const ind = vis.nodeIndicators[idx];
        if (ind) {
          (ind.material as THREE.MeshBasicMaterial).color.set(isAligned ? '#22c55e' : '#d97706');
        }
      });
      if (vis.beamMeshes) {
        vis.beamMeshes.forEach((beam, segIdx) => {
          // Segment 0 (Emitter -> M0) is always on; Segment k+1 lights up as soon as mirrors 0..k are aligned!
          beam.visible = puz.solved || segIdx <= chainAlignedCount;
          const bMat = beam.material as THREE.MeshBasicMaterial;
          bMat.color.set(puz.solved ? '#4ade80' : '#fde047');
          bMat.opacity = 0.72 + Math.sin(elapsedSec * 7 + segIdx) * 0.16;
        });
      }
    }
  }

  for (const sec of secrets) {
    const wall = handles.secretWalls.get(sec.id);
    if (wall) wall.visible = !sec.revealed;
    const lever = handles.leverMeshes.get(sec.id);
    if (lever) lever.rotation.z = sec.revealed ? -0.5 : 0;
  }

  for (const ch of chests) {
    const cm = handles.chestMeshes.get(ch.id);
    if (!cm) continue;
    if (ch.opened) {
      cm.lid.rotation.x = -1.1;
      cm.lid.position.y = 1.18;
      cm.lid.position.z = -0.35;
      cm.glow.visible = false;
    } else {
      cm.glow.rotation.z = elapsedSec * 1.5;
    }
  }

  for (const sh of shrines) {
    const crystal = handles.shrineMeshes.get(sh.id);
    if (crystal) crystal.visible = !sh.used;
  }

  if (handles.obeliskVisual && obelisk) {
    const cMat = handles.obeliskVisual.crystal.material as THREE.MeshToonMaterial;
    handles.obeliskVisual.ring.rotation.z = elapsedSec * (obelisk.state === 'active' ? 3.2 : 1.0);
    if (handles.obeliskVisual.barrierRing) {
      handles.obeliskVisual.barrierRing.visible = obelisk.state === 'active';
      if (obelisk.state === 'active') {
        handles.obeliskVisual.barrierRing.rotation.y = elapsedSec * 0.65;
      }
    }
    if (obelisk.state === 'active') {
      cMat.color.set('#f43f5e');
      cMat.emissive.set('#e11d48');
    } else if (obelisk.state === 'completed') {
      cMat.color.set('#4ade80');
      cMat.emissive.set('#16a34a');
    } else {
      cMat.color.set('#38bdf8');
      cMat.emissive.set('#0284c7');
    }
  }

  handles.exitPortalRing.rotation.z = elapsedSec * (exitUnlocked ? 1.8 : 0.35);
  const coreMat = handles.exitPortalCore.material as THREE.MeshBasicMaterial;
  coreMat.color.set(exitUnlocked ? '#0ea5e9' : '#334155');
  coreMat.opacity = exitUnlocked ? 0.4 + Math.sin(elapsedSec * 4) * 0.08 : 0.2;

  while (handles.pillarGroup.children.length > pillars.length) {
    handles.pillarGroup.remove(handles.pillarGroup.children[handles.pillarGroup.children.length - 1]);
  }
  while (handles.pillarGroup.children.length < pillars.length) {
    const pMesh = createComicMesh(
      new THREE.CapsuleGeometry(1.72, 3.6, 8, 18),
      '#1a2136',
      0.036,
      { emissive: '#0284c7', emissiveIntensity: 0.24 }
    );
    pMesh.position.y = 3.1;
    const safeRing = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.55, 28),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = -3.02;
    pMesh.add(safeRing);
    handles.pillarGroup.add(pMesh);
  }
  pillars.forEach((pil, idx) => {
    const mesh = handles.pillarGroup.children[idx];
    if (mesh) mesh.position.set(pil.x, 3.1, pil.z);
  });
}

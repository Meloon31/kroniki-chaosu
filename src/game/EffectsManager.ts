import * as THREE from 'three';
import { RARITY_META } from '../../shared/items';
import { RUNES } from '../../shared/runes';
import type { GroundLoot, Rarity, SkillVfxEvent, TelegraphZone } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createRoundedBoxGeometry,
  createSoftBeamMaterial,
  createSoftStarGeometry,
  createToonMaterial,
} from './ComicMaterials';

interface TransientEffect {
  mesh: THREE.Object3D;
  createdAt: number;
  durationMs: number;
  onUpdate: (t: number, dt: number) => void;
}

interface ComicParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  rotSpeedX: number;
  rotSpeedY: number;
  baseScale: number;
  createdAt: number;
  durationMs: number;
  sway?: boolean;
  startOpacity: number;
}

interface LootVisual {
  group: THREE.Group;
  beamMat: THREE.ShaderMaterial;
  gem: THREE.Mesh;
  ring: THREE.Mesh;
  rarity?: Rarity;
}

const SHARED_SMOKE_GEO = new THREE.SphereGeometry(0.32, 12, 10);
const SHARED_SHARD_GEO = new THREE.SphereGeometry(0.22, 10, 8);
const SHARED_LEAF_GEO = new THREE.CircleGeometry(0.2, 10);
const SHARED_SPARK_GEO = new THREE.CapsuleGeometry(0.06, 0.32, 6, 8);

export class EffectsManager {
  private scene: THREE.Scene;
  private transientEffects: TransientEffect[] = [];
  private particles: ComicParticle[] = [];
  private telegraphMeshes = new Map<string, { group: THREE.Group; fill: THREE.Mesh }>();
  private lootVisuals = new Map<string, LootVisual>();
  private lastUpdateMs = performance.now();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clearAll() {
    for (const ef of this.transientEffects) this.scene.remove(ef.mesh);
    this.transientEffects = [];

    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles = [];

    for (const tm of this.telegraphMeshes.values()) this.scene.remove(tm.group);
    this.telegraphMeshes.clear();

    for (const lv of this.lootVisuals.values()) this.scene.remove(lv.group);
    this.lootVisuals.clear();
  }

  public spawnParticles(options: {
    kind: 'smoke' | 'shard' | 'leaf' | 'spark';
    x: number;
    y: number;
    z: number;
    count: number;
    color: THREE.ColorRepresentation;
    speedMin?: number;
    speedMax?: number;
    upMin?: number;
    upMax?: number;
    scale?: number;
    durationMs?: number;
    gravity?: number;
    spreadRadius?: number;
    opacity?: number;
  }) {
    // Cap particle pool cleanly for silky 60 FPS
    if (this.particles.length > 180) return;

    const now = performance.now();
    const geo =
      options.kind === 'smoke'
        ? SHARED_SMOKE_GEO
        : options.kind === 'shard'
          ? SHARED_SHARD_GEO
          : options.kind === 'leaf'
            ? SHARED_LEAF_GEO
            : SHARED_SPARK_GEO;

    const startOpacity = options.opacity ?? (options.kind === 'smoke' ? 0.65 : 0.78);

    for (let i = 0; i < options.count; i++) {
      const mat =
        options.kind === 'smoke' || options.kind === 'shard'
          ? createToonMaterial(options.color, {
              transparent: true,
              opacity: startOpacity,
              steps: 3,
            })
          : new THREE.MeshBasicMaterial({
              color: options.color,
              transparent: true,
              opacity: startOpacity,
              side: THREE.DoubleSide,
              depthWrite: false,
            });

      const mesh = new THREE.Mesh(geo, mat);
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * (options.spreadRadius ?? 0.5);
      mesh.position.set(
        options.x + Math.cos(ang) * rad,
        options.y + Math.random() * 0.25,
        options.z + Math.sin(ang) * rad
      );
      const sc = (options.scale ?? 1.0) * (0.7 + Math.random() * 0.6);
      mesh.scale.setScalar(sc);
      this.scene.add(mesh);

      const spd =
        (options.speedMin ?? 1.4) +
        Math.random() * ((options.speedMax ?? 4.2) - (options.speedMin ?? 1.4));
      const vy =
        (options.upMin ?? 1.5) +
        Math.random() * ((options.upMax ?? 4.2) - (options.upMin ?? 1.5));

      this.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy,
        vz: Math.sin(ang) * spd,
        gravity:
          options.gravity ??
          (options.kind === 'smoke' ? -0.4 : options.kind === 'leaf' ? 0.9 : 11.5),
        drag: options.kind === 'smoke' ? 2.8 : options.kind === 'leaf' ? 2.2 : 1.4,
        rotSpeedX: (Math.random() - 0.5) * 8,
        rotSpeedY: (Math.random() - 0.5) * 8,
        baseScale: sc,
        createdAt: now,
        durationMs: (options.durationMs ?? 520) * (0.8 + Math.random() * 0.4),
        sway: options.kind === 'leaf',
        startOpacity,
      });
    }
  }

  public spawnFootstepDust(x: number, z: number, color = '#7b8299', burst = false) {
    this.spawnParticles({
      kind: 'smoke',
      x,
      y: 0.16,
      z,
      count: burst ? 5 : 1,
      color,
      speedMin: burst ? 1.2 : 0.2,
      speedMax: burst ? 3.2 : 0.9,
      upMin: 0.4,
      upMax: burst ? 1.6 : 0.9,
      scale: burst ? 0.85 : 0.52,
      durationMs: burst ? 420 : 340,
      opacity: burst ? 0.52 : 0.36,
    });
  }

  private addExpandingRing(
    x: number,
    z: number,
    maxRadius: number,
    color: THREE.ColorRepresentation,
    durationMs: number,
    maxOpacity = 0.46,
    thickness = 0.22
  ) {
    const now = performance.now();
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: maxOpacity,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.1, 1 - thickness), 1.0, 28),
      ringMat
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.14, z);
    this.scene.add(ring);

    this.transientEffects.push({
      mesh: ring,
      createdAt: now,
      durationMs,
      onUpdate: (t) => {
        const eased = 1 - Math.pow(1 - t, 2.2);
        const s = 0.35 + eased * maxRadius;
        ring.scale.set(s, s, 1);
        ringMat.opacity = (1 - t) * maxOpacity;
      },
    });
  }

  public spawnSkillVfx(ev: SkillVfxEvent) {
    const now = performance.now();
    const radius = ev.radius || 3.0;
    const dx = (ev.tx ?? ev.x) - ev.x;
    const dz = (ev.tz ?? ev.z) - ev.z;
    const yaw = Math.atan2(dx, dz);

    switch (ev.kind) {
      case 'slash':
      case 'boss_rift_slash': {
        // Crisp curved comic sword crescent (muted rich color, dark outer contrast, zero glare)
        const isRift = ev.kind === 'boss_rift_slash';
        const arcGroup = new THREE.Group();
        arcGroup.position.set(ev.x, 1.1, ev.z);
        arcGroup.rotation.y = yaw - Math.PI * 0.42;

        const outerMat = new THREE.MeshBasicMaterial({
          color: isRift ? '#4c0519' : '#261414',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        });
        const outerArc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.56, radius * 1.04, 18, 1, 0, Math.PI * 0.85),
          outerMat
        );
        outerArc.rotation.x = -Math.PI / 2;

        const innerMat = new THREE.MeshBasicMaterial({
          color: isRift ? '#be123c' : '#d9534f',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
        });
        const innerArc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.64, radius * 0.96, 18, 1, 0.05, Math.PI * 0.75),
          innerMat
        );
        innerArc.rotation.x = -Math.PI / 2;
        innerArc.position.y = 0.03;

        arcGroup.add(outerArc, innerArc);
        this.scene.add(arcGroup);

        this.transientEffects.push({
          mesh: arcGroup,
          createdAt: now,
          durationMs: 260,
          onUpdate: (t) => {
            arcGroup.rotation.y = yaw - Math.PI * 0.55 + t * 1.3;
            outerMat.opacity = (1 - t) * 0.6;
            innerMat.opacity = (1 - t) * 0.58;
          },
        });

        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 1.0,
          z: ev.z,
          count: 5,
          color: isRift ? '#f43f5e' : '#eab308',
          speedMin: 2.5,
          speedMax: 5.5,
          upMin: 0.8,
          upMax: 2.8,
          durationMs: 280,
          opacity: 0.72,
        });
        break;
      }

      case 'whirlwind': {
        // Dual angled thin spinning blade ribbons + dust clouds (keeps hero fully visible!)
        const group = new THREE.Group();
        group.position.set(ev.x, 1.0, ev.z);
        const bladeMat = new THREE.MeshBasicMaterial({
          color: '#d97706',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
        });
        for (let i = 0; i < 2; i++) {
          const arc = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.68, radius * 0.98, 20, 1, i * Math.PI, Math.PI * 0.68),
            bladeMat
          );
          arc.rotation.x = -Math.PI / 2;
          arc.position.y = i * 0.25;
          group.add(arc);
        }
        this.scene.add(group);
        const dur = ev.duration ?? 2100;
        this.transientEffects.push({
          mesh: group,
          createdAt: now,
          durationMs: dur,
          onUpdate: (t) => {
            group.rotation.y = t * 24;
            bladeMat.opacity = t > 0.82 ? ((1 - t) / 0.18) * 0.44 : 0.44;
          },
        });
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.3,
          z: ev.z,
          count: 8,
          color: '#78716c',
          spreadRadius: radius * 0.7,
          speedMin: 1.0,
          speedMax: 2.5,
          upMin: 0.5,
          upMax: 1.8,
          durationMs: 650,
          opacity: 0.42,
        });
        break;
      }

      case 'charge': {
        this.spawnFootstepDust(ev.x, ev.z, '#8c8376', true);
        if (ev.tx !== undefined && ev.tz !== undefined) {
          this.addExpandingRing(ev.tx, ev.tz, radius, '#d99e26', 360, 0.45, 0.22);
          this.spawnParticles({
            kind: 'shard',
            x: ev.tx,
            y: 0.4,
            z: ev.tz,
            count: 7,
            color: '#a89f91',
            speedMin: 2.5,
            speedMax: 5.2,
            upMin: 2.8,
            upMax: 5.5,
            durationMs: 480,
          });
        }
        break;
      }

      case 'shadow_orb': {
        // Dark-void core sphere wrapped in muted purple contour — zero neon glare!
        const orbGroup = new THREE.Group();
        const core = createComicMesh(new THREE.SphereGeometry(0.42, 10, 8), '#2e1065', 0.032, {
          emissive: '#6d28d9',
          emissiveIntensity: 0.28,
        });
        const haloMat = new THREE.MeshBasicMaterial({
          color: '#9333ea',
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), haloMat);
        orbGroup.add(core, halo);
        orbGroup.position.set(ev.x, 1.3, ev.z);
        this.scene.add(orbGroup);

        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        this.transientEffects.push({
          mesh: orbGroup,
          createdAt: now,
          durationMs: 260,
          onUpdate: (t) => {
            orbGroup.position.x = THREE.MathUtils.lerp(ev.x, tx, t);
            orbGroup.position.z = THREE.MathUtils.lerp(ev.z, tz, t);
            orbGroup.rotation.y = t * 10;
            const sc = t > 0.8 ? 1 + (t - 0.8) * 3.5 : 1;
            orbGroup.scale.setScalar(sc);
            haloMat.opacity = (1 - t) * 0.36;
          },
        });

        this.addExpandingRing(tx, tz, Math.min(radius, 3.2), '#7e22ce', 340, 0.4, 0.22);
        this.spawnParticles({
          kind: 'smoke',
          x: tx,
          y: 0.7,
          z: tz,
          count: 7,
          color: '#4c1d95',
          speedMin: 1.2,
          speedMax: 3.4,
          upMin: 0.6,
          upMax: 2.2,
          scale: 0.9,
          durationMs: 520,
          opacity: 0.56,
        });
        break;
      }

      case 'meteor':
      case 'boss_obsidian_rain': {
        // Cel-shaded jagged basalt meteors with dark smoky trails & crater ring!
        const isObsidian = ev.kind === 'boss_obsidian_rain';
        const rockCount = isObsidian ? 1 : 3;
        for (let m = 0; m < rockCount; m++) {
          const ox = m === 0 ? 0 : (Math.random() - 0.5) * radius * 0.9;
          const oz = m === 0 ? 0 : (Math.random() - 0.5) * radius * 0.9;
          const rock = createComicMesh(
            new THREE.SphereGeometry(radius * (isObsidian ? 0.36 : 0.26), 14, 12),
            '#332b36',
            0.04,
            { emissive: '#b91c1c', emissiveIntensity: 0.32 }
          );
          const startX = ev.x + ox - 3.5;
          const startZ = ev.z + oz - 2.0;
          rock.position.set(startX, 11 + m * 2.5, startZ);
          this.scene.add(rock);

          this.transientEffects.push({
            mesh: rock,
            createdAt: now + m * 95,
            durationMs: 360,
            onUpdate: (t) => {
              const ct = Math.max(0, t);
              rock.position.x = THREE.MathUtils.lerp(startX, ev.x + ox, ct);
              rock.position.z = THREE.MathUtils.lerp(startZ, ev.z + oz, ct);
              rock.position.y = Math.max(0.25, (11 + m * 2.5) * (1 - ct * ct));
              rock.rotation.x = ct * 7;
              rock.rotation.z = ct * 5;
              if (ct > 0.85) rock.scale.setScalar(1 - (ct - 0.85) * 5);
            },
          });
        }

        // Scorched crater decal + charcoal smoke puffs + subtle embers
        this.addExpandingRing(ev.x, ev.z, radius, '#b91c1c', 480, 0.44, 0.26);
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.35,
          z: ev.z,
          count: 10,
          color: '#3f3a36',
          spreadRadius: radius * 0.55,
          speedMin: 1.5,
          speedMax: 3.8,
          upMin: 1.2,
          upMax: 3.2,
          scale: 1.15,
          durationMs: 680,
          opacity: 0.58,
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 8,
          color: '#ea580c',
          speedMin: 3.0,
          speedMax: 6.5,
          upMin: 2.2,
          upMax: 5.5,
          durationMs: 420,
          opacity: 0.72,
        });
        break;
      }

      case 'soul_drain': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        this.addExpandingRing(tx, tz, radius, '#9333ea', 450, 0.38, 0.22);
        this.spawnParticles({
          kind: 'smoke',
          x: tx,
          y: 0.8,
          z: tz,
          count: 9,
          color: '#701a75',
          spreadRadius: radius * 0.6,
          speedMin: 0.8,
          speedMax: 2.2,
          upMin: 1.2,
          upMax: 2.8,
          scale: 0.85,
          durationMs: 580,
          opacity: 0.52,
        });
        break;
      }

      case 'magic_arrow':
      case 'volley_backflip': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const arrows = ev.kind === 'volley_backflip' ? 5 : 1;
        for (let a = 0; a < arrows; a++) {
          const spread = arrows === 1 ? 0 : (a - 2) * 0.2;
          const dist = Math.max(2, Math.hypot(dx, dz));
          const ang = yaw + spread;
          const endX = ev.x + Math.sin(ang) * dist;
          const endZ = ev.z + Math.cos(ang) * dist;

          const arrowGroup = new THREE.Group();
          const shaft = createComicMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6), '#15803d', 0.015);
          shaft.rotation.x = Math.PI / 2;
          const head = createComicMesh(new THREE.ConeGeometry(0.11, 0.34, 5), '#34d399', 0.018);
          head.rotation.x = Math.PI / 2;
          head.position.z = 0.75;
          arrowGroup.add(shaft, head);
          arrowGroup.position.set(ev.x, 1.3, ev.z);
          arrowGroup.rotation.y = ang;
          this.scene.add(arrowGroup);

          this.transientEffects.push({
            mesh: arrowGroup,
            createdAt: now,
            durationMs: 210,
            onUpdate: (t) => {
              arrowGroup.position.x = THREE.MathUtils.lerp(ev.x, endX, t);
              arrowGroup.position.z = THREE.MathUtils.lerp(ev.z, endZ, t);
            },
          });
        }
        this.spawnParticles({
          kind: 'leaf',
          x: tx,
          y: 1.0,
          z: tz,
          count: 6,
          color: '#34d399',
          speedMin: 1.2,
          speedMax: 3.4,
          upMin: 0.8,
          upMax: 2.6,
          durationMs: 560,
          opacity: 0.72,
        });
        break;
      }

      case 'wind_blade': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const crescentMat = new THREE.MeshBasicMaterial({
          color: '#22a8b8',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });
        const crescent = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 2.2, 16, 1, -Math.PI * 0.38, Math.PI * 0.76),
          crescentMat
        );
        crescent.rotation.x = -Math.PI / 2;
        crescent.rotation.z = -yaw + Math.PI / 2;
        crescent.position.set(ev.x, 1.15, ev.z);
        this.scene.add(crescent);

        this.transientEffects.push({
          mesh: crescent,
          createdAt: now,
          durationMs: 320,
          onUpdate: (t) => {
            crescent.position.x = THREE.MathUtils.lerp(ev.x, tx, t);
            crescent.position.z = THREE.MathUtils.lerp(ev.z, tz, t);
            crescent.scale.setScalar(1 + t * 0.45);
            crescentMat.opacity = (1 - t) * 0.5;
          },
        });

        this.spawnParticles({
          kind: 'leaf',
          x: (ev.x + tx) / 2,
          y: 1.0,
          z: (ev.z + tz) / 2,
          count: 8,
          color: '#5eead4',
          spreadRadius: 1.8,
          speedMin: 1.0,
          speedMax: 3.2,
          durationMs: 620,
          opacity: 0.68,
        });
        break;
      }

      case 'hammer_slam':
      case 'earthquake':
      case 'boss_leap_slam':
      case 'boss_burrow': {
        // Cel-shaded erupting stone shards + dusty crater ring!
        const rockColor = ev.kind === 'boss_burrow' ? '#c99443' : '#6b6560';
        const ringColor = ev.kind === 'boss_leap_slam' ? '#22a355' : '#b45309';
        this.addExpandingRing(ev.x, ev.z, radius, ringColor, 460, 0.46, 0.22);
        this.spawnParticles({
          kind: 'shard',
          x: ev.x,
          y: 0.35,
          z: ev.z,
          count: 10,
          color: rockColor,
          spreadRadius: radius * 0.45,
          speedMin: 2.2,
          speedMax: 5.5,
          upMin: 3.5,
          upMax: 6.8,
          scale: 1.15,
          durationMs: 560,
          opacity: 0.88,
        });
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.3,
          z: ev.z,
          count: 9,
          color: '#8c8376',
          spreadRadius: radius * 0.6,
          speedMin: 1.4,
          speedMax: 3.4,
          upMin: 0.6,
          upMax: 2.0,
          scale: 1.1,
          durationMs: 620,
          opacity: 0.5,
        });
        break;
      }

      case 'radiant_bolt': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const star = createComicMesh(createSoftStarGeometry(0.32, 0.16, 5, 0.1), '#fde047', 0.02, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.32,
        });
        star.position.set(ev.x, 1.35, ev.z);
        this.scene.add(star);
        this.transientEffects.push({
          mesh: star,
          createdAt: now,
          durationMs: 230,
          onUpdate: (t) => {
            star.position.x = THREE.MathUtils.lerp(ev.x, tx, t);
            star.position.z = THREE.MathUtils.lerp(ev.z, tz, t);
            star.rotation.y = t * 12;
          },
        });
        this.addExpandingRing(tx, tz, Math.min(radius, 2.5), '#d9a826', 300, 0.36, 0.2);
        this.spawnParticles({
          kind: 'spark',
          x: tx,
          y: 1.1,
          z: tz,
          count: 5,
          color: '#eab308',
          speedMin: 1.5,
          speedMax: 3.8,
          durationMs: 360,
          opacity: 0.65,
        });
        break;
      }

      case 'heal_wave': {
        // Gentle non-glaring sage-emerald wave + rising petal motes (NO blinding dome!)
        this.addExpandingRing(ev.x, ev.z, Math.min(radius, 10), '#22a355', 560, 0.38, 0.16);
        this.spawnParticles({
          kind: 'leaf',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 14,
          color: '#4ade80',
          spreadRadius: 4.5,
          speedMin: 0.6,
          speedMax: 2.0,
          upMin: 1.6,
          upMax: 3.4,
          gravity: -0.6,
          durationMs: 780,
          opacity: 0.68,
        });
        break;
      }

      case 'light_barrier': {
        // Subtle sky-blue ripple + delicate floating crystal motes
        this.addExpandingRing(ev.x, ev.z, Math.min(radius, 10), '#38bdf8', 540, 0.34, 0.15);
        this.spawnParticles({
          kind: 'shard',
          x: ev.x,
          y: 0.7,
          z: ev.z,
          count: 10,
          color: '#7dd3fc',
          spreadRadius: 4.0,
          speedMin: 0.8,
          speedMax: 2.2,
          upMin: 1.5,
          upMax: 3.0,
          gravity: -0.4,
          scale: 0.65,
          durationMs: 660,
          opacity: 0.58,
        });
        break;
      }

      case 'boss_bone_wave': {
        // Erupting cel-shaded bone spikes along line!
        const group = new THREE.Group();
        const dist = Math.max(4, Math.min(16, Math.hypot(dx, dz)));
        const dirX = dx / (Math.hypot(dx, dz) || 1);
        const dirZ = dz / (Math.hypot(dx, dz) || 1);
        for (let i = 1; i <= 7; i++) {
          const sp = createComicMesh(new THREE.ConeGeometry(0.42, 2.2, 5), '#d4d9e3', 0.036);
          sp.position.set(ev.x + dirX * (i * (dist / 7)), 0.9, ev.z + dirZ * (i * (dist / 7)));
          group.add(sp);
        }
        this.scene.add(group);
        this.transientEffects.push({
          mesh: group,
          createdAt: now,
          durationMs: 520,
          onUpdate: (t) => {
            const lift = t < 0.25 ? t / 0.25 : t > 0.7 ? (1 - t) / 0.3 : 1;
            group.scale.set(1, Math.max(0.05, lift), 1);
          },
        });
        break;
      }

      case 'boss_thorn_nova': {
        const group = new THREE.Group();
        group.position.set(ev.x, 1.1, ev.z);
        const darts: THREE.Mesh[] = [];
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const sp = createComicMesh(new THREE.ConeGeometry(0.22, 1.0, 5), '#7e22ce', 0.025);
          sp.rotation.z = -Math.PI / 2;
          sp.rotation.y = -a;
          sp.userData = { dx: Math.cos(a), dz: Math.sin(a) };
          group.add(sp);
          darts.push(sp);
        }
        this.scene.add(group);
        this.transientEffects.push({
          mesh: group,
          createdAt: now,
          durationMs: 520,
          onUpdate: (t) => {
            for (const sp of darts) {
              sp.position.x = sp.userData.dx * t * Math.min(radius, 12);
              sp.position.z = sp.userData.dz * t * Math.min(radius, 12);
            }
          },
        });
        break;
      }

      case 'boss_chaos_burst': {
        this.addExpandingRing(ev.x, ev.z, radius, '#be123c', 650, 0.48, 0.16);
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.8,
          z: ev.z,
          count: 14,
          color: '#4c0519',
          spreadRadius: 6,
          speedMin: 3.5,
          speedMax: 8.5,
          upMin: 1.5,
          upMax: 4.0,
          scale: 1.3,
          durationMs: 760,
          opacity: 0.56,
        });
        break;
      }

      case 'boss_stinger': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        this.addExpandingRing(tx, tz, radius, '#65a30d', 360, 0.44, 0.25);
        this.spawnParticles({
          kind: 'shard',
          x: tx,
          y: 0.9,
          z: tz,
          count: 9,
          color: '#65a30d',
          speedMin: 2.2,
          speedMax: 5.2,
          upMin: 2.0,
          upMax: 4.5,
          durationMs: 460,
          opacity: 0.82,
        });
        break;
      }

      case 'miniboss_cleave': {
        // Grimjaw Executioner's Giant Crimson Axe Arc!
        const arcGroup = new THREE.Group();
        arcGroup.position.set(ev.x, 1.3, ev.z);
        arcGroup.rotation.y = yaw - Math.PI * 0.6;
        const mat = new THREE.MeshBasicMaterial({
          color: '#b91c1c',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.56,
          depthWrite: false,
        });
        const arc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.42, radius * 1.05, 22, 1, 0, Math.PI * 1.15),
          mat
        );
        arc.rotation.x = -Math.PI / 2;
        arcGroup.add(arc);
        this.scene.add(arcGroup);
        this.transientEffects.push({
          mesh: arcGroup,
          createdAt: now,
          durationMs: 360,
          onUpdate: (t) => {
            arcGroup.rotation.y = yaw - Math.PI * 0.7 + t * 1.65;
            mat.opacity = (1 - t) * 0.56;
          },
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.tx ?? ev.x,
          y: 1.0,
          z: ev.tz ?? ev.z,
          count: 10,
          color: '#dc2626',
          speedMin: 2.8,
          speedMax: 6.2,
          durationMs: 420,
        });
        break;
      }

      case 'miniboss_soul_nova': {
        // Mordath Golden-Violet Runic Seal Expansion!
        this.addExpandingRing(ev.x, ev.z, radius, '#7c3aed', 540, 0.46, 0.22);
        this.addExpandingRing(ev.x, ev.z, radius * 0.72, '#d4a038', 460, 0.42, 0.14);
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.7,
          z: ev.z,
          count: 12,
          color: '#581c87',
          spreadRadius: radius * 0.65,
          speedMin: 1.2,
          speedMax: 3.4,
          upMin: 1.4,
          upMax: 3.6,
          durationMs: 680,
          opacity: 0.54,
        });
        break;
      }

      case 'miniboss_sand_roar': {
        // Khepri's Triple Sonic Golden Sand Waves!
        const dist = Math.max(4, Math.min(16, Math.hypot(dx, dz)));
        const dirX = dx / (Math.hypot(dx, dz) || 1);
        const dirZ = dz / (Math.hypot(dx, dz) || 1);
        for (let w = 0; w < 3; w++) {
          const waveMat = new THREE.MeshBasicMaterial({
            color: '#d99e26',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.52,
            depthWrite: false,
          });
          const wave = new THREE.Mesh(
            new THREE.RingGeometry(1.2, 2.1, 14, 1, -Math.PI * 0.35, Math.PI * 0.7),
            waveMat
          );
          wave.rotation.x = -Math.PI / 2;
          wave.rotation.z = -yaw + Math.PI / 2;
          wave.position.set(ev.x, 1.0, ev.z);
          this.scene.add(wave);
          this.transientEffects.push({
            mesh: wave,
            createdAt: now + w * 85,
            durationMs: 360,
            onUpdate: (t) => {
              const ct = Math.max(0, t);
              wave.position.x = ev.x + dirX * ct * dist;
              wave.position.z = ev.z + dirZ * ct * dist;
              wave.scale.setScalar(0.8 + ct * 1.4);
              waveMat.opacity = (1 - ct) * 0.52;
            },
          });
        }
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x + dirX * 5,
          y: 0.6,
          z: ev.z + dirZ * 5,
          count: 10,
          color: '#c99443',
          spreadRadius: 2.5,
          durationMs: 560,
          opacity: 0.5,
        });
        break;
      }

      case 'miniboss_venom_web': {
        // Vespera's Hexagonal Toxic Spider Web Decal!
        const webGroup = new THREE.Group();
        webGroup.position.set(ev.x, 0.14, ev.z);
        const webMat = new THREE.MeshBasicMaterial({
          color: '#84cc16',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        for (let r = 1; r <= 3; r++) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * (r / 3) - 0.1, radius * (r / 3), 6),
            webMat
          );
          ring.rotation.x = -Math.PI / 2;
          webGroup.add(ring);
        }
        this.scene.add(webGroup);
        this.transientEffects.push({
          mesh: webGroup,
          createdAt: now,
          durationMs: 1200,
          onUpdate: (t) => {
            webMat.opacity = (1 - t) * 0.45;
          },
        });
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.4,
          z: ev.z,
          count: 8,
          color: '#4d7c0f',
          spreadRadius: radius * 0.6,
          durationMs: 620,
          opacity: 0.5,
        });
        break;
      }

      case 'miniboss_magma_slam': {
        // Ignis Furnace Titan Boulder & Magma Slam!
        this.addExpandingRing(ev.x, ev.z, radius, '#ea580c', 520, 0.48, 0.25);
        this.spawnParticles({
          kind: 'shard',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 14,
          color: '#292524',
          spreadRadius: radius * 0.5,
          speedMin: 2.8,
          speedMax: 6.4,
          upMin: 4.0,
          upMax: 7.4,
          scale: 1.25,
          durationMs: 620,
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 0.6,
          z: ev.z,
          count: 10,
          color: '#ea580c',
          speedMin: 3.0,
          speedMax: 6.5,
          durationMs: 460,
        });
        break;
      }

      case 'potion_heal': {
        this.addExpandingRing(ev.x, ev.z, 2.2, '#22a355', 420, 0.36, 0.18);
        this.spawnParticles({
          kind: 'leaf',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 8,
          color: '#4ade80',
          spreadRadius: 0.9,
          speedMin: 0.4,
          speedMax: 1.4,
          upMin: 1.6,
          upMax: 3.2,
          gravity: -0.5,
          durationMs: 620,
          opacity: 0.7,
        });
        break;
      }

      default: {
        // Chest open, secret break, puzzle solve, stone skin, summon, level up
        this.addExpandingRing(ev.x, ev.z, radius, ev.color || '#d9a826', 440, 0.4, 0.2);
        this.spawnParticles({
          kind: ev.kind === 'secret_break' ? 'shard' : 'spark',
          x: ev.x,
          y: 0.9,
          z: ev.z,
          count: 10,
          color: ev.color || '#d9a826',
          speedMin: 2.0,
          speedMax: 5.0,
          upMin: 2.0,
          upMax: 5.2,
          durationMs: 560,
          opacity: 0.72,
        });
        break;
      }
    }
  }

  public syncTelegraphs(telegraphs: TelegraphZone[], serverNow: number) {
    const activeIds = new Set(telegraphs.map((t) => t.id));

    for (const [id, entry] of this.telegraphMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.group);
        this.telegraphMeshes.delete(id);
      }
    }

    for (const tel of telegraphs) {
      let entry = this.telegraphMeshes.get(tel.id);
      if (!entry) {
        const group = new THREE.Group();
        const col = tel.color || '#dc2626';

        let fill: THREE.Mesh;
        if (tel.shape === 'line' || tel.shape === 'beam') {
          const len = tel.length ?? 16;
          const wid = tel.width ?? 3.0;
          const border = new THREE.Mesh(
            new THREE.PlaneGeometry(len, wid),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.16,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          border.rotation.x = -Math.PI / 2;
          border.position.set(len / 2, 0.08, 0);

          fill = new THREE.Mesh(
            new THREE.PlaneGeometry(len, wid * 0.62),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.36,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          fill.rotation.x = -Math.PI / 2;
          fill.position.set(len / 2, 0.11, 0);
          group.add(border, fill);
        } else if (tel.shape === 'ring') {
          const outer = new THREE.Mesh(
            new THREE.RingGeometry(Math.max(0.5, tel.radius - 1.3), tel.radius + 0.2, 36),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.42,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          outer.rotation.x = -Math.PI / 2;
          outer.position.y = 0.1;
          fill = outer;
          group.add(outer);
        } else {
          // Crisp low-glare outer ring + soft filling interior
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(Math.max(0.2, tel.radius - 0.28), tel.radius, 32),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.62,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.09;

          fill = new THREE.Mesh(
            new THREE.CircleGeometry(tel.radius, 32),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.15,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          fill.rotation.x = -Math.PI / 2;
          fill.position.y = 0.11;
          group.add(ring, fill);

          // 3D Spinning Sand Tornado Funnel for Azirath & Khepri's Burza Piaskowa!
          if (tel.abilityId === 'burza_piaskowa') {
            const funnel = new THREE.Group();
            funnel.name = 'tornado_funnel';
            for (let f = 0; f < 4; f++) {
              const seg = new THREE.Mesh(
                new THREE.TorusGeometry(0.65 + f * 0.45, 0.22, 6, 14),
                createToonMaterial('#c99443', { transparent: true, opacity: 0.62, steps: 3 })
              );
              seg.rotation.x = Math.PI / 2;
              seg.position.y = 0.7 + f * 0.95;
              funnel.add(seg);
            }
            group.add(funnel);
          }
        }

        this.scene.add(group);
        entry = { group, fill };
        this.telegraphMeshes.set(tel.id, entry);
      }

      entry.group.position.set(tel.x, 0, tel.z);
      const funnel = entry.group.getObjectByName('tornado_funnel');
      if (funnel) {
        funnel.rotation.y = serverNow * 0.009;
      }
      if (tel.angle !== undefined && (tel.shape === 'line' || tel.shape === 'beam')) {
        entry.group.rotation.y = -tel.angle;
      }

      const totalCharge = Math.max(100, tel.triggerAt - tel.createdAt);
      const pct = Math.max(0.05, Math.min(1, (serverNow - tel.createdAt) / totalCharge));

      if (tel.shape === 'circle' || tel.shape === 'cone' || tel.shape === 'arena_chaos') {
        entry.fill.scale.set(pct, pct, 1);
      } else if (tel.shape === 'ring' && tel.abilityId === 'pierscien_lawy') {
        const s = tel.radius / 2.5;
        entry.fill.scale.set(s, s, 1);
      }
    }
  }

  public syncLootBeams(lootList: GroundLoot[], elapsedSec: number) {
    const activeIds = new Set(lootList.map((l) => l.id));

    for (const [id, vis] of this.lootVisuals.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(vis.group);
        this.lootVisuals.delete(id);
      }
    }

    for (const drop of lootList) {
      let vis = this.lootVisuals.get(drop.id);
      if (!vis) {
        const group = new THREE.Group();
        group.position.set(drop.x, 0, drop.z);
        group.add(createContactShadow(0.55, 0.36));

        let beamColor = '#cbd5e1';
        let beamHeight = 5.5;
        let beamRadius = 0.2;
        let maxOpacity = 0.22;
        let rarity: Rarity | undefined;

        if (drop.runeShard) {
          const runeDef = RUNES[drop.runeShard];
          beamColor = runeDef.color;
          beamHeight = 14.5;
          beamRadius = 0.42;
          maxOpacity = 0.36;
        } else if (drop.item) {
          rarity = drop.item.rarity;
          const meta = RARITY_META[rarity];
          beamColor = meta.beamColor;
          const heightMap: Record<Rarity, number> = {
            zwykly: 4.5,
            normalny: 7.0,
            mityczny: 10.0,
            legendarny: 14.5,
            boski: 21.0,
            niesmiertelny: 26.0,
          };
          const radMap: Record<Rarity, number> = {
            zwykly: 0.14,
            normalny: 0.2,
            mityczny: 0.28,
            legendarny: 0.38,
            boski: 0.56,
            niesmiertelny: 0.72,
          };
          const opMap: Record<Rarity, number> = {
            zwykly: 0.18,
            normalny: 0.22,
            mityczny: 0.28,
            legendarny: 0.34,
            boski: 0.42,
            niesmiertelny: 0.52,
          };
          beamHeight = heightMap[rarity];
          beamRadius = radMap[rarity];
          maxOpacity = opMap[rarity];
        }

        // Smooth vertically fading ethereal beam (NO neon glare!)
        const beamMat = createSoftBeamMaterial(beamColor, maxOpacity);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(beamRadius * 0.22, beamRadius, beamHeight, 12, 1, true),
          beamMat
        );
        beam.position.y = beamHeight / 2;

        const gem = createComicMesh(
          drop.runeShard
            ? createSoftStarGeometry(0.46, 0.24, 5, 0.18)
            : createRoundedBoxGeometry(0.56, 0.46, 0.46, 0.16, 4),
          beamColor,
          0.028,
          { emissive: beamColor, emissiveIntensity: 0.3 }
        );
        gem.position.y = 0.68;

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.68, 0.94, 20),
          new THREE.MeshBasicMaterial({
            color: beamColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;

        group.add(beam, gem, ring);
        this.scene.add(group);
        vis = { group, beamMat, gem, ring, rarity };
        this.lootVisuals.set(drop.id, vis);
      }

      vis.gem.rotation.y = elapsedSec * 2.2;
      vis.gem.position.y = 0.65 + Math.sin(elapsedSec * 4.0) * 0.14;
      vis.ring.rotation.z = -elapsedSec * 1.5;

      if (vis.rarity === 'boski' || vis.rarity === 'niesmiertelny') {
        const hue = vis.rarity === 'niesmiertelny' ? 0.46 + Math.sin(elapsedSec * 2.6) * 0.08 : (elapsedSec * 0.42) % 1;
        (vis.beamMat.uniforms.uColor.value as THREE.Color).setHSL(hue, 0.85, 0.58);
        (vis.ring.material as THREE.MeshBasicMaterial).color.setHSL((hue + 0.18) % 1, 0.85, 0.62);
      }
    }
  }

  public update() {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastUpdateMs) / 1000));
    this.lastUpdateMs = now;

    for (let i = this.transientEffects.length - 1; i >= 0; i--) {
      const ef = this.transientEffects[i];
      if (now < ef.createdAt) continue;
      const t = (now - ef.createdAt) / ef.durationMs;
      if (t >= 1) {
        this.scene.remove(ef.mesh);
        this.transientEffects.splice(i, 1);
      } else {
        ef.onUpdate(t, dt);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const t = (now - p.createdAt) / p.durationMs;
      if (t >= 1) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy -= p.gravity * dt;

      p.mesh.position.x += p.vx * dt + (p.sway ? Math.sin(t * 10 + i) * 0.6 * dt : 0);
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rotSpeedX * dt;
      p.mesh.rotation.y += p.rotSpeedY * dt;

      // Smooth comic puff scale-in then shrink-out
      const sizeCurve = t < 0.18 ? 0.5 + (t / 0.18) * 0.6 : 1.1 * (1 - (t - 0.18) / 0.82);
      p.mesh.scale.setScalar(Math.max(0.02, p.baseScale * sizeCurve));
      const mat = p.mesh.material as THREE.Material & { opacity: number };
      mat.opacity = p.startOpacity * (1 - t);
    }
  }
}

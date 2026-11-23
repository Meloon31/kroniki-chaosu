import * as THREE from 'three';
import { RARITY_META } from '../../shared/items';
import { RUNES } from '../../shared/runes';
import type { GroundLoot, Rarity, SkillVfxEvent, TelegraphZone } from '../../shared/types';
import {
  createComicMesh,
  createContactShadow,
  createPlushLathe,
  createRoundedBoxGeometry,
  createRunicCircleTexture,
  createSoftBeamMaterial,
  createSoftStarGeometry,
  createToonMaterial,
} from './ComicMaterials';

interface TransientEffect {
  mesh: THREE.Object3D;
  createdAt: number;
  durationMs: number;
  onUpdate: (t: number, dt: number) => void;
  onDone?: () => void;
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

const SHARED_SMOKE_GEO = new THREE.SphereGeometry(0.32, 14, 12);
const SHARED_SHARD_GEO = new THREE.SphereGeometry(0.22, 12, 10);
const SHARED_LEAF_GEO = new THREE.CircleGeometry(0.2, 12);
const SHARED_SPARK_GEO = new THREE.CapsuleGeometry(0.06, 0.34, 8, 10);
const SHARED_STAR_GEO = createSoftStarGeometry(0.22, 0.1, 4, 0.045);

export class EffectsManager {
  private scene: THREE.Scene;
  private transientEffects: TransientEffect[] = [];
  private particles: ComicParticle[] = [];
  private telegraphMeshes = new Map<string, { group: THREE.Group; fill: THREE.Mesh }>();
  private lootVisuals = new Map<string, LootVisual>();
  private activeFlashLights = 0;
  private lastUpdateMs = performance.now();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clearAll() {
    for (const ef of this.transientEffects) this.scene.remove(ef.mesh);
    this.transientEffects = [];
    this.activeFlashLights = 0;

    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles = [];

    for (const tm of this.telegraphMeshes.values()) this.scene.remove(tm.group);
    this.telegraphMeshes.clear();

    for (const lv of this.lootVisuals.values()) this.scene.remove(lv.group);
    this.lootVisuals.clear();
  }

  public spawnParticles(options: {
    kind: 'smoke' | 'shard' | 'leaf' | 'spark' | 'star';
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
    if (this.particles.length > 280) return;

    const now = performance.now();
    const geo =
      options.kind === 'smoke'
        ? SHARED_SMOKE_GEO
        : options.kind === 'shard'
          ? SHARED_SHARD_GEO
          : options.kind === 'leaf'
            ? SHARED_LEAF_GEO
            : options.kind === 'star'
              ? SHARED_STAR_GEO
              : SHARED_SPARK_GEO;

    const startOpacity = options.opacity ?? (options.kind === 'smoke' ? 0.65 : 0.85);

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
    maxOpacity = 0.56,
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
      new THREE.RingGeometry(Math.max(0.1, 1 - thickness), 1.0, 36),
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
        const eased = 1 - Math.pow(1 - t, 2.3);
        const s = 0.35 + eased * maxRadius;
        ring.scale.set(s, s, 1);
        ringMat.opacity = (1 - t) * maxOpacity;
      },
    });
  }

  private addRunicBurst(
    x: number,
    z: number,
    maxRadius: number,
    colorHex: string,
    durationMs: number,
    maxOpacity = 0.68,
    spinSpeed = 1.8
  ) {
    const now = performance.now();
    const mat = new THREE.MeshBasicMaterial({
      map: createRunicCircleTexture(colorHex),
      transparent: true,
      opacity: maxOpacity,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.12, z);
    this.scene.add(plane);

    this.transientEffects.push({
      mesh: plane,
      createdAt: now,
      durationMs,
      onUpdate: (t) => {
        const pop = t < 0.18 ? 0.35 + (t / 0.18) * 0.65 : 1 + (t - 0.18) * 0.16;
        const s = maxRadius * pop;
        plane.scale.set(s, s, 1);
        plane.rotation.z = t * spinSpeed;
        mat.opacity = t < 0.15 ? (t / 0.15) * maxOpacity : (1 - (t - 0.15) / 0.85) * maxOpacity;
      },
    });
  }

  private addFlashLight(
    x: number,
    y: number,
    z: number,
    color: THREE.ColorRepresentation,
    intensity = 3.2,
    distance = 12,
    durationMs = 260
  ) {
    if (this.activeFlashLights >= 3) return;
    this.activeFlashLights++;
    const now = performance.now();
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(x, y, z);
    this.scene.add(light);

    this.transientEffects.push({
      mesh: light,
      createdAt: now,
      durationMs,
      onUpdate: (t) => {
        light.intensity = intensity * Math.pow(1 - t, 1.8);
      },
      onDone: () => {
        this.activeFlashLights = Math.max(0, this.activeFlashLights - 1);
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
        // Triple-layered sweeping comic sword crescent: dark ink rim + fiery core + bright white-gold razor edge!
        const isRift = ev.kind === 'boss_rift_slash';
        const arcGroup = new THREE.Group();
        arcGroup.position.set(ev.x, 1.15, ev.z);
        arcGroup.rotation.y = yaw - Math.PI * 0.48;

        const outerMat = new THREE.MeshBasicMaterial({
          color: isRift ? '#4c0519' : '#2a1222',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        });
        const outerArc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.48, radius * 1.08, 32, 1, 0, Math.PI * 0.96),
          outerMat
        );
        outerArc.rotation.x = -Math.PI / 2;

        const midMat = new THREE.MeshBasicMaterial({
          color: isRift ? '#f43f5e' : '#f97316',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        const midArc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.56, radius * 1.0, 32, 1, 0.04, Math.PI * 0.88),
          midMat
        );
        midArc.rotation.x = -Math.PI / 2;
        midArc.position.y = 0.03;

        const edgeMat = new THREE.MeshBasicMaterial({
          color: isRift ? '#fda4af' : '#fef08a',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const edgeArc = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.84, radius * 0.99, 32, 1, 0.08, Math.PI * 0.78),
          edgeMat
        );
        edgeArc.rotation.x = -Math.PI / 2;
        edgeArc.position.y = 0.06;

        arcGroup.add(outerArc, midArc, edgeArc);
        this.scene.add(arcGroup);

        this.transientEffects.push({
          mesh: arcGroup,
          createdAt: now,
          durationMs: 280,
          onUpdate: (t) => {
            arcGroup.rotation.y = yaw - Math.PI * 0.62 + t * 1.55;
            const sc = 0.88 + t * 0.24;
            arcGroup.scale.set(sc, 1, sc);
            outerMat.opacity = (1 - t) * 0.7;
            midMat.opacity = (1 - t) * 0.82;
            edgeMat.opacity = (1 - t) * 0.92;
          },
        });

        this.spawnParticles({
          kind: 'spark',
          x: ev.x + Math.sin(yaw) * (radius * 0.6),
          y: 1.05,
          z: ev.z + Math.cos(yaw) * (radius * 0.6),
          count: 9,
          color: isRift ? '#fb7185' : '#fde047',
          speedMin: 3.0,
          speedMax: 7.2,
          upMin: 1.0,
          upMax: 3.4,
          durationMs: 320,
          opacity: 0.88,
        });
        this.spawnParticles({
          kind: 'star',
          x: ev.x + Math.sin(yaw) * (radius * 0.7),
          y: 1.15,
          z: ev.z + Math.cos(yaw) * (radius * 0.7),
          count: 4,
          color: isRift ? '#fda4af' : '#fef08a',
          speedMin: 1.8,
          speedMax: 4.5,
          upMin: 1.4,
          upMax: 3.2,
          scale: 0.85,
          durationMs: 340,
          opacity: 0.9,
        });
        break;
      }

      case 'whirlwind': {
        // Multi-tiered blazing comic blade vortex + glowing runic ground swirl + flying sparks!
        const group = new THREE.Group();
        group.position.set(ev.x, 0.95, ev.z);
        const bladeMat = new THREE.MeshBasicMaterial({
          color: '#f97316',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.68,
          depthWrite: false,
        });
        const highlightMat = new THREE.MeshBasicMaterial({
          color: '#fef08a',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        });
        for (let i = 0; i < 3; i++) {
          const arc = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.58, radius * 1.02, 28, 1, (i * Math.PI * 2) / 3, Math.PI * 0.56),
            bladeMat
          );
          arc.rotation.x = -Math.PI / 2;
          arc.position.y = i * 0.24;
          group.add(arc);

          const rim = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.88, radius * 1.03, 28, 1, (i * Math.PI * 2) / 3 + 0.05, Math.PI * 0.46),
            highlightMat
          );
          rim.rotation.x = -Math.PI / 2;
          rim.position.y = i * 0.24 + 0.03;
          group.add(rim);
        }
        this.scene.add(group);
        const dur = ev.duration ?? 2100;
        this.addRunicBurst(ev.x, ev.z, radius * 1.05, '#f97316', Math.min(dur, 1200), 0.52, 4.2);
        this.transientEffects.push({
          mesh: group,
          createdAt: now,
          durationMs: dur,
          onUpdate: (t) => {
            group.rotation.y = t * 28;
            const fade = t > 0.82 ? (1 - t) / 0.18 : 1;
            bladeMat.opacity = fade * 0.68;
            highlightMat.opacity = fade * 0.78;
          },
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 0.9,
          z: ev.z,
          count: 14,
          color: '#fbbf24',
          spreadRadius: radius * 0.8,
          speedMin: 2.5,
          speedMax: 6.2,
          upMin: 1.2,
          upMax: 3.8,
          durationMs: 560,
          opacity: 0.85,
        });
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.3,
          z: ev.z,
          count: 10,
          color: '#a89f91',
          spreadRadius: radius * 0.75,
          speedMin: 1.2,
          speedMax: 2.8,
          upMin: 0.5,
          upMax: 1.8,
          durationMs: 650,
          opacity: 0.46,
        });
        break;
      }

      case 'charge': {
        this.spawnFootstepDust(ev.x, ev.z, '#c7b8a1', true);
        if (ev.tx !== undefined && ev.tz !== undefined) {
          this.addRunicBurst(ev.tx, ev.tz, radius * 1.05, '#fbbf24', 440, 0.62, 2.4);
          this.addExpandingRing(ev.tx, ev.tz, radius * 1.15, '#fef08a', 380, 0.66, 0.2);
          this.addFlashLight(ev.tx, 1.4, ev.tz, '#fbbf24', 2.8, 10, 240);
          this.spawnParticles({
            kind: 'shard',
            x: ev.tx,
            y: 0.4,
            z: ev.tz,
            count: 10,
            color: '#c7b8a1',
            speedMin: 2.8,
            speedMax: 6.2,
            upMin: 3.0,
            upMax: 6.0,
            durationMs: 520,
          });
          this.spawnParticles({
            kind: 'star',
            x: ev.tx,
            y: 1.0,
            z: ev.tz,
            count: 7,
            color: '#fde047',
            speedMin: 2.0,
            speedMax: 5.0,
            upMin: 1.5,
            upMax: 4.0,
            durationMs: 420,
          });
        }
        break;
      }

      case 'shadow_orb': {
        // High-smooth void orb w/ dual orbiting arcane rings + runic explosion & purple impact light!
        const orbGroup = new THREE.Group();
        const core = createComicMesh(new THREE.SphereGeometry(0.46, 22, 18), '#3b0764', 0.03, {
          emissive: '#9333ea',
          emissiveIntensity: 0.44,
        });
        const ringA = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.065, 10, 26),
          new THREE.MeshBasicMaterial({ color: '#e879f9', transparent: true, opacity: 0.85 })
        );
        ringA.rotation.x = Math.PI / 3;
        const ringB = new THREE.Mesh(
          new THREE.TorusGeometry(0.58, 0.055, 10, 24),
          new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.78 })
        );
        ringB.rotation.y = Math.PI / 3;
        const haloMat = new THREE.MeshBasicMaterial({
          color: '#a855f7',
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
        });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.76, 18, 14), haloMat);
        orbGroup.add(core, ringA, ringB, halo);
        orbGroup.position.set(ev.x, 1.35, ev.z);
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
            orbGroup.rotation.y = t * 14;
            orbGroup.rotation.x = t * 9;
            const sc = t > 0.78 ? 1 + (t - 0.78) * 4.2 : 1;
            orbGroup.scale.setScalar(sc);
            haloMat.opacity = (1 - t) * 0.4;
          },
        });

        this.addRunicBurst(tx, tz, Math.min(radius * 1.15, 3.8), '#c084fc', 460, 0.68, -2.5);
        this.addExpandingRing(tx, tz, Math.min(radius, 3.4), '#e879f9', 360, 0.62, 0.2);
        this.addFlashLight(tx, 1.6, tz, '#c084fc', 3.0, 11, 260);
        this.spawnParticles({
          kind: 'star',
          x: tx,
          y: 1.0,
          z: tz,
          count: 9,
          color: '#f0abfc',
          speedMin: 2.2,
          speedMax: 5.4,
          upMin: 1.4,
          upMax: 3.8,
          scale: 0.9,
          durationMs: 480,
        });
        this.spawnParticles({
          kind: 'smoke',
          x: tx,
          y: 0.7,
          z: tz,
          count: 8,
          color: '#581c87',
          speedMin: 1.2,
          speedMax: 3.4,
          upMin: 0.6,
          upMax: 2.2,
          scale: 0.95,
          durationMs: 520,
          opacity: 0.56,
        });
        break;
      }

      case 'meteor':
      case 'boss_obsidian_rain': {
        // Blazing comic comet-tailed magma meteors + runic ground crater + fiery impact light!
        const isObsidian = ev.kind === 'boss_obsidian_rain';
        const rockCount = isObsidian ? 1 : 3;
        for (let m = 0; m < rockCount; m++) {
          const ox = m === 0 ? 0 : (Math.random() - 0.5) * radius * 0.9;
          const oz = m === 0 ? 0 : (Math.random() - 0.5) * radius * 0.9;
          const meteorGroup = new THREE.Group();
          const rock = createComicMesh(
            new THREE.SphereGeometry(radius * (isObsidian ? 0.36 : 0.28), 18, 14),
            '#3a2433',
            0.036,
            { emissive: '#ef4444', emissiveIntensity: 0.46 }
          );
          const tail = new THREE.Mesh(
            createPlushLathe(
              [
                [0.01, 0],
                [radius * 0.24, 0.35],
                [radius * 0.16, 1.45],
                [0.04, 2.55],
                [0.01, 2.85],
              ],
              14
            ),
            new THREE.MeshBasicMaterial({
              color: '#fb923c',
              transparent: true,
              opacity: 0.76,
              depthWrite: false,
            })
          );
          tail.rotation.z = 0.28;
          tail.rotation.x = -0.18;
          meteorGroup.add(rock, tail);

          const startX = ev.x + ox - 3.8;
          const startZ = ev.z + oz - 2.2;
          meteorGroup.position.set(startX, 12 + m * 2.5, startZ);
          this.scene.add(meteorGroup);

          this.transientEffects.push({
            mesh: meteorGroup,
            createdAt: now + m * 95,
            durationMs: 360,
            onUpdate: (t) => {
              const ct = Math.max(0, t);
              meteorGroup.position.x = THREE.MathUtils.lerp(startX, ev.x + ox, ct);
              meteorGroup.position.z = THREE.MathUtils.lerp(startZ, ev.z + oz, ct);
              meteorGroup.position.y = Math.max(0.3, (12 + m * 2.5) * (1 - ct * ct));
              rock.rotation.x = ct * 8;
              rock.rotation.z = ct * 6;
              if (ct > 0.84) meteorGroup.scale.setScalar(Math.max(0.05, 1 - (ct - 0.84) * 5.5));
            },
          });
        }

        this.addRunicBurst(ev.x, ev.z, radius * 1.12, '#f97316', 580, 0.72, 2.2);
        this.addExpandingRing(ev.x, ev.z, radius * 1.15, '#ef4444', 480, 0.68, 0.24);
        this.addExpandingRing(ev.x, ev.z, radius * 0.75, '#fde047', 380, 0.72, 0.16);
        this.addFlashLight(ev.x, 2.0, ev.z, '#f97316', 4.2, 16, 340);
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.35,
          z: ev.z,
          count: 12,
          color: '#453b3a',
          spreadRadius: radius * 0.55,
          speedMin: 1.5,
          speedMax: 4.2,
          upMin: 1.4,
          upMax: 3.6,
          scale: 1.2,
          durationMs: 700,
          opacity: 0.58,
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 0.6,
          z: ev.z,
          count: 16,
          color: '#fb923c',
          speedMin: 3.4,
          speedMax: 7.8,
          upMin: 2.6,
          upMax: 6.4,
          durationMs: 460,
          opacity: 0.88,
        });
        this.spawnParticles({
          kind: 'star',
          x: ev.x,
          y: 0.8,
          z: ev.z,
          count: 8,
          color: '#fef08a',
          speedMin: 2.4,
          speedMax: 6.0,
          upMin: 2.0,
          upMax: 5.0,
          durationMs: 440,
        });
        break;
      }

      case 'soul_drain': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        this.addRunicBurst(tx, tz, radius * 1.05, '#a855f7', 540, 0.66, -2.6);
        this.addExpandingRing(tx, tz, radius, '#e879f9', 460, 0.56, 0.2);
        this.addFlashLight(tx, 1.5, tz, '#a855f7', 2.6, 11, 280);
        this.spawnParticles({
          kind: 'star',
          x: tx,
          y: 0.8,
          z: tz,
          count: 12,
          color: '#e879f9',
          spreadRadius: radius * 0.65,
          speedMin: 0.8,
          speedMax: 2.4,
          upMin: 2.0,
          upMax: 4.2,
          gravity: -0.9,
          scale: 0.85,
          durationMs: 620,
          opacity: 0.86,
        });
        break;
      }

      case 'magic_arrow':
      case 'volley_backflip': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const arrows = ev.kind === 'volley_backflip' ? 5 : 1;
        const tipGeo = createPlushLathe(
          [
            [0.01, -0.18],
            [0.14, -0.12],
            [0.11, 0.08],
            [0.03, 0.24],
            [0.01, 0.28],
          ],
          14
        );
        for (let a = 0; a < arrows; a++) {
          const spread = arrows === 1 ? 0 : (a - 2) * 0.2;
          const dist = Math.max(2, Math.hypot(dx, dz));
          const ang = yaw + spread;
          const endX = ev.x + Math.sin(ang) * dist;
          const endZ = ev.z + Math.cos(ang) * dist;

          const arrowGroup = new THREE.Group();
          const shaft = createComicMesh(new THREE.CapsuleGeometry(0.048, 1.35, 8, 12), '#10b981', 0.016, {
            emissive: '#059669',
            emissiveIntensity: 0.34,
          });
          shaft.rotation.x = Math.PI / 2;
          const head = createComicMesh(tipGeo, '#6ee7b7', 0.018, {
            emissive: '#34d399',
            emissiveIntensity: 0.45,
          });
          head.rotation.x = Math.PI / 2;
          head.position.z = 0.78;
          const streak = new THREE.Mesh(
            new THREE.PlaneGeometry(0.32, 2.2),
            new THREE.MeshBasicMaterial({
              color: '#a7f3d0',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.56,
              depthWrite: false,
            })
          );
          streak.rotation.x = -Math.PI / 2;
          streak.position.z = -0.65;
          arrowGroup.add(shaft, head, streak);
          arrowGroup.position.set(ev.x, 1.32, ev.z);
          arrowGroup.rotation.y = ang;
          this.scene.add(arrowGroup);

          this.transientEffects.push({
            mesh: arrowGroup,
            createdAt: now,
            durationMs: 215,
            onUpdate: (t) => {
              arrowGroup.position.x = THREE.MathUtils.lerp(ev.x, endX, t);
              arrowGroup.position.z = THREE.MathUtils.lerp(ev.z, endZ, t);
            },
          });
        }
        this.addExpandingRing(tx, tz, arrows > 1 ? 2.4 : 1.4, '#34d399', 260, 0.54, 0.22);
        this.spawnParticles({
          kind: 'leaf',
          x: tx,
          y: 1.0,
          z: tz,
          count: arrows > 1 ? 12 : 7,
          color: '#34d399',
          speedMin: 1.4,
          speedMax: 3.8,
          upMin: 1.0,
          upMax: 2.8,
          durationMs: 560,
          opacity: 0.82,
        });
        this.spawnParticles({
          kind: 'star',
          x: tx,
          y: 1.1,
          z: tz,
          count: arrows > 1 ? 8 : 4,
          color: '#a7f3d0',
          speedMin: 1.6,
          speedMax: 4.2,
          upMin: 1.2,
          upMax: 3.2,
          scale: 0.75,
          durationMs: 360,
        });
        break;
      }

      case 'wind_blade': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const windGroup = new THREE.Group();
        windGroup.position.set(ev.x, 1.18, ev.z);

        const outerMat = new THREE.MeshBasicMaterial({
          color: '#0e7490',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        });
        const outer = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 2.35, 28, 1, -Math.PI * 0.42, Math.PI * 0.84),
          outerMat
        );
        outer.rotation.x = -Math.PI / 2;
        outer.rotation.z = -yaw + Math.PI / 2;

        const coreMat = new THREE.MeshBasicMaterial({
          color: '#5eead4',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        const core = new THREE.Mesh(
          new THREE.RingGeometry(1.45, 2.25, 28, 1, -Math.PI * 0.36, Math.PI * 0.72),
          coreMat
        );
        core.rotation.x = -Math.PI / 2;
        core.rotation.z = -yaw + Math.PI / 2;
        core.position.y = 0.04;

        windGroup.add(outer, core);
        this.scene.add(windGroup);

        this.transientEffects.push({
          mesh: windGroup,
          createdAt: now,
          durationMs: 320,
          onUpdate: (t) => {
            windGroup.position.x = THREE.MathUtils.lerp(ev.x, tx, t);
            windGroup.position.z = THREE.MathUtils.lerp(ev.z, tz, t);
            windGroup.scale.setScalar(1 + t * 0.55);
            outerMat.opacity = (1 - t) * 0.65;
            coreMat.opacity = (1 - t) * 0.82;
          },
        });

        this.spawnParticles({
          kind: 'leaf',
          x: (ev.x + tx) / 2,
          y: 1.0,
          z: (ev.z + tz) / 2,
          count: 12,
          color: '#5eead4',
          spreadRadius: 2.0,
          speedMin: 1.2,
          speedMax: 3.6,
          durationMs: 640,
          opacity: 0.8,
        });
        this.spawnParticles({
          kind: 'star',
          x: tx,
          y: 1.1,
          z: tz,
          count: 6,
          color: '#ccfbf1',
          speedMin: 1.5,
          speedMax: 4.0,
          durationMs: 380,
        });
        break;
      }

      case 'hammer_slam':
      case 'earthquake':
      case 'boss_leap_slam':
      case 'boss_burrow': {
        // Dramatic runic seismic impact + erupting cel-shaded rock spires + warm flash light!
        const rockColor = ev.kind === 'boss_burrow' ? '#d49a45' : '#78716c';
        const ringColor = ev.kind === 'boss_leap_slam' ? '#34d399' : '#f59e0b';
        this.addRunicBurst(ev.x, ev.z, radius * 1.12, ringColor, 560, 0.72, 1.5);
        this.addExpandingRing(ev.x, ev.z, radius * 1.18, ringColor, 480, 0.66, 0.22);
        this.addExpandingRing(ev.x, ev.z, radius * 0.78, '#fef08a', 380, 0.65, 0.14);
        this.addFlashLight(ev.x, 1.8, ev.z, ringColor, 3.6, 14, 300);

        // Ring of 6 plush comic stone pillars erupting & sinking cleanly
        const spireGroup = new THREE.Group();
        spireGroup.position.set(ev.x, 0, ev.z);
        const rockSpireGeo = createPlushLathe(
          [
            [0.01, 0],
            [0.44, 0.12],
            [0.36, 0.95],
            [0.14, 1.55],
            [0.01, 1.72],
          ],
          14
        );
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const sp = createComicMesh(rockSpireGeo, rockColor, 0.028, {
            emissive: ringColor,
            emissiveIntensity: 0.18,
          });
          sp.position.set(Math.cos(a) * radius * 0.62, 0, Math.sin(a) * radius * 0.62);
          sp.rotation.z = -Math.cos(a) * 0.25;
          sp.rotation.x = Math.sin(a) * 0.25;
          spireGroup.add(sp);
        }
        this.scene.add(spireGroup);
        this.transientEffects.push({
          mesh: spireGroup,
          createdAt: now,
          durationMs: 480,
          onUpdate: (t) => {
            const lift = t < 0.2 ? t / 0.2 : t > 0.65 ? (1 - t) / 0.35 : 1;
            spireGroup.scale.set(1, Math.max(0.04, lift), 1);
          },
        });

        this.spawnParticles({
          kind: 'shard',
          x: ev.x,
          y: 0.35,
          z: ev.z,
          count: 14,
          color: rockColor,
          spreadRadius: radius * 0.5,
          speedMin: 2.4,
          speedMax: 6.2,
          upMin: 3.8,
          upMax: 7.4,
          scale: 1.15,
          durationMs: 580,
          opacity: 0.9,
        });
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 10,
          color: '#fde047',
          spreadRadius: radius * 0.45,
          speedMin: 2.8,
          speedMax: 6.5,
          upMin: 2.2,
          upMax: 5.5,
          durationMs: 420,
        });
        this.spawnParticles({
          kind: 'smoke',
          x: ev.x,
          y: 0.3,
          z: ev.z,
          count: 10,
          color: '#9c9284',
          spreadRadius: radius * 0.65,
          speedMin: 1.5,
          speedMax: 3.8,
          upMin: 0.7,
          upMax: 2.2,
          scale: 1.15,
          durationMs: 640,
          opacity: 0.52,
        });
        break;
      }

      case 'radiant_bolt': {
        const tx = ev.tx ?? ev.x;
        const tz = ev.tz ?? ev.z;
        const boltGroup = new THREE.Group();
        const star = createComicMesh(createSoftStarGeometry(0.36, 0.18, 5, 0.11), '#fde047', 0.02, {
          emissive: '#f59e0b',
          emissiveIntensity: 0.44,
        });
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.46, 0.045, 10, 22),
          new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.8 })
        );
        ring.rotation.x = Math.PI / 2;
        boltGroup.add(star, ring);
        boltGroup.position.set(ev.x, 1.38, ev.z);
        this.scene.add(boltGroup);
        this.transientEffects.push({
          mesh: boltGroup,
          createdAt: now,
          durationMs: 230,
          onUpdate: (t) => {
            boltGroup.position.x = THREE.MathUtils.lerp(ev.x, tx, t);
            boltGroup.position.z = THREE.MathUtils.lerp(ev.z, tz, t);
            boltGroup.rotation.y = t * 16;
          },
        });
        this.addRunicBurst(tx, tz, Math.min(radius, 2.8), '#fde047', 380, 0.62, 2.8);
        this.addFlashLight(tx, 1.5, tz, '#fde047', 2.4, 9, 220);
        this.spawnParticles({
          kind: 'star',
          x: tx,
          y: 1.15,
          z: tz,
          count: 9,
          color: '#fef08a',
          speedMin: 1.8,
          speedMax: 4.5,
          upMin: 1.2,
          upMax: 3.4,
          durationMs: 420,
          opacity: 0.9,
        });
        break;
      }

      case 'heal_wave': {
        // Lush fairy emerald-gold runic sanctuary + soft rising blessing pillar + fluttering petals & stars!
        const rad = Math.min(radius, 10);
        this.addRunicBurst(ev.x, ev.z, rad, '#34d399', 760, 0.68, 1.4);
        this.addExpandingRing(ev.x, ev.z, rad * 1.05, '#86efac', 580, 0.56, 0.14);
        this.addFlashLight(ev.x, 2.0, ev.z, '#4ade80', 3.0, 14, 380);

        const beamMat = createSoftBeamMaterial('#4ade80', 0.32);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.45, rad * 0.58, 5.5, 24, 1, true), beamMat);
        pillar.position.set(ev.x, 2.75, ev.z);
        this.scene.add(pillar);
        this.transientEffects.push({
          mesh: pillar,
          createdAt: now,
          durationMs: 640,
          onUpdate: (t) => {
            pillar.rotation.y = t * 2.2;
            (beamMat.uniforms.uOpacity as { value: number }).value = (1 - t) * 0.34;
          },
        });

        this.spawnParticles({
          kind: 'leaf',
          x: ev.x,
          y: 0.5,
          z: ev.z,
          count: 18,
          color: '#4ade80',
          spreadRadius: 4.8,
          speedMin: 0.6,
          speedMax: 2.2,
          upMin: 1.8,
          upMax: 3.8,
          gravity: -0.7,
          durationMs: 820,
          opacity: 0.78,
        });
        this.spawnParticles({
          kind: 'star',
          x: ev.x,
          y: 0.7,
          z: ev.z,
          count: 12,
          color: '#fef08a',
          spreadRadius: 4.0,
          speedMin: 0.5,
          speedMax: 1.8,
          upMin: 2.0,
          upMax: 4.2,
          gravity: -0.8,
          scale: 0.9,
          durationMs: 760,
          opacity: 0.88,
        });
        break;
      }

      case 'light_barrier': {
        // Shimmering celestial azure-gold sanctuary seal + orbiting crystal shield petals + stars!
        const rad = Math.min(radius, 10);
        this.addRunicBurst(ev.x, ev.z, rad, '#38bdf8', 740, 0.66, -1.6);
        this.addExpandingRing(ev.x, ev.z, rad * 1.05, '#bae6fd', 560, 0.58, 0.14);
        this.addFlashLight(ev.x, 2.0, ev.z, '#38bdf8', 3.0, 14, 360);

        const shieldCrown = new THREE.Group();
        shieldCrown.position.set(ev.x, 1.35, ev.z);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const petal = createComicMesh(createSoftStarGeometry(0.28, 0.14, 4, 0.08), '#7dd3fc', 0.016, {
            emissive: '#38bdf8',
            emissiveIntensity: 0.42,
          });
          petal.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
          shieldCrown.add(petal);
        }
        this.scene.add(shieldCrown);
        this.transientEffects.push({
          mesh: shieldCrown,
          createdAt: now,
          durationMs: 680,
          onUpdate: (t) => {
            shieldCrown.rotation.y = t * 4.5;
            shieldCrown.position.y = 1.1 + t * 1.4;
            const sc = 0.6 + t * 1.15;
            shieldCrown.scale.setScalar(sc * (1 - Math.max(0, t - 0.65) * 2.2));
          },
        });

        this.spawnParticles({
          kind: 'star',
          x: ev.x,
          y: 0.7,
          z: ev.z,
          count: 14,
          color: '#bae6fd',
          spreadRadius: 4.2,
          speedMin: 0.8,
          speedMax: 2.4,
          upMin: 1.6,
          upMax: 3.4,
          gravity: -0.5,
          scale: 0.8,
          durationMs: 700,
          opacity: 0.82,
        });
        break;
      }

      case 'boss_bone_wave': {
        // Smooth plush ivory bone-spears erupting along line (ZERO low-poly 5-sided cones!)
        const group = new THREE.Group();
        const dist = Math.max(4, Math.min(16, Math.hypot(dx, dz)));
        const dirX = dx / (Math.hypot(dx, dz) || 1);
        const dirZ = dz / (Math.hypot(dx, dz) || 1);
        const boneSpireGeo = createPlushLathe(
          [
            [0.01, 0],
            [0.46, 0.2],
            [0.36, 1.25],
            [0.14, 2.05],
            [0.01, 2.3],
          ],
          16
        );
        for (let i = 1; i <= 7; i++) {
          const sp = createComicMesh(boneSpireGeo, '#eef2f7', 0.032, {
            emissive: '#34d399',
            emissiveIntensity: 0.16,
          });
          sp.position.set(ev.x + dirX * (i * (dist / 7)), 0, ev.z + dirZ * (i * (dist / 7)));
          group.add(sp);
        }
        this.scene.add(group);
        this.transientEffects.push({
          mesh: group,
          createdAt: now,
          durationMs: 540,
          onUpdate: (t) => {
            const lift = t < 0.22 ? t / 0.22 : t > 0.68 ? (1 - t) / 0.32 : 1;
            group.scale.set(1, Math.max(0.05, lift), 1);
          },
        });
        break;
      }

      case 'boss_thorn_nova': {
        const group = new THREE.Group();
        group.position.set(ev.x, 1.1, ev.z);
        const darts: THREE.Mesh[] = [];
        const thornGeo = createPlushLathe(
          [
            [0.01, -0.45],
            [0.24, -0.2],
            [0.16, 0.25],
            [0.04, 0.58],
            [0.01, 0.65],
          ],
          14
        );
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const sp = createComicMesh(thornGeo, '#a855f7', 0.024, {
            emissive: '#7c3aed',
            emissiveIntensity: 0.32,
          });
          sp.rotation.z = -Math.PI / 2;
          sp.rotation.y = -a;
          sp.userData = { dx: Math.cos(a), dz: Math.sin(a) };
          group.add(sp);
          darts.push(sp);
        }
        this.scene.add(group);
        this.addRunicBurst(ev.x, ev.z, Math.min(radius, 8), '#a855f7', 540, 0.56, 2.0);
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
        this.addRunicBurst(ev.x, ev.z, Math.min(radius, 18), '#f43f5e', 760, 0.72, 1.8);
        this.addExpandingRing(ev.x, ev.z, radius, '#fb7185', 650, 0.66, 0.16);
        this.addExpandingRing(ev.x, ev.z, radius * 0.7, '#fde047', 500, 0.62, 0.12);
        this.addFlashLight(ev.x, 3.0, ev.z, '#f43f5e', 4.6, 24, 420);
        this.spawnParticles({
          kind: 'spark',
          x: ev.x,
          y: 1.0,
          z: ev.z,
          count: 18,
          color: '#fb7185',
          spreadRadius: 6,
          speedMin: 4.0,
          speedMax: 10.0,
          upMin: 2.0,
          upMax: 5.5,
          durationMs: 600,
        });
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
        const col = ev.color || '#fbbf24';
        this.addRunicBurst(ev.x, ev.z, Math.max(2.4, radius), col, 520, 0.62, 2.0);
        this.addExpandingRing(ev.x, ev.z, radius, col, 440, 0.54, 0.2);
        this.spawnParticles({
          kind: ev.kind === 'secret_break' ? 'shard' : 'star',
          x: ev.x,
          y: 0.9,
          z: ev.z,
          count: 12,
          color: col,
          speedMin: 2.0,
          speedMax: 5.4,
          upMin: 2.2,
          upMax: 5.4,
          durationMs: 580,
          opacity: 0.86,
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
        } else if (drop.shardDrop) {
          rarity = drop.shardDrop.rarity;
          const meta = RARITY_META[rarity];
          beamColor = meta.beamColor;
          beamHeight = 8.5;
          beamRadius = 0.26;
          maxOpacity = 0.32;
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
        ef.onDone?.();
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

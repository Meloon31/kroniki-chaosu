import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ACT_THEMES } from '../../shared/world';
import type {
  ActNumber,
  FloatingCombatText,
  GeneratedMapData,
  SkillVfxEvent,
  WorldSnapshot,
} from '../../shared/types';
import { buildCharacterRig, CharacterRig, updateCharacterRig } from './CharacterBuilder';
import { createSoftGlowSpriteTexture, SHARED_WIND_UNIFORMS } from './ComicMaterials';
import { buildEnemyRig, EnemyRig, updateEnemyRig } from './EnemyBuilder';
import { EffectsManager } from './EffectsManager';
import { BuiltMapHandles, buildWorldMap, syncWorldMapVisuals } from './MapBuilder';

const SubtleVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.24 },
    uOffset: { value: 1.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);
      float vig = clamp(1.0 - dot(uv, uv) * uDarkness, 0.72, 1.0);
      gl_FragColor = vec4(texel.rgb * vig, texel.a);
    }
  `,
};

export interface ScreenFloatingText extends FloatingCombatText {
  screenX: number;
  screenY: number;
}

export interface EngineCallbacks {
  onMove: (dx: number, dz: number, rotY?: number) => void;
  onAttack: (aimX: number, aimZ: number) => void;
  onSkill: (slot: 'active1' | 'active2' | 'active3', aimX: number, aimZ: number) => void;
  onDash: (dirX: number, dirZ: number) => void;
  onPotion: () => void;
  onUltimate?: () => void;
  onInteract: () => void;
  onReviveHold?: () => void;
  onAutoPickupLoot: (lootId: string) => void;
  onFloatingTexts: (texts: ScreenFloatingText[]) => void;
  onInteractHint: (hint: string | null) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private localPlayerId: string;

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private effects: EffectsManager;
  private ambientMotes: THREE.Points;
  private ambientMoteVel: Float32Array;
  private currentAct: ActNumber = 1;

  private mapData: GeneratedMapData | null = null;
  private mapHandles: BuiltMapHandles | null = null;
  private latestSnapshot: WorldSnapshot | null = null;

  private playerRigs = new Map<string, CharacterRig>();
  private enemyRigs = new Map<string, EnemyRig>();
  private charonGroup: THREE.Group | null = null;
  private branchPortalGroup = new THREE.Group();
  private branchPortalKey = '';
  private tetherGroup = new THREE.Group();
  private aimReticle: THREE.Group;

  // Input state + Hades 150ms Input Buffer & Animation Cancel
  private keys = new Set<string>();
  private bufferedAction: { kind: 'attack' | 'skill' | 'ultimate'; slot?: 'active1' | 'active2' | 'active3'; expiresAt: number } | null = null;
  private mouseNdc = new THREE.Vector2(0, 0);
  private aimWorld = new THREE.Vector3(0, 0, 0);
  private mouseDown = false;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private uiBlocked = false;

  // Camera & Dopamine Juice state
  private camTarget = new THREE.Vector3(-44, 0, -44);
  private camZoom = 1.0;
  private shakeTrauma = 0;
  private hitStopRemaining = 0;
  private slowMoRemaining = 0;
  private elapsedSec = 0;
  private lastFrameMs = 0;
  private lastMoveEmitMs = 0;
  private lastFootstepMs = 0;
  private pickedLootIds = new Set<string>();
  private rafId = 0;
  private destroyed = false;

  constructor(container: HTMLElement, localPlayerId: string, callbacks: EngineCallbacks) {
    this.container = container;
    this.localPlayerId = localPlayerId;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#181a29');
    this.scene.fog = new THREE.Fog('#1b1e30', 58, 128);

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 220);
    this.camera.position.set(-44, 30, -19);
    this.camera.lookAt(-44, 0, -44);

    // ACES Filmic tone mapping prevents blown-out bright highlights & keeps colors rich!
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Selective Eye-Friendly Post-Processing: High-Threshold Bloom + Subtle Comic Vignette + ACES Output!
    try {
      const comp = new EffectComposer(this.renderer);
      comp.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.24, 0.34, 0.88);
      comp.addPass(bloom);
      comp.addPass(new ShaderPass(SubtleVignetteShader));
      comp.addPass(new OutputPass());
      this.composer = comp;
      this.bloomPass = bloom;
    } catch {
      this.composer = null;
      this.bloomPass = null;
    }

    // Warm plush 3-point storybook cartoon lighting: Bright Hemisphere + Golden Sun + Pastel Rim
    this.hemiLight = new THREE.HemisphereLight('#e2ebff', '#4b3b63', 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff4df', 1.2);
    this.sunLight.position.set(22, 42, 24);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.04;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 130;
    const d = 44;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Cool rim light from behind to sculpt comic character silhouettes cleanly
    this.rimLight = new THREE.DirectionalLight('#8ab4f8', 0.34);
    this.rimLight.position.set(-24, 18, -28);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    this.effects = new EffectsManager(this.scene);
    this.scene.add(this.branchPortalGroup);
    this.scene.add(this.tetherGroup);

    // Subtle atmospheric floating motes (dust / sand / spores / ash per Act)
    const moteCount = 90;
    const motePos = new Float32Array(moteCount * 3);
    this.ambientMoteVel = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 44;
      motePos[i * 3 + 1] = 0.6 + Math.random() * 8.5;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 44;
      this.ambientMoteVel[i * 3] = (Math.random() - 0.5) * 0.7;
      this.ambientMoteVel[i * 3 + 1] = 0.15 + Math.random() * 0.35;
      this.ambientMoteVel[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: '#f5cfa0',
      map: createSoftGlowSpriteTexture(),
      size: 0.46,
      transparent: true,
      opacity: 0.46,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ambientMotes = new THREE.Points(moteGeo, moteMat);
    this.scene.add(this.ambientMotes);

    // Understated crisp comic aim reticle (ink outer ring + soft gold inner ring)
    this.aimReticle = new THREE.Group();
    const inkRing = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.64, 24),
      new THREE.MeshBasicMaterial({
        color: '#10101a',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    inkRing.rotation.x = -Math.PI / 2;
    const goldRing = new THREE.Mesh(
      new THREE.RingGeometry(0.50, 0.59, 24),
      new THREE.MeshBasicMaterial({
        color: '#e6c253',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      })
    );
    goldRing.rotation.x = -Math.PI / 2;
    goldRing.position.y = 0.01;
    this.aimReticle.add(inkRing, goldRing);
    this.aimReticle.position.y = 0.06;
    this.scene.add(this.aimReticle);

    this.bindEvents();
    this.lastFrameMs = performance.now();
    this.loop(this.lastFrameMs);
  }

  public setLocalPlayerId(id: string) {
    this.localPlayerId = id;
  }

  public setUiBlocked(blocked: boolean) {
    this.uiBlocked = blocked;
    if (blocked) {
      this.keys.clear();
      this.mouseDown = false;
    }
  }

  public triggerHitStop(ms = 55) {
    this.hitStopRemaining = Math.max(this.hitStopRemaining, ms / 1000);
  }

  public addScreenShake(amount = 0.38) {
    this.shakeTrauma = Math.min(0.85, this.shakeTrauma + amount);
  }

  public triggerBoskiSlowMo(ms = 1150) {
    this.slowMoRemaining = ms / 1000;
    this.addScreenShake(0.55);
  }

  public loadMap(mapData: GeneratedMapData) {
    this.mapData = mapData;
    this.currentAct = mapData.location.act;
    this.pickedLootIds.clear();
    this.effects.clearAll();

    if (this.mapHandles) {
      this.scene.remove(this.mapHandles.root);
      this.mapHandles = null;
    }
    for (const er of this.enemyRigs.values()) {
      this.scene.remove(er.root);
    }
    this.enemyRigs.clear();

    const theme = ACT_THEMES[mapData.location.act];
    this.scene.background = new THREE.Color(theme.skyColor);
    this.scene.fog = new THREE.Fog(theme.fogColor, 72, 158);

    // Bright, clear storybook cartoon lighting palette per Act (especially brighter in Acts 3 & 4!)
    const actLighting: Record<
      ActNumber,
      { sky: string; ground: string; hemiInt: number; sun: string; sunInt: number; rim: string; mote: string; exposure: number }
    > = {
      1: { sky: '#cfdcff', ground: '#42385e', hemiInt: 0.85, sun: '#ffeed6', sunInt: 1.16, rim: '#93c5fd', mote: '#fbd38d', exposure: 1.06 },
      2: { sky: '#fff2d6', ground: '#6b472d', hemiInt: 0.85, sun: '#fff7e3', sunInt: 1.08, rim: '#7dd3fc', mote: '#fde68a', exposure: 1.04 },
      3: { sky: '#c8ffea', ground: '#3e6e5c', hemiInt: 1.08, sun: '#fff5ff', sunInt: 1.28, rim: '#d8b4fe', mote: '#86efac', exposure: 1.16 },
      4: { sky: '#ebd0ff', ground: '#6e3652', hemiInt: 1.08, sun: '#ffe8ec', sunInt: 1.28, rim: '#fda4af', mote: '#fca5a5', exposure: 1.16 },
      5: { sky: '#d8f3ff', ground: '#2d4e78', hemiInt: 1.12, sun: '#f0faff', sunInt: 1.3, rim: '#7dd3fc', mote: '#bae6fd', exposure: 1.16 },
      6: { sky: '#ffebd2', ground: '#6e3b1f', hemiInt: 1.1, sun: '#fff4d6', sunInt: 1.32, rim: '#fbbf24', mote: '#fdba74', exposure: 1.15 },
      7: { sky: '#f2e4ff', ground: '#442b6b', hemiInt: 1.14, sun: '#e8fffb', sunInt: 1.34, rim: '#00f5d4', mote: '#5eead4', exposure: 1.18 },
      8: { sky: '#fff5d6', ground: '#374d80', hemiInt: 1.12, sun: '#fffbeb', sunInt: 1.34, rim: '#fbbf24', mote: '#fde047', exposure: 1.16 },
      9: { sky: '#d8ffef', ground: '#215948', hemiInt: 1.12, sun: '#fef9c3', sunInt: 1.32, rim: '#34d399', mote: '#6ee7b7', exposure: 1.16 },
    };
    const al = actLighting[mapData.location.act];
    this.hemiLight.color.set(al.sky);
    this.hemiLight.groundColor.set(al.ground);
    this.hemiLight.intensity = al.hemiInt;
    this.sunLight.color.set(al.sun);
    this.sunLight.intensity = al.sunInt;
    this.rimLight.color.set(al.rim);
    this.renderer.toneMappingExposure = al.exposure;
    (this.ambientMotes.material as THREE.PointsMaterial).color.set(al.mote);

    this.mapHandles = buildWorldMap(mapData);
    this.scene.add(this.mapHandles.root);

    this.camTarget.set(mapData.spawn.x, 0, mapData.spawn.z);
  }

  public applySnapshot(snap: WorldSnapshot) {
    this.latestSnapshot = snap;

    const activePlayerIds = new Set(snap.players.map((p) => p.id));
    for (const [id, rig] of this.playerRigs.entries()) {
      if (!activePlayerIds.has(id)) {
        this.scene.remove(rig.root);
        this.playerRigs.delete(id);
      }
    }
    for (const p of snap.players) {
      let rig = this.playerRigs.get(p.id);
      if (rig && rig.classId !== p.classId) {
        this.scene.remove(rig.root);
        this.playerRigs.delete(p.id);
        rig = undefined;
      }
      if (!rig) {
        rig = buildCharacterRig(p.classId, p.id === this.localPlayerId);
        rig.root.position.set(p.x, 0, p.z);
        this.scene.add(rig.root);
        this.playerRigs.set(p.id, rig);
      }
    }

    const activeEnemyIds = new Set(snap.enemies.map((e) => e.id));
    for (const [id, rig] of this.enemyRigs.entries()) {
      if (!activeEnemyIds.has(id)) {
        this.scene.remove(rig.root);
        this.enemyRigs.delete(id);
      }
    }
    for (const e of snap.enemies) {
      let rig = this.enemyRigs.get(e.id);
      if (!rig) {
        rig = buildEnemyRig(e);
        rig.root.position.set(e.x, 0, e.z);
        this.scene.add(rig.root);
        this.enemyRigs.set(e.id, rig);
      }
    }

    this.effects.syncTelegraphs(snap.telegraphs, snap.serverTime);
  }

  public handleVfxEvents(events: SkillVfxEvent[]) {
    for (const ev of events) {
      this.effects.spawnSkillVfx(ev);
      if (
        ev.kind === 'meteor' ||
        ev.kind === 'earthquake' ||
        ev.kind === 'boss_leap_slam' ||
        ev.kind === 'boss_chaos_burst' ||
        ev.kind === 'boss_obsidian_rain'
      ) {
        this.addScreenShake(0.36);
      }
    }
  }

  public handleCombatTexts(texts: FloatingCombatText[]) {
    if (texts.length === 0) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const projected: ScreenFloatingText[] = [];
    const v = new THREE.Vector3();

    for (const ft of texts) {
      v.set(ft.x, ft.y, ft.z);
      v.project(this.camera);
      if (v.z > 1) continue;
      projected.push({
        ...ft,
        screenX: (v.x * 0.5 + 0.5) * w,
        screenY: (-v.y * 0.5 + 0.5) * h,
      });
    }
    if (projected.length > 0) {
      this.callbacks.onFloatingTexts(projected);
    }
  }

  public castSkillFromHud(slot: 'active1' | 'active2' | 'active3') {
    this.callbacks.onSkill(slot, this.aimWorld.x, this.aimWorld.z);
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private onResize = () => {
    if (this.destroyed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.uiBlocked) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);

    if (k === '1' || k === 'q') {
      this.bufferedAction = { kind: 'skill', slot: 'active1', expiresAt: performance.now() + 150 };
      this.callbacks.onSkill('active1', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '2' || k === 'e') {
      this.bufferedAction = { kind: 'skill', slot: 'active2', expiresAt: performance.now() + 150 };
      this.callbacks.onSkill('active2', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '3') {
      this.bufferedAction = { kind: 'skill', slot: 'active3', expiresAt: performance.now() + 150 };
      this.callbacks.onSkill('active3', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '4' || k === 'v') {
      this.callbacks.onPotion();
    } else if (k === '5' || k === 't') {
      this.bufferedAction = { kind: 'ultimate', expiresAt: performance.now() + 150 };
      this.callbacks.onUltimate?.();
    } else if (k === ' ' || k === 'shift') {
      e.preventDefault();
      // Hades Animation Cancel: Dash cancels any buffered attack/skill immediately!
      this.bufferedAction = null;
      const local = this.latestSnapshot?.players.find((p) => p.id === this.localPlayerId);
      if (local) {
        this.effects.spawnFootstepDust(local.x, local.z, this.getActDustColor(), true);
      }
      const mv = this.getMoveVector();
      if (mv.dx !== 0 || mv.dz !== 0) {
        this.callbacks.onDash(mv.dx, mv.dz);
      } else if (local) {
        this.callbacks.onDash(this.aimWorld.x - local.x, this.aimWorld.z - local.z);
      }
    } else if (k === 'f') {
      this.callbacks.onInteract();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.updateAimWorld();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.uiBlocked) return;
    this.onMouseMove(e);
    if (e.button === 0) {
      this.mouseDown = true;
      this.bufferedAction = { kind: 'attack', expiresAt: performance.now() + 150 };
      this.callbacks.onAttack(this.aimWorld.x, this.aimWorld.z);
    } else if (e.button === 2) {
      this.bufferedAction = { kind: 'skill', slot: 'active3', expiresAt: performance.now() + 150 };
      this.callbacks.onSkill('active3', this.aimWorld.x, this.aimWorld.z);
    }
  };

  private onMouseUp = () => {
    this.mouseDown = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onWheel = (e: WheelEvent) => {
    if (this.uiBlocked) return;
    this.camZoom = Math.max(0.68, Math.min(1.5, this.camZoom + Math.sign(e.deltaY) * 0.08));
  };

  private updateAimWorld() {
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.aimWorld);
    this.aimReticle.position.set(this.aimWorld.x, 0.06, this.aimWorld.z);
  }

  private getActDustColor(): string {
    const map: Record<ActNumber, string> = {
      1: '#757c94',
      2: '#c99f62',
      3: '#4a705d',
      4: '#544659',
      5: '#bae6fd',
      6: '#fbbf24',
      7: '#5eead4',
      8: '#fde68a',
      9: '#6ee7b7',
    };
    return map[this.currentAct];
  }

  private getMoveVector(): { dx: number; dz: number } {
    let dx = 0;
    let dz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    return { dx, dz };
  }

  private updateAmbientMotes(dt: number) {
    const attr = this.ambientMotes.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const act = this.currentAct;
    for (let i = 0; i < arr.length; i += 3) {
      if (act === 2) {
        // Act 2 (Pustynia): fine desert sand dust sweeping horizontally low near the ground!
        arr[i] += (2.8 + Math.abs(this.ambientMoteVel[i])) * dt;
        arr[i + 1] += Math.sin(this.elapsedSec * 2.2 + i) * 0.15 * dt;
        arr[i + 2] += 0.9 * dt;
        if (arr[i] > 22 || arr[i + 1] > 3.2) {
          arr[i] = -22;
          arr[i + 1] = 0.25 + Math.random() * 2.4;
          arr[i + 2] = (Math.random() - 0.5) * 44;
        }
      } else if (act === 3 || act === 9) {
        // Act 3 (Przeklęty Las) & Act 9: bioluminescent fireflies swaying gently!
        arr[i] += Math.sin(this.elapsedSec * 1.8 + i) * 0.85 * dt;
        arr[i + 1] += Math.cos(this.elapsedSec * 1.4 + i) * 0.42 * dt;
        arr[i + 2] += Math.cos(this.elapsedSec * 1.6 + i) * 0.85 * dt;
        if (arr[i + 1] < 0.5 || arr[i + 1] > 7.5) {
          arr[i + 1] = 1.2 + Math.random() * 4.5;
        }
      } else if (act === 4 || act === 6) {
        // Act 4 (Cytadela) & Act 6: rising volcanic ash & glowing chaos embers!
        arr[i] += this.ambientMoteVel[i] * 1.3 * dt;
        arr[i + 1] += (1.1 + this.ambientMoteVel[i + 1] * 2.2) * dt;
        arr[i + 2] += this.ambientMoteVel[i + 2] * 1.3 * dt;
        if (arr[i + 1] > 10.5) {
          arr[i] = (Math.random() - 0.5) * 44;
          arr[i + 1] = 0.35;
          arr[i + 2] = (Math.random() - 0.5) * 44;
        }
      } else if (act === 5) {
        // Act 5 (Mróz): gently falling aurora snow crystals!
        arr[i] += Math.sin(this.elapsedSec + i) * 0.7 * dt;
        arr[i + 1] -= (0.9 + this.ambientMoteVel[i + 1]) * dt;
        arr[i + 2] += 0.35 * dt;
        if (arr[i + 1] < 0.2) {
          arr[i] = (Math.random() - 0.5) * 44;
          arr[i + 1] = 9.5;
          arr[i + 2] = (Math.random() - 0.5) * 44;
        }
      } else {
        // Act 1 (Podziemia) & others: warm torchlight dust motes drifting softly!
        arr[i] += this.ambientMoteVel[i] * dt;
        arr[i + 1] += this.ambientMoteVel[i + 1] * dt;
        arr[i + 2] += this.ambientMoteVel[i + 2] * dt;
        if (arr[i + 1] > 9.5) {
          arr[i] = (Math.random() - 0.5) * 44;
          arr[i + 1] = 0.5;
          arr[i + 2] = (Math.random() - 0.5) * 44;
        }
      }
    }
    attr.needsUpdate = true;
    this.ambientMotes.position.set(this.camTarget.x, 0, this.camTarget.z);
  }

  private checkNearbyHintsAndAutoLoot(nowMs: number) {
    const snap = this.latestSnapshot;
    const map = this.mapData;
    if (!snap || !map) return;
    const local = snap.players.find((p) => p.id === this.localPlayerId);
    if (!local || !local.alive) {
      this.callbacks.onInteractHint(null);
      return;
    }

    for (const drop of snap.loot) {
      if (drop.pickedUp || this.pickedLootIds.has(drop.id)) continue;
      if (nowMs - drop.droppedAt < 650) continue;
      if (Math.hypot(local.x - drop.x, local.z - drop.z) <= 2.35) {
        this.pickedLootIds.add(drop.id);
        this.callbacks.onAutoPickupLoot(drop.id);
      }
    }

    // Priority 1: Downed Teammate Revive Hint (hold [E] or [F]!)
    for (const ally of snap.players) {
      if (ally.id === local.id || ally.alive || !ally.downedUntil || ally.downedUntil <= nowMs) continue;
      if (Math.hypot(local.x - ally.x, local.z - ally.z) <= 3.85) {
        const pct = Math.round((ally.reviveProgress || 0) * 100);
        const speedTxt = local.classId === 'wrozka' ? '1.5s (Wróżka!)' : '2.5s';
        this.callbacks.onInteractHint(
          pct > 0
            ? `👼 Wskrzeszanie ${ally.name}... ${pct}% [Trzymaj E / F]`
            : `🆘 [Przytrzymaj E lub F] Wskrześ ${ally.name} (${speedTxt})`
        );
        return;
      }
    }

    // Priority 2: Interactive 3D Camp Stations!
    if (map.isCamp && map.campStations) {
      for (const st of map.campStations) {
        if (Math.hypot(local.x - st.x, local.z - st.z) <= 4.4) {
          this.callbacks.onInteractHint(st.label);
          return;
        }
      }
    }

    // Priority 2.5: Wandering Merchant (Charon) & Branching Reward Portals!
    if (snap.merchant && Math.hypot(local.x - snap.merchant.x, local.z - snap.merchant.z) <= 4.6) {
      this.callbacks.onInteractHint('[F] 🛶 Kupiec Charon — Wydaj Esencję Chaosu na Dary i Kryształy!');
      return;
    }
    if (snap.branchPortals && snap.branchPortals.length > 0) {
      for (const bp of snap.branchPortals) {
        if (Math.hypot(local.x - bp.x, local.z - bp.z) <= 3.8) {
          this.callbacks.onInteractHint(`[F] Wybierz Portal: ${bp.label} (${bp.voters.length}/${snap.partySize} głosów)`);
          return;
        }
      }
    }

    for (const ch of snap.chests) {
      if (!ch.opened && Math.hypot(local.x - ch.x, local.z - ch.z) <= 4.2) {
        this.callbacks.onInteractHint('[F] Otwórz Zamkniętą Skrzynię (Zagadka Logiczna)');
        return;
      }
    }
    for (const sec of snap.secrets) {
      if (sec.revealed) continue;
      if (sec.kind === 'hidden_lever' && sec.leverX !== undefined && sec.leverZ !== undefined) {
        if (Math.hypot(local.x - sec.leverX, local.z - sec.leverZ) <= 4.2) {
          this.callbacks.onInteractHint('[F] Przełącz Ukrytą Dźwignię');
          return;
        }
      }
      if (sec.kind === 'cracked_wall' && Math.hypot(local.x - sec.wallX, local.z - sec.wallZ) <= 5.0) {
        this.callbacks.onInteractHint('[F / LPM] Zniszcz Pękniętą Ścianę (Ukryte Przejście)');
        return;
      }
    }
    for (const puz of snap.puzzles) {
      if (puz.solved) continue;
      for (const node of puz.nodes) {
        if (Math.hypot(local.x - node.x, local.z - node.z) <= 4.2) {
          if (puz.type === 'rotating_statues') {
            this.callbacks.onInteractHint('[F] Obróć Posąg o 90° (Skieruj do Kryształu)');
            return;
          }
          if (puz.type === 'symbol_match') {
            this.callbacks.onInteractHint('[F] Zmień Symbol Runiczny Filaru');
            return;
          }
        }
      }
    }
    for (const sh of snap.shrines) {
      if (!sh.used && Math.hypot(local.x - sh.x, local.z - sh.z) <= 4.2) {
        this.callbacks.onInteractHint('[F] ✨ Kapliczka: 100% HP/Mana + Wybór Daru Chaosu!');
        return;
      }
    }
    if (snap.obelisk && snap.obelisk.state === 'idle' && Math.hypot(local.x - snap.obelisk.x, local.z - snap.obelisk.z) <= 4.6) {
      this.callbacks.onInteractHint('[F] 🔮 Aktywuj Przeklęty Ołtarz (30s Bariera -> Skrzynia + 3-min Buff!)');
      return;
    }
    if (Math.hypot(local.x - map.exitPortal.x, local.z - map.exitPortal.z) <= 5.0) {
      this.callbacks.onInteractHint(
        snap.exitUnlocked
          ? '[F] Przejdź przez Portal do Kolejnej Lokacji!'
          : 'Portal zamknięty — pokonaj strażników / Bossa!'
      );
      return;
    }

    this.callbacks.onInteractHint(null);
  }

  private loop = (nowMs: number) => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.06, Math.max(0.001, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;

    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= rawDt;
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
      return;
    }

    let timeScale = 1.0;
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining -= rawDt;
      timeScale = 0.28;
    }

    const dt = rawDt * timeScale;
    this.elapsedSec += dt;
    // Update shared GPU Vertex-Shader wind timer (zero CPU mesh work!)
    SHARED_WIND_UNIFORMS.uWindTime.value = this.elapsedSec;

    if (!this.uiBlocked && nowMs - this.lastMoveEmitMs >= 48) {
      this.lastMoveEmitMs = nowMs;
      const { dx, dz } = this.getMoveVector();
      if (dx !== 0 || dz !== 0) {
        this.callbacks.onMove(dx, dz);
      } else {
        this.callbacks.onMove(0, 0);
      }
      if (this.mouseDown) {
        this.updateAimWorld();
        this.callbacks.onAttack(this.aimWorld.x, this.aimWorld.z);
      }
      // Flush 150ms Hades Input Buffer cleanly!
      if (this.bufferedAction) {
        if (nowMs <= this.bufferedAction.expiresAt) {
          this.updateAimWorld();
          if (this.bufferedAction.kind === 'attack') {
            this.callbacks.onAttack(this.aimWorld.x, this.aimWorld.z);
          } else if (this.bufferedAction.kind === 'skill' && this.bufferedAction.slot) {
            this.callbacks.onSkill(this.bufferedAction.slot, this.aimWorld.x, this.aimWorld.z);
          } else if (this.bufferedAction.kind === 'ultimate') {
            this.callbacks.onUltimate?.();
          }
        }
        this.bufferedAction = null;
      }
      // Hold [E] or [F] near a downed ally to revive!
      if ((this.keys.has('f') || this.keys.has('e')) && this.callbacks.onReviveHold && this.latestSnapshot) {
        const local = this.latestSnapshot.players.find((pl) => pl.id === this.localPlayerId);
        if (local && local.alive) {
          const hasNearbyDowned = this.latestSnapshot.players.some(
            (al) =>
              al.id !== local.id &&
              !al.alive &&
              !!al.downedUntil &&
              al.downedUntil > Date.now() &&
              Math.hypot(al.x - local.x, al.z - local.z) <= 3.85
          );
          if (hasNearbyDowned) {
            this.callbacks.onReviveHold();
          }
        }
      }
    }

    const snap = this.latestSnapshot;
    const nowWall = Date.now();

    if (snap) {
      this.syncHadesWorldObjects(snap);
      const lerpAlpha = Math.min(1, rawDt * 14);

      for (const p of snap.players) {
        const rig = this.playerRigs.get(p.id);
        if (!rig) continue;
        rig.root.position.x = THREE.MathUtils.lerp(rig.root.position.x, p.x, lerpAlpha);
        rig.root.position.z = THREE.MathUtils.lerp(rig.root.position.z, p.z, lerpAlpha);
        rig.root.rotation.y = p.rotY;
        updateCharacterRig(rig, p, this.elapsedSec, nowWall);

        // Subtle comic footstep dust puffs + Prestige Cosmetic Running Trails!
        if (p.animState === 'run' && p.alive && nowMs - this.lastFootstepMs > 180) {
          this.lastFootstepMs = nowMs;
          this.effects.spawnFootstepDust(rig.root.position.x, rig.root.position.z, this.getActDustColor());
          if (p.equippedTrail) {
            const trailColor =
              p.equippedTrail === 'trail_flawless_quad'
                ? `hsl(${Math.round((this.elapsedSec * 160) % 360)}, 92%, 62%)`
                : p.equippedTrail === 'trail_gold_sparks'
                  ? '#fde047'
                  : '#c084fc';
            this.effects.spawnParticles({
              kind: 'star',
              x: rig.root.position.x,
              y: 0.35,
              z: rig.root.position.z,
              count: 2,
              color: trailColor,
              speedMin: 0.3,
              speedMax: 1.2,
              upMin: 0.6,
              upMax: 1.8,
              gravity: -0.4,
              scale: 0.65,
              durationMs: 460,
              opacity: 0.85,
            });
          }
        }

        if (p.id === this.localPlayerId) {
          this.camTarget.x = THREE.MathUtils.lerp(this.camTarget.x, rig.root.position.x, Math.min(1, rawDt * 7));
          this.camTarget.z = THREE.MathUtils.lerp(this.camTarget.z, rig.root.position.z, Math.min(1, rawDt * 7));
        }
      }

      for (const e of snap.enemies) {
        const rig = this.enemyRigs.get(e.id);
        if (!rig) continue;
        rig.root.position.x = THREE.MathUtils.lerp(rig.root.position.x, e.x, lerpAlpha);
        rig.root.position.z = THREE.MathUtils.lerp(rig.root.position.z, e.z, lerpAlpha);
        rig.root.rotation.y = e.rotY;
        updateEnemyRig(rig, e, this.elapsedSec, nowWall);
      }

      if (this.mapHandles) {
        syncWorldMapVisuals(
          this.mapHandles,
          snap.puzzles,
          snap.secrets,
          snap.chests,
          snap.shrines,
          snap.pillars,
          snap.exitUnlocked,
          this.elapsedSec,
          snap.obelisk
        );
      }

      this.effects.syncLootBeams(snap.loot, this.elapsedSec);
      this.checkNearbyHintsAndAutoLoot(nowWall);
    }

    this.effects.update();
    this.updateAmbientMotes(dt);

    // Trauma-based comic camera shake
    this.shakeTrauma = Math.max(0, this.shakeTrauma - rawDt * 2.4);
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 1.35;
    const shakeX = (Math.random() * 2 - 1) * shakeMag;
    const shakeY = (Math.random() * 2 - 1) * shakeMag;

    this.camera.position.set(
      this.camTarget.x + shakeX,
      30 * this.camZoom + shakeY,
      this.camTarget.z + 25 * this.camZoom
    );
    this.camera.lookAt(this.camTarget.x, 0.8, this.camTarget.z);

    // Track key & rim light frustums smoothly with hero
    this.sunLight.position.set(this.camTarget.x + 22, 42, this.camTarget.z + 24);
    this.sunLight.target.position.set(this.camTarget.x, 0, this.camTarget.z);
    this.rimLight.position.set(this.camTarget.x - 24, 18, this.camTarget.z - 28);
    this.rimLight.target.position.set(this.camTarget.x, 0, this.camTarget.z);

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private syncHadesWorldObjects(snap: WorldSnapshot) {
    // 1. Wandering Merchant (Charon) 3D hooded ferryman + glowing lantern
    if (snap.merchant) {
      if (!this.charonGroup) {
        const g = new THREE.Group();
        const cloak = new THREE.Mesh(
          new THREE.ConeGeometry(0.95, 2.5, 10),
          new THREE.MeshToonMaterial({ color: '#4c1d95' })
        );
        cloak.position.y = 1.25;
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 10, 10),
          new THREE.MeshToonMaterial({ color: '#3b0764' })
        );
        hood.position.y = 2.45;
        const lantern = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32, 0),
          new THREE.MeshBasicMaterial({ color: '#fde047' })
        );
        lantern.position.set(0.85, 2.0, 0.4);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.4, 1.75, 24),
          new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.65, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;
        g.add(cloak, hood, lantern, ring);
        this.charonGroup = g;
        this.scene.add(g);
      }
      this.charonGroup.visible = true;
      this.charonGroup.position.set(snap.merchant.x, 0, snap.merchant.z);
      this.charonGroup.rotation.y = this.elapsedSec * 0.55;
    } else if (this.charonGroup) {
      this.charonGroup.visible = false;
    }

    // 2. Branching Reward Portals (3 color-coded Hades portals near exit)
    const bpList = snap.branchPortals || [];
    const nextKey = bpList.map((b) => `${b.id}:${b.x}:${b.z}`).join('|');
    if (nextKey !== this.branchPortalKey) {
      this.branchPortalKey = nextKey;
      while (this.branchPortalGroup.children.length > 0) {
        this.branchPortalGroup.remove(this.branchPortalGroup.children[0]);
      }
      for (const bp of bpList) {
        const pg = new THREE.Group();
        pg.position.set(bp.x, 0, bp.z);
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(1.55, 0.22, 8, 24),
          new THREE.MeshBasicMaterial({ color: bp.color })
        );
        torus.position.y = 1.85;
        const core = new THREE.Mesh(
          new THREE.CircleGeometry(1.38, 20),
          new THREE.MeshBasicMaterial({ color: bp.color, transparent: true, opacity: 0.34, side: THREE.DoubleSide })
        );
        core.position.y = 1.85;
        const baseRing = new THREE.Mesh(
          new THREE.RingGeometry(1.6, 2.05, 24),
          new THREE.MeshBasicMaterial({ color: bp.color, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.08;
        pg.add(torus, core, baseRing);
        this.branchPortalGroup.add(pg);
      }
    }
    for (const child of this.branchPortalGroup.children) {
      child.rotation.y = this.elapsedSec * 0.85;
    }

    // 3. Boss Breakable Tether Laser Beams
    while (this.tetherGroup.children.length > 0) {
      this.tetherGroup.remove(this.tetherGroup.children[0]);
    }
    if (snap.activeTethers && snap.activeTethers.length > 0) {
      for (const teth of snap.activeTethers) {
        const pA = snap.players.find((pl) => pl.id === teth.playerAId);
        const pB = snap.players.find((pl) => pl.id === teth.playerBId);
        if (!pA || !pB) continue;
        const dx = pB.x - pA.x;
        const dz = pB.z - pA.z;
        const len = Math.max(0.2, Math.hypot(dx, dz));
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, len, 6),
          new THREE.MeshBasicMaterial({ color: len >= teth.breakDist * 0.78 ? '#38bdf8' : '#f43f5e', transparent: true, opacity: 0.9 })
        );
        beam.position.set((pA.x + pB.x) / 2, 1.3, (pA.z + pB.z) / 2);
        beam.rotation.z = Math.PI / 2;
        beam.rotation.y = -Math.atan2(dz, dx);
        this.tetherGroup.add(beam);
      }
    }
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

import * as THREE from 'three';
import { ACT_THEMES } from '../../shared/world';
import type {
  ActNumber,
  FloatingCombatText,
  GeneratedMapData,
  SkillVfxEvent,
  WorldSnapshot,
} from '../../shared/types';
import { buildCharacterRig, CharacterRig, updateCharacterRig } from './CharacterBuilder';
import { buildEnemyRig, EnemyRig, updateEnemyRig } from './EnemyBuilder';
import { EffectsManager } from './EffectsManager';
import { BuiltMapHandles, buildWorldMap, syncWorldMapVisuals } from './MapBuilder';

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
  onInteract: () => void;
  onAutoPickupLoot: (lootId: string) => void;
  onFloatingTexts: (texts: ScreenFloatingText[]) => void;
  onInteractHint: (hint: string | null) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private localPlayerId: string;

  private renderer: THREE.WebGLRenderer;
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
  private aimReticle: THREE.Group;

  // Input state
  private keys = new Set<string>();
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
      size: 0.24,
      transparent: true,
      opacity: 0.3,
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
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.uiBlocked) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);

    if (k === '1' || k === 'q') {
      this.callbacks.onSkill('active1', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '2' || k === 'e') {
      this.callbacks.onSkill('active2', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '3' || k === 'r') {
      this.callbacks.onSkill('active3', this.aimWorld.x, this.aimWorld.z);
    } else if (k === '4' || k === 'v') {
      this.callbacks.onPotion();
    } else if (k === ' ' || k === 'shift') {
      e.preventDefault();
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
      this.callbacks.onAttack(this.aimWorld.x, this.aimWorld.z);
    } else if (e.button === 2) {
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
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += this.ambientMoteVel[i] * dt;
      arr[i + 1] += this.ambientMoteVel[i + 1] * dt;
      arr[i + 2] += this.ambientMoteVel[i + 2] * dt;
      if (arr[i + 1] > 9.5) {
        arr[i] = (Math.random() - 0.5) * 44;
        arr[i + 1] = 0.5;
        arr[i + 2] = (Math.random() - 0.5) * 44;
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
      this.callbacks.onInteractHint('[F] 🔮 Aktywuj Ołtarz Fal (3 Fale Wyzwania -> Skarb + Dar!)');
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
      this.renderer.render(this.scene, this.camera);
      return;
    }

    let timeScale = 1.0;
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining -= rawDt;
      timeScale = 0.28;
    }

    const dt = rawDt * timeScale;
    this.elapsedSec += dt;

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
    }

    const snap = this.latestSnapshot;
    const nowWall = Date.now();

    if (snap) {
      const lerpAlpha = Math.min(1, rawDt * 14);

      for (const p of snap.players) {
        const rig = this.playerRigs.get(p.id);
        if (!rig) continue;
        rig.root.position.x = THREE.MathUtils.lerp(rig.root.position.x, p.x, lerpAlpha);
        rig.root.position.z = THREE.MathUtils.lerp(rig.root.position.z, p.z, lerpAlpha);
        rig.root.rotation.y = p.rotY;
        updateCharacterRig(rig, p, this.elapsedSec, nowWall);

        // Subtle comic footstep dust puffs while running
        if (p.animState === 'run' && p.alive && nowMs - this.lastFootstepMs > 240) {
          this.lastFootstepMs = nowMs;
          this.effects.spawnFootstepDust(rig.root.position.x, rig.root.position.z, this.getActDustColor());
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

    this.renderer.render(this.scene, this.camera);
  };

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
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

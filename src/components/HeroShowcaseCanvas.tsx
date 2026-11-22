import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CLASSES } from '../../shared/classes';
import type { ClassId, NetPlayerState } from '../../shared/types';
import { buildCharacterRig, updateCharacterRig } from '../game/CharacterBuilder';
import {
  createComicMesh,
  createRunicCircleTexture,
  createSoftGlowSpriteTexture,
} from '../game/ComicMaterials';

interface HeroShowcaseCanvasProps {
  classId: ClassId;
  weaponGlow?: number;
  armorGlow?: number;
}

export const HeroShowcaseCanvas: React.FC<HeroShowcaseCanvasProps> = ({
  classId,
  weaponGlow = 0,
  armorGlow = 0,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dragRotRef = useRef({ dragging: false, lastX: 0, rotY: 0.32 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const w = Math.max(240, host.clientWidth);
    const h = Math.max(260, host.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, w / h, 0.2, 50);
    camera.position.set(0, 1.98, 5.25);
    camera.lookAt(0, 1.12, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const cls = CLASSES[classId];

    // Warm plush MMO character-select 3-point lighting tailored to class palette
    const hemi = new THREE.HemisphereLight('#eef4ff', '#3a2b59', 1.02);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#fff8eb', 1.28);
    key.position.set(3.5, 6.2, 4.8);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.DirectionalLight(cls.primaryColor, 1.05);
    rim.position.set(-4.2, 3.4, -3.6);
    scene.add(rim);

    const warmFill = new THREE.PointLight('#fbbf24', 0.65, 9);
    warmFill.position.set(2.4, 1.2, 2.8);
    scene.add(warmFill);

    // Sculpted rounded fantasy MMO pedestal + rotating glowing runic circle!
    const pedestalGroup = new THREE.Group();
    const pedBase = createComicMesh(new THREE.CylinderGeometry(1.42, 1.72, 0.34, 32), '#262d4d', 0.022);
    pedBase.position.y = -0.17;
    const pedTop = createComicMesh(new THREE.CylinderGeometry(1.24, 1.36, 0.14, 32), '#39426b', 0.018);
    pedTop.position.y = 0.05;
    const pedGoldTrim = createComicMesh(new THREE.TorusGeometry(1.34, 0.042, 10, 36), '#fbbf24', 0.014, {
      emissive: '#d97706',
      emissiveIntensity: 0.28,
    });
    pedGoldTrim.rotation.x = Math.PI / 2;
    pedGoldTrim.position.y = 0.09;
    const pedRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.032, 10, 36),
      new THREE.MeshBasicMaterial({
        color: cls.primaryColor,
        transparent: true,
        opacity: 0.85,
      })
    );
    pedRing.rotation.x = Math.PI / 2;
    pedRing.position.y = 0.125;
    pedestalGroup.add(pedBase, pedTop, pedGoldTrim, pedRing);
    scene.add(pedestalGroup);

    // Glowing MMO Runic Circle floating around the pedestal base
    const runicPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.1, 4.1),
      new THREE.MeshBasicMaterial({
        map: createRunicCircleTexture(cls.primaryColor),
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      })
    );
    runicPlane.rotation.x = -Math.PI / 2;
    runicPlane.position.y = -0.26;
    scene.add(runicPlane);

    // Sculpted 3D Hero Model with snappy MMO entrance pop!
    const rig = buildCharacterRig(classId, true, { hideSelectionRing: true });
    rig.root.position.y = 0.12;
    rig.root.scale.setScalar(1.08);
    scene.add(rig.root);

    // Soft circular glowing fairy/golden ambient motes (ZERO square pixel dots!)
    const moteCount = 46;
    const posArr = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.65 + Math.random() * 1.65;
      posArr[i * 3] = Math.cos(a) * r;
      posArr[i * 3 + 1] = Math.random() * 3.4;
      posArr[i * 3 + 2] = Math.sin(a) * r;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const moteMat = new THREE.PointsMaterial({
      color: cls.primaryColor,
      map: createSoftGlowSpriteTexture(),
      size: 0.22,
      transparent: true,
      opacity: 0.72,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    const dummyState: NetPlayerState = {
      id: 'preview',
      name: '',
      classId,
      level: 1,
      x: 0,
      z: 0,
      rotY: 0,
      hp: 100,
      maxHp: 100,
      shield: 0,
      mana: 100,
      maxMana: 100,
      alive: true,
      animState: 'idle',
      animTime: 0,
      weaponGlow,
      armorGlow,
      activeSetRarity: null,
      rootedUntil: 0,
      slowedUntil: 0,
      stoneSkinUntil: 0,
      hasteUntil: 0,
      invulnUntil: 0,
      shieldExpiresAt: 0,
      potionReadyAt: 0,
      stats: {
        maxHp: 100,
        maxMana: 100,
        ad: 10,
        ap: 10,
        def: 10,
        moveSpeed: 1,
        attackSpeed: 1,
        critChance: 10,
        critDamage: 155,
        cdr: 0,
        damageReduction: 0,
        dodgeChance: 5,
        healPower: 1,
        shieldPower: 1,
        activeSetRarity: null,
        setCounts: { zwykly: 0, normalny: 0, mityczny: 0, legendarny: 0, boski: 0, niesmiertelny: 0 },
        weaponUpgradeGlow: weaponGlow,
        armorUpgradeGlow: armorGlow,
        combatPower: 100,
      },
    };

    const onResize = () => {
      if (!host) return;
      const nw = Math.max(200, host.clientWidth);
      const nh = Math.max(240, host.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    let rafId = 0;
    const startMs = performance.now();
    const animate = (nowMs: number) => {
      rafId = requestAnimationFrame(animate);
      const elapsed = (nowMs - startMs) / 1000;

      if (!dragRotRef.current.dragging) {
        dragRotRef.current.rotY += 0.0042;
      }
      // Subtle spring-in pop when switching hero class
      const introT = Math.min(1, elapsed / 0.32);
      const popScale = 1.08 * (0.84 + 0.16 * (1 - Math.pow(1 - introT, 3)));
      rig.root.scale.setScalar(popScale);
      rig.root.rotation.y = dragRotRef.current.rotY;
      pedestalGroup.rotation.y = dragRotRef.current.rotY * 0.35;
      runicPlane.rotation.z = -elapsed * 0.32;
      (runicPlane.material as THREE.MeshBasicMaterial).opacity = 0.54 + Math.sin(elapsed * 2.4) * 0.12;
      updateCharacterRig(rig, dummyState, elapsed, Date.now());

      const attr = moteGeo.getAttribute('position') as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] += 0.008;
        if (a[i + 1] > 3.2) a[i + 1] = 0.05;
      }
      attr.needsUpdate = true;
      motes.rotation.y = elapsed * 0.25;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [classId, weaponGlow, armorGlow]);

  return (
    <div
      ref={hostRef}
      onMouseDown={(e) => {
        dragRotRef.current.dragging = true;
        dragRotRef.current.lastX = e.clientX;
      }}
      onMouseMove={(e) => {
        if (!dragRotRef.current.dragging) return;
        const dx = e.clientX - dragRotRef.current.lastX;
        dragRotRef.current.lastX = e.clientX;
        dragRotRef.current.rotY += dx * 0.012;
      }}
      onMouseUp={() => {
        dragRotRef.current.dragging = false;
      }}
      onMouseLeave={() => {
        dragRotRef.current.dragging = false;
      }}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'grab',
      }}
    />
  );
};

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CLASSES } from '../../shared/classes';
import type { ClassId, NetPlayerState } from '../../shared/types';
import { buildCharacterRig, updateCharacterRig } from '../game/CharacterBuilder';
import { createComicMesh } from '../game/ComicMaterials';

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
  const dragRotRef = useRef({ dragging: false, lastX: 0, rotY: 0.35 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const w = Math.max(240, host.clientWidth);
    const h = Math.max(260, host.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.2, 50);
    camera.position.set(0, 2.05, 5.4);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const cls = CLASSES[classId];

    // Warm plush cartoon studio 3-point lighting tailored to class palette
    const hemi = new THREE.HemisphereLight('#e4ecff', '#31234a', 0.95);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#fff6e5', 1.2);
    key.position.set(3.5, 6, 4.5);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.DirectionalLight(cls.primaryColor, 0.92);
    rim.position.set(-4, 3.2, -3.5);
    scene.add(rim);

    // Sculpted rounded fantasy stone pedestal
    const pedestalGroup = new THREE.Group();
    const pedBase = createComicMesh(new THREE.CylinderGeometry(1.38, 1.62, 0.36, 28), '#262b45', 0.02);
    pedBase.position.y = -0.18;
    const pedTop = createComicMesh(new THREE.CylinderGeometry(1.22, 1.32, 0.14, 28), '#353c5e', 0.018);
    pedTop.position.y = 0.05;
    const pedRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.26, 0.036, 10, 36),
      new THREE.MeshBasicMaterial({
        color: cls.primaryColor,
        transparent: true,
        opacity: 0.72,
      })
    );
    pedRing.rotation.x = Math.PI / 2;
    pedRing.position.y = 0.08;
    pedestalGroup.add(pedBase, pedTop, pedRing);
    scene.add(pedestalGroup);

    // Sculpted 3D Hero Model
    const rig = buildCharacterRig(classId, true, { hideSelectionRing: true });
    rig.root.position.y = 0.12;
    rig.root.scale.setScalar(1.06);
    scene.add(rig.root);

    // Subtle rising ambient motes
    const moteCount = 36;
    const posArr = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 1.4;
      posArr[i * 3] = Math.cos(a) * r;
      posArr[i * 3 + 1] = Math.random() * 3.2;
      posArr[i * 3 + 2] = Math.sin(a) * r;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const moteMat = new THREE.PointsMaterial({
      color: cls.primaryColor,
      size: 0.09,
      transparent: true,
      opacity: 0.48,
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
        setCounts: { zwykly: 0, normalny: 0, mityczny: 0, legendarny: 0, boski: 0 },
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
        dragRotRef.current.rotY += 0.0045;
      }
      rig.root.rotation.y = dragRotRef.current.rotY;
      pedestalGroup.rotation.y = dragRotRef.current.rotY * 0.4;
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

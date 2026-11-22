import * as THREE from 'three';

let softToonGradient: THREE.DataTexture | null = null;
let contactShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Soft, silky cartoon cel-shading ramp using LinearFilter so rounded shapes
 * have plush, warm painterly gradients rather than harsh blocky edges.
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (softToonGradient) return softToonGradient;

  // 8-sample smooth stylized S-curve ramp (rich shadow -> plush midtone -> soft highlight)
  const samples = [88, 102, 128, 162, 192, 212, 224, 232];
  const data = new Uint8Array(samples.length * 4);
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, samples.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;

  softToonGradient = tex;
  return tex;
}

const outlineMaterialCache = new Map<string, THREE.ShaderMaterial>();

export function getOutlineMaterial(thickness = 0.026, colorHex = '#1c182e'): THREE.ShaderMaterial {
  const key = `${thickness.toFixed(3)}_${colorHex}`;
  const cached = outlineMaterialCache.get(key);
  if (cached) return cached;

  const col = new THREE.Color(colorHex);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uThickness: { value: thickness },
      uColor: { value: col },
    },
    vertexShader: `
      uniform float uThickness;
      void main() {
        vec3 extruded = position + normalize(normal) * uThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
  });
  outlineMaterialCache.set(key, mat);
  return mat;
}

/**
 * Generates a plush, soft, beveled rounded box geometry centered at (0,0,0) —
 * eliminates boxy sharp 90-degree Minecraft corners across walls, chests, armor, and weapons!
 */
export function createRoundedBoxGeometry(
  w: number,
  h: number,
  d: number,
  radius?: number,
  curveSegments = 4
): THREE.BufferGeometry {
  const r = Math.min(radius ?? Math.min(w, h, d) * 0.24, w * 0.42, h * 0.42, d * 0.42);
  const innerW = Math.max(0.01, w - r * 2);
  const innerH = Math.max(0.01, h - r * 2);
  const innerD = Math.max(0.01, d - r * 2);

  const shape = new THREE.Shape();
  const hw = innerW / 2;
  const hh = innerH / 2;
  const cr = Math.min(r * 0.65, hw, hh);

  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: true,
    bevelSegments: Math.max(2, curveSegments - 1),
    steps: 1,
    bevelSize: r,
    bevelThickness: r,
    curveSegments,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export function createToonMaterial(
  color: THREE.ColorRepresentation,
  options?: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    steps?: 3 | 4;
    side?: THREE.Side;
  }
): THREE.MeshToonMaterial {
  const clampedEmissive = Math.min(0.42, options?.emissiveIntensity ?? 0);
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradientMap(),
    emissive: options?.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: clampedEmissive,
    transparent: options?.transparent ?? false,
    opacity: options?.opacity ?? 1,
    side: options?.side ?? THREE.FrontSide,
  });
}

export function createComicMesh(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  outlineThickness = 0.025,
  options?: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    outlineColor?: string;
    castShadow?: boolean;
    receiveShadow?: boolean;
    transparent?: boolean;
    opacity?: number;
    steps?: 3 | 4;
  }
): THREE.Mesh {
  const mat = createToonMaterial(color, {
    emissive: options?.emissive,
    emissiveIntensity: options?.emissiveIntensity,
    transparent: options?.transparent,
    opacity: options?.opacity,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = options?.castShadow ?? true;
  mesh.receiveShadow = options?.receiveShadow ?? true;

  if (outlineThickness > 0) {
    const outline = new THREE.Mesh(
      geometry,
      getOutlineMaterial(outlineThickness * 0.82, options?.outlineColor ?? '#1c182e')
    );
    outline.castShadow = false;
    outline.receiveShadow = false;
    mesh.add(outline);
  }
  return mesh;
}

/**
 * Plush soft contact shadow grounded beneath heroes, monsters, chests, and organic props.
 */
export function createContactShadow(radius = 0.85, opacity = 0.42): THREE.Mesh {
  if (!contactShadowTexture) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(14, 12, 26, 0.82)');
    grad.addColorStop(0.55, 'rgba(14, 12, 26, 0.36)');
    grad.addColorStop(1, 'rgba(14, 12, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    contactShadowTexture = new THREE.CanvasTexture(canvas);
  }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.3, radius * 2.3),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      opacity,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

export function createSoftBeamMaterial(
  color: THREE.ColorRepresentation,
  maxOpacity = 0.34
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: maxOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float bottomFade = smoothstep(0.0, 0.14, vUv.y);
        float topFade = pow(1.0 - vUv.y, 1.85);
        float alpha = bottomFade * topFade * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

export function getUpgradeGlowColor(upgradeLevel: number): THREE.Color | null {
  if (upgradeLevel < 7) return null;
  if (upgradeLevel <= 9) return new THREE.Color('#38bdf8');
  if (upgradeLevel <= 11) return new THREE.Color('#f59e0b');
  if (upgradeLevel === 12) return new THREE.Color('#a855f7');
  return new THREE.Color('#f43f5e');
}

/**
 * Hand-painted, organic cartoony ground texture per Act (ZERO square grid lines!).
 * Uses soft rounded cobblestones, wind-swept sand waves, mossy clover patches, or volcanic curves.
 */
export function createComicFloorTexture(
  baseHex: string,
  accentHex: string,
  act: 1 | 2 | 3 | 4 = 1
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Soft painterly background blotches for organic warmth
  for (let i = 0; i < 24; i++) {
    const bx = ((i * 137) % size);
    const by = ((i * 211) % size);
    const br = 36 + (i % 5) * 18;
    const grad = ctx.createRadialGradient(bx, by, 4, bx, by, br);
    grad.addColorStop(0, i % 2 === 0 ? accentHex : 'rgba(255,255,255,0.055)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  if (act === 1) {
    // Organic rounded dungeon cobblestones (soft curved pills, NO rigid grid!)
    const stones = [
      [58, 52, 86, 62, 22], [176, 48, 102, 58, 24], [312, 56, 94, 66, 26], [434, 52, 82, 60, 22],
      [96, 136, 98, 66, 26], [234, 140, 112, 68, 28], [378, 134, 96, 64, 24], [18, 144, 62, 58, 20],
      [54, 232, 92, 66, 24], [182, 238, 104, 70, 28], [326, 232, 108, 64, 26], [452, 236, 74, 62, 22],
      [108, 326, 104, 66, 28], [248, 332, 98, 68, 26], [386, 324, 102, 66, 26], [20, 330, 68, 60, 22],
      [62, 424, 94, 66, 24], [194, 428, 110, 68, 28], [336, 424, 98, 64, 26], [454, 426, 74, 60, 22],
    ];
    for (let i = 0; i < stones.length; i++) {
      const [x, y, w, h, r] = stones[i];
      ctx.fillStyle = i % 3 === 0 ? accentHex : baseHex;
      ctx.strokeStyle = 'rgba(20, 18, 34, 0.32)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
      ctx.fill();
      ctx.stroke();

      // Soft top highlight rim on each cobblestone
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2 + 8, y - h / 2 + 6, w - 16, h * 0.28, r * 0.5);
      ctx.fill();
    }
  } else if (act === 2) {
    // Sweeping soft wind-blown desert sand ripples & round sandstone pebbles
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    for (let row = 28; row < size; row += 64) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 32) {
        const y = row + Math.sin((x / size) * Math.PI * 2) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let p = 0; p < 26; p++) {
      const px = (p * 97) % size;
      const py = (p * 173) % size;
      ctx.fillStyle = p % 2 === 0 ? 'rgba(140, 83, 25, 0.25)' : 'rgba(255, 245, 210, 0.18)';
      ctx.beginPath();
      ctx.ellipse(px, py, 9 + (p % 6), 6 + (p % 4), p * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (act === 3) {
    // Soft painterly mossy forest earth, organic grass tufts & curved clover rings
    for (let p = 0; p < 34; p++) {
      const px = (p * 89) % size;
      const py = (p * 151) % size;
      ctx.fillStyle = p % 3 === 0 ? 'rgba(134, 239, 172, 0.08)' : accentHex;
      ctx.beginPath();
      ctx.arc(px, py, 14 + (p % 14), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(16, 40, 32, 0.28)';
    ctx.lineWidth = 4;
    for (let w = 0; w < 10; w++) {
      const wx = (w * 113) % size;
      const wy = (w * 197) % size;
      ctx.beginPath();
      ctx.arc(wx, wy, 28, 0.2, 2.1);
      ctx.stroke();
    }
  } else {
    // Act 4: Soft rounded volcanic basalt stepping stones with gentle ember veins
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.26)';
    ctx.lineWidth = 5;
    for (let v = 0; v < 8; v++) {
      const vx = (v * 127) % size;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.bezierCurveTo(vx + 60, size * 0.35, vx - 60, size * 0.65, vx, size);
      ctx.stroke();
    }
    for (let s = 0; s < 18; s++) {
      const sx = (s * 117) % size;
      const sy = (s * 163) % size;
      ctx.fillStyle = accentHex;
      ctx.strokeStyle = 'rgba(12, 10, 22, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sx - 38, sy - 30, 76, 60, 24);
      ctx.fill();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

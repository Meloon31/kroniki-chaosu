import * as THREE from 'three';

let softToonGradient: THREE.DataTexture | null = null;
let contactShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Plush, velvety cartoon cel-shading ramp:
 * combines clean stylized toon bands with gentle LinearFilter blending so every
 * rounded character, boss, and prop looks soft, warm, and hand-painted.
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (softToonGradient) return softToonGradient;

  // Crisp yet velvety comic cel-shading ramp: warm shadow -> rich midtone -> bright comic highlight!
  const samples = [104, 108, 114, 178, 186, 194, 232, 240, 248, 255];
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

export function getOutlineMaterial(thickness = 0.032, colorHex = '#231836'): THREE.ShaderMaterial {
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
 * Generates a plush, pillowy rounded box geometry centered at (0,0,0) —
 * used for rounded castle walls & chests, never harsh 90-degree cubes.
 */
export function createRoundedBoxGeometry(
  w: number,
  h: number,
  d: number,
  radius?: number,
  curveSegments = 6
): THREE.BufferGeometry {
  const r = Math.min(radius ?? Math.min(w, h, d) * 0.3, w * 0.44, h * 0.44, d * 0.44);
  const innerW = Math.max(0.01, w - r * 2);
  const innerH = Math.max(0.01, h - r * 2);
  const innerD = Math.max(0.01, d - r * 2);

  const shape = new THREE.Shape();
  const hw = innerW / 2;
  const hh = innerH / 2;
  const cr = Math.min(r * 0.85, hw, hh);

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
    bevelSegments: Math.max(3, curveSegments - 1),
    steps: 1,
    bevelSize: r,
    bevelThickness: r,
    curveSegments,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Smooth, organic Lathe geometry for plush cartoon torsos, robes, bell-skirts, hats, and tree trunks.
 */
export function createPlushLathe(
  profile: Array<[number, number]>,
  segments = 24
): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.004, r), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a smooth, organically tapered curved 3D tube along Catmull-Rom points!
 * Ideal for cartoon horns, scorpion tails, antlers, wizard hats, branches, scythes, smiles, and tentacles.
 */
export function createTaperedCurveGeometry(
  controlPoints: Array<[number, number, number]>,
  radiusStart: number,
  radiusEnd: number,
  tubularSegments = 18,
  radialSegments = 12
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    controlPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringCols = radialSegments + 1;
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const pt = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    // Smooth eased taper + rounded dome closure at both ends
    let r = radiusStart + (radiusEnd - radiusStart) * Math.pow(t, 0.85);
    if (i === 0) r *= 0.25;
    if (i === tubularSegments) r = Math.max(0.008, radiusEnd * 0.2);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      const vx = pt.x + r * (cos * N.x + sin * B.x);
      const vy = pt.y + r * (cos * N.y + sin * B.y);
      const vz = pt.z + r * (cos * N.z + sin * B.z);
      positions.push(vx, vy, vz);
      uvs.push(j / radialSegments, t);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringCols + j;
      const b = (i + 1) * ringCols + j;
      const c = (i + 1) * ringCols + (j + 1);
      const d = i * ringCols + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Stylized curved cartoon blade (for Hero broadswords, Boss greatswords, and Executioner axes).
 */
export function createSoftBladeGeometry(
  width: number,
  length: number,
  thickness = 0.08,
  style: 'sword' | 'axe' | 'cleaver' = 'sword'
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  if (style === 'axe') {
    shape.moveTo(0, -length * 0.35);
    shape.quadraticCurveTo(width * 0.55, -length * 0.55, width, -length * 0.45);
    shape.bezierCurveTo(width * 1.18, -length * 0.15, width * 1.18, length * 0.15, width, length * 0.45);
    shape.quadraticCurveTo(width * 0.55, length * 0.55, 0, length * 0.35);
    shape.quadraticCurveTo(-width * 0.12, 0, 0, -length * 0.35);
  } else if (style === 'cleaver') {
    shape.moveTo(-width * 0.35, 0);
    shape.quadraticCurveTo(-width * 0.45, length * 0.55, -width * 0.25, length * 0.92);
    shape.quadraticCurveTo(width * 0.1, length * 1.04, width * 0.52, length * 0.84);
    shape.bezierCurveTo(width * 0.65, length * 0.5, width * 0.42, length * 0.18, width * 0.32, 0);
    shape.quadraticCurveTo(0, -width * 0.12, -width * 0.35, 0);
  } else {
    // Chunky, rounded stylized cartoon broadsword with soft leaf-shaped belly!
    shape.moveTo(-width * 0.42, 0);
    shape.bezierCurveTo(-width * 0.62, length * 0.38, -width * 0.56, length * 0.72, -width * 0.24, length * 0.88);
    shape.quadraticCurveTo(0, length * 1.04, width * 0.24, length * 0.88);
    shape.bezierCurveTo(width * 0.56, length * 0.72, width * 0.62, length * 0.38, width * 0.42, 0);
    shape.quadraticCurveTo(0, -width * 0.15, -width * 0.42, 0);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.65,
    bevelSize: Math.min(width * 0.14, thickness * 0.75),
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Plush sculpted cartoon wing geometry using smooth Bezier silhouettes (ZERO boxy slabs!).
 */
export function createSoftWingGeometry(
  span: number,
  height: number,
  thickness = 0.08,
  variant: 'butterfly' | 'demon' | 'feather' = 'butterfly'
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  if (variant === 'butterfly') {
    shape.moveTo(0, 0);
    shape.bezierCurveTo(span * 0.35, height * 0.72, span * 0.98, height * 0.82, span, height * 0.28);
    shape.bezierCurveTo(span * 1.02, -height * 0.04, span * 0.7, -height * 0.16, span * 0.54, -height * 0.14);
    shape.bezierCurveTo(span * 0.84, -height * 0.26, span * 0.76, -height * 0.76, span * 0.32, -height * 0.68);
    shape.bezierCurveTo(span * 0.12, -height * 0.62, 0, -height * 0.25, 0, 0);
  } else if (variant === 'demon') {
    shape.moveTo(0, 0);
    shape.bezierCurveTo(span * 0.35, height * 0.68, span * 0.78, height * 0.82, span, height * 0.45);
    shape.quadraticCurveTo(span * 0.82, height * 0.15, span * 0.84, -height * 0.12);
    shape.quadraticCurveTo(span * 0.66, height * 0.04, span * 0.56, -height * 0.28);
    shape.quadraticCurveTo(span * 0.38, -height * 0.05, span * 0.26, -height * 0.42);
    shape.quadraticCurveTo(span * 0.12, -height * 0.22, 0, -height * 0.15);
    shape.lineTo(0, 0);
  } else {
    // Plush curved feathered angel/sphinx wing
    shape.moveTo(0, 0);
    shape.bezierCurveTo(span * 0.32, height * 0.65, span * 0.88, height * 0.72, span, height * 0.22);
    shape.quadraticCurveTo(span * 0.86, 0, span * 0.82, -height * 0.14);
    shape.quadraticCurveTo(span * 0.66, -height * 0.18, span * 0.6, -height * 0.32);
    shape.quadraticCurveTo(span * 0.4, -height * 0.35, span * 0.3, -height * 0.48);
    shape.bezierCurveTo(span * 0.12, -height * 0.44, 0, -height * 0.2, 0, 0);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.7,
    bevelSize: thickness * 0.65,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Cute, puffy rounded 5-pointed cartoon star (for Fairy tiara & wand).
 */
export function createSoftStarGeometry(
  outerR = 0.16,
  innerR = 0.085,
  points = 5,
  thickness = 0.05
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const total = points * 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < total; i++) {
    const ang = (i / total) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([Math.cos(ang) * r, Math.sin(ang) * r]);
  }
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) * 0.5,
    (a[1] + b[1]) * 0.5,
  ];
  const firstMid = mid(pts[total - 1], pts[0]);
  shape.moveTo(firstMid[0], firstMid[1]);
  for (let i = 0; i < total; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % total];
    const m = mid(curr, next);
    shape.quadraticCurveTo(curr[0], curr[1], m[0], m[1]);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.65,
    bevelSize: outerR * 0.12,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

const faceTextureCache = new Map<string, THREE.CanvasTexture>();
const surfaceTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Hand-painted HD comic hero face texture (512x256 equirectangular mapped onto a smooth sphere).
 * Center of face sits at u=0.5 (rotate sphere Y by -Math.PI/2 so it faces +Z cleanly!).
 * Eliminates clunky protruding eye/nose spheres and delivers crisp Brawl Stars / Anime-Comic charm!
 */
export function createHeroFaceTexture(options: {
  skin: string;
  iris: string;
  cheek: string;
  brow: string;
  expression: 'heroic' | 'arcane' | 'cheerful' | 'fierce' | 'cute';
}): THREE.CanvasTexture {
  const key = `${options.skin}_${options.iris}_${options.cheek}_${options.brow}_${options.expression}`;
  const cached = faceTextureCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Warm smooth painterly skin gradient (lighter forehead, soft warm chin shadow)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, options.skin);
  bg.addColorStop(0.72, options.skin);
  bg.addColorStop(1, '#d49576');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.52;

  // Soft rosy anime/comic cheeks + cute diagonal blush ticks!
  for (const s of [-1, 1]) {
    const chX = cx + s * 54;
    const chY = cy + 20;
    const rg = ctx.createRadialGradient(chX, chY, 2, chX, chY, 22);
    rg.addColorStop(0, options.cheek);
    rg.addColorStop(1, 'rgba(255,140,140,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(chX, chY, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Comic blush hatch lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(chX + k * 6 - 3, chY + 4);
      ctx.lineTo(chX + k * 6 + 3, chY - 4);
      ctx.stroke();
    }
  }

  // Big glossy hand-drawn comic eyes!
  for (const s of [-1, 1]) {
    const ex = cx + s * 32;
    const ey = cy - 4;
    const rx = options.expression === 'cute' ? 18 : 16;
    const ry = options.expression === 'cute' ? 22 : 20;

    // Crisp white sclera with comic ink border
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1f1530';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rich gradient colored iris
    const irisGrad = ctx.createLinearGradient(ex, ey - ry * 0.7, ex, ey + ry * 0.7);
    irisGrad.addColorStop(0, '#141126');
    irisGrad.addColorStop(0.35, options.iris);
    irisGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, rx * 0.68, ry * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep glossy pupil
    ctx.fillStyle = '#151026';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, rx * 0.38, ry * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin comic sparkles (big top-right + tiny bottom-left)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 5, ey - 7, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex - 4, ey + 7, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bold upper comic eyelash arc
    ctx.strokeStyle = '#1a112b';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ex, ey + 2, rx + 2, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    // Expressive shaped eyebrow
    ctx.strokeStyle = options.brow;
    ctx.lineWidth = options.expression === 'fierce' || options.expression === 'heroic' ? 6.5 : 4.5;
    ctx.beginPath();
    if (options.expression === 'fierce' || options.expression === 'heroic') {
      ctx.moveTo(ex - s * 16, ey - 25);
      ctx.quadraticCurveTo(ex, ey - 31, ex + s * 16, ey - 29);
    } else {
      ctx.moveTo(ex - s * 15, ey - 28);
      ctx.quadraticCurveTo(ex, ey - 35, ex + s * 15, ey - 26);
    }
    ctx.stroke();
  }

  // Cute tiny comic button nose highlight
  ctx.fillStyle = 'rgba(165, 92, 68, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive comic mouth / smile!
  ctx.strokeStyle = '#5c2429';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  if (options.expression === 'cute' || options.expression === 'cheerful') {
    ctx.fillStyle = '#e05c72';
    ctx.beginPath();
    ctx.arc(cx, cy + 25, 11, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (options.expression === 'heroic') {
    // Confident heroic smirk!
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 27);
    ctx.quadraticCurveTo(cx + 2, cy + 34, cx + 15, cy + 23);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy + 26);
    ctx.quadraticCurveTo(cx, cy + 33, cx + 11, cy + 26);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  faceTextureCache.set(key, tex);
  return tex;
}

/**
 * Hand-painted expressive comic monster / boss face texture!
 */
export function createMonsterFaceTexture(options: {
  skin: string;
  eyeColor: string;
  accent?: string;
  style: 'skull' | 'imp' | 'goblin' | 'pharaoh' | 'dryad' | 'golem';
}): THREE.CanvasTexture {
  const key = `m_${options.skin}_${options.eyeColor}_${options.accent || ''}_${options.style}`;
  const cached = faceTextureCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = options.skin;
  ctx.fillRect(0, 0, W, H);

  // Subtle painted comic shading band at bottom
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(255,255,255,0.12)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(18,12,32,0.34)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.52;

  for (const s of [-1, 1]) {
    const ex = cx + s * 34;
    const ey = cy - 6;

    // Dark comic eye socket
    ctx.fillStyle = '#150f24';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 20, 17, s * -0.18, 0, Math.PI * 2);
    ctx.fill();

    // Vivid glowing comic eye core
    ctx.fillStyle = options.eyeColor;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 13, 11, s * -0.18, 0, Math.PI * 2);
    ctx.fill();

    // Crisp cartoon sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 4, ey - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Fierce comic brow
    ctx.strokeStyle = '#150f24';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - s * 20, ey - 14);
    ctx.lineTo(ex + s * 18, ey - 26);
    ctx.stroke();
  }

  if (options.style === 'skull') {
    // Stylized comic nose cavity + cheeky grinning teeth!
    ctx.fillStyle = '#150f24';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx - 8, cy + 18);
    ctx.lineTo(cx + 8, cy + 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#150f24';
    ctx.beginPath();
    ctx.roundRect(cx - 34, cy + 25, 68, 18, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let t = 0; t < 5; t++) {
      ctx.beginPath();
      ctx.roundRect(cx - 29 + t * 12, cy + 28, 9, 12, 3);
      ctx.fill();
    }
  } else if (options.style === 'goblin' || options.style === 'imp') {
    // Cheeky toothed grin!
    ctx.fillStyle = '#240f1e';
    ctx.strokeStyle = '#150f24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 22, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute cartoon fangs!
    ctx.fillStyle = '#ffffff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 13, cy + 26);
      ctx.lineTo(cx + s * 9, cy + 36);
      ctx.lineTo(cx + s * 5, cy + 26);
      ctx.closePath();
      ctx.fill();
    }
  } else if (options.style === 'pharaoh' && options.accent) {
    // Royal golden-lapis warpaint stripes
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 54, cy - 6);
      ctx.lineTo(cx + s * 72, cy + 4);
      ctx.stroke();
    }
  } else if (options.style === 'dryad' && options.accent) {
    // Glowing forest runic cheek swirls
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 52, cy + 16, 10, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  faceTextureCache.set(key, tex);
  return tex;
}

/**
 * Hand-painted stylized comic surface texture for armor, robes, scales, bark, and magma —
 * eliminates plain plastic look and adds crisp storybook depth!
 */
export function createComicSurfaceTexture(
  baseHex: string,
  accentHex: string,
  pattern: 'armor' | 'robe' | 'scales' | 'bark' | 'magma' | 'bone'
): THREE.CanvasTexture {
  const key = `${baseHex}_${accentHex}_${pattern}`;
  const cached = surfaceTextureCache.get(key);
  if (cached) return cached;

  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.75, baseHex);
  grad.addColorStop(1, accentHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  if (pattern === 'armor') {
    // Painted brushed highlight bands + cute comic gold trim stripe & rivets
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, 26, S, 22);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, S - 36, S, 16);
    ctx.fillStyle = 'rgba(255,245,200,0.45)';
    for (let x = 16; x < S; x += 32) {
      ctx.beginPath();
      ctx.arc(x, S - 28, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'robe') {
    // Soft vertical cloth folds + ornate storybook hem stars/diamonds!
    for (let x = 0; x < S; x += 32) {
      ctx.fillStyle = x % 64 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(18,12,35,0.12)';
      ctx.fillRect(x, 0, 16, S);
    }
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, S - 28);
    ctx.lineTo(S, S - 28);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    for (let x = 16; x < S; x += 32) {
      ctx.beginPath();
      ctx.arc(x, S - 46, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'scales') {
    // Stylized golden-lapis overlapping rounded scales
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const sx = col * 44 + (row % 2) * 22;
        const sy = row * 44;
        ctx.beginPath();
        ctx.arc(sx, sy, 20, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }
  } else if (pattern === 'bark') {
    // Organic curved fairytale wood grain + glowing vine veins
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const x = i * 32 + 12;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 14, S * 0.35, x - 14, S * 0.65, x, S);
      ctx.stroke();
    }
  } else if (pattern === 'magma') {
    // Glowing molten magma veins over dark obsidian!
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x = i * 44 + 10;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 28, S * 0.5, x - 12, S);
      ctx.stroke();
    }
  } else if (pattern === 'bone') {
    // Soft comic ivory bone sheen + subtle stylized cracks
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(S * 0.35, S * 0.3, 60, 26, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(S * 0.6, S * 0.18);
    ctx.lineTo(S * 0.66, S * 0.34);
    ctx.lineTo(S * 0.74, S * 0.42);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  surfaceTextureCache.set(key, tex);
  return tex;
}

/**
 * Soft Cartoon Toon material with subtle warm Fresnel rim-light injection so
 * curved silhouettes glow gently like modern stylized 3D games (Nintendo / Brawl Stars / Pixar).
 */
export function createToonMaterial(
  color: THREE.ColorRepresentation,
  options?: {
    map?: THREE.Texture;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    steps?: 3 | 4;
    side?: THREE.Side;
    rimStrength?: number;
  }
): THREE.MeshToonMaterial {
  const clampedEmissive = Math.min(0.45, options?.emissiveIntensity ?? 0);
  const rimStrength = options?.rimStrength ?? 0.28;

  const mat = new THREE.MeshToonMaterial({
    color: options?.map ? 0xffffff : color,
    map: options?.map ?? null,
    gradientMap: getToonGradientMap(),
    emissive: options?.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: clampedEmissive,
    transparent: options?.transparent ?? false,
    opacity: options?.opacity ?? 1,
    side: options?.side ?? THREE.FrontSide,
  });

  if (rimStrength > 0.01) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimStrength = { value: rimStrength };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uRimStrength;`
        )
        .replace(
          '#include <dithering_fragment>',
          `float softRim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.3);
           gl_FragColor.rgb += mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.93), 0.58) * softRim * uRimStrength;
           #include <dithering_fragment>`
        );
    };
    mat.customProgramCacheKey = () => `soft_toon_rim_${rimStrength.toFixed(2)}`;
  }

  return mat;
}

export function createComicMesh(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  outlineThickness = 0.032,
  options?: {
    map?: THREE.Texture;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    outlineColor?: string;
    castShadow?: boolean;
    receiveShadow?: boolean;
    transparent?: boolean;
    opacity?: number;
    steps?: 3 | 4;
    side?: THREE.Side;
    rimStrength?: number;
  }
): THREE.Mesh {
  const mat = createToonMaterial(color, {
    map: options?.map,
    emissive: options?.emissive,
    emissiveIntensity: options?.emissiveIntensity,
    transparent: options?.transparent,
    opacity: options?.opacity,
    side: options?.side,
    rimStrength: options?.rimStrength,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = options?.castShadow ?? true;
  mesh.receiveShadow = options?.receiveShadow ?? true;

  if (outlineThickness > 0) {
    const outline = new THREE.Mesh(
      geometry,
      getOutlineMaterial(outlineThickness, options?.outlineColor ?? '#1f1433')
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
export function createContactShadow(radius = 0.85, opacity = 0.38): THREE.Mesh {
  if (!contactShadowTexture) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(22, 16, 40, 0.78)');
    grad.addColorStop(0.55, 'rgba(22, 16, 40, 0.32)');
    grad.addColorStop(1, 'rgba(22, 16, 40, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    contactShadowTexture = new THREE.CanvasTexture(canvas);
  }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
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
 * Hand-painted, organic storybook ground texture per Act (ZERO square grid lines!).
 * Uses soft rounded cobblestones, sweeping desert dunes, flower-speckled mossy turf, or smooth basalt islands.
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

  // Soft watercolor background blotches for storybook warmth
  for (let i = 0; i < 28; i++) {
    const bx = (i * 137) % size;
    const by = (i * 211) % size;
    const br = 42 + (i % 5) * 20;
    const grad = ctx.createRadialGradient(bx, by, 4, bx, by, br);
    grad.addColorStop(0, i % 2 === 0 ? accentHex : 'rgba(255,250,240,0.075)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  if (act === 1) {
    // Storybook plump organic river-rounded flagstones (oval & pill pebbles, ZERO grid!)
    for (let i = 0; i < 28; i++) {
      const cx = ((i * 97 + 42) % (size - 40)) + 20;
      const cy = ((i * 149 + 34) % (size - 40)) + 20;
      const rx = 28 + (i % 4) * 11;
      const ry = 20 + (i % 3) * 8;
      const rot = ((i * 37) % 10 - 5) * 0.08;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = i % 3 === 0 ? accentHex : 'rgba(255, 250, 245, 0.065)';
      ctx.strokeStyle = 'rgba(26, 20, 44, 0.26)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Soft painted upper crescent highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.beginPath();
      ctx.ellipse(-rx * 0.14, -ry * 0.25, rx * 0.56, ry * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (act === 2) {
    // Sweeping plush desert sand dunes & smooth sandstone pebbles
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    for (let row = 28; row < size; row += 64) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 24) {
        const y = row + Math.sin((x / size) * Math.PI * 2 + row * 0.02) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let p = 0; p < 30; p++) {
      const px = (p * 97) % size;
      const py = (p * 173) % size;
      ctx.fillStyle = p % 2 === 0 ? 'rgba(150, 88, 28, 0.24)' : 'rgba(255, 248, 220, 0.24)';
      ctx.beginPath();
      ctx.ellipse(px, py, 10 + (p % 7), 7 + (p % 4), p * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (act === 3) {
    // Fairy-tale mossy forest earth with soft clover circles & tiny pastel blossoms
    for (let p = 0; p < 38; p++) {
      const px = (p * 89) % size;
      const py = (p * 151) % size;
      ctx.fillStyle = p % 3 === 0 ? 'rgba(134, 239, 172, 0.13)' : accentHex;
      ctx.beginPath();
      ctx.arc(px, py, 16 + (p % 15), 0, Math.PI * 2);
      ctx.fill();
    }
    // Cute tiny fairytale flower speckles
    const flowerCols = ['#f9a8d4', '#fde047', '#c4b5fd', '#7dd3fc'];
    for (let f = 0; f < 16; f++) {
      const fx = (f * 131 + 22) % size;
      const fy = (f * 187 + 44) % size;
      ctx.fillStyle = flowerCols[f % flowerCols.length];
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Act 4: Smooth round volcanic basalt stones with gentle glowing magma curves
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.28)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let v = 0; v < 8; v++) {
      const vx = (v * 127) % size;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.bezierCurveTo(vx + 65, size * 0.35, vx - 65, size * 0.65, vx, size);
      ctx.stroke();
    }
    for (let s = 0; s < 22; s++) {
      const sx = (s * 117 + 30) % size;
      const sy = (s * 163 + 25) % size;
      ctx.fillStyle = accentHex;
      ctx.strokeStyle = 'rgba(16, 10, 26, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 34 + (s % 4) * 6, 26 + (s % 3) * 5, s * 0.4, 0, Math.PI * 2);
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

import { fbm2D, normalizeInPlace, BAYER8, Field } from './noise';

export class Rng {
  private state: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  random(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.random();
  }

  integers(lo: number, hi: number): number {
    return lo + Math.floor(this.random() * (hi - lo));
  }

  normal(mean = 0, std = 1): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return mean + std * s;
    }
    const u1 = Math.max(this.random(), 1e-12);
    const u2 = this.random();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const z0 = mag * Math.cos(2 * Math.PI * u2);
    const z1 = mag * Math.sin(2 * Math.PI * u2);
    this.spare = z1;
    return mean + std * z0;
  }

  beta(a: number, b: number): number {
    while (true) {
      const u = Math.pow(this.random(), 1 / a);
      const v = Math.pow(this.random(), 1 / b);
      const s = u + v;
      if (s > 0 && s <= 1) return u / s;
    }
  }

  choice<T>(arr: readonly T[], weights?: readonly number[]): T {
    if (!weights) return arr[this.integers(0, arr.length)];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
}

export interface ForegroundElement {
  type: 'trees' | 'ruins' | 'spikes';
  worldX: number;
  y: number;
  width: number;
  height: number;
  shade: number;
  lean?: number;
  tilt?: number;
  hasPeak?: boolean;
  peakOffset?: number;
}
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function gray(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${v},${v},${v})`;
}

export function fillPolygon(ctx: CanvasRenderingContext2D, pts: [number, number][], shade: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = gray(shade);
  ctx.fill();
}

export function attractorX(rng: Rng, width: number, focusX: number, spread = 0.22, framingP = 0.25): number {
  if (rng.random() < framingP) return rng.uniform(-width * 0.05, width * 1.05);
  return focusX + rng.normal(0, width * spread);
}

export type Foreground = 'spikes' | 'trees' | 'ruins' | 'mountains';
export type Focal = 'moon' | 'none';
export type Drift = 'shards' | 'birds' | 'none';

export interface Recipe {
  foreground: Foreground;
  focal: Focal;
  drift: Drift;
}

export interface RidgeConfig {
  baseY: number;
  amplitude: number;
  scale: number;
  shade: number;
  scrollFactor: number;
  index: number;
}

export interface ForegroundElement {
  worldX: number;
  y: number;
  width: number;
  height: number;
  shade: number;
  lean?: number;
  tilt?: number;
  hasPeak?: boolean;
  peakOffset?: number;
}

export interface BirdFlock {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ctrlX: number;
  ctrlY: number;
  birds: Array<{
    t: number;
    jitterX: number;
    jitterY: number;
    size: number;
    tilt: number;
    shade: number;
  }>;
  lineWidth: number;
  speed: number;
}

export interface ShardElement {
  worldX: number;
  y: number;
  size: number;
  angle: number;
  shade: number;
}

export const CHUNK_WIDTH = 400;

export function resolveRecipe(rng: Rng): Recipe {
  const foreground = rng.choice<Foreground>(['spikes', 'trees', 'ruins', 'mountains']);
  const focal = rng.choice<Focal>(['moon', 'none'], [0.65, 0.35]);
  const drift = rng.choice<Drift>(['shards', 'birds', 'none'], [0.35, 0.35, 0.30]);
  return { foreground, focal, drift };
}

export function paintFocalMoon(arr: Field, rng: Rng, minDim: number): void {
  const { w, h, data } = arr;
  const cx = w * rng.uniform(0.22, 0.78);
  const cy = h * rng.uniform(0.16, 0.48);
  const discR = minDim * rng.uniform(0.018, 0.038);
  const auraR = minDim * rng.uniform(0.12, 0.22);
  const d2Disc = 2 * discR * discR;
  const d2Aura = 2 * auraR * auraR;
  for (let y = 0; y < h; y++) {
    const dy = y - cy;
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const d2 = dx * dx + dy * dy;
      data[y * w + x] += Math.exp(-d2 / d2Disc) * 160 + Math.exp(-d2 / d2Aura) * 45;
    }
  }
}

export function renderSkyLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  focal: Focal,
  horizonY: number
): void {
  const minDim = Math.min(w, h);
  const sky = new Float32Array(w * h);
  sky.fill(16);

  // Sky haze (scale: max(w,h)/1.5, 4 octaves)
  const skyHaze = fbm2D(w, h, Math.max(w, h) / 1.5, 4, rng);
  normalizeInPlace(skyHaze.data);
  for (let i = 0; i < sky.length; i++) {
    sky[i] += skyHaze.data[i] * 22;
  }

  // Ground noise (scale: max(w,h)/3.0, 4 octaves), smoothstep blended below horizonY
  const groundNoise = fbm2D(w, h, Math.max(w, h) / 3.0, 4, rng);
  normalizeInPlace(groundNoise.data);
  const band = h * 0.06;
  const bandStart = horizonY - band;
  const groundSpan = Math.max(1, h - horizonY);
  for (let y = 0; y < h; y++) {
    const bottomDist = Math.max(0, Math.min(1, (y - horizonY) / groundSpan));
    const blendT = Math.max(0, Math.min(1, (y - bandStart) / band));
    const blend = blendT * blendT * (3 - 2 * blendT);
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const gn = groundNoise.data[rowOff + x];
      const groundVal = 8 + gn * 10 - bottomDist * 3;
      sky[rowOff + x] = sky[rowOff + x] * (1 - blend) + groundVal * blend;
    }
  }

  // Gaussian moon
  if (focal === 'moon') {
    paintFocalMoon({ w, h, data: sky }, rng, minDim);
  }

  // Stamp stars
  const nStars = Math.floor((w * h) / 10000);
  const starCeil = Math.max(1, Math.floor(horizonY) - Math.floor(minDim * 0.02));
  for (let i = 0; i < nStars; i++) {
    const sx = rng.integers(0, w);
    const sy = rng.integers(0, starCeil);
    const v = rng.uniform(80, 170);
    if (sky[sy * w + sx] < v) {
      sky[sy * w + sx] = v;
    }
  }

  // Flush float buffer to canvas via putImageData
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < sky.length; i++) {
    const v = Math.max(0, Math.min(255, sky[i]));
    const j = i * 4;
    img.data[j] = v;
    img.data[j + 1] = v;
    img.data[j + 2] = v;
    img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Apply finish pass (getImageData, finish(), putImageData)
  const imgData = ctx.getImageData(0, 0, w, h);
  finish(imgData.data, w, h, rng);
  ctx.putImageData(imgData, 0, 0);
}

export function createRidgeConfigs(rng: Rng, height: number, horizonY: number): RidgeConfig[] {
  const nRidges = rng.integers(2, 5);
  const configs: RidgeConfig[] = [];
  for (let i = 0; i < nRidges; i++) {
    const depth = i / Math.max(1, nRidges - 1);
    const shade = Math.round(24 - depth * 18);
    const amplitude = height * (0.08 + depth * 0.18);
    const scrollFactor = 0.15 + depth * 0.35;
    const scale = rng.uniform(0.0015, 0.0035);
    const baseY = horizonY - depth * height * 0.03;
    configs.push({
      baseY,
      amplitude,
      scale,
      shade,
      scrollFactor,
      index: i,
    });
  }
  return configs;
}

export function spawnChunkElements(
  chunkIndex: number,
  worldSeed: number,
  _defaultForeground: Foreground,
  height: number,
  horizonY: number
): ForegroundElement[] {
  const chunkSeed = (worldSeed * 2654435761 + chunkIndex * 2246822519) >>> 0;
  const rng = new Rng(chunkSeed);

  // Dynamic region/biome determination per chunk based on chunkSeed
  const foregroundTypes: Foreground[] = ['trees', 'trees', 'ruins', 'spikes', 'mountains'];
  const foreground = rng.choice(foregroundTypes);

  if (foreground === 'mountains') {
    return [];
  }

  const elements: ForegroundElement[] = [];
  const focusX = CHUNK_WIDTH * 0.5;

  if (foreground === 'trees') {
    const count = rng.integers(2, 7);
    for (let i = 0; i < count; i++) {
      const localX = attractorX(rng, CHUNK_WIDTH, focusX, 0.25);
      const worldX = chunkIndex * CHUNK_WIDTH + localX;
      const h = rng.uniform(height * 0.05, height * 0.30);
      const w = h * rng.uniform(0.10, 0.22);
      const lean = rng.uniform(-w * 0.3, w * 0.3);
      const shade = rng.integers(2, 12);
      elements.push({
        type: 'trees',
        worldX,
        y: horizonY,
        width: w,
        height: h,
        shade,
        lean,
      });
    }
  } else if (foreground === 'ruins') {
    const count = rng.integers(1, 5);
    for (let i = 0; i < count; i++) {
      const localX = attractorX(rng, CHUNK_WIDTH, focusX, 0.20);
      const worldX = chunkIndex * CHUNK_WIDTH + localX;
      const h = rng.uniform(height * 0.03, height * 0.24);
      const w = rng.uniform(CHUNK_WIDTH * 0.02, CHUNK_WIDTH * 0.08);
      const shade = rng.integers(2, 12);
      const hasPeak = rng.random() >= 0.72;
      const peakOffset = hasPeak ? rng.uniform(-w * 0.2, w * 0.2) : 0;
      elements.push({
        type: 'ruins',
        worldX,
        y: horizonY,
        width: w,
        height: h,
        shade,
        hasPeak,
        peakOffset,
      });
    }
  } else if (foreground === 'spikes') {
    const count = rng.integers(4, 11);
    for (let i = 0; i < count; i++) {
      const localX = attractorX(rng, CHUNK_WIDTH, focusX, 0.22);
      const worldX = chunkIndex * CHUNK_WIDTH + localX;
      const h = rng.uniform(height * 0.06, height * 0.38);
      const tilt = rng.uniform(-0.25, 0.25);
      const w = rng.uniform(CHUNK_WIDTH * 0.02, CHUNK_WIDTH * 0.08);
      const shade = rng.integers(3, 16);
      elements.push({
        type: 'spikes',
        worldX,
        y: horizonY,
        width: w,
        height: h,
        shade,
        tilt,
      });
    }
  }

  return elements;
}

export function createBirdFlock(
  rng: Rng,
  screenWidth: number,
  screenHeight: number,
  horizonY: number
): BirdFlock {
  const startX = rng.uniform(-screenWidth * 0.1, screenWidth * 0.25);
  const endX = rng.uniform(screenWidth * 0.75, screenWidth * 1.1);
  const startY = rng.uniform(screenHeight * 0.25, horizonY * 0.75);
  const endY = rng.uniform(screenHeight * 0.25, horizonY * 0.75);
  const ctrlX = rng.uniform(screenWidth * 0.35, screenWidth * 0.65);
  const ctrlY = rng.uniform(screenHeight * 0.10, horizonY * 0.55);

  const minDim = Math.min(screenWidth, screenHeight);
  const n = rng.integers(15, 26);
  const lineWidth = Math.max(2, Math.round(minDim * 0.003));
  const speed = rng.uniform(1 / 45, 1 / 30);

  const birds: BirdFlock['birds'] = [];
  for (let i = 0; i < n; i++) {
    const t = rng.beta(1.8, 1.8);
    const jitterX = rng.normal(0, screenWidth * 0.025);
    const jitterY = rng.normal(0, screenHeight * 0.04);
    const size = minDim * rng.uniform(0.010, 0.022);
    const tilt = rng.uniform(-0.25, 0.25);
    const shade = rng.integers(2, 20);
    birds.push({ t, jitterX, jitterY, size, tilt, shade });
  }

  return {
    startX,
    startY,
    endX,
    endY,
    ctrlX,
    ctrlY,
    birds,
    lineWidth,
    speed,
  };
}

export function createShards(
  rng: Rng,
  count: number,
  screenWidth: number,
  screenHeight: number,
  horizonY: number
): ShardElement[] {
  const shards: ShardElement[] = [];
  const minDim = Math.min(screenWidth, screenHeight);
  for (let i = 0; i < count; i++) {
    const worldX = rng.uniform(0, screenWidth);
    const y = rng.uniform(screenHeight * 0.05, horizonY * 0.9);
    const size = rng.uniform(minDim * 0.005, minDim * 0.022);
    const angle = rng.uniform(0, 2 * Math.PI);
    const shade = rng.integers(10, 35);
    shards.push({
      worldX,
      y,
      size,
      angle,
      shade,
    });
  }
  return shards;
}

export function finish(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  rng: Rng,
  vignetteStrength = 0.07,
  levels = 24
): void {
  const step = 255 / (levels - 1);
  const halfW = w / 2;
  const halfH = h / 2;
  for (let y = 0; y < h; y++) {
    const bayerRow = (y & 7) * 8;
    const yn = (y - halfH) / halfH;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const threshold = BAYER8[bayerRow + (x & 7)];
      let v = rgba[i] + rng.normal(0, 2);
      v = Math.round(v / step + (threshold - 0.5)) * step;
      const xn = (x - halfW) / halfW;
      const r2 = xn * xn + yn * yn;
      const vig = Math.max(0, Math.min(1, 1 - vignetteStrength * r2));
      v = Math.max(0, Math.min(255, v * vig));
      rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
    }
  }
}

export interface Field {
  w: number;
  h: number;
  data: Float32Array;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

// Fast Simplex 3D Noise implementation
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  p[i] = Math.floor(Math.random() * 256);
}

const perm = new Uint8Array(512);
const permMod12 = new Uint8Array(512);

for (let i = 0; i < 512; i++) {
  perm[i] = p[i & 255];
  permMod12[i] = perm[i] % 12;
}

const grad3 = new Float32Array([
  1, 1, 0,  -1, 1, 0,   1,-1, 0,  -1,-1, 0,
  1, 0, 1,  -1, 0, 1,   1, 0,-1,  -1, 0,-1,
  0, 1, 1,   0,-1, 1,   0, 1,-1,   0,-1,-1
]);

export function simplex3D(xin: number, yin: number, zin: number): number {
  let n0: number, n1: number, n2: number, n3: number;
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const z0 = zin - Z0;

  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;

  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
    n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
  }

  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
    n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
  }

  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
    n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
  }

  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) n3 = 0.0;
  else {
    t3 *= t3;
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
    n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
  }

  return 32.0 * (n0 + n1 + n2 + n3);
}

export function valueNoise2D(
  w: number,
  h: number,
  scale: number,
  rng: { random(): number }
): Field {
  const gh = Math.max(2, Math.floor(h / scale) + 2);
  const gw = Math.max(2, Math.floor(w / scale) + 2);
  const grid = new Float32Array(gh * gw);
  for (let i = 0; i < grid.length; i++) grid[i] = rng.random();
  const out = new Float32Array(w * h);
  const sy = (gh - 1) / Math.max(1, h - 1);
  const sx = (gw - 1) / Math.max(1, w - 1);
  for (let y = 0; y < h; y++) {
    const fy = y * sy;
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, gh - 1);
    const ty = smooth(fy - y0);
    for (let x = 0; x < w; x++) {
      const fx = x * sx;
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, gw - 1);
      const tx = smooth(fx - x0);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x1];
      const c = grid[y1 * gw + x0];
      const d = grid[y1 * gw + x1];
      const top = a * (1 - tx) + b * tx;
      const bot = c * (1 - tx) + d * tx;
      out[y * w + x] = top * (1 - ty) + bot * ty;
    }
  }
  return { w, h, data: out };
}

export function fbm2D(
  w: number,
  h: number,
  scale: number,
  octaves: number,
  rng: { random(): number }
): Field {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0, s = scale;
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise2D(w, h, s, rng).data;
    for (let i = 0; i < out.length; i++) out[i] += amp * layer[i];
    total += amp; amp *= 0.5; s *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return { w, h, data: out };
}

export function fbm1D(
  length: number,
  scale: number,
  octaves: number,
  rng: { random(): number }
): Float32Array {
  const out = new Float32Array(length);
  let amp = 1, total = 0, s = scale;
  for (let o = 0; o < octaves; o++) {
    const nPts = Math.max(2, Math.floor(length / s) + 2);
    const pts = new Float32Array(nPts);
    for (let i = 0; i < nPts; i++) pts[i] = rng.random();
    const step = (nPts - 1) / Math.max(1, length - 1);
    for (let x = 0; x < length; x++) {
      const fx = x * step;
      const i0 = Math.floor(fx);
      const i1 = Math.min(i0 + 1, nPts - 1);
      const t = smooth(fx - i0);
      out[x] += amp * (pts[i0] * (1 - t) + pts[i1] * t);
    }
    total += amp; amp *= 0.5; s *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function normalizeInPlace(data: Float32Array): void {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1e-9;
  for (let i = 0; i < data.length; i++) data[i] = (data[i] - min) / range;
}

export const BAYER8 = new Float32Array([
  0, 32, 8, 40, 2, 34, 10, 42,  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,  63, 31, 55, 23, 61, 29, 53, 21,
].map(v => v / 64));

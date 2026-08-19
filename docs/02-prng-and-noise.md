# 02: Seedable PRNG & Procedural Noise

Procedural generation requires reproducible randomness. Standard `Math.random()` cannot be seeded, meaning a generated scene could never be re-created or shared. In this chapter, we build a custom seedable random number generator and a collection of noise utilities.

## The Seedable PRNG (Mulberry32)

We implement the `Rng` class in `src/utils/genscapeGenerator.ts`. It uses Mulberry32, a fast 32-bit pseudo-random number generator.

```typescript
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
}
```

The unsigned right-shift operator `>>> 0` forces integer values into 32-bit unsigned bounds.

### Gaussian Normal Distribution (Box-Muller Transform)

To generate natural clusters (like tree density or star positions), uniform randomness is insufficient. We implement Gaussian distribution via the Box-Muller transform.

```typescript
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
```

The Box-Muller algorithm transforms two independent uniform random numbers (`u1` and `u2`) into two independent standard normal random variables (`z0` and `z1`). We return `z0` and store `z1` in `this.spare` for the next call.

### Beta Distribution (Jöhnk's Algorithm)

For flocking bird distribution, we need values clustered around a center parameter $t \in [0, 1]$. We use Jöhnk's rejection sampling algorithm for Beta(a, b).

```typescript
  beta(a: number, b: number): number {
    while (true) {
      const u = Math.pow(this.random(), 1 / a);
      const v = Math.pow(this.random(), 1 / b);
      const s = u + v;
      if (s > 0 && s <= 1) return u / s;
    }
  }
```

When `a = 1.8` and `b = 1.8`, the Beta distribution forms a bell-like curve bounded strictly inside `[0, 1]`.

## Procedural Noise Utilities (`src/utils/noise.ts`)

Noise functions provide smooth spatial continuity.

### Simplex 3D Noise

Simplex 3D noise evaluates 3D coordinates `(x, y, z)` and returns a smooth continuous value in `[-1, 1]`. We use it for continuous mountain terrain profiles, atmospheric fog, and speed modulation.

### 2D Value Noise & Fractional Brownian Motion (fBm)

For background sky haze and ground shading, we combine multiple octaves of value noise. Value noise interpolates pseudo-random grid values using a cubic smoothstep function: $t^2(3 - 2t)$.

```typescript
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(w: number, h: number, scale: number, rng: Rng): Field {
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
```

Fractional Brownian Motion (`fbm2D`) sums multiple octaves of noise at increasing frequencies and decreasing amplitudes.

```typescript
export function fbm2D(w: number, h: number, scale: number, octaves: number, rng: Rng): Field {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0, s = scale;
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise2D(w, h, s, rng).data;
    for (let i = 0; i < out.length; i++) out[i] += amp * layer[i];
    total += amp;
    amp *= 0.5;
    s *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return { w, h, data: out };
}
```

### The 8x8 Bayer Dithering Matrix

To create the illustrated halftone finish, we define an 8x8 Bayer matrix normalized to `[0, 1)`.

```typescript
export const BAYER8 = new Float32Array([
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map(v => v / 64));
```

In Chapter 3, we will use this Bayer matrix to apply an ordered dithering pass across the sky buffer.

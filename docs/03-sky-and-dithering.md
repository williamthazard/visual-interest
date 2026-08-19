# 03: The Sky Buffer & Finish Pass

This chapter covers building the atmospheric sky layer and applying the post-processing finish pass.

## The Float Accumulation Buffer

Standard HTML5 Canvas drawing operates on 8-bit color bytes `[0, 255]`. For sky composition, we accumulate values in a floating-point array (`Float32Array(w * h)`). Floats tolerate overlapping additions, negative intermediate values, and scalar scaling without dynamic range loss.

```typescript
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
  sky.fill(16); // Deep obsidian base value (16/255)
```

### Sky Haze & Ground Blending

We layer large-scale fBm haze across the sky and blend ground noise below the horizon line.

```typescript
  // Sky haze: scale = max(w,h) / 1.5, 4 octaves
  const skyHaze = fbm2D(w, h, Math.max(w, h) / 1.5, 4, rng);
  normalizeInPlace(skyHaze.data);
  for (let i = 0; i < sky.length; i++) {
    sky[i] += skyHaze.data[i] * 22; // Adds 0 to 22 brightness
  }

  // Ground noise: smoothstep blended near horizonY
  const groundNoise = fbm2D(w, h, Math.max(w, h) / 3.0, 4, rng);
  normalizeInPlace(groundNoise.data);
  const band = h * 0.06;
  const bandStart = horizonY - band;
  const groundSpan = Math.max(1, h - horizonY);

  for (let y = 0; y < h; y++) {
    const bottomDist = Math.max(0, Math.min(1, (y - horizonY) / groundSpan));
    const blendT = Math.max(0, Math.min(1, (y - bandStart) / band));
    const blend = blendT * blendT * (3 - 2 * blendT); // Smoothstep
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const gn = groundNoise.data[rowOff + x];
      const groundVal = 8 + gn * 10 - bottomDist * 3;
      sky[rowOff + x] = sky[rowOff + x] * (1 - blend) + groundVal * blend;
    }
  }
```

### Gaussian Moon & Star Field

Rather than drawing a hard-edged circle with canvas context primitives, the moon is painted onto the float buffer as two 2D Gaussian bell curves:

1. A small, intense disc ($160 \cdot e^{-d^2 / 2\sigma_1^2}$).
2. A wide, soft aura glow ($45 \cdot e^{-d^2 / 2\sigma_2^2}$).

```typescript
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
```

Stars are stamped as bright single pixels above the horizon line:

```typescript
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
```

After populating the float buffer, we flush it to the canvas context via `putImageData`.

```typescript
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
```

## The Finish Pass (Bayer Dithering & Vignette)

The `finish` function executes post-processing pixel manipulation on the RGBA byte array.

```typescript
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
      
      // 1. Film grain noise
      let v = rgba[i] + rng.normal(0, 2);
      
      // 2. Quantize with Bayer 8x8 dither threshold
      v = Math.round(v / step + (threshold - 0.5)) * step;
      
      // 3. Radial Vignette (corner darkening)
      const xn = (x - halfW) / halfW;
      const r2 = xn * xn + yn * yn;
      const vig = Math.max(0, Math.min(1, 1 - vignetteStrength * r2));
      v = Math.max(0, Math.min(255, v * vig));
      
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
    }
  }
}
```

The quantization line `v = Math.round(v / step + (threshold - 0.5)) * step` maps smooth color gradients into 24 distinct gray levels, using the Bayer matrix to alternate adjacent pixel values. This produces the signature printmaking halftone texture.

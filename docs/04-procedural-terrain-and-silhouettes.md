# 04: Terrain, Silhouettes & Composition

Once the sky layer is rendered, we draw foreground silhouettes and mountain ridges over the canvas.

## Compositional Placement (`attractorX`)

Uniform random placement (`rng.uniform(0, width)`) distributes objects evenly, which human eyes read as flat wallpaper texture rather than a composed landscape. Real landscapes feature focal density.

We implement `attractorX` to cluster elements around a compositional focus point:

```typescript
export function attractorX(
  rng: Rng,
  width: number,
  focusX: number,
  spread = 0.22,
  framingP = 0.25
): number {
  if (rng.random() < framingP) {
    return rng.uniform(-width * 0.05, width * 1.05);
  }
  return focusX + rng.normal(0, width * spread);
}
```

75% of the time, placement is sampled from a Gaussian Normal distribution centered on `focusX`. 25% of the time, placement is sampled uniformly across the screen to ensure edge framing.

## Mountain Ridge Generation

Mountains are rendered as stacked ridge profiles with depth-dependent shading (atmospheric perspective).

```typescript
export function createRidgeConfigs(rng: Rng, height: number, horizonY: number): RidgeConfig[] {
  const nRidges = rng.integers(2, 5);
  const configs: RidgeConfig[] = [];
  for (let i = 0; i < nRidges; i++) {
    const depth = i / Math.max(1, nRidges - 1); // 0 = far, 1 = near
    const shade = Math.round(24 - depth * 18);  // Far ridges lighter, near darker
    const amplitude = height * (0.08 + depth * 0.18);
    const scrollFactor = 0.15 + depth * 0.35;    // Far ridges scroll slower
    const scale = rng.uniform(0.0015, 0.0035);
    const baseY = horizonY - depth * height * 0.03;
    configs.push({ baseY, amplitude, scale, shade, scrollFactor, index: i });
  }
  return configs;
}
```

During rendering, each mountain ridge evaluates 3D Simplex noise at scrolling world coordinates:

```typescript
for (let screenCol = 0; screenCol <= w + step; screenCol += step) {
  const wx = worldX * ridge.scrollFactor + screenCol;
  const n1 = simplex3D(wx * ridge.scale, ridge.index * 10, seed * 0.01);
  const n2 = simplex3D(wx * ridge.scale * 2.5, ridge.index * 20, seed * 0.02) * 0.5;
  const y = ridge.baseY - Math.abs(n1 + n2) * ridge.amplitude;
  // Build line path
}
```

## Polygon Painters

Foreground silhouettes are drawn using `fillPolygon`.

```typescript
export function gray(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${v},${v},${v})`;
}

export function fillPolygon(ctx: CanvasRenderingContext2D, pts: [number, number][], shade: number) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = gray(shade);
  ctx.fill();
}
```

### Pine Trees
Pine trees are rendered as slender triangles with wind lean:

```typescript
fillPolygon(
  ctx,
  [
    [screenX + lean, el.y - el.height],
    [screenX + el.width, el.y],
    [screenX - el.width, el.y],
  ],
  el.shade
);
```

### Ruins
Ruins are drawn as rectangular monoliths, occasionally featuring peaked roofs:

```typescript
if (!el.hasPeak) {
  fillPolygon(ctx, [
    [screenX - bW / 2, el.y],
    [screenX - bW / 2, el.y - bH],
    [screenX + bW / 2, el.y - bH],
    [screenX + bW / 2, el.y],
  ], el.shade);
}
```

### Spikes
Spikes are tilted pointed shapes extending down to the bottom of the viewport.

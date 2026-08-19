# 05: World Traversal & Naturalistic Motion

This chapter covers animating the landscape as an infinite scrolling world.

## Infinite Traversal Architecture

The camera position is stored in `state.worldX`. Rather than pre-generating an entire world map, terrain elements are deterministically spawned in fixed-width chunks (`CHUNK_WIDTH = 400`).

```typescript
export function spawnChunkElements(
  chunkIndex: number,
  worldSeed: number,
  _defaultForeground: Foreground,
  height: number,
  horizonY: number
): ForegroundElement[] {
  // Deterministic seed per chunk
  const chunkSeed = (worldSeed * 2654435761 + chunkIndex * 2246822519) >>> 0;
  const rng = new Rng(chunkSeed);

  // Dynamic biome region selection
  const foregroundTypes: Foreground[] = ['trees', 'trees', 'ruins', 'spikes', 'mountains'];
  const foreground = rng.choice(foregroundTypes);
  // ... spawn chunk elements ...
}
```

As `worldX` advances, chunks entering the screen boundaries are evaluated and spawned, while elements scrolling off-screen left are pruned.

## Depth Parallax

Each rendering layer moves at a fraction of `worldX`:

- Static Sky & Moon: $0.0 \times \text{worldX}$
- Far Mountains: $0.15 \times \text{worldX}$
- Mid Mountains: $0.30 \times \text{worldX}$
- Near Mountains: $0.50 \times \text{worldX}$
- Foreground Elements: $1.00 \times \text{worldX}$

## Naturalistic Speed Modulation

To prevent mechanical sidescrolling, speed is continuously modulated using multi-scale noise.

```typescript
const timeSec = now / 1000;

// 1. Micro-variance: subtle wind speed fluctuations (±20%, period ~30-60s)
const windNoise = simplex3D(timeSec * 0.02, seed * 0.05, 0);
const microSpeed = 1.0 + windNoise * 0.2;

// 2. Macro-variance: gentle scenic pauses & slow-downs (period ~2-4 minutes)
const macroNoise = simplex3D(timeSec * 0.005, seed * 0.1, 100);
let macroSpeed = 1.0;
if (macroNoise < -0.15) {
  const dip = Math.min(1, (-0.15 - macroNoise) / 0.5);
  const smoothDip = dip * dip * (3 - 2 * dip); // Cubic smoothstep
  macroSpeed = 1.0 - smoothDip * 0.98;         // Dips smoothly down to 0.02 (scenic linger)
}

const currentSpeed = 10 * microSpeed * macroSpeed;
state.worldX += currentSpeed * dt;
```

Because `simplex3D` is continuous, acceleration changes without jerk or step changes. Movement slows to a near-stop during scenic linger phases, then gently resumes cruising speed.

## Flocks of Birds & Digital Glitch

### Bird Flocks
Bird flocks appear periodically, flying along a quadratic Bézier curve $P(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$. Bird spacing along $t$ is sampled from Beta(1.8, 1.8) distribution, clustering birds naturally toward the center of the flock.

### Digital Glitch
Every few minutes, a brief scanline glitch triggers for ~0.5 seconds, shifting a horizontal slice of the canvas and overlaying a subtle noise line before resolving.

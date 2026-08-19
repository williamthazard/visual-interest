# Repository Guidelines

## Project Overview

Animated generative night landscape SPA inspired by [williamthazard/genscape](https://github.com/williamthazard/genscape). Renders a slowly-scrolling procedural scene: Bayer-dithered grayscale sky, Gaussian moon glow, layered mountain ridges, and foreground silhouettes (trees, ruins, spikes, or mountains). The viewer drifts through an infinite world at a meditative pace. Alternate mode: Simplex noise particle flow field with color palette morphing.

## Architecture & Data Flow

```
index.html → src/main.tsx → App.tsx → GenscapeCanvas.tsx
                                            │
                                ┌───────────┴───────────┐
                           noise.ts              genscapeGenerator.ts
                        (simplex3D,              (Rng, sky rendering,
                         fbm2D/1D,               silhouettes, spawning,
                         BAYER8)                  finish pass)
```

### Rendering Pipeline (matches original Genscape)

1. **Float buffer sky** (done once per seed/resize):
   - `Float32Array(w×h)` filled with base value 16
   - fbm2D haze added (+22 brightness range)
   - Ground noise smoothstep-blended below `horizonY`
   - Moon painted as two Gaussians on float buffer (disc + aura) — NOT a Canvas arc
   - Stars stamped as bright pixels
   - Flushed to canvas via `putImageData`
   - Finish pass: 8×8 Bayer dithering, Gaussian grain, radial vignette

2. **Per-frame animation** (requestAnimationFrame loop):
   - Composite static sky layer
   - Draw mountain ridges via continuous simplex noise at scrolling world coordinates
   - Draw chunk-spawned foreground elements (trees/ruins/spikes) at scrolled positions
   - Rare bird flocks along Bézier arcs
   - Vignette overlay

### World Traversal System

- `worldX` advances at ~10 px/sec (foreground layer takes ~3 minutes to cross screen)
- Depth parallax: far mountains 0.15×, mid 0.3×, near 0.5×, foreground 1.0×
- Terrain spawned from deterministic chunks (seed + chunk index → Rng)
- Mountains are continuous (noise-evaluated each frame), not pre-generated arrays

## Key Directories

| Path | Purpose |
|---|---|
| `src/components/` | Canvas components: `GenscapeCanvas.tsx` (active), `FlowFieldCanvas.tsx` (alternate) |
| `src/utils/` | Pure functions: noise (`noise.ts`), scene generation (`genscapeGenerator.ts`), color palettes (`palettes.ts`) |
| `docs/superpowers/plans/` | Implementation plans (agentic worker format) |
| `docs/superpowers/specs/` | Design specs |
| `dist/` | Vite production build output |

## Development Commands

```bash
npm install          # Install dependencies (npm lockfile)
npm run dev          # Vite dev server on port 3000
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run build:saver  # Build native macOS Genscape.saver bundle
npm run install:saver# Build and open Genscape.saver for macOS installation
```
No lint or test scripts configured.

## Code Conventions & Common Patterns

### Language & Style
- **TypeScript** with strict mode, `.tsx` / `.ts` extensions
- **ES modules** (`"type": "module"` in package.json)
- `react-jsx` transform (no `import React` needed in components)
- `export default function ComponentName()` for React components
- Helper functions as standalone module-level functions
- Semicolons, single quotes in config files

### Canvas Animation Pattern
```tsx
export default function CanvasComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ /* all mutable animation state */ });

  useEffect(() => {
    // Sky layer: render to offscreen canvas (done once)
    // Animation loop: requestAnimationFrame
    // Event listeners
    // Cleanup: cancel RAF, remove listeners
  }, [seed]);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh', cursor: 'none' }} />;
}
```

### Rendering Patterns
- **Float buffer accumulation**: sky built in `Float32Array`, flushed via `putImageData`
- **Gaussian light sources**: `exp(-d²/2σ²)` on float buffer — no Canvas arcs for moon
- **Simple polygon silhouettes**: `fillPolygon(ctx, pts, shade)` with `gray(n)` → `rgb(v,v,v)`
- **Compositional placement**: `attractorX()` clusters elements around a focus point (Gaussian + uniform mix)
- **Bayer dithering**: 8×8 ordered dithering matrix quantizes to 24 gray levels
- **No React re-renders during animation**: all mutable state in `useRef`

### Grayscale Constraint
ALL rendering uses `gray(n)` returning `rgb(v,v,v)`. No color tints, no rgba with color channels. Shades: sky 16–38, ground 5–18, silhouettes 2–24, stars 80–170, moon up to ~176.

### Seeded Determinism
- `Rng` class (Mulberry32 core) with `random()`, `uniform()`, `integers()`, `normal()`, `beta()`, `choice()`
- Same seed → same sky, same terrain character, same element placement
- Chunk spawning uses deterministic hash: `(worldSeed * 2654435761 + chunkIndex * 2246822519) >>> 0`

## Important Files

| File | Role |
|---|---|
| `src/main.tsx` | React 18 entry point, `createRoot` |
| `src/App.tsx` | Mounts active canvas component |
| `src/components/GenscapeCanvas.tsx` | **Active** — scrolling night landscape animation |
| `src/components/FlowFieldCanvas.tsx` | Alternate — Simplex noise flow field |
| `src/utils/noise.ts` | `simplex3D`, `fbm2D`, `fbm1D`, `valueNoise2D`, `normalizeInPlace`, `BAYER8` |
| `src/utils/genscapeGenerator.ts` | `Rng`, `renderSkyLayer`, `spawnChunkElements`, `createBirdFlock`, `finish`, silhouette drawing, type definitions |
| `src/utils/palettes.ts` | Color palettes for FlowFieldCanvas only |
| `tsconfig.json` | TypeScript strict config, `react-jsx`, ES2020 target |
| `vite.config.ts` | Vite + React plugin, dev server port 3000 (`base: './'`) |
| `native/GenscapeView.m` | Native Objective-C ScreenSaverView wrapper (WebKit host) |
| `scripts/build-saver.sh` | Shell script compiling standalone `Genscape.saver` |
| `Genscape.saver` | Native macOS Screen Saver bundle |
## Runtime & Tooling Preferences

- **Runtime**: Node.js
- **Package manager**: npm (`package-lock.json`)
- **Bundler**: Vite 5 with `@vitejs/plugin-react`
- **Language**: TypeScript ~5.5 (strict mode)
- **Framework**: React 18
- **No ESLint, Prettier, or CI/CD** configured
- **Zero external runtime deps** beyond React — noise, PRNG, dithering all hand-rolled

## Testing & QA

No test framework configured. Verification is visual:

- `npm run dev` → inspect canvas rendering in browser
- `npm run typecheck` → verify TypeScript compilation
- Press `Space` to regenerate (different foreground/focal/drift per seed)
- Press `F` or double-click for fullscreen
- Confirm slow scrolling (~3 min for foreground to cross screen)
- Confirm grayscale-only rendering, Bayer dithering texture, Gaussian moon

To switch between visual modes, change the import in `src/App.tsx`:
```tsx
// Genscape (current):
import GenscapeCanvas from './components/GenscapeCanvas';

// Flow field:
import FlowFieldCanvas from './components/FlowFieldCanvas';
```

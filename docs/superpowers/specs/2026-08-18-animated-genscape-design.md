# Animated Genscape Spec

## Overview
A subtle, meditative single-page web application that renders procedural, animated night scenes inspired by Genscape. Restrained grayscale aesthetic featuring layered mist haze, focal elements (moon or pure night), procedural foreground silhouettes (pine trees swaying in wind, mountain ranges, ruins, spikes), and midground drift (flocking birds or glowing embers). Fully animated with naturalistic, noise-driven movement.

## Tech Stack & Architecture
- **Framework**: React + Vite
- **Language**: JavaScript (ES modules)
- **Styling**: Vanilla CSS (full bleed canvas, `#050508` dark background, overflow hidden)
- **Rendering**: Canvas 2D Context with `requestAnimationFrame` and layered rendering routines.
- **Algorithms**:
  - 2D/3D Simplex/Perlin noise for atmospheric fog, mist, and wind fields.
  - Swaying math (`sin` + noise) for tree branches.
  - Procedural mountain terrain generator (midpoint displacement / noise heightmap).
  - Boids algorithm for flocking birds and particle drift.

## Requirements & Constraints
1. **Strictly Grayscale Palette**:
   - Deep obsidian background (`#050508`).
   - Layered monochrome tones (`rgba(255, 255, 255, alpha)` and grey midtones).
   - No color tints.
2. **Focal Elements**:
   - Moon variants (Full Moon with glowing corona halo, Crescent Moon, Eclipse Moon) or No Focal (pure starry night sky).
   - NO seam effect.
3. **Foreground Silhouettes & Dynamics**:
   - **Pine Trees**: Procedurally rendered conifers whose tops and branches sway gently in wind noise.
   - **Mountains**: Multiple layered mountain silhouettes with valley mist.
   - **Ruins & Spikes**: Monolithic structures and geometric spires with subtle ambient rim lighting.
4. **Midground Drift**:
   - **Birds**: Flocks of birds gliding across the sky in natural V-formations or fluid flocks.
   - **Embers / Stardust**: Delicate floating particles rising on thermal currents.
5. **Interactive Touches**:
   - **Spacebar**: Smoothly cross-fade to a newly generated scene (new seed/topology/composition).
   - **Mouse Move**: Subtle 3D parallax depth shift across background, focal moon, midground, and foreground.
   - **Key F / Double Click**: Toggle browser fullscreen.
   - Zero on-screen text or buttons by default.

## File Boundaries & Responsibilities
- `src/utils/noise.js`: Simplex 2D/3D noise generator.
- `src/utils/genscapeGenerator.js`: Generates random scene parameters (seed, landscape type, moon type, drift type, mountain heightmaps, tree positions).
- `src/components/GenscapeCanvas.jsx`: Main HTML5 canvas renderer executing the 60fps animation loop, rendering sky, moon, mountain/tree layers, mist, and particle drift with mouse parallax.
- `src/App.jsx`: Main SPA entry point mounting `GenscapeCanvas`.

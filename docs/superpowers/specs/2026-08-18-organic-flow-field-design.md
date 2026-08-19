# Organic Perlin Noise Flow Field Spec

## Overview
A subtle, meditative single-page web application (React SPA with HTML5 Canvas) designed for second-screen ambient viewing. Features dynamic organic flow field animation powered by 3D Simplex/Perlin noise with continuous silk particle trails and morphing color palettes. Completely textless interface with subtle mouse interactions and hotkeys.

## Tech Stack & Architecture
- **Framework**: React + Vite
- **Language**: JavaScript (ES modules)
- **Styling**: Vanilla CSS (full bleed canvas, dark background, overflow hidden)
- **Rendering**: Canvas 2D Context with `requestAnimationFrame` and low-opacity trail clearing (`rgba(10, 10, 15, 0.04)`).
- **Noise Generator**: Fast 3D Simplex/Perlin noise implementation.

## Features & Requirements
1. **Zero Text UI**: The application renders pure visual art across the entire viewport by default.
2. **Particle Flow Field**:
   - 5,000 active particles.
   - Vector field calculated via 3D noise `(x * scale, y * scale, time * timeScale)` mapped to an angle `[0, 2π * 2]`.
   - Smooth velocity updates with speed cap.
   - Particles wrap around screen edges or re-initialize with random positions upon lifetime expiry.
3. **Color Palette Morph Engine**:
   - Smooth transitions between 5 curated dark, meditative color palettes:
     1. **Deep Aurora**: Emerald green, violet, electric teal, indigo.
     2. **Ocean Abyss**: Deep sapphire, cyan, translucent turquoise, slate.
     3. **Ethereal Twilight**: Dusk purple, warm magenta, soft amber, midnight blue.
     4. **Forest Mist**: Sage, moss, muted gold, shadow green.
     5. **Solar Nebula**: Deep crimson, warm copper, glowing gold, plum.
   - Interpolates RGB values smoothly over ~30 seconds per palette or instantly on `Space` press.
4. **Interactive Features (Subtle)**:
   - **Mouse Move**: Gentle repulsive / tangential swirl effect around cursor position.
   - **Keyboard Shortcuts**:
     - `Space`: Transition to next palette.
     - `KeyF` / `Double Click`: Toggle browser fullscreen.
     - `KeyR`: Soft reset of particle distribution.

## System Interfaces & Boundaries
- `src/utils/noise.js`: Provides `simplex3D(x, y, z)` returning noise value in `[-1, 1]`.
- `src/utils/palettes.js`: Contains color palettes and RGB interpolation functions.
- `src/components/FlowFieldCanvas.jsx`: Manages HTML5 Canvas reference, animation loop, resize handler, input event listeners.
- `src/App.jsx`: Main SPA entry point mounting `FlowFieldCanvas`.

# Animated Genscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a serene, animated grayscale generative night landscape SPA inspired by Genscape, featuring drifting fog, a glowing moon, swaying pine trees, layered mountains, flocking birds, and subtle mouse parallax.

**Architecture:** Vite + React + HTML5 Canvas. A multi-layered rendering engine draws a deep night sky with stars, an animated glowing moon, noise-driven drifting mist, mountain silhouettes, swaying pine trees, and boid flocking birds. Pure grayscale aesthetic, zero text UI.

**Tech Stack:** React 18, Vite, Canvas 2D, JavaScript ES modules, Simplex Noise.

## Global Constraints
- Strictly grayscale palette (`#050508` dark background, white/silver/grey layers).
- NO "seam" focal element.
- Zero text visible on screen.
- Smooth 60fps rendering with batching & efficiency.

---

### Task 1: Implement Genscape Scene Generator Utility

**Files:**
- Create: `src/utils/genscapeGenerator.js`

**Interfaces:**
- Consumes: `simplex3D` from `src/utils/noise.js`.
- Produces: `createScene(seed)` function returning a complete scene config:
  - `seed`: number
  - `focalType`: `'moon'` | `'crescent'` | `'eclipse'` | `'none'`
  - `foregroundType`: `'trees'` | `'mountains'` | `'ruins'` | `'spikes'`
  - `driftType`: `'birds'` | `'embers'` | `'both'`
  - `moonPos`: `{ x, y, radius }`
  - `mountains`: array of mountain layer heightmaps
  - `trees`: array of tree objects `{ x, y, height, width, swayPhase }`
  - `birds`: array of bird boid objects `{ x, y, vx, vy, wingPhase }`
  - `embers`: array of ember particle objects `{ x, y, vx, vy, size, alpha }`
  - `stars`: array of star objects `{ x, y, size, twinklePhase }`

- [ ] **Step 1: Write src/utils/genscapeGenerator.js**

```javascript
import { simplex3D } from './noise.js';

// Seedable PRNG (Mulberry32)
function createRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createScene(seed = Math.floor(Math.random() * 1000000), width = 1920, height = 1080) {
  const rand = createRandom(seed);

  // 1. Focal Type (No seam!)
  const focalOptions = ['moon', 'crescent', 'eclipse', 'none', 'moon'];
  const focalType = focalOptions[Math.floor(rand() * focalOptions.length)];

  // Moon Position
  const moonX = width * (0.25 + rand() * 0.5);
  const moonY = height * (0.2 + rand() * 0.25);
  const moonRadius = 45 + rand() * 45;

  // 2. Foreground Type
  const fgOptions = ['trees', 'mountains', 'ruins', 'spikes', 'trees'];
  const foregroundType = fgOptions[Math.floor(rand() * fgOptions.length)];

  // 3. Drift Type
  const driftOptions = ['birds', 'embers', 'both', 'birds'];
  const driftType = driftOptions[Math.floor(rand() * driftOptions.length)];

  // 4. Stars (150-250 stars)
  const starCount = Math.floor(150 + rand() * 100);
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: rand() * width,
      y: rand() * (height * 0.7),
      size: rand() * 1.5 + 0.5,
      twinkleSpeed: rand() * 0.02 + 0.005,
      phase: rand() * Math.PI * 2
    });
  }

  // 5. Mountain Ridges (3 layers: back, mid, front)
  const mountainLayers = [];
  const layerConfigs = [
    { baseHeight: height * 0.55, roughness: 180, scale: 0.0015 },
    { baseHeight: height * 0.68, roughness: 140, scale: 0.0025 },
    { baseHeight: height * 0.82, roughness: 100, scale: 0.004 }
  ];

  for (let l = 0; l < 3; l++) {
    const cfg = layerConfigs[l];
    const points = [];
    const step = 8;
    for (let x = 0; x <= width + step; x += step) {
      const n1 = simplex3D(x * cfg.scale, l * 10, seed * 0.01);
      const n2 = simplex3D(x * cfg.scale * 2.5, l * 20, seed * 0.02) * 0.5;
      const y = cfg.baseHeight - Math.abs(n1 + n2) * cfg.roughness;
      points.push({ x, y });
    }
    mountainLayers.push(points);
  }

  // 6. Pine Trees
  const treeCount = Math.floor(60 + rand() * 60);
  const trees = [];
  for (let i = 0; i < treeCount; i++) {
    const tx = rand() * width;
    // Find mountain height at tx
    const groundY = height * 0.72 + (rand() - 0.5) * 120;
    const treeHeight = 40 + rand() * 90;
    const treeWidth = treeHeight * (0.35 + rand() * 0.2);
    trees.push({
      x: tx,
      y: groundY,
      height: treeHeight,
      width: treeWidth,
      swayPhase: rand() * Math.PI * 2,
      swaySpeed: 0.01 + rand() * 0.015,
      layer: rand() > 0.4 ? 1 : 2 // depth layer
    });
  }
  // Sort trees by Y so back trees render behind front trees
  trees.sort((a, b) => a.y - b.y);

  // 7. Ruins / Spikes structures
  const structures = [];
  const structCount = Math.floor(4 + rand() * 6);
  for (let i = 0; i < structCount; i++) {
    structures.push({
      x: (width / (structCount + 1)) * (i + 1) + (rand() - 0.5) * 150,
      y: height * 0.75 + (rand() - 0.5) * 80,
      width: 25 + rand() * 50,
      height: 90 + rand() * 180,
      tilt: (rand() - 0.5) * 0.15
    });
  }

  // 8. Boids Birds
  const birdCount = Math.floor(18 + rand() * 15);
  const birds = [];
  for (let i = 0; i < birdCount; i++) {
    birds.push({
      x: rand() * width,
      y: height * 0.2 + rand() * (height * 0.35),
      vx: 0.8 + rand() * 1.2,
      vy: (rand() - 0.5) * 0.4,
      size: 4 + rand() * 4,
      wingPhase: rand() * Math.PI * 2,
      wingSpeed: 0.12 + rand() * 0.08
    });
  }

  // 9. Floating Embers
  const emberCount = Math.floor(40 + rand() * 40);
  const embers = [];
  for (let i = 0; i < emberCount; i++) {
    embers.push({
      x: rand() * width,
      y: rand() * height,
      vx: (rand() - 0.5) * 0.5,
      vy: -0.3 - rand() * 0.6,
      size: 1 + rand() * 2.5,
      alpha: 0.2 + rand() * 0.6
    });
  }

  return {
    seed,
    focalType,
    moon: { x: moonX, y: moonY, radius: moonRadius },
    foregroundType,
    driftType,
    stars,
    mountainLayers,
    trees,
    structures,
    birds,
    embers
  };
}
```

---

### Task 2: Implement GenscapeCanvas Component

**Files:**
- Create: `src/components/GenscapeCanvas.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `createScene` from `src/utils/genscapeGenerator.js` and `simplex3D` from `src/utils/noise.js`.
- Produces: Complete 60fps grayscale animated canvas with swaying trees, drifting fog, glowing moon, boids birds, floating embers, and mouse parallax.

- [ ] **Step 1: Create src/components/GenscapeCanvas.jsx**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { createScene } from '../utils/genscapeGenerator.js';
import { simplex3D } from '../utils/noise.js';

export default function GenscapeCanvas() {
  const canvasRef = useRef(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const sceneRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    sceneRef.current = createScene(seed, window.innerWidth, window.innerHeight);
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let isCancelled = false;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      sceneRef.current = createScene(seed, width, height);
    };

    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      if (isCancelled || !sceneRef.current) return;
      const scene = sceneRef.current;
      time += 0.016;

      // Mouse Parallax Smooth Lerp
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const px = (mouse.x / width - 0.5) * 30;
      const py = (mouse.y / height - 0.5) * 20;

      // 1. Deep Obsidian Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#040406');
      skyGrad.addColorStop(0.5, '#0a0b10');
      skyGrad.addColorStop(1, '#12141c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Stars with Twinkle
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < scene.stars.length; i++) {
        const star = scene.stars[i];
        const alpha = 0.2 + 0.8 * Math.sin(time * star.twinkleSpeed * 10 + star.phase);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(star.x + px * 0.2, star.y + py * 0.2, star.size, star.size);
      }
      ctx.globalAlpha = 1.0;

      // 3. Moon (Focal Element - NO seam)
      if (scene.focalType !== 'none') {
        const mx = scene.moon.x + px * 0.4;
        const my = scene.moon.y + py * 0.4;
        const r = scene.moon.radius;

        // Moon Outer Glow / Corona
        const coronaGrad = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.5);
        coronaGrad.addColorStop(0, 'rgba(235, 240, 255, 0.25)');
        coronaGrad.addColorStop(0.4, 'rgba(180, 195, 220, 0.08)');
        coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(mx, my, r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Moon Body
        const moonGrad = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
        moonGrad.addColorStop(0, '#ffffff');
        moonGrad.addColorStop(0.7, '#e2e8f0');
        moonGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();

        // Crescent or Eclipse Shadow Overlay
        if (scene.focalType === 'crescent') {
          ctx.fillStyle = '#07080d';
          ctx.beginPath();
          ctx.arc(mx + r * 0.5, my - r * 0.2, r * 0.95, 0, Math.PI * 2);
          ctx.fill();
        } else if (scene.focalType === 'eclipse') {
          ctx.fillStyle = '#06070a';
          ctx.beginPath();
          ctx.arc(mx + r * 0.15, my + r * 0.1, r * 0.96, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Drifting Atmospheric Haze / Fog Layer (Back)
      const fogTime = time * 0.05;
      ctx.fillStyle = 'rgba(200, 210, 225, 0.025)';
      for (let y = height * 0.3; y < height; y += 40) {
        const noiseVal = simplex3D(y * 0.005, fogTime, 0);
        const fogX = (noiseVal * 200) + (px * 0.5);
        ctx.fillRect(fogX, y, width + 400, 35);
      }

      // 5. Back Mountain Layer
      if (scene.mountainLayers[0]) {
        drawMountainLayer(ctx, scene.mountainLayers[0], '#161922', px * 0.6, py * 0.6, width, height);
      }

      // 6. Mid Mountain Layer & Valley Mist
      if (scene.mountainLayers[1]) {
        drawMountainLayer(ctx, scene.mountainLayers[1], '#0e1017', px * 0.8, py * 0.8, width, height);
      }

      // 7. Ruins / Spikes (if selected)
      if (scene.foregroundType === 'ruins' || scene.foregroundType === 'spikes') {
        ctx.fillStyle = '#090a0f';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;

        for (let i = 0; i < scene.structures.length; i++) {
          const s = scene.structures[i];
          const sx = s.x + px * 0.9;
          const sy = s.y + py * 0.9;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(s.tilt);

          if (scene.foregroundType === 'spikes') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(s.width / 2, -s.height);
            ctx.lineTo(s.width, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Ruins arch/monolith
            ctx.fillRect(0, -s.height, s.width, s.height);
            ctx.strokeRect(0, -s.height, s.width, s.height);
          }
          ctx.restore();
        }
      }

      // 8. Swaying Pine Trees (Foreground)
      if (scene.foregroundType === 'trees' || scene.foregroundType === 'mountains') {
        const wind = Math.sin(time * 1.2) * 8 + Math.cos(time * 0.7) * 5;

        for (let i = 0; i < scene.trees.length; i++) {
          const tree = scene.trees[i];
          const tx = tree.x + px * (tree.layer === 1 ? 0.85 : 1.1);
          const ty = tree.y + py * (tree.layer === 1 ? 0.85 : 1.1);

          const treeSway = Math.sin(time * tree.swaySpeed * 10 + tree.swayPhase) * 6 + wind;
          const color = tree.layer === 1 ? '#0a0c12' : '#040508';

          drawPineTree(ctx, tx, ty, tree.width, tree.height, treeSway, color);
        }
      }

      // 9. Front Mountain Layer
      if (scene.mountainLayers[2]) {
        drawMountainLayer(ctx, scene.mountainLayers[2], '#040507', px * 1.2, py * 1.2, width, height);
      }

      // 10. Mid-ground Drift: Flocking Birds
      if (scene.driftType === 'birds' || scene.driftType === 'both') {
        ctx.fillStyle = '#cbd5e1';
        for (let i = 0; i < scene.birds.length; i++) {
          const b = scene.birds[i];
          b.x += b.vx;
          b.y += Math.sin(time * 2 + b.wingPhase) * 0.3;
          if (b.x > width + 40) b.x = -40;

          const wingFlap = Math.sin(time * b.wingSpeed * 30 + b.wingPhase) * (b.size * 0.8);
          const bx = b.x + px * 0.7;
          const by = b.y + py * 0.7;

          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx - b.size, by - wingFlap, bx - b.size * 1.8, by + wingFlap * 0.3);
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + b.size, by - wingFlap, bx + b.size * 1.8, by + wingFlap * 0.3);
          ctx.strokeStyle = 'rgba(200, 215, 235, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 11. Mid-ground Drift: Floating Embers / Stardust
      if (scene.driftType === 'embers' || scene.driftType === 'both') {
        for (let i = 0; i < scene.embers.length; i++) {
          const e = scene.embers[i];
          e.x += e.vx + Math.sin(time + e.y * 0.01) * 0.2;
          e.y += e.vy;
          if (e.y < -10) {
            e.y = height + 10;
            e.x = Math.random() * width;
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${e.alpha})`;
          ctx.beginPath();
          ctx.arc(e.x + px * 0.9, e.y + py * 0.9, e.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Event Listeners
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSeed(Math.floor(Math.random() * 1000000));
      } else if (e.code === 'KeyF') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleDblClick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dblclick', handleDblClick);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dblclick', handleDblClick);
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        cursor: 'none'
      }}
    />
  );
}

// Helper: Draw Mountain Silhouette Layer
function drawMountainLayer(ctx, points, color, px, py, width, height) {
  if (!points || points.length === 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, height + 50);
  for (let i = 0; i < points.length; i++) {
    ctx.lineTo(points[i].x + px, points[i].y + py);
  }
  ctx.lineTo(width + 50, height + 50);
  ctx.closePath();
  ctx.fill();
}

// Helper: Draw Swaying Pine Tree
function drawPineTree(ctx, x, y, width, height, sway, color) {
  ctx.fillStyle = color;
  ctx.beginPath();

  const layers = 4;
  const layerHeight = height / layers;

  ctx.moveTo(x + sway, y - height);

  for (let l = 0; l < layers; l++) {
    const topY = y - height + l * layerHeight;
    const botY = topY + layerHeight * 1.25;
    const w = (width * (l + 1)) / layers;
    const layerSway = (sway * (layers - l)) / layers;

    ctx.lineTo(x + w + layerSway, botY);
    ctx.lineTo(x + layerSway * 0.5, botY - layerHeight * 0.3);
  }

  for (let l = layers - 1; l >= 0; l--) {
    const topY = y - height + l * layerHeight;
    const botY = topY + layerHeight * 1.25;
    const w = (width * (l + 1)) / layers;
    const layerSway = (sway * (layers - l)) / layers;

    ctx.lineTo(x - w + layerSway, botY);
  }

  ctx.closePath();
  ctx.fill();
}
```

- [ ] **Step 2: Update src/App.jsx**

```jsx
import React from 'react';
import GenscapeCanvas from './components/GenscapeCanvas.jsx';

export default function App() {
  return <GenscapeCanvas />;
}
```

---

### Task 3: Build & Verification

- [ ] **Step 1: Run production build verification**
Run: `npm run build`
Expected: Production bundle builds cleanly without errors.

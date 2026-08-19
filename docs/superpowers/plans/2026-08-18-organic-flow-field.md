# Organic Flow Field SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a meditative, subtle React SPA flow field simulation using Simplex noise, silk particle trails, and smooth color palette transitions with zero text on screen.

**Architecture:** A Vite + React application hosting a full-window Canvas component. A high-performance 2D Canvas loop updates 5,000 particles whose movement vectors are derived from a 3D Simplex noise field. Color palettes smoothly interpolate RGB values over time, while canvas opacity clearing creates glowing trails.

**Tech Stack:** React 18 / 19, Vite, HTML5 2D Canvas, JavaScript ES modules, Simplex Noise.

## Global Constraints
- Zero text visible on-screen during normal operation.
- Dark theme background (`#07070a`).
- High performance 60fps canvas loop with automatic window resizing.

---

### Task 1: Scaffold Vite + React Project & Base Styling

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`
- Create: `src/App.jsx`

**Interfaces:**
- Produces: Base Vite React application mounting `<App />` and displaying a full-bleed black viewport.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "visual-interest",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meditative Flow Field</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body, #root {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #07070a;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create src/index.css, src/main.jsx, and src/App.jsx**

`src/index.css`:
```css
body {
  margin: 0;
  padding: 0;
  background-color: #07070a;
  user-select: none;
  cursor: default;
}
```

`src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.jsx`:
```jsx
import React from 'react';

export default function App() {
  return <div style={{ width: '100vw', height: '100vh', background: '#07070a' }} />;
}
```

- [ ] **Step 5: Install dependencies & run dev build verification**

Run: `npm install`
Expected: Dependencies installed cleanly without error.

---

### Task 2: Implement Simplex 3D Noise Utility & Palette Interpolator

**Files:**
- Create: `src/utils/noise.js`
- Create: `src/utils/palettes.js`

**Interfaces:**
- Produces: `simplex3D(x, y, z)` in `src/utils/noise.js` returning number `[-1, 1]`.
- Produces: `PALETTES` array and `getCurrentColor(paletteIndex, nextPaletteIndex, progress, colorRatio)` in `src/utils/palettes.js`.

- [ ] **Step 1: Implement src/utils/noise.js**

```javascript
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

export function simplex3D(xin, yin, zin) {
  let n0, n1, n2, n3;
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

  let i1, j1, k1;
  let i2, j2, k2;

  if (x0 >= y0) {
    if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
    else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
    else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
  } else {
    if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
    else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
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

  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
    n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0+1] * y0 + grad3[gi0+2] * z0);
  }

  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
    n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1+1] * y1 + grad3[gi1+2] * z1);
  }

  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
    n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2+1] * y2 + grad3[gi2+2] * z2);
  }

  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if (t3 < 0) n3 = 0.0;
  else {
    t3 *= t3;
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
    n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3+1] * y3 + grad3[gi3+2] * z3);
  }

  return 32.0 * (n0 + n1 + n2 + n3);
}
```

- [ ] **Step 2: Implement src/utils/palettes.js**

```javascript
export const PALETTES = [
  // 1. Deep Aurora
  [
    { r: 16,  g: 185, b: 129 }, // Emerald
    { r: 99,  g: 102, b: 241 }, // Indigo/Violet
    { r: 20,  g: 184, b: 166 }, // Teal
    { r: 168, g: 85,  b: 247 }  // Purple
  ],
  // 2. Ocean Abyss
  [
    { r: 14,  g: 165, b: 233 }, // Cyan
    { r: 59,  g: 130, b: 246 }, // Sapphire
    { r: 6,   g: 182, b: 212 }, // Turquoise
    { r: 99,  g: 102, b: 241 }  // Deep Blue
  ],
  // 3. Ethereal Twilight
  [
    { r: 244, g: 114, b: 182 }, // Soft Pink
    { r: 251, g: 146, b: 60  }, // Warm Amber
    { r: 192, g: 132, b: 252 }, // Lavender
    { r: 248, g: 113, b: 113 }  // Rose
  ],
  // 4. Forest Mist
  [
    { r: 52,  g: 211, b: 153 }, // Mint
    { r: 250, g: 204, b: 21  }, // Muted Gold
    { r: 74,  g: 222, b: 128 }, // Sage Green
    { r: 45,  g: 212, b: 191 }  // Soft Teal
  ],
  // 5. Solar Nebula
  [
    { r: 248, g: 113, b: 113 }, // Warm Crimson
    { r: 251, g: 146, b: 60  }, // Copper
    { r: 250, g: 204, b: 21  }, // Glowing Gold
    { r: 232, g: 121, b: 249 }  // Plum
  ]
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function getCurrentColor(paletteIndex, nextPaletteIndex, blendProgress, colorRatio, alpha = 0.5) {
  const currentPal = PALETTES[paletteIndex];
  const nextPal = PALETTES[nextPaletteIndex];
  
  const numColors = currentPal.length;
  const idx1 = Math.floor(colorRatio * numColors) % numColors;
  const idx2 = (idx1 + 1) % numColors;
  const subRatio = (colorRatio * numColors) % 1;

  const c1Start = currentPal[idx1];
  const c2Start = currentPal[idx2];
  const rStart = lerp(c1Start.r, c2Start.r, subRatio);
  const gStart = lerp(c1Start.g, c2Start.g, subRatio);
  const bStart = lerp(c1Start.b, c2Start.b, subRatio);

  const c1End = nextPal[idx1];
  const c2End = nextPal[idx2];
  const rEnd = lerp(c1End.r, c2End.r, subRatio);
  const gEnd = lerp(c1End.g, c2End.g, subRatio);
  const bEnd = lerp(c1End.b, c2End.b, subRatio);

  const r = Math.round(lerp(rStart, rEnd, blendProgress));
  const g = Math.round(lerp(gStart, gEnd, blendProgress));
  const b = Math.round(lerp(bStart, bEnd, blendProgress));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

---

### Task 3: Implement FlowFieldCanvas Component & App Integration

**Files:**
- Create: `src/components/FlowFieldCanvas.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `simplex3D` from `src/utils/noise.js` and `getCurrentColor` / `PALETTES` from `src/utils/palettes.js`.
- Produces: Fully interactive, zero-text visual canvas running the organic flow field loop.

- [ ] **Step 1: Create src/components/FlowFieldCanvas.jsx**

```jsx
import React, { useEffect, useRef } from 'react';
import { simplex3D } from '../utils/noise.js';
import { PALETTES, getCurrentColor } from '../utils/palettes.js';

const PARTICLE_COUNT = 5000;
const NOISE_SCALE = 0.0018;
const TIME_SPEED = 0.00015;
const MAX_SPEED = 1.6;

export default function FlowFieldCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const paletteState = useRef({
    current: 0,
    next: 1,
    blendProgress: 0,
    blendSpeed: 0.001
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, width, height);
    };

    window.addEventListener('resize', handleResize);

    // Initial background setup
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, width, height);

    // Particles array
    const particles = new Float32Array(PARTICLE_COUNT * 5); // x, y, vx, vy, age
    const initParticle = (i) => {
      const idx = i * 5;
      particles[idx] = Math.random() * width;
      particles[idx + 1] = Math.random() * height;
      particles[idx + 2] = 0;
      particles[idx + 3] = 0;
      particles[idx + 4] = Math.random() * 300 + 100; // max age
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      initParticle(i);
    }

    let zTime = 0;

    const render = () => {
      // 1. Trail clear effect
      ctx.fillStyle = 'rgba(7, 7, 10, 0.04)';
      ctx.fillRect(0, 0, width, height);

      // 2. Palette progress update
      const pState = paletteState.current;
      pState.blendProgress += pState.blendSpeed;
      if (pState.blendProgress >= 1) {
        pState.blendProgress = 0;
        pState.current = pState.next;
        pState.next = (pState.next + 1) % PALETTES.length;
      }

      zTime += TIME_SPEED;

      // 3. Update & render particles
      ctx.lineWidth = 1.1;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 5;
        let px = particles[idx];
        let py = particles[idx + 1];
        let vx = particles[idx + 2];
        let vy = particles[idx + 3];
        let age = particles[idx + 4];

        // Noise angle
        const noiseVal = simplex3D(px * NOISE_SCALE, py * NOISE_SCALE, zTime);
        const angle = noiseVal * Math.PI * 4;

        let ax = Math.cos(angle) * 0.2;
        let ay = Math.sin(angle) * 0.2;

        // Subtle mouse influence
        if (mouseRef.current.active) {
          const dx = px - mouseRef.current.x;
          const dy = py - mouseRef.current.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 40000 && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / 200) * 0.5;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        vx = (vx + ax) * 0.94;
        vy = (vy + ay) * 0.94;

        // Speed cap
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > MAX_SPEED) {
          vx = (vx / speed) * MAX_SPEED;
          vy = (vy / speed) * MAX_SPEED;
        }

        const newPx = px + vx;
        const newPy = py + vy;
        age -= 1;

        // Draw particle line segment
        const colorRatio = (px / width + py / height) * 0.5;
        ctx.strokeStyle = getCurrentColor(pState.current, pState.next, pState.blendProgress, colorRatio, 0.45);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(newPx, newPy);
        ctx.stroke();

        // Update state or respawn
        if (
          age <= 0 ||
          newPx < -20 ||
          newPx > width + 20 ||
          newPy < -20 ||
          newPy > height + 20
        ) {
          initParticle(i);
        } else {
          particles[idx] = newPx;
          particles[idx + 1] = newPy;
          particles[idx + 2] = vx;
          particles[idx + 3] = vy;
          particles[idx + 4] = age;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Event listeners
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        // Jump blend progress or switch palette
        paletteState.current.current = paletteState.current.next;
        paletteState.current.next = (paletteState.current.next + 1) % PALETTES.length;
        paletteState.current.blendProgress = 0;
      } else if (e.code === 'KeyF') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.code === 'KeyR') {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          initParticle(i);
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
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dblclick', handleDblClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dblclick', handleDblClick);
    };
  }, []);

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
```

- [ ] **Step 2: Modify src/App.jsx to render FlowFieldCanvas**

```jsx
import React from 'react';
import FlowFieldCanvas from './components/FlowFieldCanvas.jsx';

export default function App() {
  return <FlowFieldCanvas />;
}
```

---

### Task 4: Verification & Dev Server Launch

**Files:** None modified directly.

- [ ] **Step 1: Start dev server**
Run: `npm run dev`
Expected: Server launches on `http://localhost:3000`.

- [ ] **Step 2: Verify browser rendering**
Check canvas rendering using DevTools / browser or preview to ensure silk noise flow lines render smoothly with dark background and zero text.

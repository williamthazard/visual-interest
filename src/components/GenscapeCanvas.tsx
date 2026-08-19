import { useEffect, useRef, useState } from 'react';
import { simplex3D } from '../utils/noise';
import {
  Rng, randomSeed, resolveRecipe, renderSkyLayer, createRidgeConfigs,
  spawnChunkElements, createBirdFlock, gray, fillPolygon,
  CHUNK_WIDTH,
  type Recipe, type RidgeConfig, type ForegroundElement, type BirdFlock, type ShardElement,
} from '../utils/genscapeGenerator';

interface State {
  skyCanvas: HTMLCanvasElement | null;
  recipe: Recipe | null;
  horizonY: number;
  ridgeConfigs: RidgeConfig[];
  worldX: number;
  loadedChunks: Set<number>;
  activeElements: ForegroundElement[];
  flock: BirdFlock | null;
  flockProgress: number;
  nextFlockTime: number;
  glitchEndTime: number;
  nextGlitchTime: number;
  glitchY: number;
  glitchH: number;
  glitchShift: number;
  mouseTarget: { x: number; y: number };
  mouseCurrent: { x: number; y: number };
  width: number;
  height: number;
  lastTime: number;
}

export default function GenscapeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(() => randomSeed());

  const stateRef = useRef<State>({
    skyCanvas: null,
    recipe: null,
    horizonY: 0,
    ridgeConfigs: [],
    worldX: 0,
    loadedChunks: new Set<number>(),
    activeElements: [],
    flock: null,
    flockProgress: 0,
    nextFlockTime: 0,
    glitchEndTime: 0,
    nextGlitchTime: 0,
    glitchY: 0,
    glitchH: 0,
    glitchShift: 0,
    mouseTarget: { x: 0, y: 0 },
    mouseCurrent: { x: 0, y: 0 },
    width: 0,
    height: 0,
    lastTime: 0,
  });

  // Effect 1: On seed/resize — regenerate sky layer to offscreen canvas
  useEffect(() => {
    const generateScene = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      const rng = new Rng(seed);
      const recipe = resolveRecipe(rng);
      const horizonY = h * rng.uniform(0.62, 0.78);

      renderSkyLayer(offCtx, w, h, rng, recipe.focal, horizonY);
      const ridgeConfigs = createRidgeConfigs(rng, h, horizonY);

      stateRef.current.skyCanvas = offscreen;
      stateRef.current.recipe = recipe;
      stateRef.current.horizonY = horizonY;
      stateRef.current.ridgeConfigs = ridgeConfigs;
      stateRef.current.worldX = 0;
      stateRef.current.loadedChunks = new Set<number>();
      stateRef.current.activeElements = [];
      stateRef.current.flock = null;
      stateRef.current.flockProgress = 0;
      stateRef.current.nextFlockTime = performance.now() + rng.uniform(40, 90) * 1000;
      stateRef.current.nextGlitchTime = performance.now() + rng.uniform(45, 110) * 1000;
      stateRef.current.glitchEndTime = 0;
      stateRef.current.width = w;
      stateRef.current.height = h;
      stateRef.current.lastTime = performance.now();
    };

    generateScene();

    const handleResize = () => {
      generateScene();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [seed]);

  // Effect 2: Animation loop (requestAnimationFrame) & Event Handlers
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      const canvas = canvasRef.current;
      const state = stateRef.current;

      if (canvas && state.skyCanvas && state.recipe) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dt = state.lastTime ? Math.min((now - state.lastTime) / 1000, 0.1) : 1 / 60;
          state.lastTime = now;

          const w = state.width;
          const h = state.height;
          // 1. Organic naturalistic scroll speed modulation (zero jerk)
          const timeSec = now / 1000;
          // Micro-variance: subtle wind speed fluctuations (±20%, period ~30-60s)
          const windNoise = simplex3D(timeSec * 0.02, seed * 0.05, 0);
          const microSpeed = 1.0 + windNoise * 0.2;

          // Macro-variance: gentle scenic pauses & slow-downs (period ~2-4 minutes)
          const macroNoise = simplex3D(timeSec * 0.005, seed * 0.1, 100);
          let macroSpeed = 1.0;
          if (macroNoise < -0.15) {
            const dip = Math.min(1, (-0.15 - macroNoise) / 0.5);
            const smoothDip = dip * dip * (3 - 2 * dip); // cubic smoothstep
            macroSpeed = 1.0 - smoothDip * 0.98; // dips smoothly down to 0.02 (scenic linger)
          }

          const currentSpeed = 10 * microSpeed * macroSpeed;
          state.worldX += currentSpeed * dt;

          // 2. Draw sky with smoothed mouse parallax (±3px max, lerp factor 0.02)
          state.mouseCurrent.x += (state.mouseTarget.x - state.mouseCurrent.x) * 0.02;
          state.mouseCurrent.y += (state.mouseTarget.y - state.mouseCurrent.y) * 0.02;

          ctx.fillStyle = gray(16);
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(state.skyCanvas, state.mouseCurrent.x, state.mouseCurrent.y);

          // 3. Draw mountain ridges (back to front)
          for (const ridge of state.ridgeConfigs) {
            ctx.beginPath();
            const step = 8;
            let first = true;
            for (let screenCol = 0; screenCol <= w + step; screenCol += step) {
              const wx = state.worldX * ridge.scrollFactor + screenCol;
              const n1 = simplex3D(wx * ridge.scale, ridge.index * 10, seed * 0.01);
              const n2 = simplex3D(wx * ridge.scale * 2.5, ridge.index * 20, seed * 0.02) * 0.5;
              const y = ridge.baseY - Math.abs(n1 + n2) * ridge.amplitude;

              if (first) {
                ctx.moveTo(screenCol, y);
                first = false;
              } else {
                ctx.lineTo(screenCol, y);
              }
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = gray(ridge.shade);
            ctx.fill();
          }

          // 4. Manage foreground elements (chunks)
          const minChunk = Math.floor(state.worldX / CHUNK_WIDTH);
          const maxChunk = Math.floor((state.worldX + w) / CHUNK_WIDTH);

          for (let c = minChunk; c <= maxChunk; c++) {
            if (!state.loadedChunks.has(c)) {
              state.loadedChunks.add(c);
              const newElements = spawnChunkElements(
                c,
                seed,
                state.recipe.foreground,
                h,
                state.horizonY
              );
              state.activeElements.push(...newElements);
            }
          }

          // Remove elements that have scrolled off-screen left
          state.activeElements = state.activeElements.filter(
            (el) => el.worldX - state.worldX + el.width * 2 >= -100
          );

          // 5. Draw foreground elements
          for (const el of state.activeElements) {
            const screenX = el.worldX - state.worldX;
            if (screenX - el.width > w + 100) continue;

            const elType = el.type || state.recipe.foreground;
            if (elType === 'trees') {
              const lean = el.lean ?? 0;
              fillPolygon(
                ctx,
                [
                  [screenX + lean, el.y - el.height],
                  [screenX + el.width, el.y],
                  [screenX - el.width, el.y],
                ],
                el.shade
              );
            } else if (elType === 'ruins') {
              const bW = el.width;
              const bH = el.height;
              if (!el.hasPeak) {
                fillPolygon(
                  ctx,
                  [
                    [screenX - bW / 2, el.y],
                    [screenX - bW / 2, el.y - bH],
                    [screenX + bW / 2, el.y - bH],
                    [screenX + bW / 2, el.y],
                  ],
                  el.shade
                );
              } else {
                const peakX = screenX + (el.peakOffset ?? 0);
                fillPolygon(
                  ctx,
                  [
                    [screenX - bW / 2, el.y],
                    [screenX - bW / 2, el.y - bH * 0.9],
                    [peakX, el.y - bH],
                    [screenX + bW / 2, el.y - bH * 0.9],
                    [screenX + bW / 2, el.y],
                  ],
                  el.shade
                );
              }
            } else if (elType === 'spikes') {
              const tilt = el.tilt ?? 0;
              const spikeH = el.height;
              const baseW = el.width;
              const tip: [number, number] = [screenX + tilt * spikeH, el.y - spikeH];
              fillPolygon(
                ctx,
                [
                  [screenX - baseW / 2, h],
                  [screenX + baseW / 2, h],
                  [screenX + baseW / 2, el.y],
                  tip,
                  [screenX - baseW / 2, el.y],
                ],
                el.shade
              );
            }
          }

          // 6. Draw bird flock (if active or time to spawn)
          if (!state.flock && now >= state.nextFlockTime && state.recipe.drift === 'birds') {
            const rng = new Rng((seed + Math.floor(now)) >>> 0);
            state.flock = createBirdFlock(rng, w, h, state.horizonY);
            state.flockProgress = 0;
          }

          if (state.flock) {
            state.flockProgress += state.flock.speed * dt;

            ctx.lineWidth = state.flock.lineWidth;
            ctx.lineCap = 'round';

            for (const bird of state.flock.birds) {
              const tParam = Math.max(0, Math.min(1, bird.t * state.flockProgress));
              const mt = 1 - tParam;
              const px =
                mt * mt * state.flock.startX +
                2 * mt * tParam * state.flock.ctrlX +
                tParam * tParam * state.flock.endX +
                bird.jitterX;
              const py =
                mt * mt * state.flock.startY +
                2 * mt * tParam * state.flock.ctrlY +
                tParam * tParam * state.flock.endY +
                bird.jitterY;

              const size = bird.size;
              const tilt = bird.tilt;
              const c = Math.cos(tilt);
              const s = Math.sin(tilt);
              const local: [number, number][] = [
                [-size, -size * 0.35],
                [0, 0],
                [size, -size * 0.35],
              ];
              const rotated = local.map(
                ([lx, ly]): [number, number] => [px + lx * c - ly * s, py + lx * s + ly * c]
              );

              ctx.beginPath();
              ctx.moveTo(rotated[0][0], rotated[0][1]);
              ctx.lineTo(rotated[1][0], rotated[1][1]);
              ctx.lineTo(rotated[2][0], rotated[2][1]);
              ctx.strokeStyle = gray(bird.shade);
              ctx.stroke();
            }

            if (state.flockProgress >= 1.0) {
              state.flock = null;
              const rng = new Rng((seed + Math.floor(now)) >>> 0);
              state.nextFlockTime = now + rng.uniform(60, 120) * 1000;
            }
          }

          // 7. Vignette overlay
          const grad = ctx.createRadialGradient(
            w / 2,
            h / 2,
            Math.max(w, h) * 0.3,
            w / 2,
            h / 2,
            Math.max(w, h) * 0.75
          );
          grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // 8. Subtle, rare glitch effect
          if (now >= state.nextGlitchTime && now >= state.glitchEndTime) {
            const rng = new Rng((seed + Math.floor(now)) >>> 0);
            const duration = rng.uniform(300, 700); // 0.3 to 0.7 seconds
            state.glitchEndTime = now + duration;
            state.nextGlitchTime = now + rng.uniform(60, 150) * 1000;
            state.glitchY = rng.uniform(h * 0.1, h * 0.8);
            state.glitchH = rng.uniform(15, 45);
            state.glitchShift = (rng.random() > 0.5 ? 1 : -1) * rng.uniform(6, 20);
          }

          if (now < state.glitchEndTime) {
            const gy = state.glitchY;
            const gh = state.glitchH;
            const shift = state.glitchShift;

            // Shift horizontal band
            ctx.drawImage(canvas, 0, gy, w, gh, shift, gy, w, gh);

            // Overlay subtle scanline noise
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fillRect(0, gy, w, 2);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      stateRef.current.mouseTarget = {
        x: Math.max(-3, Math.min(3, dx * 3)),
        y: Math.max(-3, Math.min(3, dy * 3)),
      };
    };

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Silently catch errors per contract
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {
            // Silently catch errors per contract
          });
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSeed(randomSeed());
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    const handleDblClick = () => {
      toggleFullscreen();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dblclick', handleDblClick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dblclick', handleDblClick);
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100vw', height: '100vh', cursor: 'none' }}
    />
  );
}

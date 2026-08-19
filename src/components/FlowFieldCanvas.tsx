import React, { useEffect, useRef } from 'react';
import { simplex3D } from '../utils/noise';
import { PALETTES, getCurrentColor } from '../utils/palettes';

const PARTICLE_COUNT = 4000;
const NOISE_SCALE = 0.0015;
const TIME_SPEED = 0.00012;
const MAX_SPEED = 1.4;
const BUCKET_COUNT = 24;

export default function FlowFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false
  });
  const paletteState = useRef<{
    current: number;
    next: number;
    blendProgress: number;
    blendSpeed: number;
  }>({
    current: 0,
    next: 1,
    blendProgress: 0,
    blendSpeed: 0.0006
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let animationFrameId: number;
    let isCancelled = false;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, width, height);
    };

    window.addEventListener('resize', handleResize);

    // Initial background clear
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, width, height);

    // Float32Array per particle: x, y, vx, vy, age
    const particles = new Float32Array(PARTICLE_COUNT * 5);
    const initParticle = (i: number) => {
      const idx = i * 5;
      particles[idx] = Math.random() * width;
      particles[idx + 1] = Math.random() * height;
      particles[idx + 2] = (Math.random() - 0.5) * 0.2;
      particles[idx + 3] = (Math.random() - 0.5) * 0.2;
      particles[idx + 4] = Math.random() * 350 + 150;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      initParticle(i);
    }

    // Pre-allocated line segment buckets for fast batched drawing
    // Each bucket stores flat coordinates: [x1, y1, x2, y2, ...]
    const bucketCoords = Array.from({ length: BUCKET_COUNT }, () => new Float32Array(PARTICLE_COUNT * 4));
    const bucketCounts = new Int32Array(BUCKET_COUNT);

    let zTime = 0;

    const render = () => {
      if (isCancelled) return;

      // 1. Smooth silk trail clearing
      ctx.fillStyle = 'rgba(7, 7, 10, 0.035)';
      ctx.fillRect(0, 0, width, height);

      // 2. Palette progress update
      const pState = paletteState.current;
      pState.blendProgress += pState.blendSpeed;
      if (pState.blendProgress >= 1) {
        pState.blendProgress = 0;
        pState.current = pState.next;
        pState.next = (pState.next + 1) % PALETTES.length;
      }

      // Pre-compute 24 RGBA color strings for this frame
      const colorLut: string[] = new Array(BUCKET_COUNT);
      for (let b = 0; b < BUCKET_COUNT; b++) {
        colorLut[b] = getCurrentColor(
          pState.current,
          pState.next,
          pState.blendProgress,
          b / BUCKET_COUNT,
          0.45
        );
      }

      bucketCounts.fill(0);
      zTime += TIME_SPEED;

      // 3. Physics & position updates
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 5;
        let px = particles[idx];
        let py = particles[idx + 1];
        let vx = particles[idx + 2];
        let vy = particles[idx + 3];
        let age = particles[idx + 4];

        const noiseVal = simplex3D(px * NOISE_SCALE, py * NOISE_SCALE, zTime);
        const angle = noiseVal * Math.PI * 4;

        let ax = Math.cos(angle) * 0.16;
        let ay = Math.sin(angle) * 0.16;

        if (mouseRef.current.active) {
          const dx = px - mouseRef.current.x;
          const dy = py - mouseRef.current.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 40000 && distSq > 4) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / 200) * 0.3;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        vx = (vx + ax) * 0.94;
        vy = (vy + ay) * 0.94;

        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > MAX_SPEED) {
          vx = (vx / speed) * MAX_SPEED;
          vy = (vy / speed) * MAX_SPEED;
        }

        const newPx = px + vx;
        const newPy = py + vy;
        age -= 1;

        // Assign to color bucket
        const colorRatio = (px / (width || 1) + py / (height || 1)) * 0.5;
        const bIdx = Math.floor(Math.max(0, Math.min(0.999, colorRatio)) * BUCKET_COUNT);

        const count = bucketCounts[bIdx];
        const coords = bucketCoords[bIdx];
        const cIdx = count * 4;
        coords[cIdx] = px;
        coords[cIdx + 1] = py;
        coords[cIdx + 2] = newPx;
        coords[cIdx + 3] = newPy;
        bucketCounts[bIdx] = count + 1;

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

      // 4. Batched path drawing (only BUCKET_COUNT stroke calls per frame!)
      ctx.lineWidth = 1.1;
      for (let b = 0; b < BUCKET_COUNT; b++) {
        const count = bucketCounts[b];
        if (count === 0) continue;

        const coords = bucketCoords[b];
        ctx.strokeStyle = colorLut[b];
        ctx.beginPath();
        for (let c = 0; c < count; c++) {
          const cIdx = c * 4;
          ctx.moveTo(coords[cIdx], coords[cIdx + 1]);
          ctx.lineTo(coords[cIdx + 2], coords[cIdx + 3]);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Event listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
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
      isCancelled = true;
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

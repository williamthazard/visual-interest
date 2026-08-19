# 00: The Idea & Architecture

Genscape is a meditative, procedural night landscape. It draws a dark sky, a soft glowing moon, layered mountain silhouettes, and occasional structures or pine trees. The camera moves slowly across an infinite landscape, pausing occasionally at scenic vistas before resuming its drift.

This tutorial series explains how to build the entire system from scratch. By the end, you will understand how to construct seedable random number generators, compute procedural noise, render pixel-level atmospheric haze and Bayer-dithered gradients, build infinite parallax terrain, and package the final web app into a native macOS screensaver bundle.

## Core Design Principles

The visual design rests on four choices.

First, the aesthetic is strictly grayscale. Values are kept dark, with sky pixels ranging from 16 to 38 out of 255, ground values between 5 and 18, and silhouettes between 2 and 24. Light comes from a glowing Gaussian moon and distant stars.

Second, gradients are dithered. Rather than relying on smooth modern CSS gradients, the sky uses an 8x8 Bayer dithering matrix to quantize light levels into 24 distinct steps. This produces an illustrated, halftone texture similar to printmaking or early graphic displays.

Third, composition takes precedence over density. Foreground elements (trees, ruins, spikes) are not scattered uniformly. They cluster around focal points using a mathematical attractor distribution. This ensures scenes feel composed by an artist rather than randomly populated.

Fourth, movement is slow and naturalistic. The camera travels at roughly 10 pixels per second. Speed is modulated by organic noise, causing gentle wind-like speed variations and occasional scenic linger pauses where movement slows to a near-stop before resuming.

## System Architecture

The project consists of three main layers.

1. The Core Mathematics (`src/utils/noise.ts` and `src/utils/genscapeGenerator.ts`): Seedable PRNG, 3D Simplex noise, 2D Value Noise, Fractional Brownian Motion (fBm), Bayer matrix dithering, and polygon painters.
2. The React Canvas Engine (`src/components/GenscapeCanvas.tsx`): A full-viewport HTML5 Canvas component that manages offscreen sky rendering, infinite terrain scrolling, dynamic chunk spawning, depth parallax, and requestAnimationFrame animation loops.
3. The Native macOS Package (`native/GenscapeView.m` and `scripts/build-saver.sh`): An Objective-C ScreenSaverView wrapper hosting WebKit, compiled via clang into a native `.saver` bundle with an ad-hoc code signature.

In the next chapter, we will set up the development environment, Vite build tooling, and TypeScript configuration.

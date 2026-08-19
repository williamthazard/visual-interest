# Genscape Tutorial

This directory contains a step-by-step tutorial explaining how to build Genscape from scratch.

## Chapter Guide

- **[00: The Idea & Architecture](./00-idea.md)**
  Overview of the grayscale aesthetic, procedural design principles, and rendering pipeline architecture.

- **[01: Project Setup & Infrastructure](./01-setup.md)**
  Setting up Vite, React 18, and TypeScript, including relative asset path configuration for WebKit file loading.

- **[02: Seedable PRNG & Procedural Noise](./02-prng-and-noise.md)**
  Building Mulberry32 PRNG, Box-Muller Gaussian transform, Jöhnk's Beta distribution, Simplex 3D noise, value noise, and Fractional Brownian Motion.

- **[03: The Sky Buffer & Finish Pass](./03-sky-and-dithering.md)**
  Float accumulation buffer sky rendering, Gaussian moon math, star distribution, and the 8x8 Bayer dithering finish pass.

- **[04: Terrain, Silhouettes & Composition](./04-procedural-terrain-and-silhouettes.md)**
  Mountain ridge noise profiles, compositional placement via `attractorX`, and silhouette polygon painters for trees, ruins, and spikes.

- **[05: World Traversal & Naturalistic Motion](./05-traversal-and-animation.md)**
  Infinite chunk spawning, dynamic biomes, multi-layer depth parallax, organic speed modulation with scenic linger pauses, and bird flocking dynamics.

- **[06: Native macOS Screen Saver Packaging](./06-macos-screensaver.md)**
  Objective-C `ScreenSaverView` WebKit wrapper, Xcode command-line toolchain compilation with `clang`, code signing, and bundle installation.

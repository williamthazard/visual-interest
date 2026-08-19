# Genscape

A meditative, procedural night landscape that slowly moves across the screen. Built with TypeScript, HTML5 Canvas, and React. It runs in any web browser and compiles directly into a native macOS screensaver.

The visual style is restrained and grayscale. Every render builds a quiet landscape: a Bayer-dithered sky, a soft glowing moon, layered mountain silhouettes, and occasional structures or pine trees. Movement is slow and naturalistic, with gentle pauses and breeze-like speed variations so the camera feels like it is drifting through an evolving world.

## Web Application

The live web application is hosted on GitHub Pages:
**[williamthazard.github.io/genscape-animated](https://williamthazard.github.io/genscape-animated/)**

To run the web app locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

- Press `Space` to generate a new world seed.
- Press `F` or double-click to toggle fullscreen.

To build the production web assets:

```bash
npm run build
```

## Native macOS Screen Saver

The project includes a native Objective-C wrapper that compiles into a `.saver` bundle using macOS built-in tools.

To build and install the screensaver on your Mac:

```bash
npm run install:saver
```

This compiles the static bundle, applies an ad-hoc code signature, and opens the installer in System Settings.

If you prefer to build without automatically opening the installer:

```bash
npm run build:saver
```

The compiled `Genscape.saver` bundle will be created in the project root. You can install it manually by copying it to `~/Library/Screen Savers/`.

## How It Works

A tutorial walking through every line of code, algorithm, and mathematical concept behind this project is available in the [`docs/`](./docs/) directory.

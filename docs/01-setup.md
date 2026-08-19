# 01: Project Setup & Infrastructure

This chapter covers setting up the development environment using Node.js, Vite, React 18, and TypeScript.

## Package Configuration

The `package.json` defines the project dependencies and build commands.

```json
{
  "name": "visual-interest",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "build:saver": "bash scripts/build-saver.sh",
    "install:saver": "bash scripts/build-saver.sh && open Genscape.saver"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "~5.5.4",
    "vite": "^5.4.2"
  }
}
```

Notice the custom scripts `build:saver` and `install:saver`. These run the native shell script that packages our web application into a macOS screensaver.

## TypeScript Configuration

We configure TypeScript in strict mode in `tsconfig.json`.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Setting `jsx` to `react-jsx` allows using JSX syntax without explicit React imports in every file.

## Vite Configuration

The Vite configuration in `vite.config.ts` requires one specific setting for screensaver compatibility: `base: './'`.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
```

Setting `base: './'` instructs Vite to generate relative asset paths (like `./assets/index.js`) rather than absolute paths (like `/assets/index.js`). When WebKit opens the HTML file directly from inside a macOS `.saver` bundle using `file://` URLs, absolute paths fail. Relative paths ensure assets load properly from any location on disk.

## Web Entry Point & Styling

The HTML entry point in `index.html` mounts the application in a full-viewport container.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visual Interest</title>
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
        background-color: #101010;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The application entry in `src/main.tsx` initializes React.

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

In `src/App.tsx`, we mount the main canvas component.

```typescript
import GenscapeCanvas from './components/GenscapeCanvas';

export default function App() {
  return <GenscapeCanvas />;
}
```

With the base application infrastructure in place, we can now move to Chapter 2 to build the mathematical foundation: PRNGs and procedural noise.

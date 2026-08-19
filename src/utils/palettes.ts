export interface PaletteColor {
  r: number;
  g: number;
  b: number;
}

export const PALETTES: readonly PaletteColor[][] = [
  // 1. Deep Aurora
  [
    { r: 16,  g: 185, b: 129 },
    { r: 99,  g: 102, b: 241 },
    { r: 20,  g: 184, b: 166 },
    { r: 168, g: 85,  b: 247 },
  ],
  // 2. Ocean Abyss
  [
    { r: 14,  g: 165, b: 233 },
    { r: 59,  g: 130, b: 246 },
    { r: 6,   g: 182, b: 212 },
    { r: 99,  g: 102, b: 241 },
  ],
  // 3. Ethereal Twilight
  [
    { r: 244, g: 114, b: 182 },
    { r: 251, g: 146, b: 60  },
    { r: 192, g: 132, b: 252 },
    { r: 248, g: 113, b: 113 },
  ],
  // 4. Forest Mist
  [
    { r: 52,  g: 211, b: 153 },
    { r: 250, g: 204, b: 21  },
    { r: 74,  g: 222, b: 128 },
    { r: 45,  g: 212, b: 191 },
  ],
  // 5. Solar Nebula
  [
    { r: 248, g: 113, b: 113 },
    { r: 251, g: 146, b: 60  },
    { r: 250, g: 204, b: 21  },
    { r: 232, g: 121, b: 249 },
  ],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getCurrentColor(
  paletteIndex: number,
  nextPaletteIndex: number,
  blendProgress: number,
  colorRatio: number,
  alpha = 0.5,
): string {
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

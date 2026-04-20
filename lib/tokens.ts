// Design tokens from Claude Design
export const BZ = {
  // Surfaces
  bg: '#0A0A0A',
  surface: '#141416',
  elevated: '#1C1C1E',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',

  // Text
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.62)',
  textDim: 'rgba(255,255,255,0.38)',
  textFaint: 'rgba(255,255,255,0.22)',

  // Teams
  teams: {
    red:    { base: '#FF4757', glow: '#FF6B78', deep: '#C9313E', name: '레드' },
    blue:   { base: '#3742FA', glow: '#5B64FF', deep: '#232CC2', name: '블루' },
    green:  { base: '#2ED573', glow: '#5DE996', deep: '#1FA857', name: '그린' },
    yellow: { base: '#FFA502', glow: '#FFBC3F', deep: '#C77E00', name: '옐로' },
    purple: { base: '#A55EEA', glow: '#BE80F5', deep: '#7D40B8', name: '퍼플' },
    cyan:   { base: '#19D1E8', glow: '#55E1F2', deep: '#0E9DB0', name: '시안' },
  } as Record<string, { base: string; glow: string; deep: string; name: string }>,

  // Type
  sans: '"Space Grotesk", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',

  // Radii
  r: { sm: 8, md: 12, lg: 16, xl: 22 },
};

export const TEAM_PRESETS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'] as const;

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}

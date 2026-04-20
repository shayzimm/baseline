// JS mirror of CSS custom properties — use for SVG strokes, dynamic inline styles,
// and Recharts colors where Tailwind classes can't reach.
export const tokens = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceAlt: 'var(--color-surface-alt)',
  line: 'var(--color-line)',
  ink: 'var(--color-ink)',
  inkSoft: 'var(--color-ink-soft)',
  inkMute: 'var(--color-ink-mute)',
  inkFaint: 'var(--color-ink-faint)',
  accent: 'var(--color-accent)',
  accentDeep: 'var(--color-accent-deep)',
  accentSoft: 'var(--color-accent-soft)',
  teal: 'var(--color-teal)',
  mint: 'var(--color-mint)',
  sand: 'var(--color-sand)',
  blush: 'var(--color-blush)',
  good: 'var(--color-good)',
} as const

// Resolved hex-ish values for contexts that can't use CSS vars (e.g. SVG fills in charts)
export const resolvedTokens = {
  accent: 'oklch(62% 0.09 230)',
  accentDeep: 'oklch(48% 0.11 232)',
  accentSoft: 'oklch(90% 0.03 230)',
  teal: 'oklch(72% 0.07 195)',
  good: 'oklch(68% 0.08 175)',
  line: 'oklch(92% 0.01 235)',
  inkMute: 'oklch(62% 0.015 240)',
  inkFaint: 'oklch(78% 0.012 235)',
  inkSoft: 'oklch(42% 0.02 245)',
} as const

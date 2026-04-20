import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        'ink-mute': 'var(--color-ink-mute)',
        'ink-faint': 'var(--color-ink-faint)',
        accent: 'var(--color-accent)',
        'accent-deep': 'var(--color-accent-deep)',
        'accent-soft': 'var(--color-accent-soft)',
        teal: 'var(--color-teal)',
        mint: 'var(--color-mint)',
        sand: 'var(--color-sand)',
        blush: 'var(--color-blush)',
        good: 'var(--color-good)',
      },
      fontFamily: {
        ui: ['Geist', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '28px',
        'card-sm': '18px',
        'card-xs': '14px',
      },
    },
  },
  plugins: [],
} satisfies Config


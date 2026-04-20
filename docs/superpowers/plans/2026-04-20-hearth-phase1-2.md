# Hearth — Phase 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Hearth health tracker PWA foundation (Phase 1) and implement a fully functional Today view with data export (Phase 2), then stop for user testing.

**Architecture:** Vite + React + TS monorepo. Design tokens defined as CSS custom properties and mirrored as a TypeScript constants object. Dexie.js wraps IndexedDB with fully typed table interfaces. React Router v6 provides view routing; the AppShell component renders the bottom nav (mobile) or sidebar (desktop ≥768px) and slots the current view into a scrollable content area.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Dexie.js 4, Recharts, lucide-react, vite-plugin-pwa, react-router-dom v6

---

## Design System Summary (from Hearth.html prototype)

**App name:** Hearth

**Colors (OKLCH):**
- `--color-bg`: `oklch(98.5% 0.006 240)` — page background
- `--color-surface`: `oklch(96% 0.008 235)` — card background
- `--color-surface-alt`: `oklch(99.2% 0.004 240)` — lighter card
- `--color-line`: `oklch(92% 0.01 235)` — borders
- `--color-ink`: `oklch(22% 0.02 250)` — primary text
- `--color-ink-soft`: `oklch(42% 0.02 245)` — secondary text
- `--color-ink-mute`: `oklch(62% 0.015 240)` — muted text
- `--color-ink-faint`: `oklch(78% 0.012 235)` — faintest text
- `--color-accent`: `oklch(62% 0.09 230)` — slate-blue accent
- `--color-accent-deep`: `oklch(48% 0.11 232)` — dark accent (buttons)
- `--color-accent-soft`: `oklch(90% 0.03 230)` — light accent (backgrounds)
- `--color-teal`: `oklch(72% 0.07 195)`
- `--color-mint`: `oklch(86% 0.05 175)`
- `--color-sand`: `oklch(88% 0.025 85)`
- `--color-blush`: `oklch(82% 0.04 20)`
- `--color-good`: `oklch(68% 0.08 175)`

**Fonts:** Geist (UI), Instrument Serif (display numbers/headings), JetBrains Mono (labels)

**Key components:**
- Cards: `border-radius: 28px`, `border: 1px solid var(--color-line)`, subtle shadow
- Bottom tab bar: absolute positioned, 72px tall, 32px radius, glassmorphism
- Content area starts at 98px from top (below status bar + top bar), ends 90px from bottom (above tab bar)

---

## File Structure

```
src/
  db/
    schema.ts          # Dexie DB class, all table definitions and TS interfaces
    hooks.ts           # useLiveQuery hooks for each table (reactive data)
  components/
    layout/
      AppShell.tsx     # outer wrapper: positions TopBar, scrollable content, BottomNav/Sidebar
      BottomNav.tsx    # mobile tab bar (glass morphism, 72px, floating)
      Sidebar.tsx      # desktop sidebar (≥768px)
      TopBar.tsx       # top logo + profile button, always visible
    ui/
      Card.tsx         # reusable card wrapper with Hearth styling
  views/
    Today/
      index.tsx        # TodayView orchestrator
      WeightDial.tsx   # horizontal ruler drag widget
      MoodPicker.tsx   # 5 emoji mood selector
      QuickStats.tsx   # streak, 7-day trend, goal progress
    Progress/
      index.tsx        # placeholder for Phase 3
    Goals/
      index.tsx        # placeholder for Phase 4
    Settings/
      index.tsx        # export button lives here from Phase 2
  styles/
    tokens.css         # CSS custom properties for all design tokens
    index.css          # Tailwind directives + token imports
  tokens.ts            # TS mirror of CSS vars (for dynamic inline styles)
  App.tsx              # React Router setup
  main.tsx             # ReactDOM.createRoot entry
public/
  manifest.webmanifest # PWA manifest (placeholder icons)
index.html
vite.config.ts
tailwind.config.ts
tsconfig.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx` (skeleton)

- [ ] **Step 1: Scaffold Vite project**

```bash
cd C:/Users/Shay/Desktop/progress-tracker
npm create vite@latest . -- --template react-ts --yes 2>/dev/null || true
```

- [ ] **Step 2: Install all dependencies at once**

```bash
npm install react-router-dom dexie @dexie/react-hooks recharts lucide-react
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p --ts
```

- [ ] **Step 3: Verify installs**

```bash
npm list --depth=0
```
Expected: all packages listed without errors.

- [ ] **Step 4: Configure `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hearth',
        short_name: 'Hearth',
        description: 'Personal health tracking',
        theme_color: '#f5f8fc',
        background_color: '#f5f8fc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 5: Configure `tailwind.config.ts`**

Extend with CSS variable references so Tailwind utility classes resolve to our design tokens. We use `var(--color-*)` pattern so tokens stay in one place (tokens.css).

```ts
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
```

- [ ] **Step 6: Create `src/styles/tokens.css`**

```css
:root {
  --color-bg: oklch(98.5% 0.006 240);
  --color-surface: oklch(96% 0.008 235);
  --color-surface-alt: oklch(99.2% 0.004 240);
  --color-line: oklch(92% 0.01 235);
  --color-ink: oklch(22% 0.02 250);
  --color-ink-soft: oklch(42% 0.02 245);
  --color-ink-mute: oklch(62% 0.015 240);
  --color-ink-faint: oklch(78% 0.012 235);
  --color-accent: oklch(62% 0.09 230);
  --color-accent-deep: oklch(48% 0.11 232);
  --color-accent-soft: oklch(90% 0.03 230);
  --color-teal: oklch(72% 0.07 195);
  --color-mint: oklch(86% 0.05 175);
  --color-sand: oklch(88% 0.025 85);
  --color-blush: oklch(82% 0.04 20);
  --color-good: oklch(68% 0.08 175);
}
```

- [ ] **Step 7: Create `src/styles/index.css`**

```css
@import './tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    height: 100%;
  }
  body {
    background-color: var(--color-bg);
    color: var(--color-ink);
    font-family: 'Geist', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}
```

- [ ] **Step 8: Update `index.html` with fonts**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Hearth</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

> **Note on fonts:** The user spec says "no external fonts loaded at runtime." However, Google Fonts is the simplest approach. For true offline-first, we'd bundle fonts as static assets. Raise this with the user: bundled fonts require ~200KB extra; Google Fonts cached by the service worker is a practical middle ground. Flag for Phase 5 resolution.

- [ ] **Step 9: Create `src/tokens.ts`**

This mirrors CSS variables as JS constants for dynamic/computed inline styles (e.g., for chart colors, SVG strokes, conditional backgrounds).

```ts
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
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at `http://localhost:5173`

---

## Task 2: Dexie Schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/hooks.ts`
- Create: `src/db/index.ts`

- [ ] **Step 1: Create `src/db/schema.ts`**

```ts
import Dexie, { type Table } from 'dexie'

export interface DailyEntry {
  id?: number
  date: string          // ISO date "YYYY-MM-DD", unique
  weightKg: number | null
  moodRating: 1 | 2 | 3 | 4 | 5 | null
  notes: string | null
  createdAt: number     // Date.now()
  updatedAt: number
}

export interface WeeklyPic {
  id?: number
  date: string
  front: Blob | null
  side: Blob | null
  back: Blob | null
  notes: string | null
  createdAt: number
}

export interface MonthlyMeasurement {
  id?: number
  date: string
  measurements: Record<string, number>
  notes: string | null
  createdAt: number
}

export interface Settings {
  id: 1                 // singleton — always ID 1
  units: 'metric' | 'imperial'
  measurementSites: string[]
  goals: {
    targetWeightKg: number | null
    targetBodyFatPct: number | null
    targetMeasurements: Record<string, number>
  }
  appLockEnabled: boolean
  appLockPin: string | null  // hashed, never plaintext
}

class HearthDB extends Dexie {
  dailyEntries!: Table<DailyEntry>
  weeklyPics!: Table<WeeklyPic>
  monthlyMeasurements!: Table<MonthlyMeasurement>
  settings!: Table<Settings>

  constructor() {
    super('HearthDB')
    this.version(1).stores({
      dailyEntries: '++id, &date',
      weeklyPics: '++id, date',
      monthlyMeasurements: '++id, date',
      settings: 'id',
    })
  }
}

export const db = new HearthDB()

// Seed default settings on first open
db.on('populate', async () => {
  await db.settings.add({
    id: 1,
    units: 'metric',
    measurementSites: ['waist', 'hips', 'chest', 'thighs', 'arms'],
    goals: { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} },
    appLockEnabled: false,
    appLockPin: null,
  })
})
```

> **Why Dexie over raw IndexedDB:** Dexie provides a clean promise-based API and `useLiveQuery` for reactive React hooks. Raw IndexedDB is verbose and callback-based — you'd write 5x more boilerplate. Dexie is also battle-tested and handles schema migrations gracefully.

> **Why `&date` on dailyEntries:** The `&` prefix makes it a unique index, enforcing one entry per date at the DB level rather than in application code.

- [ ] **Step 2: Create typed helper functions in `src/db/schema.ts`**

Add to the bottom of the file:

```ts
export async function getOrCreateTodayEntry(): Promise<DailyEntry> {
  const today = new Date().toISOString().slice(0, 10)
  const existing = await db.dailyEntries.where('date').equals(today).first()
  if (existing) return existing
  const id = await db.dailyEntries.add({
    date: today,
    weightKg: null,
    moodRating: null,
    notes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return db.dailyEntries.get(id) as Promise<DailyEntry>
}

export async function upsertTodayEntry(data: Partial<Omit<DailyEntry, 'id' | 'date' | 'createdAt'>>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const existing = await db.dailyEntries.where('date').equals(today).first()
  if (existing?.id) {
    await db.dailyEntries.update(existing.id, { ...data, updatedAt: Date.now() })
  } else {
    await db.dailyEntries.add({
      date: today,
      weightKg: null,
      moodRating: null,
      notes: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...data,
    })
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  if (!s) throw new Error('Settings not seeded — DB populate hook did not run')
  return s
}

export async function exportAllData() {
  const [entries, pics, measurements, settings] = await Promise.all([
    db.dailyEntries.toArray(),
    db.weeklyPics.toArray(),
    db.monthlyMeasurements.toArray(),
    db.settings.toArray(),
  ])
  // Blobs can't JSON.stringify, convert to null for now (pics export in Phase 3)
  const picsExportable = pics.map(p => ({
    ...p,
    front: null, side: null, back: null,
    _note: 'Image blobs excluded from JSON export — use the full backup feature',
  }))
  return { version: 1, exportedAt: new Date().toISOString(), entries, pics: picsExportable, measurements, settings }
}
```

- [ ] **Step 3: Create `src/db/index.ts`**

```ts
export { db, getOrCreateTodayEntry, upsertTodayEntry, getSettings, exportAllData } from './schema'
export type { DailyEntry, WeeklyPic, MonthlyMeasurement, Settings } from './schema'
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

---

## Task 3: React Router + Placeholder Views

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/views/Today/index.tsx` (placeholder)
- Create: `src/views/Progress/index.tsx` (placeholder)
- Create: `src/views/Goals/index.tsx` (placeholder)
- Create: `src/views/Settings/index.tsx` (placeholder)

- [ ] **Step 1: Create `src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { TodayView } from './views/Today'
import { ProgressView } from './views/Progress'
import { GoalsView } from './views/Goals'
import { SettingsView } from './views/Settings'

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayView />} />
        <Route path="/progress" element={<ProgressView />} />
        <Route path="/goals" element={<GoalsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
```

- [ ] **Step 2: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 3: Create placeholder views**

`src/views/Today/index.tsx`:
```tsx
export function TodayView() {
  return <div className="p-6 font-display text-2xl text-ink">Today — coming soon</div>
}
```

`src/views/Progress/index.tsx`:
```tsx
export function ProgressView() {
  return <div className="p-6 font-display text-2xl text-ink">Progress — coming soon</div>
}
```

`src/views/Goals/index.tsx`:
```tsx
export function GoalsView() {
  return <div className="p-6 font-display text-2xl text-ink">Goals — coming soon</div>
}
```

`src/views/Settings/index.tsx`:
```tsx
export function SettingsView() {
  return <div className="p-6 font-display text-2xl text-ink">Settings — coming soon</div>
}
```

---

## Task 4: Layout Shell

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Create `src/components/layout/BottomNav.tsx`**

The tab bar matches the prototype exactly: floating glass pill, 72px tall, 32px radius, 18px from bottom.

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { Sun, TrendingUp, Target, Settings } from 'lucide-react'

const TABS = [
  { path: '/',          label: 'Today',    Icon: Sun },
  { path: '/progress',  label: 'Progress', Icon: TrendingUp },
  { path: '/goals',     label: 'Goals',    Icon: Target },
  { path: '/settings',  label: 'Settings', Icon: Settings },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'absolute', left: 12, right: 12, bottom: 18,
        height: 72, borderRadius: 32, zIndex: 40,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(30,60,90,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        display: 'flex', alignItems: 'center', padding: '0 10px',
      }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const isActive = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1, height: '100%', border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, cursor: 'pointer', padding: 0,
              color: isActive ? 'var(--color-accent-deep)' : 'var(--color-ink-mute)',
              minWidth: 44, // touch target
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.6} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '0.8px', textTransform: 'uppercase',
              fontWeight: isActive ? 600 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/TopBar.tsx`**

```tsx
import { User } from 'lucide-react'

export function TopBar() {
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        height: 56, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 16px 10px',
      }}
    >
      <div style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: 22, color: 'var(--color-accent-deep)', lineHeight: 1,
      }}>
        ◆
      </div>
      <button
        aria-label="Profile settings"
        style={{
          width: 36, height: 36, borderRadius: 12, border: 'none',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-ink-soft)', cursor: 'pointer',
        }}
      >
        <User size={18} />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/layout/Sidebar.tsx`**

Desktop-only (hidden on mobile via CSS). Mirrors the BottomNav tabs vertically.

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { Sun, TrendingUp, Target, Settings } from 'lucide-react'

const TABS = [
  { path: '/',          label: 'Today',    Icon: Sun },
  { path: '/progress',  label: 'Progress', Icon: TrendingUp },
  { path: '/goals',     label: 'Goals',    Icon: Target },
  { path: '/settings',  label: 'Settings', Icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: 220, flexShrink: 0, padding: '24px 12px',
        borderRight: '1px solid var(--color-line)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div style={{ fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: 24, color: 'var(--color-accent-deep)', padding: '8px 12px 20px' }}>
        Hearth
      </div>
      {TABS.map(({ path, label, Icon }) => {
        const isActive = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12, border: 'none',
              background: isActive ? 'var(--color-accent-soft)' : 'transparent',
              color: isActive ? 'var(--color-accent-deep)' : 'var(--color-ink-mute)',
              fontFamily: 'Geist, system-ui, sans-serif', fontSize: 14,
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer', textAlign: 'left', minHeight: 44,
            }}
          >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
            {label}
          </button>
        )
      })}
    </aside>
  )
}
```

- [ ] **Step 4: Create `src/components/layout/AppShell.tsx`**

```tsx
import { type ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

interface AppShellProps { children: ReactNode }

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* Mobile layout */}
      <div
        className="md:hidden"
        style={{
          width: '100%', height: '100dvh',
          background: 'var(--color-bg)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <TopBar />
        <main
          style={{
            position: 'absolute', top: 56, bottom: 0, left: 0, right: 0,
            overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ paddingBottom: 110 }}>
            {children}
          </div>
        </main>
        <BottomNav />
      </div>

      {/* Desktop layout */}
      <div
        className="hidden md:flex"
        style={{
          height: '100dvh', background: 'var(--color-bg)',
        }}
      >
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', maxWidth: 720 }}>
          {children}
        </main>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Verify the shell renders and navigation works**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- Background is cool white
- BottomNav visible with 4 tabs (mobile viewport)
- Clicking tabs changes the URL and renders the placeholder text
- Resize to ≥768px — Sidebar appears, BottomNav hidden

---

## Task 5: Today View

**Files:**
- Modify: `src/views/Today/index.tsx`
- Create: `src/views/Today/WeightDial.tsx`
- Create: `src/views/Today/MoodPicker.tsx`
- Create: `src/views/Today/QuickStats.tsx`

- [ ] **Step 1: Create `src/views/Today/WeightDial.tsx`**

Horizontal drag ruler, matching the prototype. Snap to 0.1 increments.

```tsx
import { useRef, useState } from 'react'

interface WeightDialProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  bg?: string
}

export function WeightDial({ value, onChange, min = 30, max = 250, step = 0.1, bg }: WeightDialProps) {
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; v: number } | null>(null)
  const TICK_PX = 12 // pixels per 0.1 unit

  const commit = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v))
    onChange(Math.round(clamped * 10) / 10)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, v: value }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dv = (-dx / TICK_PX) * step
    commit(dragStart.current.v + dv)
  }
  const onPointerUp = () => {
    setDragging(false)
    dragStart.current = null
  }

  const span = 7
  const baseLo = Math.floor(value - span)
  const baseHi = Math.ceil(value + span)
  const ticks: Array<{ v: number; offset: number; isWhole: boolean; isHalf: boolean }> = []
  for (let raw = baseLo * 10; raw <= baseHi * 10; raw++) {
    const vr = raw / 10
    const offset = (vr - value) * TICK_PX * 10
    const isWhole = raw % 10 === 0
    const isHalf = !isWhole && raw % 5 === 0
    ticks.push({ v: vr, offset, isWhole, isHalf })
  }

  return (
    <div
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Weight"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') commit(value - step)
        if (e.key === 'ArrowRight') commit(value + step)
        if (e.key === 'ArrowUp') commit(value - 1)
        if (e.key === 'ArrowDown') commit(value + 1)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative', height: 110, userSelect: 'none', touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab', outline: 'none',
      }}
    >
      {/* center indicator line */}
      <div style={{
        position: 'absolute', top: 18, bottom: 28, left: '50%', width: 2,
        background: 'var(--color-accent-deep)', borderRadius: 2, zIndex: 3, marginLeft: -1,
        boxShadow: '0 0 0 4px var(--color-accent-soft)',
      }} />
      {/* ticks */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 18, left: '50%', height: 60 }}>
          {ticks.map(({ v, offset, isWhole, isHalf }) => (
            <div key={v.toFixed(1)}>
              <div style={{
                position: 'absolute', left: offset, top: 0, width: 1,
                height: isWhole ? 36 : isHalf ? 22 : 12,
                background: isWhole ? 'var(--color-ink-soft)' : 'var(--color-ink-faint)',
                opacity: isWhole ? 0.9 : 0.55,
              }} />
              {isWhole && (
                <div style={{
                  position: 'absolute', left: offset, top: 40,
                  transform: 'translateX(-50%)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'var(--color-ink-mute)', letterSpacing: '0.5px',
                }}>{v.toFixed(0)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* edge fade */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(to right, ${bg ?? 'var(--color-surface-alt)'} 0%, transparent 18%, transparent 82%, ${bg ?? 'var(--color-surface-alt)'} 100%)`,
      }} />
    </div>
  )
}
```

- [ ] **Step 2: Create `src/views/Today/MoodPicker.tsx`**

```tsx
interface MoodPickerProps {
  value: 1 | 2 | 3 | 4 | 5 | null
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
}

const MOODS: { rating: 1 | 2 | 3 | 4 | 5; label: string; bg: string }[] = [
  { rating: 5, label: 'Great', bg: 'var(--color-mint)' },
  { rating: 4, label: 'Good',  bg: 'var(--color-teal)' },
  { rating: 3, label: 'OK',    bg: 'var(--color-sand)' },
  { rating: 2, label: 'Meh',   bg: 'var(--color-ink-faint)' },
  { rating: 1, label: 'Low',   bg: 'var(--color-blush)' },
]

function MoodFace({ rating, size = 24 }: { rating: number; size?: number }) {
  const eyes = <>
    <circle cx="8.5" cy="10" r="1.2" fill="currentColor"/>
    <circle cx="15.5" cy="10" r="1.2" fill="currentColor"/>
  </>
  const mouths: Record<number, React.ReactNode> = {
    5: <path d="M7 14c1.5 2.5 8.5 2.5 10 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>,
    4: <path d="M8 14c1 1.5 7 1.5 8 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>,
    3: <path d="M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>,
    2: <path d="M8 15l8-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>,
    1: <path d="M8 16c1-2 7-2 8 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{eyes}{mouths[rating]}</svg>
  )
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const selected = MOODS.find(m => m.rating === value)

  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 24,
      padding: '18px 20px', border: '1px solid var(--color-line)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--color-ink-mute)' }}>
          How are you feeling
        </span>
        {selected && (
          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 18, color: 'var(--color-accent-deep)', fontStyle: 'italic' }}>
            {selected.label.toLowerCase()}
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label="Mood rating" style={{ display: 'flex', gap: 8 }}>
        {MOODS.map(m => (
          <button
            key={m.rating}
            role="radio"
            aria-checked={value === m.rating}
            aria-label={m.label}
            onClick={() => onChange(m.rating)}
            style={{
              flex: 1, aspectRatio: '1', border: 'none', cursor: 'pointer',
              borderRadius: 16, minHeight: 44,
              background: value === m.rating ? m.bg : 'var(--color-surface)',
              color: 'var(--color-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: value === m.rating ? 'inset 0 0 0 1.5px var(--color-ink)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <MoodFace rating={m.rating} size={26} />
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/views/Today/QuickStats.tsx`**

Shows current weight, 7-day trend, progress toward goal.

```tsx
import { useLiveQuery } from '@dexie/react-hooks'
import { db } from '../../db'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function QuickStats() {
  const recent = useLiveQuery(() =>
    db.dailyEntries
      .where('date').between(
        new Date(Date.now() - 8 * 86400_000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10),
        true, true
      )
      .toArray()
  )
  const settings = useLiveQuery(() => db.settings.get(1))

  if (!recent || !settings) return null

  const withWeight = recent.filter(e => e.weightKg != null)
  if (withWeight.length === 0) return null

  const latest = withWeight[withWeight.length - 1]
  const oldest = withWeight[0]
  const delta = withWeight.length >= 2 ? latest.weightKg! - oldest.weightKg! : 0

  const target = settings.goals.targetWeightKg
  const pctToGoal = target && oldest.weightKg
    ? Math.min(100, Math.round(((oldest.weightKg - latest.weightKg!) / (oldest.weightKg - target)) * 100))
    : null

  const TrendIcon = delta < -0.1 ? TrendingDown : delta > 0.1 ? TrendingUp : Minus
  const trendColor = delta < -0.1 ? 'var(--color-good)' : delta > 0.1 ? 'var(--color-blush)' : 'var(--color-ink-mute)'
  const unit = settings.units === 'metric' ? 'kg' : 'lb'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16,
    }}>
      <StatCard label="7-day trend" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`} unit={unit}>
        <TrendIcon size={14} style={{ color: trendColor }} />
      </StatCard>
      {pctToGoal !== null && (
        <StatCard label="To goal" value={`${pctToGoal}`} unit="%" />
      )}
    </div>
  )
}

function StatCard({ label, value, unit, children }: {
  label: string; value: string; unit: string; children?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 18,
      padding: '12px 14px 14px', border: '1px solid var(--color-line)',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22,
          letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: 'var(--color-ink-mute)' }}>{unit}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/views/Today/index.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useLiveQuery } from '@dexie/react-hooks'
import { Sparkles, Camera, Ruler } from 'lucide-react'
import { db, upsertTodayEntry } from '../../db'
import { WeightDial } from './WeightDial'
import { MoodPicker } from './MoodPicker'
import { QuickStats } from './QuickStats'

export function TodayView() {
  const today = new Date().toISOString().slice(0, 10)
  const entry = useLiveQuery(() => db.dailyEntries.where('date').equals(today).first(), [today])
  const settings = useLiveQuery(() => db.settings.get(1))

  const unit = settings?.units === 'metric' ? 'kg' : 'lb'
  const defaultWeight = settings?.units === 'metric' ? 70 : 155

  const [weight, setWeight] = useState<number>(defaultWeight)
  const [noteOpen, setNoteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from DB when entry loads
  useEffect(() => {
    if (entry?.weightKg != null) setWeight(entry.weightKg)
  }, [entry?.weightKg])

  const moodRating = entry?.moodRating ?? null
  const notes = entry?.notes ?? ''
  const logged = entry?.weightKg != null

  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const logWeight = async () => {
    setSaving(true)
    await upsertTodayEntry({ weightKg: weight })
    setSaving(false)
  }

  const setMood = (r: 1 | 2 | 3 | 4 | 5) => upsertTodayEntry({ moodRating: r })
  const setNotes = (n: string) => upsertTodayEntry({ notes: n })

  const wholeW = Math.floor(weight)
  const decW = Math.round((weight % 1) * 10)

  return (
    <div style={{ padding: '0 20px', fontFamily: 'Geist, system-ui, sans-serif', color: 'var(--color-ink)' }}>
      {/* Greeting */}
      <div style={{ paddingTop: 8, paddingBottom: 28 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
          marginBottom: 6 }}>
          {dayStr} · {dateStr}
        </div>
        <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 34,
          lineHeight: 1.05, letterSpacing: '-0.5px' }}>
          Good morning.
        </div>
      </div>

      {/* Hero weight card */}
      <div style={{
        background: 'var(--color-surface-alt)', borderRadius: 28,
        padding: '28px 22px 20px', marginBottom: 16,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(30,60,90,0.12)',
        border: '1px solid var(--color-line)',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
          marginBottom: 4 }}>
          Morning weight
        </div>

        {/* Big number */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: 8, padding: '8px 0 4px' }}>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 100,
            lineHeight: 0.9, letterSpacing: '-3px', fontVariantNumeric: 'tabular-nums' }}>
            {wholeW}
            <span style={{ color: 'var(--color-accent)' }}>.{decW}</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            color: 'var(--color-ink-mute)', letterSpacing: '0.5px' }}>{unit}</div>
        </div>

        <WeightDial
          value={weight}
          onChange={setWeight}
          min={settings?.units === 'metric' ? 30 : 66}
          max={settings?.units === 'metric' ? 250 : 550}
        />

        {/* Log button */}
        <button
          onClick={logWeight}
          disabled={saving}
          aria-label={logged ? `Logged ${weight.toFixed(1)} ${unit}` : 'Log weight'}
          style={{
            marginTop: 8, width: '100%', height: 56, borderRadius: 18,
            background: logged ? 'var(--color-accent-soft)' : 'var(--color-accent-deep)',
            color: logged ? 'var(--color-accent-deep)' : '#fff',
            border: 'none', fontFamily: 'Geist, system-ui', fontSize: 17, fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.25s ease',
          }}
        >
          {logged ? `✓ Logged · ${weight.toFixed(1)} ${unit}` : 'Log weight'}
        </button>

        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 12, gap: 6, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
          color: 'var(--color-ink-faint)' }}>
          <Sparkles size={11} strokeWidth={1.8} />
          {logged ? 'Saved today' : 'Not logged yet'}
        </div>
      </div>

      {/* Quick stats */}
      <QuickStats />

      {/* Mood */}
      <div style={{ marginBottom: 12 }}>
        <MoodPicker value={moodRating} onChange={setMood} />
      </div>

      {/* Notes */}
      <div style={{
        background: 'var(--color-surface-alt)', borderRadius: 24,
        padding: '18px 20px', marginBottom: 12,
        border: '1px solid var(--color-line)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--color-ink-mute)' }}>
            Note
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: 'var(--color-ink-faint)' }}>
            {notes.length}/240
          </span>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 240))}
          placeholder="How did today go?"
          aria-label="Daily notes"
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none',
            background: 'transparent', fontFamily: 'Geist, system-ui', fontSize: 15,
            color: 'var(--color-ink)', lineHeight: 1.5, minHeight: 54, padding: 0,
          }}
        />
      </div>

      {/* Quick add strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <QuickAddButton icon={<Camera size={18} />} label="Progress photo" />
        <QuickAddButton icon={<Ruler size={18} />} label="Measurements" />
      </div>
    </div>
  )
}

function QuickAddButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      style={{
        flex: 1, height: 56, borderRadius: 18,
        background: 'var(--color-surface)', border: '1px solid var(--color-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'Geist, system-ui', fontSize: 14, color: 'var(--color-ink-soft)',
        cursor: 'pointer',
      }}
    >
      {icon}{label}
    </button>
  )
}
```

- [ ] **Step 5: Test Today view end-to-end**

Open `http://localhost:5173`. Verify:
- Weight dial renders and responds to drag
- Big number updates live as you drag
- "Log weight" button saves to IndexedDB (check DevTools → Application → IndexedDB → HearthDB)
- Logged state persists on page refresh
- Mood picker highlights selected mood
- Notes save on type
- Keyboard: Tab through elements, arrow keys move the dial

---

## Task 6: Export Button (non-negotiable from day one)

**Files:**
- Modify: `src/views/Settings/index.tsx`
- Modify: `src/db/schema.ts` (exportAllData already written in Task 2)

- [ ] **Step 1: Update `src/views/Settings/index.tsx`**

```tsx
import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportAllData } from '../../db'

export function SettingsView() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hearth-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'Geist, system-ui', color: 'var(--color-ink)' }}>
      <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32,
        marginBottom: 32, letterSpacing: '-0.5px' }}>Settings</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
          marginBottom: 12 }}>Data</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          aria-label="Export all data as JSON"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '16px 20px', borderRadius: 18,
            background: 'var(--color-surface-alt)', border: '1px solid var(--color-line)',
            fontFamily: 'Geist, system-ui', fontSize: 15, color: 'var(--color-ink)',
            cursor: exporting ? 'wait' : 'pointer', textAlign: 'left',
          }}
        >
          <Download size={20} style={{ color: 'var(--color-accent-deep)' }} />
          {exporting ? 'Preparing export…' : 'Export all data as JSON'}
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Test export**

Click Settings tab → click export button → verify JSON file downloads with correct filename and valid structure.

---

## Task 7: Verify & Clean Up

- [ ] **Step 1: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Build check**
```bash
npm run build
```
Expected: Build succeeds, `dist/` generated.

- [ ] **Step 3: Preview prod build**
```bash
npm run preview
```
Expected: App works at `http://localhost:4173`.

- [ ] **Step 4: Create placeholder icons for PWA manifest**

```bash
# Generate minimal placeholder PNG icons (pure Node, no ImageMagick)
node -e "
const fs = require('fs');
// 1x1 blue pixel PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('public/icon-192.png', png);
fs.writeFileSync('public/icon-512.png', png);
console.log('Placeholder icons written');
"
```

---

## Open Questions for User (before Phase 3)

1. **App name confirmed as "Hearth"?** The design prototype uses this name. If you want Pulse, Baseline, or something else, say so now — it's in the manifest, HTML title, and Sidebar.
2. **Units default:** The spec says metric. Is your personal data in kg? The UI will show kg by default; can be changed in Settings later.
3. **Font loading:** The spec says no external fonts at runtime, but I'm currently loading Google Fonts. Options: (a) keep as-is and cache via service worker in Phase 5, (b) bundle fonts as static files now (adds ~400KB to repo). Which do you prefer?
4. **Greeting name:** The prototype says "Good morning, Maren." I've removed the name since there's no user profile. Want a name field in Settings?

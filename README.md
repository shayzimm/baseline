# Baseline

A personal health tracker — weight, mood, progress photos, and body measurements. Runs entirely on-device with no account, no server, and no internet required after the first load.

---

## Installing on your phone (Android / NothingOS)

Baseline is a Progressive Web App (PWA). To install it, you first need to host it somewhere so your phone can reach it over HTTPS — service workers (which power offline use) don't work without it.

### Step 1: Build the app

```bash
npm run build
```

This produces a `dist/` folder ready to deploy.

### Step 2: Deploy to GitHub Pages

1. **Create a GitHub repository** (e.g. `baseline`) and push this project to it

2. **Set the base path** — open `vite.config.ts` and set `VITE_BASE` to your repo name:

   ```bash
   # In your .env.production (create this file if it doesn't exist)
   VITE_BASE=/baseline/
   ```

   Replace `baseline` with whatever you named your repo. If you use a custom domain or a repo named `yourusername.github.io`, set it to `/` instead.

3. **Enable GitHub Pages via Actions** — in your repo on GitHub, go to **Settings → Pages → Source** and select **GitHub Actions**. Then create this file:

   `.github/workflows/deploy.yml`
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       permissions:
         pages: write
         id-token: write
       environment:
         name: github-pages
         url: ${{ steps.deploy.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm ci
         - run: npm run build
           env:
             VITE_BASE: /baseline/
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - uses: actions/deploy-pages@v4
           id: deploy
   ```

   Change `VITE_BASE: /baseline/` to match your repo name.

4. **Push to `main`** — the workflow runs automatically and your app will be live at `https://yourusername.github.io/baseline/`

### Step 3: Install to your home screen

1. Open **Chrome** on your phone and navigate to your URL
2. Either:
   - Go to **Settings → App** inside Baseline and tap **Install**, or
   - Tap Chrome's **⋮ menu → Add to Home screen**
3. Tap **Install** to confirm

The app opens full-screen with no browser chrome, just like a native app. Your data lives entirely on your phone — the hosted files are just the app shell.

> **Tip:** After installing, the app works fully offline. You only need the URL again if you reinstall or switch phones.

---

## Running locally (for development)

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (included with Node)

### Setup

```bash
# Install dependencies
npm install

# Start the dev server (hot reload)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

The output goes to `dist/`. To preview the production build locally:

```bash
npm run preview
```

Open [http://localhost:4173](http://localhost:4173). This is the server to use when testing the PWA service worker and offline behaviour, since the dev server doesn't fully simulate it.

### Regenerate app icons

If you update `public/icon.svg`, regenerate the PNG icons:

```bash
node scripts/gen-icons.mjs
```

This writes `public/icon-192.png`, `public/icon-512.png`, and `public/favicon-32.png`.

---

## Data & privacy

All data is stored locally in your browser's IndexedDB — nothing is sent anywhere. You can export a full JSON backup at any time from **Settings → Export all data**, and restore it with **Import from backup**.

Clearing browser data or uninstalling the PWA will erase all app data. Export a backup first if you need to reinstall.

---

## Tech stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Database | Dexie.js (IndexedDB) |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Styling | Tailwind CSS v3 + OKLCH design tokens |

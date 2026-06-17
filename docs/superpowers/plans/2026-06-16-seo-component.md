# SEO Component + HelmetProvider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `react-helmet-async` to `medisxime-landing`, wrap the app root with `HelmetProvider`, and ship a reusable `SEO.tsx` component with clinic-themed defaults, plus the one missing generic meta tag (`robots`) in `index.html`.

**Architecture:** `react-helmet-async`'s `HelmetProvider` is mounted once in `main.tsx` above `BrowserRouter`. A new `SEO.tsx` component renders a `<Helmet>` block with `title`/`description`/`canonical`/Open Graph tags, using clinic-branded defaults that match the text already present in `index.html` (discovered during planning — `index.html` already ships title/description/OG/Twitter tags and `lang="es"`, so only `robots` is genuinely missing).

**Tech Stack:** React 19, Vite 8, TypeScript, `react-helmet-async` (only new dependency).

## Global Constraints

- Only dependency to install: `react-helmet-async` (no `@types/...`, no other packages).
- Do not modify styles or routes.
- `SEO.tsx` props: `title?: string`, `description?: string`, `canonical?: string` — all optional.
- Defaults (for both `SEO.tsx` and `index.html`) must use the clinic's existing tone/copy — reuse the title/description text already in `index.html` rather than inventing new copy, to keep both sources consistent.
- No new pages/routes consume `<SEO />` in this plan — the component just needs to exist and be ready to use.
- This package (`medisxime-landing`) has no test runner configured (no vitest/jest in `package.json`). The verification gate for every task is: `pnpm -F medisxime-landing build` succeeds (runs `tsc` via Vite build) — there are no unit tests to write.

---

## File Structure

- Modify: `medisxime-landing/package.json` — add `react-helmet-async` dependency.
- Modify: `medisxime-landing/src/main.tsx` — wrap render tree with `HelmetProvider`.
- Create: `medisxime-landing/src/components/SEO.tsx` — reusable SEO component.
- Modify: `medisxime-landing/index.html` — add missing `robots` meta tag.

---

### Task 1: Install `react-helmet-async`

**Files:**
- Modify: `medisxime-landing/package.json:12-23` (dependencies block)

**Interfaces:**
- Produces: `react-helmet-async` package available for import (`Helmet`, `HelmetProvider`) in Task 2 and Task 3.

- [ ] **Step 1: Add the dependency to `package.json`**

Edit `medisxime-landing/package.json`. Current `dependencies` block:

```json
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@tailwindcss/vite": "^4.3.0",
    "framer-motion": "^12.39.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-hook-form": "^7.76.0",
    "react-router-dom": "^7.15.1",
    "tailwindcss": "^4.3.0",
    "zod": "^4.4.3"
  },
```

Replace with (inserting `react-helmet-async` in alphabetical order, right after `react-dom`):

```json
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@tailwindcss/vite": "^4.3.0",
    "framer-motion": "^12.39.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-helmet-async": "^3.0.0",
    "react-hook-form": "^7.76.0",
    "react-router-dom": "^7.15.1",
    "tailwindcss": "^4.3.0",
    "zod": "^4.4.3"
  },
```

`react-helmet-async@3.0.0`'s `peerDependencies` declare `"react": "^16.6.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`, so it's compatible with this project's React 19.

- [ ] **Step 2: Install from the repo root**

Run (from the monorepo root, where `pnpm-lock.yaml` lives):

```bash
pnpm install
```

Expected: pnpm resolves and adds `react-helmet-async` to `node_modules` and updates `pnpm-lock.yaml`. No errors. No other dependency versions should change — if pnpm wants to touch unrelated packages, stop and investigate before continuing.

- [ ] **Step 3: Verify the install**

Run:

```bash
pnpm -F medisxime-landing exec node -e "console.log(require('react-helmet-async/package.json').version)"
```

Expected output: `3.0.0`

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/package.json pnpm-lock.yaml
git commit -m "chore: add react-helmet-async dependency"
```

---

### Task 2: Wrap the app with `HelmetProvider`

**Files:**
- Modify: `medisxime-landing/src/main.tsx`

**Interfaces:**
- Consumes: `HelmetProvider` from `react-helmet-async` (installed in Task 1).
- Produces: `HelmetProvider` context available to every component in the tree, including the `SEO` component built in Task 3.

- [ ] **Step 1: Edit `main.tsx`**

Current file (`medisxime-landing/src/main.tsx`):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// ── Global fetch interceptor: detects 401 and notifies the app ────────────────
const _originalFetch = window.fetch
window.fetch = async (...args) => {
  const res = await _originalFetch(...args)
  if (res.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    // Skip login endpoint to avoid infinite loop
    if (!url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      window.dispatchEvent(new CustomEvent('session:expired'))
    }
  }
  return res
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Replace it with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

// ── Global fetch interceptor: detects 401 and notifies the app ────────────────
const _originalFetch = window.fetch
window.fetch = async (...args) => {
  const res = await _originalFetch(...args)
  if (res.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    // Skip login endpoint to avoid infinite loop
    if (!url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      window.dispatchEvent(new CustomEvent('session:expired'))
    }
  }
  return res
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
```

Only change: the `HelmetProvider` import and wrapper. The fetch interceptor and `BrowserRouter`/`App` nesting are untouched.

- [ ] **Step 2: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors (no unit tests exist for this package; a clean build is the verification gate).

- [ ] **Step 3: Manual smoke check**

Run the dev server and confirm the app still renders (no blank page, no console errors about `HelmetProvider`):

```bash
pnpm -F medisxime-landing dev
```

Open `http://localhost:5173` in a browser, confirm the landing page loads normally, then stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/main.tsx
git commit -m "feat: wrap app with HelmetProvider"
```

---

### Task 3: Create the `SEO.tsx` component

**Files:**
- Create: `medisxime-landing/src/components/SEO.tsx`

**Interfaces:**
- Consumes: `Helmet` from `react-helmet-async` (installed in Task 1); relies on `HelmetProvider` being mounted above it in the tree (Task 2).
- Produces: `export function SEO(props: { title?: string; description?: string; canonical?: string }): JSX.Element` — importable as `import { SEO } from './components/SEO'` (or relative equivalent) by future pages. Not consumed by any other task in this plan.

- [ ] **Step 1: Create the component file**

Create `medisxime-landing/src/components/SEO.tsx`:

```tsx
import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
}

const DEFAULT_TITLE = 'Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora'
const DEFAULT_DESCRIPTION =
  'Medis — Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico-ocupacionales, Medicina Laboral y consultoría en el SGSST. Salud en el trabajo para tu equipo y para ti.'

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
    </Helmet>
  )
}
```

The defaults intentionally reuse the exact title/description copy already present in `medisxime-landing/index.html`, so the static HTML and the runtime-injected tags never disagree.

- [ ] **Step 2: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors. `SEO.tsx` is not imported anywhere yet, so an unused-file warning is not expected (Vite/tsc don't flag unimported-but-unused files); if the build fails, read the TypeScript error and fix the prop types/JSX before proceeding.

- [ ] **Step 3: Lint check**

Run:

```bash
pnpm -F medisxime-landing lint
```

Expected: no new lint errors from `src/components/SEO.tsx`.

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/SEO.tsx
git commit -m "feat: add base SEO component with clinic-themed defaults"
```

---

### Task 4: Add the missing `robots` meta tag to `index.html`

**Files:**
- Modify: `medisxime-landing/index.html:10-13`

**Interfaces:**
- None (static HTML only; no other task depends on this).

`index.html` already ships `lang="es"`, `title`, `description`, `keywords`, `author`, `theme-color`, full Open Graph block, and Twitter card tags. The only generic tag called for in the spec that is genuinely absent is `robots`.

- [ ] **Step 1: Edit `index.html`**

Current block (`medisxime-landing/index.html:8-13`):

```html
    <!-- SEO -->
    <title>Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora</title>
    <meta name="description" content="Medis — Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico-ocupacionales, Medicina Laboral y consultoría en el SGSST. Salud en el trabajo para tu equipo y para ti." />
    <meta name="keywords" content="medicina laboral, medicina bioreguladora, exámenes médico-ocupacionales, SGSST, salud en el trabajo, Dra. Ximena Correa" />
    <meta name="author" content="Medis" />
    <meta name="theme-color" content="#5C3A28" />
```

Replace with (adding `robots` right after `description`):

```html
    <!-- SEO -->
    <title>Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora</title>
    <meta name="description" content="Medis — Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico-ocupacionales, Medicina Laboral y consultoría en el SGSST. Salud en el trabajo para tu equipo y para ti." />
    <meta name="robots" content="index, follow" />
    <meta name="keywords" content="medicina laboral, medicina bioreguladora, exámenes médico-ocupacionales, SGSST, salud en el trabajo, Dra. Ximena Correa" />
    <meta name="author" content="Medis" />
    <meta name="theme-color" content="#5C3A28" />
```

- [ ] **Step 2: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds (Vite copies `index.html` as-is; a malformed tag would still build, so also visually confirm the tag is well-formed by re-reading the file).

- [ ] **Step 3: Manual smoke check**

Run the dev server and view page source (or `curl http://localhost:5173/`) to confirm the new `<meta name="robots" content="index, follow" />` tag is present in the served HTML:

```bash
pnpm -F medisxime-landing dev
```

In another terminal:

```bash
curl -s http://localhost:5173/ | grep "robots"
```

Expected output contains: `<meta name="robots" content="index, follow" />`

Stop the dev server (Ctrl+C) when done.

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/index.html
git commit -m "feat: add robots meta tag to index.html"
```

---

## Out of Scope (per spec)

- No new pages/routes consume `<SEO />`.
- No `sitemap.xml`, `robots.txt`, or `og:image`.
- No style or route changes.
- No dependency other than `react-helmet-async`.

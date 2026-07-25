# SEO Injection into Public Landing Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `SEO` component into the 5 public landing sections (`Hero`, `About`, `Classes`, `Instructors`, `Testimonials`) in `medisxime-landing`, each with its own clinic-themed `title`/`description`.

**Architecture:** Each component currently returns a single `<section>` root element. Each task wraps that return in a `<>...</>` Fragment and adds `<SEO title="..." description="..." />` as the first child, before the existing `<section>`. No other JSX, styles, or logic changes. `Hero`/`About`/`Classes`/`Instructors`/`Testimonials` all render together on the single `/` route (`LandingPage` in `App.tsx`), so `react-helmet-async`'s last-mounted-wins rule for singleton tags means only `Testimonials`' `<title>`/`description` is visible in the browser tab — this is documented, expected behavior, not a defect to fix in this plan.

**Tech Stack:** React 19, TypeScript, `react-helmet-async` (already installed and wired via `HelmetProvider` in `main.tsx` — no new dependency).

## Global Constraints

- Each of the 5 components imports `SEO` from `./SEO` (same directory: `medisxime-landing/src/components/`) and renders it as the first child of a Fragment wrapping the existing `<section>`.
- Do not modify `medisxime-landing/src/components/SEO.tsx` or `medisxime-landing/src/main.tsx` — both are already correct from the prior task.
- Do not modify any component under `/admin`, `/user`, `/professional`, nor `FinalCTA.tsx`, `Navbar.tsx`, `Footer.tsx`.
- Do not modify styles, layout, or routes. The only change per file is: one new import line, and wrapping the existing `return (<section>...</section>)` in a Fragment with `<SEO />` as the first child.
- No component passes a `canonical` prop (no canonical URL defined in scope).
- This package (`medisxime-landing`) has no test runner configured. The verification gate for every task is: `pnpm -F medisxime-landing build` succeeds (runs `tsc` via Vite build).
- Exact `title`/`description` copy per component (verbatim, from the approved spec):

| Component | `title` | `description` |
|---|---|---|
| `Hero.tsx` | `Inicio \| Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora` | `Bienvenido a Medis, el consultorio de la Dra. Ximena Correa. Agenda tu cita en medicina bioreguladora, salud ocupacional y exámenes médico-ocupacionales.` |
| `About.tsx` | `Medicina con Calidez Humana \| Medis` | `Conoce el enfoque de atención integral de Medis: calidez humana, profesionalismo y compromiso real con la salud de pacientes y empresas.` |
| `Classes.tsx` | `Nuestros Servicios Médicos \| Medis` | `Descubre el catálogo de servicios de Medis: exámenes médico-ocupacionales, consultoría en SG-SST, medicina laboral y medicina bioreguladora para empresas y pacientes.` |
| `Instructors.tsx` | `Sobre la Dra. Ximena Correa \| Medis` | `Conoce a la Dra. Ximena Correa, especialista en salud ocupacional y medicina bioreguladora, al frente del equipo médico de Medis.` |
| `Testimonials.tsx` | `Testimonios de Pacientes y Empresas \| Medis` | `Lee las experiencias de pacientes y empresas que confían en los servicios médicos de Medis y la Dra. Ximena Correa.` |

---

## File Structure

- Modify: `medisxime-landing/src/components/Hero.tsx` — add `<SEO />` for the hero/landing-entry section.
- Modify: `medisxime-landing/src/components/About.tsx` — add `<SEO />` for the "Medicina con Calidez Humana" section.
- Modify: `medisxime-landing/src/components/Classes.tsx` — add `<SEO />` for the services catalog section.
- Modify: `medisxime-landing/src/components/Instructors.tsx` — add `<SEO />` for the doctor profile section.
- Modify: `medisxime-landing/src/components/Testimonials.tsx` — add `<SEO />` for the testimonials section.

---

### Task 1: Add `<SEO />` to `Hero.tsx`

**Files:**
- Modify: `medisxime-landing/src/components/Hero.tsx`

**Interfaces:**
- Consumes: `SEO` component — `export function SEO({ title, description, canonical }: { title?: string; description?: string; canonical?: string })` from `medisxime-landing/src/components/SEO.tsx` (already built and merged).
- Produces: none (leaf consumer; no other task depends on `Hero.tsx`'s output).

- [ ] **Step 1: Add the import**

Current imports (`medisxime-landing/src/components/Hero.tsx:1-3`):

```tsx
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
```

Replace with:

```tsx
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SEO } from './SEO'
```

- [ ] **Step 2: Wrap the return statement (opening)**

Find (`medisxime-landing/src/components/Hero.tsx:46-47`):

```tsx
  return (
    <section
```

Replace with:

```tsx
  return (
    <>
      <SEO
        title="Inicio | Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora"
        description="Bienvenido a Medis, el consultorio de la Dra. Ximena Correa. Agenda tu cita en medicina bioreguladora, salud ocupacional y exámenes médico-ocupacionales."
      />
      <section
```

- [ ] **Step 3: Wrap the return statement (closing)**

Find (`medisxime-landing/src/components/Hero.tsx:287-289`):

```tsx
    </section>
  )
}
```

Replace with:

```tsx
    </section>
    </>
  )
}
```

(The inner JSX between the opening `<section ...>` and closing `</section>` is unchanged — only the Fragment wrapper and `<SEO />` are new.)

- [ ] **Step 4: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add medisxime-landing/src/components/Hero.tsx
git commit -m "feat: add SEO metadata to Hero section"
```

---

### Task 2: Add `<SEO />` to `About.tsx`

**Files:**
- Modify: `medisxime-landing/src/components/About.tsx`

**Interfaces:**
- Consumes: `SEO` component (same as Task 1) from `medisxime-landing/src/components/SEO.tsx`.
- Produces: none.

- [ ] **Step 1: Add the import**

Current imports (`medisxime-landing/src/components/About.tsx:1-3`):

```tsx
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
```

Replace with:

```tsx
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { SEO } from './SEO'
```

- [ ] **Step 2: Wrap the return statement (opening)**

Find (`medisxime-landing/src/components/About.tsx:87-88`):

```tsx
  return (
    <section
```

Replace with:

```tsx
  return (
    <>
      <SEO
        title="Medicina con Calidez Humana | Medis"
        description="Conoce el enfoque de atención integral de Medis: calidez humana, profesionalismo y compromiso real con la salud de pacientes y empresas."
      />
      <section
```

- [ ] **Step 3: Wrap the return statement (closing)**

Find (`medisxime-landing/src/components/About.tsx:200-202`):

```tsx
    </section>
  )
}
```

Replace with:

```tsx
    </section>
    </>
  )
}
```

- [ ] **Step 4: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add medisxime-landing/src/components/About.tsx
git commit -m "feat: add SEO metadata to About section"
```

---

### Task 3: Add `<SEO />` to `Classes.tsx`

**Files:**
- Modify: `medisxime-landing/src/components/Classes.tsx`

**Interfaces:**
- Consumes: `SEO` component (same as Task 1) from `medisxime-landing/src/components/SEO.tsx`.
- Produces: none.

- [ ] **Step 1: Add the import**

Current imports (`medisxime-landing/src/components/Classes.tsx:1-3`):

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
```

Replace with:

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SEO } from './SEO'
```

- [ ] **Step 2: Wrap the return statement (opening)**

Find (`medisxime-landing/src/components/Classes.tsx:182-183`):

```tsx
  return (
    <section id="servicios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem' }}>
```

Replace with:

```tsx
  return (
    <>
      <SEO
        title="Nuestros Servicios Médicos | Medis"
        description="Descubre el catálogo de servicios de Medis: exámenes médico-ocupacionales, consultoría en SG-SST, medicina laboral y medicina bioreguladora para empresas y pacientes."
      />
      <section id="servicios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem' }}>
```

- [ ] **Step 3: Wrap the return statement (closing)**

Find (`medisxime-landing/src/components/Classes.tsx:250-252`):

```tsx
    </section>
  )
}
```

Replace with:

```tsx
    </section>
    </>
  )
}
```

- [ ] **Step 4: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add medisxime-landing/src/components/Classes.tsx
git commit -m "feat: add SEO metadata to Classes section"
```

---

### Task 4: Add `<SEO />` to `Instructors.tsx`

**Files:**
- Modify: `medisxime-landing/src/components/Instructors.tsx`

**Interfaces:**
- Consumes: `SEO` component (same as Task 1) from `medisxime-landing/src/components/SEO.tsx`.
- Produces: none.

- [ ] **Step 1: Add the import**

Current imports (`medisxime-landing/src/components/Instructors.tsx:1-2`):

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
```

Replace with:

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SEO } from './SEO'
```

- [ ] **Step 2: Wrap the return statement (opening)**

Find (`medisxime-landing/src/components/Instructors.tsx:15-16`):

```tsx
  return (
    <section id="sobre-la-doctora" style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}>
```

Replace with:

```tsx
  return (
    <>
      <SEO
        title="Sobre la Dra. Ximena Correa | Medis"
        description="Conoce a la Dra. Ximena Correa, especialista en salud ocupacional y medicina bioreguladora, al frente del equipo médico de Medis."
      />
      <section id="sobre-la-doctora" style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}>
```

- [ ] **Step 3: Wrap the return statement (closing)**

Find (`medisxime-landing/src/components/Instructors.tsx:174-176`):

```tsx
    </section>
  )
}
```

Replace with:

```tsx
    </section>
    </>
  )
}
```

- [ ] **Step 4: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add medisxime-landing/src/components/Instructors.tsx
git commit -m "feat: add SEO metadata to Instructors section"
```

---

### Task 5: Add `<SEO />` to `Testimonials.tsx`

**Files:**
- Modify: `medisxime-landing/src/components/Testimonials.tsx`

**Interfaces:**
- Consumes: `SEO` component (same as Task 1) from `medisxime-landing/src/components/SEO.tsx`.
- Produces: none. This is the last component in `LandingPage`'s render order (`App.tsx`), so its `<SEO />` is the one whose `title`/`description` actually wins in the browser tab per `react-helmet-async`'s last-mounted-wins rule for singleton tags — verified manually in Step 5 below.

- [ ] **Step 1: Add the import**

Current imports (`medisxime-landing/src/components/Testimonials.tsx:1-2`):

```tsx
import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
```

Replace with:

```tsx
import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { SEO } from './SEO'
```

- [ ] **Step 2: Wrap the return statement (opening)**

Find (`medisxime-landing/src/components/Testimonials.tsx:55-56`):

```tsx
  return (
    <section id="testimonios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```

Replace with:

```tsx
  return (
    <>
      <SEO
        title="Testimonios de Pacientes y Empresas | Medis"
        description="Lee las experiencias de pacientes y empresas que confían en los servicios médicos de Medis y la Dra. Ximena Correa."
      />
      <section id="testimonios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```

- [ ] **Step 3: Wrap the return statement (closing)**

Find (`medisxime-landing/src/components/Testimonials.tsx:266-268`):

```tsx
    </section>
  )
}
```

Replace with:

```tsx
    </section>
    </>
  )
}
```

- [ ] **Step 4: Verify the build**

Run:

```bash
pnpm -F medisxime-landing build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Manual smoke check (whole landing page, all 5 tasks)**

This is the final task in the plan, so this step verifies the cumulative result of Tasks 1-5 together.

Run the dev server:

```bash
pnpm -F medisxime-landing dev
```

Open `http://localhost:5173/` in a browser and confirm:
- The page renders identically to before (same visual layout, no missing sections, no console errors).
- The browser tab title reads exactly: `Testimonios de Pacientes y Empresas | Medis` — this confirms `Testimonials`' `<SEO />` (last in DOM order) is the one that wins, per the documented `react-helmet-async` behavior.

Stop the dev server (Ctrl+C) when done. **Verify the dev server process is fully terminated** (e.g. `netstat -ano | grep ":5173" | grep LISTENING` should return nothing) before reporting this step complete.

- [ ] **Step 6: Commit**

```bash
git add medisxime-landing/src/components/Testimonials.tsx
git commit -m "feat: add SEO metadata to Testimonials section"
```

---

## Out of Scope (per spec)

- No changes to `SEO.tsx` or `main.tsx`.
- No changes to `/admin`, `/user`, `/professional`, `FinalCTA.tsx`, `Navbar.tsx`, `Footer.tsx`.
- No style, layout, or route changes.
- No `canonical` prop usage.
- No resolution of the multi-section `<title>` conflict (e.g., splitting sections into routes) — documented as expected behavior, not fixed here.

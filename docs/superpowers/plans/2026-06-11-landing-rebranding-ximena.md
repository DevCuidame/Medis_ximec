# Rebranding Landing Pública — Dra. Ximena Correa — Plan de Implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Migrar los 8 componentes de la landing pública (`acaripole-landing/src/components/`) + `App.tsx` + `index.css` + `index.html` desde la identidad actual "Dra. Diana Cristina Medina Camargo" (paleta morado/azul `#8B5CF6` / `#3B82F6` / `#38BDF8`) a la nueva identidad **"Dra. Ximena Correa"** (paleta café/crema/terracota), con todo el contenido, servicios y datos de contacto definidos en `docs/superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md`.

**Arquitectura:** Cambios puramente de frontend (React + TypeScript + Tailwind v4 + Framer Motion) en `acaripole-landing/`. Se actualiza primero el sistema de diseño (`index.css`, tokens `@theme`), luego cada componente en el orden en que aparece en la página (Navbar → Hero → About → Classes → Instructors → Testimonials → FinalCTA → Footer), y finalmente `App.tsx` (gradientes inline) e `index.html` (metadatos). La mayoría de los cambios son: (1) reemplazos sistemáticos de color vía `replace_all` según la tabla de equivalencias del spec, y (2) reemplazos de bloques de texto / arrays de datos por el contenido nuevo.

**Stack técnico:** React 19 + TypeScript + Vite + Tailwind CSS v4 (`@theme`) + Framer Motion. No hay backend ni tests automatizados involucrados — la verificación es visual (`pnpm dev`) + `grep` + `pnpm build`.

**Nota sobre control de versiones:** Este directorio (`c:\Users\julie\Downloads\medisXime`) **no es un repositorio git**. Los pasos de "commit" de la metodología estándar se omiten; cada tarea termina con un paso de verificación (grep y/o revisión visual) en su lugar.

---

## Tabla de equivalencias de color (referencia rápida para todas las tareas)

| Color anterior | Nuevo valor | Significado |
|---|---|---|
| `#8B5CF6` | `#5C3A28` | `--color-brand-primary` |
| `#3B82F6` | `#9C4A2E` | `--color-brand-secondary` |
| `#38BDF8` | `#D4B896` | `--color-brand-accent` (excepto en `Classes.tsx`, ver Tarea 6) |
| `139,92,246` (rgba) | `92,58,40` | rgba de `--color-brand-primary` |
| `59,130,246` (rgba) | `156,74,46` | rgba de `--color-brand-secondary` |
| `56,189,248` (rgba) | `212,184,150` | rgba de `--color-brand-accent` |
| `#A78BFA` (acento tarjeta servicio) | `#D4B896` | tag "Empresas" en `Classes.tsx` |
| `#38BDF8` (acento tarjeta servicio, en `Classes.tsx`) | `#C97B5A` | tag "Bienestar" en `Classes.tsx` |

---

## Task 1: `index.css` — Sistema de diseño (tokens de color)

**Files:**
- Modify: `acaripole-landing/src/index.css`

- [ ] **Step 1: Reescribir el archivo completo con la nueva paleta café/crema/terracota**

Reemplaza **todo el contenido** de `acaripole-landing/src/index.css` con:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600&display=swap');
@import "tailwindcss";
@source ".";

@theme {
  --color-brand-primary: #5C3A28;
  --color-brand-secondary: #9C4A2E;
  --color-brand-accent: #D4B896;
  --color-brand-accent-2: #C97B5A;
  --color-bg-main: #FFFBF5;
  --color-bg-secondary: #F5EDE1;
  --color-bg-dark: #3D2418;
  --color-text-primary: #3D2B1F;
  --color-text-secondary: #7A6452;
  --color-text-muted: #B0A08C;
  --color-border: #E6D9C7;
  --font-cormorant: 'Cormorant Garamond', Georgia, serif;
  --font-inter: 'Inter', system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-inter);
  background-color: #FFFBF5;
  color: #3D2B1F;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* SCROLLBAR */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #FFFBF5; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #5C3A28, #9C4A2E);
  border-radius: 3px;
}

/* TYPOGRAPHY */
.font-cormorant { font-family: var(--font-cormorant); }
.font-inter     { font-family: var(--font-inter); }

/* GLASS */
.glass {
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(92, 58, 40, 0.10);
  box-shadow: 0 10px 40px rgba(92, 58, 40, 0.10);
}

.glass-dark {
  background: rgba(27, 28, 28, 0.40);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* BRAND GRADIENT */
.brand-gradient {
  background: linear-gradient(135deg, #5C3A28, #9C4A2E);
}

.brand-text-gradient {
  background: linear-gradient(135deg, #5C3A28, #9C4A2E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* HERO VIDEO */
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}

/* SECTION BASE */
.section-padding { padding: 7rem 1.5rem; }
@media (min-width: 768px) {
  .section-padding { padding: 9rem 3rem; }
}

/* ANIMATED UNDERLINE */
.luxury-link { position: relative; display: inline-block; }
.luxury-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, #5C3A28, #9C4A2E);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.luxury-link:hover::after { width: 100%; }

/* BRAND BORDER */
.brand-border { border: 1px solid rgba(92, 58, 40, 0.25); }

/* ANIMATIONS */
@keyframes floatY {
  0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
  50%       { transform: translateY(-22px) scale(1.05); opacity: 1; }
}
@keyframes floatX {
  0%, 100% { transform: translateX(0px); opacity: 0.4; }
  50%       { transform: translateX(18px); opacity: 0.8; }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(1.1); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.float-y    { animation: floatY 7s ease-in-out infinite; }
.float-x    { animation: floatX 9s ease-in-out infinite; }
.pulse-glow { animation: pulse-glow 5s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .float-y, .float-x, .pulse-glow { animation: none; }
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

Nota: se eliminan los tokens `--color-bg-footer` y `--color-text-medium` (no forman parte de la nueva tabla de tokens del spec y no se usan como clases Tailwind en ningún componente del alcance).

- [ ] **Step 2: Verificar que no quedan colores antiguos en el archivo**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|56,189,248" acaripole-landing/src/index.css`
Expected: sin resultados (comando no imprime nada).

---

## Task 2: `App.tsx` — Gradientes inline

**Files:**
- Modify: `acaripole-landing/src/App.tsx`

- [ ] **Step 1: Actualizar el gradiente de la barra de progreso de scroll**

En `acaripole-landing/src/App.tsx`, busca este bloque (línea ~37):

```tsx
// ── Gold scroll-progress bar (landing only) ───────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #38BDF8)',
        transformOrigin: '0%',
        scaleX,
        zIndex: 200,
      }}
    />
  )
}
```

Y reemplázalo por:

```tsx
// ── Scroll-progress bar (landing only) ────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, #5C3A28, #9C4A2E, #D4B896)',
        transformOrigin: '0%',
        scaleX,
        zIndex: 200,
      }}
    />
  )
}
```

- [ ] **Step 2: Actualizar el botón del banner de sesión expirada**

En el mismo archivo, dentro de `SessionExpiredBanner`, busca:

```tsx
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
```

Y reemplázalo por:

```tsx
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
```

- [ ] **Step 3: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8" acaripole-landing/src/App.tsx`
Expected: sin resultados.

---

## Task 3: `Navbar.tsx` — Marca, monograma y colores

**Files:**
- Modify: `acaripole-landing/src/components/Navbar.tsx`

- [ ] **Step 1: Reemplazar el logo de imagen por el monograma "XC" + nombre**

Busca el bloque del logo (líneas ~50-57):

```tsx
        {/* Logo */}
        <a href="#inicio" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <img
            src="/Logo_Medis.jpeg"
            alt="Dra. Diana Cristina Medina Camargo"
            style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </a>
```

Reemplázalo por:

```tsx
        {/* Logo */}
        <a href="#inicio" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
          <span
            className="font-cormorant"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFBF5',
              fontSize: '1.05rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            XC
          </span>
          <span
            className="font-cormorant brand-text-gradient"
            style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.15rem)', fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}
          >
            Dra. Ximena Correa
          </span>
        </a>
```

- [ ] **Step 2: Actualizar el color de sombra de la barra de navegación**

Busca:

```tsx
          boxShadow: scrolled
            ? '0 20px 60px rgba(139,92,246,0.18)'
            : '0 10px 40px rgba(139,92,246,0.10)',
```

Reemplázalo por:

```tsx
          boxShadow: scrolled
            ? '0 20px 60px rgba(92,58,40,0.18)'
            : '0 10px 40px rgba(92,58,40,0.10)',
```

- [ ] **Step 3: Reemplazar el resto de las apariciones de `rgba(139,92,246,0.10)`**

Usa `replace_all` para sustituir cada aparición restante de `rgba(139,92,246,0.10)` por `rgba(92,58,40,0.10)`. Quedan 2 apariciones, ambas en `borderBottom: '1px solid rgba(139,92,246,0.10)'` dentro del menú móvil (líneas ~196 y ~220).

- [ ] **Step 4: Reemplazar el color de hover de los links del menú de escritorio**

Busca:

```tsx
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
```

Reemplázalo por:

```tsx
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#5C3A28')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
```

- [ ] **Step 5: Actualizar la sombra del botón "Agendar Cita" del header**

Busca:

```tsx
          whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(139,92,246,0.35)' }}
```

Reemplázalo por:

```tsx
          whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(92,58,40,0.35)' }}
```

- [ ] **Step 6: Actualizar el color de las barras del botón hamburguesa**

Busca:

```tsx
                style={{ display: 'block', width: '22px', height: '1.5px', background: '#8B5CF6', transformOrigin: 'center' }}
```

Reemplázalo por:

```tsx
                style={{ display: 'block', width: '22px', height: '1.5px', background: '#5C3A28', transformOrigin: 'center' }}
```

- [ ] **Step 7: Actualizar el color del botón "Iniciar Sesión" en el menú móvil**

Busca:

```tsx
                  color: '#8B5CF6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(92,58,40,0.10)',
```

Reemplázalo por:

```tsx
                  color: '#5C3A28',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(92,58,40,0.10)',
```

(Esta `borderBottom` ya quedó en `rgba(92,58,40,0.10)` tras el Step 3 — confirma que el bloque completo coincide antes de reemplazar.)

- [ ] **Step 8: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|Logo_Medis\|Diana" acaripole-landing/src/components/Navbar.tsx`
Expected: sin resultados.

---

## Task 4: `Hero.tsx` — Eyebrow, headline, subtexto y colores

**Files:**
- Modify: `acaripole-landing/src/components/Hero.tsx`

- [ ] **Step 1: Reemplazar `139,92,246` → `92,58,40` en todo el archivo (`replace_all`)**

Esta cadena aparece 7 veces: el `BrandOrb` (fondo radial), la viñeta cálida, las dos sombras del CTA primario, la sombra hover y el borde del CTA secundario, y el gradiente del indicador de scroll. Usa `replace_all` para sustituir **todas** las apariciones de `139,92,246` por `92,58,40`.

- [ ] **Step 2: Reemplazar `59,130,246` → `156,74,46` en el `BrandOrb`**

Busca (ya con el cambio del Step 1 aplicado):

```tsx
        background: 'radial-gradient(circle, rgba(92,58,40,0.55) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)',
```

Reemplázalo por:

```tsx
        background: 'radial-gradient(circle, rgba(92,58,40,0.55) 0%, rgba(156,74,46,0.15) 60%, transparent 100%)',
```

- [ ] **Step 3: Recolorear las partículas decorativas**

Busca:

```tsx
            background: '#38BDF8',
            boxShadow: '0 0 6px 2px rgba(56,189,248,0.7)',
```

Reemplázalo por:

```tsx
            background: '#D4B896',
            boxShadow: '0 0 6px 2px rgba(212,184,150,0.7)',
```

- [ ] **Step 4: Actualizar el eyebrow (color, línea decorativa y texto)**

Busca:

```tsx
              color: '#8B5CF6',
              marginBottom: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'block', width: 32, height: 1, background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)' }} />
            Medicina Familiar · Atención Integral · Cercanía
```

Reemplázalo por:

```tsx
              color: '#9C4A2E',
              marginBottom: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'block', width: 32, height: 1, background: 'linear-gradient(90deg, #5C3A28, #9C4A2E)' }} />
            Salud Ocupacional · Medicina Bioreguladora · Bienestar
```

(Nota: el color del texto del eyebrow es `#9C4A2E` — `--color-brand-secondary` — no `#5C3A28`, según el spec.)

- [ ] **Step 5: Actualizar el headline principal**

Busca:

```tsx
            CUIDAMOS<br />
            DE TI Y<br />
            DE TU<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>FAMILIA</em>
```

Reemplázalo por:

```tsx
            CUIDAMOS LA SALUD<br />
            DE TU EQUIPO<br />
            Y LA <em style={{ fontStyle: 'italic', fontWeight: 300 }}>TUYA</em>
```

- [ ] **Step 6: Actualizar el subtexto**

Busca:

```tsx
            La Dra. Diana Cristina Medina Camargo te ofrece atención médica familiar
            personalizada, cercana y profesional, para ti y los tuyos.
```

Reemplázalo por:

```tsx
            La Dra. Ximena Correa ofrece servicios de medicina laboral, exámenes
            ocupacionales y consultoría en SGSST para tu empresa, además de medicina
            bioreguladora para tu bienestar personal.
```

- [ ] **Step 7: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|56,189,248\|Diana\|Medicina Familiar\|FAMILIA" acaripole-landing/src/components/Hero.tsx`
Expected: sin resultados.

---

## Task 5: `About.tsx` — Pilares, subtexto, stats y colores

**Files:**
- Modify: `acaripole-landing/src/components/About.tsx`

- [ ] **Step 1: Reemplazar `#8B5CF6` → `#5C3A28` en todo el archivo (`replace_all`)**

Esta cadena aparece 4 veces: el color del ícono en `PillarCard`, el color del eyebrow, el inicio del gradiente de la línea decorativa del eyebrow, y el color de "Calidez Humana" en el título. Usa `replace_all`.

- [ ] **Step 2: Reemplazar el final del gradiente de la línea decorativa del eyebrow**

Busca (ya con el Step 1 aplicado):

```tsx
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#3B82F6)' }} />
            Nuestro Enfoque
```

Reemplázalo por:

```tsx
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#9C4A2E)' }} />
            Nuestro Enfoque
```

- [ ] **Step 3: Reemplazar `139,92,246` → `92,58,40` en todo el archivo (`replace_all`)**

Esta cadena aparece 6 veces: la sombra hover de `PillarCard`, el borde de `PillarCard`, la sombra base de `PillarCard`, el gradiente de fondo del círculo del ícono, el borde del círculo del ícono, y la línea horizontal decorativa antes de las stats. Usa `replace_all`.

- [ ] **Step 4: Reemplazar `59,130,246` → `156,74,46` en el gradiente del círculo del ícono**

Busca (ya con el Step 3 aplicado):

```tsx
          background: 'linear-gradient(135deg, rgba(92,58,40,0.12), rgba(59,130,246,0.18))',
```

Reemplázalo por:

```tsx
          background: 'linear-gradient(135deg, rgba(92,58,40,0.12), rgba(156,74,46,0.18))',
```

- [ ] **Step 5: Reemplazar el array `PILLARS` con los 4 nuevos pilares**

Busca:

```tsx
const PILLARS = [
  {
    icon: '✦',
    title: 'Atención Personalizada',
    desc: 'Cada paciente recibe una valoración individual. No hay protocolos genéricos — hay personas con historias y necesidades únicas.',
  },
  {
    icon: '◈',
    title: 'Medicina Preventiva',
    desc: 'Detectar a tiempo es cuidar mejor. Orientamos hacia hábitos y chequeos que protegen tu salud a largo plazo.',
  },
  {
    icon: '❋',
    title: 'Confianza y Cercanía',
    desc: 'Un espacio seguro donde puedes hablar con libertad. La relación médico-paciente se construye con respeto y escucha activa.',
  },
  {
    icon: '⟡',
    title: 'Bienestar Integral',
    desc: 'La salud abarca cuerpo, mente y familia. Acompañamos a cada paciente en todas las etapas de su vida.',
  },
]
```

Reemplázalo por:

```tsx
const PILLARS = [
  {
    icon: '✦',
    title: 'Cumplimiento Normativo',
    desc: 'Acompañamos a tu empresa en el cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST), conforme a la normativa vigente.',
  },
  {
    icon: '◈',
    title: 'Medicina Preventiva Ocupacional',
    desc: 'Exámenes y programas diseñados para detectar riesgos a tiempo y proteger la salud de tus colaboradores en cada etapa laboral.',
  },
  {
    icon: '❋',
    title: 'Medicina Bioreguladora',
    desc: 'Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo, promoviendo el equilibrio y el bienestar.',
  },
  {
    icon: '⟡',
    title: 'Confianza y Profesionalismo',
    desc: 'Atención cercana, ética y rigurosa, tanto para empresas como para pacientes que buscan cuidar su salud.',
  },
]
```

- [ ] **Step 6: Reemplazar el subtexto del header**

Busca:

```tsx
            Nuestro consultorio es un espacio de atención médica centrada en el paciente y su familia.
            Cada consulta es una oportunidad para escuchar, orientar y acompañar — con calidez
            humana y el rigor profesional que tu salud merece.
```

Reemplázalo por:

```tsx
            Nuestro consultorio acompaña tanto a empresas como a pacientes individuales —
            combinando el rigor de la medicina laboral y ocupacional con un enfoque integral
            de bienestar a través de la medicina bioreguladora.
```

- [ ] **Step 7: Reemplazar las dos primeras estadísticas**

Busca:

```tsx
          {[
            { number: '+10', label: 'Años de Experiencia' },
            { number: '6', label: 'Servicios Médicos' },
            { number: '5★', label: 'Calificación de Pacientes' },
            { number: '100%', label: 'Atención Personalizada' },
          ].map(({ number, label }, i) => (
```

Reemplázalo por:

```tsx
          {[
            { number: '+500', label: 'Exámenes Realizados' },
            { number: 'SGSST', label: 'Cumplimiento Normativo' },
            { number: '5★', label: 'Calificación de Pacientes' },
            { number: '100%', label: 'Atención Personalizada' },
          ].map(({ number, label }, i) => (
```

- [ ] **Step 8: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|Bienestar Integral\|Confianza y Cercanía\|valoración individual\|Años de Experiencia\|Servicios Médicos" acaripole-landing/src/components/About.tsx`
Expected: sin resultados.

---

## Task 6: `Classes.tsx` — Servicios (renombrar `CLASSES` → `SERVICES`)

**Files:**
- Modify: `acaripole-landing/src/components/Classes.tsx`

- [ ] **Step 1: Reemplazar el array `CLASSES` por `SERVICES` con los 6 nuevos servicios**

Busca el array completo (líneas 4-59):

```tsx
const CLASSES = [
  {
    title: 'Consulta Médica General',
    level: 'Todas las edades',
    duration: '30 min',
    description: 'Evaluación integral de tu salud, diagnóstico y tratamiento de enfermedades comunes. Primera puerta a una atención médica de calidad.',
    accent: '#A78BFA',
    tag: 'Más solicitada',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)',
  },
  {
    title: 'Control de Niño Sano',
    level: 'Niños y adolescentes',
    duration: '30 min',
    description: 'Seguimiento del crecimiento y desarrollo, aplicación del esquema de vacunación y orientación integral a padres y cuidadores.',
    accent: '#38BDF8',
    tag: 'Pediatría',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
  {
    title: 'Control Prenatal',
    level: 'Mujeres gestantes',
    duration: '30 min',
    description: 'Acompañamiento médico durante el embarazo para garantizar la salud de la madre y el bebé en cada etapa de la gestación.',
    accent: '#A78BFA',
    tag: 'Materno',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
  },
  {
    title: 'Control de Enf. Crónicas',
    level: 'Adultos',
    duration: '30 min',
    description: 'Seguimiento y manejo de hipertensión, diabetes y otras condiciones crónicas, con planes de tratamiento personalizados.',
    accent: '#38BDF8',
    tag: 'Crónicos',
    gradient: 'linear-gradient(160deg, #0c1445 0%, #1e3a8a 50%, #164e63 100%)',
  },
  {
    title: 'Medicina Preventiva',
    level: 'Todas las edades',
    duration: '45 min',
    description: 'Chequeos ejecutivos y valoraciones preventivas para detectar a tiempo posibles riesgos de salud antes de que se conviertan en problemas.',
    accent: '#A78BFA',
    tag: 'Prevención',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #0f172a 100%)',
  },
  {
    title: 'Certificados y Vacunación',
    level: 'Todas las edades',
    duration: '20 min',
    description: 'Emisión de certificados médicos de aptitud física, laboral y deportiva. Aplicación de vacunas del esquema nacional y viajero.',
    accent: '#38BDF8',
    tag: 'Trámites',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
]
```

Reemplázalo por:

```tsx
const SERVICES = [
  {
    title: 'Exámenes de Ingreso Ocupacional',
    level: 'Empresas',
    duration: '30 min',
    description: 'Evaluación médica pre-ocupacional para nuevos colaboradores, garantizando que cada persona inicie su labor en óptimas condiciones de salud.',
    accent: '#D4B896',
    tag: 'Empresas',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Exámenes Periódicos y de Retiro',
    level: 'Empresas',
    duration: '30 min',
    description: 'Seguimiento del estado de salud de tus colaboradores durante su vinculación laboral y al finalizar su contrato.',
    accent: '#D4B896',
    tag: 'Empresas',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Medicina Laboral',
    level: 'Empresas',
    duration: '45 min',
    description: 'Atención médica especializada en la prevención, diagnóstico y manejo de enfermedades relacionadas con el trabajo.',
    accent: '#D4B896',
    tag: 'Más solicitada',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
  {
    title: 'Consultoría en SGSST',
    level: 'Empresas',
    duration: 'Asesoría',
    description: 'Acompañamiento integral en el Sistema de Gestión de Seguridad y Salud en el Trabajo, asegurando el cumplimiento de la normativa vigente.',
    accent: '#D4B896',
    tag: 'Cumplimiento',
    gradient: 'linear-gradient(160deg, #3D2418 0%, #9C4A2E 50%, #2A1810 100%)',
  },
  {
    title: 'Medicina Bioreguladora',
    level: 'Pacientes',
    duration: '45 min',
    description: 'Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo para promover tu bienestar físico y emocional.',
    accent: '#C97B5A',
    tag: 'Bienestar',
    gradient: 'linear-gradient(160deg, #3D2418 0%, #9C4A2E 50%, #2A1810 100%)',
  },
  {
    title: 'Salud en el Trabajo',
    level: 'Empresas y Equipos',
    duration: 'Programas',
    description: 'Programas de promoción y prevención enfocados en el bienestar físico y mental de los colaboradores en su entorno laboral.',
    accent: '#C97B5A',
    tag: 'Bienestar Laboral',
    gradient: 'linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)',
  },
]
```

- [ ] **Step 2: Actualizar la firma de `ClassCard` para usar `SERVICES`**

Busca:

```tsx
function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: typeof CLASSES[0] & { delay: number }) {
```

Reemplázalo por:

```tsx
function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: typeof SERVICES[0] & { delay: number }) {
```

- [ ] **Step 3: Recolorear el glow interior de la tarjeta**

Busca:

```tsx
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
```

Reemplázalo por:

```tsx
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(92,58,40,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
```

- [ ] **Step 4: Actualizar la lógica de color del tag (fondo, borde y texto)**

Busca:

```tsx
        {/* Tag */}
        <div style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem',
          padding: '0.3rem 0.8rem',
          borderRadius: '9999px',
          background: `rgba(${accent === '#A78BFA' ? '167,139,250' : '56,189,248'},0.20)`,
          border: `1px solid ${accent}40`,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
          backdropFilter: 'blur(6px)',
        }}>
          {tag}
        </div>
```

Reemplázalo por:

```tsx
        {/* Tag */}
        <div style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem',
          padding: '0.3rem 0.8rem',
          borderRadius: '9999px',
          background: `rgba(${accent === '#D4B896' ? '212,184,150' : '201,123,90'},0.20)`,
          border: `1px solid ${accent}40`,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent,
          backdropFilter: 'blur(6px)',
        }}>
          {tag}
        </div>
```

- [ ] **Step 5: Actualizar el color del CTA "Agendar" al hacer hover**

Busca:

```tsx
              color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
              fontWeight: 500,
            }}
          >
            Agendar
```

Reemplázalo por:

```tsx
              color: accent,
              fontWeight: 500,
            }}
          >
            Agendar
```

- [ ] **Step 6: Actualizar el `.map` que renderiza las tarjetas**

Busca:

```tsx
          {CLASSES.map((c, i) => (
            <ClassCard key={c.title} {...c} delay={i * 0.08} />
          ))}
```

Reemplázalo por:

```tsx
          {SERVICES.map((c, i) => (
            <ClassCard key={c.title} {...c} delay={i * 0.08} />
          ))}
```

- [ ] **Step 7: Actualizar el fondo de la sección**

Busca:

```tsx
    <section id="servicios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem' }}>
```

Reemplázalo por:

```tsx
    <section id="servicios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem' }}>
```

- [ ] **Step 8: Actualizar el eyebrow, la línea decorativa y el título del header**

Busca:

```tsx
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C' }}
            >
              Servicios <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Médicos</em>
            </motion.h2>
```

Reemplázalo por:

```tsx
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#5C3A28', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#9C4A2E)' }} />
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C' }}
            >
              Salud Laboral & <em style={{ fontStyle: 'italic', color: '#5C3A28' }}>Bienestar</em>
            </motion.h2>
```

- [ ] **Step 9: Reemplazar `139,92,246` → `92,58,40` en las sombras del CTA del header (`replace_all`)**

Esta cadena aparece 2 veces tras los pasos anteriores: `whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(139,92,246,0.30)' }}` y `boxShadow: '0 6px 24px rgba(139,92,246,0.25)',`. Usa `replace_all` para sustituir ambas por `92,58,40`.

- [ ] **Step 10: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|A78BFA\|167,139,250\|56,189,248\|C4B5FD\|7DD3FC\|CLASSES\|F3F0FB\|Servicios <em\|Pediatría\|Control Prenatal" acaripole-landing/src/components/Classes.tsx`
Expected: sin resultados.

---

## Task 7: `Instructors.tsx` — "Sobre la Doctora" (Dra. Ximena Correa)

**Files:**
- Modify: `acaripole-landing/src/components/Instructors.tsx`

La estructura de 2 columnas (avatar izquierdo `min-height: 420px` + info derecha) ya existe y coincide con el spec — no requiere reescritura completa, solo los cambios de contenido y color de abajo.

- [ ] **Step 1: Reemplazar `#8B5CF6` → `#5C3A28` en todo el archivo (`replace_all`)**

Esta cadena aparece 4 veces: el color del eyebrow, el inicio del primer separador decorativo, el inicio del gradiente del avatar, y el color del texto de especialidad. Usa `replace_all`.

- [ ] **Step 2: Reemplazar `#3B82F6` → `#9C4A2E` en todo el archivo (`replace_all`)**

Esta cadena aparece 3 veces: el final del primer separador decorativo, el inicio del segundo separador decorativo, y el final del gradiente del avatar. Usa `replace_all`.

- [ ] **Step 3: Ajustar el color intermedio del gradiente del avatar**

Busca (ya con los Steps 1-2 aplicados):

```tsx
              background: 'linear-gradient(160deg, #5C3A28 0%, #6366F1 40%, #9C4A2E 100%)',
```

Reemplázalo por:

```tsx
              background: 'linear-gradient(160deg, #5C3A28 0%, #7A4A35 40%, #9C4A2E 100%)',
```

- [ ] **Step 4: Reemplazar `139,92,246` → `92,58,40` en todo el archivo (`replace_all`)**

Esta cadena aparece 3 veces: el borde y la sombra de la tarjeta de perfil, y el borde de los chips de credenciales. Usa `replace_all`.

- [ ] **Step 5: Cambiar el monograma "DM" por "XC"**

Busca:

```tsx
              <span
                className="font-cormorant"
                style={{ fontSize: '2.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.05em' }}
              >
                DM
              </span>
```

Reemplázalo por:

```tsx
              <span
                className="font-cormorant"
                style={{ fontSize: '2.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.05em' }}
              >
                XC
              </span>
```

- [ ] **Step 6: Cambiar el nombre de la doctora**

Busca:

```tsx
              Dra. Diana Cristina Medina Camargo
            </h2>
```

Reemplázalo por:

```tsx
              Dra. Ximena Correa
            </h2>
```

- [ ] **Step 7: Cambiar la especialidad**

Busca:

```tsx
              Especialista en Medicina Familiar y Comunitaria
            </p>
```

Reemplázalo por:

```tsx
              Especialista en Medicina Laboral, SGSST y Medicina Bioreguladora
            </p>
```

- [ ] **Step 8: Reemplazar la biografía**

Busca:

```tsx
              Médica con sólida formación en medicina familiar y comunitaria, con amplia
              experiencia en atención primaria, prevención y seguimiento de enfermedades
              crónicas. Su enfoque centrado en el paciente garantiza una atención cercana,
              humana y de calidad para toda la familia.
```

Reemplázalo por:

```tsx
              Médica con amplia experiencia en salud ocupacional, medicina laboral y
              consultoría en Sistemas de Gestión de Seguridad y Salud en el Trabajo (SGSST).
              Combina su formación clínica con un enfoque de medicina bioreguladora,
              brindando atención integral tanto a empresas como a pacientes que buscan
              cuidar su bienestar.
```

- [ ] **Step 9: Reemplazar el array `CREDENTIALS`**

Busca:

```tsx
const CREDENTIALS = [
  'Médica Cirujana',
  'Esp. en Medicina Familiar y Comunitaria',
  '+10 años de experiencia',
  '[Universidad / Institución]',
]
```

Reemplázalo por:

```tsx
const CREDENTIALS = [
  'Médica Cirujana',
  'Esp. en Salud Ocupacional y SGSST',
  'Medicina Bioreguladora',
  '[Universidad / Institución]',
]
```

- [ ] **Step 10: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|6366F1\|Diana\|Medina\|>DM<\|Medicina Familiar y Comunitaria\|años de experiencia" acaripole-landing/src/components/Instructors.tsx`
Expected: sin resultados.

---

## Task 8: `Testimonials.tsx` — Testimonios de pacientes y colores

**Files:**
- Modify: `acaripole-landing/src/components/Testimonials.tsx`

El eyebrow ("Testimonios de Pacientes") y el título ("Lo que dicen *Nuestros Pacientes*") ya coinciden con el spec — no requieren cambio de texto, solo de color (incluido en los `replace_all` de abajo). Solo cambia el array `TESTIMONIALS` y el fondo de la sección.

- [ ] **Step 1: Reemplazar `#8B5CF6` → `#5C3A28` en todo el archivo (`replace_all`)**

Esta cadena aparece 10 veces: color de las estrellas (`StarRating`), color del eyebrow, ambas líneas decorativas del eyebrow, color de "Nuestros Pacientes" en el título, color del `role` del testimonio destacado, color de los íconos de los botones prev/next, el gradiente de los puntos indicadores, y el color del autor en las mini-tarjetas. Usa `replace_all`.

- [ ] **Step 2: Reemplazar `#3B82F6` → `#9C4A2E` en todo el archivo (`replace_all`)**

Esta cadena aparece 3 veces: ambas líneas decorativas del eyebrow y el gradiente de los puntos indicadores. Usa `replace_all`.

- [ ] **Step 3: Reemplazar `139,92,246` → `92,58,40` en todo el archivo (`replace_all`)**

Esta cadena aparece 6 veces: la decoración de fondo superior, el borde y la sombra de la tarjeta de testimonio destacado, los bordes de los botones prev/next, y el borde de las mini-tarjetas. Usa `replace_all`.

- [ ] **Step 4: Reemplazar `59,130,246` → `156,74,46`**

Busca:

```tsx
        background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
```

Reemplázalo por:

```tsx
        background: 'radial-gradient(circle, rgba(156,74,46,0.10) 0%, transparent 70%)',
```

- [ ] **Step 5: Actualizar el fondo de la sección**

Busca:

```tsx
    <section id="testimonios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```

Reemplázalo por:

```tsx
    <section id="testimonios" style={{ background: '#F5EDE1', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```

- [ ] **Step 6: Reemplazar el array `TESTIMONIALS` con los 5 nuevos testimonios**

Busca:

```tsx
const TESTIMONIALS = [
  {
    quote: 'La Dra. Medina escucha con atención y explica todo con claridad. Me sentí en muy buenas manos desde la primera consulta. La recomiendo ampliamente.',
    author: 'María L.',
    role: 'Paciente · Consulta Médica General',
    stars: 5,
  },
  {
    quote: 'Llevo el control de mi diabetes con la doctora hace más de dos años. Su seguimiento constante y sus consejos han marcado una diferencia real en mi calidad de vida.',
    author: 'Carlos R.',
    role: 'Paciente · Control de Enfermedades Crónicas',
    stars: 5,
  },
  {
    quote: 'Las consultas pediátricas de mis hijos siempre son tranquilas. La doctora sabe cómo hablarles a los niños y cómo orientar a los padres. Excelente profesional.',
    author: 'Juliana P.',
    role: 'Madre de paciente · Control de Niño Sano',
    stars: 5,
  },
  {
    quote: 'Mi control prenatal fue un proceso tranquilo y bien acompañado. Siempre respondió mis dudas con paciencia, profesionalismo y mucha calidez humana.',
    author: 'Sofía M.',
    role: 'Paciente · Control Prenatal',
    stars: 5,
  },
  {
    quote: 'Excelente atención. Llega puntual, explica el diagnóstico con detalle y el trato es muy amable. Sin duda la mejor decisión para el cuidado de mi salud familiar.',
    author: 'Andrés V.',
    role: 'Paciente · Medicina Preventiva',
    stars: 5,
  },
]
```

Reemplázalo por:

```tsx
const TESTIMONIALS = [
  {
    quote: 'Gracias a la asesoría en SGSST de la Dra. Ximena, logramos poner al día todos nuestros procesos de seguridad y salud en el trabajo. Un acompañamiento profesional y muy claro.',
    author: 'Laura M.',
    role: 'Coordinadora de RRHH · Consultoría SGSST',
    stars: 5,
  },
  {
    quote: 'La medicina bioreguladora cambió mi forma de ver mi salud. Me sentí escuchada desde la primera consulta y los resultados han sido notables.',
    author: 'Camila R.',
    role: 'Paciente · Medicina Bioreguladora',
    stars: 5,
  },
  {
    quote: 'Los exámenes de ingreso para nuestro personal son ágiles, organizados y con resultados oportunos. Excelente atención para nuestra empresa.',
    author: 'Andrés F.',
    role: 'Gerente de Operaciones · Exámenes Ocupacionales',
    stars: 5,
  },
  {
    quote: 'Tuve una lesión relacionada con mi trabajo y la doctora me dio un diagnóstico claro y un plan de manejo efectivo. Me sentí muy bien atendido.',
    author: 'Jorge P.',
    role: 'Paciente · Medicina Laboral',
    stars: 5,
  },
  {
    quote: 'Implementamos un programa de salud en el trabajo con la Dra. Ximena y notamos una mejora real en el bienestar de nuestro equipo.',
    author: 'Marcela T.',
    role: 'Líder de Bienestar · Salud en el Trabajo',
    stars: 5,
  },
]
```

- [ ] **Step 7: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|F3F0FB\|Medina\|Control Prenatal\|Control de Niño Sano" acaripole-landing/src/components/Testimonials.tsx`
Expected: sin resultados.

---

## Task 9: `FinalCTA.tsx` — CTA final, fondo oscuro y colores

**Files:**
- Modify: `acaripole-landing/src/components/FinalCTA.tsx`

El eyebrow ("Agenda tu Consulta") ya coincide con el spec en cuanto a texto. Cambian: el fondo de la sección (a `--color-bg-dark`), el headline, el subtexto, un trust indicator, y todos los colores morado/azul.

- [ ] **Step 1: Cambiar el fondo de la sección a `--color-bg-dark`**

Busca:

```tsx
        background: '#1B1C1C',
```

Reemplázalo por:

```tsx
        background: '#3D2418',
```

- [ ] **Step 2: Actualizar el eyebrow y sus líneas decorativas**

Busca:

```tsx
            textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          }}
        >
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
          Agenda tu Consulta
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
```

Reemplázalo por:

```tsx
            textTransform: 'uppercase', color: '#5C3A28', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          }}
        >
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#5C3A28,#9C4A2E)' }} />
          Agenda tu Consulta
          <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#9C4A2E,#5C3A28)' }} />
```

- [ ] **Step 3: Reemplazar el headline principal**

Busca:

```tsx
          Tu salud
          <br />
          <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            es lo primero
          </em>
```

Reemplázalo por:

```tsx
          Tu bienestar
          <br />
          <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            y el de tu equipo
          </em>
```

- [ ] **Step 4: Reemplazar el subtexto**

Busca:

```tsx
          Da el primer paso hacia una atención médica cercana y de calidad.
          La Dra. Diana Medina Camargo está lista para acompañarte.
```

Reemplázalo por:

```tsx
          Da el primer paso hacia una atención médica laboral y bioreguladora de calidad.
          La Dra. Ximena Correa está lista para acompañarte a ti y a tu empresa.
```

- [ ] **Step 5: Actualizar el tercer trust indicator y el color de los íconos**

Busca:

```tsx
          {[
            { icon: '✦', label: 'Primera consulta de valoración' },
            { icon: '◈', label: 'Atención cercana y profesional' },
            { icon: '❋', label: 'Médica certificada' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#8B5CF6', fontSize: '0.85rem' }}>{icon}</span>
```

Reemplázalo por:

```tsx
          {[
            { icon: '✦', label: 'Primera consulta de valoración' },
            { icon: '◈', label: 'Atención cercana y profesional' },
            { icon: '❋', label: 'Médica certificada en SGSST' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#5C3A28', fontSize: '0.85rem' }}>{icon}</span>
```

- [ ] **Step 6: Recolorear el borde del CTA secundario (caso especial — usa `--color-brand-accent`)**

Busca:

```tsx
              border: '1px solid rgba(139,92,246,0.40)',
```

Reemplázalo por:

```tsx
              border: '1px solid rgba(212,184,150,0.40)',
```

- [ ] **Step 7: Reemplazar `139,92,246` → `92,58,40` en el resto del archivo (`replace_all`)**

Tras el Step 6, esta cadena aparece 8 veces: el fondo atmosférico radial, las dos repeticiones del patrón de líneas, el glow de cada orbe flotante, las dos sombras del CTA primario, la sombra hover del CTA secundario, y el divisor decorativo. Usa `replace_all` para sustituir las **8 restantes** por `92,58,40`.

- [ ] **Step 8: Reemplazar `59,130,246` → `156,74,46`**

Busca:

```tsx
        background: 'radial-gradient(ellipse 80% 90% at 0% 50%, rgba(59,130,246,0.12) 0%, transparent 65%)',
```

Reemplázalo por:

```tsx
        background: 'radial-gradient(ellipse 80% 90% at 0% 50%, rgba(156,74,46,0.12) 0%, transparent 65%)',
```

- [ ] **Step 9: Verificar**

Run: `grep -n "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|1B1C1C\|Diana\|Medina\|es lo primero\|Tu salud" acaripole-landing/src/components/FinalCTA.tsx`
Expected: sin resultados.

---

## Task 10: `Footer.tsx` — Reescritura para fondo oscuro (`--color-bg-dark`)

**Files:**
- Modify: `acaripole-landing/src/components/Footer.tsx`

El footer pasa de fondo claro (`#EEF2FF`) a fondo oscuro (`#3D2418`, `--color-bg-dark`), por lo que todos los textos secundarios cambian de grises oscuros a tonos crema translúcidos. También se añade el monograma "XC" junto al nombre de la marca, se elimina Facebook de redes sociales, y se actualizan las columnas de Servicios y Contacto.

- [ ] **Step 1: Cambiar el fondo y borde del `<footer>`**

Busca:

```tsx
    <footer
      id="contacto"
      style={{ background: '#EEF2FF', borderTop: '1px solid rgba(139,92,246,0.10)' }}
    >
```

Reemplázalo por:

```tsx
    <footer
      id="contacto"
      style={{ background: '#3D2418', borderTop: '1px solid rgba(245,237,225,0.10)' }}
    >
```

- [ ] **Step 2: Reemplazar el array `SOCIAL` (eliminar Facebook, hrefs reales)**

Busca:

```tsx
const SOCIAL = [
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
]
```

Reemplázalo por:

```tsx
const SOCIAL = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/ximenadoc/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/573133894523',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
]
```

- [ ] **Step 3: Reemplazar la columna de marca (monograma "XC" + nombre + tagline)**

Busca:

```tsx
            <span
              className="font-cormorant brand-text-gradient"
              style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: '1.25rem' }}
            >
              Dra. Diana Cristina Medina Camargo
            </span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.8, color: '#475569', fontWeight: 300, marginBottom: '1.5rem', maxWidth: '260px' }}>
              Especialista en Medicina Familiar y Comunitaria. Atención cercana, profesional y de confianza.
            </p>
```

Reemplázalo por:

```tsx
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span
                className="font-cormorant"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFBF5',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                XC
              </span>
              <span
                className="font-cormorant brand-text-gradient"
                style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '0.03em' }}
              >
                Dra. Ximena Correa
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.8, color: 'rgba(245,237,225,0.65)', fontWeight: 300, marginBottom: '1.5rem', maxWidth: '260px' }}>
              Medicina Bioreguladora, Exámenes médico ocupacionales, Medicina Laboral, consultoría en el SGSST y Salud en el Trabajo.
            </p>
```

- [ ] **Step 4: Recolorear los íconos de redes sociales para fondo oscuro**

Busca:

```tsx
              {SOCIAL.map((s, i) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  aria-label={s.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE }}
                  whileHover={{ y: -3, color: '#8B5CF6' }}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94A3B8',
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {s.icon}
                </motion.a>
              ))}
```

Reemplázalo por:

```tsx
              {SOCIAL.map((s, i) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE }}
                  whileHover={{ y: -3, color: '#D4B896' }}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(245,237,225,0.06)',
                    border: '1px solid rgba(245,237,225,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(245,237,225,0.5)',
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {s.icon}
                </motion.a>
              ))}
```

- [ ] **Step 5: Recolorear la columna "Consultorio"**

Busca:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Consultorio
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Inicio', 'Sobre la Doctora', 'Servicios', 'Agendar Cita', 'Contacto'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: '#475569', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
```

Reemplázalo por:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5EDE1', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Consultorio
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Inicio', 'Sobre la Doctora', 'Servicios', 'Agendar Cita', 'Contacto'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: 'rgba(245,237,225,0.6)', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#D4B896')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(245,237,225,0.6)')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
```

- [ ] **Step 6: Recolorear y reemplazar la columna "Servicios"**

Busca:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Servicios
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Consulta Médica General', 'Control de Niño Sano', 'Control Prenatal', 'Enfermedades Crónicas', 'Medicina Preventiva', 'Certificados y Vacunación'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#servicios"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: '#475569', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
```

Reemplázalo por:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5EDE1', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Servicios
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Exámenes de Ingreso', 'Exámenes Periódicos y de Retiro', 'Medicina Laboral', 'Consultoría SGSST', 'Medicina Bioreguladora', 'Salud en el Trabajo'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#servicios"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: 'rgba(245,237,225,0.6)', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#D4B896')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(245,237,225,0.6)')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
```

- [ ] **Step 7: Recolorear y reemplazar la columna "Contacto"**

Busca:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Contacto
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Dirección', value: '[Dirección del consultorio]' },
                { label: 'WhatsApp', value: '[+57 XXX XXX XXXX]' },
                { label: 'Email', value: '[correo@consultorio.com]' },
                { label: 'Horarios', value: '[Lun – Vie · X am – X pm]' },
              ].map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.08, ease: EASE }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '0.2rem' }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: '#475569', fontWeight: 300 }}>
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>
```

Reemplázalo por:

```tsx
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5EDE1', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Contacto
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'WhatsApp', value: '313 389 4523' },
                { label: 'Instagram', value: '@ximenadoc' },
                { label: 'Email', value: '[correo@consultorio.com]' },
                { label: 'Horarios', value: '[Lun – Vie · X am – X pm]' },
              ].map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.08, ease: EASE }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4B896', marginBottom: '0.2rem' }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: 'rgba(245,237,225,0.65)', fontWeight: 300 }}>
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>
```

- [ ] **Step 8: Recolorear la sombra del CTA "Agendar Cita"**

Busca:

```tsx
              whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(139,92,246,0.30)' }}
```

Reemplázalo por:

```tsx
              whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(92,58,40,0.30)' }}
```

Luego busca:

```tsx
                boxShadow: '0 5px 20px rgba(139,92,246,0.25)',
```

Reemplázalo por:

```tsx
                boxShadow: '0 5px 20px rgba(92,58,40,0.25)',
```

- [ ] **Step 9: Recolorear la barra inferior y el copyright**

Busca:

```tsx
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(139,92,246,0.10)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.05em', fontWeight: 300 }}>
            © {year} Dra. Diana Cristina Medina Camargo · Todos los derechos reservados
          </p>
```

Reemplázalo por:

```tsx
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(245,237,225,0.10)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(245,237,225,0.45)', letterSpacing: '0.05em', fontWeight: 300 }}>
            © {year} Dra. Ximena Correa · Todos los derechos reservados
          </p>
```

- [ ] **Step 10: Recolorear los enlaces "Privacidad / Términos / Cookies"**

Busca:

```tsx
          <div style={{ display: 'flex', gap: '2rem' }}>
            {['Privacidad', 'Términos', 'Cookies'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                  color: '#94A3B8', textDecoration: 'none', letterSpacing: '0.05em',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#94A3B8')}
              >
                {item}
              </a>
            ))}
          </div>
```

Reemplázalo por:

```tsx
          <div style={{ display: 'flex', gap: '2rem' }}>
            {['Privacidad', 'Términos', 'Cookies'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                  color: 'rgba(245,237,225,0.45)', textDecoration: 'none', letterSpacing: '0.05em',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#D4B896')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(245,237,225,0.45)')}
              >
                {item}
              </a>
            ))}
          </div>
```

- [ ] **Step 11: Reemplazar la frase final**

Busca:

```tsx
          <p
            className="font-cormorant"
            style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#8B5CF6', letterSpacing: '0.05em' }}
          >
            Especialista en Medicina Familiar y Comunitaria
          </p>
```

Reemplázalo por:

```tsx
          <p
            className="font-cormorant"
            style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#D4B896', letterSpacing: '0.05em' }}
          >
            Especialista en Salud Ocupacional y Medicina Bioreguladora
          </p>
```

- [ ] **Step 12: Verificar**

Run: `grep -n "EEF2FF\|475569\|94A3B8\|1B1C1C\|8B5CF6\|139,92,246\|Diana\|Medina\|Facebook\|Dirección\|Control de Niño Sano\|Control Prenatal\|XXX XXX XXXX" acaripole-landing/src/components/Footer.tsx`
Expected: sin resultados.

---

## Task 11: `index.html` — Metadatos SEO y `theme-color`

**Files:**
- Modify: `acaripole-landing/index.html`

- [ ] **Step 1: Actualizar `<title>`, `description` y `keywords`**

Busca:

```html
    <title>Medis · Consultorio de Medicina Familiar</title>
    <meta name="description" content="Medis — Consultorio de la Dra. Diana Cristina Medina Camargo, Especialista en Medicina Familiar y Comunitaria. Atención cercana, profesional y de confianza." />
    <meta name="keywords" content="medicina familiar, consultorio médico, medicina general, atención médica, Dra. Diana Medina" />
```

Reemplázalo por:

```html
    <title>Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora</title>
    <meta name="description" content="Medis — Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico ocupacionales, Medicina Laboral y consultoría en el SGSST. Salud en el trabajo para tu equipo y para ti." />
    <meta name="keywords" content="medicina laboral, medicina bioreguladora, exámenes médico ocupacionales, SGSST, salud en el trabajo, Dra. Ximena Correa" />
```

- [ ] **Step 2: Actualizar `theme-color`**

Busca:

```html
    <meta name="theme-color" content="#8B5CF6" />
```

Reemplázalo por:

```html
    <meta name="theme-color" content="#5C3A28" />
```

- [ ] **Step 3: Actualizar las etiquetas Open Graph**

Busca:

```html
    <meta property="og:title" content="Medis · Consultorio de Medicina Familiar" />
    <meta property="og:description" content="Atención médica familiar personalizada, cercana y profesional. Agenda tu cita hoy." />
```

Reemplázalo por:

```html
    <meta property="og:title" content="Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora" />
    <meta property="og:description" content="Medicina Bioreguladora, exámenes médico ocupacionales, Medicina Laboral y consultoría en el SGSST. Agenda tu cita hoy." />
```

- [ ] **Step 4: Actualizar las etiquetas Twitter**

Busca:

```html
    <meta name="twitter:title" content="Medis · Consultorio de Medicina Familiar" />
    <meta name="twitter:description" content="Atención médica familiar personalizada, cercana y profesional." />
```

Reemplázalo por:

```html
    <meta name="twitter:title" content="Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora" />
    <meta name="twitter:description" content="Medicina Bioreguladora, exámenes médico ocupacionales, Medicina Laboral y consultoría en el SGSST." />
```

- [ ] **Step 5: Verificar**

Run: `grep -n "8B5CF6\|Diana\|Medina\|Medicina Familiar" acaripole-landing/index.html`
Expected: sin resultados.

---

## Task 12: Verificación final

**Files:** (sin modificaciones — solo verificación de los 8 componentes de la landing + `App.tsx` + `index.html` + `index.css`)

- [ ] **Step 1: Grep de residuos de la temática anterior**

Run:

```bash
grep -rn "Acaripole\|acaripole\|pole dance\|pole\|instructora\|instructoras\|disciplinas\|Diana\|gold-" acaripole-landing/src/components/Navbar.tsx acaripole-landing/src/components/Hero.tsx acaripole-landing/src/components/About.tsx acaripole-landing/src/components/Classes.tsx acaripole-landing/src/components/Instructors.tsx acaripole-landing/src/components/Testimonials.tsx acaripole-landing/src/components/FinalCTA.tsx acaripole-landing/src/components/Footer.tsx acaripole-landing/src/App.tsx
```

Expected: sin resultados.

- [ ] **Step 2: Grep de colores antiguos (tabla de equivalencias completa)**

Run:

```bash
grep -rn "8B5CF6\|3B82F6\|38BDF8\|139,92,246\|59,130,246\|A78BFA\|6366F1\|775A00\|B08D32\|D4A843\|119,90,0\|176,141,50" acaripole-landing/src/components/Navbar.tsx acaripole-landing/src/components/Hero.tsx acaripole-landing/src/components/About.tsx acaripole-landing/src/components/Classes.tsx acaripole-landing/src/components/Instructors.tsx acaripole-landing/src/components/Testimonials.tsx acaripole-landing/src/components/FinalCTA.tsx acaripole-landing/src/components/Footer.tsx acaripole-landing/src/App.tsx acaripole-landing/src/index.css acaripole-landing/index.html
```

Expected: sin resultados.

- [ ] **Step 3: Levantar el servidor de desarrollo**

Run: `cd acaripole-landing && pnpm dev`

Abre la URL indicada (normalmente `http://localhost:5173`) en el navegador.

- [ ] **Step 4: Revisión visual en escritorio**

Recorre las 8 secciones de la landing (`/`) en una ventana de escritorio (≥1200px) y confirma:
- Navbar muestra el monograma "XC" + "Dra. Ximena Correa", colores café/terracota.
- Hero muestra el nuevo eyebrow, headline y subtexto sobre salud ocupacional.
- About muestra los 4 nuevos pilares y las nuevas estadísticas.
- Servicios (`Classes.tsx`) muestra los 6 nuevos servicios con sus dos variantes de color (café oscuro / terracota).
- Sobre la Doctora (`Instructors.tsx`) muestra "XC", "Dra. Ximena Correa" y la nueva bio/credenciales.
- Testimonios muestra los 5 nuevos testimonios.
- CTA Final muestra "Tu bienestar / y el de tu equipo" sobre fondo oscuro `#3D2418`.
- Footer tiene fondo oscuro, monograma "XC", redes Instagram + WhatsApp, columnas Servicios/Contacto actualizadas.

- [ ] **Step 5: Revisión visual en móvil**

Usa las herramientas de desarrollo del navegador para simular anchos de **<900px** y **<768px** y confirma que las 8 secciones se adaptan correctamente (sin overflow horizontal, textos legibles, botones accesibles).

- [ ] **Step 6: Build de producción sin errores**

Run: `cd acaripole-landing && pnpm build`
Expected: build exitoso, sin errores de TypeScript.

---

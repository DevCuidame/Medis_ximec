# Sidebar Admin Compartido con Infraestructura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un componente `AdminSidebar` único (con apartado expandible "Infraestructura" para Sedes/Espacios y "Servicios" como navegación directa) adoptado por las 13 pantallas del panel admin.

**Architecture:** Se crea `AdminSidebar.tsx` como única fuente de verdad del menú (estructura, estilos, responsive móvil, logout). Cada pantalla elimina su copia local del sidebar (`NAV_ITEMS` + `<aside>` + estados) y renderiza el componente con su ítem activo. Las rutas existentes no cambian.

**Tech Stack:** React 19 + Vite, react-router-dom v7, lucide-react. Sin framework de tests en el frontend: verificación por `pnpm build` (tsc + vite) + grep + smoke manual.

**Spec:** `docs/superpowers/specs/2026-07-15-admin-sidebar-infraestructura-design.md`

## Global Constraints

- Las rutas NO cambian: `/admin/services/locations`, `/admin/services/rooms`, `/admin/services/create`.
- El menú unificado es exactamente: Dashboard, Usuarios, Calendario, Infraestructura (▾ Sedes, Espacios), Servicios, Finanzas, Planes. Sin "Reglas", sin "Ayuda", sin "Inscripciones".
- "Servicios" navega directo a `/admin/services/create` (sin submenu).
- Footer del sidebar: solo "Cerrar Sesión" (borra `accessToken` y `refreshToken` de localStorage, navega a `/login`).
- Paleta café/crema (tokens del objeto `C`), tipografías Cormorant Garamond + Inter, textos en español formal, temática médica.
- No tocar el contenido de las páginas fuera del sidebar, salvo el texto "academia" → "consultorio" en `ServiciosDashboard.tsx`.

## Ejecución en paralelo

- **Task 1 primero** (crea el componente). Después, **Tasks 2, 3, 4 y 5 son paralelizables** (archivos disjuntos; cada una puede ir en un agente/worktree distinto partiendo del commit de Task 1 y luego integrarse por cherry-pick).
- Task 6 (verificación integrada) al final, con todo mergeado.

---

### Task 1: Componente `AdminSidebar`

**Files:**
- Create: `medisxime-landing/src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: nada nuevo (react-router-dom `useNavigate`, íconos lucide-react ya instalados).
- Produces (contrato para Tasks 2–5):
  ```ts
  export type AdminNavKey =
    | 'dashboard' | 'usuarios' | 'calendario'
    | 'infraestructura' | 'servicios' | 'finanzas' | 'planes'

  export function AdminSidebar(props: {
    active?: AdminNavKey
    isMobileOpen?: boolean
    onMobileClose?: () => void
    actionSlot?: React.ReactNode
  }): JSX.Element
  ```
  Renderiza fragmento: `<style>` + overlay móvil + `<aside>` (240px, flex column). En ≤768px el aside es `position: fixed` deslizable con `isMobileOpen`.

- [ ] **Step 1: Crear el componente completo**

`medisxime-landing/src/components/admin/AdminSidebar.tsx`:

```tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Building2, Briefcase,
  DollarSign, CreditCard, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react'

// ─── Design tokens (paleta Dra. Ximena Correa) ────────────────────────────────
const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bgPanel: '#F5EDE1', white: '#FFFFFF',
  textBrown: '#7A6452', textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif'

export type AdminNavKey =
  | 'dashboard' | 'usuarios' | 'calendario'
  | 'infraestructura' | 'servicios' | 'finanzas' | 'planes'

interface NavEntry {
  key: AdminNavKey
  icon: React.ComponentType<{ size?: number | string; color?: string; strokeWidth?: number | string; style?: React.CSSProperties }>
  label: string
  route?: string   // sin route = expandible (Infraestructura)
}

const NAV: NavEntry[] = [
  { key: 'dashboard',       icon: LayoutDashboard, label: 'Dashboard',       route: '/admin/dashboard' },
  { key: 'usuarios',        icon: Users,           label: 'Usuarios',        route: '/admin/users' },
  { key: 'calendario',      icon: CalendarDays,    label: 'Calendario',      route: '/admin/classes' },
  { key: 'infraestructura', icon: Building2,       label: 'Infraestructura' },
  { key: 'servicios',       icon: Briefcase,       label: 'Servicios',       route: '/admin/services/create' },
  { key: 'finanzas',        icon: DollarSign,      label: 'Finanzas',        route: '/admin/finances' },
  { key: 'planes',          icon: CreditCard,      label: 'Planes',          route: '/admin/memberships' },
]

const INFRA_SUBITEMS = [
  { label: 'Sedes',    route: '/admin/services/locations' },
  { label: 'Espacios', route: '/admin/services/rooms' },
]

interface AdminSidebarProps {
  active?: AdminNavKey
  isMobileOpen?: boolean
  onMobileClose?: () => void
  actionSlot?: React.ReactNode
}

export function AdminSidebar({ active, isMobileOpen = false, onMobileClose, actionSlot }: AdminSidebarProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<AdminNavKey | null>(null)
  const [hoveredSub, setHoveredSub] = useState<string | null>(null)
  const [infraExpanded, setInfraExpanded] = useState(active === 'infraestructura')

  const go = (route: string) => { onMobileClose?.(); navigate(route) }
  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <>
      <style>{`
        .admin-sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0; bottom: 0; left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-sidebar-overlay.open {
            display: block; position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 49;
          }
        }
      `}</style>
      <div className={`admin-sidebar-overlay ${isMobileOpen ? 'open' : ''}`} onClick={onMobileClose} />
      <aside
        className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}
        style={{ width: 240, flexShrink: 0, background: C.bgPanel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '100vh' }}
      >
        {/* ── Logo ── */}
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>XC</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MedisXime</div>
              <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Consultorio Admin</div>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 6 }}>Menú Principal</span>
          {NAV.map(item => {
            const Icon = item.icon
            const isActive = active === item.key
            const isHovered = hovered === item.key
            const isInfra = item.key === 'infraestructura'
            return (
              <div key={item.key}>
                <button
                  onClick={() => (isInfra ? setInfraExpanded(v => !v) : go(item.route!))}
                  onMouseEnter={() => setHovered(item.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                    background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(92,58,40,0.07)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                    transition: 'background 0.18s ease', cursor: 'pointer',
                  }}
                >
                  <Icon size={16} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.18s ease' }}>
                    {item.label}
                  </span>
                  {isInfra && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {infraExpanded
                        ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />
                        : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                    </span>
                  )}
                </button>
                {isInfra && infraExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                    {INFRA_SUBITEMS.map(sub => (
                      <span
                        key={sub.label}
                        onClick={() => go(sub.route)}
                        onMouseEnter={() => setHoveredSub(sub.label)}
                        onMouseLeave={() => setHoveredSub(null)}
                        style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: hoveredSub === sub.label ? C.gold : C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.18s ease' }}
                      >
                        {sub.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Action slot (p.ej. botón "Nuevo Usuario") ── */}
        {actionSlot && <div style={{ padding: '12px 16px' }}>{actionSlot}</div>}

        {/* ── Footer ── */}
        <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd medisxime-landing; pnpm build`
Expected: tsc + vite build sin errores (el componente aún no se usa; solo debe compilar).

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): componente AdminSidebar compartido con apartado Infraestructura"
```

---

### Task 2: Adopción — pantallas de Infraestructura (4 archivos)

**Files:**
- Modify: `medisxime-landing/src/components/admin/SedesDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/CreateLocation.tsx`
- Modify: `medisxime-landing/src/components/admin/EspaciosDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/CreateRoom.tsx`

**Interfaces:**
- Consumes (de Task 1): `import { AdminSidebar } from './AdminSidebar'` con props `{ active?: AdminNavKey; isMobileOpen?: boolean; onMobileClose?: () => void; actionSlot?: React.ReactNode }`. El componente ya renderiza su propio overlay móvil.
- Produces: nada (hojas).

- [ ] **Step 1: Patrón de adopción (aplicar a los 4 archivos)**

En cada archivo:

1. Eliminar la constante `const NAV_ITEMS = [...]`.
2. Eliminar el bloque JSX del sidebar: desde el `<div className="mobile-overlay ...">` (u overlay equivalente, si existe) y el `<aside ...>` hasta su `</aside>` de cierre.
3. En su lugar, renderizar (si la página tiene estado `isMobileMenuOpen`):

```tsx
<AdminSidebar active="infraestructura" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
```

   Si la página no tiene estado móvil: `<AdminSidebar active="infraestructura" />`.

4. Agregar el import: `import { AdminSidebar } from './AdminSidebar'`.
5. Eliminar estados que queden sin uso (`hoveredNav`, `setHoveredNav`, `isServicesExpanded`, `setIsServicesExpanded`) y los imports de íconos que ya no se usen (`LayoutDashboard`, `Users`, `CalendarDays`, `Briefcase`, `DollarSign`, `CreditCard`, `LogOut`, `ChevronDown`, `ChevronRight` — verificar uno a uno: algunos se usan en el resto de la página).
6. Conservar intactos: el botón hamburguesa (`menu-toggle-btn` o equivalente), el estado `isMobileMenuOpen`, y TODO el contenido principal de la página.

- [ ] **Step 2: Verificar compilación y limpieza**

Run: `cd medisxime-landing; pnpm build`
Expected: sin errores.
Run: `grep -n "NAV_ITEMS" src/components/admin/SedesDashboard.tsx src/components/admin/CreateLocation.tsx src/components/admin/EspaciosDashboard.tsx src/components/admin/CreateRoom.tsx`
Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/components/admin/SedesDashboard.tsx medisxime-landing/src/components/admin/CreateLocation.tsx medisxime-landing/src/components/admin/EspaciosDashboard.tsx medisxime-landing/src/components/admin/CreateRoom.tsx
git commit -m "refactor(admin): SedesDashboard/CreateLocation/EspaciosDashboard/CreateRoom usan AdminSidebar"
```

---

### Task 3: Adopción — Servicios + texto (2 archivos)

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateService.tsx`
- Modify: `medisxime-landing/src/components/admin/ServiciosDashboard.tsx:336`

**Interfaces:**
- Consumes (de Task 1): `import { AdminSidebar } from './AdminSidebar'` con props `{ active?: AdminNavKey; isMobileOpen?: boolean; onMobileClose?: () => void }`.
- Produces: nada.

- [ ] **Step 1: Adoptar AdminSidebar en CreateService.tsx**

Mismo patrón que Task 2 (eliminar `NAV_ITEMS`, overlay + `<aside>...</aside>`, estados `hoveredNav`/`isServicesExpanded` e imports de íconos sin uso; conservar hamburguesa, `isMobileMenuOpen` y el `<ServiciosDashboard />` embebido), con:

```tsx
<AdminSidebar active="servicios" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
```

- [ ] **Step 2: Corregir el texto en ServiciosDashboard.tsx**

Línea 336: reemplazar

```
Administra el catálogo, horarios y disponibilidad de la academia.
```

por

```
Administra el catálogo, horarios y disponibilidad del consultorio.
```

- [ ] **Step 3: Verificar compilación**

Run: `cd medisxime-landing; pnpm build`
Expected: sin errores.
Run: `grep -rn "academia" src/components/admin/`
Expected: sin resultados.

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateService.tsx medisxime-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "refactor(admin): CreateService usa AdminSidebar; texto consultorio en ServiciosDashboard"
```

---

### Task 4: Adopción — pantallas de Usuarios (2 archivos)

**Files:**
- Modify: `medisxime-landing/src/components/admin/UsuariosDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/AdminProfessionals.tsx`

**Interfaces:**
- Consumes (de Task 1): `import { AdminSidebar } from './AdminSidebar'` con props `{ active?: AdminNavKey; isMobileOpen?: boolean; onMobileClose?: () => void; actionSlot?: React.ReactNode }`.
- Produces: nada.

- [ ] **Step 1: UsuariosDashboard con actionSlot**

Mismo patrón de adopción que Task 2 (su sidebar actual va de la línea ~358 a ~487: `<aside ... className="sidebar-resp">` hasta `</aside>`, incluyendo el `<style>` de media queries interno, el botón "Nuevo Usuario", el enlace "Ayuda" y el botón "Cerrar Sesión" — todo eso se elimina). Reemplazar por:

```tsx
<AdminSidebar
  active="usuarios"
  isMobileOpen={isMobileMenuOpen}
  onMobileClose={() => setIsMobileMenuOpen(false)}
  actionSlot={
    <button
      onClick={() => setShowModal(true)}
      style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 10, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 16px rgba(92,58,40,0.3)` }}
    >
      <Plus size={15} strokeWidth={3} />
      Nuevo Usuario
    </button>
  }
/>
```

Notas: el enlace "Ayuda" NO se recrea (decisión de spec). Conservar `Plus` en los imports de lucide (se sigue usando). Eliminar imports que queden sin uso (`CircleHelp`, `LogOut`, `ChevronDown`, `ChevronRight`, `AnimatePresence`/`motion` — solo si no se usan en el resto del archivo; verificar antes de borrar). La clase CSS `.main-with-sidebar` del `<style>` eliminado: si el main la usa, conservar un `<style>` mínimo con esa regla o quitar la clase del main.

- [ ] **Step 2: AdminProfessionals**

Mismo patrón de adopción con:

```tsx
<AdminSidebar active="usuarios" isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
```

(o sin props móviles si el archivo no tiene ese estado).

- [ ] **Step 3: Verificar compilación y limpieza**

Run: `cd medisxime-landing; pnpm build`
Expected: sin errores.
Run: `grep -n "NAV_ITEMS\|Ayuda" src/components/admin/UsuariosDashboard.tsx src/components/admin/AdminProfessionals.tsx`
Expected: sin resultados.

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/UsuariosDashboard.tsx medisxime-landing/src/components/admin/AdminProfessionals.tsx
git commit -m "refactor(admin): UsuariosDashboard y AdminProfessionals usan AdminSidebar"
```

---

### Task 5: Adopción — resto de dashboards (6 archivos)

**Files:**
- Modify: `medisxime-landing/src/components/admin/MainDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/AdminClasses.tsx`
- Modify: `medisxime-landing/src/components/admin/FinanzasDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/MembresiasDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/BeneficiosDashboard.tsx`
- Modify: `medisxime-landing/src/components/admin/InscripcionesDashboard.tsx`

**Interfaces:**
- Consumes (de Task 1): `import { AdminSidebar } from './AdminSidebar'` con props `{ active?: AdminNavKey; isMobileOpen?: boolean; onMobileClose?: () => void }`.
- Produces: nada.

- [ ] **Step 1: Patrón de adopción (mismo que Task 2) con estos `active`:**

| Archivo                   | JSX                                             |
|---------------------------|-------------------------------------------------|
| MainDashboard.tsx         | `<AdminSidebar active="dashboard" ... />`       |
| AdminClasses.tsx          | `<AdminSidebar active="calendario" ... />`      |
| FinanzasDashboard.tsx     | `<AdminSidebar active="finanzas" ... />`        |
| MembresiasDashboard.tsx   | `<AdminSidebar active="planes" ... />`          |
| BeneficiosDashboard.tsx   | `<AdminSidebar active="planes" ... />`          |
| InscripcionesDashboard.tsx| `<AdminSidebar />` (sin active)                 |

`...` = `isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)}` solo si la página ya tiene ese estado; omitir si no.

En `BeneficiosDashboard.tsx` el `NAV_ITEMS` local incluye un ítem "Reglas" con ícono `ShieldCheck`: se elimina junto con el resto del sidebar (y el import de `ShieldCheck` si queda sin uso).

- [ ] **Step 2: Verificar compilación y limpieza**

Run: `cd medisxime-landing; pnpm build`
Expected: sin errores.
Run: `grep -n "NAV_ITEMS\|Reglas" src/components/admin/MainDashboard.tsx src/components/admin/AdminClasses.tsx src/components/admin/FinanzasDashboard.tsx src/components/admin/MembresiasDashboard.tsx src/components/admin/BeneficiosDashboard.tsx src/components/admin/InscripcionesDashboard.tsx`
Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/components/admin/MainDashboard.tsx medisxime-landing/src/components/admin/AdminClasses.tsx medisxime-landing/src/components/admin/FinanzasDashboard.tsx medisxime-landing/src/components/admin/MembresiasDashboard.tsx medisxime-landing/src/components/admin/BeneficiosDashboard.tsx medisxime-landing/src/components/admin/InscripcionesDashboard.tsx
git commit -m "refactor(admin): dashboards restantes usan AdminSidebar"
```

---

### Task 6: Verificación integrada (tras merge de Tasks 1–5)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build final** — `cd medisxime-landing; pnpm build` → sin errores.
- [ ] **Step 2: Grep global** — `grep -rn "const NAV_ITEMS" medisxime-landing/src/components/admin/` → solo (a lo sumo) el `NAV` interno de `AdminSidebar.tsx`; `grep -rn "Creación de Sedes\|Creación de Espacios\|Aerial" medisxime-landing/src/components/admin/` → sin resultados.
- [ ] **Step 3: Smoke con la app corriendo** (`pnpm dev`): desde `/admin/dashboard`, `/admin/users` y `/admin/services/create` verificar: menú idéntico (7 ítems), Infraestructura despliega Sedes/Espacios y navega a `/admin/services/locations` y `/admin/services/rooms`, Servicios va directo a `/admin/services/create`, el activo se resalta correcto en cada pantalla, hamburguesa móvil (viewport ≤768px) abre/cierra, "Nuevo Usuario" abre el modal en Usuarios, Cerrar Sesión redirige a /login.

# Spec — Sidebar admin compartido con apartado "Infraestructura"

**Fecha**: 2026-07-15
**Estado**: Aprobado

## Objetivo

Reorganizar el menú lateral del panel admin: sacar Sedes y Espacios del apartado
"Servicios" a un nuevo apartado expandible **Infraestructura**, dejar **Servicios**
como navegación directa a Gestión de Servicios, y garantizar que el sidebar se vea
**idéntico en todas las pantallas** extrayéndolo a un componente compartido
(hoy está copiado en 13 archivos, ya desincronizados entre sí).

## Estado actual (problema)

- 13 pantallas admin definen cada una su propio `NAV_ITEMS` + JSX de sidebar:
  `MainDashboard`, `UsuariosDashboard`, `AdminProfessionals`, `AdminClasses`,
  `SedesDashboard`, `CreateLocation`, `EspaciosDashboard`, `CreateRoom`,
  `CreateService`, `FinanzasDashboard`, `MembresiasDashboard`,
  `BeneficiosDashboard`, `InscripcionesDashboard`.
- El submenu de "Servicios" mezcla infraestructura y catálogo: Creación de Sedes,
  Creación de Espacios, Creación de Servicios.
- Inconsistencias existentes: `BeneficiosDashboard` tiene un ítem "Reglas" que no
  navega a nada; `UsuariosDashboard` usa otro estilo (labels más grandes, submenu
  con Framer Motion, botón "Nuevo Usuario" y enlace "Ayuda" con `href="#"`).
- `ServiciosDashboard` (embebido en `CreateService`, ruta `/admin/services/create`)
  dice "…disponibilidad de la academia" (resto de pole dance).

## Decisiones tomadas

1. **Componente compartido** `AdminSidebar` usado por las 13 pantallas (no edición
   por copia). Cambios futuros del menú se hacen en un solo archivo.
2. **Infraestructura** es expandible (como Servicios hoy) con dos subítems:
   Sedes y Espacios. Ícono `Building2` (lucide-react).
3. **Servicios** navega directo a `/admin/services/create` (Gestión de Servicios).
   Sin submenu de un solo ítem.
4. Se eliminan el ítem **"Reglas"** (muerto) y el enlace **"Ayuda"** (link muerto);
   el footer queda solo con "Cerrar Sesión".
5. **Las rutas no cambian**: `/admin/services/locations`, `/admin/services/rooms`,
   `/admin/services/create` siguen siendo las URLs.
6. Texto de `ServiciosDashboard`: "…de la academia" → "…del consultorio".

## 1. Componente `AdminSidebar`

Archivo nuevo: `medisxime-landing/src/components/admin/AdminSidebar.tsx`.

```ts
export type AdminNavKey =
  | 'dashboard' | 'usuarios' | 'calendario'
  | 'infraestructura' | 'servicios' | 'finanzas' | 'planes'

interface AdminSidebarProps {
  active?: AdminNavKey          // ítem resaltado; undefined = ninguno (Inscripciones)
  isMobileOpen?: boolean        // estado del menú hamburguesa (lo maneja la página)
  onMobileClose?: () => void    // cerrar al navegar o tocar el overlay
  actionSlot?: React.ReactNode  // botón contextual (p.ej. "Nuevo Usuario")
}
```

Estructura del menú (única fuente de verdad):

| Ítem            | Ícono            | Acción                                  |
|-----------------|------------------|------------------------------------------|
| Dashboard       | LayoutDashboard  | navigate('/admin/dashboard')             |
| Usuarios        | Users            | navigate('/admin/users')                 |
| Calendario      | CalendarDays     | navigate('/admin/classes')               |
| Infraestructura | Building2        | toggle expandir/colapsar                 |
| — Sedes         | (subítem)        | navigate('/admin/services/locations')    |
| — Espacios      | (subítem)        | navigate('/admin/services/rooms')        |
| Servicios       | Briefcase        | navigate('/admin/services/create')       |
| Finanzas        | DollarSign       | navigate('/admin/finances')              |
| Planes          | CreditCard       | navigate('/admin/memberships')           |

Comportamiento:
- Infraestructura arranca expandida si `active === 'infraestructura'`; colapsada
  en caso contrario. Chevron Down/Right como el submenu actual de Servicios.
- Al navegar (ítem o subítem) se llama `onMobileClose?.()`.
- El componente renderiza el overlay móvil + `<aside>` con su propio `<style>` de
  media queries (patrón `sidebar-resp` de UsuariosDashboard: fixed + translateX
  en ≤768px). Las páginas conservan su botón hamburguesa y el estado
  `isMobileMenuOpen`.
- Estilo visual: el patrón mayoritario (el de CreateService/SedesDashboard):
  header XC/MedisXime/"Consultorio Admin", labels uppercase 12px con
  letterSpacing, ítem activo con gradiente café + texto blanco, hover
  `rgba(92,58,40,0.07)`. Tokens del objeto `C` local al componente (mismos
  valores de la paleta).
- Footer: solo "Cerrar Sesión" (borra tokens de localStorage y navega a /login).
- `actionSlot` se renderiza entre el nav y el footer (lo usa UsuariosDashboard
  para su botón "Nuevo Usuario"; las demás páginas no lo pasan).

## 2. Adopción en las 13 pantallas

Cada pantalla: se elimina `NAV_ITEMS`, el JSX del `<aside>`, y los estados
`hoveredNav` / `isServicesExpanded`; se importa y renderiza
`<AdminSidebar active={...} isMobileOpen={...} onMobileClose={...} />`.
El contenedor/layout de cada página (clases `dashboard-container`, divs flex)
no cambia; solo se reemplaza el `<aside>...</aside>` (y el overlay móvil si la
página lo renderizaba aparte).

| Pantalla                | active            |
|-------------------------|-------------------|
| MainDashboard           | 'dashboard'       |
| UsuariosDashboard       | 'usuarios' (+ actionSlot botón "Nuevo Usuario") |
| AdminProfessionals      | 'usuarios'        |
| AdminClasses            | 'calendario'      |
| SedesDashboard          | 'infraestructura' |
| CreateLocation          | 'infraestructura' |
| EspaciosDashboard       | 'infraestructura' |
| CreateRoom              | 'infraestructura' |
| CreateService           | 'servicios'       |
| FinanzasDashboard       | 'finanzas'        |
| MembresiasDashboard     | 'planes'          |
| BeneficiosDashboard     | 'planes'          |
| InscripcionesDashboard  | (sin active)      |

## 3. Texto

`ServiciosDashboard.tsx:336`: "Administra el catálogo, horarios y disponibilidad
de la academia." → "Administra el catálogo, horarios y disponibilidad del
consultorio."

## 4. Manejo de errores / edge cases

- Páginas sin estado móvil propio: `isMobileOpen`/`onMobileClose` son opcionales.
- No hay cambios de datos ni de API: riesgo limitado a compilación y navegación.

## 5. Verificación

- `pnpm build` (tsc + vite) sin errores.
- `grep` de `NAV_ITEMS` en `src/components/admin` → solo `AdminSidebar.tsx`
  (o cero si el componente no usa ese nombre).
- Smoke manual: desde 3+ pantallas distintas, verificar menú idéntico,
  Infraestructura despliega Sedes/Espacios y navega bien, Servicios va directo
  a Gestión de Servicios, hamburguesa móvil abre/cierra, "Nuevo Usuario" sigue
  abriendo el modal en Usuarios, Cerrar Sesión funciona.

## Fuera de alcance

- Cambiar rutas o crear pantalla nueva de "Infraestructura".
- Rediseñar el contenido de las páginas; solo el sidebar y el texto indicado.
- El ítem "Inscripciones" no se agrega al menú (la pantalla existe pero hoy no
  está en el menú unificado; se mantiene así).

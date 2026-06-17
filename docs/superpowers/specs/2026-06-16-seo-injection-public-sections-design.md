# Inyección del componente SEO en secciones públicas — medisxime-landing

## Contexto

El componente `SEO.tsx` (creado en la tarea anterior, `docs/superpowers/specs/2026-06-16-seo-component-design.md`)
existe pero todavía no lo usa ninguna pantalla. Esta tarea lo conecta a las
5 secciones públicas de la landing: `Hero.tsx`, `About.tsx`, `Classes.tsx`,
`Instructors.tsx`, `Testimonials.tsx`.

Alcance de esta tarea (no más, no menos):
- Cada uno de los 5 componentes importa `SEO` desde `../components/SEO` y lo
  renderiza con un `title`/`description` propio, en tono médico/clínico.
- No se tocan componentes de `/admin`, `/user` ni `/professional`.
- No se modifican estilos, layout ni la estructura visual existente — solo se
  agrega `<SEO />` como nodo adicional (sin renderizado visible) y se envuelve
  el `return` existente en un Fragment para darle un hermano.
- No se modifica `SEO.tsx` ni `main.tsx` (ya tienen `HelmetProvider` y los
  props `title`/`description`/`canonical` aprobados en la tarea previa).

## Hallazgo de diseño importante

`Hero`, `About`, `Classes`, `Instructors` y `Testimonials` **no son rutas
separadas**: las cinco se renderizan juntas, como secciones de una sola
página, dentro de `LandingPage()` en
[App.tsx](../../../medisxime-landing/src/App.tsx) (ruta `/`):

```tsx
function LandingPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar onLoginClick={() => navigate('/login')} />
      <main>
        <Hero />
        <About />
        <Classes />
        <Instructors />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
```

`react-helmet-async` resuelve tags singleton (`<title>`, `<meta
name="description">`) con la regla "el último `<Helmet>` montado en el árbol
gana". Como los 5 componentes se montan simultáneamente en el mismo árbol, en
la práctica solo el `<title>`/`description` del **último** en el orden del
DOM — `Testimonials` — será el que el navegador muestre en la pestaña.

**Decisión (confirmada con el usuario):** se cumple la instrucción literal de
inyectar `<SEO />` en los 5 componentes, con copy específico para cada uno.
Se documenta explícitamente que, mientras estas secciones compartan una sola
ruta, solo el de `Testimonials` tiene efecto visible en el `<title>` del
navegador; los otros 4 quedan declarados y listos para el día en que estas
secciones se conviertan en rutas o páginas independientes (fuera de alcance
de esta tarea).

## Patrón de integración

Los 5 componentes hoy retornan un único nodo raíz (`<section>...</section>`).
Para añadir `<SEO />` como hermano sin romper la regla de raíz única de React,
se envuelve el `return` en un Fragment y `<SEO />` se agrega como primer hijo,
antes del `<section>` existente:

```tsx
// Antes
return (
  <section id="...">
    {/* ... */}
  </section>
)

// Después
return (
  <>
    <SEO title="..." description="..." />
    <section id="...">
      {/* ... */}
    </section>
  </>
)
```

El import se agrega junto a los demás imports del archivo:

```tsx
import { SEO } from './SEO'
```

(Los 5 componentes viven en `medisxime-landing/src/components/`, mismo
directorio que `SEO.tsx`, así que el import es relativo directo, sin
subcarpetas.)

## Copy por componente

Todos los `title` siguen el patrón `<Sección> | Medis` para diferenciarse
del título genérico de la clínica. Todas las `description` están en tono
formal, orientado a salud/pacientes, consistente con `CLAUDE.md`.

| Componente | `title` | `description` |
|---|---|---|
| `Hero.tsx` | `Inicio \| Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora` | `Bienvenido a Medis, el consultorio de la Dra. Ximena Correa. Agenda tu cita en medicina bioreguladora, salud ocupacional y exámenes médico-ocupacionales.` |
| `About.tsx` | `Medicina con Calidez Humana \| Medis` | `Conoce el enfoque de atención integral de Medis: calidez humana, profesionalismo y compromiso real con la salud de pacientes y empresas.` |
| `Classes.tsx` | `Nuestros Servicios Médicos \| Medis` | `Descubre el catálogo de servicios de Medis: exámenes médico-ocupacionales, consultoría en SG-SST, medicina laboral y medicina bioreguladora para empresas y pacientes.` |
| `Instructors.tsx` | `Sobre la Dra. Ximena Correa \| Medis` | `Conoce a la Dra. Ximena Correa, especialista en salud ocupacional y medicina bioreguladora, al frente del equipo médico de Medis.` |
| `Testimonials.tsx` | `Testimonios de Pacientes y Empresas \| Medis` | `Lee las experiencias de pacientes y empresas que confían en los servicios médicos de Medis y la Dra. Ximena Correa.` |

Ningún componente pasa `canonical` (no hay dominio canónico definido en el
alcance de esta tarea; el prop sigue siendo opcional y `SEO.tsx` ya maneja su
ausencia sin renderizar el `<link rel="canonical">`).

## Verificación

Este paquete no tiene test runner configurado. El gate de verificación por
archivo modificado es:
- `pnpm -F medisxime-landing build` (compila TypeScript vía Vite) sin errores.
- Smoke check manual: levantar `pnpm -F medisxime-landing dev`, abrir `/` y
  confirmar que la landing renderiza igual que antes (mismo layout visual) y
  que la pestaña del navegador muestra el `<title>` de `Testimonials` (último
  en el DOM), consistente con el comportamiento documentado arriba.

## Fuera de alcance

- No se modifica `SEO.tsx` ni `main.tsx`.
- No se tocan `/admin`, `/user`, `/professional`, `FinalCTA.tsx`, `Navbar.tsx`
  ni `Footer.tsx`.
- No se modifican estilos, layout ni rutas.
- No se resuelve el conflicto de `<title>` entre secciones (decisión
  documentada arriba): no se convierte ninguna sección en ruta independiente,
  no se modifica el comportamiento de deduplicación de `react-helmet-async`.
- No se agrega `canonical` a ningún componente.

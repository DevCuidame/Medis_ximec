# Componente SEO base + HelmetProvider — medisxime-landing

## Contexto

`medisxime-landing` no tiene gestión dinámica de meta tags. El `<head>` de
`index.html` solo incluye lo mínimo (charset, viewport, title estático) y no hay
forma de cambiar `title`/`description`/`canonical` por página desde React. Se
necesita una solución estándar del ecosistema React, compatible con SSR futuro y
con deduplicación de tags, para poder declarar SEO por componente/página.

Alcance de esta tarea (no más, no menos):
- Instalar **únicamente** `react-helmet-async`.
- Envolver la app con `HelmetProvider` en la raíz.
- Crear `medisxime-landing/src/components/SEO.tsx`, un componente reutilizable con
  props `title`, `description`, `canonical`.
- Agregar meta tags genéricos de la clínica en `medisxime-landing/index.html`.
- No se modifican estilos ni rutas. No se instalan dependencias adicionales.

## 1. Instalación — `package.json`

Se agrega `react-helmet-async` a `dependencies` de `medisxime-landing/package.json`
(misma sección donde están `react-router-dom`, `framer-motion`, etc.). No se agrega
ningún otro paquete (no se instala `@types/react-helmet-async`, porque la librería
incluye sus propios tipos).

## 2. `main.tsx` — `HelmetProvider`

`HelmetProvider` envuelve a `BrowserRouter` (y por ende a `App`), como contexto más
externo, sin alterar el interceptor de `fetch` existente ni el orden de montaje:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

// ...interceptor de fetch sin cambios...

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

## 3. `SEO.tsx` — Componente base

Ubicación: `medisxime-landing/src/components/SEO.tsx`.

Props tipadas, todas opcionales, con defaults orientados a la clínica de la
Dra. Ximena Correa (tono formal, salud ocupacional/medicina bioreguladora):

```tsx
interface SEOProps {
  title?: string
  description?: string
  canonical?: string
}

const DEFAULT_TITLE =
  'Dra. Ximena Correa — Salud Ocupacional y Medicina Bioreguladora'
const DEFAULT_DESCRIPTION =
  'Consultorio de la Dra. Ximena Correa: especialista en salud ocupacional, ' +
  'medicina bioreguladora y exámenes médico ocupacionales. Atención cálida y ' +
  'profesional para pacientes y empresas.'

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

Notas de diseño:
- Si no se pasa `canonical`, el `<link rel="canonical">` simplemente no se
  renderiza (no se infiere ni se construye una URL).
- Los tags Open Graph se limitan a `og:title`, `og:description`, `og:type` — el
  mínimo razonable para un componente "base"; no se agregan `og:image`/`og:url`
  porque no hay assets ni dominio canónico definidos en el alcance de esta tarea.
- El componente no incluye lógica de rutas: cada página que lo use pasará sus
  propios `title`/`description`/`canonical` como props; si no se pasa nada, se
  usan los defaults de la clínica (igual al `<title>` actual del sitio).

## 4. `index.html` — Meta tags genéricos

Se agregan al `<head>` existente (sin tocar charset/viewport ya presentes), con
el mismo tono y contenido por defecto que `SEO.tsx`, para que la carga inicial
(antes de que React hidrate) ya tenga meta tags coherentes:

```html
<html lang="es">
  <head>
    <!-- ...charset, viewport existentes... -->
    <meta name="description" content="Consultorio de la Dra. Ximena Correa: especialista en salud ocupacional, medicina bioreguladora y exámenes médico ocupacionales. Atención cálida y profesional para pacientes y empresas." />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="Dra. Ximena Correa — Salud Ocupacional y Medicina Bioreguladora" />
    <meta property="og:description" content="Consultorio de la Dra. Ximena Correa: especialista en salud ocupacional, medicina bioreguladora y exámenes médico ocupacionales. Atención cálida y profesional para pacientes y empresas." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <!-- ...title existente, etc... -->
  </head>
```

Cambios puntuales:
- `<html>` pasa a tener `lang="es"` si no lo tenía ya.
- El texto de `description`/`og:description` es idéntico al `DEFAULT_DESCRIPTION`
  de `SEO.tsx`, para evitar inconsistencia entre el HTML estático y lo que
  `react-helmet-async` sobrescribe en runtime.

## Fuera de alcance

- No se crean páginas ni rutas nuevas que usen `<SEO />` (el componente queda
  listo para integrarse después).
- No se agregan `sitemap.xml`, `robots.txt`, ni `og:image`.
- No se modifican estilos, layout ni Tailwind.
- No se instala ningún paquete adicional a `react-helmet-async`.

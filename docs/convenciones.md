# Convenciones — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

---

## Reglas globales (aplican a TODA la migración de pantallas)

- **Temática**: médica. Todo el contenido, textos de ejemplo, datos semilla (seed) e
  imágenes deben reflejar un entorno de salud — consultas, médicos, pacientes,
  especialidades, exámenes, tratamientos — sin rastros de pole dance, danza o estudios
  de baile.
- **Colores**: paleta café/crema/terracota de la Dra. Ximena Correa. Transmite calidez
  profesional. Ver tokens completos abajo.
- **Tipografía**: Cormorant Garamond (serif, titulares) + Inter (sans-serif, cuerpo).
- **Textos**: formales y orientados a salud/pacientes. Lenguaje claro, respetuoso y
  profesional.

Para la terminología del dominio (cómo se traducen los conceptos originales de Medis
al lenguaje médico), ver [glosario.md](glosario.md).

---

## Paleta de colores (tokens CSS)

Definidos en `medisxime-landing/src/index.css` con `@theme`:

| Token CSS                    | Valor     | Uso                                      |
|------------------------------|-----------|------------------------------------------|
| `--color-brand-primary`      | `#5C3A28` | Café oscuro — marca, encabezados         |
| `--color-brand-secondary`    | `#9C4A2E` | Terracota — acento, botones              |
| `--color-brand-accent`       | `#D4B896` | Dorado crema — detalles, hover           |
| `--color-brand-accent-2`     | `#C97B5A` | Terracota claro — variante               |
| `--color-bg-main`            | `#FFFBF5` | Fondo principal (blanco cálido)          |
| `--color-bg-secondary`       | `#F5EDE1` | Fondo panel / sidebar                    |
| `--color-bg-dark`            | `#3D2418` | Secciones oscuras (Footer, FinalCTA)     |
| `--color-text-primary`       | `#3D2B1F` | Texto principal                          |
| `--color-text-secondary`     | `#7A6452` | Texto secundario / subtítulos            |
| `--color-text-muted`         | `#B0A08C` | Texto desactivado / placeholders         |
| `--color-border`             | `#E6D9C7` | Bordes de tarjetas y separadores         |

Clase utilitaria CSS disponibles: `.brand-gradient`, `.brand-text-gradient`, `.glass`, `.glass-dark`.

En los componentes React (archivos `.tsx`), el objeto de diseño se llama `C` y replica
los mismos valores con las claves `gold`, `goldLight`, `bgPanel`, `white`, `text`, etc.

Spec completa de diseño: [docs/superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md](superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md)

---

## Convenciones de código

### Patrones de diseño en componentes React
- Cada componente admin/user/professional define un objeto local `C` con los tokens de color.
- Todos los dashboards del admin comparten el mismo sidebar con `NAV_ITEMS`.
- Las llamadas al API usan `fetch('/api/...')` con `localStorage.getItem('accessToken')` como Bearer.
- Animaciones con Framer Motion: `useInView` para scroll-triggered, `AnimatePresence` para modales.

### Respuestas de API
```json
// Éxito
{ "success": true, "data": { ... } }
// Error
{ "success": false, "error": "mensaje" }
```

### Especialidades médicas en frontend
Definidas como constante `DISCIPLINES` en `CreateProfessionalModal.tsx`:
`'Medicina Bioreguladora'`, `'Salud Ocupacional'`, `'Medicina Laboral'`, `'Consultoría en SG-SST'`, `'Salud en el Trabajo'`, `'Valoración Médica'`

Para el mapa completo de archivos donde aplican estas convenciones, ver [arquitectura.md](arquitectura.md).

# CLAUDE.md — Proyecto "MedisXime" (Clínica General)

Este proyecto es una copia de la plataforma **Medis** adaptada como sistema de gestión
para la clínica de **Dra. Ximena Correa** — especialista en Salud Ocupacional, Medicina
Bioreguladora y Exámenes Médico Ocupacionales.

Este archivo es el **índice maestro** de la documentación del proyecto. No dupliques
contenido aquí: cada tema vive en su propio documento bajo `docs/`; agrega o actualiza
información allí y enlaza desde este índice si hace falta.

---

## Índice de documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/arquitectura.md](docs/arquitectura.md) | Estructura del monorepo, stack tecnológico, API REST, esquema de base de datos, mapa de archivos frontend/backend |
| [docs/convenciones.md](docs/convenciones.md) | Reglas globales de temática y estilo, paleta de colores, convenciones de código y patrones React |
| [docs/decisiones.md](docs/decisiones.md) | Autenticación y roles, y enlaces a los planes/specs de diseño con su rationale |
| [docs/glosario.md](docs/glosario.md) | Mapeo conceptual Medis → dominio médico, roles del sistema |
| [docs/flujo-de-trabajo.md](docs/flujo-de-trabajo.md) | Cómo correr el proyecto, comandos de monorepo, variables de entorno |
| [docs/errores-conocidos.md](docs/errores-conocidos.md) | Código stub/legacy que no debe usarse, riesgos operativos conocidos |

---

## Guía rápida — ¿qué documento necesito?

- ¿Dónde vive tal componente/ruta/migración? → [arquitectura.md](docs/arquitectura.md)
- ¿Qué colores, tipografía o tono de texto debo usar? → [convenciones.md](docs/convenciones.md)
- ¿Por qué se eligió JWT+PBKDF2, o qué campos tiene cada rol? → [decisiones.md](docs/decisiones.md)
- ¿Qué significa "oferta de servicio" o "profesional" en este dominio? → [glosario.md](docs/glosario.md)
- ¿Cómo instalo, corro migraciones o levanto el dev server? → [flujo-de-trabajo.md](docs/flujo-de-trabajo.md)
- ¿Este archivo/componente es seguro de tocar o es legacy/stub? → [errores-conocidos.md](docs/errores-conocidos.md)

---

## Reglas globales (resumen)

Estas reglas aplican a **toda** la migración de pantallas del proyecto; el detalle
completo está en [convenciones.md](docs/convenciones.md):

- Temática estrictamente médica en textos, seed data e imágenes.
- Paleta café/crema/terracota de la Dra. Ximena Correa.
- Tipografía Cormorant Garamond (titulares) + Inter (cuerpo).
- Textos formales, claros y orientados a salud/pacientes.

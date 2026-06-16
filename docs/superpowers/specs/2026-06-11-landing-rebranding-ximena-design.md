# Diseño: Rebranding Landing Pública — Consultorio Dra. Ximena Correa

**Fecha:** 2026-06-11
**Sub-proyecto:** 1 de N — Landing pública (`medisxime-landing/src/components/`)
**Estado:** Aprobado — pendiente plan de implementación
**Supersede a:** `2026-06-10-landing-rebranding-medica-design.md` (enfoque "Dra. Diana Cristina Medina Camargo", paleta morado/azul, nunca implementado)

---

## Contexto

El proyecto `MedisXime` parte de una copia de la plataforma medisxime (estudio de pole dance) y se migra al sistema de gestión del **consultorio de la Dra. Ximena Correa, Médico Especialista en Salud Ocupacional, Medicina Laboral, consultoría SGSST y Medicina Bioreguladora**.

La identidad de marca se basa en la tarjeta de presentación física de la doctora:
- **Anverso:** fondo crema/beige, logo circular tipo "remolino" con una "X" estilizada, texto "Dra. Ximena Correa — Médico Especialista" en café oscuro.
- **Reverso:** fondo café/terracota oscuro, texto crema con la lista de servicios, código QR, WhatsApp `313 389 4523` e Instagram `@ximenadoc`.

Este spec cubre únicamente los 8 componentes de la landing pública + `App.tsx` + `index.css` + `index.html`. La autenticación, los portales de paciente, profesional y panel admin son sub-proyectos independientes que vendrán después y reutilizarán este sistema de diseño.

**Nota:** La paleta café/crema/terracota de este spec **reemplaza** la regla de colores blanco/azul de `CLAUDE.md` (sección "Reglas globales"), que se actualiza como parte de este trabajo.

---

## Sistema de Diseño

### Paleta de colores (nuevo `@theme` en `index.css`)

| Token | Valor | Uso |
|---|---|---|
| `--color-brand-primary` | `#5C3A28` | Logo, encabezados, textos de marca |
| `--color-brand-secondary` | `#9C4A2E` | Acentos, botones, segundo color del gradiente |
| `--color-brand-accent` | `#D4B896` | Líneas decorativas, bordes, detalles, tag "Empresas" |
| `--color-brand-accent-2` | `#C97B5A` | Tag "Bienestar" (segundo acento, servicios bioreguladores) |
| `--color-bg-main` | `#FFFBF5` | Fondo principal |
| `--color-bg-secondary` | `#F5EDE1` | Fondos de secciones alternas |
| `--color-bg-dark` | `#3D2418` | Fondo de FinalCTA y Footer (eco del reverso de la tarjeta) |
| `--color-text-primary` | `#3D2B1F` | Texto principal |
| `--color-text-secondary` | `#7A6452` | Texto secundario |
| `--color-text-muted` | `#B0A08C` | Texto deshabilitado/labels |
| `--color-border` | `#E6D9C7` | Bordes sutiles |

**Gradiente de marca (`brand-gradient` / `brand-text-gradient`):** `linear-gradient(135deg, #5C3A28, #9C4A2E)` — café → terracota. Reemplaza cualquier gradiente morado/azul o dorado previo.

**Gradientes de tarjetas de servicio (oscuros, para `Classes.tsx`):**
- Variante "Empresas": `linear-gradient(160deg, #2A1810 0%, #5C3A28 50%, #3D2418 100%)`
- Variante "Bienestar": `linear-gradient(160deg, #3D2418 0%, #9C4A2E 50%, #2A1810 100%)`

### Tipografía

Se mantiene la combinación existente:
- `--font-cormorant`: 'Cormorant Garamond', Georgia, serif — encabezados, nombre de marca
- `--font-inter`: 'Inter', system-ui, sans-serif — cuerpo de texto

### Logo / Monograma

No se recrea el ícono "remolino" exacto de la tarjeta (riesgo de SVG complejo que no luzca bien a tamaños pequeños). Se usa un **monograma circular "XC"**:
- Círculo con `background: brand-gradient` (o `linear-gradient(160deg, #8B5CF6...)` → reemplazar por café/terracota), texto "XC" en `font-cormorant`, color crema.
- Mismo patrón para: ícono del Navbar (pequeño, ~40px) y avatar de la sección "Sobre la Doctora" (grande, ~120px, como el "DM" del spec anterior).

---

## Contenido por Sección

### Navbar

- Marca: monograma "XC" (pequeño) + texto "Dra. Ximena Correa" en `font-cormorant brand-text-gradient`.
- Links: `Inicio` (#inicio) · `Sobre la Doctora` (#sobre-la-doctora) · `Servicios` (#servicios) · `Testimonios` (#testimonios) · `Contacto` (#contacto)
- CTA: "Agendar Cita" (pill con `brand-gradient`)
- Botón de login: "Iniciar Sesión" (texto en `--color-brand-primary`, hover `--color-brand-secondary`)
- Todos los colores inline dorados/`#775A00`/`#B08D32` → mapear a `#5C3A28` / `#9C4A2E` según la tabla de equivalencias al final de este documento.

### Hero

- Eyebrow: *"Salud Ocupacional · Medicina Bioreguladora · Bienestar"* — color `--color-brand-secondary` (`#9C4A2E`)
- Headline (mayúsculas, última línea en cursiva como en el componente actual):
  ```
  CUIDAMOS LA SALUD
  DE TU EQUIPO
  Y LA *TUYA*
  ```
- Subtexto: *"La Dra. Ximena Correa ofrece servicios de medicina laboral, exámenes ocupacionales y consultoría en SGSST para tu empresa, además de medicina bioreguladora para tu bienestar personal."*
- CTA primario: "Agendar Cita" → `#contacto`, `brand-gradient`, sombra en tonos `rgba(92,58,40,...)` / `rgba(156,74,46,...)`
- CTA secundario: "Conoce Nuestros Servicios" → `#servicios`, borde `rgba(92,58,40,0.45)`
- Orbs decorativos (antes "GoldOrb"): renombrar a `BrandOrb`, `radial-gradient(circle, rgba(92,58,40,0.55) 0%, rgba(156,74,46,0.15) 60%, transparent 100%)`
- Partículas: color `#D4B896`, `boxShadow: 0 0 6px 2px rgba(212,184,150,0.7)`
- Video: placeholder `/videos/hero-clinic.mp4` (a proveer por el usuario)

### About — "Nuestro Enfoque" (`id="sobre-nosotros"`)

- Eyebrow: *"Nuestro Enfoque"*
- Título: `Medicina con` / `*Calidez Humana*` (cursiva en `--color-brand-primary`)
- Subtexto: *"Nuestro consultorio acompaña tanto a empresas como a pacientes individuales — combinando el rigor de la medicina laboral y ocupacional con un enfoque integral de bienestar a través de la medicina bioreguladora."*

**4 Pilares (`PILLARS`):**

| Ícono | Título | Descripción |
|---|---|---|
| ✦ | Cumplimiento Normativo | Acompañamos a tu empresa en el cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST), conforme a la normativa vigente. |
| ◈ | Medicina Preventiva Ocupacional | Exámenes y programas diseñados para detectar riesgos a tiempo y proteger la salud de tus colaboradores en cada etapa laboral. |
| ❋ | Medicina Bioreguladora | Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo, promoviendo el equilibrio y el bienestar. |
| ⟡ | Confianza y Profesionalismo | Atención cercana, ética y rigurosa, tanto para empresas como para pacientes que buscan cuidar su salud. |

**Stats (4):** `+500` Exámenes Realizados · `SGSST` Cumplimiento Normativo · `5★` Calificación de Pacientes · `100%` Atención Personalizada

- Colores de tarjetas/íconos/eyebrow: mapear dorado → café/terracota según tabla de equivalencias.
- Fondo de sección: `--color-bg-main` (`#FFFBF5`)

### Servicios (`Classes.tsx`, `id="servicios"`)

- Eyebrow: *"Nuestros Servicios"*
- Título: `Salud Laboral & *Bienestar*` (cursiva en `--color-brand-primary`)
- CTA del header: "Agendar Cita" → `#contacto`, `brand-gradient`
- Fondo de sección: `--color-bg-secondary` (`#F5EDE1`)

**6 Tarjetas (`CLASSES` → `SERVICES`):**

> Nota: "Acento" y "Gradiente" se asignan por variedad visual en la grilla (igual que en
> el patrón original), no codifican estrictamente la columna "Tag" — la audiencia
> (empresas/pacientes) la comunica el texto del "Tag", no el color de la tarjeta.

| # | Título | Nivel/Público | Duración | Tag | Acento | Gradiente |
|---|---|---|---|---|---|---|
| 1 | Exámenes de Ingreso Ocupacional | Empresas | 30 min | Empresas | `#D4B896` | Variante "Empresas" |
| 2 | Exámenes Periódicos y de Retiro | Empresas | 30 min | Empresas | `#D4B896` | Variante "Empresas" |
| 3 | Medicina Laboral | Empresas | 45 min | Más solicitada | `#D4B896` | Variante "Empresas" |
| 4 | Consultoría en SGSST | Empresas | Asesoría | Cumplimiento | `#D4B896` | Variante "Bienestar" |
| 5 | Medicina Bioreguladora | Pacientes | 45 min | Bienestar | `#C97B5A` | Variante "Bienestar" |
| 6 | Salud en el Trabajo | Empresas y Equipos | Programas | Bienestar Laboral | `#C97B5A` | Variante "Empresas" |

Descripciones:
1. *"Evaluación médica pre-ocupacional para nuevos colaboradores, garantizando que cada persona inicie su labor en óptimas condiciones de salud."*
2. *"Seguimiento del estado de salud de tus colaboradores durante su vinculación laboral y al finalizar su contrato."*
3. *"Atención médica especializada en la prevención, diagnóstico y manejo de enfermedades relacionadas con el trabajo."*
4. *"Acompañamiento integral en el Sistema de Gestión de Seguridad y Salud en el Trabajo, asegurando el cumplimiento de la normativa vigente."*
5. *"Un enfoque integral que estimula los procesos naturales de autorregulación del cuerpo para promover tu bienestar físico y emocional."*
6. *"Programas de promoción y prevención enfocados en el bienestar físico y mental de los colaboradores en su entorno laboral."*

CTA por tarjeta: "Agendar" (era "Reservar"). Lógica de color por `accent` (dos valores: `#D4B896` / `#C97B5A`) reemplaza la lógica ternaria anterior basada en `#A78BFA`/`#38BDF8`.

### Sobre la Doctora (`Instructors.tsx`, reescritura completa, `id="sobre-la-doctora"`)

Mismo layout de 2 columnas del spec anterior (avatar a la izquierda en `min-height: 420px`, info a la derecha), adaptado:

- Eyebrow: *"Tu Médica de Confianza"*
- Avatar izquierdo: fondo `linear-gradient(160deg, #5C3A28 0%, #7A4A35 40%, #9C4A2E 100%)`, círculo con monograma **"XC"** (en vez de "DM")
- Nombre: **Dra. Ximena Correa**
- Especialidad: *"Especialista en Medicina Laboral, SGSST y Medicina Bioreguladora"*
- Bio: *"Médica con amplia experiencia en salud ocupacional, medicina laboral y consultoría en Sistemas de Gestión de Seguridad y Salud en el Trabajo (SGSST). Combina su formación clínica con un enfoque de medicina bioreguladora, brindando atención integral tanto a empresas como a pacientes que buscan cuidar su bienestar."*
- Chips de credenciales (`CREDENTIALS`): `Médica Cirujana` · `Esp. en Salud Ocupacional y SGSST` · `Medicina Bioreguladora` · `[Universidad / Institución]`
- Responsive: grid 2 columnas → 1 columna en `<768px` (igual que spec anterior)

### Testimonios (`Testimonials.tsx`, `id="testimonios"`)

- Eyebrow: *"Testimonios de Pacientes"*
- Título: `Lo que dicen` / `*Nuestros Pacientes*` (cursiva en `--color-brand-primary`)
- Fondo de sección: `--color-bg-secondary` (`#F5EDE1`)

**5 Testimonios (`TESTIMONIALS`, todos `stars: 5`):**

1. **Laura M.** — Coordinadora de RRHH · Consultoría SGSST: *"Gracias a la asesoría en SGSST de la Dra. Ximena, logramos poner al día todos nuestros procesos de seguridad y salud en el trabajo. Un acompañamiento profesional y muy claro."*
2. **Camila R.** — Paciente · Medicina Bioreguladora: *"La medicina bioreguladora cambió mi forma de ver mi salud. Me sentí escuchada desde la primera consulta y los resultados han sido notables."*
3. **Andrés F.** — Gerente de Operaciones · Exámenes Ocupacionales: *"Los exámenes de ingreso para nuestro personal son ágiles, organizados y con resultados oportunos. Excelente atención para nuestra empresa."*
4. **Jorge P.** — Paciente · Medicina Laboral: *"Tuve una lesión relacionada con mi trabajo y la doctora me dio un diagnóstico claro y un plan de manejo efectivo. Me sentí muy bien atendido."*
5. **Marcela T.** — Líder de Bienestar · Salud en el Trabajo: *"Implementamos un programa de salud en el trabajo con la Dra. Ximena y notamos una mejora real en el bienestar de nuestro equipo."*

Recolorear: estrellas, dots de navegación, bordes, glows decorativos → tabla de equivalencias (dorado → café/terracota).

### FinalCTA (fondo oscuro `--color-bg-dark`)

- Eyebrow: *"Agenda tu Consulta"*
- Título: `Tu bienestar` / `*y el de tu equipo*` (cursiva con `brand-gradient` aplicado al texto)
- Subtexto: *"Da el primer paso hacia una atención médica laboral y bioreguladora de calidad. La Dra. Ximena Correa está lista para acompañarte a ti y a tu empresa."*
- CTA primario: "Agendar Cita" (`brand-gradient`) → `#contacto`
- CTA secundario: "Conoce los Servicios" → `#servicios`, borde `rgba(212,184,150,0.40)`
- Trust indicators: `✦ Primera consulta de valoración` · `◈ Atención cercana y profesional` · `❋ Médica certificada en SGSST`
- Fondos/orbs/patrones de líneas: recolorear con `#5C3A28`/`#9C4A2E`/`#D4B896` según tabla de equivalencias

### Footer (fondo `--color-bg-dark`, `#3D2418`, texto crema)

Concepto: el footer adopta el **café oscuro del reverso de la tarjeta**, igual que esa cara concentra el contacto + QR.

- Marca: monograma "XC" + "Dra. Ximena Correa" (`font-cormorant brand-text-gradient`, ajustar tamaño para que quepa)
- Tagline (texto literal de la tarjeta): *"Medicina Bioreguladora, Exámenes médico ocupacionales, Medicina Laboral, consultoría en el SGSST y Salud en el Trabajo."*
- Redes sociales (`SOCIAL`): **Instagram** (`href: 'https://www.instagram.com/ximenadoc/'`) + **WhatsApp** (`href: 'https://wa.me/573133894523'`, ícono de WhatsApp). Se elimina Facebook/TikTok — la tarjeta solo muestra estas dos redes.
- Columna "Consultorio": `Inicio` · `Sobre la Doctora` · `Servicios` · `Agendar Cita` · `Contacto`
- Columna "Servicios": `Exámenes de Ingreso` · `Exámenes Periódicos y de Retiro` · `Medicina Laboral` · `Consultoría SGSST` · `Medicina Bioreguladora` · `Salud en el Trabajo` (hrefs → `#servicios`)
- Columna "Contacto":
  - `WhatsApp`: `313 389 4523` (real, de la tarjeta)
  - `Instagram`: `@ximenadoc` (real, de la tarjeta)
  - `Email`: `[correo@consultorio.com]` (placeholder — no está en la tarjeta)
  - `Horarios`: `[Lun – Vie · X am – X pm]` (placeholder — no está en la tarjeta)
- CTA del footer: "Agendar Cita" (`brand-gradient`)
- Copyright: *"© {year} Dra. Ximena Correa · Todos los derechos reservados"*
- Frase final: *"Especialista en Salud Ocupacional y Medicina Bioreguladora"* — color `#D4B896`
- Como el footer ya parte de fondo oscuro (`#3D2418`), los textos secundarios usan tonos crema translúcidos (`rgba(245,237,225,0.6)` etc.) en vez de grises oscuros — ajustar `color: '#7F7665'` / `'#5E5E5E'` a equivalentes crema.

### App.tsx

- `ScrollProgressBar`: `background: 'linear-gradient(90deg, #5C3A28, #9C4A2E, #D4B896)'`
- Botón en `SessionExpiredBanner`: `background: 'linear-gradient(135deg, #5C3A28, #9C4A2E)'`

### index.html

- Actualizar `<title>` (quitar referencia a "medisxime")

---

## Tabla de Equivalencias de Color (para grep/reemplazo sistemático)

| Color anterior (dorado / morado-azul del spec no implementado) | Nuevo valor |
|---|---|
| `#775A00` | `#5C3A28` |
| `#B08D32` | `#9C4A2E` |
| `#D4A843` | `#D4B896` |
| `119,90,0` (rgba) | `92,58,40` |
| `176,141,50` (rgba) | `156,74,46` |
| `#8B5CF6` (no implementado) | `#5C3A28` |
| `#3B82F6` (no implementado) | `#9C4A2E` |
| `#38BDF8` (no implementado) | `#D4B896` |
| `139,92,246` (rgba) | `92,58,40` |
| `59,130,246` (rgba) | `156,74,46` |
| `#A78BFA` (acento tarjeta servicio) | `#D4B896` |
| `#38BDF8` (acento tarjeta servicio) | `#C97B5A` |
| `gold-gradient` / `gold-text-gradient` / `gold-border` (clases CSS) | `brand-gradient` / `brand-text-gradient` / `brand-border` |
| `text-gold-primary` / `text-gold-light` | `text-brand-primary` / `text-brand-secondary` |

---

## Verificación Final

1. Grep de residuos: `medisxime|medisxime|pole dance|pole|instructora|instructoras|disciplinas|Diana|gold-` en los 8 componentes + `App.tsx` → sin resultados.
2. Grep de colores antiguos: todos los valores de la columna izquierda de la tabla de equivalencias → sin resultados.
3. Verificación visual en `pnpm dev` (desktop y mobile <900px/<768px) de las 8 secciones.
4. `pnpm build` sin errores de TypeScript.

---

## Cambios en Documentación del Proyecto

- **`CLAUDE.md`** — sección "Reglas globales → Colores": reemplazar la regla blanco/azul por la paleta café/crema/terracota de este spec (ver tabla "Sistema de Diseño").
- **`docs/superpowers/specs/2026-06-10-landing-rebranding-medica-design.md`** y **`docs/superpowers/plans/2026-06-10-landing-rebranding-medica.md`**: marcar con nota de "Superado por" al inicio, apuntando a este documento. No se borran (quedan como historial).

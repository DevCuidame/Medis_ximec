# Diseño — Calendario de agendamiento para Ximena (Dirección A)

## Contexto y objetivo

Este es el segundo de tres proyectos para conectar `medisXime` con CuidameDoc,
replicando lo que ya existe para Diana (`diana/medis`) — ver
`CuidameDoc/INTEGRACION-APPS-EXTERNAS.md` para el mapa completo de las 3
direcciones de integración, y
`CuidameDoc/cuidame_doc_backend/docs/superpowers/specs/2026-07-21-integraciones-multi-doctora-design.md`
para el prerequisito multi-tenant ya construido (`professional_integrations`).

**Objetivo de este proyecto**: construir el componente de agendamiento en
`medisxime-landing` que le permite a un paciente reservar una cita con la
Dra. Ximena Correa directamente, llamando a la API pública de CuidameDoc.

**No incluye** (proyectos separados, futuros): Dirección B (Sedes/Espacios/
Profesionales de Ximena, para el modal "Nuevo Servicio" de CuidameDoc) ni
Dirección C (Inventario con precio + cotizaciones externas). Tampoco incluye
configurar el horario/servicios reales de Ximena en CuidameDoc — sin eso el
calendario no mostrará cupos disponibles, pero eso se hace por fuera de este
proyecto, directamente en el panel de CuidameDoc.

## Estado verificado antes de diseñar

- Ximena ya existe en CuidameDoc: `professional_id = 2`
  (`ximenadoc@gmail.com`, usuario id 3).
- Hoy no tiene horario (`schedules`) ni servicios (`professional_services`)
  configurados — confirmado por consulta directa a la base de datos de
  producción. El paso 0 (selección de servicio) del flujo se salta
  automáticamente si no hay servicios, igual que ya pasa hoy con Diana
  cuando no tiene servicios configurados.
- `medisxime-landing/src/App.tsx` ya tiene una ruta `/agenda` con una página
  placeholder ("Agenda Disponible — Próximamente...") enlazada desde
  `Hero.tsx`, `FinalCTA.tsx` y `Navbar.tsx` (desktop y mobile) — es el punto
  de montaje ya preparado, no hay que crear el enlace.
- Paleta y tipografía de Ximena ya documentadas en
  `docs/convenciones.md`: café/crema/terracota
  (`#5C3A28`/`#9C4A2E`/`#D4B896`/`#FFFBF5`/`#3D2B1F`/`#7A6452`/`#E6D9C7`),
  Cormorant Garamond (titulares) + Inter (cuerpo).

## Alcance

**Incluye:**
1. Nuevo componente `medisxime-landing/src/components/XimenaBookingCalendar.tsx`,
   puerto completo de `diana/medis/medisdiana-landing/src/components/DianaBookingCalendar.tsx`
   (964 líneas) con:
   - Mismo flujo de pasos: `service → calendar → slots → form → success`.
   - Mismos endpoints públicos de CuidameDoc (`DOC_API` sin cambios):
     `GET /booking/professionals/:id/services`,
     `GET /booking/professionals/:id/slots/:date`,
     `POST /booking/request`, `POST /booking/register-and-book`.
   - Constante `DIANA_PROFESSIONAL_ID = 12` → `XIMENA_PROFESSIONAL_ID = 2`.
2. Re-vestido completo a la paleta de Ximena — no solo el objeto `C` de
   colores del original (líneas 70-83), sino también los valores hex sueltos
   fuera de `C` que aparecen repetidos en estilos inline a lo largo del
   archivo (grises de texto, bordes). Mapeo:
   - `primary` (`#1D4ED8`) → `#5C3A28`
   - `primaryLight` (`#2563EB`) → `#9C4A2E`
   - `primaryMuted` (`#EFF6FF`) → `#F5EDE1`
   - `accent` (`#0EA5E9`) → `#D4B896`
   - `text` (`#0F172A`) → `#3D2B1F`
   - `textMuted` (`#475569`) → `#7A6452`
   - `textFaint` (`#94A3B8`) → `#B0A08C`
   - `border` (`#E2E8F0`) → `#E6D9C7`
   - `bg` (`#F5F7FA`) → `#FFFBF5`
   - `white`, `success`, `successBg`, `danger` quedan sin cambio (blanco y
     semáforo verde/rojo no son colores de marca).
   - Encabezados relevantes (nombre de la doctora, títulos de paso) usan
     `font-family: 'Cormorant Garamond', serif`; el resto sigue con Inter
     (fuente por defecto del sitio).
3. Copy actualizado: las ~5 menciones de "Dra. Diana Cristina Medina
   Camargo" pasan a "Dra. Ximena Correa" (forma ya usada en `Hero.tsx` del
   propio sitio de Ximena).
4. **Corrección deliberada, no parte de la réplica literal**: el original
   tiene `if (date.getDay() === 0) continue` al precargar disponibilidad del
   mes — una optimización porque Diana no atiende domingos, codificada como
   si fuera una regla de negocio. No se replica: no sabemos si Ximena
   atiende domingos, y el motor real de `/slots/:date` ya respeta el
   horario configurado sin necesidad de esta suposición. Se elimina ese
   `continue` condicional; se consulta disponibilidad todos los días como
   cualquier otro.
5. Reemplazar el placeholder `AgendaPage` en `App.tsx` por
   `<XimenaBookingCalendar onBackToHome={() => navigate('/')} />`, dentro de
   la ruta `/agenda` ya existente. `onBackToHome` es la única prop del
   componente (mismo contrato que el original).

**No incluye:**
- Ningún cambio en `CuidameDoc` (ya es 100% genérico para esta dirección).
- SEO/JSON-LD (Diana's `BookingPage` los usa vía componentes `Seo`/
  `MedicalClinicJsonLd` que no existen todavía en `medisxime-landing` — fuera
  de alcance, no se agregan aquí).
- Configurar horario/servicios reales de Ximena.
- Direcciones B y C (proyectos separados).

## Testing

Sin backend de por medio de este lado (llama directo a CuidameDoc), y sin
infraestructura de tests en `medisxime-landing` para este tipo de componente
visual/flujo — verificación por `tsc`/`build` limpio, igual que el resto de
este proyecto. Verificación manual en vivo (una vez Ximena tenga horario
configurado) queda como paso posterior, fuera de este proyecto.

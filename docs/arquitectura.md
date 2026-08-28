# Arquitectura — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

---

## Arquitectura del Monorepo

```
medisXime/
├── apps/
│   ├── backend/          ← API Express + TypeScript + PostgreSQL (puerto 3009)
│   └── frontend/         ← Angular stub (create-offer, incompleto — no usar)
├── medisxime-landing/    ← Frontend principal React 19 + Vite + Tailwind CSS v4
├── packages/
│   ├── shared-types/     ← Interfaces TypeScript compartidas (compiladas)
│   ├── ui-components/    ← Componentes React reutilizables (stub)
│   ├── config/           ← Configuración compartida ESLint/TS
│   └── database/         ← Migration runner (packages/database/src/migrations/runner.ts)
├── docs/                 ← Documentación y specs de diseño
├── docker/               ← nginx config + entrypoint para despliegue
└── CLAUDE.md
```

**Gestión de monorepo**: pnpm workspaces + Turborepo. Ver comandos en [flujo-de-trabajo.md](flujo-de-trabajo.md).

> Componentes marcados como stub/incompletos no deben usarse — ver detalle en [errores-conocidos.md](errores-conocidos.md).

---

## Stack Tecnológico

### Backend (`apps/backend/`)
| Capa        | Tecnología                          |
|-------------|-------------------------------------|
| Runtime     | Node.js + TypeScript (tsx watch)    |
| Framework   | Express 4                           |
| Base datos  | PostgreSQL (pg Pool)                |
| Auth        | JWT (jsonwebtoken) + PBKDF2 nativo  |
| Email       | Nodemailer                          |
| Puerto dev  | **3009** (proxy Vite → 3009)        |

Arquitectura interna: `Routes → Controllers → Services → Repositories → DB`

### Frontend (`medisxime-landing/`)
| Capa          | Tecnología                            |
|---------------|---------------------------------------|
| Framework     | React 19 + Vite 8                     |
| Estilos       | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animaciones   | Framer Motion 12                      |
| Routing       | React Router DOM v7                   |
| Formularios   | React Hook Form + Zod                 |
| Íconos        | Lucide React                          |
| Tipografías   | Cormorant Garamond + Inter (Google Fonts) |

> Las decisiones detrás de la elección de JWT + PBKDF2 y el modelo de roles están en [decisiones.md](decisiones.md).

---

## API REST (backend)

Prefijo base: `/api`

| Módulo             | Prefijo                  | Descripción                                    |
|--------------------|--------------------------|------------------------------------------------|
| Salud              | `GET /`                  | Health check                                   |
| Auth               | `/auth`                  | Register, login, refresh, logout, me           |
| Usuarios           | `/users`                 | CRUD usuarios                                  |
| Profesionales      | `/professionals`         | CRUD, stats, availability, schedule            |
| Clases/Calendario  | `/classes`               | Gestión de clases/citas agendadas              |
| Servicios          | `/services`, `/locations`, `/rooms` | Ofertas, bookings, sedes, consultorios, horarios |
| Membresías         | `/memberships`           | Planes de membresía (CRUD)                     |
| Membresías usuario | `/user-memberships`      | Membresías activas de pacientes                |
| Beneficios         | `/benefits`              | Catálogo de beneficios                         |

Endpoints clave de servicios:
- `GET /api/services/offers` — listado público de ofertas
- `POST /api/services/offers` — crear oferta (ADMIN)
- `POST /api/services/requests` — paciente agenda una cita
- `GET /api/services/my-requests` — citas del paciente autenticado
- `GET /api/services/my-sessions` — calendario del profesional
- `GET /api/locations` — sedes activas
- `GET /api/professionals/:id/availability` — verificar disponibilidad

Formato de respuestas: ver [convenciones.md](convenciones.md#respuestas-de-api).

---

## Base de datos (apps/backend/migrations/)

Ejecutar en orden. Comando: `pnpm -F @medisxime/backend migrate` (detalle en [flujo-de-trabajo.md](flujo-de-trabajo.md)).

| Migración                          | Contenido                                          |
|------------------------------------|----------------------------------------------------|
| `001_create_users.sql`             | Tabla `users`, enum `user_role`, refresh_tokens    |
| `002_create_professionals.sql`     | `specialties`, `appointments`, `appointment_bookings`, `ratings`, vista `professional_rating_summary` |
| `003_create_locations_and_rooms.sql` | `locations`, `rooms`                             |
| `004_create_memberships.sql`       | Tabla `memberships`                                |
| `005_service_management.sql`       | `operating_hours`, `service_offers`, `booking_requests`, vista `v_service_offers` |
| `006_add_membership_benefits.sql`  | Beneficios de membresía                           |
| `007_user_memberships.sql`         | Membresías activas de pacientes                    |
| `008_payment_method.sql`           | Método de pago                                    |
| `009_benefits_catalog.sql`         | Catálogo de beneficios                            |
| `010_benefit_types.sql`            | Tipos de beneficios                               |
| `011_professional_type.sql`        | `professional_type` (dependiente/independiente), `professional_schedules` |
| `012_enrollment_groups.sql`        | Grupos de inscripción                             |
| `013_booking_payment_fields.sql`   | Campos de pago en reservas                        |
| `014_service_category.sql`         | Categoría de servicio                             |
| `015_operating_hours_blocks.sql`   | Bloques de horario de atención                    |
| `016_account_types_expansion.sql`  | Rol `EMPRESA`, campos de identidad y perfil por rol |
| `017_professional_fields.sql`      | Segundo nombre/apellido, dirección, credenciales SISPRO cifradas |
| `018_location_provider_code.sql`   | `provider_code` (código REPS) en `locations`       |

**Tablas principales**: `users`, `specialties`, `appointments`, `appointment_bookings`, `ratings`, `locations`, `rooms`, `memberships`, `service_offers`, `booking_requests`, `professional_schedules`, `operating_hours`

**Seed de especialidades** (migración 002): Medicina General, Pediatría, Ginecología, Nutrición y Dietética, Psicología, Fisioterapia.

---

## Mapa de archivos del Frontend

### App core
- [medisxime-landing/src/App.tsx](../medisxime-landing/src/App.tsx) — Router principal, rutas protegidas, banner de sesión expirada
- [medisxime-landing/src/main.tsx](../medisxime-landing/src/main.tsx) — Entry point, interceptor global fetch para 401
- [medisxime-landing/src/index.css](../medisxime-landing/src/index.css) — Tokens CSS `@theme`, clases utilitarias, tipografías
- [medisxime-landing/vite.config.ts](../medisxime-landing/vite.config.ts) — Proxy `/api` → `http://127.0.0.1:3009`

### Landing pública (`/`)
| Archivo | Sección en página | Estado |
|---------|-------------------|--------|
| [Hero.tsx](../medisxime-landing/src/components/Hero.tsx) | Hero con video de fondo, CTAs | ✅ Migrado |
| [About.tsx](../medisxime-landing/src/components/About.tsx) | "Medicina con Calidez Humana", 4 pilares, stats | ✅ Migrado |
| [Classes.tsx](../medisxime-landing/src/components/Classes.tsx) | Catálogo de 6 servicios médicos (empresas + pacientes) | ✅ Migrado |
| [Instructors.tsx](../medisxime-landing/src/components/Instructors.tsx) | Perfil "Sobre la Doctora" (Dra. Ximena Correa) | ✅ Migrado |
| [Testimonials.tsx](../medisxime-landing/src/components/Testimonials.tsx) | 5 testimonios de pacientes y empresas | ✅ Migrado |
| [FinalCTA.tsx](../medisxime-landing/src/components/FinalCTA.tsx) | CTA oscuro de cierre, agendar cita | ✅ Migrado |
| [Navbar.tsx](../medisxime-landing/src/components/Navbar.tsx) | Navbar glass flotante, hamburguesa mobile | ✅ Migrado |
| [Footer.tsx](../medisxime-landing/src/components/Footer.tsx) | Footer oscuro (#3D2418), contacto real, servicios | ✅ Migrado |

### Autenticación (`/login`)
- [ArtistLogin.tsx](../medisxime-landing/src/components/ArtistLogin.tsx) — Formulario de login, llama `POST /api/auth/login`, redirige según rol. Para rol `PROFESSIONAL` hace además un handoff SSO a CuidameDoc (`doc.cuidame.tech`) — ver [decisiones.md](decisiones.md#sso-handoff-a-cuidamedoc-para-profesionales-medisxime-landingsrccomponentsartistlogintsx).

### Componentes compartidos
- [ProtectedRoute.tsx](../medisxime-landing/src/components/ProtectedRoute.tsx) — Guarda de rutas por rol (decodifica JWT del localStorage)

### Panel Admin (`/admin/*`)
| Archivo | Ruta | Descripción |
|---------|------|-------------|
| [MainDashboard.tsx](../medisxime-landing/src/components/admin/MainDashboard.tsx) | `/admin/dashboard` | KPIs del día, servicios de hoy, ocupación |
| [UsuariosDashboard.tsx](../medisxime-landing/src/components/admin/UsuariosDashboard.tsx) | `/admin/users` | Gestión de usuarios, filtros por rol/estado, creación |
| [UsuarioCard.tsx](../medisxime-landing/src/components/admin/UsuarioCard.tsx) | — | Tarjeta de usuario con avatar, rol y acciones |
| [AdminClasses.tsx](../medisxime-landing/src/components/admin/AdminClasses.tsx) | `/admin/classes` | Calendario semanal de servicios/consultas |
| [AdminProfessionals.tsx](../medisxime-landing/src/components/admin/AdminProfessionals.tsx) | — | Vista alternativa de profesionales |
| [ServiciosDashboard.tsx](../medisxime-landing/src/components/admin/ServiciosDashboard.tsx) | — | Listado y gestión de ofertas de servicio |
| [CreateService.tsx](../medisxime-landing/src/components/admin/CreateService.tsx) | `/admin/services/create` | Wizard de creación de servicio/oferta |
| [CreateClassModal.tsx](../medisxime-landing/src/components/admin/CreateClassModal.tsx) | — | Modal para crear clase/cita |
| [SedesDashboard.tsx](../medisxime-landing/src/components/admin/SedesDashboard.tsx) | `/admin/services/locations` | CRUD de sedes |
| [SedeCard.tsx](../medisxime-landing/src/components/admin/SedeCard.tsx) | — | Tarjeta de sede |
| [EspaciosDashboard.tsx](../medisxime-landing/src/components/admin/EspaciosDashboard.tsx) | `/admin/services/rooms` | CRUD de consultorios/salas |
| [FinanzasDashboard.tsx](../medisxime-landing/src/components/admin/FinanzasDashboard.tsx) | `/admin/finances` | Ingresos, pagos pendientes, historial |
| [MembresiasDashboard.tsx](../medisxime-landing/src/components/admin/MembresiasDashboard.tsx) | `/admin/memberships` | CRUD de planes de membresía |
| [BeneficiosDashboard.tsx](../medisxime-landing/src/components/admin/BeneficiosDashboard.tsx) | `/admin/benefits` | Catálogo de beneficios |
| [InscripcionesDashboard.tsx](../medisxime-landing/src/components/admin/InscripcionesDashboard.tsx) | `/admin/inscripciones` | Solicitudes de reserva, aprobación/rechazo |
| [CreateProfessionalModal.tsx](../medisxime-landing/src/components/admin/CreateProfessionalModal.tsx) | — | Wizard 4-pasos para crear usuario/profesional/empresa |
| [ProfessionalProfileModal.tsx](../medisxime-landing/src/components/admin/ProfessionalProfileModal.tsx) | — | Modal de perfil completo de profesional |
| [ConfirmationModal.tsx](../medisxime-landing/src/components/admin/ConfirmationModal.tsx) | — | Modal genérico de confirmación |
| [FormularioEspacio.tsx](../medisxime-landing/src/components/admin/FormularioEspacio.tsx) | — | Formulario React Hook Form para espacios |
| [FormularioSede.tsx](../medisxime-landing/src/components/admin/FormularioSede.tsx) | — | Formulario React Hook Form para sedes |
| [FormularioServicio.tsx](../medisxime-landing/src/components/admin/FormularioServicio.tsx) | — | Formulario de servicio con recurrencia |
| [StickmanForm.tsx](../medisxime-landing/src/components/admin/StickmanForm.tsx) | — | Animación decorativa (figura médica) en formularios |

#### Animaciones SVG admin
- [DoctorCalendarAnim.tsx](../medisxime-landing/src/components/admin/DoctorCalendarAnim.tsx) — Ilustración animada en AdminClasses
- [DoctorFinanceAnim.tsx](../medisxime-landing/src/components/admin/DoctorFinanceAnim.tsx) — Ilustración animada en FinanzasDashboard
- [DoctorSedesAnim.tsx](../medisxime-landing/src/components/admin/DoctorSedesAnim.tsx) — Ilustración animada en ServiciosDashboard

#### Tipos y esquemas admin
- [types.ts](../medisxime-landing/src/components/admin/types.ts) — Interface `User` del panel admin
- [EspacioTypes.ts](../medisxime-landing/src/components/admin/EspacioTypes.ts)
- [SedeTypes.ts](../medisxime-landing/src/components/admin/SedeTypes.ts)
- [servicioSchema.ts](../medisxime-landing/src/components/admin/servicioSchema.ts) — Schema Zod + helpers de recurrencia (`generateOccurrences`, `DIA_NOMBRES`)

### Portal Paciente (`/user/*`)
| Archivo | Ruta | Descripción |
|---------|------|-------------|
| [UserLayout.tsx](../medisxime-landing/src/components/user/UserLayout.tsx) | `/user/*` | Shell con sidebar, nav y rutas anidadas |
| [UserCalendario.tsx](../medisxime-landing/src/components/user/UserCalendario.tsx) | `/user/calendario` | Calendario de citas del paciente |
| [UserServicios.tsx](../medisxime-landing/src/components/user/UserServicios.tsx) | `/user/servicios` | Catálogo de servicios disponibles |
| [UserMisServicios.tsx](../medisxime-landing/src/components/user/UserMisServicios.tsx) | `/user/mis-servicios` | Citas activas del paciente |
| [UserMembresias.tsx](../medisxime-landing/src/components/user/UserMembresias.tsx) | `/user/membresias` | Planes de salud disponibles |
| [UserProfesionales.tsx](../medisxime-landing/src/components/user/UserProfesionales.tsx) | `/user/profesionales` | Directorio del equipo médico |

> Componentes alternativos/legacy del portal paciente (`UserDashboard.tsx`, `UserMemberships.tsx`, `UserClasses.tsx`) están documentados en [errores-conocidos.md](errores-conocidos.md).

#### Animaciones SVG usuario
- [DoctorPatientAnim.tsx](../medisxime-landing/src/components/user/DoctorPatientAnim.tsx)
- [DoctorPlansAnim.tsx](../medisxime-landing/src/components/user/DoctorPlansAnim.tsx)
- [DoctorServicesAnim.tsx](../medisxime-landing/src/components/user/DoctorServicesAnim.tsx)

### Portal Profesional/Médico (`/professional/*`)
| Archivo | Ruta | Descripción |
|---------|------|-------------|
| [ProfessionalDashboard.tsx](../medisxime-landing/src/components/professional/ProfessionalDashboard.tsx) | `/professional/*` | Shell con sidebar y rutas anidadas, carga perfil desde API |
| [ProfessionalClasses.tsx](../medisxime-landing/src/components/professional/ProfessionalClasses.tsx) | `/professional/classes` | "Mis Consultas" — agenda del médico |
| [ProfessionalProfile.tsx](../medisxime-landing/src/components/professional/ProfessionalProfile.tsx) | `/professional/profile` | Perfil editable del médico |
| [DoctorGreetingAnim.tsx](../medisxime-landing/src/components/professional/DoctorGreetingAnim.tsx) | — | Animación de bienvenida en portal médico |

### Schemas lib
- [medisxime-landing/src/lib/schemas/espacioSchema.ts](../medisxime-landing/src/lib/schemas/espacioSchema.ts)
- [medisxime-landing/src/lib/schemas/sedeSchema.ts](../medisxime-landing/src/lib/schemas/sedeSchema.ts)

---

## Mapa de archivos del Backend

### Entrada y configuración
- [apps/backend/src/index.ts](../apps/backend/src/index.ts) — Conecta DB y arranca servidor
- [apps/backend/src/server.ts](../apps/backend/src/server.ts) — Crea app Express con CORS y middleware
- [apps/backend/src/config/database.ts](../apps/backend/src/config/database.ts) — Pool PostgreSQL
- [apps/backend/src/config/env.ts](../apps/backend/src/config/env.ts) — Variables de entorno tipadas

### Rutas (`src/routes/`)
- `index.ts`, `auth.routes.ts`, `users.routes.ts`, `professional.routes.ts`
- `classes.routes.ts`, `services.routes.ts`, `memberships.routes.ts`
- `user-memberships.routes.ts`, `benefits.routes.ts`, `health.routes.ts`

### Controladores (`src/controllers/`)
- `auth.controller.ts`, `users.controller.ts`, `professional.controller.ts`
- `classes.controller.ts`, `services.controller.ts`, `memberships.controller.ts`
- `user-memberships.controller.ts`, `benefits.controller.ts`, `location.controller.ts`

### Servicios (`src/services/`)
- `auth.service.ts` — Hash PBKDF2, firma JWT, rotación de refresh tokens
- `professional.service.ts` — Lógica de profesionales, stats

### Repositorios (`src/repositories/`)
- `user.repository.ts`, `professional.repository.ts`, `professional-schedule.repository.ts`
- `class.repository.ts`, `services.repository.ts`, `membership.repository.ts`
- `user-membership.repository.ts`, `booking.repository.ts`, `benefit.repository.ts`, `location.repository.ts`

### Tipos (`src/types/`)
- `auth.types.ts` — `UserRole`, `UserRecord`, `UserPublic`, `RegisterDTO`, `LoginDTO`, `AuthTokens`, `JwtPayload`
- `professional.types.ts` — `ProfessionalRecord`, `ProfessionalPublic`, DTOs, `ProfessionalStats`
- `class.types.ts` — `ClassRecord`, `ClassPublic`
- `membership.types.ts` — `MembershipRecord`, `MembershipPublic`, `MembershipType`
- `booking.types.ts`, `user-membership.types.ts`, `user.types.ts`, `api.types.ts`

### Middleware (`src/middleware/`)
- `auth.middleware.ts` — `authenticate` (Bearer JWT) + `authorize(...roles)` (RBAC)
- `errorHandler.middleware.ts` — Manejador global de errores

### Utilidades (`src/utils/`)
- `crypto.util.ts`, `jwt.util.ts`, `email.util.ts`, `logger.util.ts`, `errors.util.ts`

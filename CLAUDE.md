# CLAUDE.md — Proyecto "MedisXime" (Clínica General)

Este proyecto es una copia de la plataforma **Medis** y se adapta para convertirse en
un sistema de gestión para una **clínica médica de medicina general** (agendamiento de
citas, pacientes, médicos, planes/membresías, finanzas, etc.).

## Reglas globales (aplican a TODA la migración de pantallas)

- **Temática**: médica (clínica general). Todo el contenido, textos de ejemplo, datos
  semilla (seed) e imágenes deben reflejar un entorno de salud — consultas, médicos,
  pacientes, especialidades, exámenes, tratamientos — sin rastros de pole dance, danza
  o estudios de baile.
- **Colores**: paleta café/crema/terracota basada en la identidad de marca de la
  Dra. Ximena Correa. La paleta debe transmitir calidez profesional. Usar tonos
  crema/blanco cálido (`#FFFBF5`, `#F5EDE1`) como fondos principales, café oscuro
  (`#5C3A28`) como color de marca/encabezados, terracota (`#9C4A2E`) como acento, y
  café muy oscuro (`#3D2418`) para secciones oscuras (footer, CTAs finales). Ver
  `docs/superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md` para la
  tabla completa de tokens.
- **Textos**: formales y orientados a salud/pacientes. Lenguaje claro, respetuoso y
  profesional, dirigido a pacientes y personal médico.

## Mapeo conceptual de entidades

| Concepto original            | Concepto médico                    |
|------------------------------|------------------------------------|
| Instructores / Profesionales | Médicos / Profesionales de salud   |
| Clases / Sesiones            | Consultas / Citas                  |
| Disciplinas                  | Especialidades                     |
| Alumnos / Clientes           | Pacientes                          |
| Sedes / Salones              | Sedes / Consultorios               |
| Membresías / Planes          | Planes / Membresías de paciente    |
| Inscripción                  | Afiliación / Inscripción           |
| Reserva de clase             | Agendamiento de cita               |

## Pantallas detectadas a migrar

### App core
- acaripole-landing/src/App.tsx
- acaripole-landing/src/main.tsx

### Landing pública (`/`)
- acaripole-landing/src/components/Hero.tsx
- acaripole-landing/src/components/About.tsx
- acaripole-landing/src/components/Classes.tsx
- acaripole-landing/src/components/Instructors.tsx
- acaripole-landing/src/components/Testimonials.tsx
- acaripole-landing/src/components/FinalCTA.tsx
- acaripole-landing/src/components/Navbar.tsx
- acaripole-landing/src/components/Footer.tsx

### Autenticación (`/login`)
- acaripole-landing/src/components/ArtistLogin.tsx

### Componentes compartidos
- acaripole-landing/src/components/ProtectedRoute.tsx

### Panel Admin (`/admin/*`)
- acaripole-landing/src/components/admin/MainDashboard.tsx
- acaripole-landing/src/components/admin/UsuariosDashboard.tsx
- acaripole-landing/src/components/admin/UsuarioCard.tsx
- acaripole-landing/src/components/admin/AdminClasses.tsx
- acaripole-landing/src/components/admin/AdminProfessionals.tsx
- acaripole-landing/src/components/admin/ServiciosDashboard.tsx
- acaripole-landing/src/components/admin/CreateService.tsx
- acaripole-landing/src/components/admin/CreateClassModal.tsx
- acaripole-landing/src/components/admin/SedesDashboard.tsx
- acaripole-landing/src/components/admin/SedeCard.tsx
- acaripole-landing/src/components/admin/CreateLocation.tsx
- acaripole-landing/src/components/admin/EspaciosDashboard.tsx
- acaripole-landing/src/components/admin/CreateRoom.tsx
- acaripole-landing/src/components/admin/FinanzasDashboard.tsx
- acaripole-landing/src/components/admin/MembresiasDashboard.tsx
- acaripole-landing/src/components/admin/BeneficiosDashboard.tsx
- acaripole-landing/src/components/admin/InscripcionesDashboard.tsx
- acaripole-landing/src/components/admin/CreateProfessionalModal.tsx
- acaripole-landing/src/components/admin/ProfessionalProfileModal.tsx
- acaripole-landing/src/components/admin/ConfirmationModal.tsx
- acaripole-landing/src/components/admin/FormularioEspacio.tsx
- acaripole-landing/src/components/admin/FormularioSede.tsx
- acaripole-landing/src/components/admin/FormularioServicio.tsx

### Tipos y esquemas admin
- acaripole-landing/src/components/admin/types.ts
- acaripole-landing/src/components/admin/EspacioTypes.ts
- acaripole-landing/src/components/admin/SedeTypes.ts
- acaripole-landing/src/components/admin/servicioSchema.ts

### Portal Paciente (`/user/*`)
- acaripole-landing/src/components/user/UserLayout.tsx
- acaripole-landing/src/components/user/UserCalendario.tsx
- acaripole-landing/src/components/user/UserServicios.tsx
- acaripole-landing/src/components/user/UserMisServicios.tsx
- acaripole-landing/src/components/user/UserMembresias.tsx
- acaripole-landing/src/components/user/UserProfesionales.tsx
- acaripole-landing/src/components/user/UserDashboard.tsx
- acaripole-landing/src/components/user/UserMemberships.tsx
- acaripole-landing/src/components/user/UserClasses.tsx

### Schemas lib
- acaripole-landing/src/lib/schemas/espacioSchema.ts
- acaripole-landing/src/lib/schemas/sedeSchema.ts

### Portal Profesional/Médico (`/professional/*`)
- acaripole-landing/src/components/professional/ProfessionalDashboard.tsx
- acaripole-landing/src/components/professional/ProfessionalClasses.tsx
- acaripole-landing/src/components/professional/ProfessionalProfile.tsx

## Base de datos (apps/backend/migrations/)

- 001_create_users.sql — Usuarios y autenticación
- 002_create_professionals.sql — Especialidades, Citas, Reservas, Calificaciones
- 003_create_locations_and_rooms.sql — Sedes y Consultorios
- 004_create_memberships.sql — Planes de membresía
- 005_service_management.sql — Gestión de servicios, horarios, jornadas
- 006_add_membership_benefits.sql — Beneficios de membresía
- 007_user_memberships.sql — Membresías de pacientes
- 008_payment_method.sql — Método de pago
- 009_benefits_catalog.sql — Catálogo de beneficios
- 010_benefit_types.sql — Tipos de beneficios
- 011_professional_type.sql — Tipo de profesional y horarios
- 012_enrollment_groups.sql — Grupos de inscripción
- 013_booking_payment_fields.sql — Campos de pago en reservas
- 014_service_category.sql — Categoría de servicio
- 015_operating_hours_blocks.sql — Bloques de horario de atención

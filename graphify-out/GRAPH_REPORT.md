# Graph Report - .  (2026-07-16)

## Corpus Check
- 238 files · ~255,172 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1309 nodes · 1859 edges · 117 communities (79 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 50,000 input · 7,400 output

## Community Hubs (Navigation)
- Backend API y Autenticación
- Base de Datos y Seeds
- Animaciones SVG Médicas
- Tipos Compartidos y Angular Legado
- Config TS Backend
- Dependencias Backend
- Dashboard de Descuentos
- Gestión de Espacios y Sedes
- Env y Tests de Pricing
- Documentación y Planes de Diseño
- API de Profesionales
- API de Servicios y Reservas
- Portal del Profesional
- Dependencias UI Components
- Backend Módulo Descuentos
- API Membresías de Usuario
- App Router Landing
- Config TS Landing App
- Package Raíz Monorepo
- Configuración Turborepo
- Config TS UI Components
- Dependencias Landing
- Config TS Landing Node
- DevDeps ESLint Landing
- Calendario Admin de Clases
- Tipos de Servicios Compartidos
- Componente Angular Crear Oferta
- Portal Paciente Servicios
- Config TS Shared Types
- API de Sedes
- Sidebar Admin Compartido
- Dashboard de Usuarios Admin
- Dependencias Paquete Database
- Config TS Raíz
- Dashboard de Membresías
- Paquete Shared Types
- Modal Crear Profesional
- Modal Perfil Profesional
- Membresías del Paciente
- Scripts Landing
- Dashboard de Finanzas
- Dashboard de Inscripciones
- Migración Profesionales y Citas
- Migración Gestión de Servicios
- Vista Admin Profesionales
- Modal Crear Clase
- Tarjeta de Usuario
- Tipos API Backend
- Tests de Descuentos
- Docs Genéricas de Arquitectura
- Pantalla de Login
- Sección Hero Landing
- Tipos Request TS
- Tipos Request Declaraciones
- Migración Usuarios
- Migración Sedes y Salas
- Planes y Specs SEO
- Sección About Landing
- Sección Servicios Landing
- Clases Paciente Legacy
- Dashboard Paciente Legacy
- Paquete Config
- Init SQL Database
- Tipos Response
- Enums Compartidos Declaraciones
- Enums Compartidos TS
- Tipos Auth TS
- Tipos Auth Declaraciones
- Migración Membresías
- Migración Membresías Usuario
- Migración Tipo Profesional
- Migración Descuentos
- Tests de Sedes
- Fotos Legado Pole Dance
- Sección Sobre la Doctora
- Componente SEO
- Config TS Landing Raíz
- Migración Beneficios Planes
- Migración Método de Pago
- Migración Catálogo Beneficios
- Migración Tipos de Beneficio
- Migración Grupos Inscripción
- Migración Campos de Pago
- Migración Categoría Servicio
- Migración Bloques Horario
- Migración Tipos de Cuenta
- Migración Campos Profesional
- Migración Código Prestador
- Rutas React Services
- Tests Servicio Profesional
- Entrypoint Docker Frontend
- Plan y Spec AdminSidebar
- Dep ESLint React Refresh
- Dep Tailwind Vite
- Dep Types Node
- Dep Types React DOM
- Dep TypeScript
- Guía de Contribución
- Guía de Setup
- Sprite de Iconos
- Gráfico Hero Abstracto

## God Nodes (most connected - your core abstractions)
1. `pool` - 21 edges
2. `compilerOptions` - 21 edges
3. `ServicesManagementService` - 17 edges
4. `compilerOptions` - 17 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 14 edges
7. `CreateOfferComponent` - 13 edges
8. `AdminClasses()` - 12 edges
9. `AdminSidebar()` - 12 edges
10. `compilerOptions` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Esquema de base de datos (plantilla genérica desactualizada)` --semantically_similar_to--> `Migraciones SQL 001–019 (apps/backend/migrations)`  [INFERRED] [semantically similar]
  docs/DATABASE.md → CLAUDE.md
- `Paquete database (runner de migraciones)` --semantically_similar_to--> `Migraciones SQL 001–019 (apps/backend/migrations)`  [INFERRED] [semantically similar]
  packages/database/README.md → CLAUDE.md
- `Documentación API (plantilla genérica desactualizada)` --semantically_similar_to--> `API REST /api (backend Express puerto 3009)`  [INFERRED] [semantically similar]
  docs/API.md → CLAUDE.md
- `README raíz 'Acaripole' (legado sin actualizar)` --semantically_similar_to--> `Quick Start medisxime (plantilla genérica)`  [INFERRED] [semantically similar]
  README.md → QUICKSTART.md
- `README plantilla Vite + React (sin personalizar)` --semantically_similar_to--> `README raíz 'Acaripole' (legado sin actualizar)`  [INFERRED] [semantically similar]
  medisxime-landing/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Planes de implementación Superpowers de MedisXime** — docs_superpowers_plans_2026_06_10_landing_rebranding_medica_plan_rebranding_diana_medina, docs_superpowers_plans_2026_06_11_landing_rebranding_ximena_plan_rebranding_ximena_correa, docs_superpowers_plans_2026_06_13_account_types_redesign_plan_tipos_de_cuenta, docs_superpowers_plans_2026_06_16_seo_component_plan_componente_seo, docs_superpowers_plans_2026_06_16_seo_injection_public_sections_plan_inyeccion_seo, docs_superpowers_plans_2026_07_15_admin_sidebar_infraestructura_plan_adminsidebar, docs_superpowers_plans_2026_07_15_descuentos_plan_modulo_descuentos, docs_superpowers_plans_2026_07_15_professional_account_creation_plan_creacion_cuentas, docs_superpowers_plans_2026_07_15_sede_codigo_prestador_plan_codigo_prestador [EXTRACTED 1.00]
- **Documentación de plantilla genérica desactualizada** — readme_acaripole, quickstart_guia_inicio_rapido, docs_api_documentacion_api_generica, docs_database_esquema_generico, docs_setup_guia_setup, docs_architecture_guia_arquitectura, docs_contributing_guia_contribucion [INFERRED 0.85]
- **Specs de diseño Superpowers de MedisXime** — docs_superpowers_specs_2026_06_10_landing_rebranding_medica_design_spec_rebranding_diana_medina, docs_superpowers_specs_2026_06_11_landing_rebranding_ximena_design_spec_rebranding_ximena_correa, docs_superpowers_specs_2026_06_13_account_types_redesign_design_spec_tipos_de_cuenta, docs_superpowers_specs_2026_06_16_seo_component_design_spec_componente_seo, docs_superpowers_specs_2026_06_16_seo_injection_public_sections_design_spec_inyeccion_seo, docs_superpowers_specs_2026_07_15_admin_sidebar_infraestructura_design_spec_adminsidebar, docs_superpowers_specs_2026_07_15_descuentos_design_spec_modulo_descuentos, docs_superpowers_specs_2026_07_15_professional_account_creation_design_spec_creacion_cuentas, docs_superpowers_specs_2026_07_15_sede_codigo_prestador_design_spec_codigo_prestador [EXTRACTED 1.00]
- **Activos legado de la plataforma original de pole dance** — medisxime_landing_public_pole_studio_1_interior_aurora_studios, medisxime_landing_public_pole_studio_2_interior_aura_studio, medisxime_landing_public_pole_studio_3_interior_estudio_minimalista, medisxime_landing_public_logo_medis_logo_dra_diana_medina [INFERRED 0.85]

## Communities (117 total, 38 thin omitted)

### Community 0 - "Backend API y Autenticación"
Cohesion: 0.07
Nodes (41): test(), login(), logout(), me(), refresh(), register(), createMembership(), deleteMembership() (+33 more)

### Community 1 - "Base de Datos y Seeds"
Cohesion: 0.07
Nodes (33): hashPassword(), seedAdmin(), connectDatabase(), disconnectDatabase(), pool, createBooking(), createClass(), getClassOptions() (+25 more)

### Community 2 - "Animaciones SVG Médicas"
Cohesion: 0.06
Nodes (43): DoctorGreetingAnim(), DoctorPatientAnim(), DoctorPlansAnim(), addDays(), authH(), C, DAY_SHORT, fmtTime() (+35 more)

### Community 3 - "Tipos Compartidos y Angular Legado"
Cohesion: 0.08
Nodes (26): DisciplineOption, LocationOption, ProfessionalOption, ApiResponse, ServicesManagementService, Injectable, ApiError, ApiResponse (+18 more)

### Community 4 - "Config TS Backend"
Cohesion: 0.04
Nodes (44): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, lib (+36 more)

### Community 5 - "Dependencias Backend"
Cohesion: 0.05
Nodes (43): dependencies, dotenv, express, jsonwebtoken, @medisxime/shared-types, nodemailer, pg, devDependencies (+35 more)

### Community 6 - "Dashboard de Descuentos"
Cohesion: 0.07
Nodes (36): authHeaders(), C, DescuentosDashboard(), DiscountPublic, fmtDate(), FormularioDescuentoProps, ModalState, vigenciaLabel() (+28 more)

### Community 7 - "Gestión de Espacios y Sedes"
Cohesion: 0.07
Nodes (31): DoctorSedesAnim(), C, EspaciosDashboard(), Espacio, EspacioResource, ModalEspacioState, C, FormularioEspacio() (+23 more)

### Community 8 - "Env y Tests de Pricing"
Cohesion: 0.09
Nodes (18): Env, requiredEnvVars, req(), main(), asyncHandler(), errorHandler(), createServer(), startServer() (+10 more)

### Community 9 - "Documentación y Planes de Diseño"
Cohesion: 0.06
Nodes (38): Formulario Angular de creación de oferta (legado pole dance), API REST /api (backend Express puerto 3009), Autenticación JWT + PBKDF2, Mapeo conceptual pole dance → médico, Migraciones SQL 001–019 (apps/backend/migrations), Paleta café/crema/terracota (tokens CSS), Plataforma MedisXime (Clínica Dra. Ximena Correa), Roles de usuario (USER/PROFESSIONAL/ADMIN/EMPRESA) (+30 more)

### Community 10 - "API de Profesionales"
Cohesion: 0.12
Nodes (27): checkAvailability(), createProfessional(), deleteProfessional(), getAdminDetails(), getProfessional(), getSchedule(), getStats(), listProfessionals() (+19 more)

### Community 11 - "API de Servicios y Reservas"
Cohesion: 0.17
Nodes (28): confirmServicePayment(), createBookingRequest(), createBulkBookingRequests(), createOffer(), createRoom(), deleteOffer(), deleteRoom(), deleteServicePayment() (+20 more)

### Community 12 - "Portal del Profesional"
Cohesion: 0.09
Nodes (26): addDays(), authH(), C, DAY_SHORT, fmtPrice(), fmtTime(), getMondayOf(), isSameDay() (+18 more)

### Community 13 - "Dependencias UI Components"
Cohesion: 0.08
Nodes (25): dependencies, react, react-dom, devDependencies, eslint, prettier, tailwindcss, @types/react (+17 more)

### Community 14 - "Backend Módulo Descuentos"
Cohesion: 0.17
Nodes (19): createDiscount(), deleteDiscount(), listDiscounts(), updateDiscount(), DiscountRepository, amounts(), err400(), Ineligibility (+11 more)

### Community 15 - "API Membresías de Usuario"
Cohesion: 0.17
Nodes (22): confirmPayment(), deletePlan(), getActiveMemberships(), getMyActiveMembership(), getMyMembershipHistory(), getPendingMemberships(), purchaseMembership(), rejectPlan() (+14 more)

### Community 16 - "App Router Landing"
Cohesion: 0.09
Nodes (8): EASE, SOCIAL, links, Navbar(), NavbarProps, Props, ProtectedRoute(), TESTIMONIALS

### Community 17 - "Config TS Landing App"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 18 - "Package Raíz Monorepo"
Cohesion: 0.09
Nodes (22): description, devDependencies, turbo, turbo, name, typescript, packageManager, pnpm (+14 more)

### Community 19 - "Configuración Turborepo"
Cohesion: 0.09
Nodes (22): ^build, **/.env, **/.env.*.local, .next/**, dependsOn, outputs, cache, persistent (+14 more)

### Community 20 - "Config TS UI Components"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module (+13 more)

### Community 21 - "Dependencias Landing"
Cohesion: 0.10
Nodes (21): framer-motion, @hookform/resolvers, lucide-react, dependencies, framer-motion, @hookform/resolvers, lucide-react, react (+13 more)

### Community 22 - "Config TS Landing Node"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 23 - "DevDeps ESLint Landing"
Cohesion: 0.11
Nodes (19): @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, globals (+11 more)

### Community 24 - "Calendario Admin de Clases"
Cohesion: 0.17
Nodes (17): addDays(), AdminClasses(), C, DAY_SHORT, fmtPrice(), fmtTime(), getMondayOf(), getMonthGrid() (+9 more)

### Community 25 - "Tipos de Servicios Compartidos"
Cohesion: 0.11
Nodes (18): BookingRequestPublic, BookingRequestStatus, CreateBookingRequestPayload, CreateRoomPayload, CreateServiceOfferPayload, DayOfWeek, LocationSummary, OfferStatus (+10 more)

### Community 26 - "Componente Angular Crear Oferta"
Cohesion: 0.14
Nodes (6): CreateOfferComponent, Component, processFile(), walkDir(), processFile(), walkDir()

### Community 27 - "Portal Paciente Servicios"
Cohesion: 0.16
Nodes (16): DoctorServicesAnim(), authH(), C, DAY_NAMES_SHORT, DAY_ORDER, fmtDateShort(), fmtPrice(), groupOffers() (+8 more)

### Community 28 - "Config TS Shared Types"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir (+9 more)

### Community 29 - "API de Sedes"
Cohesion: 0.19
Nodes (14): createLocation(), deleteLocation(), flattenOperatingHours(), getLocations(), IncomingDaySchedule, updateLocation(), DAYS, DaySchedule (+6 more)

### Community 30 - "Sidebar Admin Compartido"
Cohesion: 0.15
Nodes (14): AdminNavKey, AdminSidebar(), AdminSidebarProps, C, INFRA_SUBITEMS, NAV, NavEntry, C (+6 more)

### Community 31 - "Dashboard de Usuarios Admin"
Cohesion: 0.15
Nodes (10): ConfirmationModal(), ConfirmationModalProps, StickmanForm(), authHeaders(), C, FilterPillProps, RoleFilter, StatCardProps (+2 more)

### Community 32 - "Dependencias Paquete Database"
Cohesion: 0.12
Nodes (15): dependencies, pg, devDependencies, tsx, @types/node, typescript, pg, tsx (+7 more)

### Community 33 - "Config TS Raíz"
Cohesion: 0.12
Nodes (15): ./packages/*/src, compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib (+7 more)

### Community 34 - "Dashboard de Membresías"
Cohesion: 0.18
Nodes (13): authHeaders(), C, EMPTY_FORM, fmt(), formatPrice(), inputStyle(), Membership, MembershipType (+5 more)

### Community 35 - "Paquete Shared Types"
Cohesion: 0.13
Nodes (14): devDependencies, eslint, prettier, typescript, exports, eslint, prettier, typescript (+6 more)

### Community 36 - "Modal Crear Profesional"
Cohesion: 0.15
Nodes (13): d(), AccountRole, C, CreateProfessionalModal(), DIAS, DISCIPLINES, FormData, ID_TYPES (+5 more)

### Community 37 - "Modal Perfil Profesional"
Cohesion: 0.18
Nodes (10): authHeaders(), C, DIAS, DISCIPLINES, EditForm, ID_TYPES, Professional, ProfessionalProfileModal() (+2 more)

### Community 38 - "Membresías del Paciente"
Cohesion: 0.20
Nodes (11): ActiveMembership, authHeaders(), C, CONFIRM_STEPS, fmt(), navBtn, Plan, slideVariants (+3 more)

### Community 39 - "Scripts Landing"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 40 - "Dashboard de Finanzas"
Cohesion: 0.27
Nodes (8): DoctorFinanceAnim(), ActiveMembership, adminHeaders(), C, FinanzasDashboard(), fmt(), PendingMembership, PendingServicePayment

### Community 41 - "Dashboard de Inscripciones"
Cohesion: 0.29
Nodes (9): authH(), C, fmtDate(), fmtPrice(), fmtTime(), InscripcionesDashboard(), Request, Status (+1 more)

### Community 42 - "Migración Profesionales y Citas"
Cohesion: 0.54
Nodes (7): appointment_bookings, appointments, professional_rating_summary, ratings, specialties, sync_appointment_enrolled_count(), users

### Community 43 - "Migración Gestión de Servicios"
Cohesion: 0.43
Nodes (6): booking_requests, operating_hours, rooms, service_offers, sync_offer_enrolled_count(), v_service_offers

### Community 44 - "Vista Admin Profesionales"
Cohesion: 0.29
Nodes (5): AdminProfessionals(), authHeaders(), C, Stats, UserCard

### Community 45 - "Modal Crear Clase"
Cohesion: 0.25
Nodes (6): C, CreateClassModalProps, Discipline, Instructor, Salon, Sede

### Community 46 - "Tarjeta de Usuario"
Cohesion: 0.32
Nodes (5): User, ActionBtnProps, ROLE_CONFIG, UsuarioCard(), UsuarioCardProps

### Community 47 - "Tipos API Backend"
Cohesion: 0.29
Nodes (4): ApiResponse, CreateUserDTO, UpdateUserDTO, User

### Community 48 - "Tests de Descuentos"
Cohesion: 0.33
Nodes (5): ayer, base, candidates, hoy, manana

### Community 49 - "Docs Genéricas de Arquitectura"
Cohesion: 0.40
Nodes (5): Arquitectura limpia del backend (Controllers→Services→Repositories), Guía de arquitectura del monorepo, README plantilla Vite + React (sin personalizar), Quick Start medisxime (plantilla genérica), README raíz 'Acaripole' (legado sin actualizar)

### Community 51 - "Pantalla de Login"
Cohesion: 0.40
Nodes (3): ArtistLoginProps, C, EASE

### Community 53 - "Tipos Request TS"
Cohesion: 0.40
Nodes (4): CreateUserRequest, LoginRequest, RegisterRequest, UpdateUserRequest

### Community 54 - "Tipos Request Declaraciones"
Cohesion: 0.40
Nodes (4): CreateUserRequest, LoginRequest, RegisterRequest, UpdateUserRequest

### Community 56 - "Migración Sedes y Salas"
Cohesion: 0.67
Nodes (3): appointments, locations, rooms

### Community 57 - "Planes y Specs SEO"
Cohesion: 0.67
Nodes (4): Plan componente SEO + HelmetProvider, Plan inyección de SEO en secciones públicas, Spec componente SEO base + HelmetProvider, Spec inyección de SEO en secciones públicas

### Community 62 - "Paquete Config"
Cohesion: 0.50
Nodes (3): description, name, version

### Community 63 - "Init SQL Database"
Cohesion: 0.67
Nodes (3): update_users_updated_at(), users, users_updated_at_trigger

### Community 64 - "Tipos Response"
Cohesion: 0.50
Nodes (3): ApiError, ApiResponse, PaginatedResponse

### Community 65 - "Enums Compartidos Declaraciones"
Cohesion: 0.50
Nodes (3): HttpStatus, UserRole, UserStatus

### Community 66 - "Enums Compartidos TS"
Cohesion: 0.50
Nodes (3): HttpStatus, UserRole, UserStatus

### Community 67 - "Tipos Auth TS"
Cohesion: 0.67
Nodes (3): AuthResponse, AuthToken, User

### Community 68 - "Tipos Auth Declaraciones"
Cohesion: 0.67
Nodes (3): AuthResponse, AuthToken, User

### Community 74 - "Fotos Legado Pole Dance"
Cohesion: 0.67
Nodes (3): Foto interior 'Aurora Studios' (estudio de pole dance), Foto interior 'Aura Studio' (estudio de pole dance oscuro), Foto interior de estudio de pole dance minimalista

## Knowledge Gaps
- **516 isolated node(s):** `appointments`, `memberships`, `appointments`, `operating_hours`, `memberships` (+511 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pool` connect `Base de Datos y Seeds` to `Backend API y Autenticación`, `Tipos Compartidos y Angular Legado`, `API de Profesionales`, `API de Servicios y Reservas`, `Backend Módulo Descuentos`, `API Membresías de Usuario`, `API de Sedes`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CreateOfferComponent` connect `Componente Angular Crear Oferta` to `Tipos Compartidos y Angular Legado`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `CreateServiceOfferPayload` connect `Tipos Compartidos y Angular Legado` to `API de Servicios y Reservas`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `appointments`, `memberships`, `appointments` to the rest of the system?**
  _516 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API y Autenticación` be split into smaller, more focused modules?**
  _Cohesion score 0.06775956284153005 - nodes in this community are weakly interconnected._
- **Should `Base de Datos y Seeds` be split into smaller, more focused modules?**
  _Cohesion score 0.07450980392156863 - nodes in this community are weakly interconnected._
- **Should `Animaciones SVG Médicas` be split into smaller, more focused modules?**
  _Cohesion score 0.05647058823529412 - nodes in this community are weakly interconnected._
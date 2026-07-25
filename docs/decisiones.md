# Decisiones de diseño — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

Este documento registra las decisiones de arquitectura y producto ya tomadas en el
proyecto, junto con los planes y specs completos que las sustentan.

---

## Autenticación y Roles

### Roles de usuario (enum `user_role` en DB)
| Rol            | Descripción                                 | Portal            |
|----------------|-----------------------------------------------|-------------------|
| `USER`         | Paciente                                    | `/user/*`         |
| `PROFESSIONAL` | Médico / profesional de salud               | `/professional/*` |
| `ADMIN`        | Administrador de la plataforma              | `/admin/*`        |
| `EMPRESA`      | Empresa cliente (agregado en migración 016) | —                 |

Ver equivalencias de terminología en [glosario.md](glosario.md).

### Flujo de autenticación
- JWT access token (2 horas), refresh token (30 días, en localStorage)
- Hash: PBKDF2 nativo de Node, sin bcrypt
- Endpoints: `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/auth/me`
- Middleware: `authenticate` (valida Bearer token) + `authorize('ADMIN')` (RBAC)
- Frontend detecta 401 y emite evento `session:expired` para cerrar sesión

### Campos de perfil por rol (migración 016)
| Rol            | Campos extra                                                       |
|----------------|--------------------------------------------------------------------|
| Todos          | `id_type`, `id_number`                                            |
| `PROFESSIONAL` | `professional_license`                                            |
| `USER`         | `eps`, `birth_date`, `blood_type`                                 |
| `EMPRESA`      | `nit`, `company_sector`, `contact_name`, `contact_position`, `interested_services` |

> El detalle de implementación (rutas, controladores, middleware) está en
> [arquitectura.md](arquitectura.md#mapa-de-archivos-del-backend). Gotchas conocidos
> de esta área (p. ej. `SISPRO_SECRET`) están en [errores-conocidos.md](errores-conocidos.md).

---

## Planes y specs de diseño

Registro completo de decisiones de producto y diseño visual, con su rationale:

- [docs/superpowers/plans/2026-06-11-landing-rebranding-ximena.md](superpowers/plans/2026-06-11-landing-rebranding-ximena.md) — Plan de rebranding landing
- [docs/superpowers/plans/2026-06-13-account-types-redesign.md](superpowers/plans/2026-06-13-account-types-redesign.md) — Plan tipos de cuenta (4 roles)
- [docs/superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md](superpowers/specs/2026-06-11-landing-rebranding-ximena-design.md) — Spec visual completa
- [docs/superpowers/specs/2026-06-13-account-types-redesign-design.md](superpowers/specs/2026-06-13-account-types-redesign-design.md) — Spec tipos de cuenta

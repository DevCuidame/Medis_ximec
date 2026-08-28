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

### SSO handoff a CuidameDoc para profesionales (`medisxime-landing/src/components/ArtistLogin.tsx`)
El portal profesional real (agenda, historias clínicas) vive en CuidameDoc
(`doc.cuidame.tech`), no en el backend propio de MedisXime — mismo patrón que
`diana/medis/medisdiana-landing` (ver `decisiones.md` de ese proyecto hermano).
Al loguearse:
1. Se intenta primero contra `/api/auth/login` (backend propio de MedisXime).
2. Si el rol resuelto es `PROFESSIONAL`, se fuerza además un handoff SSO:
   `redirectToCuidameDocSSO(email, password)` loguea contra
   `https://doc-api.cuidame.tech/api/auth/login` con las mismas credenciales
   y, si acepta, redirige el navegador a
   `https://doc.cuidame.tech/#sso=<payload-urlencoded>` (`{u, t, r, p}` =
   user/access_token/refresh_token/professional). CuidameDoc ya sabe leer
   este fragmento (`App.tsx`, manejo `#sso=`) — nunca llega a ningún
   servidor, se borra del historial tras leerlo una vez.
3. Si el login propio de MedisXime falla (excepción), se intenta igual el
   handoff a CuidameDoc como fallback, antes de mostrar el modal de error —
   cubre el caso de un profesional que solo tiene cuenta real en CuidameDoc,
   no en el backend propio de MedisXime (el caso de Ximena, `professional_id
   = 2` en CuidameDoc).
- `docxime.cuidame.tech` ya estaba en la lista blanca de CORS de
  `cuidame_doc_backend` (`src/core/config/express.ts`) desde antes de esta
  implementación.
- Dev: proxy `/doc-api` → `https://doc-api.cuidame.tech` en `vite.config.ts`
  (evita CORS contra `localhost`; en producción el navegador llama directo).
- **Reseteo de contraseña de un profesional (admin):** no existe en el
  backend propio de MedisXime. Como la cuenta real del profesional vive en
  CuidameDoc, el reseteo se hace desde el admin de **CuidameDoc**
  (`/home/admin/users` → menú del usuario → "Restablecer contraseña", que
  llama `PUT /api/users/:id/reset-password`, admin-only) — ya existe ahí, no
  hace falta construir nada nuevo. No confundir con `AdminProfessionalsPage`
  de CuidameDoc, que no tiene esta acción.

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

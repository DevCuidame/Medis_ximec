# Errores conocidos y advertencias — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

Cosas que parecen código utilizable pero no lo son, y riesgos operativos conocidos.
Revisar esta lista antes de tocar las áreas mencionadas.

---

## Código stub / incompleto — no usar

- **`apps/frontend/`** — Angular stub (create-offer), incompleto. No usar; el frontend
  activo es `medisxime-landing/` (React). Ver [arquitectura.md](arquitectura.md).
- **`packages/ui-components/`** — Componentes React reutilizables, aún en stub.
- **`packages/shared-types/`** — Debe compilarse; si los tipos no aparecen actualizados
  en consumidores, revisar el build de este paquete.

## Componentes legacy / no activos en el router

- `UserDashboard.tsx` — Dashboard alternativo del portal paciente, legacy, **no activo**
  en `App.tsx`. No confundir con `UserLayout.tsx`, que sí está montado en `/user/*`.
- `UserMemberships.tsx` y `UserClasses.tsx` — Componentes alternativos de membresías y
  clases, reemplazados por `UserMembresias.tsx` y las vistas de calendario/servicios.
- `AdminProfessionals.tsx` — Vista alternativa de profesionales, no es la ruta principal.

Ver el mapa completo de archivos activos en [arquitectura.md](arquitectura.md).

## Riesgos operativos

- **`SISPRO_SECRET`** (variable de entorno del backend): cifra las credenciales SISPRO
  de los profesionales. **No rotar** una vez haya credenciales guardadas — rotarla
  invalida el cifrado existente y las credenciales quedan irrecuperables. Si no se
  define, cae por defecto a `JWT_SECRET`, lo cual acopla dos secretos con propósitos
  distintos; considerar definirla explícitamente en producción.
- **Hash de contraseñas**: se usa PBKDF2 nativo de Node, no bcrypt. Cualquier
  migración de librería de hashing debe contemplar una estrategia de re-hash
  progresivo, no un cambio directo de algoritmo.
- **Trigger `trg_check_offer_capacity`** (`apps/backend/migrations/005_service_management.sql`,
  función `check_offer_room_capacity()`): valida en `BEFORE INSERT OR UPDATE` que
  `service_offers.capacity` no supere `rooms.capacity`. En el entorno de producción
  anterior este trigger llegó a bloquear la creación de ofertas válidas y tuvo que
  eliminarse manualmente en caliente (`DROP TRIGGER`) sin que la migración se
  actualizara. Si una base de datos nueva corre las migraciones desde cero, el
  trigger se recreará y el mismo bloqueo puede repetirse. Antes de asumir que
  "crear oferta" falla por permisos, revisar si este trigger está rechazando el
  INSERT/UPDATE por una comparación de capacidad inconsistente (p. ej. `room_id`
  presente pero `rooms.capacity` nulo o menor al esperado).
- **No hay siembra automática de usuario `ADMIN`**: ninguna migración inserta un
  usuario administrador inicial. Históricamente esto se resolvía con scripts
  ad-hoc que insertaban un admin vía SQL con una contraseña fija embebida en texto
  plano en el propio script. Esos scripts ya no existen en este repo (ver
  [decisiones.md](decisiones.md) y el historial de limpieza), pero el problema de
  fondo sigue sin resolverse: **no hay un mecanismo versionado y seguro para crear
  el primer `ADMIN` en un despliegue nuevo**. Si se necesita, preferir una
  migración/seed que lea la contraseña desde una variable de entorno en vez de
  hardcodearla en un script.
- **Scripts de despliegue con credenciales embebidas** (`scripts/deploy-rapido.ps1`,
  `scripts/diagnostico-vm.ps1`): estos scripts contienen datos de conexión a la base
  de datos de producción en texto plano. Están en `.gitignore` (nunca se suben al
  repo), pero conviene tratarlos con el mismo cuidado que un secreto — no
  compartirlos por chat/correo y rotar las credenciales si se sospecha exposición.
  `diagnostico-vm.ps1` en particular todavía referencia el nombre de base de datos
  y usuario de la etapa previa al rebranding a MedisXime; verificar que coincidan
  con las credenciales reales del VM actual antes de ejecutarlo.

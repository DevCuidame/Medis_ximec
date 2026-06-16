# Rediseño de Tipos de Cuenta — Panel Admin "Gestión de Usuarios"

## Contexto

El wizard "Nueva Cuenta" (`CreateProfessionalModal.tsx`) y el panel `UsuariosDashboard.tsx`
todavía usan la taxonomía heredada de medisxime (`Profesional` / `Usuario normal` /
`Administrador`) y la paleta de colores morado/azul antigua. Para medisXime, los tipos
de cuenta que el administrador puede crear deben reflejar los actores reales del negocio:

- **Pacientes** — personas naturales atendidas en consulta.
- **Empresas** — clientes corporativos que contratan servicios de salud ocupacional
  para sus colaboradores.
- **Personal Médico** — médicos/profesionales de salud que atienden consultas.
- **Administrador** — staff administrativo del consultorio.

Los servicios de la clínica (referencia para campos de "interés"/especialidad):
**Medicina Bioreguladora, Medicina Laboral, Exámenes Médico Ocupacionales, SG-SST**.

Este documento también incluye la migración visual de `UsuariosDashboard.tsx` y
`UsuarioCard.tsx` a la paleta medisXime (café/crema/terracota), ya que se tocan los
mismos archivos.

## 1. Taxonomía de roles

| Etiqueta UI (dropdown "Tipo de cuenta") | Código interno `role` (enum `user_role`) | Badge singular (`UsuarioCard`) | Antes |
|---|---|---|---|
| Pacientes | `USER` | Paciente | "Usuario normal" |
| Personal Médico | `PROFESSIONAL` | Personal Médico | "Profesional" |
| Empresas | `EMPRESA` *(nuevo)* | Empresa | — no existía |
| Administrador | `ADMIN` | Administrador | "Administrador" |

Se mantienen los códigos internos `USER` / `PROFESSIONAL` / `ADMIN` para no afectar
auth/permisos en el resto del sistema. Solo se agrega `EMPRESA` como nuevo valor del
enum. El cambio es puramente de **etiquetas en español** + el nuevo rol `EMPRESA`.

Los filtros de rol en `UsuariosDashboard.tsx` usan las mismas 4 etiquetas plurales del
dropdown ("Pacientes", "Personal Médico", "Empresas", "Administrador").

## 2. Base de datos — migración `016_account_types_expansion.sql`

```sql
-- Nuevo valor de enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EMPRESA';

-- Identidad (hoy el formulario los captura pero el backend los descarta)
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_type   VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(30);

-- Personal Médico
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_license VARCHAR(50);

-- Pacientes
ALTER TABLE users ADD COLUMN IF NOT EXISTS eps         VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date  DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type  VARCHAR(5);

-- Empresas
ALTER TABLE users ADD COLUMN IF NOT EXISTS nit                  VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_sector       VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_name         VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_position     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS interested_services  TEXT[];
```

Todas las columnas son `NULL`able — no afectan filas existentes ni el flujo de login.

Para cuentas `EMPRESA`: `first_name` almacena la **Razón Social**, `last_name` queda
`''`. El NIT vive en su propia columna `nit` (no se usa `id_type`/`id_number` para
Empresas).

> Nota Postgres: `ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de la misma
> transacción que luego usa el nuevo valor. La migración debe hacer el `ADD VALUE` en
> su propio statement/bloque, separado de cualquier uso posterior (esto ya lo maneja
> `run-migration.ts` al ejecutar cada migración como un script independiente).

## 3. Wizard "Nueva Cuenta" — especificación por paso y rol

### Paso 1 · Identidad

| Campo | Pacientes | Personal Médico | Empresas | Administrador |
|---|---|---|---|---|
| Nombres / Apellidos | ✅ | ✅ | — | ✅ |
| Razón Social | — | — | ✅ (reemplaza Nombres/Apellidos) | — |
| Tipo de cuenta (select) | ✅ | ✅ | ✅ | ✅ |
| Tipo de vinculación (Dependiente/Independiente) | — | ✅ | — | — |
| Tipo de Identificación (select) | ✅ | ✅ | — | ✅ |
| Número de Identificación | ✅ | ✅ | — | ✅ |
| NIT | — | — | ✅ | — |
| Sector económico (select) | — | — | ✅ | — |

`ID_TYPES` se actualiza (se quita "RUC", no aplica en Colombia):
```ts
const ID_TYPES = ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'Tarjeta de Identidad', 'Pasaporte']
```

### Paso 2 · Contacto

| Campo | Pacientes | Personal Médico | Empresas | Administrador |
|---|---|---|---|---|
| Correo Electrónico | ✅ | ✅ | ✅ | ✅ |
| Teléfono | ✅ | ✅ | ✅ (corporativo) | ✅ |
| Foto de Perfil | ✅ | ✅ | ✅ | ✅ |
| Nombre del contacto | — | — | ✅ | — |
| Cargo del contacto | — | — | ✅ | — |

### Paso 3 · Perfil (oculto para Administrador, igual que hoy)

- **Personal Médico**:
  - Especialidades (multi-select chips, reemplaza `DISCIPLINES`):
    ```ts
    const SPECIALTIES = [
      'Medicina General', 'Medicina Laboral', 'Medicina Bioreguladora',
      'SG-SST / Salud Ocupacional', 'Exámenes Médico Ocupacionales',
    ]
    ```
    Mismo mecanismo actual de agregar/ocultar especialidades custom vía localStorage.
  - **Registro Médico / Tarjeta Profesional** (nuevo input de texto).
  - Biografía, Instagram (igual que hoy).
  - Horario disponible (solo si `professionalType === 'independiente'`, igual que hoy).

- **Pacientes** — nueva sección "Perfil de Salud" (todos los campos opcionales):
  - EPS / Seguro médico (input texto).
  - Fecha de nacimiento (input date).
  - Tipo de sangre (select): `['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']`.

- **Empresas** — "Servicios de interés" (checkboxes multi-select):
  ```ts
  const SERVICES_OF_INTEREST = [
    'Medicina Laboral', 'SG-SST', 'Exámenes Médico Ocupacionales', 'Medicina Bioreguladora',
  ]
  ```

- **Administrador** — sin Paso 3 (como hoy).

`SECTORS` (Paso 1, solo Empresas):
```ts
const SECTORS = ['Manufactura', 'Construcción', 'Servicios', 'Comercio',
  'Salud', 'Educación', 'Transporte', 'Tecnología', 'Agroindustria', 'Otro']
```

### Paso 4 · Acceso

Igual estructura para todos (resumen + contraseña + confirmar). El resumen (card de
preview) se adapta:
- Empresas: muestra Razón Social + NIT en lugar de Nombres/Apellidos, y "Servicios de
  interés" en lugar de "Especialidades".
- Personal Médico: igual que hoy (Nombres/Apellidos + Especialidades).
- Pacientes/Administrador: Nombres/Apellidos, sin línea de especialidades.

El botón final cambia de "Crear Profesional" a un texto genérico **"Crear Cuenta"**
(o "Crear {label del rol}" dinámico).

## 4. Frontend — `UsuarioCard.tsx`, `UsuariosDashboard.tsx`, `types.ts`

### `types.ts`
```ts
export interface User {
  id: string;
  nombre: string;
  documento: string;
  rol: 'Paciente' | 'Personal Médico' | 'Empresa' | 'Administrador';
  estado: 'Activa' | 'Inactiva';
  imagen?: string;
  especialidades?: string[];
  raw?: any;
}
```

### `UsuarioCard.tsx` — `ROLE_CONFIG` (paleta medisXime)

| Rol | Color | Icono (lucide-react) |
|---|---|---|
| Administrador | `#5C3A28` (brand-primary) | `Shield` |
| Personal Médico | `#9C4A2E` (brand-secondary) | `Stethoscope` |
| Paciente | `#7A6452` (text-secondary, neutro) | `User` |
| Empresa | `#B08D5C` (tono cálido intermedio, derivado de `#D4B896`) | `Building2` |

Gradientes `bg`/`border` siguen el mismo patrón actual (`rgba(<rgb del color>, 0.1-0.12)`)
pero con los RGB de los colores de arriba.

Resto del archivo (`UsuarioCard.tsx`) migra sus colores hardcodeados
(`#8B5CF6`, `#3B82F6`, `#F3F0FB`, `"Bodoni Moda"`, `"Hanken Grotesk"`, etc.) a los
tokens medisXime ya establecidos (mismo tratamiento que `MainDashboard.tsx`).

### `UsuariosDashboard.tsx`

- Migración visual completa a la paleta medisXime (tokens `C`, fuentes
  `"Cormorant Garamond"` / `Inter`, sidebar "XC"/"MedisXime", etc.) — mismo
  tratamiento que `MainDashboard.tsx`.
- Mapeo `role → rol` actualizado:
  ```ts
  const rol = u.role === 'ADMIN' ? 'Administrador'
    : u.role === 'EMPRESA' ? 'Empresa'
    : u.role === 'PROFESSIONAL' ? 'Personal Médico'
    : 'Paciente'
  ```
- Filtros de rol (pills) actualizados a las 4 categorías: Pacientes, Personal Médico,
  Empresas, Administrador.
- Para tarjetas con rol Empresa, `documento` muestra el NIT (en vez de
  cédula/pasaporte).

## 5. Backend API

- `POST /api/professionals` (controller/service/repository en
  `professional.*`) se generaliza:
  - Acepta `role` en el body: `'USER' | 'PROFESSIONAL' | 'EMPRESA' | 'ADMIN'`
    (en vez de fijarlo siempre a `'PROFESSIONAL'`).
  - Acepta campos nuevos opcionales: `idType`, `idNumber`, `professionalLicense`,
    `eps`, `birthDate`, `bloodType`, `nit`, `companySector`, `contactName`,
    `contactPosition`, `interestedServices`.
  - El INSERT en `ProfessionalRepository` incluye las nuevas columnas (todas
    opcionales → `NULL` si no vienen).
  - `professionalType`/horario solo se procesan si `role === 'PROFESSIONAL'`
    (igual que hoy).
- `GET /api/users` (`UserPublic` / `user.repository.ts`) se extiende para devolver
  los nuevos campos, de modo que `UsuariosDashboard` y `UsuarioCard` puedan mostrarlos.
- `UserRole` (TS) pasa de `'USER' | 'PROFESSIONAL' | 'ADMIN'` a
  `'USER' | 'PROFESSIONAL' | 'EMPRESA' | 'ADMIN'`.

## Fuera de alcance

- Gestión de colaboradores/empleados de una Empresa (vincular pacientes a una cuenta
  Empresa) — se deja para una fase futura; por ahora "Empresas" es solo el registro
  de la cuenta corporativa con sus datos y servicios de interés.
- Edición de cuentas existentes (`ProfessionalProfileModal.tsx` u otros modales de
  edición) — este documento cubre el wizard de creación; si se requiere editar estos
  campos nuevos después de creados, es un seguimiento separado.
- Renombrar el endpoint `/api/professionals` a algo más genérico (ej.
  `/api/accounts`) — se mantiene el path actual para minimizar el blast radius.

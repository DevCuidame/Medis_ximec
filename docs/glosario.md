# Glosario — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

MedisXime es una copia de la plataforma **Medis** (gestión de estudios de danza/pole
dance) adaptada como sistema de gestión para la clínica de **Dra. Ximena Correa** —
especialista en Salud Ocupacional, Medicina Bioreguladora y Exámenes Médico
Ocupacionales. Este glosario traduce los conceptos originales de Medis a su
equivalente en el dominio médico usado en todo el código y la documentación.

---

## Mapeo conceptual de entidades

| Concepto original            | Concepto médico                    |
|------------------------------|-------------------------------------|
| Instructores / Profesionales | Médicos / Profesionales de salud   |
| Clases / Sesiones            | Consultas / Citas                  |
| Disciplinas                  | Especialidades médicas             |
| Alumnos / Clientes           | Pacientes                          |
| Sedes / Salones              | Sedes / Consultorios               |
| Membresías / Planes          | Planes / Membresías de paciente    |
| Inscripción                  | Afiliación / Inscripción           |
| Reserva de clase             | Agendamiento de cita               |
| Empresa                      | Empresa cliente (rol EMPRESA)      |

---

## Roles del sistema

Nombres del enum `user_role` en base de datos. El detalle de permisos, flujo de
autenticación y campos por rol está en [decisiones.md](decisiones.md#autenticación-y-roles).

| Rol            | Significado                                 |
|----------------|-----------------------------------------------|
| `USER`         | Paciente                                      |
| `PROFESSIONAL` | Médico / profesional de salud                 |
| `ADMIN`        | Administrador de la plataforma                |
| `EMPRESA`      | Empresa cliente (agregado en migración 016)   |

---

Para dónde vive cada uno de estos conceptos en el código, ver el mapa de archivos en
[arquitectura.md](arquitectura.md).

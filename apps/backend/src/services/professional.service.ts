import { ProfessionalRepository } from '@repositories/professional.repository.js'
import { UserRepository } from '@repositories/user.repository.js'
import { hashPassword, encryptSecret, decryptSecret } from '@utils/index.js'
import { provisionDocProfessional } from './docProfessionalProvision.service.js'
import type {
  ProfessionalPublic,
  CreateProfessionalDTO,
  UpdateProfessionalDTO,
  ProfessionalStatus,
  ProfessionalStats,
  ProfessionalAdminDetails,
} from '../types/professional.types.js'

export const ProfessionalService = {

  async list(): Promise<ProfessionalPublic[]> {
    return ProfessionalRepository.list()
  },

  async getById(id: string): Promise<ProfessionalPublic> {
    const pro = await ProfessionalRepository.findById(id)
    if (!pro) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return pro
  },

  async create(dto: CreateProfessionalDTO): Promise<{
    professional: ProfessionalPublic
    docSync?: { ok: boolean; error?: string }
  }> {
    const role = dto.role ?? 'PROFESSIONAL'
    if (role !== 'PROFESSIONAL' && role !== 'ADMIN') {
      throw Object.assign(
        new Error('Rol no permitido. Solo se pueden crear cuentas ADMIN o PROFESSIONAL.'),
        { statusCode: 400 },
      )
    }

    const exists = await UserRepository.emailExists(dto.email)
    if (exists) throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })

    const passwordHash = hashPassword(dto.password)
    const sisproPasswordEnc = dto.sisproPassword ? encryptSecret(dto.sisproPassword) : null
    const professional = await ProfessionalRepository.create({ ...dto, role, passwordHash, sisproPasswordEnc })

    if (role !== 'PROFESSIONAL') return { professional }

    // Aprovisiona la cuenta correspondiente en CuidameDoc — best-effort, nunca
    // bloquea la creación local ya exitosa. El portal profesional real (agenda,
    // historias clínicas) vive en CuidameDoc, no en MedisXime — mismo patrón
    // que el proyecto hermano Diana
    // (docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md
    // de ese repo). Una vez aprovisionado, el login con estas mismas
    // credenciales hace el handoff SSO a CuidameDoc (ArtistLogin.tsx) en vez
    // de quedarse en la pantalla profesional interna de MedisXime.
    const docSync = await provisionDocProfessional({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      idType: dto.idType ?? '',
      idNumber: dto.idNumber ?? '',
      phone: dto.phone ?? '',
      address: dto.address ?? '',
      medicalRegistrationNumber: dto.professionalLicense ?? '',
      specialties: dto.specialties,
    })
    let docSyncResult = { ok: docSync.ok, error: docSync.error }
    if (docSync.ok && docSync.docProfessionalId) {
      try {
        await ProfessionalRepository.setDocProfessionalId(professional.id, docSync.docProfessionalId)
      } catch (err: any) {
        // El aprovisionado en CuidameDoc sí funcionó — no dejemos que un fallo
        // al guardar el enlace local convierta una creación exitosa en un 500.
        docSyncResult = {
          ok: false,
          error: `Profesional aprovisionado en CuidameDoc (id ${docSync.docProfessionalId}) pero no se pudo guardar el enlace local: ${err.message}`,
        }
      }
    }

    return { professional, docSync: docSyncResult }
  },

  async getAdminDetails(id: string): Promise<ProfessionalAdminDetails> {
    const row = await ProfessionalRepository.findAdminDetails(id)
    if (!row) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return {
      address:        row.address,
      sisproUser:     row.sisproUser,
      sisproPassword: row.sisproPasswordEnc ? decryptSecret(row.sisproPasswordEnc) : null,
    }
  },

  async update(id: string, dto: UpdateProfessionalDTO): Promise<ProfessionalPublic> {
    const { sisproPassword, ...rest } = dto
    const payload = {
      ...rest,
      ...(sisproPassword !== undefined
        ? { sisproPasswordEnc: sisproPassword ? encryptSecret(sisproPassword) : null }
        : {}),
    }
    const updated = await ProfessionalRepository.update(id, payload)
    if (!updated) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return updated
  },

  async deactivate(id: string): Promise<void> {
    const ok = await ProfessionalRepository.deactivate(id)
    if (!ok) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
  },

  async updateStatus(id: string, status: ProfessionalStatus): Promise<void> {
    const VALID: ProfessionalStatus[] = ['available', 'in_session', 'offline']
    if (!VALID.includes(status)) {
      throw Object.assign(new Error('Estado inválido.'), { statusCode: 400 })
    }
    const ok = await ProfessionalRepository.updateStatus(id, status)
    if (!ok) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
  },

  async getStats(): Promise<ProfessionalStats> {
    return ProfessionalRepository.getStats()
  },
}

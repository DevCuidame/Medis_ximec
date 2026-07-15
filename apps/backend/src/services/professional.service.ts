import { ProfessionalRepository } from '@repositories/professional.repository.js'
import { UserRepository } from '@repositories/user.repository.js'
import { hashPassword, encryptSecret, decryptSecret } from '@utils/index.js'
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

  async create(dto: CreateProfessionalDTO): Promise<ProfessionalPublic> {
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
    return ProfessionalRepository.create({ ...dto, role, passwordHash, sisproPasswordEnc })
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

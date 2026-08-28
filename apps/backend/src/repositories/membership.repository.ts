import { pool } from '@config/database.js';
import type { MembershipRecord, MembershipPublic, CreateMembershipDto, UpdateMembershipDto } from '../types/membership.types.js';

function toPublic(r: MembershipRecord): MembershipPublic {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    type: r.type,
    price: r.price,
    currency: r.currency,
    durationDays: r.duration_days,
    maxClasses: r.max_classes ?? null,
    isActive: r.is_active,
    services: [], // Will be populated by attachServices
  };
}

async function attachServices(memberships: MembershipPublic[]): Promise<MembershipPublic[]> {
  if (memberships.length === 0) return memberships;
  
  const ids = memberships.map(m => m.id);
  const { rows } = await pool.query(
    `SELECT membership_id, service_id, quantity FROM membership_services WHERE membership_id = ANY($1)`,
    [ids]
  );
  
  const map = new Map<string, { serviceId: string, quantity: number }[]>();
  for (const row of rows) {
    if (!map.has(row.membership_id)) map.set(row.membership_id, []);
    map.get(row.membership_id)!.push({ serviceId: row.service_id, quantity: row.quantity });
  }
  
  for (const m of memberships) {
    m.services = map.get(m.id) ?? [];
  }
  
  return memberships;
}

export const MembershipRepository = {
  async listAll(): Promise<MembershipPublic[]> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships ORDER BY price ASC`
    );
    return attachServices(rows.map(toPublic));
  },

  async listActive(): Promise<MembershipPublic[]> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships WHERE is_active = TRUE ORDER BY price ASC`
    );
    return attachServices(rows.map(toPublic));
  },

  async findById(id: string): Promise<MembershipPublic | null> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    const memberships = await attachServices([toPublic(rows[0])]);
    return memberships[0] ?? null;
  },

  async create(dto: CreateMembershipDto): Promise<MembershipPublic> {
    const { rows } = await pool.query<MembershipRecord>(
      `INSERT INTO memberships (code, name, description, type, price, currency, duration_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.description ?? null,
        dto.type,
        dto.price,
        dto.currency ?? 'COP',
        dto.durationDays ?? null,
        dto.isActive ?? true,
      ]
    );
    
    const membership = toPublic(rows[0]);
    
    if (dto.services && dto.services.length > 0) {
      const placeholders: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const s of dto.services) {
        placeholders.push(`($${idx++}, $${idx++}, $${idx++})`);
        values.push(membership.id, s.serviceId, s.quantity);
      }
      await pool.query(
        `INSERT INTO membership_services (membership_id, service_id, quantity) VALUES ${placeholders.join(', ')}`,
        values
      );
    }
    
    const withServices = await attachServices([membership]);
    return withServices[0]!;
  },

  async update(id: string, dto: UpdateMembershipDto): Promise<MembershipPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.code !== undefined)        { fields.push(`code = $${idx++}`);          values.push(dto.code); }
    if (dto.name !== undefined)        { fields.push(`name = $${idx++}`);          values.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${idx++}`);   values.push(dto.description); }
    if (dto.type !== undefined)        { fields.push(`type = $${idx++}`);          values.push(dto.type); }
    if (dto.price !== undefined)       { fields.push(`price = $${idx++}`);         values.push(dto.price); }
    if (dto.currency !== undefined)    { fields.push(`currency = $${idx++}`);      values.push(dto.currency); }
    if (dto.durationDays !== undefined){ fields.push(`duration_days = $${idx++}`); values.push(dto.durationDays); }
    if (dto.isActive !== undefined)    { fields.push(`is_active = $${idx++}`);     values.push(dto.isActive); }

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(id);

      await pool.query(
        `UPDATE memberships SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
      );
    }
    
    if (dto.services !== undefined) {
      await pool.query(`DELETE FROM membership_services WHERE membership_id = $1`, [id]);
      if (dto.services.length > 0) {
        const placeholders: string[] = [];
        const insertValues: unknown[] = [];
        let idx = 1;
        for (const s of dto.services) {
          placeholders.push(`($${idx++}, $${idx++}, $${idx++})`);
          insertValues.push(id, s.serviceId, s.quantity);
        }
        await pool.query(
          `INSERT INTO membership_services (membership_id, service_id, quantity) VALUES ${placeholders.join(', ')}`,
          insertValues
        );
      }
    }

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM memberships WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};

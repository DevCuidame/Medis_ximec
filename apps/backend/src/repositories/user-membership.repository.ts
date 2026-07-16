import { pool } from '@config/database.js';
import type { UserMembershipPublic, UserMembershipRecord } from '../types/user-membership.types.js';
import type { MembershipType } from '../types/membership.types.js';

const JOIN = `
  SELECT
    um.*,
    m.name          AS membership_name,
    m.type          AS membership_type,
    m.price         AS membership_price,
    m.duration_days AS membership_duration_days,
    m.max_classes   AS membership_max_classes
  FROM user_memberships um
  JOIN memberships m ON m.id = um.membership_id
`;

const JOIN_WITH_USER = `
  SELECT
    um.*,
    m.name          AS membership_name,
    m.type          AS membership_type,
    m.price         AS membership_price,
    m.duration_days AS membership_duration_days,
    m.max_classes   AS membership_max_classes,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.email         AS user_email
  FROM user_memberships um
  JOIN memberships m ON m.id = um.membership_id
  JOIN users u ON u.id = um.user_id
`;

function toPublic(row: UserMembershipRecord & Record<string, unknown>): UserMembershipPublic {
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const type = (row.membership_type ?? 'per_class') as MembershipType;

  return {
    id: row.id,
    userId: row.user_id,
    membershipId: row.membership_id,
    startedAt: new Date(row.started_at).toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    classesRemaining: row.classes_remaining != null ? Number(row.classes_remaining) : null,
    isActive: row.is_active,
    paymentStatus: row.payment_status as 'pending' | 'paid' | 'cancelled',
    paymentMethod: (row.payment_method ?? 'cash') as 'cash' | 'wompi' | 'free',
    userName: row.user_name ? String(row.user_name) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
    membership: {
      id: row.membership_id,
      name: String(row.membership_name ?? ''),
      type,
      price: Number(row.membership_price ?? 0),
      durationDays: row.membership_duration_days != null ? Number(row.membership_duration_days) : null,
    },
    isExpired,
  };
}

export const UserMembershipRepository = {
  // Returns the active PLAN (excludes inscription type)
  async findActiveByUserId(userId: string): Promise<UserMembershipPublic | null> {
    const res = await pool.query(
      `${JOIN} WHERE um.user_id = $1 AND um.is_active = TRUE AND um.payment_status = 'paid'
       AND m.type != 'inscription'
       ORDER BY um.created_at DESC LIMIT 1`,
      [userId]
    );
    if (!res.rows.length) return null;
    return toPublic(res.rows[0]);
  },

  async listByUserId(userId: string): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN} WHERE um.user_id = $1 ORDER BY um.created_at DESC`,
      [userId]
    );
    return res.rows.map(r => toPublic(r));
  },

  // Returns all memberships awaiting payment confirmation (admin use)
  async listPendingAll(): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN_WITH_USER} WHERE um.payment_status = 'pending' ORDER BY um.created_at DESC`
    );
    return res.rows.map(r => toPublic(r));
  },

  // Returns all currently active memberships across all users (admin use)
  async listActiveAll(): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN_WITH_USER}
       WHERE um.is_active = TRUE AND um.payment_status = 'paid'
       ORDER BY um.started_at DESC`
    );
    return res.rows.map(r => toPublic(r));
  },

  // Create a pending membership — old active plan is NOT deactivated until payment is confirmed
  async create(userId: string, membershipId: string, paymentMethod: 'cash' | 'wompi'): Promise<UserMembershipPublic> {
    const mRes = await pool.query(
      'SELECT * FROM memberships WHERE id = $1 AND is_active = TRUE',
      [membershipId]
    );
    if (!mRes.rows.length) {
      throw Object.assign(new Error('Membresía no encontrada o inactiva'), { statusCode: 404 });
    }
    const m = mRes.rows[0];

    // Inscripciones: sin vencimiento por calendario, sin cuota de clases
    let expiresAt: string | null = null;
    let classesRemaining: number | null = null;

    if (m.type === 'inscription') {
      expiresAt = null;
      classesRemaining = null;
    } else {
      if (m.duration_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(m.duration_days));
        expiresAt = d.toISOString();
      }
      if (m.type === 'per_class' || m.type === 'pack' || m.type === 'private') {
        classesRemaining = m.max_classes ?? (m.type === 'per_class' ? 1 : m.type === 'private' ? 1 : 10);
      }
    }

    const ins = await pool.query(
      `INSERT INTO user_memberships
         (user_id, membership_id, expires_at, classes_remaining, payment_status, payment_method, is_active)
       VALUES ($1, $2, $3, $4, 'pending', $5, FALSE)
       RETURNING id`,
      [userId, membershipId, expiresAt, classesRemaining, paymentMethod]
    );

    const res = await pool.query(`${JOIN} WHERE um.id = $1`, [ins.rows[0].id]);
    return toPublic(res.rows[0]);
  },

  // Admin confirms a cash/wompi payment → deactivate old plans, activate this one
  async confirmPayment(id: string): Promise<UserMembershipPublic> {
    const check = await pool.query(
      `SELECT um.*, m.duration_days, m.type AS membership_type FROM user_memberships um
       JOIN memberships m ON m.id = um.membership_id
       WHERE um.id = $1 AND um.payment_status = 'pending'`,
      [id]
    );
    if (!check.rows.length) {
      throw Object.assign(new Error('Pago no encontrado o ya confirmado'), { statusCode: 404 });
    }
    const row = check.rows[0];
    const userId = row.user_id;
    const membershipType = row.membership_type as string;

    // Inscripciones y planes coexisten: solo se desactiva el mismo tipo.
    // Confirmar una inscripción cancela inscripciones previas (no planes).
    // Confirmar un plan cancela planes previos (no la inscripción).
    if (membershipType === 'inscription') {
      await pool.query(
        `UPDATE user_memberships um SET is_active = FALSE, updated_at = NOW()
         FROM memberships m
         WHERE um.membership_id = m.id
           AND um.user_id = $1 AND um.is_active = TRUE AND m.type = 'inscription'`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE user_memberships um SET is_active = FALSE, updated_at = NOW()
         FROM memberships m
         WHERE um.membership_id = m.id
           AND um.user_id = $1 AND um.is_active = TRUE AND m.type != 'inscription'`,
        [userId]
      );
    }

    // Recompute expires_at from today (activation date)
    let newExpiresAt: string | null = null;
    if (membershipType !== 'inscription' && row.duration_days) {
      const d = new Date();
      d.setDate(d.getDate() + Number(row.duration_days));
      newExpiresAt = d.toISOString();
    }

    // Activate the confirmed membership
    await pool.query(
      `UPDATE user_memberships
       SET is_active = TRUE, payment_status = 'paid',
           started_at = NOW(), expires_at = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, newExpiresAt]
    );

    const res = await pool.query(`${JOIN_WITH_USER} WHERE um.id = $1`, [id]);
    return toPublic(res.rows[0]);
  },

  async rejectPayment(id: string): Promise<void> {
    await pool.query(
      `UPDATE user_memberships
       SET payment_status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND payment_status = 'pending'`,
      [id]
    );
  },

  async deleteRecord(id: string): Promise<void> {
    await pool.query(`DELETE FROM user_memberships WHERE id = $1`, [id]);
  },
};

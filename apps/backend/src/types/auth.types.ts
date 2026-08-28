// ─── Shared Domain Types ─────────────────────────────────────────────────────

export type UserRole = 'USER' | 'PROFESSIONAL' | 'ADMIN';

/** Row as returned by the DB (never expose password_hash to the client) */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  second_name: string | null;
  last_name: string;
  second_last_name: string | null;
  phone: string | null;
  role: UserRole;
  id_type: string | null;
  id_number: string | null;
  professional_license: string | null;
  bio: string | null;
  specialties: string[] | null;
  instagram_url: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  professional_type: 'dependiente' | 'independiente' | null;
  status: 'available' | 'in_session' | 'offline' | null;
  created_at: Date;
  updated_at: Date;
}

/** Safe user object sent to the client */
export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  secondName: string | null;
  lastName: string;
  secondLastName: string | null;
  phone: string | null;
  role: UserRole;
  idType: string | null;
  idNumber: string | null;
  professionalLicense: string | null;
  bio: string | null;
  specialties: string[] | null;
  instagramUrl: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  professionalType: 'dependiente' | 'independiente' | null;
  status: 'available' | 'in_session' | 'offline' | null;
  createdAt: string;
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

// Registro público (POST /api/auth/register): siempre crea pacientes (USER).
// Deliberadamente sin campo `role` — ver auth.service.ts:register().
export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idType?: string;
  idNumber?: string;
  phone?: string;
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  secondName?: string | null;
  secondLastName?: string | null;
  idType?: string;
  idNumber?: string;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

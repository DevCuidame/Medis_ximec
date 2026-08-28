import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '@config/env.js';
import { UserRepository } from '@repositories/user.repository.js';
import { hashPassword, verifyPassword } from '@utils/crypto.util.js';
import type {
  RegisterDTO,
  LoginDTO,
  AuthTokens,
  JwtPayload,
  UserPublic,
} from '../types/auth.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL  = 60 * 60 * 2;        // 2 horas
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30;  // 30 días (segundos)

// Hash valido (formato pbkdf2$...) pero de una password que nadie conoce —
// usado solo para gastar el mismo tiempo de CPU que una verificación real
// cuando el email no existe, ver login(). No corresponde a ninguna cuenta.
const DUMMY_HASH = hashPassword(crypto.randomBytes(32).toString('hex'));

// ─── JWT helpers ─────────────────────────────────────────────────────────────

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
}

function signRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {

  async register(dto: RegisterDTO): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    // 1. Validar email único
    const exists = await UserRepository.emailExists(dto.email);
    if (exists) {
      throw Object.assign(new Error('Este email ya está registrado.'), { statusCode: 409 });
    }

    // 2. Hashear contraseña
    const passwordHash = hashPassword(dto.password);

    // 3. Crear usuario — el registro público SIEMPRE crea pacientes (USER).
    // PROFESSIONAL/ADMIN solo se crean vía POST /api/professionals (admin-only,
    // ver professional.service.ts) — UserRepository.create() fija el rol.
    const user = await UserRepository.create({ ...dto, passwordHash });

    // 4. Emitir tokens
    const tokens = await AuthService._issueTokens(user.id, user.email, user.role);

    return { user, tokens };
  },

  async login(dto: LoginDTO): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    // Mensaje y forma de fallo IDÉNTICOS exista o no el email — evita que el
    // endpoint sirva para enumerar pacientes/profesionales registrados. El
    // hash dummy además absorbe el tiempo de un PBKDF2 real para no filtrar
    // la diferencia por timing entre "no existe" y "password incorrecta".
    const INVALID_CREDENTIALS = 'Usuario o contraseña incorrectas.';

    // 1. Buscar usuario
    const record = await UserRepository.findByEmail(dto.email);
    if (!record) {
      verifyPassword(dto.password, DUMMY_HASH);
      throw Object.assign(new Error(INVALID_CREDENTIALS), { statusCode: 401 });
    }

    // 2. Verificar contraseña
    const valid = verifyPassword(dto.password, record.password_hash);
    if (!valid) {
      throw Object.assign(new Error(INVALID_CREDENTIALS), { statusCode: 401 });
    }

    // 3. Emitir tokens
    const tokens = await AuthService._issueTokens(record.id, record.email, record.role);

    // 4. Retornar sin password_hash
    const user = await UserRepository.getPublicById(record.id) as UserPublic;
    return { user, tokens };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await UserRepository.findRefreshToken(refreshToken);
    if (!stored || stored.expires_at < new Date()) {
      throw Object.assign(new Error('Refresh token inválido o expirado.'), { statusCode: 401 });
    }

    const user = await UserRepository.findById(stored.user_id);
    if (!user) {
      throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 401 });
    }

    // Rotar token
    await UserRepository.deleteRefreshToken(refreshToken);
    return AuthService._issueTokens(user.id, user.email, user.role);
  },

  async logout(refreshToken: string): Promise<void> {
    await UserRepository.deleteRefreshToken(refreshToken);
  },

  /** Verifica un access token y retorna el payload */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      throw Object.assign(new Error('Token inválido o expirado.'), { statusCode: 401 });
    }
  },

  // ─── Private ───────────────────────────────────────────────────────
  async _issueTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const accessToken  = signAccessToken({ sub: userId, email, role: role as any });
    const refreshToken = signRefreshToken();
    const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    await UserRepository.saveRefreshToken(userId, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },
};

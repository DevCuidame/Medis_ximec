import dotenv from 'dotenv';

dotenv.config();

interface Env {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  JWT_SECRET: string;
  SISPRO_SECRET: string;
  CORS_ORIGIN: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
  ADMIN_EMAIL: string;
  XIMENA_INTERNAL_API_KEY: string;
  DOC_API_URL: string;
  DOC_XIMENA_EMAIL: string;
  DOC_XIMENA_PASSWORD: string;
}

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// JWT_SECRET firma tokens que dan acceso a datos de pacientes — un secreto
// corto/trivial es crackeable offline si el .env se filtra. 32 chars es el
// mínimo razonable para HMAC-SHA256 (256 bits si es hex/base64 denso).
if (process.env.JWT_SECRET!.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

export const env: Env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) || 'development',
  PORT: Number(process.env.PORT) || 3007,
  JWT_SECRET: process.env.JWT_SECRET || '',
  SISPRO_SECRET: process.env.SISPRO_SECRET || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 465,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_USER || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '',
  XIMENA_INTERNAL_API_KEY: process.env.XIMENA_INTERNAL_API_KEY || '',
  DOC_API_URL: process.env.DOC_API_URL || '',
  DOC_XIMENA_EMAIL: process.env.DOC_XIMENA_EMAIL || '',
  DOC_XIMENA_PASSWORD: process.env.DOC_XIMENA_PASSWORD || '',
};

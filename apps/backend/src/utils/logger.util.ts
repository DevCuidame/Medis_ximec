// Nombres de campo que nunca deben llegar a stdout/PM2 en texto plano —
// mejor esfuerzo: no reemplaza revisar qué se loguea en cada call site, pero
// evita que un `log.error('...', req.body)` o un error de pg con datos
// bindeados filtre credenciales por accidente.
const SENSITIVE_KEYS = /password|passwordHash|token|secret|authorization|sispro|jwt|apikey|api_key/i;
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 4;

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (value instanceof Error) {
    const extra: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      extra[key] = SENSITIVE_KEYS.test(key) ? REDACTED : redact((value as any)[key], depth + 1);
    }
    return { name: value.name, message: value.message, stack: value.stack, ...extra };
  }

  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.test(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}

export function logger(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    console.log(`${prefix} ${message}`, redact(data));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const log = {
  info: (message: string, data?: any) => logger('info', message, data),
  warn: (message: string, data?: any) => logger('warn', message, data),
  error: (message: string, data?: any) => logger('error', message, data),
};

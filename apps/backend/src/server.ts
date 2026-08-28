import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { errorHandler } from '@middleware/errorHandler.middleware';
import apiRoutes from '@routes/index';
import { log } from '@utils/logger.util';

// CORS_ORIGIN admite una lista separada por comas (varios frontends contra
// el mismo backend). El bypass "confío en localhost" solo aplica fuera de
// producción — antes corría igual en prod, sin gate de NODE_ENV.
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin / curl / server-to-server
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Limita fuerza bruta / DoS barato contra el hashing síncrono de login y
// registro — antes no había ningún rate limit en todo el backend.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

export function createServer(): express.Express {
  const app = express();

  // Confía en el proxy nginx de un solo salto para que express-rate-limit
  // e IP-based logging usen la IP real del cliente (X-Forwarded-For), no la
  // IP interna de nginx.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(corsOptions));

  // Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/refresh', authLimiter);
  app.use('/api', apiLimiter);

  // Routes
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Error Handler (debe ser el último middleware)
  app.use(errorHandler);

  return app;
}

export function startServer() {
  const app = createServer();

  app.listen(env.PORT, () => {
    log.info(`🚀 Server running at http://localhost:${env.PORT}`);
    log.info(`📡 API available at http://localhost:${env.PORT}/api`);
  });
}

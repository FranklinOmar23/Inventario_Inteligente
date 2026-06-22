# Foundations: configuración, logging, seguridad y arranque

Código de infraestructura completo y compilable. Todo en TypeScript. Las
decisiones ya están justificadas en `SKILL.md`; aquí está la implementación.

## Configuración validada al arranque (fail fast)

Lee `process.env` una sola vez, valídalo con Zod y exporta un objeto tipado. Si
falta o es inválida una variable, la app no arranca.

```typescript
// src/shared/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // No uses el logger aquí: aún no hay config. Falla ruidosamente y sal.
  console.error(
    'Invalid environment configuration:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
```

## Logger estructurado con pino

```typescript
// src/shared/logger.ts
import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.LOG_LEVEL,
  // En desarrollo, salida legible; en producción, JSON puro para agregadores.
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  // Nunca loguees secretos: redacta campos sensibles.
  redact: ['req.headers.authorization', '*.password', '*.passwordHash'],
});
```

`pino-http` (cableado en `app.ts`) crea un logger por request accesible como
`req.log`, con un id de correlación automático. Úsalo dentro de los handlers en
vez del logger global cuando quieras trazar una petición concreta.

## Seguridad

```typescript
// src/shared/security.ts
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';
import { config } from './config';

// CORS con allowlist explícita. Nunca origin: '*' si manejas credenciales.
export const corsMiddleware: RequestHandler = cors({
  origin: config.CORS_ORIGINS.length ? config.CORS_ORIGINS : false,
  credentials: true,
});

// Rate limit general de la API. Endpoints sensibles (login) merecen uno más
// estricto montado solo en esa ruta.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // mucho más estricto para login/registro
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
```

Cableado completo de `app.ts` con seguridad incluida:

```typescript
// src/app.ts
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsMiddleware, apiRateLimiter } from './shared/security';
import { errorHandler, notFoundHandler } from './shared/error-handler';
import { logger } from './shared/logger';

export const createApp = (apiRouter: Router) => {
  const app = express();

  app.disable('x-powered-by');             // no reveles el stack
  app.use(helmet());                       // cabeceras de seguridad
  app.use(corsMiddleware);                 // CORS con allowlist
  app.use(express.json({ limit: '100kb' })); // body con límite de tamaño
  app.use(pinoHttp({ logger }));           // logging estructurado por request
  app.use('/api', apiRateLimiter, apiRouter); // rate limit + rutas
  app.use(notFoundHandler);                // 404
  app.use(errorHandler);                   // error handler — SIEMPRE el último

  return app;
};
```

Notas sobre sanitización: la primera línea de defensa es **validar** toda entrada
con Zod (ver `SKILL.md`), lo que ya rechaza formas inesperadas. Para inyección,
usa siempre consultas parametrizadas / el ORM (nunca concatenes SQL). Si renderas
HTML con datos de usuario, escapa en el punto de salida.

## Arranque y graceful shutdown

```typescript
// src/server.ts
import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { createApp } from './app';
import { config } from './shared/config';
import { logger } from './shared/logger';
import { buildUserModule } from './modules/users';

const prisma = new PrismaClient();

// Composition root global: ensambla los módulos y monta su router.
const apiRouter = Router();
const users = buildUserModule(prisma);
apiRouter.use('/users', users.routes);

const app = createApp(apiRouter);
const server = app.listen(config.PORT, () => {
  logger.info(`Listening on :${config.PORT} (${config.NODE_ENV})`);
});

// Graceful shutdown: deja de aceptar conexiones, drena, cierra la BD.
// Un timeout de seguridad mata el proceso si algo se cuelga.
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);

  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Errores a nivel de proceso: loguea y sal. Un proceso en estado desconocido
// tras una excepción no capturada no es de fiar; deja que el orquestador
// (Docker/k8s/PM2) lo reinicie limpio.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
```

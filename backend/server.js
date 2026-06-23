// Load + validate env vars before anything else
import './src/config/env.js';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
// swaggerSpec is now a plain object — no swagger-jsdoc glob scanning needed

import { initDB } from './db/database.js';       // existing table creation + migrations + seeds
import { uploadDir } from './src/controllers/upload.controller.js';
import { swaggerSpec } from './src/docs/swagger.js';
import { createRouter } from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { env } from './src/config/env.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));

// Stripe webhook must receive raw body — register BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'InvenAI API Docs',
  swaggerOptions:  { persistAuthorization: true },
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.use('/api', createRouter());

// Centralized error handler — must be last, must have 4 params
app.use(errorHandler);

process.on('uncaughtException',  (err)    => console.error('[uncaughtException]', err));
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

async function start() {
  await initDB();
  app.listen(env.port, () => {
    console.log(`\n🚀 InvenAI Backend — http://localhost:${env.port}`);
    console.log(`   Swagger docs    — http://localhost:${env.port}/api/docs\n`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start:', err.message);
  process.exit(1);
});

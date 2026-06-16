import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { initDB } from './db/database.js';
import { swaggerSpec } from './swagger.js';
import authRoutes from './routes/auth.js';
import sucursalRoutes from './routes/sucursales.js';
import departmentRoutes from './routes/departments.js';
import categoryRoutes from './routes/categories.js';
import inventoryRoutes from './routes/inventory.js';
import logRoutes from './routes/logs.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import estantesRoutes from './routes/estantes.js';
import reportsRoutes from './routes/reports.js';
import tenantsRoutes from './routes/tenants.js';
import billingRoutes from './routes/billing.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Stripe webhook needs the raw request body for signature verification —
// must be registered before express.json() parses the body.
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'InvenAI API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth',           authRoutes);
app.use('/api/sucursales',     sucursalRoutes);
app.use('/api/departments',    departmentRoutes);
app.use('/api/categories',     categoryRoutes);
app.use('/api/inventory',      inventoryRoutes);
app.use('/api/logs',           logRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/ai',             aiRoutes);
app.use('/api/upload',         uploadRoutes);
app.use('/api/users',          usersRoutes);
app.use('/api/estantes',       estantesRoutes);
app.use('/api/reports',        reportsRoutes);
app.use('/api/tenants',        tenantsRoutes);
app.use('/api/billing',        billingRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 InvenAI Backend running at http://localhost:${PORT}`);
      console.log(`   Swagger docs: http://localhost:${PORT}/api/docs\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();

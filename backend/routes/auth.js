import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function signToken(user, tenantId) {
  return jwt.sign(
    {
      id:          user.id,
      email:       user.email,
      full_name:   user.full_name,
      role:        user.role,
      sucursal_id: user.sucursal_id || null,
      tenant_id:   tenantId || user.tenant_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken(user, user.tenant_id);
  const permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json({
    token,
    user: {
      id:          user.id,
      email:       user.email,
      full_name:   user.full_name,
      role:        user.role,
      permissions,
      sucursal_id: user.sucursal_id || null,
      tenant_id:   user.tenant_id   || null,
    },
  });
}));

// POST /api/auth/register — simple single-user register (legacy, kept for compat)
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
  if (existing.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const id = crypto.randomUUID();
  const normalEmail = email.toLowerCase().trim();
  await db.execute(
    'INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
    [id, normalEmail, hash, full_name]
  );

  const token = jwt.sign({ id, email: normalEmail, full_name, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email: normalEmail, full_name, role: 'user' } });
}));

// POST /api/auth/setup-tenant — create a new tenant + admin user (onboarding wizard)
router.post('/setup-tenant', asyncHandler(async (req, res) => {
  const {
    tenant_name, rnc, inventory_type = 'physical', business_type = 'tecnologia', plan = 'starter',
    full_name, email, password, confirm_password,
  } = req.body;

  if (!tenant_name) return res.status(400).json({ error: 'Nombre de empresa requerido' });
  if (!full_name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (confirm_password && password !== confirm_password) return res.status(400).json({ error: 'Las contraseñas no coinciden' });

  const db = getDB();
  const normalEmail = email.toLowerCase().trim();

  const [existing] = await db.execute('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [normalEmail]);
  if (existing.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

  const PLAN_LIMITS = {
    starter:    { max_records: 40000, max_users: 3,  max_sucursales: 1 },
    pro:        { max_records: 60000, max_users: 5,  max_sucursales: 3 },
    enterprise: { max_records: 999999,max_users: 999, max_sucursales: 999 },
  };
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

  const tenantId = crypto.randomUUID();
  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS || 14);
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
  await db.execute(
    `INSERT INTO tenants (id, name, rnc, inventory_type, business_type, plan, max_records, max_users, max_sucursales, trial_ends_at, billing_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'trialing')`,
    [tenantId, tenant_name, rnc || null, inventory_type, business_type, plan, limits.max_records, limits.max_users, limits.max_sucursales, trialEndsAt]
  );

  // Create default "Sede Principal" sucursal for the new tenant
  const sucId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO sucursales (id, name, address, manager, tenant_id) VALUES (?, ?, ?, ?, ?)',
    [sucId, 'Sede Principal', '', full_name, tenantId]
  );

  // Create default "General" department
  const deptId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [deptId, 'General', '', full_name, sucId, 'Sede Principal', tenantId]
  );

  const hash = bcrypt.hashSync(password, 10);
  const userId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO users (id, email, password_hash, full_name, role, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, normalEmail, hash, full_name, 'admin', tenantId]
  );

  const tenant = { id: tenantId, name: tenant_name, rnc: rnc || null, inventory_type, business_type, plan, trial_ends_at: trialEndsAt, billing_status: 'trialing' };
  const user   = { id: userId, email: normalEmail, full_name, role: 'admin', tenant_id: tenantId };
  const token  = signToken(user, tenantId);

  res.status(201).json({ token, user: { ...user, permissions: null, sucursal_id: null }, tenant });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT id, email, full_name, role, permissions, sucursal_id, tenant_id, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  const user = rows[0];
  user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json(user);
}));

// PUT /api/auth/change-password — self-service password change
router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  if (new_password.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

  const db = getDB();
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!bcrypt.compareSync(current_password, rows[0].password_hash)) {
    return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ ok: true });
}));

// POST /api/auth/reset-password-request
router.post('/reset-password-request', (req, res) => {
  res.json({ message: 'Si el email existe, recibirás un enlace de restablecimiento' });
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseUser(row) {
  return {
    ...row,
    permissions: row.permissions ? JSON.parse(row.permissions) : null,
  };
}

// GET /api/users — list all non-deleted users
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT id, email, full_name, role, permissions, sucursal_id, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  res.json(rows.map(parseUser));
}));

// POST /api/users — create user
router.post('/', asyncHandler(async (req, res) => {
  const { email, password, full_name, role = 'user', permissions = null, sucursal_id = null } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
  if (existing.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const id = crypto.randomUUID();
  const permsJson = permissions ? JSON.stringify(permissions) : null;

  await db.execute(
    'INSERT INTO users (id, email, password_hash, full_name, role, permissions, sucursal_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email.toLowerCase().trim(), hash, full_name, role, permsJson, sucursal_id || null]
  );

  res.status(201).json({ id, email: email.toLowerCase().trim(), full_name, role, permissions, sucursal_id });
}));

// PUT /api/users/:id — update user (name, role, permissions, sucursal, optional password)
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { full_name, role, permissions, sucursal_id, password } = req.body;

  const db = getDB();
  const [rows] = await db.execute('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Prevent removing the last admin
  if (role === 'user') {
    const [[{ cnt }]] = await db.execute(
      "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND deleted_at IS NULL AND id != ?",
      [id]
    );
    if (cnt === 0) return res.status(400).json({ error: 'Debe existir al menos un administrador' });
  }

  const permsJson = permissions !== undefined ? (permissions ? JSON.stringify(permissions) : null) : undefined;

  const fields = [];
  const values = [];
  if (full_name  !== undefined) { fields.push('full_name = ?');   values.push(full_name); }
  if (role       !== undefined) { fields.push('role = ?');        values.push(role); }
  if (permsJson  !== undefined) { fields.push('permissions = ?'); values.push(permsJson); }
  if (sucursal_id !== undefined) { fields.push('sucursal_id = ?'); values.push(sucursal_id || null); }
  if (password)                 { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  values.push(id);
  await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  res.json({ ok: true });
}));

// DELETE /api/users/:id — soft delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  const db = getDB();
  const [[{ cnt }]] = await db.execute(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND deleted_at IS NULL AND id != ?",
    [id]
  );
  const [rows] = await db.execute('SELECT role FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows[0]?.role === 'admin' && cnt === 0) {
    return res.status(400).json({ error: 'Debe existir al menos un administrador' });
  }

  await db.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);
  res.json({ ok: true });
}));

export default router;

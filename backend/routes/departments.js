import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tid = req => req.user.tenant_id;

router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;
  const sucursal_id = forcedSucursal || req.query.sucursal_id || null;
  let sql = 'SELECT * FROM departments WHERE deleted_at IS NULL';
  const params = [];
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  if (sucursal_id) { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY sucursal_name, name';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let sql = 'SELECT * FROM departments WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [rows] = await db.execute(sql, params);
  if (rows.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, description, manager, sucursal_id, sucursal_name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, description || '', manager || '', sucursal_id || null, sucursal_name || '', tid(req)]
  );
  const [rows] = await db.execute('SELECT * FROM departments WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, manager, sucursal_id, sucursal_name } = req.body;
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

  await db.execute(
    'UPDATE departments SET name = ?, description = ?, manager = ?, sucursal_id = ?, sucursal_name = ? WHERE id = ?',
    [name, description || '', manager || '', sucursal_id || null, sucursal_name || '', req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM departments WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

  await db.execute('UPDATE departments SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

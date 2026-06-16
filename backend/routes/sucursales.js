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
  let sql = 'SELECT * FROM sucursales WHERE deleted_at IS NULL';
  const params = [];
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  if (forcedSucursal) { sql += ' AND id = ?'; params.push(forcedSucursal); }
  sql += ' ORDER BY name';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let sql = 'SELECT * FROM sucursales WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [rows] = await db.execute(sql, params);
  if (rows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, address, manager, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();

  const [[tenantRow]] = await db.execute('SELECT max_sucursales FROM tenants WHERE id = ?', [tid(req)]);
  const [[{ cnt }]] = await db.execute(
    'SELECT COUNT(*) as cnt FROM sucursales WHERE tenant_id = ? AND deleted_at IS NULL',
    [tid(req)]
  );
  if (tenantRow && cnt >= tenantRow.max_sucursales) {
    return res.status(403).json({ error: `Tu plan permite hasta ${tenantRow.max_sucursales} sucursal(es). Mejora tu plan para agregar más.` });
  }

  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO sucursales (id, name, address, manager, phone, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, address || null, manager || '', phone || '', tid(req)]
  );

  const deptId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [deptId, 'General', '', '', id, name, tid(req)]
  );

  const [rows] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, address, manager, phone } = req.body;
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM sucursales WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

  await db.execute(
    'UPDATE sucursales SET name = ?, address = ?, manager = ?, phone = ? WHERE id = ?',
    [name, address || null, manager || '', phone || '', req.params.id]
  );

  if (name) {
    await db.execute('UPDATE departments SET sucursal_name = ? WHERE sucursal_id = ?', [name, req.params.id]);
    await db.execute('UPDATE inventory_items SET sucursal_name = ? WHERE sucursal_id = ? AND deleted_at IS NULL', [name, req.params.id]);
  }

  const [rows] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM sucursales WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

  await db.execute('UPDATE sucursales SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

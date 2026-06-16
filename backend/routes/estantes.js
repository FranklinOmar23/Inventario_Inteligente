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

  let sql = `
    SELECT e.*,
      (SELECT COUNT(*) FROM inventory_items i WHERE i.shelf_id = e.id AND i.deleted_at IS NULL) AS item_count
    FROM estantes e
    WHERE e.deleted_at IS NULL
  `;
  const params = [];
  if (tid(req)) { sql += ' AND e.tenant_id = ?'; params.push(tid(req)); }
  if (sucursal_id) { sql += ' AND e.sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY e.sucursal_name, e.name';

  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, description, sucursal_id, type = 'estante' } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre del estante es requerido' });

  const db = getDB();
  let sucursal_name = '';
  if (sucursal_id) {
    const [[suc]] = await db.execute('SELECT name FROM sucursales WHERE id = ? AND deleted_at IS NULL', [sucursal_id]);
    sucursal_name = suc?.name || '';
  }

  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO estantes (id, name, description, sucursal_id, sucursal_name, type, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, description || null, sucursal_id || null, sucursal_name, type, tid(req)]
  );

  res.status(201).json({ id, name, description, sucursal_id, sucursal_name, type, item_count: 0 });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, sucursal_id, type = 'estante' } = req.body;
  const db = getDB();

  let sucursal_name = '';
  if (sucursal_id) {
    const [[suc]] = await db.execute('SELECT name FROM sucursales WHERE id = ? AND deleted_at IS NULL', [sucursal_id]);
    sucursal_name = suc?.name || '';
  }

  await db.execute(
    'UPDATE estantes SET name = ?, description = ?, sucursal_id = ?, sucursal_name = ?, type = ? WHERE id = ? AND deleted_at IS NULL',
    [name, description || null, sucursal_id || null, sucursal_name, type, req.params.id]
  );
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  await db.execute(
    'UPDATE inventory_items SET shelf_id = NULL, shelf_name = "" WHERE shelf_id = ?',
    [req.params.id]
  );
  await db.execute('UPDATE estantes SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;

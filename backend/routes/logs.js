import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tid = req => req.user.tenant_id;

router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const { action, search, item_id, limit = 100 } = req.query;
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;

  let sql = 'SELECT * FROM activity_logs WHERE deleted_at IS NULL';
  const params = [];

  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  if (item_id)                    { sql += ' AND item_id = ?';   params.push(item_id); }
  if (action && action !== 'all') { sql += ' AND action = ?';    params.push(action); }
  if (forcedSucursal) {
    sql += ' AND item_id IN (SELECT id FROM inventory_items WHERE sucursal_id = ? AND deleted_at IS NULL)';
    params.push(forcedSucursal);
  }
  if (search) {
    sql += ' AND (item_name LIKE ? OR performed_by LIKE ? OR details LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit));

  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const {
    action, item_id, item_name, category_name, department_name,
    quantity, performed_by, performed_by_id, checked_out_to, details, timestamp,
  } = req.body;
  const id = crypto.randomUUID();
  const ts = timestamp ? new Date(timestamp) : new Date();

  await db.execute(`
    INSERT INTO activity_logs
      (id, action, item_id, item_name, category_name, department_name,
       quantity, performed_by, performed_by_id, checked_out_to, details, timestamp, tenant_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, action, item_id || null, item_name || '',
    category_name || '', department_name || '',
    Number(quantity) || 1, performed_by || '',
    performed_by_id || null, checked_out_to || null,
    details || '', ts, tid(req),
  ]);

  res.status(201).json({ id });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM activity_logs WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });

  await db.execute('UPDATE activity_logs SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

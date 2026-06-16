import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tid = req => req.user.tenant_id;

const toBool = r => ({
  ...r,
  requires_asset_tag: !!r.requires_asset_tag,
  requires_unique_id: !!r.requires_unique_id,
});

router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  let sql = 'SELECT * FROM categories WHERE deleted_at IS NULL';
  const params = [];
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  sql += ' ORDER BY name';
  const [rows] = await db.execute(sql, params);
  res.json(rows.map(toBool));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let sql = 'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [rows] = await db.execute(sql, params);
  if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(toBool(rows[0]));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, requires_asset_tag = false, requires_unique_id = false, minimum_stock = 5, parent_id = null } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();

  if (parent_id) {
    const params = [parent_id];
    let checkSql = 'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL';
    if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
    const [parent] = await db.execute(checkSql, params);
    if (parent.length === 0) return res.status(400).json({ error: 'Categoría padre no encontrada' });
  }

  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0, Number(minimum_stock) || 5, parent_id || null, tid(req)]
  );
  const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
  res.status(201).json(toBool(rows[0]));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, requires_asset_tag, requires_unique_id, minimum_stock, parent_id = null } = req.body;
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });

  if (parent_id === req.params.id) return res.status(400).json({ error: 'Una categoría no puede ser su propia categoría padre' });

  await db.execute(
    'UPDATE categories SET name = ?, requires_asset_tag = ?, requires_unique_id = ?, minimum_stock = ?, parent_id = ? WHERE id = ?',
    [name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0, Number(minimum_stock) || 5, parent_id || null, req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(toBool(rows[0]));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });

  await db.execute('UPDATE categories SET deleted_at = NOW() WHERE id = ? OR parent_id = ?', [req.params.id, req.params.id]);
  res.json({ success: true });
}));

export default router;

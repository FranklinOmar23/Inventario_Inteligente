import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { sendRequisitionEmail } from '../services/email.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tid = req => req.user.tenant_id;

router.get('/manager-config', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT manager_email, manager_name, smtp_user, smtp_pass FROM tenant_email_config WHERE tenant_id = ?',
    [tid(req)]
  );
  const cfg = rows[0] || {};
  res.json({
    email:      cfg.manager_email || '',
    name:       cfg.manager_name  || '',
    configured: !!(cfg.smtp_user && cfg.smtp_pass),
  });
}));

router.post('/send-requisition', asyncHandler(async (req, res) => {
  const { to, manager_name, sender_name, motive, items, notes } = req.body;

  if (!to)            return res.status(400).json({ error: 'Correo del destinatario requerido' });
  if (!manager_name)  return res.status(400).json({ error: 'Nombre del encargado requerido' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Se requiere al menos un item' });

  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM tenant_email_config WHERE tenant_id = ?', [tid(req)]);
  const cfg = rows[0];
  if (!cfg || !cfg.smtp_user || !cfg.smtp_pass) {
    return res.status(503).json({ error: 'Correo no configurado. Ve a "Configurar Correo" en Órdenes de Compra para configurarlo.' });
  }

  await sendRequisitionEmail({
    to,
    managerName: manager_name,
    senderName:  sender_name || cfg.smtp_from_name || 'Sistema InvenAI',
    motive:      motive || 'reposición de equipos',
    items,
    notes,
    smtp: {
      host:     cfg.smtp_host || 'smtp.gmail.com',
      port:     cfg.smtp_port || 587,
      secure:   !!cfg.smtp_secure,
      user:     cfg.smtp_user,
      pass:     cfg.smtp_pass,
      fromName: cfg.smtp_from_name || 'InvenAI',
    },
  });

  res.json({ success: true, message: `Requisición enviada a ${to}` });
}));

router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  let sql = 'SELECT * FROM purchase_orders WHERE deleted_at IS NULL';
  const params = [];
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let sql = 'SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { sql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [rows] = await db.execute(sql, params);
  if (rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { category_id, category_name, quantity_suggested, notes } = req.body;
  if (!category_id) return res.status(400).json({ error: 'Categoría requerida' });

  const db = getDB();
  const params = [category_id];
  let chkSql = "SELECT id FROM purchase_orders WHERE category_id = ? AND status = 'pending' AND deleted_at IS NULL";
  if (tid(req)) { chkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(chkSql, params);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Ya existe una orden pendiente para esta categoría', existing_id: existing[0].id });
  }

  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO purchase_orders (id, category_id, category_name, quantity_suggested, status, notes, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, category_id, category_name || '', Number(quantity_suggested) || 1, 'pending', notes || null, tid(req)]
  );
  const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM purchase_orders WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

  await db.execute(
    'UPDATE purchase_orders SET status = ?, notes = ? WHERE id = ?',
    [status, notes || null, req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const params = [req.params.id];
  let checkSql = 'SELECT id FROM purchase_orders WHERE id = ? AND deleted_at IS NULL';
  if (tid(req)) { checkSql += ' AND tenant_id = ?'; params.push(tid(req)); }
  const [existing] = await db.execute(checkSql, params);
  if (existing.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

  await db.execute('UPDATE purchase_orders SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

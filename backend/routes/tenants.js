import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/tenants/me — get current tenant info
router.get('/me', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });

  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Tenant no encontrado' });
  res.json(rows[0]);
}));

// PUT /api/tenants/me — update tenant name/rnc
router.put('/me', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });

  const { name, rnc, inventory_type } = req.body;
  const db = getDB();

  const fields = [];
  const values = [];
  if (name)            { fields.push('name = ?');           values.push(name); }
  if (rnc !== undefined){ fields.push('rnc = ?');           values.push(rnc || null); }
  if (inventory_type)  { fields.push('inventory_type = ?'); values.push(inventory_type); }
  if (!fields.length)  return res.status(400).json({ error: 'Nada que actualizar' });

  values.push(tenantId);
  await db.execute(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await db.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  res.json(rows[0]);
}));

// GET /api/tenants/email-config — admin only. Never returns the raw SMTP password,
// only whether one is already set (so the UI can show "•••• (sin cambios)").
router.get('/email-config', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });

  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM tenant_email_config WHERE tenant_id = ?', [tenantId]);
  const cfg = rows[0] || {};
  res.json({
    manager_email:  cfg.manager_email  || '',
    manager_name:   cfg.manager_name   || '',
    smtp_host:      cfg.smtp_host      || '',
    smtp_port:      cfg.smtp_port      || 587,
    smtp_secure:    !!cfg.smtp_secure,
    smtp_user:      cfg.smtp_user      || '',
    smtp_from_name: cfg.smtp_from_name || '',
    has_smtp_pass:  !!cfg.smtp_pass,
  });
}));

// PUT /api/tenants/email-config — admin only
router.put('/email-config', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });

  const {
    manager_email, manager_name, smtp_host, smtp_port, smtp_secure,
    smtp_user, smtp_pass, smtp_from_name,
  } = req.body;

  if (!manager_email) return res.status(400).json({ error: 'Correo del encargado requerido' });
  if (!smtp_user)     return res.status(400).json({ error: 'Correo remitente (SMTP) requerido' });

  const db = getDB();
  const [existing] = await db.execute('SELECT tenant_id, smtp_pass FROM tenant_email_config WHERE tenant_id = ?', [tenantId]);

  if (existing.length === 0) {
    if (!smtp_pass) return res.status(400).json({ error: 'Contraseña SMTP requerida' });
    await db.execute(
      `INSERT INTO tenant_email_config
        (tenant_id, manager_email, manager_name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, manager_email, manager_name || null, smtp_host || null,
       Number(smtp_port) || 587, smtp_secure ? 1 : 0, smtp_user, smtp_pass, smtp_from_name || null]
    );
  } else {
    const fields = ['manager_email = ?', 'manager_name = ?', 'smtp_host = ?', 'smtp_port = ?', 'smtp_secure = ?', 'smtp_user = ?', 'smtp_from_name = ?'];
    const values = [manager_email, manager_name || null, smtp_host || null, Number(smtp_port) || 587, smtp_secure ? 1 : 0, smtp_user, smtp_from_name || null];
    if (smtp_pass) { fields.push('smtp_pass = ?'); values.push(smtp_pass); }
    values.push(tenantId);
    await db.execute(`UPDATE tenant_email_config SET ${fields.join(', ')} WHERE tenant_id = ?`, values);
  }

  res.json({ success: true });
}));

export default router;

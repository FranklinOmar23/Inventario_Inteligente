import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { sendRequisitionEmail } from '../services/email.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: PurchaseOrders
 *   description: Órdenes de compra generadas por stock bajo
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Listar todas las órdenes de compra activas
 *     tags: [PurchaseOrders]
 *     responses:
 *       200:
 *         description: Lista de órdenes de compra
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/PurchaseOrder' }
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM purchase_orders WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  res.json(rows);
}));

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Obtener una orden de compra por ID
 *     tags: [PurchaseOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Orden encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PurchaseOrder' }
 *       404:
 *         description: No encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Crear una orden de compra
 *     tags: [PurchaseOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id]
 *             properties:
 *               category_id:        { type: string, format: uuid }
 *               category_name:      { type: string }
 *               quantity_suggested: { type: integer, default: 1 }
 *               notes:              { type: string }
 *     responses:
 *       201:
 *         description: Orden creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PurchaseOrder' }
 *       409:
 *         description: Ya existe una orden pendiente para esa categoría
 */
router.post('/', asyncHandler(async (req, res) => {
  const { category_id, category_name, quantity_suggested, notes } = req.body;
  if (!category_id) return res.status(400).json({ error: 'Categoría requerida' });

  const db = getDB();
  const [existing] = await db.execute(
    "SELECT id FROM purchase_orders WHERE category_id = ? AND status = 'pending' AND deleted_at IS NULL",
    [category_id]
  );
  if (existing.length > 0) {
    return res.status(409).json({
      error: 'Ya existe una orden pendiente para esta categoría',
      existing_id: existing[0].id,
    });
  }

  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO purchase_orders (id, category_id, category_name, quantity_suggested, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, category_id, category_name || '', Number(quantity_suggested) || 1, 'pending', notes || null]
  );
  const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Actualizar estado o notas de una orden de compra
 *     tags: [PurchaseOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [pending, approved, rejected, completed] }
 *               notes:  { type: string }
 *     responses:
 *       200:
 *         description: Orden actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PurchaseOrder' }
 *       404:
 *         description: No encontrada
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const db = getDB();

  const [existing] = await db.execute(
    'SELECT id FROM purchase_orders WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

  await db.execute(
    'UPDATE purchase_orders SET status = ?, notes = ? WHERE id = ?',
    [status, notes || null, req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) una orden de compra
 *     tags: [PurchaseOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       404:
 *         description: No encontrada
 */
// GET /api/purchase-orders/manager-config  — returns default manager info from env
router.get('/manager-config', asyncHandler(async (req, res) => {
  res.json({
    email: process.env.MANAGER_EMAIL || '',
    name:  process.env.MANAGER_NAME  || '',
  });
}));

// POST /api/purchase-orders/send-requisition
router.post('/send-requisition', asyncHandler(async (req, res) => {
  const { to, manager_name, sender_name, motive, items, notes } = req.body;

  if (!to)            return res.status(400).json({ error: 'Correo del destinatario requerido' });
  if (!manager_name)  return res.status(400).json({ error: 'Nombre del encargado requerido' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Se requiere al menos un item' });

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: 'Correo no configurado. Agrega SMTP_USER y SMTP_PASS en el .env del servidor.' });
  }

  await sendRequisitionEmail({
    to,
    managerName: manager_name,
    senderName:  sender_name || 'Sistema InvenAI',
    motive:      motive || 'reposición de equipos',
    items,
    notes,
  });

  res.json({ success: true, message: `Requisición enviada a ${to}` });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM purchase_orders WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

  await db.execute('UPDATE purchase_orders SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Historial de actividades del inventario
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Listar registros de actividad (con filtros opcionales)
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filtrar por acción (entry, checkout, update, delete, etc.)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca en nombre del ítem, usuario y detalles
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200:
 *         description: Lista de registros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ActivityLog' }
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const { action, search, item_id, limit = 100 } = req.query;
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;

  let sql = 'SELECT * FROM activity_logs WHERE deleted_at IS NULL';
  const params = [];

  if (item_id)                    { sql += ' AND item_id = ?';   params.push(item_id); }
  if (action && action !== 'all') { sql += ' AND action = ?';    params.push(action); }
  // Restrict logs to items belonging to the user's branch
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

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Crear registro de actividad
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:          { type: string, example: entry }
 *               item_id:         { type: string, format: uuid }
 *               item_name:       { type: string }
 *               category_name:   { type: string }
 *               department_name: { type: string }
 *               quantity:        { type: integer }
 *               performed_by:    { type: string }
 *               performed_by_id: { type: string, format: uuid }
 *               checked_out_to:  { type: string }
 *               details:         { type: string }
 *               timestamp:       { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Registro creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 */
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
       quantity, performed_by, performed_by_id, checked_out_to, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, action, item_id || null, item_name || '',
    category_name || '', department_name || '',
    Number(quantity) || 1, performed_by || '',
    performed_by_id || null, checked_out_to || null,
    details || '', ts,
  ]);

  res.status(201).json({ id });
}));

/**
 * @swagger
 * /api/logs/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) un registro de actividad
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       404:
 *         description: No encontrado
 */
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

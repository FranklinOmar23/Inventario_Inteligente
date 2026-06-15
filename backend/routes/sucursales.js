import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Sucursales
 *   description: Gestión de sucursales / sedes
 */

/**
 * @swagger
 * /api/sucursales:
 *   get:
 *     summary: Listar todas las sucursales activas
 *     tags: [Sucursales]
 *     responses:
 *       200:
 *         description: Lista de sucursales
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;
  let sql = 'SELECT * FROM sucursales WHERE deleted_at IS NULL';
  const params = [];
  if (forcedSucursal) { sql += ' AND id = ?'; params.push(forcedSucursal); }
  sql += ' ORDER BY name';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

/**
 * @swagger
 * /api/sucursales/{id}:
 *   get:
 *     summary: Obtener una sucursal por ID
 *     tags: [Sucursales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sucursal encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM sucursales WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/sucursales:
 *   post:
 *     summary: Crear una sucursal
 *     tags: [Sucursales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:    { type: string }
 *               address: { type: string }
 *               manager: { type: string }
 *               phone:   { type: string }
 *     responses:
 *       201:
 *         description: Sucursal creada
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, address, manager, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO sucursales (id, name, address, manager, phone) VALUES (?, ?, ?, ?, ?)',
    [id, name, address || null, manager || '', phone || '']
  );

  // Auto-create default "General" department for every new sucursal
  const deptId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name) VALUES (?, ?, ?, ?, ?, ?)',
    [deptId, 'General', '', '', id, name]
  );

  const [rows] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

/**
 * @swagger
 * /api/sucursales/{id}:
 *   put:
 *     summary: Actualizar una sucursal
 *     tags: [Sucursales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sucursal actualizada
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, address, manager, phone } = req.body;
  const db = getDB();

  const [existing] = await db.execute(
    'SELECT id FROM sucursales WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

  await db.execute(
    'UPDATE sucursales SET name = ?, address = ?, manager = ?, phone = ? WHERE id = ?',
    [name, address || null, manager || '', phone || '', req.params.id]
  );

  // Propagate name change to departments and inventory_items
  if (name) {
    await db.execute(
      'UPDATE departments SET sucursal_name = ? WHERE sucursal_id = ?',
      [name, req.params.id]
    );
    await db.execute(
      'UPDATE inventory_items SET sucursal_name = ? WHERE sucursal_id = ? AND deleted_at IS NULL',
      [name, req.params.id]
    );
  }

  const [rows] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/sucursales/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) una sucursal
 *     tags: [Sucursales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Eliminada
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM sucursales WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

  await db.execute('UPDATE sucursales SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

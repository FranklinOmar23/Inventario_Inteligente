import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Gestión de departamentos
 */

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Listar todos los departamentos activos
 *     tags: [Departments]
 *     responses:
 *       200:
 *         description: Lista de departamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Department' }
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  // Non-admin users with assigned sucursal only see departments of their branch
  const forcedSucursal = req.user.role !== 'admin' ? req.user.sucursal_id : null;
  const sucursal_id = forcedSucursal || req.query.sucursal_id || null;
  let sql = 'SELECT * FROM departments WHERE deleted_at IS NULL';
  const params = [];
  if (sucursal_id) { sql += ' AND sucursal_id = ?'; params.push(sucursal_id); }
  sql += ' ORDER BY sucursal_name, name';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Obtener un departamento por ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Departamento encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Department' }
 *       404:
 *         description: No encontrado
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM departments WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Crear un departamento
 *     tags: [Departments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string }
 *               description: { type: string }
 *               manager:     { type: string }
 *     responses:
 *       201:
 *         description: Departamento creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Department' }
 *       400:
 *         description: Nombre requerido
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, manager, sucursal_id, sucursal_name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO departments (id, name, description, manager, sucursal_id, sucursal_name) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, description || '', manager || '', sucursal_id || null, sucursal_name || '']
  );
  const [rows] = await db.execute('SELECT * FROM departments WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Actualizar un departamento
 *     tags: [Departments]
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
 *               name:        { type: string }
 *               description: { type: string }
 *               manager:     { type: string }
 *     responses:
 *       200:
 *         description: Departamento actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Department' }
 *       404:
 *         description: No encontrado
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, manager, sucursal_id, sucursal_name } = req.body;
  const db = getDB();

  const [existing] = await db.execute(
    'SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

  await db.execute(
    'UPDATE departments SET name = ?, description = ?, manager = ?, sucursal_id = ?, sucursal_name = ? WHERE id = ?',
    [name, description || '', manager || '', sucursal_id || null, sucursal_name || '', req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM departments WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}));

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) un departamento
 *     tags: [Departments]
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
    'SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

  await db.execute(
    'UPDATE departments SET deleted_at = NOW() WHERE id = ?',
    [req.params.id]
  );
  res.json({ success: true });
}));

export default router;

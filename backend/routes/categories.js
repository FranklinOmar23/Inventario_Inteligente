import { Router } from 'express';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toBool = r => ({
  ...r,
  requires_asset_tag: !!r.requires_asset_tag,
  requires_unique_id: !!r.requires_unique_id,
});

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Gestión de categorías de inventario
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Listar todas las categorías activas
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Category' }
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name');
  res.json(rows.map(toBool));
}));

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Obtener una categoría por ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Category' }
 *       404:
 *         description: No encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(toBool(rows[0]));
}));

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Crear una categoría
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:                { type: string }
 *               requires_asset_tag:  { type: boolean }
 *               requires_unique_id:  { type: boolean }
 *               minimum_stock:       { type: integer, default: 5 }
 *     responses:
 *       201:
 *         description: Categoría creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Category' }
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, requires_asset_tag = false, requires_unique_id = false, minimum_stock = 5 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const db = getDB();
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock) VALUES (?, ?, ?, ?, ?)',
    [id, name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0, Number(minimum_stock) || 5]
  );
  const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
  res.status(201).json(toBool(rows[0]));
}));

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Actualizar una categoría
 *     tags: [Categories]
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
 *               name:                { type: string }
 *               requires_asset_tag:  { type: boolean }
 *               requires_unique_id:  { type: boolean }
 *               minimum_stock:       { type: integer }
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Category' }
 *       404:
 *         description: No encontrada
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, requires_asset_tag, requires_unique_id, minimum_stock } = req.body;
  const db = getDB();

  const [existing] = await db.execute(
    'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });

  await db.execute(
    'UPDATE categories SET name = ?, requires_asset_tag = ?, requires_unique_id = ?, minimum_stock = ? WHERE id = ?',
    [name, requires_asset_tag ? 1 : 0, requires_unique_id ? 1 : 0, Number(minimum_stock) || 5, req.params.id]
  );
  const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(toBool(rows[0]));
}));

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Eliminar (soft delete) una categoría
 *     tags: [Categories]
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
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  const [existing] = await db.execute(
    'SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });

  await db.execute('UPDATE categories SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;

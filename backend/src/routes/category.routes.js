import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Gestión de categorías de inventario
 */
export function categoryRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/categories:
   *   get:
   *     summary: Listar categorías del tenant
   *     tags: [Categories]
   *     responses:
   *       200:
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/Category' }
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.get('/:id', asyncHandler(ctrl.getById));

  /** @swagger
   * /api/categories:
   *   post:
   *     summary: Crear categoría
   *     tags: [Categories]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:               { type: string }
   *               requires_asset_tag: { type: boolean }
   *               requires_unique_id: { type: boolean }
   *               minimum_stock:      { type: integer }
   *               parent_id:          { type: string, format: uuid, nullable: true }
   */
  router.post('/',    asyncHandler(ctrl.create));
  router.put('/:id',  asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

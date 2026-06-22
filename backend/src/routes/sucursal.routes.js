import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Sucursales
 *   description: Gestión de sucursales
 */
export function sucursalRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/sucursales:
   *   get:
   *     summary: Listar sucursales
   *     tags: [Sucursales]
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.get('/:id', asyncHandler(ctrl.getById));

  /** @swagger
   * /api/sucursales:
   *   post:
   *     summary: Crear sucursal (respeta límite del plan)
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
   */
  router.post('/',    asyncHandler(ctrl.create));
  router.put('/:id',  asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

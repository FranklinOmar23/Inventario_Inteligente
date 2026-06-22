import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Historial de actividad
 */
export function activityLogRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/logs:
   *   get:
   *     summary: Listar entradas de historial
   *     tags: [Logs]
   *     parameters:
   *       - in: query
   *         name: action
   *         schema: { type: string }
   *       - in: query
   *         name: item_id
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 100 }
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.post('/',   asyncHandler(ctrl.create));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

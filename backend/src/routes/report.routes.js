import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reportes y estadísticas
 */
export function reportRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/reports/summary:
   *   get:
   *     summary: Resumen general del inventario (totales, valor)
   *     tags: [Reports]
   */
  router.get('/summary',     asyncHandler(ctrl.summary));
  router.get('/by-status',   asyncHandler(ctrl.byStatus));
  router.get('/by-category', asyncHandler(ctrl.byCategory));
  router.get('/by-sucursal', asyncHandler(ctrl.bySucursal));
  router.get('/activity',    asyncHandler(ctrl.activity));
  router.get('/by-estante',  asyncHandler(ctrl.byEstante));

  /** @swagger
   * /api/reports/exits:
   *   get:
   *     summary: Resumen de salidas (solo tenants no físicos)
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: days
   *         schema: { type: integer, default: 30 }
   */
  router.get('/exits',       asyncHandler(ctrl.exits));
  router.get('/top-items',   asyncHandler(ctrl.topItems));

  return router;
}

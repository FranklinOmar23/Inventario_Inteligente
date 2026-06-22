import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Estantes
 *   description: Gestión de estantes y contenedores de almacenamiento
 */
export function estanteRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/estantes:
   *   get:
   *     summary: Listar estantes con conteo de ítems
   *     tags: [Estantes]
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.post('/',   asyncHandler(ctrl.create));
  router.put('/:id', asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

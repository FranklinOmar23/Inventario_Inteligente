import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Gestión de departamentos
 */
export function departmentRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/departments:
   *   get:
   *     summary: Listar departamentos (filtrable por sucursal)
   *     tags: [Departments]
   *     parameters:
   *       - in: query
   *         name: sucursal_id
   *         schema: { type: string, format: uuid }
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.get('/:id', asyncHandler(ctrl.getById));
  router.post('/',    asyncHandler(ctrl.create));
  router.put('/:id',  asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

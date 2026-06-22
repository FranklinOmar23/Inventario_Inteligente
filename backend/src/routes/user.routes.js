import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios del tenant (solo administradores)
 */
export function userRouter(ctrl) {
  const router = Router();
  router.use(authenticate, requireAdmin);

  /** @swagger
   * /api/users:
   *   get:
   *     summary: Listar usuarios del tenant
   *     tags: [Users]
   */
  router.get('/',    asyncHandler(ctrl.list));

  /** @swagger
   * /api/users:
   *   post:
   *     summary: Crear usuario (respeta límite del plan)
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, full_name]
   *             properties:
   *               email:       { type: string, format: email }
   *               password:    { type: string, minLength: 6 }
   *               full_name:   { type: string }
   *               role:        { type: string, enum: [admin, user], default: user }
   *               permissions: { type: array, items: { type: string } }
   *               sucursal_id: { type: string, format: uuid, nullable: true }
   */
  router.post('/',    asyncHandler(ctrl.create));
  router.put('/:id',  asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

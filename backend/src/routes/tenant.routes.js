import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Gestión del tenant actual
 */
export function tenantRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/tenants/me:
   *   get:
   *     summary: Obtener datos del tenant del usuario autenticado
   *     tags: [Tenants]
   */
  router.get('/me',  asyncHandler(ctrl.me));
  router.put('/me',  asyncHandler(ctrl.update));

  /** @swagger
   * /api/tenants/email-config:
   *   get:
   *     summary: Obtener configuración SMTP (nunca devuelve contraseña, solo has_smtp_pass)
   *     tags: [Tenants]
   */
  router.get('/email-config', asyncHandler(ctrl.getEmailConfig));
  router.put('/email-config', asyncHandler(ctrl.updateEmailConfig));

  return router;
}

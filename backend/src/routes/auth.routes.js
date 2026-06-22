import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y registro de usuarios
 */
export function authRouter(ctrl) {
  const router = Router();

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Iniciar sesión
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:    { type: string, format: email }
   *               password: { type: string, minLength: 6 }
   *     responses:
   *       200:
   *         description: Token JWT y datos del usuario
   *       401:
   *         description: Credenciales incorrectas
   */
  router.post('/login', asyncHandler(ctrl.login));

  /**
   * @swagger
   * /api/auth/setup-tenant:
   *   post:
   *     summary: Registrar empresa + usuario administrador (wizard de onboarding)
   *     tags: [Auth]
   *     security: []
   *     responses:
   *       201:
   *         description: Empresa y admin creados, token JWT devuelto
   */
  router.post('/setup-tenant', asyncHandler(ctrl.setupTenant));

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Obtener datos del usuario autenticado
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Datos del usuario
   */
  router.get('/me', authenticate, asyncHandler(ctrl.me));

  /**
   * @swagger
   * /api/auth/change-password:
   *   put:
   *     summary: Cambiar contraseña propia
   *     tags: [Auth]
   */
  router.put('/change-password', authenticate, asyncHandler(ctrl.changePassword));

  router.post('/reset-password-request', ctrl.resetPasswordRequest);

  return router;
}

import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Suscripciones y pagos con Stripe
 */
export function billingRouter(ctrl) {
  const router = Router();

  /** @swagger
   * /api/billing/info:
   *   get:
   *     summary: Información de plan y facturación del tenant
   *     tags: [Billing]
   */
  router.get('/info', authenticate, asyncHandler(ctrl.info));

  /** @swagger
   * /api/billing/create-checkout-session:
   *   post:
   *     summary: Crear sesión de pago en Stripe Checkout
   *     tags: [Billing]
   */
  router.post('/create-checkout-session', authenticate, asyncHandler(ctrl.createCheckoutSession));

  // Webhook: raw body registered in server.js BEFORE express.json()
  router.post('/webhook', asyncHandler(ctrl.webhook));

  return router;
}

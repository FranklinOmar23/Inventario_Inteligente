import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Análisis de imágenes y búsquedas con IA (OpenRouter)
 */
export function aiRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/ai/detect-image:
   *   post:
   *     summary: Detectar datos de dispositivo desde una imagen
   *     tags: [AI]
   */
  router.post('/detect-image',   asyncHandler(ctrl.detectImage));

  /** @swagger
   * /api/ai/identify-model:
   *   post:
   *     summary: Identificar modelo/marca desde código escaneado
   *     tags: [AI]
   */
  router.post('/identify-model', asyncHandler(ctrl.identifyModel));

  /** @swagger
   * /api/ai/detect-invoice:
   *   post:
   *     summary: Extraer ítems de una factura/recibo para entrada masiva
   *     tags: [AI]
   */
  router.post('/detect-invoice', asyncHandler(ctrl.detectInvoice));
  router.post('/search',           asyncHandler(ctrl.search));
  router.post('/search-by-image',  asyncHandler(ctrl.searchByImage));
  router.post('/report-analysis',  asyncHandler(ctrl.analyzeReport));
  router.post('/chat',             asyncHandler(ctrl.chat));

  return router;
}

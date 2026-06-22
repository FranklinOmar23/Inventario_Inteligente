import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { uploadMiddleware, uploadController } from '../controllers/upload.controller.js';

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Subida de imágenes
 */
export function uploadRouter() {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/upload:
   *   post:
   *     summary: Subir imagen (multipart/form-data, campo "file")
   *     tags: [Upload]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: URL pública del archivo subido
   */
  router.post('/', uploadMiddleware, uploadController.upload);

  return router;
}

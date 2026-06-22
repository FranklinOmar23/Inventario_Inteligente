import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: PurchaseOrders
 *   description: Órdenes de compra y envío de requisiciones por correo
 */
export function purchaseOrderRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /** @swagger
   * /api/purchase-orders/manager-config:
   *   get:
   *     summary: Obtener configuración del encargado de compras (email, nombre, si está configurado el SMTP)
   *     tags: [PurchaseOrders]
   */
  router.get('/manager-config',   asyncHandler(ctrl.managerConfig));

  /** @swagger
   * /api/purchase-orders/send-requisition:
   *   post:
   *     summary: Enviar email de requisición de compra al encargado
   *     tags: [PurchaseOrders]
   */
  router.post('/send-requisition', asyncHandler(ctrl.sendRequisition));

  /** @swagger
   * /api/purchase-orders:
   *   get:
   *     summary: Listar órdenes de compra del tenant
   *     tags: [PurchaseOrders]
   */
  router.get('/',    asyncHandler(ctrl.list));
  router.get('/:id', asyncHandler(ctrl.getById));

  /** @swagger
   * /api/purchase-orders:
   *   post:
   *     summary: Crear orden de compra (una por categoría pendiente)
   *     tags: [PurchaseOrders]
   */
  router.post('/',    asyncHandler(ctrl.create));
  router.put('/:id',  asyncHandler(ctrl.update));
  router.delete('/:id', asyncHandler(ctrl.remove));

  return router;
}

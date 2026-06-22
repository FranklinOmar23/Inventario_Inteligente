import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Gestión de ítems de inventario
 */
export function inventoryRouter(ctrl) {
  const router = Router();
  router.use(authenticate);

  /**
   * @swagger
   * /api/inventory:
   *   get:
   *     summary: Listar ítems de inventario
   *     tags: [Inventory]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [in_stock, checked_out, maintenance, retired, revision, damaged] }
   *       - in: query
   *         name: category_id
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 200 }
   *     responses:
   *       200:
   *         description: Lista de ítems
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/InventoryItem' }
   */
  router.get('/', asyncHandler(ctrl.list));

  /** @swagger
   * /api/inventory/damaged:
   *   get:
   *     summary: Ítem en tablero (dañados, mantenimiento, retirados)
   *     tags: [Inventory]
   */
  router.get('/damaged', asyncHandler(ctrl.damaged));

  /** @swagger
   * /api/inventory/bulk-status:
   *   post:
   *     summary: Cambiar estado de múltiples ítems a la vez
   *     tags: [Inventory]
   */
  router.post('/bulk-status', asyncHandler(ctrl.bulkSetStatus));

  /**
   * @swagger
   * /api/inventory/bulk:
   *   post:
   *     summary: Registrar múltiples ítems de una vez (p.ej. desde factura IA)
   *     tags: [Inventory]
   */
  router.post('/bulk', asyncHandler(ctrl.bulkCreate));

  /**
   * @swagger
   * /api/inventory/{id}:
   *   get:
   *     summary: Obtener ítem por ID
   *     tags: [Inventory]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Ítem }
   *       404: { description: No encontrado }
   */
  router.get('/:id', asyncHandler(ctrl.getById));

  /**
   * @swagger
   * /api/inventory:
   *   post:
   *     summary: Registrar entrada de ítem
   *     tags: [Inventory]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:            { type: string }
   *               category_id:     { type: string, format: uuid }
   *               department_id:   { type: string, format: uuid }
   *               quantity:        { type: integer, default: 1 }
   *               unit_cost:       { type: number }
   *               entry_date:      { type: string, format: date }
   *     responses:
   *       201: { description: Ítem registrado }
   */
  router.post('/', asyncHandler(ctrl.create));

  /** @swagger
   * /api/inventory/{id}:
   *   put:
   *     summary: Actualizar ítem
   *     tags: [Inventory]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Ítem actualizado }
   *       404: { description: No encontrado }
   */
  router.put('/:id', asyncHandler(ctrl.update));

  /** @swagger
   * /api/inventory/{id}/transfer:
   *   post:
   *     summary: Traspasar ítem a otro departamento/sucursal
   *     tags: [Inventory]
   */
  router.post('/:id/transfer', asyncHandler(ctrl.transfer));

  /** @swagger
   * /api/inventory/{id}/status:
   *   patch:
   *     summary: Cambiar estado de N unidades de un ítem
   *     tags: [Inventory]
   */
  router.patch('/:id/status', asyncHandler(ctrl.changeStatus));

  /** @swagger
   * /api/inventory/{id}/exit:
   *   post:
   *     summary: Salida permanente de stock (venta, consumo, descarte)
   *     tags: [Inventory]
   */
  router.post('/:id/exit', asyncHandler(ctrl.exit));

  /** @swagger
   * /api/inventory/{id}/notes:
   *   patch:
   *     summary: Actualizar notas/observaciones del ítem
   *     tags: [Inventory]
   */
  router.patch('/:id/notes', asyncHandler(ctrl.updateNotes));

  /** @swagger
   * /api/inventory/{id}/restore:
   *   patch:
   *     summary: Restaurar ítem del tablero a En Stock
   *     tags: [Inventory]
   */
  router.patch('/:id/restore', asyncHandler(ctrl.restore));

  /** @swagger
   * /api/inventory/{id}:
   *   delete:
   *     summary: Soft-delete de ítem
   *     tags: [Inventory]
   */
  router.delete('/:id', asyncHandler(ctrl.remove));

  /** @swagger
   * /api/inventory/{id}/permanent:
   *   delete:
   *     summary: Eliminar permanentemente un ítem dado de baja
   *     tags: [Inventory]
   */
  router.delete('/:id/permanent', asyncHandler(ctrl.permanentDelete));

  return router;
}

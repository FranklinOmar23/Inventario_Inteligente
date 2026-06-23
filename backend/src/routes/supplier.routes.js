import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

export function supplierRouter(ctrl) {
  const router = Router();

  router.use(authenticate);

  router.get('/',              asyncHandler(ctrl.list));
  router.get('/dgii/:query',   asyncHandler(ctrl.dgiiLookup));
  router.get('/:id',           asyncHandler(ctrl.get));
  router.post('/',             asyncHandler(ctrl.create));
  router.put('/:id',           asyncHandler(ctrl.update));
  router.delete('/:id',        asyncHandler(ctrl.remove));

  return router;
}

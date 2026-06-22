import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';

export function machineRouter(ctrl) {
  const r = Router();
  r.use(authenticate);
  r.get('/',              asyncHandler((req, res) => ctrl.list(req, res)));
  r.post('/',             asyncHandler((req, res) => ctrl.create(req, res)));
  r.put('/:id',           asyncHandler((req, res) => ctrl.update(req, res)));
  r.patch('/:id/status',  asyncHandler((req, res) => ctrl.toggleStatus(req, res)));
  r.delete('/:id',        asyncHandler((req, res) => ctrl.remove(req, res)));
  return r;
}

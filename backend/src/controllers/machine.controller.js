import { ValidationError, NotFoundError } from '../errors/AppError.js';

export function machineController(repo) {
  return {
    async list(req, res) {
      res.json(await repo.findAllByTenant(req.user.tenant_id));
    },

    async create(req, res) {
      if (!req.body.department) throw new ValidationError('department es requerido');
      res.status(201).json(await repo.create(req.user.tenant_id, req.body));
    },

    async update(req, res) {
      if (!req.body.department) throw new ValidationError('department es requerido');
      const row = await repo.update(req.params.id, req.user.tenant_id, req.body);
      if (!row) throw new NotFoundError();
      res.json(row);
    },

    async toggleStatus(req, res) {
      const row = await repo.toggleStatus(req.params.id, req.user.tenant_id);
      if (!row) throw new NotFoundError();
      res.json(row);
    },

    async remove(req, res) {
      const ok = await repo.softDeleteByTenant(req.params.id, req.user.tenant_id);
      if (!ok) throw new NotFoundError();
      res.json({ ok: true });
    },
  };
}

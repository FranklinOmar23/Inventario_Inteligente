export function machineController(repo) {
  return {
    async list(req, res) {
      const rows = await repo.findAllByTenant(req.user.tenant_id);
      res.json(rows);
    },

    async create(req, res) {
      if (!req.body.department) return res.status(400).json({ error: 'department is required' });
      const row = await repo.create(req.user.tenant_id, req.body);
      res.status(201).json(row);
    },

    async update(req, res) {
      if (!req.body.department) return res.status(400).json({ error: 'department is required' });
      const row = await repo.update(req.params.id, req.user.tenant_id, req.body);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    },

    async toggleStatus(req, res) {
      const row = await repo.toggleStatus(req.params.id, req.user.tenant_id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    },

    async remove(req, res) {
      const ok = await repo.softDelete(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    },
  };
}

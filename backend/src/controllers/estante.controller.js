export const estanteController = (service) => ({
  list: async (req, res) => {
    res.json(await service.list(req.user.tenant_id, req.user, req.query.sucursal_id));
  },
  create: async (req, res) => {
    res.status(201).json(await service.create(req.user.tenant_id, req.body));
  },
  update: async (req, res) => {
    await service.update(req.params.id, req.body);
    res.json({ ok: true });
  },
  remove: async (req, res) => {
    await service.remove(req.params.id);
    res.json({ ok: true });
  },
});

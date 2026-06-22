export const sucursalController = (service) => ({
  list: async (req, res) => {
    res.json(await service.list(req.user.tenant_id, req.user));
  },
  getById: async (req, res) => {
    res.json(await service.getById(req.params.id, req.user.tenant_id));
  },
  create: async (req, res) => {
    res.status(201).json(await service.create(req.user.tenant_id, req.body));
  },
  update: async (req, res) => {
    res.json(await service.update(req.params.id, req.user.tenant_id, req.body));
  },
  remove: async (req, res) => {
    await service.remove(req.params.id, req.user.tenant_id);
    res.json({ success: true });
  },
});

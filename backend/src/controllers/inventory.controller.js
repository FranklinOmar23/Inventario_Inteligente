export const inventoryController = (service) => ({
  list: async (req, res) => {
    const items = await service.list(req.user.tenant_id, req.query, req.user);
    res.json(items);
  },

  damaged: async (req, res) => {
    const items = await service.getDamaged(req.user.tenant_id, req.query.limit);
    res.json(items);
  },

  getById: async (req, res) => {
    const item = await service.getById(req.params.id, req.user.tenant_id);
    res.json(item);
  },

  create: async (req, res) => {
    const item = await service.create(req.user.tenant_id, req.body);
    res.status(201).json(item);
  },

  bulkCreate: async (req, res) => {
    const items = await service.bulkCreate(req.user.tenant_id, req.body.items);
    res.status(201).json(items);
  },

  update: async (req, res) => {
    const item = await service.update(req.params.id, req.user.tenant_id, req.body);
    res.json(item);
  },

  transfer: async (req, res) => {
    const result = await service.transfer(req.params.id, req.user.tenant_id, req.body);
    res.json(result);
  },

  changeStatus: async (req, res) => {
    const result = await service.changeStatus(req.params.id, req.user.tenant_id, req.body);
    res.json(result);
  },

  exit: async (req, res) => {
    const result = await service.exit(req.params.id, req.user.tenant_id, req.body);
    res.json(result);
  },

  bulkSetStatus: async (req, res) => {
    const result = await service.bulkSetStatus(req.user.tenant_id, req.body);
    res.json(result);
  },

  restore: async (req, res) => {
    const result = await service.restore(req.params.id, req.user.tenant_id, req.body);
    res.json(result);
  },

  updateNotes: async (req, res) => {
    await service.updateNotes(req.params.id, req.body.notes);
    res.json({ success: true });
  },

  remove: async (req, res) => {
    await service.softDelete(req.params.id, req.user.tenant_id);
    res.json({ success: true });
  },

  permanentDelete: async (req, res) => {
    await service.permanentDelete(req.params.id);
    res.json({ success: true });
  },
});

export const activityLogController = (service) => ({
  list: async (req, res) => {
    res.json(await service.list(req.user.tenant_id, req.user, req.query));
  },
  create: async (req, res) => {
    res.status(201).json(await service.create(req.user.tenant_id, req.body));
  },
  remove: async (req, res) => {
    await service.remove(req.params.id);
    res.json({ success: true });
  },
});

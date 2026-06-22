export const tenantController = (service) => ({
  me: async (req, res) => {
    res.json(await service.getMe(req.user.tenant_id));
  },
  update: async (req, res) => {
    res.json(await service.update(req.user.tenant_id, req.user.id, req.user.role, req.body));
  },
  getEmailConfig: async (req, res) => {
    res.json(await service.getEmailConfig(req.user.tenant_id, req.user.role));
  },
  updateEmailConfig: async (req, res) => {
    await service.updateEmailConfig(req.user.tenant_id, req.user.role, req.body);
    res.json({ success: true });
  },
});

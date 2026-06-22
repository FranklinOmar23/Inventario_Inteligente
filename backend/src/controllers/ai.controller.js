export const aiController = (service, { inventoryRepo, tenantRepo } = {}) => ({
  detectImage: async (req, res) => {
    res.json(await service.detectImage(req.body));
  },
  identifyModel: async (req, res) => {
    res.json(await service.identifyModel(req.body.code));
  },
  detectInvoice: async (req, res) => {
    res.json(await service.detectInvoice(req.body));
  },
  search: async (req, res) => {
    res.json(await service.search(req.body));
  },
  searchByImage: async (req, res) => {
    res.json(await service.searchByImage(req.body));
  },
  analyzeReport: async (req, res) => {
    res.json(await service.analyzeReport(req.body));
  },
  chat: async (req, res) => {
    const tenantId = req.user.tenant_id;
    const tenant   = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant || !['pro', 'enterprise'].includes(tenant.plan)) {
      return res.status(403).json({ error: 'Inventia requiere plan Pro o Enterprise.' });
    }
    const { message, history } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message requerido.' });
    const snapshot = await inventoryRepo.getSnapshot(tenantId);
    res.json(await service.chat({ message, history, snapshot, companyName: tenant.name }));
  },
});

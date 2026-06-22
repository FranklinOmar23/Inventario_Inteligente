export const reportController = (service) => {
  const scope = (req) => {
    const tenantId   = req.user.tenant_id;
    const sucursalId = req.user.role !== 'admin'
      ? req.user.sucursal_id
      : (req.query.sucursal_id ?? null);
    return { tenantId, sucursalId };
  };

  return {
    summary:    async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.summary(tenantId, sucursalId)); },
    byStatus:   async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.byStatus(tenantId, sucursalId)); },
    byCategory: async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.byCategory(tenantId, sucursalId)); },
    bySucursal: async (req, res) => { res.json(await service.bySucursal(req.user.tenant_id)); },
    activity:   async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.activity(tenantId, sucursalId, req.query.days, req.query.from, req.query.to)); },
    byEstante:  async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.byEstante(tenantId, sucursalId)); },
    exits:      async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.exits(tenantId, sucursalId, req.query.days, req.query.from, req.query.to)); },
    topItems:   async (req, res) => { const { tenantId, sucursalId } = scope(req); res.json(await service.topItems(tenantId, sucursalId)); },
  };
};

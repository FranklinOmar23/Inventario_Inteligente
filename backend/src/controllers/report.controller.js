export const reportController = (service) => {
  const scope = (req) => {
    const tenantId   = req.user.tenant_id;
    const sucursalId = req.user.role !== 'admin'
      ? req.user.sucursal_id
      : (req.query.sucursal_id ?? null);
    const { days, from, to } = req.query;
    return { tenantId, sucursalId, days, from, to };
  };

  return {
    summary:    async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.summary(tenantId, sucursalId, days, from, to)); },
    byStatus:   async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.byStatus(tenantId, sucursalId, days, from, to)); },
    byCategory: async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.byCategory(tenantId, sucursalId, days, from, to)); },
    bySucursal: async (req, res) => { const { tenantId, days, from, to } = scope(req); res.json(await service.bySucursal(tenantId, days, from, to)); },
    activity:   async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.activity(tenantId, sucursalId, days, from, to)); },
    byEstante:  async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.byEstante(tenantId, sucursalId, days, from, to)); },
    exits:      async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.exits(tenantId, sucursalId, days, from, to)); },
    topItems:   async (req, res) => { const { tenantId, sucursalId, days, from, to } = scope(req); res.json(await service.topItems(tenantId, sucursalId, days, from, to)); },
  };
};

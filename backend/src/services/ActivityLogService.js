import { NotFoundError } from '../errors/AppError.js';

export class ActivityLogService {
  constructor(logRepo) {
    this.repo = logRepo;
  }

  async list(tenantId, user, filters) {
    const sucursalId = user.role !== 'admin' ? user.sucursal_id : null;
    return this.repo.search(tenantId, { ...filters, sucursalId });
  }

  async create(tenantId, data) {
    const id = crypto.randomUUID();
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    await this.repo.insert({ ...data, id, timestamp: ts, tenant_id: tenantId });
    return { id };
  }

  async remove(id) {
    const rows = await this.repo.rawQuery('SELECT id FROM activity_logs WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows.length) throw new NotFoundError('Registro no encontrado');
    await this.repo.softDelete(id);
  }
}

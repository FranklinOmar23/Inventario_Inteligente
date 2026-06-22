import { NotFoundError, ValidationError, ForbiddenError } from '../errors/AppError.js';

export class TenantService {
  constructor(tenantRepo) {
    this.repo = tenantRepo;
  }

  async getMe(tenantId) {
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');
    const tenant = await this.repo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');
    return tenant;
  }

  async update(tenantId, userId, role, { name, rnc, inventory_type }) {
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');
    if (role !== 'admin') throw new ForbiddenError('Solo administradores');
    const fields = {};
    if (name)           fields.name           = name;
    if (rnc !== undefined) fields.rnc = rnc ?? null;
    if (inventory_type) fields.inventory_type = inventory_type;
    if (!Object.keys(fields).length) throw new ValidationError('Nada que actualizar');
    await this.repo.updateFields(tenantId, fields);
    return this.repo.findByIdRaw(tenantId);
  }

  async getEmailConfig(tenantId, role) {
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');
    if (role !== 'admin') throw new ForbiddenError('Solo administradores');
    const cfg = (await this.repo.getEmailConfig(tenantId)) ?? {};
    return {
      manager_email:  cfg.manager_email  ?? '',
      manager_name:   cfg.manager_name   ?? '',
      smtp_host:      cfg.smtp_host      ?? '',
      smtp_port:      cfg.smtp_port      ?? 587,
      smtp_secure:    !!cfg.smtp_secure,
      smtp_user:      cfg.smtp_user      ?? '',
      smtp_from_name: cfg.smtp_from_name ?? '',
      has_smtp_pass:  !!cfg.smtp_pass,
    };
  }

  async updateEmailConfig(tenantId, role, data) {
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');
    if (role !== 'admin') throw new ForbiddenError('Solo administradores');
    if (!data.manager_email) throw new ValidationError('Correo del encargado requerido');
    if (!data.smtp_user)     throw new ValidationError('Correo remitente (SMTP) requerido');

    const existing = await this.repo.getEmailConfig(tenantId);
    if (!existing && !data.smtp_pass) throw new ValidationError('Contraseña SMTP requerida');

    await this.repo.upsertEmailConfig(tenantId, data);
  }
}

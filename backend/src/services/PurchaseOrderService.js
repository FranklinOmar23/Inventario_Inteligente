import { ValidationError, NotFoundError, ConflictError } from '../errors/AppError.js';
import { sendRequisitionEmail } from './EmailService.js';

export class PurchaseOrderService {
  constructor(purchaseOrderRepo, tenantRepo) {
    this.repo       = purchaseOrderRepo;
    this.tenantRepo = tenantRepo;
  }

  async getManagerConfig(tenantId) {
    const cfg = (await this.tenantRepo.getEmailConfig(tenantId)) ?? {};
    return {
      email:      cfg.manager_email ?? '',
      name:       cfg.manager_name  ?? '',
      configured: !!(cfg.smtp_user && cfg.smtp_pass),
    };
  }

  async sendRequisition(tenantId, body) {
    const { to, manager_name, sender_name, motive, items, notes } = body;
    if (!to)           throw new ValidationError('Correo del destinatario requerido');
    if (!manager_name) throw new ValidationError('Nombre del encargado requerido');
    if (!Array.isArray(items) || !items.length) throw new ValidationError('Se requiere al menos un item');

    const cfg = await this.tenantRepo.getEmailConfig(tenantId);
    if (!cfg?.smtp_user || !cfg?.smtp_pass) {
      const err = new Error('Correo no configurado. Ve a "Configurar Correo" en Órdenes de Compra para configurarlo.');
      err.status = 503; err.isOperational = true;
      throw err;
    }

    await sendRequisitionEmail({
      to, managerName: manager_name,
      senderName: sender_name ?? cfg.smtp_from_name ?? 'Sistema InvenAI',
      motive: motive ?? 'reposición de equipos',
      items, notes,
      smtp: { host: cfg.smtp_host ?? 'smtp.gmail.com', port: cfg.smtp_port ?? 587, secure: !!cfg.smtp_secure, user: cfg.smtp_user, pass: cfg.smtp_pass, fromName: cfg.smtp_from_name ?? 'InvenAI' },
    });

    return { success: true, message: `Requisición enviada a ${to}` };
  }

  async list(tenantId) {
    return this.repo.findAllForTenant(tenantId);
  }

  async getById(id, tenantId) {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Orden no encontrada');
    return row;
  }

  async create(tenantId, { category_id, category_name, quantity_suggested, notes }) {
    if (!category_id) throw new ValidationError('Categoría requerida');
    const existing = await this.repo.findPendingByCategory(tenantId, category_id);
    if (existing) throw new ConflictError('Ya existe una orden pendiente para esta categoría');
    const id = crypto.randomUUID();
    await this.repo.create({ id, category_id, category_name, quantity_suggested, notes, tenant_id: tenantId });
    return this.repo.findById(id);
  }

  async update(id, tenantId, data) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Orden no encontrada');
    await this.repo.update(id, data);
    return this.repo.findById(id);
  }

  async remove(id, tenantId) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Orden no encontrada');
    await this.repo.softDelete(id);
  }
}

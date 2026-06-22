import bcrypt from 'bcryptjs';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../errors/AppError.js';

export class UserService {
  constructor(userRepo, tenantRepo) {
    this.userRepo   = userRepo;
    this.tenantRepo = tenantRepo;
  }

  async list(tenantId) {
    const rows = await this.userRepo.findAllForTenant(tenantId);
    return rows.map(u => ({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : null }));
  }

  async create(tenantId, { email, password, full_name, role = 'user', permissions = null, sucursal_id = null }) {
    if (!email || !password || !full_name) throw new ValidationError('Nombre, email y contraseña son requeridos');

    const tenant = await this.tenantRepo.findByIdRaw(tenantId);
    const cnt    = await this.userRepo.count({ tenantId });
    if (tenant && cnt >= tenant.max_users) {
      throw new ForbiddenError(`Tu plan permite hasta ${tenant.max_users} usuario(s). Mejora tu plan para agregar más.`);
    }

    const existing = await this.userRepo.findByEmail(email.toLowerCase().trim());
    if (existing) throw new ConflictError('El email ya está registrado');

    const id = crypto.randomUUID();
    await this.userRepo.create({
      id, email: email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(password, 10),
      full_name, role,
      permissions: permissions ? JSON.stringify(permissions) : null,
      sucursal_id: sucursal_id ?? null, tenant_id: tenantId,
    });

    return { id, email: email.toLowerCase().trim(), full_name, role, permissions, sucursal_id, tenant_id: tenantId };
  }

  async update(id, tenantId, { full_name, role, permissions, sucursal_id, password }) {
    const rows = await this.userRepo.rawQuery('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows.length) throw new NotFoundError('Usuario no encontrado');

    if (role === 'user') {
      const adminCnt = await this.userRepo.countAdmins(tenantId, id);
      if (adminCnt === 0) throw new ValidationError('Debe existir al menos un administrador');
    }

    const fields = {};
    if (full_name !== undefined)    fields.full_name    = full_name;
    if (role !== undefined)         fields.role         = role;
    if (permissions !== undefined)  fields.permissions  = permissions ? JSON.stringify(permissions) : null;
    if (sucursal_id !== undefined)  fields.sucursal_id  = sucursal_id ?? null;
    if (password)                   fields.password_hash = bcrypt.hashSync(password, 10);
    if (!Object.keys(fields).length) throw new ValidationError('Nada que actualizar');

    await this.userRepo.updateFields(id, fields);
  }

  async remove(id, requestingUserId, tenantId) {
    if (id === requestingUserId) throw new ValidationError('No puedes eliminarte a ti mismo');
    const rows = await this.userRepo.rawQuery('SELECT role FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows.length) throw new NotFoundError('Usuario no encontrado');
    if (rows[0].role === 'admin') {
      const adminCnt = await this.userRepo.countAdmins(tenantId, id);
      if (adminCnt === 0) throw new ValidationError('Debe existir al menos un administrador');
    }
    await this.userRepo.softDelete(id);
  }
}

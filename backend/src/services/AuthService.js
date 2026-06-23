import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../errors/AppError.js';

export const PLAN_LIMITS = {
  starter:    { max_records: 15000, max_users: 5,  max_sucursales: 3 },
  pro:        { max_records: 30000, max_users: 10, max_sucursales: 5 },
  enterprise: { max_records: 999999, max_users: 999, max_sucursales: 999 },
};

export class AuthService {
  constructor(userRepo, tenantRepo, sucursalRepo, departmentRepo) {
    this.userRepo       = userRepo;
    this.tenantRepo     = tenantRepo;
    this.sucursalRepo   = sucursalRepo;
    this.departmentRepo = departmentRepo;
  }

  signToken(user, tenantId) {
    return jwt.sign(
      {
        id:          user.id,
        email:       user.email,
        full_name:   user.full_name,
        role:        user.role,
        sucursal_id: user.sucursal_id ?? null,
        tenant_id:   tenantId ?? user.tenant_id ?? null,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiry }
    );
  }

  async login(email, password) {
    if (!email || !password) throw new ValidationError('Email y contraseña requeridos');
    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }
    const token = this.signToken(user, user.tenant_id);
    const permissions = user.permissions ? JSON.parse(user.permissions) : null;
    return {
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, permissions, sucursal_id: user.sucursal_id ?? null, tenant_id: user.tenant_id ?? null },
    };
  }

  async setupTenant({ tenant_name, rnc, inventory_type = 'physical', business_type = 'tecnologia', plan = 'starter', full_name, email, password, confirm_password }) {
    if (!tenant_name) throw new ValidationError('Nombre de empresa requerido');
    if (!full_name || !email || !password) throw new ValidationError('Nombre, email y contraseña requeridos');
    if (password.length < 6) throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    if (confirm_password && password !== confirm_password) throw new ValidationError('Las contraseñas no coinciden');

    const normalEmail = email.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(normalEmail);
    if (existing) throw new ConflictError('El email ya está registrado');

    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
    const tenantId = crypto.randomUUID();
    const trialEndsAt = new Date(Date.now() + env.stripe.trialDays * 86_400_000);

    await this.tenantRepo.rawExecute(
      `INSERT INTO tenants (id, name, rnc, inventory_type, business_type, plan, max_records, max_users, max_sucursales, trial_ends_at, billing_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'trialing')`,
      [tenantId, tenant_name, rnc ?? null, inventory_type, business_type, plan, limits.max_records, limits.max_users, limits.max_sucursales, trialEndsAt]
    );

    const sucId = crypto.randomUUID();
    await this.sucursalRepo.create({ id: sucId, name: 'Sede Principal', address: '', manager: full_name, phone: '', tenant_id: tenantId });

    const deptId = crypto.randomUUID();
    await this.departmentRepo.create({ id: deptId, name: 'General', description: '', manager: full_name, sucursal_id: sucId, sucursal_name: 'Sede Principal', tenant_id: tenantId });

    const userId = crypto.randomUUID();
    await this.userRepo.create({ id: userId, email: normalEmail, password_hash: bcrypt.hashSync(password, 10), full_name, role: 'admin', permissions: null, sucursal_id: null, tenant_id: tenantId });

    const user   = { id: userId, email: normalEmail, full_name, role: 'admin', tenant_id: tenantId };
    const tenant = { id: tenantId, name: tenant_name, rnc: rnc ?? null, inventory_type, business_type, plan, trial_ends_at: trialEndsAt, billing_status: 'trialing' };
    const token  = this.signToken(user, tenantId);

    return { token, user: { ...user, permissions: null, sucursal_id: null }, tenant };
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) throw new ValidationError('Contraseña actual y nueva son requeridas');
    if (newPassword.length < 6) throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      throw new UnauthorizedError('La contraseña actual es incorrecta');
    }
    await this.userRepo.updateFields(userId, { password_hash: bcrypt.hashSync(newPassword, 10) });
  }
}

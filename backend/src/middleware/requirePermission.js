import { ForbiddenError } from '../errors/AppError.js';

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!perms.includes(permission)) {
      return next(new ForbiddenError(`Permiso requerido: ${permission}`));
    }
    next();
  };
}

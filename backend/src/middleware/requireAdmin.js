import { ForbiddenError } from '../errors/AppError.js';

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ForbiddenError('Acceso restringido a administradores'));
  }
  next();
}

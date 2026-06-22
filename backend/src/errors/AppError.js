export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.isOperational = true;
  }
}

export class NotFoundError     extends AppError { constructor(m) { super(m ?? 'Recurso no encontrado', 404); } }
export class ValidationError   extends AppError { constructor(m) { super(m, 400); } }
export class ForbiddenError    extends AppError { constructor(m) { super(m ?? 'Acceso denegado', 403); } }
export class ConflictError     extends AppError { constructor(m) { super(m, 409); } }
export class UnauthorizedError extends AppError { constructor(m) { super(m ?? 'No autorizado', 401); } }
export class PaymentError      extends AppError { constructor(m) { super(m, 402); } }

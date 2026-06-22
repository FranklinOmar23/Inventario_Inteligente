export function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.status).json({ error: err.message });
  }
  // Unexpected / programming error — log full stack, never expose internals
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

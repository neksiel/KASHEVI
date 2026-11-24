class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
    });
  }

  if (err && (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR')) {
    return res.status(503).json({
      ok: false,
      error:
        'No se pudo conectar a MySQL en XAMPP o la base de datos kashevi_barbershop no existe aún.',
    });
  }

  console.error('[Kashevi Error]', err);
  return res.status(500).json({
    ok: false,
    error: 'Ocurrió un error interno en el servidor.',
  });
}

module.exports = { AppError, asyncHandler, errorHandler };

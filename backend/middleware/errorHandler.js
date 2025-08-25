export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = 'Validation Error';
    error.errors = err.errors;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    error.statusCode = 409;
    error.message = 'Duplicate entry';
  }

  if (err.code === '23503') { // Foreign key constraint violation
    error.statusCode = 400;
    error.message = 'Referenced record not found';
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.statusCode = 413;
    error.message = 'File too large';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.statusCode = 400;
    error.message = 'Unexpected file field';
  }

  // Rate limit errors
  if (err.status === 429) {
    error.statusCode = 429;
    error.message = 'Too many requests';
  }

  // Send error response
  res.status(error.statusCode).json(error);
};



import { env, isProd } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function notFound(req, res, next) {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, "NOT_FOUND"));
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let code = err.code || null;
  let details = err.details || null;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    statusCode = 409;
    code = "DUPLICATE";
    message = `${field} already exists`;
    details = [{ path: field, message: `${field} is already taken` }];
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  }

  // JWT
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
  }

  // Multer
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    code = "FILE_TOO_LARGE";
    message = "Image must be under 5MB";
  }
  if (err.message === "Only image files are allowed") {
    statusCode = 400;
    code = "INVALID_FILE_TYPE";
    message = err.message;
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    code = "INVALID_FILE";
    message = "Unexpected field";
  }

  // Zod already mapped to AppError, but fallback
  if (err.name === "ZodError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
  }

  // Log — in prod use structured logger; here console
  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  } else if (!isProd) {
    console.warn(`[warn] ${req.method} ${req.originalUrl} ${statusCode} ${message}`);
  }

  // Never leak stack in prod for operational errors
  const response = {
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
    ...(!isProd && err.stack ? { stack: err.stack } : {}),
  };

  // For 500 unexpected, hide details in prod
  if (statusCode === 500 && isProd && !err.isOperational) {
    response.message = "Internal server error";
    delete response.details;
    delete response.stack;
  }

  res.status(statusCode).json(response);
}

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Safe, non-secret values the client may need to recover (e.g. the email
    // address that still needs verification). Never put tokens here.
    this.meta = meta;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

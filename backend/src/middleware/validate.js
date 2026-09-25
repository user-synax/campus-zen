import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const data = source === "query" ? req.query : source === "params" ? req.params : req.body;
      const parsed = schema.parse(data);
      if (source === "query") req.query = parsed;
      else if (source === "params") req.params = parsed;
      else req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({ path: e.path.join("."), message: e.message }));
        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", details));
      }
      next(err);
    }
  };
}

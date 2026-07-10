import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Validates req.body against `schema` and replaces req.body with the
 * parsed (and type-coerced) result. Throws ZodError on failure, which
 * middleware/errorHandler.ts turns into a 422 with field-level detail -
 * so routes using this don't need their own try/catch for shape errors.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as any;
    next();
  };
}

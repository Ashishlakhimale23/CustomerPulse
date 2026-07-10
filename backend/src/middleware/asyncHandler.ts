import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Express doesn't forward rejected promises from async handlers to
 * next() on its own (pre-v5). Every controller in this app is async,
 * so every route registration wraps its handler with this - otherwise
 * a thrown error (e.g. findUniqueOrThrow on a missing id) becomes an
 * unhandled rejection instead of a clean 4xx/5xx response.
 */
export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

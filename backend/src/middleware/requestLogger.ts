import { Request, Response, NextFunction } from "express";

/** method, path, status, duration, and the calling user id when known. */
export function requestLogger(req: Request & { user?: { id: string } }, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const who = req.user?.id ?? "anon";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms user=${who}`);
  });
  next();
}

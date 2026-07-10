import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import { ZodError } from "zod";
import { InvitationError } from "../services/invitation.service";

/** Throw this from a controller/service for any expected, client-facing error. */
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

/**
 * Must be registered LAST, after all routes, in src/index.ts.
 * Every route handler should be wrapped in asyncHandler() so errors land here
 * instead of crashing the process as an unhandled rejection.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// @ts-ignore
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof InvitationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
    if (err.code === "P2002") {
      return res.status(409).json({ error: `Unique constraint violated on: ${(err.meta?.target as string[])?.join(", ")}` });
    }
    if (err.code === "P2003") return res.status(409).json({ error: "Related record does not exist" });
  }

  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Internal server error" });
}

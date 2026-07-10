import { Response, NextFunction } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "./errorHandler";
import { UserRole } from "../generated/prisma/client";

/**
 * Nothing in the controllers checks that a ticket/department/user id in
 * the URL actually belongs to the caller's company - a valid bearer
 * token from Company A could otherwise fetch Company B's ticket just by
 * guessing/enumerating ids. These middlewares close that gap. Mount
 * them on any route that takes a resource id param, before the
 * controller runs.
 *
 * On success they attach the loaded record to req so the controller
 * doesn't have to fetch it twice (see req.resource in AuthedRequest).
 */

export function requireTicketInCompany(idParam = "id") {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params[idParam] },
      include: { department: true },
    });
    if (!ticket) {
      // 404, not 403 - don't leak whether the id exists in another tenant.
      throw new AppError("Ticket not found", 404);
    }
    req.resource = ticket;
    next();
  };
}

export function requireDepartmentInCompany(idParam = "id") {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const department = await prisma.department.findUnique({ where: { id: req.params[idParam] } });
    if (!department || department.companyId !== req.user!.companyId) {
      throw new AppError("Department not found", 404);
    }
    req.resource = department;
    next();
  };
}

export function requireUserInCompany(idParam = "id") {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({ where: { id: req.params[idParam] } });
    if (!user || user.companyId !== req.user!.companyId) {
      throw new AppError("User not found", 404);
    }
    req.resource = user;
    next();
  };
}

/**
 * A DEPT_ADMIN or MANAGER should only manage their own department's
 * people/tickets, even though they can authenticate fine company-wide.
 * GLOBAL_ADMIN bypasses this. Apply after requireTicketInCompany /
 * requireDepartmentInCompany, which populate req.resource.
 */
export function requireSameDepartmentOrGlobalAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user!.role === UserRole.GLOBAL_ADMIN) return next();

  const resourceDepartmentId =
    req.resource?.departmentId ?? req.resource?.id /* department itself */;

  if (resourceDepartmentId && resourceDepartmentId !== req.user!.departmentId) {
    throw new AppError("You do not have access to this department's resources", 403);
  }
  next();
}

import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

// Route-level gate: "is this role even allowed to hit this endpoint at all".
// Row-level scoping (e.g. a Team Lead only seeing their team's leads, a
// Client only seeing their own orders) is enforced separately in the
// service layer via src/lib/authz.ts - a role check here is necessary but
// not sufficient for authorization.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires one of roles: ${roles.join(", ")}`));
    }
    next();
  };
}

export const requireStaff = requireRole("OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER");
export const requireManager = requireRole("OWNER", "ADMIN");

import type { NextFunction, Request, Response } from "express";
import type { Role, TeamType } from "@prisma/client";
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

// Route-level gate for team-owned operations (e.g. only Purchase staff
// create POs, only Delivery staff dispatch trucks). OWNER/ADMIN always pass
// through - managers can act across every team. A Team Lead/Team Member
// whose own team doesn't match is rejected, even though `requireStaff`
// alone would have let them through: role alone was previously being used
// as a stand-in for "belongs to the right team," which it isn't.
export function requireTeamType(...teamTypes: TeamType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (req.user.role === "OWNER" || req.user.role === "ADMIN") {
      return next();
    }
    if (!req.user.teamType || !teamTypes.includes(req.user.teamType)) {
      return next(new ForbiddenError(`Requires membership on one of these teams: ${teamTypes.join(", ")}`));
    }
    next();
  };
}

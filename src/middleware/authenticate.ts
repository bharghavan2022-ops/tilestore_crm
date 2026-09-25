import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../lib/asyncHandler";

// Verifies the JWT and re-reads the user's current role/status/team from
// the database on every request. This is one extra query per request, but
// it means a suspended account or a role change takes effect immediately
// instead of only after the access token expires.
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Access token expired");
    }
    throw new UnauthorizedError("Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, teamId: true, customerId: true, status: true, team: { select: { type: true } } },
  });

  if (!user) {
    throw new UnauthorizedError("User no longer exists");
  }
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("Account is not active");
  }

  const { team, ...userFields } = user;
  req.user = { ...userFields, teamType: team?.type ?? null };
  next();
});

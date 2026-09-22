import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

export const healthRouter = Router();

// Liveness: process is up. Does not touch the database.
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: process is up AND can reach its database.
healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  }),
);

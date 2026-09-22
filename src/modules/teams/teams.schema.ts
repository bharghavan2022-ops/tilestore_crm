import { z } from "zod";

export const teamTypeEnum = z.enum(["SALES", "WAREHOUSE", "PURCHASE", "ACCOUNTS", "DELIVERY", "OTHER"]);

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  type: teamTypeEnum,
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: teamTypeEnum.optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

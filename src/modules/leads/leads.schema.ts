import { z } from "zod";

export const leadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "SITE_VISIT_SCHEDULED",
  "SURVEY_DONE",
  "QUOTED",
  "WON",
  "LOST",
]);

export const activityTypeEnum = z.enum(["CALL", "SITE_VISIT", "FOLLOW_UP", "NOTE", "EMAIL", "MEETING"]);

export const createLeadSchema = z.object({
  customerId: z.string().min(1),
  assignedToId: z.string().optional(),
  source: z.string().max(100).optional(),
});

export const updateLeadStatusSchema = z
  .object({
    status: leadStatusEnum,
    lostReason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "LOST" && !data.lostReason) {
      ctx.addIssue({ code: "custom", path: ["lostReason"], message: "lostReason is required when marking a lead LOST" });
    }
  });

export const assignLeadSchema = z.object({
  assignedToId: z.string().min(1),
});

export const createActivitySchema = z.object({
  type: activityTypeEnum,
  notes: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: leadStatusEnum.optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
});

import { z } from "zod";

export const upsertEmployeeProfileSchema = z.object({
  employeeCode: z.string().max(50).optional(),
  designation: z.string().max(100).optional(),
  joiningDate: z.coerce.date().optional(),
});

export const userIdParamSchema = z.object({ userId: z.string().min(1) });

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  teamId: z.string().optional(),
});

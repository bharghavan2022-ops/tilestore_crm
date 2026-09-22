import { z } from "zod";

export const roleEnum = z.enum(["OWNER", "ADMIN", "TEAM_LEAD", "TEAM_MEMBER", "CLIENT"]);
export const userStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "INVITED"]);

export const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1).max(150),
    phone: z.string().max(30).optional(),
    role: roleEnum,
    teamId: z.string().optional(),
    customerId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "CLIENT" && !data.customerId) {
      ctx.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "customerId is required for CLIENT users",
      });
    }
    if (data.role !== "CLIENT" && data.customerId) {
      ctx.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "customerId may only be set for CLIENT users",
      });
    }
    if (data.role === "CLIENT" && data.teamId) {
      ctx.addIssue({ code: "custom", path: ["teamId"], message: "CLIENT users may not belong to a team" });
    }
  });

export const updateUserSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  phone: z.string().max(30).optional(),
  role: roleEnum.optional(),
  teamId: z.string().nullable().optional(),
  status: userStatusEnum.optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  role: roleEnum.optional(),
  teamId: z.string().optional(),
  status: userStatusEnum.optional(),
  search: z.string().optional(),
});

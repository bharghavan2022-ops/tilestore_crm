import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { toSkipTake, paginated } from "../../lib/pagination";
import { NotFoundError } from "../../lib/errors";
import type { upsertEmployeeProfileSchema, listEmployeesQuerySchema } from "./employees.schema";

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  teamId: true,
  team: { select: { id: true, name: true, type: true } },
  employeeProfile: true,
} satisfies Prisma.UserSelect;

// "Employees" reuses the existing User identity (role/team already model
// who they are and what they can access) plus an optional EmployeeProfile
// for HR-only fields, rather than a duplicate employee record.
export async function listEmployees(query: z.infer<typeof listEmployeesQuerySchema>) {
  const where: Prisma.UserWhereInput = { role: { not: "CLIENT" }, teamId: query.teamId };
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: EMPLOYEE_SELECT, orderBy: { name: "asc" }, ...toSkipTake(query) }),
    prisma.user.count({ where }),
  ]);
  return paginated(data, total, query);
}

export async function getEmployee(userId: string) {
  const employee = await prisma.user.findFirst({
    where: { id: userId, role: { not: "CLIENT" } },
    select: EMPLOYEE_SELECT,
  });
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}

export async function upsertEmployeeProfile(
  userId: string,
  input: z.infer<typeof upsertEmployeeProfileSchema>,
  actorId: string,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, role: { not: "CLIENT" } } });
  if (!user) throw new NotFoundError("Employee not found");

  return prisma.$transaction(async (tx) => {
    const profile = await tx.employeeProfile.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
    await recordAudit(tx, {
      userId: actorId,
      entityType: "EmployeeProfile",
      entityId: profile.id,
      action: "UPSERTED",
      newValue: profile,
      context: { forUserId: userId },
    });
    return profile;
  });
}

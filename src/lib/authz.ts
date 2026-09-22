import type { Prisma } from "@prisma/client";
import { ForbiddenError } from "./errors";

export interface AuthUser {
  id: string;
  role: "OWNER" | "ADMIN" | "TEAM_LEAD" | "TEAM_MEMBER" | "CLIENT";
  teamId: string | null;
  customerId: string | null;
}

export function isStaff(user: AuthUser): boolean {
  return user.role !== "CLIENT";
}

export function isManager(user: AuthUser): boolean {
  return user.role === "OWNER" || user.role === "ADMIN";
}

// Clients may only ever touch data tied to their own Customer account.
// Staff (any non-client role) can reach the resource, but callers must still
// apply the relevant *VisibilityWhere() filter below when listing task-like
// entities.
export function assertOwnCustomerOrStaff(user: AuthUser, customerId: string): void {
  if (isStaff(user)) return;
  if (user.customerId !== customerId) {
    throw new ForbiddenError("You may only access your own account data");
  }
}

// Per the visibility model: Owner/Admin see everything, a Team Lead sees
// their own work plus their team's, a Team Member sees only what is
// assigned to them. Client callers should never reach these (leads/tasks
// are internal, not client-portal entities) - assertStaffOnly guards that.
export function leadVisibilityWhere(user: AuthUser): Prisma.LeadWhereInput {
  if (isManager(user)) return {};
  if (user.role === "TEAM_LEAD") {
    return { OR: [{ assignedToId: user.id }, { assignedTo: { teamId: user.teamId } }] };
  }
  return { assignedToId: user.id };
}

export function fulfilmentTaskVisibilityWhere(user: AuthUser): Prisma.FulfilmentTaskWhereInput {
  if (isManager(user)) return {};
  if (user.role === "TEAM_LEAD") {
    return { OR: [{ assignedToId: user.id }, { assignedTo: { teamId: user.teamId } }] };
  }
  return { assignedToId: user.id };
}

export function quotationVisibilityWhere(user: AuthUser): Prisma.QuotationWhereInput {
  if (isManager(user)) return {};
  if (user.role === "TEAM_LEAD") {
    return { OR: [{ salespersonId: user.id }, { salesperson: { teamId: user.teamId } }] };
  }
  return { salespersonId: user.id };
}

export function orderVisibilityWhere(user: AuthUser): Prisma.OrderWhereInput {
  if (isManager(user)) return {};
  if (user.role === "TEAM_LEAD") {
    return { OR: [{ salespersonId: user.id }, { salesperson: { teamId: user.teamId } }] };
  }
  // Warehouse/purchase/accounts/delivery team members work orders via
  // fulfilment tasks, not by sales ownership - they see all orders so they
  // can pick up unassigned work; write actions stay gated by requireRole.
  return {};
}

export function assertStaffOnly(user: AuthUser): void {
  if (!isStaff(user)) {
    throw new ForbiddenError("This resource is not available to client accounts");
  }
}

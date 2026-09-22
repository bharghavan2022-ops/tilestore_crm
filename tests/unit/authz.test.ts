import { describe, expect, it } from "vitest";
import {
  assertOwnCustomerOrStaff,
  isManager,
  isStaff,
  leadVisibilityWhere,
  assertStaffOnly,
  type AuthUser,
} from "../../src/lib/authz";
import { ForbiddenError } from "../../src/lib/errors";

function user(overrides: Partial<AuthUser>): AuthUser {
  return { id: "u1", role: "TEAM_MEMBER", teamId: null, customerId: null, ...overrides };
}

describe("isStaff / isManager", () => {
  it("treats every non-client role as staff", () => {
    expect(isStaff(user({ role: "OWNER" }))).toBe(true);
    expect(isStaff(user({ role: "TEAM_MEMBER" }))).toBe(true);
    expect(isStaff(user({ role: "CLIENT" }))).toBe(false);
  });

  it("only OWNER and ADMIN are managers", () => {
    expect(isManager(user({ role: "OWNER" }))).toBe(true);
    expect(isManager(user({ role: "ADMIN" }))).toBe(true);
    expect(isManager(user({ role: "TEAM_LEAD" }))).toBe(false);
  });
});

describe("assertOwnCustomerOrStaff", () => {
  it("allows staff to access any customer", () => {
    expect(() => assertOwnCustomerOrStaff(user({ role: "ADMIN" }), "cust-1")).not.toThrow();
  });

  it("allows a client to access their own customer record", () => {
    expect(() => assertOwnCustomerOrStaff(user({ role: "CLIENT", customerId: "cust-1" }), "cust-1")).not.toThrow();
  });

  it("blocks a client from accessing another customer's record", () => {
    expect(() => assertOwnCustomerOrStaff(user({ role: "CLIENT", customerId: "cust-1" }), "cust-2")).toThrow(
      ForbiddenError,
    );
  });
});

describe("assertStaffOnly", () => {
  it("blocks clients", () => {
    expect(() => assertStaffOnly(user({ role: "CLIENT", customerId: "c1" }))).toThrow(ForbiddenError);
  });
  it("allows staff", () => {
    expect(() => assertStaffOnly(user({ role: "TEAM_MEMBER" }))).not.toThrow();
  });
});

describe("leadVisibilityWhere", () => {
  it("gives managers unrestricted visibility", () => {
    expect(leadVisibilityWhere(user({ role: "OWNER" }))).toEqual({});
  });

  it("scopes a team lead to their own leads plus their team's", () => {
    const where = leadVisibilityWhere(user({ role: "TEAM_LEAD", id: "lead-1", teamId: "team-1" }));
    expect(where).toEqual({
      OR: [{ assignedToId: "lead-1" }, { assignedTo: { teamId: "team-1" } }],
    });
  });

  it("scopes a team member to only their own assigned leads", () => {
    const where = leadVisibilityWhere(user({ role: "TEAM_MEMBER", id: "member-1" }));
    expect(where).toEqual({ assignedToId: "member-1" });
  });
});

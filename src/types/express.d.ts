import type { Role, UserStatus } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        teamId: string | null;
        customerId: string | null;
        status: UserStatus;
      };
    }
  }
}

export {};

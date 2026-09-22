import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Paginated, Role, TeamType, UserStatus } from "../types/api";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  teamId: string | null;
  team: { id: string; name: string; type: TeamType } | null;
}

// Unlike /users (Owner/Admin only), /employees is readable by any staff
// member - this is the endpoint pickers (assignee dropdowns, etc.) use.
export function useEmployees(params: { teamId?: string } = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Employee>>("/employees", { params: { pageSize: 100, ...params } });
      return res.data;
    },
  });
}

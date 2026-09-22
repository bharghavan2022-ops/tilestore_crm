import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Warehouse } from "../types/api";

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Warehouse[] }>("/warehouses");
      return res.data.data;
    },
  });
}

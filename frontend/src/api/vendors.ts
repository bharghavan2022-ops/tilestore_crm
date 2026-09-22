import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Paginated, Vendor } from "../types/api";

export function useVendors(params: { search?: string } = {}) {
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Vendor>>("/vendors", { params: { pageSize: 100, ...params } });
      return res.data;
    },
  });
}

export interface CreateVendorInput {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorInput) => {
      const res = await apiClient.post<{ data: Vendor }>("/vendors", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

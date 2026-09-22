import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Customer, Paginated } from "../types/api";

export function useCustomers(params: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Customer>>("/customers", { params: { pageSize: 50, ...params } });
      return res.data;
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Customer }>(`/customers/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export interface CreateCustomerInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  segment?: Customer["segment"];
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const res = await apiClient.post<{ data: Customer }>("/customers", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

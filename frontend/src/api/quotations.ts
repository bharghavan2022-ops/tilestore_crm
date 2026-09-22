import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Paginated, Quotation, QuotationStatus } from "../types/api";

export function useQuotations(params: { status?: QuotationStatus; customerId?: string } = {}) {
  return useQuery({
    queryKey: ["quotations", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Quotation>>("/quotations", { params: { pageSize: 50, ...params } });
      return res.data;
    },
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: ["quotations", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Quotation }>(`/quotations/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export interface QuotationItemInput {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
}

export interface CreateQuotationInput {
  customerId: string;
  leadId?: string;
  terms?: string;
  validUntil?: string;
  items: QuotationItemInput[];
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuotationInput) => {
      const res = await apiClient.post<{ data: Quotation }>("/quotations", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotations"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useSubmitQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/submit`);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useDecideQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { decision: "APPROVED" | "REJECTED" | "CHANGES_REQUIRED"; comment?: string }) => {
      const res = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/decision`, input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotations"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

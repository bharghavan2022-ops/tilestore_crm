import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Lead, LeadStatus, Paginated } from "../types/api";

export function useLeads(params: { status?: LeadStatus; page?: number } = {}) {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Lead>>("/leads", { params: { pageSize: 50, ...params } });
      return res.data;
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Lead }>(`/leads/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export interface CreateLeadInput {
  customerId: string;
  assignedToId?: string;
  source?: string;
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const res = await apiClient.post<{ data: Lead }>("/leads", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useAssignLead(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignedToId: string) => {
      const res = await apiClient.post<{ data: Lead }>(`/leads/${leadId}/assign`, { assignedToId });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLeadStatus(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { status: LeadStatus; lostReason?: string }) => {
      const res = await apiClient.patch<{ data: Lead }>(`/leads/${leadId}/status`, input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useAddActivity(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: string; notes?: string }) => {
      const res = await apiClient.post(`/leads/${leadId}/activities`, input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    },
  });
}

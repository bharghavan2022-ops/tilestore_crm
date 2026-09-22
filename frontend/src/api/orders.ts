import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Order, OrderStatus, Paginated } from "../types/api";

export function useOrders(params: { status?: OrderStatus } = {}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Order>>("/orders", { params: { pageSize: 50, ...params } });
      return res.data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Order }>(`/orders/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
    refetchInterval: 10_000,
  });
}

export function useCreateOrderFromQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const res = await apiClient.post<{ data: Order }>("/orders", { quotationId });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useRerunStockGate(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: Order }>(`/orders/${orderId}/stock-gate`);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    },
  });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: Order }>(`/orders/${orderId}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateFulfilmentTask(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await apiClient.patch(`/orders/${orderId}/fulfilment/${taskId}`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

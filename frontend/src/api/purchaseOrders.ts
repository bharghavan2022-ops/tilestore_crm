import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Paginated, PurchaseOrder, PurchaseOrderStatus } from "../types/api";

export function usePurchaseOrders(params: { status?: PurchaseOrderStatus } = {}) {
  return useQuery({
    queryKey: ["purchaseOrders", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<PurchaseOrder>>("/purchase-orders", {
        params: { pageSize: 50, ...params },
      });
      return res.data;
    },
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["purchaseOrders", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export interface CreatePurchaseOrderInput {
  vendorId: string;
  expectedAt?: string;
  items: { productId: string; quantityOrdered: number; unitCost: number }[];
  shortageIds?: string[];
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePurchaseOrderInput) => {
      const res = await apiClient.post<{ data: PurchaseOrder }>("/purchase-orders", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      void queryClient.invalidateQueries({ queryKey: ["shortages"] });
    },
  });
}

export function useUpdatePurchaseOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: PurchaseOrderStatus) => {
      const res = await apiClient.patch<{ data: PurchaseOrder }>(`/purchase-orders/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
}

export interface ReceiveGoodsInput {
  note?: string;
  items: { purchaseOrderItemId: string; warehouseId: string; quantityReceived: number }[];
}

export function useReceiveGoods(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceiveGoodsInput) => {
      const res = await apiClient.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/goods-receipts`, input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      void queryClient.invalidateQueries({ queryKey: ["stock"] });
      void queryClient.invalidateQueries({ queryKey: ["shortages"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Shortage, StockItem } from "../types/api";

export function useStock(params: { productId?: string; warehouseId?: string } = {}) {
  return useQuery({
    queryKey: ["stock", params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: StockItem[] }>("/inventory/stock", { params });
      return res.data.data;
    },
  });
}

export function useShortages(params: { status?: Shortage["status"] } = {}) {
  return useQuery({
    queryKey: ["shortages", params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Shortage[]; meta: unknown }>("/inventory/shortages", {
        params: { pageSize: 50, ...params },
      });
      return res.data.data;
    },
  });
}

export interface StockAdjustmentInput {
  productId: string;
  warehouseId: string;
  quantityDelta: number;
  note?: string;
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockAdjustmentInput) => {
      const res = await apiClient.post("/inventory/adjustments", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

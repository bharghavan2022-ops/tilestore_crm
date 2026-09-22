import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Brand, Paginated, Product } from "../types/api";

export function useProducts(params: { search?: string } = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Product>>("/products", { params: { pageSize: 100, ...params } });
      return res.data;
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Brand[] }>("/products/brands");
      return res.data.data;
    },
  });
}

export interface CreateProductInput {
  sku: string;
  name: string;
  brandId?: string;
  category?: string;
  unit: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const res = await apiClient.post<{ data: Product }>("/products", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

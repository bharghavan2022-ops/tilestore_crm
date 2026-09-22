import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Delivery, DeliveryStatus, Paginated, Vehicle } from "../types/api";

export function useDeliveries(params: { status?: DeliveryStatus } = {}) {
  return useQuery({
    queryKey: ["deliveries", params],
    queryFn: async () => {
      const res = await apiClient.get<Paginated<Delivery>>("/logistics/deliveries", {
        params: { pageSize: 50, ...params },
      });
      return res.data;
    },
  });
}

export function useDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ["deliveries", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Delivery }>(`/logistics/deliveries/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Vehicle[] }>("/logistics/vehicles");
      return res.data.data;
    },
  });
}

export interface CreateDeliveryInput {
  orderId: string;
  vehicleId?: string;
  driverName?: string;
  destinationAddress: string;
  eta?: string;
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeliveryInput) => {
      const res = await apiClient.post<{ data: Delivery }>("/logistics/deliveries", input);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

function useDeliveryAction(id: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: Record<string, unknown>) => {
      const res = await apiClient.post<{ data: Delivery }>(`/logistics/deliveries/${id}/${path}`, body ?? {});
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export const useDispatchDelivery = (id: string) => useDeliveryAction(id, "dispatch");
export const useMarkDelivered = (id: string) => useDeliveryAction(id, "deliver");
export const useDelayDelivery = (id: string) => useDeliveryAction(id, "delay");
export const useUploadPod = (id: string) => useDeliveryAction(id, "pod");

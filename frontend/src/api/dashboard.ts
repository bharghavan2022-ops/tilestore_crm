import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { CommandCenterData, CrmDashboardData, InventoryAlertsData, LogisticsTrackerData, PurchaseTrackingData } from "../types/api";

function useDashboardQuery<T>(key: string, path: string) {
  return useQuery({
    queryKey: ["dashboard", key],
    queryFn: async () => {
      const res = await apiClient.get<{ data: T }>(path);
      return res.data.data;
    },
    refetchInterval: 30_000,
  });
}

export const useCommandCenter = () => useDashboardQuery<CommandCenterData>("command-center", "/dashboard/command-center");
export const useCrmDashboard = () => useDashboardQuery<CrmDashboardData>("crm", "/dashboard/crm");
export const useInventoryAlertsDashboard = () => useDashboardQuery<InventoryAlertsData>("inventory", "/dashboard/inventory");
export const usePurchaseTrackingDashboard = () => useDashboardQuery<PurchaseTrackingData>("purchasing", "/dashboard/purchasing");
export const useLogisticsTrackerDashboard = () => useDashboardQuery<LogisticsTrackerData>("logistics", "/dashboard/logistics");

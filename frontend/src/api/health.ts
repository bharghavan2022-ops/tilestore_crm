import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const HEALTH_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/api\/v1$/, "") + "/health/ready";

// Real connectivity indicator (not a decorative status dot) - polls the
// backend's readiness check, which itself confirms the database is reachable.
export function useHealthStatus(): boolean | null {
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      await axios.get(HEALTH_URL, { timeout: 5000 });
      return true;
    },
    refetchInterval: 30_000,
    retry: false,
  });

  if (isError) return false;
  return data ?? null;
}

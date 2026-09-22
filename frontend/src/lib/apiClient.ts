import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Concurrent 401s while a refresh is in flight all wait on the same
// promise instead of each firing their own /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: nextRefreshToken } = response.data as {
    accessToken: string;
    refreshToken: string;
  };
  tokenStore.setAccessToken(accessToken);
  tokenStore.setRefreshToken(nextRefreshToken);
  return accessToken;
}

let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(handler: () => void) {
  onAuthFailure = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && config && !config._retried && !config.url?.includes("/auth/")) {
      config._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(config);
      } catch {
        tokenStore.clear();
        onAuthFailure?.();
      }
    }

    return Promise.reject(error);
  },
);

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

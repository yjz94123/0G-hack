import axios from 'axios';
import type { ApiResponse } from '@og-predict/shared';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器: 统一提取 data
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Network error';
    return Promise.reject(new Error(message));
  }
);

/** 通用 GET 请求 */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data;
}

/** 通用 POST 请求 */
export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body);
  return data;
}

export { apiClient };

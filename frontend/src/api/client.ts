import axios, { type AxiosResponse } from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors here
    const message = error.response?.data?.error?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const apiGet = <T>(url: string, params?: any): Promise<AxiosResponse<T>> =>
  client.get(url, { params });

export const apiPost = <T>(url: string, data?: any): Promise<AxiosResponse<T>> =>
  client.post(url, data);

export default client;

import axios from 'axios';
import { SecureStorage } from '../storage/secure-storage';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://igoback.onrender.com';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const igoApi = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  adapter: 'fetch',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

igoApi.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers = config.headers || ({} as any);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage read error
  }
  return config;
});

igoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('⚠️ [igoApi Network Error]', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullUrl: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

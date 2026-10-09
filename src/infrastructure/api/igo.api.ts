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
});

igoApi.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage read error
  }
  return config;
});

import axios from 'axios';
import { SecureStorage } from '../storage/secure-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const igoApi = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

igoApi.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

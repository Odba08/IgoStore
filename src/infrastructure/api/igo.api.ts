import axios from 'axios';
import { SecureStorage } from '../storage/secure-storage';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://igoback-b84f.onrender.com';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const igoApi = axios.create({
  baseURL: getApiBaseUrl(),
  // Render Free Tier tarda ~35-55s en despertar de un cold start; 65s evita que corte antes
  timeout: 65000,
  adapter: 'fetch',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// --- SISTEMA DE DESPERTADO ANTICIPADO (ON-DEMAND PRE-WARM) ---
type ServerStatus = 'unknown' | 'waking' | 'ready';
let serverStatus: ServerStatus = 'unknown';
let wakeUpPromise: Promise<boolean> | null = null;
let lastAwakeTimestamp = 0;
const statusListeners = new Set<(status: ServerStatus) => void>();

const notifyStatus = (nextStatus: ServerStatus) => {
  serverStatus = nextStatus;
  if (nextStatus === 'ready') {
    lastAwakeTimestamp = Date.now();
  }
  statusListeners.forEach((listener) => listener(nextStatus));
};

export const getServerStatus = (): ServerStatus => serverStatus;

export const subscribeServerStatus = (listener: (status: ServerStatus) => void): (() => void) => {
  statusListeners.add(listener);
  listener(serverStatus);
  return () => {
    statusListeners.delete(listener);
  };
};

/**
 * Despierta el backend de Render únicamente cuando alguien abre o usa la app.
 * No gasta horas de Render cuando nadie usa la aplicación.
 */
export const wakeUpBackend = async (force = false): Promise<boolean> => {
  // Si respondió hace menos de 10 minutos, el servidor sigue despierto en Render (duerme a los 15 min)
  if (!force && serverStatus === 'ready' && Date.now() - lastAwakeTimestamp < 10 * 60 * 1000) {
    return true;
  }

  if (wakeUpPromise) {
    return wakeUpPromise;
  }

  notifyStatus('waking');
  const baseUrl = getApiBaseUrl();

  wakeUpPromise = (async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        const res = await fetch(`${baseUrl}/settings`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status < 500) {
          notifyStatus('ready');
          wakeUpPromise = null;
          return true;
        }
      } catch {
        // Si falló mientras el contenedor arranca, esperar 2s y reintentar
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    wakeUpPromise = null;
    return false;
  })();

  return wakeUpPromise;
};

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
  (response) => {
    // Cualquier respuesta exitosa confirma que el backend ya está despierto
    if (serverStatus !== 'ready') {
      notifyStatus('ready');
    } else {
      lastAwakeTimestamp = Date.now();
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Limpiar tokens inválidos o expirados de forma segura
      try {
        await SecureStorage.removeItem('token');
        await SecureStorage.removeItem('user');
      } catch {}
      return Promise.reject(error);
    }

    // Reintento automático (1 vez) ante errores de arranque en frío de Render (502/503/504 o timeout/red)
    const config = error.config as any;
    const status = error.response?.status;
    const isColdStartError = !error.response || status === 502 || status === 503 || status === 504;

    if (config && !config._retryOnColdStart && isColdStartError) {
      config._retryOnColdStart = true;
      notifyStatus('waking');
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return igoApi(config);
    }

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

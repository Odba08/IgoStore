import AsyncStorage from '@react-native-async-storage/async-storage';
import { igoApi } from './igo.api';

export interface CreateOrderPayload {
  items: Array<{ productId: string; quantity: number }>;
  businessId: string;
  deliveryLat: number;
  deliveryLong: number;
  deliveryAddress: string;
  userIdTemp?: string;
  pickupLat?: number;
  pickupLong?: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUUID = (id?: string | null): boolean =>
  typeof id === 'string' && UUID_REGEX.test(id.trim());

export const saveRecentOrderId = async (orderId: string) => {
  if (!orderId || !isValidUUID(orderId)) return;
  const cleanId = orderId.trim();
  try {
    const raw = await AsyncStorage.getItem('recent_order_ids');
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed.filter(isValidUUID) : [];
    if (!ids.includes(cleanId)) {
      ids.unshift(cleanId);
    }
    await AsyncStorage.setItem('recent_order_ids', JSON.stringify(ids.slice(0, 15)));
    await AsyncStorage.setItem('active_order_id', cleanId);
  } catch (err) {
    console.warn('Error saving recent order ID:', err);
  }
};

export const getActiveOrderId = async (): Promise<string | null> => {
  try {
    const id = await AsyncStorage.getItem('active_order_id');
    if (id && !isValidUUID(id)) {
      await AsyncStorage.removeItem('active_order_id');
      return null;
    }
    return id;
  } catch {
    return null;
  }
};

export const clearActiveOrderId = async () => {
  try {
    await AsyncStorage.removeItem('active_order_id');
  } catch {
    // ignore
  }
};

export const createOrderApi = (payload: CreateOrderPayload) => {
  return igoApi.post('/orders', payload);
};

export const getMyOrdersApi = async () => {
  const params: any = {};
  try {
    const raw = await AsyncStorage.getItem('recent_order_ids');
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      const validIds = Array.isArray(parsed) ? parsed.filter(isValidUUID) : [];
      if (validIds.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
        await AsyncStorage.setItem('recent_order_ids', JSON.stringify(validIds));
      }
      if (validIds.length > 0) {
        params.orderIds = validIds.join(',');
      }
    }
  } catch {
    // ignore
  }
  return igoApi.get('/orders/my-orders', { params });
};

export const getOrderQuoteApi = (payload: any) => {
  return igoApi.post('/orders/quote', payload);
};

export const getPendingDeliveriesApi = () => {
  return igoApi.get('/orders/pending-deliveries');
};

export const updateOrderApi = (id: string, payload: any) => {
  return igoApi.patch(`/orders/${id}`, payload);
};

export const getOrderByIdApi = (id: string) => {
  return igoApi.get(`/orders/${id}`);
};

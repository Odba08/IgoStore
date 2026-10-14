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

export const saveRecentOrderId = async (orderId: string) => {
  if (!orderId) return;
  try {
    const raw = await AsyncStorage.getItem('recent_order_ids');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(orderId)) {
      ids.unshift(orderId);
      await AsyncStorage.setItem('recent_order_ids', JSON.stringify(ids.slice(0, 15)));
    }
    await AsyncStorage.setItem('active_order_id', orderId);
  } catch (err) {
    console.warn('Error saving recent order ID:', err);
  }
};

export const getActiveOrderId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('active_order_id');
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
      const ids: string[] = JSON.parse(raw);
      if (ids.length > 0) {
        params.orderIds = ids.join(',');
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

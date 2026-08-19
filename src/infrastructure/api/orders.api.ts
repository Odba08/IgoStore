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

export const createOrderApi = (payload: CreateOrderPayload) => {
  return igoApi.post('/orders', payload);
};

export const getMyOrdersApi = () => {
  return igoApi.get('/orders/my-orders');
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

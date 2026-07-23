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

import { igoApi } from "./igo.api";

export const getProductByIdApi = (id: string) => igoApi.get(`/products/${id}`);

export const getProductsApi = (limit?: number) => igoApi.get('/products', { params: limit ? { limit } : {} });
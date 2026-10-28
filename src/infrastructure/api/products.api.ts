import { igoApi } from "./igo.api";

export const getProductByIdApi = (id: string) => igoApi.get(`/products/${id}`);

export const getProductsApi = (limit = 200) => igoApi.get('/products', { params: { limit } });
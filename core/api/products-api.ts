import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getProduct = axios.create({
  baseURL: `${API_URL}/api/`
});

export const getProductByIdApi = (id: string) => getProduct.get(`/products/${id}`);

export const getProductsApi = () => getProduct.get('/products');
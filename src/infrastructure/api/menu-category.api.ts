import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getProduct = axios.create({
  baseURL: `${API_URL}/api/`
});

export const getProductMenuByIdApi = (id: string) => getProduct.get(`/menu-category/${id}`);

export const getMenuCategoriesApi = () => getProduct.get('/menu-category');
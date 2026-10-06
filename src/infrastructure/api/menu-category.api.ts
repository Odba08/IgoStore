import { igoApi } from "./igo.api";

export const getProductMenuByIdApi = (id: string) => igoApi.get(`/menu-category/${id}`);

export const getMenuCategoriesApi = () => igoApi.get('/menu-category');

export const getMenuCategoriesByBusinessApi = (businessId: string) => igoApi.get(`/menu-category/business/${businessId}`);
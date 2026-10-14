import { igoApi } from './igo.api';

// Obtener todas las categorías
export const getCategoriesApi = async () => {
  try {
    const { data } = await igoApi.get('/categories');
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
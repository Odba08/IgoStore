import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL; 

// Obtener todas las categorías
export const getCategoriesApi = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/api/categories`);
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
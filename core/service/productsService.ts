import { Producto } from './../../infrastructure/interfaces/productos';
import { getProductByIdApi } from '../api/products-api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ProductService {
  
  static async getProductById(id: string): Promise<Producto> {
    try {
      const { data } = await getProductByIdApi(id);
      
      return {
        ...data,
        images: data.images?.map((image: any) => 
            typeof image === 'string' 
                ? `${API_URL}/api/files/products/${image}`
                : { ...image, url: `${API_URL}/api/files/products/${image.url}` }
        ) ?? []
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      throw error;
    }
  }
}
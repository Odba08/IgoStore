import { Producto } from '@entities/productos.entity';
import { getProductByIdApi, getProductsApi } from '../api/products.api';

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

  static async getProducts(): Promise<Producto[]> {
    try {
      const {data} = await getProductsApi();

      return data.map((product: any) => ({
        ...product,
        images: product.images?.map((image: any) => 
            typeof image === 'string' 
                ? { url: `${API_URL}/api/files/products/${image}` } 
            : { ...image, url: `${API_URL}/api/files/products/${image.url}` }
        ) ?? []
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }
}
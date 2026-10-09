import { Producto } from '@/core/entities/productos.entity';
import { getProductByIdApi, getProductsApi } from '../api/products.api';

const resolveImageUrl = (url: string, pathSegment: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://igoback.onrender.com';
  const cleanBase = envUrl.trim().replace(/\/+$/, '');
  const baseUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  return `${baseUrl}/files/${pathSegment}/${url}`;
};

export class ProductService {
  
  static async getProductById(id: string): Promise<Producto> {
    try {
      const { data } = await getProductByIdApi(id);
      
      return {
        ...data,
        images: data.images?.map((image: any) => 
            typeof image === 'string' 
                ? resolveImageUrl(image, 'products')
                : { ...image, url: resolveImageUrl(image.url, 'products') }
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
                ? { url: resolveImageUrl(image, 'products') } 
                : { ...image, url: resolveImageUrl(image.url, 'products') }
        ) ?? []
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }
}
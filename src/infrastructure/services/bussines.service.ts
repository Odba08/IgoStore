import { Business } from "@/core/entities/bussines.entity";
import { getBusinesses, getBusinessByIdApi } from "../api/bussines.api"; 

const FALLBACK_BUSINESS_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80';
const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

const resolveImageUrl = (url: string | undefined, pathSegment: string) => {
  if (!url) {
    return pathSegment === 'products' ? FALLBACK_PRODUCT_IMAGE : FALLBACK_BUSINESS_IMAGE;
  }
  // Render free tier wiped local ephemeral disk files, fallback gracefully
  if (url.includes('onrender.com/api/files/products/')) {
    return FALLBACK_PRODUCT_IMAGE;
  }
  if (url.includes('onrender.com/api/files/bussiness/')) {
    return FALLBACK_BUSINESS_IMAGE;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://igoback-b84f.onrender.com';
  const cleanBase = envUrl.trim().replace(/\/+$/, '');
  const baseUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  return `${baseUrl}/files/${pathSegment}/${url}`;
};

export class BusinessService {
  
  static async getBusinessesWithImages(): Promise<Business[]> {
    try {
      const { data } = await getBusinesses();
      return this.transformList(data);
    } catch (error) {
      console.error("Error in BusinessService (All):", error);
      throw error;
    }
  }

  static async getBusinessById(id: string): Promise<Business> {
    try {
      const { data } = await getBusinessByIdApi(id);
      
      return {
        ...data,
        // VITAL: Mapeamos la categoría para que el producto sepa dónde está
        categoryId: data.category?.id || data.categoryId, 
        
        images: data.images?.map((image: any) => ({
          ...(typeof image === 'object' ? image : {}),
          url: resolveImageUrl(typeof image === 'string' ? image : image?.url, 'bussiness'),
        })) ?? [],
        
        products: data.products?.map((product: any) => ({
            ...product,
            images: product.images?.map((image: any) => ({
                ...(typeof image === 'object' ? image : {}),
                url: resolveImageUrl(typeof image === 'string' ? image : image?.url, 'products'), 
            })) ?? []
        })) ?? []
      };

    } catch (error) {
      console.error("Error in BusinessService (Single):", error);
      throw error;
    }
  }

  // Helper para listas
  private static transformList(businesses: any[]): Business[] {
    return businesses.map((business) => ({
      ...business,
      categoryId: business.category?.id || business.categoryId, 

      images: business.images?.map((image: any) => ({
        ...(typeof image === 'object' ? image : {}),
        url: resolveImageUrl(typeof image === 'string' ? image : image?.url, 'bussiness'),
      })) ?? [],
    }));
  }
}

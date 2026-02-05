import { Business } from "@/infrastructure/interfaces/bussines-response";
import { getBusinesses, getBusinessByIdApi } from "../api/bussines-api"; 

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
          ...image,
          url: `${API_URL}/api/files/bussiness/${image.url}`,
        })) ?? [],
        
        products: data.products?.map((product: any) => ({
            ...product,
            images: product.images?.map((image: any) => ({
                ...image,
                url: `${API_URL}/api/files/products/${image.url}`, 
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
        ...image,
        url: `${API_URL}/api/files/bussiness/${image.url}`,
      })) ?? [],
    }));
  }
}
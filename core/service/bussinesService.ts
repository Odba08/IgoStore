// services/businessService.ts
import { Business } from "@/infrastructure/interfaces/bussines-response";
import { getBusinesses } from "../api/bussines-api";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class BusinessService {
  static async getBusinessesWithImages(): Promise<Business[]> {
    try {
      const { data } = await getBusinesses();
      return this.transformBusinessImages(data);
    } catch (error) {
      console.error("Error in BusinessService:", error);
      throw error;
    }
  }

  private static transformBusinessImages(businesses: Business[]): Business[] {
    return businesses.map((business) => ({
      ...business,
      images: business.images.map((image) => ({
        ...image,
        url: `${API_URL}/api/files/bussiness/${image.url}`,
      })),
    }));
  }
}

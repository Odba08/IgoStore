import { Category } from "../../infrastructure/interfaces/category"; 
import { getCategoriesApi } from "../api/categories-api";

export class CategoryService {

  static async getCategories(): Promise<Category[]> {
    try {
      const data = await getCategoriesApi();
      
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
      }));
      
    } catch (error) {
      console.log('Error en CategoryService:', error);
      return [];
    }
  }
}
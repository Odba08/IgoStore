
import { MenuCategory } from "@/core/entities/menu-category.entity";
import { getMenuCategoriesByBusinessApi, getMenuCategoriesApi } from "../api/menu-category.api";

export const getMenuCategoriesByBusiness = async (businessId: string): Promise<MenuCategory[]> => {
    try {
        const { data } = await getMenuCategoriesByBusinessApi(businessId);
        return data;
    } catch (error) {
        // Fallback a getMenuCategoriesApi si el endpoint de negocio no responde
        try {
            const { data } = await getMenuCategoriesApi();
            return data.filter((c: any) => c.business?.id === businessId);
        } catch (e) {
            console.error('Error in getMenuCategoriesByBusiness:', error);
            return [];
        }
    }
};


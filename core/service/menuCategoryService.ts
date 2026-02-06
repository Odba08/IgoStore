import { MenuCategory } from "@/infrastructure/interfaces/menu-category";
import { getMenuCategoriesApi } from "../api/menu-category";


export const getMenuCategoriesByBusiness = async (businessId: string): Promise<MenuCategory[]> => {
    try {
        const { data } = await getMenuCategoriesApi();

        const filteredCategories = data.filter(
            (category: MenuCategory) => category.business.id === businessId
        );

        return filteredCategories;
    } catch (error) {
        console.error('Error in getMenuCategoriesByBusiness:', error);
        throw error;
    }
};


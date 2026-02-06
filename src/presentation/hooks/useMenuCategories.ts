
import { MenuCategory } from '@/core/entities/menu-category.entity';
import { getMenuCategoriesByBusiness } from '@/infrastructure/services/menuCategory.service';
import { useState, useEffect, useCallback } from 'react';


export const useMenuCategories = (businessId: string) => {
    
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCategories = useCallback(async () => {
        if (!businessId) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMenuCategoriesByBusiness(businessId);
            setCategories(data);
        } catch (err) {
            setError('No se pudieron cargar las categorías del menú.');
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    return {
        categories,
        isLoading,
        error,
        refetch: loadCategories // Útil si quieres añadir un "Pull to Refresh"
    };
};
import { useEffect, useState } from "react";

import { Category } from "@entities/category.entity";
import { CategoryService } from "@/infrastructure/services/category.service";

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-restaurantes', name: 'Restaurantes' },
  { id: 'cat-supermercado', name: 'Supermercado' },
  { id: 'cat-farmacia', name: 'Farmacia' },
  { id: 'cat-licoreria', name: 'Licorería' },
];

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await CategoryService.getCategories();
    if (Array.isArray(data) && data.length > 0) {
      setCategories(data);
    }
    setIsLoading(false);
  };

  return {
    categories,
    isLoading,
  };
};

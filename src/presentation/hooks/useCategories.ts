import { useEffect, useState } from "react";

import { Category } from "@entities/category.entity";
import { CategoryService } from "@/infrastructure/services/category.service";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await CategoryService.getCategories();
    setCategories(data);
    setIsLoading(false);
  };

  return {
    categories,
    isLoading,
  };
};

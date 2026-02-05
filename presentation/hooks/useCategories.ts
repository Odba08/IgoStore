import { useEffect, useState } from "react";
import { Category } from "../../infrastructure/interfaces/category";
import { CategoryService } from "../../core/service/categoryService";

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
    isLoading
  };
};
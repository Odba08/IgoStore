import { ProductService } from "@/infrastructure/services/products.service";
import { useQuery } from "@tanstack/react-query";


export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

export const useAllProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 60000,
    refetchInterval: 120000,
  });
};

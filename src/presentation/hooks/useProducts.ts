import { ProductService } from "@/infrastructure/services/products.service";
import { useQuery } from "@tanstack/react-query";


export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
    staleTime: 0, // CRÍTICO: En detalle de producto queremos datos frescos (stock) siempre
    refetchInterval: 10000, // Refresco automático cada 10s en background
  });
};

export const useAllProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 0, // Real-time sync with admin panel status updates
    refetchInterval: 10000, // Refresco automático cada 10s en background
  });
};

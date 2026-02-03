import { useQuery } from "@tanstack/react-query";
import { ProductService } from "../../core/service/productsService";

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
    staleTime: 0, // CRÍTICO: En detalle de producto queremos datos frescos (stock) siempre
  });
};
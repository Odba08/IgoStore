
import { Business } from "@/core/entities/bussines.entity";
import { BusinessService } from "@/infrastructure/services/bussines.service";
import { useQuery } from "@tanstack/react-query";


export const useBusinesses = () => {
  return useQuery<Business[], Error>({
    queryKey: ["businesses"],
    queryFn: () => BusinessService.getBusinessesWithImages(),
    staleTime: 60000, // Cache por 60s para evitar saturar la cuota de transferencia de BD
    refetchInterval: 120000, // Refresco cada 2 min en lugar de cada 10s
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useBusiness = (id: string) => {
  return useQuery<Business, Error>({
    queryKey: ["business", id],
    queryFn: async () => {
      const businesses = await BusinessService.getBusinessById(id);
      return Array.isArray(businesses) ? businesses[0] : businesses;
    },
    enabled: !!id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

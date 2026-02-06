
import { Business } from "@/core/entities/bussines.entity";
import { BusinessService } from "@/infrastructure/services/bussines.service";
import { useQuery } from "@tanstack/react-query";


export const useBusinesses = () => {
  return useQuery<Business[], Error>({
    queryKey: ["businesses"],
    queryFn: () => BusinessService.getBusinessesWithImages(),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    enabled: !!id, // Seguro: solo dispara si existe un ID (evita errores de "undefined")
    staleTime: 5 * 60 * 1000,
  });
};

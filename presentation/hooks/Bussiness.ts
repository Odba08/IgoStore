import { useQuery } from "@tanstack/react-query";
import { BusinessService } from "../../core/service/bussinesService";
import { Business } from "@/infrastructure/interfaces/bussines-response";

export const useBusinesses = () => {
  return useQuery<Business[], Error>({
    queryKey: ['businesses'],
    queryFn: () => BusinessService.getBusinessesWithImages(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, 
    refetchOnWindowFocus: false,
  })

}

export const useBusiness = (id: string) => {
  return useQuery<Business, Error>({
    queryKey: ['business', id], 
    queryFn: async () => {
      const businesses = await BusinessService.getBusinessById(id);
      return Array.isArray(businesses) ? businesses[0] : businesses;
    }, 
    enabled: !!id,// Seguro: solo dispara si existe un ID (evita errores de "undefined")
    staleTime: 5 * 60 * 1000,
  });
}
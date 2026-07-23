
import { Business } from "@/core/entities/bussines.entity";
import { BusinessService } from "@/infrastructure/services/bussines.service";
import { useQuery } from "@tanstack/react-query";


export const useBusinesses = () => {
  return useQuery<Business[], Error>({
    queryKey: ["businesses"],
    queryFn: () => BusinessService.getBusinessesWithImages(),
    staleTime: 0, // Real-time sync with admin panel
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
    staleTime: 0, // Real-time sync with admin panel
  });
};

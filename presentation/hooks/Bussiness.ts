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
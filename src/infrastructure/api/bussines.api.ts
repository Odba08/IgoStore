import { igoApi } from "./igo.api";

export const getBusinesses = (limit?: number) => igoApi.get('/business', { params: limit ? { limit } : {} });

export const getBusinessByIdApi = (id: string) => igoApi.get(`/business/${id}`);
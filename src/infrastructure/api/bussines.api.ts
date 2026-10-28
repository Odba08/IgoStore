import { igoApi } from "./igo.api";

export const getBusinesses = (limit = 100) => igoApi.get('/business', { params: { limit } });

export const getBusinessByIdApi = (id: string) => igoApi.get(`/business/${id}`);
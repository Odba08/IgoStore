import { igoApi } from "./igo.api";

export const getBusinesses = () => igoApi.get('/business');

export const getBusinessByIdApi = (id: string) => igoApi.get(`/business/${id}`);
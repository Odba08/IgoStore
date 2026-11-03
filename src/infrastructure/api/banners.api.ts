import { igoApi } from './igo.api';

export type BannerActionType = 'NONE' | 'EXTERNAL_URL' | 'INFO_MODAL';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  actionType: BannerActionType;
  actionUrl?: string;
  infoTitle?: string;
  infoContent?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerPayload {
  title: string;
  imageUrl: string;
  actionType?: BannerActionType;
  actionUrl?: string;
  infoTitle?: string;
  infoContent?: string;
  isActive?: boolean;
  order?: number;
}

export const getBannersApi = async (): Promise<Banner[]> => {
  try {
    const { data } = await igoApi.get<Banner[]>('/banners');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching banners:', error);
    throw error;
  }
};

export const getAllBannersAdminApi = async (): Promise<Banner[]> => {
  try {
    const { data } = await igoApi.get<Banner[]>('/banners/admin/all');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching all banners:', error);
    throw error;
  }
};

export const createBannerApi = async (payload: CreateBannerPayload): Promise<Banner> => {
  const { data } = await igoApi.post<Banner>('/banners', payload);
  return data;
};

export const updateBannerApi = async (
  id: string,
  payload: Partial<CreateBannerPayload>,
): Promise<Banner> => {
  const { data } = await igoApi.patch<Banner>(`/banners/${id}`, payload);
  return data;
};

export const deleteBannerApi = async (
  id: string,
): Promise<{ success: boolean; message: string }> => {
  const { data } = await igoApi.delete(`/banners/${id}`);
  return data;
};

export const seedBannersApi = async (): Promise<Banner[]> => {
  const { data } = await igoApi.post<Banner[]>('/banners/seed', {});
  return data;
};

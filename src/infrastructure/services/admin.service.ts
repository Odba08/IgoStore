import { igoApi } from '../api/igo.api';

export class AdminService {
  // --- USERS / EMPLEADOS / REPARTIDORES ---
  static async getUsers() {
    return igoApi.get('/users');
  }

  static async createUser(userData: {
    fullName: string;
    email: string;
    password: string;
    roles: string[];
    vehicle?: string;
    phoneNumber?: string;
  }) {
    return igoApi.post('/users/register', userData);
  }

  static async updateUser(id: string, data: any) {
    return igoApi.patch(`/users/${id}`, data);
  }

  static async updateUserRole(id: string, roles: string[]) {
    return igoApi.patch(`/users/${id}`, { roles });
  }

  static async updateUserStatus(id: string, isActive: boolean) {
    return igoApi.patch(`/users/${id}`, { isActive });
  }

  static async updateEmployeeStatus(id: string, employeeStatus: string) {
    return igoApi.patch(`/users/${id}`, { employeeStatus });
  }

  static async deleteUser(id: string) {
    return igoApi.delete(`/users/${id}`);
  }

  // --- PEDIDOS / ÓRDENES ---
  static async getOrders() {
    return igoApi.get('/orders');
  }

  static async getOrderById(id: string) {
    return igoApi.get(`/orders/${id}`);
  }

  static async updateOrder(id: string, data: any) {
    return igoApi.patch(`/orders/${id}`, data);
  }

  static async assignOrderDriver(orderId: string, deliveryUserId: string | null) {
    return igoApi.patch(`/orders/${orderId}/assign-driver`, { deliveryUserId });
  }

  static async verifyOrderPayment(orderId: string, isPaid: boolean = true) {
    return igoApi.patch(`/orders/${orderId}/verify-payment`, { isPaid });
  }

  static async getActiveDrivers() {
    return igoApi.get('/orders/active-drivers');
  }

  static async getBusinessDebtsReport() {
    return igoApi.get('/orders/reports/business-debts');
  }

  // --- COMERCIOS ---
  static async getBusinesses() {
    return igoApi.get('/business');
  }

  static async createBusiness(businessData: any) {
    return igoApi.post('/business', businessData);
  }

  static async updateBusiness(businessId: string, businessData: any) {
    return igoApi.patch(`/business/${businessId}`, businessData);
  }

  static async deleteBusiness(businessId: string) {
    return igoApi.delete(`/business/${businessId}`);
  }

  // --- PRODUCTOS POR COMERCIO ---
  static async getBusinessProducts(businessId: string) {
    return igoApi.get(`/business/${businessId}/products`);
  }

  static async createBusinessProduct(businessId: string, productData: any) {
    return igoApi.post(`/business/${businessId}/products`, productData);
  }

  static async updateBusinessProduct(businessId: string, productId: string, productData: any) {
    return igoApi.patch(`/business/${businessId}/products/${productId}`, productData);
  }

  static async deleteBusinessProduct(businessId: string, productId: string) {
    return igoApi.delete(`/business/${businessId}/products/${productId}`);
  }

  // --- AJUSTES Y CONFIGURACIÓN GLOBAL ---
  static async getAllSettings() {
    return igoApi.get('/settings');
  }

  static async getSetting(key: string) {
    return igoApi.get(`/settings/${key}`);
  }

  static async updateSetting(key: string, value: string) {
    return igoApi.patch(`/settings/${key}`, { value });
  }

  static async updateBulkSettings(settings: Record<string, string>) {
    return igoApi.post('/settings/bulk', settings);
  }
}

export default AdminService;

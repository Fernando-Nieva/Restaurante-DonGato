import { api } from './api';

const buildQuery = (params = {}) => {
    const entries = Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
    );

    if (entries.length === 0) return '';

    const query = new URLSearchParams();

    entries.forEach(([key, value]) => query.set(key, String(value)));

    return `?${query.toString()}`;
};

const listData = (payload) => (Array.isArray(payload?.data) ? payload.data : []);
const itemData = (payload) => payload?.data ?? payload;

export const adminApi = {
    listProducts: (filters = {}) =>
        api.get(`/api/admin/products${buildQuery(filters)}`).then(listData),

    createProduct: (data) => api.post('/api/admin/products', data).then(itemData),

    updateProduct: (id, data) => api.put(`/api/admin/products/${id}`, data).then(itemData),

    updateProductAvailability: (id, isAvailable) =>
        api
            .patch(`/api/admin/products/${id}/availability`, { is_available: isAvailable })
            .then(itemData),

    listTables: () => api.get('/api/tables').then(listData),

    createTable: (data) => api.post('/api/admin/tables', data).then(itemData),

    updateTable: (id, data) => api.put(`/api/admin/tables/${id}`, data).then(itemData),

    deleteTable: (id) => api.delete(`/api/admin/tables/${id}`),

    listUsers: (filters = {}) =>
        api.get(`/api/admin/users${buildQuery(filters)}`).then(listData),

    createUser: (data) => api.post('/api/admin/users', data).then(itemData),

    updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data).then(itemData),

    updateUserPassword: (id, password) =>
        api.patch(`/api/admin/users/${id}/password`, { password }).then(itemData),

    updateUserActive: (id, isActive) =>
        api.patch(`/api/admin/users/${id}/active`, { is_active: isActive }).then(itemData),

    listOrders: (filters = {}) => api.get(`/api/admin/orders${buildQuery(filters)}`),

    listReservations: (filters = {}) =>
        api.get(`/api/admin/reservations${buildQuery(filters)}`).then(listData),

    createReservation: (data) => api.post('/api/admin/reservations', data).then(itemData),

    updateReservation: (id, data) =>
        api.put(`/api/admin/reservations/${id}`, data).then(itemData),

    cancelReservation: (id) =>
        api.patch(`/api/admin/reservations/${id}/cancel`).then(itemData),

    getSummary: (filters = {}) =>
        api.get(`/api/admin/stats/summary${buildQuery(filters)}`),

    getTopProducts: (filters = {}) =>
        api.get(`/api/admin/stats/top-products${buildQuery(filters)}`),

    getSalesByHour: (filters = {}) =>
        api.get(`/api/admin/stats/sales-by-hour${buildQuery(filters)}`),

    getByWaiter: (filters = {}) => api.get(`/api/admin/stats/by-waiter${buildQuery(filters)}`),
};

export default adminApi;

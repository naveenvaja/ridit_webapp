import axios from "axios";
import { BASE_URLS } from "./urls";

const api = axios.create({
  baseURL: BASE_URLS.API_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage to outgoing requests when available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ────────────────────────────────────────────────
// Auth APIs
// ────────────────────────────────────────────────
export const authApi = {
  register: (userData) => api.post("/auth/register", userData),
  googleRegister: (googleData) => api.post("/auth/google-register", googleData),
  googleLogin: (googleData) => api.post("/auth/google-login", googleData),
  login: (loginData) => api.post("/auth/login", loginData),
  getProfile: (userId) => api.get(`/auth/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/auth/profile/${userId}`, data),
};

// ────────────────────────────────────────────────
// Seller APIs
// ────────────────────────────────────────────────
export const sellerApi = {
  addItem: (sellerId, itemData) =>
    api.post(`/seller/items/add?seller_id=${sellerId}`, itemData),

  getItems: (sellerId, statusFilter) =>
    api.get(`/seller/items/${sellerId}`, {
      params: statusFilter ? { status_filter: statusFilter } : undefined,
    }),

  getItemStatus: (itemId) => api.get(`/seller/items/${itemId}/status`),

  cancelItem: (itemId) => api.put(`/seller/items/${itemId}/cancel`),

  deleteItem: (itemId) => api.delete(`/seller/items/${itemId}`),

  /**
   * Set or update seller's location
   */
  setLocation: (sellerId, locationData) =>
    api.put(`/seller/location/${sellerId}`, locationData),

  /**
   * Get seller's location
   */
  getLocation: (sellerId) =>
    api.get(`/seller/location/${sellerId}`),
};

// ────────────────────────────────────────────────
// Collector APIs
// ────────────────────────────────────────────────
export const collectorApi = {
  /**
   * Update collector's current location and search radius
   */
  setLocation: (collectorId, locationData) =>
    api.put(`/collector/location/${collectorId}`, locationData),

  /**
   * Get collector's location
   */
  getLocation: (collectorId) =>
    api.get(`/collector/location/${collectorId}`),

  /**
   * Get nearby available items (not yet accepted by anyone)
   */
  getAvailableItems: (collectorId, filters = {}) =>
    api.get("/collector/items", {
      params: {
        collector_id: collectorId,
        ...filters,
      },
    }),

  /**
   * Get items this collector has accepted
   */
  getMyAcceptedItems: (collectorId) =>
    api.get("/collector/my-accepted", {
      params: {
        collector_id: collectorId,
      },
    }),

  /**
   * Accept an available item
   */
  acceptItem: (itemId, collectorId) =>
    api.post(`/collector/items/${itemId}/accept`, null, {
      params: { collector_id: collectorId },
    }),

  /**
   * Complete collection of an accepted item (mark as collected)
   * Both parameters are sent as query params (no JSON body)
   */
  completeCollection: (itemId, collectorId, actualWeight) =>
    api.post(`/collector/items/${itemId}/complete`, null, {
      params: {
        collector_id: collectorId,
        actual_weight: actualWeight,
      },
    }),
};

// ────────────────────────────────────────────────
// 🛡️ Admin APIs (UPDATED)
// ────────────────────────────────────────────────
export const adminApi = {
  /**
   * Admin login
   */
  login: (credentials) =>
    api.post("/admin/login", credentials),

  /**
   * Get admin id from storage
   */
  _getAdminId: () => {
    const adminId = localStorage.getItem("admin_user_id") || localStorage.getItem("user_id");
    if (!adminId) {
      throw new Error("Admin not authenticated");
    }
    return adminId;
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers: () =>
    api.get("/admin/users", {
      headers: {
        user_id: adminApi._getAdminId(),
      },
    }),

  /**
   * Get single user
   */
  getUser: (userId) =>
    api.get(`/admin/user/${userId}`, {
      headers: {
        user_id: adminApi._getAdminId(),
      },
    }),

  /**
   * Delete user
   */
  deleteUser: (userId) =>
    api.delete(`/admin/user/${userId}`, {
      headers: {
        user_id: adminApi._getAdminId(),
      },
    }),

  /**
   * Update user role
   */
  updateUserRole: (userId, userType) =>
    api.put(
      `/admin/user/${userId}/role`,
      { user_type: userType },
      {
        headers: {
          user_id: adminApi._getAdminId(),
        },
      }
    ),
};

// ────────────────────────────────────────────────
// Health / Misc
// ────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get("/health"),
};

export default api;
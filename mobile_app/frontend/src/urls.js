/**
 * Centralized URL Management
 * All API endpoints and base URLs are defined here for easy maintenance
 */

// Base API URL - reads from environment variable or defaults to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://ridit.onrender.com";
const API_ENDPOINT = `${API_BASE_URL}`;

// ────────────────────────────────────────────────
// Auth Endpoints
// ────────────────────────────────────────────────
export const AUTH_URLS = {
  REGISTER: `${API_ENDPOINT}/auth/register`,
  GOOGLE_REGISTER: `${API_ENDPOINT}/auth/google-register`,
  GOOGLE_LOGIN: `${API_ENDPOINT}/auth/google-login`,
  LOGIN: `${API_ENDPOINT}/auth/login`,
  PROFILE: (userId) => `${API_ENDPOINT}/auth/profile/${userId}`,
};

// ────────────────────────────────────────────────
// Seller Endpoints
// ────────────────────────────────────────────────
export const SELLER_URLS = {
  ADD_ITEM: (sellerId) => `${API_ENDPOINT}/seller/items/add?seller_id=${sellerId}`,
  GET_ITEMS: (sellerId) => `${API_ENDPOINT}/seller/items/${sellerId}`,
  GET_ITEM_STATUS: (itemId) => `${API_ENDPOINT}/seller/items/${itemId}/status`,
  CANCEL_ITEM: (itemId) => `${API_ENDPOINT}/seller/items/${itemId}/cancel`,
  DELETE_ITEM: (itemId) => `${API_ENDPOINT}/seller/items/${itemId}`,
  SET_LOCATION: (sellerId) => `${API_ENDPOINT}/seller/location/${sellerId}`,
  GET_LOCATION: (sellerId) => `${API_ENDPOINT}/seller/location/${sellerId}`,
};

// ────────────────────────────────────────────────
// Collector Endpoints
// ────────────────────────────────────────────────
export const COLLECTOR_URLS = {
  SET_LOCATION: (collectorId) => `${API_ENDPOINT}/collector/location/${collectorId}`,
  GET_LOCATION: (collectorId) => `${API_ENDPOINT}/collector/location/${collectorId}`,
  GET_AVAILABLE_ITEMS: `${API_ENDPOINT}/collector/items`,
  GET_MY_ACCEPTED_ITEMS: `${API_ENDPOINT}/collector/my-accepted`,
  ACCEPT_ITEM: (itemId) => `${API_ENDPOINT}/collector/items/${itemId}/accept`,
  COMPLETE_COLLECTION: (itemId) => `${API_ENDPOINT}/collector/items/${itemId}/complete`,
};

// ────────────────────────────────────────────────
// Admin Endpoints
// ────────────────────────────────────────────────
export const ADMIN_URLS = {
  LOGIN: `${API_BASE_URL}/admin/login`,
  GET_USERS: `${API_BASE_URL}/admin/users`,
  CREATE_USER: `${API_BASE_URL}/admin/users/create`,
  GET_USER: (userId) => `${API_BASE_URL}/admin/user/${userId}`,
  DELETE_USER: (userId) => `${API_BASE_URL}/admin/user/${userId}`,
  UPDATE_USER: (userId) => `${API_BASE_URL}/admin/user/${userId}`,
  UPDATE_USER_ROLE: (userId) => `${API_BASE_URL}/admin/user/${userId}/role`,
  GET_ITEMS: `${API_BASE_URL}/admin/items`,
  GET_ITEM: (itemId) => `${API_BASE_URL}/admin/item/${itemId}`,
  DELETE_ITEM: (itemId) => `${API_BASE_URL}/admin/item/${itemId}`,
  UPDATE_ITEM: (itemId) => `${API_BASE_URL}/admin/item/${itemId}`,
  GET_SUBSCRIPTIONS: `${API_BASE_URL}/admin/subscriptions`,
  ACTIVATE_SUBSCRIPTION: (collectorId) => `${API_BASE_URL}/admin/subscriptions/${collectorId}`,
  CANCEL_SUBSCRIPTION: (collectorId) => `${API_BASE_URL}/admin/subscriptions/${collectorId}`,
};

// ────────────────────────────────────────────────
// Health & Misc Endpoints
// ────────────────────────────────────────────────
export const HEALTH_URLS = {
  CHECK: `${API_ENDPOINT}/health`,
};

// ────────────────────────────────────────────────
// Export Base URLs
// ────────────────────────────────────────────────
export const BASE_URLS = {
  API: API_BASE_URL,
  API_ENDPOINT: API_ENDPOINT,
};

// Default export configuration
const URLConfig = {
  AUTH_URLS,
  SELLER_URLS,
  COLLECTOR_URLS,
  ADMIN_URLS,
  HEALTH_URLS,
  BASE_URLS,
};

export default URLConfig;

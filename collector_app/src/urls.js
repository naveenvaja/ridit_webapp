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
  COLLECTOR_URLS,
  HEALTH_URLS,
  BASE_URLS,
};

export default URLConfig;

"""
Centralized Configuration Management for Ridit Backend
All configuration variables are defined here for easy maintenance and consistency
"""

import os
from typing import List

# ────────────────────────────────────────────────
# API Configuration
# ────────────────────────────────────────────────
API_TITLE = "Ridit - Waste Collection API"
API_DESCRIPTION = "API for managing waste collection between sellers and collectors"
API_VERSION = "1.0.0"
API_DOCS_URL = "/docs"
API_REDOC_URL = "/redoc"
API_OPENAPI_URL = "/openapi.json"

# ────────────────────────────────────────────────
# Server Configuration
# ────────────────────────────────────────────────
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))
SERVER_RELOAD = os.getenv("SERVER_RELOAD", "True").lower() == "true"

# ────────────────────────────────────────────────
# CORS Configuration
# ────────────────────────────────────────────────
CORS_ALLOW_ORIGINS: List[str] = [
    "*"  # Allow all origins
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# ────────────────────────────────────────────────
# Firebase Configuration
# ────────────────────────────────────────────────
FIREBASE_DATABASE_URL = os.getenv(
    "FIREBASE_DATABASE_URL",
    "https://ridit1-396d3-default-rtdb.firebaseio.com"
)
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "serviceAccountKey.json")
)

# ────────────────────────────────────────────────
# Frontend Configuration
# ────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FRONTEND_API_BASE_URL = os.getenv("FRONTEND_API_BASE_URL", "http://localhost:8000")
# FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ridit-frontend.onrender.com")
# FRONTEND_API_BASE_URL = os.getenv("FRONTEND_API_BASE_URL", "https://ridit-frontend.onrender.com")

# ────────────────────────────────────────────────
# API Endpoints
# ────────────────────────────────────────────────
class APIEndpoints:
    """All API endpoint prefixes defined here"""
    AUTH = "/auth"
    SELLER = "/seller"
    COLLECTOR = "/collector"
    ADMIN = "/admin"
    HEALTH = "/health"

# ────────────────────────────────────────────────
# API Tags
# ────────────────────────────────────────────────
class APITags:
    """Tags for API endpoint organization"""
    AUTHENTICATION = "Authentication"
    SELLER = "Seller"
    COLLECTOR = "Collector"
    ADMIN = "Admin"
    HEALTH = "Health"

# ────────────────────────────────────────────────
# Database Configuration
# ────────────────────────────────────────────────
class DatabaseConfig:
    """Database configuration and paths"""
    USERS_PATH = "users"
    ITEMS_PATH = "items"
    SUBSCRIPTIONS_PATH = "subscriptions"
    HEALTH_CHECK_PATH = "_health_check"
    
    # Thresholds
    DB_RESPONSE_TIME_THRESHOLD_MS = 1000  # Max acceptable response time

# ────────────────────────────────────────────────
# Health Check Configuration
# ────────────────────────────────────────────────
class HealthCheckConfig:
    """Health check settings"""
    HEALTHY_RESPONSE_TIME_MS = 1000
    STATUS_HEALTHY = "healthy"
    STATUS_DEGRADED = "degraded"
    STATUS_UNHEALTHY = "unhealthy"
    
    # Services
    SERVICES_AUTH = "auth"
    SERVICES_SELLER = "seller"
    SERVICES_COLLECTOR = "collector"
    SERVICES_ADMIN = "admin"

# ────────────────────────────────────────────────
# Error Messages
# ────────────────────────────────────────────────
class ErrorMessages:
    """Centralized error messages"""
    USER_NOT_FOUND = "User not found"
    ITEM_NOT_FOUND = "Item not found"
    INVALID_REQUEST = "Invalid request"
    DATABASE_ERROR = "Database error"
    AUTHENTICATION_FAILED = "Authentication failed"
    UNAUTHORIZED = "Unauthorized access"

# ────────────────────────────────────────────────
# Export all configuration
# ────────────────────────────────────────────────
__all__ = [
    "API_TITLE",
    "API_DESCRIPTION",
    "API_VERSION",
    "API_DOCS_URL",
    "API_REDOC_URL",
    "API_OPENAPI_URL",
    "SERVER_HOST",
    "SERVER_PORT",
    "SERVER_RELOAD",
    "CORS_ALLOW_ORIGINS",
    "CORS_ALLOW_CREDENTIALS",
    "CORS_ALLOW_METHODS",
    "CORS_ALLOW_HEADERS",
    "FIREBASE_DATABASE_URL",
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    "FRONTEND_URL",
    "FRONTEND_API_BASE_URL",
    "APIEndpoints",
    "APITags",
    "DatabaseConfig",
    "HealthCheckConfig",
    "ErrorMessages",
]

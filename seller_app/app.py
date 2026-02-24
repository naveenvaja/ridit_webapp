from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.seller import router as seller_router
from routes.collector import router as collector_router
from routes.admin import router as admin_router
from routes.storage import router as storage_router
from models import HealthCheckResponse, HealthStatus
from firebase_config import database
from config import (
    API_TITLE, API_DESCRIPTION, API_VERSION,
    API_DOCS_URL, API_REDOC_URL, API_OPENAPI_URL,
    CORS_ALLOW_ORIGINS, CORS_ALLOW_CREDENTIALS, 
    CORS_ALLOW_METHODS, CORS_ALLOW_HEADERS,
    APIEndpoints, APITags, HealthCheckConfig, DatabaseConfig
)
from datetime import datetime
import time
import os

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url=API_DOCS_URL,
    redoc_url=API_REDOC_URL,
    openapi_url=API_OPENAPI_URL
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Store startup time for uptime calculation
startup_time = time.time()

# Routes
app.include_router(auth_router, prefix=APIEndpoints.AUTH, tags=[APITags.AUTHENTICATION])
app.include_router(seller_router, prefix=APIEndpoints.SELLER, tags=[APITags.SELLER])
app.include_router(collector_router, prefix=APIEndpoints.COLLECTOR, tags=[APITags.COLLECTOR])
app.include_router(admin_router, prefix=APIEndpoints.ADMIN, tags=[APITags.ADMIN])
app.include_router(storage_router, prefix=APIEndpoints.ADMIN, tags=[APITags.ADMIN])

@app.get("/")
def read_root():
    return {
        "message": API_TITLE,
        "docs": API_DOCS_URL,
        "version": API_VERSION
    }

@app.get(APIEndpoints.HEALTH, response_model=HealthCheckResponse)
def health_check():
    """
    Health check endpoint for monitoring API status
    Returns API health, uptime, and database connectivity
    """
    try:
        # Calculate uptime
        uptime_seconds = time.time() - startup_time
        
        # Check database connectivity
        start_time = time.time()
        try:
            # Try to read from database
            test_ref = database.child(DatabaseConfig.HEALTH_CHECK_PATH).get()
            db_response_time = (time.time() - start_time) * 1000
            
            database_health = {
                "status": HealthCheckConfig.STATUS_HEALTHY if db_response_time < HealthCheckConfig.HEALTHY_RESPONSE_TIME_MS else HealthCheckConfig.STATUS_DEGRADED,
                "response_time_ms": round(db_response_time, 2),
                "collections_count": 0
            }
            
            overall_status = HealthCheckConfig.STATUS_HEALTHY if db_response_time < HealthCheckConfig.HEALTHY_RESPONSE_TIME_MS else HealthCheckConfig.STATUS_DEGRADED
        except Exception as e:
            database_health = {
                "status": HealthCheckConfig.STATUS_UNHEALTHY,
                "response_time_ms": (time.time() - start_time) * 1000,
                "collections_count": 0
            }
            overall_status = HealthCheckConfig.STATUS_UNHEALTHY
        
        return {
            "api_status": overall_status,
            "timestamp": datetime.utcnow(),
            "uptime_seconds": uptime_seconds,
            "version": API_VERSION,
            "services": {
                HealthCheckConfig.SERVICES_AUTH: "operational",
                HealthCheckConfig.SERVICES_SELLER: "operational",
                HealthCheckConfig.SERVICES_COLLECTOR: "operational",
                HealthCheckConfig.SERVICES_ADMIN: "operational"
            },
            "database": database_health,
            "message": "API is operational" if overall_status == HealthCheckConfig.STATUS_HEALTHY else "API is degraded"
        }
    except Exception as e:
        return {
            "api_status": HealthCheckConfig.STATUS_UNHEALTHY,
            "timestamp": datetime.utcnow(),
            "uptime_seconds": time.time() - startup_time,
            "version": API_VERSION,
            "services": {},
            "database": None,
            "message": f"Health check failed: {str(e)}"
        }



if __name__ == "__main__":
    import uvicorn
    from config import SERVER_HOST, SERVER_RELOAD

    port = int(os.environ.get("PORT", 8000))  # Render provides PORT

    uvicorn.run(
        "app:app",
        host="0.0.0.0",   # must be 0.0.0.0 for Render
        port=port,
        reload=SERVER_RELOAD
    )

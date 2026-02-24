from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================
class WasteCategory(str, Enum):
    plastic = "plastic"
    paper = "paper"
    metal = "metal"
    ewaste = "ewaste"

class ItemStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    collected = "collected"
    cancelled = "cancelled"

class HealthStatus(str, Enum):
    healthy = "healthy"
    degraded = "degraded"
    unhealthy = "unhealthy"

# ==================== HEALTH MODELS ====================
class ServiceHealth(BaseModel):
    name: str
    status: HealthStatus
    response_time_ms: float
    last_checked: datetime
    error_message: Optional[str] = None

class DatabaseHealth(BaseModel):
    status: HealthStatus
    response_time_ms: float
    collections_count: int
    last_checked: datetime

class HealthCheckResponse(BaseModel):
    api_status: HealthStatus
    timestamp: datetime
    uptime_seconds: float
    version: str = "1.0.0"
    services: dict = {}
    database: Optional[DatabaseHealth] = None
    message: str = "API is operational"

# ==================== USER MODELS ====================
class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: str = Field(..., pattern=r'^\d{10,}$')

class UserLogin(BaseModel):
    identifier: str = Field(..., description="Phone number, email, or use 'google'")
    password: Optional[str] = None
    google_token: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=6)
    user_type: Literal["seller", "collector"] = "seller"

class GoogleRegister(BaseModel):
    id_token: Optional[str] = None
    name: str
    email: str
    user_type: Literal["seller", "collector"] = "seller"

class User(UserBase):
    id: str
    user_type: Literal["seller", "collector"]
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ==================== SELLER MODELS ====================
class Address(BaseModel):
    street: str
    city: str
    zip_code: str
    coordinates: dict = Field(..., description="{'lat': float, 'lng': float}")

class PickupSlot(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD format")
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")

class ItemBase(BaseModel):
    category: WasteCategory
    quantity: str = Field(..., description="Approximate quantity")
    description: str = Field(..., min_length=10)

class ItemCreate(ItemBase):
    image_url: str = Field(..., description="URL or base64 of uploaded image")
    address: Address
    pickup_slot: PickupSlot

class Item(ItemBase):
    id: str
    seller_id: str
    seller_name: str
    seller_phone: str
    image_url: str
    address: Address
    pickup_slot: PickupSlot
    estimated_price: float
    status: ItemStatus = ItemStatus.pending
    accepted_by: Optional[str] = None
    collector_name: Optional[str] = None
    actual_weight: Optional[float] = None
    final_price: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ItemResponse(BaseModel):
    id: str
    estimated_price: float
    note: str = "Final price based on actual weight at pickup"
    status: ItemStatus = ItemStatus.pending

# ==================== COLLECTOR MODELS ====================
class CollectorLocationBase(BaseModel):
    latitude: float
    longitude: float
    search_radius_km: float = Field(default=10, ge=1, le=50)

class CollectorLocationUpdate(CollectorLocationBase):
    pass

class SellerLocationBase(BaseModel):
    latitude: float
    longitude: float
    area_name: Optional[str] = None

class SellerLocationUpdate(SellerLocationBase):
    pass

class Collector(UserBase):
    id: str
    location: Optional[CollectorLocationBase] = None
    total_collections: int = 0
    rating: Optional[float] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Seller(UserBase):
    id: str
    location: Optional[SellerLocationBase] = None
    total_items_posted: int = 0
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ==================== FILTER MODELS ====================
class ItemFilter(BaseModel):
    category: Optional[WasteCategory] = None
    status: Optional[ItemStatus] = ItemStatus.pending
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = 10

# ==================== RESPONSE MODELS ====================
class ItemListResponse(BaseModel):
    items: list[Item]
    total_count: int

class CollectionSummary(BaseModel):
    item_id: str
    actual_weight: float
    final_price: float
    payment_status: Literal["paid", "pending"] = "paid"

class UserProfile(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    user_type: Literal["seller", "collector"]
    created_at: Optional[datetime] = None

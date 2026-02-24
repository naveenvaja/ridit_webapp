from fastapi import APIRouter, HTTPException, status, Depends, Header
from firebase_config import database
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
import hashlib
import uuid
import os
import jwt
from datetime import timedelta

router = APIRouter()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "riditwebapp@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin@123")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

ADMIN_PASSWORD_HASH = hash_password(ADMIN_PASSWORD)

# JWT settings
JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "changeme-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = int(os.getenv("ADMIN_JWT_EXPIRES_HOURS", "8"))

# ────────────────────────────────────────────────
# SCHEMAS
# ────────────────────────────────────────────────
class AdminLoginRequest(BaseModel):
    email: str
    password: str

class UpdateUserRoleRequest(BaseModel):
    user_type: str

class SubscriptionRequest(BaseModel):
    collector_id: str
    plan_type: str = "basic"  # basic, premium, etc
    days_valid: int = 30

class CreateUserRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    user_type: str  # seller, collector, admin


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    referred_by: Optional[str] = None

class UpdateItemWeightRequest(BaseModel):
    actual_weight: float = Field(..., gt=0, description="Weight in kilograms")

# ────────────────────────────────────────────────
# AUTH HELPERS (FIXED HERE ✅)
# ────────────────────────────────────────────────
def get_current_user(authorization: str = Header(..., alias="Authorization")):
    """Validate bearer token and return user record from DB"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    token = authorization.split("Bearer ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = database.child("users").child(user_id).get()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user

def admin_only(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ────────────────────────────────────────────────
# ADMIN LOGIN
# ────────────────────────────────────────────────
@router.post("/login")
def admin_login(data: AdminLoginRequest):
    if (
        data.email != ADMIN_EMAIL
        or hash_password(data.password) != ADMIN_PASSWORD_HASH
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )

    users = database.child("users").get() or {}
    admin_id = None

    for uid, user in users.items():
        if user.get("email") == ADMIN_EMAIL and user.get("user_type") == "admin":
            admin_id = uid
            break

    if not admin_id:
        admin_id = str(uuid.uuid4())
        database.child("users").child(admin_id).set({
            "id": admin_id,
            "name": "Admin",
            "email": ADMIN_EMAIL,
            "user_type": "admin",
            "password_hash": ADMIN_PASSWORD_HASH,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })

    # Issue JWT
    payload = {
        "user_id": admin_id,
        "user_type": "admin",
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "message": "Admin login successful",
        "user_id": admin_id,
        "user_type": "admin",
        "token": token
    }

# ────────────────────────────────────────────────
# ADMIN ROUTES
# ────────────────────────────────────────────────
@router.get("/users")
def get_all_users(admin=Depends(admin_only)):
    return database.child("users").get() or {}

@router.get("/user/{user_id}")
def get_user(user_id: str, admin=Depends(admin_only)):
    user = database.child("users").child(user_id).get()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/user/{user_id}")
def delete_user(user_id: str, admin=Depends(admin_only)):
    database.child("users").child(user_id).delete()
    return {"message": "User deleted successfully"}

@router.put("/user/{user_id}/role")
def update_user_role(
    user_id: str,
    data: UpdateUserRoleRequest,
    admin=Depends(admin_only)
):
    if data.user_type not in ["admin", "seller", "collector"]:
        raise HTTPException(status_code=400, detail="Invalid user type")

    database.child("users").child(user_id).update({
        "user_type": data.user_type,
        "updated_at": datetime.utcnow().isoformat()
    })

    return {"message": f"User role updated to {data.user_type}"}


@router.post("/users/create")
def create_user(data: CreateUserRequest, admin=Depends(admin_only)):
    """Admin creates a new user (seller, collector, or admin)"""
    # Check if user already exists by phone
    users_ref = database.child("users").get()
    if users_ref:
        for user_id, user in users_ref.items():
            if isinstance(user, dict) and user.get("phone") == data.phone:
                raise HTTPException(status_code=400, detail="User with this phone already exists")
    
    if data.user_type not in ["seller", "collector", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "user_type": data.user_type,
        "password_hash": hash_password(data.password),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if data.user_type == "collector":
        user_dict["subscription"] = {
            "status": "inactive",
            "plan_type": "none",
            "expiry_date": None
        }
    
    database.child("users").child(user_id).set(user_dict)
    
    return {
        "message": "User created successfully",
        "user_id": user_id,
        "user_type": data.user_type
    }


@router.put("/user/{user_id}")
def update_user(user_id: str, data: UpdateUserRequest, admin=Depends(admin_only)):
    """Update user name, phone or referral info (admin-only)"""
    user = database.child("users").child(user_id).get()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.phone is not None:
        updates["phone"] = data.phone
    if data.referred_by is not None:
        updates["referred_by"] = data.referred_by

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.utcnow().isoformat()
    database.child("users").child(user_id).update(updates)

    return {"message": "User updated successfully", "user_id": user_id}


# ────────────────────────────────────────────────
# ITEM ADMIN ROUTES
# ────────────────────────────────────────────────

@router.get("/items")
def get_all_items(admin=Depends(admin_only)):
    """Return all items in the system"""
    return database.child("items").get() or {}


@router.put("/item/{item_id}")
def update_item(item_id: str, data: UpdateItemWeightRequest, admin=Depends(admin_only)):
    """Update item's weight in kg (admin-only)"""
    items = database.child("items").get() or {}
    # Items may be stored with generated keys; find matching id field
    found_key = None
    for key, item in items.items():
        if isinstance(item, dict) and item.get("id") == item_id:
            found_key = key
            break

    if found_key:
        database.child("items").child(found_key).update({
            "actual_weight": data.actual_weight,
            "updated_at": datetime.utcnow().isoformat()
        })
        return {"message": "Item weight updated successfully", "item_id": item_id, "actual_weight": data.actual_weight}

    # Fallback: if item_id is the firebase key, update directly
    if database.child("items").child(item_id).get():
        database.child("items").child(item_id).update({
            "actual_weight": data.actual_weight,
            "updated_at": datetime.utcnow().isoformat()
        })
        return {"message": "Item weight updated successfully", "item_id": item_id, "actual_weight": data.actual_weight}

    raise HTTPException(status_code=404, detail="Item not found")


@router.delete("/item/{item_id}")
def delete_item(item_id: str, admin=Depends(admin_only)):
    """Delete an item by id (admin-only)"""
    items = database.child("items").get() or {}
    # Items may be stored with generated keys; find matching id field
    found_key = None
    for key, item in items.items():
        if isinstance(item, dict) and item.get("id") == item_id:
            found_key = key
            break

    if found_key:
        database.child("items").child(found_key).delete()
        return {"message": "Item deleted successfully"}

    # Fallback: if item_id is the firebase key, delete directly
    if database.child("items").child(item_id).get():
        database.child("items").child(item_id).delete()
        return {"message": "Item deleted successfully"}

    raise HTTPException(status_code=404, detail="Item not found")


# ────────────────────────────────────────────────
# SUBSCRIPTION ADMIN ROUTES
# ────────────────────────────────────────────────

@router.get("/subscriptions")
def get_all_subscriptions(admin=Depends(admin_only)):
    """Get all collector subscriptions"""
    users = database.child("users").get() or {}
    subscriptions = []
    
    for user_id, user in users.items():
        if isinstance(user, dict) and user.get("user_type") == "collector":
            sub = user.get("subscription", {})
            subscriptions.append({
                "collector_id": user_id,
                "collector_name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "phone": user.get("phone", ""),
                "status": sub.get("status", "inactive"),
                "plan_type": sub.get("plan_type", "none"),
                "expiry_date": sub.get("expiry_date"),
                "created_at": sub.get("created_at")
            })
    
    return subscriptions


@router.post("/subscriptions/{collector_id}")
def activate_subscription(collector_id: str, data: SubscriptionRequest, admin=Depends(admin_only)):
    """Activate/renew subscription for a collector"""
    user = database.child("users").child(collector_id).get()
    if not user:
        raise HTTPException(status_code=404, detail="Collector not found")
    if user.get("user_type") != "collector":
        raise HTTPException(status_code=400, detail="User is not a collector")
    
    from datetime import timedelta as td
    expiry = (datetime.utcnow() + td(days=data.days_valid)).isoformat()
    
    database.child("users").child(collector_id).update({
        "subscription": {
            "status": "active",
            "plan_type": data.plan_type,
            "expiry_date": expiry,
            "created_at": datetime.utcnow().isoformat()
        },
        "updated_at": datetime.utcnow().isoformat()
    })
    
    return {
        "message": "Subscription activated",
        "collector_id": collector_id,
        "status": "active",
        "plan_type": data.plan_type,
        "expiry_date": expiry
    }


@router.delete("/subscriptions/{collector_id}")
def cancel_subscription(collector_id: str, admin=Depends(admin_only)):
    """Cancel subscription for a collector"""
    user = database.child("users").child(collector_id).get()
    if not user:
        raise HTTPException(status_code=404, detail="Collector not found")
    
    database.child("users").child(collector_id).update({
        "subscription": {
            "status": "inactive",
            "plan_type": "none",
            "expiry_date": None,
            "cancelled_at": datetime.utcnow().isoformat()
        },
        "updated_at": datetime.utcnow().isoformat()
    })
    
    return {"message": "Subscription cancelled"}
from fastapi import APIRouter, HTTPException, status, Header
from models import UserLogin, UserRegister, GoogleRegister, User, UserProfile
from firebase_config import database
import hashlib
from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel
import os
import jwt
from datetime import timedelta

router = APIRouter()

# JWT settings for regular users
USER_JWT_SECRET = os.getenv("USER_JWT_SECRET", "user-secret-change-me")
USER_JWT_ALGORITHM = "HS256"
USER_JWT_EXPIRES_HOURS = int(os.getenv("USER_JWT_EXPIRES_HOURS", "24"))

def hash_password(password: str) -> str:
    """Hash password using SHA-z256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hash_password_stored: str) -> bool:
    """Verify password against stored hash"""
    return hash_password(password) == hash_password_stored

@router.post("/register")
def register(user_data: UserRegister):
    """Register a new user (seller or collector)"""
    try:
        # Check if user already exists by phone
        users_ref = database.child("users").get()
        if users_ref:  # users_ref is already a dict
            for user_id, user in users_ref.items():
                if isinstance(user, dict) and user.get("phone") == user_data.phone:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="User with this phone number already exists"
                    )
        
        # Generate user ID
        user_id = str(uuid.uuid4())
        user_type = user_data.user_type  # Use user_type from request
        
        # Create user data
        # generate short referral code
        referral_code = uuid.uuid4().hex[:8]

        user_dict = {
            "id": user_id,
            "name": user_data.name,
            "phone": user_data.phone,
            "email": user_data.email or "",
            "user_type": user_type,
            "password_hash": hash_password(user_data.password),
            "referral_code": referral_code,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Save to database
        database.child("users").child(user_id).set(user_dict)

        # Issue JWT token for the user
        payload = {
            "user_id": user_id,
            "user_type": user_type,
            "exp": datetime.utcnow() + timedelta(hours=USER_JWT_EXPIRES_HOURS)
        }
        token = jwt.encode(payload, USER_JWT_SECRET, algorithm=USER_JWT_ALGORITHM)

        return {
            "id": user_id,
            "name": user_data.name,
            "phone": user_data.phone,
            "user_type": user_type,
            "referral_code": referral_code,
            "token": token,
            "message": "Registration successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
def login(login_data: UserLogin):
    """Login user with phone/email or Google token"""
    try:
        users_ref = database.child("users").get()
        
        if not users_ref:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Search for user by phone or email
        user_found = None
        for user_id, user_data in users_ref.items():
            if isinstance(user_data, dict):
                if (user_data.get("phone") == login_data.identifier or 
                    user_data.get("email") == login_data.identifier):
                    user_found = (user_id, user_data)
                    break
        
        if not user_found:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user_id, user_data = user_found
        
        # Verify password
        if not verify_password(login_data.password, user_data.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Issue JWT token
        payload = {
            "user_id": user_id,
            "user_type": user_data.get("user_type"),
            "exp": datetime.utcnow() + timedelta(hours=USER_JWT_EXPIRES_HOURS)
        }
        token = jwt.encode(payload, USER_JWT_SECRET, algorithm=USER_JWT_ALGORITHM)

        return {
            "id": user_id,
            "name": user_data.get("name"),
            "phone": user_data.get("phone"),
            "email": user_data.get("email"),
            "user_type": user_data.get("user_type"),
            "referral_code": user_data.get("referral_code", ""),
            "token": token,
            "message": "Login successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/google-register")
def google_register(google_data: GoogleRegister):
    """Register/login user with Google OAuth"""
    try:
        # Check if user already exists by email
        users_ref = database.child("users").get()
        user_id = None
        
        if users_ref:
            for uid, user in users_ref.items():
                if isinstance(user, dict) and user.get("email") == google_data.email:
                    user_id = uid
                    break
        
        # If user doesn't exist, create new user
        if not user_id:
            user_id = str(uuid.uuid4())
            user_dict = {
                "id": user_id,
                "name": google_data.name,
                "email": google_data.email,
                "phone": "",
                "user_type": google_data.user_type,
                "auth_provider": "google",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            database.child("users").child(user_id).set(user_dict)
        
        # Issue JWT token for the user (same as google-login)
        payload = {
            "user_id": user_id,
            "user_type": google_data.user_type,
            "exp": datetime.utcnow() + timedelta(hours=USER_JWT_EXPIRES_HOURS)
        }
        token = jwt.encode(payload, USER_JWT_SECRET, algorithm=USER_JWT_ALGORITHM)

        return {
            "id": user_id,
            "name": google_data.name,
            "email": google_data.email,
            "user_type": google_data.user_type,
            "token": token,
            "message": "Google authentication successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Google register error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google registration failed: {str(e)}"
        )

@router.post("/google-login")
def google_login(google_data: GoogleRegister):
    """Login user with Google OAuth (flexible user_type for login)"""
    try:
        # Check if user exists by email
        users_ref = database.child("users").get()
        user_id = None
        user_data = None
        
        if users_ref:
            for uid, user in users_ref.items():
                if isinstance(user, dict) and user.get("email") == google_data.email:
                    user_id = uid
                    user_data = user
                    break
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please register first with Google."
            )
        
        # Issue JWT token for the user (same as regular login)
        payload = {
            "user_id": user_id,
            "user_type": user_data.get("user_type", "seller"),
            "exp": datetime.utcnow() + timedelta(hours=USER_JWT_EXPIRES_HOURS)
        }
        token = jwt.encode(payload, USER_JWT_SECRET, algorithm=USER_JWT_ALGORITHM)

        return {
            "id": user_id,
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "phone": user_data.get("phone", ""),
            "user_type": user_data.get("user_type", "seller"),
            "token": token,
            "message": "Google login successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Google login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google login failed: {str(e)}"
        )

@router.get("/profile/{user_id}", response_model=UserProfile)
def get_profile(user_id: str):
    """Get user profile"""
    try:
        user_data = database.child("users").child(user_id).get()
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {
            "id": user_id,
            "name": user_data.get("name"),
            "phone": user_data.get("phone"),
            "email": user_data.get("email"),
            "user_type": user_data.get("user_type"),
            "created_at": user_data.get("created_at"),
            "referral_code": user_data.get("referral_code", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile fetch failed: {str(e)}"
        )


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    referred_by: Optional[str] = None


@router.put("/profile/{user_id}")
def update_profile(user_id: str, data: UpdateProfileRequest, authorization: str = Header(None, alias="Authorization")):
    """Allow a user to update their own profile fields: name, phone, referred_by
    Requires Authorization: Bearer <token> where token was issued at login/register
    """
    try:
        # validate token
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid Authorization header")
        token = authorization.split("Bearer ", 1)[1]
        try:
            payload = jwt.decode(token, USER_JWT_SECRET, algorithms=[USER_JWT_ALGORITHM])
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        token_user_id = payload.get("user_id")
        if token_user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update other user's profile")

        user_ref = database.child("users").child(user_id).get()
        if not user_ref:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        updates = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.phone is not None:
            updates["phone"] = data.phone
        if data.referred_by is not None:
            updates["referred_by"] = data.referred_by

        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        updates["updated_at"] = datetime.utcnow().isoformat()
        database.child("users").child(user_id).update(updates)

        return {"message": "Profile updated", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Update failed: {str(e)}")

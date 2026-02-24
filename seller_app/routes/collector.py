from fastapi import APIRouter, HTTPException, status
from models import Item, CollectorLocationUpdate, ItemFilter
from firebase_config import database
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime

router = APIRouter()


def resolve_user_identifier(user_identifier: str):
    """Resolve a user identifier which may be the Firebase key or the user's `id` field.
    Returns tuple (user_key, user_data) or (None, None) if not found.
    """
    # Try direct key lookup first
    user_data = database.child("users").child(user_identifier).get()
    if user_data:
        return user_identifier, user_data

    # Fallback: search users for matching `id`, `email` or `phone`
    users = database.child("users").get() or {}
    for key, u in users.items():
        if not isinstance(u, dict):
            continue
        if u.get("id") == user_identifier or u.get("email") == user_identifier or u.get("phone") == user_identifier:
            return key, u

    return None, None

def check_subscription(collector_id: str):
    """Check if collector has active subscription"""
    key, collector = resolve_user_identifier(collector_id)
    if not collector:
        raise HTTPException(status_code=404, detail="Collector not found")
    
    sub = collector.get("subscription", {})
    if sub.get("status") != "active":
        raise HTTPException(status_code=403, detail="Subscription inactive. Please subscribe to access this feature.")
    
    expiry = sub.get("expiry_date")
    if expiry and datetime.fromisoformat(expiry) < datetime.utcnow():
        # Subscription expired, set to inactive
        # update by resolved key if available
        if key:
            database.child("users").child(key).update({
                "subscription": {**sub, "status": "inactive"},
                "updated_at": datetime.utcnow().isoformat()
            })
        else:
            # best-effort: attempt to update the node using provided identifier
            database.child("users").child(collector_id).update({
                "subscription": {**sub, "status": "inactive"},
                "updated_at": datetime.utcnow().isoformat()
            })
        raise HTTPException(status_code=403, detail="Subscription expired. Please renew to continue.")
    
    return collector

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in kilometers
    """
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return distance

@router.put("/location/{collector_id}")
def set_location(collector_id: str, location: CollectorLocationUpdate):
    """Set or update collector's location and search radius"""
    try:
        # Verify collector exists
        key, collector_data = resolve_user_identifier(collector_id)
        if not collector_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collector not found"
            )
        if collector_data.get("user_type") != "collector":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a collector"
            )
        
        # Update location
        # write using resolved key when possible
        write_key = key if key else collector_id
        database.child("users").child(write_key).update({
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "search_radius_km": location.search_radius_km
            },
            "updated_at": datetime.utcnow().isoformat()
        })
        
        return {
            "message": "Location updated successfully",
            "latitude": location.latitude,
            "longitude": location.longitude,
            "search_radius_km": location.search_radius_km
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/location/{collector_id}")
def get_location(collector_id: str):
    """Return collector's stored location if available"""
    try:
        key, collector_data = resolve_user_identifier(collector_id)
        if not collector_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found")

        # Only collectors should have location data
        if collector_data.get("user_type") != "collector":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a collector")

        location = collector_data.get("location") or {}
        return {
            "location": location
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/items")
def get_available_items(
    collector_id: str,
    category: str = None,
    latitude: float = None,
    longitude: float = None,
    radius_km: float = 10
):
    """Get available items for collector with optional filters"""
    # Ensure collector exists and has active subscription before returning available items
    key, collector_data = resolve_user_identifier(collector_id)
    if not collector_data:
        raise HTTPException(status_code=404, detail="Collector not found")
    check_subscription(collector_id)
    
    try:
        # Get collector location if not provided
        if latitude is None or longitude is None:
            collector_data = database.child("users").child(collector_id).get()
            if collector_data:
                location = collector_data.get("location", {})
                latitude = location.get("latitude")
                longitude = location.get("longitude")
                radius_km = location.get("search_radius_km", 10)
        
        # Get all pending items
        items_ref = database.child("items").get()
        items = []
        
        if items_ref:
            for item_id, item_data in items_ref.items():
                if item_data.get("status") != "pending":
                    continue
                
                if category and item_data.get("category") != category:
                    continue
                
                # Filter by distance from BOTH collector and seller location
                if latitude and longitude:
                    # Get seller location
                    seller_id = item_data.get("seller_id")
                    seller_data = database.child("users").child(seller_id).get() if seller_id else None
                    seller_location = seller_data.get("location", {}) if seller_data else {}
                    
                    seller_lat = seller_location.get("latitude")
                    seller_lng = seller_location.get("longitude")
                    
                    # If seller has set location, use it; otherwise use item's address coordinates
                    if not seller_lat or not seller_lng:
                        coords = item_data.get("address", {}).get("coordinates", {})
                        seller_lat = coords.get("lat")
                        seller_lng = coords.get("lng")
                    
                    if seller_lat and seller_lng:
                        # Calculate distance from collector to seller/item
                        distance = calculate_distance(
                            latitude, longitude,
                            seller_lat, seller_lng
                        )
                        item_data["distance_km"] = round(distance, 2)
                        
                        # Only show items within collector's radius (use provided radius_km)
                        effective_radius = radius_km or 10
                        if distance > effective_radius:
                            continue
                
                items.append(item_data)
        
        return {
            "items": items,
            "total_count": len(items),
            "collector_location": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/items/{item_id}/accept")
def accept_item(item_id: str, collector_id: str):
    """Collector accepts a waste collection request, only if within 10km of item location"""
    # Verify collector exists
    key, collector_data = resolve_user_identifier(collector_id)
    if not collector_data:
        raise HTTPException(status_code=404, detail="Collector not found")

    try:
        item_data = database.child("items").child(item_id).get()
        if not item_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        if item_data.get("status") != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item is not available for acceptance"
            )

        # Get collector location
        collector_location = collector_data.get("location") or {}
        c_lat = collector_location.get("latitude")
        c_lng = collector_location.get("longitude")
        if c_lat is None or c_lng is None:
            raise HTTPException(status_code=400, detail="Collector location not set")

        # Get item/seller location
        seller_id = item_data.get("seller_id")
        seller_data = database.child("users").child(seller_id).get() if seller_id else None
        seller_location = seller_data.get("location", {}) if seller_data else {}
        s_lat = seller_location.get("latitude")
        s_lng = seller_location.get("longitude")
        # Fallback to item's address coordinates if seller location not set
        if not s_lat or not s_lng:
            coords = item_data.get("address", {}).get("coordinates", {})
            s_lat = coords.get("lat")
            s_lng = coords.get("lng")

        if s_lat is None or s_lng is None:
            raise HTTPException(status_code=400, detail="Item location not set")

        # Calculate distance
        distance = calculate_distance(float(c_lat), float(c_lng), float(s_lat), float(s_lng))
        if distance > 10:
            raise HTTPException(status_code=403, detail=f"Collector is {distance:.2f} km away; must be within 10 km to accept this item.")

        # Get collector details (use resolved data)
        collector_name = collector_data.get("name") if collector_data else None
        collector_phone = collector_data.get("phone") if collector_data else None

        # Update item with collector contact details
        database.child("items").child(item_id).update({
            "status": "accepted",
            "accepted_by": collector_id,
            "collector_name": collector_name,
            "collector_phone": collector_phone,
            "updated_at": datetime.utcnow().isoformat()
        })
        # Fetch seller details to return to collector
        seller_info = None
        if seller_data:
            seller_info = {
                "id": seller_id,
                "name": seller_data.get("name"),
                "phone": seller_data.get("phone"),
                "address": seller_data.get("location") or seller_data.get("address") or {}
            }

        return {
            "message": "Item accepted successfully",
            "item_id": item_id,
            "collector_id": collector_id,
            "collector_name": collector_name,
            "collector_phone": collector_phone,
            "estimated_price": item_data.get("estimated_price"),
            "seller": seller_info
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@router.get("/my-accepted")
def get_my_accepted_items(collector_id: str):
    try:
        # ensure collector exists
        key, collector_data = resolve_user_identifier(collector_id)
        if not collector_data:
            raise HTTPException(status_code=404, detail="Collector not found")

        items_ref = database.child("items").get()
        results = []

        if not items_ref:
            return {"items": [], "count": 0}

        for item_key, item_data in items_ref.items():
            # Ensure item_data is a dict
            if not isinstance(item_data, dict):
                continue

            if (
                item_data.get("status") != "accepted" or
                item_data.get("accepted_by") != collector_id
            ):
                continue

            seller_id = item_data.get("seller_id")
            seller = {}
            if seller_id:
                seller_data = database.child("users").child(seller_id).get()
                if seller_data and isinstance(seller_data, dict):
                    seller = seller_data

            results.append({
                "id": item_key,
                "seller_id": seller_id,
                "seller_name": seller.get("name", "Unknown"),
                "seller_phone": seller.get("phone", "N/A"),
                "accepted_by": collector_id,
                **item_data
            })

        return {
            "items": results,
            "count": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accepted items: {str(e)}")
    

@router.post("/items/{item_id}/complete")
def complete_collection(
    item_id: str,
    collector_id: str,
    actual_weight: float
):
    """Mark item as collected after weighing and paying seller"""
    try:
        item_data = database.child("items").child(item_id).get()
        
        if not item_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        if item_data.get("status") != "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item must be accepted before completion"
            )
        
        if item_data.get("accepted_by") != collector_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned collector can complete this item"
            )
        
        # Calculate final price based on actual weight
        category = item_data.get("category")
        price_per_unit = {
            "plastic": 15,
            "paper": 10,
            "metal": 40,
            "ewaste": 60
        }.get(category, 0)
        
        final_price = price_per_unit * actual_weight
        
        # Update item
        database.child("items").child(item_id).update({
            "status": "collected",
            "actual_weight": actual_weight,
            "final_price": final_price,
            "collected_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Update collector stats
        collector_data = database.child("users").child(collector_id).get()
        total_collections = (collector_data.get("total_collections") or 0) + 1
        
        database.child("users").child(collector_id).update({
            "total_collections": total_collections,
            "updated_at": datetime.utcnow().isoformat()
        })
        
        return {
            "message": "Item collected successfully",
            "item_id": item_id,
            "actual_weight": actual_weight,
            "estimated_price": item_data.get("estimated_price"),
            "final_price": final_price,
            "payment_status": "paid"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

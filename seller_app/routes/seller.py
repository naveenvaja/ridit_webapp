from fastapi import APIRouter, HTTPException, status
from models import ItemCreate, Item, ItemResponse, ItemStatus, SellerLocationUpdate
from firebase_config import database
from datetime import datetime
import uuid

router = APIRouter()

MATERIAL_PRICE = {
    # Prices are interpreted as ₹ per kg by default.
    # Use realistic per-kg INR values (adjust as needed for your market).
    "plastic": 15,      # ₹15 per kg
    "paper": 10,        # ₹10 per kg
    "metal": 40,        # ₹40 per kg
    "ewaste": 60        # ₹60 per kg
}

@router.post("/items/add", response_model=ItemResponse)
def add_item(seller_id: str, item: ItemCreate):
    """Add a new waste item listing"""
    try:
        # Get seller info
        seller_data = database.child("users").child(seller_id).get()
        if not seller_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller not found"
            )
        
        # Calculate estimated price
        price_per_unit = MATERIAL_PRICE.get(item.category)
        if not price_per_unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {list(MATERIAL_PRICE.keys())}"
            )
        
        estimated_price = price_per_unit * float(item.quantity)
        
        # Generate item ID
        item_id = str(uuid.uuid4())
        
        # Create item data
        item_dict = {
            "id": item_id,
            "category": item.category,
            "quantity": item.quantity,
            "description": item.description,
            "image_url": item.image_url,
            "address": {
                "street": item.address.street,
                "city": item.address.city,
                "zip_code": item.address.zip_code,
                "coordinates": item.address.coordinates
            },
            "pickup_slot": {
                "date": item.pickup_slot.date,
                "start_time": item.pickup_slot.start_time,
                "end_time": item.pickup_slot.end_time
            },
            "seller_id": seller_id,
            "seller_name": seller_data.get("name"),
            "seller_phone": seller_data.get("phone"),
            "estimated_price": estimated_price,
            "status": "pending",
            "accepted_by": None,
            "collector_name": None,
            "actual_weight": None,
            "final_price": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Save to database
        database.child("items").child(item_id).set(item_dict)

        # If an image_url was provided and points to GCS/Firebase Storage, ensure cache-control is set
        try:
            image_url = item_dict.get('image_url')
            if image_url:
                from ..firebase_config import set_cache_control_for_gcs_url
                # best-effort; don't fail the request if metadata update fails
                set_cache_control_for_gcs_url(image_url, 'public, max-age=31536000')
        except Exception:
            pass
        
        return {
            "id": item_id,
            "estimated_price": estimated_price,
            "status": "pending",
            "note": "Final price based on actual weight at pickup"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/items/{seller_id}")
def get_seller_items(seller_id: str, status_filter: str = None):
    """Get all items listed by a seller"""
    try:
        items_ref = database.child("items").get()
        items = []
        
        if items_ref:
            for item_id, item_data in items_ref.items():
                if item_data.get("seller_id") == seller_id:
                    if status_filter and item_data.get("status") != status_filter:
                        continue
                    items.append(item_data)
        
        return {
            "items": items,
            "total_count": len(items)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/items/{item_id}/status")
def get_item_status(item_id: str):
    """Get status of a specific item"""
    try:
        item_data = database.child("items").child(item_id).get()
        
        if not item_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return {
            "item_id": item_id,
            "status": item_data.get("status"),
            "accepted_by": item_data.get("collector_name"),
            "collector_phone": item_data.get("collector_phone"),
            "estimated_price": item_data.get("estimated_price"),
            "final_price": item_data.get("final_price"),
            "created_at": item_data.get("created_at"),
            "updated_at": item_data.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/items/{item_id}/cancel")
def cancel_item(item_id: str):
    """Cancel an item listing (only if status is pending)"""
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
                detail="Can only cancel pending items"
            )
        
        # Update status
        database.child("items").child(item_id).update({
            "status": "cancelled",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        return {"message": "Item cancelled successfully", "item_id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/items/{item_id}")
def delete_item(item_id: str):
    """Delete an item permanently"""
    try:
        item_data = database.child("items").child(item_id).get()
        
        if not item_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        # Delete from database
        database.child("items").child(item_id).delete()
        
        return {"message": "Item deleted successfully", "item_id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/location/{seller_id}")
def set_seller_location(seller_id: str, location: SellerLocationUpdate):
    """Set or update seller's location"""
    try:
        # Verify seller exists
        seller_data = database.child("users").child(seller_id).get()
        if not seller_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller not found"
            )
        if seller_data.get("user_type") != "seller":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a seller"
            )
        
        # Update seller location
        database.child("users").child(seller_id).update({
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "area_name": location.area_name or ""
            },
            "updated_at": datetime.utcnow().isoformat()
        })
        
        return {
            "message": "Location updated successfully",
            "latitude": location.latitude,
            "longitude": location.longitude,
            "area_name": location.area_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/location/{seller_id}")
def get_seller_location(seller_id: str):
    """Get seller's location"""
    try:
        seller_data = database.child("users").child(seller_id).get()
        if not seller_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller not found"
            )
        
        location = seller_data.get("location", {})
        return {
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "area_name": location.get("area_name", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


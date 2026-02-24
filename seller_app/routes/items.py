from fastapi import APIRouter
from models import ItemCreate, ItemResponse
from firebase_config import database

router = APIRouter()

# Legacy endpoint - use /api/seller/items/add instead
MATERIAL_PRICE = {
    "plastic": 15,
    "paper": 10,
    "metal": 40,
    "ewaste": 60
}

@router.post("/add", response_model=ItemResponse, deprecated=True)
def add_item(item: ItemCreate):
    """[DEPRECATED] Use POST /api/seller/items/add instead"""
    data = item.dict()
    estimated_price = MATERIAL_PRICE[data["category"]] * float(data["quantity"])

    database.child("items").push({
        **data,
        "estimated_price": estimated_price,
        "status": "pending"
    })

    return {
        "estimated_price": estimated_price,
        "note": "Final price based on actual weight at pickup"
    }

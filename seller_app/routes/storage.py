from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from firebase_config import set_cache_control_for_gcs_url

router = APIRouter()


class PatchCacheRequest(BaseModel):
    image_url: str
    cache_control: str = 'public, max-age=31536000'


@router.post("/storage/patch-cache-control")
def patch_cache_control(payload: PatchCacheRequest):
    """Manually patch Cache-Control metadata for a storage URL.

    Accepts Firebase Storage download URLs, storage.googleapis.com URLs, or gs:// URIs.
    """
    try:
        success = set_cache_control_for_gcs_url(payload.image_url, payload.cache_control)
        if success:
            return {"success": True, "message": "Cache-Control metadata updated"}
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update metadata or unsupported URL format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

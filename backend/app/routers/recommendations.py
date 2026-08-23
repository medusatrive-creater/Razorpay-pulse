from fastapi import APIRouter
from app.services.data_store import get_store
from app.models.schemas import Recommendation

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=list[Recommendation])
def list_recommendations():
    return get_store().list_recommendations()

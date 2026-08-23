from fastapi import APIRouter
from app.services.data_store import get_store
from app.models.schemas import Prediction

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("", response_model=list[Prediction])
def list_predictions():
    return get_store().list_predictions()

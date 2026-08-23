from fastapi import APIRouter, HTTPException
from app.services.data_store import get_store
from app.models.schemas import Incident

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=list[Incident])
def list_incidents():
    return get_store().list_incidents()


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    incident = get_store().get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

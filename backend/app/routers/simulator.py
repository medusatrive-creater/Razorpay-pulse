from fastapi import APIRouter
from app.services.simulator import get_simulator
from app.services.data_store import get_store
from app.models.schemas import InjectLatencyRequest, InjectFailureRequest, SimulatorState

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


@router.post("/start", response_model=SimulatorState)
def start_simulator():
    sim = get_simulator()
    sim.start()
    return SimulatorState(mode=sim.mode, active_injections=sim.active_injections(), started_at=sim.started_at)


@router.post("/inject-latency", response_model=SimulatorState)
def inject_latency(req: InjectLatencyRequest):
    sim = get_simulator()
    sim.inject_latency(req)
    return SimulatorState(mode=sim.mode, active_injections=sim.active_injections(), started_at=sim.started_at)


@router.post("/inject-failure", response_model=SimulatorState)
def inject_failure(req: InjectFailureRequest):
    sim = get_simulator()
    sim.inject_failure(req)
    return SimulatorState(mode=sim.mode, active_injections=sim.active_injections(), started_at=sim.started_at)


@router.post("/reset", response_model=SimulatorState)
def reset_simulator():
    sim = get_simulator()
    sim.reset()
    get_store().clear()
    return SimulatorState(mode=sim.mode, active_injections=[], started_at=None)


@router.get("/state", response_model=SimulatorState)
def get_state():
    sim = get_simulator()
    return SimulatorState(mode=sim.mode, active_injections=sim.active_injections(), started_at=sim.started_at)

"""
RazorPay Pulse — FastAPI entrypoint.

Runs a background loop that:
  1. Generates simulated transactions continuously (so the dashboard is
     "alive" the moment the app starts — required for the demo scenario).
  2. Periodically runs anomaly detection -> incident creation.
  3. Periodically runs the predictive risk engine.

This is intentionally a simple asyncio background task rather than a real
Pub/Sub consumer for the local/demo path. In production (DATA_BACKEND=
bigquery, PUBSUB_ENABLED=true) transactions would instead be published to
Pub/Sub by checkout/order services and consumed here or by a Cloud Run
Pub/Sub push subscription — the ingestion contract (Transaction schema)
is identical either way.
"""
from __future__ import annotations
import asyncio
import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.services.simulator import get_simulator
from app.services.data_store import get_store
from app.services.anomaly import run_detection
from app.services.prediction import run_predictions
from app.routers import dashboard, transactions, incidents, predictions, recommendations, ai, simulator as simulator_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-powered Payment Experience Intelligence — detect, explain, predict, recommend.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(incidents.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(ai.router)
app.include_router(simulator_router.router)


@app.get("/")
def root():
    return {"service": settings.app_name, "status": "ok", "data_backend": settings.data_backend, "ai_provider": settings.ai_provider}


@app.get("/healthz")
def healthz():
    return {"status": "healthy"}


_background_task: asyncio.Task | None = None


async def _traffic_and_detection_loop():
    sim = get_simulator()
    store = get_store()
    sim.start()
    tick = 0
    while True:
        try:
            # baseline ~6-10 transactions/second feels lively without flooding memory
            for _ in range(6):
                store.add_transaction(sim.generate_transaction())

            tick += 1
            if tick % 5 == 0:  # every ~5s run detection + prediction
                run_detection()
                run_predictions()

            await asyncio.sleep(1)
        except asyncio.CancelledError:
            break
        except Exception:
            # never let a bad tick kill the demo loop
            await asyncio.sleep(1)


@app.on_event("startup")
async def on_startup():
    global _background_task
    _background_task = asyncio.create_task(_traffic_and_detection_loop())


@app.on_event("shutdown")
async def on_shutdown():
    if _background_task:
        _background_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _background_task

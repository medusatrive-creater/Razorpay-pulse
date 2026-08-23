"""
Central configuration for RazorPay Pulse backend.

Everything that changes between local-dev and real-GCP deployment is
controlled here via environment variables — no code changes needed to
go from MVP demo to production wiring.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "RazorPay Pulse"
    environment: str = "local"  # local | staging | production

    # --- Data backend ---
    # "memory"   -> InMemoryStore (default, no GCP needed, used for buildathon demo)
    # "bigquery" -> BigQueryStore (real GCP project required)
    data_backend: str = "memory"
    gcp_project_id: str | None = None
    bigquery_dataset: str = "razorpay_pulse"

    # --- Messaging ---
    pubsub_enabled: bool = False
    pubsub_topic: str = "payment-telemetry"

    # --- AI provider ---
    # "mock"   -> deterministic rule-based JSON that mimics Gemini's contract (no API key needed)
    # "vertex" -> real Gemini via Vertex AI
    ai_provider: str = "mock"
    vertex_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"

    # --- Razorpay (test/sandbox only) ---
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None

    # --- CORS ---
    frontend_origin: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""
Pydantic models — these mirror the BigQuery table schemas 1:1 so the
InMemoryStore and BigQueryStore can be swapped without touching the API layer.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


class PaymentMethod(str, Enum):
    upi = "upi"
    card = "card"
    netbanking = "netbanking"
    wallet = "wallet"


class Gateway(str, Enum):
    razorpay = "razorpay"


class Region(str, Enum):
    tamil_nadu = "Tamil Nadu"
    maharashtra = "Maharashtra"
    karnataka = "Karnataka"
    delhi_ncr = "Delhi NCR"
    telangana = "Telangana"


class Device(str, Enum):
    android = "android"
    ios = "ios"
    web = "web"


class TransactionStatus(str, Enum):
    success = "success"
    failed = "failed"
    pending = "pending"


class Severity(str, Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"
    critical = "CRITICAL"


class IncidentStatus(str, Enum):
    open = "OPEN"
    investigating = "INVESTIGATING"
    resolved = "RESOLVED"


class RecommendationStatus(str, Enum):
    proposed = "PROPOSED"
    accepted = "ACCEPTED"
    dismissed = "DISMISSED"


# ---------------------------------------------------------------- transactions
class StageLatency(BaseModel):
    """One hop in the Payment Journey."""
    stage: str
    latency_ms: int
    status: TransactionStatus
    timestamp: datetime
    error: Optional[str] = None


class Transaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: new_id("txn"))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    amount: float
    currency: str = "INR"
    payment_method: PaymentMethod
    gateway: Gateway = Gateway.razorpay
    region: Region
    device: Device
    status: TransactionStatus
    error_code: Optional[str] = None

    checkout_latency_ms: int
    api_latency_ms: int
    gateway_latency_ms: int
    bank_latency_ms: int
    callback_latency_ms: int
    total_latency_ms: int

    # simulated vs organic, for transparency in the UI (rule 11)
    source: str = "simulated"  # "simulated" | "razorpay_test"

    journey: list[StageLatency] = Field(default_factory=list)


# ---------------------------------------------------------------- incidents
class Incident(BaseModel):
    incident_id: str = Field(default_factory=lambda: new_id("inc"))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    severity: Severity
    title: str
    description: str
    root_cause: Optional[str] = None
    affected_method: Optional[PaymentMethod] = None
    affected_region: Optional[Region] = None
    affected_transactions: int = 0
    estimated_value_at_risk: float = 0.0
    confidence: Optional[float] = None
    status: IncidentStatus = IncidentStatus.open
    ai_generated: bool = False


# ---------------------------------------------------------------- predictions
class Prediction(BaseModel):
    prediction_id: str = Field(default_factory=lambda: new_id("pred"))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    component: str
    metric: str
    current_value: float
    predicted_value: float
    probability: float
    time_window: str
    reason: str


# ---------------------------------------------------------------- recommendations
class Recommendation(BaseModel):
    recommendation_id: str = Field(default_factory=lambda: new_id("rec"))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    incident_id: Optional[str] = None
    action: str
    expected_impact: str
    confidence: float
    status: RecommendationStatus = RecommendationStatus.proposed


# ---------------------------------------------------------------- simulator
class InjectLatencyRequest(BaseModel):
    component: str  # "checkout" | "api" | "gateway" | "bank" | "callback"
    payment_method: Optional[PaymentMethod] = None
    region: Optional[Region] = None
    latency_ms: int
    duration_minutes: int = 5


class InjectFailureRequest(BaseModel):
    payment_method: Optional[PaymentMethod] = None
    region: Optional[Region] = None
    failure_rate: float = Field(ge=0, le=1)
    duration_minutes: int = 5


class SimulatorState(BaseModel):
    mode: str = "normal"
    active_injections: list[dict] = Field(default_factory=list)
    started_at: Optional[datetime] = None


# ---------------------------------------------------------------- dashboard
class DashboardSummary(BaseModel):
    success_rate: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    failed_transactions: int
    total_transactions: int
    active_incidents: int
    transactions_at_risk: int
    estimated_value_at_risk: float
    health: str  # "HEALTHY" | "DEGRADED" | "CRITICAL"
    window: str = "last_15_minutes"

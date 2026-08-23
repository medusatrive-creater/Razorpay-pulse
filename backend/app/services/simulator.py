"""
Payment traffic simulator.

Generates realistic-looking transactions with a full Payment Journey
(checkout -> order api -> gateway -> payment method -> bank -> callback),
and supports judge-triggered degradation injections for the demo scenario
in the brief (Section 8).

All simulated data is tagged source="simulated" so it's never confused with
real Razorpay test-mode data (Rule 11).
"""
from __future__ import annotations
import random
from datetime import datetime, timedelta
from threading import Lock
from typing import Optional

from app.models.schemas import (
    Transaction, StageLatency, PaymentMethod, Region, Device,
    TransactionStatus, InjectLatencyRequest, InjectFailureRequest,
)

STAGE_NAMES = ["checkout", "order_api", "gateway", "payment_method", "bank", "callback"]

BASE_LATENCY = {  # healthy baseline, ms — tuned so organic P95 sits ~350-450ms
    "checkout": (20, 60),
    "order_api": (30, 70),
    "gateway": (40, 90),
    "payment_method": (40, 140),   # UPI/card/etc handshake
    "bank": (40, 110),
    "callback": (40, 110),
}

BASE_FAILURE_RATE = 0.013  # ~1.3% organic failure rate, feels realistic


class Injection:
    def __init__(self, component: str, latency_ms: int, duration_minutes: int,
                 payment_method: Optional[PaymentMethod] = None, region: Optional[Region] = None,
                 failure_rate: Optional[float] = None):
        self.component = component
        self.latency_ms = latency_ms
        self.failure_rate = failure_rate
        self.payment_method = payment_method
        self.region = region
        self.expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)

    def active(self) -> bool:
        return datetime.utcnow() < self.expires_at

    def applies_to(self, payment_method: PaymentMethod, region: Region) -> bool:
        if self.payment_method and self.payment_method != payment_method:
            return False
        if self.region and self.region != region:
            return False
        return True


class Simulator:
    def __init__(self):
        self._lock = Lock()
        self._injections: list[Injection] = []
        self.mode = "normal"
        self.started_at: Optional[datetime] = None

    # ---- control plane -------------------------------------------------
    def start(self):
        with self._lock:
            self.mode = "running"
            self.started_at = datetime.utcnow()

    def inject_latency(self, req: InjectLatencyRequest):
        with self._lock:
            self._injections.append(Injection(
                component=req.component, latency_ms=req.latency_ms,
                duration_minutes=req.duration_minutes,
                payment_method=req.payment_method, region=req.region,
            ))

    def inject_failure(self, req: InjectFailureRequest):
        with self._lock:
            self._injections.append(Injection(
                component="failure", latency_ms=0, duration_minutes=req.duration_minutes,
                payment_method=req.payment_method, region=req.region, failure_rate=req.failure_rate,
            ))

    def reset(self):
        with self._lock:
            self._injections.clear()
            self.mode = "normal"
            self.started_at = None

    def active_injections(self) -> list[dict]:
        with self._lock:
            self._injections = [i for i in self._injections if i.active()]
            return [
                {
                    "component": i.component,
                    "latency_ms": i.latency_ms,
                    "failure_rate": i.failure_rate,
                    "payment_method": i.payment_method.value if i.payment_method else None,
                    "region": i.region.value if i.region else None,
                    "expires_at": i.expires_at.isoformat(),
                }
                for i in self._injections
            ]

    # ---- generation ------------------------------------------------------
    def _extra_latency_for(self, component: str, payment_method: PaymentMethod, region: Region) -> int:
        extra = 0
        for inj in self._injections:
            if not inj.active() or inj.component != component:
                continue
            if inj.applies_to(payment_method, region):
                extra += inj.latency_ms
        return extra

    def _failure_rate_for(self, payment_method: PaymentMethod, region: Region) -> float:
        rate = BASE_FAILURE_RATE
        for inj in self._injections:
            if inj.active() and inj.component == "failure" and inj.applies_to(payment_method, region):
                rate += inj.failure_rate or 0
        return min(rate, 0.95)

    def generate_transaction(self) -> Transaction:
        payment_method = random.choice(list(PaymentMethod))
        region = random.choice(list(Region))
        device = random.choice(list(Device))
        amount = round(random.uniform(99, 24999), 2)

        failure_rate = self._failure_rate_for(payment_method, region)
        will_fail = random.random() < failure_rate

        journey: list[StageLatency] = []
        total = 0
        ts = datetime.utcnow()
        failed_at_stage: Optional[str] = None

        for idx, stage in enumerate(STAGE_NAMES):
            lo, hi = BASE_LATENCY[stage]
            latency = random.randint(lo, hi) + self._extra_latency_for(stage, payment_method, region)
            total += latency

            stage_status = TransactionStatus.success
            error = None
            if will_fail and failed_at_stage is None and (stage in ("bank", "payment_method") and random.random() < 0.6 or idx == len(STAGE_NAMES) - 1):
                stage_status = TransactionStatus.failed
                error = random.choice(["BANK_DECLINE", "TIMEOUT", "INSUFFICIENT_FUNDS", "GATEWAY_ERROR"])
                failed_at_stage = stage

            journey.append(StageLatency(
                stage=stage, latency_ms=latency, status=stage_status,
                timestamp=ts, error=error,
            ))
            ts += timedelta(milliseconds=latency)

        status = TransactionStatus.failed if failed_at_stage else TransactionStatus.success
        error_code = next((s.error for s in journey if s.error), None)

        return Transaction(
            amount=amount,
            payment_method=payment_method,
            region=region,
            device=device,
            status=status,
            error_code=error_code,
            checkout_latency_ms=journey[0].latency_ms,
            api_latency_ms=journey[1].latency_ms,
            gateway_latency_ms=journey[2].latency_ms,
            bank_latency_ms=journey[3].latency_ms + journey[4].latency_ms,
            callback_latency_ms=journey[5].latency_ms,
            total_latency_ms=total,
            source="simulated",
            journey=journey,
        )


_simulator_instance: Optional[Simulator] = None


def get_simulator() -> Simulator:
    global _simulator_instance
    if _simulator_instance is None:
        _simulator_instance = Simulator()
    return _simulator_instance

"""
Aggregation logic used by the dashboard and (later) by the anomaly engine.
Kept dependency-free (no numpy) so Cloud Run cold starts stay fast.
"""
from __future__ import annotations
import math
from app.models.schemas import Transaction, DashboardSummary


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    data = sorted(values)
    k = (len(data) - 1) * (pct / 100)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return data[int(k)]
    return data[f] + (data[c] - data[f]) * (k - f)


def compute_summary(transactions: list[Transaction], active_incident_count: int) -> DashboardSummary:
    if not transactions:
        return DashboardSummary(
            success_rate=100.0, avg_latency_ms=0, p95_latency_ms=0, p99_latency_ms=0,
            failed_transactions=0, total_transactions=0, active_incidents=active_incident_count,
            transactions_at_risk=0, estimated_value_at_risk=0, health="HEALTHY",
        )

    total = len(transactions)
    failed = [t for t in transactions if t.status.value == "failed"]
    latencies = [t.total_latency_ms for t in transactions]
    success_rate = round(100 * (total - len(failed)) / total, 2)
    avg_latency = round(sum(latencies) / total, 1)
    p95 = round(percentile(latencies, 95), 1)
    p99 = round(percentile(latencies, 99), 1)

    at_risk = [t for t in transactions if t.total_latency_ms > 900 or t.status.value == "failed"]
    value_at_risk = round(sum(t.amount for t in at_risk), 2)

    if success_rate < 90 or p95 > 2000 or active_incident_count >= 3:
        health = "CRITICAL"
    elif success_rate < 97 or p95 > 700 or active_incident_count >= 1:
        health = "DEGRADED"
    else:
        health = "HEALTHY"

    return DashboardSummary(
        success_rate=success_rate,
        avg_latency_ms=avg_latency,
        p95_latency_ms=p95,
        p99_latency_ms=p99,
        failed_transactions=len(failed),
        total_transactions=total,
        active_incidents=active_incident_count,
        transactions_at_risk=len(at_risk),
        estimated_value_at_risk=value_at_risk,
        health=health,
    )

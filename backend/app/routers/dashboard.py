from fastapi import APIRouter
from app.services.data_store import get_store
from app.services.metrics import compute_summary
from app.models.schemas import DashboardSummary, IncidentStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    store = get_store()
    txns = store.list_transactions(limit=5000, since_minutes=15)
    active_incidents = [i for i in store.list_incidents() if i.status != IncidentStatus.resolved]
    return compute_summary(txns, len(active_incidents))


@router.get("/latency")
def get_latency_series():
    """Bucketed latency time series for charting (1-min buckets, last 15 min)."""
    store = get_store()
    txns = store.list_transactions(limit=5000, since_minutes=15)
    buckets: dict[str, list[int]] = {}
    for t in txns:
        key = t.timestamp.strftime("%H:%M")
        buckets.setdefault(key, []).append(t.total_latency_ms)

    from app.services.metrics import percentile
    series = [
        {
            "time": k,
            "avg": round(sum(v) / len(v), 1),
            "p95": round(percentile(v, 95), 1),
            "p99": round(percentile(v, 99), 1),
        }
        for k, v in sorted(buckets.items())
    ]
    return {"series": series}


@router.get("/success-rate")
def get_success_rate_series():
    store = get_store()
    txns = store.list_transactions(limit=5000, since_minutes=15)
    buckets: dict[str, list[str]] = {}
    for t in txns:
        key = t.timestamp.strftime("%H:%M")
        buckets.setdefault(key, []).append(t.status.value)

    series = [
        {
            "time": k,
            "success_rate": round(100 * v.count("success") / len(v), 2),
        }
        for k, v in sorted(buckets.items())
    ]
    return {"series": series}

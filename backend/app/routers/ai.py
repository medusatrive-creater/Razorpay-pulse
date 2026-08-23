from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.services.data_store import get_store
from app.services.ai_provider import get_ai_provider
from app.services.metrics import percentile
from app.services.recommendation import recommendations_for_incident
from app.models.schemas import IncidentStatus

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze/{incident_id}")
def analyze_incident(incident_id: str):
    store = get_store()
    incident = store.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.utcnow()
    all_txns = store.list_transactions(limit=5000, since_minutes=5)
    method = incident.affected_method
    current = [t for t in all_txns if t.timestamp >= now - timedelta(seconds=20) and (not method or t.payment_method == method)]
    baseline = [t for t in all_txns if now - timedelta(seconds=150) <= t.timestamp < now - timedelta(seconds=20) and (not method or t.payment_method == method)]

    if not current or not baseline:
        raise HTTPException(status_code=400, detail="Not enough telemetry to analyze yet")

    cur_p95 = percentile([t.total_latency_ms for t in current], 95)
    base_p95 = percentile([t.total_latency_ms for t in baseline], 95) or 1
    cur_bank = percentile([t.bank_latency_ms for t in current], 95)
    base_bank = percentile([t.bank_latency_ms for t in baseline], 95) or 1

    region_counts: dict[str, int] = {}
    for t in current:
        region_counts[t.region.value] = region_counts.get(t.region.value, 0) + 1
    top_region = max(region_counts, key=region_counts.get) if region_counts else "multiple regions"

    # Aggregated-only context sent to the AI — never raw transaction rows (Rule 3.E)
    context = {
        "payment_method": method.value if method else "all",
        "time_window": "last_20s_vs_prior_baseline",
        "transactions": len(current),
        "success_rate": round(100 * sum(1 for t in current if t.status.value == "success") / len(current), 1),
        "current_p95_ms": round(cur_p95, 0),
        "previous_p95_ms": round(base_p95, 0),
        "p95_ratio": round(cur_p95 / base_p95, 2),
        "bank_latency_current_ms": round(cur_bank, 0),
        "bank_latency_previous_ms": round(base_bank, 0),
        "bank_latency_ratio": round(cur_bank / base_bank, 2),
        "top_region": top_region,
    }

    provider = get_ai_provider()
    try:
        analysis = provider.analyze_incident(context)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid output: {e}")

    incident.root_cause = analysis["root_cause"]
    incident.confidence = analysis["confidence"]
    incident.description = analysis["explanation"]
    incident.status = IncidentStatus.investigating
    incident.ai_generated = True
    store.update_incident(incident)

    recs = recommendations_for_incident(incident)

    return {
        "incident_id": incident_id,
        "ai_provider": provider.label,
        "context_sent_to_ai": context,
        "analysis": analysis,
        "recommendations": [r.model_dump(mode="json") for r in recs],
    }


@router.post("/explain/{transaction_id}")
def explain_transaction(transaction_id: str):
    store = get_store()
    txn = store.get_transaction(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    slow_stage = max(txn.journey, key=lambda s: s.latency_ms) if txn.journey else None
    explanation = (
        f"This transaction {'failed' if txn.status.value == 'failed' else 'completed'} in {txn.total_latency_ms}ms."
    )
    if slow_stage:
        explanation += f" The slowest stage was '{slow_stage.stage}' at {slow_stage.latency_ms}ms."
    if txn.error_code:
        explanation += f" Error code: {txn.error_code}."

    return {"transaction_id": transaction_id, "explanation": explanation, "slowest_stage": slow_stage}

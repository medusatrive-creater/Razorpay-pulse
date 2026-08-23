"""
Lightweight anomaly detection (Sprint 2 scope, wired early so Sprint 1's
demo loop is end-to-end runnable).

Approach: compare the last 2 minutes ("current") against the prior 10
minutes ("baseline") per payment_method segment. If P95 latency more than
doubles, or failure rate jumps significantly, open an incident. This is
intentionally simple threshold logic, not ML — matches the brief's
"lightweight predictive mechanism" guidance in spirit.
"""
from __future__ import annotations
from datetime import datetime, timedelta

from app.models.schemas import Transaction, Incident, Severity, IncidentStatus, Region
from app.services.metrics import percentile
from app.services.data_store import get_store


def _severity_for(p95_ratio: float, failure_rate: float) -> Severity:
    if p95_ratio >= 6 or failure_rate >= 0.35:
        return Severity.critical
    if p95_ratio >= 3 or failure_rate >= 0.15:
        return Severity.high
    if p95_ratio >= 1.8 or failure_rate >= 0.07:
        return Severity.medium
    return Severity.low


CURRENT_WINDOW_SECONDS = 20
BASELINE_WINDOW_SECONDS = 150  # 2.5 min of baseline before the current window
MIN_SAMPLES = 8


def run_detection() -> list[Incident]:
    """
    Demo-tuned windows: at ~6 txn/sec baseline traffic, 20s gives ~120
    current-window samples and 150s gives ~900 baseline samples — enough
    to detect degradation within roughly 30-60s of an injection, which is
    what a live buildathon demo needs (nobody waits 12 minutes).
    """
    store = get_store()
    all_txns = store.list_transactions(limit=5000, since_minutes=5)
    now = datetime.utcnow()
    current_window = [t for t in all_txns if t.timestamp >= now - timedelta(seconds=CURRENT_WINDOW_SECONDS)]
    baseline_window = [
        t for t in all_txns
        if now - timedelta(seconds=BASELINE_WINDOW_SECONDS) <= t.timestamp < now - timedelta(seconds=CURRENT_WINDOW_SECONDS)
    ]

    if len(current_window) < MIN_SAMPLES or len(baseline_window) < MIN_SAMPLES:
        return []

    new_incidents: list[Incident] = []
    open_titles = {i.title for i in store.list_incidents() if i.status != IncidentStatus.resolved}

    for method in {t.payment_method for t in current_window}:
        cur = [t for t in current_window if t.payment_method == method]
        base = [t for t in baseline_window if t.payment_method == method]
        if len(cur) < 5 or len(base) < 5:
            continue

        cur_p95 = percentile([t.total_latency_ms for t in cur], 95)
        base_p95 = percentile([t.total_latency_ms for t in base], 95) or 1
        ratio = cur_p95 / base_p95

        cur_failure_rate = sum(1 for t in cur if t.status.value == "failed") / len(cur)
        base_failure_rate = sum(1 for t in base if t.status.value == "failed") / len(base)

        if ratio < 1.8 and cur_failure_rate < base_failure_rate + 0.06:
            continue  # healthy

        # find most-affected region within this segment
        region_counts: dict[str, int] = {}
        for t in cur:
            region_counts[t.region.value] = region_counts.get(t.region.value, 0) + 1
        top_region = max(region_counts, key=region_counts.get) if region_counts else None

        title = f"{method.value.upper()} latency/failure degradation"
        if title in open_titles:
            continue

        severity = _severity_for(ratio, cur_failure_rate)
        at_risk_value = round(sum(t.amount for t in cur if t.total_latency_ms > 900 or t.status.value == "failed"), 2)

        incident = Incident(
            severity=severity,
            title=title,
            description=(
                f"{method.value.upper()} P95 latency rose from {base_p95:.0f}ms to {cur_p95:.0f}ms "
                f"({ratio:.1f}x) over the last {CURRENT_WINDOW_SECONDS}s, with failure rate at {cur_failure_rate*100:.1f}% "
                f"(baseline {base_failure_rate*100:.1f}%)."
            ),
            affected_method=method,
            affected_region=Region(top_region) if top_region else None,
            affected_transactions=len(cur),
            estimated_value_at_risk=at_risk_value,
            confidence=round(min(0.5 + (ratio - 1.8) * 0.08, 0.97), 2),
            status=IncidentStatus.open,
            ai_generated=False,
        )
        # region is optional in schema type but we captured a string; store separately if needed
        store.add_incident(incident)
        new_incidents.append(incident)

    return new_incidents

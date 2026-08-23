"""
Lightweight predictive risk — linear trend extrapolation over P95 latency
per payment method, exactly matching the brief's "does not need to be an
advanced ML model" guidance (Section 3.F).
"""
from __future__ import annotations
from datetime import datetime, timedelta

from app.models.schemas import Prediction, PaymentMethod
from app.services.metrics import percentile
from app.services.data_store import get_store


def run_predictions() -> list[Prediction]:
    store = get_store()
    txns = store.list_transactions(limit=5000, since_minutes=5)
    now = datetime.utcnow()

    predictions: list[Prediction] = []
    for method in PaymentMethod:
        recent = [t for t in txns if t.payment_method == method and t.timestamp >= now - timedelta(seconds=20)]
        older = [t for t in txns if t.payment_method == method and now - timedelta(seconds=150) <= t.timestamp < now - timedelta(seconds=20)]
        if len(recent) < 5 or len(older) < 5:
            continue

        cur_p95 = percentile([t.total_latency_ms for t in recent], 95)
        prev_p95 = percentile([t.total_latency_ms for t in older], 95) or 1

        trend_rate = (cur_p95 - prev_p95) / prev_p95  # fractional change over the baseline window
        # Cap the extrapolation multiplier so a very steep spike doesn't produce
        # an implausible predicted value — real degradations don't grow unbounded.
        capped_trend = max(min(trend_rate, 2.0), -0.9)
        predicted_15min = cur_p95 * (1 + max(capped_trend, 0) * 0.6)

        probability = min(max(trend_rate * 1.8, 0), 0.97) if trend_rate > 0 else round(0.05 + trend_rate * 0.1, 2)
        probability = max(probability, 0.02)

        reason = (
            f"P95 latency moved from {prev_p95:.0f}ms to {cur_p95:.0f}ms over the last ~2 minutes "
            f"({trend_rate*100:+.0f}%). Extrapolating this trend forward."
            if trend_rate > 0 else
            f"P95 latency is stable/improving ({trend_rate*100:+.0f}% over ~2 minutes); low degradation risk."
        )

        pred = Prediction(
            component=method.value,
            metric="p95_latency_ms",
            current_value=round(cur_p95, 1),
            predicted_value=round(predicted_15min, 1),
            probability=round(probability, 2),
            time_window="next_60_seconds",
            reason=reason,
        )
        store.add_prediction(pred)
        predictions.append(pred)

    return predictions

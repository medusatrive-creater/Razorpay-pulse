from __future__ import annotations
from app.models.schemas import Recommendation, Incident, Severity
from app.services.data_store import get_store


def recommendations_for_incident(incident: Incident) -> list[Recommendation]:
    store = get_store()
    recs: list[Recommendation] = []

    if incident.severity in (Severity.high, Severity.critical):
        recs.append(Recommendation(
            incident_id=incident.incident_id,
            action=f"Surface an alternate payment method when {incident.affected_method.value if incident.affected_method else 'the affected'} latency exceeds threshold",
            expected_impact="Reduces checkout abandonment for affected customers during the degradation window.",
            confidence=incident.confidence or 0.8,
        ))
        recs.append(Recommendation(
            incident_id=incident.incident_id,
            action="Escalate incident to on-call payments engineer",
            expected_impact="Faster human investigation of upstream dependency.",
            confidence=0.9,
        ))
    if incident.severity == Severity.critical:
        recs.append(Recommendation(
            incident_id=incident.incident_id,
            action="Reduce checkout timeout threshold to fail fast and retry eligible requests",
            expected_impact="Limits customer-perceived wait time; increases successful retry rate.",
            confidence=0.75,
        ))
    if incident.affected_region:
        recs.append(Recommendation(
            incident_id=incident.incident_id,
            action=f"Monitor {incident.affected_region.value} region closely for the next 30 minutes",
            expected_impact="Early detection if degradation spreads to adjacent regions.",
            confidence=0.7,
        ))

    for r in recs:
        store.add_recommendation(r)
    return recs

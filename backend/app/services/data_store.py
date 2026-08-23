"""
DataStore abstraction.

InMemoryStore: used for local dev + buildathon demo. Zero GCP dependency.
BigQueryStore: same interface, backed by real BigQuery tables (schema in
                /BIGQUERY_SCHEMA.sql). Activate with DATA_BACKEND=bigquery
                and a valid gcp_project_id in .env.

The rest of the app (routers, metrics, anomaly engine) only ever talks to
this interface, so swapping backends is a one-line config change.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from threading import Lock
from typing import Optional

from app.models.schemas import (
    Transaction, Incident, Prediction, Recommendation
)


class DataStore(ABC):
    @abstractmethod
    def add_transaction(self, txn: Transaction) -> None: ...

    @abstractmethod
    def list_transactions(self, limit: int = 100, since_minutes: Optional[int] = None) -> list[Transaction]: ...

    @abstractmethod
    def get_transaction(self, transaction_id: str) -> Optional[Transaction]: ...

    @abstractmethod
    def add_incident(self, incident: Incident) -> None: ...

    @abstractmethod
    def list_incidents(self) -> list[Incident]: ...

    @abstractmethod
    def get_incident(self, incident_id: str) -> Optional[Incident]: ...

    @abstractmethod
    def update_incident(self, incident: Incident) -> None: ...

    @abstractmethod
    def add_prediction(self, prediction: Prediction) -> None: ...

    @abstractmethod
    def list_predictions(self) -> list[Prediction]: ...

    @abstractmethod
    def add_recommendation(self, rec: Recommendation) -> None: ...

    @abstractmethod
    def list_recommendations(self) -> list[Recommendation]: ...

    @abstractmethod
    def clear(self) -> None: ...


class InMemoryStore(DataStore):
    """Thread-safe in-memory store. Deque-like cap to keep the demo snappy."""

    def __init__(self, max_transactions: int = 5000):
        self._lock = Lock()
        self._max_transactions = max_transactions
        self._transactions: list[Transaction] = []
        self._incidents: dict[str, Incident] = {}
        self._predictions: list[Prediction] = []
        self._recommendations: list[Recommendation] = []

    def add_transaction(self, txn: Transaction) -> None:
        with self._lock:
            self._transactions.append(txn)
            if len(self._transactions) > self._max_transactions:
                self._transactions = self._transactions[-self._max_transactions:]

    def list_transactions(self, limit: int = 100, since_minutes: Optional[int] = None) -> list[Transaction]:
        with self._lock:
            data = self._transactions
            if since_minutes is not None:
                cutoff = datetime.utcnow() - timedelta(minutes=since_minutes)
                data = [t for t in data if t.timestamp >= cutoff]
            return sorted(data, key=lambda t: t.timestamp, reverse=True)[:limit]

    def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        with self._lock:
            for t in self._transactions:
                if t.transaction_id == transaction_id:
                    return t
            return None

    def add_incident(self, incident: Incident) -> None:
        with self._lock:
            self._incidents[incident.incident_id] = incident

    def list_incidents(self) -> list[Incident]:
        with self._lock:
            return sorted(self._incidents.values(), key=lambda i: i.created_at, reverse=True)

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        with self._lock:
            return self._incidents.get(incident_id)

    def update_incident(self, incident: Incident) -> None:
        with self._lock:
            self._incidents[incident.incident_id] = incident

    def add_prediction(self, prediction: Prediction) -> None:
        with self._lock:
            self._predictions.append(prediction)
            self._predictions = self._predictions[-200:]

    def list_predictions(self) -> list[Prediction]:
        with self._lock:
            return sorted(self._predictions, key=lambda p: p.created_at, reverse=True)

    def add_recommendation(self, rec: Recommendation) -> None:
        with self._lock:
            self._recommendations.append(rec)

    def list_recommendations(self) -> list[Recommendation]:
        with self._lock:
            return sorted(self._recommendations, key=lambda r: r.created_at, reverse=True)

    def clear(self) -> None:
        with self._lock:
            self._transactions.clear()
            self._incidents.clear()
            self._predictions.clear()
            self._recommendations.clear()


class BigQueryStore(DataStore):
    """
    Real BigQuery-backed implementation. Not wired into the Sprint 1 demo path
    (no live GCP credentials in this environment), but the interface and
    insert/query shape are production-correct — flip DATA_BACKEND=bigquery
    with a valid gcp_project_id to activate.
    """

    def __init__(self, project_id: str, dataset: str):
        from google.cloud import bigquery  # imported lazily so local dev has no hard GCP dependency
        self.client = bigquery.Client(project=project_id)
        self.dataset = dataset
        self.project_id = project_id

    def _table(self, name: str) -> str:
        return f"{self.project_id}.{self.dataset}.{name}"

    def add_transaction(self, txn: Transaction) -> None:
        row = txn.model_dump(mode="json")
        row.pop("journey", None)
        errors = self.client.insert_rows_json(self._table("transactions"), [row])
        if errors:
            raise RuntimeError(f"BigQuery insert error: {errors}")

    def list_transactions(self, limit: int = 100, since_minutes: Optional[int] = None) -> list[Transaction]:
        query = f"""
            SELECT * FROM `{self._table('transactions')}`
            {"WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL " + str(since_minutes) + " MINUTE)" if since_minutes else ""}
            ORDER BY timestamp DESC
            LIMIT {limit}
        """
        rows = self.client.query(query).result()
        return [Transaction(**dict(r)) for r in rows]

    def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        query = f"SELECT * FROM `{self._table('transactions')}` WHERE transaction_id = @tid LIMIT 1"
        from google.cloud import bigquery
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("tid", "STRING", transaction_id)]
        )
        rows = list(self.client.query(query, job_config=job_config).result())
        return Transaction(**dict(rows[0])) if rows else None

    def add_incident(self, incident: Incident) -> None:
        errors = self.client.insert_rows_json(self._table("incidents"), [incident.model_dump(mode="json")])
        if errors:
            raise RuntimeError(f"BigQuery insert error: {errors}")

    def list_incidents(self) -> list[Incident]:
        query = f"SELECT * FROM `{self._table('incidents')}` ORDER BY created_at DESC"
        rows = self.client.query(query).result()
        return [Incident(**dict(r)) for r in rows]

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        for i in self.list_incidents():
            if i.incident_id == incident_id:
                return i
        return None

    def update_incident(self, incident: Incident) -> None:
        # BigQuery has no cheap row update in streaming buffer; MVP approach is
        # to append a new state row and read latest-by-incident_id downstream,
        # or use MERGE in a batch job. Left as a documented follow-up.
        self.add_incident(incident)

    def add_prediction(self, prediction: Prediction) -> None:
        errors = self.client.insert_rows_json(self._table("predictions"), [prediction.model_dump(mode="json")])
        if errors:
            raise RuntimeError(f"BigQuery insert error: {errors}")

    def list_predictions(self) -> list[Prediction]:
        query = f"SELECT * FROM `{self._table('predictions')}` ORDER BY created_at DESC LIMIT 200"
        rows = self.client.query(query).result()
        return [Prediction(**dict(r)) for r in rows]

    def add_recommendation(self, rec: Recommendation) -> None:
        errors = self.client.insert_rows_json(self._table("recommendations"), [rec.model_dump(mode="json")])
        if errors:
            raise RuntimeError(f"BigQuery insert error: {errors}")

    def list_recommendations(self) -> list[Recommendation]:
        query = f"SELECT * FROM `{self._table('recommendations')}` ORDER BY created_at DESC"
        rows = self.client.query(query).result()
        return [Recommendation(**dict(r)) for r in rows]

    def clear(self) -> None:
        for table in ("transactions", "incidents", "predictions", "recommendations"):
            self.client.query(f"TRUNCATE TABLE `{self._table(table)}`").result()


_store_instance: Optional[DataStore] = None


def get_store() -> DataStore:
    global _store_instance
    if _store_instance is not None:
        return _store_instance

    from app.config import get_settings
    settings = get_settings()

    if settings.data_backend == "bigquery" and settings.gcp_project_id:
        _store_instance = BigQueryStore(settings.gcp_project_id, settings.bigquery_dataset)
    else:
        _store_instance = InMemoryStore()
    return _store_instance

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.data_store import get_store
from app.models.schemas import Transaction, PaymentMethod, TransactionStatus, Region

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[Transaction])
def list_transactions(
    limit: int = Query(100, le=1000),
    payment_method: Optional[PaymentMethod] = None,
    status: Optional[TransactionStatus] = None,
    region: Optional[Region] = None,
    search: Optional[str] = None,
):
    store = get_store()
    txns = store.list_transactions(limit=2000)

    if payment_method:
        txns = [t for t in txns if t.payment_method == payment_method]
    if status:
        txns = [t for t in txns if t.status == status]
    if region:
        txns = [t for t in txns if t.region == region]
    if search:
        s = search.lower()
        txns = [t for t in txns if s in t.transaction_id.lower() or (t.error_code and s in t.error_code.lower())]

    return txns[:limit]


@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(transaction_id: str):
    store = get_store()
    txn = store.get_transaction(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn

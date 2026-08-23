"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Transaction } from "@/lib/api";
import { PulseLine } from "@/components/PulseLine";
import { TxnStatusBadge } from "@/components/Badges";
import { LoadingBlock, ErrorBlock } from "@/components/States";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  checkout: "Checkout UI",
  order_api: "Order API",
  gateway: "Razorpay API",
  payment_method: "Payment Method",
  bank: "Bank / PSP",
  callback: "Callback",
};

function stageIcon(status: string, latency: number) {
  if (status === "failed") return <XCircle size={16} className="text-signal-critical" />;
  if (latency > 1200) return <AlertTriangle size={16} className="text-signal-warning" />;
  return <CheckCircle2 size={16} className="text-signal-success" />;
}

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const load = useCallback(() => {
    api
      .transaction(params.id)
      .then(setTxn)
      .catch((e) => setError(e.message));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = await api.explainTransaction(params.id);
      setExplanation(res.explanation);
    } catch (e) {
      setExplanation("Couldn't generate an explanation right now.");
    } finally {
      setExplaining(false);
    }
  };

  if (error) return <ErrorBlock message={error} />;
  if (!txn) return <LoadingBlock label="Loading transaction…" />;

  const maxLatency = Math.max(...txn.journey.map((s) => s.latency_ms), 1);

  return (
    <div className="space-y-6">
      <Link href="/transactions" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={14} /> Back to transactions
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">{txn.transaction_id}</h1>
          <p className="text-sm text-text-muted">
            ₹{txn.amount.toLocaleString("en-IN")} · {txn.payment_method.toUpperCase()} · {txn.region} · {new Date(txn.timestamp).toLocaleString()}
          </p>
        </div>
        <TxnStatusBadge status={txn.status} />
      </header>

      {/* Payment Journey timeline — the PulseLine here is data-driven, not decorative:
          each connector's spike height is proportional to that stage's real latency. */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-primary">Payment Journey</h2>
          <span className="font-mono text-sm text-text-muted">
            Total: <span className="text-text-primary">{txn.total_latency_ms}ms</span>
          </span>
        </div>

        <div className="space-y-1">
          {txn.journey.map((stage, idx) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <div className="flex w-40 shrink-0 items-center gap-2">
                {stageIcon(stage.status, stage.latency_ms)}
                <span className="text-sm text-text-primary">{STAGE_LABELS[stage.stage] || stage.stage}</span>
              </div>
              <div className="flex flex-1 items-center">
                {idx > 0 && (
                  <PulseLine
                    mode="journey"
                    intensity={stage.latency_ms / maxLatency}
                    color={stage.status === "failed" ? "#EF4444" : stage.latency_ms > 1200 ? "#F59E0B" : "#6366F1"}
                    width={80}
                    height={20}
                  />
                )}
              </div>
              <span
                className={`w-16 shrink-0 text-right font-mono text-sm ${
                  stage.status === "failed" ? "text-signal-critical" : stage.latency_ms > 1200 ? "text-signal-warning" : "text-text-primary"
                }`}
              >
                {stage.latency_ms}ms
              </span>
              {stage.error && <span className="shrink-0 text-xs text-signal-critical">{stage.error}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* AI explain */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-primary">Explain this transaction</h2>
          <button
            onClick={handleExplain}
            disabled={explaining}
            className="rounded-md bg-pulse px-3 py-1.5 text-xs font-medium text-white hover:bg-pulse-bright disabled:opacity-50"
          >
            {explaining ? "Analyzing…" : "Explain"}
          </button>
        </div>
        {explanation && <p className="text-sm text-text-muted">{explanation}</p>}
        {!explanation && <p className="text-sm text-text-faint">Click Explain for a plain-language summary of this transaction.</p>}
      </div>
    </div>
  );
}

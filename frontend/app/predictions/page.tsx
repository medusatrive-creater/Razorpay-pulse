"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/States";
import { TrendingUp } from "lucide-react";

export default function PredictionsPage() {
  const fetcher = useCallback(() => api.predictions(), []);
  const { data: predictions, error } = usePolling(fetcher, 4000);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl font-semibold text-text-primary">Predictive Risk</h1>
        <p className="text-sm text-text-muted">Trend-based projection of where latency is headed per payment method.</p>
      </header>

      {error && <ErrorBlock message={error} />}
      {!error && !predictions && <LoadingBlock />}
      {!error && predictions && predictions.length === 0 && (
        <EmptyBlock title="Not enough trend data yet" hint="Predictions appear once there's enough traffic history to compare windows." />
      )}

      {!error && predictions && predictions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predictions.slice(0, 12).map((p) => {
            const rising = p.predicted_value > p.current_value;
            const highRisk = p.probability >= 0.5;
            return (
              <div
                key={p.prediction_id}
                className={`rounded-lg border p-4 shadow-card ${
                  highRisk ? "border-signal-warning/30 bg-signal-warning/5" : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{p.component}</span>
                  <TrendingUp size={14} className={rising ? "text-signal-warning" : "text-signal-success"} />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-lg text-text-primary">{Math.round(p.current_value)}ms</span>
                  <span className="text-text-faint">→</span>
                  <span className={`font-mono text-lg ${rising ? "text-signal-warning" : "text-signal-success"}`}>
                    {Math.round(p.predicted_value)}ms
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Degradation probability:{" "}
                  <span className={highRisk ? "text-signal-warning" : "text-signal-success"}>{Math.round(p.probability * 100)}%</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-faint">{p.reason}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

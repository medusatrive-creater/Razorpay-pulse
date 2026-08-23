"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/States";
import { Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  const fetcher = useCallback(() => api.recommendations(), []);
  const { data: recs, error } = usePolling(fetcher, 4000);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl font-semibold text-text-primary">AI Recommendations</h1>
        <p className="text-sm text-text-muted">Advisory actions generated from active incidents. Nothing here changes real payment routing.</p>
      </header>

      {error && <ErrorBlock message={error} />}
      {!error && !recs && <LoadingBlock />}
      {!error && recs && recs.length === 0 && (
        <EmptyBlock title="No recommendations yet" hint="Recommendations are generated once an incident's AI analysis has run." />
      )}

      {!error && recs && recs.length > 0 && (
        <div className="space-y-3">
          {recs.map((r) => (
            <div key={r.recommendation_id} className="rounded-lg border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-pulse/10 p-1.5">
                  <Sparkles size={14} className="text-pulse-bright" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{r.action}</p>
                  <p className="mt-1 text-xs text-text-faint">{r.expected_impact}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span>Confidence: {Math.round(r.confidence * 100)}%</span>
                    <span className="rounded-full border border-line-soft px-2 py-0.5 text-[11px]">{r.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

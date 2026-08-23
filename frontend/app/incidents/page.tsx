"use client";

import { useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { SeverityBadge, IncidentStatusBadge, AIBadge } from "@/components/Badges";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/States";

export default function IncidentsPage() {
  const fetcher = useCallback(() => api.incidents(), []);
  const { data: incidents, error } = usePolling(fetcher, 3000);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl font-semibold text-text-primary">AI Incident Center</h1>
        <p className="text-sm text-text-muted">Automatically opened when payment telemetry deviates from baseline.</p>
      </header>

      {error && <ErrorBlock message={error} />}
      {!error && !incidents && <LoadingBlock />}
      {!error && incidents && incidents.length === 0 && (
        <EmptyBlock title="No incidents" hint="Everything is within normal bounds. Trigger the Simulator to see detection in action." />
      )}

      {!error && incidents && incidents.length > 0 && (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link
              key={inc.incident_id}
              href={`/incidents/${inc.incident_id}`}
              className="block rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-pulse/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={inc.severity} />
                <IncidentStatusBadge status={inc.status} />
                {inc.ai_generated && <AIBadge />}
                <span className="ml-auto font-mono text-xs text-text-faint">
                  {new Date(inc.created_at).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="mt-2 font-display text-base font-medium text-text-primary">{inc.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-text-muted">{inc.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-faint">
                <span>Affected: {inc.affected_transactions} txns</span>
                <span>Value at risk: ₹{inc.estimated_value_at_risk.toLocaleString("en-IN")}</span>
                {inc.confidence !== null && <span>Confidence: {Math.round(inc.confidence * 100)}%</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

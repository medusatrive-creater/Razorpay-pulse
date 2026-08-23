"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Incident, type Recommendation } from "@/lib/api";
import { SeverityBadge, IncidentStatusBadge, AIBadge } from "@/components/Badges";
import { LoadingBlock, ErrorBlock } from "@/components/States";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .incident(params.id)
      .then(setIncident)
      .catch((e) => setError(e.message));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await api.analyzeIncident(params.id);
      setAnalysis(res.analysis);
      setContext(res.context_sent_to_ai);
      setAiProvider(res.ai_provider);
      setRecommendations(res.recommendations);
      load();
    } catch (e: any) {
      setAnalyzeError(e.message || "Not enough telemetry yet — try again in a few seconds.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (error) return <ErrorBlock message={error} />;
  if (!incident) return <LoadingBlock label="Loading incident…" />;

  return (
    <div className="space-y-6">
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={14} /> Back to incidents
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
          {incident.ai_generated && <AIBadge />}
        </div>
        <h1 className="font-display text-xl font-semibold text-text-primary">{incident.title}</h1>
        <p className="text-sm text-text-muted">{incident.description}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Affected txns" value={incident.affected_transactions.toString()} />
        <Stat label="Value at risk" value={`₹${incident.estimated_value_at_risk.toLocaleString("en-IN")}`} />
        <Stat label="Method" value={incident.affected_method?.toUpperCase() || "—"} />
        <Stat label="Confidence" value={incident.confidence ? `${Math.round(incident.confidence * 100)}%` : "—"} />
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-primary">AI Root Cause Analysis</h2>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-md bg-pulse px-3 py-1.5 text-xs font-medium text-white hover:bg-pulse-bright disabled:opacity-50"
          >
            <Sparkles size={13} /> {analyzing ? "Analyzing…" : "Run analysis"}
          </button>
        </div>

        {analyzeError && <p className="text-sm text-signal-warning">{analyzeError}</p>}

        {!analysis && !analyzeError && (
          <p className="text-sm text-text-faint">
            Aggregates the latest telemetry (never raw transaction rows) and sends it to Gemini for a structured root-cause read.
          </p>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Root cause" value={String(analysis.root_cause)} />
              <Field label="Affected segment" value={String(analysis.affected_segment)} />
              <Field label="Explanation" value={String(analysis.explanation)} span />
              <Field label="Recommendation" value={String(analysis.recommendation)} span />
              <Field label="Expected impact" value={String(analysis.expected_impact)} span />
            </div>

            {context && (
              <details className="rounded-md border border-line-soft bg-ink/40 p-3">
                <summary className="cursor-pointer text-xs font-medium text-text-muted">
                  Aggregated context sent to {aiProvider === "gemini" ? "Gemini" : "AI (mock provider)"}
                </summary>
                <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-text-faint">
                  {JSON.stringify(context, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-text-primary">Recommended actions</h2>
          <ul className="space-y-2.5">
            {recommendations.map((r) => (
              <li key={r.recommendation_id} className="rounded-md border border-line-soft bg-ink/30 p-3">
                <p className="text-sm text-text-primary">{r.action}</p>
                <p className="mt-0.5 text-xs text-text-faint">{r.expected_impact}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <span className="text-[11px] uppercase tracking-wide text-text-faint">{label}</span>
      <p className="mt-1 font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <span className="text-[11px] uppercase tracking-wide text-text-faint">{label}</span>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
    </div>
  );
}

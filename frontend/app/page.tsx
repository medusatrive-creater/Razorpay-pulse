"use client";

import { useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { MetricCard } from "@/components/MetricCard";
import { HealthBadge } from "@/components/Badges";
import { LoadingBlock, ErrorBlock } from "@/components/States";
import { Activity, AlertTriangle, IndianRupee, ShieldAlert, TrendingDown, Zap } from "lucide-react";

export default function OverviewPage() {
  const summaryFetcher = useCallback(() => api.dashboardSummary(), []);
  const latencyFetcher = useCallback(() => api.latencySeries(), []);
  const successFetcher = useCallback(() => api.successRateSeries(), []);

  const { data: summary, error: summaryError } = usePolling(summaryFetcher, 4000);
  const { data: latency } = usePolling(latencyFetcher, 4000);
  const { data: successRate } = usePolling(successFetcher, 4000);

  if (summaryError) return <ErrorBlock message={summaryError} />;
  if (!summary) return <LoadingBlock label="Loading payment health…" />;

  const currency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Overview</h1>
          <p className="text-sm text-text-muted">Live payment experience across all methods and regions.</p>
        </div>
        <HealthBadge health={summary.health} />
      </header>

      {/* Row 1 — top-line metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Success rate"
          value={summary.success_rate.toFixed(1)}
          suffix="%"
          tone={summary.success_rate >= 97 ? "good" : "bad"}
          trendLabel={`${summary.total_transactions} txns / 15m`}
          icon={<Activity size={15} className="text-text-faint" />}
        />
        <MetricCard
          label="P95 latency"
          value={Math.round(summary.p95_latency_ms)}
          suffix="ms"
          tone={summary.p95_latency_ms <= 700 ? "good" : "bad"}
          trendLabel={`P99 ${Math.round(summary.p99_latency_ms)}ms`}
          icon={<Zap size={15} className="text-text-faint" />}
        />
        <MetricCard
          label="Failed transactions"
          value={summary.failed_transactions}
          tone={summary.failed_transactions === 0 ? "good" : "bad"}
          trendLabel={`avg ${Math.round(summary.avg_latency_ms)}ms`}
          icon={<TrendingDown size={15} className="text-text-faint" />}
        />
        <MetricCard
          label="Active incidents"
          value={summary.active_incidents}
          tone={summary.active_incidents === 0 ? "good" : "bad"}
          trendLabel={`${summary.transactions_at_risk} txns at risk`}
          icon={<ShieldAlert size={15} className="text-text-faint" />}
        />
      </div>

      {/* Row 2 — value at risk callout */}
      {summary.estimated_value_at_risk > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-signal-warning/30 bg-signal-warning/5 px-4 py-3">
          <AlertTriangle size={18} className="shrink-0 text-signal-warning" />
          <p className="text-sm text-text-primary">
            <span className="font-mono font-medium text-signal-warning">{currency(summary.estimated_value_at_risk)}</span>{" "}
            in transaction value is currently at risk across {summary.transactions_at_risk} transactions.
          </p>
        </div>
      )}

      {/* Row 3 — charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-text-primary">Latency trend (last 15 min)</h2>
          {latency && latency.series.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={latency.series}>
                <CartesianGrid stroke="#1A222B" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#5B6673", fontSize: 11 }} axisLine={{ stroke: "#232C36" }} tickLine={false} />
                <YAxis tick={{ fill: "#5B6673", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: "#171E27", border: "1px solid #232C36", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#8A96A3" }}
                />
                <Area type="monotone" dataKey="avg" stroke="#38BDF8" fill="#38BDF822" strokeWidth={1.5} name="avg" />
                <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="p95" />
                <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={1.5} dot={false} name="p99" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-xs text-text-faint">
              Waiting for enough traffic to chart…
            </div>
          )}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-text-primary">Success rate (last 15 min)</h2>
          {successRate && successRate.series.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={successRate.series}>
                <CartesianGrid stroke="#1A222B" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#5B6673", fontSize: 11 }} axisLine={{ stroke: "#232C36" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#5B6673", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "#171E27", border: "1px solid #232C36", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#8A96A3" }}
                />
                <Area type="monotone" dataKey="success_rate" stroke="#22C55E" fill="#22C55E22" strokeWidth={1.5} name="success %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-xs text-text-faint">
              Waiting for enough traffic to chart…
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-faint">
        <IndianRupee size={12} />
        All figures reflect simulated buildathon traffic unless a live Razorpay test-mode source is configured.
      </div>
    </div>
  );
}

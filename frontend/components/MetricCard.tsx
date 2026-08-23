import { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  suffix,
  trend,
  trendLabel,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  tone?: "neutral" | "good" | "bad";
  icon?: ReactNode;
}) {
  const trendColor =
    tone === "good" ? "text-signal-success" : tone === "bad" ? "text-signal-critical" : "text-text-muted";

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-semibold text-text-primary">{value}</span>
        {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
      </div>
      {trendLabel && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-mono ${trendColor}`}>
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

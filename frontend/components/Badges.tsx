import type { Severity, TxnStatus, IncidentStatus } from "@/lib/api";

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: "bg-signal-info/10 text-signal-info border-signal-info/30",
  MEDIUM: "bg-signal-warning/10 text-signal-warning border-signal-warning/30",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  CRITICAL: "bg-signal-critical/10 text-signal-critical border-signal-critical/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide ${SEVERITY_STYLES[severity]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

const TXN_STATUS_STYLES: Record<TxnStatus, string> = {
  success: "text-signal-success",
  failed: "text-signal-critical",
  pending: "text-signal-warning",
};

const TXN_STATUS_LABEL: Record<TxnStatus, string> = {
  success: "Success",
  failed: "Failed",
  pending: "Pending",
};

export function TxnStatusBadge({ status }: { status: TxnStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TXN_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {TXN_STATUS_LABEL[status]}
    </span>
  );
}

const INCIDENT_STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: "bg-signal-critical/10 text-signal-critical border-signal-critical/30",
  INVESTIGATING: "bg-pulse/10 text-pulse-bright border-pulse/30",
  RESOLVED: "bg-signal-success/10 text-signal-success border-signal-success/30",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${INCIDENT_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function HealthBadge({ health }: { health: "HEALTHY" | "DEGRADED" | "CRITICAL" }) {
  const styles: Record<string, string> = {
    HEALTHY: "bg-signal-success/10 text-signal-success border-signal-success/30",
    DEGRADED: "bg-signal-warning/10 text-signal-warning border-signal-warning/30",
    CRITICAL: "bg-signal-critical/10 text-signal-critical border-signal-critical/30",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${styles[health]}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {health}
    </span>
  );
}

export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-pulse/40 bg-pulse/10 px-2 py-0.5 text-[11px] font-medium text-pulse-bright">
      AI-generated
    </span>
  );
}

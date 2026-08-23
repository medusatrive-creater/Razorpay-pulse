export function LoadingBlock({ label = "Loading telemetry…" }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface text-text-faint">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-pulse border-t-transparent" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface/50 text-center">
      <span className="text-sm font-medium text-text-muted">{title}</span>
      {hint && <span className="max-w-xs text-xs text-text-faint">{hint}</span>}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-signal-critical/30 bg-signal-critical/5 text-center">
      <span className="text-sm font-medium text-signal-critical">Couldn&apos;t reach the backend</span>
      <span className="max-w-sm text-xs text-text-faint">{message}</span>
    </div>
  );
}

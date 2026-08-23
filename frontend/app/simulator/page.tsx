"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { LoadingBlock } from "@/components/States";
import { Zap, ServerCrash, Landmark, Clock, XCircle, Wifi, RotateCcw } from "lucide-react";

const SCENARIOS = [
  {
    key: "bank-delay-upi",
    title: "Bank delay — UPI",
    description: "Simulates the primary demo scenario: bank/PSP response latency spikes for UPI.",
    icon: Landmark,
    action: () => api.injectLatency({ component: "bank", payment_method: "upi", latency_ms: 4000, duration_minutes: 5 }),
  },
  {
    key: "gateway-degradation",
    title: "Gateway degradation",
    description: "Adds latency at the Razorpay gateway stage across all methods.",
    icon: ServerCrash,
    action: () => api.injectLatency({ component: "gateway", latency_ms: 2500, duration_minutes: 5 }),
  },
  {
    key: "api-timeout",
    title: "API timeout",
    description: "Slows the order API stage, simulating backend timeout pressure.",
    icon: Clock,
    action: () => api.injectLatency({ component: "order_api", latency_ms: 3000, duration_minutes: 5 }),
  },
  {
    key: "payment-failures",
    title: "Increased payment failures",
    description: "Raises the failure rate across all payment methods.",
    icon: XCircle,
    action: () => api.injectFailure({ failure_rate: 0.35, duration_minutes: 5 }),
  },
  {
    key: "upi-degradation",
    title: "UPI degradation",
    description: "Slows the payment-method handshake stage specifically for UPI.",
    icon: Zap,
    action: () => api.injectLatency({ component: "payment_method", payment_method: "upi", latency_ms: 2800, duration_minutes: 5 }),
  },
  {
    key: "regional-degradation",
    title: "Regional degradation",
    description: "Adds bank-stage latency concentrated in Tamil Nadu.",
    icon: Wifi,
    action: () => api.injectLatency({ component: "bank", region: "Tamil Nadu", latency_ms: 3200, duration_minutes: 5 }),
  },
];

export default function SimulatorPage() {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetcher = useCallback(() => api.simulatorState(), []);
  const { data: state } = usePolling(fetcher, 3000);

  const trigger = async (key: string, action: () => Promise<unknown>) => {
    setTriggering(key);
    setMessage(null);
    try {
      await action();
      setMessage("Injection active — watch Overview and Incidents for the effect.");
    } catch (e: any) {
      setMessage(e.message || "Failed to trigger injection.");
    } finally {
      setTriggering(null);
    }
  };

  const reset = async () => {
    setTriggering("reset");
    try {
      await api.resetSimulator();
      setMessage("Simulator reset. Traffic and incidents cleared.");
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Simulator</h1>
          <p className="text-sm text-text-muted">Inject payment degradation scenarios to demo detection, explanation, and recommendation.</p>
        </div>
        <button
          onClick={reset}
          disabled={triggering === "reset"}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          <RotateCcw size={13} /> Reset simulator
        </button>
      </header>

      {message && (
        <div className="rounded-md border border-pulse/30 bg-pulse/5 px-4 py-2.5 text-sm text-pulse-bright">{message}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col rounded-lg border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2.5">
                <div className="rounded-md bg-pulse/10 p-2">
                  <Icon size={16} className="text-pulse-bright" />
                </div>
                <h3 className="text-sm font-medium text-text-primary">{s.title}</h3>
              </div>
              <p className="mt-2 flex-1 text-xs text-text-muted">{s.description}</p>
              <button
                onClick={() => trigger(s.key, s.action)}
                disabled={triggering === s.key}
                className="mt-3 rounded-md bg-pulse px-3 py-1.5 text-xs font-medium text-white hover:bg-pulse-bright disabled:opacity-50"
              >
                {triggering === s.key ? "Injecting…" : "Trigger"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
        <h2 className="mb-2 text-sm font-medium text-text-primary">Active injections</h2>
        {!state && <LoadingBlock label="Loading simulator state…" />}
        {state && state.active_injections.length === 0 && (
          <p className="text-sm text-text-faint">No active injections — traffic is at baseline.</p>
        )}
        {state && state.active_injections.length > 0 && (
          <pre className="overflow-x-auto rounded-md bg-ink/40 p-3 font-mono text-xs text-text-muted">
            {JSON.stringify(state.active_injections, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------- types
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";
export type TxnStatus = "success" | "failed" | "pending";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export interface StageLatency {
  stage: string;
  latency_ms: number;
  status: TxnStatus;
  timestamp: string;
  error: string | null;
}

export interface Transaction {
  transaction_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  gateway: string;
  region: string;
  device: string;
  status: TxnStatus;
  error_code: string | null;
  checkout_latency_ms: number;
  api_latency_ms: number;
  gateway_latency_ms: number;
  bank_latency_ms: number;
  callback_latency_ms: number;
  total_latency_ms: number;
  source: string;
  journey: StageLatency[];
}

export interface Incident {
  incident_id: string;
  created_at: string;
  severity: Severity;
  title: string;
  description: string;
  root_cause: string | null;
  affected_method: PaymentMethod | null;
  affected_region: string | null;
  affected_transactions: number;
  estimated_value_at_risk: number;
  confidence: number | null;
  status: IncidentStatus;
  ai_generated: boolean;
}

export interface Prediction {
  prediction_id: string;
  created_at: string;
  component: string;
  metric: string;
  current_value: number;
  predicted_value: number;
  probability: number;
  time_window: string;
  reason: string;
}

export interface Recommendation {
  recommendation_id: string;
  created_at: string;
  incident_id: string | null;
  action: string;
  expected_impact: string;
  confidence: number;
  status: string;
}

export interface DashboardSummary {
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  failed_transactions: number;
  total_transactions: number;
  active_incidents: number;
  transactions_at_risk: number;
  estimated_value_at_risk: number;
  health: "HEALTHY" | "DEGRADED" | "CRITICAL";
  window: string;
}

export interface LatencyPoint {
  time: string;
  avg: number;
  p95: number;
  p99: number;
}

// ---------------------------------------------------------------- api
export const api = {
  dashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  latencySeries: () => request<{ series: LatencyPoint[] }>("/api/dashboard/latency"),
  successRateSeries: () => request<{ series: { time: string; success_rate: number }[] }>("/api/dashboard/success-rate"),

  transactions: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<Transaction[]>(`/api/transactions${qs}`);
  },
  transaction: (id: string) => request<Transaction>(`/api/transactions/${id}`),

  incidents: () => request<Incident[]>("/api/incidents"),
  incident: (id: string) => request<Incident>(`/api/incidents/${id}`),

  predictions: () => request<Prediction[]>("/api/predictions"),
  recommendations: () => request<Recommendation[]>("/api/recommendations"),

  analyzeIncident: (id: string) =>
    request<{
      incident_id: string;
      ai_provider: string;
      context_sent_to_ai: Record<string, unknown>;
      analysis: Record<string, unknown>;
      recommendations: Recommendation[];
    }>(`/api/ai/analyze/${id}`, { method: "POST" }),

  explainTransaction: (id: string) =>
    request<{ transaction_id: string; explanation: string; slowest_stage: StageLatency | null }>(
      `/api/ai/explain/${id}`,
      { method: "POST" }
    ),

  simulatorState: () => request<{ mode: string; active_injections: unknown[]; started_at: string | null }>(
    "/api/simulator/state"
  ),
  injectLatency: (body: {
    component: string;
    payment_method?: string;
    region?: string;
    latency_ms: number;
    duration_minutes: number;
  }) => request("/api/simulator/inject-latency", { method: "POST", body: JSON.stringify(body) }),
  injectFailure: (body: {
    payment_method?: string;
    region?: string;
    failure_rate: number;
    duration_minutes: number;
  }) => request("/api/simulator/inject-failure", { method: "POST", body: JSON.stringify(body) }),
  resetSimulator: () => request("/api/simulator/reset", { method: "POST" }),
};

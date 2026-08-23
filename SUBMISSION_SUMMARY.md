# RazorPay Pulse — AI Payment Experience Intelligence
### Buildathon Submission Summary · Category 02: AI Risk Manager

---

**Live demo:** `https://razorpay-pulse-frontend-212225425691.us-central1.run.app/`
**API docs:** `https://razorpay-pulse-backend-dvl3ckn67q-uc.a.run.app/docs`
**Repo:** `https://github.com/medusatrive-creater/Razorpay-pulse`

---

## The problem

Every payment system can tell you *whether* a transaction succeeded. None of them tell you *why the experience is degrading right now, who's affected, where it's heading, and what to do about it.* Payment ops teams are left staring at a failure-rate number with no path to a root cause.

## The solution

RazorPay Pulse is an AI-powered payment risk intelligence console built around one loop:

**Detect → Explain → Predict → Recommend**

It watches live payment telemetry, automatically opens incidents when latency or failure patterns deviate from baseline, uses Gemini to explain *why* in plain language with a confidence score, forecasts where the trend is headed, and suggests advisory mitigation actions — all without touching real payment routing.

## What makes it different

This is **not** another payment gateway, routing engine, or chatbot. It's a diagnostic layer that sits on top of payment infrastructure and answers the question existing dashboards can't: *why did this happen, and what should we do?*

## How it works

1. **Detect** — a rule-based anomaly engine compares live traffic against a recent baseline per payment method, opening a severity-scored incident within ~30–60 seconds of a real degradation.
2. **Explain** — the backend aggregates telemetry (P95 ratios, failure-rate deltas, affected region) and sends *only that summary* — never raw transaction data — to **Gemini via Vertex AI**, which returns a validated, structured root-cause analysis.
3. **Predict** — a lightweight trend-extrapolation model forecasts near-term latency risk per payment method.
4. **Recommend** — advisory actions (surface an alternate payment method, escalate, monitor a region) are generated from each incident. Nothing here changes real payment routing.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, Recharts |
| Backend | Python, FastAPI |
| Data | **BigQuery** (transactions, incidents, predictions, recommendations) |
| AI | **Gemini via Vertex AI** — structured root-cause analysis |
| Hosting | Google Cloud Run (frontend + backend) |
| Simulator | Built-in traffic + degradation injection engine |

## What's live vs. simulated

✅ Full detect-explain-predict-recommend loop is live end-to-end on Google Cloud, writing to BigQuery and calling real Gemini.
⚠️ Payment traffic is currently **simulated** (realistic but synthetic) rather than pulled from Razorpay Test/Sandbox — the one remaining integration gap, clearly labeled in the UI (`source: simulated` on every transaction) rather than hidden.

## 3-minute demo script

1. Open the dashboard — healthy baseline (P95 ~450–600ms, ~98% success).
2. Trigger **"Bank delay — UPI"** in the Simulator.
3. Watch P95 spike and health flip to CRITICAL within under a minute.
4. Open the auto-created incident → click **Run analysis** → Gemini correctly identifies the bank stage as the bottleneck with a confidence score.
5. Check AI Recommendations for the advisory action.
6. Reset the simulator, watch latency recover on the live chart.

## Why it's judge-ready

- Real GCP services doing real work (BigQuery writes, Gemini calls) — not a mocked demo.
- The AI is verifiably grounded: root-cause output is validated against a strict JSON schema and traceable back to the exact aggregated telemetry that produced it.
- Honest about scope: what's live vs. simulated is stated plainly, not glossed over.

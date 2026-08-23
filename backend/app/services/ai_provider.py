"""
AI provider abstraction.

MockAIProvider produces the exact same structured JSON contract Gemini is
asked to return (Section 3.E of the brief), using deterministic rules over
the aggregated telemetry. This keeps the demo fully runnable without a
Vertex AI key, and is CLEARLY labeled as such in every response so the UI
can show "AI-generated (mock)" vs "AI-generated (Gemini)" per Rule 11.

VertexAIProvider sends the same aggregated (never raw) telemetry to Gemini
via Vertex AI and validates the JSON it returns before use.
"""
from __future__ import annotations
import json
from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    label: str = "unknown"

    @abstractmethod
    def analyze_incident(self, context: dict[str, Any]) -> dict[str, Any]: ...


REQUIRED_KEYS = {"severity", "root_cause", "confidence", "affected_segment", "explanation", "recommendation", "expected_impact"}


def validate_ai_output(data: dict[str, Any]) -> dict[str, Any]:
    missing = REQUIRED_KEYS - data.keys()
    if missing:
        raise ValueError(f"AI output missing required keys: {missing}")
    if not (0 <= float(data["confidence"]) <= 1):
        raise ValueError("confidence out of range")
    if data["severity"] not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        raise ValueError("invalid severity")
    return data


class MockAIProvider(AIProvider):
    label = "mock"

    def analyze_incident(self, context: dict[str, Any]) -> dict[str, Any]:
        ratio = context.get("p95_ratio", 1.0)
        method = context.get("payment_method", "payment method")
        region = context.get("top_region", "multiple regions")
        bank_ratio = context.get("bank_latency_ratio", 1.0)

        if bank_ratio >= ratio * 0.8:
            root_cause = f"Elevated {method.upper()} response latency from the issuing bank / PSP, not the gateway itself."
            component = "bank"
        else:
            root_cause = f"Latency degradation inside the {method.upper()} payment-method handshake stage."
            component = "payment_method"

        severity = "CRITICAL" if ratio >= 6 else "HIGH" if ratio >= 3 else "MEDIUM" if ratio >= 1.8 else "LOW"
        confidence = round(min(0.55 + (ratio - 1.8) * 0.08, 0.97), 2)

        result = {
            "severity": severity,
            "root_cause": root_cause,
            "confidence": confidence,
            "affected_segment": f"{method.upper()} / {region}",
            "explanation": (
                f"P95 latency for {method.upper()} rose {ratio:.1f}x versus the prior baseline window, "
                f"concentrated at the {component} stage. This is consistent with upstream {component} degradation "
                f"rather than a client-side or gateway routing issue."
            ),
            "recommendation": (
                f"Surface an alternate payment method to {method.upper()} customers when {component} latency "
                f"exceeds the defined threshold, and monitor for recovery before removing the fallback."
            ),
            "expected_impact": "Reduces checkout abandonment and protects transaction value during the degradation window.",
        }
        return validate_ai_output(result)


class VertexAIProvider(AIProvider):
    """
    Real Gemini via the Google Gen AI SDK on Vertex AI.
    Uses the Cloud Run service account for authentication.
    """
    label = "gemini"

    def __init__(self, project_id: str, location: str, model_name: str):
        from google import genai
        from google.genai.types import HttpOptions

        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
            http_options=HttpOptions(api_version="v1"),
        )
        self.model_name = model_name

    def analyze_incident(self, context: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""You are a payment risk analyst.

Analyze this AGGREGATED payment telemetry.
It contains no raw PII or card numbers.

Respond with ONLY a JSON object. Do not use markdown,
code fences, or any preamble.

The JSON must match exactly this shape:

{{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "root_cause": "string",
  "confidence": 0.0,
  "affected_segment": "string",
  "explanation": "string",
  "recommendation": "string",
  "expected_impact": "string"
}}

Telemetry:
{json.dumps(context, indent=2)}
"""

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
        )

        text = (response.text or "").strip()

        if text.startswith("```"):
            text = text.removeprefix("```json").removeprefix("```")
            text = text.removesuffix("```").strip()

        data = json.loads(text)
        return validate_ai_output(data)


_provider_instance: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    from app.config import get_settings
    settings = get_settings()
    if settings.ai_provider == "vertex" and settings.gcp_project_id:
        _provider_instance = VertexAIProvider(settings.gcp_project_id, settings.vertex_location, settings.gemini_model)
    else:
        _provider_instance = MockAIProvider()
    return _provider_instance

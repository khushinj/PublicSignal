import os
import json

from google import genai


def generate_gemini_explanation(data):
    """
    Ask Gemini to explain an already-calculated priority score.

    Gemini does NOT calculate or modify the priority score.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are explaining a civic infrastructure priority score for a
policymaker dashboard.

The priority score has already been calculated by our system.
DO NOT recalculate, modify, or question the score.

Use ONLY the information provided below.
Do not invent facts.
Do not mention information that is not present in the data.

Your task is to explain why this location received its priority.

Keep the explanation concise and factual.

Return JSON with exactly this structure:

{{
    "summary": "One concise explanation in 1-2 sentences.",
    "key_factors": [
        "Important factor 1",
        "Important factor 2"
    ]
}}

Data:

{json.dumps(data, indent=2)}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
        },
    )

    result = json.loads(response.text)

    return {
        "summary": result.get("summary", ""),
        "key_factors": result.get("key_factors", []),
        "source": "gemini",
    }


def generate_fallback_explanation(data):
    """
    Deterministic fallback used when Gemini is unavailable.
    """

    complaint_count = data.get("complaint_count", 0)
    high_severity = data.get("high_severity", 0)

    infrastructure = data.get("infrastructure_data") or {}

    factors = []

    if complaint_count > 0:
        factors.append(
            f"{complaint_count} citizen reports are concentrated in this area"
        )

    if high_severity > 0:
        factors.append(
            f"{high_severity} reports are classified as high severity"
        )

    road_score = infrastructure.get("road_condition_score")

    if road_score is not None and road_score < 60:
        factors.append("road condition shows a significant gap")

    water_coverage = infrastructure.get("water_coverage_pct")

    if water_coverage is not None and water_coverage < 70:
        factors.append("water coverage shows a notable gap")

    drainage_coverage = infrastructure.get("drainage_coverage_pct")

    if drainage_coverage is not None and drainage_coverage < 70:
        factors.append("drainage coverage shows a notable gap")

    sanitation_coverage = infrastructure.get("sanitation_coverage_pct")

    if sanitation_coverage is not None and sanitation_coverage < 70:
        factors.append("sanitation coverage shows a notable gap")

    healthcare_score = infrastructure.get("healthcare_access_score")

    if healthcare_score is not None and healthcare_score < 60:
        factors.append("healthcare access shows a gap")

    facility_score = infrastructure.get("public_facility_access_score")

    if facility_score is not None and facility_score < 60:
        factors.append("public facility access shows a gap")

    if not factors:
        factors.append(
            "The priority is based on the combined complaint and infrastructure scores"
        )

    summary = ". ".join(factors[:3]) + "."

    return {
        "summary": summary,
        "key_factors": factors[:3],
        "source": "fallback",
    }


def generate_priority_explanation(data):
    """
    Gemini-first explanation generation with deterministic fallback.
    """

    try:
        return generate_gemini_explanation(data)

    except Exception as e:
        print(
            "Gemini priority explanation failed:",
            str(e)
        )

        return generate_fallback_explanation(data)
import os

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field


load_dotenv()


class ComplaintAnalysis(BaseModel):
    category: str = Field(
        description="Main civic infrastructure category."
    )
    problem_type: str = Field(
        description="Specific type of infrastructure problem."
    )
    severity: str = Field(
        description="Severity of the reported problem: Low, Medium, or High."
    )
    summary: str = Field(
        description="Short factual English summary of the complaint."
    )


def analyze_complaint(text: str, language: str) -> ComplaintAnalysis:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing from .env")

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are the civic infrastructure intelligence system for PublicSignal.

Analyze the citizen complaint below.

Citizen complaint:
{text}

Complaint language:
{language}

Your task is to extract structured civic information.

Allowed categories include:
- Roads
- Water
- Drainage
- Waste
- Streetlights
- Electricity
- Public Transport
- Healthcare
- Education
- Environment
- Other

Severity must be exactly one of:
- Low
- Medium
- High

Rules:
1. Identify the main infrastructure problem.
2. Do not invent facts that are not present in the complaint.
3. If the complaint contains multiple issues, identify the primary issue.
4. Keep the category suitable for later data analysis.
5. Write the summary in concise English.
6. Return only the requested structured fields.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ComplaintAnalysis,
        },
    )

    return ComplaintAnalysis.model_validate_json(response.text).model_dump()
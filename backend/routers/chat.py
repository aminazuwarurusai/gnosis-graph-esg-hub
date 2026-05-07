"""
UNIMAS Smart Campus ESG Dashboard — Chat API Router
Powered by URUS AI SDN BHD
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
import os

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

# ============================================
# TODO: Replace mock_response() with Gemini API
# When ready, uncomment the Gemini API code below
# and add GEMINI_API_KEY=your_key to .env file
# Model: gemini-1.5-flash
# ============================================

# import google.generativeai as genai
# import os
#
# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# model = genai.GenerativeModel("gemini-1.5-flash")
#
# SYSTEM_PROMPT = """
# You are an ESG (Environmental, Social, Governance) assistant for
# UNIMAS (Universiti Malaysia Sarawak) Smart Campus.
# You have access to Q1 2026 IoT sensor data:
# - Energy: 364,484 kWh total, 24.7% solar share, 96.4% grid efficiency
# - Air Quality: AQI 78.0 average (Moderate), PM2.5 monitored at 4 locations
# - Water: Campus Lake only, 68.3% normal, pH 6.2–8.4
# - Waste: 63% avg fill level, Cafeteria highest at 65.9%
# - Soil: Engineering Faculty only, 58.6% Normal health status
# - Alerts: 12 active (4 Critical, 8 Warning)
# - ESG Composite Score: 75/100
# Answer concisely. Support both English and Bahasa Malaysia.
# """


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    dashboardContext: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


# ─── Keyword-based mock responses ────────────────────────────────────────────

MOCK_RESPONSES = {
    "esg": (
        "Our current ESG Score is 75/100.\n"
        "Energy: 78 | Air: 72 | Water: 70 | Waste: 68 | Soil: 82\n"
        "Main improvement area: increase Solar share from 24.7% to 30% target."
    ),
    "air": (
        "Average AQI is 78.0 (Moderate). Acceptable for most people but "
        "sensitive groups should limit outdoor exposure. March reading: 82.2 — rising trend."
    ),
    "energy": (
        "Total energy Q1 2026: 364,484 kWh\n"
        "• Engineering Faculty: 124,686 kWh (highest)\n"
        "• Colleges: 122,629 kWh\n"
        "• Admin Block: 117,169 kWh\n"
        "Solar share: 24.7% — below 30% target."
    ),
    "alert": (
        "12 active alerts: 4 Critical (Gas Leak, Critical pH, Power Surge, Low DO), "
        "8 Warning. Check Alert Centre tab for full details."
    ),
    "water": (
        "Campus Lake: 68.3% Normal, 31.7% Warning. pH range 6.2–8.4. "
        "Avg DO: 7.2 mg/L. 2 critical pH alerts detected."
    ),
    "waste": (
        "Avg fill: 63%. Cafeteria: 65.9% (highest). Colleges: 63.9%. "
        "Engineering Faculty: 59.1%. 51 full bins, 46 near full."
    ),
    "carbon": (
        "Estimated CO2: 364,484 kWh × 0.585 kg/kWh ≈ 213 tonnes Q1 2026. "
        "Reduce by increasing solar share and implementing energy-saving measures."
    ),
    "improve": (
        "Top 3 improvements:\n"
        "1. Increase solar capacity (24.7% → 30%)\n"
        "2. Fix Campus Lake water quality (31.7% warning)\n"
        "3. Increase waste collection at Cafeteria (65.9% fill)"
    ),
    "score_method": (
        "Energy score 78 is a configured weighted score in the dashboard model.\n"
        "Main factors: grid efficiency, solar share versus 30% target, building consumption, and estimated emissions.\n"
        "In current data, strong grid efficiency supports the score, while solar share below target reduces it."
    ),
}


def mock_response(message: str) -> str:
    m = message.lower()
    if any(k in m for k in ["macam mana", "bagaimana", "how", "dapat", "kira", "calculate", "formula", "weight", "berat"]):
        if "78" in m or any(k in m for k in ["energy", "tenaga", "score", "skor", "esg"]):
            return MOCK_RESPONSES["score_method"]
    if any(k in m for k in ["esg", "score", "skor"]):
        return MOCK_RESPONSES["esg"]
    if any(k in m for k in ["aqi", "air quality", "udara"]):
        return MOCK_RESPONSES["air"]
    if any(k in m for k in ["energy", "tenaga", "elektrik", "power", "solar"]):
        return MOCK_RESPONSES["energy"]
    if any(k in m for k in ["alert", "amaran", "critical", "warning"]):
        return MOCK_RESPONSES["alert"]
    if any(k in m for k in ["water", "ph", "lake", "tasik", "dissolved"]):
        return MOCK_RESPONSES["water"]
    if any(k in m for k in ["waste", "sisa", "bin", "sampah", "fill"]):
        return MOCK_RESPONSES["waste"]
    if any(k in m for k in ["carbon", "co2", "karbon", "emission"]):
        return MOCK_RESPONSES["carbon"]
    if any(k in m for k in ["improve", "baik", "tingkat", "recommendation"]):
        return MOCK_RESPONSES["improve"]
    return (
        "I can help with: Energy, Air Quality, Water, Waste, Alerts, ESG Score. "
        "Please ask about any of these topics."
    )


def gemini_response(request: ChatRequest) -> Optional[str]:
    """
    Secure server-side Gemini call using google-genai SDK.
    Returns None when API key is unavailable so caller falls back to mock.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types
    except Exception:
        return None

    try:
        client = genai.Client(api_key=api_key)

        prompt = request.dashboardContext or (
            "You are Dayang, an ESG assistant for UNIMAS Smart Campus. "
            "Your name is Dayang. Reply concisely in the same language as the user."
        )
        history_text = "\n".join(
            [f"{msg.role}: {msg.text}" for msg in (request.history or [])[-6:]]
        )
        full_prompt = (
            f"{prompt}\n\nConversation:\n{history_text}\n"
            f"user: {request.message}\nassistant:"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
            config=types.GenerateContentConfig(max_output_tokens=400, temperature=0.7),
        )
        return (response.text or "").strip() or None
    except Exception:
        return None


@router.post("/api/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    """
    Chat endpoint — currently returns mock responses.
    Replace mock_response() with Gemini API when API key is available.
    """

    reply = gemini_response(body)
    if not reply:
        reply = mock_response(body.message)

    return ChatResponse(reply=reply)

"""
Minimal FastAPI app entrypoint for dashboard chat backend.
Run with: uvicorn backend.main:app --reload --port 8000
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.routers.chat import router as chat_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="UNIMAS ESG Dashboard API",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow local frontend dev servers.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://esg.myurus",
    "https://www.esg.myurus",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(chat_router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}

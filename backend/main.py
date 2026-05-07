"""
Minimal FastAPI app entrypoint for dashboard chat backend.
Run with: uvicorn backend.main:app --reload --port 8000
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.chat import router as chat_router


app = FastAPI(
    title="UNIMAS ESG Dashboard API",
    version="1.0.0",
)

# Allow local frontend dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}

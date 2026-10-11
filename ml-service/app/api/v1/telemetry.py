from fastapi import APIRouter
from app.schemas.telemetry import AtmTelemetryRequest, AtmTelemetryResponse
from app.services.anomaly import analyze_atm_stream

router = APIRouter()

@router.post("/score-atm-stream", response_model=AtmTelemetryResponse)
async def score_atm_stream(request: AtmTelemetryRequest):
    return analyze_atm_stream(request)
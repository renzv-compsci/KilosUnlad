from fastapi import APIRouter
from app.api.v1 import health, predict, telemetry

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(predict.router, tags=["ML Inference"])
api_router.include_router(telemetry.router, tags=["Fraud Detection"])
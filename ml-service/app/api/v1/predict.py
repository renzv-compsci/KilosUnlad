from fastapi import APIRouter, HTTPException
from app.schemas.inference import SwdiInferenceRequest, SwdiInferenceResponse
from app.services.classifier import classifier_service

router = APIRouter()

@router.post("/predict-swdi", response_model=SwdiInferenceResponse)
async def predict_swdi(request: SwdiInferenceRequest):
    try:
        return classifier_service.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
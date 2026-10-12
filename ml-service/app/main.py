import joblib
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import request_validation_exception_handler
from contextlib import asynccontextmanager
from app.api.router import api_router
from app.core.config import settings

# Resolve paths robustly regardless of the current working directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "artifacts" / "lightgbm_swdi_v1.joblib"

# Global dictionary to hold ML models in memory
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event: Loads ML models into RAM once on startup 
    to ensure inference takes under 15ms.
    """
    print("Starting KilosUnlad ML Service...")
    
    # Load the LightGBM model into memory
    if MODEL_PATH.exists():
        try:
            ml_models["swdi_classifier"] = joblib.load(MODEL_PATH)
            print(f"SUCCESS: Loaded LightGBM model from {MODEL_PATH}")
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to load model file: {e}")
            raise e
    else:
        # If the file is missing, we log a warning. Inference will fail later.
        print(f"WARNING: Model file not found at {MODEL_PATH}. Inference will return 500.")
        ml_models["swdi_classifier"] = None
        
    yield
    
    print("Shutting down KilosUnlad ML Service...")
    ml_models.clear()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# Contract error body (ml-swdi-inference.json): never echo the rejected input.
@app.exception_handler(RequestValidationError)
async def invalid_feature_vector(request: Request, exc: RequestValidationError):
    if not request.url.path.endswith("/predict-swdi"):
        return await request_validation_exception_handler(request, exc)
    return JSONResponse(status_code=422, content={"error": {
        "code": "INVALID_FEATURE_VECTOR",
        "message": "One or more demographic features are missing or outside valid bounds."
    }})

# Mount the v1 API routes (predict-swdi, score-atm-stream)
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "KilosUnlad ML Service is running"}

@app.get("/health")
def health_check():
    # Check if the model was actually loaded into memory
    model_loaded = ml_models.get("swdi_classifier") is not None
    return {"status": "online", "model_loaded": model_loaded}
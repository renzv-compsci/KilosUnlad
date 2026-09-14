from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings

# Global dictionary to keep ML models in server RAM (Zero Cold-Start)
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs once when the container boots
    print(">> [KilosUnlad ML] Starting up AI & Analytics Engine...")
    ml_models["status"] = "ready"
    yield
    # This runs on container shutdown
    print(">> [KilosUnlad ML] Shutting down AI Engine...")
    ml_models.clear()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Internal decision-support AI microservice for DSWD SWDI proxy-means testing and ATM telemetry auditing.",
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for local cross-container requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# System Health Check Endpoint
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "online",
        "service": "kilosunlad-ml-microservice",
        "model_runtime": ml_models.get("status", "uninitialized"),
        "version": settings.VERSION
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "KilosUnlad ML Microservice is running. Visit /docs for interactive Swagger API documentation."
    }
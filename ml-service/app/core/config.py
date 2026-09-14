from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "KilosUnlad AI & Analytics Microservice"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode
    ML_ENV: str = "development"
    
    # Path to pre-trained LightGBM model weights
    MODEL_ARTIFACT_PATH: str = "artifacts/lightgbm_swdi_v1.joblib"
    
    # Logging
    LOG_LEVEL: str = "info"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
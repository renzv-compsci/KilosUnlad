from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    APP_NAME: str = "KilosUnlad ML Service"
    API_V1_STR: str = "/api/v1"
    
    # Paths (Using artifacts/ as agreed)
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ARTIFACTS_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "artifacts")
    
    SWDI_MODEL_PATH: str = os.path.join(ARTIFACTS_DIR, "lightgbm_swdi_v1.joblib")
    MODEL_METADATA_PATH: str = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
    
    # Constraints (From Master Turnover)
    MAX_INFERENCE_TIME_MS: int = 2500
    MAX_RESPONSE_SIZE_BYTES: int = 1048576  # 1 MiB

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
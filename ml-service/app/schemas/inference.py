from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class Demographics(BaseModel):
    head_education_level: int = Field(..., ge=0, le=3)
    head_formal_employment: int = Field(..., ge=0, le=1)
    remittance_income_flag: int = Field(..., ge=0, le=1)
    housing_material_score: int = Field(..., ge=1, le=3)
    appliance_density_index: float = Field(..., ge=0.0, le=3.0)
    dependency_ratio: float = Field(..., ge=0.0)

class SwdiInferenceRequest(BaseModel):
    household_id: str
    household_size: int = Field(..., ge=1, le=20)
    demographics: Demographics

class ShapIndicator(BaseModel):
    indicator: str
    contribution_weight: float
    description: str

class MlEvaluation(BaseModel):
    predicted_swdi_level: int
    class_probabilities: dict
    shap_explainability: List[ShapIndicator]

class SwdiInferenceResponse(BaseModel):
    household_id: str
    ml_evaluation: MlEvaluation
    evaluated_at: datetime
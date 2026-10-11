import joblib
import json
import pandas as pd
import numpy as np
import shap
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.inference import SwdiInferenceRequest, SwdiInferenceResponse, MlEvaluation, ShapIndicator

class SwdiClassifier:
    def __init__(self):
        self.model = None
        self.explainer = None
        self.feature_names = []
        self.load_model()

    def load_model(self):
        try:
            # Load metadata to get the exact feature order
            with open(settings.MODEL_METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
            
            self.feature_names = self.metadata['feature_names']
            self.model = joblib.load(settings.SWDI_MODEL_PATH)
            self.explainer = shap.TreeExplainer(self.model)
            print(f"✅ Model loaded successfully from {settings.SWDI_MODEL_PATH}")
        except Exception as e:
            print(f"❌ CRITICAL: Failed to load model: {e}")

    def predict(self, request: SwdiInferenceRequest) -> SwdiInferenceResponse:
        if not self.model:
            raise Exception("Model not loaded")

        # 1. Map input to feature vector
        # The model expects columns like 'demographics.head_education_level'
        data = {
            'demographics.head_education_level': request.demographics.head_education_level,
            'demographics.head_formal_employment': request.demographics.head_formal_employment,
            'demographics.remittance_income_flag': request.demographics.remittance_income_flag,
            'demographics.housing_material_score': request.demographics.housing_material_score,
            'demographics.appliance_density_index': request.demographics.appliance_density_index,
            'demographics.dependency_ratio': request.demographics.dependency_ratio
        }
        
        # Ensure order matches training
        X = pd.DataFrame([data], columns=self.feature_names)
        
        # 2. Predict
        # Model was trained on 0,1,2. Output is 0,1,2.
        pred_proba = self.model.predict_proba(X)[0]
        pred_class_idx = int(np.argmax(pred_proba))
        predicted_level = pred_class_idx + 1 # Map 0->1, 1->2, 2->3
        
        # 3. SHAP
        shap_values = self.explainer.shap_values(X)
        
        # For multiclass, shap_values is a list of arrays (one per class)
        # We want the SHAP values for the PREDICTED class
        if isinstance(shap_values, list):
            instance_shap = shap_values[pred_class_idx][0]
        else:
            # If 3D array
            instance_shap = shap_values[0, :, pred_class_idx]
            
        # 4. Construct Response
        shap_list = []
        descriptions = {
            'demographics.head_education_level': 'Educational attainment strongly correlates with socioeconomic transition.',
            'demographics.head_formal_employment': 'Formal employment provides stable income, increasing self-sufficiency.',
            'demographics.remittance_income_flag': 'Foreign remittances significantly boost household purchasing power.',
            'demographics.housing_material_score': 'Stronger housing materials indicate accumulated asset wealth.',
            'demographics.appliance_density_index': 'Higher appliance density reflects improved standard of living.',
            'demographics.dependency_ratio': 'High dependency ratio strains household resources.'
        }
        
        # Sort by absolute impact
        sorted_indices = np.argsort(np.abs(instance_shap))[::-1]
        
        for idx in sorted_indices:
            feat_name = self.feature_names[idx]
            weight = float(instance_shap[idx])
            # Include top 3 features to keep response concise
            if len(shap_list) < 3: 
                shap_list.append(ShapIndicator(
                    indicator=feat_name,
                    contribution_weight=weight,
                    description=descriptions.get(feat_name, "Impact on prediction.")
                ))

        probabilities = {
            "level_1_survival": float(pred_proba[0]),
            "level_2_subsistence": float(pred_proba[1]),
            "level_3_self_sufficiency": float(pred_proba[2])
        }

        return SwdiInferenceResponse(
            household_id=request.household_id,
            ml_evaluation=MlEvaluation(
                predicted_swdi_level=predicted_level,
                class_probabilities=probabilities,
                shap_explainability=shap_list
            ),
            evaluated_at=datetime.now(timezone.utc)
        )

# Singleton
classifier_service = SwdiClassifier()
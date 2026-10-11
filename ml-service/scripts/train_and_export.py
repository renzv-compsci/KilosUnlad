import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from sklearn.metrics import f1_score, accuracy_score

import lightgbm as lgb
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier
import shap

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR.parent / "data-pipeline" / "partitions"

# EXACT COLUMN NAMES FROM YOUR PARQUET FILE
FEATURE_COLS = [
    'demographics.head_education_level',
    'demographics.head_formal_employment',
    'demographics.remittance_income_flag',
    'demographics.housing_material_score',
    'demographics.appliance_density_index',
    'demographics.dependency_ratio'
]
TARGET_COL = 'true_swdi_level'

def load_data():
    print("--- Loading Parquet Data ---")
    train_path = DATA_DIR / "train_features_70k.parquet"
    val_path = DATA_DIR / "val_features_10k.parquet"
    
    train_df = pd.read_parquet(train_path)
    val_df = pd.read_parquet(val_path)
    
    X_train = train_df[FEATURE_COLS]
    y_train = train_df[TARGET_COL]
    X_val = val_df[FEATURE_COLS]
    y_val = val_df[TARGET_COL]
    
    return X_train, X_val, y_train, y_val

def train_and_evaluate():
    X_train, X_val, y_train, y_val = load_data()
    
    models = {
        "LightGBM": lgb.LGBMClassifier(objective='multiclass', num_class=3, random_state=42, n_estimators=100, verbose=-1),
        "XGBoost": xgb.XGBClassifier(objective='multi:softprob', num_class=3, random_state=42, n_estimators=100, use_label_encoder=False, eval_metric='mlogloss', verbosity=0),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    }
    
    best_model = None
    best_score = -1.0
    best_name = ""
    
    print("--- Training Models ---")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        score = f1_score(y_val, preds, average='macro')
        
        if score > best_score:
            best_score = score
            best_model = model
            best_name = name
            
    print(f"\n🏆 WINNER: {best_name} with Macro F1: {best_score:.4f}")
    return best_model, best_name, X_val

def extract_shap_and_export(model, model_name, X_val):
    print("--- Extracting SHAP & Exporting ---")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_val)
    
    # Robust SHAP extraction for multiclass (list of arrays)
    if isinstance(shap_values, list):
        feature_importance = np.mean([np.abs(sv).mean(axis=0) for sv in shap_values], axis=0)
    else:
        feature_importance = np.abs(shap_values).mean(axis=0)
        
    shap_dict = {feat: float(imp) for feat, imp in zip(FEATURE_COLS, feature_importance)}
    
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_filename = f"{model_name.lower().replace(' ', '_')}_swdi_v1.joblib"
    joblib.dump(model, ARTIFACTS_DIR / model_filename)
    
    metadata = {
        "model_name": model_name,
        "model_file": model_filename,
        "training_date": datetime.now().isoformat(),
        "feature_names": FEATURE_COLS,
        "shap_importance": shap_dict,
        "target_classes": [1, 2, 3]
    }
    
    with open(ARTIFACTS_DIR / "model_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"💾 Model saved to: {ARTIFACTS_DIR / model_filename}")
    print("✅ Export Complete.")

if __name__ == "__main__":
    sys.path.append(str(BASE_DIR))
    model, name, X_val = train_and_evaluate()
    extract_shap_and_export(model, name, X_val)
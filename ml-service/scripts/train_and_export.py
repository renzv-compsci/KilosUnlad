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
    
    # DYNAMIC FILE DISCOVERY (Fixes the filename mismatch automatically)
    files = os.listdir(DATA_DIR)
    train_file = next((f for f in files if 'train' in f.lower()), None)
    val_file = next((f for f in files if 'val' in f.lower()), None)
    
    if not train_file or not val_file:
        print(f"ERROR: Could not find train/val parquet files in {DATA_DIR}")
        print(f"Files found: {files}")
        sys.exit(1)
        
    print(f"Found Train: {train_file}")
    print(f"Found Val:   {val_file}")
    
    train_path = DATA_DIR / train_file
    val_path = DATA_DIR / val_file
    
    train_df = pd.read_parquet(train_path)
    val_df = pd.read_parquet(val_path)
    
    # Safety Check: Ensure all features exist
    missing = [col for col in FEATURE_COLS if col not in train_df.columns]
    if missing:
        print(f"ERROR: Missing columns in dataset: {missing}")
        sys.exit(1)
        
    X_train = train_df[FEATURE_COLS]
    y_train = train_df[TARGET_COL]
    X_val = val_df[FEATURE_COLS]
    y_val = val_df[TARGET_COL]
    
    return X_train, X_val, y_train, y_val

def train_and_evaluate():
    X_train, X_val, y_train, y_val = load_data()
    
    # FIX: XGBoost requires 0-indexed classes (0, 1, 2).
    # We temporarily shift 1,2,3 -> 0,1,2 for training.
    y_train_adj = y_train - 1
    y_val_adj = y_val - 1
    
    models = {
        "LightGBM": lgb.LGBMClassifier(objective='multiclass', num_class=3, random_state=42, n_estimators=100, verbose=-1),
        "XGBoost": xgb.XGBClassifier(objective='multi:softprob', num_class=3, random_state=42, n_estimators=100, eval_metric='mlogloss', verbosity=0),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    }
    
    best_model = None
    best_score = -1.0
    best_name = ""
    
    print("--- Training Models ---")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train_adj)
        
        # Predict and shift back to 1,2,3 for evaluation
        preds_adj = model.predict(X_val)
        preds = preds_adj + 1
        
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
    
    # Bulletproof extraction for LightGBM multiclass (handles list OR 3D array)
    if isinstance(shap_values, list):
        # Format: [array_class0, array_class1, array_class2]
        class_imps = [np.abs(sv).mean(axis=0) for sv in shap_values]
        feature_importance = np.mean(class_imps, axis=0)
    else:
        shap_arr = np.array(shap_values)
        if shap_arr.ndim == 3:
            # Format: (samples, features, classes)
            feature_importance = np.abs(shap_arr).mean(axis=(0, 2))
        else:
            # Format: (samples, features)
            feature_importance = np.abs(shap_arr).mean(axis=0)
            
    # Force to flat 1D array to prevent TypeError
    feature_importance = np.array(feature_importance).flatten()
    
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
    print("✅ Export Complete. Ready for API Integration.")

if __name__ == "__main__":
    sys.path.append(str(BASE_DIR))
    model, name, X_val = train_and_evaluate()
    extract_shap_and_export(model, name, X_val)
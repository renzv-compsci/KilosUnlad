"""
test_section12_ml_unit.py
Section 12.1.2 unit tier (ML service): SHAP attribution extraction and the
deterministic Sangla-ATM heuristic, tested in-process with no HTTP layer.

Usage (from the repository root, ml-service requirements + pytest installed):
    python -m pytest -q data-pipeline/scripts/test_section12_ml_unit.py
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ml-service"))

from app.schemas.inference import SwdiInferenceRequest  # noqa: E402
from app.schemas.telemetry import AtmTelemetryRequest  # noqa: E402
from app.services.anomaly import analyze_atm_stream  # noqa: E402
from app.services.classifier import classifier_service  # noqa: E402

CASE_A = {"head_education_level": 3, "head_formal_employment": 1, "remittance_income_flag": 0,
          "housing_material_score": 3, "appliance_density_index": 2.0, "dependency_ratio": 2.0}


def predict(features):
    return classifier_service.predict(SwdiInferenceRequest(
        household_id="UNIT-0001", household_size=6, demographics=features)).ml_evaluation


def full_shap(features):
    X = pd.DataFrame([{f"demographics.{k}": v for k, v in features.items()}],
                     columns=classifier_service.feature_names)
    values = classifier_service.explainer.shap_values(X)
    return X, values


def test_model_loaded_with_the_six_contract_features():
    assert classifier_service.model is not None
    assert [f.split(".", 1)[1] for f in classifier_service.feature_names] == list(CASE_A)


def test_shap_extraction_returns_top_three_signed_by_absolute_weight():
    ev = predict(CASE_A)
    weights = [s.contribution_weight for s in ev.shap_explainability]
    assert len(weights) == 3
    assert all(abs(a) >= abs(b) for a, b in zip(weights, weights[1:]))
    names = {s.indicator for s in ev.shap_explainability}
    assert names <= set(classifier_service.feature_names) and len(names) == 3


def test_extracted_weights_are_the_predicted_class_attributions():
    ev = predict(CASE_A)
    X, values = full_shap(CASE_A)
    cls = ev.predicted_swdi_level - 1
    row = values[cls][0] if isinstance(values, list) else values[0, :, cls]
    by_name = dict(zip(classifier_service.feature_names, row))
    for s in ev.shap_explainability:
        assert s.contribution_weight == pytest.approx(float(by_name[s.indicator]))


def test_shap_attributions_are_additive_to_the_model_margin():
    X, values = full_shap(CASE_A)
    margin = classifier_service.model.predict(X, raw_score=True)[0]
    base = np.ravel(classifier_service.explainer.expected_value)
    for cls in range(3):
        row = values[cls][0] if isinstance(values, list) else values[0, :, cls]
        assert base[cls] + row.sum() == pytest.approx(margin[cls], abs=1e-6)


def test_probabilities_are_a_distribution_and_level_is_argmax():
    ev = predict(CASE_A)
    p = [ev.class_probabilities[k] for k in ("level_1_survival", "level_2_subsistence", "level_3_self_sufficiency")]
    assert sum(p) == pytest.approx(1.0)
    assert ev.predicted_swdi_level == int(np.argmax(p)) + 1


def atm(count, start, gap_seconds):
    t0 = datetime(2026, 9, 5, start, 10, tzinfo=timezone.utc)
    return AtmTelemetryRequest(
        terminal_id="ATM-LBP-CAL-03",
        terminal_metadata={"bank_network": "LANDBANK", "location_name": "LBP Calamba", "municipality": "Calamba",
                           "province": "Laguna", "coordinates": [121.1578, 14.211]},
        window_start_time=datetime(2026, 9, 5, start, 0, tzinfo=timezone.utc),
        window_end_time=datetime(2026, 9, 5, start, 30, tzinfo=timezone.utc),
        transactions=[{"transaction_id": f"T{i}", "card_masked_pan": f"5044-xxxx-xxxx-{1000 + i}",
                       "household_id": f"HH-{i}", "timestamp": t0 + timedelta(seconds=i * gap_seconds),
                       "amount_php": 4000.0} for i in range(count)])


@pytest.mark.parametrize("count,hour,gap,score,anomalous", [
    (12, 2, 38, 85.0, True),    # TC-15: 12 swipes in ~7 min at 02:10
    (5, 2, 59, 85.0, True),     # boundary: 5 swipes, just under 60 s apart
    (4, 2, 38, 60.0, False),    # too few swipes for the syndicate rule
    (12, 14, 38, 60.0, False),  # fast but daytime
    (12, 2, 120, 40.0, False),  # nocturnal but slow
    (12, 14, 120, 0.0, False),  # ordinary daytime use
])
def test_sangla_atm_heuristic(count, hour, gap, score, anomalous):
    w = analyze_atm_stream(atm(count, hour, gap)).window_evaluation
    assert w.sangla_atm_risk_score == score
    assert w.is_anomalous_batch is anomalous
    assert w.cluster_metrics.total_transactions_in_window == count
    assert len(w.flagged_household_ids) == count

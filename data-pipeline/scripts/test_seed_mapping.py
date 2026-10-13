"""
test_seed_mapping.py
DAT-01 unit tests: generator records -> documents conforming to the frozen
Beneficiary / ExternalRecord Mongoose models (server/src/models).

Usage (from repo root): python3 -m unittest data-pipeline/scripts/test_seed_mapping.py
"""
import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_mapping import to_beneficiary, to_external_record, nearest_barangay, mask_pan  # noqa: E402

NOW = datetime(2026, 10, 12, 8, 0, 0)

RAW_BEN = {
    "household_id": "SYN-4PS-000001",
    "head_of_household": {"national_id": "PH-NID-50602325", "name": "Timothy R. Sellers"},
    "names": {"head": "Timothy R. Sellers", "spouse": "Collin Sellers", "children": ["Jeremiah"]},
    "landbank_card_pan": "5044-4452-3910-8367",
    "gps_coordinates": {"latitude": 14.223606, "longitude": 121.169704},
    "household_size": 6, "enrolled_level": 1, "true_swdi_level": 1, "school_attendance": 0.95,
    "demographics": {"head_education_level": 0, "head_formal_employment": 0, "remittance_income_flag": 0,
                     "housing_material_score": 3, "appliance_density_index": 0.82, "dependency_ratio": 0.54},
}
RAW_EXT = {
    "matched_household_id": "SYN-4PS-000001", "household_id": "SYN-4PS-000001",
    "power": {"kwh_monthly": 216.9}, "water": {"cubic_meters_monthly": 18.1},
    "telecom": {"plan_type": "POSTPAID_FIBER"},
    "vehicle": {"plate_number": "aml 4114", "category": "FOUR_WHEEL_PASSENGER", "registration_year": 2013,
                "ownership_status": "OWNED_WITH_ENCUMBRANCE", "registered_owner_relationship": "HOUSEHOLD_HEAD",
                "productive_use_flag": False, "net_monthly_transport_income": -8000.0},
}


class BeneficiaryMapping(unittest.TestCase):
    def setUp(self):
        self.doc = to_beneficiary(RAW_BEN, NOW)

    def test_required_model_fields(self):
        d = self.doc
        self.assertEqual(d["household_id"], "SYN-4PS-000001")
        self.assertEqual(d["head_of_household"], {"first_name": "Timothy R.", "last_name": "Sellers",
                                                  "national_id": "PH-NID-50602325"})
        self.assertEqual(d["enrolled_swdi_level"], 1)
        self.assertEqual(d["program_status"], "ACTIVE_COMPLIANT")
        self.assertEqual(d["children_registry"], [])
        self.assertEqual(d["risk_assessment"], {"composite_risk_score": 0, "is_flagged": False,
                                                "flag_reasons": [], "trigger_badges": []})
        self.assertEqual((d["createdAt"], d["updatedAt"]), (NOW, NOW))

    def test_address_keeps_real_coordinates_and_assigns_reference_barangay(self):
        a = self.doc["address"]
        self.assertEqual(a["coordinates"], {"type": "Point", "coordinates": [121.169704, 14.223606]})
        self.assertEqual((a["province"], a["municipality"]), ("Laguna", "Calamba"))
        self.assertEqual(a["barangay"], nearest_barangay(14.223606, 121.169704))
        self.assertIn(a["barangay"], {"Palingon", "Lecheria", "Real"})

    def test_demographics_declared_fields_plus_pmt_vector(self):
        d = self.doc["demographics"]
        self.assertEqual(d["household_size"], 6)
        self.assertEqual(d["dependents_ratio"], 0.54)
        self.assertEqual((d["wall_score"], d["roof_score"]), (3, 3))
        self.assertNotIn("water_access_level", d)  # no source field: not fabricated
        for key, value in RAW_BEN["demographics"].items():
            self.assertEqual(d[key], value)

    def test_labels_and_sensitive_raw_fields_are_not_ingested(self):
        for key in ("true_swdi_level", "names", "landbank_card_pan", "gps_coordinates",
                    "school_attendance", "enrolled_level", "household_size"):
            self.assertNotIn(key, self.doc)

    def test_single_token_name(self):
        raw = {**RAW_BEN, "head_of_household": {"national_id": "X", "name": "Cher"}}
        self.assertEqual(to_beneficiary(raw, NOW)["head_of_household"]["last_name"], "Cher")


class ExternalMapping(unittest.TestCase):
    def test_model_shape(self):
        e = to_external_record(RAW_EXT, to_beneficiary(RAW_BEN, NOW), RAW_BEN, NOW)
        self.assertEqual(e["matched_household_id"], "SYN-4PS-000001")
        self.assertEqual(e["national_id"], "PH-NID-50602325")
        self.assertEqual(e["power_utility"], {"avg_monthly_kwh": 216.9, "is_lifeline": False})
        self.assertEqual(e["water_utility"], {"avg_monthly_cu_m": 18.1, "is_lifeline": True})
        self.assertEqual(e["telecom_registry"], {"contract_type": "POSTPAID_FIBER"})
        self.assertEqual(e["landbank_telemetry"], {"card_masked_pan": "5044-xxxx-xxxx-8367"})
        self.assertEqual(e["transport_registry"]["vehicles"], [{
            "plate_number": "AML 4114", "vehicle_category": "PASSENGER_4W", "year_model": 2013,
            "is_commercial_franchise": False, "ownership_status": "OWNED_WITH_ENCUMBRANCE",
            "registered_owner_relationship": "HOUSEHOLD_HEAD", "productive_use_flag": False}])
        for key in ("household_id", "power", "water", "telecom", "vehicle"):
            self.assertNotIn(key, e)

    def test_vehicle_categories(self):
        ben = to_beneficiary(RAW_BEN, NOW)
        for raw_cat, cat, franchise in [("MOTORCYCLE", "MOTORCYCLE", False),
                                        ("PUBLIC_UTILITY_JEEPNEY", "COMMERCIAL_UV", True)]:
            raw = {**RAW_EXT, "vehicle": {**RAW_EXT["vehicle"], "category": raw_cat}}
            v = to_external_record(raw, ben, RAW_BEN, NOW)["transport_registry"]["vehicles"][0]
            self.assertEqual((v["vehicle_category"], v["is_commercial_franchise"]), (cat, franchise))
        no_vehicle = {k: v for k, v in RAW_EXT.items() if k != "vehicle"}
        self.assertEqual(to_external_record(no_vehicle, ben, RAW_BEN, NOW)["transport_registry"], {"vehicles": []})

    def test_mismatched_household_rejected(self):
        with self.assertRaises(ValueError):
            to_external_record({**RAW_EXT, "matched_household_id": "OTHER"}, to_beneficiary(RAW_BEN, NOW), RAW_BEN, NOW)

    def test_mask_pan(self):
        self.assertEqual(mask_pan("5044-4452-3910-8367"), "5044-xxxx-xxxx-8367")
        with self.assertRaises(ValueError):
            mask_pan("not-a-pan")


if __name__ == "__main__":
    unittest.main()

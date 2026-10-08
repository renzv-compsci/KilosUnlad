#!/usr/bin/env python3
"""
KilosUnlad — Phase 3 Placeholder Seed Generator

Produces ~50 realistic placeholder records for:
  - /data-pipeline/seeds/seed_beneficiaries.json
  - /data-pipeline/seeds/seed_external_records.json

Purpose:
  Per DECISION-008, these placeholders are committed so the ingestion tool
  (seed_db.py) can be tested end-to-end before Renz delivers the real
  5,000-record dataset from the PSA FIES pipeline.

  Renz will overwrite these files in place — no code changes needed.

Alignment:
  - Record shape matches /server/src/models/Beneficiary.js and
    /server/src/models/ExternalRecord.js
  - Barangays limited to those referenced by test accounts (Palingon,
    Lecheria, Real)
  - program_status values drawn from the Beneficiary schema enum
  - External records link via matched_household_id

This script is separate from Renz's /data-pipeline/generator/generator.py
(which produces the real dataset).
"""

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------

RECORD_COUNT = 50

SCRIPT_DIR = Path(__file__).resolve().parent
SEEDS_DIR = SCRIPT_DIR.parent / "seeds"
SEEDS_DIR.mkdir(parents=True, exist_ok=True)

BENEFICIARIES_FILE = SEEDS_DIR / "seed_beneficiaries.json"
EXTERNAL_RECORDS_FILE = SEEDS_DIR / "seed_external_records.json"

# Deterministic output — same script always generates the same data
RANDOM_SEED = 20261008
random.seed(RANDOM_SEED)

# ---------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------

BARANGAYS = ["Palingon", "Lecheria", "Real"]

BARANGAY_COORDINATES = {
    "Palingon": [121.1653, 14.2117],
    "Lecheria": [121.1750, 14.2150],
    "Real":     [121.1850, 14.2200],
}

PROGRAM_STATUSES = [
    "ACTIVE_COMPLIANT",
    "FLAGGED_FOR_REVIEW",
    "UNDER_INVESTIGATION",
    "NOTICE_OF_INELIGIBILITY",
    "GRADUATED",
    "CALAMITY_SUSPENDED",
]

SWDI_LEVELS = [1, 2, 3]

FIRST_NAMES = [
    "Juan", "Maria", "Pedro", "Rosa", "Jose", "Ana", "Carlos", "Liza",
    "Ramon", "Elena", "Miguel", "Sofia", "Antonio", "Carmen", "Rafael",
    "Teresa", "Fernando", "Lucia", "Ricardo", "Gloria", "Manuel", "Josefa",
    "Andres", "Pilar", "Diego", "Rosario", "Felipe", "Marta", "Emilio",
    "Beatriz", "Alberto", "Cristina", "Victor", "Angela", "Jorge", "Patricia",
    "Hector", "Yolanda", "Oscar", "Amelia", "Ruben", "Dolores", "Sergio",
    "Consuelo", "Armando", "Mercedes", "Enrique", "Esperanza", "Arturo", "Isabel",
]

LAST_NAMES = [
    "Dela Cruz", "Santos", "Reyes", "Villanueva", "Bautista", "Lopez",
    "Mendoza", "Cruz", "Garcia", "Torres", "Flores", "Ramos", "Rivera",
    "Gonzales", "Roxas", "Aquino", "Castillo", "Domingo", "Salazar",
    "Navarro", "Aguilar", "Fernandez", "Pascual", "Marquez", "Lim",
]

BADGE_CODES = [
    ("POWER_LIFELINE_BREACH", "Meralco > 200 kWh", "HIGH"),
    ("WATER_LIFELINE_BREACH", "Maynilad > 25 cu.m", "MEDIUM"),
    ("LTO_VEHICLE_MATCH", "Registered Motorcycle", "MEDIUM"),
    ("TIER_INVERSION", "AI Predicted Level 3", "CRITICAL"),
    ("SANGLA_ATM_PATTERN", "Sangla-ATM cluster detected", "CRITICAL"),
]


# ---------------------------------------------------------------
# Generators
# ---------------------------------------------------------------

def make_beneficiary(index: int) -> dict:
    """Build a single beneficiary record matching Beneficiary.js."""
    barangay = random.choice(BARANGAYS)
    base_lng, base_lat = BARANGAY_COORDINATES[barangay]

    # Slight coordinate jitter within the barangay
    lng = round(base_lng + random.uniform(-0.005, 0.005), 4)
    lat = round(base_lat + random.uniform(-0.005, 0.005), 4)

    status = random.choices(
        PROGRAM_STATUSES,
        weights=[50, 20, 10, 5, 10, 5],  # biased toward ACTIVE_COMPLIANT
        k=1,
    )[0]

    enrolled_swdi = random.choice(SWDI_LEVELS)
    predicted_swdi = random.choice(SWDI_LEVELS)

    # Risk profile driven by status
    if status in ("FLAGGED_FOR_REVIEW", "UNDER_INVESTIGATION", "NOTICE_OF_INELIGIBILITY"):
        composite_score = random.randint(65, 95)
        is_flagged = True
        num_badges = random.randint(1, 3)
        badges = [
            {"code": code, "label": label, "severity": severity}
            for code, label, severity in random.sample(BADGE_CODES, num_badges)
        ]
        flag_reasons = [b["label"] for b in badges]
    else:
        composite_score = random.randint(5, 40)
        is_flagged = False
        badges = []
        flag_reasons = []

    # Children registry — 0 to 4 children
    num_children = random.randint(0, 4)
    children = []
    for _ in range(num_children):
        birth_year = random.randint(2008, 2020)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        children.append({
            "birthdate": f"{birth_year}-{birth_month:02d}-{birth_day:02d}T00:00:00.000Z",
            "is_eligible": True,
        })

    return {
        "household_id": f"SEED-4PS-{index:04d}",
        "head_of_household": {
            "first_name": random.choice(FIRST_NAMES),
            "last_name": random.choice(LAST_NAMES),
            "national_id": f"SEED-NID-{index:04d}",
            "contact_phone": f"+63917{random.randint(1000000, 9999999)}",
        },
        "address": {
            "street": f"Purok {random.randint(1, 10)}",
            "barangay": barangay,
            "municipality": "Calamba",
            "province": "Laguna",
            "coordinates": {"type": "Point", "coordinates": [lng, lat]},
        },
        "demographics": {
            "household_size": random.randint(1, 20),
            "dependents_ratio": round(random.uniform(0.0, 1.0), 2),
            "head_education_level": random.randint(0, 4),
            "wall_score": random.randint(1, 3),
            "roof_score": random.randint(1, 3),
            "water_access_level": random.randint(1, 3),
        },
        "children_registry": children,
        "enrolled_swdi_level": enrolled_swdi,
        "program_status": status,
        "risk_assessment": {
            "composite_risk_score": composite_score,
            "is_flagged": is_flagged,
            "predicted_swdi_level": predicted_swdi,
            "flag_reasons": flag_reasons,
            "trigger_badges": badges,
            "evaluated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        },
    }


def make_external_record(beneficiary: dict, index: int) -> dict:
    """Build a matching external record for a beneficiary."""
    status = beneficiary["program_status"]
    is_flagged = beneficiary["risk_assessment"]["is_flagged"]

    # Higher risk → higher consumption
    if is_flagged:
        avg_kwh = round(random.uniform(200, 400), 1)
        avg_cu_m = round(random.uniform(25, 50), 1)
        sangla_score = random.randint(40, 90)
        has_vehicle = random.random() < 0.6
    else:
        avg_kwh = round(random.uniform(20, 180), 1)
        avg_cu_m = round(random.uniform(5, 25), 1)
        sangla_score = random.randint(0, 30)
        has_vehicle = random.random() < 0.15

    vehicles = []
    if has_vehicle:
        vehicles.append({
            "plate_number": f"SEED{random.randint(100, 999)}",
            "vehicle_category": random.choice(
                ["MOTORCYCLE", "TRICYCLE", "PASSENGER_4W", "COMMERCIAL_UV"]
            ),
            "make_model": random.choice([
                "Yamaha NMAX 155", "Honda Click 125i", "Toyota Vios 1.3",
                "Mitsubishi Mirage G4", "Kawasaki Barako",
            ]),
            "year_model": random.randint(2015, 2025),
            "is_commercial_franchise": random.random() < 0.5,
        })

    return {
        "matched_household_id": beneficiary["household_id"],
        "national_id": beneficiary["head_of_household"]["national_id"],
        "power_utility": {
            "provider": "Meralco",
            "meter_no": f"SEED-METER-{index:04d}",
            "avg_monthly_kwh": avg_kwh,
            "is_lifeline": avg_kwh <= 100,
        },
        "water_utility": {
            "provider": "Maynilad",
            "meter_type": random.choice(["NONE", "COMMUNAL", "INDIVIDUAL"]),
            "avg_monthly_cu_m": avg_cu_m,
            "is_lifeline": avg_cu_m <= 15,
        },
        "telecom_registry": {
            "contract_type": random.choice(["PREPAID", "POSTPAID"]),
            "monthly_plan_php": random.choice([0, 500, 1000, 1500, 2000]),
        },
        "transport_registry": {"vehicles": vehicles},
        "landbank_telemetry": {
            "card_masked_pan": f"****-****-****-{index:04d}",
            "last_withdrawal_timestamp": (
                datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60))
            ).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "sangla_atm_risk_score": sangla_score,
        },
    }


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main() -> None:
    print("=== KilosUnlad Placeholder Seed Generator ===\n")
    print(f"Generating {RECORD_COUNT} beneficiaries and matching external records...\n")

    beneficiaries = [make_beneficiary(i + 1) for i in range(RECORD_COUNT)]
    external_records = [
        make_external_record(b, i + 1) for i, b in enumerate(beneficiaries)
    ]

    BENEFICIARIES_FILE.write_text(
        json.dumps(beneficiaries, indent=2), encoding="utf-8"
    )
    print(f"  Wrote {len(beneficiaries)} beneficiaries -> {BENEFICIARIES_FILE}")

    EXTERNAL_RECORDS_FILE.write_text(
        json.dumps(external_records, indent=2), encoding="utf-8"
    )
    print(f"  Wrote {len(external_records)} external records -> {EXTERNAL_RECORDS_FILE}")

    print("\nDone.")


if __name__ == "__main__":
    main()
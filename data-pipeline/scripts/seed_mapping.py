"""
seed_mapping.py
DAT-01: maps generator records onto the frozen Mongoose models
(server/src/models/Beneficiary.js, ExternalRecord.js). The models are the
authority; this module adapts the data to them and never the reverse.

Rules (each traceable to an existing project definition):
- address: real generator GPS kept as the GeoJSON point; barangay = nearest
  reference centroid from generate_placeholders.py (the barangays used by the
  test accounts); municipality/province = Calamba, Laguna (generator GPS
  bounds 14.18-14.24 N, 121.13-121.18 E lie in Calamba).
- demographics: declared fields derived only where a source exists
  (dependents_ratio = dependency_ratio; wall/roof = housing_material_score,
  whose dictionary definition is the roof-and-wall score). The 6 PMT features
  of ml-swdi-inference v1.1 are stored beside them.
- Not ingested: true_swdi_level (training label), school_attendance, names,
  and the raw LandBank PAN (only a masked PAN goes to landbank_telemetry).
- Vehicles: generator ownership fields are kept so the backend can apply the
  generator's asset_counting_mask rule.
"""
import math
import re

POWER_LIFELINE_MAX_KWH = 200
WATER_LIFELINE_MAX_CU_M = 25

# generate_placeholders.py BARANGAY_COORDINATES ([lng, lat]).
BARANGAY_CENTROIDS = {
    "Palingon": (121.1653, 14.2117),
    "Lecheria": (121.1750, 14.2150),
    "Real": (121.1850, 14.2200),
}
MUNICIPALITY, PROVINCE = "Calamba", "Laguna"

VEHICLE_CATEGORY = {
    "MOTORCYCLE": ("MOTORCYCLE", False),
    "FOUR_WHEEL_PASSENGER": ("PASSENGER_4W", False),
    # Public utility jeepneys run under an LTFRB franchise.
    "PUBLIC_UTILITY_JEEPNEY": ("COMMERCIAL_UV", True),
}
PAN_PATTERN = re.compile(r"^(\d{4})-\d{4}-\d{4}-(\d{4})$")


def nearest_barangay(lat, lng):
    def distance(item):
        c_lng, c_lat = item[1]
        return math.hypot((lng - c_lng) * math.cos(math.radians(lat)), lat - c_lat)
    return min(BARANGAY_CENTROIDS.items(), key=distance)[0]


def mask_pan(pan):
    match = PAN_PATTERN.match(pan or "")
    if not match:
        raise ValueError("LandBank PAN must be ####-####-####-####")
    return f"{match.group(1)}-xxxx-xxxx-{match.group(2)}"


def split_name(full_name):
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], parts[0]
    return " ".join(parts[:-1]), parts[-1]


def to_beneficiary(raw, now):
    lat, lng = raw["gps_coordinates"]["latitude"], raw["gps_coordinates"]["longitude"]
    first_name, last_name = split_name(raw["head_of_household"]["name"])
    pmt = dict(raw["demographics"])
    return {
        "household_id": raw["household_id"],
        "head_of_household": {"first_name": first_name, "last_name": last_name,
                              "national_id": raw["head_of_household"]["national_id"]},
        "address": {"barangay": nearest_barangay(lat, lng), "municipality": MUNICIPALITY, "province": PROVINCE,
                    "coordinates": {"type": "Point", "coordinates": [lng, lat]}},
        "demographics": {"household_size": raw["household_size"], "dependents_ratio": pmt["dependency_ratio"],
                         "wall_score": pmt["housing_material_score"], "roof_score": pmt["housing_material_score"],
                         **pmt},
        "children_registry": [],
        "enrolled_swdi_level": raw["enrolled_level"],
        "program_status": "ACTIVE_COMPLIANT",
        "risk_assessment": {"composite_risk_score": 0, "is_flagged": False, "flag_reasons": [], "trigger_badges": []},
        "createdAt": now,
        "updatedAt": now,
    }


def to_external_record(raw, beneficiary, raw_beneficiary, now):
    if raw["matched_household_id"] != beneficiary["household_id"]:
        raise ValueError("External record does not match the beneficiary")
    kwh, cu_m = raw["power"]["kwh_monthly"], raw["water"]["cubic_meters_monthly"]
    vehicles = []
    if raw.get("vehicle"):
        v = raw["vehicle"]
        category, franchise = VEHICLE_CATEGORY[v["category"]]
        vehicles.append({"plate_number": v["plate_number"].strip().upper(), "vehicle_category": category,
                         "year_model": v["registration_year"], "is_commercial_franchise": franchise,
                         "ownership_status": v["ownership_status"],
                         "registered_owner_relationship": v["registered_owner_relationship"],
                         "productive_use_flag": v["productive_use_flag"]})
    return {
        "matched_household_id": raw["matched_household_id"],
        "national_id": beneficiary["head_of_household"]["national_id"],
        "power_utility": {"avg_monthly_kwh": kwh, "is_lifeline": kwh <= POWER_LIFELINE_MAX_KWH},
        "water_utility": {"avg_monthly_cu_m": cu_m, "is_lifeline": cu_m <= WATER_LIFELINE_MAX_CU_M},
        "telecom_registry": {"contract_type": raw["telecom"]["plan_type"]},
        "transport_registry": {"vehicles": vehicles},
        "landbank_telemetry": {"card_masked_pan": mask_pan(raw_beneficiary["landbank_card_pan"])},
        "createdAt": now,
        "updatedAt": now,
    }

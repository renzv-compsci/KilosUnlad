import json
import re
import sys
from pathlib import Path

SEEDS = Path(__file__).resolve().parents[1] / "seeds"
BEN_PATH = SEEDS / "seed_beneficiaries.json"
EXT_PATH = SEEDS / "seed_external_records.json"

HOUSEHOLD_ID_RE = re.compile(r"^SYN-4PS-\d{6}$")
PHILSYS_RE = re.compile(r"^PH-NID-\d{8}$")
PAN_RE = re.compile(r"^5044-\d{4}-\d{4}-\d{4}$")
FRANCHISE_RE = re.compile(r"^FR-\d{4}-\d{5}$")

GPS_LAT_BOUNDS = (14.18, 14.24)
GPS_LNG_BOUNDS = (121.13, 121.18)
HOUSEHOLD_SIZE_BOUNDS = (2, 12)
LEVELS = {1, 2, 3}
EDUCATION_LEVELS = {0, 1, 2, 3}
BINARY_FLAGS = {0, 1}
HOUSING_SCORES = {1, 2, 3}
APPLIANCE_DENSITY_BOUNDS = (0.0, 3.0)
TELECOM_PLANS = {"NONE", "PREPAID_MOBILE", "POSTPAID_FIBER"}
VEHICLE_CATEGORIES = {"MOTORCYCLE", "FOUR_WHEEL_PASSENGER", "PUBLIC_UTILITY_JEEPNEY"}
OWNERSHIP_STATUSES = {
    "OWNED_OUTRIGHT", "OWNED_WITH_ENCUMBRANCE",
    "OPERATOR_NOT_OWNER", "REGISTERED_UNDER_OTHER",
}
RELATIONSHIPS = {"HOUSEHOLD_HEAD", "SPOUSE", "OTHER_HOUSEHOLD_MEMBER", "NON_HOUSEHOLD"}
KWH_BOUNDS = (0.0, 600.0)
WATER_BOUNDS = (0.0, 100.0)
NET_INCOME_FLOOR = -8_000.0
REG_YEAR_BOUNDS = (1990, 2026)
COHORT_TOLERANCE = 0.02

issues: list = []
warnings: list = []


def fail(message: str) -> None:
    issues.append(message)


def warn(message: str) -> None:
    warnings.append(message)


def load(path: Path):
    if not path.exists():
        fail(f"Missing seed file: {path}")
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def validate_beneficiaries(records: list) -> None:
    seen = set()
    for i, rec in enumerate(records):
        hid = rec.get("household_id", f"<index {i}>")
        if not HOUSEHOLD_ID_RE.match(str(rec.get("household_id", ""))):
            fail(f"{hid}: malformed household_id")
        if hid in seen:
            fail(f"{hid}: duplicate household_id")
        seen.add(hid)
        if not PHILSYS_RE.match(str(rec.get("philsys_id", ""))):
            fail(f"{hid}: malformed philsys_id")
        if not PAN_RE.match(str(rec.get("landbank_card_pan", ""))):
            fail(f"{hid}: malformed landbank_card_pan")
        names = rec.get("names") or {}
        if not names.get("head"):
            fail(f"{hid}: missing head name")
        gps = rec.get("gps_coordinates") or {}
        lat, lng = gps.get("latitude"), gps.get("longitude")
        if not (
            isinstance(lat, (int, float)) and isinstance(lng, (int, float))
            and GPS_LAT_BOUNDS[0] <= lat <= GPS_LAT_BOUNDS[1]
            and GPS_LNG_BOUNDS[0] <= lng <= GPS_LNG_BOUNDS[1]
        ):
            fail(f"{hid}: GPS coordinates outside Calamba bounds")
        size = rec.get("household_size")
        if not (isinstance(size, int) and HOUSEHOLD_SIZE_BOUNDS[0] <= size <= HOUSEHOLD_SIZE_BOUNDS[1]):
            fail(f"{hid}: household_size out of bounds")
        if rec.get("enrolled_level") not in LEVELS or rec.get("true_swdi_level") not in LEVELS:
            fail(f"{hid}: SWDI level out of enum")
        att = rec.get("school_attendance")
        if not (isinstance(att, (int, float)) and 0.0 <= att <= 1.0):
            fail(f"{hid}: school_attendance out of bounds")

        demo = rec.get("demographics") or {}
        if demo.get("head_education_level") not in EDUCATION_LEVELS:
            fail(f"{hid}: demographics.head_education_level out of enum")
        if demo.get("head_formal_employment") not in BINARY_FLAGS:
            fail(f"{hid}: demographics.head_formal_employment out of enum")
        if demo.get("remittance_income_flag") not in BINARY_FLAGS:
            fail(f"{hid}: demographics.remittance_income_flag out of enum")
        if demo.get("housing_material_score") not in HOUSING_SCORES:
            fail(f"{hid}: demographics.housing_material_score out of enum")
        density = demo.get("appliance_density_index")
        if not (
            isinstance(density, (int, float))
            and APPLIANCE_DENSITY_BOUNDS[0] <= density <= APPLIANCE_DENSITY_BOUNDS[1]
        ):
            fail(f"{hid}: demographics.appliance_density_index out of bounds")
        dep = demo.get("dependency_ratio")
        if not (isinstance(dep, (int, float)) and dep >= 0.0):
            fail(f"{hid}: demographics.dependency_ratio negative or missing")


def validate_external(records: list) -> None:
    for i, rec in enumerate(records):
        hid = rec.get("household_id", f"<index {i}>")
        kwh = (rec.get("power") or {}).get("kwh_monthly")
        if not (isinstance(kwh, (int, float)) and KWH_BOUNDS[0] <= kwh <= KWH_BOUNDS[1]):
            fail(f"{hid}: kWh out of bounds")
        water = (rec.get("water") or {}).get("cubic_meters_monthly")
        if not (isinstance(water, (int, float)) and WATER_BOUNDS[0] <= water <= WATER_BOUNDS[1]):
            fail(f"{hid}: water out of bounds")
        if (rec.get("telecom") or {}).get("plan_type") not in TELECOM_PLANS:
            fail(f"{hid}: telecom plan out of enum")
        veh = rec.get("vehicle")
        if veh is None:
            continue
        if veh.get("category") not in VEHICLE_CATEGORIES:
            fail(f"{hid}: vehicle category out of enum")
        if veh.get("ownership_status") not in OWNERSHIP_STATUSES:
            fail(f"{hid}: ownership_status out of enum")
        if veh.get("registered_owner_relationship") not in RELATIONSHIPS:
            fail(f"{hid}: owner relationship out of enum")
        year = veh.get("registration_year")
        if not (isinstance(year, int) and REG_YEAR_BOUNDS[0] <= year <= REG_YEAR_BOUNDS[1]):
            fail(f"{hid}: registration_year out of bounds")
        net = veh.get("net_monthly_transport_income")
        if not (isinstance(net, (int, float)) and net >= NET_INCOME_FLOOR):
            fail(f"{hid}: net transport income below floor")
        if veh.get("category") == "PUBLIC_UTILITY_JEEPNEY":
            if not FRANCHISE_RE.match(str(veh.get("franchise_number", ""))):
                fail(f"{hid}: jeepney missing valid franchise_number")
        elif "franchise_number" in veh:
            warn(f"{hid}: franchise_number present on non-jeepney vehicle")


def validate_cross(ben: list, ext: list) -> None:
    """
    Cross-file integrity and cohort sanity checks.

    Cohort shares are derived heuristically because cohort labels are not
    persisted in the seed files. Signatures overlap in reality (a wealthy
    asset-inconsistent household is also secretly graduated), so classification
    uses mutually exclusive priority: C signature first, then B, then D.
    """
    ext_map = {r["household_id"]: r for r in ext}
    if {r["household_id"] for r in ben} != set(ext_map):
        fail("Referential integrity: household_id sets differ between files")
    n = len(ben)
    if n == 0:
        return

    b_count = c_count = d_count = 0
    for rec in ben:
        e = ext_map.get(rec["household_id"])
        if e is None:
            continue
        kwh = e["power"]["kwh_monthly"]
        veh = e.get("vehicle")

        c_like = (
            rec["enrolled_level"] == 1
            and veh is not None
            and veh["category"] == "FOUR_WHEEL_PASSENGER"
            and veh["ownership_status"] == "OWNED_OUTRIGHT"
            and kwh >= 220.0
        )
        if c_like:
            c_count += 1
            continue
        if rec["enrolled_level"] == 1 and rec["true_swdi_level"] == 3:
            b_count += 1
            continue
        if rec["enrolled_level"] == 2 and kwh <= 15.0 and rec["school_attendance"] < 0.80:
            d_count += 1

    for label, count, target in (("B", b_count, 0.15), ("C", c_count, 0.10), ("D", d_count, 0.15)):
        share = count / n
        if abs(share - target) > COHORT_TOLERANCE:
            warn(f"Cohort {label} share {share:.2%} deviates from target {target:.0%}")


def main() -> int:
    ben = load(BEN_PATH)
    ext = load(EXT_PATH)
    if ben is None or ext is None:
        print("VALIDATION ABORTED: missing seed files")
        return 1
    validate_beneficiaries(ben)
    validate_external(ext)
    validate_cross(ben, ext)
    print(f"Beneficiaries: {len(ben):,}")
    print(f"External records: {len(ext):,}")
    for w in warnings:
        print(f"WARN  {w}")
    for issue in issues:
        print(f"FAIL  {issue}")
    print(f"Result: {'PASS' if not issues else 'FAIL'} ({len(issues)} issues, {len(warnings)} warnings)")
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
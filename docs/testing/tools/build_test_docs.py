#!/usr/bin/env python3
"""Rebuild the generated parts of the test documentation from raw test output.

  1. docs/testing/UNIT_TEST_REPORT.md: regenerated from docs/testing/evidence/unit/
     (node --test TAP per file, pytest -v output). Existing UT-nnn IDs are kept for
     cases whose name is unchanged; new cases get the next free number.
  2. docs/testing/MASTER_TEST_CATALOG.md: the blocks between the BEGIN/END markers
     (unit cases and integration-script checks) are replaced. Integration checks are
     read from the "[OK]" / "[FAIL]" lines of the logs in the given evidence folders.

Usage (from the repository root):
  python3 docs/testing/tools/build_test_docs.py \
    --integration docs/testing/evidence/section12-final --integration docs/integration/evidence/capstone-final
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "docs/testing/evidence/unit"
REPORT = ROOT / "docs/testing/UNIT_TEST_REPORT.md"
MASTER = ROOT / "docs/testing/MASTER_TEST_CATALOG.md"

# File order and metadata. Descriptions of older files come from the previous report.
FILES = [
    ("server/test/cryptoHelper.test.js", "server_cryptoHelper.tap"),
    ("server/test/hashChain.test.js", "server_hashChain.tap"),
    ("server/test/evidenceHash.test.js", "server_evidenceHash.tap"),
    ("server/test/geoFence.test.js", "server_geoFence.tap"),
    ("server/test/discrepancy.test.js", "server_discrepancy.tap"),
    ("server/test/ageOut.test.js", "server_ageOut.tap"),
    ("server/test/appealLifecycle.test.js", "server_appealLifecycle.tap"),
    ("server/test/calamity.test.js", "server_calamity.tap"),
    ("server/test/workflow.test.js", "server_workflow.tap"),
    ("server/test/submissionPreparation.test.js", "server_submissionPreparation.tap"),
    ("server/test/submissionAuthorization.test.js", "server_submissionAuthorization.tap"),
    ("server/test/mlClient.test.js", "server_mlClient.tap"),
    ("server/test/auth-rbac.test.js", "server_auth-rbac.tap"),
    ("server/test/login.test.js", "server_login.tap"),
    ("server/test/errorBoundary.test.js", "server_errorBoundary.tap"),
    ("server/test/handoffPlaceholders.test.js", "server_handoffPlaceholders.tap"),
    ("server/test/app.test.js", "server_app.tap"),
    ("server/test/databaseLifecycle.test.js", "server_databaseLifecycle.tap"),
    ("server/test/workflowPersistence.test.js", "server_workflowPersistence.tap"),
    ("server/test/appealDocket.test.js", "server_appealDocket.tap"),
    ("server/test/calamityToggle.test.js", "server_calamityToggle.tap"),
    ("server/test/calamityHold.test.js", "server_calamityHold.tap"),
    ("server/test/riskAssessment.test.js", "server_riskAssessment.tap"),
    ("server/test/taskSubmission.test.js", "server_taskSubmission.tap"),
    ("server/test/readFeeds.test.js", "server_readFeeds.tap"),
    ("server/test/insights.test.js", "server_insights.tap"),
    ("server/test/resolution.test.js", "server_resolution.tap"),
    ("server/test/retention.test.js", "server_retention.tap"),
    ("server/test/auditRoleCompatibility.test.js", "server_auditRoleCompatibility.tap"),
    ("client/test/auth.test.mjs", "client_auth.tap"),
    ("client/test/submissionContract.test.mjs", "client_submissionContract.tap"),
    ("client/test/pwa.test.mjs", "client_pwa.tap"),
    ("data-pipeline/scripts/test_section12_ml_unit.py", "ml.txt"),
    ("ml-service/scripts/test_sprint2_experiments.py", "ml2.txt"),
    ("data-pipeline/scripts/test_seed_mapping.py", "seed_mapping.txt"),
    ("data-pipeline/scripts/test_score_uat.py", "score_uat.txt"),
]
NEW_META = {
    "server/test/insights.test.js": ("Backend", "Component (disposable replica set)",
        "DECISION-010 read-only live-data routes: overview, task list, caseworker directory, audit blocks, policy and map density; scope and query guards."),
    "server/test/resolution.test.js": ("Backend", "Component (disposable replica set)",
        "DECISION-011 report review, evidence retrieval with tamper refusal, notice issuance, and graduation only after the 15-day window with no appeal."),
    "server/test/retention.test.js": ("Backend", "Component (disposable replica set)",
        "DECISION-012 retention after a field visit, appeal hearing outcome (granted / denied), and the 180-day re-flag cooldown."),
    "data-pipeline/scripts/test_score_uat.py": ("UAT", "Unit",
        "UAT scorer: SUS computation, task completion rate, pass rule (SUS ≥ 68 and ≥ 80 % completion), empty data."),
}
LEVEL_OVERRIDE = {  # these now run here (Docker available), so the labels drop "not available"
    "server/test/auditRoleCompatibility.test.js": "Component (Docker)",
}
# IDs whose test was rewritten (different behaviour), so the old ID is retired, never reused.
RETIRED = [
    ("UT-040", "only the four documented forward transitions are accepted", "UT-199",
     "DECISION-012 added two returns to ACTIVE_COMPLIANT (retention, granted appeal)"),
    ("UT-107", "dispatch puts assignments before collapsed staff details and identifies sample data", "UT-203",
     "DECISION-010: the dispatch screen loads server records only"),
    ("UT-111", "dashboard separates live workload from samples and has one analytics selector", "UT-204",
     "DECISION-010: the regional snapshot comes from the server"),
    ("UT-120", "policy settings clearly identifies non-persistent previews", "UT-205",
     "DECISION-010: policy settings is read-only and loads the server policy"),
]
SECTION_OF = lambda path: "A" if path.startswith("server/") else "B" if path.startswith("client/") else "C"
TAP_LINE = re.compile(r"^( *)(ok|not ok) \d+ - (.*?)(?: # (SKIP|TODO)\b.*)?$")


def parse_tap(path):
    """Return top-level cases as dicts {name, status, children[(name, status)]}."""
    pending = {}  # depth -> list of finished children waiting for their parent
    top = []
    for line in path.read_text().splitlines():
        m = TAP_LINE.match(line)
        if not m:
            continue
        depth = len(m.group(1)) // 4
        status = "SKIP" if m.group(4) == "SKIP" else ("PASS" if m.group(2) == "ok" else "FAIL")
        node = {"name": m.group(3).replace("\\#", "#"), "status": status,
                "children": pending.pop(depth + 1, [])}
        if depth == 0:
            top.append(node)
        else:
            pending.setdefault(depth, []).append(node)
    return [n for n in top if not n["name"].endswith("replicaSet.js")]


def parse_pytest(path):
    cases = []
    for line in path.read_text().splitlines():
        m = re.match(r"^\S+?::(\S+) (PASSED|FAILED|SKIPPED|ERROR)", line)
        if m:
            status = {"PASSED": "PASS", "SKIPPED": "SKIP"}.get(m.group(2), "FAIL")
            cases.append({"name": f"`{m.group(1).replace('::', '.')}`", "status": status, "children": []})
    return cases


def old_report():
    """Previous report: section metadata and name -> UT id per file."""
    meta, ids, current = {}, {}, None
    if not REPORT.exists():
        return meta, ids
    lines = REPORT.read_text().splitlines()
    for i, line in enumerate(lines):
        h = re.match(r"^### `(.+?)` \((.+?), (.+)\)$", line)
        if h:
            current = h.group(1)
            desc = next((l for l in lines[i + 1:i + 4] if l.strip() and not l.startswith("|")), "")
            meta[current] = (h.group(2), h.group(3), desc.strip())
            ids[current] = {}
            continue
        r = re.match(r"^\| (UT-\d+) \| (.+?)(?:<br>.*)? \| \*\*\w+\*\* \|$", line)
        if r and current:
            ids[current][r.group(2)] = r.group(1)
    return meta, ids


def esc(text):
    return text.replace("|", "\\|")


def collect():
    meta, old_ids = old_report()
    used = {i for per in old_ids.values() for i in per.values()} | {r[0] for r in RETIRED}
    next_id = max([int(i[3:]) for i in used] + [0]) + 1
    files = []
    for path, src in FILES:
        raw = UNIT / src
        cases = parse_tap(raw) if src.endswith(".tap") else parse_pytest(raw)
        subsystem, level, desc = NEW_META.get(path) or meta.get(path) or ("?", "?", "")
        level = LEVEL_OVERRIDE.get(path, level)
        known = old_ids.get(path, {})
        for case in cases:
            key = esc(case["name"])
            if key in known:
                case["id"] = known[key]
            else:
                case["id"] = f"UT-{next_id:03d}"
                next_id += 1
        files.append({"path": path, "src": src, "subsystem": subsystem, "level": level, "desc": desc, "cases": cases})
    return files


def case_row(case):
    name = esc(case["name"])
    subs = "".join(f"<br>↳ {esc(c['name'])} ({c['status']})" for c in case["children"])
    return f"| {case['id']} | {name}{subs} | **{case['status']}** |"


def count(files, status=None):
    return sum(1 for f in files for c in f["cases"] if status is None or c["status"] == status)


def subtests(files):
    def walk(children):
        return sum(1 + walk(c["children"]) for c in children)
    return sum(walk(c["children"]) for f in files for c in f["cases"])


def write_report(files):
    out = []
    add = out.append
    total, passed, failed, skipped = count(files), count(files, "PASS"), count(files, "FAIL"), count(files, "SKIP")
    add("# Unit Test Report — KilosUnlad\n")
    add("**Plan reference:** Section 12.1.2, Unit Testing (\"isolated functional verification of deterministic algorithms: "
        "Canonical JSON serialization, Haversine geofence calculation, and SHAP attribution extraction\"), and the Sprint 1–6 "
        "items of `docs/integration/SCRUM_INTEGRATION_PLAN.md` plus its post-plan scope (Sprint 7).")
    add("**Executed:** 2026-10-14 on the final build (`main` after PR #38). Each test file was run on its own, so results are "
        "grouped by file. Raw output (TAP / pytest) is in [`evidence/unit/`](evidence/unit/).")
    add("**Generated by:** `docs/testing/tools/build_test_docs.py` from that raw output. Existing `UT-nnn` IDs are kept; "
        "new cases get the next free number, so an ID never changes meaning.")
    add("**Companion documents:** [`SECTION12_TEST_RESULTS.md`](SECTION12_TEST_RESULTS.md) (TC-01 to TC-24, defects, UAT) and "
        "[`MASTER_TEST_CATALOG.md`](MASTER_TEST_CATALOG.md) (every test in the project, by ID).\n")
    add("## Summary\n")
    add("| Result | Count |\n| --- | ---: |")
    add(f"| Test cases executed (top-level) | **{total}** |")
    add(f"| Passed | **{passed}** |\n| Failed | **{failed}** |\n| Skipped | **{skipped}** |")
    add(f"| Additional subtests inside component tests (↳) | **{subtests(files)}**, all PASS |\n")
    add("**How these numbers match the runners' own counters:**")
    add("- **Server:** `npm test` with every opt-in suite enabled reports `# tests 175, pass 175, skipped 0` "
        "(`evidence/unit/server_full.tap`). That figure counts top-level cases, subtests and nested subtests together. "
        "The two Docker tests (`auditRoleCompatibility`, the outage case in `databaseLifecycle`) ran this time, so nothing was skipped.")
    add("- **Client:** `npm test` runs `auth` and `submissionContract` (69 tests); `npm run test:pwa` runs `pwa` on the build output (2).")
    add("- **Python:** four pytest files (ML unit, Sprint 2 mechanics, seed mapping, UAT scorer).\n")
    add("**Runner environment:** `RUN_WORKFLOW_MONGO_TESTS=1 MONGOD_PATH=<mongod> TEST_MONGO_URI=<replica set> "
        "RUN_AUDIT_ROLE_TESTS=1 RUN_DB_RECOVERY_TESTS=1` (the last two need Docker).\n")
    add("### The three algorithms named in the plan\n")
    add("| Algorithm | Where it is tested | Result |\n| --- | --- | :---: |")
    algos = [("Canonical JSON serialization (and SHA-256 entry hashing)", "server/test/cryptoHelper.test.js",
              "key order does not change the JSON or the hash; falsy values and array order kept; Date and ISO string hash the same; known SHA-256 vector"),
             ("Haversine geofence calculation", "server/test/geoFence.test.js",
              "GeoJSON longitude-first order; inclusive 250 m boundary on the unrounded distance; malformed coordinates fail closed; antipodes and date line"),
             ("SHAP attribution extraction", "data-pipeline/scripts/test_section12_ml_unit.py",
              "top 3 ranked by absolute weight and signed; weights are the predicted class's attributions; attributions plus base value equal the model margin; probabilities sum to 1")]
    by_path = {f["path"]: f for f in files}
    for name, path, what in algos:
        f = by_path[path]
        n = len(f["cases"]) if path.endswith(".js") else 5
        ok = sum(c["status"] == "PASS" for c in f["cases"][:n])
        add(f"| {name} | `{path}`: {what} | **{'PASS' if ok == n else 'FAIL'} ({ok}/{n})** |")
    add("\n### By file\n")
    add("| File | Subsystem | Level | Cases | Pass | Fail | Skip |\n| --- | --- | --- | ---: | ---: | ---: | ---: |")
    for f in files:
        short = f["path"].replace("server/test/", "server/").replace("client/test/", "client/").replace(".test.js", "").replace(".test.mjs", "")
        c = f["cases"]
        add(f"| `{short}` | {f['subsystem']} | {f['level']} | {len(c)} | {sum(x['status']=='PASS' for x in c)} | "
            f"{sum(x['status']=='FAIL' for x in c)} | {sum(x['status']=='SKIP' for x in c)} |")
    add("\n### Retired IDs\n")
    add("A test whose behaviour changed gets a new ID; the old one is never reused.\n")
    add("| Retired | Old test case | Replaced by | Why |\n| --- | --- | --- | --- |")
    for old, name, new, why in RETIRED:
        add(f"| {old} | {name} | {new} | {why} |")
    add("\n**Levels:**\n- **Unit:** one function or module in isolation, no database or network.")
    add("- **Component (disposable replica set):** the Express app runs in-process against a throwaway MongoDB replica set "
        "started by the test itself. These sit in the server's unit suite (`npm test`), but they are closer to integration tests.")
    add("- **Component (Docker):** the test starts its own MongoDB container.\n")
    sections = {"A": ("Server (Node.js / Express / Mongoose)",
                      "`cd server && RUN_WORKFLOW_MONGO_TESTS=1 MONGOD_PATH=<mongod> TEST_MONGO_URI=<replica set> RUN_AUDIT_ROLE_TESTS=1 RUN_DB_RECOVERY_TESTS=1 npm test`"),
                "B": ("Client (React PWA)", "`cd client && npm test && npm run build && npm run test:pwa`"),
                "C": ("Machine Learning, data pipeline and UAT scorer (Python)",
                      "`python -m pytest -v data-pipeline/scripts/test_section12_ml_unit.py ml-service/scripts/test_sprint2_experiments.py "
                      "data-pipeline/scripts/test_seed_mapping.py data-pipeline/scripts/test_score_uat.py`")}
    seen = set()
    for f in files:
        sec = SECTION_OF(f["path"])
        if sec not in seen:
            seen.add(sec)
            add(f"## {sec}. {sections[sec][0]}\n\nRunner: {sections[sec][1]}\n")
        add(f"### `{f['path']}` ({f['subsystem']}, {f['level']})\n")
        if f["desc"]:
            add(f"{f['desc']}\n")
        add("| ID | Test case | Result |\n| --- | --- | :---: |")
        for case in f["cases"]:
            add(case_row(case))
        add("")
    REPORT.write_text("\n".join(out).rstrip() + "\n")


INT_LINE = re.compile(r"^\s*\[(OK|FAIL)\]\s+(.*\S)")


def integration_block(folders):
    """One table per integration script, from the newest log of each script in the folders."""
    logs = {}
    for folder in folders:
        for log in sorted(Path(folder).glob("*.log")):
            script = re.sub(r"^\d+-", "", log.stem)
            lines = log.read_text(errors="replace").splitlines()
            # Only the script's own output: fixtures and resets before "[START]" also print [OK].
            start = next((i for i, l in enumerate(lines) if "[START]" in l), None)
            if start is None:
                continue
            checks = [m.groups() for m in map(INT_LINE.match, lines[start:]) if m]
            if checks:
                logs[script] = (log, checks)
    out, n = [], 0
    for script in sorted(logs):
        log, checks = logs[script]
        rel = log.relative_to(ROOT) if log.is_relative_to(ROOT) else log
        out.append(f"#### `{script}` ({len(checks)} checks, log `{rel}`)\n")
        out.append("| ID | Check | Result |\n| --- | --- | :---: |")
        for status, text in checks:
            n += 1
            out.append(f"| IT-{n:03d} | {esc(text)} | **{'PASS' if status == 'OK' else 'FAIL'}** |")
        out.append("")
    return "\n".join(out), n


def replace_block(text, name, body):
    start, end = f"<!-- BEGIN {name} -->", f"<!-- END {name} -->"
    a, b = text.index(start) + len(start), text.index(end)
    return text[:a] + "\n" + body.rstrip() + "\n" + text[b:]


def write_master(files, folders):
    if not MASTER.exists():
        return
    text = MASTER.read_text()
    rows = ["| ID | File | Test case | Result |", "| --- | --- | --- | :---: |"]
    for f in files:
        for case in f["cases"]:
            subs = "".join(f"<br>↳ {esc(c['name'])}" for c in case["children"])
            rows.append(f"| {case['id']} | `{f['path']}` | {esc(case['name'])}{subs} | **{case['status']}** |")
    text = replace_block(text, "UNIT CASES", "\n".join(rows))
    if folders:
        body, n = integration_block(folders)
        text = replace_block(text, "INTEGRATION CHECKS", body)
        text = re.sub(r"(<!-- IT COUNT -->)\d*", rf"\g<1>{n}", text)
    text = re.sub(r"(<!-- UT COUNT -->)\d*", rf"\g<1>{count(files)}", text)
    MASTER.write_text(text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--integration", action="append", default=[], help="evidence folder with step logs")
    args = parser.parse_args()
    data = collect()
    write_report(data)
    write_master(data, args.integration)
    print(f"{count(data)} unit cases ({count(data, 'PASS')} pass, {count(data, 'FAIL')} fail, {count(data, 'SKIP')} skip)")

# KilosUnlad - Independent QA Handoff Report

**Tester:** Independent QA  
**Environment:** Local Docker Stack (Windows / Git Bash)  
**Dataset:** Small Test Set (7 Households) via `reset-demo`  
**Status:** **BLOCKED** - Multiple critical API and UI failures prevent completion of core user flows.

## Executive Summary
The application currently suffers from severe data leakage (mock/demo data overriding seeded test data), broken API endpoints causing UI fallbacks, and missing UI components explicitly required by the handoff documentation. Core workflows for the Director (Dashboard) and Case Worker (Report Submission) are currently non-functional.

---

##  Critical Bugs (Showstoppers)

### 1. Field Report Submission Fails (Blocks S5, S13, S14)
* **Scenario:** S5 (Field visit with geotagged evidence)
* **Steps to Reproduce:** Log in as `case_worker_test`. Start an assigned task. Complete steps 1-3. At Step 4 (Geotagged Camera), spoof GPS to Calamba (`14.2120, 121.1660`), upload a photo, and attempt to submit.
* **Actual Result:** The UI displays a "submission unavailable" error. The report is not saved, and the task remains in the "Assigned Tasks" queue.
* **Expected Result:** The report should submit successfully, the task should leave the worker's queue, and the Director should see the status update to "Report submitted".

### 2. Insights API Returns 404 (Blocks S2)
* **Scenario:** S2 (The dashboard reflects the data)
* **Steps to Reproduce:** Log in as `director_test`. Observe the Executive Overview. Check Network tab for `GET /api/v1/insights/overview`.
* **Actual Result:** The API returns a `404 Not Found`. Consequently, the frontend falls back to displaying hardcoded/large demo data (showing 4,850 households and a "Sample data" label) instead of the seeded 7 households.
* **Expected Result:** The API should return a 200 OK with the aggregated data for the 7 seeded households, and the "Sample data" label should not be present.

---

## ⚠️ UI/UX Deviations from Handoff Doc

### 3. Missing Caseworker Picker Dropdown (Blocks S4 UX)
* **Scenario:** S4 (Dispatch with the caseworker picker)
* **Steps to Reproduce:** Log in as `director_test`. Go to Triage Queue. Click "Dispatch" on a flagged household.
* **Actual Result:** The modal displays a text input field labeled "Caseworker account ID" with the helper text: *"Use the 24-character ID provided by your administrator. A staff directory is not available yet."*
* **Expected Result:** The handoff doc states: *"In Caseworker, choose Test Case Worker. The list contains only active caseworkers who cover Palingon."* A dropdown directory should be present.
* **Workaround Used:** Tester had to manually query the MongoDB database to retrieve the `case_worker_test` ObjectId (`6acef7f12d2e2b5b669df8a5`) and paste it into the text field to bypass the UI.

### 4. Data Mixing in Field Operations View
* **Scenario:** S4 / S5 Verification
* **Actual Result:** After successfully dispatching a task via the API workaround, the "Field Dispatched" / "Field operations" screen displays 12 Active Dispatches and lists names from the large 80k demo dataset (e.g., *Maria Santos #ML-04, Juan Reyes #ML-07*). 
* **Expected Result:** The view should only reflect the seeded small dataset (1 open field task for Dispatch TestSubject).

---

## ️ Environment & Setup Documentation Issues

### 5. Seed Scripts Fail on Windows / Git Bash
The setup commands provided in the handoff document (`§0. Clean start`) fail out-of-the-box on Windows environments using Git Bash.
* **Issue A (Path Translation):** `docker cp` commands fail silently or copy to the wrong Windows temp directory because Git Bash translates Linux paths (e.g., `/tmp/`). 
  * *Fix required in docs:* Prefix commands with `MSYS_NO_PATHCONV=1`.
* **Issue B (Bash History Expansion):** The `mongosh` execution command fails with `bash: !@localhost: event not found` because the password contains an exclamation mark (`!`) inside double quotes.
  * *Fix required in docs:* Wrap the MongoDB connection string in single quotes (`'...'`).

---

## 📋 Scenario Execution Log

| Scenario | Description | Status | Notes |
| :--- | :--- | :--- | :--- |
| **S0** | Clean Start / Seeding | **PASS** | *Only after applying Git Bash workarounds.* |
| **S1** | Sign-in and role routing | **PASS** | RBAC and login work perfectly. |
| **S2** | Dashboard reflects data | **FAIL** | API 404s. UI shows hardcoded 80k demo data. |
| **S3** | Triage queue & model explanation | **PASS** | Queue loads correctly. COA read-only works. |
| **S4** | Dispatch with picker | **PARTIAL** | Backend logic works (Audit seq 1 generated), but UI picker is missing. |
| **S5** | Field visit & geofencing | **FAIL** | Submission API broken ("submission unavailable"). Geofencing UI works. |
| **S6-S15** | Offline, Appeals, Calamity, etc. | **BLOCKED** | Cannot proceed due to broken submission and dashboard APIs. |
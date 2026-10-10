# Empirical Dataset Provenance Record
**Document Status:** Final
**Last Updated:** 2026-10-09
**Author:** Renz Viloria

## 1. Dataset Identification
- **Source:** Kaggle (Hosted by Philippine Statistics Authority / Community Uploaders)
- **Dataset Name:** Filipino Family Income and Expenditure (2015 FIES)
- **Dataset URL / Slug:** `grosvenpaul/family-income-and-expenditure`
- **License:** Public Domain / Open Data (Verify specific Kaggle license on dataset page)

## 2. Acquisition Details
- **Acquisition Method:** Kaggle API (`kaggle datasets download`)
- **Download Date:** 2026-10-09
- **Storage Location:** `data-pipeline/data/raw/fies_raw.csv` (Git-ignored)
- **Expected Rows (Architectural Spec):** 41,544
- **Observed Rows (Post-Load Verification):** 41,544
- **Observed Columns:** 60

## 3. Cryptographic Integrity (SHA-256)
To ensure reproducibility and prevent silent data drift, the SHA-256 hash of the raw CSV file is recorded below. Any modification to the raw file will invalidate this hash.

- **SHA-256 Hash:** `<PASTE_YOUR_CERTUTIL_HASH_HERE>`

## 4. Data Usage Statement
This microdata is used strictly as the empirical baseline for the KilosUnlad Data Pipeline. Real household records are never ingested into the production MongoDB database. Instead, statistical distributions and correlations extracted from this dataset are used to generate 100,000 synthetic, privacy-compliant records for the ML training and deterministic rule engine testing.
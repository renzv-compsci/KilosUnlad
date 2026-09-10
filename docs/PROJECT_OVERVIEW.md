# KilosUnlad: Smart 4Ps Welfare Auditing and Fraud Detection System

## Project Overview & Operational Specification

---

## 1. Executive Summary

**KilosUnlad** is an evidence-driven, Human-in-the-Loop (HITL) Management Information System (MIS) designed for the **Department of Social Welfare and Development (DSWD)**. Its primary mission is to audit, monitor, and verify the socioeconomic trajectory of beneficiaries enrolled in the **Pantawid Pamilyang Pilipino Program (4Ps)**.

Rather than relying on slow, manual paper surveys or opaque automated black-box algorithms, KilosUnlad combines:

1. **Machine Learning Proxy-Means Testing** to estimate a household’s true economic stage.
2. **Deterministic Cross-Database Checks** (electricity, water, transportation, telecommunications) through established statutory frameworks.
3. **Financial Telemetry Analysis** to detect predatory loan syndicates (*Sangla-ATM*).
4. **Offline-First Field Verification** that equips social workers with digital, geotagged evidence tools.
5. **A Cryptographic Digital Seal (Hash Chain)** that prevents local political tampering (*palakasan*).

The system **never automatically delists a family**. Instead, algorithmic flags trigger field investigations by human social workers, ensuring every decision is grounded in real-world evidence and administrative due process.

---

## 2. The Problem Domain

Under **Republic Act No. 11310 (The 4Ps Act)**, indigent Filipino households receive conditional cash transfers for up to **7 years** while the **Kilos-Unlad Framework** helps them progress through three socioeconomic tiers:

- **Level 1: Survival** (Extremely poor, struggling for daily subsistence)
- **Level 2: Subsistence** (Transitional phase, basic needs met, but economically fragile)
- **Level 3: Self-Sufficiency** (Economically stable, ready for *"Pugay-Tagumpay"* graduation)

In practice, the program faces four critical bottlenecks:

1. **Graduation Lag & Roster Inefficiencies:** As families start businesses, purchase vehicles, or receive remittances from family members abroad, their living standards improve. Because DSWD lacks automated visibility into changing household circumstances, self-sufficient families often stay on the cash list for months or years longer than legally permitted, keeping poorer, waitlisted families from receiving assistance.

2. **Resource-Intensive Manual Field Checks:** Evaluating millions of households requires social workers (Municipal Links) to conduct physical paper interviews. Checking every household manually takes substantial time, leading to delayed exits and outdated beneficiary records.

3. **Local Political Interference (*Palakasan*):** Standard paper records and traditional databases can be altered without an immutable audit trail, making it possible for corrupt actors to shield self-sufficient allies or unfairly remove political opponents.

4. **Predatory Loan Syndicates (*Sangla-ATM*):** Desperate families often pawn their LandBank 4Ps Cash Cards to local loan sharks as collateral for high-interest loans. The loan shark keeps the physical ATM card and withdraws the government grant directly on payout day, defeating the program's goal of supporting children's nutrition and schooling.

---

## 3. The Applied Solutions

KilosUnlad addresses these issues through five core architectural solutions:

| Operational Problem | KilosUnlad Applied Solution | Legal / Institutional Basis |
| :--- | :--- | :--- |
| **Undetected Economic Transition** | **Two-Tier Engine:** ML predicts true socioeconomic tier; deterministic rules detect utility and vehicle anomalies. | **RA 11310** (4Ps Act) & DSWD SWDI Guidelines |
| **Manual Auditing Delays** | **Cross-Agency Ingestion:** Syncs electricity lifeline feeds, water meter logs, and vehicle registrations. | **RA 11552** (Lifeline Rate Act) & **RA 9510** (CISA) |
| **ATM Card Pawning (*Sangla-ATM*)** | **Telemetry Anomaly Detector:** Flags rapid-fire, nocturnal batch withdrawals across multiple cards at the same ATM. | DSWD-LandBank MOA & Cash Card Terms |
| **Political Tampering (*Palakasan*)** | **The Digital Seal:** Secures all database mutations inside an append-only, SHA-256 cryptographic hash chain. | **Forensic Auditing Standards & COA Compliance** |
| **Unfair Disqualification** | **Due Process Manager:** Enforces a mandatory 15-day statutory appeal window before graduation is finalized. | Administrative Due Process & DSWD Citizen's Charter |

---

## 4. Overall System Workflow (The 4-Stage Lifecycle)

```text
[ Stage 1: Data Sync ] ──► [ Stage 2: Smart Flagging ] ──► [ Stage 3: Field Verification ] ──► [ Stage 4: Due Process & Exit ]
Cross-references utility      LightGBM tier prediction       Social worker visits offline       15-day appeal window;
and vehicle registries        combined with utility rules  using tablet; inspects assets       decision sealed in
automatically.                to compute Risk Score (0-100). and physical LandBank ATM card.   immutable audit ledger.
````

1. **Stage 1: Multi-Registry Ingestion:** The backend ingests data feeds from power utilities (Meralco Lifeline subsidy data under RA 11552), municipal water districts, transport registries (LTO), credit databases (postpaid fiber broadband), and LandBank ATM switch logs.

2. **Stage 2: Smart Flagging & Risk Scoring:** The Python ML service predicts the household’s true SWDI level (Level 1, 2, or 3). The rule engine compares this against declared status and external data to compute an **Audit Risk Score (0 to 100)**. If the score is $\ge 70$, the household is flagged and an inspection task is automatically generated.

3. **Stage 3: Human-in-the-Loop Field Verification:** The assigned Municipal Link downloads the task to their mobile tablet. Working offline if necessary, the worker interviews the family, confirms whether vehicles are productive livelihood tools (e.g., MoveIt delivery or tricycle franchise), inspects the physical LandBank ATM card to detect pawning, captures geotagged photos, and syncs the findings upon returning to an office with Wi-Fi.

4. **Stage 4: Administrative Due Process & Graduation:** A DSWD supervisor reviews the field report. If graduation is confirmed, the household enters a **15-Day Fair Appeal Window**. Grants continue during this period. If no appeal is filed, the graduation is finalized and sealed into the cryptographic audit log.

---

## 5. Statutory & Regulatory Grounding

* **Republic Act No. 11310 (4Ps Act of 2019):** Mandates the 7-year program ceiling, 85% school attendance conditionality, and the 3-child grant limit.

* **Republic Act No. 11552 (Expanded Lifeline Rate Act):** Provides the legal mechanism for ingesting electricity usage data via the 0–100 kWh subsidized lifeline threshold.

* **Republic Act No. 10173 (Data Privacy Act of 2012):** Establishes privacy boundaries, mandates synthetic data during development, and prohibits warrantless surveillance of personal browsing, e-wallets, or bank accounts.

* **Republic Act No. 9510 (Credit Information System Act):** Governs access to formal recurring telecom liabilities (postpaid fixed fiber broadband).

* **Republic Act No. 1405 (Bank Secrecy Law):** Restricts financial telemetry monitoring to public LandBank ATM switch logs, protecting private personal bank accounts.

* **Republic Act No. 10121 (PDRRM Act of 2010):** Authorizes the Calamity Moratorium feature, freezing compliance penalties during declared natural disasters.

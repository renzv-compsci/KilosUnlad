# KilosUnlad — User Acceptance session form

One form per participant. A session takes 30 to 40 minutes. The facilitator reads each task and does **not** help unless the participant is stuck for two minutes; then the task is recorded as **not completed**.

**Before the session:**
- Load the demo data with `bash data-pipeline/scripts/load_demo_data.sh`.
- Use the participant's persona account (`deploy/HOSTING_GUIDE.md` §7 lists the test logins).

| Participant ID | Role / persona | Date | Facilitator |
| --- | --- | --- | --- |
| P__ | Regional Director / Municipal Link / COA Auditor | | |

## Part 1 — Tasks (Section 12.4 scenarios)

| # | Task the participant performs | Completed? (Y/N) | Ease, 1 (very hard) to 5 (very easy) | Comments |
| --- | --- | :---: | :---: | --- |
| A | **Triage and dispatch** (Director): find the highest-risk household in Calamba, read why it was flagged, dispatch it to a caseworker with instructions and a deadline. | | | |
| B | **Offline field visit** (Municipal Link): open the assigned task, switch to offline, complete the 5-step form with a photo, reconnect and confirm it synced. | | | |
| C | **Due process** (Director): review a submitted report with its photos, issue the Notice of Ineligibility, then file an appeal for a household under notice. | | | |
| D | **Ledger audit** (COA Auditor): verify a range of the audit ledger and say whether it is intact. | | | |

Personas only do their own tasks; mark others "n/a".

## Part 2 — System Usability Scale (after the tasks)

Circle one number per line: 1 = strongly disagree, 5 = strongly agree.

| # | Statement | 1 | 2 | 3 | 4 | 5 |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1 | I think that I would like to use this system frequently. | | | | | |
| 2 | I found the system unnecessarily complex. | | | | | |
| 3 | I thought the system was easy to use. | | | | | |
| 4 | I think that I would need the support of a technical person to be able to use this system. | | | | | |
| 5 | I found the various functions in this system were well integrated. | | | | | |
| 6 | I thought there was too much inconsistency in this system. | | | | | |
| 7 | I would imagine that most people would learn to use this system very quickly. | | | | | |
| 8 | I found the system very cumbersome to use. | | | | | |
| 9 | I felt very confident using the system. | | | | | |
| 10 | I needed to learn a lot of things before I could get going with this system. | | | | | |

## Part 3 — Open feedback

- What was most useful?
- What was confusing or slow?
- Would you approve this system for use in your office? (Yes / Yes with changes / No) Why?

## After the session

1. Copy the answers into one row of `docs/testing/uat/uat_responses.csv` (the template has the column names).
2. Run `python data-pipeline/scripts/score_uat.py docs/testing/uat/uat_responses.csv`.
3. Copy its summary into Section 12.4.2 of `docs/testing/SECTION12_TEST_RESULTS.md`.

**Acceptance rule (agree it before the sessions):** pass when
- the average System Usability Scale score is **68 or higher** (the published industry average), and
- every scenario is completed by **at least 80 %** of the participants who attempted it.

Never enter ratings that were not given by a participant.

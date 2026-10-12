# RDY-04 Status Memo: 18/19-Year-Old Age-Out Rule

Status: VERIFIED ABSENT — Implementation Required in Sprint 4
Date: 2026-10-12
Legal Basis: Republic Act No. 11310 (4Ps Act), Section 6; DSWD Operations Manual

## 1. Statutory Requirement & Legal Basis
The age-out rule is strictly mandated by **Republic Act No. 11310 (The 4Ps Act)**. 
Under **Section 6 (Qualified Beneficiaries)**, the law explicitly limits the conditional education and health grants to households with children **"aged zero (0) to eighteen (18) years old."** 

Once a child reaches 19 years of age (or 18 and is no longer enrolled in basic education), they legally age out of the program's conditional coverage. The 4Ps program is strictly a basic human capital development program, not a tertiary scholarship; therefore, college enrollment does not exempt a youth from this statutory age-out.

**Official Legal References:**
- **Republic Act No. 11310 (Full Text):** https://www.lawphil.net/statutes/repacts/ra2019/ra_11310_2019.html
- **DSWD Official 4Ps Act PDF:** https://pantawid.dswd.gov.ph/wp-content/uploads/2020/02/RA-11310.pdf

## 2. Code Verification Results (2026-10-12)

**Search Commands Executed (PowerShell on Windows):**
```powershell
Get-ChildItem -Path "server/src" -Recurse -Filter "*.js" | Select-String -Pattern "appeal|docket"
Get-ChildItem -Path "server/src/models", "server/src/services" -Recurse -Filter "*.js" | Select-String -Pattern "birth_date|date_of_birth|age"
Get-ChildItem -Path "server/src" -Recurse -Filter "*.js" | Select-String -Pattern "ineligib"
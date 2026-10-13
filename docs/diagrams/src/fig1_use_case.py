"""Figure 1 (Use Case Diagram) as hand-placed SVG. Rendered to JPG by render_diagrams.js.
Roles and routes mirror server/src/routes/v1/index.js."""
import sys

W, H = 1670, 1330
INK, FILL, BOX = "#1F3A5F", "#F2F7FC", "#7A8CA3"
out = []
def add(s): out.append(s)

def actor(x, y, label):
    add(f'<g stroke="{INK}" stroke-width="2" fill="#DCE8F5">'
        f'<circle cx="{x}" cy="{y-38}" r="13"/><line x1="{x}" y1="{y-25}" x2="{x}" y2="{y+10}"/>'
        f'<line x1="{x-22}" y1="{y-12}" x2="{x+22}" y2="{y-12}"/>'
        f'<line x1="{x}" y1="{y+10}" x2="{x-18}" y2="{y+38}"/><line x1="{x}" y1="{y+10}" x2="{x+18}" y2="{y+38}"/></g>')
    for i, line in enumerate(label.split("\n")):
        add(f'<text x="{x}" y="{y+60+i*18}" text-anchor="middle" font-size="15" font-weight="{700 if i == 0 else 400}">{line}</text>')

CX, RX, RY = 760, 205, 31
def usecase(y, label, pending=False, cx=CX, rx=RX):
    label = label.replace('&', '&amp;')
    dash = ' stroke-dasharray="7 5"' if pending else ''
    add(f'<ellipse cx="{cx}" cy="{y}" rx="{rx}" ry="{RY}" fill="{"#FFF8E1" if pending else FILL}" stroke="{INK}" stroke-width="1.6"{dash}/>')
    lines = label.split("\n")
    for i, line in enumerate(lines):
        add(f'<text x="{cx}" y="{y + 5 + (i - (len(lines)-1)/2)*17}" text-anchor="middle" font-size="14">{line}</text>')

def line(x1, y1, x2, y2, dashed=False, arrow=True, color=INK):
    d = ' stroke-dasharray="6 5"' if dashed else ''
    m = ' marker-end="url(#open)"' if arrow else ''
    add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.5"{d}{m}/>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="DejaVu Sans, Arial, sans-serif" fill="#1B2430">')
add('<defs><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">'
    f'<path d="M0,0 L10,5 L0,10" fill="none" stroke="{INK}" stroke-width="1.5"/></marker>'
    '<marker id="tri" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="14" markerHeight="14" orient="auto">'
    f'<path d="M0,0 L12,6 L0,12 Z" fill="#fff" stroke="{INK}" stroke-width="1.3"/></marker></defs>')
add(f'<rect width="{W}" height="{H}" fill="#fff"/>')
add(f'<text x="{W/2}" y="40" text-anchor="middle" font-size="22" font-weight="700">Figure 1. KilosUnlad Use Case Diagram</text>')
add(f'<rect x="330" y="70" width="1000" height="1225" rx="10" fill="none" stroke="{BOX}" stroke-width="2"/>')
add(f'<text x="345" y="96" font-size="16" font-weight="700" fill="{INK}">KilosUnlad Platform</text>')

rows = {
  "assess": (140, "Assess Household Risk\n(ML SWDI + composite score Sᵢ)"),
  "dispatch": (220, "Dispatch Field Investigation Task"),
  "notice": (300, "Approve Graduation &\nIssue 15-Day Notice"),
  "appeal": (380, "File Appeal Docket"),
  "triage": (470, "View Triage Queue &\nFilter Anomalies"),
  "shap": (550, "View SHAP Explanation\n(sealed assessment)"),
  "docket": (630, "Review Due Process Docket\n(15-day countdown)"),
  "auth": (720, "Authenticate & Manage Session\n(JWT HS256, 900 s)"),
  "chain": (810, "Verify Cryptographic Hash Chain"),
  "calamity": (890, "Toggle Calamity Moratorium\n(RA 10121)"),
  "download": (980, "Download Assigned Tasks\nOffline (IndexedDB)"),
  "field": (1060, "Complete Field Checklist &\nCapture Geotagged Evidence"),
  "sync": (1140, "Sync Offline Reports"),
  "ingest": (1230, "Ingest External Records\n(Meralco, water, LTO, LandBank)"),
}
L, R = CX - RX, CX + RX
DIR, SA, SCH = (150, 430), (150, 850), (150, 1230)
COA, ML = (1500, 640), (1500, 1060)

for key in ["assess", "dispatch", "notice", "appeal", "triage", "shap", "docket", "auth"]:
    line(DIR[0] + 30, DIR[1], L, rows[key][0])
for key in ["chain", "calamity"]:
    line(SA[0] + 30, SA[1], L, rows[key][0])
line(SCH[0] + 30, SCH[1], L, rows["ingest"][0])
for key in ["triage", "shap", "docket", "auth", "chain"]:
    line(COA[0] - 30, COA[1], R, rows[key][0])
for key in ["auth", "download", "field", "sync"]:
    line(ML[0] - 30, ML[1], R, rows[key][0])
add(f'<line x1="{SA[0]}" y1="{SA[1]-58}" x2="{DIR[0]}" y2="{DIR[1]+100}" stroke="{INK}" stroke-width="1.5" marker-end="url(#tri)"/>')
add(f'<text x="{SA[0]+10}" y="{(SA[1]+DIR[1])/2 + 30}" font-size="13" fill="{BOX}">inherits</text>')

# Seal Audit Block (include target) in the second column
SX, SY = 1150, 260
for key in ["assess", "dispatch", "appeal"]:
    y = rows[key][0]
    line(R, y, SX - 150, SY + (y - SY) * 0.25, dashed=True)
    add(f'<text x="{(R + SX - 150)/2}" y="{(y + SY + (y - SY) * 0.25)/2 - 6}" text-anchor="middle" font-size="12" fill="{BOX}">«include»</text>')
add(f'<path d="M{R},{rows["sync"][0]} C 1300,{rows["sync"][0]} 1300,520 {SX+60},{SY+29}" fill="none" stroke="{INK}" stroke-width="1.5" stroke-dasharray="6 5" marker-end="url(#open)"/>')
add(f'<text x="1225" y="1000" font-size="12" fill="{BOX}">«include»</text>')
for key, (y, label) in rows.items():
    usecase(y, label, pending=(key == "notice"))
usecase(SY, "Seal Audit Block\n(SHA-256 hash chain)", cx=SX, rx=150)
line(CX, rows["download"][0] + RY, CX, rows["field"][0] - RY, dashed=True)
line(CX, rows["field"][0] + RY, CX, rows["sync"][0] - RY, dashed=True)

actor(*DIR, "Regional Director\n(REGIONAL_DIRECTOR)")
actor(*SA, "Super Admin\n(SUPER_ADMIN)")
actor(*SCH, "Automated Scheduler\n(data-pipeline jobs)")
actor(*COA, "COA State Auditor\n(COA_AUDITOR, read-only)")
actor(*ML, "Municipal Link\n(CASE_WORKER)")

# Legend / notes
add(f'<rect x="1340" y="110" width="292" height="120" rx="6" fill="#FFF8E1" stroke="#C9A227"/>')
for i, t in enumerate(["Dashed oval = pending decision:", "notice issuance has no API route;",
                       "notice instant is VerificationTask.", "admin_resolution (APPROVED_GRADUATION).",
                       "Calamity toggle: SUPER_ADMIN only."]):
    add(f'<text x="1350" y="{134 + i*21}" font-size="12.5">{t}</text>')
add('</svg>')
open(sys.argv[1], "w").write("\n".join(out))

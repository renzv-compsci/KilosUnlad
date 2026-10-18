#!/usr/bin/env bash
# Rebuilds every JPG in docs/diagrams from the sources in this folder.
# Needs: java + plantuml.jar (PLANTUML_JAR) + graphviz `dot`; python3 with pillow,
# matplotlib, shap, lightgbm, pandas, pyarrow (PYTHON); node + playwright-core on
# NODE_PATH and Chromium. The UI step also needs the running stack (see capture_ui.js).
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"; OUT="$(cd "$SRC/.." && pwd)"; TMP="$(mktemp -d)"
PYTHON="${PYTHON:-python3}"; PLANTUML_JAR="${PLANTUML_JAR:?set PLANTUML_JAR}"
java -jar "$PLANTUML_JAR" -tpng -o "$TMP" "$SRC"/fig2_activity.puml "$SRC"/fig3_class.puml "$SRC"/fig5_erd.puml "$SRC"/fig_seq_dispatch.puml \
  "$SRC"/fig7_state.puml "$SRC"/fig8_seq_field_report.puml "$SRC"/fig9_deployment.puml
python3 "$SRC/fig1_use_case.py" "$TMP/fig1_use_case.svg"
node "$SRC/render_diagrams.js" "$TMP/fig1_use_case.svg" "$OUT/fig1_use_case_diagram.jpg"
node "$SRC/render_diagrams.js" "$SRC/fig4_architecture.html" "$OUT/fig4_system_architecture.jpg" 1560
"$PYTHON" - "$TMP" "$OUT" <<'PY'
import sys
from PIL import Image
tmp, out = sys.argv[1:]
for src, dst in [("fig2_activity", "fig2_activity_diagram"), ("fig3_class", "fig3_class_diagram"),
                 ("fig5_erd", "fig5_entity_relationship_diagram"), ("fig_seq_dispatch", "fig6_sequence_task_dispatch"),
                 ("fig7_state", "fig7_state_diagram"), ("fig8_seq_field_report", "fig8_sequence_field_report"),
                 ("fig9_deployment", "fig9_deployment_diagram")]:
    Image.open(f"{tmp}/{src}.png").convert("RGB").save(f"{out}/{dst}.jpg", quality=92)
PY
"$PYTHON" "$SRC/ml_plots.py" "$OUT/appendix-d"   # v1 charts (synthetic test split)
"$PYTHON" "$SRC/ml_plots_v2.py" "$OUT/appendix-d" # v2 charts from the shipped model metadata
if [ -n "${CLIENT_URL:-}" ]; then node "$SRC/capture_ui.js" "$OUT/ui" "${PHOTO:?set PHOTO to a test photo}"; fi
echo "Diagrams written to $OUT"

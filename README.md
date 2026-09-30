# SlopePulse

**AI Landslide Early Warning & Response**
Smart India Hackathon 2026 — prototype.

> **Prototype • Simulated Data.** Every number in this project is generated.
> The dataset is synthetic, the district is fictional, and the risk scores are
> not predictions of real landslides or official government assessments.

SlopePulse turns multi-source environmental evidence into a ranked, explained,
actionable picture of which roads a district disaster-management team should
worry about today:

```
MULTI-SOURCE EVIDENCE -> ML RISK SCORE -> PRIORITY RANKING
                                            -> INFRASTRUCTURE IMPACT
                                            -> RECOMMENDED ACTION
```

It does **not** claim to predict when a landslide will occur. It prioritises
locations and supports early-warning decisions.

---

## Build status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project scaffolding + dataset generation | Done |
| 2 | ML model + evaluation + saved model | Done |
| 3 | FastAPI backend | Done |
| 4 | Frontend dashboard | Done |
| 5 | Map | Done |
| 6 | Risk analysis | Done |
| 7 | Impact analysis | Done |
| 8 | Hazard reporting | Done |
| 9 | Scenario simulator | Done |
| 10 | Visual polish | Done |

---

## Project structure

```
slopepulse/
    ml/
        generate_data.py     synthetic dataset generator
        train_model.py       trains + evaluates + saves the model
        predict.py           inference and explanation (backend imports this)
        scenarios.py         NORMAL / HEAVY / EXTREME weather -> model inputs
        scenario_check.py    demo sanity check across all roads
        model.pkl            trained model bundle (generated)
        metrics.json         held-out evaluation scores (generated)
    data/
        build_district.py    builds the fictional district
        district.json        roads, villages, facilities, impact links (generated)
        landslide_dataset.csv training data (generated)
    backend/
        main.py              FastAPI app: CORS, error handlers, router wiring
        config.py            environment-driven settings (CORS allow-list)
        models.py            Pydantic request/response models
        test_api.py          endpoint smoke test - runs the whole demo flow
        routes/
            meta.py          /health, /model
            locations.py     roads, villages, hospitals, schools, landslides
            risk.py          /risk, /alerts, /stats, /impact, /simulate
            reports.py       /reports - field report -> updated risk
        services/
            district.py      district.json loading + in-memory report store
            risk.py          wraps ml/predict.py - no modelling logic here
            impact.py        road failure -> affected infrastructure
            recommendations.py  deterministic action rules
    frontend/
        app/
            page.tsx         Command Center — all data wiring
            layout.tsx       fonts, metadata
            globals.css      design tokens, Leaflet theme overrides
        components/
            Header.tsx       identity, scenario switcher, API status
            KpiCards.tsx     KPI cards + evidence-chain strip
            MapPanel.tsx     map shell, legend, layer toggles
            DistrictMap.tsx  Leaflet map (client-only)
            PriorityTable.tsx ranked worklist + impact shortcut
            ScenarioSimulator.tsx NORMAL / HEAVY / EXTREME, drives /api/simulate
            DetailPanel.tsx  tabbed shell: risk analysis | impact analysis
            LocationDetail.tsx risk analysis body
            ImpactPanel.tsx  dependency tree, population, actions
            HazardReportForm.tsx  field report dialog -> POST /api/reports
            ReportResultBanner.tsx  before/after risk change
            RiskBadge.tsx / StateViews.tsx  shared UI
        lib/
            api.ts           API client, useApi hook
            types.ts         types mirroring backend/models.py
            risk.ts          risk colours and formatting
        .env.example         NEXT_PUBLIC_API_URL template
    requirements.txt         Python dependencies (ML + backend)
    render.yaml              Render deployment blueprint
    .env.example             backend environment variable template
```

---

## Prerequisites

- **Python 3.11** (3.10–3.12 fine) — <https://www.python.org/downloads/>
- **Node.js 18+** — needed from Phase 4 onward
- **Git**

Check:

```bat
python --version
node --version
```

---

## Setup (Windows)

From the project folder, in **Command Prompt** or **PowerShell**:

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks the activate script, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**macOS / Linux equivalent:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Run the pipeline

Three commands, in order:

```bat
python ml\generate_data.py
python data\build_district.py
python ml\train_model.py
```

Expected output from the last one (approximately — your figures should match
if you have not changed the seed):

```
Algorithm        : XGBClassifier
Train / test     : 960 / 240
Accuracy         : 0.846
Precision        : 0.672
Recall           : 0.684
F1               : 0.678
ROC AUC          : 0.863
```

### Test a prediction

```bat
python ml\predict.py
```

Scores one road, prints its risk band, and lists what is driving the score.

### Start the backend

From the **project root**, with the virtual environment active:

```bat
uvicorn backend.main:app --reload --port 8000
```

Open <http://127.0.0.1:8000/docs> for interactive API docs, or
<http://127.0.0.1:8000/api/health> to confirm the model loaded.

Run `uvicorn` from the project root, not from inside `backend/` — the app
imports both `backend` and `ml`.

### Test the API

With the backend running, in a **second terminal**:

```bat
python backend\test_api.py
```

Expected: `32 passed, 0 failed`. To test a deployed instance instead:

```bat
python backend\test_api.py https://your-service.onrender.com
```

### Start the frontend

**First time only**, in a third terminal:

```bat
cd frontend
npm install
copy .env.example .env.local
```

Then, any time:

```bat
cd frontend
npm run dev
```

Open <http://localhost:3000>. The backend must be running first.

`.env.local` holds `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`. No API URL is
hard-coded anywhere in the components; point that variable at Render and the
same build talks to the deployed backend.

### Check the demo still works

```bat
python ml\scenario_check.py
```

Prints every road under all three scenarios. Use this after any change to the
data, model or scenario values to confirm the demo story still holds.

---

## API endpoints

All under `/api`. Every risk endpoint takes `?scenario=NORMAL|HEAVY|EXTREME`
(defaults to `NORMAL`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness plus whether the model and district loaded |
| GET | `/api/model` | Prototype model performance metrics (shown in Model Performance panel) |
| GET | `/api/scenarios` | The three scenarios and their weather values |
| GET | `/api/district` | Map centre, zoom, disclaimer |
| GET | `/api/locations` | All road segments, with live crack counts |
| GET | `/api/locations/{id}` | One road segment |
| GET | `/api/villages` | Settlements and populations |
| GET | `/api/hospitals` | Health facilities |
| GET | `/api/schools` | Schools |
| GET | `/api/supply-routes` | Supply corridors |
| GET | `/api/landslides` | Simulated landslide inventory |
| GET | `/api/risk` | Every road scored and ranked — the priority list |
| GET | `/api/risk/{id}` | Full analysis: evidence, drivers, actions |
| GET | `/api/stats` | Dashboard KPI card values |
| GET | `/api/alerts` | Roads at HIGH or above, with impact context (shown in Active Alerts panel) |
| GET | `/api/impact/{id}` | What is cut off if this road fails |
| POST | `/api/simulate` | Re-score the district under a scenario |
| POST | `/api/reports` | Submit a field hazard report, returns before/after risk |
| GET | `/api/reports` | Submitted reports, newest first |
| POST | `/api/reports/reset` | Clear session state between practice runs |

Error responses are always JSON `{"detail": "..."}`:
`400` bad scenario, `404` unknown road, `413` photo too large,
`422` invalid field value, `503` model or district data not loaded.

---

## Deployment

Designed so a judge only ever needs one public URL.

### Backend → Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. Leave the root directory as the repo root (not `backend/`). The service
   needs both `backend` and `ml` on the import path.
4. The build command regenerates the dataset and retrains the model, so the
   deployed API always has a `model.pkl` even on a clean checkout.
5. After the frontend is deployed, set `ALLOWED_ORIGINS` to your Vercel URL.

Free-tier instances sleep after inactivity and take ~30–50 seconds to wake.
**Open the API URL a few minutes before you present.**

### Frontend → Vercel

1. Vercel → **New Project** → select the repo → set root directory to `frontend`.
2. Add an environment variable:

   ```
   NEXT_PUBLIC_API_URL = https://your-service.onrender.com
   ```

3. Deploy. Share the Vercel URL.

If you forget step 2, the deployed dashboard shows an "API URL not configured"
banner rather than silently failing — the build falls back to localhost, which
on a judge's laptop points at their own machine.

No API URL is ever hard-coded; the frontend reads `NEXT_PUBLIC_API_URL`.
There are no secrets in this project — nothing needs an API key.

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'ml'`**
Run commands from the project root, not from inside `ml/`.

**`xgboost` fails to install**
`train_model.py` falls back to scikit-learn automatically. The pipeline still
works; the saved bundle records which algorithm was used.

**`Trained model not found at .../model.pkl`**
You skipped a step. Run `generate_data.py` then `train_model.py`.

**`ModuleNotFoundError: No module named 'backend'`**
You ran `uvicorn` from inside `backend/`. Go back to the project root.

**API returns 503 "Risk model unavailable"**
`model.pkl` is missing. Run `python ml\train_model.py`.

**Frontend gets a CORS error**
Add the exact frontend origin (scheme included, no trailing slash) to
`ALLOWED_ORIGINS` on Render and redeploy.

**Submitted reports disappeared**
Expected. The report store is in memory and resets when the process restarts.

**Dashboard shows "Backend not reachable"**
The API is not running, or `NEXT_PUBLIC_API_URL` is wrong. The banner prints the
URL it tried. Changing `.env.local` requires restarting `npm run dev`.

**Map area is grey / tiles missing**
The basemap needs internet access. Roads and markers still render from the API.

**Priority list is empty but the map has roads**
The scenario query failed. Click "Try again" on the panel; if it persists,
check the API log for a 400 (an unrecognised scenario name).

**Crack report submitted but risk did not move**
Only "New crack" and "Road deformation" count as crack evidence. Rockfall,
seepage and small-landslide reports are logged without changing model inputs,
and the response says so.

**Demo state is dirty from a previous run**
Click the reset icon next to "Report hazard" in the header, or
`POST /api/reports/reset`.

**Model metrics differ from the README**
Check that you have not changed `RANDOM_SEED` or the generator weights.

**PowerShell: `.venv\Scripts\activate` not recognised**
Use `.\.venv\Scripts\Activate.ps1`, or switch to Command Prompt.

---

## Honesty notes

Things this project deliberately does **not** do, and which are worth saying
out loud to judges rather than hiding:

- The training data is **synthetic**. Reported accuracy measures how well the
  model recovered a simulated relationship, not real-world performance.
- The explanations are **single-feature ablation**, not SHAP. They are computed
  from the trained model, but they are an approximation and are labelled as one
  everywhere they appear.
- The district, villages, hospitals and populations are **fictional**.
- No real-time satellite, IMD, GSI or IoT feed is connected.
- Hazard reports are stored **in memory**, not in a database. They survive a
  demo, not a restart. Section 19 of the brief allows this for the prototype;
  Supabase Postgres is the obvious production swap.

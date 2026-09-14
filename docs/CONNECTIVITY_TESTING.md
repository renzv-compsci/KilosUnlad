# KilosUnlad: Service Health & Connectivity Testing Guide
**Document Target:** `/docs/CONNECTIVITY_TESTING.md`  
**Purpose:** Phase 1 Service Health Verification & Cross-Layer Smoke Testing  
**Audience:** All Team Members (Dustin, Mae, Charles, Markie, Renz)  

---

## 1. Overview & Objectives

Before writing code or implementing features, every team member must complete the **Service Health & Connectivity Smoke Test**. 

This test verifies that:
1. All 5 Docker containers (`gateway`, `client`, `server`, `ml-service`, `db`) build and boot without errors.
2. The internal Docker network (`kilosunlad-network`) successfully routes traffic between containers.
3. Every team member can connect to their specific subsystem using their preferred development tools (Postman, Swagger, MongoDB Compass, Browser).

---

## 2. Pre-Test Execution

From the root of the `KilosUnlad` repository, ensure your environment file is active and boot all services:

```bash
# 1. Ensure .env exists
cp .env.example .env

# 2. Build and launch all 5 containers
docker-compose up --build

Wait until your terminal displays that all 5 services have started and are
accepting connections.

3. Role-by-Role Connectivity Verification Tests

Find your name below and execute your assigned smoke test:

Test 1: Dustin Martinez — Database Connectivity & Index Check

  - Target Container: kilosunlad-db (Port 27017)
  - Testing Tool: MongoDB Compass (GUI) or mongosh (Terminal)

Verification Steps:

1.  Open MongoDB Compass.
2.  Paste the application connection string:
    mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad
3.  Click Connect.
4.  Verify that the kilosunlad database appears with all 6 pre-created
    collections:
      - users
      - beneficiaries
      - external_records
      - verification_tasks
      - audit_logs
      - system_configs
5.  Click on the beneficiaries collection \to navigate to the Indexes tab \to
    confirm that address.coordinates_2dsphere is listed.

Success Criteria (DoD):

- [x] Successfully authenticated as app_user on kilosunlad.
- [x] All 6 collections visible with zero manual database setup.
- [x] 2dsphere geospatial index verified.

Test 2: Charles Cabatian — ML Microservice & Swagger Verification

  - Target Container: kilosunlad-ml (Port 8000)
  - Testing Tool: Web Browser / Interactive Swagger UI

Verification Steps:

1.  Open your browser and navigate to:
    http://localhost:8000/docs
2.  The interactive FastAPI Swagger Documentation should render on screen.
3.  Test the System Health Route:
      - Expand GET /health \to click Try it out \to click Execute.
      - Expected Response: HTTP 200 OK
        {
          "status": "online",
          "service": "kilosunlad-ml-microservice",
          "model_runtime": "ready",
          "version": "1.0.0"
        }
4.  Test the SWDI Prediction Route (Contract 1):
      - Expand POST /api/v1/predict-swdi \to click Try it out \to click Execute
        with the default payload.
      - Expected Response: HTTP 200 OK returning predicted_swdi_level,
        class_probabilities, and shap_explainability.

Success Criteria (DoD):

- [x] Swagger UI loads cleanly at localhost:8000/docs.
- [x] GET /health returns model_runtime: "ready".
- [x] POST /api/v1/predict-swdi returns response matching
  ml-swdi-inference.json.

Test 3: Mae Santos — Backend Application & Database Link Verification

  - Target Container: kilosunlad-server (Port 5000)
  - Testing Tool: Terminal Logs & Web Browser / Postman

Verification Steps:

1.  Check MongoDB Connection in Terminal:
      - Inspect the terminal output where docker-compose is running.
      - Look for the log:
        kilosunlad-server | >> [MongoDB] Connected successfully: db/kilosunlad
        kilosunlad-server | >> [KilosUnlad Server] Running in development mode on port 5000
2.  Test Server Health Endpoint:
      - Open your browser or Postman and navigate to:
        http://localhost:5000/health
      - Expected Response: HTTP 200 OK
        {
          "status": "online",
          "service": "kilosunlad-server",
          "environment": "development",
          "timestamp": "2026-09-14T..."
        }
3.  Test API v1 Base Route:
      - Navigate to http://localhost:5000/api/v1.
      - Expected Response: HTTP 200 OK with welcome message.

Success Criteria (DoD):

- [x] Node.js server connects to MongoDB over internal Docker network
  (db:27017).
- [x] GET /health returns HTTP 200 OK.
- [x] GET /api/v1 returns API confirmation message.

Test 4: Markie Angelo — Frontend Client & Live Reloading Check

  - Target Container: kilosunlad-client (Port 3000)
  - Testing Tool: Web Browser (Google Chrome / Microsoft Edge / Firefox)

Verification Steps:

1.  Open your browser and navigate to:
    http://localhost:3000
2.  The React application should render on screen displaying the styled card:
      - Header: "KilosUnlad MIS"
      - Subtitle: "Smart 4Ps Welfare Auditing & Fraud Detection System"
      - Badge: "● Frontend Online (Vite + Tailwind)"
3.  Check Browser Console (F12):
      - Open DevTools (F12 \to Console tab).
      - Verify there are zero red errors and that Vite connects cleanly without
        WebSocket connection failures.

Success Criteria (DoD):

- [x] React UI renders on Port 3000 with Tailwind styling.
- [x] Browser console shows clean connection with zero WebSocket / HMR errors.

Test 5: Renz Viloria — Gateway Routing & Reverse Proxy Verification

  - Target Container: kilosunlad-gateway (Port 80)
  - Testing Tool: Web Browser

Verification Steps:

1.  Verify Frontend Proxy Routing:
      - Open your browser to standard http://localhost (Port 80, no port number
        specified).
      - Result: Nginx automatically serves Markie's React frontend.
2.  Verify API Proxy Routing (CORS Elimination Check):
      - Open your browser to http://localhost/api/v1.
      - Result: Nginx intercepts the /api/v1 path and transparently proxies the
        request to Mae's Express backend on Port 5000.

Success Criteria (DoD):

- [x] http://localhost/ loads the React client.
- [x] http://localhost/api/v1 loads the Express backend API.
- [x] Both Frontend and Backend accessible via standard Port 80 without CORS
  conflicts.

4. Cross-Service Connectivity Matrix

| From Service          | To Service           | Target URI                      | Protocol | Expected Result                |
| :-------------------- | :------------------- | :------------------------------ | :------- | :----------------------------- |
| **Browser**           | **Gateway (Nginx)**  | `http://localhost:80`           | HTTP     | Serves React UI or routes API  |
| **Browser**           | **Client (React)**   | `http://localhost:3000`         | HTTP     | Serves Vite dev app            |
| **Browser / Postman** | **Server (Express)** | `http://localhost:5000/health`  | HTTP     | Returns server health JSON     |
| **Browser / Swagger** | **ML (FastAPI)**     | `http://localhost:8000/docs`    | HTTP     | Loads interactive API docs     |
| **Server (Node)**     | **Database (Mongo)** | `mongodb://...db:27017`         | TCP      | Successful Mongoose connection |
| **Server (Node)**     | **ML (FastAPI)**     | `http://ml-service:8000/health` | HTTP     | Internal microservice response |

5. Troubleshooting Common Issues

  - Error: connect ECONNREFUSED 127.0.0.1:5000
      - Cause: The server container is still booting or encountered a database
        connection error.
      - Fix: Run docker-compose logs server to inspect the error log.
  - Error: Authentication failed on kilosunlad for app_user
      - Cause: Password mismatch between .env and init-mongo.js.
      - Fix: Verify that MONGO_URI in .env uses AppUserPassword2026!.
  - Error: WebSocket connection to 'ws://localhost:3000/' failed
      - Cause: Missing WebSocket upgrade headers in Nginx configuration.
      - Fix: Ensure docker/nginx/default.conf contains proxy_set_header Upgrade
        $http_upgrade;.


---

Save this file as **`docs/CONNECTIVITY_TESTING.md`**. Once you've saved it, let me know and I will send the updated **`docs/ONBOARDING.md`** file!
